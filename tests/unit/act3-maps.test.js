/**
 * Act III's maps serve their beats: each is its own place, its set piece sits
 * on the way through rather than beside it, and the gates it adds can never
 * lock the way out.
 */
import { describe, it, expect } from "vitest";
import { ACTS } from "../../src/data/campaign/acts.js";
import { campaignMap } from "../../src/data/levels/campaign.js";
import { STATION_MAPS } from "../../src/data/levels/station-maps.js";
import { ACT3_MAPS } from "../../src/data/levels/act3-maps.js";
import { setPieceFor, SEAL_TILE } from "../../src/data/campaign/set-pieces.js";
import { rewriteState } from "../../src/systems/chrono-hazards.js";
import { LEVEL_ENVS } from "../../src/rendering/env/palettes.js";
import { MEMORY_FRAGMENTS } from "../../src/data/memory-fragments.js";

const ACT3 = ACTS.find((a) => a.id === 3);
const OPENABLE = new Set([0, 5, 6]);

/** Can the player walk from the start to (x, y) on this grid? */
function reaches(map, grid, x, y) {
  const sx = Math.floor(map.playerStart.x);
  const sy = Math.floor(map.playerStart.y);
  const seen = new Set([`${sx},${sy}`]);
  const queue = [[sx, sy]];
  for (let i = 0; i < queue.length; i++) {
    const [cx, cy] = queue[i];
    if (cx === Math.floor(x) && cy === Math.floor(y)) return true;
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      const k = `${nx},${ny}`;
      if (seen.has(k) || !OPENABLE.has(grid[ny]?.[nx])) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return false;
}

const slot = (i) => {
  const entry = ACT3.levels[i];
  return { entry, map: campaignMap(entry), piece: setPieceFor(entry) };
};
const fill = (grid, [c1, r1, c2, r2], v = SEAL_TILE) => {
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (grid[r][c] === 0) grid[r][c] = v;
};

describe("Act III's maps", () => {
  it("are seven new places, none of them a station map", () => {
    const ids = ACT3.levels.map((l) => l.map);
    expect(new Set(ids).size).toBe(7);
    for (const id of ids) {
      expect(ACT3_MAPS[id], id).toBeDefined();
      expect(STATION_MAPS[id], id).toBeUndefined();
      expect(LEVEL_ENVS[id]?.name, id).toBeTruthy();
    }
    const grids = ids.map((id) => JSON.stringify(ACT3_MAPS[id].grid));
    for (const s of Object.values(STATION_MAPS)) expect(grids).not.toContain(JSON.stringify(s.grid));
  });

  it("hide at least one secret on every level with an exit", () => {
    for (const [i, l] of ACT3.levels.entries()) {
      const m = campaignMap(l);
      if (!m.exit) continue;
      expect(m.secrets.length, `3.${i} ${m.name}`).toBeGreaterThan(0);
    }
  });

  it("name their own env salts, distinct from every other env", () => {
    const salts = Object.values(LEVEL_ENVS).map((e) => e.salt);
    expect(new Set(salts).size).toBe(salts.length);
  });

  it("keep Act III's fragments on the levels the spec puts them, visible, off the boss level", () => {
    const tags = Object.fromEntries(MEMORY_FRAGMENTS.filter((f) => f.act === 3).map((f) => [f.id, f]));
    expect([tags.voss_3.level, tags.miri_3.level, tags.kai_3.level]).toEqual([4, 5, 6]);
    for (const f of Object.values(tags)) {
      expect(f.hidden).toBe(false);
      expect(ACT3.levels[f.level - 1].boss).toBe(false);
    }
  });
});

describe("III-1 The Rewritten Wing", () => {
  const { map, piece } = slot(0);

  it("stays passable at every instant of its rewriting walls", () => {
    for (let t = 0; t < 36; t += 0.25) {
      const grid = map.grid.map((row) => [...row]);
      for (const h of piece.hazards) {
        if (h.type === "rewrite" && rewriteState(h, t).closed) for (const [c, r] of h.cells) if (grid[r][c] === 0) grid[r][c] = SEAL_TILE;
      }
      expect(reaches(map, grid, map.exit.x, map.exit.y), `t=${t}`).toBe(true);
    }
  });

  it("closes the way when a whole gate is shut, so the gates are on the path", () => {
    for (const gate of ["gate1", "gate2"]) {
      const grid = map.grid.map((row) => [...row]);
      for (const h of piece.hazards.filter((x) => x.id.startsWith(gate))) for (const [c, r] of h.cells) grid[r][c] = SEAL_TILE;
      expect(reaches(map, grid, map.exit.x, map.exit.y), gate).toBe(false);
    }
  });

  it("puts a Shield Commander in the last room", () => {
    const sc = map.entities.find((e) => e.enemyType === "shieldCommander");
    expect(Math.hypot(sc.x - map.exit.x, sc.y - map.exit.y)).toBeLessThan(6);
  });
});

describe("III-2 Server Farm Siege and III-3 Reactor Overload", () => {
  it.each([[1, "rack_burn"], [2, "coolant_valves"]])("3.%i seals the only way to the exit until its objective is done", (i) => {
    const { map, piece } = slot(i);
    const grid = map.grid.map((row) => [...row]);
    for (const [c, r] of piece.objective.seal) grid[r][c] = SEAL_TILE;
    expect(reaches(map, grid, map.exit.x, map.exit.y)).toBe(false);
    for (const s of piece.objective.stations) {
      const [c1, r1, c2, r2] = s.rect;
      const open = [];
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (grid[r][c] === 0) open.push([c, r]);
      expect(open.length, s.id).toBeGreaterThan(0);
      expect(reaches(map, grid, open[0][0] + 0.5, open[0][1] + 0.5), s.id).toBe(true);
    }
  });

  it("makes the Vent Gallery the only way to the second valve", () => {
    const { map, piece } = slot(2);
    const grid = map.grid.map((row) => [...row]);
    for (const h of piece.hazards.filter((x) => x.id.startsWith("vent_a"))) fill(grid, h.rect);
    const valve = piece.objective.stations[1].rect;
    expect(reaches(map, grid, valve[0] + 0.5, valve[1] + 0.5)).toBe(false);
  });
});

describe("III-5 The Archive of Rewinds", () => {
  const { map, piece } = slot(4);

  it("routes the way out through both loop rooms", () => {
    for (const id of ["take0417_loop", "take9999_loop"]) {
      const grid = map.grid.map((row) => [...row]);
      fill(grid, piece.hazards.find((h) => h.id === id).rect);
      expect(reaches(map, grid, map.exit.x, map.exit.y), id).toBe(false);
    }
  });

  it("and through Miri's gallery", () => {
    const grid = map.grid.map((row) => [...row]);
    fill(grid, piece.hazards.find((h) => h.id === "gallery_miri").rect);
    expect(reaches(map, grid, map.exit.x, map.exit.y)).toBe(false);
  });
});

describe("III-6 The Chronos Engine", () => {
  const { map, piece } = slot(5);
  const field = piece.hazards.find((h) => h.holds);

  it("holds at least four of the Engine's guard in the field", () => {
    const inField = map.entities.filter((e) => {
      const [c1, r1, c2, r2] = field.rect;
      return e.type === "enemy" && e.x >= c1 && e.x < c2 + 1 && e.y >= r1 && e.y < r2 + 1;
    });
    expect(inField.length).toBeGreaterThanOrEqual(4);
  });

  it("breaks the field on the only way out", () => {
    const grid = map.grid.map((row) => [...row]);
    fill(grid, field.release);
    expect(reaches(map, grid, map.exit.x, map.exit.y)).toBe(false);
  });

  it("stands two Vosses at the console", () => {
    expect(field.figures.map((f) => f.color)).toHaveLength(2);
  });
});

describe("III-7 The Paradox Core, second visit", () => {
  const { entry, map } = slot(6);

  it("is the boss level, and Form 2 is the boss", () => {
    expect(entry.boss).toBe(true);
    expect(ACT3.boss.type).toBe("boss_form2");
    expect(map.entities.filter((e) => e.enemyType === "boss")).toHaveLength(1);
  });

  it("gives the fight waist-high cover you can see over", () => {
    let low = 0;
    for (let r = 14; r <= 33; r++) for (let c = 11; c <= 48; c++) if (map.grid[r][c] && map.heightMap[r][c] < 5) low++;
    expect(low).toBeGreaterThanOrEqual(30);
  });
});
