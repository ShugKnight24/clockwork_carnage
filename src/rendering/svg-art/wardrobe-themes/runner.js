/**
 * Wardrobe theme "runner" (Neon Runner): the art for
 * src/data/wardrobe-themes/runner.js, by id. See ./index.js for what each
 * painter is given and returns.
 *
 * Neon Runner: street-crew kit thrown over the field suit. A cropped,
 * oversized jacket with a popped collar and rolled sleeves, LED ink up the
 * forearms, tape on everything, a cable from the back to a wrist deck and
 * chunky high-top sneakers with lit soles; a bare face behind a pixel-grin
 * LED mask; a studded, spiked jacket pad.
 */
import { INK, f, pt, lerp, shape, line, energy, muscle, armJoints, polar, heading, LIMB } from "../models/hero.js";
import { STEEL, STEEL_DK, plateAt, lineAt, mirrorIf, k, CHROME } from "../frame-kit.js";

const PAINT = "url(#paint)";
const TAPE = "#c9ccc4";
const TAPE_LO = "#8c9089";
const SOLE = "#e9edf0";

/** Rib knit: short vertical ticks across a band from x0 to x1 at y0..y1. */
const ribs = (x0, x1, y0, y1, step = 1.3) => {
  let d = "";
  for (let x = x0 + step / 2; x < x1; x += step) d += `M${f(x)},${f(y0)} L${f(x)},${f(y1)} `;
  return line(d, "#000000", 0.35, 0.35);
};

// ── Frame: streetwear ──────────────────────────────────────────────────────

function streetwear(P, c, K) {
  const { mix } = K;
  const lining = mix(c.pal.dark, "#000000", 0.45);
  const hot = c.energy;
  let glow = "";

  // Behind the body: the back of the popped collar standing up round the neck.
  const collarBack = "M-12.6,-64.6 L-13.8,-79.6 C-9,-82.4 9,-82.4 13.8,-79.6 L12.6,-64.6 Z";
  const under =
    shape(collarBack, lining, 1) +
    line("M-12.2,-78.6 C-8,-80.8 8,-80.8 12.2,-78.6", mix(c.pal.primary, "#ffffff", 0.2), 0.8, 0.9);

  // Legs: a strip of tape round one thigh, and chunky high-tops — a padded
  // collar, a velcro strap, a thick white midsole with a lit stripe, a tread.
  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      const { hip, kn, an } = leg;
      let out = "";
      if (s < 0) {
        const at = lerp(hip, kn, 0.62);
        out +=
          plateAt(at, hip, kn, "M-9.4,-1.8 L8.6,-1.4 L8.4,1.6 L-9.2,1.4 Z", TAPE, 0.6) +
          lineAt(at, hip, kn, "M-6,-1.6 L-5.4,1.4 M2,-1.4 L2.8,1.6", TAPE_LO, 0.4, 0.8) +
          plateAt(at, hip, kn, "M8.2,-1.4 L10.6,-2.6 L10,0.8 L8.4,1.6 Z", TAPE, 0.5);
      }
      // Street boots: a tall leather shaft laced up the front with a pull
      // tab, a buckled strap at the ankle, a scuffed toe cap and a heavy lug
      // sole; a lit welt between the upper and the sole.
      const ax = an[0] + s * 1.4;
      const y = an[1];
      const leather = "#1d1f24";
      const leatherHi = "#3a3e46";
      const shaft =
        `M${f(ax - 6)},${f(y - 16)} C${f(ax - 2)},${f(y - 17.2)} ${f(ax + 2)},${f(y - 17.2)} ${f(ax + 6)},${f(y - 16)} ` +
        `L${f(ax + 6.6)},${f(y + 1.6)} C${f(ax + 9)},${f(y + 2.6)} ${f(ax + 9.8)},${f(y + 4.6)} ${f(ax + 9.6)},${f(y + 6.4)} ` +
        `L${f(ax - 9.6)},${f(y + 6.4)} C${f(ax - 9.8)},${f(y + 4.6)} ${f(ax - 9)},${f(y + 2.6)} ${f(ax - 6.6)},${f(y + 1.6)} Z`;
      const toe = `M${f(ax - 9)},${f(y + 6.2)} C${f(ax - 8.6)},${f(y + 2.6)} ${f(ax - 4.4)},${f(y + 1.2)} ${f(ax)},${f(y + 1.2)} C${f(ax + 4.4)},${f(y + 1.2)} ${f(ax + 8.6)},${f(y + 2.6)} ${f(ax + 9)},${f(y + 6.2)} Z`;
      const sole = `M${f(ax - 10.2)},${f(y + 6.2)} L${f(ax + 10.2)},${f(y + 6.2)} L${f(ax + 10)},${f(y + 10.4)} L${f(ax - 10)},${f(y + 10.4)} Z`;
      const laces = [-13.6, -10.6, -7.6, -4.6, -1.6]
        .map((dy) => `M${f(ax - 2.4)},${f(y + dy)} L${f(ax + 2.4)},${f(y + dy + 1.2)} M${f(ax + 2.4)},${f(y + dy)} L${f(ax - 2.4)},${f(y + dy + 1.2)}`)
        .join(" ");
      const strap = `M${f(ax - 6.4)},${f(y - 4)} L${f(ax + 6.6)},${f(y - 5.2)} L${f(ax + 6.8)},${f(y - 2.2)} L${f(ax - 6.4)},${f(y - 1)} Z`;
      out +=
        shape(shaft, leather, 1) +
        `<path d="${shaft}" fill="url(#cyl)" opacity=".7"/>` +
        line(`M${f(ax - 4.8)},${f(y - 15)} C${f(ax - 5.2)},${f(y - 8)} ${f(ax - 5.4)},${f(y - 3)} ${f(ax - 5.6)},${f(y + 1)}`, leatherHi, 0.6, 0.8) +
        // Tongue and laces up the front.
        shape(`M${f(ax - 2.6)},${f(y - 16.6)} L${f(ax + 2.6)},${f(y - 16.6)} L${f(ax + 2.4)},${f(y + 1)} L${f(ax - 2.4)},${f(y + 1)} Z`, "#2a2d33", 0.5) +
        line(laces, PAINT, 0.55, 0.95) +
        // Pull tab at the back of the collar.
        shape(`M${f(ax + s * 3.6)},${f(y - 16.4)} L${f(ax + s * 5.6)},${f(y - 16)} L${f(ax + s * 5.4)},${f(y - 19.6)} L${f(ax + s * 3.8)},${f(y - 19.8)} Z`, PAINT, 0.5) +
        shape(strap, "#2e3138", 0.7) +
        `<rect x="${f(ax + 2.4)}" y="${f(y - 5.2)}" width="2.6" height="3.4" rx=".4" fill="none" stroke="#c9d2dc" stroke-width=".6"/>` +
        shape(toe, "#2b2e35", 0.8) +
        line(`M${f(ax - 6.4)},${f(y + 3.2)} C${f(ax - 3)},${f(y + 2)} ${f(ax + 3)},${f(y + 2)} ${f(ax + 6.4)},${f(y + 3.2)}`, "#ffffff", 0.45, 0.35) +
        shape(sole, "#121418", 0.9) +
        line(`M${f(ax - 8.6)},${f(y + 9)} L${f(ax - 6.6)},${f(y + 9)} M${f(ax - 3.6)},${f(y + 9)} L${f(ax - 1.2)},${f(y + 9)} M${f(ax + 1.2)},${f(y + 9)} L${f(ax + 3.6)},${f(y + 9)} M${f(ax + 6.6)},${f(y + 9)} L${f(ax + 8.6)},${f(y + 9)}`, "#30343b", 0.9, 1);
      glow += energy(`<path d="M${pt(ax - 9.4, y + 6.4)} L${pt(ax + 9.4, y + 6.4)}" fill="none" stroke-width=".7" stroke-linecap="round"/>`, hot);
      return out;
    })
    .join("");

  // The jacket: boxy, cropped above the belt, open down the front over the
  // suit, a rib-knit hem, a crew patch and a strip of tape across a tear.
  const panel =
    "M-4.6,-66.6 C-9,-67.4 -14.6,-67 -18.4,-65 C-19.8,-58 -19.6,-50 -18.6,-44 L-18.8,-41.8 L-6.2,-41.8 C-5.4,-48 -4.6,-56 -4.6,-66.6 Z";
  const right = mirrorIf(-1, panel);
  const hem = "M-18.8,-44.6 L-6,-44.6 L-6.2,-40.8 L-18.8,-40.8 Z";
  const collar = "M-8.6,-68.8 L-9.6,-78.8 L-15,-77.2 L-14.6,-64.8 C-12.6,-66 -10.6,-67.4 -8.6,-68.8 Z";
  const torso =
    shape(panel, PAINT, 1.1) +
    `<path d="${panel}" fill="url(#weave)" opacity=".5"/>` +
    shape(right, PAINT, 1.1) +
    `<path d="${right}" fill="url(#weave)" opacity=".5"/>` +
    // Lining showing at the open front, and the zip tapes.
    line("M-4.6,-66.4 C-4.6,-56 -5.4,-48 -6.2,-42 M4.6,-66.4 C4.6,-56 5.4,-48 6.2,-42", lining, 1.4, 1) +
    line("M-4,-66 C-4,-56 -4.8,-48 -5.6,-42 M4,-66 C4,-56 4.8,-48 5.6,-42", CHROME, 0.4, 0.7) +
    shape(hem, lining, 0.8) +
    shape(mirrorIf(-1, hem), lining, 0.8) +
    ribs(-18.6, -6.2, -44.2, -41.2) +
    ribs(6.2, 18.6, -44.2, -41.2) +
    // Folds: the oversized cut bunches under the arms and at the hem.
    line("M-17.4,-58 C-15.4,-54 -14.6,-50 -15,-46 M17.4,-58 C15.4,-54 14.6,-50 15,-46", "#000000", 0.5, 0.35) +
    line("M-11,-46 L-9.6,-50.4 M11,-46 L9.6,-50.4", "#000000", 0.45, 0.3) +
    line("M-17.6,-63.8 C-14,-65.6 -9.6,-66 -6,-65.8", "#ffffff", 0.7, 0.45) +
    // Popped collar: the front wings stand up beside the jaw.
    shape(collar, PAINT, 0.9) +
    shape(mirrorIf(-1, collar), PAINT, 0.9) +
    shape("M-9.6,-78.8 L-15,-77.2 L-14.8,-74.6 L-9.4,-75.8 Z", lining, 0.5) +
    shape("M9.6,-78.8 L15,-77.2 L14.8,-74.6 L9.4,-75.8 Z", lining, 0.5) +
    line("M-10.2,-75 L-14.4,-73.8 M10.2,-75 L14.4,-73.8", "#ffffff", 0.4, 0.4) +
    // LED piping round the collar's edge.
    line("M-9.4,-78.6 L-14.8,-77 M9.4,-78.6 L14.8,-77", hot, 0.9, 0.95) +
    line("M-9.4,-78.6 L-14.8,-77 M9.4,-78.6 L14.8,-77", mix(hot, "#ffffff", 0.7), 0.35, 1) +
    // Crew patch on the left breast: a cracked smiley in a hex.
    shape("M-14.2,-61 L-11.4,-62.6 L-8.6,-61 L-8.6,-57.8 L-11.4,-56.2 L-14.2,-57.8 Z", "#14171c", 0.6) +
    line("M-12.6,-60.2 L-12.6,-59.4 M-10.2,-60.2 L-10.2,-59.4 M-13,-58.4 C-12,-57.4 -10.8,-57.4 -9.8,-58.4 M-11.2,-62.4 L-11.8,-60.8 L-11,-60", hot, 0.5, 0.95) +
    // Tape across a tear on the right panel, the rip showing past its ends.
    line("M8.4,-55.6 L10,-54.2 L9.4,-52.8 L11.4,-51.6 L11,-50 L13,-48.8 L14.8,-47.6", "#000000", 0.5, 0.55) +
    plateAt([11.6, -51.6], [11.6, -51.6], [17.6, -55.6], "M-1.6,-4.8 L1.4,-4.6 L1.6,5 L-1.4,4.8 Z", TAPE, 0.55) +
    lineAt([11.6, -51.6], [11.6, -51.6], [17.6, -55.6], "M-1.2,-1.6 L1.2,-1.2", TAPE_LO, 0.35, 0.8);

  // Sleeves: oversized, pushed up and rolled just past the elbow. Below the
  // roll the suit's forearm shows, inked with LED circuit lines and wrapped
  // in tape at the wrist; the right one carries a deck, wired from the back.
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      const up = heading(sh, el);
      const roll = lerp(el, wr, 0.14);
      let out =
        muscle(polar(sh, up, -5), lerp(el, wr, 0.1), k(LIMB.UPPER_ARM.out, 1.1), k(LIMB.UPPER_ARM.in, 1.06), s, { fill: PAINT, hi: 0.25, rim: 0.4, weave: true }) +
        lineAt(lerp(sh, el, 0.62), sh, el, `M${f(-s * 5.4)},-1 C${f(-s * 2)},1.4 ${f(s * 2)},1.6 ${f(s * 5.6)},0.4`, "#000000", 0.45, 0.35) +
        // Track stripes down the outside of the sleeve, the sneakers' white.
        (() => {
          const len = Math.hypot(el[0] - sh[0], el[1] - sh[1]);
          const d = `M${f(s * 6.8)},2 L${f(s * 5.2)},${f(len + 1)} M${f(s * 4.6)},2.4 L${f(s * 3.2)},${f(len + 1.4)}`;
          return lineAt(sh, sh, el, d, INK, 1.5, 0.9) + lineAt(sh, sh, el, d, SOLE, 0.85, 1);
        })() +
        // The roll: a fat cuff turned out to show the lining.
        plateAt(roll, el, wr, "M-7.4,-2.8 C-3,-4 3,-4 7.4,-2.8 L7.8,2.4 C3,3.6 -3,3.6 -7.8,2.4 Z", lining, 1) +
        lineAt(roll, el, wr, "M-6.8,-1.6 C-3,-2.6 3,-2.6 6.8,-1.6", mix(c.pal.primary, "#ffffff", 0.3), 0.55, 0.8) +
        lineAt(roll, el, wr, "M-7,0.6 C-3,1.6 3,1.6 7,0.6", "#000000", 0.4, 0.45);
      // Tape wraps round the wrist, one loose end.
      for (const t of [0.78, 0.88])
        out += plateAt(lerp(el, wr, t), el, wr, "M-4.8,-1.2 L4.8,-0.8 L4.8,1.4 L-4.8,1 Z", TAPE, 0.5);
      out += lineAt(lerp(el, wr, 0.83), el, wr, `M${f(s * 4.6)},-1 L${f(s * 7)},1.8`, TAPE, 0.9, 1);
      // LED ink: a trace up the outside of the forearm, branching to pads.
      // On the deck arm it runs short, into the deck's edge.
      const a = lerp(el, wr, 0.24);
      const ink =
        s < 0
          ? `<path d="M${f(s * 3.4)},0 L${f(s * 3.4)},5 L${f(s * 1.6)},7 L${f(s * 1.6)},11 M${f(s * 3.4)},5 L${f(s * 4.4)},6.2 M${f(-s * 2.6)},1 L${f(-s * 2.6)},4.4 L${f(-s * 1)},6 L${f(-s * 1)},9" fill="none" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f(s * 1.6)}" cy="11.6" r=".7"/><circle cx="${f(s * 4.6)}" cy="6.4" r=".55"/><circle cx="${f(-s * 1)}" cy="9.6" r=".55"/>`
          : `<path d="M-2.6,0.4 L-2.6,2.6 L-1,4.2 M2.8,0.4 L2.8,3 L1.4,4.4" fill="none" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round"/><circle cx="0" cy="2" r=".55"/>`;
      glow += `<g transform="translate(${pt(...a)}) rotate(${f(heading(el, wr) * -1)})">` + energy(ink, hot) + `</g>`;
      if (s > 0) {
        // The deck: a slab strapped on the forearm, a lit screen, keys.
        const dk = lerp(el, wr, 0.56);
        out +=
          plateAt(dk, el, wr, "M-5.8,-4.2 L5.6,-4.2 L6.2,4.2 L-6,4.2 Z", STEEL_DK, 1) +
          plateAt(dk, el, wr, "M-4.6,-3 L4.4,-3 L4.6,0.6 L-4.6,0.6 Z", "#05080d", 0.5) +
          lineAt(dk, el, wr, "M-4,2.4 L-2.6,2.4 M-1.4,2.4 L0,2.4 M1.2,2.4 L2.6,2.4", "#9fb0c0", 0.7, 0.9);
        glow += `<g transform="translate(${pt(...dk)}) rotate(${f(heading(el, wr) * -1)})">` +
          energy(`<path d="M-3.6,-1.2 L-2.2,-1.2 L-1.4,-2.2 L0.2,0 L1.2,-1.6 L3.4,-1.6" fill="none" stroke-width=".45" stroke-linejoin="round"/>`, hot) +
          `</g>`;
        // The cable: out from behind the shoulder pad, down the outside of
        // the sleeve, a slack loop at the elbow, into the deck's side.
        const out1 = (p, from, to, off) => polar(p, heading(from, to) + 90 * s, off);
        const a0 = out1(lerp(sh, el, 0.2), sh, el, 8.2);
        const a1 = out1(lerp(sh, el, 0.7), sh, el, 7.8);
        const loop = out1(el, sh, el, 10.6);
        const end = out1(dk, el, wr, 6.2);
        const d = `M${pt(...a0)} C${pt(...a1)} ${pt(loop[0], loop[1] - 4)} ${pt(...loop)} S${pt(end[0] + s * 2.4, end[1] - 4.4)} ${pt(...end)}`;
        out += line(d, INK, 2, 1) + line(d, "#2a2f36", 1.2, 1) + line(d, "#6b7682", 0.35, 0.8) +
          plateAt(end, el, wr, `M${f(-1.4)},-1.6 L1.4,-1.6 L1.4,1.6 L-1.4,1.6 Z`, CHROME, 0.5);
      }
      return out;
    })
    .join("");

  return { under, legs, torso, arms, glow };
}

// ── Helmet: LED mask ───────────────────────────────────────────────────────

/** The face's lower half, fitted to the jaw (narrower on the feminine build). */
function maskPath(fem) {
  const sx = (x, y) => {
    if (!fem) return x;
    const t = Math.min(1, Math.max(0, (y + 79) / 8));
    return x * (0.93 - t * 0.19);
  };
  const P = (x, y) => `${f(sx(x, y))},${f(y)}`;
  return (
    `M${P(-7.8, -79.2)} C${P(-3.6, -78.2)} ${P(3.6, -78.2)} ${P(7.8, -79.2)} ` +
    `C${P(7.6, -75.6)} ${P(6.4, -73)} ${P(4.8, -71.6)} C${P(3.2, -70.4)} ${P(1.6, -70)} ${P(0, -70)} ` +
    `C${P(-1.6, -70)} ${P(-3.2, -70.4)} ${P(-4.8, -71.6)} C${P(-6.4, -73)} ${P(-7.6, -75.6)} ${P(-7.8, -79.2)} Z`
  );
}

function ledmask(c, K) {
  const { mix } = K;
  const hot = c.energy;
  const shell = "#14171c";
  const mask = maskPath(c.fem);
  const w = c.fem ? 0.86 : 1;
  // The pixel grin: a row of lit cells, curling up at the corners.
  const cells = [
    [-4, -75.4], [-3, -74.4], [-2, -74], [-1, -74], [0, -74], [1, -74], [2, -74], [3, -74.4], [4, -75.4],
    [-2, -72.8], [-1, -72.4], [0, -72.4], [1, -72.4], [2, -72.8],
  ];
  const grid = cells.map(([x, y]) => `<rect x="${f(x * w - 0.42)}" y="${f(y - 0.42)}" width=".84" height=".84"/>`).join("");
  const dark = [];
  for (let x = -5; x <= 5; x++) for (const y of [-76.6, -75.4, -74.2, -73, -71.8]) dark.push(`<rect x="${f(x * w - 0.36)}" y="${f(y - 0.36)}" width=".72" height=".72"/>`);
  const jack = (s) =>
    `<rect x="${f(s * 7.6 - 1.3)}" y="-82" width="2.6" height="3.4" rx=".6" fill="${STEEL_DK}" stroke="${INK}" stroke-width=".5"/>` +
    `<circle cx="${f(s * 7.6)}" cy="-80.3" r=".7" fill="${CHROME}" stroke="${INK}" stroke-width=".3"/>`;
  const cord = "M7.8,-78.6 C10.6,-76 10.4,-72.4 8,-70.2 C6.8,-69 6.2,-67.6 6.4,-66";
  const band = "M-9.6,-84.4 L9.6,-84.4 L9.4,-80.6 L-9.4,-80.6 Z";
  // Nothing worn on the face has room under the mask (faceSlots), so this
  // places nothing; asked all the same, as every open helmet asks.
  const acc = K.faceAccessories();
  return {
    front:
      K.hairBack(c) +
      K.face(c) +
      acc.front +
      K.hair(c, false) +
      // Ear jacks, and the cord dropping from the right one to the collar.
      jack(-1) +
      line(cord, INK, 1.3, 1) +
      line(cord, "#2a2f36", 0.7, 1) +
      jack(1) +
      // The mask: a hard shell over the mouth and jaw, strapped behind the ears.
      line("M-7.6,-78.8 L-8.6,-80.4 M7.6,-78.8 L8.6,-80.4", INK, 1, 1) +
      shape(mask, shell, 0.9) +
      `<g fill="#232830">${dark.join("")}</g>` +
      line(`M${f(-6.6 * w)},-78.2 C${f(-3 * w)},-77.4 ${f(3 * w)},-77.4 ${f(6.6 * w)},-78.2`, "#5a6370", 0.45, 0.8) +
      // The holo band: a thin tinted strip across the eyes.
      shape(band, mix(hot, "#05080d", 0.55), 0.45, ` fill-opacity=".55"`) +
      line("M-9.2,-84 L9.2,-84", "#ffffff", 0.35, 0.6) +
      `<rect x="-10.6" y="-83.8" width="1.4" height="2.8" rx=".4" fill="${STEEL_DK}" stroke="${INK}" stroke-width=".4"/>` +
      `<rect x="9.2" y="-83.8" width="1.4" height="2.8" rx=".4" fill="${STEEL_DK}" stroke="${INK}" stroke-width=".4"/>`,
    glow:
      energy(`<g stroke="none">${grid}</g>`, hot) +
      energy(`<path d="M-9,-84 L9,-84" fill="none" stroke-width=".4"/><path d="M4.4,-82.6 L7.4,-82.6" fill="none" stroke-width=".3"/><circle cx="-7.6" cy="-80.3" r=".45"/><circle cx="7.6" cy="-80.3" r=".45"/>`, hot) +
      K.eyeGlow(c, 0.55, true) +
      acc.glow,
    nape: K.hairNape(c, false),
  };
}

// ── Shoulders: spike pad ───────────────────────────────────────────────────

function spikepad(c, s, K) {
  const { M, rot, lit, mix } = K;
  // A padded jacket shoulder: a rounded cap that rolls over the joint and
  // swells at its hem, quilted in bands that follow the curve, studs along
  // its crown. The right pad grows short spikes and a tape X; the left takes
  // a reflective stripe. The pair never quite match.
  const pad =
    "M11,-67.6 C15.4,-70.2 20.6,-71.4 25,-70.6 C28.6,-69.8 31,-66.8 31.4,-62.6 C31.6,-59.8 31.2,-57.4 30.2,-55.2 " +
    "C26,-53.4 21,-53.4 17.2,-54.4 C17.4,-59.4 15.4,-63.8 11,-65.6 Z";
  const studs = [[14.8, -69], [19, -70.4], [23.4, -70.7], [27.6, -69.2], [30.4, -65.8]]
    .map(([x, y]) => `<circle cx="${f(s * x)}" cy="${f(y)}" r=".9" fill="${STEEL}" stroke="${INK}" stroke-width=".45"/><circle cx="${f(s * x - 0.3)}" cy="${f(y - 0.3)}" r=".28" fill="#ffffff" opacity=".85"/>`)
    .join("");
  const spikes =
    s > 0
      ? ["M16.6,-69.4 L17.2,-75.8 L19.8,-70.6 Z", "M21.4,-70.8 L23.2,-77.4 L24.8,-70.6 Z", "M26.2,-69.8 L30.2,-74.8 L29.2,-67.8 Z", "M30.6,-66.4 L35.8,-66.8 L31.4,-62.2 Z"]
          .map((d) => shape(M(d), STEEL, 0.7) + line(M(d.split(" L").slice(0, 2).join(" L")), "#ffffff", 0.35, 0.6))
          .join("")
      : "";
  const mark =
    s < 0
      ? shape(M("M15.4,-62.6 C20.4,-64.8 26.4,-65.2 31.2,-63.4 L31.4,-59.4 C26.4,-61.2 20.8,-60.8 16.6,-58.6 Z"), "#dfe6ea", 0.7) +
        line(M("M19,-63.6 L19.8,-59.6 M22.8,-64.4 L23.4,-60.4 M26.8,-64.6 L27.2,-60.6"), "#97a3ab", 0.55, 0.9) +
        line(M("M16,-62 C20.6,-64 26.2,-64.4 30.8,-62.8"), "#ffffff", 0.45, 0.95)
      : shape(M("M20.6,-63.6 L27.8,-58.2 L26.8,-56.8 L19.6,-62.2 Z"), TAPE, 0.5) +
        shape(M("M27.4,-63.8 L20.2,-58 L19.2,-59.4 L26.4,-65 Z"), TAPE, 0.5);
  return rot(
    spikes +
      shape(M(pad), PAINT, 1.1) +
      `<path d="${M(pad)}" fill="url(#weave)" opacity=".5"/>` +
      // Quilting seams.
      line(M("M17,-59.8 C21.6,-61.8 26.8,-62 31.2,-60.2 M15.4,-65 C20,-67.2 25.6,-67.6 30.4,-65.8"), "#000000", 0.5, 0.35) +
      line(M("M17.6,-55.6 C21.6,-54.8 26,-55 29.8,-56.4"), mix(c.pal.dark, "#000000", 0.3), 1.6, 0.8) +
      mark +
      studs +
      line(M("M13.2,-67.2 C17.4,-69.4 21.8,-70.2 25,-69.8"), "#ffffff", 0.6, lit ? 0.6 : 0.3) +
      (lit ? "" : line("M31.4,-63.4 C31.6,-60.2 31.2,-57.8 30.4,-55.8", c.rim, 0.8, 0.85)),
  );
}

export default {
  id: "runner",
  frames: {
    streetwear: {
      // A jacket over the chest and arms: no chest kit, collar plate or
      // chest trim, and the frame draws its own limb lights (forearm ink,
      // lit welts).
      shape: { width: 1.04, shoulder: 1, softTorso: true },
      layers: streetwear,
    },
  },
  helmets: {
    // A bare head: the top and brow of the issued suit's bare heads (night
    // vision straps on over the hair), side gear on the holo band's ends at
    // the ear jacks. Nothing holds a plume on bare hair, and the rig draws
    // no helmet badge on a face that shows.
    // Its seats and face room are on the data entry.
    ledmask: { anchors: { top: -95, half: 10.6, rail: -82.4, badge: false }, paint: ledmask },
  },
  shoulders: {
    spikepad: { paint: spikepad },
  },
};
