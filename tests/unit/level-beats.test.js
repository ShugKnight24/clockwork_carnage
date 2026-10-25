import { describe, it, expect } from "vitest";
import { LEVEL_BEATS } from "../../src/data/campaign/beats.js";
import { LevelBeats, BEAT_MEMBERS } from "../../src/systems/level-beats.js";
import { ACTS } from "../../src/data/campaign/acts.js";

const SPEAKERS = ["ARIA", "PA", "RASCZAK (LOG)", "LAB LOG", "UNKNOWN", "SIMON (LOG)", "ENCRYPTED", "LYRA", "ROOK", "NOVA", "KAEL", "PARADOX LORD"];
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

  it("gives every level before each act's boss a story to find", () => {
    for (const act of ACTS) {
      for (const l of act.levels.filter((l) => !l.boss && l.map !== "core")) {
        expect(LEVEL_BEATS[act.id]?.[l.map]?.length ?? 0, `act ${act.id} ${l.map}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("only lets the squad speak where they are, under the right name", () => {
    for (const act of ACTS) {
      for (const l of act.levels) {
        for (const b of LEVEL_BEATS[act.id]?.[l.map] ?? []) {
          for (const [speaker] of b.lines || []) {
            const member = BEAT_MEMBERS[speaker];
            if (!member) continue;
            const here = [...l.squad, ...(b.guest || [])];
            expect(here, `act ${act.id} ${l.map}: ${speaker}`).toContain(member);
            // Lyra is ENCRYPTED until she has a name, and LYRA after.
            const nameless = !!l.callsigns?.[member];
            expect(speaker === "ENCRYPTED", `act ${act.id} ${l.map}: ${speaker}`).toBe(nameless);
          }
        }
      }
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
