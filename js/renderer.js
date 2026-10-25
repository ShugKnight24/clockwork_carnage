import { WALL_COLORS } from "./data.js";

import { generateWallTextures, generateFloorCeilTextures, generateModernEnv, ensureEnvWalls, REAL_AMBIENT, averageColor } from "../src/rendering/textures.js";
import { EnvMap, AO_RADIUS, AO_FLOOR, GLOW_RADIUS } from "../src/rendering/env/env-map.js";
import { rgbaBytes } from "../src/rendering/webgl/wall-pass.js";

/** Ambient-occlusion falloff toward a nearby occluder. Hoisted out of the
 *  floor/ceiling loop: both only read module constants, so rebuilding the
 *  closures on every frame cost an allocation and bought nothing. */
const aoAt = (d) => {
  if (d >= AO_RADIUS) return 1;
  const t = d / AO_RADIUS;
  return AO_FLOOR + (1 - AO_FLOOR) * t * t * (3 - 2 * t);
};

/** Emissive falloff away from a glowing cell. */
const glowAt = (d) => {
  if (d >= GLOW_RADIUS) return 0;
  const t = 1 - d / GLOW_RADIUS;
  return t * t;
};
import { ENEMY_RENDERERS } from "../src/rendering/enemies/index.js";
import {
  drawPickup,
  drawHealthPickup,
  drawAmmoPickup,
  drawWeaponPickup,
  drawExit,
  drawPowerCell,
  drawProjectile,
  drawExoticPickup,
  drawGearPickup,
  setFxCamera,
  drawRealisticParticle,
} from "../src/rendering/pickups.js";
import { drawProp, setFovScale } from "../src/rendering/props.js";
import { GLRenderer } from "../src/rendering/webgl/gl-renderer.js";
import { isModernArt, isRealisticArt } from "../src/rendering/art-style.js";
import { castColumn, createColumnHits, coverClipY, MAX_COLUMN_HITS } from "../src/rendering/column-cast.js";
import { buildLampField, sampleLight } from "../src/rendering/lighting.js";

// Realistic sprite lighting: one reused light sample and a cache of the
// quantised ctx.filter strings, so lighting sprites allocates nothing per frame.
const _litOut = { r: 0, g: 0, b: 0 };
const _litFilters = new Map();
import { prepareEnemySprite, drawEnemySprite } from "../src/rendering/svg-art/sprites/enemies.js";
import { drawFrozenPerson } from "../src/rendering/frozen-look.js";
import { isFrozen } from "../src/systems/stillness.js";
import { EYE_Z, playerEyeZ } from "../src/systems/physics.js";

// Short-wall records kept per screen column (one per wall the ray crosses).
const COVER_STRIDE = MAX_COLUMN_HITS;

// Short-wall top faces: fog steps, how much darker than the art they read,
// and a per-texture cache of the fogged colours (see Renderer._capLUT).
const CAP_FOG_STEPS = 32;
const CAP_SHADE = 0.28;
const _capCache = new WeakMap();
const _noTexture = {}; // cache slot for a wall type with no art
const NO_RGBA = [0, 0, 0, 0];
// Realistic per-pixel wall light: multiplies the wall's own colour, so it
// needs more gain than the old additive fill to read as bright up close.
const WALL_LIGHT_GAIN = 12;
const WALL_TEX = 512; // Modern wall art, mip 0
// Glint of dynamic lights on polished wall relief (Realistic, with normals).
const WALL_SPEC_GAIN = 0.6;

// --- Performance: Pre-computed fog rgba string LUT ---
// Quantize fog alpha to 64 discrete steps to avoid per-column string creation
const FOG_CACHE_STEPS = 64;
const _fogCache = new Map(); // key: "r,g,b" -> Array[FOG_CACHE_STEPS+1] of rgba strings

function _getFogString(r, g, b, alpha) {
  const step = Math.min(FOG_CACHE_STEPS, (alpha * FOG_CACHE_STEPS + 0.5) | 0);
  const key = `${r},${g},${b}`;
  let lut = _fogCache.get(key);
  if (!lut) {
    lut = new Array(FOG_CACHE_STEPS + 1);
    for (let i = 0; i <= FOG_CACHE_STEPS; i++) {
      const a = (i / FOG_CACHE_STEPS).toFixed(4);
      lut[i] = `rgba(${r},${g},${b},${a})`;
    }
    _fogCache.set(key, lut);
  }
  return lut[step];
}

// A shield bearer's floor arc, projected (x, y pairs): its rim, then its centre.
const _arcPts = new Float64Array(28);

// --- Performance: Pre-allocated sprite sort arrays ---
// Reused each frame to avoid per-frame allocation + GC pressure.
let _spriteDistBuf = new Float64Array(256);
let _spriteOrderBuf = new Int32Array(256);
let _spriteOrderCount = 0;
const _byDistanceDesc = (a, b) => _spriteDistBuf[b] - _spriteDistBuf[a];
/** The third-person camera: how far behind the cadet, and how far off to their right. */
const TP_CAM_BACK = 2.4;
const TP_CAM_SIDE = 0.6;

// TODO: Improve variety w/ textures
// TODO: These are all procedurally generated at runtime... lol... Could be optimized by pre-generating and caching, or by using actual image files for more complex textures
// TODO: Asset Pipeline for the above or is this overkill
// TODO: Refine assets and improve variety
export class Renderer {
  constructor(canvas, renderMode = 0) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.textures = {};
    this.zBuffer = new Float64Array(this.width);
    // Ray-march scratch for the wall pass; short-wall records for sprites are
    // sized per frame (_ensureCoverBufs).
    this._colHits = createColumnHits();
    // The camera a Legacy shield bearer is drawn turned toward (renderSprites).
    this._facingCam = { rx: null, ry: null, x: 0, y: 0 };
    // The eye's height in wall units this frame (0.5 standing) and how far it
    // sits under the standing eye. Sprites, particles and _projectWorld place
    // things relative to the standing eye line and lift them by `_eyeDrop`.
    this._eyeZ = EYE_Z;
    this._eyeDrop = 0;
    // Added to the low-cover silhouettes while a sprite is drawn lifted by the
    // eye drop, so its clip stays in the sprite's own (translated) space.
    this._clipBias = 0;
    this._visualStyle = 0; // 0 = Clockwork (cartoony), 1 = Brutal
    this._actPalette = 1;  // 1 = Act1 (teal), 2 = Act2 (amber), 3 = Act3 (crimson)
    this._envLevel = null; // campaign level env id, for the per-level palette
    // Modern walls drawn by the GL wall pass when it is available; false
    // forces the Canvas2D path (debugging, A/B timing).
    this.gpuWalls = true;
    this.gpuWallLights = true;
    this.gpuWallTrilinear = true;
    this.gpuWallNormals = true;
    this._glLight = [0, 0, 0, 0];
    this._glAccent = [0, 0, 0, 0];
    // Painted per wall type on first use (it reads its cap colour back then).
    this.textures = generateWallTextures();
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;
    // Modern art style environment: 512px wall/deck art per act, built lazily
    // so Legacy never pays for it. `_envMap` carries per-cell contact-AO and
    // emissive-spill bytes for the deck shading.
    this._modernEnv = null;
    this._envMap = new EnvMap();
    this._envMapGLVersion = -1;

    // WebGL hybrid renderer (renderMode: 0=auto, 1=2D only, 2=3D/WebGL)
    this.glRenderer = null;
    this.useWebGL = false;
    this._renderMode = renderMode;
    this._initGL(renderMode);
  }

  /**
   * Light arriving at world point (x, y) for the Realistic style: ceiling lamps
   * overhead plus dynamic lights. Writes an {r, g, b} multiplier into `out`
   * (see src/rendering/lighting.js). Sprites, projectiles and the viewmodel
   * use it to sit in the same light as the deck.
   */
  lightAt(x, y, out) {
    const env = this._modernEnv;
    if (env && env.lampField === undefined) {
      env.lampField = buildLampField(env.deck?.ceil) || null;
    }
    return sampleLight(out, x, y, this.lights, env ? env.lampField : null);
  }

  /** Free the Modern 512px wall/deck art; it is rebuilt lazily on next use. */
  releaseModernEnv() {
    this._modernEnv = null;
    this._altModernEnv = null;
    this._envMapGLVersion = -1;
  }

  /** Bring up the WebGL hybrid path unless the mode forbids it. */
  _initGL(renderMode) {
    if (renderMode === 1) return;
    // Try to initialize WebGL (auto or explicit 3D)
    this.glRenderer = GLRenderer.create(this.width, this.height);
    if (this.glRenderer) {
      // A lost context (GPU reset, driver update, too many contexts) draws
      // nothing, and walls now go through it too: drop to Canvas2D until the
      // browser hands the context back, then rebuild on a fresh one.
      const gl = this.glRenderer;
      gl.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        if (this.glRenderer !== gl) return;
        console.warn('[Renderer] WebGL context lost — drawing with Canvas2D');
        this.glRenderer = null;
        this.useWebGL = false;
      });
      gl.canvas.addEventListener('webglcontextrestored', () => {
        if (this.glRenderer || this.useWebGL) return;
        this._initGL(this._renderMode);
      });
      this.useWebGL = true;
      this._envMapGLVersion = -1;
      this._uploadFloorCeilToGL();
      // A fresh context has no Modern deck: it was only uploaded when the env
      // was rebuilt, so switching Render Mode fell back to the soft CPU floor.
      if (this._modernEnv) this.glRenderer.uploadModernDeck(this._modernEnv.deck.floor, this._modernEnv.deck.ceil);
      console.log('[Renderer] WebGL2 hybrid renderer active');
    } else if (renderMode === 2) {
      console.warn('[Renderer] WebGL2 requested but unavailable — falling back to Canvas2D');
    }
  }

  /**
   * Switch renderer backend at runtime. The Render Mode setting used to be
   * read once at construction — before settings loaded — so changing it in
   * the menu did nothing.
   *
   * @param {number} mode 0 = auto, 1 = Canvas2D only, 2 = WebGL hybrid
   */
  setRenderMode(mode) {
    const next = mode === 1 || mode === 2 ? mode : 0;
    if (next === this._renderMode) return;
    this._renderMode = next;

    if (this.glRenderer) {
      this.glRenderer.destroy();
      this.glRenderer = null;
      this.useWebGL = false;
    }
    this._initGL(next);
  }

  /**
   * Called on campaign level start. The act's palette id picks the base
   * palette; the level's env id (LEVEL_ENVS) picks the variation on it, so two
   * levels in one act no longer share the same steel, lamps and air. Pass null
   * for level outside the campaign.
   */
  applyActPalette(act, level = null) {
    const a = act ?? 1;
    const lv = level ?? null;
    if (this._actPalette === a && this._envLevel === lv) return;
    this._actPalette = a;
    this._envLevel = lv;
    this._modernEnv = null;
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;
    if (this.useWebGL) this._uploadFloorCeilToGL();
  }

  /** Called by settings onChange — 0 = Clockwork, 1 = Brutal */
  applyVisualStyle(styleIndex) {
    const idx = styleIndex ?? 0;
    if (this._visualStyle === idx) return;
    this._visualStyle = idx;
    this._modernEnv = null;
    this._regenerateFloorCeil();
    this._floorCeilBuffer = null;
    if (this.useWebGL) this._uploadFloorCeilToGL();
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.zBuffer = new Float64Array(w);
    this._occN = null;
    this._colKey = null;
    this._floorCeilBuffer = null;
    if (this.glRenderer) this.glRenderer.resize(w, h);
  }

  /** Upload floor/ceiling pixel data to WebGL textures */
  _uploadFloorCeilToGL() {
    if (!this.glRenderer) return;
    // Convert raw pixel arrays to RGBA Uint8ClampedArray for GL upload
    const floorRGBA = new Uint8ClampedArray(256 * 256 * 4);
    const ceilRGBA = new Uint8ClampedArray(256 * 256 * 4);
    for (let i = 0; i < 256 * 256; i++) {
      const si = i * 4;
      floorRGBA[si] = this._floorTexPixels[si];
      floorRGBA[si + 1] = this._floorTexPixels[si + 1];
      floorRGBA[si + 2] = this._floorTexPixels[si + 2];
      floorRGBA[si + 3] = 255;
      ceilRGBA[si] = this._ceilTexPixels[si];
      ceilRGBA[si + 1] = this._ceilTexPixels[si + 1];
      ceilRGBA[si + 2] = this._ceilTexPixels[si + 2];
      ceilRGBA[si + 3] = 255;
    }
    this.glRenderer.uploadFloorCeilTextures(floorRGBA, ceilRGBA);
  }

  /**
   * Bake the Modern environment for a level that is about to start, so the
   * ~200 ms bake lands while its briefing is on screen instead of in the
   * level's first frame. _getModernEnv adopts it if the level matches.
   */
  prewarmEnv(act, level = null, walls = []) {
    if (!isModernArt()) return;
    const a = act || 1;
    const lv = level ?? null;
    const brutal = this._visualStyle === 1;
    const realistic = isRealisticArt();
    const same = (e) => e && e.act === a && e.level === lv && e.brutal === brutal && e.realistic === realistic;
    let env = [this._modernEnv, this._altModernEnv, this._prewarmedEnv].find(same);
    if (!env) {
      env = generateModernEnv(a, brutal, lv, { realistic });
      env.realistic = realistic;
      this._prewarmedEnv = env;
    }
    // The map's own walls (`walls`, ids 10+) as well, so its dressed rooms
    // bake here too rather than in the level's first frame.
    if (walls.length && ensureEnvWalls(env, walls, realistic) && this.glRenderer?._wallPass?.env === env) {
      this.glRenderer._wallPass.env = null;
    }
  }

  /**
   * Hand over an environment bundle built ahead of time (generateModernEnv,
   * with `realistic` set): the next _getModernEnv adopts it when it matches
   * the act, level and finish being drawn, as it would a prewarmEnv's.
   */
  offerEnv(env) {
    if (env) this._prewarmedEnv = env;
  }

  /**
   * A map with walls of its own (the station's lockers, gym and range,
   * ids 10+) has them painted into the env the first time it is drawn, and
   * the GPU wall pass re-uploads its texture array to take them.
   */
  _ensureMapWalls(env, map, player = null) {
    if (map._ownWalls === undefined) {
      const ids = new Set();
      for (const row of map.grid) for (const v of row) if (v >= 10) ids.add(v);
      map._ownWalls = map.ownWalls ?? [...ids];
    }
    if (!map._ownWalls.length) return;
    // Walls the map can't show from where it starts (`lateWalls`: the
    // station's east wing) are painted a few a frame after the rest, so the
    // first frame doesn't wait on them, and go up together.
    const late = map.lateWalls ?? [];
    let added = false;
    try {
      added = ensureEnvWalls(env, late.length ? map._ownWalls.filter((id) => !late.includes(id)) : map._ownWalls, !!env.realistic);
      if (late.length && !added) added = this._paintLateWalls(env, late, () => nearWalls(map, player, late));
    } catch (err) {
      // A face that will not paint must not fail every frame: those cells
      // draw with the common walls instead.
      console.warn("[renderer] map walls failed to paint", err);
      map._ownWalls = [];
    }
    if (added) {
      const wp = this.glRenderer?._wallPass;
      if (wp) wp.env = null;
    }
  }

  /**
   * Paint `late` wall faces into a staging set for ~6 ms a frame; true once
   * they are all done and handed to `env` in one go (one texture upload),
   * or all at once when `inView()` says the player is among them.
   */
  _paintLateWalls(env, late, inView = () => false) {
    let st = env._late;
    if (!st || st.ids !== late) {
      st = env._late = {
        ids: late,
        stage: { walls: {}, act: env.act, palette: env.palette, salt: env.salt },
        left: late.filter((id) => !env.walls[id]),
      };
    }
    if (!st.left.length) return false;
    const now = inView();
    const t0 = performance.now();
    // Standing in the wing (an art-style switch rebuilds the env there), the
    // walls in view would draw as nothing while they wait: paint them all now.
    while (st.left.length && (now || performance.now() - t0 < 6)) ensureEnvWalls(st.stage, [st.left.shift()], !!env.realistic);
    if (st.left.length) return false;
    Object.assign(env.walls, st.stage.walls);
    return true;
  }

  /** Build (or reuse) the Modern environment bundle for the current act. */
  _getModernEnv() {
    const act = this._actPalette || 1;
    const level = this._envLevel ?? null;
    const brutal = this._visualStyle === 1;
    const realistic = isRealisticArt();
    if (
      !this._modernEnv ||
      this._modernEnv.act !== act ||
      this._modernEnv.level !== level ||
      this._modernEnv.brutal !== brutal ||
      this._modernEnv.realistic !== realistic
    ) {
      // Keep the other style's set for this level, so flipping Modern <->
      // Realistic mid-level is instant after the first time instead of a
      // ~150 ms rebuild on every switch. Two sets at most; a new level drops
      // both.
      const prev = this._modernEnv;
      const alt = this._altModernEnv;
      const warm = this._prewarmedEnv;
      this._prewarmedEnv = null;
      if (
        alt && alt.act === act && alt.level === level &&
        alt.brutal === brutal && alt.realistic === realistic
      ) {
        this._modernEnv = alt;
      } else if (warm && warm.act === act && warm.level === level && warm.brutal === brutal && warm.realistic === realistic) {
        this._modernEnv = warm;
      } else {
        this._modernEnv = generateModernEnv(act, brutal, level, { realistic });
        this._modernEnv.realistic = realistic;
      }
      this._altModernEnv =
        prev && prev.act === act && prev.level === level && prev.brutal === brutal
          ? prev
          : null;
      this._envMapGLVersion = -1;
      if (this.glRenderer) {
        this.glRenderer.uploadModernDeck(this._modernEnv.deck.floor, this._modernEnv.deck.ceil);
      }
    }
    return this._modernEnv;
  }

  /**
   * One-pixel-wide column spans filled in one colour after the wall loop: the
   * Comic contact lines. They were rect()s on one path, filled once — but a
   * path of thousands of disjoint rects is beyond Skia's fast GPU path
   * renderers, and on Chrome's D3D11 backend (every Windows Chromium browser
   * by default) that one fill cost 50-70 ms a frame. Plain fillRects in one
   * colour batch into a single draw op.
   */
  _addSpan(x, y, h) {
    let b = this._spans;
    const i = this._spanN * 3;
    if (!b || i + 3 > b.length) {
      const grown = new Float32Array(Math.max(6144, b ? b.length * 2 : 0));
      if (b) grown.set(b);
      b = this._spans = grown;
    }
    b[i] = x;
    b[i + 1] = y;
    b[i + 2] = h;
    this._spanN++;
  }

  _fillSpans(ctx, style) {
    const b = this._spans;
    const n = this._spanN * 3;
    this._spanN = 0;
    ctx.fillStyle = style;
    for (let i = 0; i < n; i += 3) ctx.fillRect(b[i], b[i + 1], 1, b[i + 2]);
  }

  _ensureColBufs(w) {
    if (this._colKey && this._colKey.length === w) return;
    this._colKey = new Int32Array(w);
    this._colTop = new Int32Array(w);
    this._colBot = new Int32Array(w);
    this._colZ = new Float64Array(w);
  }

  /**
   * Per-column short-wall records for the sprite pass: for each short wall a
   * column crosses, its distance and the screen Y (unshifted) below which it
   * hides anything further away. See coverClipY().
   */
  _ensureCoverBufs(w) {
    if (this._occN && this._occN.length === w) return;
    this._occN = new Uint8Array(w);
    this._occDist = new Float32Array(w * COVER_STRIDE);
    this._occY = new Float32Array(w * COVER_STRIDE);
  }

  /**
   * Screen Y (unshifted) below which something `depth` away in column `x` is
   * hidden by short walls in front of it; Infinity when none are.
   * Only meaningful in front of the column's full wall (zBuffer).
   */
  coverClipY(x, depth) {
    if (!this._occN) return Infinity; // no wall pass yet at this size
    return coverClipY(this._occN, this._occDist, this._occY, COVER_STRIDE, x, depth, Infinity) + this._clipBias;
  }

  /** Is a projected point (unshifted screen Y) hidden by a wall or low cover? */
  pointHidden(x, depth, y, slack = 0.1) {
    if (x < 0 || x >= this.width) return true;
    x |= 0;
    return depth > this.zBuffer[x] + slack || y >= this.coverClipY(x, depth);
  }

  /**
   * Add clip rects for a sprite spanning columns x0..x1 and rows top..bottom
   * at `depth`: each column is cut where a full wall stands in front and
   * shortened to the silhouette of any low cover in front. Adjacent columns
   * with the same cut merge into one rect. Returns 0 when nothing shows, 1
   * when the sprite is partly hidden (clip needed), 2 when fully visible.
   */
  _spriteClipPath(ctx, x0, x1, top, bottom, depth) {
    const zb = this.zBuffer;
    if (x0 < 0) x0 = 0;
    if (x1 > zb.length - 1) x1 = zb.length - 1;
    let runStart = -1;
    let runBot = 0;
    let shown = 0;
    let hidden = false;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      // Lowest visible row in this column, or -Infinity when none is.
      let bot = -Infinity;
      if (x <= x1) {
        if (depth < zb[x]) {
          bot = this.coverClipY(x, depth);
          if (bot > bottom) bot = bottom;
          if (bot <= top) bot = -Infinity;
        }
        if (bot < bottom) hidden = true;
      }
      if (runStart >= 0 && bot !== runBot) {
        ctx.rect(runStart, top, x - runStart, runBot - top);
        runStart = -1;
      }
      if (bot > top && runStart < 0) {
        runStart = x;
        runBot = bot;
        shown++;
      }
    }
    return shown === 0 ? 0 : hidden ? 1 : 2;
  }

  /**
   * Top face of a short wall under the eye, seen from above: one flat fill per
   * column in the wall art's average colour, a shade darker than the face and
   * fogged at the far edge's distance. Caps are a pixel or two tall except up
   * close, so a texture blit there bought nothing and cost a draw call.
   */
  _drawWallCap(ctx, x, top, bot, menv, wallType, dist, real, glWalls = null) {
    const mmips = menv ? menv.walls[wallType] : null;
    const tex = mmips ? mmips[mmips.length - 1] : this.textures[wallType] || this.textures[1];
    const lut = this._capLUT(tex, menv, real);
    let s;
    if (menv) {
      s = 1 - Math.exp(-dist * menv.fogDensity);
    } else {
      s = dist / 20 / (this._visualStyle === 1 ? 0.85 : 0.6);
      if (s > 1) s = 1;
    }
    const color = lut[(s * CAP_FOG_STEPS + 0.5) | 0];
    if (glWalls) {
      glWalls.flat(x, top, bot, rgbaBytes(color));
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x, top, 1, bot - top);
    }
    // The Comic ink line along the far edge, batched with the frame's column
    // spans (_addSpan). Realistic's ambient is already in the cap colour.
    if (menv && !real) this._addSpan(x, top, 1);
  }

  /**
   * Fogged cap colours for one wall texture, CAP_FOG_STEPS + 1 of them from
   * clear to fully fogged, using the same fog colour and ceiling as the wall
   * pass of the active style. Built once per texture and fog setting.
   */
  _capLUT(tex, menv, real = false) {
    const key = menv ? menv : this._visualStyle;
    const slot = tex || _noTexture;
    let e = _capCache.get(slot);
    if (e && e.key === key && e.real === real) return e.lut;
    const avg = averageColor(tex);
    const lut = new Array(CAP_FOG_STEPS + 1);
    for (let i = 0; i <= CAP_FOG_STEPS; i++) {
      const t = i / CAP_FOG_STEPS;
      let fr, fg, fb, a;
      if (menv) {
        const n = menv.fogNear, f = menv.fogFar;
        fr = n[0] + (f[0] - n[0]) * t;
        fg = n[1] + (f[1] - n[1]) * t;
        fb = n[2] + (f[2] - n[2]) * t;
        a = t * menv.fogMax;
      } else {
        const brutal = this._visualStyle === 1;
        [fr, fg, fb] = brutal ? [8, 8, 20] : [10, 18, 32];
        a = t * (brutal ? 0.85 : 0.6);
      }
      const k = (1 - CAP_SHADE) * (1 - a);
      let r = avg[0] * k + fr * a;
      let g = avg[1] * k + fg * a;
      let b = avg[2] * k + fb * a;
      if (real) {
        // Realistic's ambient over the opaque cap colour.
        const ka = REAL_AMBIENT.alpha;
        const [ar, ag, ab] = REAL_AMBIENT.rgb;
        r = r * (1 - ka) + ar * ka;
        g = g * (1 - ka) + ag * ka;
        b = b * (1 - ka) + ab * ka;
      }
      lut[i] = `rgb(${r | 0},${g | 0},${b | 0})`;
    }
    _capCache.set(slot, { key, real, lut });
    return lut;
  }

  /**
   * Modern Canvas2D floor/ceiling (no-WebGL fallback). Same mip-filtered deck
   * art, contact AO and emissive spill as the shader, at half vertical
   * resolution like the legacy loop.
   *
   * A row `p` px from the horizon is floor `eye·h/p` away and ceiling
   * `(1 - eye)·h/p` away. Standing those match, so one pass fills each floor
   * row and the ceiling row mirrored across the horizon; from a lower eye they
   * differ, and the ceiling gets a pass of its own.
   */
  _renderFloorCeilingModern(camX, camY, dirX, dirY, planeX, planeY, yShift, env, eye = 0.5) {
    const w = this.width;
    const h = this.height;
    const halfH = (h >> 1) + Math.round(yShift);
    const projH = h >> 1;

    if (
      !this._floorCeilBuffer ||
      this._floorCeilBuffer.width !== w ||
      this._floorCeilBuffer.height !== h
    ) {
      this._floorCeilBuffer = this.ctx.createImageData(w, h);
      this._floorCeilBuf32 = new Uint32Array(this._floorCeilBuffer.data.buffer);
    }
    const buf32 = this._floorCeilBuf32;

    const [fn0, fn1, fn2] = env.fogNear;
    const [ff0, ff1, ff2] = env.fogFar;
    const fogMax = env.fogMax;

    // Horizon = the thickest air.
    const hr = (fn0 + (ff0 - fn0) * fogMax) | 0;
    const hg = (fn1 + (ff1 - fn1) * fogMax) | 0;
    const hb = (fn2 + (ff2 - fn2) * fogMax) | 0;
    buf32.fill((255 << 24) | (hb << 16) | (hg << 8) | hr);

    // The frame's constants for _deckRowModern, in one reused record.
    const R = this._deckRow || (this._deckRow = {});
    R.buf32 = buf32;
    R.w = w;
    R.h = h;
    R.projH = projH;
    R.camX = camX;
    R.camY = camY;
    R.rayDirX0 = dirX - planeX;
    R.rayDirY0 = dirY - planeY;
    R.rayDirX1 = dirX + planeX;
    R.rayDirY1 = dirY + planeY;
    R.planeLen = Math.hypot(planeX, planeY) * 2;
    R.env = env;
    R.cells = this._envMap.rgba;
    R.mw = this._envMap.w;
    R.mh = this._envMap.h;

    const mirrored = Math.abs(eye - 0.5) < 1e-4;
    const floorK = 2 * eye * projH;
    const ceilK = 2 * (1 - eye) * projH;
    const floorStart = Math.max(1, halfH + 1);
    const loopEnd = h % 2 === 0 ? h : h - 1;

    for (let y = floorStart; y < loopEnd; y += 2) {
      const p = y - halfH;
      if (p <= 0) continue;
      this._deckRowModern(R, floorK / p, y, mirrored ? 2 * halfH - 1 - y : -2);
    }
    if (!mirrored) {
      // The ceiling rows on their own: row pairs (halfH - 1 - p, halfH - p).
      let p = 1;
      if (halfH - p > h - 1) p = halfH - (h - 1);
      for (; halfH - p >= 0; p += 2) this._deckRowModern(R, ceilK / p, -1, halfH - 1 - p);
    }

    this.ctx.putImageData(this._floorCeilBuffer, 0, 0);
  }

  /**
   * One row pair of the Modern deck at `rowDist`: the floor rows (y - 1, y)
   * when `y` is not -1, and the ceiling rows (cy, cy + 1) when `cy` is not -2.
   * Rows off the screen are skipped.
   */
  _deckRowModern(R, rowDist, y, cy) {
    const { buf32, w, h, env, cells, mw, mh } = R;
    const fn = env.fogNear;
    const ff = env.fogFar;
    const fn0 = fn[0], fn1 = fn[1], fn2 = fn[2];
    const ff0 = ff[0], ff1 = ff[1], ff2 = ff[2];
    const fogMax = env.fogMax;
    const floorMips = env.deck.floorMips;
    const ceilMips = env.deck.ceilMips;
    const maxLvl = floorMips.length - 1;
    const glow = env.glowRGB;

    const stepX = (rowDist * (R.rayDirX1 - R.rayDirX0)) / w;
    const stepY = (rowDist * (R.rayDirY1 - R.rayDirY0)) / w;
    let fx = R.camX + rowDist * R.rayDirX0;
    let fy = R.camY + rowDist * R.rayDirY0;

    const fog = fogMax * (1 - Math.exp(-rowDist * env.fogDensity));
    const invFog = 1 - fog;
    const fR = (fn0 + (ff0 - fn0) * fog) * fog;
    const fG = (fn1 + (ff1 - fn1) * fog) * fog;
    const fB = (fn2 + (ff2 - fn2) * fog) * fog;

    // Pick the mip whose texels are about screen-pixel sized: kills the
    // shimmer the 256px nearest-sampled deck had at distance.
    const foot = Math.max((512 * rowDist * R.planeLen) / w, (512 * rowDist * rowDist) / R.projH);
    let lvl = 0;
    while (lvl < maxLvl && foot > (1 << lvl) * 1.3) lvl++;
    const floorTex = floorMips[lvl];
    const ceilTex = ceilMips[lvl];
    const size = 512 >> lvl;
    const mask = size - 1;

    const floorVisible = y >= 0 && y < h;
    const rowOff = y * w;
    const rowOff1 = (y - 1) * w;
    const cy2 = cy + 1;
    const ceilVisible = cy >= 0 && cy < h;
    const ceil2Visible = cy2 >= 0 && cy2 < h;
    if (!floorVisible && !ceilVisible && !ceil2Visible) return;

    for (let x = 0; x < w; x++) {
      const tx = ((fx * size) | 0) & mask;
      const ty = ((fy * size) | 0) & mask;
      const ti = (ty * size + tx) * 4;

      let ao = 1;
      let gr = 0, gg = 0, gb = 0;
      if (cells && fx >= 0 && fy >= 0) {
        const cxI = fx | 0;
        const cyI = fy | 0;
        if (cxI < mw && cyI < mh) {
          const o = (cyI * mw + cxI) * 4;
          const m = cells[o];
          const gbits = cells[o + 1];
          if (m !== 0) {
            const dx = fx - cxI;
            const dy = fy - cyI;
            if (m & 1) ao = Math.min(ao, aoAt(dx));
            if (m & 2) ao = Math.min(ao, aoAt(1 - dx));
            if (m & 4) ao = Math.min(ao, aoAt(dy));
            if (m & 8) ao = Math.min(ao, aoAt(1 - dy));
            if (m & 240) {
              if (m & 16) ao = Math.min(ao, aoAt(Math.sqrt(dx * dx + dy * dy)));
              if (m & 32) ao = Math.min(ao, aoAt(Math.sqrt((1 - dx) * (1 - dx) + dy * dy)));
              if (m & 64) ao = Math.min(ao, aoAt(Math.sqrt(dx * dx + (1 - dy) * (1 - dy))));
              if (m & 128) ao = Math.min(ao, aoAt(Math.sqrt((1 - dx) * (1 - dx) + (1 - dy) * (1 - dy))));
            }
          }
          if (gbits !== 0) {
            const dx = fx - cxI;
            const dy = fy - cyI;
            let g = 0;
            if (gbits & 1) g = Math.max(g, glowAt(dx));
            if (gbits & 2) g = Math.max(g, glowAt(1 - dx));
            if (gbits & 4) g = Math.max(g, glowAt(dy));
            if (gbits & 8) g = Math.max(g, glowAt(1 - dy));
            const c = glow[cells[o + 2]];
            if (c) {
              gr = c[0] * g;
              gg = c[1] * g;
              gb = c[2] * g;
            }
          }
        }
      }

      if (floorVisible) {
        let fr = ((floorTex[ti] * ao + gr) * invFog + fR) | 0;
        let fg = ((floorTex[ti + 1] * ao + gg) * invFog + fG) | 0;
        let fb = ((floorTex[ti + 2] * ao + gb) * invFog + fB) | 0;
        if (fr > 255) fr = 255;
        if (fg > 255) fg = 255;
        if (fb > 255) fb = 255;
        const packed = (255 << 24) | (fb << 16) | (fg << 8) | fr;
        buf32[rowOff + x] = packed;
        if (y - 1 >= 0) buf32[rowOff1 + x] = packed;
      }

      if (ceilVisible || ceil2Visible) {
        let cr = ((ceilTex[ti] * ao + gr * 0.45) * invFog + fR) | 0;
        let cg = ((ceilTex[ti + 1] * ao + gg * 0.45) * invFog + fG) | 0;
        let cb = ((ceilTex[ti + 2] * ao + gb * 0.45) * invFog + fB) | 0;
        if (cr > 255) cr = 255;
        if (cg > 255) cg = 255;
        if (cb > 255) cb = 255;
        const cPacked = (255 << 24) | (cb << 16) | (cg << 8) | cr;
        if (ceilVisible) buf32[cy * w + x] = cPacked;
        if (ceil2Visible) buf32[cy2 * w + x] = cPacked;
      }

      fx += stepX;
      fy += stepY;
    }
  }

  /**
   * Modern silhouette pass: one ink line per column run where the wall plane
   * changes (block corners and occlusion edges) plus the batched top/bottom
   * contact lines recorded during the wall loop. Only a few dozen fills.
   */
  _drawModernInk(w, h) {
    const ctx = this.ctx;
    const key = this._colKey;
    const top = this._colTop;
    const bot = this._colBot;
    // Depth of the nearest surface per column (the one the key describes).
    const zb = this._colZ;
    this._fillSpans(ctx, "rgba(4,6,11,0.9)"); // top/bottom contact lines recorded in the loop
    for (let x = 1; x < w; x++) {
      const k = key[x];
      const kp = key[x - 1];
      if (k === kp || k < 0 || kp < 0) continue;
      const z0 = zb[x - 1];
      const z1 = zb[x];
      const nearX = z1 < z0 ? x : x - 1;
      const nearZ = z1 < z0 ? z1 : z0;
      const lh = h / nearZ;
      const lw = lh > 900 ? 3 : lh > 260 ? 2 : 1;
      let t, b;
      if (Math.abs(z1 - z0) < 0.05 * nearZ + 0.02) {
        t = Math.min(top[x], top[x - 1]);
        b = Math.max(bot[x], bot[x - 1]);
      } else {
        t = top[nearX];
        b = bot[nearX];
      }
      if (b <= t) continue;
      ctx.fillRect(nearX === x ? x : x - lw + 1, t, lw, b - t);
    }
  }

  _regenerateFloorCeil() {
    const { floorPixels, ceilPixels } = generateFloorCeilTextures(this._actPalette, this._visualStyle);
    this._floorTexPixels = floorPixels;
    this._ceilTexPixels = ceilPixels;
  }

  /**
   * Legacy Canvas2D floor/ceiling. Like the Modern loop, a lower eye puts the
   * floor and ceiling rows at different distances, so the ceiling gets its
   * own pass instead of mirroring the floor.
   */
  _renderFloorCeiling(camX, camY, dirX, dirY, planeX, planeY, yShift = 0, eye = 0.5) {
    const w = this.width;
    const h = this.height;
    const halfH = (h >> 1) + Math.round(yShift);

    // Projection height for distance calc (unshifted for correct perspective)
    const projH = h >> 1;

    if (
      !this._floorCeilBuffer ||
      this._floorCeilBuffer.width !== w ||
      this._floorCeilBuffer.height !== h
    ) {
      this._floorCeilBuffer = this.ctx.createImageData(w, h);
      this._floorCeilBuf32 = new Uint32Array(this._floorCeilBuffer.data.buffer);
    }
    const buf = this._floorCeilBuffer.data;
    // Uint32Array view for single 32-bit pixel writes (4× fewer stores)
    const buf32 = this._floorCeilBuf32;
    const floorTex = this._floorTexPixels;
    const ceilTex = this._ceilTexPixels;

    const rayDirX0 = dirX - planeX;
    const rayDirY0 = dirY - planeY;
    const rayDirX1 = dirX + planeX;
    const rayDirY1 = dirY + planeY;

    // Act-tinted fog: Act1=teal, Act2=amber, Act3=crimson, Act4=white-hot violet
    const act = this._actPalette || 1;
    const actFog = act === 2
      ? { r: 20, g: 10, b: 4 }
      : act === 3
        ? { r: 22, g: 4, b: 8 }
        : act === 4
          ? { r: 30, g: 22, b: 32 }
          : { r: 8, g: 18, b: 30 }; // Act 1 default teal
    const brutal = this._visualStyle === 1;
    const fogR = brutal ? actFog.r : actFog.r + 4;
    const fogG = brutal ? actFog.g : actFog.g + 4;
    const fogB = brutal ? actFog.b : actFog.b + 8;
    const fogMaxOpacity = brutal ? 0.92 : 0.7;

    // Pre-pack fog as 32-bit ABGR (little-endian) for fast fill
    const fogPacked = (255 << 24) | (fogB << 16) | (fogG << 8) | fogR;
    // Fill entire buffer with fog (single 32-bit writes)
    buf32.fill(fogPacked);

    const R = this._legacyRow || (this._legacyRow = {});
    R.buf32 = buf32;
    R.w = w;
    R.h = h;
    R.camX = camX;
    R.camY = camY;
    R.rayDirX0 = rayDirX0;
    R.rayDirY0 = rayDirY0;
    R.rayDirX1 = rayDirX1;
    R.rayDirY1 = rayDirY1;
    R.floorTex = floorTex;
    R.ceilTex = ceilTex;
    R.fogR = fogR;
    R.fogG = fogG;
    R.fogB = fogB;
    R.fogMaxOpacity = fogMaxOpacity;

    const mirrored = Math.abs(eye - 0.5) < 1e-4;
    const floorK = 2 * eye * projH;
    const ceilK = 2 * (1 - eye) * projH;
    const floorStart = Math.max(1, halfH + 1);
    const loopEnd = h % 2 === 0 ? h : h - 1;

    for (let y = floorStart; y < loopEnd; y += 2) {
      const p = y - halfH;
      if (p <= 0) continue;
      this._deckRowLegacy(R, floorK / p, y, mirrored ? 2 * halfH - 1 - y : -2);
    }
    if (!mirrored) {
      let p = 1;
      if (halfH - p > h - 1) p = halfH - (h - 1);
      for (; halfH - p >= 0; p += 2) this._deckRowLegacy(R, ceilK / p, -1, halfH - 1 - p);
    }

    // Horizon line (at shifted position, if visible)
    if (halfH >= 0 && halfH < h) {
      const hi = halfH * w;
      for (let x = 0; x < w; x++) buf32[hi + x] = fogPacked;
    }

    this.ctx.putImageData(this._floorCeilBuffer, 0, 0);
  }

  /**
   * One row pair of the Legacy deck at `rowDist`: floor rows (y - 1, y) unless
   * `y` is -1, ceiling rows (cy, cy + 1) unless `cy` is -2.
   */
  _deckRowLegacy(R, rowDist, y, cy) {
    const { buf32, w, h, floorTex, ceilTex } = R;
    const stepX = (rowDist * (R.rayDirX1 - R.rayDirX0)) / w;
    const stepY = (rowDist * (R.rayDirY1 - R.rayDirY0)) / w;
    let fx = R.camX + rowDist * R.rayDirX0;
    let fy = R.camY + rowDist * R.rayDirY0;

    const fog = Math.min(R.fogMaxOpacity, rowDist / 12);
    const invFog = 1 - fog;
    const fR = R.fogR * fog,
      fG = R.fogG * fog,
      fB = R.fogB * fog;

    const floorVisible = y >= 0 && y < h;
    const rowOff = y * w;
    const rowOff1 = (y - 1) * w;
    const cy2 = cy + 1;
    const ceilVisible = cy >= 0 && cy < h;
    const ceil2Visible = cy2 >= 0 && cy2 < h;
    if (!floorVisible && !ceilVisible && !ceil2Visible) return;

    for (let x = 0; x < w; x++) {
      const tx = ((fx * 256) | 0) & 255;
      const ty = ((fy * 256) | 0) & 255;
      const ti = (ty * 256 + tx) * 4;

      // Floor pixel — single 32-bit write
      if (floorVisible) {
        const fr = (floorTex[ti] * invFog + fR) | 0;
        const fg = (floorTex[ti + 1] * invFog + fG) | 0;
        const fb = (floorTex[ti + 2] * invFog + fB) | 0;
        const packed = (255 << 24) | (fb << 16) | (fg << 8) | fr;
        buf32[rowOff + x] = packed;
        // Copy to skipped row
        if (y - 1 >= 0) buf32[rowOff1 + x] = packed;
      }

      if (ceilVisible || ceil2Visible) {
        const cr = (ceilTex[ti] * invFog + fR) | 0;
        const cg = (ceilTex[ti + 1] * invFog + fG) | 0;
        const cb = (ceilTex[ti + 2] * invFog + fB) | 0;
        const cPacked = (255 << 24) | (cb << 16) | (cg << 8) | cr;
        if (ceilVisible) buf32[cy * w + x] = cPacked;
        if (ceil2Visible) buf32[cy2 * w + x] = cPacked;
      }

      fx += stepX;
      fy += stepY;
    }
  }

  renderScene(
    player,
    map,
    entities,
    time,
    fov = 70,
    viewMode = 0,
    skipFloorCeil = false,
    yShift = 0,
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear z-buffer
    this.zBuffer.fill(Infinity);

    // Crouching and sliding draw the whole frame from a lower eye: walls,
    // floor, ceiling and sprites all project from it. The horizon row stays
    // where the view looks; what moves is where the floor and ceiling meet it.
    const eye = Math.min(0.9, Math.max(0.1, playerEyeZ(player)));
    this._eyeZ = eye;
    this._eyeDrop = EYE_Z - eye;

    // Modern art style environment. Gated off for Legacy and for the low
    // presets that already drop floor textures — those keep the old look.
    const menv = !skipFloorCeil && isModernArt() ? this._getModernEnv() : null;
    if (menv && map) this._ensureMapWalls(menv, map, player);
    // Realistic reuses the Modern wall art and swaps the lighting: no ink
    // lines, darker ambient, contact shadows, inverse-square lights.
    const real = !!menv && isRealisticArt();
    const ambientKeep = real ? 1 - REAL_AMBIENT.alpha : 1;
    if (menv) {
      this._ensureColBufs(w);
      this._colKey.fill(-1);
      if (this._envMap.sync(map)) this._envMapGLVersion = -1;
    }

    // Convert FOV degrees to camera plane multiplier
    const planeMul = Math.tan((fov * 0.5 * Math.PI) / 180);

    // Camera position (offset behind player in third-person)
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    let camX = player.x;
    let camY = player.y;

    if (viewMode === 1) {
      // Over the right shoulder: back and to the side, so the cadet stands
      // left of the reticle instead of over it. Pulled in toward them, a
      // step at a time, if that would be inside a wall.
      const back = TP_CAM_BACK;
      const side = TP_CAM_SIDE;
      const wantX = player.x - dirX * back - dirY * side;
      const wantY = player.y - dirY * back + dirX * side;
      camX = player.x;
      camY = player.y;
      for (let k = 8; k >= 0; k--) {
        const tryX = player.x + ((wantX - player.x) * k) / 8;
        const tryY = player.y + ((wantY - player.y) * k) / 8;
        const mx = Math.floor(tryX);
        const my = Math.floor(tryY);
        if (mx >= 0 && my >= 0 && mx < map.width && my < map.height && map.grid[my][mx] === 0) {
          camX = tryX;
          camY = tryY;
          break;
        }
      }
    }
    // Where the cadet stands in the third-person view, projected like any
    // sprite (renderSprites): depth and screen x (game.drawThirdPersonModel).
    if (viewMode === 1) {
      const relX = player.x - camX;
      const relY = player.y - camY;
      const pX = -dirY * planeMul;
      const pY = dirX * planeMul;
      const invDet = 1 / (pX * dirY - dirX * pY);
      const tx = invDet * (dirY * relX - dirX * relY);
      this.thirdPersonDist = Math.max(0.6, invDet * (-pY * relX + pX * relY));
      this.thirdPersonX = (w / 2) * (1 + tx / this.thirdPersonDist);
    } else this.thirdPersonDist = 0;

    // Draw textured floor and ceiling (with yShift for pitch support)
    let glWalls = null;
    if (menv) {
      let drawn = false;
      if (this.useWebGL && this.glRenderer) {
        if (this._envMapGLVersion !== this._envMap.version) {
          this.glRenderer.uploadEnvMap(this._envMap.rgba, this._envMap.w, this._envMap.h);
          this._envMapGLVersion = this._envMap.version;
        }
        drawn = this.glRenderer.renderFloorCeilingModern(
          camX, camY, dirX, dirY,
          -dirY * planeMul, dirX * planeMul,
          Math.round(yShift),
          menv,
          this.lights || [],
          eye,
        );
        if (drawn) {
          // Walls join the floor in the GL canvas when they can (see
          // WallPass); the canvas is copied over once they are drawn.
          const wp = this.gpuWalls ? this.glRenderer.wallPass() : null;
          if (wp && wp.useEnv(menv)) {
            glWalls = wp;
            // Realistic lights the walls per pixel in the pass (see
            // WallPass wallLight); Comic keeps its flat per-column light.
            wp.useNormals = this.gpuWallNormals;
            wp.begin(
              this.lights,
              real && this.gpuWallLights ? WALL_LIGHT_GAIN * ambientKeep : 0,
              camX, camY,
              WALL_SPEC_GAIN * ambientKeep,
            );
            wp.camZ = eye;
          } else {
            this.glRenderer.blitTo(ctx);
          }
        }
      }
      if (!drawn) {
        this._renderFloorCeilingModern(
          camX, camY, dirX, dirY,
          -dirY * planeMul, dirX * planeMul,
          yShift,
          menv,
          eye,
        );
      }
    } else if (!skipFloorCeil) {
      if (this.useWebGL && this.glRenderer) {
        // GPU-accelerated floor/ceiling with dynamic lighting
        const act = this._actPalette || 1;
        const brutal = this._visualStyle === 1;
        const actFog = act === 2
          ? [24 / 255, 14 / 255, 12 / 255]
          : act === 3
            ? [26 / 255, 8 / 255, 16 / 255]
            : act === 4
              ? [36 / 255, 28 / 255, 38 / 255]
              : [12 / 255, 22 / 255, 38 / 255];
        const fogMax = brutal ? 0.92 : 0.7;
        this.glRenderer.renderFloorCeiling(
          camX, camY, dirX, dirY,
          -dirY * planeMul, dirX * planeMul,
          Math.round(yShift),
          actFog, fogMax,
          this.lights || [],
          eye,
        );
        // Composite WebGL result onto Canvas2D
        this.glRenderer.blitTo(ctx);
      } else {
        this._renderFloorCeiling(
          camX,
          camY,
          dirX,
          dirY,
          -dirY * planeMul,
          dirX * planeMul,
          yShift,
          eye,
        );
      }
    } else {
      // Gradient fallback for builder mode (uses yShift for vertical offset)
      const centerY = (h >> 1) + yShift;
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, centerY);
      ceilGrad.addColorStop(0, "#0a0a1a");
      ceilGrad.addColorStop(1, "#1a1a2e");
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, w, centerY);
      const floorGrad = ctx.createLinearGradient(0, centerY, 0, h);
      floorGrad.addColorStop(0, "#1a1a2e");
      floorGrad.addColorStop(1, "#0d0d1a");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, centerY, w, h - centerY);
    }

    // Raycasting. Each column marches through any short walls (low cover) to
    // the full-height wall behind them and draws them front to back: every
    // wall shows only above the lowest short-wall silhouette in front of it.
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;
    const horizon = h / 2 + yShift;
    const hits = this._colHits;
    this._ensureCoverBufs(w);
    const occN = this._occN;
    const occDist = this._occDist;
    const occY = this._occY;

    this._spanN = 0;

    for (let x = 0; x < w; x++) {
      const cameraX = (2 * x) / w - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      castColumn(map, camX, camY, rayDirX, rayDirY, h, horizon, hits, eye);
      const stepX = hits.stepX;
      const stepY = hits.stepY;
      const nHits = hits.n;
      // Rows from `openBot` down are already covered by nearer short walls.
      let openBot = h;
      let nOcc = 0;
      let closeDist = hits.dist[nHits - 1];
      const occBase = x * COVER_STRIDE;

      for (let hi = 0; hi < nHits; hi++) {
        const mapX = hits.mapX[hi];
        const mapY = hits.mapY[hi];
        const side = hits.side[hi];
        const wallType = hits.type[hi];
        const perpWallDist = hits.dist[hi];
        // Variable height: 5 layers = full wall, 1 layer = 20% (from the floor up).
        const heightFrac = hits.frac[hi];

        // A full wall runs from `1 - eye` of its height above the horizon to
        // `eye` of it below: halfway each way standing, mostly above crouched.
        const lineHeight = (h / perpWallDist) | 0;
        const fullDrawStart = (horizon - lineHeight * (1 - eye)) | 0;
        const fullDrawEnd = (horizon + lineHeight * eye) | 0;

        const faceTop = heightFrac < 1
          ? (fullDrawEnd - (fullDrawEnd - fullDrawStart) * heightFrac) | 0
          : fullDrawStart;
        let drawStart = faceTop;
        let drawEnd = fullDrawEnd;
        // A nearer short wall hides the lower part of this one.
        const clipped = openBot < h && drawEnd > openBot;
        if (clipped) drawEnd = openBot;

        if (drawStart < 0) drawStart = 0;
        if (drawEnd >= h) drawEnd = h - 1;

        if (drawEnd > drawStart) {
          // Texture coordinate
          let wallX;
          if (side === 0) {
            wallX = camY + perpWallDist * rayDirY;
          } else {
            wallX = camX + perpWallDist * rayDirX;
          }
          wallX -= Math.floor(wallX);

          const mmips = menv ? menv.walls[wallType] : null;
          if (mmips) {
            // Mip level ≈ one texel per screen pixel, so distant walls sample
            // pre-filtered art instead of aliasing across the 512px face.
            const lvl =
              lineHeight >= 384 ? 0 :
                lineHeight >= 192 ? 1 :
                  lineHeight >= 96 ? 2 :
                    lineHeight >= 48 ? 3 :
                      lineHeight >= 24 ? 4 : 5;
            const mtex = mmips[lvl];
            const S = mtex.width;
            let texX = (wallX * S) | 0;
            if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
              texX = S - 1 - texX;
            }
            const mstep = S / lineHeight;
            const srcY = (drawStart - fullDrawStart) * mstep;
            const colH = drawEnd - drawStart;
            const srcH = Math.min(S - srcY, colH * mstep);

            // Directional key light: faces turned away from it fall toward ink.
            const face = side === 0 ? (stepX > 0 ? 0 : 1) : (stepY > 0 ? 2 : 3);
            // Realistic's soft contact shadow at the deck and ceiling joints is
            // painted into the wall mips (bakeContactShadow in textures.js).

            // Act fog with atmospheric perspective (colour and density from the
            // same ramp the deck shader uses, so wall and floor air agree).
            const fogK = menv.fogMax * (1 - Math.exp(-perpWallDist * menv.fogDensity));
            const fogAmount = fogK;
            const fi = ((fogK / menv.fogMax) * 64 + 0.5) | 0;
            // Realistic's low ambient rides on this fill (fogAmbientLUT), so
            // it needs no fill of its own; everything drawn on the wall after
            // it is scaled by ambientKeep, as the separate fill used to do.
            const fogCss = real ? menv.fogAmbientLUT[fi] : fi > 0 ? menv.fogLUT[fi] : null;

            // Dynamic lights, with a hot rim where they catch an exposed corner.
            let lightA = 0;
            let lr = 0, lg = 0, lb = 0;
            if (this.lights && this.lights.length > 0 && !(glWalls && glWalls.lightGain > 0)) {
              const hitWX = camX + perpWallDist * rayDirX;
              const hitWY = camY + perpWallDist * rayDirY;
              for (let li = 0; li < this.lights.length; li++) {
                const L = this.lights[li];
                const ldx = L.x - hitWX;
                const ldy = L.y - hitWY;
                const d2 = ldx * ldx + ldy * ldy;
                const r2 = L.radius * L.radius;
                if (d2 >= r2) continue;
                let k;
                if (real) {
                  // Inverse-square, windowed to the authored radius: hot near the
                  // source, long soft tail, still zero at the edge.
                  const q = d2 / r2;
                  const win = 1 - q * q;
                  k = (win * win * L.intensity * 1.35) / (1 + (6 * d2) / r2);
                } else {
                  const fall = 1 - Math.sqrt(d2) / L.radius;
                  k = fall * fall * L.intensity;
                }
                lr += L.color[0] * k;
                lg += L.color[1] * k;
                lb += L.color[2] * k;
              }
              if (lr + lg + lb > 1) {
                if (wallX < 0.07 || wallX > 0.93) {
                  // Only a real block corner gets the rim; a continuous wall
                  // plane shouldn't light up every cell seam.
                  const nx = side === 0 ? mapX : mapX + (wallX < 0.07 ? -1 : 1);
                  const ny = side === 0 ? mapY + (wallX < 0.07 ? -1 : 1) : mapY;
                  const open =
                    nx >= 0 && ny >= 0 && nx < map.width && ny < map.height &&
                    map.grid[ny][nx] === 0;
                  if (open) {
                    lr *= 2.4;
                    lg *= 2.4;
                    lb *= 2.4;
                  }
                }
                const peak = Math.max(lr, lg, lb);
                lightA = Math.min(0.9, peak / 255) * ambientKeep;
                lr = Math.min(255, lr | 0);
                lg = Math.min(255, lg | 0);
                lb = Math.min(255, lb | 0);
              }
            }

            // Door-frame spill onto the walls flanking a door tile.
            let accentA = 0;
            if (wallType !== 5 && perpWallDist < 15 && (wallX < 0.1 || wallX > 0.9)) {
              const low = wallX < 0.1;
              const nx = side === 0 ? mapX : mapX + (low ? -1 : 1);
              const ny = side === 0 ? mapY + (low ? -1 : 1) : mapY;
              if (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height && map.grid[ny][nx] === 5) {
                accentA = Math.max(0, (1 - fogAmount) * 0.3) * ambientKeep;
              }
            }

            if (glWalls) {
              const lt = this._glLight;
              lt[0] = lr; lt[1] = lg; lt[2] = lb; lt[3] = Math.round(lightA * 255);
              const ac = menv.accentRGB;
              const at = this._glAccent;
              at[0] = ac[0]; at[1] = ac[1]; at[2] = ac[2]; at[3] = Math.round(accentA * 255);
              // Trilinear: a continuous u and a fractional mip (one texel a
              // pixel) blend the levels, instead of the Canvas2D path's hard
              // step at each half-octave of wall height.
              const tri = this.gpuWallTrilinear;
              const flip = (side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0);
              const u = tri ? (flip ? 1 - wallX : wallX) : (texX + 0.5) / S;
              const lod = srcH <= 0 ? -1 : tri ? Math.min(5, Math.max(0, Math.log2(WALL_TEX / lineHeight))) : lvl;
              glWalls.wall(
                x, drawStart, drawEnd, wallType, lod, u, srcY / S, (srcY + srcH) / S,
                face !== 0 ? rgbaBytes(menv.faceShade[face]) : NO_RGBA,
                fogCss ? rgbaBytes(fogCss) : NO_RGBA,
                lt, at,
                camX + perpWallDist * rayDirX, camY + perpWallDist * rayDirY,
                side === 0 ? -stepX : 0, side === 1 ? -stepY : 0,
              );
            } else {
              if (srcH > 0) {
                ctx.drawImage(mtex, texX, srcY, 1, srcH, x, drawStart, 1, colH);
              }
              if (face !== 0) {
                ctx.fillStyle = menv.faceShade[face];
                ctx.fillRect(x, drawStart, 1, colH);
              }
              if (fogCss) {
                ctx.fillStyle = fogCss;
                ctx.fillRect(x, drawStart, 1, colH);
              }
              if (lightA > 0) {
                const prev = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = _getFogString(lr, lg, lb, lightA);
                ctx.fillRect(x, drawStart, 1, colH);
                ctx.globalCompositeOperation = prev;
              }
              if (accentA > 0) {
                const ac = menv.accentRGB;
                const prev = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = _getFogString(ac[0], ac[1], ac[2], accentA);
                ctx.fillRect(x, drawStart, 1, colH);
                ctx.globalCompositeOperation = prev;
              }
            }

            // Inked contact lines at the ceiling and deck joints, batched as column
            // spans that the silhouette pass fills after the loop.
            const inkT = lineHeight > 900 ? 3 : lineHeight > 300 ? 2 : 1;
            if (!real && colH > inkT * 2) {
              if (drawStart > 0) this._addSpan(x, drawStart, inkT);
              if (drawEnd < h - 1 && !clipped) this._addSpan(x, drawEnd - inkT, inkT);
            }
            if (hi === 0) {
              // The silhouette pass outlines the nearest surface in each column.
              this._colKey[x] = side === 0 ? mapX << 1 : (mapY << 1) | 1;
              this._colTop[x] = drawStart;
              this._colBot[x] = drawEnd;
              this._colZ[x] = perpWallDist;
            }
          } else if (this.textures[wallType]) {
            const tex = this.textures[wallType];
            let texX = (wallX * 256) | 0;
            if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
              texX = 255 - texX;
            }

            // Draw textured wall strip
            const texHeight = 256;
            const step = texHeight / lineHeight;
            let texPos = (drawStart - fullDrawStart) * step;

            // Use drawImage for textured columns
            const srcY = Math.max(0, texPos);
            const srcH = Math.min(256, (drawEnd - drawStart) * step);
            if (srcH > 0 && drawEnd > drawStart) {
              ctx.drawImage(
                tex,
                texX,
                srcY,
                1,
                srcH,
                x,
                drawStart,
                1,
                drawEnd - drawStart,
              );
            }

            // Darken side walls for depth
            if (side === 1) {
              ctx.fillStyle = "rgba(0,0,0,0.3)";
              ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
            }

            // Distance fog (cached rgba strings to avoid per-column string creation)
            const wallFogMax = this._visualStyle === 1 ? 0.85 : 0.6;
            const fogAmount = Math.min(wallFogMax, perpWallDist / 20);
            if (fogAmount > 0) {
              const [wfR, wfG, wfB] =
                this._visualStyle === 1 ? [8, 8, 20] : [10, 18, 32];
              ctx.fillStyle = _getFogString(wfR, wfG, wfB, fogAmount);
              ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
            }

            // Dynamic lights — additive radial bleed at the wall hit point.
            // Each active light is sampled by squared distance for cheap falloff.
            // Skipped entirely when no lights are present (zero overhead common case).
            if (this.lights && this.lights.length > 0) {
              const hitWX = camX + perpWallDist * rayDirX;
              const hitWY = camY + perpWallDist * rayDirY;
              let lr = 0, lg = 0, lb = 0;
              for (let li = 0; li < this.lights.length; li++) {
                const L = this.lights[li];
                const ldx = L.x - hitWX;
                const ldy = L.y - hitWY;
                const d2 = ldx * ldx + ldy * ldy;
                const r2 = L.radius * L.radius;
                if (d2 >= r2) continue;
                // Quadratic falloff (1 - d/r)^2 reads better than linear.
                const fall = 1 - Math.sqrt(d2) / L.radius;
                const k = fall * fall * L.intensity;
                lr += L.color[0] * k;
                lg += L.color[1] * k;
                lb += L.color[2] * k;
              }
              if (lr + lg + lb > 1) {
                // Cap alpha so big stacks don't blow out the column.
                const peak = Math.max(lr, lg, lb);
                const a = Math.min(0.85, peak / 255);
                const nr = Math.min(255, lr | 0);
                const ng = Math.min(255, lg | 0);
                const nb = Math.min(255, lb | 0);
                const prev = ctx.globalCompositeOperation;
                ctx.globalCompositeOperation = "lighter";
                ctx.fillStyle = _getFogString(nr, ng, nb, a);
                ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
                ctx.globalCompositeOperation = prev;
              }
            }

            // Door frame overlay — teal accent on walls adjacent to door tiles
            if (wallType !== 5 && wallType > 0 && perpWallDist < 15) {
              let hasDoorNeighbor = false;
              if (side === 0) {
                // Vertical face — check tiles above/below for doors
                if ((wallX < 0.12 && mapY > 0 && map.grid[mapY - 1][mapX] === 5) ||
                    (wallX > 0.88 && mapY < map.height - 1 && map.grid[mapY + 1][mapX] === 5)) {
                  hasDoorNeighbor = true;
                }
              } else {
                // Horizontal face — check tiles left/right for doors
                if ((wallX < 0.12 && mapX > 0 && map.grid[mapY][mapX - 1] === 5) ||
                    (wallX > 0.88 && mapX < map.width - 1 && map.grid[mapY][mapX + 1] === 5)) {
                  hasDoorNeighbor = true;
                }
              }
              if (hasDoorNeighbor) {
                const frameAlpha = Math.max(0, (1 - fogAmount) * 0.5);
                ctx.fillStyle = _getFogString(0, 180, 120, frameAlpha);
                ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
              }
            }
          }
        }

        if (heightFrac >= 1) break;

        // Short wall under the eye: its top face shows, out to where the ray
        // leaves the cell. That far edge is the silhouette behind it.
        let top = faceTop;
        if (heightFrac < eye) {
          let capTop = (horizon + ((eye - heightFrac) * h) / hits.exit[hi]) | 0;
          if (capTop < 0) capTop = 0;
          const capBot = faceTop < openBot ? faceTop : openBot;
          if (capBot > capTop) {
            this._drawWallCap(ctx, x, capTop, capBot, menv, wallType, hits.exit[hi], real, glWalls);
          }
          top = capTop;
        }
        if (top < openBot) openBot = top > 0 ? top : 0;
        // Sprites compare in unshifted screen space (they are translated by
        // yShift afterwards), so store the silhouette that way.
        occDist[occBase + nOcc] = perpWallDist;
        occY[occBase + nOcc] = openBot - yShift;
        nOcc++;
        if (openBot <= 0) {
          closeDist = perpWallDist;
          break;
        }
      }
      occN[x] = nOcc;
      // Depth of whatever closes the column: the full wall, or a short wall
      // that covers it top to bottom.
      this.zBuffer[x] = closeDist;
    }

    if (glWalls) {
      glWalls.draw(w, h);
      this.glRenderer.blitTo(ctx);
    }
    if (menv && !real) this._drawModernInk(w, h);

    // Set FOV scale for prop minimum-size floors
    setFovScale(fov);

    // Sprites project around h/2; shift them with the walls and floor so props
    // and enemies stay planted on the ground while crouching or sliding.
    const spriteShift = yShift | 0;
    if (spriteShift) {
      ctx.save();
      ctx.translate(0, spriteShift);
    }

    // Render sprites
    this.renderSprites(player, entities, time, planeMul, camX, camY, player._drawDistance);

    // Render particles
    if (player.particles) {
      this.renderParticles(player, player.particles, time, planeMul, camX, camY);
    }

    if (spriteShift) ctx.restore();
  }

  renderParticles(player, particles, time, planeMul = 0.66, camX, camY, yShift = 0) {
    if (!particles || particles.length === 0) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;
    const cx = camX != null ? camX : player.x;
    const cy = camY != null ? camY : player.y;
    // Share the scene's vertical shift, or motes hang in the air while the
    // world drops under a crouch.
    const halfH = h / 2 + yShift;
    const real = isRealisticArt();
    if (real) setFxCamera(dirX, dirY, planeX, planeY, cx, cy, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const spriteX = p.x - cx;
      const spriteY = p.y - cy;

      const invDet = 1.0 / (planeX * dirY - dirX * planeY);
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

      if (transformY <= 0.1) continue;

      const screenX = ((w / 2) * (1 + transformX / transformY)) | 0;

      // Basic occlusion check
      if (
        screenX < 0 ||
        screenX >= w ||
        transformY > this.zBuffer[screenX] + 0.1
      )
        continue;

      const size = Math.abs((h / transformY) * (p.size || 0.05)) | 0;
      // p.z is height offset (0 = floor level, negative = up)
      const screenY = (halfH + ((p.z || 0) - this._eyeDrop) * (h / transformY)) | 0;
      // Low cover in front hides motes below its top edge.
      if (screenY - yShift >= this.coverClipY(screenX, transformY)) continue;
      if (real && drawRealisticParticle(ctx, p, screenX, screenY, size, transformY)) continue;

      const r = p.r ?? 255;
      const g = p.g ?? 255;
      const b = p.b ?? 255;
      const a = p.life ?? 1;

      ctx.fillStyle = _getFogString(r, g, b, a);
      ctx.fillRect(
        (screenX - size / 2) | 0,
        (screenY - size / 2) | 0,
        Math.max(1, size),
        Math.max(1, size),
      );
    }
  }

  /** Project a world position into screen space using the same camera math as
   * sprite/particle passes. Returns null if behind the near plane. */
  _projectWorld(player, x, y, planeMul, camX, camY, zHeight = 0, yShift = 0) {
    const w = this.width;
    const h = this.height;
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;
    const cx = camX != null ? camX : player.x;
    const cy = camY != null ? camY : player.y;
    const sx = x - cx;
    const sy = y - cy;
    const invDet = 1.0 / (planeX * dirY - dirX * planeY);
    const tx = invDet * (dirY * sx - dirX * sy);
    const ty = invDet * (-planeY * sx + planeX * sy);
    if (ty <= 0.1) return null;
    const screenX = (w / 2) * (1 + tx / ty);
    const screenY = h / 2 + yShift + (zHeight - this._eyeDrop) * (h / ty);
    // baseY: the same point without the scene's vertical shift, the space the
    // low-cover records (coverClipY) are kept in.
    return { x: screenX, y: screenY, baseY: screenY - yShift, depth: ty };
  }

  /** Hitscan tracers — short fading streaks from barrel to impact. */
  renderTracers(player, tracers, planeMul = 0.66, camX, camY, yShift = 0) {
    if (!tracers || tracers.length === 0) return;
    const ctx = this.ctx;
    const w = this.width;
    for (const tr of tracers) {
      const t = Math.max(0, tr.life / tr.maxLife);
      if (t <= 0) continue;
      // Slight elevation so tracer reads as gun-height, not floor-height
      const startZ = -0.05;
      const endZ = -0.05 + Math.tan(tr.pitch || 0) * 0.0; // pitched aim already encoded in (x2,y2)
      const a = this._projectWorld(player, tr.x1, tr.y1, planeMul, camX, camY, startZ, yShift);
      const b = this._projectWorld(player, tr.x2, tr.y2, planeMul, camX, camY, endZ, yShift);
      if (!a || !b) continue;
      // Z-buffer occlusion at endpoint (if hidden behind wall, skip)
      const xb = Math.max(0, Math.min(w - 1, Math.floor(b.x)));
      if (this.pointHidden(xb, b.depth, b.baseY)) continue;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      // Outer glow
      ctx.globalAlpha = 0.35 * t;
      ctx.strokeStyle = `rgba(${tr.color},1)`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // Hot core
      ctx.globalAlpha = t;
      ctx.strokeStyle = `rgba(255,255,240,1)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- Entity Rendering ---
  renderSprites(player, entities, time, planeMul = 0.66, camX, camY, drawDistance) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * planeMul;
    const planeY = dirX * planeMul;

    // Use camera position for sprite rendering (defaults to player pos)
    const cx = camX != null ? camX : player.x;
    const cy = camY != null ? camY : player.y;
    // Camera right vector, so side-on enemy sprites can face their heading.
    this._camRightX = -dirY;
    this._camRightY = dirX;
    // …and where it stands, so a shield bearer is drawn from the side you see.
    this._camX = cx;
    this._camY = cy;
    this._facingCam.rx = this._camRightX;
    this._facingCam.ry = this._camRightY;
    this._facingCam.x = cx;
    this._facingCam.y = cy;
    // The stopped people's echo steps through the same camera (frozen-look.js).
    this._spritePlaneMul = planeMul;
    if (isRealisticArt()) setFxCamera(dirX, dirY, planeX, planeY, cx, cy, w, h);
    const maxDistSq = drawDistance ? drawDistance * drawDistance : Infinity;

    // Sort entities by distance from camera (pre-allocated arrays to avoid per-frame GC)
    // Grow backing buffers if entity count exceeds capacity
    if (entities.length > _spriteDistBuf.length) {
      _spriteDistBuf = new Float64Array(entities.length * 2);
      _spriteOrderBuf = new Int32Array(entities.length * 2);
    }
    _spriteOrderCount = 0;
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].active === false && !entities[i].dissolving) continue;
      const distSq = (cx - entities[i].x) ** 2 + (cy - entities[i].y) ** 2;
      // The exit and power cells are where the player is headed: never culled.
      if (distSq > maxDistSq && entities[i].type !== "exit" && entities[i].type !== "powerCell") continue;
      _spriteOrderBuf[_spriteOrderCount++] = i;
      _spriteDistBuf[i] = distSq;
    }
    // Sort the active portion of the order buffer
    // subarray() is a view, so the sort runs in place without copying.
    const spriteOrder = _spriteOrderBuf.subarray(0, _spriteOrderCount).sort(_byDistanceDesc);

    for (let si = 0; si < spriteOrder.length; si++) {
      const entity = entities[spriteOrder[si]];
      const spriteX = entity.x - cx;
      const spriteY = entity.y - cy;

      const invDet = 1.0 / (planeX * dirY - dirX * planeY);
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

      if (transformY <= 0.1) continue;

      const spriteScreenX = ((w / 2) * (1 + transformX / transformY)) | 0;
      const spriteHeight = (Math.abs(h / transformY)) | 0;
      const spriteWidth = spriteHeight;

      // Sprites are drawn about the standing eye line (h/2). From a lower eye
      // everything stands higher in the view, nearer things more so: the
      // whole sprite is drawn `eyeLift` px up, and its cuts by low cover are
      // measured in that lifted space (_clipBias).
      const eyeLift = (this._eyeDrop * h) / transformY;
      this._clipBias = eyeLift;
      const drawStartY = Math.max(eyeLift | 0, (-spriteHeight / 2 + h / 2) | 0);
      const drawEndY = Math.min((h - 1 + eyeLift) | 0, (spriteHeight / 2 + h / 2) | 0);
      const drawStartX = Math.max(
        0,
        (-spriteWidth / 2 + spriteScreenX) | 0,
      );
      const drawEndX = Math.min(
        w - 1,
        (spriteWidth / 2 + spriteScreenX) | 0,
      );

      // Check if any column is visible: in front of the column's wall and
      // reaching above any low cover in front of it.
      let visible = false;
      for (let x = drawStartX; x <= drawEndX; x++) {
        if (transformY < this.zBuffer[x] && drawStartY < this.coverClipY(x, transformY)) {
          visible = true;
          break;
        }
      }
      if (!visible) continue;
      if (eyeLift) ctx.translate(0, -eyeLift);

      // Ground shadow — dark ellipse at entity's feet. A phased Hound, a
      // Foresight ghost and an afterimage cast none.
      if ((entity.type === "enemy" || entity.type === "npc") && !entity.dissolving && !entity._phased && !(entity.renderAlpha < 1)) {
        const shadowW = spriteWidth * 0.6;
        const shadowH = spriteHeight * 0.12;
        const shadowY = Math.floor(spriteHeight / 2 + h / 2) - shadowH * 0.5;
        // Walls and low cover in front hide the shadow with the feet.
        const vis = this._spriteClipPath(
          ctx,
          Math.floor(spriteScreenX - shadowW / 2), Math.ceil(spriteScreenX + shadowW / 2),
          shadowY - shadowH, shadowY + shadowH, transformY,
        );
        if (vis) {
          ctx.save();
          if (vis === 1) ctx.clip();
          ctx.globalAlpha = Math.min(0.35, 2.0 / transformY); // fade with distance
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.ellipse(spriteScreenX, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // A shield bearer's front arc, faint on the floor under it.
      if (entity.type === "enemy" && entity.def?.frontShield) {
        this._drawShieldArc(ctx, entity, cx, cy, dirX, dirY, planeX, planeY, transformY, eyeLift, time);
      }

      // Draw the entity. One dropping out of a ceiling vent (arrival.js
      // liftZ, a share of its height) is drawn that far up.
      const lift = entity.liftZ > 0 ? entity.liftZ * spriteHeight : 0;
      if (lift) {
        ctx.save();
        ctx.translate(0, -lift);
      }
      this.drawEntity(
        ctx,
        entity,
        spriteScreenX,
        drawStartY,
        drawEndY,
        drawStartX,
        drawEndX,
        spriteWidth,
        spriteHeight,
        transformY,
        time,
      );
      if (lift) ctx.restore();
      if (eyeLift) ctx.translate(0, eyeLift);
    }
    this._clipBias = 0;
  }

  /**
   * A shield bearer's front arc (±60°, combat.js), drawn faintly on the floor
   * around its feet in every art style: a fan the way its shield faces, its
   * two edges a little brighter, since past them your shots land. Brighter
   * while you stand in it (it is blocking you), dimmer once you are round it.
   * Points project as the sprite's feet do (h/2 + h/2ty, lifted by the eye
   * drop); the caller has already lifted the canvas by the enemy's own.
   */
  _drawShieldArc(ctx, e, cx, cy, dirX, dirY, planeX, planeY, depth, eyeLift, time) {
    if (e.dissolving || e.state === "dead" || e._phased || e._arriving || e.renderAlpha < 1) return;
    const w = this.width;
    const h = this.height;
    const invDet = 1.0 / (planeX * dirY - dirX * planeY);
    const R = 0.95;
    const N = 12;
    const a0 = e.angle || 0;
    const pts = _arcPts;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i <= N + 1; i++) {
      // The fan's points round the rim, then its centre at the feet.
      const a = a0 - Math.PI / 3 + ((2 * Math.PI) / 3) * (i / N);
      const wx = i > N ? e.x : e.x + Math.cos(a) * R;
      const wy = i > N ? e.y : e.y + Math.sin(a) * R;
      const sx = wx - cx;
      const sy = wy - cy;
      const tx = invDet * (dirY * sx - dirX * sy);
      const ty = invDet * (-planeY * sx + planeX * sy);
      if (ty <= 0.2) return;
      const px = (w / 2) * (1 + tx / ty);
      const py = h / 2 + h / (2 * ty) - (this._eyeDrop * h) / ty + eyeLift;
      pts[i * 2] = px;
      pts[i * 2 + 1] = py;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    if (x1 < 0 || x0 > w) return;
    const fade = Math.max(0, Math.min(1, 2.6 / depth)) * Math.max(0, 1 - depth / 16);
    if (fade <= 0.02) return;
    const vis = this._spriteClipPath(ctx, Math.floor(x0), Math.ceil(x1), y0 - 2, y1 + 2, depth);
    if (!vis) return;
    const da = Math.atan2(cy - e.y, cx - e.x) - a0;
    const facingYou = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) < Math.PI / 3;
    const k = fade * (facingYou ? 1 : 0.55) * (0.85 + 0.15 * Math.sin(time * 0.004));
    const cxp = pts[(N + 1) * 2];
    const cyp = pts[(N + 1) * 2 + 1];
    ctx.save();
    if (vis === 1) ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cxp, cyp);
    for (let i = 0; i <= N; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    ctx.closePath();
    ctx.fillStyle = `rgba(110,170,255,${(0.14 * k).toFixed(3)})`;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 1; i <= N; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    ctx.strokeStyle = `rgba(150,205,255,${(0.55 * k).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 3 / depth);
    ctx.stroke();
    // Its edges: where the flank starts.
    ctx.beginPath();
    ctx.moveTo(cxp, cyp);
    ctx.lineTo(pts[0], pts[1]);
    ctx.moveTo(cxp, cyp);
    ctx.lineTo(pts[N * 2], pts[N * 2 + 1]);
    ctx.strokeStyle = `rgba(190,225,255,${(0.6 * k).toFixed(3)})`;
    ctx.lineWidth = Math.max(1, 4 / depth);
    ctx.stroke();
    ctx.restore();
  }

  drawEntity(
    ctx,
    entity,
    screenX,
    startY,
    endY,
    startX,
    endX,
    sprWidth,
    sprHeight,
    dist,
    time,
  ) {
    const w = this.width;
    const h = this.height;
    const centerY = (h / 2) | 0;

    // Distance fog factor
    const fogDist = this._visualStyle === 1 ? 20 : 30;
    const fogFactor = Math.max(0, 1 - dist / fogDist);

    // Pickups, the exit and projectiles: cut by walls and low cover in front,
    // over the full screen height and a half-sprite margin so glows survive.
    // Enemies and props clip themselves to their own extents below.
    let clipped = false;
    if (entity.type !== "enemy" && entity.type !== "prop") {
      const pad = sprWidth >> 1;
      const vis = this._spriteClipPath(ctx, startX - pad, endX + pad, -h, 2 * h, dist);
      if (vis === 0) return;
      if (vis === 1) {
        ctx.save();
        ctx.clip();
        clipped = true;
      }
    }

    if (entity.type === "enemy" || entity.type === "npc") {
      // Out of phase, the Hound is drawn as a shimmer by src/rendering/chrono-fx.js.
      // People of the station (js/npc.js) draw on the same sprite rig.
      if (entity._phased) return;
      this.drawEnemy(
        ctx,
        entity,
        screenX,
        startY,
        endY,
        startX,
        endX,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor * (entity.renderAlpha ?? 1),
      );
    } else if (entity.type === "health") {
      drawHealthPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "ammo") {
      drawAmmoPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "weapon") {
      drawWeaponPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "gear") {
      drawGearPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
      );
    } else if (entity.type === "damage2x" || entity.type === "invuln") {
      drawExoticPickup(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
        entity.type,
      );
    } else if (entity.type === "powerCell") {
      drawPowerCell(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fogFactor);
    } else if (entity.type === "exit") {
      drawExit(
        ctx,
        screenX,
        centerY,
        sprWidth,
        sprHeight,
        dist,
        time,
        fogFactor,
        !!entity.sealed,
      );
    } else if (entity.type === "projectile") {
      // The player's own shots spawn inches from the camera, where the billboard
      // is screen-sized and would white out the reticle; fade them in as they
      // leave the muzzle.
      const nearFade = entity.owner === "player" ? Math.min(1, Math.max(0, (dist - 0.5) / 0.75)) : 1;
      drawProjectile(
        ctx,
        screenX,
        centerY,
        sprWidth,
        dist,
        entity,
        time,
        fogFactor * nearFade,
      );
    } else if (entity.type === "prop") {
      // Z-buffer clipping — same pattern as enemies so props behind walls
      // and low cover don't bleed through
      // The clip also crops the art to its sprite box, so it applies even
      // when nothing is in front.
      if (!this._spriteClipPath(ctx, startX, endX, startY, endY, dist)) return;
      ctx.save();
      ctx.clip();
      if (isRealisticArt()) {
        this._drawPropLit(ctx, entity, screenX, centerY, sprWidth, sprHeight, dist, time, fogFactor);
      } else {
        drawProp(ctx, entity, screenX, centerY, sprWidth, sprHeight, dist, time, fogFactor);
      }
      ctx.restore();
    }
    if (clipped) ctx.restore();
  }

  drawEnemy(
    ctx,
    enemy,
    screenX,
    startY,
    endY,
    startX,
    endX,
    sprWidth,
    sprHeight,
    dist,
    time,
    fog,
  ) {
    const h = this.height;
    const centerY = (h / 2) | 0;
    const halfW = sprWidth / 2;
    const halfH = sprHeight / 2;

    const def = enemy.def;
    if (!def) return;

    // Someone the pulse caught: drained, doubled, echoing, in any style.
    if (enemy.type === "npc" && isFrozen(enemy) && drawFrozenPerson(this, ctx, enemy, screenX, centerY, halfH, dist, time, fog)) return;

    // Modern art: SVG pose sprites. Falls through to the procedural sprite
    // until the type's bitmaps have decoded.
    if (isModernArt()) {
      const frame = prepareEnemySprite(ctx, enemy, halfH, time, this._camRightX, this._camRightY, this._camX, this._camY);
      if (frame) {
        this._drawEnemyModern(ctx, frame, enemy, screenX, centerY, halfW, halfH, dist, time, fog);
        return;
      }
    }

    // Prefer per-instance palette (set at spawn with slight HSL jitter so
    // a horde of drones doesn't read as 30 identical sprites). Falls back
    // to the def palette if spawner didn't seed an override.
    const c1 = enemy.baseColor || def.color1;
    const c2 = enemy.darkColor || def.color2;

    // Only draw columns not occluded by walls, and only above low cover.
    // The clip also crops the art to its sprite box, so it always applies.
    // A boss is drawn bigger than its column (src/rendering/enemies/boss.js).
    const tall = def.boss ? Math.ceil((endY - startY) * 0.8) : 0;
    const wide = def.boss ? Math.ceil((endX - startX) * 0.4) : 0;
    if (!this._spriteClipPath(ctx, startX - wide, endX + wide, startY - tall, endY, dist)) return;
    ctx.save();
    ctx.clip();

    const alpha = fog;
    if (alpha <= 0) {
      ctx.restore();
      return;
    }

    const bodyTop = centerY - halfH * 0.4;
    const bodyBottom = centerY + halfH * 0.5;
    const bodyWidth = halfW * 0.6;

    // Hit flash
    const hitFlash = enemy.hitTime && time - enemy.hitTime < 100;
    const baseColor = hitFlash ? "#ffffff" : c1;
    const darkColor = hitFlash ? "#ffaaaa" : c2;

    ctx.globalAlpha = alpha;

    // Death dissolve effect — fade out + scanline noise
    let dissolveAlpha = 1;
    if (enemy.dissolving && enemy.dissolveTimer != null) {
      dissolveAlpha = Math.max(0, enemy.dissolveTimer / 0.5);
      ctx.globalAlpha = alpha * dissolveAlpha;
      // Shift hue toward white during dissolve
      if (dissolveAlpha < 0.5) {
        ctx.globalCompositeOperation = "lighter";
      }
    }

    const renderFn = ENEMY_RENDERERS[enemy.enemyType];
    if (renderFn) {
      // The station's people turn their back on the camera when facing away.
      const away = enemy.type === "npc" && Math.cos(enemy.angle) * this._camRightY - Math.sin(enemy.angle) * this._camRightX > 0.3;
      renderFn(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash, away, this._facingCam);
    } else {
      // Fallback: generic rectangle
      ctx.fillStyle = darkColor;
      ctx.fillRect(screenX - bodyWidth, bodyTop, bodyWidth * 2, bodyBottom - bodyTop);
      ctx.fillStyle = baseColor;
      ctx.fillRect(screenX - bodyWidth * 0.7, bodyTop + (bodyBottom - bodyTop) * 0.1, bodyWidth * 1.4, (bodyBottom - bodyTop) * 0.8);
      ctx.fillStyle = "#00ffaa";
      const eyeSize = bodyWidth * 0.2;
      ctx.fillRect(screenX - eyeSize, bodyTop + (bodyBottom - bodyTop) * 0.25 - eyeSize / 2, eyeSize * 2, eyeSize);
      ctx.fillStyle = darkColor;
      const legW = bodyWidth * 0.3;
      ctx.fillRect(screenX - bodyWidth * 0.5, bodyBottom, legW, halfH * 0.3);
      ctx.fillRect(screenX + bodyWidth * 0.2, bodyBottom, legW, halfH * 0.3);
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    if (enemy.state === "windup" && enemy._windupTotalMs > 0 && !enemy.dissolving) {
      this._drawAttackTelegraph(ctx, enemy, screenX, bodyTop, bodyBottom, bodyWidth, halfH, alpha, time, dist);
    }
  }

  /**
   * Modern enemy sprite. Occlusion uses the same per-column test as the
   * procedural path (a column draws only where the enemy is nearer than the
   * wall, and only above any low cover in front of it), but spans the
   * sprite's own extent so wide or tall art is not cropped to the square
   * sprite column. Adjacent columns with the same cut merge into one clip
   * rect, and a sprite with nothing in front is drawn unclipped.
   */
  _drawEnemyModern(ctx, frame, enemy, screenX, centerY, halfW, halfH, dist, time, fog) {
    // Fog fades the sprite only over the last stretch of the fog range.
    // Scaling alpha with distance throughout left a near enemy see-through
    // (90% opaque at 3 tiles), the corridor showing through a pale body.
    const alpha = Math.min(1, fog * 2.5);
    if (alpha <= 0) return;
    const x0 = Math.max(0, Math.floor(screenX + frame.x0));
    const x1 = Math.min(this.zBuffer.length - 1, Math.ceil(screenX + frame.x1));
    const top = centerY + frame.y0;
    const height = frame.y1 - frame.y0;

    const vis = this._spriteClipPath(ctx, x0, x1, top, top + height, dist);
    ctx.save();
    if (vis) {
      if (vis === 1) ctx.clip();
      const hitFlash = !!enemy.hitTime && time - enemy.hitTime < 100;
      const dissolve = enemy.dissolving && enemy.dissolveTimer != null ? Math.max(0, enemy.dissolveTimer / 0.5) : 1;
      const windupT = enemy.state === "windup" && enemy._windupTotalMs > 0
        ? 1 - Math.max(0, enemy._windupLeftMs) / enemy._windupTotalMs
        : 0;
      if (isRealisticArt() && dissolve >= 1) {
        // Contact shadow: without the Modern ink outline, a sprite with no
        // shadow reads as floating over the deck.
        const rx = Math.max(4, (frame.x1 - frame.x0) * 0.3);
        const ry = rx * 0.2;
        ctx.globalAlpha = 0.42 * alpha;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(screenX, centerY + frame.y1 - ry, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Hit enemies stay lit: switching to the unlit sprite for the flash
      // popped a dark figure to full brightness for 100 ms on every hit.
      if (isRealisticArt()) {
        this._drawEnemyLit(ctx, frame, enemy, screenX, centerY, alpha, time, dissolve, windupT, hitFlash);
      } else {
        drawEnemySprite(ctx, frame, screenX, centerY, alpha, time, hitFlash, dissolve, windupT);
      }
    }
    ctx.restore();

    if (enemy.state === "windup" && enemy._windupTotalMs > 0 && !enemy.dissolving) {
      const bodyTop = centerY - halfH * 0.4;
      const bodyBottom = centerY + halfH * 0.5;
      const bodyWidth = halfW * 0.6;
      this._drawAttackTelegraph(ctx, enemy, screenX, bodyTop, bodyBottom, bodyWidth, halfH, alpha, time, dist);
    }
  }

  /**
   * Realistic: draw the sprite into a scratch layer, tint only its own pixels
   * by the light at the enemy's feet (lamps overhead, muzzle flashes, glowing
   * projectiles), then blit it back inside the caller's occlusion clip. An
   * enemy standing between lamps falls into shadow; one under a lamp or beside
   * a flash lights up with that light's colour.
   */
  _drawEnemyLit(ctx, frame, enemy, screenX, centerY, alpha, time, dissolve, windupT, hitFlash = false) {
    // ctx.filter keeps the lighting on the main canvas. The first version
    // drew each sprite into a scratch canvas and blitted it back, and every
    // one of those cross-canvas copies forced a GPU flush: ~10% of Modern's
    // frame with a room full of enemies and props.
    // Enemies shade at most 35% (props 65%): a threat must stay readable.
    ctx.filter = this._litFilter(enemy.x, enemy.y, 0.35);
    drawEnemySprite(ctx, frame, screenX, centerY, alpha, time, hitFlash, dissolve, windupT);
    ctx.filter = "none";
  }

  /** Realistic props: same lighting as enemies. */
  _drawPropLit(ctx, entity, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
    // Props carry no emissive-critical gameplay read, so they may fall
    // further into shadow than enemies do.
    ctx.filter = this._litFilter(entity.x, entity.y, 0.65);
    drawProp(ctx, entity, screenX, centerY, sprWidth, sprHeight, dist, time, fog);
    ctx.filter = "none";
  }

  /**
   * CSS filter string for the light at world (wx, wy): brightness from the
   * light level, capped at `maxShade` darkening, plus a small warm/cool cast
   * from the light's colour. Quantised and cached, so no string is built per
   * sprite per frame.
   */
  _litFilter(wx, wy, maxShade) {
    const L = this.lightAt(wx, wy, _litOut);
    const lum = 0.2126 * L.r + 0.7152 * L.g + 0.0722 * L.b;
    const shade = lum < 1 ? Math.min(maxShade, (1 - lum) * 0.75) : 0;
    const bright = lum < 1 ? 1 - shade : Math.min(1.5, 1 + (lum - 1) * 0.6);
    // Warmth: red over blue beyond neutral pushes a slight sepia cast.
    const warm = Math.max(0, Math.min(1, (L.r - L.b) * 1.5));
    const qb = Math.round(bright * 20);
    const qw = Math.round(warm * 5);
    const key = (qb << 3) | qw;
    let f = _litFilters.get(key);
    if (!f) {
      f = qw ? `brightness(${qb / 20}) sepia(${(qw / 5) * 0.25})` : `brightness(${qb / 20})`;
      _litFilters.set(key, f);
    }
    return f;
  }

  /**
   * Attack telegraph, drawn from shared AI state so every enemy renderer gets
   * it without per-type code. A ring closes onto the body as the windup runs
   * out and the body brightens, so the timing reads at a glance. Red for melee
   * (get out of reach), amber for ranged (a projectile is coming).
   * Uses its own column clip rather than the sprite's: the sprite clip is only
   * as tall as the sprite, which sliced the ring flat at top and bottom. This
   * clip spans the ring's full extent and still skips columns where a wall is
   * nearer than the enemy, so walls continue to occlude it.
   */
  _drawAttackTelegraph(ctx, enemy, screenX, bodyTop, bodyBottom, bodyWidth, halfH, alpha, time, dist) {
    // `|| 0` keeps a half-initialised windup (debug spawns) from producing NaN.
    const t = Math.min(1, Math.max(0, 1 - Math.max(0, enemy._windupLeftMs || 0) / enemy._windupTotalMs)); // 0..1
    const melee = enemy.def.attackType !== "ranged";
    const rgb = melee ? "255,64,40" : "255,196,48";
    const cy = (bodyTop + bodyBottom) / 2;
    const reach = Math.max(bodyWidth * 1.1, halfH * 0.45);
    const extent = reach * 2.1 * 1.25 + 4; // widest ring incl. the flicker ring

    const x0 = Math.max(0, Math.floor(screenX - extent));
    const x1 = Math.min(this.zBuffer.length - 1, Math.ceil(screenX + extent));
    if (x1 < x0) return;

    const vis = this._spriteClipPath(ctx, x0, x1, cy - extent, cy + extent, dist);
    if (!vis) return;
    ctx.save();
    if (vis === 1) ctx.clip();

    ctx.globalCompositeOperation = "lighter";
    // Realistic keeps the countdown (the ring's size is the timing, which is
    // gameplay) but draws it as a hairline, and lets the charge-up glow carry
    // the rest instead of a thick cartoon ring and flicker.
    const real = isRealisticArt();

    // Body wash, brightening toward release.
    const wash = ctx.createRadialGradient(screenX, cy, 0, screenX, cy, reach * 1.3);
    wash.addColorStop(0, `rgba(${rgb},${(real ? 0.16 : 0.1) + (real ? 0.55 : 0.4) * t})`);
    wash.addColorStop(1, `rgba(${rgb},0)`);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = wash;
    ctx.fillRect(screenX - reach * 1.3, cy - reach * 1.3, reach * 2.6, reach * 2.6);

    // Contracting ring: wide at the start, tight on the body at the moment of
    // release, so its size is the countdown.
    const r = reach * (2.1 - 1.1 * t);
    ctx.globalAlpha = alpha * (real ? 0.2 + 0.45 * t : 0.35 + 0.6 * t);
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = real ? 1 + t : Math.max(1.5, reach * (0.05 + 0.07 * t));
    ctx.beginPath();
    ctx.arc(screenX, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Final flicker in the last 20% — the "now" beat.
    if (!real && t > 0.8 && Math.floor(time / 45) % 2 === 0) {
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = Math.max(1, reach * 0.04);
      ctx.beginPath();
      ctx.arc(screenX, cy, r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

}

/** Whether any of `ids` stands within a dozen tiles of the player. */
function nearWalls(map, player, ids) {
  if (!player || !map?.grid) return false;
  const R = 12;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  for (let y = Math.max(0, py - R); y <= Math.min(map.grid.length - 1, py + R); y++) {
    const row = map.grid[y];
    for (let x = Math.max(0, px - R); x <= Math.min(row.length - 1, px + R); x++) {
      if (row[x] >= 10 && ids.includes(row[x])) return true;
    }
  }
  return false;
}
