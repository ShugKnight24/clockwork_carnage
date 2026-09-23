# Forge Endless World, Phase 1: Column Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 128 × 128 × 64 `Uint8Array` behind `World` with sparse 16 × 16 × 64 columns keyed by column coordinates, still bounded to the 128 box, so the game looks and plays exactly as it does today while nothing outside `src/world/world.js` assumes a world size any more.

**Architecture:** `World` holds a `Map` from a packed column key to `{ blocks, modified }`, with a one-entry cache of the last column resolved so runs of nearby reads never touch the map. Bounds come from optional `meta.bounds` and default to the 128 box; a bounded world keeps every column in its bounds resident, so behaviour is unchanged. Dirty flags become a `Set` of render chunk keys (`colKey * 4 + cz`), the renderer's chunk map is keyed by them, and the mesher copies an 18³ padded neighbourhood out of the world once per chunk instead of calling `world.get` per voxel. `World.W`/`World.D`/`World.CX`/`World.CY` are removed so a missed caller fails loudly; every former reader goes through `world.bounds`, `world.inBounds` or `world.isLoaded`.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium with GPU flags (e2e).

**Spec:** `docs/superpowers/specs/2026-09-22-forge-endless-world-design.md`, "Delivery in phases", phase 1; §2, §3, §8, §9 (keying only), §14–15 (the bounds reads only). The "Decisions (answered 2026-09-22)" section overrides the body: nothing may assume a size except optional `meta.bounds`.

## Global Constraints

- Branch off `feat/v0.8.0`. Never commit to `master`. Conventional Commits, no AI attribution.
- Still generated whole at creation, still saved as v4. `encodeWorld` output for a world is byte-identical to today's.
- `meta.bounds` is only written when a world was given one. A default world's meta is unchanged, so its saves are unchanged and phase 4 can later tell "never chose bounds" from "chose the 128 box".
- `World.H`, `World.CS`, `World.GROUND` stay. `World.W`, `World.D`, `World.CX`, `World.CY` go.
- `get`, `set`, `inBounds`, `topSolid`, `chunkIndex`, `chunkCoords`, `markDirty`, `takeDirty`, `forEachChunk` keep their signatures. `chunkIndex` now returns the sparse chunk key.
- Hot path: `get` allocates nothing and hits a cached column on repeated reads. Meshing a full 128 × 128 world must not get more than 10% slower (spec); target is faster.
- Out of scope: generation per column (phase 2), v5 and persisted placed bits (phase 3), streaming, eviction, camera-relative rendering, the overhead window for endless worlds (phase 4).
- Baseline to hold: 1,115 unit tests across 74 files; `tests/forge.spec.js` and `tests/smoke.spec.js` green.

## Review Focus

1. **Negative coordinates.** `x >> 4` and `x & 15` floor and wrap; nothing may decode with `| 0` or `%` on a signed value. *(Tasks 1, 2)*
2. **A column cache that outlives its column.** Any path that replaces a column must reset the cache. *(Task 1)*
3. **Dirty marking at a column edge.** A face block at `x = 0` must not queue a chunk in a column that is not resident. *(Task 1)*
4. **Byte-identical meshes.** The padded copy must reproduce `world.get` semantics exactly: bedrock below `z = 0`, air above 64 and outside bounds. *(Task 3)*
5. **Byte-identical saves.** A v4 document from the new world must equal the old one. *(Task 2)*

---

## File Structure

| File | Responsibility |
|---|---|
| `src/world/world.js` | Column map, bounds, cached lookup, chunk keys, `readBox`, `isLoaded`, `ensureColumn`, `countBlocks` |
| `src/world/world-gen.js` | Writes generated cells into columns, same visiting order |
| `src/world/world-codec.js` | v4 flattens and scatters through columns; still 128 box only |
| `src/world/legacy-convert.js` | Centres in `world.bounds` |
| `src/world/voxel-physics.js` | `clampToWorld` reads `world.bounds` |
| `src/rendering/voxel/mesher.js` | Reads an 18³ padded copy; skips all-air chunks |
| `src/rendering/voxel/voxel-renderer.js` | Chunk map keyed by chunk key; dirty `Set` |
| `src/rpg/survival-session.js` | Placed bits in a sparse per-column map, not a `W × D × H` bitset |
| `src/rpg/stations.js` | Drops the horizontal clamps |
| `src/systems/projectile-update.js`, `src/systems/voxel-glue.js` | Bounds via the world |
| `js/forge.js`, `src/ui/forge-hud.js`, `js/game.js`, `js/testing/debug-bridge.js` | Bounds via the world |
| `tests/unit/fixtures/flat-world.js`, `tests/unit/fixtures/mesher-v0.js` | **New**: frozen copies of today's `World` and mesher, the references for the equivalence tests |

---

### Task 1: Column storage behind the World API

**Files:**
- Modify: `src/world/world.js`
- Create: `tests/unit/fixtures/flat-world.js` (today's `world.js`, verbatim apart from its import path)
- Test: `tests/unit/world.test.js`, new `tests/unit/world-columns.test.js`

**Interfaces:**
- Produces: `colKey(cx, cy)`, `DEFAULT_BOUNDS`; `World#bounds`, `columns`, `columnKey`, `ensureColumn(cx, cy)`, `column(cx, cy)`, `isLoaded(x, y)`, `readBox(x0, y0, z0, sx, sy, sz, out)`, `markAllDirty()`, `countBlocks()`, `defaultSpawn()`. `dirty` is a `Set` of chunk keys.

- [ ] **Step 1: Write the failing tests** — `world-columns.test.js`:
  - `colKey` and `chunkIndex`/`chunkCoords` round-trip for positive, zero and negative chunk coordinates up to ±65,535.
  - a default world has bounds `{0,0,128,128}`, 64 resident columns, 256 dirty chunk keys, and no `meta.bounds`.
  - `get` at, below and above every edge: `BEDROCK` at `z = -1`, `AIR` at `z = 64`, `x = -1`, `x = 128`, `y = -1`, `y = 128`.
  - `set`/`get` across the `x = 15|16` and `y = 31|32` column borders.
  - dirty marking: a face block at `x = 16` marks chunks in two columns; at `x = 0` it marks only its own (the west column is not resident); at `z = 15|16` it marks two chunks in one column.
  - a world with `meta.bounds = {x0: -32, y0: -16, x1: 0, y1: 16}` reads and writes at negative coordinates, refuses outside, and marks neighbours across a negative column border.
  - bad bounds (inverted, fractional, past the border) throw.
  - `readBox` equals a `get` loop over a box straddling the bounds, the floor and the roof.
  - property test: 20,000 seeded random `set`/`get`/`topSolid`/`inBounds` operations over `-4..132 × -4..132 × -3..67` against `fixtures/flat-world.js`; every answer and every dirty set is identical.
- [ ] **Step 2:** Run `npx vitest run tests/unit/world-columns.test.js` — fails.
- [ ] **Step 3: Implement.** Column index `(z << 8) | ((y & 15) << 4) | (x & 15)`. `get` checks z, then the four bounds fields, then the cached column (`_cx`, `_cy`, `_col`) before the map. `set` refuses outside `inBounds`, writes through `ensureColumn`, sets `modified`, bumps `version`, and marks neighbour chunks only in resident columns. A bounded world allocates every column in its bounds up front.
- [ ] **Step 4:** Update `world.test.js`: the `index` assertion becomes a column-index assertion; the dirty-set assertions compare sorted keys.
- [ ] **Step 5:** Tests pass. (Callers still reading `World.W` break here and are fixed in Tasks 2–5 before the commit.)

### Task 2: Generation, codec and legacy conversion through columns

**Files:**
- Modify: `src/world/world-gen.js`, `src/world/world-codec.js`, `src/world/legacy-convert.js`
- Test: `tests/unit/world-gen.test.js`, `tests/unit/world-codec.test.js`, `tests/unit/legacy-convert.test.js`

- [ ] **Step 1: Failing tests.** Codec: `encodeWorld` of a generated terrain world equals the old encoder's output run on `fixtures/flat-world.js` filled with the same cells (byte-identical v4, including `meta`); decode then encode round-trips. A world whose bounds are not the default box refuses to encode as v4. Gen: two worlds from one seed read identically everywhere (via `encodeWorld`, not `.blocks`).
- [ ] **Step 2: Implement.** `generateWorld` keeps its `y, x, z` loop order (the ore RNG is sequential) and writes into `ensureColumn(x >> 4, y >> 4).blocks`. The codec flattens the 128 box row by row out of the columns and scatters on decode. Legacy maps centre inside `w.bounds` and finish with `markAllDirty()`.
- [ ] **Step 3:** Replace `.blocks` and `World.W`/`World.D` in the three existing test files.
- [ ] **Step 4:** Tests pass.

### Task 3: Mesher reads a padded copy

**Files:**
- Modify: `src/rendering/voxel/mesher.js`
- Create: `tests/unit/fixtures/mesher-v0.js` (today's mesher, verbatim apart from import paths)
- Test: `tests/unit/mesher.test.js`

- [ ] **Step 1: Failing tests.** Over every chunk of two generated terrain worlds (with glass, doors and stations sprinkled across chunk and column borders) and of a flat world, `meshChunk` output (`verts`, `indices`, `count` for both passes) is byte-identical to `mesher-v0`'s. An all-air chunk returns two empty meshes without calling `layerOf`.
- [ ] **Step 2: Implement.** One module-level `Uint8Array(18³)` scratch, filled by `world.readBox(ox - 1, oy - 1, oz - 1, 18, 18, 18, pad)`. `get` and `solid` index it. The interior is checked for any non-air cell before the six sweeps.
- [ ] **Step 3:** Benchmark (`node` script outside the repo: mesh all 256 chunks of a seeded terrain world 15×, median; per-chunk median and p95; `get` sweep; physics overlap sweep). Record before/after in the commit summary. Regression over 10% blocks the task.

### Task 4: Renderer keyed by chunk key

**Files:**
- Modify: `src/rendering/voxel/voxel-renderer.js`, `js/testing/debug-bridge.js`
- Test: `tests/unit/voxel-renderer.test.js`

- [ ] **Step 1:** `_chunkDist` decodes keys without allocating (`chunkKeyCoords(key, out)` from `world.js`). `_meshDirty` puts unbuilt keys back with `dirty.add`. Every `dirty.fill(1)` becomes `markAllDirty()`. The debug bridge reports `dirty.size`.
- [ ] **Step 2:** `voxel-renderer.test.js` enumerates chunk origins from `new World().bounds` instead of `World.CX`/`CY`/`W`/`D`.

### Task 5: Every other reader of the box reads the world

**Files:**
- Modify: `src/world/voxel-physics.js`, `src/rpg/survival-session.js`, `src/rpg/stations.js`, `src/systems/projectile-update.js`, `src/systems/voxel-glue.js`, `js/forge.js`, `src/ui/forge-hud.js`, `js/game.js`
- Test: `tests/unit/voxel-physics.test.js`, `tests/unit/rpg-survival-session.test.js`, `tests/unit/rpg-stations.test.js`, `tests/unit/projectile-voxel.test.js`, `tests/unit/game-voxel-glue.test.js`

- [ ] **Step 1: Failing tests.**
  - physics: a world bounded at `{-32,-32,0,0}` walls a body at its own edges, not at 0 and 128.
  - survival: placed bits at negative and far coordinates (`-5, -5, 3`, `200000, 7, 3`) are kept apart and cleared by `resetPlaced`.
  - stations: found across a column border (player at `x = 15.5`, bench at `x = 17`) and at negative coordinates in a negatively bounded world.
  - projectiles: a bolt dies leaving a negatively bounded world's edge, not at 0.
  - voxel-glue: `spawnFromMeta` with no spawn falls back to the bounds' centre; `standableNear` never returns a cell outside bounds.
- [ ] **Step 2: Implement.**
  - `clampToWorld(world, b, out)` clamps to `world.bounds`.
  - `SurvivalSession.placed` is a `Map` from `colKey` to a 2 KB bitset allocated on first mark (phase 3 moves it into the world and persists it).
  - Stations keep only the height clamp.
  - Projectiles die when `!world.inBounds(bx, by, bz)`.
  - `standableNear` skips `!world.isLoaded(bx, by)`; `spawnFromMeta` and `_adopt` fall back to `world.defaultSpawn()`.
  - Forge noclip clamps to `world.bounds`; `forge_save` counts with `world.countBlocks()`; the constructor's player is a placeholder until `_adopt`.
  - The overhead map draws `world.bounds` and prints its size.
  - The play-test enemy fallback scatters inside `world.bounds`.
- [ ] **Step 3:** `grep -rnE "World\.(W|D|CX|CY)\b|\.blocks\b" src js tests` is empty outside the fixtures.
- [ ] **Step 4:** `npx vitest run` — all green. Commit.

### Task 6: Verify in the browser

- [ ] `npx vite --port 5181 --strictPort` in the background; `CC_TEST_PORT=5181 npx playwright test tests/forge.spec.js tests/smoke.spec.js --reporter=line`.
- [ ] Headless GPU screenshot (`--use-gl=angle --use-angle=metal --enable-gpu`) of a fixed-seed world with edits across chunk and column borders, before and after; pixel diff.
- [ ] Stop the server.
