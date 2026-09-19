/** ARIA has two presentations: the everyday bust, and an occasional hologram. */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

test("the bust is the everyday voice", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startArena");
  await debug(page, "godMode", true);
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    g.ariaComms.enable();
    g.ariaComms.queue.length = 0;
    g.ariaComms.message = null;
    g.ariaComms.queueMessage("firstKill", 0);
  });
  await page.waitForTimeout(900);
  const msg = await page.evaluate(() => {
    const m = window.ccDebug.game.ariaComms.message;
    return { projected: !!m?.projected, prominent: !!m?.prominent };
  });
  expect(msg.projected).toBe(false);
  await page.screenshot({ path: "screenshots/aria-bust.png" });
});

test("she projects herself for the beats that matter", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startArena");
  await debug(page, "godMode", true);
  const state = await page.evaluate(() => {
    const g = window.ccDebug.game;
    g.ariaComms.enable();
    g.ariaComms.queue.length = 0;
    g.ariaComms.message = null;
    g.ariaComms._lastProjection = -Infinity;
    g.ariaComms.queueMessage("bossEncounter", 0);
    const first = !!g.ariaComms.queue[0]?.projected;
    // A second one straight after must stay a voice: projections are gated.
    g.ariaComms.queueMessage("bossEncounter", 0);
    const second = !!g.ariaComms.queue[1]?.projected;
    return { first, second };
  });
  expect(state.first).toBe(true);
  expect(state.second).toBe(false);

  await page.waitForTimeout(1600);
  await page.screenshot({ path: "screenshots/aria-projection.png" });
});
