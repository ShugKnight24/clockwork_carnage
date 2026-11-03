/**
 * Legacy Custom HUD (hudStyle 3): readouts placed by the JSON layout from
 * the HUD editor (hud-editor.js), as fractions of the screen. Modern/Comic
 * draw Custom through renderModernCustomPanels (hud-modern.js).
 */

import { drawPortrait } from "./portrait.js";

/** @param {object} s - HUD snapshot (hud-state.js) */
export function renderLegacyCustomHUD(ctx, w, h, s) {
  // If no custom layout exists, draw a placeholder warning
  if (!s.customHudLayout) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(w / 2 - 200, h / 2 - 50, 400, 100);
    ctx.fillStyle = "#ff4400";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NO CUSTOM HUD CONFIGURED", w / 2, h / 2 - 10);
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "14px monospace";
    ctx.fillText("Go to Settings > Edit Custom HUD", w / 2, h / 2 + 20);
    return;
  }

  const layout = s.customHudLayout;

  // Health
  if (layout.health) {
    const px = layout.health.x * w;
    const py = layout.health.y * h;
    const healthPct = s.healthPct;
    ctx.fillStyle = healthPct > 0.6 ? "#00ff66" : healthPct > 0.3 ? "#ffaa00" : "#ff2200";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.ceil(s.health)}`, px, py);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText("HEALTH", px, py + 16);
  }

  // Ammo
  if (layout.ammo) {
    const px = layout.ammo.x * w;
    const py = layout.ammo.y * h;
    ctx.fillStyle = s.ammoBoost ?? "#ffcc00";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText(s.ammoText, px, py);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText("AMMO", px, py + 16);
  }

  // Shield
  if (layout.shield && s.maxShield > 0) {
    const px = layout.shield.x * w;
    const py = layout.shield.y * h;
    const shieldPct = Math.ceil((s.shield / s.maxShield) * 100);
    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${shieldPct}%`, px, py);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText("SHIELD", px, py + 16);
  }

  // Portrait
  if (layout.portrait && s.showPortrait) {
    const px = layout.portrait.x * w;
    const py = layout.portrait.y * h;
    drawPortrait(ctx, px - 60, py - 60, 120, 120, s.portrait);
  }

  // Weapons (simplified active weapon view for now)
  if (layout.weapons && s.showWeapons) {
    const px = layout.weapons.x * w;
    const py = layout.weapons.y * h;
    const wep = s.weapon;
    if (wep) {
      ctx.fillStyle = wep.color;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(wep.name.toUpperCase(), px, py);
    }
  }
}
