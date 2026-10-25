import { describe, it, expect, afterEach } from "vitest";
import { Npc, setNpcWorld, STRIDE, PERSONAL } from "../../js/npc.js";

/** An open floor `w` by `h`, walled round, with optional extra wall cells. */
function floor(w, h, walls = []) {
  const grid = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 1 : 0)));
  for (const [x, y] of walls) grid[y][x] = 1;
  return { width: w, height: h, grid };
}

function run(world, seconds, dt = 1 / 60, each = null) {
  for (let t = 0; t < seconds; t += dt) {
    for (const e of world.entities) if (e.type === "npc") e.update(dt);
    each?.();
  }
}

const closest = (people) => {
  let min = Infinity;
  for (let i = 0; i < people.length; i++)
    for (let j = i + 1; j < people.length; j++)
      if (people[i].active && people[j].active) min = Math.min(min, Math.hypot(people[i].x - people[j].x, people[i].y - people[j].y));
  return min;
};

afterEach(() => setNpcWorld(null));

describe("an NPC's walk", () => {
  it("eases into its stride and out of it onto the mark", () => {
    const n = new Npc(2, 5, "officer");
    n.walk([[10, 5]]);
    n.update(1 / 60);
    expect(n.moveSpeed).toBeLessThan(n.speed * 0.2);
    run({ entities: [n] }, 1);
    expect(n.moveSpeed).toBeCloseTo(n.speed, 1);
    run({ entities: [n] }, 8);
    expect(n.walking).toBe(false);
    expect(n.x).toBeCloseTo(10, 5);
    expect(n.moveSpeed).toBe(0);
    // Standing with both feet down: the cycle rests on a footfall.
    const frac = (n.stride * 2) % 1;
    expect(Math.min(frac, 1 - frac)).toBeLessThan(0.03);
    expect(n.settling).toBe(false);
  });

  it("steps by the ground it covers, not the clock", () => {
    const n = new Npc(2, 5, "officer");
    n.walk([[40, 5]]);
    run({ entities: [n] }, 1);
    const s0 = n.stride;
    const x0 = n.x;
    run({ entities: [n] }, 0.5);
    const cycles = (n.stride - s0 + 1) % 1;
    expect(cycles).toBeCloseTo(((n.x - x0) / STRIDE) % 1, 2);
  });

  it("turns at a human rate instead of snapping round", () => {
    const n = new Npc(5, 5, "officer", { angle: 0 });
    n.faceTo({ x: 0, y: 5 });
    n.update(1 / 60);
    expect(Math.abs(n.angle)).toBeLessThan(0.5);
    run({ entities: [n] }, 1);
    expect(Math.abs(Math.abs(n.angle) - Math.PI)).toBeLessThan(0.02);
  });

  it("rounds a corner and leans into it", () => {
    const n = new Npc(2, 2, "officer", { angle: 0 });
    n.walk([[6, 2], [6, 8]]);
    let maxLean = 0;
    let nearest = Infinity;
    run({ entities: [n] }, 10, 1 / 60, () => {
      maxLean = Math.max(maxLean, Math.abs(n.lean));
      nearest = Math.min(nearest, Math.hypot(n.x - 6, n.y - 2));
    });
    expect(n.y).toBeCloseTo(8, 3);
    expect(maxLean).toBeGreaterThan(0.01);
    // It cut the corner rather than touching the waypoint.
    expect(nearest).toBeGreaterThan(0.05);
  });

  it("eases a gesture in from its start", () => {
    const n = new Npc(5, 5, "officer");
    n.pose("salute", 2);
    run({ entities: [n] }, 0.5);
    expect(n.gestureT).toBeCloseTo(0.5, 1);
    run({ entities: [n] }, 2);
    expect(n.gesture).toBe(null);
  });
});

describe("the station's people keep out of each other's way", () => {
  it("walks a shared route as a file, not a stack: each keeps their own lane", () => {
    const map = floor(30, 12);
    const squad = [];
    for (let i = 0; i < 6; i++) squad.push(new Npc(3 + (i % 3) * 0.7, 3 + Math.floor(i / 3) * 0.7, "officerKit"));
    const world = { entities: squad, map, player: null };
    setNpcWorld(world);
    // Everyone sets off at once down the same route.
    for (const o of squad) o.walk([[o.x, 6], [24, 6], [24, 10.5]], { leave: true, speed: 2.2 });
    let min = Infinity;
    run(world, 20, 1 / 60, () => (min = Math.min(min, closest(squad))));
    expect(squad.every((o) => !o.active)).toBe(true);
    // Never one on top of another.
    expect(min).toBeGreaterThan(PERSONAL * 0.55);
  });

  it("queues behind a slower walker going the same way instead of walking into them", () => {
    const map = floor(30, 8);
    const slow = new Npc(6, 4, "officer");
    const fast = new Npc(3, 4, "officer");
    fast.lane = slow.lane = 0;
    const world = { entities: [slow, fast], map, player: null };
    setNpcWorld(world);
    slow.walk([[26, 4]], { speed: 0.8 });
    fast.walk([[26, 4]], { speed: 2.2 });
    let min = Infinity;
    let waited = false;
    run(world, 4, 1 / 60, () => {
      min = Math.min(min, Math.hypot(slow.x - fast.x, slow.y - fast.y));
      if (fast.moveSpeed < 1.2) waited = true;
    });
    expect(waited).toBe(true);
    expect(fast.x).toBeLessThan(slow.x);
    expect(min).toBeGreaterThan(PERSONAL * 0.8);
  });

  it("files through a one-cell door one at a time", () => {
    // A wall across x = 10 with a single gap at y = 5.
    const walls = [];
    for (let y = 1; y < 11; y++) if (y !== 5) walls.push([10, y]);
    const map = floor(20, 12, walls);
    const squad = [0, 1, 2, 3].map((i) => new Npc(4 + (i % 2) * 0.6, 4.5 + Math.floor(i / 2) * 0.8, "officer"));
    const world = { entities: squad, map, player: null };
    setNpcWorld(world);
    for (const o of squad) o.walk([[8.5, 5.5], [10.5, 5.5], [16, 5.5]], { leave: true, speed: 2 });
    let min = Infinity;
    let inWall = false;
    run(world, 16, 1 / 60, () => {
      min = Math.min(min, closest(squad));
      for (const o of squad) if (o.active && map.grid[Math.floor(o.y)][Math.floor(o.x)] !== 0) inWall = true;
    });
    expect(squad.every((o) => !o.active)).toBe(true);
    expect(inWall).toBe(false);
    expect(min).toBeGreaterThan(PERSONAL * 0.5);
  });

  it("steps round someone standing in the way, and the player", () => {
    const map = floor(20, 10);
    const standing = new Npc(8, 5, "supervisor");
    const walker = new Npc(3, 5, "officer");
    walker.lane = 0;
    const player = { x: 13, y: 5 };
    const world = { entities: [standing, walker], map, player };
    setNpcWorld(world);
    walker.walk([[18, 5]], { leave: true });
    let minNpc = Infinity;
    let minPlayer = Infinity;
    run(world, 12, 1 / 60, () => {
      if (!walker.active) return;
      minNpc = Math.min(minNpc, Math.hypot(walker.x - standing.x, walker.y - standing.y));
      minPlayer = Math.min(minPlayer, Math.hypot(walker.x - player.x, walker.y - player.y));
    });
    expect(walker.active).toBe(false);
    expect(standing.x).toBe(8);
    expect(minNpc).toBeGreaterThan(PERSONAL * 0.8);
    expect(minPlayer).toBeGreaterThan(0.5);
  });

  it("does not deadlock two walkers meeting head-on", () => {
    const map = floor(20, 10);
    const a = new Npc(3, 5, "officer");
    const b = new Npc(16, 5, "officer");
    a.lane = b.lane = 0;
    const world = { entities: [a, b], map, player: null };
    setNpcWorld(world);
    a.walk([[17, 5]], { leave: true });
    b.walk([[2, 5]], { leave: true });
    run(world, 15);
    expect(a.active).toBe(false);
    expect(b.active).toBe(false);
  });
});

describe("the people's sprites", () => {
  const distinct = (poses, names) => new Set(names.map((n) => poses[n].body.markup)).size;

  it("walk on four frames, front and back, and ease into gestures", async () => {
    const { buildEnemyModel } = await import("../../src/rendering/svg-art/sprites/enemies.js");
    for (const kind of ["officer", "officerKit", "rasczakKit", "kaelKit", "supervisor", "supervisorKit", "staff", "clerk"]) {
      for (const real of [false, true]) {
        const m = buildEnemyModel(kind, real);
        const poses = m.variants[0].poses;
        expect(distinct(poses, ["idle", "stepA", "moveB", "stepB", "moveA"]), kind).toBe(5);
        expect(distinct(poses, ["backIdle", "backStepA", "backB", "backStepB", "backA"]), kind).toBe(5);
        expect(poses.saluteIn.body.markup).not.toBe(poses.salute.body.markup);
        expect(poses.pointIn.body.markup).not.toBe(poses.point.body.markup);
        // Layers stay modest: a handful of walk frames, not a pose per frame.
        expect(m.all.length, kind).toBeLessThan(2 * 17 * m.variants.length + 4);
      }
    }
  });

  it("gives the civilians two looks and their horror-beat poses", async () => {
    const { buildEnemyModel } = await import("../../src/rendering/svg-art/sprites/enemies.js");
    for (const kind of ["staff", "clerk"]) {
      const m = buildEnemyModel(kind);
      expect(m.variants.length).toBe(2);
      expect(m.variants[0].poses.idle.body.markup).not.toBe(m.variants[1].poses.idle.body.markup);
      for (const v of m.variants) {
        expect(distinct(v.poses, ["idle", "cower", "frozen", "slumped"])).toBe(4);
        // Not police: no cap, and an ID lanyard on the chest.
        expect(v.poses.idle.body.markup).toContain("#eef1f4");
      }
    }
  });
});
