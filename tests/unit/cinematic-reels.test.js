import { describe, it, expect } from "vitest";
import { validateReel, reelDuration, beatsToSec, capFlashes } from "../../src/cinematic/timeline.js";
import { SIZZLE } from "../../src/cinematic/reels/sizzle.js";
import { END_CARD } from "../../src/cinematic/scenes/title.js";
import { ENEMY_TYPES } from "../../src/data/enemies.js";
import { CAMPAIGN_LORE } from "../../src/cinematic/reels/campaign-lore.js";
import { getAct } from "../../src/data/campaign/acts.js";

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

  it("opens on lore: deep space, the station's range, lockers and office, the rift with the Paradox Lord in silhouette", () => {
    const [a, ...rest] = SIZZLE.shots;
    expect(a.scene).toMatchObject({ kind: "art", bg: "deep_space" });
    expect(rest.slice(0, 3).map((s) => [s.id, s.scene.kind])).toEqual([["range", "station"], ["lockers", "station"], ["office", "station"]]);
    expect(rest[3].scene).toMatchObject({ kind: "art", bg: "temporal_rift", art: "villain", silhouette: true });
    // ARIA's line lands over the station, before it breaks.
    const [line] = SIZZLE.narration;
    expect(line.at).toBeGreaterThanOrEqual(shot("range").at);
    expect(line.at + line.len).toBeLessThanOrEqual(shot("rift").at);
  });

  it("glides each station shot through the prologue rooms on a curve of its own", () => {
    const stations = SIZZLE.shots.filter((s) => s.scene.kind === "station");
    expect(stations.map((s) => s.id)).toEqual(["range", "lockers", "office", "squad", "squad-lift"]);
    for (const s of stations) {
      const keys = s.scene.camera.keys;
      expect(keys.length).toBeGreaterThanOrEqual(2);
      expect(keys[0][0]).toBe(0);
      expect(keys.at(-1)[0]).toBe(s.len);
    }
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

// ─── Campaign lore video ───────────────────────────────────────────────────


const loreShot = (id) => CAMPAIGN_LORE.shots.find((s) => s.id === id);

describe("campaign lore video", () => {
  it("is a valid reel of 50–58 s, cut on whole beats", () => {
    expect(validateReel(CAMPAIGN_LORE)).toEqual([]);
    const d = reelDuration(CAMPAIGN_LORE);
    expect(d).toBeGreaterThanOrEqual(50);
    expect(d).toBeLessThanOrEqual(58);
    for (const s of CAMPAIGN_LORE.shots) expect(Number.isInteger(s.at) && Number.isInteger(s.len)).toBe(true);
  });

  it("is slower than the sizzle and scored to a moody track at its own tempo", () => {
    expect(CAMPAIGN_LORE.bpm).toBeLessThan(SIZZLE.bpm);
    expect(CAMPAIGN_LORE.music[0].track).toBe("menu");
    expect(CAMPAIGN_LORE.music.every((c) => c.bpm === undefined)).toBe(true);
  });

  it("carries the encrypted briefing in order, each line over its own shot", () => {
    // The background the comic skips: the station, the Chronos Engine and its
    // eleven seconds, what came through, the wings it took, the agent.
    expect(CAMPAIGN_LORE.narration.map((n) => n.text)).toEqual([
      "Chronos Station. Humanity's last anchor in time.",
      "Chrono-Corp built a door through time.",
      "They said it was safe.",
      // "No clearance. No name." is ARIA's, in the prologue's lift (prologue.js).
      "Then someone fired the Chronos Engine.",
      "Eleven seconds. Past, present and future hit the same wall.",
      "And something walked through.",
      "Security. Research. Containment. Every wing's a crime scene.",
      "You're the last agent still standing.",
      "Get up, Agent. Somebody has to.",
    ]);
    // Lyra's voice, unnamed: ARIA speaks first when the visor comes down.
    for (const n of CAMPAIGN_LORE.narration) expect(n.voice).toBe("lyra");
    const owners = CAMPAIGN_LORE.narration.map((n) => CAMPAIGN_LORE.shots.find((s) => n.at >= s.at && n.at + n.len <= s.at + s.len)?.id);
    // The wings line runs over its three wings, one to a word.
    expect(owners).toEqual(["station", "station", "engine", "engine", "engine", "rift", undefined, "locker", "agent"]);
    const wings = CAMPAIGN_LORE.narration[6];
    expect(wings.at).toBeGreaterThanOrEqual(loreShot("security").at);
    expect(wings.at + wings.len).toBeLessThanOrEqual(loreShot("containment").at + loreShot("containment").len);
  });

  it("follows the briefing's shot list: boot, station, engine, rift, the wings, the locker, the player's agent, the clock", () => {
    expect(CAMPAIGN_LORE.shots.map((s) => s.id)).toEqual(["boot", "station", "engine", "rift", "security", "research", "containment", "locker", "agent", "clock"]);
    for (const id of ["security", "research", "containment", "locker"]) expect(loreShot(id).scene.kind).toBe("station");
    expect(loreShot("engine").scene).toMatchObject({ kind: "art", bg: "deep_space", art: "rift" });
    expect(loreShot("boot").scene).toMatchObject({ kind: "loreBoot", text: "[ ENCRYPTED CHANNEL ]" });
    expect(loreShot("station").scene).toMatchObject({ kind: "art", bg: "deep_space", art: "station" });
    expect(loreShot("rift").scene).toMatchObject({ kind: "loreRift", bg: "temporal_rift", art: "villain" });
    expect(loreShot("rift").events.filter((e) => e.type === "glitch").length).toBeGreaterThanOrEqual(2);
    // The agent is the player's own: no curated looks, and the visor lights.
    const agent = loreShot("agent").scene;
    expect(agent.kind).toBe("loreAgent");
    expect(agent.looks).toBeUndefined();
    expect(loreShot("agent").events.some((e) => e.type === "visor")).toBe(true);
    expect(loreShot("clock").scene.kind).toBe("loreClock");
  });

  it("shows Act I only, and no late-game boss", () => {
    const actOne = getAct(1).levels.length;
    for (const s of CAMPAIGN_LORE.shots) {
      if (s.scene.kind === "campaign") {
        expect(s.scene.act).toBe(1);
        expect(s.scene.level).toBeLessThan(actOne);
      }
      expect(s.scene.art ?? "").not.toMatch(LATE_BOSSES);
      for (const e of s.events ?? []) expect(e.type).not.toBe("spawn");
    }
    // The wings are the prologue's own station, nothing past it.
    for (const s of CAMPAIGN_LORE.shots) expect(s.scene.kind).not.toBe("campaign");
  });

  it("ends on the clock landing the act title, and fades out for the flipbook", () => {
    const title = CAMPAIGN_LORE.captions.find((c) => c.kind === "title");
    expect(title.text).toBe("ACT I — THE FALL");
    const clock = loreShot("clock");
    expect(title.at).toBeGreaterThan(clock.at);
    expect(title.at + title.len).toBeLessThanOrEqual(clock.at + clock.len);
    expect(clock.scene.landAt).toBe(title.at - clock.at);
    expect(clock.transitionOut).toBe("fade");
  });

  it("fades between its lore beats and never flashes more than 3 times a second", () => {
    const fades = CAMPAIGN_LORE.shots.slice(0, -1).map((s) => s.transitionOut);
    expect(fades.filter((t) => t === "fade").length).toBeGreaterThanOrEqual(2);
    const times = [];
    for (const s of CAMPAIGN_LORE.shots) for (const e of s.events ?? []) if (e.type === "flash" || e.type === "glitch") times.push(beatsToSec(CAMPAIGN_LORE, s.at + e.at));
    expect(capFlashes(times).length).toBe(times.length);
  });
});
