/**
 * `art` shots: a cutscene backdrop (`bg`) and optionally a character or
 * set-piece (`art`), painted straight onto the game canvas, with an optional
 * slow pan: `pan: { from: [x, y, zoom], to: [x, y, zoom] }`, x/y as fractions
 * of the picture, eased across the shot. `artAt: [x, y, scale]` places the
 * art alone (x/y fractions of the picture, scale about its centre), for a
 * figure drawn larger than a letterboxed frame; it can be keyed by art
 * profile, `{ legacy: [...], default: [...] }`, since Legacy's pixel figures
 * stand smaller and lower in their picture. `silhouette: true` paints the art as
 * a black shape with a red rim (late-game bosses are never shown in full).
 * Borrows no game fields.
 *
 * The cutscene chunk is loaded on demand (it is large and most sessions never
 * play a reel); the build also waits, a few frames at most, for the Modern
 * backdrop bitmaps so the shot does not open on the procedural fallback.
 */

import { isModernArt } from "../../rendering/art-style.js";

const WARM_FRAMES = 30;

let cs = null; // the cutscene drawing functions, once their chunk has loaded

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;

export const art = {
  async build(game, spec, rng, { live = () => true } = {}) {
    if (!cs) {
      const [cut, artMod, svg] = await Promise.all([
        import("../../../js/cutscene.js"),
        import("../../rendering/cutscene-art.js"),
        import("../../rendering/svg-art/index.js"),
      ]);
      cs = { drawCutsceneBg: cut.drawCutsceneBg, drawCutsceneArt: artMod.drawCutsceneArt, drawSvgBg: svg.drawSvgBg, hasSvgBg: svg.hasSvgBg, warmSvgArt: svg.warmSvgArt };
    }
    const ctx = game.renderer?.ctx;
    // Legacy draws every backdrop procedurally: nothing to decode.
    if (!ctx || !live() || !isModernArt() || !cs.hasSvgBg(spec.bg)) return;
    const w = game.renderer.width;
    const h = game.renderer.height;
    cs.warmSvgArt(spec.art ? [spec.art] : [], [spec.bg], ctx, w, h);
    // drawSvgBg reports whether its bitmaps are ready. It paints the game
    // canvas while it checks, which is harmless: the next frame repaints it
    // before anything is shown.
    for (let i = 0; i < WARM_FRAMES && live() && !cs.drawSvgBg(ctx, w, h, spec.bg, 0); i++) await nextFrame();
  },
  update() {},
  event() {},
  teardown() {},
  draw(ctx, w, h, local, { game, shotLen, handle }) {
    if (!cs) return;
    const spec = handle.shot.scene;
    ctx.save();
    const pan = spec.pan;
    if (pan?.from && pan?.to) {
      const k = smooth(shotLen > 0 ? local / shotLen : 0);
      const x = lerp(pan.from[0], pan.to[0], k);
      const y = lerp(pan.from[1], pan.to[1], k);
      const z = lerp(pan.from[2] ?? 1, pan.to[2] ?? 1, k);
      ctx.translate(w / 2, h / 2);
      ctx.scale(z, z);
      ctx.translate(-w / 2 - x * w, -h / 2 - y * h);
    }
    cs.drawCutsceneBg(ctx, w, h, spec.bg, local);
    if (spec.art) {
      const at = artPlacement(spec.artAt);
      if (at) {
        ctx.translate(w / 2 + (at[0] ?? 0) * w, h / 2 + (at[1] ?? 0) * h);
        ctx.scale(at[2] ?? 1, at[2] ?? 1);
        ctx.translate(-w / 2, -h / 2);
      }
      if (spec.silhouette) drawSilhouette(ctx, w, h, spec.art, local, !!game.isTouchDevice);
      else cs.drawCutsceneArt(ctx, w, h, spec.art, local, !!game.isTouchDevice);
    }
    ctx.restore();
  },
};

/** `artAt` for the current art profile: an array, or one keyed by profile with a default. */
function artPlacement(at) {
  if (!at || Array.isArray(at)) return at ?? null;
  const profile = typeof document !== "undefined" ? document.documentElement.dataset.artProfile : null;
  return at[profile] ?? at.default ?? null;
}

let layer = null; // one offscreen canvas, reused by every silhouette frame

/**
 * The art drawn into a layer, then recoloured in place (source-in keeps its
 * alpha): first red, stamped a few pixels off each side as the rim, then
 * near-black for the body on top.
 */
function drawSilhouette(ctx, w, h, art, t, touch) {
  if (typeof document === "undefined") return;
  layer ??= document.createElement("canvas");
  if (layer.width !== w || layer.height !== h) {
    layer.width = w;
    layer.height = h;
  }
  const g = layer.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, w, h);
  cs.drawCutsceneArt(g, w, h, art, t, touch);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#ff2a3c";
  g.fillRect(0, 0, w, h);
  const r = Math.max(2, Math.round(h * 0.004));
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * 0.6;
  ctx.drawImage(layer, -r, 0);
  ctx.drawImage(layer, r, 0);
  ctx.drawImage(layer, 0, -r);
  ctx.globalAlpha = prevA;
  g.fillStyle = "#06040a";
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "source-over";
  ctx.drawImage(layer, 0, 0);
}
