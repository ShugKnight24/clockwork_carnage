import { describe, it, expect } from "vitest";
import { BLOCKS, WATER, WATER_SURFACE, isSolid, isOpaque, isWater, AIR, FACE } from "../../src/world/blocks.js";
import { faceKeys, atlasLayerTable, layerOfTable } from "../../src/rendering/voxel/atlas.js";

/** Must match MAX_LAYERS in voxel-renderer.js and the uniform arrays in CHUNK_FRAG. */
const MAX_LAYERS = 32;

describe("water block", () => {
  it("is id 19, appended after the stations", () => {
    expect(WATER).toBe(19);
    expect(BLOCKS[WATER]).toMatchObject({ id: 19, name: "Water", kind: "water" });
    expect(BLOCKS[WATER].hardness).toBe(0);
    expect(BLOCKS[18].name).toBe("Forge");
  });

  it("is neither solid nor opaque, so bodies and rays pass through it", () => {
    expect(isSolid(WATER)).toBe(false);
    expect(isOpaque(WATER)).toBe(false);
    expect(isWater(WATER)).toBe(true);
    for (const b of BLOCKS) if (b.id !== WATER) expect(isWater(b.id)).toBe(false);
    // Everything else keeps its old answer.
    expect(isSolid(AIR)).toBe(false);
    for (let id = 1; id <= 18; id++) expect(isSolid(id)).toBe(true);
  });

  it("puts its surface at seven eighths of the cell", () => {
    expect(WATER_SURFACE).toBe(0.875);
  });

  it("has its own ripple layer in the atlas and keeps the atlas inside the shader's layer count", () => {
    expect(faceKeys()).toContain("nat:water");
    expect(faceKeys().length).toBeLessThanOrEqual(MAX_LAYERS);
    const t = atlasLayerTable();
    const water = layerOfTable(t, WATER, FACE.TOP);
    expect(layerOfTable(t, WATER, FACE.SIDE)).toBe(water);
    expect(layerOfTable(t, WATER, FACE.BOTTOM)).toBe(water);
    for (let id = 1; id < WATER; id++) for (const f of [0, 1, 2]) expect(layerOfTable(t, id, f)).not.toBe(water);
  });
});
