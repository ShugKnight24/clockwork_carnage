/**
 * Wardrobe theme "ranger" (Void Ranger): the art for
 * src/data/wardrobe-themes/ranger.js, by id. See ./index.js for what each
 * painter is given and returns.
 *
 * Void Ranger: a retro explorer's pressure suit. The suit's whites are fixed
 * (they stay off the rig's colour map); trims and patches take the palette,
 * lamps the energy colour.
 */
import { INK, f, pt, lerp, shape, line, muscle, energy, armJoints, polar, heading, LIMB } from "../models/hero.js";
import { STEEL, STEEL_DK, plateAt, lineAt, mirrorIf, k, T, S } from "../frame-kit.js";

// Suit cloth: lit, base, shade, crease.
const W0 = "#f6f7f5";
const W1 = "#e2e5e4";
const W2 = "#c2c8cb";
const W3 = "#8e979e";
const SOLE = "#4c535a";
const TETHER = "#e08a2c";

/** A puffy cloth limb segment: the rig's shading over a white fill. */
const puff = (a, b, out, inn, s, o = {}) => muscle(a, b, out, inn, s, { fill: W1, hi: 0.7, hiColor: "#ffffff", rim: 0.35, ...o });

/** A pill-shaped band across a limb, in the limb's local frame. */
const band = (hw, h) =>
  `M${f(-hw)},${f(-h)} L${f(hw)},${f(-h)} C${f(hw + 1.4)},${f(-h)} ${f(hw + 1.4)},${f(h)} ${f(hw)},${f(h)} L${f(-hw)},${f(h)} C${f(-hw - 1.4)},${f(h)} ${f(-hw - 1.4)},${f(-h)} ${f(-hw)},${f(-h)} Z`;

/** Accordion ribs over a joint: `n` stacked bands from p0 to p1, fattest in the middle. */
function ribs(p0, p1, n, hw) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const at = lerp(p0, p1, t);
    const w = hw * (0.9 + 0.14 * Math.sin(Math.PI * t));
    out +=
      plateAt(at, p0, p1, band(w, 1.5), i % 2 ? W2 : W1, 0.7) +
      lineAt(at, p0, p1, `M${f(-w + 0.6)},-0.7 L${f(w - 1.4)},-0.7`, "#ffffff", 0.5, 0.75) +
      lineAt(at, p0, p1, `M${f(-w + 0.4)},1 L${f(w)},1`, W3, 0.45, 0.6);
  }
  return out;
}

/** A round mission patch: ringed disc, a planet with its ring, a star. */
function patch(x, y, r, c) {
  return (
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c.pal.dark}" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.76)}" fill="${c.pal.primary}" stroke="${INK}" stroke-width=".35"/>` +
    `<circle cx="${f(x - r * 0.12)}" cy="${f(y + r * 0.08)}" r="${f(r * 0.34)}" fill="${c.pal.accent}" stroke="${INK}" stroke-width=".3"/>` +
    `<ellipse cx="${f(x - r * 0.12)}" cy="${f(y + r * 0.08)}" rx="${f(r * 0.58)}" ry="${f(r * 0.16)}" fill="none" stroke="#ffffff" stroke-width="${f(r * 0.09)}" transform="rotate(-18 ${pt(x - r * 0.12, y + r * 0.08)})"/>` +
    `<circle cx="${f(x + r * 0.42)}" cy="${f(y - r * 0.38)}" r="${f(r * 0.1)}" fill="#ffffff"/>` +
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.88)}" fill="none" stroke="#ffffff" stroke-width=".25" stroke-dasharray=".6 .5" opacity=".7"/>`
  );
}

/** A round gauge: bezel, cream face, ticks and a needle at `deg`. */
function dial(x, y, r, deg) {
  const n = polar([x, y], 180 - deg, r * 0.72);
  const ticks = [-60, -30, 0, 30, 60]
    .map((a) => {
      const p0 = polar([x, y], 180 - a, r * 0.62);
      const p1 = polar([x, y], 180 - a, r * 0.82);
      return `M${pt(...p0)} L${pt(...p1)}`;
    })
    .join(" ");
  return (
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${STEEL}" stroke="${INK}" stroke-width=".6"/>` +
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.8)}" fill="#f1ead2" stroke="${INK}" stroke-width=".35"/>` +
    line(ticks, INK, 0.3, 0.8) +
    `<path d="M${pt(x, y + r * 0.8)} A${f(r * 0.8)},${f(r * 0.8)} 0 0 0 ${pt(x + r * 0.69, y + r * 0.4)} L${pt(x, y)} Z" fill="#c8402e" opacity=".45"/>` +
    line(`M${pt(x, y)} L${pt(...n)}`, "#a8241a", 0.45) +
    `<circle cx="${f(x)}" cy="${f(y)}" r=".45" fill="${INK}"/>` +
    line(`M${pt(x - r * 0.6, y - r * 0.3)} C${pt(x - r * 0.5, y - r * 0.6)} ${pt(x - r * 0.2, y - r * 0.72)} ${pt(x + r * 0.1, y - r * 0.74)}`, "#ffffff", 0.35, 0.8)
  );
}

/** A toggle switch: a plate, a lever flicked up or down. */
function toggle(x, y, up) {
  const tip = up ? y - 2.4 : y + 2.4;
  return (
    shape(`M${pt(x - 1.3, y - 1.3)} L${pt(x + 1.3, y - 1.3)} L${pt(x + 1.3, y + 1.3)} L${pt(x - 1.3, y + 1.3)} Z`, STEEL_DK, 0.4) +
    line(`M${pt(x, y)} L${pt(x + 0.3, tip)}`, INK, 1.1) +
    line(`M${pt(x, y)} L${pt(x + 0.3, tip)}`, "#d7dde2", 0.55) +
    `<circle cx="${f(x + 0.3)}" cy="${f(tip)}" r=".55" fill="#d7dde2" stroke="${INK}" stroke-width=".3"/>`
  );
}

// ── Spacesuit ───────────────────────────────────────────────────────────────

function spacesuit(P, c) {
  let glow = "";

  // Life-support pack behind the shoulders: a boxy backpack with oxygen
  // bottles on its flanks and a whip antenna off the left corner.
  const pack = "M-15,-75 L15,-75 C17,-75 18,-74 18,-72 L18.6,-38 C18.6,-36 17.6,-35 15.6,-35 L-15.6,-35 C-17.6,-35 -18.6,-36 -18.6,-38 L-18,-72 C-18,-74 -17,-75 -15,-75 Z";
  const bottle = (s) =>
    shape(mirrorIf(s, "M18.4,-70 C21.6,-70 22.6,-68.6 22.6,-66 L22.6,-44 C22.6,-41.4 21.6,-40 18.4,-40 Z"), W2, 0.8) +
    line(mirrorIf(s, "M19.4,-67 L19.4,-43"), "#ffffff", 0.6, 0.55) +
    line(mirrorIf(s, "M18.6,-62 L22.4,-62 M18.6,-48 L22.4,-48"), c.pal.primary, 1.1, 0.9);
  const under =
    line("M-16.4,-76.8 L-15.6,-104", INK, 1.8) +
    line("M-16.4,-76.8 L-15.6,-104", "#c9d1d8", 0.7) +
    shape("M-18.6,-80 L-14,-80 L-14,-75 L-18.6,-75 Z", STEEL_DK, 0.6) +
    bottle(-1) +
    bottle(1) +
    shape(pack, W2, 1.1) +
    `<path d="${pack}" fill="url(#cyl)"/>` +
    shape("M-15.6,-75 L15.6,-75 L16,-71.4 L-16,-71.4 Z", c.pal.primary, 0.6) +
    line("M-14.6,-69.6 L-15.4,-39 M14.6,-69.6 L15.4,-39", W3, 0.5, 0.7);
  glow += energy(`<circle cx="-15.6" cy="-104.4" r="1.1"/>`, c.energy);

  const legs = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      const { kn, an } = leg;
      // Puffy cloth thigh and shin over the plates, accordion ribs over the knee.
      let out =
        puff(T(leg, 0), T(leg, 0.86), k(LIMB.THIGH.out, 1.12), k(LIMB.THIGH.in, 1.06), s) +
        lineAt(T(leg, 0.3), leg.hip, kn, `M${f(s * 4)},-4 L${f(s * 4.6)},5`, W3, 0.5, 0.5) +
        puff(S(leg, 0.14), S(leg, 0.66), k(LIMB.CALF.out, 1.18), k(LIMB.CALF.in, 1.14), s) +
        ribs(T(leg, 0.78), S(leg, 0.2), 4, 7.4);
      // A flapped tool pocket on the left thigh.
      if (s < 0)
        out +=
          plateAt(T(leg, 0.42), leg.hip, kn, "M-7.4,-4.2 L-1.4,-4.2 L-1.6,5.6 C-3.4,6.4 -5.6,6.4 -7.2,5.6 Z", W1, 0.7) +
          plateAt(T(leg, 0.42), leg.hip, kn, "M-7.8,-5 L-1,-5 L-1.2,-1.6 L-7.6,-1.6 Z", W2, 0.7) +
          lineAt(T(leg, 0.42), leg.hip, kn, "M-7,4.4 C-5.4,5 -3.4,5 -2,4.4", W3, 0.4, 0.7) +
          `<circle cx="${f(T(leg, 0.42)[0] - 4.4)}" cy="${f(T(leg, 0.42)[1] - 2.6)}" r=".55" fill="${c.pal.primary}" stroke="${INK}" stroke-width=".3"/>`;
      // Moon boot: a fat padded shaft with a palette cuff, a bulbous foot and a
      // thick grey tread.
      const ax = an[0] + s * 1;
      const y = an[1];
      const shaft = `M${f(ax - 7.8)},${f(y - 14)} C${f(ax - 3)},${f(y - 15.4)} ${f(ax + 3)},${f(y - 15.4)} ${f(ax + 7.8)},${f(y - 14)} C${f(ax + 8.8)},${f(y - 8)} ${f(ax + 9)},${f(y - 3)} ${f(ax + 8.6)},${f(y + 1)} L${f(ax - 8.6)},${f(y + 1)} C${f(ax - 9)},${f(y - 3)} ${f(ax - 8.8)},${f(y - 8)} ${f(ax - 7.8)},${f(y - 14)} Z`;
      const foot =
        `M${f(ax - 8.8)},${f(y - 0.4)} L${f(ax + 8.8)},${f(y - 0.4)} C${f(ax + 11)},${f(y + 1)} ${f(ax + 11.4)},${f(y + 4.4)} ${f(ax + 11)},${f(y + 6.4)} ` +
        `L${f(ax - 11)},${f(y + 6.4)} C${f(ax - 11.4)},${f(y + 4.4)} ${f(ax - 11)},${f(y + 1)} ${f(ax - 8.8)},${f(y - 0.4)} Z`;
      const sole = `M${f(ax - 11.4)},${f(y + 6.2)} L${f(ax + 11.4)},${f(y + 6.2)} L${f(ax + 11)},${f(y + 9.2)} L${f(ax - 11)},${f(y + 9.2)} Z`;
      out +=
        shape(shaft, W1, 1.1) +
        `<path d="${shaft}" fill="url(#cyl)"/>` +
        line(`M${f(ax - 6.4)},${f(y - 12)} C${f(ax - 7.2)},${f(y - 7)} ${f(ax - 7.2)},${f(y - 3)} ${f(ax - 6.8)},${f(y - 0.6)}`, "#ffffff", 0.9, 0.7) +
        line(`M${f(ax - 8.4)},${f(y - 7)} C${f(ax - 3)},${f(y - 6)} ${f(ax + 3)},${f(y - 6)} ${f(ax + 8.6)},${f(y - 7)}`, W3, 0.5, 0.6) +
        shape(`M${f(ax - 8)},${f(y - 15)} C${f(ax - 3)},${f(y - 16.6)} ${f(ax + 3)},${f(y - 16.6)} ${f(ax + 8)},${f(y - 15)} L${f(ax + 8.2)},${f(y - 12.2)} C${f(ax + 3)},${f(y - 13.6)} ${f(ax - 3)},${f(y - 13.6)} ${f(ax - 8.2)},${f(y - 12.2)} Z`, c.pal.primary, 0.8) +
        shape(foot, W1, 1.1) +
        `<path d="${foot}" fill="url(#cyl)"/>` +
        line(`M${f(ax - 8.6)},${f(y + 1.2)} C${f(ax - 4)},${f(y + 0.4)} ${f(ax + 2)},${f(y + 0.4)} ${f(ax + 6)},${f(y + 1)}`, "#ffffff", 0.7, 0.7) +
        shape(sole, SOLE, 0.9) +
        line(`M${f(ax - 9)},${f(y + 7.7)} L${f(ax - 6.6)},${f(y + 7.7)} M${f(ax - 4)},${f(y + 7.7)} L${f(ax - 1.4)},${f(y + 7.7)} M${f(ax + 1.4)},${f(y + 7.7)} L${f(ax + 4)},${f(y + 7.7)} M${f(ax + 6.6)},${f(y + 7.7)} L${f(ax + 9)},${f(y + 7.7)}`, "#262b30", 0.9, 0.9);
      return out;
    })
    .join("");

  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      const up = heading(sh, el);
      const cuffAt = lerp(el, wr, 0.84);
      let out =
        puff(polar(sh, up, -4.4), lerp(sh, el, 0.86), k(LIMB.UPPER_ARM.out, 1.14), k(LIMB.UPPER_ARM.in, 1.1), s) +
        puff(lerp(el, wr, 0.14), cuffAt, k(LIMB.FOREARM.out, 1.18), k(LIMB.FOREARM.in, 1.14), s) +
        ribs(lerp(sh, el, 0.78), lerp(el, wr, 0.22), 3, 6.4) +
        // Glove gauntlet: a palette ring at the wrist.
        plateAt(cuffAt, el, wr, band(5.4, 1.7), c.pal.primary, 0.8) +
        lineAt(cuffAt, el, wr, "M-4.6,-0.8 L3.8,-0.8", "#ffffff", 0.45, 0.5);
      // Mission patch on the left (lit) arm, a flag stripe on the right.
      if (s < 0) {
        // Patch pads carry their own; then the sleeve stays plain.
        const p = lerp(sh, el, 0.56);
        if (c.shoulder !== "patches") out += patch(p[0] - 1.4, p[1], 3.6, c);
      } else {
        out +=
          plateAt(lerp(sh, el, 0.56), sh, el, "M-3.4,-2.4 L4.4,-2.4 L4.4,2.4 L-3.4,2.4 Z", c.pal.dark, 0.5) +
          lineAt(lerp(sh, el, 0.56), sh, el, "M-3.4,-0.8 L4.4,-0.8 M-3.4,0.8 L4.4,0.8", W0, 0.5, 0.9);
      }
      return out;
    })
    .join("");

  // Suit body: a quilted white torso and seat, a soft collar ring, a belt with
  // a tether coiled on the right hip, and the chest life-support box.
  const body =
    "M-16.6,-65.4 C-18.6,-56 -18.2,-46 -16.2,-38 C-15.2,-34 -14.8,-30 -15.4,-26 C-15.8,-21 -16,-14 -15.4,-9.6 C-10,-7.6 -4,-8.4 0,-11.4 C4,-8.4 10,-7.6 15.4,-9.6 C16,-14 15.8,-21 15.4,-26 C14.8,-30 15.2,-34 16.2,-38 C18.2,-46 18.6,-56 16.6,-65.4 C8,-67.6 -8,-67.6 -16.6,-65.4 Z";
  const collar = "M-11.6,-71.6 C-6,-73.6 6,-73.6 11.6,-71.6 L13.2,-66 C6,-63.6 -6,-63.6 -13.2,-66 Z";
  const coil = [0, 1, 2]
    .map((j) => {
      const e = `<ellipse cx="${f(15.2 + j * 0.5)}" cy="${f(-19.4 + j * 1.5)}" rx="4.2" ry="2.6" fill="none" transform="rotate(-14 ${pt(15.2 + j * 0.5, -19.4 + j * 1.5)})"`;
      return `${e} stroke="${INK}" stroke-width="2"/>${e} stroke="${TETHER}" stroke-width="1.1"/>`;
    })
    .join("");
  const box = "M-9.6,-62 L9.6,-62 C10.6,-62 11,-61.6 11,-60.6 L11,-45.6 C11,-44.6 10.6,-44.2 9.6,-44.2 L-9.6,-44.2 C-10.6,-44.2 -11,-44.6 -11,-45.6 L-11,-60.6 C-11,-61.6 -10.6,-62 -9.6,-62 Z";
  const torso =
    shape(body, W1, 1.1) +
    `<path d="${body}" fill="url(#cyl)"/>` +
    // Quilting: soft seams across the chest and down the flanks.
    line("M-16.8,-48 C-11,-46.6 -11,-46.6 -11,-46.6 M11,-46.6 C13,-47 15,-47.4 16.8,-48", W3, 0.5, 0.6) +
    line("M-15.4,-39 C-8,-37.6 8,-37.6 15.4,-39", W3, 0.5, 0.6) +
    line("M-14,-63.4 C-15.6,-56 -15.6,-48 -14.2,-41", "#ffffff", 1, 0.65) +
    line("M0,-44 L0,-32 M0,-26 L0,-11.6", W3, 0.5, 0.7) +
    // Hoses from the box sides up over the shoulders to the pack.
    line("M-11,-50 C-15.4,-51 -16.4,-58 -14.2,-66.4", INK, 2.6) +
    line("M-11,-50 C-15.4,-51 -16.4,-58 -14.2,-66.4", W2, 1.6) +
    line("M11,-50 C15.4,-51 16.4,-58 14.2,-66.4", INK, 2.6) +
    line("M11,-50 C15.4,-51 16.4,-58 14.2,-66.4", W2, 1.6) +
    line("M-14.6,-53 L-13.4,-53.3 M-15.3,-57 L-14,-57.1 M-15.1,-61 L-13.8,-61 M14.6,-53 L13.4,-53.3 M15.3,-57 L14,-57.1 M15.1,-61 L13.8,-61", W3, 0.5, 0.9) +
    shape(collar, W1, 1) +
    line("M-10.6,-70.6 C-5,-72.2 5,-72.2 10.6,-70.6", "#ffffff", 0.8, 0.8) +
    line("M-12.4,-66.6 C-6,-64.8 6,-64.8 12.4,-66.6", W3, 0.5, 0.8) +
    // Chest box: a label strip, two gauges, two switches and a status lamp.
    shape(box, STEEL_DK, 1) +
    shape("M-9.6,-60.8 L9.6,-60.8 L9.6,-45.4 L-9.6,-45.4 Z", "#d3d8dc", 0.6) +
    shape("M-9.6,-60.8 L9.6,-60.8 L9.6,-58.4 L-9.6,-58.4 Z", c.pal.primary, 0.5) +
    line("M-8,-59.6 L-2,-59.6 M1,-59.6 L3,-59.6", c.pal.dark, 0.6, 0.9) +
    dial(-4.6, -53.8, 3.2, 35) +
    dial(4.6, -53.8, 3.2, -20) +
    toggle(-5.4, -47.8, true) +
    toggle(-1.6, -47.8, false) +
    `<circle cx="5.6" cy="-47.8" r="1.4" fill="#05080d" stroke="${INK}" stroke-width=".4"/>` +
    // Belt and buckle.
    shape("M-15.6,-31.6 C-8,-30.4 8,-30.4 15.6,-31.6 L15.6,-27.4 C8,-26.2 -8,-26.2 -15.6,-27.4 Z", c.pal.dark, 0.9) +
    line("M-15,-30.6 C-8,-29.4 8,-29.4 15,-30.6", "#ffffff", 0.45, 0.35) +
    shape("M-3,-32.4 L3,-32.4 L3,-26.4 L-3,-26.4 Z", STEEL, 0.8) +
    shape("M-1.6,-31 L1.6,-31 L1.6,-27.8 L-1.6,-27.8 Z", c.pal.primary, 0.4) +
    // Tether: a clip on the belt, the line coiled on the hip.
    line("M11.4,-27.4 C12.4,-24.6 13,-22.6 13.2,-21.4", INK, 1.8) +
    line("M11.4,-27.4 C12.4,-24.6 13,-22.6 13.2,-21.4", TETHER, 0.9) +
    coil +
    shape("M10,-30.6 L12.8,-30.6 L12.6,-26.8 L10.2,-26.8 Z", STEEL, 0.5);
  glow += energy(`<circle cx="5.6" cy="-47.8" r=".75"/>`, c.energy);
  return { under, legs, torso, arms, glow };
}

// ── Bubble helmet ───────────────────────────────────────────────────────────

const BX = 0;
const BY = -84;
const BR = 15.6;

function bubble(c, K) {
  const tint = K.mix(c.energy, "#ffffff", 0.55);
  const [clipId, glassId] = [K.uid("clip"), K.uid("glass")];
  // The glass's own clip and tint, in the figure's defs under scoped ids.
  K.defs(`<clipPath id="${clipId}"><circle cx="${BX}" cy="${BY}" r="${BR - 0.6}"/></clipPath>`);
  K.defs(
    `<radialGradient id="${glassId}" cx=".38" cy=".32" r=".7">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>` +
    `<stop offset=".62" stop-color="${tint}" stop-opacity=".08"/>` +
    `<stop offset=".9" stop-color="${tint}" stop-opacity=".3"/>` +
      `<stop offset="1" stop-color="#ffffff" stop-opacity=".45"/></radialGradient>`,
  );
  const ring = "M-12,-71.6 C-6,-73.8 6,-73.8 12,-71.6 L12.8,-66.6 C6,-64.2 -6,-64.2 -12.8,-66.6 Z";
  // The face shows through the glass only: its items and their light are
  // kept inside it.
  const r = BR - 0.6;
  const acc = K.faceAccessories({ window: `M${BX - r},${BY} A${r},${r} 0 1,0 ${BX + r},${BY} A${r},${r} 0 1,0 ${BX - r},${BY} Z` });
  const lamp = "M10.6,-76.6 L15.4,-78.6 L17.4,-74.2 L13.2,-71.8 Z";
  return {
    front:
      // The far side of the dome: a faint tinted back and the inside of the ring.
      `<circle cx="${BX}" cy="${BY}" r="${BR}" fill="${K.mix(c.energy, "#02060a", 0.8)}" opacity=".35"/>` +
      `<ellipse cx="0" cy="-71" rx="10.8" ry="1.9" fill="#0a0f16" opacity=".8"/>` +
      // The head inside the glass, the eyes and face items on it.
      `<g clip-path="url(#${clipId})">${K.hairBack(c)}${K.face(c)}${acc.front}${K.hair(c, false)}</g>` +
      // The glass: tinted toward the edge, inked, a bright window reflection and a rim light.
      `<circle cx="${BX}" cy="${BY}" r="${BR}" fill="url(#${glassId})" stroke="${INK}" stroke-width="1.1"/>` +
      `<circle cx="${BX}" cy="${BY}" r="${BR - 0.9}" fill="none" stroke="#ffffff" stroke-width=".4" opacity=".35"/>` +
      line("M-12.6,-90 C-10.8,-95 -6.6,-98.4 -1.4,-99", "#ffffff", 1.6, 0.75) +
      line("M-13.8,-85 C-13.9,-86.4 -13.7,-87.4 -13.4,-88.2", "#ffffff", 1.1, 0.6) +
      `<path d="M4.6,-96.6 C7.4,-95.8 9.6,-94.2 11.2,-92.2 L9.4,-90.8 C8,-92.6 6.2,-93.8 3.8,-94.6 Z" fill="#ffffff" opacity=".45"/>` +
      `<circle cx="-8.6" cy="-93.4" r=".9" fill="#ffffff" opacity=".85"/>` +
      line("M14.6,-79 C13.6,-75.4 11.8,-72.8 9.6,-71", c.rim, 0.8, 0.75) +
      // Neck ring: a steel collar with a palette band, the lamp on its right.
      shape(ring, STEEL, 1) +
      shape("M-12.3,-69.6 C-6,-71.6 6,-71.6 12.3,-69.6 L12.5,-68 C6,-66 -6,-66 -12.5,-68 Z", c.pal.primary, 0.5) +
      line("M-11.4,-71.4 C-6,-73 2,-73.2 6,-72.6", "#ffffff", 0.6, 0.65) +
      `<g fill="#0c1116"><circle cx="-9.6" cy="-67.2" r=".45"/><circle cx="-4.8" cy="-66" r=".45"/><circle cx="4.8" cy="-66" r=".45"/><circle cx="9.6" cy="-67.2" r=".45"/></g>` +
      shape(lamp, STEEL_DK, 0.8) +
      shape("M15.2,-78.2 L17.4,-74.2 L16.2,-73.4 L14,-77.4 Z", "#1a2026", 0.4),
    glow:
      energy(`<path d="M15.4,-77.6 L16.9,-74.6" fill="none" stroke-width="1.1" stroke-linecap="round"/>`, c.energy) +
      `<path d="M16.6,-76.4 L24,-79.4 L25.6,-72.6 Z" fill="${c.energy}" opacity=".12" filter="url(#glow)"/>` +
      K.eyeGlow(c, 0.3) +
      // Their light shows through the glass.
      acc.glow,
  };
}

// ── Patches: quilted shoulder pads ──────────────────────────────────────────

function patches(c, s, K) {
  const { M, rot, lit } = K;
  const pad = "M10.4,-68 C16.4,-73.2 28.4,-72 31.6,-63.4 C33.4,-58.4 32.6,-52.6 30,-49.2 C25.6,-51.4 20,-51.8 15.4,-50.6 C16.2,-56.6 14.4,-62.6 10.4,-65.4 Z";
  const roll = "M15.4,-51.6 C20.4,-53 26.2,-52.4 30.4,-50 C30.8,-47.4 30,-45.2 28.8,-43.8 C24.6,-45.8 20.2,-46.2 16.2,-45.4 Z";
  const stitch = (d) => `<path d="${M(d)}" fill="none" stroke="${W3}" stroke-width=".4" stroke-dasharray=".9 .7" stroke-linecap="round"/>`;
  // Drawn full size, then eased in toward the joint: a soft pad, not a pauldron.
  const snug = (m) => `<g transform="translate(${f(s * 12)},-66) scale(.84) translate(${f(-s * 12)},66)">${m}</g>`;
  return rot(snug(
    shape(M(roll), W2, 0.9) +
      `<path d="${M(roll)}" fill="url(#cyl)"/>` +
      stitch("M17,-48.6 C21,-49.4 25.4,-49 29.2,-47.2") +
      shape(M(pad), W1, 1.1) +
      `<path d="${M(pad)}" fill="url(#cyl)"/>` +
      stitch("M13,-66.2 C18,-70.2 27.4,-69.4 30,-62.6 C31.4,-58.4 30.8,-54.4 29,-51.8") +
      stitch("M14.4,-64.4 C16.6,-60 17.4,-56 17,-52.4") +
      line(M("M13.6,-67 C18.4,-70.4 25,-70.4 28.4,-66.4"), "#ffffff", 0.9, lit ? 0.9 : 0.5) +
      patch(s * 23.4, -59.6, 4.8, c) +
      (lit ? `<ellipse cx="-19.4" cy="-66" rx="4.6" ry="2.4" fill="url(#sheen)"/>` : line("M32,-60.4 C32.6,-56.6 31.8,-52.8 30.2,-50.2", c.rim, 0.8, 0.85)),
  ));
}

export default {
  id: "ranger",
  frames: {
    spacesuit: {
      // Cloth over the chest and limbs and a soft collar ring at the neck:
      // no chest kit, collar plate, trim or limb channels.
      shape: { width: 1.05, shoulder: 1.02, softTorso: true, hides: ["kit", "collar", "limbGlow"] },
      layers: spacesuit,
    },
  },
  helmets: {
    // Clear glass takes no gear: nothing seats on the dome's crown or brow,
    // and a headset would close round the neck ring across the face (the
    // ring already carries the helmet's own lamp). The anchors measure the
    // dome (top, half) and the ring (rail); the rig draws no helmet badge
    // on a face that shows. Eyes and face items go on the face inside the
    // glass (K.faceAccessories), so the glass and its glare lie over them.
    bubble: {
      anchors: { top: -99.6, half: 13, rail: -70, badge: false },
      seats: { crown: false, brow: false, side: false },
      paint: bubble,
    },
  },
  shoulders: {
    patches: { paint: patches },
  },
};
