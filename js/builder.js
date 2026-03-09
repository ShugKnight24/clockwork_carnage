const TILE_NAMES = [
  "",
  "Stone",
  "Tech",
  "Metal",
  "Energy",
  "Door",
  "Secret",
  "Boss",
  "Glass",
  "Rift",
];
const TILE_COLORS = [
  "#0d0d1a",
  "#505064",
  "#285078",
  "#64646e",
  "#3c1478",
  "#78501e",
  "#4e4e62",
  "#1e0a3c",
  "#648ca0",
  "#143c50",
];

const BUILDER_SAVE_KEY = "cc_builder_map";
const BUILDER_INDEX_KEY = "cc_builder_maps_index";
const BUILDER_CURRENT_KEY = "cc_builder_current_slot";
const DEFAULT_MAP_SIZE = 32;
const NUM_LAYERS = 5;
const MAX_RAYCAST_DIST = 10;
const MOVE_SPEED = 8.0;
const RISE_SPEED = 4.0;
const PITCH_LIMIT = 1.05;
const COLLISION_MARGIN = 0.3;

/**
 * Self-contained builder/forge mode.
 * Owns its own state, input routing, update loop, and rendering.
 * Communicates with the host game through a minimal interface.
 */
export class BuilderMode {
  /**
   * @param {object} deps - Injected dependencies from the host game
   * @param {object} deps.renderer  - Renderer instance (for renderScene + ctx/width/height)
   * @param {object} deps.audio     - AudioManager instance
   * @param {object} deps.settings  - Settings object (fov, sensitivity, invertX, invertY)
   * @param {object} deps.keybinds  - Keybind map (moveForward, moveBack, moveLeft, moveRight)
   * @param {HTMLCanvasElement} deps.canvas - The game canvas (for pointer lock)
   */
  constructor(deps) {
    this.renderer = deps.renderer;
    this.audio = deps.audio;
    this.settings = deps.settings;
    this.keybinds = deps.keybinds;
    this.canvas = deps.canvas;

    // Builder-owned state
    this.map = null;
    this.player = { x: 0, y: 0, angle: 0 };
    this.tile = 1;
    this.target = null;
    this.overhead = false;
    this.showHelp = true;
    this.saveFlash = 0;
    this.noclip = false;
    this.pitch = 0;
    this.layer = 0;
    this.height = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.active = false;

    // Undo / redo history
    this.history = [];
    this.historyIndex = -1;

    // Tool mode: 'block' (default) or 'spawn'
    this.toolMode = "block";

    // Multi-map management
    this.currentSlot = 0;
    this.mapIndex = []; // [{id, name}]

    // Input accumulators (fed from host)
    this.keys = {};
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.mouseLocked = false;
  }

  // ─── Lifecycle ───────────────────────────────────────────

  start() {
    this._loadIndex();
    // Migrate legacy single-slot save to multi-map
    if (this.mapIndex.length === 0) {
      const legacy = this._loadMapFromKey(BUILDER_SAVE_KEY);
      if (legacy) {
        this.mapIndex.push({ id: 0, name: legacy.name || "My Creation" });
        this.currentSlot = 0;
        this.map = legacy;
        this._saveIndex();
        this._saveCurrentMap();
        try {
          localStorage.removeItem(BUILDER_SAVE_KEY);
        } catch (_) {
          /* ok */
        }
      } else {
        this.map = this._createDefaultMap(DEFAULT_MAP_SIZE);
        this.mapIndex.push({ id: 0, name: this.map.name });
        this.currentSlot = 0;
        this._saveIndex();
        this._saveCurrentMap();
      }
    } else {
      const savedSlot = this._loadCurrentSlot();
      this.currentSlot = savedSlot;
      const saved = this._loadMapFromKey(this._slotKey(this.currentSlot));
      if (saved) {
        this.map = saved;
      } else {
        this.map = this._createDefaultMap(DEFAULT_MAP_SIZE);
      }
    }

    this._ensureLayers();
    this.syncGrid();

    this.player.x = this.map.playerStart.x;
    this.player.y = this.map.playerStart.y;
    this.player.angle = this.map.playerStart.dir;

    this.tile = 1;
    this.target = null;
    this.overhead = false;
    this.showHelp = true;
    this.saveFlash = 0;
    this.noclip = false;
    this.pitch = 0;
    this.layer = 0;
    this.height = 0;
    this.verticalVelocity = 0;
    this.grounded = true;
    this.active = true;
    this.toolMode = "block";
    this.history = [];
    this.historyIndex = -1;

    this.canvas.requestPointerLock();
  }

  stop() {
    this.active = false;
    this.map = null;
  }

  // ─── Input routing ───────────────────────────────────────

  /**
   * Called by the host's keydown handler when builder is active.
   * Returns true if the key was consumed.
   */
  handleKeyDown(e) {
    const code = e.code;

    // Ctrl+S / Cmd+S → save
    if (code === "KeyS" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.saveMap();
      return true;
    }
    // Ctrl+Z / Cmd+Z → undo
    if (code === "KeyZ" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      this.undo();
      return true;
    }
    // Ctrl+Shift+Z / Cmd+Shift+Z → redo
    if (code === "KeyZ" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      this.redo();
      return true;
    }
    // Ctrl+E / Cmd+E → export map
    if (code === "KeyE" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.exportMap();
      return true;
    }
    // Ctrl+I / Cmd+I → import map
    if (code === "KeyI" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.importMap();
      return true;
    }
    // Ctrl+N / Cmd+N → new map
    if (code === "KeyN" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.newMap();
      return true;
    }
    // Ctrl+D / Cmd+D → delete current map (if more than one)
    if (code === "KeyD" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.deleteCurrentMap();
      return true;
    }
    // , → previous map
    if (code === "Comma" && !e.ctrlKey && !e.metaKey) {
      this.switchMap(-1);
      return true;
    }
    // . → next map
    if (code === "Period" && !e.ctrlKey && !e.metaKey) {
      this.switchMap(1);
      return true;
    }
    // T → toggle tool mode (block / spawn)
    if (code === "KeyT") {
      this.toolMode = this.toolMode === "block" ? "spawn" : "block";
      this.audio.menuSelect();
      return true;
    }
    // Tab → toggle overhead
    if (code === "Tab") {
      e.preventDefault();
      this.overhead = !this.overhead;
      if (this.overhead) document.exitPointerLock();
      else this.canvas.requestPointerLock();
      return true;
    }
    // Tile selection 1-9
    if (code >= "Digit1" && code <= "Digit9") {
      this.tile = parseInt(code.charAt(5));
      this.audio.menuSelect();
      return true;
    }
    // Layer — only when not using Ctrl modifier
    if (code === "KeyQ" && !e.ctrlKey && !e.metaKey) {
      this.layer = Math.max(0, this.layer - 1);
      this.audio.menuSelect();
      return true;
    }
    if (code === "KeyE" && !e.ctrlKey && !e.metaKey) {
      this.layer = Math.min(NUM_LAYERS - 1, this.layer + 1);
      this.audio.menuSelect();
      return true;
    }
    // Pitch reset
    if (code === "KeyR") {
      this.pitch = 0;
      return true;
    }
    // Toggles
    if (code === "KeyN") {
      this.noclip = !this.noclip;
      return true;
    }
    if (code === "KeyH") {
      this.showHelp = !this.showHelp;
      return true;
    }
    // Play-test
    if (code === "KeyP") {
      if (this.onPlayTest) this.onPlayTest();
      return true;
    }
    // FOV
    if (code === "BracketLeft") {
      this.settings.fov = Math.max(50, this.settings.fov - 5);
      this.audio.menuSelect();
      return true;
    }
    if (code === "BracketRight") {
      this.settings.fov = Math.min(120, this.settings.fov + 5);
      this.audio.menuSelect();
      return true;
    }
    return false; // Not consumed — host should handle (e.g. Escape)
  }

  handleMouseDown(button) {
    if (this.overhead) return;
    if (this.toolMode === "spawn") {
      if (button === 0) this.placeSpawn();
      if (button === 2) this.removeSpawn();
      return;
    }
    if (button === 0) this.placeBlock();
    if (button === 2) this.removeBlock();
  }

  /**
   * Feed accumulated mouse movement each frame.
   */
  feedMouse(dx, dy, locked) {
    this.mouseDx = dx;
    this.mouseDy = dy;
    this.mouseLocked = locked;
  }

  /**
   * Feed current key state each frame.
   */
  feedKeys(keys) {
    this.keys = keys;
  }

  // ─── Update ──────────────────────────────────────────────

  update(dt) {
    if (!this.active) return;
    if (this.overhead) return;

    // Mouse look (yaw + pitch)
    if (this.mouseLocked) {
      const sens = (this.settings.sensitivity || 1.0) * 0.002;
      const invX = this.settings.invertX ? -1 : 1;
      this.player.angle += this.mouseDx * sens * invX;
      const invY = this.settings.invertY ? -1 : 1;
      this.pitch -= this.mouseDy * sens * invY;
      this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
    }

    // Movement
    const speed = MOVE_SPEED * dt;
    const dx = Math.cos(this.player.angle);
    const dy = Math.sin(this.player.angle);
    let mx = 0,
      my = 0;
    if (this.keys[this.keybinds.moveForward]) {
      mx += dx;
      my += dy;
    }
    if (this.keys[this.keybinds.moveBack]) {
      mx -= dx;
      my -= dy;
    }
    if (this.keys[this.keybinds.moveLeft]) {
      mx += dy;
      my -= dx;
    }
    if (this.keys[this.keybinds.moveRight]) {
      mx -= dy;
      my += dx;
    }

    // Vertical movement — jump physics when not noclip, free-fly when noclip
    if (this.noclip) {
      const riseSpeed = RISE_SPEED * dt;
      if (this.keys["Space"])
        this.height = Math.min(5, this.height + riseSpeed);
      if (this.keys["ControlLeft"] || this.keys["ControlRight"])
        this.height = Math.max(-2, this.height - riseSpeed);
    } else {
      // Ground level based on heightMap at player's cell
      const gx = Math.floor(this.player.x);
      const gy = Math.floor(this.player.y);
      let groundLevel = 0;
      if (
        this.map.heightMap &&
        gx >= 0 &&
        gy >= 0 &&
        gx < this.map.width &&
        gy < this.map.height
      ) {
        groundLevel = this.map.heightMap[gy][gx] * 0.7;
      }
      // Jump
      if (this.keys["Space"] && this.grounded) {
        this.verticalVelocity = 5.5;
        this.grounded = false;
      }
      // Gravity
      this.verticalVelocity -= 12.0 * dt;
      this.height += this.verticalVelocity * dt;
      // Land on surface
      if (this.height <= groundLevel) {
        this.height = groundLevel;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }

    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      mx = (mx / len) * speed;
      my = (my / len) * speed;
    }

    if (this.noclip) {
      this.player.x += mx;
      this.player.y += my;
    } else {
      const nx = this.player.x + mx;
      const ny = this.player.y + my;
      if (
        this._isPassable(
          Math.floor(nx + (mx > 0 ? COLLISION_MARGIN : -COLLISION_MARGIN)),
          Math.floor(this.player.y),
        )
      )
        this.player.x = nx;
      if (
        this._isPassable(
          Math.floor(this.player.x),
          Math.floor(ny + (my > 0 ? COLLISION_MARGIN : -COLLISION_MARGIN)),
        )
      )
        this.player.y = ny;
    }

    // Raycast target
    this.target = this._raycast();
    if (this.saveFlash > 0) this.saveFlash -= dt;
  }

  // ─── Block operations ────────────────────────────────────

  _recordAction(action) {
    // Truncate any redo-able future
    this.history.length = this.historyIndex + 1;
    this.history.push(action);
    this.historyIndex++;
    // Cap history at 200
    if (this.history.length > 200) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex < 0) return;
    const action = this.history[this.historyIndex--];
    if (action.type === "place" || action.type === "remove") {
      if (!this._inBounds(action.x, action.y)) return;
      const li = action.layer;
      const layer =
        this.map.layers && li >= 0 && li < NUM_LAYERS
          ? this.map.layers[li]
          : null;
      if (layer) {
        layer[action.y][action.x] = action.oldTile;
      } else {
        this.map.grid[action.y][action.x] = action.oldTile;
      }
      this.syncGrid(action.x, action.y);
    } else if (action.type === "addSpawn") {
      this.map.enemySpawns = this.map.enemySpawns.filter(
        (s) => !(s.x === action.x && s.y === action.y),
      );
    } else if (action.type === "removeSpawn") {
      this.map.enemySpawns.push({
        x: action.x,
        y: action.y,
        enemy: action.enemy,
      });
    }
    this.audio.menuSelect();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    const action = this.history[++this.historyIndex];
    if (action.type === "place" || action.type === "remove") {
      if (!this._inBounds(action.x, action.y)) return;
      const li = action.layer;
      const layer =
        this.map.layers && li >= 0 && li < NUM_LAYERS
          ? this.map.layers[li]
          : null;
      if (layer) {
        layer[action.y][action.x] = action.newTile;
      } else {
        this.map.grid[action.y][action.x] = action.newTile;
      }
      this.syncGrid(action.x, action.y);
    } else if (action.type === "addSpawn") {
      this.map.enemySpawns.push({
        x: action.x,
        y: action.y,
        enemy: action.enemy,
      });
    } else if (action.type === "removeSpawn") {
      this.map.enemySpawns = this.map.enemySpawns.filter(
        (s) => !(s.x === action.x && s.y === action.y),
      );
    }
    this.audio.menuSelect();
  }

  placeBlock() {
    if (this.overhead) return;
    const layer = this.map.layers ? this.map.layers[this.layer] : null;
    const target = this.target;

    const tryPlace = (px, py) => {
      if (
        !this._inBounds(px, py) ||
        (Math.floor(this.player.x) === px && Math.floor(this.player.y) === py)
      )
        return;
      if (layer) {
        if (layer[py][px] === 0) {
          this._recordAction({
            type: "place",
            layer: this.layer,
            x: px,
            y: py,
            oldTile: 0,
            newTile: this.tile,
          });
          layer[py][px] = this.tile;
          this.syncGrid(px, py);
          this.audio.menuConfirm();
        }
      } else if (this.map.grid[py][px] === 0) {
        this._recordAction({
          type: "place",
          layer: this.layer,
          x: px,
          y: py,
          oldTile: 0,
          newTile: this.tile,
        });
        this.map.grid[py][px] = this.tile;
        this.audio.menuConfirm();
      }
    };

    if (target) {
      tryPlace(target.placeX, target.placeY);
    } else {
      const d = 3;
      const tx = Math.floor(this.player.x + Math.cos(this.player.angle) * d);
      const ty = Math.floor(this.player.y + Math.sin(this.player.angle) * d);
      tryPlace(tx, ty);
    }
  }

  removeBlock() {
    if (this.overhead) return;
    const target = this.target;
    if (!target) return;
    const { hitX, hitY } = target;
    // Protect border walls
    if (
      hitX <= 0 ||
      hitY <= 0 ||
      hitX >= this.map.width - 1 ||
      hitY >= this.map.height - 1
    )
      return;

    const layer = this.map.layers ? this.map.layers[this.layer] : null;
    if (layer) {
      if (layer[hitY][hitX] > 0) {
        this._recordAction({
          type: "remove",
          layer: this.layer,
          x: hitX,
          y: hitY,
          oldTile: layer[hitY][hitX],
          newTile: 0,
        });
        layer[hitY][hitX] = 0;
        this.syncGrid(hitX, hitY);
        this.audio.menuSelect();
      }
    } else if (this.map.grid[hitY][hitX] > 0) {
      this._recordAction({
        type: "remove",
        layer: this.layer,
        x: hitX,
        y: hitY,
        oldTile: this.map.grid[hitY][hitX],
        newTile: 0,
      });
      this.map.grid[hitY][hitX] = 0;
      this.audio.menuSelect();
    }
  }

  // ─── Enemy spawn placement ──────────────────────────────

  placeSpawn() {
    if (this.overhead) return;
    const target = this.target;
    let sx, sy;
    if (target) {
      sx = target.placeX;
      sy = target.placeY;
    } else {
      const d = 3;
      sx = Math.floor(this.player.x + Math.cos(this.player.angle) * d);
      sy = Math.floor(this.player.y + Math.sin(this.player.angle) * d);
    }
    if (!this._inBounds(sx, sy)) return;
    if (this.map.grid[sy][sx] !== 0) return;
    // Don't stack spawns on the same cell
    if (!this.map.enemySpawns) this.map.enemySpawns = [];
    if (this.map.enemySpawns.some((s) => s.x === sx && s.y === sy)) return;
    const types = ["drone", "phantom", "beast"];
    const enemy = types[this.map.enemySpawns.length % types.length];
    this._recordAction({
      type: "addSpawn",
      x: sx,
      y: sy,
      enemy,
    });
    this.map.enemySpawns.push({ x: sx, y: sy, enemy });
    this.audio.menuConfirm();
  }

  removeSpawn() {
    if (this.overhead) return;
    const target = this.target;
    if (!target) return;
    if (!this.map.enemySpawns || this.map.enemySpawns.length === 0) return;
    const { hitX, hitY } = target;
    const idx = this.map.enemySpawns.findIndex(
      (s) => s.x === hitX && s.y === hitY,
    );
    if (idx < 0) {
      // Also check placeX/placeY for spawns on empty tiles
      const idx2 = this.map.enemySpawns.findIndex(
        (s) => s.x === target.placeX && s.y === target.placeY,
      );
      if (idx2 >= 0) {
        const removed = this.map.enemySpawns.splice(idx2, 1)[0];
        this._recordAction({
          type: "removeSpawn",
          x: removed.x,
          y: removed.y,
          enemy: removed.enemy,
        });
        this.audio.menuSelect();
      }
      return;
    }
    const removed = this.map.enemySpawns.splice(idx, 1)[0];
    this._recordAction({
      type: "removeSpawn",
      x: removed.x,
      y: removed.y,
      enemy: removed.enemy,
    });
    this.audio.menuSelect();
  }

  // ─── Export / Import ─────────────────────────────────────

  exportMap() {
    const data = {
      name: this.map.name,
      width: this.map.width,
      height: this.map.height,
      grid: this.map.grid,
      layers: this.map.layers || null,
      playerStart: {
        x: this.player.x,
        y: this.player.y,
        dir: this.player.angle,
      },
      enemySpawns: this.map.enemySpawns || [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(this.map.name || "map").replace(/[^a-z0-9_-]/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.saveFlash = 2;
  }

  importMap() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          // Validate same structure as _loadMap
          if (!Array.isArray(data.grid)) return;
          if (!Number.isInteger(data.width) || !Number.isInteger(data.height))
            return;
          if (data.width <= 0 || data.height <= 0) return;
          if (data.width > 128 || data.height > 128) return;
          if (data.grid.length !== data.height) return;
          for (let y = 0; y < data.height; y++) {
            const row = data.grid[y];
            if (!Array.isArray(row) || row.length !== data.width) return;
            for (let x = 0; x < data.width; x++) {
              if (typeof row[x] !== "number" || !Number.isFinite(row[x]))
                return;
              row[x] = Math.max(0, Math.min(9, Math.floor(row[x])));
            }
          }
          this.map = {
            name: data.name || "Imported",
            width: data.width,
            height: data.height,
            grid: data.grid,
            layers: data.layers || null,
            playerStart: data.playerStart || {
              x: data.width / 2 + 0.5,
              y: data.height / 2 + 0.5,
              dir: 0,
            },
            enemySpawns: Array.isArray(data.enemySpawns)
              ? data.enemySpawns.filter(
                  (s) =>
                    s &&
                    typeof s === "object" &&
                    Number.isFinite(s.x) &&
                    Number.isFinite(s.y) &&
                    (typeof s.enemy === "string" || s.enemy === undefined),
                )
              : [],
            entities: [],
            exit: null,
          };
          this._ensureLayers();
          this.syncGrid();
          this.player.x = this.map.playerStart.x;
          this.player.y = this.map.playerStart.y;
          this.player.angle = this.map.playerStart.dir;
          this.history = [];
          this.historyIndex = -1;
          // Save imported map as a new slot
          const id = this._nextId();
          this.mapIndex.push({ id, name: this.map.name });
          this.currentSlot = id;
          this._saveIndex();
          this._saveCurrentMap();
          this.saveFlash = 2;
          this.audio.menuConfirm();
        } catch (_) {
          /* invalid file */
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ─── Map data ────────────────────────────────────────────

  /**
   * Recompute composite grid and heightMap from layers.
   * Optionally pass (x, y) for incremental single-cell update.
   */
  syncGrid(cellX, cellY) {
    if (!this.map.layers) return;

    if (
      !this.map.heightMap ||
      this.map.heightMap.length !== this.map.height ||
      (this.map.heightMap[0] && this.map.heightMap[0].length !== this.map.width)
    ) {
      this.map.heightMap = [];
      for (let y = 0; y < this.map.height; y++) {
        this.map.heightMap.push(new Array(this.map.width).fill(0));
      }
    }

    // Incremental single-cell sync
    if (cellX !== undefined && cellY !== undefined) {
      this._syncCell(cellX, cellY);
      return;
    }

    // Full grid sync
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        this._syncCell(x, y);
      }
    }
  }

  _syncCell(x, y) {
    let tile = 0;
    let count = 0;
    for (let l = 0; l < NUM_LAYERS; l++) {
      if (this.map.layers[l][y][x] > 0) {
        if (tile === 0) tile = this.map.layers[l][y][x];
        count = l + 1;
      }
    }
    this.map.grid[y][x] = tile;
    this.map.heightMap[y][x] = count;
  }

  // ─── Save / Load ─────────────────────────────────────────

  saveMap() {
    this._saveCurrentMap();
    // Update name in index
    const entry = this.mapIndex.find((e) => e.id === this.currentSlot);
    if (entry) entry.name = this.map.name;
    this._saveIndex();
    this.saveFlash = 2;
  }

  _saveCurrentMap() {
    try {
      const data = {
        version: 2,
        name: this.map.name,
        width: this.map.width,
        height: this.map.height,
        grid: this.map.grid,
        layers: this.map.layers || null,
        playerStart: {
          x: this.player.x,
          y: this.player.y,
          dir: this.player.angle,
        },
        enemySpawns: this.map.enemySpawns || [],
      };
      localStorage.setItem(
        this._slotKey(this.currentSlot),
        JSON.stringify(data),
      );
      localStorage.setItem(BUILDER_CURRENT_KEY, String(this.currentSlot));
    } catch (_) {
      /* localStorage full */
    }
  }

  _loadMapFromKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.grid)) return null;
      if (!Number.isInteger(data.width) || !Number.isInteger(data.height))
        return null;
      if (data.width <= 0 || data.height <= 0) return null;
      if (data.grid.length !== data.height) return null;
      for (let y = 0; y < data.height; y++) {
        const row = data.grid[y];
        if (!Array.isArray(row) || row.length !== data.width) return null;
        for (let x = 0; x < data.width; x++) {
          const cell = row[x];
          if (typeof cell !== "number" || !Number.isFinite(cell)) return null;
        }
      }
      return {
        version: data.version || 0,
        name: data.name || "My Creation",
        width: data.width,
        height: data.height,
        grid: data.grid,
        layers: data.version >= 2 ? data.layers || null : null,
        playerStart: data.playerStart || {
          x: data.width / 2 + 0.5,
          y: data.height / 2 + 0.5,
          dir: 0,
        },
        enemySpawns: Array.isArray(data.enemySpawns)
          ? data.enemySpawns.filter(
              (s) =>
                s &&
                typeof s === "object" &&
                Number.isFinite(s.x) &&
                Number.isFinite(s.y) &&
                (typeof s.enemy === "string" || s.enemy === undefined),
            )
          : [],
        entities: [],
        exit: null,
      };
    } catch (_) {
      return null;
    }
  }

  _slotKey(id) {
    return `${BUILDER_SAVE_KEY}_${id}`;
  }

  _loadIndex() {
    try {
      const raw = localStorage.getItem(BUILDER_INDEX_KEY);
      this.mapIndex = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(this.mapIndex)) this.mapIndex = [];
    } catch (_) {
      this.mapIndex = [];
    }
  }

  _saveIndex() {
    try {
      localStorage.setItem(BUILDER_INDEX_KEY, JSON.stringify(this.mapIndex));
    } catch (_) {
      /* localStorage full */
    }
  }

  _loadCurrentSlot() {
    try {
      const raw = localStorage.getItem(BUILDER_CURRENT_KEY);
      if (raw !== null) {
        const id = parseInt(raw, 10);
        if (this.mapIndex.some((e) => e.id === id)) return id;
      }
    } catch (_) {
      /* ok */
    }
    return this.mapIndex.length > 0 ? this.mapIndex[0].id : 0;
  }

  _nextId() {
    let maxId = -1;
    for (const entry of this.mapIndex) {
      if (entry.id > maxId) maxId = entry.id;
    }
    return maxId + 1;
  }

  newMap() {
    // Save the current map first
    this._saveCurrentMap();
    const id = this._nextId();
    this.map = this._createDefaultMap(DEFAULT_MAP_SIZE);
    this.map.name = `Map ${id + 1}`;
    this.mapIndex.push({ id, name: this.map.name });
    this.currentSlot = id;
    this._ensureLayers();
    this.syncGrid();
    this.player.x = this.map.playerStart.x;
    this.player.y = this.map.playerStart.y;
    this.player.angle = this.map.playerStart.dir;
    this.history = [];
    this.historyIndex = -1;
    this.pitch = 0;
    this.height = 0;
    this.layer = 0;
    this._saveIndex();
    this._saveCurrentMap();
    this.saveFlash = 2;
    this.audio.menuConfirm();
  }

  switchMap(dir) {
    if (this.mapIndex.length < 2) return;
    this._saveCurrentMap();
    const curIdx = this.mapIndex.findIndex((e) => e.id === this.currentSlot);
    const nextIdx =
      (curIdx + dir + this.mapIndex.length) % this.mapIndex.length;
    this.currentSlot = this.mapIndex[nextIdx].id;
    const saved = this._loadMapFromKey(this._slotKey(this.currentSlot));
    if (saved) {
      this.map = saved;
    } else {
      this.map = this._createDefaultMap(DEFAULT_MAP_SIZE);
    }
    this._ensureLayers();
    this.syncGrid();
    this.player.x = this.map.playerStart.x;
    this.player.y = this.map.playerStart.y;
    this.player.angle = this.map.playerStart.dir;
    this.history = [];
    this.historyIndex = -1;
    this.pitch = 0;
    this.height = 0;
    this.layer = 0;
    this.saveFlash = 2;
    this.audio.menuSelect();
  }

  deleteCurrentMap() {
    if (this.mapIndex.length <= 1) return; // Can't delete last map
    try {
      localStorage.removeItem(this._slotKey(this.currentSlot));
    } catch (_) {
      /* ok */
    }
    this.mapIndex = this.mapIndex.filter((e) => e.id !== this.currentSlot);
    this._saveIndex();
    this.currentSlot = this.mapIndex[0].id;
    const saved = this._loadMapFromKey(this._slotKey(this.currentSlot));
    if (saved) {
      this.map = saved;
    } else {
      this.map = this._createDefaultMap(DEFAULT_MAP_SIZE);
    }
    this._ensureLayers();
    this.syncGrid();
    this.player.x = this.map.playerStart.x;
    this.player.y = this.map.playerStart.y;
    this.player.angle = this.map.playerStart.dir;
    this.layer = 0;
    this.history = [];
    this.historyIndex = -1;
    this.saveFlash = 2;
    this.audio.menuConfirm();
  }

  // ─── Rendering ───────────────────────────────────────────

  render(ctx, w, h, time) {
    if (this.overhead) {
      this._renderOverhead(ctx, w, h);
      return;
    }
    // Vertical shift from pitch and layer height — passed to renderer
    const pitchOffset = this.pitch * h * 0.5;
    const heightOffset = this.height * h * 0.15;
    const yShift = Math.max(
      -h * 0.4,
      Math.min(h * 0.4, pitchOffset + heightOffset),
    );
    this.renderer.renderScene(
      this.player,
      this.map,
      [],
      time,
      this.settings.fov,
      0,
      true,
      yShift,
    );
    this._renderHUD(ctx, w, h);
  }

  _renderHUD(ctx, w, h) {
    // Crosshair
    const cx = w / 2,
      cy = h / 2;
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

    // Target indicator text
    if (this.target) {
      const t = this.target;
      const tile = this.map.grid[t.hitY][t.hitX];
      const hm = this.map.heightMap ? this.map.heightMap[t.hitY][t.hitX] : 0;
      const layerTile = this.map.layers
        ? this.map.layers[this.layer][t.hitY][t.hitX]
        : tile;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `[${t.hitX},${t.hitY}] ${TILE_NAMES[tile] || "empty"}  H:${hm}/5  L${this.layer}:${TILE_NAMES[layerTile] || "\u2014"}`,
        cx,
        cy + 22,
      );
      ctx.textAlign = "left";
    }

    // Palette
    const palW = 36,
      palGap = 4;
    const totalW = 9 * (palW + palGap) - palGap;
    const palX = (w - totalW) / 2;
    const palY = h - 60;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(palX - 10, palY - 30, totalW + 20, palW + 46, 8);
    ctx.fill();

    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(TILE_NAMES[this.tile], w / 2, palY - 12);

    for (let i = 1; i <= 9; i++) {
      const x = palX + (i - 1) * (palW + palGap);
      const sel = i === this.tile;

      ctx.fillStyle = TILE_COLORS[i];
      ctx.fillRect(x, palY, palW, palW);

      if (sel) {
        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, palY - 2, palW + 4, palW + 4);
      }

      ctx.fillStyle = sel ? "#ffffff" : "rgba(255,255,255,0.4)";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(i), x + palW / 2, palY + palW + 12);
    }
    ctx.textAlign = "left";

    // Tool mode indicator
    const modeLabel = this.toolMode === "spawn" ? "SPAWN" : "BLOCK";
    const modeColor = this.toolMode === "spawn" ? "#ff6644" : "#00ffcc";
    ctx.fillStyle = modeColor;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`TOOL: ${modeLabel}`, w / 2, palY - 28);
    ctx.textAlign = "left";

    // Ghost preview (block placement preview)
    if (this.toolMode === "block" && !this.overhead) {
      this._renderGhostPreview(ctx, w, h);
    }

    // Help panel
    if (this.showHelp) {
      const hints = [
        "WASD \u2014 Move",
        "Mouse \u2014 Look (+ vertical)",
        "LClick \u2014 Place",
        "RClick \u2014 Remove",
        "1-9 \u2014 Block Type",
        "Q/E \u2014 Layer Down/Up",
        "T \u2014 Tool (Block/Spawn)",
        "[ / ] \u2014 FOV -/+",
        ", / . \u2014 Prev/Next Map",
        "Space \u2014 Jump (Fly in Noclip)",
        "Ctrl \u2014 Lower (Noclip)",
        "R \u2014 Reset Pitch",
        "N \u2014 Noclip",
        "Tab \u2014 Overhead",
        "Ctrl+S \u2014 Save",
        "Ctrl+N \u2014 New Map",
        "Ctrl+D \u2014 Delete Map",
        "Ctrl+Z \u2014 Undo",
        "Ctrl+Shift+Z \u2014 Redo",
        "Ctrl+E \u2014 Export JSON",
        "Ctrl+I \u2014 Import JSON",
        "P \u2014 Play-test",
        "H \u2014 Toggle Help",
        "ESC \u2014 Pause",
      ];
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath();
      ctx.roundRect(8, 8, 210, hints.length * 17 + 12, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px monospace";
      for (let i = 0; i < hints.length; i++) {
        ctx.fillText(hints[i], 16, 24 + i * 17);
      }
    }

    // Status indicators
    if (this.noclip) {
      ctx.fillStyle = "rgba(255,200,0,0.8)";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "right";
      ctx.fillText("NOCLIP", w - 14, 24);
      ctx.textAlign = "left";
    }
    // Layer indicator
    ctx.fillStyle = "rgba(0,255,200,0.6)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`LAYER ${this.layer}`, w - 14, h - 90);
    ctx.fillText(`FOV ${this.settings.fov}`, w - 14, h - 106);
    // Undo depth
    const undoCount = this.historyIndex + 1;
    const redoCount = this.history.length - this.historyIndex - 1;
    if (undoCount > 0 || redoCount > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px monospace";
      ctx.fillText(`U:${undoCount} R:${redoCount}`, w - 14, h - 122);
    }
    // Spawn count
    if (this.map.enemySpawns && this.map.enemySpawns.length > 0) {
      ctx.fillStyle = "rgba(255,100,68,0.7)";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`SPAWNS: ${this.map.enemySpawns.length}`, w - 14, h - 138);
    }
    ctx.textAlign = "left";

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      `${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`,
      w - 14,
      h - 75,
    );
    ctx.textAlign = "left";

    // Save flash
    if (this.saveFlash > 0) {
      ctx.fillStyle = `rgba(0,255,200,${Math.min(1, this.saveFlash) * 0.9})`;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("MAP SAVED", w / 2, 36);
      ctx.textAlign = "left";
    }

    // Map name & slot indicator (top center)
    const mapIdx = this.mapIndex.findIndex((e) => e.id === this.currentSlot);
    const mapLabel = `${this.map.name} [${mapIdx + 1}/${this.mapIndex.length}]`;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(mapLabel, w / 2, 56);
    ctx.textAlign = "left";

    // Minimap (top right)
    this._renderMinimap(ctx, w);
  }

  _renderMinimap(ctx, w) {
    const mapPx = 150;
    const mx = w - mapPx - 12,
      my = 36;
    const cs = mapPx / this.map.width;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(mx - 2, my - 2, mapPx + 4, mapPx + 4);

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        ctx.fillStyle = TILE_COLORS[this.map.grid[y][x]] || "#333";
        ctx.fillRect(mx + x * cs, my + y * cs, cs + 0.5, cs + 0.5);
        if (this.map.heightMap && this.map.grid[y][x] !== 0) {
          const hc = this.map.heightMap[y][x];
          if (hc > 0 && hc < 5) {
            ctx.fillStyle = `rgba(0,0,0,${0.45 - hc * 0.09})`;
            ctx.fillRect(mx + x * cs, my + y * cs, cs + 0.5, cs + 0.5);
          }
        }
      }
    }

    // Enemy spawn markers
    if (this.map.enemySpawns) {
      for (const s of this.map.enemySpawns) {
        ctx.fillStyle = "rgba(255,100,68,0.8)";
        ctx.beginPath();
        ctx.arc(
          mx + s.x * cs + cs / 2,
          my + s.y * cs + cs / 2,
          cs * 0.35,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // Player
    const px = mx + this.player.x * cs;
    const py = my + this.player.y * cs;
    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(
      px + Math.cos(this.player.angle) * 8,
      py + Math.sin(this.player.angle) * 8,
    );
    ctx.stroke();

    // Target highlight
    if (this.target) {
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        mx + this.target.hitX * cs,
        my + this.target.hitY * cs,
        cs,
        cs,
      );
    }
  }

  _renderOverhead(ctx, w, h) {
    const grid = this.map.grid;
    const mw = this.map.width,
      mh = this.map.height;
    const pad = 60;
    const cs = Math.min((w - pad * 2) / mw, (h - pad * 2) / mh);
    const ox = (w - mw * cs) / 2;
    const oy = (h - mh * cs) / 2;

    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, w, h);

    // Set font state once outside cell loop (was BUG-026)
    const cellFontSize = Math.max(8, cs * 0.45) | 0;
    ctx.font = `${cellFontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const base = TILE_COLORS[grid[y][x]] || "#333";
        ctx.fillStyle = base;
        ctx.fillRect(ox + x * cs, oy + y * cs, cs - 0.5, cs - 0.5);
        if (this.map.heightMap && grid[y][x] !== 0) {
          const hc = this.map.heightMap[y][x];
          if (hc > 0 && hc < 5) {
            ctx.fillStyle = `rgba(0,0,0,${0.5 - hc * 0.1})`;
            ctx.fillRect(ox + x * cs, oy + y * cs, cs - 0.5, cs - 0.5);
          }
          if (cs >= 10 && hc > 0) {
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillText(
              String(hc),
              ox + x * cs + cs / 2,
              oy + y * cs + cs / 2,
            );
          }
        }
      }
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= mw; x++) {
      ctx.beginPath();
      ctx.moveTo(ox + x * cs, oy);
      ctx.lineTo(ox + x * cs, oy + mh * cs);
      ctx.stroke();
    }
    for (let y = 0; y <= mh; y++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + y * cs);
      ctx.lineTo(ox + mw * cs, oy + y * cs);
      ctx.stroke();
    }

    // Enemy spawn markers in overhead
    if (this.map.enemySpawns) {
      for (const s of this.map.enemySpawns) {
        const sx = ox + s.x * cs + cs / 2;
        const sy = oy + s.y * cs + cs / 2;
        ctx.fillStyle = "rgba(255,100,68,0.85)";
        ctx.beginPath();
        ctx.arc(sx, sy, cs * 0.3, 0, Math.PI * 2);
        ctx.fill();
        if (cs >= 14) {
          ctx.fillStyle = "#fff";
          ctx.font = `${Math.max(7, cs * 0.3) | 0}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = typeof s.enemy === "string" && s.enemy.length ? s.enemy.charAt(0).toUpperCase() : "?";
          ctx.fillText(label, sx, sy);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
      }
    }

    // Player
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

    // Title
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("OVERHEAD VIEW \u2014 TAB to return", w / 2, 28);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px monospace";
    ctx.fillText(
      `Selected: ${TILE_NAMES[this.tile]}  |  Layer: ${this.layer}/4  |  Map: ${mw}\u00d7${mh}`,
      w / 2,
      h - 16,
    );
    ctx.textAlign = "left";
  }

  // ─── Private helpers ─────────────────────────────────────

  _renderGhostPreview(ctx, w, h) {
    // Show a translucent colored indicator at the crosshair for where a block would be placed
    const cx = w / 2;
    const cy = h / 2;
    const gSize = 18;
    let canPlace = false;
    if (this.target) {
      const { placeX, placeY } = this.target;
      if (
        this._inBounds(placeX, placeY) &&
        !(
          Math.floor(this.player.x) === placeX &&
          Math.floor(this.player.y) === placeY
        )
      ) {
        const layer = this.map.layers ? this.map.layers[this.layer] : null;
        canPlace = layer
          ? layer[placeY][placeX] === 0
          : this.map.grid[placeY][placeX] === 0;
      }
    } else {
      // No target = placing 3 units ahead
      const d = 3;
      const tx = Math.floor(this.player.x + Math.cos(this.player.angle) * d);
      const ty = Math.floor(this.player.y + Math.sin(this.player.angle) * d);
      if (
        this._inBounds(tx, ty) &&
        !(Math.floor(this.player.x) === tx && Math.floor(this.player.y) === ty)
      ) {
        const layer = this.map.layers ? this.map.layers[this.layer] : null;
        canPlace = layer ? layer[ty][tx] === 0 : this.map.grid[ty][tx] === 0;
      }
    }
    if (canPlace) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = TILE_COLORS[this.tile];
      ctx.fillRect(cx - gSize / 2, cy - gSize / 2, gSize, gSize);
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - gSize / 2, cy - gSize / 2, gSize, gSize);
      ctx.restore();
    }
  }

  _raycast() {
    const px = this.player.x;
    const py = this.player.y;
    const dirX = Math.cos(this.player.angle);
    const dirY = Math.sin(this.player.angle);
    let mapX = Math.floor(px);
    let mapY = Math.floor(py);
    const stepX = dirX >= 0 ? 1 : -1;
    const stepY = dirY >= 0 ? 1 : -1;
    const ddx = Math.abs(1 / (dirX || 1e-10));
    const ddy = Math.abs(1 / (dirY || 1e-10));
    let sdx = dirX >= 0 ? (mapX + 1 - px) * ddx : (px - mapX) * ddx;
    let sdy = dirY >= 0 ? (mapY + 1 - py) * ddy : (py - mapY) * ddy;
    let prevX = mapX,
      prevY = mapY;
    for (let i = 0; i < 80; i++) {
      if (sdx < sdy) {
        prevX = mapX;
        prevY = mapY;
        mapX += stepX;
        sdx += ddx;
      } else {
        prevX = mapX;
        prevY = mapY;
        mapY += stepY;
        sdy += ddy;
      }
      const dist = Math.sqrt((mapX + 0.5 - px) ** 2 + (mapY + 0.5 - py) ** 2);
      if (dist > MAX_RAYCAST_DIST) return null;
      if (
        mapX < 0 ||
        mapY < 0 ||
        mapX >= this.map.width ||
        mapY >= this.map.height
      )
        return null;
      if (this.map.grid[mapY][mapX] > 0) {
        return { hitX: mapX, hitY: mapY, placeX: prevX, placeY: prevY };
      }
    }
    return null;
  }

  _isPassable(mx, my) {
    if (mx < 0 || my < 0 || mx >= this.map.width || my >= this.map.height)
      return false;
    return this.map.grid[my][mx] === 0;
  }

  _inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.map.width && y < this.map.height;
  }

  _createDefaultMap(size) {
    const grid = [];
    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        row.push(
          y === 0 || y === size - 1 || x === 0 || x === size - 1 ? 1 : 0,
        );
      }
      grid.push(row);
    }
    return {
      name: "My Creation",
      width: size,
      height: size,
      grid,
      playerStart: { x: size / 2 + 0.5, y: size / 2 + 0.5, dir: 0 },
      enemySpawns: [],
      entities: [],
      exit: null,
      heightMap: grid.map((row) => new Array(row.length).fill(0)),
    };
  }

  _ensureLayers() {
    if (this.map.layers) {
      // Validate dimensions for all layers and rows
      let valid =
        Array.isArray(this.map.layers) && this.map.layers.length === NUM_LAYERS;
      if (valid) {
        for (let l = 0; l < NUM_LAYERS && valid; l++) {
          const layer = this.map.layers[l];
          if (!Array.isArray(layer) || layer.length !== this.map.height) {
            valid = false;
            break;
          }
          for (let y = 0; y < this.map.height; y++) {
            if (
              !Array.isArray(layer[y]) ||
              layer[y].length !== this.map.width
            ) {
              valid = false;
              break;
            }
          }
        }
      }
      if (!valid) {
        this.map.layers = null; // Force rebuild
      }
    }
    if (!this.map.layers) {
      // When rebuilding layers from a flat grid, copy walls to ALL layers
      // so they render at full height (5/5) instead of 20% stubs.
      this.map.layers = [];
      for (let l = 0; l < NUM_LAYERS; l++) {
        const layer = [];
        for (let y = 0; y < this.map.height; y++) {
          const row = [];
          for (let x = 0; x < this.map.width; x++) {
            row.push(this.map.grid[y][x]);
          }
          layer.push(row);
        }
        this.map.layers.push(layer);
      }
    }
  }
}
