# AGENTS.md

Pac-Man clone in vanilla JS/HTML/CSS. **No build step, no dependencies, no `package.json`, no tests, no linter.** Don't look for or invent one.

## Run / verify

Open `src/index.html` directly in a browser (`file://` works — no modules, no fetch). Click Start, arrow keys to move, check the console for errors. That's the entire verification loop.

If the game appears frozen or blank, the usual cause is script load order in `src/index.html` (see below), not a build problem.

## Architecture

Four classic `<script>` files loaded in this exact order from `src/index.html` — **that order is the dependency graph**:

1. `js/maze.js` — level data. Exports via `window`: `MAZE`, `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS`
2. `js/game.js` — rules/state. Needs the maze globals. Exports `createGame`, `update`, `DIRS`
3. `js/render.js` — canvas drawing. Needs `DIRS`
4. `js/main.js` — input + game loop, calls the three above

There is no module system and no bundler. Cross-file references are plain globals attached to `window` at the bottom of each file. **Any new file must be added to `index.html` manually and placed after its dependencies.**

## Maze (`src/js/maze.js`)

- Authored as 31 string rows of 28 chars, parsed to numbers at load. Edit the strings, never the derived `MAZE`.
- Legend: `#` wall(1) · `.` dot(2) · `space` walkable-empty(0) · `-` ghost-pen door(3)
- Coordinates are cell `(x, y)`, origin top-left, `x ∈ [0,27]`, `y ∈ [0,30]`.
- **The maze is symmetric about the vertical axis between columns 13 and 14.** Any edit must be mirrored on both halves or the level will look wrong.
- `TUNNEL_ROW` (14) is the wrap-around row: actors leaving one edge reappear on the other. Changing the row means updating it in one place only — `canMove`/`wrapTunnel` read the constant.
- Door tiles (3) block Pac-Man but let ghosts through — see the `actor` argument on `isWall()`. Don't collapse that check.

## Mutation rules

`MAZE` is a **pristine template and is never mutated**. `createGame()` deep-copies it into `game.grid`, which is what gameplay (`game.js`) and rendering (`render.js`) read. Eat a dot by writing `0` into `game.grid`, never into `MAZE`, or the level cannot be restarted.

## Movement model (`src/js/game.js`)

- Positions are floats in cell units; Pac-Man moves `1/8` cell/frame, ghosts `1/10`.
- All turning, dot-eating, and ghost decisions happen **only when the actor is aligned to a cell center** (`aligned()` check, then `Math.round`). Speeds that are clean fractions of a cell are load-bearing — changing them to values that don't divide evenly desyncs actors from the grid.
- Collision is a distance check (`|dx| < 0.5 && |dy| < 0.5`) on float coords, not a cell-equality test.

## Sizing

`TILE = 20` in `render.js` drives all drawing. Canvas is `560×620` = `28×20 × 31×20` and is declared **twice**: the `width`/`height` attributes in `index.html` and `#game-wrap` in `css/style.css`. Change the maze dimensions and you must update both, or the game will be cropped or letterboxed.

## Code style

Non-default, follow it exactly:

- Spaces inside brackets and parens: `grid[ y ][ x ]`, `isWall( grid, x, y, actor )`, `if ( x < 0 )`
- Single quotes, semicolons, 2-space indent
- File header comment naming the file and its one-line responsibility
- Function comments explain the *why* (rule, invariant); the code already says *what*
- **Code comments are in Spanish and deliberately omit accents/tildes** (no `á é í ó ú ñ`). Match this.
- In-game UI strings are Spanish (`VIDAS`, `GANASTE`, `PERDISTE`, `Reiniciar`). Keep new ones consistent.

## Spec-driven workflow (this repo exists to practice it)

`/spec` and `/spec-impl` skills in `.agents/skills/`, pinned by `skills-lock.json`. Work flows through them, not around them.

- Specs live in `specs/NN-slug.md` (folder does not exist yet — the first `/spec` creates it).
- **Specs are written in English**, using the skill's default section names and `**Status:** Draft` as the starting state. This is deliberate: code comments are Spanish, specs are not.
- `/spec-impl` refuses to run on anything not meaning "Approved" — if you're asked to implement a spec that is still `Draft`, stop and say so rather than starting.
- `/spec-impl` creates and switches to branch `spec-NN-slug` (from `develop`), implements **one plan step at a time with a pause for diff review**, and **never commits on its own** — never commit without being explicitly asked.
- Follow the spec's plan even where you disagree. Changes to a spec go in the spec, not silently into the code.
