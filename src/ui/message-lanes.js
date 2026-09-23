/**
 * Where the message director's lanes sit, for every HUD layout.
 *
 * Pure geometry, no DOM (like touch-layout.js): `hudReserved()` lists the
 * rectangles a HUD style already owns — compass and boss bar, minimap and kill
 * feed, the corner stacks, the DOOM console, Vanguard's gauge, weapon block
 * and arsenal strip, a phone's touch buttons — and `messageLanes()` fits the
 * headline, comms and chip lanes around them. The numbers mirror the layout
 * code in hud-vanguard.js, hud-modern.js and hud.js, rounded outward, so a
 * unit test can check every style and size for overlaps instead of an eye on
 * one screen.
 *
 * All rectangles are `{ x, y, w, h }` in CSS pixels of the HUD layer.
 */

import { touchZones, BUTTON_KEYS } from "./touch-layout.js";

/** Chip lane: one unlock / achievement chip. */
export const CHIP_W = 300;
export const CHIP_H = 52;
export const CHIP_W_COMPACT = 240;
export const CHIP_H_COMPACT = 30;

/** Headline lane: the widest teach card and its tallest (3 hint lines + narration). */
const HEADLINE_MAX_W = 720;
const HEADLINE_H = 170;
const HEADLINE_H_COMPACT = 84;
/** The teach card's historic top edge; the lane starts 6 px above for its brackets. */
const HEADLINE_TOP = 54;

/** Comms: ARIA's prominent plate (460 wide) with its speaker tab above it. */
const COMMS_W = 460;
const COMMS_H = 96;
const COMMS_H_COMPACT = 66;

const GAP = 10;

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/** Strict overlap: rectangles that only touch do not overlap. */
export function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** @returns {"compact" | "vanguard" | "doom" | "corners"} */
export function layoutKind({ hudStyle = 1, modern = true, compact = false } = {}) {
  if (compact) return "compact";
  if (hudStyle === 4 && modern) return "vanguard";
  if (hudStyle === 1) return "doom";
  return "corners";
}

function opts(o) {
  return {
    hudStyle: 1,
    modern: true,
    compact: false,
    hudScale: 100,
    fontScale: 100,
    minimapSize: 200,
    showKills: true,
    showWeapons: true,
    boss: false,
    ...o,
    safeArea: o.safeArea ?? NO_INSETS,
  };
}

const R = (name, x, y, w, h) => ({ name, x, y, w, h });

/** Vanguard's layer scale (hud-vanguard.js vanguardScale). */
function vanguardK(w, h) {
  return Math.max(1, Math.min(1.6, Math.min(w / 1280, h / 720)));
}

/** The boss bar, top centre (hud-modern.js drawBossBar). */
function bossBar(w, py, fs) {
  const pw = Math.round(Math.min(420, w * 0.4)) + 28;
  return R("bossBar", w / 2 - pw / 2 - 4, 0, pw + 8, py + 40 + 6 + Math.round(4 * (fs - 1)));
}

/**
 * The rectangles the HUD in use already draws in, named.
 * @param {object} o - { w, h, hudStyle, modern, compact, hudScale, fontScale,
 *   minimapSize, showKills, boss, safeArea }
 */
export function hudReserved(o) {
  o = opts(o);
  const { w, h, boss } = o;
  const f = o.hudScale / 100;
  const fs = o.fontScale / 100;
  const kind = layoutKind(o);
  const out = [];

  if (kind === "vanguard") {
    const k = vanguardK(w, h);
    const W = w / k;
    const H = h / k;
    const m = Math.round(22 * Math.min(1, W / 1280) + 6);
    const S = (name, x, y, ww, hh) => out.push(R(name, x * k, y * k, ww * k, hh * k));
    // Compass tape (+ heading readout above, EXIT tag below), boss bar under it.
    const cw = Math.min(440, W * 0.34);
    const bw = Math.min(420, W * 0.4) + 28;
    const tw = boss ? Math.max(cw, bw) + 8 : cw + 8;
    S("compass", W / 2 - tw / 2, 0, tw, boss ? m + 96 + Math.round(4 * (fs - 1)) : m + 40);
    S("topLeft", 0, 0, 240, m + 46 + Math.round(12 * (fs - 1)));
    // Kills / score chips, minimap, kill feed (3 rows).
    const mm = Math.round(o.minimapSize * 0.8);
    const feedRow = Math.round(10 * fs * 1.65) + 5;
    const rw = Math.max(mm, 250);
    S("minimap", W - m - rw, 0, rw + m, m + 30 + mm + 12 + 3 * feedRow);
    // Lower left: gauge, then the readout and chrono chips beside it.
    const gR = Math.round(60 * f);
    const gt = Math.max(6, Math.round(10 * f));
    const gcx = m + gR + gt + 14;
    const gcy = H - m - gR - gt - 8;
    S("gauge", 0, gcy - gR - gt - 8, gcx + gR + gt + 4, H - (gcy - gR - gt - 8));
    S("vitals", gcx + gR + gt - 4, gcy - 44 * fs, 300, H - (gcy - 44 * fs));
    // Lower right, bottom up: ammo, name, silhouette, arsenal strip, pickup captions.
    const bottom = H - m - 14;
    const silTop = bottom - 56 * fs - 24 - 12 * fs - 6 - Math.round(168 * f) * (56 / 160) - 8;
    const arsenalTop = silTop - Math.round(24 * f) - 8;
    const pickTop = arsenalTop - 3 * (Math.round(11 * fs * 1.65) + 5);
    S("weapon", W - m - 260, silTop - 4, 260 + m, H - silTop + 4);
    const aw = 8 * (Math.round(54 * f) + 4);
    S("arsenal", W - m - aw, arsenalTop - 4, aw + m, Math.round(24 * f) + 12);
    S("pickups", W - m - 260, pickTop, 260 + m, arsenalTop - 4 - pickTop);
    return out;
  }

  if (kind === "doom") {
    const barH = Math.round(160 * f);
    // Console, with the stamina / chrono row, its chips and KILLS / SCORE above it.
    out.push(R("console", 0, h - barH - 56, w, barH + 56));
    out.push(R("timer", 0, 0, 150, 56));
    const mm = o.minimapSize;
    out.push(R("minimap", w - mm - 20, 0, mm + 20, mm + 22));
    if (boss) out.push(bossBar(w, 18, fs));
    return out;
  }

  if (kind === "corners") {
    out.push(R("topLeft", 0, 0, 210, 140 + Math.round(20 * (fs - 1))));
    const mm = o.minimapSize;
    const mmY = o.showKills ? 48 : 10;
    out.push(R("minimap", w - mm - 20, 0, mm + 20, mmY + mm + 12));
    // Vitals, weapon strip, ammo and chrono chips along the bottom.
    out.push(R("bottom", 0, h - Math.round(135 * Math.max(f, fs)), w, Math.round(135 * Math.max(f, fs))));
    if (o.hudStyle === 2) {
      // Tactical's arc under the reticle.
      out.push(R("arc", w / 2 - 170 * f, h - Math.round(210 * f), 340 * f, Math.round(210 * f)));
    }
    if (boss) out.push(bossBar(w, 18, fs));
    return out;
  }

  // Landscape phone. Touch buttons own the lower corners.
  const sa = o.safeArea;
  const barH = Math.round(60 * f);
  const mm = Math.min(o.minimapSize, Math.round(w * 0.18));
  const vanguard = o.hudStyle === 4 && o.modern;
  out.push(R("topLeft", 0, 0, 200 + sa.left, 100));
  const rw = Math.max(mm + 20, 140) + sa.right;
  out.push(R("minimap", w - rw, 0, rw, Math.max(mm + 12, 70)));
  if (vanguard) {
    // Kills / score chips and kill feed left of the minimap; compass off centre.
    out.push(R("chips", w - mm - 22 - sa.right - 150, 0, 150, 36));
    out.push(R("killFeed", w - mm - 22 - sa.right - 150, 36, 150, 64));
    const cw = Math.round(w * 0.24);
    out.push(R("compass", w / 2 - w * 0.04 - cw / 2 - 4, 0, cw + 8, 32));
    // Weapon block's pickup captions, bottom centre, right-aligned at w/2 + 70.
    out.push(R("pickups", w / 2 - 125, h - 122, 195, 122));
  }
  if (boss) out.push(bossBar(w, vanguard ? 44 : 18, fs));
  out.push(R("console", 0, h - barH - 44, w, barH + 44));
  const z = touchZones({ w, h, safeArea: sa });
  for (const key of BUTTON_KEYS) {
    const b = z[key];
    out.push(R(key, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2));
  }
  return out;
}

/**
 * Where the low comms plate's bottom edge sat before the lanes existed
 * (aria-comms.js _modernSubtleBottom, and the legacy `h - 70`). The low lane
 * starts here and only moves if something is in the way.
 */
export function commsBottom(o) {
  o = opts(o);
  const { h } = o;
  const f = o.hudScale / 100;
  const fs = o.fontScale / 100;
  if (o.compact) return h - Math.round(60 * f) - Math.round(7 * f) - 26;
  if (o.hudStyle === 1) return h - Math.round(160 * f) - 56;
  if (!o.modern) return h - 70;
  if (o.hudStyle === 0 || o.hudStyle == null) {
    const plateH = Math.max(10 * f + 6 + 4 * f + 4 + 8 * fs, 30 * fs) + 18 + 7;
    const strip = o.showWeapons === false ? 12 : 12 + 30 * f + 8;
    return h - Math.round(strip + plateH + 36 * fs);
  }
  return h - 150;
}

/**
 * Move `r` off every rectangle in `blocks`. A block off to one side pulls
 * that edge in while the lane stays at least `minW` wide; anything else
 * pushes it down (dir 1) or up (dir -1) past the block, at full width again.
 */
function fit(r0, blocks, { minW, dir, gap = GAP }) {
  const r = { ...r0 };
  for (let pass = 0; pass < 24; pass++) {
    const b = blocks.find((q) => overlaps(r, q));
    if (!b) return r;
    const bc = b.x + b.w / 2;
    if (bc < r.x + r.w * 0.3) {
      const left = b.x + b.w + gap;
      if (r.x + r.w - left >= minW) {
        r.w -= left - r.x;
        r.x = left;
        continue;
      }
    } else if (bc > r.x + r.w * 0.7) {
      const right = b.x - gap;
      if (right - r.x >= minW) {
        r.w = right - r.x;
        continue;
      }
    }
    // Past it, the edges pulled in for blocks above no longer apply.
    r.y = dir > 0 ? b.y + b.h + gap : b.y - gap - r.h;
    r.x = r0.x;
    r.w = r0.w;
  }
  return r;
}

/**
 * The lanes for this frame. On a phone there is no room for a chip beside
 * the headline, so the chip lane may sit where the headline does and chips
 * wait for the headline to clear (`chipsShareHeadline`).
 * @returns {{ headline, comms, commsLow, chips, reserved, kind, chipsShareHeadline }}
 */
export function messageLanes(o) {
  o = opts(o);
  const { w, h } = o;
  const reserved = hudReserved(o);
  const kind = layoutKind(o);
  const compact = kind === "compact";
  const cx = w / 2;
  const sa = o.safeArea;
  const gap = compact ? 6 : GAP;

  const hw = Math.min(HEADLINE_MAX_W, w - 80);
  const headlineAt = { x: cx - hw / 2, y: compact ? 6 : HEADLINE_TOP, w: hw, h: compact ? HEADLINE_H_COMPACT : HEADLINE_H };
  let headline = fit(headlineAt, reserved, { minW: compact ? 260 : 600, dir: 1, gap });
  if (compact && headline.y > headlineAt.y + 60) {
    // A small phone has no gap at the top wide enough for a card: let it
    // cover the kill feed (entries last three seconds) rather than drop onto
    // the reticle.
    headline = fit(headlineAt, reserved.filter((q) => q.name !== "killFeed"), { minW: 260, dir: 1, gap });
  }

  // Chips: right margin, under whatever holds the top-right corner.
  const chipW = compact ? CHIP_W_COMPACT : CHIP_W;
  const chipH = compact ? CHIP_H_COMPACT + 2 : CHIP_H + 8;
  const margin = kind === "vanguard" ? Math.round((22 * Math.min(1, w / vanguardK(w, h) / 1280) + 6) * vanguardK(w, h)) : 10;
  const chipAt = { x: w - margin - sa.right - chipW, y: 0, w: chipW, h: chipH };
  const beside = compact ? [] : [headline];
  let chips = fit(chipAt, [...reserved, ...beside], { minW: chipW, dir: 1, gap });
  if (reserved.some((q) => overlaps(chips, q)) || chips.y + chips.h > h) {
    // A big minimap leaves no room above Vanguard's pickup captions: share
    // that corner with them rather than cover the weapon block.
    const soft = reserved.filter((q) => q.name !== "pickups");
    chips = fit(chipAt, [...soft, ...beside], { minW: chipW, dir: 1, gap });
  }

  // Low comms: the old subtle anchor, raised past anything under it.
  const lw = Math.min(COMMS_W, w - 24);
  const lh = compact ? COMMS_H_COMPACT : COMMS_H;
  const commsLow = fit(
    { x: cx - lw / 2, y: commsBottom(o) - lh, w: lw, h: lh },
    [...reserved, chips],
    { minW: compact ? 300 : 360, dir: -1, gap },
  );

  // Top comms: ARIA's prominent anchor (0.135 h), below the top-centre strip.
  // On a phone the top belongs to the clusters and the headline, so every
  // plate takes the low slot.
  const comms = compact
    ? commsLow
    : fit({ x: cx - lw / 2, y: Math.round(h * 0.135) - 12, w: lw, h: COMMS_H }, [...reserved, chips], { minW: 440, dir: 1, gap });

  return { headline, comms, commsLow, chips, reserved, kind, chipsShareHeadline: compact };
}
