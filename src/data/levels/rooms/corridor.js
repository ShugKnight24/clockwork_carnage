/**
 * The station's corridor, dressed on the prologue map after the floor plan is
 * built (src/data/levels/tutorial.js): its own wall ids (painted by
 * src/rendering/env/rooms/corridor.js), lamps, props and room boxes.
 *
 * Covers the public half of the station: the main corridor (cols 27-32,
 * rows 13-48) with a sign at each branch, the break room, the armory and
 * the entrance lobby. The pillars that stood in for their furniture are
 * floor again, the furniture's props on them.
 */

/** This room's wall ids (painted by src/rendering/env/rooms/corridor.js). */
export const CORRIDOR_WALLS = {
  WALL: 40,
  PHOTOS: 41,
  NOTICE: 42,
  WANTED: 43,
  FIRE: 44,
  SIGN_FITNESS: 45,
  SIGN_SUPERVISOR: 46,
  SIGN_BREAK: 47,
  SIGN_ARMORY: 48,
  SIGN_LOCKERS: 49,
  SIGN_RANGE: 50,
  CREST: 51,
  BREAK_COFFEE: 52,
  BREAK_FRIDGE: 53,
  BREAK_ROSTER: 54,
  ARMORY_CAGE: 55,
  ARMORY_AMMO: 56,
  ARMORY_SIGNOUT: 57,
  LOBBY_CREST: 58,
  BREAK_SINK: 59,
};
const W = CORRIDOR_WALLS;

const WARM = [255, 228, 196];
const COOL = [210, 224, 255];

// The corridor's walls between the branches, rotated by row.
const WEST = [W.WALL, W.NOTICE, W.WALL, W.PHOTOS, W.WALL, W.WANTED];
const EAST = [W.WALL, W.WANTED, W.WALL, W.NOTICE, W.WALL, W.PHOTOS];

export const room = {
  /** Wall ids this room paints (the map's ownWalls). */
  ownWalls: Object.values(W),
  /** Lamps, on while the player is in one of `boxes` (TutorialSystem._syncRoomLights). */
  lights: [
    { room: "corridor", x: 29.9, y: 17.5, color: WARM, radius: 5, intensity: 0.55 },
    { room: "corridor", x: 29.9, y: 24.5, color: WARM, radius: 5, intensity: 0.55 },
    { room: "corridor_s", x: 29.9, y: 32.5, color: WARM, radius: 5, intensity: 0.55 },
    { room: "corridor_s", x: 29.9, y: 39.0, color: WARM, radius: 5, intensity: 0.55 },
    { room: "corridor_s", x: 29.9, y: 45.5, color: WARM, radius: 5, intensity: 0.55 },
    // Break room: the pendant over the tables, the kitchenette's under-cabinet light.
    { room: "breakroom", x: 22.0, y: 32.5, color: WARM, radius: 4.5, intensity: 0.32 },
    { room: "breakroom", x: 20.5, y: 31.2, color: [255, 214, 160], radius: 3.5, intensity: 0.28 },
    // Armory: cold task light down the middle.
    { room: "armory", x: 36.5, y: 32.0, color: COOL, radius: 4, intensity: 0.35 },
    { room: "armory", x: 39.5, y: 32.0, color: COOL, radius: 4, intensity: 0.35 },
    // Lobby: the crest wall's wash, and over the front desk.
    { room: "lobby", x: 24.5, y: 50.6, color: [255, 214, 160], radius: 4.5, intensity: 0.38 },
    { room: "lobby", x: 35.5, y: 50.6, color: [255, 214, 160], radius: 4.5, intensity: 0.38 },
    { room: "lobby", x: 29.9, y: 54.0, color: WARM, radius: 5, intensity: 0.5 },
  ],
  /** Room boxes by name: { x0, y0, x1, y1 } in cells. */
  boxes: {
    corridor: { x0: 27, y0: 13, x1: 32, y1: 27 },
    corridor_s: { x0: 27, y0: 28, x1: 32, y1: 47 },
    breakroom: { x0: 18, y0: 29, x1: 26, y1: 35 },
    armory: { x0: 33, y0: 29, x1: 41, y1: 35 },
    lobby: { x0: 18, y0: 48, x1: 41, y1: 57 },
  },
  /** Props to add, and cells whose existing props to drop. */
  props: [
    // Corridor: plants at the north end.
    { x: 27, y: 14, type: "potted_plant" }, { x: 32, y: 14, type: "potted_plant" },
    // Break room: four chairs round the two tables, the vending machine and a plant in the corners.
    { x: 21, y: 31, type: "chair" }, { x: 23, y: 31, type: "chair" },
    { x: 21, y: 33, type: "chair" }, { x: 23, y: 33, type: "chair" },
    { x: 19, y: 34, type: "vending_machine" }, { x: 25, y: 34, type: "potted_plant" },
    // Armory: ammo crates by the lockers.
    { x: 35, y: 34, type: "ammo_crate" }, { x: 40, y: 30, type: "ammo_crate" },
    // Lobby: the front desk's chair, the waiting area, plants by the crests.
    { x: 30, y: 52, type: "chair" },
    { x: 25, y: 55, type: "chair" }, { x: 34, y: 55, type: "chair" },
    { x: 22, y: 49, type: "potted_plant" }, { x: 37, y: 49, type: "potted_plant" },
  ],
  dropProps: [
    { x: 20, y: 31 }, { x: 24, y: 31 }, { x: 20, y: 33 },
  ],
  /** Rewrite the room's cells. `h` has the floor plan's carve/hWall/vWall/pillar/door. */
  dress(g) {
    const set = (r, c, v) => {
      if (g[r][c] === 3) g[r][c] = v;
    };
    // Furniture stand-ins back to floor: the break room's table, the armory's
    // racks, the lobby's front desk and waiting chairs.
    for (const [r, c] of [[32, 21], [32, 23], [33, 36], [33, 38], [33, 40], [53, 28], [53, 29], [53, 30], [53, 31], [55, 24], [55, 35]]) g[r][c] = 0;

    // ── Main corridor: signs at the branches, the crest, two fire points.
    set(19, 26, W.SIGN_FITNESS);
    set(19, 33, W.SIGN_SUPERVISOR);
    set(29, 26, W.SIGN_BREAK);
    set(29, 33, W.SIGN_ARMORY);
    set(40, 26, W.SIGN_LOCKERS);
    set(40, 33, W.SIGN_RANGE);
    set(27, 33, W.CREST);
    set(24, 26, W.FIRE);
    set(45, 33, W.FIRE);
    for (let r = 13; r <= 48; r++) {
      set(r, 26, WEST[r % WEST.length]);
      set(r, 33, EAST[r % EAST.length]);
    }
    set(12, 27, W.WALL);
    set(12, 32, W.WALL);

    // ── Break room: fridge, coffee, sink along the north wall; the roster facing the door.
    set(29, 19, W.BREAK_FRIDGE);
    set(29, 20, W.BREAK_COFFEE);
    set(29, 21, W.BREAK_SINK);
    set(29, 23, W.NOTICE);
    set(32, 18, W.BREAK_ROSTER);
    set(35, 21, W.PHOTOS);
    set(35, 23, W.FIRE);
    for (let c = 18; c <= 25; c++) {
      set(29, c, W.WALL);
      set(35, c, W.WALL);
    }
    for (let r = 30; r <= 34; r++) set(r, 18, W.WALL);

    // ── Armory: caged racks and ammo lockers round three walls, the sign-out by the door.
    set(29, 35, W.ARMORY_SIGNOUT);
    const ARM = [W.ARMORY_CAGE, W.ARMORY_CAGE, W.ARMORY_AMMO];
    for (let c = 34; c <= 40; c++) {
      set(29, c, ARM[c % 3]);
      set(35, c, ARM[(c + 1) % 3]);
    }
    for (let r = 30; r <= 34; r++) set(r, 41, ARM[(r + 2) % 3]);

    // ── Lobby: a crest either side of the corridor mouth, boards on the side walls.
    set(48, 24, W.LOBBY_CREST);
    set(48, 35, W.LOBBY_CREST);
    set(48, 23, W.PHOTOS);
    set(48, 36, W.NOTICE);
    for (const c of [22, 25, 34, 37]) set(48, c, W.WALL);
    const SIDE = [W.WALL, W.WANTED, W.WALL, W.NOTICE, W.WALL, W.WALL];
    for (let r = 49; r <= 54; r++) {
      set(r, 18, SIDE[r % 6]);
      set(r, 41, SIDE[(r + 3) % 6]);
    }
    for (const [r, c] of [[55, 19], [55, 20], [55, 21], [56, 21], [57, 21], [55, 38], [55, 39], [55, 40], [56, 38], [57, 38]]) set(r, c, W.WALL);
  },
};
