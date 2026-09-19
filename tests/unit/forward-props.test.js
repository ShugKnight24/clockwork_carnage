import { describe, it, expect } from "vitest";
import { forwardProps } from "../../src/utils/forward-props.js";

describe("forwardProps", () => {
  it("reads and writes through to the owner", () => {
    const game = { streaks: { streak: 3 } };
    forwardProps(game, "streaks", { killStreak: "streak" });
    game.killStreak = 7;
    expect(game.streaks.streak).toBe(7);
    expect(game.killStreak).toBe(7);
  });

  it("follows a replaced owner object", () => {
    const game = { streaks: { streak: 1 } };
    forwardProps(game, "streaks", { killStreak: "streak" });
    game.streaks = { streak: 9 };
    expect(game.killStreak).toBe(9);
  });

  it("works when defined on a class prototype", () => {
    class Game {
      constructor() {
        this.campaign = { level: 2 };
      }
    }
    forwardProps(Game.prototype, "campaign", { campaignLevel: "level" });
    const a = new Game();
    const b = new Game();
    a.campaignLevel = 5;
    expect(a.campaign.level).toBe(5);
    expect(b.campaignLevel).toBe(2);
  });
});
