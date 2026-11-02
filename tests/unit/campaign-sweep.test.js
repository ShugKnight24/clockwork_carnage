import { describe, it, expect } from "vitest";
import { campaignSlots, sweepSlots, slotLabel, kitBefore, summariseSweeps } from "../../js/testing/campaign-sweep.js";
import { totalLevels, getAct } from "../../src/data/campaign/acts.js";

describe("campaign sweep: which levels", () => {
  it("covers the whole campaign in play order by default", () => {
    const all = sweepSlots();
    expect(all).toHaveLength(totalLevels());
    expect(all[0]).toEqual([1, 0]);
    expect(all).toEqual(campaignSlots());
  });

  it("takes one act, or a range of [act, level] inclusive", () => {
    expect(sweepSlots({ act: 2 })).toHaveLength(getAct(2).levels.length);
    expect(sweepSlots({ from: [1, 6], to: [2, 1] })).toEqual([[1, 6], [1, 7], [2, 0], [2, 1]]);
  });

  it("labels levels as the review tables do", () => {
    expect(slotLabel(1, 3)).toBe("I-4");
    expect(slotLabel(4, 6)).toBe("IV-7");
  });

  it("starts a level cold with the guns the levels before it lay out", () => {
    expect(kitBefore(1, 0)).toEqual({ weapons: [0], levels: 0 });
    const later = kitBefore(3, 0);
    expect(later.levels).toBe(getAct(1).levels.length + getAct(2).levels.length);
    expect(later.weapons.length).toBeGreaterThan(1);
  });
});

describe("campaign sweep: the table", () => {
  const level = (slot, attempts) => ({ slot, act: 1, level: 0, map: "entry", attempts, deaths: attempts.filter((a) => a.end === "died").length, time: attempts.reduce((s, a) => s + a.t, 0), ...result(attempts) });
  const result = (attempts) => {
    const last = attempts.at(-1);
    const cleared = last.end === "cleared";
    return { cleared, honest: cleared && !last.assisted, assisted: cleared && last.assisted, blocked: cleared ? null : last.end };
  };

  it("keeps an assisted clear apart from an honest one, and names the top killer", () => {
    const runs = [
      { opts: { seed: 1, aim: "head" }, levels: [level("I-1", [{ end: "cleared", t: 30 }])] },
      { opts: { seed: 1, aim: "body" }, levels: [level("I-1", [{ end: "died", t: 10, killer: "sentinel" }, { end: "cleared", t: 50, assisted: true }])] },
      { opts: { seed: 2, aim: "body" }, levels: [level("I-1", [{ end: "stuck", t: 90, at: { x: 1, y: 1 } }])] },
    ];
    const [row] = summariseSweeps(runs);
    expect(row).toMatchObject({ slot: "I-1", runs: 3, honest: 1, assisted: 1, failed: 1, avgDeaths: 0.33, avgTime: 60, topKiller: "sentinel (1)" });
    expect(row.blocked).toEqual({ stuck: 1 });
    expect(row.stuck[0]).toMatchObject({ seed: 2, aim: "body", end: "stuck" });
  });
});
