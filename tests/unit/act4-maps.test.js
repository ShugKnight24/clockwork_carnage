import { describe, it, expect } from "vitest";
import { ACT4_MAPS, ACT4_SET_PIECES } from "../../src/data/levels/act4-maps.js";
import { STATION_MAPS } from "../../src/data/levels/station-maps.js";
import { MAPS, campaignMap } from "../../src/data/levels/campaign.js";
import { getAct } from "../../src/data/campaign/acts.js";
import { setPieceFor } from "../../src/data/campaign/set-pieces.js";
import { MEMORY_FRAGMENTS } from "../../src/data/memory-fragments.js";

// Act IV's maps (spec §7, Act IV): each serves its beat, and the beats are
// written into the geometry, so these tests read the geometry. Everything is
// in the maps' own coordinates, before each level's turn; map-integrity.test.js
// checks the prepared (varied, turned) maps for reachability as played.

const OPEN = new Set([0, 5, 6]);

/** Cells reachable from (x, y) on `grid`, walking floor, doors and secrets. */
function reach(grid, x, y) {
  const seen = new Set([`${Math.floor(x)},${Math.floor(y)}`]);
  const queue = [[Math.floor(x), Math.floor(y)]];
  for (let i = 0; i < queue.length; i++) {
    const [cx, cy] = queue[i];
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      const k = `${nx},${ny}`;
      if (seen.has(k) || !OPEN.has(grid[ny]?.[nx])) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

const at = (p) => `${Math.floor(p.x)},${Math.floor(p.y)}`;

/** The grid with every cell of every collapse filled: the worst it can get. */
function collapsed(map, piece) {
  const g = structuredClone(map.grid);
  for (const h of piece.hazards ?? []) {
    if (h.type !== "collapse") continue;
    for (const step of h.steps) for (const [c, r] of step) if (g[r][c] === 0) g[r][c] = h.wall;
  }
  return g;
}

describe("Act IV maps", () => {
  const iv = getAct(4).levels;

  it("registers seven maps of their own, none of them a station map", () => {
    expect(Object.keys(ACT4_MAPS)).toHaveLength(7);
    for (const [id, m] of Object.entries(ACT4_MAPS)) {
      expect(MAPS[id], id).toBe(m);
      expect(STATION_MAPS[id], id).toBeUndefined();
      expect(m.width).toBe(60);
      expect(m.height).toBe(60);
    }
    expect(iv.map((l) => l.map).sort()).toEqual(Object.keys(ACT4_MAPS).sort());
  });

  it.each(Object.entries(ACT4_MAPS))("%s is dressed: props, low cover, secrets off the boss floor", (_id, m) => {
    expect(m.props.length, "props").toBeGreaterThanOrEqual(2);
    const low = m.heightMap.flat().filter((h) => h < 5).length;
    expect(low, "waist- and knee-high cover").toBeGreaterThanOrEqual(6);
    if (m.isBossLevel) {
      expect(m.exit).toBeNull();
      expect(m.entities.filter((e) => e.enemyType === "boss")).toHaveLength(1);
    } else {
      expect(m.props.length).toBeGreaterThanOrEqual(8);
      expect(m.secrets.length, "secrets").toBeGreaterThanOrEqual(2);
      const walls = m.grid.flat().filter((t) => t === 6).length;
      expect(walls).toBe(m.secrets.length);
      for (const s of m.secrets) expect(m.grid[s.wallY][s.wallX], s.description).toBe(6);
    }
  });

  it("leaves the remixes' stations untouched", () => {
    // The remixes clone; the station grids Act I plays are the same as ever.
    expect(STATION_MAPS.entry.grid[30][30]).toBe(0); // the old straight corridor
    expect(ACT4_MAPS.entry_last.grid[30][30]).toBe(9); // the chasm through it
  });

  it("IV-1: the chasm cuts the atrium, and the offices are the only road north", () => {
    const m = ACT4_MAPS.entry_last;
    expect(reach(m.grid, m.playerStart.x, m.playerStart.y).has(at(m.exit))).toBe(true);
    const g = structuredClone(m.grid);
    for (const [r, c] of [[28, 12], [24, 12], [20, 12]]) g[r][c] = 1;
    expect(reach(g, m.playerStart.x, m.playerStart.y).has(at(m.exit))).toBe(false);
  });

  it("IV-1: the lobby falls behind you and never cuts you off", () => {
    const m = ACT4_MAPS.entry_last;
    const g = collapsed(m, ACT4_SET_PIECES.entry_falls);
    expect(g[m.playerStart.y | 0][m.playerStart.x | 0]).not.toBe(0); // the airlock is gone
    expect(reach(g, 29.5, 41.5).has(at(m.exit))).toBe(true);
  });

  it("IV-2: the only way out is through the boulevard's seam", () => {
    const m = ACT4_MAPS.the_loop;
    const loop = ACT4_SET_PIECES.the_loop.hazards.find((h) => h.type === "loop");
    const [c1, r1, c2] = loop.rect;
    expect(reach(m.grid, m.playerStart.x, m.playerStart.y).has(at(m.exit))).toBe(true);
    const g = structuredClone(m.grid);
    for (let c = c1; c <= c2; c++) g[r1 - 1][c] = 1;
    expect(reach(g, m.playerStart.x, m.playerStart.y).has(at(m.exit))).toBe(false);
    // It throws you back onto the boulevard's own floor, and the seam is its north edge.
    expect(m.grid[Math.floor(loop.back.y)][Math.floor(loop.back.x)]).toBe(0);
    expect(loop.seamA.y).toBe(r1);
    expect(loop.out.y).toBeLessThan(r1);
  });

  it("IV-2: the boulevard is one block four times, and the first does not match", () => {
    const m = ACT4_MAPS.the_loop;
    const row = (r) => m.grid[r].slice(24, 36).join(",");
    for (const t of [22, 30, 38]) {
      for (let k = 0; k < 7; k++) expect(row(t + k), `row ${t + k}`).toBe(row(22 + k));
    }
    expect(row(15)).not.toBe(row(23)); // glass lamps at the seam
  });

  it("IV-3: the rift eats the spine, never the lanes", () => {
    const m = ACT4_MAPS.containment_last;
    const g = collapsed(m, ACT4_SET_PIECES.last_stand);
    // From either lane, the doors are still there.
    expect(reach(g, 14.5, 25.5).has(at(m.exit))).toBe(true);
    expect(reach(g, 44.5, 25.5).has(at(m.exit))).toBe(true);
    // And the run is backwards: in at the north breach, out at the old airlock.
    expect(m.playerStart.y).toBeLessThan(m.exit.y);
  });

  it("IV-5: the fire front closes the central gallery; the north gallery stays open", () => {
    const m = ACT4_MAPS.archive_burns;
    const g = collapsed(m, ACT4_SET_PIECES.archive_fire);
    expect(reach(g, 10.5, 12.5).has(at(m.exit))).toBe(true);
    // The cache past the reading room is reached through the loop or from the far door.
    const cache = ACT4_SET_PIECES.archive_fire.cache;
    expect(m.grid[Math.floor(cache.y)][Math.floor(cache.x)]).toBe(0);
  });

  it("IV-6: every way to the Core door crosses the Engine's vents", () => {
    const m = ACT4_MAPS.engine_firing;
    const g = structuredClone(m.grid);
    for (const h of ACT4_SET_PIECES.engine_countdown.hazards) {
      const [c1, r1, c2, r2] = h.rect;
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (g[r][c] === 0) g[r][c] = 1;
    }
    expect(reach(m.grid, m.playerStart.x, m.playerStart.y).has(at(m.exit))).toBe(true);
    expect(reach(g, m.playerStart.x, m.playerStart.y).has(at(m.exit))).toBe(false);
  });

  it("IV-7: an open floor for the Final Form, walled in rift", () => {
    const m = ACT4_MAPS.core_endgame;
    let floor = 0;
    for (let r = 8; r <= 45; r++) for (let c = 6; c <= 53; c++) if (m.grid[r][c] === 0) floor++;
    expect(floor / (38 * 48)).toBeGreaterThan(0.95);
    expect(m.grid.flat().filter((t) => t === 9).length).toBeGreaterThan(40);
  });

  it("lays each set piece on its own level, turned with it", () => {
    for (const l of iv) {
      if (!l.setPiece) continue;
      expect(ACT4_SET_PIECES[l.setPiece], l.setPiece).toBeDefined();
      const piece = setPieceFor(l);
      const map = campaignMap(l);
      for (const h of piece.hazards ?? []) {
        if (h.back) expect(map.grid[Math.floor(h.back.y)][Math.floor(h.back.x)], h.id).toBe(0);
      }
    }
  });
});

describe("Act IV fragments", () => {
  it("places voss_4, miri_4 and kai_4 where the spec puts them", () => {
    const f = Object.fromEntries(MEMORY_FRAGMENTS.map((m) => [m.id, m]));
    expect([f.voss_4.act, f.voss_4.level, f.voss_4.hidden]).toEqual([4, 2, true]);
    expect([f.miri_4.act, f.miri_4.level, f.miri_4.hidden]).toEqual([4, 3, true]);
    expect([f.kai_4.act, f.kai_4.level, f.kai_4.hidden]).toEqual([4, 5, false]);
    // voss_4 behind the still flat's wall: a stasis room.
    const loop = ACT4_SET_PIECES.the_loop.hazards.find((h) => h.type === "stasis");
    const secret = ACT4_MAPS.the_loop.secrets[0];
    expect(secret.wallX).toBe(loop.rect[2] + 1);
  });

  it("gives every member four fragments, one per act", () => {
    for (const member of ["voss", "miri", "kai"]) {
      const acts = MEMORY_FRAGMENTS.filter((m) => m.id.startsWith(`${member}_`)).map((m) => m.act);
      expect(acts, member).toEqual([1, 2, 3, 4]);
    }
  });
});
