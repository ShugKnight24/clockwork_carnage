import { describe, it, expect, beforeEach, vi } from "vitest";
import { ArchiveSystem } from "../../src/systems/archive.js";
import { BESTIARY } from "../../src/data/bestiary.js";
import { MEMORY_FRAGMENTS } from "../../src/data/memory-fragments.js";

// The archive persists through localStorage; give it an in-memory stand-in so
// the tests exercise the real save path rather than stubbing it out.
beforeEach(() => {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  });
});

const make = () => new ArchiveSystem({});

describe("bestiary", () => {
  it("records the first kill of a type and ignores repeats", () => {
    const a = make();
    expect(a.recordKill("drone")).toBe(true);
    expect(a.recordKill("drone")).toBe(false);
    expect(a.isEnemyKnown("drone")).toBe(true);
  });

  it("ignores enemy types with no bestiary entry", () => {
    const a = make();
    expect(a.recordKill("not_a_real_enemy")).toBe(false);
    expect(a.bestiaryProgress().found).toBe(0);
  });

  it("reports progress against the bestiary size", () => {
    const a = make();
    a.recordKill("drone");
    a.recordKill("phantom");
    expect(a.bestiaryProgress()).toEqual({
      found: 2,
      total: Object.keys(BESTIARY).length,
    });
  });
});

describe("memory fragments", () => {
  it("collects a fragment once and reports it pending", () => {
    const a = make();
    const id = MEMORY_FRAGMENTS[0].id;
    expect(a.collectFragment(id)?.id).toBe(id);
    expect(a.collectFragment(id)).toBeNull();
    expect(a.drainPending().map((f) => f.id)).toEqual([id]);
    expect(a.drainPending()).toEqual([]);
  });

  it("rejects unknown fragment ids", () => {
    const a = make();
    expect(a.collectFragment("nope")).toBeNull();
    expect(a.fragmentProgress().found).toBe(0);
  });

  it("awards hidden fragments one at a time for a level", () => {
    const hidden = MEMORY_FRAGMENTS.find((f) => f.hidden);
    const a = make();
    const first = a.collectHiddenFragmentFor(hidden.act, hidden.level);
    expect(first?.hidden).toBe(true);
    // Second visit to the same level yields nothing new.
    expect(a.collectHiddenFragmentFor(hidden.act, hidden.level)).toBeNull();
  });

  it("awards only visible fragments on level completion", () => {
    const visible = MEMORY_FRAGMENTS.find((f) => !f.hidden);
    const a = make();
    const got = a.collectAutoFragmentsFor(visible.act, visible.level);
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((f) => f.hidden === false)).toBe(true);
  });

  it("reports progress against the fragment count", () => {
    const a = make();
    a.collectFragment(MEMORY_FRAGMENTS[0].id);
    expect(a.fragmentProgress()).toEqual({
      found: 1,
      total: MEMORY_FRAGMENTS.length,
      complete: false,
    });
  });
});

describe("persistence", () => {
  it("round-trips both collections through storage", () => {
    const a = make();
    a.recordKill("drone");
    a.collectFragment(MEMORY_FRAGMENTS[0].id);

    const b = make();
    b.load();
    expect(b.isEnemyKnown("drone")).toBe(true);
    expect(b.isFragmentCollected(MEMORY_FRAGMENTS[0].id)).toBe(true);
  });

  it("starts empty when storage holds nothing", () => {
    const a = make();
    a.load();
    expect(a.bestiaryProgress().found).toBe(0);
    expect(a.fragmentProgress().found).toBe(0);
  });
});

describe("fragment placement matches the campaign", async () => {
  const { CAMPAIGN_LEVELS } = await import("../../src/data/index.js");
  // `act` is a campaign loop: the nine maps are replayed three times with
  // escalating rosters. `level` is the 1-based map number within any loop, so
  // any act can reference any of the nine maps.

  it("references a real map, numbered 1-9, in a real act", () => {
    for (const f of MEMORY_FRAGMENTS) {
      expect(CAMPAIGN_LEVELS[f.level - 1], `${f.id} level`).toBeDefined();
      expect([1, 2, 3], `${f.id} act`).toContain(f.act);
    }
  });

  it("puts hidden fragments on maps that have a secret wall", () => {
    for (const f of MEMORY_FRAGMENTS.filter((m) => m.hidden)) {
      const level = CAMPAIGN_LEVELS[f.level - 1];
      const secrets = level.grid.flat().filter((t) => t === 6).length;
      expect(secrets, `${f.id} on ${level.name}`).toBeGreaterThan(0);
    }
  });

  it("puts visible fragments only on maps that end at an exit", () => {
    // Visible fragments are awarded on LEVEL_COMPLETE, which the boss map
    // never reaches — the boss kill starts the next loop or ends the game.
    for (const f of MEMORY_FRAGMENTS.filter((m) => !m.hidden)) {
      const level = CAMPAIGN_LEVELS[f.level - 1];
      expect(level.exit, `${f.id} on ${level.name}`).toBeTruthy();
    }
  });
});
