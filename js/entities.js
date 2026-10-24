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
    // Rounds carried per weapon id, each up to its maxAmmo × ammoCap. A gun
    // is stocked with its startAmmo the first time it is held (reserveOf).
    this.reserves = {};
    // Rounds loaded per weapon id, out of (never on top of) its reserve. A
    // gun first held comes loaded (loadedOf).
    this.mags = {};
    this.ammoCap = 1;
    this.moveSpeed = 3.5;
    this.rotSpeed = 3.0;
    this.weapons = [0]; // weapon IDs owned
    this.currentWeapon = 0;
    // Slot held before the latest switch (the pad's last-weapon button).
    this.lastWeapon = -1;
    this._weaponSeen = 0;
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
    // Viewmodel sway — the gun lags behind look/strafe input then springs back.
    // Purely cosmetic: never read by aim or collision.
    this.weaponSwayX = 0;
    this.weaponSwayY = 0;
    this.weaponSwayTargetX = 0;
    this.weaponSwayTargetY = 0;
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
    // 0 = standing, 1 = fully lowered. Eased, so the camera settles into a
    // crouch instead of snapping 28px in one frame.
    this.crouchBlend = 0;
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
    // Conditioning (src/systems/conditioning.js), set by the game each frame
    // and kept apart from maxStamina, which levels, loadouts and gear write.
    this.condRegenMult = 1;
    this.condStaminaBonus = 0;
    // Chrono Shift (player-activated time slow)
    this.chronoEnergy = PLAYER_MAX_HP / 2; // 0–100, starts half-charged
    this.maxChronoEnergy = PLAYER_MAX_HP;
    this.chronoActive = false;
    this.particles = [];
  }

  /**
   * Once a frame: note a weapon switch, whatever made it (keys, wheel, pad,
   * touch, a pickup), so lastWeapon is always the one held before.
   */
  trackWeapon() {
    if (this.currentWeapon === this._weaponSeen) return;
    if (this._weaponSeen >= 0) this.lastWeapon = this._weaponSeen;
    this._weaponSeen = this.currentWeapon;
  }

  /**
   * Gets the weapon definition for the currently equipped weapon.
   * @returns {Object} Weapon definition from WEAPONS data
   */
  getWeaponDef() {
    return WEAPONS[this.weapons[this.currentWeapon]];
  }

  /** Rounds carried for weapon `id`; a gun never held before comes with its startAmmo. */
  reserveOf(id) {
    if (this.reserves[id] === undefined) this.reserves[id] = WEAPONS[id]?.startAmmo ?? 0;
    return this.reserves[id];
  }

  /** The most weapon `id` can carry. */
  ammoCapOf(id) {
    return Math.round((WEAPONS[id]?.maxAmmo ?? 0) * (this.ammoCap || 1));
  }

  /**
   * Add `n` rounds to weapon `id`, up to its cap. Never lowers a reserve that
   * is already over it (a debug fill, a cap upgrade lost on retry). Returns
   * the rounds actually added.
   */
  addAmmo(id, n) {
    const have = this.reserveOf(id);
    const next = Math.max(have, Math.min(this.ammoCapOf(id), have + Math.round(n)));
    this.reserves[id] = next;
    return next - have;
  }

  /**
   * An ammo crate's worth (`packs` of them) for every gun carried: each takes
   * its own pickupAmmo, so a crate is a few shells or one sniper round, not a
   * pool any gun can drain. Returns the rounds added in all.
   */
  addAmmoPacks(packs = 1) {
    let added = 0;
    for (const id of this.weapons) {
      if (WEAPONS[id]?.infiniteAmmo) continue;
      added += this.addAmmo(id, (WEAPONS[id]?.pickupAmmo ?? 0) * packs);
    }
    return added;
  }

  /** Rounds weapon `id`'s magazine holds. */
  magSizeOf(id) {
    return WEAPONS[id]?.magSize ?? 1;
  }

  /** Rounds loaded in weapon `id`: never more than it carries. */
  loadedOf(id) {
    const def = WEAPONS[id];
    const carried = def?.infiniteAmmo ? Infinity : this.reserveOf(id);
    if (this.mags[id] === undefined) this.mags[id] = Math.min(this.magSizeOf(id), carried);
    else if (this.mags[id] > carried) this.mags[id] = carried;
    return this.mags[id];
  }

  /** Whether a reload would put more rounds in weapon `id`. */
  canReload(id) {
    const loaded = this.loadedOf(id);
    if (loaded >= this.magSizeOf(id)) return false;
    return !!WEAPONS[id]?.infiniteAmmo || this.reserveOf(id) > loaded;
  }

  /** Fill weapon `id`'s magazine from what it carries. */
  refillMag(id) {
    const carried = WEAPONS[id]?.infiniteAmmo ? Infinity : this.reserveOf(id);
    this.mags[id] = Math.min(this.magSizeOf(id), carried);
  }

  /** Fire `n` rounds of weapon `id`: out of the magazine and, but for the sidearm, the reserve. */
  spendRounds(id, n) {
    this.mags[id] = Math.max(0, this.loadedOf(id) - n);
    if (!WEAPONS[id]?.infiniteAmmo) this.reserves[id] = Math.max(0, this.reserveOf(id) - n);
  }

  /** The held gun's loaded rounds. */
  get loaded() {
    const id = this.weapons?.[this.currentWeapon];
    return id === undefined ? 0 : this.loadedOf(id);
  }

  /** Max stamina with Conditioning's bonus: what regen fills to and the HUD's bar measures. */
  get staminaCap() {
    return this.maxStamina + (this.condStaminaBonus || 0);
  }

  /** The held gun's rounds. The sidearm never spends any. */
  get ammo() {
    const id = this.weapons?.[this.currentWeapon];
    return id === undefined ? 0 : this.reserveOf(id);
  }

  set ammo(v) {
    const id = this.weapons?.[this.currentWeapon];
    if (id !== undefined && this.reserves) this.reserves[id] = v;
  }

  /** A quarter of the held gun's cap or less (never for the sidearm): the HUD's LOW AMMO. */
  get ammoLow() {
    const wep = this.getWeaponDef();
    if (!wep || wep.infiniteAmmo) return false;
    return this.ammo <= Math.max(wep.ammoPerShot || 1, Math.ceil(this.ammoCapOf(wep.id) * 0.25));
  }

  /** The held gun's count as the HUD prints it: loaded / the rest carried, the sidearm's endless. */
  get ammoLabel() {
    const wep = this.getWeaponDef();
    if (!wep) return `${this.ammo}`;
    const loaded = this.loadedOf(wep.id);
    return `${loaded}/${wep.infiniteAmmo ? "\u221e" : Math.max(0, this.ammo - loaded)}`;
  }

  /**
   * Serializable player stats for save/load.
   * List of property names that should be persisted.
   */
  static SAVE_FIELDS = [
    "health",
    "maxHealth",
    "armor",
    "reserves",
    "ammoCap",
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
    this.state = "idle"; // idle, chase, windup, attack, pain, dead
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
   * @param {string} type - Pickup type ("health", "ammo", "weapon", "gear")
   * @param {Object} extra - Additional properties: weaponId for weapons, or
   *   slot/index/name/kind for a gear drop.
   */
  constructor(x, y, type, extra = {}) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.active = true;
    this.weaponId = extra.weaponId;
    // Gear drops carry which cosmetic slot and option they hand over.
    this.slot = extra.slot;
    this.slotIndex = extra.slotIndex;
    this.label = extra.label;
    this.kind = extra.kind;
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
