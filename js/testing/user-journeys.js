/**
 * Clockwork Carnage — User Journey Definitions
 *
 * Each journey simulates a real user session end-to-end through Playwright,
 * measuring timing, confusion points, and drop-off signals.
 *
 * Journeys are more than bot profiles — they simulate the HUMAN experience:
 * reading screens, hesitating, getting lost, misclicking, exploring.
 *
 * PROPRIETARY — not shipped with the game.
 */

// ── Journey measurement helpers ──────────────────────────
function timer() {
  const start = Date.now();
  return {
    elapsed() {
      return Date.now() - start;
    },
    lap(label) {
      return { label, ms: Date.now() - start };
    },
  };
}

// ══════════════════════════════════════════════════════════
//  JOURNEY: First-Time User Experience (FTUE)
//  "Someone just found this game. What happens?"
// ══════════════════════════════════════════════════════════
export async function journeyFTUE(page, debug, screenshot) {
  const t = timer();
  const laps = [];
  const issues = [];

  // ── Land on title screen ───────────────────────────────
  // A real user stares at the title for 2-5 seconds
  await page.waitForTimeout(2000);
  laps.push(t.lap("saw-title"));
  await screenshot("journey-ftue-01-title");

  // ── Can they figure out how to proceed? ────────────────
  // Check if the "CLICK OR PRESS ENTER" prompt is visible
  const prompt = await page.locator(".start-prompt").isVisible();
  if (!prompt) {
    issues.push({
      severity: "critical",
      msg: "Start prompt not visible — user has no idea what to do",
    });
  }

  // Click to proceed
  await page.click("#titleScreen");
  await page.waitForSelector("#modeSelect", {
    state: "visible",
    timeout: 5000,
  });
  laps.push(t.lap("reached-mode-select"));
  await screenshot("journey-ftue-02-mode-select");

  // ── Can they read and understand the modes? ────────────
  // Simulate reading time (3 seconds)
  await page.waitForTimeout(3000);

  // Check: is the featured campaign button visually prominent?
  const campaignBtn = page.locator("#btnCampaign");
  const isFeatured = await campaignBtn.evaluate((el) =>
    el.classList.contains("featured"),
  );
  if (!isFeatured) {
    issues.push({
      severity: "major",
      msg: "Campaign button not visually featured — unclear primary path",
    });
  }

  // Check: are button descriptions readable?
  const descriptions = await page.locator(".mode-desc").allTextContents();
  const emptyDescs = descriptions.filter((d) => d.trim().length < 5);
  if (emptyDescs.length > 0) {
    issues.push({
      severity: "minor",
      msg: `${emptyDescs.length} mode button(s) have empty/unhelpful descriptions`,
    });
  }

  // ── First game session — start tutorial ────────────────
  await page.click("#btnTutorial");
  await page.waitForFunction(() => window.ccDebug?.getState() === "tutorial", {
    timeout: 10000,
  });
  laps.push(t.lap("started-tutorial"));
  await page.waitForTimeout(500);
  await screenshot("journey-ftue-03-tutorial-start");

  // ── Can they see the tutorial instructions? ────────────
  // Force a render and check HUD has visible text
  await page.evaluate(() => window.ccDebug.forceRender());
  await page.waitForTimeout(200);

  // Play tutorial for 10 seconds — simulating a confused first-timer
  for (let i = 0; i < 5; i++) {
    // Move forward a bit
    await page.evaluate(() => {
      window.ccDebug.keyDown("KeyW");
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.ccDebug.keyUp("KeyW");
    });
    // Look around
    await page.evaluate(() => window.ccDebug.mouseDelta(100, 0));
    await page.waitForTimeout(500);
    // Try shooting
    await page.evaluate(() => {
      window.ccDebug.fire(true);
      setTimeout(() => window.ccDebug.fire(false), 200);
    });
    await page.waitForTimeout(300);
  }
  laps.push(t.lap("played-tutorial-10s"));
  await screenshot("journey-ftue-04-tutorial-mid");

  // ── Play for another 15 seconds ────────────────────────
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      window.ccDebug.keyDown("KeyW");
      window.ccDebug.mouseDelta(50 * (Math.random() - 0.5), 0);
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      window.ccDebug.keyUp("KeyW");
      window.ccDebug.fire(true);
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => window.ccDebug.fire(false));
    await page.waitForTimeout(500);
  }
  laps.push(t.lap("played-tutorial-25s"));
  await screenshot("journey-ftue-05-tutorial-progress");

  // ── Check: did the player make progress? ───────────────
  const progress = await page.evaluate(() => window.ccDebug.getProgress());
  if (progress.tutorialStep <= 1) {
    issues.push({
      severity: "major",
      msg: `Only reached tutorial step ${progress.tutorialStep} in 25s — too slow or unclear`,
    });
  }

  // ── Time to fun (TTF) measurement ─────────────────────
  const ttf = t.elapsed();
  if (ttf > 45000) {
    issues.push({
      severity: "major",
      msg: `Time-to-fun: ${(ttf / 1000).toFixed(0)}s — target is under 30s`,
    });
  }

  await page.evaluate(() => window.ccDebug.clearInput());

  return {
    journey: "First-Time User Experience",
    laps,
    issues,
    totalMs: t.elapsed(),
    tutorialProgress: progress.tutorialStep,
  };
}
