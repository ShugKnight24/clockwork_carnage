import { describe, it, expect } from "vitest";
import {
  BLOCKS, AIR, WATER, LOG, LEAVES, PLANKS, SAPLING, FACE,
  isSolid, isOpaque, isCutout, isTargetable, isPlant,
} from "../../src/world/blocks.js";
import { faceKeys, atlasLayerTable, layerOfTable } from "../../src/rendering/voxel/atlas.js";
import { meshChunk, STRIDE } from "../../src/rendering/voxel/mesher.js";
import { World } from "../../src/world/world.js";
import { materialOf } from "../../src/audio/block-sounds.js";

/** Must match MAX_LAYERS in voxel-renderer.js and the uniform arrays in CHUNK_FRAG. */
const MAX_LAYERS = 32;
const layerOf = (id, face) => id * 3 + face;
const quads = (m) => m.indices.length / 6;

describe("wood blocks", () => {
  it("appends log, leaves, planks and sapling after water", () => {
    expect([LOG, LEAVES, PLANKS, SAPLING]).toEqual([20, 21, 22, 23]);
    expect(BLOCKS.slice(20).map((b) => [b.id, b.name, b.kind])).toEqual([
      [20, "Log", "solid"], [21, "Leaves", "leaves"], [22, "Planks", "solid"], [23, "Sapling", "plant"],
    ]);
    for (const id of [LOG, LEAVES, PLANKS, SAPLING]) {
      expect(BLOCKS[id].hardness).toBeGreaterThan(0);
      expect(Number.isFinite(BLOCKS[id].hardness)).toBe(true);
    }
  });

  it("makes logs and planks opaque, leaves solid but see-through, saplings walk-through", () => {
    expect(isOpaque(LOG)).toBe(true); expect(isOpaque(PLANKS)).toBe(true);
    expect(isSolid(LEAVES)).toBe(true); expect(isOpaque(LEAVES)).toBe(false); expect(isCutout(LEAVES)).toBe(true);
    expect(isSolid(SAPLING)).toBe(false); expect(isOpaque(SAPLING)).toBe(false); expect(isCutout(SAPLING)).toBe(true);
    expect(isPlant(SAPLING)).toBe(true); expect(isPlant(LEAVES)).toBe(false);
    // The pick ray still stops on a sapling, so it can be broken; never on air or water.
    expect(isTargetable(SAPLING)).toBe(true); expect(isTargetable(LEAVES)).toBe(true);
    expect(isTargetable(AIR)).toBe(false); expect(isTargetable(WATER)).toBe(false);
    // Nothing older changed its answer.
    for (let id = 1; id <= 18; id++) expect(isSolid(id)).toBe(true);
    for (let id = 0; id <= 19; id++) expect(isCutout(id)).toBe(false);
  });

  it("sounds like wood and leaves", () => {
    expect([LOG, LEAVES, PLANKS, SAPLING].map(materialOf)).toEqual(["wood", "leaves", "wood", "leaves"]);
  });

  it("gives logs a ringed top and a bark side, and keeps the atlas inside the shader", () => {
    const t = atlasLayerTable();
    expect(layerOfTable(t, LOG, FACE.TOP)).toBe(layerOfTable(t, LOG, FACE.BOTTOM));
    expect(layerOfTable(t, LOG, FACE.TOP)).not.toBe(layerOfTable(t, LOG, FACE.SIDE));
    for (const k of ["nat:log", "nat:log_top", "nat:leaves", "nat:planks", "nat:sapling"]) expect(faceKeys()).toContain(k);
    expect(faceKeys().length).toBe(28);
    expect(faceKeys().length).toBeLessThanOrEqual(MAX_LAYERS);
  });
});

describe("meshing cut-out blocks", () => {
  it("draws leaves with the opaque faces, between leaves too, and hidden only by opaque blocks", () => {
    const w = new World();
    w.set(5, 5, 5, LEAVES); w.set(6, 5, 5, LEAVES); w.set(5, 6, 5, 1);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.alpha)).toBe(0); expect(quads(m.water)).toBe(0);
    // Leaves: 2 × 6 faces, less the one against the stone; the pair's -y, +z
    // and -z faces merge, which leaves 8 quads. Stone: all 6, as leaves hide nothing.
    let leaf = 0, stone = 0;
    const faces = new Set();
    for (let i = 0; i < m.opaque.verts.length; i += STRIDE * 4) {
      const layer = m.opaque.verts[i + 6];
      if (Math.floor(layer / 3) === LEAVES) leaf++; else stone++;
      faces.add(`${Math.floor(layer / 3)}:${m.opaque.verts[i + 3]}`);
    }
    expect(stone).toBe(6);
    // Both leaves draw the face they share (+x of one, -x of the other).
    expect(faces.has(`${LEAVES}:0`)).toBe(true); expect(faces.has(`${LEAVES}:1`)).toBe(true);
    const leafFacesPlusX = [];
    for (let i = 0; i < m.opaque.verts.length; i += STRIDE * 4) {
      if (Math.floor(m.opaque.verts[i + 6] / 3) === LEAVES && m.opaque.verts[i + 3] === 0) leafFacesPlusX.push(m.opaque.verts[i]);
    }
    expect(leafFacesPlusX.sort()).toEqual([6, 7]);
    expect(leaf).toBe(8);
  });

  it("draws a sapling as two crossed quads, both sides, and nothing else", () => {
    const w = new World();
    w.set(5, 5, 4, 11); w.set(5, 5, 5, SAPLING);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    const sap = [];
    for (let i = 0; i < m.opaque.verts.length; i += STRIDE * 4) {
      if (Math.floor(m.opaque.verts[i + 6] / 3) === SAPLING) sap.push(i);
    }
    expect(sap.length).toBe(4);
    for (const i of sap) {
      for (let k = 0; k < 4; k++) {
        const o = i + k * STRIDE, x = m.opaque.verts[o], y = m.opaque.verts[o + 1], z = m.opaque.verts[o + 2];
        expect(x === 5 || x === 6).toBe(true); expect(y === 5 || y === 6).toBe(true); expect(z === 5 || z === 6).toBe(true);
      }
    }
    // The grass under it still draws all six faces: a sapling hides nothing.
    let grass = 0;
    for (let i = 0; i < m.opaque.verts.length; i += STRIDE * 4) if (Math.floor(m.opaque.verts[i + 6] / 3) === 11) grass++;
    expect(grass).toBe(6);
  });
});

describe("World.topSolid", () => {
  it("skips water and saplings, which are not ground", () => {
    const w = new World();
    w.set(3, 3, 10, 1); w.set(3, 3, 11, WATER); w.set(3, 3, 12, WATER);
    expect(w.topSolid(3, 3)).toBe(10);
    w.set(4, 4, 10, 11); w.set(4, 4, 11, SAPLING);
    expect(w.topSolid(4, 4)).toBe(10);
    w.set(5, 5, 10, 11); w.set(5, 5, 11, LEAVES);
    expect(w.topSolid(5, 5)).toBe(11); // leaves are solid: they can be stood on
  });
});
