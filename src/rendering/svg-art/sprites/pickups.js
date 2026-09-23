/**
 * In-world pickup sprites for Modern art style (see ../../pickups.js).
 *
 * Units: the legacy `size` of each pickup = 100 units, origin = the pickup's
 * bobbing centre, so the engine keeps its bob/spin/pulse maths and only swaps
 * the drawing. Colours match the legacy icons so players still read them:
 * health green/white/red, ammo amber, weapon cyan, damage2x red, invuln gold.
 * Glow layers get their own wide, low-resolution box; they are soft anyway.
 * `base` names the layer that must be decoded before the sprite replaces the
 * legacy drawing (glows sit behind it in draw order).
 *
 * Realistic (buildRealisticPickups, on first Realistic use) keeps each key's
 * box and colour coding but draws real objects: a scuffed med kit, a steel
 * magazine, a rifle, sealed exotic canisters. Emissives stay bright but small,
 * with a faint local glow instead of a halo.
 */

import {
  INK, f, pts, path, rect, line, ell,
  isRealBuild, withRealistic, realizeSprite, realSurfaceDefs, gradeMarkup,
} from "./props.js";

// Floating items sit below eye level, so depth goes right and up.
const DX = 0.45;
const DY = -0.35;

const halo = (id, color, stops = [0.42, 0.18]) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${stops[0]}"/>` +
  `<stop offset=".55" stop-color="${color}" stop-opacity="${stops[1]}"/>` +
  `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

const grad = (id, stops, x2 = ".7", y2 = "1") =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
  stops.map((c, i) => `<stop offset="${f(i / (stops.length - 1))}" stop-color="${c}"/>`).join("") +
  `</linearGradient>`;

export const DEFS =
  grad("caseF", ["#ffffff", "#e9eef2", "#b9c3cc", "#7f8a95"]) +
  grad("caseS", ["#9aa4ae", "#56606a"], "1", ".4") +
  grad("caseT", ["#f6f9fb", "#d4dce3"], "1", "0") +
  grad("cross", ["#ff7a7a", "#ff2222", "#c01414", "#7a0808"]) +
  grad("magF", ["#8a8f96", "#5c6168", "#3a3e44", "#1f2226"]) +
  grad("magS", ["#3a3e44", "#17191c"], "1", ".3") +
  grad("brass", ["#fff0b8", "#ddaa33", "#9a6c14", "#5a3c08"], "1", "0") +
  grad("copper", ["#ffc59a", "#c86a32", "#6e3210"], "1", "0") +
  grad("crateF", ["#9aaabb", "#667788", "#4a5868", "#2e3844"]) +
  grad("crateT", ["#a8b8c8", "#889aaa"], "1", "0") +
  grad("crateS", ["#556677", "#2c3642"], "1", ".4") +
  grad("strap", ["#c8dcee", "#88aacc", "#4f6a86"]) +
  halo("haloG", "#00ff44", [0.7, 0.34]) +
  halo("haloA", "#ffaa00", [0.62, 0.28]) +
  halo("haloC", "#00ccff", [0.62, 0.28]) +
  halo("haloR", "#ff6644", [0.5, 0.22]) +
  halo("haloY", "#ffee88", [0.5, 0.22]) +
  halo("coreR", "#ff3322", [0.55, 0.35]) +
  halo("coreY", "#ffdd44", [0.55, 0.35]) +
  halo("haloEx", "#00ffaa", [0.5, 0.2]) +
  grad("lockF", ["#5b6b74", "#3b4952", "#26313a", "#141c23"]) +
  grad("lockT", ["#6f808a", "#42505a"], "1", "0") +
  grad("doorF", ["#1b2a33", "#0f1c23", "#080f14", "#04080b"]) +
  `<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>`;

const GLOW_BOX = [-210, -210, 420, 420];

/** A soft circular glow layer (radius in size units). */
const glowLayer = (grad, r, anim, opacity = 1) => ({
  box: GLOW_BOX,
  res: 0.3,
  markup: `<circle cx="0" cy="0" r="${r}" fill="url(#${grad})"/>`,
  blend: "lighter",
  shade: false,
  opacity,
  anim,
});

/** Oblique case: front face with rounded corners, top and right faces. */
function caseBox(x, y, w, h, d, F, T, S, rx = 6) {
  const dx = d * DX;
  const dy = d * DY;
  return (
    path(`M${f(x + w - rx)},${f(y)}L${f(x + w - rx + dx)},${f(y + dy)}H${f(x + w + dx)}V${f(y + h + dy - rx)}L${f(x + w)},${f(y + h - rx)}Z`, `url(#${S})`, 1.6) +
    path(`M${f(x + rx)},${f(y)}L${f(x + rx + dx)},${f(y + dy)}H${f(x + w - rx + dx)}L${f(x + w - rx)},${f(y)}Z`, `url(#${T})`, 1.6) +
    `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="${rx}" fill="url(#${F})" stroke="${INK}" stroke-width="2.2"/>`
  );
}

/** Medkit: white hard case, red cross, green trim and corner lights. */
function health() {
  const x = -56;
  const y = -46;
  const w = 104;
  const h = 96;
  let s = caseBox(x, y, w, h, 26, "caseF", "caseT", "caseS", 9);
  // Handle on the top face.
  s += path(`M${f(x + 34)},${f(y - 4)}C${f(x + 36)},${f(y - 22)} ${f(x + 68)},${f(y - 22)} ${f(x + 70)},${f(y - 4)}h-7C${f(x + 61)},${f(y - 14)} ${f(x + 43)},${f(y - 14)} ${f(x + 41)},${f(y - 4)}Z`, "#3a4450", 1.6);
  // Latches.
  for (const lx of [x + 16, x + w - 26]) s += rect(lx, y - 3, 10, 9, "#00cc44", 1.2, 2);
  // Trim border and panel seam.
  const REAL = isRealBuild();
  s += `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="5" fill="none" stroke="#00cc44" stroke-width="2.4"/>`;
  if (REAL) {
    // Printed label and a moulded grip channel: a real kit, not a badge.
    s += rect(x + 12, y + h - 20, 30, 8, "#e9e6dc", 0, 1);
    s += line(`M${x + 15},${y + h - 17.5}h18M${x + 15},${y + h - 14.5}h12`, "#5a5e62", 1, 0.7);
    s += line(`M${x + 8},${y + 22}V${y + h - 24}`, "#000", 2.4, 0.18);
  }
  s += line(`M${x + 3},${y + h - 6}V${y + 4}H${x + w - 6}`, "#fff", 2, 0.8);
  // Red cross.
  const c = 21;
  const L = 36;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cross = `M${f(cx - c / 2)},${f(cy - L)}h${c}v${f(L - c / 2)}h${f(L - c / 2)}v${c}h${f(-(L - c / 2))}v${f(L - c / 2)}h${-c}v${f(-(L - c / 2))}h${f(-(L - c / 2))}v${-c}h${f(L - c / 2)}Z`;
  s += path(cross, "url(#cross)", 2);
  s += line(`M${f(cx - c / 2 + 3)},${f(cy + L - 4)}V${f(cy - L + 3)}h${c - 6}`, "#ffd0d0", 1.6, 0.6);
  let lights = "";
  const corners = [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]];
  for (const [px, py] of corners) {
    s += ell(px, py, 4, 4, "#00ff44", 1.2);
    lights += REAL
      ? `<circle cx="${f(px)}" cy="${f(py)}" r="6" fill="#00ff44" opacity=".55" filter="url(#glow)"/><circle cx="${f(px)}" cy="${f(py)}" r="2.6" fill="#e8ffee"/>`
      : `<circle cx="${f(px)}" cy="${f(py)}" r="10" fill="#00ff44" filter="url(#glow)"/><circle cx="${f(px)}" cy="${f(py)}" r="3" fill="#e8ffee"/>`;
  }
  lights += REAL
    // Light-pipe gasket: a thin lit line in the trim, no bloom band.
    ? `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="5" fill="none" stroke="#39ff6e" stroke-width="1.3" opacity=".75"/>`
    : `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="5" fill="none" stroke="#00ff44" stroke-width="4" filter="url(#glow)" opacity=".7"/>`;
  const pulse = REAL ? { type: "pulse", min: 0.75, max: 1, speed: 4 } : { type: "pulse", min: 0.6, max: 1, speed: 6 };
  return {
    box: [-72, -80, 150, 150],
    base: 1,
    layers: [
      REAL ? glowLayer("haloG", 88, pulse, 0.32) : glowLayer("haloG", 160, pulse, 0.85),
      { markup: `<g>${s}</g>` },
      { markup: `<g>${lights}</g>`, blend: "lighter", shade: false, anim: pulse },
    ],
  };
}

/** One upright cartridge: brass case, copper ogive tip. */
function cartridge(x, y, k) {
  const w = 12 * k;
  const h = 34 * k;
  const tip = 16 * k;
  return (
    path(`M${f(x)},${f(y)}V${f(y - h)}H${f(x + w)}V${f(y)}Z`, "url(#brass)", 1.4) +
    path(`M${f(x + 0.6)},${f(y - h)}C${f(x + 0.6)},${f(y - h - tip * 0.7)} ${f(x + w / 2)},${f(y - h - tip)} ${f(x + w / 2)},${f(y - h - tip)}C${f(x + w / 2)},${f(y - h - tip)} ${f(x + w - 0.6)},${f(y - h - tip * 0.7)} ${f(x + w - 0.6)},${f(y - h)}Z`, "url(#copper)", 1.4) +
    rect(x - 1, y - 4 * k, w + 2, 4 * k, "#8a6010", 1) +
    line(`M${f(x + 3 * k)},${f(y - 5 * k)}V${f(y - h + 2)}`, "#fff8d8", 1.4, 0.7)
  );
}

/** Curved rifle magazine with two loose rounds beside it, amber spine light. */
function ammo() {
  // Banana-curved body, tilted slightly.
  const body = "M-24,-38L22,-38C24,-6 28,24 36,52L-6,58C-14,30 -22,0 -24,-38Z";
  const side = "M22,-38l7,-5C31,-10 35,20 43,47L36,52C28,24 24,-6 22,-38Z";
  let s = `<g transform="rotate(-8)">`;
  s += path(side, "url(#magS)", 1.8);
  s += path(body, "url(#magF)", 2.2);
  // Ribs, witness holes, base plate.
  s += line("M-17,-22C-15,0 -10,22 -3,42", "#000", 1.6, 0.4);
  s += line("M-19,-22C-17,0 -12,22 -5,42", "#b8c0c8", 1, 0.35);
  for (let i = 0; i < 4; i++) s += ell(8 + i * 3.2, -18 + i * 17, 2.4, 3.2, "#15181c", 0.8);
  s += path("M-8,52L38,46L40,54L-5,61Z", "#2a2d31", 1.8);
  // Feed lips and the top round lying in them.
  s += path("M-24,-38L-20,-46H18L22,-38Z", "#4a4f55", 1.6);
  s += path("M-16,-44C-16,-52 -12,-54 -4,-54H18C24,-54 30,-50 34,-47C30,-44 24,-40 18,-40H-4C-12,-40 -16,-40 -16,-44Z", "url(#brass)", 1.6);
  s += path("M18,-54C24,-54 30,-50 34,-47C30,-44 24,-40 18,-40Z", "url(#copper)", 1.4);
  s += line("M-10,-51H14", "#fff8d8", 1.4, 0.7);
  s += `</g>`;
  s += cartridge(-50, 56, 0.95) + cartridge(-36, 60, 0.9);
  const REAL = isRealBuild();
  const spine = REAL
    // Round-count window: a lit amber strip let into the steel, faint spill.
    ? `<g transform="rotate(-8)"><path d="M23,-36C25,-6 29,22 37,50" fill="none" stroke="#ffaa00" stroke-width="3.4" opacity=".7" filter="url(#glow)"/>` +
      `<path d="M23,-36C25,-6 29,22 37,50" fill="none" stroke="#ffd27a" stroke-width="2"/></g>`
    : `<g transform="rotate(-8)"><path d="M23,-36C25,-6 29,22 37,50" fill="none" stroke="#ffaa00" stroke-width="5" filter="url(#glow)"/>` +
      `<path d="M23,-36C25,-6 29,22 37,50" fill="none" stroke="#ffe0a0" stroke-width="1.6"/></g>`;
  return {
    box: [-64, -76, 130, 150],
    base: 1,
    layers: [
      REAL
        ? glowLayer("haloA", 80, { type: "pulse", min: 0.85, max: 1, speed: 3 }, 0.4)
        : glowLayer("haloA", 100, { type: "pulse", min: 0.85, max: 1, speed: 3 }, 0.75),
      { markup: `<g>${s}</g>` },
      { markup: spine, blend: "lighter", shade: false, anim: { type: "pulse", min: REAL ? 0.7 : 0.55, max: 1, speed: 4 } },
    ],
  };
}

/** Steel weapons crate with X straps, rivets and a cyan-lit lock. */
function weapon() {
  const x = -52;
  const y = -32;
  const w = 94;
  const h = 70;
  const d = 34;
  let s = caseBox(x, y, w, h, d, "crateF", "crateT", "crateS", 3);
  // Top-face panel line and side handle.
  s += line(`M${f(x + 10 + d * DX * 0.5)},${f(y + d * DY * 0.5)}H${f(x + w - 8 + d * DX * 0.5)}`, "#4a5868", 1.2, 0.8);
  s += rect(x + w + d * DX * 0.5 - 4, y + 22 + d * DY * 0.5, 8, 18, "#2a3440", 1.2, 2);
  // Cross straps clipped to the front face.
  s += `<clipPath id="front"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/></clipPath>`;
  s += `<g clip-path="url(#front)">`;
  s += `<path d="M${x - 6},${y + 6}L${x + w - 6},${y + h + 6}L${x + 6},${y + h + 6}L${x + w + 6},${y + 6}" fill="none" stroke="${INK}" stroke-width="13"/>`;
  s += `<path d="M${x - 6},${y + 6}L${x + w - 6},${y + h + 6}M${x + 6},${y + h + 6}L${x + w + 6},${y + 6}" fill="none" stroke="url(#strap)" stroke-width="9"/>`;
  s += `</g>`;
  // Reinforced corners and rivets.
  const corners = [[x, y], [x + w - 14, y], [x, y + h - 14], [x + w - 14, y + h - 14]];
  for (const [cx, cy] of corners) {
    s += rect(cx, cy, 14, 14, "#3a4652", 1.4, 2);
    s += ell(cx + 7, cy + 7, 3, 3, "#aaccee", 1);
  }
  // Lock plate at the strap crossing.
  const lx = x + w / 2;
  const ly = y + h / 2;
  s += path(`M${lx},${ly - 13}L${lx + 13},${ly}L${lx},${ly + 13}L${lx - 13},${ly}Z`, "#1a2230", 1.8);
  let lit = `<path d="M${lx},${ly - 7}L${lx + 7},${ly}L${lx},${ly + 7}L${lx - 7},${ly}Z" fill="#00ccff" filter="url(#glow)"/>`;
  lit += `<path d="M${lx},${ly - 5}L${lx + 5},${ly}L${lx},${ly + 5}L${lx - 5},${ly}Z" fill="#d8f6ff"/>`;
  lit += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="none" stroke="#00ccff" stroke-width="3.5" filter="url(#glow)" opacity=".8"/>`;
  lit += `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="3" fill="none" stroke="#9fe8ff" stroke-width="1"/>`;
  return {
    box: [-66, -64, 140, 118],
    base: 1,
    layers: [
      glowLayer("haloC", 120, { type: "pulse", min: 0.85, max: 1, speed: 2.5 }, 0.8),
      { markup: `<g>${s}</g>` },
      { markup: `<g>${lit}</g>`, blend: "lighter", shade: false, anim: { type: "pulse", min: 0.6, max: 1, speed: 3.5 } },
    ],
  };
}

/** Faceted exotic crystal: spinning gem, upright glyph, pulsing halo. */
function exotic(isDmg) {
  const core = isDmg ? "#ff3322" : "#ffdd44";
  const light = isDmg ? "#ff9a80" : "#fff4b0";
  const dark = isDmg ? "#661100" : "#886600";
  const deep = isDmg ? "#3a0800" : "#4a3600";
  const R = 90;
  const r = 44;
  const o = [[0, -R], [R, 0], [0, R], [-R, 0]];
  const i = [[0, -r], [r, 0], [0, r], [-r, 0]];
  const facet = (a, b, c, d, fill) => `<polygon points="${pts([a, b, c, d])}" fill="${fill}"/>`;
  let gem = `<polygon points="${pts(o)}" fill="${core}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  gem += facet(o[3], o[0], i[0], i[3], light);
  gem += facet(o[0], o[1], i[1], i[0], core);
  gem += facet(o[1], o[2], i[2], i[1], dark);
  gem += facet(o[2], o[3], i[3], i[2], deep);
  gem += `<polygon points="${pts(i)}" fill="${core}" stroke="${dark}" stroke-width="2"/>`;
  gem += `<polygon points="${pts(o)}" fill="none" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>`;
  gem += line(`M${pts([o[0]])}L${pts([i[0]])}M${pts([o[1]])}L${pts([i[1]])}M${pts([o[2]])}L${pts([i[2]])}M${pts([o[3]])}L${pts([i[3]])}`, dark, 1.4, 0.8);
  gem += `<polygon points="${pts([[0, -50], [25, -25], [0, 0]])}" fill="#fff" opacity=".55"/>`;
  gem += line(`M${-R + 12},-4L-4,${-R + 12}`, "#fff", 3, 0.7);
  const glyphPath = isDmg
    ? "M-40,-14C-40,-30 -12,-30 -12,-14C-12,-2 -40,6 -40,22H-10M2,-6L30,22M30,-6L2,22"
    : "M0,-30V30M-30,0H30";
  const glyph =
    `<path d="${glyphPath}" fill="none" stroke="${INK}" stroke-width="${isDmg ? 16 : 20}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${glyphPath}" fill="none" stroke="#ffffff" stroke-width="${isDmg ? 9 : 12}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return {
    box: [-100, -100, 200, 200],
    base: 2,
    layers: [
      glowLayer(isDmg ? "haloR" : "haloY", 200, { type: "pulse", min: 0.4, max: 1, speed: 8 }),
      glowLayer(isDmg ? "coreR" : "coreY", 130, null, 0.55),
      { markup: `<g>${gem}</g>`, anim: { type: "spin", speed: 3 } },
      { box: [-60, -60, 120, 120], markup: `<g>${glyph}</g>`, shade: false },
    ],
  };
}

/**
 * Level exit: a recessed blast door rather than a floating panel. Twin leaves
 * meet on an interlocking seam, a hazard band runs across the sill, and the
 * frame carries status lamps and a sweeping scan. Sized to the legacy
 * billboard (2.8 x 4.0 size units) so the engine's placement is unchanged.
 */
function airlock() {
  const W = 140; // door half-width
  const H = 200; // door half-height
  const F = 26; // frame thickness
  let s = "";

  // Recessed frame: outer casing, then the reveal the doors sit inside.
  s += rect(-W - F, -H - F, (W + F) * 2, (H + F) * 2, "url(#lockF)", 3, 6);
  s += rect(-W - F * 0.42, -H - F * 0.42, (W + F * 0.42) * 2, (H + F * 0.42) * 2, "#0a1216", 2);
  // Door leaves, parted by a centre seam.
  s += rect(-W, -H, W - 4, H * 2, "url(#doorF)", 2.2);
  s += rect(4, -H, W - 4, H * 2, "url(#doorF)", 2.2);
  // Interlocking teeth along the seam — the detail that says "blast door".
  for (let i = 0; i < 7; i++) {
    const y = -H + 16 + i * ((H * 2 - 32) / 6.5);
    s += rect(-16, y, 16, 20, "#1d2b34", 1.6);
    s += rect(0, y + 14, 16, 20, "#1d2b34", 1.6);
  }
  // Panel ribs on each leaf.
  for (let i = 1; i < 4; i++) {
    const y = -H + (i * H * 2) / 4;
    s += line(`M${-W + 10},${f(y)}H-10`, "#0a1216", 3, 0.8);
    s += line(`M10,${f(y)}H${W - 10}`, "#0a1216", 3, 0.8);
  }
  // Hazard band across the sill.
  for (let i = 0; i < 9; i++) {
    const x = -W + i * ((W * 2) / 9);
    s += path(`M${f(x)},${H - 26}L${f(x + 16)},${H - 26}L${f(x + 6)},${H}L${f(x - 10)},${H}Z`,
      i % 2 ? "#12181c" : "#e8b229", 1.2);
  }
  // Corner brackets on the casing.
  for (const [cx, cy] of [[-W - F, -H - F], [W + F - 30, -H - F], [-W - F, H + F - 30], [W + F - 30, H + F - 30]]) {
    s += rect(cx, cy, 30, 30, "url(#lockT)", 2, 3);
  }

  // Emissive: seam light, frame strip, lamps and the legend plate.
  const REAL = isRealBuild();
  if (REAL) {
    // Stencilled legend and sill grime: a door that has been used.
    s += `<g fill="none" stroke="#c9ced0" stroke-width="5" stroke-opacity=".55" stroke-linecap="square">` +
      `<path d="M${-W + 24},-60h26M${-W + 24},-60v36h26M${-W + 24},-42h18M${-W + 62},-60l22,36M${-W + 84},-60l-22,36M${-W + 98},-60v36M${-W + 110},-60h24M${-W + 122},-60v36"/></g>`;
    s += `<rect x="${-W}" y="${H - 60}" width="${W * 2}" height="60" fill="#000" opacity=".22"/>`;
  }
  let lit = "";
  lit += `<rect x="-5" y="${-H + 6}" width="10" height="${H * 2 - 12}" rx="4" fill="#00ffaa" filter="url(#glow)" opacity="${REAL ? ".5" : ".85"}"/>`;
  lit += `<rect x="-2" y="${-H + 8}" width="4" height="${H * 2 - 16}" rx="2" fill="#d8fff0"/>`;
  lit += REAL
    ? `<rect x="${-W - F * 0.42}" y="${-H - F * 0.42}" width="${(W + F * 0.42) * 2}" height="${(H + F * 0.42) * 2}" rx="3" fill="none" stroke="#5cffc4" stroke-width="2" opacity=".55"/>`
    : `<rect x="${-W - F * 0.42}" y="${-H - F * 0.42}" width="${(W + F * 0.42) * 2}" height="${(H + F * 0.42) * 2}" rx="3" fill="none" stroke="#00ffaa" stroke-width="4" filter="url(#glow)" opacity=".7"/>`;
  for (let i = 0; i < 3; i++) {
    const y = -H + 40 + i * 60;
    const r = REAL ? 6 : 9;
    lit += `<circle cx="${-W - F * 0.7}" cy="${f(y)}" r="${r}" fill="#00ffaa" filter="url(#glow)"/>`;
    lit += `<circle cx="${-W - F * 0.7}" cy="${f(y)}" r="4" fill="#eafff7"/>`;
    lit += `<circle cx="${W + F * 0.7}" cy="${f(y)}" r="${r}" fill="#00ffaa" filter="url(#glow)"/>`;
    lit += `<circle cx="${W + F * 0.7}" cy="${f(y)}" r="4" fill="#eafff7"/>`;
  }
  return {
    box: [-210, -250, 420, 500],
    base: 1,
    layers: [
      REAL
        ? glowLayer("haloEx", 150, { type: "pulse", min: 0.8, max: 1, speed: 2.2 }, 0.2)
        : glowLayer("haloEx", 200, { type: "pulse", min: 0.7, max: 1, speed: 2.2 }, 0.4),
      { markup: `<g>${s}</g>` },
      {
        markup: `<g>${lit}</g>`,
        blend: "lighter",
        shade: false,
        anim: { type: "pulse", min: 0.65, max: 1, speed: 2.6 },
        // Interior sweep, replacing the hand-rolled scan bar.
        scan: { rects: [[-W, -H, W * 2, H * 2]], color: "#9dffe0", speed: 90, alpha: REAL ? 0.12 : 0.32 },
      },
    ],
  };
}

export const PICKUP_SPRITES = {
  exit: airlock(),
  health: health(),
  ammo: ammo(),
  weapon: weapon(),
  damage2x: exotic(true),
  invuln: exotic(false),
};

// ---------------------------------------------------------------------------
// Realistic set
// ---------------------------------------------------------------------------

/**
 * Weapon drop: a rifle on its side rather than a glowing crate. Gunmetal
 * receiver, polymer furniture, and the weapon colour (cyan) carried by the
 * power cell and optic lens. Same box as the Modern crate.
 */
function realWeapon() {
  let s = `<g transform="translate(4 0) rotate(-9 0 0) scale(1.08)">`;
  // Stock, receiver, handguard, barrel.
  s += path("M-64,-5L-34,-11V5H-40L-58,11H-64Z", "url(#polyF)", 1.2);
  s += line("M-60,-3L-37,-8", "#8a9098", 0.9, 0.35);
  s += rect(-34, -13, 46, 18, "url(#gunF)", 1.2, 2);
  s += rect(12, -11, 32, 14, "url(#polyF)", 1.1, 2);
  for (let i = 0; i < 4; i++) s += rect(15 + i * 7, -8, 4, 7, "#0c0e10", 0, 1);
  s += rect(44, -8, 16, 5, "url(#barrelF)", 0.9, 1);
  s += rect(58, -9.5, 7, 8, "url(#gunF)", 0.9, 1);
  // Grip, magazine, trigger guard.
  s += path("M-24,5H-13L-17,26L-27,24Z", "url(#polyF)", 1.1);
  s += path("M-5,5H8L13,28L1,30Z", "url(#gunF)", 1.1);
  s += line("M-4,7L1,28", "#9aa3ac", 0.8, 0.3);
  s += `<path d="M-13,6C-13,14 -4,14 -4,6" fill="none" stroke="#1c2024" stroke-width="2"/>`;
  // Optic on a rail.
  s += rect(-30, -16, 38, 3, "#23282e", 0.8);
  s += rect(-24, -26, 26, 10, "url(#gunF)", 1.1, 3);
  s += rect(-27, -27, 5, 12, "#1a1e22", 0.8, 1.5);
  // Upper-edge highlights: steel catching the key light.
  s += line("M-33,-12H10M13,-10H42M-23,-25H0", "#dfe6ec", 0.9, 0.45);
  s += line("M-30,-2H8", "#000", 1.4, 0.25);
  s += `</g>`;
  let lit = `<g transform="translate(4 0) rotate(-9 0 0) scale(1.08)">`;
  lit += `<rect x="16" y="-5" width="24" height="3.4" rx="1.2" fill="#00ccff" opacity=".55" filter="url(#glow)"/>`;
  lit += `<rect x="17" y="-4.6" width="22" height="2.4" rx="1" fill="#b8f4ff"/>`;
  lit += `<circle cx="-26.5" cy="-21" r="3" fill="#00ccff" opacity=".5" filter="url(#glow)"/><circle cx="-26.5" cy="-21" r="1.6" fill="#d8f8ff"/>`;
  lit += `</g>`;
  return {
    box: [-66, -64, 140, 118],
    base: 1,
    layers: [
      glowLayer("haloC", 95, { type: "pulse", min: 0.85, max: 1, speed: 2.5 }, 0.38),
      { markup: `<g>${s}</g>` },
      { markup: lit, blend: "lighter", shade: false, anim: { type: "pulse", min: 0.7, max: 1, speed: 3.5 } },
    ],
  };
}

/**
 * Exotic drop: a sealed containment canister. Steel end caps and struts,
 * a glass tube whose charge glows the pickup's colour (red = damage, gold =
 * invulnerability), and the glyph stencilled on the lower cap.
 */
function realExotic(isDmg) {
  const core = isDmg ? "#ff3322" : "#ffcc33";
  const hot = isDmg ? "#ffb09a" : "#fff0b0";
  // Back half: interior of the tube, the rear of the caps.
  let back = rect(-30, -62, 60, 124, "#0b0d10", 0, 6);
  back += rect(-30, -62, 60, 124, "url(#tubeIn)", 0, 6);
  // Charge column, drawn additively over the dark interior.
  let lit = `<rect x="-19" y="-54" width="38" height="108" rx="10" fill="${core}" opacity=".55" filter="url(#glow)"/>`;
  lit += `<rect x="-14" y="-52" width="28" height="104" rx="8" fill="${core}" opacity=".85"/>`;
  lit += `<rect x="-5" y="-50" width="10" height="100" rx="5" fill="${hot}" opacity=".9"/>`;
  // Front: glass, struts, caps, glyph.
  let front = rect(-30, -62, 60, 124, "url(#glassR)", 0, 6);
  front += line("M-22,-56V56", "#ffffff", 3, 0.28) + line("M20,-56V56", "#ffffff", 1, 0.18);
  for (const x of [-34, 29]) front += rect(x, -62, 5, 124, "url(#barrelF)", 1, 1.5);
  const cap = (y, h) =>
    rect(-40, y, 80, h, "url(#capF)", 1.3, 4) +
    rect(-40, y + h * 0.5 - 1.5, 80, 3, "#1a1d21", 0) +
    line(`M-37,${y + 1.5}H37`, "#e6ecf0", 1, 0.5);
  front += cap(-82, 22) + cap(60, 22);
  for (const x of [-30, -10, 10, 30]) front += ell(x, -71, 2.2, 2.2, "#2a2e33", 0.6) + ell(x, 71, 2.2, 2.2, "#2a2e33", 0.6);
  // Hazard band on the top cap, glyph on the bottom cap.
  front += rect(-36, -79, 72, 5, isDmg ? "#8a2a1c" : "#9a7a22", 0);
  const glyph = isDmg
    ? "M-14,64C-14,60 -6,60 -6,64C-6,67 -14,69 -14,73H-5M1,65L10,74M10,65L1,74"
    : "M0,63V75M-6,69H6";
  front += `<path d="${glyph}" fill="none" stroke="#e8e4da" stroke-width="2.6" stroke-opacity=".85" stroke-linecap="round" stroke-linejoin="round"/>`;
  return {
    box: [-100, -100, 200, 200],
    base: 1,
    layers: [
      glowLayer(isDmg ? "haloR" : "haloY", 110, { type: "pulse", min: 0.7, max: 1, speed: 5 }, 0.34),
      { markup: `<g>${back}</g>` },
      { markup: `<g>${lit}</g>`, blend: "lighter", shade: false, anim: { type: "pulse", min: 0.72, max: 1, speed: 5 } },
      { markup: `<g>${front}</g>` },
    ],
  };
}

/**
 * Gear drop: a composite shoulder plate with worn edges and an amber status
 * strip (loot colour). Realistic only; units match drawGearPickup's `size`.
 */
function realGear() {
  let s = path("M-62,30L-46,-40C-30,-50 30,-50 46,-40L62,30C40,40 -40,40 -62,30Z", "url(#plateF)", 1.6);
  s += path("M-46,-40C-30,-50 30,-50 46,-40L40,-18C24,-26 -24,-26 -40,-18Z", "url(#plateT)", 1.2);
  s += line("M-54,14C-30,22 30,22 54,14", "#000", 2, 0.35);
  s += line("M-44,-38C-28,-47 28,-47 44,-38", "#f2e6c8", 1.6, 0.5);
  // Rivets, strap and buckle.
  for (const x of [-40, -14, 14, 40]) s += ell(x, -8 + Math.abs(x) * 0.12, 2.6, 2.6, "#3a3226", 0.6);
  s += rect(-9, 16, 18, 28, "url(#strapF)", 1, 2);
  s += rect(-7, 24, 14, 9, "#6a6458", 0.8, 1.5);
  let lit = `<path d="M-30,-2C-12,2 12,2 30,-2" fill="none" stroke="#ffb030" stroke-width="3" opacity=".55" filter="url(#glow)"/>`;
  lit += `<path d="M-30,-2C-12,2 12,2 30,-2" fill="none" stroke="#ffe0a0" stroke-width="1.4"/>`;
  return {
    box: [-80, -80, 160, 160],
    base: 1,
    layers: [
      glowLayer("haloA", 80, { type: "pulse", min: 0.8, max: 1, speed: 3 }, 0.28),
      { markup: `<g>${s}</g>` },
      { markup: lit, blend: "lighter", shade: false, anim: { type: "pulse", min: 0.7, max: 1, speed: 3 } },
    ],
  };
}

const lin = (id, stops, x1, y1, x2, y2) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
  stops.map((c, i) => `<stop offset="${f(i / (stops.length - 1))}" stop-color="${c}"/>`).join("") +
  `</linearGradient>`;

// Placed ahead of the graded Modern defs, so these ids win.
const REAL_PICKUP_DEFS =
  // Med kit: off-white moulded plastic, not a lit white panel.
  grad("caseF", ["#dedbd2", "#c9c5ba", "#a29d91", "#6f6b62"]) +
  grad("caseS", ["#8c8880", "#55524c"], "1", ".4") +
  grad("caseT", ["#e8e5dc", "#c6c2b8"], "1", "0") +
  grad("cross", ["#c24a40", "#a8261e", "#861a14", "#5a0e0a"]) +
  grad("gunF", ["#6c737b", "#474d54", "#2c3035", "#181b1e"]) +
  grad("polyF", ["#3c3f42", "#2a2c2f", "#1b1c1e", "#0e0f10"]) +
  lin("barrelF", ["#8e959c", "#50565c", "#2a2e32"], 0, 0, 0, 1) +
  lin("capF", ["#9aa0a6", "#6a7077", "#3e4349", "#23272b"], 0, 0, 0, 1) +
  lin("tubeIn", ["#000", "#20262c", "#000"], 0, 0, 1, 0) +
  `<linearGradient id="glassR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe2ee" stop-opacity=".32"/>` +
  `<stop offset=".2" stop-color="#cfe2ee" stop-opacity=".06"/><stop offset=".8" stop-color="#cfe2ee" stop-opacity=".04"/>` +
  `<stop offset="1" stop-color="#cfe2ee" stop-opacity=".22"/></linearGradient>` +
  grad("plateF", ["#8a8272", "#6a6354", "#4a4539", "#2c2922"]) +
  grad("plateT", ["#a39a86", "#7c7462"], "1", "0") +
  grad("strapF", ["#3a3630", "#23201c"]) +
  halo("haloG", "#00ff44", [0.5, 0.16]) +
  halo("haloA", "#ffaa00", [0.5, 0.14]) +
  halo("haloC", "#00ccff", [0.5, 0.14]) +
  halo("haloR", "#ff4422", [0.5, 0.14]) +
  halo("haloY", "#ffcc44", [0.5, 0.14]) +
  halo("haloEx", "#00ffaa", [0.4, 0.12]);

let realPickups = null;

/** Realistic pickup set, built on first use and cached: { defs, sprites }. */
export function buildRealisticPickups() {
  if (realPickups) return realPickups;
  const sprites = withRealistic(() => ({
    exit: airlock(),
    health: health(),
    ammo: ammo(),
    weapon: realWeapon(),
    gear: realGear(),
    damage2x: realExotic(true),
    invuln: realExotic(false),
  }));
  // Pickups are small: finer grime, lighter wear, colour kept a touch richer
  // so the colour coding still reads at a glance.
  for (const key in sprites) realizeSprite(sprites[key], 1, { sat: 0.76, grime: 0.26, scuff: 0.16 });
  realPickups = { defs: REAL_PICKUP_DEFS + realSurfaceDefs(0.05, "0.08 0.6") + gradeMarkup(DEFS, 0.72), sprites };
  return realPickups;
}
