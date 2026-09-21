/**
 * Neck slot. Scarf and tags sit over the gorget (`top`); the bandolier runs
 * under the arms and rifle (`front`). Fallen, the slumped left arm lies across
 * the chest, so everything stays under it (`front`).
 */
const f = (n) => Math.round(n * 100) / 100;
const INK = "#0a0d12";
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
const BRASS = "#d9a441";
const shape = (d, fill, sw = 1) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const seam = (d, color, w = 0.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const overCollar = (A) => (A.pose === "fallen" ? "front" : "top");

export const PAINTERS = {
  scarf: (A, c) => {
    const { x, y } = A.neck;
    const P = (dx, dy) => `${f(x + dx)},${f(y + dy)}`;
    const wrap = `M${P(-9, -2)} C${P(-4, -4)} ${P(4, -4)} ${P(9, -2)} L${P(10, 3.2)} C${P(4, 5.6)} ${P(-4, 5.6)} ${P(-10, 3.2)} Z`;
    const tail = `M${P(-7, 2)} C${P(-9, 7)} ${P(-11, 12)} ${P(-10.6, 18)} L${P(-8.4, 16.8)} L${P(-6.8, 18.6)} L${P(-5.4, 16.6)} C${P(-5.4, 11)} ${P(-3.6, 7)} ${P(-2, 3.6)} Z`;
    return {
      [overCollar(A)]:
        shape(tail, c.cape[1]) +
        seam(`M${P(-6.4, 5)} C${P(-7.8, 9)} ${P(-8.6, 13)} ${P(-8.4, 16.4)}`, c.cape[2], 0.8) +
        shape(wrap, c.cape[1]) +
        seam(`M${P(-8, 0.4)} C${P(-3, -1.2)} ${P(3, -1.2)} ${P(8, 0.4)} M${P(-8.6, 2.6)} C${P(-3, 3.8)} ${P(3, 3.8)} ${P(8.6, 2.6)}`, c.cape[2], 0.8) +
        seam(`M${P(-7, -1.6)} C${P(-3, -2.8)} ${P(1, -2.8)} ${P(4, -2.4)}`, c.cape[0], 0.6) +
        shape(`M${P(-5, 1.4)} C${P(-3.4, 0)} ${P(-1, 0.4)} ${P(-0.4, 2.2)} C${P(-1.6, 4.4)} ${P(-4, 4.4)} ${P(-5, 1.4)} Z`, c.cape[2], 0.8),
    };
  },
  tags: (A) => {
    const { x, y } = A.neck;
    const tag = (dx, dy, r) =>
      `<g transform="rotate(${r} ${f(x + dx)} ${f(y + dy)})"><rect x="${f(x + dx - 1.5)}" y="${f(y + dy)}" width="3" height="5" rx="1" fill="#d8dde4" stroke="${INK}" stroke-width=".8"/>` +
      seam(`M${f(x + dx - 0.7)},${f(y + dy + 2)} L${f(x + dx + 0.7)},${f(y + dy + 2)} M${f(x + dx - 0.7)},${f(y + dy + 3.2)} L${f(x + dx + 0.3)},${f(y + dy + 3.2)}`, "#8a96a4", 0.35) +
      `</g>`;
    return {
      [overCollar(A)]:
        seam(`M${f(x - 6)},${f(y - 1)} C${f(x - 5)},${f(y + 6)} ${f(x - 2)},${f(y + 12)} ${f(x)},${f(y + 14)} C${f(x + 2)},${f(y + 12)} ${f(x + 5)},${f(y + 6)} ${f(x + 6)},${f(y - 1)}`, INK, 1.2) +
        seam(`M${f(x - 6)},${f(y - 1)} C${f(x - 5)},${f(y + 6)} ${f(x - 2)},${f(y + 12)} ${f(x)},${f(y + 14)} C${f(x + 2)},${f(y + 12)} ${f(x + 5)},${f(y + 6)} ${f(x + 6)},${f(y - 1)}`, "#a8b4c0", 0.6) +
        tag(-0.8, 13.6, 8) +
        tag(0.7, 14.2, -6),
    };
  },
  bandolier: (A) => {
    const [a, b] = [[A.neck.x - 13, A.neck.y + 5], [A.hipR.x, A.hipR.y]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const rot = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    const shells = Array.from({ length: 7 }, (_, i) => {
      const t = len * (0.22 + i * 0.1);
      return `<rect x="${f(t - 1)}" y="-3.4" width="2" height="4" rx=".6" fill="${BRASS}" stroke="${INK}" stroke-width=".6"/>` +
        `<rect x="${f(t - 1)}" y="-3.4" width="2" height="1.2" rx=".4" fill="${mix(BRASS, "#000000", 0.35)}"/>`;
    }).join("");
    return {
      front:
        `<g transform="translate(${f(a[0])},${f(a[1])}) rotate(${f(rot)})">` +
        `<rect x="0" y="-2.5" width="${f(len)}" height="5" rx="1" fill="#3a2a1c" stroke="${INK}" stroke-width="1"/>` +
        seam(`M1,1.4 L${f(len - 1)},1.4`, "#5a4632", 0.5) +
        shells +
        `</g>`,
    };
  },
};
