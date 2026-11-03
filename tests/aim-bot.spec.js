/**
 * E2E — Bot aim verification.
 *
 * Spawns a stationary dummy on the live aim ray at multiple distances and
 * fires. Asserts the bullet finds the target. Guards against the BUG-aim-pitch
 * regression class where the reticle pixel and the bullet ray drift apart.
 *
 * Note: arena map is 24×24, so distances are capped at 15m. Long-range
 * (35m+) verification belongs in a dedicated builder map test (TODO).
 */
import { test, expect } from "@playwright/test";
import { loadGame, enterModeSelect, waitForState } from "./helpers.js";

const DISTANCES = [5, 15];
const HORIZONTAL_OFFSETS = [0, 0.1, -0.12]; // center, right, left
const ADS_MODES = [false, true];

async function setupArena(page) {
  await loadGame(page);
  await enterModeSelect(page);
  await page.evaluate(() => {
    window.ccDebug.startArena();
  });
  await waitForState(page, "playing", 10_000);
  await page.evaluate(() => {
    window.ccDebug.godMode(true);
    window.ccDebug.giveAllWeapons();
    window.ccDebug.killAll(); // clear arena spawn so we have a clean field
    // Pistol = id 0, infinite ammo path
    window.ccDebug.setPlayer({
      currentWeapon: 0,
      ammo: 9999,
      x: 2.5,           // teleport to west edge so 15m east stays in bounds
      y: 12.5,
      angle: 0,
    });
  });
}

async function fireOneShotAt(page, dist, aimOffsetX, ads) {
  const result = await page.evaluate(
    async ({ dist, aimOffsetX, ads }) => {
      // Put the reticle on the middle of the figure as drawn, as a player
      // would: with a HUD bar, a centred reticle looks slightly up, and over
      // a beast's back at range (src/data/enemy-art.js).
      const { ENEMY_ART_SPAN } = await import("/src/data/enemy-art.js");
      const { currentBarH } = await import("/src/systems/aim.js");
      const game = window.ccDebug.game;
      const [top, bottom] = ENEMY_ART_SPAN.beast;
      const h = game.canvas.height;
      const barH = currentBarH(game);
      const aimOffsetY = (barH / (2 * h) - (top + bottom) / 2 / dist) / ((h - barH) / h);
      window.ccDebug.setPlayer({ aimOffsetX, aimOffsetY: 0, isAiming: ads });
      // ADS eases the FOV in (rate 8/s) rather than snapping. Let it settle,
      // then place the dummy using the FOV the renderer is actually drawing
      // with. Assuming the fully-zoomed value and firing 80ms later put the
      // dummy on the wrong ray whenever there was a horizontal offset.
      await window.ccDebug.waitGameTime(600);

      const player = window.ccDebug.getPlayer();
      const fov = window.ccDebug.getAimFov();
      const planeMul = Math.tan((fov * 0.5 * Math.PI) / 180);
      // The reticle as it is now: aiming in eases it to centre, turning the view.
      const yaw = player.angle + Math.atan(2 * (player.aimOffsetX || 0) * planeMul);

      // Target on the yaw ray.
      const tx = player.x + Math.cos(yaw) * dist;
      const ty = player.y + Math.sin(yaw) * dist;

      window.ccDebug.setPlayer({ aimOffsetY });
      // Clear the field again: the arena can bring in more while the FOV
      // settles, and one of those in the line of fire takes the shot.
      window.ccDebug.killAll();
      const spawn = window.ccDebug.spawn("beast", tx, ty);
      // Our beast by reference, not the first beast in the list.
      const dummy = game.entities[game.entities.length - 1];

      // Game time, not wall time: on a runner drawing a few frames a
      // second, 80 ms of wall clock can pass without a frame to fire in.
      window.ccDebug.fire(true);
      await window.ccDebug.waitGameTime(80);
      window.ccDebug.fire(false);
      await window.ccDebug.waitGameTime(250);

      // What else was alive, for a miss to explain itself.
      const others = game.entities
        .filter((e) => e !== dummy && e.type === "enemy" && e.active)
        .map((e) => ({ kind: e.enemyType, x: +e.x.toFixed(2), y: +e.y.toFixed(2), health: e.health }));
      const target = { health: dummy.health, active: dummy.active, x: dummy.x, y: dummy.y };
      return { spawn, target, others, yaw, targetXY: { x: tx, y: ty } };
    },
    { dist, aimOffsetX, ads },
  );
  return result;
}

test.describe("Bot Aim Verification", () => {
  for (const dist of DISTANCES) {
    for (const offX of HORIZONTAL_OFFSETS) {
      for (const ads of ADS_MODES) {
        test(`hits dummy at ${dist}m, offX=${offX}, ADS=${ads}`, async ({
          page,
        }) => {
          await setupArena(page);
          const r = await fireOneShotAt(page, dist, offX, ads);
          expect(r.spawn).toBeTruthy();
          expect(r.spawn.error).toBeUndefined();
          expect(r.target).toBeDefined();
          // Beast starts at 120 hp; pistol does ~15 dmg. After one shot,
          // a hit drops it well below the spawn value.
          expect(r.target.health, JSON.stringify(r)).toBeLessThan(r.spawn.health);
        });
      }
    }
  }
});
