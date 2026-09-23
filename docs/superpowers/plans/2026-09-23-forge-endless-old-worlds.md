# Forge Endless World: Old Worlds Grow Endless Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any bounded world can become endless, and there is no seam where it does. A world migrated from v4 (a bounded "void" world, all 64 columns stored as deltas) grows generator v2 terrain around its old 128 × 128 area. Within 24 blocks of the old edge a **blend band** feathers the generated surface toward the old edge's own heights, column by column. A bounded world with a seed (phases 2–3 on generator v1, or a Bounded world made since phase 4) simply drops its bounds, because its generator already runs past them. Players can undo the change, and a reload leaves the seam exactly where it was.

**Architecture:** A converted void world gets a new generator kind, `blend`: `{kind: "blend", seed, v: 2, area, edge, caps}`. Inside `area` it makes air, exactly what `void` made, so every saved delta of the old area stays valid byte for byte. Outside `area` it makes generator `v` terrain, with the surface pulled toward the old edge profile (`edge`: the old ground height of every cell on the area's perimeter; `caps`: the block on top of it). The profile is stored in `meta.gen` at conversion, so generating a neighbour never reads an old column. The blend is a separate module, `src/world/column-gen-blend.js`, and `column-gen.js` dispatches `kind: "blend"` to it. It reuses generator v2's exported halves (`sampleColumn`, `fillColumn` without trees, and `plantTrees` / `treeAtCell` through an optional height hook whose default leaves v2's output unchanged). The conversion, `src/world/world-expand.js`, works on the v5 document: encode, change `meta`, decode. The Forge swaps in the result the way it swaps in any other world, keeping the player where they stand.

**Tech Stack:** Vanilla ES modules, WebGL2, Vite, Vitest, Playwright + Chromium with GPU flags.

**Spec:** `docs/superpowers/specs/2026-09-22-forge-endless-world-design.md`: §1, §4, §11, and "Decisions (answered 2026-09-22)" #1. Also `2026-09-23-forge-water-and-vessels-design.md` §C (generator v2, sea level, trees under the 3 × 3 rule). Phase 4 deferred two things, "migrated worlds stay bounded" and "a make-this-world-endless option for worlds made in phases 2–3". This plan does both.

## Decision: explicit, confirmed, reversible (not automatic)

Decision #1 says a v4 world is "given a seed on first open and becomes endless". The seed part already happens on first open (`migrated()` in the codec, phase 3). This plan makes **becoming endless a confirmed action** (Ctrl+B, pressed twice) rather than something that happens automatically on first open. The reasons:

- Old worlds double as play-test levels. Their authors placed spawns, exits and walls assuming the edge is a wall (spec §1). An automatic conversion changes a level's size without the author knowing. They find out only when a play-tester walks off the edge.
- The play-test fallback, the overhead map and the status line all behave differently in an endless world. A player opening an old arena should see what they left.
- A conversion the player chose can be explained at the moment it happens ("the old edge blends into new land"). A silent one cannot.
- Automatic conversion stays a one-line change (`expandWorld` in `_adopt` for void worlds) if the user wants it after trying the explicit action.

**Undo-safe:** a conversion is reversible for good, so it needs no separate backup row. `meta.expandedFrom` keeps the old bounds. Ctrl+B twice on an expanded world puts it back inside them. Anything built outside is kept as saved deltas that a bounded world never loads, and it returns if the world is expanded again. The store writes each version whole in one transaction, so either the bounded version or the endless one is stored, never half of each.

## The blend band

For a cell outside the area, `d` is its distance to the area: straight out from a side (1 for a cell touching it), and round a corner as an octagon (`max + 0.4142 · min`, no square root). A square distance would crease every corner of the band along the diagonal. `G` is generator v2's surface **before rounding** (`surfaceLevel`, a new export whose rounding gives `surfaceHeight` exactly), and `E` is the stored height of the nearest old edge cell:

- `d ≥ BAND (24)`: v2's own height, unchanged.
- else `h = E + (G − E) · smoothstep(w)`, rounded once and clamped to v2's 12..47. Here `w = d / 24`, nudged by up to 3 blocks mid-band by a noise, so that contours wander instead of running parallel to the straight old edge. At `d = 1` the weight is about 0.005, so the first new cell sits at the old edge height. Easing the already-rounded height would round twice and leave one-block bumps all over the band.
- **Sea rules (DYKE = 4).** The sea is at z = 30: every air cell below it over generated ground is water, and water never flows. Water next to the old area's air would be a standing wall of water. So:
  - An edge below 29 (`SEA − 1`; v4 terrain went down to 26) is eased up to 29 across the first 4 blocks and blended from there. A low old world is then ringed by land where the land beyond is dry, rather than by a moat.
  - The ground is at least that eased edge up to `d = 4`, at least 29 up to `d = 5`, and past that the minimum falls one block per block.
  - Nothing at `d < 5` holds water. A step between neighbours changes `d` by at most one, so every water cell has ground at or above 29 beside it, or more water.

  A flat old world at z = 31 slopes from its edge down to beaches and the sea.
- **Dressing.** Generator v2 dresses ground at z ≤ 31 as beach sand, which would ring a flat grass world with a sand seam. Within 6–13 blocks of an edge whose top block was grass, dry beach sand keeps the old grass and dirt. A noise frays that boundary into patches.
- **Trees** use the feathered heights for their root, slope and dressing tests. A tree is not grown if its root is within 4 blocks of the area, measured square. No tree then reaches the old area (reach 3), and none is cut in half at the seam. A palm or shrub is not rooted on sand that the grass rule turned back to grass.
- **Rivers and lakes** are part of `G`. Near the seam they are feathered up with the rest of the ground, and they end at the dyke.
- **The old edge profile** is read once, when the world is converted, from the old columns. For each perimeter cell it takes the top of the natural ground: the run of bedrock, rock, ore, dirt, grass and sand going up from z = 0, so a wall built on the edge does not count. A median of five along the edge removes one- or two-cell pits and spikes. The profile is stored run-length encoded in `meta.gen`: a flat world's profile is two numbers, and a terrain world's is about 2 KB of JSON.

**Phase 2–3 worlds (generator v1), and seeded bounded worlds in general:** the seed generator already runs past the bounds, so converting drops `meta.bounds` and sets `meta.endless`, and nothing is blended. Generator v1 is endless-capable and frozen, so the terrain continues exactly and there is no seam. Its golden tests still hold, and a test compares the continued ground against `surfaceHeight` across the old edge.

## Results (measured 2026-09-23)

Four old-world shapes (flat at 31, flat at 26 below the sea line, v4-like rolling ground 26..37, rugged v1 ground 20..47), five seeds each, with the box and three rings of columns around it loaded:

- Across the seam, the new ground is within **1** block of the old edge everywhere (0 on the flat edge at 31).
- In the band, the worst step outside the highlands is **2** and in them **3**. That is inside generator v2's own bounds of 2 and 4. Steps of 2 are at most 1.2% of pairs, most of them where a low (26) edge climbs to the dyke.
- No water cell has air beside it, and no log or leaf is nearer the old area than 2 blocks.
- Converting and loading the box plus three rings (196 columns) takes 40–90 ms in node. A column in the band costs about twice a plain v2 column.
- The profile of a v4 terrain world is under 2 KB of JSON in `meta.gen`.
- The golden hashes are identical under node (V8) and bun (JavaScriptCore).
- Screenshots are in the scratchpad `old-worlds/`: flat, low and terrain old worlds, before and after conversion, from above the seam, at the corner and at ground level.

## Global Constraints

- Branch off `feat/v0.8.0`. Conventional Commits, no AI attribution. Do not push.
- Generator v1 and v2 outputs do not change: every golden hash stays. `column-gen-v2.js` changes only by optional hooks whose defaults keep its output and one new read-only export (`surfaceLevel`).
- The blend generator is frozen once worlds exist that were saved against it: its own golden hashes land with it.
- Same math rules as v1/v2 (no `Math.sin`/`sqrt`/`pow`…, no sequential RNG). The source scan covers the new file.
- `js/forge.js` changes stay minimal and isolated (Ctrl+B and one method): another agent is working on vessels in the same file.
- Not touched: campaign/story, `src/audio/*`, `js/audio.js`, `src/ui/hud*.js`, the renderer, physics.
- Baseline: 1,436 unit tests; `tests/forge.spec.js` and `tests/smoke.spec.js` green.

## File Structure

| File | Responsibility |
|---|---|
| `src/world/column-gen-blend.js` | **New.** `BAND`, `DYKE`, `feather`, `surfaceHeight`, `sampleColumn`, `fillColumn`, `generateColumn`, `checkBlend` |
| `src/world/column-gen-v2.js` | `surfaceLevel` (unrounded height), `treeAtCell(gen, i, j, topAt?)`, exported `plantTrees(gen, cx, cy, out, treeAt?)`; defaults unchanged, goldens hold |
| `src/world/column-gen.js` | dispatch `kind: "blend"` |
| `src/world/world-delta.js` | `checkGen` accepts blend generators |
| `src/world/world-expand.js` | **New.** `edgeProfile`, `canExpand`, `expandWorld`, `canRestoreBounds`, `restoreBounds` |
| `js/forge.js` | Ctrl+B twice: expand or restore, keeping the player in place |
| `src/ui/forge-hud.js` | help line |
| `tests/unit/column-gen-blend.test.js`, `tests/unit/world-expand.test.js` | **New** |
| `tests/forge.spec.js` | convert, fly past the seam, reload |

---

### Task 1: The blend generator

- [x] **Failing tests** (`column-gen-blend.test.js`): inside the area it is air, like void; at `d ≥ 24` plus tree reach, its columns match v2 byte for byte; `generateColumn = fillColumn(sampleColumn)` and the ground equals `surfaceHeight`; order-independent (shuffled, interleaved with other seeds and profiles); the first band cell is within 2 of the old edge for flat, terrain-like and low (26) edges; slope within the band ≤ 4, ≤ 2 for 99% of pairs outside highlands; water only at `d ≥ 5`, and no water cell has air beside it; no log or leaf within 2 of the area; v1/v2 goldens unchanged; banned-math scan.
- [x] **Implement**; `checkGen` accepts blend. Record golden hashes. Committed with task 2 as `feat(world): grow a bounded world endless with a blend band at its old edge` (the blend tests build their profiles through `expandWorld`).

### Task 2: Converting and restoring

- [x] **Failing tests** (`world-expand.test.js`): the profile reads natural ground under builds and a median removes a one-cell pit; `expandWorld` of a void world gives an endless world with a blend generator, the old area identical cell for cell, `expandedFrom` set; converting twice is the same; a v1 seeded bounded world drops its bounds and keeps generator v1 with no seam across the old edge; round trip through `encodeWorld`/`decodeWorld` and `WorldStore` with the seam identical after reload; `restoreBounds` gives the bounded world back with the same old area, keeps edits made outside, and re-expanding brings them back.
- [x] **Implement.** See task 1.

### Task 3: The Forge

- [x] **Failing tests** (`forge-endless.test.js`): Ctrl+B once asks and changes nothing; twice converts, keeps the player's position and saves at once, and the saved world reloads endless; the question lapses with its notice; Ctrl+B twice again restores; a world born endless answers with a notice.
- [x] **Implement**, HUD help line. Commit `feat(forge): make a bounded world endless, or bounded again, with Ctrl+B twice`.

### Task 4: Verify in the browser

- [x] e2e: a v4 void world with a build on the edge opens bounded, then Ctrl+B twice. Fly past the seam and save. After a reload the build is intact, the seam heights are unchanged and the world is endless.
- [x] Screenshots (GPU flags) before and after conversion, from above the seam and at ground level, into the scratchpad `old-worlds/`. Iterate on the look.
- [x] `npx vitest run`; `CC_TEST_PORT=5190 npx playwright test tests/forge.spec.js tests/smoke.spec.js`.
