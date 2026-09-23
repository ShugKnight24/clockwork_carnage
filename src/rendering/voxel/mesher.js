/**
 * Greedy mesher for one 16³ chunk. Faces are emitted per axis/direction as
 * merged rectangles when block id and the four per-vertex AO values match.
 * Vertex: x,y,z (0..16 local), n (0..5), u,v (block units), layer, ao (0..3).
 * Pure typed-array work — no DOM, no GL — so it runs in node and in a worker.
 */
import { World } from "../../world/world.js";
import { isOpaque, isSolid, isWater, FACE } from "../../world/blocks.js";

export const STRIDE = 8;
const CS = World.CS;

/**
 * The chunk plus one cell on every side (18³, 5.8 KB), copied out of the world
 * once per chunk. The hidden-face and AO tests read it directly instead of
 * calling `world.get` up to ten times per visible face, and it is exactly the
 * message a worker would need if meshing ever moves off the main thread.
 * Shared scratch: meshChunk is synchronous and never re-entered.
 */
const P = CS + 2;
const pad = new Uint8Array(P * P * P);

/** True when the chunk's own 16³ (not its padding) has any block at all. */
function anyBlock() {
  for (let z = 1; z <= CS; z++) for (let y = 1; y <= CS; y++) {
    const row = (z * P + y) * P;
    for (let x = row + 1; x <= row + CS; x++) if (pad[x] !== 0) return true;
  }
  return false;
}

/** n: 0=+x 1=-x 2=+y 3=-y 4=+z 5=-z */
export const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// Per slice axis (n >> 1): the slice step and the two in-plane steps. u and v are
// picked so u × v points along +axis, which makes the +axis winding below CCW.
const AXIS_D = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const AXIS_U = [[0, 1, 0], [0, 0, 1], [1, 0, 0]];
const AXIS_V = [[0, 0, 1], [1, 0, 0], [0, 1, 0]];

export const vertexAO = (s1, s2, c) => (s1 && s2 ? 0 : 3 - (s1 + s2 + c));

const faceKind = (n) => (n === 4 ? FACE.TOP : n === 5 ? FACE.BOTTOM : FACE.SIDE);

class Builder {
  constructor() { this.v = []; this.i = []; }

  /** Corners, uvs and AO must already be in CCW order seen from outside. */
  quad(corners, uvs, ao, n, layer) {
    const b = this.v.length / STRIDE;
    for (let k = 0; k < 4; k++) {
      const c = corners[k], uv = uvs[k];
      this.v.push(c[0], c[1], c[2], n, uv[0], uv[1], layer, ao[k]);
    }
    // Split along the darker diagonal, else the AO gradient seams across the quad.
    if (ao[0] + ao[2] > ao[1] + ao[3]) this.i.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    else this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  finish() {
    const verts = Uint8Array.from(this.v);
    // A 16³ chunk tops out at 12288 quads (49152 verts), so Uint16 always fits;
    // the guard keeps the contract honest if the chunk size ever grows.
    const indices = this.v.length / STRIDE > 65536 ? Uint32Array.from(this.i) : Uint16Array.from(this.i);
    return { verts, indices, count: this.i.length };
  }
}

/**
 * @param {World} world
 * @param {number} cx @param {number} cy @param {number} cz chunk coords
 * @param {(id: number, faceKind: number) => number} layerOf atlas layer per block face
 * @returns {{ opaque: { verts: Uint8Array, indices: Uint16Array|Uint32Array, count: number }, alpha: object, water: object }}
 *   `water` vertices carry no AO: their AO byte is 1 on a corner that sits on
 *   an open surface, which the vertex shader lowers to WATER_SURFACE.
 */
export function meshChunk(world, cx, cy, cz, layerOf) {
  const ox = cx * CS, oy = cy * CS, oz = cz * CS;
  world.readBox(ox - 1, oy - 1, oz - 1, P, P, P, pad);
  const opaqueB = new Builder(), alphaB = new Builder(), waterB = new Builder();
  // A quarter of today's terrain chunks are sky; nothing to sweep.
  if (!anyBlock()) return { opaque: opaqueB.finish(), alpha: alphaB.finish(), water: waterB.finish() };
  // Chunk-local coordinates, -1..16, into the padded copy.
  const get = (x, y, z) => pad[((z + 1) * P + y + 1) * P + x + 1];
  const solid = (x, y, z) => (isSolid(get(x, y, z)) ? 1 : 0);
  // A water cell is filled to WATER_SURFACE only when open air (not water, not
  // a block) is above it; under anything else it is full.
  const openTop = (x, y, z) => { const a = get(x, y, z + 1); return !isWater(a) && !isSolid(a); };
  const mask = new Int32Array(CS * CS), maskAO = new Uint8Array(CS * CS);

  for (let n = 0; n < 6; n++) {
    const axis = n >> 1;
    const [nx, ny, nz] = NORMALS[n];
    const [ax, ay, az] = AXIS_D[axis];
    const [ux, uy, uz] = AXIS_U[axis];
    const [vx, vy, vz] = AXIS_V[axis];

    for (let d = 0; d < CS; d++) {
      // Mask of visible faces in slice d, plus their four packed AO values.
      let any = false;
      for (let j = 0; j < CS; j++) {
        for (let i = 0; i < CS; i++) {
          const x = ax * d + ux * i + vx * j;
          const y = ay * d + uy * i + vy * j;
          const z = az * d + uz * i + vz * j;
          const id = get(x, y, z);
          let vis = 0, aoPacked = 0;
          if (id !== 0) {
            const nId = get(x + nx, y + ny, z + nz);
            // An opaque neighbour hides any face; a see-through block (glass,
            // door) only hides the face it shares with its own kind, so a pane
            // has no interior faces but still meets stone with a visible face.
            // Water is hidden by water and by anything opaque: a lake draws
            // its surface, and its bed draws itself.
            const covered = isOpaque(id) ? isOpaque(nId) : nId === id || (isWater(id) && isOpaque(nId));
            vis = covered ? 0 : id;
          }
          if (vis && isWater(id)) {
            // No AO on water. Instead flag the corners on the cell's top edge
            // when it is open to the air: all four of a top face, none of a
            // bottom face, and a side face's +z pair (+v on x faces, +u on y).
            if (n !== 5 && openTop(x, y, z)) {
              aoPacked = n === 4 ? 0x55 : axis === 0 ? (1 << 4) | (1 << 6) : (1 << 2) | (1 << 4);
            }
            any = true;
          } else if (vis) {
            // AO samples sit in the plane one step along the normal, around each corner.
            const bx = x + nx, by = y + ny, bz = z + nz;
            const uN = solid(bx - ux, by - uy, bz - uz), uP = solid(bx + ux, by + uy, bz + uz);
            const vN = solid(bx - vx, by - vy, bz - vz), vP = solid(bx + vx, by + vy, bz + vz);
            const a00 = vertexAO(uN, vN, solid(bx - ux - vx, by - uy - vy, bz - uz - vz));
            const a10 = vertexAO(uP, vN, solid(bx + ux - vx, by + uy - vy, bz + uz - vz));
            const a11 = vertexAO(uP, vP, solid(bx + ux + vx, by + uy + vy, bz + uz + vz));
            const a01 = vertexAO(uN, vP, solid(bx - ux + vx, by - uy + vy, bz - uz + vz));
            aoPacked = a00 | (a10 << 2) | (a11 << 4) | (a01 << 6);
            any = true;
          }
          mask[j * CS + i] = vis; maskAO[j * CS + i] = aoPacked;
        }
      }
      if (!any) continue;

      // Greedy merge: grow along u, then along v while the whole row matches.
      for (let j = 0; j < CS; j++) {
        for (let i = 0; i < CS;) {
          const id = mask[j * CS + i];
          if (!id) { i++; continue; }
          const ao = maskAO[j * CS + i];
          let w = 1;
          while (i + w < CS && mask[j * CS + i + w] === id && maskAO[j * CS + i + w] === ao) w++;
          let h = 1;
          grow: while (j + h < CS) {
            for (let k = 0; k < w; k++) {
              if (mask[(j + h) * CS + i + k] !== id || maskAO[(j + h) * CS + i + k] !== ao) break grow;
            }
            h++;
          }

          // The face plane sits one step out for the +axis directions.
          const dp = d + (n % 2 === 0 ? 1 : 0);
          const px = ax * dp + ux * i + vx * j, py = ay * dp + uy * i + vy * j, pz = az * dp + uz * i + vz * j;
          const c00 = [px, py, pz];
          const c10 = [px + ux * w, py + uy * w, pz + uz * w];
          const c01 = [px + vx * h, py + vy * h, pz + vz * h];
          const c11 = [c10[0] + vx * h, c10[1] + vy * h, c10[2] + vz * h];
          const aos = [ao & 3, (ao >> 2) & 3, (ao >> 4) & 3, (ao >> 6) & 3];
          const layer = layerOf(id, faceKind(n));
          const target = isOpaque(id) ? opaqueB : isWater(id) ? waterB : alphaB;
          // u × v points along +axis, so +axis faces wind c00→c10→c11→c01 and
          // -axis faces take the reverse ring; both are CCW seen from outside.
          if (n % 2 === 0) {
            target.quad([c00, c10, c11, c01], [[0, 0], [w, 0], [w, h], [0, h]], aos, n, layer);
          } else {
            target.quad([c00, c01, c11, c10], [[0, 0], [0, h], [w, h], [w, 0]], [aos[0], aos[3], aos[2], aos[1]], n, layer);
          }

          for (let jj = 0; jj < h; jj++) for (let ii = 0; ii < w; ii++) mask[(j + jj) * CS + i + ii] = 0;
          i += w;
        }
      }
    }
  }
  return { opaque: opaqueB.finish(), alpha: alphaB.finish(), water: waterB.finish() };
}
