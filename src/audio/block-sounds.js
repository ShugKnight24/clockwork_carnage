/**
 * Forge block sounds: what a block is made of decides how it sounds when you
 * place it, chip at it and break it. Built from the AudioManager's tone and
 * noise primitives, with a little random pitch so repeated hits do not machine-
 * gun the same sample.
 */

/** Block id → material. Ids follow src/world/blocks.js. */
const MATERIAL = {
  1: "stone", 2: "metal", 3: "metal", 4: "energy", 5: "wood", 6: "stone", 7: "stone",
  8: "glass", 9: "energy", 10: "soft", 11: "soft", 12: "sand", 13: "stone", 14: "stone",
  15: "stone", 16: "wood", 17: "metal", 18: "stone",
};

export const materialOf = (blockId) => MATERIAL[blockId] || "stone";

/**
 * Each recipe is [noise dur, noise gain, noise Hz, filter, tones[]] where a
 * tone is [Hz, dur, wave, gain]. "hit" is the quiet chip while mining.
 */
const SOUNDS = {
  stone: {
    place: [0.09, 0.35, 900, "bandpass", [[140, 0.08, "triangle", 0.25]]],
    hit: [0.05, 0.22, 1800, "bandpass", []],
    break: [0.22, 0.45, 1100, "bandpass", [[110, 0.12, "triangle", 0.2]]],
  },
  soft: {
    place: [0.1, 0.3, 450, "lowpass", [[90, 0.08, "sine", 0.3]]],
    hit: [0.06, 0.2, 600, "lowpass", []],
    break: [0.2, 0.35, 500, "lowpass", [[80, 0.1, "sine", 0.25]]],
  },
  sand: {
    place: [0.14, 0.28, 2400, "highpass", []],
    hit: [0.08, 0.16, 2600, "highpass", []],
    break: [0.26, 0.3, 2200, "highpass", []],
  },
  wood: {
    place: [0.05, 0.2, 700, "bandpass", [[220, 0.1, "triangle", 0.3], [330, 0.06, "sine", 0.12]]],
    hit: [0.04, 0.16, 900, "bandpass", [[250, 0.05, "triangle", 0.15]]],
    break: [0.18, 0.3, 800, "bandpass", [[180, 0.14, "triangle", 0.25]]],
  },
  metal: {
    // Inharmonic partials read as struck metal rather than a note.
    place: [0.04, 0.2, 3000, "bandpass", [[520, 0.35, "sine", 0.12], [1370, 0.25, "sine", 0.07], [2210, 0.18, "sine", 0.04]]],
    hit: [0.03, 0.15, 3500, "bandpass", [[780, 0.15, "sine", 0.06], [1950, 0.1, "sine", 0.03]]],
    break: [0.16, 0.3, 2500, "bandpass", [[440, 0.4, "sine", 0.12], [1180, 0.3, "sine", 0.06]]],
  },
  glass: {
    place: [0.03, 0.12, 5000, "highpass", [[1760, 0.2, "sine", 0.1], [2640, 0.15, "sine", 0.05]]],
    hit: [0.03, 0.1, 6000, "highpass", [[2200, 0.08, "sine", 0.05]]],
    break: [0.3, 0.4, 5500, "highpass", [[1980, 0.25, "sine", 0.08], [3100, 0.2, "sine", 0.05], [2640, 0.3, "sine", 0.05]]],
  },
  energy: {
    place: [0.05, 0.1, 4000, "bandpass", [[660, 0.15, "square", 0.06], [990, 0.12, "sine", 0.08]]],
    hit: [0.03, 0.08, 4000, "bandpass", [[880, 0.06, "square", 0.04]]],
    break: [0.2, 0.2, 3000, "bandpass", [[990, 0.25, "sawtooth", 0.06], [495, 0.3, "sine", 0.08]]],
  },
};

/** Play a block sound through `audio` (an AudioManager). */
export function playBlockSound(audio, blockId, action) {
  if (!audio?.ctx) return;
  const recipe = SOUNDS[materialOf(blockId)]?.[action];
  if (!recipe) return;
  const [nd, ng, nf, type, tones] = recipe;
  const vary = 0.92 + Math.random() * 0.16;
  audio.playNoise(nd, ng, nf * vary, type);
  for (const [f, d, wave, g] of tones) audio.playTone(f * vary, d, wave, g);
}
