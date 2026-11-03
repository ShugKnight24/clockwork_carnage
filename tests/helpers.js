/**
 * Shared Playwright helpers for Clockwork Carnage tests.
 */

/**
 * Navigate to the game and wait for it to be ready.
 * Returns the page object.
 *
 * Adaptive quality is held still unless `adaptiveQuality` is set. On a runner
 * with no GPU the game draws a few frames a second, and the governor would
 * shrink the frame and drop effects partway through a test.
 */
export async function loadGame(page, { adaptiveQuality = false } = {}) {
  // Pre-set analytics consent so the modal doesn't block interactions
  await page.addInitScript(() => {
    localStorage.setItem("cc_analytics_consent", "declined");
  });
  if (!adaptiveQuality) await page.addInitScript(holdQuality);
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
 * Init script: once the game exists, its quality governor never steps.
 * Presets and Battery Saver still set the scale directly.
 */
export function holdQuality() {
  const t = setInterval(() => {
    const q = window.ccDebug?.game?.quality;
    if (!q) return;
    q.adjust = () => false;
    clearInterval(t);
  }, 50);
}

/**
 * Let the game play `ms` of game time. Use this, not page.waitForTimeout,
 * wherever a test waits for something to happen in play: a frame advances
 * game time by at most 33 ms, so on a runner drawing a few frames a second
 * a wall-clock wait ends long before the game has got there.
 */
export function play(page, ms) {
  return page.evaluate((ms) => window.ccDebug.waitGameTime(ms), ms);
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
