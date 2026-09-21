import { CUTSCENE_SCRIPTS } from "../src/data/cutscene-scripts.js";
import { drawCutsceneArt } from "../src/rendering/cutscene-art.js";
import { drawSvgBg, warmSvgArt } from "../src/rendering/svg-art/index.js";
import { isModernArt, isRealisticArt } from "../src/rendering/art-style.js";
import {
  CS_FONT,
  INK,
  PAPER_BALLOON,
  PAPER_CAPTION,
  PAPER_RADIO,
  SUB_TEXT,
  classifyLine,
  csFont,
  drawBalloon,
  drawCaptionBox,
  inkFor,
  readableOn,
  setTracking,
  wrapText,
} from "../src/ui/cutscene-text.js";

// Art keys that only exist as vector models. In Legacy they map to the closest
// procedural key, or to none so the frame uses the text-only layout instead of
// leaving an empty stage above the text box.
const LEGACY_ART_FALLBACK = {
  armor_crate: "hero_human",
  voss_recording: "portrait_voss",
  unknown_recording: null,
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

// Flipbook cover: closed idle before it swings open on its own, then the swing.
const FB_COVER_IDLE_MS = 1200;
const FB_COVER_OPEN_MS = 1100;

export class CutsceneEngine {
  constructor({
    audio,
    getKeys,
    getTouchControls,
    isTouchDevice,
    getPlayerName,
    getSettings,
    getTextLayer,
  }) {
    this.audio = audio;
    this.getKeys = getKeys;
    this.getTouchControls = getTouchControls;
    this.isTouchDevice = isTouchDevice;
    this.getPlayerName = getPlayerName || (() => "Agent");
    this.getSettings = getSettings || (() => ({ cutsceneAutoAdvance: false }));
    // Text is drawn on a device-pixel-ratio layer (the HUD canvas) so it stays
    // crisp while the art canvas runs at the adaptive render scale.
    // getTextLayer() → { ctx, canvas } | null; defaults to #hudCanvas.
    this.getTextLayer = getTextLayer || null;
    this._tl = null;
    this._textLayouts = new WeakMap();
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

    // Flipbooks take input page by page: open the cover, finish a flip in
    // progress, or turn the settled page. Only the settled last page falls
    // through to end the frame.
    const fb = frame?.flipbook;
    if (fb?.pages?.length) {
      this._flipbookState(cs, fb);
      const now = performance.now();
      if (cs.fbPhase === "cover") {
        if (!cs.fbOpenStart) cs.fbOpenStart = now;
        else this._settleFlipbookPage(cs, 0, now);
        return;
      }
      if (cs.fbFlipStart) {
        this._settleFlipbookPage(cs, cs.fbPage + 1, now);
        return;
      }
      if (cs.fbPage < fb.pages.length - 1) {
        cs.fbFlipStart = now;
        return;
      }
    } else if (!cs.readyToAdvance) {
      // Text still typing: first click/Enter reveals it. Set frameStart far
      // enough back that all text is visible.
      cs.frameStart = performance.now() - 60000;
      cs.readyToAdvance = true;
      return;
    }

    // Ready — move to next frame
    cs.frame++;
    cs.frameStart = performance.now();
    cs.particles = [];
    cs.readyToAdvance = false;
    cs.fbPhase = null;
    this.audio.menuSelect();
    if (cs.frame >= cs.script.length) {
      this.end();
    }
  }

  /**
   * Flipbook progress is explicit state on the cutscene rather than derived
   * from elapsed time, so the auto-flip clock and player input always agree
   * on which page is showing.
   *   fbPhase      "cover" (closed / swinging open) | "pages"
   *   fbOpenStart  when the cover began to swing (0 = still closed)
   *   fbPage       index of the page on top
   *   fbPageStart  when that page settled (its hold counts from here)
   *   fbFlipStart  when it began turning toward fbPage + 1 (0 = settled)
   */
  _flipbookState(cs, fb) {
    if (cs.fbPhase) return;
    const now = performance.now();
    cs.fbPhase = fb.cover ? "cover" : "pages";
    cs.fbCoverStart = now;
    cs.fbOpenStart = 0;
    cs.fbPage = 0;
    cs.fbPageStart = now;
    cs.fbFlipStart = 0;
  }

  _settleFlipbookPage(cs, page, now) {
    cs.fbPhase = "pages";
    cs.fbPage = page;
    cs.fbPageStart = now;
    cs.fbFlipStart = 0;
  }

  /** Advance the flipbook clock: cover idle → swing → page holds → flips. */
  _stepFlipbook(cs, fb, now) {
    this._flipbookState(cs, fb);
    if (cs.fbPhase === "cover") {
      if (!cs.fbOpenStart && now - cs.fbCoverStart >= FB_COVER_IDLE_MS) {
        cs.fbOpenStart = now;
      }
      if (cs.fbOpenStart && now - cs.fbOpenStart >= FB_COVER_OPEN_MS) {
        this._settleFlipbookPage(cs, 0, now);
      }
      return;
    }
    const pg = fb.pages[cs.fbPage];
    if (cs.fbFlipStart) {
      if (now - cs.fbFlipStart >= (pg.flipMs ?? 600)) {
        this._settleFlipbookPage(cs, cs.fbPage + 1, now);
      }
    } else if (
      cs.fbPage < fb.pages.length - 1 &&
      now - cs.fbPageStart >= (pg.hold ?? 1400)
    ) {
      cs.fbFlipStart = now;
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
      // Flipbook frames page themselves; the frame is ready only once the
      // last page has settled.
      const fb = frame.flipbook;
      const now = performance.now();
      this._stepFlipbook(cs, fb, now);
      const onLast =
        cs.fbPhase === "pages" &&
        cs.fbPage === fb.pages.length - 1 &&
        !cs.fbFlipStart;
      cs.readyToAdvance = onLast;
      // requireAction books wait on the last page for press/click/tap.
      if (
        onLast &&
        !fb.requireAction &&
        this.getSettings().cutsceneAutoAdvance &&
        now - cs.fbPageStart >= (fb.pages[cs.fbPage].hold ?? 1400) + 400
      ) {
        this.advance();
      }
      return;
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

  // ── Text layer ──────────────────────────────────────────────────
  /** "legacy" | "comic" (player-facing Comic) | "cine" (player-facing Modern). */
  _look() {
    if (!isModernArt()) return "legacy";
    return isRealisticArt() ? "cine" : "comic";
  }

  _findTextLayer(ctx) {
    if (this.getTextLayer) return this.getTextLayer();
    if (typeof document === "undefined") return null;
    const c = document.getElementById("hudCanvas");
    if (!c || !c.getContext) return null;
    return { canvas: c, ctx: c.getContext("2d") };
  }

  /**
   * Resolve the crisp text layer for this frame. The HUD canvas covers the
   * same CSS box as the art canvas at full DPR, so mapping art-canvas pixels
   * to it is a plain scale. Falls back to the art canvas itself.
   */
  _beginText(ctx, w, h) {
    const layer = this._findTextLayer(ctx);
    const art = ctx.canvas;
    let tl = null;
    if (
      layer?.ctx && layer.canvas && art && layer.canvas !== art &&
      layer.canvas.width > 0 && layer.canvas.style?.display !== "none" &&
      (!art.style?.width || layer.canvas.style?.width === art.style.width) &&
      (!art.style?.height || layer.canvas.style?.height === art.style.height)
    ) {
      const g = layer.ctx;
      const kx = layer.canvas.width / w;
      const ky = layer.canvas.height / h;
      g.save();
      tl = { g, kx, ky, k: (kx + ky) / 2, same: false };
    } else {
      tl = { g: ctx, kx: 1, ky: 1, k: 1, same: true };
    }
    this._tl = tl;
  }

  _endText() {
    const tl = this._tl;
    if (tl && !tl.same) tl.g.restore();
    this._tl = null;
  }

  /**
   * Text context carrying the art context's current transform and alpha, so
   * text follows shakes, panel slams and page flips.
   */
  _tx(ctx) {
    const tl = this._tl;
    if (!tl || tl.same) return ctx;
    const m = ctx.getTransform();
    tl.g.setTransform(tl.kx * m.a, tl.ky * m.b, tl.kx * m.c, tl.ky * m.d, tl.kx * m.e, tl.ky * m.f);
    tl.g.globalAlpha = ctx.globalAlpha;
    return tl.g;
  }

  /** Device pixels per art pixel (shadowBlur/offsets ignore the transform). */
  _k() {
    return this._tl ? this._tl.k : 1;
  }

  _resolve(text) {
    return String(text ?? "").replace(/\{AGENT\}/g, this.getPlayerName());
  }

  render(ctx, w, h) {
    if (!this.cutscene) return;
    this._beginText(ctx, w, h);
    try {
      this._renderFrame(ctx, w, h);
    } finally {
      this._endText();
    }
  }

  _renderFrame(ctx, w, h) {
    const cs = this.cutscene;
    this._screenH = h;
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

    // === Title + lines, lettered per art style ===
    if (frame.title || frame.lines) {
      const look = this._look();
      if (look === "comic") this._drawComicText(ctx, w, h, frame, elapsed, t, s);
      else if (look === "cine") this._drawCineText(ctx, w, h, frame, elapsed, t, s);
      else this._drawLegacyText(ctx, w, h, frame, elapsed, t, s);
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

    // === Skip prompt + hold-to-skip bar ===
    this._drawSkipPrompt(ctx, w, h, h - barHeight / 2, s, elapsed, "bottom");
  }

  // ── Lines frames: Legacy (terminal typewriter) ──────────────────
  /** Cached per frame/size/name: wrapped rows and baselines, measured once. */
  _legacyLayout(g, frame, w, h, s) {
    const key = `L|${w}|${h}|${s}|${this.getPlayerName()}`;
    const hit = this._textLayouts.get(frame);
    if (hit?.key === key) return hit;
    const maxW = w * 0.86;
    const barH = h * (this.isTouchDevice ? 0.035 : 0.08);
    const lines = (frame.lines || []).map((line) => {
      const text = this._resolve(line.text);
      const sz = Math.round((line.size || 16) * s);
      const font = `bold ${sz}px monospace`;
      const sm = text.match(/^([A-Z\s]+):(.*)/);
      let speaker = null;
      let rest = text;
      let pillW = 0;
      let gap = 0;
      if (sm) {
        speaker = sm[1];
        rest = sm[2].trimStart();
        g.save();
        g.font = font;
        pillW = g.measureText(speaker).width + Math.round(8 * s) * 2;
        g.restore();
        gap = Math.round(8 * s);
      }
      const lay = wrapText(g, rest, font, maxW - pillW - gap);
      return {
        line, text, sz, font, speaker, pillW, gap,
        prefixLen: text.length - rest.length,
        rows: lay.lines, widths: lay.widths,
        step: sz + Math.round(14 * s),
      };
    });
    // Baselines: rows advance by the line's size + 14s, as before.
    let base = frame.art ? h * 0.72 : h * 0.4;
    let y = 0;
    for (const ln of lines) {
      ln.y = [];
      for (let r = 0; r < ln.rows.length; r++) {
        ln.y.push(y);
        y += ln.step;
      }
    }
    const last = lines.length ? lines[lines.length - 1] : null;
    const lastOff = last ? last.y[last.y.length - 1] : 0;
    const textPad = Math.round(30 * s);
    const bottomPad = Math.round(26 * s);
    // Keep the whole block (and its box) clear of the bottom letterbox.
    const limit = h - barH - Math.round(6 * s);
    const over = base + lastOff + bottomPad - limit;
    if (over > 0) base = Math.max(frame.art ? h * 0.46 : h * 0.12, base - over);
    for (const ln of lines) ln.y = ln.y.map((o) => base + o);
    const out = {
      key, lines, base,
      boxTop: base - textPad,
      boxBottom: base + lastOff + bottomPad,
    };
    this._textLayouts.set(frame, out);
    return out;
  }

  _drawLegacyTitle(ctx, w, h, frame, t, s) {
    const titleY = Math.round((frame.art ? h * 0.11 : h * 0.18) + Math.sin(t * 1.1) * 2 * s);
    let titleSize = Math.round(18 * s);
    const titlePadX = Math.round(22 * s);
    const titlePadY = Math.round(10 * s);
    const g0 = this._tx(ctx);
    g0.save();
    g0.font = `bold ${titleSize}px monospace`;
    let tw = g0.measureText(frame.title).width;
    // Shrink to fit narrow screens instead of spilling past the plate.
    if (tw + titlePadX * 2 > w * 0.92) {
      titleSize = Math.max(8, Math.floor(titleSize * (w * 0.92 - titlePadX * 2) / tw));
      g0.font = `bold ${titleSize}px monospace`;
      tw = g0.measureText(frame.title).width;
    }
    g0.restore();
    const titleW = Math.min(w * 0.94, tw + titlePadX * 2);
    const titleX = (w - titleW) / 2;
    ctx.save();
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
    ctx.restore();
    // Chromatic aberration title — cyan/magenta offsets
    const g = this._tx(ctx);
    const k = this._k();
    g.save();
    g.font = `bold ${titleSize}px monospace`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.globalCompositeOperation = "screen";
    g.globalAlpha *= 0.55;
    g.fillStyle = "#ff3a8a";
    g.fillText(frame.title, w / 2 - 1.2 * s, titleY);
    g.fillStyle = "#3affff";
    g.fillText(frame.title, w / 2 + 1.2 * s, titleY);
    g.restore();
    g.save();
    g.font = `bold ${titleSize}px monospace`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.shadowColor = "#00e5ff";
    g.shadowBlur = 10 * s * k;
    g.fillStyle = "#dffbff";
    g.fillText(frame.title, w / 2, titleY);
    g.restore();
  }

  _drawLegacyText(ctx, w, h, frame, elapsed, t, s) {
    if (frame.title) this._drawLegacyTitle(ctx, w, h, frame, t, s);
    if (!frame.lines) return;
    const lay = this._legacyLayout(this._tx(ctx), frame, w, h, s);
    const k = this._k();

    // Scene-only frames centre their text over the full background; a soft
    // band keeps it readable over the lit vector environments.
    if (!frame.art && frame.bg && frame.bg !== "dark") {
      const bandTop = lay.boxTop - Math.round(30 * s);
      const bandH = lay.boxBottom - bandTop + Math.round(30 * s);
      const band = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandH);
      band.addColorStop(0, "rgba(0,2,10,0)");
      band.addColorStop(0.25, "rgba(0,2,10,0.74)");
      band.addColorStop(0.75, "rgba(0,2,10,0.74)");
      band.addColorStop(1, "rgba(0,2,10,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, bandTop, w, bandH);
    }

    // Frosted glass text backdrop, sized to the laid-out rows
    if (frame.art) {
      const top = lay.boxTop;
      const hgt = lay.boxBottom - lay.boxTop;
      const tbg = ctx.createLinearGradient(0, top, 0, top + hgt);
      tbg.addColorStop(0, "rgba(0,0,10,0)");
      tbg.addColorStop(0.12, "rgba(0,0,10,0.85)");
      tbg.addColorStop(0.88, "rgba(0,0,10,0.85)");
      tbg.addColorStop(1, "rgba(0,0,10,0)");
      ctx.fillStyle = tbg;
      ctx.fillRect(0, top, w, hgt);

      const boxX = Math.round(w * 0.05);
      const boxW = Math.round(w * 0.9);
      const boxY = Math.round(top + 3 * s);
      const boxH = Math.round(hgt - 4 * s);
      const boxR = Math.max(4, Math.round(10 * s));
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
      ctx.strokeStyle = "rgba(0,200,255,0.12)";
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = Math.max(1, 1 * s);
      ctx.beginPath();
      ctx.roundRect(boxX + 2, boxY + 2, Math.max(0, boxW - 4), Math.max(0, boxH - 4), Math.max(3, boxR - 1));
      ctx.stroke();
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

    const charsPerSec = 18;
    for (const ln of lay.lines) {
      const line = ln.line;
      const lineElapsed = elapsed - line.delay;
      if (lineElapsed < 0) continue;
      const total = ln.text.length;
      const visible = Math.min(total, Math.floor((lineElapsed / 1000) * charsPerSec));
      const typing = visible < total;
      // The speaker badge shows at once; its characters still pace the line.
      let restVisible = Math.max(0, visible - ln.prefixLen);

      const fadeIn = Math.min(1, lineElapsed / 400);
      const slide = 4 * s * Math.max(0, 1 - lineElapsed / 500);
      const sz = ln.sz;
      const isImpact = (line.size || 16) >= 22;
      const scaleT = isImpact ? Math.min(1, lineElapsed / 600) : 1;
      const impactScale = isImpact ? 0.88 + 0.12 * scaleT : 1;
      const impactBlur = isImpact ? (20 - 12 * scaleT) * s : 0;
      const y0 = ln.y[0] - slide;

      ctx.save();
      ctx.globalAlpha = fadeIn;
      if (isImpact && scaleT < 1) {
        ctx.translate(w / 2, y0);
        ctx.scale(impactScale, impactScale);
        ctx.translate(-w / 2, -y0);
      }
      const g = this._tx(ctx);
      g.save();
      g.font = ln.font;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      g.lineJoin = "round";
      let cursorX = 0;
      let cursorY = y0;
      for (let r = 0; r < ln.rows.length; r++) {
        const rowY = ln.y[r] - slide;
        const row = ln.rows[r];
        const rw = ln.widths[r];
        let textX = w / 2 - rw / 2;
        if (ln.speaker && r === 0) {
          const lc = line.color || "#00ffcc";
          const totalW = ln.pillW + ln.gap + rw;
          const badgeX = w / 2 - totalW / 2;
          const badgePadY = Math.round(4 * s);
          const pillY = rowY - sz + badgePadY;
          const pillH = sz + badgePadY;
          g.fillStyle = lc + "33";
          g.beginPath();
          g.roundRect(badgeX, pillY, ln.pillW, pillH, Math.max(3, Math.round(5 * s)));
          g.fill();
          g.strokeStyle = lc + "59";
          g.lineWidth = Math.max(1, 1 * s);
          g.stroke();
          g.save();
          g.textAlign = "center";
          g.shadowColor = lc;
          g.shadowBlur = 6 * s * k;
          g.strokeStyle = "rgba(0,0,0,0.82)";
          g.lineWidth = Math.max(1.5, 3 * s);
          g.strokeText(ln.speaker, badgeX + ln.pillW / 2, rowY);
          g.fillStyle = lc;
          g.fillText(ln.speaker, badgeX + ln.pillW / 2, rowY);
          g.restore();
          textX = badgeX + ln.pillW + ln.gap;
        }
        if (restVisible <= 0) {
          if (r === 0) cursorX = textX;
          break;
        }
        // Anchor on the full row's left edge so typing never re-centres.
        const shown = restVisible >= row.length ? row : row.slice(0, restVisible);
        restVisible -= row.length + 1;
        g.save();
        if (ln.speaker) {
          g.strokeStyle = "rgba(0,0,0,0.78)";
          g.lineWidth = Math.max(1.5, 2.6 * s);
          g.strokeText(shown, textX, rowY);
          g.fillStyle = "#f2f6ff";
          g.fillText(shown, textX, rowY);
        } else {
          g.shadowColor = line.color || "#88bbff";
          g.shadowBlur = (isImpact && scaleT < 1 ? impactBlur : (typing ? 12 : 5) * s) * k;
          g.strokeStyle = "rgba(0,0,0,0.76)";
          g.lineWidth = Math.max(1.5, 2.6 * s);
          g.strokeText(shown, textX, rowY);
          g.fillStyle = line.color || "#f7fbff";
          g.fillText(shown, textX, rowY);
        }
        g.restore();
        if (typing) {
          cursorX = textX + (shown === row ? rw : g.measureText(shown).width);
          cursorY = rowY;
        }
        if (restVisible <= 0) break;
      }
      if (typing) {
        const cursorPhase = (Math.sin(elapsed * 0.01) + 1) / 2;
        const cursorAlpha = 0.3 + cursorPhase * 0.65;
        const cursorColor = line.color || "#00ffcc";
        const cx = cursorX + 3 * s;
        const cy = cursorY - sz + 4 * s;
        const cw = Math.max(1, 2 * s);
        g.save();
        g.globalAlpha *= cursorAlpha * 0.5;
        g.shadowColor = cursorColor;
        g.shadowBlur = 8 * s * k;
        g.fillStyle = cursorColor;
        g.fillRect(cx, cy, cw, sz);
        g.restore();
        g.save();
        g.globalAlpha *= cursorAlpha;
        g.fillStyle = cursorColor;
        g.fillRect(cx, cy, cw, sz);
        g.restore();
      }
      g.restore();
      ctx.restore();
    }
  }

  // ── Lines frames: Comic (lettered balloons and captions) ────────
  /** Lettering size for this screen, in art-canvas px. */
  _comicSize(h) {
    return Math.max(13, Math.min(30, h * 0.026));
  }

  _comicItem(g, kind, text, cz, w, narrow) {
    const upper = text.toUpperCase();
    if (kind === "splash") {
      const font = csFont("sfx", cz, 400);
      const lay = wrapText(g, upper, font, w * 0.9);
      const lineH = cz * 1.02;
      return { kind, font, rows: lay.lines, widths: lay.widths, lineH, padX: 0, padY: cz * 0.1,
        w: lay.width, h: lay.lines.length * lineH + cz * 0.2 };
    }
    const font = csFont("letter", cz, 700);
    const cap = kind === "caption";
    const maxW = narrow
      ? w * (cap ? 0.8 : 0.7)
      : Math.min(w * (cap ? 0.58 : 0.46), cz * (cap ? 30 : 24));
    const padX = cap ? cz * 0.75 : cz * 1.15;
    const padY = cap ? cz * 0.5 : cz * 0.7;
    const lay = wrapText(g, upper, font, maxW - padX * 2);
    const lineH = cz * 1.2;
    return { kind, font, rows: lay.lines, widths: lay.widths, lineH, padX, padY,
      w: lay.width + padX * 2, h: lay.lines.length * lineH + padY * 2 };
  }

  _comicLayout(g, frame, w, h) {
    const key = `C|${w}|${h}|${this.getPlayerName()}`;
    const hit = this._textLayouts.get(frame);
    if (hit?.key === key) return hit;
    const barH = h * (this.isTouchDevice ? 0.035 : 0.08);
    const narrow = w < 900;
    const src = (frame.lines || []).map((line) => {
      const cls = classifyLine(this._resolve(line.text));
      let kind = "caption";
      if (cls.speaker) kind = "radio";
      else if (cls.quoted) kind = "balloon";
      else if ((line.size || 16) >= 24) kind = "splash";
      return { line, cls, kind };
    });
    const bottom = h - barH - h * 0.03;
    const topLimit = frame.art ? h * (narrow ? 0.4 : 0.48) : barH + h * 0.06;
    let cz = this._comicSize(h);
    let items;
    let total;
    const gapOf = (c) => c * 0.55;
    for (let attempt = 0; attempt < 5; attempt++) {
      items = src.map(({ line, cls, kind }) => {
        const sizeK = kind === "splash" ? Math.max(1.5, Math.min(2.6, ((line.size || 16) / 16) * 1.35)) : 1;
        const it = this._comicItem(g, kind, cls.text, cz * sizeK, w, narrow);
        it.line = line;
        it.speaker = cls.speaker;
        it.cz = cz;
        if (kind === "radio") {
          it.tagFont = csFont("letter", cz * 0.72, 700);
          it.tagH = cz * 1.05;
          it.top = it.tagH * 0.55; // tag straddles the top edge
        } else {
          it.top = 0;
        }
        return it;
      });
      total = items.reduce((a, it) => a + it.h + it.top, 0) + gapOf(cz) * Math.max(0, items.length - 1);
      if (total <= bottom - topLimit || cz <= 11) break;
      cz *= 0.9;
    }
    // Stack: under the figure when there is art, centred otherwise.
    let y = frame.art
      ? Math.max(topLimit, Math.min(h * 0.62, bottom - total))
      : Math.max(topLimit, (h - total) / 2);
    const mixed = items.some((it) => it.kind === "caption") && items.some((it) => it.kind !== "caption" && it.kind !== "splash");
    const off = mixed ? Math.min(w * 0.07, cz * 4) : 0;
    const margin = w * 0.03;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      y += it.top;
      const cx = w / 2 + (it.kind === "caption" ? -off : it.kind === "splash" ? 0 : off);
      it.x = Math.max(margin, Math.min(w - margin - it.w, cx - it.w / 2));
      it.y = y;
      y += it.h + gapOf(cz);
    }
    // Tails: the first balloon points at the figure; a balloon right after
    // another joins it with a connector; others point sideways at the figure.
    const spk = { x: w / 2, y: h * 0.4 };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "balloon" || !frame.art) continue;
      const prev = items[i - 1];
      if (prev && prev.kind === "balloon") {
        it.connect = prev;
      } else if (!items.slice(0, i).some((p) => p.kind === "balloon" || p.kind === "caption" || p.kind === "radio")) {
        const ax = it.x + it.w / 2;
        const dx = spk.x - ax;
        const dy = spk.y - it.y;
        const d = Math.hypot(dx, dy) || 1;
        const L = Math.min(d * 0.6, cz * 3.2);
        it.tail = { x: ax + (dx / d) * L, y: it.y + (dy / d) * L, base: cz * 1.1 };
      } else {
        const left = it.x + it.w / 2 >= w / 2;
        it.tail = {
          x: left ? it.x - cz * 1.7 : it.x + it.w + cz * 1.7,
          y: it.y - cz * 0.2,
          base: cz * 1.0,
        };
      }
    }
    // Location caption, top left.
    let title = null;
    if (frame.title) {
      const tz = cz * 0.78;
      const font = csFont("letter", tz, 700);
      const lay = wrapText(g, String(frame.title).toUpperCase(), font, w * (narrow ? 0.6 : 0.42));
      const padX = tz * 0.7;
      const padY = tz * 0.45;
      title = { font, rows: lay.lines, lineH: tz * 1.2, padX, padY,
        x: Math.max(margin, w * 0.04), y: barH + h * 0.03,
        w: lay.width + padX * 2, h: lay.lines.length * tz * 1.2 + padY * 2, tz };
    }
    const out = { key, items, title, cz };
    this._textLayouts.set(frame, out);
    return out;
  }

  /** Rows of lettering centred in a box (textBaseline middle). */
  _letterRows(g, it, x, y, color) {
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const cx = x + it.w / 2;
    for (let r = 0; r < it.rows.length; r++) {
      g.fillText(it.rows[r], cx, y + it.padY + it.lineH * (r + 0.5) + it.lineH * 0.04);
    }
  }

  _drawComicItem(g, it, x, y, frameArt) {
    const lw = Math.max(1.2, it.cz * 0.11);
    g.font = it.font;
    if (it.kind === "caption") {
      drawCaptionBox(g, x, y, it.w, it.h, { lw });
      this._letterRows(g, it, x, y, inkFor(it.line.color, PAPER_CAPTION));
    } else if (it.kind === "balloon" || it.kind === "radio") {
      drawBalloon(g, x, y, it.w, it.h, {
        lw,
        tail: it.tail || null,
        radio: it.kind === "radio" || (!frameArt && it.kind === "balloon"),
        fill: it.kind === "radio" ? PAPER_RADIO : PAPER_BALLOON,
      });
      this._letterRows(g, it, x, y, INK);
      if (it.kind === "radio" && it.speaker) {
        // Name tab on the balloon's top-left edge.
        g.font = it.tagFont;
        // Measured once; the item object is part of the cached layout.
        if (it.tagW == null) it.tagW = g.measureText(it.speaker).width + it.cz * 0.9;
        const tw = it.tagW;
        const tx = x + it.h * 0.35;
        const ty = y - it.tagH * 0.55;
        g.fillStyle = INK;
        g.fillRect(tx, ty, tw, it.tagH);
        g.fillStyle = readableOn(it.line.color || "#00ffcc", INK, 7);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(it.speaker, tx + tw / 2, ty + it.tagH * 0.54);
      }
    } else {
      // Splash lettering: ink outline, hard drop, colour fill.
      const col = it.line.color || "#ffcc00";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.lineJoin = "round";
      const cx = x + it.w / 2;
      const drop = it.lineH * 0.06;
      for (let r = 0; r < it.rows.length; r++) {
        const ry = y + it.padY + it.lineH * (r + 0.5);
        g.fillStyle = INK;
        g.fillText(it.rows[r], cx + drop, ry + drop);
        g.strokeStyle = INK;
        g.lineWidth = it.lineH * 0.13;
        g.strokeText(it.rows[r], cx, ry);
        g.fillStyle = readableOn(col, "#101010", 4.5);
        g.fillText(it.rows[r], cx, ry);
      }
    }
  }

  _drawComicText(ctx, w, h, frame, elapsed, t, s) {
    const g0 = this._tx(ctx);
    const lay = this._comicLayout(g0, frame, w, h);
    if (lay.title) {
      const tt = lay.title;
      const a = Math.min(1, elapsed / 250);
      ctx.save();
      ctx.globalAlpha *= a;
      const g = this._tx(ctx);
      g.save();
      drawCaptionBox(g, tt.x, tt.y, tt.w, tt.h, { lw: Math.max(1.2, tt.tz * 0.1), fill: PAPER_CAPTION });
      g.font = tt.font;
      g.fillStyle = INK;
      g.textAlign = "left";
      g.textBaseline = "middle";
      for (let r = 0; r < tt.rows.length; r++) {
        g.fillText(tt.rows[r], tt.x + tt.padX, tt.y + tt.padY + tt.lineH * (r + 0.5) + tt.lineH * 0.04);
      }
      g.restore();
      ctx.restore();
    }
    for (const it of lay.items) {
      const le = elapsed - it.line.delay;
      if (le < 0) continue;
      // Pop in: quick scale-up from the balloon centre, no typing.
      const p = Math.min(1, le / 170);
      const ease = 1 - Math.pow(1 - p, 3);
      const sc = (it.kind === "splash" ? 1.25 - 0.25 * ease : 0.86 + 0.14 * ease);
      ctx.save();
      ctx.globalAlpha *= Math.min(1, le / 110);
      const cx = it.x + it.w / 2;
      const cy = it.y + it.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      const g = this._tx(ctx);
      g.save();
      this._drawComicItem(g, it, it.x, it.y, !!frame.art);
      if (it.connect) {
        // Connector neck to the previous balloon of the same speaker: paper
        // over both outlines, ink down the two sides only.
        const pc = it.connect;
        const bx = (Math.max(pc.x, it.x) + Math.min(pc.x + pc.w, it.x + it.w)) / 2;
        const lw = Math.max(1.2, it.cz * 0.11);
        const hw = it.cz * 0.35;
        const y0 = pc.y + pc.h;
        const y1 = it.y;
        g.fillStyle = PAPER_BALLOON;
        g.fillRect(bx - hw, y0 - lw * 1.6, hw * 2, y1 - y0 + lw * 3.2);
        g.strokeStyle = INK;
        g.lineWidth = lw * 2;
        g.beginPath();
        g.moveTo(bx - hw - lw, y0 - lw * 0.4);
        g.lineTo(bx - hw - lw, y1 + lw * 0.4);
        g.moveTo(bx + hw + lw, y0 - lw * 0.4);
        g.lineTo(bx + hw + lw, y1 + lw * 0.4);
        g.stroke();
      }
      g.restore();
      ctx.restore();
    }
  }

  // ── Lines frames: Modern (cinematic subtitles) ──────────────────
  _cineSize(h) {
    return Math.max(14, Math.min(34, h * 0.03));
  }

  _cineLayout(g, frame, w, h) {
    const key = `M|${w}|${h}|${this.getPlayerName()}`;
    const hit = this._textLayouts.get(frame);
    if (hit?.key === key) return hit;
    const barH = h * (this.isTouchDevice ? 0.035 : 0.08);
    const card = !frame.art; // text-only frames read as a title card
    let sz = this._cineSize(h);
    let items;
    let total;
    const bottom = h - barH - h * 0.035;
    const topLimit = card ? barH + h * 0.05 : h * 0.45;
    for (let attempt = 0; attempt < 5; attempt++) {
      const maxW = Math.min(w * (card ? 0.8 : 0.74), sz * 30);
      items = (frame.lines || []).map((line) => {
        const cls = classifyLine(this._resolve(line.text));
        const upper = cls.text === cls.text.toUpperCase() && /[A-Z]/.test(cls.text);
        const big = card && (line.size || 16) >= 24;
        let font;
        let tracking = 0;
        let lineH;
        let text = cls.text;
        let kind = "sub";
        if (big) {
          kind = "display";
          font = csFont("caps", sz * 1.9, 700);
          tracking = sz * 0.3;
          lineH = sz * 2.1;
          text = text.toUpperCase();
        } else if (upper && text.length <= 40) {
          kind = "slug";
          font = csFont("caps", sz * 0.82, 700);
          tracking = sz * 0.22;
          lineH = sz * 1.3;
        } else {
          const narr = !cls.quoted && !cls.speaker;
          font = csFont("cine", sz, narr ? 400 : 500, narr);
          lineH = sz * 1.32;
        }
        const lay = wrapText(g, text, font, maxW, tracking);
        const it = { line, kind, font, tracking, rows: lay.lines, widths: lay.widths, lineH, speaker: cls.speaker };
        it.nameH = cls.speaker ? sz * 0.95 : 0;
        it.h = it.nameH + lay.lines.length * lineH;
        return it;
      });
      total = items.reduce((a, it) => a + it.h, 0) + sz * 0.45 * Math.max(0, items.length - 1);
      if (total <= bottom - topLimit || sz <= 12) break;
      sz *= 0.9;
    }
    let y = card ? Math.max(topLimit, (h - total) / 2) : bottom - total;
    for (const it of items) {
      it.y = y;
      y += it.h + sz * 0.45;
    }
    let title = null;
    if (frame.title) {
      title = {
        font: csFont("caps", sz * 0.58, 700),
        tracking: sz * 0.14,
        x: Math.max(w * 0.05, 16),
        y: barH + h * 0.045,
        rule: sz * 1.4,
        text: String(frame.title).toUpperCase(),
      };
    }
    const out = { key, items, title, sz, bandTop: bottom - total - sz * 2.2, card };
    this._textLayouts.set(frame, out);
    return out;
  }

  _drawCineText(ctx, w, h, frame, elapsed, t, s) {
    // Subtitles hold still under camera shake.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g0 = this._tx(ctx);
    const lay = this._cineLayout(g0, frame, w, h);
    const sz = lay.sz;
    const k = this._k();
    const first = lay.items.length ? elapsed - lay.items[0].line.delay : -1;

    // Translucent band under the subtitle block.
    if (!lay.card && first > 0) {
      const a = Math.min(1, first / 400);
      const band = ctx.createLinearGradient(0, lay.bandTop, 0, h);
      band.addColorStop(0, "rgba(0,0,0,0)");
      band.addColorStop(0.3, `rgba(0,0,0,${0.5 * a})`);
      band.addColorStop(1, `rgba(0,0,0,${0.72 * a})`);
      ctx.fillStyle = band;
      ctx.fillRect(0, lay.bandTop, w, h - lay.bandTop);
    }

    const g = this._tx(ctx);
    g.save();
    g.textBaseline = "alphabetic";
    g.shadowColor = "rgba(0,0,0,0.9)";
    g.shadowBlur = sz * 0.22 * k;
    g.shadowOffsetY = sz * 0.05 * k;

    if (lay.title) {
      const tt = lay.title;
      const a = Math.min(1, elapsed / 600);
      g.globalAlpha = 0.8 * a;
      g.fillStyle = SUB_TEXT;
      g.fillRect(tt.x, tt.y - sz * 0.22, tt.rule, Math.max(1, sz * 0.06));
      g.font = tt.font;
      setTracking(g, tt.tracking);
      g.textAlign = "left";
      g.fillText(tt.text, tt.x + tt.rule + sz * 0.5, tt.y);
      setTracking(g, 0);
    }

    // Newest line at full strength; earlier lines settle back.
    let newest = -1;
    for (let i = 0; i < lay.items.length; i++) {
      if (elapsed >= lay.items[i].line.delay) newest = i;
    }
    g.textAlign = "center";
    for (let i = 0; i <= newest; i++) {
      const it = lay.items[i];
      const le = elapsed - it.line.delay;
      const a = Math.min(1, le / 300) * (i < newest && !lay.card ? 0.66 : 1);
      const rise = sz * 0.12 * Math.max(0, 1 - le / 300);
      g.globalAlpha = a;
      let y = it.y - rise;
      if (it.speaker) {
        g.font = csFont("caps", sz * 0.6, 700);
        setTracking(g, sz * 0.14);
        g.fillStyle = readableOn(it.line.color || "#9fd8ff", "#101010", 5);
        g.fillText(it.speaker, w / 2 + sz * 0.07, y + sz * 0.62);
        setTracking(g, 0);
        y += it.nameH;
      }
      g.font = it.font;
      setTracking(g, it.tracking);
      g.fillStyle = it.kind === "slug" ? "rgba(244,241,234,0.82)" : SUB_TEXT;
      for (let r = 0; r < it.rows.length; r++) {
        g.fillText(it.rows[r], w / 2 + it.tracking / 2, y + it.lineH * (r + 0.78));
      }
      setTracking(g, 0);
    }
    g.restore();
    ctx.restore();
  }

  // ── Continue / skip prompt ──────────────────────────────────────
  /**
   * Bottom-right prompt (lines frames) or top-right (comic pages), plus the
   * hold-to-skip bar. Wording follows the input device.
   */
  _drawSkipPrompt(ctx, w, h, cy, s, elapsed, where) {
    const cs = this.cutscene;
    const look = this._look();
    const touch = this.isTouchDevice;
    const right = w - Math.round(Math.max(16, 20 * s));
    let barY;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = this._tx(ctx);
    g.save();
    g.textAlign = "right";
    g.textBaseline = "middle";
    if (look === "legacy") {
      const ready = cs.readyToAdvance && where === "bottom";
      const a = ready ? 0.6 + 0.35 * Math.sin(elapsed / 300) : 0.3 + 0.15 * Math.sin(elapsed / 500);
      g.fillStyle = ready ? `rgba(0,255,204,${a})` : `rgba(255,255,255,${Math.max(a, where === "top" ? 0.4 : 0)})`;
      g.font = `${Math.max(10, Math.round(12 * s))}px monospace`;
      const label = where === "bottom"
        ? (touch ? "Tap to continue  ·  Hold to skip" : "[ENTER] continue  ·  [ESC] skip")
        : (touch ? "Tap: next  ·  Hold: skip" : "[ENTER] next  ·  [ESC] skip");
      g.fillText(label, right, cy);
    } else {
      const px = Math.max(10, Math.round(h * 0.017));
      const ready = cs.readyToAdvance;
      const a = ready ? 0.78 + 0.18 * Math.sin(elapsed / 320) : 0.55;
      g.font = csFont("caps", px, 700);
      setTracking(g, px * 0.14);
      g.fillStyle = look === "comic" ? `rgba(255,241,184,${a})` : `rgba(244,241,234,${a})`;
      const label = touch
        ? "TAP TO CONTINUE   ·   HOLD TO SKIP"
        : "ENTER  CONTINUE   ·   ESC  SKIP";
      g.fillText(label, right, cy);
      setTracking(g, 0);
    }
    g.restore();
    ctx.restore();

    if (cs.skipHeldStart > 0) {
      const holdProgress = Math.min(1, (performance.now() - cs.skipHeldStart) / 1000);
      const skipBarW = Math.round(Math.max(90, 120 * s));
      const skipBarH = Math.max(2, Math.round(4 * s));
      const skipBarX = right - skipBarW;
      barY = where === "bottom" ? cy - Math.max(14, 18 * s) - skipBarH : cy + Math.max(10, 12 * s);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(skipBarX, barY, skipBarW, skipBarH);
      ctx.fillStyle = look === "cine" ? SUB_TEXT : "#00ffcc";
      ctx.fillRect(skipBarX, barY, skipBarW * holdProgress, skipBarH);
      ctx.save();
      const g2 = this._tx(ctx);
      g2.save();
      g2.fillStyle = "rgba(255,255,255,0.6)";
      g2.textAlign = "right";
      g2.textBaseline = where === "bottom" ? "bottom" : "top";
      g2.font = look === "legacy"
        ? `${Math.max(9, Math.round(10 * s))}px monospace`
        : csFont("caps", Math.max(9, Math.round(h * 0.014)), 700);
      g2.fillText(
        touch ? "Hold to skip all..." : "Hold SPACE to skip all...",
        right,
        where === "bottom" ? barY - 4 : barY + skipBarH + 4,
      );
      g2.restore();
      ctx.restore();
    }
  }

  // ── Panel / page lettering (flipbook pages + comic panels) ──────
  /**
   * Caption layout for one panel, cached on the panel object. `mode` is
   * "page" (full-bleed flipbook page) or "panel" (a panel on a comic page).
   */
  _panelCaptionLayout(g, panel, pw, ph, mode) {
    const look = this._look();
    const sh = this._screenH || ph;
    const key = `${look}|${mode}|${Math.round(pw)}|${Math.round(ph)}|${sh}|${this.getPlayerName()}`;
    const hit = this._textLayouts.get(panel);
    if (hit?.key === key) return hit;
    const text = this._resolve(panel.caption);
    const cls = classifyLine(text);
    const capSize = panel.captionSize ?? (mode === "page" ? 13 : 12);
    const out = { key, look, cls };
    if (look === "legacy") {
      const s = this._legacyS(sh);
      const fontSize = Math.max(11, Math.round(capSize * s));
      const padX = Math.round(14 * s);
      const font = `bold ${fontSize}px monospace`;
      const maxW = mode === "page" ? pw - padX * 4 : pw - 12 - padX * 2;
      const lay = wrapText(g, text, font, maxW);
      Object.assign(out, { font, fontSize, padX, padY: Math.round(8 * s), rows: lay.lines, widths: lay.widths,
        lineH: fontSize + Math.max(3, 4 * s), width: lay.width, text });
    } else if (look === "comic") {
      const narrow = pw < 900;
      let kind = cls.speaker ? "radio" : cls.quoted ? "balloon" : "caption";
      if (capSize >= 18 && !cls.speaker && !cls.quoted) kind = "splash";
      const base = this._comicSize(sh) * (mode === "page" ? 1 : 0.8);
      const cz = Math.max(10.5, base * Math.sqrt(capSize / (mode === "page" ? 14 : 12)));
      const it = this._comicItem(g, kind, cls.text, kind === "splash" ? cz * 1.7 : cz, pw, narrow);
      // Keep every box inside its panel.
      if (it.w > pw * 0.92 && kind !== "splash") {
        const lay = wrapText(g, cls.text.toUpperCase(), it.font, pw * 0.92 - it.padX * 2);
        it.rows = lay.lines;
        it.widths = lay.widths;
        it.w = lay.width + it.padX * 2;
        it.h = lay.lines.length * it.lineH + it.padY * 2;
      }
      it.cz = cz;
      it.speaker = cls.speaker;
      it.line = { color: panel.captionColor };
      if (kind === "radio") {
        it.tagFont = csFont("letter", cz * 0.72, 700);
        it.tagH = cz * 1.05;
      }
      out.item = it;
      out.w = it.w;
      out.h = it.h + (kind === "radio" ? it.tagH * 0.55 : 0);
    } else {
      const sz = this._cineSize(sh) * (mode === "page" ? 0.9 : 0.7);
      const card = capSize >= 18 && !cls.speaker;
      const font = card ? csFont("caps", sz * 1.5, 700) : csFont("cine", sz, cls.quoted || cls.speaker ? 500 : 400, !cls.quoted && !cls.speaker);
      const tracking = card ? sz * 0.26 : 0;
      const shown = card ? cls.text.toUpperCase() : cls.text;
      const padX = card ? 0 : sz * 0.85;
      const padY = card ? 0 : sz * 0.5;
      const lay = wrapText(g, shown, font, Math.min(pw * 0.86, sz * 32) - padX * 2, tracking);
      const lineH = card ? sz * 1.8 : sz * 1.3;
      const nameH = cls.speaker ? sz * 0.9 : 0;
      Object.assign(out, { font, tracking, card, sz, padX, padY, rows: lay.lines, lineH, nameH,
        w: lay.width + padX * 2, h: lay.lines.length * lineH + padY * 2 + nameH });
    }
    this._textLayouts.set(panel, out);
    return out;
  }

  /** Legacy scale factor (text sizes in the original layout). */
  _legacyS(h) {
    const raw = h / 900;
    return this.isTouchDevice ? Math.max(0.82, raw) : raw;
  }

  /** Box top for a caption of height `bh` in a `ph`-tall area. */
  _captionY(pos, ph, bh, inset) {
    if (pos === "top") return inset;
    if (pos === "center") return (ph - bh) / 2;
    return ph - bh - inset;
  }

  /**
   * Draw a caption in a pw×ph area at the context origin. `reveal` is ms
   * since the caption appeared (Legacy types; the others pop or fade in).
   */
  _drawCaption(ctx, panel, pw, ph, mode, reveal) {
    const g0 = this._tx(ctx);
    const L = this._panelCaptionLayout(g0, panel, pw, ph, mode);
    const pos = panel.captionPos || "bottom";
    const k = this._k();
    if (L.look === "legacy") {
      const boxH = L.rows.length * L.lineH + L.padY * 2;
      if (mode === "page") {
        const boxW = Math.min(pw - L.padX * 2, L.width + L.padX * 2);
        const boxX = (pw - boxW) / 2;
        const boxY = this._captionY(pos, ph, boxH, L.padY * 1.5);
        ctx.fillStyle = panel.captionBg || "rgba(248,238,210,0.96)";
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, Math.max(2, 4 * (L.fontSize / 13)));
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = Math.max(1, L.fontSize * 0.11);
        ctx.stroke();
        const g = this._tx(ctx);
        g.save();
        g.font = L.font;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = readableOn(panel.captionColor || "#1a1208", panel.captionBg || "#f8eed2", 4.5);
        for (let r = 0; r < L.rows.length; r++) {
          g.fillText(L.rows[r], boxX + boxW / 2, boxY + L.padY + L.lineH * (r + 0.5));
        }
        g.restore();
        return;
      }
      // Comic-page panel: dark plate, typed in, anchored left so it never shifts.
      const capBg = panel.captionBg || "rgba(0,0,0,0.85)";
      const capColor = readableOn(panel.captionColor || "#ffffff", "#0a0a12", 4.5);
      const boxW = Math.min(pw - 12, L.width + 20);
      const boxX = (pw - boxW) / 2;
      const boxY = this._captionY(pos, ph, boxH, 6);
      ctx.fillStyle = capBg;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 3);
      ctx.fill();
      ctx.strokeStyle = capColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      const visible = Math.min(L.text.length, Math.floor((reveal / 1000) * 35));
      let left = visible;
      const g = this._tx(ctx);
      g.save();
      g.font = L.font;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.shadowColor = capColor;
      g.shadowBlur = (visible < L.text.length ? 8 : 3) * k;
      g.fillStyle = capColor;
      for (let r = 0; r < L.rows.length && left > 0; r++) {
        const row = L.rows[r];
        g.fillText(left >= row.length ? row : row.slice(0, left), pw / 2 - L.widths[r] / 2, boxY + L.padY + L.lineH * (r + 0.5));
        left -= row.length + 1;
      }
      g.restore();
      return;
    }

    const a = Math.min(1, reveal / 160);
    if (L.look === "comic") {
      const it = L.item;
      const inset = mode === "page" ? ph * 0.05 : Math.max(6, it.cz * 0.5);
      const top = this._captionY(pos, ph, L.h, inset);
      const x = (pw - it.w) / 2;
      const y = top + (it.kind === "radio" ? it.tagH * 0.55 : 0);
      const ease = 1 - Math.pow(1 - a, 3);
      const sc = it.kind === "splash" ? 1.2 - 0.2 * ease : 0.88 + 0.12 * ease;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, reveal / 110);
      ctx.translate(pw / 2, y + it.h / 2);
      ctx.scale(sc, sc);
      ctx.translate(-pw / 2, -(y + it.h / 2));
      const g = this._tx(ctx);
      g.save();
      this._drawComicItem(g, it, x, y, false);
      g.restore();
      ctx.restore();
      return;
    }

    // Modern: translucent plate, clean sans, soft shadow.
    const inset = mode === "page" ? ph * 0.06 : Math.max(6, L.sz * 0.5);
    const y = this._captionY(pos, ph, L.h, inset);
    const x = (pw - L.w) / 2;
    ctx.save();
    ctx.globalAlpha *= a;
    const g = this._tx(ctx);
    g.save();
    if (!L.card) {
      g.fillStyle = "rgba(6,8,12,0.66)";
      g.beginPath();
      g.roundRect(x, y, L.w, L.h, L.sz * 0.25);
      g.fill();
    }
    g.shadowColor = "rgba(0,0,0,0.9)";
    g.shadowBlur = L.sz * 0.22 * k;
    g.shadowOffsetY = L.sz * 0.05 * k;
    g.textAlign = "center";
    g.textBaseline = "middle";
    let ty = y + L.padY;
    if (L.cls.speaker) {
      g.font = csFont("caps", L.sz * 0.6, 700);
      setTracking(g, L.sz * 0.14);
      g.fillStyle = readableOn(panel.captionColor || "#9fd8ff", "#101010", 5);
      g.fillText(L.cls.speaker, pw / 2 + L.sz * 0.07, ty + L.nameH * 0.45);
      ty += L.nameH;
    }
    g.font = L.font;
    setTracking(g, L.tracking);
    g.fillStyle = L.card ? readableOn(panel.captionColor || SUB_TEXT, "#101010", 7) : SUB_TEXT;
    for (let r = 0; r < L.rows.length; r++) {
      g.fillText(L.rows[r], pw / 2 + L.tracking / 2, ty + L.lineH * (r + 0.5));
    }
    setTracking(g, 0);
    g.restore();
    ctx.restore();
  }

  /** Onomatopoeia at the panel's sfx anchor. `grow` 0..1 is the slam-in. */
  _drawSfx(ctx, panel, pw, ph, s, mode, grow = 1) {
    const look = this._look();
    const sx = (panel.sfxX ?? 0.5) * pw;
    const sy = (panel.sfxY ?? (mode === "page" ? 0.4 : 0.3)) * ph;
    ctx.save();
    ctx.translate(sx, sy);
    if (look === "cine") {
      // Film sound caption instead of drawn lettering.
      const px = this._cineSize(this._screenH || ph) * 0.62;
      const g = this._tx(ctx);
      g.save();
      g.font = csFont("caps", px, 700);
      setTracking(g, px * 0.2);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = "rgba(0,0,0,0.9)";
      g.shadowBlur = px * 0.3 * this._k();
      g.fillStyle = "rgba(244,241,234,0.85)";
      g.fillText(`[ ${panel.sfx} ]`, px * 0.1, 0);
      setTracking(g, 0);
      g.restore();
      ctx.restore();
      return;
    }
    const sc = mode === "panel" ? 0.5 + 0.5 * grow : 1;
    ctx.scale(sc, sc);
    ctx.rotate(((panel.sfxRot ?? (mode === "page" ? -8 : 0)) * Math.PI) / 180);
    const g = this._tx(ctx);
    g.save();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    if (look === "legacy") {
      if (mode === "page") {
        const sz = (panel.sfxSize ?? 28) * s;
        g.font = `900 italic ${sz}px Impact, "Arial Black", sans-serif`;
        g.lineWidth = Math.max(2, 4 * s);
      } else {
        g.font = `bold ${Math.round((panel.sfxSize || 28) * s)}px monospace`;
        g.lineWidth = 4;
      }
      g.strokeStyle = "#000";
      g.strokeText(panel.sfx, 0, 0);
      g.fillStyle = panel.sfxColor || "#ffcc00";
      g.fillText(panel.sfx, 0, 0);
    } else {
      // Comic: heavy italic display, hard ink drop, fat round-joined outline.
      const sz = Math.max(20, (panel.sfxSize ?? 28) * 1.35 * Math.max(s, this._comicSize(this._screenH || ph) / 22));
      g.font = csFont("sfx", sz, 400, true);
      setTracking(g, sz * 0.02);
      const drop = sz * 0.07;
      g.lineWidth = sz * 0.2;
      g.strokeStyle = INK;
      g.strokeText(panel.sfx, drop, drop);
      g.fillStyle = INK;
      g.fillText(panel.sfx, drop, drop);
      g.strokeText(panel.sfx, 0, 0);
      g.fillStyle = panel.sfxColor || "#ffcc00";
      g.fillText(panel.sfx, 0, 0);
      // Highlight rim along the top of the letters.
      g.lineWidth = Math.max(1, sz * 0.03);
      g.strokeStyle = "rgba(255,255,255,0.55)";
      g.strokeText(panel.sfx, -sz * 0.012, -sz * 0.02);
      setTracking(g, 0);
    }
    g.restore();
    ctx.restore();
  }

  /** Flipbook page lettering: sfx, caption, prompt. Origin = page top-left. */
  _drawPageText(ctx, pw, ph, panel, t, s, textAlpha) {
    ctx.save();
    ctx.globalAlpha *= textAlpha;
    if (panel.sfx) this._drawSfx(ctx, panel, pw, ph, s, "page");
    if (panel.caption) this._drawCaption(ctx, panel, pw, ph, "page", 1e9);
    if (panel.prompt) this._drawPagePrompt(ctx, panel, pw, ph, t, s);
    ctx.restore();
  }

  _drawPagePrompt(ctx, panel, pw, ph, t, s) {
    const look = this._look();
    const pulse = 0.65 + 0.35 * Math.sin(t * 5);
    let prompt = panel.prompt.replace(/\x1b/g, "");
    if (this.isTouchDevice) prompt = prompt.replace(/PRESS SPACE\s*\/\s*CLICK/i, "TAP");
    const py2 = ph * (panel.promptY ?? 0.78);
    const color = panel.promptColor || "#00ffcc";
    const k = this._k();
    const g = this._tx(ctx);
    g.save();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    if (look === "legacy") {
      let size = Math.round((panel.promptSize ?? 20) * s);
      g.font = `900 ${size}px monospace`;
      const mw = g.measureText(prompt).width;
      if (mw > pw * 0.92) {
        size = Math.max(9, Math.floor(size * (pw * 0.92) / mw));
        g.font = `900 ${size}px monospace`;
      }
      g.globalCompositeOperation = "lighter";
      g.shadowColor = color;
      g.shadowBlur = (12 + pulse * 16) * k;
      g.strokeStyle = "rgba(0,0,0,0.8)";
      g.lineWidth = Math.max(2, 4 * s);
      g.strokeText(prompt, pw / 2, py2);
      g.fillStyle = color;
      g.globalAlpha *= 0.7 + pulse * 0.3;
      g.fillText(prompt, pw / 2, py2);
    } else {
      const sh = this._screenH || ph;
      let px = Math.max(12, Math.min(26, sh * 0.026)) * ((panel.promptSize ?? 18) / 18);
      g.font = csFont("caps", px, 800);
      const tr = px * 0.16;
      setTracking(g, tr);
      const mw = g.measureText(prompt).width;
      if (mw > pw * 0.9) {
        px *= (pw * 0.9) / mw;
        g.font = csFont("caps", px, 800);
        setTracking(g, px * 0.16);
      }
      if (look === "comic") {
        g.lineWidth = px * 0.3;
        g.strokeStyle = INK;
        g.strokeText(prompt, pw / 2 + px * 0.08, py2);
        g.fillStyle = color;
        g.globalAlpha *= 0.75 + pulse * 0.25;
        g.fillText(prompt, pw / 2 + px * 0.08, py2);
      } else {
        g.shadowColor = "rgba(0,0,0,0.9)";
        g.shadowBlur = px * 0.4 * k;
        g.fillStyle = SUB_TEXT;
        g.globalAlpha *= 0.55 + pulse * 0.4;
        g.fillText(prompt, pw / 2 + px * 0.08, py2);
      }
      setTracking(g, 0);
    }
    g.restore();
  }

  /** Small page counter (e.g. "3 / 7"), right-aligned at (x, y). */
  _drawPageCounter(ctx, text, x, y, s) {
    const look = this._look();
    const g = this._tx(ctx);
    g.save();
    g.textAlign = "right";
    g.textBaseline = "alphabetic";
    if (look === "legacy") {
      g.font = `${Math.max(10, Math.round(11 * s))}px monospace`;
      g.fillStyle = "rgba(180,200,220,0.6)";
    } else {
      const px = Math.max(10, Math.round((this._screenH || 720) * 0.016));
      g.font = csFont("caps", px, 700);
      setTracking(g, px * 0.16);
      g.fillStyle = look === "comic" ? "rgba(255,241,184,0.75)" : "rgba(244,241,234,0.7)";
    }
    g.fillText(text, x, y);
    setTracking(g, 0);
    g.restore();
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
   *   requireAction: true,        // last page waits for press/click/tap
   *   cover: { bg, art, title, issue, tagline, price } | true,
   * }
   *
   * Cover: only books that define `cover` open on one (`true` = all
   * defaults, missing fields fall back to defaults). The closed book floats
   * on the backdrop for FB_COVER_IDLE_MS, then the cover swings open around
   * the left spine onto page 1. Books without `cover` (the act transitions)
   * open straight onto page 1. The cover is never counted as a page.
   *
   * Paging (state in _flipbookState): each page holds for `hold` ms, then
   * auto-flips over `flipMs`. Enter/click/tap opens the cover, completes a
   * flip in progress, or turns a settled page now; on the settled last page
   * it ends the frame.
   */
  renderFlipbook(ctx, w, h, frame, elapsed /* ms */, t /* sec */) {
    const fb = frame.flipbook;
    if (!fb || !fb.pages || !fb.pages.length) return;
    const cs = this.cutscene;
    this._flipbookState(cs, fb);
    const now = performance.now();

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

    const spineRight = (fb.spineSide ?? "right") === "right";
    const paperTint = fb.paperTint ?? "#0a0814";

    if (cs.fbPhase === "cover") {
      this._renderFlipbookCover(ctx, w, h, px, py, pw, ph, fb, cs, now, t, s, paperTint, spineRight);
    } else {
      const idx = cs.fbPage;
      const curPage = fb.pages[idx];
      const nextPage = fb.pages[idx + 1];
      const flipMs = curPage.flipMs ?? 600;
      // Render can run a beat past the flip's end before update() settles it.
      const flipT = cs.fbFlipStart && nextPage
        ? (flipMs > 0 ? Math.min(1, (now - cs.fbFlipStart) / flipMs) : 1)
        : 0;

      // Draw the next page underneath (revealed as current page flips away)
      if (nextPage && flipT > 0) {
        this._drawFlipbookPage(ctx, px, py, pw, ph, nextPage.panel, t, s, paperTint, 1, 0);
      }

      // Draw current page with horizontal page-flip transform
      if (flipT === 0) {
        // Lettering settles onto the page just after it lands.
        const textIn = Math.min(1, (now - cs.fbPageStart) / 220);
        this._drawFlipbookPage(ctx, px, py, pw, ph, curPage.panel, t, s, paperTint, 1, textIn);
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
        this._drawFlipbookPage(ctx, px, py, pw, ph, curPage.panel, t, s, paperTint, 1, Math.max(0, 1 - flipT * 2.5));
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

      this._drawFlipbookSpine(ctx, px, py, pw, ph, s, spineRight, 1);
    }

    // Vignette over whole composition
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Page indicator (subtle, bottom-right). The cover is not a page.
    if (cs.fbPhase === "pages") {
      this._drawPageCounter(ctx, `${cs.fbPage + 1} / ${fb.pages.length}`, px + pw - Math.max(8, 10 * s), py + ph - Math.max(8, 10 * s), s);
    }
  }

  /** Page binding shadow along the spine edge. */
  _drawFlipbookSpine(ctx, px, py, pw, ph, s, spineRight, alpha) {
    ctx.save();
    const spineGrad = ctx.createLinearGradient(
      spineRight ? px + pw - 30 * s : px + 30 * s,
      0,
      spineRight ? px + pw : px,
      0,
    );
    spineGrad.addColorStop(0, "rgba(0,0,0,0)");
    spineGrad.addColorStop(1, `rgba(0,0,0,${0.55 * alpha})`);
    ctx.fillStyle = spineGrad;
    ctx.fillRect(spineRight ? px + pw - 30 * s : px, py, 30 * s, ph);
    ctx.restore();
  }

  /** Cover config with defaults filled in (`cover: true` = all defaults). */
  _flipbookCover(fb) {
    const c = typeof fb.cover === "object" && fb.cover ? fb.cover : {};
    return {
      bg: c.bg ?? "boss_lair",
      art: c.art ?? "hero_armed",
      title: c.title ?? "CLOCKWORK CARNAGE",
      issue: c.issue ?? "#1",
      tagline: c.tagline ?? "",
      price: c.price ?? "$3.99",
    };
  }

  /**
   * Closed comic floating on the backdrop, then the cover swinging open
   * around the left spine onto page 1. The swing is a real rotation about
   * the spine projected with perspective: the face is rendered offscreen and
   * blitted in vertical strips so the free edge grows as it lifts toward the
   * viewer, clipped to the exact projected quad.
   */
  _renderFlipbookCover(ctx, w, h, px, py, pw, ph, fb, cs, now, t, s, paperTint, spineRight) {
    const open = cs.fbOpenStart
      ? Math.min(1, (now - cs.fbOpenStart) / FB_COVER_OPEN_MS)
      : 0;
    // Swing: a slow deliberate lift that speeds up once past vertical and
    // flops open, so most of the time is spent where the face is visible.
    const e = Math.pow(open, 1.7);
    const closed = 1 - Math.min(1, open * 1.6);

    // Closed book sits smaller and floats; it grows to page size as it opens
    // so the hand-off to the pages phase is seamless.
    const bookScale = 0.8 + 0.2 * (1 - closed);
    const floatY = Math.sin(t * 1.9) * 7 * s * closed;
    const tilt = Math.sin(t * 1.3) * 0.008 * closed;
    const cx = w / 2;
    const cy = h / 2;

    // Ground shadow: tighter and darker when the book dips toward the floor
    if (closed > 0) {
      const lift = 0.5 + 0.5 * Math.sin(t * 1.9);
      ctx.save();
      ctx.globalAlpha = closed * (0.75 - 0.25 * lift);
      ctx.translate(cx, cy + (ph * bookScale) / 2 + 26 * s);
      ctx.scale(1, 0.09);
      const rx = (pw * bookScale) / 2 * (1.02 - 0.06 * lift);
      const ground = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      ground.addColorStop(0, "rgba(0,0,0,0.9)");
      ground.addColorStop(0.6, "rgba(0,0,0,0.45)");
      ground.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy + floatY);
    ctx.rotate(tilt);
    ctx.scale(bookScale, bookScale);
    ctx.translate(-cx, -cy);

    // Book block: back board + page edges peeking out right and bottom
    if (closed > 0) {
      ctx.save();
      ctx.globalAlpha = closed;
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 36 * s;
      ctx.shadowOffsetY = 18 * s;
      const layers = 6;
      const step = 1.7 * s;
      ctx.fillStyle = "#15101c";
      ctx.fillRect(px + (layers + 1) * step, py + (layers + 1) * step, pw, ph);
      ctx.shadowColor = "transparent";
      for (let i = layers; i >= 1; i--) {
        ctx.fillStyle = i % 2 ? "#d9ceb4" : "#b8aa8c";
        ctx.fillRect(px + i * step, py + i * step, pw, ph);
      }
      ctx.restore();
    }

    // Page 1 waits under the cover
    if (open > 0) {
      this._drawFlipbookPage(ctx, px, py, pw, ph, fb.pages[0].panel, t, s, paperTint, 1, 0);
      this._drawFlipbookSpine(ctx, px, py, pw, ph, s, spineRight, e);
    }

    // Project the cover's free edge after rotating `theta` about the spine.
    const theta = e * Math.PI;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const camD = pw * 4;
    const project = (u) => {
      const f = camD / (camD - u * pw * sin);
      return { x: cx + (px + u * pw * cos - cx) * f, f };
    };
    const edge = project(1);
    const spineX = px;
    const top = (f) => cy + (py - cy) * f;
    const bot = (f) => cy + (py + ph - cy) * f;

    // Shadow the lifting cover throws across page 1
    if (open > 0 && sin > 0.001) {
      const reach = Math.max(spineX + pw * 0.14 * sin, edge.x + pw * 0.16 * sin);
      const sh = ctx.createLinearGradient(spineX, 0, reach, 0);
      sh.addColorStop(0, `rgba(0,0,0,${0.7 * sin})`);
      sh.addColorStop(0.75, `rgba(0,0,0,${0.35 * sin})`);
      sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(px, py, Math.min(pw, reach - px), ph);
    }

    const quad = () => {
      ctx.beginPath();
      ctx.moveTo(spineX, py);
      ctx.lineTo(edge.x, top(edge.f));
      ctx.lineTo(edge.x, bot(edge.f));
      ctx.lineTo(spineX, py + ph);
      ctx.closePath();
    };

    if (cos > 0.002) {
      // Front face
      const face = this._renderCoverFace(ctx, pw, ph, fb, t, s, paperTint);
      if (open === 0) {
        ctx.drawImage(face, px, py, pw, ph);
      } else {
        ctx.save();
        quad();
        ctx.clip();
        const strips = 48;
        for (let i = 0; i < strips; i++) {
          const a = project(i / strips);
          const b = project((i + 1) / strips);
          const f = Math.max(a.f, b.f);
          ctx.drawImage(
            face,
            (i / strips) * face.width, 0, face.width / strips + 1, face.height,
            a.x, top(f), b.x - a.x + 1, bot(f) - top(f),
          );
        }
        // Turning away from the light darkens the face toward the free edge
        const shade = ctx.createLinearGradient(spineX, 0, edge.x, 0);
        shade.addColorStop(0, `rgba(0,0,0,${0.15 * (1 - cos)})`);
        shade.addColorStop(1, `rgba(0,0,0,${0.75 * (1 - cos)})`);
        ctx.fillStyle = shade;
        ctx.fill();
        // Gloss sweep catches the light early in the lift
        const glint = Math.sin(Math.min(1, open * 2.2) * Math.PI);
        if (glint > 0.01) {
          const gx = spineX + (edge.x - spineX) * (0.2 + 0.6 * open * 2.2);
          const gloss = ctx.createLinearGradient(gx - pw * 0.12, 0, gx + pw * 0.12, 0);
          gloss.addColorStop(0, "rgba(255,255,255,0)");
          gloss.addColorStop(0.5, `rgba(255,248,225,${0.28 * glint})`);
          gloss.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gloss;
          ctx.fill();
        }
        ctx.restore();
        // Board edge catches a rim of light
        ctx.save();
        ctx.strokeStyle = `rgba(255,240,210,${0.35 * sin})`;
        ctx.lineWidth = Math.max(1, 2 * s * edge.f);
        ctx.beginPath();
        ctx.moveTo(edge.x, top(edge.f));
        ctx.lineTo(edge.x, bot(edge.f));
        ctx.stroke();
        ctx.restore();
      }
    } else if (cos < -0.002) {
      // Inside cover: plain newsprint, brightening as it lies flat, fading
      // out before the pages phase takes over.
      const fade = 1 - Math.max(0, (open - 0.8) / 0.2);
      ctx.save();
      ctx.globalAlpha = fade;
      quad();
      const inside = ctx.createLinearGradient(spineX, 0, edge.x, 0);
      const lit = -cos;
      inside.addColorStop(0, `rgb(${Math.round(90 + 110 * lit)},${Math.round(82 + 100 * lit)},${Math.round(70 + 84 * lit)})`);
      inside.addColorStop(1, `rgb(${Math.round(60 + 150 * lit)},${Math.round(54 + 140 * lit)},${Math.round(46 + 120 * lit)})`);
      ctx.fillStyle = inside;
      ctx.fill();
      // Crease shadow where the board meets the spine
      const crease = ctx.createLinearGradient(spineX, 0, spineX - pw * 0.08 * lit - 4 * s, 0);
      crease.addColorStop(0, "rgba(0,0,0,0.5)");
      crease.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = crease;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draw the comic's front cover into a reusable offscreen canvas at device
   * resolution so the swing can resample it with perspective.
   */
  _renderCoverFace(ctx, pw, ph, fb, t, s, paperTint) {
    const m = ctx.getTransform();
    const dpr = Math.max(1, Math.hypot(m.a, m.b));
    const cw = Math.max(1, Math.ceil(pw * dpr));
    const chh = Math.max(1, Math.ceil(ph * dpr));
    let cv = this._coverCanvas;
    if (!cv) cv = this._coverCanvas = document.createElement("canvas");
    if (cv.width !== cw || cv.height !== chh) {
      cv.width = cw;
      cv.height = chh;
    }
    const c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, pw, ph);

    const cover = this._flipbookCover(fb);
    const r = Math.max(2, 6 * s);
    c.save();
    c.beginPath();
    c.roundRect(0, 0, pw, ph, [r, r, r, r]);
    c.clip();

    // Cover art through the panel pipeline, hero set low under the masthead
    this.drawCutsceneBg(c, pw, ph, cover.bg, t);
    if (cover.art) {
      c.save();
      // Art sizes itself to the rect it is given, so zoom the context to
      // make the cover star larger than on a story page.
      const zoom = 1.5;
      c.translate(pw * 0.52, ph * 0.76);
      c.scale(zoom, zoom);
      c.translate(-pw / 2, -ph / 2);
      // Offset past the art's 1.2s entrance fade: cover ink is already printed.
      this.drawCutsceneArt(c, pw, ph, cover.art, t + 2);
      c.restore();
    }

    // Print feel: halftone dots + a warm ink wash rising from the bottom
    const dot = 5 * s;
    c.fillStyle = "rgba(0,0,0,0.12)";
    for (let yy = 0; yy < ph; yy += dot * 2) {
      for (let xx = (yy / (dot * 2)) % 2 ? dot : 0; xx < pw; xx += dot * 2) {
        c.beginPath();
        c.arc(xx, yy, dot * 0.42, 0, Math.PI * 2);
        c.fill();
      }
    }
    const wash = c.createLinearGradient(0, ph, 0, ph * 0.72);
    wash.addColorStop(0, "rgba(150,20,10,0.45)");
    wash.addColorStop(1, "rgba(150,20,10,0)");
    c.fillStyle = wash;
    c.fillRect(0, 0, pw, ph);

    // Masthead band keeps the title readable over any art
    const mh = ph * 0.24;
    const band = c.createLinearGradient(0, 0, 0, mh * 1.25);
    band.addColorStop(0, "rgba(8,4,14,0.92)");
    band.addColorStop(0.75, "rgba(8,4,14,0.6)");
    band.addColorStop(1, "rgba(8,4,14,0)");
    c.fillStyle = band;
    c.fillRect(0, 0, pw, mh * 1.25);

    const pad = 16 * s;
    const spineW = 22 * s;

    // Issue corner box (top-left)
    const boxW = mh * 0.78;
    const boxH = mh - pad * 1.2;
    const boxX = spineW + pad * 0.6;
    const boxY = pad;
    c.fillStyle = "#f4ead2";
    c.fillRect(boxX, boxY, boxW, boxH);
    c.lineWidth = Math.max(2, 3 * s);
    c.strokeStyle = "#0b0b0b";
    c.strokeRect(boxX, boxY, boxW, boxH);
    c.fillStyle = "#c8141e";
    c.fillRect(boxX, boxY, boxW, boxH * 0.28);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#f4ead2";
    c.font = `900 ${Math.round(boxH * 0.17)}px Impact, "Arial Black", sans-serif`;
    c.fillText("ISSUE", boxX + boxW / 2, boxY + boxH * 0.145);
    c.fillStyle = "#0b0b0b";
    c.font = `900 ${Math.round(boxH * 0.52)}px Impact, "Arial Black", sans-serif`;
    c.fillText(cover.issue, boxX + boxW / 2, boxY + boxH * 0.64);

    // Title: fit to the band, yellow over a red extrude, heavy ink outline
    const titleX = boxX + boxW + pad;
    const titleW = pw - titleX - pad;
    let size = mh * 0.62;
    c.font = `900 italic ${Math.round(size)}px Impact, "Arial Black", sans-serif`;
    const measured = c.measureText(cover.title).width;
    if (measured > titleW) size *= titleW / measured;
    c.font = `900 italic ${Math.round(size)}px Impact, "Arial Black", sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    const ty = boxY + boxH / 2 + size * 0.36;
    const depth = Math.max(3, Math.round(size * 0.07));
    c.lineJoin = "round";
    c.lineWidth = Math.max(4, size * 0.14);
    c.strokeStyle = "#050305";
    for (let d = depth; d >= 1; d--) c.strokeText(cover.title, titleX + d, ty + d);
    c.fillStyle = "#b3121b";
    for (let d = depth; d >= 1; d--) c.fillText(cover.title, titleX + d, ty + d);
    c.strokeText(cover.title, titleX, ty);
    const ink = c.createLinearGradient(0, ty - size * 0.8, 0, ty);
    ink.addColorStop(0, "#fff27a");
    ink.addColorStop(0.55, "#ffd21a");
    ink.addColorStop(1, "#ff9a0a");
    c.fillStyle = ink;
    c.fillText(cover.title, titleX, ty);

    // Price + barcode block (bottom-left), drawn as shapes
    const bcW = pw * 0.15;
    const bcH = ph * 0.2;
    const bcX = spineW + pad * 0.6;
    const bcY = ph - bcH - pad;
    c.fillStyle = "#f7f2e6";
    c.fillRect(bcX, bcY, bcW, bcH);
    c.lineWidth = Math.max(1, 1.5 * s);
    c.strokeStyle = "#0b0b0b";
    c.strokeRect(bcX, bcY, bcW, bcH);
    c.fillStyle = "#0b0b0b";
    c.font = `900 ${Math.round(bcH * 0.16)}px Impact, "Arial Black", sans-serif`;
    c.textAlign = "left";
    c.textBaseline = "top";
    c.fillText(cover.price, bcX + bcW * 0.08, bcY + bcH * 0.06);
    c.textAlign = "right";
    c.fillText(cover.issue, bcX + bcW * 0.92, bcY + bcH * 0.06);
    const barTop = bcY + bcH * 0.3;
    const barH = bcH * 0.5;
    const barL = bcX + bcW * 0.08;
    const barR = bcX + bcW * 0.92;
    // Fixed pseudo-random widths so the code is stable frame to frame
    let bx = barL;
    for (let i = 0; bx < barR; i++) {
      const bw = (1 + ((i * 7 + 3) % 3)) * Math.max(0.8, bcW / 110);
      const gap = (1 + ((i * 5 + 1) % 2)) * Math.max(0.8, bcW / 110);
      const guard = i < 2 || bx > barR - bcW * 0.05;
      c.fillRect(bx, barTop, Math.min(bw, barR - bx), barH + (guard ? bcH * 0.06 : 0));
      bx += bw + gap;
    }
    c.textAlign = "center";
    c.font = `${Math.round(bcH * 0.1)}px monospace`;
    c.fillText("0 11235 06470 1", bcX + bcW / 2, barTop + barH + bcH * 0.08);

    // Tagline strip (bottom-right)
    if (cover.tagline) {
      const fs = Math.round(ph * 0.042);
      c.font = `900 italic ${fs}px Impact, "Arial Black", sans-serif`;
      const tw = c.measureText(cover.tagline).width + fs * 1.4;
      const tx = pw - pad - tw;
      const tY = ph - pad - fs * 1.9;
      c.save();
      c.translate(tx + tw / 2, tY + fs * 0.95);
      c.rotate(-0.035);
      c.fillStyle = "#ffd21a";
      c.fillRect(-tw / 2, -fs * 0.95, tw, fs * 1.9);
      c.lineWidth = Math.max(2, 3 * s);
      c.strokeStyle = "#0b0b0b";
      c.strokeRect(-tw / 2, -fs * 0.95, tw, fs * 1.9);
      c.fillStyle = "#0b0b0b";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(cover.tagline, 0, fs * 0.05);
      c.restore();
    }

    // Spine: board crease and binding shadow on the hinge edge
    const spine = c.createLinearGradient(0, 0, spineW * 1.6, 0);
    spine.addColorStop(0, "rgba(0,0,0,0.75)");
    spine.addColorStop(0.35, "rgba(0,0,0,0.35)");
    spine.addColorStop(0.5, "rgba(255,240,210,0.16)");
    spine.addColorStop(0.62, "rgba(0,0,0,0.22)");
    spine.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = spine;
    c.fillRect(0, 0, spineW * 1.6, ph);

    // Glossy stock: faint diagonal sheen
    const sheen = c.createLinearGradient(0, 0, pw, ph);
    sheen.addColorStop(0.3, "rgba(255,255,255,0)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0.07)");
    sheen.addColorStop(0.6, "rgba(255,255,255,0)");
    c.fillStyle = sheen;
    c.fillRect(0, 0, pw, ph);

    c.restore();
    return cv;
  }

  /** Render a single flipbook page (panel) into the given rect. */
  _drawFlipbookPage(ctx, px, py, pw, ph, panel, t, s, paperTint, alpha, textAlpha = 1) {
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

    // Lettering last, so speed lines never cross it.
    if (textAlpha > 0) {
      ctx.globalAlpha = alpha;
      this._drawPageText(ctx, pw, ph, panel, t, s, textAlpha);
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

      // Caption + onomatopoeia, lettered per art style
      if (panel.caption) {
        const captionElapsed = panelElapsed - 400;
        if (captionElapsed > 0) {
          ctx.save();
          ctx.globalAlpha = panelAlpha * Math.min(1, captionElapsed / 400);
          ctx.translate(px, py);
          this._drawCaption(ctx, panel, pw, ph, "panel", captionElapsed);
          ctx.restore();
        }
      }
      if (panel.sfx) {
        const sfxElapsed = panelElapsed - 150;
        if (sfxElapsed > 0) {
          const sfxAlpha =
            Math.min(1, sfxElapsed / 200) *
            (1 - Math.max(0, (sfxElapsed - 2000) / 500));
          if (sfxAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = sfxAlpha;
            ctx.translate(px, py);
            this._drawSfx(ctx, panel, pw, ph, s, "panel", Math.min(1, sfxElapsed / 200));
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

    // === Page number (bottom) + continue/skip prompt (top) ===
    this._drawPageCounter(ctx, `${cs.frame + 1} / ${cs.script.length}`, w - Math.round(Math.max(16, 20 * s)), h - Math.max(5, barH * 0.28), s);
    this._drawSkipPrompt(ctx, w, h, barH / 2, s, elapsed, "top");

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
