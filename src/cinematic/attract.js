/**
 * The title's attract loop: leave the title alone for ATTRACT_IDLE_MS and the
 * sizzle reel plays; any input returns to the title (the director's skip).
 *
 * The idle count only runs on the plain title: nothing else on screen (the
 * analytics consent card, an unlock toast, the settings deck still loading, a
 * fade), the tab visible. Anything else holding the screen restarts it, as
 * does any input and the end of a reel. main.js ticks it every frame and
 * pokes it on input.
 */
import { GameState } from "../types.js";
import { playReel } from "./director.js";
import { SIZZLE } from "./reels/sizzle.js";

export const ATTRACT_IDLE_MS = 25000;
/** The attract loop renders at most this often (Battery Saver's rate). */
export const ATTRACT_FPS = 30;

/**
 * Why the title is not free for an attract loop, or null when it is.
 * `deckLoading()` reports the settings deck's chunk still loading.
 */
export function titleBusy(game, doc = globalThis.document, { deckLoading = () => false } = {}) {
  if (game.state !== GameState.TITLE) return "state";
  if (!doc) return "no-document";
  if (doc.visibilityState !== "visible") return "hidden";
  if (doc.getElementById("titleScreen")?.classList.contains("hidden")) return "title-hidden";
  const consent = doc.getElementById("cc-analytics-modal");
  if (consent?.isConnected && consent.style.display !== "none") return "consent";
  const toast = doc.querySelector("unlock-toast");
  if (toast && (toast.busy || toast._shown || toast.queue?.length)) return "toast";
  if (deckLoading()) return "preloading";
  if (game.transitioning) return "transition";
  return null;
}

/** The frame cap while a reel attracts on the title; any other reel keeps the player's. */
export function attractFrameCap(game, cap) {
  if (game._cinematic?.returnTo !== "title") return cap;
  return cap > 0 && cap < ATTRACT_FPS ? cap : ATTRACT_FPS;
}

/**
 * The idle timer. `busy()` → a reason or null (titleBusy), `start()` plays
 * the loop. A pad in use shows up as `game.lastPadInputAt` (the same clock
 * as `now`).
 */
export function createAttract(game, { now = () => performance.now(), busy, start }) {
  let last = now();
  return {
    poke() {
      last = now();
    },
    tick() {
      const t = now();
      if ((game.lastPadInputAt ?? -Infinity) > last) last = game.lastPadInputAt;
      if (game._cinematic || busy()) {
        last = t;
        return;
      }
      if (t - last >= ATTRACT_IDLE_MS) {
        last = t;
        start();
      }
    },
  };
}

/**
 * Play the sizzle reel over the title. Before any gesture there is no running
 * audio context (browsers refuse one), so it plays muted, captions only.
 */
export function startAttract(game) {
  const ctx = game.audio?.ctx;
  return playReel(game, SIZZLE, { returnTo: "title", muted: !ctx || ctx.state !== "running" });
}
