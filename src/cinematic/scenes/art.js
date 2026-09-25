/**
 * `art` shots: a cutscene backdrop (`bg`) and optionally a character or
 * set-piece (`art`), painted straight onto the game canvas, with an optional
 * slow pan: `pan: { from: [x, y, zoom], to: [x, y, zoom] }`, x/y as fractions
 * of the picture, eased across the shot. Borrows no game fields.
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
    if (spec.art) cs.drawCutsceneArt(ctx, w, h, spec.art, local, !!game.isTouchDevice);
    ctx.restore();
  },
};
