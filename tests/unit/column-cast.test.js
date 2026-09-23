import { describe, it, expect } from "vitest";
import {
  castColumn,
  createColumnHits,
  coverClipY,
  wallTopY,
  MAX_COLUMN_HITS,
} from "../../src/rendering/column-cast.js";
import { createGrid, createHeights, lowWall, LAYER } from "../../src/data/levels/map-helpers.js";

const H = 400;
const HORIZON = H / 2;

/** A 14x3 corridor looking east: optional short walls, a full wall at col 12. */
function corridor(walls = []) {
  const g = createGrid(14, 3, 1);
  const hm = createHeights(14, 3);
  for (let c = 1; c <= 12; c++) g[1][c] = 0;
  for (const [col, layers] of walls) lowWall(g, hm, 1, col, 1, col, layers, 3);
  g[1][12] = 2;
  return { width: 14, height: 3, grid: g, heightMap: hm };
}

const cast = (map, hits = createColumnHits()) => castColumn(map, 1.5, 1.5, 1, 0, H, HORIZON, hits);

describe("castColumn", () => {
  it("stops at the first full-height wall", () => {
    const hits = cast(corridor());
    expect(hits.n).toBe(1);
    expect(hits.closed).toBe(true);
    expect(hits.mapX[0]).toBe(12);
    expect(hits.type[0]).toBe(2);
    expect(hits.frac[0]).toBe(1);
    expect(hits.dist[0]).toBeCloseTo(10.5);
  });

  it("marches past waist-high cover to the wall behind it", () => {
    const hits = cast(corridor([[5, LAYER.WAIST]]));
    expect(hits.n).toBe(2);
    expect(hits.mapX[0]).toBe(5);
    expect(hits.frac[0]).toBeCloseTo(0.4);
    expect(hits.dist[0]).toBeCloseTo(3.5);
    expect(hits.exit[0]).toBeCloseTo(4.5);
    expect(hits.mapX[1]).toBe(12);
    expect(hits.frac[1]).toBe(1);
  });

  it("hides what is behind waist cover below the far edge of its top", () => {
    const hits = cast(corridor([[5, LAYER.WAIST]]));
    // Under the eye, the top face shows: its far edge is the silhouette.
    expect(hits.clip[0]).toBeCloseTo(wallTopY(0.4, 4.5, H, HORIZON));
    expect(hits.clip[0]).toBeGreaterThan(HORIZON);
    // The far wall's top is above the clip line, so it shows over the cover.
    expect(wallTopY(1, hits.dist[1], H, HORIZON)).toBeLessThan(hits.clip[0]);
  });

  it("uses the near top edge of cover taller than the eye", () => {
    const hits = cast(corridor([[5, LAYER.SHOULDER]]));
    expect(hits.n).toBe(2);
    expect(hits.clip[0]).toBeCloseTo(wallTopY(0.6, 3.5, H, HORIZON));
    expect(hits.clip[0]).toBeLessThan(HORIZON);
  });

  it("keeps the lowest clip across several short walls", () => {
    const hits = cast(corridor([[3, LAYER.WAIST], [6, LAYER.KNEE], [8, LAYER.TALL]]));
    expect(hits.n).toBe(4);
    expect([...hits.mapX.slice(0, 4)]).toEqual([3, 6, 8, 12]);
    // The knee wall sits entirely below the waist wall's silhouette.
    expect(hits.clip[1]).toBe(hits.clip[0]);
    // The tall wall rises above it and lowers the open window.
    expect(hits.clip[2]).toBeLessThan(hits.clip[1]);
  });

  it("closes the column on a short wall that fills the screen", () => {
    // A tall wall right in front of the eye covers every row above it.
    const g = corridor([[2, LAYER.TALL]]);
    const hits = castColumn(g, 1.95, 1.5, 1, 0, H, HORIZON, createColumnHits());
    expect(hits.n).toBe(1);
    expect(hits.closed).toBe(true);
    expect(hits.clip[0]).toBeLessThanOrEqual(0);
  });

  it("treats a map with no heightMap as all full-height", () => {
    const map = corridor([[5, LAYER.WAIST]]);
    delete map.heightMap;
    const hits = cast(map);
    expect(hits.n).toBe(1);
    expect(hits.mapX[0]).toBe(5);
    expect(hits.frac[0]).toBe(1);
  });

  it("closes on the map edge", () => {
    const map = corridor();
    map.grid[1][12] = 0;
    map.grid[1][13] = 0;
    const hits = cast(map);
    expect(hits.closed).toBe(true);
    expect(hits.mapX[hits.n - 1]).toBe(14);
    expect(hits.frac[hits.n - 1]).toBe(1);
  });

  it("caps the record and still closes the column", () => {
    const hits = createColumnHits(2);
    cast(corridor([[3, LAYER.KNEE], [5, LAYER.KNEE], [7, LAYER.KNEE]]), hits);
    expect(hits.n).toBe(2);
    expect(hits.closed).toBe(true);
    expect(MAX_COLUMN_HITS).toBeGreaterThanOrEqual(8);
  });
});

describe("coverClipY", () => {
  // Column 0: short walls at 3 (clip 250) and 6 (clip 230). Column 1: none.
  const stride = 4;
  const occN = new Uint8Array([2, 0]);
  const occDist = new Float32Array([3, 6, 0, 0, 0, 0, 0, 0]);
  const occY = new Float32Array([250, 230, 0, 0, 0, 0, 0, 0]);

  it("leaves an object in front of all cover unclipped", () => {
    expect(coverClipY(occN, occDist, occY, stride, 0, 2, H)).toBe(H);
  });

  it("clips an object behind cover to that cover's silhouette", () => {
    expect(coverClipY(occN, occDist, occY, stride, 0, 4, H)).toBe(250);
    expect(coverClipY(occN, occDist, occY, stride, 0, 9, H)).toBe(230);
  });

  it("returns the screen height for a column with no cover", () => {
    expect(coverClipY(occN, occDist, occY, stride, 1, 9, H)).toBe(H);
  });
});
