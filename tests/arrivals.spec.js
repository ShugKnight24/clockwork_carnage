/**
 * Arrivals and the stopped people, in the running game: an enemy that
 * arrives through a tear in front of the player is neither in the world nor
 * able to hurt anyone until it has stepped out and had a moment, and a
 * person the 06:47 pulse caught is drawn drained of colour in every art
 * style (screenshots in screenshots/frozen-*.png).
 */
import { test, expect } from "@playwright/test";
import { loadGame, debug } from "./helpers.js";

/** A campaign level with the player facing down a clear stretch of floor, no enemies in it. */
async function clearedLevel(page, level = 0, act = 1) {
  await loadGame(page);
  await debug(page, "startCampaign", level, act);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = window.ccDebug.game;
    const p = g.player;
    const free = (x, y) => g.map.grid[Math.floor(y)]?.[Math.floor(x)] === 0;
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      let ok = true;
      for (let d = 0.4; d <= 4.5 && ok; d += 0.2) ok = free(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      if (ok) {
        p.angle = a;
        break;
      }
    }
    g.entities = g.entities.filter((e) => e.type !== "enemy");
  });
}

test("an enemy arriving through a tear in view is not active or damaging during the telegraph", async ({ page }) => {
  await clearedLevel(page);
  const run = await page.evaluate(async () => {
    const g = window.ccDebug.game;
    const { arrive, ARRIVALS, ARMED_AFTER } = await import("/src/systems/arrival.js");
    const { Enemy } = await import("/js/entities.js");
    const p = g.player;
    // A melee enemy arriving right in front of the player, already hunting.
    const a = arrive(g, {
      x: p.x + Math.cos(p.angle) * 1.4,
      y: p.y + Math.sin(p.angle) * 1.4,
      make: (x, y) => {
        const e = new Enemy(x, y, "glitchling");
        e.state = "chase";
        e.lastAttackTime = -1e9;
        return e;
      },
    });
    // Every hit it lands, on the game's own clock.
    const hits = [];
    const damage = g.damagePlayer.bind(g);
    g.damagePlayer = (amount, from) => {
      if (from === a.enemy) hits.push(g.time);
      return damage(amount, from);
    };
    const start = g.time;
    const samples = [];
    while (g.time - start < (ARRIVALS.tear.telegraph + ARRIVALS.tear.step + ARMED_AFTER + 2.5) * 1000) {
      await new Promise((r) => requestAnimationFrame(r));
      samples.push({
        t: (g.time - start) / 1000,
        phase: a.phase,
        inWorld: g.entities.includes(a.enemy),
        arriving: !!a.enemy._arriving,
        windup: a.enemy.state === "windup",
        alpha: a.enemy.renderAlpha ?? 1,
      });
      if (samples.length > 2000) break;
    }
    g.damagePlayer = damage;
    return {
      samples,
      hits: hits.map((t) => (t - start) / 1000),
      telegraph: ARRIVALS.tear.telegraph,
      out: ARRIVALS.tear.telegraph + ARRIVALS.tear.step,
      armed: ARMED_AFTER,
    };
  });
  const tele = run.samples.filter((s) => s.phase === "telegraph");
  expect(tele.length).toBeGreaterThan(10);
  // Telegraphing: not in the world at all.
  for (const s of tele) expect(s.inWorld).toBe(false);
  // Stepping out: there to see, fading in, left alone by the AI.
  const step = run.samples.filter((s) => s.phase === "step");
  expect(step.length).toBeGreaterThan(0);
  for (const s of step) {
    expect(s.inWorld).toBe(true);
    expect(s.arriving).toBe(true);
    expect(s.windup).toBe(false);
  }
  // No attack starts until it has stepped out and had its moment, and no
  // hit lands before that either.
  const firstWindup = run.samples.find((s) => s.windup);
  if (firstWindup) expect(firstWindup.t).toBeGreaterThanOrEqual(run.out + run.armed - 0.05);
  for (const t of run.hits) expect(t).toBeGreaterThanOrEqual(run.out + run.armed);
  // ...and then it does fight: the gate holds rather than disarms.
  expect(firstWindup || run.hits.length).toBeTruthy();
  await page.screenshot({ path: "screenshots/arrival-tear-after.png" });
});

test("a campaign hunter pack comes through tears instead of appearing", async ({ page }) => {
  // Act II, where the Lord's hunters answer a loud shift.
  await clearedLevel(page, 2, 2);
  const r = await page.evaluate(() => {
    const g = window.ccDebug.game;
    const cp = g.chronoPowers;
    const before = g.entities.length;
    const pack = cp.huntNow(g, { scripted: true });
    return {
      pack: pack.length,
      added: g.entities.length - before,
      tears: (g.arrivals ?? []).filter((a) => a.via === "tear" && pack.includes(a.enemy)).length,
    };
  });
  expect(r.pack).toBeGreaterThan(0);
  expect(r.added).toBe(0);
  expect(r.tears).toBe(r.pack);
  await page.waitForTimeout(900);
  await page.screenshot({ path: "screenshots/arrival-hunter-tears.png" });
});

test("a frozen person is drawn drained toward blue-grey in every art style", async ({ page }) => {
  await clearedLevel(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(async () => {
    const g = window.ccDebug.game;
    const { Npc } = await import("/js/npc.js");
    const p = g.player;
    // A little left of centre, clear of the weapon.
    const a = p.angle - 0.22;
    const n = new Npc(p.x + Math.cos(a) * 2.2, p.y + Math.sin(a) * 2.2, "clerk", { look: 0 });
    n.freeze({ face: { x: p.x + Math.cos(p.angle + 1.2) * 4, y: p.y + Math.sin(p.angle + 1.2) * 4 } });
    g.entities.push(n);
    window.__frozen = n;
    // Hold the view still: no weapon in the way of the middle of the screen.
    g.player.aimOffsetX = 0;
    g.player.aimOffsetY = 0;
  });
  // How warm the person's pixels are: mean red minus blue over a box round
  // where they stand on screen. Her cardigan and skin are warm; drained,
  // she goes blue-grey.
  const warmth = () =>
    page.evaluate(() => {
      window.ccDebug.forceRender();
      const g = window.ccDebug.game;
      const R = g.renderer;
      const n = window.__frozen;
      const pt = R._projectWorld(g.player, n.x, n.y, R._spritePlaneMul ?? 0.7);
      const halfH = R.height / pt.depth / 2;
      const x0 = Math.max(0, Math.floor(pt.x - halfH * 0.25));
      const y0 = Math.max(0, Math.floor(R.height / 2 - halfH * 0.6));
      const d = R.ctx.getImageData(x0, y0, Math.max(1, Math.floor(halfH * 0.5)), Math.max(1, Math.floor(halfH * 1.2))).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i] - d[i + 2];
      return sum / (d.length / 4);
    });
  for (const [style, name] of [[0, "legacy"], [1, "comic"], [2, "modern"]]) {
    await page.evaluate(async (s) => {
      const m = await import("/src/rendering/art-style.js");
      m.setArtStyle(s);
    }, style);
    // Comic and Modern decode their SVG poses first.
    await page.waitForTimeout(1500);
    const frozen = await warmth();
    await page.screenshot({ path: `screenshots/frozen-${name}.png` });
    await page.evaluate(() => window.__frozen.thaw());
    await page.waitForTimeout(300);
    const live = await warmth();
    await page.evaluate(() => window.__frozen.freeze());
    test.info().annotations.push({ type: "warmth", description: `${name}: frozen ${frozen.toFixed(1)}, live ${live.toFixed(1)}` });
    expect(frozen, `${name}: frozen ${frozen.toFixed(1)} vs live ${live.toFixed(1)} (red minus blue)`).toBeLessThan(live);
  }
  expect(errors).toEqual([]);
});
