/**
 * Wardrobe theme "horologist" (Horologist): the art for
 * src/data/wardrobe-themes/horologist.js, by id. See ./index.js for what each
 * painter is given and returns.
 *
 * The suit as a working clock: brass plate gone green at the edges, an open
 * gear train on the chest, a pendulum and a wind-up key at the back. The
 * metal is fixed brass; only the escapement light takes the energy colour.
 */
import { INK, f, pt, line, shape, energy, armJoints } from "../models/hero.js";
import { STEEL, STEEL_DK, mirrorIf } from "../frame-kit.js";

const PATINA = "#4f8f7c";
const BRASS_HI = "#fff1c2";
const GEAR_INK = "#2a1a06";

/**
 * The theme's brass, as a piece's own gradients: registered in the figure's
 * defs under the piece's scoped ids (K.uid, K.defs), so the frame, helmet
 * and shoulders each carry theirs.
 * @returns {{ BRASS: string, BRASS_DK: string }} fills
 */
function brass(K) {
  const [hi, dk] = [K.uid("brass"), K.uid("brass-dk")];
  K.defs(
    `<linearGradient id="${hi}" x1="0" y1="0" x2="1" y2=".4">` +
      `<stop offset="0" stop-color="#ffe29a"/><stop offset=".22" stop-color="#d9a441"/><stop offset=".55" stop-color="#9c6a1e"/>` +
      `<stop offset=".85" stop-color="#5a3a0e"/><stop offset="1" stop-color="#3a2508"/></linearGradient>` +
      `<linearGradient id="${dk}" x1="0" y1="0" x2="1" y2=".4">` +
      `<stop offset="0" stop-color="#b98634"/><stop offset=".5" stop-color="#6e4814"/><stop offset="1" stop-color="#2c1b05"/></linearGradient>`,
  );
  return { BRASS: `url(#${hi})`, BRASS_DK: `url(#${dk})` };
}

/** A toothed gear outline centred on (cx, cy): `n` teeth of depth `d` round radius `r`. */
function gearPath(cx, cy, r, n, d = 1.2, rot = 0) {
  const pts = [];
  const step = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const a = rot + i * step;
    const at = (t, rr) => pt(cx + Math.cos(a + t * step) * rr, cy + Math.sin(a + t * step) * rr);
    pts.push(at(0, r), at(0.12, r + d), at(0.42, r + d), at(0.54, r));
  }
  return `M${pts.join(" L")} Z`;
}

/** A gear in brass `B` (brass()): toothed rim, a recessed web with spokes or holes, and a hub pin. */
function gear(B, cx, cy, r, n, o = {}) {
  const { BRASS, BRASS_DK } = B;
  const { fill = BRASS, rot = 0, spokes = 4, d = Math.max(0.8, r * 0.2), hub = STEEL } = o;
  const web = r * 0.7;
  let s =
    shape(gearPath(cx, cy, r, n, d, rot), fill, 0.7) +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(web)}" fill="${BRASS_DK}" stroke="${GEAR_INK}" stroke-width=".4"/>`;
  if (spokes) {
    for (let i = 0; i < spokes; i++) {
      const a = rot + (i * Math.PI * 2) / spokes;
      s += line(`M${pt(cx, cy)} L${pt(cx + Math.cos(a) * web, cy + Math.sin(a) * web)}`, "#c8923a", Math.max(0.6, r * 0.16), 1);
    }
  }
  s +=
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.max(0.7, r * 0.26))}" fill="${hub}" stroke="${INK}" stroke-width=".4"/>` +
    line(`M${pt(cx - r * 0.7, cy - r * 0.5)} A${f(r)},${f(r)} 0 0 1 ${pt(cx + r * 0.2, cy - r * 0.96)}`, BRASS_HI, 0.45, 0.7);
  return s;
}

// ── Frame: Clockwork ───────────────────────────────────────────────────────

function clockwork(P, c, K) {
  const B = brass(K);
  const { BRASS, BRASS_DK } = B;
  // Behind the body: a brass spine plate, the wind-up key standing over the
  // right shoulder and a long-case pendulum hanging from the plate, its rod
  // behind the hips and its bob low between the shins, clear of them.
  const key =
    `<g transform="translate(5,-63) rotate(28)">` +
    shape("M-1.3,0 L1.3,0 L1.1,-20 L-1.1,-20 Z", STEEL_DK, 0.8) +
    shape("M-2.4,-6 L2.4,-6 L2.4,-3.6 L-2.4,-3.6 Z", BRASS, 0.6) +
    shape("M-2,-19 L2,-19 L2,-22.4 L-2,-22.4 Z", BRASS, 0.7) +
    // The bow: two lobes, pierced, like a clock key's butterfly.
    shape("M0,-22 C-3,-22.4 -9.6,-24.8 -10.4,-29.4 C-11,-33.2 -7.6,-35 -4.6,-33.6 C-2.6,-32.6 -1,-30.2 0,-27.6 C1,-30.2 2.6,-32.6 4.6,-33.6 C7.6,-35 11,-33.2 10.4,-29.4 C9.6,-24.8 3,-22.4 0,-22 Z", BRASS, 1) +
    `<circle cx="-6.2" cy="-29.4" r="1.9" fill="#0b1014" stroke="${GEAR_INK}" stroke-width=".5"/>` +
    `<circle cx="6.2" cy="-29.4" r="1.9" fill="#0b1014" stroke="${GEAR_INK}" stroke-width=".5"/>` +
    line("M-9.4,-30.6 C-9,-32.8 -6.6,-33.6 -4.8,-32.6", BRASS_HI, 0.6, 0.8) +
    line("M8.8,-26.2 C7,-24.2 3.6,-23 1,-22.8", PATINA, 0.8, 0.7) +
    `</g>`;
  const bob = [0, 34];
  const pendulum =
    line(`M0,-40 L${pt(...bob)}`, INK, 2.2, 1) +
    line(`M0,-40 L${pt(bob[0], bob[1] - 4)}`, "#c8923a", 1.1, 1) +
    `<circle cx="${f(bob[0])}" cy="${f(bob[1])}" r="5.6" fill="${BRASS}" stroke="${INK}" stroke-width=".9"/>` +
    `<circle cx="${f(bob[0])}" cy="${f(bob[1])}" r="3.2" fill="none" stroke="${GEAR_INK}" stroke-width=".5" opacity=".7"/>` +
    line(`M${pt(bob[0] - 3.4, bob[1] - 1.6)} C${pt(bob[0] - 2.6, bob[1] - 3.6)} ${pt(bob[0] - 0.6, bob[1] - 4.2)} ${pt(bob[0] + 0.6, bob[1] - 4.2)}`, BRASS_HI, 0.6, 0.9) +
    line(`M${pt(bob[0] + 4.4, bob[1] + 1)} C${pt(bob[0] + 3.4, bob[1] + 3.6)} ${pt(bob[0] + 1, bob[1] + 4.8)} ${pt(bob[0] - 1, bob[1] + 4.8)}`, PATINA, 0.8, 0.8);
  const under = key + shape("M-9,-68 L9,-68 L10,-38 L-10,-38 Z", BRASS_DK, 1) + pendulum;

  // Joint gears: a small brass cog on the outside of each knee and elbow.
  const legs = P.legs
    .map(({ kn }, i) => {
      const s = i === 0 ? -1 : 1;
      return gear(B, kn[0] + s * 6.4, kn[1] - 0.6, 3, 8, { rot: s * 0.3, spokes: 3 });
    })
    .join("");
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { el } = armJoints(arm, s);
      return gear(B, el[0] + s * 5.4, el[1], 2.6, 8, { rot: 0.2, spokes: 3 });
    })
    .join("");

  // The chest plate: a brass breastplate with a window cut over the gear
  // train, a patina line along its edges and rivets round the window.
  const plate = "M-15.6,-64.6 C-8,-67.2 8,-67.2 15.6,-64.6 C17.8,-58 17.8,-50 15.8,-44.8 C12.4,-40.4 6,-38.4 0,-37.6 C-6,-38.4 -12.4,-40.4 -15.8,-44.8 C-17.8,-50 -17.8,-58 -15.6,-64.6 Z";
  const window = "M-11,-61.6 C-4,-63 4,-63 11,-61.6 C12.6,-56 12.4,-49.6 10.6,-45.6 C7,-42.8 3.6,-41.8 0,-41.4 C-3.6,-41.8 -7,-42.8 -10.6,-45.6 C-12.4,-49.6 -12.6,-56 -11,-61.6 Z";
  const rivets = [
    [-12.6, -60.4], [-13.4, -52.6], [-11.8, -45.2], [12.6, -60.4], [13.4, -52.6], [11.8, -45.2], [0, -64.2], [-6.4, -63.4], [6.4, -63.4],
  ]
    .map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r=".65" fill="#ffe29a" stroke="${GEAR_INK}" stroke-width=".3"/>`)
    .join("");
  // Gear train: the great wheel drives a pinion up-right and a third wheel
  // down-right; an escape wheel turns at the top left.
  const train =
    gear(B, 0, -52.4, 6.4, 16, { rot: 0.1, spokes: 5 }) +
    gear(B, 8.2, -57.2, 2.9, 9, { rot: 0.35, spokes: 3 }) +
    gear(B, -7.8, -46.4, 3, 9, { rot: 0.05, spokes: 3 }) +
    gear(B, -8, -58.4, 2.3, 7, { rot: 0.2, spokes: 0, fill: BRASS_DK }) +
    // The escapement's anchor rocking over the top of the train.
    line("M-1.4,-61 L2.2,-58.6 M-1.4,-61 L-4.8,-58.8", INK, 1.4, 1) +
    line("M-1.4,-61 L2.2,-58.6 M-1.4,-61 L-4.8,-58.8", "#c9d3dc", 0.6, 1) +
    `<circle cx="-1.4" cy="-61" r=".8" fill="${STEEL}" stroke="${INK}" stroke-width=".3"/>`;
  const torso =
    shape(plate, BRASS, 1.1) +
    line("M-15.4,-63.2 C-17,-57 -17,-50 -15.4,-45.6 C-12.4,-41.6 -6,-39.6 0,-38.8", PATINA, 1, 0.55) +
    line("M-14,-64.4 C-8,-66 8,-66 14,-64.4", BRASS_HI, 0.6, 0.75) +
    shape(window, "#0b0f0d", 0.9) +
    `<path d="${window}" fill="url(#shade)" opacity=".6"/>` +
    train +
    // Bezel round the window, then the rivets.
    line(window, INK, 2.2, 1) +
    line(window, "#c8923a", 1.2, 1) +
    line("M-10.4,-61 C-4,-62.4 2,-62.4 6,-62", BRASS_HI, 0.45, 0.8) +
    rivets +
    // A brass belly band with a maker's plate.
    shape("M-12.6,-38.4 C-6,-36.8 6,-36.8 12.6,-38.4 L12.2,-34.4 C6,-33 -6,-33 -12.2,-34.4 Z", BRASS_DK, 0.8) +
    shape("M-4,-37.6 L4,-37.6 L3.6,-34.2 L-3.6,-34.2 Z", STEEL, 0.5) +
    line("M-2.4,-36.4 L2.4,-36.4 M-2.4,-35.2 L1.2,-35.2", INK, 0.35, 0.6);

  const glow =
    energy(`<circle cx="0" cy="-52.4" r="1.5"/><circle cx="0" cy="-52.4" r="4.4" fill="none" stroke-width=".35"/><circle cx="-1.4" cy="-61" r=".45"/>`, c.energy);
  return { under, legs, torso, arms, glow };
}

// ── Helmet: Clockface ──────────────────────────────────────────────────────

function clockface(c, K) {
  const { BRASS, BRASS_DK } = brass(K);
  const dial = K.uid("dial");
  K.defs(
    `<radialGradient id="${dial}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#1a2420"/>` +
      `<stop offset=".7" stop-color="#0a100e"/><stop offset="1" stop-color="#020403"/></radialGradient>`,
  );
  const cx = 0;
  const cy = -82.4;
  const R = 12.8;
  const face = 9.2;
  // Hour marks: the quarters long and lit, the rest short painted ticks.
  const ticks = [];
  const quarters = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const big = i % 3 === 0;
    const r0 = big ? face - 3 : face - 1.9;
    const r1 = face - 0.7;
    (big ? quarters : ticks).push(`M${pt(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0)} L${pt(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1)}`);
  }
  const hand = (deg, len) => {
    const a = (deg * Math.PI) / 180;
    return `M${pt(cx - Math.sin(a) * 1.4, cy + Math.cos(a) * 1.4)} L${pt(cx + Math.sin(a) * len, cy - Math.cos(a) * len)}`;
  };
  const hours = hand(305, 5);
  const minutes = hand(58, 7.4);
  // Knurled crown and stem on top, a bow ring through it.
  const crown =
    shape(`M-1.1,${f(cy - R - 0.2)} L1.1,${f(cy - R - 0.2)} L1,${f(cy - R - 3)} L-1,${f(cy - R - 3)} Z`, STEEL_DK, 0.6) +
    shape(`M-2.8,${f(cy - R - 2.8)} L2.8,${f(cy - R - 2.8)} L2.6,${f(cy - R - 6)} L-2.6,${f(cy - R - 6)} Z`, BRASS, 0.7) +
    line([-1.6, -0.5, 0.6, 1.7].map((x) => `M${f(x)},${f(cy - R - 3.2)} L${f(x)},${f(cy - R - 5.6)}`).join(" "), GEAR_INK, 0.4, 0.8);
  // Lugs where a strap would meet the case, here bolting it to the collar.
  const lug = (s) => shape(mirrorIf(s, `M6.4,-72.4 L10.6,-75 L13.4,-69.8 L8.6,-67.4 Z`), BRASS_DK, 0.6);
  const front =
    lug(-1) +
    lug(1) +
    crown +
    // The case: a brass drum seen face-on, a coin-edge bezel round the dial.
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${BRASS}" stroke="${INK}" stroke-width="1.1"/>` +
    `<path d="${gearPath(cx, cy, R - 0.6, 36, 0.7)}" fill="none" stroke="${GEAR_INK}" stroke-width=".35" opacity=".55"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${f(R - 1.6)}" fill="${BRASS_DK}" stroke="${GEAR_INK}" stroke-width=".5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${f(face + 0.5)}" fill="#c8923a" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${face}" fill="url(#${dial})" stroke="${INK}" stroke-width=".5"/>` +
    // A dark chapter ring parts the dial from the brass, so the light on
    // it reads whatever the palette (a gold one would melt into the case).
    `<circle cx="${cx}" cy="${cy}" r="${f(face - 0.3)}" fill="none" stroke="#05080a" stroke-width="1.2"/>` +
    // Painted marks and the hands' dark backing, crisp under the light.
    line(ticks.join(" "), "#d8e2df", 0.55, 0.85) +
    line(quarters.join(" "), INK, 1.5, 1) +
    line(hours, INK, 2, 1) +
    line(minutes, INK, 1.5, 1) +
    // Patina gathering low on the case, the shine high on the left.
    line(`M${pt(cx - R + 1, cy + 4)} A${R - 0.6},${R - 0.6} 0 0 0 ${pt(cx + 6, cy + R - 1.4)}`, PATINA, 1.2, 0.55) +
    line(`M${pt(cx - R + 1.2, cy - 3)} A${R - 0.8},${R - 0.8} 0 0 1 ${pt(cx - 2, cy - R + 0.9)}`, BRASS_HI, 0.8, 0.85) +
    `<ellipse cx="-6.4" cy="-91.2" rx="3.6" ry="1.8" fill="url(#sheen)"/>` +
    line(`M${pt(cx + R - 0.4, cy - 5)} A${R},${R} 0 0 1 ${pt(cx + R - 1, cy + 5)}`, c.rim, 0.7, 0.8) +
    // Sub-dial seconds track: a faint ring inside the ticks.
    `<circle cx="${cx}" cy="${cy}" r="${f(face - 3.6)}" fill="none" stroke="${c.energy}" stroke-width=".25" opacity=".35"/>` +
    // Glass glint across the dial.
    line(`M${pt(cx - 6.4, cy - 4.4)} C${pt(cx - 4.6, cy - 6.6)} ${pt(cx - 2, cy - 7.6)} ${pt(cx + 0.4, cy - 7.8)}`, "#ffffff", 0.5, 0.4);
  const glow =
    K.eyeGlow(c, 0.35, true) +
    energy(
      `<path d="${quarters.join(" ")}" fill="none" stroke-width=".75" stroke-linecap="round"/>` +
        `<path d="${hours}" fill="none" stroke-width="1.1" stroke-linecap="round"/>` +
        `<path d="${minutes}" fill="none" stroke-width=".7" stroke-linecap="round"/>` +
        `<circle cx="${cx}" cy="${cy}" r=".9"/>`,
      c.energy,
    );
  return { front, glow };
}

// ── Shoulders: Gear Rim ────────────────────────────────────────────────────

function gearrim(c, s, K) {
  const { M, rot, lit } = K;
  const B = brass(K);
  const { BRASS, BRASS_DK } = B;
  const cx = s * 21.4;
  const cy = -58.6;
  const R = 9.6;
  // The toothed rim, then a brass dish, then the cog turning inside it.
  const rim = gearPath(cx, cy, R, 18, 1.8, s * 0.12);
  return rot(
      shape(M("M16.6,-50.4 C20.6,-51.4 25.2,-50.8 28.4,-49 L27.6,-44.6 C24.6,-46.2 20.6,-46.6 17,-46 Z"), STEEL_DK, 0.8) +
        shape(rim, BRASS_DK, 0.9) +
        `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R - 0.4)}" fill="${BRASS}" stroke="${INK}" stroke-width=".8"/>` +
        `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R - 2.4)}" fill="#120d06" stroke="${GEAR_INK}" stroke-width=".6"/>` +
        gear(B, cx + s * 0.4, cy + 0.4, 4.6, 11, { rot: s * 0.25, spokes: 5, fill: BRASS }) +
        gear(B, cx - s * 4.4, cy - 3.8, 1.9, 7, { rot: 0.1, spokes: 0, fill: STEEL }) +
        [0, 1, 2, 3, 4, 5]
          .map((i) => {
            const a = (i * Math.PI) / 3 + 0.5;
            return `<circle cx="${f(cx + Math.cos(a) * (R - 1.4))}" cy="${f(cy + Math.sin(a) * (R - 1.4))}" r=".5" fill="#ffe29a" stroke="${GEAR_INK}" stroke-width=".25"/>`;
          })
          .join("") +
        line(`M${pt(cx - s * 7.6, cy - 4.4)} A${R - 0.6},${R - 0.6} 0 0 ${s > 0 ? 1 : 0} ${pt(cx + s * 1, cy - R + 0.8)}`, BRASS_HI, 0.7, lit ? 0.9 : 0.5) +
        line(`M${pt(cx - s * 2, cy + R - 1)} A${R - 0.6},${R - 0.6} 0 0 ${s > 0 ? 0 : 1} ${pt(cx + s * 7.6, cy + 3.6)}`, PATINA, 1, 0.6) +
        (lit ? "" : line(`M${pt(cx + R + 1.2, cy - 4)} A${R + 1.2},${R + 1.2} 0 0 1 ${pt(cx + R - 0.6, cy + 5)}`, c.rim, 0.8, 0.85)),
  );
}

export default {
  id: "horologist",
  frames: {
    // Brass plate over the chest: no chest trim; the escapement carries the
    // core light.
    clockwork: { shape: { width: 1.02, shoulder: 1.02, softTorso: true }, layers: clockwork },
  },
  helmets: {
    // The winding crown stands on the top of the case and the dial fills
    // the front to the bezel, so neither crown nor brow takes gear; lamps,
    // whips and a headset sit on the case's sides at the dial's centre line.
    // The badge is a maker's mark on the bezel at half past ten.
    clockface: {
      anchors: { top: -101.2, half: 12.8, rail: -82.4, badge: { x: -7.9, y: -90.3, rot: -10, size: 3.2 } },
      paint: clockface,
    },
  },
  shoulders: {
    gearrim: { paint: gearrim },
  },
};
