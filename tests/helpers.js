/**
 * Shared Playwright helpers for Clockwork Carnage tests.
 */

/**
 * Navigate to the game and wait for it to be ready.
 * Returns the page object.
 */
export async function loadGame(page) {
  // Pre-set analytics consent so the modal doesn't block interactions
  await page.addInitScript(() => {
    localStorage.setItem("cc_analytics_consent", "declined");
  });
  await page.goto("/", { waitUntil: "networkidle" });
  // Wait for the game to initialize (title screen visible)
  await page.waitForSelector("#titleScreen", {
    state: "visible",
    timeout: 10_000,
  });
  // Wait for the debug bridge to be available
  await page.waitForFunction(() => window.ccDebug != null, { timeout: 10_000 });
  return page;
}

/**
 * Call a debug bridge method on the page.
 */
export async function debug(page, method, ...args) {
  return page.evaluate(({ method, args }) => window.ccDebug[method](...args), {
    method,
    args,
  });
}

/**
 * Take a labeled screenshot and save to screenshots/ directory.
 */
export async function screenshot(page, name) {
  // Force a render frame so the canvas is up to date
  await page.evaluate(() => {
    try {
      if (window.ccDebug) window.ccDebug.forceRender();
    } catch (e) {
      /* render may fail in edge-case states — still capture screenshot */
    }
  });
  // Small delay for canvas compositing
  await page.waitForTimeout(100);
  await page.screenshot({
    path: `screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Click the title screen to enter mode select.
 */
export async function enterModeSelect(page) {
  await page.click("#titleScreen");
  await page.waitForSelector("#modeSelect", {
    state: "visible",
    timeout: 5000,
  });
}

/**
 * Wait for a specific game state via the debug bridge.
 */
export async function waitForState(page, state, timeoutMs = 10_000) {
  await page.waitForFunction(
    (expectedState) => window.ccDebug?.getState() === expectedState,
    state,
    { timeout: timeoutMs },
  );
}

/**
 * Wait N animation frames on the page.
 */
export async function waitFrames(page, n) {
  await page.evaluate((frames) => window.ccDebug.waitFrames(frames), n);
}
