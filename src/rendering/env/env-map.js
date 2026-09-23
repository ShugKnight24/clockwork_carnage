/**
 * Per-cell wall-contact data for the Modern deck shading.
 *
 * For every open cell we record which of its 8 neighbours are walls (contact
 * AO where deck/ceiling meet a wall) and which side neighbours are emissive
 * wall types (coloured light spill onto the deck). The Canvas2D floor loop
 * reads the typed arrays directly; the WebGL shader gets the same bytes as a
 * tiny RGBA8 texture (R = wall bits, G = glow side bits, B = glow colour index).
 *
 * sync() diffs the live grid against a snapshot each frame (3600 byte compares
 * on a 60×60 map), so doors opening update the shading without a level hook.
 */

import { WALL_GLOW_INDEX } from "./palettes.js";

export const AO_W = 1, AO_E = 2, AO_N = 4, AO_S = 8, AO_NW = 16, AO_NE = 32, AO_SW = 64, AO_SE = 128;

export class EnvMap {
  constructor() {
    this.map = null;
    this.w = 0;
    this.h = 0;
    this.snapshot = null;
    this.rgba = null; // Uint8Array w*h*4
    this.version = 0;
  }

  /** Returns true when the cell data changed (caller re-uploads to GL). */
  sync(map) {
    const grid = map?.grid;
    if (!grid) return false;
    const w = map.width;
    const h = map.height;
    let dirty = map !== this.map || w !== this.w || h !== this.h;
    if (!dirty) {
      const snap = this.snapshot;
      outer: for (let y = 0; y < h; y++) {
        const row = grid[y];
        const off = y * w;
        for (let x = 0; x < w; x++) {
          if (snap[off + x] !== row[x]) { dirty = true; break outer; }
        }
      }
    }
    if (!dirty) return false;
    this._rebuild(map, w, h);
    return true;
  }

  _rebuild(map, w, h) {
    const grid = map.grid;
    if (!this.snapshot || this.snapshot.length !== w * h) {
      this.snapshot = new Uint8Array(w * h);
      this.rgba = new Uint8Array(w * h * 4);
    }
    this.map = map;
    this.w = w;
    this.h = h;
    const snap = this.snapshot;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) snap[y * w + x] = grid[y][x];
    // Outside the map counts as solid wall.
    const cell = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 1 : snap[y * w + x]);
    const out = this.rgba;
    out.fill(0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (snap[y * w + x] !== 0) continue;
        const cw = cell(x - 1, y), ce = cell(x + 1, y), cn = cell(x, y - 1), cs = cell(x, y + 1);
        let m = 0;
        if (cw) m |= AO_W;
        if (ce) m |= AO_E;
        if (cn) m |= AO_N;
        if (cs) m |= AO_S;
        // Corners only matter when both adjoining sides are open (else the
        // side term already darkens that corner).
        if (!cw && !cn && cell(x - 1, y - 1)) m |= AO_NW;
        if (!ce && !cn && cell(x + 1, y - 1)) m |= AO_NE;
        if (!cw && !cs && cell(x - 1, y + 1)) m |= AO_SW;
        if (!ce && !cs && cell(x + 1, y + 1)) m |= AO_SE;
        let g = 0;
        let gi = 0;
        const sides = [cw, ce, cn, cs];
        for (let s = 0; s < 4; s++) {
          const idx = WALL_GLOW_INDEX[sides[s]] || 0;
          if (idx) {
            g |= 1 << s;
            if (!gi) gi = idx;
          }
        }
        const o = (y * w + x) * 4;
        out[o] = m;
        out[o + 1] = g;
        out[o + 2] = gi;
      }
    }
    this.version++;
  }
}

/** Contact-AO falloff (shared constants with the GLSL version in gl-renderer). */
export const AO_RADIUS = 0.3;
export const AO_FLOOR = 0.36;
export const GLOW_RADIUS = 0.85;
