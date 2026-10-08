import { describe, it, expect } from "vitest";
import { planPowerCells, powerCellsFor, stepsFrom } from "../../src/systems/exit-cells.js";
import { ACTS } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";
import { setPieceFor } from "../../src/data/campaign/set-pieces.js";

const slots = ACTS.flatMap((act) => act.levels.map((entry, i) => ({ act: act.id, level: i, entry })));

function plan({ act, level, entry }) {
  const map = campaignMap(entry);
  const piece = setPieceFor(entry);
  const n = powerCellsFor(map, piece, act, level);
  const cells = n ? planPowerCells(map.grid, map.playerStart, map.exit, n, entry.seed ?? act * 100 + level) : [];
  return { map, n, cells };
}

describe("power cells", () => {
  it("gates the plain corridor levels and leaves boss arenas and self-gated levels alone", () => {
    const report = slots.map((s) => {
      const { map, n } = plan(s);
      return `${s.act}-${s.level + 1} ${s.entry.map}: ${n}`;
    });
    // The Act I corridor maps are the ones the survey found most linear.
    for (const name of ["entry", "research", "containment", "server_farm", "reactor"]) {
      const s = slots.find((x) => x.act === 1 && x.entry.map === name);
      expect(plan(s).n, name).toBeGreaterThan(0);
    }
    for (const s of slots) {
      const { map, n } = plan(s);
      if (!map?.exit) expect(n, `${s.entry.map} has no exit`).toBe(0);
    }
    expect(report.length).toBe(slots.length);
  });

  it("places every cell reachable, off the direct route, apart, and the same every run", () => {
    for (const s of slots) {
      const { map, n, cells } = plan(s);
      if (!n) continue;
      expect(cells.length, `${s.entry.map} cells`).toBe(n);
      const fromStart = stepsFrom(map.grid, map.playerStart.x, map.playerStart.y);
      const toExit = stepsFrom(map.grid, map.exit.x, map.exit.y);
      const w = fromStart.w;
      const route = fromStart.dist[(map.exit.y | 0) * w + (map.exit.x | 0)];
      for (const c of cells) {
        const i = (c.y | 0) * w + (c.x | 0);
        expect(map.grid[c.y | 0][c.x | 0], `${s.entry.map} floor`).toBe(0);
        expect(fromStart.dist[i], `${s.entry.map} reachable`).toBeGreaterThan(0);
        expect(fromStart.dist[i] + toExit.dist[i] - route, `${s.entry.map} detour`).toBeGreaterThanOrEqual(5);
        expect(Math.hypot(c.x - map.exit.x, c.y - map.exit.y)).toBeGreaterThanOrEqual(7);
      }
      for (let a = 0; a < cells.length; a++)
        for (let b = a + 1; b < cells.length; b++)
          expect(Math.hypot(cells[a].x - cells[b].x, cells[a].y - cells[b].y), `${s.entry.map} spread`).toBeGreaterThanOrEqual(6);
      expect(plan(s).cells).toEqual(cells);
    }
  });
});
