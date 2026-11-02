import { describe, it, expect } from "vitest";
import { buildHudState } from "../../src/ui/hud-state.js";
import { renderLegacyTacticalHUD } from "../../src/ui/hud-tactical.js";
import { renderLegacyCustomHUD } from "../../src/ui/hud-custom.js";

/** The slice of a Game the HUD snapshot reads. */
function fakeGame(over = {}) {
  const player = {
    x: 2, y: 3, angle: 0,
    health: 50, maxHealth: 100, shield: 10, maxShield: 40, alive: true,
    stamina: 30, maxStamina: 100, chronoEnergy: 25, maxChronoEnergy: 100,
    chronoActive: false, isSprinting: false, isDashing: false,
    ammo: 12, weapons: [0, 1], currentWeapon: 1, score: 900,
    getWeaponDef: () => ({ name: "Chrono Pistol", color: "#0cf" }),
  };
  return {
    player,
    settings: {
      hudStyle: 0, hudScale: 100, minimapSize: 160, staminaBarSize: 100, difficulty: 1,
      showScore: true, showKills: true, showWeapons: true, showPortrait: true, fov: 70,
    },
    hudH: 720, hudW: 1280, isTouchDevice: false,
    mode: "arena", time: 1000, entities: [], damageNumbers: [], map: {},
    killedEnemies: 2, totalEnemies: 9, arenaTimer: 30, arenaRound: 2,
    cbColor: (c) => c,
    ...over,
  };
}

/** A canvas context that records calls instead of drawing. */
function recordingCtx() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls,
    beginPath: rec("beginPath"), fill: rec("fill"), stroke: rec("stroke"),
    fillRect: rec("fillRect"), arc: rec("arc"), moveTo: rec("moveTo"),
    lineTo: rec("lineTo"), fillText: rec("fillText"),
  };
}

describe("buildHudState", () => {
  it("snapshots the player and layout the HUD draws", () => {
    const s = buildHudState(fakeGame());
    expect(s.healthPct).toBe(0.5);
    expect(s.healthColor).toBe("#ffaa00");
    expect(s.staminaPct).toBeCloseTo(0.3);
    expect(s.chronoPct).toBeCloseTo(0.25);
    expect(s.ammoText).toBe("12");
    expect(s.ammoBoost).toBeNull();
    expect(s.weapon.name).toBe("Chrono Pistol");
    expect(s.barH).toBe(0);
    expect(s.compact).toBe(false);
  });

  it("sizes the Classic bar with the HUD scale", () => {
    const s = buildHudState(fakeGame({ settings: { ...fakeGame().settings, hudStyle: 1, hudScale: 50 } }));
    expect(s.barH).toBe(80);
  });

  it("takes the slim bar on a short touch screen", () => {
    const s = buildHudState(fakeGame({ isTouchDevice: true, hudH: 276 }));
    expect(s.compact).toBe(true);
    expect(s.barH).toBe(60);
  });

  it("prefers the ammo label (god mode) over the count", () => {
    const g = fakeGame();
    g.player.ammoLabel = "∞";
    expect(buildHudState(g).ammoText).toBe("∞");
  });

  it("reads the meltdown run only in Meltdown", () => {
    const meltdown = { getHUD: () => ({ heat: 40 }), getHeatOverlay: () => null };
    expect(buildHudState(fakeGame({ meltdown })).meltdownHud).toBeNull();
    expect(buildHudState(fakeGame({ meltdown, mode: "meltdown" })).meltdownHud.heat).toBe(40);
  });
});

describe("legacy style renderers", () => {
  it("draw from the snapshot alone", () => {
    const s = buildHudState(fakeGame());
    const ctx = recordingCtx();
    renderLegacyTacticalHUD(ctx, 1280, 720, s);
    const text = ctx.calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(text).toEqual(["HP 50", "AMMO 12", "CHRONO PISTOL"]);
  });

  it("warn when no custom layout is configured", () => {
    const ctx = recordingCtx();
    renderLegacyCustomHUD(ctx, 1280, 720, buildHudState(fakeGame()));
    expect(ctx.calls.some((c) => c[0] === "fillText" && c[1] === "NO CUSTOM HUD CONFIGURED")).toBe(true);
  });
});
