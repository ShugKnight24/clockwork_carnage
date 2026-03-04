// ═══════════════════════════════════════════════════════════════════
// CLOCKWORK CARNAGE — WebSocket Client (Browser)
// Connects to the arena server and syncs game state
// ═══════════════════════════════════════════════════════════════════

import { MSG, encode, decode, packInput } from "./protocol.js";

export class NetClient {
  constructor() {
    this.ws = null;
    this.playerId = null;
    this.playerName = null;
    this.connected = false;
    this.latency = 0;
    this.players = new Map(); // id → { x, y, angle, hp, kills, deaths, name }
    this.bullets = []; // [{ x, y, owner }]
    this.events = []; // queued events for game to consume
    this._pingTimer = null;
    this._inputInterval = null;
  }

  /**
   * Connect to the arena server.
   * @param {string} url - WebSocket URL, e.g. "ws://localhost:8080"
   */
  connect(url) {
    if (this.ws) this.disconnect();

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[net] Connected to", url);
      this._startPing();
      this._startInputLoop();
    };

    this.ws.onmessage = (evt) => {
      let msg;
      try {
        msg = decode(evt.data);
      } catch {
        return;
      }
      this._handleMessage(msg);
    };

    this.ws.onclose = () => {
      console.log("[net] Disconnected");
      this.connected = false;
      this._stopPing();
      this._stopInputLoop();
      this.events.push({ type: "disconnected" });
    };

    this.ws.onerror = (err) => {
      console.error("[net] Error:", err);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this._stopPing();
    this._stopInputLoop();
  }

  // ── Outgoing ────────────────────────────────────────────────────

  /**
   * Send current input state. Called automatically at tick rate.
   */
  sendInput(keys, angle, shooting) {
    if (!this.connected) return;
    this._lastInput = { keys, angle, shooting };
  }

  sendShoot() {
    if (!this.connected) return;
    this._send(MSG.SHOOT, {});
  }

  sendChat(text) {
    if (!this.connected) return;
    this._send(MSG.CHAT, { text });
  }

  // ── Incoming ────────────────────────────────────────────────────

  _handleMessage(msg) {
    switch (msg.type) {
      case MSG.WELCOME:
        this.playerId = msg.data.id;
        this.playerName = msg.data.name;
        this.connected = true;
        // Populate initial roster
        for (const p of msg.data.roster) {
          this.players.set(p.id, { ...p });
        }
        this.events.push({
          type: "connected",
          id: this.playerId,
          name: this.playerName,
        });
        console.log(
          `[net] Welcome! You are ${this.playerName} (id=${this.playerId})`,
        );
        break;

      case MSG.PLAYER_JOIN:
        this.players.set(msg.data.id, {
          ...msg.data,
          hp: 100,
          kills: 0,
          deaths: 0,
        });
        this.events.push({ type: "player_join", ...msg.data });
        break;

      case MSG.PLAYER_LEAVE:
        this.players.delete(msg.data.id);
        this.events.push({ type: "player_leave", id: msg.data.id });
        break;

      case MSG.STATE:
        // Authoritative state update
        for (const p of msg.data.players) {
          if (p.id === this.playerId) {
            // Update self position from server (server is authority)
            this.players.set(p.id, {
              ...this.players.get(p.id),
              x: p.x,
              y: p.y,
              angle: p.a,
              hp: p.hp,
              kills: p.k,
              deaths: p.d,
            });
          } else {
            this.players.set(p.id, {
              ...this.players.get(p.id),
              x: p.x,
              y: p.y,
              angle: p.a,
              hp: p.hp,
              kills: p.k,
              deaths: p.d,
            });
          }
        }
        this.bullets = msg.data.bullets || [];
        break;

      case MSG.HIT:
        this.events.push({
          type: "hit",
          target: msg.data.target,
          attacker: msg.data.attacker,
          hp: msg.data.hp,
        });
        break;

      case MSG.KILL:
        this.events.push({
          type: "kill",
          killer: msg.data.killer,
          victim: msg.data.victim,
        });
        break;

      case MSG.CHAT_RELAY:
        this.events.push({
          type: "chat",
          id: msg.data.id,
          name: msg.data.name,
          text: msg.data.text,
        });
        break;

      case MSG.PONG:
        this.latency = Date.now() - msg.data.t;
        break;
    }
  }

  // ── Events for Game Loop ────────────────────────────────────────

  /** Drain pending events. Call once per game frame. */
  pollEvents() {
    const evts = this.events.splice(0, this.events.length);
    return evts;
  }

  // ── Internal ────────────────────────────────────────────────────

  _send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encode(type, data));
    }
  }

  _startPing() {
    this._pingTimer = setInterval(() => {
      this._send(MSG.PING, { t: Date.now() });
    }, 2000);
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  _startInputLoop() {
    this._lastInput = null;
    this._inputInterval = setInterval(() => {
      if (this._lastInput && this.connected) {
        const packed = packInput(
          this._lastInput.keys,
          this._lastInput.angle,
          this._lastInput.shooting,
        );
        this._send(MSG.INPUT, packed);
      }
    }, 50); // 20 Hz input rate
  }

  _stopInputLoop() {
    if (this._inputInterval) {
      clearInterval(this._inputInterval);
      this._inputInterval = null;
    }
  }
}
