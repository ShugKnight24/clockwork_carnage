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
import { rotatePoint, rotateCell } from "../levels/map-helpers.js";

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

  // II-1 Evac Shafts. The centre lift has come down; the side shafts are
  // still collapsing behind you, and only a shift outruns them. Halfway, the
  // first hunters, and the channel voice explaining the bell.
  evac_shafts: {
    seals: cellsOf([22, 42, 37, 42]),
    hazards: [
      {
        id: "shaft_west", type: "collapse", trigger: [4, 40, 12, 42],
        steps: rowSweep(4, 12, 43, 21), delay: 0.4, rate: 7, damage: 8, wall: RUBBLE,
      },
      {
        id: "shaft_east", type: "collapse", trigger: [47, 40, 55, 42],
        steps: rowSweep(47, 55, 43, 21), delay: 0.4, rate: 7, damage: 8, wall: RUBBLE,
      },
    ],
    scripted: [
      {
        id: "first_hunt", rect: [5, 13, 54, 19], hunt: true,
        squad: { member: "lyra", text: "Every time you shift, you ring a bell he built. He just answered." },
      },
    ],
  },

  // II-2 Salvage Deck. Foresight's teach room: the first hall, sealed, three
  // phase stalkers blinking between its pillars. Two kills while shifting.
  salvage_foresight: {
    teach: {
      power: "foresight",
      card: {
        title: "FORESIGHT — SEE WHERE THEY'RE GOING",
        hint: "LYRA: \"Everyone studies the fights. I study the gaps.\" {SHIFT} and every enemy shows where it will be. Two kills while shifting opens the hall.",
      },
      seal: [...cellsOf([13, 43, 16, 43]), ...cellsOf([27, 43, 32, 43]), ...cellsOf([43, 43, 46, 43])],
      clear: [13, 44, 46, 52],
      spawn: [
        { type: "phaseStalker", x: 20.5, y: 46.5 },
        { type: "phaseStalker", x: 38.5, y: 46.5 },
        { type: "phaseStalker", x: 29.5, y: 45.5 },
      ],
      goal: { kind: "shiftKills", count: 2 },
    },
  },

  // II-3 Maintenance Spine. Chrono Dash's teach corridor: a fan gallery of
  // three rotors across the start room's mouth, too fast for a normal dash.
  // Then the central catwalk collapses under you.
  spine_fans: {
    hazards: [
      { id: "fan_w", type: "blade", x: 27, y: 53, radius: 1.6, arms: 2, speed: 7, phase: 0, width: 0.3, damage: 20, dashable: true },
      { id: "fan_c", type: "blade", x: 30, y: 53, radius: 1.6, arms: 2, speed: 7, phase: 1, width: 0.3, damage: 20, dashable: true },
      { id: "fan_e", type: "blade", x: 33, y: 53, radius: 1.6, arms: 2, speed: 7, phase: 2, width: 0.3, damage: 20, dashable: true },
      {
        id: "catwalk", type: "collapse", trigger: [27, 41, 32, 43],
        steps: rowSweep(27, 32, 43, 34), delay: 0.5, rate: 6, damage: 8, wall: RUBBLE,
      },
    ],
    // The catwalk's door is already blown.
    open: [[29, 38]],
    teach: {
      power: "dash",
      card: {
        title: "CHRONO DASH — THROUGH THE FANS",
        hint: "ROOK: \"Quieter now. Cheaper too.\" {SHIFT}, then {DASH}: twice as far and nothing touches you. 20 chrono a dash.",
      },
      goal: { kind: "reach", rect: [15, 44, 44, 49] },
    },
  },

  // II-4 Transit Loop. Trains still cross both side shafts on a schedule
  // nobody wrote. A placeholder for the junction set piece.
  transit_crossings: {
    hazards: [
      { id: "train_w", type: "gate", kind: "laser", a: { x: 7, y: 30.5 }, b: { x: 14, y: 30.5 }, period: 4, on: 1.6, phase: 0, damage: 15 },
      { id: "train_e", type: "gate", kind: "laser", a: { x: 46, y: 30.5 }, b: { x: 53, y: 30.5 }, period: 4, on: 1.6, phase: 2, damage: 15 },
    ],
  },

  // II-5 The Greenhouse. The west glasshouse, frozen at the instant of the
  // collapse: water hanging in the air. Story, not threat.
  greenhouse_stasis: {
    hazards: [{ id: "glasshouse", type: "stasis", rect: [4, 23, 19, 28], motes: 48 }],
    enter: { rect: [4, 23, 19, 28], aria: "stasisRoom" },
  },

  // II-6 The Precinct. Rewind's teach room: the start room is sealed and an
  // old precinct sentry fires a burst you cannot dodge. Take the hit, then
  // un-take it; the echo you leave draws its next burst.
  precinct_rewind: {
    hazards: [
      {
        id: "precinct_sentry", type: "gate", kind: "turret", x: 39.4, y: 53.4, aim: "player",
        interval: 3.2, burst: 4, gap: 0.09, speed: 24, damage: 7, range: 14,
      },
    ],
    teach: {
      power: "rewind",
      card: {
        title: "REWIND — GO BACK THREE SECONDS",
        hint: "NOVA: \"Take the hit. Then un-take it.\" Let the sentry land a burst, then press {REWIND}.",
      },
      seal: cellsOf([20, 52, 39, 52]),
      goal: { kind: "rewind", damage: 20 },
    },
  },

  // II-7 The Foundry. Time-Lock's teach corridor: a sentry stream across the
  // start room's mouth, a line of fire you cannot cross. Five caught rounds
  // open the seal and shut the sentry down before the Hound.
  foundry_lock: {
    hazards: [
      {
        id: "foundry_sentry", type: "gate", kind: "turret", x: 26.3, y: 54.5, angle: 0,
        interval: 0.16, burst: 1, speed: 16, damage: 12, range: 12,
      },
    ],
    teach: {
      power: "timeLock",
      card: {
        title: "TIME-LOCK — FREEZE A WALL OF TIME",
        hint: "KAEL: \"Hold it with me.\" Face the sentry and press {LOCK}. Catch five rounds.",
      },
      seal: cellsOf([26, 53, 33, 53]),
      goal: { kind: "catches", count: 5 },
      stopOnDone: ["foundry_sentry"],
    },
  },

  // IV-2 The Loop, on the Server Farm until its own map exists: the central
  // catwalk repeats. Crossing its seam while shifting breaks it.
  the_loop: {
    open: [[29, 38]],
    hazards: [
      {
        id: "catwalk_loop", type: "loop", rect: [27, 34, 32, 43],
        seamA: { x: 27, y: 34 }, seamB: { x: 33, y: 34 }, out: { x: 30, y: 33 },
        back: { x: 30, y: 43.2 },
      },
    ],
  },
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
