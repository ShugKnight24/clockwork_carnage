import { WALL_COLORS } from "../data/index.js";
import { isModernArt, isRealisticArt } from "../rendering/art-style.js";
import { drawPanel, pixelRatio, UI } from "./modern-ui-kit.js";

/**
 * Minimap rendering — pure function.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ map: object, entities: Array, player: object, chronoBombs: Array|null, objectiveWaypoint: object|null }} state
 */
export function drawMinimap(ctx, x, y, w, h, { map, entities, player, chronoBombs, objectiveWaypoint }) {
  if (!map) return;
  if (isModernArt()) {
    drawMinimapModern(ctx, x, y, w, h, { map, entities, player, chronoBombs, objectiveWaypoint });
    return;
  }

  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(0,200,255,0.3)";
  ctx.strokeRect(x, y, w, h);

  const scale = Math.min(w / map.width, h / map.height);
  const ox = x + (w - map.width * scale) / 2;
  const oy = y + (h - map.height * scale) / 2;

  // Draw walls
  for (let my = 0; my < map.height; my++) {
    for (let mx = 0; mx < map.width; mx++) {
      const tile = map.grid[my][mx];
      if (tile > 0) {
        const color = WALL_COLORS[tile];
        if (color) {
          ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        } else {
          ctx.fillStyle = "#444466";
        }
        ctx.fillRect(ox + mx * scale, oy + my * scale, scale, scale);
      }
    }
  }

  // Draw entities
  for (const e of entities) {
    if (!e.active) continue;
    if (e.type === "enemy") {
      ctx.fillStyle = e.def.color1;
      ctx.fillRect(ox + e.x * scale - 1.5, oy + e.y * scale - 1.5, 3, 3);
    } else if (e.type === "exit") {
      ctx.fillStyle = "#00ff88";
      ctx.fillRect(ox + e.x * scale - 2, oy + e.y * scale - 2, 4, 4);
    } else if (e.type !== "projectile") {
      ctx.fillStyle = e.type === "health" ? "#00ff44" : "#ffaa00";
      ctx.fillRect(ox + e.x * scale - 1, oy + e.y * scale - 1, 2, 2);
    }
  }

  // Player
  const px = ox + player.x * scale;
  const py = oy + player.y * scale;
  ctx.fillStyle = "#00ffcc";
  ctx.fillRect(px - 2, py - 2, 4, 4);

  // Player direction
  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(
    px + Math.cos(player.angle) * 8,
    py + Math.sin(player.angle) * 8,
  );
  ctx.stroke();

  // Chrono-bombs (pulsing orange circles)
  if (chronoBombs) {
    for (const bomb of chronoBombs) {
      if (!bomb.active) continue;
      const bx = ox + bomb.x * scale;
      const by = oy + bomb.y * scale;
      const progress = bomb.fuseLife / bomb.fuseDuration;
      const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 6);
      const alpha = 0.4 + 0.6 * pulse;
      ctx.fillStyle = `rgba(255,170,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(bx, by, bomb.radius * scale * progress, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Objective Waypoint
  if (objectiveWaypoint) {
    const bx = ox + objectiveWaypoint.x * scale;
    const by = oy + objectiveWaypoint.y * scale;
    const now = performance.now();
    const progress = (now % 1000) / 1000;
    const pulse = 0.5 + 0.5 * Math.sin((now / 800) * Math.PI * 2);
    ctx.fillStyle = `rgba(0,255,200,${0.3 + pulse * 0.7})`;
    ctx.beginPath();
    ctx.arc(bx, by, 2 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(0,255,200,${1 - progress})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, 3 + progress * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ─── Modern art style ───────────────────────────────────────────────────────

// Walls are the bulk of the minimap cost (one fillRect per tile per frame), so
// Modern bakes them into an offscreen layer and refreshes it twice a second —
// often enough for doors, far cheaper than redrawing every tile every frame.
let _wallLayer = null;
let _wallKey = "";
let _wallMap = null;
let _wallBuiltAt = 0;

function steelTint(c) {
  // Pull tile colours toward the steel palette so the map reads as one panel.
  const r = Math.round(c.r * 0.4 + 28 * 0.6);
  const g = Math.round(c.g * 0.4 + 39 * 0.6);
  const b = Math.round(c.b * 0.4 + 51 * 0.6);
  return `rgb(${r},${g},${b})`;
}

function wallLayer(ctx, map, w, h, scale) {
  const dpr = pixelRatio(ctx);
  const key = `${w}|${h}|${dpr}|${map.width}|${map.height}`;
  const now = performance.now();
  if (_wallLayer && _wallKey === key && _wallMap === map && now - _wallBuiltAt < 500) {
    return _wallLayer;
  }
  if (!_wallLayer) _wallLayer = document.createElement("canvas");
  const c = _wallLayer;
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil(h * dpr);
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const ox = (w - map.width * scale) / 2;
  const oy = (h - map.height * scale) / 2;
  const cache = {};
  // Ink pass slightly larger than the tiles gives every wall mass an outline.
  g.fillStyle = UI.ink;
  for (let my = 0; my < map.height; my++) {
    const row = map.grid[my];
    for (let mx = 0; mx < map.width; mx++) {
      if (row[mx] > 0) g.fillRect(ox + mx * scale - 0.75, oy + my * scale - 0.75, scale + 1.5, scale + 1.5);
    }
  }
  for (let my = 0; my < map.height; my++) {
    const row = map.grid[my];
    for (let mx = 0; mx < map.width; mx++) {
      const tile = row[mx];
      if (tile <= 0) continue;
      let fill = cache[tile];
      if (!fill) {
        const color = WALL_COLORS[tile];
        fill = cache[tile] = color ? steelTint(color) : "#3a4d61";
      }
      g.fillStyle = fill;
      g.fillRect(ox + mx * scale, oy + my * scale, scale, scale);
    }
  }
  _wallKey = key;
  _wallMap = map;
  _wallBuiltAt = now;
  return c;
}

function drawMinimapModern(ctx, x, y, w, h, { map, entities, player, chronoBombs, objectiveWaypoint }) {
  // Realistic: the HUD skin draws its own soft plate and hairline frame, and
  // markers drop their ink backing squares and outline.
  const real = isRealisticArt();
  if (!real) drawPanel(ctx, x - 3, y - 3, w + 6, h + 6, { variant: "glass", accent: UI.cyan, chamfer: 12 });

  const scale = Math.min(w / map.width, h / map.height);
  const ox = x + (w - map.width * scale) / 2;
  const oy = y + (h - map.height * scale) / 2;
  ctx.drawImage(wallLayer(ctx, map, w, h, scale), x, y, w, h);

  for (const e of entities) {
    if (!e.active) continue;
    const ex = ox + e.x * scale;
    const ey = oy + e.y * scale;
    if (e.type === "enemy") {
      if (!real) {
        ctx.fillStyle = UI.ink;
        ctx.fillRect(ex - 2.5, ey - 2.5, 5, 5);
      }
      ctx.fillStyle = UI.crimson;
      ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
    } else if (e.type === "exit") {
      if (!real) {
        ctx.fillStyle = UI.ink;
        ctx.fillRect(ex - 3.5, ey - 3.5, 7, 7);
      }
      ctx.fillStyle = UI.green;
      ctx.fillRect(ex - 2.5, ey - 2.5, 5, 5);
    } else if (e.type !== "projectile") {
      ctx.fillStyle = e.type === "health" ? UI.green : UI.amber;
      ctx.fillRect(ex - 1, ey - 1, 2, 2);
    }
  }

  if (chronoBombs) {
    for (const bomb of chronoBombs) {
      if (!bomb.active) continue;
      const progress = bomb.fuseLife / bomb.fuseDuration;
      const p = 0.5 + 0.5 * Math.sin(progress * Math.PI * 6);
      ctx.fillStyle = `rgba(255,174,58,${0.4 + 0.6 * p})`;
      ctx.beginPath();
      ctx.arc(ox + bomb.x * scale, oy + bomb.y * scale, bomb.radius * scale * progress, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (objectiveWaypoint) {
    const bx = ox + objectiveWaypoint.x * scale;
    const by = oy + objectiveWaypoint.y * scale;
    const now = performance.now();
    const progress = (now % 1000) / 1000;
    ctx.strokeStyle = `rgba(0,255,204,${1 - progress})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, 3 + progress * 7, 0, Math.PI * 2);
    ctx.stroke();
    if (!real) {
      ctx.fillStyle = UI.ink;
      ctx.fillRect(bx - 3, by - 3, 6, 6);
    }
    ctx.fillStyle = UI.energy;
    ctx.fillRect(bx - 2, by - 2, 4, 4);
  }

  // Player: view cone + inked arrowhead.
  const px = ox + player.x * scale;
  const py = oy + player.y * scale;
  const a = player.angle;
  ctx.fillStyle = "rgba(34,230,255,0.14)";
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, 18, a - 0.5, a + 0.5);
  ctx.closePath();
  ctx.fill();
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const tip = 6;
  const back = 4;
  const half = 3.5;
  ctx.beginPath();
  ctx.moveTo(px + ca * tip, py + sa * tip);
  ctx.lineTo(px - ca * back - sa * half, py - sa * back + ca * half);
  ctx.lineTo(px - ca * back * 0.4, py - sa * back * 0.4);
  ctx.lineTo(px - ca * back + sa * half, py - sa * back - ca * half);
  ctx.closePath();
  if (!real) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = UI.ink;
    ctx.stroke();
  }
  ctx.fillStyle = real ? "#8fbcc4" : UI.cyan;
  ctx.fill();
}
