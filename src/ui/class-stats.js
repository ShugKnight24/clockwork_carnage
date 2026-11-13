/**
 * The showroom's class card bars (js/components/agent-showroom.js), kept apart
 * from the component so they can be checked against how the game applies a
 * class.
 */

/** Stat lines for a loadout, mirroring Game.applyLoadoutBonuses (js/game.js). */
export function classStats(cls) {
  const b = cls.bonuses || {};
  const chrono = { phantom: 120, enforcer: 80 }[cls.id] ?? 100;
  return [
    { label: "Health", value: b.maxHealth ?? 100, base: 100, max: 150 },
    { label: "Speed", value: 3.5 + (b.moveSpeed ?? 0), base: 3.5, max: 4.5, fmt: (v) => v.toFixed(1) },
    // The game divides each gun's delay between shots by fireRateMultiplier
    // (combat-orchestrator.js), so the rate is the multiplier itself.
    { label: "Fire rate", value: b.fireRateMultiplier ?? 1, base: 1, max: 1.25, fmt: (v) => `${Math.round(v * 100)}%` },
    { label: "Stamina", value: b.maxStamina ?? 100, base: 100, max: 150 },
    { label: "Chrono", value: chrono, base: 100, max: 130 },
    { label: "Damage", value: cls.id === "enforcer" ? 1.15 : 1, base: 1, max: 1.25, fmt: (v) => `${Math.round(v * 100)}%` },
  ];
}
