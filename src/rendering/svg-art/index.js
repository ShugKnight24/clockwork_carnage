/**
 * SVG model registry for cutscenes and flipbook panels.
 *
 * A model is layered SVG in art units. Characters share the coordinate space of
 * drawCutsceneArt (origin = art anchor, ~chest height; feet near y=+60), so a
 * model's viewBox maps 1:1 onto the canvas transform already in place.
 * Backgrounds use a 1600×900 viewBox and are cover-fitted to the target rect.
 *
 * Layer animation is applied on the canvas per frame, so the SVG only has to be
 * rasterised once per size:
 *   breathe { amp, speed, pivot }   vertical scale about pivot
 *   sway    { amp, speed, pivot }   rotation (radians) about pivot
 *   float   { amp, speed }          vertical bob (art units)
 *   drift   { amp, speed }          horizontal bob (art units)
 *   pulse   { min, max, speed }     opacity oscillation
 *   flicker { min, max, speed }     irregular opacity (lights, holograms)
 *   spin    { speed, pivot }        continuous rotation (radians/s)
 * Every anim also takes `phase` (seconds offset).
 */

import { getLayerImage } from "./raster.js";
import { isModernArt } from "../art-style.js";
import { MODELS as HERO } from "./models/hero.js";
import { MODELS as CAST } from "./models/cast.js";
import { MODELS as VILLAIN } from "./models/villain.js";
import { MODELS as SCENE_ART, BACKGROUNDS as SCENE_BGS } from "./models/scenes.js";
import { BACKGROUNDS as BACKDROPS } from "./models/backdrops.js";

const MODELS = { ...HERO, ...CAST, ...VILLAIN, ...SCENE_ART };
const BACKGROUNDS = { ...SCENE_BGS, ...BACKDROPS };

// Vector models hold detail at any size, so human-scale figures are framed
// larger than the procedural art they replace. Villains already fill the frame.
const DISPLAY_SCALE = {
  hero: 1.3,
  hero_armed: 1.3,
  hero_human: 1.3,
  hero_at_desk: 1.3,
  hero_fallen: 1.3,
  lyra: 1.3,
  aria: 1.3,
  party: 1.5,
  portrait_voss: 1.35,
  portrait_miri: 1.35,
  portrait_kai: 1.35,
  portrait_supervisor: 1.35,
  station: 1.3,
  fragment_blue: 1.2,
  fragment_green: 1.2,
  fragment_amber: 1.2,
  armor_crate: 1.25,
  voss_recording: 1.25,
  unknown_recording: 1.25,
  redacted_file: 1.25,
};

export const hasSvgArt = (key) => key in MODELS;
export const hasSvgBg = (key) => key in BACKGROUNDS;

function pixelScale(ctx) {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

function applyAnim(ctx, anim, t) {
  const time = t + (anim.phase || 0);
  const sp = anim.speed ?? 1;
  const [px, py] = anim.pivot || [0, 0];
  switch (anim.type) {
    case "breathe": {
      const s = 1 + Math.sin(time * sp) * (anim.amp ?? 0.01);
      ctx.translate(px, py);
      ctx.scale(1, s);
      ctx.translate(-px, -py);
      return 1;
    }
    case "sway":
      ctx.translate(px, py);
      ctx.rotate(Math.sin(time * sp) * (anim.amp ?? 0.03));
      ctx.translate(-px, -py);
      return 1;
    case "spin":
      ctx.translate(px, py);
      ctx.rotate(time * sp);
      ctx.translate(-px, -py);
      return 1;
    case "float":
      ctx.translate(0, Math.sin(time * sp) * (anim.amp ?? 2));
      return 1;
    case "drift":
      ctx.translate(Math.sin(time * sp) * (anim.amp ?? 4), 0);
      return 1;
    case "pulse": {
      const k = 0.5 + 0.5 * Math.sin(time * sp);
      return (anim.min ?? 0.5) + ((anim.max ?? 1) - (anim.min ?? 0.5)) * k;
    }
    case "flicker": {
      const n = Math.sin(time * sp * 7.3) * Math.sin(time * sp * 3.1 + 1.7);
      const k = n > 0.85 ? 0 : 0.5 + 0.5 * Math.sin(time * sp);
      return (anim.min ?? 0.6) + ((anim.max ?? 1) - (anim.min ?? 0.6)) * k;
    }
    default:
      return 1;
  }
}

/**
 * Draw every layer of a model into its box. Returns false if no layer has a
 * decoded bitmap yet, so the caller can fall back to procedural art.
 */
function drawLayers(ctx, id, model, t, dx, dy, dw, dh, unitScale) {
  const [bx, by, bw, bh] = model.box;
  const scale = pixelScale(ctx) * unitScale;
  const images = model.layers.map((layer, i) =>
    getLayerImage(`${id}:${i}`, model.box, model.defs || "", layer.markup, scale),
  );
  if (!images[0]) return false;

  ctx.save();
  // Map the model box onto the destination rect; everything below is art units.
  ctx.translate(dx, dy);
  ctx.scale(dw / bw, dh / bh);
  ctx.translate(-bx, -by);
  const groupAlpha = ctx.globalAlpha * (model.anim ? applyAnim(ctx, model.anim, t) : 1);
  model.layers.forEach((layer, i) => {
    const img = images[i];
    if (!img) return;
    ctx.save();
    const a = layer.anim ? applyAnim(ctx, layer.anim, t) : 1;
    ctx.globalAlpha = groupAlpha * a * (layer.opacity ?? 1);
    if (layer.blend) ctx.globalCompositeOperation = layer.blend;
    ctx.drawImage(img, bx, by, bw, bh);
    ctx.restore();
  });
  ctx.restore();
  return true;
}

/**
 * Draw an art model in the current drawCutsceneArt transform (art units).
 * Adds the standard entrance: 1.2s fade with a 0.9→1 scale settle.
 * @returns {boolean} true if drawn
 */
export function drawSvgArt(ctx, key, t) {
  const model = MODELS[key];
  if (!model || !isModernArt()) return false;
  const [bx, by, bw, bh] = model.box;
  ctx.save();
  const display = DISPLAY_SCALE[key] ?? 1;
  if (model.intro !== false) {
    const fadeIn = Math.min(1, t / 1.2);
    const s = (0.9 + fadeIn * 0.1) * display;
    ctx.scale(s, s);
    ctx.globalAlpha *= fadeIn;
  } else if (display !== 1) {
    ctx.scale(display, display);
  }
  const drawn = drawLayers(ctx, `art:${key}`, model, t, bx, by, bw, bh, 1);
  ctx.restore();
  return drawn;
}

/**
 * Draw a cast model into an arbitrary rect, contain-fitted and bottom-anchored.
 * Used by the HUD to stand ARIA in the world rather than in a portrait tile.
 * @returns {boolean} true if drawn
 */
export function drawSvgModelAt(ctx, key, x, y, w, h, t) {
  const model = MODELS[key];
  if (!model || !isModernArt()) return false;
  const [, , bw, bh] = model.box;
  const k = Math.min(w / bw, h / bh);
  const dw = bw * k;
  const dh = bh * k;
  return drawLayers(ctx, `art:${key}`, model, t, x + (w - dw) / 2, y + (h - dh), dw, dh, k);
}

/**
 * Draw a background model cover-fitted to (0, 0, w, h).
 * @returns {boolean} true if drawn
 */
export function drawSvgBg(ctx, w, h, key, t) {
  const model = BACKGROUNDS[key];
  if (!model || !isModernArt()) return false;
  const [, , bw, bh] = model.box;
  const k = Math.max(w / bw, h / bh);
  const dw = bw * k;
  const dh = bh * k;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  const drawn = drawLayers(ctx, `bg:${key}`, model, t, (w - dw) / 2, (h - dh) / 2, dw, dh, k);
  ctx.restore();
  return drawn;
}

/** Start decoding the bitmaps a script will need so the first frame is not procedural. */
export function warmSvgArt(artKeys, bgKeys, ctx, w, h) {
  if (!isModernArt()) return;
  const base = pixelScale(ctx) * 2 * (h / 900);
  for (const key of artKeys) {
    const m = MODELS[key];
    const k = base * (DISPLAY_SCALE[key] ?? 1);
    if (m) m.layers.forEach((l, i) => getLayerImage(`art:${key}:${i}`, m.box, m.defs || "", l.markup, k));
  }
  for (const key of bgKeys) {
    const m = BACKGROUNDS[key];
    if (!m) continue;
    const k = pixelScale(ctx) * Math.max(w / m.box[2], h / m.box[3]);
    m.layers.forEach((l, i) => getLayerImage(`bg:${key}:${i}`, m.box, m.defs || "", l.markup, k));
  }
}
