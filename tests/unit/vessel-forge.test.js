import { describe, it, expect } from "vitest";
import { ForgeMode, VESSEL_KEY } from "../../js/forge.js";
import { WorldStore, MemoryBackend } from "../../src/world/world-store.js";
import { encodeWorld, decodeWorld } from "../../src/world/world-codec.js";
import { generateWorld } from "../../src/world/world-gen.js";
import { WATER, WATER_SURFACE } from "../../src/world/blocks.js";
import { VESSELS, VESSEL_KINDS, makeVessel, SEATED_EYE } from "../../src/world/vessels.js";
import { WorldStreamer } from "../../src/world/world-streamer.js";
import { ridingHint } from "../../src/ui/forge-hud.js";

const DT = 1 / 60;
const SURFACE = 30 + WATER_SURFACE;

const forge = () =>
  new ForgeMode({
    renderer: {},
    audio: { menuSelect() {}, menuConfirm() {} },
    settings: { fov: 70, sensitivity: 1, forgeFov: 90 },
    keybinds: { moveForward: "KeyW", moveBack: "KeyS", moveLeft: "KeyA", moveRight: "KeyD" },
    canvas: null,
    store: new WorldStore(new MemoryBackend()),
  });
const key = (f, code) => f.handleKeyDown({ code, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault() {} });

/** The lake of vessels.test.js: water x, y in 10..69 (surface cell z = 30), a bank from x = 70. */
function lake(meta = {}) {
  const w = generateWorld({ terrain: false });
  Object.assign(w.meta, meta);
  for (let y = 10; y < 70; y++) for (let x = 10; x < 70; x++) {
    for (let z = 20; z <= 31; z++) w.set(x, y, z, z === 20 ? 1 : z <= 30 ? WATER : 0);
  }
  for (let y = 0; y < 128; y++) for (let x = 70; x < 80; x++) for (let z = 21; z < 40; z++) w.set(x, y, z, z < 32 ? 1 : 0);
  return w;
}

async function forgeOn(world) {
  const f = forge();
  await f.start();
  f._adopt(world, 0);
  return f;
}

/** Stand (noclip) above the lake looking down at the water two blocks north. */
function aimAtWater(f, x = 40.5, y = 30.5) {
  f.noclip = true;
  Object.assign(f.player, { x, y, z: 33, angle: Math.PI / 2, pitch: -0.95 });
  f.update(0);
}

describe("the Forge's vessels: creative", () => {
  it("the vessel tool places the chosen kind on the water and right click takes it away", async () => {
    const f = await forgeOn(lake());
    while (f.toolMode !== "vessel") key(f, "KeyT");
    while (VESSEL_KINDS[f.vesselKind] !== "boat") key(f, "KeyG");
    aimAtWater(f);
    expect(f.target?.id).toBe(WATER);
    f.handleMouseDown(0);
    const list = f.world.meta.vessels;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "boat" });
    expect(list[0].z).toBeCloseTo(SURFACE - VESSELS.boat.draft, 9);
    expect(f._dirty).toBe(true);
    f.handleMouseDown(0); // the same spot is taken now
    expect(list).toHaveLength(1);
    f.update(0);
    expect(f.vesselTarget).toBe(list[0]);
    f.handleMouseDown(2);
    expect(f.world.meta.vessels).toHaveLength(0);
  });
});

describe("the Forge's vessels: boarding", () => {
  it(`${VESSEL_KEY} boards a vessel in reach and leaves it onto dry land`, async () => {
    const f = await forgeOn(lake());
    const boat = makeVessel("boat", 68.5, 40.5, SURFACE - VESSELS.boat.draft, Math.PI);
    f.world.meta.vessels = [boat];
    Object.assign(f.player, { x: 70.6, y: 40.5, z: 32 });
    expect(key(f, VESSEL_KEY)).toBe(true);
    expect(f.riding).toBe(boat);
    expect(f.boundedNew).toBe(false);
    f.update(DT);
    const cam = f.cameraFor();
    expect(Math.hypot(cam.x - boat.x, cam.y - boat.y)).toBeLessThan(0.5);
    expect(cam.z).toBeCloseTo(boat.z + VESSELS.boat.seat[1] + SEATED_EYE, 1);
    expect(key(f, VESSEL_KEY)).toBe(true);
    expect(f.riding).toBe(null);
    expect(f.player.x).toBeGreaterThanOrEqual(70);
    expect(f.player.z).toBe(32);
  });

  it(`${VESSEL_KEY} with nothing in reach says so, and leaves the next world alone`, async () => {
    const f = await forgeOn(lake());
    f.world.meta.vessels = [makeVessel("raft", 20.5, 20.5, 30.7)];
    Object.assign(f.player, { x: 100.5, y: 40.5, z: 32 });
    expect(key(f, VESSEL_KEY)).toBe(true);
    expect(f.riding).toBe(null);
    expect(f.boundedNew).toBe(false);
    expect(f.notice?.text).toBe("No vessel in reach");
  });

  it("Ctrl+B is not the vessel key", async () => {
    const f = await forgeOn(lake());
    f.world.meta.vessels = [makeVessel("boat", 68.5, 40.5, SURFACE - VESSELS.boat.draft)];
    Object.assign(f.player, { x: 70.6, y: 40.5, z: 32 });
    f.handleKeyDown({ code: VESSEL_KEY, ctrlKey: true, metaKey: false, shiftKey: false, preventDefault() {} });
    expect(f.riding).toBe(null);
  });

  it("W for two seconds drives a ridden boat across the water, afloat, the rider with it", async () => {
    const f = await forgeOn(lake());
    const boat = makeVessel("boat", 20.5, 40.5, SURFACE - VESSELS.boat.draft, 0);
    f.world.meta.vessels = [boat];
    Object.assign(f.player, { x: 20.5, y: 42.3, z: 30.5 });
    key(f, VESSEL_KEY);
    f.keys = { KeyW: true };
    for (let t = 0; t < 2; t += DT) f.update(DT);
    expect(boat.x).toBeGreaterThan(26);
    expect(boat.z).toBeCloseTo(SURFACE - VESSELS.boat.draft, 1);
    expect(Math.hypot(f.player.x - boat.x, f.player.y - boat.y)).toBeLessThan(0.5);
    // Steering turns the view with the hull.
    const look = f.player.angle;
    f.keys = { KeyW: true, KeyD: true };
    for (let t = 0; t < 0.5; t += DT) f.update(DT);
    expect(boat.yaw).toBeGreaterThan(0.2);
    expect(f.player.angle - look).toBeCloseTo(boat.yaw, 6);
    expect(f.modelsFor().map((m) => m.model.key)).toEqual(["vessel:boat"]);
    expect(ridingHint(f, f.vesselKeyLabel)).toMatch(/^BOAT \d+\.\d b\/s — W\/S throttle · A\/D steer · B leave$/);
    key(f, VESSEL_KEY);
    expect(ridingHint(f)).toBe(null);
  });

  it("a new world drops the rider off first", async () => {
    const f = await forgeOn(lake());
    const raft = makeVessel("raft", 30.5, 30.5, SURFACE - VESSELS.raft.draft);
    f.world.meta.vessels = [raft];
    Object.assign(f.player, { x: 30.5, y: 31.5, z: 31 });
    key(f, VESSEL_KEY);
    expect(f.riding).toBe(raft);
    f._adopt(lake(), 1);
    expect(f.riding).toBe(null);
  });
});

describe("the Forge's vessels: survival", () => {
  it("places a crafted boat from the hotbar and a held break picks it back up", async () => {
    const f = await forgeOn(lake({ mode: "survival" }));
    expect(f.survival).toBeTruthy();
    f.survival.inventory.add("boat", 1);
    const slot = f.survival.inventory.slots.findIndex((s) => s?.item === "boat");
    f.selectHotbar(slot);
    expect(f.heldItem).toBe("boat");
    aimAtWater(f);
    f.handleMouseDown(0);
    expect(f.world.meta.vessels).toHaveLength(1);
    expect(f.survival.inventory.count("boat")).toBe(0);
    f.update(0);
    expect(f.vesselTarget).toBeTruthy();
    f.handleMouseDown(2);
    f.update(0.2);
    expect(f.world.meta.vessels).toHaveLength(1); // not yet: it is a held break
    for (let i = 0; i < 30; i++) f.update(DT);
    f.handleMouseUp(2);
    expect(f.world.meta.vessels).toHaveLength(0);
    expect(f.survival.inventory.count("boat")).toBe(1);
  });

  it("will not place a vessel it does not have", async () => {
    const f = await forgeOn(lake({ mode: "survival" }));
    while (f.toolMode !== "vessel") key(f, "KeyT");
    aimAtWater(f);
    f.handleMouseDown(0);
    expect(f.world.meta.vessels ?? []).toHaveLength(0);
    expect(f.notice?.text).toMatch(/No /);
  });
});

describe("the Forge's vessels: saving and streaming", () => {
  it("vessels ride meta through the v5 codec and the column store", async () => {
    const w = lake();
    w.meta.vessels = [makeVessel("boat", 20.5, 40.5, 30.5, 1.25), makeVessel("jetski", 30.5, 40.5, 30.6, -2)];
    const back = decodeWorld(JSON.parse(JSON.stringify(encodeWorld(w))));
    expect(back.meta.vessels.map((v) => [v.kind, v.x, v.y, v.z, v.yaw])).toEqual([
      ["boat", 20.5, 40.5, 30.5, 1.25], ["jetski", 30.5, 40.5, 30.6, -2],
    ]);
    const store = new WorldStore(new MemoryBackend());
    await store.save(3, w);
    const loaded = await store.load(3);
    expect(loaded.meta.vessels.map((v) => v.kind)).toEqual(["boat", "jetski"]);
  });

  it("a world with no vessels saves no vessel key", async () => {
    const f = await forgeOn(lake());
    expect("vessels" in f.world.meta).toBe(false);
  });

  it("a vessel in an unloaded column is frozen and not drawn, and still saved", async () => {
    const f = forge();
    await f.start();
    const far = makeVessel("boat", 5000.5, 5000.5, 40); // in the air, over ground that is not loaded
    f.world.meta.vessels = [far];
    for (let i = 0; i < 30; i++) f.update(DT);
    expect(far.z).toBe(40);
    expect(f.modelsFor()).toEqual([]);
    await f.saveMap();
    const w = await f.store.load(f.currentSlot);
    expect(w.meta.vessels).toHaveLength(1);
    expect(w.meta.vessels[0]).toMatchObject({ kind: "boat", x: 5000.5, z: 40 });
  });

  it("a ridden jetski keeps its own column loaded while the streamer drops what it left behind", async () => {
    const w = generateWorld({ terrain: false, endless: true, seed: 5, name: "Channel" });
    // A channel along y = 8 from x = 0 to 460, three wide, dug into the flat ground.
    for (let x = -4; x < 460; x++) for (let y = 7; y <= 9; y++) for (let z = 26; z <= 31; z++) w.set(x, y, z, z === 26 ? 1 : WATER);
    const f = await forgeOn(w);
    const jet = makeVessel("jetski", 2.5, 8.5, 31 + WATER_SURFACE - VESSELS.jetski.draft, 0);
    f.world.meta.vessels = [jet];
    Object.assign(f.player, { x: 2.5, y: 9.5, z: 31 });
    key(f, VESSEL_KEY);
    expect(f.riding).toBe(jet);
    const st = new WorldStreamer(w, { drawRadius: 48 });
    f.keys = { KeyW: true };
    let maxResident = 0;
    for (let t = 0; t < 40 && jet.x < 400; t += DT) {
      f.update(DT);
      const cam = f.cameraFor();
      st.update(cam.x, cam.y, 1000);
      maxResident = Math.max(maxResident, w.columns.size);
      expect(w.isLoaded(Math.floor(jet.x), Math.floor(jet.y))).toBe(true);
    }
    expect(jet.x).toBeGreaterThan(400);
    expect(w.isLoaded(2, 8)).toBe(false);
    expect(maxResident).toBeLessThan(Math.PI * ((48 + 60 + 12) / 16) ** 2);
  });
});
