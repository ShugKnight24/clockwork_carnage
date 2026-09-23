import { trackEvent } from "./analytics.js";
import { playBlockSound, playWaterSound, WaterSoundTracker } from "../src/audio/block-sounds.js";
import { VesselSoundTracker, playVesselSound } from "../src/audio/vessel-sounds.js";
import { requestPointerLockSafe, exitPointerLockSafe } from "../src/utils/pointer-lock.js";
import { World } from "../src/world/world.js";
import { AIR, BEDROCK, WATER, SAPLING, PLANKS, isSolid, isWater, isTargetable } from "../src/world/blocks.js";
import { randomTick, saplingFits } from "../src/world/trees.js";
import {
  VESSELS,
  VESSEL_KINDS,
  SEATED_EYE,
  makeVessel,
  sanitizeVessels,
  vesselsOf,
  stepVessel,
  placementFor,
  fitVessel,
  nearestVessel,
  dismountCell,
  pickVessel,
  seatOf,
  vesselPose,
  WakeTrail,
} from "../src/world/vessels.js";
import { vesselModel } from "../src/rendering/voxel/vessel-models.js";
import { generateWorld, randomSeed } from "../src/world/world-gen.js";
import { WorldStore, MemoryBackend } from "../src/world/world-store.js";
import { packWorld, unpackWorld, decodeWorld, toShareHash } from "../src/world/world-codec.js";
import { convertLegacyMap } from "../src/world/legacy-convert.js";
import { canExpand, expandWorld, canRestoreBounds, restoreBounds } from "../src/world/world-expand.js";
import {
  PLAYER,
  stepWalker,
  eyeInWater,
  groundHeight,
  raycastBlocks,
} from "../src/world/voxel-physics.js";
import { SurvivalSession } from "../src/rpg/survival-session.js";
import { PlayerStore } from "../src/rpg/player-store.js";
import { itemById } from "../src/rpg/items.js";
import { returnStack, takeStack, dropStack, shiftMove } from "../src/rpg/inventory-ops.js";
import { HOTBAR_SLOTS } from "../src/rpg/inventory.js";
import { inventoryLayout, resolveInventoryHit } from "./layout.js";
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
export const PLACEABLE_BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, WATER, 20, 21, 22, SAPLING];
/** Blocks the 0 key cycles — the natural set that has no digit of its own. */
const NATURAL_BLOCKS = [10, 11, 12, 13, 14, WATER, 20, 21, 22, SAPLING];
/** Seconds between the random ticks that grow saplings near the player. */
const GROW_TICK = 1;
export const TOOLS = ["block", "spawn", "pickup", "exit", "start", "vessel"];

/**
 * Boards the vessel in reach, or leaves the one ridden. `B` for "board" for
 * now: `E` is kept for a general interact action (tools, stations, vessels)
 * that does not exist yet, and moving boarding onto it is this one line.
 * With no vessel ridden or in reach the key keeps its older job, the
 * Endless/Bounded choice for the next world.
 */
export const VESSEL_KEY = "KeyB";
/** Seconds of held break that pick a vessel up in survival. */
const VESSEL_PICKUP_SECONDS = 0.5;
/** The list a world with no vessels answers, so none is written into its meta. */
const NO_VESSELS = Object.freeze([]);

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
/** Seconds between quiet saves while the world holds unsaved edits. */
export const AUTOSAVE_SECONDS = 30;

const clone = (v) => (v == null ? v : structuredClone(v));

// ─── Pure edit rules (unit-tested in tests/unit/forge-rules.test.js) ────────

/**
 * May a block go into this cell? Only empty, in-bounds, loaded cells that no
 * body (the editor's own player, a play-test entity) is standing in, and none
 * that would bury a marker.
 * @param {World} world
 * @param {Array<{x:number,y:number,z:number,half:number,height:number}>} bodies
 * @param {Array<{x:number,y:number,z:number}|null>} markers feet positions of
 *   the spawns, pickups, exit and start; a marker's body fills its own cell and
 *   the one above it, so neither may be filled with a block.
 * @param {number|null} [blockId] what is being placed. Water fills a cell as
 *   air does, so a block may replace it, and water may go where a body stands.
 */
export function placementAllowed(world, x, y, z, bodies = [], markers = [], blockId = null) {
  if (!world.inBounds(x, y, z) || !world.isLoaded(x, y)) return false;
  const here = world.get(x, y, z);
  if (here !== AIR && !isWater(here)) return false;
  if (blockId != null && !isSolid(blockId)) bodies = [];
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

/** The block a vessel sounds like when it is placed, boarded or taken: metal for a jetski, wood for the rest. */
const hullBlock = (kind) => (kind === "jetski" ? 3 : PLANKS);

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
 *
 * A block edit only replays onto the block it left behind. The world also
 * changes on its own — a sapling grows into a trunk, a bucket scoops water —
 * and undoing a planted sapling after it grew would otherwise cut the bottom
 * log out of a tree. A cell that no longer holds what the entry expects is
 * left alone and the replay reports false.
 */
export function applyEdit(world, edit) {
  if (edit.meta) {
    world.meta[edit.meta] = clone(edit.to);
    return true;
  }
  if (world.get(edit.x, edit.y, edit.z) !== edit.from) return false;
  return world.set(edit.x, edit.y, edit.z, edit.to);
}

export function undoEdit(world, edit) {
  if (edit.meta) {
    world.meta[edit.meta] = clone(edit.from);
    return true;
  }
  if (world.get(edit.x, edit.y, edit.z) !== edit.to) return false;
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
    // A placeholder until _adopt stands the player on a world's spawn.
    this.player = { x: 0.5, y: 0.5, z: World.GROUND, angle: 0, pitch: 0 };
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
    /** B toggles whether Ctrl+N makes an endless world (the default) or the 128 × 128 box. */
    this.boundedNew = false;

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
    /** The slot a drag started on, so a press-and-release on it is a select. */
    this.pressedSlot = -1;
    /** Last HUD size seen while drawing, so input can lay out the same grid. */
    this.hudSize = { w: 1280, h: 720 };
    /** Stations within reach, refreshed on a timer rather than per frame. */
    this.stationsNear = new Set();
    this.stationPoll = 0;
    this.selectedEnemy = 0;
    this.selectedPickup = 0;
    /** The vessel kind the vessel tool places, an index into VESSEL_KINDS. */
    this.vesselKind = 0;
    /** The vessel being ridden, or null. It is one of `world.meta.vessels`. */
    this.riding = null;
    /** The vessel under the crosshair when it is nearer than any block. */
    this.vesselTarget = null;
    this._vesselBreakT = 0;
    /** How the ridden hull sits this frame (bob, pitch, roll), for the seat camera. */
    this._ridePose = { dz: 0, pitch: 0, roll: 0 };
    /** Seconds the Forge has run: the clock the hulls bob to. */
    this._clock = 0;
    this._wake = new WakeTrail();
    this._vesselSounds = new VesselSoundTracker();

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
    /** Seconds of play since the last autosave check. */
    this._autosaveT = 0;
    /** The page-hide listeners, registered once by the first `start()`. */
    this._onPageHide = null;

    this.keys = {};
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.mouseLocked = false;

    this.onPlayTest = null;
    this.onShareMap = null;
  }

  /** `VESSEL_KEY` as the HUD names it ("B"), so a moved binding moves its hints too. */
  get vesselKeyLabel() {
    return VESSEL_KEY.replace(/^Key/, "");
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
          seed: randomSeed(),
          name: "My Creation",
          endless: true,
        });
        await this.store.save(0, world);
        this.mapIndex = await this.store.list();
        this._adopt(world, 0);
      } else {
        const id = this._preferredSlot();
        const world =
          (await this.store.load(id)) ||
          generateWorld({ terrain: true, seed: randomSeed(), endless: true });
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
    this._autosaveT = 0;
    this._listenForPageHide();

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

  /**
   * Write unsaved edits now, quietly: the autosave and the page-hide handler.
   * The explicit save keeps its flash; this one only speaks up if it fails,
   * and leaves the world dirty so the next attempt writes it again.
   */
  flush() {
    if (!this._dirty || !this.world || this._slotBusy()) return Promise.resolve();
    this._dirty = false;
    return this._persistCurrent().catch(() => {
      this._markDirty();
      this._warn("Autosave failed — storage unavailable");
    });
  }

  /**
   * A tab closed, reloaded or sent to the background may never come back, so
   * unsaved edits go to the store as it hides. `visibilitychange` covers the
   * mobile browsers that skip `pagehide`. One set of listeners per Forge; they
   * outlive `stop()`, and `flush()` has nothing to do once it has written.
   */
  _listenForPageHide() {
    if (this._onPageHide || typeof globalThis.addEventListener !== "function") return;
    this._onPageHide = () => this._fire(this.flush());
    globalThis.addEventListener("pagehide", this._onPageHide);
    globalThis.document?.addEventListener?.("visibilitychange", () => {
      if (globalThis.document.visibilityState === "hidden") this._onPageHide();
    });
  }

  /** Storage is gone: keep editing in memory and say so on the HUD. */
  async _fallBackToMemory() {
    this.store = new WorldStore(new MemoryBackend());
    this.storageFailed = true;
    const world = generateWorld({
      terrain: true,
      seed: randomSeed(),
      name: "My Creation",
      endless: true,
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
        // A craft spends inputs and may fill the selected slot with the output.
        this.refreshHeld();
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
    if (code === "KeyB" && ctrl) {
      e.preventDefault();
      this.toggleEndless();
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
      if (this.toolMode === "vessel") {
        this.vesselKind = (this.vesselKind + 1) % VESSEL_KINDS.length;
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
      const n = parseInt(code.charAt(5), 10);
      // In survival a digit picks a hotbar slot; creative still picks a block.
      if (this.survival) this.selectHotbar(n - 1);
      else {
        this.tile = n;
        this.audio.menuSelect();
      }
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
      if (this.riding) this._dismount(); // noclip flies; it does not steer a hull
      this.noclip = !this.noclip;
      this.velZ = 0;
      return true;
    }
    if (code === "KeyV" && !ctrl) {
      this.terrainNew = !this.terrainNew;
      this.audio.menuSelect();
      return true;
    }
    if (code === VESSEL_KEY && !ctrl && this._toggleRide()) return true;
    if (code === "KeyB" && !ctrl) {
      this.boundedNew = !this.boundedNew;
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

  handleMouseDown(button, shift = false) {
    // The screen owns the cursor while it is open, so no click reaches the world.
    if (this.invOpen) { this._invPress(button, shift); return; }
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
      case "vessel":
        if (place) this.placeVessel(VESSEL_KINDS[this.vesselKind]);
        else {
          this.holdingBreak = true;
          this.removeBlock();
        }
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
    if (this.invOpen) { this._invRelease(button); return; }
    if (button === 0) return;
    this.holdingBreak = false;
    this.survival?.cancelBreak();
    this.breakProgress = 0;
    this._vesselBreakT = 0;
  }

  /**
   * Mouse wheel steps the survival hotbar and cycles the creative palette.
   * Survival still cycles the palette as well, because a station has no other
   * way to be selected until placement reads the hotbar alone.
   */
  handleWheel(deltaY) {
    if (!this.active) return;
    const dir = deltaY > 0 ? 1 : -1;
    if (this.survival) {
      this.hotbarIndex = (this.hotbarIndex + dir + HOTBAR_SLOTS) % HOTBAR_SLOTS;
      this.refreshHeld();
      this.audio.menuSelect();
      return;
    }
    const pal = this._palette();
    const i = pal.indexOf(this.tile);
    const n = pal.length;
    this.tile = pal[(i + dir + n) % n];
    this.audio.menuSelect();
  }

  /** Select a hotbar slot, which is what decides the block you place. */
  selectHotbar(i) {
    if (!this.survival || i < 0 || i >= HOTBAR_SLOTS) return;
    this.hotbarIndex = i;
    this.refreshHeld();
    this.audio.menuSelect();
  }

  /**
   * `heldItem` follows the selected slot. The selection deliberately stays put
   * when a slot empties: jumping would move the player's hand without asking.
   */
  refreshHeld() {
    if (!this.survival) { this.heldItem = null; return; }
    this.heldItem = this.survival.inventory.slots[this.hotbarIndex]?.item ?? null;
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
    // Walking never enters a column that is not loaded (it is solid), so the
    // player standing in one was put there: a teleport, a noclip flight past
    // the streamer, a test. Load the ground under them now (spec §5).
    if (this.world.unloadedAt(Math.floor(this.player.x), Math.floor(this.player.y))) {
      this.world.loadAround(this.player.x, this.player.y);
    }
    if (this.saveFlash > 0) this.saveFlash = Math.max(0, this.saveFlash - dt);
    if (this.notice) {
      this.notice.t -= dt;
      if (this.notice.t <= 0) this.notice = null;
    }
    this._autosaveT += dt;
    if (this._autosaveT >= AUTOSAVE_SECONDS) {
      this._autosaveT = 0;
      this._fire(this.flush());
    }
    this._growT = (this._growT ?? 0) + dt;
    if (this._growT >= GROW_TICK) {
      this._growT = 0;
      // Growth writes the world directly: it is not the player's edit to undo.
      if (randomTick(this.world, this.player.x, this.player.y, Math.random) > 0) this._markDirty();
    }
    this._clock += dt;
    this._stepVessels(dt);
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
      if (this.holdingBreak && this.vesselTarget && !this.invOpen) {
        // A vessel is not mined: holding the button on it for a moment
        // takes it back into the inventory, whatever the pick.
        this._vesselBreakT += dt;
        this.breakProgress = Math.min(1, this._vesselBreakT / VESSEL_PICKUP_SECONDS);
        if (this._vesselBreakT >= VESSEL_PICKUP_SECONDS) {
          this._takeVessel(this.vesselTarget);
          this._vesselBreakT = 0;
          this.breakProgress = 0;
        }
      } else if (this.holdingBreak && this.target && !this.invOpen) {
        const t = this.target;
        // `dt` is seconds here; the session counts a break in milliseconds.
        const hitId = this.world.get(t.x, t.y, t.z);
        const res = this.survival.tickBreak(dt * 1000, t, hitId);
        this.breakProgress = this.survival.progress;
        // Chip sounds while the pick works, so a slow break still feels busy.
        this.mineTap = (this.mineTap ?? 0) - dt;
        if (!res.broke && this.breakProgress > 0 && this.mineTap <= 0) {
          playBlockSound(this.audio, hitId, "hit");
          this.mineTap = 0.24;
        }
        if (res.broke) {
          this._editBlock(t.x, t.y, t.z, AIR);
          playBlockSound(this.audio, hitId, "break");
          if (res.leveled) this._warn(`Mining level ${this.survival.miningLevel()}`);
          this.breakProgress = 0;
          // The drop may have landed in the selected slot; the tool just wore.
          this.refreshHeld();
        }
      } else if (this.breakProgress !== 0) {
        this.survival.cancelBreak();
        this.breakProgress = 0;
        this._vesselBreakT = 0;
      }
    }

    // A rider steers the hull (`_stepVessels`) and sits where it put them.
    if (this.riding) {
      this.target = this._pick();
      return;
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
      const { x0, y0, x1, y1 } = this.world.bounds;
      this.player.x = Math.max(x0 + PLAYER.half, Math.min(x1 - PLAYER.half, this.player.x + mx));
      this.player.y = Math.max(y0 + PLAYER.half, Math.min(y1 - PLAYER.half, this.player.y + my));
      this.player.z = Math.max(
        0,
        Math.min(World.H - PLAYER.height, this.player.z + dz),
      );
      this.velZ = 0;
      this.grounded = false;
    } else {
      // Walking and swimming are one step; on dry land it is the old
      // jump-gravity-move sequence. Space swims up, the crouch key dives.
      const s = (this._walker ??= { against: false, submersion: 0 });
      s.x = this.player.x; s.y = this.player.y; s.z = this.player.z;
      s.velZ = this.velZ; s.grounded = this.grounded;
      const down = this.keys[this.keybinds.crouch] || this.keys["ControlLeft"] || this.keys["ControlRight"];
      stepWalker(this.world, s, { mx, my, up: !!this.keys["Space"], down: !!down }, dt);
      this.player.x = s.x; this.player.y = s.y; this.player.z = s.z;
      this.velZ = s.velZ; this.grounded = s.grounded;
      this._waterSounds(s, len > 0 || !!this.keys["Space"] || !!down, dt);
    }

    this.target = this._pick();
  }

  /** Splashes, drips and strokes from how wet the player is this frame. */
  _waterSounds(s, moving, dt) {
    const eyeUnder = eyeInWater(this.world, s.x, s.y, s.z + PLAYER.eye);
    const events = (this._splash ??= new WaterSoundTracker()).update({ sub: s.submersion, eyeUnder, velZ: s.velZ, moving, dt });
    for (const [kind, strength] of events) playWaterSound(this.audio, kind, strength);
  }

  // ─── Camera and sprites for the voxel renderer ───────────

  /** @returns {{x:number,y:number,z:number,yaw:number,pitch:number,fovDeg:number}} eye camera */
  cameraFor() {
    return {
      x: this.player.x,
      y: this.player.y,
      // Seated, the eye is lower, and it rides the hull's bob.
      z: this.riding ? this.player.z + SEATED_EYE + this._ridePose.dz : this.player.z + PLAYER.eye,
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

  /**
   * The block under the crosshair — or, when a vessel's hull is nearer, no
   * block and `vesselTarget` set: you are aiming at the hull, not past it.
   */
  _pick() {
    const cam = this.cameraFor();
    const cp = Math.cos(cam.pitch);
    const dx = Math.cos(cam.yaw) * cp, dy = Math.sin(cam.yaw) * cp, dz = Math.sin(cam.pitch);
    const hit = this._pickBlock(cam, dx, dy, dz);
    const hulls = this._liveVessels().filter((v) => v !== this.riding);
    const hull = hulls.length ? pickVessel(hulls, cam.x, cam.y, cam.z, dx, dy, dz, PLAYER.reach) : null;
    this.vesselTarget = hull && (!hit || hull.dist < hit.dist) ? hull.vessel : null;
    return this.vesselTarget ? null : hit;
  }

  _pickBlock(cam, dx, dy, dz) {
    return raycastBlocks(
      this.world,
      cam.x,
      cam.y,
      cam.z,
      dx,
      dy,
      dz,
      PLAYER.reach,
      // Holding water in creative, or an empty bucket in survival, the ray
      // stops on water too: place on a lake's surface to raise it, break or
      // scoop to take water away. Otherwise it stops on anything solid and on
      // saplings, which are walked through but can still be dug up.
      this._targetsWater() ? (id) => id !== AIR : isTargetable,
    );
  }

  _targetsWater() {
    // A vessel goes on the water, so the ray has to stop there to place one.
    if (this.toolMode === "vessel") return true;
    if (this.survival) return this.heldItem === "bucket" || !!itemById(this.heldItem)?.vessel;
    return this.toolMode === "block" && this.tile === WATER;
  }

  /**
   * Scoop with an empty bucket, pour with a full one. The world edit is an
   * ordinary one (undo, save); the session turns the held bucket over.
   */
  _useBucket() {
    const i = this.hotbarIndex;
    if (this.heldItem === "bucket") {
      const t = this.target;
      if (!t || !isWater(this.world.get(t.x, t.y, t.z))) { this._warn("Nothing to scoop"); return; }
      if (this._editBlock(t.x, t.y, t.z, AIR)) {
        this.survival.fillBucket(i);
        playBlockSound(this.audio, WATER, "break");
      }
    } else {
      const c = this._placeCell();
      if (!c || !placementAllowed(this.world, c.x, c.y, c.z, this._bodies(), this._markers(), WATER)) return;
      if (this._editBlock(c.x, c.y, c.z, WATER)) {
        this.survival.emptyBucket(i);
        playBlockSound(this.audio, WATER, "place");
      }
    }
    this.refreshHeld();
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
    if (!apply(this.world, edit)) {
      this._warn("That spot has changed since");
      return;
    }
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
    if (this.survival && (this.heldItem === "bucket" || this.heldItem === "bucket_water")) { this._useBucket(); return; }
    if (this.survival && itemById(this.heldItem)?.vessel) { this.placeVessel(this.heldItem); return; }
    const c = this._placeCell();
    if (!c) return;
    if (!placementAllowed(this.world, c.x, c.y, c.z, this._bodies(), this._markers(), this.survival ? null : this.tile))
      return;
    const planting = this.survival ? this.heldItem === "sapling" : this.tile === SAPLING;
    if (planting && !saplingFits(this.world, c.x, c.y, c.z)) { this._warn("Saplings need grass or dirt"); return; }

    if (!this.survival) {
      if (this._editBlock(c.x, c.y, c.z, this.tile)) playBlockSound(this.audio, this.tile, "place");
      return;
    }

    const itemId = this.heldItem;
    if (!itemId) { this._warn("Nothing selected"); return; }
    const spend = this.survival.tryPlace(itemId);
    if (!spend.ok) {
      this._warn(spend.reason);
      return;
    }
    if (this._editBlock(c.x, c.y, c.z, spend.blockId)) {
      this.survival.markPlaced(c.x, c.y, c.z);
      playBlockSound(this.audio, spend.blockId, "place");
    } else {
      this.survival.refund(itemId); // the edit was a no-op; do not eat the item
    }
    // The stack just shrank, and the last one of it may have gone.
    this.refreshHeld();
  }

  /** In survival this only *starts* a break; holding the button finishes it. */
  removeBlock() {
    // A hull under the crosshair is what the button is for. Creative takes
    // it at once; survival picks it up on a held button (`update`).
    if (this.vesselTarget) {
      if (!this.survival) this._takeVessel(this.vesselTarget);
      this._vesselBreakT = 0;
      return;
    }
    const t = this.target;
    if (!t) return;
    if (!removeAllowed(this.world, t.x, t.y, t.z)) return;

    if (!this.survival) {
      const id = this.world.get(t.x, t.y, t.z);
      if (this._editBlock(t.x, t.y, t.z, AIR)) playBlockSound(this.audio, id, "break");
      return;
    }

    const begun = this.survival.beginBreak(t, this.world.get(t.x, t.y, t.z));
    if (!begun.ok) this._warn(begun.reason);
  }

  // ─── Vessels ─────────────────────────────────────────────

  /** The world's vessels. A world that never had one answers an empty list and keeps no key for it. */
  _vessels() {
    return this.world?.meta.vessels || NO_VESSELS;
  }

  /**
   * Vessels in loaded columns: the ones that move, are drawn and can be
   * reached. One in a column that is not loaded is frozen where it was, as
   * an enemy is (endless-world spec §16), and stays in the save.
   */
  _liveVessels() {
    const w = this.world, list = this._vessels();
    if (!w || !list.length) return NO_VESSELS;
    return list.filter((v) => !w.unloadedAt(Math.floor(v.x), Math.floor(v.y)));
  }

  /** WASD and Space as a hull's controls: throttle, steering, a jetski's hop. */
  _rideInput() {
    const k = this.keys, b = this.keybinds;
    return {
      throttle: (k[b.moveForward] ? 1 : 0) - (k[b.moveBack] ? 1 : 0),
      steer: (k[b.moveRight] ? 1 : 0) - (k[b.moveLeft] ? 1 : 0),
      hop: !!k.Space,
    };
  }

  /**
   * One frame of every live vessel. The ridden one takes the keys (not while
   * a screen owns them) and turns the rider's view with it, the way a seat
   * turns under you; the rest drift and settle. Any hull that moved is an
   * unsaved change, since vessels are saved with the world.
   */
  _stepVessels(dt) {
    const live = this._liveVessels(), r = this.riding;
    for (const v of live) {
      const steer = v === r && !this.overhead && !this.invOpen && !this.craftOpen;
      const x = v.x, y = v.y, z = v.z, yaw = v.yaw;
      const input = steer ? this._rideInput() : undefined;
      const ev = stepVessel(this.world, v, input, dt);
      if (Math.abs(v.x - x) + Math.abs(v.y - y) + Math.abs(v.z - z) > 1e-4) this._markDirty();
      if (v === r) {
        this.player.angle += v.yaw - yaw;
        const sounds = this._vesselSounds.update({ kind: v.kind, throttle: input?.throttle ?? 0, dt, ...ev });
        for (const [name, k, pitch] of sounds) playVesselSound(this.audio, name, k, pitch, v.kind);
      } else if ((ev.splash > 2 || ev.bump > 2) && Math.hypot(v.x - this.player.x, v.y - this.player.y) < 16) {
        // Someone else's hull landing or hitting the shore nearby.
        playVesselSound(this.audio, ev.splash > 2 ? "splash" : "bump", Math.max(ev.splash, ev.bump) / 10, 1, v.kind);
      }
    }
    this._wake.update(dt, live);
    if (r) this._seatRider();
  }

  /** Put the rider on the seat of the hull they ride. */
  _seatRider() {
    const s = seatOf(this.riding);
    this.player.x = s.x;
    this.player.y = s.y;
    this.player.z = s.z;
    this.velZ = 0;
    this.grounded = true;
    this._ridePose = vesselPose(this.riding, this._clock);
  }

  /**
   * `VESSEL_KEY`: leave the vessel ridden, or board the nearest one in reach.
   * @returns {boolean} false when there was nothing to board, so the key can
   *   fall through to its other job
   */
  _toggleRide() {
    if (this.riding) {
      this._dismount();
      return true;
    }
    if (!this.world) return false;
    const v = nearestVessel(this._liveVessels(), this.player.x, this.player.y, this.player.z);
    if (!v) return false;
    this.riding = v;
    this._vesselSounds = new VesselSoundTracker();
    this.noclip = false;
    this.holdingBreak = false;
    this.breakProgress = 0;
    this._seatRider();
    playBlockSound(this.audio, hullBlock(v.kind), "place");
    return true;
  }

  /** Step off onto the nearest dry cell, or into the water beside the hull. */
  _dismount() {
    const v = this.riding;
    if (!v) return;
    this.riding = null;
    const d = dismountCell(this.world, v);
    this.player.x = d.x;
    this.player.y = d.y;
    this.player.z = d.z;
    this.velZ = 0;
    this.grounded = d.dry;
    this._ridePose = { dz: 0, pitch: 0, roll: 0 };
    this._markDirty();
    playBlockSound(this.audio, hullBlock(v.kind), "hit");
  }

  /**
   * Put a vessel of `kind` on the targeted water or level ground, facing the
   * way the builder looks. Survival spends one from the inventory.
   */
  placeVessel(kind) {
    const k = VESSELS[kind];
    if (!k || !this.world) return;
    if (this.survival && this.survival.inventory.count(kind) < 1) {
      this._warn(`No ${k.name} to place`);
      return;
    }
    const aimed = placementFor(this.world, kind, this.target);
    if (!aimed) {
      this._warn("Place it on water or level ground");
      return;
    }
    const at = fitVessel(this.world, this._liveVessels(), kind, aimed);
    if (!at) {
      this._warn(`No room for a ${k.name} here`);
      return;
    }
    if (this.survival) {
      this.survival.inventory.remove(kind, 1);
      this.refreshHeld();
    }
    vesselsOf(this.world).push(makeVessel(kind, at.x, at.y, at.z, this.player.angle));
    this._markDirty();
    playBlockSound(this.audio, hullBlock(kind), "place");
    if (isWater(this.target.id)) playWaterSound(this.audio, "enter", 0.35);
  }

  /** Take a vessel out of the world; survival gets the item back. */
  _takeVessel(v) {
    if (!v || v === this.riding) return;
    if (this.survival) {
      if (!this.survival.inventory.fits(v.kind, 1)) {
        this._warn("Inventory full");
        return;
      }
      this.survival.inventory.add(v.kind, 1);
      this.refreshHeld();
    }
    const list = this._vessels();
    const i = list.indexOf(v);
    if (i >= 0) list.splice(i, 1);
    if (this.vesselTarget === v) this.vesselTarget = null;
    this._markDirty();
    playBlockSound(this.audio, hullBlock(v.kind), "break");
  }

  /** Hulls for the voxel renderer's model pass, bobbing on the water. */
  modelsFor() {
    const out = [];
    for (const v of this._liveVessels()) {
      const p = v === this.riding ? this._ridePose : vesselPose(v, this._clock);
      out.push({ model: vesselModel(v.kind), x: v.x, y: v.y, z: v.z + p.dz, yaw: v.yaw, pitch: p.pitch, roll: p.roll });
    }
    return out;
  }

  /** A jetski's spray and foam, as plain particles for the renderer's additive pass. */
  fxFor() {
    return this._wake.sprites();
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
    return PLACEABLE_BLOCKS;
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
    // half-finished break belongs to the mode that is ending. Both the mode
    // and the cleared flags are saved with the world.
    this.survivalSession.resetPlaced();
    this._markDirty();
    // A stack on the cursor goes back while the inventory it came from is
    // still reachable — `_dropCarried` cannot return it once `survival` is null.
    this._dropCarried();
    this.survival = attachSurvival(this.world, this.survivalSession);
    // A different inventory (or none at all) is now under the same index.
    this.refreshHeld();
    this.holdingBreak = false;
    this.breakProgress = 0;
    if (!this.survival) {
      this.craftOpen = false;
      this.craftIndex = 0;
      this.invOpen = false;
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
      // Whatever the screen rearranged, the hand goes back to the same index.
      this.refreshHeld();
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

  /** The cell under the cursor, laid out from the same size the screen drew at. */
  _invHit() {
    const inv = this.survival.inventory;
    const layout = inventoryLayout(this.hudSize.w, this.hudSize.h, inv.slots.length);
    return resolveInventoryHit(layout, this.cursor.x, this.cursor.y);
  }

  _invPress(button, shift) {
    if (button !== 0) return;
    const hit = this._invHit();
    if (hit.kind !== "slot") return;
    const inv = this.survival.inventory;
    if (shift) {
      shiftMove(inv, hit.index);
      this.refreshHeld();
      this.audio.menuSelect();
      return;
    }
    if (this.carried) {
      this.carried = dropStack(inv, hit.index, this.carried);
      this.refreshHeld();
      return;
    }
    this.pressedSlot = hit.index;
    this.carried = takeStack(inv, hit.index);
    this.refreshHeld();
  }

  _invRelease(button) {
    if (button !== 0) return;
    const hit = this._invHit();
    const inv = this.survival.inventory;

    if (this.carried && hit.kind === "slot") {
      // Released on the slot it came from with no move: treat it as a select.
      if (hit.index === this.pressedSlot) {
        this.carried = dropStack(inv, hit.index, this.carried);
        if (hit.index < HOTBAR_SLOTS) this.hotbarIndex = hit.index;
      } else {
        this.carried = dropStack(inv, hit.index, this.carried);
      }
    } else if (this.carried) {
      this._dropCarried(); // outside the panel: put it back, never lose it
    }
    this.refreshHeld();
    this.pressedSlot = -1;
  }

  /** Make `world` the one being edited: drop history, stand the player on its spawn. */
  _adopt(world, id = this.currentSlot) {
    // A rider belongs to the world they were riding in.
    this.riding = null;
    this.vesselTarget = null;
    this._wake = new WakeTrail();
    // Saved vessels are data from disk or a link: checked before they move.
    if (world.meta.vessels !== undefined) world.meta.vessels = sanitizeVessels(world.meta.vessels);
    this.world = world;
    // The placed-block flags live in the world and were loaded with it; the
    // character's skills and inventory deliberately carry over.
    this.survivalSession.attach(world);
    // Before the swap, while the old world's inventory can still take it back.
    this._dropCarried();
    this.survival = attachSurvival(world, this.survivalSession);
    this.refreshHeld();
    this.craftOpen = false; // a creative world must never inherit an open menu
    this.craftIndex = 0;
    this.invOpen = false; // nor an open inventory screen
    this.currentSlot = id;
    this.history = [];
    this.historyIndex = -1;
    this.velZ = 0;
    this.player.pitch = 0;
    const s = world.meta.spawn || world.defaultSpawn();
    // An endless world holds no columns until something asks: the ground the
    // player lands on is loaded now, the rest streams in as it is drawn.
    world.loadAround(s.x, s.y);
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
    trackEvent("forge_save", {
      map_name: this.world.meta.name,
      block_count: this.world.countBlocks(),
      edited_columns: this.world.edits.size,
      endless: this.world.endless,
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
        seed: randomSeed(),
        name: `Map ${id + 1}`,
        endless: !this.boundedNew,
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

  /**
   * Ctrl+B, pressed twice: grow a bounded world endless, or put one that grew
   * back inside its old edge (world-expand.js). The first press only asks, on
   * the notice line; a second press while that notice is up confirms. Either
   * way nothing is lost — the old bounds ride in the world's meta, and edits
   * outside them wait there — so the result is saved at once, and the player
   * stays where they stand if that is still inside the world.
   */
  toggleEndless() {
    const w = this.world;
    if (!w || this._slotBusy()) return;
    const grow = canExpand(w);
    if (!grow && !canRestoreBounds(w)) {
      this._warn("This world is already endless");
      return;
    }
    if (!this.notice || this.notice !== this._endlessAsk) {
      this._warn(grow
        ? "Make this world endless? New land blends into its edge. Ctrl+B again to confirm"
        : "Put this world back inside its old edge? Ctrl+B again to confirm");
      this._endlessAsk = this.notice;
      return;
    }
    this._endlessAsk = null;
    const next = grow ? expandWorld(w) : restoreBounds(w);
    const { x, y, z, angle, pitch } = this.player;
    this._adopt(next);
    if (next.inBounds(Math.floor(x), Math.floor(y), 0)) {
      Object.assign(this.player, { x, y, z, angle, pitch });
      next.loadAround(x, y);
    }
    this._markDirty();
    this.saveMap();
    this.notice = { text: grow ? "The world is endless now (Ctrl+B twice to undo)" : "The world is back inside its old edge", t: 3 };
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
    this.hudSize.w = w;
    this.hudSize.h = h;
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
