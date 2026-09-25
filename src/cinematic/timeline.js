/**
 * Reels are written in beats so cuts land on the music; everything here is
 * pure so the director, the recorder and the tests read the same timeline.
 *
 * Time conventions:
 * - Shots, captions and narration are half-open windows [at, at + len), so a
 *   time exactly on a cut belongs to the incoming shot.
 * - `stateAt` clamps t < 0 to 0: before the start reads as the first shot at
 *   local 0 (the director's clock starts at -1e-6 and may render that frame).
 *   t >= reelDuration has no shot (shot null, shotIndex -1).
 * - `eventsBetween` does NOT clamp: its window is (t0, t1], so starting the
 *   clock just below 0 fires beat-0 events, and an event on the reel's very
 *   last beat fires on the update that reaches the end.
 */

const beatsPerBar = (reel) => reel.beatsPerBar ?? 4;
export const beatsToSec = (reel, beats) => (beats * 60) / reel.bpm;
export const secToBeats = (reel, sec) => (sec * reel.bpm) / 60;
export const reelDuration = (reel) => beatsToSec(reel, reel.bars * beatsPerBar(reel));

// Seconds → beats can land a hair off an authored beat (at 130 bpm,
// beatsToSec(8) comes back as 7.999…); snap to a fine beat grid so a cut
// time computed from beats selects the incoming shot.
const GRID = 960;
function toBeats(reel, t) {
  const b = secToBeats(reel, t);
  const q = Math.round(b * GRID) / GRID;
  return Math.abs(b - q) < 1e-9 ? q : b;
}

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// The last beat of a shot carries its transition out.
const TRANSITION_BEATS = 1;

export function stateAt(reel, t) {
  const b = toBeats(reel, Math.max(0, t));
  const i = reel.shots.findIndex((s) => b >= s.at && b < s.at + s.len);
  const shot = i >= 0 ? reel.shots[i] : null;
  const within = (x) => b >= x.at && b < x.at + x.len;
  const total = reel.bars * beatsPerBar(reel);
  const lb = reel.letterbox ?? { in: 0, out: 0 };
  const letterbox = Math.min(lb.in ? smooth(b / lb.in) : 1, lb.out ? smooth((total - b) / lb.out) : 1);
  let transition = null;
  if (shot?.transitionOut && shot.transitionOut !== "cut") {
    // A shot shorter than a beat spends its whole length transitioning.
    const span = Math.min(TRANSITION_BEATS, shot.len);
    const into = b - (shot.at + shot.len - span);
    if (into >= 0) transition = { kind: shot.transitionOut, progress: into / span };
  }
  return {
    shot,
    shotIndex: i,
    local: shot ? beatsToSec(reel, b - shot.at) : 0,
    shotLen: shot ? beatsToSec(reel, shot.len) : 0,
    captions: reel.captions.filter(within),
    narration: reel.narration.find(within) ?? null,
    letterbox,
    transition,
  };
}

export function eventsBetween(reel, t0, t1) {
  if (!(t1 > t0)) return [];
  // Both ends go through the same snap, so back-to-back windows share an edge
  // and an event on it fires exactly once.
  const b0 = toBeats(reel, t0), b1 = toBeats(reel, t1);
  const out = [];
  for (const shot of reel.shots) {
    for (const ev of shot.events ?? []) {
      const at = shot.at + ev.at;
      if (at > b0 && at <= b1) out.push({ shotId: shot.id, ev, at });
    }
  }
  // Events at beat 0 of the reel fire on the first update from t0 = -epsilon.
  return out.sort((a, b) => a.at - b.at).map(({ shotId, ev }) => ({ shotId, ev }));
}

export function capFlashes(times, maxPerSec = 3) {
  const gap = 1 / maxPerSec;
  const kept = [];
  for (const t of [...times].sort((a, b) => a - b)) if (!kept.length || t - kept.at(-1) >= gap - 1e-9) kept.push(t);
  return kept;
}

export function validateReel(reel) {
  const errs = [];
  const total = reel.bars * beatsPerBar(reel);
  let at = 0;
  for (const s of reel.shots) {
    if (Math.abs(s.at - at) > 1e-9) errs.push(`shot ${s.id} starts at ${s.at}: gap or overlap (shots must be contiguous from ${at})`);
    if (!(s.len > 0)) errs.push(`shot ${s.id} has no length`);
    if (!s.scene?.kind) errs.push(`shot ${s.id} has no scene kind`);
    for (const ev of s.events ?? []) if (ev.at < 0 || ev.at > s.len) errs.push(`shot ${s.id} event ${ev.type} outside the shot`);
    at = s.at + s.len;
  }
  if (Math.abs(at - total) > 1e-9) errs.push(`shots end at ${at}, reel is ${total} beats`);
  for (const c of reel.captions) if (c.at < 0 || c.at + c.len > total) errs.push(`caption "${c.text}" outside the reel`);
  for (const n of reel.narration) if (n.at < 0 || n.at + n.len > total) errs.push(`narration "${n.text}" outside the reel`);
  return errs;
}
