/**
 * The station floors' dressing (src/data/levels/station-dressing.js) is set
 * dressing: it may repaint plain walls and stand furniture on the floor, and
 * nothing else. Doors, secrets, glass and rift walls keep their tiles, and the
 * cover-variation pass sees exactly the lone pillars it always did, so the
 * rolls it makes, and the cover it leaves, do not move.
 */
import { describe, it, expect } from "vitest";
import { STATION_FLOOR_PLANS, STATION_MAPS } from "../../src/data/levels/station-maps.js";
import { ACT2_FLOOR_PLANS, ACT2_MAPS } from "../../src/data/levels/act2-maps.js";
import { hasWallPainter } from "../../src/rendering/env/wall-art.js";
import { LAYER } from "../../src/data/levels/map-helpers.js";
import { repaintable } from "../../src/data/levels/station-dressing.js";

/** The lone pillars varyCover walks (map-helpers.js), as "c,r" keys. */
function pillars(level) {
  const { grid, width: w, height: h } = level;
  const open = (c, r) => c > 0 && r > 0 && c < w - 1 && r < h - 1 && grid[r][c] === 0;
  const out = [];
  for (let r = 1; r < h - 1; r++) {
    for (let c = 1; c < w - 1; c++) {
      if (grid[r][c] > 0 && open(c, r - 1) && open(c, r + 1) && open(c - 1, r) && open(c + 1, r)) out.push(`${c},${r}`);
    }
  }
  return out;
}

const PLANS = { ...STATION_FLOOR_PLANS, ...ACT2_FLOOR_PLANS };
const DRESSED = { ...STATION_MAPS, ...ACT2_MAPS };

describe.each(Object.keys(DRESSED))("station dressing — %s", (id) => {
  const bare = PLANS[id];
  const dressed = DRESSED[id];

  it("only repaints plain walls, and only stands low furniture on the floor", () => {
    const wrong = [];
    for (let r = 0; r < bare.height; r++) {
      for (let c = 0; c < bare.width; c++) {
        const was = bare.grid[r][c];
        const now = dressed.grid[r][c];
        if (was === now) continue;
        const lowCover = was === 0 && dressed.heightMap[r][c] < LAYER.FULL;
        const repaint = repaintable(id, was) && now >= 10 && hasWallPainter(now);
        if (!lowCover && !repaint) wrong.push(`${c},${r}: ${was}->${now}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("leaves varyCover the same lone pillars", () => {
    expect(pillars(dressed)).toEqual(pillars(bare));
  });

  it("stands its furniture on open floor", () => {
    const added = (dressed.props || []).slice((bare.props || []).length);
    const blocked = added.filter((p) => dressed.grid[p.y]?.[p.x] !== 0).map((p) => `${p.type}@${p.x},${p.y}`);
    expect(blocked).toEqual([]);
  });

  it("keeps every entity, the start and the exit where they were", () => {
    expect(dressed.entities).toEqual(bare.entities);
    expect(dressed.playerStart).toEqual(bare.playerStart);
    expect(dressed.exit).toEqual(bare.exit);
  });
});
