/**
 * particle-system.js — Standalone pickup burst and atmospheric dust particle logic.
 *
 * All functions are pure data-mutators: they take the particle arrays and game
 * parameters as arguments and return updated state. No game class references.
 *
 * Usage in game.js:
 *   import { spawnPickupBurst, spawnSmoke, spawnEnergyBurst, spawnDebris,
 *            updateParticles, updateDustMotes } from "./particle-system.js";
 *
 *   // Spawn a burst when a pickup is collected:
 *   spawnPickupBurst(this.player.particles, x, y, "health");
 *
 *   // Smoke cloud after explosion:
 *   spawnSmoke(this.player.particles, x, y);
 *
 *   // Energy burst for power-up activation / energy weapon:
 *   spawnEnergyBurst(this.player.particles, x, y, { r: 0, g: 200, b: 255 });
 *
 *   // Debris chunks for wall impacts / enemy deaths:
 *   spawnDebris(this.player.particles, x, y);
 *
 *   // Tick particles each frame (also ticks dust motes):
 *   this.dustMotes = updateParticles(this.player.particles, dt, this.timeScale, this.dustMotes, this.player);
 */
import { particlePool } from "../src/utils/particle-pool.js";

/**
 * Spawn a radial burst of particles around a world-space pickup position.
 *
 * @param {object[]} particles  The player.particles array (mutated in place; initialised if falsy via caller)
 * @param {number}   x          World X of the pickup
 * @param {number}   y          World Y of the pickup
 * @param {"health"|"ammo"|"weapon"} pickupType  Controls the colour of the burst
 */
export function spawnPickupBurst(particles, x, y, pickupType, quality = 1) {
  let r1, g1, b1;
  if (pickupType === "health") {
    r1 = 50;  g1 = 255; b1 = 80;
  } else if (pickupType === "ammo") {
    r1 = 255; g1 = 220; b1 = 50;
  } else {
    r1 = 50;  g1 = 200; b1 = 255;
  }

  const count = Math.max(0, Math.round(10 * quality));
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 1.0 + Math.random() * 1.5;
    const p = particlePool.acquire();
    p.x = x; p.y = y;
    p.z = -0.3 - Math.random() * 0.2;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.vz = -(2 + Math.random() * 2);
    p.r = r1 + Math.floor(Math.random() * 30);
    p.g = g1; p.b = b1;
    p.life = 0.4 + Math.random() * 0.3;
    p.size = 0.04 + Math.random() * 0.04;
    p._type = "";
    particles.push(p);
  }
}

/**
 * Spawn a rising smoke cloud — slow drift up, expanding, fading.
 * Used after explosions, muzzle flashes, enemy deaths.
 *
 * @param {object[]} particles  The particles array (mutated)
 * @param {number}   x          World X
 * @param {number}   y          World Y
 * @param {object}   [opts]     Optional overrides { count, r, g, b, speed, life }
 */
export function spawnSmoke(particles, x, y, opts = {}) {
  const count = opts.count ?? 8;
  const baseR = opts.r ?? 120;
  const baseG = opts.g ?? 115;
  const baseB = opts.b ?? 110;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (opts.speed ?? 0.4) + Math.random() * 0.6;
    const p = particlePool.acquire();
    p.x = x + (Math.random() - 0.5) * 0.3;
    p.y = y + (Math.random() - 0.5) * 0.3;
    p.z = -0.2 - Math.random() * 0.15;
    p.vx = Math.cos(angle) * speed * 0.5;
    p.vy = Math.sin(angle) * speed * 0.5;
    p.vz = -(0.8 + Math.random() * 0.6);
    p.r = baseR + Math.floor(Math.random() * 40 - 20);
    p.g = baseG + Math.floor(Math.random() * 40 - 20);
    p.b = baseB + Math.floor(Math.random() * 40 - 20);
    p.life = (opts.life ?? 0.6) + Math.random() * 0.4;
    p.size = 0.06 + Math.random() * 0.05;
    p._type = "smoke";
    particles.push(p);
  }
}

/**
 * Spawn fast energy particles — bright, quick, directional.
 * Used for energy weapons, shield breaks, power-up activations.
 *
 * @param {object[]} particles  The particles array (mutated)
 * @param {number}   x          World X
 * @param {number}   y          World Y
 * @param {object}   [opts]     Optional overrides { count, r, g, b, speed, life, angle }
 */
export function spawnEnergyBurst(particles, x, y, opts = {}) {
  const count = opts.count ?? 12;
  const baseR = opts.r ?? 0;
  const baseG = opts.g ?? 200;
  const baseB = opts.b ?? 255;
  const dirAngle = opts.angle; // if set, concentrate burst in this direction

  for (let i = 0; i < count; i++) {
    const angle = dirAngle != null
      ? dirAngle + (Math.random() - 0.5) * 1.2  // focused cone
      : (i / count) * Math.PI * 2;               // radial
    const speed = (opts.speed ?? 3) + Math.random() * 3;
    const p = particlePool.acquire();
    p.x = x;
    p.y = y;
    p.z = -0.25 - Math.random() * 0.15;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.vz = -(1 + Math.random() * 2);
    p.r = Math.min(255, baseR + Math.floor(Math.random() * 80));
    p.g = Math.min(255, baseG + Math.floor(Math.random() * 55));
    p.b = Math.min(255, baseB + Math.floor(Math.random() * 30));
    p.life = (opts.life ?? 0.2) + Math.random() * 0.2;
    p.size = 0.03 + Math.random() * 0.03;
    p._type = "energy";
    particles.push(p);
  }
}

/**
 * Spawn heavy debris chunks — fast initial velocity, strong gravity, bouncy.
 * Used for wall impacts, mechanical enemy deaths, destructibles.
 *
 * @param {object[]} particles  The particles array (mutated)
 * @param {number}   x          World X
 * @param {number}   y          World Y
 * @param {object}   [opts]     Optional overrides { count, r, g, b, speed, life }
 */
export function spawnDebris(particles, x, y, opts = {}) {
  const count = opts.count ?? 6;
  const baseR = opts.r ?? 80;
  const baseG = opts.g ?? 75;
  const baseB = opts.b ?? 70;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (opts.speed ?? 2) + Math.random() * 3;
    const p = particlePool.acquire();
    p.x = x + (Math.random() - 0.5) * 0.2;
    p.y = y + (Math.random() - 0.5) * 0.2;
    p.z = -0.15 - Math.random() * 0.2;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.vz = -(3 + Math.random() * 4);
    p.r = baseR + Math.floor(Math.random() * 50);
    p.g = baseG + Math.floor(Math.random() * 40);
    p.b = baseB + Math.floor(Math.random() * 30);
    p.life = (opts.life ?? 0.5) + Math.random() * 0.5;
    p.size = 0.03 + Math.random() * 0.04;
    p._type = "debris";
    particles.push(p);
  }
}

/**
 * Advance pickup-burst particles by one frame.
 * Applies timeScale (Chrono Shift support), gravity, floor bounce, and culls dead particles.
 * Also advances the atmospheric dust motes (delegating to updateDustMotes).
 *
 * @param {object[]|null} particles  player.particles array (mutated in place)
 * @param {number}        dt         Frame delta-time in seconds
 * @param {number}        timeScale  Global game time scale (1 = normal, <1 = slowed)
 * @param {object[]|null} dustMotes  Current dust mote array (may be null on first call)
 * @param {object}        player     Player object ({ x, y }) for dust mote wrapping
 * @returns {object[]}               Updated (or newly initialised) dustMotes array
 */
export function updateParticles(particles, dt, timeScale, dustMotes, player, opts = {}) {
  if (particles && particles.length > 0) {
    const ts = timeScale;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx * dt * ts;
      p.y  += p.vy * dt * ts;
      p.z  += p.vz * dt * ts;
      p.life -= dt * ts;

      // Type-specific physics
      if (p._type === "smoke") {
        p.vz += 2 * dt * ts;       // very weak gravity — smoke rises
        p.vx *= 1 - 1.5 * dt;      // air drag
        p.vy *= 1 - 1.5 * dt;
        p.size += 0.08 * dt * ts;   // expand as it rises
      } else if (p._type === "debris") {
        p.vz += 25 * dt * ts;      // heavy gravity — chunks fall fast
      } else if (p._type === "energy") {
        p.vz += 5 * dt * ts;       // light gravity
        p.size *= 1 - 2 * dt;      // shrink quickly
      } else {
        p.vz += 15 * dt * ts;      // default gravity (pickup burst)
      }

      // Floor bounce
      if (p.z > 0.48) {
        p.z   = 0.48;
        const bounce = p._type === "debris" ? -0.45 : -0.3;
        p.vz *= bounce;
        p.vx *= 0.6;
        p.vy *= 0.6;
      }

      if (p.life <= 0) {
        particlePool.release(p);
        particles[i] = particles[particles.length - 1];
        particles.pop();
      }
    }
  }

  return opts.enableDust === false ? null : updateDustMotes(dustMotes, dt, player);
}

/**
 * Advance the atmospheric dust motes by one frame.
 * Lazy-initialises the motes array on first call (when dustMotes is null).
 *
 * @param {object[]|null} dustMotes  Current motes array (null triggers lazy init)
 * @param {number}        dt         Frame delta-time in seconds
 * @param {object}        player     Player object ({ x, y }) used for spawn position and wrap
 * @returns {object[]}               Updated motes array (same reference or newly created)
 */
export function updateDustMotes(dustMotes, dt, player) {
  // Lazy-init: scatter motes around the player's starting position
  if (!dustMotes) {
    dustMotes = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      dustMotes.push({
        x:    player.x + (Math.random() - 0.5) * 16,
        y:    player.y + (Math.random() - 0.5) * 16,
        z:    -0.1 - Math.random() * 0.8,           // scattered heights (floor to ceiling)
        vx:   (Math.random() - 0.5) * 0.3,
        vy:   (Math.random() - 0.5) * 0.3,
        vz:   (Math.random() - 0.5) * 0.15,
        r:    180 + Math.floor(Math.random() * 50),
        g:    170 + Math.floor(Math.random() * 50),
        b:    150 + Math.floor(Math.random() * 40),
        life: 0.3 + Math.random() * 0.3,            // used as alpha
        size: 0.015 + Math.random() * 0.015,
      });
    }
  }

  for (const m of dustMotes) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.z += m.vz * dt;

    // Gently vary drift
    m.vx += (Math.random() - 0.5) * 0.1 * dt;
    m.vy += (Math.random() - 0.5) * 0.1 * dt;
    m.vz += (Math.random() - 0.5) * 0.05 * dt;

    // Clamp drift speed
    m.vx = Math.max(-0.4, Math.min(0.4, m.vx));
    m.vy = Math.max(-0.4, Math.min(0.4, m.vy));
    m.vz = Math.max(-0.15, Math.min(0.15, m.vz));

    // Clamp z height
    if (m.z > 0.45)  { m.z = 0.45;  m.vz *= -1; }
    if (m.z < -0.9)  { m.z = -0.9;  m.vz *= -1; }

    // Wrap around player — keep motes in a 16-unit box around the player
    const dx = m.x - player.x;
    const dy = m.y - player.y;
    if (dx >  8) m.x -= 16;
    if (dx < -8) m.x += 16;
    if (dy >  8) m.y -= 16;
    if (dy < -8) m.y += 16;
  }

  return dustMotes;
}
