import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// CampaignManager walks whatever ACTS holds: briefings, boss kills, act
// transitions and victory come from the table, not from act numbers.

vi.mock("../../js/analytics.js", () => ({ trackEvent: () => {} }));

const { CampaignManager } = await import("../../js/campaign-manager.js");
const { ACTS, NG_PLUS } = await import("../../src/data/campaign/acts.js");
const { getDifficultyMultipliers } = await import("../../src/systems/spawner.js");
const { GameState } = await import("../../src/types.js");

function makeCampaign({ scripts = () => true } = {}) {
  const scenes = [];
  const aria = [];
  const g = {
    mode: "campaign",
    settings: { difficulty: "normal" },
    achievementStats: {},
    player: {
      x: 0, y: 0, angle: 0, alive: true, weapons: [], health: 10, maxHealth: 100,
      ammo: 0, reset() {}, deserialize() {},
    },
    entities: [],
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
    startCutscene: (key, cb) => { scenes.push(key); cb?.(); },
    hasCutsceneScript: scripts,
  };
  const cm = new CampaignManager(g);
  cm.save = () => {};
  cm.clearSave = () => {};
  return { g, cm, scenes, aria };
}

describe("CampaignManager on ACTS", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("performance", { now: () => Date.now() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("plays each level's briefing before loading it", () => {
    for (const act of ACTS) {
      act.levels.forEach((entry, level) => {
        if (level === 0) return;
        const { cm, scenes } = makeCampaign();
        cm.act = act.id;
        cm.level = level - 1;
        cm.nextLevel();
        expect(scenes, `${act.id}.${level}`).toEqual(entry.briefing ?? []);
        expect(cm.level).toBe(level);
      });
    }
  });

  it("counts levels cleared across the campaign, not within the act", () => {
    const { g, cm } = makeCampaign();
    cm.act = 2;
    cm.level = 0;
    cm.nextLevel();
    expect(g.achievementStats.campaignLevelsCleared).toBe(ACTS[0].levels.length + 1);
  });

  it("skips a briefing this build has no script for", () => {
    const { g, cm, scenes } = makeCampaign({ scripts: () => false });
    cm.act = 1;
    cm.level = 0;
    cm.nextLevel();
    expect(scenes).toEqual([]);
    expect(g.state).toBe(GameState.PLAYING);
    expect(cm.level).toBe(1);
  });

  it("opens the next act at level 0 behind this act's outro and the next act's intro", () => {
    ACTS.slice(0, -1).forEach((act, i) => {
      const next = ACTS[i + 1];
      const { g, cm, scenes } = makeCampaign();
      cm.act = act.id;
      cm.level = act.levels.length - 1;
      cm.handleBossKill();
      expect(scenes).toEqual([...act.outro, ...next.intro]);
      expect([cm.act, cm.level]).toEqual([next.id, 0]);
      expect(g.state).toBe(GameState.PLAYING);
      expect(g.player.health).toBe(g.player.maxHealth);
      expect(g.achievementStats.campaignActsCleared).toBe(act.id);
    });
  });

  it("wins after the last act's boss, offering NG+ until the true-ending cycle", () => {
    const last = ACTS.at(-1);
    const run = (ngPlusCycle) => {
      const c = makeCampaign();
      c.cm.act = last.id;
      c.cm.level = last.levels.length - 1;
      c.cm.ngPlusCycle = ngPlusCycle;
      c.cm.handleBossKill();
      return c;
    };
    const first = run(0);
    expect(first.scenes).toEqual(last.outro);
    expect(first.g.state).toBe(GameState.VICTORY);
    expect(first.cm.ngPlusPrompt).toBe(true);
    expect(first.g.achievementStats.campaignComplete).toBe(true);

    const trueEnd = run(NG_PLUS.trueEndingCycle);
    expect(trueEnd.scenes).toEqual([...last.outro, ...NG_PLUS.trueEnding]);
    expect(trueEnd.g.state).toBe(GameState.VICTORY);
    expect(trueEnd.cm.ngPlusPrompt).toBe(false);
  });

  it("shows the act's boss card and ARIA line at its boss level", () => {
    for (const act of ACTS) {
      const { g, cm, aria } = makeCampaign();
      cm.act = act.id;
      cm.level = act.levels.findIndex((l) => l.boss);
      cm.loadLevel(cm.level);
      expect(g.bossNameCard).toMatchObject(act.boss.card);
      expect(aria[0]).toBe(act.boss.aria);
      expect(g.entities.some((e) => e.enemyType === act.boss.type)).toBe(true);
    }
  });

  it("queues a level's onStart lines, NG+ ones only on NG+", () => {
    const withLines = ACTS.flatMap((a) =>
      a.levels.map((l, i) => ({ act: a.id, level: i, entry: l })),
    ).filter((s) => s.entry.onStart.length);
    expect(withLines.length).toBeGreaterThan(0);
    for (const { act, level, entry } of withLines) {
      for (const ng of [0, 1]) {
        const { cm, aria } = makeCampaign();
        cm.act = act;
        cm.level = level;
        cm.ngPlusCycle = ng;
        cm.loadLevel(level);
        vi.runAllTimers();
        const expected = entry.onStart.filter((l) => (l.minNgPlus ?? 0) <= ng).map((l) => l.aria);
        expect(aria.filter((k) => expected.includes(k)), `${act}.${level} ng${ng}`).toEqual(expected);
      }
    }
  });

  it("wins when asked to load past the act's last level", () => {
    const { g, cm } = makeCampaign();
    cm.act = 1;
    cm.loadLevel(ACTS[0].levels.length);
    expect(g.state).toBe(GameState.VICTORY);
  });
});
