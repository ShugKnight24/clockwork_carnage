// src/rpg/player-store.js
/**
 * Per-character progression in IndexedDB `cc_player`. Worlds stay pure terrain,
 * so the v4 world codec is untouched and a shared build never carries xp.
 * Mirrors the shape of WorldStore's IdbBackend, including dropping the cached
 * open promise on error so a private-mode or quota refusal can be retried.
 */
import { Inventory, TOTAL_SLOTS } from "./inventory.js";
import { Skills } from "./skills.js";

export const PLAYER_VERSION = 1;

export class MemoryPlayerBackend {
  constructor() { this.rows = new Map(); }
  async get(id) { return this.rows.get(id) || null; }
  async put(row) { this.rows.set(row.id, row); }
}

export class IdbPlayerBackend {
  _db() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const req = indexedDB.open("cc_player", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("players", { keyPath: "id" });
      req.onsuccess = () => res(req.result);
      req.onerror = () => { this._p = null; rej(req.error); };
    });
    return this._p;
  }
  async _tx(mode, fn) {
    const db = await this._db();
    return new Promise((res, rej) => {
      const tx = db.transaction("players", mode), st = tx.objectStore("players");
      const r = fn(st); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error);
    });
  }
  get(id) { return this._tx("readonly", (s) => s.get(id)).then((r) => r || null); }
  put(row) { return this._tx("readwrite", (s) => s.put(row)); }
}

/**
 * @returns {{skills:Skills, inventory:Inventory, stale:boolean}}
 *   `stale` marks a record from a newer build, which is never coerced and
 *   never written back over, so an older build cannot destroy it.
 */
export function decodePlayer(row) {
  if (!row || typeof row !== "object") {
    return { skills: new Skills(), inventory: new Inventory(), stale: false };
  }
  if (row.version > PLAYER_VERSION) {
    return { skills: new Skills(), inventory: new Inventory(), stale: true };
  }
  return {
    skills: Skills.fromJSON(row.skills),
    inventory: Inventory.fromJSON(row.inventory, TOTAL_SLOTS),
    stale: false,
  };
}

export class PlayerStore {
  constructor(backend = new IdbPlayerBackend()) { this.backend = backend; }

  /** Never rejects: an unavailable store yields a fresh in-memory session. */
  async load(id = 0) {
    try {
      return { ...decodePlayer(await this.backend.get(id)), unavailable: false };
    } catch {
      return { skills: new Skills(), inventory: new Inventory(), stale: false, unavailable: true };
    }
  }

  /** @returns {Promise<boolean>} false when the write could not be made */
  async save(id, { skills, inventory }) {
    try {
      await this.backend.put({
        id, version: PLAYER_VERSION,
        skills: skills.toJSON(), inventory: inventory.toJSON(),
        updatedAt: Date.now(),
      });
      return true;
    } catch {
      return false;
    }
  }
}
