# Forge Endless World — Terrain That Goes On As You Walk

Date: 2026-09-22
Status: Draft for review
A Forge sub-project spec of its own, outside the numbered Forge/RPG series
(onboarding, spec 4, and shared-build discovery, spec 5, are still to come).
It changes the world underneath every Forge feature, so it is sequenced
by itself rather than folded into either of those.

## Goal

Make the Forge world endless in both horizontal directions, the way Minecraft
is: terrain is generated a chunk column at a time as the player walks, only the
columns the player has changed are saved, and columns far from the player are
dropped from memory and from the GPU. The world stays 64 blocks tall.

Success looks like:

- You can walk or fly in a straight line for as long as you like and there is
  always terrain ahead, with no wall at 128 and no repeating pattern.
- Frame time while walking stays inside the Forge's existing voxel budget, and
  opening a world takes no longer than it does today.
- You build something 2,000 blocks from spawn, save, reload, walk back, and it
  is still there. The save for that world is small, because it holds the seed
  and your edits, not the terrain.
- Every world made before this change still opens and plays exactly as it did,
  walls at the edge included.
- In survival, a block you placed stays "placed by you" after a reload, which
  closes the place-then-break xp loop that the survival core spec left open.
- A world can still be play-tested, shared by URL and exported to a file.

## Decisions taken before this spec

| Question | Decision |
|---|---|
| Endless or bigger-but-fixed | Endless horizontally, generated per chunk as the player moves. |
| What is saved | Only columns the player changed, as deltas against what the seed generates. |
| Memory | Far columns unload. |
| Height | Stays fixed at 64. |

## Current state

Facts checked against the code on `feat/v0.8.0`.

**Storage.** `World` is one flat `Uint8Array` of 128 × 128 × 64 bytes
(`src/world/world.js:4`, `:12`), indexed `(z * D + y) * W + x` (`:23`).
`get` answers `BEDROCK` below `z = 0` and `AIR` anywhere else outside the box
(`:26–30`); `set` silently refuses out-of-bounds writes (`:33–34`). Mesh
bookkeeping is a `Uint8Array` of dirty flags for the 8 × 8 × 4 grid of 16³
chunks (`:5`, `:19`), with a linear `chunkIndex` and a `chunkCoords` that uses
`| 0` (`:52–53`). `set` marks the neighbour chunk dirty when a block sits on a
chunk face, clamped to the grid (`:41–48`). `topSolid` scans the column
(`:64–68`).

**Generation.** `generateWorld({terrain, seed, act, name})`
(`src/world/world-gen.js:23`) fills the whole array in one pass. Its value
noise reads a 17 × 17 lattice wrapped with `& 15` (`:10–12`), so the lattice
repeats every 16 cells: the `/24` octave repeats every 384 blocks and the `/9`
octave every 144, and the terrain as a whole every 1,152 blocks (`:20`). The
surface is `31 + noise * 6` clamped to 26..38, which in practice lands in
26..37 (`:29–30`). Ore is 2% of rock above `z = 2`, drawn from one sequential
RNG stream (`:34`), so a cell's ore depends on the order every earlier cell was
visited. Flat worlds put grass at `z = 31`. Spawn is hard-coded to
(64.5, 64.5) (`:39`). The seed is `Date.now()` at every call site
(`js/forge.js:373`, `:383`, `:428`, `:1390`) and is **not stored** — the
`World` is built from `{name, act}` only (`world-gen.js:24`) — so no world
today can regenerate its own terrain.

**Save format.** v4 is `{version: 4, size: [128,128,64], meta, blocks}` with
the blocks run-length encoded (`src/world/world-codec.js:26–28`). Any other
size is rejected (`:33–34`); anything without `version: 4` goes through the
legacy 2D-map converter (`:32`). `packWorld` is a one-byte tag plus gzipped
JSON, and the same bytes serve IndexedDB, `.ccw` export and the share hash
(`:49–55`), which is `"v4." + base64url` and refused over `SHARE_LIMIT =
60_000` characters (`:65–72`). The host recognises share hashes by the `v4.`
prefix (`js/game.js:3106`). Storage is IndexedDB `cc_worlds` version 1, one
object store `worlds`, one row and one blob per world (`src/world/world-store.js:16`,
`:42`). The Forge saves when asked and on `stop()`; there is no timed autosave
(`js/forge.js:415–420`, `:1355`).

**Renderer.** One pair of VAOs (opaque and see-through) per 16³ chunk, in a
`Map` keyed by the linear `chunkIndex` (`src/rendering/voxel/voxel-renderer.js:176`,
`:402–411`). Meshing takes the world's dirty list, sorts it nearest first by
`_chunkDist`, which decodes the index through `CHUNKS_X`/`CHUNKS_Y` (`:30`,
`:385–390`), and builds at most `MESH_BUDGET = 4` chunks a frame (`:25`,
`:392–400`). `VOXEL_DRAW_DISTANCE = 160` was chosen to cover the whole world
(`:34–42`); the far plane is 256 (`:32`) and the ink pass's `DEPTH_RANGE`
matches it (`shaders.js:45`). Nothing is ever evicted except when the whole
world is swapped (`:316–320`). The greedy mesher reads every block through
`world.get` (`mesher.js:57`), writes chunk-local vertices as `Uint8`
(`mesher.js:41`), and was written to be able to run in a worker (`mesher.js:5`).

**Precision.** The vertex shader adds the chunk origin in `float32`
(`shaders.js:22`) and multiplies by a world-space view-projection built from
the camera's world position (`voxel-renderer.js:478`). Lights, sprites and the
fog distance are all world-space too (`:504`, `:591`, `shaders.js:58`, `:65`).
That is fine inside 128 blocks and is not fine at a hundred thousand.

**Hard-coded size.** Every one of these assumes the 128 × 128 box:

| Where | What |
|---|---|
| `src/world/voxel-physics.js:107–114` | `clampToWorld` holds every body inside 0..128 |
| `src/world/voxel-physics.js:44`, `:176` | column scan and ray cut-off by `World.H` (vertical, stays) |
| `js/forge.js:266`, `:1310` | player and spawn default to (64.5, 64.5) |
| `js/forge.js:603` | overhead cursor Z clamp (vertical, stays) |
| `js/forge.js:824–828` | noclip clamped to the box |
| `js/forge.js:1363–1364` | the `forge_save` event counts blocks by scanning `world.blocks` |
| `src/rpg/survival-session.js:17`, `:27`, `:41` | the placed-block bitset is `W × D × H` bits, indexed like the world |
| `src/rpg/stations.js:25–28` | station scan clamped to the box |
| `src/ui/forge-hud.js:564–580`, `:626` | overhead map draws the full 128 × 128 and prints `128×128×64` |
| `js/game.js:3016–3021` | play-test fallback scatters enemies across the whole box |
| `src/systems/projectile-update.js:142` | bolts die when they leave the box |
| `src/systems/voxel-glue.js:47`, `:77`, `:84`, `:104–107` | spawn search bounds and the (W/2, D/2) fallback |
| `src/world/legacy-convert.js:15–16` | legacy maps land centred in a 128 box |
| `js/testing/debug-bridge.js:137` | test bridge counts `world.dirty` (gitignored tooling) |

`js/vfx.js:25` uses `World.GROUND` for a default light height; that is vertical
and unaffected.

**Survival placed flags.** `SurvivalSession.placed` is one bit per cell of the
fixed box, in memory only (`src/rpg/survival-session.js:26–27`), cleared on
every world adopt and mode toggle (`js/forge.js:1187`, `:1297`). The survival
core spec called this out: a reload clears the flags, so a block you placed
becomes "natural" and pays mining xp again.

**Measured today.** A throwaway script against the current code, in node on
the development Mac: generating the whole 128 × 128 world takes 3.3 ms, about
0.05 ms per 16 × 16 column. Meshing a 16³ chunk takes 0.60 ms median,
0.72 ms at the 95th percentile, 0.86 ms at worst; 139 of the 256 chunks have
any faces. The meshes average 176 quads and 7.6 KB of vertex and index data
per column. These are the numbers the budgets below are built from; the
browser will differ and phase 4 re-measures there.

**Tests.** 1,090 unit tests across 72 files pass (measured today). 17 Forge
e2e tests in `tests/forge.spec.js`. `tests/perf-budget.spec.js` already holds
the voxel phase to 6 ms a frame (`VOXEL_MS_BUDGET`) and main-thread long tasks
to 120 ms (`LONG_TASK_BUDGET`).

## Scope

This spec: column storage, per-column generation from a stored seed, loading
and unloading around the player, the renderer changes that go with it, the v5
save format and its IndexedDB layout, migration of every existing world, and
the fixes to each hard-coded size above.

Out of scope, and listed again under Non-goals: new terrain content (caves,
biomes, water, trees), a taller world, level-of-detail far terrain, and any
change to the campaign or arena.

## Design

### 1. Bounded and endless worlds

There are two kinds of world after this change, and they share one
implementation:

- **Endless** worlds have a seed and no edge. Every world created from now on
  is endless, creative and survival alike.
- **Bounded** worlds carry `meta.bounds = {x0, y0, x1, y1}`. Outside the bounds
  `get` answers air and bodies stop at the edge, exactly as every world behaves
  today.

Every v4 world becomes a bounded 128 × 128 world. That is the recommendation,
weighed against making old worlds endless:

- A v4 world has no stored seed, and its terrain came from the old repeating
  lattice. Whatever is generated past its edge will not meet its terrain, so
  "endless" would mean a cliff or a step at x = 128 on every old world.
- Old worlds double as play-test levels. Their authors placed spawns, exits and
  walls assuming the edge is a wall. Keeping it keeps every level playing the
  way its author tested it.
- It costs nothing extra: bounds are a four-number check in `get`, `set` and
  the physics clamp, and the column storage underneath is the same.

Legacy 2D maps converted by `legacy-convert.js` also become bounded 128 × 128
worlds, as they are today.

The alternative considered was a "bounded" flag for level-editor worlds versus
endless survival worlds. It is rejected because creative and survival are the
same world toggled by `M` (`js/forge.js:1182–1184`); a flag keyed to mode would
make toggling a world change its size. Bounds belong to the world, not the
mode.

Endless worlds still have a far border, at ±2²⁰ = 1,048,576 blocks on each
axis. At walking speed (8 blocks a second, `js/forge.js:50`) that is 36 hours
from spawn. It exists so chunk keys pack into one safe integer (§2) and so the
coordinate range the renderer must handle is finite (§9). Bodies stop at it the
way they stop at the edge of a bounded world.

### 2. Column storage

The world becomes a sparse `Map` of **columns**, each 16 × 16 × 64 blocks: one
`Uint8Array(16384)`, indexed `(z * 16 + ly) * 16 + lx` inside the column. A
column is keyed by its chunk coordinates `(cx, cy)` packed into one number:

```js
colKey(cx, cy) = (cx + 65536) * 131072 + (cy + 65536)
```

Inside the ±2²⁰ border, `cx` and `cy` are in −65,536..65,535, so the key is
below 2³⁴ and exact. A 16³ render chunk inside a column is `colKey * 4 + cz`,
below 2³⁶ and also exact. Numeric keys keep `Map` lookups cheap and avoid
building strings in the hot path.

Coordinates may now be negative. Block-to-column conversion uses `x >> 4` and
`x & 15`, which floor and wrap correctly for negative integers; the only two
places that decode chunk indices with `| 0` truncation (`world.js:53`,
`voxel-renderer.js:387`) are replaced in phase 1. Callers already floor with
`Math.floor` before calling `get`.

Each resident column carries:

- `blocks` — the 16 KB of block ids
- `modified` — set by any `set` that changed a block; the column must be saved
- `placed` — the survival placed-block bits for this column (§12), allocated
  only when something in it has been placed

The world also holds `edits`, a `Map` from column key to the saved delta of
every modified column, resident or not (§10). That map is what makes unloading
safe: dropping a column's bytes never drops an edit.

### 3. The world API keeps its shape

The mesher, physics, raycast, stations, AI and undo all talk to the world
through `get`, `set`, `inBounds` and `topSolid`, and those keep their
signatures:

| Method | Behaviour after this change |
|---|---|
| `get(x, y, z)` | `BEDROCK` below `z = 0`, `AIR` at or above 64, `AIR` outside bounds or border, **`AIR` in a column that is not loaded**, otherwise the block. |
| `set(x, y, z, id)` | Refuses outside bounds, border or height, as today. In a column that is not loaded it loads it first, synchronously (§5), then writes. Returns whether the block changed. |
| `inBounds(x, y, z)` | Height, then bounds for a bounded world or the border for an endless one. |
| `topSolid(x, y)` | `-1` outside bounds or in an unloaded column. |

New methods: `isLoaded(x, y)` (block coordinates), `ensureColumn(cx, cy)`,
`columnKey`, and `chunkCoords(key)` returning `[cx, cy, cz]` from a render
chunk key. `takeDirty` returns render chunk keys instead of linear indices, and
dirty flags become a `Set`. `forEachChunk` iterates resident chunks only.

`set` still marks the neighbour chunk dirty for a block on a chunk face, now
without the grid clamps; marking a chunk in a column that is not loaded is
harmless, since nothing meshes it until it loads.

`World.W`, `World.D`, `World.CX` and `World.CY` are removed. `World.H`,
`World.CS` and `World.GROUND` stay. Every former reader of `W`/`D` either reads
`world.bounds` (which is the border for an endless world) or is rewritten in
the section below that owns it. The static is removed rather than kept so any
caller that was missed fails loudly in a test instead of quietly clamping to 128.

`get` gets faster than a plain `Map` lookup by caching the last column it
resolved; the mesher, physics sweeps and station scans all read runs of nearby
cells, so almost every call hits the cache. The mesher additionally stops
calling `get` per cell (§8).

### 4. Deterministic generation per column

`generateColumn(gen, cx, cy)` returns one column's 16 KB and nothing else. It is
a pure function of the world's generator settings and the column's
coordinates: the same column comes out byte-identical whatever order columns
are generated in, on whatever browser.

Generator settings live in `meta.gen = {kind, seed, v}`:

- `kind` is `"terrain"`, `"flat"` or `"void"` (all air; used for migrated v4
  worlds, §11).
- `seed` is an unsigned 32-bit integer from `crypto.getRandomValues`. It is
  stored, so it survives save, export and share.
- `v` is the generator version, starting at 1. **A generator version is never
  changed once worlds exist that were saved against it.** A saved delta says
  "this column differs from what version 1 makes"; if version 1's output
  changed, every edited column would sit on shifted terrain. New terrain
  features become version 2, used by new worlds, with version 1 kept.

**Noise without repetition.** The lattice table goes. The value at lattice
point `(i, j)` is an integer hash of `(seed, i, j)` — a multiply-xorshift mix
using `Math.imul` — mapped to −1..1. Nothing wraps, so nothing repeats. The
shape is kept: the same two octaves at the same scales and weights, the same
smoothstep, the same `31 + n * 6` height clamped to 26..38, the same layering
(bedrock at 0, rock, four of dirt, grass or sand on top). A new world looks
like an old one, just without edges.

The generator uses only `+ − × ÷`, `Math.floor`, `Math.round`, `Math.imul` and
bit operations. Those are exactly specified by ECMAScript, so every browser
produces the same bits. `Math.sin`, `Math.exp` and `Math.pow` are left to the
engine's accuracy and are not allowed in the generator; a unit test holds that
line by checking output against stored golden bytes.

**Ore.** A rock cell above `z = 2` is ore when a hash of `(seed, x, y, z)` falls
under 2% of the hash range. Each cell decides for itself, so ore no longer
depends on visiting order and is automatically the same on both sides of a
column border.

**Features that cross borders.** There are no trees or structures today, and
this spec adds none, but the generator's contract is fixed now so they can be
added without seams. A feature is rooted at a cell chosen by hashing its
column, and its footprint may reach at most 15 blocks from its root. Generating
column C evaluates every feature rooted in C and its eight neighbours and
writes only the blocks that fall inside C. Because the root, the feature's
shape and the ground height at the root are all pure functions of the seed and
coordinates, both sides of a border agree without either one writing into the
other, and no column ever has to be revisited.

**Flat worlds** are a trivial generator: the same layering with the surface at
31 everywhere. They become endless too.

**Spawn** for a new endless world is (0.5, 0.5), standing on the generated
surface there. The height is a pure function, so spawn height is known without
loading anything.

### 5. Loading and unloading

A `WorldStreamer` owns which columns are resident. Each frame it is given the
player's (or the play-test camera's) position and a time budget.

Distances are measured in columns, from the player's column to a column's
centre, so the resident set is a disc, not a square (about 21% fewer columns
for the same reach):

| Radius | Default | Why |
|---|---|---|
| Mesh radius | 10 columns (160 blocks) | matches `VOXEL_DRAW_DISTANCE`, so what is drawn today is still drawn |
| Load radius | 11 columns | one ring past meshing, so every meshed column has all eight neighbours loaded (§7) |
| Unload radius | 13 columns | two rings of hysteresis past loading |

Hysteresis means a player standing on a column border, or walking back and
forth across one, never loads and drops the same ring over and over: a column
loads when it comes inside 11 and only unloads when it goes beyond 13.

Work is ordered nearest first. Loading a column is: generate it, then apply its
saved delta from `edits` if there is one. Unloading a column is: if it is
modified, fold it into `edits` (§10); free its GPU meshes; delete it from the
map.

Two paths load synchronously, outside the budget, because the player would
otherwise stand on nothing:

- On adopting a world, starting a play-test, or any teleport: the 3 × 3 columns
  around the player. That is nine columns at roughly 0.05–0.2 ms each.
- `set` into an unloaded column, which only happens when undo or redo replays
  an edit made somewhere the player has since left. Generating one column is
  cheap enough to do inline, and it means history never silently loses a step.

The streamer is ticked from `drawVoxelScene` in
`src/rendering/render-pipeline.js:248`, just before `vr.render`. Both the
Forge and a play-test draw through that function, so there is one call site
and play-tests stream with no extra wiring.

### 6. Budgets per frame, and the worker question

The fixed `MESH_BUDGET = 4` becomes a time budget, because with streaming the
number of chunks waiting varies from zero to hundreds:

- **Steady state:** up to 3 ms a frame for generation and meshing together,
  always at least one of each so progress never stalls.
- **While a world is loading:** up to 10 ms, behind the existing loading state,
  until the 5 × 5 columns around the player are meshed; then steady state.

Demand, from the measurements above. Flying at noclip speed (14 blocks a second,
`js/forge.js:51`) crosses a column border about every 1.1 s and brings in a
row of about 23 columns: roughly 20 columns a second. Generation for those is
around 1–4 ms a second. Meshing is the real cost: about 2.2 non-empty chunks per
column at ~0.65 ms each is ~30 ms a second, under 1 ms a frame at 60 fps.
Skipping chunks that are entirely air (every `cz = 3` chunk in today's terrain)
removes a quarter of the scans for free. The initial load of ~380 columns is
about a second of meshing, spread over the loading frames with the nearest
columns first.

**Recommendation: no Web Worker in this spec.** Reasons:

- Generation is ~0.05 ms a column today. A hashed lattice costs a few times
  that at most. At 20 columns a second it is a rounding error; moving it off
  the main thread saves almost nothing.
- Meshing is where the time goes, and meshing is the hard thing to move: it
  must see the player's latest edits, so a worker either holds a mirror of the
  world or is sent the neighbourhood each time, and every result can arrive
  stale and must be checked against the chunk's version before upload.
- Time-slicing on the main thread meets the numbers above with room to spare
  on the reference profiles.

The design keeps the door open anyway. The generator is a pure function of
`(gen, cx, cy)`, and the mesher reads a padded copy of its neighbourhood rather
than the live world (§8) — which is exactly the message a worker would need.
If phase 4's perf test fails the 6 ms voxel budget or the 120 ms long-task
budget on the `slow-laptop` profile (4× CPU throttle, where meshing is ~2.5 ms
a chunk), moving meshing and generation into a module worker is a contained
follow-up, not a redesign.

### 7. Seams between columns

The mesher decides whether a face is hidden by reading the neighbour across the
chunk border, and ambient occlusion reads the ring of cells around each face,
including diagonals. If a neighbour column is not loaded, `get` answers air:
the mesher would draw a wall of faces along the edge and wrong AO beside it,
then have to redo the chunk when the neighbour arrives.

So a column is only meshed when all eight of its horizontal neighbours are
resident. That is why the load radius is one ring wider than the mesh radius.
There is then never a seam to fix, and never a remesh caused by loading alone.

When a column loads, no existing mesh needs rebuilding: any neighbour that was
missing this column could not have been meshed yet. The rule runs one way —
meshing waits for neighbours, and loading never invalidates a mesh. Edits still
dirty the neighbour chunk across a border, as `set` does today.

### 8. The mesher reads a padded copy

Before meshing a chunk, the renderer copies its 18 × 18 × 18 neighbourhood
(the chunk plus one cell on every side, 5.8 KB) into a scratch buffer, reading
at most nine columns. `meshChunk` then indexes that buffer directly instead of
calling `world.get` up to ten times per visible face. Output is byte-identical
to today's mesher; a unit test compares the two over the whole of a generated
world.

This does two jobs: it takes the `Map` lookup out of the mesher's inner loop,
and it is the exact message a worker would need if one is ever added (§6).

### 9. Renderer: keyed by chunk, evicted, camera-relative

- `this.chunks` is keyed by render chunk key. `_chunkDist` decodes keys with
  `chunkCoords` instead of `CHUNKS_X`/`CHUNKS_Y`.
- `_meshDirty` takes its work from the streamer's queue under the time budget
  instead of a fixed count, and skips chunks whose column lacks a neighbour.
- When the streamer unloads a column, the renderer frees that column's four
  chunks with the existing `_freeChunk`. This is the eviction the renderer has
  never had.
- The draw-distance cull (`chunkInDistance`) is unchanged; the fog ramp is
  unchanged.

**Float precision.** The mesher's `Uint8` chunk-local vertices are fine at any
distance; the problem is adding the chunk origin in `float32` on the GPU. At
x = 100,000 a `float32` step is about 0.008 of a block, which shows as
shimmering edges and hairline cracks between chunks; at the ±2²⁰ border it is
an eighth of a block. JavaScript numbers are doubles, so the fix is to do the
big subtraction on the CPU:

- Build the view matrix with the eye at the origin.
- Upload each chunk's `u_origin` as `chunkOrigin − cameraPosition`, computed in
  doubles, then narrowed. It is now a small number near the camera.
- Do the same for `u_cam` (zero), the light positions, sprite positions, fx and
  tracer segments.
- Frustum culling uses the same camera-relative positions.

Fog and lighting only ever use differences between positions, so they are
unchanged by the shift. Physics, raycasts and AI stay in world coordinates:
doubles hold a thousandth of a block at a million blocks without trouble, and
the physics epsilons (`voxel-physics.js:11–13`) are nowhere near that limit.

**Draw calls.** Today at most 139 chunks have faces. At the default radius,
about 700 chunks will be in range, and the frustum at the Forge's 120° field of
view keeps roughly a third to a half: 250–350 draw calls. The target is to stay
under 400. If the perf test says otherwise, merging a column's four chunks into
one VAO halves the count at the cost of re-uploading a whole column per edit;
that is a follow-up, not part of this spec.

### 10. Saving: v5 and deltas

**What a delta is.** For a modified column, an overlay of 16,384 bytes where
`0xFF` means "as generated" and any other value is the block id stored there
(air included — a dug block is an edit). Block ids are well under 255
(`src/world/blocks.js` has 19). The overlay is run-length encoded with the
existing `rleEncode`, and since it is almost all `0xFF` it is tiny: a column
with 40 edits encodes to 188 bytes of JSON, measured. The survival placed bits
ride alongside as a second run-length encoded array, present only when any are
set.

An overlay was chosen over saving the whole column (about 3 KB of JSON for a
natural column, measured) because it is 10–20 times smaller, which is what
keeps share hashes usable (§13). It is safe only because a generator version
never changes (§4).

**Building a delta.** When a modified column is saved or unloaded, it is
diffed against a fresh `generateColumn` (cheap) to produce its overlay. If the
diff is empty — the player dug a block and put the same one back — the column
is no longer modified and its delta is deleted.

**The v5 document**, used for `.ccw` export and share, through the unchanged
`packWorld` pipeline:

```js
{
  version: 5,
  meta,                    // name, act, mode, spawn, markers, gen: {kind, seed, v}, bounds?
  columns: [[cx, cy, overlayRle, placedRle?], ...]
}
```

`decodeWorld` accepts version 5, keeps accepting version 4 (§11), and keeps
routing anything else to the legacy converter.

**IndexedDB.** `cc_worlds` moves to version 2 and gains a second object store,
`columns`, keyed by `[worldId, colKey]`. The `worlds` row keeps `id`, `name`,
`updatedAt`, and gains `meta`; it no longer holds a blob for v5 worlds. So:

- **Opening a world** reads its row and then every one of its column rows in
  one key-range `getAll`, into the `edits` map. Deltas are small enough that
  holding all of them is fine (a thousand edited columns is on the order of a
  megabyte), and it means loading a column never waits on IndexedDB.
- **Saving** writes the world row and only the columns modified since the last
  save, in **one transaction**, so a save is all or nothing. A save no longer
  rewrites the whole world, which matters as an endless world grows.
- **Deleting** a world deletes its row and its column key range, again in one
  transaction.
- `list()` stays cheap because the row no longer carries a blob.

The `MemoryBackend` gains the same two-store shape so tests and the
storage-failed fallback behave the same.

**Autosave.** Endless worlds hold more to lose, so the Forge writes modified
columns every 30 seconds while `_dirty`, and on `pagehide`. This does not
change a promise the Forge makes today: `stop()` already writes unsaved edits
without asking (`js/forge.js:415–420`). The explicit save and its flash stay.

The `forge_save` event (`js/forge.js:1363–1364`) can no longer scan a
`blocks` array. It reports the number of modified columns and the non-air count
inside them instead.

### 11. Migration

- **A v4 row or file** decodes into a bounded 128 × 128 world with
  `gen.kind = "void"` and all 64 columns stored as deltas (a void generator
  makes every non-air block an edit). Content, spawn and markers are
  unchanged. On the next save it is written as v5 rows; the old blob is
  removed in the same transaction.
- **Worlds created during phases 2 and 3** are bounded but seeded. Because
  their terrain came from the version 1 generator, removing their bounds is
  seamless. Phase 4 can therefore offer "make this world endless" for them;
  whether to offer it at all is an open question.
- **A v4 share hash** still opens: `fromShareHash` accepts both prefixes and
  `js/game.js:3106` learns `v5.`.
- **Legacy 2D maps** convert as today into a bounded 128 × 128 world.

A v5 world opened by an older build is refused by the old `decodeWorld` with
its existing "unsupported" error. That is acceptable on a feature branch; it
should be noted in release notes if v5 ships before everyone has upgraded.

### 12. Survival placed flags, per column and persisted

The session-wide `W × D × H` bitset goes. Placed bits move into the world, one
optional 2 KB bitset per column, allocated only when a block in that column is
placed. `SurvivalSession.markPlaced`, `clearPlaced` and `wasPlaced` keep their
signatures and forward to the world the session is attached to, which
`attachSurvival` (`js/forge.js:99`) already knows.

This fixes two things at once:

- Placed bits are saved with the column's delta (§10), so a reload no longer
  turns your blocks into natural ones. This closes the xp loop the survival
  core spec left open.
- They belong to the world, so switching worlds no longer needs
  `resetPlaced`: the new world has its own bits. The mode toggle keeps its
  existing behaviour of clearing them (`js/forge.js:1187`), now by clearing the
  world's bits.

A column with placed bits is by definition modified (a block was placed there),
so no column exists only to carry flags.

### 13. Sharing

A share is the v5 document: seed, meta and the deltas, gzipped and base64url
encoded behind `v5.`. The limit stays `SHARE_LIMIT = 60_000` characters.
Because unmodified terrain costs nothing, a build of a few thousand blocks in a
handful of columns fits comfortably. A world with edits spread across hundreds
of columns will not, and gets the existing "too large to share by URL — export
it instead" notice (`js/forge.js:1629–1636`). A migrated v4 world shares about
as well as it does today, since all of its columns are deltas.

### 14. Physics and raycasts next to unloaded columns

The rule: **an unloaded column is solid to physics and air to everything else.**

- `aabbOverlapsSolid` treats a cell in an unloaded column as solid. A body can
  therefore never walk, fall or be pushed into one: `sweepAxis` stops it at the
  border as it would at a wall, and a body somehow already inside one is left
  where it is, which is the existing "never push out of a block" behaviour
  (`voxel-physics.js:76–79`). The player simply waits at the edge until the
  column loads. With a load radius of 11 columns this should only be seen if
  generation falls badly behind.
- `clampToWorld` reads `world.bounds` — the 128 box for a bounded world, the
  ±2²⁰ border for an endless one — instead of `World.W`/`World.D`.
- Noclip (`js/forge.js:824–828`) clamps to the same bounds and is otherwise
  free: it ignores blocks, so it may fly over unloaded columns.
- `raycastBlocks` needs no change: an unloaded cell answers air, so picking and
  line of sight pass through it. The reach is 6 blocks, far inside the load
  radius.
- Projectiles (`projectile-update.js:142`) die when they leave the bounds or
  enter an unloaded column.
- Enemies in an unloaded column are not simulated and not drawn (§16).

### 15. Stations, the overhead map, and spawn

**Stations** (`src/rpg/stations.js:25–28`): drop the clamps to 0 and to
`W − 1`/`D − 1`; keep the height clamp. `get` already answers air outside and
in unloaded columns. The scan now works across column borders and at negative
coordinates, and needs tests for both.

**The overhead map** (`src/ui/forge-hud.js:564–580`) becomes a window: 128 ×
128 blocks centred on the player for an endless world, the full bounds for a
bounded one (so old worlds look exactly as they do today). Unloaded cells are
drawn in the background colour. Markers are drawn when they fall inside the
window. The status line (`:626`) shows the player's block coordinates and
"Endless" or the bounds' size instead of `128×128×64`. The per-frame cost is the
same 16,384 reads it is today.

**Spawn.** `_adopt` (`js/forge.js:1310`) and `spawnFromMeta`
(`voxel-glue.js:100–111`) fall back to `(0.5, 0.5)` on the generated surface
for an endless world and to the centre of the bounds for a bounded one, instead
of `64.5`. `standableNear`'s ring search (`voxel-glue.js:84`) skips cells
outside bounds or in unloaded columns instead of cells outside 0..128. Both
paths first load the 3 × 3 columns around the point (§5), so the search always
has ground to find. The Forge has no death or respawn today; when it gets one,
it goes through the same path.

### 16. Play-test in an endless world

A level is defined by its markers, not its edges, so an endless world
play-tests the same way a bounded one does:

- Placed enemy spawns, pickups and the exit are used as they are, wherever
  they are.
- An enemy whose column is not loaded is frozen and not drawn until the player
  comes within the load radius. That is how Minecraft behaves and it follows
  directly from §14.
- The fallback when a level has no placed enemies (`js/game.js:3016–3021`)
  scatters them within 48 blocks of spawn, in loaded columns, instead of across
  the whole 128 box. For a bounded world it also stays inside the bounds, so an
  old level's fallback behaves as before.
- Streaming continues during the play-test through the shared call site (§5).

What an endless play-test does not do is stop the player leaving the arena. An
author who wants a closed arena builds walls, or plays in an old bounded world.
A bounds marker for new worlds is an open question, not part of this spec.

### 17. Memory and performance targets

Memory, at the default radii:

| | Columns | Block data |
|---|---|---|
| Load disc, radius 11 | ~380 | ~6.1 MB |
| Worst case before unload, radius 13 | ~530 | ~8.5 MB |
| Meshed, radius 10 | ~314 | ~2.4 MB of GPU buffers at the measured 7.6 KB a column |

Each column is 16 × 16 × 64 = 16,384 bytes. Deltas for edited columns are
extra and small. Nothing grows with how far the player has walked except the
`edits` map, which grows only with how much the player has built.

Performance targets, enforced by `tests/perf-budget.spec.js`:

- The Forge's voxel phase, which now includes streaming work, stays under the
  existing 6 ms budget on every profile while flying in a straight line at
  noclip speed.
- No main-thread task over the existing 120 ms budget during a 60-second
  flight, and none while opening a world.
- Streaming work is under 3 ms a frame in steady state.
- Opening a world reaches its first drawn chunk no later than today.
- Chunk draw calls stay under 400 a frame.

## Delivery in phases

Each phase lands with the full unit suite and the Forge e2e green, and each is
useful on its own. The brief suggested streaming before the new save format;
that order is swapped here, because an endless world that cannot be saved is
not shippable, so streaming would have to sit behind a flag for a phase.
Putting the save format first means every phase can be merged as-is.

**Phase 1 — column storage behind the existing API, still 128 × 128.**
`World` becomes a map of columns with `meta.bounds` defaulting to the 128 box.
Dirty flags become a set of chunk keys; the renderer is keyed by chunk key; the
mesher reads a padded copy. `World.W`/`World.D` are removed and every caller in
the table above reads `world.bounds`. The world is still generated whole at
creation, still saved as v4, and behaves identically: the proof is the existing
tests, plus a property test that runs random `get`/`set` sequences against the
new world and a reference copy of the old one and requires identical answers,
and the byte-identical mesher test. Meshing speed must not regress by more than
10%.

**Phase 2 — generation per column.** `generateColumn` with hashed noise and
per-cell ore, `meta.gen` stored. New worlds are still bounded 128 × 128 and
still generated whole (by calling `generateColumn` 64 times) and saved as v4,
so nothing about storage changes yet. The generator's golden-byte tests land
here and version 1 is frozen at the end of this phase.

**Phase 3 — v5 save, IndexedDB layout, placed flags.** Deltas, the v5 document,
`cc_worlds` version 2 with the `columns` store, single-transaction saves, v4
migration, `v5.` share hashes, autosave, and the per-column persisted placed
bits. Worlds are still bounded, which lets the delta path be proved on worlds
where every column is still in memory.

**Phase 4 — streaming and endless worlds.** `WorldStreamer`, the load and
unload radii, the time budgets, eviction, camera-relative rendering, the
physics rule for unloaded columns, the overhead window, projectiles, the
play-test changes, and new worlds created endless. The perf-budget spec gains
the long-flight scenario, and phase 4 is not done until it passes in the
browser, not only in node.

**Phase 5, only if phase 4's perf test fails** — move generation and meshing
into a worker, as described in §6.

## Non-goals

- A taller world, or any vertical streaming. The world stays 64 high.
- New terrain content: caves, biomes, water, trees, structures. §4 fixes the
  contract they would need; it adds none of them.
- Level-of-detail or impostor terrain beyond the draw distance.
- Light propagation or sky lighting.
- A Web Worker, unless phase 4's perf test demands one.
- Storage on a server, or multiplayer.
- Any change to the campaign or the arena.

## Risks

- **`get` gets slower, and everything calls it.** A flat array index becomes a
  cached `Map` lookup. The mesher, the hottest caller, is taken off `get`
  entirely by the padded copy; physics and AI call it a few hundred times a
  frame. Phase 1's 10% meshing guard and the perf-budget spec are where this
  shows up if it goes wrong.
- **A generator that is not quite deterministic.** One `Math.sin`, one sequential
  RNG, or one dependence on generation order, and edited columns land on
  terrain that differs from what they were diffed against, silently, on some
  machines. The golden-byte tests and the order-independence test exist for
  this, and the "never change a generator version" rule must survive every
  future contributor, so it is stated in the generator's header comment.
- **A lost edit on unload.** If a modified column is dropped before its delta
  is folded into `edits`, a build disappears. The unload path does the fold
  before it frees anything, and a unit test walks away from an edit, forces an
  unload, walks back, and checks the block.
- **Negative coordinates.** Anything that truncates with `| 0` or `Math.trunc`
  instead of flooring breaks west and south of spawn. Only two such places were
  found and both are replaced in phase 1; the tests cover negative coordinates
  in every module that takes a position.
- **Draw calls and pop-in.** Draw calls roughly double. The fog tops out at
  85% (`FOG_DENSITY × 0.35`, max 0.85), so the edge of the loaded disc is
  faintly visible where chunks appear. If it is distracting, fading the last 16
  blocks to full fog is a small shader change.
- **Slow machines load slowly.** On the 4× throttled profile, meshing is about
  2.5 ms a chunk, so a steady 3 ms budget meshes about one chunk a frame. That
  keeps up with walking but makes the initial load several seconds long. The
  larger loading budget covers the first view; if that is not enough, this is
  the trigger for the worker in phase 5.
- **IndexedDB version bump.** Moving `cc_worlds` to version 2 must not strand
  anyone. `onupgradeneeded` only adds a store; v4 rows keep working until they
  are rewritten; and a failure to open still falls back to the in-memory store
  as today (`js/forge.js:423–439`).

## Testing

Unit tests in `tests/unit`, with vitest (`npm run test:unit`). Note that
`tests/` is gitignored local tooling: new test files will not show in
`git status`, and that is expected.

- **World storage:** the random-sequence property test against a reference flat
  world; negative coordinates; chunk and neighbour dirtying across column
  borders and at negative coordinates; `get` at, below and above every edge;
  `set` into an unloaded column loads it; bounded worlds refuse writes outside
  their bounds.
- **Generator:** golden bytes for a few fixed columns and seeds; the same
  column generated alone and after a hundred others is identical; no
  repetition (columns at offsets of 384, 1,152 and 100,000 blocks differ);
  heights stay in 26..38; ore rate near 2%; flat and void generators; a
  source-scan test that the generator module calls no `Math.sin`, `Math.cos`,
  `Math.exp` or `Math.pow`.
- **Mesher:** byte-identical output from the padded copy versus today's mesher
  over a whole generated world; empty chunks are skipped.
- **Streamer:** the resident set for a position; hysteresis (walking back and
  forth across a border loads nothing new after the first crossing); unload
  folds a modified column's delta before freeing it; the time budget is obeyed
  with a fake clock; nothing is meshed without its eight neighbours.
- **Codec and store:** v5 round trip; v4 decodes into a bounded void world with
  identical content; v4 and v5 share hashes both open; a delta for a restored
  column is deleted; a save writes only modified columns and does so in one
  transaction (spy on the `MemoryBackend`); deleting a world deletes its
  columns; a 1,000-block build shares under `SHARE_LIMIT`.
- **Physics:** an unloaded column stops a walking body and a falling one;
  bounded clamping is unchanged; clamping at the endless border.
- **Survival:** placed bits survive an encode and decode; switching worlds
  keeps each world's bits apart; the mode toggle still clears them.
- **Stations, overhead, projectiles, spawn:** stations found across a column
  border and at negative coordinates; the overhead window's origin and marker
  placement; projectiles die entering an unloaded column; spawn fallback for
  endless and bounded worlds.

End-to-end, extending `tests/forge.spec.js` and `tests/perf-budget.spec.js`,
driven by **real key and mouse events**, not by assigning fields:

- Fly 500 blocks in a straight line with the movement keys; terrain is drawn
  the whole way, the resident column count stays under the unload-radius
  bound, and there is no long task over 120 ms.
- Place a block far from spawn, save, reload, walk back, and find it.
- Open a world saved in v4 and confirm it is still bounded and unchanged.
- Play-test an endless world with placed enemies near and far.
- Teleport to (500,000.5, 500,000.5) through `ccDebug` and check chunks are
  drawn and a screenshot shows no cracks between chunks.
- The perf-budget spec gains the 60-second flight on every profile.

How to run e2e: the suite must run with the GPU flags from
`playwright.config.js` (`--use-gl=angle --enable-gpu`), because plain headless
Chromium has no WebGL2 and the Forge would never open. Any test that
hit-tests the HUD must use a large viewport (for example 2400 × 1350): at
1280 × 720 the Forge's draw space and CSS space coincide, so a wrong conversion
cannot fail. Run against the dev server with `CC_TEST_PORT=5173`.

Baseline to hold: 1,090 unit tests across 72 files, 17 Forge e2e.

## Decisions (answered 2026-09-22)

These supersede anything above that disagrees.

1. **Old worlds expand seamlessly.** A v4 world is given a seed on first open
   and becomes endless. The old 128 × 128 area is stored as edited columns;
   outside it, a **blend band** (24 blocks) feathers generated heights toward
   the old edge's heights column by column, so there is no cliff. Build the
   whole system to be expandable: no code may assume the world has a size,
   only optional `meta.bounds`.
2. **Bounded worlds are an option, not the default.** The new-world flow gets
   an Endless / Bounded (128 × 128) choice beside Terrain / Flat, for players
   making arenas and levels. Endless is the default.
3. **Generator v1 gets environment variants before it is frozen.** A
   low-frequency biome field picks between variants — plains, rolling hills,
   rocky highlands, sand flats — with smooth transitions and a wider height
   range. More variants later become generator v2 without breaking saves.
4. **Draw and load radius scale with the quality tier**, from the 160-block
   disc on high down to a smaller disc on low.
5. **The ±1,048,576-block border is endless enough.**
6. **Fade the last 16 blocks to full fog** so columns appear out of haze.
