/** The Chronos PD station's own wall types (src/rendering/env/locker-art.js paints them). */
export const STATION_WALLS = {
  LOCKERS_A: 10,
  LOCKERS_B: 11,
  LOCKERS_C: 12,
  LOCKERS_D: 13,
  LOCKERS_MINE: 14,
  LOCKERS_MINE_LIT: 15,
  LOCKERS_MINE_OPEN: 16,
  GYM: 17,
  RANGE: 18,
  GYM_BOARD: 19,
  GYM_RACK: 20,
  GYM_PAD: 21,
  RANGE_SIGN: 22,
  // The firing range (src/rendering/env/range-art.js).
  RANGE_BACKSTOP: 23,
  RANGE_LANE_1: 24,
  RANGE_LANE_2: 25,
  RANGE_LANE_3: 26,
  RANGE_BOOTH: 27,
  RANGE_BOOTH_CTRL_1: 28,
  RANGE_BOOTH_CTRL_2: 29,
  RANGE_RULES: 30,
  RANGE_PPE: 31,
  RANGE_DIST_5: 32,
  RANGE_DIST_10: 33,
  RANGE_TARGETS: 34,
};

export const WALL_COLORS = {
  1: { r: 80, g: 80, b: 100 }, // Stone - blue-grey
  2: { r: 40, g: 80, b: 120 }, // Tech - dark blue
  3: { r: 100, g: 100, b: 110 }, // Metal - silver
  4: { r: 60, g: 20, b: 120 }, // Energy - purple
  5: { r: 120, g: 80, b: 30 }, // Door - bronze
  6: { r: 78, g: 78, b: 98 }, // Secret - looks like stone
  7: { r: 30, g: 10, b: 60 }, // Boss - dark purple
  8: { r: 100, g: 140, b: 160 }, // Glass - light blue
  9: { r: 20, g: 60, b: 80 }, // Temporal rift
  // Chronos PD (src/rendering/env/locker-art.js): locker banks, the cadet's
  // locker (lit, open), the gym's padded wall, the range's baffles.
  10: { r: 44, g: 64, b: 104 },
  11: { r: 44, g: 64, b: 104 },
  12: { r: 44, g: 64, b: 104 },
  13: { r: 44, g: 64, b: 104 },
  14: { r: 44, g: 64, b: 104 },
  15: { r: 120, g: 90, b: 50 },
  16: { r: 44, g: 64, b: 104 },
  17: { r: 50, g: 62, b: 90 },
  18: { r: 46, g: 52, b: 62 },
  19: { r: 50, g: 62, b: 90 },
  20: { r: 54, g: 60, b: 70 },
  21: { r: 60, g: 90, b: 150 },
  22: { r: 46, g: 52, b: 62 },
  23: { r: 52, g: 58, b: 66 },
  24: { r: 52, g: 58, b: 66 },
  25: { r: 52, g: 58, b: 66 },
  26: { r: 52, g: 58, b: 66 },
  27: { r: 70, g: 84, b: 100 },
  28: { r: 70, g: 84, b: 100 },
  29: { r: 70, g: 84, b: 100 },
  30: { r: 90, g: 92, b: 96 },
  31: { r: 90, g: 92, b: 96 },
  32: { r: 46, g: 52, b: 62 },
  33: { r: 46, g: 52, b: 62 },
  34: { r: 90, g: 92, b: 96 },
};

// The station's rooms paint their own walls (src/rendering/env/rooms/, ids
// 40-119); the minimap and the Legacy fallback texture see them as station
// grey, a shade per room.
for (let id = 40; id <= 119; id++) {
  const room = Math.floor((id - 40) / 20); // corridor, gym, office, sim hall
  WALL_COLORS[id] ??= [
    { r: 78, g: 82, b: 90 },
    { r: 52, g: 64, b: 92 },
    { r: 92, g: 72, b: 56 },
    { r: 40, g: 70, b: 96 },
  ][room];
}
// The campaign floors' rooms (src/data/levels/rooms/precinct.js, 120-146):
// the custody rooms in the station's blue-grey, the labs and plant warmer.
for (let id = 120; id <= 146; id++) {
  WALL_COLORS[id] ??= (id >= 129 && id <= 134) || id === 146 ? { r: 70, g: 84, b: 96 } : { r: 60, g: 66, b: 80 };
}
// The prologue's east wing (src/data/levels/rooms/, ids 180-236, clear of
// the campaign floors' so either can grow): the halls, R&D, dispatch, the
// atrium, holding and interview, each its own shade on the minimap.
for (const [from, to, colour] of [
  [180, 191, { r: 78, g: 82, b: 90 }],
  [192, 203, { r: 150, g: 160, b: 172 }],
  [204, 211, { r: 96, g: 84, b: 70 }],
  [212, 217, { r: 120, g: 128, b: 138 }],
  [218, 227, { r: 112, g: 124, b: 110 }],
  [228, 232, { r: 52, g: 54, b: 62 }],
  [233, 236, { r: 110, g: 100, b: 88 }],
]) {
  for (let id = from; id <= to; id++) WALL_COLORS[id] ??= colour;
}

// Entity types for map placement
// E = enemy spawn, P = player start, H = health, A = ammo, W = weapon pickup
// K = key, S = secret trigger, D = door trigger, B = boss, X = exit

// TODO: Add additional variety to Arena map... procedurally generate or randomize, otherwise it gets repetitive

