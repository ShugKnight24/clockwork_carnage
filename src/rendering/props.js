// Environmental prop renderers — procedural Canvas2D billboards
// Signature: (ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog)
// Ground convention: floor plane = groundY(cy, sh). Anchor bottom edge there.

import { getLayerImage, layerBaked, onRasterRelease, scaleBucket, touchLayer } from "./svg-art/raster.js";
import { isModernArt, isRealisticArt } from "./art-style.js";
import { CEILING_Z } from "../systems/physics.js";
import { DEFS as PROP_DEFS, PROP_SPRITES, PROP_VARIANTS, buildRealisticProps } from "./svg-art/sprites/props.js";
import { DEFS as PICKUP_DEFS, buildRealisticPickups } from "./svg-art/sprites/pickups.js";

/** Floor plane Y coordinate — single source of truth for all ground-anchored props */
export const groundY = (cy, sh) => cy + sh * 0.45;

/**
 * FOV-aware minimum size scale.
 * At default FOV (70), fovScale = 1. Wider FOV → smaller floor, narrower → larger.
 * Set by renderer before sprite pass; read by individual prop renderers via propMinSize().
 */
let _fovScale = 1;
export function setFovScale(fov) { _fovScale = 70 / Math.max(50, fov); }

/** FOV-scaled minimum pixel size for prop details */
const propMinSize = (base, sw, mul) =>
  Math.max(base * _fovScale, sw * mul);

// ── Lookup table ────────────────────────────────────────────────
const PROP_RENDERERS = {
  locker: renderLocker,
  crate: renderCrate,
  bench: renderBench,
  target: renderTarget,
  ammo_crate: renderAmmoCrate,
  weight_rack: renderWeightRack,
  dumbbell: renderDumbbell,
  punching_bag: renderPunchingBag,
  desk: renderDesk,
  filing_cabinet: renderFilingCabinet,
  monitor_bank: renderMonitorBank,
  table: renderTable,
  chair: renderChair,
  vending_machine: renderVendingMachine,
  weapon_rack: renderWeaponRack,
  potted_plant: renderPottedPlant,
  barrier: renderBarrier,
};

export function drawProp(ctx, entity, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
  if (fog <= 0) return;
  if (isModernArt()) {
    const key = propKey(entity);
    if (drawModernProp(ctx, key, screenX, centerY, sprWidth, sprHeight, time, fog)) return;
    // A prop with art draws nothing until it has decoded, not its Legacy model.
    if (PROP_SPRITES[key] && typeof Image !== "undefined") return;
  }
  const fn = PROP_RENDERERS[entity.propType];
  if (fn) fn(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog, entity);
}

// ── Variants ────────────────────────────────────────────────────

/**
 * Which of its type's looks (PROP_VARIANTS) a placement wears, 0..n-1: the
 * one a level names (a numeric `variant`), else a hash of its cell, so the
 * same desk always has the same things on it and neighbours seldom match.
 */
export function propVariant(entity, n = PROP_VARIANTS[entity.propType] || 1) {
  if (n <= 1) return 0;
  if (typeof entity.variant === "number") return entity.variant % n;
  let h = Math.imul(Math.floor(entity.x), 73856093) ^ Math.imul(Math.floor(entity.y), 19349663);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 12)) >>> 0) % n;
}

/** The sprite key a placement draws: its type, or `type.v` for a variant. */
export function propKey(entity) {
  if (entity._propKey && entity._propKeyOf === entity.propType) return entity._propKey;
  const v = propVariant(entity);
  entity._propKeyOf = entity.propType;
  entity._propKey = v ? `${entity.propType}.${v}` : entity.propType;
  return entity._propKey;
}

// ── Modern (SVG sprite) path ────────────────────────────────────

// Prop sprites are authored in centimetres. A wall is one sprHeight tall,
// people are drawn about 0.9 of it (~1.8 m) and the standing eye is 0.74
// (STAND_EYE_Z), so 1 m = 0.5·sh puts the eye at ~1.5 m, a desk at 0.38 of
// a wall, and waist-high cover (0.4) at a counter's 80 cm.
const SH_PER_METRE = 0.5;
const MAX_BITMAP_PX = 384;
// Wall fog tint (renderer's Clockwork style) for distance shading.
const FOG_FILTER =
  `<filter id="fogSil" x="-.1" y="-.1" width="1.2" height="1.2">` +
  `<feColorMatrix type="matrix" values="0 0 0 0 .04 0 0 0 0 .07 0 0 0 0 .125 0 0 0 1 0"/></filter>`;

/**
 * Pick a raster scale for a layer: the half-octave bucket the draw needs,
 * stepped down until the bitmap's longest side fits MAX_BITMAP_PX.
 */
function rasterScale(pxPerUnit, box) {
  const longest = Math.max(box[2], box[3]);
  let b = scaleBucket(pxPerUnit);
  while (b * longest > MAX_BITMAP_PX && b > 0.26) b /= Math.SQRT2;
  // Nudge below the bucket edge so raster.js snaps to this exact bucket.
  return b * 0.999;
}

// Slots hold bitmaps the raster cache owns. Releasing the cache (Legacy art)
// shrinks them to 0x0, so a slot filled before the release is never reused.
let slotEpoch = 0;
onRasterRelease(() => {
  slotEpoch++;
  _propsWarmed = -1;
});

/** Cached bitmap lookup: skip the string-keyed cache while the bucket is steady. */
function layerBitmap(slot, id, box, defs, markup, scale) {
  if (slot.scale === scale && slot.img && slot.epoch === slotEpoch && touchLayer(id, scale, slot.img)) {
    return slot.img;
  }
  const img = getLayerImage(id, box, defs, markup, scale);
  // drawImage throws on a 0x0 bitmap; skip the layer rather than the frame.
  if (img && !(img.naturalWidth ?? img.width)) return null;
  if (img) {
    const k = scaleBucket(scale);
    // Baked layers are canvases (width), undecoded ones <img> (naturalWidth).
    const exact = (img.naturalWidth ?? img.width) === Math.max(1, Math.round(box[2] * k));
    slot.img = exact ? img : null;
    slot.scale = exact ? scale : 0;
    slot.epoch = slotEpoch;
  }
  return img;
}

function animate(ctx, anim, t) {
  const time = t + (anim.phase || 0);
  const sp = anim.speed ?? 1;
  switch (anim.type) {
    case "sway":
    case "spin": {
      const px = anim.pivot ? anim.pivot[0] : 0;
      const py = anim.pivot ? anim.pivot[1] : 0;
      ctx.translate(px, py);
      ctx.rotate(anim.type === "spin" ? time * sp : Math.sin(time * sp) * (anim.amp ?? 0.03));
      ctx.translate(-px, -py);
      return 1;
    }
    case "float":
      ctx.translate(0, Math.sin(time * sp) * (anim.amp ?? 2));
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
    case "blink":
      return Math.sin(time * sp) > 0 ? (anim.max ?? 1) : (anim.min ?? 0.3);
    default:
      return 1;
  }
}

/** Precompute per-layer ids and silhouette markup once per sprite. */
function prepareSprite(key, sprite, defs) {
  sprite._ready = true;
  sprite._defs = defs + FOG_FILTER;
  // Realistic layers are different bitmaps of the same key: own cache ids.
  const pre = sprite.realistic ? "sprite:r:" : "sprite:";
  sprite.layers.forEach((layer, i) => {
    layer._id = `${pre}${key}:${i}`;
    layer._box = layer.box || sprite.box;
    layer._slot = { scale: 0, img: null };
    if (layer.shade !== false && !layer.blend) {
      layer._silId = `${pre}${key}:${i}:fog`;
      layer._silMarkup = `<g filter="url(#fogSil)">${layer.silMarkup ?? layer.markup}</g>`;
      layer._silSlot = { scale: 0, img: null };
    }
  });
}

// Realistic sprite sets, keyed by the Modern defs the caller passes. Built on
// the first Realistic draw, never while Modern or Legacy is active.
let _realProps = null;
let _realPickups = null;

/** The Realistic { defs, sprites } set standing in for a Modern set, or null. */
function realisticSet(defs) {
  if (defs === PROP_DEFS) return _realProps || (_realProps = buildRealisticProps());
  if (defs === PICKUP_DEFS) return _realPickups || (_realPickups = buildRealisticPickups());
  return null;
}

/**
 * Blit a layered SVG sprite with its origin at (x, y), `ppu` screen pixels per
 * art unit. `fogShade` (0..1) darkens non-emissive layers toward the wall fog
 * colour. Returns false while the base layer is still decoding.
 */
export function drawSvgSprite(ctx, key, sprite, defs, x, y, ppu, t, alpha, fogShade = 0) {
  if (typeof Image === "undefined") return false; // headless unit tests
  if (isRealisticArt()) {
    const set = realisticSet(defs);
    const real = set && set.sprites[key];
    if (real) {
      sprite = real;
      defs = set.defs;
    }
  }
  if (!sprite) return false;
  if (!sprite._ready) prepareSprite(key, sprite, defs);
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const devPpu = ppu * (m ? Math.hypot(m.a, m.b) || 1 : 1);
  const layers = sprite.layers;
  const base = layers[sprite.base || 0];
  if (!layerBitmap(base._slot, base._id, base._box, sprite._defs, base.markup, rasterScale(devPpu * (base.res || 1), base._box))) {
    return false;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(ppu, ppu);
  const prevAlpha = ctx.globalAlpha;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const box = layer._box;
    const scale = rasterScale(devPpu * (layer.res || 1), box);
    const img = layerBitmap(layer._slot, layer._id, box, sprite._defs, layer.markup, scale);
    if (!img) continue;
    ctx.save();
    const a = layer.anim ? animate(ctx, layer.anim, t) : 1;
    const la = alpha * a * (layer.opacity ?? 1);
    if (la > 0.004) {
      ctx.globalAlpha = prevAlpha * la;
      if (layer.blend) ctx.globalCompositeOperation = layer.blend;
      ctx.drawImage(img, box[0], box[1], box[2], box[3]);
      if (layer.scan) drawScan(ctx, layer.scan, t, prevAlpha * la);
      if (fogShade > 0.02 && layer._silId) {
        const sil = layerBitmap(layer._silSlot, layer._silId, box, sprite._defs, layer._silMarkup, scale);
        if (sil) {
          ctx.globalAlpha = prevAlpha * alpha * fogShade;
          ctx.drawImage(sil, box[0], box[1], box[2], box[3]);
        }
      }
    }
    ctx.restore();
  }
  ctx.restore();
  return true;
}

/** Scanline sweeping down emissive screens (art-unit rects). */
function drawScan(ctx, scan, t, alpha) {
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = scan.color;
  ctx.globalAlpha = alpha * scan.alpha;
  for (let i = 0; i < scan.rects.length; i++) {
    const r = scan.rects[i];
    ctx.fillRect(r[0], r[1] + ((t * scan.speed + i * 11) % r[3]), r[2], 1.2);
  }
}

/**
 * Start decoding every sprite's layers at one scale so the first sighting of
 * each type is already vector art rather than a legacy frame. Queued, as any
 * prefetch: a sprite drawn meanwhile decodes its own layers at once, and the
 * rest no longer land in one frame (an art style change started ~50 of them
 * together).
 */
export function warmSvgSprites(sprites, defs, ppu) {
  if (typeof Image === "undefined") return;
  const set = isRealisticArt() ? realisticSet(defs) : null;
  if (set) {
    sprites = set.sprites;
    defs = set.defs;
  }
  for (const key in sprites) {
    const sprite = sprites[key];
    if (!sprite._ready) prepareSprite(key, sprite, defs);
    for (const layer of sprite.layers) {
      const scale = rasterScale(ppu * (layer.res || 1), layer._box);
      getLayerImage(layer._id, layer._box, sprite._defs, layer.markup, scale, true);
      if (layer._silId) getLayerImage(layer._silId, layer._box, sprite._defs, layer._silMarkup, scale, true);
    }
  }
}

let _propsWarmed = -1; // art style the prop set was last warmed for

/** Once per art style, start every prop type decoding at the size a wall `sh` px tall implies. */
export function warmPropSet(sh) {
  const style = isRealisticArt() ? 2 : 1;
  if (_propsWarmed === style) return;
  _propsWarmed = style;
  warmSvgSprites(PROP_SPRITES, PROP_DEFS, (sh * SH_PER_METRE) / 100);
}

/**
 * Decode and bake one prop type at each on-screen sprite height in
 * `sprHeights` ahead of drawing it; call once a frame until it returns true.
 * The largest size goes first, so the rest are downscales of it. `realistic`
 * picks the Realistic or Modern set ahead of a style change (a reel's flip);
 * left out, the set showing.
 */
export function prefetchPropSprite(ctx, type, sprHeights, realistic) {
  if (typeof Image === "undefined" || (realistic === undefined && !isModernArt())) return true;
  let ready = true;
  for (let v = 0; v < (PROP_VARIANTS[type] || 1); v++) {
    if (!prefetchPropKey(ctx, v ? `${type}.${v}` : type, sprHeights, realistic)) ready = false;
  }
  return ready;
}

/**
 * prefetchPropSprite for the look `entity` wears (propKey): what a reel shot
 * prewarms, rather than every variant of the type it will never show.
 */
export function prefetchPropLook(ctx, entity, sprHeights, realistic) {
  if (typeof Image === "undefined" || (realistic === undefined && !isModernArt())) return true;
  return prefetchPropKey(ctx, propKey(entity), sprHeights, realistic);
}

/** prefetchPropSprite for one sprite key (a type or one of its variants). */
function prefetchPropKey(ctx, key, sprHeights, realistic) {
  let sprite = PROP_SPRITES[key];
  let defs = PROP_DEFS;
  if (!sprite) return true;
  const real = (realistic ?? isRealisticArt()) ? realisticSet(defs) : null;
  if (real?.sprites[key]) {
    sprite = real.sprites[key];
    defs = real.defs;
  }
  if (!sprite._ready) prepareSprite(key, sprite, defs);
  const m = ctx.getTransform();
  const k = Math.hypot(m.a, m.b) || 1;
  const ppus = [...sprHeights].sort((a, b) => b - a).map((sh) => (Math.max(sh * SH_PER_METRE, 8 * _fovScale) / 100) * k);
  let ready = true;
  for (const layer of sprite.layers) {
    const ids = [[layer._id, layer.markup]];
    if (layer._silId) ids.push([layer._silId, layer._silMarkup]);
    for (const [id, markup] of ids) {
      for (const ppu of ppus) {
        const scale = rasterScale(ppu * (layer.res || 1), layer._box);
        getLayerImage(id, layer._box, sprite._defs, markup, scale, true);
        if (!layerBaked(id, scale)) {
          ready = false;
          break;
        }
      }
    }
  }
  return ready;
}

function drawModernProp(ctx, key, sx, cy, sw, sh, time, fog) {
  const sprite = PROP_SPRITES[key];
  if (!sprite) return false;
  const metre = Math.max(sw * SH_PER_METRE, 8 * _fovScale);
  const ppu = metre / 100;
  warmPropSet(sh);
  const alpha = Math.min(1, fog * 4);
  const shade = Math.min(0.6, (1 - fog) * 1.5);
  return drawSvgSprite(ctx, key, sprite, PROP_DEFS, sx, groundY(cy, sh), ppu, time / 1000, alpha, shade);
}

// ── Individual renderers ────────────────────────────────────────

function renderLocker(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 0.7, h = s * 1.6;
  const y = groundY(cy, sh) - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#556677";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Highlight left edge
  ctx.fillStyle = "#6a7a8a";
  ctx.fillRect(sx - w / 2, y - h / 2, w * 0.2, h);

  // Door seam
  ctx.strokeStyle = "#334455";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.7;
  ctx.beginPath();
  ctx.moveTo(sx, y - h / 2 + 2);
  ctx.lineTo(sx, y + h / 2 - 2);
  ctx.stroke();

  // Vent slits at top
  ctx.globalAlpha = fog * 0.5;
  ctx.fillStyle = "#223344";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(sx - w * 0.3, y - h / 2 + 3 + i * 3, w * 0.6, 1);
  }

  // Handle (small circle)
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#99aabb";
  ctx.beginPath();
  ctx.arc(sx + w * 0.15, y, Math.max(1, s * 0.06), 0, Math.PI * 2);
  ctx.fill();

  // Top shelf line
  ctx.strokeStyle = "#445566";
  ctx.globalAlpha = fog * 0.4;
  ctx.beginPath();
  ctx.moveTo(sx - w / 2 + 1, y - h * 0.15);
  ctx.lineTo(sx + w / 2 - 1, y - h * 0.15);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function renderTarget(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(8, sw, 0.4);
  const bob = Math.sin(t * 0.002) * s * 0.05;
  const y = groundY(cy, sh) - s * 1.3 + bob;

  // Post
  ctx.globalAlpha = fog * 0.7;
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - s * 0.05, y + s * 0.5, s * 0.1, s * 0.8);

  // Target board
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#ddddcc";
  ctx.beginPath();
  ctx.arc(sx, y, s * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Rings
  const rings = [
    { r: 0.4, c: "#cc3333" },
    { r: 0.28, c: "#ffffff" },
    { r: 0.18, c: "#cc3333" },
    { r: 0.08, c: "#ffcc00" },
  ];
  for (const ring of rings) {
    ctx.fillStyle = ring.c;
    ctx.beginPath();
    ctx.arc(sx, y, s * ring.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function renderCrate(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 0.92;
  const h = s * 0.82;
  const y = groundY(cy, sh) - h / 2;

  // Timber body
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#9a7016";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Top face
  ctx.fillStyle = "#c08a28";
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y - h / 2);
  ctx.lineTo(sx - w / 2 + w * 0.12, y - h / 2 - h * 0.18);
  ctx.lineTo(sx + w / 2 + w * 0.12, y - h / 2 - h * 0.18);
  ctx.lineTo(sx + w / 2, y - h / 2);
  ctx.closePath();
  ctx.fill();

  // Diagonal brace — what makes it read as a crate and not a box
  ctx.strokeStyle = "#5f4410";
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.globalAlpha = fog * 0.75;
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y + h / 2);
  ctx.lineTo(sx + w / 2, y - h / 2);
  ctx.stroke();

  // Iron corner brackets
  ctx.fillStyle = "#3a4450";
  ctx.globalAlpha = fog * 0.85;
  const b = Math.max(1, s * 0.12);
  ctx.fillRect(sx - w / 2, y - h / 2, b, b);
  ctx.fillRect(sx + w / 2 - b, y - h / 2, b, b);
  ctx.fillRect(sx - w / 2, y + h / 2 - b, b, b);
  ctx.fillRect(sx + w / 2 - b, y + h / 2 - b, b, b);
  ctx.globalAlpha = 1;
}

function renderAmmoCrate(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 1.0, h = s * 0.7;
  const y = groundY(cy, sh) - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#556B2F";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Top face
  ctx.fillStyle = "#667F3F";
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y - h / 2);
  ctx.lineTo(sx - w / 2 + w * 0.12, y - h / 2 - h * 0.2);
  ctx.lineTo(sx + w / 2 + w * 0.12, y - h / 2 - h * 0.2);
  ctx.lineTo(sx + w / 2, y - h / 2);
  ctx.closePath();
  ctx.fill();

  // Metal clasp
  ctx.strokeStyle = "#8B8B00";
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.globalAlpha = fog * 0.8;
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.3, y - h / 2);
  ctx.lineTo(sx - w * 0.3, y + h / 2);
  ctx.moveTo(sx + w * 0.3, y - h / 2);
  ctx.lineTo(sx + w * 0.3, y + h / 2);
  ctx.stroke();

  // Stencil text hint
  if (s > 10) {
    ctx.globalAlpha = fog * 0.5;
    ctx.fillStyle = "#8B8B00";
    ctx.font = `bold ${Math.max(5, s * 0.18)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("AMMO", sx, y + s * 0.08);
    ctx.textAlign = "left";
  }

  ctx.globalAlpha = 1;
}

function renderWeightRack(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 0.8, h = s * 1.4;
  const y = groundY(cy, sh) - h / 2;

  // Frame uprights
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - w / 2, y - h / 2, s * 0.08, h);
  ctx.fillRect(sx + w / 2 - s * 0.08, y - h / 2, s * 0.08, h);

  // Cross bars (3 shelves)
  ctx.fillStyle = "#555555";
  for (let i = 0; i < 3; i++) {
    const barY = y - h * 0.3 + i * h * 0.3;
    ctx.fillRect(sx - w / 2, barY, w, s * 0.04);
  }

  // Weight plates on shelves
  ctx.fillStyle = "#222222";
  for (let i = 0; i < 3; i++) {
    const barY = y - h * 0.3 + i * h * 0.3;
    const plateW = w * (0.5 - i * 0.1);
    ctx.fillRect(sx - plateW / 2, barY - s * 0.12, plateW, s * 0.12);
  }

  ctx.globalAlpha = 1;
}

function renderDumbbell(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.3);
  const y = groundY(cy, sh) - s * 0.18;

  // Handle bar
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#777777";
  ctx.fillRect(sx - s * 0.4, y - s * 0.06, s * 0.8, s * 0.12);

  // Weight discs
  ctx.fillStyle = "#333333";
  ctx.fillRect(sx - s * 0.55, y - s * 0.18, s * 0.18, s * 0.36);
  ctx.fillRect(sx + s * 0.37, y - s * 0.18, s * 0.18, s * 0.36);

  // Highlight on discs
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - s * 0.55, y - s * 0.18, s * 0.05, s * 0.36);
  ctx.fillRect(sx + s * 0.37, y - s * 0.18, s * 0.05, s * 0.36);

  ctx.globalAlpha = 1;
}

function renderPunchingBag(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(8, sw, 0.4);
  const sway = Math.sin(t * 0.0015) * s * 0.06;
  const y = cy - s * 0.1;

  // Chain
  ctx.globalAlpha = fog * 0.5;
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(sx, y - s * 0.9);
  ctx.lineTo(sx + sway, y - s * 0.5);
  ctx.stroke();

  // Bag body (cylindrical)
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#8B2500";
  const bx = sx + sway;
  ctx.beginPath();
  ctx.ellipse(bx, y, s * 0.28, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight strip
  ctx.fillStyle = "#a03010";
  ctx.beginPath();
  ctx.ellipse(bx - s * 0.08, y, s * 0.08, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stitching line
  ctx.strokeStyle = "#661800";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.4;
  ctx.beginPath();
  ctx.moveTo(bx, y - s * 0.5);
  ctx.lineTo(bx, y + s * 0.5);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// ── Office kit (Legacy) ─────────────────────────────────────────
// The station's furniture in Legacy art: flat fills lit from the upper left,
// drawn in metres off the floor (1 m = SH_PER_METRE of a wall) so each thing
// stands at the size its vector art does. A box's depth shows as a darker
// side to the right and, below the eye, a top face stepped up and right.
// Variants follow the vector set's (propVariant).

/** Pixels in a metre for a prop `sh` px tall. */
const metre = (sh) => Math.max(sh * SH_PER_METRE, 8 * _fovScale);

/**
 * Oblique box: front face's top-left at (x, y) metres from the prop's foot
 * (y up is negative), `w`×`h`, `d` deep; `c` = [front, top, side].
 */
function lbox(ctx, X, Y, m, x, y, w, h, d, c) {
  const fx = X + x * m;
  const fy = Y + y * m;
  const fw = w * m;
  const fh = h * m;
  const ox = d * 0.42 * m;
  const rise = (yy) => (yy + 1.5) * d * 0.17 * m;
  ctx.fillStyle = c[2];
  ctx.beginPath();
  ctx.moveTo(fx + fw, fy);
  ctx.lineTo(fx + fw + ox, fy - rise(y));
  ctx.lineTo(fx + fw + ox, fy + fh - rise(y + h));
  ctx.lineTo(fx + fw, fy + fh);
  ctx.closePath();
  ctx.fill();
  const r = rise(y);
  if (c[1] && r > 0.5) {
    ctx.fillStyle = c[1];
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + ox, fy - r);
    ctx.lineTo(fx + fw + ox, fy - r);
    ctx.lineTo(fx + fw, fy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = c[0];
  ctx.fillRect(fx, fy, fw, fh);
}

/** Where a point `z` metres back on a surface at height `y` lands: [x px, y px]. */
const lpj = (X, Y, m, x, y, z) => [X + (x + z * 0.42) * m, Y + (y - (y + 1.5) * z * 0.17) * m];

/** Soft contact shadow under a prop, `rx` metres wide. */
function lshadow(ctx, X, Y, m, rx, fog) {
  ctx.globalAlpha = fog * 0.3;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(X + rx * 0.1 * m, Y - 0.04 * m, rx * m, rx * 0.2 * m, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fog;
}

/** A rectangle in prop metres. */
const lrect = (ctx, X, Y, m, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(X + x * m, Y + y * m, Math.max(1, w * m), Math.max(1, h * m));
};

const WOOD = ["#6B4226", "#86552f", "#4a2a18"];
const STEEL_DK = ["#3a4450", "#4d5866", "#222932"];
const STEEL = ["#7f8a96", "#9aa5b0", "#4a5360"];
const GREY = ["#8d949b", "#a9b0b6", "#5c6268"];

/** A screen in a monitor: its glow and a scan line running down it. */
function lscreen(ctx, X, Y, m, x, y, w, h, color, t, fog) {
  lrect(ctx, X, Y, m, x, y, w, h, color);
  ctx.globalAlpha = fog * 0.18;
  lrect(ctx, X, Y, m, x, y + ((t * 0.0002 + x) % 1) * h * 0.95, w, 0.008, "#ffffff");
  ctx.globalAlpha = fog;
}

function renderDesk(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "desk" });
  const x0 = -0.9;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.9, fog);
  lbox(ctx, sx, Y, m, x0 + 1.44, -0.72, 0.06, 0.72, 0.68, WOOD);
  lbox(ctx, sx, Y, m, x0 + 0.02, -0.72, 0.44, 0.72, 0.68, WOOD);
  for (const [yy, hh] of [[-0.69, 0.1], [-0.55, 0.23], [-0.28, 0.23]]) {
    lrect(ctx, sx, Y, m, x0 + 0.05, yy, 0.38, hh, "#5a3520");
    lrect(ctx, sx, Y, m, x0 + 0.05, yy, 0.38, 0.012, "#8a5a38");
    lrect(ctx, sx, Y, m, x0 + 0.17, yy + hh / 2 - 0.012, 0.14, 0.025, "#b8b0a0");
  }
  lbox(ctx, sx, Y, m, x0, -0.76, 1.5, 0.04, 0.72, WOOD);
  const at = (u, z) => lpj(sx, Y, m, x0 + u, -0.76, z);
  if (v === 0) {
    let [px, py] = at(0.7, 0.48);
    ctx.fillStyle = "#1a2028";
    ctx.fillRect(px - 0.02 * m, py - 0.15 * m, 0.04 * m, 0.15 * m);
    ctx.fillRect(px - 0.26 * m, py - 0.47 * m, 0.52 * m, 0.33 * m);
    lscreen(ctx, px - 0.26 * m, py - 0.47 * m, m, 0.02, 0.02, 0.48, 0.27, "#2d6cb0", t, fog);
    lrect(ctx, px - 0.26 * m, py - 0.47 * m, m, 0.05, 0.05, 0.22, 0.15, "#dfe8f1");
    [px, py] = at(0.5, 0.12);
    lrect(ctx, px, py, m, 0, -0.03, 0.42, 0.03, "#1a2028");
    [px, py] = at(1.24, 0.22);
    lrect(ctx, px, py, m, -0.04, -0.09, 0.08, 0.09, "#e9e4da");
  } else if (v === 1) {
    let [px, py] = at(0.1, 0.26);
    lrect(ctx, px, py, m, 0, -0.04, 0.32, 0.04, "#d9b55c");
    [px, py] = at(0.92, 0.4);
    lrect(ctx, px, py, m, 0, -0.07, 0.22, 0.07, "#22282f");
    [px, py] = at(1.24, 0.52);
    lrect(ctx, px, py, m, 0, -0.26, 0.03, 0.26, "#c8a040");
    ctx.fillStyle = "#2f9a58";
    ctx.beginPath();
    ctx.ellipse(px + 0.02 * m, py - 0.26 * m, 0.17 * m, 0.08 * m, 0, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = fog * 0.35;
    ctx.fillStyle = "#ffd070";
    ctx.beginPath();
    ctx.ellipse(px + 0.02 * m, py - 0.16 * m, 0.26 * m, 0.12 * m, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fog;
  } else {
    let [px, py] = at(0.4, 0.22);
    lrect(ctx, px, py, m, 0, -0.025, 0.4, 0.025, "#2a3038");
    [px, py] = at(0.4, 0.46);
    lrect(ctx, px, py, m, 0.02, -0.27, 0.4, 0.27, "#1a1f26");
    lscreen(ctx, px, py, m, 0.04, -0.25, 0.36, 0.21, "#2d6cb0", t, fog);
    [px, py] = at(1.12, 0.2);
    lrect(ctx, px, py, m, -0.04, -0.14, 0.08, 0.14, "#f4f1e8");
    lrect(ctx, px, py, m, -0.04, -0.1, 0.08, 0.05, "#8a5a32");
  }
  ctx.restore();
}

function renderFilingCabinet(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "filing_cabinet" });
  const tall = v === 1;
  const n = tall ? 4 : 3;
  const h = tall ? 1.36 : 1.06;
  const c = tall ? ["#c9bc9c", "#ddd2b4", "#8a7c5c"] : GREY;
  const x0 = -0.38;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.4, fog);
  lbox(ctx, sx, Y, m, x0, -h, 0.5, h, 0.62, c);
  const dh = (h - 0.06) / n;
  for (let i = 0; i < n; i++) {
    const yy = -h + 0.03 + i * dh;
    lrect(ctx, sx, Y, m, x0 + 0.03, yy + dh - 0.03, 0.44, 0.012, "#3a3f44");
    lrect(ctx, sx, Y, m, x0 + 0.17, yy + 0.05, 0.16, 0.06, "#f4f1e6");
    lrect(ctx, sx, Y, m, x0 + 0.14, yy + 0.14, 0.22, 0.04, "#c8d0d6");
  }
  if (v === 1) {
    lbox(ctx, sx, Y, m, x0 + 0.04, -h - 0.27, 0.42, 0.26, 0.32, ["#c7a477", "#dcbd92", "#71552f"]);
    lrect(ctx, sx, Y, m, x0 + 0.13, -h - 0.17, 0.24, 0.09, "#f4f1e6");
  } else if (v === 2) {
    // The top drawer pulled out on its files.
    lrect(ctx, sx, Y, m, x0 - 0.1, -h + 0.07, 0.44, 0.04, "#e3c46a");
    lbox(ctx, sx, Y, m, x0 - 0.11, -h + 0.08, 0.44, dh - 0.03, 0.2, ["#9aa1a8", null, "#5c6268"]);
    lrect(ctx, sx, Y, m, x0 + 0.03, -h + 0.22, 0.22, 0.04, "#c8d0d6");
  } else {
    lrect(ctx, sx, Y, m, x0 + 0.32, -h - 0.05, 0.12, 0.06, "#e3c46a");
  }
  ctx.restore();
}

function renderMonitorBank(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "monitor_bank" });
  const x0 = -0.88;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.9, fog);
  lbox(ctx, sx, Y, m, x0 + 0.04, -0.71, 1.42, 0.71, 0.52, STEEL_DK);
  for (let i = 0; i < 5; i++) {
    lrect(ctx, sx, Y, m, x0 + 0.16, -0.58 + i * 0.045, 0.4, 0.018, "#11161c");
    lrect(ctx, sx, Y, m, x0 + 0.9, -0.58 + i * 0.045, 0.4, 0.018, "#11161c");
  }
  lbox(ctx, sx, Y, m, x0, -0.76, 1.5, 0.05, 0.6, STEEL);
  const [mx, my] = lpj(sx, Y, m, 0, -0.76, 0.4);
  lrect(ctx, mx, my, m, -0.03, -0.22, 0.06, 0.22, "#2a3038");
  for (const side of [-1, 1]) {
    const ox = side * 0.33 - 0.3;
    lrect(ctx, mx, my, m, ox, -0.64, 0.6, 0.4, "#1a1f26");
    const flick = 0.85 + Math.sin(t * 0.008 + side) * 0.1;
    ctx.globalAlpha = fog * flick;
    lscreen(ctx, mx, my, m, ox + 0.035, -0.605, 0.53, 0.31, v ? "#2a3c4c" : "#003322", t, fog * flick);
    ctx.fillStyle = v ? "#9fb4c6" : "#00cc66";
    for (let ln = 0; ln < (v ? 2 : 4); ln++) {
      if (v) {
        lrect(ctx, mx, my, m, ox + 0.035 + 0.265 * ln, -0.605, 0.006, 0.31, "#0a0f14");
        lrect(ctx, mx, my, m, ox + 0.035, -0.45, 0.53, 0.006, "#0a0f14");
      } else {
        ctx.fillRect(mx + (ox + 0.07) * m, my + (-0.56 + ln * 0.06) * m, (0.18 + ((ln * 37 + side * 11 + 60) % 26) / 100) * m, Math.max(1, 0.016 * m));
      }
    }
    ctx.globalAlpha = fog;
  }
  ctx.restore();
}

function renderTable(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "table" });
  const x0 = -0.71;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.75, fog);
  for (const [lx, z] of [[0.05, 0.69], [1.0, 0.69], [0.05, 0.02], [1.0, 0.02]]) {
    const [px, py] = lpj(sx, Y, m, x0 + lx, -0.7, z);
    ctx.fillStyle = z > 0.1 ? "#3a3f46" : "#666d74";
    ctx.fillRect(px, py, Math.max(1, 0.045 * m), Y - (0.0 + (1.5 * z * 0.17)) * m - py);
  }
  lbox(ctx, sx, Y, m, x0, -0.74, 1.1, 0.045, 0.75, ["#887766", "#a89a88", "#5a4f44"]);
  const at = (u, z) => lpj(sx, Y, m, x0 + u, -0.74, z);
  if (v === 1) {
    const [px, py] = at(0.22, 0.18);
    lrect(ctx, px, py, m, 0, -0.03, 0.46, 0.03, "#f2ece2");
    lrect(ctx, px, py, m, 0.16, -0.24, 0.46, 0.2, "#e98aa8");
  } else if (v === 2) {
    const [px, py] = at(0.16, 0.22);
    lrect(ctx, px, py, m, 0, -0.015, 0.44, 0.015, "#e2e2da");
    const [qx, qy] = at(0.74, 0.28);
    lrect(ctx, qx, qy, m, -0.04, -0.09, 0.08, 0.09, "#c0392b");
  } else {
    const [px, py] = at(0.3, 0.3);
    lrect(ctx, px, py, m, -0.035, -0.11, 0.07, 0.11, "#f2efe6");
    lrect(ctx, px, py, m, -0.035, -0.08, 0.07, 0.03, "#c0392b");
  }
  ctx.restore();
}

function renderChair(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "chair" });
  const fab = v === 1 ? ["#33416a", "#4b5d86", "#1c2540"] : ["#444455", "#5a5a6e", "#262631"];
  const x0 = -0.35;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.32, fog);
  // Back, set behind the seat.
  const [bx, by] = lpj(sx, Y, m, x0 + 0.03, -0.5, 0.4);
  const tall = v === 1 ? 0.66 : 0.5;
  ctx.fillStyle = fab[0];
  ctx.beginPath();
  ctx.roundRect(bx, by - tall * m, 0.44 * m, tall * m, 0.06 * m);
  ctx.fill();
  ctx.fillStyle = fab[1];
  ctx.fillRect(bx + 0.03 * m, by - (tall - 0.06) * m, 0.05 * m, (tall - 0.14) * m);
  // Star base and gas lift.
  const [cx, cy0] = lpj(sx, Y, m, x0 + 0.25, 0, 0.23);
  ctx.strokeStyle = "#2b3139";
  ctx.lineWidth = Math.max(1, 0.03 * m);
  ctx.beginPath();
  for (const [lx, ly] of [[-0.26, 0.02], [0.26, 0.01], [-0.14, -0.09], [0.16, -0.1], [0, 0.05]]) {
    ctx.moveTo(cx, cy0 - 0.04 * m);
    ctx.lineTo(cx + lx * m, cy0 + ly * m);
  }
  ctx.stroke();
  lrect(ctx, cx, cy0, m, -0.022, -0.42, 0.045, 0.38, "#9aa6b2");
  lbox(ctx, sx, Y, m, x0, -0.48, 0.5, 0.08, 0.46, fab);
  // Armrests.
  for (const ax of [x0 - 0.02, x0 + 0.47]) lrect(ctx, sx, Y, m, ax, -0.66, 0.05, 0.03, "#22282f");
  if (v === 2) {
    // A jacket over the back.
    ctx.fillStyle = "#33416a";
    ctx.fillRect(bx - 0.04 * m, by - (tall + 0.02) * m, 0.52 * m, 0.32 * m);
    ctx.fillRect(bx - 0.06 * m, by - (tall - 0.1) * m, 0.07 * m, 0.42 * m);
    ctx.fillStyle = "#c8a040";
    ctx.fillRect(bx - 0.06 * m, by - (tall - 0.18) * m, 0.05 * m, 0.06 * m);
  }
  ctx.restore();
}

function renderStackChair(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "stack_chair" });
  const c = v ? ["#2a3038", "#3a4048", "#14181e"] : ["#4f75a3", "#6e95c2", "#2a4466"];
  const x0 = -0.33;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.28, fog);
  ctx.fillStyle = "#9aa6b2";
  const lw = Math.max(1, 0.025 * m);
  for (const lx of [0.03, 0.41]) {
    const [px, py] = lpj(sx, Y, m, x0 + lx, -0.42, 0.4);
    ctx.fillRect(px, py, lw, Y - 1.5 * 0.4 * 0.17 * m - py);
  }
  const [bx, by] = lpj(sx, Y, m, x0 + 0.03, -0.47, 0.42);
  ctx.fillStyle = c[0];
  ctx.beginPath();
  ctx.roundRect(bx, by - 0.4 * m, 0.42 * m, 0.4 * m, 0.05 * m);
  ctx.fill();
  lbox(ctx, sx, Y, m, x0, -0.45, 0.46, 0.04, 0.44, c);
  ctx.fillStyle = "#c8d4de";
  for (const lx of [0.03, 0.41]) ctx.fillRect(sx + (x0 + lx) * m, Y - 0.41 * m, lw, 0.41 * m);
  ctx.restore();
}

function renderBench(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "bench" });
  const x0 = -0.82;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.85, fog);
  if (v === 2) {
    lrect(ctx, sx, Y, m, x0 + 0.52, -0.16, 0.09, 0.16, "#22282f");
    lrect(ctx, sx, Y, m, x0 + 0.66, -0.16, 0.09, 0.16, "#22282f");
    lrect(ctx, sx, Y, m, x0 + 0.52, -0.06, 0.32, 0.06, "#14181e");
  }
  for (const lx of [0.12, 1.32]) lbox(ctx, sx, Y, m, x0 + lx, -0.39, 0.05, 0.39, 0.3, STEEL_DK);
  lbox(ctx, sx, Y, m, x0, -0.45, 1.5, 0.05, 0.36, ["#8B6914", "#a07a1a", "#5a410c"]);
  lrect(ctx, sx, Y, m, x0, -0.45, 1.5, 0.012, "#b8902a");
  if (v === 1) {
    lbox(ctx, sx, Y, m, x0 + 0.16, -0.52, 0.3, 0.07, 0.22, ["#e6eaee", "#f4f6f8", "#9aa2a9"]);
    ctx.fillStyle = "#33416a";
    ctx.beginPath();
    ctx.ellipse(sx + (x0 + 1.06) * m, Y - 0.46 * m, 0.22 * m, 0.2 * m, 0, Math.PI, 0);
    ctx.fill();
  } else if (v === 2) {
    lrect(ctx, sx, Y, m, x0 + 1.14, -0.64, 0.08, 0.18, "#5aa8e6");
  }
  ctx.restore();
}

function renderWaitingBench(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "waiting_bench" });
  const x0 = -0.92;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.95, fog);
  for (let i = 0; i < 3; i++) {
    const [bx, by] = lpj(sx, Y, m, x0 + 0.03 + i * 0.55, -0.47, 0.42);
    ctx.fillStyle = "#566b80";
    ctx.fillRect(bx, by - 0.38 * m, 0.46 * m, 0.36 * m);
    ctx.fillStyle = "#7f96ab";
    ctx.fillRect(bx, by - 0.38 * m, 0.46 * m, Math.max(1, 0.02 * m));
  }
  for (const lx of [0.26, 1.3]) {
    lbox(ctx, sx, Y, m, x0 + lx - 0.03, -0.04, 0.12, 0.04, 0.44, STEEL_DK);
    const [px, py] = lpj(sx, Y, m, x0 + lx, -0.34, 0.23);
    ctx.fillStyle = "#3a4450";
    ctx.fillRect(px, py, 0.06 * m, Y - 0.08 * m - py);
  }
  for (let i = 0; i < 3; i++) lbox(ctx, sx, Y, m, x0 + i * 0.55, -0.44, 0.52, 0.03, 0.44, STEEL);
  if (v === 1) lrect(ctx, sx, Y, m, x0 + 0.62, -0.46, 0.3, 0.02, "#e2e2da");
  ctx.restore();
}

function renderVendingMachine(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "vending_machine" });
  const c = v ? ["#a8302d", "#d24a46", "#561412"] : ["#2244aa", "#3355bb", "#112266"];
  const x0 = -0.59;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.6, fog);
  lbox(ctx, sx, Y, m, x0, -1.83, 0.88, 1.83, 0.72, c);
  lrect(ctx, sx, Y, m, x0, -1.83, 0.1, 1.83, c[1]);
  ctx.globalAlpha = fog * (0.75 + 0.1 * Math.sin(t * 0.002));
  lrect(ctx, sx, Y, m, x0 + 0.05, -1.61, 0.56, 1.04, v ? "#ffd8c8" : "#aaddff");
  ctx.globalAlpha = fog;
  const colors = v ? ["#d8dce0", "#ff4444", "#e8b030", "#3a8a44"] : ["#ff4444", "#44ff44", "#ffaa00", "#e8e8f0"];
  for (let r = 0; r < 4; r++) {
    lrect(ctx, sx, Y, m, x0 + 0.06, -1.37 + r * 0.25, 0.54, 0.02, "#5a6a7a");
    for (let k = 0; k < 5; k++) lrect(ctx, sx, Y, m, x0 + 0.1 + k * 0.104, -1.52 + r * 0.25, 0.08, 0.14, colors[(r + k) % 4]);
  }
  lrect(ctx, sx, Y, m, x0 + 0.66, -1.61, 0.17, 0.22, "#081020");
  lrect(ctx, sx, Y, m, x0 + 0.08, -0.48, 0.52, 0.2, "#070b16");
  const blink = Math.sin(t * 0.005) > 0 ? 0.9 : 0.3;
  ctx.globalAlpha = fog * blink;
  lrect(ctx, sx, Y, m, x0 + 0.78, -1.74, 0.03, 0.03, "#00ff44");
  ctx.restore();
}

function renderPottedPlant(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "potted_plant" });
  const sway = Math.sin(t * 0.001 + sx * 0.01) * 0.04;
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.3, fog);
  ctx.lineCap = "round";
  if (v === 1) {
    // Snake plant: upright blades in a white pot.
    ctx.fillStyle = "#d3d8dc";
    ctx.fillRect(sx - 0.16 * m, Y - 0.4 * m, 0.32 * m, 0.4 * m);
    ctx.fillStyle = "#3a4048";
    ctx.fillRect(sx - 0.16 * m, Y - 0.28 * m, 0.32 * m, 0.04 * m);
    for (const [bx, a, l] of [[-0.08, -0.2, 0.62], [-0.02, -0.04, 0.9], [0.05, 0.08, 0.76], [0.1, 0.24, 0.52], [-0.1, -0.3, 0.5]]) {
      ctx.strokeStyle = l > 0.7 ? "#3f7a3a" : "#2f6a34";
      ctx.lineWidth = Math.max(2, 0.07 * m);
      ctx.beginPath();
      ctx.moveTo(sx + bx * m, Y - 0.4 * m);
      ctx.lineTo(sx + (bx + Math.sin(a + sway * 0.5) * l) * m, Y - (0.4 + Math.cos(a) * l) * m);
      ctx.stroke();
    }
  } else if (v === 2) {
    // Rubber plant in a square planter: broad leaves round a stem.
    ctx.fillStyle = "#3a3a4a";
    ctx.fillRect(sx - 0.19 * m, Y - 0.38 * m, 0.38 * m, 0.38 * m);
    ctx.strokeStyle = "#4a3a20";
    ctx.lineWidth = Math.max(1, 0.025 * m);
    ctx.beginPath();
    ctx.moveTo(sx, Y - 0.38 * m);
    ctx.lineTo(sx + sway * m, Y - 1.4 * m);
    ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const tt = i / 13;
      const phi = i * 2.4;
      const reach = (0.3 - tt * 0.16) * (0.35 + 0.65 * Math.abs(Math.sin(phi)));
      ctx.fillStyle = Math.cos(phi) > 0 ? "#2f7a3a" : "#1f5a2c";
      ctx.beginPath();
      ctx.ellipse(sx + (Math.sin(phi) * reach + sway * tt) * m, Y - (0.6 + tt * 0.95) * m, (0.14 - tt * 0.04) * m, 0.06 * m, Math.sign(Math.sin(phi) || 1) * (0.3 + tt * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Palm in terracotta.
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(sx - 0.22 * m, Y - 0.44 * m);
    ctx.lineTo(sx - 0.16 * m, Y);
    ctx.lineTo(sx + 0.16 * m, Y);
    ctx.lineTo(sx + 0.22 * m, Y - 0.44 * m);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9a5520";
    ctx.fillRect(sx - 0.25 * m, Y - 0.51 * m, 0.5 * m, 0.08 * m);
    for (let i = -3; i <= 3; i++) {
      const angle = -Math.PI / 2 + i * 0.36 + sway;
      const l = 0.85 - Math.abs(i) * 0.08;
      ctx.strokeStyle = i % 2 === 0 ? "#228833" : "#33aa44";
      ctx.lineWidth = Math.max(2, 0.06 * m);
      ctx.beginPath();
      ctx.moveTo(sx, Y - 0.5 * m);
      ctx.quadraticCurveTo(sx + Math.cos(angle) * l * 0.6 * m, Y - (0.5 + 0.7 * l) * m, sx + Math.cos(angle) * l * m, Y - (0.5 - Math.sin(angle) * l * 0.75 - Math.abs(i) * 0.06) * m);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function renderArchiveBoxes(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "archive_boxes" });
  const KR = ["#b38f62", "#dcbd92", "#71552f"];
  const WT = ["#d3d8dc", "#f3f5f6", "#8a9299"];
  const box = (x, y, c) => {
    lbox(ctx, sx, Y, m, x, y - 0.27, 0.4, 0.27, 0.32, c);
    lrect(ctx, sx, Y, m, x, y - 0.27, 0.4, 0.05, c[2]);
    lrect(ctx, sx, Y, m, x + 0.13, y - 0.18, 0.22, 0.1, "#f4f1e6");
  };
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.5, fog);
  if (v === 1) {
    box(-0.44, 0, KR);
    box(-0.42, -0.27, WT);
    box(-0.45, -0.54, KR);
    box(0, 0, WT);
  } else {
    box(-0.46, 0, KR);
    box(-0.02, 0, KR);
    box(-0.26, -0.27, WT);
  }
  ctx.restore();
}

function renderWaterCooler(ctx, sx, cy, sw, sh, dist, t, fog) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.26, fog);
  lbox(ctx, sx, Y, m, -0.23, -1.0, 0.32, 1.0, 0.32, ["#d3d8dc", "#f3f5f6", "#8a9299"]);
  lrect(ctx, sx, Y, m, -0.18, -0.86, 0.22, 0.3, "#232a32");
  lrect(ctx, sx, Y, m, -0.14, -0.82, 0.05, 0.06, "#2c6ad0");
  lrect(ctx, sx, Y, m, -0.04, -0.82, 0.05, 0.06, "#d03030");
  const [bx, by] = lpj(sx, Y, m, -0.07, -1.0, 0.16);
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#5aa8e6";
  ctx.beginPath();
  ctx.roundRect(bx - 0.15 * m, by - 0.48 * m, 0.3 * m, 0.42 * m, 0.08 * m);
  ctx.fill();
  ctx.fillStyle = "#9fd4ff";
  ctx.fillRect(bx - 0.1 * m, by - 0.42 * m, 0.04 * m, 0.3 * m);
  ctx.restore();
}

function renderCopier(ctx, sx, cy, sw, sh, dist, t, fog) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.5, fog);
  lbox(ctx, sx, Y, m, -0.46, -0.6, 0.66, 0.6, 0.6, ["#d3d8dc", "#f3f5f6", "#8a9299"]);
  for (let i = 0; i < 3; i++) lrect(ctx, sx, Y, m, -0.43, -0.42 + i * 0.18, 0.6, 0.012, "#7a828a");
  lbox(ctx, sx, Y, m, -0.46, -0.98, 0.66, 0.38, 0.6, GREY);
  lrect(ctx, sx, Y, m, -0.44, -0.86, 0.46, 0.05, "#14181e");
  lrect(ctx, sx, Y, m, -0.58, -0.8, 0.16, 0.03, "#f6f8fa");
  lbox(ctx, sx, Y, m, -0.44, -1.06, 0.62, 0.08, 0.54, STEEL_DK);
  lrect(ctx, sx, Y, m, -0.36, -0.95, 0.12, 0.1, "#ffe36a");
  ctx.globalAlpha = fog * (0.7 + 0.3 * Math.sin(t * 0.002));
  lrect(ctx, sx, Y, m, 0.0, -0.99, 0.12, 0.04, "#46e0ff");
  ctx.restore();
}

function renderWhiteboard(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "whiteboard" });
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.7, fog);
  for (const lx of [-0.64, 0.52]) {
    lrect(ctx, sx, Y, m, lx, -1.82, 0.04, 1.8, "#9aa6b2");
    lrect(ctx, sx, Y, m, lx - 0.1, -0.04, 0.24, 0.04, "#2a3038");
  }
  lrect(ctx, sx, Y, m, -0.68, -1.78, 1.24, 0.84, "#8d949b");
  lrect(ctx, sx, Y, m, -0.65, -1.75, 1.18, 0.76, v ? "#a87a48" : "#eef2f4");
  ctx.strokeStyle = v ? "#c0202a" : "#1a2a4a";
  ctx.lineWidth = Math.max(1, 0.01 * m);
  ctx.beginPath();
  if (v) {
    for (const [px, py] of [[-0.5, -1.6], [-0.1, -1.5], [0.3, -1.62], [0.1, -1.2], [-0.4, -1.2]]) {
      ctx.lineTo(sx + px * m, Y + py * m);
      ctx.fillStyle = "#f2f0ea";
      ctx.fillRect(sx + (px - 0.08) * m, Y + (py - 0.02) * m, 0.16 * m, 0.18 * m);
    }
  } else {
    ctx.moveTo(sx - 0.58 * m, Y - 1.45 * m);
    ctx.lineTo(sx + 0.45 * m, Y - 1.45 * m);
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(sx - 0.56 * m, Y - (1.32 - i * 0.07) * m);
      ctx.lineTo(sx - (0.2 - (i % 2) * 0.08) * m, Y - (1.32 - i * 0.07) * m);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function renderFloorLamp(ctx, sx, cy, sw, sh, dist, t, fog) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  ctx.save();
  ctx.globalAlpha = fog * 0.3;
  const glow = ctx.createRadialGradient(sx, Y - 1.45 * m, 0, sx, Y - 1.45 * m, 0.5 * m);
  glow.addColorStop(0, "rgba(255,210,120,0.9)");
  glow.addColorStop(1, "rgba(255,170,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 0.5 * m, Y - 1.95 * m, m, m);
  ctx.globalAlpha = fog;
  lrect(ctx, sx, Y, m, -0.16, -0.04, 0.32, 0.04, "#a8822f");
  lrect(ctx, sx, Y, m, -0.016, -1.46, 0.032, 1.42, "#d0a84e");
  ctx.fillStyle = "#e8dcc0";
  ctx.beginPath();
  ctx.moveTo(sx - 0.15 * m, Y - 1.76 * m);
  ctx.lineTo(sx - 0.21 * m, Y - 1.46 * m);
  ctx.lineTo(sx + 0.21 * m, Y - 1.46 * m);
  ctx.lineTo(sx + 0.15 * m, Y - 1.76 * m);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderWasteBin(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  const v = propVariant(entity ?? { x: 0, y: 0, propType: "waste_bin" });
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.16, fog);
  ctx.fillStyle = v ? "#2a3038" : "#56646f";
  ctx.beginPath();
  ctx.moveTo(sx - 0.13 * m, Y - 0.34 * m);
  ctx.lineTo(sx - 0.1 * m, Y);
  ctx.lineTo(sx + 0.1 * m, Y);
  ctx.lineTo(sx + 0.13 * m, Y - 0.34 * m);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#eef0ea";
  ctx.beginPath();
  ctx.ellipse(sx - 0.02 * m, Y - 0.36 * m, 0.07 * m, 0.05 * m, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderCoffeeCart(ctx, sx, cy, sw, sh, dist, t, fog) {
  const m = metre(sh);
  const Y = groundY(cy, sh);
  ctx.save();
  lshadow(ctx, sx, Y, m, 0.45, fog);
  for (const lx of [-0.4, 0.2]) lrect(ctx, sx, Y, m, lx, -0.84, 0.03, 0.82, "#666d74");
  lbox(ctx, sx, Y, m, -0.4, -0.22, 0.62, 0.03, 0.38, STEEL);
  lbox(ctx, sx, Y, m, -0.34, -0.38, 0.26, 0.16, 0.22, ["#b38f62", "#dcbd92", "#71552f"]);
  lbox(ctx, sx, Y, m, -0.42, -0.84, 0.64, 0.04, 0.4, STEEL);
  const [px, py] = lpj(sx, Y, m, -0.16, -0.84, 0.3);
  lrect(ctx, px, py, m, 0, -0.34, 0.26, 0.34, "#1a1f26");
  lrect(ctx, px, py, m, 0.05, -0.18, 0.16, 0.14, "#3b2414");
  lrect(ctx, sx, Y, m, -0.36, -0.98, 0.08, 0.14, "#f4f1e8");
  ctx.globalAlpha = fog * (Math.sin(t * 0.004) > -0.6 ? 1 : 0.4);
  lrect(ctx, px, py, m, 0.21, -0.31, 0.02, 0.02, "#ff3344");
  ctx.restore();
}

Object.assign(PROP_RENDERERS, {
  stack_chair: renderStackChair,
  waiting_bench: renderWaitingBench,
  archive_boxes: renderArchiveBoxes,
  water_cooler: renderWaterCooler,
  copier: renderCopier,
  whiteboard: renderWhiteboard,
  floor_lamp: renderFloorLamp,
  waste_bin: renderWasteBin,
  coffee_cart: renderCoffeeCart,
});

function renderWeaponRack(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 0.9, h = s * 1.2;
  const y = cy - h * 0.1;

  // Back plate
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#555566";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Bracket pegs
  ctx.fillStyle = "#777788";
  ctx.globalAlpha = fog * 0.85;
  for (let i = 0; i < 3; i++) {
    const py = y - h * 0.3 + i * h * 0.3;
    ctx.fillRect(sx - w * 0.35, py - 1, w * 0.2, 3);
    ctx.fillRect(sx + w * 0.15, py - 1, w * 0.2, 3);
  }

  // Weapon silhouettes on pegs
  ctx.fillStyle = "#222233";
  ctx.globalAlpha = fog * 0.7;
  for (let i = 0; i < 3; i++) {
    const py = y - h * 0.3 + i * h * 0.3;
    const gunW = w * (0.7 - i * 0.1);
    ctx.fillRect(sx - gunW / 2, py - 2, gunW, 3);
    // Grip
    ctx.fillRect(sx + gunW * 0.1, py, s * 0.06, s * 0.1);
  }

  ctx.globalAlpha = 1;
}

function renderBarrier(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(8, sw, 0.4);
  const w = s * 1.2, h = s * 0.8;
  const y = groundY(cy, sh) - h / 2;

  // Concrete jersey barrier body
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#888888";
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y + h / 2);
  ctx.lineTo(sx - w * 0.35, y - h / 2);
  ctx.lineTo(sx + w * 0.35, y - h / 2);
  ctx.lineTo(sx + w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // Top face
  ctx.fillStyle = "#999999";
  ctx.fillRect(sx - w * 0.35, y - h / 2 - h * 0.08, w * 0.7, h * 0.08);

  // Highlight edge
  ctx.fillStyle = "#aaaaaa";
  ctx.globalAlpha = fog * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y + h / 2);
  ctx.lineTo(sx - w * 0.35, y - h / 2);
  ctx.lineTo(sx - w * 0.35, y - h / 2 - h * 0.08);
  ctx.lineTo(sx - w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // Hazard stripe
  ctx.globalAlpha = fog * 0.6;
  const stripeW = w * 0.7 / 4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#ffcc00" : "#222222";
    ctx.fillRect(sx - w * 0.35 + i * stripeW, y - h * 0.1, stripeW, h * 0.15);
  }

  ctx.globalAlpha = 1;
}

/**
 * A gate on the gym's course: two posts and a bar over head height, its
 * number on a sign. The one to run for next is lit (a scanning curtain of
 * light between the posts, the number glowing); the rest wait dim; the ones
 * you have run turn green. `entity.gate` = { num, state: "next"|"ahead"|"done" }.
 */
function renderCourseGate(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const st = entity?.gate?.state ?? "ahead";
  const num = entity?.gate?.num ?? 0;
  const ground = groundY(cy, sh);
  const halfW = sw * 0.42;
  const top = ground - sh * 0.62; // ≈ 2 m
  const postW = Math.max(2, sw * 0.045);
  const col = st === "next" ? [0, 255, 210] : st === "done" ? [80, 255, 120] : [120, 140, 170];
  const rgb = (a) => `rgba(${col[0]},${col[1]},${col[2]},${a})`;
  ctx.save();
  ctx.globalAlpha = fog;
  if (st === "next") {
    // The curtain: a soft sheet of light, scanned by a bright line.
    const g = ctx.createLinearGradient(0, top, 0, ground);
    g.addColorStop(0, rgb(0.28));
    g.addColorStop(1, rgb(0.06));
    ctx.fillStyle = g;
    ctx.fillRect(sx - halfW, top, halfW * 2, ground - top);
    const scan = top + ((t * 0.0012) % 1) * (ground - top);
    ctx.fillStyle = rgb(0.55);
    ctx.fillRect(sx - halfW, scan, halfW * 2, Math.max(1, sh * 0.006));
    // Floor strip between the posts.
    ctx.fillStyle = rgb(0.5);
    ctx.fillRect(sx - halfW, ground - Math.max(1, sh * 0.006), halfW * 2, Math.max(2, sh * 0.012));
  }
  // Posts and the bar: dark steel, edged in the gate's colour.
  ctx.fillStyle = "#1a2230";
  for (const s of [-1, 1]) ctx.fillRect(sx + s * halfW - postW / 2, top, postW, ground - top);
  ctx.fillRect(sx - halfW - postW / 2, top - postW, halfW * 2 + postW, postW * 1.6);
  ctx.fillStyle = rgb(st === "ahead" ? 0.35 : 0.9);
  for (const s of [-1, 1]) ctx.fillRect(sx + s * halfW - postW * 0.15, top, postW * 0.3, ground - top);
  // The sign: the gate's number, or a tick once it is run.
  const signW = Math.max(10, sw * 0.26);
  const signH = signW * 0.62;
  const sy = top - postW - signH;
  ctx.fillStyle = "#0b1018";
  ctx.fillRect(sx - signW / 2, sy, signW, signH);
  ctx.strokeStyle = rgb(st === "ahead" ? 0.5 : 1);
  ctx.lineWidth = Math.max(1, signW * 0.05);
  ctx.strokeRect(sx - signW / 2, sy, signW, signH);
  if (st !== "ahead") {
    ctx.shadowColor = rgb(1);
    ctx.shadowBlur = signW * 0.3;
  }
  ctx.fillStyle = rgb(st === "ahead" ? 0.6 : 1);
  if (signH >= 6) {
    ctx.font = `900 ${Math.round(signH * 0.7)}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(entity?.gate?.label ?? (st === "done" ? "✓" : num === 0 ? "GO" : String(num)), sx, sy + signH * 0.55);
  }
  ctx.restore();
}
PROP_RENDERERS.course_gate = renderCourseGate;

// ── Stopped by the pulse ────────────────────────────────────────
//
// Things the 06:47 pulse caught partway through happening, for rooms where
// people stand frozen: one procedural drawing for every art style (there is
// no SVG set for them, so Comic and Modern fall through to these; Modern's
// light still falls on them through _drawPropLit). Place one as
//   new Prop(x, y, "frozen_pour")      a mug knocked off a counter, its
//                                      coffee hanging in the air below it
//   new Prop(x, y, "frozen_paper")     a sheet of paper stopped mid-fall
// `prop.lift` (metres above the floor) moves the paper; `prop.bare` drops the
// pour's counter, to stand it beside a desk or table already there. Both
// count for the hush near stopped things (src/systems/stillness.js).

/** Small, still motes over a stopped thing; positions fixed per prop. */
function stillMotes(ctx, sx, y, spanX, spanY, m, seed, t, fog) {
  ctx.fillStyle = "#d8e4ff";
  for (let i = 0; i < 7; i++) {
    const a = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const b = Math.sin(seed * 39.3468 + i * 11.135) * 24634.6345;
    const fx = a - Math.floor(a) - 0.5;
    const fy = b - Math.floor(b) - 0.5;
    const sz = Math.max(1, m * (0.006 + 0.006 * ((i * 7) % 3)));
    ctx.globalAlpha = fog * (0.35 + 0.2 * Math.sin(t * 0.0011 + i * 1.7));
    ctx.fillRect(sx + fx * spanX - sz / 2, y + fy * spanY - sz / 2, sz, sz);
  }
}

/** The pour's drops, [dx, dy, r] in metres from the mug's lip. */
const POUR_DROPS = [[-0.096, 0.35, 0.011], [-0.1, 0.41, 0.009], [-0.084, 0.46, 0.007], [-0.106, 0.5, 0.006], [-0.092, 0.56, 0.005], [-0.06, 0.12, 0.006], [-0.13, 0.28, 0.005]];

function renderFrozenPour(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale);
  const floor = groundY(cy, sh);
  const seed = (entity?.x ?? 0) * 3.1 + (entity?.y ?? 0) * 1.7;
  ctx.save();
  ctx.globalAlpha = fog;
  const counterX = sx - m * 0.16;
  const top = floor - m * 0.92;
  if (!entity?.bare) {
    // A break-room counter: laminate top, cupboard doors under it.
    ctx.fillStyle = "#4b5260";
    ctx.fillRect(counterX - m * 0.3, top + m * 0.04, m * 0.6, m * 0.88);
    ctx.fillStyle = "#3a404c";
    ctx.fillRect(counterX - m * 0.27, top + m * 0.1, m * 0.26, m * 0.76);
    ctx.fillRect(counterX + m * 0.01, top + m * 0.1, m * 0.26, m * 0.76);
    ctx.fillStyle = "#b9b2a4";
    ctx.fillRect(counterX - m * 0.33, top, m * 0.66, m * 0.05);
    // The carafe it came from, still on its plate.
    ctx.fillStyle = "#1a1c22";
    ctx.fillRect(counterX - m * 0.2, top - m * 0.03, m * 0.14, m * 0.03);
    ctx.fillStyle = "rgba(160,190,210,0.55)";
    ctx.beginPath();
    ctx.roundRect(counterX - m * 0.19, top - m * 0.2, m * 0.12, m * 0.17, m * 0.03);
    ctx.fill();
    ctx.fillStyle = "#3b2414";
    ctx.fillRect(counterX - m * 0.185, top - m * 0.1, m * 0.11, m * 0.07);
  }
  // The mug, knocked off the edge, tipped over and caught a hand's width
  // below the top: it never reaches the floor. Drawn a little larger than
  // life (u) so it reads from across a room.
  const u = m * 1.5;
  const mx = counterX + m * 0.44;
  const my = top + m * 0.14;
  ctx.translate(mx, my);
  ctx.rotate(1.05);
  ctx.fillStyle = "#e9e4da";
  ctx.beginPath();
  ctx.roundRect(-u * 0.045, -u * 0.06, u * 0.09, u * 0.11, u * 0.012);
  ctx.fill();
  ctx.strokeStyle = "#e9e4da";
  ctx.lineWidth = Math.max(1, u * 0.014);
  ctx.beginPath();
  ctx.arc(u * 0.05, -u * 0.005, u * 0.025, -1.3, 1.3);
  ctx.stroke();
  ctx.fillStyle = "#c23a3a";
  ctx.fillRect(-u * 0.045, -u * 0.02, u * 0.09, u * 0.018);
  ctx.restore();
  ctx.save();
  // The coffee: a ribbon leaving the lip, thinning as it falls, breaking
  // into drops that hang where they were. Nothing moves.
  const lipX = mx - u * 0.05;
  const lipY = my + u * 0.03;
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#6b3a17";
  ctx.beginPath();
  ctx.moveTo(lipX + u * 0.012, lipY - u * 0.02);
  ctx.bezierCurveTo(lipX - u * 0.08, lipY + u * 0.0, lipX - u * 0.12, lipY + u * 0.14, lipX - u * 0.105, lipY + u * 0.3);
  ctx.lineTo(lipX - u * 0.085, lipY + u * 0.3);
  ctx.bezierCurveTo(lipX - u * 0.085, lipY + u * 0.16, lipX - u * 0.04, lipY + u * 0.07, lipX + u * 0.03, lipY + u * 0.02);
  ctx.closePath();
  ctx.fill();
  // A sheen down the ribbon, catching the room's light.
  ctx.strokeStyle = "rgba(235,185,130,0.6)";
  ctx.lineWidth = Math.max(1, u * 0.006);
  ctx.beginPath();
  ctx.moveTo(lipX, lipY);
  ctx.bezierCurveTo(lipX - u * 0.07, lipY + u * 0.03, lipX - u * 0.1, lipY + u * 0.14, lipX - u * 0.098, lipY + u * 0.27);
  ctx.stroke();
  ctx.fillStyle = "#6b3a17";
  for (const [dx, dy, r] of POUR_DROPS) {
    ctx.beginPath();
    ctx.ellipse(lipX + dx * u, lipY + dy * u, Math.max(1, r * u), Math.max(1.2, r * u * 1.3), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Where it would have landed: a faint shadow on the floor, no stain yet.
  ctx.globalAlpha = fog * 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(lipX - u * 0.09, floor, u * 0.09, u * 0.018, 0, 0, Math.PI * 2);
  ctx.fill();
  stillMotes(ctx, lipX - m * 0.05, lipY + m * 0.2, m * 0.5, m * 0.6, m, seed, t, fog);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function renderFrozenPaper(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale);
  const floor = groundY(cy, sh);
  const lift = entity?.lift ?? 1.05;
  const seed = (entity?.x ?? 0) * 2.3 + (entity?.y ?? 0) * 4.1;
  const tilt = 0.5 + (Math.abs(seed) % 0.4);
  const py = floor - m * lift;
  ctx.save();
  // Its shadow, far below it on the floor.
  ctx.globalAlpha = fog * 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, floor, m * 0.15, m * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  // The sheet, side-slipping as paper falls, one corner curled up.
  ctx.translate(sx, py);
  ctx.rotate(tilt);
  // A little larger than a real sheet, so it reads from across the room.
  const w = m * 0.3;
  const h = m * 0.21;
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#eef0ea";
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + h * 0.08);
  ctx.quadraticCurveTo(w / 2 + w * 0.06, h * 0.1, w / 2 - w * 0.04, h / 2);
  ctx.lineTo(-w / 2 + w * 0.05, h / 2 - h * 0.06);
  ctx.quadraticCurveTo(-w / 2 - w * 0.03, 0, -w / 2, -h / 2);
  ctx.closePath();
  ctx.fill();
  // The underside of the curl, in shade.
  ctx.fillStyle = "#b8bcb4";
  ctx.beginPath();
  ctx.moveTo(w / 2 - w * 0.04, h / 2);
  ctx.quadraticCurveTo(w / 2 - w * 0.2, h * 0.38, w / 2 - w * 0.12, h * 0.18);
  ctx.quadraticCurveTo(w / 2 + w * 0.02, h * 0.2, w / 2 - w * 0.04, h / 2);
  ctx.fill();
  // Lines of type.
  ctx.fillStyle = "rgba(40,48,60,0.45)";
  const lh = Math.max(1, h * 0.05);
  for (let i = 0; i < 6; i++) ctx.fillRect(-w * 0.36, -h * 0.3 + i * h * 0.1, w * (i === 5 ? 0.4 : 0.66), lh);
  ctx.restore();
  ctx.save();
  stillMotes(ctx, sx, py, m * 0.45, m * 0.4, m, seed, t, fog);
  ctx.restore();
  ctx.globalAlpha = 1;
}
PROP_RENDERERS.frozen_pour = renderFrozenPour;
PROP_RENDERERS.frozen_paper = renderFrozenPaper;

// ── Certification Day (the station's east wing, js/tutorial-system.js) ──

/** Height of a stuck shutter's lip above the floor, in walls. */
const SHUTTER_LIP = 0.4;

/**
 * A security shutter stuck half down across a corridor: corrugated slats
 * from the ceiling to SHUTTER_LIP of a wall above the floor, a hazard bar on
 * its lip. You slide (or crouch) under it. One per cell of the corridor's
 * width.
 *
 * `entity.variant` dresses the same height for the training hall
 * (src/data/levels/rooms/track.js): "bar", a padded slide bar on two posts
 * with nothing above it; "tunnel", a dark padded ceiling panel with a strip
 * light along its lip, a row of them making the crouch tunnel. Only low goes
 * under (js/tutorial-system.js enforces it).
 */
function renderShutter(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const ground = groundY(cy, sh);
  // From a little over the ceiling (CEILING_Z walls up), so no gap shows.
  const top = cy + sh * (0.45 - CEILING_Z);
  // Measured from the floor the walls stand on (half a wall under the
  // standing eye), so the lip is over a crouched or sliding eye
  // (CROUCH_EYE_Z, SLIDE_EYE_Z in src/systems/physics.js) and under a
  // standing one: from a slide it visibly passes overhead.
  const lip = cy + sh * (0.5 - SHUTTER_LIP);
  const variant = entity?.variant;
  ctx.save();
  ctx.globalAlpha = fog;
  if (variant === "bar") {
    const halfW = sw * 0.5;
    // Two posts to the floor, a foam-wrapped bar from 0.9 m to 1.2 m.
    const barTop = lip - sh * 0.09;
    const post = Math.max(2, sw * 0.05);
    ctx.fillStyle = "#2a2e34";
    for (const s of [-1, 1]) ctx.fillRect(sx + s * (halfW - post) - post / 2, barTop - sh * 0.02, post, ground - barTop + sh * 0.02);
    const g = ctx.createLinearGradient(0, barTop, 0, lip);
    g.addColorStop(0, "#f08a3a");
    g.addColorStop(1, "#b0541a");
    ctx.fillStyle = g;
    ctx.fillRect(sx - halfW, barTop, halfW * 2, lip - barTop);
    ctx.fillStyle = "#f2f2ee";
    const band = Math.max(3, sw * 0.12);
    for (let x = sx - halfW + band * 0.5; x < sx + halfW; x += band * 2) ctx.fillRect(x, barTop, band, lip - barTop);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(sx - halfW, lip, halfW * 2, Math.max(1, sh * 0.012));
    ctx.restore();
    return;
  }
  const tunnel = variant === "tunnel";
  // The tunnel's panels meet their neighbours: a ceiling, not a row of signs.
  const halfW = tunnel ? sw * 0.62 : sw * 0.5;
  const g = ctx.createLinearGradient(0, top, 0, lip);
  g.addColorStop(0, tunnel ? "#1a2232" : "#5c646e");
  g.addColorStop(1, tunnel ? "#2c4f8a" : "#8a929c");
  ctx.fillStyle = g;
  ctx.fillRect(sx - halfW, top, halfW * 2, lip - top);
  // The slats (the tunnel's padding seams).
  const slat = Math.max(2, sh * (tunnel ? 0.07 : 0.035));
  ctx.fillStyle = "rgba(20,24,30,0.45)";
  for (let y = top + slat; y < lip; y += slat * 2) ctx.fillRect(sx - halfW, y, halfW * 2, Math.max(1, slat * 0.35));
  const barH = Math.max(2, sh * 0.05);
  if (tunnel) {
    // A strip light along the lip: you see where the ceiling ends.
    ctx.fillStyle = "#9fe8ff";
    ctx.fillRect(sx - halfW, lip - barH * 0.5, halfW * 2, barH * 0.5);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx - halfW, lip, halfW * 2, Math.max(1, sh * 0.03));
    ctx.restore();
    return;
  }
  // The lip: hazard stripes, the gap's shadow under it.
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(sx - halfW, lip - barH, halfW * 2, barH);
  ctx.fillStyle = "#1a1a1a";
  const stripe = Math.max(3, barH * 1.2);
  for (let x = sx - halfW; x < sx + halfW; x += stripe * 2) ctx.fillRect(x, lip - barH, stripe, barH);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(sx - halfW, lip, halfW * 2, Math.max(1, sh * 0.03));
  // Its fault lamp, blinking.
  if (sw > 24 && Math.floor(t / 400) % 2) {
    ctx.fillStyle = "#ff3a2a";
    ctx.beginPath();
    ctx.arc(sx, lip - barH * 2.2, Math.max(1.5, sw * 0.025), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
PROP_RENDERERS.shutter = renderShutter;

/**
 * A section of catwalk that is not there: a dark gap in the deck with
 * hazard paint on its far lip and the floor below lit far down. Drawn flat
 * on the ground plane from the near edge of its cell to the far one.
 */
function renderFloorGap(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const k = 0.45 * sh * dist; // ground offset × distance: constant along the floor
  const dn = Math.max(0.35, dist - 0.5);
  const df = dist + 0.5;
  const yN = cy + k / dn;
  const yF = cy + k / df;
  const wN = ((sw * dist) / dn) * 0.5;
  const wF = ((sw * dist) / df) * 0.5;
  ctx.save();
  ctx.globalAlpha = fog;
  ctx.beginPath();
  ctx.moveTo(sx - wF, yF);
  ctx.lineTo(sx + wF, yF);
  ctx.lineTo(sx + wN, yN);
  ctx.lineTo(sx - wN, yN);
  ctx.closePath();
  if (entity?.variant === "pit") {
    // The training hall's pit (src/data/levels/rooms/track.js): a well of
    // foam cubes a metre down, lit warm from inside, hazard paint on its lip.
    const g = ctx.createLinearGradient(0, yF, 0, yN);
    g.addColorStop(0, "#2a1406");
    g.addColorStop(1, "#5a2c10");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const rows = 3;
    for (let i = 0; i < rows; i++) {
      const y = yF + ((yN - yF) * (i + 0.3)) / rows;
      const w = wF + ((wN - wF) * (i + 0.3)) / rows;
      const n = 4;
      for (let k = 0; k < n; k++) {
        ctx.fillStyle = ["#e07a2a", "#2f6ec8", "#f2d64a", "#c84a3a"][(i + k) % 4];
        const cw = (w * 2) / n;
        ctx.fillRect(sx - w + k * cw + cw * 0.08, y, cw * 0.84, Math.max(1, ((yN - yF) / rows) * 0.7));
      }
    }
    ctx.restore();
    const lipH = Math.max(1, (yN - yF) * 0.12);
    ctx.fillStyle = "#e8c23a";
    ctx.fillRect(sx - wF, yF - lipH, wF * 2, lipH);
    ctx.restore();
    return;
  }
  const g = ctx.createLinearGradient(0, yF, 0, yN);
  g.addColorStop(0, "#020305");
  g.addColorStop(0.6, "#05080c");
  g.addColorStop(1, "#0c121a");
  ctx.fillStyle = g;
  ctx.fill();
  // Light from the concourse far below.
  ctx.globalAlpha = fog * (0.25 + 0.05 * Math.sin(t * 0.002));
  ctx.fillStyle = "#4a7ab0";
  ctx.fillRect(sx - wF * 0.5, yF + (yN - yF) * 0.4, wF, Math.max(1, (yN - yF) * 0.15));
  // Hazard paint on the far lip.
  ctx.globalAlpha = fog;
  const lipH = Math.max(1, (yN - yF) * 0.12);
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(sx - wF, yF - lipH, wF * 2, lipH);
  ctx.fillStyle = "#1a1a1a";
  const st = Math.max(2, wF * 0.18);
  for (let x = sx - wF; x < sx + wF; x += st * 2) ctx.fillRect(x, yF - lipH, st, lipH);
  ctx.restore();
}
PROP_RENDERERS.floor_gap = renderFloorGap;

/**
 * R&D's telemetry rig: a floor pad and a ring gantry over it on two posts.
 * `entity.scan` (set while a reading runs) sweeps a sheet of light down
 * through the ring.
 */
function renderTelemetryRig(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const ground = groundY(cy, sh);
  const top = ground - sh * 0.78;
  const halfW = sw * 0.46;
  const post = Math.max(2, sw * 0.05);
  const scanning = entity?.scan > 0;
  // Waiting for someone to stand in it (`entity.wait`): the ring on the
  // floor pulses and a column of light stands in it, to be seen across the bay.
  const waiting = !scanning && entity?.wait > 0;
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.005);
  ctx.save();
  ctx.globalAlpha = fog;
  if (waiting) {
    const beam = ctx.createLinearGradient(0, cy - sh * 0.55, 0, ground);
    beam.addColorStop(0, "rgba(70,224,255,0)");
    beam.addColorStop(0.5, `rgba(70,224,255,${0.1 + 0.08 * pulse})`);
    beam.addColorStop(1, `rgba(120,236,255,${0.38 + 0.2 * pulse})`);
    ctx.fillStyle = beam;
    ctx.fillRect(sx - halfW * 0.7, cy - sh * 0.55, halfW * 1.4, ground - (cy - sh * 0.55));
    ctx.fillStyle = `rgba(200,250,255,${0.5 + 0.3 * pulse})`;
    ctx.fillRect(sx - halfW * 0.04, cy - sh * 0.55, halfW * 0.08, ground - (cy - sh * 0.55));
  }
  // The pad, and the ring round it.
  ctx.fillStyle = scanning ? "rgba(70,224,255,0.55)" : `rgba(70,224,255,${waiting ? 0.3 + 0.25 * pulse : 0.25})`;
  ctx.beginPath();
  ctx.ellipse(sx, ground, halfW, Math.max(2, sh * 0.05), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = waiting || scanning ? "#9ff4ff" : "rgba(160,244,255,0.5)";
  ctx.lineWidth = Math.max(1.5, sw * (waiting ? 0.025 + 0.015 * pulse : 0.02));
  ctx.beginPath();
  ctx.ellipse(sx, ground, halfW * 1.15, Math.max(2.5, sh * 0.06), 0, 0, Math.PI * 2);
  ctx.stroke();
  // Posts and the ring.
  ctx.fillStyle = "#3a4048";
  for (const s of [-1, 1]) ctx.fillRect(sx + s * halfW - post / 2, top, post, ground - top);
  ctx.strokeStyle = "#6a7480";
  ctx.lineWidth = Math.max(2, sw * 0.04);
  ctx.beginPath();
  ctx.ellipse(sx, top, halfW, Math.max(2, sh * 0.06), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = scanning ? "#46e0ff" : "rgba(70,224,255,0.5)";
  ctx.lineWidth = Math.max(1, sw * 0.015);
  ctx.stroke();
  if (scanning) {
    const y = top + ((t * 0.0009) % 1) * (ground - top);
    ctx.fillStyle = "rgba(70,224,255,0.18)";
    ctx.fillRect(sx - halfW, top, halfW * 2, ground - top);
    ctx.fillStyle = "rgba(180,250,255,0.75)";
    ctx.fillRect(sx - halfW, y, halfW * 2, Math.max(1, sh * 0.008));
  }
  ctx.restore();
}
PROP_RENDERERS.telemetry_rig = renderTelemetryRig;

/**
 * One of the calibration rig's eye-tracking beacons (js/tutorial-system.js
 * calibrate): a brass ring with a lens, hung at eye height on a thin mast.
 * Dark until its turn (`entity.state` "off"); lit amber and pulsing while it
 * waits for your eyes ("on"), its ring filling as you hold on it
 * (`entity.hold`, 0-1); teal once it has them ("locked").
 */
function renderCalibBeacon(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const ground = groundY(cy, sh);
  const y = ground - sh * 0.72;
  const r = Math.max(3, sw * 0.08);
  const state = entity?.state ?? "off";
  const on = state === "on";
  const locked = state === "locked";
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.008);
  const lit = on ? "255,184,72" : locked ? "70,224,255" : "90,100,110";
  ctx.save();
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#2c3036";
  ctx.fillRect(sx - Math.max(1, r * 0.12), y + r, Math.max(2, r * 0.24), ground - y - r);
  if (on || locked) {
    const halo = ctx.createRadialGradient(sx, y, r * 0.2, sx, y, r * (on ? 3.2 + pulse : 2.4));
    halo.addColorStop(0, `rgba(${lit},${on ? 0.45 + 0.25 * pulse : 0.35})`);
    halo.addColorStop(1, `rgba(${lit},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sx, y, r * (on ? 3.2 + pulse : 2.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#a8834a";
  ctx.lineWidth = Math.max(1.5, r * 0.3);
  ctx.beginPath();
  ctx.arc(sx, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(${lit},${on || locked ? 0.9 : 0.5})`;
  ctx.beginPath();
  ctx.arc(sx, y, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  if (on && entity.hold > 0) {
    ctx.strokeStyle = "rgba(255,240,200,0.95)";
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.beginPath();
    ctx.arc(sx, y, r * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, entity.hold));
    ctx.stroke();
  }
  ctx.restore();
}
PROP_RENDERERS.calib_beacon = renderCalibBeacon;

/** The booking camera on its tripod at eye height, the ring light round the lens. */
function renderBookingCamera(ctx, sx, cy, sw, sh, dist, t, fog) {
  const ground = groundY(cy, sh);
  const m = metre(sh);
  const head = ground - m * 1.45;
  ctx.save();
  lshadow(ctx, sx, ground, m, 0.32, fog);
  ctx.strokeStyle = "#2a2e34";
  ctx.lineWidth = Math.max(1, m * 0.025);
  ctx.beginPath();
  for (const dx of [-0.32, 0.04, 0.3]) {
    ctx.moveTo(sx, head + m * 0.14);
    ctx.lineTo(sx + dx * m, ground - (dx > 0 ? 0.02 : 0) * m);
  }
  ctx.stroke();
  ctx.fillStyle = "#1a1c20";
  ctx.fillRect(sx - m * 0.13, head - m * 0.09, m * 0.26, m * 0.18);
  ctx.fillStyle = "#3a4048";
  ctx.fillRect(sx - m * 0.13, head - m * 0.09, m * 0.26, Math.max(1, m * 0.02));
  ctx.strokeStyle = "rgba(255,250,230,0.9)";
  ctx.lineWidth = Math.max(1, m * 0.025);
  ctx.beginPath();
  ctx.arc(sx, head, m * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = fog * 0.25;
  ctx.fillStyle = "#fffae6";
  ctx.beginPath();
  ctx.arc(sx, head, m * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#46e0ff";
  ctx.beginPath();
  ctx.arc(sx, head, m * 0.045, 0, Math.PI * 2);
  ctx.fill();
  // The tally lamp: recording.
  ctx.fillStyle = Math.sin(t * 0.004) > 0 ? "#ff3344" : "#5a1418";
  ctx.fillRect(sx + m * 0.08, head - m * 0.075, Math.max(1, m * 0.02), Math.max(1, m * 0.02));
  ctx.restore();
}
PROP_RENDERERS.booking_camera = renderBookingCamera;

/**
 * Paint on the training hall's floor: the start line (white) or the
 * chequered finish. Drawn flat on the ground plane, like the floor gap,
 * across the middle of its cell.
 */
function renderLaneMark(ctx, sx, cy, sw, sh, dist, t, fog, entity) {
  const k = 0.45 * sh * dist;
  const dn = Math.max(0.35, dist - 0.12);
  const df = dist + 0.12;
  const yN = cy + k / dn;
  const yF = cy + k / df;
  const wN = ((sw * dist) / dn) * 0.5;
  const wF = ((sw * dist) / df) * 0.5;
  ctx.save();
  ctx.globalAlpha = fog * 0.9;
  ctx.beginPath();
  ctx.moveTo(sx - wF, yF);
  ctx.lineTo(sx + wF, yF);
  ctx.lineTo(sx + wN, yN);
  ctx.lineTo(sx - wN, yN);
  ctx.closePath();
  if (entity?.variant === "finish") {
    ctx.clip();
    const n = 6;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#f2f2ee" : "#141618";
        ctx.fillRect(sx - wN + ((wN * 2) / n) * i, yF + ((yN - yF) / 2) * j, (wN * 2) / n + 1, (yN - yF) / 2 + 1);
      }
    }
  } else {
    ctx.fillStyle = "#f2f2ee";
    ctx.fill();
  }
  ctx.restore();
}
PROP_RENDERERS.lane_mark = renderLaneMark;

/** A lab microscope on its steel stand: the head, its eyepieces, a lit stage. */
function renderLabScope(ctx, sx, cy, sw, sh, dist, t, fog) {
  const ground = groundY(cy, sh);
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale);
  ctx.save();
  ctx.globalAlpha = fog;
  // The stand, to bench height (0.9 m), and its shelf.
  const benchY = ground - m * 0.9;
  ctx.fillStyle = "#6a727c";
  ctx.fillRect(sx - m * 0.3, benchY, m * 0.6, m * 0.05);
  ctx.fillStyle = "#3a4048";
  ctx.fillRect(sx - m * 0.27, benchY + m * 0.05, m * 0.04, m * 0.85);
  ctx.fillRect(sx + m * 0.23, benchY + m * 0.05, m * 0.04, m * 0.85);
  ctx.fillRect(sx - m * 0.27, ground - m * 0.32, m * 0.54, m * 0.03);
  // The scope.
  ctx.fillStyle = "#e8ecf0";
  ctx.fillRect(sx - m * 0.14, benchY - m * 0.05, m * 0.28, m * 0.05);
  ctx.fillStyle = "#cfd6dc";
  ctx.fillRect(sx + m * 0.04, benchY - m * 0.42, m * 0.07, m * 0.37);
  ctx.fillStyle = "#1a1c20";
  ctx.fillRect(sx - m * 0.1, benchY - m * 0.46, m * 0.22, m * 0.08);
  ctx.fillRect(sx - m * 0.12, benchY - m * 0.56, m * 0.04, m * 0.12);
  ctx.fillRect(sx - m * 0.05, benchY - m * 0.58, m * 0.04, m * 0.14);
  ctx.fillStyle = "#cfd6dc";
  ctx.fillRect(sx - m * 0.08, benchY - m * 0.2, m * 0.16, m * 0.03);
  ctx.fillStyle = "#9ff4ff";
  ctx.fillRect(sx - m * 0.04, benchY - m * 0.17, m * 0.08, m * 0.02);
  ctx.restore();
}
PROP_RENDERERS.lab_scope = renderLabScope;

/**
 * The vitals cart: a monitor on a rolling pole, the cadet's heart trace and
 * breathing running across it.
 */
function renderVitalsCart(ctx, sx, cy, sw, sh, dist, t, fog) {
  const ground = groundY(cy, sh);
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale);
  ctx.save();
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#3a4048";
  ctx.fillRect(sx - m * 0.02, ground - m * 1.25, m * 0.04, m * 1.25);
  ctx.fillRect(sx - m * 0.24, ground - m * 0.04, m * 0.48, m * 0.04);
  const w = m * 0.5;
  const h = m * 0.34;
  const top = ground - m * 1.55;
  ctx.fillStyle = "#1a1d22";
  ctx.fillRect(sx - w / 2 - m * 0.02, top - m * 0.02, w + m * 0.04, h + m * 0.04);
  ctx.fillStyle = "#061016";
  ctx.fillRect(sx - w / 2, top, w, h);
  ctx.lineWidth = Math.max(1, m * 0.008);
  ctx.strokeStyle = "#5aff9a";
  ctx.beginPath();
  const scroll = (t * 0.0004) % 1;
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const k = (u + scroll) % 0.25;
    const y = top + h * 0.45 - (k > 0.1 && k < 0.12 ? h * 0.3 : k > 0.12 && k < 0.135 ? -h * 0.12 : 0);
    if (i) ctx.lineTo(sx - w / 2 + u * w, y);
    else ctx.moveTo(sx - w / 2, y);
  }
  ctx.stroke();
  ctx.strokeStyle = "#46e0ff";
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const y = top + h * 0.78 + Math.sin(u * 18 + t * 0.003) * h * 0.06;
    if (i) ctx.lineTo(sx - w / 2 + u * w, y);
    else ctx.moveTo(sx - w / 2, y);
  }
  ctx.stroke();
  ctx.restore();
}
PROP_RENDERERS.vitals_cart = renderVitalsCart;

/** Cables taped across the floor from the rig to its consoles: flat on the ground, like the gap. */
function renderCableRun(ctx, sx, cy, sw, sh, dist, t, fog) {
  const k = 0.45 * sh * dist;
  const yN = cy + k / Math.max(0.35, dist - 0.5);
  const yF = cy + k / (dist + 0.5);
  ctx.save();
  ctx.globalAlpha = fog;
  ctx.lineCap = "round";
  for (const [dx, c] of [[-0.12, "#1a1c20"], [0, "#2a6ac2"], [0.12, "#1a1c20"]]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1, (yN - yF) * 0.06);
    ctx.beginPath();
    ctx.moveTo(sx + dx * sw * 0.6, yF);
    ctx.quadraticCurveTo(sx + dx * sw * 1.4, (yF + yN) / 2, sx + dx * sw, yN);
    ctx.stroke();
  }
  // The tape holding them down.
  ctx.fillStyle = "rgba(232,194,58,0.85)";
  ctx.fillRect(sx - sw * 0.25, yF + (yN - yF) * 0.45, sw * 0.5, Math.max(1, (yN - yF) * 0.08));
  ctx.restore();
}
PROP_RENDERERS.cable_run = renderCableRun;

// ── The civic wing (src/data/levels/rooms/civic.js) ─────────────
// The great hall's gardens and fountain, its security line and flags. Drawn
// in metres off the floor, like the lab scope (1 m = SH_PER_METRE of a wall).

/** A garden bed's tree: a grey-brown trunk, a canopy in clumps that sways a little. */
function renderGardenTree(ctx, sx, cy, sw, sh, dist, t, fog) {
  const ground = groundY(cy, sh);
  // Drawn to 3.6 m, then scaled to 2.6 so its crown clears the ceiling (CEILING_Z).
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale) * 0.72;
  const sway = Math.sin(t * 0.0006 + sx * 0.01) * m * 0.04;
  ctx.save();
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#5a4630";
  ctx.beginPath();
  ctx.moveTo(sx - m * 0.09, ground);
  ctx.lineTo(sx - m * 0.05, ground - m * 1.9);
  ctx.lineTo(sx + m * 0.05, ground - m * 1.9);
  ctx.lineTo(sx + m * 0.09, ground);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a4630";
  ctx.lineWidth = Math.max(1, m * 0.05);
  ctx.beginPath();
  ctx.moveTo(sx, ground - m * 1.4);
  ctx.lineTo(sx - m * 0.45 + sway, ground - m * 2.2);
  ctx.moveTo(sx, ground - m * 1.6);
  ctx.lineTo(sx + m * 0.5 + sway, ground - m * 2.3);
  ctx.stroke();
  const clumps = [[0, 2.75, 0.75], [-0.55, 2.35, 0.55], [0.6, 2.45, 0.55], [-0.2, 2.15, 0.5], [0.3, 3.15, 0.5], [-0.35, 3.0, 0.45]];
  const tones = ["#2e5a28", "#3e7232", "#4f8a3e"];
  for (let pass = 0; pass < 3; pass++) {
    ctx.fillStyle = tones[pass];
    const k = 1 - pass * 0.22;
    for (const [dx, h, r] of clumps) {
      ctx.beginPath();
      ctx.arc(sx + dx * m + sway - pass * m * 0.06, ground - h * m - pass * m * 0.08, r * m * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Light through the leaves from the skylight.
  ctx.fillStyle = "rgba(220,255,180,0.18)";
  ctx.beginPath();
  ctx.arc(sx + m * 0.1 + sway, ground - m * 3.05, m * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
PROP_RENDERERS.garden_tree = renderGardenTree;

/** One of the fountain's jets: a column of water falling back in an arc. */
function renderFountain(ctx, sx, cy, sw, sh, dist, t, fog) {
  const ground = groundY(cy, sh);
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale);
  // The jets rise from the water, just under the basin's waist-high rim.
  const top = ground - m * (1.85 + 0.08 * Math.sin(t * 0.004 + sx));
  const pool = ground - m * 0.74;
  ctx.save();
  ctx.globalAlpha = fog * 0.85;
  const g = ctx.createLinearGradient(0, top, 0, pool);
  g.addColorStop(0, "rgba(230,246,255,0.9)");
  g.addColorStop(1, "rgba(140,200,240,0.5)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(sx - m * 0.05, pool);
  ctx.quadraticCurveTo(sx - m * 0.02, top, sx, top);
  ctx.quadraticCurveTo(sx + m * 0.02, top, sx + m * 0.05, pool);
  ctx.closePath();
  ctx.fill();
  // The fall either side, and the drops in it.
  ctx.strokeStyle = "rgba(210,236,255,0.6)";
  ctx.lineWidth = Math.max(1, m * 0.025);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx, top + m * 0.05);
    ctx.quadraticCurveTo(sx + s * m * 0.5, top - m * 0.05, sx + s * m * 0.7, pool);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(240,250,255,0.8)";
  const d = Math.max(1, m * 0.03);
  for (let i = 0; i < 10; i++) {
    const ph = (t * 0.0012 + i * 0.1) % 1;
    const s = i % 2 ? 1 : -1;
    ctx.fillRect(sx + s * m * 0.7 * ph, top + (pool - top) * ph * ph, d, d);
  }
  ctx.restore();
}
PROP_RENDERERS.fountain = renderFountain;

/** A walk-through scanner: two posts and a header, the lamp green for go. */
function renderScannerArch(ctx, sx, cy, sw, sh, dist, t, fog) {
  const ground = groundY(cy, sh);
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale);
  const half = m * 0.45;
  const top = ground - m * 2.1;
  ctx.save();
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#c8ccd2";
  ctx.fillRect(sx - half - m * 0.12, top, m * 0.12, ground - top);
  ctx.fillRect(sx + half, top, m * 0.12, ground - top);
  ctx.fillStyle = "#9aa0a8";
  ctx.fillRect(sx - half - m * 0.12, top - m * 0.14, half * 2 + m * 0.24, m * 0.16);
  ctx.fillStyle = "#2a4472";
  ctx.fillRect(sx - half - m * 0.1, top + m * 0.4, m * 0.08, m * 0.8);
  ctx.fillRect(sx + half + m * 0.02, top + m * 0.4, m * 0.08, m * 0.8);
  ctx.fillStyle = `rgba(90,255,140,${0.6 + 0.4 * Math.sin(t * 0.004)})`;
  ctx.shadowColor = "#5aff8a";
  ctx.shadowBlur = Math.max(2, m * 0.15);
  ctx.beginPath();
  ctx.arc(sx, top - m * 0.06, Math.max(1.5, m * 0.05), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
PROP_RENDERERS.scanner_arch = renderScannerArch;

/** A flag on a bronze stand: navy, the seal's ring in gold, stirring in the air off the doors. */
function renderFlagStand(ctx, sx, cy, sw, sh, dist, t, fog) {
  const ground = groundY(cy, sh);
  const m = Math.max(sh * SH_PER_METRE, 8 * _fovScale);
  const top = ground - m * 2.3;
  const fw = m * 0.9, fh = m * 0.6;
  const wave = (u) => Math.sin(u * 4 + t * 0.002) * m * 0.04 * u;
  ctx.save();
  ctx.globalAlpha = fog;
  ctx.fillStyle = "#8e6a36";
  ctx.fillRect(sx - m * 0.25, ground - m * 0.08, m * 0.5, m * 0.08);
  ctx.fillRect(sx - m * 0.025, top, m * 0.05, ground - top);
  ctx.fillStyle = "#e0bc62";
  ctx.beginPath();
  ctx.arc(sx, top - m * 0.05, m * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c3058";
  ctx.beginPath();
  ctx.moveTo(sx + m * 0.03, top + m * 0.05);
  for (let i = 0; i <= 8; i++) ctx.lineTo(sx + m * 0.03 + (i / 8) * fw, top + m * 0.05 + wave(i / 8));
  for (let i = 8; i >= 0; i--) ctx.lineTo(sx + m * 0.03 + (i / 8) * fw, top + m * 0.05 + fh + wave(i / 8) + (i / 8) * m * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e0bc62";
  ctx.lineWidth = Math.max(1, m * 0.02);
  ctx.beginPath();
  ctx.arc(sx + m * 0.03 + fw * 0.45, top + m * 0.05 + fh * 0.5 + wave(0.45), fh * 0.26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
PROP_RENDERERS.flag_stand = renderFlagStand;

