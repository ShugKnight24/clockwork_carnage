# Forge Endless World, Phase 4: Streaming and Endless Worlds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New worlds are endless by default: columns are generated around the player as they move, far columns are dropped from memory and the GPU (their edits folded into `edits` first), and the renderer draws camera-relative so the terrain is steady at x = 900,000. Bounded worlds stay exactly as they are — whole, resident, walls at the edge — and are one keypress away in the new-world flow. Phase 4 is done when the long-flight perf scenario passes in the browser.

**Architecture:** An endless world is `meta.endless = true`: its bounds are the ±2²⁰ border, its constructor creates no columns, and `ensureColumn` *loads* a missing column (generate, then lay its saved delta over it). A `WorldStreamer` (`src/world/world-streamer.js`, one per endless world through `streamerFor`) keeps the disc of columns around the camera resident: nearest first, under a per-frame time budget, loading inside the load radius and unloading only past the wider unload radius (hysteresis). `World.unloadColumn` folds a modified column into `edits` before it lets go, and queues its render chunks in `world.evicted` for the renderer to free. The renderer meshes under the budget left over, only chunks within the mesh radius whose column has all eight neighbours resident (`columnReady`), and draws everything relative to the eye: the view matrix sits at the origin and every chunk origin, light, sprite and tracer is shifted by the camera position in doubles on the CPU. The water pass takes a separate `u_wrap` so its ripples keep their world phase. Physics treats a cell in an unloaded column as solid; rays and bolts see air, and bolts die entering one.

**Tech Stack:** Vanilla ES modules, WebGL2, Vite, Vitest (unit), Playwright + Chromium with GPU flags (e2e, perf, screenshots).

**Spec:** `docs/superpowers/specs/2026-09-22-forge-endless-world-design.md`, "Delivery in phases", phase 4; §1, §5–§9, §14–§17; Testing, "Streamer", "Physics", "Stations, overhead, projectiles, spawn". The "Decisions (answered 2026-09-22)" section overrides the body: #2 an Endless / Bounded (128 × 128) choice sits beside Terrain / Flat in the new-world flow, Endless the default; #4 draw and load radius scale with the quality tier; #5 the ±2²⁰ border stays; #6 the last 16 blocks fade to full fog. The water plan (`2026-09-23-forge-water-phaseA.md`, merge order) adds: camera-relative origins carry the water pass too, and ripples read a world-offset uniform.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution. Do not push.
- Generator v1 stays frozen; `column-gen.js` is not touched. Water phase B is not started, but `topSolid` and spawn searches skip water (id 19) already.
- Bounded worlds — every migrated v4 world, legacy map, phase 2–3 world and new Bounded world — load whole and behave as today: no streaming, 160-block draw distance on every tier, no edge fog, same play-test fallback.
- `get`/`set`/`inBounds`/`topSolid` keep their signatures. `set` into an unloaded column of an endless world loads it synchronously (undo/redo).
- The v5 document and store are unchanged; `meta.endless` rides in `meta`.
- No Web Worker (phase 5) unless the long-flight scenario cannot pass without one.
- Do not touch campaign/story, `src/audio/*`, `js/audio.js`, `src/ui/hud*.js`.
- Baseline: 1,330 unit tests across 88 files; `tests/forge.spec.js`, `tests/smoke.spec.js` green; `tests/perf-budget.spec.js` green.

## Radii (decision #4)

Measured from the camera's exact position to a column's centre, in blocks, so the resident set is a disc:

| Tier (`quality.drawDistance` tiles) | Draw radius D | Fog fade |
|---|---|---|
| ultra, high (≥ 18) | 160 | 144 → 160 |
| medium (≥ 14) | 128 | 112 → 128 |
| low (≥ 10) | 96 | 80 → 96 |
| ultra-low | 80 | 64 → 80 |

- **Mesh radius** D + 12: a point within D lies in a column whose centre is within D + 8√2.
- **Load radius** D + 36: that column's eight neighbours (centres ≤ 16√2 further) are resident, so everything drawn is meshed without seams (§7).
- **Unload radius** D + 60: 24 blocks of hysteresis, a column and a half.

At D = 160 that is about 470 resident columns (7.7 MB of blocks) and at most about 600 before unloading (9.8 MB). The spec's 11/13-column radii were measured from the player's column, which leaves up to 22 blocks of the draw disc unmeshed on a diagonal; the fog fade would then show holes.

## Budgets (§6)

- Steady: 3 ms a frame for loading and meshing together. Loading takes at most half, at least one column; meshing takes the rest, at least one chunk.
- Loading: 10 ms while any of the 5 × 5 columns around the camera is missing or has an unmeshed chunk.
- Synchronous, outside the budget: the 3 × 3 columns around the player on adopt, play-test start, spawn search and any teleport (the Forge notices its player standing in an unloaded column).
- The profiler's voxel phase reports renderer + streamer.

## Review Focus

1. **A lost edit on unload.** `unloadColumn` folds before it deletes; a test walks away, unloads, walks back and finds the block; another saves after the unload and reloads. *(Task 1)*
2. **Caches after unload.** `World` keeps a last-column and a 16 × 16 slot cache; an unloaded column must leave neither. *(Task 1)*
3. **Seams.** Nothing meshes without its eight neighbours; loading never invalidates a mesh. *(Task 3)*
4. **Precision.** Every position sent to the GPU is relative to the eye, water included. *(Task 4)*
5. **Bounded unchanged.** Existing bounded tests pass untouched. *(all)*

---

## File Structure

| File | Responsibility |
|---|---|
| `src/world/world.js` | `endless`, border bounds, loading `ensureColumn`, `unloadColumn`, `loadAround`, `unloadedAt`, `columnReady`, `evicted`/`takeEvicted`, `defaultSpawn` on the surface, `topSolid` skips water, `countBlocks` of edited columns |
| `src/world/world-delta.js` | `foldColumn` (one column's fold, shared by `foldEdits` and unload) |
| `src/world/world-streamer.js` | **New.** `drawRadiusFor(quality)`, `streamRadii(D)`, `WorldStreamer`, `streamerFor(world)` |
| `src/world/world-gen.js` | `generateWorld({..., endless})` |
| `src/world/voxel-physics.js` | unloaded columns solid |
| `src/rendering/voxel/voxel-renderer.js`, `shaders.js` | time-budgeted meshing with readiness and mesh radius, eviction, camera-relative draw, `u_wrap`, edge fog |
| `src/rendering/render-pipeline.js` | ticks the streamer before `vr.render` |
| `src/systems/projectile-update.js`, `src/systems/voxel-ai.js`, `src/systems/voxel-glue.js` | bolts die in unloaded columns; frozen enemies; spawn loads first |
| `src/ui/forge-hud.js` | overhead window, "Endless" status, new-world indicator |
| `js/forge.js`, `js/game.js` | endless by default, B toggles Bounded, teleport loading, placement in loaded columns, play-test fallback near spawn |
| `js/testing/debug-bridge.js` | stream stats for tests |
| `tests/unit/world-streamer.test.js`, `tests/unit/camera-relative.test.js` | **New** |
| `tests/forge.spec.js`, `tests/perf-budget.spec.js` | endless e2e, long flight |

---

### Task 1: Endless worlds in `World`

- [ ] **Failing tests** (`world-streamer.test.js`, part 1): an endless world has border bounds, no columns, `meta.endless`; `ensureColumn` produces exactly `generateColumn` bytes with the saved delta laid over them and is not modified; `set` into an unloaded column loads it and writes; `unloadColumn` of a modified column folds its delta, deletes the column, clears both caches (a `get` after unload answers air, a reload answers the edit), queues its four chunk keys in `evicted` and drops them from `dirty`; `unloadColumn` of an unmodified column leaves `edits` alone; `unloadedAt` inside bounds only; `columnReady` needs all eight neighbours, except past the border; `defaultSpawn` of an endless world stands on the generated surface at (0.5, 0.5); `topSolid` skips water; bounded worlds: `unloadedAt` is false everywhere, `columnReady` true.
- [ ] **Implement.** Commit `feat(world): load and unload columns of endless worlds`.

### Task 2: `WorldStreamer`

- [ ] **Failing tests:** radii per tier; the resident set after settling is the disc of the load radius; nearest columns load first; walking back and forth over a column border 20 times loads and unloads nothing after the first crossing; walking 400 blocks keeps the resident count under the unload disc's size; the budget is obeyed with a fake clock (one load minimum, stops when spent); an edit left behind is folded on unload and is back when the player returns; `nearReady` is false until the 5 × 5 is resident and meshed; bounded worlds get no streamer.
- [ ] **Implement.** Commit `feat(world): stream columns around the camera`.

### Task 3: Renderer: budgets, readiness, eviction

- [ ] `_meshDirty(camera, budgetMs, meshRadius)`: filter dirty keys to ready columns within the mesh radius, sort nearest first, build until the time budget is spent (at least one), leave the rest dirty. Free `evicted` chunks each frame. Pure helpers exported for tests (`meshOrder`). Pipeline: streamer update, then `vr.render` with the remaining budget; voxel phase = renderer + streamer.
- [ ] Tests for `meshOrder` (skips unready and far chunks, nearest first). Commit `feat(voxel): mesh streamed columns under a time budget and free evicted ones`.

### Task 4: Camera-relative rendering and edge fog

- [ ] **Failing tests** (`camera-relative.test.js`): at x = 900,000 a chunk vertex projected with float32 camera-relative math lands within 1e-4 blocks of the double-precision answer, where the old world-space path is off by more than 0.01; water `wrapOffset` keeps the ripple phase (offsets are whole periods of both ripple layers); `edgeFog` is 0 inside D − 16, 1 at D, monotonic.
- [ ] **Implement:** `lookAt` at the origin; `u_origin = origin − eye`; `u_cam` dropped (distance is `length(v_world)`); lights, sprites, tracers, frustum relative; water `u_wrap`; `u_fogEnd` in chunk, water and post (ink fades with the fog); sprites fade on the CPU.
- [ ] Commit `feat(voxel): draw camera-relative and fade the edge of the world into fog`.

### Task 5: Physics, bolts, AI, spawn

- [ ] **Failing tests:** an unloaded column stops a walking body and a falling one; bounded clamping unchanged; clamping at the border; a bolt dies entering an unloaded column; an enemy in an unloaded column does not move; `spawnFromMeta` in an endless world loads its columns and stands on the surface; stations across a column border at negative coordinates.
- [ ] **Implement.** Commit `feat(world): unloaded columns are solid to bodies and stop bolts`.

### Task 6: The Forge: endless by default, Bounded on B, overhead window

- [ ] **Failing tests:** a new Forge world is endless; B toggles the next world to Bounded 128 × 128 and Ctrl+N honours it; the HUD names both choices; a teleport loads the 3 × 3; placement refused in an unloaded column; `overheadWindow` is the bounds for a bounded world and 128 × 128 around the player for an endless one; play-test fallback enemies stay within 48 blocks of spawn in loaded columns (bounded: the whole box, as before).
- [ ] **Implement.** Commit `feat(forge): make new worlds endless, with a bounded choice`.

### Task 7: Verify in the browser

- [ ] `npx vitest run --testTimeout=60000`; dev server on 5187; `tests/forge.spec.js` and `tests/smoke.spec.js` (adapt tests that assumed the default world is the 128 box by making a Bounded world or waiting for columns).
- [ ] New e2e: fly 600 blocks with held keys in a new endless world — terrain drawn the whole way, resident columns bounded, no long task over budget — then build far away, reload, fly back, find it.
- [ ] Perf: the long-flight scenario on every profile (voxel ms, long tasks, columns resident, MB, draw calls). Record numbers in the commit body.
- [ ] Screenshots with GPU flags flying over terrain and at x ≈ 900,000.
