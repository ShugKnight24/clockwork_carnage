/**
 * The live site as players load it (tests/pages/server.mjs): GitHub Pages
 * serving master's source unbundled under /clockwork_carnage/.
 */
import { test, expect } from "@playwright/test";

/** Every failed request and page error while `run` goes. */
async function watch(page, run) {
  const failed = [];
  const errors = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  page.on("requestfailed", (r) => failed.push(`failed ${new URL(r.url()).pathname}`));
  page.on("pageerror", (e) => errors.push(String(e)));
  await run();
  return { failed, errors };
}

test("the title loads with the build stamp and no missing files", async ({ page }) => {
  const { failed, errors } = await watch(page, async () => {
    await page.goto("./");
    await expect(page.locator("#versionLabel")).toHaveText(/^v\d+\.\d+\.\d+/);
    await page.waitForLoadState("networkidle");
  });
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test("a click on the title opens the mode menu", async ({ page }) => {
  await page.goto("./");
  await page.waitForLoadState("networkidle");
  await page.locator("#titleScreen").click();
  await expect(page.locator("#modeSelect")).toBeVisible();
  await expect(page.locator("#btnCampaign")).toBeVisible();
});

test("?debug and ?bench load none of the dev tools", async ({ page }) => {
  const testing = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.includes("/js/testing/")) testing.push(r.url());
  });
  await page.goto("./?debug&bench");
  await page.waitForLoadState("networkidle");
  expect(testing).toEqual([]);
  expect(await page.evaluate(() => [typeof window.ccDebug, typeof window.ccTest, typeof window.ccProfiler])).toEqual([
    "undefined",
    "undefined",
    "undefined",
  ]);
});
