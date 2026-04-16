import { WALL_COLORS } from "../data/index.js";

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
