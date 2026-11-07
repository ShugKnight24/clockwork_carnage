/**
 * Wardrobe theme "marshal" (Frontier Marshal): the art for
 * src/data/wardrobe-themes/marshal.js, by id. See ./index.js for what each
 * painter is given and returns.
 *
 *   duster — a long riding coat over the suit, a slung gun belt with a
 *            holster on each thigh, the marshal's star, spurred boots
 *   brim   — a wide-brim hat over a comm band, a bandana up over the face
 *   poncho — a short woven serape over the shoulders, fringed at the hem
 */
import { INK, f, pt, lerp, shape, line, energy, muscle, armJoints, polar, heading, LIMB } from "../models/hero.js";
import { STEEL, STEEL_DK, angle, plateAt, lineAt, mirrorIf, k, T } from "../frame-kit.js";

const BRASS = "#d9a842";
const BRASS_HI = "#fbe3a0";
const BRASS_LO = "#7a5418";
const LEATHER = "#3a2618";

/** Coat leather: a weathered brown pulled toward the palette's dark. */
const coatOf = (c, mix) => mix(mix(c.pal.dark, "#000000", 0.2), "#5a3f2a", 0.62);

/**
 * The marshal's badge, centred at (x, y), `r` to the ring's outer edge: a
 * five-point star cut inside a brass ring, the coat showing between its
 * points. Each point is stamped with a ridge down its middle, so one half
 * catches the light from the upper left and the other falls into shade; a
 * raised boss in the middle carries an engraved M. It is plain metal, so it
 * gives nothing to the glow layer: only a pin-shine on the ring.
 */
function star(x, y, r) {
  const at = (a, rr) => [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
  const tipR = r * 0.84;
  const inR = tipR * 0.42;
  const lightDir = [-0.6, -0.8];
  let facets = "";
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    const tip = at(a, tipR);
    for (const side of [-1, 1]) {
      // The facet between the ridge and one inner corner faces out between
      // the two; its tone follows how much of that faces the light.
      const corner = at(a + (side * 36 * Math.PI) / 180, inR);
      const n = a + (side * 18 * Math.PI) / 180;
      const lit = Math.cos(n) * lightDir[0] + Math.sin(n) * lightDir[1];
      const tone = lit > 0.45 ? BRASS_HI : lit > -0.25 ? BRASS : BRASS_LO;
      facets += `<path d="M${pt(x, y)} L${pt(...tip)} L${pt(...corner)} Z" fill="${tone}"/>`;
    }
  }
  let outline = "";
  for (let i = 0; i < 10; i++) {
    const a = ((i * 36 - 90) * Math.PI) / 180;
    outline += `${i ? "L" : "M"}${pt(...at(a, i % 2 ? inR : tipR))} `;
  }
  outline += "Z";
  const ringR = r - 0.5;
  // Round parts as Béziers, not <circle>s or arcs: the rig warps the torso
  // to the build by its path points, and the ring, boss and shine must warp
  // with the star they frame.
  // A cubic for the arc of radius rr about (cx, cy) from angle a0 to a1.
  const arc = (cx, cy, rr, a0, a1) => {
    const h = (4 / 3) * Math.tan((a1 - a0) / 4) * rr;
    const [x0, y0, x1, y1] = [cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr];
    return `C${pt(x0 - Math.sin(a0) * h, y0 + Math.cos(a0) * h)} ${pt(x1 + Math.sin(a1) * h, y1 - Math.cos(a1) * h)} ${pt(x1, y1)}`;
  };
  const circle = (cx, cy, rr) => `M${pt(cx + rr, cy)} ${[0, 1, 2, 3].map((q) => arc(cx, cy, rr, (q * Math.PI) / 2, ((q + 1) * Math.PI) / 2)).join(" ")} Z`;
  return (
    // The ring: an ink edge either side of the brass band, a darker
    // engraved line round its middle, the light along its upper left.
    `<path d="${circle(x, y, ringR)}" fill="none" stroke="${INK}" stroke-width="1.7"/>` +
    `<path d="${circle(x, y, ringR)}" fill="none" stroke="${BRASS}" stroke-width=".95"/>` +
    `<path d="${circle(x, y, ringR)}" fill="none" stroke="${BRASS_LO}" stroke-width=".22" stroke-dasharray=".5 .4"/>` +
    `<path d="M${pt(...at(Math.PI * 0.82, ringR + 0.25))} ${arc(x, y, ringR + 0.25, Math.PI * 0.82, Math.PI * 1.42)}" fill="none" stroke="${BRASS_HI}" stroke-width=".3" opacity=".9"/>` +
    // The star, its points meeting the ring.
    `<path d="${outline}" fill="${BRASS}"/>` +
    facets +
    `<path d="${outline}" fill="none" stroke="${INK}" stroke-width=".45" stroke-linejoin="round"/>` +
    // The raised boss and its engraved M.
    shape(circle(x, y, r * 0.26), BRASS, 0.3) +
    line(`M${pt(x - r * 0.12, y + r * 0.1)} L${pt(x - r * 0.12, y - r * 0.1)} L${pt(x, y + r * 0.03)} L${pt(x + r * 0.12, y - r * 0.1)} L${pt(x + r * 0.12, y + r * 0.1)}`, BRASS_LO, 0.2, 1) +
    // Pin-shine on the ring.
    `<path d="${circle(x - ringR * 0.6, y - ringR * 0.72, 0.38)}" fill="#ffffff" opacity=".85"/>`
  );
}

// ── Duster: the frontier marshal's long coat ───────────────────────────────

function duster(P, c, K) {
  const { mix } = K;
  const coat = coatOf(c, mix);
  const coatHi = mix(coat, "#e8d2b0", 0.28);
  const coatLo = mix(coat, "#000000", 0.4);
  const trim = mix(c.pal.primary, coat, 0.62);

  // The back of the coat hangs behind the legs to mid-shin, a riding vent
  // up the middle.
  const back =
    "M-16.4,-64.6 C-8,-66.6 8,-66.6 16.4,-64.6 L19.6,-30 L24.6,37.4 C20,39.6 14,40.6 8,39.6 L1.4,36.4 L0,18 " +
    "L-1.4,36.4 L-8,39.6 C-14,40.6 -20,39.6 -24.6,37.4 L-19.6,-30 Z";
  const under =
    shape(back, coatLo, 1.1) +
    `<path d="${back}" fill="url(#weave)" opacity=".5"/>` +
    line("M-13,-22 L-17.6,36 M13,-22 L17.6,36 M-6,-12 L-7.6,38 M6,-12 L7.6,38", "#000000", 0.7, 0.4) +
    line("M-19.2,-26 L-23.6,35.6", coat, 0.6, 0.7) +
    shape("M-1.4,36.4 L0,18 L1.4,36.4 Z", "#140d08", 0.5);

  // Legs: a spur on each boot, drawn in the foot's own frame (origin at the
  // ankle, +y down the shin) so it turns with the leg, the fallen agent's
  // included. From the front the spur's heel band shows only where it wraps
  // round the outside of the ankle; a leather strap crosses the instep to a
  // buckle on that side, and the shank reaches back off the heel to the
  // rowel, a spiked wheel seen nearly edge-on, so the spikes above and below
  // its hub are long and those to the sides foreshortened.
  const SPUR = "#4b535c";
  const SPUR_HI = "#b9c3cc";
  const legs = P.legs
    .map(({ kn, an }, i) => {
      const s = i === 0 ? -1 : 1;
      const L = (d, col, w, op) => line(mirrorIf(s, d), col, w, op);
      const H = (d, fill, w) => shape(mirrorIf(s, d), fill, w);
      const [rx, ry, cx, cy] = [0.75, 2.1, 8.9, 4.7];
      let spikes = "";
      for (let j = 0; j < 8; j++) {
        const a = ((j * 45 + 22.5) * Math.PI) / 180;
        const [ca, sa] = [Math.cos(a), Math.sin(a)];
        spikes += `M${f(cx + rx * ca)},${f(cy + ry * sa)} L${f(cx + rx * 1.9 * ca)},${f(cy + ry * 1.5 * sa)} `;
      }
      // Ellipses as Béziers, which mirrorIf flips point by point (an arc's
      // sweep flag would not flip with it).
      const oval = (ex, ey, a, b) => {
        const [h, v] = [a * 0.5523, b * 0.5523];
        return (
          `M${f(ex)},${f(ey - b)} C${f(ex + h)},${f(ey - b)} ${f(ex + a)},${f(ey - v)} ${f(ex + a)},${f(ey)} ` +
          `C${f(ex + a)},${f(ey + v)} ${f(ex + h)},${f(ey + b)} ${f(ex)},${f(ey + b)} ` +
          `C${f(ex - h)},${f(ey + b)} ${f(ex - a)},${f(ey + v)} ${f(ex - a)},${f(ey)} ` +
          `C${f(ex - a)},${f(ey - v)} ${f(ex - h)},${f(ey - b)} ${f(ex)},${f(ey - b)} Z`
        );
      };
      return (
        `<g transform="translate(${pt(...an)}) rotate(${f(angle(kn, an))})">` +
        // The strap over the instep.
        L("M-4.8,1.4 C-1.6,3 1.8,3 4.8,1.6", INK, 2, 1) +
        L("M-4.8,1.4 C-1.6,3 1.8,3 4.8,1.6", LEATHER, 1.2, 1) +
        L("M-3.8,1.7 C-1.4,2.6 1.2,2.6 3.6,1.9", "#6a4630", 0.35, 0.8) +
        // The heel band round the outside of the ankle, then the shank.
        L("M4.4,1.2 C6,1.2 7,2 7.4,3.2", INK, 1.9, 1) +
        L("M4.4,1.2 C6,1.2 7,2 7.4,3.2", SPUR, 1.1, 1) +
        L("M7,2.8 L8.5,4.2", INK, 1.5, 1) +
        L("M7,2.8 L8.5,4.2", SPUR, 0.75, 1) +
        L("M4.8,0.9 C6,0.9 6.8,1.5 7.2,2.4 L8.2,3.6", SPUR_HI, 0.3, 0.8) +
        // The buckle where the strap meets the band.
        H("M3.7,0.4 L5.5,0.6 L5.4,2.8 L3.6,2.6 Z", "none", 0.75) +
        L("M3.9,0.7 L5.3,0.8 L5.2,2.5 L3.8,2.4 Z M4.6,0.8 L4.5,2.5", SPUR_HI, 0.3, 0.95) +
        // The rowel: spikes behind the wheel, the wheel, the pin.
        L(spikes, INK, 0.9, 1) +
        L(spikes, "#8a949e", 0.4, 1) +
        H(oval(cx, cy, rx, ry), SPUR, 0.5) +
        L(`M${f(cx - rx * 0.4)},${f(cy - ry * 0.7)} C${f(cx - rx * 0.8)},${f(cy - ry * 0.2)} ${f(cx - rx * 0.8)},${f(cy + ry * 0.2)} ${f(cx - rx * 0.4)},${f(cy + ry * 0.7)}`, SPUR_HI, 0.3, 0.9) +
        H(oval(cx, cy, 0.35, 0.35), SPUR_HI, 0.25) +
        `</g>`
      );
    })
    .join("");

  // Sleeves to the wrist with a turned-back cuff piped in the palette colour.
  const arms = P.arms
    .map((arm, i) => {
      const s = i === 0 ? -1 : 1;
      const { sh, el, wr } = armJoints(arm, s);
      const up = heading(sh, el);
      return (
        muscle(polar(sh, up, -3), el, k(LIMB.UPPER_ARM.out, 1.08), k(LIMB.UPPER_ARM.in, 1.04), s, { fill: coat, hi: 0.22, rim: 0.4, weave: true, hiColor: coatHi }) +
        muscle(el, lerp(el, wr, 0.74), k(LIMB.FOREARM.out, 1.1), k(LIMB.FOREARM.in, 1.06), s, { fill: coat, hi: 0.18, rim: 0.35, weave: true, hiColor: coatHi }) +
        lineAt(el, sh, el, "M-4,-1 C-1.4,0.6 1.4,0.6 4,-1", coatLo, 0.6, 0.8) +
        plateAt(lerp(el, wr, 0.72), el, wr, "M-6,-2 C-2,-2.8 2,-2.8 6,-2 L6.6,2.2 C2,1.4 -2,1.4 -6.6,2.2 Z", coat, 0.8) +
        lineAt(lerp(el, wr, 0.72), el, wr, "M-5.8,-1.2 C-2,-2 2,-2 5.8,-1.2", coatHi, 0.5, 0.8) +
        lineAt(lerp(el, wr, 0.72), el, wr, "M-6.2,1.2 C-2,0.5 2,0.5 6.2,1.2", trim, 0.5, 0.8)
      );
    })
    .join("");

  // Front panels, open down the middle and swinging with the knees.
  const panel = (s, kn) => {
    const hemO = [kn[0] + s * 12.6, 31];
    const hemI = [kn[0] + s * 3.6, 33];
    const mid = [(hemO[0] + hemI[0]) / 2, 33.6];
    return (
      `M${pt(s * 6, -67.2)} C${pt(s * 10, -68.2)} ${pt(s * 14.6, -67.8)} ${pt(s * 18, -66.2)} ` +
      `C${pt(s * 20.2, -56)} ${pt(s * 20.4, -40)} ${pt(s * 19.8, -28)} ` +
      `L${pt(...hemO)} Q${pt(hemO[0] - s * 2, 33.4)} ${pt(...mid)} Q${pt(hemI[0] + s * 1.6, 33.6)} ${pt(...hemI)} ` +
      `L${pt(s * 9.4, -28)} C${pt(s * 8.4, -40)} ${pt(s * 7.2, -54)} ${pt(s * 6, -67.2)} Z`
    );
  };
  const panels = P.legs
    .map(({ kn }, i) => {
      const s = i === 0 ? -1 : 1;
      const d = panel(s, kn);
      const hemO = [kn[0] + s * 12.6, 31];
      const hemI = [kn[0] + s * 3.6, 33];
      return (
        `<path d="${d}" fill="#000" opacity=".45" filter="url(#ao)" transform="translate(.9,1.3)"/>` +
        shape(d, coat, 1.1) +
        `<path d="${d}" fill="url(#weave)" opacity=".55"/>` +
        // A fold down the panel, the lit edge on the left side of each.
        line(`M${pt(s * 14, -40)} C${pt(s * 15, -20)} ${pt((s * 15 + hemO[0]) / 2, 0)} ${pt(hemO[0] - s * 3.4, 30.6)}`, coatLo, 0.8, 0.7) +
        line(s < 0 ? `M-18.8,-62 C-19.6,-50 -19.4,-38 -18.8,-29 L${pt(hemO[0] + 0.8, 29.6)}` : `M${pt(s * 9.8, -40)} L${pt(hemI[0] - 0.6, 31.6)}`, coatHi, 0.6, 0.75) +
        // Piping down the front edge.
        line(`M${pt(s * 9.4, -28)} L${pt(...hemI)}`, trim, 0.7, 0.85)
      );
    })
    .join("");

  // A standing collar behind the neck.
  const collar =
    shape("M-12.6,-64.6 C-13.6,-68.6 -13.4,-72.6 -12,-75.4 C-6,-73.2 6,-73.2 12,-75.4 C13.4,-72.6 13.6,-68.6 12.6,-64.6 C7,-67 -7,-67 -12.6,-64.6 Z", coat, 1) +
    line("M-11.6,-74 C-6,-72 6,-72 11.6,-74", coatHi, 0.6, 0.8);

  // The gun belt, slung low across the hips, a holster drop on each thigh.
  const beltTop = "M-18.6,-27.6 Q0,-22.4 18.6,-27.6";
  const beltD = `${beltTop} L19,-22.6 Q0,-17.2 -19,-22.6 Z`;
  let loops = "";
  for (let x = -16.4; x <= 16.6; x += 2.6) {
    if (Math.abs(x) < 4) continue;
    const y = -24.6 + ((x * x) / 346) * -1 + 1.2;
    loops += `<rect x="${f(x - 0.65)}" y="${f(y - 2.4)}" width="1.3" height="2.6" rx=".5" fill="${BRASS}" stroke="${INK}" stroke-width=".3"/>`;
  }
  const holsters = P.legs
    .map((leg, i) => {
      const s = i === 0 ? -1 : 1;
      const at = T(leg, 0.36);
      const { hip, kn } = leg;
      const H = (d) => plateAt(at, hip, kn, mirrorIf(s, d), LEATHER, 0.9);
      const L = (d, col, w, op) => lineAt(at, hip, kn, mirrorIf(s, d), col, w, op);
      return (
        // Drop strap from the belt.
        L("M5.6,-14.6 L6.4,-8", INK, 2.4, 1) +
        L("M5.6,-14.6 L6.4,-8", LEATHER, 1.5, 1) +
        // Revolver grip over the holster mouth, then the holster itself.
        plateAt(at, hip, kn, mirrorIf(s, "M5.8,-9.2 C5.8,-13.4 8,-16.4 11.8,-16.8 L13.8,-14.2 C11.6,-13.2 10.8,-11 11,-8.6 Z"), "#8a5a34", 0.9) +
        plateAt(at, hip, kn, mirrorIf(s, "M5.4,-9.6 L5.2,-12.4 L3.6,-13.2 L4,-9.4 Z"), STEEL, 0.6) +
        plateAt(at, hip, kn, mirrorIf(s, "M6.2,-9.6 L10.6,-8.6 L10.8,-7 L6.2,-7.6 Z"), STEEL_DK, 0.6) +
        L("M7.2,-10.6 C7.4,-13 9,-15 11.4,-15.6", "#c08a5a", 0.5, 0.9) +
        H("M4.2,-8 L11.6,-7.4 C12.2,-2 11.8,4 10.6,9.6 C9.6,11.6 7.2,11.8 6.4,10 C5.2,4 4.4,-2 4.2,-8 Z") +
        L("M5.4,-6 C5.8,-1 6.4,4 7.2,8.8", "#6a4630", 0.5, 0.9) +
        L("M5,-5.6 L11.4,-5.2", BRASS_LO, 0.5, 0.9) +
        // Tie-down round the thigh.
        L("M-7.6,5.6 L5.4,5.8", INK, 1.8, 1) +
        L("M-7.6,5.6 L5.4,5.8", LEATHER, 1, 1) +
        `<circle cx="${f(at[0] + s * 8.4)}" cy="${f(at[1] - 4)}" r=".7" fill="${BRASS}" stroke="${INK}" stroke-width=".3"/>`
      );
    })
    .join("");
  const belt =
    shape(beltD, LEATHER, 1) +
    line("M-18,-26.4 Q0,-21.2 18,-26.4", "#6a4630", 0.5, 0.9) +
    loops +
    shape("M-3,-24.2 L3,-24.2 L3.2,-19.4 L-3.2,-19.4 Z", STEEL, 0.7) +
    shape("M-1.6,-23 L1.6,-23 L1.7,-20.6 L-1.7,-20.6 Z", "none", 0.5) +
    line("M-2.4,-23.6 L2.4,-23.6", "#ffffff", 0.4, 0.6);

  // Lapels turned back over the coat's front, the marshal's star pinned on
  // the right one.
  const lapel = (s) =>
    shape(mirrorIf(s, "M11,-67.8 L16.6,-67 L15.4,-52.4 L12.6,-49.6 L11.6,-56 Z"), coatHi, 0.8) +
    `<path d="${mirrorIf(s, "M11,-67.8 L16.6,-67 L15.4,-52.4 L12.6,-49.6 L11.6,-56 Z")}" fill="url(#weave)" opacity=".5"/>` +
    line(mirrorIf(s, "M11.4,-66.8 L12.2,-56.2 L12.8,-50.6"), trim, 0.6, 0.9);
  const badge = star(10.8, -46.8, 4.4);

  const torso = collar + panels + lapel(-1) + lapel(1) + badge + belt + holsters;
  // Nothing on the coat is lit: the sleeves cover the limbs' light and the
  // badge is plain brass.
  return { under, legs, torso, arms, glow: "" };
}

// ── Brim: wide-brim hat, comm band, bandana ────────────────────────────────

function brim(c, K) {
  const { mix } = K;
  const felt = mix(mix(c.pal.dark, "#000000", 0.25), "#6a5038", 0.6);
  const feltHi = mix(felt, "#f4e2c2", 0.3);
  const feltLo = mix(felt, "#000000", 0.45);
  const cloth = mix(c.pal.primary, "#2a0c08", 0.45);
  const clothHi = mix(cloth, "#ffffff", 0.35);
  const fem = c.fem;

  // Comm cups over the ears with a band rising under the hat.
  const cup = (s) =>
    shape(mirrorIf(s, "M7.8,-86.4 C9.8,-87 11.4,-86 11.6,-84 L11.6,-79.2 C11.4,-77.4 9.8,-76.6 7.8,-77.2 Z"), STEEL_DK, 0.8) +
    shape(mirrorIf(s, "M8.6,-85 C9.8,-85.2 10.6,-84.4 10.6,-83.2 L10.6,-80 C10.6,-78.8 9.8,-78.2 8.6,-78.4 Z"), STEEL, 0.5) +
    line(mirrorIf(s, "M9.4,-86.6 L9,-90"), INK, 1.6, 1) +
    line(mirrorIf(s, "M9.4,-86.6 L9,-90"), "#3a4048", 0.8, 1);

  const scarf =
    "M-9.2,-79.6 C-5.6,-78.8 -2.4,-80.4 0,-80.6 C2.4,-80.4 5.6,-78.8 9.2,-79.6 L9.6,-75 C9,-71 6.6,-68.6 3.6,-67.2 " +
    "L0,-62.2 L-3.6,-67.2 C-6.6,-68.6 -9,-71 -9.6,-75 Z";
  let dots = "";
  for (let i = 0; i < 9; i++) {
    const x = -6 + (i % 5) * 3 + (i > 4 ? 1.5 : 0);
    const y = i > 4 ? -72.4 : -76.4;
    dots += `<circle cx="${f(x)}" cy="${f(y)}" r=".45" fill="${clothHi}" opacity=".75"/>`;
  }
  const bandana =
    `<g${fem ? ' transform="scale(.9,1)"' : ""}>` +
    shape(scarf, cloth, 0.9) +
    `<path d="${scarf}" fill="url(#weave)" opacity=".6"/>` +
    dots +
    // Folds over the nose and under the chin; light on the left cheek.
    line("M0,-80.4 C0.6,-77.6 1.6,-75.6 2.6,-74.6 M-6.4,-73.6 C-4,-71.6 -1.6,-69.6 0,-63.6 M6.4,-73.6 C4,-71.6 1.6,-69.6 0,-63.6", mix(cloth, "#000000", 0.5), 0.55, 0.8) +
    line("M-8.4,-78.6 C-8.8,-75 -7.6,-72 -5,-70", clothHi, 0.5, 0.6) +
    line("M8.8,-78 C9,-74.6 8,-71.6 5.6,-69.4", c.rim, 0.45, 0.6) +
    `</g>`;

  const crown =
    "M-8.8,-90.4 C-9.6,-95.4 -9,-100.4 -6.4,-102.8 C-3.6,-101.4 -1.6,-101 0,-101.8 C1.6,-101 3.6,-101.4 6.4,-102.8 C9,-100.4 9.6,-95.4 8.8,-90.4 Z";
  const brimTop = "M-21.6,-91.8 C-18,-95.2 -9,-96 0,-96 C9,-96 18,-95.2 21.6,-91.8 C16,-89.4 -16,-89.4 -21.6,-91.8 Z";
  const brimLip =
    "M-22,-93 C-19.4,-89.8 -14,-89.2 0,-89.4 C14,-89.2 19.4,-89.8 22,-93 C22.4,-90.2 19.4,-86.8 0,-86.4 C-19.4,-86.8 -22.4,-90.2 -22,-93 Z";
  // Eyewear shows under the brim: its items and light are kept below the
  // brim's lower edge.
  const acc = K.faceAccessories({ window: "M22,-93 C22.4,-90.2 19.4,-86.8 0,-86.4 C-19.4,-86.8 -22.4,-90.2 -22,-93 L-22,-60 L22,-60 Z" });

  const front =
    K.hairBack(c) +
    cup(-1) +
    cup(1) +
    K.face(c) +
    K.hair(c, true) +
    // Shade cast by the brim across the brow.
    `<path d="M-9.4,-87.6 C-4,-86.6 4,-86.6 9.4,-87.6 L9.4,-83.8 C4,-82.6 -4,-82.6 -9.4,-83.8 Z" fill="#000" opacity=".28"/>` +
    bandana +
    // Eyewear over the bandana's top edge, under the hat.
    acc.front +
    shape(brimTop, feltLo, 1) +
    shape(crown, felt, 1.1) +
    `<path d="${crown}" fill="url(#weave)" opacity=".35"/>` +
    line("M0,-101.6 L0,-96.4", feltLo, 0.7, 0.9) +
    line("M-7.6,-91.6 C-8.4,-95.4 -7.8,-99.4 -5.8,-101.6", feltHi, 0.6, 0.8) +
    line("M8.4,-92 C9,-95.4 8.6,-98.8 7.2,-101", c.rim, 0.5, 0.6) +
    // Hat band in the palette colour, a concho on the side.
    shape("M-8.9,-93.6 C-4,-92.8 4,-92.8 8.9,-93.6 L8.9,-91 C4,-90.2 -4,-90.2 -8.9,-91 Z", c.pal.primary, 0.7) +
    `<circle cx="-6.6" cy="-92" r="1.2" fill="${STEEL}" stroke="${INK}" stroke-width=".4"/>` +
    shape(brimLip, felt, 1) +
    `<path d="${brimLip}" fill="url(#weave)" opacity=".35"/>` +
    line("M-21,-91.6 C-18,-88.8 -12,-88.2 -2,-88.2", feltHi, 0.55, 0.8) +
    line("M2,-86.8 C12,-87 18.4,-88 21.2,-90.4", c.rim, 0.5, 0.55);

  return {
    front,
    glow:
      K.eyeGlow(c, 0.55) +
      energy(`<circle cx="-10.6" cy="-81.6" r=".55"/><circle cx="10.6" cy="-81.6" r=".55"/>`, c.energy) +
      acc.glow,
    nape: K.hairNape(c, true),
  };
}

// ── Poncho: a short woven serape over the shoulders ────────────────────────

function poncho(c, s, K) {
  const { M, rot, lit, mix } = K;
  const wool = mix(mix(c.pal.dark, "#000000", 0.1), "#7a5634", 0.55);
  const woolHi = mix(wool, "#fff1d8", 0.32);
  const woolLo = mix(wool, "#000000", 0.45);
  const band = mix(mix(c.pal.primary, "#000000", 0.25), wool, 0.45);
  const cream = mix("#e6d6b0", wool, 0.25);
  const thread = mix(c.pal.primary, cream, 0.5);
  // Hem points from the shoulder's outer edge to the collarbone.
  const hem = [[35.4, -45.6], [30, -47.4], [24, -50], [18.6, -53.2], [13.4, -56.6], [8.6, -60.2], [5, -63.4]];
  const poly = (pts, dy) => "M" + pts.map(([x, y]) => pt(x, y + dy)).join(" L");
  const body =
    "M5,-63.4 C4.4,-66.6 4.6,-69 5.6,-70.6 C11,-72.2 18.2,-71.8 23.6,-69.4 C29.4,-66.6 33.4,-61.4 34.6,-54.4 L35.4,-45.6 " +
    hem.slice(1).map(([x, y]) => `L${pt(x, y)}`).join(" ") +
    " Z";
  let fringe = "";
  for (let i = 0; i < hem.length - 1; i++) {
    const [x0, y0] = hem[i];
    const [x1, y1] = hem[i + 1];
    for (let t = 0; t < 1; t += 0.34) {
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      fringe += `M${pt(x, y)} l${f(-0.3)},2.6 `;
    }
  }
  // Zig-zag weave between the two stripes.
  const zig = hem.slice(0, -1).map(([x, y], i) => pt(x - 0.4, y - (i % 2 ? 4.6 : 3.4))).join(" L");
  return rot(
    shape(M(body), wool, 1.1) +
      `<path d="${M(body)}" fill="url(#weave)" opacity=".7"/>` +
      // Darker toward the hem, where it falls away from the light.
      line(M(poly(hem.slice(0, -1), -1.2)), woolLo, 2, 0.55) +
      line(M(poly(hem.slice(0, -1), -3.2)), INK, 2.2, 0.9) +
      line(M(poly(hem.slice(0, -1), -3.2)), band, 1.4, 1) +
      line(M("M" + zig), thread, 0.5, 0.9) +
      line(M(poly(hem.slice(0, -1), -6)), INK, 1.4, 0.9) +
      line(M(poly(hem.slice(0, -1), -6)), cream, 0.8, 1) +
      // Drape folds from the shoulder down.
      line(M("M22,-68 C25,-62 26,-56 25.4,-49.8 M15,-69 C16.6,-64 16.4,-59 15.4,-55.4"), woolLo, 0.6, 0.6) +
      line(M("M7,-69.8 C12,-71 18.6,-70.6 23,-68.4"), woolHi, 0.7, lit ? 0.85 : 0.4) +
      line(M(fringe), INK, 1, 0.9) +
      line(M(fringe), woolHi, 0.5, 1) +
      "",
  );
}

export default {
  id: "marshal",
  frames: {
    // The coat covers the chest kit, hangs where a cape would, and its
    // sleeves cover the limbs' light.
    duster: { shape: { width: 1, shoulder: 1 }, layers: duster },
  },
  helmets: {
    // An open head under a hat: the rig draws no helmet badge on a face that
    // shows. A plume rides in the crown's dent; the comm cups are the side
    // rail (lamps, whips, a headset over them). Night vision has no brow to
    // seat on under the brim.
    // Its seats and face room are on the data entry.
    brim: { anchors: { top: -101.8, half: 11.6, rail: -81.8, badge: false }, paint: brim },
  },
  shoulders: {
    poncho: { paint: poncho, maxShoulderScale: 1.06 },
  },
};
