/**
 * Clockwork Carnage - Game Constants
 * 
 * Centralized constants to improve code readability and maintainability.
 * All magic numbers should be defined here with descriptive names.
 */

// ============================================================================
// GAME CONFIGURATION
// ============================================================================

/** Current game version */
export const GAME_VERSION = "0.8.1";

/** Maximum number of players in multiplayer */
export const MAX_PLAYERS = 8;

// ============================================================================
// TIMING & PERFORMANCE
// ============================================================================

/** Double-tap detection window in milliseconds */
export const DOUBLE_TAP_WINDOW_MS = 250;

// ============================================================================
// PLAYER PHYSICS & MOVEMENT
// ============================================================================

/** Player default spawn position X */
export const PLAYER_SPAWN_X = 2;

/** Player default spawn position Y */
export const PLAYER_SPAWN_Y = 2;

/** Player default spawn angle */
export const PLAYER_SPAWN_ANGLE = 0;

/** Reticle free-aim limits in screen fraction from center */
export const PLAYER_AIM_LIMIT_X = 0.18;
export const PLAYER_AIM_LIMIT_Y = 0.30;

/** Mouse-look: every pixel of mouse motion drives the reticle; overflow
 *  past the deadzone edge then turns the camera. One scalar drives both. */
export const PLAYER_AIM_SENSITIVITY = 0.0017;
export const PLAYER_MOUSE_TURN_RATE = 0.002;

/** Reticle decay rate when player is walking (per second). Gentle: bullets
 *  always land exactly where the crosshair was painted; recenter just
 *  smooths the reticle back as the player runs forward. */
export const PLAYER_AIM_RECENTER = 0.6;

/** Collision detection margin */
export const COLLISION_MARGIN = 0.3;

// ============================================================================
// COMBAT & DAMAGE
// ============================================================================

/** Player maximum health points */
export const PLAYER_MAX_HP = 100;

/** Bullet damage per hit */
export const BULLET_DAMAGE = 15;

/** Bullet speed in units per second */
export const BULLET_SPEED = 20;

/** Enemy hit capsules are matched to rendered sprite width, not tiny AI body
 * radius. Most enemies render as ~1 world-unit wide billboards, so 0.5 means
 * shots landing on the visible body edge still count. */
export const ENEMY_HIT_RADIUS_MIN = 0.5;
export const ENEMY_HIT_RADIUS_PAD = 0.04;
export const ENEMY_HIT_HEIGHT_PAD = 0.16;
export const ENEMY_HIT_ANGLE_MIN = 0.012;
export const ENEMY_HIT_VERTICAL_ANGLE_MIN = 0.016;

/** Hit-zone damage multipliers and forgiveness pads.
 *  Headshots use tighter angular pad (less forgiving than body) so precision
 *  is rewarded. Crit and headshot stack multiplicatively. */
export const HEADSHOT_MULT = 2.5;
export const HEADSHOT_PRECISION_PAD = 0.4; // multiplier on body angular pad
export const ZONE_RADIUS_PAD = 0.02;

/** Aim-down-sights: same effective FOV must drive both rendering and bullets. */
export const PLAYER_ADS_FOV_MULT = 0.72;
export const PLAYER_ADS_MOVE_MULT = 0.75;
export const PLAYER_ADS_SPREAD_MULT = 0.45;

/**
 * Enemy attack telegraph. Every attack now passes through a windup state so the
 * player can see it coming. Melee gets longer because it cannot be dodged once
 * it lands; ranged is shorter because the projectile still has to travel.
 * Per-type `attackWindupMs` in ENEMY_TYPES overrides these.
 */
export const ENEMY_MELEE_WINDUP_MS = 400;
export const ENEMY_RANGED_WINDUP_MS = 220;
/** Melee resolves against current distance; this much slack past attackRange still connects. */
export const ENEMY_MELEE_WHIFF_SLACK = 1.15;

// ============================================================================
// RENDERING & GRAPHICS
// ============================================================================

/** Maximum raycast distance in builder mode */
export const MAX_RAYCAST_DIST = 10;

/** Viewport height threshold for compact mobile layout */
export const COMPACT_PHONE_HEIGHT = 420;

// ============================================================================
// BUILDER MODE
// ============================================================================

/** Default map size for builder */
export const DEFAULT_MAP_SIZE = 32;

/** Number of height layers in builder */
export const NUM_LAYERS = 5;

// ============================================================================
// NETWORK/MULTIPLAYER
// ============================================================================

/** Arena size in grid units */
export const ARENA_SIZE = 40;

// ============================================================================
// STORAGE KEYS
// ============================================================================

/** LocalStorage key for keybinds */
export const STORAGE_KEY_KEYBINDS = "cc_keybinds";

// ============================================================================
// MATH CONSTANTS
// ============================================================================

/** Two times PI (360 degrees in radians) */
export const TWO_PI = Math.PI * 2;

