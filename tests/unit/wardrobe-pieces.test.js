// The rig draws every helmet and shoulder through its art, never from its
// own per-piece knowledge. Fixture pieces with anchors, seats and scale caps
// no real piece has, and painters that leave a marker, are added to the
// Field Issue theme's data and art modules for this file only: if the rig
// kept a per-id case or table anywhere, the fixtures would come out wrong.
import { describe, it, expect, vi } from "vitest";
import { buildAgentParts, buildCastModel, rigAnchors } from "../../src/rendering/svg-art/agent-rig.js";
import { validateWardrobe } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { STAND, FALLEN } from "../../src/rendering/svg-art/models/hero.js";
import { lookFromIds } from "./helpers/golden-looks.js";

// Hoisted with the mocks, which run before the imports.
const { ANCHORS } = vi.hoisted(() => ({ ANCHORS: { top: -99.3, half: 13.1, rail: -81.7, badge: { x: 6.2, y: -93.4, rot: 11, size: 3.9 } } }));

vi.mock("../../src/data/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  const entry = (id) => ({ id, name: id, desc: id });
  return {
    default: {
      ...issue,
      helmets: [...issue.helmets, entry("anchor-fixture"), entry("badgeless-fixture")],
      shoulders: [...issue.shoulders, entry("shoulder-fixture"), entry("capped-fixture")],
    },
  };
});

vi.mock("../../src/rendering/svg-art/wardrobe-themes/issue.js", async (importOriginal) => {
  const { default: issue } = await importOriginal();
  const head = (tag) => () => ({ front: `<g data-fixture="${tag}-front"/>`, glow: `<g data-fixture="${tag}-glow"/>` });
  const pad = (tag) => (c, s) => `<g data-fixture="${tag}${s < 0 ? "-left" : "-right"}"/>`;
  return {
    default: {
      ...issue,
      helmets: {
        ...issue.helmets,
        "anchor-fixture": { anchors: ANCHORS, seats: { brow: false }, paint: head("anchor") },
        "badgeless-fixture": { anchors: { ...ANCHORS, badge: false }, paint: head("badgeless") },
      },
      shoulders: {
        ...issue.shoulders,
        "shoulder-fixture": { paint: pad("shoulder") },
        "capped-fixture": { paint: pad("capped"), maxShoulderScale: 0.5 },
      },
    },
  };
});

const look = (ids, placements = []) => {
  const ch = lookFromIds(ids);
  return { ...ch, badge: { ...ch.badge, placements }, accessories: { ...ch.accessories, ...ids.accessories } };
};
const fallen = (ch) => buildCastModel(ch, "hero_fallen").layers.map((l) => l.markup).join("");

describe("helmets come from their art", () => {
  it("the fixtures are registered", () => {
    expect(validateWardrobe()).toEqual([]);
  });

  it("rigAnchors seats helmet gear and the badge on the helmet's own anchors", () => {
    const A = rigAnchors(STAND, [0, 0], "standing", "anchor-fixture");
    expect(A.crown.y).toBeCloseTo(ANCHORS.top + 0.8, 10);
    expect(A.browL.y).toBeCloseTo(ANCHORS.top + 7.6, 10);
    expect(A.sideL.x).toBeCloseTo(-ANCHORS.half + 0.2, 10);
    expect(A.sideL.y).toBe(ANCHORS.rail);
    expect(A.helmet).toEqual(ANCHORS.badge);
    expect(A.seats).toEqual({ crown: true, brow: false, side: true });
    expect(rigAnchors(FALLEN, [14, -4], "fallen", "badgeless-fixture").helmet).toBeNull();
  });

  it("the head is the helmet's painter, standing and fallen", () => {
    const p = buildAgentParts(look({ helmet: "anchor-fixture" }));
    expect(p.head).toContain(`data-fixture="anchor-front"`);
    expect(p.headGlow).toContain(`data-fixture="anchor-glow"`);
    const down = fallen(look({ helmet: "anchor-fixture" }));
    expect(down).toContain(`data-fixture="anchor-front"`);
    expect(down).toContain(`data-fixture="anchor-glow"`);
  });

  it("the helmet badge sits on the helmet's badge point, and not at all with badge: false", () => {
    const head = (helmet, placements) => buildAgentParts(look({ helmet }, placements)).head;
    expect(head("anchor-fixture", ["helmet"])).toContain("translate(6.2,-93.4) rotate(11) scale(0.039)");
    expect(head("badgeless-fixture", ["helmet"])).toBe(head("badgeless-fixture", []));
    expect(fallen(look({ helmet: "badgeless-fixture" }, ["helmet"]))).toBe(fallen(look({ helmet: "badgeless-fixture" }, [])));
  });

  it("helmet gear is drawn only on a seat the helmet takes", () => {
    const head = (helmet, item) => buildAgentParts(look({ helmet, accessories: { helmet: item } })).head;
    expect(head("anchor-fixture", "nvg")).not.toContain(`data-acc="nvg"`);
    expect(head("standard", "nvg")).toContain(`data-acc="nvg"`);
    expect(head("anchor-fixture", "lamp")).toContain(`data-acc="lamp"`);
    expect(head("anchor-fixture", "plume")).toContain(`data-acc="plume"`);
    // The Centurion's crest takes the crown.
    expect(head("mohawk", "plume")).not.toContain(`data-acc="plume"`);
    expect(head("mohawk", "lamp")).toContain(`data-acc="lamp"`);
  });
});

describe("shoulders come from their art", () => {
  // The scale the rig wraps a shoulder in, read off the group around its marker.
  const scaleOf = (body, marker) => {
    const m = body.match(new RegExp(`scale\\(([-\\d.]+)\\) translate\\([^)]*\\)"><g data-fixture="${marker}"`));
    return m && Number(m[1]);
  };

  it("draws both sides through the piece's painter, standing and fallen", () => {
    const ch = look({ shoulder: "shoulder-fixture" });
    const body = buildAgentParts(ch).body;
    expect(body).toContain(`data-fixture="shoulder-right"`);
    expect(body).toContain(`data-fixture="shoulder-left"`);
    const down = fallen(ch);
    expect(down).toContain(`data-fixture="shoulder-right"`);
    expect(down).toContain(`data-fixture="shoulder-left"`);
  });

  it("scales by the frame's shoulder, capped by the piece's maxShoulderScale", () => {
    // Breacher grows shoulders 1.12; the masc build adds 1.14 (f rounds to 0.1).
    const body = (shoulder) => buildAgentParts(look({ shoulder, frame: "breacher", body: "masc" })).body;
    expect(scaleOf(body("shoulder-fixture"), "shoulder-right")).toBe(1.3);
    expect(scaleOf(body("capped-fixture"), "capped-right")).toBe(0.6);
    expect(scaleOf(body("capped-fixture"), "capped-left")).toBe(0.6);
  });

  it("a bareRight frame wears the soft cap on the right, its pick on the left", () => {
    const body = buildAgentParts(look({ shoulder: "shoulder-fixture", frame: "strider" })).body;
    expect(body).toContain(`data-fixture="shoulder-left"`);
    expect(body).not.toContain(`data-fixture="shoulder-right"`);
  });

  it("a frame that hides the shoulders draws neither", () => {
    const body = buildAgentParts(look({ shoulder: "shoulder-fixture", frame: "operator" })).body;
    expect(body).not.toContain(`data-fixture="shoulder`);
  });
});
