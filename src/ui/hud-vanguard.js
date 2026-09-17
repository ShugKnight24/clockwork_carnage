/**
 * Vanguard HUD (hudStyle 4, Modern art only) — the flagship layout.
 *
 * Cinematic and low-clutter: everything hugs the four corners and the top
 * edge, the centre of the screen stays clear.
 *   lower-left   vitals gauge: agent bust medallion inside a 270° segmented
 *                health arc + shield arc, HP readout, angled stamina/chrono
 *   lower-right  weapon silhouette, name, ammo count with round pips
 *   top-left     objective caption + clock/difficulty chips
 *   top-centre   heading compass with objective and threat markers, boss bar
 *   top-right    kills/score chips, minimap, kill feed
 *   centre       threat ring: arcs toward nearby hostiles off the crosshair
 * Motion comes from hud-motion.js events: damage trail, heal sweep, shield
 * shatter, ammo kick + ejected pip, weapon slide-in, kill-feed slide.
 * Static art (gauge bezel, segment gaps, compass tape, weapon silhouettes)
 * is cached through the UI kit; per frame only arcs, rects and short text.
 */

import {
  UI,
  uiFont,
  drawPanel,
  drawCaption,
  drawBar,
  cachedSprite,
  blitSprite,
} from "./modern-ui-kit.js";
import { hudMotion as M, since, easeOut } from "./hud-motion.js";
import { healthTone, ghostFor, noteHealth, drawTopLeftStack, drawBossBar } from "./hud-modern.js";
import { drawPortrait } from "./portrait.js";
import { drawMinimap } from "./minimap.js";
import { getWeaponSprite } from "../assets/loader.js";
import { WEAPONS } from "../../js/data.js";

const TAU = Math.PI * 2;
const A0 = Math.PI * 0.75; // gauge opens at the bottom: 135° → 405°
const SPAN = Math.PI * 1.5;
const DIFF_NAMES = ["EASY", "NORMAL", "HARD", "NIGHTMARE"];
const DIFF_SCHEMES = ["steel", "cyan", "amber", "crimson"];
const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const weaponSlug = (name) =>
  (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function text(ctx, str, x, y, size, color, align = "left", weight = 700, spacing = 0, mono = false) {
  ctx.font = uiFont(size, weight, mono);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(str, x, y);
  if (spacing) ctx.letterSpacing = "0px";
}

const wrapPi = (a) => {
  a %= TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
};

function elapsed(game) {
  const s = Math.floor((performance.now() - game.roundStartTime) / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function arc(ctx, cx, cy, r, from, to, width, color) {
  if (to <= from) return;
  ctx.beginPath();
  ctx.arc(cx, cy, r, from, to);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

// ─── Vitals gauge ───────────────────────────────────────────────────────────

function paintGaugeBack(g, S, R, tw) {
  const c = S / 2;
  const r0 = R - tw / 2 - 5;
  // Smoked-glass annulus so the arcs read over any wall.
  g.beginPath();
  g.arc(c, c, R + 15, 0, TAU);
  g.arc(c, c, r0, 0, TAU, true);
  g.fillStyle = "rgba(5,9,15,0.66)";
  g.fill("evenodd");
  g.lineCap = "butt";
  // Health + shield grooves.
  for (const [r, w] of [[R, tw], [R + tw / 2 + 5, 3]]) {
    g.beginPath();
    g.arc(c, c, r, A0, A0 + SPAN);
    g.lineWidth = w + 3;
    g.strokeStyle = UI.ink;
    g.stroke();
    g.lineWidth = w;
    g.strokeStyle = "rgba(24,34,46,0.95)";
    g.stroke();
  }
  // Scale ticks every 10%, long at 0/50/100.
  for (let i = 0; i <= 10; i++) {
    const a = A0 + (SPAN * i) / 10;
    const long = i % 5 === 0;
    const r1 = R + tw / 2 + 9;
    const r2 = r1 + (long ? 6 : 3);
    g.beginPath();
    g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    g.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2);
    g.lineWidth = long ? 1.6 : 1;
    g.strokeStyle = long ? "rgba(185,210,232,0.7)" : "rgba(143,164,184,0.45)";
    g.stroke();
  }
  // Ink rims and a key-light glint on the upper-left bezel.
  g.lineWidth = 3;
  g.strokeStyle = UI.ink;
  g.beginPath();
  g.arc(c, c, r0, 0, TAU);
  g.stroke();
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(c, c, R + 15, 0, TAU);
  g.stroke();
  g.lineWidth = 1.2;
  g.strokeStyle = "rgba(185,210,232,0.4)";
  g.beginPath();
  g.arc(c, c, R + 14, Math.PI * 1.02, Math.PI * 1.42);
  g.stroke();
}

function paintGaugeGaps(g, S, R, tw, segments) {
  const c = S / 2;
  g.strokeStyle = UI.ink;
  g.lineWidth = 1.8;
  g.beginPath();
  for (let i = 1; i < segments; i++) {
    const a = A0 + (SPAN * i) / segments;
    g.moveTo(c + Math.cos(a) * (R - tw / 2 - 1), c + Math.sin(a) * (R - tw / 2 - 1));
    g.lineTo(c + Math.cos(a) * (R + tw / 2 + 1), c + Math.sin(a) * (R + tw / 2 + 1));
  }
  g.stroke();
  // Glass gloss along the outer half of the tube.
  g.beginPath();
  g.arc(c, c, R + tw * 0.22, A0, A0 + SPAN);
  g.lineWidth = Math.max(1, tw * 0.22);
  g.strokeStyle = "rgba(255,255,255,0.16)";
  g.stroke();
  // Medallion bezel ring over the portrait edge.
  const r0 = R - tw / 2 - 5;
  g.lineWidth = 2.5;
  g.strokeStyle = UI.ink;
  g.beginPath();
  g.arc(c, c, r0, 0, TAU);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = "rgba(143,178,205,0.45)";
  g.beginPath();
  g.arc(c, c, r0 - 2, Math.PI * 1.05, Math.PI * 1.6);
  g.stroke();
}

function paintEmblem(g, S) {
  const c = S / 2;
  const grad = g.createRadialGradient(c * 0.8, c * 0.7, 0, c, c, c);
  grad.addColorStop(0, "#2a3d52");
  grad.addColorStop(1, "#070b12");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.strokeStyle = UI.cyan;
  g.lineWidth = Math.max(1.5, S * 0.04);
  g.beginPath();
  g.arc(c, c, S * 0.28, 0, TAU);
  g.moveTo(c, c);
  g.lineTo(c, c - S * 0.2);
  g.moveTo(c, c);
  g.lineTo(c + S * 0.14, c + S * 0.08);
  g.stroke();
}

/**
 * Gauge centred on (cx, cy) with arc radius R. Returns the right edge so the
 * readout can sit beside it.
 */
function drawGauge(game, ctx, cx, cy, R, tw, portraitState, compact) {
  const p = game.player;
  const S = Math.ceil((R + 18) * 2);
  const bx = cx - S / 2;
  const by = cy - S / 2;
  const pct = Math.max(0, Math.min(1, p.health / p.maxHealth));
  const low = p.alive && pct < 0.25;
  const tone = healthTone(game, pct);
  noteHealth(pct);
  const ghost = ghostFor(pct);
  const r0 = R - tw / 2 - 5;
  const now = M.now;

  // Hit jolt: the whole gauge knocks sideways for a beat.
  const hk = since(M.hitAt, 200);
  const jolt = hk >= 0 ? Math.sin(hk * Math.PI * 3) * (1 - hk) * Math.min(4, 2 + M.hitAmount * 12) : 0;
  cx += jolt;

  blitSprite(ctx, cachedSprite(ctx, `vg-back:${R}:${tw}`, S, S, 0, (g) => paintGaugeBack(g, S, R, tw)), bx + jolt, by, S, S);

  // Medallion.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r0 - 1, 0, TAU);
  ctx.clip();
  const md = Math.ceil(r0 * 2);
  if (game.settings.showPortrait && portraitState) {
    // Oversized and dropped a little so the helmet fills the medallion.
    const pd = Math.round(md * 1.34);
    drawPortrait(ctx, cx - pd / 2, cy - pd / 2 + md * 0.12, pd, pd, portraitState);
  } else {
    blitSprite(ctx, cachedSprite(ctx, `vg-emblem:${md}`, md, md, 0, (g) => paintEmblem(g, md)), cx - r0, cy - r0, md, md);
  }
  ctx.restore();

  ctx.lineCap = "butt";
  const end = A0 + SPAN * pct;
  if (ghost > pct) arc(ctx, cx, cy, R, end, A0 + SPAN * ghost, tw, "rgba(255,214,190,0.78)");
  if (low) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
    arc(ctx, cx, cy, R, A0, end, tw + 7, `rgba(255,42,74,${(0.12 + 0.2 * pulse).toFixed(3)})`);
  }
  arc(ctx, cx, cy, R, A0, end, tw, tone);

  // Heal: a bright sweep races from the old value to the new one.
  const heal = since(M.healAt, 750);
  if (heal >= 0) {
    const from = A0 + SPAN * M.healFrom;
    const head = from + (A0 + SPAN * M.healTo - from) * easeOut(Math.min(1, heal * 1.8));
    arc(ctx, cx, cy, R, from, head, tw + 4, `rgba(120,255,190,${(0.35 * (1 - heal)).toFixed(3)})`);
    arc(ctx, cx, cy, R, from, head, tw, `rgba(240,255,246,${(0.9 * (1 - heal)).toFixed(3)})`);
    ctx.fillStyle = `rgba(255,255,255,${(1 - heal).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(head) * R, cy + Math.sin(head) * R, tw * 0.55, 0, TAU);
    ctx.fill();
  }
  if (pct > 0 && pct < 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(end) * (R - tw / 2), cy + Math.sin(end) * (R - tw / 2));
    ctx.lineTo(cx + Math.cos(end) * (R + tw / 2), cy + Math.sin(end) * (R + tw / 2));
    ctx.stroke();
  }

  // Shield arc + shatter.
  const Rs = R + tw / 2 + 5;
  if (p.maxShield > 0) {
    const sp = Math.max(0, p.shield / p.maxShield);
    arc(ctx, cx, cy, Rs, A0, A0 + SPAN * sp, 3, p.shield < p.maxShield ? "#4f8dff" : "#8cc4ff");
    const rs = since(M.shieldRestoreAt, 400);
    if (rs >= 0) arc(ctx, cx, cy, Rs, A0, A0 + SPAN * sp, 6, `rgba(160,210,255,${(0.5 * (1 - rs)).toFixed(3)})`);
  }
  const brk = since(M.shieldBreakAt, 700);
  if (brk >= 0 && M.shards) {
    const e = easeOut(brk);
    ctx.fillStyle = `rgba(150,200,255,${(1 - brk).toFixed(3)})`;
    ctx.strokeStyle = UI.ink;
    ctx.lineWidth = 1;
    for (const sh of M.shards) {
      const a = A0 + SPAN * sh.t;
      const r = Rs + sh.v * e;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r + 18 * brk * brk;
      const rot = a + sh.spin * brk;
      const z = sh.size;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(rot) * z, y + Math.sin(rot) * z);
      ctx.lineTo(x + Math.cos(rot + 2.3) * z * 0.7, y + Math.sin(rot + 2.3) * z * 0.7);
      ctx.lineTo(x + Math.cos(rot + 3.9) * z * 0.8, y + Math.sin(rot + 3.9) * z * 0.8);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
  }

  blitSprite(ctx, cachedSprite(ctx, `vg-gaps:${R}:${tw}`, S, S, 0, (g) => paintGaugeGaps(g, S, R, tw, compact ? 10 : 20)), bx + jolt, by, S, S);

  if (low) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
    ctx.strokeStyle = `rgba(255,42,74,${(0.4 + 0.5 * pulse).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r0 + 1, 0, TAU);
    ctx.stroke();
  }
  return { right: cx + R + tw / 2 + 12, low, pct };
}

function drawVitalsReadout(game, ctx, x, cy, f, fs, low, compact) {
  const p = game.player;
  const hk = since(M.hitAt, 220);
  const num = `${Math.ceil(p.health)}`;
  const size = Math.round((compact ? 26 : 40) * fs);
  const labelSize = Math.round((compact ? 8 : 10) * fs);
  const numY = cy + (compact ? 2 : 4);
  const flash = hk >= 0 && hk < 0.5;
  text(ctx, low ? "CRITICAL" : "VITALS", x, numY - size - 2, labelSize,
    low ? (Math.sin(M.now * 0.012) > 0 ? UI.crimson : "#ff8a96") : UI.textDim, "left", 700, 2);
  if (p.maxShield > 0 && !compact) {
    ctx.font = uiFont(labelSize, 700);
    ctx.letterSpacing = "2px";
    const lw = ctx.measureText(low ? "CRITICAL" : "VITALS").width;
    ctx.letterSpacing = "0px";
    text(ctx, `SHIELD ${Math.ceil(p.shield)}`, x + lw + 14, numY - size - 2, labelSize, "#8cc4ff", "left", 700, 1);
  }
  ctx.font = uiFont(size, 800);
  const nw = ctx.measureText(num).width;
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = UI.ink;
  ctx.strokeText(num, x, numY);
  ctx.fillStyle = flash ? "#ffffff" : low ? "#ff5a6e" : UI.text;
  ctx.fillText(num, x, numY);
  text(ctx, `/${p.maxHealth}`, x + nw + 4, numY, Math.round((compact ? 10 : 13) * fs), UI.textFaint, "left", 700);

  // Angled stamina / chrono bars.
  const bw = Math.round((compact ? 92 : 150) * f);
  const bh = Math.max(3, Math.round((compact ? 4 : 5) * f));
  const staminaPct = p.stamina / p.maxStamina;
  const chronoPct = p.chronoEnergy / p.maxChronoEnergy;
  const active = p.isSprinting || p.isDashing;
  const stColor = p.isDashing ? "#7ff6ff" : p.isSprinting ? UI.amber : staminaPct > 0.3 ? UI.cyan : UI.crimson;
  const rows = [[staminaPct, stColor, active, p.isDashing ? "DASH" : p.isSprinting ? "SPRINT" : "STA"]];
  if (chronoPct > 0.005 || p.chronoActive) {
    rows.push([chronoPct, p.chronoActive ? "#c77dff" : chronoPct >= 0.15 ? UI.violet : "#5d4488", p.chronoActive, p.chronoActive ? "SHIFT" : "CHR"]);
  }
  let by = numY + (compact ? 7 : 10);
  for (const [pct, color, on, tag] of rows) {
    ctx.save();
    ctx.translate(x + 4, by);
    ctx.transform(1, 0, -0.9, 1, 0, 0);
    drawBar(ctx, 0, 0, bw, bh, pct, color, { glow: on ? 0.5 : 0, edge: false });
    ctx.restore();
    if (!compact && (pct < 0.99 || on)) {
      text(ctx, `${tag} ${Math.floor(pct * 100)}%`, x + bw + 12, by + bh, Math.round(9 * fs), on ? color : UI.textFaint, "left", 700, 1);
    }
    by += bh + (compact ? 4 : 6);
  }
  return by;
}

// ─── Weapon block ───────────────────────────────────────────────────────────

const _trim = new WeakMap();
/** Opaque bounds of a sprite, measured once (sprites carry wide padding). */
function trimBox(img) {
  let b = _trim.get(img);
  if (b) return b;
  // Measured at 4x: the icons are 64px vectors with a faint backdrop shape.
  const sc = 4;
  const w = img.naturalWidth * sc;
  const h = img.naturalHeight * sc;
  b = [0, 0, img.naturalWidth, img.naturalHeight];
  try {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const t = c.getContext("2d", { willReadFrequently: true });
    t.drawImage(img, 0, 0, w, h);
    const d = t.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 90) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= x0) b = [x0 / sc, y0 / sc, (x1 - x0 + 1) / sc, (y1 - y0 + 1) / sc];
  } catch (_) {
    // Tainted or undecodable: fall back to the full image.
  }
  _trim.set(img, b);
  return b;
}

function paintSilhouette(g, W, H, img) {
  const [sx, sy, sw, sh] = trimBox(img);
  const k = Math.min((W - 6) / sw, (H - 6) / sh);
  const iw = sw * k;
  const ih = sh * k;
  const ix = W - iw - 3; // right-aligned toward the ammo column
  const iy = (H - ih) / 2;
  const make = () => {
    const c = document.createElement("canvas");
    c.width = g.canvas.width;
    c.height = g.canvas.height;
    const t = c.getContext("2d", { willReadFrequently: true });
    t.setTransform(g.getTransform());
    return t;
  };
  // Clean copy: drop the icon's faint backdrop shape so only the gun remains.
  // One-off pixel pass at cache time, never per frame.
  const clean = make();
  clean.drawImage(img, sx, sy, sw, sh, ix, iy, iw, ih);
  try {
    const px = clean.getImageData(0, 0, clean.canvas.width, clean.canvas.height);
    const d = px.data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 90) d[i] = 0;
    clean.putImageData(px, 0, 0);
  } catch (_) {
    // Tainted canvas: keep the raw icon.
  }
  const src = clean.canvas;
  const stamp = (t, dx, dy) => {
    t.save();
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.drawImage(src, dx, dy);
    t.restore();
  };
  const dpr = g.getTransform().a || 1;
  // Ink outline: the gun stamped around itself, flooded with ink.
  const ink = make();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    stamp(ink, Math.cos(a) * 1.8 * dpr, Math.sin(a) * 1.8 * dpr);
  }
  ink.globalCompositeOperation = "source-in";
  ink.fillStyle = UI.ink;
  ink.fillRect(-4, -4, W + 8, H + 8);
  // Body: washed toward brushed steel, keeping a trace of the icon's detail.
  const body = make();
  stamp(body, 0, 0);
  body.globalCompositeOperation = "source-atop";
  const grad = body.createLinearGradient(0, iy, 0, iy + ih);
  grad.addColorStop(0, "rgba(236,244,250,0.8)");
  grad.addColorStop(0.5, "rgba(160,184,204,0.8)");
  grad.addColorStop(1, "rgba(92,116,138,0.85)");
  body.fillStyle = grad;
  body.fillRect(-4, -4, W + 8, H + 8);
  // Cyan rim light along the top edge (graphic-novel rim from behind-right).
  body.globalCompositeOperation = "source-atop";
  body.fillStyle = "rgba(34,230,255,0.35)";
  body.fillRect(ix, iy, iw, Math.max(1.5, ih * 0.12));
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(ink.canvas, 0, 0);
  g.drawImage(body.canvas, 0, 0);
  g.restore();
}

let _slotX = -1;

function drawWeaponBlock(game, ctx, right, bottom, f, fs, compact) {
  const p = game.player;
  const wep = p.getWeaponDef();
  const ammo = p.ammo;
  const low = ammo <= 10;
  const numSize = Math.round((compact ? 30 : 54) * fs);

  // Ammo count with a kick on every shot.
  const shot = since(M.shotAt, 160);
  const kick = shot >= 0 ? 1 - shot : 0;
  const numStr = `${ammo}`;
  ctx.font = uiFont(numSize, 800);
  const nw = ctx.measureText(numStr).width;
  ctx.save();
  ctx.translate(right, bottom);
  const sc = 1 + 0.12 * kick * kick;
  ctx.scale(sc, sc);
  ctx.translate(0, -kick * 2);
  ctx.textAlign = "right";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = UI.ink;
  ctx.strokeText(numStr, 0, 0);
  ctx.fillStyle = kick > 0.55 ? "#ffffff" : low ? "#ff5a6e" : "#ffe3a3";
  ctx.fillText(numStr, 0, 0);
  ctx.restore();
  if (!compact) text(ctx, low ? "LOW" : "AMMO", right - nw - 10, bottom - 2, Math.round((compact ? 8 : 10) * fs),
    low ? (Math.sin(M.now * 0.01) > 0 ? UI.crimson : "#ff8a96") : UI.textDim, "right", 700, 2);

  // Round pips (last 30) with the spent round dropping out.
  if (!compact) {
    const pips = Math.min(ammo, 30);
    const pw = 3;
    const gap = 2;
    const py = bottom + 8;
    ctx.fillStyle = UI.ink;
    ctx.fillRect(right - 30 * (pw + gap) - 1, py - 1, 30 * (pw + gap) + 1, 9);
    for (let i = 0; i < 30; i++) {
      const x = right - (i + 1) * (pw + gap);
      ctx.fillStyle = i < pips ? (low ? UI.crimson : "#ffd48a") : "rgba(111,138,163,0.18)";
      ctx.fillRect(x, py, pw, 7);
    }
    if (shot >= 0 && ammo < 30) {
      const x = right - (pips + 1) * (pw + gap);
      ctx.globalAlpha = 1 - shot;
      ctx.fillStyle = "#fff1c8";
      ctx.save();
      ctx.translate(x + pw / 2 + shot * 10, py + 3 + shot * shot * 26);
      ctx.rotate(shot * 4);
      ctx.fillRect(-pw / 2, -3.5, pw, 7);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // Weapon silhouette + name, sliding in after a switch.
  const sw = since(M.switchAt, 240);
  const slide = sw >= 0 ? easeOut(sw) : 1;
  const W = Math.round((compact ? 78 : 150) * f);
  const H = Math.round((compact ? 28 : 54) * f);
  const nameSize = Math.round((compact ? 9 : 11) * fs);
  const nameY = bottom - numSize - (compact ? 4 : 8);
  let topY = nameY - nameSize - 4;
  if (compact) {
    // Phone: silhouette sits left of the count to stay out of the thumbs.
    const sx = right - nw - 12 - Math.round(W * 0.95);
    drawWeaponSilhouette(ctx, wep, sx + (1 - slide) * 18, bottom - H + 2, W, H, slide);
    if (wep) text(ctx, wep.name.toUpperCase(), right, nameY + 2, nameSize, UI.text, "right", 700, 1);
    return;
  }
  if (wep) {
    ctx.globalAlpha = slide;
    ctx.fillStyle = wep.color;
    ctx.fillRect(right - 3, nameY - nameSize + 1, 3, nameSize);
    text(ctx, wep.name.toUpperCase(), right - 10 + (1 - slide) * 18, nameY, nameSize, UI.text, "right", 700, 1.5);
    ctx.globalAlpha = 1;
  }
  drawWeaponSilhouette(ctx, wep, right - W + (1 - slide) * 24, topY - H, W, H, slide);
  topY -= H + 8;

  // Slot chips.
  if (game.settings.showWeapons && p.weapons.length > 1) {
    const cw = 18;
    const n = p.weapons.length;
    const x0 = right - n * (cw + 3) + 3;
    const target = x0 + p.currentWeapon * (cw + 3);
    _slotX = _slotX < 0 ? target : _slotX + (target - _slotX) * 0.35;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (cw + 3);
      const on = i === p.currentWeapon;
      ctx.fillStyle = UI.ink;
      ctx.fillRect(x - 1, topY - 15, cw + 2, 16);
      ctx.fillStyle = on ? "rgba(34,230,255,0.22)" : "rgba(24,34,46,0.85)";
      ctx.fillRect(x, topY - 14, cw, 14);
      text(ctx, `${i + 1}`, x + cw / 2, topY - 3, 10, on ? "#ffffff" : UI.textDim, "center", 700);
    }
    ctx.fillStyle = UI.cyan;
    ctx.fillRect(Math.round(_slotX), topY + 2, cw, 2);
  }
}

function drawWeaponSilhouette(ctx, wep, x, y, W, H, alpha) {
  if (!wep) return;
  const img = getWeaponSprite(weaponSlug(wep.name));
  if (!img || !img.naturalWidth) return;
  const spr = cachedSprite(ctx, `vg-wpn:${wep.name}`, W, H, 0, (g) => paintSilhouette(g, W, H, img));
  ctx.globalAlpha = alpha;
  blitSprite(ctx, spr, x, y, W, H, 0);
  ctx.globalAlpha = 1;
}

// ─── Compass ────────────────────────────────────────────────────────────────

function paintTape(g, W, H) {
  const fade = (a) => {
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, `rgba(${a},0)`);
    grad.addColorStop(0.16, `rgba(${a},1)`);
    grad.addColorStop(0.84, `rgba(${a},1)`);
    grad.addColorStop(1, `rgba(${a},0)`);
    return grad;
  };
  g.globalAlpha = 0.7;
  g.fillStyle = fade("5,9,15");
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
  g.fillStyle = fade("4,6,11");
  g.fillRect(0, 0, W, 2);
  g.fillRect(0, H - 2, W, 2);
  g.globalAlpha = 0.5;
  g.fillStyle = fade("111,138,163");
  g.fillRect(0, 2, W, 1);
  g.globalAlpha = 1;
  // Centre caret.
  const c = W / 2;
  g.fillStyle = UI.ink;
  g.beginPath();
  g.moveTo(c - 7, H + 7);
  g.lineTo(c + 7, H + 7);
  g.lineTo(c, H - 1);
  g.fill();
  g.fillStyle = UI.cyan;
  g.beginPath();
  g.moveTo(c - 4.5, H + 5.5);
  g.lineTo(c + 4.5, H + 5.5);
  g.lineTo(c, H + 0.5);
  g.fill();
}

function drawCompass(game, ctx, cx, y, W, compact) {
  const H = compact ? 20 : 24;
  const x0 = Math.round(cx - W / 2);
  blitSprite(ctx, cachedSprite(ctx, `vg-tape:${W}:${H}`, W, H + 8, 0, (g) => paintTape(g, W, H)), x0, y, W, H + 8, 0);
  const p = game.player;
  const RANGE = 60;
  const head = ((((p.angle + Math.PI / 2) * 180) / Math.PI) % 360 + 360) % 360;
  const ppd = W / (RANGE * 2);
  const mid = y + H / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y - 4, W, H + 8);
  ctx.clip();
  const first = Math.ceil((head - RANGE) / 5) * 5;
  for (let d = first; d <= head + RANGE; d += 5) {
    const x = cx + (d - head) * ppd;
    const edge = 1 - Math.abs(d - head) / RANGE;
    const dd = ((d % 360) + 360) % 360;
    if (dd % 45 === 0) {
      const name = CARDINALS[dd / 45];
      ctx.globalAlpha = Math.max(0, edge) ** 0.6;
      text(ctx, name, x, mid + (compact ? 4 : 5), compact ? 10 : name.length > 1 ? 11 : 13,
        name === "N" ? UI.cyan : UI.text, "center", 800);
    } else {
      ctx.globalAlpha = Math.max(0, edge) ** 0.6 * 0.8;
      ctx.fillStyle = "#8fa4b8";
      const tall = dd % 15 === 0;
      ctx.fillRect(Math.round(x), y + (tall ? 5 : 8), 1, tall ? H - 10 : H - 16);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  const bearingTo = (tx, ty) => {
    const a = ((Math.atan2(ty - p.y, tx - p.x) + Math.PI / 2) * 180) / Math.PI;
    return ((a - head + 540) % 360) - 180;
  };

  // Threat ticks along the bottom edge.
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.active || e.health <= 0 || e.dissolving) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 256) continue;
    const rel = bearingTo(e.x, e.y);
    if (Math.abs(rel) > RANGE) continue;
    const x = cx + rel * ppd;
    const near = 1 - Math.sqrt(d2) / 16;
    const wind = e.state === "windup" || e._windupLeftMs > 0;
    const s = wind ? 5 + Math.sin(M.now * 0.03) * 1.5 : 4;
    ctx.globalAlpha = 0.35 + 0.65 * near;
    ctx.fillStyle = UI.ink;
    ctx.beginPath();
    ctx.moveTo(x - s - 1.5, y + H + 1);
    ctx.lineTo(x + s + 1.5, y + H + 1);
    ctx.lineTo(x, y + H - s - 2.5);
    ctx.fill();
    ctx.fillStyle = wind ? "#ffd0d6" : UI.crimson;
    ctx.beginPath();
    ctx.moveTo(x - s, y + H);
    ctx.lineTo(x + s, y + H);
    ctx.lineTo(x, y + H - s);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Objective marker (clamped to the tape ends when behind).
  const wp = game.objectiveWaypoint;
  if (wp) {
    const rel = bearingTo(wp.x, wp.y);
    const clamped = Math.max(-RANGE, Math.min(RANGE, rel));
    const x = cx + clamped * ppd;
    const r = 5.5;
    ctx.fillStyle = UI.ink;
    ctx.beginPath();
    ctx.moveTo(x, mid - r - 2); ctx.lineTo(x + r + 2, mid); ctx.lineTo(x, mid + r + 2); ctx.lineTo(x - r - 2, mid);
    ctx.fill();
    const pulse = 0.7 + 0.3 * Math.sin(M.now * 0.008);
    ctx.fillStyle = `rgba(0,255,204,${pulse.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x, mid - r); ctx.lineTo(x + r, mid); ctx.lineTo(x, mid + r); ctx.lineTo(x - r, mid);
    ctx.fill();
    if (!compact) {
      const dist = Math.round(Math.hypot(wp.x - p.x, wp.y - p.y) * 2);
      text(ctx, Math.abs(rel) > RANGE ? (rel < 0 ? `◀ ${dist}m` : `${dist}m ▶`) : `${dist}m`, x, y + H + 18, 10, UI.energy, "center", 700, 1);
    }
  }
  if (!compact) {
    ctx.font = uiFont(9, 700, true);
    ctx.fillStyle = UI.textDim;
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(head) % 360}`.padStart(3, "0"), cx, y - 3);
  }
}

// ─── Threat ring ────────────────────────────────────────────────────────────

/** Arcs around the reticle toward close hostiles that are off to the side. */
export function drawVanguardThreatRing(game, ctx, w, h, barH = 0) {
  const p = game.player;
  const cx = w / 2;
  const cy = (h - barH) / 2;
  const r = Math.min(w, h - barH) * 0.16;
  ctx.lineCap = "butt";
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.active || e.health <= 0 || e.dissolving) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 81) continue;
    const rel = wrapPi(Math.atan2(dy, dx) - p.angle);
    if (Math.abs(rel) < 0.45) continue; // on screen already
    const near = 1 - Math.sqrt(d2) / 9;
    const wind = e.state === "windup" || e._windupLeftMs > 0;
    const a = rel - Math.PI / 2;
    const span = 0.14 + near * 0.12;
    ctx.globalAlpha = 0.25 + 0.7 * near;
    arc(ctx, cx, cy, r, a - span, a + span, wind ? 7 : 5, UI.ink);
    arc(ctx, cx, cy, r, a - span, a + span, wind ? 4 : 2.5, wind ? (Math.sin(M.now * 0.03) > 0 ? "#ffffff" : UI.crimson) : UI.crimson);
  }
  ctx.globalAlpha = 1;
}

// ─── Top-right chips, kill feed ─────────────────────────────────────────────

function chip(ctx, right, y, labelText, value, accent, fs, pop) {
  const valSize = Math.round(14 * fs);
  ctx.font = uiFont(valSize, 800);
  const vw = ctx.measureText(value).width;
  const pw = Math.ceil((vw + 58 * fs) / 8) * 8;
  const x = right - pw;
  drawPanel(ctx, x, y, pw, 26, { variant: "glass", accent, chamfer: 7 });
  if (pop > 0) {
    ctx.globalAlpha = pop;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2 - pop * 3, y - 2 - pop * 3, pw + 4 + pop * 6, 30 + pop * 6);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "middle";
  text(ctx, labelText, x + 11, y + 14, Math.round(9 * fs), accent === UI.crimson ? "#ff8a96" : "#8feeff", "left", 700, 1.5);
  text(ctx, value, right - 10, y + 14, valSize, pop > 0.4 ? "#ffffff" : UI.text, "right", 800);
  ctx.textBaseline = "alphabetic";
  return pw;
}

function drawKillFeed(ctx, right, y, fs) {
  let yy = y;
  for (const e of M.feed) {
    const age = M.now - e.at;
    const inK = Math.min(1, age / 180);
    const outK = age > 2600 ? (age - 2600) / 600 : 0;
    ctx.globalAlpha = Math.max(0, inK * (1 - outK));
    const dx = (1 - easeOut(inK)) * 40;
    drawCaption(ctx, right + dx, yy, e.text, { size: Math.round(10 * fs), scheme: age < 500 ? "crimson" : "steel", align: "right" });
    yy += Math.round(10 * fs * 1.65) + 5;
  }
  ctx.globalAlpha = 1;
}

// ─── Layouts ────────────────────────────────────────────────────────────────

/** Desktop / tablet Vanguard. Draws its own minimap. */
export function renderVanguardPanels(game, ctx, w, h, f, portraitState, minimapState) {
  const fs = (game.settings.fontScale || 100) / 100;
  const m = Math.round(22 * Math.min(1, w / 1280) + 6);

  // Top-left objective.
  if (game.mode === "arena" || game.mode === "meltdown") {
    drawTopLeftStack(game, ctx, fs);
  } else {
    let y = m - 6;
    if (game.mode === "campaign") {
      const name = game.map?.name || `Level ${game.campaignLevel + 1}`;
      y += drawCaption(ctx, m, y, name, { size: Math.round(12 * fs) }).h + 7;
    }
    let x = m;
    if (game.roundStartTime) {
      const t = elapsed(game);
      ctx.font = uiFont(Math.round(12 * fs), 700, true);
      const tw = Math.ceil(ctx.measureText(t).width) + 22;
      drawPanel(ctx, x, y, tw, 20, { variant: "glass", chamfer: 5 });
      ctx.fillStyle = "#b9d4ea";
      ctx.textAlign = "left";
      ctx.fillText(t, x + 11, y + 14);
      x += tw + 6;
    }
    const diff = game.settings.difficulty;
    x += drawCaption(ctx, x, y + 1, DIFF_NAMES[diff] || "NORMAL", { size: Math.round(9 * fs), scheme: DIFF_SCHEMES[diff] || "steel" }).w + 6;
    if (game.mode === "campaign" && game.ngPlusCycle > 0) {
      drawCaption(ctx, x, y + 1, game.ngPlusCycle >= 3 ? "NG+3 FINAL" : `NG+${game.ngPlusCycle}`, { size: Math.round(9 * fs), scheme: game.ngPlusCycle >= 3 ? "amber" : "violet" });
    }
  }

  // Top-centre compass + boss.
  const cw = Math.round(Math.min(440, w * 0.34));
  drawCompass(game, ctx, w / 2, m - 8, cw, false);
  drawBossBar(game, ctx, w, fs, m + 56);

  // Top-right chips, minimap, kill feed.
  const right = w - m;
  let chipsRight = right;
  if (game.settings.showScore && game.mode !== "arena" && game.mode !== "meltdown") {
    chipsRight -= chip(ctx, chipsRight, m - 8, "SCORE", `${Math.round(M.scoreShown)}`, UI.cyan, fs, 0) + 6;
  }
  if (game.settings.showKills) {
    const pop = since(M.killAt, 320);
    chip(ctx, chipsRight, m - 8, "KILLS", `${game.killedEnemies}/${game.totalEnemies}`, UI.crimson, fs, pop >= 0 ? 1 - pop : 0);
  }
  let mm = Math.round(game.settings.minimapSize * 0.8);
  if (game.isTouchDevice && w < 700) mm = Math.min(mm, Math.round(w * 0.24));
  const mmY = m + 30;
  drawMinimap(ctx, right - mm, mmY, mm, mm, minimapState);
  drawKillFeed(ctx, right, mmY + mm + 12, fs);

  // Lower-left vitals.
  const R = Math.round(60 * f);
  const tw = Math.max(6, Math.round(10 * f));
  const gcx = m + R + tw + 14;
  const gcy = h - m - R - tw - 8;
  const g = drawGauge(game, ctx, gcx, gcy, R, tw, portraitState, false);
  drawVitalsReadout(game, ctx, g.right, gcy + 4, f, fs, g.low, false);

  // Lower-right weapon.
  drawWeaponBlock(game, ctx, right, h - m - 14, f, fs, false);
}

let _safeKey = "";
let _safe = { left: 0, right: 0 };
function safeInsets(w, h) {
  const key = `${w}x${h}`;
  if (key !== _safeKey) {
    _safeKey = key;
    try {
      const cs = getComputedStyle(document.documentElement);
      _safe = { left: parseFloat(cs.getPropertyValue("--sal")) || 0, right: parseFloat(cs.getPropertyValue("--sar")) || 0 };
    } catch (_) {
      _safe = { left: 0, right: 0 };
    }
  }
  return _safe;
}

/**
 * Landscape phone Vanguard. Touch controls own the lower corners, so vitals
 * move to the top-left and the weapon block to the bottom centre. The minimap
 * and pause buttons (top-right) are drawn by hud.js / touch.js.
 */
export function renderVanguardCompact(game, ctx, w, h, barH, f, portraitState) {
  const fs = (game.settings.fontScale || 100) / 100;
  const sa = safeInsets(w, h);
  const left = 10 + sa.left;

  const R = Math.round(27 * f);
  const tw = Math.max(4, Math.round(6 * f));
  const gcx = left + R + tw + 10;
  const gcy = 10 + R + tw + 8;
  const g = drawGauge(game, ctx, gcx, gcy, R, tw, portraitState, true);
  const by = drawVitalsReadout(game, ctx, g.right, gcy + 2, f, fs, g.low, true);
  const diff = ["EASY", "NORM", "HARD", "NITE"][game.settings.difficulty] || "NORM";
  const clock = game.roundStartTime && game.mode !== "arena" ? elapsed(game) : game.mode === "arena" ? `${Math.ceil(game.arenaTimer)}s  R${game.arenaRound}` : "";
  ctx.font = uiFont(9, 700, true);
  ctx.fillStyle = UI.textDim;
  ctx.textAlign = "left";
  ctx.fillText(`${clock}${clock ? "  ·  " : ""}${diff}`, g.right, by + 8);

  const cw = Math.round(w * 0.24);
  drawCompass(game, ctx, w / 2 - w * 0.04, 6, cw, true);
  drawBossBar(game, ctx, w, fs, 44);

  // Kills / score left of the minimap.
  let mm = Math.min(game.settings.minimapSize, Math.round(w * 0.18));
  let chipsRight = w - mm - 22 - sa.right;
  if (game.settings.showKills) {
    const pop = since(M.killAt, 320);
    chipsRight -= chip(ctx, chipsRight, 10, "KILLS", `${game.killedEnemies}/${game.totalEnemies}`, UI.crimson, fs * 0.9, pop >= 0 ? 1 - pop : 0) + 4;
  }
  if (game.settings.showScore) {
    chip(ctx, chipsRight, 10, "SCORE", `${Math.round(M.scoreShown)}`, UI.cyan, fs * 0.9, 0);
  }
  drawKillFeed(ctx, w - mm - 22 - sa.right, 42, fs * 0.9);

  drawWeaponBlock(game, ctx, Math.round(w / 2 + 70), h - 12, f, fs, true);
}
