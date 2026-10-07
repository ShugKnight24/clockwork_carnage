/**
 * Side-profile weapon art for the HUDs, one per weapon id.
 *
 * Generated from the same 3D models as the first-person viewmodels
 * (svg-art/viewmodel/weapons.js, through weaponProfile): an orthographic view
 * of the left flank, muzzle right, without the gloves. The HUD icon is
 * therefore the gun in hand — every part, material and emissive channel —
 * instead of separately drawn art, which only ever existed for two of the
 * eight weapons. Two layers per weapon — body and glow — rasterised once per
 * size bucket through svg-art/raster.js; the weapon's colour is the accent of
 * its emissives and rim.
 */

import { getLayerImage } from "../rendering/svg-art/raster.js";
import { weaponProfile } from "../rendering/svg-art/viewmodels.js";
import { WEAPON_MODELS } from "../rendering/svg-art/viewmodel/weapons.js";

export const SILHOUETTE_BOX = [0, 0, 160, 56];
const PAD = 2;

// Icon finish: the viewmodel materials are dark gunmetal and polymer, which
// at slot size sank into the HUD's dark panels. Lift the mid-tones and ring
// the silhouette with a faint light edge so each gun separates from the panel.
const LIFT =
  `<filter id="wsLift" x="-4%" y="-14%" width="108%" height="128%">` +
  `<feComponentTransfer in="SourceGraphic" result="lift">` +
  ["R", "G", "B"].map((c) => `<feFunc${c} type="gamma" amplitude="1.12" exponent="0.72" offset="0.02"/>`).join("") +
  `</feComponentTransfer>` +
  `<feMorphology in="SourceAlpha" operator="dilate" radius="0.9" result="fat"/>` +
  `<feFlood flood-color="#cfe0ee" flood-opacity="0.32"/>` +
  `<feComposite in2="fat" operator="in" result="edge"/>` +
  `<feMerge><feMergeNode in="edge"/><feMergeNode in="lift"/></feMerge></filter>`;

export const hasSilhouette = (id) => id in WEAPON_MODELS;

const fitted = new Map(); // `${id}|${color}` -> { defs, body, glow }

/** The weapon's profile fitted and centred in SILHOUETTE_BOX. */
function fittedProfile(id, color) {
  const key = `${id}|${color}`;
  let p = fitted.get(key);
  if (p !== undefined) return p;
  const prof = weaponProfile(id, color);
  p = null;
  if (prof) {
    const [x, y, w, h] = prof.box;
    const [, , BW, BH] = SILHOUETTE_BOX;
    const s = Math.min((BW - PAD * 2) / w, (BH - PAD * 2) / h);
    const tx = (BW - w * s) / 2 - x * s;
    const ty = (BH - h * s) / 2 - y * s;
    const g = (m) => `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${s.toFixed(4)})">${m}</g>`;
    p = { defs: prof.defs + LIFT, body: `<g filter="url(#wsLift)">${g(prof.body)}</g>`, glow: g(prof.glow) };
  }
  fitted.set(key, p);
  return p;
}

/**
 * Bitmaps for a weapon profile at `pxPerUnit` device pixels per art unit, or
 * null while decoding. `color` is the accent of the emissives and rim.
 */
export function silhouetteLayers(id, color, pxPerUnit) {
  const prof = fittedProfile(id, color);
  if (!prof) return null;
  const body = getLayerImage(`wsil:${id}:body:${color}`, SILHOUETTE_BOX, prof.defs, prof.body, pxPerUnit);
  const glowImg = prof.glow ? getLayerImage(`wsil:${id}:glow:${color}`, SILHOUETTE_BOX, prof.defs, prof.glow, pxPerUnit) : null;
  return body ? { body, glow: glowImg } : null;
}

/**
 * Draw a weapon's profile fitted and centred inside a box, aspect kept. Every
 * HUD's weapon slots use this, so the icons match the in-hand art instead of
 * the older flat sprite sheet. Returns false while the bitmaps decode.
 * `glow` scales the emissive layer: 0 for a dim, unselected slot.
 */
export function drawWeaponIcon(ctx, id, color, x, y, w, h, { alpha = 1, glow = 1 } = {}) {
  const ar = SILHOUETTE_BOX[2] / SILHOUETTE_BOX[3];
  let W = w;
  let H = w / ar;
  if (H > h) {
    H = h;
    W = h * ar;
  }
  const t = ctx.getTransform();
  const layers = silhouetteLayers(id, color, (W / SILHOUETTE_BOX[2]) * (Math.hypot(t.a, t.b) || 1));
  if (!layers) return false;
  const dx = x + (w - W) / 2;
  const dy = y + (h - H) / 2;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  ctx.drawImage(layers.body, dx, dy, W, H);
  if (layers.glow && glow > 0) {
    ctx.globalAlpha = a0 * alpha * glow;
    ctx.drawImage(layers.glow, dx, dy, W, H);
  }
  ctx.globalAlpha = a0;
  return true;
}
