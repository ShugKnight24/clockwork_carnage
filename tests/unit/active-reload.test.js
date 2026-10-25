import { describe, it, expect } from "vitest";
import {
  createActiveReload,
  reloadWindow,
  startReload,
  pressReload,
  updateReload,
  cancelReload,
  reloadProgress,
  boostFor,
  spendBoost,
  BOOST,
  JAM_MS,
} from "../../src/systems/active-reload.js";
import { WEAPONS } from "../../src/data/weapons.js";

const gun = { id: 9, reloadMs: 1000, reloadZone: [0.5, 0.2] };

/** The game time at fraction `t` of the bar for a reload started at `start`. */
const at = (start, t, ms = 1000) => start + t * ms;

describe("active reload timing", () => {
  it("lays the zone out from the weapon's data, the perfect zone at its leading edge", () => {
    const w = reloadWindow(gun);
    expect(w.duration).toBe(1000);
    expect(w.zoneStart).toBeCloseTo(0.5);
    expect(w.zoneEnd).toBeCloseTo(0.7);
    expect(w.perfectEnd).toBeGreaterThan(w.zoneStart);
    expect(w.perfectEnd).toBeLessThan(w.zoneEnd);
  });

  it("the marker runs across the bar in the reload time", () => {
    const ar = createActiveReload();
    startReload(ar, gun, 5000);
    expect(reloadProgress(ar, 5000)).toBe(0);
    expect(reloadProgress(ar, 5500)).toBeCloseTo(0.5);
    expect(reloadProgress(ar, 9000)).toBe(1);
  });

  it("with no press, finishes on its own at the end", () => {
    const ar = createActiveReload();
    startReload(ar, gun, 0);
    expect(updateReload(ar, 999)).toBeNull();
    expect(updateReload(ar, 1000)).toBe(gun.id);
    expect(ar.active).toBeNull();
    expect(boostFor(ar, gun.id)).toBe(1);
    expect(ar.stats.reloads).toBe(1);
  });

  it("a press in the zone is instant and boosts the next magazine", () => {
    const ar = createActiveReload();
    startReload(ar, gun, 0);
    expect(pressReload(ar, at(0, 0.65))).toBe("hit");
    expect(ar.active).toBeNull();
    expect(boostFor(ar, gun.id)).toBe(BOOST);
    expect(BOOST).toBeCloseTo(1.15);
    expect(ar.stats).toMatchObject({ hits: 1, perfects: 0, jams: 0 });
  });

  it("a press at the zone's leading edge is perfect", () => {
    const ar = createActiveReload();
    startReload(ar, gun, 0);
    expect(pressReload(ar, at(0, 0.52))).toBe("perfect");
    expect(ar.stats).toMatchObject({ hits: 1, perfects: 1 });
    expect(ar.last.outcome).toBe("perfect");
  });

  it("a press outside the zone jams: the reload runs longer, and a second press does nothing", () => {
    for (const t of [0.2, 0.9]) {
      const ar = createActiveReload();
      startReload(ar, gun, 0);
      expect(pressReload(ar, at(0, t))).toBe("jam");
      expect(pressReload(ar, at(0, 0.6))).toBeNull();
      expect(updateReload(ar, 1000)).toBeNull();
      expect(updateReload(ar, 1000 + JAM_MS)).toBe(gun.id);
      expect(boostFor(ar, gun.id)).toBe(1);
      expect(ar.stats.jams).toBe(1);
    }
  });

  it("a press with no reload running is nothing", () => {
    expect(pressReload(createActiveReload(), 100)).toBeNull();
  });

  it("cancels (a weapon switch) without finishing or boosting", () => {
    const ar = createActiveReload();
    startReload(ar, gun, 0);
    expect(cancelReload(ar)).toBe(true);
    expect(updateReload(ar, 5000)).toBeNull();
    expect(pressReload(ar, 600)).toBeNull();
    expect(ar.stats).toMatchObject({ cancels: 1, reloads: 0 });
  });

  it("the boost is spent with its magazine, and a new reload replaces it", () => {
    const ar = createActiveReload();
    startReload(ar, gun, 0);
    pressReload(ar, at(0, 0.6));
    spendBoost(ar, gun.id);
    expect(boostFor(ar, gun.id)).toBe(1);
    startReload(ar, gun, 2000);
    pressReload(ar, at(2000, 0.6));
    expect(boostFor(ar, gun.id)).toBe(BOOST);
    startReload(ar, gun, 4000);
    expect(boostFor(ar, gun.id)).toBe(1);
  });

  it("Conditioning's modifiers shorten the bar and widen the zone about its middle", () => {
    const base = reloadWindow(gun);
    const fit = reloadWindow(gun, { reloadMult: 0.85, zoneMult: 1.3 });
    expect(fit.duration).toBeCloseTo(850);
    expect(fit.zoneEnd - fit.zoneStart).toBeCloseTo((base.zoneEnd - base.zoneStart) * 1.3);
    expect((fit.zoneStart + fit.zoneEnd) / 2).toBeCloseTo((base.zoneStart + base.zoneEnd) / 2);
  });
});

describe("every weapon's reload", () => {
  it("has a magazine, a reload time and a zone inside the bar", () => {
    for (const w of WEAPONS) {
      expect(w.magSize, w.name).toBeGreaterThanOrEqual(w.ammoPerShot);
      expect(w.reloadMs, w.name).toBeGreaterThan(500);
      const [s, width] = w.reloadZone;
      expect(s, w.name).toBeGreaterThan(0.2);
      expect(s + width, w.name).toBeLessThan(0.95);
    }
  });

  it("the sidearm's zone is the most generous and the sniper's the tightest", () => {
    const width = (name) => WEAPONS.find((w) => w.name === name).reloadZone[1];
    const widths = WEAPONS.map((w) => w.reloadZone[1]);
    expect(width("Chrono Pistol")).toBe(Math.max(...widths));
    expect(width("Temporal Sniper")).toBe(Math.min(...widths));
  });
});
