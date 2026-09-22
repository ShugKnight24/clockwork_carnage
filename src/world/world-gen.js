// src/world/world-gen.js
import { World } from "./world.js";
import { BEDROCK } from "./blocks.js";
import { SeededRNG } from "../utils/seeded-rng.js";

const GRASS = 11, DIRT = 10, ROCK = 13, ORE = 14, SAND = 12;

/** Value noise on a 16-cell lattice, two octaves, in [-1, 1]. */
function makeNoise(rng) {
  const lat = new Float32Array(17 * 17);
  for (let i = 0; i < lat.length; i++) lat[i] = rng.next() * 2 - 1;
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
        if (id === ROCK && z > 2 && rng.next() < 0.02) id = ORE;
        w.blocks[w.index(x, y, z)] = id;
      }
    }
  }
  w.meta.spawn = { x: 64.5, y: 64.5, z: w.topSolid(64, 64) + 1, yaw: 0 };
  w.dirty.fill(1); // generation is not an edit; the renderer meshes everything on first sight anyway
  return w;
}
