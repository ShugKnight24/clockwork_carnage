/**
 * The settings deck's scene from the main menu: a real campaign level with a
 * slow camera loop, a few enemies idling and a fresh player's HUD. It never
 * calls the campaign loader, so no save, stat, achievement, unlock,
 * analytics, ARIA / squad comms or music path is reachable: it swaps a fixed
 * list of game fields (SHOWCASE_FIELDS) and puts them back exactly on stop.
 * The game does not update in SETTINGS, so enemy AI and damage never run.
 */
import { getActLevel, campaignMap, getAct, ENEMY_TYPES } from "../../js/data.js";
import { Enemy, Player } from "../../js/entities.js";
import { updateParticles, spawnSmoke } from "../../js/particle-system.js";
import { spawnWallSparks } from "../../js/vfx.js";
import { particlePool } from "../utils/particle-pool.js";
import { prefetchIdleEnemy } from "../rendering/svg-art/sprites/enemies.js";
import { isModernArt } from "../rendering/art-style.js";
import { prefetchPropSprite, warmPropSet } from "../rendering/props.js";
import { createCampaignEntities } from "./spawner.js";
import { buildShowcasePath, hasLineOfSight, samplePath } from "./showcase-path.js";

export const LOOP_SECONDS = 40;

// One curated level per act (0-based index into the act's levels), picked for
// a long loop through lit, open halls: I-6 Reactor, II-4 Transit Loop,
// III-3 Reactor Overload, IV-2 The Loop.
const LEVEL_FOR_ACT = { 1: 5, 2: 3, 3: 2, 4: 1 };
const IDLE_ENEMIES = 6;
// The camera looks at a point this far ahead on the loop, and its heading
// follows that look with a critically damped spring, so a sharp corner reads
// as a slow pan instead of a whip.
const LOOK_AHEAD_SECONDS = 1.6;
const HEADING_SMOOTH = 0.9;

/** What the showcase puts in each borrowed field besides map, entities and player. */
const scene = () => ({
  world: null,
  projectiles: [],
  exitEntity: null,
  dustMotes: null,
  mode: "showcase",
  tracers: [],
  lights: [],
  damageNumbers: [],
  bossNameCard: null,
  objectiveWaypoint: null,
  screenShake: 0,
  glitchEffect: 0,
  slowMoTimer: 0,
  _hudDisabledUntil: 0,
});

export const SHOWCASE_FIELDS = ["map", "entities", "player", ...Object.keys(scene())];

/** The highest act the player has reached (a new player sees Act I), never beyond progress. */
export function showcaseAct(stats, campaignSave) {
  const cleared = stats?.campaignComplete ? 4 : Number(stats?.campaignActsCleared) || 0;
  const reached = Math.max(cleared + 1, Number(campaignSave?.act) || 1);
  return Math.min(4, Math.max(1, reached));
}

export const showcaseLevel = (act) => LEVEL_FOR_ACT[act] ?? 0;

// Paths are pure functions of the level; the first build can take tens of ms.
const paths = new Map();
function pathFor(entry, map) {
  const key = `${entry.map}|${entry.seed}|${entry.rotation || 0}`;
  if (!paths.has(key)) paths.set(key, buildShowcasePath(map));
  return paths.get(key);
}

// Enemy spots cost a sweep of the level (tens of ms): once per level and FOV.
const spotCache = new Map();
function enemiesFor(entry, map, path, act, fov) {
  const key = `${entry.map}|${entry.seed}|${entry.rotation || 0}|${fov}`;
  if (!spotCache.has(key)) spotCache.set(key, idleSpots(map, path, act, fov));
  return spotCache.get(key).map((s) => {
    const e = new Enemy(s.x, s.y, s.type);
    e.state = "idle";
    e.angle = s.angle;
    e.showcase = true;
    return e;
  });
}

/** Let a frame paint (the fade) and any queued Escape run before the next heavy step. */
function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}

/**
 * Build and install the scene. The caller hides the canvas first: the
 * environment bake and the path search happen while nothing is visible.
 * A stopShowcase (or a newer start) before this resolves cancels the install
 * and leaves every game field as it was.
 */
export async function startShowcase(game, { campaignSave = null, wait = nextFrame } = {}) {
  const token = { installed: false };
  game._showcase = token;
  // Leaving Settings by any path (the canvas fallback screen sets the state
  // itself) cancels a load still in flight; the HUD editor, opened from the
  // deck, keeps it as a backdrop.
  const live = () => game._showcase === token && (game.state === "settings" || game.state === "hudEditor");
  const act = game._showcaseForceAct ?? showcaseAct(game.achievementStats, campaignSave);
  const level = await installLevelScene(game, { act, level: showcaseLevel(act), live, wait });
  if (!level) return;

  token.restore = level.restore;
  token.path = level.path;
  token.emitters = level.emitters;
  token.t = 0;
  token.vel = 0;
  game.showcasePitch = 0;
  token.heading = targetHeading(level.path, 0, fovOf(game), 0);
  token.installed = true;
  placeCamera(game, token);
}

/**
 * The showcase's level without its camera loop (the reel director flies its
 * own camera): build the act's level, its props and a few idle enemies over
 * several `wait()`s, then swap them in for SHOWCASE_FIELDS in one step.
 * Returns null, touching nothing, when `live()` turns false before the swap;
 * otherwise `{ act, map, path, emitters, restore }`, where `restore()` puts
 * every borrowed field and the act palette back (safe to call twice).
 */
export async function installLevelScene(game, { act, level, live = () => true, wait = nextFrame, enemies = true }) {
  const entry = getActLevel(act, level) ?? getActLevel(act, 0);
  const palette = getAct(act)?.palette ?? act;

  await wait();
  if (!live()) return null;
  game.renderer?.prewarmEnv?.(palette, entry.env);
  await wait();
  if (!live()) return null;
  const map = structuredClone(campaignMap(entry));
  const path = pathFor(entry, map);
  const props = levelProps(map, act);
  const foes = enemies ? enemiesFor(entry, map, path, act, fovOf(game)) : [];
  await wait();
  if (!live()) return null;
  await prewarmSprites(game, map, path, props, foes, live, wait);
  if (!live()) return null;

  const saved = Object.fromEntries(SHOWCASE_FIELDS.map((k) => [k, game[k]]));
  const savedPalette = [game.renderer?._actPalette, game.renderer?._envLevel];
  Object.assign(game, scene());
  game.map = map;
  game.player = new Player(path[0].x, path[0].y, 0);
  game.entities = [...props, ...foes];
  game.showcaseAct = act;
  game.renderer?.applyActPalette?.(palette, entry.env);
  let restored = false;
  return {
    act,
    map,
    path,
    emitters: ambientEmitters(map, path),
    restore() {
      if (restored) return;
      restored = true;
      for (const p of game.player?.particles ?? []) particlePool.release(p);
      for (const k of SHOWCASE_FIELDS) game[k] = saved[k];
      delete game.showcaseAct;
      game.renderer?.applyActPalette?.(savedPalette[0], savedPalette[1]);
    },
  };
}

// The most the install waits on sprite decodes before fading in anyway.
const PREWARM_MS = 3000;

/**
 * Decode every enemy's idle sprite and every prop at each size the loop will
 * show it, while the canvas is still hidden. Decoding on first sight cost
 * 66–750 ms frames through the first loop (SVG rasterises on the main thread).
 */
async function prewarmSprites(game, map, path, props, enemies, live, wait) {
  const ctx = game.renderer?.ctx;
  const viewH = game.renderer?.height;
  if (!ctx || !viewH || !isModernArt()) return;
  const fov = fovOf(game);
  const cams = simulateCamera(path, fov);
  // Sprites are as tall on screen as a wall at their depth: viewH / depth.
  const propJobs = [...new Set(props.map((p) => p.propType))].map((type) => {
    const hs = props.filter((p) => p.propType === type).flatMap((p) => sightHeights(map.grid, cams, p, fov, viewH));
    return [() => prefetchPropSprite(ctx, type, hs), hs];
  });
  const jobs = [
    ...enemies.map((e) => {
      const hs = sightHeights(map.grid, cams, e, fov, viewH);
      return [() => prefetchIdleEnemy(ctx, e, hs.map((h) => h / 2)), hs];
    }),
    ...propJobs,
  ].filter(([, hs]) => hs.length);
  // The game's own first-sight warm of the whole prop set, done here instead
  // of in the middle of the loop.
  const firstProp = propJobs.find(([, hs]) => hs.length)?.[1][0];
  if (firstProp) warmPropSet(firstProp);
  const until = performance.now() + PREWARM_MS;
  for (;;) {
    let ready = true;
    for (const [prefetch] of jobs) if (!prefetch()) ready = false;
    if (ready || performance.now() > until) return;
    await wait();
    if (!live()) return;
  }
}

/**
 * On-screen sprite heights (canvas px) at which the camera loop sees `e`, the
 * tallest per half-octave (the raster cache keeps one bitmap per half-octave),
 * plus one half-octave above the tallest: the loop's samples can miss the
 * closest pass by a little.
 */
function sightHeights(grid, cams, e, fov, viewH) {
  const half = ((fov / 2) * Math.PI) / 180 + 0.2; // a sprite straddling the edge still draws
  const byBucket = new Map();
  for (const c of cams) {
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    const a = wrap(Math.atan2(e.y - c.y, e.x - c.x) - c.heading);
    const depth = d * Math.cos(a);
    if (Math.abs(a) > half || depth < 0.3 || !hasLineOfSight(grid, c, e)) continue;
    const h = viewH / depth;
    const key = Math.ceil(Math.log2(h) * 2);
    byBucket.set(key, Math.max(byBucket.get(key) ?? 0, h));
  }
  const hs = [...byBucket.values()];
  if (hs.length) hs.push(Math.max(...hs) * Math.SQRT2);
  return hs;
}

/** The level's own decoration (props only: no pickups, exit or its real enemies). */
function levelProps(map, act) {
  const diff = { healthMul: 1, damageMul: 1, speedMul: 1 };
  return createCampaignEntities(map, act, 0, diff).entities.filter((e) => e.type === "prop");
}

const isOpen = (grid, x, y) => grid[Math.floor(y)]?.[Math.floor(x)] === 0;

/** Open, and not hugging a wall, so the sprite never clips into one. */
function roomy(grid, x, y) {
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (!isOpen(grid, x + dx, y + dy)) return false;
  return true;
}

// Enemy spots are scored against the camera's framing with the side panel
// open (the bottom sheet shows at least as much of the left of the view).
const PANEL_FRAC = 0.32;
const SIM_STEPS = 240;
const SEE_NEAR = 2.5;
const SEE_FAR = 11;

/** Where the camera is and looks at SIM_STEPS even times round the loop, as updateShowcase moves it. */
function simulateCamera(path, fov) {
  const dt = LOOP_SECONDS / SIM_STEPS;
  const cam = { heading: targetHeading(path, 0, fov, PANEL_FRAC), vel: 0 };
  const out = [];
  // A second lap, so the samples carry the spring's lag from the lap before.
  for (let lap = 0; lap < 2; lap++) {
    for (let i = 0; i < SIM_STEPS; i++) {
      const t = i * dt;
      stepHeading(cam, targetHeading(path, t, fov, PANEL_FRAC), dt);
      if (lap) out.push({ ...samplePath(path, t / LOOP_SECONDS), heading: cam.heading });
    }
  }
  return out;
}

/** The camera samples from which a spot shows in the uncovered part of the view, near enough to read. */
function sightings(grid, cams, spot, fov) {
  const tanHalf = Math.tan(((fov / 2) * Math.PI) / 180);
  const seen = [];
  cams.forEach((c, i) => {
    const d = Math.hypot(spot.x - c.x, spot.y - c.y);
    if (d < SEE_NEAR || d > SEE_FAR) return;
    const a = wrap(Math.atan2(spot.y - c.y, spot.x - c.x) - c.heading);
    if (Math.abs(a) >= Math.PI / 2) return;
    const sx = 0.5 + (0.5 * Math.tan(a)) / tanHalf; // 0 = left edge, 1 = right edge
    if (sx < 0.08 || sx > 0.95 - PANEL_FRAC) return;
    if (hasLineOfSight(grid, c, spot)) seen.push(i);
  });
  return seen;
}

/**
 * Spots for a few of the act's enemies, standing where the camera will see them, off
 * its line and clear of walls, each turned to face it. Spots are picked
 * greedily for the loop time they add to what the others already cover, so
 * the camera keeps meeting someone rather than passing a crowd once.
 */
function idleSpots(map, path, act, fov) {
  const roster = (getAct(act)?.roster ?? ["drone"]).filter((t) => ENEMY_TYPES[t] && !ENEMY_TYPES[t].boss);
  if (!roster.length) return [];
  const grid = map.grid;
  const line = Array.from({ length: SIM_STEPS }, (_, i) => samplePath(path, i / SIM_STEPS));
  const near = (x, y, r) => line.some((s) => Math.hypot(s.x - x, s.y - y) <= r);
  const cams = simulateCamera(path, fov);
  const spots = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = { x: x + 0.5, y: y + 0.5 };
      if (!roomy(grid, c.x, c.y) || near(c.x, c.y, 1.4) || !near(c.x, c.y, SEE_FAR)) continue;
      const seen = sightings(grid, cams, c, fov);
      if (seen.length) spots.push({ ...c, seen });
    }
  }
  const covered = new Set();
  const out = [];
  while (out.length < IDLE_ENEMIES) {
    let best = null;
    let bestScore = 0;
    for (const sp of spots) {
      if (out.some((e) => Math.hypot(e.x - sp.x, e.y - sp.y) < 3)) continue;
      const fresh = sp.seen.reduce((n, i) => n + (covered.has(i) ? 0 : 1), 0);
      const score = fresh + 0.1 * sp.seen.length;
      if (score > bestScore) {
        bestScore = score;
        best = sp;
      }
    }
    if (!best) break;
    best.seen.forEach((i) => covered.add(i));
    // Face the camera where it sees this one best (the middle sighting).
    const c = cams[best.seen[best.seen.length >> 1]];
    out.push({ x: best.x, y: best.y, type: roster[(out.length * 3) % roster.length], angle: Math.atan2(c.y - best.y, c.x - best.x) });
  }
  return out;
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Where the camera wants to look at loop time `t`: along the loop a little
 * ahead, turned right by the share of the screen the side panel covers so
 * that look lands in the middle of the visible part, left of the panel.
 */
export function targetHeading(path, t, fov, panelFrac) {
  const pos = samplePath(path, t / LOOP_SECONDS);
  const ahead = samplePath(path, (t + LOOK_AHEAD_SECONDS) / LOOP_SECONDS);
  const look = Math.hypot(ahead.x - pos.x, ahead.y - pos.y) > 1e-3 ? Math.atan2(ahead.y - pos.y, ahead.x - pos.x) : pos.angle;
  const halfFov = ((fov / 2) * Math.PI) / 180;
  return look + Math.atan(Math.max(0, panelFrac) * Math.tan(halfFov));
}

/** Critically damped follow (Game Programming Gems 4, 1.10) on the wrapped difference. */
export function stepHeading(cam, goal, dt) {
  const target = cam.heading + wrap(goal - cam.heading);
  const omega = 2 / HEADING_SMOOTH;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cam.heading - target;
  const temp = (cam.vel + omega * change) * dt;
  cam.vel = (cam.vel - omega * temp) * decay;
  cam.heading = wrap(target + (change + temp) * decay);
}

function placeCamera(game, token) {
  const s = samplePath(token.path, token.t / LOOP_SECONDS);
  game.player.x = s.x;
  game.player.y = s.y;
  game.player.angle = token.heading;
}

/**
 * Advance the loop by `dt` seconds. `panelFrac` is the fraction of the screen
 * width the deck's side panel covers; `sheetFrac` the fraction of its height
 * the bottom sheet covers. The view lifts its horizon into the middle of what
 * the sheet leaves (showcasePitch, a fraction of the screen height), so a
 * phone sees the level rather than its ceiling.
 */
export function updateShowcase(game, dt, { panelFrac = 0, sheetFrac = 0 } = {}) {
  const token = game._showcase;
  if (!token?.installed || !(dt > 0)) return;
  token.t = (token.t + dt) % LOOP_SECONDS;
  stepHeading(token, targetHeading(token.path, token.t, fovOf(game), panelFrac), dt);
  const pitch = -Math.max(0, Math.min(0.8, sheetFrac)) / 2;
  game.showcasePitch += (pitch - game.showcasePitch) * Math.min(1, dt * 4);
  placeCamera(game, token);
  swayWeapon(game.player, token, dt);
  updateAmbience(game, token.emitters, dt);
}

/**
 * Dust, sparks and steam give the particle settings something to act on.
 * `random` times the sparks (the reel passes its seeded one); `timeScale`
 * slows the particles as the game's own update does (a reel's Chrono Shift).
 */
export function updateAmbience(game, emitters, dt, random = Math.random, timeScale = 1) {
  const q = game.quality?.particleMultiplier ?? 1;
  const ps = (game.player.particles ??= []);
  emitAmbient(ps, emitters, game.player, q, dt, random);
  game.dustMotes = updateParticles(ps, dt, timeScale, game.dustMotes, game.player, { enableDust: q >= 0.5 });
}

// Emitters within this many tiles of the camera spawn; the rest wait.
const EMIT_RANGE = 12;
const EMITTER_SLOTS = 8;

/**
 * Spark and steam vents on walls beside the loop: at up to EMITTER_SLOTS
 * points along it, the nearest open tile against a wall 1.5–4 tiles away,
 * alternating spark and steam, never two within 3 tiles.
 */
function ambientEmitters(map, path) {
  const grid = map.grid;
  const out = [];
  for (let k = 0; k < EMITTER_SLOTS; k++) {
    const s = samplePath(path, (k + 0.5) / EMITTER_SLOTS);
    let best = null;
    let bestD = Infinity;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = Math.floor(s.x) + dx + 0.5;
        const y = Math.floor(s.y) + dy + 0.5;
        if (!isOpen(grid, x, y)) continue;
        const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([ax, ay]) => !isOpen(grid, x + ax, y + ay));
        const d = Math.hypot(x - s.x, y - s.y);
        if (!wall || d < 1.5 || d >= bestD) continue;
        best = { x: x + wall[0] * 0.4, y: y + wall[1] * 0.4 };
        bestD = d;
      }
    }
    if (best && !out.some((e) => Math.hypot(e.x - best.x, e.y - best.y) < 3)) {
      out.push({ ...best, kind: out.length % 2 ? "steam" : "spark", next: out.length * 0.37 });
    }
  }
  return out;
}

function emitAmbient(ps, emitters, cam, q, dt, random) {
  // Low particle quality turns the ambience off, as it thins combat effects.
  if (q < 0.25 || !emitters) return;
  for (const e of emitters) {
    e.next -= dt;
    if (e.next > 0) continue;
    const near = Math.hypot(e.x - cam.x, e.y - cam.y) < EMIT_RANGE;
    if (e.kind === "spark") {
      e.next = 1.2 + random() * 1.6;
      if (near) spawnWallSparks(ps, e.x, e.y, q);
    } else {
      e.next = 0.18;
      if (near) spawnSmoke(ps, e.x, e.y, { count: Math.max(1, Math.round(2 * q)), r: 200, g: 206, b: 212, speed: 0.1, life: 1.1 });
    }
  }
}

const fovOf = (game) => game.settings?.fov ?? 75;

/**
 * Player updates never run here, so the viewmodel would hang still: give it
 * a slow walking bob and a breathing sway, leaning a little into the turns.
 */
export function swayWeapon(p, token, dt) {
  p.weaponBob = (p.weaponBob || 0) + dt * 5;
  p.weaponSwayX = Math.sin(token.t * 0.9) * 2.5 - Math.max(-4, Math.min(4, token.vel * 6));
  p.weaponSwayY = Math.sin(token.t * 1.7) * 1.5;
}

/** Unload the scene and put every borrowed field back. Safe to call at any time. */
export function stopShowcase(game) {
  const token = game._showcase;
  if (!token) return;
  delete game._showcase;
  if (!token.installed) return;
  token.restore();
  delete game.showcasePitch;
}
