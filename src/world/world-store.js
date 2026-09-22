import { packWorld, unpackWorld } from "./world-codec.js";

export class MemoryBackend {
  constructor() { this.rows = new Map(); }
  async getAll() { return [...this.rows.values()]; }
  async get(id) { return this.rows.get(id) || null; }
  async put(row) { this.rows.set(row.id, row); }
  async delete(id) { this.rows.delete(id); }
}

/** IndexedDB `cc_worlds` / store `worlds`, keyPath `id`. */
export class IdbBackend {
  _db() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      const req = indexedDB.open("cc_worlds", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("worlds", { keyPath: "id" });
      req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
    });
    return this._p;
  }
  async _tx(mode, fn) {
    const db = await this._db();
    return new Promise((res, rej) => {
      const tx = db.transaction("worlds", mode), st = tx.objectStore("worlds");
      const r = fn(st); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error);
    });
  }
  getAll() { return this._tx("readonly", (s) => s.getAll()); }
  get(id) { return this._tx("readonly", (s) => s.get(id)).then((r) => r || null); }
  put(row) { return this._tx("readwrite", (s) => s.put(row)); }
  delete(id) { return this._tx("readwrite", (s) => s.delete(id)); }
}

export class WorldStore {
  constructor(backend = new IdbBackend()) { this.backend = backend; }
  async list() { return (await this.backend.getAll()).map(({ id, name, updatedAt }) => ({ id, name, updatedAt })).sort((a, b) => a.id - b.id); }
  async load(id) { const row = await this.backend.get(id); return row ? unpackWorld(row.bytes) : null; }
  async save(id, world) { await this.backend.put({ id, name: world.meta.name, updatedAt: Date.now(), bytes: await packWorld(world) }); }
  async remove(id) { await this.backend.delete(id); }
  async nextId() { const rows = await this.list(); return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 0; }
}
