import { describe, it, expect, vi, afterEach } from "vitest";
import { ACTS, getAct, bossLevelIndex } from "../../src/data/campaign/acts.js";
import {
  createCampaignEntities,
  applyActEnemyRoster,
  getDifficultyMultipliers,
} from "../../src/systems/spawner.js";
import { getPresentSquad } from "../../src/systems/squad-comms.js";
import { AriaCommsSystem } from "../../src/systems/aria-comms.js";
import { isBossEnemy } from "../../src/systems/combat.js";

// The systems that used to branch on act numbers now read the act's row.
// These pin the reading; acts.test.js pins the values.

const diff = getDifficultyMultipliers(1);
const bossMap = {
  entities: [
    { type: "enemy", enemyType: "boss", x: 5, y: 5 },
    { type: "enemy", enemyType: "drone", x: 6, y: 6 },
  ],
};

describe("spawner reads ACTS", () => {
  it("puts each act's boss type in the map's boss slot", () => {
    for (const act of ACTS) {
      const { entities } = createCampaignEntities(bossMap, act.id, 0, diff);
      expect(entities[0].enemyType).toBe(act.boss.type);
    }
  });

  it("scales non-boss enemies by the act's scale", () => {
    const base = createCampaignEntities(bossMap, 1, 0, diff).entities[1].health;
    for (const act of ACTS) {
      const drone = createCampaignEntities(bossMap, act.id, 0, diff).entities[1];
      expect(drone.health).toBe(Math.floor((base / getAct(1).scale) * act.scale));
    }
  });

  it("swaps enemies outside the act's roster for its substitutes", () => {
    for (const act of ACTS) {
      for (const [from, to] of Object.entries(act.substitutes)) {
        const e = [{ type: "enemy", enemyType: from }];
        applyActEnemyRoster(e, act.id, diff);
        expect(e[0].enemyType, `act ${act.id}: ${from}`).toBe(to);
      }
    }
  });

  it("falls back to Act 1's roster and no swaps for an unknown act", () => {
    const e = [{ type: "enemy", enemyType: "beast" }];
    applyActEnemyRoster(e, 99, diff);
    expect(e[0].enemyType).toBe("beast");
    const { entities } = createCampaignEntities(bossMap, 99, 0, diff);
    expect(entities[0].enemyType).toBe("boss");
  });
});

describe("isBossEnemy", () => {
  it("reads the boss flag on the enemy def", () => {
    for (const act of ACTS) expect(isBossEnemy({ enemyType: act.boss.type })).toBe(true);
    expect(isBossEnemy({ enemyType: "drone" })).toBe(false);
    expect(isBossEnemy({ enemyType: "nope" })).toBe(false);
  });
});

describe("squad presence", () => {
  it("is the level's squad", () => {
    for (const act of ACTS) {
      act.levels.forEach((l, i) => expect(getPresentSquad(act.id, i)).toEqual(l.squad));
    }
  });

  it("leaves Act I alone and brings Lyra in first, at Act II level 0", () => {
    expect(getPresentSquad(1, 0)).toEqual([]);
    expect(getPresentSquad(1, bossLevelIndex(1))).toEqual([]);
    expect(getPresentSquad(2, 0)).toEqual(["lyra"]);
    expect(getPresentSquad(99, 0)).toEqual([]);
  });
});

describe("ARIA idle pool", () => {
  afterEach(() => vi.restoreAllMocks());

  const pick = (ctx, roll) => {
    const aria = new AriaCommsSystem(null);
    aria.setNarrativeContext(ctx);
    vi.spyOn(Math, "random").mockReturnValue(roll);
    return aria._pickIdlePool();
  };

  it("draws on the act's ambient pool at the same odds as before", () => {
    expect(pick({ act: 2, ambient: "act2Ambient" }, 0.3)).toBe("act2Ambient");
    expect(pick({ act: 2, ambient: "act2Ambient" }, 0.4)).toBe("idle");
    expect(pick({ act: 3, ambient: "act3Ambient" }, 0.1)).toBe("act3Ambient");
  });

  it("draws on act1Ambient in Act I, and on nothing without a pool", () => {
    expect(pick({ act: 1, ambient: getAct(1).ambient }, 0.1)).toBe("act1Ambient");
    expect(pick({ act: 1 }, 0.1)).toBe("idle");
    expect(pick({ act: 1 }, 0.6)).toBe("ariaPersonality");
  });

  it("still favours loop-awareness lines on NG+", () => {
    expect(pick({ act: 2, ngPlusCycle: 1, ambient: "act2Ambient" }, 0.1)).toBe("ngPlusAriaLoop");
  });
});
