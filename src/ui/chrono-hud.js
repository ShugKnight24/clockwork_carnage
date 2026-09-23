/**
 * The Chronos HUD cluster: the Resonance eye and a chip per unlocked power,
 * drawn beside the chrono bar in every HUD layout (Modern Minimal, Classic,
 * Tactical, Custom and Vanguard; Legacy Classic, Minimal and compact mobile).
 * Each layout only says where its chrono bar is; the look lives here so the
 * eight sites stay the same cluster.
 *
 *   eye     thin crimson almond, iris filling with Resonance; it opens wider
 *           past 50 and pulses past 75. Only from Act II, and not with the
 *           Hunter response set to Off.
 *   chips   one per power in grant order: its key for the input in use and
 *           a short name. A cooldown dims the chip and a ring closes around
 *           it; Foresight and a ready Chrono Dash light up while shifting.
 *
 * Also the teach card's hint, filled in for the device in use.
 */
import { isModernArt } from "../rendering/art-style.js";
import { uiFont } from "./modern-ui-kit.js";
import { POWERS } from "../systems/chrono-powers.js";
import { formatKeyCode } from "./controls-screen.js";

const EYE = "#ff2a4a";

/** keyboard, gamepad or touch: whichever the player is using now. */
export function inputDevice(game) {
  if (game.isTouchDevice) return "touch";
  if (game.lastInputWasGamepad && game.gamepad?.connected) return "gamepad";
  return "keyboard";
}

/** What to press for each power, for the device in use. */
export function powerKeys(game, device = inputDevice(game)) {
  if (device === "touch") {
    return { shift: "hold SLOW", dash: "DASH", rewind: "REWIND", lock: "LOCK", chip: { foresight: "", dash: "", rewind: "", timeLock: "" } };
  }
  if (device === "gamepad") {
    const l = game.gamepad?.getButtonLabels?.() ?? {};
    const y = l.chronoShift ?? "Y";
    return {
      shift: `hold ${y}`,
      dash: l.dash ?? "B",
      rewind: `${l.chronoRewind ?? "LB"} while shifting`,
      lock: l.chronoLock ?? "RS",
      chip: { foresight: y, dash: `${y}+${l.dash ?? "B"}`, rewind: `${y}+${l.chronoRewind ?? "LB"}`, timeLock: l.chronoLock ?? "RS" },
    };
  }
  const kb = game.keybinds ?? {};
  const q = formatKeyCode(kb.chronoShift ?? "KeyQ");
  const x = formatKeyCode(kb.chronoRewind ?? "KeyX");
  const v = formatKeyCode(kb.chronoLock ?? "KeyV");
  return {
    shift: `hold ${q}`,
    dash: "double-tap a direction",
    rewind: x,
    lock: v,
    chip: { foresight: q, dash: `${q}+2×`, rewind: x, timeLock: v },
  };
}

/** A teach card's hint with {SHIFT} {DASH} {REWIND} {LOCK} filled in. */
export function teachHint(template, game) {
  const k = powerKeys(game);
  return template
    .replaceAll("{SHIFT}", k.shift[0].toUpperCase() + k.shift.slice(1))
    .replaceAll("{DASH}", k.dash)
    .replaceAll("{REWIND}", k.rewind)
    .replaceAll("{LOCK}", k.lock);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

/** The eye: `s` tall, centred on (cx, cy). */
function drawEye(ctx, cx, cy, s, value, now) {
  const v = Math.max(0, Math.min(1, value / 100));
  const hw = s * 1.15;
  const open = s * (0.28 + 0.2 * v);
  const hot = value >= 75;
  const glow = hot ? 0.55 + 0.45 * Math.sin(now * 0.012) : value >= 50 ? 0.5 : 0.25;
  ctx.save();
  ctx.shadowColor = EYE;
  ctx.shadowBlur = hot ? 10 : 4;
  ctx.globalAlpha *= 0.55 + 0.45 * glow;
  ctx.strokeStyle = EYE;
  ctx.lineWidth = Math.max(1.2, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.quadraticCurveTo(cx, cy - open * 2, cx + hw, cy);
  ctx.quadraticCurveTo(cx, cy + open * 2, cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = "rgba(20,0,4,0.65)";
  ctx.fill();
  ctx.stroke();
  // Iris: fills clockwise with the meter.
  const ir = open * 0.85;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, ir, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v);
  ctx.closePath();
  ctx.fillStyle = EYE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  return hw * 2;
}

/**
 * Draw the cluster with its left edge (or right edge, or centre, per `align`)
 * at x and its middle at y.
 * @param {{ size?: number, align?: "left"|"right"|"center", labels?: boolean }} [opts]
 * @returns {number} the width drawn
 */
export function drawChronoCluster(ctx, game, x, y, { size = 18, align = "left", labels = true } = {}) {
  const cp = game.chronoPowers;
  if (!cp || game.mode !== "campaign") return 0;
  const powers = cp.powers;
  const showEye = cp.resonanceOn;
  if (!powers.length && !showEye) return 0;
  const p = game.player;
  const modern = isModernArt();
  const keys = powerKeys(game);
  const now = performance.now();
  const s = size;
  const gap = Math.round(s * 0.35);
  const font = modern ? uiFont(s * 0.5, 800) : `bold ${Math.round(s * 0.5)}px monospace`;
  const keyFont = modern ? uiFont(s * 0.45, 700, true) : `${Math.round(s * 0.45)}px monospace`;

  ctx.save();
  ctx.font = font;
  const chips = powers.map((id) => {
    const spec = POWERS[id];
    const key = labels && !game.isTouchDevice ? keys.chip[id] : "";
    ctx.font = keyFont;
    const kw = key ? ctx.measureText(key).width + s * 0.35 : 0;
    ctx.font = font;
    const nw = ctx.measureText(spec.short).width;
    return { id, spec, key, kw, w: Math.round(kw + nw + s * 0.7) };
  });
  const eyeW = showEye ? Math.round(s * 2.3) : 0;
  const total = eyeW + chips.reduce((n, c) => n + c.w + gap, 0) - (chips.length && !showEye ? gap : 0);
  let cx = align === "right" ? x - total : align === "center" ? x - total / 2 : x;

  if (showEye) {
    drawEye(ctx, cx + eyeW / 2, y, s * 0.72, cp.res.value, now);
    cx += eyeW + gap;
  }
  for (const c of chips) {
    const cd = cp.cooldown(c.id);
    const cost = c.spec.cost ?? 0;
    const ready = cd.left <= 0 && p.chronoEnergy >= cost;
    const live = (c.id === "foresight" || c.id === "dash") && p.chronoActive && ready;
    const top = y - s / 2;
    ctx.globalAlpha = ready ? 1 : 0.55;
    roundRect(ctx, cx, top, c.w, s, s * 0.28);
    ctx.fillStyle = live ? c.spec.color : "rgba(6,10,18,0.72)";
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = c.spec.color;
    ctx.stroke();
    // Recharge: the chip fills back from the left as the cooldown runs out.
    if (cd.left > 0) {
      ctx.save();
      roundRect(ctx, cx, top, c.w, s, s * 0.28);
      ctx.clip();
      ctx.fillStyle = c.spec.color;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(cx, top, c.w * (1 - cd.frac), s);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.spec.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + c.w - s * 0.1, top + s * 0.1, s * 0.22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd.frac));
      ctx.stroke();
    }
    ctx.globalAlpha = ready ? 1 : 0.6;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    let tx = cx + s * 0.35;
    if (c.key) {
      ctx.font = keyFont;
      ctx.fillStyle = live ? "#0b0b12" : "rgba(255,255,255,0.72)";
      ctx.fillText(c.key, tx, y + 0.5);
      tx += c.kw;
    }
    ctx.font = font;
    ctx.fillStyle = live ? "#0b0b12" : c.spec.color;
    ctx.fillText(c.spec.short, tx, y + 0.5);
    cx += c.w + gap;
  }
  ctx.restore();
  return total;
}
