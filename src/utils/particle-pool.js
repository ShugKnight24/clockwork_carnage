/**
 * Shared particle object pool — reduces GC pressure during heavy VFX.
 *
 * All particle spawn functions in vfx.js and particle-system.js should use
 * `particlePool.acquire()` instead of creating new objects via `{...}`.
 * When particles die (in updateParticles), call `particlePool.release(p)`.
 */
import { ObjectPool } from "./object-pool.js";

const createParticle = () => ({
  x: 0, y: 0, z: 0,
  vx: 0, vy: 0, vz: 0,
  r: 0, g: 0, b: 0,
  life: 0, size: 0,
  _type: "",
});

const resetParticle = (p) => {
  p.x = p.y = p.z = 0;
  p.vx = p.vy = p.vz = 0;
  p.r = p.g = p.b = 0;
  p.life = p.size = 0;
  p._type = "";
};

export const particlePool = new ObjectPool(createParticle, resetParticle, 256);
