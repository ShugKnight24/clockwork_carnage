import { describe, it, expect } from "vitest";
import {
  MESSAGE_KINDS,
  LANE_CAPS,
  MessageDirector,
  commsRule,
  pickNext,
  pruneQueue,
  commsPlacement,
  teachFolds,
  foldsInto,
  combatIntense,
} from "../../src/ui/message-director.js";

/** A director driven in whole steps of `dt` seconds from t = 0. */
function run(d, seconds, opts = {}, dt = 0.1) {
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    d._t = (d._t ?? 0) + dt;
    d.update(d._t, typeof opts === "function" ? opts() : opts);
  }
}

function fresh() {
  const d = new MessageDirector();
  d._t = 0;
  d.update(0);
  return d;
}

describe("headline lane", () => {
  it("shows one headline at a time, the highest priority next", () => {
    const d = fresh();
    d.post("title", "levelTitle");
    d.post("boss", "bossIntro");
    run(d, 0.1);
    expect(d.current("headline").key).toBe("boss");
    expect(d.status("title")).toBe("queued");
    run(d, MESSAGE_KINDS.bossIntro.duration + 0.2);
    expect(d.status("boss")).toBe("done");
    expect(d.current("headline").key).toBe("title");
  });

  it("keeps posting order between equal priorities", () => {
    const d = fresh();
    d.post("a", "levelTitle");
    run(d, 0.1);
    d.post("b", "levelTitle");
    d.post("c", "levelTitle");
    run(d, MESSAGE_KINDS.levelTitle.duration + 0.2);
    expect(d.current("headline").key).toBe("b");
  });

  it("never cuts a fresh headline short for a higher one", () => {
    const d = fresh();
    d.post("boss", "bossIntro");
    run(d, 1);
    d.post("teach:timeLock", "teach");
    run(d, 1);
    expect(d.current("headline").key).toBe("boss");
    run(d, MESSAGE_KINDS.bossIntro.duration);
    expect(d.current("headline").key).toBe("teach:timeLock");
    expect(d.age("teach:timeLock")).toBeLessThan(MESSAGE_KINDS.bossIntro.duration);
  });

  it("lets a waiting boss intro take a sticky teach card's lane once the card has been read, then resumes it", () => {
    const d = fresh();
    d.post("teach", "teach");
    run(d, 2);
    d.post("boss", "bossIntro");
    run(d, 1);
    // Still in its read window: the boss waits.
    expect(d.current("headline").key).toBe("teach");
    run(d, MESSAGE_KINDS.teach.minHold);
    expect(d.current("headline").key).toBe("boss");
    expect(d.status("teach")).toBe("queued");
    for (let i = 0; i < 100 && d.showing("boss"); i++) run(d, 0.1);
    expect(d.current("headline").key).toBe("teach");
    // It comes back with its fade-in, not mid-way through.
    expect(d.age("teach")).toBeLessThan(0.2);
  });

  it("keeps a sticky headline up until its producer is done with it", () => {
    const d = fresh();
    d.post("teach", "teach");
    run(d, 60);
    expect(d.showing("teach")).toBe(true);
    d.done("teach");
    expect(d.current("headline")).toBe(null);
    expect(d.status("teach")).toBe("done");
  });

  it("drops a boss intro that could not show in time", () => {
    const d = fresh();
    d.post("teach", "teach");
    run(d, 0.1);
    d.post("teach2", "teach");
    d.post("boss", "bossIntro");
    // Two teach cards ahead of it keep the lane past its time to live.
    run(d, MESSAGE_KINDS.teach.minHold - 0.5);
    d.done("teach");
    run(d, MESSAGE_KINDS.bossIntro.ttl);
    expect(d.status("boss")).toBe("expired");
  });

  it("does not run its clock while paused, and clamps a long frame", () => {
    const d = fresh();
    d.post("boss", "bossIntro");
    run(d, 1);
    run(d, 30, { paused: true });
    expect(d.showing("boss")).toBe(true);
    d.update(d._t + 20);
    expect(d.showing("boss")).toBe(true);
    expect(d.age("boss")).toBeLessThan(1.5);
  });

  it("treats a second post of the same key as the first", () => {
    const d = fresh();
    const a = d.post("boss", "bossIntro");
    const b = d.post("boss", "bossIntro");
    expect(a).toBe(b);
    expect(d.pending("headline").length + (d.current("headline") ? 1 : 0)).toBe(1);
  });

  it("clears a lane on reset", () => {
    const d = fresh();
    d.post("boss", "bossIntro");
    d.post("u", "unlock");
    run(d, 0.1);
    d.resetLane("headline");
    expect(d.current("headline")).toBe(null);
    expect(d.status("boss")).toBe(null);
    expect(d.status("u")).not.toBe(null);
  });
});

describe("chip lane", () => {
  it("shows one chip at a time, achievements first", () => {
    const d = fresh();
    d.post("u1", "unlock", { kind: "Gear tier", name: "MK II" });
    d.post("a1", "achievement");
    run(d, 0.1);
    expect(d.current("chip").key).toBe("a1");
    run(d, MESSAGE_KINDS.achievement.duration + 0.1);
    expect(d.current("chip").key).toBe("u1");
    expect(d.current("chip").data.name).toBe("MK II");
  });

  it("waits out heavy combat, a boss intro and a fresh teach card", () => {
    const d = fresh();
    d.post("u", "unlock");
    run(d, 2, { intense: true });
    expect(d.status("u")).toBe("queued");
    run(d, 0.2);
    expect(d.showing("u")).toBe(true);

    const e = fresh();
    e.post("boss", "bossIntro");
    e.post("u", "unlock");
    run(e, 1);
    expect(e.status("u")).toBe("queued");
    run(e, MESSAGE_KINDS.bossIntro.duration);
    expect(e.showing("u")).toBe(true);

    const f = fresh();
    f.post("teach", "teach");
    run(f, 0.1);
    f.post("u", "unlock");
    run(f, MESSAGE_KINDS.teach.minHold - 1);
    expect(f.status("u")).toBe("queued");
    run(f, 1.2);
    expect(f.showing("u")).toBe(true);
  });

  it("does not hold an unlock back forever, but never shows it over a boss intro", () => {
    const d = fresh();
    d.post("u", "unlock");
    run(d, MESSAGE_KINDS.unlock.maxDefer - 1, { intense: true });
    expect(d.status("u")).toBe("queued");
    run(d, 1.2, { intense: true });
    expect(d.showing("u")).toBe(true);

    const e = fresh();
    e.post("u", "unlock");
    run(e, MESSAGE_KINDS.unlock.maxDefer - 1, { intense: true });
    e.post("boss", "bossIntro");
    run(e, 2, { intense: true });
    expect(e.showing("boss")).toBe(true);
    expect(e.status("u")).toBe("queued");
  });

  it("on a phone, waits for any headline to clear", () => {
    const d = fresh();
    d.lanes = { chipsShareHeadline: true };
    d.post("teach", "teach");
    run(d, 0.1);
    d.post("u", "unlock");
    run(d, MESSAGE_KINDS.unlock.maxDefer + 5);
    expect(d.status("u")).toBe("queued");
    d.done("teach");
    run(d, 0.2);
    expect(d.showing("u")).toBe(true);
  });

  it("drops a stale gear pickup chip", () => {
    const d = fresh();
    d.post("g", "gear");
    run(d, MESSAGE_KINDS.gear.ttl + 0.5, { intense: true });
    expect(d.status("g")).toBe("expired");
  });

  it("never lets the chip queue pile up", () => {
    const d = fresh();
    d.post("g0", "gear");
    for (let i = 0; i < 20; i++) d.post(`u${i}`, "unlock");
    expect(d.pending("chip").length).toBeLessThanOrEqual(LANE_CAPS.chip);
    // The gear chip (lowest priority) went first, then the oldest unlocks.
    expect(d.status("g0")).toBe("expired");
    expect(d.status("u0")).toBe("expired");
    expect(d.status("u19")).toBe("queued");
  });

  it("plays a backlog of chips faster", () => {
    const d = fresh();
    for (let i = 0; i < 6; i++) d.post(`u${i}`, "unlock");
    run(d, 0.1);
    expect(d.current("chip").duration).toBeLessThan(MESSAGE_KINDS.unlock.duration);
    const e = fresh();
    e.post("u", "unlock");
    run(e, 0.1);
    expect(e.current("chip").duration).toBe(MESSAGE_KINDS.unlock.duration);
  });
});

describe("comms rules", () => {
  const line = (over = {}) => ({ text: "x", prominent: true, speaker: "ARIA", ...over });

  it("ranks projected over prominent over squad over idle chatter", () => {
    const p = commsRule(line({ projected: true })).priority;
    const m = commsRule(line()).priority;
    const s = commsRule(line({ prominent: false, speaker: "KAEL" })).priority;
    const i = commsRule(line({ prominent: false })).priority;
    expect(p).toBeGreaterThan(m);
    expect(m).toBeGreaterThan(s);
    expect(s).toBeGreaterThan(i);
  });

  it("picks the highest priority, then the oldest", () => {
    const q = [
      line({ prominent: false, speaker: "NOVA", queuedAt: 0 }),
      line({ prominent: false, speaker: "KAEL", queuedAt: 1 }),
      line({ queuedAt: 2 }),
      line({ queuedAt: 3 }),
    ];
    expect(pickNext(q)).toBe(2);
    expect(pickNext(q.slice(0, 2))).toBe(0);
    expect(pickNext([])).toBe(-1);
  });

  it("drops lines that went stale in the queue", () => {
    const q = [
      line({ prominent: false, queuedAt: 0 }), // idle chatter, 6 s
      line({ queuedAt: 0 }), // prominent, 20 s
      line({ projected: true, queuedAt: 0 }),
    ];
    const dropped = pruneQueue(q, 10);
    expect(dropped.length).toBe(1);
    expect(q.length).toBe(2);
    pruneQueue(q, 25);
    expect(q.length).toBe(1);
    expect(q[0].projected).toBe(true);
  });

  it("places a line by what holds the headline", () => {
    const aria = line({ category: "powerUnlocked" });
    expect(commsPlacement(aria, null)).toBe("top");
    expect(commsPlacement(aria, { kind: "bossIntro" })).toBe("hold");
    expect(commsPlacement(aria, { kind: "levelTitle" })).toBe("hold");
    const card = { kind: "teach", data: { fold: teachFolds("timeLock") } };
    expect(commsPlacement(aria, card)).toBe("fold");
    expect(commsPlacement(line({ category: "bossEncounter" }), card)).toBe("low");
  });

  it("folds only lines about the lesson on the card", () => {
    const card = (power) => ({ kind: "teach", data: { fold: teachFolds(power) } });
    expect(foldsInto({ category: "powerUnlocked" }, card("dash"))).toBe(true);
    expect(foldsInto({ category: "chronoShiftActivated" }, card("foresight"))).toBe(true);
    expect(foldsInto({ category: "chronoShiftLoud" }, card("foresight"))).toBe(true);
    expect(foldsInto({ category: "chronoShiftActivated" }, card("rewind"))).toBe(false);
    expect(foldsInto({ category: "teachDone" }, card("rewind"))).toBe(false);
    expect(foldsInto({ category: "powerUnlocked" }, { kind: "bossIntro" })).toBe(false);
    // A squad line is never folded, whatever its pool.
    expect(foldsInto({ category: "powerUnlocked", speaker: "KAEL" }, card("timeLock"))).toBe(false);
  });

  it("director placement follows the headline, including one about to show", () => {
    const d = fresh();
    expect(d.commsPlacement(line())).toBe("top");
    d.post("boss", "bossIntro");
    // Posted this frame, granted next: a line starting now already waits.
    expect(d.commsPlacement(line())).toBe("hold");
    run(d, 0.1);
    expect(d.commsPlacement(line())).toBe("hold");
  });

  it("holds a teach card while ARIA is mid-line in the top slot, and sends her next line low", () => {
    const d = fresh();
    d.commsTop = true;
    d.post("teach", "teach", { fold: teachFolds("rewind") });
    run(d, 2);
    expect(d.status("teach")).toBe("queued");
    expect(d.commsPlacement(line({ category: "bossEncounter" }))).toBe("low");
    expect(d.commsPlacement(line({ category: "powerUnlocked" }))).toBe("fold");
    d.commsTop = false;
    run(d, 0.1);
    expect(d.showing("teach")).toBe(true);
  });
});

describe("combat intensity", () => {
  it("reads a recent hit, slow-mo or a pack closing in", () => {
    expect(combatIntense({ sinceHurt: 1, engaged: 0 })).toBe(true);
    expect(combatIntense({ sinceHurt: 10, engaged: 3 })).toBe(true);
    expect(combatIntense({ sinceHurt: 10, engaged: 0, slowMo: true })).toBe(true);
    expect(combatIntense({ sinceHurt: 10, engaged: 2 })).toBe(false);
    expect(combatIntense({})).toBe(false);
  });
});
