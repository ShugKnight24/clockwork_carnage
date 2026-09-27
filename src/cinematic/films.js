/**
 * The two films, where the game plays them: the Archive's FILMS tab replays
 * either, and a first new campaign opens on the lore video before the
 * flipbook. Importing this module registers the lore video's own scenes with
 * the director.
 */
import { playReel, registerScene } from "./director.js";
import { reelDuration } from "./timeline.js";
import { SIZZLE } from "./reels/sizzle.js";
import { CAMPAIGN_LORE } from "./reels/campaign-lore.js";
import { LORE_SCENES } from "./scenes/lore.js";

for (const [kind, adapter] of Object.entries(LORE_SCENES)) registerScene(kind, adapter);

/** Written when the lore video ends or is skipped: later campaigns go straight to the flipbook. */
export const LORE_SEEN_KEY = "cc_seen_lore_video";

const runtime = (reel) => `${Math.round(reelDuration(reel))} s`;

export const FILMS = [
  {
    id: "sizzle",
    title: "Trailer",
    sub: `${runtime(SIZZLE)} · Sizzle reel`,
    desc: "Four acts, Chronos powers, the squad, Meltdown, the Forge and the agent creator, cut to the music.",
    reel: SIZZLE,
  },
  {
    id: "lore",
    title: "Chrono-Corp: Origins",
    sub: `${runtime(CAMPAIGN_LORE)} · Narrated by ARIA`,
    desc: "The door Chrono-Corp built through time, what came through it, and the last agent still standing. It opens a first new campaign.",
    reel: CAMPAIGN_LORE,
  },
];

export const filmById = (id) => FILMS.find((f) => f.id === id) ?? null;

/** Replay a film from the Archive; any press skips it back to the FILMS tab. */
export function playFilm(game, id, { returnTo = "archive" } = {}) {
  const film = filmById(id);
  return film ? playReel(game, film.reel, { returnTo }) : Promise.resolve();
}

/**
 * The campaign hand-off: play the lore video if this browser has not seen
 * it, then `next` (the flipbook) once it ends or is skipped; otherwise
 * `next` at once. A reel that fails to start is marked seen and skipped, so
 * a campaign can always begin.
 */
export function playLoreThen(game, next, { play = playReel, storage = globalThis.localStorage } = {}) {
  let seen = false;
  try {
    seen = !!storage?.getItem(LORE_SEEN_KEY);
  } catch (_) {}
  if (seen) {
    next();
    return;
  }
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    try {
      storage?.setItem(LORE_SEEN_KEY, "1");
    } catch (_) {}
    next();
  };
  // A failure before or after the reel starts must still reach the flipbook:
  // a stranded player on a black screen is worse than a missing intro.
  const fail = (err) => {
    console.warn("[cinematic] the lore video could not play", err);
    finish();
  };
  try {
    Promise.resolve(play(game, CAMPAIGN_LORE, { returnTo: "campaign", onEnd: finish })).catch(fail);
  } catch (err) {
    fail(err);
  }
}
