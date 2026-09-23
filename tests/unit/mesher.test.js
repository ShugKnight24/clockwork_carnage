import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { meshChunk, vertexAO, STRIDE, NORMALS } from "../../src/rendering/voxel/mesher.js";
import { meshChunk as meshChunkV0 } from "./fixtures/mesher-v0.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { SeededRNG } from "../../src/utils/seeded-rng.js";

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

describe("mesher reading a padded copy", () => {
  /** A world with see-through and station blocks scattered over chunk and column borders. */
  function busyWorld(seed) {
    // Generator v1: the reference mesher predates water and cut-out leaves.
    const w = generateWorld({ terrain: true, seed, v: 1 });
    const rng = new SeededRNG(seed);
    // Half the edits land on a chunk face, where the neighbour reads matter.
    const coord = () => (rng.next() < 0.5 ? ((rng.next() * 8) | 0) * 16 + (rng.next() < 0.5 ? 0 : 15) : (rng.next() * 128) | 0);
    for (let i = 0; i < 4000; i++) {
      const id = [0, 1, 5, 8, 8, 9, 16, 18][(rng.next() * 8) | 0];
      w.set(coord(), coord(), 20 + ((rng.next() * 40) | 0), id);
    }
    return w;
  }

  const identical = (a, b) =>
    a.count === b.count &&
    a.indices.constructor === b.indices.constructor &&
    Buffer.from(a.verts).equals(Buffer.from(b.verts)) &&
    Buffer.from(a.indices.buffer).equals(Buffer.from(b.indices.buffer));

  it("matches the per-voxel mesher byte for byte over whole worlds", () => {
    for (const w of [busyWorld(5), busyWorld(77), generateWorld({ terrain: false })]) {
      let faces = 0;
      w.forEachChunk((cx, cy, cz) => {
        const a = meshChunk(w, cx, cy, cz, layerOf), b = meshChunkV0(w, cx, cy, cz, layerOf);
        for (const pass of ["opaque", "alpha"]) {
          if (!identical(a[pass], b[pass])) expect(`${pass} ${cx},${cy},${cz}`).toBe("identical");
        }
        faces += a.opaque.count + a.alpha.count;
      });
      expect(faces).toBeGreaterThan(0);
    }
  });

  it("matches at the edges of a world bounded at negative coordinates", () => {
    const w = new World({ bounds: { x0: -32, y0: -32, x1: 0, y1: 0 } });
    for (let y = -32; y < 0; y++) for (let x = -32; x < 0; x++) {
      for (let z = 0; z < 20 + ((x * y) & 7); z++) w.set(x, y, z, z === 0 ? 15 : 13);
    }
    w.set(-17, -16, 25, 8); w.set(-16, -17, 25, 5); w.set(-1, -1, 40, 1);
    w.forEachChunk((cx, cy, cz) => {
      const a = meshChunk(w, cx, cy, cz, layerOf), b = meshChunkV0(w, cx, cy, cz, layerOf);
      expect(identical(a.opaque, b.opaque) && identical(a.alpha, b.alpha), `${cx},${cy},${cz}`).toBe(true);
    });
  });

  it("skips an all-air chunk without asking for a single layer", () => {
    const w = generateWorld({ terrain: false });
    let asked = 0;
    const m = meshChunk(w, 3, 3, 3, (id, f) => { asked++; return layerOf(id, f); });
    expect(m.opaque.count + m.alpha.count).toBe(0);
    expect(m.opaque.verts.length).toBe(0);
    expect(asked).toBe(0);
  });
});

describe("mesher: water", () => {
  const W = 19;
  /** Every water vertex as {x, y, z, n, flag}; the AO byte carries the surface flag. */
  const waterVerts = (m) => {
    const out = [];
    for (let i = 0; i < m.water.verts.length; i += STRIDE) {
      const v = m.water.verts;
      out.push({ x: v[i], y: v[i + 1], z: v[i + 2], n: v[i + 3], flag: v[i + 7] });
    }
    return out;
  };
  /** A stone basin with its floor at z = 4 and walls one ring out, around x, y in 5..7. */
  const basin = () => {
    const w = new World();
    for (let y = 4; y <= 8; y++) for (let x = 4; x <= 8; x++) {
      w.set(x, y, 4, 1);
      if (x === 4 || x === 8 || y === 4 || y === 8) { w.set(x, y, 5, 1); w.set(x, y, 6, 1); }
    }
    return w;
  };

  it("a lone water cell gives six faces, all in the water buffer", () => {
    const w = new World(); w.set(5, 5, 5, W);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.water)).toBe(6);
    expect(quads(m.opaque)).toBe(0); expect(quads(m.alpha)).toBe(0);
    const layers = new Set(); for (let i = 0; i < m.water.verts.length; i += STRIDE) layers.add(m.water.verts[i + 6]);
    expect(layers).toEqual(new Set([layerOf(W, 0), layerOf(W, 1), layerOf(W, 2)]));
  });

  it("flags the corners on the open surface and no others", () => {
    const w = new World(); w.set(5, 5, 5, W);
    for (const v of waterVerts(meshChunk(w, 0, 0, 0, layerOf))) expect(v.flag).toBe(v.z === 6 ? 1 : 0);
  });

  it("a cell with water above is full to the top; only the top cell's upper edge is surface", () => {
    const w = new World(); w.set(5, 5, 5, W); w.set(5, 5, 6, W);
    const vs = waterVerts(meshChunk(w, 0, 0, 0, layerOf));
    expect(vs.some((v) => v.z === 6 && v.flag === 0)).toBe(true); // the lower cell's side, up to z = 6, unlowered
    for (const v of vs) {
      if (v.z === 7) expect(v.flag).toBe(1);
      if (v.z === 5) expect(v.flag).toBe(0);
    }
  });

  it("water under a solid ceiling is not a surface", () => {
    const w = new World(); w.set(5, 5, 5, W); w.set(5, 5, 6, 1);
    const vs = waterVerts(meshChunk(w, 0, 0, 0, layerOf));
    expect(vs.every((v) => v.flag === 0)).toBe(true);
    expect(vs.some((v) => v.n === 4)).toBe(false); // the stone hides the water's top
  });

  it("a pool has no inner faces and no faces against its basin; its top is one quad", () => {
    const w = basin();
    const dry = meshChunk(w, 0, 0, 0, layerOf);
    for (let z = 5; z <= 6; z++) for (let y = 5; y <= 7; y++) for (let x = 5; x <= 7; x++) w.set(x, y, z, W);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.water)).toBe(1);
    expect(m.water.verts[3]).toBe(4); // the one quad faces up
    expect(waterVerts(m).every((v) => v.z === 7 && v.flag === 1)).toBe(true);
    // The basin's own faces are drawn against water exactly as against air.
    expect(quads(m.opaque)).toBe(quads(dry.opaque));
    expect(Buffer.from(m.opaque.verts).equals(Buffer.from(dry.opaque.verts))).toBe(true);
  });

  it("water and glass keep the faces they share, each in its own buffer", () => {
    const w = new World(); w.set(5, 5, 5, W); w.set(6, 5, 5, 8);
    const m = meshChunk(w, 0, 0, 0, layerOf);
    expect(quads(m.water)).toBe(6); expect(quads(m.alpha)).toBe(6);
    expect(waterVerts(m).some((v) => v.n === 0 && v.x === 6)).toBe(true);
  });

  it("an all-air chunk has an empty water buffer too", () => {
    const m = meshChunk(new World(), 0, 0, 0, layerOf);
    expect(m.water.count).toBe(0);
  });
});
