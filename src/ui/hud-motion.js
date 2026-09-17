/**
 * Modern HUD motion state: turns frame-to-frame changes in player stats into
 * timestamped events (hit, heal, shield break, shot fired, weapon switch,
 * kill) that the Modern layouts animate from. One update per HUD frame; all
 * timings use real time so pause/slow-mo don't freeze UI feedback.
 */

const M = {
  ready: false,
  now: 0,
  health: 0,
  shield: 0,
  ammo: 0,
  weapon: -1,
  kills: 0,
  score: 0,
  hitAt: -1e9,
  hitAmount: 0,
  healAt: -1e9,
  healFrom: 0,
  healTo: 0,
  shieldBreakAt: -1e9,
  shieldRestoreAt: -1e9,
  shotAt: -1e9,
  switchAt: -1e9,
  prevWeapon: -1,
  killAt: -1e9,
  scoreShown: 0,
  feed: [], // { at, text }
  shards: null, // shield shatter seeds
};

export const hudMotion = M;

/** Call once per rendered HUD frame (Modern only). */
export function updateHudMotion(game) {
  const p = game.player;
  const now = performance.now();
  const dt = M.now ? Math.min(0.1, (now - M.now) / 1000) : 0;
  M.now = now;
  const maxH = p.maxHealth || 1;
  const kills = game.killedEnemies || 0;

  if (!M.ready) {
    M.ready = true;
    M.health = p.health;
    M.shield = p.shield || 0;
    M.ammo = p.ammo;
    M.weapon = p.currentWeapon;
    M.kills = kills;
    M.score = p.score;
    M.scoreShown = p.score;
    return M;
  }

  if (p.health < M.health - 0.01) {
    M.hitAt = now;
    M.hitAmount = (M.health - p.health) / maxH;
  } else if (p.health > M.health + 0.01 && p.alive) {
    const fresh = now - M.healAt > 700;
    M.healFrom = fresh ? M.health / maxH : Math.min(M.healFrom, M.health / maxH);
    M.healTo = p.health / maxH;
    M.healAt = now;
  }
  const shield = p.shield || 0;
  if (M.shield > 0.5 && shield <= 0.01 && p.maxShield > 0) {
    M.shieldBreakAt = now;
    M.shards = Array.from({ length: 14 }, (_, i) => ({
      t: (i + Math.random() * 0.8) / 14,
      v: 30 + Math.random() * 45,
      spin: (Math.random() - 0.5) * 9,
      size: 2 + Math.random() * 3,
    }));
  } else if (shield > M.shield + 0.5) {
    M.shieldRestoreAt = now;
  }
  if (p.currentWeapon !== M.weapon) {
    M.prevWeapon = M.weapon;
    M.switchAt = now;
  } else if (p.ammo < M.ammo) {
    M.shotAt = now;
  }
  if (kills > M.kills) {
    M.killAt = now;
    const gained = p.score - M.score;
    M.feed.unshift({ at: now, text: gained > 0 ? `HOSTILE DOWN  +${gained}` : "HOSTILE DOWN" });
    if (M.feed.length > 3) M.feed.length = 3;
  } else if (kills < M.kills) {
    M.feed.length = 0; // level restart
  }
  M.feed = M.feed.filter((e) => now - e.at < 3200);

  // Score rolls up quickly instead of snapping.
  const diff = p.score - M.scoreShown;
  M.scoreShown = Math.abs(diff) < 1 ? p.score : M.scoreShown + diff * Math.min(1, dt * 10);

  M.health = p.health;
  M.shield = shield;
  M.ammo = p.ammo;
  M.weapon = p.currentWeapon;
  M.kills = kills;
  M.score = p.score;
  return M;
}

/** 0→1 progress of an event started at `at` lasting `ms`, or -1 when idle. */
export function since(at, ms) {
  const k = (M.now - at) / ms;
  return k >= 0 && k < 1 ? k : -1;
}

export const easeOut = (k) => 1 - (1 - k) * (1 - k) * (1 - k);
