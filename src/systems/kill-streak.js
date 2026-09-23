// Kill streak tracking, tier display, and rendering.
// Extracted from game.js — Strangler Fig Phase 3.4

const STREAK_TIERS = [
  null, // 1 kill — no announcement
  { text: "DOUBLE KILL", color: "#ffcc00", size: 32 },
  { text: "TRIPLE KILL", color: "#ff8800", size: 36 },
  { text: "OVERKILL", color: "#ff4400", size: 40 },
  { text: "RAMPAGE", color: "#ff0044", size: 44 },
  { text: "UNSTOPPABLE", color: "#ff00ff", size: 48 },
  { text: "GODLIKE", color: "#aa00ff", size: 52 },
];

const STREAK_TIMEOUT = 3; // seconds between kills before streak resets
const DISPLAY_DURATION = 2.0;

export class KillStreakSystem {
  constructor() {
    this.streak = 0;
    this.timer = 0;
    this.display = null; // { text, color, size, life }
    this.best = 0;
  }

  reset() {
    this.streak = 0;
    this.timer = 0;
    this.display = null;
    this.best = 0;
  }

  /** Register a kill. Returns side-effects for Game to apply. */
  onKill() {
    this.streak++;
    this.timer = 0;
    if (this.streak > this.best) this.best = this.streak;

    const tier = Math.min(this.streak, STREAK_TIERS.length) - 1;
    const effects = {
      tier,
      chronoBonus: this.streak >= 3 ? 30 : 20,
      screenShake: 0,
      glitchEffect: 0,
      playAudio: false,
      ariaCategory: null,
    };

    if (tier >= 1) {
      const t = STREAK_TIERS[tier];
      this.display = { text: t.text, color: t.color, size: t.size, life: DISPLAY_DURATION };
      effects.screenShake = 4 + tier * 2;
      effects.playAudio = true;
      if (tier >= 3) effects.glitchEffect = 0.15 + tier * 0.05;
      if (this.streak === 3) effects.ariaCategory = "killStreak3";
      else if (this.streak === 5) effects.ariaCategory = "killStreak5";
      else if (this.streak === 7) effects.ariaCategory = "killStreak7";
    }

    return effects;
  }

  /** Tick timers. Call every frame during gameplay. */
  update(dt) {
    if (this.streak > 0) {
      this.timer += dt;
      if (this.timer > STREAK_TIMEOUT) {
        this.streak = 0;
        this.timer = 0;
      }
    }
    if (this.display) {
      this.display.life -= dt;
      if (this.display.life <= 0) this.display = null;
    }
  }

  /** First-person HUD streak text (simple centered). */
  renderFirstPerson(ctx, w, h, barH) {
    if (!this.display) return;
    const ksd = this.display;
    const alpha = ksd.life > 1.5
      ? Math.min(1, (2.0 - ksd.life) * 4)
      : Math.min(1, ksd.life / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(ksd.size * 0.8)}px monospace`;
    ctx.fillStyle = ksd.color;
    ctx.fillText(ksd.text, w / 2, (h - barH) * 0.3);
    ctx.restore();
  }

  /** Third-person HUD streak text (plate + glow). */
  renderThirdPerson(ctx, w, h) {
    if (!this.display) return;
    const ksd = this.display;
    const alpha = ksd.life > 1.5
      ? Math.min(1, (2.0 - ksd.life) * 4)
      : Math.min(1, ksd.life / 0.5);
    const scale = ksd.life > 1.8 ? 1.2 + (2.0 - ksd.life) * 3 : 1.0;
    const fontSize = Math.round(ksd.size * scale);
    const ky = h * 0.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize}px monospace`;

    const textW = ctx.measureText(ksd.text).width;
    const plateW = textW + 60;
    const plateH = fontSize + 20;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(w / 2 - plateW / 2, ky - plateH / 2, plateW, plateH);
    ctx.fillStyle = ksd.color;
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillRect(w / 2 - plateW / 2, ky - plateH / 2, plateW, 2);
    ctx.fillRect(w / 2 - plateW / 2, ky + plateH / 2 - 2, plateW, 2);
    ctx.globalAlpha = alpha;

    ctx.shadowColor = ksd.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = ksd.color;
    ctx.fillText(ksd.text, w / 2, ky);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeText(ksd.text, w / 2, ky);
    ctx.restore();
  }
}
