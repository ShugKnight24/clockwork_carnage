import { describe, it, expect } from "vitest";
import { EXPRESSIONS, DEFAULT_CHARACTER, DEFAULT_LOOK_IDS } from "../../src/data/cosmetics.js";
import { lookKey, cloneLook, getIndex, withIndex, LOOK_TABLES } from "../../src/core/character-fields.js";
import { normalizeLook } from "../../src/core/character-normalize.js";
import { migrateCharacterSave } from "../../src/core/save-system.js";
import { LEGACY_LOOK_INDICES } from "../../src/core/legacy-look-indices.js";
import { LOCKABLE, unlockState } from "../../src/systems/unlocks.js";
import { HELMET_STYLES, SKIN_TONES } from "../../src/data/cosmetics.js";
import { DEFAULT_ACCESSORIES } from "../../src/data/accessories.js";
import { helmetMouth, mouthBlock } from "../../src/data/wardrobe-themes/index.js";
import { buildAgentSvg, buildAgentParts, HELMET_KIT } from "../../src/rendering/svg-art/agent-rig.js";
import { FACE as FACE_ITEMS } from "../../src/rendering/svg-art/accessories/face.js";
import { EXPRESSION_SHAPES, LED_COLUMNS, LED_ROWS, beardMouthOf, cigarAt, ledCells, lipRingAt, mouthOf } from "../../src/rendering/svg-art/expressions.js";
import { lookFromIds } from "./helpers/golden-looks.js";

const load = (raw) => normalizeLook(migrateCharacterSave(raw));

describe("expression data", () => {
  it("lists the eight expressions, default first", () => {
    expect(EXPRESSIONS.map((e) => e.id)).toEqual(["default", "smile", "grin", "smirk", "grim", "frown", "shout", "shocked"]);
    expect(EXPRESSIONS.map((e) => e.name)).toEqual(["Default", "Smile", "Grin", "Smirk", "Grim", "Frown", "Shout", "Shocked"]);
    for (const e of EXPRESSIONS) expect(e.desc, e.id).toMatch(/\S/);
    expect(DEFAULT_LOOK_IDS.expression).toBe("default");
    expect(DEFAULT_CHARACTER.expression).toBe("default");
    expect(LOOK_TABLES.expression).toBe(EXPRESSIONS);
    expect(Object.isFrozen(EXPRESSIONS)).toBe(true);
    expect(EXPRESSIONS.every((e) => Object.isFrozen(e))).toBe(true);
  });

  it("is picked by index like every look field, and stored by id", () => {
    const ch = cloneLook(DEFAULT_CHARACTER);
    expect(getIndex(ch, "expression")).toBe(0);
    const grin = EXPRESSIONS.findIndex((e) => e.id === "grin");
    expect(withIndex(ch, "expression", grin)).toEqual({ expression: "grin" });
  });

  it("normalises an unknown or missing id to default", () => {
    expect(load({ version: 2, expression: "smile" }).expression).toBe("smile");
    for (const bad of ["sneer", 3, null, "", { id: "grin" }]) expect(load({ version: 2, expression: bad }).expression, String(bad)).toBe("default");
    expect(load({ version: 2 }).expression).toBe("default");
  });

  it("an old save without an expression loads default", () => {
    // A version 1 save: table positions, no expression ever stored.
    const v1 = { hairIndex: LEGACY_LOOK_INDICES.hairIndex.indexOf("long"), colorIndex: 2, name: "Old" };
    const loaded = load(v1);
    expect(loaded.hair).toBe("long");
    expect(loaded.expression).toBe("default");
    // A version 2 save from before the pick keeps everything else it holds.
    const v2 = load({ version: 2, hair: "afro", hairColor: "pink", helmet: "ledmask" });
    expect(v2).toMatchObject({ hair: "afro", hairColor: "pink", helmet: "ledmask", expression: "default" });
    // The frozen legacy tables never learn the field.
    expect(Object.keys(LEGACY_LOOK_INDICES).some((k) => k.startsWith("expression"))).toBe(false);
  });

  it("a saved look round-trips its expression, and one saved before it holds none", () => {
    // How cc_saved_looks stores a look: the appearance fields, stamped with
    // the save version, read back through the save migration.
    const look = { ...cloneLook(DEFAULT_CHARACTER), expression: "smirk", version: 2 };
    const back = migrateCharacterSave(JSON.parse(JSON.stringify(look)));
    expect(back.expression).toBe("smirk");
    // A look from before the pick: the field is absent, so wearing it keeps
    // the player's current expression (the showroom's readLook skips it).
    expect("expression" in migrateCharacterSave({ version: 2, hair: "afro" })).toBe(false);
    expect("expression" in migrateCharacterSave({ colorIndex: 3, hairIndex: 12 })).toBe(false);
  });

  it("is part of the look key", () => {
    const a = cloneLook(DEFAULT_CHARACTER);
    expect(lookKey({ ...a, expression: "shout" })).not.toBe(lookKey(a));
    expect(lookKey({ ...a, expression: "default" })).toBe(lookKey(a));
    const bare = cloneLook(DEFAULT_CHARACTER);
    delete bare.expression;
    expect(lookKey(bare)).toBe(lookKey(a));
  });

  it("is never lockable", () => {
    expect(LOCKABLE.expression).toBeUndefined();
    for (const { id } of EXPRESSIONS) expect(unlockState("expression", id, {}).unlocked, id).toBe(true);
  });
});

// ── The art ────────────────────────────────────────────────────────────────

const others = EXPRESSIONS.map((e) => e.id).filter((id) => id !== "default");
const skin = SKIN_TONES.find((t) => t.id === "warm_light");
/** A resolved face as the mouth's painters take it. */
const faceOf = (mouth, fem = false) => ({ mouth, fem, skin, expression: mouth });
const svg = (ids, opts = {}) => buildAgentSvg(lookFromIds(ids), { idPrefix: "x-", ...opts });
const wearing = (face) => ({ ...DEFAULT_ACCESSORIES, face });

describe("expression art", () => {
  it("draws every expression but the default as a shape", () => {
    expect(EXPRESSION_SHAPES).toEqual(others);
  });

  it("gives every expression a masculine mouth, a feminine mouth and an LED pattern, each its own", () => {
    for (const fem of [false, true]) {
      const marks = EXPRESSIONS.map((e) => mouthOf(faceOf(e.id, fem)));
      for (const [i, m] of marks.entries()) expect(m, `${EXPRESSIONS[i].id} fem=${fem}`).toMatch(/<path d="M/);
      expect(new Set(marks).size, `fem=${fem}`).toBe(EXPRESSIONS.length);
    }
    const patterns = EXPRESSIONS.map((e) => JSON.stringify(ledCells(e.id)));
    expect(new Set(patterns).size).toBe(EXPRESSIONS.length);
    for (const id of others) {
      const cells = ledCells(id);
      expect(cells.length, id).toBeGreaterThanOrEqual(5);
      // On the unlit grid, every cell once.
      for (const [x, y] of cells) {
        expect(LED_COLUMNS, `${id} x`).toContain(x);
        expect(LED_ROWS, `${id} y`).toContain(y);
      }
      expect(new Set(cells.map(String)).size, id).toBe(cells.length);
    }
  });

  it("keeps the default exactly as the faces drew it", () => {
    // Today's masculine and feminine mouths, and the LED mask's grin, mark for mark.
    expect(mouthOf(faceOf("default"))).toContain('<path d="M-2.4,-74 C-1,-74.3 1,-74.3 2.4,-74 C1.2,-73.3 -1.2,-73.3 -2.4,-74 Z"');
    expect(mouthOf(faceOf("default", true))).toContain('<ellipse cx=".5" cy="-73.1" rx="1" ry=".32" fill="#fff" opacity=".22"/>');
    expect(ledCells("default")).toEqual([
      [-4, -75.4], [-3, -74.4], [-2, -74], [-1, -74], [0, -74], [1, -74], [2, -74], [3, -74.4], [4, -75.4],
      [-2, -72.8], [-1, -72.4], [0, -72.4], [1, -72.4], [2, -72.8],
    ]);
    // A record with no expression, an unknown one and "default" draw the same agent.
    for (const ids of [{ helmet: "wide" }, { helmet: "ledmask", body: "fem" }, { helmet: "wide", accessories: wearing("beard") }]) {
      const bare = lookFromIds(ids);
      delete bare.expression;
      const want = buildAgentSvg(bare, { idPrefix: "x-" });
      expect(svg({ ...ids, expression: "default" })).toBe(want);
      expect(buildAgentSvg({ ...bare, expression: "sneer" }, { idPrefix: "x-" })).toBe(want);
    }
    // A look resolved without one (a painter drawn outside a figure) shows the default.
    expect(HELMET_KIT.face({ skin, hair: { id: "buzz", color: "#111111" }, eyes: "#ffcc66", rim: "#22e6ff" })).toContain(mouthOf(faceOf("default")));
  });

  it("shows on the bare face where the mouth shows, in lights on the LED mask, and nowhere else", () => {
    for (const { id: helmet } of HELMET_STYLES) {
      const at = helmetMouth(helmet);
      const rest = svg({ helmet });
      for (const expression of others) {
        const m = svg({ helmet, expression });
        if (at) expect(m, `${helmet} ${expression}`).not.toBe(rest);
        else expect(m, `${helmet} ${expression}`).toBe(rest);
      }
      expect(mouthBlock(helmet) === null, helmet).toBe(at !== null);
    }
    expect(helmetMouth("ledmask")).toBe("led");
    expect(helmetMouth("wide")).toBe("face");
    // The brim's bandana covers it; the closed helmets hide it.
    expect(mouthBlock("brim")).toBe("covered");
    expect(mouthBlock("standard")).toBe("hidden");
    expect(mouthBlock("kabuto")).toBe("hidden");
    // The LED mask keeps the face's own mouth at rest under its shell: only the pixels change.
    const c = buildAgentParts(lookFromIds({ helmet: "ledmask", expression: "frown" })).look;
    expect([c.expression, c.mouth]).toEqual(["frown", "default"]);
  });

  it("shows on a bare-headed peek under a closed helmet, as the creator previews the face", () => {
    const rest = svg({ helmet: "standard" }, { peek: true, pose: "bust" });
    expect(svg({ helmet: "standard", expression: "grin" }, { peek: true, pose: "bust" })).not.toBe(rest);
    expect(buildAgentParts(lookFromIds({ helmet: "sealed", expression: "grin" }), { peek: true }).look.mouth).toBe("grin");
  });

  it("the beard opens on the expression's mouth", () => {
    const beards = EXPRESSIONS.map((e) => FACE_ITEMS.beard({}, { ...faceOf(e.id), hair: { color: "#3a2416" } }).face);
    expect(new Set(beards).size).toBe(EXPRESSIONS.length);
    expect(beards[0]).toContain(beardMouthOf(faceOf("default"), "#0a0d12"));
    expect(beards[0]).toContain('<path d="M-2.4,-74.6 C-1,-75 1,-75 2.4,-74.6 C1.2,-73.2 -1.2,-73.2 -2.4,-74.6 Z"');
  });

  it("the lip ring sits on the expression's lower lip, per build", () => {
    expect(lipRingAt(faceOf("default"))).toEqual([1.4, -73.2]);
    expect(lipRingAt(faceOf("default", true))).toEqual([1.4, -73.35]);
    const ring = (id, fem) => FACE_ITEMS.piercings({}, faceOf(id, fem)).face;
    for (const fem of [false, true]) {
      for (const id of others) {
        const [x, y] = lipRingAt(faceOf(id, fem));
        expect(ring(id, fem), `${id} fem=${fem}`).toContain(`M${Math.round((x - 0.55) * 100) / 100},${y} C`);
        // Right of the middle, on the lower half of the face.
        expect(x, id).toBeGreaterThan(0);
        expect(y, id).toBeGreaterThan(-75);
        expect(y, id).toBeLessThan(-71.2);
      }
      // A shout drops the lower lip, so the ring drops with it.
      expect(lipRingAt(faceOf("shout", fem))[1]).toBeGreaterThan(lipRingAt(faceOf("grim", fem))[1]);
    }
  });

  it("the cigar is gripped in the right corner, or hangs from the lower lip of a mouth too open to grip it", () => {
    const cigar = (id) => FACE_ITEMS.cigar({}, faceOf(id));
    expect(cigarAt(faceOf("default"))).toBeNull();
    expect(cigar("default").face).toContain('d="M2.29,-74.49 L3.92,-72.86 L3.14,-72.08 L1.51,-73.71 Z"');
    for (const id of ["smile", "grin", "smirk", "grim", "frown"]) expect(cigarAt(faceOf(id)).turn, id).toBe(0);
    // The smile lifts the corner, the frown drops it: the cigar goes with it.
    expect(cigarAt(faceOf("smile")).move[1]).toBeLessThan(0);
    expect(cigarAt(faceOf("frown")).move[1]).toBeGreaterThan(0);
    for (const id of ["shout", "shocked"]) {
      expect(cigarAt(faceOf(id)).turn, id).toBeGreaterThan(0);
      expect(cigar(id).face, id).not.toBe(cigar("default").face);
    }
    expect(new Set(EXPRESSIONS.map((e) => cigar(e.id).face)).size).toBe(EXPRESSIONS.length);
  });
});
