import { describe, it, expect } from "vitest";
import { TUTORIAL_MAP, STATION_CORE } from "../../src/data/levels/tutorial.js";
import { ATRIUM_GAP } from "../../src/data/levels/rooms/atrium.js";
import { RIG_AT, BREAKER_CELL } from "../../src/data/levels/rooms/rnd.js";
import { COVER_LAYOUTS } from "../../src/data/levels/rooms/arena.js";

const map = TUTORIAL_MAP;
const g = map.grid;

/** Every cell reachable from the start over floor and doors (the prologue opens them all in time). */
function reachable() {
  const seen = new Set();
  const q = [[Math.floor(map.playerStart.x), Math.floor(map.playerStart.y)]];
  seen.add(q[0].join());
  while (q.length) {
    const [x, y] = q.shift();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const v = g[ny]?.[nx];
      if ((v === 0 || v === 5) && !seen.has(`${nx},${ny}`)) {
        seen.add(`${nx},${ny}`);
        q.push([nx, ny]);
      }
    }
  }
  return seen;
}
const open = reachable();
const at = (x, y) => open.has(`${Math.floor(x)},${Math.floor(y)}`);

describe("the station floor", () => {
  it("is sealed at its edges and matches its declared size", () => {
    expect(g.length).toBe(map.height);
    for (const row of g) expect(row.length).toBe(map.width);
    for (let x = 0; x < map.width; x++) expect(g[0][x] && g[map.height - 1][x]).toBeTruthy();
    for (let y = 0; y < map.height; y++) expect(g[y][0] && g[y][map.width - 1]).toBeTruthy();
  });

  it("lets you walk into every room it has", () => {
    // The observation deck over the sim hall is only ever looked into.
    for (const [name, b] of Object.entries(map.rooms).filter(([n]) => n !== "obsDeck")) {
      let any = false;
      for (let y = b.y0; y <= b.y1 && !any; y++) for (let x = b.x0; x <= b.x1 && !any; x++) any = open.has(`${x},${y}`);
      expect(any, name).toBe(true);
    }
  });

  it("puts the prologue's marks on reachable floor", () => {
    const marks = {
      rig: RIG_AT,
      breakerFront: { x: BREAKER_CELL.x + 0.5, y: BREAKER_CELL.y - 0.8 },
      liftMouth: { x: 29.5, y: 10.0 },
      startGate: { x: 29.5, y: 49.5 },
      bridgeWest: { x: 62.9, y: 41.5 },
      bridgeEast: { x: 83.5, y: 41.5 },
    };
    for (const [name, p] of Object.entries(marks)) expect(at(p.x, p.y), name).toBe(true);
    // The bridge's gap is floor (anyone can walk round it; only the run dashes it).
    for (let y = ATRIUM_GAP.y0; y <= ATRIUM_GAP.y1; y++) expect(g[y][ATRIUM_GAP.x]).toBe(0);
  });

  it("raises the sim hall's holo cover only on its open floor", () => {
    for (const cells of Object.values(COVER_LAYOUTS)) {
      for (const [r, c] of cells) {
        expect(g[r][c], `${r},${c}`).toBe(0);
        expect(r >= 3 && r <= 10 && c >= 9 && c <= 50).toBe(true);
      }
    }
  });

  it("gives every short wall a height and every tall one none", () => {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.heightMap[y][x] < 5) expect(g[y][x], `${x},${y}`).not.toBe(0);
      }
    }
  });

  it("keeps the Precinct's plan as the station was", () => {
    expect(STATION_CORE.grid).toHaveLength(60);
    for (const row of STATION_CORE.grid) expect(row).toHaveLength(60);
    // The core is the full map's top-left, but for the doors the wing cut through.
    let diff = 0;
    for (let y = 0; y < 60; y++) for (let x = 0; x < 60; x++) if (STATION_CORE.grid[y][x] !== g[y][x]) diff++;
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThan(400);
  });
});
