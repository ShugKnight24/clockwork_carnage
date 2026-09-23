// ─── Squad Comms Controller ─────────────────────────────────────────────────
// Routes squad voice lines (Kael/Nova/Rook/Lyra) into the ARIA comms queue.
// Gated by campaign act + member presence. Rate-limited to prevent spam.
//
// Who is present at each level is the level's `squad` in
// src/data/campaign/acts.js: nobody in Act I, then one recruit per chapter of
// Act II in the order Lyra, Rook, Nova, Kael, everyone in Act III, and fewer
// each level of Act IV. Nobody speaks before they have joined, and a member
// present before they have a name speaks under the level's callsign.
// ────────────────────────────────────────────────────────────────────────────

import { getActLevel } from "../data/campaign/acts.js";
import { ARIA_COMMS } from "../data/dialogue.js";

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
  // Voss on the comms plate when Resonance reaches him (spec §3).
  VOSS: "#ff2a4a",
};

/**
 * @param {number} act - campaign act (1-based)
 * @param {number} level - level index within act (0-based)
 * @returns {SquadMember[]} members narratively present for lines
 */
export function getPresentSquad(act, level = 0) {
  return getActLevel(act, level)?.squad ?? [];
}

/** The comms label a present member speaks under at this level. */
export function squadCallsign(act, level, member) {
  return getActLevel(act, level)?.callsigns?.[member] ?? SQUAD_CONFIG[member]?.label ?? null;
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

    // Under a callsign the plate keeps the encrypted channel's blue, not the
    // member's colour, so the colour does not name them either.
    const label = squadCallsign(act, level, member);
    this.ariaComms.queueSquadMessage(label, cfg.category, label === cfg.label ? cfg.color : "#4488ff");
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
  /**
   * One line of boss-fight chatter from `pool` (an ARIA_COMMS key whose lines
   * read "Name: line"), spoken by a member who is actually here. Nobody here,
   * or nobody the pool has a line for, means silence: ARIA has the fight alone.
   * @param {string} pool
   */
  onBossPhase(pool) {
    const key = `bossPhase:${pool}`;
    if (this.triggered.has(key)) return;
    if (!this.ariaComms || !this.ariaComms.queueSquadMessage) return;
    const { act, level } = this.context;
    const present = getPresentSquad(act, level);
    const lines = (ARIA_COMMS[pool] ?? [])
      .map((text) => {
        const m = /^([A-Za-z]+):\s*(.*)$/.exec(text);
        return m ? { member: m[1].toLowerCase(), text: m[2] } : null;
      })
      .filter((l) => l && present.includes(l.member) && SQUAD_CONFIG[l.member]);
    if (lines.length === 0) return;
    const line = lines[Math.floor(Math.random() * lines.length)];
    const cfg = SQUAD_CONFIG[line.member];
    this.ariaComms.queueSquadMessage(squadCallsign(act, level, line.member), pool, cfg.color, line.text);
    this.triggered.add(key);
  }
  onSecretFound() {
    this.emit({ preferred: "rook" });
  }

  /**
   * A scripted line for one member (a set piece's beat), under the level's
   * callsign. Silent when that member is not here.
   * @param {SquadMember} member
   * @param {string} text
   */
  say(member, text) {
    const { act, level } = this.context;
    const cfg = SQUAD_CONFIG[member];
    if (!cfg || !getPresentSquad(act, level).includes(member)) return false;
    if (!this.ariaComms?.queueSquadMessage) return false;
    const label = squadCallsign(act, level, member);
    this.ariaComms.queueSquadMessage(label, null, label === cfg.label ? cfg.color : "#4488ff", text);
    return true;
  }
}
