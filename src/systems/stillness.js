/**
 * The people the 06:47 pulse caught: alive, stopped, not dead. Everyone
 * without a temporal anchor is held at that instant, so what reads them is
 * one set of rules here, kept pure so the renderer, the audio mix, the
 * player's movement and the tests all agree on who is stopped and how near.
 *
 *   isFrozen       a station person (js/npc.js) held in the instant
 *   holdOffFrozen  the player cannot walk into one: they do not give way
 *   stillnessAt    0..1, how close the nearest stopped person is (the mix
 *                  muffles and a hum comes up as it rises)
 *   echoAt         the one-second echo: a ghost of them takes their last
 *                  step forward and snaps back
 *
 * A prop can be stopped as well (FROZEN_PROP_TYPES, drawn in
 * src/rendering/props.js: a coffee pour, a falling sheet of paper), and
 * `frozen: true` on any other prop counts it too, so a room of stopped
 * things is quiet even with nobody in it.
 */
import { clamp } from "../utils/math.js";

/** Prop kinds caught mid-motion by the pulse. */
export const FROZEN_PROP_TYPES = new Set(["frozen_pour", "frozen_paper"]);

/** Seconds after the pose is set before the stopped look takes over (the sprite eases the body in first). */
export const FROZEN_SETTLE_S = 0.2;

/** How close the player can come to a stopped person, centre to centre. */
export const FROZEN_BODY = 0.45;

/** Inside this many tiles of a stopped person the hush is full. */
export const HUSH_NEAR = 0.9;
/** Beyond this many tiles there is no hush at all. */
export const HUSH_FAR = 2.6;

/** The echo's cycle, seconds: one step out and the snap back. */
export const ECHO_PERIOD_S = 1;
/** How far the echo's step carries it, in tiles. */
export const ECHO_STEP = 0.32;
/** Share of the cycle spent stepping; the rest it hangs there, fading, then snaps back. */
const ECHO_OUT = 0.62;

/** A station person held in the instant (the pose set and settled). */
export function isFrozen(e) {
  if (!e || e.type !== "npc" || e.active === false) return false;
  if (e.frozen) return true;
  return e.gesture === "frozen" && !e.walking && (e.gestureT ?? FROZEN_SETTLE_S) >= FROZEN_SETTLE_S;
}

/** Anything that stops the sound around it: a frozen person, or a prop marked frozen. */
function stills(e) {
  if (!e || e.active === false) return false;
  if (e.type === "npc") return e.frozen || e.gesture === "frozen";
  // Only props besides people: a round held in a Time-Lock is `frozen` too.
  return e.type === "prop" && (e.frozen === true || FROZEN_PROP_TYPES.has(e.propType));
}

/**
 * Keep the player out of every stopped person: moved from (fromX, fromY) to
 * where `p` now stands, a body that ends inside FROZEN_BODY of one is put
 * back on that circle's edge, sliding round it rather than stopping dead.
 * The person never moves. Returns true when it held the player off.
 */
export function holdOffFrozen(entities, p, fromX = p.x, fromY = p.y) {
  if (!entities?.length) return false;
  let held = false;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e.type !== "npc" || !isFrozen(e)) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= FROZEN_BODY * FROZEN_BODY) continue;
    const d = Math.sqrt(d2);
    if (d > 1e-6) {
      p.x = e.x + (dx / d) * FROZEN_BODY;
      p.y = e.y + (dy / d) * FROZEN_BODY;
    } else {
      // Dead centre (a teleport onto them): back where the step came from.
      p.x = fromX;
      p.y = fromY;
    }
    held = true;
  }
  return held;
}

/**
 * How stopped the air is where the player stands: 0 with no frozen person
 * within HUSH_FAR tiles, 1 within HUSH_NEAR, eased between. The nearest one
 * decides. No allocation: it runs every frame.
 */
export function stillnessAt(entities, x, y) {
  if (!entities?.length) return 0;
  let best = Infinity;
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!stills(e)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) best = d2;
  }
  if (best >= HUSH_FAR * HUSH_FAR) return 0;
  const t = clamp((HUSH_FAR - Math.sqrt(best)) / (HUSH_FAR - HUSH_NEAR), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * The hush's low-pass cutoff in Hz: wide open at 0, down to 900 Hz beside a
 * stopped person. Exponential, like the low-health muffle, so it closes in
 * evenly as you walk up.
 */
export function hushCutoff(k) {
  const s = clamp(k || 0, 0, 1);
  if (s <= 0) return 20000;
  return 20000 * Math.pow(900 / 20000, s);
}

/**
 * The echo at `time` (ms): `step` 0..1, how far along the last step the ghost
 * is, and `alpha` 0..1, how strongly it shows. It eases out over the first
 * part of the cycle, hangs and fades, and is gone at the snap back. `seed`
 * keeps two people in a room from echoing in step.
 */
export function echoAt(time, seed = 0, out = { step: 0, alpha: 0 }) {
  const period = ECHO_PERIOD_S * 1000;
  const p = ((((time + seed * 337) % period) + period) % period) / period;
  const s = Math.min(1, p / ECHO_OUT);
  out.step = 1 - (1 - s) * (1 - s);
  // In over the first fifth, full through the step, out before the snap.
  out.alpha = Math.min(1, p / 0.2) * Math.min(1, (1 - p) / 0.3);
  return out;
}
