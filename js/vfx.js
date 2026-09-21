/**
 * VFX spawners — game-specific particle effects.
 * Extracted from game.js. Pure functions that push into a particles array.
 *
 * Uses shared particlePool (src/utils/particle-pool.js) to recycle particle
 * objects instead of allocating via push({...}), reducing GC pressure.
 *
 * Realistic art spawns a different mix (hot "spark" streaks that cool through
 * orange, soft smoke and dust, a brief point-light flash); the particles are
 * drawn by drawRealisticParticle in src/rendering/pickups.js.
 */
import {
  spawnSmoke,
  spawnDebris,
} from "./particle-system.js";
import { particlePool } from "../src/utils/particle-pool.js";
import { isRealisticArt } from "../src/rendering/art-style.js";

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

// Boss missile colours (src/systems/ai.js, forms 2 and 3).
const MISSILE_COLORS = new Set(["#e04800", "#ff2244"]);
// Gun-toting humans fire kinetic tracers rather than plasma.
const TRACER_COLORS = new Set(["#ddaa00", "#ff6600", "#ffd36b"]);
// Slow, heavy payloads: boss primary fire and the chrono bomber.
const HEAVY_COLORS = new Set(["#ff0088", "#ff0066", "#ff0044", "#ffaa00"]);

/**
 * Visual family of a projectile, cached on it: "plasma" | "tracer" | "heavy"
 * | "missile" | "emp". Player shots key off the weapon; enemy shots carry only
 * their shooter's colour, so that is what identifies them.
 */
export function projectileKind(p) {
  if (p._fxKind) return p._fxKind;
  let k = "plasma";
  if (p.owner === "player") {
    if (p.emp || p.weaponId === 7) k = "emp";
    else if (p.weaponId === 3) k = "heavy";
    else if (p.weaponId === 6) k = "tracer";
  } else if (MISSILE_COLORS.has(p.color)) k = "missile";
  else if (TRACER_COLORS.has(p.color)) k = "tracer";
  else if (HEAVY_COLORS.has(p.color)) k = "heavy";
  p._fxKind = k;
  return k;
}

const PROJ_LIGHT = {
  plasma: [1.8, 0.4], tracer: [1.2, 0.25], heavy: [2.6, 0.65], missile: [2.2, 0.5], emp: [2.2, 0.45],
};
const LIGHT_FOREVER = 1e9; // decays by dt like any light; syncProjectileLight ends it

/**
 * Realistic only: give a projectile a travelling point light. One object per
 * projectile for its whole flight, moved by syncProjectileLight — nothing is
 * allocated per frame.
 */
// The GL deck shader reads the first 16 lights and the wall pass loops every
// light per column, so bolts leave headroom for flashes and explosions.
const MAX_PROJECTILE_LIGHT_SLOTS = 10;

export function attachProjectileLight(lights, p) {
  if (!lights || p._light || !isRealisticArt()) return;
  if (lights.length >= MAX_PROJECTILE_LIGHT_SLOTS) return;
  const [radius, intensity] = PROJ_LIGHT[projectileKind(p)];
  const L = {
    x: p.x, y: p.y,
    color: hexRGB(p.color, [255, 0, 68]),
    radius,
    baseIntensity: intensity,
    intensity,
    life: LIGHT_FOREVER,
    maxLife: LIGHT_FOREVER,
  };
  p._light = L;
  lights.push(L);
}

/** Follow the projectile; once it dies, expire the light on the next decay tick. */
export function syncProjectileLight(p) {
  const L = p._light;
  if (!L) return;
  L.x = p.x;
  L.y = p.y;
  if (!p.active) {
    L.life = 0;
    L.intensity = 0;
    p._light = null;
  }
}

/**
 * Hot metal spark: a streak that cools white → orange → dark red over its
 * life (drawRealisticParticle reads life / maxLife).
 */
function spawnSpark(particles, x, y, z, speedMin, speedVar, lifeMin, lifeVar) {
  const angle = Math.random() * Math.PI * 2;
  const speed = speedMin + Math.random() * speedVar;
  const p = particlePool.acquire();
  p.x = x; p.y = y; p.z = z;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.vz = 0.6 - Math.random() * 2.6;
  p.r = 255; p.g = 200; p.b = 120;
  p.life = lifeMin + Math.random() * lifeVar;
  p.maxLife = p.life;
  p.size = 0.012 + Math.random() * 0.012;
  p._type = "spark";
  particles.push(p);
}

/**
 * Realistic debris: spawnDebris' chunks tagged for drawRealisticParticle's
 * tumbling shards (a seed for shape and spin, and the full life for fading).
 */
function spawnChips(particles, x, y, opts) {
  const from = particles.length;
  spawnDebris(particles, x, y, opts);
  for (let i = from; i < particles.length; i++) {
    const p = particles[i];
    p._seed = Math.random();
    p.maxLife = p.life;
    p.size *= 0.7;
  }
}

/** Realistic hit on a (mechanical) enemy: sparks, coolant chips, a wisp, a flash. */
function spawnHitImpactRealistic(particles, x, y, enemyColor, isCrit, quality, lights) {
  const n = scaledCount(isCrit ? 14 : 9, quality);
  for (let i = 0; i < n; i++) {
    spawnSpark(particles, x, y, -0.2 - Math.random() * 0.25, 2, 3.5, 0.12, 0.2);
  }
  const [r, g, b] = hexRGB(enemyColor, [200, 60, 60]);
  spawnChips(particles, x, y, {
    count: scaledCount(isCrit ? 4 : 2, quality),
    r: r >> 2, g: g >> 2, b: b >> 2,
    speed: 1, life: 0.25,
  });
  spawnSmoke(particles, x, y, { count: scaledCount(isCrit ? 2 : 1, quality), r: 95, g: 95, b: 100, speed: 0.2, life: 0.3 });
  spawnPointLight(lights, x, y, [255, 190, 120], 2, isCrit ? 0.7 : 0.45, 0.06);
}

/** Hit-impact particles at bullet impact point on an enemy. */
export function spawnHitImpact(particles, x, y, enemyColor, isCrit, quality = 1, lights = null) {
  if (isRealisticArt()) {
    spawnHitImpactRealistic(particles, x, y, enemyColor, isCrit, quality, lights);
    return;
  }
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

/** Realistic death: fireball lobes, a spark shower, dark smoke, debris, a flash. */
function spawnDeathRealistic(particles, x, y, c2, quality, lights) {
  const lobes = scaledCount(5, quality);
  for (let i = 0; i < lobes; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.4 + Math.random() * 1.1;
    const p = particlePool.acquire();
    p.x = x; p.y = y;
    p.z = -0.2 - Math.random() * 0.25;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.vz = -(1.5 + Math.random() * 1.5);
    p.r = 255; p.g = 120 + Math.floor(Math.random() * 90); p.b = 30 + Math.floor(Math.random() * 40);
    p.life = 0.14 + Math.random() * 0.14;
    p.size = 0.14 + Math.random() * 0.12;
    p._type = "energy";
    particles.push(p);
  }
  const sparks = scaledCount(16, quality);
  for (let i = 0; i < sparks; i++) {
    spawnSpark(particles, x, y, -0.15 - Math.random() * 0.35, 2.5, 4.5, 0.3, 0.45);
  }
  spawnSmoke(particles, x, y, { count: scaledCount(7, quality), r: 90, g: 86, b: 82, life: 0.9 });
  const [dr, dg, db] = hexRGB(c2 || "#808080", [80, 75, 70]);
  spawnChips(particles, x, y, { count: scaledCount(6, quality), r: dr >> 1, g: dg >> 1, b: db >> 1 });
  spawnPointLight(lights, x, y, [255, 150, 70], 4.5, 1.0, 0.25);
}

/** Death explosion particles + smoke + metallic debris. */
export function spawnDeathParticles(particles, x, y, c1, c2, quality = 1, lights = null) {
  if (isRealisticArt()) {
    spawnDeathRealistic(particles, x, y, c2, quality, lights);
    return;
  }
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
export function spawnWallSparks(particles, x, y, quality = 1, lights = null) {
  if (isRealisticArt()) {
    const n = scaledCount(8 + Math.floor(Math.random() * 5), quality);
    for (let i = 0; i < n; i++) {
      spawnSpark(particles, x, y, -0.02 - Math.random() * 0.12, 1.5, 4, 0.1, 0.22);
    }
    // Pale concrete dust, slow and short-lived.
    spawnSmoke(particles, x, y, { count: scaledCount(3, quality), r: 150, g: 142, b: 128, speed: 0.15, life: 0.45 });
    spawnChips(particles, x, y, { count: scaledCount(3, quality), speed: 1, life: 0.3 });
    spawnPointLight(lights, x, y, [255, 170, 90], 1.8, 0.55, 0.06);
    return;
  }
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
