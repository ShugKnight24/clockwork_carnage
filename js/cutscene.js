import { CUTSCENE_SCRIPTS } from "./data.js";

export class CutsceneEngine {
  constructor({
    audio,
    getKeys,
    getTouchControls,
    isTouchDevice,
    getPlayerName,
    getSettings,
  }) {
    this.audio = audio;
    this.getKeys = getKeys;
    this.getTouchControls = getTouchControls;
    this.isTouchDevice = isTouchDevice;
    this.getPlayerName = getPlayerName || (() => "Agent");
    this.getSettings = getSettings || (() => ({ cutsceneAutoAdvance: false }));
    this.cutscene = null;
    // Lazy-loaded image cache for flipbook panels (panel.image: "url"). Images
    // are async — drawn only after .complete is true; until then the panel
    // falls back to the procedural panel.art beneath.
    this._imageCache = new Map();
  }

  _getImage(src) {
    let img = this._imageCache.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      this._imageCache.set(src, img);
    }
    return img;
  }

  get isActive() {
    return this.cutscene !== null;
  }

  hasScript(key) {
    const s = CUTSCENE_SCRIPTS[key];
    return s && s.length > 0;
  }

  start(scriptKey, onComplete) {
    const script = CUTSCENE_SCRIPTS[scriptKey];
    if (!script || script.length === 0) {
      if (onComplete) onComplete();
      return false;
    }
    this.cutscene = {
      script,
      frame: 0,
      frameStart: performance.now(),
      onComplete,
      particles: [],
      skipHeldStart: 0,
    };
    return true;
  }

  advance() {
    if (!this.cutscene) return;
    const cs = this.cutscene;
    const frame = cs.script[cs.frame];

    // If text is still typing, first click/Enter instantly reveals it
    if (!cs.readyToAdvance) {
      if (frame?.flipbook?.requireAction) {
        const timing = this._flipbookTiming(frame.flipbook);
        cs.frameStart = performance.now() - timing.finalStart;
        cs.readyToAdvance = true;
        return;
      }
      // Fast-forward: set frameStart far enough back that all text is visible
      cs.frameStart = performance.now() - 60000;
      cs.readyToAdvance = true;
      return;
    }

    // Ready — move to next frame
    cs.frame++;
    cs.frameStart = performance.now();
    cs.particles = [];
    cs.readyToAdvance = false;
    this.audio.menuSelect();
    if (cs.frame >= cs.script.length) {
      this.end();
    }
  }

  _flipbookTiming(fb) {
    let total = 0;
    let finalStart = 0;
    for (let i = 0; i < fb.pages.length; i++) {
      if (i === fb.pages.length - 1) finalStart = total;
      const pg = fb.pages[i];
      total += (pg.hold ?? 1400) + (i < fb.pages.length - 1 ? (pg.flipMs ?? 600) : 0);
    }
    return { total, finalStart };
  }

  end() {
    const cb = this.cutscene?.onComplete;
    this.cutscene = null;
    if (cb) cb();
  }

  update() {
    if (!this.cutscene) return;
    const cs = this.cutscene;
    const frame = cs.script[cs.frame];
    if (!frame) return;

    const elapsed = performance.now() - cs.frameStart;

    // Hold Space (or touch hold) to skip entire cutscene (1 second hold)
    const holdingSkip =
      this.getKeys()["Space"] ||
      (this.getTouchControls() &&
        this.getTouchControls().cutsceneHoldTouch !== null);
    if (holdingSkip) {
      if (!cs.skipHeldStart) cs.skipHeldStart = performance.now();
      if (performance.now() - cs.skipHeldStart >= 1000) {
        this.end();
        return;
      }
    } else {
      cs.skipHeldStart = 0;
    }

    // Auto-advance is optional (default: manual advance via Enter/click)
    // Mark frame as "ready" once all text has finished typing (or duration elapsed).
    const charsPerSec = 18; // 30% slower than original 25 for better readability

    if (frame.lines) {
      // Check if all lines have finished typing
      const lastLine = frame.lines[frame.lines.length - 1];
      const lastDelay = lastLine ? lastLine.delay : 0;
      const resolvedLen = lastLine
        ? (lastLine.text || "").replace(/\{AGENT\}/g, "Agent").length
        : 0;
      const typingDoneAt = lastDelay + (resolvedLen / charsPerSec) * 1000;
      cs.readyToAdvance = elapsed >= typingDoneAt + 300; // 300ms grace after typing

      // Auto-advance if enabled in settings
      if (this.getSettings().cutsceneAutoAdvance && cs.readyToAdvance) {
        const autoAdvanceDelay = 1500; // 1.5s after text finishes
        if (elapsed >= typingDoneAt + autoAdvanceDelay) {
          this.advance();
          return;
        }
      }
    } else if (frame.flipbook?.pages?.length) {
      // Flipbook frames have their own page-based timing; readyToAdvance
      // (and auto-advance) must wait until ALL pages have played, not the
      // generic 2s minimum. Sum hold + flipMs across pages.
      const timing = this._flipbookTiming(frame.flipbook);
      if (frame.flipbook.requireAction) {
        // Story preview ends on an action-gated page. No auto-advance: player
        // must press/click/tap to begin tutorial once prompt appears.
        cs.readyToAdvance = elapsed >= timing.finalStart;
        return;
      }
      cs.readyToAdvance = elapsed >= 1200;
      if (this.getSettings().cutsceneAutoAdvance && elapsed >= timing.total + 400) {
        this.advance();
        return;
      }
    } else {
      // No text lines — ready after minimum display time
      const minDisplay = Math.min(frame.duration || 2000, 2000);
      cs.readyToAdvance = elapsed >= minDisplay;

      // Auto-advance if enabled
      if (this.getSettings().cutsceneAutoAdvance && cs.readyToAdvance) {
        this.advance();
        return;
      }
    }

    // Spawn particles
    if (frame.particles && cs.particles.length < 60 && Math.random() < 0.3) {
      cs.particles.push(this.spawnCutsceneParticle(frame.particles));
    }
    // Update particles
    for (let i = cs.particles.length - 1; i >= 0; i--) {
      const p = cs.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.016;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) cs.particles.splice(i, 1);
    }
  }

  spawnCutsceneParticle(type) {
    const p = {
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      size: 2,
      color: "#ffffff",
      alpha: 1,
      life: 2,
      maxLife: 2,
    };
    switch (type) {
      case "stars":
        p.size = 1 + Math.random() * 2;
        p.color = "#aaccff";
        p.vy = -0.0003;
        p.life = p.maxLife = 3 + Math.random() * 2;
        break;
      case "embers":
        p.x = 0.3 + Math.random() * 0.4;
        p.y = 0.8 + Math.random() * 0.2;
        p.vx = (Math.random() - 0.5) * 0.002;
        p.vy = -(0.002 + Math.random() * 0.003);
        p.size = 2 + Math.random() * 3;
        p.color = Math.random() > 0.5 ? "#ff6622" : "#ffaa00";
        p.life = p.maxLife = 1.5 + Math.random() * 1.5;
        break;
      case "sparks":
        p.x = Math.random();
        p.y = 0.3 + Math.random() * 0.4;
        p.vx = (Math.random() - 0.5) * 0.004;
        p.vy = (Math.random() - 0.5) * 0.002;
        p.size = 1 + Math.random() * 2;
        p.color = "#00ccff";
        p.life = p.maxLife = 0.8 + Math.random();
        break;
      case "glow":
        p.x = 0.45 + Math.random() * 0.1;
        p.y = 0.3 + Math.random() * 0.3;
        p.vx = (Math.random() - 0.5) * 0.001;
        p.vy = -0.001;
        p.size = 3 + Math.random() * 4;
        p.color = "#00ffcc";
        p.life = p.maxLife = 2 + Math.random() * 2;
        break;
    }
    return p;
  }

  render(ctx, w, h) {
    if (!this.cutscene) return;
    const cs = this.cutscene;
    const frame = cs.script[cs.frame];
    if (!frame) return;

    const elapsed = performance.now() - cs.frameStart;
    const t = elapsed / 1000; // seconds
    // Responsive scale: on mobile, enforce a minimum so text stays readable
    const rawScale = h / 900;
    const s = this.isTouchDevice ? Math.max(0.82, rawScale) : rawScale;

    // === Flipbook (Marvel-style page-turn intro) ===
    if (frame.flipbook) {
      this.renderFlipbook(ctx, w, h, frame, elapsed, t);
      return;
    }

    // === Comic panel layout ===
    if (frame.panels) {
      this.renderComicPanels(ctx, w, h, frame, elapsed, t);
      return;
    }

    // === Background ===
    this.drawCutsceneBg(ctx, w, h, frame.bg, t);

    // === Flash effect ===
    if (frame.flash && elapsed < 300) {
      const flashAlpha = 0.6 * (1 - elapsed / 300);
      ctx.fillStyle = frame.flash;
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // === Shake ===
    if (frame.shake) {
      const intensity = frame.shake * Math.max(0, 1 - t / 2);
      ctx.save();
      ctx.translate(
        (Math.random() - 0.5) * intensity * 2,
        (Math.random() - 0.5) * intensity * 2,
      );
    }

    // === Particles ===
    for (const p of cs.particles) {
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * s * 3;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.size * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // === Art ===
    if (frame.art) {
      this.drawCutsceneArt(ctx, w, h, frame.art, t);
    }

    // === Scanner effect ===
    if (frame.scanner) {
      this.drawScannerEffect(ctx, w, h, t);
    }

    // === Cinematic grade over scene art ===
    if (frame.art) {
      const bloom = ctx.createRadialGradient(
        w / 2,
        h * 0.38,
        h * 0.08,
        w / 2,
        h * 0.38,
        h * 0.52,
      );
      bloom.addColorStop(0, "rgba(170,220,255,0.16)");
      bloom.addColorStop(0.45, "rgba(60,130,200,0.08)");
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);

      const sweep = Math.sin(t * 0.55) * 0.5 + 0.5;
      const beam = ctx.createLinearGradient(0, 0, w, h);
      beam.addColorStop(Math.max(0, sweep - 0.22), "rgba(0,0,0,0)");
      beam.addColorStop(sweep, "rgba(120,200,255,0.08)");
      beam.addColorStop(Math.min(1, sweep + 0.22), "rgba(0,0,0,0)");
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, w, h);
    }

    if (frame.title) {
      const titleY = Math.round((frame.art ? h * 0.11 : h * 0.18) + Math.sin(t * 1.1) * 2 * s);
      const titleSize = Math.round(18 * s);
      const titlePadX = Math.round(22 * s);
      const titlePadY = Math.round(10 * s);
      ctx.save();
      ctx.font = `bold ${titleSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const titleW = Math.min(w * 0.88, ctx.measureText(frame.title).width + titlePadX * 2);
      const titleX = (w - titleW) / 2;
      const plate = ctx.createLinearGradient(titleX, titleY - titleSize, titleX + titleW, titleY + titleSize);
      plate.addColorStop(0, "rgba(0,255,220,0.04)");
      plate.addColorStop(0.5, "rgba(0,12,22,0.72)");
      plate.addColorStop(1, "rgba(255,64,140,0.05)");
      ctx.fillStyle = plate;
      ctx.beginPath();
      ctx.roundRect(titleX, titleY - titleSize - titlePadY, titleW, titleSize + titlePadY * 2, Math.max(5, 9 * s));
      ctx.fill();
      ctx.strokeStyle = "rgba(0,230,255,0.35)";
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.stroke();
      // Chromatic aberration title — cyan/magenta offsets for comic-book feel
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#ff3a8a";
      ctx.fillText(frame.title, w / 2 - 1.2 * s, titleY);
      ctx.fillStyle = "#3affff";
      ctx.fillText(frame.title, w / 2 + 1.2 * s, titleY);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 10 * s;
      ctx.fillStyle = "#dffbff";
      ctx.fillText(frame.title, w / 2, titleY);
      ctx.restore();
    }

    // === Text (typewriter reveal with glow) ===
    if (frame.lines) {
      const centerY = frame.art ? h * 0.72 : h * 0.4;
      let lineY = centerY;
      const textPad = Math.round(30 * s);
      const textLineH = Math.round(36 * s);

      // Frosted glass text backdrop
      if (frame.art) {
        const tbg = ctx.createLinearGradient(
          0,
          centerY - textPad,
          0,
          centerY + frame.lines.length * textLineH,
        );
        tbg.addColorStop(0, "rgba(0,0,10,0)");
        tbg.addColorStop(0.12, "rgba(0,0,10,0.85)");
        tbg.addColorStop(0.88, "rgba(0,0,10,0.85)");
        tbg.addColorStop(1, "rgba(0,0,10,0)");
        ctx.fillStyle = tbg;
        ctx.fillRect(
          0,
          centerY - textPad,
          w,
          frame.lines.length * textLineH + textPad,
        );

        const boxX = Math.round(w * 0.05);
        const boxW = Math.round(w * 0.9);
        const boxY = Math.round(centerY - textPad + 3 * s);
        const boxH = Math.round(frame.lines.length * textLineH + textPad - 4 * s);
        const boxR = Math.max(4, Math.round(10 * s));

        // Main frosted fill — deep center with edge glow
        const frost = ctx.createRadialGradient(
          boxX + boxW / 2, boxY + boxH / 2, boxH * 0.15,
          boxX + boxW / 2, boxY + boxH / 2, boxW * 0.6,
        );
        frost.addColorStop(0, "rgba(2,6,18,0.75)");
        frost.addColorStop(0.7, "rgba(2,6,18,0.75)");
        frost.addColorStop(1, "rgba(0,180,255,0.06)");
        ctx.fillStyle = frost;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, boxR);
        ctx.fill();

        // Outer border
        ctx.strokeStyle = "rgba(0,200,255,0.12)";
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, boxR);
        ctx.stroke();

        // Inner subtle border
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = Math.max(1, 1 * s);
        ctx.beginPath();
        ctx.roundRect(
          boxX + 2, boxY + 2,
          Math.max(0, boxW - 4), Math.max(0, boxH - 4),
          Math.max(3, boxR - 1),
        );
        ctx.stroke();

        // Horizontal light sweep
        const sweepPos = Math.sin(t * 0.4) * 0.5 + 0.5;
        const sweep = ctx.createLinearGradient(boxX, 0, boxX + boxW, 0);
        sweep.addColorStop(Math.max(0, sweepPos - 0.15), "rgba(255,255,255,0)");
        sweep.addColorStop(sweepPos, "rgba(180,220,255,0.045)");
        sweep.addColorStop(Math.min(1, sweepPos + 0.15), "rgba(255,255,255,0)");
        ctx.fillStyle = sweep;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, boxR);
        ctx.fill();
      }

      for (const line of frame.lines) {
        const lineElapsed = elapsed - line.delay;
        if (lineElapsed < 0) continue;

        // Template variable substitution
        const resolvedText = line.text.replace(
          /\{AGENT\}/g,
          this.getPlayerName(),
        );

        // Typewriter — 30% slower than original for better readability
        const charsPerSec = 18;
        const visibleChars = Math.min(
          resolvedText.length,
          Math.floor((lineElapsed / 1000) * charsPerSec),
        );
        const displayText = resolvedText.substring(0, visibleChars);
        const typing = visibleChars < resolvedText.length;

        // Fade in + slide up
        const fadeIn = Math.min(1, lineElapsed / 400);
        const slideOffset = 4 * s * Math.max(0, 1 - lineElapsed / 500);
        const sz = Math.round((line.size || 16) * s);

        // Impact text scale-in for large lines
        const isImpact = (line.size || 16) >= 22;
        const scaleT = isImpact ? Math.min(1, lineElapsed / 600) : 1;
        const impactScale = isImpact ? 0.88 + 0.12 * scaleT : 1;
        const impactBlur = isImpact ? (20 - 12 * scaleT) * s : 0;

        lineY -= slideOffset;
        ctx.globalAlpha = fadeIn;
        ctx.font = `bold ${sz}px monospace`;
        ctx.textAlign = "center";

        if (isImpact && scaleT < 1) {
          ctx.save();
          ctx.translate(w / 2, lineY);
          ctx.scale(impactScale, impactScale);
          ctx.translate(-w / 2, -lineY);
        }

        // Detect speaker lines ("NAME:" pattern)
        const speakerMatch = displayText.match(/^([A-Z\s]+):(.*)/);

        if (speakerMatch) {
          // Speaker name as styled badge
          const speakerName = speakerMatch[1];
          const restText = speakerMatch[2].trimStart();
          const lc = line.color || "#00ffcc";
          const nameW = ctx.measureText(speakerName).width;
          const badgePadX = Math.round(8 * s);
          const badgePadY = Math.round(4 * s);
          const badgeGap = Math.round(8 * s);
          const restW = ctx.measureText(restText).width;
          const totalW = nameW + badgePadX * 2 + badgeGap + restW;
          const badgeX = w / 2 - totalW / 2;

          // Badge pill background
          ctx.save();
          const pillY = lineY - sz + badgePadY;
          const pillH = sz + badgePadY;
          const pillW = nameW + badgePadX * 2;
          ctx.fillStyle = lc + '33'; // ~20% opacity
          ctx.beginPath();
          ctx.roundRect(badgeX, pillY, pillW, pillH, Math.max(3, Math.round(5 * s)));
          ctx.fill();
          ctx.strokeStyle = lc + '59'; // ~35% opacity
          ctx.lineWidth = Math.max(1, 1 * s);
          ctx.stroke();

          // Speaker name text (bold, line color)
          ctx.shadowColor = lc;
          ctx.shadowBlur = 6 * s;
          ctx.strokeStyle = "rgba(0,0,0,0.82)";
          ctx.lineWidth = Math.max(1.5, 3 * s);
          ctx.strokeText(speakerName, badgeX + pillW / 2, lineY);
          ctx.fillStyle = lc;
          ctx.fillText(speakerName, badgeX + pillW / 2, lineY);
          ctx.shadowBlur = 0;
          ctx.restore();

          // Dialogue text (offset right, white)
          const dialogueX = badgeX + pillW + badgeGap + restW / 2;
          ctx.strokeStyle = "rgba(0,0,0,0.78)";
          ctx.lineWidth = Math.max(1.5, 2.6 * s);
          ctx.strokeText(restText, dialogueX, lineY);
          ctx.fillStyle = "#f2f6ff";
          ctx.fillText(restText, dialogueX, lineY);
        } else {
          // Normal text with subtle glow + impact shadow boost
          ctx.save();
          ctx.shadowColor = line.color || "#88bbff";
          ctx.shadowBlur = (isImpact && scaleT < 1 ? impactBlur : (typing ? 12 : 5) * s);
          // Text outline for readability
          ctx.strokeStyle = "rgba(0,0,0,0.76)";
          ctx.lineWidth = Math.max(1.5, 2.6 * s);
          ctx.strokeText(displayText, w / 2, lineY);
          ctx.fillStyle = line.color || "#f7fbff";
          ctx.fillText(displayText, w / 2, lineY);
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // Close impact scale transform
        if (isImpact && scaleT < 1) {
          ctx.restore();
        }

        // Enhanced cursor — beam with glow trail
        if (typing) {
          const cursorPhase = (Math.sin(elapsed * 0.01) + 1) / 2;
          const cursorAlpha = 0.3 + cursorPhase * 0.65;
          const textW = ctx.measureText(displayText).width;
          const cursorColor = line.color || "#00ffcc";
          const cursorX = w / 2 + textW / 2 + 3 * s;
          const cursorY = lineY - sz + 4 * s;
          const cursorW = Math.max(1, 2 * s);
          const cursorH = sz;

          // Glow trail
          ctx.save();
          ctx.globalAlpha = cursorAlpha * 0.5;
          ctx.shadowColor = cursorColor;
          ctx.shadowBlur = 8 * s;
          ctx.fillStyle = cursorColor;
          ctx.fillRect(cursorX, cursorY, cursorW, cursorH);
          ctx.restore();

          // Main beam
          ctx.globalAlpha = cursorAlpha;
          ctx.fillStyle = cursorColor;
          ctx.fillRect(cursorX, cursorY, cursorW, cursorH);
        }

        ctx.globalAlpha = 1;
        lineY += slideOffset + sz + Math.round(14 * s);
      }
    }

    if (frame.shake) {
      ctx.restore();
    }

    // === Vignette overlay (tinted per scene) ===
    const vignTint =
      frame.bg === "boss_lair"
        ? "8,0,0"
        : frame.bg === "station"
          ? "0,0,8"
          : "0,0,8";
    const vign = ctx.createRadialGradient(
      w / 2,
      h / 2,
      h * 0.25,
      w / 2,
      h / 2,
      h * 0.85,
    );
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, `rgba(${vignTint},0.5)`);
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, w, h);

    // === Letterbox bars (gradient fade) ===
    // Thinner bars on mobile to reclaim vertical space
    const barPct = this.isTouchDevice ? 0.035 : 0.08;
    const barHeight = h * barPct;
    const topBar = ctx.createLinearGradient(0, 0, 0, barHeight);
    topBar.addColorStop(0, "#000000");
    topBar.addColorStop(0.8, "rgba(0,0,0,0.95)");
    topBar.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topBar;
    ctx.fillRect(0, 0, w, barHeight);
    const botBar = ctx.createLinearGradient(0, h - barHeight, 0, h);
    botBar.addColorStop(0, "rgba(0,0,0,0)");
    botBar.addColorStop(0.2, "rgba(0,0,0,0.95)");
    botBar.addColorStop(1, "#000000");
    ctx.fillStyle = botBar;
    ctx.fillRect(0, h - barHeight, w, barHeight);

    // Thin accent lines on bar edges
    ctx.strokeStyle = "rgba(0,200,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barHeight);
    ctx.lineTo(w, barHeight);
    ctx.moveTo(0, h - barHeight);
    ctx.lineTo(w, h - barHeight);
    ctx.stroke();

    // === Scanlines (alternating density) ===
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.03)";
      ctx.fillRect(0, y, w, 1);
    }

    // === Progress indicator (connected dots) ===
    const frameCount = cs.script.length;
    const dotSize = Math.round(6 * s);
    const dotGap = Math.round(14 * s);
    const dotsW = frameCount * dotGap;
    const dotsX = (w - dotsW) / 2;

    // Connecting track line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dotsX + dotGap / 2, h - barHeight / 2);
    ctx.lineTo(
      dotsX + (frameCount - 1) * dotGap + dotGap / 2,
      h - barHeight / 2,
    );
    ctx.stroke();
    // Filled portion
    if (cs.frame > 0) {
      ctx.strokeStyle = "rgba(0,200,200,0.3)";
      ctx.beginPath();
      ctx.moveTo(dotsX + dotGap / 2, h - barHeight / 2);
      ctx.lineTo(dotsX + cs.frame * dotGap + dotGap / 2, h - barHeight / 2);
      ctx.stroke();
    }

    for (let i = 0; i < frameCount; i++) {
      const dx = dotsX + i * dotGap + dotGap / 2;
      const dy = h - barHeight / 2;
      const isCurrent = i === cs.frame;
      ctx.fillStyle = isCurrent
        ? "#00ffcc"
        : i < cs.frame
          ? "rgba(0,200,200,0.5)"
          : "rgba(255,255,255,0.15)";
      if (isCurrent) {
        ctx.save();
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.arc(
        dx,
        dy,
        isCurrent ? dotSize / 2 + 1.5 : dotSize / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (isCurrent) {
        ctx.restore();
      }
    }

    // === Skip prompt ===
    // Brighter, pulsing prompt when ready to advance
    const readyPulse = cs.readyToAdvance
      ? 0.6 + 0.35 * Math.sin(elapsed / 300)
      : 0;
    const skipAlpha = cs.readyToAdvance
      ? readyPulse
      : 0.3 + 0.15 * Math.sin(elapsed / 500);
    ctx.fillStyle = cs.readyToAdvance
      ? `rgba(0,255,204,${skipAlpha})`
      : `rgba(255,255,255,${skipAlpha})`;
    ctx.font = `${Math.round(12 * s)}px monospace`;
    ctx.textAlign = "right";
    ctx.fillText(
      this.isTouchDevice
        ? "Tap to continue  ·  Hold to skip"
        : "[ENTER] continue  ·  [ESC] skip",
      w - Math.round(20 * s),
      h - barHeight / 2 + Math.round(4 * s),
    );

    // === Hold-to-skip progress bar ===
    if (cs.skipHeldStart > 0) {
      const holdProgress = Math.min(
        1,
        (performance.now() - cs.skipHeldStart) / 1000,
      );
      const skipBarW = Math.round(120 * s);
      const skipBarH = Math.round(4 * s);
      const skipBarX = w - Math.round(20 * s) - skipBarW;
      const skipBarY = h - barHeight / 2 + Math.round(12 * s);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(skipBarX, skipBarY, skipBarW, skipBarH);
      ctx.fillStyle = "#00ffcc";
      ctx.fillRect(skipBarX, skipBarY, skipBarW * holdProgress, skipBarH);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `${Math.round(10 * s)}px monospace`;
      ctx.fillText(
        this.isTouchDevice
          ? "Hold to skip all..."
          : "Hold SPACE to skip all...",
        w - Math.round(20 * s),
        skipBarY + Math.round(16 * s),
      );
    }

    ctx.textAlign = "left";
  }

  // ── Flipbook (Marvel-style page-turn intro) ─────────────────────
  /**
   * Renders a sequence of full-bleed pages that flip horizontally
   * like a comic book / Marvel intro card. Each page is one panel
   * (re-using the existing panel art/bg pipeline).
   *
   * frame.flipbook = {
   *   pages: [{ panel: {bg, art, caption, captionColor, captionSize, sfx, sfxColor, sfxSize, halftone, action},
   *             hold: 1400, flipMs: 650 }, ...],
   *   paperTint: "#0a0814",       // page background tint
   *   spineSide: "right" | "left", // which edge stays anchored during flip
   * }
   */
  renderFlipbook(ctx, w, h, frame, elapsed /* ms */, t /* sec */) {
    const fb = frame.flipbook;
    if (!fb || !fb.pages || !fb.pages.length) return;

    const rawS = h / 900;
    const s = this.isTouchDevice ? Math.max(0.82, rawS) : rawS;

    // Page geometry
    const pageWPct = this.isTouchDevice ? 0.94 : 0.86;
    const pageHPct = this.isTouchDevice ? 0.92 : 0.88;
    const pw = w * pageWPct;
    const ph = h * pageHPct;
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;

    // Backdrop — deep velvet
    const backdrop = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    backdrop.addColorStop(0, "#0a0814");
    backdrop.addColorStop(1, "#020108");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, w, h);

    // Determine current page index + flip progress
    let acc = 0;
    let idx = 0;
    let flipT = 0; // 0 = settled, 0..1 = mid-flip
    for (let i = 0; i < fb.pages.length; i++) {
      const pg = fb.pages[i];
      const hold = pg.hold ?? 1400;
      const flipMs = pg.flipMs ?? 600;
      const total = hold + (i < fb.pages.length - 1 ? flipMs : 0);
      if (elapsed < acc + hold) { idx = i; flipT = 0; break; }
      if (elapsed < acc + total) { idx = i; flipT = (elapsed - acc - hold) / flipMs; break; }
      acc += total;
      idx = i;
      flipT = 0;
    }
    if (idx >= fb.pages.length) idx = fb.pages.length - 1;
    const curPage = fb.pages[idx];
    const nextPage = fb.pages[idx + 1];

    const spineRight = (fb.spineSide ?? "right") === "right";
    const paperTint = fb.paperTint ?? "#0a0814";

    // Draw the next page underneath (revealed as current page flips away)
    if (nextPage && flipT > 0) {
      this._drawFlipbookPage(ctx, px, py, pw, ph, nextPage.panel, t, s, paperTint, 1);
    } else {
      // Static settled page — just current page
    }

    // Draw current page with horizontal page-flip transform
    if (flipT === 0) {
      this._drawFlipbookPage(ctx, px, py, pw, ph, curPage.panel, t, s, paperTint, 1);
    } else {
      // Ease in-out for natural flip motion
      const eased = flipT < 0.5
        ? 2 * flipT * flipT
        : 1 - Math.pow(-2 * flipT + 2, 2) / 2;
      // Horizontal "page lifting" — scaleX from 1 → 0 over the spine
      const sx = Math.max(0.001, 1 - eased);
      // Slight perspective skew to suggest 3D
      const skewY = (spineRight ? -1 : 1) * eased * 0.18;

      ctx.save();
      // Pivot at spine edge
      const spineX = spineRight ? px + pw : px;
      ctx.translate(spineX, py + ph / 2);
      ctx.transform(sx, skewY * sx, 0, 1, 0, 0);
      ctx.translate(-spineX, -(py + ph / 2));
      this._drawFlipbookPage(ctx, px, py, pw, ph, curPage.panel, t, s, paperTint, 1);
      ctx.restore();

      // Shadow cast by the lifting page on the next page
      ctx.save();
      const shadow = ctx.createLinearGradient(
        spineRight ? px + pw - pw * (1 - eased) : px,
        0,
        spineRight ? px + pw : px + pw * (1 - eased),
        0,
      );
      shadow.addColorStop(0, "rgba(0,0,0,0)");
      shadow.addColorStop(1, `rgba(0,0,0,${0.45 * eased})`);
      ctx.fillStyle = shadow;
      ctx.fillRect(px, py, pw, ph);
      ctx.restore();
    }

    // Page binding shadow (spine)
    ctx.save();
    const spineGrad = ctx.createLinearGradient(
      spineRight ? px + pw - 30 * s : px,
      0,
      spineRight ? px + pw : px + 30 * s,
      0,
    );
    spineGrad.addColorStop(0, "rgba(0,0,0,0)");
    spineGrad.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = spineGrad;
    ctx.fillRect(spineRight ? px + pw - 30 * s : px, py, 30 * s, ph);
    ctx.restore();

    // Vignette over whole composition
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Page indicator (subtle, bottom-right)
    ctx.save();
    ctx.font = `${Math.round(11 * s)}px monospace`;
    ctx.fillStyle = "rgba(180,200,220,0.45)";
    ctx.textAlign = "right";
    ctx.fillText(`${idx + 1} / ${fb.pages.length}`, px + pw - 8 * s, py + ph - 8 * s);
    ctx.restore();
  }

  /** Render a single flipbook page (panel) into the given rect. */
  _drawFlipbookPage(ctx, px, py, pw, ph, panel, t, s, paperTint, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Clip to page bounds (slightly rounded)
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, Math.max(2, 6 * s));
    ctx.clip();

    // Paper / panel background
    ctx.translate(px, py);
    if (panel.bg) {
      this.drawCutsceneBg(ctx, pw, ph, panel.bg, t);
    } else {
      ctx.fillStyle = paperTint;
      ctx.fillRect(0, 0, pw, ph);
    }

    // Art
    if (panel.art) {
      ctx.save();
      const artScale = Math.min(pw, ph) / 200;
      const artCx = pw / 2;
      const artCy = ph * 0.42;
      ctx.translate(artCx, artCy);
      ctx.scale(artScale, artScale);
      ctx.translate(-artCx / artScale, -artCy / artScale);
      this.drawCutsceneArt(ctx, pw / artScale, ph / artScale, panel.art, t);
      ctx.restore();
    }

    // Photo / illustration overlay (panel.image). Drawn over panel.art so
    // pre-rendered art beats procedural until image is ready, then overrides.
    // Cover-fit centered, with optional opacity for blend-with-art moments.
    if (panel.image) {
      const img = this._getImage(panel.image);
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = (panel.imageAlpha ?? 1) * alpha;
        const ar = img.naturalWidth / img.naturalHeight;
        const panelAR = pw / ph;
        let dw, dh;
        if (ar > panelAR) {
          dh = ph;
          dw = ph * ar;
        } else {
          dw = pw;
          dh = pw / ar;
        }
        ctx.drawImage(img, (pw - dw) / 2, (ph - dh) / 2, dw, dh);
        ctx.restore();
      }
    }

    // Halftone overlay (Marvel print feel)
    if (panel.halftone) {
      const dot = 4 * s;
      ctx.globalAlpha = panel.halftone * alpha;
      ctx.fillStyle = "#000";
      for (let yy = 0; yy < ph; yy += dot * 2) {
        for (let xx = 0; xx < pw; xx += dot * 2) {
          ctx.beginPath();
          ctx.arc(xx, yy, dot * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = alpha;
    }

    // Paper grain texture (subtle, scanline-based)
    ctx.fillStyle = 'rgba(200,190,170,0.04)';
    for (let gy = 0; gy < ph; gy += 4) {
      ctx.globalAlpha = (0.02 + 0.02 * Math.sin(gy * 0.7)) * alpha;
      ctx.fillRect(0, gy, pw, 1);
    }
    ctx.globalAlpha = alpha;

    // SFX (KRAKOOM!)
    if (panel.sfx) {
      ctx.save();
      const sx = (panel.sfxX ?? 0.5) * pw;
      const sy = (panel.sfxY ?? 0.4) * ph;
      const sz = (panel.sfxSize ?? 28) * s;
      ctx.translate(sx, sy);
      ctx.rotate(((panel.sfxRot ?? -8) * Math.PI) / 180);
      ctx.font = `900 italic ${sz}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(2, 4 * s);
      ctx.strokeStyle = "#000";
      ctx.strokeText(panel.sfx, 0, 0);
      ctx.fillStyle = panel.sfxColor || "#ffcc00";
      ctx.fillText(panel.sfx, 0, 0);
      ctx.restore();
    }

    // Caption box
    if (panel.caption) {
      const pos = panel.captionPos || "bottom";
      const fontSize = Math.round((panel.captionSize ?? 13) * s);
      const padX = Math.round(14 * s);
      const padY = Math.round(8 * s);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = "center";
      const text = panel.caption.replace(/\{AGENT\}/g, this.getPlayerName());
      // Wrap to width
      const maxW = pw - padX * 4;
      const words = text.split(" ");
      const lines = [];
      let cur = "";
      for (const word of words) {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxW && cur) {
          lines.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);

      const boxH = lines.length * (fontSize + 4 * s) + padY * 2;
      const boxW = Math.min(
        pw - padX * 2,
        Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2,
      );
      const boxX = (pw - boxW) / 2;
      let boxY;
      if (pos === "top") boxY = padY * 1.5;
      else if (pos === "center") boxY = (ph - boxH) / 2;
      else boxY = ph - boxH - padY * 1.5;

      // Caption plate (vintage off-white)
      ctx.fillStyle = panel.captionBg || "rgba(248,238,210,0.96)";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, Math.max(2, 4 * s));
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.stroke();

      ctx.fillStyle = panel.captionColor || "#1a1208";
      lines.forEach((ln, i) => {
        ctx.fillText(
          ln,
          boxX + boxW / 2,
          boxY + padY + fontSize + i * (fontSize + 4 * s) - 2,
        );
      });
    }

    if (panel.prompt) {
      const pulse = 0.65 + 0.35 * Math.sin(t * 5);
      const prompt = panel.prompt.replace(//g, "");
      const py2 = ph * (panel.promptY ?? 0.78);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.textAlign = "center";
      ctx.font = `900 ${Math.round((panel.promptSize ?? 20) * s)}px monospace`;
      ctx.shadowColor = panel.promptColor || "#00ffcc";
      ctx.shadowBlur = 12 + pulse * 16;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.lineWidth = Math.max(2, 4 * s);
      ctx.strokeText(prompt, pw / 2, py2);
      ctx.fillStyle = panel.promptColor || "#00ffcc";
      ctx.globalAlpha = 0.7 + pulse * 0.3;
      ctx.fillText(prompt, pw / 2, py2);
      ctx.restore();
    }

    // Action speed-lines
    if (panel.action) {
      ctx.strokeStyle = `rgba(0,0,0,${0.18 + 0.06 * Math.sin(t * 4)})`;
      ctx.lineWidth = Math.max(1, 1 * s);
      const cx = pw / 2;
      const cy = ph * 0.45;
      for (let l = 0; l < 14; l++) {
        const ang = (l / 14) * Math.PI * 2 + t * 0.3;
        const r1 = pw * 0.18;
        const r2 = pw * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ── Comic Book Panel Renderer ───────────────────────────────────
  renderComicPanels(ctx, w, h, frame, elapsed, t) {
    const cs = this.cutscene;
    const rawS = h / 900;
    const s = this.isTouchDevice ? Math.max(0.82, rawS) : rawS;

    // Page background — vintage paper
    const paperGrad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      w * 0.8,
    );
    paperGrad.addColorStop(0, "#12101a");
    paperGrad.addColorStop(0.7, "#0a0812");
    paperGrad.addColorStop(1, "#050408");
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, w, h);

    // Constrain comic page area — use more space on mobile
    const pageWPct = this.isTouchDevice ? 0.98 : 0.94;
    const pageHPct = this.isTouchDevice ? 0.96 : 0.92;
    const maxPageW = w * pageWPct;
    const maxPageH = h * pageHPct;
    const pageX = (w - maxPageW) / 2;
    const pageY = (h - maxPageH) / 2;

    const panels = frame.panels;
    const gutter = Math.round(8 * s);
    const margin = Math.round(24 * s);
    const panelDelay = 800;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const panelElapsed = elapsed - i * panelDelay;
      if (panelElapsed < 0) continue;

      // Panel position (fractional coords → pixel within page bounds)
      const avW = maxPageW - margin * 2;
      const avH = maxPageH - margin * 2;
      const px = pageX + margin + panel.x * avW;
      const py = pageY + margin + panel.y * avH;
      const pw = panel.w * avW - gutter;
      const ph = panel.h * avH - gutter;

      // Slam-in animation
      const revealT = Math.min(1, panelElapsed / 350);
      const scale = 0.6 + 0.4 * (1 - Math.pow(1 - revealT, 3));
      const panelAlpha = Math.min(1, panelElapsed / 300);

      ctx.save();
      ctx.globalAlpha = panelAlpha;

      // Scale from panel center for slam effect
      const cx = px + pw / 2;
      const cy = py + ph / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      // Clip to panel bounds
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();

      // Panel background
      ctx.save();
      ctx.translate(px, py);
      if (panel.bg) {
        this.drawCutsceneBg(ctx, pw, ph, panel.bg, t);
      } else {
        ctx.fillStyle = "#0a0a18";
        ctx.fillRect(0, 0, pw, ph);
      }
      ctx.restore();

      // Panel art (scaled proportionally to fill panel)
      if (panel.art) {
        const artT = Math.max(0, (panelElapsed - 200) / 1000);
        ctx.save();
        ctx.translate(px, py);
        // Art is designed for ~200px effective area; scale to panel dimensions
        const artScale = Math.min(pw, ph) / 200;
        const artCx = pw / 2;
        const artCy = ph * 0.38;
        ctx.translate(artCx, artCy);
        ctx.scale(artScale, artScale);
        ctx.translate(-artCx / artScale, -artCy / artScale);
        this.drawCutsceneArt(
          ctx,
          pw / artScale,
          ph / artScale,
          panel.art,
          artT,
        );
        ctx.restore();
      }

      // Speed lines (action panels)
      if (panel.action) {
        const lineAlpha = 0.12 + 0.05 * Math.sin(t * 4 + i);
        ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
        ctx.lineWidth = 1;
        const centerX =
          px +
          pw / 2 +
          (panel.actionDir === "left"
            ? pw * 0.3
            : panel.actionDir === "right"
              ? -pw * 0.3
              : 0);
        const centerY = py + ph * 0.4;
        for (let l = 0; l < 12; l++) {
          const ang = (l / 12) * Math.PI * 2;
          const r1 = pw * 0.15;
          const r2 = pw * 0.6 + Math.sin(l * 7 + t * 3) * pw * 0.1;
          ctx.beginPath();
          ctx.moveTo(
            centerX + Math.cos(ang) * r1,
            centerY + Math.sin(ang) * r1,
          );
          ctx.lineTo(
            centerX + Math.cos(ang) * r2,
            centerY + Math.sin(ang) * r2,
          );
          ctx.stroke();
        }
      }

      // Halftone dots (for shading feel)
      if (panel.halftone) {
        ctx.fillStyle = `rgba(0,0,0,${panel.halftone})`;
        const dotSpacing = 8;
        for (let dx = px; dx < px + pw; dx += dotSpacing) {
          for (let dy = py + ph * 0.6; dy < py + ph; dy += dotSpacing) {
            const dist = (dy - (py + ph * 0.6)) / (ph * 0.4);
            const dotR = dist * 2.5;
            if (dotR > 0.3) {
              ctx.beginPath();
              ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.restore(); // clip + slam

      // Panel border — thick ink style (outside clip)
      ctx.save();
      ctx.globalAlpha = panelAlpha;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, 3 * s);
      ctx.strokeRect(px, py, pw, ph);
      ctx.strokeStyle = "rgba(0,200,255,0.15)";
      ctx.lineWidth = Math.max(1, s);
      ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);

      // Caption box text
      if (panel.caption) {
        const captionElapsed = panelElapsed - 400;
        if (captionElapsed > 0) {
          const capFade = Math.min(1, captionElapsed / 400);
          const capBg = panel.captionBg || "rgba(0,0,0,0.85)";
          const capColor = panel.captionColor || "#ffffff";
          const capSize = Math.round((panel.captionSize || 12) * s);
          const capPos = panel.captionPos || "bottom";

          ctx.font = `bold ${capSize}px monospace`;
          const textW = ctx.measureText(panel.caption).width;
          const boxW = Math.min(pw - 12, textW + 20);
          const boxH = capSize + 14;

          let boxX = px + (pw - boxW) / 2;
          let boxY;
          if (capPos === "top") boxY = py + 6;
          else if (capPos === "center") boxY = py + (ph - boxH) / 2;
          else boxY = py + ph - boxH - 6;

          ctx.globalAlpha = panelAlpha * capFade;
          ctx.fillStyle = capBg;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 3);
          ctx.fill();
          ctx.strokeStyle = capColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 3);
          ctx.stroke();

          // Typewriter reveal with glow
          const charsPerSec = 35;
          const visibleChars = Math.min(
            panel.caption.length,
            Math.floor((captionElapsed / 1000) * charsPerSec),
          );
          ctx.save();
          ctx.shadowColor = capColor;
          ctx.shadowBlur = visibleChars < panel.caption.length ? 8 : 3;
          ctx.fillStyle = capColor;
          ctx.textAlign = "center";
          ctx.fillText(
            panel.caption.substring(0, visibleChars),
            px + pw / 2,
            boxY + capSize + 4,
          );
          ctx.textAlign = "left";
          ctx.restore();
        }
      }

      // SFX text (comic style onomatopoeia)
      if (panel.sfx) {
        const sfxElapsed = panelElapsed - 150;
        if (sfxElapsed > 0) {
          const sfxScale = 0.5 + 0.5 * Math.min(1, sfxElapsed / 200);
          const sfxAlpha =
            Math.min(1, sfxElapsed / 200) *
            (1 - Math.max(0, (sfxElapsed - 2000) / 500));
          if (sfxAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = sfxAlpha;
            const sfxX = px + pw * (panel.sfxX || 0.5);
            const sfxY = py + ph * (panel.sfxY || 0.3);
            ctx.translate(sfxX, sfxY);
            ctx.scale(sfxScale, sfxScale);
            ctx.rotate(((panel.sfxRot || 0) * Math.PI) / 180);
            ctx.font = `bold ${Math.round((panel.sfxSize || 28) * s)}px monospace`;
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 4;
            ctx.textAlign = "center";
            ctx.strokeText(panel.sfx, 0, 0);
            ctx.fillStyle = panel.sfxColor || "#ffcc00";
            ctx.fillText(panel.sfx, 0, 0);
            ctx.textAlign = "left";
            ctx.restore();
          }
        }
      }

      ctx.restore(); // border + scale
    }

    // === Page-level scanlines ===
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)";
      ctx.fillRect(0, y, w, 1);
    }

    // === Letterbox with gradient fade ===
    const barH = h * 0.04;
    const topBarC = ctx.createLinearGradient(0, 0, 0, barH);
    topBarC.addColorStop(0, "#000000");
    topBarC.addColorStop(0.85, "rgba(0,0,0,0.9)");
    topBarC.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topBarC;
    ctx.fillRect(0, 0, w, barH);
    const botBarC = ctx.createLinearGradient(0, h - barH, 0, h);
    botBarC.addColorStop(0, "rgba(0,0,0,0)");
    botBarC.addColorStop(0.15, "rgba(0,0,0,0.9)");
    botBarC.addColorStop(1, "#000000");
    ctx.fillStyle = botBarC;
    ctx.fillRect(0, h - barH, w, barH);

    // === Frame page number ===
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = `italic ${Math.round(11 * s)}px monospace`;
    ctx.textAlign = "right";
    ctx.fillText(
      `${cs.frame + 1} / ${cs.script.length}`,
      w - Math.round(16 * s),
      h - barH / 2 + Math.round(4 * s),
    );

    // === Skip prompt ===
    const skipAlpha = 0.3 + 0.1 * Math.sin(elapsed / 500);
    ctx.fillStyle = `rgba(255,255,255,${skipAlpha})`;
    ctx.font = `${Math.round(12 * s)}px monospace`;
    ctx.fillText(
      "[ENTER] next  ·  [ESC] skip",
      w - Math.round(240 * s),
      barH / 2 + Math.round(4 * s),
    );

    // === Hold-to-skip progress bar ===
    if (cs.skipHeldStart > 0) {
      const holdProgress = Math.min(
        1,
        (performance.now() - cs.skipHeldStart) / 1000,
      );
      const skipBarW = Math.round(120 * s);
      const skipBarBH = Math.round(4 * s);
      const skipBarX = w - Math.round(240 * s);
      const skipBarY = barH / 2 + Math.round(12 * s);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(skipBarX, skipBarY, skipBarW, skipBarBH);
      ctx.fillStyle = "#00ffcc";
      ctx.fillRect(skipBarX, skipBarY, skipBarW * holdProgress, skipBarBH);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `${Math.round(10 * s)}px monospace`;
      ctx.fillText(
        "Hold SPACE to skip all...",
        w - Math.round(240 * s),
        skipBarY + Math.round(16 * s),
      );
    }

    ctx.textAlign = "left";
  }

  drawScannerEffect(ctx, w, h, t) {
    const rawS = h / 900;
    const s = this.isTouchDevice ? Math.max(0.82, rawS) : rawS;
    // Power-level scanner: climbs to ~9000, then ROCKETS off the page
    const rampDur = 3.5; // seconds to reach ~9000
    const blowoffStart = rampDur; // when it goes ballistic
    const blowoffDur = 3.0; // seconds of exponential blowoff

    let currentVal, eased, phase;
    if (t < rampDur) {
      // Phase 1: Steady climb to ~9000
      phase = "climb";
      const progress = t / rampDur;
      eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      currentVal = Math.floor(eased * 9000);
    } else {
      // Phase 2: Exponential blowoff — rockets through the roof
      phase = "blowoff";
      eased = 1;
      const bt = t - blowoffStart;
      const blowProg = Math.min(1, bt / blowoffDur);
      // Exponential: 9000 → 99,999 → 999,999 → ∞
      const expo = Math.pow(10, 1 + blowProg * 5);
      currentVal = Math.floor(9000 + expo);
    }

    const isBlowoff = phase === "blowoff";
    const bt = Math.max(0, t - blowoffStart);
    const blowProg = isBlowoff ? Math.min(1, bt / blowoffDur) : 0;

    // ── Background number rain ──
    ctx.save();
    const rainAlpha = isBlowoff ? 0.25 + 0.4 * blowProg : 0.15 + 0.1 * eased;
    ctx.globalAlpha = rainAlpha;
    const rainFont = Math.round(
      (isBlowoff ? 14 + Math.floor(blowProg * 10) : 14) * s,
    );
    ctx.font = `${rainFont}px monospace`;
    const cols = 18;
    for (let c = 0; c < cols; c++) {
      // Columns scatter outward during blowoff
      const scatter = isBlowoff ? (c - cols / 2) * blowProg * 30 : 0;
      const cx = (w / (cols + 1)) * (c + 1) + scatter;
      const speed = isBlowoff
        ? (60 + (c % 5) * 20) * (1 + blowProg * 8)
        : 60 + (c % 5) * 20;
      const rowCount = isBlowoff ? 12 + Math.floor(blowProg * 6) : 12;
      for (let r = 0; r < rowCount; r++) {
        const baseY = ((t * speed + r * 55 + c * 37) % (h + 60)) - 30;
        const num = Math.floor(
          Math.abs(Math.sin(c * 7.3 + r * 2.1 + t * 3)) * currentVal,
        );
        const bright = 0.3 + 0.7 * (1 - baseY / h);
        const rc = isBlowoff ? Math.min(255, Math.floor(blowProg * 255)) : 0;
        const gc = isBlowoff
          ? Math.max(0, 255 - Math.floor(blowProg * 100))
          : 255;
        ctx.fillStyle = `rgba(${rc},${gc},200,${bright * 0.5})`;
        ctx.textAlign = "center";
        ctx.fillText(num.toLocaleString(), cx, baseY);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Main counter ──
    const counterY = h * 0.28;
    const pulse = 1 + 0.04 * Math.sin(t * 12);
    let fontSize;
    if (isBlowoff) {
      // Font grows massive — rockets off the page
      fontSize = Math.round((68 + blowProg * 120) * s);
    } else {
      fontSize = Math.round((48 * pulse + 20 * eased) * s);
    }

    ctx.save();
    ctx.textAlign = "center";

    // Counter label
    ctx.font = `bold ${Math.round(14 * s)}px monospace`;
    if (isBlowoff) {
      // Label glitches and fades
      const labelAlpha = Math.max(0, 1 - blowProg * 2);
      const labelShake = blowProg * 15;
      ctx.fillStyle = `rgba(255,${Math.floor(100 - blowProg * 100)},${Math.floor(100 - blowProg * 100)},${labelAlpha})`;
      ctx.fillText(
        blowProg > 0.6 ? "!!! CRITICAL !!!" : "POWER LEVEL SCAN",
        w / 2 + (Math.random() - 0.5) * labelShake,
        counterY - fontSize / 2 - 16 + (Math.random() - 0.5) * labelShake,
      );
    } else {
      ctx.fillStyle = `rgba(170,187,204,${0.6 + 0.4 * eased})`;
      ctx.fillText("POWER LEVEL SCAN", w / 2, counterY - fontSize / 2 - 16);
    }

    // Counter value
    ctx.font = `bold ${fontSize}px monospace`;
    if (isBlowoff) {
      // Red → white hot, massive shake, rising off-screen
      const heat = Math.min(1, blowProg * 2);
      const r2 = 255;
      const g2 = Math.floor(heat * 200);
      const b2 = Math.floor(heat * 200);
      ctx.fillStyle = `rgb(${r2},${g2},${b2})`;
      // Shake intensifies
      const shake = 8 + blowProg * 40;
      const shakeX = (Math.random() - 0.5) * shake;
      const shakeY = (Math.random() - 0.5) * shake;
      // Counter rises off screen
      const lift = blowProg * blowProg * h * 0.4;
      const displayY = counterY - lift + shakeY;

      // Motion blur streaks behind the number
      for (let streak = 3; streak > 0; streak--) {
        const sa = 0.08 * streak;
        ctx.fillStyle = `rgba(${r2},${g2 >> 1},0,${sa})`;
        ctx.fillText(
          currentVal.toLocaleString(),
          w / 2 + shakeX * 0.5,
          displayY + streak * (10 + blowProg * 20),
        );
      }

      // Main number
      ctx.fillStyle = `rgb(${r2},${g2},${b2})`;
      ctx.fillText(currentVal.toLocaleString(), w / 2 + shakeX, displayY);

      // Overflow symbol when it gets too big to read
      if (blowProg > 0.7) {
        const oAlpha = (blowProg - 0.7) / 0.3;
        ctx.font = `bold ${Math.round((80 + oAlpha * 60) * s)}px monospace`;
        ctx.fillStyle = `rgba(255,255,255,${oAlpha * 0.9})`;
        ctx.fillText(
          "∞",
          w / 2 + (Math.random() - 0.5) * 10,
          counterY - lift * 0.5,
        );
      }
    } else if (currentVal >= 8000) {
      // Early warning — starts shaking before 9000
      const warn = (currentVal - 8000) / 1000;
      ctx.fillStyle = `rgb(255,${Math.floor(255 - warn * 200)},${Math.floor(200 - warn * 200)})`;
      const shakeX = (Math.random() - 0.5) * warn * 6;
      const shakeY = (Math.random() - 0.5) * warn * 6;
      ctx.fillText(
        currentVal.toLocaleString(),
        w / 2 + shakeX,
        counterY + shakeY,
      );
    } else {
      ctx.fillStyle = "#00ffcc";
      ctx.fillText(currentVal.toLocaleString(), w / 2, counterY);
    }

    // ── Horizontal scan lines ──
    const scanCount = isBlowoff ? 3 + Math.floor(blowProg * 5) : 1;
    for (let s = 0; s < scanCount; s++) {
      const scanSpeed = 120 * (1 + s * 0.5 + blowProg * 3);
      const scanY = (t * scanSpeed + s * 97) % h;
      const sa = isBlowoff
        ? 0.3 + 0.3 * blowProg
        : 0.25 + 0.15 * Math.sin(t * 5);
      ctx.strokeStyle = isBlowoff
        ? `rgba(255,${Math.floor(150 - blowProg * 150)},${Math.floor(200 - blowProg * 200)},${sa})`
        : `rgba(0,255,204,${sa})`;
      ctx.lineWidth = isBlowoff ? 1 + blowProg * 2 : 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();
    }

    // ── Progress bar → explosion ──
    const barW = w * 0.4;
    const barH2 = 12;
    const barX = (w - barW) / 2;
    const barY = counterY + fontSize / 2 + 20;

    if (isBlowoff) {
      // Bar shatters — fragments fly outward
      const fragCount = 12;
      for (let f = 0; f < fragCount; f++) {
        const seed = f * 7.31;
        const angle = (f / fragCount) * Math.PI * 2 + Math.sin(seed) * 0.5;
        const dist = blowProg * (80 + Math.sin(seed * 3) * 40);
        const fx = w / 2 + Math.cos(angle) * dist;
        const fy = barY + Math.sin(angle) * dist;
        const fragAlpha = Math.max(0, 1 - blowProg * 1.5);
        const fw = 8 + Math.sin(seed * 2) * 6;
        const fh = 3 + Math.sin(seed * 5) * 2;
        ctx.fillStyle = `rgba(255,${Math.floor(100 + Math.sin(seed) * 100)},0,${fragAlpha})`;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(angle + blowProg * 3);
        ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
        ctx.restore();
      }
    } else {
      // Normal bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(barX, barY, barW, barH2);
      const barColor =
        currentVal >= 8000
          ? `rgb(255,${Math.floor(255 - ((currentVal - 8000) / 1000) * 200)},${Math.floor(200 - ((currentVal - 8000) / 1000) * 200)})`
          : "#00ffcc";
      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barW * eased, barH2);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH2);
    }

    // ── Warning / white-out flash ──
    if (isBlowoff) {
      // Screen goes white-hot at peak
      const flashAlpha =
        blowProg > 0.8
          ? ((blowProg - 0.8) / 0.2) * 0.6
          : 0.15 * Math.abs(Math.sin(t * 12));
      ctx.fillStyle = `rgba(255,${Math.floor(200 - blowProg * 200)},${Math.floor(200 - blowProg * 200)},${flashAlpha})`;
      ctx.fillRect(0, 0, w, h);
    } else if (currentVal >= 8000) {
      const warnAlpha =
        0.08 * ((currentVal - 8000) / 1000) * Math.abs(Math.sin(t * 6));
      ctx.fillStyle = `rgba(255,100,0,${warnAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  drawCutsceneBg(ctx, w, h, bg, t) {
    switch (bg) {
      case "deep_space": {
        const grad = ctx.createRadialGradient(
          w / 2,
          h / 2,
          0,
          w / 2,
          h / 2,
          w * 0.7,
        );
        grad.addColorStop(0, "#0a0a2a");
        grad.addColorStop(0.5, "#050515");
        grad.addColorStop(1, "#000005");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Star field with twinkling
        for (let i = 0; i < 80; i++) {
          const seed = i * 127.1 + 7.3;
          const sx = (Math.sin(seed) * 0.5 + 0.5) * w;
          const sy = (Math.cos(seed * 1.3) * 0.5 + 0.5) * h;
          const twinkle =
            0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + (i % 5) * 0.3) + seed));
          const starSize = i % 3 === 0 ? 2 : 1;
          ctx.fillStyle = `rgba(200,220,255,${twinkle * 0.6})`;
          ctx.beginPath();
          ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Nebula cloud
        const nebula = ctx.createRadialGradient(
          w * 0.7,
          h * 0.3,
          0,
          w * 0.7,
          h * 0.3,
          w * 0.3,
        );
        nebula.addColorStop(
          0,
          `rgba(40,10,80,${0.15 + 0.05 * Math.sin(t * 0.5)})`,
        );
        nebula.addColorStop(0.5, "rgba(20,5,60,0.08)");
        nebula.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, w, h);

        // Second nebula on opposite side
        const nebula2 = ctx.createRadialGradient(
          w * 0.2,
          h * 0.7,
          0,
          w * 0.2,
          h * 0.7,
          w * 0.25,
        );
        nebula2.addColorStop(
          0,
          `rgba(10,30,80,${0.12 + 0.04 * Math.sin(t * 0.7 + 2)})`,
        );
        nebula2.addColorStop(0.5, "rgba(5,15,50,0.06)");
        nebula2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = nebula2;
        ctx.fillRect(0, 0, w, h);

        // === Shooting stars ===
        for (let i = 0; i < 3; i++) {
          const seed = i * 43.7;
          const cycle = Math.sin(t * 0.4 + seed);
          if (cycle > 0.7) {
            const life = (cycle - 0.7) / 0.3;
            const sx0 = (Math.sin(seed * 3.1) * 0.5 + 0.5) * w;
            const sy0 = (Math.cos(seed * 2.3) * 0.3 + 0.1) * h;
            const len = 40 + life * 60;
            ctx.strokeStyle = `rgba(220,240,255,${(1 - life) * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(sx0, sy0);
            ctx.lineTo(sx0 + len * 0.7, sy0 + len * 0.3);
            ctx.stroke();
          }
        }

        // === Star clusters ===
        const clusterCenters = [
          [w * 0.15, h * 0.25],
          [w * 0.8, h * 0.65],
        ];
        for (const [ccx, ccy] of clusterCenters) {
          for (let i = 0; i < 10; i++) {
            const seed = i * 17.9 + ccx * 0.01;
            const ox = Math.sin(seed) * 20;
            const oy = Math.cos(seed * 1.7) * 15;
            const ta = 0.15 + 0.15 * Math.abs(Math.sin(t * 0.8 + seed));
            ctx.fillStyle = `rgba(180,200,255,${ta})`;
            ctx.beginPath();
            ctx.arc(ccx + ox, ccy + oy, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // === Parallax drift on nebulae ===
        ctx.globalAlpha = 0.04;
        ctx.drawImage(ctx.canvas, t * 0.02, 0, w, h, 0, 0, w, h);
        ctx.globalAlpha = 1;
        break;
      }
      case "station": {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0a1020");
        grad.addColorStop(0.5, "#0d1828");
        grad.addColorStop(1, "#060c18");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Tech grid lines
        ctx.strokeStyle = "rgba(0,100,180,0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // Blinking panel lights
        for (let i = 0; i < 8; i++) {
          const lx = w * (0.08 + i * 0.12);
          const ly = h * (0.08 + (i % 3) * 0.12);
          const blink = Math.sin(t * (2 + i * 0.7) + i * 1.5) > 0.3;
          if (blink) {
            ctx.fillStyle = "rgba(0,180,255,0.2)";
            ctx.shadowColor = "#00aaff";
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(lx, ly, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.shadowBlur = 0;
        // Atmospheric haze
        const haze = ctx.createLinearGradient(0, h * 0.6, 0, h);
        haze.addColorStop(0, "rgba(0,40,80,0)");
        haze.addColorStop(1, "rgba(0,40,80,0.12)");
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, w, h);

        // === Pipe silhouettes ===
        const pipeXs = [w * 0.12, w * 0.55, w * 0.88];
        for (const px of pipeXs) {
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(px - 6, 0, 12, h);
          ctx.fillStyle = "rgba(80,160,220,0.06)";
          ctx.fillRect(px + 4, 0, 2, h);
        }

        // === Scrolling data strip ===
        const stripY = h * 0.15;
        ctx.fillStyle = "rgba(0,60,120,0.08)";
        ctx.fillRect(0, stripY - 4, w, 8);
        for (let i = 0; i < 20; i++) {
          const dx = ((i * 50 + t * 60) % (w + 40)) - 20;
          const da = 0.15 + 0.1 * Math.sin(i * 2.3);
          ctx.fillStyle = `rgba(0,180,255,${da})`;
          ctx.fillRect(dx, stripY - 2, 14 + (i % 3) * 6, 4);
        }

        // === Emergency rotation light ===
        const rlx = w * 0.5 + Math.cos(t * 2.5) * 18;
        const rly = h * 0.08 + Math.sin(t * 2.5) * 18;
        for (let trail = 4; trail >= 0; trail--) {
          const tAngle = t * 2.5 - trail * 0.15;
          const tx = w * 0.5 + Math.cos(tAngle) * 18;
          const ty = h * 0.08 + Math.sin(tAngle) * 18;
          const ta = (1 - trail / 4) * 0.4;
          ctx.fillStyle = `rgba(255,40,40,${ta})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 3 - trail * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowColor = "#ff2020";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "rgba(255,60,60,0.7)";
        ctx.beginPath();
        ctx.arc(rlx, rly, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
      case "boss_lair": {
        const grad = ctx.createRadialGradient(
          w / 2,
          h / 2,
          0,
          w / 2,
          h / 2,
          w * 0.6,
        );
        grad.addColorStop(0, "#1a0520");
        grad.addColorStop(0.5, "#10031a");
        grad.addColorStop(1, "#050008");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Pulsing energy veins
        ctx.strokeStyle = `rgba(200,30,60,${0.06 + 0.04 * Math.sin(t * 2)})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + t * 0.3;
          ctx.beginPath();
          ctx.moveTo(w / 2, h / 2);
          ctx.quadraticCurveTo(
            w / 2 + Math.cos(angle + 0.3) * w * 0.3,
            h / 2 + Math.sin(angle + 0.3) * h * 0.3,
            w / 2 + Math.cos(angle) * w * 0.7,
            h / 2 + Math.sin(angle) * h * 0.7,
          );
          ctx.stroke();
        }
        // Dark floating particles
        for (let i = 0; i < 20; i++) {
          const seed = i * 97.3;
          const px = (Math.sin(seed + t * 0.3) * 0.5 + 0.5) * w;
          const py = (Math.cos(seed * 0.7 + t * 0.2) * 0.5 + 0.5) * h;
          const pa = 0.1 + 0.08 * Math.sin(t + seed);
          ctx.fillStyle = `rgba(200,30,60,${pa})`;
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.sin(seed) * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Menacing fog
        const fog = ctx.createRadialGradient(
          w / 2,
          h * 0.8,
          0,
          w / 2,
          h * 0.8,
          w * 0.5,
        );
        fog.addColorStop(0, `rgba(80,0,20,${0.1 + 0.04 * Math.sin(t * 0.8)})`);
        fog.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, w, h);

        // === Clock face ===
        const clkR = Math.min(w, h) * 0.12;
        ctx.strokeStyle = "rgba(200,30,60,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, clkR, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          ctx.strokeStyle = "rgba(200,30,60,0.18)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(w / 2 + Math.cos(a) * (clkR - 6), h / 2 + Math.sin(a) * (clkR - 6));
          ctx.lineTo(w / 2 + Math.cos(a) * clkR, h / 2 + Math.sin(a) * clkR);
          ctx.stroke();
        }
        // Minute hand
        const handAngle = t * 0.5 - Math.PI / 2;
        ctx.strokeStyle = "rgba(255,60,80,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.lineTo(w / 2 + Math.cos(handAngle) * (clkR * 0.85), h / 2 + Math.sin(handAngle) * (clkR * 0.85));
        ctx.stroke();

        // === More aggressive veins (additional 4 → total 16) ===
        ctx.strokeStyle = `rgba(200,30,60,${0.08 + 0.05 * Math.sin(t * 2.5)})`;
        ctx.lineWidth = 3;
        for (let i = 12; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2 + t * 0.3;
          ctx.beginPath();
          ctx.moveTo(w / 2, h / 2);
          ctx.quadraticCurveTo(
            w / 2 + Math.cos(angle + 0.3) * w * 0.35,
            h / 2 + Math.sin(angle + 0.3) * h * 0.35,
            w / 2 + Math.cos(angle) * w * 0.75,
            h / 2 + Math.sin(angle) * h * 0.75,
          );
          ctx.stroke();
        }

        // === Ground fog ===
        const gfY = h * 0.85;
        const gf = ctx.createLinearGradient(0, gfY, 0, h);
        gf.addColorStop(0, "rgba(60,0,20,0)");
        gf.addColorStop(0.4, `rgba(60,0,20,${0.08 + 0.04 * Math.sin(t * 1.2)})`);
        gf.addColorStop(1, `rgba(40,0,10,${0.15 + 0.05 * Math.sin(t * 0.9)})`);
        ctx.fillStyle = gf;
        ctx.fillRect(0, gfY, w, h - gfY);
        break;
      }
      case "reactor": {
        // Act 2 industrial reactor background
        const rGrad = ctx.createLinearGradient(0, 0, 0, h);
        rGrad.addColorStop(0, "#1a0a00");
        rGrad.addColorStop(0.5, "#2a1400");
        rGrad.addColorStop(1, "#0a0400");
        ctx.fillStyle = rGrad;
        ctx.fillRect(0, 0, w, h);

        // Central pulsing reactor core
        const coreR = (0.08 + 0.025 * Math.sin(t * 1.5)) * Math.min(w, h);
        const core = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, coreR);
        core.addColorStop(0, "rgba(255,200,80,0.5)");
        core.addColorStop(0.4, "rgba(255,140,20,0.25)");
        core.addColorStop(0.7, "rgba(200,80,0,0.1)");
        core.addColorStop(1, "rgba(100,40,0,0)");
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, w, h);

        // Pipe silhouettes (7 pipes)
        const rpXs = [0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92];
        for (const frac of rpXs) {
          const px = w * frac;
          ctx.fillStyle = "rgba(10,5,0,0.5)";
          ctx.fillRect(px - 5, 0, 10, h);
          ctx.fillStyle = "rgba(255,160,60,0.04)";
          ctx.fillRect(px + 3, 0, 2, h);
        }

        // Heat shimmer
        ctx.strokeStyle = "rgba(255,180,80,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const shimY = h * 0.5;
        for (let x = 0; x < w; x += 3) {
          const sy = shimY + Math.sin(x * 0.05 + t * 3) * 4;
          x === 0 ? ctx.moveTo(x, sy) : ctx.lineTo(x, sy);
        }
        ctx.stroke();

        // Floating embers
        for (let i = 0; i < 12; i++) {
          const seed = i * 53.7;
          const ex = (Math.sin(seed) * 0.5 + 0.5) * w;
          const ey = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * h - t * (20 + i * 5)) % h;
          const ea = 0.3 + 0.3 * Math.abs(Math.sin(t * 2 + seed));
          ctx.fillStyle = `rgba(255,${140 + (i % 4) * 30},20,${ea})`;
          ctx.beginPath();
          ctx.arc(ex, (ey + h) % h, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Steam vents
        const ventXs = [rpXs[1], rpXs[3], rpXs[5]];
        for (let v = 0; v < ventXs.length; v++) {
          const vx = w * ventXs[v];
          const vy = h * (0.3 + v * 0.15);
          const va = 0.06 + 0.04 * Math.sin(t * 3 + v * 2.1);
          const steam = ctx.createRadialGradient(vx, vy, 0, vx, vy, 25);
          steam.addColorStop(0, `rgba(255,255,255,${va})`);
          steam.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = steam;
          ctx.fillRect(vx - 25, vy - 25, 50, 50);
        }
        break;
      }
      case "temporal_rift": {
        // Reality fracture background
        const trGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
        trGrad.addColorStop(0, "#0a001a");
        trGrad.addColorStop(0.5, "#14002a");
        trGrad.addColorStop(1, "#050010");
        ctx.fillStyle = trGrad;
        ctx.fillRect(0, 0, w, h);

        // Color shift via radial gradients
        const hueShift = t * 0.3;
        const csGrad = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.4);
        csGrad.addColorStop(0, `rgba(${80 + 40 * Math.sin(hueShift)},0,${120 + 40 * Math.cos(hueShift)},0.05)`);
        csGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = csGrad;
        ctx.fillRect(0, 0, w, h);

        // Central tear — jagged vertical line
        const tearX = w / 2;
        const tearTop = h * 0.3;
        const tearBot = h * 0.7;
        ctx.save();
        ctx.shadowColor = "rgba(200,30,80,0.6)";
        ctx.shadowBlur = 20;
        ctx.strokeStyle = "rgba(220,40,100,0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tearX, tearTop);
        for (let y = tearTop; y < tearBot; y += 12) {
          const jag = Math.sin(y * 0.15 + t * 2) * 8 + Math.sin(y * 0.3 + t) * 4;
          ctx.lineTo(tearX + jag, y);
        }
        ctx.lineTo(tearX, tearBot);
        ctx.stroke();
        // Glow layer
        ctx.strokeStyle = "rgba(160,20,200,0.2)";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(tearX, tearTop);
        for (let y = tearTop; y < tearBot; y += 12) {
          const jag = Math.sin(y * 0.15 + t * 2) * 8 + Math.sin(y * 0.3 + t) * 4;
          ctx.lineTo(tearX + jag, y);
        }
        ctx.lineTo(tearX, tearBot);
        ctx.stroke();
        ctx.restore();

        // Reality fragments — small rotated rectangles orbiting the tear
        const tearCy = (tearTop + tearBot) / 2;
        for (let i = 0; i < 10; i++) {
          const seed = i * 37.1;
          const orbitR = 40 + Math.sin(seed) * 25;
          const orbitA = (i / 10) * Math.PI * 2 + t * (0.2 + i * 0.03);
          const fx = tearX + Math.cos(orbitA) * orbitR;
          const fy = tearCy + Math.sin(orbitA) * orbitR * 0.6;
          const fa = 0.15 + 0.1 * Math.sin(t + seed);
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(orbitA * 2 + t * 0.5);
          ctx.fillStyle = `rgba(180,60,220,${fa})`;
          ctx.fillRect(-4, -3, 8, 6);
          ctx.restore();
        }

        // Lightning arcs from tear to edges
        for (let i = 0; i < 4; i++) {
          const seed = i * 19.3;
          const flicker = Math.sin(t * 8 + seed * 5);
          if (flicker > 0.2) {
            const la = (flicker - 0.2) * 0.4;
            const srcY = tearTop + (tearBot - tearTop) * (0.2 + i * 0.2);
            const destX = i < 2 ? w * (0.05 + i * 0.1) : w * (0.85 + (i - 2) * 0.1);
            const destY = h * (0.2 + Math.sin(seed) * 0.3);
            ctx.strokeStyle = `rgba(180,100,255,${la})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tearX, srcY);
            const midX = (tearX + destX) / 2 + Math.sin(t * 5 + seed) * 30;
            const midY = (srcY + destY) / 2 + Math.cos(t * 4 + seed) * 20;
            ctx.quadraticCurveTo(midX, midY, destX, destY);
            ctx.stroke();
          }
        }

        // Time distortion rings
        for (let r = 0; r < 2; r++) {
          const ringR = 60 + r * 35;
          const ringA = t * (0.3 + r * 0.15);
          ctx.save();
          ctx.translate(tearX, tearCy);
          ctx.rotate(ringA);
          ctx.strokeStyle = `rgba(140,60,200,${0.08 + 0.04 * Math.sin(t + r)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, ringR, ringR * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case "command_center": {
        // Tactical briefing background
        const ccGrad = ctx.createLinearGradient(0, 0, 0, h);
        ccGrad.addColorStop(0, "#000a14");
        ccGrad.addColorStop(0.5, "#001020");
        ccGrad.addColorStop(1, "#000810");
        ctx.fillStyle = ccGrad;
        ctx.fillRect(0, 0, w, h);

        // Holographic grid floor (perspective)
        const vpX = w / 2;
        const vpY = h * 0.45;
        const gridBottom = h * 0.95;
        ctx.strokeStyle = "rgba(0,200,255,0.06)";
        ctx.lineWidth = 1;
        // Converging vertical lines
        for (let i = -8; i <= 8; i++) {
          const bx = vpX + i * (w * 0.08);
          ctx.beginPath();
          ctx.moveTo(vpX + i * 2, vpY);
          ctx.lineTo(bx, gridBottom);
          ctx.stroke();
        }
        // Horizontal lines
        for (let j = 0; j < 8; j++) {
          const frac = j / 8;
          const gy = vpY + (gridBottom - vpY) * (frac * frac);
          const spread = frac * w * 0.65;
          ctx.beginPath();
          ctx.moveTo(vpX - spread, gy);
          ctx.lineTo(vpX + spread, gy);
          ctx.stroke();
        }

        // Data columns — scrolling rectangles
        const colXs = [0.18, 0.35, 0.65, 0.82, 0.5];
        for (let c = 0; c < colXs.length; c++) {
          const cx = w * colXs[c];
          ctx.fillStyle = "rgba(0,180,255,0.03)";
          ctx.fillRect(cx - 8, h * 0.2, 16, h * 0.55);
          for (let j = 0; j < 12; j++) {
            const dy = ((j * 30 + t * (40 + c * 15)) % (h * 0.55)) + h * 0.2;
            const da = 0.08 + 0.06 * Math.sin(j * 1.7 + c);
            ctx.fillStyle = `rgba(0,200,255,${da})`;
            ctx.fillRect(cx - 5, dy, 10, 3 + (j % 3) * 2);
          }
        }

        // Status indicators — colored dots at top
        const statusColors = [
          [0, 220, 80], [0, 220, 80], [255, 180, 0],
          [0, 220, 80], [255, 60, 40], [0, 220, 80],
          [255, 180, 0], [0, 220, 80],
        ];
        for (let i = 0; i < statusColors.length; i++) {
          const sx = w * (0.2 + i * 0.085);
          const sy = h * 0.06;
          const [sr, sg, sb] = statusColors[i];
          const blink = i === 4 || i === 6 ? Math.sin(t * (3 + i) + i) > 0 : true;
          if (blink) {
            ctx.fillStyle = `rgba(${sr},${sg},${sb},0.6)`;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Radar sweep
        const radarCx = w / 2;
        const radarCy = h * 0.45;
        const radarR = Math.min(w, h) * 0.12;
        const sweepAngle = t * 1.2;
        ctx.strokeStyle = "rgba(0,220,255,0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(radarCx, radarCy, radarR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,220,255,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(radarCx, radarCy);
        ctx.lineTo(
          radarCx + Math.cos(sweepAngle) * radarR,
          radarCy + Math.sin(sweepAngle) * radarR,
        );
        ctx.stroke();
        // Sweep trail
        for (let s = 1; s <= 6; s++) {
          const trailA = sweepAngle - s * 0.08;
          ctx.strokeStyle = `rgba(0,220,255,${0.15 - s * 0.02})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(radarCx, radarCy);
          ctx.lineTo(
            radarCx + Math.cos(trailA) * radarR,
            radarCy + Math.sin(trailA) * radarR,
          );
          ctx.stroke();
        }

        // Tactical display border with corner brackets
        const bPad = 20;
        const bLen = 30;
        ctx.strokeStyle = "rgba(0,200,255,0.15)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bPad, bPad, w - bPad * 2, h - bPad * 2);
        ctx.strokeStyle = "rgba(0,220,255,0.35)";
        ctx.lineWidth = 2;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(bPad, bPad + bLen);
        ctx.lineTo(bPad, bPad);
        ctx.lineTo(bPad + bLen, bPad);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(w - bPad - bLen, bPad);
        ctx.lineTo(w - bPad, bPad);
        ctx.lineTo(w - bPad, bPad + bLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bPad, h - bPad - bLen);
        ctx.lineTo(bPad, h - bPad);
        ctx.lineTo(bPad + bLen, h - bPad);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(w - bPad - bLen, h - bPad);
        ctx.lineTo(w - bPad, h - bPad);
        ctx.lineTo(w - bPad, h - bPad - bLen);
        ctx.stroke();
        break;
      }
      default: {
        ctx.fillStyle = "#020210";
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  drawCutsceneArt(ctx, w, h, art, t) {
    const cx = w / 2;
    const cy = h * 0.38;
    ctx.save();
    ctx.translate(cx, cy);

    // Base scale: proportional to screen — characters fill the scene
    const rawBaseScale = 2.0 * (h / 900);
    const baseScale = this.isTouchDevice
      ? Math.max(1.64, rawBaseScale)
      : rawBaseScale;
    ctx.scale(baseScale, baseScale);

    switch (art) {
      case "villain":
      case "villain_form2":
      case "villain_final": {
        const phase = art === "villain_final" ? 3 : art === "villain_form2" ? 2 : 1;
        this.drawParadoxAbomination(ctx, t, phase);
        break;
      }
      case "hero": {
        // Armored temporal agent — adult proportions (tall torso, long legs)
        const fadeIn = Math.min(1, t / 1.2);
        const scale = 0.9 + fadeIn * 0.1;
        ctx.scale(scale, scale);
        ctx.globalAlpha = fadeIn;

        // Glow aura
        const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
        glowGrad.addColorStop(0, "rgba(0,255,200,0.15)");
        glowGrad.addColorStop(1, "rgba(0,255,200,0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(-120, -120, 240, 240);

        // Cape (shoulder-length, not floor-length)
        ctx.fillStyle = "#6b1515";
        ctx.beginPath();
        ctx.moveTo(-16, -30);
        ctx.quadraticCurveTo(-26, 0, -22 + Math.sin(t * 2) * 3, 30);
        ctx.lineTo(-10 + Math.sin(t * 1.8) * 2, 28);
        ctx.quadraticCurveTo(-8, -5, -10, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#7a1818";
        ctx.beginPath();
        ctx.moveTo(-10, -30);
        ctx.quadraticCurveTo(-4, 5, 0 + Math.sin(t * 2.2) * 2, 32);
        ctx.lineTo(12 + Math.sin(t * 1.9) * 2, 30);
        ctx.quadraticCurveTo(8, 0, 4, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#5c1212";
        ctx.beginPath();
        ctx.moveTo(4, -30);
        ctx.quadraticCurveTo(18, -2, 20 + Math.sin(t * 2.4) * 3, 28);
        ctx.lineTo(22 + Math.sin(t * 2.1) * 2, 26);
        ctx.quadraticCurveTo(20, -6, 14, -30);
        ctx.closePath();
        ctx.fill();

        // Torso (wide, tall — adult proportions)
        ctx.fillStyle = "#2a3a4a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.lineTo(-16, 12);
        ctx.lineTo(16, 12);
        ctx.lineTo(14, -38);
        ctx.closePath();
        ctx.fill();

        // Chest plate (broad)
        ctx.fillStyle = "#334455";
        ctx.beginPath();
        ctx.moveTo(-10, -36);
        ctx.quadraticCurveTo(0, -30, 10, -36);
        ctx.lineTo(9, -16);
        ctx.quadraticCurveTo(0, -13, -9, -16);
        ctx.closePath();
        ctx.fill();

        // Pec detail lines
        ctx.strokeStyle = "#446688";
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = fadeIn * 0.4;
        ctx.beginPath();
        ctx.moveTo(-8, -30);
        ctx.quadraticCurveTo(-3, -27, 0, -30);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.quadraticCurveTo(3, -27, 8, -30);
        ctx.stroke();
        ctx.globalAlpha = fadeIn;

        // Abs detail lines
        ctx.strokeStyle = "#446688";
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = fadeIn * 0.3;
        for (let i = 0; i < 4; i++) {
          const ay = -12 + i * 5;
          ctx.beginPath();
          ctx.moveTo(-7, ay);
          ctx.lineTo(7, ay);
          ctx.stroke();
        }
        ctx.globalAlpha = fadeIn;

        // Belt
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(-15, 8, 30, 4);
        ctx.fillStyle = "#00aacc";
        ctx.fillRect(-3, 9, 6, 2);

        // Collar
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.quadraticCurveTo(0, -34, 14, -38);
        ctx.lineTo(12, -41);
        ctx.quadraticCurveTo(0, -37, -12, -41);
        ctx.closePath();
        ctx.fill();

        // Shoulder pauldrons (large, curved)
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#556688";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.stroke();

        // Neck
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-5, -46, 10, 8);

        // Helmet (shaped, not just a circle)
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-10, -48);
        ctx.quadraticCurveTo(-13, -56, -10, -64);
        ctx.quadraticCurveTo(0, -69, 10, -64);
        ctx.quadraticCurveTo(13, -56, 10, -48);
        ctx.quadraticCurveTo(0, -45, -10, -48);
        ctx.closePath();
        ctx.fill();

        // Helmet ridge
        ctx.strokeStyle = "#334466";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -66);
        ctx.quadraticCurveTo(0, -70, 5, -66);
        ctx.stroke();

        // Visor (curved, glowing)
        ctx.fillStyle = "#00aadd";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-8, -57);
        ctx.quadraticCurveTo(-10, -53, -7, -50);
        ctx.quadraticCurveTo(0, -48, 7, -50);
        ctx.quadraticCurveTo(10, -53, 8, -57);
        ctx.quadraticCurveTo(0, -59, -8, -57);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#00ddff";
        ctx.globalAlpha = fadeIn * 0.3;
        ctx.beginPath();
        ctx.moveTo(-6, -56);
        ctx.quadraticCurveTo(0, -58, 6, -56);
        ctx.quadraticCurveTo(4, -53, 0, -52);
        ctx.quadraticCurveTo(-4, -53, -6, -56);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = fadeIn;
        ctx.shadowBlur = 0;

        // Upper arms
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-18, -30);
        ctx.quadraticCurveTo(-22, -18, -20, -6);
        ctx.lineTo(-15, -6);
        ctx.quadraticCurveTo(-14, -18, -14, -30);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, -30);
        ctx.quadraticCurveTo(22, -18, 20, -6);
        ctx.lineTo(15, -6);
        ctx.quadraticCurveTo(14, -18, 14, -30);
        ctx.closePath();
        ctx.fill();

        // Forearms
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-21, -6, 6, 16);
        ctx.fillRect(15, -6, 6, 16);
        ctx.fillStyle = "#243d50";
        ctx.fillRect(-20, 0, 4, 5);
        ctx.fillRect(16, 0, 4, 5);

        // Fists
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-18, 12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Legs (long — adult proportions)
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-11, 12, 9, 32);
        ctx.fillRect(2, 12, 9, 32);
        // Knee detail
        ctx.fillStyle = "#243d50";
        ctx.fillRect(-10, 24, 7, 4);
        ctx.fillRect(3, 24, 7, 4);
        // Shin armor stripe
        ctx.fillStyle = "#2a4055";
        ctx.fillRect(-9, 32, 5, 6);
        ctx.fillRect(4, 32, 5, 6);

        // Boots
        ctx.fillStyle = "#111a22";
        ctx.fillRect(-12, 42, 10, 6);
        ctx.fillRect(2, 42, 10, 6);

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_armed": {
        // Armed temporal agent — adult proportions, rifle in hand
        const fadeIn = Math.min(1, t / 0.8);
        ctx.globalAlpha = fadeIn;

        // Glow
        const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 90);
        glowGrad.addColorStop(0, "rgba(0,255,200,0.2)");
        glowGrad.addColorStop(1, "rgba(0,255,200,0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(-120, -120, 240, 240);

        // Cape (shoulder-length, dramatic flow)
        ctx.fillStyle = "#8b1a1a";
        ctx.beginPath();
        ctx.moveTo(-16, -30);
        ctx.quadraticCurveTo(-30, 2, -26 + Math.sin(t * 2.5) * 4, 34);
        ctx.lineTo(-12 + Math.sin(t * 2) * 2, 32);
        ctx.quadraticCurveTo(-10, -3, -10, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#9a1e1e";
        ctx.beginPath();
        ctx.moveTo(-10, -30);
        ctx.quadraticCurveTo(-2, 6, 2 + Math.sin(t * 2.3) * 3, 36);
        ctx.lineTo(14 + Math.sin(t * 2.1) * 2, 34);
        ctx.quadraticCurveTo(10, 2, 4, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#6b1515";
        ctx.beginPath();
        ctx.moveTo(4, -30);
        ctx.quadraticCurveTo(20, 0, 24 + Math.sin(t * 2.6) * 4, 32);
        ctx.lineTo(26 + Math.sin(t * 2.2) * 2, 30);
        ctx.quadraticCurveTo(22, -4, 14, -30);
        ctx.closePath();
        ctx.fill();

        // Torso (wide, tall)
        ctx.fillStyle = "#2a3a4a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.lineTo(-16, 12);
        ctx.lineTo(16, 12);
        ctx.lineTo(14, -38);
        ctx.closePath();
        ctx.fill();

        // Chest plate
        ctx.fillStyle = "#334455";
        ctx.beginPath();
        ctx.moveTo(-10, -36);
        ctx.quadraticCurveTo(0, -30, 10, -36);
        ctx.lineTo(9, -16);
        ctx.quadraticCurveTo(0, -13, -9, -16);
        ctx.closePath();
        ctx.fill();

        // Belt
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(-15, 8, 30, 4);
        ctx.fillStyle = "#00aacc";
        ctx.fillRect(-3, 9, 6, 2);

        // Collar
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.moveTo(-14, -38);
        ctx.quadraticCurveTo(0, -34, 14, -38);
        ctx.lineTo(12, -41);
        ctx.quadraticCurveTo(0, -37, -12, -41);
        ctx.closePath();
        ctx.fill();

        // Pauldrons
        ctx.fillStyle = "#3a4a5a";
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#556688";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(-18, -36, 10, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(18, -36, 10, Math.PI, 0);
        ctx.stroke();

        // Neck
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-5, -46, 10, 8);

        // Helmet
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-10, -48);
        ctx.quadraticCurveTo(-13, -56, -10, -64);
        ctx.quadraticCurveTo(0, -69, 10, -64);
        ctx.quadraticCurveTo(13, -56, 10, -48);
        ctx.quadraticCurveTo(0, -45, -10, -48);
        ctx.closePath();
        ctx.fill();

        // Helmet ridge
        ctx.strokeStyle = "#334466";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -66);
        ctx.quadraticCurveTo(0, -70, 5, -66);
        ctx.stroke();

        // Visor
        ctx.fillStyle = "#00aadd";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-8, -57);
        ctx.quadraticCurveTo(-10, -53, -7, -50);
        ctx.quadraticCurveTo(0, -48, 7, -50);
        ctx.quadraticCurveTo(10, -53, 8, -57);
        ctx.quadraticCurveTo(0, -59, -8, -57);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Left arm (at side)
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.moveTo(-18, -30);
        ctx.quadraticCurveTo(-22, -18, -20, -6);
        ctx.lineTo(-15, -6);
        ctx.quadraticCurveTo(-14, -18, -14, -30);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-21, -6, 6, 16);
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-18, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Right arm + Rifle (held forward)
        ctx.fillStyle = "#1a2a3a";
        ctx.save();
        ctx.translate(18, -30);
        ctx.rotate(-0.3);
        // Upper arm
        ctx.fillRect(-3, 0, 7, 18);
        // Forearm + hand
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(0.5, 20, 3, 0, Math.PI * 2);
        ctx.fill();
        // Rifle
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(-2, 17, 36, 6);
        // Barrel
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(30, 18, 12, 4);
        // Magazine
        ctx.fillStyle = "#1a3a4a";
        ctx.fillRect(8, 23, 6, 10);
        // Muzzle glow
        ctx.fillStyle = "#00ccff";
        ctx.shadowColor = "#00ccff";
        ctx.shadowBlur = 10;
        ctx.fillRect(40, 18.5, 4, 3);
        ctx.shadowBlur = 0;
        // Rail
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(2, 16, 28, 2);
        ctx.restore();

        // Legs (long)
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-11, 12, 9, 32);
        ctx.fillRect(2, 12, 9, 32);
        ctx.fillStyle = "#243d50";
        ctx.fillRect(-10, 24, 7, 4);
        ctx.fillRect(3, 24, 7, 4);

        // Boots
        ctx.fillStyle = "#111a22";
        ctx.fillRect(-12, 42, 10, 6);
        ctx.fillRect(2, 42, 10, 6);

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_human": {
        // Unarmored agent in casual work clothes — adult male proportions
        const fadeIn = Math.min(1, t / 1.0);
        ctx.globalAlpha = fadeIn;

        // Hair (short, dark)
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.moveTo(-9, -62);
        ctx.quadraticCurveTo(-12, -68, -8, -72);
        ctx.quadraticCurveTo(0, -76, 8, -72);
        ctx.quadraticCurveTo(12, -68, 9, -62);
        ctx.closePath();
        ctx.fill();

        // Head (skin tone)
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.moveTo(-8, -48);
        ctx.quadraticCurveTo(-10, -56, -8, -64);
        ctx.quadraticCurveTo(0, -68, 8, -64);
        ctx.quadraticCurveTo(10, -56, 8, -48);
        ctx.quadraticCurveTo(0, -45, -8, -48);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-5, -58, 4, 3);
        ctx.fillRect(1, -58, 4, 3);
        ctx.fillStyle = "#2a4a3a";
        ctx.fillRect(-4, -57, 2, 2);
        ctx.fillRect(2, -57, 2, 2);

        // Eyebrows
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -60);
        ctx.lineTo(-1, -61);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -61);
        ctx.lineTo(6, -60);
        ctx.stroke();

        // Mouth
        ctx.strokeStyle = "#8a6050";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3, -50);
        ctx.quadraticCurveTo(0, -49, 3, -50);
        ctx.stroke();

        // Neck
        ctx.fillStyle = "#c8956c";
        ctx.fillRect(-4, -48, 8, 8);

        // Jacket/shirt (casual work — dark grey jacket, white shirt)
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-14, -40);
        ctx.lineTo(-16, 12);
        ctx.lineTo(16, 12);
        ctx.lineTo(14, -40);
        ctx.closePath();
        ctx.fill();

        // Shirt collar (white V-neck visible)
        ctx.fillStyle = "#d8d8d8";
        ctx.beginPath();
        ctx.moveTo(-5, -40);
        ctx.lineTo(0, -32);
        ctx.lineTo(5, -40);
        ctx.closePath();
        ctx.fill();

        // Jacket lapels
        ctx.strokeStyle = "#2a2a30";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-6, -40);
        ctx.lineTo(-8, -20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, -40);
        ctx.lineTo(8, -20);
        ctx.stroke();

        // ID badge clipped to pocket
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-12, -18, 6, 8);
        ctx.fillStyle = "#0066aa";
        ctx.fillRect(-11, -16, 4, 4);
        // Badge lanyard
        ctx.strokeStyle = "#0066aa";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-9, -18);
        ctx.quadraticCurveTo(-6, -30, -4, -40);
        ctx.stroke();

        // Belt
        ctx.fillStyle = "#2a2020";
        ctx.fillRect(-15, 8, 30, 4);
        ctx.fillStyle = "#888888";
        ctx.fillRect(-2, 9, 4, 2);

        // Arms (jacket sleeves)
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-14, -36);
        ctx.quadraticCurveTo(-20, -20, -18, -4);
        ctx.lineTo(-13, -4);
        ctx.quadraticCurveTo(-12, -20, -10, -36);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(14, -36);
        ctx.quadraticCurveTo(20, -20, 18, -4);
        ctx.lineTo(13, -4);
        ctx.quadraticCurveTo(12, -20, 10, -36);
        ctx.closePath();
        ctx.fill();

        // Hands (skin)
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.arc(-15.5, -2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15.5, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pants (dark slacks)
        ctx.fillStyle = "#2a2a33";
        ctx.fillRect(-11, 12, 9, 32);
        ctx.fillRect(2, 12, 9, 32);

        // Shoes
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-12, 42, 10, 5);
        ctx.fillRect(2, 42, 10, 5);

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_at_desk": {
        // Hero standing at front desk, secretary ignoring him
        const fadeIn = Math.min(1, t / 1.0);
        ctx.globalAlpha = fadeIn;

        // --- Front desk counter ---
        ctx.fillStyle = "#3a3022";
        ctx.fillRect(-60, 5, 120, 8);
        // Desk front panel
        ctx.fillStyle = "#2a2418";
        ctx.fillRect(-60, 13, 120, 35);
        // Desk edge highlight
        ctx.strokeStyle = "#4a4030";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-60, 5);
        ctx.lineTo(60, 5);
        ctx.stroke();

        // --- Secretary (right side, behind desk, looking at monitor) ---
        ctx.save();
        ctx.translate(28, 0);

        // Monitor
        ctx.fillStyle = "#111111";
        ctx.fillRect(10, -22, 20, 16);
        ctx.fillStyle = "#2244aa";
        ctx.fillRect(11, -21, 18, 14);
        // Screen glare
        ctx.fillStyle = "rgba(100,150,255,0.15)";
        ctx.fillRect(12, -20, 8, 6);
        // Monitor stand
        ctx.fillStyle = "#222222";
        ctx.fillRect(18, -6, 4, 6);

        // Hair (long, flowing — she's not looking at hero, facing her screen)
        ctx.fillStyle = "#2a1508";
        ctx.beginPath();
        ctx.moveTo(-6, -52);
        ctx.quadraticCurveTo(-10, -46, -10, -38);
        ctx.quadraticCurveTo(-12, -20, -10, -10);
        ctx.lineTo(-6, -10);
        ctx.quadraticCurveTo(-6, -30, -4, -42);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -52);
        ctx.quadraticCurveTo(10, -46, 10, -38);
        ctx.quadraticCurveTo(12, -20, 10, -10);
        ctx.lineTo(6, -10);
        ctx.quadraticCurveTo(6, -30, 4, -42);
        ctx.closePath();
        ctx.fill();

        // Face (turned toward monitor — 3/4 view)
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.moveTo(-6, -42);
        ctx.quadraticCurveTo(-8, -48, -6, -54);
        ctx.quadraticCurveTo(2, -58, 8, -54);
        ctx.quadraticCurveTo(10, -48, 8, -42);
        ctx.quadraticCurveTo(2, -39, -6, -42);
        ctx.closePath();
        ctx.fill();

        // Eye (one visible — looking at screen, NOT at hero)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(2, -50, 4, 2.5);
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(4, -49.5, 1.5, 1.5);

        // Eyelash
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(1, -50.5);
        ctx.lineTo(7, -51.5);
        ctx.stroke();

        // Lips
        ctx.fillStyle = "#cc6666";
        ctx.beginPath();
        ctx.moveTo(0, -43);
        ctx.quadraticCurveTo(3, -41.5, 6, -43);
        ctx.quadraticCurveTo(3, -42, 0, -43);
        ctx.closePath();
        ctx.fill();

        // Blouse (professional, teal)
        ctx.fillStyle = "#2a7a7a";
        ctx.beginPath();
        ctx.moveTo(-8, -36);
        ctx.lineTo(-10, 4);
        ctx.lineTo(10, 4);
        ctx.lineTo(8, -36);
        ctx.closePath();
        ctx.fill();

        // Necklace
        ctx.strokeStyle = "#ccaa44";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-4, -36);
        ctx.quadraticCurveTo(1, -32, 4, -36);
        ctx.stroke();
        ctx.fillStyle = "#ccaa44";
        ctx.beginPath();
        ctx.arc(1, -33, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Arm (on desk, typing — visible above counter)
        ctx.fillStyle = "#dba882";
        ctx.fillRect(8, -6, 10, 3);
        // Hand on keyboard area
        ctx.beginPath();
        ctx.arc(19, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // --- Hero (left side, standing at counter, facing desk) ---
        ctx.save();
        ctx.translate(-30, 0);

        // Head (3/4 view facing right toward desk)
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.moveTo(-7, -56);
        ctx.quadraticCurveTo(-10, -62, -7, -66);
        ctx.quadraticCurveTo(0, -69, 7, -66);
        ctx.quadraticCurveTo(10, -62, 7, -56);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.moveTo(-7, -44);
        ctx.quadraticCurveTo(-9, -52, -7, -58);
        ctx.quadraticCurveTo(0, -61, 7, -58);
        ctx.quadraticCurveTo(9, -52, 7, -44);
        ctx.quadraticCurveTo(0, -41, -7, -44);
        ctx.closePath();
        ctx.fill();
        // Eye (looking toward desk/secretary)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(2, -52, 3.5, 2.5);
        ctx.fillStyle = "#2a4a3a";
        ctx.fillRect(4, -51.5, 1.5, 1.5);

        // Neck
        ctx.fillStyle = "#c8956c";
        ctx.fillRect(-3, -44, 6, 6);

        // Jacket
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-12, -38);
        ctx.lineTo(-14, 12);
        ctx.lineTo(14, 12);
        ctx.lineTo(12, -38);
        ctx.closePath();
        ctx.fill();

        // Badge on chest
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(5, -26, 5, 7);
        ctx.fillStyle = "#0066aa";
        ctx.fillRect(6, -24, 3, 3);

        // Arm resting on counter
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(12, -34);
        ctx.quadraticCurveTo(18, -20, 16, -2);
        ctx.lineTo(11, -2);
        ctx.quadraticCurveTo(10, -18, 8, -34);
        ctx.closePath();
        ctx.fill();
        // Hand on counter
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.arc(14, -1, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Other arm at side
        ctx.fillStyle = "#3a3a44";
        ctx.beginPath();
        ctx.moveTo(-12, -34);
        ctx.quadraticCurveTo(-18, -18, -16, 0);
        ctx.lineTo(-11, 0);
        ctx.quadraticCurveTo(-10, -18, -8, -34);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.arc(-13.5, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Belt
        ctx.fillStyle = "#2a2020";
        ctx.fillRect(-13, 8, 26, 3);

        // Pants
        ctx.fillStyle = "#2a2a33";
        ctx.fillRect(-9, 12, 8, 28);
        ctx.fillRect(1, 12, 8, 28);

        // Shoes
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-10, 38, 9, 5);
        ctx.fillRect(1, 38, 9, 5);

        ctx.restore();

        ctx.globalAlpha = 1;
        break;
      }

      case "villain_legacy": {
        // ── THE BEHEMOTH — Industrial diving-suit titan ──
        const fadeIn = Math.min(1, t / 1.5);
        const breathe = 1 + Math.sin(t * 1.5) * 0.02;
        const pulse = (Math.sin(t * 3) + 1) * 0.5;
        ctx.scale(breathe * 1.5, breathe * 1.5);
        ctx.globalAlpha = fadeIn;

        // Industrial smoke aura
        const auraGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 110);
        auraGrad.addColorStop(0, "rgba(40,30,15,0.3)");
        auraGrad.addColorStop(0.6, "rgba(20,15,8,0.12)");
        auraGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-130, -130, 260, 260);

        // Cyan energy wisps
        for (let i = 0; i < 3; i++) {
          const angle = t * (1.5 + i * 0.4) + (i * Math.PI * 2) / 3;
          ctx.strokeStyle = `rgba(0,255,255,${0.1 + Math.sin(t * 3 + i) * 0.08})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, -10, 55 + i * 12, angle, angle + 0.6);
          ctx.stroke();
        }

        // Backpack / reactor housing
        ctx.fillStyle = "#1a1008";
        ctx.beginPath();
        ctx.moveTo(-28, -30);
        ctx.quadraticCurveTo(-34, 10, -30, 55);
        ctx.lineTo(30, 55);
        ctx.quadraticCurveTo(34, 10, 28, -30);
        ctx.closePath();
        ctx.fill();

        // Exhaust stacks
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#333";
          ctx.fillRect(side * 18 - 2, -55, 4, 18);
          ctx.fillStyle = "#71797e";
          ctx.fillRect(side * 18 - 3, -56, 6, 3);
          // Steam puffs
          ctx.fillStyle = `rgba(180,180,160,${0.12 + pulse * 0.08})`;
          for (let p = 0; p < 2; p++) {
            ctx.beginPath();
            ctx.arc(
              side * 18 + Math.sin(t * 2 + p) * 2,
              -58 - p * 5,
              2 + p * 1.5,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }

        // Heavy plated torso
        ctx.fillStyle = "#7a5c1d";
        ctx.beginPath();
        ctx.moveTo(-22, -30);
        ctx.lineTo(-25, -24);
        ctx.lineTo(-24, 10);
        ctx.lineTo(24, 10);
        ctx.lineTo(25, -24);
        ctx.lineTo(22, -30);
        ctx.closePath();
        ctx.fill();

        // Chest plate overlay
        ctx.fillStyle = "#b58e3d";
        ctx.beginPath();
        ctx.moveTo(-16, -27);
        ctx.lineTo(16, -27);
        ctx.lineTo(15, -5);
        ctx.lineTo(-15, -5);
        ctx.closePath();
        ctx.fill();

        // Chest rivets
        ctx.fillStyle = "#444";
        for (let r = 0; r < 4; r++) {
          ctx.beginPath();
          ctx.arc(-12 + r * 8, -25, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Reactor core porthole
        const coreY = -16;
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(0, coreY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b87333";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Cyan glow
        const coreGlow = ctx.createRadialGradient(0, coreY, 0, 0, coreY, 6);
        coreGlow.addColorStop(0, `rgba(0,255,255,${0.7 + pulse * 0.3})`);
        coreGlow.addColorStop(0.6, "rgba(0,255,255,0.2)");
        coreGlow.addColorStop(1, "rgba(0,255,255,0)");
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(0, coreY, 6, 0, Math.PI * 2);
        ctx.fill();
        // Grill bars
        ctx.strokeStyle = "#71797e";
        ctx.lineWidth = 1.5;
        for (let g = 0; g < 3; g++) {
          const gx = -4 + g * 4;
          ctx.beginPath();
          ctx.moveTo(gx, coreY - 5);
          ctx.lineTo(gx, coreY + 5);
          ctx.stroke();
        }

        // Massive pauldrons
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#b58e3d";
          ctx.beginPath();
          ctx.ellipse(side * 24, -28, 12, 6, side * 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#7a5c1d";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Pauldron spikes
          ctx.fillStyle = "#b87333";
          ctx.beginPath();
          ctx.moveTo(side * 28, -30);
          ctx.lineTo(side * 36, -28);
          ctx.lineTo(side * 28, -26);
          ctx.fill();
        }

        // Diving helmet — brass dome
        ctx.fillStyle = "#b58e3d";
        ctx.beginPath();
        ctx.arc(0, -42, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b87333";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Helmet seam
        ctx.strokeStyle = "#7a5c1d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -56);
        ctx.lineTo(0, -28);
        ctx.stroke();

        // Main porthole (single glowing eye)
        ctx.fillStyle = "#0a1a1a";
        ctx.beginPath();
        ctx.arc(0, -41, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b87333";
        ctx.lineWidth = 2;
        ctx.stroke();
        const eyeGrad = ctx.createRadialGradient(0, -41, 0, 0, -41, 4.5);
        eyeGrad.addColorStop(0, `rgba(0,255,255,${0.6 + pulse * 0.4})`);
        eyeGrad.addColorStop(0.6, "rgba(0,255,255,0.15)");
        eyeGrad.addColorStop(1, "rgba(0,255,255,0)");
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.arc(0, -41, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Side portholes
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(side * 8, -44, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(0,255,255,${0.2 + pulse * 0.1})`;
          ctx.beginPath();
          ctx.arc(side * 8, -44, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Chin guard
        ctx.fillStyle = "#71797e";
        ctx.beginPath();
        ctx.moveTo(-6, -34);
        ctx.lineTo(6, -34);
        ctx.lineTo(3, -30);
        ctx.lineTo(-3, -30);
        ctx.closePath();
        ctx.fill();

        // Arms — thick with drill/clamp
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#7a5c1d";
          ctx.fillRect(side * 24 - 4, -24, 8, 22);
          ctx.fillStyle = "#b58e3d";
          ctx.fillRect(side * 24 - 3, -18, 6, 4);
          ctx.fillRect(side * 24 - 3, -8, 6, 4);
          // Hand
          if (side > 0) {
            // Drill
            ctx.fillStyle = "#aaa";
            ctx.beginPath();
            ctx.moveTo(24, -1);
            ctx.lineTo(38, 2);
            ctx.lineTo(24, 5);
            ctx.closePath();
            ctx.fill();
          } else {
            // Clamp
            ctx.fillStyle = "#999";
            const jaw = 2 + Math.sin(t * 4) * 2;
            ctx.beginPath();
            ctx.moveTo(-24, 0 - jaw);
            ctx.lineTo(-36, -2);
            ctx.lineTo(-36, 0 - jaw + 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-24, 0 + jaw);
            ctx.lineTo(-36, 4);
            ctx.lineTo(-36, 0 + jaw - 2);
            ctx.fill();
          }
        }

        // Legs
        ctx.fillStyle = "#7a5c1d";
        ctx.fillRect(-10, 10, 8, 20);
        ctx.fillRect(2, 10, 8, 20);
        // Knee plates
        ctx.fillStyle = "#b58e3d";
        ctx.fillRect(-9, 18, 6, 4);
        ctx.fillRect(3, 18, 6, 4);
        // Boots
        ctx.fillStyle = "#0a0004";
        ctx.fillRect(-11, 28, 10, 5);
        ctx.fillRect(1, 28, 10, 5);

        ctx.globalAlpha = 1;
        break;
      }

      case "villain_form2_legacy": {
        // ── THE VOLCANIC TITAN — Cracked armor, exposed ember muscle ──
        const fadeIn = Math.min(1, t / 1.2);
        const breathe = 1 + Math.sin(t * 2) * 0.03;
        const pulse = (Math.sin(t * 4) + 1) * 0.5;
        const heavePulse = (Math.sin(t * 2.5) + 1) * 0.5;
        ctx.scale(breathe * 1.7, breathe * 1.7);
        ctx.globalAlpha = fadeIn;

        // Heat shimmer aura
        const auraGrad = ctx.createRadialGradient(0, -5, 15, 0, -5, 110);
        auraGrad.addColorStop(0, "rgba(80,20,0,0.35)");
        auraGrad.addColorStop(0.4, "rgba(40,8,0,0.15)");
        auraGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-130, -130, 260, 260);

        // Rising heat particles
        for (let h = 0; h < 5; h++) {
          const hx = Math.sin(h * 1.7 + t * 2) * 22;
          const hy = -50 - ((t * 30 + h * 25) % 40);
          ctx.fillStyle = `rgba(255,120,20,${0.08 + Math.sin(h + t * 3) * 0.04})`;
          ctx.beginPath();
          ctx.arc(hx, hy, 2 + Math.sin(h * 2) * 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ember corona arcs
        for (let i = 0; i < 4; i++) {
          const angle = t * (2 + i * 0.5) + (i * Math.PI) / 2;
          ctx.strokeStyle = `rgba(255,100,0,${0.2 + Math.sin(t * 4 + i) * 0.15})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -8, 50 + i * 10, angle, angle + 0.7);
          ctx.stroke();
        }

        // Massive muscle torso — dark red/brown flesh
        ctx.fillStyle = "#3a1515";
        ctx.beginPath();
        ctx.moveTo(-26, -28);
        ctx.quadraticCurveTo(-30, 10, -27, 55);
        ctx.lineTo(27, 55);
        ctx.quadraticCurveTo(30, 10, 26, -28);
        ctx.closePath();
        ctx.fill();

        // Pectoral muscle definition
        for (const side of [-1, 1]) {
          const pecGrad = ctx.createRadialGradient(
            side * 8,
            -18,
            2,
            side * 8,
            -18,
            10,
          );
          pecGrad.addColorStop(0, "#4a2020");
          pecGrad.addColorStop(1, "#3a1515");
          ctx.fillStyle = pecGrad;
          ctx.beginPath();
          ctx.ellipse(side * 8, -18, 10, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Abs visible
        ctx.fillStyle = "#4a1818";
        for (let row = 0; row < 3; row++) {
          for (const side of [-0.5, 0.5]) {
            ctx.beginPath();
            ctx.ellipse(side * 5, -4 + row * 7, 3.5, 2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Cracked armor fragments — obsidian plates clinging to body
        ctx.fillStyle = "#2a0a0a";
        // Left chest fragment
        ctx.beginPath();
        ctx.moveTo(-18, -26);
        ctx.lineTo(-4, -24);
        ctx.lineTo(-6, -12);
        ctx.lineTo(-20, -15);
        ctx.closePath();
        ctx.fill();
        // Right chest fragment — smaller
        ctx.beginPath();
        ctx.moveTo(5, -23);
        ctx.lineTo(16, -25);
        ctx.lineTo(14, -14);
        ctx.closePath();
        ctx.fill();
        // Lower plate
        ctx.beginPath();
        ctx.moveTo(-10, 8);
        ctx.lineTo(8, 6);
        ctx.lineTo(9, 16);
        ctx.lineTo(-11, 18);
        ctx.closePath();
        ctx.fill();

        // Ember vein cracks glowing through
        ctx.lineWidth = 1.5;
        const crackAlpha = 0.5 + pulse * 0.3;
        const crackPaths = [
          [
            [-4, -24],
            [-1, -14],
            [3, -4],
          ],
          [
            [14, -14],
            [10, -4],
            [9, 8],
          ],
          [
            [-18, -15],
            [-14, -5],
            [-15, 8],
          ],
          [
            [-5, 6],
            [0, 12],
            [4, 18],
          ],
        ];
        for (const path of crackPaths) {
          // Glow bloom
          ctx.strokeStyle = `rgba(255,100,0,${crackAlpha * 0.3})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(path[0][0], path[0][1]);
          for (let i = 1; i < path.length; i++)
            ctx.lineTo(path[i][0], path[i][1]);
          ctx.stroke();
          // Bright core
          ctx.strokeStyle = `rgba(255,100,0,${crackAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(path[0][0], path[0][1]);
          for (let i = 1; i < path.length; i++)
            ctx.lineTo(path[i][0], path[i][1]);
          ctx.stroke();
        }

        // Molten core — exposed through shattered chest
        const mCoreGrad = ctx.createRadialGradient(
          0,
          -15,
          0,
          0,
          -15,
          8 + heavePulse * 2,
        );
        mCoreGrad.addColorStop(0, `rgba(255,200,50,0.9)`);
        mCoreGrad.addColorStop(0.4, `rgba(255,100,0,0.6)`);
        mCoreGrad.addColorStop(1, `rgba(200,40,0,0)`);
        ctx.fillStyle = mCoreGrad;
        ctx.beginPath();
        ctx.arc(0, -15, 8 + heavePulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,240,200,${0.5 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, -15, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Massive shoulders — bulging muscle with armor fragments
        for (const side of [-1, 1]) {
          // Trap muscle bulge
          ctx.fillStyle = "#3a1515";
          ctx.beginPath();
          ctx.ellipse(side * 18, -28, 12, 5, side * 0.2, 0, Math.PI * 2);
          ctx.fill();
          // Remaining pauldron fragment
          ctx.fillStyle = "#2a0a0a";
          ctx.beginPath();
          ctx.ellipse(side * 22, -30, 6, 3, side * 0.3, 0, Math.PI);
          ctx.fill();
          // Shoulder ember vein
          ctx.strokeStyle = `rgba(255,100,0,${0.3 + pulse * 0.15})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(side * 8, -27);
          ctx.quadraticCurveTo(side * 15, -32, side * 22, -28);
          ctx.stroke();
        }

        // Head — partially destroyed helmet, face visible
        // Thick neck
        ctx.fillStyle = "#3a1515";
        ctx.fillRect(-5, -32, 10, 6);
        // Neck veins
        ctx.strokeStyle = "rgba(255,100,0,0.25)";
        ctx.lineWidth = 1;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 2, -28);
          ctx.quadraticCurveTo(side * 4, -34, side * 3, -38);
          ctx.stroke();
        }
        // Remaining helmet — cracked on one side
        ctx.fillStyle = "#2a0a0a";
        ctx.beginPath();
        ctx.arc(0, -42, 11, -Math.PI * 0.8, Math.PI * 0.3);
        ctx.closePath();
        ctx.fill();
        // Exposed face
        ctx.fillStyle = "#4a1a1a";
        ctx.beginPath();
        ctx.arc(2, -42, 9, 0, Math.PI * 2);
        ctx.fill();
        // Blazing eyes
        for (const side of [-1, 1]) {
          const eyeX = side * 4 + 1;
          ctx.fillStyle = "#1a0505";
          ctx.beginPath();
          ctx.ellipse(eyeX, -43, 3, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          const eyeGrad = ctx.createRadialGradient(
            eyeX,
            -43,
            0,
            eyeX,
            -43,
            2.5,
          );
          eyeGrad.addColorStop(0, `rgba(255,220,100,${0.8 + pulse * 0.2})`);
          eyeGrad.addColorStop(0.6, "rgba(255,80,0,0.4)");
          eyeGrad.addColorStop(1, "rgba(200,30,0,0)");
          ctx.fillStyle = eyeGrad;
          ctx.beginPath();
          ctx.ellipse(eyeX, -43, 2.5, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Broken porthole on helmet remains
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(-5, -40, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,80,0,${0.2 + pulse * 0.15})`;
        ctx.beginPath();
        ctx.arc(-5, -40, 2, 0, Math.PI * 2);
        ctx.fill();

        // Arms — massive exposed muscle
        for (const side of [-1, 1]) {
          ctx.fillStyle = "#3a1515";
          ctx.fillRect(side * 24 - 5, -24, 10, 26);
          // Bicep highlight
          ctx.fillStyle = "#4a2020";
          ctx.beginPath();
          ctx.ellipse(side * 24 + side * 2, -14, 4, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Arm veins
          ctx.strokeStyle = `rgba(255,100,0,${0.25 + pulse * 0.1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(side * 24 + side, -22);
          ctx.lineTo(side * 24 + side * 2, -8);
          ctx.stroke();
          // Fist — ember knuckles
          ctx.fillStyle = "#3a1515";
          ctx.beginPath();
          ctx.arc(side * 24, 4, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,100,0,${0.2 + pulse * 0.15})`;
          ctx.beginPath();
          ctx.arc(side * 24 + side * 2, 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Legs — tree-trunk muscle
        ctx.fillStyle = "#3a1515";
        ctx.fillRect(-12, 10, 10, 22);
        ctx.fillRect(2, 10, 10, 22);
        // Remaining shin armor
        ctx.fillStyle = "#2a0a0a";
        ctx.fillRect(-10, 18, 6, 8);
        ctx.fillRect(4, 18, 6, 8);
        // Boots
        ctx.fillStyle = "#1a0505";
        ctx.fillRect(-13, 30, 12, 5);
        ctx.fillRect(1, 30, 12, 5);

        // Molten drip particles
        for (let d = 0; d < 3; d++) {
          const dx = Math.sin(d * 2.1) * 15;
          const dy = 35 + ((t * 25 + d * 20) % 20);
          const dAlpha = 0.25 - ((dy - 35) / 20) * 0.25;
          if (dAlpha > 0) {
            ctx.fillStyle = `rgba(255,120,0,${dAlpha})`;
            ctx.beginPath();
            ctx.ellipse(dx, dy, 1.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1;
        break;
      }

      case "villain_final_legacy": {
        // ── THE COSMIC ENTITY — Void body, starfield, dimensional tears ──
        const fadeIn = Math.min(1, t / 1.5);
        const breathe = 1 + Math.sin(t * 1.5) * 0.03;
        const pulse = (Math.sin(t * 5) + 1) * 0.5;
        const cosmicPulse = (Math.sin(t * 2) + 1) * 0.5;
        ctx.scale(breathe * 2.0, breathe * 2.0);
        ctx.globalAlpha = fadeIn;

        // Reality distortion field
        const distGrad = ctx.createRadialGradient(0, -10, 10, 0, -10, 100);
        distGrad.addColorStop(0, "rgba(40,0,80,0.3)");
        distGrad.addColorStop(0.3, "rgba(20,0,60,0.12)");
        distGrad.addColorStop(0.6, "rgba(10,0,40,0.06)");
        distGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = distGrad;
        ctx.fillRect(-120, -120, 240, 240);

        // Dimensional rift tears
        for (let r = 0; r < 3; r++) {
          const rAng = t * 1 + r * Math.PI * 0.67;
          const rDist = 55 + Math.sin(t * 3 + r) * 10;
          const rx = Math.cos(rAng) * rDist;
          const ry = -10 + Math.sin(rAng) * rDist * 0.4;
          const rLen = 10 + Math.sin(t * 4 + r * 2) * 4;
          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(t * 2 + r);
          ctx.strokeStyle = `rgba(120,40,200,${0.12 + pulse * 0.08})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(-rLen, 0);
          ctx.lineTo(-rLen * 0.3, -2);
          ctx.lineTo(rLen * 0.3, 2);
          ctx.lineTo(rLen, 0);
          ctx.stroke();
          ctx.strokeStyle = `rgba(200,200,255,${0.3 + pulse * 0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-rLen, 0);
          ctx.lineTo(-rLen * 0.3, -2);
          ctx.lineTo(rLen * 0.3, 2);
          ctx.lineTo(rLen, 0);
          ctx.stroke();
          ctx.restore();
        }

        // Orbiting reality rings
        for (let ring = 0; ring < 3; ring++) {
          const ringR = 45 + ring * 12 + Math.sin(t * 2 + ring) * 3;
          const ringRot = t * (ring % 2 === 0 ? 1 : -1) + ring * 0.8;
          ctx.strokeStyle =
            ring % 2 === 0
              ? `rgba(120,60,200,${0.12 + cosmicPulse * 0.08})`
              : `rgba(60,140,255,${0.1 + cosmicPulse * 0.06})`;
          ctx.lineWidth = 1 + ring * 0.2;
          ctx.beginPath();
          ctx.ellipse(0, -10, ringR, ringR * 0.2, ringRot, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Void body — humanoid silhouette
        ctx.save();
        ctx.beginPath();
        // Head
        ctx.arc(0, -42, 11, 0, Math.PI * 2);
        // Torso
        ctx.moveTo(-18, -28);
        ctx.quadraticCurveTo(-22, 5, -19, 45);
        ctx.lineTo(19, 45);
        ctx.quadraticCurveTo(22, 5, 18, -28);
        ctx.closePath();
        // Arms
        for (const side of [-1, 1]) {
          ctx.moveTo(side * 18, -25);
          ctx.quadraticCurveTo(side * 32, 0, side * 24, 30);
          ctx.lineTo(side * 20, 30);
          ctx.quadraticCurveTo(side * 28, 2, side * 15, -22);
        }
        ctx.clip();

        // Fill with deep void
        ctx.fillStyle = "#0a0010";
        ctx.fillRect(-40, -60, 80, 110);

        // Starfield inside body
        for (let s = 0; s < 35; s++) {
          const sx = Math.sin(s * 127.1 + 42) * 22;
          const sy = -50 + Math.sin(s * 311.7 + 42) * 30 + 35;
          const sBright = 0.25 + Math.sin(t * 3 + s * 0.7) * 0.25;
          const sSize = 0.8 + Math.sin(s * 73.1) * 0.4;
          ctx.fillStyle =
            s % 5 === 0
              ? `rgba(180,140,255,${sBright})`
              : s % 3 === 0
                ? `rgba(100,180,255,${sBright})`
                : `rgba(220,220,255,${sBright})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Swirling nebula
        for (let n = 0; n < 2; n++) {
          const nx = Math.sin(t * 0.8 + n * 2) * 8;
          const ny = -10 + Math.cos(t * 0.6 + n * 3) * 10;
          const nR = 12 + n * 4;
          const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nR);
          nebGrad.addColorStop(
            0,
            n === 0 ? "rgba(100,30,160,0.12)" : "rgba(30,80,160,0.1)",
          );
          nebGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = nebGrad;
          ctx.beginPath();
          ctx.arc(nx, ny, nR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore(); // end body clip

        // Body edge glow
        ctx.strokeStyle = `rgba(120,40,200,${0.2 + pulse * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-18, -28);
        ctx.quadraticCurveTo(-22, 5, -19, 45);
        ctx.lineTo(19, 45);
        ctx.quadraticCurveTo(22, 5, 18, -28);
        ctx.closePath();
        ctx.stroke();

        // Cosmic crown / halo
        ctx.strokeStyle = `rgba(200,200,255,${0.15 + cosmicPulse * 0.12})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, -55, 18, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(200,160,255,${0.25 + cosmicPulse * 0.15})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -55, 15, 3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Crown spikes — cosmic geometry
        for (let sp = 0; sp < 7; sp++) {
          const spAng = -Math.PI * 0.8 + (Math.PI * 1.6 * sp) / 6;
          const spBase = 11;
          const spTip = 20 + Math.sin(t * 4 + sp) * 2;
          const bx = Math.cos(spAng) * spBase;
          const by = -55 + Math.sin(spAng) * spBase * 0.3;
          const tx = Math.cos(spAng) * spTip;
          const ty = -55 + Math.sin(spAng) * spTip * 0.3;
          // Spike glow
          ctx.strokeStyle = `rgba(120,40,200,${0.12 + pulse * 0.08})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          // Spike core
          ctx.strokeStyle = `rgba(200,200,255,${0.35 + pulse * 0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          // Tip orb
          ctx.fillStyle = `rgba(200,200,255,${0.4 + pulse * 0.2})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Eyes — cosmic void with bright pupils
        for (const side of [-1, 1]) {
          const eyeX = side * 4;
          const eyeGrad = ctx.createRadialGradient(eyeX, -43, 0, eyeX, -43, 4);
          eyeGrad.addColorStop(0, `rgba(255,255,255,${0.7 + pulse * 0.3})`);
          eyeGrad.addColorStop(0.4, "rgba(120,40,200,0.5)");
          eyeGrad.addColorStop(1, "rgba(120,40,200,0)");
          ctx.fillStyle = eyeGrad;
          ctx.beginPath();
          ctx.ellipse(eyeX, -43, 4, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Third eye — center forehead
        const teGrad = ctx.createRadialGradient(0, -48, 0, 0, -48, 3);
        teGrad.addColorStop(0, `rgba(255,200,255,0.8)`);
        teGrad.addColorStop(0.5, "rgba(120,40,200,0.4)");
        teGrad.addColorStop(1, "rgba(120,40,200,0)");
        ctx.fillStyle = teGrad;
        ctx.beginPath();
        ctx.arc(0, -48, 3, 0, Math.PI * 2);
        ctx.fill();

        // Floating armor fragments
        for (let f = 0; f < 6; f++) {
          const fAng = t * 1.5 + f * Math.PI * 0.33;
          const fDist = 35 + Math.sin(f * 1.3) * 5 + Math.sin(t * 2 + f) * 3;
          const fx = Math.cos(fAng) * fDist;
          const fy = -10 + Math.sin(fAng) * fDist * 0.4;
          const fSize = 3 + Math.sin(f * 2.7) * 1;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(t * 3 + f * 1.5);
          ctx.fillStyle = `rgba(30,10,50,${0.4 + Math.sin(t * 4 + f) * 0.15})`;
          ctx.fillRect(-fSize, -fSize * 0.5, fSize * 2, fSize);
          ctx.strokeStyle = `rgba(120,40,200,${0.2 + pulse * 0.1})`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-fSize, -fSize * 0.5, fSize * 2, fSize);
          ctx.restore();
        }

        // Energy tendrils from hands
        for (const side of [-1, 1]) {
          const handX = side * 24;
          const handY = 30;
          for (let tr = 0; tr < 2; tr++) {
            const tAng = side * (0.4 + tr * 0.5) + Math.sin(t * 3 + tr) * 0.2;
            const tLen = 10 + tr * 5 + Math.sin(t * 4 + tr * 2) * 3;
            const tx = handX + Math.cos(tAng) * tLen;
            const ty = handY + Math.sin(tAng) * tLen * 0.6;
            ctx.strokeStyle = `rgba(120,40,200,${0.08 + pulse * 0.06})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.quadraticCurveTo(
              (handX + tx) * 0.5 + Math.sin(t * 5 + tr) * 4,
              (handY + ty) * 0.5,
              tx,
              ty,
            );
            ctx.stroke();
            ctx.strokeStyle = `rgba(200,200,255,${0.2 + pulse * 0.15})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.quadraticCurveTo(
              (handX + tx) * 0.5 + Math.sin(t * 5 + tr) * 4,
              (handY + ty) * 0.5,
              tx,
              ty,
            );
            ctx.stroke();
          }
        }

        // Void singularity at center
        const singGrad = ctx.createRadialGradient(0, -10, 0, 0, -10, 10);
        singGrad.addColorStop(0, "rgba(0,0,0,0.8)");
        singGrad.addColorStop(0.3, "rgba(40,0,80,0.4)");
        singGrad.addColorStop(0.7, "rgba(120,40,200,0.15)");
        singGrad.addColorStop(1, "rgba(120,40,200,0)");
        ctx.fillStyle = singGrad;
        ctx.beginPath();
        ctx.arc(0, -10, 10, 0, Math.PI * 2);
        ctx.fill();
        // Accretion disk
        ctx.strokeStyle = `rgba(200,160,255,${0.2 + pulse * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, -10, 12, 2.5, t * 1, 0, Math.PI * 2);
        ctx.stroke();

        // Cosmic particles
        for (let p = 0; p < 8; p++) {
          const pAng = t * 1 + p * Math.PI * 0.25;
          const pDist = 50 + Math.sin(t * 3 + p * 1.5) * 10;
          const px = Math.cos(pAng) * pDist;
          const py = -10 + Math.sin(pAng) * pDist * 0.5;
          const pBright = 0.15 + Math.sin(t * 5 + p) * 0.1;
          ctx.fillStyle =
            p % 3 === 0
              ? `rgba(120,40,200,${pBright})`
              : p % 3 === 1
                ? `rgba(60,140,255,${pBright})`
                : `rgba(200,200,255,${pBright})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5 + Math.sin(p * 4.1) * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        break;
      }

      case "hero_fallen": {
        // Hero defeated — lying on the ground, scaled up to fill the scene
        const fadeIn = Math.min(1, t / 1.5);
        ctx.globalAlpha = fadeIn;
        ctx.scale(1.8, 1.8); // Much bigger fallen hero

        // Dim glow (fading)
        const dimGrad = ctx.createRadialGradient(0, 15, 10, 0, 15, 80);
        dimGrad.addColorStop(0, "rgba(0,100,80,0.12)");
        dimGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = dimGrad;
        ctx.fillRect(-100, -60, 200, 140);

        // Ground shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(0, 35, 50, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body (lying horizontal)
        ctx.save();
        ctx.translate(0, 10);
        ctx.rotate(Math.PI / 2.2);

        // Cape (crumpled, larger)
        ctx.fillStyle = "#4a1010";
        ctx.fillRect(-14, -8, 28, 40);
        // Cape tattered edge
        ctx.fillStyle = "#3a0808";
        ctx.beginPath();
        ctx.moveTo(-14, 32);
        ctx.lineTo(-16, 38);
        ctx.lineTo(-8, 35);
        ctx.lineTo(0, 40);
        ctx.lineTo(8, 35);
        ctx.lineTo(14, 38);
        ctx.lineTo(14, 32);
        ctx.closePath();
        ctx.fill();

        // Body (larger)
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-10, -30, 20, 38);

        // Armor detail lines
        ctx.strokeStyle = "rgba(0,200,255,0.15)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-8, -20);
        ctx.lineTo(-8, 5);
        ctx.moveTo(8, -20);
        ctx.lineTo(8, 5);
        ctx.stroke();

        // Helmet (cracked — visor flickering)
        ctx.fillStyle = "#1a2a3a";
        ctx.beginPath();
        ctx.arc(0, -38, 12, 0, Math.PI * 2);
        ctx.fill();
        // Visor (flickering)
        ctx.fillStyle = `rgba(0,255,200,${0.2 + Math.sin(t * 8) * 0.15})`;
        ctx.fillRect(-7, -41, 14, 3);
        // Visor crack
        ctx.strokeStyle = "rgba(255,100,50,0.6)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-2, -41);
        ctx.lineTo(3, -38);
        ctx.stroke();

        // Crack lines on armor (more prominent)
        ctx.strokeStyle = "rgba(255,100,50,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-4, -24);
        ctx.lineTo(3, -14);
        ctx.lineTo(-2, -4);
        ctx.lineTo(4, 4);
        ctx.stroke();

        // Arm reaching out
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(10, -20, 18, 6);
        // Hand
        ctx.fillStyle = "#2a3a4a";
        ctx.beginPath();
        ctx.arc(28, -17, 4, 0, Math.PI * 2);
        ctx.fill();

        // Sparking energy fragments around the body
        for (let i = 0; i < 4; i++) {
          const px = Math.cos(t * 3 + i * 1.5) * (25 + i * 8);
          const py = Math.sin(t * 2.5 + i * 2) * 15 - 10;
          ctx.fillStyle = `rgba(0,255,200,${0.15 + Math.sin(t * 5 + i) * 0.1})`;
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }

        ctx.restore();

        ctx.globalAlpha = 1;
        break;
      }

      case "party": {
        // The five-person squad — silhouettes with class identifiers
        const fadeIn = Math.min(1, t / 1.2);
        ctx.globalAlpha = fadeIn;

        // Group glow
        const partyGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 130);
        partyGrad.addColorStop(0, "rgba(0,200,255,0.1)");
        partyGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = partyGrad;
        ctx.fillRect(-140, -80, 280, 160);

        const members = [
          { x: -56, color: "#4488ff", visor: "#4488ff", label: "KAEL" }, // Vanguard
          { x: -28, color: "#ffaa44", visor: "#ffaa44", label: "LYRA" }, // Chrono-Analyst
          { x: 0, color: "#00ffcc", visor: "#00ffcc", label: "YOU" }, // Agent
          { x: 28, color: "#ff4488", visor: "#ff4488", label: "NOVA" }, // Striker
          { x: 56, color: "#44ff88", visor: "#44ff88", label: "ROOK" }, // Engineer
        ];

        for (const m of members) {
          ctx.save();
          ctx.translate(m.x, 0);

          // Cape (small)
          ctx.fillStyle =
            m.label === "YOU"
              ? "#6b1515"
              : m.label === "LYRA"
                ? "#3a2a10"
                : "#1a2a3a";
          ctx.beginPath();
          ctx.moveTo(-6, -12);
          ctx.quadraticCurveTo(-9, 8, -8 + Math.sin(t * 2 + m.x) * 1.5, 28);
          ctx.lineTo(8 + Math.sin(t * 2.3 + m.x) * 1, 27);
          ctx.quadraticCurveTo(9, 8, 6, -12);
          ctx.closePath();
          ctx.fill();

          // Body
          ctx.fillStyle = "#2a3a4a";
          ctx.fillRect(-6, -22, 12, 22);

          // Helmet
          ctx.fillStyle = "#1a2a3a";
          ctx.beginPath();
          ctx.arc(0, -28, 7, 0, Math.PI * 2);
          ctx.fill();

          // Visor (class-colored)
          ctx.fillStyle = m.visor;
          ctx.shadowColor = m.visor;
          ctx.shadowBlur = 6;
          ctx.fillRect(-4, -30, 8, 2);
          ctx.shadowBlur = 0;

          // Shoulders
          ctx.fillStyle = "#3a4a5a";
          ctx.fillRect(-9, -20, 4, 7);
          ctx.fillRect(5, -20, 4, 7);

          // Legs
          ctx.fillStyle = "#1a2a3a";
          ctx.fillRect(-4, 0, 3.5, 12);
          ctx.fillRect(0.5, 0, 3.5, 12);

          // Class indicator glow at feet
          ctx.fillStyle = m.color;
          ctx.globalAlpha = 0.3 + Math.sin(t * 2 + m.x * 0.1) * 0.15;
          ctx.fillRect(-5, 13, 10, 2);
          ctx.globalAlpha = fadeIn;

          // Name label
          ctx.fillStyle = m.color;
          ctx.font = "bold 6px monospace";
          ctx.textAlign = "center";
          ctx.fillText(m.label, 0, 22);

          ctx.restore();
        }

        ctx.globalAlpha = 1;
        break;
      }

      case "lyra": {
        // LYRA — The Chrono-Analyst, holographic data displays around her
        const fadeIn = Math.min(1, t / 1.0);
        ctx.globalAlpha = fadeIn;

        // Ambient glow
        const lyraGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
        lyraGlow.addColorStop(0, "rgba(255,170,68,0.12)");
        lyraGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = lyraGlow;
        ctx.fillRect(-100, -80, 200, 160);

        // Holographic data panels floating around her
        const panelAlpha = 0.15 + Math.sin(t * 1.5) * 0.08;
        ctx.save();
        // Left panel
        ctx.translate(-55, -20);
        ctx.rotate(-0.15 + Math.sin(t * 0.8) * 0.03);
        ctx.fillStyle = `rgba(255,170,68,${panelAlpha})`;
        ctx.fillRect(0, 0, 28, 40);
        ctx.strokeStyle = `rgba(255,170,68,${panelAlpha + 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(0, 0, 28, 40);
        // Data lines
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(255,200,100,${panelAlpha * 0.7})`;
          ctx.fillRect(3, 4 + i * 6, 10 + Math.sin(t + i) * 4, 1.5);
        }
        ctx.restore();

        // Right panel
        ctx.save();
        ctx.translate(28, -30);
        ctx.rotate(0.12 + Math.sin(t * 0.9 + 1) * 0.03);
        ctx.fillStyle = `rgba(255,170,68,${panelAlpha})`;
        ctx.fillRect(0, 0, 24, 35);
        ctx.strokeStyle = `rgba(255,170,68,${panelAlpha + 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(0, 0, 24, 35);
        // Timeline graph
        ctx.strokeStyle = `rgba(255,200,100,${panelAlpha + 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(3, 25);
        for (let i = 0; i < 18; i++) {
          ctx.lineTo(3 + i, 25 - Math.sin(t * 0.5 + i * 0.5) * 8 - i * 0.3);
        }
        ctx.stroke();
        ctx.restore();

        // --- Character body ---
        // Hair — long, dark with amber highlights, flowing past shoulders
        ctx.fillStyle = "#1a1208";
        ctx.beginPath();
        ctx.moveTo(-9, -62);
        ctx.quadraticCurveTo(-14, -50, -13, -30);
        ctx.quadraticCurveTo(-14, -10, -11 + Math.sin(t * 1.5) * 1, 5);
        ctx.lineTo(-7, 5);
        ctx.quadraticCurveTo(-8, -20, -7, -45);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(9, -62);
        ctx.quadraticCurveTo(14, -50, 13, -30);
        ctx.quadraticCurveTo(14, -10, 11 + Math.sin(t * 1.5 + 0.5) * 1, 5);
        ctx.lineTo(7, 5);
        ctx.quadraticCurveTo(8, -20, 7, -45);
        ctx.closePath();
        ctx.fill();
        // Amber shimmer strand
        ctx.strokeStyle = "rgba(255,170,68,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -48);
        ctx.quadraticCurveTo(-12, -30, -10 + Math.sin(t * 1.2) * 1, 0);
        ctx.stroke();

        // Face
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.moveTo(-8, -48);
        ctx.quadraticCurveTo(-10, -56, -8, -62);
        ctx.quadraticCurveTo(0, -66, 8, -62);
        ctx.quadraticCurveTo(10, -56, 8, -48);
        ctx.quadraticCurveTo(0, -44, -8, -48);
        ctx.closePath();
        ctx.fill();

        // Eyes — warm amber
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-5, -57, 4, 3);
        ctx.fillRect(2, -57, 4, 3);
        ctx.fillStyle = "#cc7722";
        ctx.fillRect(-3.5, -56.5, 2, 2);
        ctx.fillRect(3.5, -56.5, 2, 2);
        // Pupils
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-3, -56, 1, 1);
        ctx.fillRect(4, -56, 1, 1);

        // Eyebrows
        ctx.strokeStyle = "#2a1a08";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-6, -59);
        ctx.lineTo(-1, -60);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -60);
        ctx.lineTo(6, -59);
        ctx.stroke();

        // Lips
        ctx.fillStyle = "#cc6655";
        ctx.beginPath();
        ctx.moveTo(-3, -49);
        ctx.quadraticCurveTo(0, -47, 3, -49);
        ctx.quadraticCurveTo(0, -48, -3, -49);
        ctx.closePath();
        ctx.fill();

        // Neck
        ctx.fillStyle = "#dba882";
        ctx.fillRect(-3, -48, 6, 6);

        // Analyst coat — dark with amber trim
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath();
        ctx.moveTo(-12, -42);
        ctx.lineTo(-14, 20);
        ctx.lineTo(14, 20);
        ctx.lineTo(12, -42);
        ctx.closePath();
        ctx.fill();
        // Amber collar trim
        ctx.strokeStyle = "#ffaa44";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, -42);
        ctx.lineTo(-4, -38);
        ctx.lineTo(4, -38);
        ctx.lineTo(8, -42);
        ctx.stroke();

        // Chrono-Analyst badge — glowing amber circle
        ctx.fillStyle = "#ffaa44";
        ctx.shadowColor = "#ffaa44";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(6, -32, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Belt with data modules
        ctx.fillStyle = "#2a2020";
        ctx.fillRect(-13, 8, 26, 3);
        ctx.fillStyle = "#ffaa44";
        ctx.fillRect(-4, 8.5, 3, 2);
        ctx.fillRect(1, 8.5, 3, 2);

        // Arms — one raised, palm-up projecting holo
        ctx.fillStyle = "#1a1a2a";
        // Left arm at side
        ctx.beginPath();
        ctx.moveTo(-12, -38);
        ctx.quadraticCurveTo(-16, -22, -14, 2);
        ctx.lineTo(-10, 2);
        ctx.quadraticCurveTo(-10, -20, -8, -38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.arc(-12, 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Right arm raised, projecting
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath();
        ctx.moveTo(12, -38);
        ctx.quadraticCurveTo(20, -42, 22, -36);
        ctx.lineTo(18, -34);
        ctx.quadraticCurveTo(16, -38, 10, -36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#dba882";
        ctx.beginPath();
        ctx.arc(22, -35, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Holographic emission from raised hand
        ctx.strokeStyle = `rgba(255,170,68,${0.3 + Math.sin(t * 3) * 0.15})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(22, -35, 6 + i * 4, -0.8, 0.8);
          ctx.stroke();
        }

        // Legs
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(-6, 12, 5, 22);
        ctx.fillRect(1, 12, 5, 22);

        // Boots — sleek with amber accents
        ctx.fillStyle = "#111118";
        ctx.fillRect(-7, 32, 6, 6);
        ctx.fillRect(1, 32, 6, 6);
        ctx.fillStyle = "#ffaa44";
        ctx.fillRect(-7, 32, 6, 1);
        ctx.fillRect(1, 32, 6, 1);

        ctx.globalAlpha = 1;
        break;
      }

      case "aria": {
        // ARIA — Armor-Resident Intelligence Assistant
        // AI companion rendered as holographic female face in visor HUD
        const fadeIn = Math.min(1, t / 0.8);
        ctx.globalAlpha = fadeIn;

        // Holographic interference / boot-up scanlines
        const bootProg = Math.min(1, t / 2.0);
        if (bootProg < 1) {
          for (let sl = 0; sl < 20; sl++) {
            const sly = -80 + sl * 8 + Math.sin(t * 10 + sl) * 2;
            ctx.fillStyle = `rgba(0,220,255,${0.03 * (1 - bootProg)})`;
            ctx.fillRect(-60, sly, 120, 1);
          }
        }

        // Hexagonal visor frame (the HUD window ARIA lives in)
        const visorPulse = 0.6 + Math.sin(t * 2) * 0.1;
        ctx.strokeStyle = `rgba(0,200,255,${visorPulse * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-45, -60);
        ctx.lineTo(-55, -20);
        ctx.lineTo(-45, 25);
        ctx.lineTo(45, 25);
        ctx.lineTo(55, -20);
        ctx.lineTo(45, -60);
        ctx.closePath();
        ctx.stroke();
        // Inner visor glow
        ctx.fillStyle = `rgba(0,180,255,${0.03 + Math.sin(t * 1.5) * 0.01})`;
        ctx.fill();

        // Ambient holographic glow behind her
        const ariaGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
        ariaGlow.addColorStop(0, "rgba(0,200,255,0.08)");
        ariaGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ariaGlow;
        ctx.fillRect(-80, -90, 160, 130);

        // --- Hair: short asymmetric bob, electric blue-black ---
        ctx.fillStyle = "#0a0a1a";
        // Left side (longer)
        ctx.beginPath();
        ctx.moveTo(-9, -62);
        ctx.quadraticCurveTo(-16, -56, -15, -42);
        ctx.quadraticCurveTo(-14, -30, -12 + Math.sin(t * 2) * 0.5, -22);
        ctx.lineTo(-7, -22);
        ctx.quadraticCurveTo(-8, -35, -7, -50);
        ctx.closePath();
        ctx.fill();
        // Right side (shorter, swept)
        ctx.beginPath();
        ctx.moveTo(9, -62);
        ctx.quadraticCurveTo(14, -56, 12, -46);
        ctx.quadraticCurveTo(11, -38, 9, -34);
        ctx.lineTo(7, -34);
        ctx.quadraticCurveTo(8, -42, 7, -50);
        ctx.closePath();
        ctx.fill();
        // Cyan highlight streak (left side)
        ctx.strokeStyle = `rgba(0,220,255,${0.35 + Math.sin(t * 3) * 0.1})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-10, -58);
        ctx.quadraticCurveTo(-13, -44, -11 + Math.sin(t * 2) * 0.5, -24);
        ctx.stroke();

        // --- Face (holographic skin tone — pale with blue tint) ---
        ctx.fillStyle = "#c8bdd4";
        ctx.beginPath();
        ctx.moveTo(-8, -48);
        ctx.quadraticCurveTo(-10, -56, -8, -62);
        ctx.quadraticCurveTo(0, -66, 8, -62);
        ctx.quadraticCurveTo(10, -56, 8, -48);
        ctx.quadraticCurveTo(0, -44, -8, -48);
        ctx.closePath();
        ctx.fill();
        // Holographic grid faintly overlaid on face
        ctx.strokeStyle = `rgba(0,200,255,${0.06 + Math.sin(t * 2.5) * 0.02})`;
        ctx.lineWidth = 0.3;
        for (let gy = -62; gy < -44; gy += 4) {
          ctx.beginPath();
          ctx.moveTo(-8, gy);
          ctx.lineTo(8, gy);
          ctx.stroke();
        }

        // --- Eyes: bright cyan, sharp, expressive ---
        // Whites
        ctx.fillStyle = "#e0e8f0";
        ctx.beginPath();
        ctx.ellipse(-3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Iris — glowing cyan
        const eyeGlow = `rgba(0,220,255,${0.8 + Math.sin(t * 4) * 0.2})`;
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(-3.5, -55.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.5, -55.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = "#0a0a2a";
        ctx.beginPath();
        ctx.arc(-3.5, -55.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.5, -55.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye highlight
        ctx.fillStyle = "rgba(200,240,255,0.6)";
        ctx.beginPath();
        ctx.arc(-4.2, -56.2, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2.8, -56.2, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyeliner (sharp, tech-styled)
        ctx.strokeStyle = "#1a1a3a";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-6.5, -56);
        ctx.quadraticCurveTo(-3.5, -58, -0.5, -56.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0.5, -56.5);
        ctx.quadraticCurveTo(3.5, -58, 6.5, -56);
        ctx.stroke();

        // Eyebrows — thin, angular
        ctx.strokeStyle = "#2a2040";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-6, -59);
        ctx.lineTo(-1, -60.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -60.5);
        ctx.lineTo(6, -59);
        ctx.stroke();

        // --- Nose (subtle) ---
        ctx.strokeStyle = "rgba(180,170,190,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -54);
        ctx.lineTo(-0.5, -50.5);
        ctx.stroke();

        // --- Lips (soft lilac) ---
        ctx.fillStyle = "#b088a0";
        ctx.beginPath();
        ctx.moveTo(-3, -49);
        ctx.quadraticCurveTo(0, -47.5, 3, -49);
        ctx.quadraticCurveTo(0, -47.8, -3, -49);
        ctx.closePath();
        ctx.fill();

        // --- Headset (over-ear, tech) ---
        // Left earpiece
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath();
        ctx.ellipse(-11, -54, 3.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(0,200,255,${0.5 + Math.sin(t * 3) * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(-11, -54, 3.5, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Pulsing LED on earpiece
        ctx.fillStyle = `rgba(0,255,220,${0.5 + Math.sin(t * 5) * 0.4})`;
        ctx.beginPath();
        ctx.arc(-12, -52, 0.8, 0, Math.PI * 2);
        ctx.fill();
        // Right earpiece
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath();
        ctx.ellipse(11, -54, 3.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(0,200,255,${0.5 + Math.sin(t * 3) * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(11, -54, 3.5, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Headband arc over hair
        ctx.strokeStyle = "#2a2a3a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -54, 12.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.strokeStyle = `rgba(0,200,255,${0.2 + Math.sin(t * 2) * 0.1})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, -54, 12.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        // Boom microphone extending from left earpiece
        ctx.strokeStyle = "#2a2a3a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-11, -50);
        ctx.quadraticCurveTo(-8, -46, -4, -46);
        ctx.stroke();
        // Mic tip
        ctx.fillStyle = "#2a2a3a";
        ctx.beginPath();
        ctx.arc(-4, -46, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Mic active indicator
        ctx.fillStyle = `rgba(0,255,180,${0.4 + Math.sin(t * 6) * 0.3})`;
        ctx.beginPath();
        ctx.arc(-4, -46, 0.6, 0, Math.PI * 2);
        ctx.fill();

        // --- Neck ---
        ctx.fillStyle = "#c8bdd4";
        ctx.fillRect(-3, -47, 6, 6);

        // --- Body: sleek tech suit, high collar ---
        ctx.fillStyle = "#0f0f1a";
        ctx.beginPath();
        ctx.moveTo(-12, -41);
        ctx.lineTo(-14, 18);
        ctx.lineTo(14, 18);
        ctx.lineTo(12, -41);
        ctx.closePath();
        ctx.fill();
        // High collar
        ctx.fillStyle = "#1a1a30";
        ctx.beginPath();
        ctx.moveTo(-8, -42);
        ctx.quadraticCurveTo(-5, -44, -3, -42);
        ctx.lineTo(3, -42);
        ctx.quadraticCurveTo(5, -44, 8, -42);
        ctx.lineTo(8, -38);
        ctx.lineTo(-8, -38);
        ctx.closePath();
        ctx.fill();
        // Cyan trim lines on suit
        ctx.strokeStyle = `rgba(0,200,255,${0.3 + Math.sin(t * 2) * 0.1})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-5, -38);
        ctx.lineTo(-5, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5, -38);
        ctx.lineTo(5, 0);
        ctx.stroke();
        // Center chest line
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(0, 18);
        ctx.stroke();

        // Status indicator on chest
        ctx.fillStyle = `rgba(0,255,200,${0.5 + Math.sin(t * 4) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, -30, 2, 0, Math.PI * 2);
        ctx.fill();

        // Arms
        ctx.fillStyle = "#0f0f1a";
        // Left arm (at side)
        ctx.beginPath();
        ctx.moveTo(-12, -38);
        ctx.quadraticCurveTo(-16, -22, -14, 0);
        ctx.lineTo(-10, 0);
        ctx.quadraticCurveTo(-10, -20, -8, -38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c8bdd4";
        ctx.beginPath();
        ctx.arc(-12, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Right arm (raised, touching headset)
        ctx.fillStyle = "#0f0f1a";
        ctx.beginPath();
        ctx.moveTo(12, -38);
        ctx.quadraticCurveTo(17, -44, 14, -50);
        ctx.lineTo(11, -49);
        ctx.quadraticCurveTo(13, -43, 10, -36);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#c8bdd4";
        ctx.beginPath();
        ctx.arc(13, -51, 2, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = "#0f0f1a";
        ctx.fillRect(-6, 12, 5, 22);
        ctx.fillRect(1, 12, 5, 22);
        // Boots
        ctx.fillStyle = "#0a0a14";
        ctx.fillRect(-7, 32, 6, 6);
        ctx.fillRect(1, 32, 6, 6);
        // Cyan boot trim
        ctx.fillStyle = `rgba(0,200,255,${0.3})`;
        ctx.fillRect(-7, 32, 6, 0.8);
        ctx.fillRect(1, 32, 6, 0.8);

        // Floating data readouts (near her hand / headset)
        const dataAlpha = 0.2 + Math.sin(t * 2.5) * 0.08;
        ctx.save();
        ctx.translate(-50, -15);
        ctx.rotate(-0.1 + Math.sin(t * 0.7) * 0.02);
        ctx.fillStyle = `rgba(0,200,255,${dataAlpha})`;
        ctx.fillRect(0, 0, 22, 30);
        ctx.strokeStyle = `rgba(0,200,255,${dataAlpha + 0.15})`;
        ctx.lineWidth = 0.6;
        ctx.strokeRect(0, 0, 22, 30);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = `rgba(0,255,220,${dataAlpha * 0.6})`;
          ctx.fillRect(2, 3 + i * 5, 8 + Math.sin(t * 2 + i) * 4, 1.2);
        }
        ctx.restore();

        // Waveform readout (right side — voice analysis)
        ctx.save();
        ctx.translate(30, -25);
        ctx.rotate(0.08);
        ctx.strokeStyle = `rgba(0,255,200,${dataAlpha + 0.1})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 15);
        for (let i = 0; i < 20; i++) {
          ctx.lineTo(i, 15 - Math.sin(t * 4 + i * 0.8) * 6 * (1 - i / 25));
        }
        ctx.stroke();
        ctx.restore();

        ctx.globalAlpha = 1;
        break;
      }

      case "rift": {
        const pulse = 0.7 + 0.3 * Math.sin(t * 3);
        // Outer ring
        for (let ring = 3; ring >= 0; ring--) {
          const r = 40 + ring * 20;
          const alpha = (0.15 - ring * 0.03) * pulse;
          const riftGrad = ctx.createRadialGradient(0, 0, r - 15, 0, 0, r);
          riftGrad.addColorStop(0, `rgba(0,200,255,0)`);
          riftGrad.addColorStop(0.7, `rgba(0,200,255,${alpha})`);
          riftGrad.addColorStop(1, `rgba(100,0,200,${alpha * 0.5})`);
          ctx.fillStyle = riftGrad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core
        ctx.fillStyle = "rgba(200,220,255,0.3)";
        ctx.shadowColor = "#00ccff";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Spinning arcs
        for (let i = 0; i < 3; i++) {
          const angle = t * (1.5 + i * 0.3) + (i * Math.PI * 2) / 3;
          ctx.strokeStyle = `rgba(0,200,255,${0.4 * pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 30 + i * 12, angle, angle + 1.2);
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        break;
      }

      case "portrait_voss": {
        // VOSS — Tactician: sharp features, military bearing, cyan/blue palette
        const fadeIn = Math.min(1, t / 0.9);
        ctx.globalAlpha = fadeIn;

        // Tactical holographic backdrop
        const vossGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
        vossGlow.addColorStop(0, "rgba(0,180,255,0.10)");
        vossGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = vossGlow;
        ctx.fillRect(-80, -90, 160, 140);

        // Floating tactical grid behind him
        ctx.save();
        ctx.translate(-48, -30);
        ctx.rotate(-0.08 + Math.sin(t * 0.6) * 0.02);
        const gridAlpha = 0.12 + Math.sin(t * 1.5) * 0.05;
        ctx.strokeStyle = `rgba(0,180,255,${gridAlpha})`;
        ctx.lineWidth = 0.4;
        for (let gx = 0; gx < 5; gx++) {
          ctx.beginPath();
          ctx.moveTo(gx * 6, 0);
          ctx.lineTo(gx * 6, 30);
          ctx.stroke();
        }
        for (let gy = 0; gy < 6; gy++) {
          ctx.beginPath();
          ctx.moveTo(0, gy * 6);
          ctx.lineTo(24, gy * 6);
          ctx.stroke();
        }
        // Blinking dot on grid (target)
        ctx.fillStyle = `rgba(255,100,80,${0.5 + Math.sin(t * 4) * 0.4})`;
        ctx.beginPath();
        ctx.arc(12, 12, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Hair — short, swept back, silver-grey
        ctx.fillStyle = "#8090a0";
        ctx.beginPath();
        ctx.moveTo(-9, -62);
        ctx.quadraticCurveTo(-12, -70, -7, -74);
        ctx.quadraticCurveTo(0, -77, 8, -73);
        ctx.quadraticCurveTo(13, -68, 10, -62);
        ctx.closePath();
        ctx.fill();
        // Lighter streak
        ctx.strokeStyle = "rgba(200,210,220,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, -73);
        ctx.quadraticCurveTo(4, -72, 8, -68);
        ctx.stroke();

        // Face — angular, weathered
        ctx.fillStyle = "#b89070";
        ctx.beginPath();
        ctx.moveTo(-7, -48);
        ctx.quadraticCurveTo(-9, -56, -7, -63);
        ctx.quadraticCurveTo(0, -66, 7, -63);
        ctx.quadraticCurveTo(9, -56, 7, -48);
        ctx.quadraticCurveTo(0, -44, -7, -48);
        ctx.closePath();
        ctx.fill();

        // Jaw line (angular, strong)
        ctx.strokeStyle = "rgba(160,120,90,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-7, -50);
        ctx.quadraticCurveTo(-8, -46, 0, -44);
        ctx.quadraticCurveTo(8, -46, 7, -50);
        ctx.stroke();

        // Scar across left cheek
        ctx.strokeStyle = "rgba(200,160,140,0.5)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-7, -54);
        ctx.lineTo(-3, -50);
        ctx.stroke();

        // Eyes — sharp, focused, pale blue
        ctx.fillStyle = "#e0e8f0";
        ctx.fillRect(-5, -58, 4, 2.5);
        ctx.fillRect(1, -58, 4, 2.5);
        ctx.fillStyle = "#5090cc";
        ctx.fillRect(-4, -57.5, 2, 2);
        ctx.fillRect(2, -57.5, 2, 2);
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(-3.5, -57, 1, 1);
        ctx.fillRect(2.5, -57, 1, 1);

        // Eyebrows — thick, angular (stern)
        ctx.strokeStyle = "#5a6a7a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-6, -60);
        ctx.lineTo(-1, -61.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(1, -61.5);
        ctx.lineTo(6, -60);
        ctx.stroke();

        // Nose (aquiline)
        ctx.strokeStyle = "rgba(160,120,90,0.3)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -55);
        ctx.lineTo(1, -50);
        ctx.lineTo(-0.5, -49.5);
        ctx.stroke();

        // Mouth — thin, stern line
        ctx.strokeStyle = "#8a6a55";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3, -47);
        ctx.lineTo(3, -47);
        ctx.stroke();

        // Neck
        ctx.fillStyle = "#b89070";
        ctx.fillRect(-4, -47, 8, 7);

        // Tactical jacket — dark navy, high collar, officer-grade
        ctx.fillStyle = "#1a2030";
        ctx.beginPath();
        ctx.moveTo(-13, -40);
        ctx.lineTo(-15, 18);
        ctx.lineTo(15, 18);
        ctx.lineTo(13, -40);
        ctx.closePath();
        ctx.fill();

        // Raised officer collar
        ctx.fillStyle = "#222838";
        ctx.beginPath();
        ctx.moveTo(-9, -42);
        ctx.lineTo(-7, -46);
        ctx.lineTo(7, -46);
        ctx.lineTo(9, -42);
        ctx.lineTo(9, -38);
        ctx.lineTo(-9, -38);
        ctx.closePath();
        ctx.fill();
        // Collar trim
        ctx.strokeStyle = `rgba(0,180,255,${0.3 + Math.sin(t * 2) * 0.1})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-7, -46);
        ctx.lineTo(7, -46);
        ctx.stroke();

        // Rank insignia — triple chevrons on right chest
        ctx.strokeStyle = "#00aadd";
        ctx.lineWidth = 0.8;
        for (let ch = 0; ch < 3; ch++) {
          const chY = -34 + ch * 3;
          ctx.beginPath();
          ctx.moveTo(3, chY);
          ctx.lineTo(6, chY - 1.5);
          ctx.lineTo(9, chY);
          ctx.stroke();
        }

        // Shoulder pads (angular, tactical)
        ctx.fillStyle = "#2a3444";
        ctx.fillRect(-17, -40, 6, 8);
        ctx.fillRect(11, -40, 6, 8);
        ctx.strokeStyle = "#3a4a5a";
        ctx.lineWidth = 0.6;
        ctx.strokeRect(-17, -40, 6, 8);
        ctx.strokeRect(11, -40, 6, 8);

        // Belt
        ctx.fillStyle = "#111820";
        ctx.fillRect(-14, 6, 28, 3);
        ctx.fillStyle = "#00aadd";
        ctx.fillRect(-2, 6.5, 4, 2);

        // Arms
        ctx.fillStyle = "#1a2030";
        ctx.beginPath();
        ctx.moveTo(-13, -36);
        ctx.quadraticCurveTo(-17, -20, -15, 0);
        ctx.lineTo(-11, 0);
        ctx.quadraticCurveTo(-10, -18, -9, -36);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(13, -36);
        ctx.quadraticCurveTo(17, -20, 15, 0);
        ctx.lineTo(11, 0);
        ctx.quadraticCurveTo(10, -18, 9, -36);
        ctx.closePath();
        ctx.fill();
        // Gloved hands
        ctx.fillStyle = "#1a1a22";
        ctx.beginPath();
        ctx.arc(-13, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(13, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = "#151c28";
        ctx.fillRect(-7, 10, 6, 24);
        ctx.fillRect(1, 10, 6, 24);
        // Knee guards
        ctx.fillStyle = "#2a3444";
        ctx.fillRect(-6, 22, 4, 4);
        ctx.fillRect(2, 22, 4, 4);

        // Boots — military, dark
        ctx.fillStyle = "#0d1018";
        ctx.fillRect(-8, 32, 7, 6);
        ctx.fillRect(1, 32, 7, 6);
        ctx.fillStyle = "#00aadd";
        ctx.fillRect(-8, 32, 7, 0.8);
        ctx.fillRect(1, 32, 7, 0.8);

        ctx.globalAlpha = 1;
        break;
      }

      case "portrait_miri": {
        // MIRI — Medic: warm face, green/teal palette, med-pack, healer vibes
        const fadeIn = Math.min(1, t / 0.9);
        ctx.globalAlpha = fadeIn;

        // Soft healing glow backdrop
        const miriGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
        miriGlow.addColorStop(0, "rgba(100,255,180,0.10)");
        miriGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = miriGlow;
        ctx.fillRect(-80, -90, 160, 140);

        // Floating medical readout (left side)
        ctx.save();
        ctx.translate(-50, -20);
        ctx.rotate(-0.1 + Math.sin(t * 0.8) * 0.02);
        const readAlpha = 0.14 + Math.sin(t * 1.8) * 0.06;
        ctx.fillStyle = `rgba(100,255,180,${readAlpha})`;
        ctx.fillRect(0, 0, 24, 32);
        ctx.strokeStyle = `rgba(100,255,180,${readAlpha + 0.12})`;
        ctx.lineWidth = 0.6;
        ctx.strokeRect(0, 0, 24, 32);
        // Heartbeat line
        ctx.strokeStyle = `rgba(100,255,160,${readAlpha + 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, 10);
        ctx.lineTo(6, 10);
        ctx.lineTo(8, 4);
        ctx.lineTo(10, 16);
        ctx.lineTo(12, 8);
        ctx.lineTo(14, 10);
        ctx.lineTo(22, 10);
        ctx.stroke();
        // Vitals text lines
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(100,255,160,${readAlpha * 0.6})`;
          ctx.fillRect(2, 20 + i * 4, 8 + Math.sin(t + i) * 3, 1.2);
        }
        ctx.restore();

        // Hair — tied back in a practical bun, dark brown with warm highlights
        ctx.fillStyle = "#2a1a10";
        // Left side framing face
        ctx.beginPath();
        ctx.moveTo(-9, -62);
        ctx.quadraticCurveTo(-13, -56, -11, -46);
        ctx.lineTo(-7, -46);
        ctx.quadraticCurveTo(-8, -54, -7, -60);
        ctx.closePath();
        ctx.fill();
        // Right side
        ctx.beginPath();
        ctx.moveTo(9, -62);
        ctx.quadraticCurveTo(13, -56, 11, -46);
        ctx.lineTo(7, -46);
        ctx.quadraticCurveTo(8, -54, 7, -60);
        ctx.closePath();
        ctx.fill();
        // Top
        ctx.beginPath();
        ctx.moveTo(-8, -63);
        ctx.quadraticCurveTo(0, -72, 8, -63);
        ctx.closePath();
        ctx.fill();
        // Bun at back (offset to right-top)
        ctx.fillStyle = "#2a1a10";
        ctx.beginPath();
        ctx.arc(4, -70, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(60,40,20,0.5)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(4, -70, 6, 0, Math.PI * 2);
        ctx.stroke();
        // Warm highlight strand
        ctx.strokeStyle = "rgba(180,120,60,0.3)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3, -68);
        ctx.quadraticCurveTo(2, -72, 6, -68);
        ctx.stroke();

        // Face — warm, kind features
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.moveTo(-8, -48);
        ctx.quadraticCurveTo(-10, -56, -8, -62);
        ctx.quadraticCurveTo(0, -66, 8, -62);
        ctx.quadraticCurveTo(10, -56, 8, -48);
        ctx.quadraticCurveTo(0, -44, -8, -48);
        ctx.closePath();
        ctx.fill();

        // Eyes — warm brown, expressive
        ctx.fillStyle = "#f0e8e0";
        ctx.beginPath();
        ctx.ellipse(-3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(3.5, -55.5, 2.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Iris — warm hazel-green
        ctx.fillStyle = "#5a8a50";
        ctx.beginPath();
        ctx.arc(-3.5, -55.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.5, -55.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-3.5, -55.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.5, -55.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye highlights
        ctx.fillStyle = "rgba(255,255,240,0.5)";
        ctx.beginPath();
        ctx.arc(-4.2, -56.2, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2.8, -56.2, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows — soft, arched
        ctx.strokeStyle = "#3a2a18";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-6, -59);
        ctx.quadraticCurveTo(-3, -61, -0.5, -59.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0.5, -59.5);
        ctx.quadraticCurveTo(3, -61, 6, -59);
        ctx.stroke();

        // Nose
        ctx.strokeStyle = "rgba(170,120,80,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -54);
        ctx.lineTo(-0.3, -50);
        ctx.stroke();

        // Smile — warm, reassuring
        ctx.fillStyle = "#b06850";
        ctx.beginPath();
        ctx.moveTo(-3, -48);
        ctx.quadraticCurveTo(0, -46, 3, -48);
        ctx.quadraticCurveTo(0, -46.5, -3, -48);
        ctx.closePath();
        ctx.fill();

        // Neck
        ctx.fillStyle = "#c8956c";
        ctx.fillRect(-3, -47, 6, 6);

        // Medic uniform — teal/white with red cross emblem
        ctx.fillStyle = "#1a3a3a";
        ctx.beginPath();
        ctx.moveTo(-12, -41);
        ctx.lineTo(-14, 18);
        ctx.lineTo(14, 18);
        ctx.lineTo(12, -41);
        ctx.closePath();
        ctx.fill();
        // White front panel
        ctx.fillStyle = "#d8d8d0";
        ctx.beginPath();
        ctx.moveTo(-5, -39);
        ctx.lineTo(-5, 10);
        ctx.lineTo(5, 10);
        ctx.lineTo(5, -39);
        ctx.closePath();
        ctx.fill();

        // Red cross on chest
        ctx.fillStyle = "#cc3333";
        ctx.fillRect(-1.5, -34, 3, 8);
        ctx.fillRect(-4, -31.5, 8, 3);

        // Collar — V-neck with teal trim
        ctx.strokeStyle = "#4ac0a0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, -41);
        ctx.lineTo(-3, -35);
        ctx.lineTo(3, -35);
        ctx.lineTo(8, -41);
        ctx.stroke();

        // Shoulder patches (medic insignia)
        ctx.fillStyle = "#2a4a4a";
        ctx.fillRect(-16, -40, 5, 6);
        ctx.fillRect(11, -40, 5, 6);
        // Mini crosses on patches
        ctx.fillStyle = "#4ac0a0";
        ctx.fillRect(-14.5, -38.5, 2, 0.8);
        ctx.fillRect(-14, -39, 0.8, 2);
        ctx.fillRect(12.5, -38.5, 2, 0.8);
        ctx.fillRect(13, -39, 0.8, 2);

        // Utility belt with med pouches
        ctx.fillStyle = "#1a2a2a";
        ctx.fillRect(-13, 6, 26, 3);
        // Med pouches
        ctx.fillStyle = "#2a4040";
        ctx.fillRect(-10, 4, 5, 5);
        ctx.fillRect(5, 4, 5, 5);
        // Pouch crosses
        ctx.fillStyle = "#4ac0a0";
        ctx.fillRect(-8.5, 5.5, 2, 0.6);
        ctx.fillRect(-8, 5, 0.6, 2);
        ctx.fillRect(6.5, 5.5, 2, 0.6);
        ctx.fillRect(7, 5, 0.6, 2);

        // Arms
        ctx.fillStyle = "#1a3a3a";
        // Left arm (holding scanner)
        ctx.beginPath();
        ctx.moveTo(-12, -38);
        ctx.quadraticCurveTo(-16, -26, -14, -8);
        ctx.lineTo(-10, -8);
        ctx.quadraticCurveTo(-10, -24, -8, -38);
        ctx.closePath();
        ctx.fill();
        // Right arm (at side)
        ctx.beginPath();
        ctx.moveTo(12, -38);
        ctx.quadraticCurveTo(16, -22, 14, 0);
        ctx.lineTo(10, 0);
        ctx.quadraticCurveTo(10, -20, 8, -38);
        ctx.closePath();
        ctx.fill();
        // Hands
        ctx.fillStyle = "#c8956c";
        ctx.beginPath();
        ctx.arc(-12, -6, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(12, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Med-scanner in left hand (glowing device)
        ctx.fillStyle = "#2a3a3a";
        ctx.fillRect(-16, -14, 8, 4);
        ctx.fillStyle = `rgba(100,255,180,${0.5 + Math.sin(t * 3) * 0.3})`;
        ctx.fillRect(-15, -13, 6, 2);
        // Scanner beam
        ctx.strokeStyle = `rgba(100,255,180,${0.2 + Math.sin(t * 4) * 0.1})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-12, -10);
        ctx.lineTo(-18, 4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.stroke();

        // Legs
        ctx.fillStyle = "#152a2a";
        ctx.fillRect(-6, 10, 5, 24);
        ctx.fillRect(1, 10, 5, 24);

        // Boots — practical, teal-trimmed
        ctx.fillStyle = "#0d1818";
        ctx.fillRect(-7, 32, 6, 6);
        ctx.fillRect(1, 32, 6, 6);
        ctx.fillStyle = "#4ac0a0";
        ctx.fillRect(-7, 32, 6, 0.8);
        ctx.fillRect(1, 32, 6, 0.8);

        ctx.globalAlpha = 1;
        break;
      }

      case "portrait_kai": {
        // KAI — Engineer: stocky build, amber/orange palette, goggles, tools
        const fadeIn = Math.min(1, t / 0.9);
        ctx.globalAlpha = fadeIn;

        // Warm workshop glow backdrop
        const kaiGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 70);
        kaiGlow.addColorStop(0, "rgba(255,180,80,0.10)");
        kaiGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = kaiGlow;
        ctx.fillRect(-80, -90, 160, 140);

        // Floating schematic (right side)
        ctx.save();
        ctx.translate(30, -28);
        ctx.rotate(0.1 + Math.sin(t * 0.7) * 0.03);
        const schAlpha = 0.12 + Math.sin(t * 1.6) * 0.05;
        ctx.strokeStyle = `rgba(255,180,80,${schAlpha + 0.1})`;
        ctx.lineWidth = 0.5;
        // Blueprint rectangle
        ctx.strokeRect(0, 0, 22, 28);
        // Gear schematic inside
        ctx.beginPath();
        ctx.arc(11, 12, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(11, 12, 3, 0, Math.PI * 2);
        ctx.stroke();
        // Gear teeth
        for (let gt = 0; gt < 8; gt++) {
          const ga = (gt / 8) * Math.PI * 2 + t * 0.5;
          ctx.beginPath();
          ctx.moveTo(11 + Math.cos(ga) * 5.5, 12 + Math.sin(ga) * 5.5);
          ctx.lineTo(11 + Math.cos(ga) * 7.5, 12 + Math.sin(ga) * 7.5);
          ctx.stroke();
        }
        // Dimension lines
        ctx.fillStyle = `rgba(255,180,80,${schAlpha * 0.6})`;
        ctx.fillRect(2, 22, 10, 1);
        ctx.fillRect(2, 25, 14, 1);
        ctx.restore();

        // Hair — messy, dark with soot streaks, pushed up by goggles
        ctx.fillStyle = "#1a1408";
        ctx.beginPath();
        ctx.moveTo(-9, -60);
        ctx.quadraticCurveTo(-12, -68, -6, -74);
        ctx.quadraticCurveTo(2, -78, 10, -72);
        ctx.quadraticCurveTo(14, -66, 9, -60);
        ctx.closePath();
        ctx.fill();
        // Messy tufts sticking up
        ctx.beginPath();
        ctx.moveTo(-4, -73);
        ctx.quadraticCurveTo(-5, -79, -2, -80);
        ctx.quadraticCurveTo(0, -78, -1, -74);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(3, -72);
        ctx.quadraticCurveTo(4, -78, 7, -78);
        ctx.quadraticCurveTo(8, -76, 6, -72);
        ctx.closePath();
        ctx.fill();
        // Soot streak
        ctx.strokeStyle = "rgba(60,50,30,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -70);
        ctx.quadraticCurveTo(-2, -72, 2, -70);
        ctx.stroke();

        // Face — broad, friendly, a bit rough
        ctx.fillStyle = "#d4a070";
        ctx.beginPath();
        ctx.moveTo(-8, -48);
        ctx.quadraticCurveTo(-10, -56, -8, -62);
        ctx.quadraticCurveTo(0, -66, 8, -62);
        ctx.quadraticCurveTo(10, -56, 8, -48);
        ctx.quadraticCurveTo(0, -43, -8, -48);
        ctx.closePath();
        ctx.fill();

        // Stubble (dotted texture on jaw)
        ctx.fillStyle = "rgba(80,60,40,0.15)";
        for (let sx = -5; sx <= 5; sx += 2) {
          for (let sy = -48; sy <= -45; sy += 1.5) {
            ctx.fillRect(sx, sy, 0.8, 0.8);
          }
        }

        // Goggles pushed up on forehead
        ctx.fillStyle = "#3a2a1a";
        ctx.beginPath();
        ctx.moveTo(-9, -64);
        ctx.quadraticCurveTo(0, -66, 9, -64);
        ctx.lineTo(9, -60);
        ctx.quadraticCurveTo(0, -62, -9, -60);
        ctx.closePath();
        ctx.fill();
        // Goggle lenses
        ctx.fillStyle = "#ffaa44";
        ctx.shadowColor = "#ffaa44";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(-4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Goggle rims
        ctx.strokeStyle = "#2a1a0a";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(-4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(4, -62, 3.5, 2.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Bridge between lenses
        ctx.strokeStyle = "#3a2a1a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-0.5, -62);
        ctx.lineTo(0.5, -62);
        ctx.stroke();

        // Eyes — brown, lively
        ctx.fillStyle = "#f0e8e0";
        ctx.fillRect(-5, -57, 4, 2.5);
        ctx.fillRect(1, -57, 4, 2.5);
        ctx.fillStyle = "#8a5a30";
        ctx.fillRect(-4, -56.5, 2, 2);
        ctx.fillRect(2, -56.5, 2, 2);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-3.5, -56, 1, 1);
        ctx.fillRect(2.5, -56, 1, 1);

        // Eyebrows — expressive, slightly raised
        ctx.strokeStyle = "#2a1a08";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -59.5);
        ctx.quadraticCurveTo(-3, -61, -0.5, -59.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0.5, -59.5);
        ctx.quadraticCurveTo(3, -61, 6, -59.5);
        ctx.stroke();

        // Nose — slightly broad
        ctx.strokeStyle = "rgba(180,130,70,0.3)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(0, -54);
        ctx.lineTo(0, -50);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-1.5, -49.5);
        ctx.quadraticCurveTo(0, -49, 1.5, -49.5);
        ctx.stroke();

        // Grin — lopsided, confident
        ctx.strokeStyle = "#8a6050";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-3, -47);
        ctx.quadraticCurveTo(0, -45, 4, -46.5);
        ctx.stroke();

        // Neck (slightly thicker — stocky build)
        ctx.fillStyle = "#d4a070";
        ctx.fillRect(-4.5, -47, 9, 7);

        // Engineer jumpsuit — burnt orange with utility pockets
        ctx.fillStyle = "#8a4a1a";
        ctx.beginPath();
        ctx.moveTo(-14, -40);
        ctx.lineTo(-16, 18);
        ctx.lineTo(16, 18);
        ctx.lineTo(14, -40);
        ctx.closePath();
        ctx.fill();

        // Collar — open, casual
        ctx.fillStyle = "#6a3a12";
        ctx.beginPath();
        ctx.moveTo(-7, -40);
        ctx.lineTo(-4, -36);
        ctx.lineTo(4, -36);
        ctx.lineTo(7, -40);
        ctx.closePath();
        ctx.fill();
        // Undershirt visible
        ctx.fillStyle = "#3a3a3a";
        ctx.beginPath();
        ctx.moveTo(-4, -40);
        ctx.lineTo(-3, -36);
        ctx.lineTo(3, -36);
        ctx.lineTo(4, -40);
        ctx.closePath();
        ctx.fill();

        // Chest pockets
        ctx.fillStyle = "#7a4218";
        ctx.fillRect(-10, -32, 7, 5);
        ctx.fillRect(3, -32, 7, 5);
        ctx.strokeStyle = "#6a3a12";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-10, -32, 7, 5);
        ctx.strokeRect(3, -32, 7, 5);
        // Wrench/pen sticking out of pocket
        ctx.fillStyle = "#888";
        ctx.fillRect(-8, -34, 1.2, 6);
        ctx.fillStyle = "#ffaa44";
        ctx.fillRect(-8, -34, 1.2, 1.5);

        // Name patch on left chest
        ctx.fillStyle = "#ddd";
        ctx.fillRect(-10, -25, 7, 3);
        ctx.fillStyle = "#333";
        ctx.font = "2px monospace";

        // Shoulder pads (bulkier — engineer kit)
        ctx.fillStyle = "#7a4218";
        ctx.fillRect(-18, -40, 6, 8);
        ctx.fillRect(12, -40, 6, 8);
        // Gear badge on right shoulder
        ctx.strokeStyle = "#ffaa44";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(15, -36, 2.5, 0, Math.PI * 2);
        ctx.stroke();
        // Inner gear
        for (let gt = 0; gt < 6; gt++) {
          const ga = (gt / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(15 + Math.cos(ga) * 2, -36 + Math.sin(ga) * 2);
          ctx.lineTo(15 + Math.cos(ga) * 3.2, -36 + Math.sin(ga) * 3.2);
          ctx.stroke();
        }

        // Heavy tool belt
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(-15, 5, 30, 4);
        // Tools hanging from belt
        // Wrench
        ctx.fillStyle = "#666";
        ctx.fillRect(-11, 9, 2, 7);
        ctx.fillStyle = "#888";
        ctx.fillRect(-12, 14, 4, 2);
        // Hammer
        ctx.fillStyle = "#5a3a1a";
        ctx.fillRect(8, 9, 1.5, 6);
        ctx.fillStyle = "#888";
        ctx.fillRect(6, 9, 5, 3);
        // Buckle
        ctx.fillStyle = "#ffaa44";
        ctx.fillRect(-2, 5.5, 4, 3);

        // Arms (slightly thicker — strong build)
        ctx.fillStyle = "#8a4a1a";
        ctx.beginPath();
        ctx.moveTo(-14, -36);
        ctx.quadraticCurveTo(-20, -20, -18, 2);
        ctx.lineTo(-12, 2);
        ctx.quadraticCurveTo(-11, -18, -10, -36);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(14, -36);
        ctx.quadraticCurveTo(20, -20, 18, 2);
        ctx.lineTo(12, 2);
        ctx.quadraticCurveTo(11, -18, 10, -36);
        ctx.closePath();
        ctx.fill();
        // Rolled-up sleeves showing forearms
        ctx.fillStyle = "#d4a070";
        ctx.fillRect(-18, -4, 6, 8);
        ctx.fillRect(12, -4, 6, 8);
        // Work gloves
        ctx.fillStyle = "#5a4a2a";
        ctx.beginPath();
        ctx.arc(-15, 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(15, 6, 3, 0, Math.PI * 2);
        ctx.fill();

        // Legs (stocky)
        ctx.fillStyle = "#6a3a12";
        ctx.fillRect(-7, 10, 6, 24);
        ctx.fillRect(1, 10, 6, 24);
        // Knee pads
        ctx.fillStyle = "#4a3018";
        ctx.fillRect(-6, 22, 4, 5);
        ctx.fillRect(2, 22, 4, 5);

        // Heavy boots — steel-toed, scuffed
        ctx.fillStyle = "#2a1a0a";
        ctx.fillRect(-8, 32, 7, 7);
        ctx.fillRect(1, 32, 7, 7);
        // Steel toe caps
        ctx.fillStyle = "#666";
        ctx.fillRect(-8, 35, 3, 4);
        ctx.fillRect(5, 35, 3, 4);

        ctx.globalAlpha = 1;
        break;
      }

      // ── Fragmented memory portraits — corrupted silhouettes ──
      case "fragment_blue":
      case "fragment_green":
      case "fragment_amber": {
        const palettes = {
          fragment_blue: {
            base: "#0066aa",
            glow: "rgba(0,140,255,0.12)",
            scan: "#00aaff",
            static: "#003366",
          },
          fragment_green: {
            base: "#008855",
            glow: "rgba(80,255,160,0.12)",
            scan: "#44ffaa",
            static: "#003322",
          },
          fragment_amber: {
            base: "#885500",
            glow: "rgba(255,170,60,0.12)",
            scan: "#ffaa33",
            static: "#442200",
          },
        };
        const pal = palettes[art];
        const fadeIn = Math.min(1, t / 0.6);
        const glitch = Math.sin(t * 11) * 0.15; // rapid jitter

        ctx.globalAlpha = fadeIn * 0.7;

        // Corrupted glow backdrop
        const fragGlow = ctx.createRadialGradient(0, -20, 5, 0, -20, 80);
        fragGlow.addColorStop(0, pal.glow);
        fragGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fragGlow;
        ctx.fillRect(-90, -100, 180, 160);

        // Humanoid silhouette — intentionally vague
        ctx.save();
        ctx.translate(glitch * 8, 0);

        // Head (oval, blurred edges)
        ctx.fillStyle = pal.static;
        ctx.beginPath();
        ctx.ellipse(0, -60, 11, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shoulders + torso
        ctx.fillStyle = pal.static;
        ctx.beginPath();
        ctx.moveTo(-18, -44);
        ctx.quadraticCurveTo(-22, -30, -20, 10);
        ctx.lineTo(20, 10);
        ctx.quadraticCurveTo(22, -30, 18, -44);
        ctx.closePath();
        ctx.fill();

        // Horizontal corruption lines (tear through the figure)
        ctx.globalAlpha = fadeIn * 0.5;
        for (let i = 0; i < 8; i++) {
          const ly = -70 + i * 15 + Math.sin(t * 7 + i * 3) * 3;
          const lw = 30 + Math.sin(t * 5 + i) * 15;
          const lx = Math.sin(t * 9 + i * 2) * 6;
          ctx.fillStyle = pal.scan;
          ctx.fillRect(lx - lw / 2, ly, lw, 1.5);
        }

        // Static noise blocks
        ctx.globalAlpha = fadeIn * 0.3;
        for (let i = 0; i < 12; i++) {
          const nx = Math.sin(t * 13 + i * 7.7) * 30;
          const ny = -80 + (Math.sin(t * 11 + i * 5.3) * 50 + 50);
          const ns = 3 + Math.sin(t * 19 + i) * 2;
          ctx.fillStyle = i % 3 === 0 ? pal.scan : pal.static;
          ctx.fillRect(nx, ny, ns, ns);
        }

        // Glitch offset duplicate (color-shifted)
        ctx.globalAlpha = fadeIn * 0.15;
        ctx.fillStyle = pal.base;
        ctx.translate(3 + glitch * 12, -2);
        ctx.beginPath();
        ctx.ellipse(0, -60, 11, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-18, -44);
        ctx.quadraticCurveTo(-22, -30, -20, 10);
        ctx.lineTo(20, 10);
        ctx.quadraticCurveTo(22, -30, 18, -44);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Scan line sweep
        ctx.globalAlpha = fadeIn * 0.08;
        ctx.fillStyle = pal.scan;
        const scanPos = ((t * 80) % 200) - 100;
        ctx.fillRect(-80, scanPos, 160, 3);

        ctx.globalAlpha = 1;
        break;
      }

      case "station": {
        // Chronos Station exterior silhouette
        ctx.globalAlpha = Math.min(1, t / 1.5);

        // Sprint H 9.2: Chronos Station glow — subtle pulsing aura
        const glowPulse = 0.5 + 0.5 * Math.sin(t * 1.8);
        ctx.save();
        const grad = ctx.createRadialGradient(0, -20, 20, 0, -20, 120);
        grad.addColorStop(0, `rgba(0, 220, 255, ${0.22 + 0.1 * glowPulse})`);
        grad.addColorStop(0.5, `rgba(0, 150, 220, ${0.08 + 0.04 * glowPulse})`);
        grad.addColorStop(1, "rgba(0, 100, 180, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(-140, -120, 280, 200);
        ctx.restore();

        ctx.fillStyle = "#0d1828";

        // Main structure
        ctx.fillRect(-60, -20, 120, 50);
        // Tower
        ctx.fillRect(-10, -50, 20, 35);
        // Antenna
        ctx.fillRect(-2, -65, 4, 18);
        // Windows (glowing)
        ctx.fillStyle = "rgba(0,200,255,0.4)";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(-45 + i * 20, -10, 8, 6);
        }
        // Beacon
        ctx.fillStyle = "#00ffcc";
        ctx.shadowColor = "#00ffcc";
        ctx.shadowBlur = 8 + 4 * glowPulse;
        ctx.beginPath();
        ctx.arc(0, -68, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1;
        break;
      }
    }

    ctx.restore();
  }

  drawParadoxAbomination(ctx, t, phase = 1) {
    const fadeIn = Math.min(1, t / 1.1);
    const pulse = (Math.sin(t * 4.2) + 1) * 0.5;
    const breath = 1 + Math.sin(t * 1.4) * 0.025;
    const scale = phase === 3 ? 2.32 : phase === 2 ? 2.1 : 1.92;
    const flesh = phase === 3 ? "#1a0630" : phase === 2 ? "#2b0818" : "#241020";
    const fleshHi = phase === 3 ? "#32125d" : phase === 2 ? "#64142a" : "#3c1838";
    const glow = phase === 3 ? "140,80,255" : phase === 2 ? "255,48,120" : "0,220,255";
    const horn = phase === 3 ? "#d7ccff" : phase === 2 ? "#ffc0a0" : "#9ff8ff";

    ctx.save();
    ctx.scale(scale * breath, scale * breath);
    ctx.globalAlpha = fadeIn;

    const aura = ctx.createRadialGradient(0, -10, 10, 0, -10, 130);
    aura.addColorStop(0, `rgba(${glow},0.28)`);
    aura.addColorStop(0.45, `rgba(${glow},0.11)`);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(-150, -150, 300, 300);

    for (let i = 0; i < 5 + phase; i++) {
      const a = t * (0.7 + i * 0.08) + i * 1.35;
      const rx = Math.cos(a) * (55 + i * 7);
      const ry = -18 + Math.sin(a) * (28 + i * 2);
      ctx.strokeStyle = `rgba(${glow},${0.09 + pulse * 0.07})`;
      ctx.lineWidth = 2 + phase * 0.4;
      ctx.beginPath();
      ctx.moveTo(rx * 0.45, ry * 0.4);
      ctx.quadraticCurveTo(rx * 0.75, ry - 22, rx, ry);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    ctx.moveTo(-48, -42);
    ctx.quadraticCurveTo(-82, -10, -54, 50);
    ctx.lineTo(54, 50);
    ctx.quadraticCurveTo(82, -10, 48, -42);
    ctx.closePath();
    ctx.fill();

    for (let i = -3; i <= 3; i++) {
      const spineH = 18 + (3 - Math.abs(i)) * 8 + phase * 4;
      ctx.fillStyle = `rgba(${glow},${0.13 + pulse * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(i * 9 - 3, -31);
      ctx.lineTo(i * 9, -31 - spineH);
      ctx.lineTo(i * 9 + 3, -31);
      ctx.closePath();
      ctx.fill();
    }

    const bodyGrad = ctx.createLinearGradient(0, -55, 0, 58);
    bodyGrad.addColorStop(0, fleshHi);
    bodyGrad.addColorStop(0.42, flesh);
    bodyGrad.addColorStop(1, "#09030a");

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-30, -38);
    ctx.quadraticCurveTo(-50, -22, -45, 0);
    ctx.quadraticCurveTo(-40, 22, -20, 54);
    ctx.lineTo(20, 54);
    ctx.quadraticCurveTo(40, 22, 45, 0);
    ctx.quadraticCurveTo(50, -22, 30, -38);
    ctx.closePath();
    ctx.fill();

    for (const side of [-1, 1]) {
      const pec = ctx.createRadialGradient(side * 14, -24, 2, side * 14, -24, 17);
      pec.addColorStop(0, fleshHi);
      pec.addColorStop(1, flesh);
      ctx.fillStyle = pec;
      ctx.beginPath();
      ctx.ellipse(side * 14, -24, 18, 10, side * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let row = 0; row < 4; row++) {
      const y = -7 + row * 9;
      for (const side of [-1, 1]) {
        ctx.fillStyle = row % 2 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.16)";
        ctx.beginPath();
        ctx.ellipse(side * 7, y, 6, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const core = ctx.createRadialGradient(0, -22, 0, 0, -22, 16 + phase * 2);
    core.addColorStop(0, `rgba(255,255,255,${0.72 + pulse * 0.24})`);
    core.addColorStop(0.22, `rgba(${glow},0.8)`);
    core.addColorStop(1, `rgba(${glow},0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, -22, 16 + phase * 2 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${glow},${0.45 + pulse * 0.3})`;
    ctx.lineWidth = 1.4;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.ellipse(0, -22, 13 + r * 5, 4 + r * 1.5, t * (r % 2 ? -1 : 1), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const side of [-1, 1]) {
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(side * 37, -31);
      ctx.quadraticCurveTo(side * 70, -18, side * 64, 18);
      ctx.quadraticCurveTo(side * 61, 42, side * 45, 50);
      ctx.quadraticCurveTo(side * 34, 36, side * 40, 12);
      ctx.quadraticCurveTo(side * 42, -10, side * 28, -28);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = fleshHi;
      ctx.beginPath();
      ctx.ellipse(side * 52, -6, 13, 24, side * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0a0308";
      ctx.beginPath();
      ctx.ellipse(side * 48, 52, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let c = 0; c < 4; c++) {
        const cx = side * (39 + c * 5);
        ctx.fillStyle = horn;
        ctx.beginPath();
        ctx.moveTo(cx, 55);
        ctx.lineTo(cx + side * 8, 62 + Math.sin(t * 4 + c) * 2);
        ctx.lineTo(cx + side, 49);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (const side of [-1, 1]) {
      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.moveTo(side * 8, 43);
      ctx.lineTo(side * 26, 43);
      ctx.lineTo(side * 24, 75);
      ctx.lineTo(side * 6, 75);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#070307";
      ctx.fillRect(side < 0 ? -28 : 7, 72, 22, 6);
    }

    ctx.fillStyle = fleshHi;
    ctx.beginPath();
    ctx.moveTo(-17, -53);
    ctx.quadraticCurveTo(-19, -36, -9, -26);
    ctx.lineTo(9, -26);
    ctx.quadraticCurveTo(19, -36, 17, -53);
    ctx.quadraticCurveTo(8, -66, 0, -64);
    ctx.quadraticCurveTo(-8, -66, -17, -53);
    ctx.closePath();
    ctx.fill();

    for (const side of [-1, 1]) {
      ctx.fillStyle = horn;
      ctx.beginPath();
      ctx.moveTo(side * 10, -60);
      ctx.quadraticCurveTo(side * 32, -76, side * 38, -48);
      ctx.quadraticCurveTo(side * 24, -58, side * 13, -49);
      ctx.closePath();
      ctx.fill();
      if (phase >= 2) {
        ctx.beginPath();
        ctx.moveTo(side * 4, -63);
        ctx.quadraticCurveTo(side * 15, -88, side * 24, -69);
        ctx.lineTo(side * 11, -56);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (const y of [-49, -42]) {
      for (const side of [-1, 1]) {
        const eyeX = side * (y === -49 ? 6 : 10);
        const eye = ctx.createRadialGradient(eyeX, y, 0, eyeX, y, 4);
        eye.addColorStop(0, "rgba(255,255,255,0.92)");
        eye.addColorStop(0.35, `rgba(${glow},0.75)`);
        eye.addColorStop(1, `rgba(${glow},0)`);
        ctx.fillStyle = eye;
        ctx.beginPath();
        ctx.ellipse(eyeX, y, 4.5, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -34);
    ctx.quadraticCurveTo(0, -29 + pulse * 2, 8, -34);
    ctx.stroke();

    const veins = [
      [[-20, -32], [-12, -20], [-17, -5], [-8, 10]],
      [[18, -31], [11, -18], [16, -1], [7, 18]],
      [[-4, -15], [2, -4], [-2, 9], [5, 24]],
      [[-35, -4], [-48, 8], [-44, 31]],
      [[35, -4], [48, 8], [44, 31]],
    ];
    ctx.strokeStyle = `rgba(${glow},${0.34 + pulse * 0.2})`;
    ctx.lineWidth = 1.4;
    for (const vein of veins) {
      ctx.beginPath();
      ctx.moveTo(vein[0][0], vein[0][1]);
      for (let i = 1; i < vein.length; i++) ctx.lineTo(vein[i][0], vein[i][1]);
      ctx.stroke();
    }

    if (phase === 3) {
      for (let i = 0; i < 10; i++) {
        const a = t * 1.3 + i * 0.63;
        const r = 60 + Math.sin(t * 2 + i) * 12;
        ctx.fillStyle = `rgba(${glow},${0.16 + Math.sin(t * 5 + i) * 0.08})`;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, -10 + Math.sin(a) * r * 0.55, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
