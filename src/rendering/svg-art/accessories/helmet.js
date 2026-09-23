/**
 * Helmet slot. Everything sits on the helmet shell (`head`), so it follows
 * the head's turn and the fallen head roll; lights go in `glow`. The rig
 * seats crown / browL / sideL on each helmet's shell.
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
const stroke = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
/** A coloured stroke with an ink edge, the rig's way of outlining a line. */
const inked = (d, color, w) => stroke(d, INK, w + 1) + stroke(d, color, w);

export const PAINTERS = {
  nvg: (A) => {
    const { x, y } = A.browL;
    const body = "#1c1f24";
    const tubes = [[-1.7, -6.7], [1.7, -6.7], [-1.7, -3.3], [1.7, -3.3]]
      .map(([dx, dy]) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="1.4" fill="#3a6a5a" stroke="${INK}" stroke-width=".8"/>` +
        `<circle cx="${f(x + dx - 0.4)}" cy="${f(y + dy - 0.4)}" r=".4" fill="#a8d8c4"/>`)
      .join("");
    return {
      head:
        rect(x - 3, y - 1.5, 6, 3, 0.8, mix(body, "#8a96a4", 0.25), 0.9) +
        rect(x - 1.2, y - 2.6, 2.4, 2.4, 0.4, body, 0.7) +
        rect(x - 3.9, y - 8.9, 7.8, 7.8, 1.6, body, 1) +
        tubes,
    };
  },
  whip: (A, c) => {
    const { x, y } = A.sideL;
    const tip = [x - 3, y - 26];
    return {
      head:
        inked(`M${f(x - 0.4)},${f(y - 1)} C${f(x - 0.6)},${f(y - 11)} ${f(x - 1.4)},${f(y - 19)} ${f(tip[0])},${f(tip[1])}`, "#3a414a", 0.9) +
        rect(x - 1.6, y - 2.2, 3.2, 4.4, 0.6, "#2a2f36", 0.9) +
        `<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="1.1" fill="#2a2f36" stroke="${INK}" stroke-width=".8"/>`,
      glow: `<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="1" fill="${c.energy}"/>`,
    };
  },
  lamp: (A) => {
    const { x, y } = A.sideL;
    const housing = "#4a525c";
    return {
      head:
        rect(x - 0.8, y - 1.4, 2.6, 2.8, 0.5, "#1c1f24", 0.7) +
        rect(x - 6, y - 2.6, 7.4, 5.2, 1.6, housing, 1) +
        stroke(`M${f(x - 5)},${f(y - 1.6)} L${f(x + 0.2)},${f(y - 1.6)}`, mix(housing, "#ffffff", 0.35), 0.5) +
        `<circle cx="${f(x - 2.6)}" cy="${f(y + 0.2)}" r="2.3" fill="#1c1f24" stroke="${INK}" stroke-width=".8"/>`,
      glow:
        `<circle cx="${f(x - 2.6)}" cy="${f(y + 0.2)}" r="1.8" fill="#fff4c8"/>` +
        `<circle cx="${f(x - 2.6)}" cy="${f(y + 0.2)}" r="3.6" fill="#fff4c8" opacity=".18"/>`,
    };
  },
  // Parade crest: a dense tuft rising from a socket on the crown, tips
  // falling outward. The Centurion already wears its own crest.
  plume: (A, c) => {
    if (c.helmet === "mohawk") return {};
    const { x, y } = A.crown;
    const feathers = Array.from({ length: 9 }, (_, i) => {
      const t = (i - 4) / 4; // -1 .. 1 across the tuft
      const len = 22 - 7 * t * t;
      const lean = t * 7;
      const [ex, ey] = [x + lean * 1.9, y - len + Math.abs(t) * 6];
      const [cx, cy] = [x + lean * 0.4, y - len * 1.05];
      return { d: `M${f(x + t * 1.2)},${f(y)} Q${f(cx)},${f(cy)} ${f(ex)},${f(ey)}`, color: i % 2 ? c.cape[2] : c.cape[0], k: Math.abs(t) };
    }).sort((p, q) => q.k - p.k); // outer feathers behind, centre on top
    return {
      head:
        feathers.map((p) => inked(p.d, p.color, 2.2)).join("") +
        rect(x - 2.2, y - 1.6, 4.4, 3.4, 0.8, mix(c.pal.primary, "#c0c8d0", 0.5), 0.9),
    };
  },
};
