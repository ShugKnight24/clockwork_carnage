import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveSettings,
  loadSettings,
  saveCharacter,
  loadCharacter,
  saveAchievements,
  loadAchievements,
  saveArena,
  loadArenaData,
  clearArenaSave,
  saveCampaign,
  loadCampaignData,
  clearCampaignSave,
  hasSave,
  getSaveInfo,
  hasSeenIntroMemory,
  markIntroMemorySeen,
  loadDevFlags,
  setAlwaysTutorial,
} from "../../src/core/save-system.js";

// Mock localStorage
const store = {};
const mockStorage = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = val; }),
  removeItem: vi.fn((key) => { delete store[key]; }),
};

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.stubGlobal("localStorage", mockStorage);
  vi.clearAllMocks();
});

describe("Settings", () => {
  it("save and load round-trip", () => {
    saveSettings({ volume: 0.8, fov: 90 });
    const defaults = { volume: 0.5, fov: 70 };
    loadSettings(defaults);
    expect(defaults.volume).toBe(0.8);
    expect(defaults.fov).toBe(90);
  });

  it("load ignores unknown keys", () => {
    store.cc_settings = JSON.stringify({ volume: 0.8, unknownKey: "test" });
    const defaults = { volume: 0.5 };
    loadSettings(defaults);
    expect(defaults.volume).toBe(0.8);
    expect(defaults).not.toHaveProperty("unknownKey");
  });

  it("load ignores type mismatches", () => {
    store.cc_settings = JSON.stringify({ volume: "not a number" });
    const defaults = { volume: 0.5 };
    loadSettings(defaults);
    expect(defaults.volume).toBe(0.5); // unchanged
  });

  it("handles missing localStorage gracefully", () => {
    const defaults = { volume: 0.5 };
    loadSettings(defaults);
    expect(defaults.volume).toBe(0.5);
  });
});

describe("Arena Save", () => {
  const mockPlayer = {
    serialize: () => ({ health: 80, score: 5000, weapons: [0, 1] }),
  };

  it("save and load round-trip", () => {
    saveArena(5, mockPlayer, { damage: 2 }, "normal");
    const data = loadArenaData();
    expect(data).not.toBeNull();
    expect(data.round).toBe(5);
    expect(data.health).toBe(80);
    expect(data.score).toBe(5000);
    expect(data.difficulty).toBe("normal");
  });

  it("clear removes save", () => {
    saveArena(5, mockPlayer, {}, "normal");
    clearArenaSave();
    expect(loadArenaData()).toBeNull();
  });
});

describe("Campaign Save", () => {
  const mockPlayer = {
    x: 3, y: 4, angle: 1.5,
    serialize: () => ({ health: 60, score: 10000 }),
  };

  it("save and load round-trip", () => {
    saveCampaign(3, 2, 1, mockPlayer, "hard", [[1, 0], [0, 1]], [], []);
    const data = loadCampaignData();
    expect(data).not.toBeNull();
    expect(data.level).toBe(3);
    expect(data.act).toBe(2);
    expect(data.ngPlusCycle).toBe(1);
    expect(data.playerX).toBe(3);
  });

  it("clear removes save", () => {
    saveCampaign(3, 2, 1, mockPlayer, "hard", [], [], []);
    clearCampaignSave();
    expect(loadCampaignData()).toBeNull();
  });
});

describe("hasSave / getSaveInfo", () => {
  it("no saves → false, empty array", () => {
    expect(hasSave()).toBe(false);
    expect(getSaveInfo()).toEqual([]);
  });

  it("with arena save → true", () => {
    const mockPlayer = { serialize: () => ({ score: 1000 }) };
    saveArena(3, mockPlayer, {}, "normal");
    expect(hasSave()).toBe(true);
    const info = getSaveInfo();
    expect(info).toHaveLength(1);
    expect(info[0].mode).toBe("arena");
    expect(info[0].round).toBe(3);
  });
});

describe("Achievements", () => {
  it("save and load round-trip", () => {
    const unlocked = { firstKill: true, speedRun: true };
    const stats = { totalKills: 100, totalDeaths: 5 };
    saveAchievements(unlocked, stats);

    const loadedUnlocked = {};
    const loadedStats = { totalKills: 0, totalDeaths: 0 };
    loadAchievements(loadedUnlocked, loadedStats);
    expect(loadedStats.totalKills).toBe(100);
    expect(loadedStats.totalDeaths).toBe(5);
  });
});

describe("Dev Flags", () => {
  it("default → false", () => {
    expect(loadDevFlags()).toBe(false);
  });

  it("set and read", () => {
    setAlwaysTutorial(true);
    expect(loadDevFlags()).toBe(true);
    setAlwaysTutorial(false);
    expect(loadDevFlags()).toBe(false);
  });
});

describe("Intro Memory", () => {
  it("unseen → false", () => {
    expect(hasSeenIntroMemory("cc_intro_v1")).toBe(false);
  });

  it("mark seen → true", () => {
    markIntroMemorySeen("cc_intro_v1");
    expect(hasSeenIntroMemory("cc_intro_v1")).toBe(true);
  });
});
