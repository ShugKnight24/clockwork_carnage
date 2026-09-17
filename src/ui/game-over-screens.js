import { renderStatsCard, statsCardHeight } from './stats-card.js';
import { drawScanlines } from './scanlines.js';
import { isCompactPhone } from '../../js/layout.js';
import { isModernArt } from '../rendering/art-style.js';
import {
  UI, uiFont, drawBackdrop, drawPanel, drawTitle, drawCaption, drawButton,
} from './modern-ui-kit.js';

/**
 * Share-toast overlay — renders and mutates toast.life in place.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {{ text: string, life: number } | null} toast
 * @param {number} deltaTime  in seconds
 * @returns {{ expired: boolean }} true when toast should be nulled
 */
export function renderShareToast(ctx, w, h, toast, deltaTime) {
  if (!toast) return { expired: false };
  toast.life -= deltaTime;
  if (toast.life <= 0) return { expired: true };
  const alpha = Math.min(1, toast.life * 2);
  if (isModernArt()) {
    const tw = Math.min(420, w * 0.8), th = 34;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawPanel(ctx, w / 2 - tw / 2, h * 0.07, tw, th, { variant: 'menu', accent: UI.cyan, chamfer: 9 });
    ctx.fillStyle = '#bff4ff';
    ctx.font = uiFont(13, 700);
    ctx.textAlign = 'center';
    ctx.fillText(toast.text, w / 2, h * 0.07 + 22);
    ctx.restore();
    return { expired: false };
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,20,40,0.9)';
  ctx.strokeStyle = 'rgba(0,200,255,0.6)';
  ctx.lineWidth = 1;
  const tw = Math.min(420, w * 0.8), th = 32;
  const tx = w / 2 - tw / 2, ty = h * 0.07;
  ctx.beginPath();
  ctx.roundRect(tx, ty, tw, th, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#00ccff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(toast.text, w / 2, ty + 20);
  ctx.restore();
  return { expired: false };
}

// ── renderGameOver ──────────────────────────────────────────────────
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {object} state
 * @returns {{ gameOverBtns: object }} layout for click handler
 */
export function renderGameOver(ctx, w, h, state) {
  const {
    time, isTouchDevice, mode, arenaRound, achievementStats,
    meltdown, deltaTime, shareToast, statsCardData,
  } = state;

  const compact = isTouchDevice && isCompactPhone(h);
  if (isModernArt()) return renderGameOverModern(ctx, w, h, state, compact);

  // Animated red-tinged background
  ctx.fillStyle = 'rgba(30,0,0,0.94)';
  ctx.fillRect(0, 0, w, h);
  // Pulsing red vignette
  const pulse = 0.5 + Math.sin(time * 0.003) * 0.2;
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.7);
  vig.addColorStop(0, 'rgba(80,0,0,0)');
  vig.addColorStop(0.5, `rgba(60,0,0,${pulse * 0.15})`);
  vig.addColorStop(1, `rgba(40,0,0,${0.4 + pulse * 0.15})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // Floating static debris
  ctx.fillStyle = 'rgba(255,30,0,0.06)';
  for (let i = 0; i < 12; i++) {
    const sx = w * (0.1 + (Math.sin(time * 0.0005 + i * 1.7) + 1) * 0.4);
    const sy = h * (0.05 + (Math.cos(time * 0.0007 + i * 2.3) + 1) * 0.45);
    const sz = 20 + Math.sin(i * 3) * 15;
    ctx.fillRect(sx - sz / 2, sy - 1, sz, 2);
  }

  const titleSize = compact ? 24 : 42;
  const titleY = compact ? h * 0.15 : h / 2 - 110;
  const subY = compact ? titleY + 22 : h / 2 - 75;
  const statsY = compact ? titleY + 36 : h / 2 - 50;

  // Horizontal divider lines
  if (!compact) {
    const divY1 = h / 2 - 135, divY2 = h / 2 - 40;
    ctx.strokeStyle = 'rgba(255,34,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, divY1); ctx.lineTo(w * 0.8, divY1);
    ctx.moveTo(w * 0.25, divY2); ctx.lineTo(w * 0.75, divY2);
    ctx.stroke();
  }
  // Title with glow
  ctx.shadowColor = '#ff2200';
  ctx.shadowBlur = compact ? 10 : 20;
  ctx.fillStyle = '#ff2200';
  ctx.font = `bold ${titleSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('TIMELINE COLLAPSED', w / 2, titleY);
  ctx.shadowBlur = 0;
  // Subtitle
  ctx.fillStyle = 'rgba(255,100,70,0.7)';
  ctx.font = `${compact ? 11 : 14}px monospace`;
  ctx.fillText('Temporal integrity failed — reality unraveled', w / 2, subY);

  renderStatsCard(ctx, w, statsY, '#ff2200', '#ff6644', undefined, statsCardData);

  // Flow mode-specific lines beneath the card's own SCORE footer. The old
  // fixed h/2+100 was exactly where renderStatsCard draws SCORE, so
  // "Rounds Survived" and "SCORE" were printed on top of each other.
  const cardBottom = statsY + statsCardHeight(statsCardData);

  if (mode === 'arena') {
    ctx.fillStyle = '#ff8866';
    ctx.font = `bold ${compact ? 14 : 18}px monospace`;
    ctx.fillText(`Rounds Survived: ${arenaRound - 1}`, w / 2, cardBottom + (compact ? 20 : 28));
    ctx.fillStyle = 'rgba(255,136,102,0.6)';
    ctx.font = `${compact ? 10 : 12}px monospace`;
    ctx.fillText(
      `Personal Best: Round ${achievementStats.highestArenaRound} (Score: ${achievementStats.highestScore})`,
      w / 2, cardBottom + (compact ? 36 : 50),
    );
  }

  // ── Bottom action buttons: RESTART | QUIT | SHARE ──
  const btnW = 110, btnH = 34, btnGap = 12;
  const totalBtnW = btnW * 3 + btnGap * 2;
  const btnBaseX = w / 2 - totalBtnW / 2;
  const btnY = h - 70;
  const gameOverBtns = { btnBaseX, btnY, btnW, btnH, btnGap };

  const btnDefs = [
    { label: 'RESTART', color: '#ff8844', bg: 'rgba(255,136,68,0.15)' },
    { label: 'QUIT', color: '#aaaaaa', bg: 'rgba(170,170,170,0.1)' },
    { label: 'SHARE', color: '#00ccff', bg: 'rgba(0,204,255,0.12)' },
  ];
  for (let i = 0; i < btnDefs.length; i++) {
    const bx = btnBaseX + i * (btnW + btnGap);
    ctx.fillStyle = btnDefs[i].bg;
    ctx.fillRect(bx, btnY, btnW, btnH);
    ctx.strokeStyle = btnDefs[i].color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, btnY, btnW, btnH);
    ctx.fillStyle = btnDefs[i].color;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(btnDefs[i].label, bx + btnW / 2, btnY + 22);
  }

  if (mode === 'meltdown' && meltdown) {
    const mHud = meltdown.getHUD();
    const mY = compact ? cardBottom + 18 : cardBottom + 26;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffaa00';
    ctx.font = `bold ${compact ? 16 : 22}px monospace`;
    ctx.fillText(`DISTANCE: ${mHud.distance}m`, w / 2, mY);
    ctx.fillStyle = '#ff8866';
    ctx.font = `bold ${compact ? 12 : 16}px monospace`;
    ctx.fillText(`SCORE: ${mHud.score}`, w / 2, mY + 25);
    ctx.fillStyle = 'rgba(200,200,200,0.6)';
    ctx.font = `${compact ? 10 : 12}px monospace`;
    ctx.fillText(`Time: ${mHud.time}s | Speed: ${mHud.speed} m/s`, w / 2, mY + 45);

    // High scores — top 5, with new-run highlight, NEW RECORD badge, ironman tag.
    if (meltdown.highScores.length > 0) {
      const rowGap = compact ? 13 : 16;
      const headerY = mY + (compact ? 62 : 70);

      // NEW RECORD badge (pulsing, above header)
      if (meltdown._lastRunWasNewRecord) {
        const recPulse = 0.7 + Math.sin(time * 0.01) * 0.3;
        ctx.fillStyle = `rgba(255,220,60,${recPulse})`;
        ctx.font = `bold ${compact ? 11 : 14}px monospace`;
        ctx.fillText('★ NEW RECORD ★', w / 2, headerY - rowGap);
      }

      ctx.fillStyle = '#00ccff';
      ctx.font = `bold ${compact ? 10 : 12}px monospace`;
      ctx.fillText('── HIGH SCORES ──', w / 2, headerY);

      const rows = meltdown.highScores.slice(0, 5);
      ctx.font = `${compact ? 9 : 11}px monospace`;
      rows.forEach((hs, i) => {
        const isMine = meltdown._lastRunId && hs._runId === meltdown._lastRunId;
        const rowY = headerY + 18 + i * rowGap;
        // Background strip for the player's row
        if (isMine) {
          ctx.fillStyle = 'rgba(255,200,80,0.15)';
          ctx.fillRect(w / 2 - (compact ? 140 : 180), rowY - 10, compact ? 280 : 360, rowGap);
        }
        ctx.fillStyle = isMine
          ? 'rgba(255,220,120,1)'
          : 'rgba(200,220,255,0.7)';
        const scoreStr = hs.score.toLocaleString();
        const distStr = hs.distance.toLocaleString();
        const tag = hs.ironman ? ' ⚙' : '';
        const marker = isMine ? ' ◀' : '';
        ctx.fillText(
          `${i + 1}. ${scoreStr} pts (${distStr}m)${tag}${marker}`,
          w / 2,
          rowY,
        );
      });
    }
  }
  // ── Key hint ─────────────────────────────────────────────────────────────
  // Anchored just above the button row rather than at a fixed h/2 offset. The
  // old fixed offsets (h/2+130/155/175) landed inside the arena "Personal
  // Best" line and straight through the meltdown high-score table.
  // Collapsed to one line because RESTART/QUIT/SHARE buttons sit right below
  // and already carry the same three actions.
  const promptA = 0.4 + Math.sin(time * 0.004) * 0.3;
  ctx.textAlign = 'center';
  ctx.font = `${compact ? 10 : 12}px monospace`;
  ctx.fillStyle = `rgba(170,170,170,${promptA})`;
  ctx.fillText(
    isTouchDevice
      ? 'Tap to return to title'
      : 'ENTER  return to title   ·   R  restart   ·   S  share score',
    w / 2,
    btnY - 16,
  );
  ctx.textAlign = 'left';

  const toastResult = renderShareToast(ctx, w, h, shareToast, deltaTime);
  drawScanlines(ctx, w, h, true);

  return { gameOverBtns, toastExpired: toastResult.expired };
}

// ── renderVictory ───────────────────────────────────────────────────
export function renderVictory(ctx, w, h, state) {
  const {
    time, isTouchDevice, ngPlusCycle, mode,
    ngPlusPrompt, ngPlusPromptSel, deltaTime, shareToast, statsCardData,
  } = state;

  const compact = isTouchDevice && isCompactPhone(h);
  if (isModernArt()) return renderVictoryModern(ctx, w, h, state, compact);
  ctx.fillStyle = 'rgba(0,6,20,0.95)';
  ctx.fillRect(0, 0, w, h);
  // Animated aurora glow
  const pulse = 0.7 + Math.sin(time * 0.003) * 0.3;
  const auroraGrad = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, h * 0.6);
  auroraGrad.addColorStop(0, `rgba(0,255,200,${pulse * 0.08})`);
  auroraGrad.addColorStop(0.4, `rgba(0,180,255,${pulse * 0.04})`);
  auroraGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = auroraGrad;
  ctx.fillRect(0, 0, w, h);
  // Rising particle streaks
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < (compact ? 10 : 20); i++) {
    const px = w * (0.1 + (i / 20) * 0.8);
    const py = h - ((time * 0.04 + i * 73) % h);
    const pLen = 8 + Math.sin(i * 2) * 5;
    ctx.fillStyle = i % 3 === 0 ? '#00ffcc' : i % 3 === 1 ? '#ffcc00' : '#aaddff';
    ctx.fillRect(px, py, 1.5, pLen);
  }
  ctx.globalAlpha = 1;

  const titleSize = compact ? 24 : 42;
  const titleY = compact ? h * 0.12 : h / 2 - 75;

  if (!compact) {
    ctx.strokeStyle = 'rgba(0,255,200,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h / 2 - 100);
    ctx.lineTo(w * 0.85, h / 2 - 100);
    ctx.stroke();
  }
  // Title with teal glow
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = compact ? 12 : 25;
  ctx.fillStyle = ngPlusCycle >= 3 ? '#ffcc00' : '#00ffcc';
  ctx.font = `bold ${titleSize}px monospace`;
  ctx.textAlign = 'center';
  const victoryTitle = ngPlusCycle >= 3 ? 'THE LOOP IS BROKEN' : 'TIMELINE RESTORED';
  ctx.fillText(victoryTitle, w / 2, titleY);
  ctx.shadowBlur = 0;
  // Subtitles
  ctx.fillStyle = '#ffcc00';
  ctx.font = `bold ${compact ? 12 : 18}px monospace`;
  const victorySubtitle = ngPlusCycle >= 3
    ? 'Every timeline. Every loop. You broke them all.'
    : 'The Paradox Lord has been destroyed — for good.';
  ctx.fillText(victorySubtitle, w / 2, compact ? titleY + 22 : h / 2 - 35);
  if (!compact) {
    ctx.fillStyle = 'rgba(170,220,255,0.7)';
    ctx.font = '16px monospace';
    ctx.fillText('Three forms. Three acts. One team.', w / 2, h / 2 - 8);
    ctx.fillText('The quantum continuum is stable once more.', w / 2, h / 2 + 14);
    ctx.strokeStyle = 'rgba(255,204,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h / 2 + 28);
    ctx.lineTo(w * 0.75, h / 2 + 28);
    ctx.stroke();
  }

  // NG+ cycle indicator
  if (ngPlusCycle > 0) {
    ctx.fillStyle = '#cc88ff';
    ctx.font = `bold ${compact ? 10 : 14}px monospace`;
    ctx.textAlign = 'center';
    const cycleLabel = ngPlusCycle >= 3
      ? 'FINAL TIMELINE — THE LOOP IS BROKEN'
      : `TIMELINE LOOP ${ngPlusCycle}`;
    ctx.fillText(cycleLabel, w / 2, compact ? titleY - 10 : titleY - 20);
  }

  const vCardY = compact ? titleY + 38 : h / 2 + 40;
  renderStatsCard(ctx, w, vCardY, '#ffcc00', '#aaddff', undefined, statsCardData);
  const vCardBottom = vCardY + statsCardHeight(statsCardData);

  const promptA = 0.4 + Math.sin(time * 0.004) * 0.3;

  // NG+ prompt
  if (ngPlusPrompt && mode === 'campaign') {
    // Was h/2+170, which put the option boxes over the card's SCORE footer.
    const promptY = vCardBottom + (compact ? 14 : 20);
    const nextCycle = ngPlusCycle + 1;
    const opts = [
      { label: `ENTER THE RIFT (NG+${nextCycle})`, desc: 'Enemies grow stronger. You keep everything.', color: '#cc88ff' },
      { label: 'REST', desc: 'The timeline is safe. Return to title.', color: '#aaddff' },
    ];
    const optW = compact ? 140 : 220;
    const optH = compact ? 44 : 56;
    const gap = compact ? 12 : 20;
    const totalW = opts.length * optW + (opts.length - 1) * gap;
    const startX = w / 2 - totalW / 2;

    for (let i = 0; i < opts.length; i++) {
      const ox = startX + i * (optW + gap);
      const oy = promptY;
      const sel = ngPlusPromptSel === i;
      ctx.fillStyle = sel ? 'rgba(100,60,180,0.35)' : 'rgba(30,30,50,0.5)';
      ctx.strokeStyle = sel ? opts[i].color : 'rgba(100,100,140,0.3)';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(ox, oy, optW, optH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = sel ? opts[i].color : 'rgba(170,170,190,0.8)';
      ctx.font = `bold ${compact ? 10 : 13}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(opts[i].label, ox + optW / 2, oy + (compact ? 16 : 22));
      ctx.fillStyle = sel ? 'rgba(200,200,220,0.7)' : 'rgba(140,140,160,0.5)';
      ctx.font = `${compact ? 8 : 10}px monospace`;
      ctx.fillText(opts[i].desc, ox + optW / 2, oy + (compact ? 32 : 40));
    }

    ctx.fillStyle = `rgba(170,170,170,${promptA})`;
    ctx.font = `${compact ? 10 : 12}px monospace`;
    ctx.textAlign = 'center';
    const ngPromptText = isTouchDevice ? 'Tap a choice' : 'Arrow keys to choose, ENTER to confirm';
    ctx.fillText(ngPromptText, w / 2, promptY + optH + (compact ? 14 : 22));
  } else {
    ctx.fillStyle = `rgba(170,170,170,${promptA})`;
    ctx.font = `${compact ? 12 : 14}px monospace`;
    ctx.textAlign = 'center';
    const victoryPrompt = isTouchDevice ? 'Tap to return to title' : 'Press ENTER to return to title';
    ctx.fillText(victoryPrompt, w / 2, vCardBottom + (compact ? 20 : 25));
    if (!isTouchDevice) {
      ctx.fillStyle = `rgba(0,200,255,${promptA * 0.7})`;
      ctx.font = `${compact ? 11 : 13}px monospace`;
      ctx.fillText('Press S to share score', w / 2, vCardBottom + (compact ? 38 : 45));
    }
  }
  ctx.textAlign = 'left';

  const toastResult = renderShareToast(ctx, w, h, shareToast, deltaTime);
  drawScanlines(ctx, w, h);

  return { toastExpired: toastResult.expired };
}

// ── renderLevelComplete ─────────────────────────────────────────────
export function renderLevelComplete(ctx, w, h, state) {
  const {
    time, isTouchDevice, levelCompleteTime,
    playerSecretsFound, statsCardData,
  } = state;

  const compact = isTouchDevice && isCompactPhone(h);
  const t = Math.max(0, (performance.now() - (levelCompleteTime || 0)) / 1000);
  if (isModernArt()) {
    renderLevelCompleteModern(ctx, w, h, state, compact, t);
    return;
  }

  ctx.fillStyle = 'rgba(0,4,18,0.94)';
  ctx.fillRect(0, 0, w, h);

  // Subtle cyan glow
  const pulse = 0.6 + Math.sin(time * 0.004) * 0.3;
  const glow = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, h * 0.5);
  glow.addColorStop(0, `rgba(0,255,200,${pulse * 0.06})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Celebration particle streaks
  ctx.globalAlpha = Math.min(0.2, t * 0.15);
  for (let i = 0; i < (compact ? 12 : 24); i++) {
    const px = w * (0.05 + (i / 24) * 0.9);
    const py = h - ((time * 0.05 + i * 61) % h);
    const pLen = 6 + Math.sin(i * 3) * 4;
    ctx.fillStyle = i % 3 === 0 ? '#00ffcc' : i % 3 === 1 ? '#00aaff' : '#aaffdd';
    ctx.fillRect(px, py, 1.5, pLen);
  }
  ctx.globalAlpha = 1;

  // Entrance animation helpers
  const ease = v => v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v);
  const titleT = ease(t / 0.4);
  const statsT = ease((t - 0.3) / 0.4);
  const secretsT = ease((t - 0.6) / 0.3);
  const promptT = ease((t - 1.0) / 0.3);
  const countUp = Math.min(1, (t - 0.3) / 0.8);

  const titleY = compact ? h * 0.12 : h / 2 - 100;
  const titleOffset = (1 - titleT) * -30;

  if (!compact && titleT > 0) {
    ctx.globalAlpha = titleT;
    ctx.strokeStyle = 'rgba(0,255,200,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h / 2 - 130 + titleOffset);
    ctx.lineTo(w * 0.8, h / 2 - 130 + titleOffset);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Title — slides down
  if (titleT > 0) {
    ctx.globalAlpha = titleT;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = compact ? 8 : 15;
    ctx.fillStyle = '#00ffcc';
    ctx.font = `bold ${compact ? 22 : 36}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL COMPLETE', w / 2, titleY + titleOffset);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  if (!compact && titleT > 0) {
    ctx.globalAlpha = titleT;
    ctx.strokeStyle = 'rgba(0,255,200,0.15)';
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h / 2 - 75 + titleOffset);
    ctx.lineTo(w * 0.75, h / 2 - 75 + titleOffset);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Stats card — fades in with count-up
  const lcCardY = compact ? titleY + 18 : h / 2 - 55;
  const lcCardBottom = lcCardY + statsCardHeight(statsCardData);
  if (statsT > 0) {
    ctx.globalAlpha = statsT;
    renderStatsCard(
      ctx, w, lcCardY,
      '#00ffcc', '#aaddff', countUp, statsCardData,
    );
    ctx.globalAlpha = 1;
  }

  // Secrets — fades in
  if (secretsT > 0) {
    ctx.globalAlpha = secretsT;
    ctx.fillStyle = '#aaddff';
    ctx.font = `${compact ? 12 : 16}px monospace`;
    ctx.textAlign = 'center';
    const secretVal = Math.round((playerSecretsFound || 0) * Math.min(1, countUp));
    ctx.fillText(`Secrets: ${secretVal}`, w / 2, lcCardBottom + (compact ? 18 : 24));
    ctx.globalAlpha = 1;
  }

  // Continue prompt — fades in last
  if (promptT > 0) {
    const promptA = promptT * (0.4 + Math.sin(time * 0.004) * 0.3);
    ctx.fillStyle = `rgba(170,170,170,${promptA})`;
    ctx.font = `${compact ? 12 : 14}px monospace`;
    ctx.textAlign = 'center';
    const lcPrompt = isTouchDevice ? 'Tap to continue' : 'Press ENTER to continue';
    ctx.fillText(lcPrompt, w / 2, lcCardBottom + (compact ? 40 : 52));
  }
  ctx.textAlign = 'left';

  drawScanlines(ctx, w, h);
}

// ── renderBuilderOnboarding ─────────────────────────────────────────
export function renderBuilderOnboarding(ctx, w, h, state) {
  const { time, isTouchDevice } = state;

  const pulse = 0.85 + Math.sin(time * 0.004) * 0.1;
  ctx.fillStyle = `rgba(0,0,0,${0.72 * pulse})`;
  ctx.fillRect(0, 0, w, h);

  const bw = Math.min(520, w * 0.88), bh = 280;
  const bx = w / 2 - bw / 2, by = h / 2 - bh / 2;

  ctx.fillStyle = 'rgba(0,10,20,0.96)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,200,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00ccff';
  ctx.shadowColor = '#00ccff';
  ctx.shadowBlur = 10;
  ctx.font = 'bold 18px monospace';
  ctx.fillText('MAP BUILDER', w / 2, by + 36);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(0,200,255,0.3)';
  ctx.fillRect(bx + 20, by + 46, bw - 40, 1);

  const lines = [
    { key: 'WASD / Arrow Keys', action: 'Move camera' },
    { key: 'Left Click', action: 'Place tile' },
    { key: 'Right Click', action: 'Erase tile' },
    { key: '1 – 9', action: 'Select tile type' },
    { key: 'E', action: 'Place / move player start' },
    { key: 'P', action: 'Play-test your map' },
    { key: 'Ctrl+S', action: 'Save map' },
    { key: 'Ctrl+Shift+S', action: 'Share map URL' },
  ];
  ctx.font = '12px monospace';
  const lineH = 24;
  const startY = by + 68;
  lines.forEach((l, i) => {
    const y = startY + i * lineH;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ccff';
    ctx.fillText(l.key, w / 2 - 12, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#aabbcc';
    ctx.fillText(l.action, w / 2 + 12, y);
  });

  const promptA = 0.5 + Math.sin(time * 0.006) * 0.4;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(170,170,170,${promptA})`;
  ctx.font = '12px monospace';
  ctx.fillText(
    isTouchDevice ? 'Tap anywhere to start' : 'Press any key to start',
    w / 2, by + bh - 18,
  );
}

// ─── Modern art style ───────────────────────────────────────────────────────
// Same anchors as the legacy screens (gameOverBtns and the NG+ option boxes
// are hit-tested), redrawn as inked titles, caption plates and steel panels.

function hint(ctx, text, x, y, size, alpha) {
  ctx.font = uiFont(size, 600);
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  ctx.fillStyle = `rgba(185,200,214,${alpha.toFixed(3)})`;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

function renderGameOverModern(ctx, w, h, state, compact) {
  const {
    time, isTouchDevice, mode, arenaRound, achievementStats,
    meltdown, deltaTime, shareToast, statsCardData,
  } = state;

  drawBackdrop(ctx, w, h, 'crimson', 0.97);
  // Slow crimson pulse on the letterbox rules.
  const pulse = 0.5 + Math.sin(time * 0.003) * 0.3;
  ctx.fillStyle = `rgba(255,42,74,${(0.25 + pulse * 0.25).toFixed(3)})`;
  ctx.fillRect(0, 3, w, 1);
  ctx.fillRect(0, h - 4, w, 1);

  const titleY = compact ? h * 0.15 : h / 2 - 110;
  const subY = compact ? titleY + 22 : h / 2 - 75;
  const statsY = compact ? titleY + 36 : h / 2 - 50;

  drawTitle(ctx, 'Timeline collapsed', w / 2, titleY, compact ? 26 : 50, UI.crimson, { fillTop: '#fff3f4', fillBottom: '#ff9aa8' });
  if (!compact) {
    drawCaption(ctx, w / 2, subY - 16, 'Temporal integrity failed — reality unraveled', { size: 12, align: 'center' });
  }

  renderStatsCard(ctx, w, statsY, UI.crimson, '#ff9aa8', undefined, statsCardData);
  const cardBottom = statsY + statsCardHeight(statsCardData);

  if (mode === 'arena') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd0d6';
    ctx.font = uiFont(compact ? 15 : 20, 800);
    ctx.fillText(`ROUNDS SURVIVED: ${arenaRound - 1}`, w / 2, cardBottom + (compact ? 20 : 30));
    ctx.fillStyle = '#b98a92';
    ctx.font = uiFont(compact ? 10 : 13, 600);
    ctx.fillText(
      `Personal best: round ${achievementStats.highestArenaRound} (score ${achievementStats.highestScore})`,
      w / 2, cardBottom + (compact ? 36 : 52),
    );
  }

  const btnW = 110, btnH = 34, btnGap = 12;
  const totalBtnW = btnW * 3 + btnGap * 2;
  const btnBaseX = w / 2 - totalBtnW / 2;
  const btnY = h - 70;
  const gameOverBtns = { btnBaseX, btnY, btnW, btnH, btnGap };
  const btnDefs = [
    { label: 'Restart', color: UI.amber, focus: true },
    { label: 'Quit', color: UI.textDim },
    { label: 'Share', color: UI.cyan },
  ];
  for (let i = 0; i < btnDefs.length; i++) {
    const d = btnDefs[i];
    drawButton(ctx, btnBaseX + i * (btnW + btnGap), btnY, btnW, btnH, d.label, 'idle', d.color, {
      idleAccent: d.color, idleColor: d.color, size: 14,
    });
  }

  if (mode === 'meltdown' && meltdown) {
    const mHud = meltdown.getHUD();
    const mY = compact ? cardBottom + 18 : cardBottom + 26;
    ctx.textAlign = 'center';
    ctx.fillStyle = UI.amber;
    ctx.font = uiFont(compact ? 17 : 24, 800);
    ctx.fillText(`DISTANCE ${mHud.distance}m`, w / 2, mY);
    ctx.fillStyle = '#ffd0d6';
    ctx.font = uiFont(compact ? 12 : 16, 700);
    ctx.fillText(`SCORE ${mHud.score}`, w / 2, mY + 25);
    ctx.fillStyle = UI.textDim;
    ctx.font = uiFont(compact ? 10 : 12, 600);
    ctx.fillText(`Time ${mHud.time}s  ·  Speed ${mHud.speed} m/s`, w / 2, mY + 45);

    if (meltdown.highScores.length > 0) {
      const rowGap = compact ? 13 : 17;
      const headerY = mY + (compact ? 62 : 70);
      if (meltdown._lastRunWasNewRecord) {
        const recPulse = 0.7 + Math.sin(time * 0.01) * 0.3;
        ctx.globalAlpha = recPulse;
        drawCaption(ctx, w / 2, headerY - rowGap - 14, 'New record', { size: compact ? 10 : 12, scheme: 'amber', align: 'center' });
        ctx.globalAlpha = 1;
      }
      ctx.font = uiFont(compact ? 10 : 12, 800);
      ctx.letterSpacing = '2px';
      ctx.fillStyle = UI.cyan;
      ctx.textAlign = 'center';
      ctx.fillText('HIGH SCORES', w / 2, headerY);
      ctx.letterSpacing = '0px';
      ctx.font = uiFont(compact ? 10 : 12, 600, true);
      meltdown.highScores.slice(0, 5).forEach((hs, i) => {
        const isMine = meltdown._lastRunId && hs._runId === meltdown._lastRunId;
        const rowY = headerY + 18 + i * rowGap;
        if (isMine) {
          ctx.fillStyle = 'rgba(255,174,58,0.16)';
          ctx.fillRect(w / 2 - (compact ? 140 : 180), rowY - 11, compact ? 280 : 360, rowGap);
        }
        ctx.fillStyle = isMine ? '#ffdca0' : '#c3d1de';
        const tag = hs.ironman ? ' ⚙' : '';
        const marker = isMine ? ' ◀' : '';
        ctx.fillText(`${i + 1}. ${hs.score.toLocaleString()} pts (${hs.distance.toLocaleString()}m)${tag}${marker}`, w / 2, rowY);
      });
    }
  }

  const promptA = 0.55 + Math.sin(time * 0.004) * 0.3;
  hint(ctx, isTouchDevice ? 'Tap to return to title' : 'Enter  return to title   ·   R  restart   ·   S  share score',
    w / 2, btnY - 16, compact ? 10 : 12, promptA);
  ctx.textAlign = 'left';

  const toastResult = renderShareToast(ctx, w, h, shareToast, deltaTime);
  return { gameOverBtns, toastExpired: toastResult.expired };
}

function renderVictoryModern(ctx, w, h, state, compact) {
  const {
    time, isTouchDevice, ngPlusCycle, mode,
    ngPlusPrompt, ngPlusPromptSel, deltaTime, shareToast, statsCardData,
  } = state;
  const final = ngPlusCycle >= 3;
  drawBackdrop(ctx, w, h, 'gold', 0.97);

  // Rising embers, cheap rects.
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < (compact ? 10 : 20); i++) {
    const px = w * (0.1 + (i / 20) * 0.8);
    const py = h - ((time * 0.04 + i * 73) % h);
    ctx.fillStyle = i % 3 === 0 ? UI.cyan : i % 3 === 1 ? UI.gold : '#dfe9f3';
    ctx.fillRect(px, py, 1.5, 8 + Math.sin(i * 2) * 5);
  }
  ctx.globalAlpha = 1;

  const titleY = compact ? h * 0.12 : h / 2 - 75;
  if (ngPlusCycle > 0) {
    drawCaption(ctx, w / 2, (compact ? titleY - 10 : titleY - 20) - (compact ? 22 : 44),
      final ? 'Final timeline — the loop is broken' : `Timeline loop ${ngPlusCycle}`,
      { size: compact ? 9 : 12, scheme: 'violet', align: 'center' });
  }
  drawTitle(ctx, final ? 'The loop is broken' : 'Timeline restored', w / 2, titleY, compact ? 26 : 50,
    final ? UI.gold : UI.cyan, final ? { fillTop: '#fffaf0', fillBottom: '#ffd27a' } : {});
  const subtitle = final
    ? 'Every timeline. Every loop. You broke them all.'
    : 'The Paradox Lord has been destroyed — for good.';
  drawCaption(ctx, w / 2, (compact ? titleY + 22 : h / 2 - 35) - (compact ? 12 : 17), subtitle, { size: compact ? 10 : 13, align: 'center' });
  if (!compact) {
    ctx.textAlign = 'center';
    ctx.font = uiFont(16, 500);
    ctx.fillStyle = '#b9cfe0';
    ctx.fillText('Three forms. Three acts. One team.', w / 2, h / 2 + 2);
    ctx.fillText('The quantum continuum is stable once more.', w / 2, h / 2 + 24);
  }

  const vCardY = compact ? titleY + 38 : h / 2 + 40;
  renderStatsCard(ctx, w, vCardY, UI.gold, '#dfe9f3', undefined, statsCardData);
  const vCardBottom = vCardY + statsCardHeight(statsCardData);
  const promptA = 0.55 + Math.sin(time * 0.004) * 0.3;

  if (ngPlusPrompt && mode === 'campaign') {
    const promptY = vCardBottom + (compact ? 14 : 20);
    const opts = [
      { label: `Enter the rift (NG+${ngPlusCycle + 1})`, desc: 'Enemies grow stronger. You keep everything.', color: UI.violet },
      { label: 'Rest', desc: 'The timeline is safe. Return to title.', color: UI.cyan },
    ];
    const optW = compact ? 140 : 220;
    const optH = compact ? 44 : 56;
    const gap = compact ? 12 : 20;
    const startX = w / 2 - (opts.length * optW + (opts.length - 1) * gap) / 2;
    for (let i = 0; i < opts.length; i++) {
      const ox = startX + i * (optW + gap);
      const sel = ngPlusPromptSel === i;
      drawPanel(ctx, ox, promptY, optW, optH, {
        variant: sel ? 'raised' : 'menu', accent: sel ? opts[i].color : null, bar: sel, glow: sel, chamfer: 10,
      });
      ctx.textAlign = 'center';
      ctx.font = uiFont(compact ? 11 : 14, 800);
      ctx.fillStyle = sel ? '#ffffff' : UI.textDim;
      ctx.fillText(opts[i].label.toUpperCase(), ox + optW / 2, promptY + (compact ? 17 : 23));
      ctx.font = uiFont(compact ? 8 : 11, 500);
      ctx.fillStyle = sel ? '#c9d6e2' : UI.textFaint;
      ctx.fillText(opts[i].desc, ox + optW / 2, promptY + (compact ? 32 : 41));
    }
    hint(ctx, isTouchDevice ? 'Tap a choice' : 'Arrow keys to choose, Enter to confirm',
      w / 2, promptY + optH + (compact ? 14 : 22), compact ? 10 : 12, promptA);
  } else {
    hint(ctx, isTouchDevice ? 'Tap to return to title' : 'Press Enter to return to title',
      w / 2, vCardBottom + (compact ? 20 : 26), compact ? 11 : 13, promptA);
    if (!isTouchDevice) {
      ctx.globalAlpha = promptA;
      ctx.font = uiFont(compact ? 11 : 12, 700);
      ctx.fillStyle = UI.cyan;
      ctx.textAlign = 'center';
      ctx.fillText('S  SHARE SCORE', w / 2, vCardBottom + (compact ? 38 : 46));
      ctx.globalAlpha = 1;
    }
  }
  ctx.textAlign = 'left';
  const toastResult = renderShareToast(ctx, w, h, shareToast, deltaTime);
  return { toastExpired: toastResult.expired };
}

function renderLevelCompleteModern(ctx, w, h, state, compact, t) {
  const { time, isTouchDevice, playerSecretsFound, statsCardData } = state;
  drawBackdrop(ctx, w, h, 'cyan', 0.96);

  const ease = (v) => (v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v));
  const titleT = ease(t / 0.4);
  const statsT = ease((t - 0.3) / 0.4);
  const secretsT = ease((t - 0.6) / 0.3);
  const promptT = ease((t - 1.0) / 0.3);
  const countUp = Math.min(1, (t - 0.3) / 0.8);

  const titleY = compact ? h * 0.12 : h / 2 - 100;
  const titleOffset = (1 - titleT) * -30;
  if (titleT > 0) {
    ctx.globalAlpha = titleT;
    drawTitle(ctx, 'Level complete', w / 2, titleY + titleOffset, compact ? 24 : 44, UI.energy);
    ctx.globalAlpha = 1;
  }

  const lcCardY = compact ? titleY + 18 : h / 2 - 55;
  const lcCardBottom = lcCardY + statsCardHeight(statsCardData);
  if (statsT > 0) {
    ctx.globalAlpha = statsT;
    renderStatsCard(ctx, w, lcCardY, UI.energy, '#dfe9f3', countUp, statsCardData);
    ctx.globalAlpha = 1;
  }
  if (secretsT > 0) {
    ctx.globalAlpha = secretsT;
    const secretVal = Math.round((playerSecretsFound || 0) * Math.min(1, countUp));
    drawCaption(ctx, w / 2, lcCardBottom + (compact ? 6 : 10), `Secrets found: ${secretVal}`, { size: compact ? 10 : 12, scheme: 'steel', align: 'center' });
    ctx.globalAlpha = 1;
  }
  if (promptT > 0) {
    hint(ctx, isTouchDevice ? 'Tap to continue' : 'Press Enter to continue', w / 2, lcCardBottom + (compact ? 40 : 56),
      compact ? 11 : 13, promptT * (0.55 + Math.sin(time * 0.004) * 0.3));
  }
  ctx.textAlign = 'left';
}
