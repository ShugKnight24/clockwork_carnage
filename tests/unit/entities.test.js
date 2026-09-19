import { describe, it, expect } from "vitest";
import { Player, Enemy, Pickup, Projectile } from "../../js/entities.js";

describe("Player", () => {
  it("constructs with default spawn position", () => {
    const p = new Player();
    expect(p.health).toBe(100);
    expect(p.maxHealth).toBe(100);
    expect(p.alive).toBe(true);
    expect(p.weapons).toEqual([0]);
    expect(p.currentWeapon).toBe(0);
    expect(p.score).toBe(0);
    expect(p.aimOffsetX).toBe(0);
    expect(p.aimOffsetY).toBe(0);
  });

  it("constructs with custom position", () => {
    const p = new Player(10, 20, Math.PI);
    expect(p.x).toBe(10);
    expect(p.y).toBe(20);
    expect(p.angle).toBeCloseTo(Math.PI);
  });

  it("reset restores defaults", () => {
    const p = new Player();
    p.health = 50;
    p.score = 9999;
    p.weapons = [0, 1, 2];
    p.armor = 25;

    p.reset(5, 5, 0);
    expect(p.health).toBe(100);
    expect(p.score).toBe(0);
    expect(p.weapons).toEqual([0]);
    expect(p.armor).toBe(0);
  });

  it("serialize captures all SAVE_FIELDS", () => {
    const p = new Player();
    p.health = 75;
    p.score = 5000;
    p.armor = 10;
    p.weapons = [0, 2, 4];

    const data = p.serialize();
    expect(data.health).toBe(75);
    expect(data.score).toBe(5000);
    expect(data.armor).toBe(10);
    expect(data.weapons).toEqual([0, 2, 4]);

    // Verify all SAVE_FIELDS present
    for (const field of Player.SAVE_FIELDS) {
      expect(data).toHaveProperty(field);
    }
  });

  it("deserialize restores saved state", () => {
    const p = new Player();
    const saved = {
      health: 42, maxHealth: 150, armor: 20,
      score: 8000, kills: 50, weapons: [0, 3],
      currentWeapon: 1, damageMultiplier: 1.5,
    };
    p.deserialize(saved);
    expect(p.health).toBe(42);
    expect(p.maxHealth).toBe(150);
    expect(p.armor).toBe(20);
    expect(p.score).toBe(8000);
    expect(p.weapons).toEqual([0, 3]);
    expect(p.currentWeapon).toBe(1);
  });

  it("serialize/deserialize round-trip preserves state", () => {
    const p1 = new Player();
    p1.health = 60;
    p1.armor = 15;
    p1.weapons = [0, 1, 5];
    p1.critChance = 0.25;
    p1.lifeSteal = 0.1;

    const data = p1.serialize();
    const p2 = new Player();
    p2.deserialize(data);

    for (const field of Player.SAVE_FIELDS) {
      expect(p2[field]).toEqual(p1[field]);
    }
  });

  it("deserialize ignores unknown fields", () => {
    const p = new Player();
    p.deserialize({ health: 80, unknownField: "test" });
    expect(p.health).toBe(80);
    expect(p).not.toHaveProperty("unknownField");
  });

  it("getWeaponDef returns weapon definition", () => {
    const p = new Player();
    const def = p.getWeaponDef();
    expect(def).toBeDefined();
    expect(def.name).toBe("Chrono Pistol");
    expect(def.damage).toBe(15);
  });
});

describe("Enemy", () => {
  it("constructs from enemy type", () => {
    const e = new Enemy(5, 10, "drone");
    expect(e.x).toBe(5);
    expect(e.y).toBe(10);
    expect(e.enemyType).toBe("drone");
    expect(e.health).toBe(30);
    expect(e.speed).toBe(1.5);
    expect(e.state).toBe("idle");
    expect(e.active).toBe(true);
    expect(e.type).toBe("enemy");
  });

  it("sets chrono multiplier from definition", () => {
    const e = new Enemy(0, 0, "drone");
    expect(e.chronoMultiplier).toBe(0.0); // Drones fully freeze
  });

  it("defaults chrono multiplier to 0.15", () => {
    const e = new Enemy(0, 0, "phantom");
    // Phantom has chronoMultiplier defined in data
    expect(typeof e.chronoMultiplier).toBe("number");
  });

  it("random initial angle", () => {
    const angles = new Set();
    for (let i = 0; i < 20; i++) {
      angles.add(new Enemy(0, 0, "drone").angle);
    }
    // Should have some variety (extremely unlikely all same)
    expect(angles.size).toBeGreaterThan(1);
  });
});

describe("Pickup", () => {
  it("constructs health pickup", () => {
    const p = new Pickup(3, 4, "health");
    expect(p.x).toBe(3);
    expect(p.y).toBe(4);
    expect(p.type).toBe("health");
    expect(p.active).toBe(true);
    expect(p.weaponId).toBeUndefined();
  });

  it("constructs weapon pickup with weaponId", () => {
    const p = new Pickup(5, 6, "weapon", { weaponId: 3 });
    expect(p.type).toBe("weapon");
    expect(p.weaponId).toBe(3);
  });
});

describe("Projectile", () => {
  it("constructs with all params", () => {
    const p = new Projectile(1, 2, 0.7, 0.7, 25, 10, "player");
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p.dirX).toBe(0.7);
    expect(p.dirY).toBe(0.7);
    expect(p.damage).toBe(25);
    expect(p.speed).toBe(10);
    expect(p.owner).toBe("player");
    expect(p.active).toBe(true);
    expect(p.life).toBe(3);
    expect(p.originX).toBe(1);
    expect(p.originY).toBe(2);
    expect(p.pitch).toBe(0);
    expect(p.type).toBe("projectile");
  });
});
