import { describe, it, expect } from "vitest";
import {
  messageLanes,
  hudReserved,
  commsBottom,
  overlaps,
  layoutKind,
  CHIP_H,
  CHIP_H_COMPACT,
} from "../../src/ui/message-lanes.js";

const DESKTOP = [
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
];
const PHONES = [
  { name: "iPhone 14 landscape", w: 844, h: 390 },
  { name: "iPhone SE landscape", w: 667, h: 375 },
];
const STYLES = [
  { name: "DOOM", hudStyle: 1, modern: true },
  { name: "Vanguard", hudStyle: 4, modern: true },
  { name: "Minimal", hudStyle: 0, modern: true },
  { name: "Tactical", hudStyle: 2, modern: true },
  { name: "Custom", hudStyle: 3, modern: true },
  { name: "Legacy DOOM", hudStyle: 1, modern: false },
  { name: "Legacy Minimal", hudStyle: 0, modern: false },
];
const LANES = ["headline", "comms", "commsLow", "chips"];
// Lanes that can be on screen together: comms (top) only shows without a headline.
const PAIRS = [
  ["headline", "commsLow"],
  ["headline", "chips"],
  ["commsLow", "chips"],
  ["comms", "chips"],
];

const cases = [];
for (const [w, h] of DESKTOP) for (const s of STYLES) for (const boss of [false, true]) cases.push({ ...s, w, h, boss, compact: false });
for (const p of PHONES) for (const s of STYLES) for (const boss of [false, true]) cases.push({ ...s, w: p.w, h: p.h, boss, compact: true, name: `${s.name} / ${p.name}` });

const label = (c) => `${c.name} ${c.w}x${c.h}${c.boss ? " boss" : ""}`;

/** Names of reserved rectangles a lane runs into. */
function hits(rect, reserved) {
  return reserved.filter((r) => overlaps(rect, r)).map((r) => r.name);
}

describe("message lanes", () => {
  it.each(cases.map((c) => [label(c), c]))("%s: lanes are on screen and clear of each other and the HUD", (_, c) => {
    const L = messageLanes(c);
    for (const k of LANES) {
      const r = L[k];
      expect(r.x, k).toBeGreaterThanOrEqual(0);
      expect(r.y, k).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, k).toBeLessThanOrEqual(c.w);
      expect(r.y + r.h, k).toBeLessThanOrEqual(c.h);
      // On a small phone the headline may cover the kill feed, nothing else.
      const soft = c.compact && k === "headline" ? ["killFeed"] : [];
      expect(hits(r, L.reserved).filter((n) => !soft.includes(n)), k).toEqual([]);
    }
    for (const [a, b] of PAIRS) {
      // A phone's chips wait for the headline to clear instead (see below).
      if (L.chipsShareHeadline && a === "headline" && b === "chips") continue;
      expect(overlaps(L[a], L[b]), `${a}/${b}`).toBe(false);
    }
    expect(L.chipsShareHeadline).toBe(c.compact);
  });

  it.each(cases.map((c) => [label(c), c]))("%s: each lane has room for what it holds", (_, c) => {
    const L = messageLanes(c);
    expect(L.chips.h).toBeGreaterThanOrEqual(c.compact ? CHIP_H_COMPACT : CHIP_H);
    expect(L.headline.w).toBeGreaterThanOrEqual(c.compact ? 260 : 600);
    expect(L.headline.h).toBeGreaterThanOrEqual(c.compact ? 80 : 150);
    expect(L.commsLow.w).toBeGreaterThanOrEqual(c.compact ? 300 : 360);
    expect(L.commsLow.h).toBeGreaterThanOrEqual(c.compact ? 64 : 90);
  });

  it("puts the headline under Vanguard's compass, and under the boss bar when there is one", () => {
    for (const [w, h] of DESKTOP) {
      const calm = messageLanes({ w, h, hudStyle: 4, modern: true });
      const boss = messageLanes({ w, h, hudStyle: 4, modern: true, boss: true });
      const strip = (L) => L.reserved.find((r) => r.name === "compass");
      expect(calm.headline.y).toBeGreaterThanOrEqual(strip(calm).y + strip(calm).h);
      expect(boss.headline.y).toBeGreaterThanOrEqual(strip(boss).y + strip(boss).h);
      expect(boss.headline.y).toBeGreaterThan(calm.headline.y);
    }
  });

  it("keeps the DOOM teach card where it always sat when nothing is above it", () => {
    const L = messageLanes({ w: 1920, h: 1080, hudStyle: 1, modern: true });
    expect(L.headline.y + 6).toBe(60);
  });

  it("stacks chips under the minimap on the right", () => {
    for (const s of STYLES) {
      const L = messageLanes({ w: 1920, h: 1080, ...s });
      const right = L.reserved.filter((r) => r.x > 1920 / 2 && r.y === 0);
      expect(L.chips.x + L.chips.w).toBeGreaterThan(1920 - 60);
      for (const r of right) if (r.x < L.chips.x + L.chips.w && L.chips.x < r.x + r.w) expect(L.chips.y).toBeGreaterThanOrEqual(r.y + r.h);
    }
  });

  it("keeps a phone's headline at the top, clear of the reticle, where there is room", () => {
    for (const hudStyle of [1, 4]) {
      const L = messageLanes({ w: 844, h: 390, hudStyle, modern: true, compact: true });
      expect(L.headline.y + L.headline.h).toBeLessThan((390 - 60) / 2);
      expect(hits(L.headline, L.reserved)).toEqual([]);
    }
  });

  it("gives every comms plate the low slot on a phone", () => {
    const L = messageLanes({ w: 844, h: 390, hudStyle: 4, modern: true, compact: true });
    expect(L.comms).toEqual(L.commsLow);
  });

  it("keeps the subtle plate's old anchor where it was already clear", () => {
    expect(commsBottom({ w: 1920, h: 1080, hudStyle: 1, modern: true })).toBe(1080 - 160 - 56);
    expect(commsBottom({ w: 1920, h: 1080, hudStyle: 4, modern: true })).toBe(1080 - 150);
  });

  it("stays clear of the corners at the largest minimap, HUD and font scales", () => {
    for (const [w, h] of DESKTOP) {
      for (const s of STYLES) {
        const c = { w, h, ...s, boss: true, hudScale: 125, fontScale: 150, minimapSize: 300 };
        const L = messageLanes(c);
        for (const k of LANES) {
          // Vanguard's pickup captions are the one thing a chip may share
          // the corner with when the minimap is at its largest.
          const blocked = hits(L[k], L.reserved).filter((n) => !(k === "chips" && n === "pickups"));
          expect(blocked, `${s.name} ${w} ${k}`).toEqual([]);
        }
        for (const [a, b] of PAIRS) expect(overlaps(L[a], L[b]), `${s.name} ${w} ${a}/${b}`).toBe(false);
      }
    }
  });

  it("names the layouts", () => {
    expect(layoutKind({ hudStyle: 4, modern: true })).toBe("vanguard");
    expect(layoutKind({ hudStyle: 4, modern: false })).toBe("corners");
    expect(layoutKind({ hudStyle: 1, modern: false })).toBe("doom");
    expect(layoutKind({ hudStyle: 1, compact: true })).toBe("compact");
    expect(hudReserved({ w: 1280, h: 720, hudStyle: 1 }).length).toBeGreaterThan(2);
  });
});
