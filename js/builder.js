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
    this.active = false;

    // Input accumulators (fed from host)
    this.keys = {};
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.mouseLocked = false;
  }

  // ─── Lifecycle ───────────────────────────────────────────

  start() {
    const saved = this._loadMap();
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

    this.tile = 1;
    this.target = null;
    this.overhead = false;
    this.showHelp = true;
    this.saveFlash = 0;
    this.noclip = false;
    this.pitch = 0;
    this.layer = 0;
    this.height = 0;
    this.active = true;

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
    // Layer
    if (code === "KeyQ") {
      this.layer = Math.max(0, this.layer - 1);
      this.audio.menuSelect();
      return true;
    }
    if (code === "KeyE") {
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

    // Vertical movement
    const riseSpeed = RISE_SPEED * dt;
    if (this.keys["Space"]) this.height = Math.min(5, this.height + riseSpeed);
    if (this.keys["ControlLeft"] || this.keys["ControlRight"])
      this.height = Math.max(-2, this.height - riseSpeed);

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

  placeBlock() {
    if (this.overhead) return;
    const layer = this.map.layers ? this.map.layers[this.layer] : null;
    const target = this.target;

    if (target) {
      const { placeX, placeY } = target;
      if (
        this._inBounds(placeX, placeY) &&
        !(
          Math.floor(this.player.x) === placeX &&
          Math.floor(this.player.y) === placeY
        )
      ) {
        if (layer) {
          if (layer[placeY][placeX] === 0) {
            layer[placeY][placeX] = this.tile;
            this.syncGrid();
            this.audio.menuConfirm();
          }
        } else if (this.map.grid[placeY][placeX] === 0) {
          this.map.grid[placeY][placeX] = this.tile;
          this.audio.menuConfirm();
        }
      }
    } else {
      const d = 3;
      const tx = Math.floor(this.player.x + Math.cos(this.player.angle) * d);
      const ty = Math.floor(this.player.y + Math.sin(this.player.angle) * d);
      if (
        this._inBounds(tx, ty) &&
        !(Math.floor(this.player.x) === tx && Math.floor(this.player.y) === ty)
      ) {
        if (layer) {
          if (layer[ty][tx] === 0) {
            layer[ty][tx] = this.tile;
            this.syncGrid();
            this.audio.menuConfirm();
          }
        } else if (this.map.grid[ty][tx] === 0) {
          this.map.grid[ty][tx] = this.tile;
          this.audio.menuConfirm();
        }
      }
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
        layer[hitY][hitX] = 0;
        this.syncGrid();
        this.audio.menuSelect();
      }
    } else if (this.map.grid[hitY][hitX] > 0) {
      this.map.grid[hitY][hitX] = 0;
      this.audio.menuSelect();
    }
  }

  // ─── Map data ────────────────────────────────────────────

  /**
   * Recompute composite grid and heightMap from layers.
   * Optionally pass (x, y) for incremental single-cell update.
   */
  syncGrid(cellX, cellY) {
    if (!this.map.layers) return;

    if (!this.map.heightMap) {
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
    try {
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
      };
      localStorage.setItem(BUILDER_SAVE_KEY, JSON.stringify(data));
      this.saveFlash = 2;
    } catch (_) {
      /* localStorage full */
    }
  }

  _loadMap() {
    try {
      const raw = localStorage.getItem(BUILDER_SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.grid)) return null;
      if (!Number.isInteger(data.width) || !Number.isInteger(data.height))
        return null;
      if (data.width <= 0 || data.height <= 0) return null;
      // Validate grid dimensions and contents
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
        name: data.name || "My Creation",
        width: data.width,
        height: data.height,
        grid: data.grid,
        layers: data.layers || null,
        playerStart: data.playerStart || {
          x: data.width / 2 + 0.5,
          y: data.height / 2 + 0.5,
          dir: 0,
        },
        enemySpawns: [],
        entities: [],
        exit: null,
      };
    } catch (_) {
      return null;
    }
  }

  // ─── Rendering ───────────────────────────────────────────

  render(ctx, w, h, time) {
    if (this.overhead) {
      this._renderOverhead(ctx, w, h);
      return;
    }
    // Apply pitch as y-shearing (vertical look offset)
    const pitchOffset = this.pitch * h * 0.5;
    const heightOffset = this.height * h * 0.15;
    ctx.save();
    ctx.translate(0, pitchOffset + heightOffset);
    this.renderer.renderScene(
      this.player,
      this.map,
      [],
      time,
      this.settings.fov,
      0,
    );
    ctx.restore();
    // Fill exposed areas above/below with floor/ceiling colors
    const totalOffset = pitchOffset + heightOffset;
    if (totalOffset > 0) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, w, totalOffset);
    } else if (totalOffset < 0) {
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, h + totalOffset, w, -totalOffset);
    }
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

    // Help panel
    if (this.showHelp) {
      const hints = [
        "WASD \u2014 Move",
        "Mouse \u2014 Look (+ vertical)",
        "LClick \u2014 Place",
        "RClick \u2014 Remove",
        "1-9 \u2014 Block Type",
        "Q/E \u2014 Layer Down/Up",
        "[ / ] \u2014 FOV -/+",
        "Space \u2014 Rise",
        "Ctrl \u2014 Lower",
        "R \u2014 Reset Pitch",
        "N \u2014 Noclip",
        "Tab \u2014 Overhead",
        "Ctrl+S \u2014 Save",
        "H \u2014 Toggle Help",
        "ESC \u2014 Pause",
      ];
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath();
      ctx.roundRect(8, 8, 195, hints.length * 17 + 12, 6);
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
      this.map.layers = [];
      for (let l = 0; l < NUM_LAYERS; l++) {
        const layer = [];
        for (let y = 0; y < this.map.height; y++) {
          const row = [];
          for (let x = 0; x < this.map.width; x++) {
            row.push(l === 0 ? this.map.grid[y][x] : 0);
          }
          layer.push(row);
        }
        this.map.layers.push(layer);
      }
    }
  }
}
