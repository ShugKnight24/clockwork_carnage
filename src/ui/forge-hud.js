/**
 * The Forge's HUD. Drawing only: every function reads the forge it is handed
 * and never writes it, so the HUD can be tested without a ForgeMode — and
 * `js/forge.js` is left to the world and the input that edits it.
 *
 * Nothing here imports `js/forge.js`: the presentational constants live here,
 * and the one piece of state the drawing needs computed — the craft rows,
 * which clamp `craftIndex` — is called as `forge._craftRows()` rather than
 * reimplemented, so there is no cycle back into the Forge.
 */
import { ENEMY_TYPES } from "../../js/data.js";
import { AIR, BLOCKS } from "../world/blocks.js";
import { World } from "../world/world.js";
import { SKILLS, MAX_LEVEL, xpForLevel } from "../rpg/skills.js";
import { bestTool as bestToolOf } from "../rpg/tools.js";
import { blockForItem } from "../rpg/items.js";
import { HOTBAR_SLOTS } from "../rpg/inventory.js";
import { renderInventory, slotVisual, TOOL_COLOR } from "./forge-inventory.js";

// All placeable enemy type keys (exclude boss forms — they're phase variants)
export const ENEMY_KEYS = Object.keys(ENEMY_TYPES).filter(
  (k) => k !== "boss_form2" && k !== "boss_form3",
);
const ENEMY_SHORT_NAMES = {};
for (const k of ENEMY_KEYS) ENEMY_SHORT_NAMES[k] = ENEMY_TYPES[k].name;

export const PICKUP_TYPES = ["health", "ammo", "weapon"];
const PICKUP_LABELS = { health: "Health", ammo: "Ammo", weapon: "Weapon" };
const PICKUP_COLORS = { health: "#44ff44", ammo: "#ffcc00", weapon: "#00ccff" };

const HOTBAR_VISIBLE = 10;

/**
 * The slice of the palette to draw, always containing `selected`.
 * @returns {{start:number,end:number}} half-open range of indices
 */
export function hotbarWindow(selected, total, visible) {
  const span = Math.max(1, Math.min(visible, total));
  const start = Math.max(0, Math.min(selected - (span >> 1), total - span));
  return { start, end: start + span };
}

const FACE_LABELS = [
  [0, 0, 1, "Top"],
  [0, 0, -1, "Bottom"],
  [1, 0, 0, "+X"],
  [-1, 0, 0, "-X"],
  [0, 1, 0, "+Y"],
  [0, -1, 0, "-Y"],
];

function faceLabel(face) {
  if (!face) return "";
  for (const [x, y, z, label] of FACE_LABELS) {
    if (face[0] === x && face[1] === y && face[2] === z) return label;
  }
  return "";
}

/**
 * Draws the Forge's HUD. Pure with respect to the forge: it reads state and
 * never writes it, so the drawing can be tested without a ForgeMode.
 */
export function renderForge(forge, ctx, w, h) {
  if (!forge.world) return;
  if (forge.overhead) renderOverhead(forge, ctx, w, h);
  else renderHUD(forge, ctx, w, h);
  // The screen draws over the HUD, and only survival ever opens it.
  if (forge.invOpen) renderInventory(forge, ctx, w, h);
}

export function renderHUD(forge, ctx, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = forge.target ? "#00ffcc" : "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy);
  ctx.lineTo(cx - 4, cy);
  ctx.moveTo(cx + 4, cy);
  ctx.lineTo(cx + 12, cy);
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx, cy - 4);
  ctx.moveTo(cx, cy + 4);
  ctx.lineTo(cx, cy + 12);
  ctx.stroke();

  if (forge.target) {
    const t = forge.target;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `[${t.x},${t.y},${t.z}] ${BLOCKS[t.id]?.name || "?"}  ${faceLabel(t.face)}`,
      cx,
      cy + 22,
    );
    ctx.textAlign = "left";
  }

  renderHotbar(forge, ctx, w, h);
  renderToolLabel(forge, ctx, w, h);
  if (forge.survival) renderSurvival(forge, ctx, w, h);

  if (forge.showHelp && !forge.suppressHelp) renderHelp(forge, ctx);
  renderStatus(forge, ctx, w, h);

  if (forge.saveFlash > 0) {
    ctx.fillStyle = `rgba(0,255,200,${Math.min(1, forge.saveFlash) * 0.9})`;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("WORLD SAVED", w / 2, 36);
    ctx.textAlign = "left";
  }
  if (forge.notice) {
    ctx.fillStyle = `rgba(255,120,80,${Math.min(1, forge.notice.t)})`;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(forge.notice.text, w / 2, 76);
    ctx.textAlign = "left";
  }
  if (forge.storageFailed) {
    ctx.fillStyle = "rgba(255,80,60,0.9)";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "STORAGE UNAVAILABLE — EDITS WON'T BE SAVED",
      w / 2,
      96,
    );
    ctx.textAlign = "left";
  }

  const slot = forge.mapIndex.findIndex((e) => e.id === forge.currentSlot);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    `${forge.world.meta.name} [${slot + 1}/${Math.max(1, forge.mapIndex.length)}]`,
    w / 2,
    56,
  );
  ctx.textAlign = "left";
}

/**
 * What the in-play hotbar draws. Survival shows the nine inventory slots with
 * counts and wear; creative shows its unlimited palette, unchanged.
 *
 * The creative palette is read back off the forge rather than imported, for
 * the same reason `_craftRows` is: importing `js/forge.js` here would be a
 * cycle.
 * @returns {Array<{blockId:number|null,count:number,wear:number|null,label:string}>}
 */
export function hotbarCells(forge) {
  if (!forge.survival) {
    return forge._palette().map((id) => ({
      blockId: id, count: 0, wear: null, label: BLOCKS[id].name,
    }));
  }
  return forge.survival.inventory.slots.slice(0, HOTBAR_SLOTS).map((s) => {
    const v = slotVisual(s);
    return {
      blockId: s ? blockForItem(s.item) : null,
      count: v.count, wear: v.wear, label: v.label,
    };
  });
}

/** The colour a cell is filled with: its block's, a tool's, or nothing. */
function cellColor(c) {
  if (c.blockId != null) return BLOCKS[c.blockId].color;
  return c.label ? TOOL_COLOR : null;
}

export function renderHotbar(forge, ctx, w, h) {
  const cell = 34;
  const gap = 4;
  const cells = hotbarCells(forge);
  const survival = !!forge.survival;
  const total = cells.length;
  // Survival is exactly nine cells, so the strip holds every one of them and
  // windowing is a creative-only concern — its palette outruns the strip.
  const sel = survival
    ? forge.hotbarIndex
    : Math.max(0, cells.findIndex((c) => c.blockId === forge.tile));
  const { start, end } = survival
    ? { start: 0, end: total }
    : hotbarWindow(sel, total, HOTBAR_VISIBLE);
  const shown = end - start;
  const barW = shown * (cell + gap) - gap;
  const x0 = (w - barW) / 2;
  const y0 = h - 58;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.roundRect(x0 - 10, y0 - 30, barW + 20, cell + 46, 8);
  ctx.fill();

  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(
    survival ? cells[sel]?.label || "" : BLOCKS[forge.tile]?.name || "",
    w / 2,
    y0 - 12,
  );

  for (let i = start; i < end; i++) {
    const c = cells[i];
    const x = x0 + (i - start) * (cell + gap);
    const selected = survival ? i === sel : c.blockId === forge.tile;
    const color = cellColor(c);
    // An empty survival slot still needs a cell, or the strip loses its shape.
    ctx.fillStyle = color || "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y0, cell, cell);
    if (selected) {
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y0 - 2, cell + 4, cell + 4);
    }
    if (c.count) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(c.count), x + cell - 3, y0 + cell - 4);
      ctx.textAlign = "center";
    }
    if (c.wear != null) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x + 4, y0 + cell - 8, cell - 8, 3);
      ctx.fillStyle = c.wear > 0.25 ? "rgba(0,255,200,0.8)" : "rgba(255,120,80,0.9)";
      ctx.fillRect(x + 4, y0 + cell - 8, (cell - 8) * c.wear, 3);
    }
    ctx.fillStyle = selected ? "#ffffff" : "rgba(255,255,255,0.4)";
    ctx.font = "bold 10px monospace";
    ctx.fillText(
      survival ? String(i + 1) : c.blockId <= 9 ? String(c.blockId) : "0",
      x + cell / 2,
      y0 + cell + 12,
    );
  }
  // Scroll arrows so it is clear the palette runs past the window.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "bold 12px monospace";
  if (start > 0) ctx.fillText("‹", x0 - 14, y0 + cell / 2 + 4);
  if (end < total) ctx.fillText("›", x0 + barW + 14, y0 + cell / 2 + 4);
  ctx.textAlign = "left";
}

export function renderToolLabel(forge, ctx, w, h) {
  const labels = {
    block: "BLOCK",
    spawn: "SPAWN",
    pickup: "PICKUP",
    exit: "EXIT",
    start: "START",
  };
  const colors = {
    block: "#00ffcc",
    spawn: "#ff6644",
    pickup: "#ffcc00",
    exit: "#00ccff",
    start: "#ffffff",
  };
  const y = h - 58;
  ctx.fillStyle = colors[forge.toolMode] || "#00ffcc";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`TOOL: ${labels[forge.toolMode] || "BLOCK"}`, w / 2, y - 28);

  ctx.font = "bold 11px monospace";
  if (forge.toolMode === "spawn") {
    const key = ENEMY_KEYS[forge.selectedEnemy] || "drone";
    ctx.fillStyle = ENEMY_TYPES[key]?.color1 || "#ff6644";
    ctx.fillText(
      `[G] ${ENEMY_SHORT_NAMES[key] || key} (${forge.selectedEnemy + 1}/${ENEMY_KEYS.length})`,
      w / 2,
      y - 44,
    );
  } else if (forge.toolMode === "pickup") {
    const key = PICKUP_TYPES[forge.selectedPickup];
    ctx.fillStyle = PICKUP_COLORS[key] || "#ffcc00";
    ctx.fillText(
      `[G] ${PICKUP_LABELS[key] || key} (${forge.selectedPickup + 1}/${PICKUP_TYPES.length})`,
      w / 2,
      y - 44,
    );
  } else if (forge.toolMode === "exit") {
    const has = !!forge.world.meta.exit;
    ctx.fillStyle = has ? "#00ccff" : "rgba(0,204,255,0.5)";
    ctx.fillText(
      has ? "EXIT PLACED — R-click to remove" : "L-click to place exit",
      w / 2,
      y - 44,
    );
  } else if (forge.toolMode === "start") {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("L-click to move the play-test start", w / 2, y - 44);
  }
  ctx.textAlign = "left";
}

/**
 * Everything the RPG adds to the HUD, behind the one `survival` check the
 * rest of the Forge is built on: a creative world draws exactly as before.
 */
export function renderSurvival(forge, ctx, w, h) {
  if (forge.breakProgress > 0) renderBreakRing(forge, ctx, w / 2, h / 2);
  renderSkills(forge, ctx, w, h);
  if (forge.craftOpen) renderCraftMenu(forge, ctx, w, h);
}

/** Ring around the crosshair, closing as the targeted block gives way. */
export function renderBreakRing(forge, ctx, cx, cy) {
  const r = 20;
  const end = -Math.PI / 2 + Math.PI * 2 * Math.min(1, forge.breakProgress);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#00ffcc";
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, end);
  ctx.stroke();
}

/** Level and progress to the next one, bottom-left, clear of the hotbar. */
export function renderSkills(forge, ctx, w, h) {
  // Bare hands wear out on nothing, so the panel only grows the wear row
  // once a tool is actually held.
  const { tool, slot } = bestToolOf(forge.survival.inventory);
  const panelW = 190;
  const panelH = 26 + (SKILLS.length + (slot >= 0 ? 1 : 0)) * 22;
  const x0 = 14;
  const y0 = h - 14 - panelH;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.roundRect(x0, y0, panelW, panelH, 8);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "bold 11px monospace";
  ctx.fillText(
    forge.craftOpen ? "SURVIVAL — [C] CLOSE" : "SURVIVAL — [C] CRAFT",
    x0 + 10,
    y0 + 16,
  );

  const skills = forge.survival.skills;
  const barW = panelW - 20;
  for (let i = 0; i < SKILLS.length; i++) {
    const s = SKILLS[i];
    const level = skills.level(s.id);
    const y = y0 + 34 + i * 22;
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${s.name} Lv ${level}`, x0 + 10, y);

    // Levels come from xp, so the bar is the same derivation, not a store.
    const base = xpForLevel(level);
    const next = xpForLevel(level + 1);
    const frac =
      level >= MAX_LEVEL
        ? 1
        : Math.max(0, Math.min(1, ((skills.xp[s.id] || 0) - base) / (next - base)));
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x0 + 10, y + 5, barW, 3);
    ctx.fillStyle = "rgba(0,255,200,0.6)";
    ctx.fillRect(x0 + 10, y + 5, barW * frac, 3);
  }

  // Tool wear, under the skills. Nothing is drawn bare-handed.
  if (slot >= 0) {
    const barY = y0 + 34 + SKILLS.length * 22;
    const dur = forge.survival.inventory.slots[slot].dur;
    const frac = Math.max(0, Math.min(1, dur / tool.durability));
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px monospace";
    ctx.fillText(`${tool.name} ${dur}/${tool.durability}`, x0 + 10, barY);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x0 + 10, barY + 5, barW, 3);
    ctx.fillStyle = frac > 0.25 ? "rgba(0,255,200,0.6)" : "rgba(255,120,80,0.8)";
    ctx.fillRect(x0 + 10, barY + 5, barW * frac, 3);
  }
}

/**
 * Everything craftable without a station. Locked rows are dimmed warm, rows
 * whose inputs are missing are dimmed grey, and both carry their own reason.
 */
export function renderCraftMenu(forge, ctx, w, h) {
  const rows = forge._craftRows();
  const rowH = 34;
  const panelW = 360;
  /** Title plus the line naming the stations in reach. */
  const headH = 46;
  const panelH = headH + rows.length * rowH + 26;
  const x0 = (w - panelW) / 2;
  const y0 = (h - panelH) / 2;

  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.beginPath();
  ctx.roundRect(x0, y0, panelW, panelH, 8);
  ctx.fill();

  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillText("CRAFT", w / 2, y0 + 20);

  // Station header: what this bench can make, or that there is no bench.
  const names = [...forge.stationsNear].map((s) => s[0].toUpperCase() + s.slice(1));
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "11px monospace";
  ctx.fillText(names.length ? `At: ${names.join(", ")}` : "No station", x0 + 16, y0 + 37);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = y0 + headH + i * rowH;
    if (i === forge.craftIndex) {
      ctx.fillStyle = "rgba(0,255,200,0.12)";
      ctx.fillRect(x0 + 6, y, panelW - 12, rowH - 2);
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + 6, y, panelW - 12, rowH - 2);
    }
    const tint = r.locked
      ? "rgba(255,120,80,0.65)"
      : r.craftable
        ? "#00ffcc"
        : "rgba(255,255,255,0.4)";
    ctx.textAlign = "left";
    ctx.fillStyle = tint;
    ctx.font = "bold 12px monospace";
    ctx.fillText(r.name, x0 + 16, y + 15);
    ctx.fillStyle = r.craftable ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)";
    ctx.font = "11px monospace";
    ctx.fillText(`${r.inputText} → ${r.outputText}`, x0 + 16, y + 28);
    if (r.note) {
      ctx.fillStyle = tint;
      ctx.textAlign = "right";
      ctx.fillText(r.note, x0 + panelW - 16, y + 15);
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("↑↓ Select   Enter Craft   Esc Close", w / 2, y0 + panelH - 10);
  ctx.textAlign = "left";
}

export function renderHelp(forge, ctx) {
  const hints = [
    "WASD — Move",
    "Mouse — Look",
    "LClick — Place",
    "RClick — Remove",
    "1-9 — Block Type",
    "0 — Natural Blocks",
    "Wheel — Block",
    "Q/E — Lower/Raise build cursor (overhead)",
    "T — Tool (Block/Spawn/Pickup/Exit/Start)",
    "G — Cycle Sub-type",
    "[ / ] — FOV -/+",
    ", / . — Prev/Next World",
    "Space — Jump (Rise in Noclip)",
    "Ctrl — Lower (Noclip)",
    "R — Reset Pitch",
    "N — Noclip",
    "V — Terrain/Flat new world",
    "M — Creative/Survival mode",
    "C — Craft menu (survival)",
    "F — Rename World",
    "Tab — Overhead",
    "Ctrl+S — Save",
    "Ctrl+Shift+S — Share URL",
    "Ctrl+N — New World",
    "Ctrl+D — Delete World",
    "Ctrl+Z — Undo",
    "Ctrl+Shift+Z — Redo",
    "Ctrl+E — Export .ccw",
    "Ctrl+I — Import .ccw/.json",
    "P — Play-test",
    "H — Toggle Help",
    "ESC — Pause",
  ];
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 300, hints.length * 16 + 12, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "11px monospace";
  for (let i = 0; i < hints.length; i++) ctx.fillText(hints[i], 16, 24 + i * 16);
}

export function renderStatus(forge, ctx, w, h) {
  const m = forge.world.meta;
  ctx.textAlign = "right";
  if (forge.noclip) {
    ctx.fillStyle = "rgba(255,200,0,0.8)";
    ctx.font = "bold 12px monospace";
    ctx.fillText("NOCLIP", w - 14, 24);
  }
  if (forge.survival) {
    ctx.fillStyle = "rgba(0,255,200,0.85)";
    ctx.font = "bold 12px monospace";
    ctx.fillText("SURVIVAL", w - 14, forge.noclip ? 40 : 24);
  }
  ctx.fillStyle = "rgba(0,255,200,0.6)";
  ctx.font = "bold 12px monospace";
  ctx.fillText(`CURSOR Z ${forge.cursorZ}`, w - 14, h - 90);
  ctx.fillText(`FOV ${forge.settings.forgeFov}`, w - 14, h - 106);

  const undoCount = forge.historyIndex + 1;
  const redoCount = forge.history.length - forge.historyIndex - 1;
  if (undoCount > 0 || redoCount > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px monospace";
    ctx.fillText(`U:${undoCount} R:${redoCount}`, w - 14, h - 122);
  }

  let y = h - 138;
  ctx.font = "bold 11px monospace";
  if (m.enemySpawns?.length) {
    ctx.fillStyle = "rgba(255,100,68,0.7)";
    ctx.fillText(`SPAWNS: ${m.enemySpawns.length}`, w - 14, y);
    y -= 16;
  }
  if (m.pickups?.length) {
    ctx.fillStyle = "rgba(255,204,0,0.7)";
    ctx.fillText(`PICKUPS: ${m.pickups.length}`, w - 14, y);
    y -= 16;
  }
  if (m.exit) {
    ctx.fillStyle = "rgba(0,204,255,0.7)";
    ctx.fillText(
      `EXIT: ${Math.floor(m.exit.x)},${Math.floor(m.exit.y)},${Math.floor(m.exit.z)}`,
      w - 14,
      y,
    );
  }

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "11px monospace";
  ctx.fillText(
    `${Math.floor(forge.player.x)}, ${Math.floor(forge.player.y)}, ${Math.floor(forge.player.z)}`,
    w - 14,
    h - 74,
  );
  ctx.textAlign = "left";
}

/** Top-down slice of the world at `cursorZ`, fitted to the screen. */
export function renderOverhead(forge, ctx, w, h) {
  const world = forge.world;
  const pad = 60;
  const cs = Math.min((w - pad * 2) / World.W, (h - pad * 2) / World.D);
  const ox = (w - World.W * cs) / 2;
  const oy = (h - World.D * cs) / 2;
  const z = forge.cursorZ;

  ctx.fillStyle = "#050510";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0b0b16";
  ctx.fillRect(ox, oy, World.W * cs, World.D * cs);

  for (let y = 0; y < World.D; y++) {
    for (let x = 0; x < World.W; x++) {
      const id = world.get(x, y, z);
      if (id === AIR) continue;
      ctx.fillStyle = BLOCKS[id].color;
      ctx.fillRect(ox + x * cs, oy + y * cs, cs + 0.5, cs + 0.5);
    }
  }

  const marker = (mx, my, color, square) => {
    const px = ox + mx * cs;
    const py = oy + my * cs;
    ctx.fillStyle = color;
    if (square) {
      const s = Math.max(3, cs * 0.8);
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2, cs * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (const s of world.meta.enemySpawns || []) marker(s.x, s.y, "#ff4433", false);
  for (const p of world.meta.pickups || [])
    marker(p.x, p.y, PICKUP_COLORS[p.type] || "#44ff44", true);
  if (world.meta.exit) marker(world.meta.exit.x, world.meta.exit.y, "#00ccff", true);
  if (world.meta.spawn) marker(world.meta.spawn.x, world.meta.spawn.y, "#ffffff", true);

  // Player arrow
  const px = ox + forge.player.x * cs;
  const py = oy + forge.player.y * cs;
  ctx.fillStyle = "#00ffcc";
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#00ffcc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(
    px + Math.cos(forge.player.angle) * 14,
    py + Math.sin(forge.player.angle) * 14,
  );
  ctx.stroke();

  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("OVERHEAD VIEW — TAB to return", w / 2, 28);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "13px monospace";
  ctx.fillText(
    `Block: ${BLOCKS[forge.tile]?.name}  |  Cursor Z: ${z} (Q/E)  |  ${World.W}×${World.D}×${World.H}`,
    w / 2,
    h - 34,
  );

  // Marker legend
  const legend = [
    ["#ff4433", "Spawn"],
    ["#44ff44", "Pickup"],
    ["#00ccff", "Exit"],
    ["#ffffff", "Start"],
  ];
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  let lx = w / 2 - 150;
  for (const [color, label] of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, h - 22, 9, 9);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(label, lx + 14, h - 14);
    lx += 80;
  }
}
