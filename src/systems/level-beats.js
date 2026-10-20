/**
 * Plays a level's narrative beats (src/data/campaign/beats.js) as the level
 * is played: each fires once, when its moment comes (the level's start, a
 * share of its enemies down, a power cell, the exit in sight, time spent).
 *
 * Lines wait their turn: one is queued only when the comms are free, so a
 * beat never talks over ARIA's own reactions or the squad, and never drops
 * a line because the queue was busy. Events (a flicker, a tremor) play at
 * once.
 */
import { LEVEL_BEATS } from "../data/campaign/beats.js";

/** Plate colour and voice for each speaker a beat uses. */
const SPEAKERS = {
  ARIA: { color: "#00ffdd", voice: "aria" },
  PA: { color: "#9fb4c8", voice: "system" },
  "RASCZAK (LOG)": { color: "#6fb6ff", voice: "officer" },
  "LAB LOG": { color: "#c8b48a", voice: "system" },
  UNKNOWN: { color: "#ff5a6e", voice: "unknown" },
};

/** Steps from the exit at which an "exit" beat fires. */
const EXIT_NEAR = 7;
/** Seconds a flicker keeps the lights down. */
const FLICKER_S = 0.45;

/** How long a line stays up: long enough to be read and spoken. */
const lineDuration = (text) => Math.max(3.2, Math.min(9, String(text).length / 15 + 1.4));

export class LevelBeats {
  constructor() {
    this.beats = [];
    this.fired = new Set();
    this.clock = 0;
    this.lines = [];
    this._ourLine = null;
    this._gap = 0;
    this.flickerUntil = 0;
  }

  /** The level's beats, fresh: called as a campaign level loads. */
  start(actId, mapId) {
    this.beats = LEVEL_BEATS[actId]?.[mapId] ?? [];
    this.fired = new Set();
    this.clock = 0;
    this.lines = [];
    this._ourLine = null;
    this._gap = 0;
    this.flickerUntil = 0;
  }

  /** Whether the lights are down for a flicker right now. */
  get dark() {
    return this.clock < this.flickerUntil;
  }

  /** Whether a beat's moment has come. */
  due(beat, game) {
    switch (beat.at) {
      case "start":
        return this.clock >= (beat.delay ?? 0);
      case "time":
        return this.clock >= beat.s;
      case "kills":
        return game.totalEnemies > 0 && game.killedEnemies / game.totalEnemies >= beat.frac;
      case "cell":
        return (game.powerCells?.found ?? 0) >= (beat.n ?? 1);
      case "exit": {
        const ex = game.exitEntity;
        return !!ex && Math.hypot(ex.x - game.player.x, ex.y - game.player.y) < EXIT_NEAR;
      }
      default:
        return false;
    }
  }

  /** Once per frame while a campaign level is being played. */
  update(game, dt) {
    if (!this.beats.length && !this.lines.length) return;
    this.clock += dt;
    this.beats.forEach((beat, i) => {
      if (this.fired.has(i) || !this.due(beat, game)) return;
      this.fired.add(i);
      if (beat.event) this.play(beat.event, game);
      if (beat.lines) this.lines.push(...beat.lines);
    });
    this._speak(game, dt);
  }

  play(event, game) {
    if (event === "flicker") {
      this.flickerUntil = this.clock + FLICKER_S;
      game.glitchEffect = Math.max(game.glitchEffect || 0, 0.35);
      game.audio?.powerFlicker?.();
    } else if (event === "tremor") {
      game.screenShake = Math.max(game.screenShake || 0, 5);
      game.audio?.tremor?.();
    }
  }

  _speak(game, dt) {
    const comms = game.ariaComms;
    if (!comms) return;
    if (this._ourLine && comms.message?._beat !== this._ourLine) this._ourLine = null;
    if (this._gap > 0) this._gap -= dt;
    if (this._ourLine || comms.message || comms.queue?.length || this._gap > 0 || !this.lines.length) return;
    const [speaker, text, emotion] = this.lines.shift();
    const style = SPEAKERS[speaker] ?? SPEAKERS.ARIA;
    const id = {};
    comms.queueLine?.({
      speaker,
      text,
      color: style.color,
      voice: style.voice,
      emotion: emotion ?? null,
      duration: lineDuration(text),
      prominent: true,
      _beat: id,
    });
    this._ourLine = id;
    this._gap = 0.4;
  }
}
