import { describe, it, expect } from "vitest";
import { overlayLayout } from "../../src/cinematic/overlay.js";

describe("overlay layout", () => {
  it("letterboxes 16:9 to 2.39:1 when fully in", () => {
    const { barH } = overlayLayout(1920, 1080, { letterbox: 1 });
    expect(Math.round(1080 - 2 * barH)).toBe(Math.round(1920 / 2.39));
  });
  it("has no bars when the letterbox is out", () => {
    expect(overlayLayout(1920, 1080, { letterbox: 0 }).barH).toBe(0);
  });
  it("keeps captions inside the picture, above the bottom bar", () => {
    const l = overlayLayout(1440, 900, { letterbox: 1 });
    expect(l.caption.y).toBeLessThan(900 - l.barH);
    expect(l.caption.x).toBeGreaterThan(0);
  });
  it("scales caption size with font scale", () => {
    expect(overlayLayout(1440, 900, { letterbox: 1, fontScale: 1.5 }).caption.size).toBeGreaterThan(overlayLayout(1440, 900, { letterbox: 1 }).caption.size);
  });
  it("never letterboxes a picture already wider than 2.39:1", () => {
    expect(overlayLayout(2400, 900, { letterbox: 1 }).barH).toBe(0);
  });
});
