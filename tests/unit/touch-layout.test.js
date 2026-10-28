import { describe, it, expect } from "vitest";
import {
  touchZones,
  BUTTON_KEYS,
  HIT_SHRINK,
  MIN_TOUCH_TARGET,
  phoneMinimapSize,
  phoneVitalsLeft,
  PHONE_VITALS_H,
} from "../../src/ui/touch-layout.js";

/** Real viewports, with the safe-area insets those devices report. */
const DEVICES = [
  { name: "iPhone SE landscape", w: 667, h: 375, safeArea: inset() },
  { name: "iPhone 14 landscape", w: 844, h: 390, safeArea: inset({ right: 47, bottom: 21, left: 47 }) },
  { name: "iPhone 14 Pro Max landscape", w: 932, h: 430, safeArea: inset({ right: 59, bottom: 21, left: 59 }) },
  { name: "iPhone SE portrait", w: 375, h: 667, safeArea: inset() },
  { name: "iPhone 14 portrait", w: 390, h: 844, safeArea: inset({ top: 47, bottom: 34 }) },
  { name: "Pixel 7 portrait", w: 412, h: 915, safeArea: inset({ top: 24, bottom: 24 }) },
  { name: "small Android landscape", w: 640, h: 360, safeArea: inset() },
  // A browser's bars on: Brave / Safari with the toolbar showing.
  { name: "iPhone 15 Pro, Brave bars", w: 849, h: 316, safeArea: inset({ right: 47, left: 47 }) },
  { name: "iPhone 15 Pro, Brave bars, portrait toolbar", w: 734, h: 333, safeArea: inset() },
  { name: "iPhone 15 Pro, Safari toolbar", w: 852, h: 323, safeArea: inset({ right: 59, left: 59 }) },
  { name: "iPad portrait", w: 820, h: 1180, safeArea: inset({ top: 24, bottom: 20 }) },
  { name: "iPad landscape", w: 1180, h: 820, safeArea: inset({ top: 24, bottom: 20 }) },
];

function inset(over = {}) {
  return { top: 0, right: 0, bottom: 0, left: 0, ...over };
}

const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Pairs of buttons whose circles, scaled by `shrink`, intersect. */
function overlaps(z, shrink) {
  const found = [];
  for (let i = 0; i < BUTTON_KEYS.length; i++) {
    for (let j = i + 1; j < BUTTON_KEYS.length; j++) {
      const a = z[BUTTON_KEYS[i]];
      if (!a) continue;
      const b = z[BUTTON_KEYS[j]];
      if (!b) continue;
      if (gap(a, b) < (a.r + b.r) * shrink) {
        found.push(`${BUTTON_KEYS[i]}/${BUTTON_KEYS[j]}`);
      }
    }
  }
  return found;
}

describe.each(DEVICES)("touch layout on $name", ({ w, h, safeArea }) => {
  const z = touchZones({ w, h, safeArea });

  // A short phone has no fullscreen button (the title's carries over).
  const keys = BUTTON_KEYS.filter((k) => z[k]);

  it.each(keys)("%s clears the minimum touch target", (key) => {
    expect(z[key].r * HIT_SHRINK * 2).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it.each(keys)("%s stays inside the safe area", (key) => {
    const b = z[key];
    expect(b.x - b.r).toBeGreaterThanOrEqual(safeArea.left);
    expect(b.x + b.r).toBeLessThanOrEqual(w - safeArea.right);
    expect(b.y - b.r).toBeGreaterThanOrEqual(safeArea.top);
    expect(b.y + b.r).toBeLessThanOrEqual(h - safeArea.bottom);
  });

  it("no two buttons share a hit circle", () => {
    expect(overlaps(z, HIT_SHRINK)).toEqual([]);
  });

  it("no two buttons overlap as drawn", () => {
    // Flooring the small radii up to the minimum target is what pushed AIM
    // into DASH, and a hit-circle check alone would not have caught it.
    expect(overlaps(z, 1)).toEqual([]);
  });

  it("keeps AIM above FIRE on the right thumb column", () => {
    expect(z.aimBtn.y).toBeLessThan(z.fireBtn.y);
    expect(z.aimBtn.x).toBeCloseTo(z.fireBtn.x, 5);
  });

  it("keeps the movement half of the screen clear of buttons", () => {
    // Left-column buttons may sit in the joystick region; right-hand ones must not.
    for (const key of ["fireBtn", "aimBtn", "dashBtn", "weaponBtn", "crouchBtn", "reloadBtn"]) {
      expect(z[key].x - z[key].r).toBeGreaterThan(z.midX);
    }
  });
});

describe("touchZones", () => {
  it("treats a short viewport as a compact phone", () => {
    expect(touchZones({ w: 667, h: 375 }).isCompactPhone).toBe(true);
    expect(touchZones({ w: 390, h: 844 }).isCompactPhone).toBe(false);
  });

  it("works without safe-area insets", () => {
    expect(() => touchZones({ w: 375, h: 667 })).not.toThrow();
  });
});

describe.each(DEVICES.filter((d) => d.w > d.h && d.h < 420))("phone HUD corners on $name", ({ w, h, safeArea }) => {
  const z = touchZones({ w, h, safeArea });
  const mm = phoneMinimapSize(200, w, h);
  // The minimap and its frame (hud.js / hud-vanguard.js), and the vitals block.
  const minimap = { x: w - mm - 22 - safeArea.right, y: 0, w: mm + 22 + safeArea.right, h: 10 + mm + 12 };
  const vitals = { x: 0, y: 0, w: 200 + safeArea.left, h: PHONE_VITALS_H };
  const hit = (b, r) => b.x + b.r > r.x && b.x - b.r < r.x + r.w && b.y + b.r > r.y && b.y - b.r < r.y + r.h;

  it.each(BUTTON_KEYS.filter((k) => k !== "pauseBtn" && k !== "fullscreenBtn"))("%s clears the minimap and the vitals", (key) => {
    expect(hit(z[key], minimap), "minimap").toBe(false);
    expect(hit(z[key], vitals), "vitals").toBe(false);
  });

  it("puts pause in the top-left corner, before the vitals, and the minimap top-right", () => {
    expect(hit(z.pauseBtn, minimap)).toBe(false);
    expect(z.pauseBtn.x + z.pauseBtn.r).toBeLessThan(phoneVitalsLeft(z, safeArea.left));
    expect(z.pauseBtn.y + z.pauseBtn.r).toBeLessThanOrEqual(PHONE_VITALS_H);
    expect(z.minimap.x + z.minimap.s).toBeLessThanOrEqual(w - safeArea.right);
    expect(z.fullscreenBtn).toBeNull();
  });
});
