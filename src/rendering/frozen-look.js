/**
 * What a person the 06:47 pulse caught looks like, in every art style: the
 * colour drained toward blue-grey, a faint second image a hair to one side,
 * a one-second echo (a ghost of them takes their last step forward and
 * snaps back), and dust hanging dead still in the air round them.
 *
 * Someone stopped does not change from frame to frame, so they are drawn
 * once into a bitmap of their own, through the style's normal sprite path
 * (Legacy's procedural rig, Comic and Modern's SVG poses), drained there,
 * and blitted after that: the main image, the double and the echo are three
 * drawImage calls and the motes a dozen fillRects, with nothing allocated
 * per frame. The bitmap is remade when their on-screen size moves a bucket,
 * the style changes, or they turn their back; in Comic and Modern also about
 * once a second, which picks up a sharper SVG raster once it has decoded and
 * keeps that raster's layers in use (raster.js evicts idle ones).
 *
 * Who counts as stopped is src/systems/stillness.js `isFrozen`.
 */
import { ENEMY_RENDERERS } from "./enemies/index.js";
import { prepareEnemySprite, drawEnemySprite } from "./svg-art/sprites/enemies.js";
import { getArtStyle, isModernArt, isRealisticArt } from "./art-style.js";
import { echoAt, ECHO_STEP } from "../systems/stillness.js";

/** On-screen half-heights are bucketed in steps of this ratio; a bucket change remakes the bitmap. */
const BUCKET = 1.15;
/** Past this half-height the bitmap is scaled up rather than remade larger (a person at arm's length). */
const MAX_HALF = 320;
/**
 * Comic and Modern remake the bitmap about this often while drawn, ms, a
 * little apart per person so a roomful do not all bake in one frame.
 * Legacy draws from code, not the raster cache: it has nothing to refresh.
 */
const REFRESH_MS = 1000;
/** Motes of dust hanging round each person. */
const MOTES = 12;

/** The drain: hue and saturation of a cold blue-grey over the person's own light and shade. */
const DRAIN = "rgba(116,132,156,0.84)";
/** A thin frost over the top of it: stopped people read paler than the room. */
const FROST = "rgba(170,188,214,0.14)";
const MOTE = "#d8e4ff";

const _entries = new WeakMap();
const _echo = { step: 0, alpha: 0 };
let _scratch = null;

function scratch(w, h) {
  if (!_scratch) _scratch = document.createElement("canvas");
  if (_scratch.width < w) _scratch.width = w;
  if (_scratch.height < h) _scratch.height = h;
  return _scratch;
}

function hashOf(n) {
  let h = (n * 2654435761) >>> 0;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function entryOf(npc) {
  let e = _entries.get(npc);
  if (e) return e;
  const rnd = hashOf((npc.serial ?? 1) * 7919 + 13);
  // Each mote: x, y (in half-heights from the sprite's centre), size, alpha.
  const motes = new Float32Array(MOTES * 4);
  for (let i = 0; i < MOTES; i++) {
    motes[i * 4] = (rnd() - 0.5) * 1.5;
    motes[i * 4 + 1] = -0.95 + rnd() * 1.6;
    motes[i * 4 + 2] = 0.006 + rnd() * 0.009;
    motes[i * 4 + 3] = 0.25 + rnd() * 0.45;
  }
  e = { canvas: null, bucket: -1, style: -1, away: null, at: -Infinity, hb: 0, ox: 0, oy: 0, w: 0, h: 0, pw: 0, ph: 0, motes, seed: npc.serial ?? 0 };
  _entries.set(npc, e);
  return e;
}

/**
 * Draw the person, once, at half-height `hb` into the scratch canvas, then
 * drain it into the entry's own bitmap. False when there is nothing to draw
 * yet (a Modern pose still decoding).
 */
function bake(e, npc, hb, away, time, crx, cry, k) {
  const modern = isModernArt();
  let ox, oy, w, h, frame = null;
  if (modern) {
    const probe = scratch(4, 4).getContext("2d");
    probe.setTransform(k, 0, 0, k, 0, 0);
    frame = prepareEnemySprite(probe, npc, hb, time, crx, cry);
    if (!frame) return false;
    ox = -frame.x0;
    oy = -frame.y0;
    w = frame.x1 - frame.x0;
    h = frame.y1 - frame.y0;
  } else {
    ox = hb * 1.3;
    oy = hb * 1.15;
    w = hb * 2.6;
    h = hb * 2.2;
  }
  const pw = Math.ceil(w * k);
  const ph = Math.ceil(h * k);
  const s = scratch(pw, ph);
  const g = s.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, pw, ph);
  g.setTransform(k, 0, 0, k, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  if (modern) {
    drawEnemySprite(g, frame, ox, oy, 1, time, false, 1, 0);
  } else {
    const fn = ENEMY_RENDERERS[npc.enemyType];
    if (!fn) return false;
    const c1 = npc.def?.color1 ?? "#888";
    const c2 = npc.def?.color2 ?? "#444";
    fn(g, ox, oy, hb, hb, oy - hb * 0.4, oy + hb * 0.5, hb * 0.6, c1, c2, 1, time, npc, false, away);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";

  if (!e.canvas) e.canvas = document.createElement("canvas");
  const c = e.canvas;
  if (c.width < pw) c.width = pw;
  if (c.height < ph) c.height = ph;
  const cg = c.getContext("2d");
  cg.setTransform(1, 0, 0, 1, 0, 0);
  cg.globalAlpha = 1;
  cg.globalCompositeOperation = "copy";
  cg.drawImage(s, 0, 0, pw, ph, 0, 0, pw, ph);
  // "color" keeps their light and shade and takes the hue and saturation of
  // the blue-grey; it paints the empty pixels too, so the person's own
  // alpha is put back from the scratch copy afterwards.
  cg.globalCompositeOperation = "color";
  cg.fillStyle = DRAIN;
  cg.fillRect(0, 0, pw, ph);
  cg.globalCompositeOperation = "destination-in";
  cg.drawImage(s, 0, 0, pw, ph, 0, 0, pw, ph);
  cg.globalCompositeOperation = "source-atop";
  cg.fillStyle = FROST;
  cg.fillRect(0, 0, pw, ph);
  cg.globalCompositeOperation = "source-over";
  // A stale strip past this size from a bigger bake is never drawn: blits use pw x ph.
  e.hb = hb;
  e.ox = ox;
  e.oy = oy;
  e.w = w;
  e.h = h;
  e.pw = pw;
  e.ph = ph;
  return true;
}

/**
 * Draw a stopped person in place of their sprite. `r` is the raycaster
 * (its z-buffer clip, camera vectors and Realistic light), the rest as
 * drawEnemy has them. Returns false when it drew nothing, so the caller
 * draws them the ordinary way meanwhile.
 */
export function drawFrozenPerson(r, ctx, npc, screenX, centerY, halfH, dist, time, fog) {
  if (typeof document === "undefined" || !(halfH > 0)) return false;
  const e = entryOf(npc);
  const crx = r._camRightX ?? 1;
  const cry = r._camRightY ?? 0;
  const away = Math.cos(npc.angle) * cry - Math.sin(npc.angle) * crx > 0.3;
  const style = getArtStyle();
  const bucket = Math.round(Math.log(Math.min(halfH, MAX_HALF)) / Math.log(BUCKET));
  const stale = isModernArt() && (time - e.at > REFRESH_MS + (e.seed % 8) * 60 || time < e.at);
  if (e.bucket !== bucket || e.style !== style || e.away !== away || stale) {
    const m = ctx.getTransform();
    const k = Math.hypot(m.a, m.b) || 1;
    if (bake(e, npc, BUCKET ** bucket, away, time, crx, cry, k)) {
      e.bucket = bucket;
      e.style = style;
      e.away = away;
      e.at = time;
    } else if (e.style !== style || !e.canvas) {
      return false;
    }
  }
  const alpha = isModernArt() ? Math.min(1, fog * 2.5) : fog;
  if (alpha <= 0) return true;

  const s = halfH / e.hb;
  const dw = e.w * s;
  const dh = e.h * s;
  const dx = screenX - e.ox * s;
  const dy = centerY - e.oy * s;

  // The echo's step, through the camera: along their facing, `ECHO_STEP` at
  // most, so it comes toward you, goes away or crosses as they were walking.
  echoAt(time, e.seed, _echo);
  const L = ECHO_STEP * _echo.step;
  const fx = Math.cos(npc.angle);
  const fy = Math.sin(npc.angle);
  const side = fx * crx + fy * cry;
  const fwd = fx * cry - fy * crx;
  const halfW = r.width / 2;
  const planeMul = r._spritePlaneMul ?? 0.66;
  const tx = (screenX / halfW - 1) * dist + (L * side) / planeMul;
  const d2 = Math.max(0.2, dist + L * fwd);
  const gs = (halfH * dist) / d2 / e.hb;
  const gx = halfW * (1 + tx / d2) - e.ox * gs;
  const gy = centerY - e.oy * gs;
  const gw = e.w * gs;
  const gh = e.h * gs;

  const x0 = Math.floor(Math.min(dx, gx) - halfH * 0.1);
  const x1 = Math.ceil(Math.max(dx + dw, gx + gw) + halfH * 0.1);
  const top = Math.min(dy, gy);
  const bottom = Math.max(dy + dh, gy + gh);
  const vis = r._spriteClipPath(ctx, x0, x1, top, bottom, Math.min(dist, d2));
  if (!vis) return true;
  ctx.save();
  if (vis === 1) ctx.clip();
  const img = e.canvas;
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;

  // The echo first, behind them: thin, and gone at the snap back.
  if (_echo.alpha > 0.01) {
    ctx.globalAlpha = alpha * 0.3 * _echo.alpha;
    ctx.drawImage(img, 0, 0, e.pw, e.ph, gx, gy, gw, gh);
  }
  // The double image: the same instant, a hair to one side.
  ctx.globalAlpha = alpha * 0.22;
  ctx.drawImage(img, 0, 0, e.pw, e.ph, dx + halfH * 0.045, dy - halfH * 0.012, dw, dh);
  // Themselves, lit by the room in Modern.
  if (isRealisticArt() && r._litFilter) ctx.filter = r._litFilter(npc.x, npc.y, 0.35);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0, e.pw, e.ph, dx, dy, dw, dh);
  if (ctx.filter !== "none") ctx.filter = "none";

  // Dust hanging where it was: no drift, only a slow catch of the light.
  ctx.fillStyle = MOTE;
  const mo = e.motes;
  const t = time * 0.0011;
  for (let i = 0; i < MOTES; i++) {
    const j = i * 4;
    const sz = Math.max(1, mo[j + 2] * halfH);
    ctx.globalAlpha = alpha * mo[j + 3] * (0.7 + 0.3 * Math.sin(t + i * 1.9));
    ctx.fillRect(screenX + mo[j] * halfH - sz / 2, centerY + mo[j + 1] * halfH - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.restore();
  return true;
}
