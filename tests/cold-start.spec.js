/**
 * Cold-start entry paths.
 *
 * The playtest gate warms the lazily-split chunks (meltdown/builder/cutscene)
 * before it runs, so it cannot catch code that touches one of those instances
 * before anything has loaded it. These tests drive the real UI with no warming
 * at all, which is what a returning player actually does.
 */
import { test, expect } from "@playwright/test";

const RETURNING_PLAYER = () => {
  localStorage.setItem("cc_analytics_consent", "declined");
  localStorage.setItem("cc_seen_intro_flipbook", "1");
  localStorage.setItem("cc_seen_creator_intro", "1");
  localStorage.setItem("cc_character", JSON.stringify({ name: "Agent", colorIndex: 0 }));
  localStorage.setItem(
    "cc_achievements",
    JSON.stringify({ unlocked: [], stats: { tutorialComplete: true } }),
  );
};

async function boot(page, initScript) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(initScript);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForSelector("#titleScreen", { state: "visible", timeout: 10_000 });
  await page.waitForFunction(() => window.ccDebug != null, { timeout: 10_000 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  return errors;
}

test.describe("Cold start", () => {
  // Regression: campaign-manager asked cutsceneEngine.hasScript() before any
  // cutscene had loaded the engine. A first-time player was saved by the
  // flipbook warming it; a returning player skipped the flipbook and crashed.
  test("returning player enters campaign without errors", async ({ page }) => {
    const errors = await boot(page, RETURNING_PLAYER);
    await page.click("#btnCampaign");
    await page.waitForTimeout(2500);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("first-time player enters campaign without errors", async ({ page }) => {
    const errors = await boot(page, () => {
      localStorage.setItem("cc_analytics_consent", "declined");
    });
    await page.click("#btnCampaign");
    await page.waitForTimeout(2500);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("meltdown entry without errors", async ({ page }) => {
    const errors = await boot(page, RETURNING_PLAYER);
    await page.click("#btnMeltdown");
    await page.waitForTimeout(2000);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("builder entry without errors", async ({ page }) => {
    const errors = await boot(page, RETURNING_PLAYER);
    await page.click("#btnBuilder");
    await page.waitForTimeout(2000);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("tutorial entry without errors", async ({ page }) => {
    const errors = await boot(page, RETURNING_PLAYER);
    await page.click("#btnTutorial");
    await page.waitForTimeout(2500);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
