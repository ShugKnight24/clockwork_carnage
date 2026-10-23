import { describe, it, expect } from "vitest";
import { AISystem } from "../../src/systems/ai.js";
import { Enemy } from "../../js/entities.js";
import { FORMS } from "../../src/systems/paradox-forms.js";

const DT = 1 / 60;
const openMap = () => ({ width: 30, height: 30, grid: Array.from({ length: 30 }, () => new Array(30).fill(0)) });
const sounds = [];
const audio = { calculatePan: () => 0, enemyShoot: () => {}, enemyHit: () => {}, telegraph: (pan, kind) => sounds.push(kind) };
const ctx = (entities, player, time) => ({ entities, player, map: openMap(), time, timeScale: 1, projectiles: [], chronoBombs: [], damageNumbers: [], audio });

describe("front shields can be flanked", () => {
  it("turns the shield at a limited rate instead of snapping to the player", () => {
    const e = new Enemy(15, 15, "shieldCommander");
    expect(e.def.frontShield).toBe(true);
    e.state = "chase";
    e.angle = 0; // facing +x
    const player = { x: 15, y: 18, angle: 0, chronoActive: false }; // 90° to its side
    const ai = new AISystem();
    ai.update(ctx([e], player, 1000), DT);
    // After one frame it has turned a little toward the player, not all the way.
    expect(e.angle).toBeGreaterThan(0);
    expect(e.angle).toBeLessThan(0.1);
  });
});

describe("boss attacks are telegraphed", () => {
  it("announces a charge and only starts it after the wind-up", () => {
    sounds.length = 0;
    const e = new Enemy(10, 15, "boss");
    e.state = "chase";
    const player = { x: 18, y: 15, angle: Math.PI, chronoActive: false };
    const ai = new AISystem();
    let time = 1000;
    const step = () => { time += DT * 1000; return ai.update(ctx([e], player, time), DT); };
    step();
    expect(sounds).toContain("charge");
    expect(e._bossCharging).toBeFalsy();
    const tell = FORMS[1].charge.windup;
    for (let i = 0; i < Math.round((tell * 0.8) / DT); i++) step();
    expect(e._bossCharging).toBeFalsy();
    for (let i = 0; i < Math.round((tell * 0.3) / DT); i++) step();
    expect(e._bossCharging || e._bossChargeTimer > 0).toBeTruthy();
  });
});
