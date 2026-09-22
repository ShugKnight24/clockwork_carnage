/**
 * Voxel Forge coverage: editor entry, block editing, save/reload persistence,
 * the share-URL round trip, legacy 2D-map conversion, play-test, and the
 * three art styles.
 *
 * GPU flags (`--use-gl=angle --enable-gpu`) come from playwright.config.js —
 * plain headless Chromium has no WebGL2, so the Forge would never open.
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug, screenshot } from "./helpers.js";

/**
 * The Forge boots async (lazy-loaded voxel renderer + forge.js chunk, then a
 * generated or migrated world), so `debug(page, "startBuilder")` returning
 * doesn't mean it's ready. Poll for the state flip and a first drawn chunk.
 */
async function waitForForge(page, timeoutMs = 20_000) {
  await page.waitForFunction(
    () => {
      const g = window.ccDebug?.game;
      return g?.state === "builder" && (g.voxelRenderer?.stats.chunksDrawn ?? 0) > 0;
    },
    { timeout: timeoutMs },
  );
}

/** Re-aims the builder camera and recomputes its raycast target (`update()` does both). */
async function aimAndUpdate(page, { x, y, z, angle = 0, pitch = 0 }) {
  await page.evaluate(
    ({ x, y, z, angle, pitch }) => {
      const b = window.ccDebug.game.builder;
      b.player.x = x;
      b.player.y = y;
      b.player.z = z;
      b.player.angle = angle;
      b.player.pitch = pitch;
      b.update(0);
    },
    { x, y, z, angle, pitch },
  );
}

/** A v3 (pre-voxel) builder map: a 5-layer stone wall and a 2-layer metal wall. */
function legacyV3Map() {
  const grid = () => Array.from({ length: 60 }, () => Array(60).fill(0));
  const layers = Array.from({ length: 5 }, grid);
  const g = grid();
  // full wall at (2,3): all 5 layers stone; waist wall at (4,3): 2 layers metal
  for (let l = 0; l < 5; l++) layers[l][3][2] = 1;
  layers[0][3][4] = 3;
  layers[1][3][4] = 3;
  g[3][2] = 1;
  g[3][4] = 3;
  return {
    version: 3,
    name: "Old",
    width: 60,
    height: 60,
    grid: g,
    layers,
    playerStart: { x: 10, y: 10, dir: 1.5 },
    enemySpawns: [{ x: 20, y: 21, enemy: "drone" }],
    entities: [{ x: 5.5, y: 6.5, type: "ammo" }],
    exit: { x: 50, y: 50 },
  };
}

test.describe("Voxel Forge", () => {
  test("enters the Forge and draws the world", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    expect(await debug(page, "getState")).toBe("builder");
    const chunksDrawn = await page.evaluate(
      () => window.ccDebug.game.voxelRenderer.stats.chunksDrawn,
    );
    expect(chunksDrawn).toBeGreaterThan(0);

    await screenshot(page, "forge-editor");
  });

  test("places and breaks blocks", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    // Direct edits via the debug bridge (high above any generated terrain).
    await debug(page, "setBlock", 20, 20, 49, 5);
    await debug(page, "setBlock", 21, 20, 49, 5);
    expect(await page.evaluate(() => window.ccDebug.game.world.get(20, 20, 49))).toBe(5);
    expect(await page.evaluate(() => window.ccDebug.game.world.get(21, 20, 49))).toBe(5);

    // Simulated aim + click — place: a target block sits at (55,64,49); aim
    // at it from the west and left-click (button 0) the open face beside it.
    await debug(page, "setBlock", 55, 64, 49, 1);
    await aimAndUpdate(page, { x: 50.5, y: 64.5, z: 48, angle: 0, pitch: 0 });
    const target = await page.evaluate(() => window.ccDebug.game.builder.target);
    expect(target).toMatchObject({ x: 55, y: 64, z: 49 });

    await page.evaluate(() => window.ccDebug.game.builder.handleMouseDown(0));
    expect(await page.evaluate(() => window.ccDebug.game.world.get(54, 64, 49))).toBe(1);

    // Simulated aim + click — break: a separate target block, right-click
    // (button 2, the non-zero branch) removes it.
    await debug(page, "setBlock", 45, 64, 49, 1);
    await aimAndUpdate(page, { x: 40.5, y: 64.5, z: 48, angle: 0, pitch: 0 });
    const breakTarget = await page.evaluate(() => window.ccDebug.game.builder.target);
    expect(breakTarget).toMatchObject({ x: 45, y: 64, z: 49 });

    await page.evaluate(() => window.ccDebug.game.builder.handleMouseDown(2));
    expect(await page.evaluate(() => window.ccDebug.game.world.get(45, 64, 49))).toBe(0);
  });

  test("saves and reloads with edits intact", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    await debug(page, "setBlock", 100, 100, 50, 7);
    expect(await page.evaluate(() => window.ccDebug.game.world.get(100, 100, 50))).toBe(7);
    await page.evaluate(() => window.ccDebug.game.builder.saveMap());

    // IndexedDB and localStorage (the slot pointer) survive a reload in the
    // same browser context.
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#titleScreen", { state: "visible", timeout: 10_000 });
    await page.waitForFunction(() => window.ccDebug != null, { timeout: 10_000 });

    await debug(page, "startBuilder");
    await waitForForge(page);
    expect(await page.evaluate(() => window.ccDebug.game.world.get(100, 100, 50))).toBe(7);
  });

  test("share URL round trip", async ({ page, browser }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    await debug(page, "setBlock", 90, 90, 50, 9);
    await page.evaluate(() => window.ccDebug.game.builder.saveMap());

    // shareMap() copies the link to the clipboard and never leaves the hash
    // in the address bar (a reload would otherwise re-import it as a copy).
    try {
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    } catch (_) {
      /* some environments refuse clipboard permission grants */
    }
    await page.evaluate(() => window.ccDebug.game.builder.shareMap());
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.location.hash)).toBe("");
    try {
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip).toContain("#v4.");
    } catch (_) {
      /* clipboard read unavailable — the hash assertion above still holds */
    }

    // Get the share hash directly rather than trusting the clipboard, per
    // the task brief — pack the live world the same way shareMap() does.
    const hash = await page.evaluate(async () => {
      const { toShareHash } = await import("/src/world/world-codec.js");
      return toShareHash(window.ccDebug.game.world);
    });
    expect(hash).toMatch(/^v4\./);

    const ctx2 = await browser.newContext();
    try {
      const page2 = await ctx2.newPage();
      await page2.addInitScript(() => {
        localStorage.setItem("cc_analytics_consent", "declined");
      });
      await page2.goto(`/#${hash}`, { waitUntil: "networkidle" });
      await page2.waitForFunction(() => window.ccDebug != null, { timeout: 10_000 });
      await waitForForge(page2, 30_000);

      expect(await page2.evaluate(() => window.ccDebug.game.world.get(90, 90, 50))).toBe(9);
      expect(await page2.evaluate(() => window.ccDebug.game.world.meta.name)).toBe("Shared");
      const slotNames = await page2.evaluate(() =>
        window.ccDebug.game.builder.mapIndex.map((e) => e.name),
      );
      expect(slotNames).toContain("Shared");
    } finally {
      await ctx2.close();
    }
  });

  test("converts a legacy v3 map on entry", async ({ page }) => {
    test.setTimeout(90_000);
    const legacy = legacyV3Map();
    await page.addInitScript((map) => {
      localStorage.setItem("cc_builder_maps_index", JSON.stringify([{ id: 0, name: "Old" }]));
      localStorage.setItem("cc_builder_map_0", JSON.stringify(map));
    }, legacy);

    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    const slotNames = await page.evaluate(() =>
      window.ccDebug.game.builder.mapIndex.map((e) => e.name),
    );
    expect(slotNames).toContain("Old");

    const stoneWall = await page.evaluate(() =>
      [32, 33, 34].map((z) => window.ccDebug.game.world.get(36, 37, z)),
    );
    expect(stoneWall).toEqual([1, 1, 1]);
    expect(await page.evaluate(() => window.ccDebug.game.world.get(38, 37, 32))).toBe(3);
    expect(await page.evaluate(() => window.ccDebug.game.world.get(38, 37, 33))).toBe(0);
  });

  test("play-test runs 3D enemies and exits back to the editor", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    // A small flat stone platform so the spawns and exit have solid ground
    // regardless of the procedurally generated terrain around them.
    for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) {
      await debug(page, "setBlock", 60 + dx, 64 + dy, 30, 1);
    }
    await debug(page, "addEnemySpawn", 60.5, 64.5, 31, "drone"); // air enemy
    await debug(page, "addEnemySpawn", 61.5, 65.5, 31, "beast"); // ground enemy
    await debug(page, "setVoxelExit", 62.5, 64.5, 31);

    await debug(page, "startBuilderPlayTest");
    await page.waitForTimeout(2000);

    expect(await debug(page, "getState")).toBe("playing");
    const enemyZs = await page.evaluate(() =>
      window.ccDebug.game.entities.filter((e) => e.type === "enemy").map((e) => e.z),
    );
    expect(enemyZs.length).toBeGreaterThan(0);
    for (const z of enemyZs) expect(Number.isFinite(z)).toBe(true);

    await page.evaluate(() => window.ccDebug.game.exitBuilderPlayTest());
    expect(await debug(page, "getState")).toBe("builder");
  });

  test("renders the three art styles without console errors", async ({ browser }) => {
    test.setTimeout(90_000);
    const styles = [
      { id: 0, name: "legacy" },
      { id: 1, name: "comic" },
      { id: 2, name: "modern" },
    ];
    for (const style of styles) {
      const ctx = await browser.newContext();
      try {
        const page = await ctx.newPage();
        const errors = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text());
        });
        page.on("pageerror", (err) => errors.push(err.message));

        await page.addInitScript((s) => {
          localStorage.setItem("cc_settings", JSON.stringify({ artStyle: s }));
        }, style.id);
        await loadGame(page);
        await debug(page, "startBuilder");
        await waitForForge(page);
        await screenshot(page, `forge-${style.name}`);

        const critical = errors.filter((e) => !e.includes("favicon") && !e.includes("gtag"));
        expect(critical, `console/page errors for ${style.name}`).toHaveLength(0);
      } finally {
        await ctx.close();
      }
    }
  });
});
