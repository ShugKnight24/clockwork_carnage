// ─── Squad Comms Controller ─────────────────────────────────────────────────
// Routes squad voice lines (Kael/Nova/Rook/Lyra) into the ARIA comms queue.
// Gated by campaign act + member presence. Rate-limited to prevent spam.
//
// Who is present at each level is the level's `squad` in
// src/data/campaign/acts.js.
// ────────────────────────────────────────────────────────────────────────────

import { getActLevel } from "../data/campaign/acts.js";

/** @typedef {"kael"|"nova"|"rook"|"lyra"} SquadMember */

/** @type {Record<SquadMember, { label: string, category: string, color: string }>} */
const SQUAD_CONFIG = {
  kael: { label: "KAEL", category: "kaelComms", color: "#ff8844" },
  nova: { label: "NOVA", category: "novaComms", color: "#ffcc33" },
  rook: { label: "ROOK", category: "rookComms", color: "#66ccff" },
  lyra: { label: "LYRA", category: "lyraComms", color: "#ffaa44" },
};

/**
 * Speaker tab colours for the Modern comms plates (aria-comms.js). Legacy keeps
 * the per-member text tints in SQUAD_CONFIG above.
 */
export const SQUAD_TAB_COLORS = {
  KAEL: "#4f9dff",
  LYRA: "#ffae3a",
  NOVA: "#ff5fb4",
  ROOK: "#3dff8a",
  SQUAD: "#ffd24a",
};

/**
 * @param {number} act - campaign act (1-based)
 * @param {number} level - level index within act (0-based)
 * @returns {SquadMember[]} members narratively present for lines
 */
export function getPresentSquad(act, level = 0) {
  return getActLevel(act, level)?.squad ?? [];
}

export class SquadCommsController {
  /**
   * @param {{ queueSquadMessage: (speaker: string, category: string, color?: string) => void }} ariaComms
   */
  constructor(ariaComms) {
    // Game passes itself; the queue lives on game.ariaComms. Resolve lazily
    // because the controller can be built before (or alongside) that system.
    this._commsHost = ariaComms;
    this.cooldown = 0; // seconds until next line allowed
    this.minCooldown = 8; // min spacing between squad lines
    this.maxCooldown = 18; // max spacing (randomized after each line)
    this.triggered = new Set(); // one-shot keys (e.g. "lowHp:lvl2")
    this.context = { act: 1, level: 0 };
  }

  /** The object that owns queueSquadMessage (the ARIA comms system). */
  get ariaComms() {
    const host = this._commsHost;
    if (host && typeof host.queueSquadMessage !== "function" && host.ariaComms) {
      return host.ariaComms;
    }
    return host;
  }

  /** Call when level loads to update narrative context + reset triggers. */
  setContext(act, level) {
    this.context = { act: act | 0, level: level | 0 };
    this.triggered.clear();
  }

  /** Reset all state (e.g. on campaign restart). */
  reset() {
    this.cooldown = 0;
    this.triggered.clear();
    this.context = { act: 1, level: 0 };
  }

  /** Tick cooldown. */
  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
  }

  /**
   * Emit a random squad voice line if allowed.
   * @param {{ force?: boolean, preferred?: SquadMember }} [opts]
   * @returns {boolean} true if a line was emitted
   */
  emit(opts = {}) {
    const { act, level } = this.context;
    const present = getPresentSquad(act, level);
    if (present.length === 0) return false;
    if (!opts.force && this.cooldown > 0) return false;

    const member =
      opts.preferred && present.includes(opts.preferred)
        ? opts.preferred
        : present[Math.floor(Math.random() * present.length)];
    const cfg = SQUAD_CONFIG[member];
    if (!cfg) return false;

    this.ariaComms.queueSquadMessage(cfg.label, cfg.category, cfg.color);
    this.cooldown =
      this.minCooldown + Math.random() * (this.maxCooldown - this.minCooldown);
    return true;
  }

  /** Fire a one-shot line keyed by `key`, respecting cooldown unless `force`. */
  emitOnce(key, opts = {}) {
    if (this.triggered.has(key)) return false;
    const emitted = this.emit(opts);
    if (emitted) this.triggered.add(key);
    return emitted;
  }

  // ── Semantic trigger helpers (game.js calls these) ──────────────────────

  onCombatStart() {
    this.emitOnce(`combatStart:${this.context.act}.${this.context.level}`);
  }
  onKillStreak(tier) {
    if (tier >= 3) this.emit();
  }
  onLowHealth() {
    this.emitOnce(`lowHp:${this.context.act}.${this.context.level}`, {
      preferred: "kael",
    });
  }
  onBossPhase(phase) {
    // Per-phase ensemble chatter (ARIA_COMMS.bossPhase{N}Squad).
    const cat = `bossPhase${phase}Squad`;
    const key = `bossPhase:${phase}`;
    if (this.triggered.has(key)) return;
    if (!this.ariaComms || !this.ariaComms.queueSquadMessage) return;
    this.ariaComms.queueSquadMessage("SQUAD", cat, "#ffddaa");
    this.triggered.add(key);
  }
  onSecretFound() {
    this.emit({ preferred: "rook" });
  }
}
