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
      <filter id="bigGlow">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00ffcc" stop-opacity="0.6">
          <animate attributeName="stop-opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stop-color="#4400ff" stop-opacity="0.3">
          <animate attributeName="stop-opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stop-color="#ff0088" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="clockFace" cx="50%" cy="50%" r="48%">
        <stop offset="0%" stop-color="#1a1a3a" />
        <stop offset="80%" stop-color="#0a0a20" />
        <stop offset="100%" stop-color="#050510" />
      </radialGradient>
    </defs>
  <!-- Portal -->
  <!-- Outer portal corona -->
  <ellipse
    cx="350"
    cy="195"
    rx="170"
    ry="170"
    fill="none"
    stroke="#ff0088"
    stroke-width="2"
    opacity="0.15"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="165;175;165"
      dur="5s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="165;175;165"
      dur="5s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      values="0.1;0.25;0.1"
      dur="5s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Portal Glow -->
  <ellipse
    cx="350"
    cy="195"
    rx="140"
    ry="140"
    fill="url(#portalGlow)"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="130;148;130"
      dur="4s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="130;148;130"
      dur="4s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Portal Core -->
  <ellipse
    cx="350"
    cy="195"
    rx="85"
    ry="85"
    fill="#00ffcc"
    opacity="0.06"
    filter="url(#bigGlow)"
  >
    <animate
      attributeName="rx"
      values="80;92;80"
      dur="3s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="ry"
      values="80;92;80"
      dur="3s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      values="0.04;0.1;0.04"
      dur="3s"
      repeatCount="indefinite"
    />
  </ellipse>

  <!-- Fracture Lines -->
  <g opacity="0.4" filter="url(#glow)">
    <line
      x1="350"
      y1="195"
      x2="200"
      y2="80"
      stroke="#00ffcc"
      stroke-width="0.8"
      opacity="0.3"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.5;0.1"
        dur="2.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="500"
      y2="70"
      stroke="#4400ff"
      stroke-width="0.6"
      opacity="0.25"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.4;0.05"
        dur="3.2s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="180"
      y2="320"
      stroke="#ff0088"
      stroke-width="0.7"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.35;0.1"
        dur="2.8s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="530"
      y2="310"
      stroke="#00ffcc"
      stroke-width="0.5"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.3;0.05"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="140"
      y2="195"
      stroke="#8866ff"
      stroke-width="0.6"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.1;0.4;0.1"
        dur="2.1s"
        repeatCount="indefinite"
      />
    </line>
    <line
      x1="350"
      y1="195"
      x2="560"
      y2="180"
      stroke="#ff4466"
      stroke-width="0.5"
      opacity="0.2"
    >
      <animate
        attributeName="opacity"
        values="0.05;0.35;0.05"
        dur="2.9s"
        repeatCount="indefinite"
      />
    </line>
  </g>

  <!-- Energy Rings -->
  <g filter="url(#glow)">
    <ellipse
      cx="350"
      cy="195"
      rx="120"
      ry="120"
      fill="none"
      stroke="#00ffcc"
      stroke-width="1"
      opacity="0.4"
    >
      <animate
        attributeName="rx"
        values="115;128;115"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="ry"
        values="115;128;115"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.3;0.6;0.3"
        dur="3s"
        repeatCount="indefinite"
      />
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195"
        dur="20s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="350"
      cy="195"
      rx="160"
      ry="100"
      fill="none"
      stroke="#4400ff"
      stroke-width="0.8"
      opacity="0.35"
      stroke-dasharray="8,12"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;-360 350 195"
        dur="25s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.25;0.5;0.25"
        dur="4s"
        repeatCount="indefinite"
      />
    </ellipse>
    <ellipse
      cx="350"
      cy="195"
      rx="100"
      ry="155"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.6"
      opacity="0.3"
      stroke-dasharray="4,16"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195"
        dur="30s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.2;0.4;0.2"
        dur="3.5s"
        repeatCount="indefinite"
      />
    </ellipse>
    <!-- Ring Pulse -->
    <circle
      cx="350"
      cy="195"
      r="75"
      fill="none"
      stroke="#00ffcc"
      stroke-width="0.5"
      opacity="0"
    >
      <animate
        attributeName="r"
        values="75;160"
        dur="3s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.4;0"
        dur="3s"
        repeatCount="indefinite"
      />
    </circle>
    <circle
      cx="350"
      cy="195"
      r="75"
      fill="none"
      stroke="#ff0088"
      stroke-width="0.4"
      opacity="0"
    >
      <animate
        attributeName="r"
        values="75;160"
        dur="3s"
        begin="1.5s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0.3;0"
        dur="3s"
        begin="1.5s"
        repeatCount="indefinite"
      />
    </circle>
  </g>

  <!-- Broken Clock -->
  <g filter="url(#glow)">
    <!-- Clock body -->
    <circle
      cx="350"
      cy="195"
      r="70"
      fill="url(#clockFace)"
      stroke="#334466"
      stroke-width="2"
    />
    <circle
      cx="350"
      cy="195"
      r="68"
      fill="none"
      stroke="#00aacc"
      stroke-width="0.5"
      opacity="0.4"
    />

    <!-- Hour markers -->
    <g stroke="#446688" stroke-width="2" opacity="0.7">
      <line x1="350" y1="130" x2="350" y2="140" />
      <line x1="350" y1="250" x2="350" y2="260" />
      <line x1="283" y1="195" x2="293" y2="195" />
      <line x1="407" y1="195" x2="417" y2="195" />
      <!-- Diagonal markers -->
      <line x1="315" y1="143" x2="320" y2="151" opacity="0.5" />
      <line x1="385" y1="143" x2="380" y2="151" opacity="0.5" />
      <line x1="315" y1="247" x2="320" y2="239" opacity="0.5" />
      <line x1="385" y1="247" x2="380" y2="239" opacity="0.5" />
    </g>

    <!-- Clock Hands -->
    <!-- Hour Hand -->
    <line
      x1="350"
      y1="195"
      x2="350"
      y2="155"
      stroke="#00ffcc"
      stroke-width="2.5"
      stroke-linecap="round"
      filter="url(#glow)"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;30 350 195;25 350 195;30 350 195;0 350 195"
        dur="8s"
        repeatCount="indefinite"
      />
    </line>
    <!-- Minute Hand -->
    <line
      x1="350"
      y1="195"
      x2="390"
      y2="175"
      stroke="#ff4466"
      stroke-width="1.8"
      stroke-linecap="round"
      filter="url(#glow)"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;360 350 195;340 350 195;720 350 195"
        dur="6s"
        repeatCount="indefinite"
      />
    </line>
    <!-- Second Hand -->
    <line
      x1="350"
      y1="195"
      x2="350"
      y2="140"
      stroke="#ffaa00"
      stroke-width="0.8"
      stroke-linecap="round"
      opacity="0.7"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 350 195;180 350 195;90 350 195;360 350 195;270 350 195;360 350 195"
        dur="3s"
        repeatCount="indefinite"
      />
    </line>

    <!-- Center pin -->
    <circle cx="350" cy="195" r="4" fill="#00ffcc" filter="url(#glow)">
      <animate
        attributeName="r"
        values="3;5;3"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>

    <!-- Crack in the Clock Face -->
    <g opacity="0.8">
      <!-- Main Crack (Top-Right Diagonal) -->
      <line
        x1="355"
        y1="180"
        x2="375"
        y2="155"
        stroke="#00ddcc"
        stroke-width="1.5"
      />
      <line
        x1="375"
        y1="155"
        x2="390"
        y2="140"
        stroke="#00ddcc"
        stroke-width="1.2"
      />
      <line
        x1="390"
        y1="140"
        x2="395"
        y2="132"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Branch Right -->
      <line
        x1="375"
        y1="155"
        x2="395"
        y2="152"
        stroke="#00ddcc"
        stroke-width="1"
      />
      <line
        x1="395"
        y1="152"
        x2="408"
        y2="158"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Branch Upper Left -->
      <line
        x1="375"
        y1="155"
        x2="365"
        y2="140"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Bottom Left Crack -->
      <line
        x1="355"
        y1="180"
        x2="340"
        y2="200"
        stroke="#00ddcc"
        stroke-width="1.3"
      />
      <line
        x1="340"
        y1="200"
        x2="330"
        y2="218"
        stroke="#00ddcc"
        stroke-width="1"
      />
      <line
        x1="330"
        y1="218"
        x2="325"
        y2="230"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Branch Lower Left -->
      <line
        x1="340"
        y1="200"
        x2="325"
        y2="195"
        stroke="#00ddcc"
        stroke-width="0.8"
      />
      <!-- Branch Lower Right -->
      <line
        x1="340"
        y1="200"
        x2="350"
        y2="215"
        stroke="#00ddcc"
        stroke-width="0.7"
      />
      <!-- Small Crack - Center Right -->
      <line
        x1="355"
        y1="180"
        x2="368"
        y2="185"
        stroke="#00ddcc"
        stroke-width="0.9"
      />
      <line
        x1="368"
        y1="185"
        x2="380"
        y2="192"
        stroke="#00ddcc"
        stroke-width="0.6"
      />
      <!-- Small Crack - Center Left -->
      <line
        x1="355"
        y1="180"
        x2="342"
        y2="172"
        stroke="#00ddcc"
        stroke-width="0.7"
      />

      <!-- Glow Effect -->
      <line
        x1="355"
        y1="180"
        x2="375"
        y2="155"
        stroke="#00ffdd"
        stroke-width="4"
        opacity="0.25"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="opacity"
          values="0.15;0.4;0.15"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </line>
      <line
        x1="355"
        y1="180"
        x2="340"
        y2="200"
        stroke="#00ffdd"
        stroke-width="4"
        opacity="0.2"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="opacity"
          values="0.1;0.35;0.1"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </line>
      <!-- Energy Leak -->
      <circle
        cx="355"
        cy="180"
        r="5"
        fill="#00ffcc"
        opacity="0.12"
        filter="url(#bigGlow)"
      >
        <animate
          attributeName="r"
          values="4;8;4"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.08;0.2;0.08"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  </g>
  </svg>
`;

// ---------------------------------------------------------------------------
// Modern art: a brass pocket-watch dial torn loose in a temporal portal.
// Same centre (350, 195) and ~70-unit dial as the legacy clock above.
// ---------------------------------------------------------------------------

const INK = "#04060b";
const f = (n) => Math.round(n * 10) / 10;
const polar = (r, deg) => [f(Math.cos((deg - 90) * (Math.PI / 180)) * r), f(Math.sin((deg - 90) * (Math.PI / 180)) * r)];

/** Deterministic PRNG so sparks and shards never shift between loads. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const CLOCK_DEFS = `
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffe7a8"/><stop offset=".22" stop-color="#d6a64e"/>
  <stop offset=".55" stop-color="#8a5c20"/><stop offset=".85" stop-color="#3f2608"/>
  <stop offset="1" stop-color="#1e1204"/></linearGradient>
<linearGradient id="brassDk" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#b8863c"/><stop offset=".5" stop-color="#5e3c12"/>
  <stop offset="1" stop-color="#1a0f03"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2=".4">
  <stop offset="0" stop-color="#c4d6e6"/><stop offset=".25" stop-color="#6f8aa3"/>
  <stop offset=".6" stop-color="#2f4052"/><stop offset="1" stop-color="#0e141c"/></linearGradient>
<radialGradient id="face" cx=".38" cy=".32" r=".8">
  <stop offset="0" stop-color="#20314f"/><stop offset=".45" stop-color="#101a33"/>
  <stop offset="1" stop-color="#04060f"/></radialGradient>
<radialGradient id="portal">
  <stop offset="0" stop-color="#e8ffff" stop-opacity=".95"/><stop offset=".42" stop-color="#6ff0ff" stop-opacity=".7"/>
  <stop offset=".58" stop-color="#2b86ff" stop-opacity=".38"/><stop offset=".78" stop-color="#8b4dff" stop-opacity=".16"/>
  <stop offset="1" stop-color="#8b4dff" stop-opacity="0"/></radialGradient>
<radialGradient id="shadow"><stop offset=".7" stop-color="#000" stop-opacity=".8"/>
  <stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<linearGradient id="sheen" x1="0" y1="0" x2=".6" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".45" stop-color="#fff" stop-opacity=".05"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="crimson" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#ff6a7c"/><stop offset="1" stop-color="#b3102a"/></linearGradient>
<filter id="b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="b3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="b8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>`;

/** Blurred bloom copy under a crisp copy. */
const glowCopy = (m, id = "b1") => `<g filter="url(#${id})">${m}</g>${m}`;

function gearPath(cx, cy, ro, ri, teeth, hole) {
  const step = (Math.PI * 2) / teeth;
  const p = (r, a) => `${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    d += `${i ? "L" : "M"}${p(ri, a - step * 0.3)}L${p(ro, a - step * 0.16)}L${p(ro, a + step * 0.16)}L${p(ri, a + step * 0.3)}`;
  }
  d += `ZM${f(cx + hole)} ${f(cy)}A${hole} ${hole} 0 1 0 ${f(cx - hole)} ${f(cy)}A${hole} ${hole} 0 1 0 ${f(cx + hole)} ${f(cy)}Z`;
  return d;
}

/** Spoked brass gear with lit rim and ink outline. */
function gear(cx, cy, r, teeth, spokes) {
  const ri = r * 0.84;
  const rim = r * 0.64;
  let cut = "";
  for (let i = 0; i < spokes; i++) {
    const a0 = (i / spokes) * 360 + 360 / spokes / 2;
    const span = 360 / spokes - 18;
    const [x0, y0] = polar(rim, a0 - span / 2);
    const [x1, y1] = polar(rim, a0 + span / 2);
    const [x2, y2] = polar(r * 0.26, a0 + span / 2 - 6);
    const [x3, y3] = polar(r * 0.26, a0 - span / 2 + 6);
    cut += `M${f(cx + x0)} ${f(cy + y0)}A${f(rim)} ${f(rim)} 0 0 1 ${f(cx + x1)} ${f(cy + y1)}L${f(cx + x2)} ${f(cy + y2)}L${f(cx + x3)} ${f(cy + y3)}Z`;
  }
  return (
    `<path d="${gearPath(cx, cy, r, ri, teeth, r * 0.1)}" fill="url(#brassDk)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round" fill-rule="evenodd"/>` +
    `<path d="${cut}" fill="#07060a" stroke="${INK}" stroke-width=".7" opacity=".92"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${f(ri - 1.5)}" fill="none" stroke="#f1c877" stroke-width=".7" stroke-dasharray="${f(ri * 1.2)} ${f(ri * 5)}" stroke-dashoffset="${f(ri * 2.3)}" opacity=".7"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.2)}" fill="url(#brass)" stroke="${INK}" stroke-width=".8"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.07)}" fill="#07060a"/>`
  );
}

/** Roman numeral as stroked glyph lines, centred at the origin, ~h tall. */
function numeral(text, h) {
  const w = h * 0.34;
  let x = 0;
  const glyphs = [];
  for (const ch of text) {
    if (ch === "I") {
      glyphs.push(`M${f(x)} ${f(-h / 2)}L${f(x)} ${f(h / 2)}`);
      x += w * 0.7;
    } else if (ch === "V") {
      glyphs.push(`M${f(x - w * 0.2)} ${f(-h / 2)}L${f(x + w / 2)} ${f(h / 2)}L${f(x + w * 1.2)} ${f(-h / 2)}`);
      x += w * 1.7;
    } else if (ch === "X") {
      glyphs.push(`M${f(x - w * 0.2)} ${f(-h / 2)}L${f(x + w * 1.2)} ${f(h / 2)}M${f(x + w * 1.2)} ${f(-h / 2)}L${f(x - w * 0.2)} ${f(h / 2)}`);
      x += w * 1.7;
    }
  }
  const shift = f(-(x - w * 0.7) / 2);
  return `<path transform="translate(${shift} 0)" d="${glyphs.join("")}"/>`;
}

const ROMAN = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

function portalLayers() {
  const rnd = rng(71);
  let arms = "";
  for (let i = 0; i < 7; i++) {
    const a0 = (i / 7) * Math.PI * 2 + rnd() * 0.4;
    let d = "";
    for (let s = 0; s <= 20; s++) {
      const u = s / 20;
      const a = a0 + u * 2.6;
      const r = 84 + u * 86;
      d += `${s ? "L" : "M"}${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)}`;
    }
    const c = i % 3 === 0 ? "#b58cff" : i % 3 === 1 ? "#6ff0ff" : "#ff5a9a";
    arms += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(1.2 + rnd() * 1.6)}" stroke-linecap="round" opacity="${f(0.45 + rnd() * 0.4)}"/>`;
  }
  const glow = `<circle r="176" fill="url(#portal)"/>`;
  const swirl = `<g filter="url(#b3)">${arms}</g>${arms}`;

  // Dial ring: minute ticks, numerals and a broken outer band.
  let ticks = "";
  for (let i = 0; i < 60; i++) {
    const long = i % 5 === 0;
    const [x0, y0] = polar(long ? 140 : 144, i * 6);
    const [x1, y1] = polar(150, i * 6);
    ticks += `M${x0} ${y0}L${x1} ${y1}`;
  }
  const nums = ROMAN.map((n, i) => {
    const [x, y] = polar(127, i * 30);
    return `<g transform="translate(${x} ${y}) rotate(${i * 30})">${numeral(n, 9)}</g>`;
  }).join("");
  const ring =
    `<circle r="152" fill="none" stroke="#9ff6ff" stroke-width=".9"/>` +
    `<circle r="160" fill="none" stroke="#b58cff" stroke-width="1.4" stroke-dasharray="70 9 6 9 120 14"/>` +
    `<path d="${ticks}" stroke="#bff8ff" stroke-width="1"/>` +
    `<g fill="none" stroke="#d6c4ff" stroke-width="1.3" stroke-linecap="round">${nums}</g>`;
  const inner =
    `<circle r="104" fill="none" stroke="#6ff0ff" stroke-width="1.6" stroke-dasharray="46 10 4 10" opacity=".8"/>` +
    `<circle r="112" fill="none" stroke="#ff5a9a" stroke-width=".6" stroke-dasharray="2 6" opacity=".7"/>`;
  return {
    glow,
    swirl,
    ring: glowCopy(ring, "b1"),
    inner: glowCopy(inner, "b1"),
  };
}

function dialBody() {
  // Knurled bezel edge and bolts
  let knurl = "";
  for (let i = 0; i < 72; i++) {
    const [x0, y0] = polar(77.5, i * 5);
    const [x1, y1] = polar(80.5, i * 5);
    knurl += `M${x0} ${y0}L${x1} ${y1}`;
  }
  let bolts = "";
  for (let i = 0; i < 8; i++) {
    const [x, y] = polar(73.8, 22.5 + i * 45);
    bolts +=
      `<circle cx="${x}" cy="${y}" r="1.9" fill="url(#steel)" stroke="${INK}" stroke-width=".6"/>` +
      `<circle cx="${f(x - 0.5)}" cy="${f(y - 0.6)}" r=".6" fill="#fff" opacity=".7"/>`;
  }
  let minutes = "";
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const [x0, y0] = polar(61, i * 6);
    const [x1, y1] = polar(65, i * 6);
    minutes += `M${x0} ${y0}L${x1} ${y1}`;
  }
  let markers = "";
  for (let i = 0; i < 12; i++) {
    const tall = i % 3 === 0;
    const len = tall ? 13 : 9;
    const w = tall ? 2.6 : 1.8;
    markers +=
      `<g transform="rotate(${i * 30})">` +
      `<path d="M${-w} -65 L${w} -65 L${f(w * 0.45)} ${-65 + len} L${f(-w * 0.45)} ${-65 + len} Z" fill="url(#steel)" stroke="${INK}" stroke-width=".6"/>` +
      (i === 0 ? `<path d="M-6.4 -65 L-4 -65 L-4.8 -54 L-5.8 -54 Z M6.4 -65 L4 -65 L4.8 -54 L5.8 -54 Z" fill="url(#steel)" stroke="${INK}" stroke-width=".5"/>` : "") +
      `</g>`;
  }
  const nums = ROMAN.map((n, i) => {
    if (i % 3 !== 0) return "";
    const [x, y] = polar(42, i * 30);
    return `<g transform="translate(${x} ${y})">${numeral(n, 8.5)}</g>`;
  }).join("");
  // Crown and bow of the pocket watch
  const crown =
    `<path d="M-5 -79 L5 -79 L4.2 -88 L-4.2 -88 Z" fill="url(#brassDk)" stroke="${INK}" stroke-width="1"/>` +
    `<rect x="-8.5" y="-99" width="17" height="11.5" rx="2.4" fill="url(#brass)" stroke="${INK}" stroke-width="1.1"/>` +
    `<path d="M-6 -97.6V-89 M-3 -98V-88.6 M0 -98V-88.6 M3 -98V-88.6 M6 -97.6V-89" stroke="${INK}" stroke-width=".55" opacity=".6"/>` +
    `<path d="M-7.2 -97 C-5 -98.2 -1 -98.4 1 -98.2" stroke="#fff4d0" stroke-width=".8" opacity=".8" fill="none"/>` +
    `<path d="M-15 -104 C-15 -122 15 -122 15 -104" fill="none" stroke="${INK}" stroke-width="7.4" stroke-linecap="round"/>` +
    `<path d="M-15 -104 C-15 -122 15 -122 15 -104" fill="none" stroke="url(#brass)" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M-13.2 -108 C-12 -117 -4 -118.6 2 -118" fill="none" stroke="#fff4d0" stroke-width="1" opacity=".75" stroke-linecap="round"/>`;
  // Cracks in the glass (ink); their glow sits on its own layer.
  const cracks =
    "M18 -40 L26 -30 L23 -21 L33 -12 L30 -2 L44 8 M26 -30 L38 -34 L47 -30 M23 -21 L12 -16 L6 -6 " +
    "M33 -12 L46 -16 M30 -2 L20 6 L22 18 M-30 30 L-22 22 L-26 12 L-14 6 M-22 22 L-34 18";
  return (
    `<circle r="96" fill="url(#shadow)" transform="translate(4 6)"/>` +
    crown +
    // bezel
    `<circle r="81" fill="url(#brass)" stroke="${INK}" stroke-width="1.5"/>` +
    `<path d="${knurl}" stroke="${INK}" stroke-width=".7" opacity=".55"/>` +
    `<circle r="75.5" fill="url(#brassDk)" stroke="${INK}" stroke-width="1"/>` +
    `<circle r="72" fill="none" stroke="#f3cf82" stroke-width=".6" opacity=".5"/>` +
    bolts +
    `<path d="M-66 -40 A77 77 0 0 1 -18 -76" fill="none" stroke="#fff6da" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>` +
    `<path d="M72 26 A77 77 0 0 1 28 72" fill="none" stroke="#ff2a4a" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>` +
    `<path d="M-74 22 A77 77 0 0 0 -52 58" fill="none" stroke="#22e6ff" stroke-width="1" stroke-linecap="round" opacity=".75"/>` +
    // face
    `<circle r="68.5" fill="url(#face)" stroke="${INK}" stroke-width="1.2"/>` +
    `<circle r="67" fill="none" stroke="#000" stroke-width="3" opacity=".45"/>` +
    `<circle r="57" fill="none" stroke="#6f8aa3" stroke-width=".5" opacity=".45"/>` +
    `<circle r="31" fill="none" stroke="#6f8aa3" stroke-width=".4" opacity=".35" stroke-dasharray="1.5 2.5"/>` +
    `<path d="${minutes}" stroke="#8fa8c0" stroke-width=".7" opacity=".7"/>` +
    markers +
    `<g fill="none" stroke="#c7a55e" stroke-width="1.1" stroke-linecap="round" opacity=".85">${nums}</g>` +
    // subdial
    `<circle cx="0" cy="26" r="12" fill="#060a16" stroke="#c7a55e" stroke-width=".8" opacity=".95"/>` +
    `<path d="M0 26 L0 17.5 M0 26 L6 29" stroke="#8fa8c0" stroke-width=".8" stroke-linecap="round"/>` +
    `<path d="${cracks}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`
  );
}

/** Hand pointing up from the centre (rotated by its layer animation). */
function hand(kind) {
  if (kind === "hour") {
    return (
      `<path d="M-2.6 6 L-3.2 -14 C-6.6 -18 -6.6 -24 -2.2 -28 L0 -38 L2.2 -28 C6.6 -24 6.6 -18 3.2 -14 L2.6 6 Z" fill="url(#steel)" stroke="${INK}" stroke-width="1"/>` +
      `<path d="M0 -30 C-3 -24 -3 -18 0 -15 C3 -18 3 -24 0 -30 Z" fill="#05131a"/>` +
      `<path d="M-1.8 2 L-2.2 -13" stroke="#fff" stroke-width=".6" opacity=".6"/>`
    );
  }
  if (kind === "minute") {
    return (
      `<path d="M-2 8 L-2.2 -40 L0 -58 L2.2 -40 L2 8 Z" fill="url(#steel)" stroke="${INK}" stroke-width=".9"/>` +
      `<path d="M0 -52 L0 -20" stroke="#22e6ff" stroke-width="1" opacity=".9"/>` +
      `<path d="M-1.2 4 L-1.4 -38" stroke="#fff" stroke-width=".5" opacity=".6"/>`
    );
  }
  return (
    `<path d="M-.8 16 L-.6 -62 L0 -64 L.6 -62 L.8 16 Z" fill="url(#crimson)" stroke="${INK}" stroke-width=".5"/>` +
    `<circle cx="0" cy="11" r="3" fill="url(#crimson)" stroke="${INK}" stroke-width=".6"/>`
  );
}

function crackGlow() {
  const cracks =
    "M18 -40 L26 -30 L23 -21 L33 -12 L30 -2 L44 8 M26 -30 L38 -34 L47 -30 M23 -21 L12 -16 L6 -6 " +
    "M33 -12 L46 -16 M30 -2 L20 6 L22 18 M-30 30 L-22 22 L-26 12 L-14 6 M-22 22 L-34 18";
  return (
    `<path d="${cracks}" fill="none" stroke="#22e6ff" stroke-width="4" filter="url(#b3)" opacity=".8"/>` +
    `<path d="${cracks}" fill="none" stroke="#bffcff" stroke-width=".7" stroke-linejoin="round"/>` +
    `<circle cx="30" cy="-10" r="12" fill="#22e6ff" filter="url(#b8)" opacity=".45"/>`
  );
}

function shards(seed, n) {
  const rnd = rng(seed);
  let m = "";
  for (let i = 0; i < n; i++) {
    const a = rnd() * 360;
    const r = 92 + rnd() * 70;
    const [x, y] = polar(r, a);
    const rot = f(rnd() * 360);
    const s = f(0.7 + rnd() * 0.9);
    const shape =
      i % 3 === 0
        ? `<path d="M-5 -3L4 -6L6 3L-1 5Z" fill="#1b3350" stroke="${INK}" stroke-width=".6" opacity=".9"/><path d="M-5 -3L4 -6" stroke="#bff6ff" stroke-width=".7"/>`
        : i % 3 === 1
          ? `<path d="${gearPath(0, 0, 5, 4, 8, 1.4)}" fill="url(#brassDk)" stroke="${INK}" stroke-width=".5" fill-rule="evenodd"/>`
          : `<path d="M-.8 5L0 -8L.8 5Z" fill="#dce6f0" stroke="${INK}" stroke-width=".4"/>`;
    m += `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${shape}</g>`;
  }
  return m;
}

function sparks(seed, n) {
  const rnd = rng(seed);
  let m = "";
  for (let i = 0; i < n; i++) {
    const [x, y] = polar(80 + rnd() * 95, rnd() * 360);
    const c = ["#bffcff", "#d6c4ff", "#ffd28a"][i % 3];
    m += `<circle cx="${x}" cy="${y}" r="${f(0.6 + rnd() * 1.1)}" fill="${c}"/>`;
  }
  return glowCopy(m, "b1");
}

const G = (cx, cy, m) => `<g transform="translate(${cx} ${cy})">${m}</g>`;

function modernClock() {
  const p = portalLayers();
  const box = [-180, -180, 360, 360];
  return {
    box,
    defs: CLOCK_DEFS,
    layers: [
      { markup: p.glow, anim: { type: "pulse", min: 0.7, max: 1, speed: 1.4 }, blend: "lighter" },
      { markup: p.swirl, anim: { type: "spin", speed: -0.32 }, blend: "lighter", opacity: 0.85 },
      { markup: p.ring, anim: { type: "spin", speed: 0.07 }, blend: "lighter", opacity: 0.75 },
      { markup: p.inner, anim: { type: "spin", speed: -0.18 }, blend: "lighter" },
      { markup: shards(9, 14), anim: { type: "float", amp: 4, speed: 0.9 } },
      { markup: gear(-78, -58, 34, 16, 5), anim: { type: "spin", speed: 0.4, pivot: [-78, -58] } },
      { markup: gear(82, 52, 28, 13, 4), anim: { type: "spin", speed: -0.49, pivot: [82, 52] } },
      { markup: gear(88, -34, 17, 10, 4), anim: { type: "spin", speed: 0.8, pivot: [88, -34] } },
      { markup: dialBody() },
      { markup: hand("hour"), anim: { type: "spin", speed: 0.1 } },
      { markup: hand("minute"), anim: { type: "spin", speed: -0.55 } },
      { markup: hand("second"), anim: { type: "spin", speed: 2.1 } },
      {
        markup:
          `<circle r="5.2" fill="url(#brass)" stroke="${INK}" stroke-width="1"/>` +
          `<circle r="2" fill="#22e6ff"/><circle cx="-.7" cy="-.7" r=".7" fill="#fff"/>` +
          `<path d="M-60 -34 A69 69 0 0 1 -10 -68 L-4 -52 A54 54 0 0 0 -46 -26 Z" fill="url(#sheen)"/>`,
      },
      { markup: crackGlow(), anim: { type: "flicker", min: 0.5, max: 1, speed: 1.3 }, blend: "lighter" },
      { markup: sparks(4, 26), anim: { type: "drift", amp: 5, speed: 0.7 }, blend: "lighter" },
      { markup: shards(33, 8), anim: { type: "float", amp: 6, speed: 0.6, phase: 2 } },
    ],
  };
}

/**
 * Modern (realistic) clock: the same pocket watch and portal, in aged brass and
 * steel under the key light, a glass crystal that reflects, and a portal that
 * reads as light in haze rather than drawn rings. Built on first use only.
 */
async function realClock() {
  const { realizeModel, sheen } = await import("../../src/rendering/svg-art/models/realistic.js");
  const src = modernClock();
  // Crystal: a broad soft reflection, a narrow window streak near the top-left
  // of the bezel, and the glass darkening toward its rim.
  const glass =
    `<defs><clipPath id="rgl"><circle r="68.5"/></clipPath>` +
    `<linearGradient id="rgr" x1="-60" y1="-60" x2="50" y2="60" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#e8eef2" stop-opacity=".16"/><stop offset=".42" stop-color="#e8eef2" stop-opacity=".03"/>` +
    `<stop offset=".6" stop-color="#e8eef2" stop-opacity="0"/><stop offset="1" stop-color="#e8eef2" stop-opacity=".07"/></linearGradient>` +
    `<radialGradient id="rgv"><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient></defs>` +
    `<g clip-path="url(#rgl)"><circle r="68.5" fill="url(#rgv)"/><circle r="68.5" fill="url(#rgr)"/>` +
    `<path d="M-52 -38 C-42 -54 -26 -63 -8 -65 L-7 -61 C-24 -59 -38 -51 -47 -35 Z" fill="#f4f7f9" opacity=".3"/>` +
    `<path d="M-57 -24 C-56 -29 -54 -33 -52 -36" stroke="#ffffff" stroke-width="1" stroke-opacity=".55" fill="none" stroke-linecap="round"/></g>`;
  const EMISSIVE = new Set([0, 1, 2, 3, 13, 14]);
  const model = realizeModel(src, {
    filters: { u: 1.27, spec: 0.6, grime: 0.28, seed: 21, light: "#fff2e0" },
    materials: {
      brass: sheen("brass", "#8a7045", "#e2d1a6", "#4a3a1f", "#18120a", 0.16, `x1="0" y1="0" x2="1" y2="1"`),
      brassDk: sheen("brassDk", "#5e4a2c", "#a8936a", "#302513", "#0f0b05", 0.18, `x1="0" y1="0" x2="1" y2="1"`),
      steel: sheen("steel", "#7a8288", "#d6dbde", "#3c4247", "#121416", 0.2, `x1="0" y1="0" x2="1" y2=".4"`),
      face:
        `<radialGradient id="face" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#2a3036"/>` +
        `<stop offset=".45" stop-color="#171b20"/><stop offset="1" stop-color="#07080a"/></radialGradient>`,
    },
    material: (l, i) => (EMISSIVE.has(i) ? "emissive" : i === 12 ? "plain" : "metal"),
    over: [{ markup: glass }],
  });
  // The portal's drawn rings recede into haze; its core light stays.
  for (const i of [1, 2, 3]) model.layers[i] = { ...model.layers[i], opacity: (model.layers[i].opacity ?? 1) * 0.55 };
  return model;
}

export class TitleClock extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this._unsubscribe ??= attachArtSwitch(
      this,
      template,
      async () => modelHtml("clock", modernClock(), { x: 350, y: 195 }),
      async () => modelHtml("clock-real", await realClock(), { x: 350, y: 195 }),
    );
  }

  disconnectedCallback() {
    this._unsubscribe?.();
    this._unsubscribe = null;
  }
}

customElements.define("title-clock", TitleClock);
