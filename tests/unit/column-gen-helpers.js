// tests/unit/column-gen-helpers.js
// Shared by column-gen, column-gen-v2 and column-gen-blend. The three files
// each carried their own copy of these readers and of the slope sweep, and
// asserted cell by cell inside loops over hundreds of thousands of cells:
// those per-cell expect() calls were most of the unit suite's time. The
// sweeps here count and collect instead, and the tests assert once.
import { createHash } from "node:crypto";
import { generateColumn } from "../../src/world/column-gen.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";

export const GRASS = 11, DIRT = 10, SAND = 12, ROCK = 13, ORE = 14;
/** Natural ground: what lies under any water and trees. */
export const GROUND = new Set([BEDROCK, GRASS, DIRT, SAND, ROCK, ORE]);

export const sha = (u8) => createHash("sha256").update(u8).digest("hex");
/** A column's block at (lx, ly, z): 16 × 16 × 64, z-major. */
export const at = (col, lx, ly, z) => col[(z << 8) | (ly << 4) | lx];
/** The highest non-air block, trees included. */
export const topOf = (col, lx, ly) => { let z = 63; while (z >= 0 && at(col, lx, ly, z) === AIR) z--; return z; };
/** The top of the natural ground from z = 0 up; -1 over a void. */
export const groundOf = (col, lx, ly) => { let z = -1; while (z < 63 && GROUND.has(at(col, lx, ly, z + 1))) z++; return z; };

/**
 * Per-cell heights of an n × n area at (x0, y0), both multiples of 16, read
 * with `read(col, lx, ly)` from each generateColumn.
 */
export function areaHeights(gen, x0, y0, n, read) {
  const out = new Int16Array(n * n);
  for (let cy = 0; cy < n / 16; cy++) for (let cx = 0; cx < n / 16; cx++) {
    const col = generateColumn(gen, (x0 >> 4) + cx, (y0 >> 4) + cy);
    for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) out[(cy * 16 + ly) * n + cx * 16 + lx] = read(col, lx, ly);
  }
  return out;
}

/**
 * The slope sweep the generators are held to: |Δheight| between right and
 * down 4-neighbours of an n × n height grid. A pair is rocky when
 * `rocky(i, j)` says so (the highlands); those count only toward worstRocky.
 */
export function slopeStats(t, n, rocky) {
  let pairs = 0, steep = 0, worst = 0, worstRocky = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    for (const j of [x + 1 < n ? i + 1 : -1, y + 1 < n ? i + n : -1]) {
      if (j < 0) continue;
      const d = Math.abs(t[j] - t[i]);
      if (rocky(i, j)) { worstRocky = Math.max(worstRocky, d); continue; }
      worst = Math.max(worst, d);
      pairs++; if (d > 1) steep++;
    }
  }
  return { pairs, steep, worst, worstRocky };
}
