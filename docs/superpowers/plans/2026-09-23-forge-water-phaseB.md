# Forge Water, Phase B: Generator v2, Trees, Wood and Buckets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New worlds are made by generator version 2: a sea at z = 30 with ocean basins, sand beaches, lakes in low ground and rivers that join them to the sea, the sea's share of the surface varying by region around a 25% average, and trees by biome. Wood is a resource: logs, planks, saplings that regrow trees, and a craftable bucket that scoops and pours water. Version 1 worlds never change.

**Architecture:** Version 2 is a self-contained module, `src/world/column-gen-v2.js`, that starts as a copy of version 1's hashing, noise and layering and adds three low-frequency fields (region, continent, lakes), a river field, beach and sea-floor dressing, and tree features under the 3 × 3 rule. `column-gen.js` keeps version 1 byte-for-byte and dispatches on `gen.v`; nothing is shared between the two versions' code, so neither can move the other. Trees are pure functions of their root: every column evaluates the roots within reach of it (at most 3 blocks away, so only its eight neighbours), and writes only its own cells, with a fixed priority (terrain > log > leaves > air) that makes overlapping trees independent of evaluation order. Saplings grow on a Forge "random tick" (a pure function over the columns near the player with an injected random source), writing the same tree shapes as world edits so they save as v5 deltas. Buckets are two stack-of-one items the session swaps in place.

**Tech Stack:** Vanilla ES modules, WebGL2, Vite, Vitest, Playwright + Chromium with GPU flags.

**Spec:** `docs/superpowers/specs/2026-09-23-forge-water-and-vessels-design.md` §C, the wood and bucket parts of §D, "Phase B", and "Decisions (answered 2026-09-23)" (rivers yes, regional share, saplings, bucket in phase B). Generation rules: `2026-09-22-forge-endless-world-design.md` §4.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution. Do not push.
- Generator v1 is frozen: its code paths and golden hashes do not change. Tests that make a v1 world say `v: 1` explicitly; no hash is re-recorded.
- Generator v2 uses only `+ − × ÷`, `Math.floor`, `Math.round`, `Math.abs`, `Math.min`, `Math.max`, `Math.imul` and bit operations; the source scan covers the new file too. No sequential RNG in generation.
- Nothing generated rises above z = 47: the Forge e2e sight lines at z = 48–49 rely on open air there. A tree that would reach 48 is not grown.
- Block ids append only: Log 20, Leaves 21, Planks 22, Sapling 23. Atlas stays within `MAX_LAYERS = 32` (28 after this).
- `js/forge.js` changes stay small and isolated (bucket and sapling use, pick predicate, random-tick hook, palette): endless phase 4 is editing the new-world flow, streaming and the renderer in parallel. No renderer pass changes: leaves and saplings are cut-outs in the existing opaque pass, which already discards texels under alpha 0.5.
- Not touched: campaign/story files, `js/audio.js`, `src/ui/hud*.js`, the world codec and store.
- Baseline to hold: 1,330 unit tests; `tests/forge.spec.js` and `tests/smoke.spec.js` green.

## Generator v2

| Field | Lattice | Drives |
|---|---|---|
| region `g` | ~1,500 blocks, turned | the sea line: archipelago (`g` high) has far more sea, interior (`g` low) little |
| continent `c` | ~420 + 150 blocks, turned | ocean weight `o = 1 − ramp(c, line − 0.08, line + 0.14)`, and inland-ness, which keeps highlands off the coast |
| lakes `k` | ~100 + 40 blocks | bowls up to 6 deep in plains, hills and sand flats; below sea level they fill |
| river `r` | ~260 + 90 blocks, turned | a channel along `r = 0`: `h = min(h, max(bed + K·|r|, h − CUT))`, so banks slope at most `K·max|∇r|` and a river only reaches the sea level in low ground |

Land is v1's four biomes with plains and sand flats lifted a little, so a quarter of the world is not flooded by default; the ocean is a fifth biome whose floor runs 14–27. Heights are weighted as in v1, so a coast is a slope. Water fills every cell above the ground and below `SEA = 30`. Surface dressing: under water sand (rock patches in deep sea); within two blocks of sea level sand three deep (beaches), except highland rock; otherwise v1's rules.

**Trees.** Candidate roots on a jittered grid of 4 × 4-block cells. A hash against a density (biome × a forest-patch field) decides growth; roots need a dry, level, grass (or, for palms and shrubs, sand) cell at or above sea level. Species: broadleaf (plains, hills), pine (highland grass), palm (beaches), shrub (sand flats). Reach ≤ 3.

**Spawn.** `findSpawn` for v2 also needs dry land, no tree over the cell, and stays inside the bounds it is given. A small "home" lift of the continent field around the default spawns keeps the start on land.

## File Structure

| File | Responsibility |
|---|---|
| `src/world/column-gen-v2.js` | **New.** Generator v2: fields, heights, dressing, trees, `findSpawn`, `waterShare` helpers for tests, freeze comment |
| `src/world/column-gen.js` | `GEN_V1`, `GEN_VERSION = 2`, dispatch on `gen.v` in the exported functions; v1 bytes untouched |
| `src/world/trees.js` | **New.** Tree shapes (pure, integer), the write-priority rule, sapling growth on a live world, `randomTick` |
| `src/world/blocks.js` | Log, Leaves, Planks, Sapling; `isCutout`, `isTargetable`; `isSolid` excludes plants |
| `src/world/world.js` | `topSolid` skips water and plants |
| `src/world/world-delta.js`, `world-gen.js` | accept v1 and v2; new worlds v2; spawn inside bounds |
| `src/systems/voxel-glue.js` | the spawn ring skips water |
| `src/rendering/voxel/mesher.js`, `natural-art.js` | cut-out blocks in the opaque buffer; saplings as crossed quads; log, leaves, planks, sapling art |
| `src/rpg/items.js`, `recipes.js`, `gather.js`, `survival-session.js` | wood items, bucket, recipes, gather rules, sapling drops, bucket swap |
| `src/audio/block-sounds.js` | wood and leaves materials |
| `src/ui/forge-inventory.js`, `src/ui/forge-hud.js` | an item's own colour for items with no block (buckets) |
| `js/forge.js` | palette, pick predicate, bucket and sapling use, random-tick hook |
| `tests/unit/column-gen-v2.test.js`, `trees.test.js`, `wood.test.js` and updates | New and updated tests |

---

### Task 1: Blocks and art

- [ ] **Failing tests** (`tests/unit/wood-blocks.test.js`, `world.test.js`, `mesher.test.js`): ids 20–23 with names and kinds; Leaves solid but not opaque; Sapling neither solid nor opaque but targetable; `BLOCKS.length` 24; atlas ≤ 32 layers; leaves go to the opaque buffer with faces between leaves drawn and hidden by stone; a sapling makes four crossed quads in the opaque buffer and nothing else; `topSolid` skips water and saplings.
- [ ] **Implement**, pass. Commit `feat(world): add log, leaves, planks and sapling blocks`.

### Task 2: Generator v2 terrain

- [ ] **Failing tests** (`tests/unit/column-gen-v2.test.js`): determinism and seams (as v1's); v1 goldens unchanged, dispatch by `gen.v`; water only below `SEA` and only above ground, and every air cell there is water; water share over a wide sample ≈ 25% (20–30%), archipelago ≥ 40%, interior ≤ 12%, and regions differ from seed to seed only in place; beaches: ≥ 90% of dry land cells beside water are sand (rest highland rock); slope bound on land as v1's, and on the sea floor; river water reaches the open sea within 400 blocks for ≥ 85% of sampled river cells; spawn on dry level land for 50 seeds, in bounds; banned-math scan covers v2.
- [ ] **Implement** `column-gen-v2.js` and the dispatch; `generateWorld` makes v2; `checkGen` accepts 1 and 2. Measure and tune. Commit `feat(world): generator v2 with seas, beaches, lakes and rivers`.

### Task 3: Trees

- [ ] **Failing tests** (`tests/unit/trees.test.js`): shapes stay within reach 3 and below z = 48; a 96 × 96 area generated column by column in shuffled order equals a whole-area reference that plants every tree once into one array; no tree in water, on rock or on a slope; species by biome; density differs by biome.
- [ ] **Implement** in `trees.js` and v2's `fillColumn`. Commit `feat(world): grow trees in generator v2 under the 3 × 3 rule`.

### Task 4: Wood, saplings, buckets

- [ ] **Failing tests** (`tests/unit/wood.test.js`, `rpg-*.test.js`): items and recipes (planks by hand, bucket and wooden door at a Workbench); gather entries and xp; leaves drop a sapling on a low roll, never on a high one; a grown log pays xp and a placed log does not; `useBucket` round trip; a sapling on grass grows into a tree after enough random ticks with a fixed random source, clears its placed bit, and leaves unrelated cells alone; a sapling cannot be planted on stone; growth is refused where a trunk would hit a block.
- [ ] **Implement**, then wire `js/forge.js`. Commit `feat(forge): chop trees, plant saplings and carry water in buckets`.

### Task 5: Spawn and glue

- [ ] **Failing tests**: `standableNear` never returns a cell in water when dry land is in reach; `world-gen` spawns on dry land for many seeds.
- [ ] **Implement**. Commit `fix(world): keep spawn and ground tests out of water`.

### Task 6: Look, freeze, verify

- [ ] Dev server on 5188, headless Chromium with GPU flags; v2 worlds for three seeds; overhead, perspective, shoreline, river, forest and underwater screenshots into the scratchpad `water-B/`. Iterate until it reads well.
- [ ] Record v2 golden hashes (V8 and JavaScriptCore), write the freeze comment. Commit `test(world): freeze generator v2 behind golden column hashes`.
- [ ] `npx vitest run`; `CC_TEST_PORT=5188 npx playwright test tests/forge.spec.js tests/smoke.spec.js --reporter=line`. Stop the server.
