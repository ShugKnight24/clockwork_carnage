// tests/unit/cinematic-timeline.test.js
import { describe, it, expect } from "vitest";
import { beatsToSec, secToBeats, reelDuration, stateAt, eventsBetween, capFlashes, validateReel } from "../../src/cinematic/timeline.js";
import { mulberry32, seedFor } from "../../src/cinematic/seeded.js";

const reel = {
  id: "t", bpm: 120, bars: 4,
  music: [{ at: 0, track: "campaign" }],
  narration: [{ at: 2, len: 4, text: "Someone broke time." }],
  captions: [{ at: 4, len: 4, text: "Bend time." }],
  letterbox: { in: 2, out: 2 },
  shots: [
    { id: "a", at: 0, len: 8, scene: { kind: "art", bg: "deep_space" }, events: [{ at: 1, type: "flash" }], transitionOut: "fade" },
    { id: "b", at: 8, len: 8, scene: { kind: "art", bg: "temporal_rift" }, events: [{ at: 0, type: "glitch" }, { at: 4, type: "shake" }] },
  ],
};

describe("cinematic timeline", () => {
  it("converts beats and seconds at the reel's tempo", () => {
    expect(beatsToSec(reel, 4)).toBe(2);
    expect(secToBeats(reel, 3)).toBe(6);
    expect(reelDuration(reel)).toBe(8); // 16 beats at 120 bpm
  });

  it("finds the active shot and its local time", () => {
    expect(stateAt(reel, 0.5)).toMatchObject({ shotIndex: 0, local: 0.5, shotLen: 4 });
    expect(stateAt(reel, 4.25)).toMatchObject({ shotIndex: 1, local: 0.25 });
    expect(stateAt(reel, 99).shot).toBeNull();
  });

  it("reports captions and narration only inside their window", () => {
    expect(stateAt(reel, 1.9).captions).toEqual([]);
    expect(stateAt(reel, 2.1).captions.map((c) => c.text)).toEqual(["Bend time."]);
    expect(stateAt(reel, 1.1).narration?.text).toBe("Someone broke time.");
  });

  it("eases the letterbox in and out", () => {
    expect(stateAt(reel, 0).letterbox).toBe(0);
    expect(stateAt(reel, 1).letterbox).toBe(1);
    expect(stateAt(reel, 7.99).letterbox).toBeLessThan(0.05);
  });

  it("reports the fade transition across the last beat of a shot", () => {
    const tr = stateAt(reel, 3.9).transition;
    expect(tr.kind).toBe("fade");
    expect(tr.progress).toBeGreaterThan(0.5);
  });

  it("returns events in (t0, t1] across shot boundaries, in order", () => {
    const evs = eventsBetween(reel, 0, 4.1).map((e) => `${e.shotId}:${e.ev.type}`);
    expect(evs).toEqual(["a:flash", "b:glitch"]);
    expect(eventsBetween(reel, 0.5, 0.5)).toEqual([]);
    expect(eventsBetween(reel, 4.1, 0.2)).toEqual([]);
  });

  it("caps flashes at three per second", () => {
    expect(capFlashes([0, 0.1, 0.2, 0.34, 0.5, 0.7, 1.04])).toEqual([0, 0.34, 0.7, 1.04]);
  });

  it("validates reel data", () => {
    expect(validateReel(reel)).toEqual([]);
    const gap = { ...reel, shots: [reel.shots[0], { ...reel.shots[1], at: 9 }] };
    expect(validateReel(gap)[0]).toMatch(/gap|contiguous/i);
    const late = { ...reel, captions: [{ at: 15, len: 4, text: "x" }] };
    expect(validateReel(late)[0]).toMatch(/caption/i);
  });

  it("seeded randomness is repeatable per shot", () => {
    const a = mulberry32(seedFor("sizzle", "combat"));
    const b = mulberry32(seedFor("sizzle", "combat"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seedFor("sizzle", "combat")).not.toBe(seedFor("sizzle", "chrono"));
  });
});

describe("cinematic timeline edges", () => {
  it("a time exactly on a shot boundary belongs to the next shot", () => {
    expect(stateAt(reel, 4)).toMatchObject({ shotIndex: 1, local: 0 });
    // 110 bpm: beatsToSec(8) comes back as 7.999… beats; the boundary must still land on shot b.
    const odd = { ...reel, bpm: 110 };
    expect(stateAt(odd, beatsToSec(odd, 8))).toMatchObject({ shotIndex: 1, local: 0 });
  });

  it("before the start reads as the first shot at local 0, and beat-0 events fire from -epsilon", () => {
    expect(stateAt(reel, -1e-6)).toMatchObject({ shotIndex: 0, local: 0, letterbox: 0 });
    expect(stateAt(reel, -5).shot.id).toBe("a");
    const zero = { ...reel, shots: [{ ...reel.shots[0], events: [{ at: 0, type: "go" }] }, reel.shots[1]] };
    expect(eventsBetween(zero, -1e-6, 0.01).map((e) => e.ev.type)).toEqual(["go"]);
    expect(eventsBetween(zero, 0, 0.01)).toEqual([]);
  });

  it("the end of the reel has no shot", () => {
    expect(stateAt(reel, reelDuration(reel)).shot).toBeNull();
    expect(stateAt(reel, reelDuration(reel)).shotIndex).toBe(-1);
  });

  it("an event on the very last beat fires when the clock reaches the end", () => {
    const last = { ...reel, shots: [reel.shots[0], { ...reel.shots[1], events: [{ at: 8, type: "end" }] }] };
    expect(validateReel(last)).toEqual([]);
    expect(eventsBetween(last, 7.9, 8).map((e) => e.ev.type)).toEqual(["end"]);
    expect(eventsBetween(last, 7.9, 8.1).map((e) => e.ev.type)).toEqual(["end"]);
    expect(eventsBetween(last, 8, 8.1)).toEqual([]);
  });

  it("consecutive frames never double-fire or miss a boundary event", () => {
    const odd = { ...reel, bpm: 110 };
    const dur = reelDuration(odd);
    let t = -1e-6, fired = [];
    while (t < dur) {
      const t1 = t + 1 / 60;
      fired = fired.concat(eventsBetween(odd, t, t1).map((e) => `${e.shotId}:${e.ev.type}`));
      t = t1;
    }
    expect(fired).toEqual(["a:flash", "b:glitch", "b:shake"]);
  });

  it("handles a reel with a single shot", () => {
    const one = {
      id: "one", bpm: 120, bars: 1, music: [], narration: [], captions: [],
      shots: [{ id: "only", at: 0, len: 4, scene: { kind: "art" }, events: [{ at: 0, type: "a" }, { at: 4, type: "z" }], transitionOut: "fade" }],
    };
    expect(validateReel(one)).toEqual([]);
    expect(stateAt(one, 0)).toMatchObject({ shotIndex: 0, local: 0, shotLen: 2, letterbox: 1 });
    expect(stateAt(one, 1.75).transition).toMatchObject({ kind: "fade", progress: 0.5 });
    expect(stateAt(one, 2).shot).toBeNull();
    expect(eventsBetween(one, -1e-6, 2).map((e) => e.ev.type)).toEqual(["a", "z"]);
  });

  it("a shot shorter than a beat keeps its transition progress within 0..1", () => {
    const short = { ...reel, shots: [{ ...reel.shots[0], len: 0.5 }, { ...reel.shots[1], at: 0.5, len: 15.5 }] };
    const tr = stateAt(short, 0.01).transition;
    expect(tr.progress).toBeGreaterThanOrEqual(0);
    expect(tr.progress).toBeLessThan(1);
  });
});
