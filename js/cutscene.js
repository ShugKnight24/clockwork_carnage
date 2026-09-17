import { CUTSCENE_SCRIPTS } from "../src/data/cutscene-scripts.js";
import { drawCutsceneArt } from "../src/rendering/cutscene-art.js";
import { drawSvgBg, warmSvgArt } from "../src/rendering/svg-art/index.js";
import { isModernArt } from "../src/rendering/art-style.js";

// Art keys that only exist as vector models. In Legacy they map to the closest
// procedural key, or to none so the frame uses the text-only layout instead of
// leaving an empty stage above the text box.
const LEGACY_ART_FALLBACK = {
  armor_crate: "hero_human",
  voss_recording: "portrait_voss",
  redacted_file: null,
  portrait_supervisor: null,
};
const _legacyFrames = new WeakMap();

function legacyFrame(frame) {
  if (!frame || isModernArt() || !(frame.art in LEGACY_ART_FALLBACK)) return frame;
  let f = _legacyFrames.get(frame);
  if (!f) {
    f = { ...frame, art: LEGACY_ART_FALLBACK[frame.art] || undefined };
    _legacyFrames.set(frame, f);
  }
  return f;
}


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
        ? (lastLine.text || "").replace(/\{AGENT\}/g, this.getPlayerName()).length
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
    const frame = legacyFrame(cs.script[cs.frame]);
    if (!frame) return;

    if (!cs.svgWarmed) {
      cs.svgWarmed = true;
      const arts = new Set();
      const bgs = new Set();
      const collect = (f) => {
        if (f.art) arts.add(f.art);
        if (f.bg) bgs.add(f.bg);
      };
      for (const f of cs.script) {
        collect(f);
        f.panels?.forEach(collect);
        f.flipbook?.pages?.forEach((p) => p.panel && collect(p.panel));
        if (f.flipbook?.cover) collect(this._flipbookCover(f.flipbook));
      }
      warmSvgArt(arts, bgs, ctx, w, h);
    }

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

      // Scene-only frames centre their text over the full background; a soft
      // band keeps it readable over the lit vector environments.
      if (!frame.art && frame.bg && frame.bg !== "dark") {
        const bandTop = centerY - textPad * 2;
        const bandH = frame.lines.length * textLineH + textPad * 3;
        const band = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandH);
        band.addColorStop(0, "rgba(0,2,10,0)");
        band.addColorStop(0.25, "rgba(0,2,10,0.74)");
        band.addColorStop(0.75, "rgba(0,2,10,0.74)");
        band.addColorStop(1, "rgba(0,2,10,0)");
        ctx.fillStyle = band;
        ctx.fillRect(0, bandTop, w, bandH);
      }

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
      const prompt = panel.prompt.replace(/\x1b/g, "");
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
    if (drawSvgBg(ctx, w, h, bg, t)) return;
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
    drawCutsceneArt(ctx, w, h, art, t, this.isTouchDevice);
  }
}
