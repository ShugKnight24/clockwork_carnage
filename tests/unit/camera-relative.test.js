import { describe, it, expect } from "vitest";
import { World, colKey } from "../../src/world/world.js";
import { GEN_VERSION } from "../../src/world/column-gen.js";
import {
  lookAt,
  eyeAnchor,
  wrapOffset,
  edgeFog,
  meshOrder,
} from "../../src/rendering/voxel/voxel-renderer.js";
import { RIPPLE_SCALES, RIPPLE_PERIOD, FOG_FADE, CHUNK_FRAG, WATER_FRAG, POST_FRAG } from "../../src/rendering/voxel/shaders.js";

const f = Math.fround;

/** view × (p, 1) with every multiply and add rounded to float32, as a GPU does. */
function viewF32(m, p) {
  const M = Float32Array.from(m);
  const x = f(p[0]), y = f(p[1]), z = f(p[2]);
  const out = [];
  for (let r = 0; r < 3; r++) {
    let acc = f(f(M[r] * x) + f(M[4 + r] * y));
    acc = f(acc + f(M[8 + r] * z));
    out.push(f(acc + M[12 + r]));
  }
  return out;
}

/** The same product in doubles: the answer both paths should give. */
function viewF64(m, p) {
  return [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
}

describe("camera-relative rendering", () => {
  // Far from spawn: at x = 900,000 a float32 step is 1/16 of a block.
  const eye = [900_000.37, -700_000.81, 40.2];
  const yaw = 0.61, pitch = -0.23;
  const origin = [899_984, -700_016, 32];   // a chunk the eye stands next to
  const local = [3, 5, 7];                   // one of its vertices

  it("keeps a vertex at x = 900,000 within 1e-4 blocks, where world-space math was off by a hundredth", () => {
    const worldPos = local.map((v, i) => v + origin[i]);
    const exact = viewF64(lookAt(new Float64Array(16), eye, yaw, pitch), worldPos);

    // Before: the origin went to the GPU as is and the view carried the eye.
    const oldView = lookAt(new Float32Array(16), eye, yaw, pitch);
    const oldPos = local.map((v, i) => f(v + f(origin[i])));
    const oldErr = Math.max(...viewF32(oldView, oldPos).map((v, i) => Math.abs(v - exact[i])));

    // After: the origin is shifted by the eye's whole block in doubles, and
    // the view carries only the eye's fraction of a block.
    const A = eyeAnchor({ x: eye[0], y: eye[1], z: eye[2] });
    expect(A).toEqual([900_000, -700_001, 40]);
    const view = lookAt(new Float32Array(16), eye.map((v, i) => v - A[i]), yaw, pitch);
    const rel = local.map((v, i) => f(v + f(origin[i] - A[i])));
    const newErr = Math.max(...viewF32(view, rel).map((v, i) => Math.abs(v - exact[i])));

    expect(oldErr).toBeGreaterThan(0.01);
    expect(newErr).toBeLessThan(1e-4);
    for (const t of view.subarray(12, 15)) expect(Math.abs(t)).toBeLessThan(2);
  });

  it("gives neighbouring chunks' shared corners the same position, so no cracks open", () => {
    const A = eyeAnchor({ x: eye[0], y: eye[1], z: eye[2] });
    const view = lookAt(new Float32Array(16), eye.map((v, i) => v - A[i]), yaw, pitch);
    const a = [899_984, -700_016, 32], b = [900_000, -700_016, 32];
    // Corner x = 16 of chunk a is corner x = 0 of chunk b: whole-block
    // differences are exact in float32, so the two land on the same bits.
    const pa = viewF32(view, [16, 4, 9].map((v, i) => f(v + f(a[i] - A[i]))));
    const pb = viewF32(view, [0, 4, 9].map((v, i) => f(v + f(b[i] - A[i]))));
    expect(pa).toEqual(pb);
  });

  it("hands the water a world phase that is a whole number of ripple cycles away", () => {
    for (const s of RIPPLE_SCALES) expect(Number.isInteger(Math.round(RIPPLE_PERIOD * s * 1e9) / 1e9)).toBe(true);
    for (const x of [0, 12.5, -3.25, 900_000.37, -1_048_000.5]) {
      const w = wrapOffset(x);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThan(RIPPLE_PERIOD);
      // The phase the shader sees differs from the true one by whole cycles only.
      for (const s of RIPPLE_SCALES) {
        const cycles = (x - w) * s;
        expect(Math.abs(cycles - Math.round(cycles))).toBeLessThan(1e-6);
      }
    }
    expect(WATER_FRAG).toContain("u_wrap");
  });

  it("no shader reads a world-space camera position any more", () => {
    for (const src of [CHUNK_FRAG, WATER_FRAG]) {
      expect(src).not.toContain("u_cam");
      expect(src).toContain("u_eye");
    }
  });
});

describe("edge fog", () => {
  it("is clear inside the last 16 blocks, full at the edge, and rises smoothly", () => {
    expect(FOG_FADE).toBe(16);
    expect(edgeFog(0, 160)).toBe(0);
    expect(edgeFog(144, 160)).toBe(0);
    expect(edgeFog(160, 160)).toBe(1);
    expect(edgeFog(300, 160)).toBe(1);
    let last = 0;
    for (let d = 144; d <= 160; d += 0.5) {
      const v = edgeFog(d, 160);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
    expect(edgeFog(152, 160)).toBeCloseTo(0.5, 5);
    // A bounded world passes no edge: nothing it draws is fogged by it.
    expect(edgeFog(200, 1e9)).toBe(0);
    for (const src of [CHUNK_FRAG, WATER_FRAG, POST_FRAG]) expect(src).toContain("u_fogEnd");
  });
});

describe("meshOrder", () => {
  const GEN = { kind: "flat", v: GEN_VERSION };

  it("holds back chunks whose column lacks a neighbour or lies past the mesh radius, nearest first otherwise", () => {
    const w = new World({ gen: GEN, endless: true });
    w.loadAround(8, 8, 2); // 5 × 5 columns: only the inner 3 × 3 have all neighbours
    const keys = meshOrder(w, w.dirty, 8, 8, 40);
    const cols = new Set(keys.map((k) => w.chunkCoords(k).slice(0, 2).join(",")));
    expect(cols.size).toBe(9);
    for (const c of cols) {
      const [cx, cy] = c.split(",").map(Number);
      expect(Math.max(Math.abs(cx), Math.abs(cy))).toBeLessThanOrEqual(1);
    }
    // Nearest first: the camera's own chunk leads.
    expect(keys[0]).toBe(w.chunkIndex(0, 0, 2));
    const d = (k) => { const [x, y, z] = w.chunkCoords(k); return Math.hypot(x * 16 + 8 - 8, y * 16 + 8 - 8, z * 16 + 8 - 40); };
    for (let i = 1; i < keys.length; i++) expect(d(keys[i])).toBeGreaterThanOrEqual(d(keys[i - 1]) - 1e-9);

    const near = meshOrder(w, w.dirty, 8, 8, 40, 10);
    expect(new Set(near.map((k) => w.chunkCoords(k).slice(0, 2).join(",")))).toEqual(new Set(["0,0"]));
    expect(w.columns.has(colKey(2, 2))).toBe(true);
  });

  it("meshes every chunk of a bounded world", () => {
    const w = new World();
    expect(meshOrder(w, w.dirty, 64, 64, 32)).toHaveLength(256);
  });
});
