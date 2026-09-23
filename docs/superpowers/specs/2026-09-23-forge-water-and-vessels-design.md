# Forge Water and Vessels — Seas, Swimming, and Boats

Date: 2026-09-23
Status: Draft for review
A Forge sub-project spec of its own, beside the endless-world spec
(`2026-09-22-forge-endless-world-design.md`). It adds terrain content that the
endless-world spec listed as a non-goal, so it is sequenced around that work
rather than folded into it.

## Goal

Put water in the Forge and give the player reasons and ways to cross it: swim
in it, find seas, lakes and beaches in new worlds, cut wood from trees, and
build rafts, boats and jetskis to explore.

The request, in the user's words: "please also add water / ocean terrains -
i'd love to be able to swim / build boats, jetskis, etc to explore the water".

Success looks like:

- In creative you pick Water from the palette, place it, and a pool looks like
  water: see-through where it is shallow, darker where it is deep, a surface
  that moves, ink outlines at the shore that match the rest of the Forge.
- You walk into it and swim. Space takes you up, the crouch key takes you down,
  you sink slowly if you do nothing, you move more slowly than on land, and you
  can climb out onto a bank one block above the water.
- With your head under water the view turns blue-green and hazy, and it clears
  the moment you surface.
- Entering, leaving and swimming each have a sound.
- A new world has sea: ocean basins, sand beaches at the shoreline, lakes in
  low ground, and trees. Every world made before this change is untouched.
- You chop a tree, make planks, build a boat at a Workbench, push it into the
  water, get in, and steer it along the coast. A jetski is faster, leaves a
  wake, and hops small waves.

## Decisions taken before this spec

| Question | Decision |
|---|---|
| Existing worlds | Generator version 1 is frozen. Seas, beaches, lakes and trees are generator version 2; v1 worlds never change. |
| Where boats get their wood | There is no wood in the game today, so trees and wood items arrive with generator v2, before boats. |
| Drowning | There is no player health in Forge survival, so there is no drowning. Breath is future work. |
| How much at once | Four phases (below). This spec's first phase is built now; the rest wait for review. |

## Current state

Facts checked against the code on `feat/v0.8.0` at `f0d88bf`.

**Blocks.** `src/world/blocks.js` has 19 blocks, ids 0–18, appended only.
`isSolid` (`:38`) is "anything that is not air", which today means every block
is solid to physics. `isOpaque` (`:40`) is solid and of kind `"solid"`; glass
and doors are see-through. Block ids are single bytes in every save format
(v4 RLE, the phase-3 v5 overlays, where `0xFF` means "as generated"), so a new
id below 255 needs no codec change.

**Meshing.** The greedy mesher (`src/rendering/voxel/mesher.js`) sends every
face of a non-opaque block to an `alpha` buffer (`:152`). A see-through face
is hidden only by its own kind (`:107`): glass meets glass without an inner
face. Every face is culled from the back (`voxel-renderer.js:494`).

**Rendering.** One chunk shader (`shaders.js`, `CHUNK_VERT`/`CHUNK_FRAG`)
draws opaque faces, then sprites, then the see-through faces with blending,
back to front by chunk and without writing depth (`voxel-renderer.js:530–547`).
Glass opacity is a per-layer uniform, `GLASS_ALPHA = 0.42` (`:55`, `:342`). The
comic ink pass finds edges in a linear-depth target and in a face id stored in
the colour target's alpha (`POST_FRAG`). The alpha pass blends into that
alpha. There is no time uniform anywhere: nothing in the voxel world moves.
The atlas uses 22 of `MAX_LAYERS = 32` layers (`voxel-renderer.js:28`), each
256 × 256, painted procedurally for natural blocks (`natural-art.js`).

**Physics.** `moveAABB` (`voxel-physics.js:122`) is an axis-separated swept
box with a one-block step-up for a body standing on something. The Forge
player (`js/forge.js:842–862`) jumps at `PLAYER.jump = 8.5` under
`PLAYER.gravity = 24`, which clears 1.5 blocks. `raycastBlocks` (`:161`) stops
at the first solid block. The Forge has no crouch; `Control` is "down" in
noclip (`js/forge.js:827`), and the campaign's `crouch` keybind is `ControlLeft`
(`js/input-manager.js:44`).

**Placement.** `placementAllowed` (`js/forge.js:72`) refuses any cell that is
not air. The creative palette is `PLACEABLE_BLOCKS` (`:38`), ids 1–14; digits
pick blocks 1–9 and `0` cycles the natural set `NATURAL_BLOCKS` (`:40`).

**Sound.** `src/audio/block-sounds.js` maps block id to a material (`:10`) and
plays place, hit and break recipes through the `AudioManager`'s `playNoise`
and `playTone`. There are no movement sounds in the Forge.

**Generation.** `src/world/column-gen.js` is generator v1, frozen
(`GEN_VERSION = 1`, `:31`) behind golden hashes. Heights run 20..47 with four
blended biomes: plains, hills, highlands, sand flats. Low plains already turn
to sand at `z ≤ 29` (`:233`). There is a "3 × 3 rule" for features in the
endless-world spec §4 but no feature uses it yet. `World.topSolid`
(`world.js:231`) and the spawn search in `voxel-glue.js:85` treat any non-air
block as ground.

**RPG.** `src/rpg/items.js` has 17 blocks and two pickaxes; nothing made of
wood. Recipes (`src/rpg/recipes.js`) are tiered by station: hand, Workbench,
Anvil, Forge. `gather.js` pays mining xp per block id.

**Tests.** 1,203 unit tests across 80 files; `tests/forge.spec.js` and
`tests/smoke.spec.js` for the Forge in a GPU browser. One generator test
(`column-gen.test.js`, height range) runs close to its 5 s timeout when the
machine is busy.

## Scope

This spec: a water block and how it looks, swimming, water sounds, generator
v2 (seas, beaches, lakes, trees, and rivers if the look check allows), wood,
vessels as a small entity system, their recipes, a bucket, and how vessels are
saved. Flowing water and breath are described as a later phase.

## Design

### A. Water

**One block.** `Water`, id 19, kind `"water"`, hardness 0, no emissive. It is
a source block: it stays exactly where it is put. There is no flow simulation
in this spec (see Phase D), which keeps water deterministic, cheap, and free of
the "one bucket floods a world" class of bug.

`isSolid(19)` is false: bodies, rays and projectiles pass through it. A new
`isWater(id)` answers the question directly. `isOpaque` is false.

**The surface sits at 7/8 of the cell** (`WATER_SURFACE = 0.875`), as in
Minecraft. The top face of a water cell with air above is drawn there, and the
same number decides whether a point is under water for physics and for the
camera, so the view never turns blue while the surface is still visibly above
the eye. A water cell with water or a solid block above is full to the top.

**Meshing.** Water gets its own buffer beside `opaque` and `alpha`:

- A water face is hidden by water and by any opaque block. So a lake has no
  inner faces and no faces against its bed; the bed's own faces are drawn.
- A water face against air or a see-through block is drawn.
- Water carries no ambient occlusion. The vertex's AO byte instead flags the
  corners that sit on the surface, and the vertex shader lowers those by 1/8.
  Flags differ between a surface cell and the cell below it, so greedy merging
  stops there and the lowering is exact.

A separate buffer, not the glass bucket, because water is drawn differently:
from both sides (you see the underside of the surface when you dive), in its
own pass, with its own blending.

**Drawing.** After opaque faces and sprites, before glass:

1. Copy the linear-depth target (what lies behind the water) into a spare
   texture, only when a water chunk is on screen.
2. Depth pre-pass: water writes depth and its own surface distance to the
   linear-depth target, with no colour. Only the nearest water surface per
   pixel survives, so a pool seen through its own side face is blended once.
3. Colour pass: water blends over the scene where its depth matches. Face
   culling is off, so the surface is visible from below.
4. Id pass: water writes a face id of its own into the colour alpha, so the
   comic ink pass outlines the shoreline and the water's silhouette instead
   of the lake bed's blocks through the water.

**How it looks.** The fragment shader reads the thickness of water in front of
whatever is behind it (step 1's copy minus the surface distance) and uses it
for both opacity and colour: clear and pale teal at the shore, opaque and deep
blue a few blocks down. A procedural ripple texture in the atlas (one layer,
`nat:water`, 23 of 32) is sampled twice, scrolling two ways with a time
uniform, for a moving shimmer; bright bands where the two agree read as
cel-shaded glints rather than a realistic specular. Grazing angles are more
opaque than looking straight down. The underside, seen from below, is a bright
wavering ceiling.

**Under water.** When the eye is below the surface, the renderer swaps the fog
for a dense blue-green one, clears the sky to it, and the post pass tints the
frame and wobbles it slightly. No state is kept: the renderer decides it each
frame from the world and the camera.

**Placing it.** Creative: Water joins the palette and the `0` natural cycle.
Blocks may be placed into water as well as air, replacing it. While Water is
held, the pick ray stops on water too, so you can raise a lake one layer
(place on its surface) or remove water (break it). Survival: water cannot be
targeted or placed without a Bucket, which is Phase C, because survival has no
source of water to scoop until generator v2 exists.

### B. Swimming

Pure functions in `src/world/voxel-physics.js`, so they are unit tested and
shared by anything that swims later:

- `submersion(world, x, y, z, height)` — how much of a body is under water,
  0..1, sampled at the body's centre column against the 7/8 surface.
- `eyeInWater(world, x, y, z)` — the camera test.
- `swimStep(velZ, state, input, dt)` — the new vertical velocity, and
  `swimSpeedScale(sub)` for horizontal speed.

Rules, with numbers to tune in the look pass:

| Situation | Behaviour |
|---|---|
| Less than a third submerged (wading) | Normal gravity and jumping; move speed eases from 100% down to 55% as the water rises. |
| Swimming, no input | Sink slowly toward −1.2 blocks/s. |
| Swimming, Space | Rise toward +3.5 blocks/s until chest-deep, then hold there: you float with your head out. |
| Swimming, crouch key | Dive toward −4 blocks/s. |
| Falling in | Water drag bleeds off the fall within a few frames; a splash sound scales with speed. |
| Swimming, Space, pressed against a wall | A kick upward at jump speed each frame, so you climb out onto a bank one block above the water surface, and not two. |
| Standing on the bed | Space swims up rather than jumping. |
| Move speed | 55% of walking. |

The crouch key is the campaign's `crouch` keybind (`ControlLeft` by default),
plus `ControlRight`, matching noclip's "down".

**No drowning.** There is no health in Forge survival, so staying under costs
nothing. Breath (a bubble meter and, once there is health, damage) is Phase D.

**Sounds.** `block-sounds.js` gains a `water` material (place: a gloop; break:
a scoop) and `playWaterSound(audio, kind, strength)` for `enter` (a splash
scaled by fall speed), `exit` (drips), `stroke` (a soft swish every ~0.6 s
while swimming and moving) and `dive`. Same primitives as the block sounds,
same small pitch variation. A small pure tracker decides when each fires from
the previous and current submersion, so the Forge only feeds it state.

### C. Generator version 2

`GEN_VERSION` becomes 2 for new worlds; `generateColumn` dispatches on
`gen.v`, and version 1's code path and golden hashes are left exactly as they
are. Version 2 starts as a copy of version 1's sampling and adds:

- **Sea level** `SEA = 30`: every air cell at `z < SEA` above generated ground
  is water. One global water level keeps every water cell a pure function of
  the column's own heights: nothing depends on a neighbour.
- **Ocean basins.** A very low-frequency "continent" field (~400-block
  lattice, turned like v1's) pulls heights down to 14..26 where it is low,
  weighted in smoothly like the other biomes, so a coast is a slope, not a
  cliff. A fifth biome, `ocean`, dresses the floor with sand and gravel-like
  rock. Target: roughly a quarter of the surface under water.
- **Beaches.** Surface cells within two blocks of sea level that are not
  highland rock become sand, three deep. The v1 rule "sand below 30" becomes
  "sand near the sea".
- **Lakes.** A second, medium field (~90 blocks) digs bowl-shaped depressions
  in plains and hills; where a bowl dips below sea level it fills. Lakes above
  sea level would need a level per lake and are left out.
- **Rivers — recommended, yes.** A ridged-noise channel pulled down to 2–3
  blocks under sea level where the land is low (plains, hills), fading out
  where it would cut highlands. With one sea level, rivers join lakes to the
  sea and give boats somewhere to go. They ship in v2 only if the slope-bound
  tests (below) still pass; otherwise they are v3.
- **Trees.** New blocks `Log` (id 20, top and bark faces) and `Leaves` (id 21,
  see-through cutout, hides only its own kind). Three shapes by biome: a
  round broadleaf in plains and hills, a tall narrow conifer in highlands
  below the rock line, and none on sand, in water, on rock or on slopes.
  Each column has candidate roots on a jittered 4 × 4 grid of 4 × 4-block
  cells; a hash and a biome density decide whether each grows. **A column
  evaluates every root in itself and its eight neighbours and writes only the
  blocks that fall inside itself** (endless-world spec §4). A tree reaches at
  most 3 blocks from its root, far inside the 15-block limit. Its base height
  is `surfaceHeight` at the root, which is a pure function, so both sides of a
  column border agree without either writing into the other. Leaves never
  replace terrain or water; a trunk never starts below sea level.
- **Spawn** never lands on or in water: `findSpawn` for v2 also requires the
  cell to be above sea level, and `World.topSolid` and the spawn ring search
  in `voxel-glue.js` learn to skip water (they count it as ground today).

When the look is signed off, version 2 is frozen behind golden hashes in the
same way as version 1, with the same order-independence, seam and source-scan
tests.

**New items for wood:** `log` and `planks` (block `Planks`, id 22). Chopping a
log by hand works; a future axe is noted, not built. `gather.js` gains entries
for the three new blocks (leaves drop nothing, or occasionally a sapling, an
open question). Atlas after phase B: water 1, log 2, leaves 1, planks 1 → 27 of
32 layers.

### D. Vessels

**An entity system for the Forge.** `src/world/vessels.js` holds pure vessel
physics and a list `world.vessels` of `{id, kind, x, y, z, yaw, vx, vy}`. The
Forge updates them each frame and draws them. It is deliberately not the
play-test enemy system, which lives in the campaign's entity code and would
drag combat along.

| Kind | Built from | Top speed | Handling |
|---|---|---|---|
| Raft | 6 logs, by hand | 3.5 blocks/s | slow, turns slowly, very stable; the earliest way across a lake |
| Boat | 8 planks + 1 metal, at a Workbench | 6 blocks/s | stable, holds 1 |
| Jetski | 8 metal + 2 energy cells + 2 tech plates, at a Forge | 13 blocks/s | fast, drifts on turns, leaves a spray wake, Space hops it a block clear of the water and over small swells and shore steps |

**Riding.** `B` (for "board") mounts the nearest vessel within 2.5 blocks and
dismounts onto the nearest free standable cell. While mounted, W/S are throttle
and reverse, A/D steer, the mouse still looks around, and the camera sits at
the seat. A vessel floats at the water surface with a slight bob and roll;
it collides with the shore through `moveAABB` using its own box, so it stops
at a beach and cannot climb a bank. On land a raft and a boat do not move
under their own power; a jetski crawls at 1 block/s so it can be nudged back
into the water. Out of water, a vessel falls under gravity like anything else.

**Drawing.** Vessels are small voxel models (for example a boat is 3 × 5 × 2
cells of planks), meshed once with the chunk mesher into a dynamic mesh and
drawn with a model matrix uniform in place of the chunk origin. That reuses the
atlas, the lighting and the ink outline with no new art pipeline. Billboards
were considered and rejected: you sit in a boat, and a flat sprite seen from
inside it falls apart. The jetski's wake is the renderer's existing additive
`fx` billboards.

**Creative and survival.** Creative: a vessel tool in the palette (after the
blocks) places a vessel on the targeted water or ground. Survival: vessels are
items crafted as above; placing one spends the item; breaking a vessel (hold
the break button on it) returns the item. Items `raft`, `boat`, `jetski`,
`bucket` and `bucket_water` are added; the bucket is 3 metal at a Workbench,
scoops a water source (the cell becomes air, the bucket becomes
`bucket_water`) and pours it back.

**Saving.** Vessels are world state, few in number and owned by the player:
they ride in `meta.vessels`, which both the v4 document and the phase-3 v5
world row carry whole. The hook for phase 3: the v5 row's `meta` must keep
unknown keys (it clones `meta` today), and nothing else is needed. If phase 4
finds meta growing with thousands of vessels, the per-column entry
`[cx, cy, overlay, placed?]` gains an optional fifth element, an entity list,
without a version bump; the decision can wait until there is a measurement.
In an endless world a vessel in an unloaded column is frozen and not drawn,
the same rule as enemies (endless-world spec §16).

### E. Delivery in phases

Each phase lands with the full unit suite and the Forge e2e green.

**Phase A — water, drawing, swimming, sounds (built with this spec).** Block
19, the atlas layer, the water buffer and pass, the underwater view, swimming,
creative placement, water sounds. No generator change, no save change, no new
survival content. Touches `blocks.js`, the mesher, renderer and shaders,
`voxel-physics.js`, `block-sounds.js`, and a few isolated lines of
`js/forge.js` (palette, placement rule, swim input). Nothing that endless
phase 3 touches.

**Phase B — generator v2 and wood.** Sea, basins, beaches, lakes, rivers (if
they pass), trees, `Log`/`Leaves`/`Planks`, the wood items and hand recipes,
the spawn and `topSolid` water fixes, the v2 freeze. The new-world flow keeps
its Terrain/Flat choice; terrain means v2.

**Phase C — vessels, recipes, bucket.** The vessel entity system, the three
vessels, riding, their models, recipes, the bucket, `meta.vessels`.

**Phase D — later.** Flowing water (a water level per cell needs 7 more block
ids or a per-cell level byte; spreads a few cells a tick, from sources only,
and settles), breath and drowning once Forge survival has health, fishing,
underwater plants, lakes above sea level, waves that move vessels.

**Merge order with the endless-world phases.**

- Phase A is independent of endless phase 3 (codec, store, autosave, placed
  flags) and may merge before or after it; the only shared file is
  `js/forge.js`, in regions phase 3 does not touch.
- Phase A must merge **before endless phase 4** starts its renderer work.
  Phase 4 moves to camera-relative chunk origins; the water pass sends the same
  `u_origin` and must move with it, and the water shimmer reads world
  coordinates, which phase 4 must supply as a separate world-offset uniform
  (or the pattern will swim when origins shift). Phase 4's streamer also meshes
  a third buffer per chunk.
- Phase B needs `meta.gen.v` dispatch, which exists, and should merge after
  endless phase 3, so v5 deltas are proved on v1 before a second generator
  version exists. New endless worlds in phase 4 are created as v2.
- Phase C needs phase 3's v5 meta to carry `meta.vessels`, so it merges after
  phase 3.
- Phase B and phase 4 both edit `World.topSolid` and `voxel-glue.js`'s spawn
  search; whichever lands second rebases the water check onto the other.

## Non-goals

- Flowing, spreading or draining water; tides; waves that move bodies.
- Drowning, breath, or any player health.
- Water in campaign or arena levels. Play-test enemies walk on the bed and do
  not swim.
- Lakes above sea level, waterfalls, underwater caves.
- Multiplayer vessels, passengers, towing, or vessel damage.
- A new art style for water per act; the palette's fog colours tint it.

## Risks

- **Transparency order.** Water writes depth in its own pass, so glass behind
  a water surface (an underwater window seen from above) is hidden rather than
  blended. Glass in front of water, the common case of a window over the sea,
  is correct. Accepted for now; order-independent transparency is not worth it.
- **Four draws per water chunk and a copy per frame.** Water meshes are tiny
  (a flat lake is one quad per chunk face), so the draws are cheap; the copy is
  one full-screen blit, skipped when no water chunk is visible. The perf-budget
  spec should gain a view over a large lake in phase B.
- **Swimming numbers are feel.** They are unit tested for behaviour (sinks,
  rises, climbs a 1-block bank but not a 2-block one), and tuned by playing.
- **Generator v2 is a new frozen artefact.** Every v1 rule applies: no
  engine-dependent maths, no order dependence, golden hashes recorded once.
  Trees are the first feature that reads neighbouring columns' roots; the seam
  test must cover a tree straddling every border, including negative ones.
- **The 32-layer atlas.** Phase A takes 23, phase B 27. Vessels reuse layers.
  More block art after that needs the layer count raised in the shader.
- **Phase 4 conflicts** in `voxel-renderer.js` if phase A is not merged first.

## Testing

Unit (vitest, `tests/unit`):

- **Blocks:** Water is id 19, non-solid, not opaque, `isWater`; ids stay
  append-only; the atlas gives it a layer and stays within 32.
- **Mesher:** water faces are hidden against water and opaque blocks and drawn
  against air and glass; they go to the water buffer, never opaque or alpha;
  a solid block's face against water is drawn; surface corners are flagged and
  corners under more water are not; a flat pool merges into one top quad.
- **Physics:** `submersion` at, above and below the surface; a body in deep
  water sinks slowly; Space rises and then floats with the head out; the crouch
  key dives; move speed is reduced when swimming and eases while wading; a
  swimmer against a bank one block above the water climbs out onto it; a bank
  two blocks up does not let them out; falling into water loses speed quickly;
  wading keeps normal jumping.
- **Sound tracker:** enter fires once on the transition in, scaled by speed;
  exit fires once on the way out; strokes are rate-limited; nothing fires on
  dry land.
- **Placement:** blocks may be placed into water; water may be placed where
  the player stands; the ray targets water only when asked to.
- **Generator v2 (phase B):** golden hashes; v1 hashes unchanged; water only
  below sea level and only above ground; beaches are sand; trees never cross a
  seam differently from the two sides; no tree in water or on sand; slope bound
  still holds with rivers; spawn is dry land.
- **Vessels (phase C):** float at the surface; stop at the shore; land
  behaviour per kind; mount and dismount put the player somewhere free;
  `meta.vessels` round-trips through the codec.

End-to-end (`tests/forge.spec.js`, GPU flags, real keys): the Forge and smoke
suites stay green in phase A. Phase B adds "a new world has water near spawn
within N blocks"; phase C adds "craft a boat, place it, board with `B`, steer
with W".

Visual: headless Chromium with `--use-gl=angle --use-angle=metal
--enable-gpu`, a pool built through `ccDebug.setBlock`, screenshots above the
water, at the surface and submerged, looked at before any phase is called done.

## Open questions for the user

1. **Mount key.** `B` for "board" is free in the Forge. `E` would match the
   campaign's "interact", but in the Forge it moves the overhead cursor.
   Keep `B`?
2. **Rivers in v2** — recommended yes (sea-level channels joining lakes to the
   sea). Worth the extra generator risk, or ship v2 without them?
3. **How much sea.** The default aims at about a quarter of the surface under
   water, with basins 5–15 blocks deep. More ocean (a Minecraft-like half)
   makes boats matter more and land scarcer.
4. **Bucket in survival** is placed in Phase C, with the vessels. Would you
   rather have it in Phase B, as soon as there is sea to scoop from?
5. **Jetski recipe.** 8 metal, 2 energy cells, 2 tech plates at a Forge makes
   it a late-game item (Forge is construction level 15). Right tier?
6. **Saplings.** Should leaves sometimes drop a sapling you can plant, so wood
   is renewable, or are trees a finite resource per world?
7. **Water in play-test levels.** Enemies do not swim; should they avoid water
   (a pathing change), or is walking along the bed acceptable for now?

## Decisions (answered 2026-09-23)

These supersede anything above that disagrees.

1. **Rivers: yes.** Channels at sea level join lakes to the sea.
2. **About 25% water overall, varying by region.** Large-scale regions change
   the share — a coastal/archipelago region with much more sea, a continental
   interior with little — so water amount is itself part of the biome mix
   rather than a flat 25% everywhere.
3. **Mount key: `B` for now.** `E` is reserved for a future general
   "interact" action (tools, stations, vessels); vessels should move to it
   when that exists, so keep the binding in one place.
4. **Leaves drop saplings, and saplings grow into trees**, so wood is
   renewable. Grown trees are not player-placed, so chopping them earns xp.
5. **Buckets are craftable** and arrive with phase B, not phase C: scoop a
   source block, place it elsewhere.
6. Defaults kept: the jetski needs a Forge station at construction level 15;
   play-test enemies avoid water.
