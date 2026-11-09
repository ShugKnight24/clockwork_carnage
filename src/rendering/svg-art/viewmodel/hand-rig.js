/**
 * Articulated viewmodel hands: a gloved human hand as a skeleton in the
 * weapon's 3D space (millimetres), posed against the grip it holds.
 *
 * A hand is a palm — a convex block of metacarpals fanning from the wrist to
 * the knuckle row, with the thenar pad at the thumb's root — four fingers of
 * three phalanges each (proximal : middle : distal about 5 : 3 : 2, joints
 * tapering toward the tip) and a thumb (metacarpal in the palm, then proximal
 * and distal) that opposes them. The glove adds its thickness to every radius.
 *
 * Poses are solved against the weapon's actual grip geometry: each finger
 * walks the grip's cross-section, offset by its own radius, so every joint
 * sits on the surface and every phalanx keeps its length as it rounds a
 * corner. The pose functions return plain models; hands.js draws them
 * (createHandArt → rig) through the scene's projection, segment by segment in
 * painter order, hidden behind the weapon parts given as occluders.
 *
 * A weapon adopts these hands by passing its grip (`g`: pistol grip post) or
 * handguard (`hg`) to the poses below; see weapons.js.
 */

// ── vectors ─────────────────────────────────────────────────────────────────
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => mul(a, 1 / (len(a) || 1));
export const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ── proportions ─────────────────────────────────────────────────────────────
/**
 * A big gloved hand, mm. L: phalanx lengths, joint to joint (the distal one
 * to the end of the fingertip); r: radius at MCP, PIP, DIP and fingertip.
 * The middle finger is about as long as the palm.
 */
const FINGERS = [
  { id: "index", L: [46, 27, 22], r: [10.6, 9.8, 9, 8.2] },
  { id: "middle", L: [50, 30, 23], r: [11, 10.2, 9.3, 8.4] },
  { id: "ring", L: [47, 29, 22], r: [10.6, 9.8, 9, 8.1] },
  { id: "little", L: [38, 23, 19], r: [9.4, 8.7, 8, 7.3] },
];
/** Thumb past the palm: proximal and distal phalanx; r at MCP, IP and tip. */
const THUMB = { L: [34, 29], r: [12.4, 11.2, 9.8] };
/** Palm block: metacarpal radius at the knuckles and at the base, wrist radius. */
const PALM = { rMcp: 1.22, rBase: 14, wrist: 21 };
// Joints sit a little inside the radius: the glove presses against the grip.
const PRESS = 0.9;
/** The hands' size against the weapons: a gloved hand about as wide as a pistol grip is long, plus a little. */
export const HAND_SCALE = 0.88;
// Support fingers' lean along the handguard (sine of the angle off its section).
const LEAN = 0.52;

const scaled = (s) => ({
  fingers: FINGERS.map((f) => ({ ...f, L: f.L.map((v) => v * s), r: f.r.map((v) => v * s) })),
  thumb: { L: THUMB.L.map((v) => v * s), r: THUMB.r.map((v) => v * s) },
  palm: { rMcp: PALM.rMcp, rBase: PALM.rBase * s, wrist: PALM.wrist * s },
});

// ── sections ────────────────────────────────────────────────────────────────
/**
 * Dense contour of a rounded rectangle in an (a, b) plane, offset `d` out
 * from its surface, walked CCW (bottom +a, right +b, top −a, left −b). Each
 * sample carries its outward normal.
 */
export function section(a0, a1, b0, b1, c, d, step = 1) {
  const R = c + d;
  const out = [];
  const straight = (p0, p1, n) => {
    const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const k = Math.max(1, Math.ceil(l / step));
    for (let i = 0; i < k; i++) out.push({ p: [p0[0] + ((p1[0] - p0[0]) * i) / k, p0[1] + ((p1[1] - p0[1]) * i) / k], n });
  };
  const corner = (cx, cy, t0) => {
    const k = Math.max(2, Math.ceil((R * Math.PI) / 2 / step));
    for (let i = 0; i < k; i++) {
      const t = ((t0 + (90 * i) / k) * Math.PI) / 180;
      out.push({ p: [cx + Math.cos(t) * R, cy + Math.sin(t) * R], n: [Math.cos(t), Math.sin(t)] });
    }
  };
  straight([a0 + c, b0 - d], [a1 - c, b0 - d], [0, -1]);
  corner(a1 - c, b0 + c, -90);
  straight([a1 + d, b0 + c], [a1 + d, b1 - c], [1, 0]);
  corner(a1 - c, b1 - c, 0);
  straight([a1 - c, b1 + d], [a0 + c, b1 + d], [0, 1]);
  corner(a0 + c, b1 - c, 90);
  straight([a0 - d, b1 - c], [a0 - d, b0 + c], [-1, 0]);
  corner(a0 + c, b0 + c, 180);
  return out;
}

const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const nearest = (rg, p) => {
  let i = 0;
  let best = Infinity;
  rg.forEach((s, k) => {
    const dd = d2(s.p, p);
    if (dd < best) [best, i] = [dd, k];
  });
  return i;
};

/**
 * The next joint along a section: walking `dir` (±1) from the sample nearest
 * `from`, the first point exactly `L` from `from` (a phalanx is a straight
 * bone between two joints that both lie on the surface).
 */
export function along(rg, from, L, dir) {
  const n = rg.length;
  let i = nearest(rg, from);
  for (let step = 0; step < n; step++) {
    const j = (i + dir + n) % n;
    if (d2(rg[j].p, from) >= L) {
      // Bisect the chord i → j for the point at distance L.
      let lo = 0;
      let hi = 1;
      const at = (t) => [rg[i].p[0] + (rg[j].p[0] - rg[i].p[0]) * t, rg[i].p[1] + (rg[j].p[1] - rg[i].p[1]) * t];
      for (let k = 0; k < 18; k++) {
        const m = (lo + hi) / 2;
        if (d2(at(m), from) < L) lo = m;
        else hi = m;
      }
      const t = (lo + hi) / 2;
      const nn = [rg[i].n[0] + (rg[j].n[0] - rg[i].n[0]) * t, rg[i].n[1] + (rg[j].n[1] - rg[i].n[1]) * t];
      const l = Math.hypot(nn[0], nn[1]) || 1;
      return { p: at(t), n: [nn[0] / l, nn[1] / l] };
    }
    i = j;
  }
  return { p: rg[i].p, n: rg[i].n };
}

/** The point `L` of arc length along a section from the sample nearest `from`, walking `dir`. */
export function arcFrom(rg, from, L, dir) {
  const n = rg.length;
  let i = nearest(rg, from);
  let left = L;
  for (let step = 0; step < n; step++) {
    const j = (i + dir + n) % n;
    const seg = d2(rg[i].p, rg[j].p);
    if (seg >= left) {
      const t = left / (seg || 1);
      return [rg[i].p[0] + (rg[j].p[0] - rg[i].p[0]) * t, rg[i].p[1] + (rg[j].p[1] - rg[i].p[1]) * t];
    }
    left -= seg;
    i = j;
  }
  return rg[i].p;
}

/**
 * A digit wrapped round a section: joints from `start` (on the first ring),
 * each phalanx `L[i]` long, joint i + 1 on ring `rings[i + 1]` (offset by
 * that joint's radius). `lift(p2, i)` maps a section point to 3D.
 */
function wrapDigit(rings, start, L, dir, lift, liftN) {
  let cur = { p: start, n: rings[0][nearest(rings[0], start)].n };
  const pts = [cur];
  for (let i = 0; i < L.length; i++) {
    cur = along(rings[i + 1], cur.p, L[i], dir);
    pts.push(cur);
  }
  return { j: pts.map(({ p }, i) => lift(p, i)), n: pts.map(({ n }) => liftN(n)) };
}

/**
 * Two-bone reach: the middle joint between `a` and `c` for bones L0 and L1,
 * bent toward `pole`. Past full reach the chain straightens toward `c`.
 */
export function twoBone(a, c, L0, L1, pole) {
  const u = norm(sub(c, a));
  const D = Math.max(Math.abs(L0 - L1) + 0.01, Math.min(len(sub(c, a)), L0 + L1 - 0.01));
  const x = (L0 * L0 - L1 * L1 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, L0 * L0 - x * x));
  const p = norm(sub(pole, mul(u, dot(pole, u))));
  return add(madd(a, u, x), mul(p, h));
}

// ── grips ───────────────────────────────────────────────────────────────────
/** Front or back strap z of a pistol grip g = { yTop, yBot, zfT, zbT, zfB, zbB, hw } at height y. */
export const gripZ = (g, y, side) => {
  const t = (g.yTop - y) / (g.yTop - g.yBot);
  return side === "front" ? g.zfT + (g.zfB - g.zfT) * t : g.zbT + (g.zbB - g.zbT) * t;
};
const CORNER = 5;

/**
 * The palm block from its knuckle row, metacarpal bases and wrist, as
 * capsules (drawn as one rounded mass), plus the thenar pad from the wrist
 * to the thumb's MCP. `d`: the back of the hand's normal.
 */
function palmOf(P, digits, thumb, W, hint, l, cmc, bridge = true) {
  const fingers = digits.filter((g) => g.id !== "thumb");
  // The back of the hand faces off the plane of knuckles and wrist, on the side `hint` says.
  const mcp = fingers.reduce((a, f) => madd(a, f.j[0], 1 / fingers.length), [0, 0, 0]);
  let d = norm(cross(sub(mcp, W), l));
  if (dot(d, hint) < 0) d = mul(d, -1);
  const caps = [];
  const base = fingers.map((f) => f.base);
  fingers.forEach((f, i) => caps.push({ a: base[i], b: f.j[0], ra: P.palm.rBase, rb: f.r[0] * P.palm.rMcp }));
  // Across the base and the wrist: the heel of the hand.
  caps.push({ a: base[0], b: base[base.length - 1], ra: P.palm.rBase, rb: P.palm.rBase });
  caps.push({ a: madd(W, l, -P.palm.wrist * 0.55), b: madd(W, l, P.palm.wrist * 0.55), ra: P.palm.wrist * 0.85, rb: P.palm.wrist * 0.85 });
  // Thenar: the thumb's metacarpal, padded, from its root to the MCP.
  caps.push({ a: cmc, b: thumb.j[0], ra: P.palm.rBase * 1.05, rb: thumb.r[0] * 1.05 });
  // The pad bridging palm and thumb, where the thumb opposes the fingers
  // across the palm. A thumb laid along the grip's flank (`bridge` false) has
  // no such web standing off the hand: drawn, it reads as an extra finger.
  if (bridge) caps.push({ a: mix3(base[0], cmc, 0.5), b: mix3(fingers[0].j[0], thumb.j[0], 0.45), ra: P.palm.rBase * 0.95, rb: thumb.r[0] * 0.9 });
  // The knuckles ride a little proud of the back of the hand: under a glove a
  // soft ridge, not a row of separate lobes along its outline.
  for (const f of fingers) {
    const r = f.r[0] * 0.88;
    const k = madd(f.j[0], d, f.r[0] * 0.12);
    caps.push({ a: madd(k, sub(f.base, f.j[0]), 0.12), b: k, ra: r * 0.9, rb: r });
  }
  // Back of the hand: the metacarpals' dorsal face, knuckles to bases.
  const lift = (p, r) => madd(p, d, r * 0.92);
  const first = fingers[0];
  const last = fingers[fingers.length - 1];
  const back = [lift(first.j[0], first.r[0] * P.palm.rMcp), lift(last.j[0], last.r[0] * P.palm.rMcp), lift(last.base, P.palm.rBase), lift(first.base, P.palm.rBase)];
  const knuckles = fingers.map((f) => ({ p: f.j[0], r: f.r[0] * P.palm.rMcp, base: f.base }));
  return { caps, back, d, knuckles, rBase: P.palm.rBase };
}

/**
 * Firing (right) hand on a pistol grip: middle, ring and little fingers
 * wrapped round the front strap from knuckles on the right flank, tips on the
 * left; the index laid along the frame clear of the trigger; the thumb either
 * over the back strap and round the left side (`thumb: "wrap"`, long guns) or
 * forward along the left of the frame (`"forward"`, sidearms).
 * o: { thumb, frameHw (half width of the frame the index lies along), elbow, scale,
 *   frameY (the underside of a receiver wider than the grip: the whole hand
 *   drops until its index knuckle clears it, rather than sinking into it) }
 */
export function gripHand(g, o = {}) {
  const { thumb = "wrap", frameHw = g.hw, elbow, scale = HAND_SCALE, flare = 1.8, trigger = null, frameY = null } = o;
  const P = scaled(scale);
  const [FI, FM, FR, FL] = P.fingers;
  const { hw, yTop } = g;
  // The index knuckle sits above the middle finger's; under a receiver that
  // overhangs the grip, the hand drops only until that knuckle's glove meets
  // the receiver's underside, so the fingers still wrap the top of the grip.
  const yM0 = yTop - FM.r[0] - 4;
  const drop = frameY == null || frameHw <= hw ? 0 : Math.max(0, yM0 + (FI.r[0] + FM.r[0]) * 0.9 + FI.r[0] * PRESS - frameY);
  const yM = yM0 - drop;
  const yR = yM - (FM.r[0] + FR.r[0]) * 0.96;
  const yL = yR - (FR.r[0] + FL.r[0]) * 0.96;
  const ringAt = (y, d) => section(-hw, hw, gripZ(g, y, "back"), gripZ(g, y, "front"), CORNER, d);
  // As on a real pistol grip, the knuckle row sits at the front-right
  // corner and the palm covers the right flank: the proximal phalanx crosses
  // the front strap, the middle phalanx and the fingertip lie back along the
  // left flank, where the eye at the hip sees the fingers wrapped round. (Set
  // further back on the right flank, only a fingertip reaches the left side,
  // and it reads as a stub coming out of the grip.) The proximal bone is
  // longer than a grip is wide, so crossing the front strap it presses into
  // the glove at the front corners, as a finger's flesh does on a narrow grip.
  const wrapped = (f, y, round) => {
    const zf = gripZ(g, y, "front");
    // Each joint sits on the section at its own height (the fingers spiral down a raked grip).
    const rings = f.r.map((r, i) => ringAt(y - 1.6 * i, r * PRESS));
    const L = [f.L[0], f.L[1], f.L[2] - f.r[3]];
    // The knuckle `round` mm of arc round the front-right corner from where it begins.
    const start = round ? arcFrom(rings[0], [hw + f.r[0] * PRESS, zf - CORNER], round, 1) : [hw + f.r[0] * PRESS, zf - CORNER];
    const dg = wrapDigit(rings, start, L, 1, ([x, z], i) => [x, y - 1.6 * i, z], ([x, z]) => [x, 0, z]);
    return { id: f.id, ...dg, r: f.r };
  };
  const middle = wrapped(FM, yM, 0);
  const ring = wrapped(FR, yR, 0);
  const little = wrapped(FL, yL, 0);
  // Index: its knuckle in line with the others, above the middle finger's.
  const yi = yM + (FI.r[0] + FM.r[0]) * 0.9;
  const I0 = [hw + FI.r[0] * PRESS, yi, middle.j[0][2] + 3 * scale];
  let index;
  if (trigger) {
    // Curled onto the trigger: the knuckle under the receiver on the right,
    // the proximal phalanx forward across the top of the front strap, the
    // PIP out ahead of the grip just under the receiver, the middle phalanx
    // down the left of the trigger and the distal hooked back across the
    // blade's face, its pad pressing it. So the eye at the hip, behind and
    // left, sees the finger bend round the front of the grip into the guard.
    const LD = FI.L[2] - FI.r[3];
    const tip = [3, trigger[1], trigger[2] + FI.r[3] * 0.85];
    const across = norm([-0.5, 0.2, 1]);
    const I2 = madd(tip, across, LD);
    const I1 = twoBone(I0, I2, FI.L[0], FI.L[1], [-1, -0.3, 0]);
    const I2b = madd(I1, norm(sub(I2, I1)), FI.L[1]);
    const I3 = madd(I2b, norm(sub(tip, I2b)), LD);
    index = { id: "index", j: [I0, I1, I2b, I3], r: FI.r, n: [[1, 0.3, 0], norm([0.7, 0.2, 0.7]), norm([0.2, 0, 1]), norm([0, 0, 1])].map(norm) };
  } else {
    // Laid along the frame, clear of the trigger.
    const xi = Math.max(hw, frameHw) + FI.r[1] * PRESS;
    const I1 = [xi, yi + 1, I0[2] + FI.L[0]];
    const I2 = [xi - 0.5, yi, I1[2] + FI.L[1]];
    const I3 = [xi - 1, yi - 1.5, I2[2] + FI.L[2] - FI.r[3]];
    index = { id: "index", j: [I0, I1, I2, I3], r: FI.r, n: [[1, 0.1, 0], [1, 0.2, 0], [1, 0.2, 0], [1, 0.2, 0]].map(norm) };
  }
  const fingers = [index, middle, ring, little];

  // The palm: knuckle row on the right flank, back of the hand facing out
  // right and a little up, the heel and wrist behind the back strap.
  const l = norm(sub(little.j[0], index.j[0]));
  const mcp = mix3(middle.j[0], ring.j[0], 0.5);
  // The palm runs down the back strap with the grip's rake: the wrist sits
  // low behind the grip's lower half, not out behind its top, where the heel
  // of the hand would stand behind the receiver's rear face.
  const yW = yR - 32 * scale;
  const W = [10 * scale, yW, gripZ(g, yW, "back") - 16 * scale];
  const d = norm([1, 0.2, -0.3]);
  for (const f of fingers) {
    f.base = mix3(f.j[0], madd(W, l, dot(sub(f.j[0], mcp), l) * 0.45), 0.6);
    // The metacarpals lie against the right flank and round the back strap, not in them.
    f.base[0] = Math.max(f.base[0], hw + P.palm.rBase * 0.9);
  }

  // Thumb: its root on the palm side of the wrist, toward the index.
  const cmc = madd(madd(mix3(W, index.base, 0.45), d, -10 * scale), l, -6 * scale);
  const T = P.thumb;
  let th;
  if (thumb === "wrap") {
    // Over the back strap just under the receiver, round to the left flank
    // and down it, so the tip rests by the middle finger's: the thumb hugs
    // the grip rather than standing off it at the receiver's edge.
    const y = yTop - T.r[0] * 0.75 - drop;
    const fall = [0, 6 * scale, 15 * scale];
    const rings = T.r.map((r, i) => ringAt(y - fall[i], r * 0.95));
    const zb = gripZ(g, y, "back");
    const dg = wrapDigit(rings, [hw * 0.55, zb - T.r[0] * 0.95], [T.L[0], T.L[1] - T.r[2]], -1, ([x, z], i) => [x, y - fall[i], z], ([x, z]) => norm([x, 0.6, z]));
    th = { id: "thumb", ...dg, r: T.r };
  } else if (thumb === "side") {
    // Long guns: round the back strap at the web and forward along the grip's
    // left flank at the index knuckle's height, high under the receiver and
    // clear of the curled fingers below, dipping a little toward the trigger guard.
    const ty = yM + FM.r[0] * 1.8;
    const zb = gripZ(g, ty, "back");
    const M0 = [-hw - T.r[0] * 0.55, ty + 1, zb + 2 * scale];
    // It angles down the flank, its tip resting on the top finger, so the
    // trigger finger's bend ahead of the grip shows above it.
    const dip = 0.35;
    const M1 = [-hw - T.r[1] * 0.9, ty - T.L[0] * dip, M0[2] + T.L[0] * Math.sqrt(1 - dip * dip)];
    const M2 = [-hw - T.r[2] * 0.9, M1[1] - (T.L[1] - T.r[2]) * dip * 1.3, M1[2] + (T.L[1] - T.r[2]) * Math.sqrt(1 - Math.min(0.9, dip * 1.3) ** 2)];
    th = { id: "thumb", j: [M0, M1, M2], r: T.r, n: [[-0.6, 1, -0.2], [-0.7, 0.8, 0], [-0.7, 0.8, 0]].map(norm) };

  } else {
    // Forward along the left of the frame, above the support thumb.
    const zb = gripZ(g, yTop, "back");
    // High on the frame, its pad against the slide's flank, so it reads along the gun.
    const ty = yTop + T.r[1] * 0.45;
    const M0 = [-hw - T.r[0] * 0.35, ty - 3, zb + 6 * scale];
    const M1 = [-hw - T.r[1] * 0.95, ty, M0[2] + T.L[0]];
    const M2 = [-hw - T.r[2] * 0.95, ty + 0.5, M1[2] + T.L[1] - T.r[2]];
    th = { id: "thumb", j: [M0, M1, M2], r: T.r, n: [[-0.5, 1, -0.2], [-0.6, 1, 0], [-0.6, 1, 0]].map(norm) };
  }
  const digits = [...fingers, th];
  const palm = palmOf(P, digits, th, W, d, l, cmc, thumb !== "side");
  if (thumb === "forward") {
    // A high pistol grip: the web between thumb and index pressed up into the
    // back strap under the slide, so from behind the hand covers the strap
    // and the thumb rises out of it rather than standing off as a second finger.
    const r = P.palm.rBase * 0.95;
    const zb = gripZ(g, yTop - 6, "back");
    palm.caps.push({ a: [th.j[0][0] + r * 0.4, yTop - 4, zb - r * 0.8], b: [hw + r * 0.3, yTop - 24 * scale, zb - r * 0.5], ra: r, rb: r * 1.1 });
  }
  return {
    side: 1, digits, palm,
    wrist: { W, R: P.palm.wrist }, elbow: elbow ?? [hw + 150, yTop - 260, gripZ(g, yTop, "back") - 330], flare,
  };
}

/**
 * Support (left) hand on a sidearm, cup grip: the palm over the firing
 * fingertips on the left of the grip, its fingers wrapping the front strap
 * over the firing fingers, its thumb forward along the frame under the
 * firing thumb. `over`: how far the firing fingers stand off the grip.
 */
export function cupHand(g, o = {}) {
  const { elbow, scale = HAND_SCALE, over = 17, flare = 1.8, low = 0 } = o;
  const P = scaled(scale);
  const { hw, yTop, yBot } = g;
  const ys = [];
  // `low`: how far down the grip the cup sits (mm), uncovering the firing fingers above it.
  let y = yTop - P.fingers[1].r[0] - 4 - 3 - low;
  for (const f of P.fingers) {
    ys.push(y);
    y -= f.r[0] * 2 * 0.95;
  }
  const fingers = P.fingers.map((f, i) => {
    const yy = Math.max(ys[i], yBot - f.r[0] * 0.6);
    const zf = gripZ(g, yy, "front");
    const rings = f.r.map((r, k) => section(-hw, hw, gripZ(g, yy - 1.2 * k, "back"), gripZ(g, yy - 1.2 * k, "front"), CORNER, over + r * PRESS));
    const L = [f.L[0], f.L[1], f.L[2] - f.r[3]];
    // As the firing fingers: knuckle a proximal phalanx back from the front corner.
    const start = along(rings[0], [-hw - over - f.r[0] * PRESS, zf - CORNER + 9 * scale], f.L[0], 1).p;
    const dg = wrapDigit(rings, start, L, -1, ([x, z], k) => [x, yy - 1.2 * k, z], ([x, z]) => [x, 0, z]);
    return { id: f.id, ...dg, r: f.r };
  });
  const l = norm(sub(fingers[3].j[0], fingers[0].j[0]));
  const mcp = mix3(fingers[1].j[0], fingers[2].j[0], 0.5);
  const yW = (ys[1] + ys[2]) / 2 - 18 * scale;
  const W = [-hw - over * 0.6 - 6 * scale, yW - 8 * scale, gripZ(g, yW, "back") - 40 * scale];
  const d = norm([-1, -0.15, -0.25]);
  for (const f of fingers) f.base = mix3(f.j[0], madd(W, l, dot(sub(f.j[0], mcp), l) * 0.45), 0.6);
  const T = P.thumb;
  // Forward along the frame under the firing thumb.
  const zb = gripZ(g, yTop, "back");
  // Just under the firing thumb (which rides high on the frame, see gripHand).
  const ty = yTop + T.r[1] * 0.45 - (T.r[0] + T.r[1]) * 0.92;
  const M0 = [-hw - T.r[0] * 0.9, ty, zb + 2 * scale];
  const M1 = [-hw - T.r[1] * 0.9, ty + 1, M0[2] + T.L[0]];
  const M2 = [-hw - T.r[2] * 0.9, ty + 1.5, M1[2] + T.L[1] - T.r[2]];
  const th = { id: "thumb", j: [M0, M1, M2], r: T.r, n: [[-0.7, 0.7, -0.2], [-0.7, 0.7, 0], [-0.7, 0.7, 0]].map(norm) };
  const cmc = madd(madd(mix3(W, fingers[0].base, 0.5), d, -10 * scale), l, -8 * scale);
  const digits = [...fingers, th];
  return {
    side: -1, digits, palm: palmOf(P, digits, th, W, d, l, cmc),
    wrist: { W, R: P.palm.wrist }, elbow: elbow ?? [-hw - 110, yBot - 240, g.zbB - 320], flare,
  };
}

/**
 * Long-gun support (left) hand: palm up under the handguard, knuckles under
 * its far lower edge, fingers curling up the far flank (index toward the
 * muzzle), thumb forward along the near flank.
 * hg = { y0 (underside), y1 (top), hw, zc }; o.tip: how far up the far flank
 * the fingertips reach (0 its lower corner, 1 its upper), kept low so they
 * stay behind the handguard from an eye above it.
 */
export function handguardHand(hg, o = {}) {
  const { elbow, scale = HAND_SCALE, flare = 2.2, tip = 0.4 } = o;
  const P = scaled(scale);
  const { y0, y1, hw, zc } = hg;
  const c = Math.min(8, (y1 - y0) * 0.2);
  const zs = [];
  let z = zc + 16 * scale;
  for (const f of P.fingers) {
    zs.push(z);
    z -= f.r[0] * 2 * 0.97;
  }
  const fingers = P.fingers.map((f, i) => {
    const rings = f.r.map((r) => section(-hw, hw, y0, y1, c, r * PRESS));
    // The fingers lean toward the muzzle as they wrap (LEAN of each phalanx
    // runs along the barrel), so less of their length goes round the section.
    const L3 = [f.L[0], f.L[1], f.L[2] - f.r[3]];
    const L = L3.map((v) => v * Math.sqrt(1 - LEAN * LEAN));
    const dz = [0, ...L3.map((v) => v * LEAN)].map((v, k, a) => a.slice(0, k + 1).reduce((x, y) => x + y, 0));
    // Knuckle under the handguard, placed so the fingertip ends up the far flank, short of its top.
    const total = L[0] + L[1] + L[2];
    const tipAt = [hw + f.r[3] * PRESS, y0 + c + (y1 - y0 - 2 * c) * tip];
    // Chords cut the corners the arc goes round: back off a little less than the finger's length.
    let start = arcFrom(rings[0], tipAt, total * 0.92, -1);
    // Never past the near lower corner: the palm, not the fingers, cups the near side.
    if (start[0] < -hw + c) start = [-hw + c, y0 - f.r[0] * PRESS];
    const dg = wrapDigit(rings, start, L, 1, ([x, y], k) => [x, y, zs[i] + dz[k]], ([x, y]) => [x, y, 0]);
    return { id: f.id, ...dg, r: f.r };
  });
  const l = norm(sub(fingers[3].j[0], fingers[0].j[0]));
  const mcp = mix3(fingers[1].j[0], fingers[2].j[0], 0.5);
  // Heel of the hand low on the near flank; the palm cups the lower near edge.
  const W = [-hw - 14 * scale, y0 - 26 * scale, mcp[2] - 34 * scale];
  const d = norm([-0.45, -1, -0.1]);
  for (const f of fingers) f.base = mix3(f.j[0], madd(W, l, dot(sub(f.j[0], mcp), l) * 0.5), 0.55);
  const T = P.thumb;
  const ty = y0 + Math.min(9, (y1 - y0) * 0.2);
  const M0 = [-hw - T.r[0] * 0.75, ty - 4, zs[0] - 16 * scale];
  const M1 = [-hw - T.r[1] * 0.85, ty, M0[2] + T.L[0]];
  const M2 = [-hw - T.r[2] * 0.85, ty + 2, M1[2] + T.L[1] - T.r[2]];
  const th = { id: "thumb", j: [M0, M1, M2], r: T.r, n: [[-1, 0.3, 0], [-1, 0.35, 0], [-1, 0.4, 0]].map(norm) };
  const cmc = madd(mix3(W, fingers[0].base, 0.5), d, -8 * scale);
  const digits = [...fingers, th];
  return {
    side: -1, digits, palm: palmOf(P, digits, th, W, d, l, cmc),
    wrist: { W, R: P.palm.wrist }, elbow: elbow ?? [-hw - 230, y0 - 200, zc - 420], flare,
  };
}

// ── occluders ───────────────────────────────────────────────────────────────
/**
 * A convex weapon part the hands can pass behind, from its corner points
 * (top ring, bottom ring) as faces: { pts, planes } for ray tests in gun space.
 */
function convex(faces) {
  const all = faces.flat();
  const c = all.reduce((a, p) => madd(a, p, 1 / all.length), [0, 0, 0]);
  const planes = [];
  for (const f of faces) {
    let n = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      n = add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
    }
    n = norm(n);
    const fc = f.reduce((a, p) => madd(a, p, 1 / f.length), [0, 0, 0]);
    if (dot(n, sub(fc, c)) < 0) n = mul(n, -1);
    planes.push({ n, h: dot(n, fc) });
  }
  return { pts: all, planes };
}
function loftOcc(A, B) {
  const faces = [A, B];
  for (let i = 0; i < A.length; i++) {
    const j = (i + 1) % A.length;
    faces.push([A[i], A[j], B[j], B[i]]);
  }
  return convex(faces);
}
/** Occluder for a pistol grip post (as weapons.pistolGrip draws it). */
export function gripOccluder(g) {
  // The same chamfered section the post is drawn with (weapons.pistolGrip:
  // rrect corners 5 at the top, 6 at the bottom), so fingers rounding its
  // corners are hidden only where the drawn grip really covers them.
  const ring = (x0, x1, z0, z1, y, c) => [
    [x0 + c, y, z0], [x1 - c, y, z0], [x1, y, z0 + c], [x1, y, z1 - c],
    [x1 - c, y, z1], [x0 + c, y, z1], [x0, y, z1 - c], [x0, y, z0 + c],
  ];
  return loftOcc(ring(-g.hw, g.hw, g.zbT, g.zfT, g.yTop, 5), ring(-g.hw - 1, g.hw + 1, g.zbB, g.zfB, g.yBot, 6));
}
/** Occluder for a box along z (as geom's boxZ); `box` keeps its extent so a hand can be kept out of it. */
export function boxOccluder(x0, x1, y0, y1, z0, z1) {
  const ring = (z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
  return { ...loftOcc(ring(z0), ring(z1)), box: [x0, x1, y0, y1, z0, z1] };
}

// ── contact ─────────────────────────────────────────────────────────────────
/** Signed distance from p to a box [x0, x1, y0, y1, z0, z1] (negative inside). */
function boxSd([x0, x1, y0, y1, z0, z1], p) {
  const c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const e = [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2];
  const q = [0, 1, 2].map((k) => Math.abs(p[k] - c[k]) - e[k]);
  return Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(q[0], q[1], q[2]), 0);
}
/** Signed distance from p to a pistol grip post (its rounded section at p's height, capped top and bottom). */
export function gripSd(g, p) {
  const y = Math.max(g.yBot, Math.min(g.yTop, p[1]));
  const zf = gripZ(g, y, "front");
  const zb = gripZ(g, y, "back");
  const qx = Math.abs(p[0]) - (g.hw - CORNER);
  const qz = Math.abs(p[2] - (zf + zb) / 2) - ((zf - zb) / 2 - CORNER);
  const sec = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - CORNER;
  const dy = Math.max(p[1] - g.yTop, g.yBot - p[1], 0);
  return sec > 0 || dy > 0 ? Math.hypot(Math.max(sec, 0), dy) : sec;
}

/**
 * Keep a posed hand out of the weapon: every palm capsule end and thumb joint
 * that sinks into the grip post `g` or one of `boxes` (by more than the glove
 * gives, 10% of its radius) is pushed straight out of it. Fingers are solved
 * on the grip's surface already; the palm block and the thumb's root, built
 * from the wrist, are what can cut through the back of the frame.
 */
export function settleHand(h, g, boxes = []) {
  const sd = (p) => Math.min(g ? gripSd(g, p) : Infinity, ...boxes.map((b) => boxSd(b, p)));
  const out = (p, r) => {
    let q = p;
    for (let it = 0; it < 6; it++) {
      const d = sd(q) - r * 0.9;
      if (d >= -0.05) break;
      const e = 0.5;
      const n = norm([sd(add(q, [e, 0, 0])) - sd(sub(q, [e, 0, 0])), sd(add(q, [0, e, 0])) - sd(sub(q, [0, e, 0])), sd(add(q, [0, 0, e])) - sd(sub(q, [0, 0, e]))]);
      q = madd(q, n, -d + 0.05);
    }
    return q;
  };
  // Each capsule's ends, then along its length: a capsule whose ends are
  // clear can still cut a corner between them, so the whole of it moves out.
  const settleCap = (c0) => {
    let c = { ...c0, a: out(c0.a, c0.ra), b: out(c0.b, c0.rb) };
    for (let pass = 0; pass < 2; pass++) {
      for (const t of [0.25, 0.5, 0.75]) {
        const p = mix3(c.a, c.b, t);
        const dv = sub(out(p, c.ra + (c.rb - c.ra) * t), p);
        if (len(dv) > 0.01) c = { ...c, a: add(c.a, dv), b: add(c.b, dv) };
      }
    }
    return c;
  };
  const palm = { ...h.palm, caps: h.palm.caps.map(settleCap) };
  const digits = h.digits.map((d) => (d.id === "thumb" ? { ...d, j: d.j.map((p, i) => out(p, d.r[i])) } : d));
  return { ...h, palm, digits };
}

/** Does the segment eye → p pass through the occluder before reaching p? */
export function hides(occ, eye, p) {
  const dv = sub(p, eye);
  let t0 = 0;
  let t1 = 1;
  for (const { n, h } of occ.planes) {
    const den = dot(n, dv);
    const num = h - dot(n, eye);
    if (Math.abs(den) < 1e-9) {
      if (num < 0) return false;
    } else if (den < 0) t0 = Math.max(t0, num / den);
    else t1 = Math.min(t1, num / den);
    if (t0 > t1) return false;
  }
  return t0 < 0.999 && t1 > 0;
}

/**
 * A hand model turned rigidly by `angle` radians about the vertical axis
 * (or the barrel's, `axis` "z") through `c` (the grip's centre): at ADS the hands roll their backs a little
 * toward the eye, which sits straight behind the grip (the elbow stays put,
 * so the forearm swings only by the wrist's move). Fingers wrapped round
 * a near-round grip stay on it (to within a few millimetres).
 */
export function turnHand(h, c, angle, axis = "y") {
  const [co, si] = [Math.cos(angle), Math.sin(angle)];
  // About the vertical (y), or about the barrel (z): + rolls the top toward +x.
  const R = axis === "z"
    ? (v) => [v[0] * co + v[1] * si, -v[0] * si + v[1] * co, v[2]]
    : (v) => [v[0] * co + v[2] * si, v[1], -v[0] * si + v[2] * co];
  const P = (p) => add(R(sub(p, c)), c);
  const digits = h.digits.map((d) => ({ ...d, j: d.j.map(P), n: d.n.map(R), base: d.base && P(d.base) }));
  const palm = {
    ...h.palm,
    caps: h.palm.caps.map((q) => ({ ...q, a: P(q.a), b: P(q.b) })),
    back: h.palm.back.map(P),
    d: R(h.palm.d),
    knuckles: h.palm.knuckles.map((k) => ({ ...k, p: P(k.p), base: P(k.base) })),
  };
  // The elbow stays put: the wrist rolls, the forearm follows from where it was.
  return { ...h, digits, palm, wrist: { ...h.wrist, W: P(h.wrist.W) } };
}
