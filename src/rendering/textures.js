/**
 * Procedural texture generation.
 * Extracted from Renderer.generateTextures() and Renderer._generateFloorCeilTextures().
 * Upgraded to 256x256 resolution for sharper visuals.
 */
import { WALL_COLORS } from "../../js/data.js";
import { buildWallSet, extendWallSet, hasWallPainter, paintWall, buildUpperBand } from "./env/wall-art.js";
import { CEILING_Z } from "../systems/physics.js";
import { buildDeckSet } from "./env/deck-art.js";
import { getEnvPalette, resolveEnvPalette, envSalt, glowColors, GLOW_STRENGTH, FOG_DENSITY } from "./env/palettes.js";

const hashNoise = (x, y, seed = 0) => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
};

const edgeGlow = (x, y, size, inset = 0) => {
  const d = Math.min(x - inset, y - inset, size - 1 - inset - x, size - 1 - inset - y);
  return Math.max(0, 1 - d / 20);
};

const add = (v, n) => Math.max(0, Math.min(255, v + n));

/**
 * Generate 256x256 wall textures for each wall type.
 * Returns { [wallId]: HTMLCanvasElement } map.
 */
const _avgCache = new WeakMap();
let _avgCanvas = null;

/**
 * Average colour of a wall texture, from a smoothed 4x4 downsample. Cached
 * per texture: reading a GPU-backed canvas back waits for the GPU to finish
 * everything queued (~100 ms measured mid-level on Chrome's D3D11 backend),
 * so textures are read while they are built, at load, not at first sight.
 */
export function averageColor(tex) {
  if (!tex) return [90, 96, 108]; // no art: neutral steel
  const hit = _avgCache.get(tex);
  if (hit) return hit;
  let avg;
  try {
    if (!_avgCanvas) {
      _avgCanvas = document.createElement("canvas");
      _avgCanvas.width = _avgCanvas.height = 4;
    }
    const c = _avgCanvas.getContext("2d", { willReadFrequently: true });
    c.clearRect(0, 0, 4, 4);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(tex, 0, 0, 4, 4);
    const d = c.getImageData(0, 0, 4, 4).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < 64; i += 4) {
      r += d[i];
      g += d[i + 1];
      b += d[i + 2];
    }
    avg = [r / 16, g / 16, b / 16];
  } catch (_) {
    avg = [90, 96, 108]; // unreadable: neutral steel
  }
  _avgCache.set(tex, avg);
  return avg;
}

/**
 * The station's own walls (lockers, range, gym, office, sim hall: ids 10+)
 * are pictures, not materials: Legacy's flat noise left those rooms bare. It
 * borrows the painted face, downscaled once to its 256px texture size.
 */
function stationWallTexture(id) {
  const art = paintWall(+id, 1);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(art, 0, 0, 256, 256);
  art.width = art.height = 0;
  return c;
}

/** One wall type's 256px Legacy texture. */
function legacyWallTexture(id, color) {
  const size = 256;
  if (+id >= 10 && hasWallPainter(id)) return stationWallTexture(id);
  {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    const wid = parseInt(id);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        let r = color.r,
          g = color.g,
          b = color.b;
        const grain = (hashNoise(x, y, wid) * 14 - 7) | 0;
        const fine = (hashNoise(x * 3, y * 3, wid + 11) * 5 - 2) | 0;
        const noise = grain + fine;

        if (wid === 1) {
          // Chronos masonry: beveled slabs with mineral seams
          const brickH = 64, brickW = 128;
          const row = Math.floor(y / brickH);
          const offset = (row % 2) * (brickW / 2);
          const bx = (x + offset) % brickW;
          const seam = y % brickH < 6 || bx < 6;
          const bevel = y % brickH < 14 || bx < 14 ? 10 : bx > brickW - 14 || y % brickH > brickH - 14 ? -12 : 0;
          if (seam) { r -= 42; g -= 44; b -= 48; }
          else { r += bevel; g += bevel; b += bevel + 4; }
          if (hashNoise(Math.floor(x / 16), Math.floor(y / 16), 1) > 0.82) { r += 18; g += 20; b += 26; }
          // Crack/wear patterns
          const crack = hashNoise(Math.floor(x / 4), Math.floor(y / 4), 91);
          if (crack > 0.92) { r -= 20; g -= 22; b -= 18; }
        } else if (wid === 2) {
          // Layered circuit wall: carbon panel + cyan conduits
          const panel = x % 64 < 4 || y % 64 < 4;
          const conduit = (x % 128 < 8 && y > 36 && y < 220) || (y % 96 < 8 && x > 24 && x < 232);
          const node = (x % 128 < 20 && y % 96 < 20) || (x % 128 > 108 && y % 96 > 76);
          if (panel) { r -= 18; g -= 22; b -= 18; }
          if (conduit) { r += 25; g += 135; b += 155; }
          if (node) { r += 65; g += 170; b += 125; }
          if (edgeGlow(x, y, size, 4) > 0.4) { r -= 22; g -= 18; b -= 10; }
        } else if (wid === 3) {
          // Brushed plated metal with bevels and rivets
          const brush = Math.sin(y * 0.35 + hashNoise(0, y, 3) * 2) * 8;
          r += brush; g += brush; b += brush;
          const seam = x % 84 < 4 || y % 84 < 4;
          if (seam) { r -= 30; g -= 30; b -= 32; }
          const rivet = [[24, 24], [232, 24], [24, 232], [232, 232], [128, 64], [128, 192]].some(([rx, ry]) => (x - rx) ** 2 + (y - ry) ** 2 < 40);
          if (rivet) { r += 70; g += 70; b += 78; }
          if (x < 10 || x > 245 || y < 10 || y > 245) { r -= 28; g -= 28; b -= 30; }
          // Crack/wear patterns
          const wear = hashNoise(Math.floor(x / 6), Math.floor(y / 6), 77);
          if (wear > 0.93) { r -= 15; g -= 15; b -= 12; }
        } else if (wid === 4) {
          // Arcane reactor glass: layered magenta energy cells
          const wave = Math.sin(y * 0.055 + x * 0.0275) * 28;
          const cell = x % 64 < 6 || y % 64 < 6;
          r += wave + (cell ? 50 : 0);
          g += wave * 0.15;
          b += wave + (cell ? 90 : 28);
          if ((x - 128) ** 2 + (y - 128) ** 2 < 3600) { r += 28; b += 48; }
        } else if (wid === 5) {
          // Sci-fi airlock door with prominent frame
          const inFrame = x < 28 || x > 227 || y < 28 || y > 227;
          const inJamb = !inFrame && (x < 40 || x > 215 || y < 40 || y > 215);
          if (inFrame) {
            // Outer frame — dark heavy steel
            r -= 40; g -= 30; b -= 10;
            // Teal accent strip on inner edge of frame
            if ((x === 27 || x === 228) && y >= 28 && y <= 227) {
              r -= 20; g += 60; b += 40;
            }
            if ((y === 27 || y === 228) && x >= 28 && x <= 227) {
              r -= 20; g += 60; b += 40;
            }
            // Corner brackets — bright teal corners
            const isCorner = (x < 40 && y < 40) || (x < 40 && y > 215) ||
                             (x > 215 && y < 40) || (x > 215 && y > 215);
            if (isCorner && ((x + y) % 3 === 0)) {
              r -= 10; g += 40; b += 30;
            }
          } else if (inJamb) {
            // Inner jamb — slightly brighter transition zone
            r += 5; g += 15; b += 10;
          } else {
            // Door panels
            r += 15; g += 8;
            // Center seam (bright)
            if (x === 127 || x === 128) {
              r += 60; g += 50; b += 20;
            }
            // Horizontal rivet lines
            if ((y - 40) % 64 === 0 && y > 40 && y < 216) {
              r -= 25; g -= 20; b -= 10;
            }
            // Bolt positions
            const boltPositions = [
              { bx: 60, by: 60 }, { bx: 60, by: 196 },
              { bx: 104, by: 60 }, { bx: 104, by: 196 },
              { bx: 148, by: 60 }, { bx: 148, by: 196 },
              { bx: 192, by: 60 }, { bx: 192, by: 196 },
            ];
            for (const { bx, by } of boltPositions) {
              const dx = x - bx, dy = y - by;
              if (dx * dx + dy * dy <= 32) {
                r += 80; g += 70; b += 30;
              }
            }
            // Hazard stripes at bottom
            if (y >= 192 && y < 216) {
              const stripePhase = (x + y) % 40;
              if (stripePhase < 20) {
                r += 80; g += 40; b -= 20;
              } else {
                r -= 30; g -= 30; b -= 30;
              }
            }
            // Center lock indicator (red circle)
            const hx = x - 127, hy = y - 128;
            if (hx * hx + hy * hy <= 72) {
              r += 100; g += 20; b -= 20;
            }
            // Panel edge shadows
            if (x === 126) { r -= 20; g -= 15; }
            if (x === 129) { r -= 20; g -= 15; }
          }
          // Status indicator dots at top corners of frame
          const dotPositions = [{ dx: 14, dy: 14 }, { dx: 241, dy: 14 }];
          for (const { dx, dy } of dotPositions) {
            const ddx = x - dx, ddy = y - dy;
            if (ddx * ddx + ddy * ddy <= 18) {
              r = 0; g = 200; b = 120; // bright teal status light
            }
          }
        } else if (wid === 6) {
          // Secret - same as stone with subtle difference
          const brickH = 64,
            brickW = 128;
          const row = Math.floor(y / brickH);
          const offset = (row % 2) * (brickW / 2);
          const bx = (x + offset) % brickW;
          if (y % brickH < 4 || bx < 4) {
            r -= 30;
            g -= 30;
            b -= 30;
          }
        } else if (wid === 7) {
          // Paradox bone-metal: ribbed obsidian with crimson veins
          const rib = Math.abs(Math.sin((x + y) * 0.04));
          const vein = Math.abs(Math.sin(x * 0.085 - y * 0.055)) > 0.94;
          const glow = Math.sin(x * 0.0375) * Math.sin(y * 0.0375) * 25;
          r += glow * 2 + (vein ? 95 : 0) - rib * 18;
          g += glow * 0.25 - rib * 12;
          b += glow + rib * 20;
          if (edgeGlow(x, y, size) > 0.5) { r += 25; b += 18; }
          // Crack/wear patterns
          const boneCrack = hashNoise(Math.floor(x / 5), Math.floor(y / 5), 63);
          if (boneCrack > 0.91) { r -= 18; g -= 8; b -= 14; }
        } else if (wid === 8) {
          // Reinforced glass: translucent frost with diagonal stress lines
          const diag = (x + y) % 56 < 4 || Math.abs(x - y) % 84 < 4;
          const frost = hashNoise(Math.floor(x / 12), Math.floor(y / 12), 8) * 20;
          r += frost + (diag ? 35 : 0);
          g += frost + (diag ? 48 : 0);
          b += frost + (diag ? 55 : 15);
        } else if (wid === 9) {
          // Temporal rift: torn spacetime, cyan/green shear bands
          const wave1 = Math.sin(x * 0.075 + y * 0.05) * 20;
          const wave2 = Math.cos(x * 0.0375 - y * 0.0625) * 15;
          const tear = Math.abs(Math.sin(x * 0.105 + y * 0.165)) > 0.96;
          r += wave1;
          g += wave1 + wave2 + (tear ? 90 : 0);
          b += wave2 + 40 + (tear ? 70 : 0);
        }

        // Pseudo-normal shading: directional light from upper-left
        const h0 = hashNoise(x, y, wid + 50);
        const hR = x < size - 1 ? hashNoise(x + 1, y, wid + 50) : h0;
        const hD = y < size - 1 ? hashNoise(x, y + 1, wid + 50) : h0;
        const dx = (h0 - hR) * 18;
        const dy = (h0 - hD) * 18;
        // Light direction: upper-left → positive dx and dy brighten
        const shade = (dx + dy) * 0.5;
        r += shade;
        g += shade;
        b += shade;

        // Ambient occlusion — darken top 12 and bottom 12 pixels
        if (y < 12) {
          const ao = (1 - y / 12) * 25;
          r -= ao; g -= ao; b -= ao;
        } else if (y > size - 13) {
          const ao = (1 - (size - 1 - y) / 12) * 25;
          r -= ao; g -= ao; b -= ao;
        }

        r = add(r, noise);
        g = add(g, noise);
        b = add(b, noise);
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return c;
  }
}

/**
 * The Legacy wall textures, by wall id, each painted the first time it is
 * read (and its cap colour read back then too). Painting all of them up
 * front was most of the boot's long task — 1.3 s on a slow laptop — for a
 * set that Comic and Modern mostly never draw.
 */
export function generateWallTextures() {
  const textures = {};
  for (const [id, color] of Object.entries(WALL_COLORS)) {
    Object.defineProperty(textures, id, {
      enumerable: true,
      configurable: true,
      get() {
        const c = legacyWallTexture(id, color);
        averageColor(c);
        Object.defineProperty(textures, id, { value: c, enumerable: true, writable: true, configurable: true });
        return c;
      },
    });
  }
  return textures;
}

const _legacyUpper = {};

/** Legacy's upper band in `style` (BAND_STYLES): the Modern one, downscaled once to 256px. */
export function legacyUpperBand(style = "bulkhead") {
  if (!_legacyUpper[style]) {
    const mips = buildUpperBand(1, null, CEILING_Z - 1, false, style);
    _legacyUpper[style] = mips[1];
    mips[0].width = mips[0].height = 0;
  }
  return _legacyUpper[style];
}

/**
 * The upper band `band` tinted to a wall's average colour `avg` for the
 * Canvas2D paths: band × avg × 2, as the GL wall pass multiplies it, so its
 * mid-grey becomes the wall's own colour. Cached per band canvas and colour.
 */
const _tintCache = new WeakMap();
export function tintUpperBand(band, avg) {
  let byKey = _tintCache.get(band);
  if (!byKey) _tintCache.set(band, (byKey = new Map()));
  const key = `${avg[0] | 0},${avg[1] | 0},${avg[2] | 0}`;
  let c = byKey.get(key);
  if (c) return c;
  const half = document.createElement("canvas");
  half.width = band.width;
  half.height = band.height;
  const h = half.getContext("2d");
  h.drawImage(band, 0, 0);
  h.globalCompositeOperation = "multiply";
  h.fillStyle = `rgb(${key})`;
  h.fillRect(0, 0, half.width, half.height);
  c = document.createElement("canvas");
  c.width = band.width;
  c.height = band.height;
  const g = c.getContext("2d");
  g.drawImage(half, 0, 0);
  g.globalCompositeOperation = "lighter";
  g.drawImage(half, 0, 0);
  half.width = half.height = 0;
  byKey.set(key, c);
  return c;
}

/** Act-based floor/ceiling palettes (3 acts x 2 visual styles) */
const ACT_PALETTES = {
  1: {
    normal: {
      floorBase: { r: 28, g: 42, b: 48 }, floorGrid: { r: 15, g: 28, b: 35 },
      floorGlow: { r: 5, g: 40, b: 60 }, ceilBase: { r: 18, g: 22, b: 38 },
      ceilLight: { r: 40, g: 35, b: 18 }, seamG: 14, seamB: 18, rivetG: 30, rivetB: 45,
    },
    brutal: {
      floorBase: { r: 22, g: 25, b: 32 }, floorGrid: { r: 12, g: 15, b: 20 },
      floorGlow: { r: 8, g: 18, b: 30 }, ceilBase: { r: 10, g: 10, b: 20 },
      ceilLight: { r: 15, g: 20, b: 35 }, seamG: 10, seamB: 14, rivetG: 22, rivetB: 28,
    },
  },
  2: {
    normal: {
      floorBase: { r: 48, g: 34, b: 14 }, floorGrid: { r: 28, g: 18, b: 6 },
      floorGlow: { r: 60, g: 40, b: 5 }, ceilBase: { r: 30, g: 18, b: 8 },
      ceilLight: { r: 55, g: 38, b: 8 }, seamG: 12, seamB: 6, rivetG: 28, rivetB: 10,
    },
    brutal: {
      floorBase: { r: 35, g: 22, b: 8 }, floorGrid: { r: 20, g: 12, b: 4 },
      floorGlow: { r: 50, g: 28, b: 4 }, ceilBase: { r: 20, g: 12, b: 4 },
      ceilLight: { r: 45, g: 28, b: 6 }, seamG: 8, seamB: 4, rivetG: 20, rivetB: 6,
    },
  },
  3: {
    normal: {
      floorBase: { r: 40, g: 10, b: 20 }, floorGrid: { r: 24, g: 6, b: 14 },
      floorGlow: { r: 55, g: 5, b: 40 }, ceilBase: { r: 20, g: 6, b: 30 },
      ceilLight: { r: 44, g: 8, b: 50 }, seamG: 6, seamB: 18, rivetG: 14, rivetB: 45,
    },
    brutal: {
      floorBase: { r: 30, g: 8, b: 14 }, floorGrid: { r: 18, g: 4, b: 8 },
      floorGlow: { r: 45, g: 4, b: 30 }, ceilBase: { r: 14, g: 4, b: 20 },
      ceilLight: { r: 35, g: 6, b: 40 }, seamG: 4, seamB: 12, rivetG: 8, rivetB: 30,
    },
  },
  // Act IV: the Act III violet, bleached by white-hot rift light.
  4: {
    normal: {
      floorBase: { r: 46, g: 36, b: 48 }, floorGrid: { r: 28, g: 20, b: 30 },
      floorGlow: { r: 70, g: 50, b: 66 }, ceilBase: { r: 30, g: 22, b: 34 },
      ceilLight: { r: 70, g: 60, b: 72 }, seamG: 14, seamB: 20, rivetG: 30, rivetB: 44,
    },
    brutal: {
      floorBase: { r: 34, g: 26, b: 36 }, floorGrid: { r: 20, g: 14, b: 22 },
      floorGlow: { r: 56, g: 40, b: 54 }, ceilBase: { r: 22, g: 16, b: 26 },
      ceilLight: { r: 54, g: 46, b: 58 }, seamG: 10, seamB: 14, rivetG: 22, rivetB: 32,
    },
  },
};

/**
 * Generate 256x256 floor and ceiling textures based on act + visual style.
 * Returns { floorPixels: Uint8ClampedArray, ceilPixels: Uint8ClampedArray }.
 */
export function generateFloorCeilTextures(act, visualStyle) {
  const size = 256;
  const brutal = visualStyle === 1;
  const palData = ACT_PALETTES[act || 1] || ACT_PALETTES[1];
  const pal = brutal ? palData.brutal : palData.normal;
  const { floorBase, floorGrid, floorGlow, ceilBase, ceilLight } = pal;

  // Floor texture
  const floorImg = new ImageData(size, size);
  const fd = floorImg.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = floorBase.r,
        g = floorBase.g,
        b = floorBase.b;
      const noise = (hashNoise(x, y, act || 1) * 8 - 4) | 0;

      // Primary grid lines with edge bevel (parallax depth illusion)
      const gx = x % 64, gy = y % 64;
      if (gx === 0 || gy === 0) {
        r += floorGrid.r; g += floorGrid.g; b += floorGrid.b;
      } else if (gx === 1 || gy === 1) {
        // Light edge of bevel (highlight)
        r += 6; g += 8; b += 10;
      } else if (gx === 63 || gy === 63) {
        // Dark edge of bevel (shadow)
        r -= 8; g -= 8; b -= 6;
      }

      // Secondary seam lines with subtle conduit glow
      if (x % 128 < 8 || y % 128 < 8) {
        r += 8; g += pal.seamG; b += pal.seamB;
      }

      // Corner rivets
      const rx = x % 128, ry = y % 128;
      if (rx >= 8 && rx <= 16 && ry >= 8 && ry <= 16) {
        r += brutal ? 20 : 10; g += pal.rivetG; b += pal.rivetB;
      }

      // Emissive center glow — radial falloff for realistic floor lighting
      const cx = (x % 128) - 64, cy = (y % 128) - 64;
      const d = Math.sqrt(cx * cx + cy * cy);
      if (d < 16) {
        const glow = 1 - d / 16; // smooth falloff
        r += (floorGlow.r * glow) | 0;
        g += (floorGlow.g * glow) | 0;
        b += (floorGlow.b * glow) | 0;
      }

      // Panel wear scratches (directional, subtle)
      const scratch = hashNoise(x, Math.floor(y / 2), (act || 1) + 77);
      if (scratch > 0.96) { r += 4; g += 5; b += 6; }

      fd[i] = add(r, noise);
      fd[i + 1] = add(g, noise);
      fd[i + 2] = add(b, noise);
      fd[i + 3] = 255;
    }
  }

  // Ceiling texture
  const ceilImg = new ImageData(size, size);
  const cd = ceilImg.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r = ceilBase.r,
        g = ceilBase.g,
        b = ceilBase.b;
      const noise = (hashNoise(x, y, (act || 1) + 20) * 6 - 3) | 0;

      // Panel seams with shadow bevel
      if (x % 128 === 0 || y % 128 === 0) {
        r -= 5; g -= 5; b -= 4;
      } else if (x % 128 === 1 || y % 128 === 1) {
        r -= 3; g -= 3; b -= 2; // shadow side
      } else if (x % 128 === 127 || y % 128 === 127) {
        r += 2; g += 2; b += 3; // lit side
      }

      // Beam/support struts (horizontal)
      if (y % 128 < 12) {
        r += brutal ? 6 : 10;
        g += brutal ? 6 : 8;
        b += brutal ? 8 : 6;
      }

      // Conduit pipes (runs along every other panel, perpendicular to beams)
      const cx128 = x % 128;
      if (cx128 >= 56 && cx128 <= 72 && y % 128 >= 14 && y % 128 <= 24) {
        // Pipe body
        const pipeCenter = 64;
        const pipeD = Math.abs(cx128 - pipeCenter);
        const pipeShade = pipeD < 4 ? 8 : pipeD < 6 ? 4 : -2;
        r += pipeShade; g += pipeShade + 2; b += pipeShade + 4;
      }

      // Recessed light pool — radial falloff from center of each 128x128 panel
      const px = (x % 128) - 64, py = (y % 128) - 64;
      const dl = Math.sqrt(px * px + py * py);
      if (dl < 14) {
        const glow = 1 - dl / 14;
        r += (ceilLight.r * glow) | 0;
        g += (ceilLight.g * glow) | 0;
        b += (ceilLight.b * glow) | 0;
      }

      // Exposed wiring detail (thin diagonal lines in some panels)
      if ((x + y) % 128 < 2 && hashNoise(Math.floor(x / 128), Math.floor(y / 128), 55) > 0.65) {
        r += 3; g += 6; b += 8;
      }

      cd[i] = add(r, noise);
      cd[i + 1] = add(g, noise);
      cd[i + 2] = add(b, noise);
      cd[i + 3] = 255;
    }
  }

  return { floorPixels: fd, ceilPixels: cd };
}

/**
 * Modern art style: the whole environment bundle for one act — 512px wall
 * faces (mip-chained), deck/ceiling tiles, the shared fog ramp and the
 * per-column colour LUTs the raycaster needs. Built once per act at level
 * load; nothing here runs per frame.
 *
 * @param {number} act          1-3
 * @param {boolean} brutal      visualStyle 1 (Brutal) — thicker, darker air
 * @param {?string} level       campaign level env id (LEVEL_ENVS), or null
 *                              outside the campaign
 * @param {object} [opts]
 * @param {boolean} [opts.realistic] bake the wall faces as lit materials
 *        (relief, wear, grime) for the Realistic art style
 * @returns {object} env bundle consumed by Renderer + GLRenderer
 */
/**
 * Realistic's low ambient: this colour at this alpha over every wall and cap.
 * It was a fill of its own per column; it is now folded into the fog fill
 * (fogAmbientLUT), the cap colours, and — scaled by 1 - alpha — the additive
 * lights drawn after the fog, which is exactly what the later fill did.
 */
export const REAL_AMBIENT = { rgb: [3, 4, 7], alpha: 0.16 };

// Mip levels 0-3 are drawn for walls 48px and taller; the contact shadow was
// only ever drawn on walls over 40px, so the two smallest levels stay clean.
const CONTACT_SHADOW_LEVELS = 4;

/**
 * Realistic's soft contact shadow — dark at the ceiling and deck joints,
 * clear through the middle — painted into the wall mips once. It was a
 * per-column blit of a 1x64 ramp with a fractional source rect, which Skia
 * cannot draw on its fast texture path: on Chrome's D3D11 backend that one
 * blit took Realistic from vsync to ~30 fps. It spans the wall's full height
 * exactly as the texture does, so baking it changes nothing on screen.
 */
function bakeContactShadow(mips, stops = WALL_SHADOW) {
  for (let i = 0; i < CONTACT_SHADOW_LEVELS && i < mips.length; i++) {
    const c = mips[i];
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    for (const [o, a] of stops) grad.addColorStop(o, `rgba(0,0,0,${a})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  }
}

// The art's top meets the upper band's trim rail now, not the ceiling: a
// light shadow under the rail there, and the ceiling joint's dark one at the
// top of the band (which is CEILING_Z - 1 of a wall tall, so the same fall-off
// covers more of it).
const WALL_SHADOW = [[0, 0.24], [0.06, 0.06], [0.14, 0], [0.74, 0], [0.9, 0.22], [1, 0.62]];
const BAND_SHADOW = [[0, 0.55], [0.1 / (CEILING_Z - 1), 0.14], [Math.min(0.9, 0.22 / (CEILING_Z - 1)), 0], [1, 0]];

/**
 * Add a map's own wall faces (the station's lockers, say) to an env built
 * without them, finished as the env's were. True when it painted any.
 * `average` false leaves their cap colours (averageColor) to the caller, to
 * read many faces back at once: each readback waits on the GPU's whole
 * queue, and later ones in the same task cost ~1 ms.
 */
export function ensureEnvWalls(env, ids, realistic = false, average = true) {
  const added = extendWallSet(env.walls, ids, env.act, env.palette, env.salt ?? 0, realistic);
  for (const id of added) {
    if (realistic) bakeContactShadow(env.walls[id]);
    if (average) averageColor(env.walls[id][env.walls[id].length - 1]);
  }
  return added.length > 0;
}

/**
 * Add the upper bands in `styles` (BAND_STYLES names: a map's room finishes,
 * map.bands) to an env, finished as its bulkhead band is. They live in
 * env.bands by name; true when it painted any.
 */
export function ensureEnvBands(env, styles, realistic = false) {
  env.bands ??= {};
  let added = false;
  for (const style of styles) {
    if (env.bands[style] || style === "bulkhead") continue;
    const mips = buildUpperBand(env.act, env.palette, CEILING_Z - 1, realistic, style);
    if (realistic) bakeContactShadow(mips, BAND_SHADOW);
    averageColor(mips[mips.length - 1]);
    env.bands[style] = mips;
    added = true;
  }
  return added;
}

export function generateModernEnv(act, brutal, level = null, { realistic = false } = {}) {
  const a = act || 1;
  // Each campaign level derives its own steel, light and air from the act.
  const p = resolveEnvPalette(a, level);
  const salt = envSalt(level);
  const walls = buildWallSet(a, p, salt, realistic);
  if (realistic) for (const mips of Object.values(walls)) bakeContactShadow(mips);
  // The upper band over every full wall's art (the renderer tints it).
  const upper = buildUpperBand(a, p, CEILING_Z - 1, realistic);
  if (realistic) bakeContactShadow(upper, BAND_SHADOW);
  averageColor(upper[upper.length - 1]);
  // The raycaster's cap colours come from each wall's smallest mip.
  for (const mips of Object.values(walls)) averageColor(mips[mips.length - 1]);
  const deck = buildDeckSet(a, brutal, p, salt);
  const fogMax = brutal ? 0.94 : 0.86;
  const fogDensity = brutal ? FOG_DENSITY * 1.3 : FOG_DENSITY;
  const [n0, n1, n2] = p.fogNear;
  const [f0, f1, f2] = p.fogFar;

  // 65-step fog LUT: colour lifts toward the hazy far air as it thickens
  // (atmospheric perspective), so one fillRect per column does both.
  const fogLUT = new Array(65);
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const r = (n0 + (f0 - n0) * t) | 0;
    const g = (n1 + (f1 - n1) * t) | 0;
    const b = (n2 + (f2 - n2) * t) | 0;
    fogLUT[i] = `rgba(${r},${g},${b},${(t * fogMax).toFixed(3)})`;
  }

  // Fog then Realistic's ambient, as one fill. Two source-over fills of
  // constant colours compose into one: fog (F, a) then ambient (A, k) leaves
  // (1 - k)(1 - a) of the wall, so the combined alpha is 1 - (1 - k)(1 - a)
  // and its colour the weighted mix of F and A.
  const fogAmbientLUT = new Array(65);
  const [a0, a1, a2] = REAL_AMBIENT.rgb;
  const ka = REAL_AMBIENT.alpha;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const fa = t * fogMax;
    const beta = 1 - (1 - ka) * (1 - fa);
    const wf = ((1 - ka) * fa) / beta;
    const wa = ka / beta;
    const r = Math.round((n0 + (f0 - n0) * t) * wf + a0 * wa);
    const g = Math.round((n1 + (f1 - n1) * t) * wf + a1 * wa);
    const b = Math.round((n2 + (f2 - n2) * t) * wf + a2 * wa);
    fogAmbientLUT[i] = `rgba(${r},${g},${b},${beta.toFixed(3)})`;
  }

  // Key light sits up and to the world's -x/-y; faces turned away fall to ink.
  const faceShade = [
    "rgba(4,6,11,0)",     // 0: normal -x (lit)
    "rgba(4,6,11,0.36)",  // 1: normal +x
    "rgba(4,6,11,0.16)",  // 2: normal -y
    "rgba(4,6,11,0.44)",  // 3: normal +y
  ];

  const glow = glowColors(a, p);
  const glowGL = new Float32Array(24);
  for (let i = 0; i < glow.length && i < 8; i++) {
    const s = GLOW_STRENGTH[i] || 0;
    glowGL[i * 3] = (glow[i][0] / 255) * s;
    glowGL[i * 3 + 1] = (glow[i][1] / 255) * s;
    glowGL[i * 3 + 2] = (glow[i][2] / 255) * s;
  }
  // Canvas path uses 0-255 values pre-multiplied by strength.
  const glowRGB = glow.map((c, i) => [c[0] * (GLOW_STRENGTH[i] || 0), c[1] * (GLOW_STRENGTH[i] || 0), c[2] * (GLOW_STRENGTH[i] || 0)]);

  return {
    act: a,
    level,
    salt,
    brutal: !!brutal,
    realistic: !!realistic,
    palette: p,
    walls,
    upper,
    bands: {},
    deck,
    fogLUT,
    fogAmbientLUT,
    fogMax,
    fogDensity,
    fogNear: p.fogNear,
    fogFar: p.fogFar,
    fogNearGL: new Float32Array(p.fogNear.map((v) => v / 255)),
    fogFarGL: new Float32Array(p.fogFar.map((v) => v / 255)),
    faceShade,
    glowRGB,
    glowGL,
    accentRGB: p.accentRGB,
  };
}
