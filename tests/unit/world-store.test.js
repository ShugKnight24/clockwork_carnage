import { describe, it, expect, vi } from "vitest";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { encodeV4, packWorld } from "../../src/world/world-codec.js";
import { colKey } from "../../src/world/world.js";

/** Every resident cell, in column order. */
const cells = (w) => Buffer.concat([...w.columns.values()].map((c) => Buffer.from(c.blocks)));

function store() {
  const backend = new MemoryBackend();
  const commit = vi.spyOn(backend, "commit");
  return { s: new WorldStore(backend), backend, commit };
}

/** A packed v4 world as the version 1 store wrote it: one row, one blob. */
async function v4Bytes(w) {
  const json = new TextEncoder().encode(JSON.stringify(encodeV4(w)));
  const gz = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  const out = new Uint8Array(gz.length + 1); out[0] = 1; out.set(gz, 1);
  return out;
}

describe("WorldStore v2: a row per world, a row per edited column", () => {
  it("saves an unedited world as a meta row and no columns", async () => {
    const { s, backend, commit } = store();
    const w = generateWorld({ terrain: true, seed: 4 });
    await s.save(0, w);
    expect(commit).toHaveBeenCalledTimes(1);
    const row = backend.rows.get(0);
    expect(row.bytes).toBeUndefined();
    expect(row.meta.gen).toEqual(w.meta.gen);
    expect(await backend.getColumns(0)).toEqual([]);
    expect(JSON.stringify(row).length).toBeLessThan(600);
    expect(cells(await s.load(0)).equals(cells(w))).toBe(true);
  });

  it("writes only the columns changed since the last save, in one commit", async () => {
    const { s, backend, commit } = store();
    const w = generateWorld({ terrain: true, seed: 4 });
    w.set(1, 1, 50, 5); w.set(40, 40, 50, 5);
    await s.save(0, w);
    expect(commit.mock.calls[0][0]).toMatchObject({ clear: true, del: [] });
    expect(commit.mock.calls[0][0].put).toHaveLength(2);

    w.set(41, 40, 50, 6);
    await s.save(0, w);
    expect(commit).toHaveBeenCalledTimes(2);
    const second = commit.mock.calls[1][0];
    expect(second.clear).toBe(false);
    expect(second.put.map((c) => c.key)).toEqual([colKey(2, 2)]);

    await s.save(0, w);
    expect(commit.mock.calls[2][0].put).toEqual([]);
    expect((await backend.getColumns(0)).map((c) => c.key).sort()).toEqual([colKey(0, 0), colKey(2, 2)].sort());
  });

  it("deletes the row of a column put back the way it was generated", async () => {
    const { s, backend, commit } = store();
    const w = generateWorld({ terrain: false });
    w.set(40, 40, 20, 0);
    await s.save(0, w);
    w.set(40, 40, 20, 13); // rock, as generated
    await s.save(0, w);
    expect(commit.mock.calls[1][0]).toMatchObject({ del: [colKey(2, 2)], put: [] });
    expect(await backend.getColumns(0)).toEqual([]);
    expect(w.dropped.size).toBe(0); // tombstone spent
  });

  it("retries the whole change after a failed commit", async () => {
    const { s, backend } = store();
    const w = generateWorld({ terrain: false });
    await s.save(0, w);
    w.set(1, 1, 40, 3);
    backend.commit.mockRejectedValueOnce(new Error("quota"));
    await expect(s.save(0, w)).rejects.toThrow("quota");
    await s.save(0, w);
    expect((await s.load(0)).get(1, 1, 40)).toBe(3);
  });

  it("round-trips edits and placed bits through load and save", async () => {
    const { s, commit } = store();
    const w = generateWorld({ terrain: true, seed: 99 });
    w.set(64, 64, 50, 7); w.markPlaced(64, 64, 50);
    await s.save(3, w);
    const a = await s.load(3);
    expect(a.get(64, 64, 50)).toBe(7);
    expect(a.wasPlaced(64, 64, 50)).toBe(true);
    // A loaded world knows the store holds it: an edit saves as one column.
    a.set(0, 0, 50, 8);
    await s.save(3, a);
    expect(commit.mock.calls[1][0]).toMatchObject({ clear: false });
    expect(commit.mock.calls[1][0].put).toHaveLength(1);
    const b = await s.load(3);
    expect(cells(b).equals(cells(a))).toBe(true);
    expect(b.wasPlaced(64, 64, 50)).toBe(true);
  });

  it("writes a world whole under a new id or into another store", async () => {
    const one = store(), two = store();
    const w = generateWorld({ terrain: false });
    w.set(1, 1, 40, 3);
    await one.s.save(0, w);
    await one.s.save(1, w);
    expect(one.commit.mock.calls[1][0]).toMatchObject({ clear: true });
    expect(one.commit.mock.calls[1][0].put).toHaveLength(1);
    await two.s.save(0, w);
    expect(two.commit.mock.calls[0][0]).toMatchObject({ clear: true });
    expect((await two.s.load(0)).get(1, 1, 40)).toBe(3);
  });

  it("removes a world's row and its columns together", async () => {
    const { s, backend } = store();
    const w = generateWorld({ terrain: false });
    w.set(1, 1, 40, 3);
    await s.save(0, w);
    await s.save(1, generateWorld({ terrain: false, name: "Other" }));
    await s.remove(0);
    expect(await s.load(0)).toBeNull();
    expect(await backend.getColumns(0)).toEqual([]);
    expect((await s.list()).map((r) => r.id)).toEqual([1]);
  });

  it("lists names without meta or blobs", async () => {
    const { s } = store();
    await s.save(0, generateWorld({ terrain: false, name: "A" }));
    const [row] = await s.list();
    expect(Object.keys(row).sort()).toEqual(["id", "name", "updatedAt"]);
  });
});

describe("upgrading from the version 1 store", () => {
  it("opens a v4 row and rewrites it as v5 in one commit on its next save", async () => {
    const { s, backend, commit } = store();
    const src = generateWorld({ terrain: true, seed: 17 });
    src.set(70, 70, 50, 9);
    delete src.meta.gen; // saved before phase 2
    backend.rows.set(0, { id: 0, name: "Old", updatedAt: 1, bytes: await v4Bytes(src) });

    expect((await s.list()).map((r) => r.name)).toEqual(["Old"]);
    const w = await s.load(0);
    expect(cells(w).equals(cells(src))).toBe(true);
    expect(w.meta.gen.kind).toBe("void");

    await s.save(0, w);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0][0]).toMatchObject({ clear: true });
    const row = backend.rows.get(0);
    expect(row.bytes).toBeUndefined();
    expect(row.meta.gen).toEqual(w.meta.gen);
    expect(await backend.getColumns(0)).toHaveLength(64);

    const back = await s.load(0);
    expect(cells(back).equals(cells(src))).toBe(true);
    expect(back.meta.gen).toEqual(w.meta.gen); // the seed drawn on first open is kept
  });

  it("keeps the generator of a v4 row made since phase 2", async () => {
    const { s, backend } = store();
    const src = generateWorld({ terrain: true, seed: 17 });
    src.set(70, 70, 50, 9);
    backend.rows.set(0, { id: 0, name: "Seeded", updatedAt: 1, bytes: await v4Bytes(src) });
    const w = await s.load(0);
    await s.save(0, w);
    expect((await backend.getColumns(0)).map((c) => c.key)).toEqual([colKey(4, 4)]);
    expect(cells(await s.load(0)).equals(cells(src))).toBe(true);
  });

  it("still loads a v5 packed blob, as an import would hand one over", async () => {
    const { s, backend } = store();
    const src = generateWorld({ terrain: false });
    src.set(2, 2, 40, 4);
    backend.rows.set(5, { id: 5, name: "Blob", updatedAt: 1, bytes: await packWorld(src) });
    expect((await s.load(5)).get(2, 2, 40)).toBe(4);
  });
});
