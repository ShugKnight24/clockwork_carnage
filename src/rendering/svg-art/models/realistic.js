/**
 * Modern (realistic) treatment for svg-art models — the art style whose code id
 * is ART_REALISTIC. Comic keeps the models exactly as authored; this module
 * derives a second, photographic copy of a model at build time:
 *
 *   - comic ink outlines become faint panel seams (translucent, half width),
 *   - saturated comic rim strokes become a neutral fill-light edge,
 *   - every painted colour is desaturated, except emissive ones (bright and
 *     saturated: visors, energy cells, cracks), which stay lit,
 *   - solid layers are shaded by an SVG filter: the paint's own luminance and
 *     the silhouette form a height field, lit by a warm key from the upper
 *     left (diffuse + narrow specular), with occlusion along the far edges and
 *     fractal-noise grime over the surface. Cloth gets a softer variant.
 *
 * Everything here is string work done once when a template is built; the
 * filters run when the browser decodes each layer bitmap, never per frame.
 */

const INK = "#04060b";

/**
 * Comic painted highlights (near-white strokes along lit edges). Under a real
 * key light they read as chrome outlines, so they drop to a satin grey and the
 * filter's specular does the work.
 */
export const SOFT_HIGHLIGHTS = { "#eaf4ff": "#9aa2a8", "#f4faff": "#a6adb2", "#dfe9f4": "#8d959b" };

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = (r) =>
  `#${r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** Blend two hex colours; t = 0 → a, 1 → b. */
export const mixHex = (a, b, t) => {
  const x = hexRgb(a);
  const y = hexRgb(b);
  return rgbHex(x.map((v, i) => v + (y[i] - v) * t));
};

/** True for colours that read as light sources: bright and saturated. */
export function isEmissive(hex) {
  const [r, g, b] = hexRgb(hex);
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  return hi > 199 && (hi - lo) / hi > 0.55;
}

/**
 * Photographic version of a painted colour: pigments lose most of their comic
 * saturation and a little value; emissive colours keep their punch.
 */
export function realHex(hex, desat = 0.5) {
  const [r, g, b] = hexRgb(hex);
  const l = r * 0.3 + g * 0.59 + b * 0.11;
  if (isEmissive(hex)) return rgbHex([r, g, b].map((v) => v + (l - v) * 0.12));
  return rgbHex([r, g, b].map((v) => (v + (l - v) * desat) * (1 - desat * 0.12)));
}

const HEX = /#[0-9a-fA-F]{6}\b/g;

/** Map every 6-digit hex in `s` through realHex (or `keep[hex]` when given). */
function mapColors(s, keep, desat = 0.5) {
  return s.replace(HEX, (h) => {
    const k = h.toLowerCase();
    return keep[k] || realHex(k, desat);
  });
}

/**
 * Photographic markup: ink outlines to faint seams, listed comic rim colours to
 * a neutral edge light, everything else desaturated.
 * @param {string} markup
 * @param {{ rims?: string[], rimColor?: string, keep?: Record<string,string>, desat?: number }} [o]
 */
export function realizeMarkup(markup, { rims = [], rimColor = "#b7c0c8", keep = {}, desat = 0.5 } = {}) {
  let s = markup
    .replace(/stroke="#04060b" stroke-width="([\d.]+)"/g, (_, w) => `stroke="rgba(0,0,0,.4)" stroke-width="${Math.round(w * 55) / 100}"`)
    .replace(/stroke="#04060b"/g, `stroke="rgba(0,0,0,.4)"`)
    // Villain-style rim-light masks: a thin neutral edge, not a coloured halo.
    .replace(/(<rect [^>]*?)fill="[^"]+" opacity="[^"]+" mask="url\(#rim\)"/g, `$1fill="#c9d0d6" opacity=".16" mask="url(#rim)"`);
  const map = { ...keep, [INK]: "#07080a" };
  for (const r of rims) map[r.toLowerCase()] = rimColor;
  return mapColors(s, map, desat);
}

/** Photographic defs: gradient stops desaturated like the paint. */
export const realizeDefs = (defs, keep = {}, desat = 0.5) => mapColors(defs, keep, desat);

/** Swap the gradient with `id` in `defs` for `markup` (used to give a model real materials). */
export const swapGradient = (defs, id, markup) =>
  defs.replace(new RegExp(`<(linear|radial)Gradient id="${id}"[\\s\\S]*?</\\1Gradient>`), markup);

/**
 * Painted-metal ramp lit from the upper left: a broad base tone with one narrow
 * specular band at `at`, falling off into shadow. Replaces comic four-tone ramps.
 */
export function sheen(id, base, spec, low, deep, at = 0.14, attrs = `x1="0" y1="0" x2="1" y2=".4"`) {
  return (
    `<linearGradient id="${id}" ${attrs}>` +
    `<stop offset="0" stop-color="${mixHex(base, low, 0.15)}"/><stop offset="${n2(at - 0.07)}" stop-color="${base}"/>` +
    `<stop offset="${n2(at)}" stop-color="${spec}"/><stop offset="${n2(at + 0.09)}" stop-color="${base}"/>` +
    `<stop offset=".62" stop-color="${low}"/><stop offset="1" stop-color="${deep}"/></linearGradient>`
  );
}

// ---------------------------------------------------------------------------
// Filters and light
// ---------------------------------------------------------------------------

const n2 = (v) => Math.round(v * 100) / 100;

/**
 * Material filters sized to a model box. `u` is art units per on-screen pixel
 * (roughly), so blur radii and grain stay the same size on screen whatever the
 * model's scale. Ids: rmat (painted metal), rcloth (fabric), rsoft (a wide blur
 * for volumetric light), plus the gradients used by `volumetric` and
 * `contactShadow`.
 */
export function realFilters(box, { u = 1, spec = 0.55, grime = 0.3, seed = 7, light = "#fff4e8", tint = "#c8d2dc", tight = false } = {}) {
  const [x, y, w, h] = box;
  // `tight` fits each filter to the filtered element's own bounds, which keeps
  // live (inline, repainted) use cheap; bitmaps use the whole box.
  const R = tight
    ? `x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB"`
    : `filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}" color-interpolation-filters="sRGB"`;
  const key = `<feDistantLight azimuth="225" elevation="52"/>`;
  // Height: blurred silhouette (rounded forms) + the paint's own luminance
  // (panel seams read as grooves, painted highlights as ridges).
  const height = (sa, sl, ka, kl) =>
    `<feColorMatrix in="SourceGraphic" type="luminanceToAlpha" result="lum"/>` +
    `<feGaussianBlur in="lum" stdDeviation="${n2(sl * u)}" result="lumB"/>` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${n2(sa * u)}" result="aB"/>` +
    `<feComposite in="aB" in2="lumB" operator="arithmetic" k2="${ka}" k3="${kl}" result="h"/>`;
  // Grime: low-frequency blotches (dirt in the recesses, worn paint) plus a
  // faint fine speckle, dark and warm, confined to the silhouette.
  const grain = (freq, amount, s) =>
    `<feTurbulence type="fractalNoise" baseFrequency="${n2(freq / u)}" numOctaves="4" seed="${s}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 .06 0 0 0 0 .05 0 0 0 0 .04 ${n2(-2 * amount)} 0 0 0 ${n2(1.12 * amount)}" result="g"/>` +
    `<feComposite in="g" in2="SourceAlpha" operator="in" result="gi"/>`;
  // Occlusion soaking into the silhouette edge away from the key light.
  const occ = (k) =>
    `<feOffset in="aB" dx="${n2(-1.3 * u)}" dy="${n2(-1.6 * u)}" result="aO"/>` +
    `<feComposite in="SourceAlpha" in2="aO" operator="arithmetic" k2="1" k3="-1" result="edge"/>` +
    `<feColorMatrix in="edge" type="matrix" values="0 0 0 0 .01 0 0 0 0 .012 0 0 0 0 .016 0 0 0 ${k} 0" result="occ"/>`;
  return (
    `<filter id="rmat" ${R}>` +
    `<feColorMatrix in="SourceGraphic" type="saturate" values=".86" result="paint"/>` +
    height(2.2, 0.5, 0.6, 0.36) +
    `<feDiffuseLighting in="h" surfaceScale="${n2(5 * u)}" diffuseConstant="1.34" lighting-color="${light}" result="dif">${key}</feDiffuseLighting>` +
    `<feComposite in="paint" in2="dif" operator="arithmetic" k1="1" result="lit"/>` +
    `<feSpecularLighting in="h" surfaceScale="${n2(5 * u)}" specularConstant="1.1" specularExponent="34" lighting-color="${light}" result="sp">${key}</feSpecularLighting>` +
    `<feComposite in="sp" in2="SourceAlpha" operator="in" result="spI"/>` +
    `<feComposite in="lit" in2="spI" operator="arithmetic" k2="1" k3="${spec}" result="ls"/>` +
    grain(0.05, grime, seed) +
    occ(0.62) +
    `<feMerge><feMergeNode in="ls"/><feMergeNode in="gi"/><feMergeNode in="occ"/></feMerge></filter>` +
    // Fabric: folds softened, broad diffuse, only a dull sheen, fine weave.
    `<filter id="rcloth" ${R}>` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${n2(0.55 * u)}" result="sb"/>` +
    `<feComposite in="sb" in2="SourceAlpha" operator="in" result="soft"/>` +
    `<feColorMatrix in="soft" type="saturate" values=".8" result="paint"/>` +
    height(2.2, 1.1, 0.45, 0.7) +
    `<feDiffuseLighting in="h" surfaceScale="${n2(6 * u)}" diffuseConstant="1.32" lighting-color="${light}" result="dif">${key}</feDiffuseLighting>` +
    `<feComposite in="paint" in2="dif" operator="arithmetic" k1="1" result="lit"/>` +
    `<feSpecularLighting in="h" surfaceScale="${n2(6 * u)}" specularConstant=".35" specularExponent="7" lighting-color="${tint}" result="sp">${key}</feSpecularLighting>` +
    `<feComposite in="sp" in2="SourceAlpha" operator="in" result="spI"/>` +
    `<feComposite in="lit" in2="spI" operator="arithmetic" k2="1" k3=".22" result="ls"/>` +
    grain(0.07, grime * 0.6, seed + 3) +
    occ(0.5) +
    `<feMerge><feMergeNode in="ls"/><feMergeNode in="gi"/><feMergeNode in="occ"/></feMerge></filter>` +
    `<filter id="rsoft" ${R}><feGaussianBlur stdDeviation="${n2(9 * u)}"/></filter>` +
    `<filter id="rsoft2" ${R}><feGaussianBlur stdDeviation="${n2(2.2 * u)}"/></filter>` +
    `<radialGradient id="rcsA"><stop offset="0" stop-color="#000" stop-opacity=".62"/><stop offset=".55" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="rcsB"><stop offset="0" stop-color="#000" stop-opacity=".9"/><stop offset=".6" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`
  );
}

/**
 * Soft volumetric light standing behind a figure: a haze bloom around it and a
 * shaft falling from above, both blurred wide (needs `realFilters`'s rsoft).
 * Colours are near-neutral; `color` only tints them.
 */
export function volumetric({ cx, cy, rx, ry, color = "#b8c6d4", top, shaftW = rx * 0.6, bottom = cy + ry * 0.8, id = "rvol" }) {
  const t = top ?? cy - ry * 1.4;
  const grad =
    `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity=".34"/>` +
    `<stop offset=".45" stop-color="${color}" stop-opacity=".12"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}S" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mixHex(color, "#ffffff", 0.5)}" stop-opacity="0"/>` +
    `<stop offset=".42" stop-color="${mixHex(color, "#ffffff", 0.5)}" stop-opacity=".2"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  const w0 = shaftW * 0.45;
  const shaft = `M${n2(cx - w0)} ${n2(t)} L${n2(cx + w0)} ${n2(t)} L${n2(cx + shaftW)} ${n2(bottom)} L${n2(cx - shaftW)} ${n2(bottom)} Z`;
  return (
    grad +
    `<g filter="url(#rsoft)"><ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx)}" ry="${n2(ry)}" fill="url(#${id})"/>` +
    `<path d="${shaft}" fill="url(#${id}S)"/></g>`
  );
}

/** Grounded contact shadow: a wide soft occlusion and a tight dark core. */
export const contactShadow = (cx, cy, rx, ry) =>
  `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx)}" ry="${n2(ry)}" fill="url(#rcsA)"/>` +
  `<ellipse cx="${n2(cx)}" cy="${n2(cy - ry * 0.08)}" rx="${n2(rx * 0.62)}" ry="${n2(ry * 0.42)}" fill="url(#rcsB)"/>`;

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/**
 * Photographic copy of an svg-art model.
 * @param {{ box: number[], defs?: string, anim?: object, layers: object[] }} model
 * @param {object} o
 * @param {(layer: object, i: number) => ("metal"|"cloth"|"emissive"|"plain"|"drop")} [o.material]
 *   how each source layer is treated (default: blended layers are emissive, the rest metal)
 * @param {object[]} [o.under]  extra layers drawn first (light, shadows), markup already final
 * @param {object[]} [o.over]   extra layers drawn last (reflections)
 * @param {Record<number, object|object[]>} [o.replace] source layer index → replacement layer(s) (final markup)
 * @param {(markup: string, i: number) => string} [o.edit] pre-pass on a source layer's markup
 * @param {object} [o.filters]  realFilters options
 * @param {string[]} [o.rims]   comic rim colours to neutralise
 * @param {string} [o.extraDefs]
 * @param {number[]} [o.box] a larger box (room for light and shadow); art placement is unchanged
 * @param {Record<string,string>} [o.materials] gradient id → replacement gradient markup
 */
export function realizeModel(model, { material, under = [], over = [], replace = {}, edit, filters = {}, rims = [], keep = {}, extraDefs = "", box = model.box, materials = {} } = {}) {
  const kind = material || ((l) => (l.blend ? "emissive" : "metal"));
  const layers = [...under];
  model.layers.forEach((layer, i) => {
    if (replace[i]) {
      layers.push(...[].concat(replace[i]));
      return;
    }
    const k = kind(layer, i);
    if (k === "drop") return;
    const src = edit ? edit(layer.markup, i) : layer.markup;
    const m = realizeMarkup(src, { rims, keep });
    const markup = k === "metal" || k === "cloth" ? `<g filter="url(#${k === "metal" ? "rmat" : "rcloth"})">${m}</g>` : m;
    layers.push({ ...layer, markup });
  });
  layers.push(...over);
  // Swapped materials are authored photographic already, so they skip the remap.
  let defs = realizeDefs(model.defs || "", keep);
  for (const [id, markup] of Object.entries(materials)) defs = swapGradient(defs, id, markup);
  return {
    box,
    defs: defs + realFilters(box, filters) + extraDefs,
    anim: model.anim,
    layers,
  };
}
