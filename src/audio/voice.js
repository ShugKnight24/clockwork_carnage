/**
 * Procedural "babble" voices: every speaking line in the game gets a voice
 * made of pitched vowel formants and consonant noise, paced to the text as it
 * types. No recorded audio — the words are not intelligible, but each speaker
 * has a recognisable pitch, timbre and rhythm, the way Animal Crossing or
 * Undertale characters do.
 *
 * Planning is pure (text + voice → timed syllable events) so it can be unit
 * tested without an AudioContext. `VoiceSynth` turns one plan into one small
 * node graph whose parameters are all scheduled up front.
 */

import { SeededRNG } from "../utils/seeded-rng.js";

// ── Voices ──────────────────────────────────────────────────────────────────

/**
 * pitch    base fundamental, Hz
 * range    random pitch spread per syllable, semitones
 * formant  vowel formant multiplier (<1 larger/darker, >1 smaller/brighter)
 * wave     glottal source oscillator type
 * legato   voiced share of each syllable slot (rest is gap/consonant)
 * breath   consonant/noise level
 * vibrato  [rate Hz, depth semitones]
 * scale    snap pitch to these semitone degrees (robotic sing-song)
 * am       amplitude-modulation rate in Hz (radio/synthetic grit)
 * sub      add an octave-down sine (menace)
 * drive    waveshaper amount 0..1
 * gain     output trim
 */
export const VOICES = {
  aria:      { pitch: 220, range: 3, formant: 1.18, wave: "square",   legato: 0.72, breath: 0.25, vibrato: [0, 0],   scale: [0, 2, 4, 7, 9], am: 42, gain: 1.09 },
  lord:      { pitch: 72,  range: 2, formant: 0.82, wave: "sawtooth", legato: 0.86, breath: 0.5,  vibrato: [4.5, 0.4], sub: true, drive: 0.55, gain: 0.39 },
  voss:      { pitch: 104, range: 3, formant: 0.92, wave: "sawtooth", legato: 0.8,  breath: 0.4,  vibrato: [5, 0.15], gain: 0.92 },
  lyra:      { pitch: 205, range: 4, formant: 1.14, wave: "triangle", legato: 0.8,  breath: 0.45, vibrato: [5.5, 0.2], gain: 1.36 },
  rook:      { pitch: 96,  range: 2, formant: 0.9,  wave: "sawtooth", legato: 0.6,  breath: 0.7,  vibrato: [0, 0],   drive: 0.3, gain: 0.52 },
  nova:      { pitch: 248, range: 6, formant: 1.2,  wave: "triangle", legato: 0.62, breath: 0.35, vibrato: [0, 0],   gain: 0.85 },
  kael:      { pitch: 88,  range: 2, formant: 0.88, wave: "sawtooth", legato: 0.78, breath: 0.45, vibrato: [0, 0],   gain: 1.03 },
  miri:      { pitch: 215, range: 3, formant: 1.16, wave: "triangle", legato: 0.82, breath: 0.5,  vibrato: [5, 0.2],  gain: 1.3 },
  kai:       { pitch: 128, range: 4, formant: 1.0,  wave: "sawtooth", legato: 0.68, breath: 0.45, vibrato: [0, 0],   gain: 0.96 },
  supervisor:{ pitch: 112, range: 5, formant: 0.95, wave: "sawtooth", legato: 0.66, breath: 0.4,  vibrato: [0, 0],   am: 28, gain: 1.45 },
  unknown:   { pitch: 118, range: 2, formant: 0.95, wave: "sawtooth", legato: 0.8,  breath: 0.6,  vibrato: [0, 0],   am: 18, drive: 0.4, gain: 0.49 },
  system:    { pitch: 180, range: 0, formant: 1.1,  wave: "square",   legato: 0.5,  breath: 0.1,  vibrato: [0, 0],   scale: [0], am: 60, gain: 1.06 },
  henchman:  { pitch: 92,  range: 3, formant: 0.88, wave: "sawtooth", legato: 0.7,  breath: 0.6,  vibrato: [0, 0],   drive: 0.35, gain: 0.47 },
  beast:     { pitch: 70,  range: 4, formant: 0.75, wave: "sawtooth", legato: 0.9,  breath: 0.9,  vibrato: [9, 0.8], sub: true, drive: 0.7, gain: 0.35 },
  phantom:   { pitch: 300, range: 5, formant: 1.25, wave: "triangle", legato: 0.9,  breath: 1.0,  vibrato: [3, 0.6], am: 7, gain: 0.67 },
  drone:     { pitch: 420, range: 7, formant: 1.35, wave: "square",   legato: 0.45, breath: 0.1,  vibrato: [0, 0],   scale: [0, 3, 7], am: 70, gain: 0.79 },
};

/**
 * The player's voice follows the character creator's VOICE_PROFILES
 * (rookie / veteran / calm / synthetic). Unknown ids fall back to calm.
 */
const PLAYER_VOICES = {
  rookie:    { pitch: 150, range: 5, formant: 1.06, wave: "triangle", legato: 0.66, breath: 0.4, vibrato: [0, 0], gain: 1.82 },
  veteran:   { pitch: 92,  range: 2, formant: 0.9,  wave: "sawtooth", legato: 0.76, breath: 0.65, vibrato: [0, 0], drive: 0.25, gain: 0.49 },
  calm:      { pitch: 118, range: 3, formant: 1.0,  wave: "triangle", legato: 0.82, breath: 0.35, vibrato: [4.5, 0.1], gain: 1.95 },
  synthetic: { pitch: 160, range: 4, formant: 1.12, wave: "square",   legato: 0.6,  breath: 0.15, vibrato: [0, 0], scale: [0, 3, 5, 7, 10], am: 55, gain: 1.09 },
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
  hiss: [6200, 0.06, 0.55],
  shush: [3000, 0.07, 0.6],
  breath: [1500, 0.05, 0.35],
  pop: [2400, 0.018, 0.9],
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

const TOKEN_RE = /[A-Za-z']+|[0-9]+|[.!?]+|[,;:—…-]+|\s+|./g;

/**
 * Turn a line of text into timed syllable events.
 *
 * Every character is worth 1/charsPerSec seconds, the same pace the text types
 * at, so the voice starts and stops with the words on screen.
 *
 * @returns {{ events: object[], duration: number }}
 */
export function planUtterance(text, voice, { charsPerSec = 18, seed = null } = {}) {
  const clean = String(text).replace(/["“”]/g, "").trim();
  const rng = new SeededRNG(seed ?? hashString(clean));
  const step = 1 / Math.max(1, charsPerSec);
  const events = [];
  let t = 0;
  let phraseStart = 0; // index of first event in the current phrase

  const endPhrase = (mark) => {
    const n = events.length - phraseStart;
    if (n <= 0) return;
    const lastEv = events[events.length - 1];
    if (mark.includes("?")) lastEv.semiEnd = lastEv.semi + 6;
    if (mark.includes("!")) {
      for (let i = phraseStart; i < events.length; i++) events[i].gain *= 1.15;
    }
    phraseStart = events.length;
  };

  for (const [tok] of clean.matchAll(TOKEN_RE)) {
    if (/^[A-Za-z']+$/.test(tok) || /^[0-9]+$/.test(tok)) {
      const shout = tok.length > 1 && tok === tok.toUpperCase() && /[A-Z]/.test(tok);
      const sylls = /^[0-9]+$/.test(tok)
        ? [...tok].map((d) => ({ chars: 1, vowel: "AEIOU"[d % 5], onset: "pop" }))
        : syllabify(tok.replace(/'/g, ""));
      const extra = tok.length - sylls.reduce((a, s) => a + s.chars, 0); // apostrophes
      sylls.forEach((s, i) => {
        const slot = (s.chars + (i === sylls.length - 1 ? extra : 0)) * step;
        const n = events.length - phraseStart;
        const decl = -Math.min(3, n * 0.35); // pitch drifts down across a phrase
        let semi = (rng.next() * 2 - 1) * voice.range + decl + (i === 0 ? voice.range * 0.4 : 0) + (shout ? 3 : 0);
        semi = snap(Math.round(semi), voice.scale);
        events.push({
          t,
          slot,
          vowel: s.vowel,
          onset: s.onset,
          semi,
          semiEnd: semi - 0.5,
          gain: (shout ? 1.3 : 1) * (i === 0 ? 1.08 : 1),
        });
        t += slot;
      });
    } else if (/^[.!?]+$/.test(tok)) {
      endPhrase(tok);
      t += tok.length * step + 0.12;
    } else {
      // Spaces, commas and dashes are silent time; a comma is a small breath.
      t += tok.length * step + (/[,;:—-]/.test(tok) ? 0.06 : 0);
    }
  }
  endPhrase("");
  return { events, duration: t };
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
  switch (kind) {
    case "death":
      return { events: [{ t: 0, slot: 0.5, vowel: "A", onset: "breath", semi: 3, semiEnd: -9, gain: 1.2 }], duration: 0.5 };
    case "hurt":
      return { events: [{ t: 0, slot: 0.16, vowel: "U", onset: "breath", semi: 4, semiEnd: -2, gain: 1.1 }], duration: 0.16 };
    case "slide":
    case "dash":
      return { events: [{ t: 0, slot: 0.11, vowel: "U", onset: "breath", semi: 2, semiEnd: 0, gain: 0.8 }], duration: 0.11 };
    case "jump":
      return { events: [{ t: 0, slot: 0.09, vowel: "@", onset: "breath", semi: 1, semiEnd: 3, gain: 0.6 }], duration: 0.09 };
    default:
      return { events: [], duration: 0 };
  }
}

// ── Synthesis ───────────────────────────────────────────────────────────────

const FORMANT_Q = [6, 11, 13];
const FORMANT_GAIN = [3.2, 2.2, 1.1];

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
   * @param {AudioContext} ctx
   * @param {() => AudioBuffer} noiseBuffer  shared looping white noise
   */
  constructor(ctx, noiseBuffer) {
    this.ctx = ctx;
    this.noiseBuffer = noiseBuffer;
    this._curves = new Map();
  }

  _curve(amount) {
    const key = Math.round(amount * 20);
    let c = this._curves.get(key);
    if (!c) this._curves.set(key, (c = driveCurve(key / 20)));
    return c;
  }

  /**
   * Schedule a plan through one node graph. Returns a handle whose `stop()`
   * fades the line out early (frame skipped, message replaced).
   */
  play(plan, voice, dest, { pan = 0, volume = 1 } = {}) {
    const ctx = this.ctx;
    if (!plan.events.length) return null;
    const t0 = ctx.currentTime + 0.02;
    const end = t0 + plan.duration + 0.1;
    const nodes = [];
    const mk = (n) => (nodes.push(n), n);

    const osc = mk(ctx.createOscillator());
    osc.type = voice.wave;
    const voiced = mk(ctx.createGain());
    voiced.gain.value = 0;
    osc.connect(voiced);
    let sub = null;
    if (voice.sub) {
      sub = mk(ctx.createOscillator());
      sub.type = "sine";
      const subGain = mk(ctx.createGain());
      subGain.gain.value = 0.6;
      sub.connect(subGain).connect(voiced);
    }
    let lfo = null;
    if (voice.vibrato?.[0] > 0) {
      lfo = mk(ctx.createOscillator());
      lfo.frequency.value = voice.vibrato[0];
      const depth = mk(ctx.createGain());
      depth.gain.value = voice.pitch * (2 ** (voice.vibrato[1] / 12) - 1);
      lfo.connect(depth).connect(osc.frequency);
    }

    const mix = mk(ctx.createGain());
    const bands = FORMANT_Q.map((q, i) => {
      const bp = mk(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.Q.value = q;
      const g = mk(ctx.createGain());
      g.gain.value = FORMANT_GAIN[i];
      voiced.connect(bp).connect(g).connect(mix);
      return bp;
    });

    const noise = mk(ctx.createBufferSource());
    noise.buffer = this.noiseBuffer();
    noise.loop = true;
    const noiseEnv = mk(ctx.createGain());
    noiseEnv.gain.value = 0;
    const noiseBp = mk(ctx.createBiquadFilter());
    noiseBp.type = "bandpass";
    noiseBp.Q.value = 1.2;
    noise.connect(noiseBp).connect(noiseEnv).connect(mix);

    let tail = mix;
    if (voice.am) {
      const amGain = mk(ctx.createGain());
      amGain.gain.value = 0.6;
      const am = mk(ctx.createOscillator());
      am.frequency.value = voice.am;
      const amDepth = mk(ctx.createGain());
      amDepth.gain.value = 0.4;
      am.connect(amDepth).connect(amGain.gain);
      tail.connect(amGain);
      tail = amGain;
      am.start(t0);
      am.stop(end);
    }
    if (voice.drive) {
      const ws = mk(ctx.createWaveShaper());
      ws.curve = this._curve(voice.drive);
      tail.connect(ws);
      tail = ws;
    }
    const out = mk(ctx.createGain());
    out.gain.value = (voice.gain ?? 1) * 0.22 * volume;
    const panner = mk(ctx.createStereoPanner());
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    tail.connect(out).connect(panner).connect(dest);

    const fm = voice.formant ?? 1;
    const setFormants = (f, at) => {
      for (let i = 0; i < 3; i++) bands[i].frequency.setValueAtTime(f[i] * fm, at);
    };
    const rampFormants = (f, at) => {
      for (let i = 0; i < 3; i++) bands[i].frequency.linearRampToValueAtTime(f[i] * fm, at);
    };

    for (const ev of plan.events) {
      const start = t0 + ev.t;
      const on = ev.onset ? ONSETS[ev.onset] : null;
      const onDur = on ? Math.min(on[1], ev.slot * 0.4) : 0;
      const vs = start + onDur;
      const ve = start + Math.max(onDur + 0.03, ev.slot * voice.legato);
      const g = ev.gain;
      const f0 = voice.pitch * 2 ** (ev.semi / 12);
      const f1 = voice.pitch * 2 ** (ev.semiEnd / 12);
      const vf = FORMANTS[ev.vowel] || FORMANTS["@"];

      if (on && on[2] > 0) {
        noiseBp.frequency.setValueAtTime(on[0], start);
        const nl = on[2] * voice.breath;
        noiseEnv.gain.setValueAtTime(0, start);
        noiseEnv.gain.linearRampToValueAtTime(nl, start + Math.min(0.006, onDur / 2));
        noiseEnv.gain.linearRampToValueAtTime(0, vs);
      }
      osc.frequency.setValueAtTime(f0, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), ve);
      if (sub) {
        sub.frequency.setValueAtTime(f0 / 2, start);
        sub.frequency.exponentialRampToValueAtTime(Math.max(20, f1 / 2), ve);
      }
      voiced.gain.setValueAtTime(0, start);
      if (ev.onset === "hum") {
        setFormants(NASAL, start);
        voiced.gain.linearRampToValueAtTime(g * 0.35, start + 0.01);
        voiced.gain.setValueAtTime(g * 0.35, vs);
        setFormants(vf, vs);
      } else if (ev.onset === "glide") {
        setFormants(FORMANTS.U, vs);
        rampFormants(vf, vs + Math.min(0.06, (ve - vs) / 2));
      } else {
        setFormants(vf, vs);
      }
      voiced.gain.linearRampToValueAtTime(g, vs + 0.012);
      voiced.gain.setValueAtTime(g, Math.max(vs + 0.012, ve - 0.03));
      voiced.gain.linearRampToValueAtTime(0, ve);
    }

    osc.start(t0);
    osc.stop(end);
    sub?.start(t0);
    sub?.stop(end);
    lfo?.start(t0);
    lfo?.stop(end);
    noise.start(t0, Math.random() * 1.5);
    noise.stop(end);
    osc.onended = () => { for (const n of nodes) n.disconnect(); };

    return {
      endTime: end,
      stop: () => {
        const now = ctx.currentTime;
        if (now >= end) return;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + 0.04);
        try {
          osc.stop(now + 0.05);
          sub?.stop(now + 0.05);
          lfo?.stop(now + 0.05);
          noise.stop(now + 0.05);
        } catch (_) { /* already stopped */ }
      },
    };
  }
}
