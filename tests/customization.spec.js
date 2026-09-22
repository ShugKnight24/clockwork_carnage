// Showroom customization: nested fields (badge stack, gear) edit, undo and save.
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

async function openCreator(page) {
  // Clear once per test, not on every navigation, so a reload keeps the save.
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("cc_test_cleared")) {
        localStorage.clear();
        sessionStorage.setItem("cc_test_cleared", "1");
      }
    } catch (_) {}
  });
  await loadGame(page);
  await debug(page, "showCharacterCreate");
  await page.waitForTimeout(700);
}

const room = (page) => page.locator("agent-showroom");
const tab = (page, id) => room(page).locator(`#tab-${id}`);
const opt = (page, key, idx) => room(page).locator(`.opt[data-key="${key}"][data-idx="${idx}"]`);

test("undo restores badge after symbol change", async ({ page }) => {
  await openCreator(page);
  await tab(page, "badge").click();
  await room(page).locator('[data-mode="configure"]').click();
  const before = await page.evaluate(() => JSON.stringify(window.ccDebug.game.character.badge));
  await opt(page, "badge.symbol", 3).click();
  expect(await page.evaluate(() => window.ccDebug.game.character.badge.layers[0].symbol)).toBe("star");
  await page.keyboard.press("KeyZ");
  expect(await page.evaluate(() => JSON.stringify(window.ccDebug.game.character.badge))).toBe(before);
});

test("gear choice persists across reload", async ({ page }) => {
  await openCreator(page);
  await tab(page, "gear").click();
  await opt(page, "acc.back", 1).click();
  await room(page).locator(".save").click();
  await page.reload();
  await page.waitForFunction(() => window.ccDebug?.game);
  expect(await page.evaluate(() => window.ccDebug.game.character.accessories.back)).toBe("backpack");
});

test("no console errors across the new tabs", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await openCreator(page);
  for (const id of ["gear", "badge", "suit"]) {
    await tab(page, id).click();
    await page.waitForTimeout(200);
  }
  expect(errors).toEqual([]);
});
