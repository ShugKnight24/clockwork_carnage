/**
 * Modern-mode enemy billboards.
 *
 * Each enemy type is a set of pre-rasterised pose bitmaps (idle, move A/B,
 * windup, attack, hurt) plus an emissive layer drawn with "lighter", chosen per
 * frame from AI state and time. Bob, squash, lean and shake are canvas
 * transforms, so nothing is built per frame: markup is generated once per type
 * on first sight and every layer is decoded once per size bucket.
 *
 * Sprite units: the enemy's 200×200 sprite column, origin at the projection
 * centre, floor line at y = +100 (see kit.js). Callers map one unit to
 * halfH / 100 canvas pixels.
 *
 * `prepareEnemySprite` returns null until the bitmaps it needs have decoded, so
 * the renderer can fall back to the procedural sprite for that frame.
 */

import { getLayerImage } from "../raster.js";
import { ENEMY_TYPES } from "../../../data/enemies.js";
import { baseDefs, BASE_MATERIALS, paletteMaterials, lit } from "./kit.js";
import { HUMANOIDS, HUMANOID_DEFS, SOLE } from "./humanoids.js";
import { CREATURES } from "./creatures.js";
import { BOSSES } from "./boss.js";

const MAX_BITMAP_PX = 512;
const ATTACK_MS = 240;
const HIT_POSE_MS = 160;
const POSES = ["idle", "moveA", "moveB", "windup", "attack", "hurt"];
const BOSS_PARTS = ["aura", "back", "armL", "armR", "front", "glow"];

const models = new Map(); // type -> model | null

function auraMarkup(box, color) {
  const [x, y, w, h] = box;
  const cx = x + w / 2;
  const cy = y + h * 0.55;
  return (
    `<defs><radialGradient id="aur"><stop offset="0" stop-color="${color}" stop-opacity=".55"/>` +
    `<stop offset=".55" stop-color="${color}" stop-opacity=".18"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.48}" ry="${h * 0.46}" fill="url(#aur)"/>`
  );
}

function buildModel(type) {
  const bossFactory = BOSSES[type];
  if (bossFactory) {
    const m = bossFactory();
    m.type = type;
    m.layers = {};
    for (const part of BOSS_PARTS) {
      if (m.parts[part]) m.layers[part] = { id: `enemy:${type}:${part}`, markup: m.parts[part] };
    }
    m.all = Object.values(m.layers);
    return m;
  }
  const spec = HUMANOIDS[type] || CREATURES[type];
  const def = ENEMY_TYPES[type];
  if (!spec || !def) return null;
  const box = spec.box;
  const defs = baseDefs(box) + BASE_MATERIALS + paletteMaterials("armor", def.color1, def.color2) + (HUMANOID_DEFS[type] || "");
  const raw = spec.build();
  const byMarkup = new Map();
  const ref = (markup, tag) => {
    if (!markup) return null;
    let r = byMarkup.get(markup);
    if (!r) {
      r = { id: `enemy:${type}:${tag}`, markup };
      byMarkup.set(markup, r);
    }
    return r;
  };
  const poses = {};
  for (const name of POSES) {
    const p = raw[name] || raw.idle;
    poses[name] = { body: ref(lit(p.body, box, spec.rim), `${name}:body`), glow: ref(p.glow, `${name}:glow`) };
  }
  const aura = spec.aura ? ref(auraMarkup(box, spec.aura), "aura") : null;
  return {
    type,
    boss: false,
    box,
    defs,
    scale: spec.size || 1,
    anchor: 100,
    pivot: spec.floater ? 0 : SOLE,
    floater: !!spec.floater,
    jitter: !!spec.jitter,
    sideOn: type === "beast",
    poses,
    aura,
    all: [...byMarkup.values()],
  };
}

function modelFor(type) {
  let m = models.get(type);
  if (m === undefined) {
    m = buildModel(type);
    models.set(type, m);
  }
  return m;
}

/* ── Bitmap sizing ──────────────────────────────────────────────────────── */

function pixelScale(ctx) {
  const t = ctx.getTransform();
  return Math.hypot(t.a, t.b) || 1;
}

/**
 * Device pixels per model unit, capped so no layer exceeds MAX_BITMAP_PX. The
 * cap snaps to the raster's half-octave bucket below it, so the bucket raster.js
 * picks never rounds back up past the limit.
 */
function layerScale(model, pxPerUnit) {
  const longest = Math.max(model.box[2], model.box[3]);
  const cap = 2 ** (Math.floor(Math.log2(MAX_BITMAP_PX / longest) * 2) / 2);
  return Math.min(pxPerUnit, cap * 0.999);
}

const warmed = new Set();

const bitmaps = new WeakMap();

/**
 * Canvas copy of a decoded layer. Drawing an SVG-backed <img> makes Chrome
 * replay the vector picture on every drawImage, which with dozens of enemies
 * halves the frame rate; a canvas blit is a plain texture copy.
 */
function bitmapOf(img) {
  let c = bitmaps.get(img);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    bitmaps.set(img, c);
  }
  return c;
}

// Rasterising an SVG layer into its canvas is the one expensive step, so cap
// how many happen per frame and keep showing the last bitmap meanwhile.
const COPIES_PER_FRAME = 3;
let copyBudget = COPIES_PER_FRAME;
let budgetTime = -1;
const lastBitmap = new Map(); // layer id -> most recent canvas

function layer(model, ref, scale) {
  if (!ref) return null;
  const img = getLayerImage(ref.id, model.box, model.defs, ref.markup, scale);
  if (!img) return lastBitmap.get(ref.id) || null;
  let c = bitmaps.get(img);
  if (!c) {
    if (copyBudget <= 0) return lastBitmap.get(ref.id) || null;
    copyBudget--;
    c = bitmapOf(img);
  }
  lastBitmap.set(ref.id, c);
  return c;
}

function warm(model, scale) {
  const key = `${model.type}@${Math.round(Math.log2(Math.max(scale, 0.25)) * 2)}`;
  if (warmed.has(key)) return;
  warmed.add(key);
  for (const ref of model.all) getLayerImage(ref.id, model.box, model.defs, ref.markup, scale);
}

/* ── Per-enemy animation state ──────────────────────────────────────────── */

const motion = new WeakMap();

function motionOf(enemy, time) {
  let m = motion.get(enemy);
  if (!m) {
    m = { x: enemy.x, y: enemy.y, t: time, speed: 0, prev: enemy.state, attackAt: -1e9, phase: (enemy.x * 997 + enemy.y * 571) % 1000, flip: false };
    motion.set(enemy, m);
    return m;
  }
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
    if (m.prev === "windup" && enemy.state !== "windup" && !recentlyHit && !enemy.dissolving) m.attackAt = time;
    m.prev = enemy.state;
  }
  return m;
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

/* ── Hit-flash silhouettes ──────────────────────────────────────────────── */

const silhouettes = new WeakMap();

/** White copy of a layer bitmap, made once by compositing (no pixel reads). */
function silhouetteOf(img) {
  let c = silhouettes.get(img);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    silhouettes.set(img, c);
  }
  return c;
}

/* ── Frame preparation and drawing ──────────────────────────────────────── */

const frame = {
  model: null, enemy: null, m: null, pose: "idle", u: 1,
  body: null, glow: null, aura: null, parts: {},
  x0: 0, x1: 0, y0: 0, y1: 0,
};

const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
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
  const scale = layerScale(model, pixelScale(ctx) * u * model.scale);
  warm(model, scale);
  const m = motionOf(enemy, time);
  const pose = pickPose(enemy, m, time, model);
  frame.parts = frame.parts || {};
  if (model.boss) {
    for (const part of BOSS_PARTS) frame.parts[part] = layer(model, model.layers[part], scale);
    if (!frame.parts.front) return null;
    frame.body = frame.parts.front;
  } else {
    const p = model.poses[pose];
    frame.body = layer(model, p.body, scale) || layer(model, model.poses.idle.body, scale);
    if (!frame.body) return null;
    frame.glow = layer(model, p.glow, scale);
    frame.aura = layer(model, model.aura, scale);
  }
  const k = model.scale;
  const [bx, by, bw, bh] = model.box;
  const pad = 12;
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

function drawLayerImage(ctx, img, box) {
  ctx.drawImage(img, box[0], box[1], box[2], box[3]);
}

/** Horizontal glitch slices that tear apart and fade as the enemy dissolves. */
function drawDissolving(ctx, img, box, dissolve, time, baseAlpha) {
  const bands = 7;
  const tear = (1 - dissolve) * box[2] * 0.22;
  const tick = Math.floor(time / 45);
  const sh = img.height / bands;
  const dh = box[3] / bands;
  ctx.globalAlpha = baseAlpha * dissolve;
  for (let i = 0; i < bands; i++) {
    const off = (hash(i * 13 + tick) - 0.5) * 2 * tear;
    ctx.drawImage(img, 0, i * sh, img.width, sh, box[0] + off, box[1] + i * dh, box[2], dh);
  }
  // A white flare through the middle of the dissolve.
  const flare = Math.min(1, (1 - dissolve) * 2.5) * dissolve;
  if (flare > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = baseAlpha * flare * 0.8;
    drawLayerImage(ctx, silhouetteOf(img), box);
    ctx.globalCompositeOperation = "source-over";
  }
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
    sy += Math.sin((time + ph) * 0.003) * 0.01;
  }
  if (pose === "windup") {
    const t = windupT;
    tx += Math.sin(time * 0.09) * t * 1.6;
    sy *= 1 - 0.04 * t;
    sx *= 1 + 0.03 * t;
  } else if (pose === "attack") {
    const a = 1 - (time - m.attackAt) / ATTACK_MS;
    sx *= 1 + 0.06 * a;
    sy *= 1 + 0.06 * a;
  } else if (pose === "hurt" && !enemy.dissolving) {
    tx += Math.sin(time * 0.12) * 2.2;
    rotA += model.floater ? 0.12 : 0.025;
  }
  if (model.sideOn && enemy.angle != null && fr.camRightX != null) {
    const d = Math.cos(enemy.angle) * fr.camRightX + Math.sin(enemy.angle) * fr.camRightY;
    if (d < -0.25) m.flip = true;
    else if (d > 0.25) m.flip = false;
  }

  const pivotY = (model.pivot - model.anchor) * k; // sprite units above the floor line
  ctx.save();
  ctx.translate(screenX + tx * u, centerY + (100 + ty) * u);
  ctx.translate(0, pivotY * u);
  if (rotA) ctx.rotate(rotA);
  ctx.scale(sx * (m.flip ? -1 : 1), sy);
  ctx.translate(0, -pivotY * u);
  ctx.scale(u * k, u * k);
  ctx.translate(0, -model.anchor);

  const box = model.box;
  const pulse = 0.72 + 0.28 * Math.sin((time + ph) * 0.006);

  if (model.boss) {
    drawBoss(ctx, fr, alpha, time, hitFlash, dissolve, windupT, pulse);
  } else {
    if (fr.aura) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * dissolve * (0.75 + 0.25 * Math.sin((time + ph) * 0.003));
      drawLayerImage(ctx, fr.aura, box);
      ctx.globalCompositeOperation = "source-over";
    }
    if (dissolve < 1) {
      drawDissolving(ctx, fr.body, box, dissolve, time, alpha);
    } else {
      ctx.globalAlpha = alpha;
      drawLayerImage(ctx, fr.body, box);
      if (fr.glow) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * pulse;
        drawLayerImage(ctx, fr.glow, box);
        if (windupT > 0) {
          ctx.globalAlpha = alpha * windupT * 0.9;
          drawLayerImage(ctx, fr.glow, box);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      if (hitFlash) {
        ctx.globalAlpha = alpha * 0.75;
        drawLayerImage(ctx, silhouetteOf(fr.body), box);
      }
    }
  }
  ctx.restore();
}

function armAngles(pose, time, m, windupT) {
  switch (pose) {
    case "windup":
      return [0.2 + 0.45 * windupT, -0.2 - 0.45 * windupT];
    case "attack":
      return [-0.22, 0.22];
    case "hurt":
      return [0.24, -0.1];
    default: {
      const walk = m.speed > 0.2 ? Math.sin((time + m.phase) * 0.008) * 0.12 : 0;
      const idle = Math.sin((time + m.phase) * 0.0011) * 0.03;
      return [idle + walk, -idle + walk];
    }
  }
}

function drawBoss(ctx, fr, alpha, time, hitFlash, dissolve, windupT, pulse) {
  const { model, m, pose } = fr;
  const box = model.box;
  const P = fr.parts;
  const [aL, aR] = armAngles(pose, time, m, windupT);
  const drawArm = (img, key, a) => {
    const pv = model.pivots[key];
    if (!img || !pv) return;
    ctx.save();
    ctx.translate(pv[0], pv[1]);
    ctx.rotate(a);
    ctx.translate(-pv[0], -pv[1]);
    drawLayerImage(ctx, img, box);
    ctx.restore();
  };
  const solid = (src) => {
    if (src.back) drawLayerImage(ctx, src.back, box);
    drawArm(src.armL, "armL", aL);
    drawArm(src.armR, "armR", aR);
    drawLayerImage(ctx, src.front, box);
  };

  if (P.aura) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * dissolve * (0.6 + 0.25 * Math.sin((time + m.phase) * 0.0026) + 0.3 * windupT);
    drawLayerImage(ctx, P.aura, box);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.globalAlpha = alpha * dissolve;
  solid(P);
  if (P.glow && dissolve >= 1) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * (pulse + windupT * 0.8 + (pose === "attack" ? 0.6 : 0));
    drawLayerImage(ctx, P.glow, box);
    ctx.globalCompositeOperation = "source-over";
  }
  const white = hitFlash ? 0.7 : dissolve < 1 ? Math.min(1, (1 - dissolve) * 2.5) * dissolve * 0.8 : 0;
  if (white > 0.01) {
    const sil = {
      back: P.back && silhouetteOf(P.back),
      armL: P.armL && silhouetteOf(P.armL),
      armR: P.armR && silhouetteOf(P.armR),
      front: silhouetteOf(P.front),
    };
    if (dissolve < 1) ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * white;
    solid(sil);
    ctx.globalCompositeOperation = "source-over";
  }
}
