# Forge Water, Phase C: Vessels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Three vessels in the Forge — a Raft from logs, a Boat from planks, a Jetski from metal and energy cells — that float on the water, are steered with WASD, carry the player seated, and are saved with the world. Creative places them with a tool; survival crafts them and places the item on water. The jetski is fast, drifts, leaves a spray wake and hops small swells and shore steps. Play-test enemies stay out of water.

**Architecture:** A vessel is plain data, `{id, kind, x, y, z, yaw, vx, vy, vz, spin}`, kept in `world.meta.vessels`: the v4 document and the phase 3 v5 world row both clone `meta` whole, so saving needs no codec change. `src/world/vessels.js` holds the pure part: the per-kind table, one physics step (buoyancy against the 7/8 water surface, throttle, drag, turning, speed caps, land behaviour, a swept `moveAABB` with no step-up so a hull stops at a bank), placement and mount/dismount cells, a ray pick, the visual bob and tilt, and the jetski's wake particles. The Forge owns the list for the world it edits, steps every vessel whose column is loaded (an unloaded one is frozen and not drawn, as enemies are), seats the player on the ridden one and moves the camera with it. Because the camera is the streamer's centre, a ridden vessel's column is always resident. Vessels are drawn as small voxel models: cell grids meshed once by the chunk mesher through a tiny `readBox` source, uploaded once per atlas, and drawn in the opaque pass with a model rotation, pivot and uv scale added to the chunk vertex shader; chunks draw with the identity. The model origin is the vessel position minus the eye's whole block, taken in doubles on the CPU like every chunk origin, so nothing jitters at x = 900,000. The wake is the renderer's existing additive `fx` billboards. Engine, paddle, splash and bump sounds come from a pure tracker in `src/audio/vessel-sounds.js` played through `playNoise`/`playTone`.

**Tech Stack:** Vanilla ES modules, WebGL2, Vite, Vitest, Playwright + Chromium with GPU flags.

**Spec:** `docs/superpowers/specs/2026-09-23-forge-water-and-vessels-design.md` §D, "Phase C", and "Decisions (answered 2026-09-23)": the mount key is `B` for now, with `E` reserved for a future general interact action, so the binding lives in one constant; the jetski needs a Forge station at construction level 15; play-test enemies avoid water. Buckets shipped in phase B.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution. Do not push.
- Not touched: campaign/story files, `js/audio.js`, `src/ui/hud*.js`, the world codec and store (a test proves `meta.vessels` rides through both). `src/world/world.js` and the column generators are not edited: another change is working there.
- `B` boards and leaves vessels. It used to toggle Endless/Bounded for the next world (phase 4); that choice moves to Shift+V, beside V's Terrain/Flat, with its HUD hint, help line and tests. Ctrl+B is left alone: it belongs to expanding an old world. `VESSEL_KEY` in `js/forge.js` is the one place the binding lives.
- No new atlas layers: models reuse Log, Planks, Metal, Tech, Energy and Rock.
- Baseline to hold: 1,436 unit tests; `tests/forge.spec.js`, `tests/smoke.spec.js` and `tests/perf-budget.spec.js` green.

## Vessels

| Kind | Recipe | Top speed | Reverse | Turn | Grip | Box (half × height) | Draft |
|---|---|---|---|---|---|---|---|
| Raft | 6 logs, by hand, construction 1 | 3.5 | 1.5 | 1.1 rad/s | high | 1.1 × 0.45 | 0.2 |
| Boat | 8 planks + 1 metal, Workbench, construction 3 | 6 | 2.5 | 1.8 rad/s | high | 0.8 × 1 | 0.3 |
| Jetski | 8 metal + 2 energy cells + 2 tech plates, Forge, construction 15 | 13 | 3 | 2.6 rad/s | low (drifts) | 0.55 × 0.8 | 0.25 |

- **Floating:** keel depth below the surface is pushed toward the draft by a damped spring (so a drop into water bobs and settles); out of water the hull falls under gravity.
- **Land:** a raft or boat on ground has no power and grinds to a stop; a jetski crawls at up to 1 block/s so it can be nudged back in.
- **Jetski hop:** Space while floating lifts it about 1.7 blocks, enough to clear a one-block shore step or a swell.
- **Collision:** `moveAABB` with `step: 0` and the kind's box: a hull stops at a beach and cannot climb a bank. Unloaded columns are solid to it, as to any body.
- **Riding:** `B` mounts the nearest vessel within 2.5 blocks (Endless/Bounded for the next world moves to Shift+V). W/S throttle and reverse, A/D steer, the mouse looks around and the view turns with the hull. `B` again dismounts onto the nearest standable dry cell within 4 blocks, else into the water beside the hull.
- **Placing:** creative — the `vessel` tool (T), G cycles the kind, left click places on the targeted water surface or ground (sliding up to 1½ blocks to fit by a bank), right click removes the vessel under the crosshair. Survival — holding a vessel item, the pick ray stops on water and a left click places it; holding the break button on a vessel for half a second picks it up into the inventory.
- **Streaming:** a vessel in an unloaded column is not stepped or drawn and stays in `meta.vessels`; the ridden one carries the camera, which is the streamer's centre.

## File Structure

| File | Responsibility |
|---|---|
| `src/world/vessels.js` | **New.** `VESSELS` table, `vesselsOf`/`sanitizeVessels`, `waterSurfaceAt`, `stepVessel`, `canPlaceVessel`, `nearestVessel`, `dismountCell`, `pickVessel`, `vesselPose`, `WakeTrail` |
| `src/rendering/voxel/vessel-models.js` | **New.** Cell grids per kind, `modelSource` (a `readBox` over a grid) and `meshModel` |
| `src/rendering/voxel/shaders.js`, `voxel-renderer.js` | `u_model`, `u_pivot`, `u_uvScale` in the chunk vertex shader; `opts.models` drawn after opaque chunks, meshes cached per atlas |
| `src/rendering/render-pipeline.js` | Forge models and wake fx into `drawVoxelScene` |
| `src/audio/vessel-sounds.js` | **New.** `VesselSoundTracker`, `playVesselSound` |
| `src/rpg/items.js`, `recipes.js` | `raft`, `boat`, `jetski` items and recipes |
| `js/forge.js` | vessel tool, placing and picking up, `VESSEL_KEY` boarding, riding update, camera, `modelsFor`, `fxFor` |
| `src/ui/forge-hud.js` | vessel tool label, riding hint, help line |
| `src/systems/voxel-ai.js` | walkers do not step into water |
| `tests/unit/vessels.test.js`, `vessel-models.test.js`, `vessel-forge.test.js`, `vessel-sounds.test.js`, `voxel-ai-water.test.js`; `tests/forge.spec.js` | New tests |

---

### Task 1: Vessel physics and rules

- [x] **Failing tests** (`tests/unit/vessels.test.js`, a flat world with a dug pool): each kind settles with its keel at the surface minus its draft and stays there; dropped from above it splashes down and settles within 2 s; full throttle reaches and never exceeds the kind's top speed; reverse is capped lower; A/D turn at the kind's rate, faster on the jetski; a hull driven at a beach stops at it and its z never rises onto the bank; out of water a raft or boat does not move under throttle and a jetski crawls at ≤ 1 block/s; the jetski hop clears a one-block step out of the water and a boat cannot; the jetski drifts (lateral speed survives a turn) where the boat does not; `canPlaceVessel` accepts open water and flat ground and refuses solid cells and another vessel's spot; `nearestVessel` respects 2.5 blocks; `dismountCell` returns a dry standable cell when one is within 4 blocks and a free water cell beside the hull otherwise; `pickVessel` hits the nearest box along a ray; `sanitizeVessels` drops unknown kinds and non-finite numbers and zeroes velocities; `vesselPose` bobs within a small amplitude and tilts into a turn.
- [x] **Implement** `src/world/vessels.js`. Commit `feat(world): vessel physics for rafts, boats and jetskis`.

### Task 2: Items and recipes

- [x] **Failing tests** (`tests/unit/vessel-recipes.test.js`): raft by hand from 6 logs; boat needs a Workbench and construction 3; jetski needs a Forge and construction 15 (locked below it, refused away from a Forge); every input exists; crafting spends the inputs and yields one stack-of-one item.
- [x] **Implement.** Commit `feat(rpg): craft rafts, boats and jetskis`.

### Task 3: Models and drawing

- [x] **Failing tests** (`tests/unit/vessel-models.test.js`): every kind's grid fits in 16³ and only uses opaque block ids; `meshModel` gives a non-empty opaque mesh and nothing in alpha or water; a grid's bottom face is drawn (no bedrock under a model); the model's footprint matches the physics box within a cell.
- [x] **Implement** the grids, `meshModel`, the shader uniforms and `opts.models` in the renderer; free model meshes on atlas change and `destroy`. Commit `feat(voxel): draw vessels as voxel models with a model transform`.

### Task 4: The Forge

- [x] **Failing tests** (`tests/unit/vessel-forge.test.js`, a `ForgeMode` on a `MemoryBackend`): creative vessel tool places a boat on water and right click removes it; `B` near a vessel mounts it, `B` again dismounts onto dry land; `B` with nothing near says so and Shift+V toggles Bounded; Ctrl+B does not board; W for 2 s moves the ridden boat across the water and it stays afloat, the player seated on it; survival places a crafted boat from the hotbar (the item is spent) and a held break picks it up (the item returns); `meta.vessels` round-trips through `encodeWorld`/`decodeWorld` and a `WorldStore` save and load; a vessel in an unloaded column is not stepped or drawn and is still saved; a streamer following a ridden vessel 400 blocks keeps its column resident.
- [x] **Implement** in `js/forge.js`, the HUD and the pipeline. Commit `feat(forge): place, board and steer vessels`.

### Task 5: Sounds and wake

- [x] **Failing tests** (`tests/unit/vessel-sounds.test.js`): engine pulses only for a jetski, faster and higher with speed; paddle strokes for raft and boat only while throttling afloat, rate-limited; a splash on landing in water scaled by impact; a bump on a hard stop; nothing when idle on land. `WakeTrail` spawns only above a speed, stays under its cap and ages out.
- [x] **Implement** `src/audio/vessel-sounds.js`, the wake in the Forge's `fxFor`. Commit `feat(forge): engine, paddle and splash sounds and a jetski wake`.

### Task 6: Enemies avoid water

- [x] **Failing test** (`tests/unit/voxel-ai-water.test.js`): a walker chasing the player across a pool stops at the edge and stays dry; one already in water still walks out; flyers cross.
- [x] **Implement** in `_moveWalker`. Commit `feat(ai): play-test walkers keep out of water`.

### Task 7: Look and verify

- [x] Dev server on 5189, headless Chromium with GPU flags; a v2 world, find a coast, place each vessel, board and drive with real key presses; screenshots of each vessel on the water from the shore and seated, a jetski at speed with its wake, and at x ≈ 900,000, into the scratchpad `water-C/`. Iterate until it looks right.
- [x] E2E in `tests/forge.spec.js`: place a boat, board with B, drive with W for 2 s, it crossed water and stayed afloat, dismount, reload, the boat is still there.
- [x] `npx vitest run --testTimeout=60000`; `CC_TEST_PORT=5189 npx playwright test tests/forge.spec.js tests/smoke.spec.js --reporter=line`; `CC_TEST_PORT=5189 npx playwright test tests/perf-budget.spec.js --workers=1`. Stop the server.

## Results (measured 2026-09-23)

- Unit: 1,504 tests pass (baseline 1,436). `tests/forge.spec.js` + `tests/smoke.spec.js`: 43 pass, the new vessel e2e among them. `tests/perf-budget.spec.js`: 22 pass; the long flight is unchanged (laptop-hidpi voxel avg 0.66 ms, p95 2.2 ms).
- Cost: stepping 20 vessels and a full wake (240 particles) takes 0.03 ms a frame in node. The three models mesh once per atlas (120, 364 and 144 triangles), about 10 ms together the first time, most of it JIT warm-up.
- Far from the origin: two still frames of a parked jetski at x ≈ 899,890 differ in the same ~200 pixels (ripples and bob) as the same shot near the origin; no jitter.
- Found while looking: the water pass tinted additive particles drawn before it, so the wake was invisible over a lake. `fx` now draws after the water with the colour alpha (the ink pass's face id) masked, so spray is bright and has no ink ring, and a spark under water is hidden. The boat's first floor sat below its waterline and showed water inside the hull; its floor is now two cells up, and a model test holds every hull's first opening above its draft.
- Screenshots: the scratchpad `water-C/` — each vessel from the shore, seated and chased (`raft-*`, `boat-*`, `jetski-*`), a jetski on open sea with its wake and carving a turn (`sea-jetski-*`), and the same at x ≈ 900,000 (`far-jetski-*`).

## Deferred

- Vessel placement and removal are not on the undo history.
- Vessels do not collide with each other or with the walking player, and the player cannot stand on one.
- A third-person camera while riding; the screenshots use a debug chase camera.
- Waves that move vessels (spec phase D); the bob and roll are drawn only.
