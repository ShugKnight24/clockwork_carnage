/**
 * Procedural texture generation.
 * Extracted from Renderer.generateTextures() and Renderer._generateFloorCeilTextures().
 * Upgraded to 128x128 resolution for sharper visuals.
 */
import { WALL_COLORS } from "../../js/data.js";

/**
 * Generate 128x128 wall textures for each wall type.
 * Returns { [wallId]: HTMLCanvasElement } map.
 */
export function generateWallTextures() {
  const textures = {};
  const size = 128;
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
        const noise = (Math.random() * 10 - 5) | 0;

        if (wid === 1) {
          // Stone - brick pattern
          const brickH = 32,
            brickW = 64;
          const row = Math.floor(y / brickH);
          const offset = (row % 2) * (brickW / 2);
          const bx = (x + offset) % brickW;
          if (y % brickH < 2 || bx < 2) {
            r -= 30;
            g -= 30;
            b -= 30;
          }
        } else if (wid === 2) {
          // Tech - circuit lines
          if (x % 32 === 0 || y % 32 === 0) {
            r += 40;
            g += 60;
            b += 80;
          }
          if (x % 64 < 8 && y % 64 < 8) {
            r += 60;
            g += 100;
            b += 80;
          }
        } else if (wid === 3) {
          // Metal - rivets
          if ((x === 8 || x === 120) && (y === 8 || y === 120)) {
            r += 50;
            g += 50;
            b += 50;
          }
          if (x < 4 || x > 124 || y < 4 || y > 124) {
            r -= 20;
            g -= 20;
            b -= 20;
          }
        } else if (wid === 4) {
          // Energy - glowing pulse lines
          const wave = Math.sin(y * 0.1 + x * 0.05) * 30;
          r += wave;
          g += wave * 0.3;
          b += wave;
          if (y % 16 === 0) {
            r += 40;
            b += 60;
          }
        } else if (wid === 5) {
          // Sci-fi airlock door with prominent frame
          const inFrame = x < 14 || x > 113 || y < 14 || y > 113;
          const inJamb = !inFrame && (x < 20 || x > 107 || y < 20 || y > 107);
          if (inFrame) {
            // Outer frame — dark heavy steel
            r -= 40; g -= 30; b -= 10;
            // Teal accent strip on inner edge of frame
            if ((x === 13 || x === 114) && y >= 14 && y <= 113) {
              r -= 20; g += 60; b += 40;
            }
            if ((y === 13 || y === 114) && x >= 14 && x <= 113) {
              r -= 20; g += 60; b += 40;
            }
            // Corner brackets — bright teal corners
            const isCorner = (x < 20 && y < 20) || (x < 20 && y > 107) ||
                             (x > 107 && y < 20) || (x > 107 && y > 107);
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
            if (x === 63 || x === 64) {
              r += 60; g += 50; b += 20;
            }
            // Horizontal rivet lines
            if ((y - 20) % 32 === 0 && y > 20 && y < 108) {
              r -= 25; g -= 20; b -= 10;
            }
            // Bolt positions
            const boltPositions = [
              { bx: 30, by: 30 }, { bx: 30, by: 98 },
              { bx: 52, by: 30 }, { bx: 52, by: 98 },
              { bx: 74, by: 30 }, { bx: 74, by: 98 },
              { bx: 96, by: 30 }, { bx: 96, by: 98 },
            ];
            for (const { bx, by } of boltPositions) {
              const dx = x - bx, dy = y - by;
              if (dx * dx + dy * dy <= 16) {
                r += 80; g += 70; b += 30;
              }
            }
            // Hazard stripes at bottom
            if (y >= 96 && y < 108) {
              const stripePhase = (x + y) % 20;
              if (stripePhase < 10) {
                r += 80; g += 40; b -= 20;
              } else {
                r -= 30; g -= 30; b -= 30;
              }
            }
            // Center lock indicator (red circle)
            const hx = x - 63, hy = y - 64;
            if (hx * hx + hy * hy <= 36) {
              r += 100; g += 20; b -= 20;
            }
            // Panel edge shadows
            if (x === 62) { r -= 20; g -= 15; }
            if (x === 65) { r -= 20; g -= 15; }
          }
          // Status indicator dots at top corners of frame
          const dotPositions = [{ dx: 7, dy: 7 }, { dx: 120, dy: 7 }];
          for (const { dx, dy } of dotPositions) {
            const ddx = x - dx, ddy = y - dy;
            if (ddx * ddx + ddy * ddy <= 9) {
              r = 0; g = 200; b = 120; // bright teal status light
            }
          }
        } else if (wid === 6) {
          // Secret - same as stone with subtle difference
          const brickH = 32,
            brickW = 64;
          const row = Math.floor(y / brickH);
          const offset = (row % 2) * (brickW / 2);
          const bx = (x + offset) % brickW;
          if (y % brickH < 2 || bx < 2) {
            r -= 30;
            g -= 30;
            b -= 30;
          }
        } else if (wid === 7) {
          // Boss walls - ominous
          const glow = Math.sin(x * 0.075) * Math.sin(y * 0.075) * 25;
          r += glow * 2;
          g += glow * 0.5;
          b += glow;
        } else if (wid === 9) {
          // Temporal rift
          const wave1 = Math.sin(x * 0.15 + y * 0.1) * 20;
          const wave2 = Math.cos(x * 0.075 - y * 0.125) * 15;
          r += wave1;
          g += wave1 + wave2;
          b += wave2 + 40;
        }

        r = Math.max(0, Math.min(255, r + noise));
        g = Math.max(0, Math.min(255, g + noise));
        b = Math.max(0, Math.min(255, b + noise));
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
 * Generate 128x128 floor and ceiling textures based on act + visual style.
 * Returns { floorPixels: Uint8ClampedArray, ceilPixels: Uint8ClampedArray }.
 */
export function generateFloorCeilTextures(act, visualStyle) {
  const size = 128;
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
      const noise = (Math.random() * 8 - 4) | 0;
      if (x % 32 === 0 || y % 32 === 0) {
        r += floorGrid.r;
        g += floorGrid.g;
        b += floorGrid.b;
      }
      if (x % 64 < 4 || y % 64 < 4) {
        r += 8;
        g += pal.seamG;
        b += pal.seamB;
      }
      const rx = x % 64,
        ry = y % 64;
      if (rx >= 4 && rx <= 8 && ry >= 4 && ry <= 8) {
        r += brutal ? 20 : 10;
        g += pal.rivetG;
        b += pal.rivetB;
      }
      const cx = (x % 64) - 32,
        cy = (y % 64) - 32;
      const d = Math.sqrt(cx * cx + cy * cy);
      if (d < 5) {
        r += floorGlow.r;
        g += floorGlow.g;
        b += floorGlow.b;
      }
      fd[i] = Math.max(0, Math.min(255, r + noise));
      fd[i + 1] = Math.max(0, Math.min(255, g + noise));
      fd[i + 2] = Math.max(0, Math.min(255, b + noise));
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
      const noise = (Math.random() * 6 - 3) | 0;
      if (x % 64 === 0 || y % 64 === 0) {
        r -= 3;
        g -= 3;
        b -= 3;
      }
      if (y % 64 < 6) {
        r += brutal ? 6 : 10;
        g += brutal ? 6 : 8;
        b += brutal ? 8 : 6;
      }
      const px = (x % 64) - 32,
        py = (y % 64) - 32;
      const dl = Math.sqrt(px * px + py * py);
      if (dl < 4) {
        r += ceilLight.r;
        g += ceilLight.g;
        b += ceilLight.b;
      }
      cd[i] = Math.max(0, Math.min(255, r + noise));
      cd[i + 1] = Math.max(0, Math.min(255, g + noise));
      cd[i + 2] = Math.max(0, Math.min(255, b + noise));
      cd[i + 3] = 255;
    }
  }

  return { floorPixels: fd, ceilPixels: cd };
}
