import { WEAPONS, ENEMY_TYPES } from "./data.js";

export class Player {
  constructor(x = 2, y = 2, angle = 0) {
    this.reset(x, y, angle);
  }
  reset(x = 2, y = 2, angle = 0) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 0;
    this.ammo = 50;
    this.moveSpeed = 3.5;
    this.rotSpeed = 3.0;
    this.weapons = [0]; // weapon IDs owned
    this.currentWeapon = 0;
    this.damageMultiplier = 1;
    this.regenRate = 0;
    this.critChance = 0;
    this.lifeSteal = 0;
    this.splashDamage = 0;
    this.fireRateMultiplier = 1;
    this.dodgeChance = 0;
    this.maxShield = 0;
    this.shield = 0;
    this.multiShot = 1;
    this.thorns = 0;
    this.score = 0;
    this.kills = 0;
    this.secretsFound = 0;
    this.lastFireTime = 0;
    this.isFiring = false;
    this.weaponBob = 0;
    this.weaponKick = 0;
    this.hurtTime = 0;
    this.alive = true;
    // Sprint & Dash
    this.stamina = 100;
    this.maxStamina = 100;
    this.isSprinting = false;
    this.isDashing = false;
    this.dashTime = 0;
    this.dashDirX = 0;
    this.dashDirY = 0;
    this.dashCooldown = 0;
    this.staminaRegenDelay = 0;
    // Upgrade-driven stamina modifiers
    this.staminaRegenRate = 1; // multiplier for stamina regen speed
    this.dashDistMult = 1; // multiplier for dash distance/speed
    this.dashStaminaCost = 20; // stamina cost per dash
    this.sprintDrainMult = 1; // multiplier for sprint drain rate
    // Chrono Shift (player-activated time slow)
    this.chronoEnergy = 50; // 0–100, starts half-charged
    this.maxChronoEnergy = 100;
    this.chronoActive = false;
  }
  getWeaponDef() {
    return WEAPONS[this.weapons[this.currentWeapon]];
  }

  /** Serializable player stats for save/load */
  static SAVE_FIELDS = [
    "health",
    "maxHealth",
    "armor",
    "ammo",
    "weapons",
    "currentWeapon",
    "moveSpeed",
    "damageMultiplier",
    "regenRate",
    "critChance",
    "lifeSteal",
    "splashDamage",
    "fireRateMultiplier",
    "dodgeChance",
    "maxShield",
    "shield",
    "multiShot",
    "thorns",
    "score",
    "kills",
    "secretsFound",
    "staminaRegenRate",
    "dashDistMult",
    "dashStaminaCost",
    "sprintDrainMult",
    "chronoEnergy",
    "maxChronoEnergy",
  ];

  serialize() {
    const data = {};
    for (const key of Player.SAVE_FIELDS) data[key] = this[key];
    return data;
  }

  deserialize(data) {
    for (const key of Player.SAVE_FIELDS) {
      if (key in data) this[key] = data[key];
    }
  }
}

export class Enemy {
  constructor(x, y, type) {
    const def = ENEMY_TYPES[type];
    this.x = x;
    this.y = y;
    this.enemyType = type;
    this.def = def;
    this.health = def.health;
    this.maxHealth = def.health;
    this.speed = def.speed;
    this.state = "idle"; // idle, chase, attack, pain, dead
    this.active = true;
    this.lastAttackTime = 0;
    this.hitTime = 0;
    this.stateTime = 0;
    this.type = "enemy";
    this.angle = Math.random() * Math.PI * 2;
    this.painTimer = 0;
    this.alertRange = def.sightRange;
  }
}

export class Pickup {
  constructor(x, y, type, extra = {}) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.weaponId = extra.weaponId;
  }
}

export class Projectile {
  constructor(x, y, dirX, dirY, damage, speed, owner) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.damage = damage;
    this.speed = speed;
    this.owner = owner;
    this.type = "projectile";
    this.active = true;
    this.color = "#ff0044";
    this.life = 3; // seconds
  }
}
