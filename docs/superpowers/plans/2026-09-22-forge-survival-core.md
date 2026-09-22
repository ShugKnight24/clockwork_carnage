# Forge Survival Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the voxel Forge a survival mode where you mine blocks into an inventory, refine them into building materials and pickaxes, and build with what you made — while the existing creative editor keeps working untouched.

**Architecture:** Eight new pure modules under `src/rpg/` hold every rule and import neither the renderer nor `js/forge.js`. A single `SurvivalSession` owns them and is the only thing `ForgeMode` knows about: one nullable field, `this.survival`, and a branch in each of the two existing block mutators. Survival is selected per world by `world.meta.mode`, which persists for free because the v4 codec `structuredClone`s `meta` wholesale.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium with GPU flags (e2e), IndexedDB.

**Spec:** `docs/superpowers/specs/2026-09-22-forge-survival-core-design.md`

## Global Constraints

- Branch: `feat/forge-survival` (cut from `feat/v0.8.0`). Never commit to `master`.
- No AI attribution in any commit message. Conventional Commits: `<type>(<scope>): <imperative summary>`.
- Modules under `src/rpg/` must not import `js/forge.js`, `src/rendering/**`, or anything touching a GL context. `gather.js` is the only one that may import `src/world/blocks.js`.
- The v4 world codec is not modified. `world.meta.mode` persists via the existing `structuredClone`.
- `BLOCKS` in `src/world/blocks.js` keeps all 16 entries in id order with unchanged names — `tests/unit/world.test.js` asserts both.
- Levels are derived from XP, never stored.
- Every tuning number lives in a table in its own module. No numeric literal at a call site.
- Creative mode behaviour must be byte-identical to today: unlimited palette, instant break, no XP, no inventory.
- Baseline at the time of writing: 856 unit tests across 52 files. On completion the branch stands at 956 across 64. Run `npm run test:unit` before every commit.

## Review Focus

These are the failure modes the spec implies but that no task's own happy path exercises. Each has a test pinned to the task that owns the code.

1. **Inventory persisted with an item id the current table no longer knows** — a save written before an item was renamed. Expected: the unknown slot is dropped, the rest of the inventory loads, nothing throws. *(Task 8)*
2. **`tickBreak` called with a huge `dt` after a frame hitch or tab restore** — expected: progress advances by at most one block's worth, so a stall cannot mine a column. *(Task 9)*
3. **The targeted cell changes underneath an in-progress break** — undo, a world reload, or a generated world landing mid-hold. Expected: the break cancels rather than crediting XP for a block that is no longer there. *(Task 9)*
4. **Zero and negative quantities into `Inventory.add` / `remove`** — expected: refused, inventory unchanged, no slot created holding `0` or a negative count. *(Task 2)*
5. **XP granted past the level-50 cap** — expected: XP still accumulates, `levelFor` clamps at 50, and no gate silently reopens. *(Task 3)*

---

## File Structure

| File | Responsibility |
|---|---|
| `src/rpg/items.js` | Item table, stack sizes, block↔item mapping |
| `src/rpg/inventory.js` | `Inventory` — slots, fits/add/remove/count, serialization |
| `src/rpg/skills.js` | Skill table, XP curve, `levelFor`, `Skills` ledger |
| `src/rpg/tools.js` | Tool table, speed multipliers, best-tool-held selection |
| `src/rpg/gather.js` | Per-block gathering data: `canMine`, `breakTime`, `dropsFor`, `xpFor` |
| `src/rpg/recipes.js` | Recipe table, availability by skill level and station |
| `src/rpg/crafting.js` | `canCraft` / `craft` — consume inputs, yield output, grant XP |
| `src/rpg/player-store.js` | `cc_player` IndexedDB, v1 record, load/save |
| `src/rpg/survival-session.js` | Owns the above; the only object `ForgeMode` touches |
| `js/forge.js` | Modified: `this.survival`, two mutator branches, mouse-up, craft menu, HUD |
| `js/game.js` | Modified: route `mouseup` to the Forge |
| `src/world/blocks.js` | Unmodified — gathering data lives in `gather.js`, keyed by block id |

---

### Task 1: Item table

**Files:**
- Create: `src/rpg/items.js`
- Test: `tests/unit/rpg-items.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `ITEMS` (array), `itemById(id)`, `itemForBlock(blockId)`, `blockForItem(itemId)`, `STACK_MAX`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-items.test.js
import { describe, it, expect } from "vitest";
import { ITEMS, itemById, itemForBlock, blockForItem, STACK_MAX } from "../../src/rpg/items.js";

describe("items", () => {
  it("maps every placeable block to exactly one item and back", () => {
    const blockIds = ITEMS.filter((i) => i.blockId != null).map((i) => i.blockId);
    expect(new Set(blockIds).size).toBe(blockIds.length);
    expect(itemForBlock(1)).toBe("stone");
    expect(itemForBlock(13)).toBe("rock");
    expect(blockForItem("stone")).toBe(1);
    expect(blockForItem("glass")).toBe(8);
  });

  it("returns null for blocks and items with no counterpart", () => {
    expect(itemForBlock(0)).toBe(null);   // air
    expect(itemForBlock(15)).toBe(null);  // bedrock
    expect(itemForBlock(999)).toBe(null);
    expect(blockForItem("pick_stone")).toBe(null); // tools are not placeable
    expect(blockForItem("nope")).toBe(null);
  });

  it("gives every item a name and the shared stack size", () => {
    expect(ITEMS.length).toBeGreaterThan(0);
    ITEMS.forEach((i) => {
      expect(typeof i.name).toBe("string");
      expect(i.name.length).toBeGreaterThan(0);
      expect(i.stack).toBe(STACK_MAX);
    });
    expect(STACK_MAX).toBe(64);
    expect(itemById("pick_metal").name).toBe("Metal Pickaxe");
    expect(itemById("nope")).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-items.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/items.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/items.js
/**
 * Item table for the survival Forge. Ids are strings so reordering never
 * breaks a save. `blockId` is present only on items that can be placed;
 * tools have none. Bedrock (15) and Air (0) deliberately have no item.
 */
export const STACK_MAX = 64;

const block = (id, name, blockId) => ({ id, name, stack: STACK_MAX, blockId });
const tool = (id, name) => ({ id, name, stack: STACK_MAX, blockId: null });

export const ITEMS = [
  block("stone", "Stone", 1),
  block("tech", "Tech Plate", 2),
  block("metal", "Metal", 3),
  block("energy", "Energy Cell", 4),
  block("door", "Door", 5),
  block("secret", "Secret Panel", 6),
  block("boss", "Boss Plate", 7),
  block("glass", "Glass", 8),
  block("rift", "Rift Shard", 9),
  block("dirt", "Dirt", 10),
  block("grass", "Grass", 11),
  block("sand", "Sand", 12),
  block("rock", "Rock", 13),
  block("ore", "Ore", 14),
  tool("pick_stone", "Stone Pickaxe"),
  tool("pick_metal", "Metal Pickaxe"),
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
const BY_BLOCK = new Map(ITEMS.filter((i) => i.blockId != null).map((i) => [i.blockId, i.id]));

export const itemById = (id) => BY_ID.get(id) || null;
export const itemForBlock = (blockId) => BY_BLOCK.get(blockId) ?? null;
export const blockForItem = (itemId) => BY_ID.get(itemId)?.blockId ?? null;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-items.test.js`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/items.js tests/unit/rpg-items.test.js
git commit -m "feat(rpg): add the survival item table and block mapping"
```

---

### Task 2: Inventory

**Files:**
- Create: `src/rpg/inventory.js`
- Test: `tests/unit/rpg-inventory.test.js`

**Interfaces:**
- Consumes: `STACK_MAX`, `itemById` from `src/rpg/items.js`
- Produces: `Inventory` class with `HOTBAR_SLOTS`, `TOTAL_SLOTS`, `slots`, `fits(itemId, n)`, `add(itemId, n)`, `remove(itemId, n)`, `count(itemId)`, `toJSON()`, `static fromJSON(data)`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-inventory.test.js
import { describe, it, expect } from "vitest";
import { Inventory, HOTBAR_SLOTS, TOTAL_SLOTS } from "../../src/rpg/inventory.js";

describe("Inventory", () => {
  it("is nine hotbar slots plus twenty-seven backpack slots", () => {
    expect(HOTBAR_SLOTS).toBe(9);
    expect(TOTAL_SLOTS).toBe(36);
    expect(new Inventory().slots.length).toBe(36);
  });

  it("merges into an existing stack before opening a new slot", () => {
    const inv = new Inventory();
    expect(inv.add("stone", 10)).toBe(10);
    expect(inv.add("stone", 5)).toBe(5);
    expect(inv.count("stone")).toBe(15);
    expect(inv.slots.filter((s) => s).length).toBe(1);
  });

  it("overflows past the stack size into a second slot", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    expect(inv.count("stone")).toBe(70);
    const used = inv.slots.filter((s) => s);
    expect(used.length).toBe(2);
    expect(used[0].n).toBe(64);
    expect(used[1].n).toBe(6);
  });

  it("adds only what fits and reports the amount taken", () => {
    const inv = new Inventory();
    for (let i = 0; i < TOTAL_SLOTS; i++) inv.add("stone", 64);
    expect(inv.count("stone")).toBe(TOTAL_SLOTS * 64);
    expect(inv.fits("rock", 1)).toBe(false);
    expect(inv.add("rock", 1)).toBe(0);
    expect(inv.fits("stone", 1)).toBe(false);
  });

  it("removes all-or-nothing across several stacks", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    expect(inv.remove("stone", 100)).toBe(false);
    expect(inv.count("stone")).toBe(70);
    expect(inv.remove("stone", 68)).toBe(true);
    expect(inv.count("stone")).toBe(2);
    expect(inv.slots.filter((s) => s).length).toBe(1);
  });

  // Review Focus 4
  it("refuses zero, negative and non-integer quantities without mutating", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    expect(inv.add("stone", 0)).toBe(0);
    expect(inv.add("stone", -3)).toBe(0);
    expect(inv.add("stone", 1.5)).toBe(0);
    expect(inv.remove("stone", 0)).toBe(false);
    expect(inv.remove("stone", -3)).toBe(false);
    expect(inv.count("stone")).toBe(5);
    expect(inv.slots.filter((s) => s && s.n <= 0).length).toBe(0);
  });

  it("refuses unknown item ids", () => {
    const inv = new Inventory();
    expect(inv.add("nope", 1)).toBe(0);
    expect(inv.count("nope")).toBe(0);
  });

  it("round-trips through JSON", () => {
    const inv = new Inventory();
    inv.add("stone", 70);
    inv.add("rock", 3);
    const back = Inventory.fromJSON(JSON.parse(JSON.stringify(inv.toJSON())));
    expect(back.count("stone")).toBe(70);
    expect(back.count("rock")).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-inventory.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/inventory.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/inventory.js
import { STACK_MAX, itemById } from "./items.js";

export const HOTBAR_SLOTS = 9;
export const BACKPACK_SLOTS = 27;
export const TOTAL_SLOTS = HOTBAR_SLOTS + BACKPACK_SLOTS;

/** A whole, positive count. Guards every quantity entering the inventory. */
const validQty = (n) => Number.isInteger(n) && n > 0;

export class Inventory {
  constructor(size = TOTAL_SLOTS) {
    /** @type {Array<{item:string,n:number}|null>} */
    this.slots = new Array(size).fill(null);
  }

  count(itemId) {
    return this.slots.reduce((t, s) => (s && s.item === itemId ? t + s.n : t), 0);
  }

  /** @returns {boolean} true when all `n` would be accepted */
  fits(itemId, n) {
    if (!validQty(n) || !itemById(itemId)) return false;
    let room = 0;
    for (const s of this.slots) {
      room += s === null ? STACK_MAX : s.item === itemId ? STACK_MAX - s.n : 0;
      if (room >= n) return true;
    }
    return false;
  }

  /** @returns {number} how many were actually added */
  add(itemId, n) {
    if (!validQty(n) || !itemById(itemId)) return 0;
    let left = n;
    // Top up existing stacks first so the inventory stays compact.
    for (const s of this.slots) {
      if (left === 0) break;
      if (s && s.item === itemId && s.n < STACK_MAX) {
        const take = Math.min(STACK_MAX - s.n, left);
        s.n += take; left -= take;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i] === null) {
        const take = Math.min(STACK_MAX, left);
        this.slots[i] = { item: itemId, n: take }; left -= take;
      }
    }
    return n - left;
  }

  /** All-or-nothing, so a partial failure never destroys materials. */
  remove(itemId, n) {
    if (!validQty(n) || this.count(itemId) < n) return false;
    let left = n;
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (!s || s.item !== itemId) continue;
      const take = Math.min(s.n, left);
      s.n -= take; left -= take;
      if (s.n === 0) this.slots[i] = null;
    }
    return true;
  }

  toJSON() {
    return this.slots.map((s) => (s ? { item: s.item, n: s.n } : null));
  }

  /** Unknown item ids are dropped rather than thrown on — see player-store. */
  static fromJSON(data) {
    const inv = new Inventory();
    if (!Array.isArray(data)) return inv;
    data.slice(0, TOTAL_SLOTS).forEach((s, i) => {
      if (s && itemById(s.item) && validQty(s.n)) {
        inv.slots[i] = { item: s.item, n: Math.min(s.n, STACK_MAX) };
      }
    });
    return inv;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-inventory.test.js`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/inventory.js tests/unit/rpg-inventory.test.js
git commit -m "feat(rpg): add the inventory with stack merge and all-or-nothing removal"
```

---

### Task 3: Skills ledger and XP curve

**Files:**
- Create: `src/rpg/skills.js`
- Test: `tests/unit/rpg-skills.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `SKILLS`, `MAX_LEVEL`, `xpForLevel(L)`, `levelFor(xp)`, `Skills` class with `xp`, `level(id)`, `grant(id, amount)`, `toJSON()`, `static fromJSON(data)`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-skills.test.js
import { describe, it, expect } from "vitest";
import { SKILLS, MAX_LEVEL, xpForLevel, levelFor, Skills } from "../../src/rpg/skills.js";

describe("skill table", () => {
  it("launches with mining and construction", () => {
    expect(SKILLS.map((s) => s.id)).toEqual(["mining", "construction"]);
    SKILLS.forEach((s) => expect(typeof s.name).toBe("string"));
    expect(MAX_LEVEL).toBe(50);
  });
});

describe("xp curve", () => {
  it("starts at level 1 for zero xp and rises monotonically", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelFor(0)).toBe(1);
    for (let L = 2; L <= MAX_LEVEL; L++) {
      expect(xpForLevel(L)).toBeGreaterThan(xpForLevel(L - 1));
    }
  });

  it("levels exactly at the threshold, not one xp early", () => {
    for (const L of [2, 5, 15, 50]) {
      const need = xpForLevel(L);
      expect(levelFor(need - 1)).toBe(L - 1);
      expect(levelFor(need)).toBe(L);
    }
  });

  // Review Focus 5
  it("clamps at the cap while xp keeps accumulating", () => {
    const beyond = xpForLevel(MAX_LEVEL) * 10;
    expect(levelFor(beyond)).toBe(MAX_LEVEL);
    const s = new Skills();
    s.grant("mining", beyond);
    s.grant("mining", beyond);
    expect(s.xp.mining).toBe(beyond * 2);
    expect(s.level("mining")).toBe(MAX_LEVEL);
  });
});

describe("Skills", () => {
  it("starts every skill at zero xp and level 1", () => {
    const s = new Skills();
    expect(s.level("mining")).toBe(1);
    expect(s.level("construction")).toBe(1);
  });

  it("reports when a grant crossed a level boundary", () => {
    const s = new Skills();
    const need = xpForLevel(2);
    expect(s.grant("mining", need - 1)).toEqual({ level: 1, leveled: false });
    expect(s.grant("mining", 1)).toEqual({ level: 2, leveled: true });
  });

  it("ignores unknown skills and non-positive grants", () => {
    const s = new Skills();
    expect(s.grant("nope", 100)).toBe(null);
    expect(s.grant("mining", 0)).toBe(null);
    expect(s.grant("mining", -5)).toBe(null);
    expect(s.xp.mining).toBe(0);
    expect(s.level("nope")).toBe(1);
  });

  it("round-trips through JSON and ignores unknown keys", () => {
    const s = Skills.fromJSON({ mining: 500, nope: 9999 });
    expect(s.xp.mining).toBe(500);
    expect(s.xp.nope).toBe(undefined);
    expect(Skills.fromJSON(null).xp.mining).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-skills.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/skills.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/skills.js
/**
 * Skills are a table so adding one later costs no ledger change. Levels are
 * always derived from xp, never stored, so the curve can be retuned without
 * migrating a save.
 */
export const SKILLS = [
  { id: "mining", name: "Mining" },
  { id: "construction", name: "Construction" },
];

export const MAX_LEVEL = 50;
const CURVE_SCALE = 8;
const CURVE_POWER = 1.85;

const SKILL_IDS = new Set(SKILLS.map((s) => s.id));

/** Cumulative xp needed to reach level `L`. Level 1 is free. */
export function xpForLevel(L) {
  if (L <= 1) return 0;
  return Math.floor(CURVE_SCALE * (L - 1) ** CURVE_POWER);
}

/** Inverse of `xpForLevel`, clamped to the cap. */
export function levelFor(xp) {
  let L = 1;
  while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++;
  return L;
}

export class Skills {
  constructor(xp = {}) {
    this.xp = {};
    for (const s of SKILLS) this.xp[s.id] = xp[s.id] || 0;
  }

  level(id) {
    return SKILL_IDS.has(id) ? levelFor(this.xp[id]) : 1;
  }

  /** @returns {{level:number,leveled:boolean}|null} null when nothing was granted */
  grant(id, amount) {
    if (!SKILL_IDS.has(id) || !(amount > 0)) return null;
    const before = this.level(id);
    this.xp[id] += amount;
    const level = this.level(id);
    return { level, leveled: level > before };
  }

  toJSON() { return { ...this.xp }; }

  static fromJSON(data) {
    return new Skills(data && typeof data === "object" ? data : {});
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-skills.test.js`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/skills.js tests/unit/rpg-skills.test.js
git commit -m "feat(rpg): add the skills ledger and derived-level xp curve"
```

---

### Task 4: Tools

**Files:**
- Create: `src/rpg/tools.js`
- Test: `tests/unit/rpg-tools.test.js`

**Interfaces:**
- Consumes: `Inventory` from `src/rpg/inventory.js`
- Produces: `TOOLS` (object keyed `HAND`/`PICK_STONE`/`PICK_METAL`), `toolForItem(itemId)`, `bestTool(inventory)`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-tools.test.js
import { describe, it, expect } from "vitest";
import { TOOLS, toolForItem, bestTool } from "../../src/rpg/tools.js";
import { Inventory } from "../../src/rpg/inventory.js";

describe("tools", () => {
  it("orders tiers so a better tool always has a smaller multiplier", () => {
    expect(TOOLS.HAND.mult).toBe(1);
    expect(TOOLS.HAND.tier).toBe(0);
    expect(TOOLS.PICK_STONE.mult).toBeLessThan(TOOLS.HAND.mult);
    expect(TOOLS.PICK_METAL.mult).toBeLessThan(TOOLS.PICK_STONE.mult);
    expect(TOOLS.PICK_METAL.tier).toBeGreaterThan(TOOLS.PICK_STONE.tier);
  });

  it("maps pickaxe items to tools and everything else to nothing", () => {
    expect(toolForItem("pick_stone")).toBe(TOOLS.PICK_STONE);
    expect(toolForItem("pick_metal")).toBe(TOOLS.PICK_METAL);
    expect(toolForItem("stone")).toBe(null);
    expect(toolForItem("nope")).toBe(null);
  });

  it("picks the best tier held, and bare hands when none is", () => {
    const empty = new Inventory();
    expect(bestTool(empty)).toBe(TOOLS.HAND);

    const stone = new Inventory();
    stone.add("pick_stone", 1);
    expect(bestTool(stone)).toBe(TOOLS.PICK_STONE);

    const both = new Inventory();
    both.add("pick_stone", 1);
    both.add("pick_metal", 1);
    expect(bestTool(both)).toBe(TOOLS.PICK_METAL);

    const reversed = new Inventory();
    reversed.add("pick_metal", 1);
    reversed.add("pick_stone", 1);
    expect(bestTool(reversed)).toBe(TOOLS.PICK_METAL);
  });

  it("falls back to hands for a null inventory", () => {
    expect(bestTool(null)).toBe(TOOLS.HAND);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-tools.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/tools.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/tools.js
/**
 * Tool tiers. `mult` scales break time, so lower is faster. The best tool held
 * is chosen automatically — there is deliberately no equip UI before the
 * hotbar redesign. Durability is not modelled; it arrives with stations.
 */
export const TOOLS = {
  HAND: { id: "hand", name: "Bare Hands", item: null, mult: 1.0, tier: 0 },
  PICK_STONE: { id: "pick_stone", name: "Stone Pickaxe", item: "pick_stone", mult: 0.75, tier: 1 },
  PICK_METAL: { id: "pick_metal", name: "Metal Pickaxe", item: "pick_metal", mult: 0.55, tier: 2 },
};

const BY_ITEM = new Map(
  Object.values(TOOLS).filter((t) => t.item).map((t) => [t.item, t]),
);

export const toolForItem = (itemId) => BY_ITEM.get(itemId) || null;

/** @returns {object} the highest-tier tool in `inventory`, else `TOOLS.HAND` */
export function bestTool(inventory) {
  if (!inventory) return TOOLS.HAND;
  let best = TOOLS.HAND;
  for (const [itemId, tool] of BY_ITEM) {
    if (tool.tier > best.tier && inventory.count(itemId) > 0) best = tool;
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-tools.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/tools.js tests/unit/rpg-tools.test.js
git commit -m "feat(rpg): add pickaxe tiers and best-tool-held selection"
```

---

### Task 5: Gathering rules

**Files:**
- Create: `src/rpg/gather.js`
- Test: `tests/unit/rpg-gather.test.js`

**Interfaces:**
- Consumes: `BLOCKS`, `AIR`, `BEDROCK` from `src/world/blocks.js`; `itemForBlock` from `src/rpg/items.js`; `TOOLS` from `src/rpg/tools.js`
- Produces: `GATHER` (object keyed by block id), `canMine(blockId, miningLevel)`, `breakTime(blockId, level, tool)`, `dropsFor(blockId)`, `xpFor(blockId)`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-gather.test.js
import { describe, it, expect } from "vitest";
import { GATHER, canMine, breakTime, dropsFor, xpFor } from "../../src/rpg/gather.js";
import { TOOLS } from "../../src/rpg/tools.js";
import { BLOCKS, AIR, BEDROCK } from "../../src/world/blocks.js";

describe("gather table", () => {
  it("covers every solid block except air and bedrock", () => {
    const covered = Object.keys(GATHER).map(Number);
    const expected = BLOCKS.filter((b) => b.id !== AIR && b.id !== BEDROCK).map((b) => b.id);
    expect(covered.sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b));
  });
});

describe("canMine", () => {
  it("gates on mining level and names the requirement", () => {
    expect(canMine(10, 1)).toEqual({ ok: true });         // dirt
    expect(canMine(14, 15)).toEqual({ ok: true });        // ore at exactly 15
    expect(canMine(14, 14)).toEqual({ ok: false, reason: "Requires Mining 15" });
    expect(canMine(13, 4)).toEqual({ ok: false, reason: "Requires Mining 5" }); // rock
  });

  it("refuses bedrock, air and unknown ids", () => {
    expect(canMine(BEDROCK, 50)).toEqual({ ok: false, reason: "Unbreakable" });
    expect(canMine(AIR, 50)).toEqual({ ok: false, reason: "Unbreakable" });
    expect(canMine(999, 50)).toEqual({ ok: false, reason: "Unbreakable" });
  });
});

describe("breakTime", () => {
  it("defaults to bare hands", () => {
    expect(breakTime(1, 1)).toBe(breakTime(1, 1, TOOLS.HAND));
  });

  it("never gets slower as level rises", () => {
    let prev = Infinity;
    for (let L = 1; L <= 50; L++) {
      const t = breakTime(13, L);
      expect(t).toBeLessThanOrEqual(prev);
      prev = t;
    }
  });

  it("never gets slower with a better tool", () => {
    const hand = breakTime(13, 1, TOOLS.HAND);
    const stone = breakTime(13, 1, TOOLS.PICK_STONE);
    const metal = breakTime(13, 1, TOOLS.PICK_METAL);
    expect(stone).toBeLessThan(hand);
    expect(metal).toBeLessThan(stone);
  });

  it("is harder for harder blocks and always positive", () => {
    expect(breakTime(14, 20)).toBeGreaterThan(breakTime(10, 20)); // ore vs dirt
    expect(breakTime(10, 50, TOOLS.PICK_METAL)).toBeGreaterThan(0);
  });

  it("is infinite for unbreakable blocks", () => {
    expect(breakTime(BEDROCK, 50)).toBe(Infinity);
    expect(breakTime(999, 50)).toBe(Infinity);
  });
});

describe("drops and xp", () => {
  it("drops the matching item and grants the table's xp", () => {
    expect(dropsFor(13)).toBe("rock");
    expect(xpFor(13)).toBe(15);
    expect(xpFor(14)).toBe(35);
  });

  it("drops and grants nothing for unknown ids rather than throwing", () => {
    expect(dropsFor(999)).toBe(null);
    expect(xpFor(999)).toBe(0);
    expect(dropsFor(BEDROCK)).toBe(null);
    expect(xpFor(AIR)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-gather.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/gather.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/gather.js
/**
 * Gathering rules. This is the one seam between the world's block table and
 * the RPG's item table; nothing else in src/rpg imports blocks.js.
 * Every number here is a tuning knob — none may be inlined at a call site.
 */
import { BLOCKS, AIR, BEDROCK } from "../world/blocks.js";
import { itemForBlock } from "./items.js";
import { TOOLS } from "./tools.js";

const LEVEL_SPEED = 0.03; // each mining level shaves this fraction off the divisor
const MS_PER_HARDNESS = 1000;

/** blockId -> { minLevel, xp } */
export const GATHER = {
  1:  { minLevel: 1,  xp: 10 },  // Stone
  2:  { minLevel: 1,  xp: 10 },  // Tech
  3:  { minLevel: 10, xp: 20 },  // Metal
  4:  { minLevel: 1,  xp: 10 },  // Energy
  5:  { minLevel: 1,  xp: 10 },  // Door
  6:  { minLevel: 20, xp: 30 },  // Secret
  7:  { minLevel: 25, xp: 50 },  // Boss
  8:  { minLevel: 1,  xp: 10 },  // Glass
  9:  { minLevel: 25, xp: 50 },  // Rift
  10: { minLevel: 1,  xp: 5  },  // Dirt
  11: { minLevel: 1,  xp: 5  },  // Grass
  12: { minLevel: 1,  xp: 5  },  // Sand
  13: { minLevel: 5,  xp: 15 },  // Rock
  14: { minLevel: 15, xp: 35 },  // Ore
};

const entry = (blockId) => GATHER[blockId] || null;

/** @returns {{ok:true}|{ok:false,reason:string}} */
export function canMine(blockId, miningLevel) {
  const g = entry(blockId);
  if (!g || blockId === AIR || blockId === BEDROCK) {
    return { ok: false, reason: "Unbreakable" };
  }
  if (miningLevel < g.minLevel) {
    return { ok: false, reason: `Requires Mining ${g.minLevel}` };
  }
  return { ok: true };
}

/** @returns {number} milliseconds to break, or Infinity when unbreakable */
export function breakTime(blockId, level, tool = TOOLS.HAND) {
  if (!entry(blockId)) return Infinity;
  const hardness = BLOCKS[blockId]?.hardness;
  if (!Number.isFinite(hardness)) return Infinity;
  return (hardness * MS_PER_HARDNESS * tool.mult) / (1 + level * LEVEL_SPEED);
}

/** @returns {string|null} the item id a broken block yields */
export const dropsFor = (blockId) => (entry(blockId) ? itemForBlock(blockId) : null);

/** @returns {number} mining xp for breaking this block */
export const xpFor = (blockId) => entry(blockId)?.xp ?? 0;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-gather.test.js`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/gather.js tests/unit/rpg-gather.test.js
git commit -m "feat(rpg): add gathering gates, break times and drop tables"
```

---

### Task 6: Recipe table

**Files:**
- Create: `src/rpg/recipes.js`
- Test: `tests/unit/rpg-recipes.test.js`

**Interfaces:**
- Consumes: `itemById` from `src/rpg/items.js`
- Produces: `RECIPES`, `recipeById(id)`, `availableRecipes(skills, station)` (station defaults `null`)

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-recipes.test.js
import { describe, it, expect } from "vitest";
import { RECIPES, recipeById, availableRecipes } from "../../src/rpg/recipes.js";
import { itemById } from "../../src/rpg/items.js";
import { Skills } from "../../src/rpg/skills.js";

describe("recipe table", () => {
  it("references only real items and yields a positive count", () => {
    RECIPES.forEach((r) => {
      expect(itemById(r.output[0])).not.toBe(null);
      expect(r.output[1]).toBeGreaterThan(0);
      r.inputs.forEach(([id, n]) => {
        expect(itemById(id)).not.toBe(null);
        expect(n).toBeGreaterThan(0);
      });
      expect(r.xp).toBeGreaterThan(0);
      expect(r.requires.construction).toBeGreaterThanOrEqual(1);
    });
  });

  it("has unique ids and ships the basic tier station-free", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("cut_stone");
    expect(ids).toContain("pick_stone");
    expect(RECIPES.filter((r) => r.station === null).length).toBe(RECIPES.length);
  });

  it("never closes a cycle that returns its own inputs", () => {
    // A recipe whose output is also one of its inputs would be an xp loop.
    RECIPES.forEach((r) => {
      expect(r.inputs.map(([id]) => id)).not.toContain(r.output[0]);
    });
  });

  it("looks a recipe up by id", () => {
    expect(recipeById("cut_stone").output).toEqual(["stone", 1]);
    expect(recipeById("nope")).toBe(null);
  });
});

describe("availableRecipes", () => {
  it("returns what the construction level allows, with the rest marked locked", () => {
    const s = new Skills();
    const low = availableRecipes(s);
    expect(low.find((r) => r.id === "cut_stone").locked).toBe(false);
    expect(low.find((r) => r.id === "pick_metal").locked).toBe(true);
    expect(low.find((r) => r.id === "pick_metal").reason).toBe("Requires Construction 10");
  });

  it("unlocks as construction rises", () => {
    const s = new Skills({ construction: 10_000 });
    expect(availableRecipes(s).every((r) => r.locked === false)).toBe(true);
  });

  it("filters out recipes needing a station this caller does not have", () => {
    const s = new Skills({ construction: 10_000 });
    const withStation = [...RECIPES, {
      id: "x", inputs: [["stone", 1]], output: ["metal", 1],
      requires: { construction: 1 }, xp: 1, station: "workbench",
    }];
    const shown = availableRecipes(s, null, withStation);
    expect(shown.find((r) => r.id === "x")).toBe(undefined);
    expect(availableRecipes(s, "workbench", withStation).find((r) => r.id === "x")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-recipes.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/recipes.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/recipes.js
/**
 * Basic crafting tier. Every output is a block that already exists, so this
 * adds no atlas art. `station: null` means craftable anywhere; station-gated
 * tiers arrive with crafting stations and are filtered out until then.
 */
const recipe = (id, name, inputs, output, construction, xp, station = null) =>
  ({ id, name, inputs, output, requires: { construction }, xp, station });

export const RECIPES = [
  recipe("cut_stone",  "Cut Stone",     [["rock", 2]],                 ["stone", 1],      1,  10),
  recipe("melt_glass", "Melt Glass",    [["sand", 4]],                 ["glass", 1],      1,  15),
  recipe("pick_stone", "Stone Pickaxe", [["stone", 3], ["rock", 2]],   ["pick_stone", 1], 1,  25),
  recipe("smelt_metal","Smelt Metal",   [["ore", 2]],                  ["metal", 1],      5,  30),
  recipe("pick_metal", "Metal Pickaxe", [["metal", 3], ["rock", 2]],   ["pick_metal", 1], 10, 60),
];

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export const recipeById = (id) => BY_ID.get(id) || null;

/**
 * Recipes for the given station, each tagged with whether the player's skills
 * reach it. Locked entries are returned rather than hidden so levelling has a
 * visible destination.
 * @returns {Array<object & {locked:boolean, reason:string|null}>}
 */
export function availableRecipes(skills, station = null, table = RECIPES) {
  return table
    .filter((r) => r.station === station)
    .map((r) => {
      const need = r.requires.construction;
      const locked = skills.level("construction") < need;
      return { ...r, locked, reason: locked ? `Requires Construction ${need}` : null };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-recipes.test.js`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/recipes.js tests/unit/rpg-recipes.test.js
git commit -m "feat(rpg): add the basic crafting recipe table"
```

---

### Task 7: Crafting

**Files:**
- Create: `src/rpg/crafting.js`
- Test: `tests/unit/rpg-crafting.test.js`

**Interfaces:**
- Consumes: `recipeById` from `src/rpg/recipes.js`; `itemById` from `src/rpg/items.js`
- Produces: `canCraft(recipeId, inventory, skills)`, `craft(recipeId, inventory, skills)` — both return `{ok:true,...}` or `{ok:false,reason}`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-crafting.test.js
import { describe, it, expect } from "vitest";
import { canCraft, craft } from "../../src/rpg/crafting.js";
import { Inventory, TOTAL_SLOTS } from "../../src/rpg/inventory.js";
import { Skills } from "../../src/rpg/skills.js";

const stocked = (pairs) => {
  const inv = new Inventory();
  pairs.forEach(([id, n]) => inv.add(id, n));
  return inv;
};

describe("canCraft", () => {
  it("accepts exactly enough inputs", () => {
    expect(canCraft("cut_stone", stocked([["rock", 2]]), new Skills())).toEqual({ ok: true });
  });

  it("names the missing input when one short", () => {
    expect(canCraft("cut_stone", stocked([["rock", 1]]), new Skills()))
      .toEqual({ ok: false, reason: "Need 2 Rock" });
  });

  it("names the construction requirement when under-levelled", () => {
    const inv = stocked([["metal", 3], ["rock", 2]]);
    expect(canCraft("pick_metal", inv, new Skills()))
      .toEqual({ ok: false, reason: "Requires Construction 10" });
  });

  it("refuses an unknown recipe", () => {
    expect(canCraft("nope", new Inventory(), new Skills()))
      .toEqual({ ok: false, reason: "Unknown recipe" });
  });

  it("refuses when the output cannot fit", () => {
    // Every slot full, and the rock slot stays occupied after two come out,
    // so there is nowhere for the stone to go.
    const inv = new Inventory();
    inv.add("rock", 64);
    for (let i = 1; i < TOTAL_SLOTS; i++) inv.add("dirt", 64);
    expect(inv.fits("stone", 1)).toBe(false);
    expect(canCraft("cut_stone", inv, new Skills()))
      .toEqual({ ok: false, reason: "Inventory full" });
    // ...but with a slot free it goes through, proving the probe is not
    // simply reporting "full" for every full-ish inventory.
    inv.remove("dirt", 64);
    expect(canCraft("cut_stone", inv, new Skills())).toEqual({ ok: true });
  });
});

describe("craft", () => {
  it("consumes inputs, yields output and grants construction xp", () => {
    const inv = stocked([["rock", 5]]);
    const skills = new Skills();
    const res = craft("cut_stone", inv, skills);
    expect(res.ok).toBe(true);
    expect(res.output).toEqual(["stone", 1]);
    expect(inv.count("rock")).toBe(3);
    expect(inv.count("stone")).toBe(1);
    expect(skills.xp.construction).toBe(10);
    expect(skills.xp.mining).toBe(0);
  });

  it("crafts a pickaxe from stone and rock", () => {
    const inv = stocked([["stone", 3], ["rock", 2]]);
    const skills = new Skills();
    expect(craft("pick_stone", inv, skills).ok).toBe(true);
    expect(inv.count("pick_stone")).toBe(1);
    expect(inv.count("stone")).toBe(0);
    expect(inv.count("rock")).toBe(0);
  });

  it("leaves inputs untouched on every refusal", () => {
    const inv = stocked([["rock", 1]]);
    const skills = new Skills();
    expect(craft("cut_stone", inv, skills).ok).toBe(false);
    expect(inv.count("rock")).toBe(1);
    expect(skills.xp.construction).toBe(0);

    const gated = stocked([["metal", 3], ["rock", 2]]);
    expect(craft("pick_metal", gated, skills).ok).toBe(false);
    expect(gated.count("metal")).toBe(3);
    expect(gated.count("rock")).toBe(2);
  });

  it("reports a level-up through the result", () => {
    const inv = stocked([["rock", 20]]);
    const skills = new Skills();
    let leveled = false;
    for (let i = 0; i < 10; i++) {
      const r = craft("cut_stone", inv, skills);
      if (r.ok && r.leveled) leveled = true;
    }
    expect(leveled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-crafting.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/crafting.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/crafting.js
import { recipeById } from "./recipes.js";
import { itemById } from "./items.js";

/**
 * Inputs are only consumed once the output is known to fit, so a full
 * inventory can never destroy materials.
 * @returns {{ok:true}|{ok:false,reason:string}}
 */
export function canCraft(recipeId, inventory, skills) {
  const r = recipeById(recipeId);
  if (!r) return { ok: false, reason: "Unknown recipe" };

  const need = r.requires.construction;
  if (skills.level("construction") < need) {
    return { ok: false, reason: `Requires Construction ${need}` };
  }

  for (const [itemId, n] of r.inputs) {
    if (inventory.count(itemId) < n) {
      return { ok: false, reason: `Need ${n} ${itemById(itemId).name}` };
    }
  }

  // Check the output fits against the inventory as it will be *after* the
  // inputs come out, since removing them may free the slot the output needs.
  const probe = cloneInventory(inventory);
  for (const [itemId, n] of r.inputs) probe.remove(itemId, n);
  if (!probe.fits(r.output[0], r.output[1])) {
    return { ok: false, reason: "Inventory full" };
  }
  return { ok: true };
}

function cloneInventory(inventory) {
  const Ctor = inventory.constructor;
  return Ctor.fromJSON(inventory.toJSON());
}

/**
 * @returns {{ok:true,output:[string,number],leveled:boolean}|{ok:false,reason:string}}
 */
export function craft(recipeId, inventory, skills) {
  const check = canCraft(recipeId, inventory, skills);
  if (!check.ok) return check;

  const r = recipeById(recipeId);
  for (const [itemId, n] of r.inputs) inventory.remove(itemId, n);
  inventory.add(r.output[0], r.output[1]);
  const granted = skills.grant("construction", r.xp);

  return { ok: true, output: [...r.output], leveled: granted?.leveled ?? false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-crafting.test.js`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/crafting.js tests/unit/rpg-crafting.test.js
git commit -m "feat(rpg): add crafting with fit-checked, all-or-nothing input consumption"
```

---

### Task 8: Player store

**Files:**
- Create: `src/rpg/player-store.js`
- Test: `tests/unit/rpg-player-store.test.js`

**Interfaces:**
- Consumes: `Inventory`, `Skills`
- Produces: `PLAYER_VERSION`, `MemoryPlayerBackend`, `IdbPlayerBackend`, `PlayerStore` with `load(id)` / `save(id, {skills, inventory})`, and `decodePlayer(row)`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-player-store.test.js
import { describe, it, expect } from "vitest";
import { PLAYER_VERSION, MemoryPlayerBackend, PlayerStore, decodePlayer } from "../../src/rpg/player-store.js";
import { Inventory } from "../../src/rpg/inventory.js";
import { Skills } from "../../src/rpg/skills.js";

describe("decodePlayer", () => {
  it("returns a fresh session for a missing row", () => {
    const p = decodePlayer(null);
    expect(p.skills.xp.mining).toBe(0);
    expect(p.inventory.slots.every((s) => s === null)).toBe(true);
  });

  // Review Focus 1
  it("drops unknown item ids and keeps the rest of the inventory", () => {
    const p = decodePlayer({
      id: 0, version: PLAYER_VERSION,
      skills: { mining: 500 },
      inventory: [{ item: "stone", n: 4 }, { item: "gone_in_a_rename", n: 9 }, null],
    });
    expect(p.skills.xp.mining).toBe(500);
    expect(p.inventory.count("stone")).toBe(4);
    expect(p.inventory.count("gone_in_a_rename")).toBe(0);
  });

  it("refuses a record from a future version rather than coercing it", () => {
    const p = decodePlayer({ id: 0, version: PLAYER_VERSION + 1, skills: { mining: 9999 }, inventory: [] });
    expect(p.stale).toBe(true);
    expect(p.skills.xp.mining).toBe(0);
  });
});

describe("PlayerStore", () => {
  it("round-trips skills and inventory", async () => {
    const store = new PlayerStore(new MemoryPlayerBackend());
    const inventory = new Inventory();
    inventory.add("rock", 7);
    const skills = new Skills();
    skills.grant("mining", 250);

    await store.save(0, { skills, inventory });
    const back = await store.load(0);
    expect(back.inventory.count("rock")).toBe(7);
    expect(back.skills.xp.mining).toBe(250);
    expect(back.stale).toBe(false);
  });

  it("returns a fresh session when the backend throws", async () => {
    const broken = { get: () => Promise.reject(new Error("quota")), put: () => Promise.reject(new Error("quota")) };
    const store = new PlayerStore(broken);
    const p = await store.load(0);
    expect(p.skills.xp.mining).toBe(0);
    expect(p.unavailable).toBe(true);
    await expect(store.save(0, { skills: new Skills(), inventory: new Inventory() })).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-player-store.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/player-store.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/player-store.js
/**
 * Per-character progression in IndexedDB `cc_player`. Worlds stay pure terrain,
 * so the v4 world codec is untouched and a shared build never carries xp.
 * Mirrors the shape of WorldStore's IdbBackend, including dropping the cached
 * open promise on error so a private-mode or quota refusal can be retried.
 */
import { Inventory } from "./inventory.js";
import { Skills } from "./skills.js";

export const PLAYER_VERSION = 1;

export class MemoryPlayerBackend {
  constructor() { this.rows = new Map(); }
  async get(id) { return this.rows.get(id) || null; }
  async put(row) { this.rows.set(row.id, row); }
}

export class IdbPlayerBackend {
  _db() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const req = indexedDB.open("cc_player", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("players", { keyPath: "id" });
      req.onsuccess = () => res(req.result);
      req.onerror = () => { this._p = null; rej(req.error); };
    });
    return this._p;
  }
  async _tx(mode, fn) {
    const db = await this._db();
    return new Promise((res, rej) => {
      const tx = db.transaction("players", mode), st = tx.objectStore("players");
      const r = fn(st); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error);
    });
  }
  get(id) { return this._tx("readonly", (s) => s.get(id)).then((r) => r || null); }
  put(row) { return this._tx("readwrite", (s) => s.put(row)); }
}

/**
 * @returns {{skills:Skills, inventory:Inventory, stale:boolean}}
 *   `stale` marks a record from a newer build, which is never coerced and
 *   never written back over, so an older build cannot destroy it.
 */
export function decodePlayer(row) {
  if (!row || typeof row !== "object") {
    return { skills: new Skills(), inventory: new Inventory(), stale: false };
  }
  if (row.version > PLAYER_VERSION) {
    return { skills: new Skills(), inventory: new Inventory(), stale: true };
  }
  return {
    skills: Skills.fromJSON(row.skills),
    inventory: Inventory.fromJSON(row.inventory),
    stale: false,
  };
}

export class PlayerStore {
  constructor(backend = new IdbPlayerBackend()) { this.backend = backend; }

  /** Never rejects: an unavailable store yields a fresh in-memory session. */
  async load(id = 0) {
    try {
      return { ...decodePlayer(await this.backend.get(id)), unavailable: false };
    } catch {
      return { skills: new Skills(), inventory: new Inventory(), stale: false, unavailable: true };
    }
  }

  /** @returns {Promise<boolean>} false when the write could not be made */
  async save(id, { skills, inventory }) {
    try {
      await this.backend.put({
        id, version: PLAYER_VERSION,
        skills: skills.toJSON(), inventory: inventory.toJSON(),
        updatedAt: Date.now(),
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-player-store.test.js`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/rpg/player-store.js tests/unit/rpg-player-store.test.js
git commit -m "feat(rpg): persist per-character skills and inventory in cc_player"
```

---

### Task 9: SurvivalSession

**Files:**
- Create: `src/rpg/survival-session.js`
- Test: `tests/unit/rpg-survival-session.test.js`

**Interfaces:**
- Consumes: every module from Tasks 1–8
- Produces: `SurvivalSession` with `skills`, `inventory`, `progress` (0..1), `beginBreak(cell, blockId)`, `tickBreak(dtMs, cell, blockId)`, `cancelBreak()`, `tryPlace(itemId)`, `craft(recipeId)`, `markPlaced(x,y,z)`, `wasPlaced(x,y,z)`, `tool()`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-survival-session.test.js
import { describe, it, expect } from "vitest";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { Inventory } from "../../src/rpg/inventory.js";
import { Skills } from "../../src/rpg/skills.js";
import { breakTime } from "../../src/rpg/gather.js";
import { TOOLS } from "../../src/rpg/tools.js";

const session = (over = {}) =>
  new SurvivalSession({ skills: new Skills(), inventory: new Inventory(), ...over });

const DIRT = { x: 1, y: 2, z: 3 }, DIRT_ID = 10;

describe("breaking", () => {
  it("refuses a gated block and reports the reason", () => {
    const s = session();
    expect(s.beginBreak({ x: 0, y: 0, z: 0 }, 14)).toEqual({ ok: false, reason: "Requires Mining 15" });
    expect(s.progress).toBe(0);
  });

  it("completes after the block's break time and yields item plus xp", () => {
    const s = session();
    expect(s.beginBreak(DIRT, DIRT_ID)).toEqual({ ok: true });
    const need = breakTime(DIRT_ID, 1, TOOLS.HAND);
    let done = s.tickBreak(need / 2, DIRT, DIRT_ID);
    expect(done.broke).toBe(false);
    expect(s.progress).toBeGreaterThan(0.4);
    done = s.tickBreak(need / 2 + 1, DIRT, DIRT_ID);
    expect(done.broke).toBe(true);
    expect(done.drop).toBe("dirt");
    expect(s.inventory.count("dirt")).toBe(1);
    expect(s.skills.xp.mining).toBe(5);
    expect(s.progress).toBe(0);
  });

  it("refuses to break when the drop has nowhere to go", () => {
    const inv = new Inventory();
    for (let i = 0; i < inv.slots.length; i++) inv.add("stone", 64);
    const s = session({ inventory: inv });
    expect(s.beginBreak(DIRT, DIRT_ID)).toEqual({ ok: false, reason: "Inventory full" });
  });

  // Review Focus 3
  it("cancels when the targeted cell or its block changes mid-break", () => {
    const s = session();
    s.beginBreak(DIRT, DIRT_ID);
    s.tickBreak(10, DIRT, DIRT_ID);
    expect(s.progress).toBeGreaterThan(0);

    expect(s.tickBreak(10, { x: 9, y: 9, z: 9 }, DIRT_ID).broke).toBe(false);
    expect(s.progress).toBe(0);

    s.beginBreak(DIRT, DIRT_ID);
    s.tickBreak(10, DIRT, DIRT_ID);
    expect(s.tickBreak(10, DIRT, 0).broke).toBe(false); // block became air
    expect(s.progress).toBe(0);
  });

  // Review Focus 2
  it("credits at most one block for a single huge dt", () => {
    const s = session();
    s.beginBreak(DIRT, DIRT_ID);
    const res = s.tickBreak(600_000, DIRT, DIRT_ID);
    expect(res.broke).toBe(true);
    expect(s.inventory.count("dirt")).toBe(1);
    expect(s.skills.xp.mining).toBe(5);
  });

  it("ignores a tick with no break in progress or a bad dt", () => {
    const s = session();
    expect(s.tickBreak(100, DIRT, DIRT_ID).broke).toBe(false);
    s.beginBreak(DIRT, DIRT_ID);
    expect(s.tickBreak(NaN, DIRT, DIRT_ID).broke).toBe(false);
    expect(s.tickBreak(-5, DIRT, DIRT_ID).broke).toBe(false);
    expect(s.progress).toBe(0);
  });
});

describe("the place-and-break loop guard", () => {
  it("returns the item but grants no mining xp for a player-placed block", () => {
    const s = session();
    s.inventory.add("dirt", 1);
    expect(s.tryPlace("dirt")).toEqual({ ok: true, blockId: 10 });
    s.markPlaced(DIRT.x, DIRT.y, DIRT.z);
    expect(s.wasPlaced(DIRT.x, DIRT.y, DIRT.z)).toBe(true);

    s.beginBreak(DIRT, DIRT_ID);
    const res = s.tickBreak(1e6, DIRT, DIRT_ID);
    expect(res.broke).toBe(true);
    expect(s.inventory.count("dirt")).toBe(1); // item came back
    expect(s.skills.xp.mining).toBe(0);        // but no xp
  });
});

describe("placing", () => {
  it("spends the item and grants no xp", () => {
    const s = session();
    s.inventory.add("stone", 2);
    expect(s.tryPlace("stone")).toEqual({ ok: true, blockId: 1 });
    expect(s.inventory.count("stone")).toBe(1);
    expect(s.skills.xp.construction).toBe(0);
    expect(s.skills.xp.mining).toBe(0);
  });

  it("refuses an empty stack and a non-placeable item", () => {
    const s = session();
    expect(s.tryPlace("stone")).toEqual({ ok: false, reason: "Out of Stone" });
    s.inventory.add("pick_stone", 1);
    expect(s.tryPlace("pick_stone")).toEqual({ ok: false, reason: "Stone Pickaxe cannot be placed" });
  });
});

describe("tool and crafting pass-through", () => {
  it("uses the best pickaxe held and speeds breaking up", () => {
    const s = session();
    expect(s.tool()).toBe(TOOLS.HAND);
    s.inventory.add("pick_metal", 1);
    expect(s.tool()).toBe(TOOLS.PICK_METAL);
  });

  it("crafts through the session", () => {
    const s = session();
    s.inventory.add("rock", 2);
    expect(s.craft("cut_stone").ok).toBe(true);
    expect(s.inventory.count("stone")).toBe(1);
    expect(s.skills.xp.construction).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-survival-session.test.js`
Expected: FAIL — `Failed to resolve import "../../src/rpg/survival-session.js"`

- [ ] **Step 3: Write minimal implementation**

```js
// src/rpg/survival-session.js
/**
 * Owns every RPG module and is the only object ForgeMode touches. Keeping the
 * Forge's knowledge to one nullable field is what lets creative mode stay
 * byte-identical to before.
 */
import { World } from "../world/world.js";
import { Inventory } from "./inventory.js";
import { Skills } from "./skills.js";
import { bestTool, TOOLS } from "./tools.js";
import { canMine, breakTime, dropsFor, xpFor } from "./gather.js";
import { itemById, blockForItem } from "./items.js";
import { craft as craftRecipe, canCraft } from "./crafting.js";
import { availableRecipes } from "./recipes.js";

const CELLS = World.W * World.D * World.H;

export class SurvivalSession {
  constructor({ skills, inventory } = {}) {
    this.skills = skills || new Skills();
    this.inventory = inventory || new Inventory();
    /** One bit per cell: was this block placed by the player? See spec §6. */
    this.placed = new Uint8Array(CELLS >> 3);
    this.breaking = null; // { cell, blockId, elapsed, need }
    this.progress = 0;
  }

  tool() { return bestTool(this.inventory); }

  miningLevel() { return this.skills.level("mining"); }

  // ─── The placed-block bitset ──────────────────────────────

  _bit(x, y, z) { return (z * World.D + y) * World.W + x; }

  markPlaced(x, y, z) {
    const i = this._bit(x, y, z);
    this.placed[i >> 3] |= 1 << (i & 7);
  }

  clearPlaced(x, y, z) {
    const i = this._bit(x, y, z);
    this.placed[i >> 3] &= ~(1 << (i & 7));
  }

  wasPlaced(x, y, z) {
    const i = this._bit(x, y, z);
    return (this.placed[i >> 3] & (1 << (i & 7))) !== 0;
  }

  // ─── Breaking ─────────────────────────────────────────────

  /** @returns {{ok:true}|{ok:false,reason:string}} */
  beginBreak(cell, blockId) {
    const gate = canMine(blockId, this.miningLevel());
    if (!gate.ok) { this.cancelBreak(); return gate; }

    const drop = dropsFor(blockId);
    if (drop && !this.inventory.fits(drop, 1)) {
      this.cancelBreak();
      return { ok: false, reason: "Inventory full" };
    }

    this.breaking = {
      cell: { ...cell },
      blockId,
      elapsed: 0,
      need: breakTime(blockId, this.miningLevel(), this.tool()),
    };
    this.progress = 0;
    return { ok: true };
  }

  cancelBreak() { this.breaking = null; this.progress = 0; }

  /**
   * Advances the in-progress break. `cell` and `blockId` are what the player
   * is looking at *now*: if either moved, the break cancels rather than
   * crediting a block that is no longer there.
   * @returns {{broke:boolean, drop?:string|null, xp?:number, leveled?:boolean}}
   */
  tickBreak(dtMs, cell, blockId) {
    const b = this.breaking;
    if (!b) return { broke: false };
    if (!(dtMs > 0) || !Number.isFinite(dtMs)) return { broke: false };
    if (!cell || cell.x !== b.cell.x || cell.y !== b.cell.y || cell.z !== b.cell.z ||
        blockId !== b.blockId) {
      this.cancelBreak();
      return { broke: false };
    }

    // Clamp the step so one stalled frame can never bank more than this block.
    b.elapsed += Math.min(dtMs, b.need);
    this.progress = Math.min(1, b.elapsed / b.need);
    if (this.progress < 1) return { broke: false };

    const { x, y, z } = b.cell;
    const placedByPlayer = this.wasPlaced(x, y, z);
    const drop = dropsFor(b.blockId);
    if (drop) this.inventory.add(drop, 1);

    let granted = null;
    if (!placedByPlayer) granted = this.skills.grant("mining", xpFor(b.blockId));
    this.clearPlaced(x, y, z);
    this.cancelBreak();

    return {
      broke: true,
      drop,
      xp: placedByPlayer ? 0 : xpFor(b.blockId),
      leveled: granted?.leveled ?? false,
    };
  }

  // ─── Placing ──────────────────────────────────────────────

  /** Spends one of `itemId`. No xp, no skill gate. */
  tryPlace(itemId) {
    const item = itemById(itemId);
    if (!item) return { ok: false, reason: "Unknown item" };
    const blockId = blockForItem(itemId);
    if (blockId == null) return { ok: false, reason: `${item.name} cannot be placed` };
    if (!this.inventory.remove(itemId, 1)) {
      return { ok: false, reason: `Out of ${item.name}` };
    }
    return { ok: true, blockId };
  }

  /** Puts a placed block back after the Forge refuses the placement. */
  refund(itemId) { this.inventory.add(itemId, 1); }

  // ─── Crafting ─────────────────────────────────────────────

  recipes(station = null) { return availableRecipes(this.skills, station); }
  canCraft(recipeId) { return canCraft(recipeId, this.inventory, this.skills); }
  craft(recipeId) { return craftRecipe(recipeId, this.inventory, this.skills); }
}

export { TOOLS };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-survival-session.test.js`
Expected: PASS, 11 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS — the running baseline plus the new ones, 0 failures

- [ ] **Step 6: Commit**

```bash
git add src/rpg/survival-session.js tests/unit/rpg-survival-session.test.js
git commit -m "feat(rpg): add the survival session tying gathering, crafting and xp together"
```

---

### Task 10: Survival mode flag and the Forge adapter

**Files:**
- Modify: `js/forge.js` — constructor (~line 243–290), `placeBlock()` (line 806), `removeBlock()` (line 814), `_adopt()` (line 928)
- Test: `tests/unit/rpg-forge-adapter.test.js`

**Interfaces:**
- Consumes: `SurvivalSession`
- Produces: `ForgeMode.survival` (`SurvivalSession|null`), `ForgeMode.isSurvival()`, and `attachSurvival(world, session)` exported from `js/forge.js` for testing without a GL context

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-forge-adapter.test.js
import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { attachSurvival } from "../../js/forge.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { packWorld, unpackWorld } from "../../src/world/world-codec.js";

describe("survival mode flag", () => {
  it("defaults to creative and attaches no session", () => {
    const w = new World();
    expect(w.meta.mode ?? "creative").toBe("creative");
    expect(attachSurvival(w, new SurvivalSession())).toBe(null);
  });

  it("attaches the session only for a survival world", () => {
    const w = new World({ mode: "survival" });
    const s = new SurvivalSession();
    expect(attachSurvival(w, s)).toBe(s);
  });

  it("survives a codec round trip without a version bump", async () => {
    const w = new World({ mode: "survival" });
    const back = await unpackWorld(await packWorld(w));
    expect(back.meta.mode).toBe("survival");
  });

  it("loads a pre-existing world with no mode as creative", async () => {
    const w = new World();
    delete w.meta.mode;
    const back = await unpackWorld(await packWorld(w));
    expect(back.meta.mode).toBe(undefined);
    expect(attachSurvival(back, new SurvivalSession())).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-forge-adapter.test.js`
Expected: FAIL — `attachSurvival is not exported`

- [ ] **Step 3: Add the flag helper and the two mutator branches**

Add near the other exported helpers at the top of `js/forge.js`:

```js
/**
 * Survival is selected per world. Old worlds have no `mode` and stay creative,
 * so the editor behaves exactly as it did before this change.
 * @returns {import("../src/rpg/survival-session.js").SurvivalSession|null}
 */
export function attachSurvival(world, session) {
  return world?.meta?.mode === "survival" ? session : null;
}
```

Add the import at the top of `js/forge.js`:

```js
import { SurvivalSession } from "../src/rpg/survival-session.js";
import { itemForBlock, blockForItem } from "../src/rpg/items.js";
```

In the constructor, after `this.toolMode = "block";`:

```js
    /** Progression is per-character and outlives any one world. */
    this.playerStore = deps.playerStore || new PlayerStore();
    /** Built once from the stored character, then attached per world. */
    this.survivalSession = new SurvivalSession();
    /** Non-null only in a survival world; every RPG rule lives behind it. */
    this.survival = null;
    /** The item id the hotbar has selected in survival. */
    this.heldItem = null;
```

Add the store import alongside the session import:

```js
import { PlayerStore } from "../src/rpg/player-store.js";
```

Load the character when the Forge starts. In `start()`, before the world is
adopted:

```js
    const saved = await this.playerStore.load(0);
    this.survivalSession = new SurvivalSession({
      skills: saved.skills,
      inventory: saved.inventory,
    });
    if (saved.unavailable) this._warn("Progress will not be saved");
    if (saved.stale) this._warn("Character saved by a newer version");
```

Persist it whenever the world is persisted. At the end of `_persistCurrent()`:

```js
    if (this.survival) {
      this._fire(this.playerStore.save(0, {
        skills: this.survival.skills,
        inventory: this.survival.inventory,
      }));
    }
```

In `_adopt(world, id)`, after the world is assigned:

```js
    this.survival = attachSurvival(world, this.survivalSession);
```

Replace `placeBlock()`:

```js
  placeBlock() {
    const c = this._placeCell();
    if (!c) return;
    if (!placementAllowed(this.world, c.x, c.y, c.z, this._bodies(), this._markers()))
      return;

    if (!this.survival) {
      if (this._editBlock(c.x, c.y, c.z, this.tile)) this.audio.menuConfirm();
      return;
    }

    const itemId = this.heldItem ?? itemForBlock(this.tile);
    const spend = this.survival.tryPlace(itemId);
    if (!spend.ok) { this._warn(spend.reason); return; }
    if (this._editBlock(c.x, c.y, c.z, spend.blockId)) {
      this.survival.markPlaced(c.x, c.y, c.z);
      this.audio.menuConfirm();
    } else {
      this.survival.refund(itemId); // the edit was a no-op; do not eat the item
    }
  }
```

Replace `removeBlock()` — in survival it only *starts* a break; Task 11 finishes it:

```js
  removeBlock() {
    const t = this.target;
    if (!t) return;
    if (!removeAllowed(this.world, t.x, t.y, t.z)) return;

    if (!this.survival) {
      if (this._editBlock(t.x, t.y, t.z, AIR)) this.audio.menuSelect();
      return;
    }

    const begun = this.survival.beginBreak(t, this.world.get(t.x, t.y, t.z));
    if (!begun.ok) this._warn(begun.reason);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-forge-adapter.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS, 0 failures

- [ ] **Step 6: Commit**

```bash
git add js/forge.js tests/unit/rpg-forge-adapter.test.js
git commit -m "feat(forge): branch block placement and removal on survival mode"
```

---

### Task 11: Hold-to-break input plumbing

**Files:**
- Modify: `js/forge.js` — `handleMouseDown()` (line 526), new `handleMouseUp()`, `update()` (line 573), HUD draw
- Modify: `js/game.js:691` — route `mouseup`
- Test: `tests/unit/rpg-forge-break.test.js`

**Interfaces:**
- Consumes: `ForgeMode.survival`, `SurvivalSession.tickBreak`
- Produces: `ForgeMode.handleMouseUp(button)`, `ForgeMode.breaking` (bool), `ForgeMode.breakProgress` (0..1)

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-forge-break.test.js
import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { breakTime } from "../../src/rpg/gather.js";
import { TOOLS } from "../../src/rpg/tools.js";

/**
 * Drives the session the way ForgeMode.update() does, without a GL context:
 * hold advances, release cancels.
 */
function rig() {
  const world = new World({ mode: "survival" });
  world.set(5, 5, 32, 10); // dirt
  const s = new SurvivalSession();
  const cell = { x: 5, y: 5, z: 32 };
  return {
    world, s, cell,
    hold: (ms) => s.tickBreak(ms, cell, world.get(cell.x, cell.y, cell.z)),
  };
}

describe("hold to break", () => {
  it("needs the full break time held, not one click", () => {
    const { s, cell, hold } = rig();
    s.beginBreak(cell, 10);
    const need = breakTime(10, 1, TOOLS.HAND);
    expect(hold(need * 0.9).broke).toBe(false);
    expect(s.progress).toBeCloseTo(0.9, 1);
    expect(hold(need * 0.2).broke).toBe(true);
  });

  it("discards partial progress on release", () => {
    const { s, cell, hold } = rig();
    s.beginBreak(cell, 10);
    hold(breakTime(10, 1, TOOLS.HAND) * 0.9);
    s.cancelBreak();
    expect(s.progress).toBe(0);
    s.beginBreak(cell, 10);
    expect(s.progress).toBe(0);
  });

  it("removes the block from the world once the session says it broke", () => {
    const { world, s, cell, hold } = rig();
    s.beginBreak(cell, 10);
    const res = hold(1e6);
    expect(res.broke).toBe(true);
    world.set(cell.x, cell.y, cell.z, 0);
    expect(world.get(cell.x, cell.y, cell.z)).toBe(0);
    expect(s.inventory.count("dirt")).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-forge-break.test.js`
Expected: FAIL — `Failed to resolve import` for the rig's modules if Task 9 is incomplete; otherwise FAIL on the held-progress assertions

- [ ] **Step 3: Add the held-button state and the update tick**

In the `ForgeMode` constructor, beside `this.survival`:

```js
    this.holdingBreak = false;
    this.breakProgress = 0;
```

In `handleMouseDown`, the `default:` branch becomes:

```js
      default:
        if (place) this.placeBlock();
        else { this.holdingBreak = true; this.removeBlock(); }
```

Add a sibling to `handleMouseDown`:

```js
  /** Releasing the break button discards partial progress — see spec §5. */
  handleMouseUp(button) {
    if (button === 0) return; // mirror handleMouseDown: non-left is break
    this.holdingBreak = false;
    this.survival?.cancelBreak();
    this.breakProgress = 0;
  }
```

In `update(dt)`, after the mouse-look block and before movement, add:

```js
    if (this.survival) {
      if (this.holdingBreak && this.target) {
        const t = this.target;
        const res = this.survival.tickBreak(dt * 1000, t, this.world.get(t.x, t.y, t.z));
        this.breakProgress = this.survival.progress;
        if (res.broke) {
          this._editBlock(t.x, t.y, t.z, AIR);
          this.audio.menuSelect();
          if (res.leveled) this._warn(`Mining level ${this.survival.miningLevel()}`);
          this.breakProgress = 0;
        }
      } else if (this.breakProgress !== 0) {
        this.survival.cancelBreak();
        this.breakProgress = 0;
      }
    }
```

In `js/game.js`, beside the existing `mousedown` listener at line 691:

```js
      this.builder?.handleMouseUp(e.button);
```

wired to a `mouseup` listener on the same element, registered immediately after the `mousedown` one.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-forge-break.test.js`
Expected: PASS, 3 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS, 0 failures

- [ ] **Step 6: Commit**

```bash
git add js/forge.js js/game.js tests/unit/rpg-forge-break.test.js
git commit -m "feat(forge): hold the button to break a block in survival"
```

---

### Task 12: Craft menu and survival HUD

**Files:**
- Modify: `js/forge.js` — `handleKeyDown()` (line 393), HUD draw around line 1342–1490
- Test: `tests/unit/rpg-craft-menu.test.js`

**Interfaces:**
- Consumes: `SurvivalSession.recipes()`, `SurvivalSession.craft()`
- Produces: `ForgeMode.craftOpen` (bool), `ForgeMode.craftIndex` (int), `craftMenuRows(session)` exported from `js/forge.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-craft-menu.test.js
import { describe, it, expect } from "vitest";
import { craftMenuRows } from "../../js/forge.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { Skills } from "../../src/rpg/skills.js";

describe("craft menu rows", () => {
  it("shows every station-free recipe, locked ones included", () => {
    const rows = craftMenuRows(new SurvivalSession());
    expect(rows.length).toBe(5);
    expect(rows.map((r) => r.id)).toContain("pick_metal");
    const locked = rows.find((r) => r.id === "pick_metal");
    expect(locked.locked).toBe(true);
    expect(locked.note).toBe("Requires Construction 10");
  });

  it("marks a recipe craftable only when the inputs are actually held", () => {
    const s = new SurvivalSession();
    let rows = craftMenuRows(s);
    expect(rows.find((r) => r.id === "cut_stone").craftable).toBe(false);
    expect(rows.find((r) => r.id === "cut_stone").note).toBe("Need 2 Rock");

    s.inventory.add("rock", 2);
    rows = craftMenuRows(s);
    expect(rows.find((r) => r.id === "cut_stone").craftable).toBe(true);
    expect(rows.find((r) => r.id === "cut_stone").note).toBe(null);
  });

  it("shows the level gate ahead of the missing inputs", () => {
    const s = new SurvivalSession({ skills: new Skills() });
    s.inventory.add("metal", 3);
    s.inventory.add("rock", 2);
    const row = craftMenuRows(s).find((r) => r.id === "pick_metal");
    expect(row.note).toBe("Requires Construction 10");
  });

  it("renders each row with a name and an input summary", () => {
    const rows = craftMenuRows(new SurvivalSession());
    const cut = rows.find((r) => r.id === "cut_stone");
    expect(cut.name).toBe("Cut Stone");
    expect(cut.inputText).toBe("2 Rock");
    expect(rows.find((r) => r.id === "pick_stone").inputText).toBe("3 Stone, 2 Rock");
    expect(cut.outputText).toBe("1 Stone");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-craft-menu.test.js`
Expected: FAIL — `craftMenuRows is not exported`

- [ ] **Step 3: Add the row builder, the key and the draw**

Add beside the other exported helpers in `js/forge.js`:

```js
/**
 * One row per station-free recipe. Locked rows are kept, not hidden, so
 * levelling has a visible destination. `note` carries the single most useful
 * reason it cannot be made right now: the level gate outranks missing inputs.
 */
export function craftMenuRows(session) {
  const qty = ([id, n]) => `${n} ${itemById(id).name}`;
  return session.recipes(null).map((r) => {
    const check = session.canCraft(r.id);
    return {
      id: r.id,
      name: r.name,
      inputText: r.inputs.map(qty).join(", "),
      outputText: qty(r.output),
      locked: r.locked,
      craftable: check.ok,
      note: check.ok ? null : check.reason,
    };
  });
}
```

Add the import for `itemById` to the existing items import in `js/forge.js`:

```js
import { itemForBlock, blockForItem, itemById } from "../src/rpg/items.js";
```

In the constructor:

```js
    this.craftOpen = false;
    this.craftIndex = 0;
```

In `handleKeyDown(e)`, before the existing tool handling:

```js
    if (this.survival && e.code === "KeyC") {
      this.craftOpen = !this.craftOpen;
      this.craftIndex = 0;
      this.audio.menuSelect();
      return;
    }
    if (this.craftOpen) {
      const rows = craftMenuRows(this.survival);
      if (e.code === "ArrowDown") { this.craftIndex = (this.craftIndex + 1) % rows.length; return; }
      if (e.code === "ArrowUp") { this.craftIndex = (this.craftIndex + rows.length - 1) % rows.length; return; }
      if (e.code === "Enter") {
        const row = rows[this.craftIndex];
        const res = this.survival.craft(row.id);
        if (!res.ok) this._warn(res.reason);
        else {
          this.audio.menuConfirm();
          if (res.leveled) this._warn(`Construction level ${this.survival.skills.level("construction")}`);
        }
        return;
      }
      if (e.code === "Escape") { this.craftOpen = false; return; }
    }
```

In the HUD draw, after the existing hotbar block, add a survival panel drawing:
the two skill levels and their xp-to-next, the break-progress ring at the
cursor when `this.breakProgress > 0`, and — when `this.craftOpen` — the rows
from `craftMenuRows`, greyed where `locked` or `!craftable`, with `note` beside
each. Follow the existing `ctx.fillText` / `ctx.fillStyle` idiom already used
for the tool label at line 1396.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-craft-menu.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS, 0 failures

- [ ] **Step 6: Commit**

```bash
git add js/forge.js tests/unit/rpg-craft-menu.test.js
git commit -m "feat(forge): add the craft menu and survival skill readout"
```

---

### Task 13: End-to-end survival loop

**Files:**
- Modify: `tests/forge.spec.js`
- Modify: `js/testing/debug-bridge.js` — expose the session for assertions

**Interfaces:**
- Consumes: everything above
- Produces: `window.ccDebug.game.builder.survival` reachable from Playwright

- [ ] **Step 1: Expose the session on the debug bridge**

In `js/testing/debug-bridge.js`, beside the existing builder accessors:

```js
  /** Survival session for e2e assertions; null in a creative world. */
  survival: () => window.ccDebug?.game?.builder?.survival ?? null,
```

- [ ] **Step 2: Write the failing e2e test**

```js
// appended to tests/forge.spec.js
test("survival: mine a block, craft with the drop, then place it", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startBuilder");
  await waitForForge(page);

  // Switch the loaded world to survival and re-attach the session.
  await page.evaluate(() => {
    const b = window.ccDebug.game.builder;
    b.world.meta.mode = "survival";
    b._adopt(b.world, b.currentSlot);
  });
  expect(await page.evaluate(() => !!window.ccDebug.game.builder.survival)).toBe(true);

  // Put a rock in front of the camera and aim at it.
  const cell = await page.evaluate(() => {
    const b = window.ccDebug.game.builder;
    const c = { x: Math.floor(b.player.x) + 2, y: Math.floor(b.player.y), z: Math.floor(b.player.z) };
    b.world.set(c.x, c.y, c.z, 13); // Rock
    return c;
  });
  await aimAndUpdate(page, { ...cell, angle: 0, pitch: 0 });

  // Rock is gated at Mining 5, so bare hands at level 1 must refuse.
  const refusal = await page.evaluate(() => {
    const b = window.ccDebug.game.builder;
    b.removeBlock();
    return b.notice?.text ?? null;
  });
  expect(refusal).toBe("Requires Mining 5");

  // Grant the level, then hold the button until the block breaks.
  const mined = await page.evaluate(async () => {
    const b = window.ccDebug.game.builder;
    b.survival.skills.grant("mining", 200); // past level 5
    b.holdingBreak = true;
    b.removeBlock();
    for (let i = 0; i < 300 && b.survival.progress < 1; i++) b.update(0.05);
    b.update(0.05);
    return { rock: b.survival.inventory.count("rock"), xp: b.survival.skills.xp.mining };
  });
  expect(mined.rock).toBe(1);
  expect(mined.xp).toBeGreaterThan(200);

  // Craft cut stone from two rocks, then place the result.
  const crafted = await page.evaluate(() => {
    const b = window.ccDebug.game.builder;
    b.survival.inventory.add("rock", 1); // two in hand
    const res = b.survival.craft("cut_stone");
    return { ok: res.ok, stone: b.survival.inventory.count("stone"), xp: b.survival.skills.xp.construction };
  });
  expect(crafted.ok).toBe(true);
  expect(crafted.stone).toBe(1);
  expect(crafted.xp).toBe(10);

  const placed = await page.evaluate(() => {
    const b = window.ccDebug.game.builder;
    b.heldItem = "stone";
    b.placeBlock();
    return b.survival.inventory.count("stone");
  });
  expect(placed).toBe(0);

  await screenshot(page, "forge-survival-loop");
});

test("creative: breaking is still instant and unlimited", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startBuilder");
  await waitForForge(page);

  const result = await page.evaluate(() => {
    const b = window.ccDebug.game.builder;
    const c = { x: Math.floor(b.player.x) + 2, y: Math.floor(b.player.y), z: Math.floor(b.player.z) };
    b.world.set(c.x, c.y, c.z, 13);
    b.target = c;
    b.removeBlock();
    return { survival: b.survival, block: b.world.get(c.x, c.y, c.z) };
  });
  expect(result.survival).toBe(null);
  expect(result.block).toBe(0); // gone on the first click, no hold
});
```

- [ ] **Step 3: Run the e2e tests**

Run: `npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS — the two new tests plus the existing Forge coverage

- [ ] **Step 4: Run both suites**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS, 0 failures

- [ ] **Step 5: Commit**

```bash
git add tests/forge.spec.js js/testing/debug-bridge.js
git commit -m "test(forge): cover the survival mine-craft-place loop end to end"
```

---

## Done when

- `npm run test:unit` passes: 956 tests across 64 files (856 baseline + 100 new).
- `npx playwright test tests/forge.spec.js --workers=1` passes.
- A creative world behaves exactly as before: unlimited palette, instant break, no HUD change.
- Pressing M turns the edited world into a survival world and back, the choice
  persists through a save, and the status badge says which mode is active.
  (This was missed in the original plan — the feature was unreachable without
  it — and was added after the branch review.)
- A survival world requires holding to break, gates Rock at Mining 5 and Ore at Mining 15, drops items into a 36-slot inventory, crafts the five basic recipes, and speeds up visibly once a pickaxe is made.
- Mining level and inventory survive a page reload, carried by `cc_player`, independent of which world is loaded.
