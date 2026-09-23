/**
 * Chrono set pieces: the rooms you get through by bending time, the teach
 * rooms for each ally's power, and the seals that hold a teach room shut until
 * the lesson lands.
 *
 * Spec docs/superpowers/specs/2026-09-22-campaign-story-restructure-design.md
 * §4-§5 and §16.3. A level entry in acts.js names its piece (`setPiece`);
 * src/systems/chrono-hazards.js runs it. Every piece is authored in the
 * station map's own coordinates, before the level's rotation, and
 * `setPieceFor` turns it with the level, so the same numbers read against the
 * map dumps in station-maps.js. The maps themselves never change: a piece is
 * an overlay on one level entry, and another act playing the same map sees
 * none of it.
 *
 * Coordinates: `cells` are [col, row]; a `rect` is [c1, r1, c2, r2], cells
 * inclusive; points ({x, y}) are world units (a cell's centre is +0.5).
 *
 * Hazards (spec §5): collapse, blade, vent, gate (laser or turret), stasis,
 * loop. Each advances on the level clock, which runs at 0.15x while the
 * player shifts, the enemy convention.
 *
 * Teach rooms: `teach` = { power, card, seal, clear, spawn, goal, stopOnDone }.
 * The card's hint uses {SHIFT} {DASH} {REWIND} {LOCK}, filled in for the
 * device in use (src/ui/chrono-hud.js teachHint).
 */
import { MAPS } from "../levels/campaign.js";
import { ACT4_SET_PIECES } from "../levels/act4-maps.js";
import { rotatePoint, rotateCell } from "../levels/map-helpers.js";
import { ACT3_SET_PIECES } from "../levels/act3-maps.js";

/** Rift wall: the teach seals and the collapsed centre of the Evac Shafts. */
export const SEAL_TILE = 9;
/** What a collapse leaves behind. */
const RUBBLE = 3;

/** Every cell of a rect, row by row. */
function cellsOf([c1, r1, c2, r2]) {
  const out = [];
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) out.push([c, r]);
  return out;
}

/** A collapse that fills a shaft `c1..c2` one row at a time, from `from` to `to`. */
function rowSweep(c1, c2, from, to) {
  const steps = [];
  const dir = to < from ? -1 : 1;
  for (let r = from; r !== to + dir; r += dir) steps.push(cellsOf([c1, r, c2, r]));
  return steps;
}

/** A collapse that fills a run `r1..r2` one column at a time, from `from` to `to`. */
function colSweep(r1, r2, from, to) {
  const steps = [];
  const dir = to < from ? -1 : 1;
  for (let c = from; c !== to + dir; c += dir) steps.push(cellsOf([c, r1, c, r2]));
  return steps;
}

export const SET_PIECES = {
  // I-6 Reactor Access. The one set piece while the governor is on, and it is
  // optional: the north-west store room, three plasma vents on offset cycles
  // between its door and a gear cache. A shift makes the gaps readable.
  vent_gallery: {
    hazards: [
      { id: "vent_a", type: "vent", rect: [4, 9, 15, 9], period: 2.4, on: 1.4, phase: 0, damage: 10 },
      { id: "vent_b", type: "vent", rect: [4, 7, 15, 7], period: 2.4, on: 1.4, phase: 0.8, damage: 10 },
      { id: "vent_c", type: "vent", rect: [11, 5, 11, 6], period: 2.4, on: 1.4, phase: 1.6, damage: 10 },
    ],
    cache: { x: 14.5, y: 5.5 },
    enter: { rect: [4, 5, 15, 10], aria: "ventGallery" },
  },

  // II-1 Evac Shafts. Both shafts are still coming down behind you. A
  // sprinter who never shifts just makes it; a shift buys seconds. If the
  // rubble catches you it costs one hit, never your life, and sets you down
  // on the last landing you passed (the alcoves) with the front re-armed
  // behind you. Halfway, in the pump hall, the first hunters, and the
  // channel voice explaining the bell.
  evac_shafts: {
    hazards: [
      {
        // Up the west wall, rows 48 → 13.
        id: "shaft_a", type: "collapse", trigger: [6, 46, 9, 48],
        steps: rowSweep(3, 9, 48, 13), landings: [2, 11, 23],
        delay: 1, rate: 4.4, wall: RUBBLE, aria: "collapseChase",
      },
      {
        // East along the ceiling, then down the east wall to the lift.
        id: "shaft_b", type: "collapse", trigger: [37, 3, 39, 6],
        steps: [...colSweep(3, 8, 37, 46), ...colSweep(3, 6, 47, 50), ...rowSweep(47, 53, 7, 28)],
        landings: [1, 5, 25],
        delay: 1, rate: 4.4, wall: RUBBLE, aria: "collapseChase",
      },
    ],
    scripted: [
      {
        id: "first_hunt", rect: [12, 4, 28, 11], hunt: true,
        squad: { member: "lyra", text: "Every time you shift, you ring a bell he built. He just answered." },
      },
    ],
  },

  // II-2 Salvage Deck. Foresight's teach room: the receiving hall, sealed,
  // three phase stalkers blinking between its pillars. Two kills while
  // shifting open its doorways into the hangar.
  salvage_foresight: {
    teach: {
      power: "foresight",
      card: {
        title: "FORESIGHT — SEE WHERE THEY'RE GOING",
        hint: "LYRA: \"Everyone studies the fights. I study the gaps.\" {SHIFT} and every enemy shows where it will be. Two kills while shifting opens the hall.",
      },
      seal: [...cellsOf([22, 44, 24, 44]), ...cellsOf([35, 44, 37, 44])],
      clear: [16, 45, 43, 55],
      spawn: [
        { type: "phaseStalker", x: 22.5, y: 46.5 },
        { type: "phaseStalker", x: 37.5, y: 46.5 },
        { type: "phaseStalker", x: 29.5, y: 46.5 },
      ],
      goal: { kind: "shiftKills", count: 2 },
    },
  },

  // II-3 Maintenance Spine. Chrono Dash's teach: a fan gallery of three
  // rotors across the way in, too fast for a normal dash. Then the catwalk
  // comes down behind you (landings on its two platforms), and the piston
  // hall's three crushers slam in a wave: time them, or shift through.
  spine_fans: {
    hazards: [
      { id: "fan_w", type: "blade", x: 5.5, y: 45.5, radius: 1.6, arms: 2, speed: 7, phase: 0, width: 0.3, damage: 20, dashable: true },
      { id: "fan_c", type: "blade", x: 8.5, y: 45.5, radius: 1.6, arms: 2, speed: 7, phase: 1, width: 0.3, damage: 20, dashable: true },
      { id: "fan_e", type: "blade", x: 11.5, y: 45.5, radius: 1.6, arms: 2, speed: 7, phase: 2, width: 0.3, damage: 20, dashable: true },
      {
        id: "catwalk", type: "collapse", trigger: [14, 31, 16, 34],
        steps: colSweep(29, 36, 14, 41), landings: [0, 10, 19],
        delay: 1, rate: 4.4, wall: RUBBLE, aria: "collapseChase",
      },
      { id: "piston_a", type: "piston", rect: [45, 30, 46, 35], period: 2.6, on: 1.1, phase: 0, damage: 12 },
      { id: "piston_b", type: "piston", rect: [49, 30, 50, 35], period: 2.6, on: 1.1, phase: 0.85, damage: 12 },
      { id: "piston_c", type: "piston", rect: [53, 30, 54, 35], period: 2.6, on: 1.1, phase: 1.7, damage: 12 },
    ],
    teach: {
      power: "dash",
      card: {
        title: "CHRONO DASH — THROUGH THE FANS",
        hint: "ROOK: \"Quieter now. Cheaper too.\" {SHIFT}, then {DASH}: twice as far and nothing touches you. 20 chrono a dash.",
      },
      goal: { kind: "reach", rect: [3, 36, 13, 41] },
    },
  },

  // II-4 Transit Loop. Two trains still run the line across the middle on a
  // schedule nobody wrote, eastbound on the north track, westbound on the
  // south, and every way north crosses it. Nova is on the channel by the
  // junction, and by the far platform she's in.
  transit_crossings: {
    hazards: [
      {
        id: "train_east", type: "train", a: { x: 4, y: 29 }, b: { x: 56, y: 29 }, half: 1,
        speed: 15, length: 9, period: 6, phase: 0, damage: 20,
      },
      {
        id: "train_west", type: "train", a: { x: 56, y: 31 }, b: { x: 4, y: 31 }, half: 1,
        speed: 15, length: 9, period: 6, phase: 3, damage: 20,
      },
    ],
    scripted: [
      {
        id: "nova_junction", rect: [27, 32, 32, 38],
        squad: { member: "nova", text: "Two trains, six seconds apart. Go on the gap, not on the horn. Or don't. I'm already across.", joining: true },
      },
      {
        id: "nova_platform", rect: [35, 10, 48, 19],
        squad: { member: "nova", text: "Fine. I'll run with you. For now.", joining: true },
      },
    ],
  },

  // II-5 The Greenhouse. The west glasshouse, frozen at the instant of the
  // collapse: water hanging in the air. Story, not threat.
  greenhouse_stasis: {
    hazards: [{ id: "glasshouse", type: "stasis", rect: [3, 20, 15, 36], motes: 72 }],
    enter: { rect: [3, 20, 15, 36], aria: "stasisRoom" },
  },

  // II-6 The Precinct. Rewind's teach room: the locker room you clocked in
  // at, sealed, and an old precinct sentry whose burst you cannot dodge.
  // Take the hit, then un-take it; the echo you leave draws its next burst.
  // Then Kael's line: a turret stream straight down the lobby, which every
  // way east has to cross between its bursts.
  precinct_rewind: {
    hazards: [
      {
        id: "precinct_sentry", type: "gate", kind: "turret", x: 22.4, y: 39.4, aim: "player",
        interval: 3.2, burst: 4, gap: 0.09, speed: 24, damage: 7, range: 14,
      },
      {
        id: "lobby_stream", type: "gate", kind: "turret", x: 35.5, y: 49.4, angle: Math.PI / 2,
        interval: 2.6, burst: 6, gap: 0.1, speed: 18, damage: 9, range: 10,
      },
    ],
    teach: {
      power: "rewind",
      card: {
        title: "REWIND — GO BACK THREE SECONDS",
        hint: "NOVA: \"Take the hit. Then un-take it.\" Let the sentry land a burst, then press {REWIND}.",
      },
      seal: [[26, 41], [26, 42], ...cellsOf([19, 47, 21, 47])],
      goal: { kind: "rewind", damage: 20 },
    },
  },

  // II-7 The Foundry. Time-Lock's teach corridor: a sentry stream across it,
  // a line of fire you cannot cross. Five caught rounds open the seal into
  // the rack hall and shut the sentry down before the Hound.
  foundry_lock: {
    hazards: [
      {
        id: "foundry_sentry", type: "gate", kind: "turret", x: 26.5, y: 46.5, angle: 0,
        interval: 0.16, burst: 1, speed: 16, damage: 12, range: 12,
      },
    ],
    teach: {
      power: "timeLock",
      card: {
        title: "TIME-LOCK — FREEZE A WALL OF TIME",
        hint: "KAEL: \"Hold it with me.\" Face the sentry and press {LOCK}. Catch five rounds.",
      },
      seal: cellsOf([27, 43, 32, 43]),
      goal: { kind: "catches", count: 5 },
      stopOnDone: ["foundry_sentry"],
    },
  },

  // Act III, The Hunt: authored beside their maps in act3-maps.js.
  ...ACT3_SET_PIECES,
  // Act IV's pieces live with its maps, in their coordinates.
  ...ACT4_SET_PIECES,
};

// ── Rotation ─────────────────────────────────────────────────────────────────

const rotRect = (rect, w, h, d) => {
  const [a, b] = [rotateCell(rect[0], rect[1], w, h, d), rotateCell(rect[2], rect[3], w, h, d)];
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
};
const rotPt = (p, w, h, d) => {
  const [x, y] = rotatePoint(p.x, p.y, w, h, d);
  return { ...p, x, y };
};
const rotCells = (cells, w, h, d) => cells.map(([c, r]) => rotateCell(c, r, w, h, d));

function rotateHazard(hz, w, h, d) {
  const out = { ...hz };
  const rad = (d * Math.PI) / 180;
  if (hz.rect) out.rect = rotRect(hz.rect, w, h, d);
  if (hz.trigger) out.trigger = rotRect(hz.trigger, w, h, d);
  if (hz.steps) out.steps = hz.steps.map((s) => rotCells(s, w, h, d));
  if (hz.cells) out.cells = rotCells(hz.cells, w, h, d);
  if (hz.release) out.release = rotRect(hz.release, w, h, d);
  if (hz.figures) out.figures = hz.figures.map((f) => ({ ...rotPt(f, w, h, d), facing: (f.facing ?? 0) + rad }));
  if (hz.x != null) Object.assign(out, rotPt({ x: hz.x, y: hz.y }, w, h, d));
  for (const k of ["a", "b", "seamA", "seamB", "out", "back"]) if (hz[k]) out[k] = rotPt(hz[k], w, h, d);
  if (hz.angle != null) out.angle = hz.angle + rad;
  if (hz.type === "blade") out.phase = (hz.phase ?? 0) + rad;
  return out;
}

/**
 * A set piece turned with its level. The same function the level uses, so
 * every coordinate lands where the map's own tiles went.
 */
export function rotateSetPiece(piece, w, h, deg) {
  const d = ((deg % 360) + 360) % 360;
  if (!d) return piece;
  const out = { ...piece };
  if (piece.hazards) out.hazards = piece.hazards.map((hz) => rotateHazard(hz, w, h, d));
  if (piece.seals) out.seals = rotCells(piece.seals, w, h, d);
  if (piece.open) out.open = rotCells(piece.open, w, h, d);
  if (piece.cache) out.cache = rotPt(piece.cache, w, h, d);
  if (piece.enter) out.enter = { ...piece.enter, rect: rotRect(piece.enter.rect, w, h, d) };
  if (piece.scripted) out.scripted = piece.scripted.map((s) => ({ ...s, rect: rotRect(s.rect, w, h, d) }));
  if (piece.objective) {
    const o = piece.objective;
    out.objective = {
      ...o,
      stations: o.stations.map((s) => ({
        ...s,
        rect: rotRect(s.rect, w, h, d),
        ...(s.burn ? { burn: rotCells(s.burn, w, h, d) } : {}),
      })),
      ...(o.seal ? { seal: rotCells(o.seal, w, h, d) } : {}),
      ...(o.heatClock?.trigger ? { heatClock: { ...o.heatClock, trigger: rotRect(o.heatClock.trigger, w, h, d) } } : {}),
    };
  }
  if (piece.teach) {
    const t = piece.teach;
    out.teach = {
      ...t,
      ...(t.seal ? { seal: rotCells(t.seal, w, h, d) } : {}),
      ...(t.clear ? { clear: rotRect(t.clear, w, h, d) } : {}),
      ...(t.spawn ? { spawn: t.spawn.map((s) => rotPt(s, w, h, d)) } : {}),
      goal: t.goal.rect ? { ...t.goal, rect: rotRect(t.goal.rect, w, h, d) } : t.goal,
    };
  }
  return out;
}

/** The level entry's set piece, in the coordinates of the level as played. */
export function setPieceFor(entry) {
  const piece = entry?.setPiece && SET_PIECES[entry.setPiece];
  const base = piece && MAPS[entry.map];
  if (!base) return null;
  return rotateSetPiece(piece, base.width, base.height, entry.rotation || 0);
}
