/**
 * particle-system.js — Standalone pickup burst and atmospheric dust particle logic.
 *
 * All functions are pure data-mutators: they take the particle arrays and game
 * parameters as arguments and return updated state. No game class references.
 *
 * Usage in game.js:
 *   import { spawnPickupBurst, updateParticles, updateDustMotes } from "./particle-system.js";
 *
 *   // Spawn a burst when a pickup is collected:
 *   spawnPickupBurst(this.player.particles, x, y, "health");
 *
 *   // Tick particles each frame (also ticks dust motes):
 *   this.dustMotes = updateParticles(this.player.particles, dt, this.timeScale, this.dustMotes, this.player);
 */

/**
 * Spawn a radial burst of particles around a world-space pickup position.
 *
 * @param {object[]} particles  The player.particles array (mutated in place; initialised if falsy via caller)
 * @param {number}   x          World X of the pickup
 * @param {number}   y          World Y of the pickup
 * @param {"health"|"ammo"|"weapon"} pickupType  Controls the colour of the burst
 */
export function spawnPickupBurst(particles, x, y, pickupType) {
  let r1, g1, b1;
  if (pickupType === "health") {
    r1 = 50;  g1 = 255; b1 = 80;
  } else if (pickupType === "ammo") {
    r1 = 255; g1 = 220; b1 = 50;
  } else {
    r1 = 50;  g1 = 200; b1 = 255;
  }

  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 1.0 + Math.random() * 1.5;
    particles.push({
      x,
      y,
      z: -0.3 - Math.random() * 0.2,   // floor level rising
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      vz: -(2 + Math.random() * 2),     // burst upward
      r: r1 + Math.floor(Math.random() * 30),
      g: g1,
      b: b1,
      life: 0.4 + Math.random() * 0.3,
      size: 0.04 + Math.random() * 0.04,
    });
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
export function updateParticles(particles, dt, timeScale, dustMotes, player) {
  if (particles && particles.length > 0) {
    const ts = timeScale;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx * dt * ts;
      p.y  += p.vy * dt * ts;
      p.z  += p.vz * dt * ts;
      p.vz += 15 * dt * ts;   // gravity
      p.life -= dt * ts;

      // Floor bounce
      if (p.z > 0.48) {
        p.z   = 0.48;
        p.vz *= -0.3;
        p.vx *= 0.6;
        p.vy *= 0.6;
      }

      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  return updateDustMotes(dustMotes, dt, player);
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
