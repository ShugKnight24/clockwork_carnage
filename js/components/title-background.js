import { attachArtSwitch, modelHtml } from "./title-art-layers.js";

const template = document.createElement("template");
template.innerHTML = `
<style>
  :host {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  svg {
    width: 100%;
    height: 100%;
  }
</style>
<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glow-strong">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <radialGradient id="riftGlow" cx="50%" cy="52%" r="45%">
      <stop offset="0%" stop-color="#8844ff" stop-opacity="0.18" />
      <stop offset="40%" stop-color="#00ccff" stop-opacity="0.07" />
      <stop offset="100%" stop-color="#020210" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="groundGlow" cx="50%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#2a0a44" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#020210" stop-opacity="0" />
    </radialGradient>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="rgba(0,0,0,0.15)" />
    </pattern>
    <pattern id="circuitGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(0,200,255,0.03)" stroke-width="0.5"/>
    </pattern>
    <linearGradient id="stationMetal" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#182b38" />
      <stop offset="0.45" stop-color="#071018" />
      <stop offset="1" stop-color="#02050a" />
    </linearGradient>
    <linearGradient id="cyanRail" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#00ffd5" stop-opacity="0" />
      <stop offset="0.5" stop-color="#00ffd5" stop-opacity="0.85" />
      <stop offset="1" stop-color="#00ffd5" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Deep space background -->
  <rect width="700" height="400" fill="#020210" />

  <!-- Ground atmospheric glow -->
  <rect width="700" height="400" fill="url(#groundGlow)" />

  <!-- Circuit grid overlay (very subtle) -->
  <rect width="700" height="400" fill="url(#circuitGrid)" opacity="0.8" />

  <!-- Central temporal rift glow -->
  <rect width="700" height="400" fill="url(#riftGlow)" />

  <!-- Chronos Station silhouette: layered hangar plates and orbital gantry -->
  <g opacity="0.92">
    <path d="M40 330 C130 285 250 270 350 276 C470 284 590 286 668 330 L668 400 L40 400 Z" fill="url(#stationMetal)" />
    <path d="M72 344 C170 318 270 306 355 310 C456 314 555 318 630 346" fill="none" stroke="#25495a" stroke-width="18" opacity="0.55" />
    <path d="M92 340 C186 322 270 316 350 318 C445 320 535 324 612 342" fill="none" stroke="url(#cyanRail)" stroke-width="2.5" filter="url(#glow)" />
    <g opacity="0.45" stroke="#77ddff" stroke-width="0.8">
      <path d="M130 336 L170 304 L228 318 L272 296 L344 318 L424 298 L480 320 L548 304 L604 336" fill="none" />
      <path d="M168 345 L168 390 M250 326 L250 398 M350 318 L350 400 M452 326 L452 398 M548 344 L548 390" />
    </g>
    <g filter="url(#glow)" opacity="0.7">
      <rect x="124" y="350" width="32" height="3" fill="#00ffcc" />
      <rect x="222" y="336" width="46" height="3" fill="#00ccff" />
      <rect x="320" y="326" width="58" height="3" fill="#b366ff" />
      <rect x="444" y="338" width="42" height="3" fill="#00ffcc" />
      <rect x="542" y="354" width="34" height="3" fill="#ff44aa" />
    </g>
  </g>

  <!-- Temporal rift rings -->
  <g filter="url(#glow)" opacity="0.55">
    <circle cx="350" cy="210" r="140" fill="none" stroke="#8844ff" stroke-width="0.8">
      <animate attributeName="r" values="140;148;140" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.55;0.3;0.55" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="350" cy="210" r="105" fill="none" stroke="#00ccff" stroke-width="0.6">
      <animate attributeName="r" values="105;112;105" dur="5.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.5;0.25;0.5" dur="5.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="350" cy="210" r="68" fill="none" stroke="#ff44aa" stroke-width="0.5">
      <animate attributeName="r" values="68;74;68" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.4;0.15;0.4" dur="3s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Background Stars -->
  <g opacity="0.6">
    <circle cx="50" cy="30" r="1" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite" />
    </circle>
    <circle cx="150" cy="80" r="0.8" fill="#aaddff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.7s" repeatCount="indefinite" />
    </circle>
    <circle cx="600" cy="50" r="1.2" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="520" cy="120" r="0.7" fill="#ccddff">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.9s" repeatCount="indefinite" />
    </circle>
    <circle cx="80" cy="350" r="1" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.3s" repeatCount="indefinite" />
    </circle>
    <circle cx="650" cy="340" r="0.9" fill="#aaddff">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="200" cy="360" r="1.1" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.1s" repeatCount="indefinite" />
    </circle>
    <circle cx="400" cy="20" r="0.6" fill="#ccddff">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="300" cy="370" r="0.8" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="550" cy="380" r="1" fill="#aaddff">
      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.6s" repeatCount="indefinite" />
    </circle>
    <!-- Extra stars for depth -->
    <circle cx="470" cy="290" r="0.7" fill="#ffffff">
      <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3.4s" repeatCount="indefinite" />
    </circle>
    <circle cx="60" cy="150" r="0.9" fill="#ccddff">
      <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="640" cy="200" r="0.6" fill="#ffffff">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />
    </circle>
    <circle cx="120" cy="280" r="1" fill="#aaddff">
      <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.9s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Glitch Lines -->
  <g opacity="0.75">
    <rect x="0" y="95" width="700" height="1.5" fill="#00ffcc">
      <animate attributeName="y" values="95;97;95;200;95" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.9;0;0.9;0" dur="4s" repeatCount="indefinite" />
    </rect>
    <rect x="0" y="250" width="700" height="1" fill="#ff0088">
      <animate attributeName="y" values="250;248;310;250" dur="3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.2;0;0.15;0" dur="3s" repeatCount="indefinite" />
    </rect>
    <rect x="100" y="180" width="500" height="0.5" fill="#ffffff">
      <animate attributeName="y" values="180;182;100;180" dur="5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.1;0;0.2;0" dur="5s" repeatCount="indefinite" />
    </rect>
  </g>

  <!-- Floating temporal particles -->
  <g filter="url(#glow)">
    <circle cx="300" cy="180" r="1.5" fill="#00ffcc">
      <animate attributeName="cx" values="300;280;310;300" dur="5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="180;160;170;180" dur="5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.8;0;0.6;0" dur="5s" repeatCount="indefinite" />
    </circle>
    <circle cx="400" cy="210" r="1" fill="#ff4466">
      <animate attributeName="cx" values="400;420;390;400" dur="4s" repeatCount="indefinite" />
      <animate attributeName="cy" values="210;190;220;210" dur="4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.7;0;0.5;0" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="340" cy="230" r="1.2" fill="#ffaa00">
      <animate attributeName="cx" values="340;360;330;340" dur="6s" repeatCount="indefinite" />
      <animate attributeName="cy" values="230;210;240;230" dur="6s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="6s" repeatCount="indefinite" />
    </circle>
    <circle cx="370" cy="160" r="0.8" fill="#8866ff">
      <animate attributeName="cx" values="370;380;360;370" dur="3.5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="160;150;170;160" dur="3.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.6;0;0.4;0" dur="3.5s" repeatCount="indefinite" />
    </circle>
    <!-- Extra temporal sparks -->
    <circle cx="220" cy="240" r="0.9" fill="#00ccff">
      <animate attributeName="cx" values="220;230;215;220" dur="7s" repeatCount="indefinite" />
      <animate attributeName="cy" values="240;225;248;240" dur="7s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.5;0;0.3;0" dur="7s" repeatCount="indefinite" />
    </circle>
    <circle cx="480" cy="260" r="1.1" fill="#aa44ff">
      <animate attributeName="cx" values="480;495;470;480" dur="4.5s" repeatCount="indefinite" />
      <animate attributeName="cy" values="260;245;270;260" dur="4.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.65;0;0.4;0" dur="4.5s" repeatCount="indefinite" />
    </circle>
  </g>

  <!-- Scanline overlay -->
  <rect width="700" height="400" fill="url(#scanlines)" opacity="0.5" />
</svg>
`;

// ---------------------------------------------------------------------------
// Modern art: nebula sky over the Chronos Station skyline, with the duel deck in
// front — cyan light on the hero's side, crimson on the Paradox Lord's.
// ---------------------------------------------------------------------------

const INK = "#04060b";
const DECK = { cx: 350, cy: 334, rx: 346, ry: 56 };
const HORIZON = 292;
const f = (n) => Math.round(n * 10) / 10;

/** Deterministic PRNG so stars and windows never shift between loads. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const blur = (id, sd) =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

const BG_DEFS = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#020309"/><stop offset=".45" stop-color="#070b1c"/>
  <stop offset=".72" stop-color="#0d1128"/><stop offset="1" stop-color="#03040a"/></linearGradient>
<linearGradient id="tower" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#1a2536"/><stop offset=".35" stop-color="#0d1422"/>
  <stop offset="1" stop-color="#05080f"/></linearGradient>
<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#141a3a" stop-opacity="0"/><stop offset="1" stop-color="#1b1840" stop-opacity=".85"/></linearGradient>
<linearGradient id="deckTop" x1="0" y1="0" x2="1" y2=".3">
  <stop offset="0" stop-color="#2c3b4d"/><stop offset=".3" stop-color="#1a2433"/>
  <stop offset=".7" stop-color="#101723"/><stop offset="1" stop-color="#080b12"/></linearGradient>
<linearGradient id="deckSide" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#101824"/><stop offset="1" stop-color="#020306"/></linearGradient>
<linearGradient id="duel" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#22e6ff"/><stop offset=".42" stop-color="#22e6ff" stop-opacity=".15"/>
  <stop offset=".58" stop-color="#ff2a4a" stop-opacity=".15"/><stop offset="1" stop-color="#ff2a4a"/></linearGradient>
<radialGradient id="deckShade" cx=".5" cy=".42" r=".6">
  <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".25"/>
  <stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
<radialGradient id="riftSpill"><stop offset="0" stop-color="#bafcff" stop-opacity=".55"/>
  <stop offset=".35" stop-color="#5a7dff" stop-opacity=".3"/><stop offset="1" stop-color="#8b4dff" stop-opacity="0"/></radialGradient>
<radialGradient id="cyanSpill"><stop offset="0" stop-color="#22e6ff" stop-opacity=".5"/>
  <stop offset="1" stop-color="#22e6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="redSpill"><stop offset="0" stop-color="#ff2a4a" stop-opacity=".5"/>
  <stop offset="1" stop-color="#ff2a4a" stop-opacity="0"/></radialGradient>
<radialGradient id="star"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#cfe8ff" stop-opacity=".6"/>
  <stop offset="1" stop-color="#cfe8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="edgeFade" cx=".5" cy=".47" r=".56">
  <stop offset=".55" stop-color="#fff"/><stop offset=".85" stop-color="#fff" stop-opacity=".45"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="edge" maskContentUnits="userSpaceOnUse" x="0" y="0" width="700" height="400" maskUnits="userSpaceOnUse">
  <rect width="700" height="400" fill="url(#edgeFade)"/></mask>
${blur("b1", 1)}${blur("b3", 3)}${blur("b8", 8)}${blur("b18", 18)}`;

/** Point on the deck's top ellipse, scaled by k, at angle a (radians). */
const onDeck = (k, a) => [DECK.cx + Math.cos(a) * DECK.rx * k, DECK.cy + Math.sin(a) * DECK.ry * k];

function nebula() {
  return (
    `<g filter="url(#b18)">` +
    `<ellipse cx="150" cy="150" rx="190" ry="78" transform="rotate(-20 150 150)" fill="#0b5e78" opacity=".42"/>` +
    `<ellipse cx="110" cy="120" rx="90" ry="34" transform="rotate(-24 110 120)" fill="#1fb6d6" opacity=".22"/>` +
    `<ellipse cx="570" cy="128" rx="190" ry="84" transform="rotate(16 570 128)" fill="#7a1030" opacity=".46"/>` +
    `<ellipse cx="610" cy="96" rx="84" ry="32" transform="rotate(20 610 96)" fill="#e0305a" opacity=".2"/>` +
    `<ellipse cx="350" cy="96" rx="170" ry="58" fill="#3d1a7a" opacity=".38"/>` +
    `</g>` +
    `<g filter="url(#b8)" fill="#020309">` +
    `<path d="M-10 214 C90 180 170 196 260 168 C300 156 320 170 330 182 C250 206 150 206 -10 240 Z" opacity=".55"/>` +
    `<path d="M710 196 C620 176 530 194 450 164 C420 154 396 164 384 176 C460 204 560 214 710 226 Z" opacity=".55"/>` +
    `</g>`
  );
}

function starfield(rnd, n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = rnd() * 700;
    const y = rnd() * (HORIZON - 20);
    const r = 0.25 + rnd() ** 3 * 0.9;
    const c = ["#ffffff", "#c8d8ff", "#ffd8e0", "#c8f4ff"][Math.floor(rnd() * 4)];
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" opacity="${f(0.3 + rnd() * 0.6)}"/>`;
  }
  return s;
}

function glints(rnd, n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = f(rnd() * 700);
    const y = f(8 + rnd() * 220);
    const k = f(0.6 + rnd() * 0.9);
    s +=
      `<g transform="translate(${x} ${y}) scale(${k})">` +
      `<circle r="5" fill="url(#star)"/>` +
      `<path d="M0 -7 L.5 0 L0 7 L-.5 0 Z M-7 0 L0 .5 L7 0 L0 -.5 Z" fill="#eaf6ff" opacity=".85"/></g>`;
  }
  return s;
}

/** Station skyline: towers get a rim light in the colour of their side of the duel. */
function skyline(rnd) {
  let towers = "";
  let lights = "";
  let x = -6;
  while (x < 706) {
    const w = 12 + rnd() * 26;
    const edge = Math.min(1, Math.abs(x + w / 2 - 350) / 300);
    const h = 16 + rnd() * 30 + edge ** 1.6 * (60 + rnd() * 70);
    const top = HORIZON - h;
    const left = x + w / 2 < 350;
    const rim = left ? "#22e6ff" : "#ff2a4a";
    const cap = rnd();
    let d;
    if (cap < 0.3) {
      d = `M${f(x)} ${HORIZON} L${f(x)} ${f(top + 6)} L${f(x + w / 2)} ${f(top)} L${f(x + w)} ${f(top + 6)} L${f(x + w)} ${HORIZON} Z`;
    } else if (cap < 0.55) {
      d = `M${f(x)} ${HORIZON} L${f(x)} ${f(top + 8)} L${f(x + 4)} ${f(top + 8)} L${f(x + 4)} ${f(top)} L${f(x + w - 4)} ${f(top)} L${f(x + w - 4)} ${f(top + 8)} L${f(x + w)} ${f(top + 8)} L${f(x + w)} ${HORIZON} Z`;
    } else {
      d = `M${f(x)} ${HORIZON} L${f(x)} ${f(top)} L${f(x + w)} ${f(top)} L${f(x + w)} ${HORIZON} Z`;
    }
    towers += `<path d="${d}" fill="url(#tower)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    // Rim light along the lit side, facing the portal.
    const rx = left ? x + w - 0.8 : x + 0.8;
    towers += `<path d="M${f(rx)} ${f(top + (cap < 0.55 ? 8 : 1))} L${f(rx)} ${f(top + h * 0.55)}" stroke="${rim}" stroke-width=".7" opacity=".55"/>`;
    // Floor seams
    for (let yy = top + 12; yy < HORIZON - 4; yy += 9 + Math.floor(rnd() * 6)) {
      towers += `<path d="M${f(x + 1.5)} ${f(yy)} L${f(x + w - 1.5)} ${f(yy)}" stroke="${INK}" stroke-width=".5" opacity=".6"/>`;
      if (rnd() < 0.55) {
        const wx = x + 2.5 + rnd() * (w - 7);
        const c = rnd() < 0.18 ? "#ffae3a" : left ? "#7fe8ff" : "#ff7a8a";
        lights += `<rect x="${f(wx)}" y="${f(yy + 2.5)}" width="${f(2 + rnd() * 3)}" height="1.6" fill="${c}" opacity="${f(0.45 + rnd() * 0.5)}"/>`;
      }
    }
    if (h > 90 && rnd() < 0.7) {
      const ax = x + w / 2;
      towers += `<path d="M${f(ax)} ${f(top)} L${f(ax)} ${f(top - 14)}" stroke="${INK}" stroke-width="1.4"/><path d="M${f(ax)} ${f(top)} L${f(ax)} ${f(top - 14)}" stroke="#3a4d61" stroke-width=".5"/>`;
      lights += `<circle cx="${f(ax)}" cy="${f(top - 15)}" r="3.2" fill="#ff2a4a" filter="url(#b1)"/><circle cx="${f(ax)}" cy="${f(top - 15)}" r="1" fill="#ffd0d6"/>`;
    }
    x += w + (rnd() < 0.25 ? 4 + rnd() * 10 : 0);
  }
  return { towers, lights };
}

function deck() {
  const { cx, cy, rx, ry } = DECK;
  const side =
    `M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy} L${cx + rx} ${cy + 16} A${rx} ${ry} 0 0 1 ${cx - rx} ${cy + 16} Z`;
  let rings = "";
  [0.26, 0.5, 0.74].forEach((k) => {
    rings +=
      `<ellipse cx="${cx}" cy="${f(cy + 1)}" rx="${f(rx * k)}" ry="${f(ry * k)}" fill="none" stroke="#4d6378" stroke-width=".6" opacity=".45"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * k)}" ry="${f(ry * k)}" fill="none" stroke="${INK}" stroke-width="1" opacity=".85"/>`;
  });
  let seams = "";
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.08;
    const [x0, y0] = onDeck(0.26, a);
    const [x1, y1] = onDeck(0.985, a);
    seams += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
  }
  let studs = "";
  for (let i = 0; i < 36; i++) {
    const [x, y] = onDeck(0.88, (i / 36) * Math.PI * 2);
    studs += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="1.6" ry=".6" fill="#6f8aa3" opacity=".5"/>`;
  }
  let vents = "";
  for (let i = 0; i < 8; i++) {
    const [x, y] = onDeck(0.62, 0.35 + (i / 8) * Math.PI * 2);
    vents += `<path d="M${f(x - 7)} ${f(y - 1)} L${f(x + 7)} ${f(y - 1)} M${f(x - 6)} ${f(y + 1)} L${f(x + 6)} ${f(y + 1)}" stroke="${INK}" stroke-width=".9" opacity=".8"/>`;
  }
  return (
    `<ellipse cx="${cx}" cy="${cy + 22}" rx="${rx + 10}" ry="${ry + 10}" fill="#000" opacity=".6" filter="url(#b8)"/>` +
    `<path d="${side}" fill="url(#deckSide)" stroke="${INK}" stroke-width="1.2"/>` +
    `<path d="M${cx - rx + 8} ${cy + 22} A${rx} ${ry} 0 0 0 ${cx + rx - 8} ${cy + 22}" fill="none" stroke="url(#duel)" stroke-width="1.2" opacity=".55"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#deckTop)" stroke="${INK}" stroke-width="1.4"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#deckShade)"/>` +
    `<path d="${seams}" stroke="${INK}" stroke-width=".7" opacity=".55"/>` +
    rings +
    vents +
    studs +
    `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * 0.26 - 4)}" ry="${f(ry * 0.26 - 1)}" fill="#070a12" stroke="#4d6378" stroke-width=".5" opacity=".9"/>` +
    // lit rim on the far edge (key light) and duel-coloured front lip
    `<path d="M${cx - rx + 30} ${cy - 22} A${rx} ${ry} 0 0 1 ${cx - 40} ${cy - ry + 0.6}" fill="none" stroke="#dfe9f4" stroke-width=".9" opacity=".35"/>` +
    `<path d="M${cx - rx + 1} ${cy + 1} A${rx - 1} ${ry - 1} 0 0 0 ${cx + rx - 1} ${cy + 1}" fill="none" stroke="url(#duel)" stroke-width="1.1" opacity=".9"/>`
  );
}

function floorLight() {
  const { cx, cy, rx, ry } = DECK;
  const inlay = `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx * 0.5)}" ry="${f(ry * 0.5)}" fill="none" stroke="url(#duel)" stroke-width="1.4"/>`;
  return (
    `<ellipse cx="${cx}" cy="${cy - 4}" rx="190" ry="40" fill="url(#riftSpill)"/>` +
    `<ellipse cx="138" cy="${cy + 2}" rx="120" ry="24" fill="url(#cyanSpill)" opacity=".7"/>` +
    `<ellipse cx="566" cy="${cy + 2}" rx="130" ry="26" fill="url(#redSpill)" opacity=".75"/>` +
    `<g filter="url(#b3)">${inlay}</g>${inlay}` +
    `<ellipse cx="350" cy="${HORIZON - 6}" rx="300" ry="26" fill="#6a3cff" opacity=".22" filter="url(#b18)"/>`
  );
}

function fog() {
  return (
    `<g filter="url(#b18)">` +
    `<ellipse cx="170" cy="${HORIZON + 4}" rx="220" ry="14" fill="#23305a" opacity=".55"/>` +
    `<ellipse cx="540" cy="${HORIZON + 8}" rx="230" ry="16" fill="#3a1d4a" opacity=".55"/>` +
    `<ellipse cx="350" cy="372" rx="360" ry="18" fill="#0d1328" opacity=".7"/>` +
    `</g>`
  );
}

function motes(rnd, n) {
  let m = "";
  for (let i = 0; i < n; i++) {
    const x = rnd() * 700;
    const y = 120 + rnd() * 250;
    const c = x < 300 ? "#7fe8ff" : x > 400 ? "#ff7a8a" : "#c9b0ff";
    m += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + rnd() * 1.1)}" fill="${c}" opacity="${f(0.4 + rnd() * 0.6)}"/>`;
  }
  return `<g filter="url(#b1)">${m}</g>${m}`;
}

/** Faint horology ring turning behind the whole scene. */
function skyDial() {
  let ticks = "";
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r0 = i % 10 === 0 ? 176 : 184;
    ticks += `M${f(Math.cos(a) * r0)} ${f(Math.sin(a) * r0)}L${f(Math.cos(a) * 190)} ${f(Math.sin(a) * 190)}`;
  }
  return {
    box: [-200, -200, 400, 400],
    defs: "",
    layers: [
      {
        markup:
          `<g fill="none" stroke="#8fb4d8">` +
          `<circle r="192" stroke-width=".8" opacity=".35"/><circle r="170" stroke-width="2.4" opacity=".12" stroke-dasharray="120 20 8 20"/>` +
          `<path d="${ticks}" stroke-width=".8" opacity=".3"/></g>`,
        anim: { type: "spin", speed: 0.025 },
        opacity: 0.6,
      },
    ],
  };
}

/** Sky and skyline (behind the sky dial) and the deck with its light and haze (in front). */
function modernBackground() {
  const rnd = rng(2718);
  const city = skyline(rnd);
  const box = [0, 0, 700, 400];
  const sky = {
    box,
    defs: BG_DEFS,
    layers: [
      {
        // Feathered to transparent so the sky melts into the page gradient.
        markup:
          `<g mask="url(#edge)"><rect width="700" height="400" fill="url(#sky)"/>` +
          nebula() +
          starfield(rnd, 170) +
          `<rect y="232" width="700" height="${HORIZON - 232}" fill="url(#haze)"/>` +
          city.towers +
          `</g>`,
      },
      { markup: glints(rnd, 16), anim: { type: "pulse", min: 0.35, max: 1, speed: 1.1 }, blend: "lighter" },
      { markup: city.lights, anim: { type: "flicker", min: 0.55, max: 1, speed: 0.7 }, blend: "lighter" },
    ],
  };
  const ground = {
    box,
    defs: BG_DEFS,
    layers: [
      { markup: `<g mask="url(#edge)"><rect y="${HORIZON - 1}" width="700" height="${400 - HORIZON + 1}" fill="#05060d"/></g>` + deck() },
      { markup: floorLight(), anim: { type: "pulse", min: 0.7, max: 1, speed: 1.4 }, blend: "lighter" },
      { markup: fog(), anim: { type: "drift", amp: 16, speed: 0.22 } },
      { markup: motes(rnd, 46), anim: { type: "float", amp: 7, speed: 0.45 }, blend: "lighter" },
    ],
  };
  return { sky, ground };
}

export class TitleBackground extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this._unsubscribe ??= attachArtSwitch(this, template, async () => {
      const { sky, ground } = modernBackground();
      return (
        modelHtml("title-sky", sky) +
        modelHtml("title-dial", skyDial(), { x: 350, y: 195 }) +
        modelHtml("title-ground", ground)
      );
    });
  }

  disconnectedCallback() {
    this._unsubscribe?.();
    this._unsubscribe = null;
  }
}

customElements.define("title-background", TitleBackground);
