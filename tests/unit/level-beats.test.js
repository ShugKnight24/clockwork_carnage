import { describe, it, expect } from "vitest";
import { LEVEL_BEATS } from "../../src/data/campaign/beats.js";
import { LevelBeats } from "../../src/systems/level-beats.js";
import { ACTS } from "../../src/data/campaign/acts.js";

const SPEAKERS = ["ARIA", "PA", "RASCZAK (LOG)", "LAB LOG", "UNKNOWN"];
const TRIGGERS = ["start", "time", "kills", "cell", "exit"];

describe("the campaign's narrative beats", () => {
  it("only names levels that exist in their act", () => {
    for (const [actId, levels] of Object.entries(LEVEL_BEATS)) {
      const act = ACTS.find((a) => String(a.id) === actId);
      expect(act, `act ${actId}`).toBeTruthy();
      const maps = act.levels.map((l) => l.map);
      for (const mapId of Object.keys(levels)) expect(maps, `act ${actId}`).toContain(mapId);
    }
  });

  it("is well formed: a trigger, and something to say or do", () => {
    for (const levels of Object.values(LEVEL_BEATS)) {
      for (const beats of Object.values(levels)) {
        for (const b of beats) {
          expect(TRIGGERS).toContain(b.at);
          expect(!!(b.lines?.length || b.event)).toBe(true);
          if (b.event) expect(["flicker", "tremor"]).toContain(b.event);
          for (const [speaker, text] of b.lines || []) {
            expect(SPEAKERS).toContain(speaker);
            expect(text.length).toBeGreaterThan(0);
            expect(text.length).toBeLessThan(170);
          }
        }
      }
    }
  });

  it("gives every Act I level before the boss a story to find", () => {
    const act1 = ACTS.find((a) => a.id === 1);
    for (const l of act1.levels.filter((l) => !l.boss && l.map !== "core")) {
      expect(LEVEL_BEATS[1][l.map]?.length ?? 0, l.map).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("LevelBeats", () => {
  const fakeGame = () => {
    const queued = [];
    return {
      queued,
      totalEnemies: 10,
      killedEnemies: 0,
      powerCells: { total: 2, found: 0 },
      exitEntity: { x: 50, y: 50 },
      player: { x: 0, y: 0 },
      audio: { tremor() {}, powerFlicker() {} },
      ariaComms: {
        message: null,
        queue: [],
        queueLine(msg) {
          queued.push(msg);
          this.message = msg; // on screen until the test clears it
        },
      },
    };
  };
  const step = (beats, g, seconds) => {
    for (let t = 0; t < seconds; t += 0.1) beats.update(g, 0.1);
  };

  it("fires each beat once, at its moment", () => {
    const b = new LevelBeats();
    b.start(1, "entry");
    const g = fakeGame();
    step(b, g, 5);
    expect(g.queued.map((m) => m.speaker)).toEqual(["ARIA"]); // the start beat
    g.ariaComms.message = null;
    g.killedEnemies = 3; // 30% down
    step(b, g, 1);
    expect(g.queued.at(-1).speaker).toBe("RASCZAK (LOG)");
    g.ariaComms.message = null;
    step(b, g, 5);
    expect(g.queued.length).toBe(2); // nothing fires twice
  });

  it("waits for the comms to be free, and never drops a line", () => {
    const b = new LevelBeats();
    b.start(1, "checkpoint");
    const g = fakeGame();
    g.ariaComms.message = { text: "ARIA's own reaction" };
    g.killedEnemies = 10; // several beats due at once
    g.player = { x: 50, y: 50 };
    step(b, g, 10);
    expect(g.queued.length).toBe(0); // the comms were busy
    for (let i = 0; i < 12; i++) {
      g.ariaComms.message = null;
      step(b, g, 1);
    }
    // Every line of every beat that came due, in order.
    const expected = LEVEL_BEATS[1].checkpoint.flatMap((x) => x.lines || []).length;
    expect(g.queued.length).toBe(expected);
  });

  it("has nothing to say on a level without beats", () => {
    const b = new LevelBeats();
    b.start(1, "core");
    const g = fakeGame();
    step(b, g, 30);
    expect(g.queued.length).toBe(0);
  });
});
