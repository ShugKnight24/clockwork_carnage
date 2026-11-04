/**
 * Bot Tests — Run in-browser bot profiles via Playwright.
 * Validates game mechanics end-to-end in a real browser.
 *
 * The PR tier (npm run test:pr) runs the data, maps, balance, states and
 * saveload groups: the validation suites and "states: extremes" below. The
 * bot runs and the upgrade/perf suites take minutes and are tagged @nightly.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug, screenshot } from "./helpers.js";

/**
 * Run a bot and fail with what it said went wrong (its ❌ lines and any page
 * error), not just "expected true".
 */
async function runBot(page, name) {
  const said = [];
  const listen = (m) => {
    const t = m.text();
    if (/❌|Error/.test(t)) said.push(t.slice(0, 400));
  };
  const crashed = (e) => said.push(`page error: ${e.message}`);
  page.on("console", listen);
  page.on("pageerror", crashed);
  const result = await page.evaluate((n) => window.ccTest.bot(n), name);
  page.off("console", listen);
  page.off("pageerror", crashed);
  expect(result, `${name} bot:\n${said.slice(0, 10).join("\n")}`).toBe(true);
}

test.describe("Bot Profiles", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
    // The test runner is imported after the debug bridge (js/main.js), so
    // loadGame's ccDebug wait does not cover it.
    await page.waitForFunction(() => window.ccTest != null, { timeout: 10_000 });
  });

  test("data validation suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("data"));
    expect(result).toBe(true);
  });

  test("map reachability suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("maps"));
    expect(result).toBe(true);
  });

  test("balance sanity suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("balance"));
    expect(result).toBe(true);
  });

  test("state transitions suite passes", async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("states"));
    expect(result).toBe(true);
  });

  test("save/load round-trip suite passes", async ({ page }) => {
    const result = await page.evaluate(() =>
      window.ccTest.validate("saveload"),
    );
    expect(result).toBe(true);
  });

  test("upgrade interaction suite passes", { tag: "@nightly" }, async ({ page }) => {
    const result = await page.evaluate(() =>
      window.ccTest.validate("upgrades"),
    );
    expect(result).toBe(true);
  });

  test("performance benchmark suite passes", { tag: ["@nightly", "@gpu"] }, async ({ page }) => {
    const result = await page.evaluate(() => window.ccTest.validate("perf"));
    expect(result).toBe(true);
  });

  test("completionist bot completes tutorial + campaign", { tag: "@nightly" }, async ({ page }) => {
    test.setTimeout(120_000);
    await runBot(page, "completionist");
    await screenshot(page, "bot-completionist-end");
  });

  test("speedrunner bot completes campaign level 0", { tag: "@nightly" }, async ({ page }) => {
    test.setTimeout(60_000);
    await runBot(page, "speedrunner");
    await screenshot(page, "bot-speedrunner-end");
  });

  test("iron man bot survives 5 arena rounds", { tag: "@nightly" }, async ({ page }) => {
    test.setTimeout(120_000);
    await runBot(page, "ironman");
    await screenshot(page, "bot-ironman-end");
  });

  test("cadet bot plays every prologue step to its goal", { tag: "@nightly" }, async ({ page }) => {
    test.setTimeout(240_000);
    await runBot(page, "cadet");
    await screenshot(page, "bot-cadet-end");
  });

  test("careful bot clears level 0 with light damage", { tag: "@nightly" }, async ({ page }) => {
    test.setTimeout(60_000);
    await runBot(page, "nodamage");
    await screenshot(page, "bot-nodamage-end");
  });

  test("arena endurance bot survives 10 rounds", { tag: "@nightly" }, async ({ page }) => {
    test.setTimeout(180_000);
    await runBot(page, "endurance");
    await screenshot(page, "bot-endurance-end");
  });
});

/**
 * The state machine and its inputs pushed past what a player would do: mashed
 * keys, absurd stats, out-of-range levels, a full or corrupt store. Each one
 * has to leave a game that still answers. Merged from extremes.spec.js and the
 * rage-quitter journey of user-journeys.spec.js.
 */
test.describe("states: extremes", () => {
  test.beforeEach(async ({ page }) => {
    await loadGame(page);
  });

  /** forceRender's error message, or null when it draws. */
  const renderError = (page) =>
    page.evaluate(() => {
      try {
        window.ccDebug.forceRender();
        return null;
      } catch (e) {
        return e.message;
      }
    });

  test("every state enters, and cycling and pausing stay whole", async ({ page }) => {
    await debug(page, "startArena");
    await page.waitForTimeout(200);

    const unreachable = await page.evaluate(() => {
      const out = [];
      for (const [name, s] of Object.entries(window.ccDebug.getStates())) {
        try {
          window.ccDebug.setState(s);
          if (window.ccDebug.getState() !== s) out.push(name);
        } catch (e) {
          out.push(`${name}: ${e.message}`);
        }
      }
      return out;
    });
    expect(unreachable).toEqual([]);

    const cycleErrors = await page.evaluate(() => {
      const states = ["title", "modeSelect", "playing", "paused", "upgrade", "gameOver", "victory", "builder", "levelComplete", "tutorialComplete", "characterCreate"];
      let errors = 0;
      for (let i = 0; i < 100; i++) {
        try {
          window.ccDebug.setState(states[i % states.length]);
        } catch {
          errors++;
        }
      }
      return errors;
    });
    expect(cycleErrors).toBeLessThan(5);

    await debug(page, "startArena");
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      for (let i = 0; i < 50; i++) {
        window.ccDebug.showPauseMenu();
        window.ccDebug.setState("playing");
      }
    });
    expect(await debug(page, "getState")).toBe("playing");
  });

  test("input chaos leaves a finite aim and a live state", async ({ page }) => {
    await page.evaluate(() => {
      window.ccDebug.startArena();
      window.ccDebug.giveAllWeapons();
      window.ccDebug.godMode(true);
    });
    await page.waitForTimeout(300);

    const allKeys = [
      "KeyW", "KeyA", "KeyS", "KeyD", "KeyE", "KeyQ", "KeyR", "KeyF", "Space", "ShiftLeft", "ControlLeft", "Tab",
      "Escape", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Enter", "Backspace",
    ];
    await page.evaluate((keys) => keys.forEach((k) => window.ccDebug.keyDown(k)), allKeys);
    await page.waitForTimeout(500);
    await page.evaluate((keys) => keys.forEach((k) => window.ccDebug.keyUp(k)), allKeys);
    await page.waitForTimeout(200);
    expect(await debug(page, "getState")).toBeTruthy();

    await page.evaluate(() => {
      window.ccDebug.setState("playing");
      window.ccDebug.godMode(true);
    });
    for (let i = 0; i < 50; i++) {
      await page.evaluate((idx) => {
        window.ccDebug.fire(true);
        window.ccDebug.pressKey(`Digit${(idx % 5) + 1}`);
      }, i);
      await page.waitForTimeout(16);
    }
    await debug(page, "fire", false);
    expect(["playing", "paused", "upgrade", "gameOver"]).toContain(await debug(page, "getState"));

    for (const [dx, dy] of [[99999, 0], [-99999, 0], [0, 99999], [0, -99999], [99999, 99999], [-99999, -99999], [0.0001, 0.0001], [-0.0001, -0.0001]]) {
      await debug(page, "mouseDelta", dx, dy);
      await page.waitForTimeout(50);
    }
    const player = await debug(page, "getPlayer");
    expect(Number.isFinite(player.angle)).toBe(true);
    await debug(page, "clearInput");
  });

  test("mashing Enter, Space and Escape on game over lands in a known state", async ({ page }) => {
    await debug(page, "startArena");
    await page.waitForTimeout(300);
    await debug(page, "setState", "gameOver");
    await page.waitForTimeout(300);
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => {
        window.ccDebug.pressKey("Enter");
        window.ccDebug.pressKey("Space");
        window.ccDebug.pressKey("Escape");
      });
      await page.waitForTimeout(80);
    }
    const known = Object.values(await debug(page, "getStates"));
    expect(known).toContain(await debug(page, "getState"));
  });

  test("zero, negative and huge stats render without throwing", async ({ page }) => {
    await debug(page, "startArena");
    await page.waitForTimeout(300);
    await debug(page, "setPlayer", { health: 0, maxHealth: 100 });
    expect(await renderError(page)).toBe(null);
    await debug(page, "setPlayer", { health: -100, ammo: -50, score: -9999 });
    expect(await renderError(page)).toBe(null);
    expect(typeof (await debug(page, "getPlayer")).health).toBe("number");
    const big = Number.MAX_SAFE_INTEGER;
    await debug(page, "setPlayer", { health: big, maxHealth: big, ammo: big, score: big });
    expect(await renderError(page)).toBe(null);
    expect(Number.isFinite((await debug(page, "getPlayer")).health)).toBe(true);
  });

  test("upgrades stop at their max and an unknown key leaves the game alive", async ({ page }) => {
    await page.evaluate(() => {
      window.ccDebug.startArena();
      window.ccDebug.setPlayer({ score: 999999 });
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      for (const u of window.ccDebug.listUpgrades()) {
        for (let i = 0; i < u.maxLevel + 5; i++) window.ccDebug.buyUpgrade(u.key);
      }
    });
    for (const u of await debug(page, "listUpgrades")) {
      expect(u.currentLevel, u.key).toBeLessThanOrEqual(u.maxLevel);
    }
    // ccDebug.buyUpgrade throws on a key it does not know (reads maxLevel of
    // undefined). That is the debug bridge, not the shop; what matters is
    // that the game carries on.
    await page.evaluate(() => {
      for (const key of ["nonexistent_upgrade_key_12345", "", null]) {
        try {
          window.ccDebug.buyUpgrade(key);
        } catch {
          /* see above */
        }
      }
    });
    expect(await debug(page, "getState")).toBeTruthy();
  });

  test("renders at 4K and survives extreme resizes", async ({ page }) => {
    await debug(page, "startArena");
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.waitForTimeout(500);
    expect(await renderError(page)).toBe(null);
    for (const size of [
      { width: 1, height: 1 },
      { width: 320, height: 240 },
      { width: 1, height: 1000 },
      { width: 1000, height: 1 },
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
    }
    expect(await renderError(page)).toBe(null);
    expect(await debug(page, "getState")).toBeTruthy();
  });

  test("cutscenes skip on frame 0, advance past the end, and ignore unknown keys", async ({ page }) => {
    const cutscenes = await debug(page, "listCutscenes");
    for (const key of cutscenes) {
      await page.evaluate((k) => {
        window.ccDebug.startCutscene(k);
        window.ccDebug.skipCutscene();
      }, key);
    }
    expect(await debug(page, "getState")).toBeTruthy();

    if (cutscenes.length) {
      await debug(page, "startCutscene", cutscenes[0]);
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        for (let i = 0; i < 100; i++) window.ccDebug.advanceCutscene();
      });
      expect(await debug(page, "getState")).toBeTruthy();
    }

    await page.evaluate(() => {
      try {
        window.ccDebug.startCutscene("nonexistent_cutscene_12345");
      } catch {
        /* refusing is fine; the page has to survive it */
      }
    });
    expect(await page.evaluate(() => typeof window.ccDebug.getState)).toBe("function");
  });

  test("an out-of-range level and every level in quick succession leave a live game", async ({ page }) => {
    const levels = await debug(page, "listCampaignLevels");
    await page.evaluate((n) => {
      for (const lvl of [-1, n + 100]) {
        try {
          window.ccDebug.startCampaign(lvl);
        } catch {
          /* refusing is fine */
        }
      }
    }, levels.length);
    expect(await page.evaluate(() => typeof window.ccDebug.getState)).toBe("function");

    for (let i = 0; i < levels.length; i++) {
      await page.evaluate((lvl) => {
        window.ccDebug.startCampaign(lvl);
        window.ccDebug.godMode(true);
      }, i);
      await page.waitForTimeout(100);
    }
    expect(await debug(page, "getState")).toBeTruthy();
  });

  test("the builder survives rapid tool switching", async ({ page }) => {
    await debug(page, "startBuilder");
    await page.waitForTimeout(500);
    for (let i = 0; i < 30; i++) {
      await debug(page, "pressKey", ["Digit1", "Digit2", "Digit3", "Digit4", "KeyE", "KeyR", "KeyT"][i % 7]);
      await page.waitForTimeout(30);
    }
    expect(await debug(page, "getState")).toBe("builder");
  });

  test("a full store and corrupt saves still boot to the title", async ({ page }) => {
    await page.evaluate(() => {
      try {
        const big = "x".repeat(1024 * 1024);
        for (let i = 0; i < 4; i++) localStorage.setItem(`__test_fill_${i}`, big);
      } catch {
        /* quota hit first: that is the point */
      }
    });
    await debug(page, "startArena");
    await page.waitForTimeout(500);
    expect(await debug(page, "getState")).toBeTruthy();

    await page.evaluate(() => {
      for (let i = 0; i < 4; i++) localStorage.removeItem(`__test_fill_${i}`);
      localStorage.setItem("cc_save_campaign", "{invalid json {{{{");
      localStorage.setItem("cc_save_arena", "null");
      localStorage.setItem("cc_progress", "undefined");
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#titleScreen", { state: "visible", timeout: 10_000 });
    await page.waitForFunction(() => window.ccDebug != null, { timeout: 10_000 });
    expect(await debug(page, "getState")).toBe("title");
  });
});
