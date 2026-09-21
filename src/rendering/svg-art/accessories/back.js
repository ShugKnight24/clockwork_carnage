/**
 * Back slot. Gear sits behind the torso and cape (`back`); straps that cross
 * the chest go in `front`, and lights in `glow`.
 */
const f = (n) => Math.round(n * 100) / 100;
const INK = "#0a0d12";
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
/** Fallen art lies on its side: nudge back gear out from under the body. */
const lie = (A, markup) => (A.pose === "fallen" ? `<g transform="translate(-6,4) rotate(-12)">${markup}</g>` : markup);

const stroke = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** A coloured stroke with an ink edge, the rig's way of outlining a line. */
const inked = (d, color, w) => stroke(d, INK, w + 1) + stroke(d, color, w);

export const PAINTERS = {
  // Seen from the front, a pack shows as its bedroll over the shoulders and
  // the harness straps down the chest.
  backpack: (A, c) => {
    const { x, y } = A.back;
    const body = mix(c.pal.dark, "#3a3f35", 0.6);
    const roll = mix(body, "#8a7a5a", 0.45);
    const web = mix(body, "#8a7a5a", 0.3);
    const straps = [-1, 1]
      .map((s) => {
        const d = `M${f(x + s * 8.6)},${f(y - 19)} C${f(x + s * 10.6)},${f(y - 10)} ${f(x + s * 11.8)},${f(y - 2)} ${f(x + s * 12.4)},${f(y + 8)}`;
        return inked(d, web, 3) +
          `<rect x="${f(x + s * 11.4 - 2)}" y="${f(y - 1.6)}" width="4" height="2.4" rx=".6" fill="#8a96a4" stroke="${INK}" stroke-width=".8"/>`;
      })
      .join("");
    return {
      back: lie(A,
        `<path d="M${f(x - 17)},${f(y - 28)} L${f(x + 17)},${f(y - 28)} L${f(x + 18)},${f(y + 22)} L${f(x - 18)},${f(y + 22)} Z" fill="${body}" stroke="${INK}" stroke-width="1.1"/>` +
        `<path d="M${f(x - 16)},${f(y - 27)} C${f(x - 15)},${f(y - 32)} ${f(x + 15)},${f(y - 32)} ${f(x + 16)},${f(y - 27)} L${f(x + 16)},${f(y - 20)} L${f(x - 16)},${f(y - 20)} Z" fill="${mix(body, "#ffffff", 0.08)}" stroke="${INK}" stroke-width=".9"/>` +
        `<rect x="${f(x - 22)}" y="${f(y - 33)}" width="44" height="8.4" rx="4.2" fill="${roll}" stroke="${INK}" stroke-width="1"/>` +
        stroke(`M${f(x - 18)},${f(y - 31.4)} C${f(x - 6)},${f(y - 32.4)} ${f(x + 6)},${f(y - 32.4)} ${f(x + 18)},${f(y - 31.4)}`, mix(roll, "#ffffff", 0.3), 0.7) +
        [-13, 13].map((dx) => `<rect x="${f(x + dx - 1.4)}" y="${f(y - 33.8)}" width="2.8" height="10" rx=".6" fill="${web}" stroke="${INK}" stroke-width=".7"/>`).join("") +
        [-1, 1].map((s) => stroke(`M${f(x + s * 20.2)},${f(y - 31)} C${f(x + s * 18.6)},${f(y - 29.6)} ${f(x + s * 18.6)},${f(y - 27)} ${f(x + s * 20.2)},${f(y - 26.4)}`, mix(roll, "#000000", 0.4), 0.6)).join("") +
        `<rect x="${f(x - 20.5)}" y="${f(y - 4)}" width="4" height="14" rx="1.2" fill="${mix(body, "#ffffff", 0.08)}" stroke="${INK}" stroke-width=".8"/>` +
        `<rect x="${f(x + 16.5)}" y="${f(y - 4)}" width="4" height="14" rx="1.2" fill="${mix(body, "#ffffff", 0.08)}" stroke="${INK}" stroke-width=".8"/>`),
      front:
        straps +
        inked(`M${f(x - 10.4)},${f(y - 7)} L${f(x + 10.4)},${f(y - 7)}`, web, 1.4) +
        `<rect x="${f(x - 1.8)}" y="${f(y - 8.4)}" width="3.6" height="2.8" rx=".8" fill="#1c1f24" stroke="${INK}" stroke-width=".7"/>`,
    };
  },
  // Field radio on the back: the mast climbs past the right shoulder.
  antenna: (A, c) => {
    const { x, y } = A.back;
    const box = mix(c.pal.dark, "#2a2f36", 0.5);
    const [base, tip] = [[x + 13, y - 20], [x + 24, y - 64]];
    return {
      back: lie(A,
        `<rect x="${f(x - 9)}" y="${f(y - 26)}" width="24" height="22" rx="2" fill="${box}" stroke="${INK}" stroke-width="1"/>` +
        inked(`M${f(base[0])},${f(base[1])} L${f(tip[0])},${f(tip[1])}`, "#3a414a", 1.5) +
        [0.35, 0.65].map((t) => `<rect x="${f(base[0] + (tip[0] - base[0]) * t - 1.3)}" y="${f(base[1] + (tip[1] - base[1]) * t - 0.8)}" width="2.6" height="1.6" rx=".4" fill="#1c1f24" stroke="${INK}" stroke-width=".6"/>`).join("") +
        `<rect x="${f(base[0] - 3)}" y="${f(base[1] - 3)}" width="6" height="5" rx="1" fill="#1c1f24" stroke="${INK}" stroke-width=".9"/>` +
        `<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="1.5" fill="#1c1f24" stroke="${INK}" stroke-width=".8"/>`),
      glow: lie(A, `<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="1.2" fill="${c.energy}"/>`),
    };
  },
  blade: (A, c) => {
    const { x, y } = A.back;
    // Fallen, the sheath lies along the back instead of across it, hilt at
    // the shoulders rather than past the head.
    const [turn, slide] = A.pose === "fallen" ? [-8, 18] : [-32, 0];
    const guard = mix(c.pal.primary, "#c0c8d0", 0.5);
    return {
      back: lie(A,
        `<g transform="translate(0,${slide}) rotate(${turn} ${f(x)} ${f(y)})">` +
        `<rect x="${f(x - 2.6)}" y="${f(y - 44)}" width="5.2" height="66" rx="1.6" fill="#1c1f24" stroke="${INK}" stroke-width="1"/>` +
        `<rect x="${f(x - 2.6)}" y="${f(y + 14)}" width="5.2" height="8" rx="1.6" fill="${guard}" stroke="${INK}" stroke-width=".8"/>` +
        `<rect x="${f(x - 1.6)}" y="${f(y - 58)}" width="3.2" height="12" rx="1" fill="#3a2a1c" stroke="${INK}" stroke-width=".8"/>` +
        stroke(`M${f(x - 1.6)},${f(y - 55)} L${f(x + 1.6)},${f(y - 53.6)} M${f(x - 1.6)},${f(y - 51.6)} L${f(x + 1.6)},${f(y - 50.2)}`, "#5a4632", 0.6) +
        `<rect x="${f(x - 6)}" y="${f(y - 46)}" width="12" height="3" rx="1" fill="${guard}" stroke="${INK}" stroke-width=".8"/>` +
        `<circle cx="${f(x)}" cy="${f(y - 59.4)}" r="2.2" fill="${guard}" stroke="${INK}" stroke-width=".8"/></g>`),
    };
  },
  // Long cloak with a hood gathered behind the neck; fallen, it spreads on
  // the floor behind the body like the armour cape it replaces (the hood is
  // lost under the head).
  cloak: (A, c) => {
    const { x, y } = A.back;
    const P = (dx, dy) => `${f(x + dx)},${f(y + dy)}`;
    const hood =
      `<path d="M${P(-19, -14)} C${P(-22, -28)} ${P(-12, -38)} ${P(0, -38)} C${P(12, -38)} ${P(22, -28)} ${P(19, -14)} Z" fill="${c.cape[1]}" stroke="${INK}" stroke-width="1"/>` +
      `<path d="M${P(-14, -16)} C${P(-15, -27)} ${P(-8, -33)} ${P(0, -33)} C${P(8, -33)} ${P(15, -27)} ${P(14, -16)} Z" fill="${c.cape[3]}"/>` +
      stroke(`M${P(-17, -18)} C${P(-19, -28)} ${P(-10, -36)} ${P(0, -36.4)}`, c.cape[0], 0.8);
    if (A.pose === "fallen") {
      const pool = `M${P(-12, -18)} C${P(-26, -22)} ${P(-36, -14)} ${P(-38, 0)} C${P(-40, 20)} ${P(-40, 46)} ${P(-37, 66)} C${P(-35, 80)} ${P(-31, 92)} ${P(-26, 100)} ` +
        `L${P(-20, 95)} L${P(-15, 102)} L${P(-9, 96)} L${P(-3, 103)} C${P(2, 94)} ${P(5, 84)} ${P(7, 74)} L${P(10, 8)} C${P(6, -8)} ${P(0, -16)} ${P(-12, -18)} Z`;
      return {
        back:
          `<path d="${pool}" fill="${mix(c.cape[2], c.cape[3], 0.45)}" stroke="${INK}" stroke-width="1.1"/>` +
          stroke(`M${P(-26, -6)} C${P(-31, 16)} ${P(-32, 44)} ${P(-29, 72)} M${P(-17, 4)} C${P(-21, 28)} ${P(-22, 54)} ${P(-18, 84)}`, c.cape[3], 1) +
          stroke(`M${P(-33, 2)} C${P(-36, 24)} ${P(-36, 50)} ${P(-33, 74)}`, c.cape[1], 0.8),
      };
    }
    const hem = 100;
    return {
      back:
        `<path d="M${P(-16, -18)} C${P(-30, -14)} ${P(-34, 14)} ${P(-35, 40)} C${P(-36, 62)} ${P(-36, 82)} ${P(-34, hem)} ` +
        `C${P(-12, hem + 4)} ${P(12, hem + 4)} ${P(34, hem)} C${P(36, 82)} ${P(36, 62)} ${P(35, 40)} C${P(34, 14)} ${P(30, -14)} ${P(16, -18)} Z" fill="${mix(c.cape[2], c.cape[3], 0.45)}" stroke="${INK}" stroke-width="1.1"/>` +
        `<path d="M${P(-22, -15)} C${P(-31, -4)} ${P(-34, 20)} ${P(-35, 40)} C${P(-36, 62)} ${P(-36, 82)} ${P(-34, hem)} C${P(-30, hem + 1.2)} ${P(-26, hem + 2)} ${P(-22, hem + 2.4)} C${P(-24, 70)} ${P(-24, 20)} ${P(-22, -15)} Z" fill="${c.cape[1]}"/>` +
        `<path d="M${P(22, -15)} C${P(31, -4)} ${P(34, 20)} ${P(35, 40)} C${P(36, 62)} ${P(36, 82)} ${P(34, hem)} C${P(30, hem + 1.2)} ${P(26, hem + 2)} ${P(22, hem + 2.4)} C${P(24, 70)} ${P(24, 20)} ${P(22, -15)} Z" fill="${c.cape[2]}"/>` +
        stroke(`M${P(-22, -12)} C${P(-24, 20)} ${P(-24, 64)} ${P(-22, hem + 2)} M${P(22, -12)} C${P(24, 20)} ${P(24, 64)} ${P(22, hem + 2)}`, c.cape[3], 0.9) +
        stroke(`M${P(-9, 4)} C${P(-11, 36)} ${P(-11, 70)} ${P(-10, hem + 3)} M${P(9, 4)} C${P(11, 36)} ${P(12, 70)} ${P(12, hem + 3)}`, c.cape[3], 1.1) +
        stroke(`M${P(-31, -2)} C${P(-33, 24)} ${P(-34, 58)} ${P(-32, 92)}`, c.cape[0], 0.7) +
        stroke(`M${P(-33, hem + 0.4)} C${P(-12, hem + 4.2)} ${P(12, hem + 4.2)} ${P(33, hem + 0.4)}`, c.cape[3], 1) +
        hood,
    };
  },
};
