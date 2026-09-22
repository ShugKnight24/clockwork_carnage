/**
 * Block table for the voxel Forge. Ids are stable bytes stored in saves; only
 * ever append. Ids 1–9 equal the legacy tile ids so old maps convert 1:1.
 * `faces` names the art key per face kind (see rendering/voxel/atlas.js):
 * "wall:<tile>" = the tile's wall art, "deck:floor"/"deck:ceil" = deck art,
 * "nat:<name>" = natural-block painter.
 */
export const AIR = 0;
export const BEDROCK = 15;
export const FACE = { TOP: 0, SIDE: 1, BOTTOM: 2 };

const wall = (t) => ({ top: `wall:${t}`, side: `wall:${t}`, bottom: `wall:${t}` });
const nat = (n) => ({ top: `nat:${n}`, side: `nat:${n}`, bottom: `nat:${n}` });
const station = (n) => ({ top: `nat:${n}_top`, side: `nat:${n}`, bottom: `nat:${n}` });

export const BLOCKS = [
  { id: 0, name: "Air", kind: "air", faces: null, hardness: 0, color: "#000000" },
  { id: 1, name: "Stone", kind: "solid", faces: wall(1), hardness: 1, color: "#6b7280" },
  { id: 2, name: "Tech", kind: "solid", faces: wall(2), hardness: 1, color: "#2f6f8f" },
  { id: 3, name: "Metal", kind: "solid", faces: wall(3), hardness: 1.5, color: "#8a96a3" },
  { id: 4, name: "Energy", kind: "solid", faces: wall(4), hardness: 1, emissive: [0.2, 0.9, 1.0], color: "#22e6ff" },
  { id: 5, name: "Door", kind: "door", faces: wall(5), hardness: 1, color: "#b08a3a" },
  { id: 6, name: "Secret", kind: "solid", faces: wall(6), hardness: 1, color: "#5a4a6e" },
  { id: 7, name: "Boss", kind: "solid", faces: wall(7), hardness: 2, color: "#7a1426" },
  { id: 8, name: "Glass", kind: "glass", faces: wall(8), hardness: 0.5, color: "#9fd8ff" },
  { id: 9, name: "Rift", kind: "solid", faces: wall(9), hardness: 1, emissive: [0.8, 0.3, 1.0], color: "#c060ff" },
  { id: 10, name: "Dirt", kind: "solid", faces: nat("dirt"), hardness: 0.5, color: "#6a4a2c" },
  { id: 11, name: "Grass", kind: "solid", faces: { top: "nat:grass_top", side: "nat:grass_side", bottom: "nat:dirt" }, hardness: 0.6, color: "#4f8a3a" },
  { id: 12, name: "Sand", kind: "solid", faces: nat("sand"), hardness: 0.4, color: "#d8c890" },
  { id: 13, name: "Rock", kind: "solid", faces: nat("rock"), hardness: 1.5, color: "#5b5f66" },
  { id: 14, name: "Ore", kind: "solid", faces: nat("ore"), hardness: 2, emissive: [0.15, 0.4, 0.5], color: "#3f7f8f" },
  { id: 15, name: "Bedrock", kind: "solid", faces: nat("bedrock"), hardness: Infinity, color: "#1d1f23" },
  { id: 16, name: "Workbench", kind: "solid", faces: station("workbench"), hardness: 1, color: "#8a6a3a" },
  { id: 17, name: "Anvil", kind: "solid", faces: station("anvil"), hardness: 1.5, color: "#4a4e57" },
  { id: 18, name: "Forge", kind: "solid", faces: station("forge"), hardness: 1.5, color: "#5a3428", emissive: [0.9, 0.35, 0.1] },
];

export const isSolid = (id) => id !== AIR && BLOCKS[id]?.kind !== "air";
/** Opaque blocks hide the faces of their neighbours; glass and doors do not. */
export const isOpaque = (id) => isSolid(id) && BLOCKS[id].kind === "solid";

/** Legacy builder layer count (0–5) → block height; a full wall is 3 blocks. */
export const LAYER_TO_BLOCKS = [0, 1, 1, 2, 2, 3];
