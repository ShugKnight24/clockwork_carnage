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

describe("narrow viewports", () => {
  it("keeps the panel on screen at phone widths instead of overflowing", () => {
    for (const [w, h] of [[375, 812], [420, 800], [480, 700], [320, 640]]) {
      const l = inventoryLayout(w, h);
      expect(l.panel.x).toBeGreaterThanOrEqual(0);
      expect(l.panel.x + l.panel.w).toBeLessThanOrEqual(w);
      for (const c of l.cells) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w).toBeLessThanOrEqual(w);
      }
    }
  });

  it("still uses the full cell size when there is room", () => {
    expect(inventoryLayout(1280, 720).cell).toBe(44);
    expect(inventoryLayout(375, 812).cell).toBeLessThan(44);
  });

  it("never collapses cells to nothing", () => {
    expect(inventoryLayout(100, 100).cell).toBeGreaterThanOrEqual(18);
  });
});
