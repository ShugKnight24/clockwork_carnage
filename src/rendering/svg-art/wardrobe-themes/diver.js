/**
 * Wardrobe theme "diver" (Abyssal Diver): the art for
 * src/data/wardrobe-themes/diver.js, by id. See ./index.js for what each
 * painter is given and returns.
 *
 *   diving   — canvas pressure suit over the plates, a riveted brass corselet,
 *              twin air tanks on the back with hoses round to the chest,
 *              weighted lead boots and laced cuffs
 *   porthole — round brass diving helmet: grilled front port, side ports,
 *              a bolted collar and an air fitting on the crown
 *   lantern  — a brass deep-lantern on a shoulder bracket (right side)
 */
import { INK, RIM, f, pt, lerp, shape, line, energy, muscle, armJoints, polar, heading, LIMB } from "../models/hero.js";
import { plateAt, lineAt, mirrorIf, k, T, S } from "../frame-kit.js";

const RUBBER = "#2a2421";
const BRASS_HI = "#fff1c2";

/**
 * The gear's own metals and canvas (not the palette's), as a piece's own
 * gradients: registered in the figure's defs under the piece's scoped ids
 * (K.uid, K.defs), so the frame, helmet and shoulders each carry theirs.
 * Brass, copper and lead; the canvas weathered darker than the brass so the
 * metal reads first.
 * @returns {{ BRASS: string, BRASS_DK: string, COPPER: string, CANVAS: string, LEAD: string }} fills
 */
function metals(K) {
  const id = { brass: K.uid("brass"), brassDk: K.uid("brass-dk"), copper: K.uid("copper"), canvas: K.uid("canvas"), lead: K.uid("lead") };
  K.defs(
    `<linearGradient id="${id.brass}" x1="0" y1="0" x2="1" y2=".35"><stop offset="0" stop-color="#f6dc8e"/><stop offset=".22" stop-color="#d1a247"/><stop offset=".55" stop-color="#8f6324"/><stop offset=".85" stop-color="#4f3311"/><stop offset="1" stop-color="#2c1b08"/></linearGradient>` +
      `<linearGradient id="${id.brassDk}" x1="0" y1="0" x2="1" y2=".35"><stop offset="0" stop-color="#b98a3a"/><stop offset=".5" stop-color="#6b4818"/><stop offset="1" stop-color="#2a1906"/></linearGradient>` +
      `<linearGradient id="${id.copper}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e09a68"/><stop offset=".3" stop-color="#b0613a"/><stop offset=".7" stop-color="#6a3218"/><stop offset="1" stop-color="#341607"/></linearGradient>` +
      `<linearGradient id="${id.canvas}" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#7d7052"/><stop offset=".45" stop-color="#4a4130"/><stop offset="1" stop-color="#1e1a12"/></linearGradient>` +
      `<linearGradient id="${id.lead}" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="#7c8288"/><stop offset=".4" stop-color="#4a5056"/><stop offset="1" stop-color="#1b1e22"/></linearGradient>`,
  );
  const url = (k) => `url(#${id[k]})`;
  return { BRASS: url("brass"), BRASS_DK: url("brassDk"), COPPER: url("copper"), CANVAS: url("canvas"), LEAD: url("lead") };
}

const rivet = (x, y, r = 0.65) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#e9c470" stroke="${INK}" stroke-width=".35"/>`;
/** A rubber air hose along a path: ink, rubber, a highlight and ribs. */
const hose = (d, w = 2.4) =>
  line(d, INK, w + 1.2, 1) + line(d, "#5e5348", w, 1) + line(d, "#a39280", w * 0.3, 0.7) +
  `<path d="${d}" fill="none" stroke="#0c0a09" stroke-width="${f(w)}" stroke-dasharray=".45 1.1" stroke-opacity=".7"/>`;

// ── Abyssal Diver frame ─────────────────────────────────────────────────────

function diving(P, c, K) {
  const { BRASS, BRASS_DK, COPPER, CANVAS, LEAD } = metals(K);
  let glow = "";
  // Twin copper air tanks behind the back, standing up past the shoulders,
  // a brass valve and a hose elbow on each.
  const tank = (s) =>
    shape(mirrorIf(s, "M5.4,-66 L5.6,-80.4 C5.8,-84.8 13.6,-84.8 13.8,-80.4 L14,-60 L5.4,-60 Z"), COPPER, 1) +
    line(mirrorIf(s, "M6.8,-79.8 C7,-82.6 9,-83.4 10,-83.4"), "#ffd2b0", 0.6, 0.7) +
    line(mirrorIf(s, "M5.6,-74 L13.9,-74"), INK, 0.6, 0.6) +
    shape(mirrorIf(s, "M8.4,-83.6 L11,-83.6 L11,-86.4 L8.4,-86.4 Z"), BRASS, 0.6) +
    shape(mirrorIf(s, "M7.4,-86.4 L12,-86.4 L12,-87.8 L7.4,-87.8 Z"), BRASS_DK, 0.5) +
    hose(mirrorIf(s, "M11.6,-85.6 C17,-86 19.4,-80 18.6,-72"));
  const under = tank(-1) + tank(1) + shape("M-7,-70 L7,-70 L8,-56 L-8,-56 Z", "#1f1a14", 0.8);

  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      const { kn, an } = leg;
      // Canvas trousers over the plates, a rubber knee patch, then the lead
      // boots: a heavy block up the shin with two brass straps, a brass toe
      // cap and a thick sole.
      let out =
        muscle(T(leg, 0.02), T(leg, 0.96), k(LIMB.THIGH.out, 1.06), k(LIMB.THIGH.in, 1.02), s, { fill: CANVAS, hi: 0.14, rim: 0.3, weave: true }) +
        line(`M${pt(T(leg, 0.3)[0] - s * 2, T(leg, 0.3)[1])} q${f(s * 2)},4 ${f(s * 1)},9`, "#000000", 0.5, 0.45) +
        muscle(S(leg, 0.04), S(leg, 0.6), k(LIMB.CALF.out, 1.08), k(LIMB.CALF.in, 1.06), s, { fill: CANVAS, hi: 0.12, rim: 0.3, weave: true }) +
        plateAt(S(leg, 0.04), kn, an, "M0,-5.6 C3.8,-5.6 5.8,-3.4 5.8,-0.2 C5.8,3 3.4,5.4 0,5.8 C-3.4,5.4 -5.8,3 -5.8,-0.2 C-5.8,-3.4 -3.8,-5.6 0,-5.6 Z", RUBBER, 1) +
        lineAt(S(leg, 0.04), kn, an, "M-4,-2.4 C-1.6,-3.8 1.6,-3.8 4,-2.4", "#5a504a", 0.5, 0.8) +
        [-3.6, 3.6].map((x) => lineAt(S(leg, 0.04), kn, an, `M${f(x)},-3 L${f(x)},3.4`, "#120f0d", 0.4, 0.8)).join("");
      const ax = an[0] + s * 1;
      const y = an[1];
      const shaft = `M${f(ax - 6.4)},${f(y - 13)} C${f(ax - 3)},${f(y - 14)} ${f(ax + 3)},${f(y - 14)} ${f(ax + 6.4)},${f(y - 13)} L${f(ax + 7)},${f(y + 2)} L${f(ax - 7)},${f(y + 2)} Z`;
      const foot =
        `M${f(ax - 7)},${f(y + 1)} L${f(ax + 7)},${f(y + 1)} C${f(ax + 9.4)},${f(y + 2)} ${f(ax + 10)},${f(y + 5)} ${f(ax + 9.8)},${f(y + 7)} ` +
        `L${f(ax - 9.8)},${f(y + 7)} C${f(ax - 10)},${f(y + 5)} ${f(ax - 9.4)},${f(y + 2)} ${f(ax - 7)},${f(y + 1)} Z`;
      const toe = `M${f(ax - 5)},${f(y + 1.6)} C${f(ax - 2)},${f(y + 0.6)} ${f(ax + 2)},${f(y + 0.6)} ${f(ax + 5)},${f(y + 1.6)} C${f(ax + 6.2)},${f(y + 3.4)} ${f(ax + 6.2)},${f(y + 5.4)} ${f(ax + 5.4)},${f(y + 6.8)} L${f(ax - 5.4)},${f(y + 6.8)} C${f(ax - 6.2)},${f(y + 5.4)} ${f(ax - 6.2)},${f(y + 3.4)} ${f(ax - 5)},${f(y + 1.6)} Z`;
      const sole = `M${f(ax - 10.2)},${f(y + 6.8)} L${f(ax + 10.2)},${f(y + 6.8)} L${f(ax + 9.8)},${f(y + 9.6)} L${f(ax - 9.8)},${f(y + 9.6)} Z`;
      const strap = (yy, w) =>
        shape(`M${f(ax - w)},${f(yy - 1.1)} L${f(ax + w)},${f(yy - 1.1)} L${f(ax + w + 0.2)},${f(yy + 1.1)} L${f(ax - w - 0.2)},${f(yy + 1.1)} Z`, BRASS_DK, 0.6) +
        `<rect x="${f(ax + s * 2.6 - 1.3)}" y="${f(yy - 1.5)}" width="2.6" height="3" rx=".4" fill="none" stroke="#f0cf7a" stroke-width=".55"/>` +
        line(`M${f(ax + s * 2.6)},${f(yy - 1.1)} L${f(ax + s * 2.6)},${f(yy + 1.1)}`, INK, 0.4, 0.8);
      out +=
        shape(shaft, LEAD, 1.1) +
        `<path d="${shaft}" fill="url(#cyl)"/>` +
        line(`M${f(ax - 5.4)},${f(y - 11.6)} L${f(ax - 5.8)},${f(y)}`, "#b8c0c8", 0.5, 0.45) +
        strap(y - 9, 6.6) +
        strap(y - 3.2, 6.9) +
        shape(foot, LEAD, 1.1) +
        shape(toe, BRASS, 0.8) +
        line(`M${f(ax - 4)},${f(y + 2)} C${f(ax - 1.6)},${f(y + 1.2)} ${f(ax + 1)},${f(y + 1.2)} ${f(ax + 2.6)},${f(y + 1.5)}`, BRASS_HI, 0.5, 0.8) +
        rivet(ax - 3.6, y + 5) +
        rivet(ax + 3.6, y + 5) +
        shape(sole, "#16120f", 0.9) +
        line(`M${f(ax - 8)},${f(y + 8.2)} L${f(ax + 8)},${f(y + 8.2)}`, "#3a3029", 0.6, 0.9);
      return out;
    })
    .join("");

  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      const up = heading(sh, el);
      // Canvas sleeves, baggy at the elbow, gathered into a laced rubber
      // cuff at the wrist.
      let out =
        muscle(polar(sh, up, -4), el, k(LIMB.UPPER_ARM.out, 1.1), k(LIMB.UPPER_ARM.in, 1.06), s, { fill: CANVAS, hi: 0.18, rim: 0.35, weave: true }) +
        muscle(el, lerp(el, wr, 0.66), k(LIMB.FOREARM.out, 1.12), k(LIMB.FOREARM.in, 1.08), s, { fill: CANVAS, hi: 0.14, rim: 0.3, weave: true }) +
        lineAt(el, sh, el, `M${f(-s * 4)},-1 q${f(s * 3)},2 ${f(s * 7)},0`, "#000000", 0.5, 0.5) +
        // Laced cuff.
        plateAt(lerp(el, wr, 0.8), el, wr, "M-5,-4.2 L5,-4.2 L4.6,3 L-4.6,3 Z", RUBBER, 0.9) +
        lineAt(lerp(el, wr, 0.8), el, wr, "M-4.8,-3.4 L4.8,-3.4", "#5a504a", 0.5, 0.8) +
        lineAt(lerp(el, wr, 0.8), el, wr, "M-1.6,-3 L1.6,-1 M1.6,-3 L-1.6,-1 M-1.6,-1 L1.6,1 M1.6,-1 L-1.6,1 M-1.6,1 L1.6,2.6 M1.6,1 L-1.6,2.6", "#d9c79a", 0.5, 0.95) +
        plateAt(lerp(el, wr, 0.8), el, wr, "M-5.2,2.6 L5.2,2.6 L5.2,4 L-5.2,4 Z", BRASS_DK, 0.5);
      return out;
    })
    .join("");

  // Canvas suit over the chest, a weight belt, the hoses from the tanks
  // round under the arms to the corselet, and the riveted brass corselet
  // (breastplate) at the collar with its wing-nut studs.
  const body =
    "M-16,-64.8 C-18,-56 -17.6,-46 -15.6,-38 C-14.6,-34 -14.2,-30 -14.4,-27.4 L14.4,-27.4 C14.2,-30 14.6,-34 15.6,-38 C17.6,-46 18,-56 16,-64.8 C8,-66.6 -8,-66.6 -16,-64.8 Z";
  const corselet =
    "M-15.6,-66.6 C-10,-71.4 10,-71.4 15.6,-66.6 C17.6,-62 17.4,-57.4 15.4,-53.4 C10,-50 4.6,-48.6 0,-48.4 C-4.6,-48.6 -10,-50 -15.4,-53.4 C-17.4,-57.4 -17.6,-62 -15.6,-66.6 Z";
  const neck = "M-9.6,-69 C-6,-71 6,-71 9.6,-69 L8.6,-66.2 C5,-67.6 -5,-67.6 -8.6,-66.2 Z";
  const edgeRivets = [
    [-14.6, -63.6], [-15.2, -59.4], [-14, -55.4], [-10.2, -52.4], [-5.2, -50.6], [0, -50],
    [5.2, -50.6], [10.2, -52.4], [14, -55.4], [15.2, -59.4], [14.6, -63.6],
  ].map(([x, y]) => rivet(x, y)).join("");
  const wing = (x) =>
    `<circle cx="${x}" cy="-64.6" r="1.5" fill="${BRASS}" stroke="${INK}" stroke-width=".5"/>` +
    shape(`M${f(x - 2.8)},-65.4 L${f(x + 2.8)},-65.4 L${f(x + 2.6)},-63.8 L${f(x - 2.6)},-63.8 Z`, BRASS_DK, 0.45);
  const torso =
    shape(body, CANVAS, 1) +
    `<path d="${body}" fill="url(#weave)"/>` +
    line("M-15,-46 C-12,-44 -10,-42 -9,-38 M15,-46 C12,-44 10,-42 9,-38", "#000000", 0.5, 0.45) +
    // Weight belt with lead blocks.
    line("M-15,-31 L15,-31", INK, 3.6, 1) +
    line("M-15,-31 L15,-31", "#3a2d22", 2.6, 1) +
    [-12.6, -7.4, 4.2, 9.4].map((x) => shape(`M${f(x)},-34 L${f(x + 3.4)},-34 L${f(x + 3.4)},-28 L${f(x)},-28 Z`, LEAD, 0.7) + line(`M${f(x + 0.5)},-33.2 L${f(x + 2.9)},-33.2`, "#b8c0c8", 0.4, 0.6)).join("") +
    shape("M-2.6,-33.4 L2.6,-33.4 L2.6,-28.6 L-2.6,-28.6 Z", BRASS, 0.7) +
    shape("M-1.4,-32.4 L1.4,-32.4 L1.4,-29.6 L-1.4,-29.6 Z", "none", 0.5) +
    // Hoses: from the tanks, round under the arms, up into the corselet.
    hose("M-18.4,-71 C-21.4,-62 -20,-50 -16.6,-46 C-13.4,-43 -9,-45 -7.6,-50.4") +
    hose("M18.4,-71 C21.4,-62 20,-50 16.6,-46 C13.4,-43 9,-45 7.6,-50.4") +
    // Corselet.
    shape(corselet, BRASS, 1.2) +
    line("M-14.4,-64.8 C-9,-68.6 -3,-69.4 0,-69.4", BRASS_HI, 0.8, 0.8) +
    line("M16.6,-62 C17,-58.4 16.4,-56 15,-53.8", RIM, 0.6, 0.6) +
    line("M-13.8,-55.6 C-8.8,-52.6 -4,-51.4 0,-51.2 C4,-51.4 8.8,-52.6 13.8,-55.6", "#4f3311", 0.6, 0.7) +
    `<ellipse cx="-8" cy="-62" rx="5" ry="2.6" fill="url(#sheen)" opacity=".7"/>` +
    edgeRivets +
    shape(neck, BRASS_DK, 0.9) +
    line("M-8.6,-68.6 C-4,-70.2 4,-70.2 8.6,-68.6", BRASS_HI, 0.45, 0.6) +
    wing(-11) +
    wing(11) +
    // Hose couplings where the hoses meet the plate.
    `<circle cx="-7.4" cy="-51.4" r="2" fill="${BRASS_DK}" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="7.4" cy="-51.4" r="2" fill="${BRASS_DK}" stroke="${INK}" stroke-width=".6"/>` +
    // A depth gauge on the plate.
    `<circle cx="0" cy="-58.4" r="3.4" fill="#0a0806" stroke="${INK}" stroke-width=".7"/>` +
    `<circle cx="0" cy="-58.4" r="3.4" fill="none" stroke="${BRASS_DK}" stroke-width=".9"/>` +
    line("M0,-58.4 L1.6,-60.2", "#e9c470", 0.45, 1);
  glow += energy(`<path d="M-2.2,-57.4 A2.4,2.4 0 0 1 2.2,-57.4" fill="none" stroke-width=".45"/><circle cx="0" cy="-58.4" r=".5"/>`, c.energy);
  return { under, legs, torso, arms, glow };
}

// ── Porthole helmet ────────────────────────────────────────────────────────

function porthole(c, K) {
  const { BRASS, BRASS_DK } = metals(K);
  const glass = K.mix(c.energy, "#02060a", 0.78);
  const dome = "M0,-100 C9.6,-100 15.6,-93.4 15.6,-84.4 C15.6,-77 12.6,-71.6 8.6,-69.4 L-8.6,-69.4 C-12.6,-71.6 -15.6,-77 -15.6,-84.4 C-15.6,-93.4 -9.6,-100 0,-100 Z";
  const collar = "M-13.6,-71.6 C-6,-74 6,-74 13.6,-71.6 L15.2,-67.4 C6,-65 -6,-65 -15.2,-67.4 Z";
  const side = (s) => {
    const x = s * 12.4;
    return (
      `<ellipse cx="${f(x)}" cy="-84.6" rx="2.8" ry="4" fill="${BRASS_DK}" stroke="${INK}" stroke-width=".8"/>` +
      `<ellipse cx="${f(x + s * 0.2)}" cy="-84.6" rx="1.8" ry="2.9" fill="${glass}" stroke="${INK}" stroke-width=".5"/>` +
      line(`M${f(x - 1.6)},-84.6 L${f(x + 1.8)},-84.6`, "#3a2710", 0.6, 0.9)
    );
  };
  const bolts = [-12.6, -8.4, -4.2, 0, 4.2, 8.4, 12.6].map((x) => rivet(x, -69.2 + Math.abs(x) * 0.02 - (Math.abs(x) > 10 ? 0.3 : 0), 0.85)).join("");
  // Cross grille on the front port: a ring of bars.
  const grille = "M0,-90.8 L0,-75 M-7.8,-82.9 L7.8,-82.9";
  return {
    front:
      // The bolted collar seats on the suit's own collar (the Abyssal
      // Diver's corselet under its frame, which hides the stock gorget).
      shape(collar, BRASS_DK, 1) +
      shape(dome, BRASS, 1.2) +
      `<path d="${dome}" fill="url(#cyl)" opacity=".8"/>` +
      `<ellipse cx="-7" cy="-93" rx="5" ry="3" fill="url(#sheen)"/>` +
      line("M-11.8,-93.4 C-8.6,-97.4 -4.6,-98.6 -1.6,-98.8", BRASS_HI, 0.9, 0.85) +
      line("M14.8,-89 C15.8,-85 15.6,-80.6 13.8,-76.6", c.rim, 0.7, 0.7) +
      side(-1) +
      side(1) +
      // Front port: a heavy ring, dark glass, the face dim behind it.
      `<circle cx="0" cy="-82.9" r="9.4" fill="${BRASS_DK}" stroke="${INK}" stroke-width="1"/>` +
      `<circle cx="0" cy="-82.9" r="7.8" fill="${glass}" stroke="${INK}" stroke-width=".7"/>` +
      `<g opacity=".32">${K.face(c)}</g>` +
      `<circle cx="0" cy="-82.9" r="7.8" fill="${glass}" opacity=".55"/>` +
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const r = (a * Math.PI) / 180;
        return rivet(Math.cos(r) * 8.6, -82.9 + Math.sin(r) * 8.6, 0.55);
      }).join("") +
      line(grille, INK, 2.4, 1) +
      line(grille, "#c99a3e", 1.4, 1) +
      `<circle cx="0" cy="-82.9" r="1.6" fill="${BRASS}" stroke="${INK}" stroke-width=".5"/>` +
      line("M-5.6,-87.4 C-4,-88.8 -2.4,-89.4 -1.4,-89.6", "#ffffff", 0.7, 0.6) +
      // Air fitting on the crown: a nozzle and an elbow, a hose leading off.
      shape("M-2.4,-99.6 L2.4,-99.6 L2,-102.6 L-2,-102.6 Z", BRASS_DK, 0.7) +
      shape("M-1.4,-102.6 L1.4,-102.6 L1.4,-104 L6.8,-104 L6.8,-101 L1.4,-101 Z", BRASS, 0.6) +
      hose("M6.8,-102.5 C11,-102.6 14.2,-100.4 15.8,-96.4", 2) +
      // Bolts round the collar.
      bolts +
      line("M-13,-70.6 C-6,-72.8 6,-72.8 13,-70.6", BRASS_HI, 0.45, 0.55),
    glow: K.eyeGlow(c, 0.55, true) + energy(`<circle cx="-12.4" cy="-85.6" r=".5"/><circle cx="12.4" cy="-85.6" r=".5"/>`, c.energy),
  };
}

// ── Deep Lantern shoulder ──────────────────────────────────────────────────

function lantern(c, s, K) {
  const { M, rot, lit } = K;
  const { BRASS, BRASS_DK } = metals(K);
  // A small brass plate capping the shoulder on both sides.
  const plate = "M11,-67 C16,-69.4 23,-68.4 25.6,-63 C26.8,-60.2 26.4,-57.2 25,-55.2 C22.2,-56.8 19.2,-57.2 16.4,-56.6 C16.2,-60.8 14.4,-64.4 11,-65.8 Z";
  const base =
    shape(M(plate), BRASS, 0.9) +
    line(M("M13.4,-66 C17,-67.6 21.6,-67 24,-63.4"), BRASS_HI, 0.7, lit ? 0.85 : 0.45) +
    rivet(s * 15.4, -63.2) +
    rivet(s * 21.2, -62.4) +
    (lit ? "" : line("M25.6,-62 C26.6,-59.8 26.4,-57.4 25.2,-55.6", c.rim, 0.6, 0.8));
  if (s < 0) return rot(base);
  // The lantern rides the right shoulder: an L-bracket up from the plate, a
  // caged glass with the light in it, a hood and a carry ring.
  const x = 22;
  const top = -86;
  const glassD = `M${x - 3.2},${top + 3.4} L${x + 3.2},${top + 3.4} L${x + 3.6},${top + 12.6} L${x - 3.6},${top + 12.6} Z`;
  const light = K.mix(c.energy, "#ffffff", 0.35);
  return rot(
      base +
        shape("M18,-61.4 L20.6,-61.4 L20.6,-70.4 L18,-70.4 Z", BRASS_DK, 0.7) +
        shape("M17.4,-71.6 L26.6,-71.6 L26.6,-69.6 L17.4,-69.6 Z", BRASS_DK, 0.7) +
        rivet(19.3, -63.2, 0.5) +
        // Foot and base cup.
        shape(`M${x - 4.6},${top + 12.4} L${x + 4.6},${top + 12.4} L${x + 4},${top + 15.6} L${x - 4},${top + 15.6} Z`, BRASS, 0.8) +
        // Glass with the light.
        shape(glassD, light, 0.8) +
        // Cage bars over it.
        line(`M${x - 1.2},${top + 3.6} L${x - 1.3},${top + 12.4} M${x + 1.2},${top + 3.6} L${x + 1.3},${top + 12.4} M${x - 3.4},${top + 8} L${x + 3.4},${top + 8}`, INK, 1.1, 1) +
        line(`M${x - 1.2},${top + 3.6} L${x - 1.3},${top + 12.4} M${x + 1.2},${top + 3.6} L${x + 1.3},${top + 12.4} M${x - 3.4},${top + 8} L${x + 3.4},${top + 8}`, "#c99a3e", 0.6, 1) +
        line(`M${x - 3.2},${top + 3.6} L${x - 3.6},${top + 12.4} M${x + 3.2},${top + 3.6} L${x + 3.6},${top + 12.4}`, INK, 1, 1) +
        // Hood and ring.
        shape(`M${x - 4.6},${top + 3.6} L${x + 4.6},${top + 3.6} L${x + 3},${top + 0.4} L${x - 3},${top + 0.4} Z`, BRASS, 0.8) +
        line(`M${x - 3.6},${top + 2.6} L${x + 1},${top + 1}`, BRASS_HI, 0.5, 0.8) +
        `<circle cx="${x}" cy="${top - 1.2}" r="1.8" fill="none" stroke="${INK}" stroke-width="1.3"/>` +
        `<circle cx="${x}" cy="${top - 1.2}" r="1.8" fill="none" stroke="#c99a3e" stroke-width=".6"/>` +
        // Glow from the lamp.
        `<ellipse cx="${x}" cy="${top + 8}" rx="9" ry="10" fill="${c.energy}" opacity=".12" filter="url(#bloom)"/>` +
        energy(`<rect x="${x - 0.7}" y="${top + 5}" width="1.4" height="5.4" rx=".6"/>`, c.energy),
  );
}

export default {
  id: "diver",
  frames: {
    diving: {
      // Canvas covers the chest and limbs and the corselet the neck, so no
      // chest kit, collar plate, trim or limb channels; the tanks stand
      // where a cape would hang.
      shape: { width: 1.06, shoulder: 1.02, softTorso: true, hides: ["kit", "collar", "cape", "limbGlow"] },
      layers: diving,
    },
  },
  helmets: {
    // The air fitting and its hose hold the crown, and the front port fills
    // the brow, so neither takes gear; lamps, whips and a headset sit at the
    // side ports. The badge is stamped on the dome above the left port.
    porthole: {
      anchors: { top: -100, half: 15.6, rail: -84.6, badge: { x: -10.4, y: -91.6, rot: -20, size: 3.8 } },
      paint: porthole,
    },
  },
  shoulders: {
    lantern: { paint: lantern },
  },
};
