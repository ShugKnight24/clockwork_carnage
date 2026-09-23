/**
 * Procedural natural-block art: dirt, grass (top/side), sand, rock, ore and
 * bedrock, painted per art style (legacy/comic/modern). No image files — a
 * hash-noise field plus a couple of style-specific passes (posterise, ink
 * cracks, AO speckle). Only touches `document` inside functions, so this
 * module imports cleanly under node (the atlas layer-table test imports it
 * transitively via atlas.js).
 */
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function noiseCanvas(size, base, { amp = 0.12, cell = 8, seed = 1, posterize = 0, spots = null, ink = null, desat = 0 } = {}) {
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const g = c.getContext("2d"); const img = g.createImageData(size, size); const d = img.data;
  const [r, gg, b] = base;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let n = hash(x / cell | 0, y / cell | 0, seed) * 0.6 + hash(x, y, seed + 7) * 0.4;
    if (posterize) n = Math.round(n * posterize) / posterize;
    const k = 1 + (n - 0.5) * 2 * amp;
    let R = r * k, G = gg * k, B = b * k;
    if (desat) { const l = 0.3 * R + 0.59 * G + 0.11 * B; R += (l - R) * desat; G += (l - G) * desat; B += (l - B) * desat; }
    const o = (y * size + x) * 4; d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (spots) for (let i = 0; i < spots.count; i++) { const sx = hash(i, 1, seed) * size, sy = hash(i, 2, seed) * size; g.fillStyle = spots.color; g.beginPath(); g.arc(sx, sy, spots.r * (0.6 + hash(i, 3, seed)), 0, Math.PI * 2); g.fill(); }
  if (ink) { g.strokeStyle = ink; g.lineWidth = size / 128; for (let i = 0; i < 24; i++) { const x0 = hash(i, 4, seed) * size, y0 = hash(i, 5, seed) * size; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (hash(i, 6, seed) - 0.5) * size * 0.25, y0 + (hash(i, 7, seed) - 0.5) * size * 0.25); g.stroke(); } }
  return c;
}

const BASE = {
  dirt: [110, 76, 46], grass_top: [82, 140, 58], sand: [216, 200, 144], rock: [92, 96, 104], ore: [92, 96, 104], bedrock: [30, 32, 36],
  workbench: [138, 106, 58], workbench_top: [156, 122, 70],
  anvil: [74, 78, 87], anvil_top: [112, 121, 137],
  forge: [90, 52, 40], forge_top: [120, 58, 34],
};

/**
 * Ripples for the water surface. The shader scrolls this layer two ways and
 * reads its brightness as the ripple field, so it must tile seamlessly: every
 * wave has a whole number of periods across the tile, the warp included. Comic
 * bands it into cel steps with bright crest strokes, legacy posterises harder,
 * modern stays smooth.
 */
function paintWater(size, style) {
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const g = c.getContext("2d"); const img = g.createImageData(size, size); const d = img.data;
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const wu = u + 0.08 * Math.sin(TAU * (2 * v + 0.3)) + 0.05 * Math.sin(TAU * (3 * v - u));
    const wv = v + 0.07 * Math.sin(TAU * (3 * u + 0.1)) + 0.04 * Math.sin(TAU * (u + 2 * v));
    let f = 0.5
      + 0.22 * Math.sin(TAU * (2 * wu + wv))
      + 0.16 * Math.sin(TAU * (3 * wv - wu))
      + 0.08 * Math.sin(TAU * (5 * wu + 4 * wv));
    // Sharpen the crests: ripples are thin bright lines over broad troughs.
    f = Math.max(0, Math.min(1, f));
    f = f * f * (1.2 - 0.2 * f);
    if (style === "comic") f = Math.round(f * 4) / 4 + (f > 0.8 ? 0.15 : 0);
    else if (style === "legacy") f = Math.round(f * 3) / 3;
    f = Math.max(0, Math.min(1, f));
    const o = (y * size + x) * 4;
    d[o] = 40 + 170 * f; d[o + 1] = 110 + 130 * f; d[o + 2] = 150 + 100 * f; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Wood: bark with long vertical grain, a sawn top with growth rings, and
 * planks with seams and nail heads. Opaque, like the other natural blocks.
 */
function paintWood(name, size, st) {
  const TAU = Math.PI * 2;
  if (name === "log_top") {
    // Bark round the edge, sawn wood inside it.
    const c = noiseCanvas(size, [92, 62, 36], { ...st, seed: 31, ink: null });
    const g = c.getContext("2d"), m = size / 2;
    g.save(); g.beginPath(); g.arc(m, m, size * 0.44, 0, TAU); g.clip();
    g.drawImage(noiseCanvas(size, [184, 142, 90], { ...st, seed: 32, ink: null }), 0, 0);
    g.restore();
    g.strokeStyle = "rgba(96,64,34,0.55)"; g.lineWidth = Math.max(1, size / 110);
    for (let r = size * 0.07; r < size * 0.42; r += size * 0.07) { g.beginPath(); g.arc(m + 2, m - 1, r, 0, TAU); g.stroke(); }
    g.strokeStyle = st.ink ? "rgba(10,13,18,0.85)" : "rgba(60,38,20,0.8)"; g.lineWidth = Math.max(1, size / 64);
    g.beginPath(); g.arc(m, m, size * 0.44, 0, TAU); g.stroke();
    return c;
  }
  if (name === "log") {
    const c = noiseCanvas(size, [104, 72, 42], { ...st, seed: 33, ink: null, cell: size / 40 });
    const g = c.getContext("2d");
    // Bark ridges: long dark furrows with a light edge beside each.
    for (let i = 0; i < 18; i++) {
      const x = hash(i, 41, 33) * size, w = size * (0.012 + hash(i, 42, 33) * 0.02);
      const y0 = hash(i, 43, 33) * size * 0.3, len = size * (0.5 + hash(i, 44, 33) * 0.7);
      g.fillStyle = "rgba(48,30,16,0.7)"; g.fillRect(x, y0, w, len);
      g.fillStyle = "rgba(150,112,72,0.45)"; g.fillRect(x + w, y0 + size * 0.02, w * 0.6, len * 0.8);
      if (y0 + len > size) { g.fillStyle = "rgba(48,30,16,0.7)"; g.fillRect(x, 0, w, y0 + len - size); }
    }
    if (st.ink) {
      g.strokeStyle = st.ink; g.lineWidth = Math.max(1, size / 128);
      for (let i = 0; i < 9; i++) { const x = hash(i, 45, 33) * size; g.beginPath(); g.moveTo(x, hash(i, 46, 33) * size); g.lineTo(x + (hash(i, 47, 33) - 0.5) * size * 0.04, hash(i, 48, 33) * size); g.stroke(); }
    }
    return c;
  }
  // Planks: four boards across, staggered end joints.
  const c = noiseCanvas(size, [184, 138, 82], { ...st, seed: 34, ink: null, cell: size / 48 });
  const g = c.getContext("2d"), n = 4, h = size / n;
  g.strokeStyle = "rgba(120,84,44,0.35)"; g.lineWidth = Math.max(1, size / 200);
  for (let i = 0; i < 40; i++) { const y = hash(i, 51, 34) * size; g.beginPath(); g.moveTo(0, y); g.lineTo(size, y + (hash(i, 52, 34) - 0.5) * size * 0.02); g.stroke(); }
  g.strokeStyle = st.ink ? "rgba(10,13,18,0.8)" : "rgba(70,46,22,0.75)"; g.lineWidth = Math.max(1, size / 80);
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(0, i * h); g.lineTo(size, i * h); g.stroke(); }
  for (let i = 0; i < n; i++) {
    const x = ((i % 2) * 0.5 + 0.25) * size;
    g.beginPath(); g.moveTo(x, i * h); g.lineTo(x, (i + 1) * h); g.stroke();
    g.fillStyle = "rgba(40,30,24,0.8)";
    for (const nx of [x - size * 0.04, x + size * 0.04]) { g.beginPath(); g.arc(nx, i * h + h / 2, size / 90, 0, TAU); g.fill(); }
  }
  return c;
}

/**
 * Leaves and the sapling are cut-outs: the chunk shader discards texels under
 * half alpha. Leaves keep about four fifths of the tile covered so mip levels,
 * which average alpha, still read as foliage at a distance instead of fading.
 */
function paintFoliage(name, size, style, st) {
  const TAU = Math.PI * 2;
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const g = c.getContext("2d");
  const leaf = (x, y, r, a, fill) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.ellipse(0, 0, r, r * 0.55, 0, 0, TAU);
    g.fillStyle = fill; g.fill();
    if (st.ink) { g.strokeStyle = st.ink; g.lineWidth = Math.max(1, size / 160); g.stroke(); }
    g.restore();
  };
  const greens = style === "modern" ? ["#3f7f3a", "#4c8d44", "#5a9a4c", "#35703a"] : ["#2f6b2c", "#3f8a36", "#56a444", "#6cbc52"];
  if (name === "sapling") {
    // A stem up the middle from the foot of the cell, a few leaf pairs on it.
    g.strokeStyle = st.ink ? "rgba(10,13,18,0.9)" : "#4a3420"; g.lineWidth = size / 22;
    g.beginPath(); g.moveTo(size * 0.5, size); g.quadraticCurveTo(size * 0.44, size * 0.6, size * 0.52, size * 0.26); g.stroke();
    g.strokeStyle = "#6b4a2a"; g.lineWidth = size / 40;
    g.beginPath(); g.moveTo(size * 0.5, size); g.quadraticCurveTo(size * 0.44, size * 0.6, size * 0.52, size * 0.26); g.stroke();
    const pairs = [[0.5, 0.2, 0.17, 0], [0.34, 0.42, 0.15, -0.6], [0.66, 0.44, 0.15, 0.6], [0.32, 0.66, 0.12, -0.4], [0.66, 0.68, 0.12, 0.4]];
    pairs.forEach(([x, y, r, a], i) => leaf(x * size, y * size, r * size, a, greens[(i + 1) % greens.length]));
    return c;
  }
  // Dark under-foliage with ragged holes, then layers of lighter leaves on top.
  g.drawImage(noiseCanvas(size, [40, 86, 36], { ...st, seed: 21, ink: null }), 0, 0);
  const img = g.getImageData(0, 0, size, size), d = img.data, cell = size / 8;
  const holes = [];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    if (hash(i, j, 22) < 0.3) holes.push([(i + 0.2 + hash(i, j, 23) * 0.6) * cell, (j + 0.2 + hash(i, j, 24) * 0.6) * cell, cell * (0.3 + hash(i, j, 25) * 0.25)]);
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    for (const [hx, hy, r] of holes) if ((x - hx) * (x - hx) + (y - hy) * (y - hy) < r * r) { d[(y * size + x) * 4 + 3] = 0; break; }
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 70; i++) {
    const x = hash(i, 26, 21) * size, y = hash(i, 27, 21) * size;
    leaf(x, y, size * (0.04 + hash(i, 28, 21) * 0.035), hash(i, 29, 21) * Math.PI, greens[(hash(i, 30, 21) * greens.length) | 0]);
  }
  if (style === "legacy") {
    // Posterise to a few flat greens and hard alpha, like the legacy tiles.
    const im = g.getImageData(0, 0, size, size), p = im.data;
    for (let k = 0; k < p.length; k += 4) {
      for (let ch = 0; ch < 3; ch++) p[k + ch] = Math.round(p[k + ch] / 48) * 48;
      p[k + 3] = p[k + 3] < 128 ? 0 : 255;
    }
    g.putImageData(im, 0, 0);
  }
  return c;
}

/**
 * @param {"dirt"|"grass_top"|"grass_side"|"sand"|"rock"|"ore"|"bedrock"|"water"|"log"|"log_top"|"leaves"|"planks"|"sapling"} name
 * @param {number} size
 * @param {"legacy"|"comic"|"modern"} style
 * @returns {HTMLCanvasElement}
 */
export function paintNatural(name, size, style) {
  const st = style === "legacy" ? { amp: 0.18, cell: size / 16, posterize: 4 } : style === "comic" ? { amp: 0.2, cell: size / 24, ink: "rgba(10,13,18,0.8)" } : { amp: 0.1, cell: size / 48, desat: 0.35 };
  switch (name) {
    case "water": return paintWater(size, style);
    case "log":
    case "log_top":
    case "planks": return paintWood(name, size, st);
    case "leaves":
    case "sapling": return paintFoliage(name, size, style, st);
    case "grass_side": {
      const c = noiseCanvas(size, BASE.dirt, { ...st, seed: 3 });
      const g = c.getContext("2d"); const top = noiseCanvas(size, BASE.grass_top, { ...st, seed: 4 });
      g.drawImage(top, 0, 0, size, size * 0.22, 0, 0, size, size * 0.22);
      for (let x = 0; x < size; x += size / 32) g.drawImage(top, x, 0, size / 32, size * 0.3, x, 0, size / 32, size * (0.22 + 0.12 * hash(x, 9, 4)));
      return c;
    }
    case "ore": return noiseCanvas(size, BASE.rock, { ...st, seed: 6, spots: { count: 14, r: size / 20, color: style === "legacy" ? "#3fb0c8" : "rgba(80,220,240,0.9)" } });
    case "workbench_top":
    case "workbench": {
      const c = noiseCanvas(size, BASE[name], { ...st, seed: 11, cell: size / 12 });
      const g = c.getContext("2d");
      // Plank seams: along the grain on top, upright on the sides.
      g.strokeStyle = "rgba(48,32,16,0.55)"; g.lineWidth = Math.max(1, size / 96);
      const n = 4;
      for (let i = 1; i < n; i++) {
        const p = (i / n) * size;
        g.beginPath();
        if (name === "workbench_top") { g.moveTo(0, p); g.lineTo(size, p); }
        else { g.moveTo(p, 0); g.lineTo(p, size); }
        g.stroke();
      }
      if (name !== "workbench_top") { g.strokeRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96); }
      return c;
    }
    case "anvil_top":
    case "anvil": {
      const c = noiseCanvas(size, BASE[name], { ...st, seed: 12, cell: size / 32, desat: 0.5 });
      const g = c.getContext("2d");
      // A low-contrast band read as "grey block with a rectangle on it" and
      // vanished against rock. Silhouette carries further than hue, so the
      // side face is a three-tier anvil shape and the top is a bright struck
      // face with its hardy hole.
      if (name === "anvil_top") {
        g.fillStyle = "rgba(226,232,242,0.5)";
        g.fillRect(size * 0.1, size * 0.22, size * 0.8, size * 0.56);
        g.fillStyle = "rgba(14,16,20,0.85)";
        g.fillRect(size * 0.62, size * 0.38, size * 0.14, size * 0.14);
        g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = Math.max(1, size / 96);
        g.strokeRect(size * 0.1, size * 0.22, size * 0.8, size * 0.56);
      } else {
        g.fillStyle = "rgba(20,22,28,0.75)";
        g.fillRect(size * 0.22, size * 0.62, size * 0.56, size * 0.3); // plinth
        g.fillRect(size * 0.36, size * 0.44, size * 0.28, size * 0.2); // waist
        g.fillStyle = "rgba(232,238,248,0.55)";
        g.fillRect(size * 0.06, size * 0.2, size * 0.88, size * 0.22); // struck face
        g.fillStyle = "rgba(20,22,28,0.75)";
        g.fillRect(0, size * 0.42, size * 0.06, size * 0.06);          // horn shadow
      }
      return c;
    }
    case "forge_top":
    case "forge": {
      const c = noiseCanvas(size, BASE[name], { ...st, seed: 13, cell: size / 20 });
      const g = c.getContext("2d");
      // Coals: hot on top, a soot-darkened mouth on the sides.
      const hot = name === "forge_top";
      for (let i = 0; i < (hot ? 26 : 10); i++) {
        const x = hash(i, 21, 13) * size, y = hash(i, 22, 13) * size;
        g.fillStyle = hot ? `rgba(255,${120 + hash(i, 23, 13) * 90 | 0},40,0.75)` : "rgba(20,14,12,0.5)";
        g.beginPath(); g.arc(x, y, size / 26 * (0.5 + hash(i, 24, 13)), 0, Math.PI * 2); g.fill();
      }
      return c;
    }
    default: return noiseCanvas(size, BASE[name] || BASE.rock, { ...st, seed: name.length });
  }
}
