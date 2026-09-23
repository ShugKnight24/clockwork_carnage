// ═══════════════════════════════════════════════════════════════════
// ACT II MAPS — The Gathering
// The outer rings and underdecks, the parts of the station the Lord
// hasn't bothered to rewrite: Evac Shafts, Salvage Deck, Maintenance
// Spine, Transit Loop, the Greenhouse, the Precinct (a remix of the
// tutorial station) and the Foundry (the Hound's den).
// Same builder pattern as station-maps.js. Spec: docs/superpowers/specs/
// 2026-09-22-campaign-story-restructure-design.md §7 Act II. The set
// pieces laid over these maps (collapses, teach rooms, fans, pistons,
// trains, stasis) are src/data/campaign/set-pieces.js, in these maps'
// own coordinates.
// ═══════════════════════════════════════════════════════════════════
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
import { TUTORIAL_MAP } from "./tutorial.js";

const W = 60;
const H = 60;

/** An enemy at the centre of cell (c, r). */
const foe = (c, r, enemyType) => ({ x: c + 0.5, y: r + 0.5, type: "enemy", enemyType });
/** A pickup at the centre of cell (c, r). */
const item = (c, r, type, extra = {}) => ({ x: c + 0.5, y: r + 0.5, type, ...extra });

// ── II-1: EVAC SHAFTS ─────────────────────────────────────────────
// Service shafts under the Paradox Core, still coming down from the false
// victory. You wake in the crash bay (south-west) and climb out: Shaft A
// runs north up the west wall, the pump hall is the midpoint where the
// first hunters come through, a control room is the one quiet minute, and
// Shaft B runs east along the ceiling and drops down the east wall to the
// lift. Both shafts collapse behind you; their landings (the alcoves) are
// where a caught player is set down again. The collapsed Core glows red
// through the glass in Shaft A's east wall.
//
// Pacing: bay 0.3 → Shaft A chase 0.8 → pump hall hunt 0.9 → control
// room 0.1 → Shaft B chase 0.8 → lift lobby 0.5 → the lift.
function buildEvacShafts() {
  const g = createGrid(W, H, 3);
  const hm = createHeights(W, H);

  // ── CRASH BAY (rows 49-56, cols 3-17): where the Core spat you out ──
  carve(g, 49, 3, 56, 17);
  // Rubble from the fall above: rift-scorched debris and knee-high slabs.
  tile(g, 52, 15, 9);
  tile(g, 53, 15, 9);
  tile(g, 52, 16, 9);
  lowTile(g, hm, 51, 12, LAYER.KNEE);
  lowTile(g, hm, 54, 6, LAYER.WAIST);
  lowWall(g, hm, 50, 4, 50, 5, LAYER.KNEE);
  lowTile(g, hm, 55, 13, LAYER.KNEE);

  // ── SHAFT A (lane cols 6-9, rows 13-48): the first run north ──
  carve(g, 13, 6, 48, 9);
  // Landings, cut into the west wall: where a caught runner is set down.
  carve(g, 36, 3, 38, 5);
  carve(g, 24, 3, 26, 5);
  lowTile(g, hm, 36, 3, LAYER.KNEE);
  lowTile(g, hm, 26, 3, LAYER.KNEE);
  // The east wall is glass in three places, over the chasm where the Core
  // came down: the rift glows beyond it.
  for (const [a, b] of [[17, 20], [28, 32], [40, 44]]) vWall(g, a, b, 10, 8);
  carve(g, 16, 11, 46, 14);
  vWall(g, 16, 46, 15, 9);
  for (const r of [19, 30, 42]) tile(g, r, 13, 9);

  // ── PUMP HALL (rows 3-12, cols 4-30): the midpoint, the first hunt ──
  carve(g, 3, 4, 12, 30);
  // Pump housings (2×2 tech blocks) with lanes between them.
  for (const [r, c] of [[5, 10], [5, 19], [9, 14], [9, 23]]) carve(g, r, c, r + 1, c + 1, 2);
  // Pipe runs at waist height: cover you can shoot over.
  lowWall(g, hm, 7, 26, 7, 28, LAYER.WAIST);
  lowWall(g, hm, 11, 5, 11, 7, LAYER.WAIST);
  lowTile(g, hm, 4, 16, LAYER.KNEE);

  // ── CONTROL ROOM (rows 3-7, cols 32-36): one quiet minute ──
  carve(g, 3, 32, 7, 36);
  carve(g, 4, 31, 6, 31);
  // A window back over the pump hall, knee-high, like a sill.
  lowTile(g, hm, 3, 31, LAYER.KNEE, 8);

  // ── SHAFT B: east along the ceiling (rows 3-6, cols 37-50), then down
  //    the east wall (cols 47-50, rows 7-28) ──
  carve(g, 3, 37, 6, 50);
  carve(g, 7, 41, 8, 43); // landing
  carve(g, 7, 47, 28, 50);
  carve(g, 17, 51, 19, 53); // landing
  lowTile(g, hm, 8, 43, LAYER.KNEE);
  lowTile(g, hm, 19, 53, LAYER.KNEE);

  // ── LIFT LOBBY (rows 29-40, cols 42-56) ──
  carve(g, 29, 42, 40, 56);
  lowWall(g, hm, 33, 45, 33, 46, LAYER.WAIST);
  lowWall(g, hm, 36, 52, 36, 54, LAYER.WAIST);
  tile(g, 31, 54, 2);
  // ── THE LIFT (rows 42-48, cols 48-54), tech-walled, lit ──
  room(g, 41, 47, 49, 55, 2);
  carve(g, 41, 50, 41, 52);

  // ── SUMP (rows 45-55, cols 24-44): optional, flooded, a cache ──
  carve(g, 37, 36, 39, 41); // off the lobby's west wall
  carve(g, 40, 36, 44, 38);
  carve(g, 45, 24, 55, 44);
  lowWall(g, hm, 48, 28, 48, 31, LAYER.KNEE);
  lowWall(g, hm, 52, 36, 52, 40, LAYER.KNEE);
  tile(g, 50, 33, 2);
  // Secret: a sealed maintenance cupboard behind the sump's west wall.
  carve(g, 49, 20, 51, 22);
  g[50][23] = 6;

  return {
    name: "Evac Shafts",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 9.5, y: 54.5, dir: -Math.PI / 2 },
    entities: [
      // Crash bay: what was already down here.
      foe(12, 50, "drone"),
      foe(5, 51, "glitchling"),
      // Pump hall: Act I leftovers, then the scripted hunt.
      foe(16, 7, "phantom"),
      foe(26, 4, "phantom"),
      foe(8, 5, "glitchling"),
      foe(21, 11, "glitchling"),
      foe(28, 10, "drone"),
      // Lift lobby.
      foe(45, 37, "phantom"),
      foe(53, 30, "drone"),
      foe(55, 39, "phantom"),
      foe(44, 31, "glitchling"),
      // Sump.
      foe(30, 50, "drone"),
      foe(41, 54, "glitchling"),
      // ── Pickups ──
      item(15, 55, "health"),
      item(4, 37, "ammo"),
      item(4, 25, "health"),
      item(34, 4, "health"),
      item(35, 6, "ammo"),
      item(42, 8, "ammo"),
      item(52, 18, "health"),
      item(55, 40, "health"),
      item(26, 54, "ammo"),
      item(43, 46, "weapon", { weaponId: 2 }),
      // Secret cupboard.
      item(21, 50, "health"),
      item(20, 51, "ammo"),
    ],
    exit: { x: 51.5, y: 46.5 },
    secrets: [{ wallX: 23, wallY: 50, description: "A maintenance cupboard nobody sealed properly" }],
    props: [
      { x: 14, y: 50, type: "crate" },
      { x: 4, y: 55, type: "barrier" },
      { x: 16, y: 55, type: "crate" },
      { x: 12, y: 5, type: "monitor_bank" },
      { x: 20, y: 11, type: "barrier" },
      { x: 34, y: 3, type: "monitor_bank" },
      { x: 35, y: 4, type: "chair" },
      { x: 36, y: 7, type: "desk" },
      { x: 43, y: 29, type: "crate" },
      { x: 56, y: 33, type: "crate" },
      { x: 48, y: 48, type: "monitor_bank" },
      { x: 25, y: 46, type: "barrier" },
      { x: 44, y: 55, type: "crate" },
    ],
  };
}

// ── II-2: SALVAGE DECK ────────────────────────────────────────────
// A scrap hangar on the docking ring. Rook has walled himself in behind
// welded blast doors and turrets on the east side; the looters come in
// through a breach in the west wall. You arrive in the receiving hall
// (Foresight's teach room: sealed, phase stalkers blinking between its
// pillars), hold the hangar floor, then run out along the dock cranes to
// the berth where the power coupling is, past the looters' foreman.
//
// Pacing: teach hall 0.4 → hangar 0.7 → looter camp (optional) 0.5 →
// dock cranes 0.8 → the foreman 0.9 → the berth.
function buildSalvageDeck() {
  const g = createGrid(W, H, 3);
  const hm = createHeights(W, H);

  // ── RECEIVING HALL (rows 45-55, cols 16-43): Foresight's teach room ──
  carve(g, 45, 16, 55, 43);
  // Pillars for the stalkers to blink between, two deep.
  for (const [r, c] of [[47, 21], [47, 38], [51, 25], [51, 34], [48, 29], [48, 30]]) carve(g, r, c, r + 1, c, 3);
  lowWall(g, hm, 53, 18, 53, 19, LAYER.WAIST);
  lowWall(g, hm, 53, 40, 53, 41, LAYER.WAIST);
  // Two doorways north into the hangar: the teach seals them.
  carve(g, 44, 22, 44, 24);
  carve(g, 44, 35, 44, 37);

  // ── HANGAR (rows 20-43, cols 6-43) ──
  carve(g, 20, 6, 43, 43);
  // Full crate stacks and waist-high crate rows: angles, not walls.
  for (const [r, c] of [[24, 12], [24, 34], [32, 20], [32, 28]]) carve(g, r, c, r + 1, c + 1, 3);
  lowWall(g, hm, 28, 9, 28, 12, LAYER.WAIST);
  lowWall(g, hm, 28, 37, 28, 40, LAYER.WAIST);
  lowWall(g, hm, 37, 14, 37, 17, LAYER.WAIST);
  lowWall(g, hm, 37, 32, 37, 35, LAYER.WAIST);
  // The line you hold: a barricade across the apron, with gaps.
  lowWall(g, hm, 40, 8, 40, 13, LAYER.WAIST);
  lowWall(g, hm, 40, 18, 40, 20, LAYER.KNEE);
  lowWall(g, hm, 40, 38, 40, 42, LAYER.WAIST);
  // Rook's workshop (east, cols 45-54): welded shut, seen through glass.
  carve(g, 22, 45, 37, 54);
  vWall(g, 20, 43, 44, 3);
  for (const [a, b] of [[24, 27], [32, 35]]) vWall(g, a, b, 44, 8);
  carve(g, 26, 49, 27, 50, 2);
  carve(g, 32, 49, 33, 50, 2);
  // The looters' breach in the west wall, and their camp behind it.
  carve(g, 27, 1, 34, 4);
  carve(g, 29, 5, 31, 5);
  tile(g, 28, 5, 9);
  tile(g, 32, 5, 9);
  lowTile(g, hm, 30, 2, LAYER.KNEE);
  // Hangar doors north to the docks, two wide bays.
  carve(g, 19, 10, 19, 13);
  carve(g, 19, 36, 19, 39);

  // ── DOCK CRANES (rows 4-18, cols 3-56): the outer docking ring ──
  carve(g, 4, 3, 18, 56);
  // Glass out onto the rift, all along the berths.
  hWall(g, 3, 5, 54, 8);
  carve(g, 1, 5, 2, 54);
  hWall(g, 0, 0, W - 1, 9);
  // Crane legs (tech), staggered, and cargo you can shoot over.
  for (const [r, c] of [[8, 12], [8, 26], [8, 40], [13, 19], [13, 33], [13, 47]]) carve(g, r, c, r + 1, c + 1, 2);
  lowWall(g, hm, 16, 22, 16, 25, LAYER.WAIST);
  lowWall(g, hm, 11, 50, 11, 53, LAYER.WAIST);
  lowWall(g, hm, 6, 30, 6, 32, LAYER.KNEE);
  lowWall(g, hm, 15, 6, 15, 8, LAYER.WAIST);
  // The coupling's berth (north-east), behind a knee-high rail.
  lowWall(g, hm, 7, 49, 7, 51, LAYER.KNEE);

  // Secret: a looter stash behind the dock's east wall.
  carve(g, 14, 58, 16, 58);
  g[15][57] = 6;

  return {
    name: "Salvage Deck",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 54.5, dir: -Math.PI / 2 },
    entities: [
      // Hangar apron and floor.
      foe(12, 42, "henchman"),
      foe(40, 43, "henchman"),
      foe(10, 23, "henchman"),
      foe(22, 26, "henchman"),
      foe(36, 22, "corruptCop"),
      foe(27, 30, "temporalEngineer"),
      foe(16, 34, "phaseStalker"),
      foe(31, 36, "drone"),
      // The looters' camp.
      foe(2, 28, "henchman"),
      foe(3, 33, "henchman"),
      // Dock cranes and the foreman.
      foe(18, 6, "drone"),
      foe(30, 11, "phaseStalker"),
      foe(24, 17, "corruptCop"),
      foe(40, 6, "temporalEngineer"),
      foe(48, 15, "temporalEngineer"),
      foe(37, 15, "henchman"),
      foe(45, 9, "shieldCommander"),
      // ── Pickups ──
      item(41, 54, "ammo"),
      item(7, 38, "health"),
      item(42, 21, "ammo"),
      item(20, 29, "ammo"),
      item(1, 31, "health"),
      item(5, 17, "health"),
      item(27, 5, "ammo"),
      item(55, 17, "health"),
      item(34, 17, "weapon", { weaponId: 2 }),
      // Looter stash.
      item(58, 15, "ammo"),
      item(58, 14, "health"),
    ],
    exit: { x: 52.5, y: 5.5 },
    secrets: [{ wallX: 57, wallY: 15, description: "The looters' stash, behind a loose dock panel" }],
    props: [
      { x: 17, y: 46, type: "crate" },
      { x: 42, y: 46, type: "crate" },
      { x: 17, y: 54, type: "barrier" },
      { x: 9, y: 21, type: "crate" },
      { x: 30, y: 22, type: "ammo_crate" },
      { x: 42, y: 30, type: "barrier" },
      { x: 42, y: 34, type: "barrier" },
      { x: 25, y: 41, type: "crate" },
      { x: 47, y: 24, type: "weapon_rack" },
      { x: 52, y: 29, type: "desk" },
      { x: 52, y: 35, type: "monitor_bank" },
      { x: 3, y: 34, type: "crate" },
      { x: 4, y: 5, type: "crate" },
      { x: 15, y: 11, type: "crate" },
      { x: 29, y: 16, type: "ammo_crate" },
      { x: 55, y: 5, type: "monitor_bank" },
    ],
  };
}

// ── II-3: MAINTENANCE SPINE ───────────────────────────────────────
// The kilometre-long spine between the rings. In from the south-west
// through a fan gallery (Chrono Dash's teach: three rotors too fast for a
// normal dash), then east along the catwalk, which comes down behind you,
// through the piston hall, and up into the pump hall where the Temporal
// Summoner waits. West of the pump hall, off the critical path: the intake
// hall and the old drafting office, where someone hid Kai's blueprint.
//
// Pacing: vestibule 0.1 → fans (teach) 0.4 → landing hall 0.5 → catwalk
// collapse 0.8 → piston hall 0.6 → pump hall (sub-boss) 1.0 → drafting
// office (optional, the fragment) 0.2 → exit.
function buildMaintenanceSpine() {
  const g = createGrid(W, H, 3);
  const hm = createHeights(W, H);

  // ── VESTIBULE (rows 50-56, cols 3-13) ──
  carve(g, 50, 3, 56, 13);
  lowWall(g, hm, 54, 11, 55, 11, LAYER.WAIST);
  // ── FAN GALLERY (rows 42-49, cols 4-12): the rotors sit at row 45 ──
  carve(g, 42, 4, 49, 12);
  // ── LANDING HALL (rows 31-41, cols 3-13): past the fans ──
  carve(g, 31, 3, 41, 13);
  tile(g, 36, 6, 2);
  tile(g, 36, 10, 2);
  lowWall(g, hm, 39, 4, 39, 6, LAYER.KNEE);

  // ── THE CATWALK (rows 31-34, cols 14-41), glass both sides over the
  //    spine's machinery; two platforms where it widens (the landings) ──
  carve(g, 31, 14, 34, 41);
  carve(g, 29, 23, 36, 25);
  carve(g, 29, 32, 36, 34);
  for (const c of [23, 32]) {
    lowTile(g, hm, 29, c, LAYER.KNEE);
    lowTile(g, hm, 36, c + 2, LAYER.KNEE);
  }
  for (const [a, b] of [[15, 21], [27, 30], [36, 40]]) {
    hWall(g, 30, a, b, 8);
    hWall(g, 35, a, b, 8);
  }
  // The machinery beyond the glass: open, out of reach, lit.
  carve(g, 25, 15, 29, 40);
  carve(g, 36, 15, 40, 40);
  carve(g, 29, 23, 29, 25);
  carve(g, 29, 32, 29, 34);
  carve(g, 36, 23, 36, 25);
  carve(g, 36, 32, 36, 34);
  hWall(g, 30, 22, 22, 3);
  hWall(g, 30, 26, 26, 3);
  hWall(g, 30, 31, 31, 3);
  hWall(g, 30, 35, 35, 3);
  hWall(g, 35, 22, 22, 3);
  hWall(g, 35, 26, 26, 3);
  hWall(g, 35, 31, 31, 3);
  hWall(g, 35, 35, 35, 3);
  // Landing platforms: fenced off from the machinery by knee rails.
  lowWall(g, hm, 29, 23, 29, 25, LAYER.KNEE);
  lowWall(g, hm, 36, 23, 36, 25, LAYER.KNEE);
  lowWall(g, hm, 29, 32, 29, 34, LAYER.KNEE);
  lowWall(g, hm, 36, 32, 36, 34, LAYER.KNEE);
  carve(g, 30, 23, 30, 25);
  carve(g, 30, 32, 30, 34);
  carve(g, 35, 23, 35, 25);
  carve(g, 35, 32, 35, 34);
  for (const [r, c] of [[27, 18], [27, 29], [38, 20], [38, 37], [26, 38], [39, 28]]) carve(g, r, c, r + 1, c + 1, 2);

  // ── PISTON HALL (rows 30-35, cols 42-56): three crushers across it ──
  carve(g, 30, 42, 35, 56);
  // Housings above and below each piston band.
  for (const c of [45, 49, 53]) {
    carve(g, 29, c, 29, c + 1, 2);
    carve(g, 36, c, 36, c + 1, 2);
  }
  // ── RISER (cols 54-56, rows 21-29) up to the pump hall ──
  carve(g, 21, 54, 29, 56);

  // ── PUMP HALL (rows 4-20, cols 36-57): the Temporal Summoner ──
  carve(g, 4, 36, 20, 57);
  for (const [r, c] of [[7, 41], [7, 50], [14, 45]]) carve(g, r, c, r + 2, c + 2, 2);
  lowWall(g, hm, 12, 38, 12, 42, LAYER.KNEE);
  lowWall(g, hm, 17, 50, 17, 54, LAYER.KNEE);
  lowWall(g, hm, 5, 45, 5, 48, LAYER.WAIST);

  // ── WEST SERVICE RUN (rows 10-12, cols 17-35) off the pump hall ──
  carve(g, 10, 17, 12, 35);
  // ── INTAKE HALL (rows 15-23, cols 4-30): optional ──
  carve(g, 15, 4, 23, 30);
  carve(g, 13, 20, 14, 22);
  for (const [r, c] of [[18, 9], [18, 17], [18, 25]]) carve(g, r, c, r + 1, c + 1, 2);
  lowWall(g, hm, 21, 12, 21, 15, LAYER.WAIST);
  // ── DRAFTING OFFICE (rows 4-9, cols 4-16): Kai's blueprint, hidden ──
  room(g, 3, 3, 10, 17, 1);
  door(g, 10, 10);
  carve(g, 11, 10, 14, 10);
  tile(g, 6, 7, 1);
  tile(g, 6, 12, 1);
  // Secret: a drafting cabinet behind the west wall.
  carve(g, 5, 1, 7, 2);
  g[6][3] = 6;

  return {
    name: "Maintenance Spine",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 8.5, y: 54.5, dir: -Math.PI / 2 },
    entities: [
      // Landing hall.
      foe(8, 38, "temporalEngineer"),
      foe(5, 33, "drone"),
      foe(11, 32, "chronoBomber"),
      // Riser.
      foe(55, 23, "chronoBomber"),
      // Pump hall: the Temporal Summoner and its crew.
      foe(46, 11, "temporalSummoner"),
      foe(39, 6, "temporalEngineer"),
      foe(54, 7, "temporalEngineer"),
      foe(40, 17, "drone"),
      foe(52, 14, "drone"),
      foe(44, 18, "chronoBomber"),
      // Intake hall and drafting office.
      foe(7, 16, "temporalEngineer"),
      foe(22, 21, "chronoBomber"),
      foe(28, 16, "drone"),
      foe(14, 6, "chronoBomber"),
      // ── Pickups ──
      item(12, 51, "ammo"),
      item(4, 40, "health"),
      item(12, 40, "ammo"),
      item(24, 30, "health"),
      item(33, 35, "ammo"),
      item(55, 28, "health"),
      item(37, 19, "ammo"),
      item(56, 19, "health"),
      item(5, 22, "ammo"),
      item(29, 22, "health"),
      item(9, 8, "weapon", { weaponId: 3 }),
      // Drafting cabinet.
      item(1, 6, "health"),
      item(2, 5, "ammo"),
    ],
    exit: { x: 55.5, y: 5.5 },
    secrets: [{ wallX: 3, wallY: 6, description: "A drafting cabinet: Kai's blueprint, filed where nobody looks" }],
    props: [
      { x: 4, y: 51, type: "crate" },
      { x: 12, y: 55, type: "ammo_crate" },
      { x: 3, y: 41, type: "barrier" },
      { x: 13, y: 31, type: "crate" },
      { x: 56, y: 32, type: "barrier" },
      { x: 37, y: 5, type: "monitor_bank" },
      { x: 56, y: 12, type: "crate" },
      { x: 48, y: 19, type: "barrier" },
      { x: 5, y: 4, type: "desk" },
      { x: 9, y: 4, type: "desk" },
      { x: 15, y: 4, type: "filing_cabinet" },
      { x: 16, y: 8, type: "filing_cabinet" },
      { x: 4, y: 17, type: "crate" },
      { x: 30, y: 20, type: "crate" },
    ],
  };
}

// ── II-4: TRANSIT LOOP ────────────────────────────────────────────
// The monorail ring: a loop of track around the map with long, straight
// sightlines, four stations at its corners, and an east-west line across
// the middle where trains still run on a schedule nobody wrote. Every way
// north crosses that line: at the west switch, the central junction or the
// east switch. You start on the south-west platform; the exit is the
// north-east platform. Beasts roam the loop, and they speed up when you
// shift: the level teaches that the shift is not always the answer.
//
// Pacing: platform 0.3 → the loop (beasts, sightlines) 0.7 → the crossing
// 0.8 → a station (rest, loot) 0.3 → the far loop 0.7 → the platform.
function buildTransitLoop() {
  const g = createGrid(W, H, 3);
  const hm = createHeights(W, H);

  // ── THE LOOP: track four wide all round ──
  carve(g, 5, 5, 8, 54);
  carve(g, 51, 5, 54, 54);
  carve(g, 5, 5, 54, 8);
  carve(g, 5, 51, 54, 54);
  // ── THE LINE (rows 28-31): east-west across the middle ──
  carve(g, 28, 9, 31, 50);
  // ── THE SPUR (cols 28-31): north and south from the junction ──
  carve(g, 9, 28, 27, 31);
  carve(g, 32, 28, 50, 31);
  // Rails: knee-high sleepers every few tiles along the loop's inner edge
  // would block; the ring stays clear. Signal posts at the corners instead.
  for (const [r, c] of [[5, 5], [5, 54], [54, 5], [54, 54]]) tile(g, r, c, 2);

  // ── SOUTH-WEST PLATFORM (rows 40-49, cols 11-24): the start ──
  carve(g, 40, 11, 49, 24);
  carve(g, 50, 14, 50, 17); // down to the loop
  carve(g, 44, 25, 46, 27); // across to the south spur
  carve(g, 33, 16, 39, 18); // up to the line
  lowWall(g, hm, 43, 13, 43, 16, LAYER.WAIST); // platform benches
  lowWall(g, hm, 46, 19, 46, 22, LAYER.WAIST);
  tile(g, 41, 23, 2); // ticket machine
  // ── NORTH-EAST PLATFORM (rows 10-19, cols 35-48): the exit ──
  carve(g, 10, 35, 19, 48);
  carve(g, 9, 42, 9, 45); // up to the loop
  carve(g, 13, 32, 15, 34); // across to the north spur
  carve(g, 20, 41, 27, 43); // down to the line
  lowWall(g, hm, 13, 38, 13, 41, LAYER.WAIST);
  lowWall(g, hm, 16, 43, 16, 46, LAYER.WAIST);
  tile(g, 18, 36, 2);
  // ── NORTH-WEST STATION (rows 11-22, cols 11-24): loot, a rest ──
  carve(g, 11, 11, 22, 24);
  carve(g, 15, 9, 17, 10); // from the west loop
  carve(g, 23, 20, 27, 22); // down to the line
  tile(g, 14, 15, 2);
  tile(g, 14, 20, 2);
  lowWall(g, hm, 19, 13, 19, 17, LAYER.KNEE);
  // ── SOUTH-EAST STATION (rows 36-48, cols 35-48): the transit cops ──
  carve(g, 36, 35, 48, 48);
  carve(g, 42, 49, 44, 50); // from the east loop
  carve(g, 32, 37, 35, 39); // up to the line
  for (const [r, c] of [[39, 38], [39, 45], [45, 38], [45, 45]]) tile(g, r, c, 2);
  lowWall(g, hm, 42, 40, 42, 43, LAYER.WAIST);
  // Derailed car on the south loop: cover on the long straight.
  lowWall(g, hm, 52, 30, 53, 36, LAYER.SHOULDER);
  // A dead train on the north loop, half across the track.
  lowWall(g, hm, 5, 20, 6, 27, LAYER.SHOULDER);
  // Secret: a signal box off the west loop.
  carve(g, 35, 1, 37, 3);
  g[36][4] = 6;

  return {
    name: "Transit Loop",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 16.5, y: 47.5, dir: -Math.PI / 2 },
    entities: [
      // The loop: beasts on the long straights.
      foe(6, 22, "beast"),
      foe(26, 53, "beast"),
      foe(53, 38, "beast"),
      foe(38, 6, "beast"),
      // The line and the spur.
      foe(12, 29, "henchman"),
      foe(46, 30, "henchman"),
      foe(29, 20, "corruptCop"),
      foe(30, 40, "corruptCop"),
      // North-west station.
      foe(13, 12, "henchman"),
      foe(22, 20, "corruptCop"),
      // South-east station: the transit cops' post.
      foe(37, 37, "corruptCop"),
      foe(46, 47, "corruptCop"),
      foe(42, 40, "henchman"),
      foe(40, 46, "drone"),
      // North-east platform.
      foe(46, 11, "henchman"),
      foe(37, 17, "drone"),
      // ── Pickups ──
      item(22, 48, "ammo"),
      item(12, 41, "health"),
      item(6, 40, "ammo"),
      item(53, 20, "ammo"),
      item(16, 21, "health"),
      item(23, 12, "ammo"),
      item(47, 37, "health"),
      item(36, 47, "ammo"),
      item(44, 18, "health"),
      item(18, 13, "weapon", { weaponId: 5 }),
      // Signal box.
      item(1, 36, "health"),
      item(2, 35, "ammo"),
    ],
    exit: { x: 42.5, y: 11.5 },
    secrets: [{ wallX: 4, wallY: 36, description: "A signal box, still ticking" }],
    props: [
      { x: 11, y: 45, type: "chair" },
      { x: 24, y: 44, type: "vending_machine" },
      { x: 12, y: 49, type: "barrier" },
      { x: 48, y: 12, type: "vending_machine" },
      { x: 35, y: 10, type: "chair" },
      { x: 11, y: 22, type: "desk" },
      { x: 24, y: 11, type: "filing_cabinet" },
      { x: 35, y: 36, type: "desk" },
      { x: 48, y: 36, type: "monitor_bank" },
      { x: 35, y: 48, type: "barrier" },
      { x: 53, y: 9, type: "barrier" },
      { x: 9, y: 53, type: "crate" },
    ],
  };
}

// ── II-5: THE GREENHOUSE ──────────────────────────────────────────
// The hydroponics ring: green, quiet, the only warm light in the act. The
// three of you rest in the arrival lounge. The dome is gentle combat among
// the beds; the west glasshouse stopped at the instant of the collapse
// (the stasis room: water hanging in the air); the east garden is a hedge
// maze of chrono-bombers you can see over and they can't. The seed vault
// in the north is the exit, where every screen is about to light up.
//
// Pacing: lounge 0.0 → dome 0.4 → stasis glasshouse 0.1 → garden maze
// 0.6 → seed vault 0.3.
function buildGreenhouse() {
  const g = createGrid(W, H, 3);
  const hm = createHeights(W, H);

  // ── ARRIVAL LOUNGE (rows 48-56, cols 22-37): the rest ──
  carve(g, 48, 22, 56, 37);
  lowWall(g, hm, 53, 25, 53, 27, LAYER.KNEE); // benches
  lowWall(g, hm, 53, 32, 53, 34, LAYER.KNEE);
  hWall(g, 57, 23, 36, 8);
  carve(g, 47, 27, 47, 32);

  // ── THE DOME (rows 24-46, cols 18-41): beds and glass pillars ──
  carve(g, 24, 18, 46, 41);
  // Round the edge: the dome's glass ribs.
  for (const [r, c] of [[26, 20], [26, 39], [44, 20], [44, 39], [35, 18], [35, 41]]) tile(g, r, c, 8);
  // Raised beds: knee high, in a ring round the old tree.
  lowWall(g, hm, 30, 24, 30, 27, LAYER.KNEE);
  lowWall(g, hm, 30, 32, 30, 35, LAYER.KNEE);
  lowWall(g, hm, 40, 24, 40, 27, LAYER.KNEE);
  lowWall(g, hm, 40, 32, 40, 35, LAYER.KNEE);
  lowWall(g, hm, 33, 22, 37, 22, LAYER.KNEE);
  lowWall(g, hm, 33, 37, 37, 37, LAYER.KNEE);
  // The old tree in its planter.
  carve(g, 34, 29, 36, 30, 2);
  lowTile(g, hm, 35, 28, LAYER.KNEE);
  lowTile(g, hm, 35, 31, LAYER.KNEE);

  // ── WEST GLASSHOUSE (rows 20-36, cols 3-15): the stasis room ──
  carve(g, 20, 3, 36, 15);
  vWall(g, 20, 36, 16, 8);
  vWall(g, 20, 36, 17, 3);
  carve(g, 27, 16, 29, 17); // the doorway from the dome
  for (const r of [24, 32]) hWall(g, r, 4, 11, 8);
  carve(g, 24, 8, 24, 9);
  carve(g, 32, 5, 32, 6);
  lowWall(g, hm, 22, 5, 22, 9, LAYER.KNEE);
  lowWall(g, hm, 34, 9, 34, 13, LAYER.KNEE);
  lowWall(g, hm, 28, 4, 28, 6, LAYER.KNEE);

  // ── EAST GARDEN (rows 14-44, cols 43-56): the hedge maze ──
  carve(g, 14, 43, 44, 56);
  vWall(g, 24, 46, 42, 3);
  carve(g, 38, 42, 40, 42); // in from the dome
  // Hedges: waist high, so the maze is a maze for your feet, not your eyes.
  const hedge = (r1, c1, r2, c2) => lowWall(g, hm, r1, c1, r2, c2, LAYER.WAIST, 1);
  hedge(40, 43, 40, 52);
  hedge(36, 45, 36, 56);
  hedge(32, 43, 32, 53);
  hedge(28, 46, 28, 56);
  hedge(24, 43, 24, 52);
  hedge(20, 46, 20, 56);
  hedge(34, 47, 35, 47);
  hedge(26, 50, 27, 50);
  hedge(17, 44, 19, 44);
  // A pond at the heart of it.
  lowWall(g, hm, 29, 44, 31, 45, LAYER.KNEE, 8);

  // ── SEED VAULT (rows 4-19, cols 16-41): the exit ──
  carve(g, 4, 16, 19, 41);
  carve(g, 20, 27, 23, 32); // up from the dome
  carve(g, 14, 42, 16, 42); // across to the garden
  for (const c of [20, 26, 33, 38]) {
    carve(g, 8, c, 9, c, 2);
    carve(g, 14, c, 15, c, 2);
  }
  lowWall(g, hm, 11, 22, 11, 24, LAYER.WAIST);
  lowWall(g, hm, 11, 35, 11, 37, LAYER.WAIST);
  hWall(g, 3, 18, 39, 8);
  carve(g, 1, 18, 2, 39);

  return {
    name: "The Greenhouse",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 54.5, dir: -Math.PI / 2 },
    entities: [
      // The dome: gentle.
      foe(21, 28, "glitchling"),
      foe(38, 29, "glitchling"),
      foe(29, 26, "phaseStalker"),
      foe(24, 43, "glitchling"),
      // The garden maze: chrono-bombers among the hedges.
      foe(45, 42, "chronoBomber"),
      foe(55, 34, "chronoBomber"),
      foe(44, 26, "chronoBomber"),
      foe(55, 22, "chronoBomber"),
      foe(49, 16, "phaseStalker"),
      // The seed vault.
      foe(18, 6, "phaseStalker"),
      foe(39, 17, "glitchling"),
      foe(30, 12, "chronoBomber"),
      // ── Pickups ──
      item(23, 50, "health"),
      item(36, 50, "ammo"),
      item(20, 45, "ammo"),
      item(39, 25, "health"),
      item(5, 21, "health"),
      item(13, 35, "ammo"),
      item(55, 44, "health"),
      item(51, 30, "ammo"),
      item(55, 15, "health"),
      item(17, 18, "ammo"),
      item(40, 5, "health"),
      item(29, 17, "weapon", { weaponId: 6 }),
    ],
    exit: { x: 29.5, y: 5.5 },
    secrets: [],
    props: [
      { x: 23, y: 55, type: "potted_plant" },
      { x: 36, y: 55, type: "potted_plant" },
      { x: 30, y: 50, type: "table" },
      { x: 29, y: 51, type: "chair" },
      { x: 22, y: 49, type: "vending_machine" },
      { x: 19, y: 25, type: "potted_plant" },
      { x: 40, y: 25, type: "potted_plant" },
      { x: 19, y: 45, type: "potted_plant" },
      { x: 40, y: 45, type: "potted_plant" },
      { x: 29, y: 38, type: "potted_plant" },
      { x: 30, y: 32, type: "potted_plant" },
      { x: 4, y: 25, type: "potted_plant" },
      { x: 14, y: 30, type: "potted_plant" },
      { x: 8, y: 36, type: "table" },
      { x: 54, y: 43, type: "potted_plant" },
      { x: 44, y: 15, type: "potted_plant" },
      { x: 17, y: 5, type: "potted_plant" },
      { x: 40, y: 12, type: "potted_plant" },
      { x: 24, y: 5, type: "monitor_bank" },
      { x: 35, y: 5, type: "monitor_bank" },
    ],
  };
}

// ── II-6: THE PRECINCT ────────────────────────────────────────────
// Remix of the tutorial station (Chronos PD, Temporal Crimes Division HQ,
// src/data/levels/tutorial.js): where you clocked in, three days ago. Now
// barricaded and dark. You come in where you started that morning, the
// locker room, and the old precinct sentry has sealed it (Rewind's teach).
// The main corridor is barricaded halfway, so the way north is Kael's line:
// down through the lobby, across the turret stream at its mouth, out
// through the range and up the east side to the Supervisor's office, where
// the Captain has dug in. Kael watches from the mezzanine (the old combat
// arena) at the top. The evidence room still has its hidden wall.
//
// Pacing: locker room (teach) 0.5 → corridor 0.3 → the lobby line 0.9 →
// range 0.6 → east corridor 0.4 → the Captain 1.0 → mezzanine 0.2.
function buildPrecinct() {
  const src = TUTORIAL_MAP;
  const g = src.grid.map((row) => [...row]);
  const hm = createHeights(W, H);

  // The locker room's door into the corridor stands open for the teach seal
  // to close (its south way into the lobby is already open floor).
  carve(g, 41, 26, 42, 26);
  // Barricade across the main corridor, halfway: desks and lockers stacked
  // waist-high. You can see and shoot over it; you can't walk it.
  lowWall(g, hm, 35, 27, 35, 32, LAYER.WAIST);
  lowWall(g, hm, 36, 28, 36, 31, LAYER.KNEE);
  // The lobby: the front glass is gone; the line is a row of benches and
  // desks across the middle, the reception desk the anchor.
  carve(g, 57, 25, 57, 34);
  lowWall(g, hm, 51, 23, 51, 25, LAYER.WAIST);
  lowWall(g, hm, 51, 34, 51, 36, LAYER.WAIST);
  lowWall(g, hm, 53, 28, 53, 31, LAYER.WAIST);
  // Break room and armory doors welded; the armory is Kael's store.
  g[30][25] = 3;
  g[31][25] = 3;
  // The range: targets knocked down into cover.
  lowWall(g, hm, 42, 52, 43, 52, LAYER.WAIST);
  // The evidence room was open to the fitness centre; now its hidden wall
  // is a wall, and the only way in.
  vWall(g, 22, 25, 15, 1);
  g[23][15] = 6;
  // The east side corridor stopped one tile short of the main corridor.
  carve(g, 27, 33, 27, 33);
  // The observation deck and the captain's quarters never had a way in:
  // their doors opened onto the fitness centre's and the office's walls.
  carve(g, 15, 5, 15, 5);
  carve(g, 15, 54, 15, 54);
  carve(g, 6, 53, 6, 53);
  // The locker room's north door is welded: Kael's line is the only way.
  g[37][12] = 3;
  // The mezzanine (the old combat arena): Kael's post above the lobby.
  lowWall(g, hm, 8, 12, 8, 14, LAYER.WAIST);
  lowWall(g, hm, 8, 45, 8, 47, LAYER.WAIST);

  const entities = [
    // The corridor below the barricade.
    foe(29, 45, "corruptCop"),
    // The lobby line: his old colleagues, gone wrong, coming in the front.
    foe(24, 56, "corruptCop"),
    foe(35, 56, "corruptCop"),
    foe(30, 56, "henchman"),
    foe(26, 54, "henchman"),
    foe(33, 54, "henchman"),
    // Range.
    foe(43, 39, "sentinel"),
    foe(53, 45, "corruptCop"),
    // East side corridor.
    foe(48, 30, "henchman"),
    // The Captain has dug in at the top of the corridor, below the
    // mezzanine door, with his squad in the Supervisor's office beside him.
    foe(29, 14, "shieldCommander"),
    foe(39, 24, "corruptCop"),
    foe(53, 24, "corruptCop"),
    foe(46, 17, "henchman"),
    // Fitness centre and the north-west.
    foe(10, 21, "henchman"),
    foe(20, 17, "sentinel"),
    // Mezzanine.
    foe(20, 5, "corruptCop"),
    foe(40, 5, "corruptCop"),
    // ── Pickups ──
    item(9, 40, "ammo"),
    item(21, 52, "health"),
    item(39, 52, "ammo"),
    item(37, 43, "health"),
    item(48, 33, "ammo"),
    item(44, 21, "health"),
    item(48, 21, "ammo"),
    item(12, 23, "health"),
    item(55, 4, "health"),
    item(29, 9, "ammo"),
    item(30, 9, "health"),
    // Evidence room.
    item(11, 23, "ammo"),
    item(12, 24, "health"),
  ];

  return {
    name: "The Precinct",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    // The locker room, where you clocked in.
    playerStart: { x: 13.5, y: 43.5, dir: -Math.PI / 2 },
    entities,
    exit: { x: 29.5, y: 3.5 },
    secrets: [{ wallX: 15, wallY: 23, description: "The evidence room: Voss's case file, never logged out" }],
    props: [
      // Everything the tutorial set out, still there, and the barricades.
      ...src.props.filter((p) => g[p.y]?.[p.x] === 0),
      { x: 27, y: 37, type: "barrier" },
      { x: 32, y: 37, type: "barrier" },
      { x: 23, y: 50, type: "barrier" },
      { x: 36, y: 50, type: "barrier" },
      { x: 38, y: 55, type: "crate" },
    ],
  };
}

// ── II-7: THE FOUNDRY ─────────────────────────────────────────────
// Where the C-series suits were built. In through the Time-Lock teach
// corridor (a sentry line you cannot cross until Kael's shield catches it),
// through the rack hall where empty suit frames hang in rows and one rack
// stands empty, and into the casting floor, the Hound's den. The den
// borrows the arena Chrono Foundry's language at scale: energy pylons
// bent into Ls, tech brackets, metal stair blocks on the diagonal and a
// casting pit in the middle, with low cover to break a quill volley and
// long clear lanes where its lunge will come down.
//
// Pacing: start room 0.2 → teach corridor 0.5 → rack hall 0.6 → the den 1.0.
function buildFoundry() {
  const g = createGrid(W, H, 7);
  const hm = createHeights(W, H);

  // ── START ROOM (rows 51-56, cols 22-37) ──
  carve(g, 51, 22, 56, 37);
  lowWall(g, hm, 54, 24, 55, 24, LAYER.WAIST);
  lowWall(g, hm, 54, 35, 55, 35, LAYER.WAIST);
  // ── TEACH CORRIDOR (rows 43-50, cols 27-32): the sentry line at row 46 ──
  carve(g, 43, 27, 50, 32);
  // The sentry's housing in the west wall.
  carve(g, 46, 26, 46, 26);

  // ── RACK HALL (rows 30-42, cols 8-51): the empty suits ──
  carve(g, 30, 8, 42, 51);
  // Racks: lines of suit frames (full-height metal), gaps to walk.
  for (const c of [12, 18, 24, 35, 41, 47]) {
    carve(g, 32, c, 34, c, 3);
    carve(g, 38, c, 40, c, 3);
  }
  // One rack stands empty: C-0016's (a gap where its frame should be).
  carve(g, 32, 30, 34, 30, 3);
  lowWall(g, hm, 38, 29, 40, 29, LAYER.KNEE, 3);
  lowWall(g, hm, 36, 9, 36, 11, LAYER.WAIST);
  lowWall(g, hm, 36, 48, 36, 50, LAYER.WAIST);

  // ── THE DEN: casting floor (rows 4-28, cols 8-51) ──
  carve(g, 4, 8, 28, 51);
  hWall(g, 29, 8, 51, 7);
  carve(g, 29, 27, 29, 32); // the way in
  // Energy pylons bent into Ls, one per quarter.
  const pylon = (r, c, dr, dc) => {
    tile(g, r, c, 4);
    tile(g, r + dr, c, 4);
    tile(g, r, c + dc, 4);
  };
  pylon(9, 15, 1, 1);
  pylon(9, 44, 1, -1);
  pylon(23, 15, -1, 1);
  pylon(23, 44, -1, -1);
  // Tech brackets (U-shapes) facing the middle.
  for (const [r, c] of [[12, 22], [12, 36]]) {
    carve(g, r, c, r, c + 1, 2);
    tile(g, r + 1, c, 2);
    tile(g, r + 1, c + 1, 2);
  }
  for (const [r, c] of [[19, 22], [19, 36]]) {
    carve(g, r + 1, c, r + 1, c + 1, 2);
    tile(g, r, c, 2);
    tile(g, r, c + 1, 2);
  }
  // Stair blocks on the diagonal, and the casting pit.
  for (const [r, c] of [[7, 27], [8, 29], [24, 31], [25, 29]]) tile(g, r, c, 3);
  carve(g, 15, 29, 16, 30, 9);
  // Low cover for the volleys: slag blocks and a pour trough.
  lowWall(g, hm, 17, 11, 17, 13, LAYER.WAIST);
  lowWall(g, hm, 17, 46, 17, 48, LAYER.WAIST);
  lowWall(g, hm, 6, 20, 6, 22, LAYER.WAIST);
  lowWall(g, hm, 6, 37, 6, 39, LAYER.WAIST);
  lowWall(g, hm, 26, 18, 26, 20, LAYER.KNEE);
  lowWall(g, hm, 26, 39, 26, 41, LAYER.KNEE);
  // Corner metal pillars, like the arena's.
  for (const [r, c] of [[5, 10], [5, 49], [27, 10], [27, 49]]) tile(g, r, c, 3);

  return {
    name: "The Foundry",
    width: W,
    height: H,
    grid: g,
    heightMap: hm,
    playerStart: { x: 29.5, y: 54.5, dir: -Math.PI / 2 },
    entities: [
      // THE HOUND: across the casting pit, facing the way in.
      { x: 29.5, y: 11.5, type: "enemy", enemyType: "boss" },
      // Rack hall: what the Foundry still makes.
      foe(10, 31, "echoDrone"),
      foe(49, 31, "echoDrone"),
      foe(21, 36, "riftLeaper"),
      foe(38, 36, "riftLeaper"),
      foe(15, 41, "phaseStalker"),
      foe(44, 41, "phaseStalker"),
      // The den's edges.
      foe(10, 26, "echoDrone"),
      foe(49, 26, "echoDrone"),
      // ── Pickups ──
      item(23, 52, "ammo"),
      item(36, 52, "health"),
      item(9, 41, "health"),
      item(50, 41, "ammo"),
      item(29, 31, "ammo"),
      item(11, 7, "health"),
      item(48, 7, "health"),
      item(11, 21, "ammo"),
      item(48, 21, "ammo"),
      item(29, 27, "health"),
    ],
    exit: null, // Boss level: it ends on the kill
    isBossLevel: true,
    secrets: [],
    props: [
      { x: 23, y: 51, type: "crate" },
      { x: 36, y: 56, type: "crate" },
      { x: 9, y: 33, type: "weapon_rack" },
      { x: 50, y: 33, type: "weapon_rack" },
      { x: 13, y: 36, type: "locker" },
      { x: 19, y: 36, type: "locker" },
      { x: 40, y: 36, type: "locker" },
      { x: 46, y: 36, type: "locker" },
      { x: 30, y: 36, type: "barrier" },
      { x: 9, y: 5, type: "crate" },
      { x: 50, y: 5, type: "crate" },
      { x: 9, y: 27, type: "ammo_crate" },
      { x: 50, y: 27, type: "ammo_crate" },
    ],
  };
}

/** Every Act II map, built once, keyed by the id its level entry names. */
export const ACT2_MAPS = {
  evac_shafts: buildEvacShafts(),
  salvage_deck: buildSalvageDeck(),
  maintenance_spine: buildMaintenanceSpine(),
  transit_loop: buildTransitLoop(),
  greenhouse: buildGreenhouse(),
  precinct: buildPrecinct(),
  foundry: buildFoundry(),
};
