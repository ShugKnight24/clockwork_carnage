/**
 * `forge` shots: a build timelapse in a voxel world, through the Forge's own
 * voxel renderer. The world is the shot's alone — generated from a fixed
 * seed, never loaded from or saved to the player's worlds (no ForgeMode, no
 * world store, no cc_forge_* key) — and so is the renderer: a VoxelRenderer
 * of its own, its GL context released at teardown. No game field is
 * borrowed; the scene paints the game canvas itself.
 *
 * spec: { build: "tower" | "bridge" = "tower", seed, act = 1, terrain = true,
 *         buildBeats = shot length − 2,
 *         orbit: { from = 0.1 (turns), turns = 0.3, radius, height = 5 (above the look),
 *                  lookAt (a share of the finished build's height: hold the look
 *                  there, the whole build in frame as it rises, instead of
 *                  following the fresh blocks) } }
 *   The build rises layer by layer on the beat (each beat's blocks land in
 *   its first half: a burst, then a breath) while the camera circles it.
 *
 * The voxel chunks (renderer, world generator) are imported by prepare, and
 * the world is generated and meshed there too, between idle callbacks, while
 * the previous shot plays: the cut opens on the whole valley.
 */
import { beatsToSec, secToBeats } from "../timeline.js";

// A valley with room for the tower and trees around it (column-gen v2).
const SEED = 20260924;
const FOV = 70;
const AIR = 0, STONE = 1, TECH = 2, METAL = 3, ENERGY = 4, GLASS = 8, RIFT = 9, LOG = 20, LEAVES = 21, PLANKS = 22;

let voxel = null; // { VoxelRenderer, generateWorld, styleName } once imported

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}

function idle() {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 200 });
    else setTimeout(resolve, 0);
  });
}

export const forge = {
  // The renderer's GL context and its atlas bake (~60 ms in one piece) are
  // made while the reel opens on black, not under the shot before.
  early: true,

  prepare(game, spec, { live = () => true } = {}) {
    const prep = { sandbox: null, done: null, discarded: false };
    prep.done = createSandbox(game, spec, live, idle).then((sb) => {
      if (sb && (prep.discarded || !live())) {
        dispose(sb);
        return null;
      }
      return (prep.sandbox = sb);
    });
    return prep;
  },

  /** A prepared valley whose shot never came up. */
  discard(game, prep) {
    prep.discarded = true;
    if (prep.sandbox) dispose(prep.sandbox);
    prep.sandbox = null;
  },

  build(game, spec, rng, { live = () => true, reel, shot, handle, prepared = null }) {
    if (prepared?.sandbox) {
      handle.forge = start(prepared.sandbox, spec, reel, shot);
      prepared.sandbox = null;
      return;
    }
    return (async () => {
      let sb = prepared ? await prepared.done : null;
      if (prepared) prepared.sandbox = null;
      sb ??= await createSandbox(game, spec, live);
      if (!sb) return; // no WebGL2: the shot stays dark rather than failing the reel
      if (!live()) {
        dispose(sb);
        return;
      }
      handle.forge = start(sb, spec, reel, shot);
    })();
  },

  update(game, dt, local, handle) {
    const st = handle.forge;
    if (!st) return;
    const want = placedAt(st.plan, secToBeats(st.reel, local), st.buildBeats);
    const { world } = st.sb;
    while (st.placed < want) {
      const [x, y, z, id] = st.plan.placements[st.placed++];
      world.set(x, y, z, id);
      st.top = Math.max(st.top, z);
    }
    st.cam = orbitCam(st.sb, st.orbit, local / st.shotLen, st);
  },

  event() {},

  teardown(game, handle) {
    const st = handle.forge;
    if (!st) return;
    handle.forge = null;
    dispose(st.sb);
  },

  draw(ctx, w, h, local, { handle }) {
    const st = handle.forge;
    if (!st?.cam) return;
    const { vr, world } = st.sb;
    vr.resize(w, h);
    const ok = vr.render(st.cam, world, [], null, { style: voxel.styleName(), act: world.meta.act || 1 }) !== false;
    if (ok) ctx.drawImage(vr.canvas, 0, 0, w, h);
  },
};

/**
 * The valley, its site cleared and founded, the build planned, a renderer
 * made and every terrain chunk meshed. Null when WebGL2 is unavailable or
 * `live()` turned false (anything made by then is freed).
 */
async function createSandbox(game, spec, live, wait = nextFrame) {
  if (!voxel) {
    const [vr, gen, glue] = await Promise.all([
      import("../../rendering/voxel/voxel-renderer.js"),
      import("../../world/world-gen.js"),
      import("../../systems/voxel-glue.js"),
    ]);
    voxel = { VoxelRenderer: vr.VoxelRenderer, generateWorld: gen.generateWorld, styleName: glue.styleName };
  }
  const w = game.renderer?.width;
  const h = game.renderer?.height;
  if (!live() || !w || !h) return null;
  const act = spec.act ?? 1;
  const world = voxel.generateWorld({ terrain: spec.terrain !== false, seed: spec.seed ?? SEED, act, name: "Reel" });
  const plan = planBuild(world, spec.build ?? "tower");
  await wait();
  if (!live()) return null;
  const vr = voxel.VoxelRenderer.create(w, h);
  if (!vr) return null;
  const sb = { vr, world, plan };
  await wait();
  if (!live()) {
    dispose(sb);
    return null;
  }
  try {
    // The atlas bake (~200 ms on a style's first use) and the meshing happen
    // here, where nothing is shown, a slice per idle callback.
    const style = voxel.styleName();
    vr.setStyle(style, act);
    const cam = orbitCam(sb, spec.orbit ?? {}, 0, null);
    for (let i = 0; i < 400 && (world.dirty.size || i === 0); i++) {
      vr.render(cam, world, [], null, { style, act, meshMs: 6 });
      await wait();
      if (!live()) {
        dispose(sb);
        return null;
      }
    }
  } catch (err) {
    dispose(sb);
    throw err;
  }
  return sb;
}

function start(sb, spec, reel, shot) {
  const buildBeats = spec.buildBeats ?? Math.max(1, shot.len - 2);
  const orbit = spec.orbit ?? {};
  const st = { sb, reel, plan: sb.plan, buildBeats, orbit, shotLen: beatsToSec(reel, shot.len), placed: 0, top: sb.plan.base, look: null, cam: null };
  st.cam = orbitCam(sb, orbit, 0, st);
  return st;
}

/** Free the renderer's GPU objects and its context now, not when the page collects them. */
function dispose(sb) {
  const vr = sb.vr;
  if (!vr || vr.destroyed) return;
  vr.destroy();
  vr.gl?.getExtension?.("WEBGL_lose_context")?.loseContext();
  sb.world = null;
}

// ─── The build (pure) ─────────────────────────────────────────────────────

/**
 * How many of the plan's blocks are down `beats` into the shot: the build's
 * share per beat, each beat's share landing in that beat's first half.
 */
export function placedAt(plan, beats, buildBeats) {
  const total = plan.placements.length;
  const b = Math.max(0, Math.min(buildBeats, beats));
  const whole = Math.floor(b);
  const k = whole >= buildBeats ? 0 : Math.min(1, (b - whole) * 2);
  return Math.min(total, Math.round(((whole + k) / buildBeats) * total));
}

/**
 * Pick the site (the world's spawn: level ground), clear it of trees, lay
 * its foundation, and list the build's blocks in the order they go down:
 * `{ center: {x, y}, base, height, placements: [[x, y, z, id], ...] }`.
 * Clearing and founding write the world directly: they are part of the
 * valley as it opens, not of the timelapse.
 */
export function planBuild(world, kind = "tower") {
  const cx = Math.floor(world.meta.spawn?.x ?? 64);
  const cy = Math.floor(world.meta.spawn?.y ?? 64);
  const reach = kind === "bridge" ? 14 : 5;
  let ground = 0;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const top = groundAt(world, cx + dx, cy + dy);
      if (kind !== "bridge" || Math.abs(dy) <= 2) ground = Math.max(ground, top);
    }
  }
  const base = ground + 1;
  clearSite(world, cx, cy, reach + 2, base);
  const placements = kind === "bridge" ? bridge(world, cx, cy, base) : tower(world, cx, cy, base);
  const height = placements.reduce((m, p) => Math.max(m, p[2]), base) - base + 1;
  return { kind, center: { x: cx + 0.5, y: cy + 0.5 }, base, height, placements };
}

/** The highest solid block that is ground, not a tree. */
function groundAt(world, x, y) {
  for (let z = world.constructor.H - 1; z >= 0; z--) {
    const id = world.get(x, y, z);
    if (id !== AIR && id !== LOG && id !== LEAVES) return z;
  }
  return 0;
}

function clearSite(world, cx, cy, r, base) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      for (let z = base; z < world.constructor.H; z++) {
        const id = world.get(cx + dx, cy + dy, z);
        if (id !== AIR) world.set(cx + dx, cy + dy, z, AIR);
      }
    }
  }
}

/** Stone down to the ground under every footprint cell, so nothing floats. */
function found(world, cells, base) {
  for (const [x, y] of cells) for (let z = base - 1; z >= 0 && world.get(x, y, z) === AIR; z--) world.set(x, y, z, STONE);
}

/** Around a square ring, starting at a corner: the order a builder walks it. */
function ring(half) {
  const out = [];
  for (let d = -half; d < half; d++) out.push([d, -half]);
  for (let d = -half; d < half; d++) out.push([half, d]);
  for (let d = half; d > -half; d--) out.push([d, half]);
  for (let d = half; d > -half; d--) out.push([-half, d]);
  return half === 0 ? [[0, 0]] : out;
}

const TOWER_H = 22;
const CLOCK_Z = 16;

/** A clock tower: a 7 × 7 stone shaft with steel corners and windows, a clock face each side, a steel spire. */
function tower(world, cx, cy, base) {
  const cells = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) cells.push([cx + dx, cy + dy]);
  found(world, cells, base);
  const out = [];
  for (let z = 0; z < TOWER_H; z++) {
    for (const [dx, dy] of ring(3)) {
      const corner = Math.abs(dx) === 3 && Math.abs(dy) === 3;
      const mid = Math.min(Math.abs(dx), Math.abs(dy)); // 0 at a face's middle column
      let id = corner ? METAL : STONE;
      if (!corner && mid <= 1 && z % 5 >= 2 && z % 5 <= 3 && z < CLOCK_Z - 2) id = GLASS;
      if (!corner && mid <= 1 && Math.abs(z - CLOCK_Z) <= 1) id = mid === 0 && z === CLOCK_Z ? RIFT : ENERGY;
      if (z === 0 || z === TOWER_H - 1) id = corner ? METAL : TECH;
      out.push([cx + dx, cy + dy, base + z, id]);
    }
  }
  // The spire: steel rings narrowing to an energy tip.
  for (let k = 0; k < 3; k++) for (const [dx, dy] of ring(2 - k)) out.push([cx + dx, cy + dy, base + TOWER_H + k, METAL]);
  for (let k = 0; k < 3; k++) out.push([cx, cy, base + TOWER_H + 3 + k, ENERGY]);
  return out;
}

const SPAN = 12;

/** A plank bridge on log piers: the piers rise, the deck runs out from both ends to meet, then the rails. */
function bridge(world, cx, cy, base) {
  const deck = base + 5;
  const piers = [-SPAN, 0, SPAN];
  const cells = [];
  for (const px of piers) for (let dy = -1; dy <= 1; dy++) cells.push([cx + px, cy + dy]);
  found(world, cells, base);
  const out = [];
  for (let z = base; z < deck; z++) for (const px of piers) for (let dy = -1; dy <= 1; dy += 2) out.push([cx + px, cy + dy, z, LOG]);
  for (let i = 0; i <= SPAN; i++) {
    for (const side of [-1, 1]) {
      const x = cx + side * (SPAN - i);
      for (let dy = -1; dy <= 1; dy++) out.push([x, cy + dy, deck, PLANKS]);
      if (i === SPAN) break; // the middle column once
    }
  }
  for (let x = -SPAN; x <= SPAN; x++) {
    for (const dy of [-2, 2]) {
      if (x % 3 === 0) out.push([cx + x, cy + dy, deck + 1, LOG]);
      out.push([cx + x, cy + dy, deck + (x % 3 === 0 ? 2 : 1), x % 3 === 0 ? ENERGY : PLANKS]);
    }
  }
  return out;
}

// ─── Camera ───────────────────────────────────────────────────────────────

/**
 * The orbit at fraction `k` of the shot: circling the build's centre, far
 * enough out to hold the whole of it, craning up as it grows. The look
 * follows the fresh blocks (a little under the top of what is built), eased
 * so each beat's burst does not jerk it; `st` carries the eased height
 * (null for a one-off camera).
 */
function orbitCam(sb, orbit, k, st) {
  const { plan, world } = sb;
  const H = Math.max(plan.height, 8);
  const radius = orbit.radius ?? (plan.kind === "bridge" ? 36 : 38);
  const turns = orbit.turns ?? 0.3;
  const a = ((orbit.from ?? 0.1) + turns * (0.85 * smooth(k) + 0.15 * k)) * Math.PI * 2;
  const x = plan.center.x + Math.cos(a) * radius;
  const y = plan.center.y + Math.sin(a) * radius;
  const built = st ? st.top - plan.base + 1 : H;
  const goal = orbit.lookAt != null ? plan.base + H * orbit.lookAt : plan.base + Math.max(4, Math.min(H, built) * 0.7);
  const lookZ = st?.look == null || orbit.lookAt != null ? goal : st.look + (goal - st.look) * 0.06;
  if (st) st.look = lookZ;
  const ground = world?.topSolid(Math.floor(x), Math.floor(y)) ?? 0;
  const eyeZ = Math.min(60, Math.max(lookZ + (orbit.height ?? 5), ground + 3));
  return {
    x,
    y,
    z: eyeZ,
    yaw: Math.atan2(plan.center.y - y, plan.center.x - x),
    pitch: Math.atan2(lookZ - eyeZ, radius),
    fovDeg: FOV,
  };
}
