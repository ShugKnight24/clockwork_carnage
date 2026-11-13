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
// The reticle is always centred; the view turns instead (radians).
const TURNS = [0, 0.1, -0.12]; // ahead, right, left
const ADS_MODES = [false, true];

async function setupArena(page) {
  await loadGame(page);
  await enterModeSelect(page);
  await page.evaluate(() => {
    window.ccDebug.startArena();
  });
  await waitForState(page, "playing", 10_000);
  await page.evaluate(async () => {
    // The menu clicks left a mouse delta for the first frames of play to
    // turn by. On a slow runner that turn landed after the angle below and
    // swung the aim ray off the map. Let it land, then clear it.
    await window.ccDebug.waitFrames(2);
    window.ccDebug.clearInput();
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

async function fireOneShotAt(page, dist, turn, ads) {
  const result = await page.evaluate(
    async ({ dist, turn, ads }) => {
      // Put the reticle on the middle of the figure as drawn, as a player
      // would: with a HUD bar, a centred reticle looks slightly up, and over
      // a beast's back at range (src/data/enemy-art.js).
      const { ENEMY_ART_SPAN } = await import("/src/data/enemy-art.js");
      const { currentBarH } = await import("/src/systems/aim.js");
      const game = window.ccDebug.game;
      const [top, bottom] = ENEMY_ART_SPAN.beast;
      const h = game.canvas.height;
      const barH = currentBarH(game);
      const lookShiftY = barH / (2 * h) - (top + bottom) / 2 / dist;
      window.ccDebug.setPlayer({ angle: turn, lookShiftY: 0, isAiming: ads });
      // ADS eases the FOV in rather than snapping. Let it settle before
      // firing, so the shot goes out through the zoom the renderer draws.
      await window.ccDebug.waitGameTime(600);

      const player = window.ccDebug.getPlayer();
      // The reticle is centred: the shot goes where the view faces.
      const yaw = player.angle;

      // Target on the yaw ray.
      const tx = player.x + Math.cos(yaw) * dist;
      const ty = player.y + Math.sin(yaw) * dist;

      window.ccDebug.setPlayer({ lookShiftY });
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
      const me = { x: player.x, y: player.y, angle: player.angle };
      return { spawn, target, others, me, yaw, targetXY: { x: tx, y: ty } };
    },
    { dist, turn, ads },
  );
  return result;
}

test.describe("Bot Aim Verification", () => {
  for (const dist of DISTANCES) {
    for (const turn of TURNS) {
      for (const ads of ADS_MODES) {
        test(`hits dummy at ${dist}m, turn=${turn}, ADS=${ads}`, async ({
          page,
        }) => {
          await setupArena(page);
          const r = await fireOneShotAt(page, dist, turn, ads);
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
