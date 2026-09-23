import { trackEvent } from "./analytics.js";
import { requestPointerLockSafe, exitPointerLockSafe } from "../src/utils/pointer-lock.js";
import { World } from "../src/world/world.js";
import { AIR, BEDROCK } from "../src/world/blocks.js";
import { generateWorld } from "../src/world/world-gen.js";
import { WorldStore, MemoryBackend } from "../src/world/world-store.js";
import { packWorld, unpackWorld, decodeWorld, toShareHash } from "../src/world/world-codec.js";
import { convertLegacyMap } from "../src/world/legacy-convert.js";
import {
  PLAYER,
  moveAABB,
  groundHeight,
  raycastBlocks,
} from "../src/world/voxel-physics.js";
import { SurvivalSession } from "../src/rpg/survival-session.js";
import { PlayerStore } from "../src/rpg/player-store.js";
import { itemForBlock, itemById } from "../src/rpg/items.js";
import { returnStack } from "../src/rpg/inventory-ops.js";
/**
 * The HUD, and with it the constants that only exist to be drawn. The
 * dependency runs one way — this file imports the HUD, never the reverse —
 * so the two cannot form a cycle.
 */
import {
  renderForge,
  hotbarWindow,
  ENEMY_KEYS,
  PICKUP_TYPES,
} from "../src/ui/forge-hud.js";

/** Re-exported from its new home so the Forge's public surface is unchanged. */
export { hotbarWindow };

/** Every block a builder may place. Bedrock (15) is the world floor and is not one. */
export const PLACEABLE_BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
/**
 * Stations are craftable, so survival needs a way to select and place one.
 * They stay out of `PLACEABLE_BLOCKS` so the creative palette is unchanged:
 * a station does nothing in creative, where every recipe is already free.
 */
export const STATION_BLOCKS = [16, 17, 18];
export const SURVIVAL_BLOCKS = [...PLACEABLE_BLOCKS, ...STATION_BLOCKS];
/** Blocks the 0 key cycles — the natural set that has no digit of its own. */
const NATURAL_BLOCKS = [10, 11, 12, 13, 14];
export const TOOLS = ["block", "spawn", "pickup", "exit", "start"];

// Legacy 2D-builder storage, read once at start and then left alone.
const LEGACY_SAVE_KEY = "cc_builder_map";
const LEGACY_INDEX_KEY = "cc_builder_maps_index";
const FORGE_CURRENT_KEY = "cc_forge_current_slot";
/** Legacy keys already converted, so the migration need not read every world. */
const MIGRATED_KEYS_KEY = "cc_forge_migrated_keys";

const PITCH_LIMIT = (85 * Math.PI) / 180;
const MOVE_SPEED = 8.0;
const NOCLIP_SPEED = 14.0;
const MAX_HISTORY = 200;
const MARKER_SIZE = 0.8;
/** How often the Forge re-scans for nearby stations, in milliseconds. */
const STATION_POLL_MS = 500;

const clone = (v) => (v == null ? v : structuredClone(v));

// ─── Pure edit rules (unit-tested in tests/unit/forge-rules.test.js) ────────

/**
 * May a block go into this cell? Only empty, in-bounds cells that no body
 * (the editor's own player, a play-test entity) is standing in, and none that
 * would bury a marker.
 * @param {World} world
 * @param {Array<{x:number,y:number,z:number,half:number,height:number}>} bodies
 * @param {Array<{x:number,y:number,z:number}|null>} markers feet positions of
 *   the spawns, pickups, exit and start; a marker's body fills its own cell and
 *   the one above it, so neither may be filled with a block.
 */
export function placementAllowed(world, x, y, z, bodies = [], markers = []) {
  if (!world.inBounds(x, y, z)) return false;
  if (world.get(x, y, z) !== AIR) return false;
  for (const b of bodies) {
    if (
      b.x + b.half > x &&
      b.x - b.half < x + 1 &&
      b.y + b.half > y &&
      b.y - b.half < y + 1 &&
      b.z + b.height > z &&
      b.z < z + 1
    )
      return false;
  }
  for (const m of markers) {
    if (!m) continue;
    if (Math.floor(m.x) !== x || Math.floor(m.y) !== y) continue;
    const mz = Math.floor(m.z);
    if (z === mz || z === mz + 1) return false;
  }
  return true;
}

/**
 * Survival is selected per world. Old worlds have no `mode` and stay creative,
 * so the editor behaves exactly as it did before this change.
 * @returns {import("../src/rpg/survival-session.js").SurvivalSession|null}
 */
export function attachSurvival(world, session) {
  return world?.meta?.mode === "survival" ? session : null;
}

/** Anything solid but bedrock can be dug out. */
export function removeAllowed(world, x, y, z) {
  if (!world.inBounds(x, y, z)) return false;
  const id = world.get(x, y, z);
  return id !== AIR && id !== BEDROCK;
}

/**
 * One row per recipe the stations in reach allow. Locked rows are kept, not
 * hidden, so levelling has a visible destination. `note` carries the single
 * most useful reason it cannot be made right now: the level gate outranks
 * missing inputs. A repair has no output, so it names itself instead.
 */
export function craftMenuRows(session, stations = null) {
  const qty = ([id, n]) => `${n} ${itemById(id).name}`;
  return session.recipes(stations).map((r) => {
    const check = session.canCraft(r.id, stations);
    return {
      id: r.id,
      name: r.name,
      inputText: r.inputs.map(qty).join(", "),
      outputText: r.output ? qty(r.output) : r.name,
      locked: r.locked,
      craftable: check.ok,
      note: check.ok ? null : check.reason,
    };
  });
}

export function nextTool(tool) {
  return TOOLS[(TOOLS.indexOf(tool) + 1) % TOOLS.length];
}

/**
 * Push `edit` onto the history: anything undone is dropped, and the oldest entry
 * goes once the log is full.
 * @returns {{history: Array, index: number}} the new log and cursor
 */
export function recordEdit(history, index, edit, max = MAX_HISTORY) {
  const next = history.slice(0, index + 1);
  next.push(edit);
  let cursor = next.length - 1;
  while (next.length > max) {
    next.shift();
    cursor--;
  }
  return { history: next, index: cursor };
}

/**
 * Apply one history entry: a block edit `{x,y,z,from,to}` or a meta edit
 * `{meta,from,to}` (markers). Both directions go through the same pair so
 * undo and redo can never drift apart.
 */
export function applyEdit(world, edit) {
  if (edit.meta) {
    world.meta[edit.meta] = clone(edit.to);
    return true;
  }
  return world.set(edit.x, edit.y, edit.z, edit.to);
}

export function undoEdit(world, edit) {
  if (edit.meta) {
    world.meta[edit.meta] = clone(edit.from);
    return true;
  }
  return world.set(edit.x, edit.y, edit.z, edit.from);
}

// ─── Marker billboards ─────────────────────────────────────────────────────

const MARKER_ICONS = new Map();

/** Paints one 64×64 marker icon on first use; the canvas is reused after that. */
function markerIcon(kind) {
  const cached = MARKER_ICONS.get(kind);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  g.lineWidth = 4;
  g.lineJoin = "round";
  if (kind === "spawn") {
    g.fillStyle = "#ff4433";
    g.strokeStyle = "#3a0a04";
    g.beginPath();
    g.moveTo(32, 6);
    g.lineTo(58, 32);
    g.lineTo(32, 58);
    g.lineTo(6, 32);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (kind === "pickup") {
    g.fillStyle = "#44ff44";
    g.strokeStyle = "#063a06";
    g.beginPath();
    g.rect(25, 8, 14, 48);
    g.rect(8, 25, 48, 14);
    g.fill();
    g.stroke();
  } else if (kind === "exit") {
    g.fillStyle = "#00ccff";
    g.strokeStyle = "#04283a";
    g.beginPath();
    g.moveTo(32, 6);
    g.lineTo(56, 32);
    g.lineTo(42, 32);
    g.lineTo(42, 58);
    g.lineTo(22, 58);
    g.lineTo(22, 32);
    g.lineTo(8, 32);
    g.closePath();
    g.fill();
    g.stroke();
  } else {
    // start — white flag
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#202028";
    g.beginPath();
    g.rect(12, 6, 6, 52);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(18, 10);
    g.lineTo(54, 20);
    g.lineTo(18, 32);
    g.closePath();
    g.fill();
    g.stroke();
  }
  MARKER_ICONS.set(kind, c);
  return c;
}

/**
 * Voxel Forge — a first-person world editor.
 * Owns its world, input routing, update loop and HUD. The voxel renderer draws
 * the world itself from `cameraFor()` / `spritesFor()`; `render()` only paints
 * the 2D HUD over it.
 */
export class ForgeMode {
  /**
   * @param {object} deps
   * @param {object} deps.renderer  - Renderer instance (kept for parity with the host)
   * @param {object} deps.audio     - AudioManager instance
   * @param {object} deps.settings  - Settings object (fov, sensitivity, invertX, invertY)
   * @param {object} deps.keybinds  - Keybind map (moveForward, moveBack, moveLeft, moveRight)
   * @param {HTMLCanvasElement} deps.canvas - The game canvas (for pointer lock)
   * @param {WorldStore} [deps.store] - Injectable for tests; defaults to IndexedDB
   * @param {PlayerStore} [deps.playerStore] - Injectable for tests; defaults to IndexedDB
   */
  constructor(deps) {
    this.renderer = deps.renderer;
    this.audio = deps.audio;
    this.settings = deps.settings;
    this.keybinds = deps.keybinds;
    this.canvas = deps.canvas;
    this.store = deps.store || new WorldStore();

    this.world = null;
    this.player = { x: 64.5, y: 64.5, z: World.GROUND, angle: 0, pitch: 0 };
    this.velZ = 0;
    this.grounded = true;

    this.tile = 1;
    this.target = null;
    this.overhead = false;
    this.cursorZ = World.GROUND;
    this.showHelp = true;
    this.suppressHelp = false;
    this.saveFlash = 0;
    this.notice = null;
    this.noclip = false;
    this.active = false;
    /** V toggles what Ctrl+N generates. */
    this.terrainNew = true;

    this.history = [];
    this.historyIndex = -1;

    this.toolMode = "block";
    /** Progression is per-character and outlives any one world. */
    this.playerStore = deps.playerStore || new PlayerStore();
    /** Built once from the stored character, then attached per world. */
    this.survivalSession = new SurvivalSession();
    /** Non-null only in a survival world; every RPG rule lives behind it. */
    this.survival = null;
    /** Survival breaks on a held button; creative still breaks on the click. */
    this.holdingBreak = false;
    this.breakProgress = 0;
    /** The item id the hotbar has selected in survival. */
    this.heldItem = null;
    /** Craft menu, survival only — C opens it, the arrows walk it. */
    this.craftOpen = false;
    this.craftIndex = 0;
    /** The inventory screen; survival only, and it owns the cursor while open. */
    this.invOpen = false;
    this.cursor = { x: 0, y: 0 };
    /** The stack on the cursor mid-drag, or null. */
    this.carried = null;
    /** Which hotbar slot is selected, 0..8. */
    this.hotbarIndex = 0;
    /** Stations within reach, refreshed on a timer rather than per frame. */
    this.stationsNear = new Set();
    this.stationPoll = 0;
    this.selectedEnemy = 0;
    this.selectedPickup = 0;

    this.currentSlot = 0;
    this.mapIndex = []; // [{id, name, updatedAt}]
    /** True once the store has failed and the session is memory-only. */
    this.storageFailed = false;
    this._busy = false;
    /** An imported world is being edited before its slot id exists. */
    this._slotPending = false;
    /** The imported world still waiting for a slot, so `saveMap` can retry. */
    this._pendingWorld = null;
    this._slotSaving = false;
    /** Edits since the last successful save; `stop()` skips a redundant write. */
    this._dirty = false;

    this.keys = {};
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.mouseLocked = false;

    this.onPlayTest = null;
    this.onShareMap = null;
  }

  /** The World, under the name the host has always used. */
  get map() {
    return this.world;
  }
  set map(w) {
    this.world = w;
  }

  // ─── Lifecycle ───────────────────────────────────────────

  /**
   * Resolves once the world is loaded — the host awaits it before rendering.
   * Never rejects: a store that will not open drops the Forge into an in-memory
   * world so the editor still runs, with `storageFailed` saying so on the HUD.
   */
  async start() {
    // The character outlives every world, so it is read before one is adopted:
    // `_adopt` is what hands this session to a survival world.
    const saved = await this.playerStore.load(0);
    this.survivalSession = new SurvivalSession({
      skills: saved.skills,
      inventory: saved.inventory,
    });
    try {
      await this._migrateLegacy();
    } catch (_) {
      /* migration is best-effort; a broken legacy map must not cost the session */
    }
    try {
      this.mapIndex = await this.store.list();
      if (this.mapIndex.length === 0) {
        const world = generateWorld({
          terrain: true,
          seed: Date.now(),
          name: "My Creation",
        });
        await this.store.save(0, world);
        this.mapIndex = await this.store.list();
        this._adopt(world, 0);
      } else {
        const id = this._preferredSlot();
        const world =
          (await this.store.load(id)) ||
          generateWorld({ terrain: true, seed: Date.now() });
        this._adopt(world, id);
      }
      this.storageFailed = false;
    } catch (_) {
      await this._fallBackToMemory();
    }

    this.tile = 1;
    this.target = null;
    this.overhead = false;
    this.showHelp = true;
    this.saveFlash = 0;
    this.notice = null;
    this.noclip = false;
    this.toolMode = "block";
    this.active = true;

    // After the reset above, or the notice it sets would be wiped out. A
    // creative world has no progression to lose, so it never sees these.
    if (this.survival) {
      if (saved.unavailable) this._warn("Progress will not be saved");
      else if (saved.stale) this._warn("Character saved by a newer version");
    }

    requestPointerLockSafe(this.canvas);
  }

  /**
   * The host saves before calling this (input-dispatch does on Q), so only edits
   * made since the last save are written again.
   */
  stop() {
    this.active = false;
    if (!this._dirty) return Promise.resolve();
    this._dirty = false;
    return this._fire(this._persistCurrent());
  }

  /** Storage is gone: keep editing in memory and say so on the HUD. */
  async _fallBackToMemory() {
    this.store = new WorldStore(new MemoryBackend());
    this.storageFailed = true;
    const world = generateWorld({
      terrain: true,
      seed: Date.now(),
      name: "My Creation",
    });
    this._adopt(world, 0);
    try {
      await this.store.save(0, world);
      this.mapIndex = await this.store.list();
    } catch (_) {
      this.mapIndex = [{ id: 0, name: world.meta.name }];
    }
  }

  /** Kept for the host, which still calls it after a play-test. The World needs no sync. */
  syncGrid() {}

  // ─── Input routing ───────────────────────────────────────

  /**
   * Called by the host's keydown handler while the Forge is active.
   * @returns {boolean} true when the key was consumed
   */
  handleKeyDown(e) {
    const code = e.code;
    const ctrl = e.ctrlKey || e.metaKey;

    // The inventory screen, survival only. `!ctrl` leaves Ctrl+I to import.
    if (this.survival && code === "KeyI" && !ctrl) {
      this._setInventory(!this.invOpen);
      return true;
    }
    if (this.invOpen && code === "Escape") {
      this._setInventory(false);
      return true;
    }

    // Survival crafting. The menu only ever exists behind `survival`, and only
    // claims keys the Forge itself does not use, so creative keeps every key.
    if (this.survival && code === "KeyC" && !ctrl) {
      this.craftOpen = !this.craftOpen;
      this.craftIndex = 0;
      if (this.craftOpen) {
        // Re-scan now, so the menu can never open on a stale bench.
        this.stationsNear = this.survival.stations(this.world, this.player);
        this.stationPoll = STATION_POLL_MS;
      }
      this.audio.menuSelect();
      return true;
    }
    if (this.survival && this.craftOpen && !ctrl) {
      const rows = this._craftRows();
      if (code === "ArrowDown") {
        this.craftIndex = (this.craftIndex + 1) % rows.length;
        this.audio.menuSelect();
        return true;
      }
      if (code === "ArrowUp") {
        this.craftIndex = (this.craftIndex + rows.length - 1) % rows.length;
        this.audio.menuSelect();
        return true;
      }
      if (code === "Enter") {
        const row = rows[this.craftIndex];
        const res = this.survival.craft(row.id, this.stationsNear);
        if (!res.ok) this._warn(res.reason);
        else {
          this.audio.menuConfirm();
          if (res.leveled)
            this._warn(`Construction level ${this.survival.skills.level("construction")}`);
        }
        return true;
      }
      if (code === "Escape") {
        this.craftOpen = false;
        this.audio.menuSelect();
        return true;
      }
    }

    if (code === "KeyS" && ctrl) {
      e.preventDefault();
      if (e.shiftKey) this._fire(this.shareMap());
      else this.saveMap();
      return true;
    }
    if (code === "KeyZ" && ctrl) {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return true;
    }
    if (code === "KeyE" && ctrl) {
      e.preventDefault();
      this._fire(this.exportMap());
      return true;
    }
    if (code === "KeyI" && ctrl) {
      e.preventDefault();
      this.importMap();
      return true;
    }
    if (code === "KeyN" && ctrl) {
      e.preventDefault();
      this._fire(this.newMap());
      return true;
    }
    if (code === "KeyD" && ctrl) {
      e.preventDefault();
      this._fire(this.deleteCurrentMap());
      return true;
    }
    if (code === "Comma" && !ctrl) {
      this._fire(this.switchMap(-1));
      return true;
    }
    if (code === "Period" && !ctrl) {
      this._fire(this.switchMap(1));
      return true;
    }
    // T → cycle tool
    if (code === "KeyT" && !ctrl) {
      this.toolMode = nextTool(this.toolMode);
      this.audio.menuSelect();
      return true;
    }
    // G → cycle sub-type within the current tool
    if (code === "KeyG" && !ctrl) {
      if (this.toolMode === "spawn") {
        this.selectedEnemy = (this.selectedEnemy + 1) % ENEMY_KEYS.length;
        this.audio.menuSelect();
        return true;
      }
      if (this.toolMode === "pickup") {
        this.selectedPickup = (this.selectedPickup + 1) % PICKUP_TYPES.length;
        this.audio.menuSelect();
        return true;
      }
      return false;
    }
    if (code === "KeyF" && !ctrl) {
      this.renameMap();
      return true;
    }
    if (code === "Tab" && !ctrl) {
      e.preventDefault();
      this.overhead = !this.overhead;
      if (this.overhead) exitPointerLockSafe();
      else requestPointerLockSafe(this.canvas);
      return true;
    }
    // 1-9 pick blocks 1-9; 0 cycles the natural blocks
    if (code >= "Digit1" && code <= "Digit9" && !ctrl) {
      this.tile = parseInt(code.charAt(5), 10);
      this.audio.menuSelect();
      return true;
    }
    if (code === "Digit0" && !ctrl) {
      const i = NATURAL_BLOCKS.indexOf(this.tile);
      this.tile = NATURAL_BLOCKS[(i + 1) % NATURAL_BLOCKS.length];
      this.audio.menuSelect();
      return true;
    }
    // Q/E → overhead build cursor down/up
    if (code === "KeyQ" && !ctrl) {
      this.cursorZ = Math.max(0, this.cursorZ - 1);
      this.audio.menuSelect();
      return true;
    }
    if (code === "KeyE" && !ctrl) {
      this.cursorZ = Math.min(World.H - 1, this.cursorZ + 1);
      this.audio.menuSelect();
      return true;
    }
    if (code === "KeyR" && !ctrl) {
      this.player.pitch = 0;
      return true;
    }
    if (code === "KeyN" && !ctrl) {
      this.noclip = !this.noclip;
      this.velZ = 0;
      return true;
    }
    if (code === "KeyV" && !ctrl) {
      this.terrainNew = !this.terrainNew;
      this.audio.menuSelect();
      return true;
    }
    if (code === "KeyM" && !ctrl) {
      this._setMode(this.isSurvival() ? "creative" : "survival");
      return true;
    }
    if (code === "KeyH" && !ctrl) {
      this.showHelp = !this.showHelp;
      return true;
    }
    if (code === "KeyP" && !ctrl) {
      if (this.onPlayTest) this.onPlayTest();
      return true;
    }
    if (code === "BracketLeft" && !ctrl) {
      this.settings.forgeFov = Math.max(50, this.settings.forgeFov - 5);
      this.audio.menuSelect();
      return true;
    }
    if (code === "BracketRight" && !ctrl) {
      this.settings.forgeFov = Math.min(120, this.settings.forgeFov + 5);
      this.audio.menuSelect();
      return true;
    }
    return false; // Not consumed — host should handle (e.g. Escape)
  }

  handleMouseDown(button) {
    if (!this.active || this.overhead || !this.world) return;
    const place = button === 0;
    switch (this.toolMode) {
      case "spawn":
        if (place) this.placeSpawn();
        else this.removeMarker("enemySpawns");
        return;
      case "pickup":
        if (place) this.placePickup();
        else this.removeMarker("pickups");
        return;
      case "exit":
        if (place) this.placeExit();
        else this.removeExit();
        return;
      case "start":
        if (place) this.placeStart();
        return;
      default:
        if (place) this.placeBlock();
        else {
          this.holdingBreak = true;
          this.removeBlock();
        }
    }
  }

  /**
   * Releasing the break button discards partial progress — see spec §5.
   * Mirrors `handleMouseDown`: left places, every other button breaks.
   */
  handleMouseUp(button) {
    if (button === 0) return;
    this.holdingBreak = false;
    this.survival?.cancelBreak();
    this.breakProgress = 0;
  }

  /** Mouse wheel cycles the placeable palette. The host routes wheel events here. */
  handleWheel(deltaY) {
    if (!this.active) return;
    const pal = this._palette();
    const i = pal.indexOf(this.tile);
    const dir = deltaY > 0 ? 1 : -1;
    const n = pal.length;
    this.tile = pal[(i + dir + n) % n];
    this.audio.menuSelect();
  }

  feedMouse(dx, dy, locked) {
    this.mouseDx = dx;
    this.mouseDy = dy;
    this.mouseLocked = locked;
  }

  feedKeys(keys) {
    this.keys = keys;
  }

  // ─── Update ──────────────────────────────────────────────

  update(dt) {
    if (!this.active || !this.world) return;
    if (this.saveFlash > 0) this.saveFlash = Math.max(0, this.saveFlash - dt);
    if (this.notice) {
      this.notice.t -= dt;
      if (this.notice.t <= 0) this.notice = null;
    }
    if (this.overhead) return;

    // The screen owns the cursor; any motion it saw is not a look input.
    if (this.invOpen) { this.mouseDx = 0; this.mouseDy = 0; }

    if (this.mouseLocked) {
      const sens = (this.settings.sensitivity || 1.0) * 0.002;
      // The Forge keeps its own look settings: a player who inverts the
      // campaign's Y axis should not have the builder inverted with it.
      const invX = 1;
      const invY = this.settings.forgeInvertY ? -1 : 1;
      this.player.angle += this.mouseDx * sens * invX;
      this.player.pitch -= this.mouseDy * sens * invY;
      this.player.pitch = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, this.player.pitch),
      );
    }

    if (this.survival) {
      // A radius scan is far too costly per frame, and a bench does not move.
      this.stationPoll -= dt * 1000;
      if (this.stationPoll <= 0) {
        this.stationsNear = this.survival.stations(this.world, this.player);
        this.stationPoll = STATION_POLL_MS;
      }
      if (this.holdingBreak && this.target && !this.invOpen) {
        const t = this.target;
        // `dt` is seconds here; the session counts a break in milliseconds.
        const res = this.survival.tickBreak(dt * 1000, t, this.world.get(t.x, t.y, t.z));
        this.breakProgress = this.survival.progress;
        if (res.broke) {
          this._editBlock(t.x, t.y, t.z, AIR);
          this.audio.menuSelect();
          if (res.leveled) this._warn(`Mining level ${this.survival.miningLevel()}`);
          this.breakProgress = 0;
        }
      } else if (this.breakProgress !== 0) {
        this.survival.cancelBreak();
        this.breakProgress = 0;
      }
    }

    const speed = (this.noclip ? NOCLIP_SPEED : MOVE_SPEED) * dt;
    const fx = Math.cos(this.player.angle);
    const fy = Math.sin(this.player.angle);
    let mx = 0;
    let my = 0;
    if (this.keys[this.keybinds.moveForward]) {
      mx += fx;
      my += fy;
    }
    if (this.keys[this.keybinds.moveBack]) {
      mx -= fx;
      my -= fy;
    }
    if (this.keys[this.keybinds.moveLeft]) {
      mx += fy;
      my -= fx;
    }
    if (this.keys[this.keybinds.moveRight]) {
      mx -= fy;
      my += fx;
    }
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx = (mx / len) * speed;
      my = (my / len) * speed;
    }

    if (this.noclip) {
      const down = this.keys["ControlLeft"] || this.keys["ControlRight"];
      let dz = 0;
      if (this.keys["Space"]) dz += speed;
      if (down) dz -= speed;
      // Same box `moveAABB` clamps a walking body to, so dropping out of
      // noclip against an edge does not shunt the camera sideways.
      this.player.x = Math.max(PLAYER.half, Math.min(World.W - PLAYER.half, this.player.x + mx));
      this.player.y = Math.max(PLAYER.half, Math.min(World.D - PLAYER.half, this.player.y + my));
      this.player.z = Math.max(
        0,
        Math.min(World.H - PLAYER.height, this.player.z + dz),
      );
      this.velZ = 0;
      this.grounded = false;
    } else {
      if (this.keys["Space"] && this.grounded) {
        this.velZ = PLAYER.jump;
        this.grounded = false;
      }
      this.velZ -= PLAYER.gravity * dt;
      const res = moveAABB(
        this.world,
        {
          x: this.player.x,
          y: this.player.y,
          z: this.player.z,
          half: PLAYER.half,
          height: PLAYER.height,
        },
        mx,
        my,
        this.velZ * dt,
        { step: PLAYER.step },
      );
      this.player.x = res.x;
      this.player.y = res.y;
      this.player.z = res.z;
      this.grounded = res.grounded;
      if (res.hitZ || (res.grounded && this.velZ < 0)) this.velZ = 0;
    }

    this.target = this._pick();
  }

  // ─── Camera and sprites for the voxel renderer ───────────

  /** @returns {{x:number,y:number,z:number,yaw:number,pitch:number,fovDeg:number}} eye camera */
  cameraFor() {
    return {
      x: this.player.x,
      y: this.player.y,
      z: this.player.z + PLAYER.eye,
      yaw: this.player.angle,
      pitch: this.player.pitch,
      fovDeg: this.settings.forgeFov || 120,
    };
  }

  /** Marker billboards, feet-anchored, for the voxel renderer's sprite pass. */
  spritesFor() {
    const out = [];
    if (!this.world) return out;
    const m = this.world.meta;
    const push = (kind, x, y, z) =>
      out.push({
        x,
        y,
        z,
        w: MARKER_SIZE,
        h: MARKER_SIZE,
        image: markerIcon(kind),
        key: `forge:${kind}`,
      });
    for (const s of m.enemySpawns || []) push("spawn", s.x, s.y, s.z);
    for (const p of m.pickups || []) push("pickup", p.x, p.y, p.z);
    if (m.exit) push("exit", m.exit.x, m.exit.y, m.exit.z);
    if (m.spawn) push("start", m.spawn.x, m.spawn.y, m.spawn.z);
    return out;
  }

  // ─── Block operations ────────────────────────────────────

  /** Bodies a placed block may not appear inside. */
  _bodies() {
    return [
      {
        x: this.player.x,
        y: this.player.y,
        z: this.player.z,
        half: PLAYER.half,
        height: PLAYER.height,
      },
    ];
  }

  /** Every marker in the world, as the feet positions `placementAllowed` reads. */
  _markers() {
    const meta = this.world?.meta || {};
    return [
      ...(meta.enemySpawns || []),
      ...(meta.pickups || []),
      meta.exit,
      meta.spawn,
    ];
  }

  _pick() {
    const cam = this.cameraFor();
    const cp = Math.cos(cam.pitch);
    return raycastBlocks(
      this.world,
      cam.x,
      cam.y,
      cam.z,
      Math.cos(cam.yaw) * cp,
      Math.sin(cam.yaw) * cp,
      Math.sin(cam.pitch),
      PLAYER.reach,
    );
  }

  /** The cell against the targeted face, or null when nothing is targeted. */
  _placeCell() {
    const t = this.target;
    if (!t) return null;
    return { x: t.x + t.face[0], y: t.y + t.face[1], z: t.z + t.face[2] };
  }

  /** Same cell, but only when a marker may stand in it: in the world and empty. */
  _freeCell() {
    const c = this._placeCell();
    if (!c || !this.world.inBounds(c.x, c.y, c.z)) return null;
    return this.world.get(c.x, c.y, c.z) === AIR ? c : null;
  }

  /**
   * The world holds something the store has not seen. Every path that changes
   * blocks or meta calls this — edits, undo, redo, rename, import — because
   * `stop()` writes only when it is set.
   */
  _markDirty() {
    this._dirty = true;
  }

  _record(edit) {
    const next = recordEdit(this.history, this.historyIndex, edit);
    this.history = next.history;
    this.historyIndex = next.index;
    this._markDirty();
  }

  _editBlock(x, y, z, to) {
    const from = this.world.get(x, y, z);
    if (from === to) return false;
    const edit = { x, y, z, from, to };
    applyEdit(this.world, edit);
    this._record(edit);
    return true;
  }

  _editMeta(field, next) {
    const edit = {
      meta: field,
      from: clone(this.world.meta[field]),
      to: clone(next),
    };
    applyEdit(this.world, edit);
    this._record(edit);
  }

  /**
   * Run one history entry through `apply` — `undoEdit` or `applyEdit`. Both
   * write the world behind the survival session's back, so the placed-by-player
   * bit is reconciled from what the cell held on either side: a block the
   * history hands back was never found by the player and must not pay mining xp
   * a second time. A meta edit names no cell and is left alone.
   */
  _replayEdit(edit, apply) {
    const before = edit.meta ? AIR : this.world.get(edit.x, edit.y, edit.z);
    apply(this.world, edit);
    if (!this.survival || edit.meta) return;
    const after = this.world.get(edit.x, edit.y, edit.z);
    if (before === AIR && after !== AIR) this.survival.markPlaced(edit.x, edit.y, edit.z);
    else if (before !== AIR && after === AIR) this.survival.clearPlaced(edit.x, edit.y, edit.z);
  }

  undo() {
    if (this.historyIndex < 0) return;
    this._replayEdit(this.history[this.historyIndex--], undoEdit);
    this._markDirty();
    this.audio.menuSelect();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this._replayEdit(this.history[++this.historyIndex], applyEdit);
    this._markDirty();
    this.audio.menuSelect();
  }

  placeBlock() {
    const c = this._placeCell();
    if (!c) return;
    if (!placementAllowed(this.world, c.x, c.y, c.z, this._bodies(), this._markers()))
      return;

    if (!this.survival) {
      if (this._editBlock(c.x, c.y, c.z, this.tile)) this.audio.menuConfirm();
      return;
    }

    const itemId = this.heldItem ?? itemForBlock(this.tile);
    const spend = this.survival.tryPlace(itemId);
    if (!spend.ok) {
      this._warn(spend.reason);
      return;
    }
    if (this._editBlock(c.x, c.y, c.z, spend.blockId)) {
      this.survival.markPlaced(c.x, c.y, c.z);
      this.audio.menuConfirm();
    } else {
      this.survival.refund(itemId); // the edit was a no-op; do not eat the item
    }
  }

  /** In survival this only *starts* a break; holding the button finishes it. */
  removeBlock() {
    const t = this.target;
    if (!t) return;
    if (!removeAllowed(this.world, t.x, t.y, t.z)) return;

    if (!this.survival) {
      if (this._editBlock(t.x, t.y, t.z, AIR)) this.audio.menuSelect();
      return;
    }

    const begun = this.survival.beginBreak(t, this.world.get(t.x, t.y, t.z));
    if (!begun.ok) this._warn(begun.reason);
  }

  // ─── Markers ─────────────────────────────────────────────

  /** Cell centre for a marker standing on the block below `c`. */
  _markerAt(c) {
    return { x: c.x + 0.5, y: c.y + 0.5, z: c.z };
  }

  _occupied(list, c) {
    return list.some(
      (e) =>
        Math.floor(e.x) === c.x && Math.floor(e.y) === c.y && Math.floor(e.z) === c.z,
    );
  }

  placeSpawn() {
    const c = this._freeCell();
    if (!c) return;
    const list = this.world.meta.enemySpawns || [];
    if (this._occupied(list, c)) return;
    const type = ENEMY_KEYS[this.selectedEnemy] || "drone";
    this._editMeta("enemySpawns", [...list, { ...this._markerAt(c), type }]);
    this.audio.menuConfirm();
  }

  placePickup() {
    const c = this._freeCell();
    if (!c) return;
    const list = this.world.meta.pickups || [];
    if (this._occupied(list, c)) return;
    const type = PICKUP_TYPES[this.selectedPickup];
    const entry = { ...this._markerAt(c), type };
    if (type === "weapon") entry.weaponId = 1;
    this._editMeta("pickups", [...list, entry]);
    this.audio.menuConfirm();
  }

  /** Right-click removes the marker in the targeted cell, or the one against its face. */
  removeMarker(field) {
    const list = this.world.meta[field] || [];
    if (list.length === 0) return;
    const t = this.target;
    if (!t) return;
    const cells = [{ x: t.x, y: t.y, z: t.z }];
    const face = this._placeCell();
    if (face) cells.push(face);
    for (const c of cells) {
      const idx = list.findIndex(
        (e) =>
          Math.floor(e.x) === c.x &&
          Math.floor(e.y) === c.y &&
          Math.floor(e.z) === c.z,
      );
      if (idx >= 0) {
        const next = list.slice();
        next.splice(idx, 1);
        this._editMeta(field, next);
        this.audio.menuSelect();
        return;
      }
    }
  }

  placeExit() {
    const c = this._freeCell();
    if (!c) return;
    this._editMeta("exit", this._markerAt(c));
    this.audio.menuConfirm();
  }

  removeExit() {
    if (!this.world.meta.exit) return;
    this._editMeta("exit", null);
    this.audio.menuSelect();
  }

  /** Moves the play-test start to the targeted cell, facing the way the builder looks. */
  placeStart() {
    const c = this._freeCell();
    if (!c) return;
    this._editMeta("spawn", { ...this._markerAt(c), yaw: this.player.angle });
    this.audio.menuConfirm();
  }

  // ─── Slots, save and load ────────────────────────────────

  _preferredSlot() {
    try {
      const raw = localStorage.getItem(FORGE_CURRENT_KEY);
      if (raw !== null) {
        const id = parseInt(raw, 10);
        if (this.mapIndex.some((e) => e.id === id)) return id;
      }
    } catch (_) {
      /* storage unavailable */
    }
    return this.mapIndex.length > 0 ? this.mapIndex[0].id : 0;
  }

  _persistSlot() {
    try {
      localStorage.setItem(FORGE_CURRENT_KEY, String(this.currentSlot));
    } catch (_) {
      /* storage full or unavailable */
    }
  }

  /** The block ids the palette can reach: survival adds the stations. */
  _palette() {
    return this.survival ? SURVIVAL_BLOCKS : PLACEABLE_BLOCKS;
  }

  /** @returns {boolean} true when the edited world is a survival world */
  isSurvival() {
    return this.world?.meta?.mode === "survival";
  }

  /**
   * Switch the edited world between creative and survival. This is the only
   * player-facing way into survival: `meta.mode` rides the v4 codec, so the
   * choice persists with the world once it is saved.
   */
  _setMode(mode) {
    if (!this.world) return;
    this.world.meta.mode = mode;
    // A mode change is a fresh start for the placed-block flags, and any
    // half-finished break belongs to the mode that is ending.
    this.survivalSession.resetPlaced();
    // A stack on the cursor goes back while the inventory it came from is
    // still reachable — `_dropCarried` cannot return it once `survival` is null.
    this._dropCarried();
    this.survival = attachSurvival(this.world, this.survivalSession);
    this.holdingBreak = false;
    this.breakProgress = 0;
    if (!this.survival) {
      this.craftOpen = false;
      this.craftIndex = 0;
      this.invOpen = false;
      // A station is not in the creative palette; do not strand the cursor on one.
      if (STATION_BLOCKS.includes(this.tile)) this.tile = PLACEABLE_BLOCKS[0];
    }
    this._warn(mode === "survival" ? "SURVIVAL — gather to build" : "CREATIVE — unlimited blocks");
    this.audio.menuConfirm();
  }

  /**
   * Open or shut the inventory screen. Opening releases the pointer so the
   * screen can be clicked; closing asks for it back — the keypress is the
   * user gesture browsers require, the same way overhead already works.
   */
  _setInventory(open) {
    if (open === this.invOpen) return;
    this.invOpen = open;
    if (open) {
      this.holdingBreak = false;
      this.survival?.cancelBreak();
      this.breakProgress = 0;
      this.craftOpen = false;
      exitPointerLockSafe();
    } else {
      this._dropCarried();
      // A refusal is survivable: play resumes unlocked and the next click locks.
      requestPointerLockSafe(this.canvas);
    }
    this.audio.menuSelect();
  }

  /** Put any carried stack back. A drag must never lose items. */
  _dropCarried() {
    if (!this.carried || !this.survival) { this.carried = null; return; }
    this.carried = returnStack(this.survival.inventory, this.carried);
    // If it genuinely does not fit it stays carried and the screen stays open.
    if (this.carried) this.invOpen = true;
  }

  /** HUD-space cursor position; only meaningful while the screen is open. */
  handleMouseMove(x, y) {
    if (!this.invOpen) return;
    this.cursor.x = x;
    this.cursor.y = y;
  }

  /** Make `world` the one being edited: drop history, stand the player on its spawn. */
  _adopt(world, id = this.currentSlot) {
    this.world = world;
    // A fresh world means fresh placed-block flags; the character's skills
    // and inventory deliberately carry over.
    this.survivalSession.resetPlaced();
    // Before the swap, while the old world's inventory can still take it back.
    this._dropCarried();
    this.survival = attachSurvival(world, this.survivalSession);
    this.craftOpen = false; // a creative world must never inherit an open menu
    this.craftIndex = 0;
    this.invOpen = false; // nor an open inventory screen
    this.currentSlot = id;
    this.history = [];
    this.historyIndex = -1;
    this.velZ = 0;
    this.player.pitch = 0;
    const s = world.meta.spawn || { x: 64.5, y: 64.5, z: World.GROUND, yaw: 0 };
    this.player.x = s.x;
    this.player.y = s.y;
    this.player.z = Math.max(s.z, groundHeight(world, s.x, s.y, PLAYER.half));
    this.player.angle = s.yaw || 0;
    this.cursorZ = Math.floor(this.player.z);
    this._dirty = false; // a freshly loaded or generated world matches the store
    this._persistSlot();
  }

  /** Swallow the rejection of a fire-and-forget storage call; the HUD is the only feedback. */
  _fire(promise) {
    if (promise && typeof promise.catch === "function") promise.catch(() => {});
    return promise;
  }

  /** A slot operation is under way, or the slot id itself is not settled yet. */
  _slotBusy() {
    return this._busy || this._slotPending;
  }

  _warn(text) {
    this.notice = { text, t: 3 };
    this.saveFlash = 0;
  }

  /**
   * Write the current world to its slot. Refused while an import is still
   * reserving an id, where `currentSlot` still names the world we came from.
   */
  _persistCurrent() {
    if (!this.world || this._slotPending) return Promise.resolve();
    // The character lives in its own store, so it rides along on every world
    // write rather than waiting for the Forge to close.
    if (this.survival) {
      this._fire(
        this.playerStore.save(0, {
          skills: this.survival.skills,
          inventory: this.survival.inventory,
        }),
      );
    }
    return this.store.save(this.currentSlot, this.world);
  }

  saveMap() {
    if (!this.world) return Promise.resolve();
    const entry = this.mapIndex.find((e) => e.id === this.currentSlot);
    if (entry) entry.name = this.world.meta.name;
    this.saveFlash = 2;
    this._dirty = this._slotPending; // a pending import is written by _saveAsNewSlot
    this._persistSlot();
    let blocks = 0;
    for (let i = 0; i < this.world.blocks.length; i++)
      if (this.world.blocks[i] !== AIR) blocks++;
    trackEvent("forge_save", {
      map_name: this.world.meta.name,
      block_count: blocks,
    });
    // An import whose slot reservation failed still has no id of its own \u2014
    // writing now would land on the world it replaced. Retry the reservation.
    if (this._slotPending) {
      return this._pendingWorld
        ? this._fire(this._saveAsNewSlot(this._pendingWorld))
        : Promise.resolve();
    }
    return this._persistCurrent().catch(() => {
      this._markDirty();
      this._warn("Save failed \u2014 storage unavailable");
    });
  }

  async newMap() {
    if (this._slotBusy()) return;
    this._busy = true;
    try {
      await this._persistCurrent();
      const id = await this.store.nextId();
      const world = generateWorld({
        terrain: this.terrainNew,
        seed: Date.now(),
        name: `Map ${id + 1}`,
      });
      await this.store.save(id, world);
      this.mapIndex = await this.store.list();
      this._adopt(world, id);
      this.saveFlash = 2;
      this.audio.menuConfirm();
    } catch (_) {
      this._warn("Could not create a world \u2014 storage unavailable");
    } finally {
      this._busy = false;
    }
  }

  async switchMap(dir) {
    if (this._slotBusy() || this.mapIndex.length < 2) return;
    this._busy = true;
    try {
      await this._persistCurrent();
      const cur = this.mapIndex.findIndex((e) => e.id === this.currentSlot);
      const next = (cur + dir + this.mapIndex.length) % this.mapIndex.length;
      const id = this.mapIndex[next].id;
      const world = (await this.store.load(id)) || generateWorld({ terrain: false });
      this._adopt(world, id);
      this.saveFlash = 2;
      this.audio.menuSelect();
    } catch (_) {
      this._warn("Could not open that world \u2014 storage unavailable");
    } finally {
      this._busy = false;
    }
  }

  async deleteCurrentMap() {
    if (this._slotBusy() || this.mapIndex.length <= 1) return; // never delete the last world
    this._busy = true;
    try {
      await this.store.remove(this.currentSlot);
      this.mapIndex = await this.store.list();
      const id = this.mapIndex[0].id;
      const world = (await this.store.load(id)) || generateWorld({ terrain: false });
      this._adopt(world, id);
      this.saveFlash = 2;
      this.audio.menuConfirm();
    } catch (_) {
      this._warn("Could not delete that world \u2014 storage unavailable");
    } finally {
      this._busy = false;
    }
  }

  renameMap() {
    if (!this.world) return;
    const current = this.world.meta.name || "My Creation";
    const name = prompt("Rename world:", current);
    if (!name || name.trim().length === 0) return;
    this.world.meta.name = name.trim().substring(0, 40);
    this._markDirty();
    this.saveMap();
  }

  /**
   * One-time import of the 2D builder's localStorage maps. Each legacy key is
   * converted once — a world already carrying that `meta.legacyKey` is proof it
   * ran — and localStorage is left untouched.
   *
   * The proof costs a decode of every stored world, so the claimed keys are
   * cached in localStorage: once every legacy key is in the cache, entering the
   * Forge reads nothing at all.
   */
  async _migrateLegacy() {
    const keys = [];
    try {
      const raw = localStorage.getItem(LEGACY_INDEX_KEY);
      const index = raw ? JSON.parse(raw) : [];
      if (Array.isArray(index)) {
        for (const e of index) {
          if (e && typeof e.id === "number") keys.push(`${LEGACY_SAVE_KEY}_${e.id}`);
        }
      }
      if (localStorage.getItem(LEGACY_SAVE_KEY)) keys.push(LEGACY_SAVE_KEY);
    } catch (_) {
      return; // no storage, nothing to migrate
    }
    if (keys.length === 0) return;

    const claimed = this._readMigratedKeys();
    if (keys.every((k) => claimed.has(k))) return; // nothing new since last time

    const rows = await this.store.list();
    for (const row of rows) {
      const world = await this.store.load(row.id).catch(() => null);
      if (world?.meta?.legacyKey) claimed.add(world.meta.legacyKey);
    }

    for (const key of keys) {
      if (claimed.has(key)) continue;
      // A key that cannot be read or converted never will be: claim it anyway,
      // or the whole scan runs again on every entry for the rest of time.
      claimed.add(key);
      let data = null;
      try {
        const raw = localStorage.getItem(key);
        data = raw ? JSON.parse(raw) : null;
      } catch (_) {
        continue;
      }
      if (!data || !Array.isArray(data.grid)) continue;
      let world;
      try {
        world = convertLegacyMap(data);
      } catch (_) {
        continue;
      }
      world.meta.legacyKey = key;
      const id = await this.store.nextId();
      await this.store.save(id, world);
    }
    this._writeMigratedKeys(claimed);
  }

  /** @returns {Set<string>} legacy keys a past migration already converted */
  _readMigratedKeys() {
    try {
      const raw = localStorage.getItem(MIGRATED_KEYS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list.filter((k) => typeof k === "string") : []);
    } catch (_) {
      return new Set();
    }
  }

  _writeMigratedKeys(claimed) {
    try {
      localStorage.setItem(MIGRATED_KEYS_KEY, JSON.stringify([...claimed]));
    } catch (_) {
      /* storage full or unavailable; the next entry just scans again */
    }
  }

  // ─── Export / import / share ─────────────────────────────

  async exportMap() {
    if (!this.world) return;
    const bytes = await packWorld(this.world);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(this.world.meta.name || "world").replace(/[^a-z0-9_-]/gi, "_")}.ccw`;
    a.click();
    URL.revokeObjectURL(url);
    this.saveFlash = 2;
  }

  importMap() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ccw,.json";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      this._fire(this._readImport(file));
    };
    input.click();
  }

  async _readImport(file) {
    let world = null;
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        world = decodeWorld(JSON.parse(await file.text()));
      } else {
        world = await unpackWorld(new Uint8Array(await file.arrayBuffer()));
      }
    } catch (_) {
      this.notice = { text: "Could not read that world file", t: 3 };
      return;
    }
    await this._takeOver(world);
  }

  /** Host entry point for a shared/legacy map payload. @returns {boolean} */
  importMapData(data) {
    let world;
    try {
      world = decodeWorld(data);
    } catch (_) {
      return false;
    }
    this._takeOver(world);
    return true;
  }

  /**
   * Edit `world` from this moment on — the host reads `.map` straight after
   * importing, so the swap cannot wait on storage — and give it its own slot as
   * soon as the store hands out an id. Until then `_slotPending` holds off every
   * write, because `currentSlot` still names the world this one replaced.
   */
  _takeOver(world) {
    this._slotPending = true;
    this._pendingWorld = world;
    this._adopt(world);
    this._markDirty(); // nothing has stored it yet
    return this._fire(this._saveAsNewSlot(world));
  }

  /**
   * Give `world` a slot of its own. `_slotPending` clears only once the world
   * is actually in the store: a store that failed before handing out an id
   * leaves `currentSlot` naming the world this one replaced, and clearing the
   * guard there would let the next save overwrite it. `saveMap` retries.
   */
  async _saveAsNewSlot(world) {
    if (this._slotSaving) return;
    this._slotSaving = true;
    try {
      const id = await this.store.nextId();
      this.currentSlot = id;
      this._persistSlot();
      await this.store.save(id, world);
      this.mapIndex = await this.store.list();
      this._slotPending = false;
      this._pendingWorld = null;
      this._dirty = false;
      this.saveFlash = 2;
      this.audio.menuConfirm();
    } catch (_) {
      this._warn("Imported world could not be saved \u2014 storage unavailable");
    } finally {
      this._slotSaving = false;
    }
  }

  /** Ctrl+Shift+S — hands the host a share hash, or explains why there is none. */
  async shareMap() {
    if (!this.world) return;
    const hash = await toShareHash(this.world);
    if (!hash) {
      this.notice = {
        text: "World too large to share by URL — export it instead",
        t: 3,
      };
      return;
    }
    if (this.onShareMap) this.onShareMap(hash);
  }

  // ─── Rendering (HUD only — the voxel renderer draws the world) ───

  /**
   * The HUD lives in `src/ui/forge-hud.js`: it is drawing only, and keeping
   * it out of here keeps this file about the world and the input that edits it.
   */
  render(ctx, w, h) {
    renderForge(this, ctx, w, h);
  }

  /**
   * The rows for the stations in reach, with the selection clamped: walking
   * away from a bench shrinks the list under an index that was valid when it
   * was made, and the Enter branch indexes straight into it.
   */
  _craftRows() {
    const rows = craftMenuRows(this.survival, this.stationsNear);
    if (this.craftIndex >= rows.length) this.craftIndex = Math.max(0, rows.length - 1);
    return rows;
  }
}
