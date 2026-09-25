import { describe, it, expect } from "vitest";
import { validateReel, reelDuration, beatsToSec, capFlashes } from "../../src/cinematic/timeline.js";
import { SIZZLE } from "../../src/cinematic/reels/sizzle.js";
import { END_CARD } from "../../src/cinematic/scenes/title.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";

const LATE_BOSSES = /hound|villain_form2|villain_final/;
const shot = (id) => SIZZLE.shots.find((s) => s.id === id);
const events = (id, type) => (shot(id).events ?? []).filter((e) => e.type === type);
const within = (c, s) => c.at >= s.at && c.at < s.at + s.len;

describe("sizzle reel", () => {
  it("is a valid reel at 120 bpm", () => {
    expect(validateReel(SIZZLE)).toEqual([]);
    expect(SIZZLE.bpm).toBe(120);
  });

  it("runs 72–78 s", () => {
    const d = reelDuration(SIZZLE);
    expect(d).toBeGreaterThanOrEqual(72);
    expect(d).toBeLessThanOrEqual(78);
  });

  it("slams the logo out of a white flash on a bar line, 14–20 s in", () => {
    const logo = SIZZLE.shots.find((s) => s.scene.kind === "title" && s.scene.lines?.length === 0);
    expect(logo).toBeTruthy();
    const t = beatsToSec(SIZZLE, logo.at);
    expect(t).toBeGreaterThanOrEqual(14);
    expect(t).toBeLessThanOrEqual(20);
    expect(logo.at % (SIZZLE.beatsPerBar ?? 4)).toBe(0);
    expect(logo.events.some((e) => e.type === "flash" && e.at === 0)).toBe(true);
    // The music drops into the boss track with a sting on the same beat.
    expect(SIZZLE.music).toContainEqual(expect.objectContaining({ at: logo.at, track: "boss", sting: true }));
  });

  it("cuts only on beats, shot after shot with no gaps", () => {
    let at = 0;
    for (const s of SIZZLE.shots) {
      expect(Number.isInteger(s.at)).toBe(true);
      expect(Number.isInteger(s.len)).toBe(true);
      expect(s.at).toBe(at);
      at += s.len;
    }
    expect(at).toBe(SIZZLE.bars * 4);
  });

  it("never flashes or glitches more than 3 times a second once capped", () => {
    const times = [];
    SIZZLE.shots.forEach((s, i) => {
      for (const e of s.events ?? []) if (e.type === "flash" || e.type === "glitch") times.push(beatsToSec(SIZZLE, s.at + e.at));
      const next = SIZZLE.shots[i + 1];
      if (next && (s.transitionOut === "flash" || s.transitionOut === "glitch")) times.push(beatsToSec(SIZZLE, next.at));
    });
    const kept = capFlashes(times.sort((a, b) => a - b));
    for (const t of kept) expect(kept.filter((u) => u >= t && u < t + 1).length).toBeLessThanOrEqual(3);
    // The script already respects the cap: nothing is dropped.
    expect(kept.length).toBe(times.length);
  });

  it("carries the spec's captions, in order, and ARIA's line", () => {
    const text = SIZZLE.captions.map((c) => (c.kind === "card" ? c.sub : c.text));
    expect(text).toEqual([
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
      "Final form · 00:11",
    ]);
    expect(SIZZLE.narration.map((n) => n.text)).toEqual(["Someone broke time."]);
    const end = SIZZLE.shots.at(-1);
    expect(end.scene.kind).toBe("title");
    expect(end.scene.lines ?? END_CARD).toEqual(["Play free in your browser", "shugknight24.github.io/clockwork_carnage", "Keyboard · Mouse · Controller"]);
  });

  it("shows late-game bosses only as silhouettes and title cards", () => {
    for (const s of SIZZLE.shots) {
      if (LATE_BOSSES.test(s.scene.art ?? "")) {
        expect(s.scene.silhouette).toBe(true);
        expect(SIZZLE.captions.some((c) => c.kind === "card" && within(c, s))).toBe(true);
      }
      for (const e of s.events ?? []) if (e.type === "spawn") expect(ENEMY_TYPES[e.enemy].boss).toBeFalsy();
    }
    expect(shot("hound").scene.art).toBe("hound");
    expect(shot("finale").scene.art).toBe("villain_final");
  });

  it("opens on lore art: deep space, the Act I reactor, the rift with the Paradox Lord in silhouette", () => {
    const [a, b, c] = SIZZLE.shots;
    expect(a.scene).toMatchObject({ kind: "art", bg: "deep_space" });
    expect(b.scene).toMatchObject({ kind: "campaign", act: 1, level: 5 });
    expect(c.scene).toMatchObject({ kind: "art", bg: "temporal_rift", art: "villain", silhouette: true });
  });

  it("plays the montage the spec lists, each shot with something happening in it", () => {
    // Guns: the pistol, then the shotgun, into groups spawned in front of the camera.
    expect(events("pistol", "fire")[0].weapon).toBe(0);
    expect(events("shotgun", "fire")[0].weapon).toBe(1);
    for (const id of ["pistol", "shotgun"]) expect(events(id, "spawn").reduce((n, e) => n + (e.count ?? 1), 0)).toBeGreaterThanOrEqual(3);
    // Chrono Shift lands while the enemies are mid-attack, then the tracers crawl.
    const [attack] = events("chrono", "attack");
    const [chrono] = events("chrono", "chrono");
    expect(chrono.on).toBe(true);
    expect(chrono.at).toBeGreaterThan(attack.at);
    expect(events("chrono", "fire")[0].at).toBeGreaterThan(chrono.at);
    // Rewind, then Time-Lock on a charging enemy.
    expect(events("rewind", "rewind")).toHaveLength(1);
    expect(events("lock", "freeze")).toHaveLength(1);
    expect(shot("lock").at).toBeGreaterThan(shot("rewind").at);
    expect(events("squad", "squad")[0].members).toEqual(["lyra", "rook", "nova", "kael"]);
    expect(shot("meltdown").scene).toMatchObject({ kind: "meltdown" });
    expect(events("meltdown", "spawn").length).toBeGreaterThan(0);
    expect(shot("forge").scene).toMatchObject({ kind: "forge", build: "tower" });
    // The creator changes looks on beats.
    const looks = [...events("creator", "look"), ...events("creator-bust", "look")];
    expect(looks.length).toBeGreaterThanOrEqual(3);
    for (const e of looks) expect(Number.isInteger(e.at)).toBe(true);
    // One shot flips Legacy → Comic → Modern on beats.
    const flips = events("styles", "artStyle");
    expect(flips.map((e) => e.style)).toEqual([0, 1, 2]);
    for (const e of flips) expect(Number.isInteger(e.at)).toBe(true);
  });

  it("stops the music before the end card and hits one last sting on it", () => {
    const end = SIZZLE.shots.at(-1);
    const last = SIZZLE.music.at(-1);
    expect(last).toMatchObject({ at: end.at, stop: true, sting: true });
  });
});
