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

// Drawn through the HUD skin: Modern forwards to the UI kit unchanged,
// Realistic gets thin strokes and soft plates (see hud-skin.js).
import {
  UI,
  HT,
  uiFont,
  track,
  drawPanel,
  drawCaption,
  drawBar,
  cachedSprite,
  blitSprite,
} from "./hud-skin.js";
import { hudMotion as M, since, easeOut } from "./hud-motion.js";
import { healthTone, ghostFor, noteHealth, drawTopLeftStack, drawBossBar } from "./hud-modern.js";
import { drawPortrait } from "./portrait.js";
import { drawMinimap } from "./minimap.js";
import { silhouetteLayers, SILHOUETTE_BOX, drawWeaponIcon } from "./weapon-silhouettes.js";
import { WEAPONS } from "../../js/data.js";
import { reticlePoint } from "../systems/aim.js";

const TAU = Math.PI * 2;
const A0 = Math.PI * 0.75; // gauge opens at the bottom: 135° → 405°
const SPAN = Math.PI * 1.5;
const DIFF_NAMES = ["EASY", "NORMAL", "HARD", "NIGHTMARE"];
const DIFF_SCHEMES = ["steel", "cyan", "amber", "crimson"];
const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function text(ctx, str, x, y, size, color, align = "left", weight = 700, spacing = 0, mono = false) {
  ctx.font = uiFont(size, weight, mono);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if (spacing) spacing = track(size, spacing);
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

// Realistic gauge: hairline rims, a thin tube, no ink, no gloss. `aw` is the
// realistic tube width (thinner than Modern's `tw`, same radius).
function paintGaugeBackReal(g, S, R, tw, aw) {
  const c = S / 2;
  const r0 = R - tw / 2 - 5;
  const Rs = R + tw / 2 + 5;
  // Smoked annulus whose outer edge falls off softly into the scene.
  const fall = g.createRadialGradient(c, c, r0, c, c, R + 17);
  fall.addColorStop(0, "rgba(8,11,13,0.52)");
  fall.addColorStop(0.7, "rgba(8,11,13,0.4)");
  fall.addColorStop(1, "rgba(8,11,13,0)");
  g.beginPath();
  g.arc(c, c, R + 17, 0, TAU);
  g.arc(c, c, r0, 0, TAU, true);
  g.fillStyle = fall;
  g.fill("evenodd");
  g.lineCap = "butt";
  g.strokeStyle = "rgba(205,216,216,0.11)";
  g.lineWidth = aw;
  g.beginPath();
  g.arc(c, c, R, A0, A0 + SPAN);
  g.stroke();
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(c, c, Rs, A0, A0 + SPAN);
  g.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = A0 + (SPAN * i) / 10;
    const long = i % 5 === 0;
    const r1 = Rs + 4;
    const r2 = r1 + (long ? 5 : 2.5);
    g.beginPath();
    g.moveTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    g.lineTo(c + Math.cos(a) * r2, c + Math.sin(a) * r2);
    g.lineWidth = 1;
    g.strokeStyle = long ? "rgba(220,228,226,0.5)" : "rgba(200,210,210,0.26)";
    g.stroke();
  }
}

function paintGaugeGapsReal(g, S, R, tw, aw, segments) {
  const c = S / 2;
  g.strokeStyle = "rgba(4,6,8,0.6)";
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 1; i < segments; i++) {
    const a = A0 + (SPAN * i) / segments;
    g.moveTo(c + Math.cos(a) * (R - aw / 2), c + Math.sin(a) * (R - aw / 2));
    g.lineTo(c + Math.cos(a) * (R + aw / 2), c + Math.sin(a) * (R + aw / 2));
  }
  g.stroke();
  const r0 = R - tw / 2 - 5;
  g.lineWidth = 1;
  g.strokeStyle = "rgba(220,228,226,0.32)";
  g.beginPath();
  g.arc(c, c, r0, 0, TAU);
  g.stroke();
}

/** Holographic falloff over the medallion: edges sink, faint projector lines. */
function paintMedallionHolo(g, S) {
  const c = S / 2;
  const v = g.createRadialGradient(c, c * 0.9, S * 0.18, c, c, c);
  v.addColorStop(0, "rgba(6,9,11,0)");
  v.addColorStop(1, "rgba(6,9,11,0.6)");
  g.fillStyle = v;
  g.fillRect(0, 0, S, S);
  g.fillStyle = "rgba(143,188,196,0.07)";
  g.fillRect(0, 0, S, S);
  g.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 1; y < S; y += 3) g.fillRect(0, y, S, 1);
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

  const real = HT.realistic;
  const aw = real ? Math.max(3, Math.round(tw * 0.5)) : tw;
  if (real) blitSprite(ctx, cachedSprite(ctx, `vgr-back:${R}:${tw}`, S, S, 0, (g) => paintGaugeBackReal(g, S, R, tw, aw)), bx + jolt, by, S, S);
  else blitSprite(ctx, cachedSprite(ctx, `vg-back:${R}:${tw}`, S, S, 0, (g) => paintGaugeBack(g, S, R, tw)), bx + jolt, by, S, S);

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
  if (real) blitSprite(ctx, cachedSprite(ctx, `vgr-holo:${md}`, md, md, 0, (g) => paintMedallionHolo(g, md)), cx - r0, cy - r0, md, md);
  ctx.restore();

  ctx.lineCap = "butt";
  const end = A0 + SPAN * pct;
  if (ghost > pct) arc(ctx, cx, cy, R, end, A0 + SPAN * ghost, aw, UI.ghost);
  if (low && !real) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
    arc(ctx, cx, cy, R, A0, end, tw + 7, `rgba(255,42,74,${(0.12 + 0.2 * pulse).toFixed(3)})`);
  }
  arc(ctx, cx, cy, R, A0, end, aw, tone);

  // Heal: a bright sweep races from the old value to the new one.
  const heal = since(M.healAt, 750);
  if (heal >= 0) {
    const from = A0 + SPAN * M.healFrom;
    const head = from + (A0 + SPAN * M.healTo - from) * easeOut(Math.min(1, heal * 1.8));
    if (!real) arc(ctx, cx, cy, R, from, head, tw + 4, `rgba(${UI.healRGB},${(0.35 * (1 - heal)).toFixed(3)})`);
    arc(ctx, cx, cy, R, from, head, aw, `rgba(${UI.healCore},${(0.9 * (1 - heal)).toFixed(3)})`);
    ctx.fillStyle = `rgba(255,255,255,${(1 - heal).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(head) * R, cy + Math.sin(head) * R, aw * 0.55, 0, TAU);
    ctx.fill();
  }
  if (pct > 0 && pct < 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = real ? 1 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(end) * (R - aw / 2), cy + Math.sin(end) * (R - aw / 2));
    ctx.lineTo(cx + Math.cos(end) * (R + aw / 2), cy + Math.sin(end) * (R + aw / 2));
    ctx.stroke();
  }

  // Shield arc + shatter.
  const Rs = R + tw / 2 + 5;
  if (p.maxShield > 0) {
    const sp = Math.max(0, p.shield / p.maxShield);
    arc(ctx, cx, cy, Rs, A0, A0 + SPAN * sp, real ? 1.5 : 3, p.shield < p.maxShield ? UI.shield : UI.shieldFull);
    const rs = since(M.shieldRestoreAt, 400);
    if (rs >= 0) arc(ctx, cx, cy, Rs, A0, A0 + SPAN * sp, real ? 3 : 6, `rgba(${UI.shieldRGB},${(0.5 * (1 - rs)).toFixed(3)})`);
  }
  const brk = since(M.shieldBreakAt, 700);
  if (brk >= 0 && M.shards) {
    const e = easeOut(brk);
    ctx.fillStyle = `rgba(${UI.shardRGB},${(1 - brk).toFixed(3)})`;
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
      if (!real) ctx.stroke();
      ctx.fill();
    }
  }

  if (p.chronoActive) {
    const a = (now * 0.0035) % TAU;
    arc(ctx, cx, cy, R + 15, 0, TAU, real ? 1 : 2, UI.chronoRing);
    arc(ctx, cx, cy, R + 15, a, a + 1.1, real ? 1.5 : 3.5, UI.chrono);
    arc(ctx, cx, cy, R + 15, a + Math.PI, a + Math.PI + 0.5, real ? 1 : 2.5, UI.chronoTail);
  }

  if (real) blitSprite(ctx, cachedSprite(ctx, `vgr-gaps:${R}:${tw}`, S, S, 0, (g) => paintGaugeGapsReal(g, S, R, tw, aw, compact ? 10 : 20)), bx + jolt, by, S, S);
  else blitSprite(ctx, cachedSprite(ctx, `vg-gaps:${R}:${tw}`, S, S, 0, (g) => paintGaugeGaps(g, S, R, tw, compact ? 10 : 20)), bx + jolt, by, S, S);

  if (low) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
    ctx.strokeStyle = `rgba(${UI.critRGB},${(0.4 + 0.5 * pulse).toFixed(3)})`;
    ctx.lineWidth = real ? 1.25 : 2;
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
  const head = low ? "CRITICAL" : p.chronoActive ? "CHRONO SHIFT" : "VITALS";
  text(ctx, head, x, numY - size - 2, labelSize,
    low ? (Math.sin(M.now * 0.012) > 0 ? UI.crimson : UI.critSoft) : p.chronoActive ? UI.chronoText : UI.textDim, "left", 800, 2);
  if (p.maxShield > 0 && !compact) {
    ctx.font = uiFont(labelSize, 700);
    ctx.letterSpacing = `${track(labelSize, 2)}px`;
    const lw = ctx.measureText(head).width;
    ctx.letterSpacing = "0px";
    text(ctx, `SHIELD ${Math.ceil(p.shield)}`, x + lw + 14, numY - size - 2, labelSize, UI.shieldFull, "left", 700, 1);
  }
  ctx.font = uiFont(size, 800);
  const nw = ctx.measureText(num).width;
  if (HT.outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = UI.ink;
    ctx.strokeText(num, x, numY);
  }
  ctx.fillStyle = flash ? UI.flash : low ? UI.critText : UI.text;
  ctx.fillText(num, x, numY);
  text(ctx, `/${p.maxHealth}`, x + nw + 4, numY, Math.round((compact ? 10 : 13) * fs), UI.textFaint, "left", 700);

  // Angled stamina / chrono bars.
  const bw = Math.round((compact ? 92 : 150) * f);
  const bh = Math.max(3, Math.round((compact ? 4 : 5) * f));
  const staminaPct = p.stamina / p.maxStamina;
  const chronoPct = p.chronoEnergy / p.maxChronoEnergy;
  const active = p.isSprinting || p.isDashing;
  const stColor = p.isDashing ? UI.dash : p.isSprinting ? UI.amber : staminaPct > 0.3 ? UI.cyan : UI.crimson;
  const rows = [[staminaPct, stColor, active, p.isDashing ? "DASH" : p.isSprinting ? "SPRINT" : "STA"]];
  if (chronoPct > 0.005 || p.chronoActive) {
    rows.push([chronoPct, p.chronoActive ? UI.chrono : chronoPct >= 0.15 ? UI.violet : UI.chronoDim, p.chronoActive, p.chronoActive ? "SHIFT" : "CHR"]);
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

// Weapons with a fire interval this long show a charge/pump meter between shots.
const CYCLE_MIN_MS = 500;
const CYCLE_LABEL = { 1: "PUMP", 3: "CHARGING", 4: "PUMP", 5: "BOLT", 7: "CHARGING" };

let _slotX = -1;

function drawWeaponSilhouette(ctx, wep, x, y, W, H, alpha, heat) {
  if (!wep) return;
  const dpr = ctx.getTransform().a || 1;
  const k = (W / SILHOUETTE_BOX[2]) * dpr;
  const layers = silhouetteLayers(wep.id, wep.color, k);
  if (!layers) return;
  ctx.globalAlpha = alpha * (HT.realistic ? 0.82 : 1);
  ctx.drawImage(layers.body, x, y, W, H);
  // Realistic: no neon emissive channel, only the heat build-up below.
  if (layers.glow && !HT.realistic) {
    ctx.globalAlpha = alpha * (0.75 + 0.25 * Math.sin(M.now * 0.004));
    ctx.drawImage(layers.glow, x, y, W, H);
  }
  // Sustained fire: the emissive channels run hot orange.
  if (heat > 0.35) {
    const hot = silhouetteLayers(wep.id, UI.heatGlow, k);
    if (hot?.glow) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * Math.min(1, (heat - 0.35) / 0.5) * (HT.realistic ? 0.5 : 1);
      ctx.drawImage(hot.glow, x, y, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  ctx.globalAlpha = 1;
}

/** Thin labelled meter, right-aligned at `right`. */
function statusMeter(ctx, right, y, labelText, pct, color, fs, flash) {
  const bw = 64;
  const th = HT.outline ? 4 : 2;
  if (HT.outline) {
    ctx.fillStyle = UI.ink;
    ctx.fillRect(right - bw - 1, y - 5, bw + 2, 6);
  }
  ctx.fillStyle = UI.track;
  ctx.fillRect(right - bw, y - th, bw, th);
  ctx.fillStyle = color;
  ctx.fillRect(right - bw, y - th, bw * Math.max(0, Math.min(1, pct)), th);
  text(ctx, labelText, right - bw - 8, y, Math.round(9 * fs), flash ? UI.flash : color, "right", 800, 1.5);
}

function drawPickupToasts(ctx, right, bottom, fs, alignRight = true) {
  let y = bottom;
  const size = Math.round(11 * fs);
  for (const t of M.toasts) {
    const age = M.now - t.at;
    const inK = Math.min(1, age / 200);
    const outK = age > 2100 ? (age - 2100) / 500 : 0;
    const h = Math.round(size * 1.65);
    y -= h + 5;
    ctx.globalAlpha = Math.max(0, inK * (1 - outK));
    const dx = (1 - easeOut(inK)) * 36;
    drawCaption(ctx, right + dx, y, t.text, { size, scheme: t.scheme, align: alignRight ? "right" : "center" });
  }
  ctx.globalAlpha = 1;
  return y;
}

function drawWeaponBlock(game, ctx, right, bottom, f, fs, compact) {
  const p = game.player;
  const wep = p.getWeaponDef();
  const ammo = p.ammo;
  const sidearm = wep && wep.id === 0; // the pistol never spends ammo
  const empty = !!wep && !sidearm && ammo < (wep.ammoPerShot || 1);
  const low = !sidearm && ammo <= 10;
  const numSize = Math.round((compact ? 30 : 56) * fs);
  const blink = Math.sin(M.now * 0.012) > 0;

  // Ammo count: kick on every shot, slow pulse when running low.
  const shot = since(M.shotAt, 160);
  const kick = shot >= 0 ? 1 - shot : 0;
  const lowPulse = low ? 0.5 + 0.5 * Math.sin(M.now * 0.009) : 0;
  const numStr = `${ammo}`;
  ctx.font = uiFont(numSize, 800);
  const nw = ctx.measureText(numStr).width;
  if (low && !compact) {
    ctx.globalAlpha = 0.25 + 0.5 * lowPulse;
    ctx.fillStyle = HT.realistic ? UI.amber : UI.crimson;
    ctx.fillRect(right - nw - 6, bottom + 4, nw + 6, HT.realistic ? 1 : 2);
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(right, bottom);
  const sc = 1 + 0.12 * kick * kick + 0.04 * lowPulse;
  ctx.scale(sc, sc);
  ctx.translate(0, -kick * 2);
  ctx.textAlign = "right";
  if (HT.outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = UI.ink;
    ctx.strokeText(numStr, 0, 0);
  }
  // Realistic: running low is a warning (amber); only an empty mag goes red.
  ctx.fillStyle = kick > 0.55 ? UI.flash : empty ? UI.crimson : low ? (HT.realistic ? (lowPulse > 0.5 ? UI.amber : UI.ammoLowPale) : lowPulse > 0.5 ? UI.critText : UI.ammoLowPale) : UI.ammo;
  ctx.fillText(numStr, 0, 0);
  ctx.restore();

  if (!compact) {
    const tag = empty ? "EMPTY" : low ? "LOW AMMO" : sidearm ? "SIDEARM ∞" : "AMMO";
    const warn = HT.realistic && !empty;
    text(ctx, tag, right - nw - 12, bottom - 3, Math.round(10 * fs),
      empty || low ? (blink ? (warn ? UI.amber : UI.crimson) : warn ? UI.ammoLowPale : UI.critSoft) : UI.textDim, "right", 800, 2);
  }

  // Round pips (last 30) with the spent round dropping out.
  if (!compact) {
    const pips = Math.min(ammo, 30);
    const pw = 3;
    const gap = 2;
    const py = bottom + 10;
    const ph = HT.outline ? 7 : 5;
    if (HT.outline) {
      ctx.fillStyle = UI.ink;
      ctx.fillRect(right - 30 * (pw + gap) - 1, py - 1, 30 * (pw + gap) + 1, 9);
    }
    const pipColor = low
      ? (HT.realistic ? UI.amber : `rgba(255,42,74,${(0.55 + 0.45 * lowPulse).toFixed(3)})`)
      : UI.pip;
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = i < pips ? pipColor : UI.pipEmpty;
      ctx.fillRect(right - (i + 1) * (pw + gap), py, pw, ph);
    }
    if (shot >= 0 && ammo < 30 && !sidearm) {
      const x = right - (pips + 1) * (pw + gap);
      ctx.globalAlpha = 1 - shot;
      ctx.fillStyle = UI.pipSpent;
      ctx.save();
      ctx.translate(x + pw / 2 + shot * 10, py + 3 + shot * shot * 26);
      ctx.rotate(shot * 4);
      ctx.fillRect(-pw / 2, -3.5, pw, 7);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  // Weapon profile + name, sliding in after a switch.
  const sw = since(M.switchAt, 240);
  const slide = sw >= 0 ? easeOut(sw) : 1;
  const W = Math.round((compact ? 84 : 168) * f);
  const H = Math.round(W * (SILHOUETTE_BOX[3] / SILHOUETTE_BOX[2]));
  const nameSize = Math.round((compact ? 9 : 12) * fs);
  const alpha = slide * (empty ? 0.55 : 1);
  if (compact) {
    // Phone: profile sits left of the count to stay out of the thumbs.
    const sx = right - nw - 10 - W;
    drawWeaponSilhouette(ctx, wep, sx + (1 - slide) * 18, bottom - H + 4, W, H, alpha, M.heat);
    if (wep) text(ctx, wep.name.toUpperCase(), right, bottom - numSize - 2, nameSize, empty ? UI.crimson : UI.text, "right", 700, 1);
    drawPickupToasts(ctx, right, bottom - numSize - nameSize - 8, fs * 0.85);
    return;
  }

  // Status row: charge/pump meter between slow shots, else barrel heat.
  let y = bottom - numSize - 10;
  const fireRate = wep ? wep.fireRate / (p.fireRateMultiplier || 1) : 0;
  const cycle = wep ? (game.time - (p.lastFireTime || 0)) / fireRate : 1;
  if (wep && fireRate >= CYCLE_MIN_MS && cycle >= 0 && cycle < 1) {
    statusMeter(ctx, right, y, CYCLE_LABEL[wep.id] || "CYCLE", cycle, UI.cyan, fs, false);
    y -= 14;
  } else if (M.heat > 0.08) {
    const hot = M.heat > 0.7;
    statusMeter(ctx, right, y, hot ? "HOT" : "HEAT", M.heat, hot ? UI.crimson : UI.amber, fs, hot && blink);
    y -= 14;
  }

  if (wep) {
    ctx.globalAlpha = slide;
    // Realistic: the weapon's own colour tick becomes the one accent.
    ctx.fillStyle = HT.realistic ? UI.accent : wep.color;
    ctx.fillRect(right - (HT.realistic ? 1 : 3), y - nameSize + 1, HT.realistic ? 1 : 3, nameSize);
    text(ctx, wep.name.toUpperCase(), right - 10 + (1 - slide) * 18, y, nameSize, empty ? UI.critSoft : UI.text, "right", 800, 1.5);
    ctx.globalAlpha = 1;
  }
  y -= nameSize + 6;
  drawWeaponSilhouette(ctx, wep, right - W + (1 - slide) * 24, y - H, W, H, alpha, M.heat);
  y -= H + 8;

  // Arsenal strip: every carried weapon as a small profile, so the player
  // sees what they have without cycling. The one in hand is lit.
  if (game.settings.showWeapons && p.weapons.length > 1) {
    const cw = Math.round(54 * f);
    const ch = Math.round(24 * f);
    const gap = 4;
    const n = p.weapons.length;
    const x0 = right - n * (cw + gap) + gap;
    const target = x0 + p.currentWeapon * (cw + gap);
    _slotX = _slotX < 0 ? target : _slotX + (target - _slotX) * 0.35;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (cw + gap);
      const on = i === p.currentWeapon;
      if (HT.outline) {
        ctx.fillStyle = UI.ink;
        ctx.fillRect(x - 1, y - ch - 1, cw + 2, ch + 2);
      }
      ctx.fillStyle = on ? UI.slotOn : UI.slotOff;
      ctx.fillRect(x, y - ch, cw, ch);
      const wd = WEAPONS[p.weapons[i]];
      if (wd) drawWeaponIcon(ctx, wd.id, wd.color, x + 3, y - ch + 2, cw - 6, ch - 4, { alpha: on ? 1 : 0.55, glow: on ? 1 : 0 });
      text(ctx, `${i + 1}`, x + 3, y - ch + 9, 8, on ? UI.flash : UI.textDim, "left", 700);
    }
    ctx.fillStyle = UI.cyan;
    ctx.fillRect(Math.round(_slotX), y + 2, cw, HT.outline ? 2 : 1);
    y -= ch + 8;
  }
  drawPickupToasts(ctx, right, y, fs);
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

/** Realistic tape: a soft band that falls off at both ends, hairline rules. */
function paintTapeReal(g, W, H) {
  const fade = (rgb, a) => {
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, `rgba(${rgb},0)`);
    grad.addColorStop(0.2, `rgba(${rgb},${a})`);
    grad.addColorStop(0.8, `rgba(${rgb},${a})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    return grad;
  };
  g.fillStyle = fade("8,11,13", 0.42);
  g.fillRect(0, 0, W, H);
  g.fillStyle = fade("220,228,226", 0.22);
  g.fillRect(0, 0, W, 1);
  g.fillStyle = fade("220,228,226", 0.12);
  g.fillRect(0, H - 1, W, 1);
  // Centre caret: a thin open chevron under the tape.
  const c = W / 2;
  g.strokeStyle = HT.accent;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(c - 4, H + 5);
  g.lineTo(c, H + 1);
  g.lineTo(c + 4, H + 5);
  g.stroke();
}

let _exitMap = null;
let _exit = null;
/** The level exit, looked up once per map (compass fallback objective). */
function findExit(game) {
  if (game.mode !== "campaign") return null;
  if (_exitMap !== game.map || (_exit && !game.entities.includes(_exit))) {
    _exitMap = game.map;
    _exit = game.entities.find((e) => e.type === "exit") || null;
  }
  return _exit;
}

function drawCompass(game, ctx, cx, y, W, compact) {
  const H = compact ? 20 : 24;
  const x0 = Math.round(cx - W / 2);
  const real = HT.realistic;
  if (real) blitSprite(ctx, cachedSprite(ctx, `vgr-tape:${W}:${H}`, W, H + 8, 0, (g) => paintTapeReal(g, W, H)), x0, y, W, H + 8, 0);
  else blitSprite(ctx, cachedSprite(ctx, `vg-tape:${W}:${H}`, W, H + 8, 0, (g) => paintTape(g, W, H)), x0, y, W, H + 8, 0);
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
        name === "N" ? UI.cyan : UI.text, "center", real ? 500 : 800);
    } else {
      ctx.globalAlpha = Math.max(0, edge) ** 0.6 * 0.8;
      ctx.fillStyle = UI.textDim;
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
    if (!real) {
      ctx.fillStyle = UI.ink;
      ctx.beginPath();
      ctx.moveTo(x - s - 1.5, y + H + 1);
      ctx.lineTo(x + s + 1.5, y + H + 1);
      ctx.lineTo(x, y + H - s - 2.5);
      ctx.fill();
    }
    ctx.fillStyle = wind ? UI.critPale : UI.crimson;
    ctx.beginPath();
    ctx.moveTo(x - s, y + H);
    ctx.lineTo(x + s, y + H);
    ctx.lineTo(x, y + H - s);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Objective marker (clamped to the tape ends when behind).
  const exit = game.objectiveWaypoint ? null : findExit(game);
  const wp = game.objectiveWaypoint || exit;
  if (wp) {
    // The exit reads dim until the level is cleared, then lights up.
    const cleared = !exit || (game.totalEnemies > 0 && game.killedEnemies >= game.totalEnemies);
    const rel = bearingTo(wp.x, wp.y);
    const clamped = Math.max(-RANGE, Math.min(RANGE, rel));
    const x = cx + clamped * ppd;
    const r = real ? 4.5 : 5.5;
    if (!real) {
      ctx.fillStyle = UI.ink;
      ctx.beginPath();
      ctx.moveTo(x, mid - r - 2); ctx.lineTo(x + r + 2, mid); ctx.lineTo(x, mid + r + 2); ctx.lineTo(x - r - 2, mid);
      ctx.fill();
    }
    const pulse = cleared ? 0.7 + 0.3 * Math.sin(M.now * 0.008) : 0.35;
    ctx.fillStyle = `rgba(${UI.objectiveRGB},${(real ? pulse * 0.35 : pulse).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x, mid - r); ctx.lineTo(x + r, mid); ctx.lineTo(x, mid + r); ctx.lineTo(x - r, mid);
    ctx.fill();
    if (real) {
      // Hairline diamond: the marker reads as an outline, not a solid chip.
      ctx.strokeStyle = `rgba(${UI.objectiveRGB},${Math.min(1, pulse + 0.2).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.closePath();
      ctx.stroke();
    }
    if (!compact) {
      const dist = Math.round(Math.hypot(wp.x - p.x, wp.y - p.y) * 2);
      const tag = exit ? `EXIT ${dist}m` : `${dist}m`;
      ctx.globalAlpha = cleared ? 1 : 0.55;
      text(ctx, Math.abs(rel) > RANGE ? (rel < 0 ? `◀ ${tag}` : `${tag} ▶`) : tag, x, y + H + 18, 10, UI.energy, "center", 700, 1);
      ctx.globalAlpha = 1;
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
  const { x: cx, y: cy } = reticlePoint(w, h, barH, p);
  const r = Math.min(w, h - barH) * 0.16;
  const ink = HT.outline;
  ctx.lineCap = "butt";

  // Chrono shift: a faint violet ring with a sweeping hand.
  if (p.chronoActive) {
    const a = (M.now * 0.004) % TAU;
    ctx.globalAlpha = 0.18;
    arc(ctx, cx, cy, r, 0, TAU, ink ? 1.5 : 1, UI.violet);
    ctx.globalAlpha = 0.7;
    arc(ctx, cx, cy, r, a, a + 0.9, ink ? 3 : 1.5, UI.chrono);
    ctx.globalAlpha = 1;
  }

  // Hit marker: four short ticks flash on the ring; a kill snaps them in and
  // closes a crimson ring.
  const hit = since(M.hitMarkerAt, 220);
  if (hit >= 0) {
    const kill = since(M.killConfirmAt, 420);
    const rr = r * (0.34 - 0.06 * easeOut(hit));
    ctx.globalAlpha = 1 - hit;
    const col = M.hitCrit ? UI.gold : UI.flash;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      if (ink) arc(ctx, cx, cy, rr, a - 0.2, a + 0.2, 4, UI.ink);
      arc(ctx, cx, cy, rr, a - 0.18, a + 0.18, ink ? 2 : 1.5, col);
    }
    ctx.globalAlpha = 1;
    if (kill >= 0) {
      ctx.globalAlpha = 1 - kill;
      if (ink) arc(ctx, cx, cy, rr + 6 * easeOut(kill), 0, TAU, 4, UI.ink);
      arc(ctx, cx, cy, rr + 6 * easeOut(kill), 0, TAU, ink ? 2 : 1.25, UI.crimson);
      ctx.globalAlpha = 1;
    }
  } else {
    const kill = since(M.killConfirmAt, 420);
    if (kill >= 0) {
      ctx.globalAlpha = 1 - kill;
      arc(ctx, cx, cy, r * 0.28 + 8 * easeOut(kill), 0, TAU, ink ? 2 : 1.25, UI.crimson);
      ctx.globalAlpha = 1;
    }
  }
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
    if (ink) arc(ctx, cx, cy, r, a - span, a + span, wind ? 7 : 5, UI.ink);
    arc(ctx, cx, cy, r, a - span, a + span, ink ? (wind ? 4 : 2.5) : wind ? 2 : 1.5, wind ? (Math.sin(M.now * 0.03) > 0 ? UI.flash : UI.crimson) : UI.crimson);
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
    ctx.lineWidth = HT.outline ? 2 : 1;
    ctx.strokeRect(x - 2 - pop * 3, y - 2 - pop * 3, pw + 4 + pop * 6, 30 + pop * 6);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "middle";
  text(ctx, labelText, x + 11, y + 14, Math.round(9 * fs), accent === UI.crimson ? UI.critSoft : UI.chipLabel, "left", 700, 1.5);
  text(ctx, value, right - 10, y + 14, valSize, pop > 0.4 ? UI.flash : UI.text, "right", 800);
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

// ─── Minimap frame ──────────────────────────────────────────────────────────

/** Realistic minimap bezel: hairline edge that fades mid-side, corner ticks. */
function paintMapFrame(g, S) {
  const edge = (x0, y0, x1, y1) => {
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, "rgba(220,228,226,0.42)");
    grad.addColorStop(0.5, "rgba(220,228,226,0.1)");
    grad.addColorStop(1, "rgba(220,228,226,0.42)");
    return grad;
  };
  g.fillStyle = edge(0, 0, S, 0);
  g.fillRect(0, 0, S, 1);
  g.fillRect(0, S - 1, S, 1);
  g.fillStyle = edge(0, 0, 0, S);
  g.fillRect(0, 0, 1, S);
  g.fillRect(S - 1, 0, 1, S);
  g.fillStyle = HT.accent;
  const t = Math.max(6, Math.round(S * 0.08));
  g.fillRect(0, 0, t, 1);
  g.fillRect(0, 0, 1, t);
  g.fillRect(S - t, S - 1, t, 1);
  g.fillRect(S - 1, S - t, 1, t);
}

/**
 * Minimap in the Vanguard slot. Realistic sits it on a soft plate and clips
 * away the Modern chamfered ink bezel that minimap.js draws, then adds a
 * hairline frame; the map content itself is minimap.js's.
 */
function drawVanguardMinimap(ctx, x, y, s, minimapState) {
  if (!HT.realistic) {
    drawMinimap(ctx, x, y, s, s, minimapState);
    return;
  }
  drawPanel(ctx, x - 3, y - 3, s + 6, s + 6, {});
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();
  drawMinimap(ctx, x, y, s, s, minimapState);
  ctx.restore();
  blitSprite(ctx, cachedSprite(ctx, `vgr-mapframe:${s}`, s + 6, s + 6, 0, (g) => paintMapFrame(g, s + 6)), x - 3, y - 3, s + 6, s + 6);
}

// ─── Layouts ────────────────────────────────────────────────────────────────

/**
 * Vanguard is laid out for 1280×720. On a bigger screen the whole layer
 * scales up with it (to 1.6×), so 1080p and 1440p get the same composition
 * rather than the same pixels huddled in the corners. Sprites and profiles
 * rasterise at the transformed size, so nothing goes soft.
 */
export function vanguardScale(w, h) {
  return Math.max(1, Math.min(1.6, Math.min(w / 1280, h / 720)));
}

/** Desktop / tablet Vanguard. Draws its own minimap. */
export function renderVanguardPanels(game, ctx, w, h, f, portraitState, minimapState) {
  const k = vanguardScale(w, h);
  ctx.save();
  ctx.scale(k, k);
  layoutVanguardPanels(game, ctx, w / k, h / k, f, portraitState, minimapState);
  ctx.restore();
}

function layoutVanguardPanels(game, ctx, w, h, f, portraitState, minimapState) {
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
      ctx.fillStyle = UI.clock;
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
  drawVanguardMinimap(ctx, right - mm, mmY, mm, minimapState);
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
