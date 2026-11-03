/**
 * Legacy Tactical HUD (hudStyle 2): a sleek floating arc with health on the
 * left, ammo on the right and the weapon name between. Modern/Comic draw
 * Tactical through renderModernTacticalPanels (hud-modern.js).
 */

/** @param {object} s - HUD snapshot (hud-state.js) */
export function renderLegacyTacticalHUD(ctx, w, h, s) {
  const wep = s.weapon;
  const healthColor = s.healthColor;

  const cx = w / 2;
  const cy = h - 60;

  // Tactical curve arc
  ctx.strokeStyle = "rgba(0,255,200,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 180, Math.PI + 0.3, Math.PI * 2 - 0.3);
  ctx.stroke();

  // Left side: Health & Shield
  ctx.fillStyle = "rgba(0,10,20,0.6)";
  ctx.beginPath();
  ctx.moveTo(cx - 200, cy);
  ctx.lineTo(cx - 300, cy);
  ctx.lineTo(cx - 320, cy + 40);
  ctx.lineTo(cx - 200, cy + 40);
  ctx.fill();

  ctx.fillStyle = healthColor;
  ctx.font = "bold 24px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`HP ${Math.ceil(s.health)}`, cx - 210, cy + 28);

  // Right side: Ammo
  ctx.fillStyle = "rgba(0,10,20,0.6)";
  ctx.beginPath();
  ctx.moveTo(cx + 200, cy);
  ctx.lineTo(cx + 300, cy);
  ctx.lineTo(cx + 320, cy + 40);
  ctx.lineTo(cx + 200, cy + 40);
  ctx.fill();

  ctx.fillStyle = s.ammoBoost ?? "#ffcc00";
  ctx.textAlign = "left";
  ctx.fillText(`AMMO ${s.ammoText}`, cx + 210, cy + 28);

  // Center weapon icon
  if (wep) {
    ctx.fillStyle = wep.color;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(wep.name.toUpperCase(), cx, cy - 20);
  }
}
