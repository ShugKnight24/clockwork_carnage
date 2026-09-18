/**
 * In-world Paradox Lord sprites, cut from the cutscene villain models so the
 * boss the player fights is the same figure the story shows.
 *
 * The cutscene model's layers are regrouped into an ordered part list: runs of
 * static layers merge into one bitmap, while the arms (posed per attack state),
 * the turning halo and core gear, the pendulum and the emissive layers stay
 * separate so they keep their motion in-world.
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
  const parts = [];
  let run = null;
  model.layers.forEach((layer, i) => {
    const m = scopeIds(layer.markup, i);
    const a = layer.anim;
    let role = null;
    if (i === 0 && layer.blend) role = "aura";
    else if (layer.blend) role = "glow";
    else if (a?.type === "sway" && a.pivot && Math.abs(a.pivot[0]) > 50) role = a.pivot[0] < 0 ? "armL" : "armR";
    else if (a && (a.type === "spin" || a.type === "float" || (a.type === "sway" && (a.amp ?? 0) >= 0.05))) role = "anim";
    if (!role) {
      if (!run) {
        run = { role: "static", markup: "" };
        parts.push(run);
      }
      run.markup += m;
      return;
    }
    run = null;
    parts.push({ role, markup: m, anim: a || null, blend: layer.blend ? "lighter" : null, opacity: layer.opacity ?? 1 });
  });
  return parts;
}

function bossModel(key, scale) {
  const model = VILLAIN[key];
  const k = key === "villain_final" ? 1.1 : key === "villain_form2" ? 1.06 : 1;
  return {
    boss: true,
    box: model.box,
    defs: model.defs,
    // Feet of the villain rig sit at y ≈ 150 (phase-1 units, scaled by k).
    anchor: 150 * k,
    pivot: 150 * k,
    scale,
    parts: regroup(model),
  };
}

export const BOSSES = {
  boss: () => bossModel("villain", 0.64),
  boss_form2: () => bossModel("villain_form2", 0.64),
  boss_form3: () => bossModel("villain_final", 0.66),
};
