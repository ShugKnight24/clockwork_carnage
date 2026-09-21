/**
 * VFX spawners — game-specific particle effects.
 * Extracted from game.js. Pure functions that push into a particles array.
 *
 * Uses shared particlePool (src/utils/particle-pool.js) to recycle particle
 * objects instead of allocating via push({...}), reducing GC pressure.
 */
import {
  spawnSmoke,
  spawnDebris,
} from "./particle-system.js";
import { particlePool } from "../src/utils/particle-pool.js";

const _rgbCache = new Map();

/** Parse hex color to [r, g, b]. Cached; callers must not mutate the result. */
function hexRGB(hex, fallback = [128, 128, 128]) {
  if (!hex || hex.length < 7) return fallback;
  let c = _rgbCache.get(hex);
  if (!c) {
    c = [
      parseInt(hex.slice(1, 3), 16) || fallback[0],
      parseInt(hex.slice(3, 5), 16) || fallback[1],
      parseInt(hex.slice(5, 7), 16) || fallback[2],
    ];
    _rgbCache.set(hex, c);
  }
  return c;
}

const scaledCount = (count, quality = 1) => Math.max(0, Math.round(count * quality));

/**
 * Push a dynamic point light onto the lights array. Sampled by the
 * raycaster's wall and floor passes to add a radial brightness bleed
 * around the source. Cheap: lights with zero remaining life prune
 * themselves on the next tick.
 *
 * @param {Array} lights      game.lights array
 * @param {number} x,y        world position
 * @param {[number,number,number]} color  RGB 0-255
 * @param {number} radius     world units of effective falloff
 * @param {number} intensity  peak brightness multiplier (0.5 = mild, 2 = intense)
 * @param {number} life       seconds until the light fully fades out
 */
export function spawnPointLight(lights, x, y, color, radius, intensity, life) {
  if (!lights) return;
  lights.push({
    x, y,
    color,
    radius,
    baseIntensity: intensity,
    intensity,
    life,
    maxLife: life,
  });
}

/** Hit-impact particles at bullet impact point on an enemy. */
export function spawnHitImpact(particles, x, y, enemyColor, isCrit, quality = 1) {
  let [r, g, b] = hexRGB(enemyColor, [200, 60, 60]);
  // Mix with blood red for organic feel
  r = Math.min(255, Math.floor(r * 0.5 + 200 * 0.5));
  g = Math.min(255, Math.floor(g * 0.3 + 30 * 0.7));
  b = Math.min(255, Math.floor(b * 0.3 + 30 * 0.7));

  const count = scaledCount(isCrit ? 10 : 6, quality);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    const p = particlePool.acquire();
    p.x = x; p.y = y;
    p.z = -0.15 - Math.random() * 0.3;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.vz = (Math.random() - 0.6) * 3;
    p.r = r + Math.floor((Math.random() - 0.5) * 40);
    p.g = Math.max(0, g + Math.floor((Math.random() - 0.5) * 20));
    p.b = Math.max(0, b + Math.floor((Math.random() - 0.5) * 20));
    p.life = 0.2 + Math.random() * 0.25;
    p.size = isCrit ? 0.04 + Math.random() * 0.05 : 0.03 + Math.random() * 0.03;
    p._type = "";
    particles.push(p);
  }
}

const FLASH_COLORS = {
  2: [80, 220, 255], 7: [80, 220, 255],  // Plasma / EMP — cyan
  3: [255, 160, 40],                       // Cannon — orange
  6: [100, 255, 120],                      // Ricochet — green
};
const FLASH_DEFAULT = [255, 200, 60];

/** Muzzle flash particles at the gun barrel. */
export function spawnMuzzleFlash(particles, player, wep, quality = 1) {
  const barrelDist = 0.6;
  const bx = player.x + Math.cos(player.angle) * barrelDist;
  const by = player.y + Math.sin(player.angle) * barrelDist;

  const [r1, g1, b1] = FLASH_COLORS[wep.id] || FLASH_DEFAULT;
  const count = scaledCount(wep.id === 1 || wep.id === 4 ? 8 : 5, quality);

  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 0.8;
    const flashAngle = player.angle + spread;
    const speed = 3 + Math.random() * 4;
    const p = particlePool.acquire();
    p.x = bx; p.y = by;
    p.z = -0.15 - Math.random() * 0.1;
    p.vx = Math.cos(flashAngle) * speed;
    p.vy = Math.sin(flashAngle) * speed;
    p.vz = (Math.random() - 0.5) * 2;
    p.r = r1 + Math.floor(Math.random() * 30);
    p.g = g1; p.b = b1;
    p.life = 0.06 + Math.random() * 0.08;
    p.size = 0.03 + Math.random() * 0.03;
    p._type = "";
    particles.push(p);
  }
}

/** Death explosion particles + smoke + metallic debris. */
export function spawnDeathParticles(particles, x, y, c1, c2, quality = 1) {
  const count = scaledCount(12, quality);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 2;
    const c = Math.random() > 0.5 ? c1 : c2;
    const [r, g, b] = hexRGB(c, [255, 255, 255]);
    const p = particlePool.acquire();
    p.x = x; p.y = y;
    p.z = -0.1 - Math.random() * 0.3;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.vz = (Math.random() - 0.7) * 4;
    p.r = r; p.g = g; p.b = b;
    p.life = 0.8 + Math.random() * 0.4;
    p.size = 0.05 + Math.random() * 0.08;
    p._type = "";
    particles.push(p);
  }
  spawnSmoke(particles, x, y, { count: scaledCount(5, quality) });
  const [dr, dg, db] = hexRGB(c2 || "#808080", [80, 75, 70]);
  spawnDebris(particles, x, y, { count: scaledCount(4, quality), r: dr, g: dg, b: db });
}

/** Wall-impact sparks + debris chips. */
export function spawnWallSparks(particles, x, y, quality = 1) {
  const count = scaledCount(5 + Math.floor(Math.random() * 4), quality);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    const p = particlePool.acquire();
    p.x = x; p.y = y;
    p.z = -0.2 - Math.random() * 0.3;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.vz = (Math.random() - 0.5) * 3;
    p.r = 255;
    p.g = 140 + Math.floor(Math.random() * 115);
    p.b = Math.floor(Math.random() * 40);
    p.life = 0.15 + Math.random() * 0.2;
    p.size = 0.02 + Math.random() * 0.03;
    p._type = "";
    particles.push(p);
  }
  spawnDebris(particles, x, y, { count: scaledCount(3, quality), speed: 1, life: 0.3 });
}
