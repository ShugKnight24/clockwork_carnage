// src/world/world.js
import { AIR, BEDROCK } from "./blocks.js";

const W = 128, D = 128, H = 64, CS = 16;
const CX = W / CS, CY = D / CS, CZ = H / CS; // 8, 8, 4

export class World {
  static W = W; static D = D; static H = H; static GROUND = 32; static CS = CS;
  static CX = CX; static CY = CY; static CZ = CZ;

  constructor(meta = {}) {
    this.blocks = new Uint8Array(W * D * H);
    this.meta = {
      name: "New World", act: 1,
      spawn: { x: 64.5, y: 64.5, z: 32, yaw: 0 },
      exit: null, enemySpawns: [], pickups: [],
      ...meta,
    };
    this.dirty = new Uint8Array(CX * CY * CZ).fill(1);
    this.version = 0; // bumps on every change; caches key off it
  }

  index(x, y, z) { return (z * D + y) * W + x; }
  inBounds(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < W && y < D && z < H; }

  get(x, y, z) {
    if (z < 0) return BEDROCK;
    if (x < 0 || y < 0 || z >= H || x >= W || y >= D) return AIR;
    return this.blocks[(z * D + y) * W + x];
  }

  /** @returns {boolean} true when the block changed */
  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return false;
    const i = (z * D + y) * W + x;
    if (this.blocks[i] === id) return false;
    this.blocks[i] = id;
    this.version++;
    const cx = x >> 4, cy = y >> 4, cz = z >> 4;
    this.markDirty(cx, cy, cz);
    // A block on a chunk face changes the neighbour chunk's hidden-face test.
    const lx = x & 15, ly = y & 15, lz = z & 15;
    if (lx === 0 && cx > 0) this.markDirty(cx - 1, cy, cz);
    if (lx === 15 && cx < CX - 1) this.markDirty(cx + 1, cy, cz);
    if (ly === 0 && cy > 0) this.markDirty(cx, cy - 1, cz);
    if (ly === 15 && cy < CY - 1) this.markDirty(cx, cy + 1, cz);
    if (lz === 0 && cz > 0) this.markDirty(cx, cy, cz - 1);
    if (lz === 15 && cz < CZ - 1) this.markDirty(cx, cy, cz + 1);
    return true;
  }

  chunkIndex(cx, cy, cz) { return (cz * CY + cy) * CX + cx; }
  chunkCoords(ci) { return [ci % CX, ((ci / CX) | 0) % CY, (ci / (CX * CY)) | 0]; }
  markDirty(cx, cy, cz) { this.dirty[this.chunkIndex(cx, cy, cz)] = 1; }

  /** Dirty chunk indices, cleared as they are handed out. */
  takeDirty() {
    const out = [];
    for (let i = 0; i < this.dirty.length; i++) if (this.dirty[i]) { out.push(i); this.dirty[i] = 0; }
    return out;
  }

  /** z of the highest solid block in a column, or -1. */
  topSolid(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= D) return -1;
    for (let z = H - 1; z >= 0; z--) if (this.blocks[(z * D + y) * W + x] !== AIR) return z;
    return -1;
  }

  forEachChunk(fn) {
    for (let cz = 0; cz < CZ; cz++) for (let cy = 0; cy < CY; cy++) for (let cx = 0; cx < CX; cx++) fn(cx, cy, cz, this.chunkIndex(cx, cy, cz));
  }
}
