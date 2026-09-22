import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";
import { PLAYER } from "../../src/world/voxel-physics.js";
import {
  PLACEABLE_BLOCKS,
  TOOLS,
  placementAllowed,
  removeAllowed,
  hotbarWindow,
  nextTool,
  applyEdit,
  undoEdit,
} from "../../js/forge.js";

const flat = () => generateWorld({ terrain: false });
/** Editor player standing on the flat world's surface at (x, y). */
const body = (x, y, z = 32) => ({
  x,
  y,
  z,
  half: PLAYER.half,
  height: PLAYER.height,
});

describe("forge placement rules", () => {
  it("refuses a block in the cell the player stands in", () => {
    const w = flat();
    const me = body(10.5, 10.5);
    expect(placementAllowed(w, 10, 10, 32, [me])).toBe(false);
    // and in the cell its head occupies
    expect(placementAllowed(w, 10, 10, 33, [me])).toBe(false);
  });

  it("allows a block beside the player and on the cell above its head", () => {
    const w = flat();
    const me = body(10.5, 10.5);
    expect(placementAllowed(w, 11, 10, 32, [me])).toBe(true);
    expect(placementAllowed(w, 10, 11, 32, [me])).toBe(true);
    expect(placementAllowed(w, 10, 10, 34, [me])).toBe(true);
  });

  it("refuses a block in an occupied cell or outside the world", () => {
    const w = flat();
    expect(placementAllowed(w, 10, 10, 31, [])).toBe(false); // ground is solid
    expect(placementAllowed(w, -1, 10, 32, [])).toBe(false);
    expect(placementAllowed(w, 10, 10, World.H, [])).toBe(false);
  });

  it("removes solid blocks but never bedrock or air", () => {
    const w = flat();
    expect(removeAllowed(w, 10, 10, 31)).toBe(true);
    expect(removeAllowed(w, 10, 10, 32)).toBe(false); // air
    expect(w.get(10, 10, 0)).toBe(BEDROCK);
    expect(removeAllowed(w, 10, 10, 0)).toBe(false);
    expect(removeAllowed(w, 10, 10, -1)).toBe(false);
  });
});

describe("forge hotbar and tools", () => {
  it("keeps the selection inside the window at both ends", () => {
    const total = PLACEABLE_BLOCKS.length; // 14
    for (let sel = 0; sel < total; sel++) {
      const { start, end } = hotbarWindow(sel, total, 10);
      expect(sel).toBeGreaterThanOrEqual(start);
      expect(sel).toBeLessThan(end);
      expect(end - start).toBe(10);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(total);
    }
    expect(hotbarWindow(0, 14, 10)).toEqual({ start: 0, end: 10 });
    expect(hotbarWindow(13, 14, 10)).toEqual({ start: 4, end: 14 });
  });

  it("shrinks the window to the palette when it is smaller than the window", () => {
    expect(hotbarWindow(2, 3, 10)).toEqual({ start: 0, end: 3 });
  });

  it("never offers bedrock in the placeable palette", () => {
    expect(PLACEABLE_BLOCKS).not.toContain(BEDROCK);
    expect(PLACEABLE_BLOCKS).not.toContain(AIR);
    expect(PLACEABLE_BLOCKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it("cycles tools back to the first", () => {
    let tool = TOOLS[0];
    for (let i = 1; i < TOOLS.length; i++) {
      tool = nextTool(tool);
      expect(tool).toBe(TOOLS[i]);
    }
    expect(nextTool(tool)).toBe(TOOLS[0]);
    expect(nextTool("nonsense")).toBe(TOOLS[0]);
  });
});

describe("forge edit history", () => {
  it("round-trips a block edit through undo and redo", () => {
    const w = flat();
    const edit = { x: 10, y: 10, z: 32, from: w.get(10, 10, 32), to: 4 };
    const before = w.version;

    applyEdit(w, edit);
    expect(w.get(10, 10, 32)).toBe(4);
    expect(w.version).toBeGreaterThan(before);

    undoEdit(w, edit);
    expect(w.get(10, 10, 32)).toBe(AIR);

    applyEdit(w, edit);
    expect(w.get(10, 10, 32)).toBe(4);
  });

  it("round-trips a removal", () => {
    const w = flat();
    const edit = { x: 10, y: 10, z: 31, from: w.get(10, 10, 31), to: AIR };
    applyEdit(w, edit);
    expect(w.get(10, 10, 31)).toBe(AIR);
    undoEdit(w, edit);
    expect(w.get(10, 10, 31)).toBe(edit.from);
  });

  it("round-trips a marker edit without aliasing the stored snapshot", () => {
    const w = flat();
    const edit = {
      meta: "enemySpawns",
      from: [],
      to: [{ x: 10.5, y: 10.5, z: 32, type: "drone" }],
    };
    applyEdit(w, edit);
    expect(w.meta.enemySpawns).toHaveLength(1);

    w.meta.enemySpawns[0].type = "brute"; // editing the world must not touch history
    undoEdit(w, edit);
    expect(w.meta.enemySpawns).toEqual([]);

    applyEdit(w, edit);
    expect(w.meta.enemySpawns[0].type).toBe("drone");
  });
});
