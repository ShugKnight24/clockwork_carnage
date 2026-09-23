/**
 * Chronos sounds: the shard's powers, the Hound's tick, a hunter rift and the
 * set pieces. Built from the AudioManager's tone and noise primitives like the
 * block and vessel sounds, so the audio core is untouched. Each sound is a
 * short list of steps, `[delay s, "tone"|"noise", ...args]`, which keeps the
 * shapes readable and testable without an AudioContext.
 */

/** Tone: [delay, "tone", freq, dur, wave, gain]. Noise: [delay, "noise", dur, gain, filterHz, filterType]. */
export const CHRONO_SOUNDS = {
  // The governed shift: a soft falling chime.
  shift: [[0, "tone", 660, 0.25, "sine", 0.12], [0.05, "tone", 440, 0.35, "sine", 0.1]],
  // The loud one, from Act II: the same chime over a low bell he can hear.
  shiftLoud: [[0, "tone", 660, 0.25, "sine", 0.12], [0.05, "tone", 440, 0.35, "sine", 0.1], [0, "tone", 82, 0.9, "triangle", 0.16]],
  dash: [[0, "noise", 0.12, 0.2, 2400, "bandpass"], [0, "tone", 1200, 0.12, "sawtooth", 0.08], [0.06, "tone", 300, 0.1, "sine", 0.1]],
  // A tape pulled backwards: rising sweep in steps.
  rewind: [[0, "tone", 220, 0.08, "sawtooth", 0.1], [0.06, "tone", 330, 0.08, "sawtooth", 0.1], [0.12, "tone", 495, 0.08, "sawtooth", 0.1], [0.18, "tone", 742, 0.2, "sine", 0.12], [0, "noise", 0.3, 0.08, 5000, "highpass"]],
  // A pane of glass setting hard.
  lock: [[0, "tone", 1760, 0.4, "triangle", 0.1], [0, "tone", 1318, 0.5, "sine", 0.1], [0, "noise", 0.08, 0.15, 6000, "highpass"]],
  catch: [[0, "tone", 2400, 0.06, "sine", 0.06]],
  whisper: [[0, "noise", 0.9, 0.06, 400, "lowpass"], [0, "tone", 55, 0.9, "sine", 0.1]],
  rift: [[0, "tone", 70, 0.8, "sawtooth", 0.14], [0.1, "noise", 0.7, 0.18, 900, "lowpass"], [0.25, "tone", 104, 0.6, "square", 0.06]],
  // The Hound: a dry clock tick with a metallic ring under it.
  tick: [[0, "noise", 0.03, 0.22, 3200, "bandpass"], [0, "tone", 2100, 0.05, "square", 0.05]],
  vent: [[0, "noise", 0.4, 0.12, 1200, "lowpass"]],
  collapse: [[0, "noise", 0.5, 0.25, 300, "lowpass"], [0, "tone", 48, 0.5, "sine", 0.18]],
  blade: [[0, "noise", 0.06, 0.12, 1800, "bandpass"]],
  seal: [[0, "tone", 196, 0.3, "triangle", 0.12], [0.12, "tone", 294, 0.4, "triangle", 0.12]],
  loop: [[0, "tone", 440, 0.2, "sine", 0.1], [0.08, "tone", 220, 0.3, "sine", 0.1]],
  // Form 2 takes your shift: the shift chime run backwards and dragged down.
  counterShift: [[0, "tone", 440, 0.15, "sine", 0.12], [0.08, "tone", 660, 0.2, "sine", 0.1], [0.1, "tone", 55, 0.8, "sawtooth", 0.14], [0, "noise", 0.5, 0.12, 500, "lowpass"]],
  // A replayed volley: a tape spooling back, then the same rounds again.
  replay: [[0, "tone", 330, 0.1, "square", 0.06], [0.08, "tone", 262, 0.1, "square", 0.06], [0.16, "tone", 196, 0.3, "triangle", 0.1], [0, "noise", 0.35, 0.08, 3000, "bandpass"]],
};

/** Beyond this many tiles a positional sound is not played. */
const HEARING = 22;

/**
 * Play a chrono sound. `at` (with `player`) pans and fades it by distance.
 * Safe with no audio (tests, a muted or not-yet-unlocked context).
 * @param {object|null} audio - AudioManager
 * @param {keyof typeof CHRONO_SOUNDS} kind
 * @param {{ x?: number, y?: number, player?: {x:number, y:number, angle:number} }} [at]
 */
export function playChronoSound(audio, kind, at = null) {
  const steps = CHRONO_SOUNDS[kind];
  if (!steps || !audio?.playTone || !audio?.playNoise) return;
  let pan = 0;
  let gainMul = 1;
  if (at?.player && at.x != null) {
    const d = Math.hypot(at.x - at.player.x, at.y - at.player.y);
    if (d > HEARING) return;
    gainMul = Math.max(0.15, 1 - d / HEARING);
    pan = audio.calculatePan?.(at.x, at.y, at.player.x, at.player.y, at.player.angle) ?? 0;
  }
  for (const [delay, type, ...args] of steps) {
    const fire =
      type === "tone"
        ? () => audio.playTone(args[0], args[1], args[2], args[3] * gainMul, 0, pan)
        : () => audio.playNoise(args[0], args[1] * gainMul, args[2], args[3], pan);
    if (delay > 0) setTimeout(fire, delay * 1000);
    else fire();
  }
}
