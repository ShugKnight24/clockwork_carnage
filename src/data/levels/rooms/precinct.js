/**
 * Wall ids for the rooms the campaign's floors are dressed with
 * (src/data/levels/station-dressing.js places them, and
 * src/rendering/env/rooms/precinct.js paints them).
 *
 * The prologue's rooms are one precinct, painted once. The floors under it
 * are the same force's building and the station's working levels, so they
 * share those walls and add what the prologue never needed: holding cells,
 * interview rooms behind one-way glass, booking, dispatch, a case board, the
 * evidence intake hatch, and for the floors that are not police, the labs,
 * the server rooms and the reactor's plant.
 */
export const PRECINCT_WALLS = {
  CELL_BARS: 120,
  CELL_DOOR: 121,
  CELL_BACK: 122,
  ONE_WAY: 123,
  INTERVIEW: 124,
  BOOKING: 125,
  DISPATCH: 126,
  CASE_BOARD: 127,
  INTAKE: 128,
  LAB_SHELVES: 129,
  FUME_HOOD: 130,
  LAB_BOARD: 131,
  SERVER_RACK: 132,
  GAUGES: 133,
  RADIATION: 134,
  // Wayfinding, one sign per kind of room, hung where its door is.
  SIGN_HOLDING: 135,
  SIGN_INTERVIEW: 136,
  SIGN_EVIDENCE: 137,
  SIGN_DISPATCH: 138,
  SIGN_BRIEFING: 139,
  SIGN_RECORDS: 140,
  SIGN_RESEARCH: 141,
  SIGN_DATA: 142,
  SIGN_REACTOR: 143,
  SIGN_DETENTION: 144,
  SIGN_BOOKING: 145,
  // The labs' plain wall, for their corridors.
  LAB_WALL: 146,
};

/** The prologue rooms' walls the floors reuse, by what they are. */
export const SHARED_WALLS = {
  // src/rendering/env/rooms/corridor.js
  CORRIDOR: 40,
  PHOTOS: 41,
  NOTICE: 42,
  WANTED: 43,
  FIRE: 44,
  CREST: 51,
  COFFEE: 52,
  FRIDGE: 53,
  ROSTER: 54,
  ARMORY_CAGE: 55,
  ARMORY_AMMO: 56,
  ARMORY_SIGNOUT: 57,
  SINK: 59,
  SIGN_ARMORY: 48,
  SIGN_LOCKERS: 49,
  SIGN_BREAK: 47,
  // src/rendering/env/locker-art.js
  LOCKERS_A: 10,
  LOCKERS_B: 11,
  LOCKERS_C: 12,
  LOCKERS_E: 35,
  LOCKERS_G: 37,
  LOCKERS_SPARE_1: 39,
  LOCKERS_SPARE_2: 175,
  LOCKERS_SPARE_3: 176,
  // src/rendering/env/rooms/gym.js: the evidence cage behind the gym.
  CAGE: 70,
  CAGE_DOOR: 71,
  SHELVES_A: 72,
  SHELVES_B: 73,
  CUSTODY_LOG: 74,
  ACOUSTIC: 75,
  // src/rendering/env/rooms/office.js
  COMMENDATIONS: 80,
  BLIND: 81,
  BINDERS: 82,
  OFFICE_NOTICES: 83,
  STATION_MAP: 84,
  CLOCK: 86,
  OFFICE_GLASS: 87,
  MONITORS: 90,
  MONITORS_CASE: 91,
  BOOKCASE: 94,
  // src/rendering/env/rooms/arena.js: R&D's racked crates and grid panel.
  SIM_GRID: 100,
  CRATES: 102,
};
