/**
 * Legs slot. Pads and pouches sit on the legs (`front`), turned to the leg by
 * the knee and thigh anchors' `rot` (local +y runs down the leg).
 */
const f = (n) => Math.round(n * 100) / 100;
const INK = "#0a0d12";
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
const rect = (x, y, w, h, rx, fill, sw = 0.9) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const seam = (d, color, w = 0.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
/** Markup in a leg anchor's frame: origin on the anchor, +y down the leg. */
const onKnee = (a, markup) => `<g transform="translate(${f(a.x)},${f(a.y)}) rotate(${f(a.rot)})">${markup}</g>`;
const knees = (A, markup) => onKnee(A.kneeL, markup) + onKnee(A.kneeR, markup);

export const PAINTERS = {
  kneepads: (A, c) => {
    const pad = mix(mix(c.pal.dark, "#2a2f36", 0.4), "#8a96a4", 0.35);
    const strap = mix(pad, "#000000", 0.35);
    return {
      front: knees(A,
        rect(-5.2, -5.6, 10.4, 1.8, 0.6, strap, 0.8) +
        rect(-4.6, 3.6, 9.2, 1.8, 0.6, strap, 0.8) +
        rect(-4.5, -4, 9, 8, 3, pad, 1) +
        seam("M-2.6,-2.4 C-1,-3.2 1,-3.2 2.6,-2.4", mix(pad, "#ffffff", 0.35), 0.6)),
    };
  },
  thigh: (A) => {
    const pouch = "#4a4f2a";
    return {
      front: onKnee(A.thighL,
        rect(-6.8, -1, 13.6, 2, 0.6, "#3a2a1c", 0.8) +
        rect(-6.4, 5, 12.8, 2, 0.6, "#3a2a1c", 0.8) +
        rect(-6, -2, 8, 10, 1.5, pouch, 1) +
        rect(-6, -2, 8, 3.2, 1.2, mix(pouch, "#000000", 0.2), 0.8) +
        `<rect x="-2.8" y="-.6" width="1.6" height="1.4" rx=".4" fill="#1c1f24"/>` +
        seam("M-5,4.2 L1,4.2", mix(pouch, "#000000", 0.35), 0.5)),
    };
  },
  shins: (A, c) => {
    const plate = mix(c.pal.primary, "#000000", 0.3);
    return {
      front: knees(A,
        `<path d="M-4.2,1 C-2,-0.6 2,-0.6 4.2,1 L3.6,22 C1.4,23.2 -1.4,23.2 -3.6,22 Z" fill="${plate}" stroke="${INK}" stroke-width="1"/>` +
        seam("M0,2 L0,20.6", mix(plate, "#000000", 0.4), 0.6) +
        seam("M-2.8,2.6 L-2.4,19.6", mix(plate, "#ffffff", 0.3), 0.5) +
        `<circle cx="-2" cy="4.4" r=".7" fill="#c0c8d0" stroke="${INK}" stroke-width=".3"/>` +
        `<circle cx="2" cy="18.6" r=".7" fill="#c0c8d0" stroke="${INK}" stroke-width=".3"/>`),
    };
  },
};
