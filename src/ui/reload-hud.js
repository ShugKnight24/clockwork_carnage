/**
 * The active-reload bar, the RELOAD prompt and the Conditioning level-up
 * chip, in each art style's look: Legacy's monospace neon boxes, Comic's
 * inked panels, Modern's thin helmet-HUD lines (HT from hud-skin.js is the
 * live theme for the two vector styles).
 *
 * The bar sits under the reticle, where the eye already is in a fight. With
 * the sights up it drops further away and fades back, so nothing covers the
 * reticle or the sight picture while aiming.
 */
import { HT, uiFont, inkText, track } from "./hud-skin.js";
import { isModernArt } from "../rendering/art-style.js";
import { getAimBlend, currentBarH } from "../systems/aim.js";
import { reloadProgress, reloadCompletion, BOOST } from "../systems/active-reload.js";
import { SKILLS } from "../systems/conditioning.js";
import { drawPrompt } from "./input-glyphs.js";

/** Ms a hit's word stays up after the press. */
const OUTCOME_MS = 800;
/** The scope's radius as a share of the view's short side (src/ui/crosshair.js drawScope). */
const SCOPE_R = 0.44;
/** Ms the ammo readout flashes after a hit. */
const FLASH_MS = 450;
/** The boosted magazine's colour, per look. */
// Hot and unlike every other readout state: Legacy's ammo is already amber,
// so its boost goes magenta.
const BOOST_LEGACY = "#ff55ff";
const BOOST_COMIC = "#ff8a2a";
const BOOST_REAL = "#e8b35a";

const look = () => (!isModernArt() ? "legacy" : HT.realistic ? "real" : "comic");

/**
 * The ammo readout's colour for the held gun: the boost's while its magazine
 * is boosted (brightening to white for a beat after the press), else `base`.
 */
export function ammoTint(game, base) {
  const ar = game.activeReload;
  const id = game.player?.weapons?.[game.player.currentWeapon];
  if (!ar || id === undefined || !ar.boosted[id]) return base;
  const last = ar.last;
  const since = last && last.weaponId === id && last.outcome !== "jam" ? game.time - last.at : Infinity;
  if (since < FLASH_MS && Math.floor(since / 75) % 2 === 0) return "#ffffff";
  const l = look();
  return l === "legacy" ? BOOST_LEGACY : l === "real" ? BOOST_REAL : BOOST_COMIC;
}

/** Bar size and the gap under the reticle, scaled with the HUD. */
function metrics(game) {
  const s = Math.max(1, Math.min(1.6, (game.hudH || 900) / 900)) * ((game.settings?.hudScale ?? 100) / 100);
  return { s, w: Math.round(150 * s), h: Math.max(6, Math.round(9 * s)), gap: Math.round(46 * s) };
}

/**
 * Under the reticle at (cx, cy): the bar while reloading, the word for a
 * hit just after, and a RELOAD prompt when the magazine is empty
 * with rounds to load.
 */
export function drawReloadHud(ctx, game, cx, cy) {
  const ar = game.activeReload;
  const p = game.player;
  const wep = p?.getWeaponDef?.();
  if (!ar || !wep || !p.loadedOf) return;
  const now = game.time;
  const blend = getAimBlend();
  const m = metrics(game);
  // Aimed: further from the reticle and quieter, never over the sight.
  let mid = cx;
  let y = Math.round(cy + m.gap + blend * 64 * m.s);
  // Through a scope the whole circle is the sight: the bar moves out to the
  // black beside it, where there is room.
  if (wep.scope && blend > 0.6) {
    const w = game.hudW || ctx.canvas.width;
    const r = Math.min(w, (game.hudH || ctx.canvas.height) - currentBarH(game)) * SCOPE_R;
    if (w / 2 - r >= m.w + 48) {
      mid = cx + r + 24 + m.w / 2;
      y = Math.round(cy - m.h / 2);
    }
  }
  const alpha = 1 - blend * 0.35;
  const l = look();
  ctx.save();
  ctx.globalAlpha *= alpha;
  const a = ar.active;
  if (a && a.weaponId === wep.id) {
    drawBar(ctx, l, mid - m.w / 2, y, m.w, m.h, a, reloadProgress(ar, now), reloadCompletion(ar, now), m.s);
  } else if (p.loadedOf(wep.id) < (wep.ammoPerShot || 1) && p.canReload(wep.id)) {
    const pulse = 0.65 + 0.35 * Math.sin(now / 140);
    ctx.globalAlpha *= pulse;
    drawPrompt(ctx, mid, y + m.h / 2, [["reload", "RELOAD"]], promptStyle(game, l, m.s));
  }
  const last = ar.last;
  // A jam's word is the bar's own label, for as long as the jam runs.
  if (last && (last.outcome === "hit" || last.outcome === "perfect") && now - last.at < OUTCOME_MS && last.weaponId === wep.id) {
    const t = (now - last.at) / OUTCOME_MS;
    ctx.globalAlpha *= 1 - t * t;
    const word = `${last.outcome === "perfect" ? "PERFECT" : "ACTIVE"} +${Math.round((BOOST - 1) * 100)}%`;
    drawWord(ctx, l, word, mid, y + m.h + Math.round(14 * m.s) - t * 6 * m.s, last.outcome === "perfect", m.s);
  }
  ctx.restore();
}

function promptStyle(game, l, s) {
  const size = Math.round(11 * s);
  if (l === "legacy") return { input: game, size, look: "legacy", align: "center", color: "#ff4444", font: `bold ${size + 1}px monospace` };
  return { input: game, size, look: "modern", align: "center", color: l === "real" ? HT.amber : HT.critText, font: uiFont(size, 800) };
}

function zoneColors(l, jammed) {
  if (jammed) {
    return l === "legacy"
      ? { track: "rgba(60,0,0,0.75)", edge: "#ff3322", zone: "rgba(255,51,34,0.25)", perfect: "rgba(255,51,34,0.4)", marker: "#ff3322", fill: "rgba(255,51,34,0.35)" }
      : { track: HT.track, edge: HT.crimson, zone: "rgba(224,73,63,0.22)", perfect: "rgba(224,73,63,0.36)", marker: HT.crimson, fill: "rgba(224,73,63,0.3)" };
  }
  if (l === "legacy") {
    return { track: "rgba(0,0,0,0.7)", edge: "rgba(0,255,204,0.7)", zone: "rgba(0,255,204,0.35)", perfect: "#00ffcc", marker: "#ffffff", fill: "rgba(0,255,204,0.12)" };
  }
  if (l === "real") {
    return { track: "rgba(10,14,17,0.55)", edge: "rgba(228,230,225,0.55)", zone: "rgba(143,188,196,0.6)", perfect: "rgba(236,238,233,0.95)", marker: HT.text, fill: "rgba(228,230,225,0.14)" };
  }
  return { track: HT.track, edge: HT.ink, zone: "rgba(255,180,58,0.55)", perfect: "#fff1c8", marker: "#ffffff", fill: "rgba(34,230,255,0.18)" };
}

/** The bar: track, sweet zone, perfect zone, the marker, and the label above. */
function drawBar(ctx, l, x, y, w, h, a, t, done, s) {
  const jammed = a.pressed === "jam";
  const c = zoneColors(l, jammed);
  x = Math.round(x);
  // Comic draws a fat ink outline under everything.
  if (l === "comic") {
    ctx.fillStyle = HT.ink;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  }
  ctx.fillStyle = c.track;
  ctx.fillRect(x, y, w, h);
  // How far the reload has got (a jam keeps filling after the marker stops).
  ctx.fillStyle = c.fill;
  ctx.fillRect(x, y, Math.round(w * done), h);
  const zx = x + Math.round(w * a.zoneStart);
  const zw = Math.max(2, Math.round(w * (a.zoneEnd - a.zoneStart)));
  const pw = Math.max(1, Math.round(w * (a.perfectEnd - a.zoneStart)));
  ctx.fillStyle = c.zone;
  ctx.fillRect(zx, y, zw, h);
  ctx.fillStyle = c.perfect;
  ctx.fillRect(zx, y, pw, h);
  if (l === "legacy" || l === "real") {
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  // The marker overhangs the bar so it reads at a glance.
  const mx = x + Math.round(w * t);
  const over = Math.round(4 * s);
  if (l === "comic") {
    ctx.fillStyle = HT.ink;
    ctx.fillRect(mx - 3, y - over - 2, 6, h + over * 2 + 4);
  }
  ctx.fillStyle = c.marker;
  ctx.fillRect(mx - (l === "real" ? 0.5 : 1), y - over, l === "real" ? 1 : 2, h + over * 2);
  // Label above the bar's left end.
  const label = jammed ? "JAMMED" : "RELOAD";
  const size = Math.round(9 * s);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  if (l === "legacy") {
    ctx.font = `bold ${size + 1}px monospace`;
    ctx.fillStyle = jammed ? "#ff3322" : "rgba(0,255,204,0.85)";
    ctx.fillText(label, x, y - over - 3);
  } else if (l === "real") {
    ctx.font = uiFont(size, 600);
    ctx.letterSpacing = `${track(size, 1)}px`;
    ctx.fillStyle = jammed ? HT.crimson : HT.textDim;
    ctx.fillText(label, x, y - over - 3);
    ctx.letterSpacing = "0px";
  } else {
    ctx.font = uiFont(size + 1, 800);
    inkText(ctx, label, x, y - over - 4, jammed ? HT.critText : HT.chipLabel, 3);
  }
}

/** PERFECT / ACTIVE under the bar, just after the press. */
function drawWord(ctx, l, word, cx, y, perfect, s) {
  const size = Math.round((perfect ? 13 : 12) * s);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (l === "legacy") {
    ctx.font = `bold ${size}px monospace`;
    ctx.fillStyle = BOOST_LEGACY;
    ctx.fillText(word, cx, y + size);
  } else if (l === "real") {
    ctx.font = uiFont(size - 1, 600);
    ctx.letterSpacing = `${track(size, 1)}px`;
    ctx.fillStyle = BOOST_REAL;
    ctx.fillText(word, cx, y + size);
    ctx.letterSpacing = "0px";
  } else {
    ctx.font = uiFont(size + 2, 800);
    inkText(ctx, word, cx, y + size, BOOST_COMIC, 4);
  }
}

// ─── Conditioning chip ──────────────────────────────────────────────────────

/** Seconds the chip shows without a message director. */
const CHIP_S = 3;

/**
 * "CONDITIONING ↑ STAMINA 2": in the message director's chip lane when it
 * gives this chip its turn, else top centre for CHIP_S seconds.
 */
export function drawConditioningChip(ctx, game, w, h) {
  const d = game.messages;
  let data = null;
  let age = 0;
  let dur = CHIP_S;
  let lane = null;
  const cur = d?.current?.("chip");
  if (d?.lanes) {
    if (cur?.kind !== "conditioning") return;
    data = cur.data;
    age = d.age(cur.key);
    dur = cur.duration ?? CHIP_S;
    lane = d.lanes.chips;
  } else {
    const chip = game.conditioningChip;
    if (!chip) return;
    age = (game.time - chip.at) / 1000;
    if (age > CHIP_S) return;
    data = chip;
  }
  const skill = SKILLS[data.skill]?.label ?? String(data.skill).toUpperCase();
  const text = `${skill} ${data.level}`;
  const s = Math.max(0.8, Math.min(1.4, h / 900));
  const boxH = lane ? Math.min(Math.round(34 * s), lane.h - 4) : Math.round(34 * s);
  const l = look();
  ctx.save();
  const head = "CONDITIONING ↑";
  const headSize = Math.round(10 * s);
  const textSize = Math.round(14 * s);
  ctx.font = l === "legacy" ? `bold ${textSize}px monospace` : uiFont(textSize, 800);
  const tw = ctx.measureText(text).width;
  ctx.font = l === "legacy" ? `bold ${headSize}px monospace` : uiFont(headSize, 700);
  const hw = ctx.measureText(head).width;
  const pad = Math.round(10 * s);
  const boxW = Math.min(lane ? lane.w : w - 32, Math.round(hw + tw + pad * 3 + 4));
  // Slide in and out like the other chips.
  const t = Math.min(1, age / 0.3, Math.max(0, (dur - age) / 0.3));
  const bx = Math.round((lane ? lane.x + lane.w - boxW : w / 2 - boxW / 2) + (lane ? (1 - t) * (boxW + 30) : 0));
  const by = Math.round(lane ? lane.y : h * 0.16);
  ctx.globalAlpha *= lane ? 1 : t;
  if (l === "legacy") {
    ctx.fillStyle = "rgba(0,10,20,0.88)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(bx, by, 3, boxH);
  } else if (l === "real") {
    ctx.fillStyle = "rgba(10,14,17,0.55)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.fillStyle = HT.accent;
    ctx.fillRect(bx, by, 1, boxH);
  } else {
    ctx.fillStyle = HT.ink;
    ctx.fillRect(bx - 3, by - 3, boxW + 6, boxH + 6);
    ctx.fillStyle = "rgba(14,22,32,0.96)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.fillStyle = HT.gold;
    ctx.fillRect(bx, by, 4, boxH);
  }
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const midY = by + boxH / 2 + 1;
  const hx = bx + pad + 2;
  if (l === "legacy") {
    ctx.fillStyle = "rgba(0,255,204,0.8)";
    ctx.fillText(head, hx, midY);
    ctx.font = `bold ${textSize}px monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, hx + hw + pad, midY);
  } else if (l === "real") {
    ctx.letterSpacing = `${track(headSize, 1)}px`;
    ctx.fillStyle = HT.textDim;
    ctx.fillText(head, hx, midY);
    ctx.letterSpacing = "0px";
    ctx.font = uiFont(textSize, 600);
    ctx.fillStyle = HT.text;
    ctx.fillText(text, hx + hw + pad + 4, midY);
  } else {
    inkText(ctx, head, hx, midY, HT.chipLabel, 3);
    ctx.font = uiFont(textSize, 800);
    inkText(ctx, text, hx + hw + pad, midY, HT.gold, 3);
  }
  ctx.restore();
}
