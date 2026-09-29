# SPEC 01 — Four ghosts with distinct behaviors

> **Status:** Implemented
> **Depends on:** — (first spec in the repo)
> **Date:** 2026-09-28
> **Objective:** Give the game four ghosts, each with a different targeting behavior, released one at a time from the pen.

## Why this spec exists

`src/js/game.js` currently has two ghosts: `hunter` (greedy Manhattan toward Pac-Man) and
`random` (uniformly random turn). Two ghosts is not the game, and `random` is not a behavior
anybody designs on purpose. The targeting logic also lives inline in `decideGhost`, so adding
a third behavior means adding a third `else if` in the movement loop.

This spec replaces the placeholder with the four classic behaviors and separates targeting
from movement so that each behavior is one small function in its own file.

## Scope

**In:**

- Four ghosts (`hunter`, `ambusher`, `flanker`, `shy`), each with its own target cell.
- `getTarget( game, g )` dispatch in a new `src/js/ghosts.js`, one function per kind.
- Deterministic tie-break: up > left > down > right, replacing today's left-first order.
- Per-ghost release state (`pen` / `active`) and a frame-based release clock: first ghost out
  at t=0, then one every 90 frames (1.5s at 60fps).
- Full reset of positions **and** release clock when Pac-Man loses a life.
- `GHOST_STARTS` grows to 4 entries; `GHOST_COLORS` in `render.js` becomes keyed by kind.
- `<script>` tag for `ghosts.js` added to `src/index.html`.

**Out of scope (for future specs):**

- Scatter/chase mode cycling.
- Power pellets and frightened ghosts.
- One-way ghost pen door.
- Per-ghost speed differences.
- Pathfinding / BFS toward the target.

## Data model

```js
// src/js/maze.js — 4 fantasmas, en orden de salida de la pen
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'hunter' },   // el primero en salir
  { x: 14, y: 14, kind: 'ambusher' },
  { x: 13, y: 15, kind: 'flanker' },
  { x: 14, y: 15, kind: 'shy' },
];
```

All four cells are inside the pen (rows 13-15, cols 11-16) and mirrored about the 13/14 axis.
`hunter` survives this change unchanged, same name and same cell. `random` (cell 14,14)
becomes `ambusher` and does not come back: no ghost takes a random turn anymore.

```js
// src/js/game.js — por fantasma
{
  x: 13, y: 14,          // float, celdas, como hoy
  dir: 'up',             // como hoy
  speed: 0.1,            // GHOST_SPEED, sin cambios
  kind: 'hunter',         // 'hunter' | 'ambusher' | 'flanker' | 'shy'
  state: 'active',       // NUEVO: 'pen' (espera el reloj) | 'active' (se mueve)
}

// src/js/game.js — por partida
releaseTimer: 0,         // NUEVO: frames transcurridos desde la ultima salida
```

```js
// src/js/ghosts.js
// Constantes
const GHOST_RELEASE_FRAMES = 90;              // 1.5s a 60fps
const SHY_SCARED_DIST = 8;                    // celdas, distancia euclidea
const SHY_CORNER = { x: 1, y: 29 };           // esquina inferior izquierda
const TURN_PRIORITY = [ 'up', 'left', 'down', 'right' ];

// Salida: celda objetivo de un fantasma, en enteros de celda.
function getTarget( game, g ) { /* dispatch por g.kind */ }

// Por kind (una por comportamiento)
function hunterTarget( game, g )    // celda de Pacman
function ambusherTarget( game, g )  // celda de Pacman + 4 celdas en su direccion
function flankerTarget( game, g )   // v = Pacman + 2 celdas en su direccion;
                                   // target = v + ( v - celda de hunter )
function shyTarget( game, g )       // dist > 8 -> celda de Pacman; si no, SHY_CORNER
```

Conventions:

- Targets are integer cell coordinates and are **not** required to be walkable or inside the
  maze. They only rank legal directions; `canMove` does the filtering. No pathfinding.
- `getTarget` reads `game.ghosts` to find the `hunter` (needed by `flankerTarget`). If no
  hunter is found it falls back to Pac-Man's cell.
- All movement ranking stays Manhattan (`|dx| + |dy|`). Only the shy ghost's *scared* check is
  Euclidean (`Math.hypot`), because that threshold is a radius, not a ranking.
- A ghost whose `state` is `pen` is not moved at all. It is still rendered, in full color.

## Implementation plan

1. Create `src/js/ghosts.js` with `getTarget` plus the four `*Target` functions and the
   constants, exported as `window.getTarget`. Nothing references it yet.
   Manual test: open `src/index.html`, console has no errors, game plays as before.
2. Add `<script src="js/ghosts.js"></script>` to `src/index.html` between `maze.js` and
   `game.js`, so `ghosts.js` is loaded before the file that calls it.
   Manual test: still no errors, behavior unchanged.
3. In `src/js/maze.js` rename the second kind from `random` to `ambusher` (14,14); `hunter`
   (13,14) keeps its name and cell. In `src/js/game.js` make `decideGhost` call
   `getTarget( game, g )` and iterate `TURN_PRIORITY` with a strict `<` comparison, keeping the
   "no exit -> allow 180" rule.
   Manual test: two ghosts, both pursuing, no random turns left.
4. Add the release mechanism in `src/js/game.js`: `state` on each ghost, `releaseTimer` on the
   game, increment the timer once per `update`, release the first ghost still in `pen` when it
   reaches `GHOST_RELEASE_FRAMES`, and skip `moveGhost` for ghosts in `pen`. Make `createGame`
   finish by calling `resetPositions( game )` so start-of-game and start-of-life share one
   source of truth. Manual test: ghost 2 stays in the pen ~1.5s, then leaves; after a death
   both are back in the pen with the timer restarted.
5. Extend `GHOST_STARTS` in `src/js/maze.js` to the four entries above.
   Manual test: four ghosts, leaving the pen one every 1.5s.
6. In `src/js/render.js` change `GHOST_COLORS` from an array to a kind-keyed object
   (`hunter: '#ff0000'`, `ambusher: '#ffb8ff'`, `flanker: '#00ffff'`, `shy: '#ffb852'` —
   the same four colors the player already sees, only relabeled) and look up
   `GHOST_COLORS[ g.kind ]`. Manual test: each ghost keeps a stable color.

## Acceptance criteria

- [ ] `src/index.html` loads with zero console errors, and none appear during play.
- [ ] Exactly four ghosts are on screen: red, pink, cyan, orange.
- [ ] At game start exactly one ghost is moving and three are static inside the pen.
- [ ] Active ghost count goes 1, 2, 3, 4 at roughly 0s, 1.5s, 3s, 4.5s of play.
- [ ] Every direction the hunter turns to reduces Manhattan distance to Pac-Man's cell.
- [ ] The ambusher's turn always reduces distance to the cell 4 ahead of Pac-Man.
- [ ] The flanker's turn always reduces distance to the vector reflected through the
      hunter's cell.
- [ ] The shy ghost heads toward Pac-Man's cell while farther than 8 cells (Euclidean) and
      toward cell (1, 29) when closer.
- [ ] On an equal-distance tie the chosen direction is up, then left, then down, then right.
- [ ] No ghost ever makes a random turn.
- [ ] After losing a life all four ghosts are back on their start cells, one is active, and
      the next ghost leaves 1.5s later.
- [ ] Ghosts still pass through the pen door; Pac-Man still cannot.
- [ ] Eating all dots still wins the level and dots are restored on restart (`MAZE` untouched).
- [ ] Ghost positions stay aligned to the cell grid; no jitter after a turn.

## Decisions

- **Yes:** the four classic behaviors (exact target, 4-ahead target, reflected flank, shy
  retreat). They are proven to be distinguishable by a player, which is the actual
  requirement.
- **No:** random turns for any ghost. Four random ghosts are not four behaviors.
- **Yes:** a new `src/js/ghosts.js` rather than growing `decideGhost`. One function per
  behavior, and the file can be read on its own.
- **No:** per-ghost speeds. AGENTS.md notes that speeds which are clean fractions of a cell
  are load-bearing; a new speed desyncs actors from the grid for no design gain.
- **Yes:** `GHOST_RELEASE_FRAMES = 90` counted in frames. The whole game is frame-based
  (0.125 and 0.1 cells per frame), so a timer is the only unit consistent with the rest.
- **No:** delta-time accumulation. It would be the one delta-timed value in a game with no
  delta timing, and the display-refresh issue already exists for movement speed.
- **Yes:** full reset of the release clock on life loss. The player gets the same opening
  after a death as at the start.
- **No:** releasing ghosts on eaten/power state. That is the frightened spec.
- **Yes:** `hunter` / `ambusher` / `flanker` / `shy` as the `kind` values. A `kind` name that
  states the rule means reading `game.js` needs no lookup table to know why a ghost turns.
- **No:** `blinky` / `pinky` / `inky` / `clyde`. They name a character rather than a rule, so
  every section of the spec has to carry the mapping.
- **Yes:** the arcade colors are kept, now keyed by kind: red = `hunter`, pink = `ambusher`,
  cyan = `flanker`, orange = `shy`. Only the label changes, not what the player sees.
- **Yes:** behavior names go stale when a behavior is tuned. That cost is accepted: it is
  smaller than the cost of an untraceable name, and a renamed `kind` is a one-line change in
  one file.
- **Yes:** release order equals `GHOST_STARTS` array order, so the most aggressive ghost is
  the first one the player meets.
- **Yes:** all four start cells stay inside the pen, mirroring the existing
  `(13,14)` / `(14,14)` pair.
- **Yes:** waiting ghosts render in full color. No dimming or "sleeping" visual, which would
  add state to the renderer for no gameplay meaning.
- **No:** a one-way pen door. Recorded as a risk instead of a rule.
- **Yes:** the first ghost is released at t=0, not after 1.5s. The opening of the level should
  have a chaser in it.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| A released ghost can walk back into the pen and sit next to a waiting one | Accepted, matches current behavior. Recorded for a future one-way-door spec. |
| Release order depends on the `GHOST_STARTS` array, so reordering it silently changes difficulty | Comment in `maze.js` states the array is also the release order. |
| Missing `<script src="js/ghosts.js">` makes `decideGhost` throw on every ghost turn | Step 2 adds the tag before step 3 starts using the function. |
| `flankerTarget` target can land outside the maze or inside a wall | Targets only rank legal directions; `canMove` filters. No pathfinding, so nothing breaks. |
| `createGame` and `resetPositions` can drift apart on the initial ghost state | `createGame` ends by calling `resetPositions( game )`. |
| 120Hz displays release a ghost every 0.75s real time | Same as the existing double-speed movement. Noted, not fixed here. |

## What is **not** in this spec

- Scatter/chase mode cycling.
- Power pellets, frightened ghosts, and the "eaten" ghost state.
- A one-way pen door.
- Per-ghost speed differences.
- BFS / shortest-path movement.

Each one of those, if it lands, goes in its own spec.
