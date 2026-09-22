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

/**
 * Waits until the chunk mesher has nothing left to build. Only four chunks are
 * re-meshed per frame, so `chunksDrawn` undercounts until the cache catches up.
 */
async function waitForMeshIdle(page, timeoutMs = 30_000) {
  await page.evaluate(() => { window.ccDebug.game.__meshIdle = 0; });
  await page.waitForFunction(
    () => {
      const g = window.ccDebug?.game;
      if (!g?.voxelRenderer) return false;
      g.__meshIdle = g.voxelRenderer.stats.meshedThisFrame === 0 ? g.__meshIdle + 1 : 0;
      return g.__meshIdle > 30;
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

/**
 * Flips the loaded world to survival. `_adopt` is the only path that hands the
 * Forge its `survival`, and it stands the player back on the world spawn, so
 * every aim has to come after it. Noclip is on because a held break spans many
 * frames and gravity would otherwise drag the aim off the targeted cell.
 */
async function enterSurvival(page) {
  await page.evaluate(() => {
    const b = window.ccDebug.game.builder;
    b.world.meta.mode = "survival";
    b._adopt(b.world, b.currentSlot);
    b.noclip = true;
  });
}

/** Feeds the Forge a bare keydown; `handleKeyDown` reads only these fields. */
async function pressForgeKey(page, code) {
  return page.evaluate(
    (c) =>
      window.ccDebug.game.builder.handleKeyDown({
        code: c,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault() {},
      }),
    code,
  );
}

/**
 * Clears the sight line the block tests aim down and puts `blocks` on it.
 * z=49 is well clear of any generated terrain, so the raycast hits only what
 * the test put there.
 */
async function layOutSightLine(page, blocks) {
  await page.evaluate((list) => {
    const w = window.ccDebug.game.world;
    for (let x = 40; x <= 47; x++) w.set(x, 64, 49, 0);
    for (const [x, id] of list) w.set(x, 64, 49, id);
  }, blocks);
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

  test("draws the whole world at the lowest quality preset", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    /**
     * Chunks drawn from a ground pose in one corner looking diagonally across
     * the world — the longest sight line there is — once the mesher has caught
     * up. The terrain is seeded from the clock, so the exact count moves; what
     * must not move is that the far side of the map is in it.
     */
    const drawnLookingAcross = async () => {
      const z = await page.evaluate(() => window.ccDebug.game.world.topSolid(2, 2) + 1);
      await aimAndUpdate(page, { x: 2.5, y: 2.5, z, angle: Math.PI / 4, pitch: 0 });
      await waitForMeshIdle(page);
      return page.evaluate(() => window.ccDebug.game.voxelRenderer.stats.chunksDrawn);
    };

    // `quality.drawDistance` counts raycaster tiles — 8 on the lowest tier,
    // which as a voxel radius would leave nothing but sky past a few chunks.
    const q = await debug(page, "quality", "ultra-low");
    expect(q.drawDistance).toBe(8);
    const low = await drawnLookingAcross();
    expect(low).toBeGreaterThan(40);
    await screenshot(page, "forge-ultra-low");

    // The voxel pass has its own radius, so the tier makes no difference to it.
    await debug(page, "quality", "ultra");
    expect(await drawnLookingAcross()).toBe(low);
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

  test("starts a buried enemy spawn on top of what buried it", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    // A platform, a spawn on it, and then a block dropped right on the spawn.
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      await debug(page, "setBlock", 70 + dx, 64 + dy, 40, 1);
    }
    await debug(page, "setBlock", 70, 64, 42, 0); // clear the head room above
    await debug(page, "addEnemySpawn", 70.5, 64.5, 41, "beast");
    await debug(page, "setBlock", 70, 64, 41, 1); // buries the spawn

    await debug(page, "startBuilderPlayTest");
    const spawnZ = await page.evaluate(() => {
      const e = window.ccDebug.game.entities.find((x) => x.type === "enemy");
      return e ? { x: e.x, y: e.y, z: e.z } : null;
    });
    expect(spawnZ).not.toBeNull();
    // On top of the block, not inside it.
    expect(spawnZ.z).toBe(42);
    expect(
      await page.evaluate(
        ([x, y, z]) => window.ccDebug.game.world.get(Math.floor(x), Math.floor(y), Math.floor(z)),
        [spawnZ.x, spawnZ.y, spawnZ.z],
      ),
    ).toBe(0);

    await page.evaluate(() => window.ccDebug.game.exitBuilderPlayTest());
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

  test("survival: gate, hold to break, craft the drop, place the result", async ({ page }) => {
    test.setTimeout(120_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    // A world with no `meta.mode` is creative, so nothing is attached yet.
    expect(await debug(page, "forgeSurvival")).toBe(null);
    await enterSurvival(page);
    const fresh = await debug(page, "forgeSurvival");
    expect(fresh).not.toBe(null);
    expect(fresh.mining).toBe(1);
    expect(fresh.tool).toBe("hand");
    expect(fresh.items).toEqual({});

    // Rock to mine, and a stone anchor behind it to place against afterwards.
    await layOutSightLine(page, [[45, 13], [46, 1]]);
    await aimAndUpdate(page, { x: 40.5, y: 64.5, z: 48, angle: 0, pitch: 0 });
    expect(await page.evaluate(() => window.ccDebug.game.builder.target)).toMatchObject({
      x: 45,
      y: 64,
      z: 49,
    });

    // Rock is gated at Mining 5, so bare hands at level 1 must refuse it.
    const refusal = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.handleMouseDown(2);
      b.update(1 / 60);
      const out = { notice: b.notice?.text ?? null, block: b.world.get(45, 64, 49) };
      b.handleMouseUp(2);
      return out;
    });
    expect(refusal.notice).toBe("Requires Mining 5");
    expect(refusal.block).toBe(13);

    // Past the gate, the block still takes a sustained hold rather than a click.
    const mined = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.survival.skills.grant("mining", 200); // Mining 6
      b.handleMouseDown(2);
      b.update(1 / 60);
      const first = { progress: b.survival.progress, block: b.world.get(45, 64, 49) };
      let ticks = 1;
      while (ticks < 600 && b.world.get(45, 64, 49) === 13) {
        b.update(1 / 60);
        ticks++;
      }
      b.handleMouseUp(2);
      return {
        first,
        ticks,
        block: b.world.get(45, 64, 49),
        rock: b.survival.inventory.count("rock"),
        xp: b.survival.skills.xp.mining,
      };
    });
    expect(mined.first.block).toBe(13); // one frame of holding is not enough
    expect(mined.first.progress).toBeGreaterThan(0);
    expect(mined.first.progress).toBeLessThan(1);
    expect(mined.ticks).toBeGreaterThan(20);
    expect(mined.block).toBe(0);
    expect(mined.rock).toBe(1);
    expect(mined.xp).toBe(215); // the 200 granted plus Rock's 15

    // Craft through the menu the player actually uses: C opens it, Enter makes
    // the highlighted row (Cut Stone), Escape closes it.
    expect(await pressForgeKey(page, "KeyC")).toBe(true);
    expect(await page.evaluate(() => window.ccDebug.game.builder.craftOpen)).toBe(true);

    const craftRow = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.survival.inventory.add("rock", 1); // Cut Stone takes two
      return { index: b.craftIndex, name: b.survival.recipes(null)[b.craftIndex].name };
    });
    expect(craftRow).toEqual({ index: 0, name: "Cut Stone" });

    expect(await pressForgeKey(page, "Enter")).toBe(true);
    const afterCraft = await debug(page, "forgeSurvival");
    expect(afterCraft.items).toEqual({ stone: 1 });
    expect(afterCraft.xp.construction).toBe(10);

    expect(await pressForgeKey(page, "Escape")).toBe(true);
    expect(await page.evaluate(() => window.ccDebug.game.builder.craftOpen)).toBe(false);

    // Place the crafted stone into the hole the rock left, spending the item.
    await aimAndUpdate(page, { x: 40.5, y: 64.5, z: 48, angle: 0, pitch: 0 });
    const placed = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.heldItem = "stone";
      const target = b.target;
      b.handleMouseDown(0);
      return {
        target,
        block: b.world.get(45, 64, 49),
        stone: b.survival.inventory.count("stone"),
        // Placed blocks pay no mining xp when broken again.
        wasPlaced: b.survival.wasPlaced(45, 64, 49),
      };
    });
    expect(placed.target).toMatchObject({ x: 46, y: 64, z: 49 });
    expect(placed.block).toBe(1);
    expect(placed.stone).toBe(0);
    expect(placed.wasPlaced).toBe(true);

    await screenshot(page, "forge-survival-loop");
  });

  test("creative: no session, and one click still breaks a gated block", async ({ page }) => {
    test.setTimeout(90_000);
    await loadGame(page);
    await debug(page, "startBuilder");
    await waitForForge(page);

    expect(await debug(page, "forgeSurvival")).toBe(null);

    await layOutSightLine(page, [[45, 13]]);
    await aimAndUpdate(page, { x: 40.5, y: 64.5, z: 48, angle: 0, pitch: 0 });

    const broken = await page.evaluate(() => {
      const b = window.ccDebug.game.builder;
      b.handleMouseDown(2); // one click, no hold
      return { survival: b.survival, block: b.world.get(45, 64, 49), notice: b.notice };
    });
    // Rock would need Mining 5 in survival; creative has no gate and no hold.
    expect(broken.survival).toBe(null);
    expect(broken.block).toBe(0);
    expect(broken.notice).toBe(null);

    // C is the craft menu key in survival only — creative must not claim it.
    expect(await pressForgeKey(page, "KeyC")).toBe(false);
    expect(await page.evaluate(() => window.ccDebug.game.builder.craftOpen)).toBe(false);
  });
});
