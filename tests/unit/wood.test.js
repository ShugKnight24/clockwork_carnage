import { describe, it, expect } from "vitest";
import { World } from "../../src/world/world.js";
import { AIR, WATER, LOG, LEAVES, PLANKS, SAPLING } from "../../src/world/blocks.js";
import { itemById, itemForBlock, blockForItem } from "../../src/rpg/items.js";
import { recipeById } from "../../src/rpg/recipes.js";
import { GATHER, dropsFor, xpFor, bonusDrop, BONUS } from "../../src/rpg/gather.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { Skills } from "../../src/rpg/skills.js";
import { growSapling, randomTick, saplingFits, saplingSpecies, SPECIES, treeTop } from "../../src/world/trees.js";
import { ForgeMode } from "../../js/forge.js";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import { PlayerStore, MemoryPlayerBackend } from "../../src/rpg/player-store.js";
import { SeededRNG } from "../../src/utils/seeded-rng.js";
import { slotVisual, TOOL_COLOR } from "../../src/ui/forge-inventory.js";

const GRASS = 11, DIRT = 10, STONE = 1;

/** A patch of grass at z = 30 with air above, the rest of the world empty. */
function meadow() {
  const w = new World();
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { w.set(x, y, 29, DIRT); w.set(x, y, 30, GRASS); }
  return w;
}

describe("wood items and recipes", () => {
  it("has log, planks and sapling items that place their blocks, and two buckets that place nothing", () => {
    expect([itemForBlock(LOG), itemForBlock(PLANKS), itemForBlock(SAPLING)]).toEqual(["log", "planks", "sapling"]);
    expect(itemForBlock(LEAVES)).toBe(null); // leaves drop nothing of their own
    for (const id of ["bucket", "bucket_water"]) {
      expect(itemById(id)).toMatchObject({ stack: 1, blockId: null });
      expect(itemById(id).durability).toBe(undefined);
      expect(blockForItem(id)).toBe(null);
    }
  });

  it("shows a bucket in its own colour, full or empty", () => {
    expect(slotVisual({ item: "bucket_water", n: 1 }).color).toBe(itemById("bucket_water").color);
    expect(slotVisual({ item: "bucket", n: 1 }).color).not.toBe(slotVisual({ item: "bucket_water", n: 1 }).color);
    expect(slotVisual({ item: "pick_stone", n: 1, dur: 5 }).color).toBe(TOOL_COLOR);
  });

  it("saws planks from a log by hand, and makes buckets and doors at a Workbench", () => {
    expect(recipeById("saw_planks")).toMatchObject({ inputs: [["log", 1]], output: ["planks", 4], station: null });
    expect(recipeById("bucket")).toMatchObject({ inputs: [["metal", 3]], output: ["bucket", 1], station: "workbench" });
    expect(recipeById("wood_door")).toMatchObject({ inputs: [["planks", 6]], output: ["door", 1], station: "workbench" });
  });

  it("crafts planks from a chopped log", () => {
    const s = new SurvivalSession();
    s.inventory.add("log", 2);
    expect(s.craft("saw_planks")).toMatchObject({ ok: true });
    expect(s.inventory.count("planks")).toBe(4);
    expect(s.inventory.count("log")).toBe(1);
    expect(s.craft("bucket").ok).toBe(false); // no Workbench in reach
  });
});

describe("gathering wood", () => {
  it("chops logs, planks and saplings by hand; leaves give only a chance of a sapling", () => {
    for (const id of [LOG, LEAVES, PLANKS, SAPLING]) expect(GATHER[id].minLevel).toBe(1);
    expect(dropsFor(LOG)).toBe("log"); expect(dropsFor(PLANKS)).toBe("planks"); expect(dropsFor(SAPLING)).toBe("sapling");
    expect(dropsFor(LEAVES)).toBe(null);
    expect(xpFor(LOG)).toBeGreaterThan(xpFor(LEAVES));
    expect(bonusDrop(LEAVES, 0)).toBe("sapling");
    expect(bonusDrop(LEAVES, BONUS[LEAVES].chance - 1e-9)).toBe("sapling");
    expect(bonusDrop(LEAVES, BONUS[LEAVES].chance)).toBe(null);
    expect(bonusDrop(LOG, 0)).toBe(null);
  });

  it("drops a sapling from leaves on a low roll, never on a high one", () => {
    const cell = { x: 1, y: 1, z: 1 };
    const lucky = new SurvivalSession({ rand: () => 0.01 });
    lucky.beginBreak(cell, LEAVES);
    expect(lucky.tickBreak(1e6, cell, LEAVES)).toMatchObject({ broke: true, drop: null, bonus: "sapling" });
    expect(lucky.inventory.count("sapling")).toBe(1);
    const unlucky = new SurvivalSession({ rand: () => 0.99 });
    unlucky.beginBreak(cell, LEAVES);
    expect(unlucky.tickBreak(1e6, cell, LEAVES)).toMatchObject({ broke: true, bonus: null });
    expect(unlucky.inventory.count("sapling")).toBe(0);
  });

  it("pays xp for a log of a grown tree but not for one the player placed", () => {
    const w = meadow();
    const s = new SurvivalSession({ skills: new Skills() });
    s.attach(w);
    w.set(5, 5, 31, SAPLING); s.markPlaced(5, 5, 31);
    expect(growSapling(w, 5, 5, 31, 12345)).toBe(true);
    expect(w.get(5, 5, 31)).toBe(LOG);
    expect(s.wasPlaced(5, 5, 31)).toBe(false); // the tree is the world's now
    const grown = { x: 5, y: 5, z: 31 };
    s.beginBreak(grown, LOG);
    expect(s.tickBreak(1e6, grown, LOG).xp).toBe(xpFor(LOG));
    const placed = { x: 9, y: 9, z: 31 };
    w.set(9, 9, 31, LOG); s.markPlaced(9, 9, 31);
    s.beginBreak(placed, LOG);
    expect(s.tickBreak(1e6, placed, LOG).xp).toBe(0);
    expect(s.inventory.count("log")).toBe(2);
  });
});

describe("saplings", () => {
  it("are planted on grass or dirt, in air, and nowhere else", () => {
    const w = meadow();
    expect(saplingFits(w, 3, 3, 31)).toBe(true);
    w.set(4, 4, 30, STONE);
    expect(saplingFits(w, 4, 4, 31)).toBe(false);
    w.set(6, 6, 31, WATER);
    expect(saplingFits(w, 6, 6, 31)).toBe(false);
    w.set(7, 7, 30, DIRT);
    expect(saplingFits(w, 7, 7, 31)).toBe(true);
    expect(saplingFits(w, 3, 3, 32)).toBe(false); // floating
  });

  it("grow into a tree of logs and leaves, filling only air", () => {
    const w = meadow();
    w.set(10, 10, 31, SAPLING);
    w.set(12, 10, 34, STONE); // something in the crown's way
    const before = w.version;
    expect(growSapling(w, 10, 10, 31, 7)).toBe(true);
    expect(w.version).toBeGreaterThan(before);
    const top = treeTop(saplingSpecies(31), 7);
    for (let z = 31; z < 31 + 4; z++) expect(w.get(10, 10, z)).toBe(LOG);
    expect(w.get(10, 10, 31 + top)).toBe(LEAVES);
    expect(w.get(12, 10, 34)).toBe(STONE);
    let leaves = 0;
    for (let z = 31; z < 40; z++) for (let y = 7; y <= 13; y++) for (let x = 7; x <= 13; x++) if (w.get(x, y, z) === LEAVES) leaves++;
    expect(leaves).toBeGreaterThan(20);
    // The grass under the trunk is untouched.
    expect(w.get(10, 10, 30)).toBe(GRASS);
  });

  it("do not grow where the trunk would run into a block, or off their soil", () => {
    const w = meadow();
    w.set(10, 10, 31, SAPLING); w.set(10, 10, 33, STONE);
    expect(growSapling(w, 10, 10, 31, 7)).toBe(false);
    expect(w.get(10, 10, 31)).toBe(SAPLING);
    w.set(20, 20, 30, STONE); w.set(20, 20, 31, SAPLING);
    expect(growSapling(w, 20, 20, 31, 7)).toBe(false);
  });

  it("grow on high ground as pines and elsewhere as broadleaf", () => {
    expect(saplingSpecies(31)).toBe(SPECIES.BROADLEAF);
    expect(saplingSpecies(40)).toBe(SPECIES.PINE);
  });

  it("grow on random ticks near the player, and only there", () => {
    const w = meadow();
    w.set(8, 8, 31, SAPLING);
    const far = new World({ bounds: { x0: 0, y0: 0, x1: 256, y1: 256 } });
    for (let x = 200; x < 210; x++) { far.set(x, 200, 30, GRASS); }
    far.set(205, 200, 31, SAPLING);
    const rng = new SeededRNG(42), rand = () => rng.next();
    let ticks = 0;
    while (w.get(8, 8, 31) === SAPLING && ticks < 5000) { randomTick(w, 8, 8, rand); ticks++; }
    expect(w.get(8, 8, 31)).toBe(LOG);
    expect(ticks).toBeGreaterThan(1); // it takes a while, not the first tick
    for (let i = 0; i < 2000; i++) randomTick(far, 8, 8, rand);
    expect(far.get(205, 200, 31)).toBe(SAPLING); // out of the ticked radius
  });

  it("take minutes, not seconds, at the Forge's tick rate", () => {
    // A tick a second: the mean wait over many saplings, from the same rules.
    const rng = new SeededRNG(7), rand = () => rng.next();
    let total = 0;
    const n = 40;
    for (let k = 0; k < n; k++) {
      const w = meadow();
      w.set(8, 8, 31, SAPLING);
      let t = 0;
      while (w.get(8, 8, 31) === SAPLING && t < 20_000) { randomTick(w, 8, 8, rand, { radius: 0 }); t++; }
      total += t;
    }
    const mean = total / n;
    expect(mean).toBeGreaterThan(120);
    expect(mean).toBeLessThan(900);
  });
});

/** A Forge on an adopted world, as in rpg-forge-adapter.test.js. */
function forge(world) {
  const f = new ForgeMode({
    renderer: {},
    audio: { menuSelect() {}, menuConfirm() {}, playNoise() {}, playTone() {} },
    settings: { fov: 70, sensitivity: 1 },
    keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD" },
    canvas: null,
    store: new WorldStore(new MemoryBackend()),
    playerStore: new PlayerStore(new MemoryPlayerBackend()),
  });
  f._adopt(world, 0);
  f.active = true;
  return f;
}

describe("buckets in the Forge", () => {
  it("scoop a water source and pour it somewhere else, turning the held bucket over", () => {
    const w = meadow();
    w.meta.mode = "survival";
    w.set(12, 12, 30, WATER);
    const f = forge(w);
    f.survival.inventory.slots[0] = { item: "bucket", n: 1 };
    f.selectHotbar(0);
    expect(f.heldItem).toBe("bucket");
    // Scoop: the empty bucket targets the water itself.
    f.target = { x: 12, y: 12, z: 30, face: [0, 0, 1] };
    expect(f._targetsWater()).toBe(true);
    f.placeBlock();
    expect(w.get(12, 12, 30)).toBe(AIR);
    expect(f.heldItem).toBe("bucket_water");
    expect(f._targetsWater()).toBe(false);
    // Pour: against the top face of a grass block.
    f.target = { x: 20, y: 20, z: 30, face: [0, 0, 1] };
    f.placeBlock();
    expect(w.get(20, 20, 31)).toBe(WATER);
    expect(f.heldItem).toBe("bucket");
    // An empty bucket with no water in sight does nothing.
    f.target = { x: 21, y: 21, z: 30, face: [0, 0, 1] };
    f.placeBlock();
    expect(w.get(21, 21, 31)).toBe(AIR);
    expect(f.heldItem).toBe("bucket");
  });

  it("plant a sapling item only on soil, and spend it", () => {
    const w = meadow();
    w.meta.mode = "survival";
    w.set(20, 20, 30, STONE);
    const f = forge(w);
    f.survival.inventory.slots[0] = { item: "sapling", n: 2 };
    f.selectHotbar(0);
    f.target = { x: 20, y: 20, z: 30, face: [0, 0, 1] };
    f.placeBlock();
    expect(w.get(20, 20, 31)).toBe(AIR);
    expect(f.survival.inventory.count("sapling")).toBe(2);
    f.target = { x: 5, y: 5, z: 30, face: [0, 0, 1] };
    f.placeBlock();
    expect(w.get(5, 5, 31)).toBe(SAPLING);
    expect(f.survival.inventory.count("sapling")).toBe(1);
  });
});
