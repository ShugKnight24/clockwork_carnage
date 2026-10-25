/**
 * Visible arrivals: an enemy that joins a fight in front of the player
 * comes from somewhere you can see, instead of appearing out of thin air.
 *
 *   tear   a crack of light hangs in the air ~1.5 s, glowing harder under a
 *          rising crackle, splits open, and the enemy steps out of it
 *   vent   a bang from a ceiling panel, another, then it drops through
 *   lift   for a door or lift the level opens itself: no telegraph, the
 *          enemy is there at once, only held from firing for a moment
 *
 *   const a = arrive(game, { x, y, make: (x, y) => new Enemy(x, y, "drone") });
 *
 * `make` is called at once (or pass a ready `enemy`), so the caller can
 * scale, tag and count it straight away; it joins game.entities only when
 * it steps out. The returned arrival is { enemy, via, phase, ... } with
 * `phase` "wait" (a `delay` still running), "telegraph", "step" or "done".
 * pendingArrivals(game, pred) counts those not yet in the world, for a
 * caller that checks "are they all down" by looking at the entities.
 *
 * While it steps out the AI leaves it alone (ai.js skips `_arriving`), and
 * once out it starts no attack until ARMED_AFTER has passed (ai.js reads
 * `_armedAt`), the short end of the AI's own acquire time: nothing that
 * arrives in front of you can hurt you before you have seen it arrive.
 *
 * The game calls updateArrivals once a frame before the AI, and the
 * pipeline draws them (src/rendering/chrono-fx.js renderArrivals).
 */
import { ACQUIRE_SECONDS } from "./ai.js";
import { isPassable, CEILING_Z } from "./physics.js";
import { playChronoSound } from "../audio/chrono-sounds.js";
import { spawnEnergyBurst, spawnDebris } from "../../js/particle-system.js";

/** Seconds of telegraph and of stepping out, per way in. */
export const ARRIVALS = {
  tear: { telegraph: 1.5, step: 0.45 },
  vent: { telegraph: 1.0, step: 0.35 },
  lift: { telegraph: 0, step: 0 },
};

/**
 * A short tear, for what arrives as part of something already in view (a
 * summoner's call, a glitchling splitting off a death): the telegraph is
 * already on screen, so only the crack and the step are added.
 */
export const QUICK_TEAR = 0.6;

/** Seconds after stepping out before an arrival may start an attack. */
export const ARMED_AFTER = ACQUIRE_SECONDS[0];

/** How far back into the tear the enemy starts its step, tiles. */
const STEP_IN = 0.45;
/** Seconds a tear's scar or an open panel stays drawn after the arrival. */
export const LINGER = 0.5;
/** When a vent's bangs land, seconds into its telegraph. */
export const VENT_BANGS = [0.12, 0.6];
/** How high a vent's drop starts, as a share of the sprite's height: half of it through the ceiling. */
const DROP_FROM = CEILING_Z - 0.5;

let _serial = 0;

/**
 * Start an arrival at (x, y), where the enemy will stand once out.
 * @param {object} game
 * @param {{ x: number, y: number, make?: (x: number, y: number) => object, enemy?: object,
 *   via?: "tear"|"vent"|"lift", delay?: number, telegraph?: number, tag?: string|null }} opts
 *   `delay` seconds before the telegraph begins (to stagger a group);
 *   `telegraph` overrides the way in's length (a short tear for a summons).
 * @returns {object} the pending arrival
 */
export function arrive(game, { x, y, make = null, enemy = null, via = "tear", delay = 0, telegraph = null, tag = null }) {
  const spec = ARRIVALS[via] ?? ARRIVALS.tear;
  const e = enemy ?? make(x, y);
  const p = game.player;
  // It steps toward you: out of the tear's far side, along the line to you.
  let dx = p ? p.x - x : 1;
  let dy = p ? p.y - y : 0;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  let sx = x;
  let sy = y;
  if (via === "tear" && (!game.map || isPassable(game.map, Math.floor(x - dx * STEP_IN), Math.floor(y - dy * STEP_IN)))) {
    sx = x - dx * STEP_IN;
    sy = y - dy * STEP_IN;
  }
  const a = {
    id: ++_serial,
    via: ARRIVALS[via] ? via : "tear",
    x,
    y,
    // Where the tear hangs (or the panel is): the start of the step.
    tx: sx,
    ty: sy,
    enemy: e,
    tag,
    t: -Math.max(0, delay),
    telegraph: telegraph ?? spec.telegraph,
    step: spec.step,
    phase: delay > 0 ? "wait" : "telegraph",
    doneAt: null,
    map: game.map,
    _nextTick: 0,
    _bang: 0,
    _rose: false,
  };
  e._arrival = a;
  if (!game.arrivals) game.arrivals = [];
  game.arrivals.push(a);
  // A lift has nothing to show: the door is the telegraph, and it is open.
  if (a.telegraph <= 0 && a.t >= 0) emerge(game, a);
  return a;
}

/** Arrivals not yet in the world (waiting or telegraphing), optionally those matching `pred(enemy, arrival)`. */
export function pendingArrivals(game, pred = null) {
  let n = 0;
  for (const a of game.arrivals ?? []) {
    if (a.phase !== "wait" && a.phase !== "telegraph") continue;
    if (!pred || pred(a.enemy, a)) n++;
  }
  return n;
}

/** Drop every arrival (a level load, a checkpoint restore): nothing half-arrived carries over. */
export function clearArrivals(game) {
  if (game.arrivals) game.arrivals.length = 0;
}

/**
 * Should a spawn at (x, y) arrive visibly: in the player's view (inside the
 * horizontal FOV and in line of sight is the caller's business; the cone is
 * enough here) or within `near` tiles. Out of sight and far off, an enemy
 * may simply be there.
 */
export function inViewOrNear(player, x, y, near = 6, halfAngle = 0.75) {
  if (!player) return false;
  const dx = x - player.x;
  const dy = y - player.y;
  const d = Math.hypot(dx, dy);
  if (d <= near) return true;
  const off = Math.atan2(dy, dx) - player.angle;
  return Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) <= halfAngle;
}

function sound(game, kind, a) {
  playChronoSound(game.audio, kind, { x: a.tx, y: a.ty, player: game.player });
}

/** The enemy comes into the world: at the tear's mouth (or the vent's drop), not yet itself. */
function emerge(game, a) {
  const e = a.enemy;
  a.phase = a.step > 0 ? "step" : "done";
  a.t = Math.max(a.t, a.telegraph);
  e.x = a.tx;
  e.y = a.ty;
  if (a.step > 0) {
    e._arriving = true;
    e.renderAlpha = 0;
    if (a.via === "vent") e.liftZ = DROP_FROM;
  }
  if (!game.entities.includes(e)) game.entities.push(e);
  if (a.via === "tear") {
    sound(game, "tearOpen", a);
    game._spawnParticlesAt?.(null, (ps) => spawnEnergyBurst(ps, a.tx, a.ty, { count: 14, r: 190, g: 90, b: 255 }));
    game.glitchEffect = Math.max(game.glitchEffect || 0, 0.2);
  } else if (a.via === "vent") {
    sound(game, "ventDrop", a);
  }
  if (a.phase === "done") settle(game, a);
}

/** Out and itself: the AI has it from here, its first attack a moment off. */
function settle(game, a) {
  const e = a.enemy;
  a.phase = "done";
  a.doneAt = a.t;
  e.x = a.x;
  e.y = a.y;
  e._arriving = false;
  e.renderAlpha = 1;
  e.liftZ = 0;
  e._armedAt = (game.time ?? 0) + ARMED_AFTER * 1000;
  // A rifle aims from scratch once it can see you (ai.js ACQUIRE_SECONDS).
  e._acquire = 0;
  e._acquireNeed = null;
  if (a.via === "vent") {
    sound(game, "ventLand", a);
    game._spawnParticlesAt?.(null, (ps) => spawnDebris(ps, a.x, a.y, { count: 8 }));
  }
}

/**
 * Run every arrival on by `dt` sim seconds. Call once a frame, before the AI.
 * An arrival from another level (the map was replaced) is dropped unseen.
 */
export function updateArrivals(game, dt) {
  const list = game.arrivals;
  if (!list?.length) return;
  let write = 0;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.map !== game.map) continue;
    a.t += dt;
    if (a.phase === "wait" && a.t >= 0) a.phase = "telegraph";
    if (a.phase === "telegraph") {
      telegraphSounds(game, a);
      if (a.t >= a.telegraph) emerge(game, a);
    }
    if (a.phase === "step") {
      const k = Math.min(1, (a.t - a.telegraph) / a.step);
      const e = a.enemy;
      if (a.via === "vent") {
        // A drop: slow off the lip, fast at the floor.
        e.liftZ = DROP_FROM * (1 - k * k);
        e.renderAlpha = Math.min(1, k * 4);
      } else {
        const s = k * k * (3 - 2 * k);
        e.x = a.tx + (a.x - a.tx) * s;
        e.y = a.ty + (a.y - a.ty) * s;
        e.renderAlpha = Math.min(1, k * 1.4);
      }
      if (k >= 1) settle(game, a);
    }
    // Keep a finished one a moment, for the scar it leaves.
    if (a.phase === "done" && a.t - a.doneAt > LINGER) {
      if (a.enemy._arrival === a) a.enemy._arrival = null;
      continue;
    }
    list[write++] = a;
  }
  list.length = write;
}

/** The telegraph's sounds: a tear's crackle quickening, a vent's bangs. */
function telegraphSounds(game, a) {
  if (a.via === "tear") {
    if (!a._rose) {
      a._rose = true;
      sound(game, "tearRise", a);
    }
    const k = Math.min(1, a.t / a.telegraph);
    if (a.t >= a._nextTick) {
      sound(game, k < 0.6 ? "crackle" : "crackleHot", a);
      // From four a second to twenty as it comes apart.
      a._nextTick = a.t + 0.25 - 0.2 * k;
    }
  } else if (a.via === "vent") {
    while (a._bang < VENT_BANGS.length && a.t >= VENT_BANGS[a._bang] * (a.telegraph / ARRIVALS.vent.telegraph)) {
      a._bang++;
      sound(game, "ventBang", a);
      game.screenShake = Math.max(game.screenShake || 0, 0.06);
    }
  }
}

/** 0..1 how far through its telegraph an arrival is (1 once out), for the drawing. */
export function telegraphK(a) {
  if (a.phase === "wait") return 0;
  return a.telegraph > 0 ? Math.min(1, Math.max(0, a.t / a.telegraph)) : 1;
}
