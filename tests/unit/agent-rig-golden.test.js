// tests/unit/agent-rig-golden.test.js
// Golden snapshots of the agent rig's full markup for a fixed matrix of
// looks (helpers/golden-looks.js). Moving pieces between modules must leave
// every file unchanged; an intended art change updates only the pieces it
// meant to, reviewed as a readable diff.
import { describe, it, expect } from "vitest";
import { buildAgentSvg, buildCastModel, CAST_KEYS, OPEN_HELMETS } from "../../src/rendering/svg-art/agent-rig.js";
import { BODY_FRAMES, HELMET_STYLES, VISOR_STYLES, SHOULDER_STYLES, BODY_TYPES } from "../../src/data/cosmetics.js";
import { PLACEMENTS } from "../../src/data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES } from "../../src/data/accessories.js";
import { GOLDEN_MATRIX, lookFromIds, normaliseSvg } from "./helpers/golden-looks.js";

/** A cast model as one SVG-shaped document: defs, then each layer with its animation. */
function castMarkup(model, key) {
  const layers = model.layers
    .map((l) => {
      const anim = l.anim ? ` data-anim='${JSON.stringify(l.anim)}'` : "";
      const blend = l.blend ? ` data-blend="${l.blend}"` : "";
      return `<g class="cast-layer"${anim}${blend}>${l.markup}</g>`;
    })
    .join("");
  const anim = model.anim ? ` data-anim='${JSON.stringify(model.anim)}'` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${model.box.join(" ")}" data-cast="${key}"${anim}><defs>${model.defs}</defs>${layers}</svg>`;
}

function render(entry) {
  const ch = lookFromIds(entry.ids);
  if (entry.kind === "cast") {
    const { key, ...opts } = entry.opts;
    return castMarkup(buildCastModel(ch, key, opts), key);
  }
  return buildAgentSvg(ch, entry.opts);
}

describe("agent rig golden snapshots", () => {
  it("covers every frame, helmet, visor and shoulder, both builds and both poses", () => {
    const svgs = GOLDEN_MATRIX.filter((e) => e.kind === "svg");
    const seen = (field) => new Set(GOLDEN_MATRIX.map((e) => e.ids[field]));
    for (const [field, table] of [["frame", BODY_FRAMES], ["helmet", HELMET_STYLES], ["shoulder", SHOULDER_STYLES]]) {
      for (const { id } of table) expect(seen(field), `${field} ${id}`).toContain(id);
    }
    // A visor only draws on a helmet that takes one.
    const visorShown = new Set(GOLDEN_MATRIX.filter((e) => e.ids.helmet && HELMET_STYLES.find((h) => h.id === e.ids.helmet).visor !== false).map((e) => e.ids.visor));
    for (const { id } of VISOR_STYLES) expect(visorShown, `visor ${id}`).toContain(id);
    for (const { id } of BODY_TYPES) {
      for (const pose of ["idle", "hero"]) {
        expect(svgs.some((e) => e.ids.body === id && e.opts.pose === pose && !e.opts.realistic), `${id} ${pose}`).toBe(true);
      }
    }
    for (const key of CAST_KEYS) expect(GOLDEN_MATRIX.some((e) => e.kind === "cast" && e.opts.key === key), key).toBe(true);
    expect(svgs.some((e) => e.opts.realistic)).toBe(true);
    expect(svgs.some((e) => e.opts.pose === "bust" && e.opts.peek)).toBe(true);
    expect(new Set(GOLDEN_MATRIX.map((e) => e.name)).size).toBe(GOLDEN_MATRIX.length);
  });

  it("covers badges, accessories, armour variants, the fallen agent's helmets and option tiles", () => {
    const open = (e) => OPEN_HELMETS.has(e.ids.helmet);
    const visorless = (e) => HELMET_STYLES.find((h) => h.id === e.ids.helmet).visor === false;
    // Every helmet carries a badge at every placement, so each badge seat is drawn.
    for (const { id: helmet } of HELMET_STYLES) {
      const worn = GOLDEN_MATRIX.filter((e) => e.ids.helmet === helmet && e.ids.badge);
      for (const { id } of PLACEMENTS) expect(worn.some((e) => e.ids.badge.placements.includes(id)), `${helmet} badge ${id}`).toBe(true);
      expect(worn.some((e) => e.ids.accessories?.helmet && e.ids.accessories.helmet !== "none"), `${helmet} helmet accessory`).toBe(true);
    }
    // Every accessory item of every slot is worn somewhere.
    for (const { id: slot } of ACCESSORY_SLOTS) {
      const worn = new Set(GOLDEN_MATRIX.map((e) => e.ids.accessories?.[slot]));
      for (const { id } of ACCESSORIES[slot]) if (id !== "none") expect(worn, `${slot} ${id}`).toContain(id);
    }
    expect(GOLDEN_MATRIX.some((e) => e.ids.armorVariant === 1)).toBe(true);
    // And the stock agent with nothing worn.
    expect(GOLDEN_MATRIX.some((e) => !e.ids.badge && !e.ids.accessories)).toBe(true);
    const fallen = GOLDEN_MATRIX.filter((e) => e.kind === "cast" && e.opts.key === "hero_fallen");
    expect(fallen.some(open), "fallen open helmet").toBe(true);
    expect(fallen.some((e) => !open(e) && !visorless(e)), "fallen closed helmet").toBe(true);
    for (const helmet of HELMET_STYLES.filter((h) => h.visor === false)) {
      expect(fallen.some((e) => e.ids.helmet === helmet.id), `fallen ${helmet.id}`).toBe(true);
    }
    const heads = GOLDEN_MATRIX.filter((e) => e.opts.headOnly);
    for (const realistic of [false, true]) {
      const tiles = heads.filter((e) => !!e.opts.realistic === realistic);
      expect(tiles.some(open), `head open realistic=${realistic}`).toBe(true);
      expect(tiles.some((e) => !open(e)), `head closed realistic=${realistic}`).toBe(true);
    }
  });

  it("lookFromIds rejects unknown fields and ids", () => {
    expect(() => lookFromIds({ helmet: "nope" })).toThrow(/helmet/);
    expect(() => lookFromIds({ hat: "wide" })).toThrow(/hat/);
  });

  it.each(GOLDEN_MATRIX.map((e) => [e.name, e]))("%s", async (name, entry) => {
    await expect(normaliseSvg(render(entry))).toMatchFileSnapshot(`./__golden__/${name}.svg`);
  });
});
