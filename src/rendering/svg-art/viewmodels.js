/**
 * Modern first-person viewmodels: rasterised SVG weapon + gloved hands.
 *
 * Every weapon is flattened (per character accent colour) twice — a hip view
 * with the barrel aimed at the reticle from the lower right, and an ADS view
 * on the sight line — into five layers: body, weapon bloom, support glove,
 * firing glove, sleeve-trim bloom. Each layer has its own tight box so the
 * bitmaps stay small. Markup is built lazily per weapon/accent/pose and never
 * per frame; per frame this module only applies the same bob, sway, kick,
 * tilt and recoil inputs as the procedural viewmodel and blits bitmaps plus
 * the procedural muzzle flash.
 */

import { getLayerImage, layerBaked, scaleBucket } from "./raster.js";
import { createScene } from "./viewmodel/geom.js";
import { createHandArt, HAND_DEFS } from "./viewmodel/hands.js";
import { WEAPON_MODELS, MATERIALS } from "./viewmodel/weapons.js";
import { activeFinish, finishKey } from "../../data/weapon-skins.js";
import { smoothDamp } from "../../systems/aim.js";
import { isRealisticArt } from "../art-style.js";

const DEFS =
  `<filter id="vmBloom" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.3"/></filter>` +
  `<linearGradient id="vmDepth" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#02040a" stop-opacity=".4"/><stop offset=".55" stop-color="#02040a" stop-opacity=".08"/>` +
  `<stop offset="1" stop-color="#02040a" stop-opacity="0"/></linearGradient>` +
  HAND_DEFS +
  SKIN_PATTERN_DEFS();

// Weapon bloom goes under the gloves so a hand covering an emitter hides it;
// sleeve trim bloom goes on top.
const LAYERS = ["body", "glow", "handL", "handR", "handGlow"];
// Viewmodel units are 4 px at 720p with the origin at screen centre; clip
// sleeves past the screen edge plus bob/kick and reticle-follow margin.
const UNIT = 4;
const LIMIT = { x0: -240, x1: 240, y0: -100, y1: 170 };
const MAX_SIDE_PX = 1100;

const built = new Map(); // `${id}|${accent}|${pose}|${tier}|${style}|${finish}` -> viewmodel

/**
 * Overlay patterns for weapon finishes, in viewmodel units, as tone only
 * (black and white at low alpha) so they sit on any finish's colours.
 */
function SKIN_PATTERN_DEFS() {
  const P = (id, w, h, body, extra = "") =>
    `<pattern id="skp-${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}"${extra}>${body}</pattern>`;
  return (
    P("carbon", 3, 3,
      `<rect width="1.5" height="1.5" fill="#fff" opacity=".08"/><rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#fff" opacity=".08"/>` +
      `<rect x="1.5" width="1.5" height="1.5" fill="#000" opacity=".2"/><rect y="1.5" width="1.5" height="1.5" fill="#000" opacity=".2"/>`) +
    P("hex", 6, 10.392,
      `<path d="M3,0 L6,1.732 L6,5.196 L3,6.928 L0,5.196 L0,1.732 Z M0,8.66 L3,10.392 M6,8.66 L3,10.392 M3,6.928 L3,10.392" fill="none" stroke="#fff" stroke-width=".35" opacity=".2"/>`) +
    P("camo", 26, 26,
      `<path d="M0,4 L9,1 L14,7 L8,12 L2,10 Z M15,14 L24,11 L26,19 L18,24 L13,20 Z M3,17 L9,15 L11,22 L5,25 Z" fill="#000" opacity=".28"/>` +
      `<path d="M16,2 L22,3 L20,8 L15,7 Z M8,19 L12,18 L11,21 Z" fill="#fff" opacity=".1"/>`) +
    P("stripes", 8, 8, `<rect width="2.6" height="8" fill="#000" opacity=".3"/>`, ` patternTransform="rotate(-32)"`) +
    P("digital", 8, 8,
      `<g fill="#000" opacity=".26"><rect x="0" y="0" width="2" height="2"/><rect x="2" y="0" width="2" height="2"/><rect x="4" y="4" width="2" height="2"/><rect x="6" y="6" width="2" height="2"/><rect x="2" y="6" width="2" height="2"/></g>` +
      `<g fill="#fff" opacity=".1"><rect x="6" y="0" width="2" height="2"/><rect x="0" y="4" width="2" height="2"/><rect x="4" y="2" width="2" height="2"/></g>`)
  );
}

const sceneSkins = new Map(); // finish key -> scene skin
/** A weapon finish as the scene applies it: material ramps by role, and its pattern. */
function sceneSkin(finish) {
  if (!finish) return null;
  const key = finishKey(finish);
  let s = sceneSkins.get(key);
  if (!s) {
    const remap = new Map();
    for (const m of MATERIALS.metal) remap.set(m, finish.primary);
    for (const m of MATERIALS.trim) remap.set(m, finish.secondary);
    for (const m of MATERIALS.grip) remap.set(m, finish.grip);
    s = { remap, pattern: finish.pattern ? `skp-${finish.pattern}` : null };
    sceneSkins.set(key, s);
  }
  return s;
}

/**
 * The viewmodel for weapon `id` in `pose`, wearing `finish` (by default the
 * one the player chose for that weapon; src/data/weapon-skins.js).
 */
function build(id, accent, pose, tier = "hi", real = false, finish = activeFinish(id)) {
  const key = `${id}|${accent}|${pose}|${tier}|${real ? "r" : "m"}|${finishKey(finish)}`;
  let vm = built.get(key);
  if (vm) return vm;
  const model = WEAPON_MODELS[id];
  if (!model) return null;
  const sc = createScene(model.cams[pose], finish?.energy ?? accent, { real, skin: sceneSkin(finish) });
  sc.detailPx = tier === "lo" ? 2 : 4;
  const info = model.build(sc, createHandArt(sc), pose);
  const layers = [];
  for (const name of LAYERS) {
    const L = sc.layers[name];
    if (!L || !L.svg) continue;
    const x0 = Math.floor(Math.max(LIMIT.x0, L.min[0] - 1.5));
    const y0 = Math.floor(Math.max(LIMIT.y0, L.min[1] - 1.5));
    const x1 = Math.ceil(Math.min(LIMIT.x1, L.max[0] + 1.5));
    const y1 = Math.ceil(Math.min(LIMIT.y1, L.max[1] + 1.5));
    if (x1 - x0 < 1 || y1 - y0 < 1) continue; // entirely off screen
    layers.push({ name, id: `vm:${key}:${name}`, box: [x0, y0, x1 - x0, y1 - y0], markup: L.svg, bloom: name === "glow" || name === "handGlow" });
  }
  vm = { layers, muzzle: sc.P(info.muzzle), eject: sc.P(info.eject), pivot: sc.P(info.pivot), sight: sc.P(info.sight), muzzleK: sc.k(info.muzzle), gripK: sc.k(info.pivot), sleeves: sc.sleeveEnds || [] };
  built.set(key, vm);
  return vm;
}

/** Device pixels per unit, snapped to a bucket and capped so no layer bitmap grows past ~1024px. */
function layerScale(px, box) {
  let k = scaleBucket(px);
  const side = Math.max(box[2], box[3]);
  while (k * side > MAX_SIDE_PX && k > 0.5) k /= Math.SQRT2;
  return k * 0.999;
}

const request = (vm, px, prefetch = false) => vm.layers.map((L) => getLayerImage(L.id, L.box, DEFS, L.markup, layerScale(px, L.box), prefetch));

let warmQueue = null;
let warmReal = false;
/**
 * Decode the other weapons one per frame so switching never shows procedural
 * art. Queued, as any prefetch: on an art style change they used to decode
 * at once, a weapon a frame, each frame 50-80 ms.
 */
function warmStep(accent, px, tier, real) {
  if (!warmQueue || warmReal !== real) {
    warmQueue = Object.keys(WEAPON_MODELS).flatMap((id) => [[+id, "hip"], [+id, "ads"]]);
    warmReal = real;
  }
  const next = warmQueue[0];
  if (!next) return;
  const vm = build(next[0], accent, next[1], tier, real);
  // Stay on a weapon until every layer is baked, not just decoded: the bake
  // is the costly part (the GPU rasterises the SVG), and left to the first
  // frame a weapon was drawn it made switching to it a 60-110 ms hitch.
  let baked = true;
  for (const L of vm?.layers ?? []) {
    const scale = layerScale(px, L.box);
    getLayerImage(L.id, L.box, DEFS, L.markup, scale, true);
    if (!layerBaked(L.id, scale)) baked = false;
  }
  if (baked) warmQueue.shift();
}

/**
 * Decode and bake weapon `id`'s hip and ADS art as drawViewmodel would draw
 * it on a canvas `h` px tall through `ctx`, in the Realistic or Modern set
 * (`real`) whichever is showing: a reel warms the set a shot flips to before
 * the flip. Queued like any prefetch; call once a frame until it returns true.
 * `max` caps how many layers are decoding at once, to spread the work.
 */
export function prefetchViewmodel(ctx, h, id, accent, real, max = Infinity) {
  if (typeof Image === "undefined" || typeof ctx?.getTransform !== "function") return true;
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b) * UNIT * (h / 720) || UNIT;
  const tier = px >= 3 ? "hi" : "lo";
  let busy = 0;
  for (const pose of ["hip", "ads"]) {
    const vm = build(id, accent, pose, tier, real);
    for (const L of vm?.layers ?? []) {
      if (busy >= max) return false;
      const scale = layerScale(px, L.box);
      getLayerImage(L.id, L.box, DEFS, L.markup, scale, true);
      if (!layerBaked(L.id, scale)) busy++;
    }
  }
  return busy === 0;
}

// Contact shadow gradient lives in unit space, so one per context serves every frame.
const shadows = new WeakMap();
function contactShadow(ctx) {
  let g = shadows.get(ctx);
  if (!g) {
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
    g.addColorStop(0, "rgba(0,0,0,0.34)");
    g.addColorStop(0.6, "rgba(0,0,0,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    shadows.set(ctx, g);
  }
  return g;
}

// Screen-space rig smoothing shared across frames: sway and reticle follow.
const rig = { t: 0, sx: 0, sy: 0, ox: 0, oy: 0, vsx: 0, vsy: 0, vox: 0, voy: 0 };
// The hip pose sits this many units below its authored framing to clear the reticle.
const HIP_DROP = 12;
// Blend at which the hip rig has swung onto the ADS anchors; the rest cross-fades art.
const MORPH_END = 0.55;
/**
 * The aimed pose drawn smaller, about its sight (the pose's origin sits on
 * the reticle, so the sight stays put): full size, the gun and gloves filled
 * the middle of the screen below the aim point and hid what you shot at.
 */
const ADS_SCALE = 0.68;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Swing the hip art toward the ADS pose, applied by fraction s: the grip
 * travels to the ADS grip, the art shrinks by the real depth ratio of the two
 * cameras, and the barrel turns part of the way toward its ADS direction
 * (a full turn would spin the foreshortened hip art unnaturally). Returns a
 * point mapper and applies the same transform to ctx when given.
 */
function morph(hip, aim, s, ctx) {
  const [ax, ay] = hip.pivot;
  const [bx, by] = aim.pivot;
  const dirA = Math.atan2(hip.muzzle[1] - ay, hip.muzzle[0] - ax);
  const dirB = Math.atan2(aim.muzzle[1] - by, aim.muzzle[0] - bx);
  let rot = dirB - dirA;
  rot = Math.atan2(Math.sin(rot), Math.cos(rot)) * 0.6 * s;
  const sc = Math.pow(aim.gripK / hip.gripK, s);
  const tx = ax + (bx - ax) * s;
  const ty = ay + (by - ay) * s;
  const cos = Math.cos(rot) * sc;
  const sin = Math.sin(rot) * sc;
  if (ctx && s > 0) {
    ctx.translate(tx, ty);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.translate(-ax, -ay);
  }
  return ([x, y]) => [tx + (x - ax) * cos - (y - ay) * sin, ty + (x - ax) * sin + (y - ay) * cos];
}

/**
 * While the hip art swings and shrinks toward the ADS pose its sleeves can end
 * above the screen edge; continue each sleeve past its baked end so the hands
 * never float. Cheap: two quads, only during the transition.
 */
function sleeveExtensions(ctx, vm, alpha, real) {
  if (!vm.sleeves.length) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = real ? "#0d0e0c" : "#0a1018";
  ctx.strokeStyle = real ? "#050605" : "#04060b";
  ctx.lineWidth = real ? 0.3 : 0.6;
  for (const { ea, eb, dir, half } of vm.sleeves) {
    const L = 170;
    const fa = [ea[0] + dir[0] * L - half[0] * 0.5, ea[1] + dir[1] * L - half[1] * 0.5];
    const fb = [eb[0] + dir[0] * L + half[0] * 0.5, eb[1] + dir[1] * L + half[1] * 0.5];
    // Overlap the baked end slightly so no seam shows.
    const oa = [ea[0] - dir[0] * 2, ea[1] - dir[1] * 2];
    const ob = [eb[0] - dir[0] * 2, eb[1] - dir[1] * 2];
    ctx.beginPath();
    ctx.moveTo(oa[0], oa[1]);
    ctx.lineTo(fa[0], fa[1]);
    ctx.lineTo(fb[0], fb[1]);
    ctx.lineTo(ob[0], ob[1]);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ea[0], ea[1]);
    ctx.lineTo(fa[0], fa[1]);
    ctx.moveTo(eb[0], eb[1]);
    ctx.lineTo(fb[0], fb[1]);
    ctx.stroke();
  }
  ctx.restore();
}

// Which layers a pass paints: everything, only the lit solids, or only the emissive bloom.
const ALL = 0;
const SOLID = 1;
const BLOOM = 2;

function drawLayers(ctx, vm, imgs, alpha, glowAlpha, pass = ALL) {
  vm.layers.forEach((L, i) => {
    if ((pass === SOLID && L.bloom) || (pass === BLOOM && !L.bloom)) return;
    const [bx, by, bw, bh] = L.box;
    ctx.save();
    if (L.bloom) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (L.name === "glow" ? glowAlpha : 0.8);
    } else {
      ctx.globalAlpha = alpha;
    }
    // Stencil passes keep the caller's composite mode.
    ctx.drawImage(imgs[i], bx, by, bw, bh);
    ctx.restore();
  });
}

// Per-frame arguments for paintRig, reused so the lit passes can replay the
// rig on the light stencil without allocating.
const rigArgs = { hip: null, aim: null, hipImgs: null, aimImgs: null, s: 0, u: 0, base: 1, glowA: 1, real: false };

/** Paint both poses of the rig (hip swinging toward ADS, then the ADS art) into ctx. */
function paintRig(c, pass) {
  const { hip, aim, hipImgs, aimImgs, s, u, base, glowA, real } = rigArgs;
  if (u < 1) {
    c.save();
    morph(hip, aim, s, c);
    if (s > 0 && pass !== BLOOM) sleeveExtensions(c, hip, base * (1 - u), real);
    drawLayers(c, hip, hipImgs, base * (1 - u), glowA, pass);
    c.restore();
  }
  if (u > 0) drawLayers(c, aim, aimImgs, base * Math.min(1, u * 1.4), glowA, pass);
}

/**
 * ctx.filter that puts the viewmodel in the world's light: brightness from the
 * light level at the player (renderer.lightAt) with a warm cast from coloured
 * light, plus the weapon's own muzzle flash for one frame. A filter touches
 * only the pixels being drawn. The first version replayed the rig onto a
 * frame-sized stencil and multiplied it back, 2-4 full-screen passes over the
 * DPR-scaled HUD canvas every frame, and cost Modern ~5 ms of GPU time.
 */
const vmFilters = new Map();
function viewmodelFilter(light, flash) {
  const lum = 0.2126 * light.r + 0.7152 * light.g + 0.0722 * light.b;
  const bright = Math.max(0.55, Math.min(1.6, 0.35 + lum * 0.75 + flash * 0.55));
  const warm = Math.max(0, Math.min(1, (light.r - light.b) * 1.5 + flash * 0.8));
  const qb = Math.round(bright * 20);
  const qw = Math.round(warm * 5);
  const key = (qb << 3) | qw;
  let f = vmFilters.get(key);
  if (!f) {
    f = qw ? `brightness(${qb / 20}) sepia(${(qw / 5) * 0.3})` : `brightness(${qb / 20})`;
    vmFilters.set(key, f);
  }
  return f;
}

// Unit-radius gradients, one per context (the flash is drawn scaled around the muzzle).
const flashGrads = new WeakMap();
function flashGrad(c) {
  let g = flashGrads.get(c);
  if (!g) {
    const fire = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    fire.addColorStop(0, "rgba(255,250,235,1)");
    fire.addColorStop(0.16, "rgba(255,236,170,0.98)");
    fire.addColorStop(0.42, "rgba(255,168,64,0.8)");
    fire.addColorStop(0.75, "rgba(214,86,24,0.35)");
    fire.addColorStop(1, "rgba(150,40,10,0)");
    const core = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(0.45, "rgba(255,246,214,0.95)");
    core.addColorStop(1, "rgba(255,210,120,0)");
    const haze = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    haze.addColorStop(0, "rgba(255,190,110,0.5)");
    haze.addColorStop(0.35, "rgba(255,140,60,0.18)");
    haze.addColorStop(1, "rgba(255,120,40,0)");
    g = { fire, core, haze };
    flashGrads.set(c, g);
  }
  return g;
}

/**
 * Realistic muzzle flash for a single frame: a small white-hot core, an
 * irregular ring of flame petals (random count, length and twist every shot)
 * and a faint warm haze. Additive, in viewmodel units around (x, y).
 */
function realisticFlash(ctx, x, y, fk, alpha) {
  const g = flashGrad(ctx);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  // Haze.
  ctx.save();
  ctx.scale(36 * fk, 30 * fk);
  ctx.fillStyle = g.haze;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  // Petals: leaf shapes of uneven length radiating from the crown.
  const R = 20 * fk;
  const n = 4 + ((Math.random() * 3) | 0);
  const spin = Math.random() * Math.PI * 2;
  ctx.save();
  ctx.scale(R, R);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = spin + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const len = 0.42 + Math.random() * 0.58;
    const wid = (0.2 + Math.random() * 0.14) * (0.55 + len * 0.45);
    const bend = (Math.random() - 0.5) * 0.6;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tx = ca * len;
    const ty = sa * len;
    const mx = ca * len * 0.5;
    const my = sa * len * 0.5;
    ctx.moveTo(ca * 0.06, sa * 0.06);
    ctx.quadraticCurveTo(mx - sa * wid + ca * bend * wid, my + ca * wid + sa * bend * wid, tx, ty);
    ctx.quadraticCurveTo(mx + sa * wid + ca * bend * wid, my - ca * wid + sa * bend * wid, ca * 0.06, sa * 0.06);
  }
  ctx.fillStyle = g.fire;
  ctx.fill();
  ctx.restore();
  // White-hot core, slightly squashed.
  ctx.save();
  ctx.rotate(spin);
  ctx.scale(11 * fk, 9 * fk);
  ctx.fillStyle = g.core;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  ctx.restore();
}

/**
 * Draw the modern viewmodel with its own pose, driven by the same bob / sway /
 * kick / recoil inputs as the procedural one plus the eased aim blend.
 * Hip → ADS is one continuous motion: the hip rig swings toward the ADS grip,
 * shrinking and turning up, then cross-fades to the ADS art over the last 45%.
 *
 * @param {number} alpha   viewmodel visibility (fades out off-gameplay screens)
 * @param {number} blend   aim-down-sights blend, 0 hip … 1 aimed
 * @returns {boolean} false while bitmaps decode or without a DOM (caller draws procedural art)
 */
export function drawViewmodel(ctx, w, h, o, alpha = 1, blend = o.isAiming ? 1 : 0) {
  // Headless/mock contexts (unit tests, no DOM) keep the procedural model.
  if (typeof Image === "undefined" || typeof ctx.getTransform !== "function") return false;
  const { wep, energyColor: accent, isSprinting, isDashing, weaponBob, weaponKick, weaponAnimFrame: frame, time, lastFireTime, drawGlow } = o;
  const vf = h / 720;
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b) * UNIT * vf || UNIT;
  // Detail tier: small renders (phones, low render scale) get a simplified glove.
  const tier = px >= 3 ? "hi" : "lo";
  const real = isRealisticArt();
  const hip = build(wep.id, accent, "hip", tier, real);
  const aim = build(wep.id, accent, "ads", tier, real);
  if (!hip || !aim) return false;
  // Both poses stay decoded so the blend never has to fall back mid-motion.
  const hipImgs = request(hip, px);
  const aimImgs = request(aim, px);
  warmStep(accent, px, tier, real);
  const b = clamp01(blend);
  const s = smoothstep(clamp01(b / MORPH_END));
  const u = smoothstep(clamp01((b - MORPH_END) / (1 - MORPH_END)));
  if ((u < 1 && hipImgs.some((img) => !img)) || (u > 0 && aimImgs.some((img) => !img))) return false;

  // Critically damped follow on sway and reticle offset: absorbs uneven
  // per-frame mouse deltas without overshoot; tighter when aimed so the sight
  // stays on the reticle.
  // Game time: the same clock (and dt) that drives the aim blend and FOV, so
  // the rig never beats against them; it also holds still while paused.
  const now = time || 0;
  const dt = rig.t && now > rig.t ? Math.min(0.05, (now - rig.t) / 1000) : 0;
  rig.t = now;
  const followTime = lerp(0.09, 0.045, b);
  [rig.sx, rig.vsx] = smoothDamp(rig.sx, o.weaponSwayX || 0, rig.vsx, 0.07, dt);
  [rig.sy, rig.vsy] = smoothDamp(rig.sy, o.weaponSwayY || 0, rig.vsy, 0.07, dt);
  [rig.ox, rig.vox] = smoothDamp(rig.ox, o.aimOffsetX || 0, rig.vox, followTime, dt);
  [rig.oy, rig.voy] = smoothDamp(rig.oy, o.aimOffsetY || 0, rig.voy, followTime, dt);

  // Pose: hip sits low right; aimed, the sight tracks the (offset) reticle.
  const bobMulX = lerp(isDashing ? 18 : isSprinting ? 14 : 8, 2, b);
  const bobMulY = lerp(isDashing ? 12 : isSprinting ? 10 : 5, 1.5, b);
  const swayK = lerp(1, 0.22, b);
  const classic = o.hudStyle === 1;
  const viewH = h - (classic ? 160 * ((o.hudScale || 100) / 100) * vf : 0);
  const hipCy = h / 2 - (classic ? 160 * vf : 0) + (WEAPON_MODELS[wep.id].hipDrop ?? HIP_DROP) * UNIT * vf;
  const follow = lerp(0.85, 1, b);
  const breath = (time || 0) * 0.001;
  const calm = 1 - 0.85 * b;
  // Crouching drops the weapon and tucks it toward the chest. It fades out as
  // the sights come up, or a crouched ADS shot would no longer meet the reticle.
  const crouch = (o.crouchBlend || 0) * (1 - b);
  const cx = w / 2 + Math.sin(weaponBob) * bobMulX * vf + rig.sx * swayK * vf + rig.ox * w * follow +
    Math.sin(breath * 1.1) * 1.6 * vf * calm - crouch * 11 * vf;
  const cy = lerp(hipCy, viewH / 2, b) + Math.abs(Math.cos(weaponBob)) * bobMulY * vf + rig.sy * swayK * vf +
    weaponKick * 40 * lerp(1, 0.45, b) * vf + rig.oy * viewH * follow + Math.sin(breath * 1.7) * 2.2 * vf * calm +
    crouch * 26 * vf;
  const tilt = (isSprinting ? Math.sin(weaponBob) * 0.06 * (1 - b) : 0) + rig.sx * -0.0022 * lerp(1, 0.2, b) +
    rig.ox * 0.5 * (1 - b) + Math.sin(breath * 0.9) * 0.006 * calm + crouch * 0.05;

  const map = morph(hip, aim, s);
  const dom = u < 0.5 ? hip : aim;
  const place = (p) => (dom === hip ? map(p) : p);
  const [mx, my] = place(dom.muzzle);
  const [pvx, pvy] = map(hip.pivot); // lands on the ADS grip once the swing completes

  // Debug/perf tooling: record the rig pose when a trace array is installed.
  const trace = globalThis.__ccViewmodelTrace;
  if (trace) {
    const [ax, ay] = map(hip.pivot); // continuous through the swap: lands on the ADS grip
    const ks = UNIT * vf * lerp(1, ADS_SCALE, u);
    trace.push({ t: now, x: cx, y: cy, tilt, blend: b, pose: dom === hip ? "hip" : "ads", mx: cx + ax * ks, my: cy + ay * ks });
  }

  ctx.save();
  ctx.globalAlpha *= alpha;
  const base = ctx.globalAlpha;
  ctx.translate(cx, cy);
  const k = UNIT * vf * lerp(1, ADS_SCALE, u);
  ctx.scale(k, k);
  if (b < 1) {
    ctx.globalAlpha = base * (1 - b);
    ctx.fillStyle = contactShadow(ctx);
    ctx.save();
    ctx.translate(pvx, pvy + 30);
    ctx.scale(1.4, 1);
    ctx.fillRect(-80, -80, 160, 160);
    ctx.restore();
    ctx.globalAlpha = base;
  }
  // Tilt and recoil pivot on the grip, not the screen centre; the rise halves when aimed.
  const recoil = frame === 2 ? -0.03 : frame === 3 ? -0.01 : 0;
  const rise = (frame === 2 ? -3 : frame === 3 ? -1 : 0) * lerp(1, 0.5, b);
  ctx.translate(pvx, pvy + rise);
  if (tilt + recoil) ctx.rotate(tilt + recoil);
  ctx.translate(-pvx, -pvy);

  const fk = Math.min(1, Math.max(0.45, dom.muzzleK * 4));
  // Muzzle flash sits behind the barrel so the crown occludes its base.
  if (frame === 1 && real) {
    realisticFlash(ctx, mx, my - 2, fk, base);
  } else if (frame === 1) {
    drawGlow(ctx, mx, my - 2, 32 * fk, accent, 0.4);
    drawGlow(ctx, mx, my - 2, 12 * fk, "#ffffff", 0.8);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2 * fk;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.05;
      const len = (15 + Math.random() * 20) * fk;
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(a) * 8 * fk, my - 2 + Math.sin(a) * 8 * fk);
      ctx.lineTo(mx + Math.cos(a) * len, my - 2 + Math.sin(a) * len);
      ctx.stroke();
    }
  }

  const since = time - (lastFireTime || 0);
  const pulse = 0.62 + 0.38 * Math.sin(time * 0.008);
  const fired = lastFireTime && since >= 0 && since < 220 ? 1 - since / 220 : 0;
  const glowA = Math.min(1, pulse + fired * 0.6);
  rigArgs.hip = hip;
  rigArgs.aim = aim;
  rigArgs.hipImgs = hipImgs;
  rigArgs.aimImgs = aimImgs;
  rigArgs.s = s;
  rigArgs.u = u;
  rigArgs.base = base;
  rigArgs.glowA = glowA;
  rigArgs.real = real;
  // Realistic: the viewmodel sits in the world's light at the player (and
  // catches its own muzzle flash). Emissive bloom goes on after, unlit.
  const light = real ? o.light ?? null : null;
  if (light) {
    ctx.filter = viewmodelFilter(light, frame === 1 ? fk : 0);
    paintRig(ctx, SOLID);
    ctx.filter = "none";
    paintRig(ctx, BLOOM);
  } else {
    paintRig(ctx, ALL);
  }

  // Spent casing flicks out of the ejection port.
  if (frame === 2 && wep.id !== 2) {
    const [ex, ey] = place(dom.eject);
    ctx.fillStyle = "#ddaa44";
    ctx.globalAlpha = base * 0.85;
    ctx.fillRect(ex + 4, ey - 5, 3, 2);
    ctx.globalAlpha = base;
  }
  if (frame === 3) {
    ctx.fillStyle = "rgba(180,180,180,0.15)";
    ctx.beginPath();
    ctx.arc(mx + 1, my - 4, 5 * fk, 0, Math.PI * 2);
    ctx.fill();
  }
  // Barrel heat shimmer after firing.
  if (lastFireTime && since >= 0 && since < 500) {
    ctx.save();
    ctx.globalAlpha = base * 0.18 * (1 - since / 500);
    ctx.strokeStyle = "rgba(255,200,150,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -10; i <= 10; i++) {
      const sy = my - 8 + Math.sin(i * 0.8 + time * 0.03) * 1.8;
      if (i === -10) ctx.moveTo(mx + i * fk, sy);
      else ctx.lineTo(mx + i * fk, sy);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  return true;
}

// Side profiles: millimetres to icon units; a pistol (~200 mm) comes out ~140 wide.
const PROFILE_SCALE = 0.7;
const profiles = new Map(); // `${id}|${accent}` -> profile

/**
 * A weapon's side profile from the same model the viewmodel is built from —
 * left flank, muzzle right, orthographic, no hands — so a HUD icon is the gun
 * in hand rather than separate art. The gloves paint into a scene of their
 * own that is thrown away: the builders interleave hand and weapon calls, and
 * the weapon's layers stay clean. Returns { defs, body, glow, box [x, y, w, h] }
 * in icon units, or null for an unknown id.
 */
export function weaponProfile(id, accent, finish = activeFinish(id)) {
  const key = `${id}|${accent}|${finishKey(finish)}`;
  let p = profiles.get(key);
  if (p !== undefined) return p;
  const model = WEAPON_MODELS[id];
  p = null;
  if (model) {
    const cam = { side: true, scale: PROFILE_SCALE };
    const sc = createScene(cam, accent, { skin: sceneSkin(finish) });
    sc.detailPx = 4;
    const hands = createScene(cam, accent);
    hands.detailPx = 4;
    model.build(sc, createHandArt(hands), "hip");
    const body = sc.layers.body;
    const glow = sc.layers.glow;
    const x0 = Math.min(body.min[0], glow?.min[0] ?? Infinity);
    const y0 = Math.min(body.min[1], glow?.min[1] ?? Infinity);
    const x1 = Math.max(body.max[0], glow?.max[0] ?? -Infinity);
    const y1 = Math.max(body.max[1], glow?.max[1] ?? -Infinity);
    p = { defs: DEFS, body: body.svg, glow: glow?.svg ?? "", box: [x0, y0, x1 - x0, y1 - y0] };
  }
  profiles.set(key, p);
  return p;
}

/** Tooling: the built layers (id, box, markup) and shared defs for a weapon pose. */
export function viewmodelLayers(id, accent, pose = "hip", tier = "hi", real = false) {
  const vm = build(id, accent, pose, tier, real);
  return vm && { defs: DEFS, layers: vm.layers, muzzle: vm.muzzle };
}
