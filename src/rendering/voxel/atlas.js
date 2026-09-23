/**
 * One TEXTURE_2D_ARRAY layer per distinct face key. Keys come from
 * BLOCKS[].faces: "wall:<tile>" (existing 512px wall art, downsampled),
 * "deck:floor"/"deck:ceil" (existing deck art), "nat:<name>" (natural-art.js).
 * The layer table is pure so the mesher can use it in node; buildAtlas paints.
 */
import { BLOCKS, FACE } from "../../world/blocks.js";
import { paintNatural } from "./natural-art.js";

export const ATLAS_SIZE = 256;

export function faceKeys() {
  const keys = [];
  for (const b of BLOCKS) if (b.faces) for (const k of [b.faces.top, b.faces.side, b.faces.bottom]) if (!keys.includes(k)) keys.push(k);
  return keys;
}

export function atlasLayerTable() {
  const keys = faceKeys();
  const t = new Uint8Array(BLOCKS.length * 3);
  for (const b of BLOCKS) if (b.faces) {
    t[b.id * 3 + FACE.TOP] = keys.indexOf(b.faces.top);
    t[b.id * 3 + FACE.SIDE] = keys.indexOf(b.faces.side);
    t[b.id * 3 + FACE.BOTTOM] = keys.indexOf(b.faces.bottom);
  }
  return t;
}

export const layerOfTable = (t, id, face) => t[id * 3 + face];

function scaled(src, size, smooth) {
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = smooth; g.drawImage(src, 0, 0, size, size);
  return c;
}

/**
 * @param {"legacy"|"comic"|"modern"} style
 * @param {{ walls: Record<number, HTMLCanvasElement[]>, deck: {floor, ceil}, legacyWalls?: Record<number, HTMLCanvasElement> }} art
 *   caller-resolved art for the act: for comic/modern the mip chains from buildWallSet(...)[tile][0]
 *   and buildDeckSet(...); for legacy the 256px canvases from generateWallTextures().
 */
export function buildAtlas(style, art) {
  const keys = faceKeys();
  const canvases = keys.map((k) => {
    const [kind, name] = k.split(":");
    if (kind === "wall") {
      const src = style === "legacy" ? art.legacyWalls[Number(name)] : art.walls[Number(name)][0];
      return scaled(src, ATLAS_SIZE, style !== "legacy");
    }
    if (kind === "deck") return scaled(art.deck[name], ATLAS_SIZE, style !== "legacy");
    return paintNatural(name, ATLAS_SIZE, style);
  });
  const table = atlasLayerTable();
  return { canvases, count: canvases.length, layerOf: (id, face) => table[id * 3 + face], table };
}
