// ═══════════════════════════════════════════════════════════════════
// ACT III — THE HUNT: seven maps
// The station, rewritten. Five remixes of Act I's places (the Rewritten
// Wing, Server Farm Siege, Reactor Overload, the Lord's Laboratory, the
// Paradox Core's second visit) and two places nobody has seen: the Archive
// of Rewinds and the Chronos Engine. Spec docs/superpowers/specs/
// 2026-09-22-campaign-story-restructure-design.md §7, Act III.
//
// A remix starts from a copy of the station map it changes, so the player
// walks into a place they know and finds it moved. Every map keeps the
// 60x60 skeleton, a heightMap and the tile legend of campaign.js.
//
// Each map's set piece sits beside it (ACT3_SET_PIECES, spread into
// SET_PIECES by src/data/campaign/set-pieces.js), authored in the map's own
// coordinates before the level's rotation.
// ═══════════════════════════════════════════════════════════════════
import { STATION_MAPS } from "./station-maps.js";
import {
  createGrid,
  createHeights,
  carve,
  hWall,
  vWall,
  tile,
  door,
  room,
  lowWall,
  lowTile,
  LAYER,
} from "./map-helpers.js";

/** Tiles by name, for the rewritten parts. */
const T = { STONE: 1, TECH: 2, METAL: 3, ENERGY: 4, SECRET: 6, BOSS: 7, GLASS: 8, RIFT: 9 };

/**
 * A station map to remix: a deep copy, so the station map itself never
 * moves, with a heightMap even where the station map had none.
 */
function remix(id) {
  const m = structuredClone(STATION_MAPS[id]);
  m.heightMap ??= createHeights(m.width, m.height);
  return m;
}

/** Every cell of a rect [c1, r1, c2, r2], row by row. */
function cellsOf([c1, r1, c2, r2]) {
  const out = [];
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) out.push([c, r]);
  return out;
}

/** Floor, with the height reset so a cell carved out of low cover is not low. */
function floor(g, hm, r1, c1, r2, c2) {
  carve(g, r1, c1, r2, c2, 0);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) hm[r][c] = LAYER.FULL;
}

/** A full-height wall block. */
function block(g, hm, r1, c1, r2, c2, v) {
  carve(g, r1, c1, r2, c2, v);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) hm[r][c] = LAYER.FULL;
}

const enemy = (x, y, enemyType) => ({ x, y, type: "enemy", enemyType });
const pickup = (x, y, type, extra = {}) => ({ x, y, type, ...extra });

export const ACT3_SET_PIECES = {};

// ── III-1: THE REWRITTEN WING ────────────────────────────────────
// The Security Checkpoint and the Research Wing, stitched into one wing by
// architecture nobody built. You come in through the checkpoint's lobby and
// leave through the lab where the exit used to be. Twice the way north is a
// gate of three rewritten walls (rift, tile 9) that close and open on his
// clock, staggered so one is always open; in the open lab two more walls
// re-arrange the cover. A shift makes the rhythm readable.
// The squad's first operation: Lyra leads.
// ──────────────────────────────────────────────────────────────────
function buildRewrittenWing() {
  const W = 60,
    H = 60;
  const research = STATION_MAPS.research;
  const checkpoint = STATION_MAPS.checkpoint;
  const g = createGrid(W, H, T.TECH);
  const hm = createHeights(W, H);
  // Research rows 4-30 become rows 1-27; checkpoint rows 26-56 become 28-58.
  const RS = -3;
  const CP = 2;
  const copyRows = (src, from, to, off) => {
    for (let r = from; r <= to; r++) {
      g[r + off] = [...src.grid[r]];
      hm[r + off] = [...(src.heightMap?.[r] ?? Array(W).fill(LAYER.FULL))];
    }
  };
  copyRows(research, 4, 30, RS);
  copyRows(checkpoint, 26, 56, CP);

  const inRows = (from, to) => (o) => o.y >= from && o.y < to + 1;
  const shift = (off) => (o) => ({ ...o, y: o.y + off });
  const entities = [
    ...research.entities.filter(inRows(4, 30)).map(shift(RS)),
    ...checkpoint.entities.filter(inRows(26, 56)).map(shift(CP)),
  ].filter((e) => e.type !== "enemy");
  const props = [
    ...research.props.filter(inRows(4, 30)).map(shift(RS)),
    ...checkpoint.props.filter(inRows(26, 56)).map(shift(CP)),
  ];

  // ── The seam: the checkpoint's side corridors ran into a blank wall;
  // now they break through into the research corridor (row 27). ──
  floor(g, hm, 28, 13, 28, 15);
  floor(g, hm, 28, 44, 28, 46);
  // The central door is gone: the lane runs straight up.
  floor(g, hm, 28, 29, 28, 30);

  // ── Rewritten architecture: rift fins that nobody built, standing in
  // the lobby, the desk hall and the corridor. ──
  for (const [r, c] of [[54, 24], [54, 35], [48, 17], [48, 42], [26, 20], [26, 39]]) {
    block(g, hm, r, c, r, c, T.RIFT);
  }
  // A rift seam down the old checkpoint's lane, with a gap either side.
  block(g, hm, 33, 29, 35, 30, T.RIFT);
  // The north labs were dead ends; the rewrite ran passages from both into
  // the exit lab, north of its glass, so every way through gate two leads out.
  floor(g, hm, 3, 18, 4, 21);
  floor(g, hm, 3, 38, 4, 41);

  // ── Holding cells: the west block gets a hidden locker. ──
  floor(g, hm, 37, 1, 39, 2);
  g[38][3] = T.SECRET;

  // ── The open lab (rows 13-18): benches rewritten into low cover. ──
  lowWall(g, hm, 17, 8, 17, 11, LAYER.WAIST, T.TECH);
  lowWall(g, hm, 17, 48, 17, 51, LAYER.WAIST, T.TECH);
  lowWall(g, hm, 14, 22, 14, 24, LAYER.WAIST, T.METAL);
  lowWall(g, hm, 14, 35, 14, 37, LAYER.WAIST, T.METAL);

  entities.push(
    // Lobby: nothing. The squad's first breath.
    // Desk hall (rows 46-53)
    enemy(18.5, 45.5, "corruptCop"),
    enemy(34.5, 45.5, "corruptCop"),
    enemy(43.5, 48.5, "henchman"),
    // Lane hall (rows 40-45)
    enemy(26.5, 42.5, "henchman"),
    enemy(33.5, 42.5, "phaseStalker"),
    // Holding cells
    enemy(7.5, 31.5, "phaseStalker"),
    enemy(51.5, 43.5, "phaseStalker"),
    enemy(7.5, 39.5, "corruptCop"),
    // The research corridor, past the first gate
    enemy(20.5, 27.5, "corruptCop"),
    enemy(40.5, 27.5, "henchman"),
    // Offices either side of the lane
    enemy(11.5, 22.5, "henchman"),
    enemy(47.5, 22.5, "henchman"),
    // The open lab, where the walls re-arrange
    enemy(14.5, 15.5, "phaseStalker"),
    enemy(29.5, 16.5, "corruptCop"),
    enemy(44.5, 15.5, "phaseStalker"),
    // North labs
    enemy(10.5, 6.5, "henchman"),
    enemy(48.5, 9.5, "phaseStalker"),
    // The exit lab: the Shield Commander holds the last room.
    enemy(29.5, 5.5, "shieldCommander"),
    enemy(25.5, 8.5, "corruptCop"),
    enemy(34.5, 8.5, "corruptCop"),
    // Pickups
    pickup(1.5, 38.5, "health"),
    pickup(29.5, 31.5, "ammo"),
    pickup(17.5, 27.5, "health"),
    pickup(42.5, 16.5, "ammo"),
  );

  return {
    name: "The Rewritten Wing",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 56.5, dir: -Math.PI / 2 },
    entities,
    exit: { x: 29.5, y: 2.5 },
    secrets: [
      ...research.secrets.map((s) => ({ ...s, wallY: s.wallY + RS })),
      {
        wallX: 3,
        wallY: 38,
        description: "A locker from the old checkpoint, still stocked. The Lord rewrote the walls and missed the lock.",
      },
    ],
    props,
  };
}

ACT3_SET_PIECES.rewritten_walls = {
  hazards: [
    // Gate one, where the checkpoint meets the research corridor: three
    // ways north, closed seven seconds in twelve, staggered four apart, so
    // at every instant at least one is open.
    { id: "gate1_w", type: "rewrite", cells: cellsOf([13, 28, 15, 28]), period: 12, on: 7, phase: 0, warn: 1.2, aria: "rewriteWalls" },
    { id: "gate1_c", type: "rewrite", cells: cellsOf([29, 28, 30, 28]), period: 12, on: 7, phase: 4, warn: 1.2 },
    { id: "gate1_e", type: "rewrite", cells: cellsOf([44, 28, 46, 28]), period: 12, on: 7, phase: 8, warn: 1.2 },
    // Gate two, the lab's three ways into the north labs.
    { id: "gate2_w", type: "rewrite", cells: cellsOf([9, 12, 11, 12]), period: 12, on: 7, phase: 2, warn: 1.2 },
    { id: "gate2_c", type: "rewrite", cells: cellsOf([28, 12, 31, 12]), period: 12, on: 7, phase: 6, warn: 1.2 },
    { id: "gate2_e", type: "rewrite", cells: cellsOf([47, 12, 49, 12]), period: 12, on: 7, phase: 10, warn: 1.2 },
    // In the open lab, fins that come and go: the cover re-arranges.
    { id: "lab_w", type: "rewrite", cells: cellsOf([18, 13, 18, 16]), period: 9, on: 4.5, phase: 0, warn: 1 },
    { id: "lab_e", type: "rewrite", cells: cellsOf([41, 13, 41, 16]), period: 9, on: 4.5, phase: 4.5, warn: 1 },
  ],
  scripted: [
    { id: "lyra_brief", rect: [22, 50, 37, 57], squad: { member: "lyra", text: "Same corridors, re-drawn. The walls keep his clock now, so we keep ours. Watch them before you trust them." } },
    { id: "kael_gate", rect: [12, 30, 47, 32], squad: { member: "kael", text: "Walls are moving. Shift, read the gaps, then go. Nobody runs into a closing door." } },
    { id: "nova_lab", rect: [5, 13, 54, 18], squad: { member: "nova", text: "It's the Research Wing. Mostly. Somebody moved the furniture into the fourth dimension." } },
    { id: "lyra_debrief", rect: [22, 2, 37, 4], squad: { member: "lyra", text: "First operation, done. Everyone's still on comms. Write that down, somebody." } },
  ],
};

// ── III-2: SERVER FARM SIEGE ─────────────────────────────────────
// The Server Farm, turned into a siege. "Every rack we burn, he loses a
// century of stolen timelines." Four rack banks: the two side rack rooms,
// the core room and the north-west store. Lanes are cut from the side rooms
// to the spine so the squad can hold them, the north hall becomes server
// aisles, and the door to the exit room stays sealed until the last bank
// burns. Rook leads.
// ──────────────────────────────────────────────────────────────────
const RACKS = {
  west: [[6, 36], [8, 36], [10, 36], [12, 36], [14, 36], [6, 38], [14, 38], [6, 40], [14, 40]],
  east: [[45, 36], [47, 36], [49, 36], [51, 36], [53, 36], [45, 38], [53, 38], [45, 40], [53, 40]],
  core: [[24, 23], [35, 23], [24, 28], [35, 28]],
  store: [[6, 6], [13, 6], [6, 9], [13, 9], [11, 14], [11, 15], [11, 16], [11, 17], [11, 18], [15, 14], [15, 15], [15, 16], [15, 17], [15, 18]],
};

function buildServerSiege() {
  const m = remix("server_farm");
  const g = m.grid;
  const hm = m.heightMap;

  // ── Lanes: each side rack room gets a two-wide lane to the spine. ──
  floor(g, hm, 38, 16, 39, 26);
  floor(g, hm, 38, 33, 39, 43);
  // Barricades the squad would hold, halfway down each lane.
  lowWall(g, hm, 38, 21, 38, 21, LAYER.WAIST, T.METAL);
  lowWall(g, hm, 39, 38, 39, 38, LAYER.WAIST, T.METAL);

  // ── The north hall becomes server aisles: rack rows, north to south. ──
  for (const c of [11, 15, 19, 40, 44, 48]) block(g, hm, 14, c, 18, c, T.TECH);
  // Cold-aisle cabinets across the plaza, waist high.
  lowWall(g, hm, 16, 25, 16, 27, LAYER.WAIST, T.TECH);
  lowWall(g, hm, 16, 32, 16, 34, LAYER.WAIST, T.TECH);

  // ── The exit room's door is a plain opening now, so it can be sealed. ──
  floor(g, hm, 12, 29, 12, 30);

  // ── The core room: the old spine pillars go, a cable trench runs across. ──
  lowWall(g, hm, 26, 26, 26, 27, LAYER.KNEE, T.METAL);
  lowWall(g, hm, 26, 32, 26, 33, LAYER.KNEE, T.METAL);

  m.name = "Server Farm Siege";
  m.entities = [
    // Start hall: a picket at the far end.
    enemy(21.5, 45.5, "corruptCop"),
    enemy(38.5, 45.5, "corruptCop"),
    enemy(29.5, 47.5, "chronoBomber"),
    // The spine
    enemy(29.5, 38.5, "henchman"),
    // West rack room
    enemy(9.5, 37.5, "timeWarden"),
    enemy(12.5, 41.5, "temporalEngineer"),
    enemy(7.5, 42.5, "corruptCop"),
    // East rack room
    enemy(50.5, 37.5, "timeWarden"),
    enemy(47.5, 41.5, "temporalEngineer"),
    enemy(52.5, 42.5, "chronoBomber"),
    // Cross hall
    enemy(20.5, 32.5, "henchman"),
    enemy(39.5, 32.5, "henchman"),
    // Core room
    enemy(29.5, 22.5, "timeWarden"),
    enemy(25.5, 25.5, "temporalEngineer"),
    enemy(34.5, 29.5, "temporalEngineer"),
    // North aisles
    enemy(13.5, 16.5, "corruptCop"),
    enemy(46.5, 16.5, "corruptCop"),
    enemy(29.5, 14.5, "chronoBomber"),
    // North-west store (the fourth bank)
    enemy(9.5, 6.5, "timeWarden"),
    enemy(12.5, 9.5, "temporalEngineer"),
    // Exit room
    enemy(24.5, 7.5, "henchman"),
    enemy(35.5, 7.5, "henchman"),
    // Pickups
    pickup(20.5, 48.5, "health"),
    pickup(39.5, 48.5, "ammo"),
    pickup(9.5, 39.5, "ammo"),
    pickup(49.5, 39.5, "health"),
    pickup(29.5, 25.5, "health"),
    pickup(22.5, 38.5, "ammo"),
    pickup(37.5, 39.5, "ammo"),
    pickup(17.5, 13.5, "health"),
    pickup(9.5, 8.5, "ammo"),
    pickup(50.5, 7.5, "weapon", { weaponId: 4 }),
    pickup(29.5, 7.5, "health"),
    // Secret supplies (the station's own secrets stay)
    pickup(1.5, 27.5, "health"),
    pickup(57.5, 27.5, "ammo"),
  ];
  m.props = [
    ...m.props,
    { x: 22, y: 14, type: "monitor_bank" },
    { x: 37, y: 14, type: "monitor_bank" },
    { x: 17, y: 38, type: "barrier" },
    { x: 42, y: 39, type: "barrier" },
    { x: 8, y: 7, type: "crate" },
  ];
  return m;
}

ACT3_SET_PIECES.rack_burn = {
  objective: {
    kind: "charges",
    card: {
      title: "BURN THE RACKS",
      hint: "ROOK: \"Stand at a bank and hold still. I'll do the rest.\" Racks burned {DONE}/{COUNT}. The north door opens on the last.",
    },
    color: "#ff7a3a",
    hold: 1.6,
    stations: [
      { id: "west", rect: [9, 38, 11, 40], burn: RACKS.west, line: { member: "nova", text: "West racks burning. How much is a century worth, anyway?" } },
      { id: "east", rect: [48, 38, 50, 40], burn: RACKS.east, line: { member: "kael", text: "East lane's holding. Burn and move." } },
      { id: "core", rect: [28, 24, 31, 26], burn: RACKS.core, line: { member: "rook", text: "Core bank's slag. He'll feel that one in his teeth." } },
      { id: "store", rect: [8, 7, 11, 8], burn: RACKS.store, line: { member: "lyra", text: "His foresight's thinning. You can hear it in the static." } },
    ],
    seal: cellsOf([29, 12, 30, 12]),
    doneLine: { member: "rook", text: "That's all four. North door's open. Systems nominal. Mostly." },
  },
  scripted: [
    { id: "rook_brief", rect: [25, 49, 34, 52], squad: { member: "rook", text: "Four rack banks. The charges are keyed to your suit. Get to a bank, hold still, and I'll light it." } },
    { id: "nova_debrief", rect: [22, 4, 37, 6], squad: { member: "nova", text: "Bankrupt. Told you. Somebody check if he's crying." } },
  ],
};

// ── III-3: REACTOR OVERLOAD ──────────────────────────────────────
// Reactor Access, running hot. "If it blows, this sector loops. Same
// explosion. Every day. Forever." Three coolant valves in order: the core's
// inner chamber, then the back of the Vent Gallery (Act I's optional room,
// now the only way to the second valve), then a coolant gallery in the
// north-east store. The heat clock runs on the level clock, so a shift
// stretches the window. Kael takes the blast doors to the exit room and
// holds them until the last valve turns.
// ──────────────────────────────────────────────────────────────────
function buildReactorOverload() {
  const m = remix("reactor");
  const g = m.grid;
  const hm = m.heightMap;

  // ── The blast doors: a plain opening, sealed by the objective. ──
  floor(g, hm, 12, 29, 12, 30);

  // ── The core room runs hot: energy conduits at knee height, and the
  // coolant lines along the north hall become cover. ──
  lowWall(g, hm, 24, 24, 24, 25, LAYER.KNEE, T.ENERGY);
  lowWall(g, hm, 24, 34, 24, 35, LAYER.KNEE, T.ENERGY);
  lowWall(g, hm, 39, 24, 39, 25, LAYER.KNEE, T.ENERGY);
  lowWall(g, hm, 39, 34, 39, 35, LAYER.KNEE, T.ENERGY);
  lowWall(g, hm, 15, 14, 15, 18, LAYER.WAIST, T.METAL);
  lowWall(g, hm, 15, 41, 15, 45, LAYER.WAIST, T.METAL);
  lowWall(g, hm, 18, 24, 18, 26, LAYER.WAIST, T.METAL);
  lowWall(g, hm, 18, 33, 18, 35, LAYER.WAIST, T.METAL);

  // ── The north-east store becomes a coolant gallery: its pillars go, so
  // the vents have nothing to hide behind. ──
  floor(g, hm, 7, 46, 7, 46);
  floor(g, hm, 7, 53, 7, 53);

  m.name = "Reactor Overload";
  m.entities = [
    // South hall: chrono-bombers seeding the approach.
    enemy(13.5, 47.5, "chronoBomber"),
    enemy(46.5, 47.5, "chronoBomber"),
    enemy(29.5, 45.5, "henchman"),
    // Side wings: beasts, which run faster when you shift.
    enemy(8.5, 28.5, "beast"),
    enemy(51.5, 28.5, "beast"),
    enemy(8.5, 38.5, "henchman"),
    enemy(51.5, 38.5, "henchman"),
    // The core ring
    enemy(25.5, 40.5, "chronoBomber"),
    enemy(34.5, 40.5, "chronoBomber"),
    enemy(25.5, 22.5, "beast"),
    // North hall: the Temporal Summoner holds the junction to both stores.
    enemy(29.5, 16.5, "temporalSummoner"),
    enemy(10.5, 16.5, "henchman"),
    enemy(49.5, 16.5, "henchman"),
    // North-east coolant gallery
    enemy(52.5, 9.5, "beast"),
    // Behind the blast doors
    enemy(22.5, 8.5, "henchman"),
    enemy(37.5, 8.5, "henchman"),
    enemy(29.5, 6.5, "chronoBomber"),
    // Pickups
    pickup(8.5, 48.5, "ammo"),
    pickup(50.5, 48.5, "health"),
    pickup(29.5, 32.5, "health"),
    pickup(5.5, 16.5, "health"),
    pickup(54.5, 16.5, "ammo"),
    pickup(29.5, 20.5, "ammo"),
    pickup(52.5, 7.5, "health"),
    pickup(29.5, 7.5, "weapon", { weaponId: 3 }),
    pickup(1.5, 27.5, "ammo"),
    pickup(57.5, 27.5, "health"),
  ];
  return m;
}

ACT3_SET_PIECES.coolant_valves = {
  hazards: [
    // The Vent Gallery, as in Act I, but now the second valve is behind it.
    { id: "vent_a", type: "vent", rect: [4, 9, 15, 9], period: 2.4, on: 1.4, phase: 0, damage: 10 },
    { id: "vent_b", type: "vent", rect: [4, 7, 15, 7], period: 2.4, on: 1.4, phase: 0.8, damage: 10 },
    { id: "vent_c", type: "vent", rect: [11, 5, 11, 6], period: 2.4, on: 1.4, phase: 1.6, damage: 10 },
    // The coolant gallery: quicker, colder, in the other order.
    { id: "coolant_a", type: "vent", rect: [44, 8, 55, 8], period: 2.0, on: 1.1, phase: 1.0, damage: 10 },
    { id: "coolant_b", type: "vent", rect: [44, 6, 55, 6], period: 2.0, on: 1.1, phase: 0.3, damage: 10 },
    { id: "coolant_c", type: "vent", rect: [48, 9, 48, 10], period: 2.0, on: 1.1, phase: 1.6, damage: 10 },
  ],
  objective: {
    kind: "valves",
    card: {
      title: "COOLANT VALVES — BEAT THE HEAT",
      hint: "KAEL: \"Turn them in order. I hold the doors.\" Valves {DONE}/{COUNT}. Core heat {HEAT}%. {SHIFT} and the heat crawls.",
    },
    color: "#ff6a1e",
    hold: 1.2,
    order: true,
    heatClock: {
      trigger: [22, 21, 37, 42],
      rate: 2.4,
      drop: 40,
      max: 100,
      reset: 55,
      damage: 20,
      warnAt: 75,
      aria: "reactorHeat",
      warnAria: "reactorHeatHigh",
      overloadAria: "reactorOverload",
    },
    stations: [
      { id: "core", rect: [28, 31, 31, 33], line: { member: "rook", text: "Valve one. Heat's dropping. Don't get comfortable." } },
      { id: "gallery", rect: [13, 5, 15, 6], line: { member: "nova", text: "Two! Those vents nearly had me, and I wasn't even in there." } },
      { id: "coolant", rect: [44, 5, 46, 5], line: { member: "lyra", text: "Three. The core's holding. For now." } },
    ],
    seal: cellsOf([29, 12, 30, 12]),
    doneLine: { member: "kael", text: "Doors are yours. I'll be right here." },
  },
  scripted: [
    { id: "kael_brief", rect: [25, 49, 34, 52], squad: { member: "kael", text: "I've got the blast doors. You turn the valves. I don't move till you're done." } },
    { id: "kael_debrief", rect: [21, 4, 38, 6], squad: { member: "kael", text: "It didn't blow. Nothing loops today. Moving." } },
  ],
};

// ── III-4: THE LORD'S LABORATORY ─────────────────────────────────
// Voss' Laboratory, walked backwards: in through the door you left by in
// Act I, out through the room at its heart. Every wall is rewind logs, the
// same eleven seconds, thousands of takes. The north room is the theatre
// where one take survives, and it plays there in stasis: a single figure
// walking into the Core alone. Lyra reads it first. The mid-act turn.
// ──────────────────────────────────────────────────────────────────
function buildLordsLab() {
  const m = remix("voss_lab");
  const g = m.grid;
  const hm = m.heightMap;

  // ── The theatre: the north room loses its console pillar, so the take
  // plays in the open, and gains a ring of rewind terminals. ──
  floor(g, hm, 5, 29, 5, 30);
  lowWall(g, hm, 9, 23, 9, 26, LAYER.WAIST, T.TECH);
  lowWall(g, hm, 9, 33, 9, 36, LAYER.WAIST, T.TECH);

  // ── The north hall: rewind logs in racks, waist high, the hall's cover. ──
  lowWall(g, hm, 14, 8, 14, 14, LAYER.WAIST, T.TECH);
  lowWall(g, hm, 14, 45, 14, 51, LAYER.WAIST, T.TECH);
  lowWall(g, hm, 15, 22, 15, 26, LAYER.WAIST, T.TECH);
  lowWall(g, hm, 15, 33, 15, 37, LAYER.WAIST, T.TECH);
  // Rift seams where takes tore through the hall.
  block(g, hm, 12, 20, 13, 20, T.RIFT);
  block(g, hm, 12, 39, 13, 39, T.RIFT);

  // ── The central lab: its monitor wall becomes a glass screen you can see
  // the Summoner through. ──
  block(g, hm, 33, 29, 34, 30, T.GLASS);

  m.name = "The Lord's Laboratory";
  m.playerStart = { x: 53.5, y: 54.5, dir: -Math.PI / 2 };
  m.exit = { x: 29.5, y: 4.5 };
  m.entities = [
    ...m.entities.filter((e) => e.type !== "enemy"),
    // The old exit, now the way in
    enemy(51.5, 50.5, "phantom"),
    enemy(52.5, 46.5, "phantom"),
    // East lower lab
    enemy(47.5, 38.5, "timeWarden"),
    enemy(46.5, 42.5, "henchman"),
    enemy(50.5, 42.5, "henchman"),
    // The central lab: the Temporal Summoner behind the glass
    enemy(29.5, 36.5, "temporalSummoner"),
    enemy(25.5, 29.5, "phantom"),
    enemy(34.5, 29.5, "phantom"),
    enemy(29.5, 27.5, "timeWarden"),
    // West labs (off the path)
    enemy(10.5, 38.5, "phantom"),
    enemy(14.5, 41.5, "phantom"),
    enemy(10.5, 24.5, "timeWarden"),
    // East upper lab
    enemy(46.5, 24.5, "henchman"),
    enemy(50.5, 27.5, "henchman"),
    // North hall
    enemy(17.5, 13.5, "phantom"),
    enemy(42.5, 13.5, "phantom"),
    enemy(29.5, 16.5, "timeWarden"),
    // Pickups for the walk back
    pickup(53.5, 48.5, "ammo"),
    pickup(29.5, 31.5, "health"),
    pickup(20.5, 16.5, "ammo"),
    pickup(39.5, 16.5, "health"),
  ];
  m.props = [
    ...m.props,
    { x: 9, y: 13, type: "monitor_bank" },
    { x: 13, y: 13, type: "monitor_bank" },
    { x: 46, y: 13, type: "monitor_bank" },
    { x: 50, y: 13, type: "monitor_bank" },
    { x: 24, y: 16, type: "monitor_bank" },
    { x: 35, y: 16, type: "monitor_bank" },
    { x: 44, y: 21, type: "monitor_bank" },
    { x: 52, y: 21, type: "monitor_bank" },
    { x: 23, y: 26, type: "monitor_bank" },
    { x: 36, y: 26, type: "monitor_bank" },
    { x: 22, y: 8, type: "monitor_bank" },
    { x: 37, y: 8, type: "monitor_bank" },
  ];
  return m;
}

ACT3_SET_PIECES.surviving_take = {
  hazards: [
    {
      id: "take_9999",
      type: "stasis",
      rect: [22, 4, 37, 8],
      motes: 40,
      // The one surviving take: a fixed point, walking into the Core alone.
      figures: [{ x: 29.5, y: 6.5, color: "#6fe8ff", label: "the one take" }],
    },
  ],
  enter: { rect: [22, 4, 37, 8], aria: "survivingTake" },
  scripted: [
    { id: "rook_logs", rect: [42, 35, 54, 43], squad: { member: "rook", text: "Every screen's the same eleven seconds. Thousands of takes. He never stopped filming." } },
    { id: "nova_logs", rect: [23, 25, 36, 32], squad: { member: "nova", text: "The station dies in every one of these. Every one, Lyra?" } },
    { id: "kael_quiet", rect: [22, 5, 37, 8], squad: { member: "kael", text: "Lyra. You went quiet." } },
  ],
};

// ── III-5: THE ARCHIVE OF REWINDS (new) ──────────────────────────
// Where Voss keeps his takes. Two stacks halls, and between them the rooms
// that replay: in each loop room an explosion goes off every eleven seconds,
// and its far door puts you back at the near one unless you cross it
// shifting. Foresight reads the blast coming; Rewind retries a crossing.
// Between the loop rooms, a stasis gallery holds a take with Miri in it, and
// off the first hall a gallery of the takes where you lost.
//
//   start (south) → stacks hall 1 → LOOP ROOM 1 (west) → stacks hall 2 →
//   Miri's gallery (stasis) → LOOP ROOM 2 (north-east) → exit
// ──────────────────────────────────────────────────────────────────
function buildArchive() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, T.TECH);
  const hm = createHeights(W, H);

  // ── Receiving vestibule (rows 51-57) and its doorway north ──
  floor(g, hm, 51, 23, 57, 36);
  floor(g, hm, 50, 28, 50, 31);
  lowWall(g, hm, 54, 26, 54, 27, LAYER.WAIST, T.METAL);
  lowWall(g, hm, 54, 32, 54, 33, LAYER.WAIST, T.METAL);

  // ── Stacks hall 1 (rows 41-49): two rows of archive stacks ──
  floor(g, hm, 41, 4, 49, 55);
  for (const [c1, c2] of [[8, 14], [18, 24], [35, 41], [45, 51]]) {
    block(g, hm, 43, c1, 43, c2, T.TECH);
    block(g, hm, 47, c1, 47, c2, T.TECH);
  }
  lowTile(g, hm, 45, 27, LAYER.WAIST, T.METAL);
  lowTile(g, hm, 45, 32, LAYER.WAIST, T.METAL);

  // ── Loop room 1, "take 0417" (rows 30-39, cols 5-16) ──
  floor(g, hm, 30, 5, 39, 16);
  floor(g, hm, 40, 10, 40, 11); // in, from hall 1
  floor(g, hm, 29, 10, 29, 11); // out, to hall 2: the seam
  // Rift pillars either side of the blast band.
  block(g, hm, 32, 7, 32, 7, T.RIFT);
  block(g, hm, 32, 14, 32, 14, T.RIFT);
  block(g, hm, 37, 7, 37, 7, T.RIFT);
  block(g, hm, 37, 14, 37, 14, T.RIFT);

  // ── The gallery of your takes (rows 30-39, cols 43-54), off hall 1 ──
  floor(g, hm, 30, 43, 39, 54);
  floor(g, hm, 40, 48, 40, 49);
  hWall(g, 34, 43, 45, T.GLASS);
  hWall(g, 34, 51, 53, T.GLASS);
  // A cache behind the gallery's east wall.
  floor(g, hm, 33, 56, 35, 57);
  g[34][55] = T.SECRET;

  // ── Stacks hall 2 (rows 19-28) ──
  floor(g, hm, 19, 4, 28, 55);
  block(g, hm, 22, 14, 23, 19, T.TECH);
  block(g, hm, 22, 40, 23, 45, T.TECH);
  block(g, hm, 25, 22, 26, 26, T.TECH);
  block(g, hm, 25, 33, 26, 37, T.TECH);
  lowWall(g, hm, 21, 28, 21, 31, LAYER.WAIST, T.METAL);
  // A cache behind the west wall.
  floor(g, hm, 22, 1, 24, 2);
  g[23][3] = T.SECRET;

  // ── Miri's gallery (rows 8-17): a take frozen in stasis ──
  floor(g, hm, 8, 23, 17, 36);
  floor(g, hm, 18, 29, 18, 30);
  hWall(g, 18, 24, 27, T.GLASS);
  hWall(g, 18, 32, 35, T.GLASS);
  lowWall(g, hm, 14, 25, 14, 26, LAYER.KNEE, T.METAL);
  lowWall(g, hm, 14, 33, 14, 34, LAYER.KNEE, T.METAL);
  // Out through the east wall to the second loop room.
  floor(g, hm, 11, 37, 12, 40);

  // ── Loop room 2, "take 9999" (rows 4-16, cols 41-54), and the exit ──
  floor(g, hm, 4, 41, 16, 54);
  floor(g, hm, 3, 53, 3, 54); // the seam
  floor(g, hm, 1, 48, 2, 55);
  block(g, hm, 8, 48, 8, 48, T.RIFT);
  block(g, hm, 12, 48, 12, 48, T.RIFT);

  return {
    name: "The Archive of Rewinds",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    exit: { x: 53.5, y: 1.5 },
    entities: [
      // Stacks hall 1: the echoes
      enemy(20.5, 45.5, "echoDrone"),
      enemy(39.5, 45.5, "echoDrone"),
      enemy(29.5, 42.5, "echoDrone"),
      enemy(10.5, 48.5, "riftLeaper"),
      enemy(50.5, 41.5, "riftLeaper"),
      // Loop room 1
      enemy(13.5, 38.5, "echoDrone"),
      // Stacks hall 2
      enemy(8.5, 21.5, "riftLeaper"),
      enemy(50.5, 25.5, "riftLeaper"),
      enemy(44.5, 20.5, "riftLeaper"),
      enemy(20.5, 20.5, "echoDrone"),
      enemy(38.5, 27.5, "echoDrone"),
      enemy(29.5, 24.5, "echoDrone"),
      // Loop room 2
      enemy(43.5, 6.5, "echoDrone"),
      enemy(52.5, 14.5, "echoDrone"),
      enemy(47.5, 10.5, "riftLeaper"),
      // Pickups
      pickup(5.5, 49.5, "health"),
      pickup(54.5, 49.5, "ammo"),
      pickup(15.5, 30.5, "ammo"),
      pickup(54.5, 19.5, "health"),
      pickup(5.5, 27.5, "ammo"),
      pickup(34.5, 16.5, "health"),
      pickup(53.5, 38.5, "ammo"),
      pickup(41.5, 4.5, "health"),
      pickup(49.5, 1.5, "ammo"),
      // Secret caches
      pickup(1.5, 23.5, "health"),
      pickup(57.5, 34.5, "ammo"),
      pickup(56.5, 33.5, "weapon", { weaponId: 5 }),
    ],
    secrets: [
      { wallX: 55, wallY: 34, description: "Take 0001. The first rewind, labelled in a steady hand: 'Once more. I can fix this.'" },
      { wallX: 3, wallY: 23, description: "A drawer of takes nobody watched: the station, living, in eleven seconds where nothing went wrong." },
    ],
    props: [
      { x: 6, y: 42, type: "filing_cabinet" },
      { x: 16, y: 42, type: "filing_cabinet" },
      { x: 43, y: 42, type: "filing_cabinet" },
      { x: 53, y: 48, type: "filing_cabinet" },
      { x: 26, y: 48, type: "monitor_bank" },
      { x: 33, y: 48, type: "monitor_bank" },
      { x: 6, y: 20, type: "filing_cabinet" },
      { x: 12, y: 27, type: "filing_cabinet" },
      { x: 47, y: 27, type: "filing_cabinet" },
      { x: 53, y: 20, type: "filing_cabinet" },
      { x: 24, y: 9, type: "monitor_bank" },
      { x: 35, y: 9, type: "monitor_bank" },
      { x: 44, y: 31, type: "monitor_bank" },
      { x: 53, y: 31, type: "monitor_bank" },
      { x: 25, y: 56, type: "table" },
      { x: 34, y: 56, type: "table" },
    ],
  };
}

/** A blast that replays every eleven seconds: the same explosion, the same instant. */
const REPLAY_BLAST = { type: "vent", period: 11, on: 0.6, warn: 2, damage: 24, rehit: 1, blast: true };

ACT3_SET_PIECES.archive_takes = {
  hazards: [
    { id: "take0417_blast", ...REPLAY_BLAST, rect: [5, 34, 16, 35], phase: 0 },
    {
      id: "take0417_loop", type: "loop", rect: [5, 30, 16, 39],
      seamA: { x: 5, y: 30 }, seamB: { x: 17, y: 30 }, out: { x: 10.5, y: 28.5 }, back: { x: 10.5, y: 38.5 },
    },
    { id: "take9999_blast_a", ...REPLAY_BLAST, rect: [45, 4, 46, 16], phase: 0 },
    { id: "take9999_blast_b", ...REPLAY_BLAST, rect: [50, 4, 51, 16], phase: 5.5 },
    {
      id: "take9999_loop", type: "loop", rect: [41, 4, 54, 16],
      seamA: { x: 41, y: 4 }, seamB: { x: 55, y: 4 }, out: { x: 53.5, y: 2.5 }, back: { x: 42.5, y: 12.5 },
    },
    {
      id: "gallery_miri", type: "stasis", rect: [23, 8, 36, 17], motes: 56,
      // Miri, reaching for someone the records say was never there.
      figures: [
        { x: 28.5, y: 11.5, color: "#63ff9a", label: "Miri" },
        { x: 30.2, y: 11.2, color: "#6fe8ff", pose: "kneel", label: "you" },
      ],
    },
    {
      id: "gallery_you", type: "stasis", rect: [43, 30, 54, 39], motes: 40,
      // The takes where you lost: the same cadet, going down, again and again.
      figures: [
        { x: 45.5, y: 37.5, color: "#6fe8ff", pose: "kneel", label: "you" },
        { x: 49.5, y: 32.5, color: "#6fe8ff", pose: "kneel", label: "you" },
        { x: 52.5, y: 37.5, color: "#6fe8ff", pose: "kneel", label: "you" },
        { x: 49.5, y: 35.5, color: "#ff2a4a", label: "the Lord" },
      ],
    },
  ],
  enter: { rect: [5, 36, 16, 39], aria: "archiveBlast" },
  scripted: [
    { id: "nova_archive", rect: [23, 50, 36, 53], squad: { member: "nova", text: "Same eleven seconds. Over and over. Somebody should've told him to let it go." } },
    { id: "rook_loop", rect: [4, 41, 17, 44], squad: { member: "rook", text: "That room's on a loop. Shift as you cross the far door and it can't hold you." } },
    { id: "lyra_takes", rect: [43, 36, 54, 39], squad: { member: "lyra", text: "Those are you. The takes where you lost. Don't stay." } },
    { id: "nova_miri", rect: [23, 12, 36, 17], squad: { member: "nova", text: "Who's that with you? She's not in any file I've got." } },
    { id: "kael_debrief", rect: [48, 1, 55, 2], squad: { member: "kael", text: "Whatever he watched in here, it wasn't us winning. Keep moving." } },
  ],
};

// ── III-6: THE CHRONOS ENGINE (new) ──────────────────────────────
// The Engine hall, stopped at T-00:00:11. A long processional under a
// stasis field: wardens and sentinels frozen mid-stride, debris hanging, and
// at the console, two of Voss. One is reaching for the lever; one is
// reaching to stop him. Walk it slowly. Leave the field at the north end and
// it breaks: what it held wakes behind you and the Engine's guard comes at
// you from the ring ahead. The arcades either side are quiet, and in the
// west one Kai holds a door shut from the wrong side.
// ──────────────────────────────────────────────────────────────────
function buildEngine() {
  const W = 60,
    H = 60;
  const g = createGrid(W, H, T.TECH);
  const hm = createHeights(W, H);

  // ── Maintenance lift (rows 52-57) ──
  floor(g, hm, 52, 25, 57, 34);
  floor(g, hm, 51, 28, 51, 31);

  // ── The processional (rows 15-50, cols 21-38) and its colonnade ──
  floor(g, hm, 15, 21, 50, 38);
  for (let r = 18; r <= 46; r += 4) {
    block(g, hm, r, 22, r, 22, T.ENERGY);
    block(g, hm, r, 37, r, 37, T.ENERGY);
  }
  // The console dais, knee high, and the lever housing at its heart.
  lowWall(g, hm, 32, 25, 32, 27, LAYER.KNEE, T.METAL);
  lowWall(g, hm, 32, 32, 32, 34, LAYER.KNEE, T.METAL);
  lowWall(g, hm, 28, 29, 28, 30, LAYER.WAIST, T.ENERGY);

  // ── The arcades (rows 18-46): quiet, lower, outside the field ──
  floor(g, hm, 18, 9, 46, 18);
  floor(g, hm, 18, 41, 46, 50);
  for (const r of [20, 32, 44]) {
    floor(g, hm, r, 19, r + 1, 20);
    floor(g, hm, r, 39, r + 1, 40);
  }
  for (let r = 22; r <= 42; r += 5) {
    block(g, hm, r, 13, r, 14, T.TECH);
    block(g, hm, r, 45, r, 46, T.TECH);
  }
  // Kai's door, in the west arcade: a slab he is still holding shut.
  block(g, hm, 26, 9, 28, 9, T.METAL);
  // A cache behind the east arcade.
  floor(g, hm, 37, 52, 39, 53);
  g[38][51] = T.SECRET;

  // ── Out of the field, into the Engine ring (rows 3-12) ──
  floor(g, hm, 13, 27, 14, 32);
  floor(g, hm, 3, 6, 12, 53);
  // The Engine itself: a block of live energy ringed in rift.
  block(g, hm, 5, 23, 9, 36, T.RIFT);
  block(g, hm, 6, 24, 8, 35, T.ENERGY);
  for (const c of [12, 18, 41, 47]) block(g, hm, 7, c, 8, c, T.ENERGY);
  lowWall(g, hm, 11, 14, 11, 17, LAYER.WAIST, T.METAL);
  lowWall(g, hm, 11, 42, 11, 45, LAYER.WAIST, T.METAL);
  // The Core lift, behind the Engine.
  floor(g, hm, 1, 27, 2, 32);
  // A cache behind the ring's west wall.
  floor(g, hm, 6, 3, 8, 4);
  g[7][5] = T.SECRET;

  return {
    name: "The Chronos Engine",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 55.5, dir: -Math.PI / 2 },
    exit: { x: 29.5, y: 1.5 },
    entities: [
      // Frozen in the processional, mid-stride (held by the field)
      enemy(25.5, 44.5, "timeWarden"),
      enemy(34.5, 40.5, "sentinel"),
      enemy(26.5, 36.5, "riftLeaper"),
      enemy(33.5, 25.5, "timeWarden"),
      enemy(25.5, 21.5, "sentinel"),
      enemy(31.5, 17.5, "riftLeaper"),
      // The Engine's guard, in the ring
      enemy(12.5, 5.5, "timeWarden"),
      enemy(47.5, 5.5, "timeWarden"),
      enemy(20.5, 10.5, "sentinel"),
      enemy(39.5, 10.5, "sentinel"),
      enemy(8.5, 11.5, "riftLeaper"),
      enemy(51.5, 11.5, "riftLeaper"),
      enemy(29.5, 3.5, "riftLeaper"),
      // Pickups
      pickup(29.5, 53.5, "ammo"),
      pickup(11.5, 19.5, "health"),
      pickup(16.5, 44.5, "ammo"),
      pickup(48.5, 19.5, "ammo"),
      pickup(43.5, 44.5, "health"),
      pickup(7.5, 4.5, "health"),
      pickup(52.5, 4.5, "health"),
      pickup(29.5, 11.5, "ammo"),
      // Secret caches
      pickup(52.5, 38.5, "health"),
      pickup(3.5, 7.5, "ammo"),
      pickup(3.5, 6.5, "weapon", { weaponId: 6 }),
    ],
    secrets: [
      { wallX: 51, wallY: 38, description: "Rook's shift log, the night it ran: 'Interlocks green. Voss on console. Signed off 23:59:49.'" },
      { wallX: 5, wallY: 7, description: "The Engine's first calibration run, chalked on the wall: eleven marks, and a twelfth scratched out." },
    ],
    props: [
      { x: 27, y: 30, type: "monitor_bank" },
      { x: 32, y: 30, type: "monitor_bank" },
      { x: 26, y: 54, type: "crate" },
      { x: 33, y: 54, type: "crate" },
      { x: 10, y: 20, type: "locker" },
      { x: 17, y: 34, type: "bench" },
      { x: 49, y: 20, type: "locker" },
      { x: 42, y: 34, type: "bench" },
      { x: 22, y: 12, type: "monitor_bank" },
      { x: 37, y: 12, type: "monitor_bank" },
    ],
  };
}

ACT3_SET_PIECES.engine_stasis = {
  hazards: [
    {
      id: "t_minus_11", type: "stasis", rect: [21, 15, 38, 50], motes: 90,
      // It holds what stands in it, until you step out at the north end.
      holds: true,
      release: [27, 12, 32, 14],
      aria: "stasisBreaks",
      squad: { member: "kael", text: "Field's gone! Contact, both ends!" },
      figures: [
        { x: 28.8, y: 29.5, color: "#ff2a4a", label: "Voss, reaching for the lever" },
        { x: 30.2, y: 29.5, color: "#ffd36a", label: "Voss, reaching to stop him" },
      ],
    },
    {
      id: "the_door_holds", type: "stasis", rect: [10, 24, 17, 30], motes: 24,
      figures: [{ x: 10.6, y: 27.5, color: "#ffb347", label: "Kai" }],
    },
  ],
  enter: { rect: [21, 44, 38, 50], aria: "stasisRoom" },
  scripted: [
    { id: "rook_engine", rect: [25, 52, 34, 55], squad: { member: "rook", text: "That's my interlock panel. He walked straight through it. I signed off on that door." } },
    { id: "lyra_two", rect: [23, 30, 36, 34], squad: { member: "lyra", text: "Two of him. Same man, same second. One reaching for the lever, one reaching to stop it." } },
    { id: "nova_kai", rect: [10, 23, 18, 31], squad: { member: "nova", text: "That one's holding a door shut. From the wrong side." } },
    { id: "nova_debrief", rect: [26, 1, 33, 3], squad: { member: "nova", text: "Core lift's right here. I'd race you down. Not today." } },
  ],
};

// ── III-7: THE PARADOX CORE, SECOND VISIT ────────────────────────
// The room the story keeps coming back to, and it did not survive the first
// fight. The ring wall between the lower hall and the arena is broken into
// fragments; the arena's side walls are breached into the flanking rooms;
// the old pillars are gone and fallen ring segments, waist high, arc round
// the Lord. Form 2 replays his volleys from where he fired them and takes
// your shift if you hold it, so the fight needs cover you can see over and a
// room you can move through.
// ──────────────────────────────────────────────────────────────────
function buildCoreBroken() {
  const m = remix("core");
  const g = m.grid;
  const hm = m.heightMap;

  // ── The ring, broken: fragments of rift, and low segments between ──
  floor(g, hm, 32, 11, 33, 48);
  for (const [c1, c2] of [[11, 13], [24, 26], [33, 35], [46, 48]]) block(g, hm, 32, c1, 33, c2, T.RIFT);
  lowWall(g, hm, 32, 17, 32, 20, LAYER.WAIST, T.BOSS);
  lowWall(g, hm, 32, 39, 32, 42, LAYER.WAIST, T.BOSS);

  // ── The arena's side walls breached into the flanking rooms ──
  floor(g, hm, 19, 10, 21, 10);
  floor(g, hm, 19, 49, 21, 49);

  // ── The old pillars go; fallen ring segments arc round the Lord ──
  for (const [r, c] of [[18, 16], [18, 43], [27, 16], [27, 43]]) floor(g, hm, r, c, r, c);
  floor(g, hm, 22, 22, 23, 22);
  floor(g, hm, 22, 37, 23, 37);
  lowWall(g, hm, 17, 21, 17, 24, LAYER.WAIST, T.BOSS);
  lowWall(g, hm, 17, 35, 17, 38, LAYER.WAIST, T.BOSS);
  lowWall(g, hm, 22, 18, 26, 18, LAYER.WAIST, T.BOSS);
  lowWall(g, hm, 22, 41, 26, 41, LAYER.WAIST, T.BOSS);
  lowWall(g, hm, 30, 22, 30, 25, LAYER.WAIST, T.BOSS);
  lowWall(g, hm, 30, 34, 30, 37, LAYER.WAIST, T.BOSS);
  // Knee-high debris in the corners, to break the long lines.
  for (const [r, c] of [[15, 13], [15, 46], [29, 13], [29, 46]]) lowTile(g, hm, r, c, LAYER.KNEE, T.RIFT);

  // ── The lower hall: rubble from the ring ──
  lowWall(g, hm, 40, 14, 40, 16, LAYER.WAIST, T.RIFT);
  lowWall(g, hm, 40, 43, 40, 45, LAYER.WAIST, T.RIFT);

  m.name = "The Paradox Core: Broken Rings";
  m.entities = [
    ...m.entities.filter((e) => e.type !== "enemy"),
    enemy(29.5, 24.5, "boss"),
    // A thin guard: the fight is his.
    enemy(22.5, 41.5, "henchman"),
    enemy(36.5, 41.5, "henchman"),
    enemy(8.5, 47.5, "corruptCop"),
    enemy(51.5, 47.5, "corruptCop"),
    enemy(6.5, 20.5, "timeWarden"),
    enemy(53.5, 20.5, "timeWarden"),
  ];
  return m;
}

/** Every Act III map, built once, keyed by the id its level names it by. */
export const ACT3_MAPS = {
  rewritten_wing: buildRewrittenWing(),
  server_siege: buildServerSiege(),
  reactor_overload: buildReactorOverload(),
  lords_lab: buildLordsLab(),
  archive: buildArchive(),
  engine: buildEngine(),
  core_broken: buildCoreBroken(),
};
