// Bounded "void" worlds shaped like the ones v4 left behind: every block is
// content (a delta), ground layered bedrock, rock, dirt and grass (sand on low
// ground), heights from a function. Old worlds were flat at 31 or rolling
// terrain in 26..37; `oldTerrain` imitates the latter from generator v1.
import { World } from "../../../src/world/world.js";
import { BEDROCK } from "../../../src/world/blocks.js";
import { surfaceHeight } from "../../../src/world/column-gen.js";

const DIRT = 10, GRASS = 11, SAND = 12, ROCK = 13;

/** A bounded void world over `bounds` (the 128 box by default) with ground at `heightAt(x, y)`. */
export function oldVoidWorld(heightAt, { seed = 77, bounds } = {}) {
  const w = new World({ name: "Old", gen: { kind: "void", seed, v: 1 }, ...(bounds ? { bounds } : {}) });
  const { x0, y0, x1, y1 } = w.bounds;
  for (const col of w.columns.values()) {
    for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
      const x = col.cx * 16 + lx, y = col.cy * 16 + ly;
      if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
      const t = heightAt(x, y), off = (ly << 4) | lx;
      for (let z = 0; z <= t; z++) {
        col.blocks[(z << 8) | off] = z === 0 ? BEDROCK : z < t - 4 ? ROCK : z < t ? DIRT : t <= 29 ? SAND : GRASS;
      }
    }
    col.modified = true;
  }
  w.markAllDirty();
  w.version++;
  return w;
}

/** Rolling ground in 26..37, the old v4 generator's range, from v1 terrain squashed by half. */
export const oldTerrain = (seed) => (x, y) =>
  Math.max(26, Math.min(37, 31 + Math.round((surfaceHeight({ kind: "terrain", seed, v: 1 }, x, y) - 33) / 2)));
