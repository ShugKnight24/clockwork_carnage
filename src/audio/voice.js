/**
 * Procedural "babble" voices: every speaking line in the game gets a voice
 * made of pitched vowel formants and consonant noise, paced to the text as it
 * types. No recorded audio — the words are not intelligible, but each speaker
 * has a recognisable pitch, timbre and rhythm, the way Animal Crossing or
 * Undertale characters do.
 *
 * What keeps it from sounding like a robot:
 *  - the source is a soft glottal pulse (harmonics rolling off by a per-voice
 *    tilt) with breath mixed in, not a raw square or sawtooth;
 *  - pitch follows the phrase (declination, stressed peaks, a final fall or a
 *    question's rise) and glides between syllables instead of jumping;
 *  - small jitter and vibrato keep a held vowel alive;
 *  - an emotion colours pitch, range, breath, brightness and cadence.
 *
 * Planning is pure (text + voice + emotion → timed syllable events) so it can
 * be unit tested without an AudioContext. `VoiceSynth` turns one plan into one
 * small node graph whose parameters are all scheduled up front.
 */

import { SeededRNG } from "../utils/seeded-rng.js";

// ── Voices ──────────────────────────────────────────────────────────────────

/**
 * pitch      base fundamental, Hz
 * range      pitch movement, semitones
 * formant    vowel formant multiplier (<1 larger/darker, >1 smaller/brighter)
 * tilt       harmonic roll-off of the glottal source (higher = softer, rounder)
 * breath     aspiration mixed into the vowels, 0..1 (airy, intimate)
 * consonant  level of consonant noise bursts
 * legato     voiced share of each syllable slot (lower = clipped, staccato)
 * accent     how far stressed syllables rise, semitones
 * vibrato    [rate Hz, depth semitones]
 * jitter     random pitch wobble inside a syllable, semitones
 * chorus     detune of a second source in cents (warmth, a faint sheen)
 * brightness final low-pass, Hz
 * emotion    default emotion when a line does not ask for one
 *
 * Deliberately synthetic voices (system readouts, drones) also use:
 * wave (a raw oscillator), scale (snap pitch to degrees), am / amDepth
 * (amplitude modulation), radio (telephone band), sub (octave-down), drive.
 */
export const VOICES = {
  // Soft, warm and close: breathy, rounded, gently moving, never clipped.
  aria:      { pitch: 212, range: 3.5, formant: 1.19, tilt: 1.75, breath: 0.34, consonant: 0.22, legato: 0.9,  accent: 2,   vibrato: [5.2, 0.14], jitter: 0.16, chorus: 5, brightness: 4200, emotion: "warm", gain: 0.98 },
  lyra:      { pitch: 196, range: 4,   formant: 1.15, tilt: 1.4,  breath: 0.28, consonant: 0.35, legato: 0.86, accent: 2.5, vibrato: [5.5, 0.12], jitter: 0.2,  brightness: 5000, gain: 0.91 },
  miri:      { pitch: 205, range: 3.5, formant: 1.17, tilt: 1.6,  breath: 0.34, consonant: 0.3,  legato: 0.88, accent: 2,   vibrato: [5, 0.12],   jitter: 0.18, brightness: 4500, emotion: "warm", gain: 1.09 },
  nova:      { pitch: 232, range: 5.5, formant: 1.2,  tilt: 1.1,  breath: 0.2,  consonant: 0.4,  legato: 0.74, accent: 3.5, vibrato: [0, 0],      jitter: 0.25, brightness: 6000, gain: 0.84 },
  kai:       { pitch: 128, range: 4,   formant: 1.0,  tilt: 1.1,  breath: 0.25, consonant: 0.45, legato: 0.78, accent: 2.5, vibrato: [0, 0],      jitter: 0.22, brightness: 5000, gain: 1.01 },
  kael:      { pitch: 90,  range: 2.2, formant: 0.88, tilt: 1.2,  breath: 0.25, consonant: 0.4,  legato: 0.84, accent: 1.5, vibrato: [0, 0],      jitter: 0.15, brightness: 3600, emotion: "calm", gain: 1.22 },
  rook:      { pitch: 98,  range: 2.5, formant: 0.9,  tilt: 0.9,  breath: 0.45, consonant: 0.55, legato: 0.72, accent: 2,   vibrato: [0, 0],      jitter: 0.3,  brightness: 3800, drive: 0.15, gain: 0.77 },
  voss:      { pitch: 106, range: 3,   formant: 0.93, tilt: 1.1,  breath: 0.3,  consonant: 0.4,  legato: 0.84, accent: 2,   vibrato: [5, 0.1],    jitter: 0.15, brightness: 4200, gain: 1.0 },
  lord:      { pitch: 74,  range: 2.5, formant: 0.8,  tilt: 0.8,  breath: 0.35, consonant: 0.45, legato: 0.9,  accent: 2,   vibrato: [4.5, 0.3],  jitter: 0.12, brightness: 3200, sub: true, drive: 0.45, emotion: "menacing", gain: 0.42 },
  supervisor:{ pitch: 114, range: 4.5, formant: 0.95, tilt: 1.0,  breath: 0.25, consonant: 0.45, legato: 0.74, accent: 3,   vibrato: [0, 0],      jitter: 0.25, brightness: 5000, radio: true, emotion: "urgent", gain: 1.42 },
  unknown:   { pitch: 118, range: 2,   formant: 0.95, tilt: 1.0,  breath: 0.5,  consonant: 0.45, legato: 0.84, accent: 1.5, vibrato: [0, 0],      jitter: 0.2,  brightness: 4000, radio: true, drive: 0.3, gain: 0.51 },
  system:    { pitch: 180, range: 0,   formant: 1.1,  tilt: 0.6,  breath: 0,    consonant: 0.2,  legato: 0.6,  accent: 0,   vibrato: [0, 0],      jitter: 0,    brightness: 5000, wave: "square", scale: [0], am: 60, amDepth: 0.4, emotion: "neutral", gain: 0.95 },
  henchman:  { pitch: 94,  range: 3,   formant: 0.88, tilt: 0.9,  breath: 0.4,  consonant: 0.55, legato: 0.76, accent: 3,   vibrato: [0, 0],      jitter: 0.3,  brightness: 4000, drive: 0.25, emotion: "angry", gain: 0.79 },
  drone:     { pitch: 420, range: 7,   formant: 1.35, tilt: 0.5,  breath: 0,    consonant: 0.1,  legato: 0.5,  accent: 2,   vibrato: [0, 0],      jitter: 0,    brightness: 7000, wave: "square", scale: [0, 3, 7], am: 70, amDepth: 0.4, emotion: "neutral", gain: 0.73 },
  beast:     { pitch: 70,  range: 4,   formant: 0.75, tilt: 0.7,  breath: 0.9,  consonant: 0.9,  legato: 0.92, accent: 3,   vibrato: [9, 0.8],    jitter: 0.5,  brightness: 3000, sub: true, drive: 0.6, emotion: "angry", gain: 0.36 },
  phantom:   { pitch: 290, range: 5,   formant: 1.25, tilt: 1.8,  breath: 0.9,  consonant: 1.0,  legato: 0.92, accent: 2,   vibrato: [3, 0.6],    jitter: 0.3,  brightness: 5000, am: 7, amDepth: 0.3, emotion: "sad", gain: 1.33 },
};

/**
 * The player's voice follows the character creator's VOICE_PROFILES
 * (rookie / veteran / calm / synthetic). Unknown ids fall back to calm.
 */
const PLAYER_VOICES = {
  rookie:    { pitch: 150, range: 5,   formant: 1.06, tilt: 1.2, breath: 0.3,  consonant: 0.4,  legato: 0.78, accent: 3,   vibrato: [0, 0],     jitter: 0.25, brightness: 5500, gain: 0.9 },
  veteran:   { pitch: 92,  range: 2,   formant: 0.9,  tilt: 0.9, breath: 0.5,  consonant: 0.5,  legato: 0.8,  accent: 1.5, vibrato: [0, 0],     jitter: 0.2,  brightness: 3600, drive: 0.15, emotion: "calm", gain: 0.65 },
  calm:      { pitch: 120, range: 3,   formant: 1.0,  tilt: 1.4, breath: 0.3,  consonant: 0.35, legato: 0.88, accent: 2,   vibrato: [4.5, 0.1], jitter: 0.15, brightness: 4500, emotion: "calm", gain: 1.2 },
  // Synthetic keeps a faint processed sheen, but speaks like a person.
  synthetic: { pitch: 160, range: 3.5, formant: 1.12, tilt: 0.9, breath: 0.12, consonant: 0.3,  legato: 0.8,  accent: 2,   vibrato: [0, 0],     jitter: 0.08, brightness: 6000, chorus: 12, am: 32, amDepth: 0.12, gain: 1.36 },
};

export function playerVoice(profile) {
  return PLAYER_VOICES[profile?.id] || PLAYER_VOICES.calm;
}

/** Speaker label (as printed in the game) → voice key. */
const SPEAKER_VOICES = {
  ARIA: "aria", SYSTEMS: "system", SISTEMA: "system", WARNING: "system", AVISO: "system", ERROR: "system",
  "FINAL TIMELINE": "system", UNKNOWN: "unknown", LYRA: "lyra", KAEL: "kael", NOVA: "nova", ROOK: "rook",
  VOSS: "voss", "DR. VOSS": "voss", "PARADOX LORD": "lord", LORD: "lord", MIRI: "miri", KAI: "kai",
  SUPERVISOR: "supervisor", SQUAD: "kael",
};

/** Cutscene art keys whose quoted lines belong to that character. */
const ART_VOICES = {
  aria: "aria", lyra: "lyra", villain: "lord", villain_form2: "lord", villain_final: "lord",
  portrait_voss: "voss", voss_recording: "voss", unknown_recording: "unknown",
  portrait_miri: "miri", portrait_kai: "kai", portrait_supervisor: "supervisor",
  hero: "player", hero_armed: "player", hero_human: "player", hero_fallen: "player", hero_at_desk: "player",
};

/**
 * Pick a voice key for a line. An explicit `voice` on the line or frame wins,
 * then a printed speaker label, then — for quoted lines only — the frame art.
 * Unattributed narration returns null and stays silent.
 */
export function voiceKeyFor({ speaker = null, quoted = false, lineVoice = null, frameVoice = null, art = null } = {}) {
  if (lineVoice) return lineVoice;
  if (speaker) return SPEAKER_VOICES[speaker.toUpperCase()] || (frameVoice ?? "unknown");
  if (!quoted) return null;
  return frameVoice || ART_VOICES[art] || null;
}

// ── Emotions ────────────────────────────────────────────────────────────────

/**
 * How an emotion bends a voice. Additive for pitch (semitones), breath, tilt
 * and legato; multiplicative for range, accent, jitter, vibrato depth and
 * gain. `fall` is where a statement's last syllable lands (negative falls,
 * positive lifts); `pause` stretches the breaths at commas and full stops.
 */
export const EMOTIONS = {
  neutral:  { pitch: 0,    range: 1,    breath: 0,     tilt: 0,     legato: 0,     accent: 1,   jitter: 1,   vibrato: 1,   gain: 1,    fall: -2,   pause: 1 },
  warm:     { pitch: -0.5, range: 0.85, breath: 0.1,   tilt: 0.25,  legato: 0.05,  accent: 0.8, jitter: 1,   vibrato: 1.2, gain: 0.95, fall: -1.5, pause: 1.2 },
  tender:   { pitch: -1,   range: 0.8,  breath: 0.2,   tilt: 0.4,   legato: 0.08,  accent: 0.7, jitter: 1,   vibrato: 1.3, gain: 0.88, fall: -1.5, pause: 1.4 },
  calm:     { pitch: -1,   range: 0.7,  breath: 0.08,  tilt: 0.2,   legato: 0.06,  accent: 0.7, jitter: 0.8, vibrato: 1,   gain: 0.95, fall: -2,   pause: 1.2 },
  happy:    { pitch: 2,    range: 1.35, breath: 0,     tilt: -0.1,  legato: 0,     accent: 1.4, jitter: 1,   vibrato: 1,   gain: 0.85, fall: -0.5, pause: 0.9 },
  excited:  { pitch: 3,    range: 1.5,  breath: 0,     tilt: -0.2,  legato: -0.05, accent: 1.6, jitter: 1.2, vibrato: 1,   gain: 0.85, fall: 1,    pause: 0.7 },
  curious:  { pitch: 1,    range: 1.15, breath: 0.04,  tilt: 0,     legato: 0,     accent: 1.1, jitter: 1,   vibrato: 1,   gain: 1,    fall: 3,    pause: 1 },
  sad:      { pitch: -2.5, range: 0.55, breath: 0.18,  tilt: 0.4,   legato: 0.08,  accent: 0.6, jitter: 1.3, vibrato: 1.2, gain: 0.85, fall: -4,   pause: 1.6 },
  worried:  { pitch: 1,    range: 0.9,  breath: 0.12,  tilt: 0.2,   legato: 0,     accent: 0.9, jitter: 1.7, vibrato: 1.6, gain: 0.9, fall: -1,   pause: 1.1 },
  afraid:   { pitch: 3.5,  range: 1.2,  breath: 0.15,  tilt: 0.1,   legato: -0.05, accent: 1.2, jitter: 2.2, vibrato: 2,   gain: 0.9,    fall: 0.5,  pause: 0.8 },
  urgent:   { pitch: 2,    range: 1.2,  breath: 0,     tilt: -0.25, legato: -0.06, accent: 1.5, jitter: 1.2, vibrato: 1,   gain: 0.92,  fall: -2,   pause: 0.6 },
  angry:    { pitch: 1,    range: 1.3,  breath: -0.1,  tilt: -0.5,  legato: -0.08, accent: 1.8, jitter: 1.3, vibrato: 1,   gain: 1.02, fall: -3,   pause: 0.8 },
  menacing: { pitch: -2,   range: 0.7,  breath: 0.1,   tilt: -0.1,  legato: 0.08,  accent: 1.2, jitter: 0.8, vibrato: 1.2, gain: 1.05, fall: -3.5, pause: 1.3 },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** A voice with an emotion applied; this is what the planner and synth read. */
export function resolveVoice(voice, emotion = null) {
  const e = EMOTIONS[emotion || voice.emotion || "neutral"] || EMOTIONS.neutral;
  return {
    ...voice,
    pitch: voice.pitch * 2 ** (e.pitch / 12),
    range: voice.range * e.range,
    breath: clamp01((voice.breath ?? 0.2) + e.breath),
    tilt: Math.max(0.4, (voice.tilt ?? 1) + e.tilt),
    legato: Math.max(0.4, Math.min(0.95, (voice.legato ?? 0.8) + e.legato)),
    accent: (voice.accent ?? 2) * e.accent,
    jitter: (voice.jitter ?? 0.15) * e.jitter,
    vibrato: [voice.vibrato?.[0] ?? 0, (voice.vibrato?.[1] ?? 0) * e.vibrato],
    gain: (voice.gain ?? 1) * e.gain,
    fall: e.fall,
    pause: e.pause,
  };
}

/**
 * Guess how a line feels from its words and punctuation. Scripts can always
 * say so explicitly (`emotion` on a line or frame); this is the fallback.
 */
export function inferEmotion(text, fallback = "neutral") {
  const t = String(text);
  const lower = t.toLowerCase();
  const bangs = (t.match(/!/g) || []).length;
  const caps = (t.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (/\b(run|now|move|hurry|incoming|get down|warning|breach|critical|go go)\b/.test(lower) || bangs >= 2) return "urgent";
  if (caps >= 2 && bangs) return "angry";
  if (/\b(sorry|gone|lost|dead|died|miss you|alone|goodbye|never again)\b/.test(lower) || /\.\.\.|…/.test(t)) return "sad";
  if (/\b(love|proud|safe|home|together|thank you|glad|i'm here|i've got you)\b/.test(lower)) return "tender";
  if (bangs && /\b(yes|great|nice|perfect|well done|good job|ha)\b/.test(lower)) return "happy";
  if (/\?\s*$/.test(t)) return "curious";
  return fallback;
}

// ── Planning ────────────────────────────────────────────────────────────────

/** Average adult formants (Hz) for the vowel classes babble needs. */
export const FORMANTS = {
  A: [730, 1090, 2440],
  E: [530, 1840, 2480],
  I: [300, 2200, 2900],
  O: [570, 840, 2410],
  U: [320, 900, 2300],
  "@": [500, 1400, 2400],
};
const NASAL = [280, 1000, 2300];

/** Onset consonant class → [noise centre Hz, duration s, level]. */
const ONSETS = {
  hiss: [6200, 0.06, 0.5],
  shush: [3000, 0.07, 0.55],
  breath: [1500, 0.05, 0.4],
  pop: [2400, 0.016, 0.6],
  hum: [0, 0.05, 0],
  glide: [0, 0, 0],
};

function vowelOf(group) {
  const g = group.toLowerCase();
  if (/^(ee|ea|ie|ey)/.test(g)) return "I";
  if (/^(oo|ou|ew)/.test(g)) return "U";
  if (/^(ai|ay|ei)/.test(g)) return "E";
  if (/^(oa|ow)/.test(g)) return "O";
  const c = g[0];
  return c === "a" ? "A" : c === "e" ? "E" : c === "i" || c === "y" ? "I" : c === "o" ? "O" : c === "u" ? "U" : "@";
}

function onsetOf(cons) {
  const c = cons.toLowerCase();
  if (!c) return null;
  if (/(sh|ch|j)$/.test(c)) return "shush";
  if (/(th|f|v|h)$/.test(c)) return "breath";
  const last = c[c.length - 1];
  if ("szx".includes(last)) return "hiss";
  if ("pbtdkgqc".includes(last)) return "pop";
  if ("mn".includes(last)) return "hum";
  if ("lrwy".includes(last)) return "glide";
  return null;
}

/**
 * Split a word into syllables. Each syllable owns a run of characters (so the
 * time it takes matches the typewriter), a vowel class and an onset class.
 */
export function syllabify(word) {
  const groups = [...word.matchAll(/[aeiouy]+/gi)];
  if (!groups.length) return [{ chars: word.length, vowel: "@", onset: onsetOf(word[0] || "") }];
  // Silent trailing e ("time", "core"), but not "the", "be" or "-le".
  const last = groups[groups.length - 1];
  if (groups.length > 1 && /e$/i.test(word) && last.index === word.length - 1 && last[0].length === 1 && !/le$/i.test(word)) {
    groups.pop();
  }
  const out = [];
  let start = 0;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const end = i === groups.length - 1 ? word.length : g.index + g[0].length;
    out.push({ chars: end - start, vowel: vowelOf(g[0]), onset: onsetOf(word.slice(start, g.index)) });
    start = end;
  }
  return out;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

function snap(semi, scale) {
  if (!scale) return semi;
  const oct = Math.floor(semi / 12);
  const within = semi - oct * 12;
  let best = scale[0];
  for (const d of scale) if (Math.abs(d - within) < Math.abs(best - within)) best = d;
  return oct * 12 + best;
}

// Function words carry no stress, so the sentence's shape comes from the
// words that mean something.
const WEAK = new Set("a an the of to in on at and or but is are was be it its i you he she we they my your his her our their this that with for as by from so if not".split(" "));

const TOKEN_RE = /[A-Za-z']+|[0-9]+|\.\.\.|…|[.!?]+|[,;:—-]+|\s+|./g;

/**
 * Turn a line of text into timed syllable events.
 *
 * Every character is worth 1/charsPerSec seconds, the same pace the text types
 * at, so the voice starts and stops with the words on screen. Inside a word,
 * the stressed syllable takes a longer share of that time and the others give
 * it back, so the rhythm is not a metronome.
 *
 * Pitch is shaped per phrase: it starts a little high, drifts down, peaks on
 * stressed syllables of content words, and ends on the emotion's fall — or
 * rises when the phrase is a question.
 *
 * @returns {{ events: object[], duration: number, mood: object }}
 */
export function planUtterance(text, voice, { charsPerSec = 18, seed = null, emotion = null } = {}) {
  const clean = String(text).replace(/["“”]/g, "").trim();
  const mood = resolveVoice(voice, emotion);
  const rng = new SeededRNG(seed ?? hashString(clean));
  const step = 1 / Math.max(1, charsPerSec);
  const events = [];
  let t = 0;
  let phrase = []; // events in the current phrase

  const endPhrase = (mark) => {
    if (!phrase.length) return;
    const n = phrase.length;
    // Declination: from a touch above the voice's centre to below it.
    for (let i = 0; i < n; i++) {
      const e = phrase[i];
      const decl = n > 1 ? 0.8 - (i / (n - 1)) * 2.2 : 0;
      let semi = e.base + decl * (mood.range / 3);
      semi = mood.scale ? snap(Math.round(semi), mood.scale) : semi;
      e.semi = semi;
      e.semiEnd = semi - 0.3;
      delete e.base;
    }
    const last = phrase[n - 1];
    if (mark.includes("?")) last.semiEnd = last.semi + 5;
    else if (mark.includes("!")) {
      last.semiEnd = last.semi + mood.fall * 0.5;
      for (const e of phrase) e.gain *= 1.05;
    } else last.semiEnd = last.semi + mood.fall;
    phrase = [];
  };

  for (const [tok] of clean.matchAll(TOKEN_RE)) {
    if (/^[A-Za-z']+$/.test(tok) || /^[0-9]+$/.test(tok)) {
      const shout = tok.length > 1 && tok === tok.toUpperCase() && /[A-Z]/.test(tok);
      const weak = WEAK.has(tok.toLowerCase());
      const sylls = /^[0-9]+$/.test(tok)
        ? [...tok].map((d) => ({ chars: 1, vowel: "AEIOU"[d % 5], onset: "pop" }))
        : syllabify(tok.replace(/'/g, ""));
      const wordDur = tok.length * step; // apostrophes included, as typed
      // Stress the first syllable of a content word; share time around it.
      const weights = sylls.map((s, i) => s.chars * (!weak && i === 0 && sylls.length > 1 ? 1.35 : 1));
      const wsum = weights.reduce((a, b) => a + b, 0);
      sylls.forEach((s, i) => {
        const slot = wordDur * (weights[i] / wsum);
        const stressed = !weak && i === 0;
        const base =
          (rng.next() * 2 - 1) * mood.range * 0.35 +
          (stressed ? mood.accent * (shout ? 1.6 : 1) : 0) -
          (weak ? 0.8 : 0);
        const wob = [(rng.next() * 2 - 1) * mood.jitter, (rng.next() * 2 - 1) * mood.jitter];
        const ev = {
          t,
          slot,
          vowel: s.vowel,
          onset: s.onset,
          base,
          wob,
          gain: (shout ? 1.25 : 1) * (stressed ? 1.08 : weak ? 0.85 : 1),
        };
        events.push(ev);
        phrase.push(ev);
        t += slot;
      });
    } else if (/^(\.\.\.|…)$/.test(tok)) {
      // A trailing-off: end the phrase low and leave a longer gap.
      endPhrase(".");
      t += tok.length * step + 0.25 * mood.pause;
    } else if (/^[.!?]+$/.test(tok)) {
      endPhrase(tok);
      t += tok.length * step + 0.12 * mood.pause;
    } else {
      // Spaces, commas and dashes are silent time; a comma is a small breath.
      t += tok.length * step + (/[,;:—-]/.test(tok) ? 0.06 * mood.pause : 0);
    }
  }
  endPhrase("");
  return { events, duration: t, mood };
}

/** Enemy type → voice, and what each says when it spots you or dies. */
const ENEMY_VOICES = {
  henchman: "henchman", corrupt_cop: "henchman", shield_commander: "henchman", temporal_engineer: "henchman",
  drone: "drone", echo_drone: "drone", glitchling: "drone", chrono_bomber: "drone",
  beast: "beast", rift_leaper: "beast", phase_stalker: "beast",
  phantom: "phantom", temporal_summoner: "phantom",
  sentinel: "system", time_warden: "system",
  boss: "lord", boss_form2: "lord", boss_form3: "lord",
};
const ENEMY_LINES = {
  henchman: ["Hey!", "There!", "Contact!", "Get him!", "Move in!"],
  drone: ["Bee-dip!", "Tik tik!", "Wee-oo!"],
  beast: ["Graaah!", "Rrraugh!"],
  phantom: ["Ssshhaaa...", "Hhhooo..."],
  system: ["Target.", "Engage."],
  lord: ["There you are."],
};

export function enemyVoiceKey(type) {
  return ENEMY_VOICES[type] || null;
}

/** An alert line for an enemy voice, picked by a 0..1 roll. */
export function enemyAlertLine(voiceKey, roll) {
  const pool = ENEMY_LINES[voiceKey];
  return pool ? pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))] : null;
}

/** One-syllable barks: effort, pain and death sounds in the speaker's voice. */
export function planBark(kind) {
  const one = (slot, vowel, semi, semiEnd, gain) => ({
    events: [{ t: 0, slot, vowel, onset: "breath", semi, semiEnd, wob: [0.3, -0.3], gain }],
    duration: slot,
  });
  switch (kind) {
    case "death": return one(0.5, "A", 3, -9, 1.2);
    case "hurt": return one(0.16, "U", 4, -2, 1.1);
    case "slide":
    case "dash": return one(0.11, "U", 2, 0, 0.8);
    case "jump": return one(0.09, "@", 1, 3, 0.6);
    default: return { events: [], duration: 0 };
  }
}

// ── Synthesis ───────────────────────────────────────────────────────────────

const FORMANT_Q = [5, 8, 10];
const FORMANT_GAIN = [2.6, 1.9, 1.0];
const HARMONICS = 48;

function driveCurve(amount) {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = 1 + amount * 12;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

export class VoiceSynth {
  /**
   * @param {BaseAudioContext} ctx
   * @param {() => AudioBuffer} noiseBuffer  shared looping white noise
   */
  constructor(ctx, noiseBuffer) {
    this.ctx = ctx;
    this.noiseBuffer = noiseBuffer;
    this._curves = new Map();
    this._waves = new Map();
  }

  _curve(amount) {
    const key = Math.round(amount * 20);
    let c = this._curves.get(key);
    if (!c) this._curves.set(key, (c = driveCurve(key / 20)));
    return c;
  }

  /**
   * A glottal-pulse-like source: every harmonic present, falling off as
   * 1/n^tilt. Real voices sit around tilt 1–2; a sawtooth is tilt 1 with no
   * rounding, which is a large part of why raw oscillators sound synthetic.
   */
  _glottal(tilt) {
    const key = Math.round(tilt * 10);
    let w = this._waves.get(key);
    if (!w) {
      const real = new Float32Array(HARMONICS + 1);
      const imag = new Float32Array(HARMONICS + 1);
      for (let n = 1; n <= HARMONICS; n++) imag[n] = 1 / n ** (key / 10);
      w = this.ctx.createPeriodicWave(real, imag);
      this._waves.set(key, w);
    }
    return w;
  }

  /**
   * Schedule a plan through one node graph. Returns a handle whose `stop()`
   * fades the line out early (frame skipped, message replaced).
   */
  play(plan, voice, dest, { pan = 0, volume = 1 } = {}) {
    const ctx = this.ctx;
    if (!plan.events.length) return null;
    const v = plan.mood || resolveVoice(voice);
    const t0 = ctx.currentTime + 0.02;
    const end = t0 + plan.duration + 0.15;
    const nodes = [];
    const mk = (n) => (nodes.push(n), n);
    const sources = [];
    const src = (n) => (sources.push(n), mk(n));

    // Excitation: glottal source (plus a detuned twin for warmth) and breath,
    // gated together by one envelope, then shaped by the formants.
    const excite = mk(ctx.createGain());
    excite.gain.value = 0;
    const makeOsc = (detune) => {
      const o = src(ctx.createOscillator());
      if (v.wave) o.type = v.wave;
      else o.setPeriodicWave(this._glottal(v.tilt));
      o.detune.value = detune;
      return o;
    };
    const oscs = [makeOsc(0)];
    const tone = mk(ctx.createGain());
    tone.gain.value = 1 - v.breath * 0.45;
    oscs[0].connect(tone);
    if (v.chorus) {
      const twin = makeOsc(v.chorus);
      const tw = mk(ctx.createGain());
      tw.gain.value = 0.35;
      twin.connect(tw).connect(tone);
      oscs.push(twin);
    }
    tone.connect(excite);
    let sub = null;
    if (v.sub) {
      sub = src(ctx.createOscillator());
      sub.type = "sine";
      const sg = mk(ctx.createGain());
      sg.gain.value = 0.5;
      sub.connect(sg).connect(excite);
    }
    if (v.vibrato?.[0] > 0 && v.vibrato[1] > 0) {
      const lfo = src(ctx.createOscillator());
      lfo.frequency.value = v.vibrato[0];
      const depth = mk(ctx.createGain());
      depth.gain.value = v.pitch * (2 ** (v.vibrato[1] / 12) - 1);
      lfo.connect(depth);
      for (const o of oscs) depth.connect(o.frequency);
    }

    const noise = src(ctx.createBufferSource());
    noise.buffer = this.noiseBuffer();
    noise.loop = true;
    if (v.breath > 0) {
      const asp = mk(ctx.createGain());
      asp.gain.value = v.breath * 0.9;
      noise.connect(asp).connect(excite);
    }

    const mix = mk(ctx.createGain());
    const bands = FORMANT_Q.map((q, i) => {
      const bp = mk(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.Q.value = q;
      const g = mk(ctx.createGain());
      g.gain.value = FORMANT_GAIN[i];
      excite.connect(bp).connect(g).connect(mix);
      return bp;
    });
    // The formant bands alone strip the fundamental, which reads as thin and
    // electronic. A little low-passed direct signal puts the chest back.
    const body = mk(ctx.createBiquadFilter());
    body.type = "lowpass";
    body.frequency.value = 650 * (v.formant ?? 1);
    const bodyGain = mk(ctx.createGain());
    bodyGain.gain.value = 0.45;
    excite.connect(body).connect(bodyGain).connect(mix);

    // Consonants: separate noise bursts through their own band.
    const cons = mk(ctx.createGain());
    cons.gain.value = 0;
    const consBp = mk(ctx.createBiquadFilter());
    consBp.type = "bandpass";
    consBp.Q.value = 1.2;
    noise.connect(consBp).connect(cons).connect(mix);

    let tail = mix;
    if (v.am) {
      const amGain = mk(ctx.createGain());
      const depth = v.amDepth ?? 0.4;
      amGain.gain.value = 1 - depth;
      const am = src(ctx.createOscillator());
      am.frequency.value = v.am;
      const amDepth = mk(ctx.createGain());
      amDepth.gain.value = depth;
      am.connect(amDepth).connect(amGain.gain);
      tail.connect(amGain);
      tail = amGain;
    }
    if (v.radio) {
      const hp = mk(ctx.createBiquadFilter());
      hp.type = "highpass";
      hp.frequency.value = 380;
      const lp = mk(ctx.createBiquadFilter());
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      tail.connect(hp).connect(lp);
      tail = lp;
    }
    if (v.drive) {
      const ws = mk(ctx.createWaveShaper());
      ws.curve = this._curve(v.drive);
      tail.connect(ws);
      tail = ws;
    }
    const bright = mk(ctx.createBiquadFilter());
    bright.type = "lowpass";
    bright.frequency.value = v.brightness ?? 6000;
    bright.Q.value = 0.5;
    const out = mk(ctx.createGain());
    out.gain.value = (v.gain ?? 1) * 0.3 * volume;
    const panner = mk(ctx.createStereoPanner());
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    tail.connect(bright).connect(out).connect(panner).connect(dest);

    const fm = v.formant ?? 1;
    const hz = (semi) => Math.max(30, v.pitch * 2 ** (semi / 12));
    const pitchParams = [...oscs.map((o) => [o.frequency, 1]), ...(sub ? [[sub.frequency, 0.5]] : [])];
    const soft = (v.tilt ?? 1) >= 1.4;
    const attack = soft ? 0.022 : 0.012;
    const release = soft ? 0.03 : 0.018;

    const first = plan.events[0];
    for (const [p, k] of pitchParams) p.setValueAtTime(hz(first.semi) * k, t0);
    const firstF = FORMANTS[first.vowel] || FORMANTS["@"];
    bands.forEach((b, i) => b.frequency.setValueAtTime(firstF[i] * fm, t0));

    for (const ev of plan.events) {
      const start = t0 + ev.t;
      const on = ev.onset ? ONSETS[ev.onset] : null;
      const onDur = on ? Math.min(on[1], ev.slot * 0.35) : 0;
      const vs = start + onDur;
      const ve = start + Math.max(onDur + 0.04, ev.slot * v.legato);
      const g = ev.gain;
      const vf = FORMANTS[ev.vowel] || FORMANTS["@"];
      const glide = Math.min(0.05, (ve - vs) / 3);

      if (on && on[2] > 0) {
        consBp.frequency.setValueAtTime(on[0], start);
        cons.gain.setValueAtTime(0, start);
        cons.gain.linearRampToValueAtTime(on[2] * (v.consonant ?? 0.4), start + Math.min(0.006, onDur / 2));
        cons.gain.linearRampToValueAtTime(0, vs);
      }

      // Pitch glides into the syllable, wobbles, then settles on its end.
      const w = ev.wob || [0, 0];
      const span = ve - vs;
      for (const [p, k] of pitchParams) {
        p.linearRampToValueAtTime(hz(ev.semi) * k, vs + glide);
        p.linearRampToValueAtTime(hz(ev.semi + w[0]) * k, vs + span * 0.45);
        p.linearRampToValueAtTime(hz((ev.semi + ev.semiEnd) / 2 + w[1]) * k, vs + span * 0.75);
        p.exponentialRampToValueAtTime(hz(ev.semiEnd) * k, ve);
      }

      // Formants move toward the vowel (coarticulation), never jump.
      if (ev.onset === "hum") {
        bands.forEach((b, i) => b.frequency.linearRampToValueAtTime(NASAL[i] * fm, start + 0.01));
        excite.gain.setTargetAtTime(g * 0.35, start, 0.008);
      } else if (ev.onset === "glide") {
        bands.forEach((b, i) => b.frequency.linearRampToValueAtTime(FORMANTS.U[i] * fm, vs));
      }
      bands.forEach((b, i) => b.frequency.linearRampToValueAtTime(vf[i] * fm, vs + (ev.onset === "glide" ? 0.06 : 0.035)));

      excite.gain.setTargetAtTime(g, vs, attack);
      excite.gain.setTargetAtTime(0, Math.max(vs + attack, ve - release), release);
    }

    for (const s of sources) {
      if (s === noise) s.start(t0, Math.random() * 1.5);
      else s.start(t0);
      s.stop(end);
    }
    sources[0].onended = () => { for (const n of nodes) n.disconnect(); };

    return {
      endTime: end,
      stop: () => {
        const now = ctx.currentTime;
        if (now >= end) return;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + 0.05);
        for (const s of sources) {
          try { s.stop(now + 0.06); } catch (_) { /* already stopped */ }
        }
      },
    };
  }
}
