import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CAMPAIGN_SAVE_VERSION,
  migrateCampaignSave,
  loadCampaignData,
  saveCampaign,
  getSaveInfo,
} from "../../src/core/save-system.js";
import { getActLevel } from "../../src/data/campaign/acts.js";

vi.mock("../../js/analytics.js", () => ({ trackEvent: () => {} }));

// Campaign save v1 → v2 (spec §15 "Save migration", decision 12): restart
// the act a save was in, wherever the act changed; never silently delete it.

/** A v1 save as the three-act build wrote it. */
const v1 = (act, level, extra = {}) => ({
  version: 1,
  level,
  act,
  ngPlusCycle: 0,
  playerX: 12.5, playerY: 30.5, playerAngle: 1,
  aimOffsetX: 0, aimOffsetY: 0,
  health: 64, maxHealth: 120, score: 4200, weapons: [0, 3], currentWeapon: 1,
  difficulty: "hard",
  mapGrid: [[1, 1], [1, 0]],
  entityStates: [{ type: "enemy", active: false, health: 0, x: 1, y: 1, state: "dead" }],
  killedEnemies: 7,
  ...extra,
});

const MID_LEVEL = ["mapGrid", "entityStates", "killedEnemies", "playerX", "playerY", "playerAngle"];

describe("migrateCampaignSave", () => {
  it("keeps Act I levels 0-6 whole: same maps, same seeds", () => {
    for (const level of [0, 3, 6]) {
      const out = migrateCampaignSave(v1(1, level));
      expect(out).toEqual({ ...v1(1, level), version: CAMPAIGN_SAVE_VERSION });
      expect(out.migrated).toBeUndefined();
    }
  });

  it("lands the old Nexus and Core on the Core, now Act I's level 7", () => {
    for (const level of [7, 8]) {
      const out = migrateCampaignSave(v1(1, level));
      expect([out.act, out.level]).toEqual([1, 7]);
      expect(getActLevel(1, 7).map).toBe("core");
      expect(out.migrated).toBe(true);
    }
  });

  it("restarts old Act 2 at the Gathering and old Act 3 at Act IV", () => {
    for (const level of [0, 4, 8]) {
      const two = migrateCampaignSave(v1(2, level));
      expect([two.act, two.level, two.migrated]).toEqual([2, 0, true]);
      const three = migrateCampaignSave(v1(3, level));
      expect([three.act, three.level, three.migrated]).toEqual([4, 0, true]);
    }
  });

  it("drops mid-level state but keeps the player, gear, difficulty and NG+ cycle", () => {
    const out = migrateCampaignSave(v1(3, 5, { ngPlusCycle: 2 }));
    for (const k of MID_LEVEL) expect(out[k], k).toBeUndefined();
    expect(out).toMatchObject({
      version: CAMPAIGN_SAVE_VERSION,
      ngPlusCycle: 2,
      health: 64,
      maxHealth: 120,
      score: 4200,
      weapons: [0, 3],
      currentWeapon: 1,
      difficulty: "hard",
    });
  });

  it("passes a current save through untouched", () => {
    const current = { ...v1(4, 3), version: CAMPAIGN_SAVE_VERSION };
    expect(migrateCampaignSave(current)).toBe(current);
  });

  it("refuses what it cannot read", () => {
    expect(migrateCampaignSave(null)).toBeNull();
    expect(migrateCampaignSave({ ...v1(1, 0), version: 0 })).toBeNull();
    expect(migrateCampaignSave({ ...v1(1, 0), version: 99 })).toBeNull();
    expect(migrateCampaignSave(v1(7, 0))).toBeNull();
  });
});

describe("loading a v1 save", () => {
  const store = {};
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("migrates it instead of deleting it", () => {
    store.cc_campaign_save = JSON.stringify(v1(2, 5));
    const data = loadCampaignData();
    expect([data.act, data.level, data.migrated]).toEqual([2, 0, true]);
    expect(store.cc_campaign_save).toBeDefined();
  });

  it("still clears a save no migration can read", () => {
    store.cc_campaign_save = JSON.stringify({ version: 0, act: 1, level: 0 });
    expect(loadCampaignData()).toBeNull();
    expect(store.cc_campaign_save).toBeUndefined();
  });

  it("reports where Continue will land", () => {
    store.cc_campaign_save = JSON.stringify(v1(3, 6));
    expect(getSaveInfo()).toEqual([{ mode: "campaign", act: 4, level: 1, score: 4200, ngPlusCycle: 0 }]);
  });

  it("writes new saves as v2", () => {
    const player = { x: 1, y: 1, angle: 0, serialize: () => ({ health: 50 }) };
    saveCampaign(2, 3, 0, player, "normal", [], [], 0);
    expect(JSON.parse(store.cc_campaign_save).version).toBe(CAMPAIGN_SAVE_VERSION);
    expect(loadCampaignData().migrated).toBeUndefined();
  });
});

describe("CampaignManager on a migrated save", async () => {
  const { CampaignManager } = await import("../../js/campaign-manager.js");
  const { getDifficultyMultipliers } = await import("../../src/systems/spawner.js");

  const store = {};
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("performance", { now: () => Date.now() });
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal("localStorage", {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function makeGame() {
    const aria = [];
    const g = {
      mode: "menu",
      settings: { difficulty: "normal" },
      achievementStats: {},
      player: {
        x: 0, y: 0, angle: 0, alive: true, weapons: [], health: 10, maxHealth: 100,
        ammo: 0, reset() {}, deserialize() {}, serialize: () => ({}),
      },
      entities: [],
      killedEnemies: 0,
      map: { grid: [] },
      time: 0,
      glitchEffect: 0,
      getDifficultyMultipliers: () => getDifficultyMultipliers(1),
      killStreakSystem: { reset() {} },
      squadComms: null,
      ariaComms: null,
      queueAriaMessage: (k) => aria.push(k),
      renderer: { applyActPalette() {} },
      audio: { startTrack() {}, startAmbient() {}, stopMusic() {}, roundComplete() {} },
      lockPointer() {}, unlockPointer() {},
      saveAchievements() {}, checkAchievements() {},
      startCutscene: (key, cb) => cb?.(),
      hasCutsceneScript: () => true,
    };
    return { g, aria, cm: new CampaignManager(g) };
  }

  it("restarts the act and has ARIA say why, once", () => {
    store.cc_campaign_save = JSON.stringify(v1(3, 4, { ngPlusCycle: 1 }));
    const { g, aria, cm } = makeGame();
    expect(cm.load()).toBe(true);
    expect([cm.act, cm.level, cm.ngPlusCycle]).toEqual([4, 0, 1]);
    expect(g.mode).toBe("campaign");
    expect(aria.filter((k) => k === "storyRestructured")).toHaveLength(1);
    // The level start wrote a fresh v2 save without the flag.
    const saved = JSON.parse(store.cc_campaign_save);
    expect([saved.version, saved.act, saved.level, saved.migrated]).toEqual([CAMPAIGN_SAVE_VERSION, 4, 0, undefined]);

    const again = makeGame();
    expect(again.cm.load()).toBe(true);
    expect(again.aria).not.toContain("storyRestructured");
  });

  it("says nothing when an Act I save carried over whole", () => {
    store.cc_campaign_save = JSON.stringify(v1(1, 2, { mapGrid: undefined, entityStates: undefined }));
    const { aria, cm } = makeGame();
    expect(cm.load()).toBe(true);
    expect([cm.act, cm.level]).toEqual([1, 2]);
    expect(aria).not.toContain("storyRestructured");
  });
});
