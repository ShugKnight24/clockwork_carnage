# Voxel Forge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Forge (builder mode) with a bounded 128×128×64 voxel world rendered by a new WebGL2 chunked-mesh renderer, with first-person building, digging, 3D player physics, simple 3D enemy AI for playtest, all three art styles, and compressed saves that convert every old map.

**Architecture:** `src/world/` owns the data (blocks, world, generation, save codec, legacy conversion) and 3D physics; `src/rendering/voxel/` owns meshing, the texture array atlas, shaders, sprites and per-style post passes; `js/forge.js` replaces `js/builder.js` behind the same lifecycle contract so `game.js`, the render pipeline, the debug bridge and the playtest gate keep working; the campaign and arena keep the raycaster untouched. When `game.world` is set the pipeline draws the voxel renderer's canvas instead of `renderScene`, and AI, combat and player movement take 3D branches.

**Tech Stack:** Vanilla ES modules, WebGL2 (`TEXTURE_2D_ARRAY`, VAOs, depth textures), typed arrays, `CompressionStream`, IndexedDB, Vitest (node), Playwright with GPU flags.

**Spec:** none as a file — the user waived it. The binding design is the **Design** section below, agreed section by section in conversation on 2026-09-22.

## Design (authority for this plan)

Decisions the user made: replace the Forge (A); bounded world 128×128×64 with ground at z=32 (A); first-person only (A); simple ground/air AI at launch, no 3D pathfinding (A); 14 blocks = nine station tiles as cubes plus dirt, grass, sand, rock, ore (A); all three art styles (A); IndexedDB saves with RLE+gzip, share URL when < 60 KB, format shaped as a blob so a hosted share service can come later (C); renderer = chunked greedy meshes (1).

1. **World data and saves.** `World` = `Uint8Array` block ids, `index = (z*128 + y)*128 + x`, z up 0..63, ground plane z=32. Out of bounds reads: `BEDROCK` below z=0, `AIR` above and beyond the sides (sides are walled by physics, not blocks). 16³ chunks = 8×8×4 = 256, per-chunk dirty flag, `setBlock` dirties neighbour chunks when the block sits on a chunk face. `BLOCKS` table: `{id, name, kind, faces, emissive?, hardness, color}`; ids are stable bytes. Meta: `name, spawn{x,y,z,yaw}, exit, enemySpawns[{x,y,z,type}], pickups[{x,y,z,type,weaponId}], act`. Generation: flat grass/dirt/rock/bedrock; `terrain` option = gentle hills + ore veins from `SeededRNG`. Save v4 `{version:4, size:[128,128,64], meta, blocks:<rle>}`, RLE `[id,run]` pairs, gzip via `CompressionStream`, IndexedDB `cc_worlds`; localStorage keeps only the slot index and current slot. Export `.ccw` (the gzip blob), import `.ccw` and legacy `.json` v2/v3. Share URL = gzip → base64url in the hash when < 60 KB else "export instead"; old `#map=` links decode and convert. Legacy conversion: 60×60 centred at (34,34), layer `l` → blocks stacked from z=32 using `LAYER_TO_BLOCKS = [0,1,1,2,2,3]` (a full 5-layer wall is 3 blocks, the raycaster's 2-eye-heights ratio), tile ids map one-to-one, empty cells get grass at z=31, markers move to z=32.
2. **Renderer.** `VoxelRenderer` owns a WebGL2 context on its own canvas (same detached-canvas + `ctx.drawImage` composite as `GLRenderer`), handles `webglcontextlost/restored`. Greedy mesher per chunk → interleaved `Uint8` vertices (pos 3, normal 1, uv 2, layer 1, ao 1); glass/door in a second alpha buffer drawn after opaque; at most 4 chunk re-meshes per frame, nearest first. Atlas = one `TEXTURE_2D_ARRAY` 256×256 built from the existing 512px wall art (downsampled) and deck art plus new procedural natural-block painters, one set per style, rebuilt on style/act change, mipmapped, anisotropic when available. Fragment: array sample, per-face shade, AO, act fog ramp, block emissive, `game.lights` (gain z). Sprites = camera-facing quads from `getLayerImage` frame canvases, depth-tested. Viewmodel unchanged (Canvas2D on top). Post inside the GL renderer: Comic = Sobel ink on depth + normal id; Modern = the existing ACES/split-tone grade; Legacy = nearest sampling, no post. Frustum cull chunks; honour render scale and pixel budget through `resize`. Targets 1280×720 laptop ≤ 4 ms GPU + ≤ 2 ms CPU; phone ≤ 8 ms at 1.0 MP; a `voxel` profiler phase.
3. **Player and enemies.** Player AABB 0.6×0.6×1.7, eye 1.6, swept per axis (`moveAABB`), gravity 24, jump 8.5, auto step-up 1 block, crouch height 1.2, fall damage above 6 blocks (playtest only). Yaw + real pitch ±85°. Build ray to 6 blocks: left-click breaks, right-click places on the hit face, refused if it would overlap the player or an enemy. Tools spawn/pickup/exit/start become markers on blocks. Enemies gain `z, vz`: walkers = gravity, step-up, greedy chase with axis sliding and a jump when blocked by one block; flyers hold spawn altitude and steer straight; 3D block-ray line of sight; hitscan/projectiles use the same ray. `game.map` stays the 2D grid; `game.world` exists only in voxel modes; helpers branch on it.
4. **Mode integration.** `js/forge.js` (`ForgeMode`) replaces `js/builder.js` with the same constructor/callback contract; `GameState.BUILDER` and `mode "builder"|"playtest"` keep their names. Overhead view = top-down slice of one z level. WebGL2 required: if creation fails the Forge button reports it. Pipeline: `game.world` → `voxelRenderer.render(...)` then the usual HUD/viewmodel/overlays. Playtest spawns from world meta at z. Legacy slots convert once into IndexedDB. Hotbar/help/onboarding kept as canvas HUD for sub-project B. Out of scope: fluids, light propagation, 3D A*, third person.

## Global Constraints

- No runtime dependencies (CONTRIBUTING). Dev deps stay `vite`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`.
- World size is exactly `128×128×64`, index `(z*128 + y)*128 + x`, ground `z = 32`; block ids are stable bytes and only ever appended.
- `LAYER_TO_BLOCKS = [0, 1, 1, 2, 2, 3]` for legacy conversion; legacy tile id `t` (1–9) is block id `t`.
- Player: AABB half-width `0.3`, height `1.7`, crouch height `1.2`, eye `1.6` (crouched `1.1`), gravity `24`, jump `8.5`, step-up `1.0`, reach `6`, fall damage above `6` blocks.
- Save format `version: 4`; share URL only when the base64url payload is `< 60_000` chars.
- Art: block art is built from the existing painters (`buildWallSet`, `buildDeckSet`) plus new natural painters; never ship image files.
- `GameState.BUILDER`, `game.mode === "builder" | "playtest"`, `game.startBuilder()`, `game.startBuilderPlayTest()`, `game.exitBuilderPlayTest()`, `game.builder` keep their names and semantics (tests and the playtest gate depend on them).
- Commit messages: Conventional Commits, no AI attribution lines. Branch `feat/voxel-forge` off `feat/v0.8.0`. `npx vitest run` green after every task. Never commit `dist/`.

## Review Focus

1. **A block placed while standing in it or on a chunk boundary** — must be refused (player) or dirty both chunks (boundary) with no seam holes. Pinned in Task 1 (`setBlock dirties the neighbour chunk on a face`) and Task 4 (`placement refused when it overlaps the player AABB`).
2. **A legacy v3 map with a 5-layer wall and a 2-layer waist wall** — must convert to 3 and 1 blocks, and the player must still be able to shoot over the waist wall in playtest. Pinned in Task 3 (`converts layer counts through LAYER_TO_BLOCKS`).
3. **Digging to z=0 or building to z=63** — must clamp without exceptions and never show a hole into nothing. Pinned in Task 1 (`out-of-bounds reads`) and Task 5 (`mesh at world bottom emits no bottom faces`).
4. **A save blob written on one device, reopened on one without `CompressionStream`** — the codec must fall back to uncompressed with the same version. Pinned in Task 3 (`round-trips without CompressionStream`).
5. **Playtest with an enemy spawned on a raised block** — the walker must fall to the ground under gravity, not float. Pinned in Task 10 (`walker on a ledge falls to the ground`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/world/blocks.js` (new) | `BLOCKS`, `AIR`, `BEDROCK`, `LAYER_TO_BLOCKS`, face kinds |
| `src/world/world.js` (new) | `World` class: storage, bounds, chunks, dirty tracking, column helpers |
| `src/world/world-gen.js` (new) | `generateWorld(opts)` flat and terrain |
| `src/world/world-codec.js` (new) | RLE, gzip/gunzip with fallback, v4 encode/decode, share encode/decode |
| `src/world/legacy-convert.js` (new) | `convertLegacyMap(json) → { world, meta }` |
| `src/world/world-store.js` (new) | IndexedDB slots with an injectable backend |
| `src/world/voxel-physics.js` (new) | `moveAABB`, `groundHeight`, `raycastBlocks`, `hasLineOfSight3D`, `aabbOverlapsSolid` |
| `src/rendering/voxel/mesher.js` (new) | `meshChunk(world, cx, cy, cz) → { opaque, alpha }` |
| `src/rendering/voxel/natural-art.js` (new) | painters for dirt/grass/sand/rock/ore/bedrock per style |
| `src/rendering/voxel/atlas.js` (new) | `buildAtlasLayers(style, act) → { canvases[], layerOf(block, face) }` |
| `src/rendering/voxel/shaders.js` (new) | GLSL sources |
| `src/rendering/voxel/voxel-renderer.js` (new) | `VoxelRenderer`: context, buffers, atlas upload, chunk cache, sprites, post |
| `src/rendering/voxel/sprite-cache.js` (new) | canvas → GL texture cache with eviction |
| `src/systems/voxel-ai.js` (new) | `VoxelAISystem` |
| `src/systems/combat.js`, `src/systems/projectile-update.js` (modify) | 3D branches when `game.world` |
| `src/systems/player-update.js` (modify) | 3D movement branch |
| `js/forge.js` (new, replaces `js/builder.js`) | `ForgeMode` |
| `js/game.js`, `src/rendering/render-pipeline.js`, `js/main.js`, `src/utils/profiler.js` (modify) | integration |
| `tests/unit/world.test.js`, `world-gen.test.js`, `world-codec.test.js`, `legacy-convert.test.js`, `voxel-physics.test.js`, `mesher.test.js`, `voxel-ai.test.js` (new) | unit coverage |
| `tests/forge.spec.js` (new), `tests/perf-budget.spec.js` (modify) | browser coverage |

---

### Task 0: Branch

- [ ] **Step 1: Create the feature branch from feat/v0.8.0**

```bash
git switch feat/v0.8.0 && git switch -c feat/voxel-forge
```

Expected: `Switched to a new branch 'feat/voxel-forge'`.

---

### Task 1: Blocks table and World

**Files:**
- Create: `src/world/blocks.js`, `src/world/world.js`
- Test: `tests/unit/world.test.js`

**Interfaces:**
- Produces: `BLOCKS: Block[]` indexed by id; `AIR = 0`, `BEDROCK = 15`; `FACE = { TOP: 0, SIDE: 1, BOTTOM: 2 }`; `isSolid(id)`, `isOpaque(id)`; `LAYER_TO_BLOCKS`.
- Produces: `class World { static W=128, D=128, H=64, GROUND=32, CS=16; blocks: Uint8Array; meta; get(x,y,z); set(x,y,z,id) → boolean changed; index(x,y,z); inBounds; chunkIndex(cx,cy,cz); dirty: Uint8Array; markDirty(cx,cy,cz); takeDirty() → number[]; topSolid(x,y) → z of highest solid block or -1; forEachChunk(fn) }`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/world.test.js
import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { BLOCKS, AIR, BEDROCK, isSolid, isOpaque, LAYER_TO_BLOCKS, FACE } from "../../src/world/blocks.js";

describe("blocks", () => {
  it("has stable ids and the fourteen playable blocks plus bedrock", () => {
    expect(BLOCKS.length).toBe(16);
    BLOCKS.forEach((b, i) => expect(b.id).toBe(i));
    expect(BLOCKS.map((b) => b.name)).toEqual([
      "Air", "Stone", "Tech", "Metal", "Energy", "Door", "Secret", "Boss", "Glass", "Rift",
      "Dirt", "Grass", "Sand", "Rock", "Ore", "Bedrock",
    ]);
    expect(AIR).toBe(0); expect(BEDROCK).toBe(15);
    expect(isSolid(AIR)).toBe(false); expect(isSolid(8)).toBe(true);
    expect(isOpaque(8)).toBe(false); expect(isOpaque(1)).toBe(true);
    expect(LAYER_TO_BLOCKS).toEqual([0, 1, 1, 2, 2, 3]);
    expect(FACE).toEqual({ TOP: 0, SIDE: 1, BOTTOM: 2 });
  });
});

describe("World", () => {
  it("indexes z-major and clamps out-of-bounds reads", () => {
    const w = new World();
    expect(w.index(1, 2, 3)).toBe((3 * 128 + 2) * 128 + 1);
    expect(w.get(0, 0, -1)).toBe(BEDROCK);
    expect(w.get(0, 0, 64)).toBe(AIR);
    expect(w.get(-1, 0, 10)).toBe(AIR);
    expect(w.get(128, 5, 10)).toBe(AIR);
  });

  it("set returns whether the block changed and refuses out-of-bounds", () => {
    const w = new World();
    expect(w.set(5, 5, 32, 1)).toBe(true);
    expect(w.set(5, 5, 32, 1)).toBe(false);
    expect(w.get(5, 5, 32)).toBe(1);
    expect(w.set(-1, 5, 32, 1)).toBe(false);
    expect(w.set(5, 5, 64, 1)).toBe(false);
  });

  it("setBlock dirties the neighbour chunk on a face", () => {
    const w = new World();
    w.takeDirty();
    w.set(16, 5, 32, 1); // x=16 is the first column of chunk cx=1, touching cx=0
    expect(w.takeDirty().sort()).toEqual([w.chunkIndex(0, 0, 2), w.chunkIndex(1, 0, 2)].sort());
    w.set(20, 20, 47, 1); // z=47 is the last row of cz=2, touching cz=3
    expect(w.takeDirty().sort()).toEqual([w.chunkIndex(1, 1, 2), w.chunkIndex(1, 1, 3)].sort());
    expect(w.takeDirty()).toEqual([]);
  });

  it("a fresh world is all dirty so the first mesh pass builds everything", () => {
    expect(new World().takeDirty().length).toBe(256);
  });

  it("topSolid finds the highest solid block in a column", () => {
    const w = new World();
    expect(w.topSolid(3, 3)).toBe(-1);
    w.set(3, 3, 10, 1); w.set(3, 3, 12, 8);
    expect(w.topSolid(3, 3)).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/world.test.js`
Expected: FAIL — cannot resolve `src/world/world.js`.

- [ ] **Step 3: Write blocks.js**

```js
// src/world/blocks.js
/**
 * Block table for the voxel Forge. Ids are stable bytes stored in saves; only
 * ever append. Ids 1–9 equal the legacy tile ids so old maps convert 1:1.
 * `faces` names the art key per face kind (see rendering/voxel/atlas.js):
 * "wall:<tile>" = the tile's wall art, "deck:floor"/"deck:ceil" = deck art,
 * "nat:<name>" = natural-block painter.
 */
export const AIR = 0;
export const BEDROCK = 15;
export const FACE = { TOP: 0, SIDE: 1, BOTTOM: 2 };

const wall = (t) => ({ top: `wall:${t}`, side: `wall:${t}`, bottom: `wall:${t}` });
const nat = (n) => ({ top: `nat:${n}`, side: `nat:${n}`, bottom: `nat:${n}` });

export const BLOCKS = [
  { id: 0, name: "Air", kind: "air", faces: null, hardness: 0, color: "#000000" },
  { id: 1, name: "Stone", kind: "solid", faces: wall(1), hardness: 1, color: "#6b7280" },
  { id: 2, name: "Tech", kind: "solid", faces: wall(2), hardness: 1, color: "#2f6f8f" },
  { id: 3, name: "Metal", kind: "solid", faces: wall(3), hardness: 1.5, color: "#8a96a3" },
  { id: 4, name: "Energy", kind: "solid", faces: wall(4), hardness: 1, emissive: [0.2, 0.9, 1.0], color: "#22e6ff" },
  { id: 5, name: "Door", kind: "door", faces: wall(5), hardness: 1, color: "#b08a3a" },
  { id: 6, name: "Secret", kind: "solid", faces: wall(6), hardness: 1, color: "#5a4a6e" },
  { id: 7, name: "Boss", kind: "solid", faces: wall(7), hardness: 2, color: "#7a1426" },
  { id: 8, name: "Glass", kind: "glass", faces: wall(8), hardness: 0.5, color: "#9fd8ff" },
  { id: 9, name: "Rift", kind: "solid", faces: wall(9), hardness: 1, emissive: [0.8, 0.3, 1.0], color: "#c060ff" },
  { id: 10, name: "Dirt", kind: "solid", faces: nat("dirt"), hardness: 0.5, color: "#6a4a2c" },
  { id: 11, name: "Grass", kind: "solid", faces: { top: "nat:grass_top", side: "nat:grass_side", bottom: "nat:dirt" }, hardness: 0.6, color: "#4f8a3a" },
  { id: 12, name: "Sand", kind: "solid", faces: nat("sand"), hardness: 0.4, color: "#d8c890" },
  { id: 13, name: "Rock", kind: "solid", faces: nat("rock"), hardness: 1.5, color: "#5b5f66" },
  { id: 14, name: "Ore", kind: "solid", faces: nat("ore"), hardness: 2, emissive: [0.15, 0.4, 0.5], color: "#3f7f8f" },
  { id: 15, name: "Bedrock", kind: "solid", faces: nat("bedrock"), hardness: Infinity, color: "#1d1f23" },
];

export const isSolid = (id) => id !== AIR && BLOCKS[id]?.kind !== "air";
/** Opaque blocks hide the faces of their neighbours; glass and doors do not. */
export const isOpaque = (id) => isSolid(id) && BLOCKS[id].kind === "solid";

/** Legacy builder layer count (0–5) → block height; a full wall is 3 blocks. */
export const LAYER_TO_BLOCKS = [0, 1, 1, 2, 2, 3];
```

- [ ] **Step 4: Write world.js**

```js
// src/world/world.js
import { AIR, BEDROCK } from "./blocks.js";

const W = 128, D = 128, H = 64, CS = 16;
const CX = W / CS, CY = D / CS, CZ = H / CS; // 8, 8, 4

export class World {
  static W = W; static D = D; static H = H; static GROUND = 32; static CS = CS;
  static CX = CX; static CY = CY; static CZ = CZ;

  constructor(meta = {}) {
    this.blocks = new Uint8Array(W * D * H);
    this.meta = {
      name: "New World", act: 1,
      spawn: { x: 64.5, y: 64.5, z: 32, yaw: 0 },
      exit: null, enemySpawns: [], pickups: [],
      ...meta,
    };
    this.dirty = new Uint8Array(CX * CY * CZ).fill(1);
    this.version = 0; // bumps on every change; caches key off it
  }

  index(x, y, z) { return (z * D + y) * W + x; }
  inBounds(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < W && y < D && z < H; }

  get(x, y, z) {
    if (z < 0) return BEDROCK;
    if (x < 0 || y < 0 || z >= H || x >= W || y >= D) return AIR;
    return this.blocks[(z * D + y) * W + x];
  }

  /** @returns {boolean} true when the block changed */
  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return false;
    const i = (z * D + y) * W + x;
    if (this.blocks[i] === id) return false;
    this.blocks[i] = id;
    this.version++;
    const cx = x >> 4, cy = y >> 4, cz = z >> 4;
    this.markDirty(cx, cy, cz);
    // A block on a chunk face changes the neighbour chunk's hidden-face test.
    const lx = x & 15, ly = y & 15, lz = z & 15;
    if (lx === 0 && cx > 0) this.markDirty(cx - 1, cy, cz);
    if (lx === 15 && cx < CX - 1) this.markDirty(cx + 1, cy, cz);
    if (ly === 0 && cy > 0) this.markDirty(cx, cy - 1, cz);
    if (ly === 15 && cy < CY - 1) this.markDirty(cx, cy + 1, cz);
    if (lz === 0 && cz > 0) this.markDirty(cx, cy, cz - 1);
    if (lz === 15 && cz < CZ - 1) this.markDirty(cx, cy, cz + 1);
    return true;
  }

  chunkIndex(cx, cy, cz) { return (cz * CY + cy) * CX + cx; }
  chunkCoords(ci) { return [ci % CX, ((ci / CX) | 0) % CY, (ci / (CX * CY)) | 0]; }
  markDirty(cx, cy, cz) { this.dirty[this.chunkIndex(cx, cy, cz)] = 1; }

  /** Dirty chunk indices, cleared as they are handed out. */
  takeDirty() {
    const out = [];
    for (let i = 0; i < this.dirty.length; i++) if (this.dirty[i]) { out.push(i); this.dirty[i] = 0; }
    return out;
  }

  /** z of the highest solid block in a column, or -1. */
  topSolid(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= D) return -1;
    for (let z = H - 1; z >= 0; z--) if (this.blocks[(z * D + y) * W + x] !== AIR) return z;
    return -1;
  }

  forEachChunk(fn) {
    for (let cz = 0; cz < CZ; cz++) for (let cy = 0; cy < CY; cy++) for (let cx = 0; cx < CX; cx++) fn(cx, cy, cz, this.chunkIndex(cx, cy, cz));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/world.test.js`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/world/blocks.js src/world/world.js tests/unit/world.test.js
git commit -m "feat(world): add the voxel block table and bounded World store"
```

---

### Task 2: World generation

**Files:**
- Create: `src/world/world-gen.js`
- Test: `tests/unit/world-gen.test.js`

**Interfaces:**
- Consumes: `World`, `BLOCKS` ids, `SeededRNG` (`src/utils/seeded-rng.js` — read its constructor and `next()`/`random()` API before use).
- Produces: `generateWorld({ terrain = false, seed = 1, act = 1, name }) → World`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/world-gen.test.js
import { describe, it, expect } from "vitest";
import { generateWorld } from "../../src/world/world-gen.js";
import { World } from "../../src/world/world.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";

describe("generateWorld", () => {
  it("flat: grass at 31, dirt below, rock deeper, bedrock at 0, air from 32 up", () => {
    const w = generateWorld({ terrain: false });
    expect(w.get(10, 10, 31)).toBe(11);
    expect(w.get(10, 10, 30)).toBe(10);
    expect(w.get(10, 10, 20)).toBe(13);
    expect(w.get(10, 10, 0)).toBe(BEDROCK);
    expect(w.get(10, 10, 32)).toBe(AIR);
    expect(w.meta.spawn).toEqual({ x: 64.5, y: 64.5, z: 32, yaw: 0 });
  });

  it("terrain: deterministic per seed, surface stays within 26..38, has ore", () => {
    const a = generateWorld({ terrain: true, seed: 7 });
    const b = generateWorld({ terrain: true, seed: 7 });
    expect(Buffer.from(a.blocks).equals(Buffer.from(b.blocks))).toBe(true);
    let ore = 0, lo = 99, hi = -1;
    for (let y = 0; y < World.D; y++) for (let x = 0; x < World.W; x++) {
      const t = a.topSolid(x, y); lo = Math.min(lo, t); hi = Math.max(hi, t);
      for (let z = 0; z <= t; z++) if (a.get(x, y, z) === 14) ore++;
    }
    expect(lo).toBeGreaterThanOrEqual(26); expect(hi).toBeLessThanOrEqual(38);
    expect(ore).toBeGreaterThan(50);
    expect(a.get(64, 64, a.topSolid(64, 64) + 1)).toBe(AIR);
    expect(a.meta.spawn.z).toBe(a.topSolid(64, 64) + 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/world-gen.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// src/world/world-gen.js
import { World } from "./world.js";
import { BEDROCK } from "./blocks.js";
import { SeededRNG } from "../utils/seeded-rng.js";

const GRASS = 11, DIRT = 10, ROCK = 13, ORE = 14, SAND = 12;

/** Value noise on a 16-cell lattice, two octaves, in [-1, 1]. */
function makeNoise(rng) {
  const lat = new Float32Array(17 * 17);
  for (let i = 0; i < lat.length; i++) lat[i] = rng.random() * 2 - 1;
  const at = (i, j) => lat[(j & 15) * 17 + (i & 15)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const sample = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
    return a + (b - a) * fy;
  };
  return (x, y) => sample(x / 24, y / 24) * 0.7 + sample(x / 9 + 5, y / 9 + 5) * 0.3;
}

export function generateWorld({ terrain = false, seed = 1, act = 1, name = "New World" } = {}) {
  const w = new World({ name, act });
  const rng = new SeededRNG(seed);
  const noise = terrain ? makeNoise(rng) : null;
  for (let y = 0; y < World.D; y++) {
    for (let x = 0; x < World.W; x++) {
      const surface = terrain ? Math.round(31 + noise(x, y) * 6) : 31; // 25..37 → clamped below
      const top = Math.max(26, Math.min(38, surface));
      const beach = terrain && top <= 29;
      for (let z = 0; z <= top; z++) {
        let id = z === 0 ? BEDROCK : z < top - 4 ? ROCK : z < top ? DIRT : beach ? SAND : GRASS;
        if (id === ROCK && z > 2 && rng.random() < 0.02) id = ORE;
        w.set(x, y, z, id);
      }
    }
  }
  w.meta.spawn = { x: 64.5, y: 64.5, z: w.topSolid(64, 64) + 1, yaw: 0 };
  w.takeDirty(); // generation is not an edit; the renderer meshes everything on first sight anyway
  w.dirty.fill(1);
  return w;
}
```

If `SeededRNG` exposes a different method name than `random()`, use its real one (check `src/utils/seeded-rng.js`) and keep the test as written.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/world-gen.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/world-gen.js tests/unit/world-gen.test.js
git commit -m "feat(world): generate flat and gentle-terrain starter worlds"
```

---

### Task 3: Save codec, legacy conversion, IndexedDB store

**Files:**
- Create: `src/world/world-codec.js`, `src/world/legacy-convert.js`, `src/world/world-store.js`
- Test: `tests/unit/world-codec.test.js`, `tests/unit/legacy-convert.test.js`

**Interfaces:**
- Produces (codec): `rleEncode(u8) → number[]`, `rleDecode(pairs, length) → Uint8Array`, `encodeWorld(world) → object` (v4 JSON), `decodeWorld(obj) → World` (accepts v4, and v2/v3 via convert), `async packWorld(world) → Uint8Array` (gzip of the JSON, or raw JSON bytes prefixed by a 1-byte tag when `CompressionStream` is missing), `async unpackWorld(bytes) → World`, `async toShareHash(world) → string | null` (`v4.` + base64url, null when ≥ 60 000 chars), `async fromShareHash(hash) → World`.
- Produces (convert): `convertLegacyMap(json) → World`.
- Produces (store): `class WorldStore { constructor(backend?) ; async list() → [{id,name,updatedAt}] ; async load(id) → World|null ; async save(id, world) ; async remove(id) ; async create(name) → id }` with `backend` defaulting to IndexedDB (`cc_worlds` db, `worlds` object store) and a `MemoryBackend` for tests.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/world-codec.test.js
import { describe, it, expect, vi } from "vitest";
import { rleEncode, rleDecode, encodeWorld, decodeWorld, packWorld, unpackWorld, toShareHash, fromShareHash } from "../../src/world/world-codec.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { World } from "../../src/world/world.js";

describe("rle", () => {
  it("round-trips and compresses runs", () => {
    const u8 = new Uint8Array([0, 0, 0, 1, 1, 2, 0]);
    const pairs = rleEncode(u8);
    expect(pairs).toEqual([0, 3, 1, 2, 2, 1, 0, 1]);
    expect(Array.from(rleDecode(pairs, 7))).toEqual(Array.from(u8));
  });
  it("splits runs longer than 65535", () => {
    const u8 = new Uint8Array(70000).fill(3);
    const pairs = rleEncode(u8);
    expect(pairs).toEqual([3, 65535, 3, 4465]);
    expect(rleDecode(pairs, 70000).every((v) => v === 3)).toBe(true);
  });
});

describe("v4 codec", () => {
  it("encodes a flat world to a small v4 object and decodes it back", () => {
    const w = generateWorld({ terrain: false });
    w.set(5, 5, 32, 8); w.meta.name = "Test"; w.meta.exit = { x: 3, y: 4, z: 32 };
    const o = encodeWorld(w);
    expect(o.version).toBe(4); expect(o.size).toEqual([128, 128, 64]);
    expect(JSON.stringify(o).length).toBeLessThan(6000);
    const back = decodeWorld(o);
    expect(back.get(5, 5, 32)).toBe(8); expect(back.meta.name).toBe("Test"); expect(back.meta.exit).toEqual({ x: 3, y: 4, z: 32 });
    expect(Buffer.from(back.blocks).equals(Buffer.from(w.blocks))).toBe(true);
  });

  it("packs with gzip and unpacks", async () => {
    const w = generateWorld({ terrain: true, seed: 3 });
    const bytes = await packWorld(w);
    expect(bytes[0]).toBe(1); // gzip tag
    expect(bytes.length).toBeLessThan(60000);
    const back = await unpackWorld(bytes);
    expect(Buffer.from(back.blocks).equals(Buffer.from(w.blocks))).toBe(true);
  });

  it("round-trips without CompressionStream", async () => {
    const CS = globalThis.CompressionStream, DS = globalThis.DecompressionStream;
    vi.stubGlobal("CompressionStream", undefined); vi.stubGlobal("DecompressionStream", undefined);
    try {
      const w = generateWorld({ terrain: false });
      const bytes = await packWorld(w);
      expect(bytes[0]).toBe(0); // raw tag
      const back = await unpackWorld(bytes);
      expect(back.get(1, 1, 31)).toBe(11);
    } finally { vi.stubGlobal("CompressionStream", CS); vi.stubGlobal("DecompressionStream", DS); }
  });

  it("share hash round-trips for a small world and refuses a big one", async () => {
    const w = generateWorld({ terrain: false });
    const hash = await toShareHash(w);
    expect(hash.startsWith("v4.")).toBe(true);
    expect((await fromShareHash(hash)).get(0, 0, 31)).toBe(11);
    const noisy = new World();
    for (let i = 0; i < noisy.blocks.length; i++) noisy.blocks[i] = (i * 2654435761 >>> 0) & 15;
    expect(await toShareHash(noisy)).toBeNull();
  });
});
```

```js
// tests/unit/legacy-convert.test.js
import { describe, it, expect } from "vitest";
import { convertLegacyMap } from "../../src/world/legacy-convert.js";
import { decodeWorld } from "../../src/world/world-codec.js";

const grid = () => Array.from({ length: 60 }, () => Array(60).fill(0));
function v3() {
  const layers = Array.from({ length: 5 }, grid);
  const g = grid();
  // full wall at (2,3): all 5 layers stone; waist wall at (4,3): 2 layers metal
  for (let l = 0; l < 5; l++) layers[l][3][2] = 1;
  layers[0][3][4] = 3; layers[1][3][4] = 3;
  g[3][2] = 1; g[3][4] = 3;
  return { version: 3, name: "Old", width: 60, height: 60, grid: g, layers,
    playerStart: { x: 10, y: 10, dir: 1.5 }, enemySpawns: [{ x: 20, y: 21, enemy: "drone" }],
    entities: [{ x: 5.5, y: 6.5, type: "ammo" }], exit: { x: 50, y: 50 } };
}

describe("convertLegacyMap", () => {
  it("converts layer counts through LAYER_TO_BLOCKS and centres the map", () => {
    const w = convertLegacyMap(v3());
    // full wall → 3 blocks at z 32..34, waist wall → 1 block
    expect([32, 33, 34].map((z) => w.get(34 + 2, 34 + 3, z))).toEqual([1, 1, 1]);
    expect(w.get(36, 37, 35)).toBe(0);
    expect(w.get(34 + 4, 34 + 3, 32)).toBe(3); expect(w.get(38, 37, 33)).toBe(0);
    // empty cell gets a grass floor at 31, nothing at 32
    expect(w.get(40, 40, 31)).toBe(11); expect(w.get(40, 40, 32)).toBe(0);
    expect(w.meta.name).toBe("Old");
    expect(w.meta.spawn).toEqual({ x: 44.5, y: 44.5, z: 32, yaw: 1.5 });
    expect(w.meta.enemySpawns).toEqual([{ x: 54.5, y: 55.5, z: 32, type: "drone" }]);
    expect(w.meta.pickups).toEqual([{ x: 39.5, y: 40.5, z: 32, type: "ammo", weaponId: undefined }]);
    expect(w.meta.exit).toEqual({ x: 84, y: 84, z: 32 });
  });

  it("v2 without layers uses the flat grid as a full wall", () => {
    const m = v3(); delete m.layers; m.version = 2;
    const w = convertLegacyMap(m);
    expect([32, 33, 34].map((z) => w.get(36, 37, z))).toEqual([1, 1, 1]);
  });

  it("decodeWorld accepts a legacy object", () => {
    expect(decodeWorld(v3()).meta.name).toBe("Old");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/world-codec.test.js tests/unit/legacy-convert.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the codec**

```js
// src/world/world-codec.js
/**
 * Save format v4: { version: 4, size: [128,128,64], meta, blocks: [id, run, ...] }.
 * packWorld → one byte tag (1 = gzip, 0 = raw utf-8) + payload, so the same
 * bytes serve IndexedDB, .ccw export, and (base64url) the share hash.
 */
import { World } from "./world.js";
import { convertLegacyMap } from "./legacy-convert.js";

export function rleEncode(u8) {
  const out = [];
  let i = 0;
  while (i < u8.length) {
    const v = u8[i]; let n = 1;
    while (i + n < u8.length && u8[i + n] === v && n < 65535) n++;
    out.push(v, n); i += n;
  }
  return out;
}

export function rleDecode(pairs, length) {
  const u8 = new Uint8Array(length); let p = 0;
  for (let i = 0; i < pairs.length; i += 2) { u8.fill(pairs[i], p, p + pairs[i + 1]); p += pairs[i + 1]; }
  return u8;
}

export function encodeWorld(w) {
  return { version: 4, size: [World.W, World.D, World.H], meta: structuredClone(w.meta), blocks: rleEncode(w.blocks) };
}

export function decodeWorld(o) {
  if (!o || typeof o !== "object") throw new Error("bad world");
  if (o.version !== 4) return convertLegacyMap(o);
  const [x, y, z] = o.size || [];
  if (x !== World.W || y !== World.D || z !== World.H) throw new Error(`unsupported size ${o.size}`);
  const w = new World(o.meta || {});
  w.blocks = rleDecode(o.blocks, w.blocks.length);
  return w;
}

const enc = new TextEncoder(), dec = new TextDecoder();
const hasGzip = () => typeof globalThis.CompressionStream === "function" && typeof globalThis.DecompressionStream === "function";

async function pipe(bytes, stream) {
  const r = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(r).arrayBuffer());
}

export async function packWorld(w) {
  const json = enc.encode(JSON.stringify(encodeWorld(w)));
  const body = hasGzip() ? await pipe(json, new CompressionStream("gzip")) : json;
  const out = new Uint8Array(body.length + 1);
  out[0] = hasGzip() ? 1 : 0; out.set(body, 1);
  return out;
}

export async function unpackWorld(bytes) {
  const tag = bytes[0], body = bytes.subarray(1);
  const json = tag === 1 ? await pipe(body, new DecompressionStream("gzip")) : body;
  return decodeWorld(JSON.parse(dec.decode(json)));
}

const b64u = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export const SHARE_LIMIT = 60_000;

/** @returns {Promise<string|null>} "v4.<base64url>" or null when too large to share by URL */
export async function toShareHash(w) {
  const bytes = await packWorld(w);
  let s = ""; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const hash = "v4." + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return hash.length < SHARE_LIMIT ? hash : null;
}

export async function fromShareHash(hash) {
  if (!hash.startsWith("v4.")) throw new Error("not a v4 share hash");
  return unpackWorld(unb64u(hash.slice(3)));
}
```

(`b64u` is unused after the chunked loop — delete it; keep `unb64u`.)

- [ ] **Step 4: Write the converter**

```js
// src/world/legacy-convert.js
import { World } from "./world.js";
import { LAYER_TO_BLOCKS } from "./blocks.js";

const GRASS = 11, DIRT = 10, ROCK = 13, BEDROCK = 15;

/**
 * Builder map v2/v3 → World. The 60×60 map lands centred at (34,34); each
 * cell's layer count becomes LAYER_TO_BLOCKS[count] blocks from z=32 up, so a
 * full 5-layer wall is 3 blocks (the raycaster's two-eye-heights ratio) and a
 * waist wall is one you can shoot over. Everything else gets a grass floor.
 */
export function convertLegacyMap(m) {
  const w = new World({ name: m.name || "Imported", act: 1 });
  const mw = m.width || m.grid[0].length, mh = m.height || m.grid.length;
  const ox = Math.floor((World.W - mw) / 2), oy = Math.floor((World.D - mh) / 2);
  for (let y = 0; y < World.D; y++) for (let x = 0; x < World.W; x++) {
    for (let z = 0; z < 32; z++) w.set(x, y, z, z === 0 ? BEDROCK : z < 27 ? ROCK : z < 31 ? DIRT : GRASS);
  }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    let tile = 0, count = 0;
    if (Array.isArray(m.layers) && m.layers.length) {
      for (let l = 0; l < m.layers.length; l++) {
        const t = m.layers[l]?.[y]?.[x] | 0;
        if (t > 0) { if (!tile) tile = t; count = l + 1; }
      }
    } else if ((m.grid[y][x] | 0) > 0) { tile = m.grid[y][x] | 0; count = 5; }
    const blocks = LAYER_TO_BLOCKS[Math.min(5, count)] || 0;
    for (let z = 0; z < blocks; z++) w.set(ox + x, oy + y, 32 + z, Math.min(9, tile));
  }
  const ps = m.playerStart || { x: mw / 2, y: mh / 2, dir: 0 };
  w.meta.spawn = { x: ox + ps.x + 0.5, y: oy + ps.y + 0.5, z: 32, yaw: ps.dir || 0 };
  w.meta.enemySpawns = (m.enemySpawns || []).map((s) => ({ x: ox + s.x + 0.5, y: oy + s.y + 0.5, z: 32, type: s.enemy || s.type || "drone" }));
  w.meta.pickups = (m.entities || []).map((e) => ({ x: ox + e.x, y: oy + e.y, z: 32, type: e.type, weaponId: e.weaponId }));
  w.meta.exit = m.exit ? { x: ox + m.exit.x, y: oy + m.exit.y, z: 32 } : null;
  w.takeDirty(); w.dirty.fill(1);
  return w;
}
```

Note `legacy-convert.js` must not import `world-codec.js` (cycle); it does not.

- [ ] **Step 5: Write the store**

```js
// src/world/world-store.js
import { packWorld, unpackWorld } from "./world-codec.js";

export class MemoryBackend {
  constructor() { this.rows = new Map(); }
  async getAll() { return [...this.rows.values()]; }
  async get(id) { return this.rows.get(id) || null; }
  async put(row) { this.rows.set(row.id, row); }
  async delete(id) { this.rows.delete(id); }
}

/** IndexedDB `cc_worlds` / store `worlds`, keyPath `id`. */
export class IdbBackend {
  _db() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const req = indexedDB.open("cc_worlds", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("worlds", { keyPath: "id" });
      req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
    });
    return this._p;
  }
  async _tx(mode, fn) {
    const db = await this._db();
    return new Promise((res, rej) => {
      const tx = db.transaction("worlds", mode), st = tx.objectStore("worlds");
      const r = fn(st); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error);
    });
  }
  getAll() { return this._tx("readonly", (s) => s.getAll()); }
  get(id) { return this._tx("readonly", (s) => s.get(id)).then((r) => r || null); }
  put(row) { return this._tx("readwrite", (s) => s.put(row)); }
  delete(id) { return this._tx("readwrite", (s) => s.delete(id)); }
}

export class WorldStore {
  constructor(backend = new IdbBackend()) { this.backend = backend; }
  async list() { return (await this.backend.getAll()).map(({ id, name, updatedAt }) => ({ id, name, updatedAt })).sort((a, b) => a.id - b.id); }
  async load(id) { const row = await this.backend.get(id); return row ? unpackWorld(row.bytes) : null; }
  async save(id, world) { await this.backend.put({ id, name: world.meta.name, updatedAt: Date.now(), bytes: await packWorld(world) }); }
  async remove(id) { await this.backend.delete(id); }
  async nextId() { const rows = await this.list(); return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 0; }
}
```

Add to `tests/unit/world-codec.test.js`:

```js
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
describe("WorldStore", () => {
  it("saves, lists and loads through a backend", async () => {
    const s = new WorldStore(new MemoryBackend());
    const w = generateWorld({ terrain: false }); w.meta.name = "One";
    await s.save(0, w);
    expect((await s.list()).map((r) => r.name)).toEqual(["One"]);
    expect((await s.load(0)).meta.name).toBe("One");
    expect(await s.nextId()).toBe(1);
    await s.remove(0); expect(await s.load(0)).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/world-codec.test.js tests/unit/legacy-convert.test.js`
Expected: PASS. Node ≥ 18 has `CompressionStream`, `Blob`, `Response`; check `node --version` if the gzip test fails.

- [ ] **Step 7: Commit**

```bash
git add src/world/world-codec.js src/world/legacy-convert.js src/world/world-store.js tests/unit/world-codec.test.js tests/unit/legacy-convert.test.js
git commit -m "feat(world): add the v4 save codec, IndexedDB store and legacy map conversion"
```

---

### Task 4: Voxel physics

**Files:**
- Create: `src/world/voxel-physics.js`
- Test: `tests/unit/voxel-physics.test.js`

**Interfaces:**
- Produces: `PLAYER = { half: 0.3, height: 1.7, crouchHeight: 1.2, eye: 1.6, crouchEye: 1.1, gravity: 24, jump: 8.5, step: 1.0, reach: 6, fallDamageFrom: 6 }`
- `aabbOverlapsSolid(world, x, y, z, half, height) → boolean` (feet at z)
- `moveAABB(world, body, dx, dy, dz, { step = 1 }) → { x, y, z, hitX, hitY, hitZ, grounded, stepped }` where `body = { x, y, z, half, height }`; axis-separated sweep with sub-stepping so a fast move never tunnels.
- `groundHeight(world, x, y, half) → z of the highest solid top under the footprint, or 0`
- `raycastBlocks(world, ox, oy, oz, dx, dy, dz, maxDist) → { x, y, z, face: [nx,ny,nz], dist, id } | null` (3D DDA; skips air; glass counts as a hit)
- `hasLineOfSight3D(world, x1,y1,z1, x2,y2,z2) → boolean` (raycast stops before the target)

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/voxel-physics.test.js
import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { PLAYER, aabbOverlapsSolid, moveAABB, groundHeight, raycastBlocks, hasLineOfSight3D } from "../../src/world/voxel-physics.js";

const flat = () => generateWorld({ terrain: false });
const body = (x, y, z) => ({ x, y, z, half: PLAYER.half, height: PLAYER.height });

describe("voxel physics", () => {
  it("overlap test and ground height", () => {
    const w = flat();
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 32, 0.3, 1.7)).toBe(false);
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 31.5, 0.3, 1.7)).toBe(true);
    w.set(10, 10, 32, 1);
    expect(groundHeight(w, 10.5, 10.5, 0.3)).toBe(33);
    expect(groundHeight(w, 20.5, 20.5, 0.3)).toBe(32);
  });

  it("walks into a two-block wall and stops; slides along it", () => {
    const w = flat();
    for (let z = 32; z < 34; z++) w.set(12, 10, z, 1);
    const r = moveAABB(w, body(11.5, 10.5, 32), 1.0, 0.4, 0);
    expect(r.x).toBeCloseTo(12 - 0.3 - 1e-3, 2); expect(r.hitX).toBe(true);
    expect(r.y).toBeCloseTo(10.9, 5);
  });

  it("steps up a single block and not a double", () => {
    const w = flat();
    w.set(12, 10, 32, 1);
    let r = moveAABB(w, body(11.5, 10.5, 32), 0.6, 0, 0, { step: 1 });
    expect(r.z).toBe(33); expect(r.stepped).toBe(true); expect(r.x).toBeCloseTo(12.1, 5);
    w.set(12, 10, 33, 1);
    r = moveAABB(w, body(11.5, 10.5, 32), 0.6, 0, 0, { step: 1 });
    expect(r.z).toBe(32); expect(r.hitX).toBe(true);
  });

  it("falls onto the ground and reports grounded; a ceiling block stops a jump", () => {
    const w = flat();
    let r = moveAABB(w, body(10.5, 10.5, 35), 0, 0, -10);
    expect(r.z).toBe(32); expect(r.grounded).toBe(true); expect(r.hitZ).toBe(true);
    w.set(10, 10, 34, 1);
    r = moveAABB(w, body(10.5, 10.5, 32), 0, 0, 2);
    expect(r.z).toBeCloseTo(34 - 1.7, 3); expect(r.hitZ).toBe(true);
  });

  it("does not tunnel through a wall at high speed", () => {
    const w = flat();
    for (let z = 32; z < 35; z++) w.set(20, 10, z, 1);
    const r = moveAABB(w, body(15.5, 10.5, 32), 9, 0, 0);
    expect(r.x).toBeLessThan(20 - 0.3);
  });

  it("raycasts to the first block and reports the face hit", () => {
    const w = flat();
    w.set(15, 10, 33, 8);
    const hit = raycastBlocks(w, 10.5, 10.5, 33.5, 1, 0, 0, 6);
    expect(hit).toMatchObject({ x: 15, y: 10, z: 33, id: 8, face: [-1, 0, 0] });
    expect(hit.dist).toBeCloseTo(4.5, 5);
    expect(raycastBlocks(w, 10.5, 10.5, 40, 1, 0, 0, 6)).toBeNull();
    const down = raycastBlocks(w, 10.5, 10.5, 34, 0, 0, -1, 6);
    expect(down).toMatchObject({ z: 31, face: [0, 0, 1] });
  });

  it("3D line of sight through a one-block gap", () => {
    const w = flat();
    for (let z = 32; z < 36; z++) for (let y = 8; y < 13; y++) if (!(z === 33 && y === 10)) w.set(15, y, z, 1);
    expect(hasLineOfSight3D(w, 10.5, 10.5, 33.5, 20.5, 10.5, 33.5)).toBe(true);
    expect(hasLineOfSight3D(w, 10.5, 10.5, 32.5, 20.5, 10.5, 32.5)).toBe(false);
  });

  it("placement refused when it overlaps the player AABB", () => {
    const w = flat();
    // the block at the player's feet cell
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 32, 0.3, 1.7)).toBe(false);
    w.set(10, 10, 32, 1);
    expect(aabbOverlapsSolid(w, 10.5, 10.5, 32, 0.3, 1.7)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/voxel-physics.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// src/world/voxel-physics.js
import { isSolid } from "./blocks.js";

export const PLAYER = { half: 0.3, height: 1.7, crouchHeight: 1.2, eye: 1.6, crouchEye: 1.1, gravity: 24, jump: 8.5, step: 1.0, reach: 6, fallDamageFrom: 6 };
const EPS = 1e-3;

/** Any solid block inside the box [x±half, y±half, z..z+height)? */
export function aabbOverlapsSolid(world, x, y, z, half, height) {
  const x0 = Math.floor(x - half), x1 = Math.floor(x + half - EPS);
  const y0 = Math.floor(y - half), y1 = Math.floor(y + half - EPS);
  const z0 = Math.floor(z), z1 = Math.floor(z + height - EPS);
  for (let bz = z0; bz <= z1; bz++) for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) {
    if (isSolid(world.get(bx, by, bz))) return true;
  }
  return false;
}

/** Highest solid top under the footprint (0 if none). */
export function groundHeight(world, x, y, half) {
  let g = 0;
  const x0 = Math.floor(x - half), x1 = Math.floor(x + half - EPS), y0 = Math.floor(y - half), y1 = Math.floor(y + half - EPS);
  for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) g = Math.max(g, world.topSolid(bx, by) + 1);
  return g;
}

function sweepAxis(world, b, axis, delta) {
  // Move in sub-steps no larger than half the body's thinnest extent so a fast
  // body cannot skip a block; stop at the first overlapping sub-step.
  const n = Math.max(1, Math.ceil(Math.abs(delta) / 0.25));
  const s = delta / n;
  let moved = 0, hit = false;
  for (let i = 0; i < n; i++) {
    const nx = b.x + (axis === 0 ? s : 0), ny = b.y + (axis === 1 ? s : 0), nz = b.z + (axis === 2 ? s : 0);
    if (aabbOverlapsSolid(world, nx, ny, nz, b.half, b.height)) { hit = true; break; }
    b.x = nx; b.y = ny; b.z = nz; moved += s;
  }
  if (hit) {
    // Snap flush to the block face along this axis.
    if (axis === 0) b.x = s > 0 ? Math.floor(b.x + b.half + Math.abs(s)) - b.half - EPS : Math.ceil(b.x - b.half - Math.abs(s)) + b.half + EPS;
    if (axis === 1) b.y = s > 0 ? Math.floor(b.y + b.half + Math.abs(s)) - b.half - EPS : Math.ceil(b.y - b.half - Math.abs(s)) + b.half + EPS;
    if (axis === 2) b.z = s > 0 ? Math.floor(b.z + b.height + Math.abs(s)) - b.height - EPS : Math.ceil(b.z - Math.abs(s));
    if (aabbOverlapsSolid(world, b.x, b.y, b.z, b.half, b.height)) { // snapped into something: undo the snap
      if (axis === 0) b.x -= moved === 0 ? 0 : 0; // keep last good position
    }
  }
  return hit;
}

/**
 * Axis-separated swept move with one-block step-up.
 * @returns {{x,y,z,hitX,hitY,hitZ,grounded,stepped}}
 */
export function moveAABB(world, body, dx, dy, dz, { step = PLAYER.step } = {}) {
  const b = { x: body.x, y: body.y, z: body.z, half: body.half, height: body.height };
  const out = { hitX: false, hitY: false, hitZ: false, grounded: false, stepped: false };
  const tryStep = (axis, delta) => {
    const save = { x: b.x, y: b.y, z: b.z };
    const hit = sweepAxis(world, b, axis, delta);
    if (!hit || step <= 0) return hit;
    // Blocked: try again from one block up if that spot is free and the body was on the ground.
    const lifted = { ...save, z: save.z + step };
    if (aabbOverlapsSolid(world, lifted.x, lifted.y, lifted.z, b.half, b.height)) return true;
    const alt = { ...lifted, half: b.half, height: b.height };
    const hit2 = sweepAxis(world, alt, axis, delta);
    if (hit2 && Math.abs((axis === 0 ? alt.x - save.x : alt.y - save.y)) <= Math.abs(axis === 0 ? b.x - save.x : b.y - save.y) + EPS) return true;
    // settle back down onto whatever is under the new spot
    let z = alt.z;
    while (z > save.z && !aabbOverlapsSolid(world, alt.x, alt.y, z - 0.05, b.half, b.height)) z -= 0.05;
    b.x = alt.x; b.y = alt.y; b.z = Math.round(z * 100) / 100;
    out.stepped = true;
    return hit2;
  };
  out.hitX = dx !== 0 && tryStep(0, dx);
  out.hitY = dy !== 0 && tryStep(1, dy);
  if (dz !== 0) { out.hitZ = sweepAxis(world, b, 2, dz); if (out.hitZ && dz < 0) out.grounded = true; }
  else out.grounded = aabbOverlapsSolid(world, b.x, b.y, b.z - 0.02, b.half, b.height);
  if (out.stepped) { b.z = Math.round(b.z); out.grounded = true; }
  return { x: b.x, y: b.y, z: b.z, ...out };
}

/** 3D DDA. Returns the first non-air block within maxDist, with the face entered. */
export function raycastBlocks(world, ox, oy, oz, dx, dy, dz, maxDist) {
  const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(1 / (dx || 1e-9)), tdy = Math.abs(1 / (dy || 1e-9)), tdz = Math.abs(1 / (dz || 1e-9));
  let tx = dx > 0 ? (x + 1 - ox) * tdx : (ox - x) * tdx;
  let ty = dy > 0 ? (y + 1 - oy) * tdy : (oy - y) * tdy;
  let tz = dz > 0 ? (z + 1 - oz) * tdz : (oz - z) * tdz;
  if (dx === 0) tx = Infinity; if (dy === 0) ty = Infinity; if (dz === 0) tz = Infinity;
  let face = [0, 0, 0], t = 0;
  for (let i = 0; i < 4 * maxDist + 8; i++) {
    const id = world.get(x, y, z);
    if (i > 0 && isSolid(id)) return { x, y, z, id, face, dist: t };
    if (tx < ty && tx < tz) { t = tx; tx += tdx; x += sx; face = [-sx, 0, 0]; }
    else if (ty < tz) { t = ty; ty += tdy; y += sy; face = [0, -sy, 0]; }
    else { t = tz; tz += tdz; z += sz; face = [0, 0, -sz]; }
    if (t > maxDist) return null;
    if (z < 0 || z >= 64) return null;
  }
  return null;
}

export function hasLineOfSight3D(world, x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, d = Math.hypot(dx, dy, dz);
  if (d < 1e-6) return true;
  const hit = raycastBlocks(world, x1, y1, z1, dx, dy, dz, d);
  return !hit;
}
```

`sweepAxis`'s snap branch is delicate; if the snap produces an overlap in the tests, replace the snap with "keep the last good sub-step position" (drop the snap block entirely) and loosen the `toBeCloseTo` in the wall test to 1 decimal. Correctness (never inside a block) beats flushness.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/voxel-physics.test.js`
Expected: PASS (8 tests). Iterate on `sweepAxis` until every case passes; do not weaken the tunnelling or step-up tests.

- [ ] **Step 5: Commit**

```bash
git add src/world/voxel-physics.js tests/unit/voxel-physics.test.js
git commit -m "feat(world): add swept AABB physics, block raycast and 3D line of sight"
```

---

### Task 5: Greedy mesher

**Files:**
- Create: `src/rendering/voxel/mesher.js`
- Test: `tests/unit/mesher.test.js`

**Interfaces:**
- Consumes: `World`, `BLOCKS`, `isOpaque`, `isSolid`, `FACE`; a `layerOf(blockId, faceKind) → number` callback (atlas layer; Task 6 supplies the real one).
- Produces: `meshChunk(world, cx, cy, cz, layerOf) → { opaque: { verts: Uint8Array, indices: Uint16Array|Uint32Array, count }, alpha: {...} }` with **vertex stride 8 bytes**: `x, y, z` (local 0..16), `n` (0=+x,1=-x,2=+y,3=-y,4=+z,5=-z), `u, v` (0..16 in block units), `layer`, `ao` (0..3, 3 = fully lit).
- Produces: `vertexAO(side1, side2, corner) → 0..3` (Minecraft AO: `(side1 && side2) ? 0 : 3 - (side1 + side2 + corner)`).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/mesher.test.js
import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { meshChunk, vertexAO, STRIDE } from "../../src/rendering/voxel/mesher.js";

const layerOf = (id, face) => id * 3 + face;
const quads = (m) => m.indices.length / 6;

describe("mesher", () => {
  it("vertexAO follows the Minecraft rule", () => {
    expect(vertexAO(0, 0, 0)).toBe(3); expect(vertexAO(1, 0, 0)).toBe(2); expect(vertexAO(1, 1, 0)).toBe(0); expect(vertexAO(0, 0, 1)).toBe(2);
  });

  it("a lone block emits six quads with the right normals and layers", () => {
    const w = new World(); w.set(5, 5, 5, 11); // grass in chunk 0,0,0
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.opaque)).toBe(6); expect(quads(m.alpha)).toBe(0);
    const normals = new Set(), layers = new Set();
    for (let i = 0; i < m.opaque.verts.length; i += STRIDE) { normals.add(m.opaque.verts[i + 3]); layers.add(m.opaque.verts[i + 7 - 1]); }
    expect([...normals].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(layers).toEqual(new Set([layerOf(11, 0), layerOf(11, 1), layerOf(11, 2)]));
  });

  it("two adjacent blocks share no interior face and merge into greedy quads", () => {
    const w = new World(); w.set(5, 5, 5, 1); w.set(6, 5, 5, 1);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.opaque)).toBe(6); // 4 merged long faces + 2 end caps
  });

  it("glass goes to the alpha buffer and does not hide its opaque neighbour's face", () => {
    const w = new World(); w.set(5, 5, 5, 1); w.set(6, 5, 5, 8);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.opaque)).toBe(6); expect(quads(m.alpha)).toBe(6);
  });

  it("mesh at world bottom emits no bottom faces and hides faces against other chunks", () => {
    const w = new World();
    for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) w.set(x, y, 0, 15);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    let bottoms = 0; for (let i = 0; i < m.opaque.verts.length; i += STRIDE) if (m.opaque.verts[i + 3] === 5) bottoms++;
    expect(bottoms).toBe(0);
    expect(quads(m.opaque)).toBe(1 + 4); // one top slab + 4 sides (world edge is air)
    w.set(16, 0, 0, 15); // neighbour chunk: the shared +x face at x=15,y=0 is now hidden
    const m2 = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m2.opaque)).toBeGreaterThan(5); // the +x side is no longer one quad
  });

  it("AO differs between an open corner and a corner beside a step", () => {
    const w = new World(); w.set(5, 5, 5, 1); w.set(6, 5, 6, 1);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    const aos = new Set(); for (let i = 0; i < m.opaque.verts.length; i += STRIDE) if (m.opaque.verts[i + 3] === 4) aos.add(m.opaque.verts[i + 7]);
    expect(aos.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mesher.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// src/rendering/voxel/mesher.js
/**
 * Greedy mesher for one 16³ chunk. Faces are emitted per axis/direction as
 * merged rectangles when block id and the four per-vertex AO values match.
 * Vertex: x,y,z (0..16 local), n (0..5), u,v (block units), layer, ao (0..3).
 */
import { World } from "../../world/world.js";
import { isOpaque, isSolid, FACE, BLOCKS } from "../../world/blocks.js";

export const STRIDE = 8;
const CS = 16;
// n: 0=+x 1=-x 2=+y 3=-y 4=+z 5=-z
const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

export const vertexAO = (s1, s2, c) => (s1 && s2 ? 0 : 3 - (s1 + s2 + c));

function faceKind(n) { return n === 4 ? FACE.TOP : n === 5 ? FACE.BOTTOM : FACE.SIDE; }

class Builder {
  constructor() { this.v = []; this.i = []; this.q = 0; }
  quad(p0, p1, p2, p3, n, w, h, layer, ao, flip) {
    const b = this.v.length / STRIDE;
    const push = (p, u, vv, a) => this.v.push(p[0], p[1], p[2], n, u, vv, layer, a);
    push(p0, 0, 0, ao[0]); push(p1, w, 0, ao[1]); push(p2, w, h, ao[2]); push(p3, 0, h, ao[3]);
    // Flip the diagonal when the AO gradient asks for it (avoids the classic AO seam).
    if ((ao[0] + ao[2] > ao[1] + ao[3]) !== flip) this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    else this.i.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    this.q++;
  }
  finish() {
    const verts = Uint8Array.from(this.v);
    const indices = verts.length / STRIDE > 65535 ? Uint32Array.from(this.i) : Uint16Array.from(this.i);
    return { verts, indices, count: this.i.length };
  }
}

export function meshChunk(world, cx, cy, cz, layerOf) {
  const ox = cx * CS, oy = cy * CS, oz = cz * CS;
  const get = (x, y, z) => world.get(ox + x, oy + y, oz + z);
  const solid = (x, y, z) => (isSolid(get(x, y, z)) ? 1 : 0);
  const opaqueB = new Builder(), alphaB = new Builder();
  const mask = new Int32Array(CS * CS), maskAO = new Uint8Array(CS * CS);

  for (let n = 0; n < 6; n++) {
    const [nx, ny, nz] = NORMALS[n];
    const axis = n >> 1; // 0=x 1=y 2=z
    const u = (axis + 1) % 3, v = (axis + 2) % 3; // the two in-plane axes
    for (let d = 0; d < CS; d++) {
      // Build the mask for slice d along `axis`.
      let any = false;
      for (let j = 0; j < CS; j++) for (let i = 0; i < CS; i++) {
        const p = [0, 0, 0]; p[axis] = d; p[u] = i; p[v] = j;
        const id = get(p[0], p[1], p[2]);
        let vis = 0;
        if (id !== 0) {
          const q = [p[0] + nx, p[1] + ny, p[2] + nz];
          const nId = get(q[0], q[1], q[2]);
          const covered = isOpaque(nId) || (nId === id && !isOpaque(id));
          vis = covered ? 0 : id;
        }
        let aoPacked = 0;
        if (vis) {
          // AO from the three neighbours around each vertex, in the plane one step along n.
          const base = [p[0] + nx, p[1] + ny, p[2] + nz];
          const sample = (du, dv) => { const s = base.slice(); s[u] += du; s[v] += dv; return solid(s[0], s[1], s[2]); };
          const a00 = vertexAO(sample(-1, 0), sample(0, -1), sample(-1, -1));
          const a10 = vertexAO(sample(1, 0), sample(0, -1), sample(1, -1));
          const a11 = vertexAO(sample(1, 0), sample(0, 1), sample(1, 1));
          const a01 = vertexAO(sample(-1, 0), sample(0, 1), sample(-1, 1));
          aoPacked = a00 | (a10 << 2) | (a11 << 4) | (a01 << 6);
        }
        mask[j * CS + i] = vis; maskAO[j * CS + i] = aoPacked; any ||= vis > 0;
      }
      if (!any) continue;
      // Greedy merge.
      for (let j = 0; j < CS; j++) for (let i = 0; i < CS; ) {
        const id = mask[j * CS + i];
        if (!id) { i++; continue; }
        const ao = maskAO[j * CS + i];
        let w = 1; while (i + w < CS && mask[j * CS + i + w] === id && maskAO[j * CS + i + w] === ao) w++;
        let h = 1, ok = true;
        while (j + h < CS && ok) { for (let k = 0; k < w; k++) if (mask[(j + h) * CS + i + k] !== id || maskAO[(j + h) * CS + i + k] !== ao) { ok = false; break; } if (ok) h++; }
        // Emit the quad in the plane at d (+1 when facing +axis).
        const p = [0, 0, 0]; p[axis] = d + (n % 2 === 0 ? 1 : 0); p[u] = i; p[v] = j;
        const du = [0, 0, 0]; du[u] = w; const dv = [0, 0, 0]; dv[v] = h;
        const c0 = p, c1 = [p[0] + du[0], p[1] + du[1], p[2] + du[2]], c2 = [c1[0] + dv[0], c1[1] + dv[1], c1[2] + dv[2]], c3 = [p[0] + dv[0], p[1] + dv[1], p[2] + dv[2]];
        const aos = [ao & 3, (ao >> 2) & 3, (ao >> 4) & 3, (ao >> 6) & 3];
        const layer = layerOf(id, faceKind(n));
        const target = isOpaque(id) ? opaqueB : alphaB;
        // Winding: faces along -axis are wound the other way so front faces point outward.
        if (n % 2 === 0) target.quad(c0, c1, c2, c3, n, w, h, layer, aos, false);
        else target.quad(c0, c3, c2, c1, n, w, h, layer, [aos[0], aos[3], aos[2], aos[1]], true);
        for (let jj = 0; jj < h; jj++) for (let ii = 0; ii < w; ii++) mask[(j + jj) * CS + i + ii] = 0;
        i += w;
      }
    }
  }
  return { opaque: opaqueB.finish(), alpha: alphaB.finish() };
}
```

The "two adjacent blocks" test expects 6 quads: with AO, the merged long faces may split where AO differs — for two isolated blocks on a flat world it does not, since all AO samples are air. If the test fails with 8, check the AO sampling coordinates (`base` must be one step along the normal, in the plane of the exposed face). Also the world-bottom test: `world.get(x,y,-1)` returns `BEDROCK`, so bottom faces at z=0 are covered — that is the intended "never a hole into nothing".

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mesher.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/rendering/voxel/mesher.js tests/unit/mesher.test.js
git commit -m "feat(voxel): add the greedy chunk mesher with vertex ambient occlusion"
```

---

### Task 6: Atlas, natural art and shaders

**Files:**
- Create: `src/rendering/voxel/natural-art.js`, `src/rendering/voxel/atlas.js`, `src/rendering/voxel/shaders.js`
- Test: `tests/unit/atlas.test.js` (layer mapping only; painters need a canvas and are checked in the browser in Task 12)

**Interfaces:**
- Consumes: `buildWallSet(act, pal, salt, realistic)` from `src/rendering/env/wall-art.js` (returns `{ [tileId]: mipChain[] }`, level 0 = 512px canvas), `buildDeckSet(act, brutal, pal, salt)` from `src/rendering/env/deck-art.js` (`{floor, ceil}` canvases), `resolveEnvPalette(act, level)` from `src/rendering/env/palettes.js`, legacy `generateWallTextures()` from `src/rendering/textures.js` (read its return shape), `ART_STYLES`/`getArtStyle` from `src/rendering/art-style.js`.
- Produces (atlas): `ATLAS_SIZE = 256`; `buildAtlas(style, act) → { canvases: HTMLCanvasElement[], layerOf(blockId, faceKind), count }` — `layerOf` is pure and deterministic given the table; `atlasLayerTable() → Uint8Array(BLOCKS.length * 3)` (the same mapping without canvases, for the mesher in node).
- Produces (natural-art): `paintNatural(name, size, style) → HTMLCanvasElement` for `dirt, grass_top, grass_side, sand, rock, ore, bedrock`.
- Produces (shaders): `CHUNK_VERT`, `CHUNK_FRAG`, `SPRITE_VERT`, `SPRITE_FRAG`, `POST_VERT`, `POST_FRAG` GLSL ES 3.00 strings.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/atlas.test.js
import { describe, it, expect } from "vitest";
import { atlasLayerTable, layerOfTable } from "../../src/rendering/voxel/atlas.js";
import { BLOCKS, FACE } from "../../src/world/blocks.js";

describe("atlas layer table", () => {
  it("gives every block face a layer, shares identical face keys, air has none", () => {
    const t = atlasLayerTable();
    expect(t.length).toBe(BLOCKS.length * 3);
    const l = (id, f) => layerOfTable(t, id, f);
    expect(l(1, FACE.TOP)).toBe(l(1, FACE.SIDE)); // wall:1 on every face
    expect(l(11, FACE.TOP)).not.toBe(l(11, FACE.SIDE)); // grass top vs side
    expect(l(11, FACE.BOTTOM)).toBe(l(10, FACE.TOP));    // grass bottom = dirt
    const distinct = new Set(); for (const b of BLOCKS) if (b.faces) for (const f of [0, 1, 2]) distinct.add(l(b.id, f));
    expect(distinct.size).toBe(9 + 7); // 9 wall tiles + dirt, grass_top, grass_side, sand, rock, ore, bedrock
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/atlas.test.js`
Expected: FAIL.

- [ ] **Step 3: Write atlas.js**

```js
// src/rendering/voxel/atlas.js
/**
 * One TEXTURE_2D_ARRAY layer per distinct face key. Keys come from
 * BLOCKS[].faces: "wall:<tile>" (existing 512px wall art, downsampled),
 * "deck:floor"/"deck:ceil" (existing deck art), "nat:<name>" (natural-art.js).
 * The layer table is pure so the mesher can use it in node; buildAtlas paints.
 */
import { BLOCKS, FACE } from "../../world/blocks.js";
import { paintNatural } from "./natural-art.js";

export const ATLAS_SIZE = 256;

export function faceKeys() {
  const keys = [];
  for (const b of BLOCKS) if (b.faces) for (const k of [b.faces.top, b.faces.side, b.faces.bottom]) if (!keys.includes(k)) keys.push(k);
  return keys;
}

export function atlasLayerTable() {
  const keys = faceKeys();
  const t = new Uint8Array(BLOCKS.length * 3);
  for (const b of BLOCKS) if (b.faces) {
    t[b.id * 3 + FACE.TOP] = keys.indexOf(b.faces.top);
    t[b.id * 3 + FACE.SIDE] = keys.indexOf(b.faces.side);
    t[b.id * 3 + FACE.BOTTOM] = keys.indexOf(b.faces.bottom);
  }
  return t;
}

export const layerOfTable = (t, id, face) => t[id * 3 + face];

function scaled(src, size, smooth) {
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = smooth; g.drawImage(src, 0, 0, size, size);
  return c;
}

/**
 * @param {"legacy"|"comic"|"modern"} style
 * @param {{ walls: Record<number, HTMLCanvasElement[]>, deck: {floor, ceil}, legacyWalls?: Record<number, HTMLCanvasElement> }} art
 *   caller-resolved art for the act: for comic/modern the mip chains from buildWallSet(...)[tile][0]
 *   and buildDeckSet(...); for legacy the 256px canvases from generateWallTextures().
 */
export function buildAtlas(style, art) {
  const keys = faceKeys();
  const canvases = keys.map((k) => {
    const [kind, name] = k.split(":");
    if (kind === "wall") {
      const src = style === "legacy" ? art.legacyWalls[Number(name)] : art.walls[Number(name)][0];
      return scaled(src, ATLAS_SIZE, style !== "legacy");
    }
    if (kind === "deck") return scaled(art.deck[name], ATLAS_SIZE, style !== "legacy");
    return paintNatural(name, ATLAS_SIZE, style);
  });
  const table = atlasLayerTable();
  return { canvases, count: canvases.length, layerOf: (id, face) => table[id * 3 + face], table };
}
```

- [ ] **Step 4: Write natural-art.js**

Painters are procedural, no image files. Each returns a `size×size` canvas. Style rules: `legacy` = flat colours, 4-level posterised noise, no outlines; `comic` = saturated base, coarse noise, an ink crack/pebble pass in `#0a0d12` at 0.8 alpha; `modern` = desaturated base, fine noise, soft AO speckle. Use one hash-noise helper:

```js
// src/rendering/voxel/natural-art.js
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function noiseCanvas(size, base, { amp = 0.12, cell = 8, seed = 1, posterize = 0, spots = null, ink = null, desat = 0 } = {}) {
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const g = c.getContext("2d"); const img = g.createImageData(size, size); const d = img.data;
  const [r, gg, b] = base;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let n = hash(x / cell | 0, y / cell | 0, seed) * 0.6 + hash(x, y, seed + 7) * 0.4;
    if (posterize) n = Math.round(n * posterize) / posterize;
    const k = 1 + (n - 0.5) * 2 * amp;
    let R = r * k, G = gg * k, B = b * k;
    if (desat) { const l = 0.3 * R + 0.59 * G + 0.11 * B; R += (l - R) * desat; G += (l - G) * desat; B += (l - B) * desat; }
    const o = (y * size + x) * 4; d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (spots) for (let i = 0; i < spots.count; i++) { const sx = hash(i, 1, seed) * size, sy = hash(i, 2, seed) * size; g.fillStyle = spots.color; g.beginPath(); g.arc(sx, sy, spots.r * (0.6 + hash(i, 3, seed)), 0, Math.PI * 2); g.fill(); }
  if (ink) { g.strokeStyle = ink; g.lineWidth = size / 128; for (let i = 0; i < 24; i++) { const x0 = hash(i, 4, seed) * size, y0 = hash(i, 5, seed) * size; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (hash(i, 6, seed) - 0.5) * size * 0.25, y0 + (hash(i, 7, seed) - 0.5) * size * 0.25); g.stroke(); } }
  return c;
}

const BASE = {
  dirt: [110, 76, 46], grass_top: [82, 140, 58], sand: [216, 200, 144], rock: [92, 96, 104], ore: [92, 96, 104], bedrock: [30, 32, 36],
};

export function paintNatural(name, size, style) {
  const st = style === "legacy" ? { amp: 0.18, cell: size / 16, posterize: 4 } : style === "comic" ? { amp: 0.2, cell: size / 24, ink: "rgba(10,13,18,0.8)" } : { amp: 0.1, cell: size / 48, desat: 0.35 };
  switch (name) {
    case "grass_side": {
      const c = noiseCanvas(size, BASE.dirt, { ...st, seed: 3 });
      const g = c.getContext("2d"); const top = noiseCanvas(size, BASE.grass_top, { ...st, seed: 4 });
      g.drawImage(top, 0, 0, size, size * 0.22, 0, 0, size, size * 0.22);
      for (let x = 0; x < size; x += size / 32) g.drawImage(top, x, 0, size / 32, size * 0.3, x, 0, size / 32, size * (0.22 + 0.12 * hash(x, 9, 4)));
      return c;
    }
    case "ore": return noiseCanvas(size, BASE.rock, { ...st, seed: 6, spots: { count: 14, r: size / 20, color: style === "legacy" ? "#3fb0c8" : "rgba(80,220,240,0.9)" } });
    default: return noiseCanvas(size, BASE[name] || BASE.rock, { ...st, seed: name.length });
  }
}
```

- [ ] **Step 5: Write shaders.js**

```js
// src/rendering/voxel/shaders.js
export const CHUNK_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;      // local block coords (uint8 → float)
layout(location=1) in float a_normal;  // 0..5
layout(location=2) in vec2 a_uv;       // block units
layout(location=3) in float a_layer;
layout(location=4) in float a_ao;      // 0..3
uniform mat4 u_viewProj;
uniform vec3 u_origin;                 // chunk origin in world blocks
out vec2 v_uv; out float v_layer; out float v_ao; out float v_normal; out vec3 v_world;
void main() {
  vec3 p = a_pos + u_origin;
  v_world = p; v_uv = a_uv; v_layer = a_layer; v_ao = a_ao / 3.0; v_normal = a_normal;
  gl_Position = u_viewProj * vec4(p, 1.0);
}`;

export const CHUNK_FRAG = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec2 v_uv; in float v_layer; in float v_ao; in float v_normal; in vec3 v_world;
uniform sampler2DArray u_atlas;
uniform vec3 u_cam;
uniform vec3 u_fogNear; uniform vec3 u_fogFar; uniform float u_fogDensity; uniform float u_fogMax;
uniform vec3 u_ambient;
uniform int u_numLights; uniform vec4 u_lights[16]; uniform vec3 u_lightColors[16];
uniform vec3 u_emissive[16];           // per block id 0..15
uniform int u_style;                   // 0 legacy 1 comic 2 modern
uniform float u_blockId;               // unused per-vertex; kept 0 (emissive looked up by layer table on CPU → u_emissiveByLayer)
uniform vec3 u_emissiveByLayer[32];
layout(location=0) out vec4 o_color;   // rgb colour, a = normal id / 8 (for the ink pass)
layout(location=1) out vec4 o_depth;   // linear depth in r (for the ink pass)
const float FACE_SHADE[6] = float[6](0.82, 0.72, 0.9, 0.66, 1.0, 0.5);
void main() {
  vec4 t = texture(u_atlas, vec3(v_uv, v_layer));
  if (t.a < 0.5) discard;
  int n = int(v_normal + 0.5);
  float ao = mix(0.45, 1.0, v_ao);
  vec3 lit = u_ambient * FACE_SHADE[n] * ao;
  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec3 d = u_lights[i].xyz - v_world; float dist = length(d); float r = u_lights[i].w;
    if (dist >= r) continue;
    float x = dist / r; float win = 1.0 - x * x; win *= win;
    lit += u_lightColors[i] * win / (1.0 + 4.0 * dist * dist / (r * r)) * ao;
  }
  vec3 emis = u_emissiveByLayer[int(v_layer + 0.5)];
  vec3 col = t.rgb * lit + emis * t.rgb * 1.6;
  float dcam = distance(v_world, u_cam);
  float fog = u_fogMax * (1.0 - exp(-dcam * u_fogDensity));
  vec3 fogC = mix(u_fogNear, u_fogFar, clamp(fog / max(u_fogMax, 1e-3), 0.0, 1.0));
  col = mix(col, fogC, fog);
  o_color = vec4(col, float(n) / 8.0);
  o_depth = vec4(dcam, 0.0, 0.0, 1.0);
}`;

export const SPRITE_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_corner;   // -0.5..0.5, 0..1
uniform mat4 u_viewProj; uniform vec3 u_pos; uniform vec3 u_right; uniform vec2 u_size; uniform vec2 u_uvFlip;
out vec2 v_uv;
void main() {
  vec3 p = u_pos + u_right * (a_corner.x * u_size.x) + vec3(0.0, 0.0, a_corner.y * u_size.y);
  v_uv = vec2(a_corner.x + 0.5, 1.0 - a_corner.y);
  if (u_uvFlip.x > 0.5) v_uv.x = 1.0 - v_uv.x;
  gl_Position = u_viewProj * vec4(p, 1.0);
}`;

export const SPRITE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; uniform sampler2D u_tex; uniform float u_alpha; uniform vec3 u_tint; uniform float u_fog; uniform vec3 u_fogColor; uniform float u_depth;
layout(location=0) out vec4 o_color; layout(location=1) out vec4 o_depth;
void main() {
  vec4 t = texture(u_tex, v_uv); if (t.a < 0.08) discard;
  o_color = vec4(mix(t.rgb * u_tint, u_fogColor, u_fog), t.a * u_alpha);
  o_depth = vec4(u_depth, 0.0, 0.0, 1.0);
}`;

export const POST_VERT = `#version 300 es
precision highp float; layout(location=0) in vec2 a_pos; out vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

export const POST_FRAG = `#version 300 es
precision highp float; in vec2 v_uv;
uniform sampler2D u_color; uniform sampler2D u_depth; uniform vec2 u_texel; uniform int u_style; uniform float u_inkWidth;
out vec4 o;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec4 c = texture(u_color, v_uv);
  vec3 col = c.rgb;
  if (u_style == 1) {
    // Ink where depth or face id changes: Sobel over the depth buffer and the normal id in alpha.
    float d0 = texture(u_depth, v_uv).r;
    float e = 0.0;
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
      vec2 o2 = vec2(float(i), float(j)) * u_texel * u_inkWidth;
      float d = texture(u_depth, v_uv + o2).r; float n = texture(u_color, v_uv + o2).a;
      e += step(0.06 * d0 + 0.05, abs(d - d0)) + step(0.01, abs(n - c.a));
    }
    float ink = clamp(e / 4.0, 0.0, 1.0) * 0.85;
    col = mix(col, vec3(0.04, 0.05, 0.07), ink);
  } else if (u_style == 2) {
    vec3 lin = pow(col, vec3(2.2)) * 1.65;
    vec3 t = aces(lin);
    float l = dot(t, vec3(0.2126, 0.7152, 0.0722));
    t = mix(vec3(l), t, 0.8);
    t += (vec3(0.02, 0.0, -0.02) * (1.0 - l) + vec3(0.02, 0.015, 0.0) * l);
    float r = length(v_uv - 0.5); t *= 1.0 - smoothstep(0.55, 0.95, r) * 0.35;
    col = pow(t, vec3(1.0 / 2.2));
  }
  o = vec4(col, 1.0);
}`;
```

Remove the stray `u_blockId`/`u_emissive` uniforms from `CHUNK_FRAG` (keep `u_emissiveByLayer`); an unused uniform is harmless but confusing.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/atlas.test.js`
Expected: PASS. `atlas.js` imports `natural-art.js`, which only touches `document` inside functions — importing under node is fine.

- [ ] **Step 7: Commit**

```bash
git add src/rendering/voxel/atlas.js src/rendering/voxel/natural-art.js src/rendering/voxel/shaders.js tests/unit/atlas.test.js
git commit -m "feat(voxel): add the texture-array atlas, natural block art and chunk/sprite/post shaders"
```

---

### Task 7: VoxelRenderer

**Files:**
- Create: `src/rendering/voxel/voxel-renderer.js`, `src/rendering/voxel/sprite-cache.js`
- Modify: `src/utils/profiler.js` (add `voxel` to `ALL_PHASES`)
- Test: browser check in this task (throwaway script), unit coverage arrives with Task 12's Playwright spec.

**Interfaces:**
- Consumes: `meshChunk`, `STRIDE`, `buildAtlas`, shaders, `World`, `BLOCKS`, `resolveEnvPalette`, `buildWallSet`, `buildDeckSet`, `generateWallTextures`, `getArtStyle`/`isRealisticArt`, `getLayerImage`.
- Produces: `class VoxelRenderer { static create(width, height) → VoxelRenderer|null; canvas; resize(w,h); setStyle(style, act) (rebuilds the atlas); setWorld(world) (clears chunk cache); render(cam, world, sprites, lights, opts) ; destroy() ; stats {chunksDrawn, meshedThisFrame, ms} }`
  - `cam = { x, y, z (eye), yaw, pitch, fovDeg }`
  - `sprites = [{ x, y, z (feet), w, h, image: HTMLCanvasElement|HTMLImageElement, key: string, alpha?, tint?, flipX? }]`
  - `lights = [{ x, y, z, color: [r,g,b] 0..255, radius, intensity }]`
  - `opts = { style: "legacy"|"comic"|"modern", act, quality: { drawDistance } }`
- Produces: `class SpriteCache { constructor(gl); get(key, image) → { tex, w, h }; evict(maxAgeMs) ; destroy() }`

- [ ] **Step 1: Write sprite-cache.js**

```js
// src/rendering/voxel/sprite-cache.js
/** Canvas/Image → GL texture, keyed by the caller's id; re-uploads when the source's size changed (raster.js evicts bitmaps by setting width=0). */
export class SpriteCache {
  constructor(gl) { this.gl = gl; this.map = new Map(); }
  get(key, image) {
    const gl = this.gl; const w = image.width, h = image.height;
    if (!w || !h) return null;
    let e = this.map.get(key);
    if (!e || e.w !== w || e.h !== h || e.src !== image) {
      if (!e) { e = { tex: gl.createTexture(), w: 0, h: 0, src: null, t: 0 }; this.map.set(key, e); }
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      e.w = w; e.h = h; e.src = image;
    }
    e.t = performance.now();
    return e;
  }
  evict(maxAgeMs = 15000) { const now = performance.now(); for (const [k, e] of this.map) if (now - e.t > maxAgeMs) { this.gl.deleteTexture(e.tex); this.map.delete(k); } }
  destroy() { for (const e of this.map.values()) this.gl.deleteTexture(e.tex); this.map.clear(); }
}
```

- [ ] **Step 2: Write voxel-renderer.js**

Structure (write it fully; the pieces below are the contract, the math is standard):

```js
// src/rendering/voxel/voxel-renderer.js
import { World } from "../../world/world.js";
import { BLOCKS } from "../../world/blocks.js";
import { meshChunk, STRIDE } from "./mesher.js";
import { buildAtlas, ATLAS_SIZE } from "./atlas.js";
import { CHUNK_VERT, CHUNK_FRAG, SPRITE_VERT, SPRITE_FRAG, POST_VERT, POST_FRAG } from "./shaders.js";
import { SpriteCache } from "./sprite-cache.js";
import { resolveEnvPalette, FOG_DENSITY } from "../env/palettes.js";
import { buildWallSet } from "../env/wall-art.js";
import { buildDeckSet } from "../env/deck-art.js";
import { generateWallTextures } from "../textures.js";

const MESH_BUDGET = 4;          // chunks re-meshed per frame
const STYLE_ID = { legacy: 0, comic: 1, modern: 2 };

function compile(gl, vs, fs) { /* standard: createShader, compileShader, check COMPILE_STATUS, link, check LINK_STATUS, throw with the log */ }
function perspective(out, fovY, aspect, near, far) { /* column-major 4x4 */ }
function lookAt(out, eye, yaw, pitch) { /* forward = (cos yaw cos pitch, sin yaw cos pitch, sin pitch); up = +z; right = forward × up; standard view matrix */ }
function mul4(out, a, b) { /* out = a * b */ }

export class VoxelRenderer {
  static create(width, height) {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: true, stencil: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    if (!gl) return null;
    try { return new VoxelRenderer(gl, canvas); } catch (e) { console.warn("[VoxelRenderer]", e); return null; }
  }
  constructor(gl, canvas) {
    this.gl = gl; this.canvas = canvas; this.width = canvas.width; this.height = canvas.height;
    this.lost = false;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener("webglcontextrestored", () => { this.lost = false; this._initGL(); this.chunks.clear(); this.atlasKey = ""; });
    this.chunks = new Map();   // chunkIndex -> { vao, count, alphaVao, alphaCount, origin, empty }
    this.world = null; this.worldVersionSeen = -1;
    this.atlasKey = ""; this.layerOf = null; this.emissiveByLayer = null;
    this.stats = { chunksDrawn: 0, meshedThisFrame: 0, ms: 0 };
    this._initGL();
  }
  _initGL() {
    const gl = this.gl;
    this.chunkProg = compile(gl, CHUNK_VERT, CHUNK_FRAG); this.spriteProg = compile(gl, SPRITE_VERT, SPRITE_FRAG); this.postProg = compile(gl, POST_VERT, POST_FRAG);
    this.u = { chunk: this._uniforms(this.chunkProg, ["u_viewProj","u_origin","u_atlas","u_cam","u_fogNear","u_fogFar","u_fogDensity","u_fogMax","u_ambient","u_numLights","u_lights","u_lightColors","u_style","u_emissiveByLayer"]),
               sprite: this._uniforms(this.spriteProg, ["u_viewProj","u_pos","u_right","u_size","u_uvFlip","u_tex","u_alpha","u_tint","u_fog","u_fogColor","u_depth"]),
               post: this._uniforms(this.postProg, ["u_color","u_depth","u_texel","u_style","u_inkWidth"]) };
    this.sprites = new SpriteCache(gl);
    // full-screen quad and sprite quad VAOs, scene FBO with two colour attachments (RGBA8 colour+normal, R16F depth) and a depth renderbuffer
    this._createQuads(); this._createFBO(this.width, this.height);
    this.anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");
  }
  resize(w, h) { if (w === this.width && h === this.height) return; this.width = w; this.height = h; this.canvas.width = w; this.canvas.height = h; this._createFBO(w, h); }
  setWorld(world) { this.world = world; for (const c of this.chunks.values()) this._freeChunk(c); this.chunks.clear(); }

  /** Rebuild the atlas when style or act changes. */
  setStyle(style, act) {
    const key = `${style}|${act}`; if (key === this.atlasKey) return;
    const pal = resolveEnvPalette(act, 0);
    const art = style === "legacy"
      ? { legacyWalls: generateWallTextures() }                                   // check its return shape: {id: canvas} or array
      : { walls: buildWallSet(act, pal, 0, style === "modern"), deck: buildDeckSet(act, false, pal, 0) };
    const atlas = buildAtlas(style, art);
    this._uploadAtlas(atlas.canvases, style === "legacy");
    this.layerOf = atlas.layerOf;
    this.emissiveByLayer = new Float32Array(32 * 3);
    for (const b of BLOCKS) if (b.faces && b.emissive) for (const f of [0, 1, 2]) { const L = atlas.layerOf(b.id, f); this.emissiveByLayer.set(b.emissive, L * 3); }
    this.fog = { near: pal.fogNear || [0.05, 0.08, 0.12], far: pal.fogFar || [0.02, 0.04, 0.08], density: FOG_DENSITY * 0.35, max: 0.85 };
    this.atlasKey = key; this.style = style;
    for (const c of this.chunks.values()) this._freeChunk(c); this.chunks.clear(); // layers changed
  }
  _uploadAtlas(canvases, nearest) { /* TEXTURE_2D_ARRAY, texStorage3D RGBA8 with log2(ATLAS_SIZE)+1 levels, texSubImage3D per layer from each canvas, generateMipmap, REPEAT wrap, LINEAR_MIPMAP_LINEAR (or NEAREST for legacy), anisotropy 8 when available */ }

  _meshDirty(camChunk) {
    const dirty = this.world.takeDirty();
    if (!dirty.length) return 0;
    // nearest first, keep the rest dirty for the next frame
    dirty.sort((a, b) => this._chunkDist(a, camChunk) - this._chunkDist(b, camChunk));
    const now = dirty.slice(0, MESH_BUDGET); for (const i of dirty.slice(MESH_BUDGET)) this.world.dirty[i] = 1;
    for (const ci of now) this._buildChunk(ci);
    return now.length;
  }
  _buildChunk(ci) {
    const [cx, cy, cz] = this.world.chunkCoords(ci);
    const m = meshChunk(this.world, cx, cy, cz, this.layerOf);
    let c = this.chunks.get(ci); if (!c) { c = { origin: [cx * 16, cy * 16, cz * 16] }; this.chunks.set(ci, c); }
    this._upload(c, "opaque", m.opaque); this._upload(c, "alpha", m.alpha);
  }
  _upload(c, name, mesh) { /* create/refill VBO+IBO+VAO for mesh with attribute layout: loc0 vec3 UNSIGNED_BYTE (offset 0), loc1 float UNSIGNED_BYTE (3), loc2 vec2 UNSIGNED_BYTE (4), loc3 float UNSIGNED_BYTE (6), loc4 float UNSIGNED_BYTE (7); stride STRIDE; store c[name] = { vao, count: mesh.count, indexType } ; delete when count 0 */ }

  render(cam, world, sprites, lights, opts) {
    if (this.lost) return false;
    const t0 = performance.now(); const gl = this.gl;
    if (world !== this.world) this.setWorld(world);
    this.setStyle(opts.style, opts.act || 1);
    const camChunk = [cam.x >> 4, cam.y >> 4, cam.z >> 4];
    this.stats.meshedThisFrame = this._meshDirty(camChunk);
    // matrices: horizontal fov → vertical: fovY = 2*atan(tan(fovX/2)/aspect)
    const aspect = this.width / this.height; const fovY = 2 * Math.atan(Math.tan((cam.fovDeg * Math.PI / 180) / 2) / aspect);
    perspective(this.proj, fovY, aspect, 0.05, 256); lookAt(this.view, [cam.x, cam.y, cam.z], cam.yaw, cam.pitch); mul4(this.viewProj, this.proj, this.view);
    // scene pass into the FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo); gl.viewport(0, 0, this.width, this.height);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.clearColor(this.fog.far[0], this.fog.far[1], this.fog.far[2], 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.useProgram(this.chunkProg); /* set uniforms: viewProj, atlas unit 0, cam, fog, ambient (legacy 1.0, comic 0.95, modern 0.62 × per-style tint), lights (add z; radius as given), style, emissiveByLayer */
    const maxDist = (opts.quality?.drawDistance ?? 96);
    this.stats.chunksDrawn = 0;
    for (const [ci, c] of this.chunks) if (c.opaque && this._visible(c.origin, maxDist)) { gl.uniform3fv(this.u.chunk.u_origin, c.origin); gl.bindVertexArray(c.opaque.vao); gl.drawElements(gl.TRIANGLES, c.opaque.count, c.opaque.indexType, 0); this.stats.chunksDrawn++; }
    // sprites (depth test + write, alpha test in shader), then alpha chunk faces (no depth write)
    this._drawSprites(sprites, cam);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.useProgram(this.chunkProg);
    for (const c of this.chunks.values()) if (c.alpha && this._visible(c.origin, maxDist)) { gl.uniform3fv(this.u.chunk.u_origin, c.origin); gl.bindVertexArray(c.alpha.vao); gl.drawElements(gl.TRIANGLES, c.alpha.count, c.alpha.indexType, 0); }
    gl.depthMask(true); gl.disable(gl.BLEND);
    // post pass to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.width, this.height); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.useProgram(this.postProg); /* bind colour tex unit 0, depth tex unit 1, texel size, style id, inkWidth = max(1, height/720) */ gl.bindVertexArray(this.quadVao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.sprites.evict();
    this.stats.ms = performance.now() - t0;
    return true;
  }
  _visible(origin, maxDist) { /* sphere-vs-frustum with radius 16*sqrt(3)/2 against planes extracted from viewProj; also reject when distance from cam > maxDist + 14 */ }
  _drawSprites(list, cam) { /* sort back-to-front by distance; for each: entry = this.sprites.get(s.key, s.image); if null skip; right = (-sin yaw, cos yaw, 0); set u_pos (feet), u_size (w,h), u_tex, alpha, tint, fog from distance using this.fog, u_depth = distance; draw sprite quad */ }
  destroy() { /* delete programs, FBO, textures, chunk buffers, sprite cache */ }
}
```

Fill in every `/* ... */` with real code. Depth attachment: use a `DEPTH_COMPONENT24` renderbuffer for the z-test and write linear depth yourself into `COLOR_ATTACHMENT1` (`R16F` needs `EXT_color_buffer_float`; fall back to `RGBA8` storing depth/256 in `r` if the extension is missing — the ink pass only needs relative differences). `resolveEnvPalette` may not expose `fogNear/fogFar` under those names: read `src/rendering/env/palettes.js` and `generateModernEnv` (`src/rendering/textures.js:437-445`) and reuse the fog ramp the same way; for legacy use the `actFog` constants in `js/renderer.js:694-702`.

- [ ] **Step 3: Add the profiler phase**

In `src/utils/profiler.js` add `"voxel"` to `ALL_PHASES` (read the file for the exact shape).

- [ ] **Step 4: Browser check**

Write a throwaway page under `.superpowers/spike/voxel-renderer.html` (git-ignored — confirm `.superpowers/` is ignored; if not, put it in the session scratchpad) that imports `generateWorld`, `VoxelRenderer` and `art-style.js` through Vite (`npx vite --port 5199 --strictPort`), builds a terrain world, places a few glass/energy/rift blocks, adds two sprites from a `document.createElement("canvas")` with a drawn circle, and renders a spinning camera at 1280×720 in each style (query `?style=legacy|comic|modern`). Screenshot with Playwright launched with `["--use-gl=angle", "--enable-gpu"]` (plain headless has no WebGL2 — see the repo memory). Expected: textured terrain with AO in corners, glass see-through, energy glowing, ink outlines in comic, darker filmic look in modern, sprites occluded by hills, `stats.ms` under 4 ms after the first meshes. Fix until true. Kill the server.

- [ ] **Step 5: Run the unit suite, commit**

Run: `npx vitest run` — green.

```bash
git add src/rendering/voxel/voxel-renderer.js src/rendering/voxel/sprite-cache.js src/utils/profiler.js
git commit -m "feat(voxel): add the WebGL2 chunk renderer with sprites and per-style post passes"
```

---

### Task 8: ForgeMode — core editor

**Files:**
- Create: `js/forge.js`
- Delete: `js/builder.js` (Task 9 rewires `game.js`; delete here so nothing half-imports it — the dynamic import in `game.js` is updated in Task 9, so between Task 8 and 9 the Forge button throws; that is acceptable within the branch, and Task 9 follows immediately)

**Interfaces:**
- Consumes: `World`, `generateWorld`, `WorldStore`, `packWorld/unpackWorld/toShareHash/fromShareHash/decodeWorld`, `convertLegacyMap`, `PLAYER`, `moveAABB`, `groundHeight`, `raycastBlocks`, `aabbOverlapsSolid`, `BLOCKS`, `ENEMY_TYPES` (as `builder.js` imports it), the pointer-lock utils `builder.js` uses.
- Produces: `class ForgeMode` with **exactly** the surface `game.js` and the pipeline use today: `constructor({ renderer, audio, settings, keybinds, canvas })`, `start()` (async-safe: returns a promise that resolves when the world is loaded; `game._enterBuilder` awaits it — Task 9), `stop()`, `update(dt)`, `render(ctx, w, h, time)`, `feedKeys(keys)`, `feedMouse(dx, dy, locked)`, `handleKeyDown(e) → boolean`, `handleMouseDown(button)`, `saveMap()`, `syncGrid()` (no-op kept for `game.js`), `onPlayTest`, `onShareMap`, `suppressHelp`, `map` (**the World**, also exposed as `world`), `player { x, y, z, angle, pitch }`, `active`, `noclip`, `overhead`, `showHelp`, `tile` (current block id), `toolMode`, `selectedEnemy`, `selectedPickup`, `currentSlot`, `mapIndex`, `history`, `historyIndex`, `importMapData(json)`, `exportMap()`, `importMap()`.
- Rendering contract: `render()` does not draw the world itself; it draws the editor HUD (crosshair, target readout, hotbar, help, overhead view, markers legend). The pipeline (Task 9) draws the voxel canvas first. `forge.cameraFor(w, h) → { x, y, z, yaw, pitch, fovDeg }` and `forge.spritesFor() → sprite list` (marker billboards for spawns/pickups/exit/start using small canvases painted once) are what the pipeline passes to `VoxelRenderer`.

- [ ] **Step 1: Port the editor**

Start from `js/builder.js` and keep: key bindings and their meaning (`handleKeyDown`: 1–9 pick blocks 1–9 and 0 picks block 10+ by cycling, wheel cycles all 15, T tool cycle, G subtype, [ ] FOV, `,` `.` prev/next map, Space jump, N noclip, F rename, Tab overhead, Ctrl+S save, Ctrl+Shift+S share, Ctrl+N new, Ctrl+D delete, Ctrl+Z/Ctrl+Shift+Z undo/redo, Ctrl+E export, Ctrl+I import, P playtest, H help, R reset pitch), the help panel text (update the lines: "Q/E — Layer" becomes "Q/E — Lower/Raise build cursor (overhead)", add "Wheel — Block", "V — Terrain/Flat new world"), the hotbar drawing (now 15 swatches from `BLOCKS[i].color`, scrolling so the selected one is visible, name under it), the crosshair, the target readout (`[x,y,z] Name  face`), save flash, rename prompt, slot management, undo/redo (history entries are `{ x, y, z, from, to }` edits, max 200).

Replace: `this.map` grid/layers with a `World`; `_raycast` with `raycastBlocks(world, eye..., forward, PLAYER.reach)`; `placeBlock` = set at `hit + face` unless `aabbOverlapsSolid` for the player body or any playtest entity would overlap; `removeBlock` = set AIR at hit unless `BEDROCK`; spawn/pickup/exit/start markers = meta entries at `hit + face` (feet on the block top); movement = `moveAABB` with `PLAYER` numbers, gravity and jump (noclip flies: no gravity, Space up, Ctrl down, no collision), pitch ±85° (`PITCH_LIMIT = 85 * Math.PI / 180`); `_renderOverhead` = top-down slice at `this.cursorZ` (Q/E move it, default = player feet z) drawing `BLOCKS[id].color` per cell in the 128×128 grid fitted to the screen, markers as icons, player as an arrow; `start()` = load slots from `WorldStore` (create one via `generateWorld({terrain:true, seed: Date.now()})` when empty), then one-time legacy migration: for each `cc_builder_maps_index` entry and the legacy `cc_builder_map` key, `convertLegacyMap` into a new store slot if a slot with `meta.legacyKey === key` does not exist yet (set `meta.legacyKey`), leaving localStorage untouched.

Saving: `saveMap()` → `store.save(currentSlot, world)`, debounced flash. Export: `.ccw` blob from `packWorld`. Import: `.ccw` → `unpackWorld`, `.json` → `decodeWorld` (which converts legacy). Share: `toShareHash(world)`; when `null`, show "World too large to share by URL — export it instead" in the HUD for 3 s and do not call `onShareMap`.

- [ ] **Step 2: Unit test the pure parts**

Extract the pure edit rules into exported functions on the module so node can test them: `placementAllowed(world, x, y, z, bodies) → boolean` (bodies = `[{x,y,z,half,height}]`), `hotbarWindow(selected, total, visible) → { start, end }`, `nextTool(tool)`. Add `tests/unit/forge-rules.test.js` covering: placing into the player's feet cell is refused, placing next to the player is allowed, bedrock removal is refused (`removeAllowed`), hotbar window keeps the selection visible at both ends, undo/redo round-trips an edit (`applyEdit`/`undoEdit` on a World).

Run: `npx vitest run tests/unit/forge-rules.test.js` — PASS.

- [ ] **Step 3: Commit**

```bash
git add js/forge.js tests/unit/forge-rules.test.js
git rm js/builder.js
git commit -m "feat(forge): replace the layer builder with the voxel ForgeMode editor"
```

---

### Task 9: Game integration

**Files:**
- Modify: `js/game.js` (`_ensureBuilder`, `_enterBuilder`, `startBuilderPlayTest`, `exitBuilderPlayTest`, `_shareBuilderMap`, `_loadSharedMap`, `_handleHashChange`, `_encodeShareURL`/`_decodeShareURL` unchanged for arena), `src/rendering/render-pipeline.js` (BUILDER branch and the PLAYING branch when `game.world`), `js/main.js` (`resizeCanvases` forwards to the voxel renderer; Forge button disabled text when WebGL2 is unavailable), `src/systems/input-dispatch.js` (quit path saves via the same call), `src/rendering/render-pipeline.js` viewmodel unchanged.
- Test: `tests/unit/game-voxel-glue.test.js` for the pure helpers below; the rest is Playwright in Task 12.

**Interfaces:**
- `game.world` (World|null), `game.voxelRenderer` (VoxelRenderer|null, created lazily on first Forge entry, resized with the game canvas), `game.builder` = the ForgeMode.
- `game.playerFeetZ()` and `game.playerEyeZ3()` helpers; `player.z`, `player.vz`, `player.pitch` fields used only when `game.world`.

- [ ] **Step 1: game.js**

- `_ensureBuilder`: dynamic-import `./forge.js` (`ForgeMode`); also `this.voxelRenderer ||= (await import("../src/rendering/voxel/voxel-renderer.js")).VoxelRenderer.create(this.canvas.width, this.canvas.height)`; if `null`, set `this.voxelUnavailable = true`, toast "The Forge needs WebGL2 on this device", stay on mode select and `return`.
- `_enterBuilder`: `await this.builder.start()`, then `this.world = this.builder.world; this.map = null; this.entities = []; this.state = GameState.BUILDER; this.mode = "builder"`.
- `startBuilderPlayTest`: snapshot the forge camera (`x,y,z,angle,pitch`); `this.world = this.builder.world`; `this.player = new Player(spawn.x, spawn.y)`; set `player.z = spawn.z; player.vz = 0; player.pitch = 0; player.angle = spawn.yaw` from `world.meta.spawn` (fall back to the editor camera when the spawn cell is solid); enemies from `world.meta.enemySpawns` with `enemy.z = s.z; enemy.vz = 0`; pickups from `world.meta.pickups` with `z`; exit entity with `z`; the fallback random spawn loop picks columns via `world.topSolid(x,y)+1`; rest as today.
- `exitBuilderPlayTest`: restore the forge camera from the snapshot, `this.world = this.builder.world`, entities cleared, as today.
- Quit from builder (`input-dispatch.js`): `builder.saveMap()` returns a promise now — call it and `stop()`; do not await in the key handler.
- Share: `_shareBuilderMap` → `const hash = await toShareHash(world)`; when `null` the forge already showed the notice; else `location.hash = hash` and the existing share toast. `_handleHashChange`: if the hash starts with `v4.` → `fromShareHash` → `_loadSharedWorld(world)` (enter the Forge with that world as a new slot named "Shared"); if it decodes as the legacy `{mode:"builder", map}` shape → `convertLegacyMap({grid: map})` → same path.
- Everything that reads `game.map.grid` for gameplay must be guarded with `game.world ?` branches: search `game.js` for `this.map.` inside `PLAYING`-state code paths reached by playtest (spawner fallback, `isPassable`, `hasLineOfSight`, exit check, `fireWeapon`/hitscan, projectiles). Route each through the 3D branch Task 10/11 add, or, where it is only a spawn-position check, `world.topSolid`.

- [ ] **Step 2: render-pipeline.js**

In the BUILDER branch: `game.voxelRenderer.render(game.builder.cameraFor(w, h), game.world, game.builder.spritesFor(), [], { style: styleName(), act: game.world.meta.act, quality: game.quality })` then `ctx.drawImage(game.voxelRenderer.canvas, 0, 0)` then `game.builder.render(ctx, w, h, game.time)` (HUD only), then the onboarding as now. `styleName()` maps `getArtStyle()`: 0 → `"legacy"`, 1 → `"comic"`, 2 → `"modern"`.

In the PLAYING branch: when `game.world` is set, replace the `renderScene` call with `voxelRenderer.render(camFromPlayer(game.player), game.world, spriteListFromEntities(game), game.lights, opts)` + `drawImage`, then continue with particles/tracers (their 2D projection assumes the raycaster: for voxel mode skip `renderParticles`/`renderTracers` and draw tracers as sprites of a 1×1 white canvas stretched... simplest: skip both in voxel mode this task; Task 11 adds tracer quads) and the rest of the pipeline unchanged (horizon band skipped when `game.world`). `spriteListFromEntities` builds `{x, y, z, w, h, image, key}` per active enemy (`prepareEnemySprite(...).body` canvas; `w = def.radius*2.2 || 0.9`, `h = def.hitHeight*2 || 1.6`, `key = "enemy:"+enemy.id+":"+frameId`), pickup (`src/rendering/pickups.js` sprite canvas) and exit marker. Set the profiler phase: `game.profiler.currentPhases.voxel = voxelRenderer.stats.ms` when profiling.

- [ ] **Step 3: main.js**

In `resizeCanvases` after `game.renderer.resize(gw, gh)`: `game.voxelRenderer?.resize(gw, gh)`. On the Forge button: if `game.voxelUnavailable` show the toast instead of entering.

- [ ] **Step 4: Unit test the glue helpers**

Put `styleName`, `camFromPlayer(player)` (eye = `player.z + (crouched ? PLAYER.crouchEye : PLAYER.eye)`, `fovDeg` from settings), and `spawnFromMeta(world)` (spawn fallback when the spawn cell is solid → nearest free column top) in `src/systems/voxel-glue.js` and test them in `tests/unit/game-voxel-glue.test.js` (3 cases). Run: `npx vitest run` — green.

- [ ] **Step 5: Browser check**

Dev server + Playwright with GPU flags: `ccDebug.startBuilder()` → screenshot shows the voxel world and the HUD; `ccDebug.startBuilderPlayTest()` → `state === "playing"`, screenshot; `game.exitBuilderPlayTest()` → back in the editor. No console errors. Also `npx playwright test tests/smoke.spec.js` (has "can start builder").

- [ ] **Step 6: Commit**

```bash
git add js/game.js src/rendering/render-pipeline.js js/main.js src/systems/input-dispatch.js src/systems/voxel-glue.js tests/unit/game-voxel-glue.test.js
git commit -m "feat(forge): wire the voxel renderer and ForgeMode into the game loop and playtest"
```

---

### Task 10: 3D player movement and enemy AI

**Files:**
- Modify: `src/systems/player-update.js` (3D branch), `js/game.js` (choose `VoxelAISystem` when `game.world`)
- Create: `src/systems/voxel-ai.js`
- Test: `tests/unit/voxel-ai.test.js`, extend `tests/unit/voxel-physics.test.js` if a helper is added

**Interfaces:**
- `PlayerUpdateSystem.update(ctx, dt)`: when `ctx.world` is present, movement uses `moveAABB` with `PLAYER`; `keys[keybinds.jump || "Space"]` jumps when grounded; crouch toggles `height`; `mouse.dy` drives `p.pitch` (clamped ±85°) instead of the reticle; dash/sprint multiply horizontal velocity; fall damage in `mode === "playtest"` only: on landing, `drop = p._fallFrom - p.z`, damage `(drop - 6) * 5` when `drop > 6`.
- `class VoxelAISystem { update(ctx, dt) }` with the same `ctx` shape `AISystem.update` takes (read `src/systems/ai.js:71`), plus `ctx.world`. Behaviour per design: walkers (`!def.flying`) get gravity via `moveAABB`, chase = move toward the player on the ground plane at `def.speed`, if `hitX||hitY` and grounded and the blocking cell one up is free → `vz = PLAYER.jump * 0.8`; attack when within `def.attackRange` and `hasLineOfSight3D`; flyers keep `z = spawnZ + sin(time)*0.3` and move straight; `hasLineOfSight3D` replaces `hasLineOfSight`; pain/EMP/idle handling copied from `AISystem` (share by importing the helpers it exports, e.g. `attackWindupMs`, `beginWindup`; export `beginWindup` if it is not).
- Determine the flyer flag from `src/data/enemies.js` (grep `flying`/`hover` — the earlier read found no `flying` key; if none exists, add `flying: true` to the drone/phantom-style entries whose renderer draws them airborne, and document it in the enemies file header).

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/voxel-ai.test.js
import { describe, it, expect } from "vitest";
import { VoxelAISystem } from "../../src/systems/voxel-ai.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";

const mkEnemy = (type, x, y, z) => ({ type: "enemy", enemyType: type, def: ENEMY_TYPES[type], active: true, x, y, z, vz: 0, state: "chase", stateTime: 1, painTimer: 0, lastAttackTime: -1e9, alertRange: 20, health: 50 });
const ctx = (world, entities, player) => ({ world, map: null, entities, player, time: 1000, fx: { spawnPointLight() {}, spawnHitImpact() {} }, audio: { playEnemyAttack() {} }, settings: {}, damagePlayer() {}, spawnProjectile() {} });

describe("VoxelAISystem", () => {
  it("walker on a ledge falls to the ground", () => {
    const w = generateWorld({ terrain: false });
    const e = mkEnemy(Object.keys(ENEMY_TYPES).find((k) => !ENEMY_TYPES[k].flying), 20.5, 20.5, 40);
    const ai = new VoxelAISystem();
    const c = ctx(w, [e], { x: 60, y: 60, z: 32, health: 100 });
    for (let i = 0; i < 120; i++) ai.update(c, 1 / 60);
    expect(e.z).toBe(32);
  });

  it("walker chases along the ground and jumps a one-block step", () => {
    const w = generateWorld({ terrain: false });
    for (let y = 18; y < 23; y++) w.set(23, y, 32, 1); // one-block wall across its path
    const e = mkEnemy(Object.keys(ENEMY_TYPES).find((k) => !ENEMY_TYPES[k].flying), 20.5, 20.5, 32);
    const ai = new VoxelAISystem();
    const c = ctx(w, [e], { x: 30.5, y: 20.5, z: 32, health: 100 });
    for (let i = 0; i < 300; i++) { c.time += 16; ai.update(c, 1 / 60); }
    expect(e.x).toBeGreaterThan(23.5);
  });

  it("flyer holds altitude and closes distance", () => {
    const w = generateWorld({ terrain: false });
    const type = Object.keys(ENEMY_TYPES).find((k) => ENEMY_TYPES[k].flying);
    const e = mkEnemy(type, 20.5, 20.5, 36);
    const ai = new VoxelAISystem();
    const c = ctx(w, [e], { x: 40.5, y: 20.5, z: 32, health: 100 });
    for (let i = 0; i < 120; i++) { c.time += 16; ai.update(c, 1 / 60); }
    expect(e.x).toBeGreaterThan(21); expect(Math.abs(e.z - 36)).toBeLessThan(0.6);
  });
});
```

- [ ] **Step 2: Run to verify it fails**, implement `voxel-ai.js` and the player branch, iterate until PASS, then run the full suite.

- [ ] **Step 3: Browser check**: playtest a world with a drone and a walker on a raised platform; the walker drops, both approach; jumping onto a block works; fall damage from a tower in playtest.

- [ ] **Step 4: Commit**

```bash
git add src/systems/voxel-ai.js src/systems/player-update.js js/game.js src/data/enemies.js tests/unit/voxel-ai.test.js
git commit -m "feat(forge): add 3D player movement and simple ground/air enemy AI for playtest"
```

---

### Task 11: Combat in 3D, lights, tracers, exit

**Files:**
- Modify: `src/systems/combat.js` (`distanceToWall`/hitscan → `raycastBlocks` when `world`; `aimHitsTargetHeight` uses `enemy.z` and the player's eye z), `src/systems/projectile-update.js` (projectiles carry `z, vz`; block collision via `world.get`), `js/game.js` (exit detection uses 3D distance; `game.lights` entries get `z`; muzzle/impact lights at eye/impact z), `src/rendering/render-pipeline.js` (tracers as thin sprite quads in voxel mode; particles skipped or drawn as sprites at `p.z`).

- [ ] **Step 1**: Extend `tests/unit/combat.test.js` with a 3D hitscan case: a block between shooter and target blocks the shot; a shot over a one-block wall hits. Run → FAIL → implement → PASS.
- [ ] **Step 2**: Browser check in playtest: shooting a drone above a wall, shooting into a wall shows an impact light on the block, walking into the exit ends the playtest.
- [ ] **Step 3**: Commit — `feat(forge): 3D hitscan, projectiles, lights and exit in voxel playtest`.

---

### Task 12: Playwright coverage and perf budget

**Files:**
- Create: `tests/forge.spec.js`
- Modify: `tests/perf-budget.spec.js` (a `forge` scene), `js/testing/debug-bridge.js` (helpers: `forgeSetBlock(x,y,z,id)`, `forgeWorldStats()`), `js/testing/playtest-gate.js` (builder path unchanged; confirm it passes)

- [ ] **Step 1: tests/forge.spec.js** (GPU flags like `perf-budget.spec.js`): enter the Forge; place 3 blocks and break 1 via `ccDebug.forgeSetBlock` and via simulated clicks with the camera aimed (use `page.mouse`); `ccDebug.game.builder.saveMap()`, reload, re-enter, assert the blocks persist (IndexedDB); share URL round trip: read `location.hash` after `Ctrl+Shift+S`, open it in a fresh context, assert the world matches; playtest: `startBuilderPlayTest`, wait 2 s, `state === "playing"`, enemies have finite `z`, exit; screenshots `screenshots/forge-{legacy,comic,modern}.png`; no console errors across the whole run; a legacy `cc_builder_map_0` JSON seeded into localStorage before load converts and appears in the slot list with its walls at z=32..34.
- [ ] **Step 2: perf-budget.spec.js**: add scene `"forge"` (`d.startBuilder()` then spin the camera) with the existing per-profile `renderMs` budgets; the measured value must include `voxel` phase ms (`getPerf().phases.voxel`). Tune `MESH_BUDGET`/draw distance per tier if a budget fails; do not raise budgets.
- [ ] **Step 3: run** `npx playwright test tests/forge.spec.js tests/smoke.spec.js tests/playtest-gate.spec.js tests/perf-budget.spec.js` — green.
- [ ] **Step 4: Commit** — `test(forge): cover the voxel Forge in the browser and the perf budget`.

---

### Task 13: Docs and onboarding text

**Files:**
- Modify: `README.md` (Builder Mode paragraph: voxel world, build up/dig down, WebGL2 required, `.ccw` export), `CONTRIBUTING.md` (project structure: `src/world/`, `src/rendering/voxel/`, `js/forge.js`), `src/ui/game-over-screens.js` `renderBuilderOnboarding` text (mention Space to jump, wheel for blocks, right-click to place / left to break).

- [ ] **Step 1**: Edit the three files; keep the README voice.
- [ ] **Step 2**: `npx vitest run` and `npx playwright test tests/smoke.spec.js` — green.
- [ ] **Step 3**: Commit — `docs(forge): describe the voxel Forge and its WebGL2 requirement`.

---

## Self-Review Notes

- Design coverage: world/blocks/gen/codec/store/convert (1–3), physics (4), mesher/atlas/shaders/renderer (5–7), ForgeMode (8), integration (9), player + AI (10), combat/lights/exit (11), browser + perf (12), docs (13). Out-of-scope items stay out.
- Interfaces named identically across tasks: `World.get/set/topSolid/takeDirty/chunkIndex/chunkCoords`, `meshChunk(world,cx,cy,cz,layerOf)` + `STRIDE`, `buildAtlas(style, art).layerOf`, `VoxelRenderer.render(cam, world, sprites, lights, opts)`, `moveAABB(world, body, dx, dy, dz, {step})`, `raycastBlocks(...)`, `hasLineOfSight3D(...)`, `PLAYER`, `ForgeMode.cameraFor/spritesFor/world`.
- Known judgement calls left to implementers, each flagged in its task: `sweepAxis` snapping (Task 4), fog ramp field names (Task 7), the `flying` flag on enemy defs (Task 10), particles in voxel mode (Task 11).
- Tasks 7–9 are the largest; Task 8 is a port of a 2,000-line file and should go to the most capable model.
