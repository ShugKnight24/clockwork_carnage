# Suit Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurable enamel-and-brass badges with a curated and earned library, six accessory slots with small perks, and one earned unique variant per armour, drawn in every art style and every place the agent appears.

**Architecture:** New data tables (`src/data/badges.js`, `src/data/accessories.js`) hold every option by string id. A small field-accessor module (`src/core/character-fields.js`) lets both creators keep their index-based UI while the character record stores nested ids. A pure-string badge composer (`svg-art/insignia/`) and per-slot accessory painters (`svg-art/accessories/`) plug into `agent-rig.js` through an anchor table, so the showroom, cutscene cast, fallen pose, portrait and Legacy creator all get the same art.

**Tech Stack:** Vanilla ES modules, SVG markup strings, Web Components (showroom), Canvas2D (Legacy creator), Vitest (node env), Playwright.

**Spec:** `docs/superpowers/specs/2026-09-21-suit-customization-design.md`

## Global Constraints

- No runtime dependencies. Dev dependencies stay `vite`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`.
- All new character references are string ids; saves must survive table reordering.
- Old saves (`badgeIndex`) load with the same look: old icon on a brass disc, chest placement, plus shoulder when shoulders are `pauldrons` or `armored`; `badgeIndex` 0 means no badge.
- Art is built once per look change, never per frame.
- Code ids: `ART_MODERN` is the player-facing "Comic" style, `ART_REALISTIC` is the player-facing "Modern" style.
- Perks use only the six stats `Game.applyGearBonuses()` already applies: `maxHealthAdd`, `maxChronoEnergyAdd`, `maxStaminaAdd`, `dashCostAdd`, `armorAdd`, `moveSpeedAdd`. (The spec allows up to three new stats; this plan adds none, because the game has no grenade or swap-time stat to hook — see Task 3.)
- Accessory perks are about half an armour tier: `maxHealthAdd` ≤ 10, `maxStaminaAdd` ≤ 10, `maxChronoEnergyAdd` ≤ 10, `armorAdd` ≤ 5, `moveSpeedAdd` ≤ 0.05, `dashCostAdd` ≥ -3.
- Work on a feature branch (`feat/suit-customization`), never `master`. Commit messages: Conventional Commits, no AI attribution lines.
- Run `npx vitest run` after every task; it must stay green.

## Review Focus

1. **A save written by this build, reloaded by this build, after a table gains entries** — the look must be identical. Pinned in Task 4 (`round-trips a full custom badge and accessories`).
2. **A save that has an equipped accessory or badge the player no longer owns** (rule changed, `cc_unlocks` cleared) — the item stays if owned, otherwise resets to the slot default, never crashes. Pinned in Task 6 (`sanitizeLocked`).
3. **Picking a symbol or preset while the badge has no placements** — the badge must appear on the chest, not silently stay invisible. Pinned in Task 5 (`withIndex on badge.symbol adds chest when placements are empty`).
4. **The same badge drawn at chest and shoulder in one SVG, then passed through `scopeIds` and `realizeMarkup`** — no duplicate-id breakage, colours preserved. Pinned in Task 7 (composer emits no `id=` attributes) and Task 8 (realistic keep map).
5. **Undo after editing a nested field** — undo must restore the previous badge and accessories, not the mutated object. Pinned in Task 12 via Playwright (`undo restores badge after symbol change`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/badges.js` (new) | Symbol, frame, enamel, metal, finish, placement tables; badge presets; `DEFAULT_BADGE`; legacy icon map |
| `src/data/accessories.js` (new) | Slot list and per-slot item tables with perks and unlock rules; `DEFAULT_ACCESSORIES` |
| `src/data/cosmetics.js` (modify) | `badgeTreatment` and `variant` on each armour; `gearBonuses` sums accessories; `DEFAULT_CHARACTER` gains `badge`, `accessories`, `armorVariant` |
| `src/core/character-fields.js` (new) | Virtual field keys (`badge.symbol`, `acc.back`, …), `getIndex`, `withIndex`, `cloneLook`, `lookKey` |
| `src/core/character-normalize.js` (new) | `normalizeBadge`, `normalizeAccessories`, `migrateLegacyBadge` |
| `src/core/save-system.js` (modify) | `loadCharacter` uses the normalizers and migration |
| `src/systems/unlocks.js` (modify) | Virtual keys in `LOCKABLE`, id-based ownership, `campaignActs` rule, variant unlocks, `sanitizeLocked` |
| `src/systems/achievement-system.js`, `js/campaign-manager.js` (modify) | Track `campaignActsCleared` |
| `src/rendering/svg-art/insignia/symbols.js` (new) | Symbol painters in a -5..5 box (includes the 7 legacy icons moved from `agent-rig.js`) |
| `src/rendering/svg-art/insignia/frames.js` (new) | Frame outline and field paths in a -50..50 box |
| `src/rendering/svg-art/insignia/finishes.js` (new) | insignia / patch / holo / stencil renderers (no gradients, no ids) |
| `src/rendering/svg-art/insignia/compose.js` (new) | `renderBadge`, `resolveTreatment`, memo cache |
| `src/rendering/svg-art/accessories/*.js` (new) | One painter module per slot plus `index.js` registry |
| `src/rendering/svg-art/agent-rig.js` (modify) | Uses `renderBadge` per placement, `rigAnchors`, accessory layers, armour variant trim, realistic keep list |
| `src/rendering/svg-art/index.js`, `src/ui/portrait-modern.js` (modify) | Look hash via `lookKey` |
| `js/components/agent-showroom.js` (modify) | Field plumbing through `character-fields`, icon tab bar, Badge tab, Gear tab, variant toggle, presets |
| `src/ui/character-creator.js`, `src/systems/input-dispatch.js`, `src/systems/input-click-dispatch.js` (modify) | Legacy BADGE and GEAR tabs through `character-fields`, SVG previews |
| `src/ui/unlock-toast.js` (modify, if it formats ids) | New id kinds read correctly through `describeId` |
| `tests/unit/badges-data.test.js`, `tests/unit/accessories-data.test.js`, `tests/unit/character-fields.test.js`, `tests/unit/character-normalize.test.js`, `tests/unit/insignia.test.js`, `tests/unit/accessory-painters.test.js`, `tests/unit/agent-rig-badges.test.js` (new) | Unit coverage |
| `tests/unit/character-save.test.js`, `tests/unit/unlocks.test.js`, `tests/unit/gear.test.js` (modify) | Extended coverage |
| `tests/customization.spec.js` (new) | Browser journey, persistence, screenshots in three styles |

---

### Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
git switch -c feat/suit-customization
```

Expected: `Switched to a new branch 'feat/suit-customization'`.

---

### Task 1: Badge data tables

**Files:**
- Create: `src/data/badges.js`
- Test: `tests/unit/badges-data.test.js`

**Interfaces:**
- Produces:
  - `SYMBOLS: {id, name, set: "classic"|"faction"|"rank"|"act"|"earned", unlock?}[]`
  - `FRAMES: {id, name}[]`, `ENAMELS: {id, name, color}[]`, `METALS: {id, name, ramp: [hi, mid, lo, edge]}[]`
  - `FINISHES: {id, name, unlock?}[]` — ids `auto`, `insignia`, `stencil`, `patch`, `holo`
  - `PLACEMENTS: {id, name}[]` — ids `chest`, `shoulder`, `helmet`, `forearm`
  - `BADGE_PRESETS: {id, name, set, badge: {layers, finish}, unlock?}[]`
  - `DEFAULT_BADGE` (no placements, so a fresh agent has a plain chest like today)
  - `LEGACY_ICON_SYMBOL: Record<string, string>` (old icon → symbol id)
  - `byId(table, id)`, `indexOfId(table, id)`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/badges-data.test.js
import { describe, it, expect } from "vitest";
import {
  SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, BADGE_PRESETS,
  DEFAULT_BADGE, LEGACY_ICON_SYMBOL, byId, indexOfId,
} from "../../src/data/badges.js";
import { BADGES } from "../../src/data/cosmetics.js";

const ids = (t) => t.map((x) => x.id);
const unique = (t) => new Set(ids(t)).size === t.length;

describe("badge tables", () => {
  it("every table has unique ids", () => {
    for (const t of [SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, BADGE_PRESETS]) expect(unique(t)).toBe(true);
  });

  it("has the launch content counts", () => {
    const bySet = (s) => SYMBOLS.filter((x) => x.set === s).length;
    expect(bySet("classic")).toBe(7);
    expect(bySet("faction")).toBe(8);
    expect(bySet("rank")).toBe(6);
    expect(bySet("act")).toBe(3);
    expect(bySet("earned")).toBeGreaterThanOrEqual(6);
    expect(ids(FRAMES)).toEqual(["disc", "shield", "hex", "chevron", "tag", "cog"]);
    expect(ids(METALS)).toEqual(["brass", "steel", "blackened", "gold"]);
    expect(ids(FINISHES)).toEqual(["auto", "insignia", "stencil", "patch", "holo"]);
    expect(ids(PLACEMENTS)).toEqual(["chest", "shoulder", "helmet", "forearm"]);
    expect(ENAMELS.length).toBeGreaterThanOrEqual(12);
    expect(BADGE_PRESETS.length).toBeGreaterThanOrEqual(24);
  });

  it("classic symbols are free so existing badges keep working", () => {
    for (const s of SYMBOLS.filter((x) => x.set === "classic")) expect(s.unlock).toBeUndefined();
  });

  it("every old icon maps to a classic symbol", () => {
    for (const b of BADGES.filter((x) => x.icon)) {
      const sym = byId(SYMBOLS, LEGACY_ICON_SYMBOL[b.icon]);
      expect(sym?.set).toBe("classic");
    }
  });

  it("presets reference only real ids", () => {
    for (const p of BADGE_PRESETS) {
      expect(byId(FINISHES, p.badge.finish)).toBeTruthy();
      for (const l of p.badge.layers) {
        expect(byId(SYMBOLS, l.symbol)).toBeTruthy();
        expect(byId(FRAMES, l.frame)).toBeTruthy();
        expect(byId(ENAMELS, l.enamel)).toBeTruthy();
        expect(byId(METALS, l.metal)).toBeTruthy();
      }
    }
  });

  it("default badge is valid and hidden", () => {
    expect(DEFAULT_BADGE.placements).toEqual([]);
    expect(DEFAULT_BADGE.finish).toBe("auto");
    expect(DEFAULT_BADGE.layers).toHaveLength(1);
    expect(byId(SYMBOLS, DEFAULT_BADGE.layers[0].symbol)).toBeTruthy();
  });

  it("indexOfId returns -1 for unknown ids", () => {
    expect(indexOfId(FRAMES, "hex")).toBe(2);
    expect(indexOfId(FRAMES, "nope")).toBe(-1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/badges-data.test.js`
Expected: FAIL — `Failed to resolve import "../../src/data/badges.js"`.

- [ ] **Step 3: Write the data module**

```js
// src/data/badges.js
/**
 * Suit badges: a stack of layers (frame + symbol + colours) plus a finish and
 * the places it is worn. Everything is referenced by id so tables can grow or
 * reorder without breaking saves. Drawn by src/rendering/svg-art/insignia/.
 */

const achievement = (id, label) => ({ type: "achievement", id, label });
const levels = (count, label) => ({ type: "campaignLevels", count, label, unit: "levels" });
const acts = (count, label) => ({ type: "campaignActs", count, label, unit: "acts" });

export const SYMBOLS = [
  // Classic: the original seven, redrawn. Free.
  { id: "shield", name: "Temporal Shield", set: "classic" },
  { id: "skull", name: "Kill Specialist", set: "classic" },
  { id: "clock", name: "Chrono Division", set: "classic" },
  { id: "star", name: "Gold Star", set: "classic" },
  { id: "bolt", name: "Lightning Strike", set: "classic" },
  { id: "eye", name: "The Watcher", set: "classic" },
  { id: "rift", name: "Rift Walker", set: "classic" },
  // Factions. Free.
  { id: "corps", name: "Chrono Corps", set: "faction" },
  { id: "aegis", name: "Temporal Aegis", set: "faction" },
  { id: "walkers", name: "Rift Walkers", set: "faction" },
  { id: "deadsquad", name: "Dead Squad", set: "faction" },
  { id: "guard", name: "Clockwork Guard", set: "faction" },
  { id: "hunters", name: "Paradox Hunters", set: "faction" },
  { id: "crew", name: "Station Crew", set: "faction" },
  { id: "aria", name: "ARIA Liaison", set: "faction" },
  // Ranks, by campaign levels cleared.
  { id: "rank1", name: "Recruit", set: "rank" },
  { id: "rank2", name: "Operator", set: "rank", unlock: levels(2, "Clear 2 campaign levels") },
  { id: "rank3", name: "Sergeant", set: "rank", unlock: levels(4, "Clear 4 campaign levels") },
  { id: "rank4", name: "Lieutenant", set: "rank", unlock: levels(6, "Clear 6 campaign levels") },
  { id: "rank5", name: "Captain", set: "rank", unlock: levels(8, "Clear 8 campaign levels") },
  { id: "rank6", name: "Commander", set: "rank", unlock: achievement("campaignClear", "Finish the campaign") },
  // Act emblems.
  { id: "act1", name: "First Incursion", set: "act", unlock: acts(1, "Defeat the Paradox Lord in Act 1") },
  { id: "act2", name: "Second Incursion", set: "act", unlock: acts(2, "Defeat the Paradox Lord in Act 2") },
  { id: "act3", name: "Final Incursion", set: "act", unlock: acts(3, "Defeat the Paradox Lord in Act 3") },
  // Earned from achievements.
  { id: "lordslayer", name: "Lord Slayer", set: "earned", unlock: achievement("lordSlayer", "Earn Lord Slayer") },
  { id: "untouchable", name: "Untouchable", set: "earned", unlock: achievement("untouchable", "Earn Untouchable") },
  { id: "centurion", name: "Centurion", set: "earned", unlock: achievement("centurion", "Earn Centurion") },
  { id: "speeddemon", name: "Speed Demon", set: "earned", unlock: achievement("speedDemon", "Earn Speed Demon") },
  { id: "veteran", name: "Round Veteran", set: "earned", unlock: achievement("roundVeteran", "Earn Round Veteran") },
  { id: "firstblood", name: "First Blood", set: "earned", unlock: achievement("firstBlood", "Earn First Blood") },
  { id: "dronehunter", name: "Drone Hunter", set: "earned", unlock: achievement("droneHunter", "Earn Drone Hunter") },
  { id: "phantom", name: "Phantom Slayer", set: "earned", unlock: achievement("phantomSlayer", "Earn Phantom Slayer") },
  { id: "tamer", name: "Beast Tamer", set: "earned", unlock: achievement("beastTamer", "Earn Beast Tamer") },
  { id: "scoremaster", name: "Score Master", set: "earned", unlock: achievement("scoreMaster", "Earn Score Master") },
  { id: "graduate", name: "Academy Graduate", set: "earned", unlock: achievement("tutorialGrad", "Earn Academy Graduate") },
  { id: "survivor", name: "Round Survivor", set: "earned", unlock: achievement("roundSurvivor", "Earn Round Survivor") },
];

export const FRAMES = [
  { id: "disc", name: "Disc" },
  { id: "shield", name: "Shield" },
  { id: "hex", name: "Hex" },
  { id: "chevron", name: "Chevron" },
  { id: "tag", name: "Tag" },
  { id: "cog", name: "Cog" },
];

export const ENAMELS = [
  { id: "teal", name: "Chrono Teal", color: "#1f6f78" },
  { id: "navy", name: "Navy", color: "#1c2f5a" },
  { id: "crimson", name: "Crimson", color: "#7a1426" },
  { id: "oxblood", name: "Oxblood", color: "#4a1016" },
  { id: "forest", name: "Forest", color: "#1f4a2c" },
  { id: "olive", name: "Olive Drab", color: "#4a4f2a" },
  { id: "violet", name: "Rift Violet", color: "#44206e" },
  { id: "amber", name: "Amber", color: "#9a5a10" },
  { id: "ivory", name: "Ivory", color: "#d8d0bc" },
  { id: "slate", name: "Slate", color: "#3a4450" },
  { id: "black", name: "Black", color: "#16181c" },
  { id: "sky", name: "Sky", color: "#2f78b8" },
];

export const METALS = [
  { id: "brass", name: "Brass", ramp: ["#fff1b8", "#d9a441", "#7a5418", "#3e2808"] },
  { id: "steel", name: "Steel", ramp: ["#f2f6fa", "#a8b4c0", "#56606c", "#22282e"] },
  { id: "blackened", name: "Blackened", ramp: ["#7c8088", "#3a3d43", "#1c1e22", "#08090b"] },
  { id: "gold", name: "Gold", ramp: ["#fff6c8", "#f2c230", "#9a6a08", "#4a3004"] },
];

export const FINISHES = [
  { id: "auto", name: "Auto (match armour)" },
  { id: "insignia", name: "Insignia" },
  { id: "stencil", name: "Stencil", unlock: { type: "tutorial", label: "Graduate Chronos Academy (tutorial)" } },
  { id: "patch", name: "Field Patch", unlock: acts(1, "Defeat the Paradox Lord in Act 1") },
  { id: "holo", name: "Holo", unlock: achievement("campaignClear", "Finish the campaign") },
];

export const PLACEMENTS = [
  { id: "chest", name: "Chest" },
  { id: "shoulder", name: "Shoulder" },
  { id: "helmet", name: "Helmet" },
  { id: "forearm", name: "Forearm" },
];

/** One layer; Stage 2 (layer editor) uses x/y/scale/rot, Stage 1 leaves them at rest. */
export const layer = (symbol, frame = "disc", enamel = "teal", metal = "brass") =>
  ({ frame, symbol, enamel, metal, x: 0, y: 0, scale: 1, rot: 0 });

export const DEFAULT_BADGE = { layers: [layer("clock")], finish: "auto", placements: [] };

/** Old BADGES[].icon → symbol id (identity today, kept explicit for migration). */
export const LEGACY_ICON_SYMBOL = {
  shield: "shield", skull: "skull", clock: "clock", star: "star", bolt: "bolt", eye: "eye", rift: "rift",
};

const preset = (id, name, set, l, finish = "auto", unlock) => ({ id, name, set, badge: { layers: [l], finish }, ...(unlock ? { unlock } : {}) });

export const BADGE_PRESETS = [
  preset("p_corps", "Chrono Corps", "faction", layer("corps", "disc", "teal", "brass")),
  preset("p_aegis", "Temporal Aegis", "faction", layer("aegis", "shield", "navy", "steel")),
  preset("p_walkers", "Rift Walkers", "faction", layer("walkers", "hex", "violet", "brass")),
  preset("p_deadsquad", "Dead Squad", "faction", layer("deadsquad", "shield", "black", "blackened")),
  preset("p_guard", "Clockwork Guard", "faction", layer("guard", "cog", "oxblood", "brass")),
  preset("p_hunters", "Paradox Hunters", "faction", layer("hunters", "chevron", "crimson", "steel")),
  preset("p_crew", "Station Crew", "faction", layer("crew", "tag", "slate", "steel")),
  preset("p_aria", "ARIA Liaison", "faction", layer("aria", "disc", "sky", "steel")),
  preset("p_shield", "Temporal Shield", "classic", layer("shield", "disc", "navy", "brass")),
  preset("p_skull", "Kill Specialist", "classic", layer("skull", "hex", "black", "steel")),
  preset("p_clock", "Chrono Division", "classic", layer("clock", "disc", "teal", "brass")),
  preset("p_star", "Gold Star", "classic", layer("star", "shield", "navy", "gold")),
  preset("p_bolt", "Lightning Strike", "classic", layer("bolt", "chevron", "amber", "steel")),
  preset("p_eye", "The Watcher", "classic", layer("eye", "disc", "violet", "blackened")),
  preset("p_rift", "Rift Walker", "classic", layer("rift", "hex", "violet", "brass")),
  preset("p_rank1", "Recruit", "rank", layer("rank1", "tag", "olive", "brass")),
  preset("p_rank3", "Sergeant", "rank", layer("rank3", "tag", "olive", "brass"), "auto", levels(4, "Clear 4 campaign levels")),
  preset("p_rank5", "Captain", "rank", layer("rank5", "shield", "navy", "gold"), "auto", levels(8, "Clear 8 campaign levels")),
  preset("p_rank6", "Commander", "rank", layer("rank6", "shield", "crimson", "gold"), "insignia", achievement("campaignClear", "Finish the campaign")),
  preset("p_act1", "First Incursion", "act", layer("act1", "cog", "teal", "brass"), "auto", acts(1, "Defeat the Paradox Lord in Act 1")),
  preset("p_act2", "Second Incursion", "act", layer("act2", "cog", "oxblood", "steel"), "auto", acts(2, "Defeat the Paradox Lord in Act 2")),
  preset("p_act3", "Final Incursion", "act", layer("act3", "cog", "black", "gold"), "auto", acts(3, "Defeat the Paradox Lord in Act 3")),
  preset("p_lordslayer", "Lord Slayer", "earned", layer("lordslayer", "shield", "crimson", "gold"), "insignia", achievement("lordSlayer", "Earn Lord Slayer")),
  preset("p_untouchable", "Untouchable", "earned", layer("untouchable", "disc", "ivory", "steel"), "insignia", achievement("untouchable", "Earn Untouchable")),
  preset("p_centurion", "Centurion", "earned", layer("centurion", "hex", "oxblood", "brass"), "insignia", achievement("centurion", "Earn Centurion")),
  preset("p_speeddemon", "Speed Demon", "earned", layer("speeddemon", "chevron", "amber", "steel"), "insignia", achievement("speedDemon", "Earn Speed Demon")),
];

export const byId = (table, id) => table.find((x) => x.id === id);
export const indexOfId = (table, id) => table.findIndex((x) => x.id === id);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/badges-data.test.js`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/badges.js tests/unit/badges-data.test.js
git commit -m "feat(badges): add badge symbol, frame, colour and preset tables"
```

---

### Task 2: Accessory data tables

**Files:**
- Create: `src/data/accessories.js`
- Test: `tests/unit/accessories-data.test.js`

**Interfaces:**
- Produces:
  - `ACCESSORY_SLOTS: {id, name}[]` — ids `back`, `waist`, `helmet`, `arms`, `neck`, `legs`
  - `ACCESSORIES: Record<slotId, {id, name, desc, tier?, unlock?, bonuses?, perk?}[]>`; entry 0 of each slot is `{id: "none", name: "None"}`
  - `DEFAULT_ACCESSORIES: Record<slotId, "none">`
  - `accessoryItem(slot, id)` → item or the slot's `none`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/accessories-data.test.js
import { describe, it, expect } from "vitest";
import { ACCESSORY_SLOTS, ACCESSORIES, DEFAULT_ACCESSORIES, accessoryItem } from "../../src/data/accessories.js";

const APPLIED = new Set(["maxHealthAdd", "maxChronoEnergyAdd", "maxStaminaAdd", "dashCostAdd", "armorAdd", "moveSpeedAdd"]);
const CAP = { maxHealthAdd: 10, maxStaminaAdd: 10, maxChronoEnergyAdd: 10, armorAdd: 5, moveSpeedAdd: 0.05 };

describe("accessory tables", () => {
  it("has the six slots in order", () => {
    expect(ACCESSORY_SLOTS.map((s) => s.id)).toEqual(["back", "waist", "helmet", "arms", "neck", "legs"]);
  });

  it("every slot starts with none and has unique ids", () => {
    for (const { id } of ACCESSORY_SLOTS) {
      const items = ACCESSORIES[id];
      expect(items[0].id).toBe("none");
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    }
  });

  it("launch counts: 4 each for back/waist/helmet, 3 each for arms/neck/legs", () => {
    const n = (s) => ACCESSORIES[s].length - 1;
    expect([n("back"), n("waist"), n("helmet")]).toEqual([4, 4, 4]);
    expect([n("arms"), n("neck"), n("legs")]).toEqual([3, 3, 3]);
  });

  it("perks use only applied stats, within the caps, and carry a perk line", () => {
    for (const { id } of ACCESSORY_SLOTS) {
      for (const item of ACCESSORIES[id]) {
        if (!item.bonuses) continue;
        expect(item.perk).toBeTruthy();
        for (const [stat, v] of Object.entries(item.bonuses)) {
          expect(APPLIED.has(stat)).toBe(true);
          if (stat === "dashCostAdd") expect(v).toBeGreaterThanOrEqual(-3);
          else expect(v).toBeLessThanOrEqual(CAP[stat]);
        }
      }
    }
  });

  it("about a third of real items are cosmetic only", () => {
    const real = ACCESSORY_SLOTS.flatMap(({ id }) => ACCESSORIES[id].slice(1));
    const cosmetic = real.filter((i) => !i.bonuses).length;
    expect(cosmetic).toBeGreaterThanOrEqual(Math.floor(real.length / 4));
    expect(cosmetic).toBeLessThanOrEqual(Math.ceil(real.length / 2));
  });

  it("defaults and lookup fall back to none", () => {
    expect(DEFAULT_ACCESSORIES).toEqual({ back: "none", waist: "none", helmet: "none", arms: "none", neck: "none", legs: "none" });
    expect(accessoryItem("back", "backpack").name).toBe("Tactical Backpack");
    expect(accessoryItem("back", "nope").id).toBe("none");
    expect(accessoryItem("nope", "backpack")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/accessories-data.test.js`
Expected: FAIL — cannot resolve `src/data/accessories.js`.

- [ ] **Step 3: Write the data module**

```js
// src/data/accessories.js
/**
 * Accessory slots worn over the armour. Items are referenced by id; entry 0 of
 * every slot is "none". Perks use the same bonus vocabulary as armour and are
 * summed by gearBonuses() (src/data/cosmetics.js). Painted by
 * src/rendering/svg-art/accessories/.
 */

const TIER2 = { type: "tutorial", label: "Graduate Chronos Academy (tutorial)" };
const TIER3 = {
  type: "anyOf",
  label: "Clear Act 1 or survive arena round 5",
  rules: [
    { type: "campaignLevels", count: 3, label: "Clear Act 1", unit: "levels" },
    { type: "arenaRound", count: 5, label: "Survive arena round 5", unit: "rounds" },
  ],
};
const NONE = { id: "none", name: "None", desc: "Nothing fitted" };

export const ACCESSORY_SLOTS = [
  { id: "back", name: "Back" },
  { id: "waist", name: "Waist" },
  { id: "helmet", name: "Helmet" },
  { id: "arms", name: "Arms" },
  { id: "neck", name: "Neck" },
  { id: "legs", name: "Legs" },
];

export const ACCESSORIES = {
  back: [
    NONE,
    { id: "backpack", name: "Tactical Backpack", desc: "Boxy pack with a bedroll", tier: 1, bonuses: { maxStaminaAdd: 8 }, perk: "+8 stamina" },
    { id: "antenna", name: "Rift Antenna", desc: "Field radio mast", tier: 2, unlock: TIER2, bonuses: { maxChronoEnergyAdd: 8 }, perk: "+8 chrono energy" },
    { id: "blade", name: "Sheathed Blade", desc: "Chrono-steel sword across the back", tier: 3, unlock: TIER3 },
    { id: "cloak", name: "Long Cloak", desc: "Replaces the armour's cape", tier: 1 },
  ],
  waist: [
    NONE,
    { id: "belt", name: "Utility Belt", desc: "Pouches all round", tier: 1, bonuses: { maxHealthAdd: 5 }, perk: "+5 max health" },
    { id: "holster", name: "Drop Holster", desc: "Sidearm on the thigh strap", tier: 2, unlock: TIER2, bonuses: { moveSpeedAdd: 0.03 }, perk: "+3% move speed" },
    { id: "grenades", name: "Grenade Rig", desc: "Canisters on a webbing belt", tier: 3, unlock: TIER3, bonuses: { armorAdd: 3 }, perk: "+3 armour" },
    { id: "canister", name: "Chrono Canister", desc: "Glowing energy cell at the hip", tier: 2, unlock: TIER2 },
  ],
  helmet: [
    NONE,
    { id: "nvg", name: "Night-Vision Mount", desc: "Flip-up quad tubes", tier: 2, unlock: TIER2 },
    { id: "whip", name: "Whip Antenna", desc: "Tall flexible aerial", tier: 1, bonuses: { maxChronoEnergyAdd: 5 }, perk: "+5 chrono energy" },
    { id: "lamp", name: "Head Lamp", desc: "Side-mounted torch", tier: 1 },
    { id: "plume", name: "Plume", desc: "Parade crest", tier: 3, unlock: TIER3 },
  ],
  arms: [
    NONE,
    { id: "gauntlets", name: "Gauntlets", desc: "Heavy forearm guards", tier: 2, unlock: TIER2, bonuses: { armorAdd: 2 }, perk: "+2 armour" },
    { id: "screen", name: "Forearm Screen", desc: "Tactical wrist display", tier: 1, bonuses: { dashCostAdd: -2 }, perk: "-2 dash cost" },
    { id: "launcher", name: "Wrist Launcher", desc: "Compact dart launcher", tier: 3, unlock: TIER3 },
  ],
  neck: [
    NONE,
    { id: "scarf", name: "Scarf", desc: "Wrapped field scarf", tier: 1 },
    { id: "tags", name: "Dog Tags", desc: "Chain and two tags", tier: 1, bonuses: { maxHealthAdd: 3 }, perk: "+3 max health" },
    { id: "bandolier", name: "Bandolier", desc: "Ammo belt across the chest", tier: 2, unlock: TIER2, bonuses: { maxStaminaAdd: 5 }, perk: "+5 stamina" },
  ],
  legs: [
    NONE,
    { id: "kneepads", name: "Knee Pads", desc: "Hard-shell pads", tier: 1, bonuses: { dashCostAdd: -1 }, perk: "-1 dash cost" },
    { id: "thigh", name: "Thigh Holster", desc: "Magazine pouch on the thigh", tier: 2, unlock: TIER2, bonuses: { moveSpeedAdd: 0.02 }, perk: "+2% move speed" },
    { id: "shins", name: "Shin Guards", desc: "Plated greaves", tier: 3, unlock: TIER3, bonuses: { armorAdd: 2 }, perk: "+2 armour" },
  ],
};

export const DEFAULT_ACCESSORIES = Object.fromEntries(ACCESSORY_SLOTS.map((s) => [s.id, "none"]));

/** Item for a slot by id; the slot's "none" for unknown ids; null for an unknown slot. */
export function accessoryItem(slot, id) {
  const items = ACCESSORIES[slot];
  if (!items) return null;
  return items.find((i) => i.id === id) || items[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/accessories-data.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/accessories.js tests/unit/accessories-data.test.js
git commit -m "feat(gear): add accessory slot and item tables"
```

---

### Task 3: Armour treatments, variants, gear bonuses, character defaults

**Files:**
- Modify: `src/data/cosmetics.js` (`ARMOR_STYLES` entries, `DEFAULT_CHARACTER`, `gearBonuses`)
- Modify: `tests/unit/gear.test.js`

**Interfaces:**
- Consumes: `DEFAULT_BADGE` (Task 1), `ACCESSORY_SLOTS`, `accessoryItem`, `DEFAULT_ACCESSORIES` (Task 2)
- Produces:
  - `ARMOR_STYLES[i].badgeTreatment: {finish, metal}` and `ARMOR_STYLES[i].variant: {id, name, desc, trim, wear, badgeTreatment, unlock}`
  - `DEFAULT_CHARACTER.badge`, `.accessories`, `.armorVariant` (0)
  - `gearBonuses(character)` also sums `ACCESSORIES[slot]` items named by `character.accessories`

- [ ] **Step 1: Write the failing tests** (append to `tests/unit/gear.test.js`)

```js
import { ACCESSORY_SLOTS } from "../../src/data/accessories.js";
import { DEFAULT_BADGE } from "../../src/data/badges.js";

describe("armour treatments and variants", () => {
  it("every armour has a badge treatment and one earned variant", () => {
    for (const a of ARMOR_STYLES) {
      expect(["insignia", "stencil", "patch", "holo"]).toContain(a.badgeTreatment.finish);
      expect(["brass", "steel", "blackened", "gold"]).toContain(a.badgeTreatment.metal);
      expect(a.variant.id).toMatch(/^[a-z_]+$/);
      expect(a.variant.unlock).toBeTruthy();
      expect(a.variant.trim).toMatch(/^#[0-9a-f]{6}$/i);
      expect(a.variant.wear).toBeGreaterThanOrEqual(0);
      expect(a.variant.wear).toBeLessThanOrEqual(1);
    }
    expect(new Set(ARMOR_STYLES.map((a) => a.variant.id)).size).toBe(ARMOR_STYLES.length);
  });

  it("default character carries the new fields", () => {
    expect(DEFAULT_CHARACTER.badge).toEqual(DEFAULT_BADGE);
    expect(Object.keys(DEFAULT_CHARACTER.accessories)).toEqual(ACCESSORY_SLOTS.map((s) => s.id));
    expect(DEFAULT_CHARACTER.armorVariant).toBe(0);
  });
});

describe("gearBonuses with accessories", () => {
  it("adds accessory perks to armour perks", () => {
    const ch = { ...DEFAULT_CHARACTER, accessories: { ...DEFAULT_CHARACTER.accessories, back: "backpack", waist: "belt" } };
    const base = gearBonuses(DEFAULT_CHARACTER);
    const g = gearBonuses(ch);
    expect(g.maxStaminaAdd || 0).toBe((base.maxStaminaAdd || 0) + 8);
    expect(g.maxHealthAdd || 0).toBe((base.maxHealthAdd || 0) + 5);
  });

  it("ignores unknown accessory ids and a missing accessories object", () => {
    const bad = { ...DEFAULT_CHARACTER, accessories: { back: "nope" } };
    expect(gearBonuses(bad)).toEqual(gearBonuses(DEFAULT_CHARACTER));
    const none = { ...DEFAULT_CHARACTER };
    delete none.accessories;
    expect(() => gearBonuses(none)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/gear.test.js`
Expected: FAIL — `a.badgeTreatment` is undefined; `DEFAULT_CHARACTER.badge` is undefined.

- [ ] **Step 3: Add treatments and variants to every armour**

In `src/data/cosmetics.js`, add these two properties to each `ARMOR_STYLES` entry (match by `id`; keep all existing properties). The unlock objects reuse the existing rule types.

| armour id | `badgeTreatment` | `variant` |
|---|---|---|
| `standard` | `{ finish: "insignia", metal: "brass" }` | `{ id: "standard_parade", name: "Parade Dress", desc: "Polished for the medal line", trim: "#d9a441", wear: 0, badgeTreatment: { finish: "insignia", metal: "gold" }, unlock: { type: "achievement", id: "tutorialGrad", label: "Earn Academy Graduate" } }` |
| `recon` | `{ finish: "stencil", metal: "steel" }` | `{ id: "recon_ghostline", name: "Ghostline", desc: "Taped seams, scuffed paint", trim: "#9fb8c8", wear: 0.5, badgeTreatment: { finish: "stencil", metal: "blackened" }, unlock: { type: "dashes", count: 500, label: "Dash 500 times", unit: "dashes" } }` |
| `stealth` (Ghost) | `{ finish: "insignia", metal: "blackened" }` | `{ id: "ghost_nightfall", name: "Nightfall", desc: "Light-eating finish", trim: "#3a4a66", wear: 0.1, badgeTreatment: { finish: "insignia", metal: "blackened" }, unlock: { type: "achievement", id: "untouchable", label: "Earn Untouchable" } }` |
| `heavy` (Juggernaut) | `{ finish: "insignia", metal: "steel" }` | `{ id: "juggernaut_siegebreaker", name: "Siegebreaker", desc: "Battle-scarred and riveted", trim: "#b0482c", wear: 0.8, badgeTreatment: { finish: "stencil", metal: "steel" }, unlock: { type: "achievement", id: "centurion", label: "Earn Centurion" } }` |
| `engineer` | `{ finish: "stencil", metal: "steel" }` | `{ id: "engineer_foreman", name: "Foreman", desc: "Hazard stripes and tool scars", trim: "#e0a030", wear: 0.6, badgeTreatment: { finish: "stencil", metal: "brass" }, unlock: { type: "achievement", id: "droneHunter", label: "Earn Drone Hunter" } }` |
| `howitzer` | `{ finish: "insignia", metal: "steel" }` | `{ id: "howitzer_redline", name: "Redline", desc: "Heat-blued barrels and red trim", trim: "#c8342a", wear: 0.5, badgeTreatment: { finish: "insignia", metal: "blackened" }, unlock: { type: "achievement", id: "scoreMaster", label: "Earn Score Master" } }` |
| `trencher` | `{ finish: "patch", metal: "brass" }` | `{ id: "trencher_mudlark", name: "Mudlark", desc: "Caked in trench mud", trim: "#6a5a3a", wear: 1, badgeTreatment: { finish: "patch", metal: "blackened" }, unlock: { type: "achievement", id: "roundVeteran", label: "Earn Round Veteran" } }` |
| `reliquary` | `{ finish: "insignia", metal: "gold" }` | `{ id: "reliquary_gilded", name: "Gilded", desc: "Gold leaf over every edge", trim: "#f2c230", wear: 0, badgeTreatment: { finish: "insignia", metal: "gold" }, unlock: { type: "achievement", id: "lordSlayer", label: "Earn Lord Slayer" } }` |
| `pathfinder` | `{ finish: "insignia", metal: "brass" }` | `{ id: "pathfinder_frontier", name: "Frontier", desc: "Sun-bleached and patched", trim: "#c8b98a", wear: 0.7, badgeTreatment: { finish: "patch", metal: "brass" }, unlock: { type: "achievement", id: "speedDemon", label: "Earn Speed Demon" } }` |

Before editing, run `grep -n 'id: "' src/data/cosmetics.js | sed -n 1,40p` and confirm the nine armour ids. If an id differs from the table (e.g. Juggernaut is not `heavy`), use the real id; the treatment and variant values stay the same per armour name.

- [ ] **Step 4: Extend `DEFAULT_CHARACTER` and `gearBonuses`**

At the top of `src/data/cosmetics.js`:

```js
import { DEFAULT_BADGE } from "./badges.js";
import { ACCESSORY_SLOTS, DEFAULT_ACCESSORIES, accessoryItem } from "./accessories.js";
```

Add to the end of `DEFAULT_CHARACTER`:

```js
  badge: DEFAULT_BADGE,
  accessories: DEFAULT_ACCESSORIES,
  armorVariant: 0,
```

Replace the body of `gearBonuses` with:

```js
export function gearBonuses(character) {
  const out = {};
  if (!character) return out;
  const add = (bonuses) => {
    if (!bonuses) return;
    for (const [stat, value] of Object.entries(bonuses)) out[stat] = (out[stat] || 0) + value;
  };
  for (const [key, table] of GEAR_SLOTS) add(table()[character[key] || 0]?.bonuses);
  const acc = character.accessories || {};
  for (const { id } of ACCESSORY_SLOTS) add(accessoryItem(id, acc[id])?.bonuses);
  return out;
}
```

Anything that copies `DEFAULT_CHARACTER` with `{ ...DEFAULT_CHARACTER }` now shares the `badge` and `accessories` objects. Task 5's `cloneLook` handles that for the editors; `loadCharacter` (Task 4) always writes fresh objects.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/gear.test.js tests/unit/character-save.test.js`
Expected: `gear.test.js` PASS. `character-save.test.js` may fail on the new object fields — that is fixed in Task 4; note the failures and continue.

- [ ] **Step 6: Commit**

```bash
git add src/data/cosmetics.js tests/unit/gear.test.js
git commit -m "feat(gear): add armour badge treatments, unique variants and accessory perks"
```

---

### Task 4: Normalizers, migration and save loading

**Files:**
- Create: `src/core/character-normalize.js`
- Modify: `src/core/save-system.js:102-130` (`loadCharacter`)
- Test: `tests/unit/character-normalize.test.js`, `tests/unit/character-save.test.js`

**Interfaces:**
- Consumes: Task 1 tables, Task 2 tables, `ARMOR_STYLES`, `SHOULDER_STYLES`, `BADGES`
- Produces:
  - `normalizeBadge(raw) → badge` (always a fresh, valid object)
  - `normalizeAccessories(raw) → accessories` (fresh, every slot present)
  - `migrateLegacyBadge(badgeIndex, shoulderIndex) → badge`

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/character-normalize.test.js
import { describe, it, expect } from "vitest";
import { normalizeBadge, normalizeAccessories, migrateLegacyBadge } from "../../src/core/character-normalize.js";
import { DEFAULT_BADGE } from "../../src/data/badges.js";
import { BADGES, SHOULDER_STYLES } from "../../src/data/cosmetics.js";

const sh = (id) => SHOULDER_STYLES.findIndex((s) => s.id === id);

describe("normalizeBadge", () => {
  it("returns a fresh default for junk", () => {
    for (const junk of [null, undefined, 3, "x", [], { layers: "no" }]) {
      const b = normalizeBadge(junk);
      expect(b).toEqual(DEFAULT_BADGE);
      expect(b).not.toBe(DEFAULT_BADGE);
      expect(b.layers[0]).not.toBe(DEFAULT_BADGE.layers[0]);
    }
  });

  it("replaces unknown ids per field and keeps valid ones", () => {
    const b = normalizeBadge({ layers: [{ frame: "hex", symbol: "nope", enamel: "crimson", metal: "tin" }], finish: "glitter", placements: ["chest", "knee", "chest"] });
    expect(b.layers[0]).toMatchObject({ frame: "hex", symbol: "clock", enamel: "crimson", metal: "brass" });
    expect(b.finish).toBe("auto");
    expect(b.placements).toEqual(["chest"]);
  });

  it("clamps layer numbers and keeps at most 8 layers", () => {
    const l = { frame: "disc", symbol: "star", enamel: "teal", metal: "gold", x: 999, y: -999, scale: 40, rot: 725 };
    const b = normalizeBadge({ layers: Array(12).fill(l), finish: "insignia", placements: [] });
    expect(b.layers).toHaveLength(8);
    expect(b.layers[0]).toMatchObject({ x: 40, y: -40, scale: 2, rot: 5 });
  });
});

describe("normalizeAccessories", () => {
  it("fills every slot and drops unknown ids and slots", () => {
    expect(normalizeAccessories({ back: "backpack", waist: "nope", tail: "x" })).toEqual({
      back: "backpack", waist: "none", helmet: "none", arms: "none", neck: "none", legs: "none",
    });
    expect(normalizeAccessories(null).back).toBe("none");
  });
});

describe("migrateLegacyBadge", () => {
  it("None becomes a hidden badge", () => {
    expect(migrateLegacyBadge(0, 0).placements).toEqual([]);
  });

  it("every old icon becomes its symbol on a brass disc on the chest", () => {
    BADGES.forEach((old, i) => {
      if (!old.icon) return;
      const b = migrateLegacyBadge(i, sh("pads"));
      expect(b.layers[0]).toMatchObject({ symbol: old.icon, frame: "disc", metal: "brass" });
      expect(b.finish).toBe("insignia");
      expect(b.placements).toEqual(["chest"]);
    });
  });

  it("keeps the shoulder copy for pauldrons and armored shoulders", () => {
    expect(migrateLegacyBadge(3, sh("pauldrons")).placements).toEqual(["chest", "shoulder"]);
    expect(migrateLegacyBadge(3, sh("armored")).placements).toEqual(["chest", "shoulder"]);
  });

  it("out-of-range index is treated as None", () => {
    expect(migrateLegacyBadge(99, 0).placements).toEqual([]);
  });
});
```

Append to `tests/unit/character-save.test.js`:

```js
describe("badge and accessory persistence", () => {
  it("migrates a pre-badge-object save", () => {
    store.cc_character = JSON.stringify({ ...DEFAULT_CHARACTER, badge: undefined, accessories: undefined, badgeIndex: 5 });
    const ch = structuredClone(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.badge.layers[0].symbol).toBe(BADGES[5].icon);
    expect(ch.badge.placements).toContain("chest");
    expect(ch.accessories.back).toBe("none");
  });

  it("round-trips a full custom badge and accessories", () => {
    const ch = structuredClone(DEFAULT_CHARACTER);
    ch.badge = { layers: [{ frame: "cog", symbol: "guard", enamel: "oxblood", metal: "gold", x: 0, y: 0, scale: 1, rot: 0 }], finish: "patch", placements: ["chest", "helmet"] };
    ch.accessories = { ...ch.accessories, back: "cloak", helmet: "plume" };
    ch.armorVariant = 1;
    saveCharacter(ch);
    const loaded = structuredClone(DEFAULT_CHARACTER);
    loadCharacter(loaded);
    expect(loaded.badge).toEqual(ch.badge);
    expect(loaded.accessories).toEqual(ch.accessories);
    expect(loaded.armorVariant).toBe(1);
  });

  it("a saved badge object wins over a stale badgeIndex", () => {
    const badge = { layers: [{ frame: "hex", symbol: "rift", enamel: "violet", metal: "steel", x: 0, y: 0, scale: 1, rot: 0 }], finish: "insignia", placements: ["forearm"] };
    store.cc_character = JSON.stringify({ ...DEFAULT_CHARACTER, badgeIndex: 2, badge });
    const ch = structuredClone(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.badge).toEqual(badge);
  });

  it("clamps armorVariant to 0..1", () => {
    store.cc_character = JSON.stringify({ ...DEFAULT_CHARACTER, armorVariant: 7 });
    const ch = structuredClone(DEFAULT_CHARACTER);
    loadCharacter(ch);
    expect(ch.armorVariant).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/character-normalize.test.js tests/unit/character-save.test.js`
Expected: FAIL — module `character-normalize.js` not found; persistence tests fail.

- [ ] **Step 3: Write the normalizers**

```js
// src/core/character-normalize.js
/**
 * Validation for the object-valued character fields. Every function returns a
 * fresh object, so callers never share state with DEFAULT_CHARACTER.
 */
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, DEFAULT_BADGE, LEGACY_ICON_SYMBOL, byId } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES } from "../data/accessories.js";
import { BADGES, SHOULDER_STYLES } from "../data/cosmetics.js";

const MAX_LAYERS = 8;
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const idIn = (table, id, fallback) => (typeof id === "string" && byId(table, id) ? id : fallback);
const num = (v, lo, hi, dflt) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt);

function normalizeLayer(raw) {
  const d = DEFAULT_BADGE.layers[0];
  const l = isObj(raw) ? raw : {};
  return {
    frame: idIn(FRAMES, l.frame, d.frame),
    symbol: idIn(SYMBOLS, l.symbol, d.symbol),
    enamel: idIn(ENAMELS, l.enamel, d.enamel),
    metal: idIn(METALS, l.metal, d.metal),
    x: num(l.x, -40, 40, 0),
    y: num(l.y, -40, 40, 0),
    scale: num(l.scale, 0.2, 2, 1),
    rot: ((num(l.rot, -3600, 3600, 0) % 360) + 360) % 360,
  };
}

export function normalizeBadge(raw) {
  if (!isObj(raw) || !Array.isArray(raw.layers) || raw.layers.length === 0) return structuredClone(DEFAULT_BADGE);
  const placements = Array.isArray(raw.placements)
    ? [...new Set(raw.placements.filter((p) => typeof p === "string" && byId(PLACEMENTS, p)))]
    : [];
  return {
    layers: raw.layers.slice(0, MAX_LAYERS).map(normalizeLayer),
    finish: idIn(FINISHES, raw.finish, "auto"),
    placements,
  };
}

export function normalizeAccessories(raw) {
  const src = isObj(raw) ? raw : {};
  const out = {};
  for (const { id } of ACCESSORY_SLOTS) {
    const v = src[id];
    out[id] = typeof v === "string" && ACCESSORIES[id].some((i) => i.id === v) ? v : "none";
  }
  return out;
}

export function migrateLegacyBadge(badgeIndex, shoulderIndex) {
  const icon = BADGES[badgeIndex]?.icon;
  const symbol = icon && LEGACY_ICON_SYMBOL[icon];
  if (!symbol) return structuredClone(DEFAULT_BADGE);
  const sh = SHOULDER_STYLES[shoulderIndex]?.id;
  return {
    layers: [{ frame: "disc", symbol, enamel: "black", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }],
    finish: "insignia",
    placements: sh === "pauldrons" || sh === "armored" ? ["chest", "shoulder"] : ["chest"],
  };
}
```

- [ ] **Step 4: Use them in `loadCharacter`**

In `src/core/save-system.js`, import:

```js
import { normalizeBadge, normalizeAccessories, migrateLegacyBadge } from "./character-normalize.js";
```

In `loadCharacter`, change the loop so object fields are skipped by the generic type check, then handle them after the loop:

```js
    const OBJECT_FIELDS = new Set(["badge", "accessories"]);
    for (const key of Object.keys(DEFAULT_CHARACTER)) {
      if (OBJECT_FIELDS.has(key)) continue;
      if (Object.prototype.hasOwnProperty.call(saved, key)) {
        let val = saved[key];
        if (typeof val !== typeof DEFAULT_CHARACTER[key]) continue;
        if (key in maxIndices) val = Math.max(0, Math.min(val, maxIndices[key]));
        character[key] = val;
      }
    }
    character.badge = saved.badge
      ? normalizeBadge(saved.badge)
      : migrateLegacyBadge(Number(saved.badgeIndex) || 0, Number(saved.shoulderIndex) || 0);
    character.accessories = normalizeAccessories(saved.accessories);
```

Add `armorVariant: 1` to `maxIndices`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/character-normalize.test.js tests/unit/character-save.test.js`
Expected: PASS. If an existing test in `character-save.test.js` iterates `Object.keys(DEFAULT_CHARACTER)` and assumes numbers, restrict it to `Object.keys(OPTION_LISTS)`.

- [ ] **Step 6: Commit**

```bash
git add src/core/character-normalize.js src/core/save-system.js tests/unit/character-normalize.test.js tests/unit/character-save.test.js
git commit -m "feat(save): persist badge stacks and accessories with legacy migration"
```

---

### Task 5: Field accessors for index-based editors

**Files:**
- Create: `src/core/character-fields.js`
- Test: `tests/unit/character-fields.test.js`

**Interfaces:**
- Consumes: Task 1–4
- Produces:
  - `FIELD_TABLES: Record<key, table>` for virtual keys `badge.preset`, `badge.symbol`, `badge.frame`, `badge.enamel`, `badge.metal`, `badge.finish`, `acc.<slot>` (six)
  - `isVirtualKey(key) → boolean`
  - `tableFor(key) → table | undefined` (virtual or flat keys routed by caller)
  - `getIndex(ch, key) → number` (flat keys return `ch[key]`; `badge.preset` returns the matching preset index or -1)
  - `withIndex(ch, key, idx) → changes` object to `Object.assign` onto the character (fresh nested objects; never mutates `ch`)
  - `togglePlacement(ch, placementId) → changes`
  - `cloneLook(ch) → object` (deep copy of `badge`, `accessories`; shallow copy of the rest)
  - `lookKey(ch) → string` (every field that changes the drawn agent)

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/character-fields.test.js
import { describe, it, expect } from "vitest";
import { FIELD_TABLES, isVirtualKey, getIndex, withIndex, togglePlacement, cloneLook, lookKey } from "../../src/core/character-fields.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { SYMBOLS, FRAMES, BADGE_PRESETS, indexOfId } from "../../src/data/badges.js";
import { ACCESSORIES } from "../../src/data/accessories.js";

const fresh = () => cloneLook(DEFAULT_CHARACTER);

describe("character fields", () => {
  it("knows its virtual keys", () => {
    expect(isVirtualKey("badge.symbol")).toBe(true);
    expect(isVirtualKey("acc.back")).toBe(true);
    expect(isVirtualKey("armorIndex")).toBe(false);
    expect(FIELD_TABLES["acc.back"]).toBe(ACCESSORIES.back);
  });

  it("getIndex reads flat and nested fields", () => {
    const ch = fresh();
    ch.armorIndex = 3;
    ch.accessories.back = "cloak";
    expect(getIndex(ch, "armorIndex")).toBe(3);
    expect(getIndex(ch, "badge.symbol")).toBe(indexOfId(SYMBOLS, "clock"));
    expect(getIndex(ch, "acc.back")).toBe(indexOfId(ACCESSORIES.back, "cloak"));
  });

  it("withIndex returns fresh objects and does not mutate", () => {
    const ch = fresh();
    const before = JSON.stringify(ch);
    const changes = withIndex(ch, "badge.frame", indexOfId(FRAMES, "hex"));
    expect(JSON.stringify(ch)).toBe(before);
    expect(changes.badge).not.toBe(ch.badge);
    expect(changes.badge.layers[0].frame).toBe("hex");
  });

  it("withIndex on badge.symbol adds chest when placements are empty", () => {
    const ch = fresh();
    expect(ch.badge.placements).toEqual([]);
    const changes = withIndex(ch, "badge.symbol", indexOfId(SYMBOLS, "star"));
    expect(changes.badge.placements).toEqual(["chest"]);
  });

  it("badge.preset loads the preset stack and is found again by getIndex", () => {
    const ch = fresh();
    const i = indexOfId(BADGE_PRESETS, "p_guard");
    Object.assign(ch, withIndex(ch, "badge.preset", i));
    expect(ch.badge.layers[0].symbol).toBe("guard");
    expect(ch.badge.placements).toEqual(["chest"]);
    expect(getIndex(ch, "badge.preset")).toBe(i);
    Object.assign(ch, withIndex(ch, "badge.frame", indexOfId(FRAMES, "tag")));
    expect(getIndex(ch, "badge.preset")).toBe(-1);
  });

  it("withIndex on a flat key is a plain assignment", () => {
    expect(withIndex(fresh(), "armorIndex", 2)).toEqual({ armorIndex: 2 });
  });

  it("changing armour resets the variant to standard", () => {
    const ch = fresh();
    ch.armorVariant = 1;
    expect(withIndex(ch, "armorIndex", 2)).toEqual({ armorIndex: 2, armorVariant: 0 });
  });

  it("togglePlacement adds and removes", () => {
    const ch = fresh();
    Object.assign(ch, togglePlacement(ch, "helmet"));
    expect(ch.badge.placements).toEqual(["helmet"]);
    Object.assign(ch, togglePlacement(ch, "helmet"));
    expect(ch.badge.placements).toEqual([]);
  });

  it("cloneLook is deep for nested fields", () => {
    const a = fresh();
    const b = cloneLook(a);
    b.accessories.back = "cloak";
    b.badge.layers[0].symbol = "star";
    expect(a.accessories.back).toBe("none");
    expect(a.badge.layers[0].symbol).toBe("clock");
  });

  it("lookKey changes with every drawn field and ignores name and voice", () => {
    const a = fresh();
    const k = lookKey(a);
    expect(lookKey({ ...cloneLook(a), name: "Zed", voiceIndex: 3 })).toBe(k);
    for (const mutate of [
      (c) => { c.colorIndex = 1; },
      (c) => { c.armorVariant = 1; },
      (c) => { c.accessories.neck = "scarf"; },
      (c) => { c.badge.placements = ["chest"]; },
      (c) => { c.badge.layers[0].enamel = "crimson"; },
      (c) => { c.badge.finish = "holo"; },
    ]) {
      const c = cloneLook(a);
      mutate(c);
      expect(lookKey(c)).not.toBe(k);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/character-fields.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```js
// src/core/character-fields.js
/**
 * Index-shaped access to every character field, so the showroom and the
 * Legacy creator can keep treating each option list as "key + index" while
 * the record stores nested ids (badge stack, accessories).
 *
 * Virtual keys: badge.preset, badge.symbol, badge.frame, badge.enamel,
 * badge.metal, badge.finish, acc.<slot>. Everything else is a flat index key.
 */
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, BADGE_PRESETS, indexOfId } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES } from "../data/accessories.js";

const LAYER_FIELD = { "badge.symbol": ["symbol", SYMBOLS], "badge.frame": ["frame", FRAMES], "badge.enamel": ["enamel", ENAMELS], "badge.metal": ["metal", METALS] };

export const FIELD_TABLES = {
  "badge.preset": BADGE_PRESETS,
  "badge.symbol": SYMBOLS,
  "badge.frame": FRAMES,
  "badge.enamel": ENAMELS,
  "badge.metal": METALS,
  "badge.finish": FINISHES,
  ...Object.fromEntries(ACCESSORY_SLOTS.map(({ id }) => [`acc.${id}`, ACCESSORIES[id]])),
};

export const isVirtualKey = (key) => key in FIELD_TABLES;
export const tableFor = (key) => FIELD_TABLES[key];

const sameLayer = (a, b) => a.frame === b.frame && a.symbol === b.symbol && a.enamel === b.enamel && a.metal === b.metal;

export function getIndex(ch, key) {
  const badge = ch.badge;
  if (key === "badge.preset") {
    if (!badge?.placements?.length || badge.layers.length !== 1) return -1;
    return BADGE_PRESETS.findIndex((p) => p.badge.finish === badge.finish && sameLayer(p.badge.layers[0], badge.layers[0]));
  }
  if (key in LAYER_FIELD) {
    const [field, table] = LAYER_FIELD[key];
    return Math.max(0, indexOfId(table, badge?.layers?.[0]?.[field]));
  }
  if (key === "badge.finish") return Math.max(0, indexOfId(FINISHES, badge?.finish));
  if (key.startsWith("acc.")) {
    const slot = key.slice(4);
    return Math.max(0, indexOfId(ACCESSORIES[slot] || [], ch.accessories?.[slot]));
  }
  return ch[key] | 0;
}

const shown = (placements) => (placements.length ? [...placements] : ["chest"]);

export function withIndex(ch, key, idx) {
  const badge = ch.badge;
  if (key === "badge.preset") {
    const p = BADGE_PRESETS[idx];
    return { badge: { layers: structuredClone(p.badge.layers), finish: p.badge.finish, placements: shown(badge.placements) } };
  }
  if (key in LAYER_FIELD) {
    const [field, table] = LAYER_FIELD[key];
    const layers = badge.layers.map((l, i) => (i === 0 ? { ...l, [field]: table[idx].id } : { ...l }));
    return { badge: { ...badge, layers, placements: shown(badge.placements) } };
  }
  if (key === "badge.finish") {
    return { badge: { ...badge, layers: badge.layers.map((l) => ({ ...l })), placements: [...badge.placements], finish: FINISHES[idx].id } };
  }
  if (key.startsWith("acc.")) {
    const slot = key.slice(4);
    return { accessories: { ...ch.accessories, [slot]: ACCESSORIES[slot][idx].id } };
  }
  if (key === "armorIndex" && ch.armorVariant) return { armorIndex: idx, armorVariant: 0 };
  return { [key]: idx };
}

export function togglePlacement(ch, placementId) {
  const has = ch.badge.placements.includes(placementId);
  const placements = has ? ch.badge.placements.filter((p) => p !== placementId) : [...ch.badge.placements, placementId];
  return { badge: { ...ch.badge, layers: ch.badge.layers.map((l) => ({ ...l })), placements } };
}

export function cloneLook(ch) {
  const out = { ...ch };
  if (ch.badge) out.badge = structuredClone(ch.badge);
  if (ch.accessories) out.accessories = { ...ch.accessories };
  return out;
}

/** Index fields that change the drawn agent (name and voice do not). */
const DRAWN = [
  "colorIndex", "skinToneIndex", "hairIndex", "eyeIndex", "armorIndex", "helmetIndex",
  "visorIndex", "shoulderIndex", "weaponSkinIndex", "loadoutIndex", "backstoryIndex", "armorVariant",
];

export function lookKey(ch) {
  const c = ch || {};
  const flat = DRAWN.map((k) => c[k] | 0).join(".");
  const b = c.badge;
  const badge = b
    ? `${b.finish}|${(b.placements || []).join(",")}|${(b.layers || []).map((l) => `${l.frame}:${l.symbol}:${l.enamel}:${l.metal}:${l.x}:${l.y}:${l.scale}:${l.rot}`).join(";")}`
    : "-";
  const acc = c.accessories ? ACCESSORY_SLOTS.map(({ id }) => c.accessories[id] || "none").join(",") : "-";
  return `${flat}#${badge}#${acc}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/character-fields.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/character-fields.js tests/unit/character-fields.test.js
git commit -m "feat(creator): add index-shaped accessors for nested character fields"
```

---

### Task 6: Unlocks for badges, finishes, accessories, variants and acts

**Files:**
- Modify: `src/systems/unlocks.js`
- Modify: `src/systems/achievement-system.js:48` (stats defaults)
- Modify: `js/campaign-manager.js:377-395,406-410,426-428` (`handleBossKill`)
- Test: `tests/unit/unlocks.test.js`

**Interfaces:**
- Consumes: `FIELD_TABLES` (Task 5), armour `variant` (Task 3)
- Produces:
  - `LOCKABLE` gains every key in `FIELD_TABLES` with `{ table, kind, byId: true }`
  - `ownedKey(key, index) → "key:index"` for flat keys, `"key:#id"` for id tables; `unlockState`, `earnedIds`, `describeId`, `grantOwned` use it
  - Rule type `campaignActs` reading `ctx.campaignActsCleared`
  - `variantState(armorIndex, ctx) → unlockState-shaped object`
  - `sanitizeLocked(character, ctx) → changes` resetting locked, unowned nested picks

- [ ] **Step 1: Write the failing tests** (append to `tests/unit/unlocks.test.js`)

```js
import { variantState, sanitizeLocked, ownedKey, LOCKABLE as LOCK } from "../../src/systems/unlocks.js";
import { SYMBOLS, FINISHES, BADGE_PRESETS, indexOfId } from "../../src/data/badges.js";
import { ACCESSORIES } from "../../src/data/accessories.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { cloneLook } from "../../src/core/character-fields.js";

describe("badge and accessory unlocks", () => {
  it("classic and faction symbols are free; earned ones are locked", () => {
    const ctx = unlockContext();
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "clock"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "corps"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "lordslayer"), ctx).unlocked).toBe(false);
  });

  it("achievement rules unlock symbols and presets", () => {
    const ctx = unlockContext({ achievements: { lordSlayer: true } });
    expect(unlockState("badge.symbol", indexOfId(SYMBOLS, "lordslayer"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.preset", indexOfId(BADGE_PRESETS, "p_lordslayer"), ctx).unlocked).toBe(true);
  });

  it("campaignActs counts defeated acts and a finished campaign counts as three", () => {
    const act1 = indexOfId(SYMBOLS, "act1");
    const act3 = indexOfId(SYMBOLS, "act3");
    expect(unlockState("badge.symbol", act1, unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(true);
    expect(unlockState("badge.symbol", act3, unlockContext({ stats: { campaignActsCleared: 1 } })).unlocked).toBe(false);
    expect(unlockState("badge.symbol", act3, unlockContext({ stats: { campaignComplete: true } })).unlocked).toBe(true);
  });

  it("finishes: insignia free, holo needs the campaign", () => {
    const ctx = unlockContext();
    expect(unlockState("badge.finish", indexOfId(FINISHES, "insignia"), ctx).unlocked).toBe(true);
    expect(unlockState("badge.finish", indexOfId(FINISHES, "holo"), ctx).unlocked).toBe(false);
  });

  it("accessory tiers follow the tier rules", () => {
    const ctx = unlockContext();
    expect(unlockState("acc.back", indexOfId(ACCESSORIES.back, "backpack"), ctx).unlocked).toBe(true);
    expect(unlockState("acc.back", indexOfId(ACCESSORIES.back, "antenna"), ctx).unlocked).toBe(false);
    expect(unlockState("acc.back", indexOfId(ACCESSORIES.back, "antenna"), unlockContext({ stats: { tutorialComplete: true } })).unlocked).toBe(true);
  });

  it("ownership of id-based items survives table reordering", () => {
    const i = indexOfId(SYMBOLS, "lordslayer");
    expect(ownedKey("badge.symbol", i)).toBe("badge.symbol:#lordslayer");
    expect(ownedKey("armorIndex", 2)).toBe("armorIndex:2");
    const ctx = unlockContext({ owned: { "badge.symbol:#lordslayer": true } });
    expect(unlockState("badge.symbol", i, ctx).unlocked).toBe(true);
  });

  it("variants lock by their own rule", () => {
    const ghost = ARMOR_STYLES.findIndex((a) => a.variant.unlock.id === "untouchable");
    expect(variantState(ghost, unlockContext()).unlocked).toBe(false);
    expect(variantState(ghost, unlockContext({ achievements: { untouchable: true } })).unlocked).toBe(true);
  });

  it("sanitizeLocked resets unowned locked picks and keeps owned ones", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.accessories.back = "antenna";
    ch.badge = { layers: [{ frame: "disc", symbol: "lordslayer", enamel: "teal", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }], finish: "holo", placements: ["chest"] };
    ch.armorVariant = 1;
    const changes = sanitizeLocked(ch, unlockContext({ owned: { "acc.back:#antenna": true } }));
    expect(changes.accessories?.back ?? ch.accessories.back).toBe("antenna");
    expect(changes.badge.layers[0].symbol).toBe("clock");
    expect(changes.badge.finish).toBe("auto");
    expect(changes.armorVariant).toBe(0);
  });

  it("every virtual key is lockable", () => {
    for (const k of ["badge.preset", "badge.symbol", "badge.finish", "acc.back", "acc.legs"]) expect(LOCK[k]).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/unlocks.test.js`
Expected: FAIL — `variantState` is not exported.

- [ ] **Step 3: Implement**

In `src/systems/unlocks.js`:

```js
import { FIELD_TABLES } from "../core/character-fields.js";
import { indexOfId } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES } from "../data/accessories.js";

const VIRTUAL_KINDS = {
  "badge.preset": "Badge", "badge.symbol": "Badge symbol", "badge.frame": "Badge frame",
  "badge.enamel": "Enamel", "badge.metal": "Metal", "badge.finish": "Badge finish",
};
for (const [key, table] of Object.entries(FIELD_TABLES)) {
  LOCKABLE[key] = { table, kind: VIRTUAL_KINDS[key] || `${key.slice(4)[0].toUpperCase()}${key.slice(5)} gear`, byId: true };
}

/** Ownership id: index for the legacy flat tables, item id for id-based tables. */
export function ownedKey(key, index) {
  const entry = LOCKABLE[key];
  return entry?.byId ? `${key}:#${entry.table[index]?.id}` : `${key}:${index}`;
}
```

- `ruleFor(key, index)`: unchanged logic, but it now also applies to virtual keys; `TIER_UNLOCKS[item.tier]` only applies when `item.unlock` is absent and `item.tier` ≥ 2 (existing behaviour).
- `unlockState`: replace `` ctx.owned?.[`${key}:${index}`] `` with `ctx.owned?.[ownedKey(key, index)]`.
- `earnedIds`: push `ownedKey(key, i)` instead of `` `${key}:${i}` ``.
- `describeId(id)`: split on the first `:`; if the rest starts with `#`, find the item by id in `LOCKABLE[key].table`, otherwise by index.
- `grantOwned(key, index)`: store under `ownedKey(key, index)`.
- `unlockContext`: add `campaignActsCleared: Math.max(Number(stats.campaignActsCleared) || 0, stats.campaignComplete ? 3 : 0)`.
- `evaluateRule`: add `case "campaignActs": return count(ctx.campaignActsCleared, rule.count);`.

Add:

```js
export function variantState(armorIndex, ctx) {
  const v = ARMOR_STYLES[armorIndex]?.variant;
  if (!v) return { unlocked: false, rule: null, value: 0, target: 1, pct: 0, hint: "" };
  const e = evaluateRule(v.unlock, ctx);
  const owned = !!ctx.owned?.[`armorVariant:#${v.id}`];
  return { unlocked: e.met || owned, rule: v.unlock, value: e.value, target: e.target, pct: e.target ? e.value / e.target : 0, hint: progressText(v.unlock, e) };
}

/** Changes that strip locked, unowned nested picks (saved before a rule changed, or store cleared). */
export function sanitizeLocked(ch, ctx) {
  const changes = {};
  const ok = (key, id) => unlockState(key, indexOfId(LOCKABLE[key].table, id), ctx).unlocked;
  const acc = { ...ch.accessories };
  let accChanged = false;
  for (const { id } of ACCESSORY_SLOTS) {
    if (acc[id] !== "none" && !ok(`acc.${id}`, acc[id])) { acc[id] = "none"; accChanged = true; }
  }
  if (accChanged) changes.accessories = acc;
  const b = ch.badge;
  if (b) {
    const layers = b.layers.map((l) => (ok("badge.symbol", l.symbol) ? { ...l } : { ...l, symbol: "clock" }));
    const finish = ok("badge.finish", b.finish) ? b.finish : "auto";
    if (finish !== b.finish || layers.some((l, i) => l.symbol !== b.layers[i].symbol)) {
      changes.badge = { ...b, layers, finish, placements: [...b.placements] };
    }
  }
  if (ch.armorVariant && !variantState(ch.armorIndex | 0, ctx).unlocked) changes.armorVariant = 0;
  return changes;
}
```

Also extend `earnedIds` to include variants: after the `LOCKABLE` loop, for each armour `i` whose `variant.unlock` is met, push `` `armorVariant:#${ARMOR_STYLES[i].variant.id}` ``; and make `describeId` return `{ kind: "Armour variant", name: variant.name, tier: 0 }` for that prefix.

Call `sanitizeLocked` where the game loads the character for play. Find the call with `grep -n "loadCharacter(" js/*.js src/**/*.js`, and directly after it add:

```js
Object.assign(this.character, sanitizeLocked(this.character, gameUnlockContext(this, { fresh: true })));
```

(Use the receiver name at that call site; import `sanitizeLocked` and `gameUnlockContext` from `src/systems/unlocks.js`.)

In `src/systems/achievement-system.js` next to `campaignLevelsCleared: 0,` add:

```js
      campaignActsCleared: 0, // Paradox Lord defeats, highest act (1..3)
```

In `js/campaign-manager.js` `handleBossKill`, directly after `g.achievementStats.bossKilled = true;`:

```js
    g.achievementStats.campaignActsCleared = Math.max(g.achievementStats.campaignActsCleared || 0, this.act);
    g.saveAchievements();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/unlocks.test.js tests/unit/gear.test.js`
Expected: PASS. Existing tests that assert `earnedIds(ctx)` equals a list of `"key:index"` strings for flat keys still pass because flat keys keep the index form.

- [ ] **Step 5: Commit**

```bash
git add src/systems/unlocks.js src/systems/achievement-system.js js/campaign-manager.js tests/unit/unlocks.test.js
git add -u js src
git commit -m "feat(unlocks): lock badges, finishes, accessories and variants by id"
```

---

### Task 7: Badge composer

**Files:**
- Create: `src/rendering/svg-art/insignia/symbols.js`, `frames.js`, `finishes.js`, `compose.js`
- Modify: `src/rendering/svg-art/agent-rig.js:800-834` (move `STAR` and `badgeIcon` out; re-export)
- Test: `tests/unit/insignia.test.js`

**Interfaces:**
- Consumes: Task 1 tables, `ARMOR_STYLES[].badgeTreatment` and `.variant.badgeTreatment`
- Produces:
  - `symbolMarkup(id, fg, bg) → string` in a -5..5 box (unknown id → `""`); `badgeIcon(icon, color, dark)` is kept as an alias for the showroom's existing import
  - `FRAME_PATHS: Record<frameId, {outer: string, inner: string}>` in a -50..50 box
  - `renderFinish(finishId, {frame, symbol, enamel, ramp, detail}) → string`
  - `resolveTreatment(character) → {finish, metal}`
  - `renderBadge(badge, {treatment, detail = "high"}) → string` — markup in a -50..50 box with **no `id=` attributes and no `url(#…)` references**; memoized

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/insignia.test.js
import { describe, it, expect } from "vitest";
import { renderBadge, resolveTreatment, _cacheSize } from "../../src/rendering/svg-art/insignia/compose.js";
import { symbolMarkup } from "../../src/rendering/svg-art/insignia/symbols.js";
import { FRAME_PATHS } from "../../src/rendering/svg-art/insignia/frames.js";
import { SYMBOLS, FRAMES, FINISHES, layer } from "../../src/data/badges.js";
import { ARMOR_STYLES, DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";

/** Balanced tags: every <x ...> has a </x> unless self-closed. */
function wellFormed(markup) {
  const stack = [];
  for (const m of markup.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) {
    const [, close, tag, self] = m;
    if (self) continue;
    if (close) { if (stack.pop() !== tag) return false; } else stack.push(tag);
  }
  return stack.length === 0;
}

describe("insignia", () => {
  it("every symbol draws something", () => {
    for (const s of SYMBOLS) expect(symbolMarkup(s.id, "#fff", "#000").length, s.id).toBeGreaterThan(20);
    expect(symbolMarkup("nope", "#fff", "#000")).toBe("");
  });

  it("every frame has outer and inner paths", () => {
    for (const f of FRAMES) {
      expect(FRAME_PATHS[f.id].outer).toMatch(/^M/);
      expect(FRAME_PATHS[f.id].inner).toMatch(/^M/);
    }
  });

  it("every symbol x frame x finish is well-formed and id-free", () => {
    const finishes = FINISHES.map((f) => f.id).filter((f) => f !== "auto");
    for (const s of SYMBOLS) for (const f of FRAMES) for (const fin of finishes) {
      const out = renderBadge({ layers: [layer(s.id, f.id)], finish: fin, placements: ["chest"] }, { treatment: { finish: "insignia", metal: "brass" } });
      expect(wellFormed(out), `${s.id}/${f.id}/${fin}`).toBe(true);
      expect(out).not.toMatch(/\bid="/);
      expect(out).not.toMatch(/url\(#/);
    }
  });

  it("auto finish follows the treatment", () => {
    const b = { layers: [layer("clock")], finish: "auto", placements: ["chest"] };
    const patch = renderBadge(b, { treatment: { finish: "patch", metal: "brass" } });
    const holo = renderBadge(b, { treatment: { finish: "holo", metal: "brass" } });
    expect(patch).not.toBe(holo);
    expect(patch).toContain('data-finish="patch"');
  });

  it("auto finish uses the treatment metal; explicit finish keeps the layer metal", () => {
    const gold = "#f2c230";
    const autoB = { layers: [layer("clock", "disc", "teal", "steel")], finish: "auto", placements: ["chest"] };
    expect(renderBadge(autoB, { treatment: { finish: "insignia", metal: "gold" } })).toContain(gold);
    const explicit = { ...autoB, finish: "insignia" };
    expect(renderBadge(explicit, { treatment: { finish: "insignia", metal: "gold" } })).not.toContain(gold);
  });

  it("low detail is shorter than high detail", () => {
    const b = { layers: [layer("guard", "cog")], finish: "insignia", placements: ["chest"] };
    expect(renderBadge(b, { detail: "low" }).length).toBeLessThan(renderBadge(b, { detail: "high" }).length);
  });

  it("memoizes identical requests", () => {
    const b = { layers: [layer("eye", "hex")], finish: "insignia", placements: ["chest"] };
    const a = renderBadge(b, {});
    const n = _cacheSize();
    expect(renderBadge(structuredClone(b), {})).toBe(a);
    expect(_cacheSize()).toBe(n);
  });

  it("resolveTreatment reads the armour, and the variant when worn", () => {
    const i = ARMOR_STYLES.findIndex((a) => a.variant.badgeTreatment.metal !== a.badgeTreatment.metal);
    const base = { ...DEFAULT_CHARACTER, armorIndex: i, armorVariant: 0 };
    expect(resolveTreatment(base)).toEqual(ARMOR_STYLES[i].badgeTreatment);
    expect(resolveTreatment({ ...base, armorVariant: 1 })).toEqual(ARMOR_STYLES[i].variant.badgeTreatment);
  });

  it("empty placements still render (the caller decides where)", () => {
    expect(renderBadge({ layers: [layer("star")], finish: "insignia", placements: [] }, {}).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/insignia.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `symbols.js`**

Move `STAR` and the body of `badgeIcon` from `agent-rig.js` into this file unchanged (they become the seven classic cases), then add the new symbols. Every symbol is drawn in a -5..5 box with `fg` for the raised metal and `bg` for cut-outs.

```js
// src/rendering/svg-art/insignia/symbols.js
/**
 * Badge symbols in a -5..5 box. `fg` is the raised metal (or thread, or
 * light), `bg` punches detail back into it. No ids, no gradients: the finish
 * decides how the colours are treated.
 */
const f = (n) => Math.round(n * 100) / 100;

const STAR = (() => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 2 : 4.8;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * r)},${f(Math.sin(a) * r + 0.3)} `;
  }
  return d + "Z";
})();

const chevrons = (n, fg) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const y = 3.2 - i * 1.9;
    d += `<path d="M-3.8,${f(y - 1.6)} L0,${f(y)} L3.8,${f(y - 1.6)}" fill="none" stroke="${fg}" stroke-width="1.05" stroke-linejoin="round"/>`;
  }
  return d;
};

const gear = (r, teeth) => {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth;
    const rr = i % 2 ? r : r + 1;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * rr)},${f(Math.sin(a) * rr)} `;
  }
  return d + "Z";
};

const S = {
  // Classic (moved from agent-rig.js badgeIcon, unchanged)
  shield: (fg, bg) => `<path d="M0,-4.8 L4,-3.3 C4,0.8 2.4,3.4 0,4.8 C-2.4,3.4 -4,0.8 -4,-3.3 Z" fill="${fg}"/><path d="M-2,-0.6 L0,1.6 L2,-0.6" fill="none" stroke="${bg}" stroke-width=".9"/>`,
  skull: (fg, bg) => `<path d="M-3.8,0.8 C-4.8,-4.8 4.8,-4.8 3.8,0.8 L2.6,1.8 L2.6,4 L-2.6,4 L-2.6,1.8 Z" fill="${fg}"/><g fill="${bg}"><circle cx="-1.6" cy="-0.6" r="1.1"/><circle cx="1.6" cy="-0.6" r="1.1"/><rect x="-.3" y="2.2" width=".6" height="1.8"/></g>`,
  clock: (fg) => `<circle r="4.2" fill="none" stroke="${fg}" stroke-width="1.1"/><path d="M0,-2.8 L0,0 L2,1.4" fill="none" stroke="${fg}" stroke-width=".9" stroke-linecap="round"/>`,
  star: (fg) => `<path d="${STAR}" fill="${fg}"/>`,
  bolt: (fg) => `<path d="M1.2,-5 L-3,0.8 L-0.4,0.8 L-1.4,5 L3,-1 L0.4,-1 Z" fill="${fg}"/>`,
  eye: (fg, bg) => `<path d="M-4.8,0 Q0,-4.2 4.8,0 Q0,4.2 -4.8,0 Z" fill="${fg}"/><circle r="1.6" fill="${bg}"/>`,
  rift: (fg) => `<path d="M0,-5 L1.8,0 L0,5 L-1.8,0 Z" fill="${fg}"/><path d="M-4.2,-2.4 C-2,-4 2.2,-3.6 3.6,-1 M4.2,2.4 C2,4 -2.2,3.6 -3.6,1" fill="none" stroke="${fg}" stroke-width=".8" stroke-linecap="round"/>`,
  // Factions
  corps: (fg, bg) => `<path d="${gear(3.4, 8)}" fill="${fg}"/><circle r="1.9" fill="${bg}"/><path d="M0,-1.3 L0,0 L0.9,0.6" fill="none" stroke="${fg}" stroke-width=".55" stroke-linecap="round"/>`,
  aegis: (fg, bg) => `<path d="M0,-4.8 L4,-3.3 C4,0.8 2.4,3.4 0,4.8 C-2.4,3.4 -4,0.8 -4,-3.3 Z" fill="none" stroke="${fg}" stroke-width=".9"/><path d="M-2.6,-1 L0,-2.6 L2.6,-1 L0,3 Z" fill="${fg}"/><path d="M0,-2.6 L0,3" stroke="${bg}" stroke-width=".5"/>`,
  walkers: (fg) => `<path d="M-4,3.6 L-1.4,-3.8 L0,-1 L1.4,-3.8 L4,3.6" fill="none" stroke="${fg}" stroke-width="1" stroke-linejoin="round"/><circle cy="1.6" r="1.1" fill="${fg}"/>`,
  deadsquad: (fg, bg) => `${S.skull(fg, bg)}<path d="M-4.6,4.6 L4.6,-4.6 M-4.6,-4.6 L4.6,4.6" stroke="${fg}" stroke-width=".7" opacity=".85"/>`,
  guard: (fg, bg) => `<path d="${gear(3.8, 10)}" fill="${fg}"/><circle r="2.4" fill="${bg}"/><path d="M-1.3,-1.6 L1.3,-1.6 L1.3,0.4 C1.3,1.4 0,2 0,2 C0,2 -1.3,1.4 -1.3,0.4 Z" fill="${fg}"/>`,
  hunters: (fg) => `<circle r="3.4" fill="none" stroke="${fg}" stroke-width=".8"/><path d="M0,-5 L0,-2 M0,2 L0,5 M-5,0 L-2,0 M2,0 L5,0" stroke="${fg}" stroke-width=".9"/><circle r=".9" fill="${fg}"/>`,
  crew: (fg) => `<path d="M-4.2,1.2 L0,-3.6 L4.2,1.2" fill="none" stroke="${fg}" stroke-width="1.1" stroke-linejoin="round"/><path d="M-3,3.6 L3,3.6" stroke="${fg}" stroke-width="1.1" stroke-linecap="round"/><circle cy="0.6" r="1" fill="${fg}"/>`,
  aria: (fg) => `<path d="M-4.4,0 C-2.6,-3 2.6,-3 4.4,0 C2.6,3 -2.6,3 -4.4,0 Z" fill="none" stroke="${fg}" stroke-width=".8"/><path d="M-2.4,0.9 L-1.2,-0.9 L0,0.9 L1.2,-0.9 L2.4,0.9" fill="none" stroke="${fg}" stroke-width=".7" stroke-linejoin="round"/>`,
  // Ranks: chevrons, bars and stars
  rank1: (fg) => chevrons(1, fg),
  rank2: (fg) => chevrons(2, fg),
  rank3: (fg) => chevrons(3, fg),
  rank4: (fg) => `<rect x="-1" y="-4.2" width="2" height="8.4" rx=".3" fill="${fg}"/>`,
  rank5: (fg) => `<rect x="-2.6" y="-4.2" width="1.8" height="8.4" rx=".3" fill="${fg}"/><rect x=".8" y="-4.2" width="1.8" height="8.4" rx=".3" fill="${fg}"/>`,
  rank6: (fg) => `<g transform="scale(.62) translate(0,-2)"><path d="${STAR}" fill="${fg}"/></g>${chevrons(1, fg)}`,
  // Act emblems: the Paradox Lord's mask behind 1-3 bars
  act1: (fg, bg) => actMask(fg, bg, 1),
  act2: (fg, bg) => actMask(fg, bg, 2),
  act3: (fg, bg) => actMask(fg, bg, 3),
  // Earned
  lordslayer: (fg, bg) => `${actMask(fg, bg, 0)}<path d="M-4.6,4.4 L4.4,-4.6" stroke="${fg}" stroke-width="1.1" stroke-linecap="round"/>`,
  untouchable: (fg) => `<circle r="4.2" fill="none" stroke="${fg}" stroke-width=".7" stroke-dasharray="1.2 .9"/><path d="${STAR}" fill="${fg}" transform="scale(.55)"/>`,
  centurion: (fg, bg) => `<path d="M-4.4,1.6 C-4.4,-3.6 4.4,-3.6 4.4,1.6 Z" fill="${fg}"/><path d="M-3,-3.4 C-1.6,-5.2 1.6,-5.2 3,-3.4" fill="none" stroke="${fg}" stroke-width="1.1"/><path d="M-1.2,1.6 L-1.2,4.4 L1.2,4.4 L1.2,1.6" fill="${fg}"/><path d="M-2.6,-0.6 L2.6,-0.6" stroke="${bg}" stroke-width=".6"/>`,
  speeddemon: (fg) => `<path d="M-4.8,-1.6 L2,-1.6 M-4,0.4 L2.8,0.4 M-4.8,2.4 L1.6,2.4" stroke="${fg}" stroke-width=".8" stroke-linecap="round"/><path d="M1.4,-4.4 L-0.6,0.4 L1.2,0.4 L0.2,4.6 L4.4,-1 L2.4,-1 Z" fill="${fg}"/>`,
  veteran: (fg) => `<path d="${gear(3.8, 12)}" fill="none" stroke="${fg}" stroke-width=".6"/><path d="M-2.2,-2.6 L2.2,-2.6 L2.2,0.8 C2.2,2.6 0,3.4 0,3.4 C0,3.4 -2.2,2.6 -2.2,0.8 Z" fill="${fg}"/>`,
  firstblood: (fg) => `<path d="M0,-4.8 C2.6,-1.2 3.6,0.6 3.6,2 C3.6,4 2,5 0,5 C-2,5 -3.6,4 -3.6,2 C-3.6,0.6 -2.6,-1.2 0,-4.8 Z" fill="${fg}"/>`,
  dronehunter: (fg, bg) => `<rect x="-2" y="-1.4" width="4" height="2.8" rx=".8" fill="${fg}"/><circle cx="-3.6" cy="-2.6" r="1.3" fill="none" stroke="${fg}" stroke-width=".6"/><circle cx="3.6" cy="-2.6" r="1.3" fill="none" stroke="${fg}" stroke-width=".6"/><circle r=".7" fill="${bg}"/><path d="M-4.6,4.6 L4.6,-4.6" stroke="${fg}" stroke-width=".7"/>`,
  phantom: (fg, bg) => `<path d="M-3.6,4.6 L-3.6,-1 C-3.6,-5.4 3.6,-5.4 3.6,-1 L3.6,4.6 L2.2,3.4 L1,4.6 L0,3.4 L-1,4.6 L-2.2,3.4 Z" fill="${fg}"/><circle cx="-1.3" cy="-1" r=".8" fill="${bg}"/><circle cx="1.3" cy="-1" r=".8" fill="${bg}"/>`,
  tamer: (fg) => `<path d="M-3.8,-3.8 C-1,-1.6 1,-1.6 3.8,-3.8 M-4.4,0 C-1.4,1.8 1.4,1.8 4.4,0 M-3.8,3.8 C-1,1.6 1,1.6 3.8,3.8" fill="none" stroke="${fg}" stroke-width=".8" stroke-linecap="round"/>`,
  scoremaster: (fg) => `<path d="M-4,4 L-4,1 M-1.4,4 L-1.4,-1 M1.2,4 L1.2,-2.6 M3.8,4 L3.8,-4.4" stroke="${fg}" stroke-width="1.2" stroke-linecap="round"/>`,
  graduate: (fg) => `<path d="M-4.8,-1 L0,-3.4 L4.8,-1 L0,1.4 Z" fill="${fg}"/><path d="M-2.8,0.2 L-2.8,2.6 C-1.4,3.8 1.4,3.8 2.8,2.6 L2.8,0.2" fill="${fg}"/><path d="M4,-0.6 L4,2.8" stroke="${fg}" stroke-width=".5"/>`,
  survivor: (fg) => `<path d="M-4.2,-2.8 L0,-4.6 L4.2,-2.8 L4.2,0.6 C4.2,3 0,4.8 0,4.8 C0,4.8 -4.2,3 -4.2,0.6 Z" fill="none" stroke="${fg}" stroke-width=".8"/><path d="M-1.8,0 L-0.4,1.4 L2,-1.4" fill="none" stroke="${fg}" stroke-width=".9" stroke-linecap="round"/>`,
};

function actMask(fg, bg, bars) {
  let m = `<path d="M-3.4,-3.4 C-3.4,-5.2 3.4,-5.2 3.4,-3.4 L3,1 C2.2,2.8 -2.2,2.8 -3,1 Z" fill="${fg}"/><path d="M-2.2,-1.6 L-0.6,-1.2 M2.2,-1.6 L0.6,-1.2" stroke="${bg}" stroke-width=".7" stroke-linecap="round"/>`;
  for (let i = 0; i < bars; i++) m += `<rect x="${f(-3.4 + i * 2.5)}" y="3.4" width="1.8" height="1.2" fill="${fg}"/>`;
  return m;
}

export function symbolMarkup(id, fg, bg) {
  const s = S[id];
  return s ? s(fg, bg) : "";
}

/** Old name kept for the showroom's tile code; same -5..5 box. */
export const badgeIcon = (icon, color, dark) => symbolMarkup(icon, color, dark);
```

In `agent-rig.js`, delete the local `STAR` constant and `badgeIcon` function and add at the top:

```js
import { badgeIcon } from "./insignia/symbols.js";
export { badgeIcon };
```

- [ ] **Step 4: Write `frames.js`**

```js
// src/rendering/svg-art/insignia/frames.js
/** Frame outline (`outer`) and enamel field (`inner`) in a -50..50 box. */
const f = (n) => Math.round(n * 100) / 100;

const circle = (r) => `M${-r},0 A${r},${r} 0 1 0 ${r},0 A${r},${r} 0 1 0 ${-r},0 Z`;
const polygon = (n, r, rot = 0) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * r)},${f(Math.sin(a) * r)} `;
  }
  return d + "Z";
};
const cog = (r, teeth, depth) => {
  let d = "";
  const steps = teeth * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i * 2 * Math.PI) / steps - Math.PI / 2;
    const rr = i % 4 < 2 ? r : r - depth;
    d += `${i ? "L" : "M"}${f(Math.cos(a) * rr)},${f(Math.sin(a) * rr)} `;
  }
  return d + "Z";
};
const shield = (s) => `M0,${f(-46 * s)} L${f(40 * s)},${f(-32 * s)} L${f(40 * s)},${f(-2 * s)} C${f(40 * s)},${f(24 * s)} ${f(22 * s)},${f(40 * s)} 0,${f(48 * s)} C${f(-22 * s)},${f(40 * s)} ${f(-40 * s)},${f(24 * s)} ${f(-40 * s)},${f(-2 * s)} L${f(-40 * s)},${f(-32 * s)} Z`;
const chevron = (s) => `M${f(-44 * s)},${f(-30 * s)} L0,${f(-12 * s)} L${f(44 * s)},${f(-30 * s)} L${f(44 * s)},${f(16 * s)} L0,${f(40 * s)} L${f(-44 * s)},${f(16 * s)} Z`;
const tag = (s) => `M${f(-46 * s)},${f(-26 * s)} Q${f(-46 * s)},${f(-34 * s)} ${f(-38 * s)},${f(-34 * s)} L${f(38 * s)},${f(-34 * s)} Q${f(46 * s)},${f(-34 * s)} ${f(46 * s)},${f(-26 * s)} L${f(46 * s)},${f(26 * s)} Q${f(46 * s)},${f(34 * s)} ${f(38 * s)},${f(34 * s)} L${f(-38 * s)},${f(34 * s)} Q${f(-46 * s)},${f(34 * s)} ${f(-46 * s)},${f(26 * s)} Z`;

export const FRAME_PATHS = {
  disc: { outer: circle(46), inner: circle(36) },
  shield: { outer: shield(1), inner: shield(0.78) },
  hex: { outer: polygon(6, 47, -Math.PI / 2), inner: polygon(6, 37, -Math.PI / 2) },
  chevron: { outer: chevron(1), inner: chevron(0.78) },
  tag: { outer: tag(1), inner: tag(0.8) },
  cog: { outer: cog(48, 12, 6), inner: circle(33) },
};
```

- [ ] **Step 5: Write `finishes.js`**

```js
// src/rendering/svg-art/insignia/finishes.js
/**
 * One renderer per finish. Colour only — no gradients, filters or ids — so a
 * badge can repeat inside one SVG and survives scopeIds / realizeMarkup.
 * Inputs: frame paths (-50..50), symbol painter (-5..5), enamel colour and a
 * metal ramp [hi, mid, lo, edge]. `detail: "low"` drops fine strokes.
 */
import { FRAME_PATHS } from "./frames.js";
import { symbolMarkup } from "./symbols.js";

const SYM = (id, fg, bg) => `<g transform="scale(6.2)">${symbolMarkup(id, fg, bg)}</g>`;

function insignia({ frame, symbol, enamel, ramp, detail }) {
  const { outer, inner } = FRAME_PATHS[frame];
  const [hi, mid, lo, edge] = ramp;
  const fine = detail === "high"
    ? `<path d="${outer}" fill="none" stroke="${hi}" stroke-width="2" opacity=".55" transform="translate(-1.2,-1.6)"/>` +
      `<path d="${inner}" fill="none" stroke="${lo}" stroke-width="2.4"/>` +
      `<g transform="translate(.8,1.2)" opacity=".45">${SYM(symbol, edge, edge)}</g>` +
      `<ellipse cx="-6" cy="-20" rx="26" ry="12" fill="#ffffff" opacity=".14"/>`
    : "";
  return (
    `<path d="${outer}" fill="${mid}" stroke="${edge}" stroke-width="3"/>` +
    `<path d="${inner}" fill="${enamel}"/>` +
    fine +
    SYM(symbol, detail === "high" ? hi : mid, enamel)
  );
}

function patch({ frame, symbol, enamel, ramp, detail }) {
  const { outer, inner } = FRAME_PATHS[frame];
  const thread = ramp[0];
  const stitch = detail === "high"
    ? `<path d="${inner}" fill="none" stroke="${thread}" stroke-width="1.6" stroke-dasharray="4 3" opacity=".8"/>` +
      `<path d="${outer}" fill="none" stroke="#000000" stroke-width="1" opacity=".35" transform="scale(.93)"/>`
    : "";
  return (
    `<path d="${outer}" fill="#23261c" stroke="#15170f" stroke-width="7"/>` +
    `<path d="${inner}" fill="${enamel}" opacity=".85"/>` +
    stitch +
    SYM(symbol, thread, "#23261c")
  );
}

function holo({ frame, symbol, enamel, ramp, detail }) {
  const { outer, inner } = FRAME_PATHS[frame];
  const light = ramp[0];
  const halo = detail === "high"
    ? `<path d="${outer}" fill="none" stroke="${enamel}" stroke-width="7" opacity=".35"/>` +
      `<g opacity=".35" transform="scale(1.06)">${SYM(symbol, enamel, "#05080c")}</g>` +
      `<path d="${inner}" fill="none" stroke="${light}" stroke-width=".8" stroke-dasharray="1 5" opacity=".6"/>`
    : "";
  return (
    `<path d="${outer}" fill="#05080c" opacity=".85"/>` +
    halo +
    `<path d="${outer}" fill="none" stroke="${light}" stroke-width="2.4"/>` +
    SYM(symbol, light, "#05080c")
  );
}

function stencil({ frame, symbol, enamel, ramp, detail }) {
  const { outer } = FRAME_PATHS[frame];
  const paint = ramp[1];
  const spray = detail === "high"
    ? `<path d="${outer}" fill="none" stroke="${paint}" stroke-width="5" opacity=".18" transform="scale(1.04)"/>`
    : "";
  return (
    spray +
    `<path d="${outer}" fill="none" stroke="${paint}" stroke-width="4" stroke-dasharray="22 5"/>` +
    `<g opacity=".92">${SYM(symbol, paint, enamel)}</g>`
  );
}

const FINISH = { insignia, patch, holo, stencil };

export function renderFinish(finishId, args) {
  return (FINISH[finishId] || insignia)(args);
}
```

- [ ] **Step 6: Write `compose.js`**

```js
// src/rendering/svg-art/insignia/compose.js
/**
 * renderBadge: a badge layer stack as SVG markup in a -50..50 box. Memoized by
 * the stack, treatment and detail. Placement (where and how big) is the
 * caller's job; see agent-rig.js.
 */
import { ENAMELS, METALS, byId } from "../../../data/badges.js";
import { ARMOR_STYLES } from "../../../data/cosmetics.js";
import { renderFinish } from "./finishes.js";

const DEFAULT_TREATMENT = { finish: "insignia", metal: "brass" };
const cache = new Map();
const MAX = 256;

export function resolveTreatment(ch) {
  const a = ARMOR_STYLES[(ch && ch.armorIndex) | 0] || ARMOR_STYLES[0];
  const t = ch?.armorVariant ? a.variant?.badgeTreatment : a.badgeTreatment;
  return t || DEFAULT_TREATMENT;
}

export function renderBadge(badge, { treatment = DEFAULT_TREATMENT, detail = "high" } = {}) {
  const auto = badge.finish === "auto";
  const finish = auto ? treatment.finish : badge.finish;
  const key = `${finish}|${auto ? treatment.metal : ""}|${detail}|${badge.layers.map((l) => `${l.frame}:${l.symbol}:${l.enamel}:${l.metal}:${l.x}:${l.y}:${l.scale}:${l.rot}`).join(";")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let body = "";
  for (const l of badge.layers) {
    const metal = byId(METALS, auto ? treatment.metal : l.metal) || METALS[0];
    const enamel = (byId(ENAMELS, l.enamel) || ENAMELS[0]).color;
    const inner = renderFinish(finish, { frame: l.frame, symbol: l.symbol, enamel, ramp: metal.ramp, detail });
    const tf = l.x || l.y || l.scale !== 1 || l.rot ? ` transform="translate(${l.x},${l.y}) rotate(${l.rot}) scale(${l.scale})"` : "";
    body += tf ? `<g${tf}>${inner}</g>` : inner;
  }
  const out = `<g data-finish="${finish}">${body}</g>`;
  if (cache.size >= MAX) cache.delete(cache.keys().next().value);
  cache.set(key, out);
  return out;
}

/** Test hook. */
export const _cacheSize = () => cache.size;
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/unit/insignia.test.js`
Expected: PASS (9 tests). Then run `npx vitest run` — all green (the showroom still imports `badgeIcon` from `agent-rig.js`, which now re-exports it).

- [ ] **Step 8: Commit**

```bash
git add src/rendering/svg-art/insignia tests/unit/insignia.test.js src/rendering/svg-art/agent-rig.js
git commit -m "feat(badges): add the insignia badge composer with four finishes"
```

---

### Task 8: Draw badges on the agent at every placement

**Files:**
- Modify: `src/rendering/svg-art/agent-rig.js` (`resolve`, `decal`, `buildAgentParts`, `fallenParts`, `realOpts`)
- Modify: `src/rendering/svg-art/models/hero.js` (export arm joint helper)
- Test: `tests/unit/agent-rig-badges.test.js`

**Interfaces:**
- Consumes: `renderBadge`, `resolveTreatment` (Task 7), `normalizeBadge` (Task 4)
- Produces:
  - `rigAnchors(P, tilt, pose) → {chest, shoulderL, helmet, forearmL, forearmR, back, belt, hipL, hipR, kneeL, kneeR, neck, crown, browL, sideL, pose}`, each `{x, y, rot, size}` in rig units (Task 9 consumes the same table)
  - `resolve(ch).badge` is now the normalized badge object and `resolve(ch).treatment` the resolved treatment
  - `badgeAt(c, anchor, detail)` → markup
  - `realOpts(c).keep` contains every `ENAMELS` colour and every `METALS` ramp colour mapped to itself

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/agent-rig-badges.test.js
import { describe, it, expect } from "vitest";
import { buildAgentParts, buildCastModel } from "../../src/rendering/svg-art/agent-rig.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { cloneLook } from "../../src/core/character-fields.js";
import { layer } from "../../src/data/badges.js";

const withBadge = (placements, finish = "insignia") => {
  const ch = cloneLook(DEFAULT_CHARACTER);
  ch.badge = { layers: [layer("guard", "cog", "oxblood", "brass")], finish, placements };
  return ch;
};
const count = (s, needle) => s.split(needle).length - 1;

describe("agent badges", () => {
  it("no placements draws no badge", () => {
    expect(buildAgentParts(withBadge([])).body).not.toContain("data-finish=");
  });

  it("draws one badge per placement", () => {
    const all = buildAgentParts(withBadge(["chest", "shoulder", "forearm"]));
    expect(count(all.body, "data-finish=")).toBe(3);
    const helm = buildAgentParts(withBadge(["helmet"]));
    expect(count(helm.head, "data-finish=")).toBe(1);
  });

  it("auto finish follows the armour treatment", () => {
    expect(buildAgentParts(withBadge(["chest"], "auto")).body).toMatch(/data-finish="(insignia|stencil|patch|holo)"/);
  });

  it("fallen cast model keeps chest and shoulder badges", () => {
    const m = buildCastModel(withBadge(["chest", "shoulder"]), "hero_fallen");
    expect(JSON.stringify(m)).toContain("data-finish=");
  });

  it("a legacy-shaped record (badgeIndex only) still draws", () => {
    const ch = { ...DEFAULT_CHARACTER, badgeIndex: 3 };
    delete ch.badge;
    expect(() => buildAgentParts(ch)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent-rig-badges.test.js`
Expected: FAIL — `data-finish=` not found (old `decal` still draws the dark disc).

- [ ] **Step 3: Export arm joints from `hero.js`**

Open `armoredArm` in `src/rendering/svg-art/models/hero.js`. It computes the elbow and wrist from `{sh, rot, bend}` (idle) or uses `{sh, el, wr}` (armed, fallen). Extract that computation into an exported pure function and have `armoredArm` call it:

```js
/** Shoulder, elbow and wrist points for a pose arm (idle arms derive el/wr from rot + bend). */
export function armJoints(arm, s) {
  // Move the existing elbow/wrist derivation from armoredArm here unchanged,
  // returning { sh: arm.sh, el: [x, y], wr: [x, y] }.
}
```

Re-run `npx vitest run` — nothing should change visually or in tests, since the math moved verbatim.

- [ ] **Step 4: Replace `decal` with anchor-driven badges**

In `agent-rig.js`:

```js
import { renderBadge, resolveTreatment } from "./insignia/compose.js";
import { normalizeBadge, migrateLegacyBadge } from "../../core/character-normalize.js";
import { ENAMELS, METALS } from "../../data/badges.js";
import { armJoints } from "./models/hero.js";
```

In `resolve(ch)` replace `badge: pick(BADGES, ch.badgeIndex).icon,` with:

```js
    badge: ch.badge ? normalizeBadge(ch.badge) : migrateLegacyBadge(ch.badgeIndex | 0, ch.shoulderIndex | 0),
    treatment: resolveTreatment(ch),
```

Remove `BADGES` from the cosmetics import if nothing else uses it.

Add the anchor table next to `chestTrim` (the chest and shoulder numbers are today's `decal` positions, so existing looks do not move):

```js
/**
 * Attachment points on the rig, in rig units: badges (Task 8) and
 * accessories (Task 9) are placed from here, never from their own offsets.
 * `size` is the badge diameter at that point.
 */
export function rigAnchors(P, tilt, pose) {
  const [armL, armR] = P.arms.map((a, i) => armJoints(a, i === 0 ? -1 : 1));
  const mid = (a, b, t = 0.5) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const fl = mid(armL.el, armL.wr, 0.45);
  const fr = mid(armR.el, armR.wr, 0.45);
  const [hipL, hipR] = P.legs.map((l) => l.hip);
  const [kneeL, kneeR] = P.legs.map((l) => l.kn);
  return {
    chest: { x: 8.8, y: -57.4, rot: 0, size: 7.7 },
    shoulderL: { x: -24.4, y: -56, rot: tilt[0], pivot: [-12, -65], size: 6.2 },
    forearmL: { x: fl[0], y: fl[1], rot: Math.atan2(armL.wr[1] - armL.el[1], armL.wr[0] - armL.el[0]) * 57.3 - 90, size: 4.4 },
    forearmR: { x: fr[0], y: fr[1], rot: Math.atan2(armR.wr[1] - armR.el[1], armR.wr[0] - armR.el[0]) * 57.3 - 90, size: 4.4 },
    helmet: { x: -8.6, y: -90, rot: -8, size: 4.6 },
    neck: { x: 0, y: -69, rot: 0, size: 0 },
    back: { x: 0, y: -48, rot: 0, size: 0 },
    belt: { x: 0, y: -21, rot: 0, size: 0 },
    hipL: { x: hipL[0] - 3, y: hipL[1] + 2, rot: 0, size: 0 },
    hipR: { x: hipR[0] + 3, y: hipR[1] + 2, rot: 0, size: 0 },
    kneeL: { x: kneeL[0], y: kneeL[1], rot: 0, size: 0 },
    kneeR: { x: kneeR[0], y: kneeR[1], rot: 0, size: 0 },
    crown: { x: 0, y: -104, rot: 0, size: 0 },
    browL: { x: -6, y: -93, rot: 0, size: 0 },
    sideL: { x: -10.5, y: -88, rot: 0, size: 0 },
    pose,
  };
}

/** A badge sized and turned for one anchor. */
function badgeAt(c, a, detail = "high") {
  const s = a.size / 100;
  const inner = `<g transform="translate(${f(a.x)},${f(a.y)}) rotate(${f(a.rot)}) scale(${f(s)})">${renderBadge(c.badge, { treatment: c.treatment, detail })}</g>`;
  return a.pivot ? `<g transform="rotate(${f(a.rot)} ${a.pivot[0]} ${a.pivot[1]})">${inner.replace(` rotate(${f(a.rot)})`, " rotate(0)")}</g>` : inner;
}

const wears = (c, where) => c.badge.placements.includes(where);
```

Before editing the helmet anchor, render one agent per helmet style in the browser (Task 12's Playwright spec, or `ccDebug`) and check that (-8.6, -90) sits on the left side of each helmet shell. If a helmet style needs a different point, give `rigAnchors` a `HELMET_BADGE` map keyed by helmet id (default `{x: -8.6, y: -90}`) and pass `c.helmet` in.

In `buildAgentParts`, compute anchors after `tilt`:

```js
  const A = rigAnchors(P, tilt, armed ? "armed" : "standing");
```

Replace the two `decal(...)` lines in `body` with:

```js
    (wears(c, "chest") ? badgeAt(c, A.chest) : "") +
    (wears(c, "shoulder") ? badgeAt(c, A.shoulderL, "low") : "") +
    (wears(c, "forearm") ? badgeAt(c, A.forearmL, "low") : "") +
```

and append the helmet badge to the head: after `const h = head(c, peek);` add

```js
  const helmBadge = wears(c, "helmet") && !OPEN_HELMETS.has(c.helmet) ? badgeAt(c, A.helmet, "low") : "";
```

and return `head: h.front + helmBadge`.

In `fallenParts(c)`, build `const A = rigAnchors(FALLEN, [14, -4], "fallen");` and replace the `decal(...)` calls: chest `wears(c, "chest") ? badgeAt(c, A.chest) : ""`, the left shoulder copy `wears(c, "shoulder") ? badgeAt(c, { ...A.shoulderL, rot: 14 }, "low") : ""`. Add the helmet badge inside `headTf(...)` the same way as standing. Delete the old `decal` function.

In `realOpts(c)` extend `keep` so Modern relighting keeps enamel and metal colours:

```js
  const badgeKeep = {};
  for (const e of ENAMELS) badgeKeep[e.color] = e.color;
  for (const m of METALS) for (const col of m.ramp) badgeKeep[col] = col;
  return { rims: [c.rim, RIM], desat: 0.4, keep: { ...badgeKeep, ...(MATTE.has(c.armor) ? {} : SOFT_HIGHLIGHTS), [CANDY]: "#962330", [CANDY_HI]: "#b3434c" } };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/agent-rig-badges.test.js && npx vitest run`
Expected: PASS, whole suite green.

- [ ] **Step 6: Visual check**

Start the dev server (`preview_start` with name `clockwork-carnage`), open the creator, and in the console:

```js
const g = ccDebug.game;
g.character.badge = { layers: [{ frame: "shield", symbol: "guard", enamel: "oxblood", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }], finish: "insignia", placements: ["chest", "shoulder", "helmet", "forearm"] };
document.querySelector("agent-showroom").renderAll();
```

Screenshot in Comic and Modern (title-screen style toggle). Expected: brass shield on the chest, smaller copies on the left pauldron, left forearm and the helmet side; brass stays warm in Modern.

- [ ] **Step 7: Commit**

```bash
git add src/rendering/svg-art/agent-rig.js src/rendering/svg-art/models/hero.js tests/unit/agent-rig-badges.test.js
git commit -m "feat(badges): draw composed badges at chest, shoulder, helmet and forearm"
```

---

### Task 9: Accessory painters and rig integration

**Files:**
- Create: `src/rendering/svg-art/accessories/index.js`, `back.js`, `waist.js`, `helmet.js`, `arms.js`, `neck.js`, `legs.js`
- Modify: `src/rendering/svg-art/agent-rig.js` (`buildAgentParts`, `fallenParts`)
- Test: `tests/unit/accessory-painters.test.js`

**Interfaces:**
- Consumes: `rigAnchors` (Task 8), `ACCESSORIES`, `ACCESSORY_SLOTS` (Task 2), resolved look `c` (`c.pal`, `c.cape`, `c.energy`, `c.armor`)
- Produces:
  - Each slot module: `export const PAINTERS = { [itemId]: (A, c) => ({ back?: string, front?: string, glow?: string, head?: string }) }` where `A.pose` is `"standing"|"armed"|"fallen"`
  - `paintAccessories(accessories, A, c) → { back, front, glow, head, replacesCape: boolean }`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/accessory-painters.test.js
import { describe, it, expect } from "vitest";
import { paintAccessories, PAINTERS_BY_SLOT } from "../../src/rendering/svg-art/accessories/index.js";
import { ACCESSORY_SLOTS, ACCESSORIES, DEFAULT_ACCESSORIES } from "../../src/data/accessories.js";
import { buildAgentParts, rigAnchors } from "../../src/rendering/svg-art/agent-rig.js";
import { STAND, ARMED, FALLEN } from "../../src/rendering/svg-art/models/hero.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { cloneLook } from "../../src/core/character-fields.js";

const LOOK = { pal: { primary: "#3a6ea5", accent: "#00e5ff", dark: "#0b1a2a" }, cape: ["#aa3333", "#882222", "#551111", "#220505"], energy: "#00e5ff", armor: "standard" };
const POSES = [[STAND, "standing"], [ARMED, "armed"], [FALLEN, "fallen"]];

describe("accessory painters", () => {
  it("every item has a painter that returns strings in every pose", () => {
    for (const { id: slot } of ACCESSORY_SLOTS) {
      for (const item of ACCESSORIES[slot].slice(1)) {
        const paint = PAINTERS_BY_SLOT[slot][item.id];
        expect(paint, `${slot}.${item.id}`).toBeTypeOf("function");
        for (const [P, pose] of POSES) {
          const out = paint(rigAnchors(P, [0, 0], pose), LOOK);
          const all = Object.values(out).join("");
          expect(all.length, `${slot}.${item.id}/${pose}`).toBeGreaterThan(40);
          expect(all).not.toMatch(/\bid="/);
        }
      }
    }
  });

  it("none paints nothing", () => {
    const out = paintAccessories(DEFAULT_ACCESSORIES, rigAnchors(STAND, [0, 0], "standing"), LOOK);
    expect(out.back + out.front + out.glow + out.head).toBe("");
    expect(out.replacesCape).toBe(false);
  });

  it("the long cloak replaces the armour cape", () => {
    const out = paintAccessories({ ...DEFAULT_ACCESSORIES, back: "cloak" }, rigAnchors(STAND, [0, 0], "standing"), LOOK);
    expect(out.replacesCape).toBe(true);
  });

  it("the agent carries accessory markup", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.accessories = { ...ch.accessories, back: "backpack", helmet: "nvg", legs: "kneepads" };
    const p = buildAgentParts(ch);
    expect(p.back).toContain("data-acc=\"backpack\"");
    expect(p.head).toContain("data-acc=\"nvg\"");
    expect(p.body).toContain("data-acc=\"kneepads\"");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/accessory-painters.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the registry**

```js
// src/rendering/svg-art/accessories/index.js
/**
 * Accessory painters by slot. Each painter takes the rig anchors (with
 * A.pose) and the resolved look and returns markup for the layers it uses:
 * back (behind the torso), front (on the body), glow, head (with the helmet).
 * Every group is tagged data-acc="<id>" for tests and debugging.
 */
import { ACCESSORY_SLOTS } from "../../../data/accessories.js";
import { PAINTERS as back } from "./back.js";
import { PAINTERS as waist } from "./waist.js";
import { PAINTERS as helmet } from "./helmet.js";
import { PAINTERS as arms } from "./arms.js";
import { PAINTERS as neck } from "./neck.js";
import { PAINTERS as legs } from "./legs.js";

export const PAINTERS_BY_SLOT = { back, waist, helmet, arms, neck, legs };
const CAPE_REPLACERS = new Set(["cloak"]);

export function paintAccessories(accessories, A, c) {
  const out = { back: "", front: "", glow: "", head: "", replacesCape: false };
  for (const { id: slot } of ACCESSORY_SLOTS) {
    const itemId = accessories?.[slot];
    if (!itemId || itemId === "none") continue;
    const paint = PAINTERS_BY_SLOT[slot][itemId];
    if (!paint) continue;
    const r = paint(A, c);
    for (const k of ["back", "front", "glow", "head"]) if (r[k]) out[k] += `<g data-acc="${itemId}">${r[k]}</g>`;
    if (slot === "back" && CAPE_REPLACERS.has(itemId)) out.replacesCape = true;
  }
  return out;
}
```

- [ ] **Step 4: Write the back slot (the pattern every slot follows)**

```js
// src/rendering/svg-art/accessories/back.js
/** Back slot. Everything here draws behind the torso (`back`), except glows. */
const f = (n) => Math.round(n * 100) / 100;
const INK = "#0a0d12";
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
/** Fallen art lies on its side: nudge back gear out from under the body. */
const lie = (A, markup) => (A.pose === "fallen" ? `<g transform="translate(-6,4) rotate(-12)">${markup}</g>` : markup);

export const PAINTERS = {
  backpack: (A, c) => {
    const { x, y } = A.back;
    const body = mix(c.pal.dark, "#3a3f35", 0.6);
    return {
      back: lie(A,
        `<path d="M${f(x - 15)},${f(y - 8)} L${f(x + 15)},${f(y - 8)} L${f(x + 17)},${f(y + 24)} L${f(x - 17)},${f(y + 24)} Z" fill="${body}" stroke="${INK}" stroke-width="1.1"/>` +
        `<rect x="${f(x - 12)}" y="${f(y - 14)}" width="24" height="7" rx="3.4" fill="${mix(body, "#8a7a5a", 0.4)}" stroke="${INK}" stroke-width=".9"/>` +
        `<path d="M${f(x - 11)},${f(y + 6)} L${f(x + 11)},${f(y + 6)}" stroke="${mix(body, "#000000", 0.4)}" stroke-width="1.2"/>` +
        `<rect x="${f(x - 16.5)}" y="${f(y + 2)}" width="4" height="12" rx="1.2" fill="${mix(body, "#ffffff", 0.08)}" stroke="${INK}" stroke-width=".8"/>`),
    };
  },
  antenna: (A, c) => {
    const { x, y } = A.back;
    return {
      back: lie(A,
        `<rect x="${f(x - 7)}" y="${f(y - 4)}" width="14" height="18" rx="2" fill="${mix(c.pal.dark, "#2a2f36", 0.5)}" stroke="${INK}" stroke-width="1"/>` +
        `<path d="M${f(x + 4)},${f(y - 4)} L${f(x + 10)},${f(y - 58)}" stroke="#2a2f36" stroke-width="1.4"/>`),
      glow: lie(A, `<circle cx="${f(x + 10)}" cy="${f(y - 58)}" r="1.8" fill="${c.energy}"/><circle cx="${f(x + 2)}" cy="${f(y + 2)}" r="1.2" fill="${c.energy}"/>`),
    };
  },
  blade: (A, c) => {
    const { x, y } = A.back;
    return {
      back: lie(A,
        `<g transform="rotate(-32 ${f(x)} ${f(y)})">` +
        `<rect x="${f(x - 2.6)}" y="${f(y - 44)}" width="5.2" height="66" rx="1.6" fill="#1c1f24" stroke="${INK}" stroke-width="1"/>` +
        `<rect x="${f(x - 6)}" y="${f(y - 46)}" width="12" height="3" rx="1" fill="${mix(c.pal.primary, "#c0c8d0", 0.5)}" stroke="${INK}" stroke-width=".8"/>` +
        `<rect x="${f(x - 1.6)}" y="${f(y - 58)}" width="3.2" height="12" rx="1" fill="#3a2a1c" stroke="${INK}" stroke-width=".8"/></g>`),
    };
  },
  cloak: (A, c) => {
    const { x, y } = A.back;
    const hem = A.pose === "fallen" ? 40 : 96;
    return {
      back:
        `<path d="M${f(x - 20)},${f(y - 14)} C${f(x - 34)},${f(y + 30)} ${f(x - 34)},${f(y + hem - 20)} ${f(x - 28)},${f(y + hem)} ` +
        `L${f(x + 28)},${f(y + hem)} C${f(x + 34)},${f(y + hem - 20)} ${f(x + 34)},${f(y + 30)} ${f(x + 20)},${f(y - 14)} Z" fill="${c.cape[1]}" stroke="${INK}" stroke-width="1.1"/>` +
        `<path d="M${f(x - 12)},${f(y)} C${f(x - 16)},${f(y + 40)} ${f(x - 14)},${f(y + hem - 10)} ${f(x - 12)},${f(y + hem)} M${f(x + 10)},${f(y)} C${f(x + 14)},${f(y + 40)} ${f(x + 12)},${f(y + hem - 10)} ${f(x + 10)},${f(y + hem)}" fill="none" stroke="${c.cape[2]}" stroke-width="1.4"/>`,
    };
  },
};
```

In `buildAgentParts`, after computing `A`:

```js
  const acc = paintAccessories(character?.accessories, A, c);
```

and change the returned layers: `back: kit.back + acc.back`, `body: … existing … + acc.front` (append after `collar`), `glow: … + acc.glow`, `head: h.front + helmBadge + acc.head`. When `acc.replacesCape` is true, set `cape` to `""`. Do the same in `fallenParts` (`under: kit.back + acc.back + …`, `over: … + acc.front`, `glow: … + acc.glow`, head inside `headTf`), using `rigAnchors(FALLEN, [14, -4], "fallen")`.

- [ ] **Step 5: Write the other five slots**

Each file follows `back.js` exactly: same helpers (`f`, `INK`, `mix`), one painter per item, anchors only from `A`, colours only from `c` or fixed materials, every shape outlined in `INK` at 0.8–1.1 width to match the rig's ink weight, fallen pose handled by reading `A.pose`. Glows (energy colours) go in `glow`; everything on the helmet goes in `head`; everything else in `front`.

| Slot / item | Anchor | Layer | Geometry (rig units) | Colours |
|---|---|---|---|---|
| waist / `belt` | `A.belt` | front | 38×5 band centred on anchor; 4 pouches 6×7 at x = ±9, ±16; buckle 4×4 at centre | band `mix(c.pal.dark,"#3a3226",.5)`, pouches `+0.1 white`, buckle brass `#d9a441` |
| waist / `holster` | `A.hipR` | front | strap 4 wide from belt down 18; holster 7×16 rounded 2, pistol grip 4×6 poking out the top | leather `#3a2a1c`, grip `#1c1f24` |
| waist / `grenades` | `A.belt` | front | webbing strap 38×4; 5 canisters r=2.6 at x = -12..12 step 6, y+4 | webbing `#4a4f2a`, canisters `#5a6a3a`, caps `#1c1f24` |
| waist / `canister` | `A.hipL` | front + glow | cylinder 6×12 rx 2 at anchor; glow window 3×7 | shell `#2a2f36`; glow `c.energy` |
| helmet / `nvg` | `A.browL` | head | mount plate 6×3 on brow; 4 tubes r=1.4 in a 2×2 at y-5 (flipped up) | `#1c1f24`, lenses `#3a6a5a` |
| helmet / `whip` | `A.sideL` | head + glow | base 3×4; whip path to (x-3, y-38), stroke 0.9 | base `#2a2f36`; tip r=1 `c.energy` in glow |
| helmet / `lamp` | `A.sideL` | head + glow | housing 6×4 rx 1.5; lens r=1.5 at the front | housing `#2a2f36`; lens `#fff4c8` in glow |
| helmet / `plume` | `A.crown` | head | 9 curved strokes fanning back from anchor, length 16–24, width 1.6 | `c.cape[0]` → `c.cape[2]` alternating |
| arms / `gauntlets` | `A.forearmL` and `A.forearmR` | front | plate 9×12 rotated to `A.forearmL.rot`, 3 ridge lines | `mix(c.pal.primary,"#000000",.25)` |
| arms / `screen` | `A.forearmL` | front + glow | housing 8×6 rx 1; screen 6×4 | housing `#1c1f24`; screen `c.energy` at .8 opacity in glow |
| arms / `launcher` | `A.forearmL` | front | tube 4×12 along the forearm, muzzle ring r=2.2 | `#2a2f36`, ring brass `#d9a441` |
| neck / `scarf` | `A.neck` | front | wrap 18×6 around the gorget; tail hanging to y+18 on the left | `c.cape[1]`, folds `c.cape[2]` |
| neck / `tags` | `A.neck` | front | chain path dropping to y+14; two tags 3×5 rx 1 offset 1.5 | chain `#a8b4c0`, tags `#d8dde4` |
| neck / `bandolier` | `A.neck` → `A.hipR` | front | diagonal strap 5 wide from left shoulder to right hip; 7 shells 2×4 along it | strap `#3a2a1c`, shells brass `#d9a441` |
| legs / `kneepads` | `A.kneeL`, `A.kneeR` | front | domed pad 9×8 rx 3 on each knee, strap lines above and below | `mix(c.pal.dark,"#2a2f36",.4)` |
| legs / `thigh` | `A.hipR` | front | two straps at y+8, y+14; pouch 8×10 rx 1.5 | `#3a2a1c`, pouch `#4a4f2a` |
| legs / `shins` | `A.kneeL`, `A.kneeR` | front | greave 8×22 from knee down along the shin, 2 rivets | `mix(c.pal.primary,"#000000",.3)`, rivets `#c0c8d0` |

For the fallen pose, items on the legs and arms use the same anchors (they already follow `FALLEN` joints); helmet items render inside `headTf` because they are returned as `head`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/accessory-painters.test.js && npx vitest run`
Expected: PASS.

- [ ] **Step 7: Visual check**

With the dev server open on the creator, set each slot in turn from the console (`ccDebug.game.character.accessories = {...}` then `document.querySelector("agent-showroom").renderAll()`). Screenshot all six slots filled, in Comic and Modern, standing and armed (Loadout tab). Check nothing floats off the body; fix anchor offsets in `rigAnchors`, not in painters.

- [ ] **Step 8: Commit**

```bash
git add src/rendering/svg-art/accessories src/rendering/svg-art/agent-rig.js tests/unit/accessory-painters.test.js
git commit -m "feat(gear): paint six accessory slots on the agent in every pose"
```

---

### Task 10: Armour variants on the rig

**Files:**
- Modify: `src/rendering/svg-art/agent-rig.js` (`resolve`, `bodyMap`, `buildAgentParts`, `fallenParts`)
- Test: `tests/unit/agent-rig-badges.test.js` (append)

**Interfaces:**
- Consumes: `ARMOR_STYLES[i].variant` (Task 3)
- Produces: `resolve(ch).variant` = the variant object or `null`; a `variantTrim(c)` overlay string in `body` when worn

- [ ] **Step 1: Write the failing test**

```js
import { ARMOR_STYLES } from "../../src/data/cosmetics.js";

describe("armour variants", () => {
  it("wearing a variant adds its trim and changes the markup", () => {
    const base = cloneLook(DEFAULT_CHARACTER);
    const v = cloneLook(DEFAULT_CHARACTER);
    v.armorVariant = 1;
    const a = buildAgentParts(base).body;
    const b = buildAgentParts(v).body;
    expect(b).not.toBe(a);
    expect(b.toLowerCase()).toContain(ARMOR_STYLES[0].variant.trim.toLowerCase());
    expect(b).toContain('data-variant="');
  });

  it("heavy wear adds scratches", () => {
    const i = ARMOR_STYLES.findIndex((x) => x.variant.wear >= 0.8);
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.armorIndex = i;
    ch.armorVariant = 1;
    expect(buildAgentParts(ch).body).toContain('class="ag-wear"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/agent-rig-badges.test.js`
Expected: FAIL — `data-variant` not found.

- [ ] **Step 3: Implement**

In `resolve(ch)` add `variant: ch.armorVariant ? pick(ARMOR_STYLES, ch.armorIndex).variant || null : null,`.

Add next to `chestTrim`:

```js
/** Variant overlay: trim stripes along the existing chest seams and, with wear, scratches. */
function variantTrim(c) {
  const v = c.variant;
  if (!v) return "";
  let out =
    `<g data-variant="${v.id}">` +
    line("M-15.2,-49.6 C-11,-45 -5,-45.2 -1.2,-47.6", v.trim, 0.9, 0.95) +
    line("M15.2,-49.6 C11,-45 5,-45.2 1.2,-47.6", v.trim, 0.9, 0.95) +
    line("M-12,-30 L12,-30", v.trim, 0.7, 0.8);
  if (v.wear > 0.3) {
    const n = Math.round(v.wear * 8);
    let d = "";
    for (let i = 0; i < n; i++) {
      const x = -14 + ((i * 37) % 28);
      const y = -52 + ((i * 23) % 30);
      d += `M${x},${y} l${2 + (i % 3)},${1 + (i % 2)} `;
    }
    out += `<path class="ag-wear" d="${d}" stroke="#c8ccd0" stroke-width=".35" opacity="${f(0.25 + v.wear * 0.35)}" fill="none"/>`;
  }
  return out + `</g>`;
}
```

Insert `variantTrim(c) +` directly after `chestTrim(c) +` in both `buildAgentParts` and `fallenParts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/agent-rig-badges.test.js && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/rendering/svg-art/agent-rig.js tests/unit/agent-rig-badges.test.js
git commit -m "feat(creator): draw earned armour variants with trim and wear"
```

---

### Task 11: Rebuild caches on the new look fields

**Files:**
- Modify: `src/rendering/svg-art/index.js:61-68` (`CAST_FIELDS`, `castHashOf`)
- Modify: `src/ui/portrait-modern.js:29-50` (`CHAR_FIELDS`, `characterLayers`)
- Modify: `js/components/agent-showroom.js:1686,1830` (render signatures)

**Interfaces:**
- Consumes: `lookKey` (Task 5)

- [ ] **Step 1: Replace hand-rolled hashes with `lookKey`**

`src/rendering/svg-art/index.js`:

```js
import { lookKey } from "../../core/character-fields.js";
const castHashOf = (ch) => lookKey(ch);
```

Delete `CAST_FIELDS`. Where the cast snapshots the look (`castLook`), take `cloneLook(ch)` (import from `character-fields.js`) instead of a shallow copy so later edits to `ch.badge` cannot mutate the snapshot.

`src/ui/portrait-modern.js`: delete `CHAR_FIELDS`, import `lookKey`, and use `const key = lookKey(c);` in `characterLayers`.

`js/components/agent-showroom.js`: at line ~1686 replace the `APPEARANCE.concat([...]).map((k) => ch[k]).join(",")` part with `lookKey(ch)`; at line ~1830 replace `APPEARANCE.map((k) => ch[k]).join(",")` with `lookKey(ch)`.

- [ ] **Step 2: Verify**

Run: `npx vitest run`
Expected: PASS.

Run the cutscene check in the browser: set a badge and accessories on `ccDebug.game.character`, then start the intro cutscene (`ccDebug.startCampaign(0, 1)` shows the hero in the first scene). Expected: the cast agent wears them.

- [ ] **Step 3: Commit**

```bash
git add src/rendering/svg-art/index.js src/ui/portrait-modern.js js/components/agent-showroom.js
git commit -m "fix(art): rebuild cast, portrait and showroom when badge or gear change"
```

---

### Task 12: Showroom field plumbing and icon tab bar

**Files:**
- Modify: `js/components/agent-showroom.js` (`pick`, `effective`, `setPreview`, `choose`, `commit`, `undo`, `reset`, `randomize`, `renderPreviewLabels`, `optionHtml`, `lockInfoHtml`, tab bar CSS)
- Create: `tests/customization.spec.js`

**Interfaces:**
- Consumes: `getIndex`, `withIndex`, `cloneLook`, `tableFor`, `isVirtualKey` (Task 5); `unlockState` for virtual keys (Task 6)
- Produces: sections may use virtual keys (`badge.symbol`, `acc.back`, …); every read of `this.character[key]` for a section goes through `getIndex`, every write through `withIndex`

- [ ] **Step 1: Write the failing browser test**

```js
// tests/customization.spec.js
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

async function openCreator(page) {
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) {} });
  await loadGame(page);
  await debug(page, "showCharacterCreate");
  await page.waitForTimeout(700);
}

const tab = (page, id) => page.locator("agent-showroom").locator(`#tab-${id}`);
const opt = (page, key, idx) => page.locator("agent-showroom").locator(`.opt[data-key="${key}"][data-idx="${idx}"]`);

test("undo restores badge after symbol change", async ({ page }) => {
  await openCreator(page);
  await tab(page, "badge").click();
  await page.locator("agent-showroom").locator('[data-mode="configure"]').click();
  const before = await page.evaluate(() => JSON.stringify(window.ccDebug.game.character.badge));
  await opt(page, "badge.symbol", 3).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.layers[0].symbol)).toBe("star");
  await page.keyboard.press("KeyZ");
  expect(await page.evaluate(() => JSON.stringify(window.ccDebug.game.character.badge))).toBe(before);
});

test("gear choice persists across reload", async ({ page }) => {
  await openCreator(page);
  await tab(page, "gear").click();
  await opt(page, "acc.back", 1).click();
  await page.locator("agent-showroom").locator("#save").click();
  await page.reload();
  await page.waitForFunction(() => window.ccDebug?.game);
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories.back)).toBe("backpack");
});

test("no console errors across the new tabs", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await openCreator(page);
  for (const id of ["gear", "badge", "suit"]) {
    await tab(page, id).click();
    await page.waitForTimeout(200);
  }
  expect(errors).toEqual([]);
});
```

Check `tests/helpers.js` for `loadGame`/`debug`, and the showroom markup for the real tab id and save-button id (`grep -n 'id="tab-\|id="save' js/components/agent-showroom.js`); adjust the selectors above to match.

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/customization.spec.js`
Expected: FAIL — `#tab-badge` does not exist.

- [ ] **Step 3: Route section reads and writes through `character-fields`**

In `agent-showroom.js`:

```js
import { getIndex, withIndex, cloneLook } from "../../src/core/character-fields.js";
```

- `pick(ch)`: `return cloneLook(Object.fromEntries(FIELDS.map((k) => [k, ch[k]])));`
- `effective()`: `const ch = this.pick(this.character); if (this.preview) Object.assign(ch, withIndex(ch, this.preview.key, this.preview.value)); return ch;`
- `setPreview(p)`: replace `this.character[p.key] === p.value` with `getIndex(this.character, p.key) === p.value`.
- `choose(key, idx, el)`: replace `this.character[key] === idx` with `getIndex(this.character, key) === idx`, and `this.commit({ [key]: idx })` with `this.commit(withIndex(this.character, key, idx))`.
- `commit(changes)`: the "nothing changed" check becomes `if (!Object.keys(changes).some((k) => JSON.stringify(ch[k]) !== JSON.stringify(changes[k]))) return false;`.
- `undo()`: `Object.assign(this.character, cloneLook(prev));`.
- `hasChanges()` (line ~984): compare with `JSON.stringify` per key for the same reason.
- `renderPreviewLabels()`: `const idx = previewing ? this.preview.value : getIndex(this.character, s.key);`.
- Wherever `aria-checked` is set from `this.character[s.key]` (search `aria-checked`), use `getIndex(this.effective?.() ?? this.character, s.key)` consistently with how it reads today.
- `reset()`: also commit `badge: structuredClone(DEFAULT_CHARACTER.badge)`, `accessories: { ...DEFAULT_CHARACTER.accessories }`, `armorVariant: 0`.
- `randomize()`: replace the `badgeIndex` line with a badge built from unlocked options (`const unlocked = (key, table) => table.map((_, i) => i).filter((i) => unlockState(key, i, this.unlockCtx()).unlocked);` then pick symbol/frame/enamel/metal from those; placements `["chest"]` 85% of the time, `[]` otherwise; finish `"auto"`), and add `accessories` choosing each slot's unlocked item or `none` with 50% probability. Keep `badgeIndex` untouched.

`APPEARANCE` stays for reset/randomize bookkeeping; add `"armorVariant"` to it.

- [ ] **Step 4: Icon-only tab bar**

Add icons to `I` for the two new tabs:

```js
  gear: `<svg viewBox="0 0 24 24"><path d="M7 4h10l2 4v12H5V8Z"/><path d="M9 4v4h6V4M9 13h6"/></svg>`,
  badge: `<svg viewBox="0 0 24 24"><path d="M12 3 19 6v6c0 4-3 7-7 9-4-2-7-5-7-9V6Z"/><circle cx="12" cy="11.5" r="3"/></svg>`,
```

In the tab bar CSS, hide the text label by default and show it on hover/focus, so seven tabs fit (find the `.tab` rules with `grep -n "\.tab " js/components/agent-showroom.js`):

```css
.tab .t { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.tab:hover .t, .tab:focus-visible .t, .tab[aria-selected="true"] .t { position: static; width: auto; height: auto; clip: auto; }
```

(Use the tab's real label class name.)

- [ ] **Step 5: Run the unit suite**

Run: `npx vitest run`
Expected: PASS. The Playwright spec still fails until Task 13 adds the tabs.

- [ ] **Step 6: Commit**

```bash
git add js/components/agent-showroom.js tests/customization.spec.js
git commit -m "refactor(creator): route showroom edits through character field accessors"
```

---

### Task 13: Showroom Badge tab, Gear tab and variant toggle

**Files:**
- Modify: `js/components/agent-showroom.js` (`CATEGORIES`, `sectionHtml`, `optionHtml`, click handling, CSS, presets, camera yaw)

**Interfaces:**
- Consumes: Tasks 1, 2, 5, 6, 7, 12
- Produces: tabs `gear` and `badge` in `CATEGORIES`; section kinds `badgeHero`, `badgePreset`, `symbol`, `frame`, `enamel`, `metal`, `finish`, `placement`, `gear`; `data-mode` chips `library`/`configure`/`editor`

- [ ] **Step 1: Add the categories**

```js
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS, BADGE_PRESETS } from "../../src/data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES } from "../../src/data/accessories.js";
import { renderBadge, resolveTreatment } from "../../src/rendering/svg-art/insignia/compose.js";
import { togglePlacement, getIndex } from "../../src/core/character-fields.js";
import { variantState } from "../../src/systems/unlocks.js";
```

Insert after the `helmet` category:

```js
  {
    id: "gear",
    label: "Gear",
    sections: ACCESSORY_SLOTS.map(({ id, name }) => ({ key: `acc.${id}`, title: name, data: ACCESSORIES[id], kind: "gear", yaw: id === "back" ? 0.75 : 0 })),
  },
  {
    id: "badge",
    label: "Badge",
    camera: "torso",
    modes: {
      library: [{ type: "badgeHero" }, { key: "badge.preset", title: "Library", data: BADGE_PRESETS, kind: "badgePreset", groupBy: "set" }],
      configure: [
        { type: "badgeHero" },
        { key: "badge.symbol", title: "Symbol", data: SYMBOLS, kind: "symbol", groupBy: "set" },
        { key: "badge.frame", title: "Frame", data: FRAMES, kind: "frame" },
        { key: "badge.enamel", title: "Enamel", data: ENAMELS, kind: "enamel" },
        { key: "badge.metal", title: "Metal", data: METALS, kind: "metal" },
        { key: "badge.finish", title: "Finish", data: FINISHES, kind: "finish" },
        { type: "placement", title: "Placement" },
      ],
    },
    sections: [],
  },
```

Add `this.badgeMode = "library"` in the constructor. Wherever the code reads `cat.sections`, use a helper `sectionsOf(cat) => cat.modes ? cat.modes[this.badgeMode] : cat.sections`; `sectionFor(key)` searches every category's `sections` and every mode list.

- [ ] **Step 2: Render the new section kinds**

In `sectionHtml(s)`, before the generic branch:

```js
    if (s.type === "badgeHero") {
      const ch = this.effective();
      const art = renderBadge(ch.badge, { treatment: resolveTreatment(ch) });
      const modes = ["library", "configure", "editor"].map((m) =>
        `<button class="chip${this.badgeMode === m ? " on" : ""}" data-mode="${m}"${m === "editor" ? ' aria-disabled="true" title="Coming soon"' : ""}>${m[0].toUpperCase() + m.slice(1)}</button>`).join("");
      return `<div class="section badge-hero" data-section="badgeHero"><svg viewBox="-54 -54 108 108" aria-hidden="true">${art}</svg><div class="modes" role="group" aria-label="Badge mode">${modes}</div></div>`;
    }
    if (s.type === "placement") {
      const on = this.effective().badge.placements;
      const chips = PLACEMENTS.map((p) =>
        `<button class="chip${on.includes(p.id) ? " on" : ""}" role="checkbox" aria-checked="${on.includes(p.id)}" data-placement="${p.id}">${p.name}</button>`).join("");
      return `<div class="section" data-section="placement"><h3><span>${s.title}</span></h3><div class="chips">${chips}</div></div>`;
    }
```

For `groupBy`, render the grid in groups with a small caption per group value (`faction`, `rank`, `act`, `earned`, `classic`), each caption in the existing `.caption` style.

In `optionHtml`, add cases (the Badge tab renders every tile at 44×44 minimum):

```js
      case "badgePreset":
      case "symbol": {
        const ch = this.effective();
        const badge = s.kind === "badgePreset"
          ? { ...item.badge, placements: ["chest"] }
          : { ...ch.badge, layers: [{ ...ch.badge.layers[0], symbol: item.id }] };
        return `<button ${attrs} aria-label="${esc(label)}" title="${esc(item.name)}">${tick}<svg class="badge-tile" viewBox="-54 -54 108 108" aria-hidden="true">${renderBadge(badge, { treatment: resolveTreatment(ch), detail: "low" })}</svg><span class="oname">${esc(item.name)}</span></button>`;
      }
      case "frame": {
        const ch = this.effective();
        const badge = { ...ch.badge, layers: [{ ...ch.badge.layers[0], frame: item.id }] };
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<svg class="badge-tile" viewBox="-54 -54 108 108" aria-hidden="true">${renderBadge(badge, { treatment: resolveTreatment(ch), detail: "low" })}</svg><span class="oname">${esc(item.name)}</span></button>`;
      }
      case "enamel":
        return `<button ${attrs} aria-label="${esc(label)}" title="${esc(item.name)}"><span class="swatch" style="--c:${item.color}"></span><span class="oname">${esc(item.name)}</span></button>`;
      case "metal":
        return `<button ${attrs} aria-label="${esc(label)}" title="${esc(item.name)}"><span class="swatch" style="background:linear-gradient(135deg, ${item.ramp[0]}, ${item.ramp[1]} 45%, ${item.ramp[2]})"></span><span class="oname">${esc(item.name)}</span></button>`;
      case "finish": {
        const ch = this.effective();
        const note = item.id === "auto" ? ` · ${resolveTreatment(ch).finish}` : "";
        return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="oname">${esc(item.name + note)}</span></button>`;
      }
      case "gear": {
        if (item.id === "none") return `<button ${attrs} aria-label="${esc(label)}">${tick}<span class="oname" style="color:var(--faint)">None</span></button>`;
        const ch = { ...this.effective(), accessories: { ...this.effective().accessories, [s.key.slice(4)]: item.id } };
        const thumb = this.thumb(ch, s.key.slice(4) === "helmet" ? "head" : "torso");
        return `<button ${attrs} aria-label="${esc(label)}">${tick}${thumb}${tier}<span class="oname">${esc(item.name)}</span>${item.perk ? `<span class="perk">${esc(item.perk)}</span>` : ""}</button>`;
      }
```

`this.thumb(ch, view)` is the existing thumbnail helper the `torso`/`head` kinds use (find it with `grep -n "thumb\|AGENT_VIEW.torso" js/components/agent-showroom.js`); pass the modified character so the tile shows the item. If the helper takes a key/index pair instead, render with `buildAgentSvg(ch, { view: AGENT_VIEW.torso, idPrefix: \`g${s.key}${i}\`, realistic: this._real })` directly.

- [ ] **Step 3: Wire clicks and keys**

In the click handler (around line 1066) add before the `data-idx` branch:

```js
    if (t.dataset.mode) {
      if (t.dataset.mode === "editor") return this.toast("Badge editor: coming soon");
      this.badgeMode = t.dataset.mode;
      this.sfx("menuSelect");
      return this.renderContent();
    }
    if (t.dataset.placement) {
      this.commit(togglePlacement(this.character, t.dataset.placement));
      this.sfx("menuSelect");
      return this.announce(`Badge ${this.character.badge.placements.includes(t.dataset.placement) ? "on" : "off"}: ${t.dataset.placement}`);
    }
```

Make `.chip[data-mode]` and `.chip[data-placement]` part of `navItems()` (add `.content .chip` to its selector) so keyboard and gamepad reach them; Enter/Space on a focused chip calls `.click()` (the existing activation path already does this for `.opt` — extend the same branch).

Gear yaw: in `setPreview`/`choose`, if the section has `yaw`, call `this.setYaw(section.yaw)`; when the preview clears, restore the previous yaw.

- [ ] **Step 4: Variant toggle on the Suit tab**

After the Armor section's grid, render:

```js
    if (s.key === "armorIndex") {
      const ch = this.effective();
      const v = ARMOR_STYLES[ch.armorIndex].variant;
      const st = variantState(ch.armorIndex, this.unlockCtx());
      const lock = st.unlocked ? "" : `<span class="lock caption amber">${I.lock}${esc(st.hint)}</span>`;
      return base + `<div class="variant" role="radiogroup" aria-label="Armour variant">` +
        `<button class="chip${ch.armorVariant ? "" : " on"}" role="radio" aria-checked="${!ch.armorVariant}" data-variant="0">Standard</button>` +
        `<button class="chip${ch.armorVariant ? " on" : ""}${st.unlocked ? "" : " locked"}" role="radio" aria-checked="${!!ch.armorVariant}" data-variant="1">${esc(v.name)}</button>${lock}</div>`;
    }
```

(`base` is the section markup the function would otherwise return.) Click handler: `data-variant` → if `1` and locked, shake + toast the hint as `choose()` does; otherwise `this.commit({ armorVariant: Number(t.dataset.variant) })`.

- [ ] **Step 5: Presets**

Give each entry in `PRESETS` a `badge` and `accessories` (and keep `badgeIndex` for the Legacy path until Task 14 removes the dependency):

| Preset | badge preset id | placements | accessories |
|---|---|---|---|
| Regulation | `p_clock` | chest, shoulder | waist `belt`, neck `tags` |
| Juggernaut | `p_skull` | chest | back `backpack`, legs `kneepads` |
| Ghost | `p_eye` | chest | helmet `nvg`, waist `holster` |
| Engineer | `p_bolt` | chest, forearm | arms `screen`, waist `belt` |
| Howitzer | `p_skull` | chest, shoulder | back `backpack`, neck `bandolier` |
| Breaker | `p_star` | chest | legs `shins`, arms `gauntlets` |
| Reliquary | `p_shield` | chest, helmet | back `cloak`, helmet `plume` |
| Pathfinder | `p_rift` | chest | back `antenna`, neck `scarf` |

Build each preset's `badge` from `BADGE_PRESETS` (`structuredClone(byId(BADGE_PRESETS, id).badge)` plus `placements`). When applying a preset, run the result through `sanitizeLocked` so locked items fall back rather than equipping.

- [ ] **Step 6: CSS**

Add rules for `.badge-hero svg { width: 160px; height: 160px; }`, `.badge-tile { width: 44px; height: 44px; }`, `.chip`, `.chip.on`, `.chips`, `.perk`, `.variant` using existing tokens (`var(--accent)`, `var(--faint)`, the `--r-*` tokens under `:host([realistic])`). Mirror each rule under `:host([realistic])` where the existing file does so for similar components. Add `@media (prefers-reduced-motion: reduce)` to any new transition.

- [ ] **Step 7: Run tests**

Run: `npx vitest run && npx playwright test tests/customization.spec.js`
Expected: all PASS.

- [ ] **Step 8: Visual check and screenshots**

Capture the Badge tab (Library and Configure), the Gear tab, and the Suit tab with a variant, at 1280×720 and 390×844, in Comic and Modern. Check: seven tabs fit on one row; locked tiles show the rule and progress; the big badge updates while hovering tiles.

- [ ] **Step 9: Commit**

```bash
git add js/components/agent-showroom.js
git commit -m "feat(creator): add Badge and Gear tabs and armour variant toggle"
```

---

### Task 14: Legacy creator parity

**Files:**
- Modify: `src/ui/character-creator.js` (`CREATOR_CATEGORIES`, option rendering, badge drawing at ~528-590)
- Modify: `src/systems/input-dispatch.js:184-230` (creator keys), `src/systems/input-click-dispatch.js` (creator clicks)
- Test: `tests/customization.spec.js` (append)

**Interfaces:**
- Consumes: `getIndex`, `withIndex`, `tableFor`, `togglePlacement` (Task 5); `renderBadge`, `resolveTreatment` (Task 7); `getLayerImage` (`svg-art/raster.js`); `buildAgentParts`
- Produces: Legacy tabs `BADGE` (symbol, frame, enamel, metal, finish, placement) and `GEAR` (six slots)

- [ ] **Step 1: Write the failing browser test**

```js
test("legacy creator edits badge and gear", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem("cc_settings", JSON.stringify({ artStyle: 0 })); } catch (_) {} });
  await loadGame(page);
  await debug(page, "showCharacterCreate");
  await page.waitForTimeout(500);
  const cats = await page.evaluate(async () => (await import("/src/ui/character-creator.js")).CREATOR_CATEGORIES.map((c) => c.name));
  expect(cats).toEqual(expect.arrayContaining(["BADGE", "GEAR"]));
  await page.evaluate(async () => {
    const { CREATOR_CATEGORIES } = await import("/src/ui/character-creator.js");
    window.ccDebug.game.creatorCategory = CREATOR_CATEGORIES.findIndex((c) => c.key === "badge.symbol");
  });
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.placements)).toEqual(["chest"]);
  await page.screenshot({ path: "screenshots/legacy-badge.png" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test tests/customization.spec.js -g legacy`
Expected: FAIL — categories do not include `GEAR`.

- [ ] **Step 3: Categories**

Replace the `BADGE` entry in `CREATOR_CATEGORIES` with the badge sub-fields and add the gear slots. Each entry keeps the existing `{name, shortLabel, data, key}` shape:

```js
  { name: "BADGE", shortLabel: "BDGE", data: SYMBOLS, key: "badge.symbol" },
  { name: "FRAME", shortLabel: "FRM", data: FRAMES, key: "badge.frame" },
  { name: "ENAMEL", shortLabel: "ENML", data: ENAMELS, key: "badge.enamel" },
  { name: "METAL", shortLabel: "MTL", data: METALS, key: "badge.metal" },
  { name: "FINISH", shortLabel: "FIN", data: FINISHES, key: "badge.finish" },
  { name: "PLACE", shortLabel: "PLC", data: PLACEMENTS, key: "badge.placement", multi: true },
  { name: "GEAR", shortLabel: "GEAR", data: ACCESSORIES.back, key: "acc.back", slots: ACCESSORY_SLOTS },
```

For `GEAR`, left/right inside the category (with Shift held) cycles `slot` through `ACCESSORY_SLOTS`, updating `data` and `key` on a per-game `game.creatorGearSlot` index; plain up/down picks items. `getCreatorLayout` already sizes tabs from `CREATOR_CATEGORIES.length`; confirm with a screenshot at 1280×720 and 390×844 that the extra tabs still fit (the layout clamps tab width; if labels overflow, use `shortLabel` below 1100px width).

- [ ] **Step 4: Reads and writes through `character-fields`**

In `input-dispatch.js` creator branch, replace every `game.character[curCat.key]` read with `getIndex(game.character, curCat.key)` and every write `game.character[curCat.key] = next` with `Object.assign(game.character, withIndex(game.character, curCat.key, next))`. For `curCat.multi` (placements), up/down moves a highlight `game.creatorPlacementSel` and Enter/Space applies `togglePlacement`. Make the same change in `input-click-dispatch.js` and in `character-creator.js` wherever it reads the selected index for drawing.

- [ ] **Step 5: Draw with the shared SVG**

Delete the Unicode badge map and pulsing circle (~528-590). Replace with a raster of the composed badge:

```js
import { getLayerImage } from "../rendering/svg-art/raster.js";
import { renderBadge, resolveTreatment } from "../rendering/svg-art/insignia/compose.js";
import { lookKey } from "../core/character-fields.js";

function drawBadge(ctx, ch, x, y, size) {
  if (!ch.badge?.placements?.length) return;
  const markup = renderBadge(ch.badge, { treatment: resolveTreatment(ch) });
  const img = getLayerImage(`legacy-badge:${lookKey(ch)}`, [-54, -54, 108, 108], "", markup, size / 108);
  if (img) ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}
```

Use `drawBadge` where the old badge circle was drawn. For option tiles in the BADGE/FRAME categories, draw each option's badge the same way with a tile-specific id. For GEAR tiles and the large preview figure, rasterize `buildAgentParts(ch)` layers through `getLayerImage` the way `portrait-modern.js` `characterLayers` does (copy that pattern; ids prefixed `legacy-`). `getLayerImage` returns `null` until decoded — draw nothing that frame; the creator redraws every frame.

- [ ] **Step 6: Run tests**

Run: `npx vitest run && npx playwright test tests/customization.spec.js`
Expected: all PASS. Open `screenshots/legacy-badge.png` and check the badge renders.

- [ ] **Step 7: Commit**

```bash
git add src/ui/character-creator.js src/systems/input-dispatch.js src/systems/input-click-dispatch.js tests/customization.spec.js
git commit -m "feat(creator): bring badges and gear to the Legacy creator"
```

---

### Task 15: Unlock toasts and final verification

**Files:**
- Modify: `src/ui/unlock-toast.js` (only if it formats ids itself)
- Modify: `tests/customization.spec.js` (screenshots)

- [ ] **Step 1: Toast names for new ids**

Run `grep -n "describeId\|split(\":\")" src/ui/unlock-toast.js`. If the toast only calls `describeId`, nothing to change (Task 6 taught `describeId` the `#id` and `armorVariant` forms). If it parses ids itself, replace that with `describeId(id)`.

Add a unit test to `tests/unit/unlocks.test.js`:

```js
it("describeId names id-based unlocks", () => {
  expect(describeId("badge.symbol:#lordslayer")).toMatchObject({ kind: "Badge symbol", name: "Lord Slayer" });
  expect(describeId("acc.back:#antenna").name).toBe("Rift Antenna");
  expect(describeId(`armorVariant:#${ARMOR_STYLES[0].variant.id}`).kind).toBe("Armour variant");
});
```

Run: `npx vitest run tests/unit/unlocks.test.js` — PASS.

- [ ] **Step 2: Screenshot sweep in three styles**

Append to `tests/customization.spec.js`:

```js
for (const [style, name] of [[0, "legacy"], [1, "comic"], [2, "modern"]]) {
  test(`full look screenshot ${name}`, async ({ page }) => {
    await page.addInitScript((s) => { try { localStorage.clear(); localStorage.setItem("cc_settings", JSON.stringify({ artStyle: s })); } catch (_) {} }, style);
    await loadGame(page);
    await debug(page, "showCharacterCreate");
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      const g = window.ccDebug.game;
      const m = await import("/src/systems/unlocks.js");
      for (const it of m.lockedItems(m.gameUnlockContext(g, { fresh: true }))) m.grantOwned(it.key, it.index);
      g.character.badge = { layers: [{ frame: "shield", symbol: "guard", enamel: "oxblood", metal: "brass", x: 0, y: 0, scale: 1, rot: 0 }], finish: "auto", placements: ["chest", "shoulder", "helmet"] };
      g.character.accessories = { back: "backpack", waist: "belt", helmet: "nvg", arms: "screen", neck: "scarf", legs: "kneepads" };
      document.querySelector("agent-showroom")?.renderAll?.();
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `screenshots/custom-${name}.png` });
  });
}
```

Check `lockedItems` returns virtual keys too; if it only walks `LOCKABLE` indices it will (Task 6 added the keys).

Run: `npx playwright test tests/customization.spec.js`
Expected: PASS; open the three screenshots and check every item is on the body and badges read clearly.

- [ ] **Step 3: Cutscene and fallen pose**

In the browser, equip badges and accessories, then trigger the fallen hero (the origin comic uses `hero_fallen`; start it with `ccDebug` or the campaign intro). Screenshot. Expected: badges on chest and shoulder, back gear visible beside the body, no floating parts.

- [ ] **Step 4: Full suites**

Run:

```bash
npx vitest run
npx playwright test tests/smoke.spec.js tests/suits.spec.js tests/customization.spec.js
npm run build
```

Expected: all pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/ui/unlock-toast.js tests/unit/unlocks.test.js tests/customization.spec.js
git commit -m "test(creator): cover badge and gear unlock toasts and three-style captures"
```

---

## Self-Review Notes

- Spec coverage: data model (Tasks 1–3), save and migration (4), accessors for the index-based UIs (5), unlocks including acts and variants (6), composer and finishes (7), placements and realistic keep list (8), accessory painters and cape replacement (9), variants (10), cache keys for cast/portrait/showroom (11), showroom UI (12–13), Legacy parity (14), toasts and verification (15). Stage 2 editor is out of scope; the "Editor" chip shows "Coming soon" (Task 13).
- Deviation from the spec, stated here for the reviewer: the seven classic symbols are free rather than grandfathered, which gives existing players the same result with less machinery; accessory perks add no new stats because the game has no grenade or weapon-swap stat to attach them to.
- Art geometry for 26 of the 30 accessories is specified as a table (Task 9, Step 5) rather than finished markup; the painter contract, helpers and a full slot (`back.js`) are given in code, and the per-item table fixes anchor, layer, size and colours.
