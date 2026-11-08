// Whether a helmet shows the face is data (`face: true` on its entry), and
// every reader takes it from the one derived FACE_HELMETS set. A fixture
// helmet ("open-fixture", painted like the Centurion) and a closed one
// ("closed-fixture", painted like the standard dome) are added to the Field
// Issue theme's data and art modules for this file only: if any reader kept
// its own list, it would not know the fixture is open.
import { describe, it, expect, vi } from "vitest";
import { FACE_HELMETS } from "../../src/data/wardrobe-themes/index.js";
import { buildAgentParts, buildCastModel } from "../../src/rendering/svg-art/agent-rig.js";
import { validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { characterLayers } from "../../src/ui/portrait-modern.js";
import { lookFromIds } from "./helpers/golden-looks.js";

vi.mock("../../src/data/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  const closed = { id: "closed-fixture", name: "Closed", desc: "Closed" };
  return { default: { ...issue, helmets: [...issue.helmets, { id: "open-fixture", name: "Open", desc: "Open", face: true }, closed] } };
});

vi.mock("../../src/rendering/svg-art/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  return { default: { ...issue, helmets: { ...issue.helmets, "open-fixture": issue.helmets.mohawk, "closed-fixture": issue.helmets.standard } } };
});

const look = (helmet, placements = ["helmet"]) => {
  const ch = lookFromIds({ helmet });
  return { ...ch, badge: { ...ch.badge, placements } };
};
// The bare neck (fallen pose), drawn above the gorget only when the face shows.
const NECK = "M-3.9,-74.6 L3.9,-74.6 L4.5,-65.4 L-4.5,-65.4 Z";
// Whether the helmet badge is drawn: the look with it differs from the one without.
const badged = (render, helmet) => render(look(helmet)) !== render(look(helmet, []));

describe("FACE_HELMETS is the one open-helmet set", () => {
  it("is derived from the data's face flags", () => {
    expect(validateWardrobe()).toEqual([]);
    expect([...FACE_HELMETS].sort()).toEqual(["bandana", "brim", "bubble", "ledmask", "mohawk", "open-fixture", "wide"]);
  });

  it("the rig shows the bare neck and drops the helmet badge for a face helmet", () => {
    // Standing, the build reshapes the neck's path, so look for its skin fill.
    expect(buildAgentParts(look("open-fixture")).collar).toContain("url(#skin)");
    expect(buildAgentParts(look("closed-fixture")).collar).not.toContain("url(#skin)");
    const headOf = (ch) => buildAgentParts(ch).head;
    expect(badged(headOf, "open-fixture")).toBe(false);
    expect(badged(headOf, "closed-fixture")).toBe(true);
  });

  it("the fallen agent and the realistic cast read it too", () => {
    const fallen = (ch, realistic = false) => JSON.stringify(buildCastModel(ch, "hero_fallen", { realistic }));
    expect(fallen(look("open-fixture"))).toContain(NECK);
    expect(fallen(look("closed-fixture"))).not.toContain(NECK);
    expect(badged(fallen, "open-fixture")).toBe(false);
    expect(badged(fallen, "closed-fixture")).toBe(true);
    // Realistic: the head of a face helmet takes the cloth filter, not the armour one.
    const cloth = (h) => fallen(look(h), true).split("url(#rcloth)").length;
    expect(cloth("open-fixture")).toBe(cloth("closed-fixture") + 1);
  });

  it("the HUD portrait reads it", () => {
    expect(characterLayers(lookFromIds({ helmet: "open-fixture" })).open).toBe(true);
    expect(characterLayers(lookFromIds({ helmet: "closed-fixture" })).open).toBe(false);
  });
});
