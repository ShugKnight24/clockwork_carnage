# Forge Hotbar and Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A survival hotbar that shows your real stacks and a clickable inventory screen to arrange them, landed on top of a HUD split that makes `js/forge.js` smaller than it is today.

**Architecture:** The ten `_render*` methods move out of `js/forge.js` into `src/ui/forge-hud.js` as pure functions taking the forge as their first argument — a no-behaviour-change refactor, proved by the existing e2e. Screen geometry and hit-testing go into `js/layout.js` beside `settingsLayout`/`resolveSettingsHit`, so the renderer and the mouse handler read the same rects. Drag semantics are pure functions over an `Inventory`, so every failure path can be tested for item conservation without a canvas.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium with GPU flags (e2e).

**Spec:** `docs/superpowers/specs/2026-09-22-forge-hotbar-inventory-design.md`

## Global Constraints

- Branch: `feat/forge-survival`. Never commit to `master`.
- No AI attribution in any commit message. Conventional Commits.
- **Tasks 1–2 are a pure refactor. No behaviour may change.** The 15 Forge e2e tests are the proof; if any fails, the move is wrong, not the test.
- `js/forge.js` must be SMALLER than 2046 lines when this plan is done. Report the count at the end of every task that touches it.
- Creative keeps its unlimited palette and its current in-play hotbar rendering.
- Hit-test in the space you draw in. The Forge HUD is drawn on the GAME canvas (`budgetedRenderSize` x `stableScale`), NOT in `hudW`/`hudH`, so the cursor is converted through the game canvas's rect and backing size. Using `hudW` here puts a cell ~290px from where the player clicks at 2400x1350.
- Geometry lives in `js/layout.js` only. No second copy anywhere; a duplicated copy of the settings geometry was a live bug in this repo.
- `src/ui/forge-hud.js` and `src/ui/forge-inventory.js` draw only. They must not mutate world or session state.
- Baseline to hold: 1028 unit tests across 65 files, 15 Forge e2e. Run `npm run test:unit` before every commit.

## Review Focus

Failure modes the spec implies that no happy path exercises. Each has a test pinned to the owning task.

1. **A drag in flight when the screen closes** — `Esc`, a mode toggle, or a world swap mid-drag. Expected: the carried stack returns to its origin slot. It must never be lost. *(Task 3)*
2. **Dropping a stack onto a partially-full stack of the same item** — expected: merge up to that item's own `stack` (1 for tools, 64 for materials) and keep the remainder on the cursor, never silently destroying the overflow. *(Task 3)*
3. **Pointer lock refused when the screen closes** — browsers may refuse without a gesture. Expected: play resumes unlocked and the next click re-locks, rather than the player being stuck with no look control. *(Task 5)*
4. **The selected hotbar slot empties while selected** — last stone placed, tool scrapped. Expected: selection stays on that index holding nothing; it must not jump to another slot and move the player's hand for them. *(Task 7)*
5. **An inventory with fewer than 36 slots** — a truncated record, which `fromJSON` can still produce. Expected: the screen renders the slots that exist and hit-testing never resolves past them. *(Task 2)*

---

## File Structure

| File | Responsibility |
|---|---|
| `src/ui/forge-hud.js` | **New**: the ten `_render*` bodies as `(forge, ctx, w, h)` functions |
| `js/layout.js` | Extended: `inventoryLayout`, `resolveInventoryHit` |
| `src/rpg/inventory-ops.js` | **New**: pure drag/drop/shift-click operations over an `Inventory` |
| `src/ui/forge-inventory.js` | **New**: draws the screen from `inventoryLayout`'s rects |
| `js/forge.js` | Modified: delegates rendering, owns the screen's state and input |
| `js/game.js` | Modified: a `mousemove` listener supplying HUD-space coordinates |

---

### Task 1: Move the HUD out of forge.js

**Files:**
- Create: `src/ui/forge-hud.js`
- Modify: `js/forge.js` (lines 1513–2046 leave it)
- Test: `tests/unit/forge-hud.test.js`

**Interfaces:**
- Produces: `renderForge(forge, ctx, w, h)` plus the nine helpers it calls, all exported

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/forge-hud.test.js
import { describe, it, expect, vi } from "vitest";
import * as hud from "../../src/ui/forge-hud.js";

/** A canvas context that records calls instead of drawing. */
function recordingCtx() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls,
    save: rec("save"), restore: rec("restore"), beginPath: rec("beginPath"),
    closePath: rec("closePath"), fill: rec("fill"), stroke: rec("stroke"),
    fillRect: rec("fillRect"), strokeRect: rec("strokeRect"), clearRect: rec("clearRect"),
    roundRect: rec("roundRect"), rect: rec("rect"), arc: rec("arc"),
    moveTo: rec("moveTo"), lineTo: rec("lineTo"), fillText: rec("fillText"),
    strokeText: rec("strokeText"), translate: rec("translate"), rotate: rec("rotate"),
    scale: rec("scale"), drawImage: rec("drawImage"), setLineDash: rec("setLineDash"),
    measureText: () => ({ width: 10 }),
    canvas: { width: 1280, height: 720 },
  };
}

describe("forge-hud exports", () => {
  it("exposes the render entry point", () => {
    expect(typeof hud.renderForge).toBe("function");
  });

  it("draws nothing without a world", () => {
    const ctx = recordingCtx();
    hud.renderForge({ world: null }, ctx, 1280, 720);
    expect(ctx.calls.length).toBe(0);
  });

  it("never mutates the forge it is handed", async () => {
    const { World } = await import("../../src/world/world.js");
    const forge = {
      world: new World(), player: { x: 64, y: 64, z: 32, angle: 0, pitch: 0 },
      settings: { forgeFov: 120 }, tile: 1, toolMode: "block", target: null,
      overhead: false, showHelp: false, suppressHelp: true, notice: null,
      saveFlash: 0, noclip: false, cursorZ: 32, history: [], historyIndex: -1,
      mapIndex: [{ id: 0 }], currentSlot: 0, selectedEnemy: 0, selectedPickup: 0,
      survival: null, craftOpen: false, craftIndex: 0, breakProgress: 0,
      stationsNear: new Set(), storageFailed: false,
      _palette: () => [1, 2, 3], _craftRows: () => [],
    };
    const before = JSON.stringify({ ...forge, world: undefined, _palette: undefined, _craftRows: undefined });
    hud.renderForge(forge, recordingCtx(), 1280, 720);
    const after = JSON.stringify({ ...forge, world: undefined, _palette: undefined, _craftRows: undefined });
    expect(after).toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/forge-hud.test.js`
Expected: FAIL — `Cannot find module '../../src/ui/forge-hud.js'`

- [ ] **Step 3: Move the methods**

Create `src/ui/forge-hud.js`. Move the bodies of `render`, `_renderHUD`,
`_renderHotbar`, `_renderToolLabel`, `_renderSurvival`, `_renderBreakRing`,
`_renderSkills`, `_renderCraftMenu`, `_renderHelp`, `_renderStatus` and
`_renderOverhead` verbatim. Each becomes a function whose first parameter is
`forge`, and every `this.` inside becomes `forge.`. The entry point is:

```js
/**
 * Draws the Forge's HUD. Pure with respect to the forge: it reads state and
 * never writes it, so the drawing can be tested without a ForgeMode.
 */
export function renderForge(forge, ctx, w, h) {
  if (!forge.world) return;
  if (forge.overhead) renderOverhead(forge, ctx, w, h);
  else renderHUD(forge, ctx, w, h);
}
```

Keep the helpers exported so each can be tested alone. Move the imports the
bodies need (`BLOCKS`, `hotbarWindow`, `SKILLS`, `MAX_LEVEL`, `xpForLevel`,
`bestTool`, `itemById`, `craftMenuRows`, `PLACEABLE_BLOCKS`, whatever else they
reference) into the new file.

In `js/forge.js`, delete the eleven method bodies and leave one delegation:

```js
  render(ctx, w, h) {
    renderForge(this, ctx, w, h);
  }
```

importing `renderForge` from `../src/ui/forge-hud.js`.

**`craftMenuRows` lives in `js/forge.js` and is imported by tests.** Moving it
to the HUD module would create a cycle (`forge.js` → `forge-hud.js` →
`forge.js`). Leave `craftMenuRows` and `_craftRows` where they are; the HUD
calls `forge._craftRows()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/forge-hud.test.js`
Expected: PASS, 3 tests

- [ ] **Step 5: Prove nothing changed**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: 1031 unit tests (1028 + 3), 15 e2e — **all passing**. A failing e2e
here means the move is wrong; fix the move, never the test.

Report the new line count of `js/forge.js`. It must be below 1600.

- [ ] **Step 6: Commit**

```bash
git add src/ui/forge-hud.js js/forge.js tests/unit/forge-hud.test.js
git commit -m "refactor(forge): move the HUD drawing into its own module"
```

---

### Task 2: Inventory geometry and hit-testing

**Files:**
- Modify: `js/layout.js`
- Test: `tests/unit/inventory-layout.test.js`

**Interfaces:**
- Produces: `inventoryLayout(w, h, slotCount = 36)` returning `{panel, cells: [{x,y,w,h,index,region}], cell, gap}`; `resolveInventoryHit(layout, x, y)` returning `{kind: "slot"|"panel"|"none", index}`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/inventory-layout.test.js
import { describe, it, expect } from "vitest";
import { inventoryLayout, resolveInventoryHit } from "../../js/layout.js";

const L = () => inventoryLayout(1280, 720);

describe("inventoryLayout", () => {
  it("lays out nine hotbar cells and twenty-seven backpack cells", () => {
    const l = L();
    expect(l.cells.length).toBe(36);
    expect(l.cells.filter((c) => c.region === "hotbar").length).toBe(9);
    expect(l.cells.filter((c) => c.region === "backpack").length).toBe(27);
    expect(l.cells.map((c) => c.index)).toEqual([...Array(36).keys()]);
  });

  it("puts the hotbar row below the backpack rows", () => {
    const l = L();
    const hotbarY = Math.min(...l.cells.filter((c) => c.region === "hotbar").map((c) => c.y));
    const backpackY = Math.max(...l.cells.filter((c) => c.region === "backpack").map((c) => c.y));
    expect(hotbarY).toBeGreaterThan(backpackY);
  });

  it("keeps every cell inside the panel and never overlaps two", () => {
    const l = L();
    for (const c of l.cells) {
      expect(c.x).toBeGreaterThanOrEqual(l.panel.x);
      expect(c.y).toBeGreaterThanOrEqual(l.panel.y);
      expect(c.x + c.w).toBeLessThanOrEqual(l.panel.x + l.panel.w);
      expect(c.y + c.h).toBeLessThanOrEqual(l.panel.y + l.panel.h);
    }
    for (let i = 0; i < l.cells.length; i++) {
      for (let j = i + 1; j < l.cells.length; j++) {
        const a = l.cells[i], b = l.cells[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
  });

  it("stays centred and on-screen across window sizes", () => {
    for (const [w, h] of [[1280, 720], [1920, 1080], [900, 600], [640, 480]]) {
      const l = inventoryLayout(w, h);
      expect(l.panel.x).toBeGreaterThanOrEqual(0);
      expect(l.panel.y).toBeGreaterThanOrEqual(0);
      expect(l.panel.x + l.panel.w).toBeLessThanOrEqual(w);
      expect(l.panel.y + l.panel.h).toBeLessThanOrEqual(h);
      expect(Math.abs((l.panel.x + l.panel.w / 2) - w / 2)).toBeLessThan(1);
    }
  });

  // Review Focus 5
  it("lays out only the slots that exist for a truncated inventory", () => {
    const l = inventoryLayout(1280, 720, 12);
    expect(l.cells.length).toBe(12);
    expect(resolveInventoryHit(l, l.panel.x + l.panel.w / 2, l.panel.y + l.panel.h - 4).index)
      .toBeLessThan(12);
  });
});

describe("resolveInventoryHit", () => {
  it("resolves the centre of every cell to that cell", () => {
    const l = L();
    for (const c of l.cells) {
      const hit = resolveInventoryHit(l, c.x + c.w / 2, c.y + c.h / 2);
      expect(hit).toEqual({ kind: "slot", index: c.index });
    }
  });

  it("resolves a gap between cells to the panel, not a slot", () => {
    const l = L();
    const a = l.cells[0];
    const hit = resolveInventoryHit(l, a.x + a.w + l.gap / 2, a.y + a.h / 2);
    expect(hit.kind).toBe("panel");
  });

  it("resolves outside the panel to none", () => {
    const l = L();
    expect(resolveInventoryHit(l, 0, 0).kind).toBe("none");
    expect(resolveInventoryHit(l, 1279, 719).kind).toBe("none");
  });

  it("includes a cell's top-left pixel and excludes the pixel past its edge", () => {
    const l = L();
    const c = l.cells[5];
    expect(resolveInventoryHit(l, c.x, c.y)).toEqual({ kind: "slot", index: 5 });
    expect(resolveInventoryHit(l, c.x + c.w, c.y).index).not.toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/inventory-layout.test.js`
Expected: FAIL — `inventoryLayout is not a function`

- [ ] **Step 3: Write the implementation**

Append to `js/layout.js`, following the file's existing style:

```js
/**
 * The Forge's inventory screen. Geometry lives here, beside the settings
 * layout, so the renderer and the mouse handler read the same rects — a
 * duplicated copy of that geometry has already been a live bug in this repo.
 * Coordinates are hudW/hudH CSS pixels, never the DPR-scaled backing store.
 */
export function inventoryLayout(w, h, slotCount = 36) {
  const cell = 44;
  const gap = 6;
  const cols = 9;
  const pad = 18;
  const rowGap = 14; // between the backpack block and the hotbar row

  const backpackCount = Math.max(0, Math.min(slotCount, 36) - 9);
  const backpackRows = Math.ceil(backpackCount / cols);
  const hotbarCount = Math.min(slotCount, 9);

  const gridW = cols * cell + (cols - 1) * gap;
  const gridH = backpackRows * cell + Math.max(0, backpackRows - 1) * gap
    + (hotbarCount ? rowGap + cell : 0);

  const panel = {
    x: Math.round((w - gridW) / 2) - pad,
    y: Math.round((h - gridH) / 2) - pad - 10,
    w: gridW + pad * 2,
    h: gridH + pad * 2 + 20, // room for the title
  };
  const originX = panel.x + pad;
  const originY = panel.y + pad + 20;

  const cells = [];
  // Backpack first in index order (slots 9..35), laid out above the hotbar.
  for (let i = 0; i < backpackCount; i++) {
    cells.push({
      index: 9 + i, region: "backpack", w: cell, h: cell,
      x: originX + (i % cols) * (cell + gap),
      y: originY + Math.floor(i / cols) * (cell + gap),
    });
  }
  const hotbarY = originY + backpackRows * (cell + gap) + rowGap
    - (backpackRows ? gap : 0);
  for (let i = 0; i < hotbarCount; i++) {
    cells.push({
      index: i, region: "hotbar", w: cell, h: cell,
      x: originX + i * (cell + gap), y: hotbarY,
    });
  }
  cells.sort((a, b) => a.index - b.index);
  return { panel, cells, cell, gap };
}

/** @returns {{kind:"slot"|"panel"|"none", index:number}} */
export function resolveInventoryHit(layout, x, y) {
  if (!hitRect(layout.panel, x, y)) return { kind: "none", index: -1 };
  for (const c of layout.cells) {
    if (hitRect(c, x, y)) return { kind: "slot", index: c.index };
  }
  return { kind: "panel", index: -1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/inventory-layout.test.js`
Expected: PASS, 9 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/layout.js tests/unit/inventory-layout.test.js
git commit -m "feat(forge): lay out and hit-test the inventory screen"
```

---

### Task 3: Drag and drop as pure operations

**Files:**
- Create: `src/rpg/inventory-ops.js`
- Test: `tests/unit/rpg-inventory-ops.test.js`

**Interfaces:**
- Consumes: `Inventory`, `itemById`
- Produces: `takeStack(inv, i)`, `dropStack(inv, i, carried)`, `returnStack(inv, carried)`, `shiftMove(inv, i)` — all returning the new carried stack (`{item, n, dur}` or `null`)

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-inventory-ops.test.js
import { describe, it, expect } from "vitest";
import { takeStack, dropStack, returnStack, shiftMove } from "../../src/rpg/inventory-ops.js";
import { Inventory } from "../../src/rpg/inventory.js";

const total = (inv, carried) =>
  inv.slots.reduce((t, s) => t + (s ? s.n : 0), 0) + (carried ? carried.n : 0);

describe("takeStack", () => {
  it("lifts the whole stack off the slot", () => {
    const inv = new Inventory();
    inv.add("stone", 20);
    const carried = takeStack(inv, 0);
    expect(carried).toEqual({ item: "stone", n: 20 });
    expect(inv.slots[0]).toBe(null);
    expect(total(inv, carried)).toBe(20);
  });

  it("carries a tool's durability with it", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 40);
    expect(takeStack(inv, 0)).toEqual({ item: "pick_stone", n: 1, dur: 80 });
  });

  it("returns null for an empty or out-of-range slot", () => {
    const inv = new Inventory();
    expect(takeStack(inv, 0)).toBe(null);
    expect(takeStack(inv, 99)).toBe(null);
    expect(takeStack(inv, -1)).toBe(null);
  });
});

describe("dropStack", () => {
  it("fills an empty slot and leaves nothing carried", () => {
    const inv = new Inventory();
    const carried = { item: "stone", n: 5 };
    expect(dropStack(inv, 3, carried)).toBe(null);
    expect(inv.slots[3]).toEqual({ item: "stone", n: 5 });
    expect(total(inv, null)).toBe(5);
  });

  // Review Focus 2
  it("merges up to the stack size and keeps the remainder carried", () => {
    const inv = new Inventory();
    inv.add("stone", 60);
    const left = dropStack(inv, 0, { item: "stone", n: 10 });
    expect(inv.slots[0].n).toBe(64);
    expect(left).toEqual({ item: "stone", n: 6 });
    expect(total(inv, left)).toBe(70);
  });

  it("swaps when the slot holds a different item", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    const left = dropStack(inv, 0, { item: "rock", n: 3 });
    expect(inv.slots[0]).toEqual({ item: "rock", n: 3 });
    expect(left).toEqual({ item: "stone", n: 5 });
    expect(total(inv, left)).toBe(8);
  });

  it("swaps rather than merging two tools, since their stack is one", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    const left = dropStack(inv, 0, { item: "pick_stone", n: 1, dur: 10 });
    expect(inv.slots[0].dur).toBe(10);
    expect(left).toEqual({ item: "pick_stone", n: 1, dur: 120 });
  });

  it("refuses an out-of-range slot and keeps the stack carried", () => {
    const inv = new Inventory();
    const carried = { item: "stone", n: 5 };
    expect(dropStack(inv, 99, carried)).toBe(carried);
    expect(total(inv, carried)).toBe(5);
  });
});

describe("returnStack", () => {
  // Review Focus 1
  it("puts a carried stack back and never loses it", () => {
    const inv = new Inventory();
    inv.add("stone", 64);
    const carried = { item: "rock", n: 7 };
    expect(returnStack(inv, carried)).toBe(null);
    expect(inv.count("rock")).toBe(7);
  });

  it("keeps the stack carried when there is genuinely nowhere for it", () => {
    const inv = new Inventory(1);
    inv.add("stone", 64);
    const carried = { item: "rock", n: 7 };
    expect(returnStack(inv, carried)).toEqual(carried);
    expect(inv.count("rock")).toBe(0);
  });

  it("is a no-op with nothing carried", () => {
    expect(returnStack(new Inventory(), null)).toBe(null);
  });
});

describe("shiftMove", () => {
  it("moves a backpack stack to the first free hotbar slot", () => {
    const inv = new Inventory();
    inv.add("stone", 64); // slot 0, hotbar
    inv.slots[9] = { item: "rock", n: 5 };
    shiftMove(inv, 9);
    expect(inv.slots[9]).toBe(null);
    expect(inv.slots[1]).toEqual({ item: "rock", n: 5 });
  });

  it("moves a hotbar stack to the backpack", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    shiftMove(inv, 0);
    expect(inv.slots[0]).toBe(null);
    expect(inv.slots[9]).toEqual({ item: "stone", n: 5 });
  });

  it("leaves the stack alone when the other region is full", () => {
    const inv = new Inventory();
    for (let i = 9; i < 36; i++) inv.slots[i] = { item: "dirt", n: 64 };
    inv.add("stone", 5);
    shiftMove(inv, 0);
    expect(inv.slots[0]).toEqual({ item: "stone", n: 5 });
  });

  it("conserves totals in every case", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    inv.add("rock", 3);
    const before = total(inv, null);
    for (const i of [0, 1, 9, 35, -1, 99]) shiftMove(inv, i);
    expect(total(inv, null)).toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-inventory-ops.test.js`
Expected: FAIL — `Cannot find module '../../src/rpg/inventory-ops.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/rpg/inventory-ops.js
/**
 * Drag-and-drop as pure operations over an Inventory. They are here rather
 * than on the class because this is where items get destroyed if a failure
 * path is wrong, and pure functions let every one of those paths be tested
 * for conservation without a canvas or a pointer.
 *
 * A "carried" stack is `{item, n, dur?}` or null — the thing on the cursor.
 */
import { itemById } from "./items.js";
import { HOTBAR_SLOTS } from "./inventory.js";

const inRange = (inv, i) => Number.isInteger(i) && i >= 0 && i < inv.slots.length;
const copy = (s) => (s.dur == null ? { item: s.item, n: s.n } : { item: s.item, n: s.n, dur: s.dur });

/** @returns {object|null} the stack lifted off slot `i` */
export function takeStack(inv, i) {
  if (!inRange(inv, i) || !inv.slots[i]) return null;
  const carried = copy(inv.slots[i]);
  inv.slots[i] = null;
  return carried;
}

/** @returns {object|null} whatever is still carried after the drop */
export function dropStack(inv, i, carried) {
  if (!carried) return null;
  if (!inRange(inv, i)) return carried;
  const here = inv.slots[i];

  if (!here) {
    inv.slots[i] = copy(carried);
    return null;
  }

  const cap = itemById(carried.item)?.stack ?? 1;
  if (here.item === carried.item && cap > 1 && here.n < cap) {
    const take = Math.min(cap - here.n, carried.n);
    here.n += take;
    const left = carried.n - take;
    return left > 0 ? { ...carried, n: left } : null;
  }

  // Anything else is a swap, including two tools, whose stack is one.
  inv.slots[i] = copy(carried);
  return here;
}

/** Put a carried stack back anywhere it fits. @returns {object|null} */
export function returnStack(inv, carried) {
  if (!carried) return null;
  const placed = inv.add(carried.item, carried.n, carried.dur ?? null);
  const left = carried.n - placed;
  return left > 0 ? { ...carried, n: left } : null;
}

/** Move a stack between the hotbar and the backpack. */
export function shiftMove(inv, i) {
  if (!inRange(inv, i) || !inv.slots[i]) return;
  const fromHotbar = i < HOTBAR_SLOTS;
  const lo = fromHotbar ? HOTBAR_SLOTS : 0;
  const hi = fromHotbar ? inv.slots.length : HOTBAR_SLOTS;
  for (let j = lo; j < hi; j++) {
    if (inv.slots[j] === null) {
      inv.slots[j] = inv.slots[i];
      inv.slots[i] = null;
      return;
    }
  }
  // The other region is full; leave the stack where it is rather than dropping it.
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-inventory-ops.test.js`
Expected: PASS, 15 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rpg/inventory-ops.js tests/unit/rpg-inventory-ops.test.js
git commit -m "feat(rpg): add pure drag operations that conserve item counts"
```

---

### Task 4: Draw the inventory screen

**Files:**
- Create: `src/ui/forge-inventory.js`
- Test: `tests/unit/forge-inventory.test.js`

**Interfaces:**
- Consumes: `inventoryLayout`, `BLOCKS`, `itemById`, `blockForItem`
- Produces: `renderInventory(forge, ctx, w, h)`; `slotVisual(slot)` returning `{color, label, count, wear}` for one slot

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/forge-inventory.test.js
import { describe, it, expect } from "vitest";
import { slotVisual } from "../../src/ui/forge-inventory.js";

describe("slotVisual", () => {
  it("is blank for an empty slot", () => {
    expect(slotVisual(null)).toEqual({ color: null, label: "", count: 0, wear: null });
  });

  it("uses the block's colour and shows a count above one", () => {
    const v = slotVisual({ item: "stone", n: 12 });
    expect(v.color).toBe("#6b7280");
    expect(v.label).toBe("Stone");
    expect(v.count).toBe(12);
    expect(v.wear).toBe(null);
  });

  it("hides the count for a single item", () => {
    expect(slotVisual({ item: "stone", n: 1 }).count).toBe(0);
  });

  it("reports wear as a fraction for a tool", () => {
    expect(slotVisual({ item: "pick_stone", n: 1, dur: 60 }).wear).toBeCloseTo(0.5, 5);
    expect(slotVisual({ item: "pick_metal", n: 1, dur: 400 }).wear).toBe(1);
    expect(slotVisual({ item: "pick_stone", n: 1, dur: 0 }).wear).toBe(0);
  });

  it("gives a non-placeable tool a colour of its own rather than crashing", () => {
    const v = slotVisual({ item: "pick_stone", n: 1, dur: 120 });
    expect(typeof v.color).toBe("string");
    expect(v.label).toBe("Stone Pickaxe");
  });

  it("is blank for an unknown item rather than throwing", () => {
    expect(() => slotVisual({ item: "gone", n: 3 })).not.toThrow();
    expect(slotVisual({ item: "gone", n: 3 }).color).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/forge-inventory.test.js`
Expected: FAIL — `Cannot find module '../../src/ui/forge-inventory.js'`

- [ ] **Step 3: Write the implementation**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/forge-inventory.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/forge-inventory.js tests/unit/forge-inventory.test.js
git commit -m "feat(forge): draw the inventory screen from the shared layout"
```

---

### Task 5: Open and close the screen

**Files:**
- Modify: `js/forge.js`
- Modify: `js/game.js`
- Test: `tests/unit/forge-inventory-screen.test.js`

**Interfaces:**
- Produces: `ForgeMode.invOpen`, `ForgeMode.cursor {x,y}`, `ForgeMode.carried`, `ForgeMode.hotbarIndex`, `ForgeMode.handleMouseMove(x, y)`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/forge-inventory-screen.test.js
import { describe, it, expect } from "vitest";
import { ForgeMode } from "../../js/forge.js";
import { World } from "../../src/world/world.js";

const forge = () => {
  const f = new ForgeMode({
    renderer: null,
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: {}, keybinds: {}, canvas: null,
  });
  f._adopt(new World({ mode: "survival" }), 0);
  f.active = true;
  return f;
};

describe("the inventory screen", () => {
  it("is shut in creative and cannot be opened", () => {
    const f = new ForgeMode({
      renderer: null, audio: { menuSelect() {}, menuConfirm() {} },
      settings: {}, keybinds: {}, canvas: null,
    });
    f._adopt(new World(), 0);
    f.active = true;
    f.handleKeyDown({ code: "KeyI" });
    expect(f.invOpen).toBe(false);
  });

  it("toggles with I and closes with Escape in survival", () => {
    const f = forge();
    expect(f.invOpen).toBe(false);
    expect(f.handleKeyDown({ code: "KeyI" })).toBe(true);
    expect(f.invOpen).toBe(true);
    f.handleKeyDown({ code: "KeyI" });
    expect(f.invOpen).toBe(false);

    f.handleKeyDown({ code: "KeyI" });
    expect(f.handleKeyDown({ code: "Escape" })).toBe(true);
    expect(f.invOpen).toBe(false);
  });

  it("does not steal Ctrl+I, which is import", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyI", ctrlKey: true });
    expect(f.invOpen).toBe(false);
  });

  it("suspends look and breaking while open", () => {
    const f = forge();
    f.holdingBreak = true;
    f.handleKeyDown({ code: "KeyI" });
    expect(f.holdingBreak).toBe(false);
    const before = f.player.angle;
    f.mouseLocked = true;
    f.mouseDx = 500;
    f.update(1 / 60);
    expect(f.player.angle).toBe(before);
  });

  it("tracks the cursor only while open", () => {
    const f = forge();
    f.handleMouseMove(100, 200);
    expect(f.cursor).toEqual({ x: 0, y: 0 });
    f.handleKeyDown({ code: "KeyI" });
    f.handleMouseMove(100, 200);
    expect(f.cursor).toEqual({ x: 100, y: 200 });
  });

  // Review Focus 1
  it("returns a carried stack when it closes", () => {
    const f = forge();
    f.survival.inventory.add("stone", 9);
    f.handleKeyDown({ code: "KeyI" });
    f.carried = { item: "stone", n: 9 };
    f.survival.inventory.slots[0] = null;
    f.handleKeyDown({ code: "Escape" });
    expect(f.carried).toBe(null);
    expect(f.survival.inventory.count("stone")).toBe(9);
  });

  // Review Focus 3
  it("still closes when the browser refuses to re-lock the pointer", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyI" });
    // requestPointerLockSafe swallows a refusal; the screen must not depend
    // on it succeeding, or a refusal would trap the player with no controls.
    f.canvas = { requestPointerLock: () => { throw new Error("refused"); } };
    expect(() => f.handleKeyDown({ code: "KeyI" })).not.toThrow();
    expect(f.invOpen).toBe(false);
  });

  it("returns a carried stack when the world is swapped", () => {
    const f = forge();
    f.handleKeyDown({ code: "KeyI" });
    f.carried = { item: "rock", n: 4 };
    f._adopt(new World({ mode: "survival" }), 1);
    expect(f.carried).toBe(null);
    expect(f.invOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/forge-inventory-screen.test.js`
Expected: FAIL — `expected undefined to be false` on `f.invOpen`

- [ ] **Step 3: Write the implementation**

In the `ForgeMode` constructor, beside the craft-menu fields:

```js
    /** The inventory screen; survival only, and it owns the cursor while open. */
    this.invOpen = false;
    this.cursor = { x: 0, y: 0 };
    /** The stack on the cursor mid-drag, or null. */
    this.carried = null;
    /** Which hotbar slot is selected, 0..8. */
    this.hotbarIndex = 0;
```

Add the key handling in `handleKeyDown`, before the craft-menu branch:

```js
    if (this.survival && code === "KeyI" && !ctrl) {
      this._setInventory(!this.invOpen);
      return true;
    }
    if (this.invOpen && code === "Escape") {
      this._setInventory(false);
      return true;
    }
```

Add the methods beside `_setMode`:

```js
  /**
   * Open or shut the inventory screen. Opening releases the pointer so the
   * screen can be clicked; closing asks for it back — the keypress is the
   * user gesture browsers require, the same way overhead already works.
   */
  _setInventory(open) {
    if (open === this.invOpen) return;
    this.invOpen = open;
    if (open) {
      this.holdingBreak = false;
      this.survival?.cancelBreak();
      this.breakProgress = 0;
      this.craftOpen = false;
      exitPointerLockSafe();
    } else {
      this._dropCarried();
      // A refusal is survivable: play resumes unlocked and the next click locks.
      requestPointerLockSafe(this.canvas);
    }
    this.audio.menuSelect();
  }

  /** Put any carried stack back. A drag must never lose items. */
  _dropCarried() {
    if (!this.carried || !this.survival) { this.carried = null; return; }
    this.carried = returnStack(this.survival.inventory, this.carried);
    // If it genuinely does not fit it stays carried and the screen stays open.
    if (this.carried) this.invOpen = true;
  }

  /** HUD-space cursor position; only meaningful while the screen is open. */
  handleMouseMove(x, y) {
    if (!this.invOpen) return;
    this.cursor.x = x;
    this.cursor.y = y;
  }
```

Wire the screen into the draw path. In `src/ui/forge-hud.js`, `renderForge`
becomes:

```js
export function renderForge(forge, ctx, w, h) {
  if (!forge.world) return;
  if (forge.overhead) renderOverhead(forge, ctx, w, h);
  else renderHUD(forge, ctx, w, h);
  // The screen draws over the HUD, and only survival ever opens it.
  if (forge.invOpen) renderInventory(forge, ctx, w, h);
}
```

importing `renderInventory` from `./forge-inventory.js`. Without this the
screen is dead code — Task 4 writes the drawing and nothing calls it.

In `update(dt)`, make the screen suspend look and breaking — add at the top of
the mouse-look block:

```js
    if (this.invOpen) { this.mouseDx = 0; this.mouseDy = 0; }
```

and guard the break tick with `!this.invOpen`.

In `_adopt`, beside the craft-menu reset:

```js
    this._dropCarried();
    this.invOpen = false;
```

In `_setMode`, when leaving survival, also `this._dropCarried(); this.invOpen = false;`.

Import `returnStack` from `../src/rpg/inventory-ops.js`.

In `js/game.js`, extend the existing settings `mousemove` listener — or add a
sibling using the same conversion — so the Forge gets HUD-space coordinates:

```js
      if (this.state === GameState.BUILDER && this.builder?.invOpen) {
        const rect = (this.hudCanvas || this.canvas).getBoundingClientRect();
        this.builder.handleMouseMove(
          (e.clientX - rect.left) * (this.hudW / rect.width),
          (e.clientY - rect.top) * (this.hudH / rect.height),
        );
      }
```

**Use `hudW`/`hudH`, never the DPR-scaled backing store** — that is the bug
that made every tap land at 2x on retina.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/forge-inventory-screen.test.js`
Expected: PASS, 7 tests

- [ ] **Step 5: Run both suites**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS, 15 e2e still green

- [ ] **Step 6: Commit**

```bash
git add js/forge.js js/game.js tests/unit/forge-inventory-screen.test.js
git commit -m "feat(forge): open a cursor-free inventory screen with I"
```

---

### Task 6: Click and drag

**Files:**
- Modify: `js/forge.js`
- Test: `tests/unit/forge-inventory-screen.test.js`

**Interfaces:**
- Consumes: `resolveInventoryHit`, `inventoryLayout`, the Task 3 operations
- Produces: `handleMouseDown`/`handleMouseUp` routing to the screen while open

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/forge-inventory-screen.test.js
import { inventoryLayout } from "../../js/layout.js";

describe("clicking and dragging in the screen", () => {
  const W = 1280, H = 720;
  const open = () => {
    const f = forge();
    f.hudSize = { w: W, h: H };
    f.handleKeyDown({ code: "KeyI" });
    return f;
  };
  const centre = (inv, index) => {
    const c = inventoryLayout(W, H, inv.slots.length).cells.find((x) => x.index === index);
    return [c.x + c.w / 2, c.y + c.h / 2];
  };

  it("picks up a stack on press and drops it on release", () => {
    const f = open();
    const inv = f.survival.inventory;
    inv.add("stone", 12);

    f.handleMouseMove(...centre(inv, 0));
    f.handleMouseDown(0);
    expect(f.carried).toEqual({ item: "stone", n: 12 });
    expect(inv.slots[0]).toBe(null);

    f.handleMouseMove(...centre(inv, 14));
    f.handleMouseUp(0);
    expect(f.carried).toBe(null);
    expect(inv.slots[14]).toEqual({ item: "stone", n: 12 });
  });

  it("returns the stack when released outside the panel", () => {
    const f = open();
    const inv = f.survival.inventory;
    inv.add("rock", 6);
    f.handleMouseMove(...centre(inv, 0));
    f.handleMouseDown(0);
    f.handleMouseMove(2, 2);
    f.handleMouseUp(0);
    expect(f.carried).toBe(null);
    expect(inv.count("rock")).toBe(6);
  });

  it("selects a hotbar slot on a click that moves nothing", () => {
    const f = open();
    const inv = f.survival.inventory;
    inv.slots[3] = { item: "stone", n: 2 };
    f.handleMouseMove(...centre(inv, 3));
    f.handleMouseDown(0);
    f.handleMouseUp(0);
    expect(f.hotbarIndex).toBe(3);
    expect(inv.slots[3]).toEqual({ item: "stone", n: 2 });
  });

  it("shift-clicks a stack between the rows", () => {
    const f = open();
    const inv = f.survival.inventory;
    inv.slots[9] = { item: "dirt", n: 5 };
    f.handleMouseMove(...centre(inv, 9));
    f.handleMouseDown(0, true);
    expect(inv.slots[9]).toBe(null);
    expect(inv.slots[0]).toEqual({ item: "dirt", n: 5 });
  });

  it("ignores clicks while the screen is shut", () => {
    const f = forge();
    const inv = f.survival.inventory;
    inv.add("stone", 4);
    f.handleMouseDown(0);
    expect(f.carried).toBe(null);
    expect(inv.count("stone")).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/forge-inventory-screen.test.js`
Expected: FAIL — `expected null to equal { item: 'stone', n: 12 }`

- [ ] **Step 3: Write the implementation**

Give the Forge the HUD size it needs to lay out. Add to the constructor:

```js
    /** Last HUD size seen while drawing, so input can lay out the same grid. */
    this.hudSize = { w: 1280, h: 720 };
```

and set it at the top of `render`:

```js
  render(ctx, w, h) {
    this.hudSize.w = w;
    this.hudSize.h = h;
    renderForge(this, ctx, w, h);
  }
```

At the very top of `handleMouseDown(button, shift = false)`:

```js
    if (this.invOpen) { this._invPress(button, shift); return; }
```

and at the top of `handleMouseUp(button)`:

```js
    if (this.invOpen) { this._invRelease(button); return; }
```

Add the two handlers:

```js
  _invHit() {
    const inv = this.survival.inventory;
    const layout = inventoryLayout(this.hudSize.w, this.hudSize.h, inv.slots.length);
    return resolveInventoryHit(layout, this.cursor.x, this.cursor.y);
  }

  _invPress(button, shift) {
    if (button !== 0) return;
    const hit = this._invHit();
    if (hit.kind !== "slot") return;
    const inv = this.survival.inventory;
    if (shift) { shiftMove(inv, hit.index); this.audio.menuSelect(); return; }
    if (this.carried) { this.carried = dropStack(inv, hit.index, this.carried); return; }
    this.pressedSlot = hit.index;
    this.carried = takeStack(inv, hit.index);
  }

  _invRelease(button) {
    if (button !== 0) return;
    const hit = this._invHit();
    const inv = this.survival.inventory;

    if (this.carried && hit.kind === "slot") {
      // Released on the slot it came from with no move: treat it as a select.
      if (hit.index === this.pressedSlot) {
        this.carried = dropStack(inv, hit.index, this.carried);
        if (hit.index < HOTBAR_SLOTS) this.hotbarIndex = hit.index;
      } else {
        this.carried = dropStack(inv, hit.index, this.carried);
      }
    } else if (this.carried) {
      this._dropCarried(); // outside the panel: put it back, never lose it
    }
    this.pressedSlot = -1;
  }
```

Add `this.pressedSlot = -1;` to the constructor, and import `inventoryLayout`,
`resolveInventoryHit` from `./layout.js` and `takeStack`, `dropStack`,
`shiftMove` from `../src/rpg/inventory-ops.js`. `HOTBAR_SLOTS` is already
imported by `js/forge.js` for the old hotbar render — confirm that survived
Task 1's move, and re-import it if the move took it with the drawing.

`js/game.js` must pass the shift state through: its `onMouseDown` becomes
`(e) => this._inputMouseDown(e)` unchanged, and `_inputMouseDown` passes
`e.shiftKey` to `this.builder?.handleMouseDown(e.button, e.shiftKey)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/forge-inventory-screen.test.js`
Expected: PASS, 12 tests

- [ ] **Step 5: Run both suites**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/forge.js js/game.js tests/unit/forge-inventory-screen.test.js
git commit -m "feat(forge): click, drag and shift-click stacks in the inventory"
```

---

### Task 7: The survival hotbar shows your stacks

**Files:**
- Modify: `js/forge.js`, `src/ui/forge-hud.js`
- Test: `tests/unit/forge-hotbar.test.js`

**Interfaces:**
- Produces: `hotbarCells(forge)` in `src/ui/forge-hud.js`, returning what the in-play hotbar should draw for either mode; `ForgeMode.heldItem` derived from `hotbarIndex`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/forge-hotbar.test.js
import { describe, it, expect } from "vitest";
import { hotbarCells } from "../../src/ui/forge-hud.js";
import { ForgeMode } from "../../js/forge.js";
import { World } from "../../src/world/world.js";

const make = (mode) => {
  const f = new ForgeMode({
    renderer: null, audio: { menuSelect() {}, menuConfirm() {} },
    settings: {}, keybinds: {}, canvas: null,
  });
  f._adopt(new World(mode === "survival" ? { mode } : {}), 0);
  f.active = true;
  return f;
};

describe("hotbarCells", () => {
  it("lists the creative palette, unlimited", () => {
    const cells = hotbarCells(make("creative"));
    expect(cells.length).toBe(14);
    expect(cells[0].blockId).toBe(1);
    expect(cells[0].count).toBe(0);
  });

  it("lists the nine survival hotbar slots, with counts", () => {
    const f = make("survival");
    f.survival.inventory.add("stone", 7);
    const cells = hotbarCells(f);
    expect(cells.length).toBe(9);
    expect(cells[0].count).toBe(7);
    expect(cells[0].blockId).toBe(1);
    expect(cells[1].blockId).toBe(null); // empty slot
  });

  it("shows a tool's wear in the hotbar", () => {
    const f = make("survival");
    f.survival.inventory.add("pick_stone", 1);
    f.survival.inventory.wearSlot(0, 30);
    expect(hotbarCells(f)[0].wear).toBeCloseTo(0.75, 5);
  });
});

describe("hotbar selection drives heldItem", () => {
  it("sets heldItem from the selected slot", () => {
    const f = make("survival");
    f.survival.inventory.add("stone", 4);
    f.survival.inventory.slots[2] = { item: "rock", n: 3 };
    f.selectHotbar(0);
    expect(f.heldItem).toBe("stone");
    f.selectHotbar(2);
    expect(f.heldItem).toBe("rock");
  });

  it("selects with the digit keys", () => {
    const f = make("survival");
    f.survival.inventory.slots[4] = { item: "dirt", n: 1 };
    f.handleKeyDown({ code: "Digit5" });
    expect(f.hotbarIndex).toBe(4);
    expect(f.heldItem).toBe("dirt");
  });

  // Review Focus 4
  it("keeps the selection on an emptied slot rather than jumping", () => {
    const f = make("survival");
    f.survival.inventory.slots[3] = { item: "stone", n: 1 };
    f.selectHotbar(3);
    f.survival.inventory.remove("stone", 1);
    f.refreshHeld();
    expect(f.hotbarIndex).toBe(3);
    expect(f.heldItem).toBe(null);
  });

  it("leaves creative's tile selection alone", () => {
    const f = make("creative");
    f.handleKeyDown({ code: "Digit3" });
    expect(f.heldItem).toBe(null);
    expect(f.tile).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/forge-hotbar.test.js`
Expected: FAIL — `hotbarCells is not a function`

- [ ] **Step 3: Write the implementation**

In `src/ui/forge-hud.js`:

```js
/**
 * What the in-play hotbar draws. Survival shows the nine inventory slots with
 * counts and wear; creative shows its unlimited palette, unchanged.
 * @returns {Array<{blockId:number|null,count:number,wear:number|null,label:string}>}
 */
export function hotbarCells(forge) {
  if (!forge.survival) {
    return PLACEABLE_BLOCKS.map((id) => ({
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
```

importing `slotVisual` from `./forge-inventory.js`, `blockForItem` from
`../rpg/items.js` and `HOTBAR_SLOTS` from `../rpg/inventory.js`.

Rewrite `renderHotbar` to draw from `hotbarCells(forge)`: in survival it is
exactly nine cells so the windowing is unnecessary; keep `hotbarWindow` for the
creative palette only.

In `js/forge.js`:

```js
  /** Select a hotbar slot, which is what decides the block you place. */
  selectHotbar(i) {
    if (!this.survival || i < 0 || i >= HOTBAR_SLOTS) return;
    this.hotbarIndex = i;
    this.refreshHeld();
    this.audio.menuSelect();
  }

  /**
   * `heldItem` follows the selected slot. The selection deliberately stays put
   * when a slot empties: jumping would move the player's hand without asking.
   */
  refreshHeld() {
    if (!this.survival) { this.heldItem = null; return; }
    this.heldItem = this.survival.inventory.slots[this.hotbarIndex]?.item ?? null;
  }
```

Call `refreshHeld()` after any operation that changes the inventory: the end of
`placeBlock`, the completion branch of the break tick, a craft, and
`_setInventory(false)`.

Route the digit keys: in survival `Digit1`–`Digit9` call `selectHotbar(n - 1)`;
in creative they keep setting `this.tile` exactly as today. Route the wheel the
same way — in survival it steps `hotbarIndex`, in creative it cycles the palette.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/forge-hotbar.test.js`
Expected: PASS, 8 tests

- [ ] **Step 5: Run both suites**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/forge.js src/ui/forge-hud.js tests/unit/forge-hotbar.test.js
git commit -m "feat(forge): show carried stacks in the survival hotbar"
```

---

### Task 8: Retire the survival palette workaround

**Files:**
- Modify: `js/forge.js`
- Test: `tests/unit/rpg-forge-adapter.test.js`

**Interfaces:**
- Produces: `SURVIVAL_BLOCKS` removed from the placement path; `_palette()` used only by creative

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-forge-adapter.test.js
describe("placement comes from the hotbar, not the palette", () => {
  it("places what the selected hotbar slot holds", async () => {
    const { ForgeMode } = await import("../../js/forge.js");
    const f = new ForgeMode({
      renderer: null, audio: { menuSelect() {}, menuConfirm() {} },
      settings: {}, keybinds: {}, canvas: null,
    });
    f._adopt(new World({ mode: "survival" }), 0);
    f.active = true;
    f.survival.inventory.slots[0] = { item: "workbench", n: 1 };
    f.selectHotbar(0);
    expect(f.heldItem).toBe("workbench");

    // The station no longer has to be in a palette to be placeable.
    const spend = f.survival.tryPlace(f.heldItem);
    expect(spend).toEqual({ ok: true, blockId: 16 });
  });

  it("keeps the creative palette at exactly the original fourteen", async () => {
    const { PLACEABLE_BLOCKS } = await import("../../js/forge.js");
    expect(PLACEABLE_BLOCKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-forge-adapter.test.js`
Expected: PASS for the first case only if Task 7 landed; run it to confirm the current state, then proceed.

- [ ] **Step 3: Write the implementation**

In `placeBlock`, survival now reads only the hotbar:

```js
    const itemId = this.survival ? this.heldItem : itemForBlock(this.tile);
    if (!itemId) { this._warn("Nothing selected"); return; }
```

Delete `SURVIVAL_BLOCKS` and `STATION_BLOCKS` from the placement path, and make
`_palette()` return `PLACEABLE_BLOCKS` unconditionally — it is a creative-only
concept again. Remove the `_setMode` guard that reset `this.tile` off a station,
since `this.tile` can no longer be one.

Update the tests added in spec 2 that asserted the survival palette contained
16/17/18: they now assert the opposite — that placement comes from `heldItem`
and the palette is creative-only. Do not delete them; invert them.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/rpg-forge-adapter.test.js`
Expected: PASS

- [ ] **Step 5: Run both suites**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS. The spec-2 e2e "a player can select and place a station with
only wheel and click" will need rewriting for the new path — it should now open
the inventory, put the workbench in a hotbar slot, select it, close, and click.
Rewrite it rather than deleting it.

- [ ] **Step 6: Commit**

```bash
git add js/forge.js tests/unit/rpg-forge-adapter.test.js tests/forge.spec.js
git commit -m "refactor(forge): place from the hotbar and retire the survival palette"
```

---

### Task 9: End-to-end, driven by real input

**Files:**
- Modify: `tests/forge.spec.js`, `js/testing/debug-bridge.js`

- [ ] **Step 1: Write the e2e test**

The test must use real events throughout — `page.keyboard.press`, `page.mouse.move`, `page.mouse.down/up` — and must not assign `heldItem`, `carried` or `hotbarIndex` directly. Two features in this project have shipped complete, tested and unreachable; assigning fields is how that happened both times.

```js
  test("survival: arrange the hotbar by dragging, then place what you selected", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);
    await page.keyboard.press("KeyM");          // into survival
    await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.noclip = true;
      b.survival.inventory.slots[12] = { item: "stone", n: 20 }; // in the backpack
    });

    await page.keyboard.press("KeyI");
    expect(await page.evaluate(() => window.ccDebug.game.builder.invOpen)).toBe(true);
    expect(await page.evaluate(() => document.pointerLockElement === null)).toBe(true);

    // Drag slot 12 down to hotbar slot 0 with the real mouse.
    const pts = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      const { inventoryLayout } = window.ccDebug.layout;
      const l = inventoryLayout(b.hudSize.w, b.hudSize.h, b.survival.inventory.slots.length);
      const at = (i) => { const c = l.cells.find((x) => x.index === i); return [c.x + c.w / 2, c.y + c.h / 2]; };
      return { from: at(12), to: at(0) };
    });
    await page.mouse.move(...pts.from);
    await page.mouse.down();
    await page.mouse.move(...pts.to, { steps: 8 });
    await page.mouse.up();

    const moved = await page.evaluate(() => {
      const inv = window.ccDebug.game.builder.survival.inventory;
      return { at0: inv.slots[0], at12: inv.slots[12], held: window.ccDebug.game.builder.heldItem };
    });
    expect(moved.at0).toEqual({ item: "stone", n: 20 });
    expect(moved.at12).toBe(null);

    await page.keyboard.press("KeyI");          // close
    await page.keyboard.press("Digit1");        // select slot 0
    expect(await page.evaluate(() => window.ccDebug.game.builder.heldItem)).toBe("stone");

    // And place it with a click.
    await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      for (let x = 40; x <= 47; x++) b.world.set(x, 64, 49, 0);
      b.world.set(45, 64, 49, 1);
    });
    await aimAndUpdate(page, { x: 40.5, y: 64.5, z: 48, angle: 0, pitch: 0 });
    const placed = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      const before = b.survival.inventory.count("stone");
      b.handleMouseDown(0);
      return { before, after: b.survival.inventory.count("stone") };
    });
    expect(placed.after).toBe(placed.before - 1);

    await screenshot(page, "forge-inventory");
  });
```

Expose `inventoryLayout` on the debug bridge as `window.ccDebug.layout` so the
test can find the cells without duplicating the geometry.

- [ ] **Step 2: Run the e2e suite**

Run: `npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS, 16 tests

- [ ] **Step 3: Look at the screenshot**

Open `screenshots/forge-inventory.png` and confirm the grid reads: nine hotbar
cells distinct from the backpack, counts legible, the selected slot obvious.
Report honestly if it does not — a passing test says nothing about whether the
screen is usable.

- [ ] **Step 4: Run both suites and report the line count**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS. Report `wc -l js/forge.js` — it must be below 2046.

- [ ] **Step 5: Commit**

```bash
git add tests/forge.spec.js js/testing/debug-bridge.js
git commit -m "test(forge): drag a stack to the hotbar and place it, with real input"
```

---

## Done when

- `npm run test:unit` passes, roughly 1090 tests across 70 files.
- `npx playwright test tests/forge.spec.js --workers=1` passes, 16 tests.
- `js/forge.js` is **below 2046 lines**.
- `I` opens a clickable inventory in survival; drag, shift-click and select all work with real mouse input.
- The survival hotbar shows stacks, counts and tool wear; the digit keys select slots.
- Placement reads `heldItem`, and `SURVIVAL_BLOCKS` is gone.
- Creative is unchanged: the same fourteen-block unlimited palette, no inventory screen.
