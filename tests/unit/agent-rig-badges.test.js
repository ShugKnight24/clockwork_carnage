// tests/unit/agent-rig-badges.test.js
import { describe, it, expect } from "vitest";
import { buildAgentParts, buildCastModel, rigAnchors } from "../../src/rendering/svg-art/agent-rig.js";
import { STAND, armJoints } from "../../src/rendering/svg-art/models/hero.js";
import { DEFAULT_CHARACTER } from "../../src/data/cosmetics.js";
import { cloneLook } from "../../src/core/character-fields.js";
import { layer } from "../../src/data/badges.js";

const withBadge = (placements, finish = "insignia") => {
  const ch = cloneLook(DEFAULT_CHARACTER);
  ch.badge = { layers: [layer("guard", "cog", "oxblood", "brass")], finish, placements };
  return ch;
};
const count = (s, needle) => s.split(needle).length - 1;

describe("agent badges", () => {
  it("no placements draws no badge", () => {
    expect(buildAgentParts(withBadge([])).body).not.toContain("data-finish=");
  });

  it("draws one badge per placement", () => {
    const all = buildAgentParts(withBadge(["chest", "shoulder", "forearm"]));
    expect(count(all.body, "data-finish=")).toBe(3);
    const helm = buildAgentParts(withBadge(["helmet"]));
    expect(count(helm.head, "data-finish=")).toBe(1);
  });

  it("small anchors keep a visible scale", () => {
    const p = buildAgentParts(withBadge(["chest", "shoulder", "helmet", "forearm"]));
    const scales = [...(p.body + p.head).matchAll(/scale\(([\d.]+)\)"><g data-finish=/g)].map((m) => +m[1]);
    expect(scales).toEqual([0.077, 0.062, 0.044, 0.046]);
  });

  it("idle forearm badges sit above the vambrace energy channel", () => {
    const A = rigAnchors(STAND, [0, 0], "standing");
    [["forearmL", -1], ["forearmR", 1]].forEach(([key, side], i) => {
      const { el, wr } = armJoints(STAND.arms[i], side);
      const len = Math.hypot(wr[0] - el[0], wr[1] - el[1]);
      const d = Math.hypot(A[key].x - el[0], A[key].y - el[1]);
      // The channel runs from 0.3 to 0.82 of elbow→wrist (hero.js armoredArm).
      expect(d + A[key].size / 2).toBeLessThanOrEqual(0.3 * len);
    });
  });

  it("auto finish follows the armour treatment", () => {
    expect(buildAgentParts(withBadge(["chest"], "auto")).body).toMatch(/data-finish="(insignia|stencil|patch|holo)"/);
  });

  it("fallen cast model keeps chest and shoulder badges", () => {
    const m = buildCastModel(withBadge(["chest", "shoulder"]), "hero_fallen");
    expect(JSON.stringify(m)).toContain("data-finish=");
  });

  it("a legacy-shaped record (badgeIndex only) still draws", () => {
    const ch = { ...DEFAULT_CHARACTER, badgeIndex: 3 };
    delete ch.badge;
    expect(() => buildAgentParts(ch)).not.toThrow();
  });
});
