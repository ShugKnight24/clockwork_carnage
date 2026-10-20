/**
 * Spoken dialogue through the browser's own text-to-speech.
 *
 * Quality depends entirely on the voices the browser exposes: Edge offers
 * Microsoft's neural "Natural" voices (one is literally Aria), Chrome offers
 * Google's online voices, Safari its "Enhanced"/"Premium" voices — all of
 * which sound like people. Windows' legacy SAPI voices (David, Zira, Mark)
 * and most local fallbacks sound robotic. So every voice is scored, and the
 * game only speaks by default when a good one exists; otherwise characters
 * keep their stylised babble (src/audio/voice.js).
 *
 * Each character gets a distinct voice where the browser has enough of them,
 * matched by gender, with a small pitch and rate offset so two characters
 * sharing a voice still sound different. Machines (system readouts, drones),
 * creatures and enemies always babble.
 */

/** Characters that speak, with the gender of voice to cast and an offset. */
export const SPEECH_CAST = {
  aria: { gender: "f", pitch: 1.04, rate: 1.0, prefer: ["aria", "jenny", "samantha", "sonia", "libby", "zira"] },
  lyra: { gender: "f", pitch: 1.0, rate: 1.02, prefer: ["sonia", "libby", "emma", "ava", "michelle"] },
  miri: { gender: "f", pitch: 1.08, rate: 0.98, prefer: ["ava", "emma", "michelle", "jenny"] },
  nova: { gender: "f", pitch: 1.14, rate: 1.08, prefer: ["michelle", "ana", "emma", "ava"] },
  kai: { gender: "m", pitch: 1.06, rate: 1.06, prefer: ["andrew", "brian", "ryan", "eric"] },
  kael: { gender: "m", pitch: 0.86, rate: 0.94, prefer: ["christopher", "davis", "guy", "david"] },
  rook: { gender: "m", pitch: 0.82, rate: 0.96, prefer: ["davis", "roger", "steffan", "mark"] },
  voss: { gender: "m", pitch: 0.94, rate: 0.95, prefer: ["ryan", "thomas", "george", "guy"] },
  lord: { gender: "m", pitch: 0.6, rate: 0.86, prefer: ["christopher", "guy", "davis", "david"] },
  supervisor: { gender: "m", pitch: 0.98, rate: 1.1, prefer: ["guy", "eric", "brian", "mark"] },
  supervisorLive: { gender: "m", pitch: 0.98, rate: 1.04, prefer: ["guy", "eric", "brian", "mark"] },
  officer: { gender: "m", pitch: 1.06, rate: 1.08, prefer: ["eric", "andrew", "brian", "ryan"] },
  unknown: { gender: "m", pitch: 0.78, rate: 0.9, prefer: ["roger", "steffan", "thomas"] },
};

/** The player's voice profiles (VOICE_PROFILES ids). Synthetic stays babble. */
export const PLAYER_CAST = {
  rookie: { gender: "m", pitch: 1.12, rate: 1.06, prefer: ["andrew", "eric", "brian"] },
  veteran: { gender: "m", pitch: 0.8, rate: 0.92, prefer: ["davis", "christopher", "guy"] },
  calm: { gender: "m", pitch: 0.96, rate: 0.96, prefer: ["brian", "ryan", "guy"] },
};

const FEMALE = /\b(aria|jenny|zira|samantha|sonia|libby|michelle|ava|emma|ana|susan|hazel|heera|karen|moira|tessa|fiona|victoria|allison|natasha|clara|aria|female|woman|catherine|elizabeth|serena|joanna|salli|kimberly|ivy|kendra|amy|olivia)\b/i;
const MALE = /\b(guy|davis|david|mark|ryan|brian|andrew|christopher|eric|roger|steffan|thomas|george|daniel|alex|fred|aaron|arthur|rishi|oliver|james|william|male|man|matthew|joey|justin|liam|william)\b/i;

/**
 * How human a voice sounds, 0 (robotic) .. 100. Neural/online voices score
 * high; Windows' legacy SAPI voices and eSpeak-style fallbacks score low.
 */
export function voiceQuality(v) {
  const n = `${v.name} ${v.voiceURI || ""}`;
  if (!/^en(-|_|$)/i.test(v.lang || "")) return 0;
  let q = 10;
  if (/natural|neural/i.test(n)) q = 95;
  else if (/online/i.test(n)) q = 85;
  else if (/google/i.test(n)) q = 75;
  else if (/premium|enhanced|siri/i.test(n)) q = 80;
  else if (/samantha|daniel|karen|moira|tessa|alex/i.test(n)) q = 55; // macOS classics
  else if (/microsoft (david|zira|mark|hazel|george|susan)/i.test(n)) q = 25;
  else if (/espeak|festival/i.test(n)) q = 5;
  if (/en-us/i.test(v.lang)) q += 2;
  return q;
}

/** A voice's apparent gender from its name, or null when the name gives none. */
export function voiceGender(v) {
  if (FEMALE.test(v.name)) return "f";
  if (MALE.test(v.name)) return "m";
  return null;
}

/** Usable when the best voice clears this bar; below it the game babbles by default. */
export const GOOD_VOICE = 60;

/**
 * Assign each cast member a voice: the best-scoring voice of the right
 * gender, preferring the names listed for that character and spreading the
 * cast across distinct voices where there are enough.
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {Map<string, SpeechSynthesisVoice>} castKey → voice
 */
export function castVoices(voices, cast = { ...SPEECH_CAST, ...prefixed(PLAYER_CAST) }) {
  const pool = voices.filter((v) => voiceQuality(v) > 0).sort((a, b) => voiceQuality(b) - voiceQuality(a));
  const out = new Map();
  const used = new Map();
  if (!pool.length) return out;
  for (const [key, role] of Object.entries(cast)) {
    const fits = pool.filter((v) => voiceGender(v) === role.gender);
    const candidates = fits.length ? fits : pool;
    const score = (v) => {
      const name = v.name.toLowerCase();
      const preferred = role.prefer.findIndex((p) => name.includes(p));
      return voiceQuality(v) * 2 + (preferred >= 0 ? 40 - preferred * 5 : 0) - (used.get(v) || 0) * 30;
    };
    const pick = candidates.reduce((best, v) => (score(v) > score(best) ? v : best), candidates[0]);
    out.set(key, pick);
    used.set(pick, (used.get(pick) || 0) + 1);
  }
  return out;
}

function prefixed(cast) {
  return Object.fromEntries(Object.entries(cast).map(([k, v]) => [`player:${k}`, v]));
}

/** Emotion → [pitch, rate] multipliers: the little a TTS voice lets us shape. */
const MOOD = {
  urgent: [1.04, 1.12], afraid: [1.08, 1.12], excited: [1.06, 1.08], angry: [0.96, 1.08],
  worried: [1.03, 1.02], sad: [0.95, 0.9], tender: [1.0, 0.92], calm: [0.98, 0.94],
  warm: [1.0, 0.97], menacing: [0.92, 0.9], happy: [1.04, 1.04], curious: [1.03, 1.0],
};

/**
 * Text as it should be said: speaker labels, stage directions, markup and
 * typographic pauses removed; ellipses kept as a pause.
 */
export function speakableText(text) {
  return String(text)
    .replace(/^[A-Z][A-Z .'-]{1,24}:\s*/, "") // "ARIA: ..."
    .replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, " ") // [static], (beat), *sigh*
    .replace(/[“”"]/g, "")
    .replace(/—|–/g, ", ")
    .replace(/\.{3,}|…/g, "... ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The live speaker. Reads the browser's voices once they load, casts them,
 * and speaks lines on named channels (a new line cuts off the last one on
 * its channel, as the babble does).
 */
export class Speech {
  constructor(synth = typeof window !== "undefined" ? window.speechSynthesis : null) {
    this.synth = synth || null;
    this.cast = new Map();
    this.best = 0;
    this.volume = 0.8;
    this._current = new Map();
    if (!this.synth) return;
    const load = () => {
      const voices = this.synth.getVoices() || [];
      this.cast = castVoices(voices);
      this.best = voices.reduce((m, v) => Math.max(m, voiceQuality(v)), 0);
    };
    load();
    this.synth.addEventListener?.("voiceschanged", load);
  }

  /** Whether the browser has a voice good enough to use by default. */
  get hasGoodVoice() {
    return this.best >= GOOD_VOICE;
  }

  /** Whether this character can speak at all (it is cast and a voice exists). */
  canSpeak(key) {
    return !!this.synth && this.cast.has(key);
  }

  /**
   * Say a line. Returns { endTime } in performance-clock seconds (an
   * estimate until the utterance ends), or null when it cannot speak.
   */
  say(text, key, { channel = "comms", emotion = null, role = null } = {}) {
    const voice = this.cast.get(key);
    const r = role || SPEECH_CAST[key] || PLAYER_CAST[key.replace(/^player:/, "")];
    const line = speakableText(text);
    if (!this.synth || !voice || !r || !line || this.volume <= 0) return null;
    this.stop(channel);
    const u = new SpeechSynthesisUtterance(line);
    const [mp, mr] = MOOD[emotion] || [1, 1];
    u.voice = voice;
    u.lang = voice.lang;
    u.pitch = Math.max(0.1, Math.min(2, r.pitch * mp));
    u.rate = Math.max(0.5, Math.min(1.6, r.rate * mr));
    u.volume = Math.max(0, Math.min(1, this.volume));
    this._current.set(channel, u);
    u.onend = u.onerror = () => {
      if (this._current.get(channel) === u) this._current.delete(channel);
    };
    this.synth.speak(u);
    // ~14 characters a second at rate 1.
    const seconds = line.length / (14 * u.rate) + 0.3;
    return { endTime: performance.now() / 1000 + seconds, stop: () => this.stop(channel) };
  }

  stop(channel = null) {
    if (!this.synth) return;
    // speechSynthesis has one queue: cancelling any line cancels them all, so
    // only cancel when the channel being stopped is the one speaking.
    if (channel && !this._current.has(channel)) return;
    this._current.clear();
    this.synth.cancel();
  }

  /** Hold the line mid-word (the game paused), and pick it up again. */
  pause() {
    if (this._current.size) this.synth?.pause();
  }

  resume() {
    this.synth?.resume();
  }
}
