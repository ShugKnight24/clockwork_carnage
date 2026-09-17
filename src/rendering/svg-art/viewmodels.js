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

import { getLayerImage, scaleBucket } from "./raster.js";
import { createScene } from "./viewmodel/geom.js";
import { createHandArt, HAND_DEFS } from "./viewmodel/hands.js";
import { WEAPON_MODELS } from "./viewmodel/weapons.js";

const DEFS =
  `<filter id="vmBloom" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.3"/></filter>` +
  `<linearGradient id="vmDepth" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#02040a" stop-opacity=".4"/><stop offset=".55" stop-color="#02040a" stop-opacity=".08"/>` +
  `<stop offset="1" stop-color="#02040a" stop-opacity="0"/></linearGradient>` +
  HAND_DEFS;

// Weapon bloom goes under the gloves so a hand covering an emitter hides it;
// sleeve trim bloom goes on top.
const LAYERS = ["body", "glow", "handL", "handR", "handGlow"];
// Viewmodel units are 4 px at 720p with the origin at screen centre; clip
// sleeves that run past the screen edge (plus bob/kick margin).
const UNIT = 4;
const LIMIT = { x0: -180, x1: 180, y0: -100, y1: 106 };
const MAX_SIDE_PX = 1100;

const built = new Map(); // `${id}|${accent}|${pose}` -> viewmodel

function build(id, accent, pose) {
  const key = `${id}|${accent}|${pose}`;
  let vm = built.get(key);
  if (vm) return vm;
  const model = WEAPON_MODELS[id];
  if (!model) return null;
  const sc = createScene(model.cams[pose], accent);
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
  vm = { layers, muzzle: sc.P(info.muzzle), eject: sc.P(info.eject), pivot: sc.P(info.pivot), muzzleK: sc.k(info.muzzle) };
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

const request = (vm, px) => vm.layers.map((L) => getLayerImage(L.id, L.box, DEFS, L.markup, layerScale(px, L.box)));

let warmQueue = null;
/** Decode the other weapons one per frame so switching never shows procedural art. */
function warmStep(accent, px) {
  if (!warmQueue) warmQueue = Object.keys(WEAPON_MODELS).flatMap((id) => [[+id, "hip"], [+id, "ads"]]);
  const next = warmQueue.shift();
  if (!next) return;
  const vm = build(next[0], accent, next[1]);
  if (vm) request(vm, px);
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

/**
 * Draw the modern viewmodel with its own pose (same animation inputs as the
 * procedural one).
 * @returns {boolean} false while bitmaps decode or without a DOM (caller draws procedural art)
 */
export function drawViewmodel(ctx, w, h, o) {
  // Headless/mock contexts (unit tests, no DOM) keep the procedural model.
  if (typeof Image === "undefined" || typeof ctx.getTransform !== "function") return false;
  const { wep, energyColor: accent, isAiming, isSprinting, isDashing, weaponBob, weaponKick, weaponAnimFrame: frame, time, lastFireTime, drawGlow } = o;
  const pose = isAiming ? "ads" : "hip";
  const vm = build(wep.id, accent, pose);
  if (!vm) return false;

  const vf = h / 720;
  const m = ctx.getTransform();
  const px = Math.hypot(m.a, m.b) * UNIT * vf || UNIT;
  const imgs = request(vm, px);
  // Keep the other pose of this weapon decoded so toggling ADS never falls back.
  request(build(wep.id, accent, isAiming ? "hip" : "ads"), px);
  warmStep(accent, px);
  if (imgs.some((img) => !img)) return false;

  // Same bob / sway / kick inputs as the procedural pose, in 720p pixels.
  const ads = isAiming ? 1 : 0;
  const lerp = (a, b, t) => a + (b - a) * t;
  const bobMulX = isAiming ? 2 : isDashing ? 18 : isSprinting ? 14 : 8;
  const bobMulY = isAiming ? 1.5 : isDashing ? 12 : isSprinting ? 10 : 5;
  const swayK = lerp(1, 0.22, ads);
  const cx = w / 2 + Math.sin(weaponBob) * bobMulX * vf + (o.weaponSwayX || 0) * swayK * vf;
  // Classic HUD: the hip pose lifts clear of the 160px console like the procedural
  // viewmodel; at ADS the sight follows the reticle, which centres in the view above it.
  const hudOffset = o.hudStyle === 1 ? (ads ? 80 : 160) * vf : 0;
  const cy = h / 2 - hudOffset + Math.abs(Math.cos(weaponBob)) * bobMulY * vf + (o.weaponSwayY || 0) * swayK * vf +
    weaponKick * 40 * lerp(1, 0.45, ads) * vf;
  const tilt = (isSprinting ? Math.sin(weaponBob) * 0.06 : 0) + (o.weaponSwayX || 0) * -0.0022 * lerp(1, 0.2, ads);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(UNIT * vf, UNIT * vf);
  const [pvx, pvy] = vm.pivot;
  if (!ads) {
    ctx.fillStyle = contactShadow(ctx);
    ctx.save();
    ctx.translate(pvx, pvy + 30);
    ctx.scale(1.4, 1);
    ctx.fillRect(-80, -80, 160, 160);
    ctx.restore();
  }
  // Tilt and recoil pivot on the grip, not the screen centre.
  const recoil = frame === 2 ? -0.03 : frame === 3 ? -0.01 : 0;
  // Recoil rise is halved at ADS so the body never climbs over the reticle.
  const rise = (frame === 2 ? -3 : frame === 3 ? -1 : 0) * lerp(1, 0.5, ads);
  ctx.translate(pvx, pvy + rise);
  if (tilt + recoil) ctx.rotate(tilt + recoil);
  ctx.translate(-pvx, -pvy);

  const [mx, my] = vm.muzzle;
  // Down the sights the muzzle sits on the reticle; a full-size flash would
  // blind the player to what they just shot at.
  const fk = Math.min(1, Math.max(0.45, vm.muzzleK * 4)) * lerp(1, 0.4, ads);
  // Muzzle flash sits behind the barrel so the crown occludes its base.
  if (frame === 1) {
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
  vm.layers.forEach((L, i) => {
    const [bx, by, bw, bh] = L.box;
    if (L.bloom) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = L.name === "glow" ? Math.min(1, pulse + fired * 0.6) : 0.8;
      ctx.drawImage(imgs[i], bx, by, bw, bh);
      ctx.restore();
    } else {
      ctx.drawImage(imgs[i], bx, by, bw, bh);
    }
  });

  // Spent casing flicks out of the ejection port.
  if (frame === 2 && wep.id !== 2) {
    const [ex, ey] = vm.eject;
    ctx.fillStyle = "#ddaa44";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(ex + 4, ey - 5, 3, 2);
    ctx.globalAlpha = 1;
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
    ctx.globalAlpha = 0.18 * (1 - since / 500);
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

/** Tooling: the built layers (id, box, markup) and shared defs for a weapon pose. */
export function viewmodelLayers(id, accent, pose = "hip") {
  const vm = build(id, accent, pose);
  return vm && { defs: DEFS, layers: vm.layers, muzzle: vm.muzzle };
}
