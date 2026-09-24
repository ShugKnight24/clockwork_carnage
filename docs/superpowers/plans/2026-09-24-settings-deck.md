# Settings Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canvas settings and controls screens with an HTML settings deck beside a live game view (the paused match, or a showcase flythrough from the menu), with full keyboard and controller remapping.

**Architecture:** Pure modules carry the logic (section mapping, deck navigation state, showcase camera path, remap rules) and are unit-tested in node. A `<settings-deck>` custom element, mounted like `<agent-showroom>`, renders those modules as DOM and receives keys through the game's own dispatch. `src/systems/showcase.js` borrows the game's map/entities/player for a sandboxed scene and restores them exactly on close.

**Tech Stack:** Vanilla JS ES modules (no bundler at runtime on GitHub Pages; literal `import()` paths only), custom elements with shadow DOM, vitest (node env) for units, Playwright for browser checks.

**Spec:** `docs/superpowers/specs/2026-09-24-settings-deck-design.md`

## Global Constraints

- No new dependencies. Runtime code must work unbundled from the repo root (GitHub Pages) and through Vite; dynamic imports use literal paths.
- Match the surrounding code: 2-space indent, double quotes in `js/components/*` and `src/ui/*` files that use them, comments explain *why*, sparingly.
- `cc_settings` keys and meaning are unchanged. Controller bindings persist in `localStorage` key `cc_padbinds`. Keyboard bindings keep `InputManager.saveKeybinds()` storage.
- Esc (keyboard) and Start / MENU (pad index 9) are reserved for pause and can never be bound to another action. Menu navigation (d-pad / left stick, A confirm, B back, LB/RB tab) is fixed.
- Every pointer target is at least 44 px. No `backdrop-filter`, `filter` or `transform` on an ancestor of the live canvas; the panel is a solid translucent surface.
- Three skins: Legacy (`html[data-art-profile="legacy"]`), Comic (`"modern"`), Modern (`"realistic"`). One DOM, one behaviour.
- Accessibility contract: sections `role="tablist"`/`tab` (`aria-selected`, `aria-controls`) + `role="tabpanel"`; toggles `role="switch"` + `aria-checked`; sliders `role="slider"` + `aria-valuenow/min/max/valuetext`; steppers are two labelled buttons around a value; roving `tabindex` (one tab stop per list); a `role="status"` live region announces changes.
- Browser tests launch Chromium with `--use-gl=angle --use-angle=metal --enable-gpu --ignore-gpu-blocklist` and run against the dev server with `CC_TEST_PORT=5173` (port 3100 may be another project).
- Commit per task with Conventional Commits; never add AI attribution to commits.

## Review Focus

1. **Corrupt or hostile `cc_padbinds`** (non-JSON, unknown actions, indices out of 0–15, two actions on one button, MENU bound to an action) — expected: invalid entries are dropped, defaults fill the gaps, nothing throws. Test in Task 7.
2. **Esc pressed while the showcase is still loading** — expected: the deck closes, the showcase never finishes installing, and the game fields are exactly as before. Test in Task 6.
3. **Changing art style from inside the deck** (Quick cards / Video → Look) — expected: the deck re-skins in place, keeps the focused row, the live view redraws in the new style, no stale sprites. Test in Task 4.
4. **Window resized across 700 px while the deck is open** — expected: panel switches between side panel and bottom sheet, the focused row stays focused and scrolled into view. Test in Task 3.
5. **A held key auto-repeating on a toggle row** (`e.repeat`) — expected: arrows repeat for navigation and slider/stepper nudges, but a toggle or action fires once per physical press. Test in Task 2.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/ui/settings-sections.js` (new) | The six sections, `SECTION_OF` key → `{ section, group, cost? }`, Quick card definitions, `rowsForSection()`. Pure. |
| `src/ui/settings-apply.js` (new) | `applySettingValue(game, def, value)` / `stepSetting(game, def, dir)` / `resetSetting(game, def)`: set, run `onChange`, save. Shared by deck and remaining canvas code until Task 9. |
| `src/ui/settings-deck-model.js` (new) | Pure navigation state machine: focus zone, section, row, capture mode, compare-hold. `deckKey(state, code, ctx)` → `{ state, effects[] }`. |
| `js/components/settings-deck.js` (new) | `<settings-deck>` custom element: DOM, skins, pointer, a11y, footer, runs model effects. `mountSettingsDeck(game)`. |
| `src/rendering/render-pipeline.js` (modify) | Lazy-load + `sync()` the deck like the showroom; skip the canvas settings draw when the deck is open. |
| `src/systems/input-dispatch.js` (modify) | Route SETTINGS keys to the deck when open. |
| `js/main.js`, `src/ui/hud-editor.js` (modify) | Entry points set the deck's return target / section. |
| `src/systems/showcase-path.js` (new) | Pure: open-cell path through a map grid, line-of-sight simplification, Catmull-Rom sampling, looping. |
| `src/systems/showcase.js` (new) | Sandbox scene: snapshot/restore game fields, curated enemies, camera driving, act choice. |
| `src/systems/remap.js` (new) | Pure remap rules: reserved inputs, conflict detection, swap, reset, `cc_padbinds` load/validate/save. |
| `src/ui/key-labels.js` (new, Task 9) | `KEY_DISPLAY` + `formatKeyCode` moved out of `controls-screen.js`. |
| Deleted in Task 9 | `src/ui/settings-screen.js`, `src/ui/controls-screen.js`, settings geometry in `js/layout.js`, settings/controls click and touch branches. |

---

### Task 1: Section mapping and shared apply helpers

**Files:**
- Create: `src/ui/settings-sections.js`
- Create: `src/ui/settings-apply.js`
- Test: `tests/unit/settings-sections.test.js`

**Interfaces:**
- Consumes: `SETTINGS_REGISTRY`, `DEFAULT_SETTINGS`, `getVisibleSettings(isTouch, settings)`, `applySettingStep(settings, def, dir)` from `js/settings-registry.js`.
- Produces:
  - `SECTIONS: { id: "quick"|"video"|"audio"|"controls"|"gameplay"|"access", label: string }[]`
  - `SECTION_OF: Record<string, { section: string, group: string, cost?: "low"|"med"|"high" }>`
  - `rowsForSection(sectionId, isTouch, settings) → { group: string, rows: def[] }[]` (groups in declared order, empty groups omitted)
  - `QUICK_CARDS: { id, label, desc, apply(settings) }[]` for presets; `ART_CARDS: { style: 0|1|2, label }[]`
  - `applySettingValue(game, def, value) → boolean` (true if changed), `stepSetting(game, def, dir) → boolean`, `resetSetting(game, def) → boolean`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/settings-sections.test.js
import { describe, it, expect, vi } from "vitest";
import { SETTINGS_REGISTRY, DEFAULT_SETTINGS, getVisibleSettings } from "../../js/settings-registry.js";
import { SECTIONS, SECTION_OF, rowsForSection, QUICK_CARDS } from "../../src/ui/settings-sections.js";
import { applySettingValue, stepSetting, resetSetting } from "../../src/ui/settings-apply.js";

const ids = SECTIONS.map((s) => s.id);

describe("settings sections", () => {
  it("has the six spec sections in order", () => {
    expect(ids).toEqual(["quick", "video", "audio", "controls", "gameplay", "access"]);
  });

  it("maps every registry row to a real section", () => {
    for (const def of SETTINGS_REGISTRY) {
      expect(SECTION_OF[def.key], def.key).toBeTruthy();
      expect(ids).toContain(SECTION_OF[def.key].section);
    }
  });

  it("loses no desktop row: every visible row appears in exactly one section", () => {
    const s = { ...DEFAULT_SETTINGS };
    const seen = [];
    for (const id of ids) for (const g of rowsForSection(id, false, s)) seen.push(...g.rows.map((r) => r.key));
    const visible = getVisibleSettings(false, s).map((d) => d.key);
    expect(seen.sort()).toEqual([...new Set(visible)].sort());
  });

  it("puts Video rows in the spec groups", () => {
    const groups = rowsForSection("video", false, { ...DEFAULT_SETTINGS }).map((g) => g.group);
    expect(groups).toEqual(["Look", "Quality", "Effects", "Diagnostics"]);
  });

  it("gives every Effects and Quality row a cost label", () => {
    for (const g of rowsForSection("video", false, { ...DEFAULT_SETTINGS })) {
      if (g.group === "Look" || g.group === "Diagnostics") continue;
      for (const r of g.rows) expect(SECTION_OF[r.key].cost, r.key).toMatch(/^(low|med|high)$/);
    }
  });

  it("shows touch rows only on touch devices", () => {
    const s = { ...DEFAULT_SETTINGS };
    const touchGroups = (t) => rowsForSection("controls", t, s).map((g) => g.group);
    expect(touchGroups(false)).not.toContain("Touch");
    expect(touchGroups(true)).toContain("Touch");
  });

  it("defines the four preset cards", () => {
    expect(QUICK_CARDS.map((c) => c.id)).toEqual(["battery", "balanced", "max", "custom"]);
  });
});

describe("settings apply", () => {
  const game = () => ({ settings: { ...DEFAULT_SETTINGS }, saveSettings: vi.fn() });
  const bloom = SETTINGS_REGISTRY.find((d) => d.key === "enableBloom");
  const fov = SETTINGS_REGISTRY.find((d) => d.key === "fov");

  it("sets, runs onChange and saves once", () => {
    const g = game();
    const spy = vi.fn();
    const def = { ...bloom, onChange: spy };
    expect(applySettingValue(g, def, !g.settings.enableBloom)).toBe(true);
    expect(spy).toHaveBeenCalledWith(g);
    expect(g.saveSettings).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the value is unchanged", () => {
    const g = game();
    expect(applySettingValue(g, bloom, g.settings.enableBloom)).toBe(false);
    expect(g.saveSettings).not.toHaveBeenCalled();
  });

  it("steps sliders within bounds and resets to default", () => {
    const g = game();
    stepSetting(g, fov, 1);
    expect(g.settings.fov).toBe(DEFAULT_SETTINGS.fov + fov.step);
    expect(resetSetting(g, fov)).toBe(true);
    expect(g.settings.fov).toBe(DEFAULT_SETTINGS.fov);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/settings-sections.test.js`
Expected: FAIL — `Failed to resolve import "../../src/ui/settings-sections.js"`.

- [ ] **Step 3: Write `src/ui/settings-apply.js`**

```js
/**
 * One way to change a setting, shared by the settings deck and the canvas
 * screens that still exist: set the value, let the row react (its onChange
 * re-applies graphics, audio, pad settings…), then persist.
 */
import { DEFAULT_SETTINGS, applySettingStep } from "../../js/settings-registry.js";

export function applySettingValue(game, def, value) {
  if (game.settings[def.key] === value) return false;
  game.settings[def.key] = value;
  def.onChange?.(game);
  game.saveSettings();
  return true;
}

export function stepSetting(game, def, dir) {
  if (def.type === "action") return false;
  const changed = applySettingStep(game.settings, def, dir);
  if (!changed) return false;
  def.onChange?.(game);
  game.saveSettings();
  return true;
}

export function resetSetting(game, def) {
  const fallback = DEFAULT_SETTINGS[def.key];
  if (def.type === "action" || fallback === undefined) return false;
  return applySettingValue(game, def, fallback);
}
```

- [ ] **Step 4: Write `src/ui/settings-sections.js`**

```js
/**
 * How the settings deck groups SETTINGS_REGISTRY: six sections, each split
 * into named groups, in the order the spec lays out. The registry stays the
 * one list of settings; this file only says where each one is shown.
 */
import { SETTINGS_REGISTRY, getVisibleSettings } from "../../js/settings-registry.js";

export const SECTIONS = [
  { id: "quick", label: "Quick" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "controls", label: "Controls" },
  { id: "gameplay", label: "Gameplay" },
  { id: "access", label: "Accessibility & HUD" },
];

const at = (section, group, cost) => (cost ? { section, group, cost } : { section, group });

export const SECTION_OF = {
  // Video
  artStyle: at("video", "Look"),
  visualStyle: at("video", "Look"),
  fov: at("video", "Look"),
  viewMode: at("video", "Look"),
  graphicsPreset: at("video", "Quality", "high"),
  renderScale: at("video", "Quality", "high"),
  frameTarget: at("video", "Quality", "med"),
  batterySaver: at("video", "Quality", "high"),
  renderMode: at("video", "Quality", "med"),
  gpuPostFx: at("video", "Quality", "med"),
  enableBloom: at("video", "Effects", "med"),
  enableChromaticAberration: at("video", "Effects", "low"),
  enableFilmGrain: at("video", "Effects", "low"),
  postProcessing: at("video", "Effects", "med"),
  effectsQuality: at("video", "Effects", "med"),
  floorTexture: at("video", "Effects", "med"),
  screenShake: at("video", "Effects", "low"),
  weaponBob: at("video", "Effects", "low"),
  showPerformanceOverlay: at("video", "Diagnostics"),
  // Audio
  masterVolume: at("audio", "Volume"),
  musicVolume: at("audio", "Volume"),
  sfxVolume: at("audio", "Volume"),
  voiceVolume: at("audio", "Volume"),
  // Controls
  sensitivity: at("controls", "Mouse"),
  invertX: at("controls", "Mouse"),
  invertY: at("controls", "Mouse"),
  gamepadStatus: at("controls", "Controller"),
  gamepadCalibrate: at("controls", "Controller"),
  gamepadEnabled: at("controls", "Controller"),
  gamepadLookSensitivity: at("controls", "Controller"),
  gamepadDeadzone: at("controls", "Controller"),
  gamepadRumble: at("controls", "Controller"),
  touchSensitivity: at("controls", "Touch"),
  autoFire: at("controls", "Touch"),
  swipeWeapons: at("controls", "Touch"),
  haptics: at("controls", "Touch"),
  forgeFov: at("controls", "Forge"),
  forgeInvertY: at("controls", "Forge"),
  // Gameplay
  difficulty: at("gameplay", "Challenge"),
  hunterResponse: at("gameplay", "Challenge"),
  cutsceneAutoAdvance: at("gameplay", "Story"),
  crosshair: at("gameplay", "Interface"),
  minimapSize: at("gameplay", "Interface"),
  // Accessibility & HUD
  fontScale: at("access", "Readability"),
  colorblind: at("access", "Readability"),
  hudStyle: at("access", "HUD"),
  editCustomHud: at("access", "HUD"),
  hudScale: at("access", "HUD"),
  staminaBarSize: at("access", "HUD"),
  showPortrait: at("access", "HUD"),
  showWeapons: at("access", "HUD"),
  showKills: at("access", "HUD"),
  showScore: at("access", "HUD"),
};

// Group order per section, as the spec lists them.
const GROUP_ORDER = {
  video: ["Look", "Quality", "Effects", "Diagnostics"],
  audio: ["Volume"],
  controls: ["Mouse", "Keyboard", "Controller", "Touch", "Forge"],
  gameplay: ["Challenge", "Story", "Interface"],
  access: ["Readability", "HUD"],
  quick: [],
};

/** Visible rows of one section, grouped, empty groups dropped. */
export function rowsForSection(sectionId, isTouch, settings) {
  const visible = getVisibleSettings(isTouch, settings);
  const order = GROUP_ORDER[sectionId] ?? [];
  const byGroup = new Map(order.map((g) => [g, []]));
  for (const def of visible) {
    const at = SECTION_OF[def.key];
    if (!at || at.section !== sectionId) continue;
    if (!byGroup.has(at.group)) byGroup.set(at.group, []);
    byGroup.get(at.group).push(def);
  }
  return [...byGroup].filter(([, rows]) => rows.length).map(([group, rows]) => ({ group, rows }));
}

const presetIndex = (name) => {
  const def = SETTINGS_REGISTRY.find((d) => d.key === "graphicsPreset");
  return def.values.findIndex((v) => v.toLowerCase() === name);
};

/** Quick preset cards. Custom only jumps to Video (the deck handles that). */
export const QUICK_CARDS = [
  { id: "battery", label: "Battery", desc: "30 fps cap, lighter effects. For laptops on battery.", apply: (s) => ({ ...s, batterySaver: true }) },
  { id: "balanced", label: "Balanced", desc: "Adapts resolution to hold the frame rate.", apply: (s) => ({ ...s, batterySaver: false, graphicsPreset: presetIndex("auto") }) },
  { id: "max", label: "Max", desc: "Everything on at full resolution.", apply: (s) => ({ ...s, batterySaver: false, graphicsPreset: presetIndex("ultra") }) },
  { id: "custom", label: "Custom", desc: "Pick every option yourself in Video.", apply: (s) => ({ ...s, graphicsPreset: presetIndex("custom") }) },
];

export const ART_CARDS = [
  { style: 0, label: "Legacy" },
  { style: 1, label: "Comic" },
  { style: 2, label: "Modern" },
];
```

- [ ] **Step 5: Run the test and fix mapping gaps it reports**

Run: `npx vitest run tests/unit/settings-sections.test.js`
Expected: PASS. If "maps every registry row" fails, a registry key is missing from `SECTION_OF`; add it under the section the spec names. If `presetIndex` returns -1, read the `graphicsPreset` row's `values` in `js/settings-registry.js` and match its exact spelling (lowercased).

- [ ] **Step 6: Commit**

```bash
git add src/ui/settings-sections.js src/ui/settings-apply.js tests/unit/settings-sections.test.js
git commit -m "feat(settings): map settings into the six deck sections"
```

---

### Task 2: Deck navigation model

**Files:**
- Create: `src/ui/settings-deck-model.js`
- Test: `tests/unit/settings-deck-model.test.js`

**Interfaces:**
- Consumes: nothing at runtime (pure). The caller passes a `ctx` describing the current section's rows.
- Produces:
  - `createDeckState({ section = 0, row = 0 } = {}) → DeckState` where `DeckState = { section: number, row: number, zone: "rows"|"tabs", compare: boolean, confirm: null|"resetSection", capture: null|{ action: string, device: "keyboard"|"gamepad", until: number } }`
  - `deckKey(state, code, ctx) → { state: DeckState, effects: Effect[] }`
    - `ctx = { sectionCount: number, rows: { kind: "toggle"|"slider"|"enum"|"action"|"card"|"remap", key: string }[], repeat: boolean, now: number }`
    - `Effect` is one of `{ type: "step", dir: -1|1 }`, `{ type: "activate" }`, `{ type: "reset" }`, `{ type: "resetSection" }`, `{ type: "compare", on: boolean }`, `{ type: "close" }`, `{ type: "sound", name: "menuSelect"|"menuConfirm" }`, `{ type: "focus" }`, `{ type: "captureCancel" }`
  - `deckKeyUp(state, code) → { state, effects }` (ends compare hold)

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/settings-deck-model.test.js
import { describe, it, expect } from "vitest";
import { createDeckState, deckKey, deckKeyUp } from "../../src/ui/settings-deck-model.js";

const rows = [
  { kind: "toggle", key: "enableBloom" },
  { kind: "slider", key: "fov" },
  { kind: "action", key: "gamepadCalibrate" },
];
const ctx = (over = {}) => ({ sectionCount: 6, rows, repeat: false, now: 0, ...over });
const press = (state, code, over) => deckKey(state, code, ctx(over));
const types = (r) => r.effects.map((e) => e.type);

describe("deck navigation", () => {
  it("moves rows with arrows and wraps", () => {
    let s = createDeckState();
    s = press(s, "ArrowUp").state;
    expect(s.row).toBe(2);
    s = press(s, "ArrowDown").state;
    expect(s.row).toBe(0);
  });

  it("switches section with Q/E from anywhere and resets the row", () => {
    let s = createDeckState({ section: 0, row: 2 });
    s = press(s, "KeyE").state;
    expect(s).toMatchObject({ section: 1, row: 0 });
    s = press(s, "KeyQ").state;
    s = press(s, "KeyQ").state;
    expect(s.section).toBe(5);
  });

  it("left/right step the focused value; Enter activates", () => {
    const s = createDeckState({ row: 1 });
    expect(press(s, "ArrowLeft").effects).toContainEqual({ type: "step", dir: -1 });
    expect(press(s, "ArrowRight").effects).toContainEqual({ type: "step", dir: 1 });
    expect(types(press(s, "Enter"))).toContain("activate");
  });

  it("left/right on an action row does nothing", () => {
    const s = createDeckState({ row: 2 });
    expect(types(press(s, "ArrowRight"))).not.toContain("step");
  });

  it("auto-repeat navigates and nudges sliders but never flips a toggle or fires an action", () => {
    expect(types(press(createDeckState({ row: 1 }), "ArrowRight", { repeat: true }))).toContain("step");
    expect(press(createDeckState(), "ArrowDown", { repeat: true }).state.row).toBe(1);
    expect(types(press(createDeckState({ row: 0 }), "ArrowRight", { repeat: true }))).not.toContain("step");
    expect(types(press(createDeckState({ row: 0 }), "Enter", { repeat: true }))).not.toContain("activate");
    expect(types(press(createDeckState({ row: 2 }), "Enter", { repeat: true }))).not.toContain("activate");
  });

  it("X / Backspace reset the focused row", () => {
    expect(types(press(createDeckState(), "Backspace"))).toContain("reset");
  });

  it("Escape closes; during capture it cancels capture instead", () => {
    expect(types(press(createDeckState(), "Escape"))).toContain("close");
    const capturing = { ...createDeckState(), capture: { action: "interact", device: "keyboard", until: 8000 } };
    const r = press(capturing, "Escape");
    expect(types(r)).toEqual(["captureCancel"]);
    expect(r.state.capture).toBeNull();
  });

  it("holding C shows the previous value until release", () => {
    let r = press(createDeckState(), "KeyC");
    expect(r.effects).toContainEqual({ type: "compare", on: true });
    r = deckKeyUp(r.state, "KeyC");
    expect(r.effects).toContainEqual({ type: "compare", on: false });
  });

  it("reset section asks for confirmation first", () => {
    let r = press(createDeckState(), "KeyR");
    expect(r.state.confirm).toBe("resetSection");
    expect(types(r)).not.toContain("resetSection");
    r = press(r.state, "Enter");
    expect(types(r)).toContain("resetSection");
    expect(r.state.confirm).toBeNull();
  });

  it("an empty section still closes on Escape", () => {
    expect(types(deckKey(createDeckState(), "Escape", ctx({ rows: [] })))).toContain("close");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/settings-deck-model.test.js`
Expected: FAIL — cannot resolve `settings-deck-model.js`.

- [ ] **Step 3: Implement `src/ui/settings-deck-model.js`**

```js
/**
 * The settings deck's navigation as a pure state machine, so every key rule
 * is testable without a DOM. Keyboard, gamepad (translated to key codes by
 * the game) and the deck's own buttons all go through deckKey.
 */

export function createDeckState({ section = 0, row = 0 } = {}) {
  return { section, row, zone: "rows", compare: false, confirm: null, capture: null };
}

const STEPPABLE = new Set(["slider", "enum", "toggle"]);
// A held key repeats; only these kinds may repeat a step.
const REPEATABLE = new Set(["slider", "enum"]);

export function deckKey(state, code, ctx) {
  const s = { ...state };
  const effects = [];
  const n = ctx.rows.length;
  const row = ctx.rows[s.row];

  if (s.capture) {
    if (code === "Escape") {
      s.capture = null;
      effects.push({ type: "captureCancel" });
    }
    // Every other key is the capture itself; the deck handles it.
    return { state: s, effects };
  }

  if (s.confirm) {
    if (code === "Enter" || code === "Space") effects.push({ type: s.confirm });
    s.confirm = null;
    effects.push({ type: "sound", name: "menuConfirm" });
    return { state: s, effects };
  }

  switch (code) {
    case "ArrowUp":
    case "ArrowDown":
      if (n) {
        s.row = (s.row + (code === "ArrowUp" ? -1 : 1) + n) % n;
        effects.push({ type: "focus" }, { type: "sound", name: "menuSelect" });
      }
      break;
    case "KeyQ":
    case "KeyE":
      s.section = (s.section + (code === "KeyQ" ? -1 : 1) + ctx.sectionCount) % ctx.sectionCount;
      s.row = 0;
      effects.push({ type: "focus" }, { type: "sound", name: "menuSelect" });
      break;
    case "ArrowLeft":
    case "ArrowRight":
      if (row && STEPPABLE.has(row.kind) && (!ctx.repeat || REPEATABLE.has(row.kind))) {
        effects.push({ type: "step", dir: code === "ArrowLeft" ? -1 : 1 });
      }
      break;
    case "Enter":
    case "Space":
      if (row && !ctx.repeat) effects.push({ type: "activate" });
      break;
    case "Backspace":
    case "Delete":
    case "KeyX":
      if (row && !ctx.repeat) effects.push({ type: "reset" });
      break;
    case "KeyR":
      if (!ctx.repeat) s.confirm = "resetSection";
      break;
    case "KeyC":
    case "GamepadY":
      if (!s.compare) {
        s.compare = true;
        effects.push({ type: "compare", on: true });
      }
      break;
    case "Escape":
      effects.push({ type: "close" });
      break;
  }
  return { state: s, effects };
}

export function deckKeyUp(state, code) {
  if (state.compare && (code === "KeyC" || code === "GamepadY")) {
    return { state: { ...state, compare: false }, effects: [{ type: "compare", on: false }] };
  }
  return { state, effects: [] };
}
```

Note: the gamepad reaches this as key codes (A → Enter, B → Escape, LB/RB → Q/E, X → KeyX, Y → GamepadY). Task 4 adds X and Y to the SETTINGS branch of `js/game.js` `_updateGamepadInput`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/settings-deck-model.test.js`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/settings-deck-model.js tests/unit/settings-deck-model.test.js
git commit -m "feat(settings): add the deck navigation state machine"
```

---

### Task 3: The `<settings-deck>` element

**Files:**
- Create: `js/components/settings-deck.js`
- Test: `tests/settings-deck.spec.js` (browser; this task adds the layout cases, Task 4 adds flows)

**Interfaces:**
- Consumes: `SECTIONS`, `rowsForSection`, `SECTION_OF`, `QUICK_CARDS`, `ART_CARDS` (Task 1); `applySettingValue`, `stepSetting`, `resetSetting` (Task 1); `createDeckState`, `deckKey`, `deckKeyUp` (Task 2); `settingDisplayItem(def, settings)` (`js/settings-registry.js`); `activeDevice(game)`, `renderDomGlyphs(game, root)`, `GLYPH_CSS` (`src/ui/input-glyphs.js`); `tokensCss(selector)` (`src/ui/design-tokens.js`); `setArtStyle(style)` (`src/rendering/art-style.js`).
- Produces:
  - `class SettingsDeck extends HTMLElement` registered as `settings-deck`, with `game`, `isOpen: boolean`, `open({ returnTo: "menu"|"pause"|"hud", section?: string })`, `close()`, `sync(inSettings: boolean)` (called every frame), `handleKey(code, e)`, `handleKeyUp(code)`, `focusRowByKey(key)` (test hook).
  - `export function mountSettingsDeck(game) → SettingsDeck`
  - Emits `game.onSettingsDeckClose?.(returnTo)` when closed (Task 4 sets it).

- [ ] **Step 1: Write the failing browser test**

```js
// tests/settings-deck.spec.js
import { test, expect } from "@playwright/test";

test.use({ launchOptions: { args: ["--use-gl=angle", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } });

const deck = (page) => page.locator("settings-deck");

async function openDeck(page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.evaluate(async () => {
    const { mountSettingsDeck } = await import("/js/components/settings-deck.js");
    const d = mountSettingsDeck(window.ccDebug.game);
    d.open({ returnTo: "menu" });
  });
  await expect(deck(page)).toBeVisible();
}

test("renders six section tabs with tablist semantics", async ({ page }) => {
  await openDeck(page);
  const tabs = deck(page).locator('[role="tab"]');
  await expect(tabs).toHaveCount(6);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await expect(deck(page).locator('[role="tabpanel"]')).toHaveCount(1);
});

test("toggles are switches and sliders are sliders", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  await expect(deck(page).locator('[role="switch"][data-key="enableBloom"]')).toHaveAttribute("aria-checked", /true|false/);
  await expect(deck(page).locator('[role="slider"][data-key="fov"]')).toHaveAttribute("aria-valuenow", /\d+/);
});

test("clicking a switch changes the setting and announces it", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  const before = await page.evaluate(() => window.ccDebug.game.settings.enableFilmGrain);
  await deck(page).locator('[role="switch"][data-key="enableFilmGrain"]').click();
  expect(await page.evaluate(() => window.ccDebug.game.settings.enableFilmGrain)).toBe(!before);
  await expect(deck(page).locator('[role="status"]')).toContainText("Film Grain");
});

test("one tab stop per list (roving tabindex)", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  const zeros = await deck(page).locator('.rows [tabindex="0"]').count();
  expect(zeros).toBe(1);
});

test("side panel above 700px, bottom sheet below, focus kept across the switch", async ({ page }) => {
  await openDeck(page, 1440, 900);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("fov"));
  await expect(deck(page)).toHaveAttribute("layout", "side");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(deck(page)).toHaveAttribute("layout", "sheet");
  const focused = await page.evaluate(() => document.querySelector("settings-deck").shadowRoot.activeElement?.dataset.key);
  expect(focused).toBe("fov");
});

test("every interactive target is at least 44px tall", async ({ page }) => {
  await openDeck(page);
  await deck(page).locator('[role="tab"]', { hasText: "Video" }).click();
  const small = await page.evaluate(() =>
    [...document.querySelector("settings-deck").shadowRoot.querySelectorAll("button, [role=switch], [role=slider], [role=tab]")]
      .filter((el) => el.offsetParent && el.getBoundingClientRect().height < 44)
      .map((el) => el.dataset.key || el.textContent.trim()));
  expect(small).toEqual([]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `CC_TEST_PORT=5173 npx playwright test tests/settings-deck.spec.js`
Expected: FAIL — module `/js/components/settings-deck.js` not found.

- [ ] **Step 3: Implement the element**

Model it on `js/components/agent-showroom.js` (read its `constructor`, `template`, `bind`, `syncProfile`, `syncInput`, `announce` first). Required structure:

```js
import { SECTIONS, SECTION_OF, rowsForSection, QUICK_CARDS, ART_CARDS } from "../../src/ui/settings-sections.js";
import { applySettingValue, stepSetting, resetSetting } from "../../src/ui/settings-apply.js";
import { createDeckState, deckKey, deckKeyUp } from "../../src/ui/settings-deck-model.js";
import { settingDisplayItem } from "../settings-registry.js";
import { activeDevice, renderDomGlyphs, GLYPH_CSS } from "../../src/ui/input-glyphs.js";
import { tokensCss } from "../../src/ui/design-tokens.js";
import { setArtStyle, getArtStyle, onArtStyleChange } from "../../src/rendering/art-style.js";

const SHEET_BELOW = 700; // px: narrower windows get the bottom sheet
const KIND = { toggle: "toggle", slider: "slider", enum: "enum", action: "action" };

const STYLE = `
:host { position: fixed; inset: 0; z-index: 40; pointer-events: none; display: none; font: 15px/1.35 var(--font-ui, system-ui); color: var(--ink, #e4edf5); }
:host([open]) { display: block; }
/* Readability gradient under the panel; the canvas itself is never filtered. */
.shade { position: absolute; inset: 0; background: linear-gradient(90deg, transparent 45%, rgba(4,8,14,.55) 70%); pointer-events: none; }
.panel { position: absolute; top: 0; right: 0; bottom: 0; width: clamp(360px, 32vw, 480px); pointer-events: auto;
  display: grid; grid-template-rows: auto 1fr auto; background: rgba(8,13,20,.92); border-left: 1px solid rgba(130,160,188,.2); }
:host([layout="sheet"]) .shade { background: linear-gradient(180deg, transparent 40%, rgba(4,8,14,.6) 60%); }
:host([layout="sheet"]) .panel { top: auto; left: 0; width: auto; height: 62vh; border-left: 0; border-top: 1px solid rgba(130,160,188,.2); }
.tabs { display: flex; gap: 4px; padding: 10px 12px; overflow-x: auto; }
.tabs [role=tab] { min-height: 44px; padding: 0 12px; border: 0; background: none; color: inherit; opacity: .7; cursor: pointer; }
.tabs [role=tab][aria-selected=true] { opacity: 1; box-shadow: inset 0 -2px 0 var(--accent, #00e5ff); }
.rows { overflow-y: auto; padding: 4px 12px 16px; }
.group { margin: 14px 0 4px; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; opacity: .6; }
.row { display: grid; grid-template-columns: 1fr auto; align-items: center; min-height: 44px; padding: 0 10px; border-radius: 6px; cursor: pointer; }
.row:focus-visible, .row.focused { outline: none; background: rgba(0,229,255,.12); box-shadow: inset 2px 0 0 var(--accent, #00e5ff); }
.value { display: flex; align-items: center; gap: 6px; }
.value button { min-width: 44px; min-height: 44px; border: 0; background: none; color: inherit; cursor: pointer; }
footer { padding: 10px 14px; border-top: 1px solid rgba(130,160,188,.2); font-size: 13px; }
footer .desc { min-height: 2.7em; opacity: .9; }
footer .note { color: #ffb454; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
[hidden] { display: none !important; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;
```

Behaviour to implement (each bullet is required; keep methods short):

- `constructor`: attach shadow root; adopt `STYLE`, `GLYPH_CSS`, and `tokensCss(":host")`; build the template: `.shade`, `.panel` with `.tabs[role=tablist]`, `.rows[role=tabpanel][id=deck-panel]`, `footer` (`.desc`, `.note`, `.prompts`), and a `.sr[role=status][aria-live=polite]`. Create `this.state = createDeckState()`. Add a `ResizeObserver` on `document.documentElement` that sets `this.setAttribute("layout", innerWidth < SHEET_BELOW ? "sheet" : "side")` and re-focuses the focused row with `scrollIntoView({ block: "nearest" })`.
- `open({ returnTo, section })`: set `this.returnTo`, map `section` id to its index (default 0), `this.toggleAttribute("open", true)`, `this.isOpen = true`, render, focus the current row. `close()`: remove `open`, `isOpen = false`, call `this.game.onSettingsDeckClose?.(this.returnTo)`.
- `sync(inSettings)`: called every frame. If `!inSettings && this.isOpen` → hide without firing the close callback. Else, mirror `html[data-art-profile]` onto the host (`skin` attribute), and when `activeDevice(this.game)` changes, set `input` attribute and call `renderDomGlyphs(this.game, this.shadowRoot)`.
- `render()`: tabs from `SECTIONS` (each `button[role=tab][aria-selected][aria-controls=deck-panel][tabindex]`, roving tabindex). Rows for the current section: Quick renders `QUICK_CARDS` and `ART_CARDS` as `button.row[data-card]` (kind `"card"`); other sections render `rowsForSection(id, game.isTouchDevice, game.settings)` groups with a `.group` heading and one row per def:
  - toggle → `div.row[role=switch][aria-checked][data-key][tabindex]` with label and value text from `settingDisplayItem(def, settings).value`.
  - slider → `div.row[role=slider][aria-valuenow][aria-valuemin][aria-valuemax][aria-valuetext][data-key][tabindex]`.
  - enum → `div.row[data-key][tabindex]` with `aria-label` "Label: Value" and two buttons `[data-step="-1"]`/`[data-step="1"]` with `aria-label` "Previous Label" / "Next Label".
  - action → `button.row[data-key]` showing `settingDisplayItem().value`.
  Exactly one row has `tabindex="0"` (the focused one), the rest `-1`.
- Footer: description = `def.desc` (or card `desc`), note = `settingDisplayItem(def, settings).note` and, for rows with `SECTION_OF[key].cost`, "Performance cost: low/med/high". Prompts: keyboard `Enter Select · Esc Back · Q/E Section`, pad glyph spans `<span data-glyph="confirm" data-glyph-device="gamepad">` etc., rendered by `renderDomGlyphs`.
- `handleKey(code, e)`: build `ctx = { sectionCount: 6, rows: this.rowKinds(), repeat: !!e?.repeat, now: performance.now() }`, call `deckKey`, store `state`, run effects:
  - `step` → `stepSetting(game, def, dir)` then re-render the row and announce `"${label} ${value}"`.
  - `activate` → toggle: `applySettingValue(game, def, !value)`; enum: step +1; action: `def.onClick(game)`; card: apply `card.apply(settings)` field by field through `applySettingValue` (Custom also switches to the Video section); art card: `applySettingValue(game, artStyleDef, style)` (its onChange calls `setArtStyle`). Announce.
  - `reset` → `resetSetting`, announce "Label reset".
  - `resetSection` → `resetSetting` for every row in the section.
  - `compare` on → remember `this.compareKey = def.key; this.compareValue = settings[key]`, set the row's previous value (kept per key in `this.previous` when a change is made) through `applySettingValue`; off → restore `compareValue`. Only rows in the Video section participate.
  - `focus` → re-render tabs/rows and focus the row; `sound` → `game.audio?.[name]?.()`; `close` → `close()`.
- Pointer: `click` on a tab switches section; `click` on a row focuses it and dispatches `activate` (enum step buttons dispatch `step`); `pointerenter` on a row focuses it (updates footer); slider `pointerdown` + `pointermove` set the value from the pointer's x within the row via `applySettingValue`, rounded with the def's `step`; `wheel` over `.rows` scrolls natively (do not intercept).
- `focusRowByKey(key)`: finds the row index in the current section and focuses it (used by tests and by `open({ section })` callers).
- Art-style changes: subscribe with `onArtStyleChange(() => { this.syncSkin(); this.renderRows(); this.focusCurrent(); })`.

```js
if (!customElements.get("settings-deck")) customElements.define("settings-deck", SettingsDeck);

/** Create (once) and return the settings deck bound to `game`. */
export function mountSettingsDeck(game) {
  let el = document.querySelector("settings-deck");
  if (!el) {
    el = document.createElement("settings-deck");
    document.body.appendChild(el);
  }
  el.game = game;
  return el;
}
```

Skins: add three small CSS blocks keyed on the host's `skin` attribute (`:host([skin="legacy"])` neon: cyan/magenta accents, monospace headings; `:host([skin="modern"])` comic: ink borders, the showroom's plate look; `:host([skin="realistic"])` Modern: off-white on dark, hairlines, no ink). Reuse colours from `src/ui/design-tokens.js` `COLOR` / `PANEL` rather than new hex values.

- [ ] **Step 4: Run the browser tests**

Run: `CC_TEST_PORT=5173 npx playwright test tests/settings-deck.spec.js`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add js/components/settings-deck.js tests/settings-deck.spec.js
git commit -m "feat(settings): add the settings deck element"
```

---

### Task 4: Wire the deck into the game (replaces the canvas screen for Settings)

**Files:**
- Modify: `src/rendering/render-pipeline.js` (lazy load + sync, around `preloadShowroom` ~`:306` and the SETTINGS overlay draw ~`:737`)
- Modify: `src/systems/input-dispatch.js` (SETTINGS branch ~`:446`, pause-menu entry ~`:404`)
- Modify: `js/game.js` (`_updateGamepadInput` non-PLAYING branch: X → `KeyX`, Y → `GamepadY` and its release while in SETTINGS; `onSettingsDeckClose`; key-up forwarding)
- Modify: `js/main.js` (`#btnSettings` handler ~`:288`)
- Modify: `src/ui/hud-editor.js` (~`:45`, return to the deck's Accessibility & HUD section)
- Test: `tests/settings-deck.spec.js` (flows)

**Interfaces:**
- Consumes: `mountSettingsDeck`, `SettingsDeck.open/close/sync/handleKey/handleKeyUp` (Task 3).
- Produces: `game.settingsDeck` (the element once loaded); `game.openSettings({ returnTo, section })` used by every entry point; `game.onSettingsDeckClose(returnTo)` restoring `MODE_SELECT`, `PAUSED` or `HUD_EDITOR`.

- [ ] **Step 1: Add the failing flow tests to `tests/settings-deck.spec.js`**

```js
async function openFromMenu(page) {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter"); // title → mode select
  await page.locator("#btnSettings").click();
  await expect(deck(page)).toHaveAttribute("open", "");
}

test("keyboard only: reach Video, flip bloom, leave to mode select", async ({ page }) => {
  await openFromMenu(page);
  await page.keyboard.press("KeyE"); // Video
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("enableBloom"));
  const before = await page.evaluate(() => window.ccDebug.game.settings.enableBloom);
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.ccDebug.game.settings.enableBloom)).toBe(!before);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
});

test("from pause: deck opens over the live match and Escape returns to pause", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.evaluate(() => window.ccDebug.startCampaign(0, 1));
  const pos = await page.evaluate(() => ({ x: window.ccDebug.game.player.x, y: window.ccDebug.game.player.y }));
  await page.evaluate(() => window.ccDebug.game.openSettings({ returnTo: "pause" }));
  await expect(deck(page)).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("paused");
  expect(await page.evaluate(() => ({ x: window.ccDebug.game.player.x, y: window.ccDebug.game.player.y }))).toEqual(pos);
});

test("changing art style inside the deck re-skins in place and keeps focus", async ({ page }) => {
  await openFromMenu(page);
  await page.keyboard.press("KeyE");
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("artStyle"));
  await page.keyboard.press("ArrowRight");
  const skin = await deck(page).getAttribute("skin");
  const profile = await page.evaluate(() => document.documentElement.dataset.artProfile);
  expect(skin).toBe(profile);
  const focused = await page.evaluate(() => document.querySelector("settings-deck").shadowRoot.activeElement?.dataset.key);
  expect(focused).toBe("artStyle");
});
```

Also add a gamepad pass: inject a fake standard pad in an init script (pattern: `scratch/prompts/check.mjs` overrides `navigator.getGamepads`), press RB (index 5) to reach Video, d-pad down to a toggle, A to flip it, B to leave; assert the setting flipped and the state is `modeSelect`.

- [ ] **Step 2: Run to verify the new tests fail**

Run: `CC_TEST_PORT=5173 npx playwright test tests/settings-deck.spec.js`
Expected: the three flow tests FAIL (`#btnSettings` still opens the canvas screen; `game.openSettings` undefined).

- [ ] **Step 3: Implement the wiring**

`js/game.js` — add:

```js
  /**
   * Every way into Settings goes through here, so the deck always knows
   * where to return: the mode-select menu, the pause menu, or the HUD editor.
   */
  openSettings({ returnTo = "pause", section } = {}) {
    this.state = GameState.SETTINGS;
    this._settingsReturnTo = returnTo;
    this._settingsSection = section ?? null;
  }

  onSettingsDeckClose(returnTo) {
    this.saveSettings();
    this.state = returnTo === "menu" ? GameState.MODE_SELECT : returnTo === "hud" ? GameState.HUD_EDITOR : GameState.PAUSED;
    if (returnTo === "menu") document.getElementById("modeSelect")?.classList.remove("hidden");
  }
```

In `_updateGamepadInput`'s non-PLAYING branch, while `this.state === GameState.SETTINGS`: map `jp.randomize` (X) → `this.handleKeyPress("KeyX")`, `jp.deploy` (Y) → `this.handleKeyPress("GamepadY")` and on Y release call `this.settingsDeck?.handleKeyUp("GamepadY")` (track the previous frame's `pressed.deploy`).

`src/rendering/render-pipeline.js` — mirror the showroom loader:

```js
let deckLoad = "idle"; // idle | loading | ready | failed

/** Fetch and mount <settings-deck> the first time Settings opens. */
function ensureSettingsDeck(game) {
  if (game.settingsDeck || deckLoad !== "idle") return;
  deckLoad = "loading";
  import("../../js/components/settings-deck.js")
    .then((m) => {
      game.settingsDeck = m.mountSettingsDeck(game);
      deckLoad = "ready";
    })
    .catch((err) => {
      deckLoad = "failed";
      console.warn("[settings] deck failed to load, using the canvas screen", err);
    });
}
```

In `renderFrame`, before the overlay draws: when `game.state === GameState.SETTINGS`, call `ensureSettingsDeck(game)`; when the deck is ready and not open, call `game.settingsDeck.open({ returnTo: game._settingsReturnTo ?? "pause", section: game._settingsSection })`; every frame call `game.settingsDeck?.sync(game.state === GameState.SETTINGS)`. Draw the canvas settings screen only when `deckLoad === "failed"`.

`src/systems/input-dispatch.js` — at the top of the SETTINGS branch:

```js
    // The settings deck owns every key while it is open.
    if (game.settingsDeck?.isOpen) {
      game.settingsDeck.handleKey(code, e);
      return;
    }
```

Forward key-ups: in `js/game.js` where key-up is handled (search `_inputKeyUp` / `onKeyUp`), add `if (this.state === GameState.SETTINGS) this.settingsDeck?.handleKeyUp(code);`.

Entry points: `js/main.js` `#btnSettings` → `game.openSettings({ returnTo: "menu" })` (keep `showGameCanvases()` and audio lines); pause menu `KeyS`/`Tab` in `input-dispatch.js` → `game.openSettings({ returnTo: "pause" })`; `src/ui/hud-editor.js` return → `game.openSettings({ returnTo: "pause", section: "access" })`. Remove the `settingsSelection`/`settingsScroll` resets at these sites only when the canvas screen is deleted (Task 9).

- [ ] **Step 4: Run the deck specs, the effects spec and smoke**

Run: `CC_TEST_PORT=5173 npx playwright test tests/settings-deck.spec.js tests/settings-effects.spec.js tests/smoke.spec.js`
Expected: all pass. `settings-effects.spec.js` changes settings through `game.settings` + `onChange`, which is unchanged; if it opened the canvas screen by key anywhere, switch those steps to `game.openSettings(...)` and `settingsDeck.focusRowByKey(...)`.

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/main.js src/rendering/render-pipeline.js src/systems/input-dispatch.js src/ui/hud-editor.js tests/settings-deck.spec.js
git commit -m "feat(settings): open the settings deck from every entry point"
```

---

### Task 5: Showcase camera path (pure)

**Files:**
- Create: `src/systems/showcase-path.js`
- Test: `tests/unit/showcase-path.test.js`

**Interfaces:**
- Consumes: a map `{ width, height, grid: number[][] /* [y][x], 0 = open */, playerStart: { x, y, dir } }` (from `campaignMap(getActLevel(act, i))` in `js/data.js`).
- Produces:
  - `buildShowcasePath(map, { maxPoints = 7, minPoints = 5 } = {}) → { x: number, y: number }[]` — waypoints at open-cell centres, first = player start, each consecutive pair (and last → first) in line of sight.
  - `hasLineOfSight(grid, a, b) → boolean`
  - `samplePath(points, t) → { x, y, angle }` — closed Catmull-Rom loop, `t` in [0, 1) wraps; `angle` looks along the tangent.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/showcase-path.test.js
import { describe, it, expect } from "vitest";
import { getActLevel, campaignMap } from "../../js/data.js";
import { buildShowcasePath, hasLineOfSight, samplePath } from "../../src/systems/showcase-path.js";

const open = (m, x, y) => m.grid[Math.floor(y)]?.[Math.floor(x)] === 0;

describe("showcase path", () => {
  for (const act of [1, 2, 3, 4]) {
    it(`act ${act}: 5-7 open waypoints, looped with line of sight`, () => {
      const m = campaignMap(getActLevel(act, 0));
      const pts = buildShowcasePath(m);
      expect(pts.length).toBeGreaterThanOrEqual(5);
      expect(pts.length).toBeLessThanOrEqual(7);
      for (const p of pts) expect(open(m, p.x, p.y)).toBe(true);
      for (let i = 0; i < pts.length; i++) expect(hasLineOfSight(m.grid, pts[i], pts[(i + 1) % pts.length])).toBe(true);
    });
  }

  it("samples a continuous loop that never enters a wall", () => {
    const m = campaignMap(getActLevel(1, 5));
    const pts = buildShowcasePath(m);
    let prev = samplePath(pts, 0);
    for (let i = 1; i <= 400; i++) {
      const s = samplePath(pts, i / 400);
      expect(open(m, s.x, s.y)).toBe(true);
      expect(Math.hypot(s.x - prev.x, s.y - prev.y)).toBeLessThan(1.5);
      prev = s;
    }
    const a = samplePath(pts, 0);
    const b = samplePath(pts, 1);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-6);
  });

  it("line of sight is false through a wall", () => {
    const grid = [[0, 1, 0]];
    expect(hasLineOfSight(grid, { x: 0.5, y: 0.5 }, { x: 2.5, y: 0.5 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/showcase-path.test.js`
Expected: FAIL — cannot resolve `showcase-path.js`.

- [ ] **Step 3: Implement**

```js
/**
 * A slow looping camera path through a campaign map for the settings
 * showcase (and later the sizzle reel): breadth-first search from the player
 * start to the farthest reachable open cell, thinned to waypoints that can
 * see each other, then a closed Catmull-Rom curve through them.
 */

const isOpen = (grid, x, y) => grid[y]?.[x] === 0;

/** Sample the segment every quarter cell; any wall sample blocks it. */
export function hasLineOfSight(grid, a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(d * 4));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!isOpen(grid, Math.floor(a.x + (b.x - a.x) * t), Math.floor(a.y + (b.y - a.y) * t))) return false;
  }
  return true;
}

function bfs(grid, sx, sy) {
  const key = (x, y) => y * 4096 + x;
  const prev = new Map([[key(sx, sy), null]]);
  const queue = [[sx, sy]];
  let last = [sx, sy];
  while (queue.length) {
    const [x, y] = queue.shift();
    last = [x, y];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!isOpen(grid, nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  const path = [];
  for (let c = last; c; c = prev.get(key(c[0], c[1]))) path.push({ x: c[0] + 0.5, y: c[1] + 0.5 });
  return path.reverse();
}

export function buildShowcasePath(map, { maxPoints = 7, minPoints = 5 } = {}) {
  const sx = Math.floor(map.playerStart.x), sy = Math.floor(map.playerStart.y);
  const cells = bfs(map.grid, sx, sy);
  // Greedy thinning: keep the farthest cell still visible from the last kept one.
  const pts = [cells[0]];
  let i = 0;
  while (i < cells.length - 1) {
    let j = i + 1;
    while (j + 1 < cells.length && hasLineOfSight(map.grid, cells[i], cells[j + 1])) j++;
    pts.push(cells[j]);
    i = j;
  }
  // Too many corners: keep evenly spaced ones that still see each other.
  let out = pts;
  while (out.length > maxPoints) {
    const next = out.filter((_, k) => k % 2 === 0 || k === out.length - 1);
    if (next.length === out.length) break;
    out = next;
  }
  // The loop closes by walking back: mirror the path so every leg is visible.
  if (!hasLineOfSight(map.grid, out.at(-1), out[0])) out = [...out, ...out.slice(1, -1).reverse()];
  while (out.length < minPoints) out.splice(1, 0, midpoint(out[0], out[1]));
  return out.slice(0, Math.max(minPoints, Math.min(out.length, maxPoints)));
}

const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

export function samplePath(points, t) {
  const n = points.length;
  const u = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(u);
  const k = u - i;
  const p = (o) => points[(i + o + n) % n];
  const pos = catmull(p(-1), p(0), p(1), p(2), k);
  const ahead = catmull(p(-1), p(0), p(1), p(2), Math.min(1, k + 0.02));
  const angle = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);
  return { x: pos.x, y: pos.y, angle };
}
```

If the "never enters a wall" test fails for a level (Catmull-Rom overshoot at tight corners), insert the midpoint of the offending leg as an extra waypoint in `buildShowcasePath` before returning, and re-run; keep the 5–7 bound by preferring levels' longest corridor legs. Do not relax the test.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/showcase-path.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/showcase-path.js tests/unit/showcase-path.test.js
git commit -m "feat(showcase): add a looping camera path through campaign maps"
```

---

### Task 6: Showcase runtime and the menu live view

**Files:**
- Create: `src/systems/showcase.js`
- Modify: `js/game.js` (`openSettings` / `onSettingsDeckClose` start and stop the showcase for `returnTo: "menu"`; per-frame `updateShowcase` while in SETTINGS)
- Modify: `js/components/settings-deck.js` (volume slider release plays a sample)
- Test: `tests/unit/showcase.test.js`, `tests/settings-deck.spec.js`

**Interfaces:**
- Consumes: `buildShowcasePath`, `samplePath` (Task 5); `getActLevel`, `campaignMap`, `getAct` (`js/data.js`); `Enemy` (`js/entities.js`, `new Enemy(x, y, type)`); `game.renderer.applyActPalette(palette, env)` and `game.renderer.prewarmEnv(palette, env)`; `game.achievementStats.campaignActsCleared`.
- Produces:
  - `showcaseAct(stats, campaignSave) → 1..4` — the highest act reached, never beyond progress.
  - `startShowcase(game) → Promise<void>` (resolves once installed; a `stopShowcase` before that aborts install)
  - `updateShowcase(game, dtSeconds)`
  - `stopShowcase(game)` — restores every borrowed field exactly.
  - `SHOWCASE_FIELDS: string[]` (the borrowed `game` fields; test uses it)

- [ ] **Step 1: Write the failing unit test**

```js
// tests/unit/showcase.test.js
import { describe, it, expect, vi } from "vitest";
import { showcaseAct, startShowcase, stopShowcase, updateShowcase, SHOWCASE_FIELDS } from "../../src/systems/showcase.js";

function fakeGame() {
  return {
    state: "settings",
    map: { name: "old" }, world: { w: 1 }, entities: [{ id: 1 }], projectiles: [{ id: 2 }],
    exitEntity: { id: 3 }, dustMotes: [1], mode: "campaign",
    player: { x: 1, y: 2, angle: 3 },
    renderer: { applyActPalette: vi.fn(), prewarmEnv: vi.fn(), _actPalette: 2, _envLevel: "lab" },
    achievementStats: { campaignActsCleared: 0 },
  };
}

describe("showcase", () => {
  it("never picks an act beyond progress", () => {
    expect(showcaseAct({ campaignActsCleared: 0 }, null)).toBe(1);
    expect(showcaseAct({ campaignActsCleared: 1 }, null)).toBe(2);
    expect(showcaseAct({ campaignActsCleared: 0 }, { act: 3 })).toBe(3);
    expect(showcaseAct({ campaignActsCleared: 9 }, null)).toBe(4);
  });

  it("restores every borrowed field exactly", async () => {
    const g = fakeGame();
    const before = structuredClone(Object.fromEntries(SHOWCASE_FIELDS.map((k) => [k, g[k]])));
    const playerBefore = { ...g.player };
    await startShowcase(g);
    updateShowcase(g, 0.5);
    expect(g.map.name).not.toBe("old");
    stopShowcase(g);
    for (const k of SHOWCASE_FIELDS) expect(g[k]).toEqual(before[k]);
    expect(g.player).toEqual(playerBefore);
    expect(g.renderer.applyActPalette).toHaveBeenLastCalledWith(2, "lab");
  });

  it("a stop before the install finishes leaves the game untouched", async () => {
    const g = fakeGame();
    const before = structuredClone(Object.fromEntries(SHOWCASE_FIELDS.map((k) => [k, g[k]])));
    const p = startShowcase(g);
    stopShowcase(g);
    await p;
    for (const k of SHOWCASE_FIELDS) expect(g[k]).toEqual(before[k]);
  });

  it("moves the camera along the path", async () => {
    const g = fakeGame();
    await startShowcase(g);
    const a = { ...g.player };
    updateShowcase(g, 2);
    expect(Math.hypot(g.player.x - a.x, g.player.y - a.y)).toBeGreaterThan(0.01);
    stopShowcase(g);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/showcase.test.js`
Expected: FAIL — cannot resolve `showcase.js`.

- [ ] **Step 3: Implement `src/systems/showcase.js`**

```js
/**
 * The settings deck's scene from the main menu: a real campaign level with
 * a slow camera loop, a few enemies idling, and nothing that can touch saves,
 * stats or achievements — it never calls the campaign loader. It borrows a
 * handful of game fields and puts them back exactly on stop.
 */
import { getActLevel, campaignMap, getAct } from "../../js/data.js";
import { Enemy } from "../../js/entities.js";
import { buildShowcasePath, samplePath } from "./showcase-path.js";

export const SHOWCASE_FIELDS = ["map", "world", "entities", "projectiles", "exitEntity", "dustMotes", "mode"];
const LOOP_SECONDS = 40;
// One curated level per act (index into the act's levels): lit, open, varied.
const LEVEL_FOR_ACT = { 1: 5, 2: 3, 3: 2, 4: 1 };
const IDLE_ENEMIES = 4;

export function showcaseAct(stats = {}, campaignSave = null) {
  const reached = Math.max((stats.campaignActsCleared || 0) + 1, campaignSave?.act || 1);
  return Math.min(4, Math.max(1, reached));
}

let session = null;

export async function startShowcase(game, campaignSave = null) {
  const token = {};
  session = token;
  const act = showcaseAct(game.achievementStats, campaignSave);
  const entry = getActLevel(act, LEVEL_FOR_ACT[act] ?? 0);
  const palette = getAct(act)?.palette ?? act;
  game.renderer?.prewarmEnv?.(palette, entry.env);
  await Promise.resolve(); // let a quick Escape win before anything changes
  if (session !== token) return;
  token.saved = Object.fromEntries(SHOWCASE_FIELDS.map((k) => [k, game[k]]));
  token.player = { x: game.player.x, y: game.player.y, angle: game.player.angle };
  token.palette = [game.renderer?._actPalette, game.renderer?._envLevel];
  const map = structuredClone(campaignMap(entry));
  game.map = map;
  game.world = null;
  game.projectiles = [];
  game.exitEntity = null;
  game.dustMotes = null;
  game.mode = "showcase";
  game.renderer?.applyActPalette?.(palette, entry.env);
  token.path = buildShowcasePath(map);
  token.t = 0;
  game.entities = idleEnemies(map, token.path, act);
  applyCamera(game, token);
  token.installed = true;
}

function idleEnemies(map, path, act) {
  const roster = getAct(act)?.roster ?? ["drone"];
  const out = [];
  for (let i = 0; i < Math.min(IDLE_ENEMIES, path.length - 1); i++) {
    const a = path[i + 1];
    const e = new Enemy(a.x, a.y, roster[i % roster.length]);
    e.state = "idle";
    e.showcase = true; // AI and damage never run: the game does not update in SETTINGS
    out.push(e);
  }
  return out;
}

function applyCamera(game, token) {
  const s = samplePath(token.path, token.t / LOOP_SECONDS);
  game.player.x = s.x;
  game.player.y = s.y;
  game.player.angle = s.angle;
}

export function updateShowcase(game, dt) {
  if (!session?.installed) return;
  session.t = (session.t + dt) % LOOP_SECONDS;
  applyCamera(game, session);
}

export function stopShowcase(game) {
  const token = session;
  session = null;
  if (!token?.installed) return;
  for (const k of SHOWCASE_FIELDS) game[k] = token.saved[k];
  Object.assign(game.player, token.player);
  game.renderer?.applyActPalette?.(token.palette[0], token.palette[1]);
}
```

Framing (subject in the left two-thirds): after `applyCamera`, add a small yaw offset toward the panel side, `game.player.angle += 0.12` when the deck layout is `side`, so the path's focus sits left of centre; skip on `sheet`.

- [ ] **Step 4: Wire it**

In `js/game.js` `openSettings`: when `returnTo === "menu"`, `import("../src/systems/showcase.js").then((m) => m.startShowcase(this, this._loadCampaignSaveMeta?.()))` (use whatever returns the saved campaign's `{ act }`; search `getSaveInfo` in `js/game.js`), and fade the canvas in over 300 ms via a CSS class on `#gameCanvas` (`opacity` transition). In `onSettingsDeckClose`: call `stopShowcase(this)` before changing state. In the main update path (`js/main.js` `gameLoop`, or `game.update`), while `state === SETTINGS` call `updateShowcase(game, dt)`. The render pipeline already draws the world in SETTINGS.

In the deck, on `pointerup`/key release of a volume slider: master/SFX → `game.audio.shootPistol()`, music → `game.audio.roundComplete()`, voice → `game.audio.speak("Systems nominal.", "aria", { channel: "comms" })`. Start `game.audio.startAmbient("menu")` quietly when the showcase starts (already the menu ambient).

- [ ] **Step 5: Add the storage-safety browser test**

```js
test("showcase from the menu never writes progress and restores the menu", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  const snap = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k !== "cc_settings").map((k) => [k, localStorage.getItem(k)])));
  const before = await snap();
  await page.keyboard.press("Enter");
  await page.locator("#btnSettings").click();
  await page.waitForFunction(() => window.ccDebug.game.mode === "showcase");
  const x0 = await page.evaluate(() => window.ccDebug.game.player.x);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.ccDebug.game.player.x)).not.toBe(x0);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.ccDebug.game.state)).toBe("modeSelect");
  expect(await page.evaluate(() => window.ccDebug.game.mode)).not.toBe("showcase");
  expect(await snap()).toEqual(before);
});

test("Escape during the showcase load leaves the game as it was", async ({ page }) => {
  await page.goto("/?debug");
  await page.waitForFunction(() => window.ccDebug);
  await page.keyboard.press("Enter");
  const mapBefore = await page.evaluate(() => window.ccDebug.game.map?.name ?? null);
  await page.locator("#btnSettings").click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.ccDebug.game.map?.name ?? null)).toBe(mapBefore);
});
```

- [ ] **Step 6: Run everything for this task**

Run: `npx vitest run tests/unit/showcase.test.js tests/unit/showcase-path.test.js && CC_TEST_PORT=5173 npx playwright test tests/settings-deck.spec.js`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/systems/showcase.js js/game.js js/main.js js/components/settings-deck.js tests/unit/showcase.test.js tests/settings-deck.spec.js
git commit -m "feat(showcase): show a live level behind settings opened from the menu"
```

---

### Task 7: Remap rules and `cc_padbinds` (pure)

**Files:**
- Create: `src/systems/remap.js`
- Modify: `src/systems/pad-actions.js` (export `DEFAULT_GAMEPAD_ACTIONS` frozen copy and `REMAPPABLE_PAD_ACTIONS`)
- Test: `tests/unit/remap.test.js`

**Interfaces:**
- Consumes: `GAMEPAD_ACTIONS` (mutable table read by gameplay and prompts), `PAD` (`src/systems/pad-actions.js`); `DEFAULT_KEYBINDS` (`js/input-manager.js`).
- Produces:
  - `REMAPPABLE_KEY_ACTIONS: string[]` = every `DEFAULT_KEYBINDS` action except `pause`.
  - `REMAPPABLE_PAD_ACTIONS: string[]` = `["dash","crouch","interact","weaponNext","chronoShift","chronoRewind","weaponPrev","aim","fire","sprint","chronoLock","minimap","weaponCyclePrev","weaponCycleNext","weaponLast","weaponFirst"]`
  - `isReservedKey(code) → boolean` (Escape), `isReservedButton(index) → boolean` (`PAD.MENU`)
  - `planBind(table, action, input, remappable) → { ok: true, swapWith: string|null } | { ok: false, reason: "reserved"|"unknown" }`
  - `applyBind(table, action, input, swap = false) → table` (mutates; on swap the other action takes `action`'s old input)
  - `resetBindings(table, defaults, actions)` (mutates)
  - `loadPadBinds(raw: string|null) → Record<string, number>` (validated overrides only)
  - `savePadBinds(table) → string` (only overrides vs defaults)
  - Pairs that intentionally share a button (`chronoRewind` + `weaponPrev` on RB) are not conflicts: `SHARED_PAD = [["chronoRewind","weaponPrev"]]`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/remap.test.js
import { describe, it, expect } from "vitest";
import { PAD, GAMEPAD_ACTIONS, DEFAULT_GAMEPAD_ACTIONS, REMAPPABLE_PAD_ACTIONS } from "../../src/systems/pad-actions.js";
import { planBind, applyBind, resetBindings, loadPadBinds, savePadBinds, isReservedKey, isReservedButton, REMAPPABLE_KEY_ACTIONS } from "../../src/systems/remap.js";
import { DEFAULT_KEYBINDS } from "../../js/input-manager.js";

const pad = () => ({ ...DEFAULT_GAMEPAD_ACTIONS });
const keys = () => ({ ...DEFAULT_KEYBINDS });

describe("remap rules", () => {
  it("reserves Escape and Start", () => {
    expect(isReservedKey("Escape")).toBe(true);
    expect(isReservedButton(PAD.MENU)).toBe(true);
    expect(planBind(pad(), "dash", PAD.MENU, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: false, reason: "reserved" });
    expect(planBind(keys(), "interact", "Escape", REMAPPABLE_KEY_ACTIONS)).toEqual({ ok: false, reason: "reserved" });
  });

  it("pause is not remappable", () => {
    expect(REMAPPABLE_KEY_ACTIONS).not.toContain("pause");
    expect(planBind(keys(), "pause", "KeyP", REMAPPABLE_KEY_ACTIONS)).toEqual({ ok: false, reason: "unknown" });
  });

  it("detects a conflict and swaps on request", () => {
    const t = keys();
    const plan = planBind(t, "interact", t.sprint, REMAPPABLE_KEY_ACTIONS);
    expect(plan).toEqual({ ok: true, swapWith: "sprint" });
    const oldInteract = t.interact;
    applyBind(t, "interact", t.sprint, true);
    expect(t.interact).toBe(DEFAULT_KEYBINDS.sprint);
    expect(t.sprint).toBe(oldInteract);
  });

  it("the RB rewind/previous-weapon pair is not a conflict with itself", () => {
    const t = pad();
    expect(planBind(t, "chronoRewind", PAD.RB, REMAPPABLE_PAD_ACTIONS)).toEqual({ ok: true, swapWith: null });
  });

  it("resets to defaults", () => {
    const t = pad();
    applyBind(t, "dash", PAD.Y, true);
    resetBindings(t, DEFAULT_GAMEPAD_ACTIONS, REMAPPABLE_PAD_ACTIONS);
    expect(t).toEqual(DEFAULT_GAMEPAD_ACTIONS);
  });

  it("round-trips overrides through cc_padbinds", () => {
    const t = pad();
    applyBind(t, "dash", PAD.Y, true);
    const raw = savePadBinds(t);
    expect(JSON.parse(raw)).toEqual({ dash: PAD.Y, weaponNext: PAD.A });
    expect(loadPadBinds(raw)).toEqual({ dash: PAD.Y, weaponNext: PAD.A });
  });

  it("drops hostile or corrupt cc_padbinds entries without throwing", () => {
    expect(loadPadBinds("not json")).toEqual({});
    expect(loadPadBinds(null)).toEqual({});
    expect(loadPadBinds(JSON.stringify({ dash: 99, nope: 1, interact: PAD.MENU, crouch: "B", fire: PAD.RT }))).toEqual({ fire: PAD.RT });
    // Two actions on one button: keep the first, drop the second.
    expect(loadPadBinds(JSON.stringify({ dash: PAD.Y, weaponNext: PAD.Y }))).toEqual({ dash: PAD.Y });
  });

  it("the live table the game reads is the same object remaps change", () => {
    expect(GAMEPAD_ACTIONS).not.toBe(DEFAULT_GAMEPAD_ACTIONS);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/unit/remap.test.js`
Expected: FAIL — `DEFAULT_GAMEPAD_ACTIONS` not exported / `remap.js` missing.

- [ ] **Step 3: Implement**

In `src/systems/pad-actions.js`, after `GAMEPAD_ACTIONS`:

```js
/** The shipped layout; GAMEPAD_ACTIONS is the live (remappable) copy. */
export const DEFAULT_GAMEPAD_ACTIONS = Object.freeze({ ...GAMEPAD_ACTIONS });

/** Gameplay actions a player may rebind. Menu, cutscene and showroom buttons stay fixed. */
export const REMAPPABLE_PAD_ACTIONS = [
  "dash", "crouch", "interact", "weaponNext", "chronoShift", "chronoRewind", "weaponPrev",
  "aim", "fire", "sprint", "chronoLock", "minimap", "weaponCyclePrev", "weaponCycleNext", "weaponLast", "weaponFirst",
];
```

`src/systems/remap.js`:

```js
/**
 * Rebinding rules for keyboard and controller, kept pure so the deck's remap
 * screen and the tests share them. Esc and Start always pause; menu
 * navigation is not rebindable; a bound input taken by another action is a
 * conflict the player resolves by swapping.
 */
import { PAD, REMAPPABLE_PAD_ACTIONS, DEFAULT_GAMEPAD_ACTIONS } from "./pad-actions.js";
import { DEFAULT_KEYBINDS } from "../../js/input-manager.js";

export const REMAPPABLE_KEY_ACTIONS = Object.keys(DEFAULT_KEYBINDS).filter((a) => a !== "pause");
export const SHARED_PAD = [["chronoRewind", "weaponPrev"]];

export const isReservedKey = (code) => code === "Escape";
export const isReservedButton = (index) => index === PAD.MENU;
const reserved = (input) => (typeof input === "number" ? isReservedButton(input) : isReservedKey(input));
const shared = (a, b) => SHARED_PAD.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export function planBind(table, action, input, remappable) {
  if (!remappable.includes(action)) return { ok: false, reason: "unknown" };
  if (reserved(input)) return { ok: false, reason: "reserved" };
  const other = remappable.find((a) => a !== action && table[a] === input && !shared(a, action));
  return { ok: true, swapWith: other ?? null };
}

export function applyBind(table, action, input, swap = false) {
  const previous = table[action];
  const other = Object.keys(table).find((a) => a !== action && table[a] === input && !shared(a, action) && REMAPPABLE_ALL.has(a));
  table[action] = input;
  if (other && swap) table[other] = previous;
  return table;
}

const REMAPPABLE_ALL = new Set([...REMAPPABLE_PAD_ACTIONS, ...REMAPPABLE_KEY_ACTIONS]);

export function resetBindings(table, defaults, actions) {
  for (const a of actions) table[a] = defaults[a];
  return table;
}

export function loadPadBinds(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    return {};
  }
  if (!data || typeof data !== "object") return {};
  const out = {};
  const used = new Set();
  for (const a of REMAPPABLE_PAD_ACTIONS) {
    const v = data[a];
    if (!Number.isInteger(v) || v < 0 || v > PAD.RIGHT || isReservedButton(v)) continue;
    if (used.has(v)) continue;
    used.add(v);
    out[a] = v;
  }
  return out;
}

export function savePadBinds(table) {
  const out = {};
  for (const a of REMAPPABLE_PAD_ACTIONS) if (table[a] !== DEFAULT_GAMEPAD_ACTIONS[a]) out[a] = table[a];
  return JSON.stringify(out);
}
```

Note: `loadPadBinds` keeps the first action per button, iterating in `REMAPPABLE_PAD_ACTIONS` order; the "two actions on one button" test relies on `dash` preceding `weaponNext` in that list. `SHARED_PAD` pairs are the exception at bind time, not at load time (defaults already share RB).

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/remap.test.js tests/unit/input-glyphs.test.js tests/unit/gamepad.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/remap.js src/systems/pad-actions.js tests/unit/remap.test.js
git commit -m "feat(controls): add remap rules and controller binding storage"
```

---

### Task 8: Remap UI in the deck

**Files:**
- Modify: `js/components/settings-deck.js` (Controls section: Keyboard and Controller remap groups, capture mode, conflict dialog, reset per column)
- Modify: `src/ui/settings-deck-model.js` (capture start/end effects), `tests/unit/settings-deck-model.test.js`
- Modify: `js/game.js` (load `cc_padbinds` at start-up into `GAMEPAD_ACTIONS`; in SETTINGS while capturing, deliver raw pad button presses to the deck instead of translating them)
- Test: `tests/settings-deck.spec.js`

**Interfaces:**
- Consumes: `planBind`, `applyBind`, `resetBindings`, `loadPadBinds`, `savePadBinds`, `REMAPPABLE_KEY_ACTIONS`, `REMAPPABLE_PAD_ACTIONS` (Task 7); `GAMEPAD_ACTIONS`, `DEFAULT_GAMEPAD_ACTIONS` (Task 7); `game.input.keybinds`, `game.input.saveKeybinds()`; `glyph(game, action, device)` and `keyLabel(code)` (`src/ui/input-glyphs.js`).
- Produces: `deck.captureInput({ kind: "key", code } | { kind: "button", index })` — called by the game while `deck.state.capture` is set; model effect `{ type: "capture", action, device }` on activating a remap cell.

- [ ] **Step 1: Extend the model test (failing)**

```js
it("activating a remap cell starts capture for that device; the next key goes to the deck", () => {
  const remapRows = [{ kind: "remap", key: "interact", device: "keyboard" }];
  const r = deckKey(createDeckState(), "Enter", { sectionCount: 6, rows: remapRows, repeat: false, now: 1000 });
  expect(r.effects).toContainEqual({ type: "capture", action: "interact", device: "keyboard" });
  expect(r.state.capture).toEqual({ action: "interact", device: "keyboard", until: 9000 });
});

it("capture times out after 8 seconds", () => {
  const s = { ...createDeckState(), capture: { action: "interact", device: "keyboard", until: 9000 } };
  const r = deckKey(s, "ArrowDown", { sectionCount: 6, rows: [], repeat: false, now: 9001 });
  expect(r.state.capture).toBeNull();
  expect(r.effects.map((e) => e.type)).toContain("captureCancel");
});
```

In `deckKey`: the `activate` case, for `row.kind === "remap"`, instead sets `s.capture = { action: row.key, device: row.device, until: ctx.now + 8000 }` and pushes `{ type: "capture", action: row.key, device: row.device }`. At the top of the capture branch, if `ctx.now > s.capture.until`, clear it and push `captureCancel` before anything else.

- [ ] **Step 2: Run model tests (fail, then implement, then pass)**

Run: `npx vitest run tests/unit/settings-deck-model.test.js` → FAIL; implement the two changes above → PASS.

- [ ] **Step 3: Deck UI**

- Controls section gains two groups after Mouse: **Keyboard** (one row per `REMAPPABLE_KEY_ACTIONS`, `kind: "remap"`, `device: "keyboard"`, value = `keyLabel(game.input.keybinds[action])`) and, inside **Controller**, a remap row per `REMAPPABLE_PAD_ACTIONS` (`device: "gamepad"`, value = pad glyph HTML from `glyph(game, action, "gamepad")`), plus a "Reset keyboard to default" / "Reset controller to default" action row at the end of each group.
- Human labels: add a `REMAP_LABELS` map in the deck (`dash: "Dash"`, `crouch: "Crouch"`, `interact: "Interact"`, `weaponNext: "Next weapon"`, `weaponPrev: "Previous weapon"`, `chronoShift: "Chrono Shift"`, `chronoRewind: "Chrono Rewind"`, `chronoLock: "Chrono Lock"`, `aim: "Aim"`, `fire: "Fire"`, `sprint: "Sprint"`, `minimap: "Map"`, `weaponCyclePrev: "Cycle weapon back"`, `weaponCycleNext: "Cycle weapon forward"`, `weaponLast: "Last weapon"`, `weaponFirst: "First weapon"`, `moveForward: "Move forward"`, `moveBack: "Move back"`, `moveLeft: "Strafe left"`, `moveRight: "Strafe right"`, `weapon1`…`weapon8: "Weapon 1"`…, `toggleFPS: "FPS counter"`).
- On `capture` effect: show a modal inside the panel (`role="alertdialog"`, `aria-modal="true"`) reading "Press a key for Interact… (Esc cancels)" or "Press a button for Interact… (B cancels)"; move focus into it.
- `captureInput(input)`: ignore input from the other device; compute `planBind(table, action, input, remappable)`. `reserved` → announce "Esc is reserved for pause" (or "Start…") and keep capturing. `ok` with no swap → `applyBind`, persist (`game.input.saveKeybinds()` or `localStorage.setItem("cc_padbinds", savePadBinds(GAMEPAD_ACTIONS))` in try/catch), close modal, announce "Interact: F". `ok` with `swapWith` → dialog "Already used by Sprint — swap?" with two buttons; Enter/A swaps (`applyBind(..., true)`), Esc/B cancels.
- `js/game.js`: at start-up, after the gamepad manager exists: `Object.assign(GAMEPAD_ACTIONS, loadPadBinds(localStorage.getItem("cc_padbinds")))` in try/catch. While `this.state === GameState.SETTINGS && this.settingsDeck?.state.capture`: on keydown call `this.settingsDeck.captureInput({ kind: "key", code })` and do not dispatch; in `_updateGamepadInput` call `captureInput({ kind: "button", index })` for the first button index whose `justPressed` edge fired this frame (read from the manager's raw down/prev arrays; add a tiny `lastPressedIndex` getter to `js/gamepad.js` if needed) and skip menu translation that frame.

- [ ] **Step 4: Browser test (add to `tests/settings-deck.spec.js`)**

```js
test("remap Interact to F: prompt updates, play responds, reset restores", async ({ page }) => {
  await openFromMenu(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press("KeyE"); // Controls
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("remap:keyboard:interact"));
  await page.keyboard.press("Enter");
  await expect(deck(page).locator('[role="alertdialog"]')).toBeVisible();
  await page.keyboard.press("KeyF");
  // KeyF was toggleFPS: conflict dialog, confirm the swap
  await expect(deck(page).locator('[role="alertdialog"]')).toContainText("FPS counter");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.ccDebug.game.input.keybinds.interact)).toBe("KeyF");
  expect(await page.evaluate(() => window.ccDebug.game.input.keybinds.toggleFPS)).toBe("KeyE");
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("resetKeyboard"));
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => window.ccDebug.game.input.keybinds.interact)).toBe("KeyE");
});

test("Escape cannot be bound", async ({ page }) => {
  await openFromMenu(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press("KeyE");
  await page.evaluate(() => document.querySelector("settings-deck").focusRowByKey("remap:keyboard:interact"));
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(deck(page).locator('[role="alertdialog"]')).toBeHidden();
  expect(await page.evaluate(() => window.ccDebug.game.input.keybinds.interact)).toBe("KeyE");
});
```

Row keys for remap rows use the form `remap:<device>:<action>` and the reset rows `resetKeyboard` / `resetController`, so `focusRowByKey` finds them. Add a controller remap test with the fake pad: bind dash to Y (index 3), confirm the swap with A, and assert `GAMEPAD_ACTIONS.dash === 3` and the tutorial dash glyph now reads "Y".

- [ ] **Step 5: Run and commit**

Run: `npx vitest run && CC_TEST_PORT=5173 npx playwright test tests/settings-deck.spec.js tests/smoke.spec.js`
Expected: all pass.

```bash
git add js/components/settings-deck.js src/ui/settings-deck-model.js js/game.js js/gamepad.js tests/unit/settings-deck-model.test.js tests/settings-deck.spec.js
git commit -m "feat(controls): remap keyboard and controller from the settings deck"
```

---

### Task 9: Remove the canvas settings and controls screens

**Files:**
- Create: `src/ui/key-labels.js` (move `KEY_DISPLAY` and `formatKeyCode` from `src/ui/controls-screen.js` verbatim)
- Modify: `src/ui/input-glyphs.js:21`, `src/ui/chrono-hud.js:20` (import from `key-labels.js`)
- Delete: `src/ui/settings-screen.js`, `src/ui/controls-screen.js`
- Modify: `js/layout.js` (remove `settingsLayout`, `settingsCategoryRects`, `resolveSettingsHit`, `settingsZoneAt` and helpers only they use), `src/systems/input-click-dispatch.js` and touch handling (remove SETTINGS/CONTROLS branches), `src/systems/input-dispatch.js` (remove the canvas SETTINGS branch after the deck delegation, and route the pause menu's `KeyC` / CONTROLS to `game.openSettings({ returnTo: "pause", section: "controls" })`), `js/game.js` (remove `renderSettingsScreen` / `renderControlsScreen` and `settingsSelection`/`settingsScroll`/`settingsCategory`/`controlsSelection` state), `src/rendering/render-pipeline.js` (remove the canvas SETTINGS/CONTROLS draws and the failed-deck fallback — a deck load failure now logs and returns to the opener), `js/testing/debug-bridge.js` (`showSettings()` → `game.openSettings({ returnTo: "menu" })`; `showControls()` → Controls section)
- Modify: `js/settings-registry.js` (remove `category` from rows, `SETTING_CATEGORIES`, `getSettingsForCategory`, `getVisibleCategories` once nothing imports them)
- Test: `tests/unit/layout.test.js` (drop settings cases), `tests/screenshots.spec.js` (settings shots via the deck), `tests/unit/settings-sections.test.js` (add "no row has `category`")

**Interfaces:**
- Consumes: everything above.
- Produces: `src/ui/key-labels.js` exporting `KEY_DISPLAY`, `formatKeyCode(code)`.

- [ ] **Step 1: Write the failing guard test**

Add to `tests/unit/settings-sections.test.js`:

```js
import * as registry from "../../js/settings-registry.js";

it("the old category API is gone", () => {
  expect(registry.SETTING_CATEGORIES).toBeUndefined();
  expect(registry.getSettingsForCategory).toBeUndefined();
  for (const def of registry.SETTINGS_REGISTRY) expect(def.category, def.key).toBeUndefined();
});
```

Run: `npx vitest run tests/unit/settings-sections.test.js` → FAIL.

- [ ] **Step 2: Move key labels, then delete in dependency order**

1. Create `src/ui/key-labels.js` with `KEY_DISPLAY` and `formatKeyCode` copied from `controls-screen.js`; switch the two importers; run `npx vitest run` → PASS.
2. `grep -rn "settings-screen\|controls-screen\|settingsLayout\|resolveSettingsHit\|settingsZoneAt\|settingsCategoryRects\|renderSettingsScreen\|renderControlsScreen\|getSettingsForCategory\|getVisibleCategories\|SETTING_CATEGORIES\|settingsSelection\|controlsSelection" js src tests` and remove each use (the deck and `settings-sections.js` replace them). Delete the two files.
3. Remove `category:` lines from every row in `SETTINGS_REGISTRY` and the category exports.
4. `node --check` every touched file.

- [ ] **Step 3: Run the whole suite**

Run: `npx vitest run && CC_TEST_PORT=5173 npx playwright test tests/settings-deck.spec.js tests/settings-effects.spec.js tests/smoke.spec.js tests/screenshots.spec.js tests/cold-start.spec.js`
Expected: all pass (the known pre-existing failures `customization.spec.js` "smuggle in a locked symbol" and `loop.spec.js` "exactly one callback per frame" are outside this set).

- [ ] **Step 4: Screenshot review**

Capture the deck at 375×812 and 1440×900 in Legacy, Comic and Modern (artStyle 0/1/2 via `cc_settings`), opened from the menu (showcase) and from pause, into `scratch/settings-deck/`. Look at every image: no clipped text, no overlap with the live view's HUD, focus ring visible, glyph prompts correct for keyboard and fake pad.

- [ ] **Step 5: Commit**

```bash
git add -A src/ui/key-labels.js src/ui/input-glyphs.js src/ui/chrono-hud.js js/layout.js src/systems/input-click-dispatch.js src/systems/input-dispatch.js js/game.js src/rendering/render-pipeline.js js/testing/debug-bridge.js js/settings-registry.js tests
git rm src/ui/settings-screen.js src/ui/controls-screen.js
git commit -m "refactor(settings): remove the canvas settings and controls screens"
```

---

## Self-Review Notes

- Spec coverage: §1 structure → Tasks 1, 3; §2 navigation/compare/reset/pointer/footer/remap/a11y/persistence → Tasks 2, 3, 4, 7, 8; §3 live view from pause → Task 4, showcase → Tasks 5, 6, audio samples → Task 6; §4 content → Task 1 (mapping) and Task 8 (remap groups); Delivery phases 1–4 → Tasks 1–4, 5–6, 7–8, 9; Testing list → tests in each task; Risks → Review Focus items and Tasks 6 (storage safety), 7 (lockout), 3 (phone layout).
- Deviation from the spec, adopted: the showcase does not use the campaign loader with a flag; it installs its own map/entities and restores them, so no save, stat or achievement path is reachable. The spec's §3 is updated to match.
- Types checked across tasks: `deckKey(state, code, ctx)` / `deckKeyUp(state, code)`; row keys `remap:<device>:<action>`, `resetKeyboard`, `resetController`; `game.openSettings({ returnTo, section })`; `game.onSettingsDeckClose(returnTo)`; `startShowcase(game, campaignSave?)` / `updateShowcase(game, dt)` / `stopShowcase(game)`; `planBind(table, action, input, remappable)`.
