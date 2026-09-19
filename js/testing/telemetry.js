/**
 * Clockwork Carnage — Telemetry Collector
 *
 * Hooks into game events and collects structured data for analysis.
 * Data stays local — written to localStorage and exportable as JSON.
 *
 * PROPRIETARY — not shipped with the game.
 */

const TELEMETRY_KEY = "cc_telemetry";
const SESSION_KEY = "cc_telemetry_session";

export class TelemetryCollector {
  constructor(game) {
    this.game = game;
    this.session = {
      id: crypto.randomUUID(),
      started: Date.now(),
      events: [],
      snapshots: [],
    };
    this._snapshotInterval = null;
    this._lastState = null;
  }

  /** Start collecting telemetry */
  start(snapshotIntervalMs = 1000) {
    this._hook();
    this._snapshotInterval = setInterval(
      () => this._snapshot(),
      snapshotIntervalMs,
    );
    this.event("session_start", { timestamp: Date.now() });
    return this.session.id;
  }

  /** Stop collecting and persist */
  stop() {
    if (this._snapshotInterval) {
      clearInterval(this._snapshotInterval);
      this._snapshotInterval = null;
    }
    this.event("session_end", {
      timestamp: Date.now(),
      duration: Date.now() - this.session.started,
      eventCount: this.session.events.length,
      snapshotCount: this.session.snapshots.length,
    });
    this._persist();
    return this.getSummary();
  }

  /** Record a named event with data */
  event(name, data = {}) {
    this.session.events.push({
      t: Date.now() - this.session.started,
      name,
      ...data,
    });
  }

  /** Hook into game state changes and key events */
  _hook() {
    const game = this.game;
    const self = this;

    // State changes: observe the StateManager, which every transition goes
    // through. Diffing game.state around update() missed any transition made
    // outside the update loop — menu handlers, startArena(), setState() — so
    // an entire arena session could report zero transitions. Chain onto any
    // existing listener rather than claiming the single onChange slot.
    const sm = game._stateManager;
    if (sm && typeof sm.onChange === "function") {
      const prevListener = sm._onChange;
      sm.onChange((to, from) => {
        if (prevListener) prevListener(to, from);
        self.event("state_change", { from, to });
      });
    }

    // Patch update to track deaths
    const origUpdate = game.update.bind(game);
    game.update = function (timestamp) {
      origUpdate(timestamp);
      // Track deaths
      if (
        self._lastPlayerAlive !== false &&
        game.player &&
        !game.player.alive
      ) {
        self.event("player_death", {
          state: game.state,
          health: game.player.health,
          score: game.player.score,
          kills: game.player.kills,
          round: game.arenaRound,
          level: game.campaignLevel,
          x: game.player.x,
          y: game.player.y,
        });
      }
      self._lastPlayerAlive = game.player?.alive;
    };

    // Patch buyUpgrade to track purchases
    if (game.buyUpgrade) {
      const origBuy = game.buyUpgrade.bind(game);
      game.buyUpgrade = function (key) {
        const prevLevel = game.upgradeLevels[key] || 0;
        const prevScore = game.player.score;
        origBuy(key);
        const newLevel = game.upgradeLevels[key] || 0;
        if (newLevel > prevLevel) {
          self.event("upgrade_purchase", {
            key,
            level: newLevel,
            cost: prevScore - game.player.score,
            scoreAfter: game.player.score,
          });
        }
      };
    }
  }

  /** Take a periodic snapshot of game state */
  _snapshot() {
    const g = this.game;
    if (!g.player) return;

    this.session.snapshots.push({
      t: Date.now() - this.session.started,
      state: g.state,
      mode: g.mode,
      health: g.player.health,
      maxHealth: g.player.maxHealth,
      armor: g.player.armor,
      ammo: g.player.ammo,
      score: g.player.score,
      kills: g.player.kills,
      x: Math.round(g.player.x * 100) / 100,
      y: Math.round(g.player.y * 100) / 100,
      enemies: g.entities?.filter((e) => e.active && e.type === "enemy").length,
      round: g.arenaRound,
      level: g.campaignLevel,
      fps: g.deltaTime > 0 ? Math.round(1000 / g.deltaTime) : 0,
    });
  }

  /** Persist session to localStorage */
  _persist() {
    try {
      const existing = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
      existing.push(this.session);
      // Keep last 50 sessions
      while (existing.length > 50) existing.shift();
      localStorage.setItem(TELEMETRY_KEY, JSON.stringify(existing));
    } catch {
      // Storage full or unavailable
    }
  }

  /** Get summary of current session */
  getSummary() {
    const events = this.session.events;
    const snapshots = this.session.snapshots;

    const stateChanges = events.filter((e) => e.name === "state_change");
    const deaths = events.filter((e) => e.name === "player_death");
    const upgrades = events.filter((e) => e.name === "upgrade_purchase");

    // Average FPS from snapshots
    const fpsValues = snapshots.map((s) => s.fps).filter((f) => f > 0);
    const avgFps =
      fpsValues.length > 0
        ? Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length)
        : 0;

    // Peak enemy count
    const peakEnemies = Math.max(0, ...snapshots.map((s) => s.enemies || 0));

    // Score progression
    const scores = snapshots.map((s) => s.score).filter((s) => s > 0);
    const peakScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Kill rate (kills per minute)
    const durationMin = (Date.now() - this.session.started) / 60000 || 0.01;
    const totalKills =
      snapshots.length > 0 ? snapshots[snapshots.length - 1].kills : 0;
    const killRate = Math.round(totalKills / durationMin);

    return {
      sessionId: this.session.id,
      duration: Date.now() - this.session.started,
      events: events.length,
      snapshots: snapshots.length,
      stateTransitions: stateChanges.length,
      deaths: deaths.length,
      upgradesPurchased: upgrades.length,
      avgFps,
      peakEnemies,
      peakScore,
      killRate,
    };
  }

  /** Export all persisted sessions as JSON string */
  static exportAll() {
    return localStorage.getItem(TELEMETRY_KEY) || "[]";
  }

  /** Clear all persisted telemetry */
  static clearAll() {
    localStorage.removeItem(TELEMETRY_KEY);
  }

  /** Get stats across all sessions */
  static getAggregate() {
    const sessions = JSON.parse(localStorage.getItem(TELEMETRY_KEY) || "[]");
    if (sessions.length === 0) return null;

    const allDeaths = [];
    const allUpgrades = {};
    let totalPlaytime = 0;
    let totalKills = 0;
    let maxScore = 0;
    let maxRound = 0;

    for (const session of sessions) {
      const duration =
        session.events?.find((e) => e.name === "session_end")?.duration || 0;
      totalPlaytime += duration;

      for (const event of session.events || []) {
        if (event.name === "player_death") {
          allDeaths.push({
            x: event.x,
            y: event.y,
            round: event.round,
            level: event.level,
          });
          if (event.kills > totalKills) totalKills = event.kills;
          if (event.score > maxScore) maxScore = event.score;
          if (event.round > maxRound) maxRound = event.round;
        }
        if (event.name === "upgrade_purchase") {
          allUpgrades[event.key] = (allUpgrades[event.key] || 0) + 1;
        }
      }
    }

    // Death heatmap (grid buckets)
    const deathHeatmap = {};
    for (const d of allDeaths) {
      const key = `${Math.floor(d.x)},${Math.floor(d.y)}`;
      deathHeatmap[key] = (deathHeatmap[key] || 0) + 1;
    }

    // Most popular upgrades
    const upgradeRanking = Object.entries(allUpgrades)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));

    return {
      sessions: sessions.length,
      totalPlaytimeMs: totalPlaytime,
      totalDeaths: allDeaths.length,
      maxScore,
      maxRound,
      deathHeatmap,
      upgradeRanking,
    };
  }
}

export function createTelemetry(game) {
  return new TelemetryCollector(game);
}
