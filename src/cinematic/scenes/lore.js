/**
 * The campaign lore video's own shots (reels/campaign-lore.js), registered
 * by films.js. None of them borrows a game field; the agent close-up reads
 * game.character through the creator scene, which never writes it.
 *
 *   loreBoot   black; ARIA's wake-up line typed under her sigil, a clock
 *              ticking on the beat (`tick` events).
 *              spec: { text }
 *   loreRift   the rift tears open down the middle of the frame, then the
 *              figure steps through it: a silhouette that comes into the
 *              light on the shot's last glitch.
 *              spec: { bg, art, openBeats = 3, stepBeats = 2.5, revealBeats = 5.5 }
 *   loreAgent  the creator scene's close-up of the player's agent, lit
 *              colder, with drifting dust and the rift's glow behind, and a
 *              suit readout that types in as the visor lights.
 *              spec: the creator scene's { view, push } (no looks: the
 *              player's own), events { type: "visor", len }
 *   loreClock  a clock face whose hands spin down onto twelve at `landAt`
 *              (beats), ratcheting louder as they slow, then recede behind
 *              the act title. `boom` events hit a low drum.
 *              spec: { landAt = 3 }
 *
 * Every figure is drawn in the active art profile's finish: Legacy's neon,
 * Comic's ink (profile "modern"), Modern's lit metal (profile "realistic").
 */
import { beatsToSec } from "../timeline.js";
import { art } from "./art.js";
import { creator } from "./creator.js";
import { AGENT_VIEW, buildAgentParts } from "../../rendering/svg-art/agent-rig.js";
import { getLayerImage } from "../../rendering/svg-art/raster.js";

const TAU = Math.PI * 2;
const clamp01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x);
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeOutCubic = (x) => 1 - (1 - clamp01(x)) ** 3;
const profileNow = () => (typeof document !== "undefined" && document.documentElement.dataset.artProfile) || "modern";

const MONO = '"SF Mono", Menlo, Consolas, "Courier New", monospace';
const SANS = '"Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif';

/** ARIA's colour in each finish. */
const ARIA = { legacy: "0,255,204", modern: "92,214,255", realistic: "143,188,196" };

/** A short click through the SFX bus (the clock's tick). */
function tick(audio, strong = false) {
  audio?.playTone?.(strong ? 1500 : 2300, 0.025, "square", strong ? 0.06 : 0.035);
}

// ─── loreBoot ─────────────────────────────────────────────────────────────

const TYPE_START = 0.45; // s before the first character
const TYPE_RATE = 0.075; // s a character

export const loreBoot = {
  build(game, spec, rng, { handle }) {
    handle.boot = { text: spec.text ?? "" };
  },
  update() {},
  event(game, ev) {
    if (ev.type === "tick") tick(game.audio, ev.at === 0);
  },
  teardown(game, handle) {
    handle.boot = null;
  },
  draw() {},
  hud(ctx, w, h, local, { handle, profile, fontScale = 1 }) {
    const st = handle.boot;
    if (!st) return;
    const rgb = ARIA[profile] ?? ARIA.modern;
    const cx = w / 2;
    const cy = h * 0.5;
    const wake = smooth(local / 0.6);

    // Her sigil: a ring that draws itself, a slow sweep, a breathing core.
    const r = h * 0.055;
    const sy = cy - h * 0.1;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(${rgb},${0.18 * wake})`;
    ctx.lineWidth = Math.max(1, h * 0.002);
    ctx.beginPath();
    ctx.arc(cx, sy, r * 1.55, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},${0.85 * wake})`;
    ctx.lineWidth = Math.max(1.5, h * 0.004);
    const a0 = -Math.PI / 2 + local * 1.6;
    ctx.beginPath();
    ctx.arc(cx, sy, r, a0, a0 + TAU * 0.7 * smooth(local / 1.2));
    ctx.stroke();
    const pulse = 0.55 + 0.45 * Math.sin(local * 4.2);
    const core = ctx.createRadialGradient(cx, sy, 0, cx, sy, r * 0.8);
    core.addColorStop(0, `rgba(${rgb},${0.9 * wake})`);
    core.addColorStop(0.4, `rgba(${rgb},${0.35 * wake * pulse})`);
    core.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = core;
    ctx.fillRect(cx - r, sy - r, r * 2, r * 2);

    // The line, typed, with a block cursor.
    const n = Math.max(0, Math.min(st.text.length, Math.floor((local - TYPE_START) / TYPE_RATE)));
    const size = Math.round(Math.max(16, h * 0.042) * fontScale);
    const shown = profile === "realistic" ? st.text.toUpperCase() : st.text;
    ctx.font = profile === "realistic" ? `500 ${size}px ${SANS}` : `700 ${size}px ${MONO}`;
    ctx.letterSpacing = profile === "realistic" ? `${Math.round(size * 0.28)}px` : `${Math.round(size * 0.08)}px`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const full = ctx.measureText(shown).width;
    const x0 = cx - full / 2;
    const typed = shown.slice(0, n);
    const tw = ctx.measureText(typed).width;
    const ty = cy + h * 0.02;
    ctx.fillStyle = `rgba(${rgb},0.22)`;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) ctx.fillText(typed, x0 + dx, ty + dy);
    ctx.fillStyle = profile === "legacy" ? "#e2fff8" : "#eef6f8";
    ctx.fillText(typed, x0, ty);
    const blink = n < shown.length || Math.floor(local * 2.4) % 2 === 0;
    if (blink && local > 0.2) {
      ctx.fillStyle = `rgba(${rgb},0.9)`;
      ctx.fillRect(x0 + tw + size * 0.12, ty - size * 0.5, size * 0.55, size);
    }
    ctx.letterSpacing = "0px";

    // A hairline that fills as her systems come up.
    const done = smooth((local - TYPE_START) / (TYPE_RATE * st.text.length + 0.8));
    const lw = Math.max(full, h * 0.3);
    ctx.fillStyle = `rgba(${rgb},0.14)`;
    ctx.fillRect(cx - lw / 2, ty + size * 1.1, lw, 1);
    ctx.fillStyle = `rgba(${rgb},0.8)`;
    ctx.fillRect(cx - lw / 2, ty + size * 1.1, lw * done, 1);
  },
};

// ─── loreRift ─────────────────────────────────────────────────────────────

let cs = null; // the cutscene drawing functions, once their chunk has loaded

async function loadCutscene() {
  if (cs) return cs;
  const [cut, artMod] = await Promise.all([import("../../../js/cutscene.js"), import("../../rendering/cutscene-art.js")]);
  cs = { drawCutsceneBg: cut.drawCutsceneBg, drawCutsceneArt: artMod.drawCutsceneArt };
  return cs;
}

const TEAR_POINTS = 28;

export const loreRift = {
  async build(game, spec, rng, { live = () => true, reel, handle }) {
    // The tear's ragged edge, fixed per shot (seeded, so every playback matches).
    const jag = Array.from({ length: TEAR_POINTS + 1 }, () => rng() * 2 - 1);
    handle.rift = null;
    await loadCutscene();
    if (!live()) return;
    // The art scene's warm-up: the Modern backdrop and figure decoded before the cut.
    await art.build(game, { bg: spec.bg, art: spec.art }, rng, { live });
    handle.rift = {
      jag,
      open: beatsToSec(reel, spec.openBeats ?? 3),
      step: beatsToSec(reel, spec.stepBeats ?? 2.5),
      reveal: beatsToSec(reel, spec.revealBeats ?? 5.5),
    };
  },
  update() {},
  event() {},
  teardown(game, handle) {
    handle.rift = null;
  },
  draw(ctx, w, h, local, { game, shotLen, handle }) {
    const st = handle.rift;
    if (!st || !cs) return;
    const spec = handle.shot.scene;
    // A hairline first, then it tears wide.
    const open = smooth(local / st.open);
    const zoom = 1 + 0.08 * smooth(local / shotLen);
    const edge = tearEdge(st.jag, w, h, open, local);

    // The world beyond, only through the tear.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(edge[0][0], edge[0][1]);
    for (const [x, y] of edge) ctx.lineTo(x, y);
    for (let i = edge.length - 1; i >= 0; i--) ctx.lineTo(w - edge[i][0], edge[i][1]);
    ctx.closePath();
    ctx.clip();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);
    cs.drawCutsceneBg(ctx, w, h, spec.bg, local);
    ctx.restore();

    // The tear's burning edges, gone once it has opened past the frame.
    const burn = 1 - smooth((open - 0.7) / 0.3);
    if (burn > 0) drawTearEdges(ctx, w, edge, burn, h);

    // The figure steps out of the light: small and far, then close.
    const since = local - st.step;
    if (since <= 0) return;
    const k = smooth(since / (shotLen - st.step));
    const alpha = smooth(since / 0.8);
    const scale = 0.5 + 0.24 * k;
    const lit = smooth((local - st.reveal) / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2, h / 2 + h * (0.2 - 0.06 * k));
    ctx.scale(scale * zoom, scale * zoom);
    ctx.translate(-w / 2, -h / 2);
    const t = 1.2 + since;
    if (lit < 1) drawSilhouette(ctx, w, h, spec.art, t, !!game.isTouchDevice);
    if (lit > 0) {
      ctx.globalAlpha = alpha * lit;
      cs.drawCutsceneArt(ctx, w, h, spec.art, t, !!game.isTouchDevice);
    }
    ctx.restore();
  },
};

/**
 * The left edge of the tear, top to bottom: a ragged lens that starts as a
 * hairline down the middle and opens past both sides of the frame.
 */
function tearEdge(jag, w, h, open, t) {
  const pts = [];
  const spread = w * (0.004 + 0.62 * open ** 1.4);
  for (let i = 0; i <= TEAR_POINTS; i++) {
    const v = i / TEAR_POINTS;
    const lens = Math.sin(Math.PI * v) ** (1 - open * 0.85);
    // The ragged edge flickers a little while it tears, and settles.
    const shiver = jag[i] * h * 0.03 * (1 - open * 0.6) + Math.sin(t * 17 + i * 1.7) * h * 0.004 * (1 - open);
    pts.push([w / 2 - spread * lens - shiver, v * h]);
  }
  pts[0][1] = -h * 0.02;
  pts[TEAR_POINTS][1] = h * 1.02;
  return pts;
}

function drawTearEdges(ctx, w, edge, a, h) {
  const strokeBoth = (style, width) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    for (const mirror of [false, true]) {
      ctx.beginPath();
      edge.forEach(([x, y], i) => (i ? ctx.lineTo(mirror ? w - x : x, y) : ctx.moveTo(mirror ? w - x : x, y)));
      ctx.stroke();
    }
  };
  ctx.save();
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "lighter";
  strokeBoth(`rgba(120,40,255,${0.18 * a})`, h * 0.03);
  strokeBoth(`rgba(0,200,255,${0.35 * a})`, h * 0.011);
  strokeBoth(`rgba(230,250,255,${0.9 * a})`, Math.max(1.5, h * 0.0025));
  ctx.restore();
}

let layer = null; // the figure's shape, reused by every silhouette frame
let comp = null; // the finished silhouette, drawn once so a fade does not show the rim through the body

function canvasOf(c, w, h) {
  c ??= document.createElement("canvas");
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

/** The figure as a black shape with a red rim (the art scene's silhouette look). */
function drawSilhouette(ctx, w, h, key, t, touch) {
  if (typeof document === "undefined") return;
  layer = canvasOf(layer, w, h);
  comp = canvasOf(comp, w, h);
  const g = layer.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.clearRect(0, 0, w, h);
  cs.drawCutsceneArt(g, w, h, key, t, touch);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#ff2a3c";
  g.fillRect(0, 0, w, h);
  const r = Math.max(2, Math.round(h * 0.006));
  const c = comp.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.clearRect(0, 0, w, h);
  c.globalAlpha = 0.6;
  c.drawImage(layer, -r, 0);
  c.drawImage(layer, r, 0);
  c.drawImage(layer, 0, -r);
  c.globalAlpha = 1;
  g.fillStyle = "#06040a";
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "source-over";
  c.drawImage(layer, 0, 0);
  ctx.drawImage(comp, 0, 0);
}

// ─── loreAgent ────────────────────────────────────────────────────────────

const MOTES = 70;
const WARM_FRAMES = 45;

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** The look's visor glow alone, as a raster layer in the view's box. */
function visorLayer(ch, view) {
  const box = AGENT_VIEW[view] ?? AGENT_VIEW.bust;
  const parts = buildAgentParts(ch);
  const markup = `<defs>${parts.defs}</defs>${parts.headGlow}`;
  return { id: `lore-visor:${view}:${hash(markup)}`, box, markup };
}

/**
 * The creator's close-up with the lights out: the figure sits nearly black
 * with the rift's violet on its far edge until the visor event, when the
 * visor ignites (a stutter, then full) and a low key light comes up with it.
 * The creator scene draws the figure (its own visor glow held back); this
 * scene darkens it and draws the visor on top.
 */
export const loreAgent = {
  prepare: creator.prepare,

  build(game, spec, rng, opts) {
    const { handle, live = () => true } = opts;
    // Dust in the air between the camera and the agent, fixed per shot.
    handle.motes = Array.from({ length: MOTES }, () => [rng(), rng(), 0.3 + rng() * 0.7, rng()]);
    handle.agentName = String(game.character?.name ?? "").trim();
    const view = spec.view ?? "full";
    const built = creator.build(game, spec, rng, opts);
    handle.visor = visorLayer(handle.creator.looks[0], view);
    const scale = ((game.hudH || 900) * 0.9 / handle.visor.box[3]) * (game.dpr || 1);
    const warm = async () => {
      for (let i = 0; i < WARM_FRAMES && live(); i++) {
        if (typeof Image === "undefined" || getLayerImage(handle.visor.id, handle.visor.box, "", handle.visor.markup, scale)) return;
        await nextFrame();
      }
    };
    return Promise.all([built, warm()]).then(() => {});
  },
  update() {},
  event: creator.event,
  teardown(game, handle) {
    creator.teardown(game, handle);
    handle.motes = null;
    handle.visor = null;
  },

  draw(ctx, w, h, local, opts) {
    creator.draw(ctx, w, h, local, opts);
    const { handle } = opts;
    const st = handle.creator;
    const lit = litAt(st, local);
    const profile = profileNow();
    // The rift's light from behind the agent's shoulder, and a cold key from the left as the suit wakes.
    const rift = ctx.createRadialGradient(w * 0.82, h * 0.3, 0, w * 0.82, h * 0.3, h * 0.9);
    rift.addColorStop(0, profile === "realistic" ? "rgba(90,70,160,0.30)" : "rgba(120,50,255,0.34)");
    rift.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rift;
    ctx.fillRect(0, 0, w, h);
    const key = ctx.createLinearGradient(0, 0, w * 0.5, 0);
    key.addColorStop(0, `rgba(40,160,255,${0.05 + 0.12 * lit})`);
    key.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = key;
    ctx.fillRect(0, 0, w, h);
    drawMotes(ctx, w, h, local, handle.motes, profile, 1);
  },

  hud(ctx, w, h, local, opts) {
    const { handle, profile, dpr = 1, letterbox = 1, fontScale = 1 } = opts;
    const st = handle.creator;
    if (!st) return;
    const lit = litAt(st, local);
    // The figure alone: this shot draws the visor itself, over the dark.
    const visorAt = st.visorAt;
    st.visorAt = null;
    let rect = null;
    ctx.drawImage = function (img, x, y, dw, dh) {
      rect ??= { x, y, w: dw, h: dh };
      return CanvasRenderingContext2D.prototype.drawImage.apply(this, arguments);
    };
    try {
      creator.hud(ctx, w, h, local, opts);
    } finally {
      delete ctx.drawImage;
      st.visorAt = visorAt;
    }
    if (!rect) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(3,5,10,${0.86 - 0.5 * lit})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const rim = ctx.createLinearGradient(rect.x + rect.w * 0.95, 0, rect.x + rect.w * 0.5, 0);
    rim.addColorStop(0, "rgba(160,100,255,0.4)");
    rim.addColorStop(1, "rgba(160,100,255,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    if (lit > 0 && handle.visor) {
      const v = handle.visor;
      const glow = getLayerImage(v.id, v.box, "", v.markup, (rect.h / v.box[3]) * dpr);
      if (glow) {
        // It catches twice before it holds, then breathes.
        const since = local - visorAt;
        const stutter = since < 0.12 ? 1 : since < 0.24 ? 0.15 : since < 0.34 ? 0.9 : since < 0.42 ? 0.3 : 1;
        const a = Math.max(lit, since < 0.42 ? 0.8 : 0) * stutter * (0.82 + 0.18 * Math.sin(local * 5));
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a;
        ctx.filter = `blur(${Math.max(3, rect.h * 0.018)}px)`;
        ctx.drawImage(glow, rect.x, rect.y, rect.w, rect.h);
        ctx.filter = "none";
        ctx.drawImage(glow, rect.x, rect.y, rect.w, rect.h);
        ctx.restore();
      }
    }
    if (visorAt == null || local < visorAt) return;
    // The suit's readout, typed in as the visor comes up.
    const rgb = ARIA[profile] ?? ARIA.modern;
    const barH = Math.max(0, (h - w / 2.39) / 2) * letterbox;
    const size = Math.round(Math.max(11, h * 0.017) * fontScale);
    const x = w * 0.06;
    let y = barH + h * 0.08;
    const lines = ["SUIT ONLINE", "VITALS  NOMINAL"];
    const name = handle.agentName;
    if (name && name.toLowerCase() !== "agent") lines.unshift(`AGENT  ${name.toUpperCase()}`);
    ctx.font = profile === "realistic" ? `600 ${size}px ${SANS}` : `700 ${size}px ${MONO}`;
    ctx.letterSpacing = `${Math.round(size * 0.22)}px`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    let clock = local - visorAt - 0.5;
    for (const line of lines) {
      const n = Math.max(0, Math.min(line.length, Math.floor(clock / 0.035)));
      clock -= line.length * 0.035 + 0.15;
      if (!n) break;
      ctx.fillStyle = `rgba(${rgb},0.9)`;
      ctx.fillRect(x, y + size * 0.1, Math.max(2, size * 0.18), size * 0.8);
      ctx.fillStyle = "rgba(236,246,248,0.88)";
      ctx.fillText(line.slice(0, n), x + size * 0.7, y);
      y += size * 1.7;
    }
    ctx.letterSpacing = "0px";
  },
};

/** How far the visor has come up (0 before its event, 1 once lit). */
function litAt(st, local) {
  if (!st || st.visorAt == null) return 0;
  return smooth((local - st.visorAt) / Math.max(0.05, st.visorLen));
}

function drawMotes(ctx, w, h, t, motes, profile, alpha) {
  if (!motes) return;
  const rgb = profile === "legacy" ? "0,255,204" : "210,225,255";
  for (const [mx, my, depth, phase] of motes) {
    const x = ((mx + t * 0.012 * depth + Math.sin(t * 0.4 + phase * 6) * 0.01) % 1) * w;
    const y = ((my - t * 0.02 * depth + 1) % 1) * h;
    const s = Math.max(1, h * 0.0022 * depth);
    ctx.fillStyle = `rgba(${rgb},${alpha * (0.12 + 0.3 * depth) * (0.6 + 0.4 * Math.sin(t * 2 + phase * 9))})`;
    ctx.fillRect(x, y, s, s);
  }
}

// ─── loreClock ────────────────────────────────────────────────────────────

const MINUTE_TURNS = 12; // the minute hand's turns before it lands (the hour hand's one)
const SECOND_TURNS = 36;

/**
 * Hand angles (radians clockwise from twelve) `t` seconds into the spin,
 * landing at `land`: they race, slow, and both come to rest on twelve (whole
 * turns), and stay there.
 */
export function handAngles(t, land) {
  const k = easeOutCubic(land > 0 ? t / land : 1);
  return { hour: TAU * k, minute: TAU * MINUTE_TURNS * k, second: TAU * SECOND_TURNS * k };
}

export const loreClock = {
  build(game, spec, rng, { reel, handle }) {
    handle.clock = { land: beatsToSec(reel, spec.landAt ?? 3), notch: 0, lastTick: -1 };
  },

  /** A ratchet on every notch the minute hand passes, spaced out as it slows. */
  update(game, dt, local, handle) {
    const st = handle.clock;
    if (!st || local > st.land) return;
    const notch = Math.floor(handAngles(local, st.land).minute / (TAU / 12));
    if (notch !== st.notch && local - st.lastTick > 0.06) {
      st.notch = notch;
      st.lastTick = local;
      tick(game.audio);
    }
  },

  event(game, ev) {
    if (ev.type !== "boom") return;
    game.audio?.playTone?.(52, 1.8, "sine", 0.55);
    game.audio?.playTone?.(104, 0.9, "triangle", 0.18);
    tick(game.audio, true);
  },

  teardown(game, handle) {
    handle.clock = null;
  },

  draw(ctx, w, h, local, { handle }) {
    const st = handle.clock;
    if (!st) return;
    const profile = profileNow();
    const into = smooth(local / 0.7);
    const after = Math.max(0, local - st.land);
    // Once it lands the face drifts toward the camera and dims behind the title.
    const scale = (0.92 + 0.08 * into) * (1 + 0.22 * smooth(after / 2.5));
    const dim = into * (1 - 0.72 * smooth(after / 0.9));
    const R = h * 0.34 * scale;
    const cx = w / 2;
    const cy = h / 2;

    const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.1);
    const tint = profile === "legacy" ? "0,255,204" : profile === "realistic" ? "232,176,74" : "255,200,120";
    glow.addColorStop(0, `rgba(${tint},${0.14 * dim})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = dim;
    ctx.translate(cx, cy);
    (FACES[profile] ?? FACES.modern)(ctx, R);
    const now = handAngles(local, st.land);
    const speed = local < st.land ? handAngles(local + 1 / 60, st.land).minute - now.minute : 0;
    // The hands go first, so nothing crosses the title's letters.
    ctx.globalAlpha = dim * (1 - 0.7 * smooth(after / 0.6));
    drawHands(ctx, R, now, speed, profile);
    ctx.restore();
  },
};

/** Hour and minute notches around a face of radius R. */
function notches(ctx, R, inner, color, hourW, minW) {
  ctx.strokeStyle = color;
  ctx.lineCap = "butt";
  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0;
    const a = (i / 60) * TAU;
    const r0 = R * (hour ? inner - 0.09 : inner - 0.035);
    ctx.lineWidth = hour ? hourW : minW;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0);
    ctx.lineTo(Math.sin(a) * R * inner, -Math.cos(a) * R * inner);
    ctx.stroke();
  }
}

const FACES = {
  // Neon: rings and notches drawn in light.
  legacy(ctx, R) {
    ctx.fillStyle = "rgba(0,20,24,0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    for (const [lw, a] of [[R * 0.06, 0.12], [R * 0.025, 0.3], [R * 0.008, 1]]) {
      ctx.strokeStyle = `rgba(0,255,204,${a})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,255,204,0.35)";
    ctx.lineWidth = R * 0.004;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.8, 0, TAU);
    ctx.stroke();
    notches(ctx, R, 0.94, "rgba(160,255,236,0.9)", R * 0.018, R * 0.006);
  },
  // Comic: a cream face in heavy ink, Roman numerals at the quarters.
  modern(ctx, R) {
    ctx.fillStyle = "#0b0b0e";
    ctx.beginPath();
    ctx.arc(R * 0.03, R * 0.04, R * 1.04, 0, TAU);
    ctx.fill();
    const face = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
    face.addColorStop(0, "#fbf1d6");
    face.addColorStop(1, "#e2cf9f");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    // Halftone shade on the lower right, as the comic panels are shaded.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = "rgba(120,80,30,0.22)";
    const step = R * 0.07;
    for (let y = -R; y < R; y += step) {
      for (let x = -R; x < R; x += step) {
        const d = (x + y) / (2 * R) + 0.1;
        if (d <= 0) continue;
        ctx.beginPath();
        ctx.arc(x, y, step * 0.42 * Math.min(1, d * 1.6), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = R * 0.07;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.stroke();
    notches(ctx, R, 0.9, "#1a1612", R * 0.03, R * 0.01);
    ctx.fillStyle = "#1a1612";
    ctx.font = `900 ${Math.round(R * 0.16)}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const q = R * 0.62;
    [["XII", 0, -q], ["III", q, 0], ["VI", 0, q], ["IX", -q, 0]].forEach(([s, x, y]) => ctx.fillText(s, x, y));
  },
  // Modern: a dark dial in a brushed steel bezel, lume on the notches.
  realistic(ctx, R) {
    const bezel = ctx.createLinearGradient(-R, -R, R, R);
    bezel.addColorStop(0, "#d9dde0");
    bezel.addColorStop(0.35, "#6d747b");
    bezel.addColorStop(0.6, "#b9bec2");
    bezel.addColorStop(1, "#3a3f45");
    ctx.fillStyle = bezel;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.07, 0, TAU);
    ctx.fill();
    const dial = ctx.createRadialGradient(-R * 0.25, -R * 0.3, R * 0.05, 0, 0, R);
    dial.addColorStop(0, "#23282e");
    dial.addColorStop(1, "#090b0e");
    ctx.fillStyle = dial;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.99, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = R * 0.004;
    for (const rr of [0.52, 0.56]) {
      ctx.beginPath();
      ctx.arc(0, 0, R * rr, 0, TAU);
      ctx.stroke();
    }
    notches(ctx, R, 0.93, "rgba(228,230,225,0.9)", R * 0.022, R * 0.006);
    // Lume dots inside the hour notches.
    ctx.fillStyle = "#e8b04a";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.beginPath();
      ctx.arc(Math.sin(a) * R * 0.78, -Math.cos(a) * R * 0.78, R * (i % 3 === 0 ? 0.022 : 0.013), 0, TAU);
      ctx.fill();
    }
    // A sweep of reflected light across the crystal.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.99, 0, TAU);
    ctx.clip();
    const sheen = ctx.createLinearGradient(-R, -R, R * 0.2, R * 0.2);
    sheen.addColorStop(0, "rgba(255,255,255,0.10)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.02)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
  },
};

const HAND_LOOK = {
  legacy: { ink: "#e2fff8", glow: "rgba(0,255,204,0.35)", second: "#ff3a3a", hub: "#00ffcc" },
  modern: { ink: "#111", glow: null, second: "#d62828", hub: "#111" },
  realistic: { ink: "#e4e6e1", glow: null, second: "#e8b04a", hub: "#c9ced2" },
};

/** Tapered hands; while they race, fainter copies trail behind them. */
function drawHands(ctx, R, a, speed, profile) {
  const look = HAND_LOOK[profile] ?? HAND_LOOK.modern;
  const trail = Math.min(8, Math.round(Math.abs(speed) * 6));
  const hands = [
    [a.hour, R * 0.5, R * 0.05, look.ink, 1 / MINUTE_TURNS],
    [a.minute, R * 0.78, R * 0.035, look.ink, 1],
    [a.second, R * 0.86, R * 0.012, look.second, SECOND_TURNS / MINUTE_TURNS],
  ];
  for (const [angle, len, width, color, rate] of hands) {
    for (let i = trail; i >= 0; i--) {
      const back = i * speed * rate * 0.35;
      const alpha = i === 0 ? 1 : 0.28 * (1 - i / (trail + 1));
      drawHand(ctx, angle - back, len, width, color, alpha, look.glow && i === 0 ? look.glow : null);
    }
  }
  ctx.fillStyle = look.hub;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.045, 0, TAU);
  ctx.fill();
}

function drawHand(ctx, angle, len, width, color, alpha, glow) {
  ctx.save();
  ctx.rotate(angle);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  if (glow) {
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(-width * 1.6, len * 0.14);
    ctx.lineTo(0, -len - width * 1.5);
    ctx.lineTo(width * 1.6, len * 0.14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-width / 2, len * 0.12);
  ctx.lineTo(-width * 0.25, -len);
  ctx.lineTo(width * 0.25, -len);
  ctx.lineTo(width / 2, len * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = prev;
  ctx.restore();
}

export const LORE_SCENES = { loreBoot, loreRift, loreAgent, loreClock };
