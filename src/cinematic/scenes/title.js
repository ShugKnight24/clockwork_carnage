/**
 * `title` shots: the logotype in the active art style's finish (Legacy's
 * neon, Comic's ink, Modern's steel: brand.js) over a cutscene backdrop,
 * with the end card's lines under it. Used for the logo slam (no lines) and
 * the end card. The backdrop is the `art` scene's (bg, pan); the logo and
 * the lines are drawn on the HUD canvas at full resolution, under the
 * letterbox. Borrows no game fields.
 *
 * spec: { bg = "deep_space", pan, lines = END_CARD (strings; [] for none) }
 */
import { art } from "./art.js";
import { logoFor, warmLogos } from "../brand.js";
import { drawEndCard } from "../overlay.js";

export const END_CARD = ["Play free in your browser", "shugknight24.github.io/clockwork_carnage", "Keyboard · Mouse · Controller"];

const withBg = (spec) => (spec.bg ? spec : { ...spec, bg: "deep_space" });

/** The backdrop's bitmaps (the art scene's warm-up) and the logotypes. */
function warm(game, spec, live) {
  const profile = typeof document !== "undefined" ? document.documentElement.dataset.artProfile : "modern";
  return Promise.all([art.build(game, withBg(spec), null, { live }), warmLogos(profile)]);
}

export const title = {
  /** The backdrop's bitmaps and the logotypes, decoded ahead of the cut. */
  prepare(game, spec, { live = () => true } = {}) {
    const prep = { ready: false, done: null };
    prep.done = warm(game, spec, live).then(() => (prep.ready = true));
    return prep;
  },

  build(game, spec, rng, { live = () => true, reel, shot, handle, prepared = null }) {
    // Line objects for the overlay's sprite cache, one set per shot.
    handle.lines = (spec.lines ?? END_CARD).map((text) => ({ text }));
    handle.bpm = reel?.bpm;
    // What the art scene draws from: this shot, with the backdrop default.
    handle.art = { shot: { ...shot, scene: withBg(spec) } };
    if (prepared?.ready) return;
    return prepared ? prepared.done : warm(game, spec, live);
  },
  update() {},
  event() {},
  teardown() {},
  draw(gctx, w, h, local, { game, shotLen, handle }) {
    if (handle.art) art.draw(gctx, w, h, local, { game, shotLen, handle: handle.art });
  },
  hud(ctx, w, h, local, { handle, profile, dpr, letterbox, fontScale, reducedMotion }) {
    drawEndCard(ctx, w, h, { lines: handle.lines, t: local }, {
      profile,
      dpr,
      letterbox,
      fontScale,
      reducedMotion,
      bpm: handle.bpm,
      logo: logoFor(profile),
    });
  },
};
