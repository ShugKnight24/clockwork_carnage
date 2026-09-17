/**
 * SVG cutscene backdrops: the Paradox Lord's lair, deep space, the reactor
 * chamber and the temporal rift. See ../index.js for the format.
 *
 * Every scene is a 1600×900 environment painting split into a few layers so
 * the light, particles and moving parts can animate without re-rasterising.
 * The bottom ~30% sits under the dialogue box, so each scene falls to a dark,
 * low-detail floor there, and the centre stays calm because characters are
 * drawn over it.
 */

const f = (n) => Math.round(n * 10) / 10;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const INK = "#04060b";
const BOX = [0, 0, 1600, 900];

/** Deterministic PRNG so stars and debris never shift between builds. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const polar = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
const pt = ([x, y]) => `${f(x)} ${f(y)}`;
const pathOf = (pts, close = false) => `M${pts.map(pt).join("L")}${close ? "Z" : ""}`;
const blur = (id, sd) =>
  `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const stops = (list) =>
  list.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");

/** Polyline from a to b with random perpendicular jitter (cracks, lightning). */
function jagged(rand, [x0, y0], [x1, y1], segs, amp) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [[x0, y0]];
  for (let i = 1; i < segs; i++) {
    const k = i / segs;
    const o = (rand() * 2 - 1) * amp;
    pts.push([x0 + dx * k + nx * o, y0 + dy * k + ny * o]);
  }
  pts.push([x1, y1]);
  return pts;
}

/** Point on a cubic bezier. */
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** Filled ribbon along a polyline, widest in the middle and pointed at both ends. */
function taper(pts, w, bias = 0.5) {
  const left = [];
  const right = [];
  const n = pts.length - 1;
  pts.forEach((p, i) => {
    const q = pts[Math.min(n, i + 1)];
    const o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const len = Math.hypot(dx, dy) || 1;
    const t = i / n;
    const hw = w * Math.sin(Math.PI * Math.min(1, t < bias ? (t / bias) * 0.5 : 0.5 + ((t - bias) / (1 - bias)) * 0.5)) ** 0.7;
    left.push([p[0] - (dy / len) * hw, p[1] + (dx / len) * hw]);
    right.push([p[0] + (dy / len) * hw, p[1] - (dx / len) * hw]);
  });
  return pathOf([...left, ...right.reverse()], true);
}

/** Circle as a path, for evenodd holes. */
const ringPath = (cx, cy, r) =>
  `M${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}Z`;

/** Arc stroke path between two angles (radians, clockwise). */
function arcPath(cx, cy, r, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${pt(polar(cx, cy, r, a0))}A${f(r)} ${f(r)} 0 ${large} 1 ${pt(polar(cx, cy, r, a1))}`;
}

/** Annular sector path. */
function sectorPath(cx, cy, r0, r1, a0, a1) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return (
    `M${pt(polar(cx, cy, r1, a0))}A${f(r1)} ${f(r1)} 0 ${large} 1 ${pt(polar(cx, cy, r1, a1))}` +
    `L${pt(polar(cx, cy, r0, a1))}A${f(r0)} ${f(r0)} 0 ${large} 0 ${pt(polar(cx, cy, r0, a0))}Z`
  );
}

/**
 * Gear outline with spoke windows cut out (fill-rule evenodd).
 * `broken` lists tooth indices snapped off; `spokes: 0` with `hole` makes a ring gear.
 */
function gearPath(cx, cy, R, teeth, depth, o = {}) {
  const { rim = 0.76, hub = 0.24, spokes = 6, spokeW = 0.06, broken = [], hole = 0 } = o;
  const step = TAU / teeth;
  const r0 = R - depth;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const top = broken.includes(i) ? r0 + depth * 0.2 : R;
    pts.push(polar(cx, cy, r0, a), polar(cx, cy, top, a + step * 0.18), polar(cx, cy, top, a + step * 0.44), polar(cx, cy, r0, a + step * 0.62));
  }
  let d = pathOf(pts, true);
  if (spokes) {
    const ri = R * rim;
    const rh = R * hub;
    const w = R * spokeW;
    const sw = TAU / spokes;
    for (let i = 0; i < spokes; i++) {
      const b = i * sw + 0.3;
      d +=
        `M${pt(polar(cx, cy, ri, b + w / ri))}A${f(ri)} ${f(ri)} 0 0 1 ${pt(polar(cx, cy, ri, b + sw - w / ri))}` +
        `L${pt(polar(cx, cy, rh, b + sw - w / rh))}A${f(rh)} ${f(rh)} 0 0 0 ${pt(polar(cx, cy, rh, b + w / rh))}Z`;
    }
  }
  if (hole) d += ringPath(cx, cy, hole);
  return d;
}

/** Shaded gear: body, inner rim bevel, hub, bolts and a lit upper-left edge. */
function gear(cx, cy, R, teeth, o = {}) {
  const { fill = "url(#bronze)", depth = R * 0.1, broken = [], spokes = 6, rim = "#b07a5a", accent = "#ff2a4a", sw = 2.5 } = o;
  const ri = R * 0.76;
  return (
    `<path d="${gearPath(cx, cy, R, teeth, depth, { broken, spokes })}" fill="${fill}" fill-rule="evenodd" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ri)}" fill="none" stroke="${INK}" stroke-width="${f(sw * 0.8)}" opacity=".7"/>` +
    `<path d="${arcPath(cx, cy, R - depth - sw, 190 * DEG, 260 * DEG)}" fill="none" stroke="${rim}" stroke-width="${f(sw * 0.7)}" opacity=".55"/>` +
    `<path d="${arcPath(cx, cy, R - depth * 0.4, -40 * DEG, 50 * DEG)}" fill="none" stroke="${accent}" stroke-width="${f(sw)}" opacity=".45"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.2)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * 0.07)}" fill="#07030a"/>`
  );
}

/** Spade clock hand pointing along +x, length len. */
const handPath = (len, w) =>
  `M${f(-len * 0.14)} 0L0 ${f(-w * 0.5)}L${f(len * 0.66)} ${f(-w * 0.32)}L${f(len * 0.76)} ${f(-w * 1.2)}L${f(len)} 0L${f(len * 0.76)} ${f(w * 1.2)}L${f(len * 0.66)} ${f(w * 0.32)}L0 ${f(w * 0.5)}Z`;

/**
 * Broken clock face: bezel, dial, ticks, spade hands, cracks and an optional
 * missing wedge (`missing: [a0, a1]` radians). `id` keeps clip ids unique.
 */
function clockFace(rand, id, cx, cy, r, o = {}) {
  const {
    face = "url(#dial)", bezel = "url(#bezel)", tick = "#d0a888", tickOp = 0.55,
    hands = [-2.5, -0.6], missing = null, cracks = 4, accent = "#ff2a4a", handFill = "#150a0e",
  } = o;
  const k = r / 100;
  let minor = "";
  let major = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    if (i % 5 === 0) major += `M${pt(polar(cx, cy, r * 0.62, a))}L${pt(polar(cx, cy, r * 0.8, a))}`;
    else minor += `M${pt(polar(cx, cy, r * 0.74, a))}L${pt(polar(cx, cy, r * 0.8, a))}`;
  }
  let body =
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${bezel}" stroke="${INK}" stroke-width="${f(2.6 * k)}"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.86)}" fill="${face}" stroke="${INK}" stroke-width="${f(1.8 * k)}"/>` +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.56)}" fill="none" stroke="${tick}" stroke-width="${f(0.8 * k)}" opacity="${tickOp * 0.5}"/>` +
    `<path d="${minor}" stroke="${tick}" stroke-width="${f(0.7 * k)}" opacity="${tickOp * 0.7}"/>` +
    `<path d="${major}" stroke="${tick}" stroke-width="${f(3.4 * k)}" opacity="${tickOp}"/>`;
  hands.forEach((a, i) => {
    body += `<path d="${handPath(r * (i ? 0.76 : 0.5), r * (i ? 0.05 : 0.08))}" transform="translate(${f(cx)} ${f(cy)}) rotate(${f(a / DEG)})" fill="${handFill}" stroke="${INK}" stroke-width="${f(1.2 * k)}"/>`;
  });
  body +=
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.07)}" fill="${tick}" opacity=".75" stroke="${INK}" stroke-width="${f(k)}"/>` +
    `<path d="${arcPath(cx, cy, r * 0.93, 195 * DEG, 255 * DEG)}" fill="none" stroke="#f0d0b0" stroke-width="${f(1.8 * k)}" opacity=".45"/>` +
    `<path d="${arcPath(cx, cy, r * 0.99, -35 * DEG, 55 * DEG)}" fill="none" stroke="${accent}" stroke-width="${f(2.2 * k)}" opacity=".6"/>` +
    `<ellipse cx="${f(cx - r * 0.3)}" cy="${f(cy - r * 0.35)}" rx="${f(r * 0.38)}" ry="${f(r * 0.2)}" transform="rotate(-35 ${f(cx - r * 0.3)} ${f(cy - r * 0.35)})" fill="#fff" opacity=".05"/>`;
  let crackD = "";
  for (let i = 0; i < cracks; i++) {
    const a = rand() * TAU;
    crackD += pathOf(jagged(rand, polar(cx, cy, r * (0.08 + rand() * 0.3), a), polar(cx, cy, r * 0.97, a + (rand() - 0.5) * 0.6), 5, r * 0.06));
  }
  body +=
    `<path d="${crackD}" fill="none" stroke="${INK}" stroke-width="${f(1.8 * k)}" stroke-linejoin="round" opacity=".9"/>` +
    `<path d="${crackD}" fill="none" stroke="${tick}" stroke-width="${f(0.5 * k)}" transform="translate(${f(0.9 * k)} ${f(0.9 * k)})" opacity=".3"/>`;
  if (!missing) return body;
  const [a0, a1] = missing;
  const inner = polar(cx, cy, r * 0.3, (a0 + a1) / 2);
  const poly = [
    ...jagged(rand, inner, polar(cx, cy, r * 1.05, a0), 5, r * 0.07),
    polar(cx, cy, r * 1.4, a0),
    polar(cx, cy, r * 1.4, a1),
    ...jagged(rand, polar(cx, cy, r * 1.05, a1), inner, 5, r * 0.07),
  ];
  const d = pathOf(poly, true);
  return (
    `<clipPath id="${id}"><path d="${ringPath(cx, cy, r + 4 * k)}${d}" clip-rule="evenodd"/></clipPath>` +
    `<clipPath id="${id}c"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/></clipPath>` +
    `<g clip-path="url(#${id})">${body}</g>` +
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(2.4 * k)}" stroke-linejoin="round" clip-path="url(#${id}c)"/>`
  );
}

/** Chain hanging on a quadratic sag between two points: alternating face/edge links. */
function chain(p0, p1, sag, link, o = {}) {
  const { color = "#241418", hi = "#8a5a50", w = link * 0.22 } = o;
  const c = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + sag * 2];
  const at = (t) => {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
  };
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 20; i++) {
    const q = at(i / 20);
    len += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    prev = q;
  }
  const n = Math.max(2, Math.round(len / (link * 0.78)));
  let faces = "";
  let edges = "";
  let hl = "";
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    const ang = f(Math.atan2(y2 - y, x2 - x) / DEG);
    if (i % 2) {
      edges += `M${pt(polar(x, y, link * 0.55, ang * DEG))}L${pt(polar(x, y, -link * 0.55, ang * DEG))}`;
    } else {
      faces += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(link * 0.55)}" ry="${f(link * 0.3)}" transform="rotate(${ang} ${f(x)} ${f(y)})"/>`;
      hl += `M${pt(polar(x, y - w * 0.4, link * 0.35, (ang - 12) * DEG))}L${pt(polar(x, y - w * 0.4, -link * 0.2, (ang - 12) * DEG))}`;
    }
  }
  return (
    `<g fill="none" stroke="${INK}" stroke-width="${f(w * 1.6)}">${faces}</g>` +
    `<g fill="none" stroke="${color}" stroke-width="${f(w)}">${faces}</g>` +
    `<path d="${edges}" stroke="${INK}" stroke-width="${f(w * 2.2)}" stroke-linecap="round"/>` +
    `<path d="${edges}" stroke="${color}" stroke-width="${f(w * 1.2)}" stroke-linecap="round"/>` +
    `<path d="${hl}" stroke="${hi}" stroke-width="${f(w * 0.45)}" stroke-linecap="round" opacity=".6"/>`
  );
}

/** Glowing particles (embers, dust) using a radial gradient fill; dimmer below fadeY. */
function particles(rand, n, [x0, y0, x1, y1], [rMin, rMax], grad, fadeY = 630) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + rand() * (x1 - x0);
    const y = y0 + rand() * (y1 - y0);
    const r = rMin + rand() ** 2 * (rMax - rMin);
    const a = (0.45 + rand() * 0.55) * (y > fadeY ? 0.35 : 1);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${grad})" opacity="${a.toFixed(2)}"/>`;
  }
  return s;
}

/** Irregular rock polygon. */
function rockPts(rand, cx, cy, r, n = 9, squash = 0.8, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const rr = r * (0.62 + rand() * 0.45);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash]);
  }
  return pts;
}

/** Rock with lit upper-left edge and an accent rim on the right. */
function rock(rand, cx, cy, r, o = {}) {
  const { fill = "url(#rockG)", hi = "#b8a4d8", rimC = "#ff4ad0", sw = 2 } = o;
  const pts = rockPts(rand, cx, cy, r, 8 + Math.floor(rand() * 4), 0.7 + rand() * 0.25, rand() * TAU);
  const n = pts.length;
  const lit = [];
  const rimPts = [];
  pts.forEach((p, i) => {
    const a = Math.atan2(p[1] - cy, p[0] - cx);
    if (a < -Math.PI * 0.35 || a > Math.PI * 0.9) lit.push(p);
    if (a > -Math.PI * 0.4 && a < Math.PI * 0.35) rimPts.push(p);
  });
  const facet = [pts[0], [cx + (rand() - 0.5) * r * 0.4, cy + (rand() - 0.5) * r * 0.3], pts[Math.floor(n / 2)]];
  return (
    `<path d="${pathOf(pts, true)}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<path d="${pathOf(facet)}" fill="none" stroke="${INK}" stroke-width="${f(sw * 0.5)}" opacity=".6"/>` +
    (lit.length > 1 ? `<path d="${pathOf(lit)}" fill="none" stroke="${hi}" stroke-width="${f(sw * 0.8)}" opacity=".5"/>` : "") +
    (rimPts.length > 1 ? `<path d="${pathOf(rimPts)}" fill="none" stroke="${rimC}" stroke-width="${f(sw)}" opacity=".75"/>` : "")
  );
}

// ---------------------------------------------------------------------------
// deep_space
// ---------------------------------------------------------------------------

/**
 * Deep space: a violet/teal nebula over a three-depth starfield, a dead planet
 * split open by a glowing fracture with a chunk drifting free, and a crack of
 * light torn across the sky. Stars drift in parallax, bright stars twinkle,
 * the fractures pulse.
 */
function deepSpace() {
  const rand = rng(1648);
  const PC = [1270, 230];
  const PR = 145;
  const chunkDir = -47 * DEG;
  const CH = polar(PC[0], PC[1], PR + 30, chunkDir);
  const blocked = (x, y) => Math.hypot(x - PC[0], y - PC[1]) < PR + 22 || Math.hypot(x - CH[0], y - CH[1]) < 95;

  const stars = (n, [r0, r1], [o0, o1], colors, glow = false) => {
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = rand() * 1600;
      const y = rand() * 900;
      if (blocked(x, y)) continue;
      const k = y > 640 ? 0.28 : y > 540 ? 0.6 : 1;
      const r = r0 + rand() ** 2 * (r1 - r0);
      const a = (o0 + rand() * (o1 - o0)) * k;
      const c = colors[Math.floor(rand() * colors.length)];
      if (glow && r > 1.3) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 3.4)}" fill="${c}" opacity="${(a * 0.16).toFixed(2)}"/>`;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" opacity="${a.toFixed(2)}"/>`;
    }
    return s;
  };

  // Planet fracture wedge (upper right of the disc) and the chunk that left it.
  const core = [PC[0] + 18, PC[1] - 10];
  const a0 = -78 * DEG;
  const a1 = -20 * DEG;
  const e1 = jagged(rand, core, polar(PC[0], PC[1], PR, a0), 7, 8);
  const arc = [];
  for (let a = a0 + 8 * DEG; a < a1 - 2 * DEG; a += 8 * DEG) arc.push(polar(PC[0], PC[1], PR, a));
  const e2 = jagged(rand, polar(PC[0], PC[1], PR, a1), core, 7, 8);
  const wedge = [...e1, ...arc, ...e2.slice(0, -1)];
  const wedgeD = pathOf(wedge, true);
  const faceD = pathOf(e1) + pathOf(e2);
  // Cross-section faces along both fracture edges, stepping into the wedge.
  const shift = (pts, a, d) => pts.map(([x, y]) => [x + Math.cos(a) * d, y + Math.sin(a) * d]);
  const faces =
    pathOf([...e1, ...shift(e1, a0 + Math.PI / 2, 20).reverse()], true) +
    pathOf([...e2, ...shift(e2, a1 - Math.PI / 2, 20).reverse()], true);
  const strata = pathOf(shift(e1, a0 + Math.PI / 2, 8)) + pathOf(shift(e2, a1 - Math.PI / 2, 8));
  const section =
    `<g clip-path="url(#dsWedge)">` +
    `<path d="${faces}" fill="url(#dsRock)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<path d="${strata}" fill="none" stroke="#7a3a8a" stroke-width="1.5" opacity=".6"/>` +
    `<path d="${faces}" fill="url(#dsCore)" opacity=".7"/>` +
    `</g>`;
  const cracks = [
    jagged(rand, core, polar(PC[0], PC[1], PR * 0.98, 150 * DEG), 9, 9),
    jagged(rand, core, polar(PC[0], PC[1], PR * 0.98, 95 * DEG), 8, 8),
    jagged(rand, [PC[0] - 30, PC[1] + 36], polar(PC[0], PC[1], PR * 0.97, 200 * DEG), 5, 7),
    jagged(rand, core, polar(PC[0], PC[1], PR * 0.95, 30 * DEG), 5, 6),
  ];
  const crackD = cracks.map((c) => pathOf(c)).join("");

  let craters = "";
  for (let i = 0; i < 16; i++) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * PR * 0.9;
    const [x, y] = polar(PC[0], PC[1], d, a);
    const r = 5 + rand() ** 2 * 20;
    const sq = 0.55 + 0.45 * (1 - d / PR);
    const rot = f(a / DEG + 90);
    craters +=
      `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * sq)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="#07051a" opacity=".45"/>` +
      `<ellipse cx="${f(x + r * 0.15)}" cy="${f(y + r * 0.15)}" rx="${f(r)}" ry="${f(r * sq)}" transform="rotate(${rot} ${f(x)} ${f(y)})" fill="none" stroke="#b8a8e0" stroke-width="1.2" opacity=".18"/>`;
  }

  // Shattered sky, upper left: an impact point with radial and ring cracks,
  // a few panes knocked out showing light behind, and the panes drifting away.
  const IC = [270, 170];
  const at = (r, a) => polar(IC[0], IC[1], r, a);
  const radA = Array.from({ length: 10 }, (_, i) => (i / 10) * TAU + (rand() - 0.5) * 0.35);
  let crackSky = "";
  radA.forEach((a) => {
    crackSky += pathOf(jagged(rand, at(4, a), at(110 + rand() * 150, a + (rand() - 0.5) * 0.12), 7, 4));
  });
  const nextA = (i) => radA[(i + 1) % 10] + (i === 9 ? TAU : 0);
  radA.forEach((a, i) => {
    const b = nextA(i);
    [30, 64, 108, 160].forEach((r) => {
      if (rand() < 0.35) return;
      const rr = r * (0.9 + rand() * 0.2);
      crackSky += pathOf([at(rr, a), at(rr * (1.03 + rand() * 0.08), (a + b) / 2 + (rand() - 0.5) * 0.2), at(rr, b)]);
    });
  });
  const hole = (i, r0, r1) => {
    const a = radA[i];
    const b = nextA(i);
    return [at(r0, a), at(r0 * 1.06, (a + b) / 2), at(r0, b), at(r1, b), at(r1 * 1.06, (a + b) / 2), at(r1, a)];
  };
  const holes = [hole(1, 30, 64), hole(4, 64, 108), hole(7, 30, 64), hole(8, 64, 108), hole(0, 4, 30)];
  const holeD = holes.map((h) => pathOf(h, true)).join("");
  let shards = "";
  holes.slice(0, 4).forEach((h, i) => {
    const hx = h.reduce((s2, p) => s2 + p[0], 0) / h.length;
    const hy = h.reduce((s2, p) => s2 + p[1], 0) / h.length;
    const dir = Math.atan2(hy - IC[1], hx - IC[0]);
    const [dx, dy] = polar(0, 0, 34 + i * 12, dir);
    shards += `<path d="${pathOf(h, true)}" transform="translate(${f(dx)} ${f(dy)}) rotate(${f((rand() - 0.5) * 50)} ${f(hx)} ${f(hy)})" fill="url(#dsPane)" stroke="#8ff0f0" stroke-width="1.6" stroke-linejoin="round"/>`;
  });

  // Chunk: the wedge, pushed outward and turned.
  const cx = wedge.reduce((s, p) => s + p[0], 0) / wedge.length;
  const cy = wedge.reduce((s, p) => s + p[1], 0) / wedge.length;
  const push = polar(0, 0, 62, chunkDir);
  const chunkT = `translate(${f(push[0])} ${f(push[1])}) rotate(16 ${f(cx)} ${f(cy)})`;

  let ring = "";
  for (let i = 0; i < 70; i++) {
    const t = rand() * TAU;
    const rx = 250 + rand() * 40;
    const ry = 48 + rand() * 12;
    const lx = Math.cos(t) * rx;
    const ly = Math.sin(t) * ry;
    const rot = -18 * DEG;
    const x = PC[0] + lx * Math.cos(rot) - ly * Math.sin(rot);
    const y = PC[1] + lx * Math.sin(rot) + ly * Math.cos(rot);
    if (Math.sin(t) < 0 && Math.hypot(x - PC[0], y - PC[1]) < PR + 4) continue;
    const r = 0.8 + rand() ** 3 * 4;
    ring += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${rand() < 0.2 ? "#ff7ae8" : "#8a7aaa"}" opacity="${(0.35 + rand() * 0.5).toFixed(2)}"/>`;
  }

  let twinkle = "";
  for (let i = 0; i < 22; i++) {
    const x = 40 + rand() * 1520;
    const y = 30 + rand() * 560;
    if (blocked(x, y) || (x > 560 && x < 1040 && y > 80)) continue;
    const s = 1 + rand() * 1.4;
    const c = ["#cfe0ff", "#fff4e0", "#e0ccff", "#bff8ff"][i % 4];
    twinkle +=
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 7)}" fill="url(#dsStar)"/>` +
      `<path d="M${f(x - s * 9)} ${f(y)}H${f(x + s * 9)}M${f(x)} ${f(y - s * 9)}V${f(y + s * 9)}" stroke="${c}" stroke-width="${f(s * 0.5)}" opacity=".7"/>` +
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 1.1)}" fill="#fff"/>`;
  }

  // Nebula: puffs scattered along two curved bands, bright filaments and dark dust lanes.
  const band = (n, p0, p1, p2, p3, spread, [r0, r1], colors, op) => {
    let s = "";
    for (let i = 0; i < n; i++) {
      const t = rand();
      const [x, y] = cubic(p0, p1, p2, p3, t);
      const [x2, y2] = cubic(p0, p1, p2, p3, Math.min(1, t + 0.02));
      const rot = Math.atan2(y2 - y, x2 - x) / DEG + rand() * 30 - 15;
      const r = r0 + rand() * (r1 - r0);
      const c = colors[Math.floor(rand() * colors.length)];
      const px = x + (rand() - 0.5) * spread;
      const py = y + (rand() - 0.5) * spread * 0.6;
      s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(r)}" ry="${f(r * (0.25 + rand() * 0.35))}" transform="rotate(${f(rot)} ${f(px)} ${f(py)})" fill="${c}" opacity="${(op * (0.5 + rand() * 0.5)).toFixed(2)}"/>`;
    }
    return s;
  };
  const violet = [[960, -20], [1100, 180], [1350, 300], [1640, 520]];
  const teal = [[-40, 600], [200, 470], [420, 470], [640, 380]];
  const nebula =
    band(70, ...violet, 280, [50, 150], ["#5a1e9a", "#7a2aa8", "#3a1680", "#a03aa0"], 0.2) +
    band(55, ...teal, 220, [50, 140], ["#0e5a6a", "#127a86", "#0a3a5a", "#1a8a8a"], 0.18) +
    band(18, ...violet, 220, [40, 110], ["#010006"], 0.4) +
    band(14, ...teal, 160, [40, 100], ["#010006"], 0.35);
  const filaments =
    band(26, ...violet, 200, [40, 120], ["#c070ff", "#ff7ad8", "#9a6aff"], 0.12) +
    band(20, ...teal, 160, [40, 110], ["#40e0d8", "#60f0ff"], 0.1);

  const defs =
    `<radialGradient id="dsBg" gradientUnits="userSpaceOnUse" cx="820" cy="360" r="1000">${stops([[0, "#0d0b30"], [0.45, "#070618"], [1, "#010006"]])}</radialGradient>` +
    `<linearGradient id="dsShade" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#010006", 0], [0.5, "#010006", 0.55], [1, "#010006", 0.92]])}</linearGradient>` +
    `<radialGradient id="dsPlanet" gradientUnits="userSpaceOnUse" cx="1200" cy="160" r="260">${stops([[0, "#a898c4"], [0.22, "#6a5a88"], [0.5, "#33284e"], [0.78, "#140e26"], [1, "#05030c"]])}</radialGradient>` +
    `<radialGradient id="dsCore" gradientUnits="userSpaceOnUse" cx="${core[0]}" cy="${core[1]}" r="60">${stops([[0, "#fff4ff"], [0.25, "#ff8ae8"], [0.6, "#b03cff", 0.6], [1, "#5a0a9a", 0]])}</radialGradient>` +
    `<radialGradient id="dsSoftV">${stops([[0, "#2a0e5a", 0.6], [0.5, "#2a0e5a", 0.3], [1, "#2a0e5a", 0]])}</radialGradient>` +
    `<radialGradient id="dsSoftT">${stops([[0, "#0a3448", 0.55], [0.5, "#0a3448", 0.25], [1, "#0a3448", 0]])}</radialGradient>` +
    `<radialGradient id="dsSoftD">${stops([[0, "#15104a", 0.35], [1, "#15104a", 0]])}</radialGradient>` +
    `<linearGradient id="dsRock" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#4a2a5a"], [0.5, "#24122e"], [1, "#0e0616"]])}</linearGradient>` +
    `<radialGradient id="dsVoid" gradientUnits="userSpaceOnUse" cx="${IC[0]}" cy="${IC[1]}" r="130">${stops([[0, "#ffffff"], [0.15, "#b8fff8"], [0.45, "#20c8d8"], [1, "#0a4a6a"]])}</radialGradient>` +
    `<linearGradient id="dsPane" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#3a8a9a", 0.7], [0.4, "#0e1a34"], [1, "#05060f"]])}</linearGradient>` +
    `<radialGradient id="dsVoidHalo">${stops([[0, "#20c8d8", 0.22], [0.5, "#1a8aa8", 0.08], [1, "#1a8aa8", 0]])}</radialGradient>` +
    `<radialGradient id="dsStar">${stops([[0, "#ffffff", 0.7], [0.2, "#bcd0ff", 0.35], [1, "#6a7aff", 0]])}</radialGradient>` +
    `<clipPath id="dsPlanetClip"><path d="${ringPath(PC[0], PC[1], PR)}${wedgeD}" clip-rule="evenodd"/></clipPath>` +
    `<clipPath id="dsWedge"><path d="${wedgeD}"/></clipPath>` +
    blur("dsB16", 16) + blur("dsB6", 6) + blur("dsB2", 2);

  const planetSurface = (clip) =>
    `<g clip-path="url(#${clip})">` +
    `<circle cx="${PC[0]}" cy="${PC[1]}" r="${PR}" fill="url(#dsPlanet)"/>` +
    `<path d="M${PC[0] - 160} ${PC[1] - 40}Q${PC[0]} ${PC[1] - 10} ${PC[0] + 160} ${PC[1] - 70}M${PC[0] - 160} ${PC[1] + 50}Q${PC[0]} ${PC[1] + 80} ${PC[0] + 160} ${PC[1] + 20}" fill="none" stroke="#1a1030" stroke-width="18" opacity=".35" filter="url(#dsB6)"/>` +
    craters +
    `<circle cx="${PC[0] + 70}" cy="${PC[1] + 80}" r="180" fill="#020108" opacity=".55" filter="url(#dsB16)"/>` +
    `</g>`;

  const base =
    `<rect width="1600" height="900" fill="url(#dsBg)"/>` +
    `<ellipse cx="1220" cy="270" rx="520" ry="340" fill="url(#dsSoftV)"/>` +
    `<ellipse cx="300" cy="520" rx="520" ry="220" transform="rotate(-12 300 520)" fill="url(#dsSoftT)"/>` +
    `<ellipse cx="820" cy="380" rx="420" ry="300" fill="url(#dsSoftD)"/>` +
    `<g filter="url(#dsB16)">${nebula}</g>` +
    `<g filter="url(#dsB6)">${filaments}</g>` +
    stars(320, [0.4, 0.9], [0.15, 0.5], ["#cfd8ff", "#ffffff", "#ffe9c8", "#d9c8ff"]) +
    `<circle cx="${IC[0]}" cy="${IC[1]}" r="230" fill="url(#dsVoidHalo)"/>` +
    `<path d="${holeD}" fill="#010208" stroke="#010006" stroke-width="4" stroke-linejoin="round"/>` +
    `<circle cx="${PC[0]}" cy="${PC[1]}" r="${PR + 14}" fill="none" stroke="#7a4ad8" stroke-width="18" opacity=".35" filter="url(#dsB16)"/>` +
    planetSurface("dsPlanetClip") +
    section +
    `<path d="${wedgeD}" fill="url(#dsCore)" opacity=".4" clip-path="url(#dsWedge)"/>` +
    `<path d="${crackD}" fill="none" stroke="#05030c" stroke-width="5" stroke-linejoin="round" clip-path="url(#dsPlanetClip)"/>` +
    `<path d="${arcPath(PC[0], PC[1], PR - 1, 170 * DEG, 260 * DEG)}" fill="none" stroke="#e0d4ff" stroke-width="2" opacity=".4"/>` +
    `<path d="${arcPath(PC[0], PC[1], PR - 1, 0, 95 * DEG)}" fill="none" stroke="#b07aff" stroke-width="3" opacity=".6"/>` +
    `<rect y="560" width="1600" height="340" fill="url(#dsShade)"/>`;

  const chunks =
    `<g transform="${chunkT}">` +
    `<path d="${wedgeD}" fill="#05030c"/>` +
    planetSurface("dsWedge") +
    section +
    `<path d="${wedgeD}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="${faceD}" fill="none" stroke="#ff7ae8" stroke-width="2" opacity=".8"/>` +
    `<path d="${arcPath(PC[0], PC[1], PR - 1, a0, a1)}" fill="none" stroke="#b07aff" stroke-width="3" opacity=".55"/>` +
    `</g>` +
    rock(rand, PC[0] + 205, PC[1] - 150, 16, { fill: "url(#dsPlanet)", hi: "#d0c0f0", rimC: "#ff7ae8", sw: 1.4 }) +
    rock(rand, PC[0] + 160, PC[1] - 200, 9, { fill: "url(#dsPlanet)", hi: "#d0c0f0", rimC: "#ff7ae8", sw: 1.2 }) +
    rock(rand, PC[0] + 250, PC[1] - 85, 7, { fill: "url(#dsPlanet)", hi: "#d0c0f0", rimC: "#ff7ae8", sw: 1 }) +
    ring +
    shards;

  const glow =
    `<path d="${crackSky}" fill="none" stroke="#30d0e0" stroke-width="6" opacity=".3" filter="url(#dsB2)"/>` +
    `<path d="${crackSky}" fill="none" stroke="#b8f6f8" stroke-width="1.3" stroke-linejoin="round" opacity=".6"/>` +
    `<path d="${holeD}" fill="url(#dsVoid)"/>` +
    `<path d="${holeD}" fill="none" stroke="#e8ffff" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<circle cx="${IC[0]}" cy="${IC[1]}" r="14" fill="#ffffff" filter="url(#dsB6)"/>` +
    `<circle cx="${core[0]}" cy="${core[1]}" r="24" fill="url(#dsCore)" opacity=".8"/>` +
    `<path d="${faceD}" fill="none" stroke="#ff4ad8" stroke-width="10" opacity=".55" filter="url(#dsB6)"/>` +
    `<path d="${crackD}" fill="none" stroke="#ff4ad8" stroke-width="6" opacity=".4" filter="url(#dsB2)" clip-path="url(#dsPlanetClip)"/>` +
    `<path d="${crackD}" fill="none" stroke="#ffb8f4" stroke-width="1.4" stroke-linejoin="round" clip-path="url(#dsPlanetClip)"/>`;

  return {
    box: BOX,
    defs,
    layers: [
      { markup: base },
      { markup: stars(230, [0.5, 1.1], [0.3, 0.75], ["#c8d8ff", "#ffffff", "#d8ccff"]), anim: { type: "drift", amp: 4, speed: 0.05 } },
      { markup: stars(80, [1, 2], [0.5, 0.95], ["#dde8ff", "#fff2dc", "#c8f4ff"], true), anim: { type: "drift", amp: 9, speed: 0.07, phase: 11 } },
      { markup: twinkle, anim: { type: "pulse", min: 0.3, max: 1, speed: 1.3 }, blend: "lighter" },
      { markup: chunks, anim: { type: "float", amp: 5, speed: 0.35 } },
      { markup: glow, anim: { type: "pulse", min: 0.6, max: 1, speed: 0.9 }, blend: "lighter" },
    ],
  };
}

// ---------------------------------------------------------------------------
// boss_lair
// ---------------------------------------------------------------------------

/** Gothic pillar with vertebra bands, a cable tube and a crimson rim on its right edge. */
function lairPillar(x, w, y0, y1) {
  let s = `<rect x="${f(x)}" y="${f(y0)}" width="${f(w)}" height="${f(y1 - y0)}" fill="url(#lStone)"/>`;
  s += `<path d="M${f(x + w * 0.3)} ${f(y0)}V${f(y1)}M${f(x + w * 0.62)} ${f(y0)}V${f(y1)}" stroke="#030108" stroke-width="${f(w * 0.05)}" opacity=".55"/>`;
  s += `<path d="M${f(x + w * 0.34)} ${f(y0)}V${f(y1)}" stroke="#6a5070" stroke-width="${f(w * 0.015 + 0.6)}" opacity=".3"/>`;
  const step = Math.max(56, w * 0.9);
  let bands = "";
  let hl = "";
  for (let y = y0 + step * 0.5; y < y1 - w * 0.3; y += step) {
    const bh = w * 0.16;
    bands += `M${f(x - w * 0.07)} ${f(y)}Q${f(x + w / 2)} ${f(y + w * 0.14)} ${f(x + w * 1.07)} ${f(y)}V${f(y + bh)}Q${f(x + w / 2)} ${f(y + bh + w * 0.14)} ${f(x - w * 0.07)} ${f(y + bh)}Z`;
    hl += `M${f(x - w * 0.04)} ${f(y + 1.5)}Q${f(x + w * 0.3)} ${f(y + w * 0.1)} ${f(x + w * 0.6)} ${f(y + w * 0.09)}`;
  }
  s +=
    `<path d="${bands}" fill="#0c0612" stroke="${INK}" stroke-width="${f(Math.max(1.2, w * 0.025))}"/>` +
    `<path d="${hl}" fill="none" stroke="#8a6a8a" stroke-width="${f(Math.max(0.8, w * 0.018))}" opacity=".45"/>` +
    `<path d="M${f(x + w * 0.78)} ${f(y0)}C${f(x + w * 1.0)} ${f(y0 + (y1 - y0) * 0.3)} ${f(x + w * 0.55)} ${f(y0 + (y1 - y0) * 0.6)} ${f(x + w * 0.8)} ${f(y1)}" fill="none" stroke="${INK}" stroke-width="${f(w * 0.11)}"/>` +
    `<path d="M${f(x + w * 0.78)} ${f(y0)}C${f(x + w * 1.0)} ${f(y0 + (y1 - y0) * 0.3)} ${f(x + w * 0.55)} ${f(y0 + (y1 - y0) * 0.6)} ${f(x + w * 0.8)} ${f(y1)}" fill="none" stroke="#2a1422" stroke-width="${f(w * 0.07)}"/>` +
    `<rect x="${f(x)}" y="${f(y0)}" width="${f(w)}" height="${f(y1 - y0)}" fill="none" stroke="${INK}" stroke-width="${f(Math.max(1.5, w * 0.03))}"/>` +
    `<path d="M${f(x + w - 1)} ${f(y0)}V${f(y1)}" stroke="#ff2a4a" stroke-width="${f(Math.max(1.2, w * 0.035))}" opacity=".5"/>` +
    `<path d="M${f(x + 1)} ${f(y0)}V${f(y1)}" stroke="#9a8aa8" stroke-width="${f(Math.max(0.8, w * 0.02))}" opacity=".3"/>`;
  return s;
}

/** Pointed gothic arch rib between two spring points, apex above their middle. */
function archRib(xl, xr, springY, apexY) {
  const mx = (xl + xr) / 2;
  const h = springY - apexY;
  return (
    `M${f(xl)} ${f(springY)}C${f(xl)} ${f(springY - h * 0.55)} ${f(mx - (mx - xl) * 0.42)} ${f(apexY + h * 0.1)} ${f(mx)} ${f(apexY)}` +
    `C${f(mx + (xr - mx) * 0.42)} ${f(apexY + h * 0.1)} ${f(xr)} ${f(springY - h * 0.55)} ${f(xr)} ${f(springY)}`
  );
}

/**
 * The Paradox Lord's lair: a gothic, biomechanical cathedral nave. A giant
 * broken clock rose window glows crimson behind the throne dais (a slow ring
 * gear turns behind it), vertebra-banded pillars and cracked clock faces line
 * the walls, chains sag between the arches. Light shafts and the clock glow
 * pulse, smoke drifts, embers float.
 */
function bossLair() {
  const rand = rng(1841);
  const C = [800, 318];

  // Back: vault ribs receding up into darkness.
  let ribs = "";
  let ribHi = "";
  let knobs = "";
  [[430, 1170, 330, -30, 22], [300, 1300, 320, -170, 30], [215, 1385, 300, -320, 36]].forEach(([xl, xr, sy, ay, w], k) => {
    const d = archRib(xl, xr, sy, ay);
    ribs += `<path d="${d}" fill="none" stroke="#07020b" stroke-width="${w}"/>`;
    ribHi += `<path d="${d}" fill="none" stroke="#4a2a50" stroke-width="2" transform="translate(${-w * 0.3} ${-w * 0.2})" opacity=".5"/>`;
    const mx = (xl + xr) / 2;
    const h = sy - ay;
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      const p = t < 0.5 ?
        cubic([xl, sy], [xl, sy - h * 0.55], [mx - (mx - xl) * 0.42, ay + h * 0.1], [mx, ay], t * 2) :
        cubic([mx, ay], [mx + (xr - mx) * 0.42, ay + h * 0.1], [xr, sy - h * 0.55], [xr, sy], (t - 0.5) * 2);
      if (p[1] < -10) continue;
      knobs += `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${f(w * 0.55)}" ry="${f(w * 0.3)}" fill="#1a0c1e" stroke="${INK}" stroke-width="1.5"/>`;
    }
  });
  // Triforium arcade and drooping biomechanical cables on the back wall.
  let arcade = "";
  for (let i = 0; i < 16; i++) {
    const x = 20 + i * 100;
    if (x > 380 && x < 1160) continue;
    arcade += `<path d="M${x} 470V${f(410)}Q${x} 370 ${x + 35} 356Q${x + 70} 370 ${x + 70} 410V470Z" fill="#0c0314" stroke="#2a1430" stroke-width="3"/>`;
  }
  let cables = "";
  [[120, 0, 380, 30, 120], [980, 10, 1300, 0, 150], [240, -10, 560, 0, 90], [1060, -10, 1420, 20, 100]].forEach(([x0, y0, x1, y1, sag]) => {
    const d = `M${x0} ${y0}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + sag * 2} ${x1} ${y1}`;
    cables += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="13"/><path d="${d}" fill="none" stroke="#2a1426" stroke-width="8"/><path d="${d}" fill="none" stroke="#7a4a6a" stroke-width="1.5" transform="translate(-1 -3)" opacity=".45"/>`;
  });
  const opening = `M430 600L430 330C430 150 620 10 800 -30C980 10 1170 150 1170 330L1170 600Z`;

  // Lancet windows on the side walls.
  const lancet = (x, y, w, h) =>
    `<path d="M${x} ${y + h}V${f(y + w * 0.9)}Q${x} ${y} ${f(x + w / 2)} ${y - w * 0.3}Q${x + w} ${y} ${x + w} ${f(y + w * 0.9)}V${y + h}Z" fill="url(#lLancet)" stroke="#07020b" stroke-width="5"/>` +
    `<path d="M${f(x + w / 2)} ${f(y - w * 0.2)}V${y + h}M${x} ${f(y + h * 0.55)}H${x + w}" stroke="#07020b" stroke-width="3"/>`;

  // Floor: perspective flagstones falling away into shadow.
  let floorLines = "";
  for (let i = -8; i <= 8; i++) floorLines += `M${800 + i * 22} 560L${800 + i * 150} 900`;
  [578, 600, 632, 680, 750, 850].forEach((y) => (floorLines += `M0 ${y}H1600`));

  const base =
    `<rect width="1600" height="900" fill="url(#lBg)"/>` +
    arcade +
    lancet(262, 120, 56, 190) + lancet(1282, 120, 56, 190) +
    cables +
    ribs + ribHi + knobs +
    `<path d="${opening}" fill="url(#lArch)"/>` +
    `<path d="${opening}" fill="none" stroke="#07020b" stroke-width="14"/>` +
    `<path d="M437 600V330C437 160 622 22 800 -18" fill="none" stroke="#5a3a5a" stroke-width="2" opacity=".45"/>` +
    lairPillar(398, 30, 250, 590) + lairPillar(1172, 30, 250, 590) +
    `<path d="M0 560H1600V900H0Z" fill="url(#lFloor)"/>` +
    `<path d="${floorLines}" stroke="#2a0a26" stroke-width="1.5" opacity=".45"/>` +
    `<path d="M470 566H1130L1160 584H440Z" fill="#150518" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M470 566H1130" stroke="#8a2a4a" stroke-width="1.5" opacity=".6"/>` +
    `<path d="M440 584H1160L1200 606H400Z" fill="#0e0312" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M440 584H1160" stroke="#6a1a3a" stroke-width="1.2" opacity=".5"/>`;

  // Ring gear that turns behind the rose window (kept inside the frame at every angle).
  const gearRing =
    `<path d="${gearPath(C[0], C[1], 312, 72, 16, { spokes: 0, hole: 268 })}" fill="#24121c" fill-rule="evenodd" stroke="${INK}" stroke-width="3"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="288" fill="none" stroke="#8a4a4a" stroke-width="2" opacity=".35"/>` +
    Array.from({ length: 24 }, (_, i) => {
      const [x, y] = polar(C[0], C[1], 283, (i / 24) * TAU);
      return `<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="#4a2a2a" stroke="${INK}" stroke-width="1.2"/>`;
    }).join("");

  // Rose window clock.
  let panes = "";
  let tracery = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU - Math.PI / 2;
    const b = a + TAU / 12;
    const gone = i === 1 || i === 7;
    panes += `<path d="${sectorPath(C[0], C[1], 150, 262, a, b)}" fill="${gone ? "#08010c" : i % 2 ? "url(#lPaneV)" : "url(#lPaneR)"}"/>`;
    tracery += `M${pt(polar(C[0], C[1], 150, a))}L${pt(polar(C[0], C[1], 262, a))}`;
    tracery += `M${pt(polar(C[0], C[1], 262, a))}Q${pt(polar(C[0], C[1], 196, a + TAU / 24))} ${pt(polar(C[0], C[1], 262, b))}`;
  }
  let crackD = "";
  const breakA = 32 * DEG;
  for (let i = 0; i < 7; i++) {
    const a = breakA + (rand() - 0.5) * 1.6;
    crackD += pathOf(jagged(rand, polar(C[0], C[1], 250, breakA + (rand() - 0.5) * 0.3), polar(C[0], C[1], 40 + rand() * 120, a + Math.PI * (0.8 + rand() * 0.4)), 6, 10));
  }
  const bezelGap = [
    ...jagged(rand, polar(C[0], C[1], 232, 22 * DEG), polar(C[0], C[1], 300, 18 * DEG), 4, 6),
    ...jagged(rand, polar(C[0], C[1], 300, 44 * DEG), polar(C[0], C[1], 236, 40 * DEG), 4, 6),
  ];
  let markers = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU - Math.PI / 2;
    if (i === 3 || i === 4) continue;
    markers += `<path d="M-10 -4L10 -7L18 0L10 7L-10 4Z" transform="translate(${pt(polar(C[0], C[1], 238, a))}) rotate(${f(a / DEG)})" fill="url(#bronze)" stroke="${INK}" stroke-width="1.5"/>`;
  }
  let minuteTicks = "";
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = (i / 60) * TAU;
    minuteTicks += `M${pt(polar(C[0], C[1], 252, a))}L${pt(polar(C[0], C[1], 260, a))}`;
  }
  const rose =
    `<circle cx="${C[0]}" cy="${C[1]}" r="262" fill="url(#lFace)"/>` +
    panes +
    `<path d="${crackD}" fill="none" stroke="#050008" stroke-width="2.5" stroke-linejoin="round" opacity=".85"/>` +
    `<path d="${crackD}" fill="none" stroke="#ff6a8a" stroke-width="0.9" transform="translate(1.5 1.5)" opacity=".3"/>` +
    `<path d="${tracery}" fill="none" stroke="#12060e" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="${tracery}" fill="none" stroke="#6a3a3a" stroke-width="1.5" transform="translate(-2 -2)" opacity=".35"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="150" fill="none" stroke="#12060e" stroke-width="14"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="144" fill="none" stroke="#8a4a4a" stroke-width="1.5" opacity=".35"/>` +
    `<path d="${minuteTicks}" stroke="#c08a7a" stroke-width="2" opacity=".35"/>` +
    markers +
    `<circle cx="${C[0]}" cy="${C[1]}" r="262" fill="url(#lVig)"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="276" fill="none" stroke="url(#bezel)" stroke-width="30"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="262" fill="none" stroke="${INK}" stroke-width="3"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="291" fill="none" stroke="${INK}" stroke-width="3"/>` +
    `<path d="${arcPath(C[0], C[1], 284, 195 * DEG, 255 * DEG)}" fill="none" stroke="#e0b090" stroke-width="3" opacity=".45"/>` +
    `<path d="${arcPath(C[0], C[1], 289, -60 * DEG, 10 * DEG)}" fill="none" stroke="#ff2a4a" stroke-width="3" opacity=".6"/>` +
    `<path d="${pathOf(bezelGap, true)}" fill="#0a0210" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="${handPath(158, 16)}" transform="translate(${C[0]} ${C[1]}) rotate(-150)" fill="#1a0a10" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="${handPath(158, 16)}" transform="translate(${C[0]} ${C[1]}) rotate(-150)" fill="none" stroke="#ff2a4a" stroke-width="1" opacity=".4"/>` +
    `<path d="M0 -5L150 -4L150 4L0 5Z" transform="translate(${C[0]} ${C[1]}) rotate(-40)" fill="#1a0a10" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="${handPath(90, 10)}" transform="translate(${pt(polar(C[0], C[1], 150, -40 * DEG))}) rotate(12)" fill="#1a0a10" stroke="${INK}" stroke-width="2.5"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="20" fill="url(#bronze)" stroke="${INK}" stroke-width="2.5"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="7" fill="#050008"/>`;

  // Side walls: a big gear sunk into each wall, cracked clock faces, near pillars.
  const walls =
    gear(120, 520, 190, 26, { broken: [3, 4, 17], sw: 3 }) +
    gear(1500, 360, 150, 22, { broken: [9], sw: 3 }) +
    gear(1325, 548, 62, 12, { sw: 2.5, spokes: 4 }) +
    clockFace(rand, "lck1", 330, 215, 92, { hands: [-2.2, 0.9], missing: [0.3, 1.2], cracks: 5 }) +
    clockFace(rand, "lck2", 1280, 215, 104, { hands: [-1.2, 2.3], missing: [2.2, 3.1], cracks: 6 }) +
    `<path d="${archRib(60, 208, 300, 150)}" fill="none" stroke="#07020b" stroke-width="20"/>` +
    `<path d="${archRib(1392, 1540, 300, 150)}" fill="none" stroke="#07020b" stroke-width="20"/>` +
    lairPillar(170, 76, -10, 760) + lairPillar(1354, 76, -10, 760) +
    lairPillar(-10, 118, -10, 900) + lairPillar(1492, 118, -10, 900) +
    `<path d="M160 300H256V330H160ZM1344 300H1440V330H1344Z" fill="#1a0c1e" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M162 302H254M1346 302H1438" stroke="#8a6a8a" stroke-width="1.5" opacity=".45"/>` +
    chain([108, 70], [430, 130], 70, 20) +
    chain([256, 330], [430, 360], 36, 15) +
    chain([1170, 120], [1492, 60], 80, 20) +
    chain([1170, 360], [1354, 330], 40, 15) +
    chain([500, -10], [505, 250], 0, 16) +
    chain([1105, -10], [1100, 300], 0, 16) +
    `<path d="M1086 300h28l-4 30h-20Z" fill="url(#bronze)" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M492 250c-10 10-10 26 4 30" fill="none" stroke="#2a1418" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M0 640H1600V900H0Z" fill="url(#lShade)"/>`;

  // Light: rose window bloom, beams from the lancets, the dais reflection.
  const light =
    `<circle cx="${C[0]}" cy="${C[1]}" r="420" fill="url(#lGlow)"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="206" fill="none" stroke="#ff2a4a" stroke-width="100" opacity=".1" filter="url(#lB20)"/>` +
    `<circle cx="${C[0]}" cy="${C[1]}" r="276" fill="none" stroke="#ff3a5a" stroke-width="8" opacity=".25" filter="url(#lB8)"/>` +
    `<path d="M270 150L318 150L640 900L420 900Z" fill="url(#lShaftR)" filter="url(#lB8)"/>` +
    `<path d="M1290 150L1338 150L1180 900L960 900Z" fill="url(#lShaftV)" filter="url(#lB8)"/>` +
    `<path d="M700 -20L900 -20L1080 640L520 640Z" fill="url(#lShaftV)" opacity=".35" filter="url(#lB20)"/>` +
    `<ellipse cx="800" cy="600" rx="360" ry="46" fill="#ff2a4a" opacity=".22" filter="url(#lB20)"/>` +
    `<path d="M470 566H1130" stroke="#ff4a6a" stroke-width="2" opacity=".5"/>`;

  let smoke = "";
  for (let i = 0; i < 24; i++) {
    const x = rand() * 1600;
    const floor = i < 15;
    const y = floor ? 550 + rand() * 110 : 40 + rand() * 380;
    if (!floor && x > 460 && x < 1140) continue;
    const rx = 160 + rand() * 220;
    smoke += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * (0.18 + rand() * 0.14))}" fill="url(#${floor ? "lSmokeR" : "lSmokeV"})" opacity="${(0.5 + rand() * 0.5).toFixed(2)}"/>`;
  }

  const defs =
    `<radialGradient id="lBg" gradientUnits="userSpaceOnUse" cx="800" cy="330" r="950">${stops([[0, "#2c0a2e"], [0.35, "#1a0520"], [0.7, "#0c0212"], [1, "#040007"]])}</radialGradient>` +
    `<radialGradient id="lArch" gradientUnits="userSpaceOnUse" cx="800" cy="320" r="520">${stops([[0, "#5a0f2e"], [0.5, "#2e0826"], [1, "#12031a"]])}</radialGradient>` +
    `<linearGradient id="lLancet" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#6a2a8a"], [0.6, "#3a1050"], [1, "#1a0626"]])}</linearGradient>` +
    `<linearGradient id="lStone" x1="0" y1="0" x2="1" y2="0">${stops([[0, "#3e2c48"], [0.2, "#23142b"], [0.65, "#0f0715"], [0.9, "#1e0818"], [1, "#5a0e2a"]])}</linearGradient>` +
    `<linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#7a5a44"], [0.3, "#44291f"], [0.65, "#1e1012"], [1, "#4a1622"]])}</linearGradient>` +
    `<linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#5a3a30"], [0.45, "#2e1a1e"], [1, "#12060c"]])}</linearGradient>` +
    `<radialGradient id="dial" cx=".4" cy=".35" r=".8">${stops([[0, "#3a1a26"], [0.6, "#1e0c16"], [1, "#0c040a"]])}</radialGradient>` +
    `<radialGradient id="lFace" gradientUnits="userSpaceOnUse" cx="800" cy="318" r="262">${stops([[0, "#4a0a26"], [0.5, "#2a0620"], [1, "#12021a"]])}</radialGradient>` +
    `<linearGradient id="lPaneR" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#6a1030", 0.9], [0.6, "#3a0620", 0.9], [1, "#22031a", 0.9]])}</linearGradient>` +
    `<linearGradient id="lPaneV" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#3a1458", 0.9], [0.6, "#1e0834", 0.9], [1, "#12041e", 0.9]])}</linearGradient>` +
    `<linearGradient id="lFloor" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#1c0620"], [0.3, "#0e0312"], [1, "#030006"]])}</linearGradient>` +
    `<linearGradient id="lShade" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#030006", 0], [0.5, "#030006", 0.55], [1, "#030006", 0.9]])}</linearGradient>` +
    `<radialGradient id="lGlow" gradientUnits="userSpaceOnUse" cx="800" cy="318" r="420">${stops([[0, "#ff2a4a", 0.22], [0.35, "#c01a50", 0.14], [0.7, "#6a1a8a", 0.07], [1, "#6a1a8a", 0]])}</radialGradient>` +
    `<linearGradient id="lShaftR" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#ff2a4a", 0.35], [0.5, "#ff2a4a", 0.12], [1, "#ff2a4a", 0]])}</linearGradient>` +
    `<linearGradient id="lShaftV" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#9b5cff", 0.3], [0.5, "#9b5cff", 0.1], [1, "#9b5cff", 0]])}</linearGradient>` +
    `<radialGradient id="lEmber">${stops([[0, "#ffe0b0"], [0.2, "#ff6a3a", 0.9], [0.5, "#ff2a4a", 0.3], [1, "#ff2a4a", 0]])}</radialGradient>` +
    `<radialGradient id="lVig" gradientUnits="userSpaceOnUse" cx="780" cy="300" r="270">${stops([[0, "#0a0210", 0], [0.55, "#0a0210", 0.1], [1, "#0a0210", 0.6]])}</radialGradient>` +
    `<radialGradient id="lSmokeR">${stops([[0, "#4a0c2a", 0.5], [0.6, "#3a0a22", 0.22], [1, "#3a0a22", 0]])}</radialGradient>` +
    `<radialGradient id="lSmokeV">${stops([[0, "#3a1048", 0.4], [0.6, "#2a0a34", 0.18], [1, "#2a0a34", 0]])}</radialGradient>` +
    blur("lB8", 8) + blur("lB20", 20);

  return {
    box: BOX,
    defs,
    layers: [
      { markup: base },
      { markup: gearRing, anim: { type: "spin", speed: 0.035, pivot: C } },
      { markup: rose + walls },
      { markup: light, anim: { type: "pulse", min: 0.65, max: 1, speed: 1.1 }, blend: "lighter" },
      { markup: smoke, anim: { type: "drift", amp: 30, speed: 0.15 } },
      { markup: particles(rand, 70, [0, 40, 1600, 700], [3, 9], "lEmber"), anim: { type: "float", amp: 16, speed: 0.5 }, blend: "lighter" },
      { markup: particles(rand, 40, [0, 80, 1600, 640], [2, 6], "lEmber"), anim: { type: "drift", amp: 20, speed: 0.4, phase: 2 }, blend: "lighter" },
    ],
  };
}

// ---------------------------------------------------------------------------
// reactor
// ---------------------------------------------------------------------------

/** Vertical pipe with cylinder shading and flanges. */
function pipeV(x, w, y0, y1, flangeStep = 150) {
  let s = `<rect x="${f(x)}" y="${f(y0)}" width="${f(w)}" height="${f(y1 - y0)}" fill="url(#rPipeV)" stroke="${INK}" stroke-width="2"/>`;
  for (let y = y0 + flangeStep * 0.6; y < y1 - 10; y += flangeStep) {
    s += `<rect x="${f(x - w * 0.14)}" y="${f(y)}" width="${f(w * 1.28)}" height="${f(Math.max(8, w * 0.28))}" fill="url(#rPipeV)" stroke="${INK}" stroke-width="2"/>`;
    s += `<path d="M${f(x - w * 0.05)} ${f(y + 3)}h${f(w * 1.1)}" stroke="#e8a060" stroke-width="1" opacity=".35"/>`;
  }
  return s;
}

/** Horizontal pipe with cylinder shading and flanges. */
function pipeH(x0, x1, y, h, flangeStep = 160) {
  let s = `<rect x="${f(x0)}" y="${f(y)}" width="${f(x1 - x0)}" height="${f(h)}" fill="url(#rPipeH)" stroke="${INK}" stroke-width="2"/>`;
  for (let x = x0 + flangeStep * 0.5; x < x1 - 10; x += flangeStep) {
    s += `<rect x="${f(x)}" y="${f(y - h * 0.14)}" width="${f(Math.max(8, h * 0.28))}" height="${f(h * 1.28)}" fill="url(#rPipeH)" stroke="${INK}" stroke-width="2"/>`;
  }
  return s;
}

/** Catwalk deck with truss underside, hazard edge and railing. */
function catwalk(x0, x1, y, o = {}) {
  const { rail = 42, deck = 16, truss = 24, post = 72 } = o;
  let trussD = "";
  for (let x = x0, i = 0; x < x1; x += truss * 1.4, i++) {
    trussD += `M${f(x)} ${f(y + deck)}L${f(Math.min(x1, x + truss * 0.7))} ${f(y + deck + truss)}L${f(Math.min(x1, x + truss * 1.4))} ${f(y + deck)}`;
  }
  let posts = "";
  for (let x = x0 + 10; x < x1; x += post) posts += `M${f(x)} ${f(y - rail)}V${f(y)}`;
  return (
    `<path d="${trussD}M${x0} ${f(y + deck + truss)}H${x1}" fill="none" stroke="#0a0502" stroke-width="5"/>` +
    `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${deck}" fill="url(#rDeck)" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M${x0} ${f(y + 3)}H${x1}" stroke="#1a0e04" stroke-width="5"/>` +
    `<path d="M${x0} ${f(y + 3)}H${x1}" stroke="#d09020" stroke-width="5" stroke-dasharray="14 14" opacity=".55"/>` +
    `<path d="${posts}" stroke="${INK}" stroke-width="6"/>` +
    `<path d="${posts}" stroke="#3a2614" stroke-width="3.5"/>` +
    `<path d="M${x0} ${f(y - rail)}H${x1}M${x0} ${f(y - rail * 0.5)}H${x1}" stroke="${INK}" stroke-width="6"/>` +
    `<path d="M${x0} ${f(y - rail)}H${x1}M${x0} ${f(y - rail * 0.5)}H${x1}" stroke="#4a3018" stroke-width="3"/>` +
    `<path d="M${x0} ${f(y - rail - 1)}H${x1}" stroke="#ffae3a" stroke-width="1" opacity=".45"/>`
  );
}

/**
 * Reactor chamber: a cylindrical industrial hall around a caged amber plasma
 * column, with containment rings, catwalks on two levels, flanged coolant
 * pipes and ceiling trusses. The core glow pulses, heat haze rises, steam
 * vents breathe, a broken junction throws sparks, embers float.
 */
function reactor() {
  const rand = rng(1946);

  // Back wall: cylinder ribs and curved panel seams lit by the core.
  let ribs = "";
  for (let deg = -66; deg <= 66; deg += 11) {
    const x = 800 + 880 * Math.sin(deg * DEG);
    const w = 16 * Math.cos(deg * DEG) + 4;
    ribs += `<rect x="${f(x - w / 2)}" y="60" width="${f(w)}" height="600" fill="#0c0602"/>`;
    ribs += `<path d="M${f(x + (deg < 0 ? w / 2 : -w / 2))} 60V660" stroke="#8a4a14" stroke-width="1.5" opacity="${f(0.55 - Math.abs(deg) / 160)}"/>`;
  }
  let seams = "";
  [150, 280, 410, 540].forEach((y) => {
    seams += `<path d="M0 ${y - 24}Q800 ${y + 18} 1600 ${y - 24}" fill="none" stroke="#070301" stroke-width="4"/>`;
    seams += `<path d="M0 ${y - 21}Q800 ${y + 21} 1600 ${y - 21}" fill="none" stroke="#c0701e" stroke-width="1" opacity=".2"/>`;
  });
  let lamps = "";
  [[250, 205], [1350, 205], [420, 470], [1180, 470], [120, 340], [1480, 340]].forEach(([x, y]) => {
    lamps += `<rect x="${x - 14}" y="${y - 6}" width="28" height="12" rx="3" fill="#2a1606" stroke="${INK}" stroke-width="2"/><rect x="${x - 10}" y="${y - 3}" width="20" height="6" fill="#ffb24a" opacity=".85"/>`;
  });

  // Ceiling trusses.
  let truss = "";
  for (let x = -40; x < 1640; x += 80) truss += `M${x} 12L${x + 40} 70L${x + 80} 12`;

  // Core column geometry.
  const X0 = 718;
  const X1 = 882;
  const ring = (y) =>
    `<path d="M688 ${y}Q800 ${y + 12} 912 ${y}V${y + 30}Q800 ${y + 42} 688 ${y + 30}Z" fill="url(#rRing)" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="M692 ${y + 15}Q800 ${y + 27} 908 ${y + 15}" fill="none" stroke="#ffcf6a" stroke-width="3"/>` +
    `<path d="M692 ${y + 2}Q800 ${y + 14} 908 ${y + 2}" fill="none" stroke="#d8a070" stroke-width="1.2" opacity=".5"/>`;
  const filament = pathOf(Array.from({ length: 30 }, (_, i) => [800 + Math.sin(i * 1.3) * 7 + (rand() - 0.5) * 6, 196 + i * 12.7]));

  // Sparks from a broken junction on the right upper catwalk, and a smaller one on the left.
  const sparks = (sx, sy, n, len, dir) => {
    let s = `<circle cx="${sx}" cy="${sy}" r="26" fill="url(#rSpark)"/>`;
    let d = "";
    let dots = "";
    for (let i = 0; i < n; i++) {
      const a = dir + (rand() - 0.5) * 1.6;
      const r0 = 6 + rand() * len * 0.8;
      const [x, y] = polar(sx, sy, r0, a);
      const l = 10 + rand() * 20;
      const g = r0 * r0 * 0.0012;
      d += `M${f(x)} ${f(y + g)}L${f(x + Math.cos(a) * l)} ${f(y + g + Math.sin(a) * l + l * 0.3)}`;
      if (rand() < 0.4) dots += `<circle cx="${f(x)}" cy="${f(y + g)}" r="1.6" fill="#fff4c0"/>`;
    }
    return s + `<path d="${d}" stroke="#ffb040" stroke-width="4.5" stroke-linecap="round" opacity=".55"/><path d="${d}" stroke="#fff0b0" stroke-width="1.8" stroke-linecap="round"/>` + dots;
  };

  const base =
    `<rect width="1600" height="900" fill="url(#rBg)"/>` +
    `<rect y="40" width="1600" height="640" fill="url(#rWall)"/>` +
    ribs + seams + lamps +
    pipeV(520, 18, 60, 640, 120) + pipeV(1062, 18, 60, 640, 120) + pipeV(560, 10, 60, 640, 200) + pipeV(1030, 10, 60, 640, 200) +
    `<rect width="1600" height="84" fill="#080401"/>` +
    `<path d="${truss}M-40 12H1640M-40 70H1640" fill="none" stroke="#1e1208" stroke-width="7"/>` +
    `<path d="M-40 72H1640" stroke="#b86a1e" stroke-width="1.2" opacity=".35"/>` +
    // floor
    `<rect y="640" width="1600" height="260" fill="url(#rFloor)"/>` +
    `<path d="${Array.from({ length: 17 }, (_, i) => `M${800 + (i - 8) * 30} 640L${800 + (i - 8) * 190} 900`).join("")}M0 660H1600M0 700H1600M0 770H1600M0 860H1600" stroke="#3a1e08" stroke-width="1.5" opacity=".35"/>` +
    // core housing
    pipeV(610, 26, 0, 110, 60) + pipeV(964, 26, 0, 110, 60) + pipeV(690, 18, 0, 90, 50) + pipeV(892, 18, 0, 90, 50) +
    `<rect x="${X0}" y="190" width="${X1 - X0}" height="380" fill="url(#rPlasma)"/>` +
    `<path d="${filament}" fill="none" stroke="#fff6d8" stroke-width="5" opacity=".8" filter="url(#rB2)"/>` +
    `<path d="${filament}" fill="none" stroke="#ffffff" stroke-width="1.5"/>` +
    `<rect x="${X0}" y="190" width="${X1 - X0}" height="380" fill="url(#rGlass)"/>` +
    `<path d="M${X0 + 30} 190V570M${X1 - 30} 190V570" stroke="#2a1406" stroke-width="9"/>` +
    `<path d="M${X0 + 27} 190V570M${X1 - 33} 190V570" stroke="#e8a060" stroke-width="1.2" opacity=".5"/>` +
    `<rect x="${X0 - 12}" y="190" width="16" height="380" fill="url(#rSteelL)" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="${X1 - 4}" y="190" width="16" height="380" fill="url(#rSteelR)" stroke="${INK}" stroke-width="2"/>` +
    `<path d="M560 84L1040 84L960 176L924 204L676 204L640 176Z" fill="url(#rCap)" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M600 110H1000M640 150H960" stroke="#070301" stroke-width="3"/><path d="M600 112H1000" stroke="#c07a30" stroke-width="1" opacity=".35"/>` +
    `<path d="M676 204H924" stroke="#ffc060" stroke-width="3"/>` +
    ring(250) + ring(378) + ring(506) +
    `<path d="M560 572L1040 572L1120 648L480 648Z" fill="url(#rBase)" stroke="${INK}" stroke-width="3"/>` +
    `<path d="${Array.from({ length: 13 }, (_, i) => `M${620 + i * 30} 576L${540 + i * 43.3} 644`).join("")}" stroke="#0e0602" stroke-width="3" opacity=".6"/>` +
    `<path d="M520 610H1080" stroke="#0e0602" stroke-width="4" opacity=".7"/><path d="M522 613H1078" stroke="#c07a30" stroke-width="1" opacity=".3"/>` +
    `<path d="M560 572H1040" stroke="#ffc060" stroke-width="2.5" opacity=".8"/>` +
    `<path d="M480 648H1120V676H480Z" fill="#0c0602" stroke="${INK}" stroke-width="2"/>` +
    // upper and lower catwalks
    `<path d="M200 84V326M420 84V326M1180 84V326M1400 84V326" stroke="#140a04" stroke-width="5"/>` +
    catwalk(-10, 700, 328) + catwalk(900, 1610, 328) +
    // coolant pipes
    pipeV(52, 48, 0, 900, 170) + pipeV(116, 30, 0, 900, 140) +
    pipeH(146, 610, 146, 34, 150) +
    `<rect x="40" y="130" width="140" height="66" fill="url(#rSteelL)" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M50 140h120M50 186h120" stroke="#070301" stroke-width="2"/>` +
    [[56, 150], [164, 150], [56, 176], [164, 176]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#6a4a2a" stroke="${INK}" stroke-width="1"/>`).join("") +
    pipeH(990, 1610, 118, 22, 140) +
    pipeH(912, 1500, 436, 38, 170) + pipeV(1480, 40, 436, 900, 150) +
    `<rect x="1464" y="420" width="72" height="72" fill="url(#rSteelR)" stroke="${INK}" stroke-width="3"/>` +
    `<circle cx="1290" cy="455" r="30" fill="none" stroke="${INK}" stroke-width="8"/><circle cx="1290" cy="455" r="30" fill="none" stroke="#8a2a10" stroke-width="5"/>` +
    `<path d="M1260 455H1320M1290 425V485" stroke="#6a200c" stroke-width="4"/><circle cx="1290" cy="455" r="6" fill="#3a2010" stroke="${INK}" stroke-width="2"/>` +
    pipeV(1536, 30, 0, 900, 190) +
    `<circle cx="84" cy="420" r="7" fill="#3ae0a0"/><circle cx="84" cy="440" r="7" fill="#401a08"/><circle cx="1548" cy="620" r="6" fill="#3ae0a0"/>` +
    catwalk(-10, 470, 600, { rail: 36, deck: 14 }) + catwalk(1130, 1610, 600, { rail: 36, deck: 14 }) +
    `<rect y="630" width="1600" height="270" fill="url(#rShade)"/>`;

  const glow =
    `<ellipse cx="800" cy="380" rx="560" ry="440" fill="url(#rGlow)"/>` +
    `<rect x="690" y="190" width="220" height="380" fill="#ff9a2a" opacity=".3" filter="url(#rB14)"/>` +
    `<path d="M692 265Q800 277 908 265M692 393Q800 405 908 393M692 521Q800 533 908 521" fill="none" stroke="#ffb040" stroke-width="12" opacity=".5" filter="url(#rB6)"/>` +
    `<ellipse cx="800" cy="580" rx="300" ry="26" fill="#ffae3a" opacity=".35" filter="url(#rB14)"/>` +
    `<ellipse cx="800" cy="206" rx="160" ry="18" fill="#ffae3a" opacity=".4" filter="url(#rB6)"/>` +
    [[250, 205], [1350, 205], [420, 470], [1180, 470], [120, 340], [1480, 340]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="40" ry="20" fill="#ffae3a" opacity=".25" filter="url(#rB6)"/>`).join("");

  let haze = "";
  for (let i = 0; i < 9; i++) {
    const x = 610 + i * 48 + (rand() - 0.5) * 20;
    const pts = Array.from({ length: 14 }, (_, j) => [x + Math.sin(j * 0.9 + i) * (6 + j * 0.8), 560 - j * 38]);
    haze += `<path d="${pathOf(pts)}" fill="none" stroke="#ffc070" stroke-width="${f(14 + rand() * 20)}" opacity="${(0.03 + rand() * 0.04).toFixed(2)}" stroke-linecap="round"/>`;
  }
  let hazeLines = "";
  for (let i = 0; i < 10; i++) {
    const y = 120 + i * 45;
    const pts = Array.from({ length: 16 }, (_, j) => [560 + j * 32, y + Math.sin(j * 1.1 + i * 0.7) * 5]);
    hazeLines += pathOf(pts);
  }

  let steam = "";
  [[180, 128, -1], [1500, 410, 1], [420, 580, -1], [1250, 100, 1]].forEach(([x, y, dir]) => {
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      steam += `<ellipse cx="${f(x + dir * k * 60 + (rand() - 0.5) * 20)}" cy="${f(y - k * 110)}" rx="${f(20 + k * 60)}" ry="${f(14 + k * 36)}" fill="url(#rSteam)" opacity="${f(0.9 - k * 0.5)}"/>`;
    }
  });

  const defs =
    `<linearGradient id="rBg" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#140800"], [0.45, "#2a1400"], [0.75, "#1a0b00"], [1, "#070300"]])}</linearGradient>` +
    `<radialGradient id="rWall" gradientUnits="userSpaceOnUse" cx="800" cy="380" r="820">${stops([[0, "#4a2608"], [0.4, "#2a1404"], [1, "#0c0500"]])}</radialGradient>` +
    `<linearGradient id="rFloor" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#2a1404"], [0.3, "#120800"], [1, "#050200"]])}</linearGradient>` +
    `<linearGradient id="rShade" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#050200", 0], [0.45, "#050200", 0.55], [1, "#050200", 0.92]])}</linearGradient>` +
    `<linearGradient id="rPipeV" x1="0" y1="0" x2="1" y2="0">${stops([[0, "#0a0604"], [0.22, "#4a3424"], [0.36, "#8a6a4e"], [0.5, "#3a281a"], [0.82, "#120a06"], [1, "#8a4a14"]])}</linearGradient>` +
    `<linearGradient id="rPipeH" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#0a0604"], [0.22, "#4a3424"], [0.36, "#8a6a4e"], [0.5, "#3a281a"], [0.82, "#120a06"], [1, "#8a4a14"]])}</linearGradient>` +
    `<linearGradient id="rSteelL" x1="0" y1="0" x2="1" y2="0">${stops([[0, "#4a3626"], [0.25, "#241810"], [0.7, "#120a06"], [1, "#a0601c"]])}</linearGradient>` +
    `<linearGradient id="rSteelR" x1="0" y1="0" x2="1" y2="0">${stops([[0, "#a0601c"], [0.3, "#241810"], [0.75, "#120a06"], [1, "#3a2818"]])}</linearGradient>` +
    `<linearGradient id="rCap" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#1a0e06"], [0.55, "#3a2412"], [1, "#6a3a14"]])}</linearGradient>` +
    `<linearGradient id="rBase" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#8a5420"], [0.35, "#3a2410"], [1, "#120803"]])}</linearGradient>` +
    `<linearGradient id="rRing" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#7a5a3a"], [0.4, "#3a2614"], [1, "#0e0703"]])}</linearGradient>` +
    `<linearGradient id="rDeck" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#3a2412"], [1, "#0e0703"]])}</linearGradient>` +
    `<linearGradient id="rPlasma" x1="0" y1="0" x2="1" y2="0">${stops([[0, "#5a2400"], [0.25, "#e0701a"], [0.5, "#ffd98a"], [0.75, "#e0701a"], [1, "#5a2400"]])}</linearGradient>` +
    `<linearGradient id="rGlass" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#3a1400", 0.5], [0.15, "#3a1400", 0], [0.85, "#3a1400", 0], [1, "#3a1400", 0.5]])}</linearGradient>` +
    `<radialGradient id="rGlow" gradientUnits="userSpaceOnUse" cx="800" cy="380" r="560">${stops([[0, "#ffb040", 0.42], [0.3, "#ff8a1a", 0.2], [0.7, "#c04a00", 0.06], [1, "#c04a00", 0]])}</radialGradient>` +
    `<radialGradient id="rSteam">${stops([[0, "#f5e6d0", 0.16], [0.6, "#f5e6d0", 0.06], [1, "#f5e6d0", 0]])}</radialGradient>` +
    `<radialGradient id="rSpark">${stops([[0, "#ffffff"], [0.15, "#ffe0a0", 0.9], [0.5, "#ff9a2a", 0.3], [1, "#ff9a2a", 0]])}</radialGradient>` +
    `<radialGradient id="rEmber">${stops([[0, "#fff0c0"], [0.25, "#ffae3a", 0.85], [0.6, "#ff7a1a", 0.25], [1, "#ff7a1a", 0]])}</radialGradient>` +
    blur("rB2", 2) + blur("rB6", 6) + blur("rB14", 14);

  return {
    box: BOX,
    defs,
    layers: [
      { markup: base },
      { markup: glow, anim: { type: "pulse", min: 0.7, max: 1, speed: 1.5 }, blend: "lighter" },
      { markup: `<g filter="url(#rB6)">${haze}</g><path d="${hazeLines}" fill="none" stroke="#ffc070" stroke-width="1.2" opacity=".06" filter="url(#rB2)"/>`, anim: { type: "float", amp: 6, speed: 1.2 }, blend: "lighter" },
      { markup: steam, anim: { type: "pulse", min: 0.35, max: 1, speed: 0.9 } },
      { markup: sparks(1190, 318, 34, 110, 1.2) + sparks(380, 150, 16, 60, 1.9), anim: { type: "flicker", min: 0.15, max: 1, speed: 1.6 }, blend: "lighter" },
      { markup: particles(rand, 55, [0, 90, 1600, 640], [2.5, 7], "rEmber"), anim: { type: "float", amp: 14, speed: 0.7 }, blend: "lighter" },
    ],
  };
}

// ---------------------------------------------------------------------------
// temporal_rift
// ---------------------------------------------------------------------------

/** Wedge of a shattered clock face: translucent dial glass, brass bezel arc and ticks. */
function clockShard(rand, cx, cy, R, a0, a1, rot) {
  const inner = jagged(rand, polar(0, 0, R * 1.02, a1), polar(0, 0, R * (0.15 + rand() * 0.2), (a0 + a1) / 2), 3, R * 0.08);
  const inner2 = jagged(rand, polar(0, 0, R * (0.15 + rand() * 0.2), (a0 + a1) / 2), polar(0, 0, R * 1.02, a0), 3, R * 0.08);
  const outer = [];
  for (let a = a0; a <= a1 + 1e-6; a += (a1 - a0) / 8) outer.push(polar(0, 0, R * 1.02, a));
  const shape = pathOf([...outer, ...inner.slice(1), ...inner2.slice(1, -1)], true);
  let ticks = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    if (a < a0 || a > a1) continue;
    ticks += `M${pt(polar(0, 0, R * (i % 5 ? 0.78 : 0.66), a))}L${pt(polar(0, 0, R * 0.84, a))}`;
  }
  const k = R / 100;
  return (
    `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})">` +
    `<path d="${shape}" fill="url(#tGlass)" stroke="${INK}" stroke-width="${f(2 * k)}" stroke-linejoin="round"/>` +
    `<path d="${ticks}" stroke="#e8d0ff" stroke-width="${f(1.4 * k)}" opacity=".6"/>` +
    `<path d="${arcPath(0, 0, R * 0.93, a0 + 0.01, a1 - 0.01)}" fill="none" stroke="${INK}" stroke-width="${f(14 * k)}"/>` +
    `<path d="${arcPath(0, 0, R * 0.93, a0 + 0.01, a1 - 0.01)}" fill="none" stroke="url(#tBrass)" stroke-width="${f(11 * k)}"/>` +
    `<path d="${arcPath(0, 0, R * 0.95, a0 + 0.03, a1 - 0.03)}" fill="none" stroke="#ffe0a8" stroke-width="${f(1.4 * k)}" opacity=".55"/>` +
    `<path d="${pathOf(inner)}${pathOf(inner2)}" fill="none" stroke="#ff6ae0" stroke-width="${f(1.6 * k)}" opacity=".8"/>` +
    `</g>`
  );
}

/** Half a gear, snapped along a jagged line. */
function gearShard(rand, id, cx, cy, R, teeth, rot) {
  const cut = jagged(rand, [-R * 1.2, R * 0.1], [R * 1.2, -R * 0.15], 7, R * 0.12);
  const clip = pathOf([...cut, [R * 1.3, -R * 1.3], [-R * 1.3, -R * 1.3]], true);
  return (
    `<clipPath id="${id}"><path d="${clip}"/></clipPath>` +
    `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})">` +
    `<g clip-path="url(#${id})">${gear(0, 0, R, teeth, { fill: "url(#tBrass)", rim: "#ffe0a8", accent: "#ff4ad0", sw: Math.max(1.5, R * 0.025), spokes: 5 })}</g>` +
    `<path d="${pathOf(cut.filter(([x]) => Math.abs(x) < R * 0.86))}" fill="none" stroke="#ff6ae0" stroke-width="${f(Math.max(1.2, R * 0.02))}" clip-path="url(#${id})"/>` +
    `</g>`
  );
}

/**
 * Temporal rift: space-time shattered like glass around a violet vortex.
 * A jagged magenta tear splits the centre, a ghost clock dial rings it, and
 * rocks, clock shards and snapped gears hang in the void. The vortex arms
 * spin in two directions, the tear pulses, debris floats, energy arcs flicker.
 */
function temporalRift() {
  const rand = rng(2012);
  const V = [800, 430];

  // Shattered panes radiating out from the vortex.
  let panes = "";
  let paneEdges = "";
  const spokes = 13;
  const spokeAngles = Array.from({ length: spokes }, (_, i) => (i / spokes) * TAU + (rand() - 0.5) * 0.3);
  const spokeLines = spokeAngles.map((a) => jagged(rand, polar(V[0], V[1], 380, a), polar(V[0], V[1], 1100, a + (rand() - 0.5) * 0.2), 6, 22));
  const tints = ["#ff3aa0", "#9b5cff", "#3a5aff", "#000000", "#c040ff", "#000000"];
  for (let i = 0; i < spokes; i++) {
    const a = spokeLines[i];
    const b = spokeLines[(i + 1) % spokes];
    panes += `<path d="${pathOf([...a, ...b.slice().reverse()], true)}" fill="${tints[i % tints.length]}" opacity="${(0.025 + rand() * 0.04).toFixed(2)}"/>`;
    paneEdges += pathOf(a);
  }
  let ringCracks = "";
  [470, 640, 860].forEach((r) => {
    for (let i = 0; i < spokes; i++) {
      if (rand() < 0.45) continue;
      const a0 = spokeAngles[i] + 0.04;
      const a1 = spokeAngles[(i + 1) % spokes] + (i === spokes - 1 ? TAU : 0) - 0.04;
      const pts = [];
      for (let k = 0; k <= 6; k++) pts.push(polar(V[0], V[1], r + (rand() - 0.5) * 30, a0 + ((a1 - a0) * k) / 6));
      ringCracks += pathOf(pts);
    }
  });

  // Ghost clock dial ringing the vortex.
  let ghostTicks = "";
  let ghostMajor = "";
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    if (i % 5 === 0) ghostMajor += `M${pt(polar(V[0], V[1], 452, a))}L${pt(polar(V[0], V[1], 500, a))}`;
    else ghostTicks += `M${pt(polar(V[0], V[1], 470, a))}L${pt(polar(V[0], V[1], 490, a))}`;
  }

  // Vortex arms: logarithmic spirals faded by a radial gradient stroke.
  const spiral = (arms, turns, r0, r1, dir, jitter) => {
    let d = "";
    for (let k = 0; k < arms; k++) {
      const off = (k / arms) * TAU + rand() * 0.3;
      const pts = [];
      const n = 70;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const r = r0 * (r1 / r0) ** t;
        const a = off + dir * t * turns * TAU;
        pts.push(polar(V[0], V[1], r + (rand() - 0.5) * jitter * t, a));
      }
      d += pathOf(pts);
    }
    return d;
  };
  const armsA = spiral(5, 1.1, 18, 420, 1, 10);
  const armsB = spiral(3, 0.8, 30, 400, -1, 16);
  let vortexDust = "";
  for (let i = 0; i < 160; i++) {
    const t = rand();
    const r = 30 * (420 / 30) ** t;
    const a = rand() * TAU;
    const [x, y] = polar(V[0], V[1], r, a);
    vortexDust += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + rand() * 1.8)}" fill="#f0c8ff" opacity="${(0.2 + 0.6 * (1 - t)).toFixed(2)}"/>`;
  }

  // The tear.
  const tear = jagged(rand, [792, 250], [812, 640], 16, 14);
  let tearBranches = "";
  [3, 6, 10, 13].forEach((i) => {
    const [x, y] = tear[i];
    tearBranches += pathOf(jagged(rand, [x, y], [x + (i % 2 ? 1 : -1) * (40 + rand() * 50), y + (rand() - 0.5) * 60], 4, 6));
  });

  // Debris: far (small, dim) and near (larger, detailed).
  const far =
    rock(rand, 250, 150, 22, { sw: 1.5 }) + rock(rand, 430, 90, 14, { sw: 1.2 }) + rock(rand, 1180, 110, 18, { sw: 1.4 }) +
    rock(rand, 1420, 250, 16, { sw: 1.3 }) + rock(rand, 120, 470, 20, { sw: 1.5 }) + rock(rand, 1500, 540, 18, { sw: 1.4 }) +
    rock(rand, 340, 560, 12, { sw: 1 }) + rock(rand, 1270, 580, 14, { sw: 1.1 }) + rock(rand, 560, 170, 10, { sw: 1 }) +
    clockShard(rand, 1060, 150, 34, -0.3, 0.9, 40) + clockShard(rand, 520, 580, 30, 1.4, 2.6, -20) +
    gearShard(rand, "tg1", 1350, 420, 30, 12, 70) + gearShard(rand, "tg2", 220, 330, 26, 10, -30);
  const near =
    clockShard(rand, 250, 250, 150, -1.9, -0.3, 18) +
    gearShard(rand, "tg3", 1390, 330, 104, 20, 160) +
    rock(rand, 1230, 120, 46, { sw: 2.5 }) +
    `<path d="${handPath(120, 12)}" transform="translate(1180 150) rotate(-160)" fill="#1a1024" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="${handPath(120, 12)}" transform="translate(1180 150) rotate(-160)" fill="none" stroke="#ff6ae0" stroke-width="1" opacity=".6"/>` +
    rock(rand, 90, 620, 38, { sw: 2.2 }) +
    rock(rand, 1510, 650, 42, { sw: 2.2 }) +
    `<path d="${handPath(170, 14)}" transform="translate(420 470) rotate(28)" fill="#1a1024" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="${handPath(170, 14)}" transform="translate(420 470) rotate(28)" fill="none" stroke="#ff6ae0" stroke-width="1.2" opacity=".6"/>`;

  // Energy arcs from the vortex rim to the debris.
  let arcCore = "";
  [[[700, 330], [270, 270]], [[900, 320], [1330, 350]], [[860, 520], [1480, 640]], [[720, 540], [120, 600]], [[830, 290], [1210, 130]]].forEach(([a, b]) => {
    const main = jagged(rand, a, b, 12, 24);
    arcCore += pathOf(main);
    const j = 3 + Math.floor(rand() * 6);
    arcCore += pathOf(jagged(rand, main[j], [main[j][0] + (rand() - 0.5) * 120, main[j][1] + (rand() - 0.5) * 100], 4, 10));
  });

  const base =
    `<rect width="1600" height="900" fill="url(#tBg)"/>` +
    `<ellipse cx="1150" cy="250" rx="520" ry="320" fill="url(#tNebM)"/>` +
    `<ellipse cx="380" cy="300" rx="520" ry="360" fill="url(#tNebV)"/>` +
    particles(rand, 260, [0, 0, 1600, 900], [0.5, 1.4], "tStar", 600) +
    panes +
    `<path d="${paneEdges}${ringCracks}" fill="none" stroke="#c070ff" stroke-width="6" opacity=".12" filter="url(#tB5)"/>` +
    `<path d="${paneEdges}${ringCracks}" fill="none" stroke="#e0b0ff" stroke-width="1.3" stroke-linejoin="round" opacity=".35"/>` +
    `<circle cx="${V[0]}" cy="${V[1]}" r="476" fill="none" stroke="#b070ff" stroke-width="3" opacity=".16"/>` +
    `<circle cx="${V[0]}" cy="${V[1]}" r="506" fill="none" stroke="#b070ff" stroke-width="1.5" opacity=".12"/>` +
    `<path d="${ghostTicks}" stroke="#c890ff" stroke-width="2" opacity=".16"/>` +
    `<path d="${ghostMajor}" stroke="#d8a8ff" stroke-width="7" opacity=".18"/>` +
    `<circle cx="${V[0]}" cy="${V[1]}" r="560" fill="url(#tEye)"/>` +
    far +
    `<rect y="600" width="1600" height="300" fill="url(#tShade)"/>`;

  const vortexA =
    `<path d="${armsA}" fill="none" stroke="url(#tArm)" stroke-width="34" opacity=".35" filter="url(#tB12)"/>` +
    `<path d="${armsA}" fill="none" stroke="url(#tArm)" stroke-width="7" opacity=".55" filter="url(#tB2)"/>` +
    `<path d="${armsA}" fill="none" stroke="url(#tArmCore)" stroke-width="1.6"/>` +
    vortexDust;
  const vortexB =
    `<path d="${armsB}" fill="none" stroke="url(#tArmB)" stroke-width="50" opacity=".3" filter="url(#tB12)"/>` +
    `<path d="${armsB}" fill="none" stroke="url(#tArmB)" stroke-width="4" opacity=".5"/>`;

  const tearD = pathOf(tear);
  const core =
    `<circle cx="${V[0]}" cy="${V[1]}" r="220" fill="url(#tCore)"/>` +
    `<path d="${tearD}" fill="none" stroke="#a020c8" stroke-width="40" opacity=".35" filter="url(#tB12)"/>` +
    `<path d="${taper(tear, 9)}" fill="#ff3a90" opacity=".85" filter="url(#tB2)"/>` +
    `<path d="${taper(tear, 3)}" fill="#fff0fa"/>` +
    `<path d="${tearBranches}" fill="none" stroke="#ff7ad0" stroke-width="2" stroke-linejoin="round" opacity=".8"/>`;

  const arcs =
    `<path d="${arcCore}" fill="none" stroke="#b464ff" stroke-width="7" opacity=".45" filter="url(#tB5)"/>` +
    `<path d="${arcCore}" fill="none" stroke="#e8d0ff" stroke-width="1.6" stroke-linejoin="round"/>`;

  const defs =
    `<radialGradient id="tBg" gradientUnits="userSpaceOnUse" cx="800" cy="430" r="1000">${stops([[0, "#1e0436"], [0.3, "#14002a"], [0.65, "#0a001a"], [1, "#030008"]])}</radialGradient>` +
    `<radialGradient id="tNebM">${stops([[0, "#6a0a5a", 0.45], [0.5, "#4a0848", 0.2], [1, "#4a0848", 0]])}</radialGradient>` +
    `<radialGradient id="tNebV">${stops([[0, "#300a70", 0.5], [0.5, "#220850", 0.22], [1, "#220850", 0]])}</radialGradient>` +
    `<radialGradient id="tEye" gradientUnits="userSpaceOnUse" cx="800" cy="430" r="560">${stops([[0, "#2a0636", 0.9], [0.45, "#1a0430", 0.6], [0.75, "#1a0430", 0.25], [1, "#1a0430", 0]])}</radialGradient>` +
    `<radialGradient id="tStar">${stops([[0, "#ffffff"], [0.4, "#e0c8ff", 0.6], [1, "#b080ff", 0]])}</radialGradient>` +
    `<linearGradient id="tShade" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#030008", 0], [0.45, "#030008", 0.55], [1, "#030008", 0.92]])}</linearGradient>` +
    `<radialGradient id="tArm" gradientUnits="userSpaceOnUse" cx="800" cy="430" r="430">${stops([[0, "#ff6ae0", 0.2], [0.15, "#ff5ad8", 0.8], [0.5, "#9b3cff", 0.6], [1, "#6a2aff", 0]])}</radialGradient>` +
    `<radialGradient id="tArmCore" gradientUnits="userSpaceOnUse" cx="800" cy="430" r="430">${stops([[0, "#ffffff", 0.2], [0.2, "#ffd8f8", 0.9], [0.6, "#d8a0ff", 0.5], [1, "#d8a0ff", 0]])}</radialGradient>` +
    `<radialGradient id="tArmB" gradientUnits="userSpaceOnUse" cx="800" cy="430" r="410">${stops([[0, "#6a5aff", 0.1], [0.3, "#6a5aff", 0.7], [1, "#3a2aff", 0]])}</radialGradient>` +
    `<radialGradient id="tCore" gradientUnits="userSpaceOnUse" cx="800" cy="430" r="220">${stops([[0, "#ff3aa0", 0.45], [0.4, "#c020c0", 0.2], [1, "#6a10a0", 0]])}</radialGradient>` +
    `<linearGradient id="tGlass" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#e8c8ff", 0.55], [0.45, "#7a4ac0", 0.35], [1, "#2a1050", 0.55]])}</linearGradient>` +
    `<linearGradient id="tBrass" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#d8a868"], [0.35, "#7a5430"], [0.7, "#2e1c14"], [1, "#6a2a5a"]])}</linearGradient>` +
    `<linearGradient id="rockG" x1="0" y1="0" x2="1" y2="1">${stops([[0, "#6a5a86"], [0.4, "#2e2444"], [1, "#0c0818"]])}</linearGradient>` +
    blur("tB2", 2) + blur("tB5", 5) + blur("tB12", 12);

  return {
    box: BOX,
    defs,
    layers: [
      { markup: base },
      { markup: vortexB, anim: { type: "spin", speed: -0.06, pivot: V }, blend: "lighter" },
      { markup: vortexA, anim: { type: "spin", speed: 0.12, pivot: V }, blend: "lighter" },
      { markup: core, anim: { type: "pulse", min: 0.6, max: 1, speed: 2 }, blend: "lighter" },
      { markup: near, anim: { type: "float", amp: 9, speed: 0.55, phase: 1.5 } },
      { markup: arcs, anim: { type: "flicker", min: 0, max: 1, speed: 1.2 }, blend: "lighter" },
      { markup: `<rect y="640" width="1600" height="260" fill="url(#tShade)"/>` },
    ],
  };
}

export const BACKGROUNDS = {
  temporal_rift: temporalRift(),
  reactor: reactor(),
  boss_lair: bossLair(),
  deep_space: deepSpace(),
};
