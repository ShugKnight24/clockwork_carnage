import { describe, it, expect } from "vitest";
import { ENEMY_RENDERERS } from "../../src/rendering/enemies/index.js";
import { NPC_TYPES } from "../../src/data/npcs.js";
import { Npc } from "../../js/npc.js";

/** A 2D context that counts the shapes drawn. */
function countingCtx() {
  const grad = { addColorStop() {} };
  const seen = { fills: 0 };
  return new Proxy(seen, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === "fill" || prop === "fillRect") return () => target.fills++;
      if (prop === "createRadialGradient" || prop === "createLinearGradient") return () => grad;
      return () => {};
    },
    set: () => true,
  });
}

describe("the station's people in Legacy", () => {
  it("has a figure for every kind of NPC, not the generic block", () => {
    for (const kind of Object.keys(NPC_TYPES)) expect(typeof ENEMY_RENDERERS[kind]).toBe("function");
  });

  it("draws each kind front-on, from behind, gesturing and walking", () => {
    for (const kind of Object.keys(NPC_TYPES)) {
      const npc = new Npc(5, 5, kind);
      for (const [away, setup] of [
        [false, () => {}],
        [true, () => {}],
        [false, () => npc.pose("salute", 5)],
        [false, () => npc.pose("point", 5)],
        [false, () => npc.walk([[9, 5]])],
      ]) {
        setup();
        const ctx = countingCtx();
        expect(() => ENEMY_RENDERERS[kind](ctx, 400, 300, 120, 120, 252, 360, 72, "#000", "#000", 1, 1000, npc, false, away)).not.toThrow();
        // A person is many shapes: head, hands, uniform details (the old block was three).
        expect(ctx.fills).toBeGreaterThan(8);
      }
    }
  });
});
