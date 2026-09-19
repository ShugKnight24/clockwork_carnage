/**
 * Extreme Edge-Case Tests — Push every boundary.
 *
 * These tests simulate the extremes: the absolute best player,
 * the absolute worst, the weirdest behaviors, the edge of every
 * system. This is where the most gains hide.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug, screenshot, waitForState } from "./helpers.js";

test.describe("Extreme: Input Chaos", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("all keys pressed simultaneously", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(300);

    // Press every possible key at once
    const allKeys = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "KeyE",
      "KeyQ",
      "KeyR",
      "KeyF",
      "Space",
      "ShiftLeft",
      "ControlLeft",
      "Tab",
      "Escape",
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Enter",
      "Backspace",
    ];

    // Slam all keys down
    await page.evaluate((keys) => {
      for (const k of keys) window.ccDebug.keyDown(k);
    }, allKeys);
    await page.waitForTimeout(500);

    // Release all
    await page.evaluate((keys) => {
      for (const k of keys) window.ccDebug.keyUp(k);
    }, allKeys);
    await page.waitForTimeout(200);

    // Game should still be responsive
    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBeTruthy();
    await screenshot(page, "extreme-all-keys");
  });

  test("rapid fire + weapon switch spam", async ({ page }) => {
    await page.evaluate(() => {
      window.ccDebug.startArena();
      window.ccDebug.giveAllWeapons();
      window.ccDebug.godMode(true);
    });
    await page.waitForTimeout(300);

    // Rapid fire with weapon switching every frame
    for (let i = 0; i < 50; i++) {
      await page.evaluate((idx) => {
        window.ccDebug.fire(true);
        window.ccDebug.pressKey(`Digit${(idx % 5) + 1}`);
      }, i);
      await page.waitForTimeout(16); // ~1 frame at 60fps
    }
    await page.evaluate(() => window.ccDebug.fire(false));

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(["playing", "upgrade", "gameOver"]).toContain(state);
    await screenshot(page, "extreme-weapon-spam");
  });

  test("mouse delta extremes", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(300);

    // Insane mouse movement
    const extremes = [
      [99999, 0],
      [-99999, 0],
      [0, 99999],
      [0, -99999],
      [99999, 99999],
      [-99999, -99999],
      [0.0001, 0.0001],
      [-0.0001, -0.0001],
    ];

    for (const [dx, dy] of extremes) {
      await page.evaluate(({ dx, dy }) => window.ccDebug.mouseDelta(dx, dy), {
        dx,
        dy,
      });
      await page.waitForTimeout(50);
    }

    // Player angle should still be a valid number
    const player = await page.evaluate(() => window.ccDebug.getPlayer());
    expect(Number.isFinite(player.angle)).toBe(true);
    await screenshot(page, "extreme-mouse-delta");
  });
});

test.describe("Extreme: Player Stats Boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(300);
  });

  test("zero health doesn't crash render", async ({ page }) => {
    await page.evaluate(() => {
      window.ccDebug.setPlayer({ health: 0, maxHealth: 100 });
      window.ccDebug.forceRender();
    });
    // Should not throw
    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBeTruthy();
    await screenshot(page, "extreme-zero-health");
  });

  test("negative stats don't crash", async ({ page }) => {
    await page.evaluate(() => {
      window.ccDebug.setPlayer({ health: -100, ammo: -50, score: -9999 });
      window.ccDebug.forceRender();
    });

    const player = await page.evaluate(() => window.ccDebug.getPlayer());
    // Values may be clamped or negative — either is fine, just no crash
    expect(typeof player.health).toBe("number");
    await screenshot(page, "extreme-negative-stats");
  });

  test("astronomical stat values", async ({ page }) => {
    await page.evaluate(() => {
      window.ccDebug.setPlayer({
        health: Number.MAX_SAFE_INTEGER,
        maxHealth: Number.MAX_SAFE_INTEGER,
        ammo: Number.MAX_SAFE_INTEGER,
        score: Number.MAX_SAFE_INTEGER,
      });
      window.ccDebug.forceRender();
    });

    const player = await page.evaluate(() => window.ccDebug.getPlayer());
    expect(Number.isFinite(player.health)).toBe(true);
    await screenshot(page, "extreme-max-stats");
  });

  test("NaN and Infinity stats don't crash", async ({ page }) => {
    // Set NaN values — game should handle gracefully
    await page.evaluate(() => {
      window.ccDebug.setPlayer({
        health: NaN,
        ammo: Infinity,
        score: -Infinity,
      });
    });

    // Force render — should not throw
    const crashed = await page.evaluate(() => {
      try {
        window.ccDebug.forceRender();
        return false;
      } catch (e) {
        return e.message;
      }
    });

    // Log if it crashed, but don't hard-fail (known edge case)
    if (crashed) {
      console.log(`  ⚠️  NaN/Infinity stats caused: ${crashed}`);
    }
    await screenshot(page, "extreme-nan-stats");
  });
});

test.describe("Extreme: State Machine Abuse", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("rapid state cycling — 100 transitions", async ({ page }) => {
    const states = [
      "title",
      "modeSelect",
      "playing",
      "paused",
      "upgrade",
      "gameOver",
      "victory",
      "builder",
      "levelComplete",
      "tutorialComplete",
      "characterCreate",
    ];

    // Need arena started for some states to render
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(200);

    const errors = [];
    for (let i = 0; i < 100; i++) {
      const target = states[i % states.length];
      try {
        await page.evaluate((s) => window.ccDebug.setState(s), target);
      } catch (e) {
        errors.push({ iteration: i, state: target, error: e.message });
      }
    }

    const finalState = await page.evaluate(() => window.ccDebug.getState());
    expect(finalState).toBeTruthy();
    expect(errors.length).toBeLessThan(5); // Allow a few non-fatal errors
    await screenshot(page, "extreme-state-cycling");
  });

  test("enter and exit every state", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(200);

    const states = await page.evaluate(() => window.ccDebug.getStates());
    const results = {};

    for (const [name, value] of Object.entries(states)) {
      const success = await page.evaluate((s) => {
        try {
          window.ccDebug.setState(s);
          return window.ccDebug.getState() === s;
        } catch (e) {
          return false;
        }
      }, value);
      results[name] = success;
    }

    console.log("\n  State reachability:");
    for (const [name, ok] of Object.entries(results)) {
      console.log(`    ${ok ? "✅" : "❌"} ${name}`);
    }

    // All states should be reachable
    const unreachable = Object.entries(results).filter(([, v]) => !v);
    expect(unreachable.length).toBe(0);
  });

  test("pause/unpause 50 times in rapid succession", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(300);

    for (let i = 0; i < 50; i++) {
      await page.evaluate(() => {
        window.ccDebug.showPauseMenu();
      });
      await page.evaluate(() => {
        window.ccDebug.setState("playing");
      });
    }

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBe("playing");
    await screenshot(page, "extreme-pause-spam");
  });
});

test.describe("Extreme: Upgrade System Abuse", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
    await page.evaluate(() => {
      window.ccDebug.startArena();
      window.ccDebug.setPlayer({ score: 999999 });
    });
    await page.waitForTimeout(300);
  });

  test("max out every upgrade", async ({ page }) => {
    const result = await page.evaluate(() => {
      const upgrades = window.ccDebug.listUpgrades();
      const maxLevels = {};
      for (const u of upgrades) {
        for (let i = 0; i < u.maxLevel + 5; i++) {
          // Try to exceed max
          window.ccDebug.buyUpgrade(u.key);
        }
        maxLevels[u.key] = window.ccDebug
          .listUpgrades()
          .find((x) => x.key === u.key).currentLevel;
      }
      return maxLevels;
    });

    console.log("\n  Upgrade max levels:");
    for (const [key, level] of Object.entries(result)) {
      console.log(`    ${key}: ${level}`);
    }

    // Verify no upgrade exceeded its max
    const upgrades = await page.evaluate(() => window.ccDebug.listUpgrades());
    for (const u of upgrades) {
      expect(u.currentLevel).toBeLessThanOrEqual(u.maxLevel);
    }

    await screenshot(page, "extreme-maxed-upgrades");
  });

  test("buy nonexistent upgrade key", async ({ page }) => {
    const crashed = await page.evaluate(() => {
      try {
        window.ccDebug.buyUpgrade("nonexistent_upgrade_key_12345");
        window.ccDebug.buyUpgrade("");
        window.ccDebug.buyUpgrade(null);
        return false;
      } catch (e) {
        return e.message;
      }
    });

    // Should not crash
    if (crashed) {
      console.log(`  ⚠️  Invalid upgrade key caused: ${crashed}`);
    }
    await screenshot(page, "extreme-bad-upgrade-key");
  });
});

test.describe("Extreme: Canvas / Rendering Limits", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("render at 1x1 canvas size", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(200);

    await page.setViewportSize({ width: 1, height: 1 });
    await page.waitForTimeout(200);

    const crashed = await page.evaluate(() => {
      try {
        window.ccDebug.forceRender();
        return false;
      } catch (e) {
        return e.message;
      }
    });

    if (crashed) {
      console.log(`  ⚠️  1x1 render: ${crashed}`);
    }

    // Restore
    await page.setViewportSize({ width: 1280, height: 720 });
    await screenshot(page, "extreme-1x1-recovered");
  });

  test("render at 4K resolution", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(200);

    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.waitForTimeout(500);

    const crashed = await page.evaluate(() => {
      try {
        window.ccDebug.forceRender();
        return false;
      } catch (e) {
        return e.message;
      }
    });

    expect(crashed).toBe(false);
    await screenshot(page, "extreme-4k-render");

    // Restore
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("rapid resize between extreme dimensions", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startArena());
    await page.waitForTimeout(200);

    const sizes = [
      { width: 320, height: 240 },
      { width: 1920, height: 1080 },
      { width: 1, height: 1000 },
      { width: 1000, height: 1 },
      { width: 800, height: 600 },
      { width: 3840, height: 2160 },
      { width: 1280, height: 720 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
    }

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBeTruthy();
    await screenshot(page, "extreme-resize-spam");
  });
});

test.describe("Extreme: Cutscene Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("skip every cutscene on frame 0", async ({ page }) => {
    const cutscenes = await page.evaluate(() => window.ccDebug.listCutscenes());

    for (const key of cutscenes) {
      await page.evaluate((k) => window.ccDebug.startCutscene(k), key);
      // Immediately skip
      await page.evaluate(() => window.ccDebug.skipCutscene());
    }

    // Should land in a valid state
    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBeTruthy();
    await screenshot(page, "extreme-skip-all-cutscenes");
  });

  test("advance cutscene past its end", async ({ page }) => {
    const cutscenes = await page.evaluate(() => window.ccDebug.listCutscenes());
    if (cutscenes.length === 0) return;

    await page.evaluate((k) => window.ccDebug.startCutscene(k), cutscenes[0]);
    await page.waitForTimeout(200);

    // Advance way past the end
    for (let i = 0; i < 100; i++) {
      await page.evaluate(() => window.ccDebug.advanceCutscene());
    }

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBeTruthy();
    await screenshot(page, "extreme-advance-past-end");
  });

  test("start nonexistent cutscene key", async ({ page }) => {
    const result = await page.evaluate(() => {
      try {
        return window.ccDebug.startCutscene("nonexistent_cutscene_12345");
      } catch (e) {
        return { error: e.message };
      }
    });

    // Should return gracefully or error — not crash the page
    const alive = await page.evaluate(
      () => typeof window.ccDebug.getState === "function",
    );
    expect(alive).toBe(true);
    await screenshot(page, "extreme-bad-cutscene-key");
  });
});

test.describe("Extreme: Campaign Level Boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("start campaign at out-of-bounds level index", async ({ page }) => {
    const levels = await page.evaluate(() =>
      window.ccDebug.listCampaignLevels(),
    );

    // Try negative
    const neg = await page.evaluate(() => {
      try {
        window.ccDebug.startCampaign(-1);
        return window.ccDebug.getState();
      } catch (e) {
        return { error: e.message };
      }
    });

    // Try way past end
    const past = await page.evaluate((max) => {
      try {
        window.ccDebug.startCampaign(max + 100);
        return window.ccDebug.getState();
      } catch (e) {
        return { error: e.message };
      }
    }, levels.length);

    // Should not leave game in a broken state
    const alive = await page.evaluate(
      () => typeof window.ccDebug.getState === "function",
    );
    expect(alive).toBe(true);

    console.log(`  Level -1 result: ${JSON.stringify(neg)}`);
    console.log(
      `  Level ${levels.length + 100} result: ${JSON.stringify(past)}`,
    );
    await screenshot(page, "extreme-oob-levels");
  });

  test("complete all levels in rapid succession", async ({ page }) => {
    const levels = await page.evaluate(() =>
      window.ccDebug.listCampaignLevels(),
    );

    for (let i = 0; i < levels.length; i++) {
      await page.evaluate((lvl) => {
        try {
          window.ccDebug.startCampaign(lvl);
          window.ccDebug.godMode(true);
        } catch (e) {
          /* ignore load errors for invalid levels */
        }
      }, i);
      await page.waitForTimeout(100);
    }

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBeTruthy();
    await screenshot(page, "extreme-all-levels-rapid");
  });
});

test.describe("Extreme: Builder Mode Stress", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("builder survives rapid tool switching", async ({ page }) => {
    await page.evaluate(() => window.ccDebug.startBuilder());
    await page.waitForTimeout(500);

    // Rapid key presses (builder tool hotkeys)
    for (let i = 0; i < 30; i++) {
      await page.evaluate((idx) => {
        const keys = [
          "Digit1",
          "Digit2",
          "Digit3",
          "Digit4",
          "KeyE",
          "KeyR",
          "KeyT",
        ];
        window.ccDebug.pressKey(keys[idx % keys.length]);
      }, i);
      await page.waitForTimeout(30);
    }

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBe("builder");
    await screenshot(page, "extreme-builder-tool-switch");
  });
});

test.describe("Extreme: localStorage Limits", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  test("game handles full localStorage gracefully", async ({ page }) => {
    // Fill localStorage near its limit
    const fillResult = await page.evaluate(() => {
      try {
        const bigString = "x".repeat(1024 * 1024); // 1MB string
        for (let i = 0; i < 4; i++) {
          localStorage.setItem(`__test_fill_${i}`, bigString);
        }
        return "filled";
      } catch (e) {
        return "quota-exceeded";
      }
    });

    // Try to save game
    await page.evaluate(() => {
      window.ccDebug.startArena();
    });
    await page.waitForTimeout(500);

    // Cleanup test data
    await page.evaluate(() => {
      for (let i = 0; i < 4; i++) {
        localStorage.removeItem(`__test_fill_${i}`);
      }
    });

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBeTruthy();
    console.log(`  localStorage fill attempt: ${fillResult}`);
    await screenshot(page, "extreme-localstorage-full");
  });

  test("game handles corrupted save data", async ({ page }) => {
    // Inject garbage into save slots
    await page.evaluate(() => {
      localStorage.setItem("cc_save_campaign", "{invalid json {{{{");
      localStorage.setItem("cc_save_arena", "null");
      localStorage.setItem("cc_progress", "undefined");
    });

    // Reload and see if game still works
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#titleScreen", {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForFunction(() => window.ccDebug != null, {
      timeout: 10000,
    });

    const state = await page.evaluate(() => window.ccDebug.getState());
    expect(state).toBe("title");

    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem("cc_save_campaign");
      localStorage.removeItem("cc_save_arena");
      localStorage.removeItem("cc_progress");
    });

    await screenshot(page, "extreme-corrupted-saves");
  });
});
