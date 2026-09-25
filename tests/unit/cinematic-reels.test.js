import { describe, it, expect } from "vitest";
import { validateReel, reelDuration, beatsToSec } from "../../src/cinematic/timeline.js";
import { SIZZLE } from "../../src/cinematic/reels/sizzle.js";

const LATE_BOSSES = /hound|villain_form2|villain_final/;

describe("sizzle reel (draft)", () => {
  it("is a valid reel at 120 bpm", () => {
    expect(validateReel(SIZZLE)).toEqual([]);
    expect(SIZZLE.bpm).toBe(120);
  });

  it("runs 70–80 s", () => {
    const d = reelDuration(SIZZLE);
    expect(d).toBeGreaterThanOrEqual(70);
    expect(d).toBeLessThanOrEqual(80);
  });

  it("slams the logo between 14 and 20 s, on a bar line, with a flash", () => {
    const logo = SIZZLE.captions.find((c) => c.kind === "title" && c.logo);
    expect(logo).toBeTruthy();
    const t = beatsToSec(SIZZLE, logo.at);
    expect(t).toBeGreaterThanOrEqual(14);
    expect(t).toBeLessThanOrEqual(20);
    expect(logo.at % 4).toBe(0);
    const shot = SIZZLE.shots.find((s) => s.at === logo.at);
    expect(shot?.events?.some((e) => e.type === "flash" && e.at === 0)).toBe(true);
  });

  it("opens on lore art: deep space, the Act I reactor, the rift with the Paradox Lord in silhouette", () => {
    const [a, b, c] = SIZZLE.shots;
    expect(a.scene).toMatchObject({ kind: "art", bg: "deep_space" });
    expect(b.scene).toMatchObject({ kind: "campaign", act: 1, level: 5 });
    expect(c.scene).toMatchObject({ kind: "art", bg: "temporal_rift", art: "villain", silhouette: true });
  });

  it("shows late-game bosses only as silhouettes or cards", () => {
    for (const s of SIZZLE.shots) {
      if (LATE_BOSSES.test(s.scene.art ?? "")) expect(s.scene.silhouette).toBe(true);
    }
    const hound = SIZZLE.shots.find((s) => s.scene.art === "hound");
    const within = (c, s) => c.at >= s.at && c.at < s.at + s.len;
    expect(SIZZLE.captions.some((c) => c.kind === "card" && within(c, hound))).toBe(true);
  });

  it("carries the spec's captions and narration", () => {
    const text = SIZZLE.captions.map((c) => (c.kind === "card" ? c.sub : c.text));
    for (const line of [
      "Chrono-Corp Station.",
      "And he keeps coming back.",
      "Four acts. Twenty-nine levels.",
      "Bend time.",
      "Rewind it. Lock it.",
      "Gather your squad.",
      "SUIT C-0016. NOBODY INSIDE.",
      "Meltdown: how long can you last?",
      "Build anything.",
      "Make the agent yours.",
      "Three art styles.",
    ]) expect(text).toContain(line);
    expect(SIZZLE.narration.map((n) => n.text)).toContain("Someone broke time.");
  });

  it("cuts on beats and starts every montage shot in a level or on art", () => {
    for (const s of SIZZLE.shots) {
      expect(Number.isInteger(s.at)).toBe(true);
      expect(["art", "campaign"]).toContain(s.scene.kind);
    }
  });
});
