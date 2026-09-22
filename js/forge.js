import { trackEvent } from "./analytics.js";
import { ENEMY_TYPES } from "./data.js";
import { requestPointerLockSafe, exitPointerLockSafe } from "../src/utils/pointer-lock.js";
import { World } from "../src/world/world.js";
import { AIR, BEDROCK, BLOCKS } from "../src/world/blocks.js";
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

// All placeable enemy type keys (exclude boss forms — they're phase variants)
const ENEMY_KEYS = Object.keys(ENEMY_TYPES).filter(
  (k) => k !== "boss_form2" && k !== "boss_form3",
);
const ENEMY_SHORT_NAMES = {};
for (const k of ENEMY_KEYS) ENEMY_SHORT_NAMES[k] = ENEMY_TYPES[k].name;

const PICKUP_TYPES = ["health", "ammo", "weapon"];
const PICKUP_LABELS = { health: "Health", ammo: "Ammo", weapon: "Weapon" };
const PICKUP_COLORS = { health: "#44ff44", ammo: "#ffcc00", weapon: "#00ccff" };

/** Every block a builder may place. Bedrock (15) is the world floor and is not one. */
export const PLACEABLE_BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
/** Blocks the 0 key cycles — the natural set that has no digit of its own. */
const NATURAL_BLOCKS = [10, 11, 12, 13, 14];
export const TOOLS = ["block", "spawn", "pickup", "exit", "start"];

// Legacy 2D-builder storage, read once at start and then left alone.
const LEGACY_SAVE_KEY = "cc_builder_map";
const LEGACY_INDEX_KEY = "cc_builder_maps_index";
const FORGE_CURRENT_KEY = "cc_forge_current_slot";

const PITCH_LIMIT = (85 * Math.PI) / 180;
const MOVE_SPEED = 8.0;
const NOCLIP_SPEED = 14.0;
const MAX_HISTORY = 200;
const HOTBAR_VISIBLE = 10;
const MARKER_SIZE = 0.8;

const clone = (v) => (v == null ? v : structuredClone(v));

// ─── Pure edit rules (unit-tested in tests/unit/forge-rules.test.js) ────────

/**
 * May a block go into this cell? Only empty, in-bounds cells that no body
 * (the editor's own player, a play-test entity) is standing in.
 * @param {World} world
 * @param {Array<{x:number,y:number,z:number,half:number,height:number}>} bodies
 */
export function placementAllowed(world, x, y, z, bodies = []) {
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
  return true;
}

/** Anything solid but bedrock can be dug out. */
export function removeAllowed(world, x, y, z) {
  if (!world.inBounds(x, y, z)) return false;
  const id = world.get(x, y, z);
  return id !== AIR && id !== BEDROCK;
}

/**
 * The slice of the palette to draw, always containing `selected`.
 * @returns {{start:number,end:number}} half-open range of indices
 */
export function hotbarWindow(selected, total, visible) {
  const span = Math.max(1, Math.min(visible, total));
  const start = Math.max(0, Math.min(selected - (span >> 1), total - span));
  return { start, end: start + span };
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

const FACE_LABELS = [
  [0, 0, 1, "Top"],
  [0, 0, -1, "Bottom"],
  [1, 0, 0, "+X"],
  [-1, 0, 0, "-X"],
  [0, 1, 0, "+Y"],
  [0, -1, 0, "-Y"],
];

function faceLabel(face) {
  if (!face) return "";
  for (const [x, y, z, label] of FACE_LABELS) {
    if (face[0] === x && face[1] === y && face[2] === z) return label;
  }
  return "";
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
    this.selectedEnemy = 0;
    this.selectedPickup = 0;

    this.currentSlot = 0;
    this.mapIndex = []; // [{id, name, updatedAt}]
    /** True once the store has failed and the session is memory-only. */
    this.storageFailed = false;
    this._busy = false;
    /** An imported world is being edited before its slot id exists. */
    this._slotPending = false;
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

    requestPointerLockSafe(this.canvas);
  }

  /**
   * The host saves before calling this (input-dispatch does on Q), so only edits
   * made since the last save are written again.
   */
  stop() {
    this.active = false;
    if (this._dirty) this._fire(this._persistCurrent());
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
    if (code === "KeyH" && !ctrl) {
      this.showHelp = !this.showHelp;
      return true;
    }
    if (code === "KeyP" && !ctrl) {
      if (this.onPlayTest) this.onPlayTest();
      return true;
    }
    if (code === "BracketLeft" && !ctrl) {
      this.settings.fov = Math.max(50, this.settings.fov - 5);
      this.audio.menuSelect();
      return true;
    }
    if (code === "BracketRight" && !ctrl) {
      this.settings.fov = Math.min(120, this.settings.fov + 5);
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
        else this.removeBlock();
    }
  }

  /** Mouse wheel cycles the placeable palette. The host routes wheel events here. */
  handleWheel(deltaY) {
    if (!this.active) return;
    const i = PLACEABLE_BLOCKS.indexOf(this.tile);
    const dir = deltaY > 0 ? 1 : -1;
    const n = PLACEABLE_BLOCKS.length;
    this.tile = PLACEABLE_BLOCKS[(i + dir + n) % n];
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

    if (this.mouseLocked) {
      const sens = (this.settings.sensitivity || 1.0) * 0.002;
      const invX = this.settings.invertX ? -1 : 1;
      const invY = this.settings.invertY ? -1 : 1;
      this.player.angle += this.mouseDx * sens * invX;
      this.player.pitch -= this.mouseDy * sens * invY;
      this.player.pitch = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, this.player.pitch),
      );
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
      this.player.x = Math.max(0.01, Math.min(World.W - 0.01, this.player.x + mx));
      this.player.y = Math.max(0.01, Math.min(World.D - 0.01, this.player.y + my));
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
      fovDeg: this.settings.fov || 70,
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

  _record(edit) {
    const next = recordEdit(this.history, this.historyIndex, edit);
    this.history = next.history;
    this.historyIndex = next.index;
    this._dirty = true;
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

  undo() {
    if (this.historyIndex < 0) return;
    undoEdit(this.world, this.history[this.historyIndex--]);
    this.audio.menuSelect();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    applyEdit(this.world, this.history[++this.historyIndex]);
    this.audio.menuSelect();
  }

  placeBlock() {
    const c = this._placeCell();
    if (!c) return;
    if (!placementAllowed(this.world, c.x, c.y, c.z, this._bodies())) return;
    if (this._editBlock(c.x, c.y, c.z, this.tile)) this.audio.menuConfirm();
  }

  removeBlock() {
    const t = this.target;
    if (!t) return;
    if (!removeAllowed(this.world, t.x, t.y, t.z)) return;
    if (this._editBlock(t.x, t.y, t.z, AIR)) this.audio.menuSelect();
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

  /** Make `world` the one being edited: drop history, stand the player on its spawn. */
  _adopt(world, id = this.currentSlot) {
    this.world = world;
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
    return this._persistCurrent().catch(() => {
      this._dirty = true;
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
      this._dirty = false;
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
      this._dirty = false;
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
      this._dirty = false;
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
    this.saveMap();
  }

  /**
   * One-time import of the 2D builder's localStorage maps. Each legacy key is
   * converted once — a world already carrying that `meta.legacyKey` is proof it
   * ran — and localStorage is left untouched.
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

    const rows = await this.store.list();
    const claimed = new Set();
    for (const row of rows) {
      const world = await this.store.load(row.id).catch(() => null);
      if (world?.meta?.legacyKey) claimed.add(world.meta.legacyKey);
    }

    for (const key of keys) {
      if (claimed.has(key)) continue;
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
      claimed.add(key);
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
    this._adopt(world);
    this._dirty = true; // nothing has stored it yet
    return this._fire(this._saveAsNewSlot(world));
  }

  async _saveAsNewSlot(world) {
    try {
      const id = await this.store.nextId();
      this.currentSlot = id;
      this._slotPending = false;
      this._persistSlot();
      await this.store.save(id, world);
      this.mapIndex = await this.store.list();
      this._dirty = false;
      this.saveFlash = 2;
      this.audio.menuConfirm();
    } catch (_) {
      this._warn("Imported world could not be saved \u2014 storage unavailable");
    } finally {
      this._slotPending = false;
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

  render(ctx, w, h) {
    if (!this.world) return;
    if (this.overhead) this._renderOverhead(ctx, w, h);
    else this._renderHUD(ctx, w, h);
  }

  _renderHUD(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeStyle = this.target ? "#00ffcc" : "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();

    if (this.target) {
      const t = this.target;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `[${t.x},${t.y},${t.z}] ${BLOCKS[t.id]?.name || "?"}  ${faceLabel(t.face)}`,
        cx,
        cy + 22,
      );
      ctx.textAlign = "left";
    }

    this._renderHotbar(ctx, w, h);
    this._renderToolLabel(ctx, w, h);

    if (this.showHelp && !this.suppressHelp) this._renderHelp(ctx);
    this._renderStatus(ctx, w, h);

    if (this.saveFlash > 0) {
      ctx.fillStyle = `rgba(0,255,200,${Math.min(1, this.saveFlash) * 0.9})`;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WORLD SAVED", w / 2, 36);
      ctx.textAlign = "left";
    }
    if (this.notice) {
      ctx.fillStyle = `rgba(255,120,80,${Math.min(1, this.notice.t)})`;
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.notice.text, w / 2, 76);
      ctx.textAlign = "left";
    }
    if (this.storageFailed) {
      ctx.fillStyle = "rgba(255,80,60,0.9)";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "STORAGE UNAVAILABLE — EDITS WON'T BE SAVED",
        w / 2,
        96,
      );
      ctx.textAlign = "left";
    }

    const slot = this.mapIndex.findIndex((e) => e.id === this.currentSlot);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `${this.world.meta.name} [${slot + 1}/${Math.max(1, this.mapIndex.length)}]`,
      w / 2,
      56,
    );
    ctx.textAlign = "left";
  }

  _renderHotbar(ctx, w, h) {
    const cell = 34;
    const gap = 4;
    const total = PLACEABLE_BLOCKS.length;
    const sel = Math.max(0, PLACEABLE_BLOCKS.indexOf(this.tile));
    const { start, end } = hotbarWindow(sel, total, HOTBAR_VISIBLE);
    const shown = end - start;
    const barW = shown * (cell + gap) - gap;
    const x0 = (w - barW) / 2;
    const y0 = h - 58;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(x0 - 10, y0 - 30, barW + 20, cell + 46, 8);
    ctx.fill();

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(BLOCKS[this.tile]?.name || "", w / 2, y0 - 12);

    for (let i = start; i < end; i++) {
      const id = PLACEABLE_BLOCKS[i];
      const x = x0 + (i - start) * (cell + gap);
      ctx.fillStyle = BLOCKS[id].color;
      ctx.fillRect(x, y0, cell, cell);
      if (id === this.tile) {
        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y0 - 2, cell + 4, cell + 4);
      }
      ctx.fillStyle = id === this.tile ? "#ffffff" : "rgba(255,255,255,0.4)";
      ctx.font = "bold 10px monospace";
      ctx.fillText(id <= 9 ? String(id) : "0", x + cell / 2, y0 + cell + 12);
    }
    // Scroll arrows so it is clear the palette runs past the window.
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "bold 12px monospace";
    if (start > 0) ctx.fillText("‹", x0 - 14, y0 + cell / 2 + 4);
    if (end < total) ctx.fillText("›", x0 + barW + 14, y0 + cell / 2 + 4);
    ctx.textAlign = "left";
  }

  _renderToolLabel(ctx, w, h) {
    const labels = {
      block: "BLOCK",
      spawn: "SPAWN",
      pickup: "PICKUP",
      exit: "EXIT",
      start: "START",
    };
    const colors = {
      block: "#00ffcc",
      spawn: "#ff6644",
      pickup: "#ffcc00",
      exit: "#00ccff",
      start: "#ffffff",
    };
    const y = h - 58;
    ctx.fillStyle = colors[this.toolMode] || "#00ffcc";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`TOOL: ${labels[this.toolMode] || "BLOCK"}`, w / 2, y - 28);

    ctx.font = "bold 11px monospace";
    if (this.toolMode === "spawn") {
      const key = ENEMY_KEYS[this.selectedEnemy] || "drone";
      ctx.fillStyle = ENEMY_TYPES[key]?.color1 || "#ff6644";
      ctx.fillText(
        `[G] ${ENEMY_SHORT_NAMES[key] || key} (${this.selectedEnemy + 1}/${ENEMY_KEYS.length})`,
        w / 2,
        y - 44,
      );
    } else if (this.toolMode === "pickup") {
      const key = PICKUP_TYPES[this.selectedPickup];
      ctx.fillStyle = PICKUP_COLORS[key] || "#ffcc00";
      ctx.fillText(
        `[G] ${PICKUP_LABELS[key] || key} (${this.selectedPickup + 1}/${PICKUP_TYPES.length})`,
        w / 2,
        y - 44,
      );
    } else if (this.toolMode === "exit") {
      const has = !!this.world.meta.exit;
      ctx.fillStyle = has ? "#00ccff" : "rgba(0,204,255,0.5)";
      ctx.fillText(
        has ? "EXIT PLACED — R-click to remove" : "L-click to place exit",
        w / 2,
        y - 44,
      );
    } else if (this.toolMode === "start") {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("L-click to move the play-test start", w / 2, y - 44);
    }
    ctx.textAlign = "left";
  }

  _renderHelp(ctx) {
    const hints = [
      "WASD — Move",
      "Mouse — Look",
      "LClick — Place",
      "RClick — Remove",
      "1-9 — Block Type",
      "0 — Natural Blocks",
      "Wheel — Block",
      "Q/E — Lower/Raise build cursor (overhead)",
      "T — Tool (Block/Spawn/Pickup/Exit/Start)",
      "G — Cycle Sub-type",
      "[ / ] — FOV -/+",
      ", / . — Prev/Next World",
      "Space — Jump (Rise in Noclip)",
      "Ctrl — Lower (Noclip)",
      "R — Reset Pitch",
      "N — Noclip",
      "V — Terrain/Flat new world",
      "F — Rename World",
      "Tab — Overhead",
      "Ctrl+S — Save",
      "Ctrl+Shift+S — Share URL",
      "Ctrl+N — New World",
      "Ctrl+D — Delete World",
      "Ctrl+Z — Undo",
      "Ctrl+Shift+Z — Redo",
      "Ctrl+E — Export .ccw",
      "Ctrl+I — Import .ccw/.json",
      "P — Play-test",
      "H — Toggle Help",
      "ESC — Pause",
    ];
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 300, hints.length * 16 + 12, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "11px monospace";
    for (let i = 0; i < hints.length; i++) ctx.fillText(hints[i], 16, 24 + i * 16);
  }

  _renderStatus(ctx, w, h) {
    const m = this.world.meta;
    ctx.textAlign = "right";
    if (this.noclip) {
      ctx.fillStyle = "rgba(255,200,0,0.8)";
      ctx.font = "bold 12px monospace";
      ctx.fillText("NOCLIP", w - 14, 24);
    }
    ctx.fillStyle = "rgba(0,255,200,0.6)";
    ctx.font = "bold 12px monospace";
    ctx.fillText(`CURSOR Z ${this.cursorZ}`, w - 14, h - 90);
    ctx.fillText(`FOV ${this.settings.fov}`, w - 14, h - 106);

    const undoCount = this.historyIndex + 1;
    const redoCount = this.history.length - this.historyIndex - 1;
    if (undoCount > 0 || redoCount > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px monospace";
      ctx.fillText(`U:${undoCount} R:${redoCount}`, w - 14, h - 122);
    }

    let y = h - 138;
    ctx.font = "bold 11px monospace";
    if (m.enemySpawns?.length) {
      ctx.fillStyle = "rgba(255,100,68,0.7)";
      ctx.fillText(`SPAWNS: ${m.enemySpawns.length}`, w - 14, y);
      y -= 16;
    }
    if (m.pickups?.length) {
      ctx.fillStyle = "rgba(255,204,0,0.7)";
      ctx.fillText(`PICKUPS: ${m.pickups.length}`, w - 14, y);
      y -= 16;
    }
    if (m.exit) {
      ctx.fillStyle = "rgba(0,204,255,0.7)";
      ctx.fillText(
        `EXIT: ${Math.floor(m.exit.x)},${Math.floor(m.exit.y)},${Math.floor(m.exit.z)}`,
        w - 14,
        y,
      );
    }

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "11px monospace";
    ctx.fillText(
      `${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}, ${Math.floor(this.player.z)}`,
      w - 14,
      h - 74,
    );
    ctx.textAlign = "left";
  }

  /** Top-down slice of the world at `cursorZ`, fitted to the screen. */
  _renderOverhead(ctx, w, h) {
    const world = this.world;
    const pad = 60;
    const cs = Math.min((w - pad * 2) / World.W, (h - pad * 2) / World.D);
    const ox = (w - World.W * cs) / 2;
    const oy = (h - World.D * cs) / 2;
    const z = this.cursorZ;

    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0b0b16";
    ctx.fillRect(ox, oy, World.W * cs, World.D * cs);

    for (let y = 0; y < World.D; y++) {
      for (let x = 0; x < World.W; x++) {
        const id = world.get(x, y, z);
        if (id === AIR) continue;
        ctx.fillStyle = BLOCKS[id].color;
        ctx.fillRect(ox + x * cs, oy + y * cs, cs + 0.5, cs + 0.5);
      }
    }

    const marker = (mx, my, color, square) => {
      const px = ox + mx * cs;
      const py = oy + my * cs;
      ctx.fillStyle = color;
      if (square) {
        const s = Math.max(3, cs * 0.8);
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, cs * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    for (const s of world.meta.enemySpawns || []) marker(s.x, s.y, "#ff4433", false);
    for (const p of world.meta.pickups || [])
      marker(p.x, p.y, PICKUP_COLORS[p.type] || "#44ff44", true);
    if (world.meta.exit) marker(world.meta.exit.x, world.meta.exit.y, "#00ccff", true);
    if (world.meta.spawn) marker(world.meta.spawn.x, world.meta.spawn.y, "#ffffff", true);

    // Player arrow
    const px = ox + this.player.x * cs;
    const py = oy + this.player.y * cs;
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(
      px + Math.cos(this.player.angle) * 14,
      py + Math.sin(this.player.angle) * 14,
    );
    ctx.stroke();

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("OVERHEAD VIEW — TAB to return", w / 2, 28);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px monospace";
    ctx.fillText(
      `Block: ${BLOCKS[this.tile]?.name}  |  Cursor Z: ${z} (Q/E)  |  ${World.W}×${World.D}×${World.H}`,
      w / 2,
      h - 34,
    );

    // Marker legend
    const legend = [
      ["#ff4433", "Spawn"],
      ["#44ff44", "Pickup"],
      ["#00ccff", "Exit"],
      ["#ffffff", "Start"],
    ];
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    let lx = w / 2 - 150;
    for (const [color, label] of legend) {
      ctx.fillStyle = color;
      ctx.fillRect(lx, h - 22, 9, 9);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(label, lx + 14, h - 14);
      lx += 80;
    }
  }
}
