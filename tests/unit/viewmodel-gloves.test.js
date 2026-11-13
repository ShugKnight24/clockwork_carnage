import { describe, it, expect } from "vitest";
import { viewmodelLayers, viewmodelLook } from "../../src/rendering/svg-art/viewmodels.js";
import { FP_GLOVES, STANDARD_GLOVE, fpGlove } from "../../src/rendering/svg-art/viewmodel/gloves.js";
import { GLOVE_ART } from "../../src/rendering/svg-art/wardrobe-themes/index.js";
import { WEAPON_MODELS } from "../../src/rendering/svg-art/viewmodel/weapons.js";
import { FP_SLEEVES, fpSleeve } from "../../src/rendering/svg-art/viewmodel/sleeves.js";
import { themeTable } from "../../src/data/wardrobe-themes/index.js";

const PAL = { primary: "#c03030", dark: "#401010", accent: "#36c6ff" };
const LIGHT = "#d8a06f";
const DEEP = "#6b3d2e";
const PISTOL = 0;
const RIFLE = 2;
const look = (glove, skinTone = LIGHT) => ({ glove, skinTone, palette: PAL });
// Clip, mask and gradient ids come from a counter shared by every build.
const norm = (s) => {
  const ids = new Map();
  return s.replace(/\bh[ckm]\d+/g, (x) => {
    if (!ids.has(x)) ids.set(x, `id${ids.size}`);
    return ids.get(x);
  });
};
const layer = (vm, name) => vm.layers.find((L) => L.name === name);
const hands = (vm) => vm.layers.filter((L) => L.name.startsWith("hand")).map((L) => L.markup).join("");
const wardrobe = Object.keys(GLOVE_ART).filter((id) => id !== "standard");

describe("first-person gloves", () => {
  it("dress every wardrobe glove, and only those", () => {
    expect(Object.keys(FP_GLOVES).sort()).toEqual(Object.keys(GLOVE_ART).sort());
    for (const id of Object.keys(GLOVE_ART)) {
      const g = fpGlove(id, LIGHT, PAL);
      expect(g.modern, id).toBeTruthy();
      expect(g.real, id).toBeTruthy();
    }
  });

  it("draw the stock glove as before when none is named, or the standard one is", () => {
    expect(fpGlove("standard", LIGHT, PAL)).toBe(STANDARD_GLOVE);
    expect(fpGlove("no-such-glove", LIGHT, PAL)).toBe(STANDARD_GLOVE);
    for (const id of Object.keys(WEAPON_MODELS)) {
      for (const pose of ["hip", "ads"]) {
        for (const real of [false, true]) {
          const plain = viewmodelLayers(+id, PAL.accent, pose, "hi", real);
          // The standard glove on the issued sleeve in the default palette: nothing else names the hands.
          const std = viewmodelLayers(+id, PAL.accent, pose, "hi", real, { glove: "standard", skinTone: DEEP });
          expect(std.layers.map((L) => L.id)).toEqual(plain.layers.map((L) => L.id));
          expect(std.layers.map((L) => norm(L.markup))).toEqual(plain.layers.map((L) => norm(L.markup)));
        }
      }
    }
  });

  it("show the skin only on gloves with bare fingertips", () => {
    for (const id of wardrobe) {
      const markup = [PISTOL, RIFLE].map((w) => hands(viewmodelLayers(w, PAL.accent, "hip", "hi", false, look(id, DEEP)))).join("");
      expect(markup.includes(DEEP), id).toBe(!!FP_GLOVES[id].bare);
    }
  });

  it("light no emissive in Realistic", () => {
    for (const id of Object.keys(GLOVE_ART)) {
      for (const w of [PISTOL, RIFLE]) {
        for (const pose of ["hip", "ads"]) {
          const vm = viewmodelLayers(w, PAL.accent, pose, "hi", true, look(id));
          expect(layer(vm, "handGlow"), `${id} ${w} ${pose}`).toBeUndefined();
          expect(hands(vm).includes("vmBloom"), `${id} ${w} ${pose}`).toBe(false);
        }
      }
    }
  });

  it("light the LED trace and the rune in Modern", () => {
    // A sidearm at the hip turns the back of the firing hand (where the trace
    // and the rune sit) toward the eye; on a long gun it faces away, as it would.
    const base = layer(viewmodelLayers(PISTOL, PAL.accent, "hip", "hi", false), "handGlow")?.markup.length ?? 0;
    for (const id of ["fingerless", "wraps"]) {
      expect(layer(viewmodelLayers(0, PAL.accent, "hip", "hi", false, look(id)), "handGlow")?.markup.length ?? 0, id).toBeGreaterThan(base);
    }
  });

  it("re-bake only the hands, keeping the weapon's own bitmaps", () => {
    const std = viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false);
    for (const id of wardrobe) {
      const vm = viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false, look(id));
      expect(layer(vm, "body").id, id).toBe(layer(std, "body").id);
      expect(layer(vm, "glow").id, id).toBe(layer(std, "glow").id);
      for (const name of ["handL", "handR"]) expect(layer(vm, name).id, `${id} ${name}`).not.toBe(layer(std, name).id);
    }
  });

  it("key a weapon's body by the glove only where hand art is painted into it", () => {
    // An aimed long gun's support hand lies behind the receiver, in the body layer.
    const std = viewmodelLayers(RIFLE, PAL.accent, "ads", "hi", false);
    const vm = viewmodelLayers(RIFLE, PAL.accent, "ads", "hi", false, look("leather"));
    expect(layer(vm, "body").id).not.toBe(layer(std, "body").id);
    expect(layer(vm, "glow").id).toBe(layer(std, "glow").id);
    // The articulated sidearm hands are all in the hand layers, hidden behind the frame by clipping.
    const pStd = viewmodelLayers(PISTOL, PAL.accent, "hip", "hi", false);
    const pVm = viewmodelLayers(PISTOL, PAL.accent, "hip", "hi", false, look("leather"));
    expect(layer(pVm, "body").id).toBe(layer(pStd, "body").id);
  });

  it("key the skin only for gloves that show it, the palette only for gloves that take it", () => {
    const other = { ...PAL, primary: "#30c030" };
    for (const id of wardrobe) {
      const g = FP_GLOVES[id];
      expect(fpGlove(id, LIGHT, PAL).key !== fpGlove(id, DEEP, PAL).key, id).toBe(!!g.bare);
      expect(fpGlove(id, LIGHT, PAL).key !== fpGlove(id, LIGHT, other).key, id).toBe(!!g.tinted);
      const a = viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false, look(id, LIGHT));
      const b = viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false, look(id, DEEP));
      expect(layer(a, "handR").id === layer(b, "handR").id, id).toBe(!g.bare);
    }
  });

  it("dress the arms in the suit's sleeve, re-baking only the hands", () => {
    const std = viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false, look("standard"));
    for (const frame of Object.keys(FP_SLEEVES)) {
      const vm = viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false, { ...look("standard"), frame });
      expect(layer(vm, "body").id, frame).toBe(layer(std, "body").id);
      expect(layer(vm, "glow").id, frame).toBe(layer(std, "glow").id);
      if (frame !== "standard") expect(layer(vm, "handR").id, frame).not.toBe(layer(std, "handR").id);
    }
    // The canvas suit's own cloth, and the rolled sleeves' bare skin.
    expect(hands(viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false, { ...look("standard"), frame: "diving" }))).toContain("#4a4130");
    expect(hands(viewmodelLayers(RIFLE, PAL.accent, "hip", "hi", false, { ...look("standard", DEEP), frame: "streetwear" }))).toContain(DEEP);
  });

  it("give every suit frame a first-person sleeve, keyed by the skin only where it shows", () => {
    expect(Object.keys(FP_SLEEVES).sort()).toEqual(themeTable("frames").map((e) => e.id).sort());
    for (const id of Object.keys(FP_SLEEVES)) {
      expect(fpSleeve(id, LIGHT, PAL).key !== fpSleeve(id, DEEP, PAL).key, id).toBe(!!FP_SLEEVES[id].bare);
    }
    expect(fpSleeve("no-such-frame", LIGHT, PAL).id).toBe("standard");
  });

  it("read the suit's glove, skin and palette off the character", () => {
    expect(viewmodelLook({ frame: "streetwear", skinTone: "deep_brown" })).toMatchObject({ glove: "fingerless", frame: "streetwear", skinTone: DEEP });
    expect(viewmodelLook({}).glove).toBe("standard");
    expect(viewmodelLook({}).palette.primary).toMatch(/^#/);
  });
});
