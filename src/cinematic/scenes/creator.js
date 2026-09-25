/**
 * `creator` shots: the agent, as the character creator builds it
 * (buildAgentSvg: Comic's ink figure, or Modern's lit one when the art
 * profile is realistic), rasterised through the SVG layer cache and drawn at
 * full resolution on the HUD canvas over a studio backdrop.
 *
 * The figure is the player's own `game.character` (the default agent when
 * there is none yet), dressed for the shot by patches laid over a copy:
 * game.character is only ever read, so nothing reaches cc_character.
 *
 * spec: { view: "full" | "bust" | "torso" | "helm" = "full",
 *         looks: patch[] = [] (none: only the player's own look; "curated":
 *           the player's look, then LOOKS), push = 0.06 (slow push-in, as a
 *           fraction of the frame) }
 * Events: { type: "look", index }  wear look `index` (default: the next one)
 *         { type: "visor", len = 2 } the visor lights up over `len` beats and stays lit
 */
import { beatsToSec } from "../timeline.js";
import { DEFAULT_CHARACTER, CHARACTER_COLORS } from "../../data/cosmetics.js";
import { layer } from "../../data/badges.js";
import { AGENT_VIEW, buildAgentSvg, buildAgentParts } from "../../rendering/svg-art/agent-rig.js";
import { getLayerImage } from "../../rendering/svg-art/raster.js";

const WARM_FRAMES = 45;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const badge = (l, placements) => ({ layers: [l], finish: "auto", placements });

/**
 * Suits, haircuts and badges on the beat: three looks far from each other
 * and from the default. Open helmets (Bastion, Centurion) show the hair.
 */
export const LOOKS = [
  { colorIndex: 2, armorIndex: 2, helmetIndex: 3, hairIndex: 7, shoulderIndex: 3, badge: badge(layer("skull", "shield", "crimson", "steel"), ["chest"]) },
  { colorIndex: 4, armorIndex: 7, helmetIndex: 1, hairIndex: 8, visorIndex: 4, shoulderIndex: 5, badge: badge(layer("star", "cog", "amber", "gold"), ["chest", "shoulder"]) },
  { colorIndex: 3, armorIndex: 3, helmetIndex: 8, visorIndex: 2, shoulderIndex: 1, badge: badge(layer("rift", "hex", "violet", "blackened"), ["chest"]) },
];

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}

/** The shot's looks: whole characters, the player's own first. */
export function looksFor(character, spec) {
  const own = character ?? DEFAULT_CHARACTER;
  const patches = spec.looks === "curated" ? [{}, ...LOOKS] : [{}, ...(spec.looks ?? [])];
  // A patch replaces whole fields (a badge is one field), over a copy.
  return patches.map((p) => ({ ...own, ...structuredClone(p) }));
}

const profileNow = () => (typeof document !== "undefined" ? document.documentElement.dataset.artProfile : "modern");

// Layer ids name the look by content, so the same look in two shots (or
// two reels) decodes once.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

const markupCache = new Map();

/**
 * The look as a raster layer: `{ id, box, markup, glow }` — the figure, and
 * its visor glow alone (for the lit-visor close-up), in the view's box.
 */
function agentLayer(ch, viewName, realistic, px) {
  const key = `${viewName}|${realistic ? "r" : "c"}|${hash(JSON.stringify(ch))}`;
  let l = markupCache.get(key);
  if (l) return l;
  const view = AGENT_VIEW[viewName] ?? AGENT_VIEW.full;
  const svg = buildAgentSvg(ch, { view, realistic, px, idPrefix: `reel-${hash(key)}-` });
  const parts = buildAgentParts(ch);
  l = {
    id: `reel-agent:${key}`,
    box: view,
    markup: svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>")),
    glowId: `reel-visor:${key}`,
    glow: `<defs>${parts.defs}</defs>${parts.headGlow}`,
  };
  if (markupCache.size > 24) markupCache.clear();
  markupCache.set(key, l);
  return l;
}

/** Where the figure goes in a w × h HUD with the letterbox at `letterbox`: its box in CSS px. */
function frame(w, h, letterbox, viewName, zoom) {
  const barH = Math.max(0, (h - w / 2.39) / 2) * letterbox;
  const picH = h - 2 * barH;
  const view = AGENT_VIEW[viewName] ?? AGENT_VIEW.full;
  // A full figure stands in the picture; a close-up fills it (the crop is the frame).
  const fh = picH * (viewName === "full" ? 0.9 : 1.15) * zoom;
  const fw = (fh * view[2]) / view[3];
  const cx = viewName === "full" ? w * 0.5 : w * 0.56;
  const cy = barH + picH * (viewName === "full" ? 0.52 : 0.55);
  return { x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh };
}

export const creator = {
  /** Every look of the shot decoded ahead of the cut (the raster cache shows nothing). */
  prepare(game, spec, { live = () => true } = {}) {
    const prep = { ready: false, done: null };
    prep.done = warm(game, looksFor(game.character, spec), spec.view ?? "full", live).then(() => (prep.ready = true));
    return prep;
  },

  build(game, spec, rng, { live = () => true, reel, handle, prepared = null }) {
    const st = {
      looks: looksFor(game.character, spec),
      index: 0,
      view: spec.view ?? "full",
      reel,
      push: spec.push ?? 0.06,
      visorAt: null,
      visorLen: 1,
    };
    handle.creator = st;
    if (prepared?.ready) return;
    return prepared ? prepared.done : warm(game, st.looks, st.view, live);
  },

  update() {},

  event(game, ev, handle) {
    const st = handle.creator;
    if (!st) return;
    if (ev.type === "look") {
      const n = st.looks.length;
      st.index = Number.isInteger(ev.index) ? ((ev.index % n) + n) % n : (st.index + 1) % n;
    } else if (ev.type === "visor") {
      st.visorAt = beatsToSec(st.reel, ev.at ?? 0);
      st.visorLen = beatsToSec(st.reel, ev.len ?? 2);
    }
  },

  teardown(game, handle) {
    handle.creator = null;
  },

  /** The studio: a dark stage lit in the agent's accent, a pool of light on the floor. */
  draw(ctx, w, h, local, { handle }) {
    const st = handle.creator;
    if (!st) return;
    const ch = st.looks[st.index];
    const accent = (CHARACTER_COLORS[ch.colorIndex | 0] ?? CHARACTER_COLORS[0]).accent;
    ctx.fillStyle = "#04060b";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.75);
    g.addColorStop(0, hexA(accent, 0.2));
    g.addColorStop(0.55, hexA(accent, 0.05));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (st.view === "full") {
      ctx.save();
      ctx.translate(w * 0.5, h * 0.9);
      ctx.scale(1, 0.18);
      const f = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.4);
      f.addColorStop(0, hexA(accent, 0.28));
      f.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = f;
      ctx.fillRect(-h * 0.4, -h * 0.4, h * 0.8, h * 0.8);
      ctx.restore();
    }
  },

  hud(ctx, w, h, local, { handle, profile, dpr = 1, letterbox, shotLen }) {
    const st = handle.creator;
    if (!st) return;
    const zoom = 1 + st.push * smooth(shotLen > 0 ? local / shotLen : 0);
    const r = frame(w, h, letterbox, st.view, zoom);
    const l = agentLayer(st.looks[st.index], st.view, profile === "realistic", [r.w, r.h]);
    const scale = (r.h / l.box[3]) * dpr;
    const img = getLayerImage(l.id, l.box, "", l.markup, scale);
    if (!img) return;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    if (st.visorAt == null || local < st.visorAt) return;
    // The visor comes up to full over the event's length and holds, breathing.
    const k = smooth((local - st.visorAt) / Math.max(0.05, st.visorLen));
    const glow = getLayerImage(l.glowId, l.box, "", l.glow, scale);
    if (!glow) return;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = k * (0.75 + 0.25 * Math.sin(local * 5));
    ctx.filter = `blur(${Math.max(2, r.h * 0.012)}px)`;
    ctx.drawImage(glow, r.x, r.y, r.w, r.h);
    ctx.filter = "none";
    ctx.globalAlpha = k;
    ctx.drawImage(glow, r.x, r.y, r.w, r.h);
  },
};

/** "#rrggbb" at alpha `a`. */
function hexA(hex, a) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Decode every look of the shot at the size it draws (a few frames at most),
 * so no beat's look opens blank.
 */
async function warm(game, looks, view, live) {
  if (typeof Image === "undefined" || !game.hudW || !game.hudH) return;
  const profile = profileNow();
  const r = frame(game.hudW, game.hudH, 1, view, 1);
  const dpr = game.dpr || 1;
  const layers = looks.map((ch) => agentLayer(ch, view, profile === "realistic", [r.w, r.h]));
  const scale = (r.h / layers[0].box[3]) * dpr;
  for (let i = 0; i < WARM_FRAMES && live(); i++) {
    let ready = true;
    for (const l of layers) if (!getLayerImage(l.id, l.box, "", l.markup, scale)) ready = false;
    if (ready) return;
    await nextFrame();
  }
}
