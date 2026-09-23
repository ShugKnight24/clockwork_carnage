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
import { mix } from "./kit.js";

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

/* ── Realistic ────────────────────────────────────────────────────────────
 * The cutscene rig is shared with Modern, so the Realistic boss is derived
 * from its markup: ink outlines become a soft darker edge, the rim-light pass
 * is dropped for edge occlusion and wear, the armour gradients are muted and
 * the aura is dimmed. Emissive colours (glow layers, core, cracks) are untouched.
 */

const INK_STROKE = /stroke="#04060b"/g;
const RIM_RECT = /<rect [^>]*mask="url\(#rim_\d+\)"\/>/g;
const EMISSIVE_DEFS = new Set(["glowR", "auraR"]);
const FX = `filterUnits="userSpaceOnUse" x="-240" y="-260" width="480" height="520"`;

/** Pull a colour toward its own grey and darken it a touch. */
function mute(c, k = 0.5) {
  const n = parseInt(c.slice(1), 16);
  const g = Math.round(((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11);
  const grey = "#" + g.toString(16).padStart(2, "0").repeat(3);
  return mix(mix(c, grey, k), "#000000", 0.08);
}

function realDefs(defs) {
  const muted = defs.replace(/<(linear|radial)Gradient id="([^"]+)"[\s\S]*?<\/\1Gradient>/g, (g, _t, id) =>
    EMISSIVE_DEFS.has(id) || id === "shade" ? g : g.replace(/stop-color="(#[0-9a-fA-F]{6})"/g, (_m, c) => `stop-color="${mute(c)}"`),
  );
  const shade =
    `<linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="-120" y1="-150" x2="110" y2="150">` +
    `<stop offset="0" stop-color="#fff4e4" stop-opacity=".12"/><stop offset=".38" stop-color="#fff4e4" stop-opacity="0"/>` +
    `<stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".58"/></linearGradient>`;
  return (
    muted.replace(/<linearGradient id="shade"[\s\S]*?<\/linearGradient>/, shade) +
    `<filter id="redge" ${FX}><feGaussianBlur in="SourceAlpha" stdDeviation="3"/><feOffset dx="-1.8" dy="-2.2" result="b"/>` +
    `<feComposite in="SourceAlpha" in2="b" operator="arithmetic" k2="1" k3="-1"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 .02 0 0 0 0 .02 0 0 0 0 .03 0 0 0 .9 0"/></filter>` +
    `<filter id="rwear" ${FX}><feTurbulence type="fractalNoise" baseFrequency=".22" numOctaves="3" seed="5"/>` +
    `<feColorMatrix type="matrix" values="0 0 0 0 .07 0 0 0 0 .055 0 0 0 0 .04 -2.6 0 0 0 1.45"/>` +
    `<feComposite in2="SourceAlpha" operator="in"/></filter>`
  );
}

function realPart(part) {
  if (part.role === "aura") return { ...part, markup: `<g opacity=".45">${part.markup}</g>` };
  if (part.blend) return part;
  const markup = part.markup
    .replace(INK_STROKE, `stroke="#000" stroke-opacity=".3"`)
    .replace(RIM_RECT, "")
    .replace(/<use href="(#c_\d+)"\/>/g, (u, c) => `${u}<use href="${c}" filter="url(#rwear)" opacity=".38"/><use href="${c}" filter="url(#redge)"/>`);
  return { ...part, markup };
}

function bossModel(key, scale, real = false) {
  const model = VILLAIN[key];
  const k = key === "villain_final" ? 1.1 : key === "villain_form2" ? 1.06 : 1;
  const parts = regroup(model);
  return {
    boss: true,
    box: model.box,
    defs: real ? realDefs(model.defs) : model.defs,
    // Feet of the villain rig sit at y ≈ 150 (phase-1 units, scaled by k).
    anchor: 150 * k,
    pivot: 150 * k,
    scale,
    parts: real ? parts.map(realPart) : parts,
  };
}

export const BOSSES = {
  boss: (real) => bossModel("villain", 0.64, real),
  boss_form2: (real) => bossModel("villain_form2", 0.64, real),
  boss_form3: (real) => bossModel("villain_final", 0.66, real),
};
