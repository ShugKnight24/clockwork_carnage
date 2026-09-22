# Forge Stations and Durability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tools wear out and be repairable at placed crafting stations, so the tool tier becomes an economy and Construction has a ladder past level 10.

**Architecture:** Durability is per-slot, not per-item: slots become `{item, n, dur}` and tools get `stack: 1` so two pickaxes cannot merge. `bestTool` therefore returns `{tool, slot}` so wear lands on the right one. Stations are three new blocks (ids 16–18) whose art is procedural, detected by a bounded radius scan, and the recipe table's existing `station` field — built in spec 1 and never used — finally carries tiers.

**Tech Stack:** Vanilla ES modules, Vite, Vitest (unit), Playwright + Chromium with GPU flags (e2e), IndexedDB.

**Spec:** `docs/superpowers/specs/2026-09-22-forge-stations-durability-design.md`

## Global Constraints

- Branch: `feat/forge-survival`. Never commit to `master`.
- No AI attribution in any commit message. Conventional Commits.
- `src/rpg/` modules must not import the renderer or `js/forge.js`. `gather.js` and the new `stations.js` may import `src/world/blocks.js`; `stations.js` may also import `src/world/world.js`.
- **Creative mode stays byte-identical.** Stations must NOT be added to `PLACEABLE_BLOCKS`. No new creative HUD, no new creative key.
- Existing block ids 0–15 are immutable. Stations append at 16, 17, 18.
- A spec 1 save with no `dur` on a tool loads at **full durability**, never broken.
- `STACK_MAX` stays exported and stays 64; it becomes the default, not the law.
- Every tuning number lives in a table. No numeric literal at a call site.
- Baseline to hold: 956 unit tests across 64 files, 12 Forge e2e. Run `npm run test:unit` before every commit.

## Review Focus

Failure modes the spec implies that no task's happy path exercises. Each has a test pinned to the owning task.

1. **`dur` must survive the `toJSON`/`fromJSON` round trip.** Crafting's fit probe clones the inventory that way; if `dur` is lost the probe sees full tools and a repair could be reported possible that is not. *(Task 2)*
2. **A spec 1 record whose tools have no `dur`.** Expected: they load at full, so upgrading the game does not scrap the player's gear. *(Task 2)*
3. **A `dur` above the tool's maximum, or negative, or non-numeric** — hand-edited or from a future build. Expected: clamped into range on load, never trusted. *(Task 2)*
4. **Wearing a tool the player no longer holds.** The break began with a pickaxe; the player crafted it away mid-hold. Expected: no throw, no wear applied to whatever now occupies that slot. *(Task 4)*
5. **A station block broken while its craft menu is open.** Expected: its rows disappear on the next refresh rather than staying craftable from a bench that no longer exists. *(Task 10)*

---

## File Structure

| File | Responsibility |
|---|---|
| `src/rpg/items.js` | Modified: per-item `stack`, `durability` on tools, station items |
| `src/rpg/tools.js` | Modified: `durability`/`repair` per tier, `bestTool` returns `{tool, slot}` |
| `src/rpg/inventory.js` | Modified: per-slot `dur`, non-merging stacks, most-worn-first removal |
| `src/rpg/stations.js` | **New**: station block ids, `stationsInRange` |
| `src/rpg/recipes.js` | Modified: station tiers, `repairs` recipes, `availableRecipes` takes a set |
| `src/rpg/crafting.js` | Modified: repair path |
| `src/rpg/survival-session.js` | Modified: wear on break, station-aware crafting |
| `src/world/blocks.js` | Modified: three station blocks appended |
| `src/rendering/voxel/natural-art.js` | Modified: three painter cases |
| `js/forge.js` | Modified: craft-menu station header, durability readout |

---

### Task 1: Per-item stack sizes and tool durability tables

**Files:**
- Modify: `src/rpg/items.js`
- Modify: `src/rpg/tools.js`
- Test: `tests/unit/rpg-items.test.js`, `tests/unit/rpg-tools.test.js`

**Interfaces:**
- Produces: `ITEMS` entries gain `stack` (64 for materials, 1 for tools) and `durability` (tools only, absent on materials); three new station items `workbench`/`anvil`/`forge` with `blockId` 16/17/18. `TOOLS` entries gain `durability` and `repair: [[itemId, n]]`.

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-items.test.js
describe("stacking and durability", () => {
  it("stacks materials to 64 but tools one per slot", () => {
    expect(itemById("stone").stack).toBe(64);
    expect(itemById("rock").stack).toBe(64);
    expect(itemById("pick_stone").stack).toBe(1);
    expect(itemById("pick_metal").stack).toBe(1);
  });

  it("gives tools a durability and materials none", () => {
    expect(itemById("pick_stone").durability).toBe(120);
    expect(itemById("pick_metal").durability).toBe(400);
    expect(itemById("stone").durability).toBe(undefined);
  });

  it("adds the three station items mapped to the new blocks", () => {
    expect(itemForBlock(16)).toBe("workbench");
    expect(itemForBlock(17)).toBe("anvil");
    expect(itemForBlock(18)).toBe("forge");
    expect(blockForItem("workbench")).toBe(16);
    expect(itemById("forge").name).toBe("Forge");
    expect(itemById("workbench").stack).toBe(64);
  });
});
```

```js
// append to tests/unit/rpg-tools.test.js
describe("durability tables", () => {
  it("gives every real tool a durability and a repair cost", () => {
    for (const t of [TOOLS.PICK_STONE, TOOLS.PICK_METAL]) {
      expect(t.durability).toBeGreaterThan(0);
      expect(Array.isArray(t.repair)).toBe(true);
      expect(t.repair.length).toBeGreaterThan(0);
      t.repair.forEach(([id, n]) => {
        expect(typeof id).toBe("string");
        expect(n).toBeGreaterThan(0);
      });
    }
    expect(TOOLS.HAND.durability).toBe(Infinity);
    expect(TOOLS.HAND.repair).toEqual([]);
  });

  it("makes the better tool last longer", () => {
    expect(TOOLS.PICK_METAL.durability).toBeGreaterThan(TOOLS.PICK_STONE.durability);
  });

  it("agrees with the item table", () => {
    expect(TOOLS.PICK_STONE.durability).toBe(itemById("pick_stone").durability);
    expect(TOOLS.PICK_METAL.durability).toBe(itemById("pick_metal").durability);
  });
});
```

Add `import { itemById } from "../../src/rpg/items.js";` to the tools test's imports.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/rpg-items.test.js tests/unit/rpg-tools.test.js`
Expected: FAIL — `expected undefined to be 1` on `itemById("pick_stone").stack`

- [ ] **Step 3: Write the implementation**

In `src/rpg/items.js`, replace the two factory helpers and append the station items:

```js
const block = (id, name, blockId) => ({ id, name, stack: STACK_MAX, blockId });
const tool = (id, name, durability) => ({ id, name, stack: 1, blockId: null, durability });
```

Change the two tool rows and add three station rows before the tools:

```js
  block("workbench", "Workbench", 16),
  block("anvil", "Anvil", 17),
  block("forge", "Forge", 18),
  tool("pick_stone", "Stone Pickaxe", 120),
  tool("pick_metal", "Metal Pickaxe", 400),
```

In `src/rpg/tools.js`, extend the table:

```js
export const TOOLS = {
  HAND: { id: "hand", name: "Bare Hands", item: null, mult: 1.0, tier: 0, durability: Infinity, repair: [] },
  PICK_STONE: { id: "pick_stone", name: "Stone Pickaxe", item: "pick_stone", mult: 0.75, tier: 1, durability: 120, repair: [["stone", 1], ["rock", 1]] },
  PICK_METAL: { id: "pick_metal", name: "Metal Pickaxe", item: "pick_metal", mult: 0.55, tier: 2, durability: 400, repair: [["metal", 1], ["rock", 1]] },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/rpg-items.test.js tests/unit/rpg-tools.test.js`
Expected: PASS

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: FAIL is acceptable here ONLY in `rpg-inventory`/`rpg-crafting` if they assume every item stacks to 64 — Task 2 fixes that. Record exactly which tests fail and why. If anything else fails, stop and report.

- [ ] **Step 6: Commit**

```bash
git add src/rpg/items.js src/rpg/tools.js tests/unit/rpg-items.test.js tests/unit/rpg-tools.test.js
git commit -m "feat(rpg): give tools a stack of one, a durability and a repair cost"
```

---

### Task 2: Per-slot durability in the inventory

**Files:**
- Modify: `src/rpg/inventory.js`
- Test: `tests/unit/rpg-inventory.test.js`

**Interfaces:**
- Consumes: `itemById(id).stack`, `.durability`
- Produces: slots are `{item, n, dur?}`; `add(itemId, n, dur = null)`; `fits` honours per-item stack; `remove` takes most-worn first; `wearSlot(i, amount)`; `repairSlot(i)`; `findWorn(itemId)`; `toJSON`/`fromJSON` carry `dur`

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-inventory.test.js
describe("tool durability", () => {
  it("never merges tools — two pickaxes take two slots", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_stone", 1);
    expect(inv.count("pick_stone")).toBe(2);
    expect(inv.slots.filter((s) => s).length).toBe(2);
  });

  it("gives a new tool full durability and a material none", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("stone", 5);
    expect(inv.slots[0].dur).toBe(120);
    expect(inv.slots[1].dur).toBe(undefined);
  });

  it("honours a per-item stack of one in fits", () => {
    const inv = new Inventory(2);
    expect(inv.fits("pick_stone", 2)).toBe(true);
    expect(inv.fits("pick_stone", 3)).toBe(false);
    expect(inv.fits("stone", 128)).toBe(true);
  });

  it("wears a slot down to zero and no further", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    expect(inv.wearSlot(0, 20)).toBe(100);
    expect(inv.wearSlot(0, 1000)).toBe(0);
    expect(inv.slots[0].dur).toBe(0);
    expect(inv.slots[0].item).toBe("pick_stone"); // worn, not gone
  });

  it("ignores wear on a material slot or an empty slot", () => {
    const inv = new Inventory();
    inv.add("stone", 5);
    expect(inv.wearSlot(0, 3)).toBe(null);
    expect(inv.wearSlot(5, 3)).toBe(null);
    expect(inv.slots[0].n).toBe(5);
  });

  it("finds the most worn tool, and repairs it to full", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_stone", 1);
    inv.wearSlot(1, 90);
    expect(inv.findWorn("pick_stone")).toBe(1);
    expect(inv.repairSlot(1)).toBe(true);
    expect(inv.slots[1].dur).toBe(120);
    expect(inv.findWorn("pick_metal")).toBe(-1);
  });

  it("removes the most worn tool first, keeping the fresh one", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 100); // slot 0 is the worn one
    inv.remove("pick_stone", 1);
    const left = inv.slots.find((s) => s && s.item === "pick_stone");
    expect(left.dur).toBe(120);
  });

  // Review Focus 1
  it("round-trips durability through JSON", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 45);
    const back = Inventory.fromJSON(JSON.parse(JSON.stringify(inv.toJSON())));
    expect(back.slots[0].dur).toBe(75);
  });

  // Review Focus 2
  it("loads a spec-1 tool with no dur at full durability, never broken", () => {
    const back = Inventory.fromJSON([{ item: "pick_metal", n: 1 }]);
    expect(back.slots[0].dur).toBe(400);
  });

  // Review Focus 3
  it("clamps a dur that is out of range, negative or not a number", () => {
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: 9999 }]).slots[0].dur).toBe(120);
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: -5 }]).slots[0].dur).toBe(0);
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: "x" }]).slots[0].dur).toBe(120);
    expect(Inventory.fromJSON([{ item: "pick_stone", n: 1, dur: NaN }]).slots[0].dur).toBe(120);
  });

  it("never lets a tool slot hold more than one", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 3);
    expect(inv.slots.filter((s) => s).length).toBe(3);
    inv.slots.filter((s) => s).forEach((s) => expect(s.n).toBe(1));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-inventory.test.js`
Expected: FAIL — `inv.wearSlot is not a function`, and the two-pickaxes-two-slots case failing because tools still merge

- [ ] **Step 3: Write the implementation**

Replace the body of `src/rpg/inventory.js` below the imports:

```js
// src/rpg/inventory.js
import { STACK_MAX, itemById } from "./items.js";

export const HOTBAR_SLOTS = 9;
export const BACKPACK_SLOTS = 27;
export const TOTAL_SLOTS = HOTBAR_SLOTS + BACKPACK_SLOTS;

/** A whole, positive count. Guards every quantity entering the inventory. */
const validQty = (n) => Number.isInteger(n) && n > 0;

/**
 * A tool slot's remaining uses, clamped into the tool's range. A missing or
 * unusable value means full, never broken: a spec-1 record has no `dur` at
 * all, and reading that as zero would scrap every tool the player owns.
 */
const clampDur = (value, max) => {
  if (!Number.isFinite(value)) return max;
  return Math.max(0, Math.min(max, value));
};

export class Inventory {
  constructor(size = TOTAL_SLOTS) {
    /** @type {Array<{item:string,n:number,dur?:number}|null>} */
    this.slots = new Array(size).fill(null);
  }

  count(itemId) {
    return this.slots.reduce((t, s) => (s && s.item === itemId ? t + s.n : t), 0);
  }

  /** @returns {boolean} true when all `n` would be accepted */
  fits(itemId, n) {
    const item = itemById(itemId);
    if (!validQty(n) || !item) return false;
    const cap = item.stack;
    let room = 0;
    for (const s of this.slots) {
      // Stack-of-one items never top up an occupied slot.
      room += s === null ? cap : cap > 1 && s.item === itemId ? cap - s.n : 0;
      if (room >= n) return true;
    }
    return false;
  }

  /**
   * @param {number|null} dur starting durability for a tool; null means full
   * @returns {number} how many were actually added
   */
  add(itemId, n, dur = null) {
    const item = itemById(itemId);
    if (!validQty(n) || !item) return 0;
    const cap = item.stack;
    let left = n;
    if (cap > 1) {
      // Top up existing stacks first so the inventory stays compact.
      for (const s of this.slots) {
        if (left === 0) break;
        if (s && s.item === itemId && s.n < cap) {
          const take = Math.min(cap - s.n, left);
          s.n += take; left -= take;
        }
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i] !== null) continue;
      const take = Math.min(cap, left);
      const slot = { item: itemId, n: take };
      if (item.durability != null) slot.dur = clampDur(dur, item.durability);
      this.slots[i] = slot;
      left -= take;
    }
    return n - left;
  }

  /** Matching slot indices, most worn first. Materials sort as if full. */
  _byWear(itemId) {
    return this.slots
      .map((s, i) => (s && s.item === itemId ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => (this.slots[a].dur ?? Infinity) - (this.slots[b].dur ?? Infinity));
  }

  /**
   * All-or-nothing, so a partial failure never destroys materials. Tools go
   * most-worn-first, so crafting after a repair never eats the fresh one.
   */
  remove(itemId, n) {
    if (!validQty(n) || this.count(itemId) < n) return false;
    let left = n;
    for (const i of this._byWear(itemId)) {
      if (left === 0) break;
      const s = this.slots[i];
      const take = Math.min(s.n, left);
      s.n -= take; left -= take;
      if (s.n === 0) this.slots[i] = null;
    }
    return true;
  }

  /** @returns {number|null} remaining durability, or null if the slot has none */
  wearSlot(i, amount) {
    const s = this.slots[i];
    if (!s || s.dur == null || !(amount > 0)) return null;
    s.dur = Math.max(0, s.dur - amount);
    return s.dur;
  }

  /** @returns {boolean} true when a tool slot was restored to full */
  repairSlot(i) {
    const s = this.slots[i];
    if (!s || s.dur == null) return false;
    s.dur = itemById(s.item).durability;
    return true;
  }

  /** @returns {number} index of the most worn matching tool, or -1 */
  findWorn(itemId) {
    const idx = this._byWear(itemId).filter((i) => this.slots[i].dur != null);
    return idx.length ? idx[0] : -1;
  }

  toJSON() {
    return this.slots.map((s) =>
      s ? (s.dur == null ? { item: s.item, n: s.n } : { item: s.item, n: s.n, dur: s.dur }) : null,
    );
  }

  /**
   * Unknown item ids are dropped rather than thrown on — see player-store.
   * Without an explicit `size` the slot count is inferred from the data,
   * because `toJSON` emits one entry per slot: a clone that silently grew to
   * TOTAL_SLOTS would over-report room, and crafting's fit probe would then
   * consume inputs for an output that does not actually fit. Loading a
   * character passes `size` instead, so a truncated record cannot shrink a
   * player's pack.
   */
  static fromJSON(data, size = null) {
    if (!Array.isArray(data)) return new Inventory(size ?? TOTAL_SLOTS);
    const n = size ?? Math.min(Math.max(data.length, 1), TOTAL_SLOTS);
    const inv = new Inventory(n);
    data.slice(0, n).forEach((s, i) => {
      const item = s && itemById(s.item);
      if (!item || !validQty(s.n)) return;
      const slot = { item: s.item, n: Math.min(s.n, item.stack) };
      if (item.durability != null) slot.dur = clampDur(s.dur, item.durability);
      inv.slots[i] = slot;
    });
    return inv;
  }
}

export { STACK_MAX };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-inventory.test.js`
Expected: PASS

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS. Any spec-1 test that assumed tools stack must be updated here, with a one-line note in the commit body saying which and why.

- [ ] **Step 6: Commit**

```bash
git add src/rpg/inventory.js tests/unit/rpg-inventory.test.js
git commit -m "feat(rpg): track tool durability per inventory slot"
```

---

### Task 3: bestTool returns its slot and skips worn tools

**Files:**
- Modify: `src/rpg/tools.js`
- Modify: `src/rpg/survival-session.js` (the two call sites)
- Test: `tests/unit/rpg-tools.test.js`

**Interfaces:**
- Produces: `bestTool(inventory) -> { tool, slot }`, `slot` is `-1` for `TOOLS.HAND`

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-tools.test.js
describe("bestTool with wear", () => {
  it("returns the tool and the slot it came from", () => {
    const inv = new Inventory();
    inv.add("stone", 1);
    inv.add("pick_stone", 1);
    expect(bestTool(inv)).toEqual({ tool: TOOLS.PICK_STONE, slot: 1 });
    expect(bestTool(new Inventory())).toEqual({ tool: TOOLS.HAND, slot: -1 });
    expect(bestTool(null)).toEqual({ tool: TOOLS.HAND, slot: -1 });
  });

  it("skips a worn tool in favour of a lesser intact one", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_metal", 1);
    inv.wearSlot(1, 400); // the metal one is spent
    expect(bestTool(inv)).toEqual({ tool: TOOLS.PICK_STONE, slot: 0 });
  });

  it("falls back to hands when every tool is worn out", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 120);
    expect(bestTool(inv)).toEqual({ tool: TOOLS.HAND, slot: -1 });
  });

  it("prefers the least worn of two of the same tier", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 100);
    expect(bestTool(inv).slot).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-tools.test.js`
Expected: FAIL — `expected TOOLS.PICK_STONE to equal { tool, slot }`

- [ ] **Step 3: Write the implementation**

Replace `bestTool` in `src/rpg/tools.js`:

```js
/**
 * The best usable tool held, and the slot holding it. A tool at zero
 * durability is skipped entirely, so a spent pickaxe never beats an intact
 * lesser one — and bare hands are always the floor.
 * @returns {{tool: object, slot: number}} slot is -1 for TOOLS.HAND
 */
export function bestTool(inventory) {
  const none = { tool: TOOLS.HAND, slot: -1 };
  if (!inventory?.slots) return none;
  let best = none;
  for (let i = 0; i < inventory.slots.length; i++) {
    const s = inventory.slots[i];
    if (!s) continue;
    const tool = BY_ITEM.get(s.item);
    if (!tool || (s.dur ?? tool.durability) <= 0) continue;
    if (tool.tier > best.tool.tier) best = { tool, slot: i };
    // Same tier: take the least worn, so wear spreads instead of destroying one.
    else if (tool.tier === best.tool.tier && best.slot >= 0 &&
             (s.dur ?? 0) > (inventory.slots[best.slot].dur ?? 0)) best = { tool, slot: i };
  }
  return best;
}
```

In `src/rpg/survival-session.js`, update the two call sites:

```js
  tool() { return bestTool(this.inventory).tool; }

  /** @returns {{tool:object, slot:number}} the tool that will take the wear */
  toolSlot() { return bestTool(this.inventory); }
```

and in `beginBreak`, replace `this.tool()` with the cached pick:

```js
    const picked = this.toolSlot();
    this.breaking = {
      cell: { ...cell },
      blockId,
      elapsed: 0,
      need: breakTime(blockId, this.miningLevel(), picked.tool),
      toolSlot: picked.slot,
      toolItem: picked.slot >= 0 ? this.inventory.slots[picked.slot].item : null,
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-tools.test.js tests/unit/rpg-survival-session.test.js`
Expected: PASS

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rpg/tools.js src/rpg/survival-session.js tests/unit/rpg-tools.test.js
git commit -m "feat(rpg): pick the best intact tool and remember its slot"
```

---

### Task 4: Tools wear as you mine

**Files:**
- Modify: `src/rpg/survival-session.js`
- Test: `tests/unit/rpg-survival-session.test.js`

**Interfaces:**
- Produces: `tickBreak` result gains `worn: boolean`, true only on the frame a tool reaches zero

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-survival-session.test.js
describe("tool wear", () => {
  const withPick = () => {
    const s = session();
    s.inventory.add("pick_stone", 1);
    return s;
  };
  const mineOnce = (s) => {
    s.beginBreak(DIRT, DIRT_ID);
    return s.tickBreak(1e6, DIRT, DIRT_ID);
  };

  it("costs one durability per block broken", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    mineOnce(s);
    expect(s.inventory.slots[slot].dur).toBe(119);
    mineOnce(s);
    expect(s.inventory.slots[slot].dur).toBe(118);
  });

  it("reports worn exactly once, on the break that empties it", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    s.inventory.wearSlot(slot, 118); // 120 - 118 = 2 uses left
    expect(mineOnce(s).worn).toBe(false);   // down to 1, not empty yet
    expect(s.inventory.slots[slot].dur).toBe(1);
    expect(mineOnce(s).worn).toBe(true);    // this is the one that empties it
    expect(s.inventory.slots[slot].dur).toBe(0);
    expect(mineOnce(s).worn).toBe(false);   // already worn, not reported again
  });

  it("falls back to bare hands once worn, so breaking gets slower", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    const fast = breakTime(DIRT_ID, 1, TOOLS.PICK_STONE);
    s.beginBreak(DIRT, DIRT_ID);
    expect(s.breaking.need).toBeCloseTo(fast, 5);
    s.cancelBreak();

    s.inventory.wearSlot(slot, 120);
    s.beginBreak(DIRT, DIRT_ID);
    expect(s.breaking.need).toBeCloseTo(breakTime(DIRT_ID, 1, TOOLS.HAND), 5);
  });

  it("grants no wear at all bare-handed", () => {
    const s = session();
    expect(mineOnce(s).worn).toBe(false);
    expect(s.inventory.slots.every((x) => !x || x.dur == null)).toBe(true);
  });

  // Review Focus 4
  it("does not wear a slot whose tool the player crafted away mid-break", () => {
    const s = withPick();
    const slot = s.inventory.slots.findIndex((x) => x && x.item === "pick_stone");
    s.beginBreak(DIRT, DIRT_ID);
    s.inventory.remove("pick_stone", 1);   // gone mid-hold
    s.inventory.add("stone", 4);           // something else now occupies the slot
    const res = s.tickBreak(1e6, DIRT, DIRT_ID);
    expect(res.broke).toBe(true);
    expect(s.inventory.slots[slot]?.dur).toBe(undefined); // the stone was not "worn"
    expect(s.inventory.count("stone")).toBe(4);
  });
});
```

Add `breakTime` and `TOOLS` to the test file's imports if not already present.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-survival-session.test.js`
Expected: FAIL — durability stays at 120; `worn` is undefined

- [ ] **Step 3: Write the implementation**

In `src/rpg/survival-session.js`, inside `tickBreak`, just before the return, after the xp grant:

```js
    // Wear the tool that actually started this break. The slot is re-checked
    // because the player may have crafted it away while holding the button.
    let worn = false;
    const ts = b.toolSlot;
    if (ts >= 0) {
      const slot = this.inventory.slots[ts];
      if (slot && slot.item === b.toolItem && slot.dur > 0) {
        worn = this.inventory.wearSlot(ts, WEAR_PER_BLOCK) === 0;
      }
    }
```

and add `worn` to the returned object. Add the constant at the top of the file:

```js
/** Durability spent per block broken. */
const WEAR_PER_BLOCK = 1;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-survival-session.test.js`
Expected: PASS

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rpg/survival-session.js tests/unit/rpg-survival-session.test.js
git commit -m "feat(rpg): wear the pickaxe that broke the block"
```

---

### Task 5: The three station blocks and their art

**Files:**
- Modify: `src/world/blocks.js`
- Modify: `src/rendering/voxel/natural-art.js`
- Modify: `tests/unit/world.test.js` (the pinned block count — a deliberate change)
- Modify: `src/rpg/gather.js` (GATHER entries for the new ids)
- Test: `tests/unit/world.test.js`, `tests/unit/atlas.test.js`, `tests/unit/rpg-gather.test.js`

**Interfaces:**
- Produces: block ids 16 `Workbench`, 17 `Anvil`, 18 `Forge`; face keys `nat:workbench`/`nat:workbench_top` and the same for anvil and forge

- [ ] **Step 1: Write the failing test**

```js
// replace the block-table assertion in tests/unit/world.test.js
  it("has stable ids and the fourteen playable blocks, bedrock and three stations", () => {
    expect(BLOCKS.length).toBe(19);
    BLOCKS.forEach((b, i) => expect(b.id).toBe(i));
    expect(BLOCKS.map((b) => b.name)).toEqual([
      "Air", "Stone", "Tech", "Metal", "Energy", "Door", "Secret", "Boss", "Glass", "Rift",
      "Dirt", "Grass", "Sand", "Rock", "Ore", "Bedrock",
      "Workbench", "Anvil", "Forge",
    ]);
    expect(AIR).toBe(0); expect(BEDROCK).toBe(15);
    expect(isSolid(AIR)).toBe(false); expect(isSolid(8)).toBe(true);
    expect(isOpaque(8)).toBe(false); expect(isOpaque(1)).toBe(true);
    expect(isSolid(16)).toBe(true); expect(isOpaque(16)).toBe(true);
    expect(LAYER_TO_BLOCKS).toEqual([0, 1, 1, 2, 2, 3]);
    expect(FACE).toEqual({ TOP: 0, SIDE: 1, BOTTOM: 2 });
  });

  it("gives each station a distinct top face so it reads from above", () => {
    for (const id of [16, 17, 18]) {
      expect(BLOCKS[id].faces.top).not.toBe(BLOCKS[id].faces.side);
      expect(BLOCKS[id].hardness).toBeGreaterThan(0);
      expect(Number.isFinite(BLOCKS[id].hardness)).toBe(true);
    }
  });
```

```js
// append to tests/unit/rpg-gather.test.js
describe("stations are gatherable", () => {
  it("drops itself and pays xp, like any other block", () => {
    for (const [id, item] of [[16, "workbench"], [17, "anvil"], [18, "forge"]]) {
      expect(canMine(id, 50)).toEqual({ ok: true });
      expect(dropsFor(id)).toBe(item);
      expect(xpFor(id)).toBeGreaterThan(0);
      expect(Number.isFinite(breakTime(id, 1))).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/world.test.js tests/unit/rpg-gather.test.js`
Expected: FAIL — `expected 16 to be 19`

- [ ] **Step 3: Write the implementation**

In `src/world/blocks.js`, append after Bedrock and add the helper:

```js
const station = (n) => ({ top: `nat:${n}_top`, side: `nat:${n}`, bottom: `nat:${n}` });
```

```js
  { id: 16, name: "Workbench", kind: "solid", faces: station("workbench"), hardness: 1, color: "#8a6a3a" },
  { id: 17, name: "Anvil", kind: "solid", faces: station("anvil"), hardness: 1.5, color: "#4a4e57" },
  { id: 18, name: "Forge", kind: "solid", faces: station("forge"), hardness: 1.5, color: "#5a3428", emissive: [0.9, 0.35, 0.1] },
```

In `src/rendering/voxel/natural-art.js`, add to `BASE`:

```js
  workbench: [138, 106, 58], workbench_top: [156, 122, 70],
  anvil: [74, 78, 87], anvil_top: [92, 96, 104],
  forge: [90, 52, 40], forge_top: [120, 58, 34],
```

and add cases to `paintNatural`'s switch, before `default:`:

```js
    case "workbench_top":
    case "workbench": {
      const c = noiseCanvas(size, BASE[name], { ...st, seed: 11, cell: size / 12 });
      const g = c.getContext("2d");
      // Plank seams: along the grain on top, upright on the sides.
      g.strokeStyle = "rgba(48,32,16,0.55)"; g.lineWidth = Math.max(1, size / 96);
      const n = 4;
      for (let i = 1; i < n; i++) {
        const p = (i / n) * size;
        g.beginPath();
        if (name === "workbench_top") { g.moveTo(0, p); g.lineTo(size, p); }
        else { g.moveTo(p, 0); g.lineTo(p, size); }
        g.stroke();
      }
      if (name !== "workbench_top") { g.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96); }
      return c;
    }
    case "anvil_top":
    case "anvil": {
      const c = noiseCanvas(size, BASE[name], { ...st, seed: 12, cell: size / 32, desat: 0.5 });
      const g = c.getContext("2d");
      // Banded iron, lighter where it would be struck.
      g.fillStyle = "rgba(210,214,222,0.18)";
      g.fillRect(0, name === "anvil_top" ? size * 0.3 : size * 0.12, size, size * 0.26);
      g.strokeStyle = "rgba(18,20,24,0.6)"; g.lineWidth = Math.max(1, size / 80);
      g.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
      return c;
    }
    case "forge_top":
    case "forge": {
      const c = noiseCanvas(size, BASE[name], { ...st, seed: 13, cell: size / 20 });
      const g = c.getContext("2d");
      // Coals: hot on top, a soot-darkened mouth on the sides.
      const hot = name === "forge_top";
      for (let i = 0; i < (hot ? 26 : 10); i++) {
        const x = hash(i, 21, 13) * size, y = hash(i, 22, 13) * size;
        g.fillStyle = hot ? `rgba(255,${120 + hash(i, 23, 13) * 90 | 0},40,0.75)` : "rgba(20,14,12,0.5)";
        g.beginPath(); g.arc(x, y, size / 26 * (0.5 + hash(i, 24, 13)), 0, Math.PI * 2); g.fill();
      }
      return c;
    }
```

In `src/rpg/gather.js`, add to `GATHER`:

```js
  16: { minLevel: 1,  xp: 5  },  // Workbench — you built it; the bitset pays no xp
  17: { minLevel: 1,  xp: 5  },  // Anvil
  18: { minLevel: 1,  xp: 5  },  // Forge
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/world.test.js tests/unit/rpg-gather.test.js tests/unit/atlas.test.js`
Expected: PASS. `atlas.test.js` derives from `BLOCKS`, so it should absorb the new face keys — if it pins a layer count, update that number and say so in the commit body.

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/world/blocks.js src/rendering/voxel/natural-art.js src/rpg/gather.js tests/unit/world.test.js tests/unit/rpg-gather.test.js
git commit -m "feat(forge): add workbench, anvil and forge blocks with procedural art"
```

---

### Task 6: Station proximity

**Files:**
- Create: `src/rpg/stations.js`
- Test: `tests/unit/rpg-stations.test.js`

**Interfaces:**
- Produces: `STATIONS` (`{ workbench: 16, anvil: 17, forge: 18 }`), `STATION_RADIUS` (5), `stationsInRange(world, player, radius = STATION_RADIUS) -> Set<string>`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/rpg-stations.test.js
import { describe, it, expect } from "vitest";
import { STATIONS, STATION_RADIUS, stationsInRange } from "../../src/rpg/stations.js";
import { World } from "../../src/world/world.js";

const at = (x, y, z) => ({ x, y, z });

describe("stationsInRange", () => {
  it("is empty with no stations, no world, or no player", () => {
    expect(stationsInRange(new World(), at(64, 64, 32)).size).toBe(0);
    expect(stationsInRange(null, at(64, 64, 32)).size).toBe(0);
    expect(stationsInRange(new World(), null).size).toBe(0);
  });

  it("finds a station beside the player", () => {
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    expect([...stationsInRange(w, at(64, 64, 32))]).toEqual(["workbench"]);
  });

  it("finds every station in range, not just the nearest", () => {
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    w.set(63, 64, 32, STATIONS.anvil);
    w.set(64, 65, 32, STATIONS.forge);
    const found = stationsInRange(w, at(64, 64, 32));
    expect(found.size).toBe(3);
    expect(found.has("workbench")).toBe(true);
    expect(found.has("anvil")).toBe(true);
    expect(found.has("forge")).toBe(true);
  });

  it("includes a station exactly at the radius and excludes one past it", () => {
    const w = new World();
    w.set(64 + STATION_RADIUS, 64, 32, STATIONS.workbench);
    expect(stationsInRange(w, at(64, 64, 32)).has("workbench")).toBe(true);

    const far = new World();
    far.set(64 + STATION_RADIUS + 1, 64, 32, STATIONS.workbench);
    expect(stationsInRange(far, at(64, 64, 32)).has("workbench")).toBe(false);
  });

  it("does not reach through the world edge or out of bounds", () => {
    const w = new World();
    expect(() => stationsInRange(w, at(0, 0, 0))).not.toThrow();
    expect(() => stationsInRange(w, at(127, 127, 63))).not.toThrow();
    expect(stationsInRange(w, at(0, 0, 0)).size).toBe(0);
  });

  it("uses a fractional player position the way the Forge stores it", () => {
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    expect(stationsInRange(w, at(64.5, 64.5, 32)).has("workbench")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-stations.test.js`
Expected: FAIL — `Cannot find module '../../src/rpg/stations.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/rpg/stations.js
/**
 * Crafting stations are ordinary blocks; standing near one unlocks its recipe
 * tier. Every station in range counts, not just the closest, because a base
 * with all three built is the case that matters. Line of sight is not
 * required — a bench behind a wall you built is still your bench.
 */
import { World } from "../world/world.js";

export const STATIONS = { workbench: 16, anvil: 17, forge: 18 };
export const STATION_RADIUS = 5;

const BY_ID = new Map(Object.entries(STATIONS).map(([name, id]) => [id, name]));

/**
 * @param {import("../world/world.js").World|null} world
 * @param {{x:number,y:number,z:number}|null} player
 * @returns {Set<string>} station names within `radius` cells, possibly empty
 */
export function stationsInRange(world, player, radius = STATION_RADIUS) {
  const found = new Set();
  if (!world || !player) return found;
  const px = Math.floor(player.x), py = Math.floor(player.y), pz = Math.floor(player.z);
  if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return found;

  const lo = (v) => Math.max(0, v - radius);
  for (let z = lo(pz); z <= Math.min(World.H - 1, pz + radius); z++) {
    for (let y = lo(py); y <= Math.min(World.D - 1, py + radius); y++) {
      for (let x = lo(px); x <= Math.min(World.W - 1, px + radius); x++) {
        const name = BY_ID.get(world.get(x, y, z));
        if (name) found.add(name);
      }
    }
  }
  return found;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-stations.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rpg/stations.js tests/unit/rpg-stations.test.js
git commit -m "feat(rpg): detect which crafting stations are within reach"
```

---

### Task 7: Station recipe tiers and repair recipes

**Files:**
- Modify: `src/rpg/recipes.js`
- Test: `tests/unit/rpg-recipes.test.js`

**Interfaces:**
- Produces: nine new recipes; `availableRecipes(skills, stations, table)` where `stations` is `string | string[] | Set<string> | null`; recipes may carry `repairs: "<toolId>"` in place of `output`

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-recipes.test.js
describe("station tiers", () => {
  it("puts smelting at the workbench, not the forge, so ore is never dead weight", () => {
    expect(recipeById("smelt_metal").station).toBe("workbench");
  });

  it("gates the three station builds in ladder order", () => {
    expect(recipeById("workbench").station).toBe(null);
    expect(recipeById("anvil").station).toBe("workbench");
    expect(recipeById("forge").station).toBe("workbench");
    expect(recipeById("anvil").requires.construction)
      .toBeLessThan(recipeById("forge").requires.construction);
  });

  it("gives repair recipes a repairs target and no output", () => {
    const r = recipeById("repair_pick_stone");
    expect(r.repairs).toBe("pick_stone");
    expect(r.output).toBe(null);
    expect(r.station).toBe("anvil");
    expect(recipeById("repair_pick_metal").repairs).toBe("pick_metal");
  });

  it("keeps every non-repair recipe acyclic and pointing at real items", () => {
    RECIPES.forEach((r) => {
      r.inputs.forEach(([id]) => expect(itemById(id)).not.toBe(null));
      if (r.output) {
        expect(itemById(r.output[0])).not.toBe(null);
        expect(r.inputs.map(([id]) => id)).not.toContain(r.output[0]);
      } else {
        expect(itemById(r.repairs)).not.toBe(null);
      }
    });
  });
});

describe("availableRecipes with a set of stations", () => {
  const maxed = () => new Skills({ construction: 100_000 });

  it("shows only station-free rows when nothing is in range", () => {
    const rows = availableRecipes(maxed(), null);
    expect(rows.every((r) => r.station === null)).toBe(true);
    expect(rows.find((r) => r.id === "anvil")).toBe(undefined);
  });

  it("accepts a single station name, an array, and a Set alike", () => {
    const ids = (arg) => availableRecipes(maxed(), arg).map((r) => r.id).sort();
    expect(ids("workbench")).toEqual(ids(["workbench"]));
    expect(ids("workbench")).toEqual(ids(new Set(["workbench"])));
    expect(ids("workbench")).toContain("anvil");
  });

  it("shows every in-range station's rows at once, so repairs stay reachable", () => {
    const rows = availableRecipes(maxed(), new Set(["workbench", "anvil", "forge"]));
    const ids = rows.map((r) => r.id);
    expect(ids).toContain("cut_stone");       // station-free
    expect(ids).toContain("anvil");           // workbench
    expect(ids).toContain("repair_pick_stone"); // anvil
    expect(ids).toContain("cast_energy");     // forge
  });

  it("hides a station's rows once it is out of range", () => {
    const ids = availableRecipes(maxed(), new Set(["workbench"])).map((r) => r.id);
    expect(ids).not.toContain("repair_pick_stone");
    expect(ids).not.toContain("cast_energy");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-recipes.test.js`
Expected: FAIL — `Cannot read properties of null (reading 'station')` on `recipeById("anvil")`

- [ ] **Step 3: Write the implementation**

In `src/rpg/recipes.js`, extend the factory and the table:

```js
const recipe = (id, name, inputs, output, construction, xp, station = null) =>
  ({ id, name, inputs, output, requires: { construction }, xp, station, repairs: null });

/** A repair consumes its inputs and restores a worn tool; it yields no item. */
const repair = (id, name, inputs, toolId, construction, xp, station) =>
  ({ id, name, inputs, output: null, requires: { construction }, xp, station, repairs: toolId });

export const RECIPES = [
  recipe("cut_stone",   "Cut Stone",     [["rock", 2]],                          ["stone", 1],      1,  10),
  recipe("melt_glass",  "Melt Glass",    [["sand", 4]],                          ["glass", 1],      1,  15),
  recipe("pick_stone",  "Stone Pickaxe", [["stone", 3], ["rock", 2]],            ["pick_stone", 1], 1,  25),
  recipe("pick_metal",  "Metal Pickaxe", [["metal", 3], ["rock", 2]],            ["pick_metal", 1], 10, 60),
  recipe("workbench",   "Workbench",     [["stone", 10], ["metal", 2]],          ["workbench", 1],  5,  100),

  recipe("smelt_metal", "Smelt Metal",   [["ore", 2]],                           ["metal", 1],      5,  30, "workbench"),
  recipe("reinforce",   "Reinforce Stone", [["stone", 4], ["metal", 1]],         ["tech", 2],       6,  40, "workbench"),
  recipe("anvil",       "Anvil",         [["metal", 6], ["stone", 4]],           ["anvil", 1],      8,  200, "workbench"),
  recipe("forge",       "Forge",         [["stone", 12], ["metal", 8], ["energy", 2]], ["forge", 1], 15, 400, "workbench"),

  repair("repair_pick_stone", "Repair Stone Pickaxe", [["stone", 1], ["rock", 1]], "pick_stone", 1,  15, "anvil"),
  repair("repair_pick_metal", "Repair Metal Pickaxe", [["metal", 1], ["rock", 1]], "pick_metal", 10, 35, "anvil"),

  recipe("cast_energy", "Cast Energy",   [["ore", 4], ["glass", 2]],             ["energy", 1],     18, 90, "forge"),
  recipe("bind_rift",   "Bind Rift",     [["energy", 4], ["secret", 1]],         ["rift", 1],       25, 200, "forge"),
];
```

Replace `availableRecipes`:

```js
/**
 * Recipes reachable right now: the station-free tier plus every station in
 * range. Rows the player's level does not reach are returned locked rather
 * than hidden, so levelling has a visible destination — but a station you are
 * not standing at is hidden, because it is not a goal you can act on here.
 * @param {string|string[]|Set<string>|null} stations
 */
export function availableRecipes(skills, stations = null, table = RECIPES) {
  const inRange =
    stations == null ? new Set() :
    typeof stations === "string" ? new Set([stations]) : new Set(stations);
  return table
    .filter((r) => r.station === null || inRange.has(r.station))
    .map((r) => {
      const need = r.requires.construction;
      const locked = skills.level("construction") < need;
      return { ...r, locked, reason: locked ? `Requires Construction ${need}` : null };
    });
}
```

Note `pick_metal` stays station-free, exactly as spec 1 shipped it. Moving it
behind the Anvil would read better thematically, but the approved spec moves
**only** `smelt_metal`, and widening that here is not the plan's call to make.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-recipes.test.js`
Expected: PASS. Spec-1 tests asserting `RECIPES.length === 5` or that every recipe is `station: null` must be updated here; say which in the commit body.

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rpg/recipes.js tests/unit/rpg-recipes.test.js
git commit -m "feat(rpg): add station recipe tiers and pickaxe repairs"
```

---

### Task 8: Crafting handles repairs

**Files:**
- Modify: `src/rpg/crafting.js`
- Test: `tests/unit/rpg-crafting.test.js`

**Interfaces:**
- Produces: `canCraft`/`craft` accept repair recipes; `craft` returns `{ok:true, repaired:"<itemId>"}` for one

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-crafting.test.js
describe("repair recipes", () => {
  const worn = (dur) => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 120 - dur);
    inv.add("stone", 4);
    inv.add("rock", 4);
    return inv;
  };

  it("restores the tool to full and consumes the inputs", () => {
    const inv = worn(10);
    const skills = new Skills();
    const res = craft("repair_pick_stone", inv, skills);
    expect(res.ok).toBe(true);
    expect(res.repaired).toBe("pick_stone");
    expect(inv.slots[0].dur).toBe(120);
    expect(inv.count("stone")).toBe(3);
    expect(inv.count("rock")).toBe(3);
    expect(skills.xp.construction).toBe(15);
  });

  it("repairs the most worn of two", () => {
    const inv = worn(10);
    inv.add("pick_stone", 1); // a second, full one
    const fresh = inv.slots.findIndex((s, i) => i !== 0 && s && s.item === "pick_stone");
    craft("repair_pick_stone", inv, new Skills());
    expect(inv.slots[0].dur).toBe(120);
    expect(inv.slots[fresh].dur).toBe(120);
  });

  it("refuses with nothing worn and consumes nothing", () => {
    const inv = new Inventory();
    inv.add("stone", 4); inv.add("rock", 4);
    const skills = new Skills();
    expect(craft("repair_pick_stone", inv, skills))
      .toEqual({ ok: false, reason: "Nothing to repair" });
    expect(inv.count("stone")).toBe(4);
    expect(skills.xp.construction).toBe(0);
  });

  it("refuses a repair whose tool is already at full", () => {
    const inv = worn(120);
    expect(craft("repair_pick_stone", inv, new Skills()))
      .toEqual({ ok: false, reason: "Nothing to repair" });
  });

  it("refuses when the inputs are short, leaving the tool worn", () => {
    const inv = new Inventory();
    inv.add("pick_stone", 1);
    inv.wearSlot(0, 100);
    expect(craft("repair_pick_stone", inv, new Skills()).ok).toBe(false);
    expect(inv.slots[0].dur).toBe(20);
  });

  it("does not need a free slot, since a repair yields no item", () => {
    const inv = new Inventory(3);
    inv.add("pick_stone", 1); inv.wearSlot(0, 60);
    inv.add("stone", 64); inv.add("rock", 64);
    expect(inv.fits("stone", 1)).toBe(false); // pack is full
    expect(craft("repair_pick_stone", inv, new Skills()).ok).toBe(true);
    expect(inv.slots[0].dur).toBe(120);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-crafting.test.js`
Expected: FAIL — `Cannot read properties of null (reading '0')` where `canCraft` probes `r.output`

- [ ] **Step 3: Write the implementation**

In `src/rpg/crafting.js`, in `canCraft`, replace the output-fit block:

```js
  // A repair yields no item, so it needs a worn tool rather than a free slot.
  if (r.repairs) {
    const slot = inventory.findWorn(r.repairs);
    const full = slot >= 0 && inventory.slots[slot].dur >= itemById(r.repairs).durability;
    if (slot < 0 || full) return { ok: false, reason: "Nothing to repair" };
    return { ok: true };
  }

  // Check the output fits against the inventory as it will be *after* the
  // inputs come out, since removing them may free the slot the output needs.
  const probe = cloneInventory(inventory);
  for (const [itemId, n] of r.inputs) probe.remove(itemId, n);
  if (!probe.fits(r.output[0], r.output[1])) {
    return { ok: false, reason: "Inventory full" };
  }
  return { ok: true };
```

and in `craft`, replace the mutation block:

```js
  const r = recipeById(recipeId);
  for (const [itemId, n] of r.inputs) inventory.remove(itemId, n);

  let repaired = null;
  if (r.repairs) {
    inventory.repairSlot(inventory.findWorn(r.repairs));
    repaired = r.repairs;
  } else {
    inventory.add(r.output[0], r.output[1]);
  }
  const granted = skills.grant("construction", r.xp);

  return {
    ok: true,
    output: r.output ? [...r.output] : null,
    repaired,
    leveled: granted?.leveled ?? false,
  };
```

**Order matters:** inputs come out before `findWorn` runs again, so the repair must re-find the slot rather than reuse the index from `canCraft` — removing a material stack can shift nothing, but re-finding is what makes that safe to reason about.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-crafting.test.js`
Expected: PASS

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rpg/crafting.js tests/unit/rpg-crafting.test.js
git commit -m "feat(rpg): repair a worn tool instead of yielding an item"
```

---

### Task 9: The session knows which stations are in reach

**Files:**
- Modify: `src/rpg/survival-session.js`
- Test: `tests/unit/rpg-survival-session.test.js`

**Interfaces:**
- Produces: `SurvivalSession.stations(world, player) -> Set<string>`; `recipes(stations)` passes through to `availableRecipes`; `canCraft(recipeId, stations)` refuses an out-of-range recipe

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-survival-session.test.js
describe("station-aware crafting", () => {
  it("reports the stations around the player", async () => {
    const { World } = await import("../../src/world/world.js");
    const { STATIONS } = await import("../../src/rpg/stations.js");
    const s = session();
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    expect([...s.stations(w, { x: 64.5, y: 64.5, z: 32 })]).toEqual(["workbench"]);
    expect(s.stations(null, null).size).toBe(0);
  });

  it("refuses a recipe whose station is not in reach", () => {
    const s = session();
    s.skills.grant("construction", 100_000);
    s.inventory.add("ore", 2);
    expect(s.canCraft("smelt_metal")).toEqual({ ok: false, reason: "Needs a Workbench" });
    expect(s.canCraft("smelt_metal", new Set(["workbench"])).ok).toBe(true);
  });

  it("crafts once the station is in reach", () => {
    const s = session();
    s.skills.grant("construction", 100_000);
    s.inventory.add("ore", 2);
    expect(s.craft("smelt_metal").ok).toBe(false);
    expect(s.inventory.count("ore")).toBe(2);
    expect(s.craft("smelt_metal", new Set(["workbench"])).ok).toBe(true);
    expect(s.inventory.count("metal")).toBe(1);
  });

  it("still crafts the station-free tier with nothing in reach", () => {
    const s = session();
    s.inventory.add("rock", 2);
    expect(s.craft("cut_stone").ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-survival-session.test.js`
Expected: FAIL — `s.stations is not a function`

- [ ] **Step 3: Write the implementation**

In `src/rpg/survival-session.js`, add the import and replace the three crafting pass-throughs:

```js
import { stationsInRange } from "./stations.js";
import { recipeById } from "./recipes.js";
```

```js
  /** @returns {Set<string>} stations within reach of `player` in `world` */
  stations(world, player) { return stationsInRange(world, player); }

  recipes(stations = null) { return availableRecipes(this.skills, stations); }

  /**
   * A recipe whose station is not in reach is refused by name, so the message
   * tells the player what to go and build rather than just saying no.
   */
  canCraft(recipeId, stations = null) {
    const r = recipeById(recipeId);
    if (r?.station && !(stations && new Set(stations).has(r.station))) {
      const name = r.station[0].toUpperCase() + r.station.slice(1);
      return { ok: false, reason: `Needs a ${name}` };
    }
    return canCraft(recipeId, this.inventory, this.skills);
  }

  craft(recipeId, stations = null) {
    const gate = this.canCraft(recipeId, stations);
    if (!gate.ok) return gate;
    return craftRecipe(recipeId, this.inventory, this.skills);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-survival-session.test.js`
Expected: PASS

- [ ] **Step 5: Run the whole unit suite**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/rpg/survival-session.js tests/unit/rpg-survival-session.test.js
git commit -m "feat(rpg): gate crafting on the stations within reach"
```

---

### Task 10: Craft menu and durability readout

**Files:**
- Modify: `js/forge.js`
- Test: `tests/unit/rpg-craft-menu.test.js`

**Interfaces:**
- Produces: `craftMenuRows(session, stations)` takes the station set; `ForgeMode.stationsNear` cached set, refreshed on menu open and every `STATION_POLL_MS`

- [ ] **Step 1: Write the failing test**

```js
// append to tests/unit/rpg-craft-menu.test.js
import { World } from "../../src/world/world.js";
import { STATIONS } from "../../src/rpg/stations.js";

describe("craft menu with stations", () => {
  const maxed = () => {
    const s = new SurvivalSession();
    s.skills.grant("construction", 100_000);
    return s;
  };

  it("shows only the station-free tier with nothing in reach", () => {
    const ids = craftMenuRows(maxed(), new Set()).map((r) => r.id);
    expect(ids).toContain("cut_stone");
    expect(ids).toContain("workbench");
    expect(ids).not.toContain("anvil");
    expect(ids).not.toContain("repair_pick_stone");
  });

  it("adds a station's rows when it is in reach", () => {
    const ids = craftMenuRows(maxed(), new Set(["workbench"])).map((r) => r.id);
    expect(ids).toContain("anvil");
    expect(ids).toContain("smelt_metal");
  });

  it("renders a repair row with its target instead of an output item", () => {
    const row = craftMenuRows(maxed(), new Set(["anvil"])).find((r) => r.id === "repair_pick_stone");
    expect(row.outputText).toBe("Repair Stone Pickaxe");
    expect(row.inputText).toBe("1 Stone, 1 Rock");
    expect(row.craftable).toBe(false);
    expect(row.note).toBe("Nothing to repair");
  });

  // Review Focus 5
  it("drops a station's rows once the block is gone", () => {
    const s = maxed();
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    const player = { x: 64.5, y: 64.5, z: 32 };
    expect(craftMenuRows(s, s.stations(w, player)).map((r) => r.id)).toContain("anvil");

    w.set(65, 64, 32, 0); // somebody mined the bench
    expect(craftMenuRows(s, s.stations(w, player)).map((r) => r.id)).not.toContain("anvil");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/rpg-craft-menu.test.js`
Expected: FAIL — `anvil` present with nothing in reach, because `craftMenuRows` ignores its second argument

- [ ] **Step 3: Write the implementation**

In `js/forge.js`, update `craftMenuRows` to take and forward the station set, and to render a repair row:

```js
export function craftMenuRows(session, stations = null) {
  const qty = ([id, n]) => `${n} ${itemById(id).name}`;
  return session.recipes(stations).map((r) => {
    const check = session.canCraft(r.id, stations);
    return {
      id: r.id,
      name: r.name,
      inputText: r.inputs.map(qty).join(", "),
      outputText: r.output ? qty(r.output) : r.name,
      locked: r.locked,
      craftable: check.ok,
      note: check.ok ? null : check.reason,
    };
  });
}
```

Add the cached set and its poll to the constructor:

```js
    /** Stations within reach, refreshed on a timer rather than per frame. */
    this.stationsNear = new Set();
    this.stationPoll = 0;
```

In `update(dt)`, inside the existing `if (this.survival)` block:

```js
      this.stationPoll -= dt * 1000;
      if (this.stationPoll <= 0) {
        this.stationsNear = this.survival.stations(this.world, this.player);
        this.stationPoll = STATION_POLL_MS;
      }
```

with the constant beside the other module constants:

```js
/** How often the Forge re-scans for nearby stations, in milliseconds. */
const STATION_POLL_MS = 500;
```

In `handleKeyDown`, the `KeyC` branch refreshes immediately so the menu never
opens stale, and every `craftMenuRows`/`craft` call passes `this.stationsNear`:

```js
    if (this.survival && code === "KeyC" && !ctrl) {
      this.craftOpen = !this.craftOpen;
      this.craftIndex = 0;
      if (this.craftOpen) {
        this.stationsNear = this.survival.stations(this.world, this.player);
        this.stationPoll = STATION_POLL_MS;
      }
      this.audio.menuSelect();
      return true;
    }
```

and the Enter branch becomes `this.survival.craft(row.id, this.stationsNear)`.

In `_renderCraftMenu`, the header gains the station line; in `_renderSkills`,
add the durability bar under the two skill bars:

```js
    // Station header: what this bench can make, or that there is no bench.
    const names = [...this.stationsNear].map((s) => s[0].toUpperCase() + s.slice(1));
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "11px monospace";
    ctx.fillText(names.length ? `At: ${names.join(", ")}` : "No station", x + 14, y + 44);
```

```js
    // Tool wear, under the skills. Nothing is drawn bare-handed.
    const { tool, slot } = bestToolOf(this.survival.inventory);
    if (slot >= 0) {
      const dur = this.survival.inventory.slots[slot].dur;
      const frac = Math.max(0, Math.min(1, dur / tool.durability));
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "11px monospace";
      ctx.fillText(`${tool.name} ${dur}/${tool.durability}`, x + 14, barY);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x + 14, barY + 4, 170, 3);
      ctx.fillStyle = frac > 0.25 ? "rgba(0,255,200,0.6)" : "rgba(255,120,80,0.8)";
      ctx.fillRect(x + 14, barY + 4, 170 * frac, 3);
    }
```

importing `bestTool as bestToolOf` from `../src/rpg/tools.js`, and growing the
survival panel's height by one row to fit it.

**Both snippets use `x`, `y` and `barY` from the existing `_renderCraftMenu`
and `_renderSkills` bodies — read those methods first and use whatever those
locals are actually called there.** The panel geometry was set in spec 1's
Task 12; do not re-derive it, and do not touch the creative HUD while in the
file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/rpg-craft-menu.test.js`
Expected: PASS

- [ ] **Step 5: Run both suites**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS, including all 12 existing Forge e2e tests

- [ ] **Step 6: Commit**

```bash
git add js/forge.js tests/unit/rpg-craft-menu.test.js
git commit -m "feat(forge): show station tiers and tool wear in the craft menu"
```

---

### Task 11: End-to-end station and repair loop

**Files:**
- Modify: `tests/forge.spec.js`
- Modify: `js/testing/debug-bridge.js`

**Interfaces:**
- Produces: the `forgeSurvival()` bridge snapshot gains `stations` (array) and `tool` (`{id, dur, max}` or null)

- [ ] **Step 1: Extend the debug bridge**

In `js/testing/debug-bridge.js`, add these three accessors beside the existing
`forgeSurvival()`. All return plain data: a `Set` and a `Uint8Array` do not
cross the Playwright boundary, so neither may be returned directly.

```js
  /** Station names within reach, as a plain array. */
  forgeStations() {
    return [...(game.builder?.stationsNear ?? [])];
  },

  /** The craft menu's row ids for whatever is currently in reach. */
  craftRowIds() {
    const b = game.builder;
    if (!b?.survival) return [];
    return craftMenuRows(b.survival, b.stationsNear).map((r) => r.id);
  },

  /** Best held tool and its wear, or null bare-handed. */
  forgeTool() {
    const inv = game.builder?.survival?.inventory;
    if (!inv) return null;
    const { tool, slot } = bestTool(inv);
    if (slot < 0) return null;
    return { id: tool.id, dur: inv.slots[slot].dur, max: tool.durability };
  },
```

`debug-bridge.js` needs `craftMenuRows` from `../forge.js` and `bestTool` from
`../../src/rpg/tools.js`. Check whether it already imports from `forge.js`; if
it does not, confirm the import does not pull the lazily-loaded Forge chunk
into the boot bundle. If it would, read the function off the builder instance
instead of importing it.

- [ ] **Step 2: Write the failing e2e test**

```js
// append inside the Voxel Forge describe in tests/forge.spec.js
  test("survival: build a workbench, and repair a worn pickaxe at an anvil", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);
    await page.evaluate(() => window.ccDebug.game.builder.handleKeyDown({ code: "KeyM" }));

    // Stock the pack directly: gathering it all is spec 1's test, not this one.
    await page.evaluate(() => {
      const s = window.ccDebug.game.builder.survival;
      s.skills.grant("construction", 100000);
      s.inventory.add("stone", 40);
      s.inventory.add("metal", 30);
      s.inventory.add("energy", 4);
      s.inventory.add("rock", 20);
    });

    // With no bench in reach, the workbench itself is the only station build.
    const before = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.stationsNear = b.survival.stations(b.world, b.player);
      return window.ccDebug.craftRowIds();
    });
    expect(before).toContain("workbench");
    expect(before).not.toContain("anvil");

    // Craft one, put it down beside the player, and the tier opens.
    const after = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.survival.craft("workbench", b.stationsNear);
      const c = { x: Math.floor(b.player.x) + 1, y: Math.floor(b.player.y), z: Math.floor(b.player.z) };
      b.world.set(c.x, c.y, c.z, 16);
      b.stationsNear = b.survival.stations(b.world, b.player);
      return window.ccDebug.craftRowIds();
    });
    expect(after).toContain("anvil");
    expect(after).toContain("smelt_metal");

    // Build the anvil, wear a pickaxe flat, and repair it back.
    const repaired = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.survival.craft("anvil", b.stationsNear);
      const c = { x: Math.floor(b.player.x) - 1, y: Math.floor(b.player.y), z: Math.floor(b.player.z) };
      b.world.set(c.x, c.y, c.z, 17);
      b.stationsNear = b.survival.stations(b.world, b.player);

      b.survival.inventory.add("pick_stone", 1);
      const slot = b.survival.inventory.slots.findIndex((s) => s && s.item === "pick_stone");
      b.survival.inventory.wearSlot(slot, 120);
      const spent = b.survival.inventory.slots[slot].dur;
      const res = b.survival.craft("repair_pick_stone", b.stationsNear);
      return { spent, ok: res.ok, dur: b.survival.inventory.slots[slot].dur };
    });
    expect(repaired.spent).toBe(0);
    expect(repaired.ok).toBe(true);
    expect(repaired.dur).toBe(120);

    await screenshot(page, "forge-stations-repair");
  });
```

- [ ] **Step 3: Run the e2e suite**

Run: `npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS — 12 existing plus this one

- [ ] **Step 4: Run both suites**

Run: `npm run test:unit && npx playwright test tests/forge.spec.js --workers=1`
Expected: PASS, 0 failures

- [ ] **Step 5: Verify the station art actually reads**

Run the Forge, place all three stations side by side, and take a screenshot.
Confirm each is visually distinguishable from stone and from each other in at
least the Comic style. `paintNatural`'s `default:` falls back to rock, so a
missing painter case renders as grey noise rather than failing — this step is
the only thing that catches that.

- [ ] **Step 6: Commit**

```bash
git add tests/forge.spec.js js/testing/debug-bridge.js
git commit -m "test(forge): cover building stations and repairing a worn pickaxe"
```

---

## Done when

- `npm run test:unit` passes: roughly 1,010 tests across 66 files.
- `npx playwright test tests/forge.spec.js --workers=1` passes, 14 tests.
- A creative world is unchanged: stations are absent from `PLACEABLE_BLOCKS`, no new HUD, no new key.
- A pickaxe wears one point per block, stops helping at zero without vanishing, and is repaired at an Anvil for a third of its build cost.
- Standing near a Workbench, Anvil or Forge changes what the craft menu offers, and walking away changes it back.
- A spec 1 player record loads with every tool at full durability.
- The three stations are visually distinguishable from each other and from stone.
