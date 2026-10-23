import { describe, it, expect, beforeEach } from "vitest";
import {
  AriaCommsSystem,
  CHATTER_COOLDOWN,
  CHATTER_PER_MINUTE,
  chatterKind,
  drawLine,
  resetLineBags,
} from "../../src/systems/aria-comms.js";
import { ARIA_COMMS } from "../../src/data/dialogue.js";

// The playtest note: "ARIA repeats some of her lines way too often." A pool
// is dealt like a deck, chatter has a cooldown and a per-minute cap, and the
// idle pools hold one thought per line.

const run = (comms, seconds, playing = true) => {
  for (let t = 0; t < seconds; t += 0.1) comms.update(0.1, playing);
};

beforeEach(() => resetLineBags());

describe("drawLine", () => {
  it("says every line in a pool once before any line comes round again", () => {
    const pool = ARIA_COMMS.idle;
    const said = Array.from({ length: pool.length }, () => drawLine("idle", pool));
    expect(new Set(said).size).toBe(pool.length);
  });

  it("never opens a new round on the line that closed the last one", () => {
    const pool = ["a", "b", "c"];
    for (let round = 0; round < 50; round++) {
      const said = [0, 1, 2].map(() => drawLine("abc", pool));
      const next = drawLine("abc", pool);
      expect(next).not.toBe(said[2]);
      // Finish that round so the next starts clean.
      drawLine("abc", pool);
      drawLine("abc", pool);
    }
  });

  it("keeps a separate deck per pool", () => {
    expect(drawLine("one", ["x"])).toBe("x");
    expect(drawLine("two", ["y"])).toBe("y");
    expect(drawLine("one", ["x"])).toBe("x");
  });
});

describe("ARIA's chatter", () => {
  const live = () => {
    const comms = new AriaCommsSystem(null);
    comms.enabled = true;
    return comms;
  };
  const drain = (comms) => {
    const out = comms.queue.map((m) => m.text);
    comms.queue = [];
    return out;
  };

  it("knows chatter from lines the game needs said", () => {
    expect(chatterKind("idle")).toBe("idle");
    expect(chatterKind("act1Ambient")).toBe("idle");
    expect(chatterKind("killStreak5")).toBe("streak");
    expect(chatterKind("powerCellsBrief")).toBeNull();
    expect(chatterKind("bossEncounter")).toBeNull();
  });

  it("does not bark the same kind twice inside the cooldown", () => {
    const comms = live();
    comms.queueMessage("killStreak3");
    comms.queueMessage("killStreak5");
    expect(drain(comms)).toHaveLength(1);
    run(comms, CHATTER_COOLDOWN + 1, false);
    comms.queueMessage("killStreak7");
    expect(drain(comms)).toHaveLength(1);
  });

  it("caps chatter of every kind per minute", () => {
    const comms = live();
    for (const c of ["killStreak3", "dashUsed", "healthPickup", "idle", "act1Ambient"]) comms.queueMessage(c);
    expect(drain(comms)).toHaveLength(CHATTER_PER_MINUTE);
  });

  it("never holds back a line the game needs said", () => {
    const comms = live();
    for (let i = 0; i < 6; i++) comms.queueMessage("exitSealed");
    expect(drain(comms)).toHaveLength(6);
  });

  it("goes most of a minute between idle lines, and no idle line repeats in ten minutes", () => {
    const comms = live();
    comms.setNarrativeContext({ act: 1, ambient: "act1Ambient" });
    const said = [];
    for (let t = 0; t < 600; t += 0.1) {
      comms.update(0.1, true);
      if (comms.message && !said.includes(comms.message)) said.push(comms.message);
    }
    const texts = said.map((m) => m.text);
    expect(texts.length).toBeGreaterThan(3);
    expect(texts.length).toBeLessThanOrEqual(12);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
