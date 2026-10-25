/**
 * Gear bonuses applied to a live player as a difference, so gear put on in
 * the middle of a run (a battlefield drop, a change saved in the creator from
 * the pause menu) works at once and is never counted twice.
 */

/**
 * Bring `player` from the bonuses recorded in `player._gearApplied` to `next`
 * (gearBonuses(character)). Only the difference goes on, so a second call
 * with the same gear changes nothing. Armour is a floor rather than a sum: it
 * rises with better gear and never drops.
 * @param {object} player
 * @param {Record<string, number>} next
 */
export function syncGearStats(player, next) {
  const p = player;
  const prev = p._gearApplied || {};
  const d = (k) => (next[k] || 0) - (prev[k] || 0);
  const hp = d("maxHealthAdd");
  if (hp) {
    p.maxHealth += hp;
    p.health = Math.min(p.maxHealth, p.health + Math.max(0, hp));
  }
  const chrono = d("maxChronoEnergyAdd");
  if (chrono) {
    p.maxChronoEnergy += chrono;
    p.chronoEnergy = Math.min(p.maxChronoEnergy, p.chronoEnergy);
  }
  const stamina = d("maxStaminaAdd");
  if (stamina) {
    p.maxStamina += stamina;
    p.stamina = stamina > 0 ? p.maxStamina : Math.min(p.maxStamina, p.stamina);
  }
  const dash = d("dashCostAdd");
  if (dash) p.dashStaminaCost = Math.max(8, p.dashStaminaCost + dash);
  if (next.armorAdd) p.armor = Math.max(p.armor, next.armorAdd);
  const speed = d("moveSpeedAdd");
  if (speed) p.moveSpeed += speed;
  p._gearApplied = { ...next };
}
