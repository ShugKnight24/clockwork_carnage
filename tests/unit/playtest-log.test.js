import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PLAYTEST_LOG_KEY,
  MAX_SESSIONS,
  MAX_BYTES,
  MAX_EVENTS,
  noteRetry,
  noteLevelStart,
  noteHit,
  noteDeath,
  noteLevelComplete,
  noteQuit,
  notePrologueStep,
  sample,
  logEvent,
  recentEvents,
  exportSession,
  readPlaytestLog,
  resetPlaytestLog,
  onPlaytestEvent,
} from "../../src/systems/playtest-log.js";
import { sessionFileName } from "../../src/systems/playtest-export.js";
import { BUILD } from "../../src/build-info.js";

// The log persists through localStorage; give it an in-memory stand-in so the
// tests exercise the real save path.
let store;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  });
  resetPlaytestLog();
});

/** Just enough of a Game for the hooks. */
function makeGame(over = {}) {
  return {
    mode: "campaign",
    state: "playing",
    isTouchDevice: false,
    inputDevice: "keyboard",
    settings: { difficulty: 1, artStyle: 1, hudStyle: 4, sensitivity: 0.7, masterVolume: 100 },
    campaign: { act: 1, level: 3 },
    map: { name: "Foundry Floor" },
    player: { x: 12.34, y: 5.67, health: 0, alive: false },
    quality: { history: [60, 58, 30, 61] },
    ...over,
  };
}

const stored = () => JSON.parse(store.get(PLAYTEST_LOG_KEY));

describe("playtest log: a level's record", () => {
  it("logs start, death with its killer and position, retry, clear and quit", () => {
    const g = makeGame();
    noteLevelStart(g);
    sample(g, 1.2); // one fps sample, 1.2 s played
    noteHit(g, { enemyType: "hound", x: 1, y: 1 });
    noteDeath(g);
    noteRetry(g);
    noteLevelStart(g);
    noteLevelComplete(g, { seconds: 83.25, grade: { letter: "B" } });

    const { session } = exportSession(g);
    expect(session.levels).toHaveLength(1);
    const lvl = session.levels[0];
    expect(lvl).toMatchObject({ act: 1, level: 4, name: "Foundry Floor", attempts: 2, retries: 1, completions: 1, grade: "B", bestGrade: "B", clearSec: 83.3 });
    expect(lvl.deaths).toEqual([{ killer: "hound", x: 12.3, y: 5.7, atSec: 1.2 }]);
    expect(lvl.fps).toMatchObject({ samples: 1, avg: 52.3, worst: 52.3, worstFrame: 30 });
    expect(lvl.timeSec).toBeCloseTo(1.2);

    noteLevelStart(g);
    noteQuit(g, "pause");
    expect(exportSession(g).session.levels[0]).toMatchObject({ attempts: 3, quits: 1 });

    const types = exportSession(g).session.events.map((e) => e.type);
    expect(types).toEqual(["level_start", "level_death", "level_retry", "level_start", "level_complete", "level_start", "level_quit"]);
  });

  it("names a projectile's shooter, a blast and a hazard", () => {
    const g = makeGame();
    noteLevelStart(g);
    noteHit(g, { x: 0, y: 0, from: "sentry" });
    noteDeath(g);
    noteLevelStart(g);
    noteHit(g, { x: 0, y: 0 });
    noteDeath(g);
    noteLevelStart(g);
    noteHit(g, undefined);
    noteDeath(g);
    noteLevelStart(g);
    noteDeath(g);
    expect(exportSession(g).session.levels[0].deaths.map((d) => d.killer)).toEqual(["sentry", "blast", "hazard", "unknown"]);
  });

  it("keeps a better grade as the best", () => {
    const g = makeGame();
    noteLevelStart(g);
    noteLevelComplete(g, { seconds: 50, grade: { letter: "S" } });
    noteLevelStart(g);
    noteLevelComplete(g, { seconds: 90, grade: { letter: "C" } });
    expect(exportSession(g).session.levels[0]).toMatchObject({ grade: "C", bestGrade: "S", completions: 2 });
  });

  it("a quit outside a level is logged without touching any level", () => {
    const g = makeGame({ mode: "arena" });
    noteQuit(g, "game_over");
    const { session } = exportSession(g);
    expect(session.levels).toEqual([]);
    expect(session.events.at(-1)).toMatchObject({ type: "level_quit", from: "game_over", mode: "arena" });
  });
});

describe("playtest log: the session", () => {
  it("records build, device tier, input and the key settings only", () => {
    const g = makeGame({ isTouchDevice: true, inputDevice: "touch" });
    noteLevelStart(g);
    const { session, format } = exportSession(g);
    expect(format).toBe("clockwork-carnage-playtest/1");
    expect(session.build).toEqual(BUILD);
    expect(session.device.tier).toBe("touch");
    expect(session.input).toBe("touch");
    expect(session.settings).toEqual({ difficulty: 1, artStyle: 1, hudStyle: 4, sensitivity: 0.7 });
  });

  it("follows the prologue: the step reached and time to first shot", () => {
    const tutorial = { step: 5, def: { id: "weapons" }, suitedAt: 40, firstShotAt: 52.5, runClock: 61 };
    const g = makeGame({ mode: "tutorial", tutorial });
    notePrologueStep(g);
    const { session } = exportSession(g);
    expect(session.prologue).toEqual({ step: "weapons", index: 5, firstShotSec: 12.5, chapterSec: 61 });
    expect(session.events.at(-1)).toMatchObject({ type: "prologue_step", step: "weapons" });
  });

  it("persists to localStorage after each event", () => {
    const g = makeGame();
    noteLevelStart(g);
    expect(stored().sessions).toHaveLength(1);
    expect(stored().sessions[0].events[0].type).toBe("level_start");
  });

  it("keeps earlier sessions and appends this page's", () => {
    store.set(PLAYTEST_LOG_KEY, JSON.stringify({ version: 1, sessions: [{ id: "old", events: [], levels: [] }] }));
    resetPlaytestLog();
    noteLevelStart(makeGame());
    expect(readPlaytestLog().sessions.map((s) => s.id)[0]).toBe("old");
    expect(exportSession(makeGame()).earlierSessions).toBe(1);
  });

  it("drops the oldest sessions past the count cap", () => {
    const old = Array.from({ length: MAX_SESSIONS + 3 }, (_, i) => ({ id: `s${i}`, events: [], levels: [] }));
    store.set(PLAYTEST_LOG_KEY, JSON.stringify({ version: 1, sessions: old }));
    resetPlaytestLog();
    noteLevelStart(makeGame());
    const ids = stored().sessions.map((s) => s.id);
    expect(ids).toHaveLength(MAX_SESSIONS);
    expect(ids).not.toContain("s0");
    expect(ids.at(-2)).toBe(`s${MAX_SESSIONS + 2}`);
  });

  it("drops the oldest sessions past the size cap", () => {
    const pad = "x".repeat(Math.ceil(MAX_BYTES / 4));
    const old = Array.from({ length: 5 }, (_, i) => ({ id: `big${i}`, note: pad, events: [], levels: [] }));
    store.set(PLAYTEST_LOG_KEY, JSON.stringify({ version: 1, sessions: old }));
    resetPlaytestLog();
    noteLevelStart(makeGame());
    expect(store.get(PLAYTEST_LOG_KEY).length).toBeLessThanOrEqual(MAX_BYTES);
    const ids = stored().sessions.map((s) => s.id);
    expect(ids).not.toContain("big0");
    expect(ids.at(-1)).not.toMatch(/^big/);
  });

  it("caps a session's events, keeping the newest", () => {
    const g = makeGame();
    for (let i = 0; i < MAX_EVENTS + 25; i++) logEvent(g, "tick", { i });
    const { events } = exportSession(g).session;
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events.at(-1).i).toBe(MAX_EVENTS + 24);
    expect(recentEvents(20).map((e) => e.i)).toEqual(Array.from({ length: 20 }, (_, k) => MAX_EVENTS + 5 + k));
  });

  it("tells listeners each event", () => {
    const heard = [];
    const off = onPlaytestEvent((e) => heard.push(e.type));
    const g = makeGame();
    noteLevelStart(g);
    noteQuit(g, "pause");
    off();
    noteLevelStart(g);
    expect(heard).toEqual(["level_start", "level_quit"]);
  });

  it("names the session file after the build and the time", () => {
    const name = sessionFileName("session", "json", new Date("2026-11-01T14:02:33Z"));
    expect(name).toBe(`clockwork-carnage-session-${BUILD.version}-2026-11-01-14-02-33.json`);
  });
});
