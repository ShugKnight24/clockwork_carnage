/**
 * Modern-mode renderer for the title-screen web components.
 *
 * Takes models in the svg-art format (see src/rendering/svg-art/index.js) and
 * lays each layer out as its own <img> on a 700×400 stage — the same space as
 * the legacy title SVGs. Every layer is a standalone SVG document decoded once,
 * and its `anim` becomes a CSS transform/opacity animation, so the compositor
 * moves bitmaps instead of the browser repainting blurred vector art each frame.
 */

import { onArtStyleChange, isModernArt } from "../../src/rendering/art-style.js";

export const STAGE_W = 700;
export const STAGE_H = 400;
const TAU = Math.PI * 2;

const f = (n) => Math.round(n * 1000) / 1000;
const pct = (n, of) => `${f((n / of) * 100)}%`;

// Sine-like easing per quarter period: fast through the rest pose, slow at the peaks.
const OUT = "cubic-bezier(.61,1,.88,1)";
const IN = "cubic-bezier(.12,0,.39,0)";
const osc = (name, prop, rest, hi, lo) =>
  `@keyframes ${name}{0%,50%,100%{${prop}:${rest};animation-timing-function:${OUT}}` +
  `25%{${prop}:${hi};animation-timing-function:${IN}}75%{${prop}:${lo};animation-timing-function:${IN}}}`;

export const STAGE_CSS = `
:host {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  container-type: size;
}
/* Letterboxed like the legacy SVG's default "xMidYMid meet". */
.stage {
  position: absolute;
  inset: 0;
  margin: auto;
  width: min(100cqw, 175cqh);
  height: min(100cqh, 57.143cqw);
  opacity: 0;
  transition: opacity 0.9s ease-out;
}
.stage.ready { opacity: 1; }
.m, .l {
  position: absolute;
  display: block;
  user-select: none;
  -webkit-user-drag: none;
}
.l { inset: 0; width: 100%; height: 100%; }
${osc("t-breathe", "transform", "scaleY(1)", "scaleY(calc(1 + var(--a)))", "scaleY(calc(1 - var(--a)))")}
${osc("t-sway", "transform", "rotate(0rad)", "rotate(calc(var(--a) * 1rad))", "rotate(calc(var(--a) * -1rad))")}
${osc("t-float", "transform", "translateY(0%)", "translateY(calc(var(--a) * 1%))", "translateY(calc(var(--a) * -1%))")}
${osc("t-drift", "transform", "translateX(0%)", "translateX(calc(var(--a) * 1%))", "translateX(calc(var(--a) * -1%))")}
${osc("t-pulse", "opacity", "calc((var(--lo) + var(--hi)) / 2)", "var(--hi)", "var(--lo)")}
@keyframes t-spin { from { transform: rotate(0turn); } to { transform: rotate(1turn); } }
@keyframes t-flicker {
  0%, 100% { opacity: var(--hi); }
  31% { opacity: calc((var(--lo) + var(--hi)) / 2); }
  33% { opacity: calc(var(--lo) * 0.4); }
  35%, 60% { opacity: var(--hi); }
  62% { opacity: var(--lo); }
  64% { opacity: calc(var(--hi) * 0.9); }
  82% { opacity: var(--lo); }
}
@media (prefers-reduced-motion: reduce) {
  .m, .l { animation: none !important; }
}
`;

/** CSS declarations for one svg-art `anim`, relative to an element covering `box`. */
function animCss(anim, box, opacity = 1) {
  if (!anim) return opacity !== 1 ? `opacity:${f(opacity)};` : "";
  const [bx, by, bw, bh] = box;
  const [px, py] = anim.pivot || [bx + bw / 2, by + bh / 2];
  const speed = anim.speed ?? 1;
  const dur = f(TAU / Math.abs(speed || 1));
  const delay = anim.phase ? `animation-delay:${f(-anim.phase)}s;` : "";
  const origin = `transform-origin:${pct(px - bx, bw)} ${pct(py - by, bh)};`;
  const run = (name, timing = "") => `animation:${name} ${dur}s ${timing} infinite;${delay}`;
  const still = opacity !== 1 ? `opacity:${f(opacity)};` : "";
  switch (anim.type) {
    case "breathe":
      return `--a:${f(anim.amp ?? 0.01)};${origin}${run("t-breathe")}${still}`;
    case "sway":
      return `--a:${f(anim.amp ?? 0.03)};${origin}${run("t-sway")}${still}`;
    case "spin":
      return `${origin}${run("t-spin", "linear")}${speed < 0 ? "animation-direction:reverse;" : ""}${still}`;
    case "float":
      return `--a:${f(((anim.amp ?? 2) / bh) * 100)};${run("t-float")}${still}`;
    case "drift":
      return `--a:${f(((anim.amp ?? 4) / bw) * 100)};${run("t-drift")}${still}`;
    case "pulse":
      return `--lo:${f((anim.min ?? 0.5) * opacity)};--hi:${f((anim.max ?? 1) * opacity)};${run("t-pulse")}`;
    case "flicker":
      return `--lo:${f((anim.min ?? 0.6) * opacity)};--hi:${f((anim.max ?? 1) * opacity)};${run("t-flicker", "linear")}`;
    default:
      return still;
  }
}

const BLEND = {
  lighter: "mix-blend-mode:screen;mix-blend-mode:plus-lighter;",
  screen: "mix-blend-mode:screen;",
  multiply: "mix-blend-mode:multiply;",
};

// Data URLs (the CSP allows data: images, not blob:) are cached so a style
// toggle never re-serialises a layer.
const urlCache = new Map();

function layerUrl(key, box, defs, markup) {
  let url = urlCache.get(key);
  if (url) return url;
  const [x, y, w, h] = box;
  const doc =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none">` +
    (defs ? `<defs>${defs}</defs>` : "") +
    markup +
    `</svg>`;
  url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(doc)}`;
  urlCache.set(key, url);
  return url;
}

/** Fold runs of still, unblended layers into one bitmap (skipping ones that declare ids). */
function mergeStill(layers) {
  const out = [];
  for (const layer of layers) {
    const prev = out[out.length - 1];
    const still = (l) => !l.anim && !l.blend && (l.opacity ?? 1) === 1;
    if (prev && still(prev) && still(layer) && !layer.markup.includes(' id="')) {
      out[out.length - 1] = { markup: prev.markup + layer.markup };
    } else {
      out.push(layer);
    }
  }
  return out;
}

/**
 * HTML for one model placed on the stage: art origin at stage (x, y), `scale`
 * stage units per art unit.
 */
export function modelHtml(key, model, { x = 0, y = 0, scale = 1 } = {}) {
  const box = model.box;
  const [bx, by, bw, bh] = box;
  const rect =
    `left:${pct(x + bx * scale, STAGE_W)};top:${pct(y + by * scale, STAGE_H)};` +
    `width:${pct(bw * scale, STAGE_W)};height:${pct(bh * scale, STAGE_H)};`;
  const imgs = mergeStill(model.layers)
    .map((layer, i) => {
      const src = layerUrl(`${key}:${i}`, box, model.defs || "", layer.markup);
      const style = animCss(layer.anim, box, layer.opacity ?? 1) + (BLEND[layer.blend] || "");
      return `<img class="l" alt="" draggable="false" decoding="async" src="${src}" style="${style}">`;
    })
    .join("");
  return `<div class="m" style="${rect}${animCss(model.anim, box)}">${imgs}</div>`;
}

/**
 * Shared Legacy/Modern switching for a title component. `legacy` is the
 * component's original template; `buildModern` resolves to the stage HTML.
 */
export function attachArtSwitch(host, legacy, buildModern) {
  let token = 0;
  let modernTemplate = null;

  const showLegacy = () => {
    host.shadowRoot.replaceChildren(legacy.content.cloneNode(true));
  };

  const showModern = async () => {
    const mine = ++token;
    if (!modernTemplate) {
      const html = await buildModern();
      modernTemplate = document.createElement("template");
      modernTemplate.innerHTML = `<style>${STAGE_CSS}</style><div class="stage">${html}</div>`;
    }
    if (mine !== token) return;
    host.shadowRoot.replaceChildren(modernTemplate.content.cloneNode(true));
    const stage = host.shadowRoot.querySelector(".stage");
    // Fade in once every layer has decoded so the art never assembles piecemeal.
    const imgs = [...stage.querySelectorAll("img")];
    await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
    if (mine === token) stage.classList.add("ready");
  };

  const apply = (modern) => {
    if (modern) {
      showModern();
    } else {
      token++;
      showLegacy();
    }
  };

  apply(isModernArt());
  return onArtStyleChange((style) => apply(style === 1));
}
