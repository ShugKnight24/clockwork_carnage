// tests/unit/rpg-craft-menu.test.js
import { describe, it, expect } from "vitest";
import { craftMenuRows } from "../../js/forge.js";
import { SurvivalSession } from "../../src/rpg/survival-session.js";
import { Skills } from "../../src/rpg/skills.js";

describe("craft menu rows", () => {
  it("shows every station-free recipe, locked ones included", () => {
    const rows = craftMenuRows(new SurvivalSession());
    expect(rows.length).toBe(5);
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
