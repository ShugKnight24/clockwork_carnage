import { describe, it, expect } from "vitest";
import { World, colKey } from "../../src/world/world.js";
import { GEN_VERSION } from "../../src/world/column-gen.js";
import { generateWorld } from "../../src/world/world-gen.js";
import {
  WorldStreamer,
  streamerFor,
  streamRadii,
  drawRadiusFor,
  STEADY_MS,
  LOADING_MS,
} from "../../src/world/world-streamer.js";

const GEN = Object.freeze({ kind: "terrain", seed: 99, v: GEN_VERSION });
const endless = () => new World({ gen: GEN, endless: true });
const BIG = 1e9; // a budget nothing reaches

/** A streamer on a clock that only moves when a column loads: 1 ms each. */
function timed(world, opts = {}) {
  const clock = { t: 0 };
  const ensure = world.ensureColumn.bind(world);
  world.ensureColumn = (cx, cy) => {
    if (!world.column(cx, cy)) clock.t += 1;
    return ensure(cx, cy);
  };
  return { s: new WorldStreamer(world, { clock: () => clock.t, ...opts }), clock };
}

/** Column centres within `r` blocks of (x, y). */
function disc(x, y, r) {
  const out = new Set();
  const n = Math.ceil(r / 16) + 1, cx = Math.floor(x) >> 4, cy = Math.floor(y) >> 4;
  for (let j = cy - n; j <= cy + n; j++) for (let i = cx - n; i <= cx + n; i++) {
    if (Math.hypot(i * 16 + 8 - x, j * 16 + 8 - y) <= r) out.add(colKey(i, j));
  }
  return out;
}

/** Count loads and unloads made while `fn` runs. */
function counting(world, fn) {
  let loads = 0, unloads = 0;
  const ensure = world.ensureColumn, unload = world.unloadColumn;
  world.ensureColumn = function (cx, cy) { if (!this.column(cx, cy)) loads++; return ensure.call(this, cx, cy); };
  world.unloadColumn = function (cx, cy) { if (this.column(cx, cy)) unloads++; return unload.call(this, cx, cy); };
  fn();
  world.ensureColumn = ensure; world.unloadColumn = unload;
  return { loads, unloads };
}

describe("radii", () => {
  it("scale with the quality tier, 160 blocks on high", () => {
    expect(drawRadiusFor({ drawDistance: 20 })).toBe(160);
    expect(drawRadiusFor({ drawDistance: 18 })).toBe(160);
    expect(drawRadiusFor({ drawDistance: 14 })).toBe(128);
    expect(drawRadiusFor({ drawDistance: 10 })).toBe(96);
    expect(drawRadiusFor({ drawDistance: 8 })).toBe(80);
    expect(drawRadiusFor(null)).toBe(160);
  });

  it("mesh past the draw disc, load a neighbour ring past that, unload with hysteresis", () => {
    const r = streamRadii(160);
    expect(r).toEqual({ draw: 160, mesh: 172, load: 196, unload: 220 });
    // Any point drawn sits in a column whose centre is within the mesh radius…
    expect(r.mesh).toBeGreaterThanOrEqual(r.draw + 8 * Math.SQRT2);
    // …and that column's eight neighbours are loaded.
    expect(r.load).toBeGreaterThanOrEqual(r.mesh + 16 * Math.SQRT2);
    expect(r.unload - r.load).toBeGreaterThanOrEqual(16);
  });
});

describe("streamerFor", () => {
  it("gives an endless world one streamer and a bounded world none", () => {
    const w = endless();
    expect(streamerFor(w)).toBeInstanceOf(WorldStreamer);
    expect(streamerFor(w)).toBe(streamerFor(w));
    expect(streamerFor(generateWorld({ terrain: true, seed: 3 }))).toBe(null);
    expect(streamerFor(null)).toBe(null);
  });
});

describe("WorldStreamer", () => {
  it("settles on the disc of the load radius around the camera", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 96 });
    s.update(0.5, 0.5, BIG);
    const want = disc(0.5, 0.5, s.radii.load);
    expect(new Set(w.columns.keys())).toEqual(want);
    expect(s.stats.pending).toBe(0);
    expect(s.stats.resident).toBe(want.size);
  });

  it("loads the nearest columns first", () => {
    const w = endless();
    const { s } = timed(w, { drawRadius: 96 });
    s.update(100.5, -40.5, 4);
    expect(w.columns.size).toBe(4);
    const d = (col) => Math.hypot(col.cx * 16 + 8 - 100.5, col.cy * 16 + 8 + 40.5);
    const loaded = Math.max(...[...w.columns.values()].map(d));
    const rest = [...disc(100.5, -40.5, s.radii.load)].filter((k) => !w.columns.has(k));
    expect(rest.length).toBeGreaterThan(0);
    for (const k of rest) {
      const cx = Math.floor(k / 131072) - 65536, cy = (k % 131072) - 65536;
      expect(d({ cx, cy })).toBeGreaterThanOrEqual(loaded - 1e-9);
    }
  });

  it("keeps to its time budget, and always loads at least one column", () => {
    const w = endless();
    const { s } = timed(w);
    s.update(0, 0, 3);
    expect(s.stats.loaded).toBe(3);
    s.update(0, 0, 0);
    expect(s.stats.loaded).toBe(1);
    expect(s.stats.ms).toBe(1);
  });

  it("walking back and forth over a column border loads and drops nothing after the first crossing", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 96 });
    s.update(14.5, 8.5, BIG);
    s.update(17.5, 8.5, BIG);
    s.update(14.5, 8.5, BIG);
    const n = counting(w, () => {
      for (let i = 0; i < 20; i++) { s.update(17.5, 8.5, BIG); s.update(14.5, 8.5, BIG); }
    });
    expect(n).toEqual({ loads: 0, unloads: 0 });
  });

  it("keeps the resident set bounded on a long walk", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 96 });
    const cap = Math.PI * ((s.radii.unload + 12) / 16) ** 2;
    let most = 0;
    for (let x = 0; x <= 1200; x += 3) {
      s.update(x + 0.5, 0.5, BIG);
      most = Math.max(most, w.columns.size);
    }
    expect(most).toBeLessThan(cap);
    expect(w.column(0, 0)).toBeUndefined();
    expect(w.isLoaded(1200, 0)).toBe(true);
  });

  it("an edit left behind is folded on unload and is there on the way back", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 80 });
    s.update(0.5, 0.5, BIG);
    w.set(3, 4, 55, 7);
    w.markPlaced(3, 4, 55);
    for (let x = 0; x <= 600; x += 8) s.update(-x + 0.5, 0.5, BIG);
    expect(w.isLoaded(3, 4)).toBe(false);
    expect(w.edits.has(colKey(0, 0))).toBe(true);
    for (let x = 600; x >= 0; x -= 8) s.update(-x + 0.5, 0.5, BIG);
    expect(w.get(3, 4, 55)).toBe(7);
    expect(w.wasPlaced(3, 4, 55)).toBe(true);
  });

  it("drops columns loaded outside the disc, such as an undo far away", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 80 });
    s.update(0.5, 0.5, BIG);
    w.set(5000, 5000, 60, 2); // an undo replaying an edit made far away
    expect(w.isLoaded(5000, 5000)).toBe(true);
    s.update(4.5, 0.5, BIG); // the next rescan
    expect(w.isLoaded(5000, 5000)).toBe(false);
    expect(w.edits.has(colKey(5000 >> 4, 5000 >> 4))).toBe(true);
  });

  it("shrinks and grows with the draw radius", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 160 });
    s.update(0.5, 0.5, BIG);
    const big = w.columns.size;
    s.setDrawRadius(80);
    s.update(0.5, 0.5, BIG);
    expect(w.columns.size).toBeLessThan(big);
    expect(w.columns.size).toBeGreaterThanOrEqual(disc(0.5, 0.5, s.radii.load).size);
  });

  it("takes the loading budget until the 5 × 5 around the camera is resident and meshed", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 80 });
    expect(s.budget(0.5, 0.5)).toBe(LOADING_MS);
    s.update(0.5, 0.5, BIG);
    expect(s.budget(0.5, 0.5)).toBe(LOADING_MS); // resident but not meshed
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      for (let cz = 0; cz < 4; cz++) w.dirty.delete(w.chunkIndex(dx, dy, cz));
    }
    expect(s.budget(0.5, 0.5)).toBe(STEADY_MS);
  });

  it("stops at the border", () => {
    const w = endless();
    const s = new WorldStreamer(w, { drawRadius: 80 });
    const edge = World.BORDER - 4;
    s.update(edge, 0.5, BIG);
    for (const col of w.columns.values()) expect(col.cx * 16).toBeLessThan(World.BORDER);
    expect(s.stats.pending).toBe(0);
  });
});
