// tests/unit/agent-rig-badges.test.js
import { describe, it, expect } from "vitest";
import { buildAgentParts, buildCastModel, rigAnchors } from "../../src/rendering/svg-art/agent-rig.js";
import { STAND, ARMED, FALLEN, VAMBRACE, armJoints } from "../../src/rendering/svg-art/models/hero.js";
import { DEFAULT_CHARACTER, ARMOR_STYLES } from "../../src/data/cosmetics.js";
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

  describe.each([
    ["standing", STAND, [true, false]],
    ["armed", ARMED, [false, false]],
    ["fallen", FALLEN, [true, false]],
  ])("%s forearm badges clear the vambrace", (pose, P, chrono) => {
    const A = rigAnchors(P, [0, 0], pose);
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const segDist = (p, a, b) => {
      const ab = [b[0] - a[0], b[1] - a[1]];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2)));
      return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t);
    };
    it.each([["forearmL", 0, -1], ["forearmR", 1, 1]])("%s", (key, i, side) => {
      const { el, wr } = armJoints(P.arms[i], side);
      const a = A[key];
      const r = a.size / 2;
      const c = [a.x, a.y];
      // Channel + ink seam, drawn as in hero.js armoredArm.
      const d = segDist(c, lerp(el, wr, VAMBRACE.channel[0]), lerp(el, wr, VAMBRACE.channel[1]));
      expect(d).toBeGreaterThanOrEqual(r + VAMBRACE.seam / 2);
      if (chrono[i]) expect(Math.hypot(c[0] - lerp(el, wr, VAMBRACE.device)[0], c[1] - lerp(el, wr, VAMBRACE.device)[1])).toBeGreaterThanOrEqual(r + Math.hypot(...VAMBRACE.deviceHalf));
      // Outer side: away from the body centreline.
      expect(Math.sign(a.x - lerp(el, wr, 0.3)[0])).toBe(side);
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

describe("armour variants", () => {
  it("wearing a variant adds its trim and changes the markup", () => {
    const base = cloneLook(DEFAULT_CHARACTER);
    const v = cloneLook(DEFAULT_CHARACTER);
    v.armorVariant = 1;
    const a = buildAgentParts(base).body;
    const b = buildAgentParts(v).body;
    expect(b).not.toBe(a);
    expect(b.toLowerCase()).toContain(ARMOR_STYLES[0].variant.trim.toLowerCase());
    expect(b).toContain('data-variant="');
  });

  it("heavy wear adds scratches", () => {
    const i = ARMOR_STYLES.findIndex((x) => x.variant.wear >= 0.8);
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.armorIndex = i;
    ch.armorVariant = 1;
    expect(buildAgentParts(ch).body).toContain('class="ag-wear"');
  });

  it("low wear draws no scratches", () => {
    const i = ARMOR_STYLES.findIndex((x) => x.variant.wear < 0.3);
    const ch = cloneLook(DEFAULT_CHARACTER);
    ch.armorIndex = i;
    ch.armorVariant = 1;
    expect(buildAgentParts(ch).body).not.toContain('class="ag-wear"');
  });
});
