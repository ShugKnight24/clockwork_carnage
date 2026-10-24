/**
 * Cover in the running game (src/systems/cover.js, cover-play.js), on level
 * 1's spawn room: the waist-high counter on row 49 (columns 27-32) is low
 * cover, and the lone pillar at (22, 50) is high cover.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

/** Level 1 with the room to ourselves: its enemies switched off, uncounted. */
async function quietLevel(page) {
  await loadGame(page);
  await debug(page, "startCampaign", 0);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    for (const e of g.entities) if (e.type === "enemy") e.active = false;
  });
}

const player = (page) =>
  page.evaluate(() => {
    const g = window.ccDebug.game;
    const p = g.player;
    return {
      x: p.x, y: p.y, inCover: p.inCover, down: !!p.coverDown, peeking: !!p.coverPeeking,
      crouch: p.crouchBlend, health: p.health, low: p.cover?.face.low ?? null,
      face: p.cover ? { cx: p.cover.face.cx, cy: p.cover.face.cy } : null, stats: { ...g.coverStats },
    };
  });

/** Stand in front of the counter, facing it, and take cover. */
async function coverAtCounter(page, x = 29.5) {
  await page.evaluate((x) => {
    const d = window.ccDebug;
    d.teleport(x, 50.9);
    d.game.player.angle = -Math.PI / 2;
    d.game.player.aimOffsetX = 0;
    d.game.player.aimOffsetY = 0;
  }, x);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.ccDebug.pressKey("KeyG"));
  await page.waitForTimeout(500);
}

test("takes cover against low cover and against a wall", async ({ page }) => {
  await quietLevel(page);
  await debug(page, "godMode", true);
  const before = (await player(page)).stats.tookCover;
  await coverAtCounter(page);
  let p = await player(page);
  expect(p.inCover).toBe(true);
  expect(p.low).toBe(true);
  expect(p.y).toBeCloseTo(50.32, 2);
  expect(p.down).toBe(true);
  expect(p.crouch).toBe(1);
  expect(p.stats.tookCover).toBe(before + 1);
  await page.screenshot({ path: "screenshots/cover-low-down.png" });

  // The same key again steps out and stands back up.
  await debug(page, "pressKey", "KeyG");
  await page.waitForTimeout(800);
  p = await player(page);
  expect(p.inCover).toBe(false);
  expect(p.crouch).toBeLessThan(0.05);

  // The pillar, from its east side: high cover, nothing to crouch behind.
  await page.evaluate(() => {
    const d = window.ccDebug;
    d.teleport(23.9, 50.5);
    d.game.player.angle = Math.PI;
  });
  await page.waitForTimeout(150);
  await debug(page, "pressKey", "KeyG");
  await page.waitForTimeout(500);
  p = await player(page);
  expect(p.inCover).toBe(true);
  expect(p.low).toBe(false);
  expect(p.face).toEqual({ cx: 22, cy: 50 });
  expect(p.x).toBeCloseTo(23.32, 2);
  expect(p.down).toBe(false);

  // Aiming at its end leans out past it.
  await page.evaluate(() => { window.ccDebug.game.player.isAiming = true; });
  await page.waitForTimeout(500);
  p = await player(page);
  expect(p.peeking).toBe(true);
  expect(p.y).toBeLessThan(50);
  await page.screenshot({ path: "screenshots/cover-high-lean.png" });
});

test("peeks over low cover and kills a target", async ({ page }) => {
  await quietLevel(page);
  await debug(page, "godMode", true);
  await coverAtCounter(page);
  await page.evaluate(() => {
    const d = window.ccDebug;
    d.spawn("drone", 29.5, 46.5);
    const g = d.game;
    const t = g.entities[g.entities.length - 1];
    t.speed = 0;
    t.alertRange = 0;
    t.state = "idle";
    g.player.isAiming = true;
  });
  await page.waitForTimeout(500);
  expect((await player(page)).peeking).toBe(true);
  await page.evaluate(() => window.ccDebug.fire(true));
  await page.waitForFunction(() => window.ccDebug.game.coverStats.peekKills > 0, null, { timeout: 8000 });
  await page.evaluate(() => window.ccDebug.fire(false));
  const p = await player(page);
  expect(p.stats.peekKills).toBeGreaterThanOrEqual(1);
  expect(p.inCover).toBe(true);
});

test("down behind cover a frontal shot is stopped; peeking takes it", async ({ page }) => {
  await quietLevel(page);
  await coverAtCounter(page);
  const shoot = () =>
    page.evaluate(async () => {
      const { Projectile } = await import("/js/entities.js");
      const g = window.ccDebug.game;
      // From the far side of the counter, straight at the player.
      const b = new Projectile(29.5, 46.5, 0, 1, 10, 8, "enemy");
      g.projectiles.push(b);
      g.entities.push(b);
    });
  const start = (await player(page)).health;
  expect((await player(page)).down).toBe(true);
  await shoot();
  await page.waitForTimeout(900);
  expect((await player(page)).health).toBe(start);

  await page.evaluate(() => { window.ccDebug.game.player.isAiming = true; });
  await page.waitForTimeout(500);
  expect((await player(page)).peeking).toBe(true);
  await shoot();
  await page.waitForTimeout(900);
  expect((await player(page)).health).toBeLessThan(start);
});

test("a dash from cover slides to the next cover in view", async ({ page }) => {
  await quietLevel(page);
  await debug(page, "godMode", true);
  await coverAtCounter(page, 27.6);
  // Along the counter to its west end, then look at the pillar.
  await debug(page, "keyDown", "KeyA");
  await page.waitForTimeout(400);
  await debug(page, "keyUp", "KeyA");
  await page.evaluate(() => { window.ccDebug.game.player.angle = Math.PI; });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => !!window.ccDebug.game.player.coverDashTarget)).toBe(true);
  const before = (await player(page)).stats.coverDashes;
  await debug(page, "pressKey", "Space");
  await page.waitForFunction(() => window.ccDebug.game.player.cover?.face.cx === 22, null, { timeout: 3000 });
  const p = await player(page);
  expect(p.stats.coverDashes).toBe(before + 1);
  expect(p.low).toBe(false);
});
