/**
 * Vessel sounds: a jetski's engine, a paddle stroke for a raft or a boat, a
 * splash when a hull lands in the water and a thump when it hits the shore.
 * Built from the AudioManager's tone and noise primitives like the block
 * sounds; the audio core has no looping voice to hold an engine note, so the
 * engine is a train of short pulses whose rate and pitch follow the speed,
 * the way a small two-stroke sounds anyway.
 */
import { playWaterSound } from "./block-sounds.js";

/** Seconds between engine pulses: at rest, and flat out. */
const ENGINE_IDLE = 0.2, ENGINE_FAST = 0.045;
/** Seconds between paddle strokes. */
const STROKE = { raft: 0.95, boat: 0.75 };
/** A thump at most this often, so grinding along a bank is not a drum roll. */
const BUMP_GAP = 0.35;
/** Impact speeds, blocks a second, below which nothing is heard. */
const SPLASH_FROM = 1, BUMP_FROM = 1.5;
/** The jetski's top speed, for the engine's pitch. */
const JETSKI_TOP = 13;

/**
 * Turns the ridden vessel's state, frame to frame, into sounds. Pure: it
 * returns `[name, strength 0..1, pitch]` triples for the caller to play, so
 * it is tested without audio.
 */
export class VesselSoundTracker {
  constructor() { this.engine = 0; this.stroke = 0; this.bumpGap = 0; }

  /**
   * @param {{kind:string, speed:number, throttle:number, floating:boolean,
   *   splash:number, bump:number, dt:number}} s `splash` and `bump` are the
   *   impact speeds `stepVessel` reports, 0 when nothing happened
   */
  update({ kind, speed, throttle, floating, splash, bump, dt }) {
    const out = [];
    this.engine = Math.max(0, this.engine - dt);
    this.stroke = Math.max(0, this.stroke - dt);
    this.bumpGap = Math.max(0, this.bumpGap - dt);
    if (kind === "jetski" && this.engine === 0) {
      const frac = Math.min(1, speed / JETSKI_TOP);
      const push = Math.max(Math.abs(throttle), frac);
      out.push(["engine", 0.35 + 0.65 * push, 1 + frac * 1.2 + (throttle ? 0.1 : 0)]);
      this.engine = throttle || frac > 0.05 ? ENGINE_IDLE * 0.6 + (ENGINE_FAST - ENGINE_IDLE * 0.6) * frac : ENGINE_IDLE;
    }
    if (STROKE[kind] && floating && throttle && this.stroke === 0) {
      out.push(["paddle", 0.6, 1]);
      this.stroke = STROKE[kind];
    }
    if (splash > SPLASH_FROM) out.push(["splash", Math.min(1, 0.2 + splash / 10), 1]);
    if (bump > BUMP_FROM && this.bumpGap === 0) {
      out.push(["bump", Math.min(1, bump / 8), 1]);
      this.bumpGap = BUMP_GAP;
    }
    return out;
  }
}

/**
 * Play one vessel sound through `audio` (an AudioManager).
 * @param {number} strength 0..1 loudness
 * @param {number} [pitch] frequency multiplier (the engine's revs)
 * @param {string} [kind] the vessel, for what a bump sounds like
 */
export function playVesselSound(audio, name, strength = 1, pitch = 1, kind = "boat") {
  if (!audio?.ctx) return;
  const k = Math.max(0.05, Math.min(1, strength));
  const vary = 0.94 + Math.random() * 0.12;
  if (name === "engine") {
    audio.playTone(58 * pitch * vary, 0.07, "sawtooth", 0.05 * k);
    audio.playTone(116 * pitch * vary, 0.05, "square", 0.018 * k);
    audio.playNoise(0.05, 0.04 * k, 900 * pitch, "lowpass");
  } else if (name === "paddle") {
    audio.playNoise(0.28, 0.15 * k, 700 * vary, "bandpass");
    audio.playTone(170 * vary, 0.1, "sine", 0.04 * k);
  } else if (name === "splash") {
    playWaterSound(audio, "enter", k);
  } else if (name === "bump") {
    const metal = kind === "jetski";
    audio.playNoise(0.12, 0.3 * k, metal ? 1400 : 500, metal ? "bandpass" : "lowpass");
    audio.playTone((metal ? 240 : 95) * vary, 0.14, "triangle", 0.2 * k);
  }
}
