/**
 * Modern (realistic) title-screen figures: the armed agent and the Paradox
 * Lord (form 2) from the Comic models, re-rendered through ./realistic.js with
 * volumetric light behind them, contact shadows under them and, for the agent,
 * a glass reflection on the visor. Built once, on demand, by the title
 * components; the Comic models are not touched.
 */

import { MODELS as HERO, HELM_GLASS } from "./hero.js";
import { MODELS as VILLAIN } from "./villain.js";
import { realizeModel, volumetric, contactShadow, sheen, SOFT_HIGHLIGHTS } from "./realistic.js";

/**
 * Photographic materials for the agent's armour rig (ids from ARMOR_DEFS):
 * gunmetal paint with one narrow specular, a dark rubberised undersuit, a
 * smoked visor with the HUD glow behind it, and a wool cape.
 */
export const AGENT_MATERIALS = {
  steel: sheen("steel", "#6f777e", "#cfd4d8", "#373d43", "#141719", 0.15, `x1="0" y1="0" x2="1" y2=".35"`),
  steelDk: sheen("steelDk", "#474d53", "#8f969c", "#24282c", "#0c0e10", 0.16, `x1="0" y1="0" x2="1" y2=".35"`),
  suit:
    `<linearGradient id="suit" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#3a3f45"/>` +
    `<stop offset=".45" stop-color="#1e2226"/><stop offset="1" stop-color="#0a0b0d"/></linearGradient>`,
  visor:
    `<linearGradient id="visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1417"/>` +
    `<stop offset=".45" stop-color="#1f5560"/><stop offset=".58" stop-color="#5fb4c0"/><stop offset="1" stop-color="#071012"/></linearGradient>`,
  cape:
    `<linearGradient id="cape" gradientUnits="userSpaceOnUse" x1="-38" y1="-50" x2="34" y2="10">` +
    `<stop offset="0" stop-color="#7c3431"/><stop offset=".3" stop-color="#5e2724"/>` +
    `<stop offset=".62" stop-color="#441c1a"/><stop offset="1" stop-color="#1f0c0b"/></linearGradient>`,
  gun: sheen("gun", "#44484d", "#8d9398", "#23262a", "#0b0c0e", 0.2, `x1="0" y1="0" x2="0" y2="1"`),
};

/** The agent at low ready (hero_armed) in painted, worn plate and a wool cape. */
export function realHeroArmed() {
  const src = HERO.hero_armed;
  // Visor: a dark sky reflection across the lower glass and a narrow window
  // streak along the brow, clipped to the glass so it rides on the glow.
  const visor =
    `<defs><clipPath id="rvg"><path d="${HELM_GLASS}"/></clipPath>` +
    `<linearGradient id="rvr" x1="0" y1="-85" x2="0" y2="-77" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#eef3f6" stop-opacity=".55"/><stop offset=".22" stop-color="#eef3f6" stop-opacity=".08"/>` +
    `<stop offset=".55" stop-color="#0a1016" stop-opacity=".05"/><stop offset="1" stop-color="#0a1016" stop-opacity=".45"/></linearGradient></defs>` +
    `<g clip-path="url(#rvg)"><rect x="-11" y="-86" width="22" height="10" fill="url(#rvr)"/>` +
    `<path d="M-8.6,-84.2 C-4,-83.6 -1.4,-82.6 -0.2,-81.8" fill="none" stroke="#ffffff" stroke-width=".55" stroke-opacity=".85" stroke-linecap="round"/>` +
    `<path d="M3.6,-83.4 L8.8,-84.2" fill="none" stroke="#ffffff" stroke-width=".35" stroke-opacity=".45" stroke-linecap="round"/></g>`;
  return realizeModel(src, {
    box: [-86, -140, 208, 214],
    filters: { u: 0.62, spec: 0.55, grime: 0.3, seed: 5 },
    rims: ["#22e6ff"],
    keep: SOFT_HIGHLIGHTS,
    materials: AGENT_MATERIALS,
    // The cape carried its own flat floor shadow; the figure gets a real one.
    edit: (m, i) => {
      if (i === 1) return m.replace(/^<ellipse cx="0" cy="58.6"[^>]*\/>/, "");
      // Glow layer: the glass is lit from behind, not a solid slab of cyan.
      if (i === 3) {
        return m
          .replace(`<path d="${HELM_GLASS}" fill="#00e5ff" filter="url(#bloom)" opacity=".7"/>`, `<path d="${HELM_GLASS}" fill="#00e5ff" filter="url(#bloom)" opacity=".4"/>`)
          .replace(`<path d="${HELM_GLASS}" fill="#00e5ff" filter="url(#glow)"/>`, `<path d="${HELM_GLASS}" fill="#00e5ff" filter="url(#glow)" opacity=".32"/>`);
      }
      return m;
    },
    material: (l, i) => (i === 1 ? "cloth" : l.blend ? "emissive" : "metal"),
    replace: {
      0: [
        {
          markup: volumetric({ cx: 4, cy: -26, rx: 58, ry: 84, color: "#9fb4c6", top: -140, shaftW: 44, bottom: 60 }),
          anim: { type: "pulse", min: 0.82, max: 1, speed: 0.9 },
          blend: "screen",
        },
        { markup: contactShadow(0, 58.8, 46, 7) },
      ],
    },
    over: [{ markup: visor }],
  });
}

/** The Paradox Lord, second form: dark lacquered plate and aged brass, lit from within. */
export function realParadoxLord() {
  const src = VILLAIN.villain_form2;
  const [bx, by, bw, bh] = src.box;
  const feet = src.anim.pivot[1];
  return realizeModel(src, {
    box: [bx - 20, by - 10, bw + 40, bh + 20],
    filters: { u: 1.45, spec: 0.45, grime: 0.34, seed: 13, light: "#fff0e4" },
    replace: {
      0: [
        {
          markup: volumetric({ cx: 0, cy: -40, rx: 150, ry: 170, color: "#a8646c", top: by - 10, shaftW: 120, bottom: feet + 8, id: "rvolL" }),
          anim: { type: "pulse", min: 0.78, max: 1, speed: 1.1 },
          blend: "screen",
        },
        { markup: contactShadow(0, feet + 2, 120, 16) },
      ],
    },
  });
}
