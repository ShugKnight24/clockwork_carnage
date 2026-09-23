import { describe, it, expect } from "vitest";
import { normalizeBadge, normalizeAccessories, migrateLegacyBadge } from "../../src/core/character-normalize.js";
import { DEFAULT_BADGE } from "../../src/data/badges.js";
import { BADGES, SHOULDER_STYLES } from "../../src/data/cosmetics.js";

const sh = (id) => SHOULDER_STYLES.findIndex((s) => s.id === id);

describe("normalizeBadge", () => {
  it("returns a fresh default for junk", () => {
    for (const junk of [null, undefined, 3, "x", [], { layers: "no" }]) {
      const b = normalizeBadge(junk);
      expect(b).toEqual(DEFAULT_BADGE);
      expect(b).not.toBe(DEFAULT_BADGE);
      expect(b.layers[0]).not.toBe(DEFAULT_BADGE.layers[0]);
    }
  });

  it("replaces unknown ids per field and keeps valid ones", () => {
    const b = normalizeBadge({ layers: [{ frame: "hex", symbol: "nope", enamel: "crimson", metal: "tin" }], finish: "glitter", placements: ["chest", "knee", "chest"] });
    expect(b.layers[0]).toMatchObject({ frame: "hex", symbol: "clock", enamel: "crimson", metal: "brass" });
    expect(b.finish).toBe("auto");
    expect(b.placements).toEqual(["chest"]);
  });

  it("clamps layer numbers and keeps at most 8 layers", () => {
    const l = { frame: "disc", symbol: "star", enamel: "teal", metal: "gold", x: 999, y: -999, scale: 40, rot: 725 };
    const b = normalizeBadge({ layers: Array(12).fill(l), finish: "insignia", placements: [] });
    expect(b.layers).toHaveLength(8);
    expect(b.layers[0]).toMatchObject({ x: 40, y: -40, scale: 2, rot: 5 });
  });
});

describe("normalizeAccessories", () => {
  it("fills every slot and drops unknown ids and slots", () => {
    expect(normalizeAccessories({ back: "backpack", waist: "nope", tail: "x" })).toEqual({
      back: "backpack", waist: "none", helmet: "none", arms: "none", neck: "none", legs: "none",
    });
    expect(normalizeAccessories(null).back).toBe("none");
  });
});

describe("migrateLegacyBadge", () => {
  it("None becomes a hidden badge", () => {
    expect(migrateLegacyBadge(0, 0).placements).toEqual([]);
  });

  it("every old icon becomes its symbol on a brass disc on the chest", () => {
    BADGES.forEach((old, i) => {
      if (!old.icon) return;
      const b = migrateLegacyBadge(i, sh("pads"));
      expect(b.layers[0]).toMatchObject({ symbol: old.icon, frame: "disc", metal: "brass" });
      expect(b.finish).toBe("insignia");
      expect(b.placements).toEqual(["chest"]);
    });
  });

  it("keeps the shoulder copy for pauldrons and armored shoulders", () => {
    expect(migrateLegacyBadge(3, sh("pauldrons")).placements).toEqual(["chest", "shoulder"]);
    expect(migrateLegacyBadge(3, sh("armored")).placements).toEqual(["chest", "shoulder"]);
  });

  it("out-of-range index is treated as None", () => {
    expect(migrateLegacyBadge(99, 0).placements).toEqual([]);
  });
});
