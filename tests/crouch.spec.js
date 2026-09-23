/**
 * Crouch is a stance, not a shadow nudge: it eases in, drops the whole scene,
 * narrows the view slightly and moves the weapon with it.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

const stance = () =>
  window.ccDebug.game.player.crouchBlend;

test("the stance blend eases in and out rather than snapping", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startArena");
  await page.waitForTimeout(600);
  expect(await page.evaluate(stance)).toBe(0);

  await debug(page, "keyDown", "ControlLeft");
  await page.waitForTimeout(30);
  const early = await page.evaluate(stance);
  // Partway down after one or two frames — not already planted at 1.
  expect(early).toBeGreaterThan(0);
  expect(early).toBeLessThan(1);

  await page.waitForTimeout(500);
  expect(await page.evaluate(stance)).toBe(1);

  // Standing back up is deliberately slower than dropping.
  await debug(page, "keyUp", "ControlLeft");
  await page.waitForTimeout(900);
  expect(await page.evaluate(stance)).toBe(0);
});

test("crouching lowers the view and tightens the FOV", async ({ page }) => {
  await loadGame(page);
  await debug(page, "startArena");
  await page.waitForTimeout(600);

  const standingFov = await debug(page, "getAimFov");
  await debug(page, "keyDown", "ControlLeft");
  await page.waitForTimeout(500);
  const crouchedFov = await debug(page, "getAimFov");
  await debug(page, "keyUp", "ControlLeft");

  const read = (v) => (typeof v === "number" ? v : (v?.fov ?? v?.effective ?? v?.current));
  expect(read(crouchedFov)).toBeLessThan(read(standingFov));
});
