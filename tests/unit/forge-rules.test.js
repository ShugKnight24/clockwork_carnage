import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { AIR, BEDROCK } from "../../src/world/blocks.js";
import { PLAYER } from "../../src/world/voxel-physics.js";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import {
  ForgeMode,
  PLACEABLE_BLOCKS,
  TOOLS,
  placementAllowed,
  removeAllowed,
  hotbarWindow,
  nextTool,
  recordEdit,
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

describe("forge history log", () => {
  const block = (x) => ({ x, y: 0, z: 32, from: 0, to: 1 });

  it("appends and advances the cursor", () => {
    let log = { history: [], index: -1 };
    log = recordEdit(log.history, log.index, block(1));
    log = recordEdit(log.history, log.index, block(2));
    expect(log.index).toBe(1);
    expect(log.history.map((e) => e.x)).toEqual([1, 2]);
  });

  it("drops the redo tail when a new edit follows an undo", () => {
    let log = { history: [], index: -1 };
    for (let x = 1; x <= 3; x++) log = recordEdit(log.history, log.index, block(x));
    log = { history: log.history, index: 0 }; // two undos
    log = recordEdit(log.history, log.index, block(9));
    expect(log.history.map((e) => e.x)).toEqual([1, 9]);
    expect(log.index).toBe(1);
  });

  it("drops the oldest entry once the cap is reached", () => {
    let log = { history: [], index: -1 };
    for (let x = 1; x <= 200; x++) log = recordEdit(log.history, log.index, block(x));
    expect(log.history).toHaveLength(200);
    expect(log.index).toBe(199);

    log = recordEdit(log.history, log.index, block(201)); // the 201st
    expect(log.history).toHaveLength(200);
    expect(log.index).toBe(199);
    expect(log.history[0].x).toBe(2);
    expect(log.history[199].x).toBe(201);
  });

  it("honours a smaller cap", () => {
    let log = { history: [], index: -1 };
    for (let x = 1; x <= 5; x++) log = recordEdit(log.history, log.index, block(x), 3);
    expect(log.history.map((e) => e.x)).toEqual([3, 4, 5]);
    expect(log.index).toBe(2);
  });

  it("does not mutate the log it was handed", () => {
    const history = [block(1)];
    const out = recordEdit(history, 0, block(2));
    expect(history).toHaveLength(1);
    expect(out.history).toHaveLength(2);
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

/** A store whose every call rejects, standing in for a dead IndexedDB. */
class DeadBackend {
  async getAll() { throw new Error("store unavailable"); }
  async get() { throw new Error("store unavailable"); }
  async put() { throw new Error("store unavailable"); }
  async delete() { throw new Error("store unavailable"); }
}

const forge = (store) =>
  new ForgeMode({
    renderer: {},
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: { fov: 70, sensitivity: 1 },
    keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD" },
    canvas: null,
    store,
  });

describe("forge storage failures", () => {
  it("starts into an in-memory world instead of throwing", async () => {
    const f = forge(new WorldStore(new DeadBackend()));
    await expect(f.start()).resolves.toBeUndefined();
    expect(f.storageFailed).toBe(true);
    expect(f.active).toBe(true);
    expect(f.world).toBeTruthy();
    expect(f.mapIndex).toHaveLength(1);
    expect(f.store.backend).toBeInstanceOf(MemoryBackend);
  });

  it("turns a failed slot operation into a notice", async () => {
    const f = forge(new WorldStore(new MemoryBackend()));
    await f.start();
    await f.newMap();
    expect(f.mapIndex).toHaveLength(2);

    f.store = new WorldStore(new DeadBackend());
    for (const op of ["newMap", "switchMap", "deleteCurrentMap"]) {
      f.notice = null;
      await expect(f[op](1)).resolves.toBeUndefined();
      expect(f.notice.text).toMatch(/storage unavailable/);
      expect(f.saveFlash).toBe(0);
      expect(f._busy).toBe(false);
    }
  });

  it("keeps an import off the slot it replaced until the new id exists", async () => {
    const store = new WorldStore(new MemoryBackend());
    const f = forge(store);
    await f.start();
    const previous = f.currentSlot;
    f.world.meta.name = "Original";
    await f.saveMap();

    const pending = f._takeOver(generateWorld({ terrain: false, name: "Imported" }));
    expect(f.map.meta.name).toBe("Imported"); // the host sees it immediately
    await f.saveMap(); // must not land on `previous`
    f.stop();
    await pending;

    expect(f.currentSlot).not.toBe(previous);
    expect((await store.load(previous)).meta.name).toBe("Original");
    expect((await store.load(f.currentSlot)).meta.name).toBe("Imported");
  });
});
