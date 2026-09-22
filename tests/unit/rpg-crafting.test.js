// tests/unit/rpg-crafting.test.js
import { describe, it, expect } from "vitest";
import { canCraft, craft } from "../../src/rpg/crafting.js";
import { Inventory, TOTAL_SLOTS } from "../../src/rpg/inventory.js";
import { Skills } from "../../src/rpg/skills.js";

const stocked = (pairs) => {
  const inv = new Inventory();
  pairs.forEach(([id, n]) => inv.add(id, n));
  return inv;
};

describe("canCraft", () => {
  it("accepts exactly enough inputs", () => {
    expect(canCraft("cut_stone", stocked([["rock", 2]]), new Skills())).toEqual({ ok: true });
  });

  it("names the missing input when one short", () => {
    expect(canCraft("cut_stone", stocked([["rock", 1]]), new Skills()))
      .toEqual({ ok: false, reason: "Need 2 Rock" });
  });

  it("names the construction requirement when under-levelled", () => {
    const inv = stocked([["metal", 3], ["rock", 2]]);
    expect(canCraft("pick_metal", inv, new Skills()))
      .toEqual({ ok: false, reason: "Requires Construction 10" });
  });

  it("refuses an unknown recipe", () => {
    expect(canCraft("nope", new Inventory(), new Skills()))
      .toEqual({ ok: false, reason: "Unknown recipe" });
  });

  it("refuses when the output cannot fit", () => {
    // Every slot full, and the rock slot stays occupied after two come out,
    // so there is nowhere for the stone to go.
    const inv = new Inventory();
    inv.add("rock", 64);
    for (let i = 1; i < TOTAL_SLOTS; i++) inv.add("dirt", 64);
    expect(inv.fits("stone", 1)).toBe(false);
    expect(canCraft("cut_stone", inv, new Skills()))
      .toEqual({ ok: false, reason: "Inventory full" });
    // ...but with a slot free it goes through, proving the probe is not
    // simply reporting "full" for every full-ish inventory.
    inv.remove("dirt", 64);
    expect(canCraft("cut_stone", inv, new Skills())).toEqual({ ok: true });
  });
});

describe("craft", () => {
  it("consumes inputs, yields output and grants construction xp", () => {
    const inv = stocked([["rock", 5]]);
    const skills = new Skills();
    const res = craft("cut_stone", inv, skills);
    expect(res.ok).toBe(true);
    expect(res.output).toEqual(["stone", 1]);
    expect(inv.count("rock")).toBe(3);
    expect(inv.count("stone")).toBe(1);
    expect(skills.xp.construction).toBe(10);
    expect(skills.xp.mining).toBe(0);
  });

  it("crafts a pickaxe from stone and rock", () => {
    const inv = stocked([["stone", 3], ["rock", 2]]);
    const skills = new Skills();
    expect(craft("pick_stone", inv, skills).ok).toBe(true);
    expect(inv.count("pick_stone")).toBe(1);
    expect(inv.count("stone")).toBe(0);
    expect(inv.count("rock")).toBe(0);
  });

  it("leaves inputs untouched on every refusal", () => {
    const inv = stocked([["rock", 1]]);
    const skills = new Skills();
    expect(craft("cut_stone", inv, skills).ok).toBe(false);
    expect(inv.count("rock")).toBe(1);
    expect(skills.xp.construction).toBe(0);

    const gated = stocked([["metal", 3], ["rock", 2]]);
    expect(craft("pick_metal", gated, skills).ok).toBe(false);
    expect(gated.count("metal")).toBe(3);
    expect(gated.count("rock")).toBe(2);
  });

  it("reports a level-up through the result", () => {
    const inv = stocked([["rock", 20]]);
    const skills = new Skills();
    let leveled = false;
    for (let i = 0; i < 10; i++) {
      const r = craft("cut_stone", inv, skills);
      if (r.ok && r.leveled) leveled = true;
    }
    expect(leveled).toBe(true);
  });
});
