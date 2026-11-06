// The rig skips each stock layer a frame lists in `hides`. Fixture frames
// ("hides-<word>", the standard frame hiding one word) are added to the
// Field Issue theme's data and art modules for this file only.
import { describe, it, expect, vi } from "vitest";
import { buildAgentParts } from "../../src/rendering/svg-art/agent-rig.js";
import { torso } from "../../src/rendering/svg-art/models/hero.js";
import { HIDES, validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const { WORDS } = vi.hoisted(() => ({ WORDS: ["kit", "collar", "hips", "shoulders", "cape", "limbGlow"] }));

vi.mock("../../src/data/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  return { default: { ...issue, frames: [...issue.frames, ...WORDS.map((w) => ({ id: `hides-${w}`, name: w, desc: w }))] } };
});

vi.mock("../../src/rendering/svg-art/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  const { standard } = issue.frames;
  const fixtures = WORDS.map((w) => [`hides-${w}`, { shape: { ...standard.shape, hides: [w] }, layers: standard.layers }]);
  return { default: { ...issue, frames: { ...issue.frames, ...Object.fromEntries(fixtures) } } };
});

const parts = (frame, ids = {}) => buildAgentParts(lookFromIds({ frame, ...ids }), { pose: "idle" });
const count = (markup, s) => markup.split(s).length - 1;

describe("the rig honours every hides word", () => {
  it("registers a fixture for every word", () => {
    expect(WORDS).toEqual([...HIDES]);
    expect(validateWardrobe()).toEqual([]);
  });

  it("hips: leaves off the belt's hip plates", () => {
    const TASSET = "M-4.8,-22.4 L-14.6,-23";
    expect(torso()).toContain(TASSET);
    expect(torso({ hips: false })).not.toContain(TASSET);
    // The rig warps the torso to the build, so count the tasset's shading, not its path.
    const cyl = (m) => count(m, 'fill="url(#cyl)"');
    expect(cyl(parts("hides-hips").body)).toBe(cyl(parts("standard").body) - 1);
  });

  it("collar: drops the gorget, keeps the bare neck under an open helmet", () => {
    const stock = parts("standard", { helmet: "wide" });
    const hidden = parts("hides-collar", { helmet: "wide" });
    expect(stock.collar).toContain("url(#steel)");
    expect(hidden.collar).not.toContain("url(#steel)");
    expect(stock.collar).toContain("url(#skin)");
    expect(hidden.collar).toContain("url(#skin)");
    expect(parts("hides-collar").collar).toBe("");
  });

  it("kit: drops the chest kit, trims, seams, insignia and core light; keeps the belt light, back gear and badge", () => {
    const ids = { armor: "recon" };
    const stock = parts("standard", ids);
    const hidden = parts("hides-kit", ids);
    const INSIGNIA = 'scale(.62)" stroke-width=".9"';
    const SEAM = 'stroke-width="1.3" stroke-opacity="0.9"';
    const CORE = 'cy="-54" r="1.7"';
    const BELT = 'y="-26" width="3.6" height="2.2"';
    expect(count(stock.body, INSIGNIA)).toBe(1);
    expect(count(hidden.body, INSIGNIA)).toBe(0);
    expect(count(stock.body, SEAM)).toBeGreaterThanOrEqual(2);
    expect(count(hidden.body, SEAM)).toBe(0);
    expect(stock.glow).toContain(CORE);
    expect(hidden.glow).not.toContain(CORE);
    expect(hidden.glow).toContain(BELT);
    expect(hidden.back).toBe(stock.back);
    expect(hidden.body.length).toBeLessThan(stock.body.length - 200);
  });

  it("kit: the player's chest badge still draws on the frame", () => {
    const look = lookFromIds({ frame: "hides-kit" });
    const withBadge = { ...look, badge: { ...look.badge, placements: ["chest"] } };
    const without = { ...look, badge: { ...look.badge, placements: [] } };
    const a = buildAgentParts(withBadge, { pose: "idle" }).body;
    const b = buildAgentParts(without, { pose: "idle" }).body;
    expect(a.length).toBeGreaterThan(b.length);
  });

  it("shoulders, cape, limbGlow: drop their stock layers", () => {
    const stock = parts("standard");
    expect(parts("hides-shoulders").body.length).toBeLessThan(stock.body.length);
    expect(stock.cape).not.toBe("");
    expect(parts("hides-cape").cape).toBe("");
    expect(parts("hides-limbGlow").glow.length).toBeLessThan(stock.glow.length);
  });
});
