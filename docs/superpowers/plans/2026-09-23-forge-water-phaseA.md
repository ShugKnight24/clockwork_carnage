# Forge Water, Phase A: Water, Swimming and Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Water block (id 19) the builder can place in creative, drawn as moving, depth-tinted water with an underwater view, that the player swims in, with splash and stroke sounds. No generator, save-format or survival-content change.

**Architecture:** Water is a non-solid block with its own mesh buffer. The mesher sends water faces to `water`, hides them against water and opaque blocks, and flags surface corners in the AO byte; the vertex shader lowers flagged corners to 7/8 of the cell. The renderer draws water after opaque faces and sprites, before glass, in three short passes over the same small meshes: a depth pre-pass that also writes the surface distance, a blended colour pass that reads a copy of the scene's linear depth to know how much water lies in front of the bed, and an id pass that gives water its own face id for the ink outline. A `u_time` uniform animates a two-way scrolling ripple layer from the atlas. When the eye is under the surface the renderer swaps the fog and the post pass tints and wobbles the frame. Swimming is a set of pure functions in `voxel-physics.js` that the Forge calls in place of plain gravity; a small pure tracker in `block-sounds.js` turns submersion changes into sounds.

**Tech Stack:** Vanilla ES modules, WebGL2 (GLSL ES 3.00), Vite, Vitest, Playwright + Chromium with GPU flags.

**Spec:** `docs/superpowers/specs/2026-09-23-forge-water-and-vessels-design.md`, §A, §B and "Phase A".

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution. Do not push.
- Do not touch `src/world/world-codec.js`, `src/world/world-store.js`, `src/world/world.js`, the Forge's save/autosave code, campaign files, `js/audio.js`, `src/ui/hud*.js`: endless phase 3 is in flight in those.
- `js/forge.js` changes stay small and self-contained (palette, placement rule, pick ray, swim input), to rebase cleanly.
- `column-gen.js` is not touched: generator v1 stays frozen and its golden hashes must pass unchanged.
- Block ids append only; Water is 19. Atlas stays within `MAX_LAYERS = 32` (23 after this).
- Baseline to hold: 1,203 unit tests across 80 files; `tests/forge.spec.js` and `tests/smoke.spec.js` green.

## File Structure

| File | Responsibility |
|---|---|
| `src/world/blocks.js` | `WATER = 19`, the block row, `isWater`, `WATER_SURFACE`; `isSolid` excludes water |
| `src/rendering/voxel/natural-art.js` | `nat:water` ripple painter per style |
| `src/rendering/voxel/mesher.js` | `water` buffer, water culling rule, surface-corner flags |
| `src/rendering/voxel/shaders.js` | water vertex lowering, `WATER_FRAG` (or water branch), `u_time`, post underwater tint |
| `src/rendering/voxel/voxel-renderer.js` | water VAO per chunk, the three water passes, depth copy, underwater fog |
| `src/world/voxel-physics.js` | `submersion`, `eyeInWater`, `swimStep`, `swimSpeedScale`, `SWIM`; ray `hit` predicate |
| `src/audio/block-sounds.js` | `water` material, `playWaterSound`, `WaterSoundTracker` |
| `js/forge.js` | Water in the palette and `0` cycle, placement into water, pick ray targets water when held, swim input and sounds |
| `tests/unit/water-block.test.js`, `tests/unit/mesher.test.js`, `tests/unit/swim.test.js`, `tests/unit/water-sounds.test.js`, `tests/unit/forge-rules.test.js`, `tests/unit/world.test.js`, `tests/unit/rpg-forge-adapter.test.js` | New and updated tests |

---

### Task 1: The block

**Files:** `src/world/blocks.js`, `src/rendering/voxel/natural-art.js`; tests `tests/unit/water-block.test.js`, `tests/unit/world.test.js`

- [ ] **Step 1: Failing tests.** Water is id 19, name "Water", kind "water"; `isSolid(19)` and `isOpaque(19)` false; `isWater` true only for 19; every earlier id keeps its name and kind (append-only); `faceKeys()` gains `nat:water` and stays ≤ 32; the atlas layer table gives water a layer. `BLOCKS.length` becomes 20.
- [ ] **Step 2:** `npx vitest run tests/unit/water-block.test.js` fails.
- [ ] **Step 3: Implement.** The row, `isWater`, `WATER_SURFACE = 0.875`, `isSolid` excluding water; `paintNatural("water")` draws a ripple pattern (soft bands and ink-like glints in comic, flat posterised in legacy, smooth in modern), alpha 255 (opacity is the shader's).
- [ ] **Step 4:** Tests pass. Commit `feat(world): add a water block`.

### Task 2: Meshing water

**Files:** `src/rendering/voxel/mesher.js`; test `tests/unit/mesher.test.js`

- [ ] **Step 1: Failing tests.** A lone water cell in air gives six faces, all in `water`, none in `opaque` or `alpha`; a 3 × 3 × 2 pool has no inner faces and its top merges into one quad; water beside stone hides its face against the stone while the stone's face against the water is drawn; water beside glass keeps both faces; a surface cell's top corners are flagged, a cell with water above is not; the byte-identical padded-copy tests still pass.
- [ ] **Step 2:** Fail.
- [ ] **Step 3: Implement.** Third builder; `covered` for water is `isOpaque(n) || n === id`; water AO byte = surface flag per corner (1 at a corner whose cell has non-water, non-opaque above and which sits at the cell's top edge), else 0.
- [ ] **Step 4:** Pass. Commit `feat(voxel): mesh water into its own buffer`.

### Task 3: Drawing water

**Files:** `src/rendering/voxel/shaders.js`, `src/rendering/voxel/voxel-renderer.js`

- [ ] **Step 1:** Shaders: `u_waterPass` mode (0 off, 1 depth, 2 colour, 3 id); vertex lowers flagged corners by `1 − WATER_SURFACE`; fragment in colour mode samples the ripple layer twice with `u_time`, reads `u_sceneDepth` for thickness, tints shallow → deep, fresnel-ish opacity, back faces as a bright underside. Post pass: `u_underwater` tint and wobble.
- [ ] **Step 2:** Renderer: upload `water` per chunk, a spare linear-depth texture and FBO for the copy, the three passes when any water chunk is visible, underwater fog/clear when `eyeInWater`. Free the new GL objects in `_freeChunk`, `_freeFBO`, `destroy`.
- [ ] **Step 3:** `npx vitest run` green (renderer unit tests have no GL; this is proved in the browser in Task 6). Commit `feat(voxel): draw water with depth tint, ripples and an underwater view`.

### Task 4: Swimming

**Files:** `src/world/voxel-physics.js`, `js/forge.js`; tests `tests/unit/swim.test.js`, `tests/unit/voxel-physics.test.js`

- [ ] **Step 1: Failing tests** (a pure simulation loop of `swimStep` + `moveAABB` over a built pool): sinks slowly with no input; Space rises and then holds with the eye out of the water; crouch dives; horizontal scale is 0.55 when swimming and 1 on land, easing while wading; climbs out onto a bank one block above the water; cannot climb a two-block bank; a fall into water loses most of its speed within 0.3 s; wading still jumps; `submersion` and `eyeInWater` at the 7/8 surface; `raycastBlocks` skips water by default and stops on it with a `hit` predicate.
- [ ] **Step 2:** Fail.
- [ ] **Step 3: Implement** the functions and wire the Forge: vertical velocity from `swimStep` when `submersion > 0`, speed scaled, Space/crouch as input, `against` from the previous move's `hitX || hitY`.
- [ ] **Step 4:** Pass. Commit `feat(forge): swim in water`.

### Task 5: Placement and sounds

**Files:** `js/forge.js`, `src/audio/block-sounds.js`; tests `tests/unit/forge-rules.test.js`, `tests/unit/rpg-forge-adapter.test.js`, `tests/unit/water-sounds.test.js`

- [ ] **Step 1: Failing tests.** `PLACEABLE_BLOCKS` ends with 19; `placementAllowed` accepts a water cell, and accepts a non-solid block where a body stands; `materialOf(19) === "water"`; the tracker fires `enter` once (strength from fall speed), `exit` once, `stroke` at most every 0.6 s while swimming and moving, `dive` when the eye goes under, nothing on land.
- [ ] **Step 2:** Fail.
- [ ] **Step 3: Implement.** Palette and the `0` cycle; the pick ray takes water as a target while Water is the creative tile; sounds from `playNoise`/`playTone`.
- [ ] **Step 4:** Pass. Commit `feat(forge): place water in creative and hear it`.

### Task 6: Look and verify

- [ ] **Step 1:** `npx vite --port 5186 --strictPort` in the background; headless Chromium with `--use-gl=angle --use-angle=metal --enable-gpu`; `ccDebug.startBuilder()`, dig a pool and a small lake with `ccDebug.setBlock`, fill with 19; screenshots above the water, at the surface and submerged into the scratchpad `water-A/`. Iterate on colours, opacity and shimmer until it reads as water in the comic style.
- [ ] **Step 2:** `npx vitest run`; `CC_TEST_PORT=5186 npx playwright test tests/forge.spec.js tests/smoke.spec.js --reporter=line`. Stop the server. Commit any tuning as `style(voxel): tune water look`.
