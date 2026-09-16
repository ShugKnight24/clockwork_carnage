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

/** Milliseconds in one second */
export const ONE_SECOND_MS = 1000;

/** Double-tap detection window in milliseconds */
export const DOUBLE_TAP_WINDOW_MS = 250;

/** Cutscene skip hold duration in milliseconds */
export const CUTSCENE_SKIP_HOLD_MS = 1000;

/** Server tick rate (ticks per second) */
export const SERVER_TICK_RATE = 20;

/** Server tick interval in milliseconds */
export const SERVER_TICK_MS = ONE_SECOND_MS / SERVER_TICK_RATE;

/** Maximum consecutive errors before halting game loop */
export const MAX_CONSECUTIVE_ERRORS = 60;

/** Footstep sound cadence in milliseconds */
export const FOOTSTEP_CADENCE_MS = 350;

/** Weapon fire rate limit in milliseconds */
export const WEAPON_FIRE_RATE_MS = 200;

// ============================================================================
// PLAYER PHYSICS & MOVEMENT
// ============================================================================

/** Player default spawn position X */
export const PLAYER_SPAWN_X = 2;

/** Player default spawn position Y */
export const PLAYER_SPAWN_Y = 2;

/** Player default spawn angle */
export const PLAYER_SPAWN_ANGLE = 0;

/** Player movement speed in units per second */
export const PLAYER_MOVE_SPEED = 5;

/** Reticle free-aim limits in screen fraction from center */
export const PLAYER_AIM_LIMIT_X = 0.18;
export const PLAYER_AIM_LIMIT_Y = 0.30;

/** Mouse-look: every pixel of mouse motion drives the reticle; overflow
 *  past the deadzone edge then turns the camera. One scalar drives both. */
export const PLAYER_AIM_SENSITIVITY = 0.0017;
export const PLAYER_MOUSE_TURN_RATE = 0.002;

/** @deprecated kept for backward compat; no longer used in player-update.js */
export const PLAYER_AIM_MOUSE_SHARE = 1.0;
export const PLAYER_CAMERA_MOUSE_SHARE = 0.0;

/** Reticle decay rate when player is walking (per second). Gentle: bullets
 *  always land exactly where the crosshair was painted; recenter just
 *  smooths the reticle back as the player runs forward. */
export const PLAYER_AIM_RECENTER = 0.6;

/** Builder mode movement speed */
export const BUILDER_MOVE_SPEED = 8.0;

/** Builder mode vertical rise speed */
export const BUILDER_RISE_SPEED = 4.0;

/** Builder mode pitch limit (radians) */
export const BUILDER_PITCH_LIMIT = 0.85;

/** Collision detection margin */
export const COLLISION_MARGIN = 0.3;

/** Interaction radius for pickups and objects */
export const INTERACTION_RADIUS = 2.5;

/** Minimum distance for collision checks */
export const MIN_COLLISION_DISTANCE = 0.01;

// ============================================================================
// COMBAT & DAMAGE
// ============================================================================

/** Player maximum health points */
export const PLAYER_MAX_HP = 100;

/** Bullet damage per hit */
export const BULLET_DAMAGE = 15;

/** Bullet speed in units per second */
export const BULLET_SPEED = 20;

/** Bullet lifetime in seconds */
export const BULLET_LIFETIME_SEC = 2;

/** Hit detection radius */
export const HIT_DETECTION_RADIUS = 0.5;

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
export const LEG_DAMAGE_MULT = 0.7;
export const CORE_DAMAGE_MULT = 2.5;
export const ARMOR_DAMAGE_MULT = 0.4;
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

/** Hit flash duration in milliseconds */
export const HIT_FLASH_DURATION_MS = 100;

// ============================================================================
// RENDERING & GRAPHICS
// ============================================================================

/** Wall texture resolution */
export const WALL_TEXTURE_SIZE = 256;

/** Legacy wall texture resolution (pre-upgrade) */
export const LEGACY_TEXTURE_SIZE = 64;

/** Maximum raycast distance in builder mode */
export const MAX_RAYCAST_DIST = 10;

/** Maximum raycast iterations for DDA */
export const MAX_RAYCAST_ITERATIONS = 80;

/** Floor/ceiling texture size */
export const FLOOR_CEIL_TEXTURE_SIZE = 256;

/** Viewport height threshold for compact mobile layout */
export const COMPACT_PHONE_HEIGHT = 420;

/** Maximum render dimension for mobile devices */
export const MOBILE_MAX_DIMENSION = 1280;

/** Weapon view scale factor */
export const WEAPON_VIEW_SCALE = 4.8;

/** Third-person camera offset */
export const THIRD_PERSON_CAMERA_OFFSET = 1.8;

/** Maximum camera push-back attempts */
export const MAX_CAMERA_PUSH_ATTEMPTS = 6;

/** Minimap size in pixels */
export const MINIMAP_SIZE_PX = 150;

/** Minimap margin from edge */
export const MINIMAP_MARGIN_PX = 12;

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================

/** Default particle burst count */
export const PARTICLE_BURST_COUNT = 10;

/** Maximum particles in cutscene */
export const MAX_CUTSCENE_PARTICLES = 60;

/** Particle spawn probability per frame */
export const PARTICLE_SPAWN_PROBABILITY = 0.3;

/** Particle floor bounce height */
export const PARTICLE_FLOOR_BOUNCE_HEIGHT = 0.48;

/** Dust mote count */
export const DUST_MOTE_COUNT = 35;

/** Dust mote max Z height */
export const DUST_MOTE_MAX_Z = 0.45;

/** Dust mote min Z height */
export const DUST_MOTE_MIN_Z = -0.9;

/** Dust mote wrap distance */
export const DUST_MOTE_WRAP_DISTANCE = 8;

// ============================================================================
// BUILDER MODE
// ============================================================================

/** Default map size for builder */
export const DEFAULT_MAP_SIZE = 32;

/** Maximum map size */
export const MAX_MAP_SIZE = 128;

/** Minimum map size */
export const MIN_MAP_SIZE = 1;

/** Number of height layers in builder */
export const NUM_LAYERS = 5;

/** Builder segment width */
export const BUILDER_SEGMENT_WIDTH = 15;

/** Maximum undo/redo history size */
export const MAX_HISTORY_SIZE = 200;

/** Builder save flash duration in seconds */
export const BUILDER_SAVE_FLASH_DURATION = 2;

/** Builder placement distance ahead */
export const BUILDER_PLACEMENT_DISTANCE = 3;

/** Maximum map name length */
export const MAX_MAP_NAME_LENGTH = 40;

// ============================================================================
// UI & HUD
// ============================================================================

/** Profiler panel width */
export const PROFILER_PANEL_WIDTH = 220;

/** Profiler panel height */
export const PROFILER_PANEL_HEIGHT = 280;

/** Profiler panel margin */
export const PROFILER_PANEL_MARGIN = 4;

/** Settings panel width */
export const SETTINGS_PANEL_WIDTH = 360;

/** Settings item height */
export const SETTINGS_ITEM_HEIGHT = 52;

/** Settings item height (compact) */
export const SETTINGS_ITEM_HEIGHT_COMPACT = 28;

/** Upgrade card columns */
export const UPGRADE_CARD_COLUMNS = 2;

/** Tutorial menu item height */
export const TUTORIAL_MENU_ITEM_HEIGHT = 52;

/** Touch joystick deadzone in pixels */
export const TOUCH_JOYSTICK_DEADZONE = 20;

/** Touch look deadzone in pixels */
export const TOUCH_LOOK_DEADZONE = 15;

/** Touch button hit shrink factor */
export const TOUCH_BUTTON_HIT_SHRINK = 0.85;

/** Touch look hint duration in seconds */
export const TOUCH_LOOK_HINT_DURATION = 6;

/** Touch look hint fade start in seconds */
export const TOUCH_LOOK_HINT_FADE_START = 5;

// ============================================================================
// AUDIO
// ============================================================================

/** Master volume (0-1) */
export const AUDIO_MASTER_VOLUME = 0.8;

/** SFX volume (0-1) */
export const AUDIO_SFX_VOLUME = 1.0;

/** Music volume (0-1) */
export const AUDIO_MUSIC_VOLUME = 0.15;

/** Ambient volume (0-1) */
export const AUDIO_AMBIENT_VOLUME = 0.12;

/** Music tempo (BPM) */
export const MUSIC_TEMPO_BPM = 130;

/** Typewriter characters per second */
export const TYPEWRITER_CHARS_PER_SEC = 25;

/** Comic panel typewriter speed */
export const COMIC_TYPEWRITER_CHARS_PER_SEC = 35;

// ============================================================================
// MELTDOWN MODE
// ============================================================================

/** Meltdown weapon spawn segment interval */
export const MELTDOWN_WEAPON_SPAWN_INTERVAL = 5;

/** Meltdown weapon spawn probability */
export const MELTDOWN_WEAPON_SPAWN_PROBABILITY = 0.3;

/** Meltdown weapon spawn start segment */
export const MELTDOWN_WEAPON_SPAWN_START = 8;

/** Meltdown enemy spawn probability */
export const MELTDOWN_ENEMY_SPAWN_PROBABILITY = 0.4;

/** Meltdown enemy spawn start segment */
export const MELTDOWN_ENEMY_SPAWN_START = 5;

/** Meltdown heat warning threshold */
export const MELTDOWN_HEAT_WARNING = 10;

/** Meltdown max heat */
export const MELTDOWN_MAX_HEAT = 100;

// ============================================================================
// ANIMATION & EFFECTS
// ============================================================================

/** Weapon animation frame for muzzle flash */
export const WEAPON_ANIM_MUZZLE_FLASH_FRAME = 1;

/** Weapon animation frame for recoil */
export const WEAPON_ANIM_RECOIL_FRAME = 2;

/** Weapon animation frame for shell ejection */
export const WEAPON_ANIM_SHELL_EJECT_FRAME = 2;

/** Weapon animation frame for smoke */
export const WEAPON_ANIM_SMOKE_FRAME = 3;

/** Muzzle flash spike count */
export const MUZZLE_FLASH_SPIKE_COUNT = 8;

/** Scanline spacing in pixels */
export const SCANLINE_SPACING = 3;

/** Scanline alternate spacing */
export const SCANLINE_ALTERNATE_SPACING = 6;

// ============================================================================
// CUTSCENE CONFIGURATION
// ============================================================================

/** Cutscene panel reveal delay in milliseconds */
export const CUTSCENE_PANEL_DELAY_MS = 800;

/** Cutscene panel reveal duration in milliseconds */
export const CUTSCENE_PANEL_REVEAL_MS = 350;

/** Cutscene panel fade duration in milliseconds */
export const CUTSCENE_PANEL_FADE_MS = 300;

/** Cutscene caption delay in milliseconds */
export const CUTSCENE_CAPTION_DELAY_MS = 400;

/** Cutscene caption fade duration in milliseconds */
export const CUTSCENE_CAPTION_FADE_MS = 400;

/** Cutscene SFX delay in milliseconds */
export const CUTSCENE_SFX_DELAY_MS = 150;

/** Cutscene SFX scale duration in milliseconds */
export const CUTSCENE_SFX_SCALE_MS = 200;

/** Cutscene SFX fade start in milliseconds */
export const CUTSCENE_SFX_FADE_START_MS = 2000;

/** Cutscene SFX fade duration in milliseconds */
export const CUTSCENE_SFX_FADE_MS = 500;

/** Power level scanner ramp duration in seconds */
export const POWER_SCANNER_RAMP_DURATION = 3.5;

/** Power level scanner blowoff duration in seconds */
export const POWER_SCANNER_BLOWOFF_DURATION = 3.0;

/** Power level warning threshold */
export const POWER_LEVEL_WARNING = 8000;

/** Power level target (over 9000!) */
export const POWER_LEVEL_TARGET = 9000;

// ============================================================================
// GAMEPAD CONFIGURATION
// ============================================================================

/** Gamepad deadzone threshold */
export const GAMEPAD_DEADZONE = 0.15;

/** Gamepad trigger threshold */
export const GAMEPAD_TRIGGER_THRESHOLD = 0.1;

/** Gamepad vibration pulse count */
export const GAMEPAD_VIBRATION_PULSE_COUNT = 3;

/** Gamepad vibration pulse interval in milliseconds */
export const GAMEPAD_VIBRATION_PULSE_INTERVAL_MS = 100;

/** Gamepad vibration duration in milliseconds */
export const GAMEPAD_VIBRATION_DURATION_MS = 60;

/** Gamepad vibration weak magnitude */
export const GAMEPAD_VIBRATION_WEAK = 0.3;

/** Gamepad vibration strong magnitude */
export const GAMEPAD_VIBRATION_STRONG = 0.4;

// ============================================================================
// NETWORK/MULTIPLAYER
// ============================================================================

/** Default server port */
export const DEFAULT_SERVER_PORT = 8080;

/** Arena size in grid units */
export const ARENA_SIZE = 40;

// ============================================================================
// VISUAL EFFECTS
// ============================================================================

/** Distance fog maximum opacity (brutal style) */
export const FOG_MAX_OPACITY_BRUTAL = 0.92;

/** Distance fog maximum opacity (normal style) */
export const FOG_MAX_OPACITY_NORMAL = 0.7;

/** Wall fog maximum opacity (brutal style) */
export const WALL_FOG_MAX_BRUTAL = 0.85;

/** Wall fog maximum opacity (normal style) */
export const WALL_FOG_MAX_NORMAL = 0.6;

/** Distance fog range */
export const FOG_DISTANCE_RANGE = 12;

/** Wall fog distance range */
export const WALL_FOG_DISTANCE_RANGE = 20;

/** Sprite fog distance range (brutal) */
export const SPRITE_FOG_DISTANCE_BRUTAL = 20;

/** Sprite fog distance range (normal) */
export const SPRITE_FOG_DISTANCE_NORMAL = 30;

/** Minimum transform Y for sprite rendering */
export const MIN_SPRITE_TRANSFORM_Y = 0.1;

/** Side wall darkening factor */
export const SIDE_WALL_DARKEN_ALPHA = 0.3;

// ============================================================================
// STORAGE KEYS
// ============================================================================

/** LocalStorage key for keybinds */
export const STORAGE_KEY_KEYBINDS = "cc_keybinds";

/** LocalStorage key for builder save */
export const STORAGE_KEY_BUILDER = "cc_builder_save";

/** LocalStorage key for builder current slot */
export const STORAGE_KEY_BUILDER_CURRENT = "cc_builder_current_slot";

/** LocalStorage key for texture cache */
export const STORAGE_KEY_TEXTURE_CACHE = "clockwork_textures_v1";

// ============================================================================
// PROBABILITY & RANDOMIZATION
// ============================================================================

/** Ambient metallic clank probability */
export const AMBIENT_CLANK_PROBABILITY = 0.3;

/** Ambient siren probability */
export const AMBIENT_SIREN_PROBABILITY = 0.2;

/** Ambient wind probability */
export const AMBIENT_WIND_PROBABILITY = 0.5;

// ============================================================================
// MATH CONSTANTS
// ============================================================================

/** Half of PI (90 degrees in radians) */
export const HALF_PI = Math.PI / 2;

/** Two times PI (360 degrees in radians) */
export const TWO_PI = Math.PI * 2;

/** Degrees to radians conversion factor */
export const DEG_TO_RAD = Math.PI / 180;

/** Radians to degrees conversion factor */
export const RAD_TO_DEG = 180 / Math.PI;

// ============================================================================
// PERCENTAGE CONVERSIONS
// ============================================================================

/** Convert 0-100 percentage to 0-1 decimal */
export const PERCENT_TO_DECIMAL = 0.01;

/** Convert 0-1 decimal to 0-100 percentage */
export const DECIMAL_TO_PERCENT = 100;

// Made with Bob
