import { describe, it, expect } from "vitest";
import { VesselSoundTracker, playVesselSound } from "../../src/audio/vessel-sounds.js";

const DT = 1 / 60;

/** Feed the tracker `seconds` of the same state; returns every event it fired. */
function run(tracker, state, seconds) {
  const out = [];
  for (let t = 0; t < seconds; t += DT) out.push(...tracker.update({ splash: 0, bump: 0, ...state, dt: DT }));
  return out;
}
const named = (events, name) => events.filter((e) => e[0] === name);

describe("vessel sounds", () => {
  it("a jetski's engine pulses faster and higher the faster it goes", () => {
    const slow = named(run(new VesselSoundTracker(), { kind: "jetski", speed: 1, throttle: 1, floating: true }, 2), "engine");
    const fast = named(run(new VesselSoundTracker(), { kind: "jetski", speed: 12, throttle: 1, floating: true }, 2), "engine");
    expect(slow.length).toBeGreaterThan(5);
    expect(fast.length).toBeGreaterThan(slow.length * 1.5);
    expect(fast[0][2]).toBeGreaterThan(slow[0][2]);
  });

  it("idles the engine slowly with the throttle off, and a boat has none", () => {
    const idle = named(run(new VesselSoundTracker(), { kind: "jetski", speed: 0, throttle: 0, floating: true }, 2), "engine");
    expect(idle.length).toBeGreaterThan(0);
    expect(idle.length).toBeLessThan(15);
    expect(named(run(new VesselSoundTracker(), { kind: "boat", speed: 5, throttle: 1, floating: true }, 2), "engine")).toEqual([]);
  });

  it("paddles a raft or a boat only while it is pushed along afloat, a stroke at a time", () => {
    for (const kind of ["raft", "boat"]) {
      const strokes = named(run(new VesselSoundTracker(), { kind, speed: 2, throttle: 1, floating: true }, 3), "paddle");
      expect(strokes.length).toBeGreaterThanOrEqual(3);
      expect(strokes.length).toBeLessThanOrEqual(5);
      expect(named(run(new VesselSoundTracker(), { kind, speed: 2, throttle: 0, floating: true }, 3), "paddle")).toEqual([]);
      expect(named(run(new VesselSoundTracker(), { kind, speed: 0, throttle: 1, floating: false }, 3), "paddle")).toEqual([]);
    }
    expect(named(run(new VesselSoundTracker(), { kind: "jetski", speed: 2, throttle: 1, floating: true }, 3), "paddle")).toEqual([]);
  });

  it("splashes on landing in the water, louder for a harder landing", () => {
    const t = new VesselSoundTracker();
    const soft = t.update({ kind: "boat", speed: 0, throttle: 0, floating: true, splash: 2, bump: 0, dt: DT });
    const t2 = new VesselSoundTracker();
    const hard = t2.update({ kind: "boat", speed: 0, throttle: 0, floating: true, splash: 9, bump: 0, dt: DT });
    expect(named(soft, "splash")).toHaveLength(1);
    expect(named(hard, "splash")[0][1]).toBeGreaterThan(named(soft, "splash")[0][1]);
    expect(named(t.update({ kind: "boat", speed: 0, throttle: 0, floating: true, splash: 0.5, bump: 0, dt: DT }), "splash")).toEqual([]);
  });

  it("thumps once on a hard stop, not on a graze", () => {
    const t = new VesselSoundTracker();
    expect(named(t.update({ kind: "boat", speed: 0, throttle: 1, floating: true, splash: 0, bump: 5, dt: DT }), "bump")).toHaveLength(1);
    expect(named(t.update({ kind: "boat", speed: 0, throttle: 1, floating: true, splash: 0, bump: 5, dt: DT }), "bump")).toEqual([]); // rate-limited
    expect(named(new VesselSoundTracker().update({ kind: "boat", speed: 0, throttle: 1, floating: true, splash: 0, bump: 0.3, dt: DT }), "bump")).toEqual([]);
  });

  it("is quiet sitting on land", () => {
    expect(run(new VesselSoundTracker(), { kind: "raft", speed: 0, throttle: 0, floating: false }, 2)).toEqual([]);
  });

  it("plays through the AudioManager's primitives, and nothing without a context", () => {
    const calls = [];
    const audio = { ctx: {}, playNoise: (...a) => calls.push(["noise", ...a]), playTone: (...a) => calls.push(["tone", ...a]) };
    for (const name of ["engine", "paddle", "splash", "bump"]) {
      calls.length = 0;
      playVesselSound(audio, name, 0.8, 1.5, "jetski");
      expect(calls.length, name).toBeGreaterThan(0);
      for (const c of calls) for (const v of c.slice(1, 3)) expect(Number.isFinite(v), `${name} ${c}`).toBe(true);
    }
    expect(() => playVesselSound({}, "engine", 1)).not.toThrow();
    expect(() => playVesselSound(null, "engine", 1)).not.toThrow();
  });
});
