import { describe, it, expect } from "vitest";
import { materialOf, playBlockSound, playWaterSound, WaterSoundTracker } from "../../src/audio/block-sounds.js";
import { WATER } from "../../src/world/blocks.js";

const DT = 1 / 60;

/** An AudioManager stand-in that records every primitive it is asked to play. */
function fakeAudio() {
  const calls = [];
  return {
    ctx: {},
    calls,
    playNoise: (...a) => calls.push(["noise", ...a]),
    playTone: (...a) => calls.push(["tone", ...a]),
  };
}

const kinds = (events) => events.map(([k]) => k);

describe("water sounds", () => {
  it("water is its own material with place and break sounds", () => {
    expect(materialOf(WATER)).toBe("water");
    const a = fakeAudio();
    playBlockSound(a, WATER, "place");
    playBlockSound(a, WATER, "break");
    expect(a.calls.length).toBeGreaterThan(1);
  });

  it("plays every water event through the tone and noise primitives, louder when stronger", () => {
    for (const kind of ["enter", "exit", "stroke", "dive"]) {
      const soft = fakeAudio(), hard = fakeAudio();
      playWaterSound(soft, kind, 0.2);
      playWaterSound(hard, kind, 1);
      expect(soft.calls.length, kind).toBeGreaterThan(0);
      const gain = (a) => a.calls.filter((c) => c[0] === "noise").reduce((s, c) => s + c[2], 0);
      expect(gain(hard), kind).toBeGreaterThan(gain(soft));
    }
    const none = fakeAudio(); none.ctx = null;
    playWaterSound(none, "enter", 1);
    expect(none.calls).toEqual([]);
  });

  it("splashes once on the way in, harder for a faster fall", () => {
    const t = new WaterSoundTracker();
    expect(t.update({ sub: 0, eyeUnder: false, velZ: -18, moving: false, dt: DT })).toEqual([]);
    const hit = t.update({ sub: 0.3, eyeUnder: false, velZ: -18, moving: false, dt: DT });
    expect(kinds(hit)).toEqual(["enter"]);
    expect(t.update({ sub: 0.6, eyeUnder: false, velZ: -5, moving: false, dt: DT })).toEqual([]);

    const soft = new WaterSoundTracker();
    soft.update({ sub: 0, eyeUnder: false, velZ: 0, moving: true, dt: DT });
    const wade = soft.update({ sub: 0.1, eyeUnder: false, velZ: 0, moving: true, dt: DT });
    expect(kinds(wade)).toEqual(["enter"]);
    expect(wade[0][1]).toBeLessThan(hit[0][1]);
  });

  it("drips once on the way out", () => {
    const t = new WaterSoundTracker();
    t.update({ sub: 0.7, eyeUnder: false, velZ: 0, moving: false, dt: DT });
    expect(kinds(t.update({ sub: 0, eyeUnder: false, velZ: 3, moving: false, dt: DT }))).toEqual(["exit"]);
    expect(t.update({ sub: 0, eyeUnder: false, velZ: 3, moving: false, dt: DT })).toEqual([]);
  });

  it("does not splash over and over when bobbing across the surface line", () => {
    const t = new WaterSoundTracker();
    const all = [];
    for (let i = 0; i < 30; i++) all.push(...t.update({ sub: i % 2 ? 0.05 : 0, eyeUnder: false, velZ: 0, moving: false, dt: DT }));
    expect(all.length).toBeLessThanOrEqual(2);
  });

  it("strokes at most every 0.6 s while swimming and moving, and not while still", () => {
    const t = new WaterSoundTracker();
    t.update({ sub: 0.8, eyeUnder: false, velZ: 0, moving: false, dt: DT });
    let strokes = 0;
    for (let i = 0; i < 120; i++) strokes += kinds(t.update({ sub: 0.8, eyeUnder: false, velZ: 0, moving: true, dt: DT })).filter((k) => k === "stroke").length;
    expect(strokes).toBeGreaterThanOrEqual(3);
    expect(strokes).toBeLessThanOrEqual(4);
    let still = 0;
    for (let i = 0; i < 120; i++) still += t.update({ sub: 0.8, eyeUnder: false, velZ: 0, moving: false, dt: DT }).length;
    expect(still).toBe(0);
  });

  it("gurgles when the head goes under, and is silent on dry land", () => {
    const t = new WaterSoundTracker();
    t.update({ sub: 0.7, eyeUnder: false, velZ: 0, moving: false, dt: DT });
    expect(kinds(t.update({ sub: 1, eyeUnder: true, velZ: -2, moving: false, dt: DT }))).toEqual(["dive"]);
    const dry = new WaterSoundTracker();
    let n = 0;
    for (let i = 0; i < 120; i++) n += dry.update({ sub: 0, eyeUnder: false, velZ: i % 30 === 0 ? -10 : 0, moving: true, dt: DT }).length;
    expect(n).toBe(0);
  });
});
