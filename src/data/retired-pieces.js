// Pieces taken out of a look table, and what a save holding one gets instead.
//
// To retire a piece: remove its entry from the table, then add
// `oldId: "replacementId"` under its field here. The replacement must be an id
// that is still in the same table. Never delete a line from this file — a save
// can hold a retired id forever.

/** Look field -> { retired id -> replacement id in the same table }. */
export const RETIRED_PIECES = Object.freeze({
  color: Object.freeze({}),
  skinTone: Object.freeze({}),
  hair: Object.freeze({}),
  eye: Object.freeze({}),
  armor: Object.freeze({}),
  helmet: Object.freeze({}),
  visor: Object.freeze({}),
  shoulder: Object.freeze({}),
  weaponSkin: Object.freeze({}),
  loadout: Object.freeze({}),
  backstory: Object.freeze({}),
  voice: Object.freeze({}),
  frame: Object.freeze({}),
  cape: Object.freeze({}),
  body: Object.freeze({}),
  camo: Object.freeze({}),
});
