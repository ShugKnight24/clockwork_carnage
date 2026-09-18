/**
 * Procedural texture generation.
 * Extracted from Renderer.generateTextures() and Renderer._generateFloorCeilTextures().
 * Upgraded to 256x256 resolution for sharper visuals.
 */
import { WALL_COLORS } from "../../js/data.js";
import { buildWallSet } from "./env/wall-art.js";
import { buildDeckSet } from "./env/deck-art.js";
import { getEnvPalette, glowColors, GLOW_STRENGTH, FOG_DENSITY } from "./env/palettes.js";

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
export function generateWallTextures() {
  const textures = {};
  const size = 256;
  for (const [id, color] of Object.entries(WALL_COLORS)) {
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
    textures[id] = c;
  }
  return textures;
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
 * @returns {object} env bundle consumed by Renderer + GLRenderer
 */
export function generateModernEnv(act, brutal) {
  const a = act || 1;
  const p = getEnvPalette(a);
  const walls = buildWallSet(a);
  const deck = buildDeckSet(a, brutal);
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

  // Key light sits up and to the world's -x/-y; faces turned away fall to ink.
  const faceShade = [
    "rgba(4,6,11,0)",     // 0: normal -x (lit)
    "rgba(4,6,11,0.36)",  // 1: normal +x
    "rgba(4,6,11,0.16)",  // 2: normal -y
    "rgba(4,6,11,0.44)",  // 3: normal +y
  ];

  const glow = glowColors(a);
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
    brutal: !!brutal,
    palette: p,
    walls,
    deck,
    fogLUT,
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
