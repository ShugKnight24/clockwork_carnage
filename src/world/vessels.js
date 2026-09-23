// src/world/vessels.js
// Rafts, boats and jetskis: the Forge's vessel entities (water spec §D).
//
// A vessel is plain data, `{id, kind, x, y, z, yaw, vx, vy, vz, spin}`, with
// (x, y) the centre of its hull and z its keel. The list lives in
// `world.meta.vessels`: both save formats clone `meta` whole, so vessels are
// saved with the world and need nothing from the codec. Everything here is
// pure — it reads the world and updates the vessel it is handed — so the
// physics is tested without a browser, and the Forge only feeds it input.
//
// Deliberately not the play-test enemy system, which lives in the campaign's
// entity code and would drag combat along.
import { isSolid, isWater, WATER_SURFACE } from "./blocks.js";
import { World } from "./world.js";
import { PLAYER, moveAABB, aabbOverlapsSolid } from "./voxel-physics.js";

const GRAVITY = PLAYER.gravity;

/**
 * Per kind, in blocks and seconds. `half` and `height` are the collision box
 * (square: a hull turns, the box does not); `draft` is how deep the keel sits
 * at rest. Speeds are caps: throttle eases toward them at `accel` per second
 * and lets go at `coast`. `grip` bleeds off sideways speed — high for a raft
 * or a boat, which go where they point, low for a jetski, which drifts. `turn`
 * is the yaw rate at speed. `seat` is where the rider sits, forward and up
 * from the keel, and `landCrawl` how fast it moves out of the water.
 */
export const VESSELS = {
  raft: {
    name: "Raft", half: 1.1, height: 0.45, draft: 0.2,
    maxSpeed: 3.5, maxReverse: 1.5, accel: 1.4, coast: 0.8, turn: 1.1, grip: 20,
    landCrawl: 0, hop: 0, seat: [0, 0.45], bob: 0.05,
  },
  boat: {
    name: "Boat", half: 0.8, height: 0.7, draft: 0.3,
    maxSpeed: 6, maxReverse: 2.5, accel: 1.2, coast: 0.7, turn: 1.8, grip: 20,
    landCrawl: 0, hop: 0, seat: [-0.25, 0.3], bob: 0.04,
  },
  jetski: {
    name: "Jetski", half: 0.55, height: 0.8, draft: 0.25,
    maxSpeed: 13, maxReverse: 3, accel: 1.1, coast: 0.6, turn: 2.6, grip: 3,
    landCrawl: 1, hop: 9, seat: [-0.2, 0.65], bob: 0.03,
  },
};
export const VESSEL_KINDS = Object.keys(VESSELS);

/** Blocks from the player's feet to a hull's centre within which `B` boards it. */
export const MOUNT_REACH = 2.5;
/** How far from the hull leaving it looks for dry land before stepping into the water. */
export const DISMOUNT_REACH = 4;
/** The rider's eye above the seat: lower than standing, as a seated body is. */
export const SEATED_EYE = 1.0;
/** A world never holds more than this many; a save claiming more is cut. */
const MAX_VESSELS = 256;

let nextId = 1;
const newId = (taken) => { while (taken.has(nextId)) nextId++; return nextId++; };

/** A vessel at rest. */
export function makeVessel(kind, x, y, z, yaw = 0, id = nextId++) {
  return { id, kind, x, y, z, yaw, vx: 0, vy: 0, vz: 0, spin: 0 };
}

/**
 * Vessels read back from a save, checked: an unknown kind, a missing or
 * non-finite coordinate, or a duplicate id is dropped or renumbered rather
 * than trusted, and every one starts at rest. A save is data from disk or a
 * share link, and the physics must never see a NaN.
 */
export function sanitizeVessels(list) {
  if (!Array.isArray(list)) return [];
  const out = [], ids = new Set();
  for (const v of list) {
    if (out.length >= MAX_VESSELS) break;
    if (!v || typeof v !== "object" || !VESSELS[v.kind]) continue;
    if (![v.x, v.y, v.z].every(Number.isFinite) || Math.abs(v.x) > World.BORDER || Math.abs(v.y) > World.BORDER) continue;
    const id = Number.isInteger(v.id) && v.id > 0 && !ids.has(v.id) ? v.id : newId(ids);
    ids.add(id);
    out.push(makeVessel(v.kind, v.x, v.y, Math.max(0, Math.min(World.H - 1, v.z)), Number.isFinite(v.yaw) ? v.yaw : 0, id));
  }
  for (const id of ids) if (id >= nextId) nextId = id + 1;
  return out;
}

/** The world's vessel list, created on first use. It is `meta.vessels`, so it saves with the world. */
export function vesselsOf(world) {
  if (!Array.isArray(world.meta.vessels)) world.meta.vessels = [];
  return world.meta.vessels;
}

/**
 * The height of the water's surface in the column under (x, y), looked for
 * from two blocks below `z` to two above: the top of the highest water cell
 * there, 7/8 up when open to the air as the renderer draws it. Null when the
 * column holds no water near that height.
 */
export function waterSurfaceAt(world, x, y, z) {
  const bx = Math.floor(x), by = Math.floor(y);
  for (let bz = Math.floor(z) + 2; bz >= Math.floor(z) - 2; bz--) {
    if (!isWater(world.get(bx, by, bz))) continue;
    const above = world.get(bx, by, bz + 1);
    return bz + (isWater(above) || isSolid(above) ? 1 : WATER_SURFACE);
  }
  return null;
}

/**
 * One frame of a vessel. Buoyancy is a damped spring that holds the keel its
 * draft below the surface, so a hull dropped in bobs and settles; out of the
 * water it falls. Throttle and steering only bite afloat (a jetski crawls on
 * land). Travel is `moveAABB` with no step-up: a hull stops at a beach and
 * cannot climb a bank, and a column that is not loaded is a wall.
 * @param {{throttle?:number, steer?:number, hop?:boolean}} input throttle and
 *   steer in -1..1 (+steer turns right, toward increasing yaw); `hop` is a
 *   jetski's jump
 * @returns {{floating:boolean, speed:number, splash:number, bump:number, hopped:boolean}}
 *   `splash` is the speed the hull hit the water at, `bump` the speed it hit
 *   something solid at; both 0 when nothing happened
 */
export function stepVessel(world, v, { throttle = 0, steer = 0, hop = false } = {}, dt) {
  const k = VESSELS[v.kind];
  const ev = { floating: false, speed: 0, splash: 0, bump: 0, hopped: false };
  if (!k || !(dt > 0)) return ev;
  const surf = waterSurfaceAt(world, v.x, v.y, v.z);
  const depth = surf == null ? 0 : surf - v.z;
  const afloat = depth > 0;

  // Vertical: gravity, and the water's push once the keel is in it.
  let az = -GRAVITY;
  if (afloat) {
    az += GRAVITY * Math.min(depth, k.height) / k.draft;
    az -= 1.3 * Math.sqrt(GRAVITY / k.draft) * v.vz;
    if (v.wasAirborne && v.vz < -1) ev.splash = -v.vz;
  }
  v.vz += az * dt;
  if (hop && k.hop && afloat && depth > k.draft * 0.5) {
    // Lift the keel to the surface and throw it up: clear of the spring's
    // damping, so the whole kick goes into the jump.
    v.z = surf; v.vz = k.hop; ev.hopped = true;
  }

  // Horizontal, in the hull's own frame: speed along the bow eases toward
  // the throttle's target, sideways speed bleeds off at the kind's grip.
  const fx = Math.cos(v.yaw), fy = Math.sin(v.yaw);
  let vf = v.vx * fx + v.vy * fy, vl = -v.vx * fy + v.vy * fx;
  const onLand = !afloat && v.grounded;
  let turnScale = 0;
  if (afloat) {
    const target = throttle > 0 ? throttle * k.maxSpeed : throttle < 0 ? throttle * k.maxReverse : 0;
    vf += (target - vf) * (1 - Math.exp(-(throttle ? k.accel : k.coast) * dt));
    vl *= Math.exp(-k.grip * dt);
    // A hull turns best under way, but a paddle still swings it at rest.
    turnScale = 0.35 + 0.65 * Math.min(1, Math.abs(vf) / (0.5 * k.maxSpeed));
  } else if (onLand) {
    vf += (throttle * k.landCrawl - vf) * (1 - Math.exp(-8 * dt));
    vl *= Math.exp(-8 * dt);
    turnScale = k.landCrawl ? 0.5 : 0;
  }
  v.vx = vf * fx - vl * fy;
  v.vy = vf * fy + vl * fx;
  v.spin += (steer * k.turn * turnScale - v.spin) * (1 - Math.exp(-6 * dt));
  if (!afloat && !onLand) v.spin *= Math.exp(-2 * dt);
  v.yaw += v.spin * dt;

  const res = moveAABB(world, { x: v.x, y: v.y, z: v.z, half: k.half, height: k.height }, v.vx * dt, v.vy * dt, v.vz * dt, { step: 0 });
  const before = Math.hypot(v.vx, v.vy);
  if (res.hitX) v.vx = 0;
  if (res.hitY) v.vy = 0;
  if (res.hitX || res.hitY) ev.bump = before - Math.hypot(v.vx, v.vy);
  if (res.hitZ) v.vz = 0;
  v.x = res.x; v.y = res.y; v.z = res.z;
  v.grounded = res.grounded;
  v.wasAirborne = !afloat && !res.grounded;
  v.floating = afloat;
  ev.floating = afloat;
  ev.speed = Math.hypot(v.vx, v.vy);
  return ev;
}

/**
 * Where a vessel of `kind` goes when placed on the targeted cell: at the
 * water's surface when the target is water, on top of a block whose top face
 * is targeted. Null for a block's side or underside.
 * @param {{x:number,y:number,z:number,id:number,face:number[]}} t a pick result
 */
export function placementFor(world, kind, t) {
  const k = VESSELS[kind];
  if (!k || !t) return null;
  const x = t.x + 0.5, y = t.y + 0.5;
  if (isWater(t.id)) {
    const surf = waterSurfaceAt(world, x, y, t.z);
    return surf == null ? null : { x, y, z: surf - k.draft };
  }
  if (t.face[2] !== 1) return null;
  return { x, y, z: t.z + 1 };
}

/** Is there room for a hull of `kind` at (x, y, z): nothing solid, nothing unloaded, no other hull in the way? */
export function canPlaceVessel(world, vessels, kind, x, y, z) {
  const k = VESSELS[kind];
  if (!k || !world.isLoaded(Math.floor(x), Math.floor(y))) return false;
  if (aabbOverlapsSolid(world, x, y, z, k.half, k.height)) return false;
  for (const o of vessels) {
    const r = VESSELS[o.kind]?.half ?? 0;
    if (Math.abs(o.x - x) < k.half + r && Math.abs(o.y - y) < k.half + r && Math.abs(o.z - z) < 1.5) return false;
  }
  return true;
}

/** The vessel nearest the feet at (x, y, z) within `MOUNT_REACH`, or null. */
export function nearestVessel(vessels, x, y, z, reach = MOUNT_REACH) {
  let best = null, bd = reach;
  for (const v of vessels) {
    if (Math.abs(v.z - z) > 2.5) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d <= bd) { bd = d; best = v; }
  }
  return best;
}

/** The rider's feet: on the seat, turned with the hull. */
export function seatOf(v) {
  const k = VESSELS[v.kind];
  const [fwd, up] = k.seat;
  return { x: v.x + Math.cos(v.yaw) * fwd, y: v.y + Math.sin(v.yaw) * fwd, z: v.z + up };
}

/** Room for a standing player, on something, with dry feet. */
function standsAt(world, x, y, z) {
  if (z < 0 || z + PLAYER.height >= World.H) return false;
  if (isWater(world.get(Math.floor(x), Math.floor(y), Math.floor(z)))) return false;
  if (aabbOverlapsSolid(world, x, y, z, PLAYER.half, PLAYER.height)) return false;
  return aabbOverlapsSolid(world, x, y, z - 0.05, PLAYER.half, PLAYER.height);
}

/**
 * Where the rider goes on leaving: the nearest dry cell a player can stand on
 * within `DISMOUNT_REACH` of the hull and not far above or below it, else the
 * water beside the hull, where they swim. There is no drowning in the Forge,
 * so the water is a safe place to be put, just a wet one.
 * @returns {{x:number, y:number, z:number, dry:boolean}}
 */
export function dismountCell(world, v) {
  const k = VESSELS[v.kind];
  const cx = Math.floor(v.x), cy = Math.floor(v.y), r = Math.ceil(DISMOUNT_REACH);
  let best = null, bd = Infinity;
  for (let by = cy - r; by <= cy + r; by++) for (let bx = cx - r; bx <= cx + r; bx++) {
    const x = bx + 0.5, y = by + 0.5, d = Math.hypot(x - v.x, y - v.y);
    if (d > DISMOUNT_REACH || d >= bd || !world.isLoaded(bx, by)) continue;
    const z = world.topSolid(bx, by) + 1;
    if (z <= 0 || z < v.z - 2 || z > v.z + 2.5 || !standsAt(world, x, y, z)) continue;
    best = { x, y, z, dry: true }; bd = d;
  }
  if (best) return best;
  // Off either side of the hull, chest-deep: the swimmer floats up from there.
  const side = k.half + PLAYER.half + 0.05;
  const z = (waterSurfaceAt(world, v.x, v.y, v.z) ?? v.z) - 1;
  for (const s of [1, -1]) {
    const x = v.x - Math.sin(v.yaw) * side * s, y = v.y + Math.cos(v.yaw) * side * s;
    if (world.isLoaded(Math.floor(x), Math.floor(y)) && !aabbOverlapsSolid(world, x, y, z, PLAYER.half, PLAYER.height)) {
      return { x, y, z, dry: false };
    }
  }
  const s = seatOf(v);
  return { ...s, dry: false };
}

/**
 * The nearest hull a ray enters within `maxDist`, by the slab test against
 * each vessel's box. Direction need not be normalised.
 * @returns {{vessel:object, dist:number}|null}
 */
export function pickVessel(vessels, ox, oy, oz, dx, dy, dz, maxDist) {
  const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
  let best = null, bd = maxDist;
  for (const v of vessels) {
    const k = VESSELS[v.kind];
    if (!k) continue;
    let t0 = 0, t1 = bd;
    const slab = (o, d, lo, hi) => {
      if (Math.abs(d) < 1e-12) return o >= lo && o <= hi;
      let a = (lo - o) / d, b = (hi - o) / d;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      return t0 <= t1;
    };
    if (!slab(ox, dx, v.x - k.half, v.x + k.half)) continue;
    if (!slab(oy, dy, v.y - k.half, v.y + k.half)) continue;
    if (!slab(oz, dz, v.z, v.z + k.height)) continue;
    if (t0 < bd) { bd = t0; best = v; }
  }
  return best ? { vessel: best, dist: bd } : null;
}

/**
 * How a hull sits on the water this frame, for drawing only: a slow bob and
 * roll that differ from hull to hull, a lean into a turn and a lifted bow at
 * speed. The water's surface is a flat 7/8 of a cell in physics, and the
 * waves are the shader's ripples; this is what makes a hull look afloat on
 * them. Nothing moves a hull that is not floating.
 * @param {number} t seconds, any running clock
 * @returns {{dz:number, pitch:number, roll:number}} pitch lifts the bow, roll dips the right side
 */
export function vesselPose(v, t) {
  if (!v.floating) return { dz: 0, pitch: 0, roll: 0 };
  const k = VESSELS[v.kind];
  const ph = (v.id * 2.399) % (Math.PI * 2);
  const speed = Math.hypot(v.vx, v.vy);
  const lean = v.kind === "jetski" ? 0.16 : 0.05;
  return {
    dz: k.bob * Math.sin(t * 1.9 + ph),
    pitch: 0.035 * Math.sin(t * 1.3 + ph * 1.7) + (speed / k.maxSpeed) * (v.kind === "jetski" ? 0.08 : 0.03),
    roll: 0.04 * Math.sin(t * 1.1 + ph * 0.6) + lean * Math.max(-1, Math.min(1, v.spin / k.turn)),
  };
}

// ─── The jetski's wake ─────────────────────────────────────────────────────

/** Speed below which a jetski throws no spray. */
const WAKE_FROM = 4;

/**
 * Spray and foam thrown up behind a jetski at speed: two jets of droplets
 * that rise and fall off the stern, and flat foam that lingers where it went.
 * Plain particles, drawn by the renderer's additive `fx` billboards. `rand`
 * is injected so a test can fix the spray.
 */
export class WakeTrail {
  static MAX = 180;

  constructor(rand = Math.random) {
    this.rand = rand;
    this.p = [];
    this._acc = 0;
  }

  get count() { return this.p.length; }

  /** Age the particles and spawn new ones for each fast, floating jetski. */
  update(dt, vessels) {
    const p = this.p;
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      q.life -= dt;
      if (q.life <= 0) { p[i] = p[p.length - 1]; p.pop(); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.spray) { q.vz -= GRAVITY * 0.5 * dt; q.z += q.vz * dt; }
    }
    for (const v of vessels) {
      if (v.kind !== "jetski" || !v.floating) continue;
      const speed = Math.hypot(v.vx, v.vy);
      if (speed < WAKE_FROM) continue;
      this._acc += (speed - WAKE_FROM + 2) * 9 * dt;
      const fx = Math.cos(v.yaw), fy = Math.sin(v.yaw), k = VESSELS.jetski;
      while (this._acc >= 1) {
        this._acc -= 1;
        if (p.length >= WakeTrail.MAX) continue;
        const r = this.rand, side = r() < 0.5 ? -1 : 1, spray = r() < 0.6;
        const back = k.half * 2, out = 0.3 + r() * 0.2;
        const kick = 1 + r() * 1.5;
        p.push({
          x: v.x - fx * back - fy * side * out, y: v.y - fy * back + fx * side * out,
          z: v.z + k.draft + 0.05,
          vx: v.vx * 0.15 - fy * side * kick, vy: v.vy * 0.15 + fx * side * kick,
          vz: spray ? 2 + r() * 2.5 : 0, spray,
          life: spray ? 0.6 + r() * 0.3 : 1.4 + r() * 0.8, max: 0,
          size: spray ? 0.14 + r() * 0.1 : 0.3 + r() * 0.2,
        });
        p[p.length - 1].max = p[p.length - 1].life;
      }
    }
  }

  /** Feet-anchored additive billboards, for the renderer's `fx`. */
  sprites() {
    return this.p.map((q) => ({
      x: q.x, y: q.y, z: q.z - q.size / 2, w: q.size, h: q.size,
      alpha: Math.min(1, (q.life / q.max) * 1.6) * (q.spray ? 0.9 : 0.55),
      tint: q.spray ? [0.85, 0.95, 1] : [0.7, 0.85, 0.9],
    }));
  }
}
