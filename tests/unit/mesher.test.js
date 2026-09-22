import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { meshChunk, vertexAO, STRIDE, NORMALS } from "../../src/rendering/voxel/mesher.js";

const layerOf = (id, face) => id * 3 + face;
const quads = (m) => m.indices.length / 6;
const pos = (m, k) => [m.verts[k * STRIDE], m.verts[k * STRIDE + 1], m.verts[k * STRIDE + 2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
// `+ 0` folds -0 to 0 so toEqual (Object.is) compares the direction, not the sign of zero.
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1] + 0, a[2] * b[0] - a[0] * b[2] + 0, a[0] * b[1] - a[1] * b[0] + 0];

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

  it("winds every triangle counter-clockwise seen from outside", () => {
    const w = new World(); w.set(5, 5, 5, 1);
    const m = meshChunk(w, 0, 0, 0, layerOf).opaque;
    expect(m.indices.length).toBe(36);
    for (let t = 0; t < m.indices.length; t += 3) {
      const a = m.indices[t], b = m.indices[t + 1], c = m.indices[t + 2];
      // Unit-block faces: the legs are unit vectors, so the cross product is the unit normal.
      const n = cross(sub(pos(m, b), pos(m, a)), sub(pos(m, c), pos(m, b)));
      expect(n).toEqual(NORMALS[m.verts[a * STRIDE + 3]]);
    }
  });

  it("two adjacent blocks share no interior face and merge into greedy quads", () => {
    const w = new World(); w.set(5, 5, 5, 1); w.set(6, 5, 5, 1);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.opaque)).toBe(6); // 4 merged long faces + 2 end caps
  });

  it("a solid chunk merges each side into a single 16x16 quad", () => {
    const w = new World();
    for (let z = 16; z < 32; z++) for (let y = 16; y < 32; y++) for (let x = 16; x < 32; x++) w.set(x, y, z, 1);
    const m = meshChunk(w, 1, 1, 1, layerOf);
    expect(quads(m.opaque)).toBe(6);
    expect(m.opaque.indices).toBeInstanceOf(Uint16Array);
    const spans = new Set();
    for (let i = 0; i < m.opaque.verts.length; i += STRIDE) spans.add(`${m.opaque.verts[i + 4]},${m.opaque.verts[i + 5]}`);
    expect(spans).toEqual(new Set(["0,0", "16,0", "16,16", "0,16"]));
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
