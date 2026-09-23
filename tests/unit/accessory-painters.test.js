import { describe, it, expect } from "vitest";
import { paintAccessories, PAINTERS_BY_SLOT } from "../../src/rendering/svg-art/accessories/index.js";
import { ACCESSORY_SLOTS, ACCESSORIES, DEFAULT_ACCESSORIES } from "../../src/data/accessories.js";
import { buildAgentParts, buildCastModel, rigAnchors } from "../../src/rendering/svg-art/agent-rig.js";
import { STAND, ARMED, FALLEN, armJoints } from "../../src/rendering/svg-art/models/hero.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { cloneLook } from "../../src/core/character-fields.js";

const LOOK = { pal: { primary: "#3a6ea5", accent: "#00e5ff", dark: "#0b1a2a" }, cape: ["#aa3333", "#882222", "#551111", "#220505"], energy: "#00e5ff", armor: "standard" };
const POSES = [[STAND, "standing"], [ARMED, "armed"], [FALLEN, "fallen"]];

describe("accessory painters", () => {
  it("every item has a painter that returns strings in every pose", () => {
    for (const { id: slot } of ACCESSORY_SLOTS) {
      for (const item of ACCESSORIES[slot].slice(1)) {
        const paint = PAINTERS_BY_SLOT[slot][item.id];
        expect(paint, `${slot}.${item.id}`).toBeTypeOf("function");
        for (const [P, pose] of POSES) {
          const out = paint(rigAnchors(P, [0, 0], pose), LOOK);
          const all = Object.values(out).join("");
          expect(all.length, `${slot}.${item.id}/${pose}`).toBeGreaterThan(40);
          expect(all).not.toMatch(/\bid="/);
          expect(all, `${slot}.${item.id}/${pose}`).not.toMatch(/url\(#/);
          expect(all, `${slot}.${item.id}/${pose}`).not.toMatch(/NaN|undefined/);
        }
      }
    }
  });

  it("none paints nothing", () => {
    const out = paintAccessories(DEFAULT_ACCESSORIES, rigAnchors(STAND, [0, 0], "standing"), LOOK);
    expect(out.back + out.front + out.top + out.glow + out.head + out.headGlow).toBe("");
    expect(out.replacesCape).toBe(false);
  });

  it("the long cloak replaces the armour cape", () => {
    const out = paintAccessories({ ...DEFAULT_ACCESSORIES, back: "cloak" }, rigAnchors(STAND, [0, 0], "standing"), LOOK);
    expect(out.replacesCape).toBe(true);
  });

  it("the agent carries accessory markup", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.accessories = { ...ch.accessories, back: "backpack", helmet: "nvg", legs: "kneepads" };
    const p = buildAgentParts(ch);
    expect(p.back).toContain("data-acc=\"backpack\"");
    expect(p.head).toContain("data-acc=\"nvg\"");
    expect(p.body).toContain("data-acc=\"kneepads\"");
  });

  it("helmet lights glow with the head", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.accessories = { ...ch.accessories, helmet: "lamp" };
    const p = buildAgentParts(ch);
    expect(p.headGlow).toContain("data-acc=\"lamp\"");
    expect(p.glow).not.toContain("data-acc=\"lamp\"");
  });

  it("a cloak drops the armour cape standing and fallen", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    const plain = buildCastModel(ch, "hero_fallen").layers.map((l) => l.markup).join("");
    expect(buildAgentParts(ch).cape).not.toBe("");
    ch.accessories = { ...ch.accessories, back: "cloak" };
    expect(buildAgentParts(ch).cape).toBe("");
    const cloaked = buildCastModel(ch, "hero_fallen").layers.map((l) => l.markup).join("");
    expect(cloaked).toContain("data-acc=\"cloak\"");
    expect(cloaked).not.toContain("url(#capeIn)");
    expect(plain).toContain("url(#capeIn)");
  });

  it("the fallen agent carries gear from every slot", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.accessories = { back: "backpack", waist: "belt", helmet: "lamp", arms: "gauntlets", neck: "tags", legs: "shins" };
    const all = buildCastModel(ch, "hero_fallen").layers.map((l) => l.markup).join("");
    for (const id of Object.values(ch.accessories)) expect(all, id).toContain(`data-acc="${id}"`);
  });

  it.each(POSES)("forearm axis anchors lie on the forearm centreline (%#)", (P, pose) => {
    const A = rigAnchors(P, [0, 0], pose);
    P.arms.forEach((arm, i) => {
      const { el, wr } = armJoints(arm, i === 0 ? -1 : 1);
      const a = i === 0 ? A.forearmAxisL : A.forearmAxisR;
      expect(a.x).toBeCloseTo((el[0] + wr[0]) / 2, 5);
      expect(a.y).toBeCloseTo((el[1] + wr[1]) / 2, 5);
      expect(a.len).toBeCloseTo(Math.hypot(wr[0] - el[0], wr[1] - el[1]), 5);
      // rot 0 points down the arm (+y), matching the badge anchors.
      const r = ((a.rot + 90) * Math.PI) / 180;
      expect(Math.cos(r)).toBeCloseTo((wr[0] - el[0]) / a.len, 2);
      expect(Math.sin(r)).toBeCloseTo((wr[1] - el[1]) / a.len, 2);
    });
  });
});
