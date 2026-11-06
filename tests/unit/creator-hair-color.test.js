import { describe, it, expect } from "vitest";
import { CREATOR_CATEGORIES, HAIR_SWATCH_MIN_TOUCH, drawHairColorHint, getCreatorLayout, hairColorSwatches, listRows } from "../../src/ui/character-creator.js";
import { HAIR_COLORS } from "../../src/data/cosmetics.js";
import { DEFAULT_KEYBINDS } from "../../src/systems/input-manager.js";

/** A 2D context that keeps the text drawn and does nothing else. */
function textCtx() {
  const texts = [];
  const ctx = new Proxy(
    { texts, measureText: (t) => ({ width: String(t).length * 6 }), fillText: (t) => texts.push(String(t)) },
    { get: (o, k) => (k in o ? o[k] : () => {}), set: () => true },
  );
  return ctx;
}

const game = (over = {}) => ({ isTouchDevice: false, keybinds: { ...DEFAULT_KEYBINDS }, gamepad: { connected: true, controllerType: "xbox" }, ...over });

describe("legacy creator hair colour hint", () => {
  it("shows Q / E on a keyboard", () => {
    const ctx = textCtx();
    expect(drawHairColorHint(ctx, 200, 10, game({ inputDevice: "keyboard" }))).toBeGreaterThan(0);
    expect(ctx.texts).toEqual(["Q", "E"]);
  });

  it("shows the bumpers on a pad, in the pad's own legends", () => {
    const xbox = textCtx();
    drawHairColorHint(xbox, 200, 10, game({ inputDevice: "gamepad" }));
    expect(xbox.texts).toEqual(["LB", "RB"]);
    const ps = textCtx();
    drawHairColorHint(ps, 200, 10, game({ inputDevice: "gamepad", gamepad: { connected: true, controllerType: "playstation" } }));
    expect(ps.texts).toEqual(["L1", "R1"]);
  });

  it("shows nothing on touch, where the swatches are tapped", () => {
    const ctx = textCtx();
    expect(drawHairColorHint(ctx, 200, 10, game({ isTouchDevice: true, inputDevice: "touch" }))).toBe(0);
    expect(ctx.texts).toEqual([]);
  });
});

describe("legacy creator hair colour swatches", () => {
  const hair = CREATOR_CATEGORIES.find((c) => c.key === "hair");
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  // The phone viewports tests/mobile-layout.spec.js plays, and a phone upright.
  it.each([[375, 667], [667, 375], [844, 390], [640, 360]])("fit a fingertip on a %ix%i touch screen", (w, h) => {
    const L = getCreatorLayout(w, h, w < 700, true);
    const row = hairColorSwatches(L);
    expect(row.rects).toHaveLength(HAIR_COLORS.length);
    for (const [i, r] of row.rects.entries()) {
      expect(Math.min(r.w, r.h), `swatch ${i}`).toBeGreaterThanOrEqual(HAIR_SWATCH_MIN_TOUCH);
      // Inside the list panel, out of the edge zones where a tap cycles tabs.
      expect(r.x).toBeGreaterThanOrEqual(Math.max(L.contentX, L.inset));
      expect(r.x + r.w).toBeLessThanOrEqual(Math.min(L.contentX + L.listW, w - L.inset));
      expect(r.y + r.h).toBeLessThanOrEqual(L.contentY + L.panelH);
      for (const o of row.rects.slice(i + 1)) expect(overlap(r, o), `swatches ${i}`).toBe(false);
    }
    // At least two rows of cuts stay, all of them above the colour row.
    const rows = listRows(L, hair);
    expect(rows).toBeGreaterThanOrEqual(2);
    expect(L.contentY + 8 + rows * L.itemH).toBeLessThanOrEqual(row.top);
    // On its side, the list, preview and info panels still fit across the screen.
    if (w > h) {
      expect(L.contentX).toBeGreaterThanOrEqual(L.inset);
      expect(L.contentX + L.totalContentW).toBeLessThanOrEqual(w - L.inset);
    }
  });

  it("keep two rows of nine under the cuts with a mouse", () => {
    const L = getCreatorLayout(1440, 900, false, false);
    const row = hairColorSwatches(L);
    expect(new Set(row.rects.map((r) => r.y)).size).toBe(2);
    expect(L.contentY + 8 + listRows(L, hair) * L.itemH).toBeLessThanOrEqual(row.top);
  });
});
