import { describe, it, expect } from "vitest";
import {
  CREATOR_CATEGORIES,
  CREATOR_EDGE_ZONE,
  creatorTouchControls,
  creatorTouchHints,
  getCreatorLayout,
  renderCharacterCreator,
} from "../../src/ui/character-creator.js";
import { DEFAULT_CHARACTER } from "../../src/data/index.js";
import { cloneLook } from "../../src/core/character-fields.js";
import { DEFAULT_KEYBINDS } from "../../src/systems/input-manager.js";

/**
 * A 2D context that keeps the text drawn and measures it as a monospace
 * face does (0.62 em a character), so a layout that fits here fits on screen.
 */
function textCtx() {
  const texts = [];
  const state = { font: "10px monospace" };
  const o = {
    texts,
    measureText: (t) => ({ width: String(t).length * 0.62 * (Number(/(\d+(?:\.\d+)?)px/.exec(state.font)?.[1]) || 10) }),
    fillText: (t) => texts.push(String(t)),
  };
  return new Proxy(o, {
    get: (t, k) => (k in t ? t[k] : k === "font" ? state.font : () => {}),
    set: (t, k, v) => {
      if (k === "font") state.font = v;
      return true;
    },
  });
}

const game = (over = {}) => ({ isTouchDevice: false, keybinds: { ...DEFAULT_KEYBINDS }, gamepad: { connected: true, controllerType: "xbox" }, ...over });
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("legacy creator touch hints", () => {
  // The phone viewports tests/mobile-layout.spec.js plays, on their side.
  it.each([[844, 390], [667, 375], [640, 360]])("sit beside BACK and SAVE, clear of the panels and edge zones, at %ix%i", (w, h) => {
    const controls = creatorTouchControls(w, h);
    const hints = creatorTouchHints(textCtx(), controls, game({ isTouchDevice: true, inputDevice: "touch" }));
    expect(hints).toHaveLength(2);
    // The creator canvas is the CSS size at these viewports (render scale 1).
    const L = getCreatorLayout(w, h, w < 700, true);
    const panels = { x: L.contentX, y: L.contentY, w: L.totalContentW, h: L.panelH };
    const tabs = { x: 0, y: L.tabY, w, h: L.tabStripH };
    for (const r of hints) {
      expect(overlap(r, controls.back), "BACK").toBe(false);
      expect(overlap(r, controls.save), "SAVE").toBe(false);
      expect(overlap(r, panels), "panels").toBe(false);
      expect(overlap(r, tabs), "tabs").toBe(false);
      expect(r.x).toBeGreaterThanOrEqual(CREATOR_EDGE_ZONE);
      expect(r.x + r.w).toBeLessThanOrEqual(w - CREATOR_EDGE_ZONE);
      expect(r.y + r.h).toBeLessThanOrEqual(h);
    }
    // One each side of the buttons.
    expect(hints[0].x + hints[0].w).toBeLessThanOrEqual(controls.back.x);
    expect(hints[1].x).toBeGreaterThanOrEqual(controls.save.x + controls.save.w);
    // BACK and SAVE themselves stay below the panels.
    expect(controls.back.y).toBeGreaterThanOrEqual(panels.y + panels.h);
  });

  it("are left out where no lane beside the buttons holds them (a phone upright)", () => {
    const controls = creatorTouchControls(375, 667);
    expect(creatorTouchHints(textCtx(), controls, game({ isTouchDevice: true, inputDevice: "touch" }))).toEqual([]);
  });

  it("keep out of a notch's safe area", () => {
    const controls = creatorTouchControls(844, 390, { left: 90, right: 90, bottom: 21 });
    for (const r of creatorTouchHints(textCtx(), controls, game({ isTouchDevice: true, inputDevice: "touch" }))) {
      expect(r.x).toBeGreaterThanOrEqual(90);
      expect(r.x + r.w).toBeLessThanOrEqual(844 - 90);
      expect(r.y + r.h).toBeLessThanOrEqual(390 - 21);
    }
  });
});

describe("legacy creator with a notch's safe area", () => {
  // iPhone 14 on its side: the insets it reports (tests/unit/touch-layout.test.js).
  const sa = { top: 0, bottom: 21, left: 47, right: 47 };
  const wide = { top: 0, bottom: 21, left: 90, right: 90 };
  it.each([[844, 390, sa], [667, 375, sa], [844, 390, wide]])("keeps the panels, tabs and hints clear at %ix%i", (w, h, area) => {
    const L = getCreatorLayout(w, h, w < 700, true, area);
    const controls = creatorTouchControls(w, h, area);
    const panels = { x: L.contentX, y: L.contentY, w: L.totalContentW, h: L.panelH };
    // Above BACK / SAVE, which stand on the bottom inset.
    expect(panels.y + panels.h).toBeLessThanOrEqual(controls.back.y - 8);
    expect(overlap(panels, controls.back)).toBe(false);
    expect(overlap(panels, controls.save)).toBe(false);
    // Clear of the notch and the edge zones, panels and tab strip alike.
    const side = Math.max(CREATOR_EDGE_ZONE, area.left, area.right);
    expect(L.inset).toBe(side);
    expect(panels.x).toBeGreaterThanOrEqual(side);
    expect(panels.x + panels.w).toBeLessThanOrEqual(w - side);
    const strip = L.perRow * L.tabW + (L.perRow - 1) * L.tabGap;
    expect((w - strip) / 2).toBeGreaterThanOrEqual(side);
    expect(L.tabRows).toBe(2);
    // Two rows of picks still fit.
    expect(L.panelH).toBeGreaterThanOrEqual(2 * L.itemH + 16);
    for (const r of creatorTouchHints(textCtx(), controls, game({ isTouchDevice: true, inputDevice: "touch" }))) {
      expect(overlap(r, panels)).toBe(false);
      expect(r.x).toBeGreaterThanOrEqual(side);
    }
  });
});

describe("legacy creator footer", () => {
  const draw = (input, cat, touch = false) => {
    const ctx = textCtx();
    const ch = cloneLook(DEFAULT_CHARACTER);
    renderCharacterCreator(ctx, 1280, 720, cat, ch, touch, null, 0, input);
    return ctx.texts;
  };
  const shoulder = CREATOR_CATEGORIES.findIndex((c) => c.key === "shoulder");
  const place = CREATOR_CATEGORIES.findIndex((c) => c.multi);

  it("names the keys on a keyboard", () => {
    const texts = draw(game({ inputDevice: "keyboard" }), shoulder);
    expect(texts).toEqual(expect.arrayContaining(["A/D", "category", "W/S", "select", "ENTER", "save", "ESC", "cancel"]));
    expect(draw(game({ inputDevice: "keyboard" }), place)).toEqual(expect.arrayContaining(["SPACE", "wear here"]));
    expect(draw(game({ inputDevice: "keyboard" }), 0)).toEqual(expect.arrayContaining(["←→", "category", "ENTER", "save"]));
  });

  it("shows the pad's buttons on a pad", () => {
    const texts = draw(game({ inputDevice: "gamepad" }), shoulder);
    expect(texts).toEqual(expect.arrayContaining(["A", "save", "B", "cancel"]));
    expect(texts).not.toContain("ENTER");
  });

  it("is not drawn on a touch screen, where BACK and SAVE stand", () => {
    for (const cat of [0, shoulder, place]) {
      const texts = draw(game({ isTouchDevice: true, inputDevice: "touch" }), cat, true);
      expect(texts).not.toContain("save");
      expect(texts).not.toContain("cancel");
      expect(texts.join(" ")).not.toMatch(/TAB\/|Click or/);
    }
  });
});
