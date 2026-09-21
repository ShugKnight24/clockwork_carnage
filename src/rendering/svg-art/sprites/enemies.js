/**
 * Modern-mode enemy billboards.
 *
 * Each enemy type is a set of pre-rasterised pose bitmaps (idle, move A/B,
 * windup, attack, hurt), an emissive layer drawn with "lighter", and small
 * secondary-motion layers (capes, rotors, spinning clock hands) animated with
 * canvas transforms. Common types have cosmetic variants picked per enemy.
 * Nothing is built per frame: markup is generated once per type on first sight
 * and every layer is rasterised once per size bucket, then blitted.
 *
 * Sprite units: the enemy's 200×200 sprite column, origin at the projection
 * centre, floor line at y = +100 (see kit.js). Callers map one unit to
 * halfH / 100 canvas pixels.
 *
 * Hooks read from the enemy (all optional):
 *   baseColor / darkColor   per-instance palette jitter → hue/brightness filter
 *   id                      stable variant choice (falls back to spawn point)
 *   elite / champion / isElite
 *                           gold glow trim
 *   lastBlockedAt (ms) or blockFlash (> 0)
 *                           armour spark on a blocked hit; without them a hit
 *                           on the shielded front arc of a frontShield type is
 *                           treated as blocked
 *
 * `prepareEnemySprite` returns null until the bitmaps it needs have decoded, so
 * the renderer can fall back to the procedural sprite for that frame.
 */

import { getLayerImage } from "../raster.js";
import { ENEMY_TYPES } from "../../../data/enemies.js";
import { isRealisticArt } from "../../art-style.js";
import {
  baseDefs, BASE_MATERIALS, paletteMaterials, lit, withRealisticBuild, realDefs, REAL_BASE_MATERIALS, realPaletteMaterials,
} from "./kit.js";
import { HUMANOIDS, HUMANOID_DEFS, SOLE } from "./humanoids.js";
import { CREATURES, CREATURE_DEFS } from "./creatures.js";
import { BOSSES } from "./boss.js";

const MAX_BITMAP_PX = 512;
const ATTACK_MS = 240;
const HIT_POSE_MS = 160;
const FLASH_MS = 150;
const SPARK_MS = 220;
const POSES = ["idle", "moveA", "moveB", "windup", "attack", "hurt"];

/* ── Models ─────────────────────────────────────────────────────────────── */

// Modern and Realistic are separate model sets with distinct layer ids, so
// their bitmaps never collide in the raster cache. Realistic models are only
// built the first time an enemy is prepared while Realistic is active.
const models = new Map(); // type -> model | null
const realModels = new Map();

function auraMarkup(box, color, real = false) {
  const [x, y, w, h] = box;
  return (
    `<defs><radialGradient id="aur"><stop offset="0" stop-color="${color}" stop-opacity="${real ? ".26" : ".55"}"/>` +
    `<stop offset=".55" stop-color="${color}" stop-opacity="${real ? ".08" : ".18"}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${x + w / 2}" cy="${y + h * 0.55}" rx="${w * 0.48}" ry="${h * 0.46}" fill="url(#aur)"/>`
  );
}

/** Realistic glow layers keep their emissive shapes but lose the cartoon rings (unfilled circles/ellipses). */
const stripRings = (m) => m && m.replace(/<(?:circle|ellipse)\b[^>]*fill="none"[^>]*\/>/g, "");

function buildBoss(type, real) {
  const m = BOSSES[type](real);
  m.type = type;
  m.key = real ? `${type}:r` : type;
  m.refs = m.parts.map((p, i) => ({ ...p, id: `enemy:${type}:${i}${real ? ":r" : ""}`, box: m.box, defs: m.defs }));
  m.all = m.refs;
  return m;
}

function buildModel(type, real = false) {
  if (real) return withRealisticBuild(() => buildModelIn(type, true));
  return buildModelIn(type, false);
}

function buildModelIn(type, real) {
  if (BOSSES[type]) return buildBoss(type, real);
  const spec = HUMANOIDS[type] || CREATURES[type];
  const def = ENEMY_TYPES[type];
  if (!spec || !def) return null;
  const box = spec.box;
  const extra = HUMANOID_DEFS[type] || CREATURE_DEFS[type] || "";
  const mats = real
    ? REAL_BASE_MATERIALS + realPaletteMaterials("armor", def.color1, def.color2) + extra
    : BASE_MATERIALS + paletteMaterials("armor", def.color1, def.color2) + extra;
  const layerDefs = (b) => (real ? baseDefs(b) + realDefs(b) : baseDefs(b)) + mats;
  const defs = layerDefs(box);
  const sfx = real ? ":r" : "";
  const glowOf = real ? stripRings : (m) => m;
  const refs = new Map();
  const ref = (markup, tag, b = box, d = defs) => {
    if (!markup) return null;
    const key = `${b.join(",")}|${markup}`;
    let r = refs.get(key);
    if (!r) {
      r = { id: `enemy:${type}:${tag}${sfx}`, markup, box: b, defs: d };
      refs.set(key, r);
    }
    return r;
  };
  const variants = [];
  const count = spec.variants || 1;
  for (let v = 0; v < count; v++) {
    const built = spec.build(v);
    const poses = {};
    for (const name of POSES) {
      const p = built.poses[name] || built.poses.idle;
      poses[name] = {
        body: ref(lit(p.body, box, spec.rim), `v${v}:${name}:body`),
        glow: ref(glowOf(p.glow), `v${v}:${name}:glow`),
        at: p.at || {},
      };
    }
    const fx = (built.fx || []).map((l, i) => ({
      ...l,
      ref: ref(l.glow ? glowOf(l.markup) : lit(l.markup, l.box, spec.rim, { ink: 1.6, rimX: 2, rimY: 1.6 }), `v${v}:fx${i}`, l.box, layerDefs(l.box)),
    }));
    variants.push({ poses, fx });
  }
  return {
    type,
    key: type + sfx,
    def,
    boss: false,
    box,
    scale: spec.size || 1,
    anchor: 100,
    pivot: spec.floater ? 0 : SOLE,
    floater: !!spec.floater,
    jitter: !!spec.jitter,
    sideOn: type === "beast",
    shield: spec.shield || null,
    rim: spec.rim,
    variants,
    aura: spec.aura ? ref(auraMarkup(box, spec.aura, real), "aura") : null,
    all: [...refs.values()],
  };
}

function modelFor(type) {
  const real = isRealisticArt();
  const set = real ? realModels : models;
  let m = set.get(type);
  if (m === undefined) {
    m = buildModel(type, real);
    set.set(type, m);
  }
  return m;
}

/**
 * Build (uncached) one enemy's model for the given style. For tests and
 * tooling: exposes the exact layer ids, boxes, defs and markup the game uses.
 */
export const buildEnemyModel = (type, realistic = false) => buildModel(type, realistic);

/* ── Bitmaps ────────────────────────────────────────────────────────────── */

function pixelScale(ctx) {
  const t = ctx.getTransform();
  return Math.hypot(t.a, t.b) || 1;
}

/**
 * Device pixels per model unit for one layer, capped so the layer never
 * exceeds MAX_BITMAP_PX. The cap snaps to the raster's half-octave bucket below
 * it, so raster.js never rounds back up past the limit.
 */
function capScale(box, pxPerUnit) {
  const cap = 2 ** (Math.floor(Math.log2(MAX_BITMAP_PX / Math.max(box[2], box[3])) * 2) / 2);
  return Math.min(pxPerUnit, cap * 0.999);
}

// Rasterising an SVG layer into its canvas is the one expensive step, so cap
// how many happen per frame and keep showing the last bitmap meanwhile. Canvas
// copies are also held in an LRU so variants × sizes cannot grow unbounded.
const COPIES_PER_FRAME = 3;
const LRU_MAX_PX = 16e6;
let copyBudget = COPIES_PER_FRAME;
let budgetTime = -1;
const bitmaps = new Map(); // decoded <img> -> canvas (insertion order = LRU)
const lastBitmap = new Map(); // layer id -> most recent canvas
let lruPx = 0;

function touch(img, c) {
  bitmaps.delete(img);
  bitmaps.set(img, c);
}

function evict() {
  for (const [img, c] of bitmaps) {
    if (lruPx <= LRU_MAX_PX) break;
    bitmaps.delete(img);
    lruPx -= c.width * c.height;
    if (lastBitmap.get(c._layerId) === c) lastBitmap.delete(c._layerId);
  }
}

/** Canvas copy of a decoded layer: blitting an SVG <img> replays its vector picture every draw. */
function layer(ref, pxPerUnit) {
  if (!ref) return null;
  const img = getLayerImage(ref.id, ref.box, ref.defs, ref.markup, capScale(ref.box, pxPerUnit));
  if (!img) return lastBitmap.get(ref.id) || null;
  // The raster cache now bakes decoded layers into canvases itself; use them
  // as they are rather than copying again.
  if (typeof HTMLCanvasElement !== "undefined" && img instanceof HTMLCanvasElement) {
    lastBitmap.set(ref.id, img);
    return img;
  }
  let c = bitmaps.get(img);
  if (c) {
    touch(img, c);
  } else {
    if (copyBudget <= 0) return lastBitmap.get(ref.id) || null;
    copyBudget--;
    c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    c._layerId = ref.id;
    bitmaps.set(img, c);
    lruPx += c.width * c.height;
    evict();
  }
  lastBitmap.set(ref.id, c);
  return c;
}

const warmed = new Set();

function warm(model, pxPerUnit) {
  const key = `${model.key}@${Math.round(Math.log2(Math.max(pxPerUnit, 0.25)) * 2)}`;
  if (warmed.has(key)) return;
  warmed.add(key);
  for (const r of model.all) getLayerImage(r.id, r.box, r.defs, r.markup, capScale(r.box, pxPerUnit));
}

/* ── Tinted copies (hit flash, elite trim, dissolve edge) ───────────────── */

const tints = new WeakMap(); // canvas -> Map(color -> canvas)

/** Solid-colour copy of a layer's silhouette, made once by compositing (no pixel reads). */
function tintOf(src, color = "#ffffff") {
  let byColor = tints.get(src);
  if (!byColor) {
    byColor = new Map();
    tints.set(src, byColor);
  }
  let c = byColor.get(color);
  if (!c) {
    c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext("2d");
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    byColor.set(color, c);
  }
  return c;
}

let spotCanvas = null;
let scratch = null;
let sparkCanvas = null;

function spot() {
  if (!spotCanvas) {
    spotCanvas = document.createElement("canvas");
    spotCanvas.width = spotCanvas.height = 64;
    const g = spotCanvas.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,250,235,.75)");
    grad.addColorStop(1, "rgba(255,240,220,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return spotCanvas;
}

function spark() {
  if (!sparkCanvas) {
    sparkCanvas = document.createElement("canvas");
    sparkCanvas.width = sparkCanvas.height = 96;
    const g = sparkCanvas.getContext("2d");
    g.translate(48, 48);
    g.lineCap = "round";
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.2;
      const len = i % 2 ? 22 : 44;
      g.strokeStyle = i % 2 ? "rgba(255,196,80,.9)" : "rgba(255,244,210,1)";
      g.lineWidth = i % 2 ? 2 : 3;
      g.beginPath();
      g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      g.stroke();
    }
    const core = g.createRadialGradient(0, 0, 0, 0, 0, 18);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(1, "rgba(255,190,80,0)");
    g.fillStyle = core;
    g.fillRect(-18, -18, 36, 36);
  }
  return sparkCanvas;
}

/* ── Per-enemy state ────────────────────────────────────────────────────── */

const motion = new WeakMap();

const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

function hsl(hex) {
  if (!hex || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, l];
  const d = max - min;
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, l];
}

/**
 * Canvas filter reproducing the spawner's per-instance palette jitter
 * (±8° hue, ±6% lightness) relative to the type colour the bitmaps were baked
 * with. Larger offsets are not jitter (e.g. a missing palette) and are ignored.
 */
function jitterFilter(enemy, def) {
  const a = hsl(enemy.baseColor);
  const b = hsl(def.color1);
  if (!a || !b) return null;
  let dh = a[0] - b[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const dl = a[1] - b[1];
  if (Math.abs(dh) > 12 || Math.abs(dl) > 0.1) return null;
  const hue = Math.round(dh);
  const bright = Math.round((1 + dl * 1.6) * 50) / 50;
  if (!hue && bright === 1) return null;
  return `hue-rotate(${hue}deg) brightness(${bright})`;
}

function motionOf(enemy, time, model) {
  let m = motion.get(enemy);
  if (!m) {
    const seed = enemy.id != null ? Number(enemy.id) || String(enemy.id).length * 131 : Math.floor(enemy.x * 97) * 131 + Math.floor(enemy.y * 89) * 17;
    m = {
      x: enemy.x, y: enemy.y, t: time, speed: 0, prev: enemy.state, attackAt: -1e9,
      phase: (enemy.x * 997 + enemy.y * 571) % 1000, flip: false,
      seed, variant: -1, filter: undefined,
      hitSeen: enemy.hitTime || 0, hitAt: -1e9, impact: null, impactPending: false,
      blockAt: -1e9, blockSeen: enemy.lastBlockedAt || 0,
    };
    motion.set(enemy, m);
  }
  if (m.variant < 0 && !model.boss) m.variant = Math.floor(hash(m.seed + 0.5) * model.variants.length) % model.variants.length;
  if (m.filter === undefined) m.filter = model.boss ? null : jitterFilter(enemy, model.def);
  const dt = time - m.t;
  if (dt > 0) {
    const v = Math.hypot(enemy.x - m.x, enemy.y - m.y) / (dt / 1000);
    m.speed += (Math.min(v, 12) - m.speed) * Math.min(1, dt / 120);
    m.x = enemy.x;
    m.y = enemy.y;
    m.t = time;
    // The AI resolves attack and returns to chase within one update, so the
    // strike is inferred from a windup that ended without a hit interrupting it.
    const recentlyHit = enemy.hitTime && time - enemy.hitTime < 300;
    if (m.prev === "windup" && enemy.state !== "windup" && enemy.state !== "pain" && !recentlyHit && !enemy.dissolving) m.attackAt = time;
    m.prev = enemy.state;
  }
  if (enemy.hitTime && enemy.hitTime !== m.hitSeen) {
    m.hitSeen = enemy.hitTime;
    m.hitAt = time;
    m.impactPending = true;
  }
  return m;
}

/** Blocked-hit detection: explicit combat flags first, else the shielded front arc. */
function updateBlock(enemy, m, model, time, camRightX, camRightY, newHit) {
  if (enemy.lastBlockedAt != null) {
    if (enemy.lastBlockedAt !== m.blockSeen) {
      m.blockSeen = enemy.lastBlockedAt;
      m.blockAt = time;
    }
    return;
  }
  if (enemy.blockFlash > 0) {
    if (time - m.blockAt > SPARK_MS) m.blockAt = time;
    return;
  }
  if (!newHit || !model.shield || !enemy.def?.frontShield || camRightX == null) return;
  // Camera forward is the right vector rotated back 90°; the enemy faces the
  // camera when its heading points against it.
  const fx = camRightY;
  const fy = -camRightX;
  if (-(Math.cos(enemy.angle || 0) * fx + Math.sin(enemy.angle || 0) * fy) > 0.5) m.blockAt = time;
}

function pickPose(enemy, m, time, model) {
  if (enemy.dissolving) return "hurt";
  if (enemy.painTimer > 0 || (enemy.hitTime && time - enemy.hitTime < HIT_POSE_MS)) return "hurt";
  if (enemy.state === "windup" || enemy._chargeState === "windup") return "windup";
  if (time - m.attackAt < ATTACK_MS) return "attack";
  if (!model.floater && (m.speed > 0.2 || enemy._chargeState === "sprint")) {
    const stepMs = Math.max(120, Math.min(360, 520 / Math.max(0.5, m.speed)));
    return ["moveA", "idle", "moveB", "idle"][Math.floor((time + m.phase) / stepMs) % 4];
  }
  return "idle";
}

/* ── Frame preparation ──────────────────────────────────────────────────── */

const frame = {
  model: null, enemy: null, m: null, pose: "idle", u: 1, px: 1,
  body: null, glow: null, aura: null, fx: [], fxImg: [], parts: [],
  x0: 0, x1: 0, y0: 0, y1: 0, camRightX: null, camRightY: null,
};

/**
 * Resolve the bitmaps for this enemy this frame. Returns a shared frame object
 * (valid until the next call) with the sprite's extent in canvas pixels
 * relative to (screenX, centerY), or null when the type has no sprite or its
 * bitmaps are still decoding.
 */
export function prepareEnemySprite(ctx, enemy, halfH, time, camRightX = null, camRightY = null) {
  const model = modelFor(enemy.enemyType);
  if (!model) return null;
  if (time !== budgetTime) {
    budgetTime = time;
    copyBudget = COPIES_PER_FRAME;
  }
  const u = halfH / 100;
  const px = pixelScale(ctx) * u * model.scale;
  warm(model, px);
  const m = motionOf(enemy, time, model);
  const newHit = m.hitAt === time;
  updateBlock(enemy, m, model, time, camRightX, camRightY, newHit);
  const pose = pickPose(enemy, m, time, model);
  if (model.boss) {
    frame.parts.length = model.refs.length;
    let solid = false;
    for (let i = 0; i < model.refs.length; i++) {
      frame.parts[i] = layer(model.refs[i], px);
      if (frame.parts[i] && model.refs[i].role === "static") solid = true;
    }
    if (!solid) return null;
  } else {
    const variant = model.variants[m.variant];
    const p = variant.poses[pose];
    frame.body = layer(p.body, px) || layer(variant.poses.idle.body, px) || layer(model.variants[0].poses.idle.body, px);
    if (!frame.body) return null;
    frame.glow = layer(p.glow, px);
    frame.aura = layer(model.aura, px);
    frame.fx = variant.fx;
    frame.at = p.at;
    frame.fxImg.length = variant.fx.length;
    for (let i = 0; i < variant.fx.length; i++) frame.fxImg[i] = layer(variant.fx[i].ref, px);
  }
  const k = model.scale;
  const [bx, by, bw, bh] = model.box;
  const pad = 16;
  frame.model = model;
  frame.enemy = enemy;
  frame.m = m;
  frame.pose = pose;
  frame.u = u;
  frame.camRightX = camRightX;
  frame.camRightY = camRightY;
  frame.x0 = (bx * k - pad) * u;
  frame.x1 = ((bx + bw) * k + pad) * u;
  frame.y0 = ((by - model.anchor) * k + 100 - pad) * u;
  frame.y1 = ((by + bh - model.anchor) * k + 100 + pad) * u;
  return frame;
}

/* ── Drawing ────────────────────────────────────────────────────────────── */

const drawBox = (ctx, img, box) => ctx.drawImage(img, box[0], box[1], box[2], box[3]);

/** Transform for a secondary-motion layer; returns its alpha multiplier. */
function applyFxAnim(ctx, l, time, ph) {
  const a = l.anim;
  if (l.baseRot) ctx.rotate((l.baseRot * Math.PI) / 180);
  if (!a) return 1;
  const t = time + ph + (a.phase || 0);
  switch (a.type) {
    case "sway": {
      const [px, py] = a.pivot || [0, 0];
      ctx.translate(px, py);
      ctx.rotate(Math.sin(t * a.speed) * a.amp);
      ctx.translate(-px, -py);
      return 1;
    }
    case "spin":
      ctx.rotate(t * a.speed);
      return 1;
    case "orbit":
      if (a.tilt) ctx.rotate(a.tilt);
      ctx.scale(1, a.squash ?? 0.3);
      ctx.rotate(t * a.speed);
      return 1;
    case "flutter":
      ctx.scale(Math.cos(t * a.speed), 1);
      return 1;
    case "flicker":
      return 0.35 + 0.65 * hash(Math.floor(t * a.speed));
    case "blink":
      return Math.sin(t * a.speed) > 0.2 ? 1 : 0.15;
    default:
      return 1;
  }
}

function drawFx(ctx, fr, which, alpha, time) {
  const { fx, fxImg, at, m } = fr;
  for (let i = 0; i < fx.length; i++) {
    const l = fx[i];
    const img = fxImg[i];
    if (!img || (which === "back") !== !!l.back || (which === "glow") !== !!l.glow) continue;
    const pos = at[l.anchor];
    ctx.save();
    if (pos) ctx.translate(pos[0], pos[1]);
    const a = applyFxAnim(ctx, l, time, m.phase);
    ctx.globalAlpha = alpha * a;
    drawBox(ctx, img, l.box);
    ctx.restore();
  }
}

/** Crosshair (canvas centre) in the current model space — where the shot landed. */
function impactPoint(ctx, box) {
  const inv = ctx.getTransform().invertSelf();
  const p = inv.transformPoint(new DOMPoint(ctx.canvas.width / 2, ctx.canvas.height / 2));
  const cx = box[0] + box[2] / 2;
  const cy = box[1] + box[3] / 2;
  const clampX = Math.max(box[0] + box[2] * 0.2, Math.min(box[0] + box[2] * 0.8, p.x));
  const clampY = Math.max(box[1] + box[3] * 0.15, Math.min(box[1] + box[3] * 0.85, p.y));
  return Number.isFinite(p.x) ? [clampX, clampY] : [cx, cy];
}

/** White flash with a hot spot on the side the shot landed. */
function drawHitFlash(ctx, body, box, impact, k, alpha) {
  ctx.globalAlpha = alpha * (0.25 + 0.3 * k);
  drawBox(ctx, tintOf(body), box);
  if (!impact) return;
  if (!scratch) scratch = document.createElement("canvas");
  if (scratch.width < body.width || scratch.height < body.height) {
    scratch.width = Math.max(scratch.width, body.width);
    scratch.height = Math.max(scratch.height, body.height);
  }
  const g = scratch.getContext("2d");
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, body.width, body.height);
  const sx = ((impact[0] - box[0]) / box[2]) * body.width;
  const sy = ((impact[1] - box[1]) / box[3]) * body.height;
  const r = body.width * 0.42;
  g.drawImage(spot(), sx - r, sy - r, r * 2, r * 2);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(body, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * k;
  ctx.drawImage(scratch, 0, 0, body.width, body.height, box[0], box[1], box[2], box[3]);
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Death: the figure burns away top-down behind a glowing seam in the type's
 * rim colour, lower slices glitch sideways, and embers lift off the seam.
 */
function drawDissolve(ctx, img, box, dissolve, time, alpha, rim, seed) {
  const p = 1 - dissolve;
  const seamY = box[1] + box[3] * (0.08 + p * 0.95);
  const srcSeam = ((seamY - box[1]) / box[3]) * img.height;
  if (p < 0.2) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * (1 - p / 0.2) * 0.8;
    drawBox(ctx, tintOf(img), box);
    ctx.globalCompositeOperation = "source-over";
  }
  const bands = 5;
  const remaining = img.height - srcSeam;
  if (remaining > 1) {
    const tick = Math.floor(time / 50);
    const sh = remaining / bands;
    const dh = (box[1] + box[3] - seamY) / bands;
    for (let i = 0; i < bands; i++) {
      const off = (hash(i * 13 + tick + seed) - 0.5) * box[2] * 0.12 * p;
      ctx.globalAlpha = alpha * Math.min(1, 1.2 - p * 0.5);
      ctx.drawImage(img, 0, srcSeam + i * sh, img.width, sh, box[0] + off, seamY + i * dh, box[2], dh);
    }
    // Glowing seam: a thin slice of the rim-tinted silhouette.
    const tinted = tintOf(img, rim);
    const seamH = Math.max(2, img.height * 0.035);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * 0.95;
    ctx.drawImage(tinted, 0, srcSeam, img.width, seamH, box[0], seamY - box[3] * 0.01, box[2], (seamH / img.height) * box[3] * 1.6);
    ctx.drawImage(tintOf(img), 0, srcSeam, img.width, seamH * 0.4, box[0], seamY, box[2], (seamH * 0.4 / img.height) * box[3]);
  }
  // Embers rising off the burnt region.
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rim;
  for (let i = 0; i < 16; i++) {
    const r1 = hash(seed + i * 7.3);
    const r2 = hash(seed + i * 3.1 + 11);
    const life = (p * 1.6 + r2 * 0.5) % 1;
    const x = box[0] + box[2] * (0.25 + r1 * 0.5) + Math.sin(time * 0.01 + i) * 3;
    const y = seamY - life * box[3] * 0.5 - r2 * 8;
    const s = 1.5 + r2 * 2.5;
    ctx.globalAlpha = alpha * (1 - life) * Math.min(1, dissolve * 3);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawSpark(ctx, fr, time, alpha) {
  const { model, m } = fr;
  const age = time - m.blockAt;
  if (age < 0 || age > SPARK_MS) return;
  const k = 1 - age / SPARK_MS;
  const [x, y] = model.shield || m.impact || [0, -20];
  const s = 34 * (0.6 + 0.6 * (1 - k));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(hash(m.blockAt) * Math.PI);
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * k;
  ctx.drawImage(spark(), -s / 2, -s / 2, s, s);
  ctx.fillStyle = "#ffd27a";
  for (let i = 0; i < 6; i++) {
    const a = hash(m.blockAt + i) * Math.PI * 2;
    const d = 6 + (1 - k) * 26 * (0.6 + hash(i + m.blockAt) * 0.6);
    ctx.fillRect(Math.cos(a) * d - 1, Math.sin(a) * d + (1 - k) * 8 - 1, 2.2, 2.2);
  }
  ctx.restore();
}

/**
 * Draw a prepared frame. The caller has already clipped to visible columns.
 * @param {number} alpha     fog alpha
 * @param {number} dissolve  1 = intact … 0 = gone
 * @param {number} windupT   0..1 progress through the attack windup (0 if none)
 */
export function drawEnemySprite(ctx, fr, screenX, centerY, alpha, time, hitFlash, dissolve, windupT) {
  const { model, enemy, m, pose, u } = fr;
  const ph = m.phase;
  const k = model.scale;
  const flashK = Math.max(0, 1 - (time - m.hitAt) / FLASH_MS);

  // Canvas-space motion, in sprite units.
  let tx = 0;
  let ty = 0;
  let rotA = 0;
  let sx = 1;
  let sy = 1;
  if (model.floater) {
    ty += Math.sin((time + ph) * 0.004) * 4;
    rotA += Math.sin((time + ph) * 0.0023) * 0.05;
    if (model.jitter) tx += (hash(Math.floor((time + ph) / 90)) - 0.5) * 7;
  } else if (pose === "idle" && m.speed <= 0.2) {
    sy += Math.sin((time + ph) * 0.003) * 0.012;
  }
  if (pose === "windup") {
    const t = windupT;
    tx += Math.sin(time * 0.09) * t * 1.8;
    sy *= 1 - 0.05 * t;
    sx *= 1 + 0.035 * t;
  } else if (pose === "attack") {
    const a = 1 - (time - m.attackAt) / ATTACK_MS;
    sx *= 1 + 0.07 * a;
    sy *= 1 + 0.07 * a;
  } else if (pose === "hurt" && !enemy.dissolving) {
    tx += Math.sin(time * 0.12) * 1.6;
    rotA += model.floater ? 0.1 : 0.02;
  }
  // Knock the sprite away from the side the shot landed on.
  if (flashK > 0 && m.impact && !enemy.dissolving) {
    const side = Math.max(-1, Math.min(1, m.impact[0] / 40));
    tx -= side * 4 * flashK;
    rotA -= side * 0.04 * flashK;
  }
  if (model.sideOn && enemy.angle != null && fr.camRightX != null) {
    const d = Math.cos(enemy.angle) * fr.camRightX + Math.sin(enemy.angle) * fr.camRightY;
    if (d < -0.25) m.flip = true;
    else if (d > 0.25) m.flip = false;
  }

  const pivotY = (model.pivot - model.anchor) * k;
  ctx.save();
  ctx.translate(screenX + tx * u, centerY + (100 + ty) * u);
  ctx.translate(0, pivotY * u);
  if (rotA) ctx.rotate(rotA);
  ctx.scale(sx * (m.flip ? -1 : 1), sy);
  ctx.translate(0, -pivotY * u);
  ctx.scale(u * k, u * k);
  ctx.translate(0, -model.anchor);

  if (m.impactPending) {
    m.impactPending = false;
    m.impact = impactPoint(ctx, model.box);
    if (m.flip) m.impact[0] = -m.impact[0];
  }

  if (model.boss) drawBoss(ctx, fr, alpha, time, dissolve, windupT, flashK);
  else drawRegular(ctx, fr, alpha, time, dissolve, windupT, flashK, hitFlash);
  ctx.restore();
}

function drawRegular(ctx, fr, alpha, time, dissolve, windupT, flashK, hitFlash) {
  const { model, enemy, m } = fr;
  const box = model.box;
  const ph = m.phase;
  if (fr.aura) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * dissolve * (0.75 + 0.25 * Math.sin((time + ph) * 0.003) + 0.4 * windupT);
    drawBox(ctx, fr.aura, box);
    ctx.globalCompositeOperation = "source-over";
  }
  if (dissolve < 1) {
    drawDissolve(ctx, fr.body, box, dissolve, time, alpha, model.rim, m.seed % 997);
    return;
  }
  const elite = enemy.elite || enemy.champion || enemy.isElite;
  if (elite) {
    // Gold trim: a pulsing enlarged silhouette behind the figure.
    const s = 1.05 + 0.015 * Math.sin((time + ph) * 0.006);
    const cy = box[1] + box[3] * 0.55;
    ctx.save();
    ctx.translate(0, cy);
    ctx.scale(s, s);
    ctx.translate(0, -cy);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * (0.55 + 0.25 * Math.sin((time + ph) * 0.006));
    drawBox(ctx, tintOf(fr.body, "#ffc24a"), box);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }
  if (m.filter) ctx.filter = m.filter;
  drawFx(ctx, fr, "back", alpha, time);
  ctx.globalAlpha = alpha;
  drawBox(ctx, fr.body, box);
  drawFx(ctx, fr, "front", alpha, time);
  if (m.filter) ctx.filter = "none";
  ctx.globalCompositeOperation = "lighter";
  if (fr.glow) {
    const pulse = 0.72 + 0.28 * Math.sin((time + ph) * 0.006);
    ctx.globalAlpha = alpha * pulse;
    drawBox(ctx, fr.glow, box);
    if (windupT > 0) {
      ctx.globalAlpha = alpha * windupT;
      drawBox(ctx, fr.glow, box);
    }
  }
  drawFx(ctx, fr, "glow", alpha, time);
  ctx.globalCompositeOperation = "source-over";
  if (flashK > 0 || hitFlash) drawHitFlash(ctx, fr.body, box, m.impact, Math.max(flashK, hitFlash ? 0.6 : 0), alpha);
  drawSpark(ctx, fr, time, alpha);
}

function armAngle(role, pose, time, m, windupT) {
  const s = role === "armL" ? 1 : -1;
  switch (pose) {
    case "windup":
      return s * (0.25 + 0.5 * windupT);
    case "attack":
      return s * -0.26;
    case "hurt":
      return role === "armL" ? 0.26 : -0.1;
    default: {
      const walk = m.speed > 0.2 ? Math.sin((time + m.phase) * 0.008) * 0.12 : 0;
      return s * Math.sin((time + m.phase) * 0.0011) * 0.03 + walk;
    }
  }
}

function drawBoss(ctx, fr, alpha, time, dissolve, windupT, flashK) {
  const { model, m, pose } = fr;
  const box = model.box;
  const imgs = fr.parts;
  const refs = model.refs;
  const t = time + m.phase;

  const place = (ref) => {
    const a = ref.anim;
    if (ref.role === "armL" || ref.role === "armR") {
      const [px, py] = a.pivot;
      ctx.translate(px, py);
      ctx.rotate(armAngle(ref.role, pose, time, m, windupT));
      ctx.translate(-px, -py);
    } else if (ref.role === "anim" && a) {
      const [px, py] = a.pivot || [0, 0];
      if (a.type === "spin") {
        ctx.translate(px, py);
        ctx.rotate((t / 1000) * (a.speed ?? 1) * (1 + windupT * 2));
        ctx.translate(-px, -py);
      } else if (a.type === "sway") {
        ctx.translate(px, py);
        ctx.rotate(Math.sin((t / 1000) * (a.speed ?? 1)) * (a.amp ?? 0.05));
        ctx.translate(-px, -py);
      } else if (a.type === "float") {
        ctx.translate(0, Math.sin((t / 1000) * (a.speed ?? 1)) * (a.amp ?? 2));
      }
    }
  };

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    const img = imgs[i];
    if (!img) continue;
    ctx.save();
    place(ref);
    if (ref.role === "aura") {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * dissolve * (0.6 + 0.25 * Math.sin(t * 0.0026) + 0.3 * windupT);
    } else if (ref.blend) {
      if (dissolve < 1) {
        ctx.restore();
        continue;
      }
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.72 + 0.28 * Math.sin(t * 0.006);
      ctx.globalAlpha = alpha * ref.opacity * (pulse + windupT * 0.8 + (pose === "attack" ? 0.6 : 0));
    } else {
      ctx.globalAlpha = alpha * dissolve;
    }
    drawBox(ctx, img, box);
    // White flash / dissolve flare on solid parts.
    const white = flashK > 0 ? 0.25 + 0.4 * flashK : dissolve < 1 ? Math.min(1, (1 - dissolve) * 2.5) * dissolve * 0.8 : 0;
    if (white > 0.01 && !ref.blend && ref.role !== "aura") {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * white;
      drawBox(ctx, tintOf(img, dissolve < 1 ? model.def?.color1 || "#ffffff" : "#ffffff"), box);
    }
    ctx.restore();
  }
  if (dissolve < 1) {
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "#ff6aa8";
    const p = 1 - dissolve;
    for (let i = 0; i < 24; i++) {
      const r1 = hash(i * 7.3);
      const r2 = hash(i * 3.1 + 11);
      const life = (p * 1.4 + r2 * 0.5) % 1;
      ctx.globalAlpha = alpha * (1 - life);
      ctx.fillRect(box[0] + box[2] * (0.2 + r1 * 0.6), box[1] + box[3] * (0.7 - life * 0.6), 4, 4);
    }
    ctx.globalCompositeOperation = "source-over";
  }
}
