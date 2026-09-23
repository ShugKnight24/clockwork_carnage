/**
 * Chronos in the world: what the powers, the set pieces and the Hound look
 * like. Drawn into the raycaster's canvas after the scene, through the same
 * camera (renderer._projectWorld) and occluded by its z-buffer, so a wall
 * hides a ghost, a lock plane or a vent the way it hides an enemy.
 *
 *   Foresight   while shifting: a translucent ghost of each enemy where it
 *               will be in 0.6 s, a red line from a winding-up attack to its
 *               target, and a dotted path ahead of every enemy round
 *   Time-Lock   a pane of blue, frozen time; the rounds it holds hang in it
 *   Rewind      the echo you left behind, a flickering pink figure
 *   hazards     fans, vents, laser gates and sentries, the collapse's warning
 *               band, stasis motes, the loop's seam, hunter rifts
 *   the Hound   a heat-shimmer drawn from a stuttered position with a trail
 *               of afterimages and scorched footprints; solid while you shift
 *
 * `renderChronoScreen` adds the screen-space parts: the stasis room's
 * desaturation and a crimson edge when Resonance is high.
 */
import { predictEnemy, windupLine, projectilePath } from "../systems/chrono-powers.js";
import { hazardState } from "../systems/chrono-hazards.js";

const FLOOR = 0.5;
const WAIST = 0.12;
const HEAD = -0.35;

/** Enemy proxies for ghosts and the Hound's shimmer, reused frame to frame. */
const _proxies = new WeakMap();
function proxyOf(e, key) {
  let bag = _proxies.get(e);
  if (!bag) _proxies.set(e, (bag = {}));
  let p = bag[key];
  if (!p) {
    // Shares everything with the enemy but its position and look.
    p = bag[key] = Object.create(e);
    p._proxy = true;
    p.dissolving = false;
    p.state = "chase";
  }
  p.active = true;
  return p;
}

function proj(r, game, planeMul, yShift, x, y, z) {
  return r._projectWorld(game.player, x, y, planeMul, undefined, undefined, z, yShift);
}

/** Is a projected point in front of the wall in its column? */
function visible(r, pt) {
  if (!pt) return false;
  const x = Math.max(0, Math.min(r.width - 1, Math.floor(pt.x)));
  return pt.depth < r.zBuffer[x] + 0.05;
}

/** A world line from (x0,y0) to (x1,y1) at height z, occluded per sample. */
function worldLine(ctx, r, game, planeMul, yShift, x0, y0, x1, y1, z, dashed = false) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.35));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const pt = proj(r, game, planeMul, yShift, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z);
    const ok = visible(r, pt);
    if (ok && prev && (!dashed || i % 2 === 0)) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
    prev = ok ? pt : null;
  }
}

/** A vertical pane between two world points, `bottom` (the floor) to `top`, in strips. */
function worldPane(ctx, r, game, planeMul, yShift, ax, ay, bx, by, top, fill, strips = 20, bottom = FLOOR) {
  for (let i = 0; i < strips; i++) {
    const t0 = i / strips;
    const t1 = (i + 1) / strips;
    const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0;
    const x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1;
    const a = proj(r, game, planeMul, yShift, x0, y0, bottom);
    const b = proj(r, game, planeMul, yShift, x1, y1, bottom);
    const c = proj(r, game, planeMul, yShift, x1, y1, top);
    const d = proj(r, game, planeMul, yShift, x0, y0, top);
    if (!a || !b || !c || !d) continue;
    const mid = { x: (a.x + b.x) / 2, depth: (a.depth + b.depth) / 2 };
    if (!visible(r, mid)) continue;
    ctx.fillStyle = typeof fill === "function" ? fill(t0) : fill;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
}

/** A flat mark on the floor: a projected ellipse `rw` tiles across. */
function floorMark(ctx, r, game, planeMul, yShift, x, y, rw, fill) {
  const pt = proj(r, game, planeMul, yShift, x, y, FLOOR);
  if (!visible(r, pt)) return;
  const px = (r.height / pt.depth) * rw;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(pt.x, pt.y, px, px * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A standing figure (the echo): capsule body and head, `alpha` 0..1. */
function figure(ctx, r, game, planeMul, yShift, x, y, color, alpha) {
  const foot = proj(r, game, planeMul, yShift, x, y, FLOOR);
  const head = proj(r, game, planeMul, yShift, x, y, HEAD);
  if (!foot || !head || !visible(r, foot)) return;
  const hgt = foot.y - head.y;
  const wdt = hgt * 0.28;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(foot.x - wdt / 2, head.y + hgt * 0.18, wdt, hgt * 0.82, wdt * 0.4);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(foot.x, head.y + hgt * 0.09, hgt * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Scanline tears, so it reads as a recording, not a person.
  ctx.globalCompositeOperation = "destination-out";
  const off = (performance.now() / 40) % 6;
  for (let yy = head.y + off; yy < foot.y; yy += 6) ctx.fillRect(foot.x - wdt, yy, wdt * 2, 1.5);
  ctx.restore();
}

function drawForesight(ctx, r, game, planeMul, yShift) {
  const p = game.player;
  const cp = game.chronoPowers;
  const ghosts = [];
  ctx.save();
  ctx.lineWidth = 1.5;
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.active || e.state === "dead" || e.dissolving) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) > 22) continue;
    const g = predictEnemy(e, game.map);
    if (Math.hypot(g.x - e.x, g.y - e.y) > 0.2) {
      const ghost = proxyOf(e, "ghost");
      ghost.x = g.x;
      ghost.y = g.y;
      ghost.renderAlpha = 0.32;
      ghost._phased = false;
      ghosts.push(ghost);
      ctx.strokeStyle = "rgba(255,174,58,0.55)";
      worldLine(ctx, r, game, planeMul, yShift, e.x, e.y, g.x, g.y, FLOOR - 0.02, true);
      floorMark(ctx, r, game, planeMul, yShift, g.x, g.y, 0.35, "rgba(255,174,58,0.28)");
    }
    const line = windupLine(e, cp?.echo ?? p);
    if (line) {
      ctx.strokeStyle = "rgba(255,48,48,0.8)";
      worldLine(ctx, r, game, planeMul, yShift, line.x0, line.y0, line.x1, line.y1, WAIST);
    }
  }
  ctx.fillStyle = "rgba(255,200,120,0.85)";
  for (const pr of game.projectiles) {
    if (!pr.active || pr.owner !== "enemy" || pr.frozen) continue;
    for (const dot of projectilePath(pr, game.map)) {
      const pt = proj(r, game, planeMul, yShift, dot.x, dot.y, -0.02);
      if (!visible(r, pt)) continue;
      const s = Math.max(1.5, Math.min(4, 30 / pt.depth));
      ctx.fillRect(pt.x - s / 2, pt.y - s / 2, s, s);
    }
  }
  ctx.restore();
  return ghosts;
}

function drawLock(ctx, r, game, planeMul, yShift, lock) {
  const cp = game.chronoPowers;
  const left = Math.max(0, lock.until - cp.clock);
  const fade = Math.min(1, left / 0.6) * Math.min(1, (cp.clock - lock.born) / 0.15);
  const ax = lock.cx - lock.tx * lock.half, ay = lock.cy - lock.ty * lock.half;
  const bx = lock.cx + lock.tx * lock.half, by = lock.cy + lock.ty * lock.half;
  const t = performance.now() / 1000;
  ctx.save();
  // Frosted glass: a cold tint with slow bands moving through it.
  worldPane(ctx, r, game, planeMul, yShift, ax, ay, bx, by, -0.55, (u) => {
    const shimmer = 0.5 + 0.5 * Math.sin(u * 14 + t * 2.5);
    return `rgba(79,157,255,${(0.16 + 0.12 * shimmer) * fade})`;
  }, 28);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(190,225,255,${0.95 * fade})`;
  ctx.lineWidth = 3;
  worldLine(ctx, r, game, planeMul, yShift, ax, ay, bx, by, FLOOR);
  worldLine(ctx, r, game, planeMul, yShift, ax, ay, bx, by, -0.55);
  // The two edges, floor to top.
  for (const [ex, ey] of [[ax, ay], [bx, by]]) {
    const f0 = proj(r, game, planeMul, yShift, ex, ey, FLOOR);
    const f1 = proj(r, game, planeMul, yShift, ex, ey, -0.55);
    if (!visible(r, f0) || !f1) continue;
    ctx.beginPath();
    ctx.moveTo(f0.x, f0.y);
    ctx.lineTo(f1.x, f1.y);
    ctx.stroke();
  }
  // Frozen time: fine vertical frost every quarter tile, and a few
  // horizontal bands, all nearly still.
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(160,210,255,${0.35 * fade})`;
  const n = Math.round(lock.half * 8);
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const x = ax + (bx - ax) * u, y = ay + (by - ay) * u;
    const f0 = proj(r, game, planeMul, yShift, x, y, FLOOR);
    const f1 = proj(r, game, planeMul, yShift, x, y, -0.55 + 0.1 * Math.sin(i * 2.3));
    if (!visible(r, f0) || !f1) continue;
    ctx.beginPath();
    ctx.moveTo(f0.x, f0.y);
    ctx.lineTo(f1.x, f1.y);
    ctx.stroke();
  }
  for (let k = 1; k < 5; k++) {
    const z = FLOOR - (k / 5) * 1.05 + Math.sin(t * 0.6 + k) * 0.01;
    worldLine(ctx, r, game, planeMul, yShift, ax, ay, bx, by, z);
  }
  ctx.restore();
}

function drawHazards(ctx, r, game, planeMul, yShift) {
  const hz = game.chronoHazards;
  if (!hz?.piece) return;
  const now = performance.now() / 1000;
  const shifting = game.player.chronoActive;
  ctx.save();
  for (const h of hz.hazards) {
    const st = hazardState(h, hz.clock, hz.triggers[h.id]);
    if (h.type === "blade") {
      // Waist-high rotor: a faint disc, the hub, and bright arms with a
      // smear behind them that shortens when time slows.
      ctx.strokeStyle = "rgba(255,120,60,0.18)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2;
        const a1 = ((i + 1) / 16) * Math.PI * 2;
        worldLine(ctx, r, game, planeMul, yShift, h.x + Math.cos(a0) * h.radius, h.y + Math.sin(a0) * h.radius,
          h.x + Math.cos(a1) * h.radius, h.y + Math.sin(a1) * h.radius, WAIST);
      }
      for (let i = 0; i < h.arms; i++) {
        const a = st.angle + (i * Math.PI * 2) / h.arms;
        // A waist-high blade, with a motion smear behind it that is long at
        // speed and gone in a shift.
        const smear = shifting ? 1 : 4;
        for (let k = smear; k >= 1; k--) {
          const ak = a - k * 0.14;
          worldPane(ctx, r, game, planeMul, yShift, h.x, h.y, h.x + Math.cos(ak) * h.radius, h.y + Math.sin(ak) * h.radius,
            WAIST - 0.06, `rgba(255,110,50,${0.2 / k})`, 6, WAIST + 0.06);
        }
        const tipX = h.x + Math.cos(a) * h.radius, tipY = h.y + Math.sin(a) * h.radius;
        worldPane(ctx, r, game, planeMul, yShift, h.x, h.y, tipX, tipY, WAIST - 0.06, "rgba(150,80,50,0.95)", 6, WAIST + 0.06);
        ctx.strokeStyle = "rgba(255,210,160,0.95)";
        ctx.lineWidth = 2;
        worldLine(ctx, r, game, planeMul, yShift, h.x, h.y, tipX, tipY, WAIST - 0.06);
      }
      floorMark(ctx, r, game, planeMul, yShift, h.x, h.y, 0.25, "rgba(40,20,10,0.8)");
    } else if (h.type === "vent" || (h.type === "gate" && h.kind !== "turret" && h.rect)) {
      const [c1, r1, c2, r2] = h.rect;
      for (let row = r1; row <= r2; row++) {
        for (let col = c1; col <= c2; col++) {
          if (game.map.grid[row]?.[col] !== 0) continue;
          const x = col + 0.5, y = row + 0.5;
          if (st.on) {
            const flick = 0.75 + 0.25 * Math.sin(now * 20 + col * 1.7 + row);
            ctx.globalCompositeOperation = "lighter";
            worldPane(ctx, r, game, planeMul, yShift, x - 0.45, y, x + 0.45, y, -0.25 * flick, "rgba(255,120,40,0.22)", 2);
            ctx.globalCompositeOperation = "source-over";
            floorMark(ctx, r, game, planeMul, yShift, x, y, 0.45, "rgba(255,170,60,0.45)");
          } else {
            floorMark(ctx, r, game, planeMul, yShift, x, y, 0.42, st.priming ? "rgba(255,120,40,0.3)" : "rgba(60,30,20,0.55)");
          }
        }
      }
    } else if (h.type === "gate" && h.kind !== "turret") {
      ctx.lineWidth = st.on ? 3 : 1;
      ctx.strokeStyle = st.on ? "rgba(255,40,70,0.9)" : st.priming ? "rgba(255,40,70,0.45)" : "rgba(255,40,70,0.15)";
      for (const z of [0.3, WAIST, -0.1]) worldLine(ctx, r, game, planeMul, yShift, h.a.x, h.a.y, h.b.x, h.b.y, z, !st.on);
    } else if (h.type === "gate" && h.kind === "turret") {
      const pt = proj(r, game, planeMul, yShift, h.x, h.y, 0.05);
      if (visible(r, pt) && !h.stopped) {
        const s = Math.max(4, (r.height / pt.depth) * 0.22);
        ctx.fillStyle = "#1a1d24";
        ctx.fillRect(pt.x - s, pt.y - s * 0.7, s * 2, s * 1.4);
        ctx.fillStyle = `rgba(255,60,40,${0.6 + 0.4 * Math.sin(now * 8)})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (h.type === "collapse" && st.triggered) {
      // A red band on the floor where the ceiling comes down next.
      const p = game.player;
      for (let i = st.front + 1; i <= Math.min(h.steps.length - 1, st.front + 2); i++) {
        for (const [c, rr] of h.steps[i]) {
          if (game.map.grid[rr]?.[c] !== 0) continue;
          if (Math.hypot(c + 0.5 - p.x, rr + 0.5 - p.y) > 14) continue;
          floorMark(ctx, r, game, planeMul, yShift, c + 0.5, rr + 0.5, 0.45, `rgba(255,40,40,${0.25 + 0.2 * Math.sin(now * 12)})`);
        }
      }
    } else if (h.type === "stasis") {
      // Debris and water, hanging where the collapse left them.
      const [c1, r1, c2, r2] = h.rect;
      let seed = 1234567;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < (h.motes ?? 32); i++) {
        const x = c1 + rnd() * (c2 - c1 + 1);
        const y = r1 + rnd() * (r2 - r1 + 1);
        const z = FLOOR - 0.2 - rnd() * 0.8 + Math.sin(now * 0.3 + i) * 0.01;
        const pt = proj(r, game, planeMul, yShift, x, y, z);
        if (!visible(r, pt)) continue;
        const s = Math.max(1.5, (r.height / pt.depth) * 0.03);
        ctx.fillStyle = i % 3 ? "rgba(170,220,255,0.75)" : "rgba(210,200,180,0.8)";
        ctx.fillRect(pt.x - s / 2, pt.y - s / 2, s, s * (i % 3 ? 1.6 : 1));
      }
    } else if (h.type === "loop" && !st.broken) {
      ctx.lineWidth = shifting ? 3 : 1;
      ctx.strokeStyle = shifting ? `rgba(120,255,230,${0.7 + 0.3 * Math.sin(now * 6)})` : "rgba(120,255,230,0.12)";
      for (const z of [FLOOR, WAIST, -0.4]) worldLine(ctx, r, game, planeMul, yShift, h.seamA.x, h.seamA.y, h.seamB.x, h.seamB.y, z, !shifting);
    }
  }
  ctx.restore();
}

function drawRifts(ctx, r, game, planeMul, yShift) {
  const cp = game.chronoPowers;
  for (const rift of cp?.rifts ?? []) {
    const age = cp.clock - rift.born;
    const open = Math.min(1, age / 0.4) * Math.min(1, (2.5 - age) / 0.6);
    const foot = proj(r, game, planeMul, yShift, rift.x, rift.y, FLOOR);
    const top = proj(r, game, planeMul, yShift, rift.x, rift.y, -0.6);
    if (!foot || !top || !visible(r, foot)) continue;
    const hgt = foot.y - top.y;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(foot.x - hgt * 0.2, 0, foot.x + hgt * 0.2, 0);
    g.addColorStop(0, "rgba(255,42,74,0)");
    g.addColorStop(0.5, `rgba(255,80,110,${0.8 * open})`);
    g.addColorStop(1, "rgba(255,42,74,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(foot.x, (foot.y + top.y) / 2, hgt * 0.16 * open, hgt / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * The Hound out of phase: its afterimages and footprints here, and the proxies
 * the sprite pass draws at a stuttered position.
 */
function houndShimmer(ctx, r, game, planeMul, yShift) {
  const out = [];
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.def?.phased || !e.active || !e._shimmer) continue;
    const s = e._shimmer;
    for (const step of s.steps) {
      const age = (game.chronoPowers?.clock ?? 0) - step.t;
      floorMark(ctx, r, game, planeMul, yShift, step.x, step.y, 0.18, `rgba(255,110,30,${Math.max(0, 0.45 - age * 0.08)})`);
    }
    if (!e._phased) continue;
    s.trail.forEach((t, i) => {
      if (i === 0) return;
      const ghost = proxyOf(e, `trail${i}`);
      ghost.x = t.x;
      ghost.y = t.y;
      ghost.renderAlpha = 0.16 / i;
      ghost._phased = false;
      out.push(ghost);
    });
    const jitter = (Math.random() - 0.5) * 0.08;
    const body = proxyOf(e, "shimmer");
    body.x = s.x + jitter;
    body.y = s.y;
    body.renderAlpha = 0.34 + 0.1 * Math.sin(performance.now() * 0.03);
    body._phased = false;
    body.state = e.state;
    out.push(body);
  }
  return out;
}

/**
 * The world pass. Call after renderScene, inside the same camera transform.
 * @param {object} game
 * @param {object} r - the Renderer
 * @param {number} planeMul
 * @param {number} yShift
 */
export function renderChronoWorld(game, r, planeMul, yShift) {
  if (game.mode !== "campaign" || !game.map?.grid) return;
  const ctx = r.ctx;
  const cp = game.chronoPowers;
  drawHazards(ctx, r, game, planeMul, yShift);
  drawRifts(ctx, r, game, planeMul, yShift);
  let sprites = houndShimmer(ctx, r, game, planeMul, yShift);
  if (cp?.lock) drawLock(ctx, r, game, planeMul, yShift, cp.lock);
  if (cp?.echo) {
    const left = Math.max(0, cp.echo.until - cp.clock);
    figure(ctx, r, game, planeMul, yShift, cp.echo.x, cp.echo.y, "#ff5fb4", 0.55 * Math.min(1, left / 0.5));
  }
  if (cp?.has("foresight") && game.player.chronoActive) sprites = sprites.concat(drawForesight(ctx, r, game, planeMul, yShift));
  if (sprites.length) {
    const shift = yShift | 0;
    ctx.save();
    if (shift) ctx.translate(0, shift);
    r.renderSprites(game.player, sprites, game.time, planeMul, undefined, undefined, game.player._drawDistance);
    ctx.restore();
  }
}

/** Screen-space Chronos: stasis desaturation, a crimson edge at high Resonance, the rewind flash. */
export function renderChronoScreen(game, ctx, w, h) {
  if (game.mode !== "campaign") return;
  const hz = game.chronoHazards;
  const cp = game.chronoPowers;
  if (hz?.inStasis) {
    ctx.save();
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "rgba(128,128,128,0.8)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(170,210,255,0.06)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const v = cp?.resonanceOn ? cp.res.value : 0;
  if (v >= 50) {
    const k = Math.min(1, (v - 50) / 50) * (0.55 + 0.45 * Math.sin(performance.now() * 0.006));
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, "rgba(255,20,50,0)");
    g.addColorStop(1, `rgba(255,20,50,${0.28 * k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  const echo = cp?.echo;
  if (echo && cp.clock - echo.born < 0.35) {
    const a = 1 - (cp.clock - echo.born) / 0.35;
    ctx.fillStyle = `rgba(255,95,180,${0.22 * a})`;
    ctx.fillRect(0, 0, w, h);
  }
}
