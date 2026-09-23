import { describe, it, expect } from "vitest";
import { isOpaque } from "../../src/world/blocks.js";
import { atlasLayerTable, layerOfTable } from "../../src/rendering/voxel/atlas.js";
import { STRIDE } from "../../src/rendering/voxel/mesher.js";
import { vesselModel, meshModel, modelMatrix, MODEL_SCALE } from "../../src/rendering/voxel/vessel-models.js";
import { VESSELS, VESSEL_KINDS } from "../../src/world/vessels.js";

const table = atlasLayerTable();
const layerOf = (id, f) => layerOfTable(table, id, f);

describe("vessel models", () => {
  for (const kind of VESSEL_KINDS) {
    it(`the ${kind} fits a chunk and is built only of opaque blocks`, () => {
      const m = vesselModel(kind);
      expect(m.key).toBe(`vessel:${kind}`);
      for (const n of m.size) expect(n).toBeLessThanOrEqual(16);
      expect(m.cells.length).toBe(m.size[0] * m.size[1] * m.size[2]);
      let solid = 0;
      for (const id of m.cells) if (id) { expect(isOpaque(id), `block ${id}`).toBe(true); solid++; }
      expect(solid).toBeGreaterThan(20);
      expect(vesselModel(kind)).toBe(m); // built once
    });

    it(`the ${kind} meshes into opaque faces, its underside included`, () => {
      const { opaque, alpha, water } = meshModel(vesselModel(kind), layerOf);
      expect(opaque.count).toBeGreaterThan(0);
      expect(alpha.count).toBe(0);
      expect(water.count).toBe(0);
      let bottom = 0;
      for (let i = 0; i < opaque.verts.length; i += STRIDE) if (opaque.verts[i + 3] === 5) bottom++;
      expect(bottom).toBeGreaterThan(0);
    });

    it(`the ${kind} is as wide as its hull's box, within a cell`, () => {
      const m = vesselModel(kind);
      expect(Math.abs(m.size[1] * MODEL_SCALE - 2 * VESSELS[kind].half)).toBeLessThanOrEqual(MODEL_SCALE + 1e-9);
      expect(m.pivot).toEqual([m.size[0] / 2, m.size[1] / 2, 0]);
    });
  }

  it("turns the model's bow to the heading, scaled", () => {
    const apply = (m, v) => [0, 1, 2].map((r) => m[r] * v[0] + m[3 + r] * v[1] + m[6 + r] * v[2]);
    const m = modelMatrix(Math.PI / 2, 0, 0, 0.25);
    const bow = apply(m, [4, 0, 0]);
    expect(bow[0]).toBeCloseTo(0, 9); expect(bow[1]).toBeCloseTo(1, 9); expect(bow[2]).toBeCloseTo(0, 9);
    // A lifted bow rises; a positive roll dips the right (+y) side.
    expect(apply(modelMatrix(0, 0.2, 0, 1), [1, 0, 0])[2]).toBeGreaterThan(0);
    expect(apply(modelMatrix(0, 0, 0.2, 1), [0, 1, 0])[2]).toBeLessThan(0);
  });
});
