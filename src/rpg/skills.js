/**
 * Skills are a table so adding one later costs no ledger change. Levels are
 * always derived from xp, never stored, so the curve can be retuned without
 * migrating a save.
 */
export const SKILLS = [
  { id: "mining", name: "Mining" },
  { id: "construction", name: "Construction" },
];

export const MAX_LEVEL = 50;
const CURVE_SCALE = 8;
const CURVE_POWER = 1.85;

const SKILL_IDS = new Set(SKILLS.map((s) => s.id));

/** Cumulative xp needed to reach level `L`. Level 1 is free. */
export function xpForLevel(L) {
  if (L <= 1) return 0;
  return Math.floor(CURVE_SCALE * (L - 1) ** CURVE_POWER);
}

/** Inverse of `xpForLevel`, clamped to the cap. */
export function levelFor(xp) {
  let L = 1;
  while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++;
  return L;
}

export class Skills {
  constructor(xp = {}) {
    this.xp = {};
    for (const s of SKILLS) this.xp[s.id] = xp[s.id] || 0;
  }

  level(id) {
    return SKILL_IDS.has(id) ? levelFor(this.xp[id]) : 1;
  }

  /** @returns {{level:number,leveled:boolean}|null} null when nothing was granted */
  grant(id, amount) {
    if (!SKILL_IDS.has(id) || !(amount > 0)) return null;
    const before = this.level(id);
    this.xp[id] += amount;
    const level = this.level(id);
    return { level, leveled: level > before };
  }

  toJSON() { return { ...this.xp }; }

  static fromJSON(data) {
    return new Skills(data && typeof data === "object" ? data : {});
  }
}
