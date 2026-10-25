import { CUTSCENE_SCRIPTS } from "../src/data/cutscene-scripts.js";
import { cutsceneArtRect, drawCutsceneArt } from "../src/rendering/cutscene-art.js";
import { drawSvgBg, warmSvgArt } from "../src/rendering/svg-art/index.js";
import { isModernArt, isRealisticArt } from "../src/rendering/art-style.js";
import { voiceKeyFor } from "../src/audio/voice.js";
import { partyKey } from "../src/rendering/party.js";
import { autoAdvanceAt, countWords, pageHoldMs, pageWaits } from "../src/systems/cutscene-pacing.js";
import { activeDevice, drawPrompt, glyph } from "../src/ui/input-glyphs.js";
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

// A party frame draws only the members it names (`party: ["lyra", "you"]`),
// or, naming nobody, whoever is with you in this slot; both renderers read
// the member set from the art key (src/rendering/party.js).
const _partyFrames = new WeakMap();

/**
 * Footer prompt for a look ("legacy" or modern) at the bottom or top: text on
 * touch, otherwise [action, label] pairs drawn as glyphs for the keyboard or
 * pad in use (src/ui/input-glyphs.js: Enter/A continue, T/Y auto, Esc/B skip).
 */
function promptLabel(legacy, where, touch) {
  if (touch) {
    if (!legacy) return "TAP TO CONTINUE   ·   HOLD TO SKIP";
    return where === "bottom" ? "Tap to continue  ·  Hold to skip" : "Tap: next  ·  Hold: skip";
  }
  if (!legacy) return [["advance", "CONTINUE"], ["auto", "AUTO"], ["skip", "SKIP"]];
  return [["advance", where === "bottom" ? "continue" : "next"], ["auto", "auto"], ["skip", "skip"]];
}

// Flipbook cover: closed idle before it swings open on its own, then the swing.
// Print dots as a repeating pattern, one fillRect a page. Drawn as one arc
// per dot they were ~17k fills a page a frame at 1080p (two pages during a
// turn) and the flipbook ran at ~25 fps with 100+ ms frames on a desktop GPU.
const _halftones = new Map();
const HALFTONE_RES = 3; // tile pixels per unit, so dots stay round up close
function halftonePattern(ctx, dot, radius, stagger) {
  const key = `${dot.toFixed(3)}|${radius.toFixed(3)}|${stagger ? 1 : 0}`;
  let e = _halftones.get(key);
  if (!e) {
    const w = dot * 2;
    const h = stagger ? dot * 4 : dot * 2;
    const tile = document.createElement("canvas");
    tile.width = Math.max(1, Math.round(w * HALFTONE_RES));
    tile.height = Math.max(1, Math.round(h * HALFTONE_RES));
    const g = tile.getContext("2d");
    g.scale(tile.width / w, tile.height / h);
    g.fillStyle = "#000";
    const dots = [[0, 0], [w, 0], [0, h], [w, h]];
    if (stagger) dots.push([dot, dot * 2]);
    g.beginPath();
    for (const [x, y] of dots) {
      g.moveTo(x + radius, y);
      g.arc(x, y, radius, 0, Math.PI * 2);
    }
    g.fill();
    const pattern = ctx.createPattern(tile, "repeat");
    pattern.setTransform(new DOMMatrix().scale(w / tile.width, h / tile.height));
    e = { pattern };
    if (_halftones.size > 16) _halftones.clear();
    _halftones.set(key, e);
  }
  return e.pattern;
}

// Paper grain: faint rows every 4 px, as one cached strip stretched across
// the page instead of a fillRect and an alpha change per row.
const _grains = new Map(); // height -> strip; the two open pages differ
function paperGrain(ph) {
  const h = Math.max(1, Math.ceil(ph));
  let c = _grains.get(h);
  if (c) return c;
  if (_grains.size > 6) _grains.clear();
  c = document.createElement("canvas");
  c.width = 1;
  c.height = h;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 1, h);
  g.fillStyle = "rgba(200,190,170,0.04)";
  for (let gy = 0; gy < h; gy += 4) {
    g.globalAlpha = 0.02 + 0.02 * Math.sin(gy * 0.7);
    g.fillRect(0, gy, 1, 1);
  }
  _grains.set(h, c);
  return c;
}

const FB_COVER_IDLE_MS = 1200;
const FB_COVER_OPEN_MS = 1100;

// ── Flipbook page bakes ──
// A printed page does not move, so each page (paper, panels, art, inks,
// screens) is painted once into a bitmap and a settled page costs one blit;
// a turn blits the two pages. Art still decoding paints late, so a bake is
// redone (at most every FB_REBAKE_MS) until two in a row draw the same.
const FB_BAKE_T = 2.4; // art clock for a bake: past every model's entrance fade
const FB_REBAKE_MS = 260;
const FB_MAX_BAKES = 5; // bitmaps kept: cover, book block, the open page, the next
const FB_MAX_BACKDROPS = 6; // flattened backdrops shared across pages
const FB_MAX_PX = 2600; // bake resolution cap (lettering stays on the crisp text layer)

/** Seeded 0..1 generator, so paper and inks are the same every bake. */
function fbRand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Paper stock as a repeating tile: newsprint fibres and specks for Comic
// (multiplied over the inks), fine film grain for Modern.
const _paperTiles = new Map();
function paperTile(kind) {
  let c = _paperTiles.get(kind);
  if (c) return c;
  const n = 256;
  c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  const rand = fbRand(kind === "news" ? 4711 : 1931);
  const img = g.createImageData(n, n);
  const d = img.data;
  for (let i = 0; i < n * n; i++) {
    const r = rand();
    let v;
    if (kind === "news") v = 255 - Math.round(r * r * r * 34);
    else v = 128 + Math.round((r - 0.5) * 70);
    d[i * 4] = v;
    d[i * 4 + 1] = v - (kind === "news" ? 2 : 0);
    d[i * 4 + 2] = v - (kind === "news" ? 6 : 0);
    d[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (kind === "news") {
    // Fibres: short soft strokes, a few darker, a few lighter than the stock.
    g.lineCap = "round";
    for (let i = 0; i < 140; i++) {
      const x = rand() * n;
      const y = rand() * n;
      const a = rand() * Math.PI * 2;
      const l = 3 + rand() * 11;
      g.strokeStyle = rand() < 0.7 ? `rgba(120,96,60,${0.05 + rand() * 0.09})` : "rgba(255,255,255,0.35)";
      g.lineWidth = 0.5 + rand() * 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(40,30,20,${0.12 + rand() * 0.2})`;
      g.beginPath();
      g.arc(rand() * n, rand() * n, 0.4 + rand() * 0.8, 0, Math.PI * 2);
      g.fill();
    }
  }
  _paperTiles.set(kind, c);
  return c;
}

const polyPath = (g, poly) => {
  g.beginPath();
  g.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]);
  g.closePath();
};

const polyBox = (poly) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/**
 * A hand-inked panel border: the brush line, swelling on the edges that face
 * away from the light (down and right), with slightly ragged corners.
 */
function inkBorder(g, poly, lw, color, rand) {
  g.save();
  g.lineJoin = "miter";
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = lw;
  polyPath(g, poly);
  g.stroke();
  const n = poly.length;
  let cx = 0, cy = 0;
  for (const [x, y] of poly) {
    cx += x / n;
    cy += y / n;
  }
  for (let i = 0; i < n; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % n];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let nx = (by - ay) / len;
    let ny = -(bx - ax) / len;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    if ((mx - cx) * nx + (my - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    // Shadow side: a tapered swell along the outside of the line.
    const heavy = Math.max(0, nx * 0.6 + ny * 0.8);
    if (heavy > 0.2) {
      const sw = lw * (0.45 + 0.5 * heavy) * (0.85 + rand() * 0.3);
      const t0 = 0.04 + rand() * 0.06;
      const t1 = 0.96 - rand() * 0.06;
      const ox = nx * lw * 0.5;
      const oy = ny * lw * 0.5;
      g.beginPath();
      g.moveTo(ax + (bx - ax) * t0 + ox, ay + (by - ay) * t0 + oy);
      g.quadraticCurveTo(mx + ox + nx * sw * 1.6, my + oy + ny * sw * 1.6, ax + (bx - ax) * t1 + ox, ay + (by - ay) * t1 + oy);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}

export class CutsceneEngine {
  constructor({
    audio,
    getKeys,
    getTouchControls,
    isTouchDevice,
    getPlayerName,
    getSettings,
    getInput,
    getTextLayer,
    getVoiceProfile,
    getParty,
  }) {
    this.audio = audio;
    this.getVoiceProfile = getVoiceProfile || (() => null);
    this.getParty = getParty || (() => null);
    this.getKeys = getKeys;
    this.getTouchControls = getTouchControls;
    this.isTouchDevice = isTouchDevice;
    this.getPlayerName = getPlayerName || (() => "Agent");
    this.getSettings = getSettings || (() => ({ cutsceneAutoAdvance: false }));
    // The game, for which device's prompts to show (null: keyboard or touch).
    this.getInput = getInput || (() => null);
    // Text is drawn on a device-pixel-ratio layer (the HUD canvas) so it stays
    // crisp while the art canvas runs at the adaptive render scale.
    // getTextLayer() → { ctx, canvas } | null; defaults to #hudCanvas.
    this.getTextLayer = getTextLayer || null;
    this._tl = null;
    this._textLayouts = new WeakMap();
    this._wordCounts = new WeakMap();
    this._autoChip = null; // AUTO chip box, fractions of the canvas
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

  /** Queue the bitmaps a script draws: its cast, panels, pages and backdrops. */
  _warmScript(script, ctx, w, h, { backdrops = true } = {}) {
    const arts = new Set();
    const bgs = new Set();
    const collect = (f) => {
      if (f.art) arts.add(this._artKey(f));
      if (f.bg) bgs.add(f.bg);
    };
    for (const raw of script) {
      const f = this._resolveFrame(raw) ?? raw;
      collect(f);
      f.panels?.forEach(collect);
      f.flipbook?.pages?.forEach((p) => {
        if (p.panel) collect(p.panel);
        p.insets?.forEach(collect);
      });
      if (f.flipbook?.cover) collect(this._flipbookCover(f.flipbook));
    }
    warmSvgArt(arts, backdrops ? bgs : [], ctx, w, h);
  }

  /**
   * Warm a cutscene before it is asked for (the comic, while the title
   * waits for a click), so its first frame is the art and not a black frame,
   * an empty cover, or one figure standing in for another. Characters only:
   * a backdrop is a multi-megapixel bake that cannot be split, and on a
   * CPU-rendered canvas it held the title for two seconds.
   */
  prewarm(scriptKey, ctx, w, h) {
    const script = CUTSCENE_SCRIPTS[scriptKey];
    if (script?.length) this._warmScript(script, ctx, w, h, { backdrops: false });
  }

  start(scriptKey, onComplete) {
    const script = CUTSCENE_SCRIPTS[scriptKey];
    if (!script || script.length === 0) {
      if (onComplete) onComplete();
      return false;
    }
    this.cutscene = {
      key: scriptKey,
      script,
      frame: 0,
      frameStart: performance.now(),
      onComplete,
      particles: [],
      skipHeldStart: 0,
      spoken: 0,
      // Auto-play: the hold counts from no earlier than autoFrom (ms into
      // the frame); autoFromT/autoAtT are the countdown for the chip bar.
      autoWas: !!this.getSettings().cutsceneAutoAdvance,
      autoFrom: 0,
      autoFromT: 0,
      autoAtT: 0,
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
      // An auto-play hold counts from the reveal, not from the shifted start.
      cs.autoFrom = 60000;
      // The text jumped to the end; the voice goes quiet rather than racing.
      cs.spoken = frame?.lines?.length ?? 0;
      cs._said = null;
      this.audio.stopSpeech?.("cutscene");
      return;
    }

    // Ready — move to next frame
    cs.frame++;
    cs.frameStart = performance.now();
    cs.spoken = 0;
    cs._said = null;
    this.audio.stopSpeech?.("cutscene");
    cs.particles = [];
    cs.readyToAdvance = false;
    cs.autoFrom = 0;
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

  /**
   * Advance the flipbook clock: cover idle → swing → page holds → flips.
   * Under auto-play a captioned page holds long enough to read; otherwise it
   * waits for the press (its 1.5 s hold turned pages mid-sentence).
   */
  _stepFlipbook(cs, fb, now, auto = false) {
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
      (auto || !pageWaits(pg)) &&
      now - (auto ? this._pageClockStart(cs) : cs.fbPageStart) >=
        (auto ? pageHoldMs(pg) : (pg.hold ?? 1400))
    ) {
      cs.fbFlipStart = now;
    }
  }

  /** A page's auto-play hold counts from when it settled or AUTO came on. */
  _pageClockStart(cs) {
    return Math.max(cs.fbPageStart, cs.frameStart + cs.autoFrom);
  }

  /** Set the auto-play countdown, in ms since the frame started. */
  _autoClock(cs, from, at) {
    cs.autoFromT = cs.frameStart + from;
    cs.autoAtT = cs.frameStart + at;
  }

  /** Auto-play countdown 0..1 toward the next advance, or null when none runs. */
  autoProgress(now = performance.now()) {
    const cs = this.cutscene;
    if (!cs?.autoAtT) return null;
    const span = cs.autoAtT - cs.autoFromT;
    return span > 0 ? Math.min(1, Math.max(0, (now - cs.autoFromT) / span)) : 1;
  }

  /** Words to read on a frame (lines, or comic-page captions), cached. */
  _frameWords(frame) {
    const name = this.getPlayerName();
    const hit = this._wordCounts.get(frame);
    if (hit?.name === name) return hit.words;
    const text = frame.lines
      ? frame.lines.map((l) => this._resolve(l.text))
      : (frame.panels || []).map((p) => this._resolve(p.caption));
    const words = countWords(text);
    this._wordCounts.set(frame, { name, words });
    return words;
  }

  end() {
    this._fbRelease();
    this.audio.stopSpeech?.("cutscene");
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

    // Auto-play is optional (default: manual advance via Enter/click). The
    // AUTO chip, T or pad Y flip it mid-scene; switching it on starts this
    // frame's hold from now rather than jumping a frame read long ago.
    const auto = !!this.getSettings().cutsceneAutoAdvance;
    if (auto && !cs.autoWas) cs.autoFrom = elapsed;
    cs.autoWas = auto;
    cs.autoAtT = 0;
    // Mark frame as "ready" once all text has finished typing (or duration elapsed).
    const charsPerSec = 18; // 30% slower than original 25 for better readability

    if (frame.lines) {
      this._voiceLines(cs, frame, elapsed, charsPerSec);
      // Check if all lines have finished typing
      const lastLine = frame.lines[frame.lines.length - 1];
      const lastDelay = lastLine ? lastLine.delay : 0;
      const resolvedLen = lastLine
        ? this._resolve(lastLine.text).length
        : 0;
      const typingDoneAt = lastDelay + (resolvedLen / charsPerSec) * 1000;
      cs.readyToAdvance = elapsed >= typingDoneAt + 300; // 300ms grace after typing

      if (auto) {
        const at = autoAdvanceAt({
          textDoneAt: typingDoneAt,
          words: this._frameWords(frame),
          duration: frame.duration,
          autoFrom: cs.autoFrom,
        });
        this._autoClock(cs, Math.max(typingDoneAt, cs.autoFrom), at);
        // Auto-play waits for the last voiced line to be said, too.
        const talking = cs.spoken < (frame.lines?.length ?? 0) || this.audio.isSpeaking?.(cs._said);
        if (elapsed >= at && !talking) {
          this.advance();
          return;
        }
      }
    } else if (frame.flipbook?.pages?.length) {
      // Flipbook frames page themselves; the frame is ready only once the
      // last page has settled.
      const fb = frame.flipbook;
      const now = performance.now();
      this._stepFlipbook(cs, fb, now, auto);
      const onLast =
        cs.fbPhase === "pages" &&
        cs.fbPage === fb.pages.length - 1 &&
        !cs.fbFlipStart;
      // A captioned page waits for the press unless auto-play is on.
      cs.readyToAdvance =
        onLast || (!auto && cs.fbPhase === "pages" && !cs.fbFlipStart && pageWaits(fb.pages[cs.fbPage]));
      // The page clock: settled pages count down to their flip; the settled
      // last page to the end, unless the book waits for a press
      // (requireAction books wait on the last page for press/click/tap).
      if (auto && cs.fbPhase === "pages" && !cs.fbFlipStart && (!onLast || !fb.requireAction)) {
        const from = this._pageClockStart(cs);
        cs.autoFromT = from;
        cs.autoAtT = from + pageHoldMs(fb.pages[cs.fbPage]);
        if (onLast && now >= cs.autoAtT) this.advance();
      }
      return;
    } else {
      // No text lines — ready after minimum display time
      const minDisplay = Math.min(frame.duration || 2000, 2000);
      cs.readyToAdvance = elapsed >= minDisplay;

      if (auto) {
        // Comic pages read their captions once the last panel has slammed in.
        const textDoneAt = frame.panels?.length ? (frame.panels.length - 1) * 800 + 350 : 0;
        const at = autoAdvanceAt({
          textDoneAt,
          words: this._frameWords(frame),
          duration: frame.duration,
          autoFrom: cs.autoFrom,
        });
        this._autoClock(cs, Math.max(textDoneAt, cs.autoFrom), at);
        if (elapsed >= at) {
          this.advance();
          return;
        }
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
    // A comic book is printed as one in every style: Legacy's full-bleed
    // pages dropped the layouts, insets and readouts the book is written for.
    if (!isModernArt()) return this._inFlipbook ? "comic" : "legacy";
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

  /**
   * Give each line its speaker's babble voice as it starts typing. Lines are
   * voiced in order, one at a time per cutscene; narration stays silent.
   */
  _voiceLines(cs, frame, elapsed, charsPerSec) {
    const lines = frame.lines;
    // A voice runs slower than the text types: the next line waits for the
    // last to finish instead of cutting it off.
    while (cs.spoken < lines.length && elapsed >= lines[cs.spoken].delay && !this.audio.isSpeaking?.(cs._said)) {
      const line = lines[cs.spoken++];
      const cls = classifyLine(this._resolve(line.text));
      const key = voiceKeyFor({
        speaker: cls.speaker,
        quoted: cls.quoted,
        lineVoice: line.voice,
        frameVoice: frame.voice,
        art: frame.art,
      });
      if (!key) continue;
      cs._said = this.audio.speak?.(cls.text, key, {
        channel: "cutscene",
        charsPerSec,
        profile: this.getVoiceProfile(),
        emotion: line.emotion || frame.emotion || null,
      });
    }
  }

  /** The art key a frame draws: a party frame's key carries its members. */
  _artKey(frame) {
    if (frame?.art !== "party") return frame?.art;
    return partyKey(frame.party ?? this.getParty() ?? undefined);
  }

  /** The frame as drawn: a party frame's lineup. */
  _resolveFrame(frame) {
    if (frame?.art !== "party") return frame;
    const art = this._artKey(frame);
    if (art === "party") return frame;
    let f = _partyFrames.get(frame);
    if (!f || f.art !== art) {
      f = { ...frame, art };
      _partyFrames.set(frame, f);
    }
    return f;
  }

  _resolve(text) {
    const out = String(text ?? "").replace(/\{AGENT\}/g, this.getPlayerName());
    return out.includes("{") ? out.replace(/\{(ADVANCE|SKIP)\}/g, (_, k) => this._promptWord(k)) : out;
  }

  /** What resolved text depends on, for the layout caches: the name and the device's prompts. */
  _textKey() {
    const input = this.getInput();
    return input ? `${this.getPlayerName()}|${activeDevice(input)}|${input._inputFamily}` : this.getPlayerName();
  }

  /** {ADVANCE} / {SKIP} in script text: the key or button for the device in use. */
  _promptWord(k) {
    const input = this.getInput();
    const device = input ? activeDevice(input) : this.isTouchDevice ? "touch" : "keyboard";
    if (device === "touch") return k === "ADVANCE" ? "Tap" : "hold";
    return `${k === "ADVANCE" ? "Press " : ""}${glyph(input, k === "ADVANCE" ? "advance" : "skip", device).text}`;
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
    const frame = this._resolveFrame(cs.script[cs.frame]);
    if (!frame) return;

    if (!cs.svgWarmed) {
      cs.svgWarmed = true;
      this._warmScript(cs.script, ctx, w, h);
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
      ctx.save();
      this._fitArt(ctx, w, h, frame.art, this._artZone(ctx, w, h, frame, s));
      this.drawCutsceneArt(ctx, w, h, frame.art, t);
      ctx.restore();
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

  /**
   * The band a lines frame leaves its figure: below the letterbox (and
   * Legacy's centred title plate), above the first line of text.
   */
  _artZone(ctx, w, h, frame, s) {
    const barH = h * (this.isTouchDevice ? 0.035 : 0.08);
    let top = barH + h * 0.02;
    let bottom = h - barH - h * 0.02;
    const look = this._look();
    if (frame.lines?.length) {
      const g = this._tx(ctx);
      if (look === "comic") {
        for (const it of this._comicLayout(g, frame, w, h).items) bottom = Math.min(bottom, it.y - it.top);
      } else if (look === "cine") {
        bottom = Math.min(bottom, this._cineLayout(g, frame, w, h).items[0].y);
      } else {
        bottom = Math.min(bottom, this._legacyLayout(g, frame, w, h, s).boxTop);
      }
    }
    if (frame.title && look === "legacy") top = Math.max(top, h * 0.11 + 18 * s);
    return { top, bottom: bottom - h * 0.015 };
  }

  /**
   * Frame a vector figure inside `zone` (y range in the coordinates
   * drawCutsceneArt is about to draw in): scaled down about its anchor, to
   * no less than half, until it fits the band and the width, then moved the
   * least that keeps its feet off the text and its head out of the letterbox.
   * A figure that already fits is left as drawn.
   */
  _fitArt(ctx, w, h, art, zone, touch = this.isTouchDevice) {
    const r = cutsceneArtRect(w, h, art, touch);
    if (!r) return;
    const k = Math.max(0.5, Math.min(1, (zone.bottom - zone.top) / r.h, (w * 0.96) / r.w));
    const top = r.ay + (r.y - r.ay) * k;
    const bottom = top + r.h * k;
    let dy = 0;
    if (bottom > zone.bottom) dy = zone.bottom - bottom;
    if (top + dy < zone.top) dy = zone.top - top;
    if (k === 1 && dy === 0) return;
    ctx.translate(r.ax, r.ay + dy);
    ctx.scale(k, k);
    ctx.translate(-r.ax, -r.ay);
  }

  /** A comic panel's band for its figure: clear of a top or bottom caption. */
  _panelArtZone(ctx, panel, pw, ph) {
    let top = ph * 0.04;
    let bottom = ph * 0.96;
    if (panel.caption) {
      const L = this._panelCaptionLayout(this._tx(ctx), panel, pw, ph, "panel");
      const ch = (L.look === "legacy" ? L.rows.length * L.lineH + L.padY * 2 : L.h) + ph * 0.06;
      const pos = panel.captionPos || "bottom";
      if (pos === "bottom") bottom = ph - ch;
      else if (pos === "top") top = ch;
    }
    return { top, bottom };
  }

  // ── Lines frames: Legacy (terminal typewriter) ──────────────────
  /** Cached per frame/size/name: wrapped rows and baselines, measured once. */
  _legacyLayout(g, frame, w, h, s) {
    const key = `L|${w}|${h}|${s}|${this._textKey()}`;
    const hit = this._textLayouts.get(frame);
    if (hit?.key === key) return hit;
    const maxW = w * 0.86;
    const barH = h * (this.isTouchDevice ? 0.035 : 0.08);
    const lines = (frame.lines || []).map((line) => {
      const text = this._resolve(line.text);
      const sz = Math.max(14, Math.round((line.size || 16) * s));
      const font = `bold ${sz}px monospace`;
      // About 70 characters a row at most: a full-width row on a wide screen
      // was too long to follow back to the next one.
      const rowW = Math.min(maxW, sz * 42);
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
      const lay = wrapText(g, rest, font, rowW - pillW - gap);
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
    const key = `C|${w}|${h}|${this._textKey()}`;
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
    // another joins it with a connector; others point sideways at the figure
    // (a splash above the first included: a tail up through it cut its letters).
    const spk = { x: w / 2, y: h * 0.4 };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "balloon" || !frame.art) continue;
      const prev = items[i - 1];
      if (prev && prev.kind === "balloon") {
        it.connect = prev;
      } else if (i === 0) {
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
    const key = `M|${w}|${h}|${this._textKey()}`;
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
    // A title card over a lit backdrop (a corridor, the reactor) reads on a
    // soft band of its own; over the dark stage it needs none.
    if (lay.card && frame.bg && frame.bg !== "dark" && first > 0 && lay.items.length) {
      const last = lay.items[lay.items.length - 1];
      const top = lay.items[0].y - sz * 1.4;
      const bot = last.y + last.h + sz * 1.4;
      const a = 0.7 * Math.min(1, first / 400);
      const band = ctx.createLinearGradient(0, top, 0, bot);
      band.addColorStop(0, "rgba(0,0,0,0)");
      band.addColorStop(0.25, `rgba(0,0,0,${a})`);
      band.addColorStop(0.75, `rgba(0,0,0,${a})`);
      band.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, top, w, bot - top);
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
   * Bottom-right prompt (lines frames, flipbooks) or top-right (comic
   * pages): the AUTO chip at the edge, the key prompt beside it, plus the
   * hold-to-skip bar. Wording follows the input device.
   */
  _drawSkipPrompt(ctx, w, h, cy, s, elapsed, where) {
    const cs = this.cutscene;
    const look = this._look();
    const input = this.getInput();
    const touch = input ? activeDevice(input) === "touch" : this.isTouchDevice;
    const right = w - Math.round(Math.max(16, 20 * s));
    let barY;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = this._tx(ctx);
    g.save();
    g.textAlign = "right";
    g.textBaseline = "middle";
    const px = look === "legacy" ? Math.max(10, Math.round(12 * s)) : Math.max(10, Math.round(h * 0.017));
    const chipX = this._drawAutoChip(g, look, right, cy, px, w, h);
    const labelRight = chipX - Math.round(px * 1.1);
    if (look === "legacy") {
      const ready = cs.readyToAdvance && where === "bottom";
      const a = ready ? 0.6 + 0.35 * Math.sin(elapsed / 300) : 0.3 + 0.15 * Math.sin(elapsed / 500);
      const alpha = ready ? a : Math.max(a, where === "top" ? 0.4 : 0);
      const color = ready ? "#00ffcc" : "#ffffff";
      g.font = `${px}px monospace`;
      this._drawPromptLine(g, promptLabel(true, where, touch), labelRight, cy, px, color, alpha, "legacy", input);
    } else {
      const ready = cs.readyToAdvance;
      const a = ready ? 0.78 + 0.18 * Math.sin(elapsed / 320) : 0.55;
      g.font = csFont("caps", px, 700);
      setTracking(g, px * 0.14);
      const color = look === "comic" ? "#fff1b8" : "#f4f1ea";
      this._drawPromptLine(g, promptLabel(false, where, touch), labelRight, cy, px, color, a, "modern", input);
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
        touch ? "Hold to skip all..." : `Hold ${glyph(input, "skipAll", "keyboard").text} to skip all...`,
        right,
        where === "bottom" ? barY - 4 : barY + skipBarH + 4,
      );
      g2.restore();
      ctx.restore();
    }
  }

  /**
   * One prompt row right-aligned at `right`: plain text (touch) or glyph +
   * label pairs for the keyboard or pad in use. `g.font` is the label font.
   */
  _drawPromptLine(g, prompt, right, cy, px, color, alpha, look, input) {
    g.save();
    if (typeof prompt === "string") {
      g.globalAlpha *= alpha;
      g.fillStyle = color;
      g.fillText(prompt, right, cy);
    } else {
      drawPrompt(g, right, cy, prompt, {
        input, size: Math.max(9, Math.round(px * 0.9)), font: g.font, color, align: "right",
        gap: Math.round(px * 1.6), look, device: input ? undefined : "keyboard", alpha,
      });
    }
    g.restore();
  }

  /**
   * The AUTO chip, right-aligned at `right` on the prompt row: filled with
   * a play mark when auto-play is on, outlined with a pause mark when off.
   * While a countdown runs a thin bar under it fills toward the next
   * advance. Its box is kept as fractions of the art canvas for clicks and
   * taps (autoChipHit). Returns the chip's left edge.
   */
  _drawAutoChip(g, look, right, cy, px, w, h) {
    const on = !!this.getSettings().cutsceneAutoAdvance;
    const legacy = look === "legacy";
    g.save();
    g.font = legacy ? `bold ${px}px monospace` : csFont("caps", px, 700);
    setTracking(g, legacy ? 0 : px * 0.14);
    const textW = g.measureText("AUTO").width;
    const icon = px * 0.62;
    const padX = px * 0.6;
    const cw = Math.round(padX * 2 + textW + px * 0.45 + icon);
    const ch = Math.round(px * 1.7);
    const x = right - cw;
    const y = Math.round(cy - ch / 2);
    const accent = legacy ? "#00ffcc" : look === "comic" ? PAPER_CAPTION : SUB_TEXT;
    const r = legacy ? 2 : ch / 2;

    g.beginPath();
    g.roundRect(x, y, cw, ch, r);
    if (on) {
      g.fillStyle = accent;
      g.fill();
    } else {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fill();
      g.lineWidth = Math.max(1, px * 0.1);
      g.strokeStyle = legacy ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.4)";
      g.stroke();
    }
    const ink = on ? (legacy ? "#00261e" : INK) : "rgba(255,255,255,0.6)";
    g.fillStyle = ink;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText("AUTO", x + padX, cy + (legacy ? 0 : px * 0.04));
    setTracking(g, 0);

    // Play ▶ when on, pause ❚❚ when off: drawn, so no font needs the glyphs.
    const ix = x + cw - padX - icon;
    const iy = cy - icon / 2;
    g.beginPath();
    if (on) {
      g.moveTo(ix, iy);
      g.lineTo(ix + icon, cy);
      g.lineTo(ix, iy + icon);
      g.closePath();
    } else {
      const bw = icon * 0.34;
      g.rect(ix + icon * 0.05, iy, bw, icon);
      g.rect(ix + icon * 0.95 - bw, iy, bw, icon);
    }
    g.fill();

    const p = on ? this.autoProgress() : null;
    if (p !== null) {
      const bh = Math.max(2, Math.round(px * 0.2));
      const by = y + ch + Math.max(2, Math.round(px * 0.25));
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x, by, cw, bh);
      g.fillStyle = accent;
      g.fillRect(x, by, cw * p, bh);
    }
    g.restore();

    // Generous hit box: finger-sized on touch.
    const pad = px * (this.isTouchDevice ? 0.9 : 0.4);
    this._autoChip = {
      x: (x - pad) / w,
      y: (y - pad) / h,
      w: (cw + pad * 2) / w,
      h: (ch + pad * 2) / h,
    };
    return x;
  }

  /** Whether a point, as fractions (0..1) of the canvas box, is on the AUTO chip. */
  autoChipHit(fx, fy) {
    const c = this._autoChip;
    if (!this.cutscene || !c) return false;
    return fx >= c.x && fx <= c.x + c.w && fy >= c.y && fy <= c.y + c.h;
  }

  // ── Panel / page lettering (flipbook pages + comic panels) ──────
  /**
   * Caption layout for one panel, cached on the panel object. `mode` is
   * "page" (full-bleed flipbook page) or "panel" (a panel on a comic page).
   */
  _panelCaptionLayout(g, panel, pw, ph, mode) {
    const look = this._look();
    const sh = this._screenH || ph;
    const key = `${look}|${mode}|${Math.round(pw)}|${Math.round(ph)}|${sh}|${this._textKey()}`;
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

  /** Box top for a caption of height `bh` in a `ph`-tall area (a number: its centre, as a fraction). */
  _captionY(pos, ph, bh, inset) {
    if (typeof pos === "number") return Math.max(inset, Math.min(ph - bh - inset, ph * pos - bh / 2));
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
    const input = this.getInput();
    const device = input ? activeDevice(input) : this.isTouchDevice ? "touch" : "keyboard";
    if (device === "touch") prompt = prompt.replace(/PRESS SPACE\s*\/\s*CLICK/i, "TAP");
    else if (device === "gamepad") prompt = prompt.replace(/SPACE\s*\/\s*CLICK/i, glyph(input, "advance").text);
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
    this._inFlipbook = true;
    try {
      this._renderFlipbook(ctx, w, h, frame, elapsed, t);
    } finally {
      this._inFlipbook = false;
    }
  }

  _renderFlipbook(ctx, w, h, frame, elapsed, t) {
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

    const spineRight = (fb.spineSide ?? "right") === "right";
    const paperTint = fb.paperTint ?? "#0a0814";
    // One page bake a frame beyond what must show now (the next page,
    // a rebake of art that was still decoding).
    this._fbBakeLeft = 1;

    // Backdrop, the book's stack of pages and the vignette: one cached blit.
    const cover = cs.fbPhase === "cover";
    ctx.drawImage(this._fbStage(ctx, w, h, px, py, pw, ph, s, spineRight, cover), 0, 0, w, h);
    if (cover && cs.fbOpenStart) {
      // The open book's page block settles in as the cover swings.
      const open = Math.min(1, (now - cs.fbOpenStart) / FB_COVER_OPEN_MS);
      ctx.globalAlpha = Math.min(1, open * 1.6) ** 2;
      ctx.drawImage(this._fbStage(ctx, w, h, px, py, pw, ph, s, spineRight, false), 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    if (cover) {
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
      const cur = this._fbPageBitmap(ctx, fb, idx, pw, ph, s, paperTint, spineRight, now, true);

      if (flipT === 0) {
        ctx.drawImage(cur, px, py, pw, ph);
        // Lettering settles onto the page just after it lands.
        const textIn = Math.min(1, (now - cs.fbPageStart) / 220);
        this._drawFbLettering(ctx, curPage, px, py, pw, ph, t, s, textIn);
        // Bake the next page while this one is read.
        if (nextPage) this._fbPageBitmap(ctx, fb, idx + 1, pw, ph, s, paperTint, spineRight, now, false);
      } else {
        const next = this._fbPageBitmap(ctx, fb, idx + 1, pw, ph, s, paperTint, spineRight, now, true);
        ctx.drawImage(next, px, py, pw, ph);
        // Ease in-out for natural flip motion
        const eased = flipT < 0.5
          ? 2 * flipT * flipT
          : 1 - Math.pow(-2 * flipT + 2, 2) / 2;
        this._drawPageTurn(ctx, cur, px, py, pw, ph, eased, spineRight);
        // The lettering lifts off with the page's first movement.
        const textOut = Math.max(0, 1 - flipT * 5);
        if (textOut > 0) this._drawFbLettering(ctx, curPage, px, py, pw, ph, t, s, textOut);
      }
    }

    // Page indicator (subtle, bottom-right). The cover is not a page.
    if (cs.fbPhase === "pages") {
      this._drawPageCounter(ctx, `${cs.fbPage + 1} / ${fb.pages.length}`, px + pw - Math.max(8, 10 * s), py + ph - Math.max(8, 10 * s), s);
    }

    // Footer under the book: AUTO chip + prompt.
    this._drawSkipPrompt(ctx, w, h, (py + ph + h) / 2, s, elapsed, "bottom");
  }

  /** Device pixels per art pixel for a bake on this context, capped. */
  _fbScale(ctx, pw) {
    const m = ctx.getTransform();
    return Math.max(0.5, Math.min(Math.hypot(m.a, m.b) || 1, 2, FB_MAX_PX / Math.max(1, pw)));
  }

  /**
   * A bitmap painted by `paint(g)` in art pixels, kept under `key`. Returns
   * null only when it was never painted and `need` is false (or no budget
   * is left this frame). Repainted every FB_REBAKE_MS until a paint draws
   * the same images as the one before and none is still an SVG <img>.
   */
  _fbBake(key, wArt, hArt, k, paint, now, need, shared = false) {
    const bakes = (this._fbBakes ??= new Map());
    let e = bakes.get(key);
    if (e) {
      e.used = now;
      if (e.final || now - e.at < FB_REBAKE_MS || this._fbBakeLeft <= 0) return e.c;
    } else if (!need && this._fbBakeLeft <= 0) return null;
    if (!e) {
      let c = null;
      if ([...bakes.values()].filter((v) => v.shared === shared).length >= (shared ? FB_MAX_BACKDROPS : FB_MAX_BAKES)) {
        // Reuse the least recently shown bitmap's canvas.
        let old = null;
        for (const [k2, v] of bakes) if (v.shared === shared && (!old || v.used < old[1].used)) old = [k2, v];
        bakes.delete(old[0]);
        c = old[1].c;
      }
      e = { c: c || document.createElement("canvas"), n: -1, at: 0, tries: 0, used: now, final: false, shared };
      bakes.set(key, e);
    }
    const W = Math.max(1, Math.ceil(wArt * k));
    const H = Math.max(1, Math.ceil(hArt * k));
    // Count what a paint draws: a layer that has not decoded draws nothing,
    // and one not yet baked to a bitmap is an <img>.
    const run = (g, real) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      if (real) g.clearRect(0, 0, W, H);
      g.setTransform(W / wArt, 0, 0, H / hArt, 0, 0);
      const probe = { n: 0, svg: 0 };
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      g.drawImage = function (img, ...a) {
        probe.n++;
        if (typeof HTMLImageElement !== "undefined" && img instanceof HTMLImageElement) probe.svg++;
        // A dry run only counts: the art it asks for is what matters.
        return real ? draw.call(this, img, ...a) : undefined;
      };
      const prevPending = this._fbPending;
      const prevNeed = this._fbNeed;
      this._fbPending = false;
      this._fbNeed = need;
      try {
        paint(g);
      } finally {
        delete g.drawImage;
        g.setTransform(1, 0, 0, 1, 0, 0);
        // A flattened backdrop still settling keeps this bake open too.
        if (this._fbPending) probe.svg++;
        this._fbPending = prevPending;
        this._fbNeed = prevNeed;
      }
      return probe;
    };
    if (e.tries > 0) {
      // Rebake only when a dry run (counting, drawing nothing) finds the art
      // changed since the last bake: a full bake is a long frame on a slow CPU.
      const dry = (this._fbDry ??= document.createElement("canvas").getContext("2d"));
      const p = run(dry, false);
      if (p.svg === 0 && p.n === e.n) {
        e.final = true;
        return e.c;
      }
      e.at = now;
      // The dry run may have spent the frame baking a backdrop.
      if (this._fbBakeLeft <= 0) return e.c;
    }
    this._fbBakeLeft--;
    if (e.c.width !== W || e.c.height !== H) {
      e.c.width = W;
      e.c.height = H;
    }
    const probe = run(e.c.getContext("2d"), true);
    e.final = e.tries >= 12;
    e.n = probe.n;
    e.at = now;
    e.tries++;
    return e.c;
  }

  /** Drop every flipbook bitmap (the comic ended). */
  _fbRelease() {
    if (!this._fbBakes) return;
    for (const e of this._fbBakes.values()) e.c.width = e.c.height = 0;
    this._fbBakes.clear();
    this._fbStageC = null;
  }

  /**
   * The table the book lies on: backdrop, the stack of pages under the open
   * page (or nothing under a closed book) and the vignette, as one bitmap.
   */
  _fbStage(ctx, w, h, px, py, pw, ph, s, spineRight, closed) {
    const look = this._look();
    const k = Math.min(1, this._fbScale(ctx, w)); // soft by nature: never above 1:1
    const key = `${look}|${w}|${h}|${k}|${closed ? 1 : 0}|${spineRight ? 1 : 0}|${this.isTouchDevice ? 1 : 0}`;
    const st = (this._fbStageC ??= {});
    if (st[key]) return st[key];
    for (const kk of Object.keys(st)) {
      if (kk.split("|").slice(0, 4).join("|") !== key.split("|").slice(0, 4).join("|")) delete st[kk];
    }
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * k));
    c.height = Math.max(1, Math.round(h * k));
    const g = c.getContext("2d");
    g.scale(c.width / w, c.height / h);
    const comic = look === "comic";
    const cine = look === "cine";
    // Backdrop: deep velvet (Comic, Legacy), near-black under a soft key light (Modern).
    const backdrop = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h / 2, w * 0.72);
    backdrop.addColorStop(0, cine ? "#15161a" : comic ? "#1a1222" : "#0a0814");
    backdrop.addColorStop(0.55, cine ? "#08090b" : comic ? "#0b0812" : "#06040e");
    backdrop.addColorStop(1, cine ? "#020203" : "#020108");
    g.fillStyle = backdrop;
    g.fillRect(0, 0, w, h);
    if (look !== "legacy") {
      // Cloth weave on the table.
      g.save();
      g.globalAlpha = cine ? 0.05 : 0.06;
      g.globalCompositeOperation = "overlay";
      g.fillStyle = g.createPattern(paperTile("grain"), "repeat");
      g.fillRect(0, 0, w, h);
      g.restore();
    }
    if (!closed) {
      // The book: a soft contact shadow, then the page block under the open
      // page, its edges stepping out on the free side and the foot.
      const dir = spineRight ? -1 : 1;
      g.save();
      g.shadowColor = "rgba(0,0,0,0.75)";
      g.shadowBlur = 40 * s * k;
      g.shadowOffsetY = 16 * s * k;
      g.fillStyle = "#000";
      g.fillRect(px + 4 * s, py + 6 * s, pw, ph);
      g.restore();
      const layers = 5;
      const step = 1.6 * s;
      for (let i = layers; i >= 1; i--) {
        const tone = cine ? (i % 2 ? "#2a2b2f" : "#1d1e21") : i % 2 ? "#d4c7a8" : "#b5a682";
        g.fillStyle = tone;
        g.fillRect(px + dir * i * step, py + i * step * 0.8, pw, ph);
      }
      // Binding: a cloth spine strip outside the bound edge.
      const sx = spineRight ? px + pw : px - 10 * s;
      const bind = g.createLinearGradient(sx, 0, sx + 10 * s, 0);
      bind.addColorStop(0, spineRight ? "#3a1016" : "#14060a");
      bind.addColorStop(1, spineRight ? "#14060a" : "#3a1016");
      g.fillStyle = cine ? "#111214" : bind;
      g.fillRect(sx, py - 3 * s, 10 * s, ph + 6 * s + layers * step);
    }
    const vignette = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = vignette;
    g.fillRect(0, 0, w, h);
    st[key] = c;
    return c;
  }

  /** A page's printed bitmap (null only while it is not yet needed on screen). */
  _fbPageBitmap(ctx, fb, idx, pw, ph, s, paperTint, spineRight, now, need) {
    const look = this._look();
    const k = this._fbScale(ctx, pw);
    const ids = (this._fbIds ??= new WeakMap());
    let id = ids.get(fb);
    if (!id) ids.set(fb, (id = `fb${(this._fbIdN = (this._fbIdN || 0) + 1)}`));
    const key = `${id}|${idx}|${look}|${Math.round(pw)}|${Math.round(ph)}|${k.toFixed(3)}|${spineRight ? 1 : 0}`;
    const page = fb.pages[idx];
    this._fbFrame = { pw, ph, k, now };
    return this._fbBake(key, pw, ph, k, (g) => this._paintPrintedPage(g, page, idx, pw, ph, s, look, spineRight), now, need);
  }

  /**
   * Panel geometry for a page in page pixels, cached on the page: the main
   * panel first, then the others. `page.layout`:
   *   "splash"   one panel inside the margins (default)
   *   "bleed"    one panel to the trim, no margins
   *   "tiers"    the main panel over a row of `insets` (slot "low")
   *   "diagonal" the main panel and an inset (slot "cut") split by a slanted gutter
   * Insets with slot tl/tr/bl/br sit over the main panel as framed inserts.
   */
  _fbLayout(page, pw, ph, look) {
    const key = `${look}|${Math.round(pw)}|${Math.round(ph)}`;
    const lays = (this._fbLayouts ??= new WeakMap());
    const hit = lays.get(page);
    if (hit?.key === key) return hit;
    const R = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const legacy = look === "legacy";
    const kind = legacy ? "bleed" : page.layout || "splash";
    const u = Math.min(pw, ph);
    const m = kind === "bleed" ? 0 : Math.round(u * 0.045);
    const gut = Math.max(4, Math.round(u * 0.02));
    const F = { x: m, y: m, w: pw - m * 2, h: ph - m * 2 };
    const insets = legacy ? [] : page.insets || [];
    const panels = [];
    let main;
    let cap = null;
    if (kind === "tiers") {
      const mh = Math.round(F.h * (page.split ?? 0.64));
      main = R(F.x, F.y, F.w, mh);
      const row = insets.filter((i) => (i.slot ?? "low") === "low");
      const n = Math.max(1, row.length);
      const cw = (F.w - gut * (n - 1)) / n;
      row.forEach((src, i) => panels.push({ src, poly: R(F.x + i * (cw + gut), F.y + mh + gut, cw, F.h - mh - gut) }));
    } else if (kind === "diagonal") {
      const a = F.x + F.w * (page.cutTop ?? 0.68);
      const b = F.x + F.w * (page.cutBottom ?? 0.56);
      main = [[F.x, F.y], [a, F.y], [b, F.y + F.h], [F.x, F.y + F.h]];
      const src = insets.find((i) => i.slot === "cut");
      if (src) panels.push({ src, poly: [[a + gut, F.y], [F.x + F.w, F.y], [F.x + F.w, F.y + F.h], [b + gut, F.y + F.h]] });
      cap = { x: F.x, y: F.y, w: Math.min(a, b) - F.x - gut, h: F.h };
    } else {
      main = R(F.x, F.y, F.w, F.h);
    }
    panels.unshift({ src: page.panel, poly: main, main: true });
    for (const src of insets) {
      const sl = src.slot;
      if (!["tl", "tr", "bl", "br"].includes(sl)) continue;
      const iw = F.w * (src.w ?? 0.26);
      const ih = F.h * (src.h ?? 0.26);
      const pad = gut * 1.8 + (kind === "bleed" ? u * 0.03 : 0);
      const x = sl[1] === "l" ? F.x + pad : F.x + F.w - iw - pad;
      const y = sl[0] === "t" ? F.y + pad : F.y + F.h - ih - pad;
      panels.push({ src, poly: R(x, y, iw, ih), inset: true });
    }
    for (const p of panels) p.box = polyBox(p.poly);
    const out = { key, panels, cap: cap || panels[0].box, gut, m };
    lays.set(page, out);
    return out;
  }

  /**
   * A backdrop flattened once at page size and shared by every panel that
   * shows it (its layers composited every bake cost a long frame each on a
   * slow CPU), cover-fitted into the panel.
   */
  _drawFbBackdrop(g, bg, w, h) {
    const F = this._fbFrame;
    if (!F) {
      this.drawCutsceneBg(g, w, h, bg, FB_BAKE_T);
      return;
    }
    const k = Math.min(F.k, 1.25);
    const key = `bg|${bg}|${this._look()}|${Math.round(F.pw)}|${Math.round(F.ph)}|${k.toFixed(3)}`;
    const c = this._fbBake(key, F.pw, F.ph, k, (b) => this.drawCutsceneBg(b, F.pw, F.ph, bg, FB_BAKE_T), F.now, this._fbNeed, true);
    const e = this._fbBakes.get(key);
    if (!e?.final) this._fbPending = true;
    if (!c) return;
    const sc = Math.max(w / F.pw, h / F.ph);
    g.drawImage(c, (w - F.pw * sc) / 2, (h - F.ph * sc) / 2, F.pw * sc, F.ph * sc);
  }

  /** A page as printed: paper, panels (art, screens, inks), stock and binding. */
  _paintPrintedPage(g, page, idx, pw, ph, s, look, spineRight) {
    const comic = look === "comic";
    const L = this._fbLayout(page, pw, ph, look);
    const rand = fbRand(9173 + idx * 131);
    const u = Math.min(pw, ph);
    // Paper.
    g.fillStyle = comic ? "#efe6cd" : "#0d0e11";
    g.fillRect(0, 0, pw, ph);
    for (const P of L.panels) {
      if (P.inset) {
        // Inserts lift off the panel under them: a soft drop and a paper rim.
        g.save();
        g.shadowColor = comic ? "rgba(20,10,0,0.45)" : "rgba(0,0,0,0.7)";
        g.shadowBlur = u * 0.025;
        g.shadowOffsetX = u * 0.006;
        g.shadowOffsetY = u * 0.01;
        g.fillStyle = comic ? "#f4ecd6" : "#0d0e11";
        const r = L.gut * 0.6;
        g.fillRect(P.box.x - r, P.box.y - r, P.box.w + r * 2, P.box.h + r * 2);
        g.restore();
      }
      this._paintPanel(g, P, s, look, rand, u);
    }
    if (comic) {
      // Newsprint: the stock's fibres multiplied through ink and paper alike.
      g.save();
      g.globalCompositeOperation = "multiply";
      g.globalAlpha = 0.85;
      g.fillStyle = g.createPattern(paperTile("news"), "repeat");
      g.fillRect(0, 0, pw, ph);
      g.restore();
      // Age toning creeping in from the trim.
      g.save();
      g.globalCompositeOperation = "multiply";
      const edge = (x0, y0, x1, y1, a) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, `rgba(176,140,80,${a})`);
        gr.addColorStop(1, "rgba(176,140,80,0)");
        return gr;
      };
      const d = u * 0.05;
      g.fillStyle = edge(0, 0, 0, d, 0.35);
      g.fillRect(0, 0, pw, d);
      g.fillStyle = edge(0, ph, 0, ph - d, 0.4);
      g.fillRect(0, ph - d, pw, d);
      g.fillStyle = edge(spineRight ? 0 : pw, 0, spineRight ? d : pw - d, 0, 0.45);
      g.fillRect(spineRight ? 0 : pw - d, 0, d, ph);
      g.restore();
    } else {
      // Modern: a matte stock with a fine grain over the art.
      g.save();
      g.globalCompositeOperation = "overlay";
      g.globalAlpha = 0.16;
      g.fillStyle = g.createPattern(paperTile("grain"), "repeat");
      g.fillRect(0, 0, pw, ph);
      g.restore();
    }
    // Gutter of the binding: the page curves down into the spine.
    const gw = pw * 0.07;
    const sx = spineRight ? pw : 0;
    const spine = g.createLinearGradient(sx, 0, spineRight ? pw - gw : gw, 0);
    spine.addColorStop(0, "rgba(0,0,0,0.5)");
    spine.addColorStop(0.18, "rgba(0,0,0,0.22)");
    spine.addColorStop(0.3, comic ? "rgba(255,248,230,0.08)" : "rgba(255,255,255,0.03)");
    spine.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = spine;
    g.fillRect(spineRight ? pw - gw : 0, 0, gw, ph);
    // Light falls off toward the corners.
    const fall = g.createRadialGradient(pw * 0.5, ph * 0.42, u * 0.3, pw * 0.5, ph * 0.5, Math.hypot(pw, ph) * 0.62);
    fall.addColorStop(0, "rgba(0,0,0,0)");
    fall.addColorStop(1, comic ? "rgba(30,16,0,0.28)" : "rgba(0,0,0,0.35)");
    g.fillStyle = fall;
    g.fillRect(0, 0, pw, ph);
    // Trim edge.
    g.strokeStyle = comic ? "rgba(90,70,40,0.55)" : "rgba(255,255,255,0.06)";
    g.lineWidth = Math.max(1, u * 0.0015);
    g.strokeRect(0.5, 0.5, pw - 1, ph - 1);
  }

  /** One panel into its shape: backdrop, figure, screens, speed lines, border. */
  _paintPanel(g, P, s, look, rand, u) {
    const comic = look === "comic";
    const src = P.src || {};
    const { x, y, w, h } = P.box;
    g.save();
    polyPath(g, P.poly);
    g.clip();
    g.translate(x, y);
    if (src.readout) this._paintReadout(g, src.readout, w, h, look);
    else if (src.bg) this._drawFbBackdrop(g, src.bg, w, h);
    else {
      g.fillStyle = comic ? "#14101c" : "#0a0b0e";
      g.fillRect(0, 0, w, h);
    }
    if (src.art) {
      g.save();
      // Art sizes itself to the rect it is given; artZoom scales past that.
      const artScale = Math.min(w, h) / 200;
      const zoom = src.artZoom ?? 1;
      const artCx = w * (src.artX ?? 0.5);
      const artCy = h * (src.artY ?? 0.42);
      g.translate(artCx, artCy);
      g.scale(artScale * zoom, artScale * zoom);
      g.translate(-w / 2 / artScale, -artCy / artScale);
      drawCutsceneArt(g, w / artScale, h / artScale, src.art, FB_BAKE_T);
      g.restore();
    }
    if (src.tint) {
      g.save();
      g.globalCompositeOperation = "multiply";
      g.fillStyle = src.tint;
      g.fillRect(0, 0, w, h);
      g.restore();
    }
    if (src.glow) {
      // A light source spilling into the panel (screen blend).
      g.save();
      g.globalCompositeOperation = "screen";
      const [gx, gy, gr, gc] = src.glow;
      const rg = g.createRadialGradient(w * gx, h * gy, 0, w * gx, h * gy, Math.max(w, h) * gr);
      rg.addColorStop(0, gc);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, w, h);
      g.restore();
    }
    if (src.action) this._paintSpeedLines(g, w, h, src, look, rand);
    if (comic && !src.readout) {
      // Ben-Day screen: dots that swell toward the bottom of the panel, the
      // way a printer's shading screen fills a shadow, multiplied over the art.
      const amt = Math.min(1, 0.28 + (src.halftone ?? 0.08) * 2.4);
      const dot = Math.max(2.2, u * 0.0062);
      const bands = 6;
      const top = h * 0.5;
      g.save();
      g.globalCompositeOperation = "multiply";
      for (let b = 0; b < bands; b++) {
        const y0 = top + ((h - top) * b) / bands;
        g.globalAlpha = amt * (0.5 + 0.5 * (b / (bands - 1)));
        g.fillStyle = halftonePattern(g, dot, dot * (0.16 + 0.07 * b), true);
        g.fillRect(0, y0, w, (h - top) / bands + 1);
      }
      g.restore();
    }
    // Panel lighting: a soft inner vignette gives every panel its own depth.
    const vg = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, comic ? "rgba(10,4,0,0.35)" : "rgba(0,0,0,0.5)");
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    g.restore();
    // Border: brush ink for Comic, a hairline frame for Modern.
    if (comic) inkBorder(g, P.poly, Math.max(2, u * (P.inset ? 0.0055 : 0.0048)), INK, rand);
    else {
      g.save();
      g.strokeStyle = "rgba(0,0,0,0.9)";
      g.lineWidth = Math.max(1.5, u * 0.004);
      polyPath(g, P.poly);
      g.stroke();
      g.strokeStyle = "rgba(232,226,212,0.55)";
      g.lineWidth = Math.max(1, u * 0.0012);
      polyPath(g, P.poly);
      g.stroke();
      g.restore();
    }
  }

  /** Speed lines toward a focus: tapered ink wedges (Comic), light streaks (Modern). */
  _paintSpeedLines(g, w, h, src, look, rand) {
    const fx = w * (src.sfxX ?? 0.5);
    const fy = h * (src.actionY ?? 0.45);
    const n = 46;
    const R = Math.hypot(w, h);
    g.save();
    g.fillStyle = look === "comic" ? "rgba(13,10,8,0.55)" : "rgba(220,235,255,0.07)";
    if (look !== "comic") g.globalCompositeOperation = "screen";
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.12;
      const r0 = Math.min(w, h) * (0.3 + rand() * 0.18);
      const da = 0.006 + rand() * 0.012;
      g.moveTo(fx + Math.cos(a) * r0, fy + Math.sin(a) * r0);
      g.lineTo(fx + Math.cos(a - da) * R, fy + Math.sin(a - da) * R);
      g.lineTo(fx + Math.cos(a + da) * R, fy + Math.sin(a + da) * R);
      g.closePath();
    }
    g.fill();
    g.restore();
  }

  /**
   * A small screen panel: a clock, a badge readout, a board of rows. Drawn
   * as a lit display so a page can cut to a detail the art has no model for.
   * readout = { text, label, color, rows: [[left, right, hot]] }
   */
  _paintReadout(g, r, w, h, look) {
    const col = r.color || "#ff4a3a";
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#0c1016");
    bg.addColorStop(1, "#040507");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // Bezel light and scanlines.
    g.save();
    g.globalAlpha = 0.22;
    g.fillStyle = "#000";
    for (let yy = 0; yy < h; yy += 3) g.fillRect(0, yy, w, 1);
    g.restore();
    const glow = g.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.7);
    glow.addColorStop(0, col + "40");
    glow.addColorStop(1, col + "00");
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    const mono = '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
    g.textBaseline = "middle";
    const lab = Math.max(8, h * 0.11);
    if (r.label) {
      g.font = `700 ${lab}px ${mono}`;
      g.textAlign = "left";
      g.fillStyle = "rgba(200,214,230,0.7)";
      g.fillText(r.label, w * 0.07, h * 0.16);
    }
    if (r.rows) {
      const rh = Math.min(h * 0.17, (h * 0.72) / r.rows.length);
      g.font = `700 ${rh * 0.62}px ${mono}`;
      r.rows.forEach(([left, right, hot], i) => {
        const yy = h * 0.3 + rh * (i + 0.5);
        if (hot) {
          g.fillStyle = col + "33";
          g.fillRect(w * 0.05, yy - rh * 0.45, w * 0.9, rh * 0.9);
        }
        g.fillStyle = hot ? col : "rgba(190,205,220,0.55)";
        g.textAlign = "left";
        g.fillText(left, w * 0.08, yy);
        g.textAlign = "right";
        g.fillText(right, w * 0.92, yy);
      });
    } else if (r.text) {
      let sz = h * (r.label ? 0.5 : 0.6);
      g.font = `800 ${sz}px ${mono}`;
      const mw = g.measureText(r.text).width;
      if (mw > w * 0.86) {
        sz *= (w * 0.86) / mw;
        g.font = `800 ${sz}px ${mono}`;
      }
      g.textAlign = "center";
      const ty = h * (r.label ? 0.6 : 0.52);
      // Unlit segments behind the lit ones, then the glow.
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillText(r.text.replace(/[0-9]/g, "8"), w / 2, ty);
      g.save();
      g.shadowColor = col;
      g.shadowBlur = sz * 0.35 * (g.getTransform().a || 1);
      g.fillStyle = col;
      g.fillText(r.text, w / 2, ty);
      g.restore();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillText(r.text, w / 2, ty - sz * 0.02);
      g.fillStyle = col;
      g.globalAlpha = 0.85;
      g.fillText(r.text, w / 2, ty);
      g.globalAlpha = 1;
    }
    // Glass sheen.
    const sh = g.createLinearGradient(0, 0, w, h);
    sh.addColorStop(0, "rgba(255,255,255,0.08)");
    sh.addColorStop(0.4, "rgba(255,255,255,0)");
    g.fillStyle = sh;
    g.fillRect(0, 0, w, h);
  }

  /** A page's lettering, live on the text layer: captions, sfx, prompt. */
  _drawFbLettering(ctx, page, px, py, pw, ph, t, s, alpha) {
    if (alpha <= 0) return;
    const look = this._look();
    const panel = page.panel;
    ctx.save();
    ctx.translate(px, py);
    if (look === "legacy") {
      this._drawPageText(ctx, pw, ph, panel, t, s, alpha);
      ctx.restore();
      return;
    }
    ctx.globalAlpha *= alpha;
    const L = this._fbLayout(page, pw, ph, look);
    // Inset captions first, so the page's own caption reads on top.
    for (const P of L.panels) {
      if (P.main || !P.src.caption) continue;
      ctx.save();
      ctx.translate(P.box.x, P.box.y);
      this._drawCaption(ctx, P.src, P.box.w, P.box.h, "panel", 1e9);
      ctx.restore();
    }
    if (panel.caption) {
      const c = L.cap;
      ctx.save();
      ctx.translate(c.x, c.y);
      this._drawCaption(ctx, panel, c.w, c.h, "page", 1e9);
      ctx.restore();
    }
    if (panel.sfx) this._drawSfx(ctx, panel, pw, ph, s, "page");
    if (panel.prompt) this._drawPagePrompt(ctx, panel, pw, ph, t, s);
    ctx.restore();
  }

  /**
   * The turning page: it rotates about the spine and curls, the free edge
   * leading, drawn as strips of the page bitmap projected with perspective.
   * Each strip is shaded by how far it faces away from the light; the far
   * side shows the back of the sheet. Under it, the shadow it throws.
   * `p` is the eased turn 0..1.
   */
  _drawPageTurn(ctx, img, px, py, pw, ph, p, spineRight) {
    const look = this._look();
    const dir = spineRight ? -1 : 1;
    const spineX = spineRight ? px + pw : px;
    const cx = px + pw / 2;
    const cy = py + ph / 2;
    const A = Math.PI * p ** 1.25; // the sheet's angle at the spine
    const B = 0.75 * Math.sin(Math.PI * p); // extra turn at the free edge (the curl)
    const N = 40;
    const camD = pw * 6;
    const pts = [];
    let x = 0;
    let z = 0;
    for (let i = 0; i <= N; i++) {
      const uu = i / N;
      const th = Math.min(Math.PI, A + B * uu * uu);
      if (i > 0) {
        const um = (i - 0.5) / N;
        const tm = Math.min(Math.PI, A + B * um * um);
        x += (Math.cos(tm) * pw) / N;
        z += (Math.sin(tm) * pw) / N;
      }
      const f = camD / (camD - z);
      pts.push({ X: cx + (spineX + dir * x - cx) * f, f, z, th });
    }
    const top = (f) => cy + (py - cy) * f;
    const bot = (f) => cy + (py + ph - cy) * f;

    // Shadow thrown on the page below, reaching past the free edge.
    const lift = Math.sin(Math.min(Math.PI, A + B * 0.5));
    const far = pts[N].X;
    const reach = spineX + dir * Math.max(0, Math.min(pw, dir * (far - spineX) + pw * 0.12 * lift));
    if (lift > 0.01 && dir * (reach - spineX) > 1) {
      const sh = ctx.createLinearGradient(spineX, 0, reach, 0);
      sh.addColorStop(0, `rgba(0,0,0,${0.55 * lift})`);
      sh.addColorStop(0.8, `rgba(0,0,0,${0.3 * lift})`);
      sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(Math.min(spineX, reach), py, Math.abs(reach - spineX), ph);
    }

    // Strips far to near, so the curl's near side covers its far side.
    // Each side of the sheet is one contiguous run of strips.
    const front = (i) => dir * (pts[i + 1].X - pts[i].X) > 0;
    const runs = [];
    for (let i = 0; i < N; i++) {
      const r = runs[runs.length - 1];
      if (r && r.front === front(i)) r.i1 = i + 1;
      else runs.push({ front: front(i), i0: i, i1: i + 1, z: 0 });
    }
    for (const r of runs) for (let i = r.i0; i <= r.i1; i++) r.z = Math.max(r.z, pts[i].z);
    runs.sort((a, b) => a.z - b.z);
    const sw = img.width / N;
    const back = look === "comic" ? "#e6dbbf" : look === "cine" ? "#18191c" : "#1a1424";
    const outline = (r) => {
      ctx.beginPath();
      ctx.moveTo(pts[r.i0].X, top(pts[r.i0].f));
      for (let i = r.i0 + 1; i <= r.i1; i++) ctx.lineTo(pts[i].X, top(pts[i].f));
      for (let i = r.i1; i >= r.i0; i--) ctx.lineTo(pts[i].X, bot(pts[i].f));
      ctx.closePath();
    };
    // Light on the sheet by how far each point faces the viewer, as one
    // gradient per side (strip-by-strip fills left seams).
    const shadeRun = (r, fn) => {
      const xa = pts[r.i0].X;
      const xb = pts[r.i1].X;
      if (Math.abs(xb - xa) < 0.5) return;
      const gr = ctx.createLinearGradient(xa, 0, xb, 0);
      for (let i = r.i0; i <= r.i1; i++) gr.addColorStop((i - r.i0) / (r.i1 - r.i0), fn(pts[i].th));
      ctx.fillStyle = gr;
      outline(r);
      ctx.fill();
    };
    for (const r of runs) {
      ctx.save();
      outline(r);
      ctx.clip();
      if (!r.front) {
        ctx.fillStyle = back;
        ctx.fill();
        ctx.globalAlpha = 0.08; // the print showing through the sheet
      }
      for (let i = r.i0; i < r.i1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const x0 = Math.min(a.X, b.X);
        const f = Math.max(a.f, b.f);
        const sx = dir > 0 ? i * sw : img.width - (i + 1) * sw;
        ctx.drawImage(img, sx, 0, sw, img.height, x0, top(f), Math.abs(b.X - a.X) + 0.75, bot(f) - top(f));
      }
      ctx.restore();
      const fr = r.front;
      shadeRun(r, (th) => `rgba(0,0,0,${(0.62 * (1 - Math.max(0, fr ? Math.cos(th) : -Math.cos(th)))).toFixed(3)})`);
      shadeRun(r, (th) => {
        const sp = fr ? 0.2 * Math.exp(-(((th - 0.8) / 0.28) ** 2)) : 0.12 * Math.exp(-(((th - 2.3) / 0.3) ** 2));
        return `rgba(255,250,236,${sp.toFixed(3)})`;
      });
    }
    // The free edge catches a line of light.
    const e = pts[N];
    ctx.strokeStyle = `rgba(255,246,225,${(0.3 * lift).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 1.5 * e.f);
    ctx.beginPath();
    ctx.moveTo(e.X, top(e.f));
    ctx.lineTo(e.X, bot(e.f));
    ctx.stroke();
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
      const { c: block, pad } = this._coverBlock(ctx, pw, ph, s, now);
      ctx.save();
      ctx.globalAlpha = closed;
      ctx.drawImage(block, px - pad, py - pad, pw + pad * 2, ph + pad * 2);
      ctx.restore();
    }

    // Page 1 waits under the cover
    if (open > 0) {
      ctx.drawImage(this._fbPageBitmap(ctx, fb, 0, pw, ph, s, paperTint, spineRight, now, true), px, py, pw, ph);
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
      const face = this._coverFace(ctx, pw, ph, fb, s, paperTint, now);
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

  /** The front cover, baked once (art still decoding is rebaked). */
  _coverFace(ctx, pw, ph, fb, s, paperTint, now) {
    const k = this._fbScale(ctx, pw);
    const key = `cover|${this._look()}|${Math.round(pw)}|${Math.round(ph)}|${k.toFixed(3)}`;
    return this._fbBake(key, pw, ph, k, (g) => this._paintCoverFace(g, pw, ph, fb, s, paperTint), now, true);
  }

  /** The closed book under its cover: back board and page edges, with its shadow. */
  _coverBlock(ctx, pw, ph, s, now) {
    const k = Math.min(1, this._fbScale(ctx, pw));
    const pad = 80 * s;
    const key = `block|${this._look()}|${Math.round(pw)}|${Math.round(ph)}|${k.toFixed(3)}`;
    const c = this._fbBake(key, pw + pad * 2, ph + pad * 2, k, (g) => {
      g.translate(pad, pad);
      g.save();
      g.shadowColor = "rgba(0,0,0,0.7)";
      g.shadowBlur = 36 * s * k;
      g.shadowOffsetY = 18 * s * k;
      const layers = 6;
      const step = 1.7 * s;
      g.fillStyle = "#15101c";
      g.fillRect((layers + 1) * step, (layers + 1) * step, pw, ph);
      g.restore();
      for (let i = layers; i >= 1; i--) {
        g.fillStyle = i % 2 ? "#d9ceb4" : "#b8aa8c";
        g.fillRect(i * step, i * step, pw, ph);
      }
    }, now, true);
    return { c, pad };
  }

  /** Paint the comic's front cover in page pixels at the context origin. */
  _paintCoverFace(c, pw, ph, fb, s, paperTint) {
    const t = FB_BAKE_T;
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
      drawCutsceneArt(c, pw, ph, cover.art, t);
      c.restore();
    }

    // Print feel: halftone dots + a warm ink wash rising from the bottom
    const dot = 5 * s;
    c.save();
    c.globalAlpha = 0.12;
    c.fillStyle = halftonePattern(c, dot, dot * 0.42, true);
    c.fillRect(0, 0, pw, ph);
    c.restore();
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

    const look = this._look();
    if (look === "comic") {
      // Starburst blurb, the newsstand shout.
      const bx = pw * 0.84;
      const by = ph * 0.4;
      const R = ph * 0.12;
      c.save();
      c.translate(bx, by);
      c.rotate(-0.18);
      c.beginPath();
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        const r = i % 2 ? R * 0.74 : R;
        c.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r);
      }
      c.closePath();
      c.shadowColor = "rgba(0,0,0,0.55)";
      c.shadowOffsetX = R * 0.06;
      c.shadowOffsetY = R * 0.08;
      c.fillStyle = "#ffd21a";
      c.fill();
      c.shadowColor = "transparent";
      c.lineWidth = Math.max(2, R * 0.05);
      c.strokeStyle = "#0b0b0b";
      c.stroke();
      c.fillStyle = "#c8141e";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = `900 italic ${Math.round(R * 0.36)}px Impact, "Arial Black", sans-serif`;
      c.fillText("ORIGIN", 0, -R * 0.2);
      c.font = `900 italic ${Math.round(R * 0.42)}px Impact, "Arial Black", sans-serif`;
      c.fillText("ISSUE!", 0, R * 0.22);
      c.restore();
      // Dateline under the masthead.
      c.font = `900 ${Math.round(ph * 0.03)}px Impact, "Arial Black", sans-serif`;
      c.textAlign = "left";
      c.textBaseline = "top";
      c.fillStyle = "#f4ead2";
      c.fillText("CHRONOS STATION · 06:47", boxX + boxW + pad, boxY + boxH + pad * 0.3);
      // Printed on newsprint: the stock through every ink.
      c.save();
      c.globalCompositeOperation = "multiply";
      c.globalAlpha = 0.7;
      c.fillStyle = c.createPattern(paperTile("news"), "repeat");
      c.fillRect(0, 0, pw, ph);
      c.restore();
    } else if (look === "cine") {
      c.save();
      c.strokeStyle = "rgba(244,236,214,0.35)";
      c.lineWidth = Math.max(1, s);
      c.strokeRect(spineW + pad * 0.3, pad * 0.5, pw - spineW - pad * 0.8, ph - pad);
      c.globalCompositeOperation = "overlay";
      c.globalAlpha = 0.18;
      c.fillStyle = c.createPattern(paperTile("grain"), "repeat");
      c.fillRect(0, 0, pw, ph);
      c.restore();
    }

    // Glossy stock: faint diagonal sheen
    const sheen = c.createLinearGradient(0, 0, pw, ph);
    sheen.addColorStop(0.3, "rgba(255,255,255,0)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0.07)");
    sheen.addColorStop(0.6, "rgba(255,255,255,0)");
    c.fillStyle = sheen;
    c.fillRect(0, 0, pw, ph);

    c.restore();
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
      drawCutsceneArt(ctx, pw / artScale, ph / artScale, panel.art, t);
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
      ctx.fillStyle = halftonePattern(ctx, dot, dot * 0.45, false);
      ctx.fillRect(0, 0, pw, ph);
      ctx.globalAlpha = alpha;
    }

    // Paper grain texture (subtle, scanline-based)
    ctx.drawImage(paperGrain(ph), 0, 0, pw, Math.ceil(ph));

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
        // Kept inside the panel and off its caption; the phone's larger
        // full-screen figure would overflow a panel, so it is not applied.
        const zone = this._panelArtZone(ctx, panel, pw, ph);
        this._fitArt(ctx, pw / artScale, ph / artScale, panel.art, { top: zone.top / artScale, bottom: zone.bottom / artScale }, false);
        drawCutsceneArt(ctx, pw / artScale, ph / artScale, panel.art, artT);
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

  /**
   * Full-screen art: a phone keeps a floor on the figure's scale. Panels,
   * pages and covers call the module function without it, since the floor
   * is in screen terms and blew a panel's figure up past its borders.
   */
  drawCutsceneArt(ctx, w, h, art, t) {
    drawCutsceneArt(ctx, w, h, art, t, this.isTouchDevice);
  }
}

/** A cutscene backdrop on its own (reel `art` shots); the method keeps no engine state. */
export function drawCutsceneBg(ctx, w, h, bg, t) {
  CutsceneEngine.prototype.drawCutsceneBg(ctx, w, h, bg, t);
}
