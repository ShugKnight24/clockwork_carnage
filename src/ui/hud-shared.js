/**
 * HUD pieces every layout draws: reticle and hit marker, floating damage
 * numbers, the boss name card, the power-cell chip, the minimap slot, the
 * stage-cleared banner, slow-mo vignette and FPS counter. Each style module
 * (hud-classic, hud-minimal, hud-compact, hud-modern, hud-vanguard) lays out
 * its own panels and calls these for the overlays on top.
 *
 * Most read the per-frame snapshot (hud-state.js); the reticle and boss name
 * card still take `game` because they call into aim, cover and the message
 * director.
 */

import { drawCrosshair, drawAdsSight, drawSpreadBrackets, drawScope } from "./crosshair.js";
import { drawMinimap } from "./minimap.js";
import { effectiveAimFov, reticlePoint, getAimBlend, currentSpread, scopeSteadiness, aimAnglesForGame } from "../systems/aim.js";
import { isModernArt, isRealisticArt } from "../rendering/art-style.js";
import { HT as SKIN, drawPanel as skinPanel, uiFont as skinFont, cachedSprite, blitSprite } from "./hud-skin.js";
import { drawModernDamageNumber, drawModernBossNameCard, drawModernStageCleared, hudAnchors } from "./hud-modern.js";
import { coverCone, blindFireNow } from "../systems/cover-play.js";
import { drawReloadHud } from "./reload-hud.js";
import { phoneMinimapSize } from "./touch-layout.js";

/**
 * Weapon name → asset slug. Mirrors the slugifier in
 * scripts/generate-sprites.mjs so HUD-side lookup never drifts. Kept
 * inline rather than importing from the generator (which is untracked
 * dev-only tooling).
 */
export const weaponSlug = (name) =>
  (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Hit-marker reticle overlay. Pops in fast, eases out, with crit (yellow,
 * larger, double ring) and kill (white flash + outward burst) variants.
 * Single source of truth — replaces three copies that previously diverged.
 *
 * Reads: s.hitMarker (seconds remaining), s.hitMarkerCrit, s.hitMarkerKill.
 * Lifetime budget: 0.22s crit, 0.15s normal — driver decides at write site.
 */
export function drawHitMarker(ctx, s, cx, cy) {
  const t = s.hitMarker;
  if (t <= 0) return;
  const total = (s.hitMarkerCrit || s.hitMarkerHead) ? 0.22 : 0.15;
  const age = Math.max(0, total - t);            // 0 → total
  const popIn = Math.min(1, age / 0.04);          // first 40 ms scale-up
  const fade = Math.min(1, t / 0.10);             // last 100 ms fade
  const alpha = popIn * fade;
  const scale = 0.6 + 0.5 * (1 - Math.pow(1 - popIn, 3)); // ease-out cubic to 1.1

  const kill = s.hitMarkerKill;
  const crit = s.hitMarkerCrit;
  const head = s.hitMarkerHead;
  // A round a shield took (s.hitMarkerBlocked): a small grey deflect tick,
  // the round glancing off a flat plate, so it never reads as a hit.
  if (s.hitMarkerBlocked && !kill) {
    const k = scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 3;
    ctx.strokeStyle = "#cfd6de";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8 * k, 7 * k);
    ctx.lineTo(8 * k, 7 * k);
    ctx.moveTo(-7 * k, -6 * k);
    ctx.lineTo(0, 4 * k);
    ctx.lineTo(7 * k, -6 * k);
    ctx.stroke();
    ctx.restore();
    return;
  }
  // Headshots get the warmest highlight (orange→red), crit stays gold,
  // normal hits red, kill flash is white. Headshot+crit stacks visually
  // toward orange-gold so player can read both at a glance.
  const color = kill
    ? "#ffffff"
    : head && crit ? "#ff9a1f"
    : head ? "#ff6a1f"
    : crit ? "#ffe14a"
    : "#ff3a3a";
  const isAccent = crit || head;
  const len = (isAccent ? 11 : 8) * scale;
  const gap = (isAccent ? 4 : 3) * scale;
  const lw = isAccent ? 2.6 : 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = isAccent ? 8 : 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;

  // Four spokes with center gap (more readable than a solid X)
  ctx.beginPath();
  for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(sx * gap, sy * gap);
    ctx.lineTo(sx * len, sy * len);
  }
  ctx.stroke();

  // Crit/head get a second outer ring of dashes
  if (isAccent) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, len + 4, 0, Math.PI * 2);
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Kill flash: outward expanding ring
  if (kill) {
    const k = age / total; // 0 → 1
    ctx.globalAlpha = alpha * (1 - k);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 6 + k * 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Floating damage number sprite. Style varies with hit category:
 *   crit  → gold, bold, with stroke shadow
 *   head  → orange, bold, with "HEAD!" tag above
 *   flank → amber, bold, with "FLANK!" tag above (past a shield bearer's shield)
 *   else  → white outlined number
 *
 * Caller controls font scale via `large` flag (true = HUD/builder paths,
 * false = compact in-bar HUD).
 */
function drawDamageNumber(ctx, dn, x, y, large) {
  if (isModernArt()) {
    drawModernDamageNumber(ctx, dn, x, y, large);
    return;
  }
  const f = large ? 18 : 16;
  const fSmall = large ? 14 : 12;
  if (dn.crit) {
    ctx.font = `bold ${f}px monospace`;
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = large ? 8 : 6;
    ctx.fillStyle = "#ffcc00";
    ctx.fillText(dn.value, x, y);
    ctx.shadowBlur = 0;
    if (large) {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeText(dn.value, x, y);
      ctx.fillText(dn.value, x, y);
    }
  } else if (dn.head) {
    ctx.font = `bold ${f}px monospace`;
    ctx.shadowColor = "#ff7a1f";
    ctx.shadowBlur = large ? 8 : 6;
    ctx.fillStyle = "#ff7a1f";
    ctx.fillText(dn.value, x, y);
    ctx.shadowBlur = 0;
    ctx.font = `bold ${large ? 10 : 9}px monospace`;
    ctx.fillStyle = "#ffaa44";
    ctx.fillText("HEAD!", x, y - (large ? 16 : 13));
  } else if (dn.flank) {
    ctx.font = `bold ${f}px monospace`;
    ctx.shadowColor = "#ff9a2a";
    ctx.shadowBlur = large ? 8 : 6;
    ctx.fillStyle = "#ffc04a";
    ctx.fillText(dn.value, x, y);
    ctx.shadowBlur = 0;
    ctx.font = `bold ${large ? 10 : 9}px monospace`;
    ctx.fillStyle = "#ffd27a";
    ctx.fillText("FLANK!", x, y - (large ? 16 : 13));
  } else {
    ctx.font = `bold ${fSmall}px monospace`;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeText(dn.value, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(dn.value, x, y);
  }
}

/**
 * Floating damage numbers, projected onto the view above the bar. `arc`
 * lofts them on a curve and lets them drift sideways (Classic, compact);
 * without it they rise straight up (the floating layouts).
 */
export function drawDamageNumbers(ctx, s, w, h, barH, large, arc) {
  const fov = s.aimFov;
  for (const dn of s.damageNumbers) {
    const dx = dn.x - s.playerX;
    const dy = dn.y - s.playerY;
    let angle = Math.atan2(dy, dx) - s.playerAngle;
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    if (Math.abs(angle) > fov / 2) continue;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.1) continue;
    let screenX, screenY;
    if (arc) {
      const dnAge = 0.8 - dn.life;
      screenX = w / 2 + (angle / (fov / 2)) * (w / 2) + (dn.vx || 0) * dnAge;
      const rise = dnAge * 90 - dnAge * dnAge * 60;
      screenY = (h - barH) / 2 - rise;
    } else {
      screenX = w / 2 + (angle / (fov / 2)) * (w / 2);
      const rise = (0.8 - dn.life) * 60;
      screenY = h / 2 - rise;
    }
    const alpha = Math.min(1, dn.life / 0.3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    drawDamageNumber(ctx, dn, screenX, screenY, large);
    ctx.restore();
  }
}

/**
 * Boss name card overlay — appears on boss spawn for ~3.5s. Three-stage
 * animation: scan-in (alpha+stretch), hold (full opacity), scan-out.
 * Driven by game.bossNameCard `{title, subtitle, time, duration}`.
 * Draws a centered banner roughly 35% down the screen so it doesn't
 * stomp the boss silhouette in the middle of the viewport.
 *
 * It holds the message director's headline lane: it shows when the lane is
 * its turn (straight away unless a teach card is fresh), times itself from
 * then, and ARIA's line and any chips wait until it is gone.
 */
export function drawBossNameCard(ctx, game, w, h) {
  const card = game.bossNameCard;
  if (!card) return;
  const d = game.messages;
  let elapsed = game.time - card.time;
  if (d) {
    game.postBossIntro?.();
    const st = d.status(card._key);
    if (st === "queued") return;
    if (st !== "showing") {
      game.bossNameCard = null;
      return;
    }
    elapsed = d.age(card._key) * 1000;
  }
  if (elapsed >= card.duration) {
    game.bossNameCard = null;
    d?.done(card._key);
    return;
  }
  if (isModernArt()) {
    drawModernBossNameCard(ctx, card, elapsed, w, h);
    return;
  }
  const t = elapsed / card.duration; // 0..1
  // 0–0.18 scan-in, 0.18–0.78 hold, 0.78–1 scan-out
  let alpha = 1;
  let stretch = 1;
  if (t < 0.18) {
    alpha = t / 0.18;
    stretch = 0.4 + 0.6 * alpha;
  } else if (t > 0.78) {
    const k = (t - 0.78) / 0.22;
    alpha = 1 - k;
    stretch = 1 + k * 0.5;
  }
  const cy = h * 0.35;
  const cx = w / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  // Banner backdrop — wide red gradient bar
  const bw = Math.min(w * 0.7, 720) * stretch;
  const bh = 88;
  const grad = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
  grad.addColorStop(0, "rgba(60,0,0,0)");
  grad.addColorStop(0.5, "rgba(180,20,20,0.55)");
  grad.addColorStop(1, "rgba(60,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  // Glitch jitter on title — a few horizontal slices offset by a couple px
  const titleY = cy - 6;
  const jitter = (Math.sin(elapsed * 0.04) * 2) | 0;
  ctx.font = "bold 44px monospace";
  ctx.shadowColor = "#ff3a3a";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ffe4e4";
  ctx.fillText(card.title, cx + jitter, titleY);
  ctx.shadowBlur = 0;
  // Subtitle
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#ff8080";
  ctx.fillText(card.subtitle, cx, titleY + 28);
  // Top/bottom hairlines
  ctx.strokeStyle = `rgba(255,60,60,${alpha})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2, cy - bh / 2);
  ctx.lineTo(cx + bw / 2, cy - bh / 2);
  ctx.moveTo(cx - bw / 2, cy + bh / 2);
  ctx.lineTo(cx + bw / 2, cy + bh / 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * The level's power cells or lockdown (src/systems/exit-cells.js), under the
 * level timer on every HUD style: progress in amber while the exit is
 * sealed, then EXTRACTION LIVE. Nothing on an open level. It hangs under the
 * layout's top-left stack (hudAnchors), so it never prints over the clock.
 */
function drawPowerCellChip(ctx, s) {
  const pc = s.powerCells;
  const ld = !pc ? s.lockdown : null;
  if (!pc && !ld) return;
  const done = pc ? pc.found >= pc.total : ld.done;
  const label = done
    ? "EXTRACTION LIVE"
    : pc
      ? `POWER CELLS ${pc.found} / ${pc.total}`
      : `LOCKDOWN ${Math.min(ld.need, s.killedEnemies || 0)} / ${ld.need} DOWN`;
  const x = 12;
  const y = hudAnchors.stackBottom ? Math.round(hudAnchors.stackBottom) + 2 : 58;
  const modern = s.modern;
  const color = !modern ? (done ? "#22e6c0" : "#ffb028") : done ? (SKIN.realistic ? SKIN.accent : "#22e6c0") : SKIN.amber;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = modern ? skinFont(11, 700) : "700 12px system-ui, sans-serif";
  if (modern) ctx.letterSpacing = "1px";
  const tw = ctx.measureText(label).width;
  if (modern) {
    skinPanel(ctx, x, y, tw + 36, 22, { accent: color, chamfer: 6 });
  } else {
    ctx.fillStyle = "rgba(4,8,12,0.72)";
    ctx.fillRect(x, y, tw + 34, 22);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 3, 22);
  }
  ctx.fillStyle = color;
  // Diamond, as on the map.
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 5);
  ctx.lineTo(x + 20, y + 11);
  ctx.lineTo(x + 14, y + 17);
  ctx.lineTo(x + 8, y + 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillText(label, x + 26, y + 11.5);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

/**
 * The crosshair, faded out as the sights come up (the full crosshair over the
 * sights hid a small or distant target right where the player was aiming),
 * handing over to a small sight dot that stays while aimed: the gun alone
 * did not show exactly where the round would go. Spread brackets show the
 * weapon's cone at this blend; a scoped weapon hands over to its scope.
 */
function drawAimReticle(ctx, game, cx, cy, barH = 0) {
  const blend = getAimBlend();
  const show = 1 - blend;
  const wep = game.player.getWeaponDef?.();
  const w = game.hudW || ctx.canvas.width;
  const scoped = wep?.scope ? Math.max(0, Math.min(1, (blend - 0.35) / 0.45)) : 0;
  if (show > 0.02) {
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * show;
    drawCrosshair(ctx, cx, cy, game.settings.crosshair);
    ctx.globalAlpha = a;
  }
  // The cone in screen pixels, through the same (zoomed) view the world is drawn with.
  const fov = (effectiveAimFov(game.player, game.settings) * Math.PI) / 180;
  // Blind fire from cover sprays wider, and the brackets say so.
  const aim = game.player?.cover ? aimAnglesForGame(game) : null;
  const blind = !!aim && blindFireNow(game, aim.yaw, aim.pitch);
  const cone = (Math.tan(coverCone(game.player, currentSpread(wep), blind)) / Math.tan(fov / 2)) * (w / 2);
  drawSpreadBrackets(ctx, cx, cy, cone, 1 - scoped);
  drawAdsSight(ctx, cx, cy, Math.min(1, blend * 1.6) * (1 - scoped), (game.hudH || 900) / 900);
  if (scoped > 0) {
    const since = game.time - (game.player.lastFireTime || -1e9);
    drawScope(ctx, cx, cy, w, (game.hudH || ctx.canvas.height) - barH, scoped, {
      time: game.time,
      steady: scopeSteadiness(),
      kick: since >= 0 && since < 250 ? 1 - since / 250 : 0,
    });
  }
}

/**
 * The centre of the view: crosshair (or sights/scope), the reload bar under
 * it, the power-cell chip and the hit marker, in that order.
 */
export function drawReticleStack(ctx, game, s, w, h, barH) {
  const { x: chx, y: chy } = reticlePoint(w, h, barH, game.player);
  drawAimReticle(ctx, game, chx, chy, barH);
  drawReloadHud(ctx, game, chx, chy);
  drawPowerCellChip(ctx, s);
  drawHitMarker(ctx, s, chx, chy);
}

/**
 * Square minimap for the layouts the legacy HUD places itself. Realistic: minimap.js
 * leaves the frame to the HUD skin, so sit it on a soft plate, clip to the
 * map square and add the same hairline bezel as the Vanguard slot.
 */
export function drawHudMinimap(ctx, x, y, s, state) {
  if (!isRealisticArt()) {
    drawMinimap(ctx, x, y, s, s, state);
    return;
  }
  skinPanel(ctx, x - 3, y - 3, s + 6, s + 6, {});
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();
  drawMinimap(ctx, x, y, s, s, state);
  ctx.restore();
  blitSprite(ctx, cachedSprite(ctx, `hud-mapframe:${s}`, s + 6, s + 6, 0, (g) => _paintMapFrame(g, s + 6)), x - 3, y - 3, s + 6, s + 6);
}

/** Hairline map bezel that fades mid-side, with accent corner ticks. */
function _paintMapFrame(g, S) {
  const edge = (x0, y0, x1, y1) => {
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, "rgba(220,228,226,0.42)");
    grad.addColorStop(0.5, "rgba(220,228,226,0.1)");
    grad.addColorStop(1, "rgba(220,228,226,0.42)");
    return grad;
  };
  g.fillStyle = edge(0, 0, S, 0);
  g.fillRect(0, 0, S, 1);
  g.fillRect(0, S - 1, S, 1);
  g.fillStyle = edge(0, 0, 0, S);
  g.fillRect(0, 0, 1, S);
  g.fillRect(S - 1, 0, 1, S);
  g.fillStyle = SKIN.accent;
  const t = Math.max(6, Math.round(S * 0.08));
  g.fillRect(0, 0, t, 1);
  g.fillRect(0, 0, 1, t);
  g.fillRect(S - t, S - 1, t, 1);
  g.fillRect(S - 1, S - t, 1, t);
}

/** A compact phone's minimap (smaller), where the touch layout put it, so pause sits against its left edge. */
export function drawPhoneMinimap(ctx, w, h, s) {
  const mr = s.touchMinimapZone;
  if (mr) drawHudMinimap(ctx, mr.x, mr.y, mr.s, s.minimap);
  else {
    const mmSize = phoneMinimapSize(s.minimapSize, w, h);
    drawHudMinimap(ctx, w - mmSize - 10, 10, mmSize, s.minimap);
  }
}

/**
 * Arena "STAGE CLEARED!" banner, centred in the view above the bar. `large`
 * is the desktop size; the compact phone bar draws it smaller.
 */
export function drawStageCleared(ctx, game, s, w, h, barH, large) {
  if (s.mode !== "arena" || s.arenaClearTimer == null) return;
  const midY = (h - barH) / 2;
  if (s.modern) {
    drawModernStageCleared(game, ctx, w, midY, large);
    return;
  }
  const countSecs = Math.ceil(s.arenaClearTimer);
  const pulse = 0.7 + Math.sin(s.time * 0.005) * 0.3;
  ctx.fillStyle = `rgba(0,10,5,${0.5 * pulse})`;
  ctx.fillRect(0, midY - (large ? 60 : 36), w, large ? 120 : 72);
  ctx.fillStyle = `rgba(0,255,100,${pulse})`;
  ctx.font = large ? "bold 48px monospace" : "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText("STAGE CLEARED!", w / 2, midY - (large ? 8 : 6));
  ctx.fillStyle = "rgba(200,230,255,0.8)";
  ctx.font = large ? "bold 22px monospace" : "bold 14px monospace";
  ctx.fillText(`Next round in ${countSecs}s...`, w / 2, midY + (large ? 30 : 18));
  ctx.textAlign = "left";
}

/** Slow-mo vignette over the view above the bar. */
export function drawSlowMoVignette(ctx, s, w, h, barH) {
  if (!(s.slowMoTimer > 0)) return;
  const smAlpha = Math.min(0.35, (s.slowMoTimer / 1.5) * 0.35);
  ctx.fillStyle = `rgba(0,20,60,${smAlpha * 0.4})`;
  ctx.fillRect(0, 0, w, h - barH);
  const gradient = ctx.createRadialGradient(w / 2, (h - barH) / 2, w * 0.25, w / 2, (h - barH) / 2, w * 0.7);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${smAlpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h - barH);
}

/** FPS counter, bottom-left above the bar. */
export function drawFpsCounter(ctx, s, h, barH) {
  if (!s.showFPS) return;
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`FPS: ${s.fps}`, 10, h - barH - 8);
}
