import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { VOXEL_DRAW_DISTANCE, chunkInDistance } from "../../src/rendering/voxel/voxel-renderer.js";

const CS = World.CS;
const BOX = new World().bounds; // the default 128 box
const BOX_W = BOX.x1 - BOX.x0, BOX_D = BOX.y1 - BOX.y0;

/** Minimum corner of every chunk in the world, in blocks. */
function chunkOrigins() {
  const out = [];
  new World().forEachChunk((cx, cy, cz) => out.push([cx * CS, cy * CS, cz * CS]));
  return out;
}

describe("voxel chunk distance cull", () => {
  it("reaches past half the world diagonal, so the far wall is never culled away", () => {
    expect(VOXEL_DRAW_DISTANCE).toBeGreaterThanOrEqual(
      Math.hypot(BOX_W, BOX_D, World.H) / 2,
    );
  });

  it("keeps every chunk of the world in range from the middle of it", () => {
    const origins = chunkOrigins();
    expect(origins).toHaveLength(256);
    const [cx, cy, cz] = [BOX.x0 + BOX_W / 2, BOX.y0 + BOX_D / 2, World.GROUND + 1.6];
    for (const o of origins) {
      expect(chunkInDistance(o, cx, cy, cz), `chunk at ${o}`).toBe(true);
    }
  });

  it("is independent of the raycaster's tile draw distance", () => {
    // `quality.drawDistance` counts raycaster tiles and runs 8..20. Feeding it
    // here left the low tiers looking at an empty sky, which is the regression
    // this guards: at 20 almost nothing survives, at the voxel radius all of it
    // does.
    const origins = chunkOrigins();
    const inRange = (d) =>
      origins.filter((o) => chunkInDistance(o, BOX.x0 + BOX_W / 2, BOX.y0 + BOX_D / 2, World.GROUND, d)).length;
    expect(inRange(8)).toBeLessThan(origins.length / 4);   // the lowest tier
    expect(inRange(20)).toBeLessThan(origins.length / 4);  // and the highest
    expect(inRange(VOXEL_DRAW_DISTANCE)).toBe(origins.length);
  });

  it("measures to the chunk's bounding sphere, not its centre", () => {
    // A chunk whose centre sits just past the radius still has a near corner
    // inside it, so it counts.
    const origin = [0, 0, 0];
    const centre = CS / 2;
    expect(chunkInDistance(origin, centre + 24, centre, centre, 20)).toBe(true);
    expect(chunkInDistance(origin, centre + 40, centre, centre, 20)).toBe(false);
  });
});
