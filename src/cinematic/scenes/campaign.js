/**
 * `campaign` shots: a live campaign level seen through the game's own
 * first-person renderer. The level is the settings showcase's
 * (installLevelScene: the act's level, props and idle enemies, swapped in for
 * SHOWCASE_FIELDS and put back exactly by its restore), so no campaign
 * loader, save, stat or comms path is reachable from here.
 *
 * spec: { act, level (0-based within the act), enemies = true, camera,
 *         early (stage the level as the reel opens: see `early` below) }
 * camera:
 *   { kind: "path", from = 0, loop = 40 }  the showcase's loop through the
 *     level (start at `from` of the loop, `loop` seconds a lap), heading
 *     spring-smoothed as in the showcase;
 *   { kind: "keys", keys: [[beat, x, y, angle], ...] }  eased between keys
 *     (beats from the shot's start);
 *   { kind: "fixed", x, y, angle }.
 *
 * Combat events (beats from the shot's start, as every event):
 *   { type: "spawn", enemy, pos: [x, y] | "ahead", count = 1, spread = 1.2, dist = 5 }
 *   { type: "attack", target: "nearest" | "all" }   telegraph, then strike at the camera
 *   { type: "fire", weapon = 0, dur = 2 }           hold the trigger `dur` beats
 *   { type: "chrono", on }                          Chrono Shift, as the hold key does it
 *   { type: "rewind" }, { type: "timeLock" }        Nova's and Kael's powers
 *   { type: "freeze", target: "nearest" | index }   Kael's lock cast onto one enemy
 * A shot with any of these runs the game's own combat (the firing,
 * the enemy AI, projectiles, Chronos) on the reel clock, through a sandbox
 * that borrows every game field and method a fight writes to (stats, kill
 * streak, Bestiary, ARIA and squad comms, the Chronos and hazards, damage to
 * the player) and puts them back at teardown. Its random draws come from the
 * shot's seeded PRNG, so live and recorded playback match.
 */
import { beatsToSec } from "../timeline.js";
import { getActLevel, getAct } from "../../../js/data.js";
import {
  stageLevelScene, installStagedLevel, targetHeading, stepHeading, updateAmbience, swayWeapon, LOOP_SECONDS,
} from "../../systems/showcase.js";
import { samplePath } from "../../systems/showcase-path.js";
import { Enemy } from "../../../js/entities.js";
import { ENEMY_TYPES } from "../../data/enemies.js";
import { AISystem, beginWindup } from "../../systems/ai.js";
import { ChronoPowers } from "../../systems/chrono-powers.js";
import { ChronoHazards } from "../../systems/chrono-hazards.js";
import { KillStreakSystem } from "../../systems/kill-streak.js";
import { SpatialGrid } from "../../utils/spatial-grid.js";
import { isPassable } from "../../systems/physics.js";
import { decay } from "../../utils/math.js";
import { prefetchIdleEnemy } from "../../rendering/svg-art/sprites/enemies.js";
import { generateModernEnv } from "../../rendering/textures.js";
import { isModernArt, isRealisticArt } from "../../rendering/art-style.js";

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const fovOf = (game) => game.settings?.fov ?? 75;

const COMBAT = new Set(["spawn", "attack", "fire", "chrono", "rewind", "timeLock", "freeze"]);

export const campaign = {
  // Drawn by the render pipeline's world pass, not by the scene.
  world: true,

  // A shot that flips the art style builds the level's environment art in
  // each finish it shows (100-300 ms apiece): done as the reel opens.
  // A shot can also ask for it (`early: true`), when the shot before it is
  // too short or too still to hide its level's staging under.
  early: (spec, shot) => !!spec.early || (shot?.events ?? []).some((ev) => ev.type === "artStyle"),

  /**
   * Each level's environment art in the finish showing (80-150 ms apiece in
   * Modern), built while the reel opens on black and kept for the reel:
   * staged in a prepare, it stalled the shot before; a level seen twice in a
   * row was built twice, at the cut.
   */
  preload(game, spec, { live = () => true } = {}) {
    // Legacy draws no environment art; a renderer that cannot take a bundle has no use for one.
    if (!isModernArt() || !game.renderer?.offerEnv) return null;
    const realistic = isRealisticArt();
    return idle().then(() => live() && envFor(game, spec, realistic));
  },

  release() {
    envCache.clear();
  },

  /**
   * The next shot's level, staged while the current shot plays (the
   * director calls this once, ahead of the cut): nothing is installed, so
   * it never shows or borrows anything. Waits on idle time between steps.
   */
  prepare(game, spec, { live = () => true, shot } = {}) {
    const prep = { staged: null, done: null };
    const opts = levelOpts(game, spec, live, idle);
    prep.done = stageLevelScene(game, opts)
      .then(async (staged) => {
        if (staged) await warmSpawns(game, shot, live, idle);
        if (staged && live()) staged.envs = await flipEnvs(game, staged, shot, live, idle);
        return (prep.staged = live() ? staged : null);
      });
    return prep;
  },

  /**
   * Installs at once (no promise, so the cut shows the level on its first
   * frame) when the director hands over a staged level; otherwise stages it
   * now and the director holds the clock until it lands.
   */
  build(game, spec, rng, { live = () => true, reel, handle, shot, prepared = null }) {
    if (prepared?.staged) {
      start(game, installStagedLevel(game, prepared.staged), spec, rng, reel, handle, shot, prepared.staged.envs);
      return;
    }
    return (async () => {
      const opts = levelOpts(game, spec, live);
      let staged = prepared && (await prepared.done);
      if (!staged) {
        staged = await stageLevelScene(game, opts);
        if (!staged || !live()) return;
        await warmSpawns(game, shot, live);
        if (live()) staged.envs = await flipEnvs(game, staged, shot, live);
      }
      if (!live()) return;
      start(game, installStagedLevel(game, staged), spec, rng, reel, handle, shot, staged.envs);
    })();
  },

  update(game, dt, local, handle) {
    const state = handle.level;
    if (!state) return;
    placeCamera(game, state, local, dt);
    if (state.envs) offerEnv(game, state.envs);
    if (!state.combat) {
      updateAmbience(game, state.level.emitters, dt, state.rng);
      return;
    }
    withRandom(state.rng, () => {
      simulate(game, state, dt, local);
      swayWeapon(game.player, { t: local, vel: state.vel }, dt);
      updateAmbience(game, state.level.emitters, dt * game.timeScale, state.rng, game.timeScale);
    });
  },

  event(game, ev, handle) {
    const state = handle.level;
    const run = EVENTS[ev.type];
    if (!state?.combat || !run) return;
    withRandom(state.rng, () => run(game, ev, state));
  },

  teardown(game, handle) {
    const state = handle.level;
    if (!state) return;
    state.combat?.restore();
    state.level.restore();
    handle.level = null;
  },
};

function levelOpts(game, spec, live, wait) {
  const opts = { act: spec.act ?? 1, level: spec.level ?? 0, live, enemies: spec.enemies !== false };
  if (wait) opts.wait = wait;
  const r = routeOf(spec.camera);
  if (r) Object.assign(opts, r);
  // The bundle built as the reel opened, handed to the install.
  opts.env = cachedEnv(game, spec);
  return opts;
}

/**
 * A keyed or fixed camera's own route, for the level's staging: waypoints
 * (the ambience is placed along them) and `{ x, y, heading }` samples (the
 * sprites are decoded at the sizes those views show). A path camera uses
 * the showcase loop, so it has none.
 */
function routeOf(cam) {
  if (cam?.kind === "fixed") {
    const a = cam.angle ?? 0;
    const at = { x: cam.x, y: cam.y };
    // A small loop round the spot: the ambience wants a closed path.
    const path = [0, 1, 2].map((k) => ({ x: at.x + Math.cos(a + (k * 2 * Math.PI) / 3) * 0.2, y: at.y + Math.sin(a + (k * 2 * Math.PI) / 3) * 0.2 }));
    return { path, cams: [{ ...at, heading: a }] };
  }
  if (cam?.kind !== "keys" || !cam.keys?.length) return null;
  const keys = cam.keys;
  const cams = [];
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (!b) {
      cams.push({ x: a[1], y: a[2], heading: a[3] });
      break;
    }
    const da = Math.atan2(Math.sin(b[3] - a[3]), Math.cos(b[3] - a[3]));
    for (let k = 0; k < 12; k++) {
      const u = k / 12;
      cams.push({ x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, heading: a[3] + da * u });
    }
  }
  const path = keys.length > 1 ? keys.map((k) => ({ x: k[1], y: k[2] })) : routeOf({ kind: "fixed", x: keys[0][1], y: keys[0][2], angle: keys[0][3] }).path;
  return { path, cams };
}

/**
 * A shot that flips the art style (the director's artStyle event) needs the
 * level's environment art in each Modern finish it flips to; built on a
 * flip frame, that is a 100-300 ms stall. They are built here, ahead of the
 * cut, one per idle slot, and offered to the renderer as the style changes.
 */
async function flipEnvs(game, staged, shot, live, wait = idle) {
  const styles = new Set((shot?.events ?? []).filter((ev) => ev.type === "artStyle").map((ev) => ev.style));
  const r = game.renderer;
  if (!r || !(styles.has(1) || styles.has(2))) return null;
  const brutal = r._visualStyle === 1;
  const envs = {};
  for (const [style, realistic] of [[1, false], [2, true]]) {
    if (!styles.has(style)) continue;
    await wait();
    if (!live()) return null;
    envs[realistic ? "realistic" : "comic"] = envFor(game, { entry: staged.entry, palette: staged.palette }, realistic, brutal);
  }
  return envs;
}

// Environment bundles built for this reel, by level and finish (release()
// drops them when the reel ends).
const envCache = new Map();

/** The act's level entry and palette for a campaign spec. */
function levelOf(spec) {
  const act = spec.act ?? 1;
  const entry = spec.entry ?? getActLevel(act, spec.level ?? 0) ?? getActLevel(act, 0);
  return { entry, palette: spec.palette ?? getAct(act)?.palette ?? act };
}

/** A level's environment bundle in one finish, built once per reel. */
function envFor(game, spec, realistic, brutal = game.renderer?._visualStyle === 1) {
  const { entry, palette } = levelOf(spec);
  const level = entry?.env ?? null;
  const key = `${palette}|${level}|${brutal ? 1 : 0}|${realistic ? 1 : 0}`;
  let env = envCache.get(key);
  if (!env) {
    env = generateModernEnv(palette, brutal, level, { realistic });
    env.realistic = realistic;
    envCache.set(key, env);
  }
  return env;
}

/** This reel's bundle for the level in the finish showing, if one was built. */
function cachedEnv(game, spec) {
  if (!envCache.size || !isModernArt()) return null;
  const { entry, palette } = levelOf(spec);
  const brutal = game.renderer?._visualStyle === 1;
  return envCache.get(`${palette}|${entry?.env ?? null}|${brutal ? 1 : 0}|${isRealisticArt() ? 1 : 0}`) ?? null;
}

/** The environment built for the finish now showing, handed to the renderer to adopt. */
function offerEnv(game, envs) {
  if (!isModernArt()) return;
  const env = envs[isRealisticArt() ? "realistic" : "comic"];
  if (env && game.renderer?._modernEnv !== env) game.renderer?.offerEnv?.(env);
}

/** Set the shot up on its freshly installed level. */
function start(game, level, spec, rng, reel, handle, shot, envs = null) {
  const cam = spec.camera ?? { kind: "path" };
  // Per-shot state rides on the director's handle for this shot. `back` is
  // how far a rewind has set the camera's clock back.
  const state = { level, cam, rng, reel, shot, envs, heading: 0, vel: 0, back: 0, fireUntil: null, time0: game.time ?? 0 };
  handle.level = state;
  if (cam.kind === "path") state.heading = targetHeading(level.path, pathTime(cam, 0), fovOf(game), 0);
  placeCamera(game, state, 0, 0);
  if ((shot?.events ?? []).some((ev) => COMBAT.has(ev.type))) state.combat = borrowCombat(game);
}

/**
 * Between steps the prepare waits on idle time (with a deadline, so a busy
 * shot still gets its next level staged), not on frames.
 */
export function idle() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 200 });
    else setTimeout(resolve, 0);
  });
}

// ─── The combat sandbox ───────────────────────────────────────────────────

/** Game fields a fight writes and the value a shot starts them at. */
const COMBAT_FIELDS = (game) => ({
  mode: "reel",
  // The game loop adds wall time to totalTimePlayed in every state; the
  // restore carries what the shot added over, as any other shot's time counts.
  achievementStats: { weaponKills: {}, totalTimePlayed: 0 },
  shotsFired: 0,
  shotsHit: 0,
  killedEnemies: 0,
  totalEnemies: 0,
  roundDamageTaken: 0,
  hitStopMs: 0,
  hitMarker: 0,
  _muzzleFlashTime: 0,
  weaponAnimFrame: 0,
  weaponAnimTime: 0,
  _chronoBombs: [],
  timeScale: 1,
  entityGrid: new SpatialGrid(2),
  aiSystem: new AISystem(),
  killStreakSystem: new KillStreakSystem(),
  chronoPowers: Object.assign(new ChronoPowers(), { scripted: true }),
  chronoHazards: new ChronoHazards(),
  // Kept as they were: only listed so the restore covers them.
  hitMarkerCrit: game.hitMarkerCrit,
  hitMarkerHead: game.hitMarkerHead,
  hitMarkerKill: game.hitMarkerKill,
  _lastHitWasCrit: game._lastHitWasCrit,
  _muzzleFlashColor: game._muzzleFlashColor,
});

const noop = () => {};

/**
 * Swap in a fresh set of combat fields and shadow the methods that reach
 * comms, saves, the Bestiary or the player's health; the returned restore
 * puts back the exact values and removes the shadows.
 */
export function borrowCombat(game) {
  const fields = COMBAT_FIELDS(game);
  const saved = Object.keys(fields).map((k) => [k, Object.hasOwn(game, k), game[k]]);
  Object.assign(game, fields);
  const shadows = [];
  const shadow = (obj, key, value) => {
    if (!obj) return;
    shadows.push([obj, key, Object.hasOwn(obj, key), obj[key]]);
    obj[key] = value;
  };
  // Invulnerable for the shot: every hit on the player goes through here.
  shadow(game, "damagePlayer", noop);
  shadow(game, "queueAriaMessage", noop);
  shadow(game, "triggerAriaOnce", noop);
  shadow(game, "saveAchievements", noop);
  // A kill here reveals no Bestiary entry.
  shadow(game.archive, "recordKill", () => false);
  // Every rumble helper (light, medium, heavy, pulse) ends in vibrate().
  shadow(game.gamepad, "vibrate", noop);
  shadow(game.gamepad, "vibrateLight", noop);
  shadow(game.gamepad, "vibrateMedium", noop);
  return {
    restore() {
      const played = game.achievementStats?.totalTimePlayed;
      for (const [k, own, v] of saved) {
        if (own) game[k] = v;
        else delete game[k];
      }
      for (const [obj, key, own, value] of shadows.reverse()) {
        if (own) obj[key] = value;
        else delete obj[key];
      }
      if (played > 0 && game.achievementStats) game.achievementStats.totalTimePlayed = (game.achievementStats.totalTimePlayed || 0) + played;
      game.audio?.setTimeScale?.(game.timeScale ?? 1);
    },
  };
}

/**
 * One step of the game's own fight, in play's order (js/game.js update):
 * Chronos, the trigger, the viewmodel's kick, enemies, projectiles, effects.
 * Time runs on the reel's clock, scaled by Chrono Shift as in play.
 */
export function simulate(game, state, dt, local) {
  const p = game.player;
  // A scripted shift lasts as long as the script says, not as the tank does.
  if (p.chronoActive) p.chronoEnergy = p.maxChronoEnergy;
  if (state.fireUntil != null && local >= state.fireUntil) {
    p.isFiring = false;
    state.fireUntil = null;
  }
  game.time = state.time0 + local * 1000;
  const sdt = dt * (game.timeScale ?? 1);
  game.chronoPowers.update(game, sdt, dt);
  if (p.isFiring) game.fireWeapon?.();
  game._updateWeaponFeel?.(dt);
  game.entityGrid.clear();
  game.entityGrid.insertAll(game.entities);
  game.updateEnemies?.(sdt);
  game.updateProjectiles?.(sdt);
  spendNearRounds(game);
  game.screenShake *= decay(0.9, dt);
  if (game.screenShake < 0.1) game.screenShake = 0;
  game._decayEffects?.(sdt);
}

// The agent takes no damage in a shot, and an enemy round on its last
// couple of metres to the lens fills the frame with one glowing disc. It is
// spent here instead, as it would be on the agent's armour a moment later.
const NEAR_ROUND = 2.2;

function spendNearRounds(game) {
  const p = game.player;
  for (const q of game.projectiles ?? []) {
    if (q.active && q.owner === "enemy" && !q.frozen && Math.hypot(q.x - p.x, q.y - p.y) < NEAR_ROUND) q.active = false;
  }
}

/** Math.random answers from the shot's PRNG while `fn` runs (spread, crits, AI); returns what `fn` does. */
export function withRandom(rng, fn) {
  const random = Math.random;
  Math.random = rng;
  try {
    return fn();
  } finally {
    Math.random = random;
  }
}

// ─── Events ───────────────────────────────────────────────────────────────

/** The combat events, shared with the `meltdown` scene's swarm. */
export const EVENTS = {
  spawn(game, ev) {
    const type = ev.enemy ?? "drone";
    const def = ENEMY_TYPES[type];
    // Late-game bosses are cards and silhouettes only.
    if (!def || def.boss) {
      console.warn(`[cinematic] cannot spawn "${type}" in a reel`);
      return;
    }
    const p = game.player;
    const base = Array.isArray(ev.pos) ? { x: ev.pos[0], y: ev.pos[1] } : ahead(game.map, p, ev.dist ?? 5);
    const n = ev.count ?? 1;
    const spread = ev.spread ?? 1.2;
    const a = Math.atan2(base.y - p.y, base.x - p.x);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      let x = base.x - Math.sin(a) * off;
      let y = base.y + Math.cos(a) * off;
      if (!open(game.map, x, y)) ({ x, y } = base);
      const e = new Enemy(x, y, type);
      e.state = ev.state ?? "idle";
      e.angle = Math.atan2(p.y - y, p.x - x);
      game.entities.push(e);
    }
  },

  attack(game, ev) {
    const p = game.player;
    const targets = ev.target === "all" ? foes(game) : [pick(game, ev.target)].filter(Boolean);
    for (const e of targets) {
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      beginWindup(e, game.time);
    }
  },

  fire(game, ev, state) {
    const p = game.player;
    const id = ev.weapon ?? 0;
    let slot = p.weapons.indexOf(id);
    if (slot < 0) slot = p.weapons.push(id) - 1;
    // Straight to the weapon: trackWeapon sees no switch to animate.
    p.currentWeapon = slot;
    p._weaponSeen = slot;
    p.ammo = Math.max(p.ammo ?? 0, 999);
    p.isFiring = true;
    state.fireUntil = beatsToSec(state.reel, (ev.at ?? 0) + (ev.dur ?? 2));
  },

  chrono(game, ev) {
    const p = game.player;
    if (ev.on === false) {
      if (p.chronoActive) game.endChronoShift();
      return;
    }
    p.chronoEnergy = p.maxChronoEnergy;
    if (!p.chronoActive) game.startChronoShift();
    // The frame's time-scale pass, so the slow-down lands on this beat.
    game._updateTimeScale();
  },

  rewind(game, ev, state) {
    const p = game.player;
    grant(game, "rewind");
    if (!game.chronoPowers.tryRewind(game)) return;
    // The camera picks up from where the rewind put the agent.
    state.back += game.chronoPowers.spec("rewind").window;
    state.heading = p.angle;
    state.vel = 0;
  },

  timeLock(game) {
    grant(game, "timeLock");
    game.chronoPowers.tryTimeLock(game);
  },

  freeze(game, ev) {
    const e = pick(game, ev.target);
    if (!e) return;
    grant(game, "timeLock");
    // Kael's own cast, made from where its plane lands on the target.
    const p = game.player;
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    const reach = game.chronoPowers.spec("timeLock").ahead;
    const at = [p.x, p.y, p.angle];
    p.x = e.x - Math.cos(a) * reach;
    p.y = e.y - Math.sin(a) * reach;
    p.angle = a;
    game.chronoPowers.tryTimeLock(game);
    [p.x, p.y, p.angle] = at;
  },
};

/** The power is the shot's, charged and off cooldown. */
function grant(game, id) {
  const cp = game.chronoPowers;
  if (!cp.powers.includes(id)) cp.powers.push(id);
  cp.cooldowns[id] = 0;
  game.player.chronoEnergy = game.player.maxChronoEnergy;
}

const foes = (game) => game.entities.filter((e) => e.type === "enemy" && e.active && e.state !== "dead");

/** `target`: "nearest" (default) or an index into the live enemies. */
function pick(game, target) {
  const list = foes(game);
  if (Number.isInteger(target)) return list[target] ?? null;
  const p = game.player;
  let best = null;
  let bestD = Infinity;
  for (const e of list) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

const open = (map, x, y) => !!map && isPassable(map, Math.floor(x), Math.floor(y));

/** Up to `dist` tiles along the camera's look, stopping a little short of a wall. */
function ahead(map, p, dist) {
  const dx = Math.cos(p.angle);
  const dy = Math.sin(p.angle);
  let d = 0;
  while (d + 0.1 <= dist && open(map, p.x + dx * (d + 0.6), p.y + dy * (d + 0.6))) d += 0.1;
  return { x: p.x + dx * d, y: p.y + dy * d };
}

/**
 * Decode the idle sprite of every enemy type a shot spawns, at the sizes a
 * few tiles away show it, so the first sight of them is not a decode stall.
 */
function warmSpawns(game, shot, live, wait = idle) {
  const types = (shot?.events ?? []).filter((ev) => ev.type === "spawn").map((ev) => ev.enemy ?? "drone");
  return warmEnemies(game, types, live, wait);
}

/** The same for a list of enemy types (duplicates are fine). */
export async function warmEnemies(game, list, live, wait = idle) {
  const ctx = game.renderer?.ctx;
  const viewH = game.renderer?.height;
  const types = [...new Set(list)];
  if (!ctx || !viewH || !types.length) return;
  const halfHeights = [1.5, 2.5, 4, 7].map((d) => viewH / d / 2);
  const dummies = types.filter((t) => ENEMY_TYPES[t] && !ENEMY_TYPES[t].boss).map((t) => new Enemy(0, 0, t));
  const until = performance.now() + 2000;
  for (;;) {
    let ready = true;
    for (const e of dummies) if (!prefetchIdleEnemy(ctx, e, halfHeights)) ready = false;
    if (ready || performance.now() > until || !live()) return;
    await wait();
  }
}

// ─── Camera ───────────────────────────────────────────────────────────────

/** Seconds along the showcase loop at shot time `local`. */
function pathTime(cam, local) {
  const loop = cam.loop ?? LOOP_SECONDS;
  return ((((cam.from ?? 0) * LOOP_SECONDS + local * (LOOP_SECONDS / loop)) % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
}

function placeCamera(game, state, local, dt) {
  const p = game.player;
  const { cam, level } = state;
  const t = local - state.back;
  if (cam.kind === "fixed") {
    p.x = cam.x;
    p.y = cam.y;
    p.angle = cam.angle ?? 0;
  } else if (cam.kind === "keys" && cam.keys?.length) {
    const [x, y, angle] = sampleKeys(state.reel, cam.keys, t);
    p.x = x;
    p.y = y;
    p.angle = angle;
  } else {
    const lt = pathTime(cam, t);
    if (dt > 0) stepHeading(state, targetHeading(level.path, lt, fovOf(game), 0), dt);
    const s = samplePath(level.path, lt / LOOP_SECONDS);
    p.x = s.x;
    p.y = s.y;
    p.angle = state.heading;
  }
}

/** [x, y, angle] at shot time `local` from `[[beat, x, y, angle], ...]`, smoothstep-eased per span. */
function sampleKeys(reel, keys, local) {
  const at = (k) => (reel ? beatsToSec(reel, k[0]) : k[0]);
  if (local <= at(keys[0])) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (local > at(b)) continue;
    const k = smooth((local - at(a)) / Math.max(1e-6, at(b) - at(a)));
    // The shorter way round for the angle.
    const da = Math.atan2(Math.sin(b[3] - a[3]), Math.cos(b[3] - a[3]));
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + da * k];
  }
  return keys.at(-1).slice(1);
}
