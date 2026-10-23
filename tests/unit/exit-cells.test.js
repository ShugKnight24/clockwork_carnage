import { describe, it, expect } from "vitest";
import {
  collectAllPowerCells,
  liftLockdown,
  lockdownFor,
  planLockdown,
  planPowerCells,
  powerCellsFor,
  stepsFrom,
} from "../../src/systems/exit-cells.js";
import { ACTS } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";
import { setPieceFor } from "../../src/data/campaign/set-pieces.js";

const slots = ACTS.flatMap((act) => act.levels.map((entry, i) => ({ act: act.id, level: i, entry })));

function plan({ act, level, entry }) {
  const map = campaignMap(entry);
  const piece = setPieceFor(entry);
  const n = powerCellsFor(map, piece, entry.map);
  const cells = n ? planPowerCells(map.grid, map.playerStart, map.exit, n, entry.seed ?? act * 100 + level) : [];
  return { map, n, cells };
}

describe("power cells", () => {
  it("holds cells only on the reactor and the Engine, and locks down three fights", () => {
    const gates = slots.map((s) => {
      const map = campaignMap(s.entry);
      const piece = setPieceFor(s.entry);
      return [s.entry.map, plan(s).n, lockdownFor(map, piece, s.entry.map)];
    });
    // The power is the story only where the reactor or the Engine is down.
    expect(gates.filter(([, n]) => n).map(([id, n]) => `${id}:${n}`)).toEqual(["reactor:2", "engine_firing:2"]);
    expect(gates.filter(([, , ld]) => ld).map(([id]) => id)).toEqual(["checkpoint", "containment", "engine"]);
    // Never both on one level, and the rest are a run for the exit.
    for (const [id, n, ld] of gates) expect(n && ld, id).toBeFalsy();
    for (const s of slots) {
      const { map, n } = plan(s);
      if (!map?.exit) expect(n, `${s.entry.map} has no exit`).toBe(0);
    }
  });

  it("lifts a lockdown once its share of the hostiles is down", () => {
    expect(planLockdown(0, 10)).toBe(null);
    expect(planLockdown(0.7, 0)).toBe(null);
    const game = { lockdown: planLockdown(0.7, 10), killedEnemies: 6, exitEntity: { sealed: true } };
    expect(game.lockdown.need).toBe(7);
    expect(liftLockdown(game)).toBe(false);
    expect(game.exitEntity.sealed).toBe(true);
    game.killedEnemies = 7;
    expect(liftLockdown(game)).toBe(true);
    expect(game.exitEntity.sealed).toBe(false);
    expect(liftLockdown(game)).toBe(false); // once

    const jumped = { lockdown: planLockdown(0.7, 3), killedEnemies: 0, exitEntity: { sealed: true }, entities: [] };
    collectAllPowerCells(jumped);
    expect([jumped.lockdown.done, jumped.exitEntity.sealed]).toEqual([true, false]);
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
