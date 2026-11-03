import { describe, it, expect } from "vitest";
import { hexRgb, rgbHex, mixHex, mixHexClamped } from "../../src/utils/color.js";
import { mix as geomMix } from "../../src/rendering/svg-art/viewmodel/geom.js";

// The local copies these replaced, verbatim, so the shared ones are held to
// the exact strings the art was drawn with.
const OLD = {
  // sprites/kit.js, models/cast/kit.js
  kitMix(a, b, t) {
    const hex = (c) => {
      const n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const A = hex(a);
    const B = hex(b);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
  },
  // accessories/{arms,helmet,waist,neck,back,legs}.js
  accessoryMix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
  },
  // ui/portrait.js
  portraitMix(a, b, t) {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
  },
  // viewmodel/geom.js
  geomMix(a, b, t) {
    const hex = (c) => {
      const n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const A = hex(a);
    const B = hex(b);
    const k = Math.max(0, Math.min(1, t));
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
  },
  // agent-rig.js, models/realistic.js
  clampedMix(a, b, t) {
    const hexRgb = (h) => {
      const n = parseInt(h.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const rgbHex = (r) => `#${r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
    const x = hexRgb(a);
    const y = hexRgb(b);
    return rgbHex(x.map((v, i) => v + (y[i] - v) * t));
  },
};

const COLOURS = ["#000000", "#ffffff", "#3a6ea5", "#00E5FF", "#d9a441", "#0b0f1c", "#7f7f80", "#123456", "#fedcba"];
const TS = [0, 0.05, 0.12, 0.25, 0.333, 0.5, 0.55, 0.75, 0.82, 0.999, 1];

function* pairs(ts = TS) {
  for (const a of COLOURS) for (const b of COLOURS) for (const t of ts) yield [a, b, t];
}

describe("shared hex colour helpers", () => {
  it("hexRgb splits #rrggbb into bytes", () => {
    expect(hexRgb("#3a6ea5")).toEqual([0x3a, 0x6e, 0xa5]);
    expect(hexRgb("#FFFFFF")).toEqual([255, 255, 255]);
  });

  it("rgbHex rounds and clamps each channel", () => {
    expect(rgbHex([0, 127.5, 255])).toBe("#0080ff");
    expect(rgbHex([-12, 300, 16.4])).toBe("#00ff10");
  });

  it("mixHex matches the kit, accessory and portrait copies it replaced", () => {
    for (const [a, b, t] of pairs()) {
      const want = OLD.kitMix(a, b, t);
      expect(mixHex(a, b, t), `${a} ${b} ${t}`).toBe(want);
      expect(OLD.accessoryMix(a, b, t)).toBe(want);
      expect(OLD.portraitMix(a, b, t)).toBe(want);
    }
  });

  it("mixHexClamped matches the agent-rig / realistic copy, also past 0..1", () => {
    for (const [a, b, t] of pairs([...TS, -0.5, 1.4, 2])) expect(mixHexClamped(a, b, t), `${a} ${b} ${t}`).toBe(OLD.clampedMix(a, b, t));
  });

  it("geom's mix (t clamped to 0..1) is unchanged", () => {
    for (const [a, b, t] of pairs([...TS, -0.5, 1.4, 2])) expect(geomMix(a, b, t), `${a} ${b} ${t}`).toBe(OLD.geomMix(a, b, t));
  });
});
