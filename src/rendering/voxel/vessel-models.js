/**
 * Vessels as small voxel models: a grid of block ids per kind, meshed by the
 * chunk mesher and drawn with a model transform in place of a chunk origin
 * (water spec §D). That reuses the atlas, the lighting and the ink outline;
 * a billboard was ruled out because you sit in a boat, and a flat sprite
 * seen from inside it falls apart.
 *
 * A model cell is `MODEL_SCALE` of a block, so a boat reads as planks and
 * ribs rather than three blocks glued together. Grid axes: x runs stern to
 * bow, y from the left side to the right, z up from the keel. Pure: no DOM,
 * no GL.
 */
import { meshChunk } from "./mesher.js";

export const MODEL_SCALE = 0.25;

const STONE = 1, TECH = 2, METAL = 3, ENERGY = 4, ROCK = 13, LOG = 20, PLANKS = 22;

/** A grid with a painter: `put(x, y, z, id)` fills a cell, out-of-range writes are dropped. */
function grid(sx, sy, sz, paint) {
  const cells = new Uint8Array(sx * sy * sz);
  const put = (x, y, z, id) => {
    if (x >= 0 && y >= 0 && z >= 0 && x < sx && y < sy && z < sz) cells[x + sx * (y + sy * z)] = id;
  };
  paint(put);
  return { size: [sx, sy, sz], cells };
}

/**
 * Raft, 2¼ × 2 blocks: three logs lashed side by side, two plank cross-beams
 * on top, the rider sitting on the logs between them.
 */
function raft() {
  return grid(9, 8, 3, (put) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) {
      put(x, y, 0, LOG);
      // A groove between the logs, so they read as three and not a slab.
      if (y !== 2 && y !== 5) put(x, y, 1, LOG);
    }
    for (const x of [1, 7]) for (let y = 0; y < 8; y++) put(x, y, 2, PLANKS);
  });
}

/**
 * Boat, 3 × 1½ blocks: a plank hull that narrows to the bow and stern, a flat
 * floor, two thwarts to sit on and a metal cap on the stem.
 */
function boat() {
  const sx = 12, sy = 6;
  // Half-width of the hull at each station along it, in cells from the centre line.
  const beam = [1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1];
  return grid(sx, sy, 3, (put) => {
    for (let x = 0; x < sx; x++) {
      const b = beam[x], y0 = sy / 2 - b, y1 = sy / 2 + b - 1;
      for (let y = y0; y <= y1; y++) {
        // The keel layer is a cell narrower, so the hull's sides flare.
        if (b === 1 || (y > y0 && y < y1) || x === 0 || x === sx - 1) put(x, y, 0, PLANKS);
        const wall = y === y0 || y === y1 || x === 0 || x === sx - 1 || b === 1;
        if (wall) { put(x, y, 1, PLANKS); put(x, y, 2, PLANKS); }
      }
    }
    for (const x of [4, 8]) for (let y = 1; y < sy - 1; y++) put(x, y, 1, PLANKS);
    put(sx - 1, 2, 2, METAL); put(sx - 1, 3, 2, METAL);
  });
}

/**
 * Jetski, 2¼ × 1 blocks: a metal hull, a tech-plate body, a dark saddle, a
 * handlebar pod and a glowing energy stripe and headlight at the bow.
 */
function jetski() {
  const sx = 9, sy = 4;
  return grid(sx, sy, 4, (put) => {
    for (let x = 1; x < sx - 1; x++) for (let y = 1; y < 3; y++) put(x, y, 0, METAL);
    for (let x = 0; x < sx; x++) for (let y = 0; y < sy; y++) {
      if (x === sx - 1 && (y === 0 || y === 3)) continue; // a pointed bow
      put(x, y, 1, y === 0 || y === 3 ? (x >= 2 && x <= 6 ? ENERGY : METAL) : METAL);
    }
    for (let x = 0; x < 7; x++) for (let y = 0; y < sy; y++) put(x, y, 2, TECH);
    put(sx - 2, 1, 2, TECH); put(sx - 2, 2, 2, TECH);
    put(sx - 1, 1, 2, ENERGY); put(sx - 1, 2, 2, ENERGY);
    for (let x = 1; x < 5; x++) for (let y = 1; y < 3; y++) put(x, y, 3, ROCK);
    put(6, 1, 3, STONE); put(6, 2, 3, STONE);
  });
}

const BUILD = { raft, boat, jetski };
const CACHE = new Map();

/**
 * The model of a vessel kind, built once: `{key, size, cells, pivot, scale}`.
 * `cells` is indexed `x + sx * (y + sy * z)`; `pivot` is the centre of the
 * keel, the point a vessel's (x, y, z) names.
 */
export function vesselModel(kind) {
  let m = CACHE.get(kind);
  if (!m && BUILD[kind]) {
    const g = BUILD[kind]();
    m = { key: `vessel:${kind}`, ...g, pivot: [g.size[0] / 2, g.size[1] / 2, 0], scale: MODEL_SCALE };
    CACHE.set(kind, m);
  }
  return m || null;
}

/**
 * The chunk mesher reads a world through `readBox`. This one answers the
 * model's cells and air everywhere else, below the keel included, so the
 * underside of the hull is drawn rather than hidden against bedrock.
 */
function modelSource({ size: [mx, my, mz], cells }) {
  return {
    readBox(x0, y0, z0, sx, sy, sz, out) {
      for (let z = 0; z < sz; z++) for (let y = 0; y < sy; y++) for (let x = 0; x < sx; x++) {
        const gx = x0 + x, gy = y0 + y, gz = z0 + z;
        const inside = gx >= 0 && gy >= 0 && gz >= 0 && gx < mx && gy < my && gz < mz;
        out[(z * sy + y) * sx + x] = inside ? cells[gx + mx * (gy + my * gz)] : 0;
      }
      return out;
    },
  };
}

/** Mesh a model as chunk (0, 0, 0) of its own tiny world. */
export function meshModel(model, layerOf) {
  return meshChunk(modelSource(model), 0, 0, 0, layerOf);
}

/**
 * Column-major 3 × 3 for `uniformMatrix3fv`: scale, then roll about the bow
 * axis (positive dips the right side), pitch about the beam (positive lifts
 * the bow), then yaw about world up.
 */
export function modelMatrix(yaw, pitch, roll, scale, out = new Float32Array(9)) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  // The images of the model's bow (x), right (y) and up (z) axes after the
  // roll and the pitch, then turned by the yaw and scaled: the three columns.
  const col = (x, y, z, o) => {
    out[o] = (cy * x - sy * y) * scale; out[o + 1] = (sy * x + cy * y) * scale; out[o + 2] = z * scale;
  };
  col(cp, 0, sp, 0);
  col(sr * sp, cr, -sr * cp, 3);
  col(-cr * sp, sr, cr * cp, 6);
  return out;
}
