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

/** Every Act II map, built once, keyed by the id its level entry names. */
export const ACT2_MAPS = {
  evac_shafts: buildEvacShafts(),
};
