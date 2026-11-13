/**
 * Body frames: the silhouette an agent's suit is built on.
 *
 * The rig (models/hero.js) draws one armoured body from joint data. A frame
 * adds sculpted layers over it, positioned from the same joints, scales the
 * parts that define a silhouette (width, shoulders) and may hide stock
 * layers it replaces. The suit (armour style), shoulder choice, gear and
 * colours all still apply on top, so any suit can be worn on any frame.
 *
 * The frames themselves live in the wardrobe themes (wardrobe-themes/);
 * this module hands the rig a frame's shape and layers by id.
 */
import { frameArt } from "./wardrobe-themes/index.js";

/** A frame's silhouette numbers and body treatments (an unknown id is the issued suit). */
export const frameShape = (id) => frameArt(id).shape;

/**
 * Frame layers for a pose.
 * @param {string} id frame id
 * @param {{arms: object[], legs: object[]}} P pose
 * @param {{ energy: string, pal: object }} c resolved look
 * @param {object} K the rig's kit for painters
 * @returns {{ under: string, legs: string, torso: string, arms: string, glow: string }}
 */
export const frameLayers = (id, P, c, K) => frameArt(id).layers(P, c, K);
