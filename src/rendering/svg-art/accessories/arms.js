/**
 * Arms slot. Gear wraps the forearm on its axis (A.forearmAxisL/R: midpoint,
 * angle, length), drawn in a local frame where +y runs elbow → wrist. It goes
 * over the arms (`top`); fallen, the pinned right arm lies under the body, so
 * its gear stays with the body (`front`).
 */
const f = (n) => Math.round(n * 100) / 100;
const INK = "#0a0d12";
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
const BRASS = "#d9a441";
const rect = (x, y, w, h, rx, fill, sw = 0.9) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const seam = (d, color, w = 0.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
/** Markup in the forearm's frame: origin at the midpoint, +y toward the wrist. */
const onArm = (a, markup) => `<g transform="translate(${f(a.x)},${f(a.y)}) rotate(${f(a.rot)})">${markup}</g>`;
/** Layer for gear on one arm: the fallen pinned (right) arm is under the body. */
const layerOf = (A, side) => (A.pose === "fallen" && side === "R" ? "front" : "top");
const add = (out, k, m) => ({ ...out, [k]: (out[k] || "") + m });

export const PAINTERS = {
  gauntlets: (A, c) => {
    const plate = mix(c.pal.primary, "#000000", 0.25);
    const ridge = mix(plate, "#000000", 0.45);
    const hi = mix(plate, "#ffffff", 0.35);
    const guard =
      `<path d="M-4.5,-6 L4.5,-6 L4,5 C2,6.4 -2,6.4 -4,5 Z" fill="${plate}" stroke="${INK}" stroke-width="1"/>` +
      [-3, 0, 3].map((y) => seam(`M-3.6,${y} C-1.2,${y + 0.8} 1.2,${y + 0.8} 3.6,${y}`, ridge, 0.6)).join("") +
      seam("M-3.4,-5 L-3,4", hi, 0.5) +
      rect(-4.2, 5.2, 8.4, 2.4, 0.8, mix(plate, "#000000", 0.2), 0.8);
    let out = {};
    for (const s of ["L", "R"]) out = add(out, layerOf(A, s), onArm(A[`forearmAxis${s}`], guard));
    return out;
  },
  screen: (A, c) => {
    const a = A.forearmAxisL;
    // Nearer the elbow, clear of the chrono device lower down the vambrace.
    const y = -a.len * 0.14;
    return {
      [layerOf(A, "L")]: onArm(a,
        rect(-5, y - 3.6, 10, 7.2, 1.2, "#1c1f24", 1) +
        rect(-3.8, y - 2.5, 7.6, 5, 0.6, "#05080c", 0.6) +
        seam(`M5,${f(y - 1.8)} L6,${f(y - 1.8)} M5,${f(y)} L6,${f(y)}`, "#8a96a4", 0.5)),
      glow: onArm(a,
        `<rect x="-3.8" y="${f(y - 2.5)}" width="7.6" height="5" rx=".6" fill="${c.energy}" opacity=".8"/>` +
        seam(`M-2.8,${f(y + 0.8)} L-1,${f(y - 0.8)} L.6,${f(y + 0.2)} L2.8,${f(y - 1.6)}`, "#ffffff", 0.45)),
    };
  },
  launcher: (A) => {
    const a = A.forearmAxisL;
    // Along the outer edge of the forearm, muzzle at the wrist.
    const tube =
      rect(-6.6, -4, 4, 12, 1, "#2a2f36", 1) +
      seam("M-5.8,-1 L-3.4,-1 M-5.8,3 L-3.4,3", "#12161b", 0.5) +
      rect(-3.4, -1.6, 3, 3.2, 0.6, "#1c1f24", 0.8) +
      `<circle cx="-4.6" cy="8.6" r="2.2" fill="${BRASS}" stroke="${INK}" stroke-width=".9"/>` +
      `<circle cx="-4.6" cy="8.6" r="1" fill="#05080c"/>`;
    // Outer edge: local -x points away from the body on the left arm.
    return { [layerOf(A, "L")]: onArm(a, tube) };
  },
};
