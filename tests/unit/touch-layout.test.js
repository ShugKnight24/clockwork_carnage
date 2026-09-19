import { describe, it, expect } from "vitest";
import {
  touchZones,
  BUTTON_KEYS,
  HIT_SHRINK,
  MIN_TOUCH_TARGET,
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
      const b = z[BUTTON_KEYS[j]];
      if (gap(a, b) < (a.r + b.r) * shrink) {
        found.push(`${BUTTON_KEYS[i]}/${BUTTON_KEYS[j]}`);
      }
    }
  }
  return found;
}

describe.each(DEVICES)("touch layout on $name", ({ w, h, safeArea }) => {
  const z = touchZones({ w, h, safeArea });

  it.each(BUTTON_KEYS)("%s clears the minimum touch target", (key) => {
    expect(z[key].r * HIT_SHRINK * 2).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it.each(BUTTON_KEYS)("%s stays inside the safe area", (key) => {
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
    for (const key of ["fireBtn", "aimBtn", "dashBtn", "weaponBtn", "interactBtn"]) {
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
