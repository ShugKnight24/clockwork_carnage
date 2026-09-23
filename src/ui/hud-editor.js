import { GameState } from "../types.js";

const DEFAULT_CUSTOM_HUD = {
  ammo: { x: 0.1, y: 0.8 },
  health: { x: 0.3, y: 0.8 },
  shield: { x: 0.7, y: 0.8 },
  weapons: { x: 0.9, y: 0.8 },
  portrait: { x: 0.5, y: 0.8 },
};

export class HudEditor {
  constructor(game) {
    this.game = game;
    this.layout = null;
    this.dragging = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  start() {
    this.game.state = GameState.HUD_EDITOR;
    
    // Load layout or initialize
    try {
      const stored = localStorage.getItem("cc_custom_hud");
      if (stored) {
        this.layout = JSON.parse(stored);
      } else {
        this.layout = structuredClone(DEFAULT_CUSTOM_HUD);
      }
    } catch (e) {
      this.layout = structuredClone(DEFAULT_CUSTOM_HUD);
    }
    
    this.game.settings.customHudLayout = this.layout;
  }
  
  save() {
    localStorage.setItem("cc_custom_hud", JSON.stringify(this.layout));
    this.game.settings.customHudLayout = this.layout;
  }
  
  stop() {
    this.save();
    this.game.state = GameState.SETTINGS;
    this.dragging = null;
  }
  
  update(dt, mx, my, mousedown) {
    const w = this.game.canvas.width;
    const h = this.game.canvas.height;
    
    if (!mousedown && this.dragging) {
      this.dragging = null;
      this.save();
    }
    
    if (this.dragging) {
      const nx = (mx - this.dragOffsetX) / w;
      const ny = (my - this.dragOffsetY) / h;
      this.layout[this.dragging].x = Math.max(0, Math.min(1, nx));
      this.layout[this.dragging].y = Math.max(0, Math.min(1, ny));
    } else if (mousedown) {
      const hitRadius = 50;
      for (const [key, pos] of Object.entries(this.layout)) {
        const px = pos.x * w;
        const py = pos.y * h;
        const dx = mx - px;
        const dy = my - py;
        if (Math.sqrt(dx*dx + dy*dy) < hitRadius) {
          this.dragging = key;
          this.dragOffsetX = dx;
          this.dragOffsetY = dy;
          break;
        }
      }
    }
  }
  
  render(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HUD EDITOR", w/2, 40);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("Drag elements to position. Press ESC to save and return.", w/2, 64);
    
    for (const [key, pos] of Object.entries(this.layout)) {
      const px = pos.x * w;
      const py = pos.y * h;
      
      const isDragging = this.dragging === key;
      ctx.strokeStyle = isDragging ? "#00ffcc" : "rgba(255,255,255,0.4)";
      ctx.lineWidth = isDragging ? 3 : 1;
      
      ctx.beginPath();
      ctx.arc(px, py, 40, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = isDragging ? "#00ffcc" : "rgba(255,255,255,0.8)";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(key.toUpperCase(), px, py + 4);
    }
  }
}
