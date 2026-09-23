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
 *               band, pistons' footprints, trains, stasis motes, the loop's
 *               seam, hunter rifts
 *   the Hound   a heat-shimmer drawn from a stuttered position with a trail
 *               of afterimages and scorched footprints; solid while you shift
 *
 * `renderChronoScreen` adds the screen-space parts: the stasis room's
 * desaturation and a crimson edge when Resonance is high.
 */
import { predictEnemy, windupLine, projectilePath } from "../systems/chrono-powers.js";
import { hazardState } from "../systems/chrono-hazards.js";
import { pendingReplay, FORM2 } from "../systems/boss-form2.js";

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

/** A standing figure (the echo): capsule body and head, `alpha` 0..1. `top` lowers the head for a kneeling one. */
function figure(ctx, r, game, planeMul, yShift, x, y, color, alpha, top = HEAD) {
  const foot = proj(r, game, planeMul, yShift, x, y, FLOOR);
  const head = proj(r, game, planeMul, yShift, x, y, top);
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
    const g = predictEnemy(e, game.map, cp?.spec?.("foresight").horizon);
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
      // The Archive's replaying blast is violet-white, and Foresight (in a
      // shift) counts it down: the marks fill as the eleven seconds run out.
      const hot = h.blast ? "210,160,255" : "255,120,40";
      const glow = h.blast ? "235,210,255" : "255,170,60";
      const seen = h.blast && shifting && game.chronoPowers?.has("foresight");
      const t = h.blast ? ((((hz.clock + (h.phase ?? 0)) % h.period) + h.period) % h.period) / h.period : 0;
      for (let row = r1; row <= r2; row++) {
        for (let col = c1; col <= c2; col++) {
          if (game.map.grid[row]?.[col] !== 0) continue;
          const x = col + 0.5, y = row + 0.5;
          if (st.on) {
            const flick = 0.75 + 0.25 * Math.sin(now * 20 + col * 1.7 + row);
            ctx.globalCompositeOperation = "lighter";
            worldPane(ctx, r, game, planeMul, yShift, x - 0.45, y, x + 0.45, y, (h.blast ? -0.6 : -0.25) * flick, `rgba(${hot},0.22)`, 2);
            ctx.globalCompositeOperation = "source-over";
            floorMark(ctx, r, game, planeMul, yShift, x, y, 0.45, `rgba(${glow},0.45)`);
          } else if (st.priming) {
            const beat = h.blast ? 0.3 + 0.25 * Math.sin(now * 14) : 0.3;
            floorMark(ctx, r, game, planeMul, yShift, x, y, 0.42, `rgba(${hot},${beat})`);
          } else if (seen) {
            floorMark(ctx, r, game, planeMul, yShift, x, y, 0.42, `rgba(${hot},${0.08 + 0.2 * t})`);
          } else {
            floorMark(ctx, r, game, planeMul, yShift, x, y, 0.42, h.blast ? "rgba(40,30,60,0.5)" : "rgba(60,30,20,0.55)");
          }
        }
      }
    } else if (h.type === "rewrite") {
      // A wall that is not there yet: its ghost on the floor, flickering
      // when it is about to close, brighter while you shift.
      const p = game.player;
      if (st.closed) continue;
      const a = st.priming ? 0.35 + 0.3 * Math.sin(now * 16) : shifting ? 0.28 : 0.1;
      for (const [c, rr] of h.cells) {
        if (game.map.grid[rr]?.[c] !== 0) continue;
        if (Math.hypot(c + 0.5 - p.x, rr + 0.5 - p.y) > 18) continue;
        floorMark(ctx, r, game, planeMul, yShift, c + 0.5, rr + 0.5, 0.48, `rgba(190,120,255,${a})`);
        if (st.priming || shifting) {
          ctx.strokeStyle = `rgba(210,160,255,${a})`;
          ctx.lineWidth = 1;
          worldLine(ctx, r, game, planeMul, yShift, c + 0.05, rr + 0.5, c + 0.95, rr + 0.5, -0.45, true);
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
    } else if (h.type === "piston") {
      // Closed, the crusher is wall (the grid draws it). Open, its footprint
      // is striped on the deck, and flashes the half-second before it slams.
      if (st.closed) continue;
      const [c1, r1, c2, r2] = h.rect;
      const warn = st.priming ? 0.35 + 0.3 * Math.sin(now * 24) : 0.14;
      for (let row = r1; row <= r2; row++) {
        for (let col = c1; col <= c2; col++) {
          if (game.map.grid[row]?.[col] !== 0) continue;
          floorMark(ctx, r, game, planeMul, yShift, col + 0.5, row + 0.5, 0.42, `rgba(255,${st.priming ? 60 : 150},30,${warn})`);
        }
      }
    } else if (h.type === "train") {
      drawTrain(ctx, r, game, planeMul, yShift, h, st, now);
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
      // The people the instant caught: still as a photograph, until it breaks.
      const fade = st.broken ? Math.max(0, 1 - (hz.clock - hz.triggers[h.id]) / 1.2) : 1;
      for (const f of h.figures ?? []) {
        if (fade <= 0) break;
        const top = f.pose === "kneel" ? FLOOR - (FLOOR - HEAD) * 0.55 : HEAD;
        floorMark(ctx, r, game, planeMul, yShift, f.x, f.y, 0.3, `rgba(255,255,255,${0.12 * fade})`);
        figure(ctx, r, game, planeMul, yShift, f.x, f.y, f.color, 0.6 * fade, top);
      }
    } else if (h.type === "loop" && !st.broken) {
      // Foresight shows the seam where the loop does not match itself.
      const seen = shifting || !!game.chronoPowers?.foresightOn?.(game.player);
      ctx.lineWidth = seen ? 3 : 1;
      ctx.strokeStyle = seen ? `rgba(120,255,230,${0.7 + 0.3 * Math.sin(now * 6)})` : "rgba(120,255,230,0.12)";
      for (const z of [FLOOR, WAIST, -0.4]) worldLine(ctx, r, game, planeMul, yShift, h.seamA.x, h.seamA.y, h.seamB.x, h.seamB.y, z, !seen);
    }
  }
  ctx.restore();
}

/**
 * An objective's stations: the one you can work now pulses in the
 * objective's colour and fills as you hold; cleared ones go dark.
 */
function drawObjective(ctx, r, game, planeMul, yShift) {
  const o = game.chronoHazards?.objective;
  if (!o || o.done) return;
  const now = performance.now() / 1000;
  const next = o.stations.find((s) => !o.cleared.includes(s.id));
  const [cr, cg, cb] = hexToRgb(o.color ?? "#ffae3a");
  ctx.save();
  for (const s of o.stations) {
    const cleared = o.cleared.includes(s.id);
    const live = !cleared && (!o.order || s === next);
    const [c1, r1, c2, r2] = s.rect;
    const held = Math.min(1, (o.held[s.id] ?? 0) / o.hold);
    for (let row = r1; row <= r2; row++) {
      for (let col = c1; col <= c2; col++) {
        const a = cleared ? 0.1 : live ? 0.18 + 0.12 * Math.sin(now * 5) + 0.35 * held : 0.08;
        const fill = cleared ? `rgba(80,80,90,${a})` : `rgba(${cr},${cg},${cb},${a})`;
        floorMark(ctx, r, game, planeMul, yShift, col + 0.5, row + 0.5, 0.34, fill);
      }
    }
    if (live) {
      // A beacon over the station, taller as the hold completes.
      const cx = (c1 + c2 + 1) / 2, cy = (r1 + r2 + 1) / 2;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.8)`;
      ctx.lineWidth = 2;
      const top = FLOOR - 0.3 - 0.8 * held;
      for (let k = 0; k < 4; k++) {
        const a0 = (k / 4) * Math.PI * 2 + now;
        worldLine(ctx, r, game, planeMul, yShift, cx + Math.cos(a0) * 0.4, cy + Math.sin(a0) * 0.4,
          cx + Math.cos(a0 + Math.PI / 2) * 0.4, cy + Math.sin(a0 + Math.PI / 2) * 0.4, top);
      }
    }
  }
  ctx.restore();
}

/**
 * Form 2's tells. Counter-shift: while you shift, a clock face on the floor
 * round him fills from gold to crimson; when it closes he takes your shift.
 * Replay: every origin of the volley about to replay is marked, and in a
 * shift Foresight draws where each round will fly.
 */
function drawForm2(ctx, r, game, planeMul, yShift) {
  const p = game.player;
  const now = performance.now() / 1000;
  const foresight = p.chronoActive && game.chronoPowers?.has("foresight");
  ctx.save();
  for (const e of game.entities) {
    if (e.type !== "enemy" || !e.active || e.state === "dead" || e.dissolving) continue;
    const charge = e.def?.counterShift ? e._counterCharge ?? 0 : 0;
    const c = charge > 0 ? proj(r, game, planeMul, yShift, e.x, e.y, -0.05) : null;
    if (c && visible(r, c)) {
      // A clock face standing over him, facing you: it fills from gold to
      // crimson as his hand closes, and when the hand reaches twelve he has it.
      const R = Math.max(14, Math.min(220, (r.height / c.depth) * 0.75));
      const k = Math.min(1, charge);
      const warm = k < 0.5;
      ctx.lineWidth = Math.max(2, R * 0.12);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = warm ? "rgba(255,211,106,0.9)" : `rgba(255,42,74,${0.75 + 0.25 * Math.sin(now * 18)})`;
      ctx.beginPath();
      ctx.arc(c.x, c.y, R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
      const hand = -Math.PI / 2 + k * Math.PI * 2;
      ctx.strokeStyle = "rgba(255,240,220,0.9)";
      ctx.lineWidth = Math.max(1.5, R * 0.05);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + Math.cos(hand) * R * 0.85, c.y + Math.sin(hand) * R * 0.85);
      ctx.stroke();
    }
    for (const s of e.def?.replay ? pendingReplay(e) : []) {
      const soon = Math.max(0, Math.min(1, 1 - s.in));
      floorMark(ctx, r, game, planeMul, yShift, s.x, s.y, 0.25 + 0.2 * soon, `rgba(197,139,255,${0.35 + 0.4 * soon})`);
      ctx.strokeStyle = `rgba(230,200,255,${0.4 + 0.5 * soon})`;
      ctx.lineWidth = 2;
      worldLine(ctx, r, game, planeMul, yShift, s.x - 0.2, s.y, s.x + 0.2, s.y, WAIST);
      worldLine(ctx, r, game, planeMul, yShift, s.x, s.y - 0.2, s.x, s.y + 0.2, WAIST);
      if (foresight) {
        ctx.strokeStyle = "rgba(197,139,255,0.55)";
        ctx.lineWidth = 1.5;
        worldLine(ctx, r, game, planeMul, yShift, s.x, s.y, s.x + s.dx * 8, s.y + s.dy * 8, WAIST, true);
      }
    }
  }
  ctx.restore();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A train on its line: a long dark carriage, its two flanks and nose drawn
 * as panes with a strip of lit windows, a headlight, and warning lamps on
 * the track while the horn sounds (the next run is close).
 */
function drawTrain(ctx, r, game, planeMul, yShift, h, st, now) {
  const len = Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y);
  const ux = (h.b.x - h.a.x) / len;
  const uy = (h.b.y - h.a.y) / len;
  const nx = -uy;
  const ny = ux;
  const at = (d, side) => ({ x: h.a.x + ux * d + nx * side, y: h.a.y + uy * d + ny * side });
  if (!st.span) {
    if (!st.horn) return;
    // Lamps along the track edge, blinking in a run toward the train's way.
    const blink = 0.5 + 0.5 * Math.sin(now * 14);
    for (let d = 2; d < len; d += 4) {
      for (const side of [-h.half, h.half]) {
        const p = at(d, side);
        floorMark(ctx, r, game, planeMul, yShift, p.x, p.y, 0.16, `rgba(255,60,40,${0.3 + 0.5 * blink})`);
      }
    }
    return;
  }
  const { head, tail } = st.span;
  if (head - tail < 0.05) return;
  const w = h.half * 0.92;
  const TOP = -0.3;
  const body = "rgba(34,30,28,0.97)";
  // Flanks: dark carriage with a band of lit windows.
  for (const side of [-w, w]) {
    const a = at(tail, side);
    const b = at(head, side);
    worldPane(ctx, r, game, planeMul, yShift, a.x, a.y, b.x, b.y, TOP, body, Math.max(4, Math.ceil((head - tail) * 2)));
    worldPane(ctx, r, game, planeMul, yShift, a.x, a.y, b.x, b.y, -0.02, (u) => ((u * (head - tail)) % 1.2 < 0.8 ? "rgba(255,214,140,0.9)" : "rgba(40,36,34,0.95)"),
      Math.max(6, Math.ceil((head - tail) * 3)), 0.12);
  }
  // The nose, and its headlight.
  const n0 = at(head, -w);
  const n1 = at(head, w);
  worldPane(ctx, r, game, planeMul, yShift, n0.x, n0.y, n1.x, n1.y, TOP, "rgba(60,54,48,0.98)", 4);
  const lamp = proj(r, game, planeMul, yShift, at(head + 0.05, 0).x, at(head + 0.05, 0).y, 0.15);
  if (visible(r, lamp)) {
    const s = Math.max(3, (r.height / lamp.depth) * 0.12);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,240,200,0.9)";
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
  drawObjective(ctx, r, game, planeMul, yShift);
  drawForm2(ctx, r, game, planeMul, yShift);
  drawRifts(ctx, r, game, planeMul, yShift);
  let sprites = houndShimmer(ctx, r, game, planeMul, yShift);
  if (cp?.lock) drawLock(ctx, r, game, planeMul, yShift, cp.lock);
  if (cp?.echo) {
    const left = Math.max(0, cp.echo.until - cp.clock);
    figure(ctx, r, game, planeMul, yShift, cp.echo.x, cp.echo.y, "#ff5fb4", 0.55 * Math.min(1, left / 0.5));
  }
  if (cp?.foresightOn?.(game.player)) sprites = sprites.concat(drawForesight(ctx, r, game, planeMul, yShift));
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
  // Form 2: his hand closing on your shift pulses the edges crimson; once he
  // has it, the world goes grey-violet and slow until you are yours again.
  let reach = 0;
  for (const e of game.entities) if (e.def?.counterShift && e.active) reach = Math.max(reach, e._counterCharge ?? 0);
  if (reach >= 0.5 && game.player.chronoActive) {
    const k = (reach - 0.5) / 0.5;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, "rgba(255,42,74,0)");
    g.addColorStop(1, `rgba(255,42,74,${(0.25 + 0.4 * k) * (0.6 + 0.4 * Math.sin(performance.now() * (0.01 + 0.02 * k)))})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  const held = game.player.counterShifted ?? 0;
  if (held > 0) {
    const k = Math.min(1, held / FORM2.counterShift.slowFor + 0.3);
    ctx.save();
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = `rgba(128,128,128,${0.6 * k})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, "rgba(120,40,200,0.05)");
    g.addColorStop(1, `rgba(120,40,200,${0.5 * k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // Reactor heat: the edges glow as the core climbs, and flash on overload.
  const o = hz?.objective;
  if (o?.heatClock && o.heatOn && !o.done) {
    const k = Math.max(0, (o.heat - 55) / 45);
    if (k > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(255,90,20,0)");
      g.addColorStop(1, `rgba(255,90,20,${0.3 * k * (0.7 + 0.3 * Math.sin(performance.now() * 0.008))})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (o.overloadAt != null && hz.clock - o.overloadAt < 0.5) {
      ctx.fillStyle = `rgba(255,170,90,${0.4 * (1 - (hz.clock - o.overloadAt) / 0.5)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
  const echo = cp?.echo;
  if (echo && cp.clock - echo.born < 0.35) {
    const a = 1 - (cp.clock - echo.born) / 0.35;
    ctx.fillStyle = `rgba(255,95,180,${0.22 * a})`;
    ctx.fillRect(0, 0, w, h);
  }
  const stop = cp?.stop?.view?.();
  if (stop) drawStoppedTime(ctx, w, h, stop);
}

/**
 * Eleven Seconds on screen. The telegraph: a white ring closing on you and
 * the colour draining. The stop: the world grey and still, and his clock in
 * the middle of the sky, counting down his eleven seconds. His window is
 * cooler (your time) and says so.
 */
function drawStoppedTime(ctx, w, h, { phase, frac, seconds, stop }) {
  const cx = w / 2;
  const cy = h / 2;
  const big = Math.hypot(w, h) / 2;
  ctx.save();
  if (phase === "telegraph") {
    const r = big * (1 - frac * 0.82);
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = `rgba(128,128,128,${0.6 * frac})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.5 * frac})`;
    ctx.lineWidth = Math.max(2, h * 0.006);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const yours = phase === "window";
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = "rgba(128,128,128,0.92)";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
  const edge = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, big);
  edge.addColorStop(0, yours ? "rgba(150,230,255,0.04)" : "rgba(255,255,255,0.06)");
  edge.addColorStop(1, yours ? "rgba(90,200,255,0.3)" : "rgba(255,240,250,0.34)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  // His clock.
  const size = Math.round(Math.min(w, h) * 0.075);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${size}px "Courier New", monospace`;
  const secs = Math.ceil(seconds);
  const label = `00:${String(secs).padStart(2, "0")}`;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillText(label, cx + 2, h * 0.16 + 2);
  ctx.fillStyle = yours ? "#9fe8ff" : "#ffffff";
  ctx.fillText(label, cx, h * 0.16);
  ctx.font = `600 ${Math.round(size * 0.3)}px "Courier New", monospace`;
  ctx.fillStyle = yours ? "rgba(159,232,255,0.9)" : "rgba(255,255,255,0.75)";
  ctx.fillText(yours ? "EVERYTHING STOPPED BUT YOU" : stop === 0 ? "HIS ELEVEN SECONDS" : "", cx, h * 0.16 + size * 0.75);
  ctx.restore();
}
