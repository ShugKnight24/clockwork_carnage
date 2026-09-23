// tests/unit/rpg-craft-menu.test.js
import { describe, it, expect } from "vitest";
import { craftMenuRows, ForgeMode } from "../../js/forge.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { Skills } from "../../src/rpg/skills.js";
import { World } from "../../src/world/world.js";
import { STATIONS } from "../../src/rpg/stations.js";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import { PlayerStore, MemoryPlayerBackend } from "../../src/rpg/player-store.js";

describe("craft menu rows", () => {
  it("shows every station-free recipe, locked ones included", () => {
    const rows = craftMenuRows(new SurvivalSession());
    expect(rows.length).toBe(7); // the five basics, sawing planks and the raft
    expect(rows.map((r) => r.id)).toContain("pick_metal");
    const locked = rows.find((r) => r.id === "pick_metal");
    expect(locked.locked).toBe(true);
    expect(locked.note).toBe("Requires Construction 10");
  });

  it("marks a recipe craftable only when the inputs are actually held", () => {
    const s = new SurvivalSession();
    let rows = craftMenuRows(s);
    expect(rows.find((r) => r.id === "cut_stone").craftable).toBe(false);
    expect(rows.find((r) => r.id === "cut_stone").note).toBe("Need 2 Rock");

    s.inventory.add("rock", 2);
    rows = craftMenuRows(s);
    expect(rows.find((r) => r.id === "cut_stone").craftable).toBe(true);
    expect(rows.find((r) => r.id === "cut_stone").note).toBe(null);
  });

  it("shows the level gate ahead of the missing inputs", () => {
    const s = new SurvivalSession({ skills: new Skills() });
    s.inventory.add("metal", 3);
    s.inventory.add("rock", 2);
    const row = craftMenuRows(s).find((r) => r.id === "pick_metal");
    expect(row.note).toBe("Requires Construction 10");
  });

  it("renders each row with a name and an input summary", () => {
    const rows = craftMenuRows(new SurvivalSession());
    const cut = rows.find((r) => r.id === "cut_stone");
    expect(cut.name).toBe("Cut Stone");
    expect(cut.inputText).toBe("2 Rock");
    expect(rows.find((r) => r.id === "pick_stone").inputText).toBe("3 Stone, 2 Rock");
    expect(cut.outputText).toBe("1 Stone");
  });
});

describe("craft menu with stations", () => {
  const maxed = () => {
    const s = new SurvivalSession();
    s.skills.grant("construction", 100_000);
    return s;
  };

  it("shows only the station-free tier with nothing in reach", () => {
    const ids = craftMenuRows(maxed(), new Set()).map((r) => r.id);
    expect(ids).toContain("cut_stone");
    expect(ids).toContain("workbench");
    expect(ids).not.toContain("anvil");
    expect(ids).not.toContain("repair_pick_stone");
  });

  it("adds a station's rows when it is in reach", () => {
    const ids = craftMenuRows(maxed(), new Set(["workbench"])).map((r) => r.id);
    expect(ids).toContain("anvil");
    expect(ids).toContain("smelt_metal");
  });

  it("renders a repair row with its target instead of an output item", () => {
    const row = craftMenuRows(maxed(), new Set(["anvil"])).find((r) => r.id === "repair_pick_stone");
    expect(row.outputText).toBe("Repair Stone Pickaxe");
    expect(row.inputText).toBe("1 Stone, 1 Rock");
    expect(row.craftable).toBe(false);
    // Missing inputs outrank the repair target, as `canCraft` checks them first.
    expect(row.note).toBe("Need 1 Stone");
  });

  it("notes the missing repair target once the inputs are held", () => {
    const s = maxed();
    s.inventory.add("stone", 1);
    s.inventory.add("rock", 1);
    const row = craftMenuRows(s, new Set(["anvil"])).find((r) => r.id === "repair_pick_stone");
    expect(row.craftable).toBe(false);
    expect(row.note).toBe("Nothing to repair");
  });

  // Review Focus 5
  it("drops a station's rows once the block is gone", () => {
    const s = maxed();
    const w = new World();
    w.set(65, 64, 32, STATIONS.workbench);
    const player = { x: 64.5, y: 64.5, z: 32 };
    expect(craftMenuRows(s, s.stations(w, player)).map((r) => r.id)).toContain("anvil");

    w.set(65, 64, 32, 0); // somebody mined the bench
    expect(craftMenuRows(s, s.stations(w, player)).map((r) => r.id)).not.toContain("anvil");
  });
});

/** A Forge on a survival world. The craft menu never touches a GL context. */
function forge() {
  const f = new ForgeMode({
    renderer: {},
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: { fov: 70, sensitivity: 1 },
    keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD" },
    canvas: null,
    store: new WorldStore(new MemoryBackend()),
    playerStore: new PlayerStore(new MemoryPlayerBackend()),
  });
  f._adopt(new World({ mode: "survival" }), 0);
  return f;
}

describe("a selection the row list has outgrown", () => {
  it("clamps once the bench goes out of reach", () => {
    const f = forge();
    f.survival.skills.grant("construction", 100_000);
    f.craftOpen = true;
    f.stationsNear = new Set(["workbench"]);
    f.craftIndex = craftMenuRows(f.survival, f.stationsNear).length - 1;

    f.stationsNear = new Set(); // walked away with the menu still open
    expect(() => f.handleKeyDown({ code: "Enter" })).not.toThrow();
    expect(f.craftIndex).toBe(craftMenuRows(f.survival, new Set()).length - 1);
  });
});
