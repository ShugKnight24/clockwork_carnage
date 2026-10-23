import { describe, it, expect } from "vitest";
import { LevelClock } from "../../src/systems/level-clock.js";

const clockAt = () => {
  const t = { now: 1000 };
  const clock = new LevelClock(() => t.now);
  // What every reader (HUD, debrief, stats card) does with it.
  const shown = () => (t.now - clock.start) / 1000;
  return { t, clock, shown };
};

describe("the level clock", () => {
  it("stops when the player goes down and stays stopped on the game-over screen", () => {
    const { t, clock, shown } = clockAt();
    clock.start = t.now;
    t.now += 30_000;
    clock.hold("dead");
    t.now += 60_000; // the death beat, then a minute on the game-over screen
    expect(shown()).toBe(30);
    expect(clock.seconds()).toBe(30);
    expect(clock.running).toBe(false);
  });

  it("starts from zero on Retry Level, whatever held the last run", () => {
    const { t, clock, shown } = clockAt();
    clock.start = t.now;
    t.now += 30_000;
    clock.hold("dead");
    t.now += 10_000;
    clock.start = t.now; // retryLevel → loadLevel
    expect(shown()).toBe(0);
    t.now += 5_000;
    expect(shown()).toBe(5);
    expect(clock.running).toBe(true);
  });

  it("picks up where it stopped on a respawn, and a pause while down adds nothing", () => {
    const { t, clock, shown } = clockAt();
    clock.start = t.now;
    t.now += 20_000;
    clock.hold("dead");
    clock.hold("pause");
    t.now += 15_000;
    clock.hold("pause", false);
    expect(shown()).toBe(20);
    t.now += 5_000;
    clock.hold("dead", false); // a checkpoint respawn
    expect(shown()).toBe(20);
    t.now += 2_000;
    expect(shown()).toBe(22);
  });

  it("leaves an unstarted clock at zero", () => {
    const { clock } = clockAt();
    clock.hold("dead");
    expect(clock.start).toBe(0);
    expect(clock.seconds()).toBe(0);
  });
});
