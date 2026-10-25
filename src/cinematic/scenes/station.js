/**
 * `station` shots: a first-person glide through the prologue's station (the
 * Chronos PD floor, TUTORIAL_MAP): the range, the locker room, the gym and
 * its evidence cage, the Supervisor's office, the corridor, the sim hall and
 * its lift. The map is installed as a showcase level is (installStagedLevel:
 * the station's grid, its props and any figures swapped in for
 * SHOWCASE_FIELDS and put back exactly), so no tutorial step, comms, save or
 * pickup path is reachable from here.
 *
 * Outside the tutorial nothing lights the rooms, so the scene does what
 * TutorialSystem._syncRoomLights does: each frame the lamps of the rooms the
 * camera is in or beside (TUTORIAL_MAP.roomLights), nearest first, up to the
 * wall pass's 16.
 *
 * spec: { camera: { keys: [[beat, x, y, angle, pitch?], ...], ease = 0.5, drift = 1 },
 *         doors = "open" | [names] | "shut"   (which of TUTORIAL_MAP.doors stand open),
 *         pickups = false   (the map's weapon and med pickups, still, where they lie),
 *         figures: [{ enemy, pos: [x, y], facing }]   (idle, never fighting),
 *         vents: [{ kind: "spark" | "steam", pos: [x, y] }],
 *         dim = 1   (the lamps' intensity, scaled),
 *         alert: [[x, y], ...]   (the alarm's red lamps, pulsing on the beat),
 *         lamps: [{ x, y, color, radius, intensity }]   (a key light of the shot's
 *           own, for a room the prologue leaves to the ceiling's light),
 *         weapon }
 * The camera runs one Catmull-Rom curve through its keys (beats from the
 * shot's start), eased in and out over the whole shot by `ease` (0 is a
 * constant glide, 1 a full smoothstep), so a multi-key move never stops at
 * a key; `drift` adds a slow hand-held sway to the heading. The optional
 * pitch tilts the view (a fraction of the screen height; positive looks up).
 *
 * Events (beats from the shot's start):
 *   { type: "flicker", len = 1 }   the lamps stutter down to a third
 *   { type: "lights", on }         the lamps go out (or back on)
 */
import { beatsToSec } from "../timeline.js";
import { TUTORIAL_MAP } from "../../data/levels/tutorial.js";
import { Enemy, Pickup, Prop } from "../../../js/entities.js";
import { ENEMY_TYPES } from "../../data/enemies.js";
import { validatePropPosition } from "../../systems/spawner.js";
import { installStagedLevel, prewarmStyle, updateAmbience } from "../../systems/showcase.js";
import { generateModernEnv, ensureEnvWalls } from "../../rendering/textures.js";
import { isModernArt, isRealisticArt } from "../../rendering/art-style.js";
import { idle, warmEnemies } from "./campaign.js";

// The prologue plays under the renderer's default palette: Act I's, no level variation.
const PALETTE = 1;
const ENTRY = { env: null };
const MAX_LIGHTS = 16;
const NEAR = 3;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export const station = {
  world: true,

  /**
   * The station's environment in the finish showing, its own walls (the
   * lockers, the range, every room's art) painted in, built while the reel
   * opens on black and kept for the reel. Painted on a shot's first frame,
   * the room walls cost the cut a long stall.
   */
  preload(game, spec, { live = () => true } = {}) {
    if (!isModernArt() || !game.renderer?.offerEnv) return null;
    return idle().then(() => live() && stationEnv(game));
  },

  release() {
    envCache.clear();
  },

  /** The next shot's station, staged while the current shot plays (nothing installed). */
  prepare(game, spec, { live = () => true, shot } = {}) {
    const prep = { staged: null, done: null };
    prep.done = stage(game, spec, shot, live, idle).then((staged) => (prep.staged = live() ? staged : null));
    return prep;
  },

  build(game, spec, rng, { live = () => true, reel, handle, prepared = null }) {
    if (prepared?.staged) {
      start(game, prepared.staged, spec, rng, reel, handle);
      return;
    }
    return (async () => {
      const staged = (prepared && (await prepared.done)) || (await stage(game, spec, null, live));
      if (!staged || !live()) return;
      start(game, staged, spec, rng, reel, handle);
    })();
  },

  update(game, dt, local, handle) {
    const st = handle.station;
    if (!st) return;
    st.local = local;
    placeCamera(game, st, local);
    syncLights(game, st, local);
    if (st.env && isModernArt() && game.renderer?._modernEnv !== st.env) game.renderer?.offerEnv?.(st.env);
    updateAmbience(game, st.level.emitters, dt, st.rng);
  },

  event(game, ev, handle) {
    const st = handle.station;
    if (!st) return;
    const at = st.local ?? 0;
    if (ev.type === "flicker") st.flickerUntil = at + beatsToSec(st.reel, ev.len ?? 1);
    else if (ev.type === "lights") st.dark = ev.on === false;
  },

  teardown(game, handle) {
    const st = handle.station;
    if (!st) return;
    st.level.restore();
    if (st.pitch.own) game.showcasePitch = st.pitch.value;
    else delete game.showcasePitch;
    handle.station = null;
  },
};

// ─── Staging ──────────────────────────────────────────────────────────────

/**
 * The station as a staged level: a fresh copy of the map with the shot's
 * doors open, the room props where the prologue puts them, any figures, and
 * the sprites decoded at the sizes the camera sees them.
 */
async function stage(game, spec, shot, live, wait = idle) {
  await wait();
  if (!live()) return null;
  const map = structuredClone(TUTORIAL_MAP);
  for (const name of doorsOf(spec)) for (const d of TUTORIAL_MAP.doors[name] ?? []) map.grid[d.y][d.x] = 0;
  const props = [];
  for (const p of TUTORIAL_MAP.props ?? []) {
    const pos = validatePropPosition(p.x, p.y, map.grid, map.width, map.height);
    if (!pos) continue;
    const prop = new Prop(pos.x + 0.5, pos.y + 0.5, p.type);
    if (p.variant) prop.variant = p.variant;
    props.push(prop);
  }
  const pickups = spec.pickups ? (TUTORIAL_MAP.pickups ?? []).map((p) => new Pickup(p.x, p.y, p.type, p)) : [];
  const foes = [];
  for (const f of spec.figures ?? []) {
    if (!ENEMY_TYPES[f.enemy] || ENEMY_TYPES[f.enemy].boss) continue;
    const e = new Enemy(f.pos[0], f.pos[1], f.enemy);
    e.state = "idle";
    e.angle = f.facing ?? 0;
    foes.push(e);
  }
  const cams = routeCams(spec.camera);
  await wait();
  if (!live()) return null;
  if (isModernArt()) await prewarmStyle(game, { map, props, foes }, cams, isRealisticArt(), [], { live, wait });
  if (!live()) return null;
  if (foes.length) await warmEnemies(game, foes.map((e) => e.enemyType), live, wait);
  if (!live()) return null;
  const emitters = (spec.vents ?? []).map((v, i) => ({ x: v.pos[0], y: v.pos[1], kind: v.kind === "steam" ? "steam" : "spark", next: i * 0.37 }));
  const path = cams.length ? cams.map((c) => ({ x: c.x, y: c.y })) : [{ x: TUTORIAL_MAP.playerStart.x, y: TUTORIAL_MAP.playerStart.y }];
  return { act: 1, entry: ENTRY, palette: PALETTE, map, path, props: [...props, ...pickups], foes, emitters, env: cachedEnv(game) };
}

function doorsOf(spec) {
  const d = spec.doors ?? "open";
  if (d === "shut") return [];
  if (Array.isArray(d)) return d;
  return Object.keys(TUTORIAL_MAP.doors ?? {});
}

/** Set the shot up on the freshly installed station. */
function start(game, staged, spec, rng, reel, handle) {
  const level = installStagedLevel(game, staged);
  const pitch = { own: Object.hasOwn(game, "showcasePitch"), value: game.showcasePitch };
  const lamps = (TUTORIAL_MAP.roomLights ?? []).map((d) => ({
    room: d.room, x: d.x, y: d.y, color: d.color, radius: d.radius,
    baseIntensity: d.intensity, intensity: d.intensity, life: 1e9, maxLife: 1e9,
  }));
  const alert = (spec.alert ?? []).map(([x, y]) => ({ x, y, color: [255, 30, 50], radius: 4, baseIntensity: 1, intensity: 1, life: 1e9, maxLife: 1e9 }));
  for (const d of spec.lamps ?? []) lamps.push({ room: null, x: d.x, y: d.y, color: d.color ?? [255, 228, 196], radius: d.radius ?? 4, baseIntensity: d.intensity ?? 0.5, intensity: d.intensity ?? 0.5, life: 1e9, maxLife: 1e9 });
  const st = { level, spec, rng, reel, cam: spec.camera ?? {}, lamps, alert, pitch, env: staged.env, flickerUntil: -1, dark: false, local: 0 };
  handle.station = st;
  placeCamera(game, st, 0);
  syncLights(game, st, 0);
}

// Environment bundles built for this reel, by finish (release() drops them when the reel ends).
const envCache = new Map();

const envKey = (game) => `${game.renderer?._visualStyle === 1 ? 1 : 0}|${isRealisticArt() ? 1 : 0}`;

function stationEnv(game) {
  const key = envKey(game);
  let env = envCache.get(key);
  if (!env) {
    const realistic = isRealisticArt();
    env = generateModernEnv(PALETTE, game.renderer?._visualStyle === 1, ENTRY.env, { realistic });
    env.realistic = realistic;
    // The east wing (lateWalls) is never in shot: the game paints it later.
    const late = TUTORIAL_MAP.lateWalls ?? [];
    ensureEnvWalls(env, TUTORIAL_MAP.ownWalls.filter((id) => !late.includes(id)), realistic);
    envCache.set(key, env);
  }
  return env;
}

const cachedEnv = (game) => (isModernArt() ? envCache.get(envKey(game)) ?? null : null);

// ─── Lamps ────────────────────────────────────────────────────────────────

/**
 * The rooms' lamps the camera is in or beside, nearest first, then the
 * alarm's pulsing reds; nothing else in game.lights (the install gave the
 * shot a list of its own).
 */
function syncLights(game, st, local) {
  const p = game.player;
  const lights = game.lights;
  if (!lights || !p) return;
  lights.length = 0;
  if (st.dark) return;
  const near = (b) => b && p.x > b.x0 - NEAR && p.x < b.x1 + NEAR && p.y > b.y0 - NEAR && p.y < b.y1 + NEAR;
  const dim = (st.spec.dim ?? 1) * (local < st.flickerUntil ? flicker(local) : 1);
  const on = st.lamps.filter((L) => L.room === null || near(TUTORIAL_MAP.rooms?.[L.room]));
  on.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  const beat = st.reel ? (local * st.reel.bpm) / 60 : local * 2;
  const pulse = 0.35 + 0.65 * Math.max(0, Math.sin(beat * Math.PI));
  for (const L of st.alert) {
    L.intensity = L.baseIntensity = pulse;
    lights.push(L);
  }
  for (const L of on) {
    if (lights.length >= MAX_LIGHTS) break;
    L.intensity = L.baseIntensity * dim;
    lights.push(L);
  }
}

/** A stutter: mostly a third, catching full for a frame or two. */
const flicker = (t) => (Math.sin(t * 61) > 0.82 || Math.sin(t * 23 + 1) > 0.9 ? 1 : 0.35);

// ─── Camera ───────────────────────────────────────────────────────────────

function placeCamera(game, st, local) {
  const p = game.player;
  const s = sampleGlide(st.reel, st.cam, local);
  if (!s) return;
  const drift = st.cam.drift ?? 1;
  p.x = s[0];
  p.y = s[1];
  p.angle = s[2] + drift * (Math.sin(local * 0.73) * 0.006 + Math.sin(local * 1.91 + 0.4) * 0.0025);
  game.showcasePitch = s[3];
}

/**
 * [x, y, angle, pitch] at shot time `local`: one Catmull-Rom curve through the keys,
 * the shot's time eased by `ease` over the whole move.
 */
export function sampleGlide(reel, cam, local) {
  const keys = cam?.keys;
  if (!keys?.length) return null;
  const k = unwrapKeys(keys);
  const sec = (b) => (reel ? beatsToSec(reel, b) : b);
  if (k.length === 1) return [k[0][1], k[0][2], k[0][3], k[0][4] ?? 0];
  const t0 = sec(k[0][0]);
  const tN = sec(k.at(-1)[0]);
  const u = Math.min(1, Math.max(0, (local - t0) / Math.max(1e-6, tN - t0)));
  const ease = cam.ease ?? 0.5;
  const t = t0 + (u + (smooth(u) - u) * ease) * (tN - t0);
  let i = 0;
  while (i < k.length - 2 && t > sec(k[i + 1][0])) i++;
  const a = sec(k[i][0]);
  const b = sec(k[i + 1][0]);
  const s = Math.min(1, Math.max(0, (t - a) / Math.max(1e-6, b - a)));
  const p1 = k[i];
  const p2 = k[i + 1];
  const p0 = k[i - 1] ?? mirror(p2, p1);
  const p3 = k[i + 2] ?? mirror(p1, p2);
  const out = [];
  for (let c = 1; c <= 4; c++) out.push(catmull(p0[c] ?? 0, p1[c] ?? 0, p2[c] ?? 0, p3[c] ?? 0, s));
  return out;
}

/** The keys with each angle taken the shorter way round from the one before. */
function unwrapKeys(keys) {
  const out = [keys[0].slice()];
  for (let i = 1; i < keys.length; i++) {
    const prev = out[i - 1][3];
    const k = keys[i].slice();
    k[3] = prev + Math.atan2(Math.sin(k[3] - prev), Math.cos(k[3] - prev));
    out.push(k);
  }
  return out;
}

/** The point past `to` as far as `from` is before it (an end key's phantom neighbour). */
const mirror = (from, to) => from.map((v, c) => (c === 0 ? v : 2 * (to[c] ?? 0) - (v ?? 0)));

function catmull(p0, p1, p2, p3, s) {
  const s2 = s * s;
  const s3 = s2 * s;
  return 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (3 * p1 - p0 - 3 * p2 + p3) * s3);
}

/** Where the camera is and looks, sampled along the move, for the sprite decodes. */
function routeCams(cam) {
  const keys = cam?.keys;
  if (!keys?.length) return [];
  const first = keys[0][0];
  const last = keys.at(-1)[0];
  const out = [];
  for (let n = 0; n <= 24; n++) {
    const s = sampleGlide(null, { ...cam, ease: 0 }, first + ((last - first) * n) / 24);
    out.push({ x: s[0], y: s[1], heading: s[2] });
  }
  return out;
}
