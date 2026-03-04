// ═══════════════════════════════════════════════════════════════════
// CLOCKWORK CARNAGE — WebSocket Server (Node.js)
// Minimal authoritative game server for arena co-op/PvP
// Run: node js/net/server.js [port]
// ═══════════════════════════════════════════════════════════════════

import { WebSocketServer, WebSocket } from "ws";
import { MSG, encode, decode, unpackInput } from "./protocol.js";

const PORT = parseInt(process.argv[2], 10) || 8080;
const TICK_RATE = 20; // server ticks per second
const TICK_MS = 1000 / TICK_RATE;
const MAX_PLAYERS = 8;
const ARENA_SIZE = 40; // units (matches game map grid)
const MOVE_SPEED = 5; // units per second
const MAX_HP = 100;
const BULLET_DAMAGE = 15;
const BULLET_SPEED = 20;
const BULLET_LIFETIME = 2; // seconds
const SPAWN_POINTS = [
  { x: 5, y: 5 },
  { x: 35, y: 5 },
  { x: 5, y: 35 },
  { x: 35, y: 35 },
  { x: 20, y: 5 },
  { x: 20, y: 35 },
  { x: 5, y: 20 },
  { x: 35, y: 20 },
];

// ── Game State ──────────────────────────────────────────────────
const players = new Map(); // id → { ws, x, y, angle, hp, kills, deaths, input, name }
const bullets = []; // { x, y, dx, dy, owner, ttl }
let nextId = 1;
let roundActive = false;
let roundTimer = 0;

// ── WebSocket Server ────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });
console.log(`[server] Clockwork Carnage arena on ws://localhost:${PORT}`);
console.log(`[server] Max ${MAX_PLAYERS} players, ${TICK_RATE} tick/s`);

wss.on("connection", (ws) => {
  if (players.size >= MAX_PLAYERS) {
    ws.send(encode(MSG.LEAVE, { reason: "server full" }));
    ws.close();
    return;
  }

  const id = nextId++;
  const spawn = SPAWN_POINTS[(id - 1) % SPAWN_POINTS.length];
  const player = {
    ws,
    x: spawn.x,
    y: spawn.y,
    angle: 0,
    hp: MAX_HP,
    kills: 0,
    deaths: 0,
    input: {
      forward: false,
      backward: false,
      left: false,
      right: false,
      angle: 0,
      shooting: false,
    },
    name: `Agent-${id}`,
    lastShot: 0,
  };
  players.set(id, player);

  // Send welcome with player id and current roster
  const roster = [];
  for (const [pid, p] of players) {
    if (pid !== id)
      roster.push({ id: pid, name: p.name, x: p.x, y: p.y, hp: p.hp });
  }
  ws.send(encode(MSG.WELCOME, { id, name: player.name, roster }));

  // Notify others
  broadcast(
    encode(MSG.PLAYER_JOIN, {
      id,
      name: player.name,
      x: player.x,
      y: player.y,
    }),
    id,
  );
  console.log(
    `[server] ${player.name} joined (${players.size}/${MAX_PLAYERS})`,
  );

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = decode(raw.toString());
    } catch {
      return; // malformed message — ignore
    }
    handleMessage(id, msg);
  });

  ws.on("close", () => {
    players.delete(id);
    broadcast(encode(MSG.PLAYER_LEAVE, { id }));
    console.log(`[server] Agent-${id} left (${players.size}/${MAX_PLAYERS})`);
  });
});

// ── Message Handler ─────────────────────────────────────────────
function handleMessage(id, msg) {
  const player = players.get(id);
  if (!player) return;

  switch (msg.type) {
    case MSG.INPUT:
      player.input = unpackInput(msg.data);
      break;

    case MSG.SHOOT: {
      const now = Date.now();
      if (now - player.lastShot < 200) break; // rate limit: 5 shots/sec
      player.lastShot = now;
      // Use input.angle (updated on MSG.INPUT) instead of player.angle
      // which only syncs on tick() — avoids stale aim direction
      const aimAngle = player.input.angle;
      const dx = Math.cos(aimAngle) * BULLET_SPEED;
      const dy = Math.sin(aimAngle) * BULLET_SPEED;
      bullets.push({
        x: player.x,
        y: player.y,
        dx,
        dy,
        owner: id,
        ttl: BULLET_LIFETIME,
      });
      break;
    }

    case MSG.CHAT: {
      const text = String(msg.data.text || "").slice(0, 200); // sanitize length
      broadcast(encode(MSG.CHAT_RELAY, { id, name: player.name, text }));
      break;
    }

    case MSG.PING:
      player.ws.send(encode(MSG.PONG, { t: msg.data.t }));
      break;
  }
}

// ── Game Loop ───────────────────────────────────────────────────
function tick(dt) {
  // Update players based on their input (server-authoritative movement)
  for (const [id, p] of players) {
    const inp = p.input;
    if (p.hp <= 0) continue;

    let mx = 0,
      my = 0;
    if (inp.forward) {
      mx += Math.cos(inp.angle);
      my += Math.sin(inp.angle);
    }
    if (inp.backward) {
      mx -= Math.cos(inp.angle);
      my -= Math.sin(inp.angle);
    }
    if (inp.left) {
      mx += Math.cos(inp.angle - Math.PI / 2);
      my += Math.sin(inp.angle - Math.PI / 2);
    }
    if (inp.right) {
      mx += Math.cos(inp.angle + Math.PI / 2);
      my += Math.sin(inp.angle + Math.PI / 2);
    }

    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      p.x += (mx / len) * MOVE_SPEED * dt;
      p.y += (my / len) * MOVE_SPEED * dt;
    }
    // Clamp to arena
    p.x = Math.max(0.5, Math.min(ARENA_SIZE - 0.5, p.x));
    p.y = Math.max(0.5, Math.min(ARENA_SIZE - 0.5, p.y));
    p.angle = inp.angle;
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    b.ttl -= dt;

    // Out of bounds or expired
    if (
      b.ttl <= 0 ||
      b.x < 0 ||
      b.x > ARENA_SIZE ||
      b.y < 0 ||
      b.y > ARENA_SIZE
    ) {
      bullets.splice(i, 1);
      continue;
    }

    // Hit detection against players
    for (const [id, p] of players) {
      if (id === b.owner || p.hp <= 0) continue;
      const dx = p.x - b.x,
        dy = p.y - b.y;
      if (dx * dx + dy * dy < 0.5) {
        // hit radius
        p.hp -= BULLET_DAMAGE;
        broadcast(encode(MSG.HIT, { target: id, hp: p.hp, attacker: b.owner }));
        if (p.hp <= 0) {
          p.deaths++;
          const attacker = players.get(b.owner);
          if (attacker) attacker.kills++;
          broadcast(encode(MSG.KILL, { killer: b.owner, victim: id }));
          // Respawn after 3 seconds
          setTimeout(() => respawn(id), 3000);
        }
        bullets.splice(i, 1);
        break;
      }
    }
  }

  // Broadcast state snapshot
  const state = [];
  for (const [id, p] of players) {
    state.push({
      id,
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
      a: Math.round(p.angle * 1000) / 1000,
      hp: p.hp,
      k: p.kills,
      d: p.deaths,
    });
  }
  const bulletState = bullets.map((b) => ({
    x: Math.round(b.x * 100) / 100,
    y: Math.round(b.y * 100) / 100,
    o: b.owner,
  }));
  broadcast(encode(MSG.STATE, { players: state, bullets: bulletState }));
}

function respawn(id) {
  const p = players.get(id);
  if (!p) return;
  const spawn = SPAWN_POINTS[(id - 1) % SPAWN_POINTS.length];
  p.x = spawn.x;
  p.y = spawn.y;
  p.hp = MAX_HP;
}

// ── Broadcast Utility ───────────────────────────────────────────
function broadcast(data, excludeId) {
  for (const [id, p] of players) {
    if (id !== excludeId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
    }
  }
}

// ── Start Loop ──────────────────────────────────────────────────
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  tick(dt);
}, TICK_MS);
