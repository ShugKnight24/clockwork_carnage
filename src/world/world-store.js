/**
 * Worlds live in IndexedDB `cc_worlds`, version 2, in two object stores:
 *
 * - `worlds`, keyPath `id`: one row per world, `{id, name, updatedAt, meta}`.
 *   A row written by version 1 holds `bytes` (a packed v4 world) instead of
 *   `meta`; it loads through the codec's migration and is rewritten as v5 on
 *   its next save, in the same transaction that writes its columns.
 * - `columns`, keyPath `["world", "key"]`: one row per edited column,
 *   `{world, key, cx, cy, overlay, placed?}` — the world's `edits`.
 *
 * A save writes the world row and only the columns that changed since the
 * last save, in one transaction, so it is all or nothing and does not grow
 * with the world. `MemoryBackend` has the same shape for tests and for the
 * Forge's storage-failed fallback.
 */
import { unpackWorld, decodeWorld } from "./world-codec.js";
import { foldEdits } from "./world-delta.js";

export class MemoryBackend {
  constructor() { this.rows = new Map(); this.cols = new Map(); /* id -> Map(key -> column row) */ }
  async getAll() { return [...this.rows.values()]; }
  async get(id) { return this.rows.get(id) || null; }
  async getColumns(id) { return [...(this.cols.get(id)?.values() || [])]; }
  /** One save: drop the world's columns first when `clear`, then `del`, then write. */
  async commit({ row, clear, del, put }) {
    let cols = this.cols.get(row.id);
    if (clear || !cols) this.cols.set(row.id, (cols = new Map()));
    for (const key of del) cols.delete(key);
    for (const c of put) cols.set(c.key, c);
    this.rows.set(row.id, row);
  }
  async delete(id) { this.rows.delete(id); this.cols.delete(id); }
}

const DB_NAME = "cc_worlds", DB_VERSION = 2;
/** Every column row of one world: keys are `[id, colKey]`. */
const worldRange = (id) => IDBKeyRange.bound([id, -Infinity], [id, Infinity]);

export class IdbBackend {
  _db() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      // Version 1 had only `worlds`. Its rows are left exactly as they are.
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("worlds")) db.createObjectStore("worlds", { keyPath: "id" });
        if (!db.objectStoreNames.contains("columns")) db.createObjectStore("columns", { keyPath: ["world", "key"] });
      };
      req.onsuccess = () => {
        const db = req.result;
        // A newer tab wants to upgrade: step aside rather than block it.
        db.onversionchange = () => { db.close(); this._p = null; };
        res(db);
      };
      // Drop the cached promise so a later call opens again rather than
      // replaying one failure — a private-mode or quota refusal is transient.
      req.onerror = () => { this._p = null; rej(req.error); };
      // Another tab still holds version 1 open. Waiting would hang the Forge;
      // failing drops it into the in-memory fallback, which says so on the HUD.
      req.onblocked = () => { this._p = null; rej(new Error("cc_worlds upgrade blocked by another tab")); };
    });
    return this._p;
  }
  async _tx(stores, mode, fn) {
    const db = await this._db();
    return new Promise((res, rej) => {
      const tx = db.transaction(stores, mode);
      const r = fn(tx);
      tx.oncomplete = () => res(r?.result);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error("transaction aborted"));
    });
  }
  getAll() { return this._tx(["worlds"], "readonly", (tx) => tx.objectStore("worlds").getAll()); }
  get(id) { return this._tx(["worlds"], "readonly", (tx) => tx.objectStore("worlds").get(id)).then((r) => r || null); }
  getColumns(id) { return this._tx(["columns"], "readonly", (tx) => tx.objectStore("columns").getAll(worldRange(id))); }
  commit({ row, clear, del, put }) {
    return this._tx(["worlds", "columns"], "readwrite", (tx) => {
      const cols = tx.objectStore("columns");
      if (clear) cols.delete(worldRange(row.id));
      for (const key of del) cols.delete([row.id, key]);
      for (const c of put) cols.put(c);
      tx.objectStore("worlds").put(row);
      // Nothing else joins this transaction, so commit now instead of when it
      // goes idle: a save made as the page hides must not wait for a task the
      // unloading page will never run.
      tx.commit?.();
    });
  }
  delete(id) {
    return this._tx(["worlds", "columns"], "readwrite", (tx) => {
      tx.objectStore("columns").delete(worldRange(id));
      tx.objectStore("worlds").delete(id);
    });
  }
}

const columnRow = (id, key, d) => {
  const row = { world: id, key, cx: d.cx, cy: d.cy, overlay: d.overlay };
  if (d.placed) row.placed = d.placed;
  return row;
};
const columnDoc = (r) => (r.placed ? [r.cx, r.cy, r.overlay, r.placed] : [r.cx, r.cy, r.overlay]);

export class WorldStore {
  constructor(backend = new IdbBackend()) { this.backend = backend; }
  async list() { return (await this.backend.getAll()).map(({ id, name, updatedAt }) => ({ id, name, updatedAt })).sort((a, b) => a.id - b.id); }

  async load(id) {
    const row = await this.backend.get(id);
    if (!row) return null;
    // A version 1 row: migrated in memory, and nothing marks it as held by
    // this store, so its first save writes it whole.
    if (row.bytes) return unpackWorld(row.bytes);
    const cols = await this.backend.getColumns(id);
    const w = decodeWorld({ version: 5, meta: row.meta, columns: cols.map(columnDoc) });
    w.persisted = { store: this, id, rev: w.editRev };
    return w;
  }

  /**
   * Everything up to `world.persisted.rev` is already in this slot, so only
   * deltas and tombstones stamped after it are sent. A world new to this slot
   * — generated, imported, migrated or saved elsewhere — is written whole over
   * whatever the slot held. The change list is built before the first await,
   * so edits made while the write is in flight wait for the next save.
   */
  async save(id, world) {
    foldEdits(world);
    const p = world.persisted;
    const since = p && p.store === this && p.id === id ? p.rev : -1;
    const rev = world.editRev;
    const put = [], del = [];
    for (const [key, d] of world.edits) if (d.rev > since) put.push(columnRow(id, key, d));
    if (since >= 0) for (const [key, r] of world.dropped) if (r > since) del.push(key);
    const row = { id, name: world.meta.name, updatedAt: Date.now(), meta: structuredClone(world.meta) };
    await this.backend.commit({ row, clear: since < 0, del, put });
    const q = world.persisted;
    if (!(q && q.store === this && q.id === id && q.rev > rev)) world.persisted = { store: this, id, rev };
    for (const [key, r] of world.dropped) if (r <= rev) world.dropped.delete(key);
  }

  async remove(id) { await this.backend.delete(id); }
  async nextId() { const rows = await this.list(); return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 0; }
}
