// Environmental prop renderers — procedural Canvas2D billboards
// Signature: (ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog)
// Ground convention: floor plane = groundY(cy, sh). Anchor bottom edge there.

import { getLayerImage, scaleBucket } from "./svg-art/raster.js";
import { isModernArt, isRealisticArt } from "./art-style.js";
import { DEFS as PROP_DEFS, PROP_SPRITES, buildRealisticProps } from "./svg-art/sprites/props.js";
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
  if (isModernArt() && drawModernProp(ctx, entity.propType, screenX, centerY, sprWidth, sprHeight, time, fog)) return;
  const fn = PROP_RENDERERS[entity.propType];
  if (fn) fn(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog);
}

// ── Modern (SVG sprite) path ────────────────────────────────────

// Prop sprites are authored in centimetres. A wall is one sprHeight tall and
// the eye sits at 0.45·sh above groundY, so 1 m ≈ 0.3·sh puts eye height at
// ~1.5 m and a locker at ~2 m.
const SH_PER_METRE = 0.3;
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

/** Cached bitmap lookup: skip the string-keyed cache while the bucket is steady. */
function layerBitmap(slot, id, box, defs, markup, scale) {
  if (slot.scale === scale && slot.img) return slot.img;
  const img = getLayerImage(id, box, defs, markup, scale);
  if (img) {
    const k = scaleBucket(scale);
    // Baked layers are canvases (width), undecoded ones <img> (naturalWidth).
    const exact = (img.naturalWidth ?? img.width) === Math.max(1, Math.round(box[2] * k));
    slot.img = exact ? img : null;
    slot.scale = exact ? scale : 0;
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
 * each type is already vector art rather than a legacy frame.
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
      getLayerImage(layer._id, layer._box, sprite._defs, layer.markup, scale);
      if (layer._silId) getLayerImage(layer._silId, layer._box, sprite._defs, layer._silMarkup, scale);
    }
  }
}

let _propsWarmed = -1; // art style the prop set was last warmed for

function drawModernProp(ctx, type, sx, cy, sw, sh, time, fog) {
  const sprite = PROP_SPRITES[type];
  if (!sprite) return false;
  const metre = Math.max(sw * SH_PER_METRE, 8 * _fovScale);
  const ppu = metre / 100;
  const style = isRealisticArt() ? 2 : 1;
  if (_propsWarmed !== style) {
    _propsWarmed = style;
    warmSvgSprites(PROP_SPRITES, PROP_DEFS, (sh * SH_PER_METRE) / 100);
  }
  const alpha = Math.min(1, fog * 4);
  const shade = Math.min(0.6, (1 - fog) * 1.5);
  return drawSvgSprite(ctx, type, sprite, PROP_DEFS, sx, groundY(cy, sh), ppu, time / 1000, alpha, shade);
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

function renderBench(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 1.4, h = s * 0.3;
  const y = groundY(cy, sh) - h * 2.5;

  // Seat
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#8B6914";
  ctx.fillRect(sx - w / 2, y, w, h);

  // Highlight
  ctx.fillStyle = "#a07a1a";
  ctx.fillRect(sx - w / 2, y, w, h * 0.3);

  // Legs
  ctx.fillStyle = "#555555";
  ctx.globalAlpha = fog * 0.7;
  const legW = Math.max(1, s * 0.08);
  ctx.fillRect(sx - w * 0.4, y + h, legW, h * 1.5);
  ctx.fillRect(sx + w * 0.4 - legW, y + h, legW, h * 1.5);

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

function renderDesk(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 1.3, h = s * 0.35;
  const y = groundY(cy, sh) - h * 3.2;

  // Desktop surface
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#6B4226";
  ctx.fillRect(sx - w / 2, y, w, h);

  // Top highlight
  ctx.fillStyle = "#7d5030";
  ctx.fillRect(sx - w / 2, y, w, h * 0.25);

  // Front panel
  ctx.fillStyle = "#5a3520";
  ctx.fillRect(sx - w / 2, y + h, w, h * 2.2);

  // Drawer lines
  ctx.strokeStyle = "#4a2a18";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.6;
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.4, y + h * 1.8);
  ctx.lineTo(sx + w * 0.4, y + h * 1.8);
  ctx.stroke();

  // Drawer handle
  ctx.fillStyle = "#998877";
  ctx.globalAlpha = fog * 0.7;
  ctx.fillRect(sx - s * 0.06, y + h * 1.4, s * 0.12, s * 0.04);

  ctx.globalAlpha = 1;
}

function renderFilingCabinet(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 0.65, h = s * 1.3;
  const y = groundY(cy, sh) - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#707070";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Highlight
  ctx.fillStyle = "#808080";
  ctx.fillRect(sx - w / 2, y - h / 2, w * 0.15, h);

  // Drawer divisions (3 drawers)
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.7;
  for (let i = 1; i < 3; i++) {
    const dy = y - h / 2 + (h / 3) * i;
    ctx.beginPath();
    ctx.moveTo(sx - w / 2 + 1, dy);
    ctx.lineTo(sx + w / 2 - 1, dy);
    ctx.stroke();
  }

  // Drawer handles
  ctx.fillStyle = "#999999";
  ctx.globalAlpha = fog * 0.8;
  for (let i = 0; i < 3; i++) {
    const dy = y - h / 2 + (h / 3) * i + h / 6;
    ctx.fillRect(sx - s * 0.06, dy - 1, s * 0.12, 2);
  }

  // Label slot on top drawer
  ctx.fillStyle = "#aaaaaa";
  ctx.globalAlpha = fog * 0.4;
  ctx.fillRect(sx - w * 0.2, y - h / 2 + h / 6 - s * 0.06, w * 0.4, s * 0.05);

  ctx.globalAlpha = 1;
}

function renderMonitorBank(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(8, sw, 0.4);
  const mw = s * 0.45, mh = s * 0.35;
  const y = groundY(cy, sh) - mh / 2 - s * 0.16;

  // Two monitors side by side
  for (let i = -1; i <= 1; i += 2) {
    const mx = sx + i * mw * 0.55;

    // Monitor casing
    ctx.globalAlpha = fog * 0.85;
    ctx.fillStyle = "#333333";
    ctx.fillRect(mx - mw / 2, y - mh / 2, mw, mh);

    // Screen
    const flicker = 0.7 + Math.sin(t * 0.008 + i) * 0.15;
    ctx.globalAlpha = fog * flicker;
    ctx.fillStyle = "#003322";
    ctx.fillRect(mx - mw / 2 + 2, y - mh / 2 + 2, mw - 4, mh - 4);

    // Scan line
    ctx.globalAlpha = fog * 0.15;
    ctx.fillStyle = "#00ff88";
    const scanY = ((t * 0.03 + i * 20) % (mh - 4));
    ctx.fillRect(mx - mw / 2 + 2, y - mh / 2 + 2 + scanY, mw - 4, 1);

    // Text lines (fake data)
    ctx.globalAlpha = fog * 0.4;
    ctx.fillStyle = "#00cc66";
    for (let ln = 0; ln < 3; ln++) {
      const lw = mw * (0.3 + Math.sin(ln * 2.3 + i) * 0.15);
      ctx.fillRect(mx - mw / 2 + 4, y - mh / 2 + 5 + ln * 4, lw, 1.5);
    }
  }

  // Stand
  ctx.globalAlpha = fog * 0.7;
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - s * 0.04, y + mh / 2, s * 0.08, s * 0.15);
  ctx.fillRect(sx - s * 0.15, y + mh / 2 + s * 0.12, s * 0.3, s * 0.04);

  ctx.globalAlpha = 1;
}

function renderTable(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.35);
  const w = s * 1.1, h = s * 0.2;
  const y = groundY(cy, sh) - h - s * 0.5;

  // Tabletop
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#887766";
  ctx.fillRect(sx - w / 2, y, w, h);

  // Top face shading
  ctx.fillStyle = "#998877";
  ctx.fillRect(sx - w / 2, y, w, h * 0.3);

  // Legs
  ctx.fillStyle = "#666655";
  ctx.globalAlpha = fog * 0.7;
  const legW = Math.max(1, s * 0.06);
  ctx.fillRect(sx - w * 0.42, y + h, legW, s * 0.5);
  ctx.fillRect(sx + w * 0.42 - legW, y + h, legW, s * 0.5);

  ctx.globalAlpha = 1;
}

function renderChair(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.3);
  const y = groundY(cy, sh) - s * 0.55;

  // Seat
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#444455";
  ctx.fillRect(sx - s * 0.35, y, s * 0.7, s * 0.2);

  // Back rest
  ctx.fillStyle = "#3a3a4a";
  ctx.fillRect(sx - s * 0.3, y - s * 0.5, s * 0.6, s * 0.5);

  // Highlight on back
  ctx.fillStyle = "#4a4a5a";
  ctx.fillRect(sx - s * 0.3, y - s * 0.5, s * 0.12, s * 0.5);

  // Legs
  ctx.fillStyle = "#555555";
  ctx.globalAlpha = fog * 0.6;
  const legW = Math.max(1, s * 0.05);
  ctx.fillRect(sx - s * 0.3, y + s * 0.2, legW, s * 0.35);
  ctx.fillRect(sx + s * 0.3 - legW, y + s * 0.2, legW, s * 0.35);

  ctx.globalAlpha = 1;
}

function renderVendingMachine(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(8, sw, 0.4);
  const w = s * 0.8, h = s * 1.5;
  const y = groundY(cy, sh) - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#2244aa";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Highlight strip
  ctx.fillStyle = "#3355bb";
  ctx.fillRect(sx - w / 2, y - h / 2, w * 0.12, h);

  // Display window
  ctx.globalAlpha = fog * 0.7;
  ctx.fillStyle = "#aaddff";
  ctx.fillRect(sx - w * 0.35, y - h * 0.35, w * 0.7, h * 0.35);

  // Product rows (dark lines)
  ctx.fillStyle = "#1133aa";
  for (let i = 1; i < 3; i++) {
    ctx.fillRect(sx - w * 0.35, y - h * 0.35 + i * h * 0.12, w * 0.7, 1);
  }

  // Product dots
  ctx.globalAlpha = fog * 0.6;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const colors = ["#ff4444", "#44ff44", "#ffaa00"];
      ctx.fillStyle = colors[(r + c) % 3];
      ctx.beginPath();
      ctx.arc(
        sx - w * 0.2 + c * w * 0.2,
        y - h * 0.28 + r * h * 0.12,
        Math.max(1, s * 0.04),
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  // Dispenser slot
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#111133";
  ctx.fillRect(sx - w * 0.25, y + h * 0.1, w * 0.5, h * 0.12);

  // Blinking indicator light
  const blink = Math.sin(t * 0.005) > 0 ? 0.9 : 0.3;
  ctx.globalAlpha = fog * blink;
  ctx.fillStyle = "#00ff44";
  ctx.beginPath();
  ctx.arc(sx + w * 0.3, y - h * 0.42, Math.max(1, s * 0.04), 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

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

function renderPottedPlant(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = propMinSize(6, sw, 0.3);
  const y = groundY(cy, sh) - s * 0.4;

  // Pot
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.moveTo(sx - s * 0.3, y);
  ctx.lineTo(sx - s * 0.22, y + s * 0.4);
  ctx.lineTo(sx + s * 0.22, y + s * 0.4);
  ctx.lineTo(sx + s * 0.3, y);
  ctx.closePath();
  ctx.fill();

  // Pot rim
  ctx.fillStyle = "#9a5520";
  ctx.fillRect(sx - s * 0.33, y - s * 0.04, s * 0.66, s * 0.08);

  // Soil
  ctx.fillStyle = "#3a2510";
  ctx.fillRect(sx - s * 0.28, y - s * 0.02, s * 0.56, s * 0.06);

  // Leaves (fan of green arcs)
  ctx.globalAlpha = fog * 0.8;
  const sway = Math.sin(t * 0.001) * 0.05;
  for (let i = -2; i <= 2; i++) {
    const angle = -Math.PI / 2 + i * 0.35 + sway;
    const lx = Math.cos(angle) * s * 0.5;
    const ly = Math.sin(angle) * s * 0.5;

    ctx.strokeStyle = i % 2 === 0 ? "#228833" : "#33aa44";
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, y - s * 0.05);
    ctx.quadraticCurveTo(
      sx + lx * 0.6, y + ly * 0.6 - s * 0.2,
      sx + lx, y + ly - s * 0.1
    );
    ctx.stroke();
  }

  // Small leaf tips
  ctx.fillStyle = "#33aa44";
  ctx.globalAlpha = fog * 0.6;
  for (let i = -2; i <= 2; i++) {
    const angle = -Math.PI / 2 + i * 0.35 + sway;
    const lx = Math.cos(angle) * s * 0.5;
    const ly = Math.sin(angle) * s * 0.5;
    ctx.beginPath();
    ctx.arc(sx + lx, y + ly - s * 0.1, Math.max(1, s * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineCap = "butt";
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
