/**
 * Cover on the HUD, for every HUD layout and art style: the "TAKE COVER"
 * prompt when there is a face in reach, and in cover a soft darkening of the
 * frame's edges with a small wall glyph that says whether you are down,
 * exposed or blind-firing. Nothing here is drawn near the reticle: the sights
 * stay clear (src/systems/aim.js).
 *
 * Down behind low cover, the near edge of the cover also rises into the
 * bottom of the view (drawCoverLip, drawn under the gun). The raycaster's eye
 * stays at half a wall whatever the stance, so without it a waist-high block
 * a third of a tile away sits almost out of frame and crouching behind it
 * looks like standing in the open.
 *
 * Legacy draws neon strokes in monospace, Comic an inked glyph, and Modern
 * (the realistic profile) a thin helmet-HUD line with a tracked label.
 */
import { isModernArt, isRealisticArt } from "../rendering/art-style.js";
import { HT } from "./hud-skin.js";
import { uiFont } from "./modern-ui-kit.js";
import { activeDevice, drawPrompt } from "./input-glyphs.js";
import { currentBarH } from "../systems/aim.js";

/** In cover this long, the peek / leave hints fade out. */
const HINT_MS = 3500;
/** A blind-fire shot keeps the BLIND FIRE label up this long. */
const BLIND_LABEL_MS = 450;

/** On a pad the dash button doubles as cover (src/systems/cover-play.js). */
const coverAction = (game) => (activeDevice(game) === "gamepad" ? "dash" : "cover");

function look() {
  return isModernArt() ? "modern" : "legacy";
}

/** The edges of the view darken a little, the bottom most: you are down behind something. */
function drawVignette(ctx, w, viewH, strength) {
  if (strength <= 0) return;
  ctx.save();
  const r = Math.hypot(w, viewH) / 2;
  const g = ctx.createRadialGradient(w / 2, viewH * 0.42, r * 0.55, w / 2, viewH * 0.42, r);
  const tint = isRealisticArt() ? "8,12,14" : isModernArt() ? "10,14,30" : "0,20,30";
  g.addColorStop(0, `rgba(${tint},0)`);
  g.addColorStop(1, `rgba(${tint},${0.42 * strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, viewH);
  const band = ctx.createLinearGradient(0, viewH * 0.82, 0, viewH);
  band.addColorStop(0, `rgba(${tint},0)`);
  band.addColorStop(1, `rgba(${tint},${0.3 * strength})`);
  ctx.fillStyle = band;
  ctx.fillRect(0, viewH * 0.82, w, viewH * 0.18);
  ctx.restore();
}

/** A low wall of three blocks, the top one dropped when the cover is high. */
function wallPath(ctx, x, y, s, low) {
  const bw = 12 * s;
  const bh = 6 * s;
  ctx.beginPath();
  ctx.rect(x - bw * 1.5, y - bh, bw, bh);
  ctx.rect(x - bw * 0.5, y - bh, bw, bh);
  ctx.rect(x + bw * 0.5, y - bh, bw, bh);
  ctx.rect(x - bw, y - bh * 2, bw, bh);
  ctx.rect(x, y - bh * 2, bw, bh);
  if (!low) {
    ctx.rect(x - bw * 1.5, y - bh * 3, bw, bh);
    ctx.rect(x - bw * 0.5, y - bh * 3, bw, bh);
    ctx.rect(x + bw * 0.5, y - bh * 3, bw, bh);
  }
}

function drawGlyph(ctx, x, y, low, label, state) {
  const s = 1;
  ctx.save();
  if (!isModernArt()) {
    // Legacy: neon outline and monospace, as the rest of that HUD.
    const col = state === "exposed" ? "#ffcc33" : "#00e5ff";
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    wallPath(ctx, x, y, s, low);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = col;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, y + 6);
  } else if (!isRealisticArt()) {
    // Comic: a filled, inked glyph and an outlined caption.
    const fill = state === "exposed" ? HT.amber : HT.accent;
    wallPath(ctx, x, y, s, low);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineJoin = "miter";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = HT.ink;
    ctx.stroke();
    ctx.font = uiFont(12, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = 4;
    ctx.strokeText(label, x, y + 6);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x, y + 6);
  } else {
    // Modern: a hairline glyph and a small tracked label on no plate at all.
    ctx.strokeStyle = state === "exposed" ? HT.amber : HT.accent;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1;
    wallPath(ctx, x, y, s, low);
    ctx.stroke();
    ctx.fillStyle = state === "exposed" ? HT.amber : HT.text;
    ctx.font = uiFont(10, 600);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
    ctx.fillText(label, x, y + 6);
  }
  ctx.restore();
}

/**
 * The top of the low cover the player is crouched behind, across the bottom
 * of the view. It rises with the stance and sinks as the sights stand the
 * player up, and fades as the view turns away from the cover.
 */
export function drawCoverLip(game, ctx, w, h) {
  const p = game.player;
  const f = p?.cover?.face;
  if (!f?.low) return;
  const k = p.crouchBlend || 0;
  if (k < 0.01) return;
  const facing = Math.cos(p.angle) * -f.nx + Math.sin(p.angle) * -f.ny;
  const fade = Math.max(0, Math.min(1, (facing - 0.35) / 0.45));
  if (fade <= 0) return;
  // The bar is measured on the canvas, which the world may render under at a lower resolution.
  const viewH = h - currentBarH(game) * (h / (game.canvas?.height || h));
  const top = Math.round(viewH * (1.04 - 0.4 * k));
  ctx.save();
  ctx.globalAlpha = fade;
  // Its shadow on the view just above it.
  const shade = ctx.createLinearGradient(0, top - viewH * 0.06, 0, top);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, top - viewH * 0.06, w, viewH * 0.06);
  if (!isModernArt()) {
    // Legacy: a dark slab with a neon rim, like the level's own wireframe.
    ctx.fillStyle = "rgba(6,12,22,0.94)";
    ctx.fillRect(0, top, w, h - top);
    ctx.fillStyle = "rgba(0,229,255,0.07)";
    for (let y = top + 6; y < h; y += 6) ctx.fillRect(0, y, w, 1);
    ctx.shadowColor = "#00e5ff";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(0, top, w, 2);
  } else if (!isRealisticArt()) {
    // Comic: flat steel under a heavy ink line, with one bevel highlight.
    ctx.fillStyle = "#2b3542";
    ctx.fillRect(0, top, w, h - top);
    ctx.fillStyle = "#3f4c5c";
    ctx.fillRect(0, top + 4, w, 5);
    ctx.fillStyle = HT.ink;
    ctx.fillRect(0, top - 2, w, 5);
  } else {
    // Modern: a lit top face falling into shadow, no line work.
    const g = ctx.createLinearGradient(0, top, 0, h);
    g.addColorStop(0, "rgba(58,62,66,0.97)");
    g.addColorStop(0.08, "rgba(34,37,40,0.98)");
    g.addColorStop(1, "rgba(10,11,13,0.99)");
    ctx.fillStyle = g;
    ctx.fillRect(0, top, w, h - top);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(0, top, w, 1);
  }
  ctx.restore();
}

/** Prompts and the in-cover indicator over a view `h - barH` tall. */
export function drawCoverHud(game, ctx, w, h, barH = 0) {
  const p = game.player;
  if (!p?.alive) return;
  const viewH = h - barH;
  const style = { look: look(), input: game, align: "center", size: 12 };
  const c = p.cover;

  if (!c) {
    if (!p.coverAvailable || p.isDashing || p.isSliding) return;
    drawPrompt(ctx, w / 2, Math.round(viewH * 0.72), [[coverAction(game), "TAKE COVER"]], { ...style, alpha: 0.95 });
    return;
  }

  const blind = game.time - (p._blindFireAt ?? -Infinity) < BLIND_LABEL_MS;
  const state = p.coverPeeking ? "exposed" : blind ? "blind" : "down";
  drawVignette(ctx, w, viewH, p.coverPeeking ? 0.35 : 1);
  const label = state === "exposed" ? "EXPOSED" : state === "blind" ? "BLIND FIRE" : "IN COVER";
  // Left of centre, clear of the reticle and of the gun, which sits right
  // of centre and comes to the middle when aiming.
  const gy = Math.round(viewH - Math.max(72, viewH * 0.13));
  drawGlyph(ctx, Math.round(w * 0.36), gy, c.face.low, label, state);

  // What can be done from here: a dash to the next cover when one is in
  // view, and early on how to peek and step out.
  const items = [];
  if (p.isAiming) return;
  if (p.coverDashTarget) items.push(["dash", "COVER DASH"]);
  if (game.time - c.since < HINT_MS) {
    if (c.face.low || game.player.coverPeeking) items.push(["aim", "PEEK"]);
    else items.push(["aim", "LEAN AT EDGE"]);
    items.push([coverAction(game), "LEAVE"]);
  }
  if (items.length) drawPrompt(ctx, w / 2, Math.round(viewH * 0.74), items, { ...style, alpha: 0.85 });
}
