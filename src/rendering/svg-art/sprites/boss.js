/**
 * In-world Paradox Lord sprites, cut from the cutscene villain models so the
 * boss the player fights is the same figure the story shows.
 *
 * The cutscene model has a dozen animated layers; in-world that is regrouped
 * into six bitmaps — aura, back, left arm, right arm, front body, emissive — so
 * the arms can be posed (raised for a windup, slammed for an attack) with plain
 * canvas rotations.
 */

import { MODELS as VILLAIN } from "../models/villain.js";

/** Suffix every id a layer declares so layers can share one SVG document. */
function scopeIds(markup, tag) {
  const ids = new Set();
  for (const m of markup.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);
  let out = markup;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`id="${esc}"`, "g"), `id="${id}_${tag}"`)
      .replace(new RegExp(`#${esc}([")])`, "g"), `#${id}_${tag}$1`);
  }
  return out;
}

function regroup(model) {
  const parts = { aura: "", back: "", armL: "", armR: "", front: "", glow: "" };
  const pivots = {};
  let seenArm = false;
  model.layers.forEach((layer, i) => {
    const m = scopeIds(layer.markup, i);
    const a = layer.anim;
    const blend = layer.blend;
    if (i === 0 && blend) {
      parts.aura += m;
    } else if (blend === "lighter") {
      // Rays sit behind the body with the aura; the eye/core glow and motes go on top.
      if (a?.type === "spin") parts.aura += m;
      else parts.glow += m;
    } else if (a?.type === "sway" && a.pivot && Math.abs(a.pivot[0]) > 50) {
      const key = a.pivot[0] < 0 ? "armL" : "armR";
      parts[key] += m;
      pivots[key] = a.pivot;
      seenArm = true;
    } else {
      parts[seenArm ? "front" : "back"] += m;
    }
  });
  return { parts, pivots };
}

function bossModel(key, scale) {
  const model = VILLAIN[key];
  const { parts, pivots } = regroup(model);
  const k = key === "villain_final" ? 1.1 : key === "villain_form2" ? 1.06 : 1;
  return {
    boss: true,
    box: model.box,
    defs: model.defs,
    // Feet of the villain rig sit at y = 152 (phase-1 units, scaled by k).
    anchor: 150 * k,
    pivot: 150 * k,
    scale,
    parts,
    pivots,
  };
}

export const BOSSES = {
  boss: () => bossModel("villain", 0.64),
  boss_form2: () => bossModel("villain_form2", 0.64),
  boss_form3: () => bossModel("villain_final", 0.66),
};
