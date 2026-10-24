/**
 * Conditioning: three skills that improve with use and stay with the agent
 * from one campaign to the next (saved on their own, src/core/save-system.js
 * saveConditioning).
 *
 *   Stamina     XP per tile sprinted. Faster stamina regen, more stamina.
 *   Reload      XP per active-reload hit, double for a perfect. A quicker
 *               reload and a wider sweet zone.
 *   Steadiness  XP per kill with the sights up, and per headshot kill. Less
 *               spread and scope sway while aimed.
 *
 * Five levels each. The bonuses are small and capped: a level-5 agent is a
 * little better, not a different game, so the skill of playing still decides
 * a fight. The XP curve is tuned so the fifth level arrives near the end of a
 * whole campaign played the way it asks (29 levels, sprinting between
 * fights, an active reload or two a fight, aiming most kills).
 */

export const MAX_LEVEL = 5;

/** Cumulative XP to reach levels 1 … 5. */
export const SKILLS = {
  stamina: { label: "STAMINA", xp: [150, 450, 900, 1600, 2500] },
  reload: { label: "RELOAD", xp: [8, 25, 55, 100, 160] },
  steadiness: { label: "STEADINESS", xp: [15, 50, 120, 220, 350] },
};
export const SKILL_IDS = Object.keys(SKILLS);

/** XP for an active-reload hit, by outcome. */
export const RELOAD_XP = { hit: 1, perfect: 2 };
/** XP for an aimed kill, and on top of it for a headshot kill. */
export const STEADY_XP = { adsKill: 1, headshot: 1 };

/** A blank record: every skill at level 0. */
export function createConditioning() {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, 0]));
}

/** A saved record made safe: finite, non-negative XP for known skills only. */
export function normalizeConditioning(saved) {
  const out = createConditioning();
  if (!saved || typeof saved !== "object") return out;
  for (const id of SKILL_IDS) {
    const v = saved[id];
    if (Number.isFinite(v) && v > 0) out[id] = v;
  }
  return out;
}

/** The level (0 … MAX_LEVEL) `xp` buys in skill `id`. */
export function levelFor(id, xp) {
  const steps = SKILLS[id]?.xp ?? [];
  let lv = 0;
  while (lv < steps.length && xp >= steps[lv]) lv++;
  return lv;
}

export const levelOf = (cond, id) => levelFor(id, cond?.[id] ?? 0);

/** Share of the way from this level to the next, 0 … 1 (1 at the cap). */
export function progressOf(cond, id) {
  const xp = cond?.[id] ?? 0;
  const lv = levelFor(id, xp);
  const steps = SKILLS[id].xp;
  if (lv >= steps.length) return 1;
  const from = lv ? steps[lv - 1] : 0;
  return (xp - from) / (steps[lv] - from);
}

/**
 * Add `amount` XP to skill `id`. Returns the new level if this crossed one
 * (so the caller can announce it), else 0.
 */
export function addXp(cond, id, amount) {
  if (!cond || !(id in SKILLS) || !(amount > 0)) return 0;
  const before = levelFor(id, cond[id]);
  if (before >= MAX_LEVEL) return 0;
  cond[id] += amount;
  const after = levelFor(id, cond[id]);
  return after > before ? after : 0;
}

/**
 * What the levels are worth, as multipliers and adds the game applies:
 *   staminaRegenMult  stamina regen, +10% a level
 *   staminaBonus      max stamina, +5 a level
 *   reloadMult        reload time, −3% a level
 *   zoneMult          sweet-zone width, +6% a level
 *   steadyMult        aimed spread and scope sway, −6% a level
 */
export function conditioningBonuses(cond) {
  const s = levelOf(cond, "stamina");
  const r = levelOf(cond, "reload");
  const a = levelOf(cond, "steadiness");
  return {
    staminaRegenMult: 1 + 0.1 * s,
    staminaBonus: 5 * s,
    reloadMult: 1 - 0.03 * r,
    zoneMult: 1 + 0.06 * r,
    steadyMult: 1 - 0.06 * a,
  };
}
