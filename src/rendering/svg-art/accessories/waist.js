/**
 * Waist slot. Belts and hip gear sit on the body under the arms (`front`);
 * fallen, the cape flap lies over the hips, so they ride on top of it (`top`).
 */
const f = (n) => Math.round(n * 100) / 100;
const INK = "#0a0d12";
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
const BRASS = "#d9a441";
const on = (A, markup) => (A.pose === "fallen" ? { top: markup } : { front: markup });
const rect = (x, y, w, h, rx, fill, sw = 0.9) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const seam = (d, color, w = 0.6) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

export const PAINTERS = {
  belt: (A, c) => {
    const { x, y, half } = A.belt;
    const band = mix(c.pal.dark, "#3a3226", 0.5);
    const pouch = mix(band, "#ffffff", 0.1);
    const pouches = [-16, -9, 9, 16]
      .map((dx) => {
        const px = x + (dx * half) / 19;
        return rect(px - 3, y + 0.4, 6, 7, 1, pouch) + seam(`M${f(px - 2.6)},${f(y + 2.9)} L${f(px + 2.6)},${f(y + 2.9)}`, mix(pouch, "#000000", 0.45));
      })
      .join("");
    return on(A,
      rect(x - half, y - 2.5, half * 2, 5, 1.2, band, 1) +
      seam(`M${f(x - half + 0.8)},${f(y - 1.3)} L${f(x + half - 0.8)},${f(y - 1.3)}`, mix(band, "#ffffff", 0.2), 0.4) +
      pouches +
      // Brass buckle framing the suit's glowing belt light.
      rect(x - 3.2, y - 2.6, 6.4, 5.2, 0.8, BRASS, 0.8) +
      rect(x - 2, y - 1.4, 4, 2.8, 0.4, "#05080c", 0.5));
  },
  holster: (A) => {
    const { x, y } = A.hipR;
    const leather = "#3a2a1c";
    return on(A,
      rect(x - 2, y - 4, 4, 18, 0.8, leather) +
      rect(x - 2, y - 3, 4, 6, 1, "#1c1f24", 0.8) +
      rect(x - 3.5, y + 2, 7, 16, 2, leather, 1) +
      seam(`M${f(x - 2.4)},${f(y + 4.5)} L${f(x + 2.4)},${f(y + 4.5)}`, mix(leather, "#ffffff", 0.2)) +
      rect(x - 5.5, y + 12, 11, 2.4, 0.8, mix(leather, "#000000", 0.2), 0.8) +
      `<circle cx="${f(x)}" cy="${f(y + 13.2)}" r=".7" fill="${BRASS}"/>`);
  },
  grenades: (A) => {
    const { x, y, half } = A.belt;
    const cans = [-12, -6, 0, 6, 12]
      .map((dx) => {
        const cx = x + (dx * half) / 19;
        return (
          `<circle cx="${f(cx)}" cy="${f(y + 4)}" r="2.6" fill="#5a6a3a" stroke="${INK}" stroke-width=".9"/>` +
          seam(`M${f(cx - 2.2)},${f(y + 4.4)} L${f(cx + 2.2)},${f(y + 4.4)}`, "#3a4626", 0.5) +
          rect(cx - 1, y + 0.2, 2, 1.6, 0.4, "#1c1f24", 0.6) +
          seam(`M${f(cx + 1)},${f(y + 1)} C${f(cx + 2.4)},${f(y + 1.4)} ${f(cx + 2.8)},${f(y + 3)} ${f(cx + 2.4)},${f(y + 4.6)}`, "#8a9098", 0.5)
        );
      })
      .join("");
    return on(A,
      rect(x - half, y - 2, half * 2, 4, 0.8, "#4a4f2a", 1) +
      seam(`M${f(x - half + 0.8)},${f(y)} L${f(x + half - 0.8)},${f(y)}`, "#2e3218", 0.5) +
      cans);
  },
  canister: (A, c) => {
    const { x, y } = A.hipL;
    const shell = "#2a2f36";
    const out = on(A,
      rect(x - 3, y - 6, 6, 12, 2, shell, 1) +
      rect(x - 3.4, y - 6.4, 6.8, 2, 0.6, mix(shell, "#c0c8d0", 0.35), 0.7) +
      rect(x - 3.4, y + 4.4, 6.8, 2, 0.6, mix(shell, "#c0c8d0", 0.35), 0.7) +
      rect(x - 1.9, y - 3.9, 3.8, 7.8, 1, "#05080c", 0.6));
    return { ...out, glow: `<rect x="${f(x - 1.5)}" y="${f(y - 3.5)}" width="3" height="7" rx=".8" fill="${c.energy}"/>` };
  },
};
