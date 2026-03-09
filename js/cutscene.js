import { CUTSCENE_SCRIPTS } from "./data.js";

export class CutsceneEngine {
  constructor({
    audio,
    getKeys,
    getTouchControls,
    isTouchDevice,
    getPlayerName,
  }) {
    this.audio = audio;
    this.getKeys = getKeys;
    this.getTouchControls = getTouchControls;
    this.isTouchDevice = isTouchDevice;
    this.getPlayerName = getPlayerName || (() => "Agent");
    this.cutscene = null;
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
    this.cutscene.frame++;
    this.cutscene.frameStart = performance.now();
    this.cutscene.particles = [];
    this.audio.menuSelect();
    if (this.cutscene.frame >= this.cutscene.script.length) {
      this.end();
    }
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

    // Auto-advance
    if (frame.duration > 0 && elapsed > frame.duration) {
      this.advance();
      return;
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
    const s = h / 900; // responsive scale factor

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

    // === Text (typewriter reveal with glow) ===
    if (frame.lines) {
      const centerY = frame.art ? h * 0.72 : h * 0.4;
      let lineY = centerY;
      const textPad = Math.round(30 * s);
      const textLineH = Math.round(36 * s);

      // Text backdrop gradient
      if (frame.art) {
        const tbg = ctx.createLinearGradient(
          0,
          centerY - textPad,
          0,
          centerY + frame.lines.length * textLineH,
        );
        tbg.addColorStop(0, "rgba(0,0,10,0)");
        tbg.addColorStop(0.15, "rgba(0,0,10,0.65)");
        tbg.addColorStop(0.85, "rgba(0,0,10,0.65)");
        tbg.addColorStop(1, "rgba(0,0,10,0)");
        ctx.fillStyle = tbg;
        ctx.fillRect(
          0,
          centerY - textPad,
          w,
          frame.lines.length * textLineH + textPad,
        );
      }

      for (const line of frame.lines) {
        const lineElapsed = elapsed - line.delay;
        if (lineElapsed < 0) continue;

        // Template variable substitution
        const resolvedText = line.text.replace(
          /\{AGENT\}/g,
          this.getPlayerName(),
        );

        // Typewriter
        const charsPerSec = 40;
        const visibleChars = Math.min(
          resolvedText.length,
          Math.floor((lineElapsed / 1000) * charsPerSec),
        );
        const displayText = resolvedText.substring(0, visibleChars);
        const typing = visibleChars < resolvedText.length;

        // Fade in
        const fadeIn = Math.min(1, lineElapsed / 400);
        const sz = Math.round((line.size || 16) * s);

        ctx.globalAlpha = fadeIn;
        ctx.font = `bold ${sz}px monospace`;
        ctx.textAlign = "center";

        // Detect speaker lines ("NAME:" pattern)
        const speakerMatch = displayText.match(/^([A-Z\s]+):(.*)/);

        if (speakerMatch) {
          // Speaker name with accent color
          const speakerName = speakerMatch[1] + ":";
          const restText = speakerMatch[2];
          const nameW = ctx.measureText(speakerName).width;
          const restW = ctx.measureText(restText).width;
          const totalW = nameW + restW;

          ctx.save();
          ctx.shadowColor = line.color || "#00ffcc";
          ctx.shadowBlur = 6 * s;
          // Text outline for readability
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth = Math.max(1, 2.5 * s);
          ctx.strokeText(speakerName, w / 2 - totalW / 2 + nameW / 2, lineY);
          ctx.fillStyle = line.color || "#00ffcc";
          ctx.fillText(speakerName, w / 2 - totalW / 2 + nameW / 2, lineY);
          ctx.shadowBlur = 0;
          ctx.restore();

          ctx.strokeStyle = "rgba(0,0,0,0.5)";
          ctx.lineWidth = Math.max(1, 2 * s);
          ctx.strokeText(
            restText,
            w / 2 - totalW / 2 + nameW + restW / 2,
            lineY,
          );
          ctx.fillStyle = "#dde4f0";
          ctx.fillText(restText, w / 2 - totalW / 2 + nameW + restW / 2, lineY);
        } else {
          // Normal text with subtle glow
          ctx.save();
          ctx.shadowColor = line.color || "#88bbff";
          ctx.shadowBlur = (typing ? 10 : 4) * s;
          // Text outline for readability
          ctx.strokeStyle = "rgba(0,0,0,0.5)";
          ctx.lineWidth = Math.max(1, 2 * s);
          ctx.strokeText(displayText, w / 2, lineY);
          ctx.fillStyle = line.color || "#ffffff";
          ctx.fillText(displayText, w / 2, lineY);
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // Cursor blink while typing — thin beam
        if (typing) {
          const cursorPhase = (Math.sin(elapsed * 0.008) + 1) / 2;
          ctx.globalAlpha = 0.3 + cursorPhase * 0.6;
          const textW = ctx.measureText(displayText).width;
          ctx.fillStyle = line.color || "#00ffcc";
          ctx.fillRect(
            w / 2 + textW / 2 + 3 * s,
            lineY - sz + 4 * s,
            Math.max(1, 2 * s),
            sz,
          );
        }

        ctx.globalAlpha = 1;
        lineY += sz + Math.round(14 * s);
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
    const barHeight = h * 0.08;
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
    const skipAlpha = 0.3 + 0.15 * Math.sin(elapsed / 500);
    ctx.fillStyle = `rgba(255,255,255,${skipAlpha})`;
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

  // ── Comic Book Panel Renderer ───────────────────────────────────
  renderComicPanels(ctx, w, h, frame, elapsed, t) {
    const cs = this.cutscene;
    const s = h / 900; // responsive scale factor

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

    // Constrain comic page area proportionally
    const maxPageW = w * 0.94;
    const maxPageH = h * 0.92;
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
    const s = h / 900; // responsive scale factor
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
    const baseScale = 2.0 * (h / 900);
    ctx.scale(baseScale, baseScale);

    switch (art) {
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

      case "villain": {
        const fadeIn = Math.min(1, t / 1.5);
        const breathe = 1 + Math.sin(t * 1.5) * 0.02;
        ctx.scale(breathe * 1.5, breathe * 1.5); // Bulkier scale
        ctx.globalAlpha = fadeIn;

        // Dark aura (larger)
        const auraGrad = ctx.createRadialGradient(0, 0, 25, 0, 0, 120);
        auraGrad.addColorStop(0, "rgba(200,30,60,0.2)");
        auraGrad.addColorStop(0.5, "rgba(150,0,40,0.1)");
        auraGrad.addColorStop(1, "rgba(100,0,30,0)");
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-140, -140, 280, 280);

        // Ambient energy wisps
        for (let i = 0; i < 3; i++) {
          const angle = t * (1.5 + i * 0.4) + (i * Math.PI * 2) / 3;
          ctx.strokeStyle = `rgba(255,34,68,${0.15 + Math.sin(t * 3 + i) * 0.1})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, -10, 60 + i * 12, angle, angle + 0.6);
          ctx.stroke();
        }

        // Robes (wider, heavier)
        ctx.fillStyle = "#1a0520";
        ctx.beginPath();
        ctx.moveTo(-25, -15);
        ctx.quadraticCurveTo(-38, 20, -35 + Math.sin(t * 1.6) * 3, 65);
        ctx.lineTo(35 + Math.sin(t * 1.9) * 3, 65);
        ctx.quadraticCurveTo(38, 20, 25, -15);
        ctx.closePath();
        ctx.fill();

        // Armored torso (wider, plated)
        ctx.fillStyle = "#2a1030";
        ctx.beginPath();
        ctx.moveTo(-16, -32);
        ctx.lineTo(-18, 0);
        ctx.lineTo(18, 0);
        ctx.lineTo(16, -32);
        ctx.closePath();
        ctx.fill();

        // Chest plate detail
        ctx.fillStyle = "#3a1545";
        ctx.beginPath();
        ctx.moveTo(-10, -28);
        ctx.quadraticCurveTo(0, -24, 10, -28);
        ctx.lineTo(8, -12);
        ctx.quadraticCurveTo(0, -10, -8, -12);
        ctx.closePath();
        ctx.fill();

        // Chest core (pulsing)
        const corePulse = 0.4 + Math.sin(t * 2.5) * 0.4;
        ctx.fillStyle = `rgba(255,34,68,${corePulse * 0.5})`;
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -20, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Massive pauldrons (spiked)
        ctx.fillStyle = "#3a1040";
        ctx.beginPath();
        ctx.moveTo(-24, -32);
        ctx.quadraticCurveTo(-28, -42, -20, -38);
        ctx.lineTo(-10, -28);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(24, -32);
        ctx.quadraticCurveTo(28, -42, 20, -38);
        ctx.lineTo(10, -28);
        ctx.closePath();
        ctx.fill();
        // Pauldron edge glow
        ctx.strokeStyle = "#ff224440";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-24, -32);
        ctx.quadraticCurveTo(-28, -42, -20, -38);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(24, -32);
        ctx.quadraticCurveTo(28, -42, 20, -38);
        ctx.stroke();

        // Arms (thick, armored)
        ctx.fillStyle = "#1a0520";
        ctx.fillRect(-26, -26, 8, 24);
        ctx.fillRect(18, -26, 8, 24);
        // Arm armor bands
        ctx.fillStyle = "#3a1040";
        ctx.fillRect(-25, -20, 6, 4);
        ctx.fillRect(19, -20, 6, 4);
        ctx.fillRect(-25, -10, 6, 4);
        ctx.fillRect(19, -10, 6, 4);

        // Fists (gauntlets)
        ctx.fillStyle = "#2a0830";
        ctx.beginPath();
        ctx.arc(-22, 1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(22, 1, 4, 0, Math.PI * 2);
        ctx.fill();

        // Head/Hood (larger, more imposing)
        ctx.fillStyle = "#0d0315";
        ctx.beginPath();
        ctx.moveTo(-12, -34);
        ctx.quadraticCurveTo(-14, -48, -10, -52);
        ctx.quadraticCurveTo(0, -56, 10, -52);
        ctx.quadraticCurveTo(14, -48, 12, -34);
        ctx.quadraticCurveTo(0, -30, -12, -34);
        ctx.closePath();
        ctx.fill();

        // Hood ridges
        ctx.strokeStyle = "#1a0828";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, -50);
        ctx.quadraticCurveTo(0, -55, 10, -50);
        ctx.stroke();

        // Three eyes (pulsing, brighter)
        const eyeGlow = 0.7 + Math.sin(t * 3) * 0.3;
        ctx.fillStyle = `rgba(255,34,68,${eyeGlow})`;
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(-6, -42, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -42, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -47, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Legs (visible under robes)
        ctx.fillStyle = "#150418";
        ctx.fillRect(-10, 0, 8, 20);
        ctx.fillRect(2, 0, 8, 20);

        ctx.globalAlpha = 1;
        break;
      }

      case "villain_form2": {
        // Paradox Lord — Evolved Form: larger, more defined, crackling energy
        const fadeIn = Math.min(1, t / 1.2);
        const breathe = 1 + Math.sin(t * 2) * 0.03;
        ctx.scale(breathe * 1.7, breathe * 1.7);
        ctx.globalAlpha = fadeIn;

        // Intense aura
        const auraGrad = ctx.createRadialGradient(0, 0, 25, 0, 0, 120);
        auraGrad.addColorStop(0, "rgba(255,0,100,0.2)");
        auraGrad.addColorStop(0.6, "rgba(200,0,60,0.1)");
        auraGrad.addColorStop(1, "rgba(100,0,30,0)");
        ctx.fillStyle = auraGrad;
        ctx.fillRect(-140, -140, 280, 280);

        // Energy crackling arcs
        for (let i = 0; i < 4; i++) {
          const angle = t * (2 + i * 0.5) + (i * Math.PI) / 2;
          ctx.strokeStyle = `rgba(255,0,100,${0.3 + Math.sin(t * 4 + i) * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -10, 55 + i * 10, angle, angle + 0.8);
          ctx.stroke();
        }

        // Robes (larger, more flowing)
        ctx.fillStyle = "#200830";
        ctx.beginPath();
        ctx.moveTo(-25, -15);
        ctx.quadraticCurveTo(-35, 20, -32 + Math.sin(t * 1.8) * 3, 65);
        ctx.lineTo(32 + Math.sin(t * 2.1) * 3, 65);
        ctx.quadraticCurveTo(35, 20, 25, -15);
        ctx.closePath();
        ctx.fill();

        // Armored torso (evolved plates)
        ctx.fillStyle = "#3a1045";
        ctx.fillRect(-15, -32, 30, 34);
        // Chest core (pulsing brighter)
        const corePulse = 0.5 + Math.sin(t * 3) * 0.5;
        ctx.fillStyle = `rgba(255,0,100,${corePulse * 0.6})`;
        ctx.shadowColor = "#ff0066";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, -18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Larger pauldrons with spikes
        ctx.fillStyle = "#4a1555";
        ctx.beginPath();
        ctx.arc(-20, -28, 10, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(20, -28, 10, Math.PI, 0);
        ctx.fill();
        // Spikes
        ctx.fillStyle = "#660038";
        ctx.beginPath();
        ctx.moveTo(-20, -38);
        ctx.lineTo(-24, -52);
        ctx.lineTo(-16, -38);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(20, -38);
        ctx.lineTo(24, -52);
        ctx.lineTo(16, -38);
        ctx.closePath();
        ctx.fill();

        // Head/Hood (horned)
        ctx.fillStyle = "#0d0315";
        ctx.beginPath();
        ctx.arc(0, -42, 13, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.fillStyle = "#440022";
        ctx.beginPath();
        ctx.moveTo(-10, -50);
        ctx.lineTo(-16, -68);
        ctx.lineTo(-6, -52);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10, -50);
        ctx.lineTo(16, -68);
        ctx.lineTo(6, -52);
        ctx.closePath();
        ctx.fill();

        // Four eyes (evolved)
        const eye2Glow = 0.6 + Math.sin(t * 4) * 0.4;
        ctx.fillStyle = `rgba(255,0,68,${eye2Glow})`;
        ctx.shadowColor = "#ff0044";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-6, -44, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -44, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-3, -48, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -48, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1;
        break;
      }

      case "villain_final": {
        // Paradox Lord — FINAL FORM: terrifying, cosmic, reality-bending
        const fadeIn = Math.min(1, t / 1.5);
        const breathe = 1 + Math.sin(t * 1.5) * 0.04;
        ctx.scale(breathe * 2.0, breathe * 2.0);
        ctx.globalAlpha = fadeIn;

        // Reality distortion rings
        for (let ring = 0; ring < 3; ring++) {
          const r = 70 + ring * 20;
          const ringAlpha = 0.12 + Math.sin(t * 2 + ring) * 0.06;
          ctx.strokeStyle = `rgba(255,0,68,${ringAlpha})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            0,
            -10,
            r,
            t * (0.5 + ring * 0.2),
            t * (0.5 + ring * 0.2) + Math.PI,
          );
          ctx.stroke();
        }

        // Cosmic aura
        const cosmicGrad = ctx.createRadialGradient(0, -10, 15, 0, -10, 100);
        cosmicGrad.addColorStop(0, "rgba(255,0,50,0.25)");
        cosmicGrad.addColorStop(0.4, "rgba(180,0,60,0.12)");
        cosmicGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cosmicGrad;
        ctx.fillRect(-120, -120, 240, 240);

        // Temporal body (no longer robes — pure energy form)
        ctx.fillStyle = "#1a0520";
        ctx.beginPath();
        ctx.moveTo(-22, -20);
        ctx.quadraticCurveTo(-30, 15, -25 + Math.sin(t * 2) * 4, 55);
        ctx.lineTo(25 + Math.sin(t * 2.3) * 4, 55);
        ctx.quadraticCurveTo(30, 15, 22, -20);
        ctx.closePath();
        ctx.fill();
        // Energy veins
        ctx.strokeStyle = `rgba(255,0,100,${0.3 + Math.sin(t * 3) * 0.2})`;
        ctx.lineWidth = 1;
        for (let v = 0; v < 5; v++) {
          const vx = -15 + v * 7;
          ctx.beginPath();
          ctx.moveTo(vx, -18);
          ctx.quadraticCurveTo(vx + Math.sin(t * 2 + v) * 3, 15, vx, 50);
          ctx.stroke();
        }

        // Core (massive, aggressive)
        const finalCorePulse = 0.4 + Math.sin(t * 4) * 0.6;
        ctx.fillStyle = `rgba(255,0,50,${finalCorePulse * 0.5})`;
        ctx.shadowColor = "#ff0033";
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,100,150,${finalCorePulse * 0.8})`;
        ctx.beginPath();
        ctx.arc(0, -10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Crown of temporal shards
        ctx.fillStyle = "#880044";
        for (let s = 0; s < 7; s++) {
          const sAngle = -Math.PI / 2 + (s - 3) * 0.35;
          const sLen = 18 + Math.sin(t * 3 + s * 1.5) * 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sAngle) * 12, -42 + Math.sin(sAngle) * 12);
          ctx.lineTo(Math.cos(sAngle) * sLen, -42 + Math.sin(sAngle) * sLen);
          ctx.lineTo(
            Math.cos(sAngle + 0.1) * 10,
            -42 + Math.sin(sAngle + 0.1) * 10,
          );
          ctx.closePath();
          ctx.fill();
        }

        // Head (angular, crown-like)
        ctx.fillStyle = "#0d0315";
        ctx.beginPath();
        ctx.moveTo(-12, -35);
        ctx.lineTo(-14, -50);
        ctx.lineTo(0, -55);
        ctx.lineTo(14, -50);
        ctx.lineTo(12, -35);
        ctx.closePath();
        ctx.fill();

        // Six eyes (final form — the all-seeing)
        const eyeFGlow = 0.5 + Math.sin(t * 5) * 0.5;
        ctx.fillStyle = `rgba(255,0,40,${eyeFGlow})`;
        ctx.shadowColor = "#ff0022";
        ctx.shadowBlur = 15;
        const eyePositions = [
          [-7, -44, 2],
          [-2, -48, 1.5],
          [2, -48, 1.5],
          [7, -44, 2],
          [-4, -41, 1.3],
          [4, -41, 1.3],
        ];
        for (const [ex, ey, er] of eyePositions) {
          ctx.beginPath();
          ctx.arc(ex, ey, er, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

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

      case "station": {
        // Chronos Station exterior silhouette
        ctx.globalAlpha = Math.min(1, t / 1.5);
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
        ctx.shadowBlur = 8;
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
}
