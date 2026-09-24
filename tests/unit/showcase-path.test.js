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
