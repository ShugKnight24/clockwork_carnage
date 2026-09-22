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
    expect(distinct.size).toBe(9 + 7 + 6); // 9 wall tiles + dirt, grass_top, grass_side, sand, rock, ore, bedrock + a side and a top for each station
  });
});
