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
 */

import { INK, f, pts, path, rect, line, ell } from "./props.js";

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
  s += `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="5" fill="none" stroke="#00cc44" stroke-width="2.4"/>`;
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
    lights += `<circle cx="${f(px)}" cy="${f(py)}" r="10" fill="#00ff44" filter="url(#glow)"/><circle cx="${f(px)}" cy="${f(py)}" r="3" fill="#e8ffee"/>`;
  }
  lights += `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="5" fill="none" stroke="#00ff44" stroke-width="4" filter="url(#glow)" opacity=".7"/>`;
  const pulse = { type: "pulse", min: 0.6, max: 1, speed: 6 };
  return {
    box: [-72, -80, 150, 150],
    base: 1,
    layers: [
      glowLayer("haloG", 160, pulse, 0.85),
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
  const spine = `<g transform="rotate(-8)"><path d="M23,-36C25,-6 29,22 37,50" fill="none" stroke="#ffaa00" stroke-width="5" filter="url(#glow)"/>` +
    `<path d="M23,-36C25,-6 29,22 37,50" fill="none" stroke="#ffe0a0" stroke-width="1.6"/></g>`;
  return {
    box: [-64, -76, 130, 150],
    base: 1,
    layers: [
      glowLayer("haloA", 100, { type: "pulse", min: 0.85, max: 1, speed: 3 }, 0.75),
      { markup: `<g>${s}</g>` },
      { markup: spine, blend: "lighter", shade: false, anim: { type: "pulse", min: 0.55, max: 1, speed: 4 } },
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

export const PICKUP_SPRITES = {
  health: health(),
  ammo: ammo(),
  weapon: weapon(),
  damage2x: exotic(true),
  invuln: exotic(false),
};
