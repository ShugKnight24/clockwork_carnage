/**
 * Modern-mode HUD layouts (graphic-novel realism). hud.js calls these in
 * place of the legacy panel blocks when isModernArt() is on; shared overlays
 * (crosshair, hit markers, kill streak, toasts, ARIA comms) stay in hud.js.
 *
 * Same anchors as the legacy layouts so nothing else on screen (minimap,
 * kill-streak banner, ARIA box, touch buttons) has to move. Static chrome is
 * cached by modern-ui-kit; per frame this only fills bars and draws numbers.
 */

// Drawn through the HUD skin: Modern forwards to the UI kit unchanged,
// Realistic gets thin strokes and soft plates (see hud-skin.js).
import {
  UI,
  HT,
  uiFont,
  track,
  drawPanel,
  drawBar,
  drawCaption,
  drawTitle,
  drawBrackets,
  inkText,
  pixelRatio,
} from "./hud-skin.js";
import { drawPortrait } from "./portrait.js";
import { getWeaponSprite } from "../assets/loader.js";
import { WEAPONS } from "../../js/data.js";
import { hudMotion as M, since, easeOut } from "./hud-motion.js";

const weaponSlug = (name) =>
  (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const DIFF_NAMES = ["EASY", "NORMAL", "HARD", "NIGHTMARE"];
const DIFF_SCHEMES = ["steel", "cyan", "amber", "crimson"];

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Legacy health thresholds → modern tones, keeping colour-blind remaps. */
export function healthTone(game, pct) {
  const legacy = pct > 0.6 ? "#00ff66" : pct > 0.3 ? "#ffaa00" : "#ff2200";
  const mapped = game.cbColor(legacy);
  if (mapped !== legacy) return mapped;
  return pct > 0.6 ? UI.green : pct > 0.3 ? UI.amber : UI.crimson;
}

function label(ctx, text, x, y, size, color, align = "left", spacing = 1) {
  ctx.font = uiFont(size, 700);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if (spacing) spacing = track(size, spacing);
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  if (spacing) ctx.letterSpacing = "0px";
}

function number(ctx, text, x, y, size, color, align = "left") {
  ctx.font = uiFont(size, 800);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

const bucket = (v, step = 8) => Math.ceil(v / step) * step;

function pulse(game, speed = 0.008) {
  return 0.5 + 0.5 * Math.sin((game.time || 0) * speed);
}

// Health "ghost": the chunk just lost lingers bright, then drains.
let _ghostPct = 1;
let _ghostHoldUntil = 0;
let _ghostLast = 0;
export function ghostFor(pct) {
  const now = performance.now();
  const dt = _ghostLast ? Math.min(0.1, (now - _ghostLast) / 1000) : 0;
  _ghostLast = now;
  if (pct >= _ghostPct) {
    _ghostPct = pct;
  } else if (now > _ghostHoldUntil) {
    _ghostPct = Math.max(pct, _ghostPct - dt * 0.7);
  }
  return _ghostPct;
}
/** Call when health drops so the ghost holds before draining. */
export function noteHealth(pct) {
  if (pct < _ghostPct - 0.001 && performance.now() > _ghostHoldUntil) {
    _ghostHoldUntil = performance.now() + 380;
  }
}

/** Bright sweep across a horizontal bar from the pre-heal value to the new one. */
function healSweep(ctx, x, y, w, h) {
  const k = since(M.healAt, 700);
  if (k < 0) return;
  const head = M.healFrom + (M.healTo - M.healFrom) * easeOut(Math.min(1, k * 1.8));
  if (head <= M.healFrom) return;
  ctx.fillStyle = `rgba(${UI.healCore},${(0.9 * (1 - k)).toFixed(3)})`;
  ctx.fillRect(x + w * M.healFrom, y, w * (head - M.healFrom), h);
  ctx.fillStyle = `rgba(255,255,255,${(1 - k).toFixed(3)})`;
  ctx.fillRect(x + w * head - 1.5, y - 2, 3, h + 4);
}

/** Shield bar shatter: shards burst off the bar and fall away. */
function shieldShards(ctx, x, y, w) {
  const k = since(M.shieldBreakAt, 650);
  if (k < 0 || !M.shards) return;
  const e = easeOut(k);
  ctx.fillStyle = `rgba(${UI.shardRGB},${(1 - k).toFixed(3)})`;
  for (const sh of M.shards) {
    const sx = x + w * sh.t + (sh.t - 0.5) * sh.v * e;
    const sy = y - sh.v * 0.35 * e + 40 * k * k;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(sh.spin * k);
    ctx.fillRect(-sh.size / 2, -sh.size / 4, sh.size, sh.size / 2);
    ctx.restore();
  }
}

/** Number that kicks (scale + white flash) right after a shot. */
function kickNumber(ctx, str, x, y, size, color, align) {
  const k = since(M.shotAt, 160);
  if (k < 0) {
    number(ctx, str, x, y, size, color, align);
    return;
  }
  const kick = 1 - k;
  ctx.save();
  ctx.translate(x, y);
  const sc = 1 + 0.1 * kick * kick;
  ctx.scale(sc, sc);
  number(ctx, str, 0, -kick * 1.5, size, kick > 0.55 ? UI.flash : color, align);
  ctx.restore();
}

function elapsedStr(game) {
  const s = Math.floor((performance.now() - game.roundStartTime) / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── Minimal (hudStyle 0) ───────────────────────────────────────────────────

/**
 * Replaces the legacy top-left stack, kills pill, boss bar, bottom-centre
 * vitals + weapon strip and bottom-right ammo readout.
 */
export function renderModernMinimalPanels(game, ctx, w, h, hudFactor) {
  const fs = (game.settings.fontScale || 100) / 100;
  drawTopLeftStack(game, ctx, fs);
  if (game.settings.showKills) drawKillsPill(game, ctx, w, fs);
  drawBossBar(game, ctx, w, fs);
  drawVitals(game, ctx, w, h, hudFactor, fs);
  drawAmmo(game, ctx, w, h, hudFactor, fs);
}

export function drawTopLeftStack(game, ctx, fs) {
  const x = 12;
  let y = 12;
  const gap = 6;

  if (game.mode === "campaign") {
    const name = game.map?.name || `Level ${game.campaignLevel + 1}`;
    y += drawCaption(ctx, x, y, name, { size: Math.round(11 * fs) }).h + gap + 2;
  }

  // Score + campaign clock share one plate.
  const showScore = game.settings.showScore;
  const showClock = game.mode === "campaign" && game.roundStartTime;
  if (showScore || showClock) {
    const valSize = Math.round(20 * fs);
    const lblSize = Math.round(9 * fs);
    const scoreStr = `${M.ready ? Math.round(M.scoreShown) : game.player.score}`;
    const clock = showClock ? elapsedStr(game) : "";
    ctx.font = uiFont(valSize, 800);
    const scoreW = showScore ? ctx.measureText(scoreStr).width : 0;
    ctx.font = uiFont(Math.round(15 * fs), 700, true);
    const clockW = showClock ? ctx.measureText(clock).width : 0;
    const innerW = Math.max(56, scoreW) + (showScore && showClock ? 22 : 0) + (showClock ? Math.max(40, clockW) : 0);
    const pw = bucket(innerW + 26, 12);
    const ph = Math.round(valSize + lblSize + 18);
    drawPanel(ctx, x, y, pw, ph, { accent: UI.cyan, chamfer: 8 });
    const ly = y + 8 + lblSize;
    const vy = y + ph - 8;
    if (showScore) {
      label(ctx, "SCORE", x + 13, ly, lblSize, UI.textDim);
      number(ctx, scoreStr, x + 13, vy, valSize, UI.text);
    }
    if (showClock) {
      const cx = x + pw - 13;
      label(ctx, "TIME", cx, ly, lblSize, UI.textDim, "right");
      ctx.font = uiFont(Math.round(15 * fs), 700, true);
      ctx.fillStyle = UI.clock;
      ctx.textAlign = "right";
      ctx.fillText(clock, cx, vy - 1);
    }
    y += ph + gap;
  }

  if (game.mode === "arena") {
    const secs = Math.ceil(game.arenaTimer);
    const warning = secs <= 10;
    const cleared = game.arenaClearTimer != null;
    const accent = cleared ? UI.green : warning ? UI.crimson : UI.cyan;
    const valSize = Math.round(26 * fs);
    const lblSize = Math.round(10 * fs);
    const pw = Math.round(150 * fs);
    const ph = Math.round(valSize + lblSize + 20);
    drawPanel(ctx, x, y, pw, ph, { accent, chamfer: 9, bar: warning || cleared });
    label(ctx, cleared ? "CLEARED" : `ROUND ${game.arenaRound}`, x + 13, y + 9 + lblSize, lblSize,
      cleared ? UI.green : UI.textDim);
    if (game.roundStartTime) {
      ctx.font = uiFont(lblSize, 600, true);
      ctx.fillStyle = UI.textFaint;
      ctx.textAlign = "right";
      ctx.fillText(elapsedStr(game), x + pw - 12, y + 9 + lblSize);
    }
    const flash = warning && !cleared && Math.floor(game.time / 250) % 2;
    number(ctx, `${secs}s`, x + 13, y + ph - 9, valSize,
      cleared ? UI.green : warning ? (flash ? UI.crimson : UI.amber) : UI.text);
    y += ph + gap;
  }

  // Difficulty + NG+ chips on one row.
  let cx = x;
  const chipSize = Math.round(9 * fs);
  const diff = game.settings.difficulty;
  cx += drawCaption(ctx, cx, y, DIFF_NAMES[diff] || "NORMAL", { size: chipSize, scheme: DIFF_SCHEMES[diff] || "steel" }).w + 6;
  let rowH = Math.round(chipSize * 1.65);
  if (game.mode === "campaign" && game.ngPlusCycle > 0) {
    const ngLabel = game.ngPlusCycle >= 3 ? "NG+3 FINAL" : `NG+${game.ngPlusCycle}`;
    drawCaption(ctx, cx, y, ngLabel, { size: chipSize, scheme: game.ngPlusCycle >= 3 ? "amber" : "violet" });
  }
  y += rowH + gap;

  if (game.mode === "meltdown") {
    const mHud = game.meltdown.getHUD();
    const braking = game.player._meltdownBraking;
    const pw = Math.round(160 * fs);
    const ph = Math.round((braking ? 76 : 62) * fs);
    const hot = mHud.heat > 75;
    drawPanel(ctx, x, y, pw, ph, { accent: hot ? UI.crimson : UI.amber, chamfer: 9 });
    label(ctx, "REACTOR RUN", x + 13, y + 16 * fs, Math.round(9 * fs), UI.amber);
    number(ctx, `${mHud.distance}m`, x + 13, y + 38 * fs, Math.round(22 * fs), HT.realistic ? UI.text : "#ffe2a8");
    const heatPct = mHud.heat / 100;
    const heatColor = hot ? UI.crimson : mHud.heat > 50 ? UI.amber : HT.realistic ? UI.textDim : "#ff8a3a";
    drawBar(ctx, x + 13, y + 46 * fs, pw - 26, Math.round(6 * fs), heatPct, heatColor, { segments: 10, glow: hot ? 0.5 : 0 });
    label(ctx, `HEAT ${mHud.heat}%`, x + pw - 13, y + 16 * fs, Math.round(9 * fs), heatColor, "right");
    if (braking) label(ctx, "▼ BRAKING", x + 13, y + 68 * fs, Math.round(10 * fs), "#ff6a4a");
  }
}

function drawKillsPill(game, ctx, w, fs) {
  const valStr = `${game.killedEnemies} / ${game.totalEnemies}`;
  const valSize = Math.round(14 * fs);
  ctx.font = uiFont(valSize, 800);
  const vw = ctx.measureText(valStr).width;
  const pw = bucket(vw + 64 * fs, 8);
  const ph = 28;
  const kx = w - pw - 12;
  const ky = 12;
  const done = game.totalEnemies > 0 && game.killedEnemies >= game.totalEnemies;
  drawPanel(ctx, kx, ky, pw, ph, { accent: done ? UI.green : UI.crimson, chamfer: 7 });
  const pop = since(M.killAt, 320);
  if (pop >= 0) {
    ctx.globalAlpha = 1 - pop;
    drawBrackets(ctx, kx - 3 - pop * 4, ky - 3 - pop * 4, pw + 6 + pop * 8, ph + 6 + pop * 8, done ? UI.green : UI.crimson, 8, 2);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = "middle";
  label(ctx, "KILLS", kx + 12, ky + ph / 2 + 1, Math.round(9 * fs), done ? UI.green : UI.critSoft);
  number(ctx, valStr, kx + pw - 12, ky + ph / 2 + 1, valSize, pop >= 0 && pop < 0.5 ? UI.flash : UI.text, "right");
  ctx.textBaseline = "alphabetic";
}

function findBoss(game) {
  for (const e of game.entities) {
    if (e.type === "enemy" && e.active && e.health > 0 &&
      (e.enemyType === "boss" || e.enemyType === "boss_form2" || e.enemyType === "boss_form3")) {
      return e;
    }
  }
  return null;
}

export function drawBossBar(game, ctx, w, fs, py = 18) {
  const boss = findBoss(game);
  if (!boss) return;
  const barW = Math.round(Math.min(420, w * 0.4));
  const barH = 12;
  const px = Math.round(w / 2 - barW / 2 - 14);
  const pw = barW + 28;
  const ph = 40;
  const pct = Math.max(0, boss.health / boss.maxHealth);
  const form = boss.def.form || 1;
  const color = form === 3 ? UI.bossForm3 : form === 2 ? UI.bossForm2 : UI.crimson;
  drawPanel(ctx, px, py, pw, ph, { accent: UI.crimson, chamfer: 10 });
  drawCaption(ctx, w / 2, py - 9, boss.def.name || "BOSS", { size: Math.round(11 * fs), scheme: "crimson", align: "center" });
  drawBar(ctx, px + 14, py + 16, barW, barH, pct, color, { segments: 20, glow: 0.45 });
  ctx.font = uiFont(Math.round(9 * fs), 700, true);
  ctx.fillStyle = UI.textDim;
  ctx.textAlign = "right";
  ctx.fillText(`${Math.ceil(boss.health)} / ${boss.maxHealth}`, px + pw - 14, py + ph - 5);
  label(ctx, `FORM ${form}`, px + 14, py + ph - 5, Math.round(8 * fs), UI.critSoft);
}

function drawVitals(game, ctx, w, h, f, fs) {
  const p = game.player;
  const slotW = Math.round(36 * f);
  const slotH = Math.round(30 * f);
  const slotGap = 4;
  const count = p.weapons.length;
  const stripW = count * slotW + (count - 1) * slotGap;
  const stripY = h - slotH - 12;

  const hpPct = Math.max(0, p.health / p.maxHealth);
  const tone = healthTone(game, hpPct);
  const low = p.alive && hpPct < 0.25;
  noteHealth(hpPct);
  const ghost = ghostFor(hpPct);

  const plateW = Math.round(Math.max(stripW + 24, 340 * f));
  const numBlockW = Math.round(66 * fs);
  const hasShield = p.maxShield > 0;
  const hpBarH = Math.round(10 * f);
  const thinH = Math.max(3, Math.round(4 * f));
  const lblSize = Math.round(8 * fs);
  const colH = hpBarH + (hasShield ? thinH + 3 : 0) + 6 + thinH + 4 + lblSize;
  const plateH = Math.round(Math.max(colH, 30 * fs) + 18);
  const plateX = Math.round(w / 2 - plateW / 2);
  const plateY = (game.settings.showWeapons ? stripY - 8 : h - 12) - plateH;

  drawPanel(ctx, plateX, plateY, plateW, plateH, { accent: low ? UI.crimson : UI.cyan, chamfer: 10 });

  // HP number block.
  const nx = plateX + 14;
  label(ctx, "HP", nx, plateY + 10 + Math.round(8 * fs), Math.round(8 * fs), low ? UI.critSoft : UI.textDim);
  const hit = since(M.hitAt, 180);
  number(ctx, `${Math.ceil(p.health)}`, nx + (hit >= 0 ? Math.sin(hit * Math.PI * 3) * (1 - hit) * 3 : 0), plateY + plateH - 9, Math.round(24 * fs),
    hit >= 0 && hit < 0.5 ? UI.flash : low ? (pulse(game, 0.012) > 0.5 ? UI.crimson : UI.critPale) : UI.text);

  // Bars column.
  const bx = plateX + 14 + numBlockW;
  const bw = plateX + plateW - 14 - bx;
  let by = plateY + 9;
  if (hasShield) {
    const sp = p.shield / p.maxShield;
    drawBar(ctx, bx, by, bw, thinH, sp, p.shield < p.maxShield ? UI.shield : HT.realistic ? UI.shieldFull : "#7fb6ff", { segments: 0, edge: sp < 1 });
    shieldShards(ctx, bx, by, bw);
    by += thinH + 3;
  }
  drawBar(ctx, bx, by, bw, hpBarH, hpPct, tone, {
    segments: 10,
    ghost,
    glow: low ? 0.35 + 0.45 * pulse(game, 0.012) : 0.22,
  });
  healSweep(ctx, bx, by, bw, hpBarH);
  by += hpBarH + 6;

  const staminaPct = p.stamina / p.maxStamina;
  const chronoPct = p.chronoEnergy / p.maxChronoEnergy;
  const showChrono = chronoPct > 0.005 || p.chronoActive;
  const active = p.isSprinting || p.isDashing;
  const stW = showChrono ? Math.round(bw * 0.58) : bw;
  const stColor = p.isDashing ? UI.dash : p.isSprinting ? UI.amber : staminaPct > 0.3 ? UI.cyan : UI.crimson;
  drawBar(ctx, bx, by, stW, thinH, staminaPct, stColor, { glow: active ? 0.5 : 0, edge: false });
  const ty = by + thinH + 4 + lblSize - 1;
  if (staminaPct < 0.99 || active) {
    label(ctx, p.isDashing ? "DASH" : p.isSprinting ? "SPRINT" : "STAMINA", bx, ty, lblSize, active ? stColor : UI.textFaint);
    label(ctx, `${Math.floor(staminaPct * 100)}%`, bx + stW, ty, lblSize, UI.textFaint, "right", 0);
  }
  if (showChrono) {
    const cX = bx + stW + 8;
    const cW = bw - stW - 8;
    const cColor = p.chronoActive ? UI.chrono : chronoPct >= 0.15 ? UI.violet : UI.chronoDim;
    const cLabel = HT.realistic ? UI.textDim : "#8f7ab8";
    drawBar(ctx, cX, by, cW, thinH, chronoPct, cColor, { glow: p.chronoActive ? 0.6 : 0, edge: false });
    label(ctx, p.chronoActive ? "SHIFT" : "CHRONO", cX, ty, lblSize, p.chronoActive ? UI.chronoText : cLabel);
    label(ctx, `${Math.floor(chronoPct * 100)}%`, cX + cW, ty, lblSize, cLabel, "right", 0);
  }

  if (low) {
    const a = 0.45 + 0.55 * pulse(game, 0.012);
    ctx.globalAlpha = a;
    drawBrackets(ctx, plateX - 5, plateY - 5, plateW + 10, plateH + 10, UI.crimson, 14, 2);
    ctx.globalAlpha = 1;
    drawCaption(ctx, w / 2, plateY - 26, "CRITICAL", { size: Math.round(10 * fs), scheme: "crimson", align: "center" });
  }

  if (game.settings.showWeapons) {
    drawWeaponSlots(game, ctx, Math.floor(w / 2 - stripW / 2), stripY, slotW, slotH, slotGap, fs);
  }
}

function drawWeaponSlots(game, ctx, x0, y, slotW, slotH, gap, fs) {
  const p = game.player;
  for (let i = 0; i < p.weapons.length; i++) {
    const active = i === p.currentWeapon;
    const sx = x0 + i * (slotW + gap);
    drawPanel(ctx, sx, y, slotW, slotH, {
      variant: active ? "raised" : "hud",
      accent: active ? UI.cyan : null,
      chamfer: 6,
    });
    const wp = WEAPON_LOOKUP(p.weapons[i]);
    const spriteImg = wp ? getWeaponSprite(weaponSlug(wp.name)) : null;
    if (spriteImg) {
      const inset = 4;
      ctx.globalAlpha = active ? 1 : 0.5;
      ctx.drawImage(spriteImg, sx + inset, y + inset, slotW - inset * 2, slotH - inset * 2);
      ctx.globalAlpha = 1;
      label(ctx, `${i + 1}`, sx + 4, y + 10, Math.round(8 * fs), active ? UI.cyan : UI.textFaint, "left", 0);
    } else {
      number(ctx, `${i + 1}`, sx + slotW / 2, y + slotH / 2 + 5, Math.round(14 * fs), active ? "#ffffff" : UI.textFaint, "center");
    }
  }
  // The active-slot underline glides to a newly selected weapon.
  const target = x0 + p.currentWeapon * (slotW + gap);
  _slotLineX = _slotLineX < 0 || Math.abs(target - _slotLineX) > 400 ? target : _slotLineX + (target - _slotLineX) * 0.3;
  ctx.fillStyle = UI.cyan;
  ctx.fillRect(Math.round(_slotLineX) + 6, y + slotH + 2, slotW - 12, 2);
}
let _slotLineX = -1;

// player.weapons holds WEAPONS indices (getWeaponDef only covers the current one).
const WEAPON_LOOKUP = (idx) => (typeof idx === "number" ? WEAPONS[idx] : idx) || null;

function drawAmmo(game, ctx, w, h, f, fs) {
  const wep = game.player.getWeaponDef();
  const ammo = game.player.ammo;
  const low = ammo <= 10;
  const numSize = Math.round(38 * fs);
  const pw = Math.round(Math.max(150 * f, 118 * fs));
  const ph = Math.round(numSize + 30 * fs);
  const px = w - pw - 12;
  const py = h - ph - 12;
  drawPanel(ctx, px, py, pw, ph, { accent: HT.realistic ? (low ? UI.amber : UI.accent) : low ? UI.crimson : UI.amber, chamfer: 12 });
  if (wep) {
    ctx.fillStyle = HT.realistic ? UI.accent : wep.color;
    ctx.fillRect(px + 12, py + 9, 3, Math.round(11 * fs));
    label(ctx, wep.name.toUpperCase(), px + 20, py + 9 + Math.round(10 * fs), Math.round(10 * fs), UI.text);
  }
  label(ctx, low ? "LOW" : "AMMO", px + 12, py + ph - 10, Math.round(9 * fs),
    low ? (pulse(game, 0.01) > 0.5 ? (HT.realistic ? UI.amber : UI.crimson) : HT.realistic ? UI.ammoLowPale : UI.critSoft) : UI.textDim);
  kickNumber(ctx, `${ammo}`, px + pw - 12, py + ph - 8, numSize, low ? (HT.realistic ? UI.amber : UI.critText) : UI.ammo, "right");
}

// ─── Combat cues (all layouts) ──────────────────────────────────────────────

/**
 * Crimson inked chevron pointing toward the last damage source, plus pulsing
 * crimson corner frames at low health. The legacy post-FX arc and vignette
 * still run underneath; these are the HUD-layer reads.
 */
export function drawModernCombatCues(game, ctx, w, h, barH = 0) {
  const p = game.player;
  const viewH = h - barH;
  const age = game.time - (p.hurtTime || 0);
  if (p.hurtTime && age < 700 && p.lastDamageAngle != null) {
    let rel = p.lastDamageAngle - p.angle;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const a = rel - Math.PI / 2;
    const k = age / 700;
    const r = Math.min(w, viewH) * (0.2 + k * 0.03);
    const cx = w / 2 + Math.cos(a) * r;
    const cy = viewH / 2 + Math.sin(a) * r;
    ctx.save();
    ctx.globalAlpha = 1 - k * k;
    ctx.translate(cx, cy);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(22, 6);
    ctx.lineTo(10, 6);
    ctx.lineTo(0, -4);
    ctx.lineTo(-10, 6);
    ctx.lineTo(-22, 6);
    ctx.closePath();
    if (HT.outline) {
      ctx.lineJoin = "miter";
      ctx.lineWidth = 3;
      ctx.strokeStyle = UI.ink;
      ctx.stroke();
      ctx.fillStyle = UI.crimson;
      ctx.fill();
    } else {
      // Realistic: a translucent wedge with a hairline edge, no ink.
      ctx.fillStyle = `rgba(${UI.critRGB},0.35)`;
      ctx.fill();
      ctx.lineJoin = "miter";
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = UI.crimson;
      ctx.stroke();
    }
    ctx.restore();
  }

  const hp = p.health / p.maxHealth;
  if (p.alive && hp > 0 && hp < 0.25) {
    const sev = 1 - hp / 0.25;
    const a = (0.35 + 0.5 * sev) * (0.55 + 0.45 * pulse(game, 0.006 * (1 + sev)));
    const m = 14;
    const len = Math.round(Math.min(w, viewH) * 0.09);
    ctx.globalAlpha = a;
    if (HT.outline) drawBrackets(ctx, m, m, w - m * 2, viewH - m * 2, UI.ink, len, 6);
    drawBrackets(ctx, m, m, w - m * 2, viewH - m * 2, UI.crimson, len, 3);
    ctx.globalAlpha = 1;
  }
}

// ─── Floating text / banners ────────────────────────────────────────────────

/** Inked damage number (replaces the monospace glow version). */
export function drawModernDamageNumber(ctx, dn, x, y, large) {
  const f = large ? 22 : 18;
  ctx.textAlign = "center";
  if (dn.crit) {
    ctx.font = uiFont(f + 2, 800);
    inkText(ctx, `${dn.value}`, x, y, UI.gold, 4);
  } else if (dn.head) {
    ctx.font = uiFont(f + 2, 800);
    inkText(ctx, `${dn.value}`, x, y, HT.realistic ? UI.amber : "#ff8a3a", 4);
    ctx.font = uiFont(large ? 11 : 10, 800);
    inkText(ctx, "HEADSHOT", x, y - (large ? 20 : 17), HT.realistic ? UI.ammoLowPale : "#ffd0a0", 3);
  } else {
    ctx.font = uiFont(f - 3, 700);
    inkText(ctx, `${dn.value}`, x, y, "#ffffff", 3);
  }
}

/** Boss intro banner: crimson steel band, inked title, caption subtitle. */
export function drawModernBossNameCard(ctx, card, elapsed, w, h) {
  const t = elapsed / card.duration;
  let alpha = 1;
  let stretch = 1;
  if (t < 0.18) {
    alpha = t / 0.18;
    stretch = 0.4 + 0.6 * alpha;
  } else if (t > 0.78) {
    const k = (t - 0.78) / 0.22;
    alpha = 1 - k;
    stretch = 1 + k * 0.5;
  }
  const cy = h * 0.35;
  const bw = Math.min(w * 0.7, 720) * stretch;
  const bh = 96;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawPanel(ctx, w / 2 - bw / 2, cy - bh / 2, bw, bh, { variant: "menu", accent: UI.crimson, chamfer: 16 });
  if (HT.outline) {
    ctx.fillStyle = "rgba(255,42,74,0.16)";
    ctx.fillRect(w / 2 - bw / 2 + 2, cy - bh / 2 + 2, bw - 4, bh - 4);
  }
  const jitter = (Math.sin(elapsed * 0.04) * 2) | 0;
  drawTitle(ctx, card.title, w / 2 + jitter, cy + 8, 40, UI.crimson, HT.realistic ? {} : { fillTop: "#fff1f3", fillBottom: "#ffb3be" });
  if (card.subtitle) {
    drawCaption(ctx, w / 2, cy + bh / 2 - 12, card.subtitle, { size: 12, scheme: "crimson", align: "center" });
  }
  ctx.restore();
}

/** Arena "stage cleared" banner. */
export function drawModernStageCleared(game, ctx, w, cy, large) {
  const countSecs = Math.ceil(game.arenaClearTimer);
  drawTitle(ctx, "STAGE CLEARED", w / 2, cy + (large ? 4 : 0), large ? 46 : 28, HT.realistic ? UI.accent : UI.green,
    HT.realistic ? {} : { fillTop: "#f2fff6", fillBottom: "#8fe8b0" });
  drawCaption(ctx, w / 2, cy + (large ? 26 : 16), `Next round in ${countSecs}s`, { size: large ? 13 : 10, align: "center" });
}

/** Small steel timer pill used by the compact HUD. */
export function drawModernTimerPill(ctx, x, y, labelText, value, accent, valueColor) {
  const pw = 92;
  const ph = 34;
  drawPanel(ctx, x, y, pw, ph, { accent, chamfer: 7 });
  label(ctx, labelText, x + 10, y + 13, 8, UI.textDim);
  ctx.font = uiFont(15, 700, true);
  ctx.fillStyle = valueColor || UI.text;
  ctx.textAlign = "left";
  ctx.fillText(value, x + 10, y + 28);
}

// ─── Classic (hudStyle 1) ───────────────────────────────────────────────────

let _consoleSprite = null;
let _consoleKey = "";

/**
 * The static console (steel base, recessed wells, caption tabs) never changes
 * between frames, so it is composed once per size into one offscreen canvas.
 * Sprite origin is 12px above the console top so the caption tabs fit.
 */
function classicConsole(ctx, w, barH, L, hasShield) {
  const dpr = pixelRatio(ctx);
  const key = `${w}|${barH}|${dpr}|${hasShield ? 1 : 0}|${L.portraitX}|${L.panelH}|${HT.realistic ? 1 : 0}`;
  if (_consoleSprite && _consoleKey === key) return _consoleSprite;
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil((barH + 12) * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  g.translate(0, 12);
  // Base slab: full-width steel with a cyan hairline under the ink lip.
  drawPanel(g, -2, 0, w + 4, barH + 4, { variant: "menu", chamfer: 0 });
  g.fillStyle = UI.ink;
  g.fillRect(0, -2, w, 3);
  g.fillStyle = "rgba(34,230,255,0.45)";
  g.fillRect(0, 1, w, 1);
  // Rivets along the top lip.
  for (let rx = 24; rx < w; rx += 96) {
    g.fillStyle = UI.ink;
    g.beginPath(); g.arc(rx, 8, 2.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = UI.steelHi;
    g.beginPath(); g.arc(rx - 0.6, 7.4, 1.3, 0, Math.PI * 2); g.fill();
  }
  const wells = [
    [L.pad, L.ammoW, "AMMO", "amber", UI.amber],
    [L.healthX, L.healthW, "HEALTH", "cream", UI.green],
    ...(hasShield ? [[L.shieldX, L.shieldW, "SHIELD", "cyan", UI.cyan]] : []),
    [L.armsX, L.armsW, "ARMS", "crimson", UI.crimson],
  ];
  for (const [x, ww, text, scheme, accent] of wells) {
    drawPanel(g, x, L.panelTop, ww, L.panelH, { variant: "well", accent, chamfer: 12 });
    drawCaption(g, x + 12, L.panelTop - 8, text, { size: 11, scheme });
  }
  // Portrait bay.
  drawPanel(g, L.portraitX - 10, 4, L.portraitW + 20, barH - 2, { variant: "raised", accent: UI.cyan, chamfer: 14 });
  _consoleSprite = c;
  _consoleKey = key;
  return c;
}

export function renderModernClassic(game, ctx, w, h, barH, hudFactor, portraitState) {
  const p = game.player;
  const fs = (game.settings.fontScale || 100) / 100;

  // Layout mirrors the legacy console so the portrait/crosshair maths agree.
  const pad = 14;
  const portraitW = Math.round(180 * hudFactor);
  const portraitH = Math.round(160 * hudFactor);
  const portraitX = Math.floor(w / 2 - portraitW / 2);
  const portraitY = h - barH;
  const ammoW = Math.floor(portraitX * 0.4);
  const panelY = h - barH + 18;
  const panelH = barH - 30;
  const healthW = portraitX - ammoW - pad * 2.5;
  const healthX = pad + ammoW + pad / 2;
  const rightZoneW = w - (portraitX + portraitW);
  const shieldW = Math.floor(rightZoneW * 0.4) - pad * 1.5;
  const shieldX = portraitX + portraitW + pad;
  const armsX = shieldX + shieldW + pad / 2;
  const armsW = rightZoneW - shieldW - pad * 2.5;
  const hasShield = p.maxShield > 0;
  const L = { pad, ammoW, healthX, healthW, shieldX, shieldW, armsX, armsW, panelTop: panelY - portraitY, panelH, portraitX, portraitW };

  // Stamina / chrono above the console.
  const staminaFactor = game.settings.staminaBarSize / 100;
  const staminaPct = p.stamina / p.maxStamina;
  const chronoPct = p.chronoEnergy / p.maxChronoEnergy;
  const showChrono = chronoPct > 0.005 || p.chronoActive;
  const active = p.isSprinting || p.isDashing;
  const totalW = Math.round(520 * staminaFactor);
  const sbH = Math.max(6, Math.round(12 * staminaFactor));
  const sbY = h - barH - sbH - 22;
  const stW = showChrono ? Math.round(totalW * 0.58) : totalW;
  const sx = Math.floor(w / 2 - totalW / 2);
  const stColor = p.isDashing ? "#7ff6ff" : p.isSprinting ? UI.amber : staminaPct > 0.3 ? UI.cyan : UI.crimson;
  drawBar(ctx, sx, sbY, stW, sbH, staminaPct, stColor, { segments: 12, glow: active ? 0.55 : 0.15 });
  if (staminaPct < 0.99 || active) {
    label(ctx, p.isDashing ? "DASH" : p.isSprinting ? "SPRINT" : "STAMINA", sx, sbY - 5, Math.round(10 * fs), active ? stColor : UI.textDim);
    label(ctx, `${Math.floor(staminaPct * 100)}%`, sx + stW, sbY - 5, Math.round(10 * fs), UI.textDim, "right", 0);
  }
  if (showChrono) {
    const cx = sx + stW + 10;
    const cw = totalW - stW - 10;
    const cColor = p.chronoActive ? "#c77dff" : chronoPct >= 0.15 ? UI.violet : "#5d4488";
    drawBar(ctx, cx, sbY, cw, sbH, chronoPct, cColor, { segments: 8, glow: p.chronoActive ? 0.6 : 0.15 });
    label(ctx, p.chronoActive ? "CHRONO SHIFT" : "CHRONO  [HOLD Q]", cx, sbY - 5, Math.round(10 * fs), p.chronoActive ? "#d9a8ff" : "#8f7ab8");
    label(ctx, `${Math.floor(chronoPct * 100)}%`, cx + cw, sbY - 5, Math.round(10 * fs), "#8f7ab8", "right", 0);
  }

  // Console.
  ctx.drawImage(classicConsole(ctx, w, barH, L, hasShield), 0, h - barH - 12, w, barH + 12);

  const numSize = Math.round(Math.min(58, panelH * 0.55) * fs);
  const numY = panelY + panelH - Math.round(panelH * 0.26);

  // Ammo.
  const lowAmmo = p.ammo <= 10;
  kickNumber(ctx, `${p.ammo}`, pad + ammoW / 2, numY, numSize, lowAmmo ? "#ff5a6e" : "#ffd48a", "center");
  const wep = p.getWeaponDef();
  if (wep) label(ctx, wep.name.toUpperCase(), pad + ammoW / 2, panelY + panelH - 9, Math.round(9 * fs), wep.color, "center");

  // Health.
  const hpPct = Math.max(0, p.health / p.maxHealth);
  const tone = healthTone(game, hpPct);
  const low = p.alive && hpPct < 0.25;
  noteHealth(hpPct);
  number(ctx, `${Math.ceil(p.health)}%`, healthX + healthW / 2, numY - 6, numSize,
    low ? (pulse(game, 0.012) > 0.5 ? UI.crimson : "#ffd0d6") : UI.text, "center");
  drawBar(ctx, healthX + 16, panelY + panelH - 20, healthW - 32, Math.round(9 * hudFactor), hpPct, tone, {
    segments: 10, ghost: ghostFor(hpPct), glow: low ? 0.35 + 0.45 * pulse(game, 0.012) : 0.25,
  });
  healSweep(ctx, healthX + 16, panelY + panelH - 20, healthW - 32, Math.round(9 * hudFactor));
  if (low) {
    ctx.globalAlpha = 0.45 + 0.55 * pulse(game, 0.012);
    drawBrackets(ctx, healthX - 4, panelY - 4, healthW + 8, panelH + 8, UI.crimson, 16, 2);
    ctx.globalAlpha = 1;
  }

  // Portrait.
  if (game.settings.showPortrait) {
    drawPortrait(ctx, portraitX, portraitY + 8, portraitW, portraitH - 8, portraitState);
    ctx.strokeStyle = UI.ink;
    ctx.lineWidth = 3;
    ctx.strokeRect(portraitX - 1.5, portraitY + 6.5, portraitW + 3, portraitH - 5);
    drawBrackets(ctx, portraitX + 3, portraitY + 12, portraitW - 6, portraitH - 18, low ? UI.crimson : UI.cyan, 12, 1.5);
  }

  // Shield.
  if (hasShield) {
    const sp = p.shield / p.maxShield;
    number(ctx, `${Math.ceil(sp * 100)}%`, shieldX + shieldW / 2, numY - 6, numSize, "#bfe9ff", "center");
    drawBar(ctx, shieldX + 16, panelY + panelH - 20, shieldW - 32, Math.round(9 * hudFactor), sp, "#4f8dff", { segments: 10, glow: 0.25 });
  }

  // Arms grid.
  const cols = 4;
  const cellW = (armsW - 20) / cols;
  const cellH = (panelH - 26) / 2;
  for (let i = 0; i < 8; i++) {
    const cx = armsX + 10 + (i % cols) * cellW;
    const cy = panelY + 16 + Math.floor(i / cols) * cellH;
    const has = p.weapons[i] !== undefined;
    const isActive = i === p.currentWeapon;
    drawPanel(ctx, cx + 2, cy + 2, cellW - 4, cellH - 4, {
      variant: isActive ? "raised" : "glass",
      accent: isActive ? UI.cyan : null,
      chamfer: 5,
    });
    if (has) {
      const wp = WEAPON_LOOKUP(p.weapons[i]);
      const img = wp ? getWeaponSprite(weaponSlug(wp.name)) : null;
      if (img) {
        ctx.globalAlpha = isActive ? 1 : 0.45;
        ctx.drawImage(img, cx + 7, cy + 7, cellW - 14, cellH - 14);
        ctx.globalAlpha = 1;
      }
    }
    label(ctx, `${i + 1}`, cx + 7, cy + 14, Math.round(10 * fs), isActive ? UI.cyan : has ? UI.amber : "#3b4b5b", "left", 0);
  }

  // Kills / score tabs sit on the console lip.
  if (game.settings.showKills) {
    drawCaption(ctx, pad, h - barH - 30, `KILLS ${game.killedEnemies}`, { size: 10, scheme: "crimson" });
  }
  if (game.settings.showScore) {
    drawCaption(ctx, w - pad, h - barH - 30, `SCORE ${p.score}`, { size: 10, scheme: "cyan", align: "right" });
  }

  // Arena / campaign clocks (top-left).
  if (game.mode === "arena") {
    const secs = Math.ceil(game.arenaTimer);
    const warning = secs <= 10;
    const cleared = game.arenaClearTimer != null;
    const accent = cleared ? UI.green : warning ? UI.crimson : UI.cyan;
    drawPanel(ctx, 10, 10, 160, 90, { accent, chamfer: 12, bar: warning || cleared });
    label(ctx, cleared ? "CLEARED" : "TIME", 90, 30, 12, cleared ? UI.green : UI.textDim, "center");
    const flash = warning && !cleared && Math.floor(game.time / 250) % 2;
    number(ctx, `${secs}s`, 90, 66, 40, cleared ? UI.green : warning ? (flash ? UI.crimson : UI.amber) : UI.text, "center");
    if (game.roundStartTime) {
      ctx.font = uiFont(11, 600, true);
      ctx.fillStyle = UI.textFaint;
      ctx.textAlign = "center";
      ctx.fillText(`${elapsedStr(game)} elapsed`, 90, 88);
    }
  }
  if (game.mode === "campaign" && game.roundStartTime) {
    drawModernTimerPill(ctx, 10, 10, "TIME", elapsedStr(game), UI.cyan);
  }
  drawBossBar(game, ctx, w, fs);
}

// ─── Compact phone ──────────────────────────────────────────────────────────

let _safeKey = "";
let _safe = { left: 0, right: 0 };
function safeInsets(w, h) {
  const key = `${w}x${h}`;
  if (key !== _safeKey) {
    _safeKey = key;
    try {
      const cs = getComputedStyle(document.documentElement);
      _safe = {
        left: parseFloat(cs.getPropertyValue("--sal")) || 0,
        right: parseFloat(cs.getPropertyValue("--sar")) || 0,
      };
    } catch (_) {
      _safe = { left: 0, right: 0 };
    }
  }
  return _safe;
}

export function renderModernCompact(game, ctx, w, h, barH, hudFactor) {
  const p = game.player;
  const sa = safeInsets(w, h);
  const padL = 10 + sa.left;
  const padR = 10 + sa.right;

  // Stamina + chrono above the strip.
  const staminaPct = p.stamina / p.maxStamina;
  const stBarH = Math.max(4, Math.round(7 * hudFactor));
  const stBarW = Math.round(220 * hudFactor);
  const stBarX = Math.floor(w / 2 - stBarW / 2);
  const stBarY = h - barH - stBarH - 6;
  const active = p.isSprinting || p.isDashing;
  const stColor = p.isDashing ? "#7ff6ff" : p.isSprinting ? UI.amber : staminaPct > 0.3 ? UI.cyan : UI.crimson;
  drawBar(ctx, stBarX, stBarY, stBarW, stBarH, staminaPct, stColor, { segments: 8, glow: active ? 0.5 : 0, edge: false });
  const chronoPct = p.chronoEnergy / p.maxChronoEnergy;
  if (chronoPct > 0.005 || p.chronoActive) {
    const cBarH = Math.max(3, Math.round(4 * hudFactor));
    const cBarW = Math.round(140 * hudFactor);
    drawBar(ctx, Math.floor(w / 2 - cBarW / 2), stBarY - cBarH - 5, cBarW, cBarH, chronoPct,
      p.chronoActive ? "#c77dff" : UI.violet, { glow: p.chronoActive ? 0.6 : 0, edge: false });
  }

  // Strip.
  drawPanel(ctx, -4, h - barH, w + 8, barH + 4, { variant: "hud", chamfer: 0 });
  ctx.fillStyle = UI.ink;
  ctx.fillRect(0, h - barH - 1, w, 2);
  ctx.fillStyle = "rgba(34,230,255,0.4)";
  ctx.fillRect(0, h - barH + 1, w, 1);

  const midY = h - barH / 2;
  const hpPct = Math.max(0, p.health / p.maxHealth);
  const tone = healthTone(game, hpPct);
  const low = p.alive && hpPct < 0.25;
  noteHealth(hpPct);

  // Left: difficulty chip, HP number + bar.
  const hpW = Math.round(w * 0.22);
  const diff = game.settings.difficulty;
  label(ctx, ["EASY", "NORM", "HARD", "NITE"][diff], padL, midY - 12, 8,
    [UI.green, UI.cyan, UI.amber, UI.crimson][diff] || UI.cyan);
  number(ctx, `${Math.ceil(p.health)}`, padL, midY + 5, 22, low ? (pulse(game, 0.012) > 0.5 ? UI.crimson : "#ffd0d6") : UI.text);
  const hbW = hpW - padL + 6;
  drawBar(ctx, padL, midY + 10, hbW, 6, hpPct, tone, { segments: 5, ghost: ghostFor(hpPct), glow: low ? 0.6 : 0.2 });
  if (p.maxShield > 0) {
    drawBar(ctx, padL, midY + 19, hbW, 3, p.shield / p.maxShield, "#4f8dff", { edge: false });
  }

  // Ammo.
  const ammoX = hpW + 26;
  label(ctx, "AMMO", ammoX + 30, midY - 12, 8, UI.textDim, "center");
  number(ctx, `${p.ammo}`, ammoX + 30, midY + 11, 22, p.ammo <= 10 ? "#ff5a6e" : "#ffd48a", "center");

  // Weapon.
  const wep = p.getWeaponDef();
  drawCaption(ctx, w / 2, midY - 19, `W${p.currentWeapon + 1}`, { size: 8, scheme: "cyan", align: "center" });
  if (wep) label(ctx, wep.name.toUpperCase(), w / 2, midY + 14, 10, wep.color, "center");

  // Right: kills / score.
  if (game.settings.showKills) {
    const kx = w - padR - 110;
    label(ctx, "KILLS", kx, midY - 12, 8, "#ff8a96", "right");
    number(ctx, `${game.killedEnemies}/${game.totalEnemies}`, kx, midY + 8, 17, UI.text, "right");
  }
  if (game.settings.showScore) {
    label(ctx, "SCORE", w - padR, midY - 12, 8, UI.cyan, "right");
    number(ctx, `${p.score}`, w - padR, midY + 8, 17, UI.text, "right");
  }
  if (game.mode === "arena") {
    label(ctx, `R${game.arenaRound}`, w - padR, midY + 22, 9, UI.amber, "right");
  }
  ctx.textAlign = "left";
}

// ─── Tactical (hudStyle 2) ──────────────────────────────────────────────────

/**
 * Floating tactical console: two angled steel wings either side of a thin
 * arc under the reticle — vitals left, ammo right, weapon name on the arc.
 * The shared overlays (minimap, reticle, toasts, comms) come from hud.js.
 */
export function renderModernTacticalPanels(game, ctx, w, h, f) {
  const p = game.player;
  const fs = (game.settings.fontScale || 100) / 100;
  const cx = w / 2;
  const cy = h - Math.round(58 * f);
  const R = Math.round(190 * f);

  drawTopLeftStack(game, ctx, fs);
  if (game.settings.showKills) drawKillsPill(game, ctx, w, fs);
  drawBossBar(game, ctx, w, fs);

  // Tactical arc with ticks.
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.arc(cx, cy + R * 0.25, R, Math.PI * 1.2, Math.PI * 1.8);
  ctx.lineWidth = 4;
  ctx.strokeStyle = UI.ink;
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(34,230,255,0.45)";
  ctx.stroke();
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (1.2 + (0.6 * i) / 12);
    const r2 = R + (i % 3 === 0 ? 8 : 4);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R, cy + R * 0.25 + Math.sin(a) * R);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + R * 0.25 + Math.sin(a) * r2);
    ctx.strokeStyle = i % 3 === 0 ? "rgba(185,210,232,0.6)" : "rgba(143,164,184,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const wingW = Math.round(230 * f);
  const wingH = Math.round(50 * f);
  const gap = Math.round(170 * f);
  const wy = cy - wingH / 2 + 4;
  const hpPct = Math.max(0, p.health / p.maxHealth);
  const low = p.alive && hpPct < 0.25;
  noteHealth(hpPct);

  // Left wing: vitals.
  const lx = Math.round(cx - gap - wingW);
  ctx.save();
  ctx.translate(lx + wingW, wy);
  ctx.transform(1, 0, 0.35, 1, 0, 0);
  drawPanel(ctx, -wingW, 0, wingW, wingH, { accent: low ? UI.crimson : UI.cyan, chamfer: 10 });
  ctx.restore();
  label(ctx, low ? "CRITICAL" : "VITALS", lx + 16, wy + 16, Math.round(9 * fs), low ? UI.crimson : UI.textDim);
  number(ctx, `${Math.ceil(p.health)}`, lx + wingW - 18, wy + wingH - 12, Math.round(30 * fs), low ? "#ff5a6e" : UI.text, "right");
  drawBar(ctx, lx + 16, wy + 24, wingW - 100, Math.round(8 * f), hpPct, healthTone(game, hpPct), {
    segments: 10, ghost: ghostFor(hpPct), glow: low ? 0.6 : 0.2,
  });
  healSweep(ctx, lx + 16, wy + 24, wingW - 100, Math.round(8 * f));
  if (p.maxShield > 0) {
    drawBar(ctx, lx + 16, wy + 36, wingW - 100, 3, p.shield / p.maxShield, "#4f8dff", { edge: false });
    shieldShards(ctx, lx + 16, wy + 36, wingW - 100);
  }

  // Right wing: ammo.
  const rx = Math.round(cx + gap);
  const wep = p.getWeaponDef();
  const lowAmmo = p.ammo <= 10;
  ctx.save();
  ctx.translate(rx, wy);
  ctx.transform(1, 0, -0.35, 1, 0, 0);
  drawPanel(ctx, 0, 0, wingW, wingH, { accent: lowAmmo ? UI.crimson : UI.amber, chamfer: 10 });
  ctx.restore();
  label(ctx, lowAmmo ? "LOW AMMO" : "AMMO", rx + wingW - 16, wy + 16, Math.round(9 * fs),
    lowAmmo ? (pulse(game, 0.01) > 0.5 ? UI.crimson : "#ff8a96") : UI.textDim, "right");
  kickNumber(ctx, `${p.ammo}`, rx + 18, wy + wingH - 12, Math.round(30 * fs), lowAmmo ? "#ff5a6e" : "#ffe3a3", "left");
  if (wep) {
    ctx.fillStyle = wep.color;
    ctx.fillRect(rx + wingW - 18, wy + 26, 3, 12);
    label(ctx, wep.name.toUpperCase(), rx + wingW - 26, wy + 37, Math.round(10 * fs), UI.text, "right");
  }

  // Stamina / chrono under the arc.
  const staminaPct = p.stamina / p.maxStamina;
  const active = p.isSprinting || p.isDashing;
  drawBar(ctx, cx - 70 * f, cy + 10, 140 * f, 4, staminaPct,
    p.isDashing ? "#7ff6ff" : p.isSprinting ? UI.amber : staminaPct > 0.3 ? UI.cyan : UI.crimson, { glow: active ? 0.5 : 0, edge: false });
  const chronoPct = p.chronoEnergy / p.maxChronoEnergy;
  if (chronoPct > 0.005 || p.chronoActive) {
    drawBar(ctx, cx - 50 * f, cy + 20, 100 * f, 3, chronoPct, p.chronoActive ? "#c77dff" : UI.violet, { glow: p.chronoActive ? 0.6 : 0, edge: false });
  }
  if (low) {
    ctx.globalAlpha = 0.45 + 0.55 * pulse(game, 0.012);
    drawBrackets(ctx, lx - 6, wy - 6, wingW + 12, wingH + 12, UI.crimson, 12, 2);
    ctx.globalAlpha = 1;
  }
}

// ─── Custom (hudStyle 3) ────────────────────────────────────────────────────

function customReadout(ctx, x, y, labelText, value, accent, fs, extra) {
  const size = Math.round(30 * fs);
  ctx.font = uiFont(size, 800);
  const vw = ctx.measureText(value).width;
  const pw = Math.max(96, Math.ceil(vw + 34));
  const ph = size + 28;
  drawPanel(ctx, x - pw / 2, y - ph / 2, pw, ph, { accent, chamfer: 10 });
  label(ctx, labelText, x, y - ph / 2 + 15, Math.round(9 * fs), UI.textDim, "center");
  number(ctx, value, x, y + ph / 2 - 10, size, extra || UI.text, "center");
  return { pw, ph };
}

/** HUD-editor layout, each element as a steel readout at its saved anchor. */
export function renderModernCustomPanels(game, ctx, w, h, f, portraitState) {
  const fs = (game.settings.fontScale || 100) / 100;
  const layout = game.settings.customHudLayout;
  const p = game.player;
  if (!layout) {
    const pw = Math.min(440, w - 40);
    drawPanel(ctx, w / 2 - pw / 2, h / 2 - 50, pw, 100, { variant: "menu", accent: UI.amber, chamfer: 14 });
    drawCaption(ctx, w / 2, h / 2 - 34, "No custom HUD configured", { size: 13, scheme: "amber", align: "center" });
    label(ctx, "SETTINGS  ›  HUD  ›  EDIT CUSTOM HUD", w / 2, h / 2 + 22, 12, UI.textDim, "center");
    return;
  }
  drawTopLeftStack(game, ctx, fs);
  if (layout.health) {
    const pct = Math.max(0, p.health / p.maxHealth);
    const x = layout.health.x * w;
    const y = layout.health.y * h;
    const { pw, ph } = customReadout(ctx, x, y, "HEALTH", `${Math.ceil(p.health)}`, pct < 0.25 ? UI.crimson : UI.cyan, fs,
      pct < 0.25 ? "#ff5a6e" : UI.text);
    drawBar(ctx, x - pw / 2 + 10, y + ph / 2 + 4, pw - 20, 5, pct, healthTone(game, pct), { segments: 5, ghost: ghostFor(pct), edge: false });
  }
  if (layout.ammo) {
    const x = layout.ammo.x * w;
    const y = layout.ammo.y * h;
    customReadout(ctx, x, y, "AMMO", `${p.ammo}`, p.ammo <= 10 ? UI.crimson : UI.amber, fs, p.ammo <= 10 ? "#ff5a6e" : "#ffe3a3");
  }
  if (layout.shield && p.maxShield > 0) {
    customReadout(ctx, layout.shield.x * w, layout.shield.y * h, "SHIELD",
      `${Math.ceil((p.shield / p.maxShield) * 100)}%`, "#4f8dff", fs, "#bfe9ff");
  }
  if (layout.portrait && game.settings.showPortrait) {
    const x = layout.portrait.x * w;
    const y = layout.portrait.y * h;
    drawPanel(ctx, x - 66, y - 66, 132, 132, { variant: "well", accent: UI.cyan, chamfer: 12 });
    drawPortrait(ctx, x - 60, y - 60, 120, 120, portraitState);
  }
  if (layout.weapons && game.settings.showWeapons) {
    const wep = p.getWeaponDef();
    if (wep) {
      const x = layout.weapons.x * w;
      const y = layout.weapons.y * h;
      drawCaption(ctx, x, y - 10, wep.name, { size: Math.round(12 * fs), scheme: "steel", align: "center" });
      ctx.fillStyle = wep.color;
      ctx.fillRect(x - 20, y + 14, 40, 2);
    }
  }
}
