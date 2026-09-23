// src/world/world-gen.js
import { World } from "./world.js";
import { GEN_VERSION, generateColumn, findSpawn } from "./column-gen.js";

/** A fresh unsigned 32-bit world seed. */
export function randomSeed() {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return (Math.random() * 4294967296) >>> 0;
}

/**
 * A new world from its stored generator settings (`meta.gen`), so the same
 * terrain can be made again from the meta alone.
 *
 * An endless world generates nothing here: columns are loaded around the
 * player as it moves (world-streamer.js), and its spawn is found from surface
 * heights alone. A bounded world is the 128 box, generated whole.
 * `v` is the generator version, the newest unless a caller needs an old one.
 */
export function generateWorld({ terrain = false, seed = 1, act = 1, name = "New World", endless = false, v = GEN_VERSION } = {}) {
  const gen = { kind: terrain ? "terrain" : "flat", seed: seed >>> 0, v };
  const w = new World(endless ? { name, act, gen, endless: true } : { name, act, gen });
  const s = w.defaultSpawn();
  w.meta.spawn = { ...findSpawn(gen, s.x, s.y, w.bounds), yaw: 0 };
  if (endless) return w;
  const { x0, y0, x1, y1 } = w.bounds;
  for (let cy = y0 >> 4; cy <= (y1 - 1) >> 4; cy++) for (let cx = x0 >> 4; cx <= (x1 - 1) >> 4; cx++) {
    generateColumn(gen, cx, cy, w.ensureColumn(cx, cy).blocks); // straight into the column: generation is not an edit
  }
  w.markAllDirty(); // the renderer meshes everything on first sight anyway
  w.version++; // direct column writes bypass set(), so bump version once to honor the "bumps on every change" contract
  return w;
}
