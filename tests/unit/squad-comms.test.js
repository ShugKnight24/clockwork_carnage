import { describe, it, expect, vi, afterEach } from "vitest";
import { SquadCommsController, squadCallsign } from "../../src/systems/squad-comms.js";
import { ACTS, getAct, bossLevelIndex } from "../../src/data/campaign/acts.js";

// Squad comms speak only for people who are there (spec §9, problems 4-5).

function makeComms(act, level) {
  const said = [];
  const comms = new SquadCommsController({
    queueSquadMessage: (speaker, category, color, line) => said.push({ speaker, category, color, line }),
  });
  comms.setContext(act, level);
  return { comms, said };
}

describe("boss-fight chatter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is silent at the Act I boss: you are alone (problem 4)", () => {
    const { comms, said } = makeComms(1, bossLevelIndex(1));
    // Even asked for a pool that has lines, nobody is there to say them.
    comms.onBossPhase("bossPhase1Squad");
    expect(said).toEqual([]);
  });

  it("speaks as a member who is present, in their own name", () => {
    for (let roll = 0; roll < 1; roll += 0.1) {
      vi.spyOn(Math, "random").mockReturnValue(roll);
      const { comms, said } = makeComms(2, bossLevelIndex(2));
      comms.onBossPhase(getAct(2).boss.squadPool);
      expect(said).toHaveLength(1);
      expect(["KAEL", "NOVA", "ROOK", "LYRA"]).toContain(said[0].speaker);
      expect(said[0].line).not.toMatch(/^\w+:/);
      vi.restoreAllMocks();
    }
  });

  it("never gives a line to someone who is not there", () => {
    // IV-6: only Lyra is left.
    const { comms, said } = makeComms(4, 5);
    comms.onBossPhase("bossPhase3Squad");
    expect(said).toHaveLength(1);
    expect(said[0].speaker).toBe("LYRA");
  });

  it("fires once per pool per level", () => {
    const { comms, said } = makeComms(3, bossLevelIndex(3));
    comms.onBossPhase("bossPhase2Squad");
    comms.onBossPhase("bossPhase2Squad");
    expect(said).toHaveLength(1);
  });
});

describe("idle squad lines", () => {
  it("never come from someone not yet recruited", () => {
    for (const act of ACTS) {
      act.levels.forEach((l, i) => {
        for (let k = 0; k < 20; k++) {
          const { comms, said } = makeComms(act.id, i);
          comms.emit({ force: true });
          if (l.squad.length === 0) expect(said).toEqual([]);
          else expect(l.squad.map((m) => squadCallsign(act.id, i, m))).toContain(said[0].speaker);
        }
      });
    }
  });

  it("keep Lyra's name off the channel before the lift", () => {
    const { comms, said } = makeComms(2, 0);
    comms.emit({ force: true });
    expect(said[0].speaker).toBe("UNKNOWN");
    expect(said[0].color).toBe("#4488ff");
    expect(squadCallsign(2, 1, "lyra")).toBe("LYRA");
  });
});
