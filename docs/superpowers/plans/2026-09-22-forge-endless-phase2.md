# Forge Endless World, Phase 2: Generation Per Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make terrain a pure function of a stored seed and a column's coordinates — `generateColumn(gen, cx, cy)` with hashed, non-repeating noise, per-cell ore and four blended environment variants — store `meta.gen = {kind, seed, v}` in every new world, and freeze generator version 1 behind golden hashes. New worlds are still the bounded 128 box, still generated whole (by calling `generateColumn` for each of its 64 columns) and still saved as v4.

**Architecture:** A new module, `src/world/column-gen.js`, owns generation. Noise is value noise whose lattice points are a 32-bit multiply-xorshift hash of `(salt, i, j)` (`Math.imul`), so nothing wraps; each noise layer has its own salt derived from the seed. Generation is split in two: `sampleColumn` computes an 18 × 18 grid of surface heights (the column plus a one-cell ring, for slopes at its edge) and a 16 × 16 surface biome; `fillColumn` writes blocks from that sample. `generateColumn` is the two in a row. `generateWorld` loops over the bounded box's columns, writes straight into `World` columns, stores `meta.gen`, and picks a walkable spawn with `findSpawn`, which reads only `surfaceHeight`.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium with GPU flags (e2e and screenshots).

**Spec:** `docs/superpowers/specs/2026-09-22-forge-endless-world-design.md`, "Delivery in phases", phase 2; §4; Testing, "Generator". The "Decisions (answered 2026-09-22)" section overrides the body. Decision #3 applies here: version 1 gets environment variants and a wider height range before it is frozen, so §4's "same two octaves … clamped to 26..38 … a new world looks like an old one" and the non-goal "biomes" are superseded. Decision #1 shapes the API (below) but is not implemented.

## Global Constraints

- Branch off `feat/v0.8.0`. Never commit to `master`. Conventional Commits, no AI attribution.
- The generator uses only `+ − × ÷`, `Math.floor`, `Math.round`, `Math.abs`, `Math.min`, `Math.max`, `Math.imul` and bit operations. No `Math.sin`/`cos`/`exp`/`pow`/`sqrt`/`log`/`random`, no sequential RNG, no state carried between cells or columns except a per-seed salt cache.
- Signature is the spec's `generateColumn(gen, cx, cy, out?)`; `gen` first, as `meta.gen` is passed straight through.
- Storage, codec, store and streaming do not change. v4 carries `meta.gen` because it already clones `meta` whole.
- Flat worlds keep today's bytes exactly: grass at 31, four dirt, rock, bedrock, no ore, spawn (64.5, 64.5, 32).
- Seeds are unsigned 32-bit, from `crypto.getRandomValues` at every Forge call site (today they are `Date.now()`, which does not fit).
- One column costs well under a millisecond; target is within a few times the old 0.05 ms (spec §6).
- Out of scope: trees and structures (spec §4's 3 × 3 feature rule is for later), water, caves, v5, deltas, streaming, the Endless/Bounded choice in the new-world flow (decision #2), the blend band itself (decision #1).
- Baseline to hold: 1,177 unit tests across 79 files; `tests/forge.spec.js` and `tests/smoke.spec.js` green.

## Environment variants (decision #3)

Two low-frequency fields, each value noise at 112–136 cells plus a 0.2-weight octave at 44–52 cells to fray the outlines:

| Field | Drives |
|---|---|
| ruggedness `r` | plains → rolling hills → rocky highlands, by two smoothstep ramps |
| dryness `d` | only on the flat end of `r`: plains → sand flats |

Each biome has its own height expression; the surface height is their weighted sum. Weights are smoothsteps of smooth fields and sum to 1, so the blended height is continuous everywhere and a biome border is a slope, never a step.

| Biome | Height (around GROUND = 32) | Surface |
|---|---|---|
| plains | `32 + detail × 4` (today's two octaves, 24 and 9 cells, 0.7 / 0.3) | grass, four dirt; sand at z ≤ 29, as today's beaches |
| rolling hills | `36 + big × 9 + detail × 2.5` (`big` at 52 cells) | as plains |
| rocky highlands | `34 + big × 4 + ridge² × 13 × w + detail × 1.5`, ridged noise `1 − |n|`, plus tors `w² × 8 × max(0, n₇ − 0.4)` | bare rock where steep (Δ ≥ 2) or at z ≥ 41, else grass over two dirt |
| sand flats | `29 + detail × 1.5` | sand four deep |

The highland crags and tors are weighted by the highland weight a second time (`w`, `w²`), so they only rise where the highlands are established and the border into hills stays walkable. Heights above 42 are halved rather than clamped, then held to 20..47: z ≥ 48 is always open air, which the Forge e2e sight lines at z = 48–49 rely on, and only about 0.02% of cells reach the 47 lid. Measured over six seeds the tops run 26..47 (old: 26..37).

Value noise creases along its grid, which showed as long straight borders on the first look. So the low-frequency fields and the main octaves are sampled on turned lattices using integer maps: `(3x − 4y, 4x + 3y)` (×5, about 53°) for ruggedness, `big`, the ridge and the border jitter; `(5x + 12y, 12x − 5y)` (×13, about 67° mirrored) for dryness and the 24-cell detail. The surface block is the heaviest weight after jitter noise at 5 and 16 cells, so borders fray into lobes and drifts.

**Slope bound, as tested:** between 4-neighbours, |Δ top| ≤ 2 everywhere outside the highlands, and |Δ top| ≤ 1 for at least 99% of those pairs (a one-block step is walkable with the Forge's step-up; the jump clears 1.5). Inside the highlands (weight ≥ 0.5) |Δ top| ≤ 4: tors and crags are the intended rocky feature. Measured over 12 seeds: outside the highlands 0.04% of pairs step 2 and none more; inside, 1% step 2 and 0.03% step 3.

## Decision #1: room for a blend band

`sampleColumn` returns heights before any block exists, and `fillColumn` derives layering, slope rock and ore only from those heights and the biome grid. A later blend band feathers `sample.top` toward an old world's edge heights over 24 blocks and then calls `fillColumn`; nothing in this phase needs to change for it. `surfaceHeight(gen, x, y)` gives a single cell's generated height without a column, which is what the band needs at its outer edge and what spawn needs in an endless world.

## Review Focus

1. **Determinism.** No engine-dependent math, no order dependence, no shared state that leaks between seeds (the salt cache is keyed on the seed). *(Task 1)*
2. **Seams.** Slope-based rock reads the padded ring, so the same cell dresses the same whichever column computes it. *(Task 1)*
3. **Golden bytes.** Recorded once, after the look is signed off, and never re-recorded. *(Task 3)*
4. **Flat worlds unchanged.** Same cells as before, only `meta.gen` added. *(Task 2)*

---

## File Structure

| File | Responsibility |
|---|---|
| `src/world/column-gen.js` | **New.** Hash, noise, biome weights, `surfaceHeight`, `sampleColumn`, `fillColumn`, `generateColumn`, `findSpawn`, `GEN_VERSION` and the freeze comment |
| `src/world/world-gen.js` | `generateWorld` fills columns through `generateColumn`, stores `meta.gen`; `randomSeed()` |
| `js/forge.js` | New worlds get `randomSeed()` instead of `Date.now()` |
| `js/game.js` | Renders the world the Forge currently holds (found during the visual check) |
| `tests/unit/column-gen.test.js` | **New.** Generator tests and golden hashes |
| `tests/unit/world-gen.test.js`, `tests/unit/world-codec.test.js`, `tests/unit/forge-rules.test.js`, `tests/forge.spec.js` | Updated for the new terrain and `meta.gen`; Ctrl+N e2e |

---

### Task 1: The column generator

**Files:**
- Create: `src/world/column-gen.js`, `tests/unit/column-gen.test.js`

- [ ] **Step 1: Write the failing tests** — `column-gen.test.js`:
  - determinism: a column generated twice, and after 100 others with other seeds in between, is byte-identical.
  - seams: a column's top at each edge cell equals `surfaceHeight` for that cell; slope rock on both sides of a border agrees with a whole-grid reference.
  - seeds: two seeds give different columns; seed `2³² + 7` equals seed 7.
  - no repetition: columns at offsets of 384, 1,152 and 100,000 blocks differ; the surface's autocorrelation at lags 16, 144, 384 and 1,152 blocks (the old lattice's periods) is not near 1.
  - biome coverage: over 4,096 cells spread across ±50,000 blocks, each of the four biomes is dominant somewhere, and none takes more than 60%.
  - slope bound as above, over a 384 × 384 area for three seeds, near and far from the origin.
  - height range: tops within 20..`MAX_TOP` = 47, reaching 47 and going at least as low as 27.
  - ore: 2% ± 0.3% of rock-or-ore cells above z = 2; none in flat worlds.
  - layering: bedrock at 0; grass/sand/rock caps; no floating blocks (every column solid from 0 to its top).
  - flat and void generators.
  - `findSpawn`: for 50 seeds, the spawn's 3 × 3 is within one block and its z is the first air cell.
  - source scan: no `Math.sin`, `cos`, `tan`, `exp`, `pow`, `sqrt`, `log`, `random`, `hypot` or `**` in the module.
- [ ] **Step 2:** `npx vitest run tests/unit/column-gen.test.js` — fails (module missing).
- [ ] **Step 3: Implement** the module as described under Architecture.
- [ ] **Step 4:** Tests pass. Commit `feat(world): generate terrain per column from hashed noise and biomes`.

### Task 2: generateWorld through columns, meta.gen, seeds

**Files:**
- Modify: `src/world/world-gen.js`, `js/forge.js`
- Test: `tests/unit/world-gen.test.js`, `tests/unit/world-codec.test.js`, `tests/unit/forge-rules.test.js`

- [ ] **Step 1: Failing tests.** `generateWorld` stores `meta.gen = {kind, seed, v: 1}`; its every column equals `generateColumn(meta.gen, cx, cy)`; `meta.gen` survives `encodeWorld`/`decodeWorld` and regenerates identical terrain; a flat world's cells are byte-identical to the pre-phase-2 hash; spawn is walkable and inside the bounds; `randomSeed()` is an unsigned 32-bit integer.
- [ ] **Step 2: Implement.** Loop the box's columns, write through `ensureColumn(cx, cy).blocks`. `meta.spawn = findSpawn(gen, centre)`. Forge call sites use `randomSeed()`.
- [ ] **Step 3:** Update tests pinned to the old terrain: the 26..38 range, the old terrain golden hashes (flat keeps a cells-only hash), the forge undo test that edits at z = 40 (move to z = 60), and the e2e buried-spawn test built at z = 40–42 (move to z = 50–52), both now inside the highest terrain.
- [ ] **Step 4:** `npx vitest run` green. Commit `feat(forge): store generator settings and a random seed in new worlds`.

### Task 3: Look, measure, freeze

- [ ] **Step 1: Benchmark** in node (scratch script outside the repo): median ms per column over 1,600 columns ×15 runs, and a whole 128 × 128 `generateWorld`. Before: 0.05 ms a column, 3.3 ms a world. After: 0.086 ms a column (0.06 sampling heights and biomes, 0.035 filling blocks and ore), 5.7 ms a world — inside spec §6's "a few times that at most", about 1.7 ms a second at the 20 columns a second of a noclip flight.
- [ ] **Step 2: Visual check.** `npx vite --port 5184 --strictPort` in the background; headless Chromium with `--use-gl=angle --use-angle=metal --enable-gpu`; `ccDebug.startBuilder()`, then a terrain world for three seeds; noclip high; overhead and perspective screenshots. Iterate on the constants until no biome reads as flat, noisy or cliffy.
  - Found on the way: the Forge swaps `builder.world` on Ctrl+N, world switch, delete and import, but the host kept rendering its own `game.world`, so a new world was never drawn until the Forge was re-entered. `Game.update` re-reads `builder.world` each Forge frame; a real-key e2e test ("a world made with Ctrl+N is the one drawn") fails without it.
- [ ] **Step 3: Golden hashes.** Record SHA-256 of fixed columns (near origin, negative, at 100,000 blocks, at the ±2²⁰ border, and one column wholly inside each biome) for three seeds, of a whole `generateWorld` terrain world's blocks, and of a flat column; check they are identical under V8 (node) and JavaScriptCore (bun); add them to `column-gen.test.js`. Write the freeze into the comment next to `GEN_VERSION`.
- [ ] **Step 4:** `npx vitest run`; `CC_TEST_PORT=5184 npx playwright test tests/forge.spec.js tests/smoke.spec.js --reporter=line`. Stop the server. Commit `test(world): freeze generator v1 behind golden column hashes`.
