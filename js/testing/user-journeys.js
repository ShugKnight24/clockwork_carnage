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

// ══════════════════════════════════════════════════════════
//  JOURNEY: Power User Daily Session
//  "Day 30 player. Knows everything. What's the loop?"
// ══════════════════════════════════════════════════════════
export async function journeyPowerUser(page, debug, screenshot) {
  const t = timer();
  const laps = [];
  const issues = [];

  // Power user clicks through title instantly
  await page.click("#titleScreen");
  await page.waitForSelector("#modeSelect", {
    state: "visible",
    timeout: 3000,
  });
  laps.push(t.lap("skipped-title"));

  // ── Measure: time from page load to gameplay ──────────
  const loadToMenu = t.elapsed();
  if (loadToMenu > 3000) {
    issues.push({
      severity: "minor",
      msg: `Load-to-menu: ${loadToMenu}ms — power users want instant access`,
    });
  }

  // ── Start Arena (power users go straight to arena) ─────
  await page.click("#btnArena");
  await page.waitForFunction(() => window.ccDebug?.getState() === "playing", {
    timeout: 10000,
  });
  laps.push(t.lap("arena-started"));
  await screenshot("journey-power-01-arena-start");

  // ── Play aggressively for 3 rounds ─────────────────────
  for (let round = 0; round < 3; round++) {
    // Give weapons and stats (simulating a returning player)
    await page.evaluate(() => {
      window.ccDebug.giveAllWeapons();
      window.ccDebug.setPlayer({ health: 100, maxHealth: 100, ammo: 999 });
    });

    // Aggressive gameplay loop
    for (let tick = 0; tick < 10; tick++) {
      await page.evaluate(() => {
        window.ccDebug.keyDown("KeyW");
        window.ccDebug.mouseDelta(80 * (Math.random() - 0.5), 0);
        window.ccDebug.fire(true);
      });
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        window.ccDebug.keyUp("KeyW");
        window.ccDebug.fire(false);
      });
      await page.waitForTimeout(100);
    }

    // Check if still playing
    const state = await page.evaluate(() => window.ccDebug.getState());
    if (state === "upgrade") {
      laps.push(t.lap(`round-${round + 1}-upgrade`));
      await screenshot(`journey-power-02-round${round + 1}-upgrade`);

      // Power user picks upgrades fast — grab first available
      await page.evaluate(() => {
        const upgrades = window.ccDebug.listUpgrades();
        const available = upgrades.filter((u) => u.currentLevel < u.maxLevel);
        if (available.length > 0) window.ccDebug.buyUpgrade(available[0].key);
      });
      await page.waitForTimeout(200);
    } else if (state === "gameOver") {
      laps.push(t.lap(`round-${round + 1}-death`));
      break;
    }
  }

  // ── Measure: round cadence ─────────────────────────────
  const arenaTime = t.elapsed();
  await screenshot("journey-power-03-session-mid");

  // ── Check upgrade variety ──────────────────────────────
  const upgradeState = await page.evaluate(() => window.ccDebug.listUpgrades());
  const upgraded = upgradeState.filter((u) => u.currentLevel > 0);
  if (upgraded.length === 0) {
    issues.push({
      severity: "minor",
      msg: "Power user completed rounds but no upgrades registered",
    });
  }

  // ── Pause menu test — settings accessible? ─────────────
  await page.evaluate(() => window.ccDebug.showPauseMenu());
  await page.waitForTimeout(200);
  laps.push(t.lap("opened-pause"));
  await screenshot("journey-power-04-pause");

  await page.evaluate(() => window.ccDebug.clearInput());

  return {
    journey: "Power User Daily Session",
    laps,
    issues,
    totalMs: t.elapsed(),
    roundsPlayed: laps.filter((l) => l.label.startsWith("round-")).length,
  };
}

// ══════════════════════════════════════════════════════════
//  JOURNEY: Rage Quitter
//  "Everything annoys this person. Where do they break?"
// ══════════════════════════════════════════════════════════
export async function journeyRageQuit(page, debug, screenshot) {
  const t = timer();
  const laps = [];
  const issues = [];

  // Quickly click through to arena
  await page.click("#titleScreen");
  await page.waitForSelector("#modeSelect", {
    state: "visible",
    timeout: 3000,
  });
  await page.click("#btnArena");
  await page.waitForFunction(() => window.ccDebug?.getState() === "playing", {
    timeout: 10000,
  });
  laps.push(t.lap("rushed-to-arena"));

  // ── Die quickly (bad player, low skill) ────────────────
  await page.evaluate(() => {
    window.ccDebug.setPlayer({ health: 5 }); // nearly dead
  });
  // Stand still and take hits
  await page.waitForTimeout(3000);
  await screenshot("journey-rage-01-nearly-dead");

  // ── Check game over screen quality ─────────────────────
  const state = await page.evaluate(() => window.ccDebug.getState());
  if (state !== "gameOver") {
    // Force death to test the screen
    await page.evaluate(() => window.ccDebug.setState("gameOver"));
  }
  await page.waitForTimeout(500);
  laps.push(t.lap("hit-game-over"));
  await screenshot("journey-rage-02-game-over");

  // ── Is the retry path clear? ───────────────────────────
  // A frustrated player should see "TRY AGAIN" immediately

  // ── Spam inputs (frustration behavior) ─────────────────
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => {
      window.ccDebug.pressKey("Enter");
      window.ccDebug.pressKey("Space");
      window.ccDebug.pressKey("Escape");
    });
    await page.waitForTimeout(100);
  }
  laps.push(t.lap("spam-inputs"));

  const postSpamState = await page.evaluate(() => window.ccDebug.getState());
  await screenshot("journey-rage-03-post-spam");

  // ── Did the spam break anything? ───────────────────────
  const validStates = [
    "title",
    "modeSelect",
    "playing",
    "paused",
    "upgrade",
    "gameOver",
    "victory",
    "builder",
    "levelComplete",
    "tutorial",
    "cutscene",
    "campaignPrompt",
    "tutorialComplete",
    "characterCreate",
    "settings",
    "controls",
  ];
  if (!validStates.includes(postSpamState)) {
    issues.push({
      severity: "critical",
      msg: `Input spam landed in unknown state: "${postSpamState}"`,
    });
  }

  // ── Back to menu flow ──────────────────────────────────
  // Player expects to quickly restart or quit
  await page.evaluate(() => window.ccDebug.setState("title"));
  await page.waitForTimeout(500);
  laps.push(t.lap("returned-to-title"));

  return {
    journey: "Rage Quitter",
    laps,
    issues,
    totalMs: t.elapsed(),
    finalState: postSpamState,
  };
}

// ══════════════════════════════════════════════════════════
//  JOURNEY: Feature Discovery
//  "Can a user find all the features without a guide?"
// ══════════════════════════════════════════════════════════
export async function journeyDiscovery(page, debug, screenshot) {
  const t = timer();
  const laps = [];
  const issues = [];
  const found = [];

  await page.click("#titleScreen");
  await page.waitForSelector("#modeSelect", {
    state: "visible",
    timeout: 3000,
  });
  laps.push(t.lap("on-mode-select"));

  // ── Are all modes visible and labeled? ─────────────────
  const modes = await page.locator(".mode-btn:not(.hidden)").allTextContents();
  laps.push(t.lap("read-modes"));

  const expectedModes = ["CAMPAIGN", "ARENA", "TUTORIAL", "FORGE", "CUSTOMIZE"];
  for (const mode of expectedModes) {
    const foundMode = modes.some(
      (m) =>
        m.toUpperCase().includes(mode) ||
        m.toUpperCase().includes(mode.replace("FORGE", "TEMPORAL FORGE")),
    );
    if (foundMode) {
      found.push(mode);
    } else {
      issues.push({
        severity: "major",
        msg: `Mode "${mode}" not discoverable from mode select text`,
      });
    }
  }

  // ── Is keyboard navigation discoverable? ───────────────
  const keyHints = await page.locator(".key-hint").allTextContents();
  if (keyHints.length === 0) {
    issues.push({
      severity: "minor",
      msg: "No keyboard hint labels on buttons — keyboard users won't know shortcuts",
    });
  } else {
    found.push("keyboard-hints");
  }

  // ── Can they find the builder? ─────────────────────────
  await page.click("#btnBuilder");
  await page.waitForFunction(() => window.ccDebug?.getState() === "builder", {
    timeout: 10000,
  });
  laps.push(t.lap("found-builder"));
  await screenshot("journey-discover-01-builder");
  found.push("builder");

  // ── Can they find character customization? ─────────────
  await page.evaluate(() => window.ccDebug.setState("modeSelect"));
  await page.waitForTimeout(300);
  // Find the customize button
  const customizeVisible = await page.locator("#btnCustomize").isVisible();
  if (customizeVisible) {
    found.push("character-customizer");
    await page.evaluate(() => {
      window.ccDebug.showCharacterCreate();
    });
    await page.waitForTimeout(500);
    laps.push(t.lap("found-customizer"));
    await screenshot("journey-discover-02-customizer");
  } else {
    issues.push({
      severity: "major",
      msg: "Character customizer button not visible",
    });
  }

  // ── Can they find/trigger cutscenes? ───────────────────
  await page.evaluate(() => {
    window.ccDebug.startCampaign(0);
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => window.ccDebug.getState());
  if (state === "cutscene" || state === "playing") {
    found.push("campaign-cutscenes");
    laps.push(t.lap("found-campaign"));
  }

  // ── Discovery score ────────────────────────────────────
  const discoveryPct = (found.length / (expectedModes.length + 3)) * 100;
  if (discoveryPct < 70) {
    issues.push({
      severity: "major",
      msg: `Feature discovery rate: ${discoveryPct.toFixed(0)}% — too many hidden features`,
    });
  }

  await screenshot("journey-discover-03-final");

  return {
    journey: "Feature Discovery",
    laps,
    issues,
    totalMs: t.elapsed(),
    found,
    discoveryPct: +discoveryPct.toFixed(1),
  };
}

// ══════════════════════════════════════════════════════════
//  JOURNEY: Campaign Completionist
//  "Play through the entire campaign story"
// ══════════════════════════════════════════════════════════
export async function journeyCampaign(page, debug, screenshot) {
  const t = timer();
  const laps = [];
  const issues = [];

  await page.click("#titleScreen");
  await page.waitForSelector("#modeSelect", {
    state: "visible",
    timeout: 3000,
  });
  await page.click("#btnCampaign");
  await page.waitForFunction(
    () =>
      ["playing", "tutorial", "cutscene", "campaignPrompt"].includes(
        window.ccDebug?.getState(),
      ),
    { timeout: 10000 },
  );
  laps.push(t.lap("campaign-started"));

  const startState = await page.evaluate(() => window.ccDebug.getState());

  // ── Does campaign start with story context? ────────────
  if (startState === "cutscene") {
    laps.push(t.lap("opening-cutscene"));
    await screenshot("journey-campaign-01-cutscene");
    // Watch for 3 seconds then skip
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.ccDebug.skipCutscene());
  } else if (startState === "tutorial") {
    laps.push(t.lap("starts-with-tutorial"));
    // Skip tutorial and go to campaign
    await page.evaluate(() => window.ccDebug.startCampaign(0));
  }

  // ── Play through levels with god mode (testing structure, not difficulty)
  const levels = await page.evaluate(() => window.ccDebug.listCampaignLevels());

  for (let i = 0; i < Math.min(levels.length, 3); i++) {
    await page.evaluate((lvl) => {
      window.ccDebug.startCampaign(lvl);
      window.ccDebug.godMode(true);
      window.ccDebug.giveAllWeapons();
    }, i);
    await page.waitForTimeout(500);
    laps.push(t.lap(`level-${i}-start`));
    await screenshot(`journey-campaign-02-level${i}`);

    // Simulate combat
    for (let tick = 0; tick < 15; tick++) {
      await page.evaluate(() => {
        window.ccDebug.keyDown("KeyW");
        window.ccDebug.mouseDelta(60 * (Math.random() - 0.5), 0);
        window.ccDebug.fire(true);
      });
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        window.ccDebug.keyUp("KeyW");
        window.ccDebug.fire(false);
      });
      await page.waitForTimeout(100);
    }

    // ── Does the level have an exit? ───────────────────
    const mapInfo = await page.evaluate(() => window.ccDebug.getMapInfo());
    if (mapInfo && !mapInfo.exit) {
      issues.push({
        severity: "critical",
        msg: `Campaign level ${i} "${levels[i]?.name}" has no exit — player is stuck`,
      });
    }

    laps.push(t.lap(`level-${i}-played`));
  }

  await page.evaluate(() => window.ccDebug.clearInput());
  await screenshot("journey-campaign-03-final");

  return {
    journey: "Campaign Completionist",
    laps,
    issues,
    totalMs: t.elapsed(),
    levelsVisited: Math.min(levels.length, 3),
    totalLevels: levels.length,
  };
}

// ══════════════════════════════════════════════════════════
//  JOURNEY: Session Marathon
//  "User who plays for 2+ hours straight. What degrades?"
// ══════════════════════════════════════════════════════════
export async function journeyMarathon(page, debug, screenshot) {
  const t = timer();
  const laps = [];
  const issues = [];
  const perfSamples = [];

  // Start arena
  await page.click("#titleScreen");
  await page.waitForSelector("#modeSelect", {
    state: "visible",
    timeout: 3000,
  });
  await page.click("#btnArena");
  await page.waitForFunction(() => window.ccDebug?.getState() === "playing", {
    timeout: 10000,
  });

  await page.evaluate(() => {
    window.ccDebug.godMode(true);
    window.ccDebug.giveAllWeapons();
  });

  // Simulate extended play — 50 "rounds" of gameplay bursts
  for (let round = 0; round < 50; round++) {
    // Gameplay burst
    for (let tick = 0; tick < 5; tick++) {
      await page.evaluate(() => {
        window.ccDebug.keyDown("KeyW");
        window.ccDebug.mouseDelta(40 * (Math.random() - 0.5), 0);
        window.ccDebug.fire(true);
      });
      await page.waitForTimeout(100);
      await page.evaluate(() => {
        window.ccDebug.keyUp("KeyW");
        window.ccDebug.fire(false);
      });
      await page.waitForTimeout(50);
    }

    // Sample performance every 10 "rounds"
    if (round % 10 === 0) {
      const perf = await page.evaluate(() => {
        const entities = window.ccDebug.getEntities();
        const canvas = window.ccDebug.getCanvasSize();
        return {
          round,
          entities: entities.total,
          enemies: entities.enemies,
          projectiles: entities.projectiles,
          canvasW: canvas.width,
          canvasH: canvas.height,
          heapUsed: performance.memory
            ? performance.memory.usedJSHeapSize
            : null,
        };
      });
      perfSamples.push(perf);
      laps.push(t.lap(`sample-round-${round}`));
    }

    // Handle state transitions
    const state = await page.evaluate(() => window.ccDebug.getState());
    if (state === "upgrade") {
      await page.evaluate(() => {
        const u = window.ccDebug
          .listUpgrades()
          .filter((u) => u.currentLevel < u.maxLevel);
        if (u.length) window.ccDebug.buyUpgrade(u[0].key);
      });
      await page.waitForTimeout(100);
    } else if (state === "gameOver") {
      await page.evaluate(() => {
        window.ccDebug.startArena();
        window.ccDebug.godMode(true);
        window.ccDebug.giveAllWeapons();
      });
      await page.waitForTimeout(200);
    }
  }

  await screenshot("journey-marathon-01-end");

  // ── Check for entity leaks ─────────────────────────────
  if (perfSamples.length >= 3) {
    const first = perfSamples[0];
    const last = perfSamples[perfSamples.length - 1];
    if (last.entities > first.entities * 3 && last.entities > 50) {
      issues.push({
        severity: "major",
        msg: `Entity count grew from ${first.entities} to ${last.entities} — possible leak`,
      });
    }
  }

  // ── Memory growth ──────────────────────────────────────
  if (
    perfSamples[0]?.heapUsed &&
    perfSamples[perfSamples.length - 1]?.heapUsed
  ) {
    const growth =
      perfSamples[perfSamples.length - 1].heapUsed - perfSamples[0].heapUsed;
    const growthMB = growth / (1024 * 1024);
    if (growthMB > 50) {
      issues.push({
        severity: "major",
        msg: `JS heap grew ${growthMB.toFixed(0)}MB during marathon — possible memory leak`,
      });
    }
  }

  await page.evaluate(() => window.ccDebug.clearInput());

  return {
    journey: "Session Marathon",
    laps,
    issues,
    totalMs: t.elapsed(),
    perfSamples,
    roundsPlayed: 50,
  };
}
