/**
 * Build-time projector for first-person viewmodel SVG art.
 *
 * Weapons are authored as a handful of convex solids in a gun-local 3D space
 * (x right, y up, z forward from the rear of the receiver, 1 unit ≈ the legacy
 * viewmodel unit) and flattened once into SVG path strings. That keeps
 * foreshortening, face culling and key/rim lighting consistent across all
 * eight weapons instead of hand-drawing every face. Nothing here runs per frame.
 *
 * The projection is a pinhole camera at the eye looking straight ahead: the
 * gun sits at offset (ox, oy, oz) in millimetres, so every edge parallel to
 * the barrel converges on the screen centre (the reticle) and the rear of the
 * gun is much larger than the muzzle. A small height shear (kx < 0, an
 * inward cant) opens up the right flank and the back of the shooter's glove.
 * Output units are viewmodel units: 4 px at 720p, origin at screen centre.
 */

export const INK = "#04060b";

export const f = (n) => Math.round(n * 10) / 10;
const pt = ([x, y]) => `${f(x)},${f(y)}`;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Key light upper-left and slightly behind the camera; rim light behind-right.
const KEY = norm([-0.55, 0.78, -0.3]);
const RIM = norm([0.8, 0.2, 0.55]);

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  const A = hex(a);
  const B = hex(b);
  const k = Math.max(0, Math.min(1, t));
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
function ramp(tones, v) {
  const x = Math.max(0, Math.min(1, v)) * (tones.length - 1);
  const i = Math.min(tones.length - 2, Math.floor(x));
  return mix(tones[i], tones[i + 1], x - i);
}

/** Newell normal — robust for any planar polygon regardless of winding. */
function newell(poly) {
  const n = [0, 0, 0];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return norm(n);
}
const centroid = (pts) => {
  const c = [0, 0, 0];
  for (const p of pts) for (let i = 0; i < 3; i++) c[i] += p[i] / pts.length;
  return c;
};

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Rounded-rectangle section (CCW) in a 2D plane, `c` = corner cut. */
export function rrect(x0, x1, y0, y1, c = 0) {
  if (!c) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return [
    [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c],
    [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
  ];
}
export function circle(cx, cy, r, n = 14, rot = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/**
 * @param {object} cam  { F (focal length, units), ox, oy, oz (gun offset from the eye, mm), kx (cant shear) }
 * @param {string} accent  character energy colour (emissives, rim light)
 */
export function createScene(cam, accent) {
  const { F, ox, oy, oz, kx = 0 } = cam;
  const eye = [-ox, -oy, -oz];
  const core = mix(accent, "#ffffff", 0.55);

  const layers = {};
  let cur = null;
  const target = (name) => {
    if (!layers[name]) layers[name] = { svg: "", min: [Infinity, Infinity], max: [-Infinity, -Infinity] };
    cur = layers[name];
    return cur;
  };
  target("body");
  const grow = (L, p, pad = 0) => {
    L.min[0] = Math.min(L.min[0], p[0] - pad);
    L.min[1] = Math.min(L.min[1], p[1] - pad);
    L.max[0] = Math.max(L.max[0], p[0] + pad);
    L.max[1] = Math.max(L.max[1], p[1] + pad);
  };

  /** Units per millimetre at a gun-space point's depth. */
  const k = ([, , z]) => F / Math.max(20, z + oz);
  /** Project a gun-space point (mm) to viewmodel units. */
  const P = (p) => {
    const q = k(p);
    return [(p[0] + ox + p[1] * kx) * q, -(p[1] + oy) * q];
  };
  // Which screen winding means "facing the camera"? Probe with a floor-facing quad below the eye.
  const area2 = (p2) => {
    let a = 0;
    for (let i = 0; i < p2.length; i++) {
      const j = (i + 1) % p2.length;
      a += p2[i][0] * p2[j][1] - p2[j][0] * p2[i][1];
    }
    return a;
  };
  const probe = [[-5, -oy - 60, 200], [5, -oy - 60, 200], [5, -oy - 60, 210], [-5, -oy - 60, 210]];
  const VIS = Math.sign(area2((dot(newell(probe), [0, 1, 0]) < 0 ? probe.slice().reverse() : probe).map(P))) || 1;
  const path = (pts2, close = true) => {
    for (const p of pts2) grow(cur, p);
    return "M" + pts2.map(pt).join("L") + (close ? "Z" : "");
  };
  const emit = (markup) => {
    cur.svg += markup;
  };

  /**
   * Draw a convex solid given as a list of 3D faces. Back faces are culled
   * against the virtual eye, the rest are painter-sorted, lit and inked.
   */
  function solid(faces, mat, o = {}) {
    const { smooth = false, rim = 0.22, amb = 0.2, spec = true, ink = 0.5, edge = 0.5, depth = true } = o;
    const all = faces.flat();
    const c = centroid(all);
    const vis = [];
    for (const face of faces) {
      let n = newell(face);
      const fc = centroid(face);
      if (dot(n, sub(fc, c)) < 0) n = n.map((v) => -v);
      // Wind the face to its outward normal, then cull by projected winding.
      const wound = dot(newell(face), n) < 0 ? face.slice().reverse() : face;
      const a = area2(wound.map(P));
      if (Math.sign(a) !== VIS || Math.abs(a) < 0.02) continue;
      vis.push({ face, n, dist: Math.hypot(...sub(eye, fc)) });
    }
    vis.sort((a, b) => b.dist - a.dist);
    let out = "";
    for (const { face, n } of vis) {
      const lit = Math.max(0, dot(n, KEY));
      let col = ramp(mat, amb + (1 - amb) * lit * 0.86);
      col = mix(col, accent, Math.max(0, dot(n, RIM)) * rim);
      const p2 = face.map(P);
      const seam = smooth ? `stroke="${col}" stroke-width=".3"` : `stroke="${INK}" stroke-opacity="${edge}" stroke-width=".22"`;
      out += `<path d="${path(p2)}" fill="${col}" ${seam} stroke-linejoin="round"/>`;
      const h = Math.max(...p2.map((p) => p[1])) - Math.min(...p2.map((p) => p[1]));
      if (depth && h > 14) out += `<path d="${path(p2)}" fill="url(#vmDepth)"/>`;
      // Machined specular strip on faces that catch the key light.
      if (spec && !smooth && face.length === 4 && lit > 0.62) {
        const [a0, b0, b1, a1] = face;
        const band = [lerp3(a0, b0, 0.1), lerp3(a0, b0, 0.24), lerp3(a1, b1, 0.24), lerp3(a1, b1, 0.1)].map(P);
        out += `<path d="${path(band)}" fill="#e8f4ff" fill-opacity="${f(Math.min(0.42, (lit - 0.62) * 1.6 + 0.12))}"/>`;
      }
      if (smooth && lit > 0.8) {
        out += `<path d="${path(p2)}" fill="#e8f4ff" fill-opacity="${f((lit - 0.8) * 2.2)}"/>`;
      }
    }
    // Silhouette ink plus accent rim on the right-facing outline edges.
    const hp = hull(all.map(P));
    if (ink) out += `<path d="${path(hp)}" fill="none" stroke="${INK}" stroke-width="${ink}" stroke-linejoin="round"/>`;
    if (rim) {
      const hc = hp.reduce((a, p) => [a[0] + p[0] / hp.length, a[1] + p[1] / hp.length], [0, 0]);
      let d = "";
      for (let i = 0; i < hp.length; i++) {
        const a = hp[i];
        const b = hp[(i + 1) % hp.length];
        let nx = b[1] - a[1];
        let ny = -(b[0] - a[0]);
        const mx = (a[0] + b[0]) / 2 - hc[0];
        const my = (a[1] + b[1]) / 2 - hc[1];
        if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
        const l = Math.hypot(nx, ny) || 1;
        if (nx / l > 0.55) d += `M${pt(a)}L${pt(b)}`;
      }
      if (d) out += `<path d="${d}" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width=".32" stroke-linecap="round"/>`;
    }
    emit(out);
  }

  /** Side faces + caps between two rings with the same vertex count. */
  function loft(A, B, mat, o) {
    const faces = [A.slice(), B.slice()];
    for (let i = 0; i < A.length; i++) {
      const j = (i + 1) % A.length;
      faces.push([A[i], A[j], B[j], B[i]]);
    }
    solid(faces, mat, o);
  }

  /** Prism along z from a 2D (x, y) section; `taper` scales the far end about `pivot`. */
  function prismZ(section, z0, z1, mat, o = {}) {
    const { taper = 1, pivot = [0, 0], dy1 = 0, dx1 = 0 } = o;
    const A = section.map(([x, y]) => [x, y, z0]);
    const B = section.map(([x, y]) => [pivot[0] + (x - pivot[0]) * taper + dx1, pivot[1] + (y - pivot[1]) * taper + dy1, z1]);
    loft(A, B, mat, o);
  }
  const boxZ = (x0, x1, y0, y1, z0, z1, mat, o = {}) => prismZ(rrect(x0, x1, y0, y1, o.ch || 0), z0, z1, mat, o);
  const cylZ = (cx, cy, r, z0, z1, mat, o = {}) =>
    prismZ(circle(cx, cy, r, o.n || 14, o.rot || 0), z0, z1, mat, { smooth: true, pivot: [cx, cy], ...o });

  /** Vertical member (pistol grip, foregrip) lofted from a top xz-section to a bottom one. */
  function post({ yTop, yBot, top, bot }, mat, o) {
    const A = top.map(([x, z]) => [x, yTop, z]);
    const B = bot.map(([x, z]) => [x, yBot, z]);
    loft(A, B, mat, o);
  }

  /** Flat decal polygon in 3D (panel, vent, slot). */
  function poly(pts3, fill, o = {}) {
    const { op = 1, stroke = null, sw = 0.2, sop = 1 } = o;
    emit(`<path d="${path(pts3.map(P))}" fill="${fill}" fill-opacity="${op}"` +
      (stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-opacity="${sop}" stroke-linejoin="round"` : "") + "/>");
  }
  function line(pts3, color, w = 0.25, op = 1) {
    emit(`<path d="${path(pts3.map(P), false)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  /** Circle lying in a plane: axis "z" (faces the camera along the barrel), "y" (lies on a top face) or "x". */
  function disc(c, r, axis = "z", n = 16) {
    return circle(0, 0, r, n).map(([a, b]) =>
      axis === "z" ? [c[0] + a, c[1] + b, c[2]] : axis === "y" ? [c[0] + a, c[1], c[2] + b] : [c[0], c[1] + a, c[2] + b]);
  }

  /** Emissive polyline: bright core in the current layer, soft bloom in the glow layer. */
  function glowLine(pts3, w = 0.6, o = {}) {
    const { close = false, bloom = 1 } = o;
    const p2 = pts3.map(P);
    const d = path(p2, close);
    emit(`<path d="${d}" fill="none" stroke="${accent}" stroke-width="${f(w * 1.7)}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${core}" stroke-width="${f(w * 0.7)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    const prev = cur;
    target("glow");
    for (const p of p2) grow(cur, p, 6);
    emit(`<path d="${d}" fill="none" stroke="${accent}" stroke-width="${f(w * 2.6 * bloom)}" stroke-opacity=".75" stroke-linecap="round" stroke-linejoin="round" filter="url(#vmBloom)"/>`);
    cur = prev;
  }
  function glowPoly(pts3, o = {}) {
    const { bloom = 1, inner = true } = o;
    const p2 = pts3.map(P);
    const d = path(p2);
    emit(`<path d="${d}" fill="${accent}" stroke="${INK}" stroke-width=".25" stroke-opacity=".7"/>`);
    if (inner) {
      const c = p2.reduce((a, p) => [a[0] + p[0] / p2.length, a[1] + p[1] / p2.length], [0, 0]);
      emit(`<path d="${path(p2.map((p) => [c[0] + (p[0] - c[0]) * 0.55, c[1] + (p[1] - c[1]) * 0.55]))}" fill="${core}"/>`);
    }
    const prev = cur;
    target("glow");
    for (const p of p2) grow(cur, p, 7);
    emit(`<path d="${d}" fill="${accent}" fill-opacity=".7" stroke="${accent}" stroke-opacity=".7" stroke-width="${f(1.2 * bloom)}" filter="url(#vmBloom)"/>`);
    cur = prev;
  }

  return {
    P, k, F, eye, accent, core, layers, target, emit, path, grow,
    solid, loft, prismZ, boxZ, cylZ, post, poly, line, disc, glowLine, glowPoly,
  };
}
