# SPEC 02 — Ghosts always leave the pen

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-09-28
> **Objective:** A ghost released from the pen always walks out through the door, whatever Pac-Man's position, and never walks back in.

## Why this spec exists

`decideGhost` ranks legal directions only by Manhattan distance to the kind's target, and for a
ghost inside the pen the shortest way to Pac-Man is usually *deeper into* the pen. With Pac-Man in
the bottom half, the released ghost slides left along row 14, hits the wall at x=10, takes the
180-degree rule and oscillates (11,14) ↔ (12,14) indefinitely. The release clock keeps running but
`state` is already `active`, so no further ghost is ever released: the rest of the level is played
against a single hunter.

The cause is that nothing in the code knows what a pen is. This spec gives the pen a name — a box
of cells plus one exit cell — and makes the door one-way, so exiting stops depending on where
Pac-Man happens to be.

## Scope

**In:**

- `PEN_BOX`, `PEN_EXIT` and `isInPen( x, y )` in `src/js/maze.js`, next to `TUNNEL_ROW`, exported on `window`.
- Pen branch at the top of `getTarget` in `src/js/ghosts.js`: a ghost with `state === 'pen'` targets `PEN_EXIT` instead of its kind.
- `state` redefines itself as `'pen'` = inside `PEN_BOX`, `'active'` = outside. Only `moveGhost` writes it, flipping to `'active'` on the frame `isInPen` goes false.
- `game.releasedCount` (1..4) replaces `find( g => g.state === 'pen' )` in `releaseGhost`; `update` moves ghosts by index, so a released ghost walks out while the next one still waits.
- One-way pen door in `canMove`: a ghost may step onto a door tile only when the step decreases `y` (out of the pen). Pac-Man stays fully blocked by it.
- `resetPositions` restores `releasedCount = 1` and all four states to `'pen'`.

**Out of scope (for future specs):**

- Ghosts bobbing up and down the pen before being released (SPEC 01 renders them static; unchanged).
- Release limits based on dots eaten or on a global dot counter.
- Scatter/chase cycling, power pellets, frightened and eaten states.
- Per-ghost speed differences, BFS / shortest-path movement.
- Any visual change to the door: it is drawn exactly as today.

## Data model

```js
// src/js/maze.js — la pen es geometria del laberinto, como TUNNEL_ROW
const PEN_BOX = { x0: 11, x1: 17, y0: 12, y1: 15 }; // incluye la fila de la puerta
const PEN_EXIT = { x: 13, y: 11 };                  // celda transitable justo encima de la puerta

// Coordenadas de celda, enteros o floats (una posicion en transito cuenta como
// dentro si sigue tocando la caja).
function isInPen( x, y ) {
  return x >= PEN_BOX.x0 && x <= PEN_BOX.x1 && y >= PEN_BOX.y0 && y <= PEN_BOX.y1;
}
```

`PEN_BOX` is a bounding box, not a tile test: it covers the pen interior (rows 13-15, cols 12-17), the two door cells (13,12) and (14,12), and a handful of wall cells. `y0: 12` is deliberate — a ghost standing on the door still counts as inside, so it keeps walking out instead of turning back down.

```js
// src/js/game.js — por fantasma
{
  x: 13, y: 14,
  dir: 'up',
  speed: 0.1,
  kind: 'hunter',
  state: 'pen',   // 'pen' = dentro de PEN_BOX · 'active' = fuera
}

// src/js/game.js — por partida
releaseTimer: 0,
releasedCount: 1,  // NUEVO: cuantos fantasmas lleva soltados el reloj (1 = el primero, en t=0)
```

Conventions:

- `state` changes meaning. It no longer means "not released yet"; it means "is inside the pen". Release order moves to `releasedCount`, an index into `GHOST_STARTS`, and the movement gate becomes index-based:

  ```js
  game.ghosts.forEach( ( g, i ) => {
    if ( i < game.releasedCount ) moveGhost( game, g );
  } );
  ```

- `state` has exactly one writer (`moveGhost`) and one reader (`getTarget`). It is a cached answer to `isInPen`, not an independent truth.
- `isInPen` is called on float coordinates, so a ghost crossing the boundary counts as outside from the first frame its float `y` drops below 12 — while it is still visually on the door bar. Harmless.
- Targets stay integer cells that only rank legal directions; `canMove` still filters. `PEN_EXIT` is walkable and inside the maze, so unlike a `flanker` target it is never a cell a ghost cannot reach.
- `releasedCount` keeps SPEC 01's cadence: 1 at t=0, then one more every `GHOST_RELEASE_FRAMES`.

## Implementation plan

1. In `src/js/maze.js` add `PEN_BOX`, `PEN_EXIT` and `isInPen( x, y )` with a comment stating that editing the pen rows in `MAZE_STR` means editing these too, and export all three on `window`. Nothing consumes them yet.
   Manual test: open `src/index.html`, zero console errors, the bug is still reproducible.
2. In `src/js/ghosts.js` add the pen branch as the first line of `getTarget`: `if ( g.state === 'pen' ) return PEN_EXIT;`. The release clock is unchanged, so `state` still means "not released yet" and every ghost leaving the pen targets `PEN_EXIT`.
   Manual test: all four ghosts leave the pen even with Pac-Man in the bottom half. This is the bug fix, visible on its own.
3. In `src/js/game.js` add `releasedCount: 1` to `createGame`, have `resetPositions` set it to 1 and every `g.state` to `'pen'`, make `releaseGhost` do `if ( game.releasedCount < game.ghosts.length ) game.releasedCount++;` instead of searching by state, and switch the `update` movement gate to `if ( i < game.releasedCount ) moveGhost( game, g )`. Add the flip at the end of `moveGhost`: `if ( !isInPen( g.x, g.y ) ) g.state = 'active';`.
   Manual test: exit cadence is still 1 / 1.5s / 3s / 4.5s, ghosts are no longer released twice, and after a death all four are back on their start cells with the clock restarted.
4. In `src/js/game.js` add the one-way door to `canMove`, right after the tunnel branch and before the `isWall` call: if the target cell holds a door tile (3) and the actor is a ghost, the move is legal only when `d.y === -1`. Bounds are checked first, so out-of-range cells still fall through to `isWall`.
   Manual test: no ghost ever re-enters the pen over a full level, and Pac-Man is still stopped by the door.

## Acceptance criteria

- [ ] With Pac-Man parked in the bottom half, all four ghosts leave the pen.
- [ ] The same happens with Pac-Man in the top half, in the tunnel row, and in each of the four corners.
- [ ] The frame at which each ghost leaves the pen does not change when Pac-Man's position changes.
- [ ] Each ghost's position crosses the pen boundary within 30 frames (3 cells at 1/10 cell/frame) of its release tick.
- [ ] No ghost re-enters the pen between the moment it leaves and the end of the level.
- [ ] A ghost outside the pen is never able to step onto a door tile moving down.
- [ ] Pac-Man still cannot enter the pen or cross a door tile.
- [ ] Ghosts waiting in the queue (index >= `releasedCount`) do not move a single frame.
- [ ] The four ghosts are active at roughly 0s, 1.5s, 3s and 4.5s, same cadence as SPEC 01.
- [ ] After losing a life: all four ghosts are on their start cells, `releasedCount` is back to 1, and the next ghost leaves 1.5s later.
- [ ] Ghost positions stay exact multiples of 1/10 cell; no jitter after a turn.
- [ ] The four kinds still turn toward their own targets once outside the pen (hunter, ambusher, flanker, shy unchanged).
- [ ] Each ghost keeps its own color; the door is drawn exactly as before.
- [ ] `src/index.html` loads with zero console errors, and none appear during play.
- [ ] Eating all dots still wins the level, and `MAZE` is still never mutated.

## Decisions

- **Yes:** the pen override goes in `getTarget`, not in `decideGhost`. The bug *is* a targeting bug: the shortest path to Pac-Man points into a wall. All four kinds then share one exit rule instead of four copies of it.
- **Yes:** the override is guarded by `g.state === 'pen'` rather than by a second `isInPen` call. The state is written in one place (`moveGhost`) and read in one place (`getTarget`), which keeps the "inside the pen" answer on a single field.
- **Yes:** the one-way door is in scope here, even though SPEC 01 deferred it. It is what makes "a released ghost stays out" true, and it stops the pen from being a safe pocket a ghost can slip back into. Deferring it again would leave the pen as a place where a released ghost parks forever.
- **Yes:** the door is passable only when `d.y === -1` for ghosts. One rule, no per-ghost bookkeeping, and Pac-Man's block is untouched because it stays in `isWall`.
- **No:** the rule lives in `isWall( grid, x, y, actor, dir )`. `isWall` answers "is this cell solid for this actor"; the direction belongs to `canMove`, which already owns it and already handles the tunnel. Adding a parameter to `isWall` for one caller would be the worse trade.
- **Yes:** this direction is only correct because `PEN_EXIT` sits above the pen in this maze. Recorded in Risks, not solved: the pen is above its own exit, so out means up.
- **Yes:** `releasedCount` (a game-level counter) rather than a per-ghost `released` boolean. Release order already is `GHOST_STARTS` order, so a single integer pointing into that array states the rule once. SPEC 01's comment on `GHOST_STARTS` stays true.
- **No:** a third state `'leaving'`. `'pen'` and `'active'` are enough once release order stops being carried by the same field, and a third value would mean the renderer has to learn a new case later.
- **Yes:** `releasedCount` starts at 1, so the first ghost is released at t=0 without touching the clock, exactly as SPEC 01 specifies.
- **Yes:** `PEN_BOX` includes the door row. If a ghost standing on the door already counted as outside, its target would become Pac-Man's cell and it could turn straight back down into the pen. The extra cells it covers are wall cells a ghost can never occupy.
- **Yes:** waiting ghosts keep bobbing nowhere — they stay static in the pen until the clock reaches them, as in SPEC 01.
- **No:** the pen exit as a scripted animation or a teleport. Walking out through the door is what makes the door and the box mean something, and a teleport would make the pen geometry cosmetic.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| `PEN_BOX` drifts from the maze if the pen rows in `MAZE_STR` are ever redrawn | Comment beside `PEN_BOX` says it must be edited with the pen rows. The failure is loud: a ghost that cannot reach the door loops in the pen. |
| The one-way rule hardcodes "out is up", which only holds because `PEN_EXIT` is above the pen | Stated in the code comment next to the check. Moving the pen means flipping the sign there, in one place. |
| `state` is written in `game.js` and read in `ghosts.js`, so a third writer could desync it from the position | Only `moveGhost` writes it, and only from `isInPen`. The comment there says the flag is derived, never chosen. |
| A ghost released while Pac-Man dies mid-exit is reset to `state: 'pen'` and re-queued | `resetPositions` sets all four to `'pen'` and `releasedCount` to 1, so it re-enters the queue in the normal order. |
| A future edit places a start cell outside `PEN_BOX` | That ghost skips the pen target and chases from frame 0. Loud, not silent, and visible as a ghost leaving early. |
| 120Hz displays release a ghost every 0.75s real time | Pre-existing in SPEC 01, unchanged by this spec. Noted, not fixed here. |

## What is **not** in this spec

- Ghosts bobbing up and down the pen before release.
- Dot-counter and dot-limit release rules.
- Scatter/chase cycling, power pellets, frightened ghosts, the eaten state.
- Per-ghost speed differences and BFS / shortest-path movement.
- Any visual change to the door or to how waiting ghosts look.

Each one of those, if it lands, goes in its own spec.