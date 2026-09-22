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
 * @param {"dirt"|"grass_top"|"grass_side"|"sand"|"rock"|"ore"|"bedrock"} name
 * @param {number} size
 * @param {"legacy"|"comic"|"modern"} style
 * @returns {HTMLCanvasElement}
 */
export function paintNatural(name, size, style) {
  const st = style === "legacy" ? { amp: 0.18, cell: size / 16, posterize: 4 } : style === "comic" ? { amp: 0.2, cell: size / 24, ink: "rgba(10,13,18,0.8)" } : { amp: 0.1, cell: size / 48, desat: 0.35 };
  switch (name) {
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
