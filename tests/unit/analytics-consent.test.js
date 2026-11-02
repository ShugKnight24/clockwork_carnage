import { describe, it, expect, beforeEach, vi } from "vitest";

// js/analytics.js reads consent from localStorage and sends through
// window.gtag; stand both in, and load a fresh copy of the module per test.
let store;
let sent;
beforeEach(() => {
  vi.resetModules();
  store = new Map();
  sent = [];
  vi.stubGlobal("localStorage", {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  });
  vi.stubGlobal("window", {
    gtag: (...args) => sent.push(args),
    addEventListener: () => {},
  });
  vi.stubGlobal("document", {
    getElementById: () => null,
    createElement: () => ({}),
    head: { appendChild: () => {} },
  });
});

const load = () => import("../../js/analytics.js");
const campaignGame = () => ({
  mode: "campaign",
  settings: {},
  campaign: { act: 2, level: 0 },
  map: { name: "Sublevel" },
  player: { x: 1, y: 1 },
});

describe("analytics consent gate", () => {
  it("writes nothing to storage before the player answers", async () => {
    await load();
    expect(store.has("cc_session_id")).toBe(false);
  });

  it("sends nothing without consent", async () => {
    const { trackEvent } = await load();
    trackEvent("mode_start", { mode: "arena" });
    store.set("cc_analytics_consent", "declined");
    trackEvent("mode_start", { mode: "arena" });
    expect(sent).toEqual([]);
    expect(store.has("cc_session_id")).toBe(false);
  });

  it("sends with consent, with a session ID made then", async () => {
    store.set("cc_analytics_consent", "accepted");
    const { trackEvent } = await load();
    trackEvent("mode_start", { mode: "arena" });
    expect(sent).toHaveLength(1);
    const [kind, name, params] = sent[0];
    expect([kind, name]).toEqual(["event", "mode_start"]);
    expect(params.session_id).toBe(store.get("cc_session_id"));
  });

  it("opting out forgets the session ID and stops sending", async () => {
    const { setAnalyticsConsent, trackEvent } = await load();
    setAnalyticsConsent(true);
    expect(store.get("cc_analytics_consent")).toBe("accepted");
    expect(store.has("cc_session_id")).toBe(true);
    setAnalyticsConsent(false);
    expect(store.get("cc_analytics_consent")).toBe("declined");
    expect(store.has("cc_session_id")).toBe(false);
    expect(window["ga-disable-G-M2ETG779YT"]).toBe(true);
    sent.length = 0;
    trackEvent("mode_start", { mode: "arena" });
    expect(sent).toEqual([]);
  });

  it("forwards the playtest log's level events with act, level and build", async () => {
    store.set("cc_analytics_consent", "accepted");
    await load();
    const log = await import("../../src/systems/playtest-log.js");
    log.resetPlaytestLog();
    const g = campaignGame();
    log.noteLevelStart(g);
    log.noteDeath(g);
    log.noteRetry(g);
    log.noteLevelStart(g);
    log.noteLevelComplete(g, { seconds: 40, grade: { letter: "A" } });
    log.noteQuit(g, "pause");
    log.notePrologueStep({ ...g, mode: "tutorial", tutorial: { def: { id: "x" } } });
    const events = sent.map(([, name, params]) => [name, params.act, params.level]);
    expect(events).toEqual([
      ["level_start", 2, 1],
      ["level_death", 2, 1],
      ["level_retry", 2, 1],
      ["level_start", 2, 1],
      ["level_complete", 2, 1],
      ["level_quit", 2, 1],
    ]);
    expect(sent[0][2].build).toMatch(/^0\.9\.0/);
    expect(sent[4][2].grade).toBe("A");
  });

  it("forwards no level events without consent", async () => {
    await load();
    const log = await import("../../src/systems/playtest-log.js");
    log.resetPlaytestLog();
    log.noteLevelStart(campaignGame());
    expect(sent).toEqual([]);
  });
});
