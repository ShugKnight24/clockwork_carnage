/**
 * SVG models for the Paradox Lord ("Older than time. Hungrier than gods.") and
 * the space-time rift he tears open. See ../index.js for the format.
 *
 * All three villain forms share one armored biomechanical body built from
 * horology parts: a crown of clocks, clock-hand spines, gears in the joints and
 * a clock-faced core in the chest. Each form swaps the palette and bolts on
 * extra parts, and is scaled up a little from the last.
 */

const f = (n) => Math.round(n * 10) / 10;
const INK = "#04060b";

/** Deterministic PRNG so stars and debris never shift between builds. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Toothed gear outline, optionally with an axle hole (fill-rule evenodd). */
function gearPath(cx, cy, ro, ri, teeth, hole = 0) {
  const step = (Math.PI * 2) / teeth;
  const pt = (r, a) => `${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    d += `${i ? "L" : "M"}${pt(ri, a - step * 0.3)}L${pt(ro, a - step * 0.17)}L${pt(ro, a + step * 0.17)}L${pt(ri, a + step * 0.3)}`;
  }
  d += "Z";
  if (hole) d += `M${f(cx + hole)} ${f(cy)}A${hole} ${hole} 0 1 0 ${f(cx - hole)} ${f(cy)}A${hole} ${hole} 0 1 0 ${f(cx + hole)} ${f(cy)}Z`;
  return d;
}

/** A spoked brass gear with hub and ink outline. */
function gear(cx, cy, r, teeth, fill = "url(#brass_L)", spokes = 4) {
  const ri = r * 0.8;
  let sp = "";
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + 0.4;
    sp += `M${f(cx + Math.cos(a) * r * 0.22)} ${f(cy + Math.sin(a) * r * 0.22)}L${f(cx + Math.cos(a) * ri * 0.78)} ${f(cy + Math.sin(a) * ri * 0.78)}`;
  }
  return (
    `<path d="${gearPath(cx, cy, r, ri, teeth)}" fill="${fill}" stroke="${INK}" stroke-width="0.8"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ri * 0.72)}" fill="#05040a" opacity="0.75"/>` +
    `<path d="${sp}" stroke="${fill}" stroke-width="${f(Math.max(0.8, r * 0.14))}" stroke-linecap="round"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.24)}" fill="${fill}" stroke="${INK}" stroke-width="0.5"/>`
  );
}

/** Clock face: bezel, dial, hour/minute ticks and two hands (angles in hours). */
function clockFace(cx, cy, r, h, m, o = {}) {
  const dial = o.dial || "url(#dial)";
  const tick = o.tick || "#d9c9a0";
  let ticks = "";
  const n = r >= 12 ? 60 : 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const major = n === 12 || i % 5 === 0;
    const r0 = r * (major ? 0.68 : 0.8);
    ticks += `M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * r * 0.88)} ${f(cy + Math.sin(a) * r * 0.88)}`;
  }
  const hand = (ang, len, w) => {
    const a = (ang / 12) * Math.PI * 2 - Math.PI / 2;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    const tx = cx + Math.cos(a) * len;
    const ty = cy + Math.sin(a) * len;
    const bx = cx - Math.cos(a) * len * 0.18;
    const by = cy - Math.sin(a) * len * 0.18;
    return `M${f(bx + nx)} ${f(by + ny)}L${f(tx)} ${f(ty)}L${f(bx - nx)} ${f(by - ny)}Z`;
  };
  const sw = f(Math.max(0.35, r * 0.035));
  return (
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${o.bezel || "url(#brass_L)"}" stroke="${INK}" stroke-width="${f(Math.min(1.1, r * 0.09))}"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.9)}" fill="${dial}"/>` +
    `<path d="${ticks}" stroke="${tick}" stroke-width="${sw}" opacity="0.85"/>` +
    `<path d="${hand(h, r * 0.5, r * 0.07)}${hand(m, r * 0.78, r * 0.045)}" fill="${o.hands || "#0a0a0e"}" stroke="${tick}" stroke-width="${f(sw * 0.5)}"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.08)}" fill="${tick}"/>` +
    `<path d="M${f(cx - r * 0.62)} ${f(cy - r * 0.5)}A${f(r * 0.8)} ${f(r * 0.8)} 0 0 1 ${f(cx + r * 0.2)} ${f(cy - r * 0.78)}" stroke="#fff" stroke-width="${f(r * 0.06)}" opacity="0.28" fill="none"/>`
  );
}

/** Breguet-style clock hand pointing along -y from the origin. */
function clockHand(len, w, fill, tipFill) {
  return (
    `<path d="M${-w} 4L${f(-w * 0.55)} ${f(-len * 0.64)}L${f(w * 0.55)} ${f(-len * 0.64)}L${w} 4Z" fill="${fill}"/>` +
    `<circle cx="0" cy="${f(-len * 0.7)}" r="${f(w * 1.7)}" fill="none" stroke="${fill}" stroke-width="${f(w * 0.9)}"/>` +
    `<path d="M${f(-w * 1.5)} ${f(-len * 0.78)}L0 ${-len}L${f(w * 1.5)} ${f(-len * 0.78)}L0 ${f(-len * 0.74)}Z" fill="${tipFill}"/>` +
    `<circle cx="0" cy="6" r="${f(w * 1.8)}" fill="${fill}"/>`
  );
}

/** Mirror left-side markup to the right, swapping to right-lit gradients. */
const mirror = (m) => `<g transform="scale(-1 1)">${m.replaceAll("_L)", "_R)")}</g>`;
const both = (m) => m + mirror(m);

/**
 * Wrap layer content with the shared lighting pass: a key-light/shadow wash
 * clipped to the silhouette, then a rim light on the right and top edges.
 */
function lit(content, rim, strength = 0.8) {
  const R = `x="-220" y="-240" width="440" height="480"`;
  return (
    `<defs><g id="c">${content}</g>` +
    `<mask id="sil" maskUnits="userSpaceOnUse" ${R}><use href="#c" filter="url(#toWhite)"/></mask>` +
    `<mask id="rim" maskUnits="userSpaceOnUse" ${R}><use href="#c" filter="url(#toWhite)"/>` +
    `<use href="#c" filter="url(#toBlack)" transform="translate(-1.8 1.3)"/></mask></defs>` +
    `<use href="#c"/>` +
    `<rect ${R} fill="url(#shade)" mask="url(#sil)"/>` +
    `<rect ${R} fill="${rim}" opacity="${strength}" mask="url(#rim)"/>`
  );
}

const glowCopy = (m, blur = "blur3") => `<g filter="url(#${blur})">${m}</g>${m}`;

const PALETTES = {
  1: {
    plate: ["#06080e", "#182131", "#3c4f66", "#9cc0da"],
    flesh: ["#0a050d", "#27102c", "#4d2350"],
    brass: ["#241808", "#6e4f1e", "#bf9244", "#f6dc98"],
    horn: ["#10232b", "#4f9fb0", "#dffbff"],
    dial: ["#123844", "#081a22"],
    glow: "#22e6ff",
    core: "#eaffff",
    rim: "#46eeff",
    aura: "#0aa9c9",
  },
  2: {
    plate: ["#0a0406", "#2a0f17", "#5e2531", "#d08090"],
    flesh: ["#110306", "#3f0e1b", "#7a1f33"],
    brass: ["#26100a", "#70341a", "#c46638", "#ffba90"],
    horn: ["#2e0f0c", "#b0604c", "#ffe4d6"],
    dial: ["#4a0d18", "#1a0408"],
    glow: "#ff2a4a",
    core: "#ffe6ea",
    rim: "#ff3a58",
    aura: "#b0102a",
  },
  3: {
    plate: ["#05030c", "#1a1034", "#443380", "#c4b6ff"],
    flesh: ["#07030e", "#1c0b38", "#3a1f6e"],
    brass: ["#17132a", "#5e5896", "#b4aee6", "#f8f6ff"],
    horn: ["#231a46", "#9c8cea", "#f8f4ff"],
    dial: ["#2c1666", "#0c0624"],
    glow: "#9b5cff",
    core: "#f6f0ff",
    rim: "#b98aff",
    aura: "#6a2cff",
  },
};

function villainDefs(p) {
  const radial = (id, cx, cy, stops) =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.85">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("") +
    `</radialGradient>`;
  const pair = (id, stopsL, stopsR) => radial(`${id}_L`, 0.3, 0.22, stopsL) + radial(`${id}_R`, 0.7, 0.22, stopsR);
  return (
    pair(
      "plate",
      [[0, p.plate[3]], [0.18, p.plate[2]], [0.55, p.plate[1]], [1, p.plate[0]]],
      [[0, p.plate[2]], [0.35, p.plate[1]], [1, p.plate[0]]],
    ) +
    pair(
      "brass",
      [[0, p.brass[3]], [0.25, p.brass[2]], [0.65, p.brass[1]], [1, p.brass[0]]],
      [[0, p.brass[2]], [0.4, p.brass[1]], [1, p.brass[0]]],
    ) +
    pair("flesh", [[0, p.flesh[2]], [0.5, p.flesh[1]], [1, p.flesh[0]]], [[0, p.flesh[1]], [1, p.flesh[0]]]) +
    `<linearGradient id="horn_L" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${p.horn[0]}"/><stop offset="0.55" stop-color="${p.horn[1]}"/><stop offset="1" stop-color="${p.horn[2]}"/></linearGradient>` +
    `<linearGradient id="horn_R" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${p.horn[0]}"/><stop offset="0.7" stop-color="${p.horn[1]}"/><stop offset="1" stop-color="${p.horn[2]}"/></linearGradient>` +
    `<linearGradient id="claw_L" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.horn[0]}"/><stop offset="0.5" stop-color="${p.horn[1]}"/><stop offset="1" stop-color="${p.horn[2]}"/></linearGradient>` +
    `<linearGradient id="claw_R" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.horn[0]}"/><stop offset="1" stop-color="${p.horn[1]}"/></linearGradient>` +
    `<radialGradient id="dial" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="${p.dial[0]}"/><stop offset="1" stop-color="${p.dial[1]}"/></radialGradient>` +
    `<radialGradient id="glowR"><stop offset="0" stop-color="${p.core}"/><stop offset="0.25" stop-color="${p.glow}" stop-opacity="0.85"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="auraR"><stop offset="0" stop-color="${p.aura}" stop-opacity="0.5"/><stop offset="0.5" stop-color="${p.aura}" stop-opacity="0.16"/><stop offset="1" stop-color="${p.aura}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="-110" y1="-130" x2="110" y2="120"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.38" stop-color="#fff" stop-opacity="0"/><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>` +
    `<filter id="toWhite" filterUnits="userSpaceOnUse" x="-220" y="-240" width="440" height="480"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter>` +
    `<filter id="toBlack" filterUnits="userSpaceOnUse" x="-220" y="-240" width="440" height="480"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter>` +
    `<filter id="blur1" filterUnits="userSpaceOnUse" x="-220" y="-240" width="440" height="480"><feGaussianBlur stdDeviation="1.2"/></filter>` +
    `<filter id="blur3" filterUnits="userSpaceOnUse" x="-220" y="-240" width="440" height="480"><feGaussianBlur stdDeviation="3"/></filter>` +
    `<filter id="blur8" filterUnits="userSpaceOnUse" x="-220" y="-240" width="440" height="480"><feGaussianBlur stdDeviation="8"/></filter>`
  );
}

/* ── Villain body parts (phase-1 units; left side, mirrored where paired) ── */

const CRACKS = {
  pec: "M-58 -66L-50 -56L-54 -48L-44 -40L-46 -30",
  pauldron: "M-112 -100L-104 -86L-110 -74L-98 -64",
  thigh: "M-50 44L-42 56L-46 66L-38 78",
  head: "M-6 -122L-10 -112L-5 -106L-11 -100",
  shin: "M-60 110L-52 120L-56 130",
};

function backLayer(ph, p) {
  const angles = ph === 1 ? [-64, -42, 42, 64] : [-72, -54, -36, 36, 54, 72];
  const lens = ph === 1 ? [92, 104, 104, 92] : [92, 108, 118, 118, 108, 92];
  let hands = "";
  angles.forEach((a, i) => {
    hands += `<g transform="translate(0 -60) rotate(${a})">${clockHand(lens[i], 3.4, a < 0 ? "url(#plate_L)" : "url(#plate_R)", p.glow)}</g>`;
  });
  return lit(`<g stroke="${INK}" stroke-width="0.9" stroke-linejoin="round">${hands}</g>`, p.rim, 0.6);
}

function haloRing(ph, p) {
  const cx = 0;
  const cy = -96;
  const ro = 58;
  const ri = 50;
  let ticks = "";
  let pips = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const r0 = major ? ri + 1.5 : ro - 3.5;
    ticks += `M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * (ro - 1.2))} ${f(cy + Math.sin(a) * (ro - 1.2))}`;
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = cx + Math.cos(a) * (ro + 3);
    const y = cy + Math.sin(a) * (ro + 3);
    const deg = f((a * 180) / Math.PI + 90);
    pips += `<path transform="translate(${f(x)} ${f(y)}) rotate(${deg})" d="M-2.2 1.5L0 -4L2.2 1.5Z" fill="url(#brass_L)"/>`;
  }
  const band =
    `<circle cx="${cx}" cy="${cy}" r="${(ro + ri) / 2}" fill="none" stroke="${INK}" stroke-width="${ro - ri + 2.2}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${(ro + ri) / 2}" fill="none" stroke="url(#plate_L)" stroke-width="${ro - ri}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${ro}" fill="none" stroke="${p.brass[2]}" stroke-width="0.9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="none" stroke="${p.brass[1]}" stroke-width="0.9"/>` +
    `<path d="${ticks}" stroke="${p.glow}" stroke-width="1.1"/>` +
    `<g stroke="${INK}" stroke-width="0.5">${pips}</g>` +
    // two long hands sweeping the ring
    `<path d="M0 -96L-2 -100L-3 -${96 + ri - 4}L0 -${96 + ri + 2}L3 -${96 + ri - 4}L2 -100Z" fill="${p.glow}" opacity="0.8" transform="rotate(38 0 -96)"/>` +
    `<path d="M0 -96L-2 -100L-2.5 -${96 + ri - 14}L0 -${96 + ri - 8}L2.5 -${96 + ri - 14}L2 -100Z" fill="${p.glow}" opacity="0.6" transform="rotate(-128 0 -96)"/>`;
  if (ph === 2) {
    return (
      `<defs><mask id="gap" maskUnits="userSpaceOnUse" x="-80" y="-170" width="160" height="160"><rect x="-80" y="-170" width="160" height="160" fill="#fff"/>` +
      `<path d="M0 -96L62 -168L80 -140L66 -132L80 -118Z" fill="#000"/><path d="M0 -96L-80 -70L-76 -44L-66 -54L-58 -30Z" fill="#000"/></mask></defs>` +
      `<g mask="url(#gap)">${band}</g>`
    );
  }
  return band;
}

function armLayer(ph, p) {
  const claw = (x, len, bend) =>
    `<path d="M${x - 3.4} 90C${x - 4} ${90 + len * 0.45} ${x - 1} ${90 + len * 0.8} ${x + bend} ${90 + len}C${x + 1.6} ${90 + len * 0.7} ${x + 3.6} ${90 + len * 0.4} ${x + 3.4} 90Z" fill="url(#claw_L)"/>`;
  const cl = ph === 1 ? 26 : ph === 2 ? 34 : 32;
  let m =
    // upper arm: sinew under brass bands
    `<path d="M-122 -56C-138 -36 -140 -10 -132 10L-102 12C-98 -8 -94 -30 -88 -48Z" fill="url(#flesh_L)"/>` +
    `<path d="M-124 -44C-128 -30 -128 -18 -124 -12M-112 -44C-114 -30 -114 -18 -110 -12M-102 -40C-104 -26 -102 -16 -100 -10" stroke="${p.flesh[2]}" stroke-width="0.7" opacity="0.8" fill="none"/>` +
    `<path d="M-130 -30C-118 -26 -104 -26 -92 -30L-94 -22C-106 -18 -120 -18 -132 -22Z" fill="url(#brass_L)"/>` +
    `<path d="M-134 -8C-120 -4 -106 -4 -97 -8L-98 0C-108 3 -122 3 -134 0Z" fill="url(#brass_L)"/>` +
    // forearm gauntlet with fin blades
    `<path d="M-140 14L-157 28L-143 32L-160 48L-145 50L-155 64L-139 60Z" fill="url(#plate_L)"/>` +
    `<path d="M-140 12C-148 32 -146 56 -136 72L-102 72C-98 54 -96 30 -100 12Z" fill="url(#plate_L)"/>` +
    `<path d="M-136 22C-124 20 -112 20 -104 22M-140 44C-126 42 -112 42 -102 44" stroke="${p.plate[3]}" stroke-width="0.55" opacity="0.45" fill="none"/>` +
    `<path d="M-139 18C-143 34 -142 52 -136 66" stroke="${p.plate[3]}" stroke-width="1.1" opacity="0.55" fill="none"/>` +
    `<path d="M-128 27L-128 37M-120 27L-120 37M-112 27L-112 37" stroke="${p.glow}" stroke-width="1.6" stroke-linecap="round"/>` +
    clockFace(-119, 56, 7.5, 4, 9) +
    gear(-118, 10, 12, 12) +
    // hand
    `<path d="M-142 68C-151 76 -149 90 -139 96L-101 96C-95 88 -95 76 -101 68Z" fill="url(#plate_L)"/>` +
    `<path d="M-137 80L-131 80M-127 82L-121 82M-117 82L-111 82M-107 80L-103 80" stroke="${p.plate[3]}" stroke-width="0.6" opacity="0.5"/>` +
    `<g stroke="${INK}" stroke-width="0.8">${claw(-135, cl, 5)}${claw(-126, cl + 4, 5)}${claw(-117, cl + 3, 5)}${claw(-108, cl - 2, 6)}` +
    `<path d="M-100 76C-92 82 -88 92 -86 ${104 + (cl - 26) * 0.6}C-92 96 -96 88 -104 84Z" fill="url(#claw_L)"/></g>`;
  if (ph >= 2) {
    m += `<path d="M-134 -40L-152 -54L-136 -30ZM-136 -6L-154 -12L-136 4Z" fill="url(#horn_L)" stroke="${INK}" stroke-width="0.8"/>`;
    m += `<path d="M-146 30L-136 38L-140 48M-110 50L-118 58" stroke="${INK}" stroke-width="0.9" fill="none"/>`;
  }
  return `<g stroke="${INK}" stroke-width="1.1" stroke-linejoin="round">${m}</g>`;
}

function legsLayer(ph, p) {
  const leg =
    `<path d="M-10 30C-30 22 -56 32 -62 58C-66 74 -64 88 -58 96L-34 98C-30 82 -24 64 -8 52Z" fill="url(#plate_L)"/>` +
    `<path d="M-54 40C-60 50 -60 64 -58 78" stroke="${p.plate[3]}" stroke-width="1" opacity="0.55" fill="none"/>` +
    `<path d="M-32 36C-38 48 -40 62 -40 76" stroke="${INK}" stroke-width="0.5" opacity="0.6" fill="none"/>` +
    `<path d="M-62 104C-68 120 -68 134 -66 142L-34 142C-32 130 -32 116 -38 104Z" fill="url(#plate_L)"/>` +
    `<path d="M-62 108C-65 120 -65 132 -64 140" stroke="${p.plate[3]}" stroke-width="1" opacity="0.5" fill="none"/>` +
    `<path d="M-60 116L-40 116M-61 128L-38 128" stroke="${INK}" stroke-width="0.5" opacity="0.6"/>` +
    `<path d="M-68 86C-74 96 -68 110 -54 114C-40 114 -32 104 -32 94C-38 84 -56 80 -68 86Z" fill="url(#brass_L)"/>` +
    gear(-51, 98, 9, 10, "url(#plate_L)", 3) +
    `<path d="M-72 138C-78 142 -78 150 -72 152L-26 152C-22 148 -24 140 -32 137Z" fill="url(#plate_L)"/>` +
    `<path d="M-76 146L-86 157L-70 152ZM-60 150L-64 160L-52 152ZM-44 150L-44 159L-36 152Z" fill="url(#claw_L)"/>` +
    // tasset plate over the hip
    `<path d="M-44 12C-52 26 -54 40 -52 54L-32 58C-30 44 -26 30 -18 20Z" fill="url(#plate_L)"/>` +
    `<path d="M-49 30L-24 34M-52 44L-30 48" stroke="${p.plate[3]}" stroke-width="0.6" opacity="0.5"/>` +
    (ph >= 2 ? `<path d="${CRACKS.thigh}${CRACKS.shin}" stroke="${INK}" stroke-width="1" fill="none"/>` : "");
  const pelvis =
    `<path d="M-36 8C-40 28 -30 48 -10 56L10 56C30 48 40 28 36 8Z" fill="url(#flesh_L)"/>` +
    `<path d="M-20 24C-14 36 -8 44 0 48C8 44 14 36 20 24" stroke="${p.flesh[2]}" stroke-width="0.7" fill="none" opacity="0.8"/>`;
  const belt =
    `<path d="M-46 2C-20 10 20 10 46 2L45 16C20 22 -20 22 -45 16Z" fill="url(#brass_L)"/>` +
    `<path d="M-44 6C-20 13 20 13 44 6" stroke="${p.brass[3]}" stroke-width="0.6" opacity="0.6" fill="none"/>` +
    [-38, -26, 26, 38].map((x) => `<circle cx="${x}" cy="${f(10 + Math.abs(x) * -0.08)}" r="1.1" fill="${p.brass[0]}" stroke="none"/>`).join("");
  return lit(`<g stroke="${INK}" stroke-width="1.1" stroke-linejoin="round">${pelvis}${both(leg)}${belt}</g>`, p.rim);
}

function pendulumLayer(p) {
  return (
    `<g stroke="${INK}" stroke-width="0.9">` +
    `<path d="M-1.6 18L-1.6 64L1.6 64L1.6 18Z" fill="url(#brass_L)"/>` +
    `<circle cx="0" cy="72" r="10" fill="url(#brass_L)"/>` +
    `<circle cx="0" cy="72" r="6.5" fill="url(#dial)"/>` +
    `<circle cx="0" cy="72" r="2.4" fill="${p.glow}" stroke="none"/></g>` +
    clockFace(0, 12, 8, 10, 2)
  );
}

function torsoLayer(ph, p) {
  const side =
    // pauldron: gear crest, blade spikes, faceted dome and lames
    gear(-100, -96, 17, 16) +
    `<path d="M-84 -94L-90 -126L-76 -98Z" fill="url(#horn_L)"/>` +
    `<path d="M-104 -100L-120 -130L-96 -104Z" fill="url(#horn_L)"/>` +
    `<path d="M-122 -92L-146 -112L-116 -84Z" fill="url(#horn_L)"/>` +
    `<path d="M-56 -72L-68 -94L-100 -104L-128 -96L-140 -74L-136 -50L-128 -38L-116 -46C-102 -54 -88 -58 -76 -58C-66 -62 -59 -66 -56 -72Z" fill="url(#plate_L)"/>` +
    `<path d="M-58 -74L-68 -92L-100 -101L-126 -93L-138 -74L-100 -80Z" fill="#fff" opacity="0.07" stroke="none"/>` +
    `<path d="M-58 -74L-100 -80L-138 -74L-135 -50L-127 -40L-116 -47C-102 -55 -88 -58 -76 -58Z" fill="#000" opacity="0.22" stroke="none"/>` +
    `<path d="M-58 -74L-100 -80L-138 -74" stroke="${p.plate[3]}" stroke-width="0.9" opacity="0.8" fill="none"/>` +
    `<path d="M-72 -92L-100 -100L-124 -93" stroke="#fff" stroke-width="1.1" opacity="0.4" fill="none" stroke-linecap="round"/>` +
    `<path d="M-70 -64L-100 -70L-132 -64M-82 -84L-86 -76M-104 -88L-104 -80M-122 -84L-120 -77" stroke="${INK}" stroke-width="0.5" opacity="0.6" fill="none"/>` +
    `<path d="M-132 -36C-116 -48 -96 -56 -76 -58L-78 -50C-98 -48 -114 -40 -126 -28Z" fill="url(#brass_L)"/>` +
    `<path d="M-126 -28C-112 -38 -98 -44 -82 -46L-84 -37C-98 -35 -110 -29 -120 -19Z" fill="url(#plate_L)"/>` +
    [-120, -108, -96, -84].map((x) => `<circle cx="${x}" cy="${f(-46 - (x + 132) * 0.12)}" r="1" fill="${p.brass[3]}" stroke="none"/>`).join("") +
    // pectoral plate with specular strip
    `<path d="M-17 -66C-36 -76 -68 -74 -82 -58C-86 -44 -72 -26 -48 -22C-30 -20 -20 -28 -17 -42Z" fill="url(#plate_L)"/>` +
    `<path d="M-24 -66C-42 -71 -62 -68 -74 -58" stroke="#fff" stroke-width="1" opacity="0.35" fill="none" stroke-linecap="round"/>` +
    `<path d="M-30 -30C-44 -30 -62 -36 -72 -46M-22 -54C-34 -52 -50 -52 -62 -56" stroke="${INK}" stroke-width="0.5" opacity="0.6" fill="none"/>` +
    // exposed flank mechanism
    `<path d="M-24 -20C-40 -18 -58 -22 -70 -30C-68 -12 -58 2 -46 12L-22 12Z" fill="#07050a"/>` +
    gear(-44, -8, 11, 12) +
    gear(-30, 4, 7, 9, "url(#plate_L)", 3) +
    `<path d="M-66 -24C-56 -18 -52 -8 -52 6M-60 -28L-68 -14" stroke="${p.flesh[2]}" stroke-width="1.6" fill="none" opacity="0.8"/>` +
    // abdominal plates
    [-18, -6, 6].map((y, i) => `<path d="M-3 ${y}L-${20 - i * 2} ${y - 1}C-${22 - i * 2} ${y + 3} -${21 - i * 2} ${y + 7} -${19 - i * 2} ${y + 9}L-3 ${y + 9}Z" fill="url(#plate_L)"/>`).join("") +
    (ph >= 2 ? `<path d="${CRACKS.pec}${CRACKS.pauldron}" stroke="${INK}" stroke-width="1.1" fill="none"/>` : "");
  const center =
    `<path d="M-24 -78C-54 -84 -88 -78 -96 -58C-102 -36 -82 -10 -48 16L48 16C82 -10 102 -36 96 -58C88 -78 54 -84 24 -78Z" fill="url(#flesh_L)"/>` +
    // trapezius armor rising to the helm
    `<path d="M-14 -62C-30 -70 -46 -82 -62 -80C-50 -90 -34 -96 -20 -92Z" fill="url(#plate_L)"/>` +
    `<path d="M14 -62C30 -70 46 -82 62 -80C50 -90 34 -96 20 -92Z" fill="url(#plate_R)"/>` +
    `<path d="M-16 -86C-18 -74 -16 -64 -10 -58L10 -58C16 -64 18 -74 16 -86Z" fill="url(#flesh_L)"/>` +
    `<path d="M-10 -84L-7 -60M-3 -86L-2 -60M3 -86L2 -60M10 -84L7 -60" stroke="${p.brass[1]}" stroke-width="1.4" opacity="0.8"/>` +
    `<path d="M-6 -62L6 -62L4 18L-4 18Z" fill="#07050a"/>` +
    `<circle cx="0" cy="-40" r="28" fill="#050308"/>`;
  return lit(`<g stroke="${INK}" stroke-width="1.1" stroke-linejoin="round">${center}${both(side)}</g>`, p.rim);
}

function coreGearLayer(p) {
  return `<path d="${gearPath(0, -40, 27, 22.5, 24, 19)}" fill="url(#brass_L)" fill-rule="evenodd" stroke="${INK}" stroke-width="0.9"/>` +
    `<circle cx="0" cy="-40" r="21" fill="none" stroke="${p.brass[0]}" stroke-width="1"/>`;
}

function coreFaceLayer(ph) {
  const r = ph === 3 ? 20 : 18.5;
  return clockFace(0, -40, r, 11.2, 11.9, { dial: "url(#dial)", tick: "#e8ddc0" });
}

function headLayer(ph, p) {
  const horn =
    `<path d="M-20 -110C-36 -112 -50 -122 -52 -136C-53 -142 -52 -148 -48 -154C-45 -144 -42 -136 -37 -130C-32 -124 -26 -120 -18 -119Z" fill="url(#horn_L)"/>` +
    `<path d="M-28 -113L-26 -121M-36 -116L-35 -126M-44 -122L-40 -131M-49 -132L-45 -138" stroke="${INK}" stroke-width="0.7" opacity="0.75"/>` +
    `<path d="M-24 -112C-38 -116 -48 -126 -50 -140" stroke="#fff" stroke-width="0.8" opacity="0.3" fill="none"/>` +
    (ph >= 2
      ? `<path d="M-24 -84C-38 -86 -52 -80 -62 -64C-50 -70 -38 -72 -24 -76Z" fill="url(#horn_L)"/>` +
        `<path d="M-34 -84L-33 -76M-44 -82L-42 -73M-52 -76L-50 -69" stroke="${INK}" stroke-width="0.6" opacity="0.75"/>`
      : "") +
    (ph === 3
      ? `<path d="M-14 -118C-24 -128 -30 -140 -28 -156C-22 -146 -16 -138 -8 -130Z" fill="url(#horn_L)"/>`
      : "");
  const skull =
    `<path d="M-16 -122C-24 -114 -27 -100 -25 -88L-22 -74C-18 -64 -10 -56 0 -52C10 -56 18 -64 22 -74L25 -88C27 -100 24 -114 16 -122C8 -128 -8 -128 -16 -122Z" fill="url(#plate_L)"/>` +
    `<path d="M-2 -126L0 -104L2 -126" fill="${p.plate[1]}" stroke-width="0.4"/>`;
  const face =
    // temple plate, horn socket
    `<path d="M-22 -114L-30 -110L-28 -98L-24 -100Z" fill="url(#brass_L)"/>` +
    // heavy V brow
    `<path d="M-25 -98L-4 -90L0 -95L-2 -100L-24 -105Z" fill="url(#plate_L)"/>` +
    `<path d="M-23 -103L-4 -95" stroke="#fff" stroke-width="0.7" opacity="0.35" fill="none"/>` +
    // eye sockets (angled), cheek plate, nose ridge
    `<path d="M-20 -94L-5 -88L-6 -85L-19 -89Z" fill="#020104"/>` +
    `<path d="M-22 -86L-10 -81L-11 -78.5L-21.5 -82Z" fill="#020104"/>` +
    `<path d="M-25 -84L-12 -76L-9 -68L-21 -71Z" fill="url(#plate_L)"/>` +
    // armored jaw plate flanking the fanged maw
    `<path d="M-23 -74L-12 -70L-9 -${ph === 2 ? 52 : 58}L0 -${ph === 2 ? 49 : 55}L0 -50C-12 -53 -19 -61 -23 -74Z" fill="url(#brass_L)"/>` +
    `<path d="M-18 -70L-14 -58" stroke="${p.brass[3]}" stroke-width="0.5" opacity="0.5"/>` +
    `<path d="M-11 -70L-9.5 -64L-8 -70ZM-7 -70L-6 -66.5L-5 -70ZM-3.5 -70L-2.8 -67L-2 -70ZM-8.5 -${ph === 2 ? 52 : 58}L-7.5 -${ph === 2 ? 57 : 62}L-6 -${ph === 2 ? 51.5 : 57}ZM-4 -${ph === 2 ? 50 : 56}L-3.2 -${ph === 2 ? 54 : 59}L-2.4 -${ph === 2 ? 49.5 : 55.5}Z" fill="${p.horn[2]}" stroke-width="0.3"/>`;
  const mouth = `<path d="M-12 -70L12 -70L9 -${ph === 2 ? 52 : 58}L0 -${ph === 2 ? 49 : 55}L-9 -${ph === 2 ? 52 : 58}Z" fill="#0b0206"/>`;
  // crown of clocks on spires above a brass circlet
  const clocks =
    ph === 3
      ? [[0, -142, 10, 2.5, 7], [-19, -135, 7.5, 5, 11], [19, -135, 7.5, 9, 3], [-33, -122, 6, 1, 6], [33, -122, 6, 7, 12]]
      : [[0, -138, 9, 11.8, 12], [-18, -130, 7, 3, 8], [18, -130, 7, 8, 4], [-31, -118, 5.5, 10, 2], [31, -118, 5.5, 5, 9]];
  let crown = "";
  clocks.forEach(([x, y, r]) => {
    const bx = x * 0.62;
    crown +=
      `<path d="M${f(bx - 2.2)} -116L${f(x - 1)} ${f(y)}L${f(x + 1)} ${f(y)}L${f(bx + 2.2)} -116Z" fill="url(#brass_L)"/>` +
      `<path d="M${f(x - r * 0.35)} ${f(y - r * 0.8)}L${f(x + x * 0.08)} ${f(y - r - 6)}L${f(x + r * 0.35)} ${f(y - r * 0.8)}Z" fill="url(#horn_L)"/>`;
  });
  crown += `<path d="M-27 -113C-15 -126 15 -126 27 -113L25 -107C13 -119 -13 -119 -25 -107Z" fill="url(#brass_L)"/>`;
  clocks.forEach(([x, y, r, h, m]) => {
    crown += clockFace(x, y, r, h, m, { tick: "#f0e2bc" });
  });
  const cracks = ph >= 2 ? `<path d="${CRACKS.head}" stroke="${INK}" stroke-width="0.9" fill="none"/>` : "";
  return lit(`<g stroke="${INK}" stroke-width="1.1" stroke-linejoin="round">${both(horn)}${skull}${mouth}${both(face)}${cracks}${crown}</g>`, p.rim);
}

function glowLayer(ph, p) {
  const eyes =
    `<path d="M-17 -91.5L-6 -87.5L-7 -86L-16.5 -89.5Z M-19 -83.5L-11 -80.5L-12 -79.3L-18.5 -82Z" fill="${p.core}"/>`;
  const veins = `<path d="M-10 -58C-14 -48 -20 -46 -24 -36M-4 -20C-8 -10 -6 0 -10 10M-24 -40C-40 -36 -52 -40 -64 -48M-30 60C-36 72 -34 84 -40 96M-36 146L-44 130" stroke="${p.glow}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
  const cracks =
    ph >= 2
      ? `<path d="${CRACKS.pec}${CRACKS.pauldron}${CRACKS.thigh}${CRACKS.shin}${CRACKS.head}" stroke="${p.glow}" stroke-width="0.9" fill="none"/>`
      : "";
  const third = ph === 3 ? `<path d="M0 -114L2.4 -107L0 -100L-2.4 -107Z" fill="${p.core}"/>` : "";
  const maw = ph === 2
    ? `<path d="M-10 -67L10 -67L8 -54L0 -51L-8 -54Z" fill="${p.glow}" opacity="0.85"/>`
    : `<path d="M-9 -66L9 -66L7 -59L0 -57L-7 -59Z" fill="${p.glow}" opacity="0.3"/>`;
  const inner = both(eyes + veins + cracks) + third + maw;
  const coreR = ph === 3 ? 42 : 34;
  return (
    `<circle cx="0" cy="-40" r="${coreR}" fill="url(#glowR)" opacity="0.8"/>` +
    `<circle cx="0" cy="-40" r="6" fill="${p.core}" filter="url(#blur1)"/>` +
    `<ellipse cx="0" cy="-86" rx="22" ry="9" fill="url(#glowR)" opacity="0.3"/>` +
    glowCopy(inner, "blur3")
  );
}

/** Final form: an arch of shattered clock faces standing behind the body like a halo. */
function archHalo(p) {
  const rnd = rng(7);
  const cy = -50;
  const at = (deg, rx = 148, ry = 92) => [Math.cos((deg * Math.PI) / 180) * rx, cy + Math.sin((deg * Math.PI) / 180) * ry];
  let arc = "";
  for (let d = 176; d <= 364; d += 4) {
    const [x, y] = at(d);
    arc += `${d === 176 ? "M" : "L"}${f(x)} ${f(y)}`;
  }
  let m =
    `<g filter="url(#blur3)"><path d="${arc}" fill="none" stroke="${p.glow}" stroke-width="4" opacity="0.7"/></g>` +
    `<path d="${arc}" fill="none" stroke="${p.core}" stroke-width="0.9" stroke-dasharray="26 5 4 5"/>`;
  [[180, 13], [206, 14], [233, 15], [258, 12], [282, 12], [307, 15], [334, 14], [360, 13]].forEach(([deg, r], i) => {
    const [x, y] = at(deg);
    const cut = rnd() * Math.PI * 2;
    const bite = `M${f(x)} ${f(y)}L${f(x + Math.cos(cut) * r * 1.6)} ${f(y + Math.sin(cut) * r * 1.6)}L${f(x + Math.cos(cut + 1.1) * r * 1.6)} ${f(y + Math.sin(cut + 1.1) * r * 1.6)}Z`;
    m +=
      `<mask id="b${i}" maskUnits="userSpaceOnUse" x="${f(x - 30)}" y="${f(y - 30)}" width="60" height="60"><rect x="${f(x - 30)}" y="${f(y - 30)}" width="60" height="60" fill="#fff"/><path d="${bite}" fill="#000"/></mask>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 7)}" fill="url(#glowR)" opacity="0.45"/>` +
      `<g mask="url(#b${i})">${clockFace(x, y, r, rnd() * 12, rnd() * 12, { tick: "#efe8ff" })}</g>` +
      `<path d="M${f(x + Math.cos(cut + 0.5) * r * 0.2)} ${f(y + Math.sin(cut + 0.5) * r * 0.2)}L${f(x + Math.cos(cut + 0.25) * r * 1.02)} ${f(y + Math.sin(cut + 0.25) * r * 1.02)}" stroke="${p.core}" stroke-width="0.9"/>` +
      // a splinter of the missing wedge drifting loose
      `<path d="M${f(x + Math.cos(cut + 0.55) * r * 1.35)} ${f(y + Math.sin(cut + 0.55) * r * 1.35)}l${f(Math.cos(cut) * 5)} ${f(Math.sin(cut) * 5)}l${f(Math.cos(cut + 1.9) * 3)} ${f(Math.sin(cut + 1.9) * 3)}Z" fill="url(#brass_L)" stroke="${INK}" stroke-width="0.5"/>`;
  });
  return m;
}

function raysLayer(p) {
  let d = "";
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const w = 0.035 + (i % 3) * 0.018;
    const l = i % 2 ? 96 : 130;
    d += `M0 -80L${f(Math.cos(a - w) * l)} ${f(-80 + Math.sin(a - w) * l)}L${f(Math.cos(a + w) * l)} ${f(-80 + Math.sin(a + w) * l)}Z`;
  }
  return `<g filter="url(#blur3)"><path d="${d}" fill="${p.glow}" opacity="0.3"/></g>`;
}

function motesLayer(ph, p) {
  const rnd = rng(ph * 31);
  let m = "";
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 70 + rnd() * 66;
    const x = Math.cos(a) * r;
    const y = -30 + Math.sin(a) * r * 0.8;
    if (y > 140 || y < -150) continue;
    const s = 0.6 + rnd() * 1.4;
    m += `<path d="M${f(x)} ${f(y - s * 2.4)}L${f(x + s * 0.5)} ${f(y)}L${f(x)} ${f(y + s * 2.4)}L${f(x - s * 0.5)} ${f(y)}Z M${f(x - s * 2.4)} ${f(y)}L${f(x)} ${f(y + s * 0.5)}L${f(x + s * 2.4)} ${f(y)}L${f(x)} ${f(y - s * 0.5)}Z" fill="${p.core}"/>`;
  }
  return glowCopy(m, "blur1");
}

/** Final form: starfield visible through the torn abdomen. */
function voidBellyLayer(p) {
  const rnd = rng(77);
  let stars = "";
  for (let i = 0; i < 22; i++) {
    stars += `<circle cx="${f(-20 + rnd() * 40)}" cy="${f(-22 + rnd() * 38)}" r="${f(0.3 + rnd() * 0.8)}" fill="#fff" opacity="${f(0.5 + rnd() * 0.5)}"/>`;
  }
  let hole = "";
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const j = 0.84 + Math.sin(a * 3 + 1) * 0.14 + rnd() * 0.1;
    hole += `${i ? "L" : "M"}${f(Math.cos(a) * 19 * j)} ${f(-3 + Math.sin(a) * 15 * j)}`;
  }
  hole += "Z";
  return (
    `<defs><clipPath id="vb"><path d="${hole}"/></clipPath><radialGradient id="neb" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="${p.glow}" stop-opacity="0.9"/><stop offset="0.5" stop-color="#2a0e60"/><stop offset="1" stop-color="#05020c"/></radialGradient></defs>` +
    `<path d="${hole}" fill="url(#neb)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<g clip-path="url(#vb)">${stars}</g>` +
    `<path d="${hole}" fill="none" stroke="${p.core}" stroke-width="0.6" opacity="0.8"/>`
  );
}

/** Broken armor shards drifting off the shoulders (form 2 and final form). */
function shardsLayer(ph, p) {
  const shard = (x, y, rot, s) =>
    `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M-6 -4L5 -6L8 2L-2 6Z" fill="url(#plate_L)" stroke="${INK}" stroke-width="${f(0.9 / s)}"/>` +
    `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M5 -6L8 2" stroke="${p.glow}" stroke-width="${f(1.2 / s)}"/>`;
  const list = ph === 3
    ? [[-140, -130, 20, 1.2], [140, -134, -30, 1], [-152, 24, 60, 0.9], [150, 40, -10, 1.3], [-66, -148, 45, 0.8]]
    : [[-146, -128, 20, 1.1], [146, -132, -30, 0.9], [-150, 96, 60, 0.8], [152, 100, -10, 1]];
  return list.map((s) => shard(...s)).join("");
}

function paradoxLord(ph) {
  const p = PALETTES[ph];
  const k = ph === 3 ? 1.1 : ph === 2 ? 1.06 : 1;
  const S = (m) => `<g transform="scale(${k})">${m}</g>`;
  const pv = (x, y) => [f(x * k), f(y * k)];
  const layers = [
    { markup: S(`<ellipse cx="0" cy="-30" rx="150" ry="170" fill="url(#auraR)"/>`), anim: { type: "pulse", min: 0.6, max: 1, speed: 1.3 }, blend: "screen" },
  ];
  if (ph === 3) {
    layers.push({ markup: S(raysLayer(p)), anim: { type: "spin", speed: 0.05, pivot: pv(0, -80) }, blend: "lighter", opacity: 0.8 });
    layers.push({ markup: S(archHalo(p)), anim: { type: "float", amp: 2.5, speed: 0.7 } });
  }
  if (ph < 3) layers.push({ markup: S(haloRing(ph, p)), anim: { type: "spin", speed: ph === 2 ? 0.35 : 0.18, pivot: pv(0, -96) } });
  layers.push({ markup: S(backLayer(ph, p)), anim: { type: "sway", amp: 0.025, speed: 0.9, pivot: pv(0, -60) } });
  layers.push({ markup: S(lit(armLayer(ph, p), p.rim)), anim: { type: "sway", amp: 0.03, speed: 1.1, pivot: pv(-104, -52) } });
  layers.push({ markup: S(lit(mirror(armLayer(ph, p)), p.rim)), anim: { type: "sway", amp: 0.03, speed: 1.1, phase: 1.7, pivot: pv(104, -52) } });
  layers.push({ markup: S(legsLayer(ph, p)) });
  layers.push({ markup: S(pendulumLayer(p)), anim: { type: "sway", amp: 0.12, speed: 2.2, pivot: pv(0, 18) } });
  layers.push({ markup: S(torsoLayer(ph, p)) });
  if (ph === 3) layers.push({ markup: S(voidBellyLayer(p)) });
  layers.push({ markup: S(coreGearLayer(p)), anim: { type: "spin", speed: ph === 2 ? -0.9 : -0.5, pivot: pv(0, -40) } });
  layers.push({ markup: S(coreFaceLayer(ph)) });
  layers.push({ markup: S(headLayer(ph, p)) });
  layers.push({ markup: S(glowLayer(ph, p)), anim: { type: "pulse", min: 0.55, max: 1, speed: ph === 2 ? 4.2 : 3 }, blend: "lighter" });
  if (ph >= 2) {
    layers.push({ markup: S(shardsLayer(ph, p)), anim: { type: "float", amp: 3, speed: 1.2 } });
  }
  if (ph === 3) {
    layers.push({ markup: S(motesLayer(ph, p)), anim: { type: "flicker", min: 0.4, max: 1, speed: 1.5 }, blend: "lighter" });
  }
  const [bx, by, bw, bh] = ph === 3 ? [-168, -158, 336, 320] : [-162, -162, 324, 326];
  return {
    box: [f(bx * k), f(by * k), f(bw * k), f(bh * k)],
    defs: villainDefs(p),
    anim: { type: "breathe", amp: 0.006, speed: 1.4, pivot: pv(0, 152) },
    layers,
  };
}

/* ── Rift ── */

const TEAR_L = [[6, -84], [-2, -70], [1, -60], [-10, -48], [-6, -38], [-20, -24], [-13, -14], [-26, -2], [-18, 8], [-23, 20], [-11, 30], [-14, 42], [-6, 50], [-8, 62]];
const TEAR_R = [[-8, 62], [4, 50], [3, 40], [14, 30], [12, 18], [25, 8], [19, -4], [28, -16], [14, -28], [18, -40], [9, -52], [11, -64], [6, -84]];

function tearPath(scale = 1, cy = -10) {
  const pts = [...TEAR_L, ...TEAR_R.slice(1)];
  return pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x * scale)} ${f(cy + (y + 10) * scale)}`).join("") + "Z";
}

function riftDefs() {
  return (
    `<radialGradient id="voidG" cx="0.5" cy="0.47" r="0.6"><stop offset="0" stop-color="#ffffff"/><stop offset="0.08" stop-color="#c8f8ff"/><stop offset="0.24" stop-color="#22c8ff"/><stop offset="0.48" stop-color="#3a1a8a"/><stop offset="0.8" stop-color="#0c0526"/><stop offset="1" stop-color="#020108"/></radialGradient>` +
    `<radialGradient id="bloom"><stop offset="0" stop-color="#6ae8ff" stop-opacity="0.55"/><stop offset="0.35" stop-color="#3a7cff" stop-opacity="0.22"/><stop offset="0.7" stop-color="#7a2cff" stop-opacity="0.08"/><stop offset="1" stop-color="#7a2cff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="swirlFade"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.7" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fdcff" stop-opacity="0.55"/><stop offset="0.5" stop-color="#1d3a66" stop-opacity="0.6"/><stop offset="1" stop-color="#070a1c" stop-opacity="0.85"/></linearGradient>` +
    `<radialGradient id="brassR" cx="0.3" cy="0.25" r="0.9"><stop offset="0" stop-color="#f3d58e"/><stop offset="0.4" stop-color="#b08840"/><stop offset="1" stop-color="#2a1c0a"/></radialGradient>` +
    `<filter id="blur2" filterUnits="userSpaceOnUse" x="-100" y="-120" width="200" height="220"><feGaussianBlur stdDeviation="2"/></filter>` +
    `<filter id="blur5" filterUnits="userSpaceOnUse" x="-100" y="-120" width="200" height="220"><feGaussianBlur stdDeviation="5"/></filter>`
  );
}

function riftClockRing() {
  const R = 58;
  let ticks = "";
  let bars = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const r0 = major ? R - 7 : R - 3;
    ticks += `M${f(Math.cos(a) * r0)} ${f(-10 + Math.sin(a) * r0)}L${f(Math.cos(a) * R)} ${f(-10 + Math.sin(a) * R)}`;
    if (major) {
      const r1 = R + 4;
      const r2 = R + 9;
      bars += `M${f(Math.cos(a - 0.03) * r1)} ${f(-10 + Math.sin(a - 0.03) * r1)}L${f(Math.cos(a - 0.03) * r2)} ${f(-10 + Math.sin(a - 0.03) * r2)}` +
        `M${f(Math.cos(a + 0.03) * r1)} ${f(-10 + Math.sin(a + 0.03) * r1)}L${f(Math.cos(a + 0.03) * r2)} ${f(-10 + Math.sin(a + 0.03) * r2)}`;
    }
  }
  const m =
    `<circle cx="0" cy="-10" r="${R}" fill="none" stroke="#7fe6ff" stroke-width="0.8"/>` +
    `<circle cx="0" cy="-10" r="${R + 11}" fill="none" stroke="#9b6cff" stroke-width="0.6" stroke-dasharray="18 4 3 4"/>` +
    `<path d="${ticks}" stroke="#aef4ff" stroke-width="0.8"/>` +
    `<path d="${bars}" stroke="#c9b0ff" stroke-width="1.1"/>`;
  return `<g filter="url(#blur2)" opacity="0.8">${m}</g>${m}`;
}

function riftSwirl() {
  let arms = "";
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI * 2;
    let d = "";
    for (let s = 0; s <= 16; s++) {
      const u = s / 16;
      const a = a0 + u * 3.4;
      const r = 2 + u * 18;
      d += `${s ? "L" : "M"}${f(Math.cos(a) * r)} ${f(-10 + Math.sin(a) * r * 1.35)}`;
    }
    arms += `<path d="${d}" fill="none" stroke="${i % 2 ? "#b58cff" : "#8ff4ff"}" stroke-width="${i % 2 ? 1.4 : 2}" stroke-linecap="round"/>`;
  }
  const hands =
    `<path d="M-1.2 -10L0 -34L1.2 -10Z" fill="#f2ffff"/><path d="M-1.6 -10L14 -18L-0.4 -7Z" fill="#f2ffff"/>` +
    `<circle cx="0" cy="-10" r="2" fill="#fff"/>`;
  return `<g filter="url(#blur2)">${arms}</g>${arms}${hands}`;
}

function riftTear() {
  const rnd = rng(19);
  let stars = "";
  for (let i = 0; i < 26; i++) {
    const x = (rnd() - 0.5) * 40;
    const y = -80 + rnd() * 130;
    stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.3 + rnd() * 0.7)}" fill="#fff" opacity="${f(0.4 + rnd() * 0.6)}"/>`;
  }
  return (
    `<defs><clipPath id="tc"><path d="${tearPath()}"/></clipPath></defs>` +
    `<path d="${tearPath(1.35)}" fill="#030208" opacity="0.55" filter="url(#blur2)"/>` +
    `<path d="${tearPath()}" fill="url(#voidG)" stroke="#04060b" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<g clip-path="url(#tc)">${stars}</g>`
  );
}

function riftCracks() {
  const rnd = rng(5);
  const pts = [...TEAR_L.slice(1, -1), ...TEAR_R.slice(1, -1)];
  let d = "";
  pts.forEach(([x, y], i) => {
    if (i % 3 === 1) return;
    const dir = x < 0 ? -1 : 1;
    let cx = x;
    let cy = y;
    const n = 1 + Math.floor(rnd() * 3);
    d += `M${cx} ${cy}`;
    for (let s = 0; s < n; s++) {
      cx += dir * (5 + rnd() * 9);
      cy += (rnd() - 0.5) * 14;
      d += `L${f(cx)} ${f(cy)}`;
    }
    if (rnd() > 0.5) d += `M${f(cx - dir * 4)} ${f(cy)}L${f(cx + dir * 3)} ${f(cy + (rnd() - 0.5) * 16)}`;
  });
  const edge = `<path d="${tearPath()}" fill="none" stroke="#dffcff" stroke-width="1.3" stroke-linejoin="round"/>`;
  const lines = `<path d="${d}" fill="none" stroke="#7fe8ff" stroke-width="0.6" stroke-linejoin="round" opacity="0.85"/>`;
  return `<g filter="url(#blur5)"><path d="${tearPath()}" fill="none" stroke="#3ad6ff" stroke-width="5"/></g>` +
    `<g filter="url(#blur2)">${lines}</g>${lines}${edge}`;
}

function riftDebris(seed, count) {
  const rnd = rng(seed);
  let m = "";
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 38 + rnd() * 30;
    const x = f(Math.cos(a) * r);
    const y = f(-10 + Math.sin(a) * r * 1.1);
    const rot = f(rnd() * 360);
    const s = f(0.6 + rnd() * 0.8);
    const kind = i % 3;
    let shape;
    if (kind === 0) {
      shape = `<path d="M-5 -3L4 -6L6 3L-1 5Z" fill="url(#glass)" stroke="#04060b" stroke-width="0.6"/><path d="M-5 -3L4 -6" stroke="#bff6ff" stroke-width="0.6"/>`;
    } else if (kind === 1) {
      shape = `<path d="${gearPath(0, 0, 5, 4, 8)}" fill="url(#brassR)" stroke="#04060b" stroke-width="0.5"/><path d="M-5 0L5 0L0 -5Z" fill="#05040a" opacity="0.7"/>`;
    } else {
      shape = `<path d="M-0.8 4L0 -8L0.8 4Z" fill="#dce6f0" stroke="#04060b" stroke-width="0.4"/><circle cx="0" cy="-4.5" r="1.2" fill="none" stroke="#dce6f0" stroke-width="0.5"/>`;
    }
    m += `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${shape}</g>`;
  }
  return m;
}

const RS = (m) => `<g transform="scale(1.3)">${m}</g>`;

export const MODELS = {
  /** Paradox Lord, first form: armored clockwork titan with a cyan clock-core, horned crown of clocks and a turning hour ring. */
  villain: paradoxLord(1),

  /** Paradox Lord, second form: crimson, armor cracked with leaking light, second horn pair, open maw, shattered halo, shards. */
  villain_form2: paradoxLord(2),

  /** Paradox Lord, final form: violet and silver, orbiting halo of broken clock faces, radiant rays, third eye, tall crown. */
  villain_final: paradoxLord(3),

  /** Space-time rift: a jagged luminous tear with a clock vortex inside, a turning dial ring and drifting debris. */
  rift: {
    box: [-104, -126, 208, 222],
    defs: riftDefs(),
    layers: [
      { markup: RS(`<ellipse cx="0" cy="-10" rx="80" ry="85" fill="url(#bloom)"/>`), anim: { type: "pulse", min: 0.6, max: 1, speed: 2.4 }, blend: "lighter" },
      { markup: RS(riftClockRing()), anim: { type: "spin", speed: 0.2, pivot: [0, -13] }, blend: "lighter", opacity: 0.75 },
      { markup: RS(riftTear()) },
      { markup: RS(`<g opacity="0.95">${riftSwirl()}</g>`), anim: { type: "spin", speed: -1.4, pivot: [0, -13] }, blend: "lighter" },
      { markup: RS(riftCracks()), anim: { type: "flicker", min: 0.55, max: 1, speed: 1.8 }, blend: "lighter" },
      { markup: RS(riftDebris(11, 7)), anim: { type: "float", amp: 4, speed: 1.1 } },
      { markup: RS(riftDebris(23, 6)), anim: { type: "drift", amp: 4, speed: 0.8, phase: 1 } },
    ],
  },
};
