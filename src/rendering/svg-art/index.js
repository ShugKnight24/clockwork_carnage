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
import { isModernArt, isRealisticArt } from "../art-style.js";
import { buildCastModel, CAST_KEYS } from "./agent-rig.js";
import { lookKey, cloneLook } from "../../core/character-fields.js";
import { MODELS as HERO } from "./models/hero.js";
import { MODELS as CAST, partyModel } from "./models/cast.js";
import { MODELS as VILLAIN } from "./models/villain.js";
import { MODELS as SCENE_ART, BACKGROUNDS as SCENE_BGS } from "./models/scenes.js";
import { MODELS as HOUND } from "./models/hound.js";
import { BACKGROUNDS as BACKDROPS } from "./models/backdrops.js";
import { partyMembers } from "../party.js";

const MODELS = { ...HERO, ...CAST, ...VILLAIN, ...SCENE_ART, ...HOUND };
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
  kael: 1.3,
  nova: 1.3,
  rook: 1.3,
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

const displayScale = (key) => DISPLAY_SCALE[partyMembers(key) ? "party" : key] ?? 1;

// ---------------------------------------------------------------------------
// Cast: the armoured agent dressed as the player built it
// ---------------------------------------------------------------------------

const DRESSED = new Set(CAST_KEYS);
const castHashOf = (ch) => lookKey(ch);
let castRef = null; // the live record (game.character)
let castLook = null; // snapshot the models are built from
let castHash = "";
// key -> { id, model }, built on first draw; one map per style (Comic, Modern)
const castEntries = [new Map(), new Map()];
const stockEntries = new Map(); // key -> { id, model }

/**
 * Dress the cutscene agent (CAST_KEYS) from a saved character. Cheap: models
 * are rebuilt lazily on their next draw, once per character and art style,
 * and their layer ids carry a hash of the look so stale bitmaps are never
 * reused. Pass null to go back to the stock hero.
 * @param {object|null} character game.character-shaped record
 */
export function setCastCharacter(character) {
  castRef = character || null;
  const hash = castRef ? castHashOf(castRef) : "";
  if (hash === castHash && (castLook !== null) === (castRef !== null)) return;
  castHash = hash;
  castLook = castRef ? cloneLook(castRef) : null;
  castEntries[0].clear();
  castEntries[1].clear();
  // Build the current style's models while the browser is idle, so the first
  // cutscene frame only blits. A later change supersedes this one.
  if (castLook && typeof requestIdleCallback === "function") {
    const hash = castHash;
    requestIdleCallback(() => {
      if (hash !== castHash) return;
      for (const key of CAST_KEYS) modelEntry(key);
    });
  }
}

/** Pick up in-place edits of the live record (once per cutscene, not per frame). */
function refreshCast() {
  if (castRef && castHashOf(castRef) !== castHash) setCastCharacter(castRef);
}

function modelEntry(key) {
  if (castLook && DRESSED.has(key)) {
    const real = isRealisticArt();
    const entries = castEntries[real ? 1 : 0];
    let e = entries.get(key);
    if (!e) {
      e = { id: `art:${key}@${castHash}${real ? "~r" : ""}`, model: buildCastModel(castLook, key, { realistic: real }) };
      entries.set(key, e);
    }
    return e;
  }
  let e = stockEntries.get(key);
  if (!e) {
    // A lineup of fewer than everyone ("party:lyra+you") is its own model,
    // and its own bitmaps: the key is in the layer id.
    const members = key in MODELS ? null : partyMembers(key);
    const model = members ? partyModel(members) : MODELS[key];
    if (!model) return null;
    e = { id: `art:${key}`, model };
    stockEntries.set(key, e);
  }
  return e;
}

/** A key names a model: a registered one, or a party lineup. */
const isModel = (key) => key in MODELS || partyMembers(key) !== null;

export const hasSvgArt = isModel;
export const hasSvgBg = (key) => key in BACKGROUNDS;

/**
 * Device pixels per art unit: the larger axis, so a squash on one axis (the
 * flipbook's page turn shrinks x toward 0) keeps the bitmap size instead of
 * stepping down through a new size bucket — a fresh downscale or SVG decode
 * — every few frames of every turn.
 */
function pixelScale(ctx) {
  const m = ctx.getTransform();
  return Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)) || 1;
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
 * Each layer's bitmap box: its content's bounds (plus room for blur), not the
 * model's whole box. Background layers are mostly one glow, beam or spinning
 * part on an otherwise empty full-frame layer, and each was rasterised and
 * blended at full frame — ~8 full-screen blits a frame in the flipbook, two
 * pages' worth during a turn. Transparent pixels add nothing under these
 * blends (source-over, lighter, screen), so drawing only the content's box
 * looks the same. Measured once per layer through the SVG DOM.
 */
const SVG_NS = "http://www.w3.org/2000/svg";
const TRIM_PAD = 48; // art units: the widest blur (σ 8) reaches ~24 past the geometry
const _trim = new Map(); // layer id -> [x, y, w, h]
function layerBox(lid, model, layer) {
  let box = _trim.get(lid);
  if (box) return box;
  box = model.box;
  if (typeof document !== "undefined" && document.body) {
    const svg = document.createElementNS(SVG_NS, "svg");
    try {
      const [bx, by, bw, bh] = model.box;
      svg.setAttribute("viewBox", `${bx} ${by} ${bw} ${bh}`);
      svg.setAttribute("width", "1");
      svg.setAttribute("height", "1");
      svg.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden";
      svg.innerHTML = `<defs>${model.defs || ""}</defs><g>${layer.markup}</g>`;
      document.body.appendChild(svg);
      const r = svg.lastElementChild.getBBox();
      if (r.width > 0 && r.height > 0) {
        const x0 = Math.max(bx, r.x - TRIM_PAD);
        const y0 = Math.max(by, r.y - TRIM_PAD);
        const x1 = Math.min(bx + bw, r.x + r.width + TRIM_PAD);
        const y1 = Math.min(by + bh, r.y + r.height + TRIM_PAD);
        // Not worth a box of its own when it already fills most of the frame.
        if ((x1 - x0) * (y1 - y0) < bw * bh * 0.8) box = [x0, y0, x1 - x0, y1 - y0];
      }
    } catch (_) {
      // Unmeasurable markup keeps the full box.
    }
    svg.remove();
  }
  _trim.set(lid, box);
  return box;
}

/**
 * Draw every layer of a model into its box. Returns false if no layer has a
 * decoded bitmap yet, so the caller can fall back to procedural art.
 * `trim` draws each layer from its content's box (layerBox).
 */
function drawLayers(ctx, id, model, t, dx, dy, dw, dh, unitScale, trim = false) {
  const [bx, by, bw, bh] = model.box;
  const scale = pixelScale(ctx) * unitScale;
  const boxes = model.layers.map((layer, i) => (trim ? layerBox(`${id}:${i}`, model, layer) : model.box));
  const images = model.layers.map((layer, i) =>
    getLayerImage(`${id}:${i}`, boxes[i], model.defs || "", layer.markup, scale),
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
    const [lx, ly, lw, lh] = boxes[i];
    ctx.drawImage(img, lx, ly, lw, lh);
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
const lastDrawn = new Map(); // art key -> the entry it last drew with

// Cutscene and comic art draws in every style, Legacy included: Legacy's
// procedural set never had most of the cast or backdrops (the Supervisor, the
// locker room), so its pages and scenes came up empty. In-world sprites, the
// viewmodel and the HUD keep their own Legacy drawing.
export function drawSvgArt(ctx, key, t) {
  if (!isModel(key)) return false;
  const entry = modelEntry(key);
  if (drawEntry(ctx, key, entry, t)) {
    lastDrawn.set(key, entry);
    return true;
  }
  // Still decoding (a new look, a new style): keep showing the last bitmap
  // this key drew. Comic and Modern never show the procedural Legacy figure,
  // which read as a different character flashing in before the real one;
  // Legacy, on a slow machine, shows its own figure until the bitmaps land.
  const prev = lastDrawn.get(key);
  if (prev && prev !== entry) drawEntry(ctx, key, prev, t);
  else if (!isModernArt()) return false;
  return true;
}

function drawEntry(ctx, key, { id, model }, t) {
  const [bx, by, bw, bh] = model.box;
  ctx.save();
  const display = displayScale(key);
  if (model.intro !== false) {
    const fadeIn = Math.min(1, t / 1.2);
    const s = (0.9 + fadeIn * 0.1) * display;
    ctx.scale(s, s);
    ctx.globalAlpha *= fadeIn;
  } else if (display !== 1) {
    ctx.scale(display, display);
  }
  const drawn = drawLayers(ctx, id, model, t, bx, by, bw, bh, 1);
  ctx.restore();
  return drawn;
}

/**
 * Draw a cast model into an arbitrary rect, contain-fitted and bottom-anchored.
 * Used by the HUD to stand ARIA in the world rather than in a portrait tile.
 * @returns {boolean} true if drawn
 */
export function drawSvgModelAt(ctx, key, x, y, w, h, t) {
  if (!isModernArt() || !isModel(key)) return false;
  const { id, model } = modelEntry(key);
  const [, , bw, bh] = model.box;
  const k = Math.min(w / bw, h / bh);
  const dw = bw * k;
  const dh = bh * k;
  return drawLayers(ctx, id, model, t, x + (w - dw) / 2, y + (h - dh), dw, dh, k);
}

/**
 * Draw a background model cover-fitted to (0, 0, w, h).
 * @returns {boolean} true if drawn
 */
export function drawSvgBg(ctx, w, h, key, t) {
  const model = BACKGROUNDS[key];
  if (!model) return false;
  const [, , bw, bh] = model.box;
  const k = Math.max(w / bw, h / bh);
  const dw = bw * k;
  const dh = bh * k;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  const drawn = drawLayers(ctx, `bg:${key}`, model, t, (w - dw) / 2, (h - dh) / 2, dw, dh, k, true);
  ctx.restore();
  return drawn;
}

/**
 * Queue the bitmaps a script will need. Queued, not started: a script's whole
 * cast and every backdrop (~90 layers for the intro flipbook) decoded at once
 * held the main thread for ~600 ms as it opened. Whatever the first frame
 * draws jumps the queue, so it still is not procedural.
 */
export function warmSvgArt(artKeys, bgKeys, ctx, w, h) {
  refreshCast();
  const base = pixelScale(ctx) * 2 * (h / 900);
  for (const key of artKeys) {
    if (!isModel(key)) continue;
    const { id, model: m } = modelEntry(key);
    const k = base * displayScale(key);
    m.layers.forEach((l, i) => getLayerImage(`${id}:${i}`, m.box, m.defs || "", l.markup, k, true));
  }
  for (const key of bgKeys) {
    const m = BACKGROUNDS[key];
    if (!m) continue;
    const k = pixelScale(ctx) * Math.max(w / m.box[2], h / m.box[3]);
    m.layers.forEach((l, i) => getLayerImage(`bg:${key}:${i}`, layerBox(`bg:${key}:${i}`, m, l), m.defs || "", l.markup, k, true));
  }
}
