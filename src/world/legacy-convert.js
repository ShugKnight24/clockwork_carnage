import { World } from "./world.js";
import { LAYER_TO_BLOCKS } from "./blocks.js";

const GRASS = 11, DIRT = 10, ROCK = 13, BEDROCK = 15;

/**
 * Builder map v2/v3 → World. The 60×60 map lands centred at (34,34); each
 * cell's layer count becomes LAYER_TO_BLOCKS[count] blocks from z=32 up, so a
 * full 5-layer wall is 3 blocks (the raycaster's two-eye-heights ratio) and a
 * waist wall is one you can shoot over. Everything else gets a grass floor.
 */
export function convertLegacyMap(m) {
  const w = new World({ name: m.name || "Imported", act: 1 });
  const mw = m.width || m.grid[0].length, mh = m.height || m.grid.length;
  const ox = Math.floor((World.W - mw) / 2), oy = Math.floor((World.D - mh) / 2);
  for (let y = 0; y < World.D; y++) for (let x = 0; x < World.W; x++) {
    for (let z = 0; z < 32; z++) w.set(x, y, z, z === 0 ? BEDROCK : z < 27 ? ROCK : z < 31 ? DIRT : GRASS);
  }
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    let tile = 0, count = 0;
    if (Array.isArray(m.layers) && m.layers.length) {
      for (let l = 0; l < m.layers.length; l++) {
        const t = m.layers[l]?.[y]?.[x] | 0;
        if (t > 0) { if (!tile) tile = t; count = l + 1; }
      }
    } else if ((m.grid[y][x] | 0) > 0) { tile = m.grid[y][x] | 0; count = 5; }
    const blocks = LAYER_TO_BLOCKS[Math.min(5, count)] || 0;
    for (let z = 0; z < blocks; z++) w.set(ox + x, oy + y, 32 + z, Math.min(9, tile));
  }
  const ps = m.playerStart || { x: mw / 2, y: mh / 2, dir: 0 };
  w.meta.spawn = { x: ox + ps.x + 0.5, y: oy + ps.y + 0.5, z: 32, yaw: ps.dir || 0 };
  w.meta.enemySpawns = (m.enemySpawns || []).map((s) => ({ x: ox + s.x + 0.5, y: oy + s.y + 0.5, z: 32, type: s.enemy || s.type || "drone" }));
  w.meta.pickups = (m.entities || []).map((e) => ({ x: ox + e.x, y: oy + e.y, z: 32, type: e.type, weaponId: e.weaponId }));
  w.meta.exit = m.exit ? { x: ox + m.exit.x, y: oy + m.exit.y, z: 32 } : null;
  w.takeDirty(); w.dirty.fill(1);
  return w;
}
