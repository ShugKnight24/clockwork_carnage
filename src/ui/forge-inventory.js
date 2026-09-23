// src/ui/forge-inventory.js
/**
 * The inventory screen. Draws only: every rect comes from `inventoryLayout`
 * so the renderer and the mouse handler cannot drift apart.
 */
import { inventoryLayout } from "../../js/layout.js";
import { BLOCKS } from "../world/blocks.js";
import { itemById, blockForItem } from "../rpg/items.js";

const TOOL_COLOR = "#b9c2d0";

/** @returns {{color:string|null,label:string,count:number,wear:number|null}} */
export function slotVisual(slot) {
  if (!slot) return { color: null, label: "", count: 0, wear: null };
  const item = itemById(slot.item);
  if (!item) return { color: null, label: "", count: 0, wear: null };
  const blockId = blockForItem(slot.item);
  return {
    color: blockId != null ? BLOCKS[blockId].color : TOOL_COLOR,
    label: item.name,
    count: slot.n > 1 ? slot.n : 0,
    wear: item.durability ? Math.max(0, Math.min(1, (slot.dur ?? item.durability) / item.durability)) : null,
  };
}

export function renderInventory(forge, ctx, w, h) {
  const inv = forge.survival?.inventory;
  if (!inv) return;
  const layout = inventoryLayout(w, h, inv.slots.length);

  ctx.fillStyle = "rgba(0,0,0,0.82)";
  ctx.beginPath();
  ctx.roundRect(layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h, 10);
  ctx.fill();

  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  ctx.fillText("INVENTORY", layout.panel.x + 18, layout.panel.y + 24);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.fillText("Drag to move   Shift-click to swap rows   I / Esc to close",
    layout.panel.x + layout.panel.w - 18, layout.panel.y + 24);
  ctx.textAlign = "left";

  for (const c of layout.cells) {
    const v = slotVisual(inv.slots[c.index]);
    ctx.fillStyle = c.region === "hotbar" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    if (v.color) {
      ctx.fillStyle = v.color;
      ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    }
    if (v.count) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(v.count), c.x + c.w - 4, c.y + c.h - 4);
      ctx.textAlign = "left";
    }
    if (v.wear != null) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(c.x + 4, c.y + c.h - 8, c.w - 8, 3);
      ctx.fillStyle = v.wear > 0.25 ? "rgba(0,255,200,0.8)" : "rgba(255,120,80,0.9)";
      ctx.fillRect(c.x + 4, c.y + c.h - 8, (c.w - 8) * v.wear, 3);
    }
    if (c.index === forge.hotbarIndex && c.region === "hotbar") {
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - 2, c.y - 2, c.w + 4, c.h + 4);
    }
  }

  // The carried stack rides the cursor.
  if (forge.carried) {
    const v = slotVisual(forge.carried);
    if (v.color) {
      ctx.fillStyle = v.color;
      ctx.fillRect(forge.cursor.x - 16, forge.cursor.y - 16, 32, 32);
    }
    if (v.count) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(v.count), forge.cursor.x + 15, forge.cursor.y + 15);
      ctx.textAlign = "left";
    }
  }
}
