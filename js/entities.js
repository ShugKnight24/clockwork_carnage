import { WEAPONS, ENEMY_TYPES } from "./data.js";
import {
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Y,
  PLAYER_SPAWN_ANGLE,
  PLAYER_MAX_HP,
  TWO_PI,
} from "../src/constants.js";

/**
 * Player entity representing the player character.
 * Manages player state, stats, weapons, and abilities.
 */
export class Player {
  /**
   * Creates a new Player instance.
   * @param {number} x - Initial X position (default: PLAYER_SPAWN_X)
   * @param {number} y - Initial Y position (default: PLAYER_SPAWN_Y)
   * @param {number} angle - Initial facing angle in radians (default: PLAYER_SPAWN_ANGLE)
   */
  constructor(x = PLAYER_SPAWN_X, y = PLAYER_SPAWN_Y, angle = PLAYER_SPAWN_ANGLE) {
    this.reset(x, y, angle);
  }

  /**
   * Resets player to initial state.
   * @param {number} x - Reset X position
   * @param {number} y - Reset Y position
   * @param {number} angle - Reset facing angle
   */
  reset(x = PLAYER_SPAWN_X, y = PLAYER_SPAWN_Y, angle = PLAYER_SPAWN_ANGLE) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.aimOffsetX = 0;
    this.aimOffsetY = 0;
    this.health = PLAYER_MAX_HP;
    this.maxHealth = PLAYER_MAX_HP;
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
    this.isAiming = false;
    this.weaponBob = 0;
    this.weaponKick = 0;
    this.cameraPunch = 0; // Vertical camera recoil (radians); decays each frame
    this.hurtTime = 0;
    this.alive = true;
    // Sprint & Dash
    this.stamina = PLAYER_MAX_HP;
    this.maxStamina = PLAYER_MAX_HP;
    this.isSprinting = false;
    this.isDashing = false;
    // Crouch & Slide
    this.isCrouching = false;
    this.isSliding = false;
    this.slideTime = 0;
    this.slideDirX = 0;
    this.slideDirY = 0;
    this.slideCooldown = 0;
    this.slideDuration = 0.6; // seconds
    this.slideSpeedMult = 3.0; // multiplier of base moveSpeed at start
    this.slideStaminaCost = 18;
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
    this.chronoEnergy = PLAYER_MAX_HP / 2; // 0–100, starts half-charged
    this.maxChronoEnergy = PLAYER_MAX_HP;
    this.chronoActive = false;
    this.particles = [];
  }
  /**
   * Gets the weapon definition for the currently equipped weapon.
   * @returns {Object} Weapon definition from WEAPONS data
   */
  getWeaponDef() {
    return WEAPONS[this.weapons[this.currentWeapon]];
  }

  /**
   * Serializable player stats for save/load.
   * List of property names that should be persisted.
   */
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
    "aimOffsetX",
    "aimOffsetY",
  ];

  /**
   * Serializes player state to a plain object for saving.
   * @returns {Object} Serialized player data
   */
  serialize() {
    const data = {};
    for (const key of Player.SAVE_FIELDS) data[key] = this[key];
    return data;
  }

  /**
   * Deserializes player state from a saved object.
   * @param {Object} data - Saved player data
   */
  deserialize(data) {
    for (const key of Player.SAVE_FIELDS) {
      if (key in data) this[key] = data[key];
    }
  }
}

/**
 * Enemy entity representing hostile NPCs.
 * Behavior and stats are defined by enemy type.
 */
export class Enemy {
  /**
   * Creates a new Enemy instance.
   * @param {number} x - Spawn X position
   * @param {number} y - Spawn Y position
   * @param {string} type - Enemy type key from ENEMY_TYPES
   */
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
    this.angle = Math.random() * TWO_PI;
    this.painTimer = 0;
    this.alertRange = def.sightRange;
    // Per-type chrono reaction multiplier (used when Chrono Shift is active).
    this.chronoMultiplier = Number.isFinite(def.chronoMultiplier)
      ? def.chronoMultiplier
      : 0.15;
  }
}

/**
 * Pickup entity representing collectible items (health, ammo, weapons).
 */
export class Pickup {
  /**
   * Creates a new Pickup instance.
   * @param {number} x - Spawn X position
   * @param {number} y - Spawn Y position
   * @param {string} type - Pickup type ("health", "ammo", "weapon")
   * @param {Object} extra - Additional properties (e.g., weaponId for weapon pickups)
   */
  constructor(x, y, type, extra = {}) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.weaponId = extra.weaponId;
  }
}

/**
 * Environmental prop — non-interactive billboard decoration.
 */
export class Prop {
  constructor(x, y, propType) {
    this.x = x;
    this.y = y;
    this.type = "prop";
    this.propType = propType;
    this.active = true;
  }
}

/**
 * Projectile entity representing bullets and other fired projectiles.
 */
export class Projectile {
  /**
   * Creates a new Projectile instance.
   * @param {number} x - Initial X position
   * @param {number} y - Initial Y position
   * @param {number} dirX - X direction component (normalized)
   * @param {number} dirY - Y direction component (normalized)
   * @param {number} damage - Damage dealt on hit
   * @param {number} speed - Movement speed in units per second
   * @param {string} owner - Owner identifier ("player" or enemy ID)
   */
  constructor(x, y, dirX, dirY, damage, speed, owner) {
    this.x = x;
    this.y = y;
    this.dirX = dirX;
    this.dirY = dirY;
    this.originX = x;
    this.originY = y;
    this.damage = damage;
    this.speed = speed;
    this.owner = owner;
    this.type = "projectile";
    this.active = true;
    this.color = "#ff0044";
    this.pitch = 0;
    this.life = 3; // seconds
  }
}
