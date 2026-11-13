import {
  CHARACTER_COLORS,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EXPRESSIONS,
  EYE_COLORS,
  ARMOR_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  BACKSTORIES,
  VOICE_PROFILES,
  BODY_FRAMES,
  BODY_TYPES,
  CAPE_STYLES,
  CAMO_STYLES,
} from "../data/index.js";
import { GEAR_SLOTS, gearPickCounts, takesVisor } from "../data/cosmetics.js";
import { bonusText } from "../data/gear-stats.js";
import { SYMBOLS, FRAMES, ENAMELS, METALS, FINISHES, PLACEMENTS } from "../data/badges.js";
import { ACCESSORY_SLOTS, ACCESSORIES, FACE_SLOTS, PAINT_SWATCHES, accessoryItem, tintFor } from "../data/accessories.js";
import { getIndex, withIndex, lookKey, pieceOf } from "../core/character-fields.js";
import { unlockState } from "../systems/unlocks.js";
import { getLayerImage, layerFailed } from "../rendering/svg-art/raster.js";
import { renderBadge, resolveTreatment } from "../rendering/svg-art/insignia/compose.js";
import { buildAgentParts, hairOf, AGENT_VIEW, GEAR_VIEW, MOUTH_VIEW } from "../rendering/svg-art/agent-rig.js";
import { FACE_HELMETS, WARDROBE_THEMES } from "../data/wardrobe-themes/index.js";
import { faceSlotBlock, helmetMouth, mouthBlock } from "../rendering/svg-art/wardrobe-themes/index.js";
import { drawPrompt } from "./input-glyphs.js";

// ── Shared category definitions (used by render + click handler) ──

/**
 * One tab per editable field. `key` is a character-fields key — flat for the
 * legacy indices, virtual (`badge.*`, `acc.<slot>`) for the nested badge stack
 * and accessory slots — so every read goes through getIndex and every write
 * through withIndex. `multi` marks the one tab that toggles a set (placements)
 * instead of picking a single index.
 */
export const CREATOR_CATEGORIES = [
  { name: "NAME", shortLabel: "NAME", data: null, key: null },
  {
    name: "COLOR",
    shortLabel: "CLR",
    data: CHARACTER_COLORS,
    key: "color",
  },
  { name: "FACE", shortLabel: "FACE", data: SKIN_TONES, key: "skinTone" },
  { name: "HAIR", shortLabel: "HAIR", data: HAIR_STYLES, key: "hair" },
  { name: "EYES", shortLabel: "EYES", data: EYE_COLORS, key: "eye" },
  // The mouth's expression, each row with a close-up of the face wearing it.
  { name: "EXPRESSION", shortLabel: "EXPR", data: EXPRESSIONS, key: "expression" },
  { name: "BODY", shortLabel: "BODY", data: BODY_TYPES, key: "body" },
  { name: "ARMOR", shortLabel: "ARMR", data: ARMOR_STYLES, key: "armor" },
  // The suit's silhouette, theme by theme (listWindow captions), as the showroom's Frame grid.
  { name: "SUIT FRAME", shortLabel: "SUIT", data: BODY_FRAMES, key: "frame" },
  { name: "UNDER-SUIT", shortLabel: "UNDR", data: CAMO_STYLES, key: "camo" },
  { name: "HELMET", shortLabel: "HELM", data: HELMET_STYLES, key: "helmet" },
  { name: "VISOR", shortLabel: "VSR", data: VISOR_STYLES, key: "visor" },
  { name: "SHOULDER", shortLabel: "SHLD", data: SHOULDER_STYLES, key: "shoulder" },
  { name: "BADGE", shortLabel: "BDGE", data: SYMBOLS, key: "badge.symbol" },
  { name: "FRAME", shortLabel: "FRM", data: FRAMES, key: "badge.frame" },
  { name: "ENAMEL", shortLabel: "ENML", data: ENAMELS, key: "badge.enamel" },
  { name: "METAL", shortLabel: "MTL", data: METALS, key: "badge.metal" },
  { name: "FINISH", shortLabel: "FIN", data: FINISHES, key: "badge.finish" },
  { name: "PLACE", shortLabel: "PLC", data: PLACEMENTS, key: "badge.placement", multi: true },
  { name: "CAPE", shortLabel: "CAPE", data: CAPE_STYLES, key: "cape" },
  ...ACCESSORY_SLOTS.map((s) => ({
    name: `GEAR ${s.name.toUpperCase()}`,
    shortLabel: `G${s.name.slice(0, 3).toUpperCase()}`,
    data: ACCESSORIES[s.id],
    key: `acc.${s.id}`,
    slot: s.id,
  })),
  {
    name: "SKIN",
    shortLabel: "SKIN",
    data: WEAPON_SKINS,
    key: "weaponSkin",
  },
  {
    name: "LOADOUT",
    shortLabel: "LOAD",
    data: LOADOUT_CLASSES,
    key: "loadout",
  },
  { name: "ORIGIN", shortLabel: "ORGN", data: BACKSTORIES, key: "backstory" },
  { name: "VOICE", shortLabel: "VOX", data: VOICE_PROFILES, key: "voice" },
];

/** Switch tab, resetting the placement highlight so PLACE always opens on row 0. */
export function setCreatorCategory(game, index) {
  game.creatorCategory = index;
  game.creatorPlacementSel = 0;
}

/** Bounds of tab `i` in the (possibly multi-row) tab strip. */
export function tabRect(L, i) {
  const row = Math.floor(i / L.perRow);
  const col = i - row * L.perRow;
  const inRow = Math.min(L.perRow, CREATOR_CATEGORIES.length - row * L.perRow);
  const rowW = inRow * L.tabW + (inRow - 1) * L.tabGap;
  return {
    x: Math.round((L.width - rowW) / 2 + col * (L.tabW + L.tabGap)),
    y: L.tabY + row * (L.tabH + L.tabGap),
    w: L.tabW,
    h: L.tabH,
  };
}

// ── Layout calculator (shared between render + click detection) ──

/** Canvas px per CSS px: the touch overlay and the safe area are measured in CSS px. */
export function cssScale(w) {
  const cssW = typeof window !== "undefined" && window.innerWidth > 0 ? window.innerWidth : w;
  return w / cssW;
}

/**
 * Width to keep clear down each side of the tab strip and the panels. The
 * touch overlay puts its ◀/▶ category arrows and their 60 CSS-px tap zones
 * there (js/touch.js), and a notch's safe area may reach further in.
 */
function edgeInset(w, isTouch, safeArea = {}) {
  if (!isTouch) return 0;
  return Math.ceil(Math.max(CREATOR_EDGE_ZONE, safeArea.left || 0, safeArea.right || 0) * cssScale(w));
}

/**
 * The creator's layout in canvas px. On touch, `safeArea` (CSS px, the touch
 * overlay's: game.touchControls.safeArea) keeps the panels clear of a notch
 * and above BACK / SAVE, which sit over the bottom inset (creatorTouchControls).
 */
export function getCreatorLayout(w, h, isMobile, isTouch = false, safeArea = null) {
  const sa = safeArea || {};
  const titleY = isMobile ? 34 : 44;
  const n = CREATOR_CATEGORIES.length;
  // The canvas is sized in device pixels on a phone (js/main.js
  // resizeCanvases), so what is measured against a finger or the screen
  // goes through CSS px: `k` canvas px each.
  const k = cssScale(w);
  // A fingertip on touch (28 CSS px), in canvas px.
  const tip = Math.round(TOUCH_TIP * (isTouch ? k : 1));
  // A touch phone on its side is short of rows, not of width: its tabs
  // narrow to a fingertip with tighter gaps, so thirty-odd tabs keep to two
  // rows and the lists keep their height.
  const shortTouch = isTouch && h / k < 500;
  const tabGap = shortTouch ? 3 : isMobile ? 4 : 8;
  const minTabW = isMobile || shortTouch ? tip : 42;
  const maxTabW = isMobile ? 46 : 86;
  // Two dozen-odd tabs no longer fit on one row, so the strip wraps: take the
  // fewest rows that let every tab keep its minimum width, then spread the
  // tabs evenly over them.
  const avail = w - (isMobile ? 16 : 50) - 2 * edgeInset(w, isTouch, sa);
  const fitPerRow = Math.max(1, Math.floor((avail + tabGap) / (minTabW + tabGap)));
  const tabRows = Math.ceil(n / fitPerRow);
  const perRow = Math.ceil(n / tabRows);
  const tabW = Math.max(
    minTabW,
    Math.min(maxTabW, Math.floor((avail - (perRow - 1) * tabGap) / perRow)),
  );
  const tabH = isMobile ? 24 : 28;
  const tabY = titleY + 22;
  const tabStripH = tabRows * tabH + (tabRows - 1) * tabGap;

  const contentY = tabY + tabStripH + (isMobile ? 12 : 20);
  // A touch phone on its side: a wider list (a narrower preview and info
  // beside it, which the short screen cannot fill anyway) so the HAIR tab's
  // colour swatches stay finger-sized beside two rows of cuts, and the
  // content clears the edge zones that cycle tabs (edgeInset).
  let listW = isMobile ? Math.min(w * 0.45, shortTouch ? 300 : 180) : shortTouch ? 300 : 230;
  let previewW = isMobile ? Math.min(w * 0.4, 140) : shortTouch ? 180 : 300;
  let infoW = isMobile ? 0 : shortTouch ? 180 : 240;
  const contentGap = isMobile ? 8 : 20;
  const gaps = (isMobile ? 0 : contentGap) + contentGap;
  // A notch wider than the edge zones: the panels narrow to stay clear of it.
  const room = w - 2 * edgeInset(w, isTouch, sa) - gaps;
  const fit = isTouch ? Math.min(1, room / (listW + previewW + infoW)) : 1;
  listW = Math.floor(listW * fit);
  previewW = Math.floor(previewW * fit);
  infoW = Math.floor(infoW * fit);
  const totalContentW = listW + previewW + infoW + gaps;
  const contentX = (w - totalContentW) / 2;
  const itemH = isMobile ? 32 : 36;
  // Desktop used to leave availH unbounded, so each panel sized itself to its
  // item count. A 5-entry category produced a ~200px block pinned to the top
  // with most of the screen empty, and the panel height jumped between tabs.
  // On touch the panels end above BACK / SAVE (creatorTouchControls), which
  // stand on the bottom safe area.
  const availH = isTouch
    ? Math.floor(creatorTouchControls(w / k, h / k, sa).back.y * k) - 8 - contentY
    : h - contentY - (isMobile ? 80 : 70);
  const panelH = Math.max(itemH * 3 + 16, availH);
  const maxBySpace = Math.max(3, Math.floor((panelH - 16) / itemH));

  return {
    width: w,
    touch: isTouch,
    tip,
    inset: edgeInset(w, isTouch, sa),
    titleY,
    tabGap,
    tabW,
    tabH,
    tabRows,
    perRow,
    tabStripH,
    tabY,
    contentY,
    listW,
    previewW,
    infoW,
    contentGap,
    totalContentW,
    contentX,
    itemH,
    availH,
    panelH,
    maxBySpace,
  };
}

/** A fingertip, in CSS px: the smallest tab or swatch a touch screen gets. */
const TOUCH_TIP = 28;

/** The smallest hair colour swatch on touch, in CSS px (the layout's `tip` in canvas px). */
export const HAIR_SWATCH_MIN_TOUCH = TOUCH_TIP;

/**
 * The hair colour swatches under the cuts on the HAIR tab: a labelled grid
 * at the foot of the list panel. Shared by the renderer and the click
 * handler (src/systems/input-click-dispatch.js) so both see the same boxes.
 */
export function hairColorSwatches(L) {
  const pad = L.touch ? 6 : 10;
  const gap = L.touch ? 3 : 4;
  const labelH = 20;
  // On touch the row keeps out of the edge zones, where a tap cycles tabs.
  const left = Math.max(L.contentX + pad, L.inset || 0);
  const right = Math.min(L.contentX + L.listW - pad, L.width - (L.inset || 0));
  const avail = right - left;
  // Mouse: two tidy rows of nine. Touch: as many columns as keep a fingertip swatch.
  const cols = L.touch ? Math.max(1, Math.min(9, Math.floor((avail + gap) / ((L.tip ?? HAIR_SWATCH_MIN_TOUCH) + gap)))) : 9;
  const size = Math.floor((avail - (cols - 1) * gap) / cols);
  const rows = Math.ceil(HAIR_COLORS.length / cols);
  const h = labelH + rows * size + (rows - 1) * gap + pad;
  const top = L.contentY + L.panelH - h;
  const rects = HAIR_COLORS.map((_, i) => ({
    x: left + (i % cols) * (size + gap),
    y: top + labelH + Math.floor(i / cols) * (size + gap),
    w: size,
    h: size,
  }));
  return { top, h, labelY: top + labelH - 6, rects };
}

/** The keys that step through the hair colours: Q / E on a keyboard, LB / RB on a pad, none on touch. */
export const HAIR_COLOR_PROMPT = [["prevTab"], ["nextTab"]];

/**
 * The hair colour row's key hint, right-aligned at x, centred on y, in the
 * glyphs of the device in use. `input` is the game (device, pad family,
 * keybinds). Returns the width drawn (0 on touch: the swatches are tapped).
 */
export function drawHairColorHint(ctx, x, y, input) {
  return drawPrompt(ctx, x, y, HAIR_COLOR_PROMPT, { input, look: "legacy", align: "right", size: 10, color: "rgba(255,255,255,0.45)" });
}

// ── Prompts: the keys along the foot, the touch hints beside BACK / SAVE ──

/** The keys and pad buttons along the foot (src/ui/input-glyphs.js): the NAME tab types, so arrows step tabs. */
export const CREATOR_NAME_PROMPT = [["arrowsH", "category"], ["confirm", "save"], ["back", "cancel"]];
export const CREATOR_PROMPT = [["navigateH", "category"], ["navigateV", "select"], ["confirm", "save"], ["back", "cancel"]];
/** PLACE toggles: up / down move a row cursor and SPACE wears the badge there. */
export const CREATOR_PLACE_PROMPT = [["navigateH", "category"], ["navigateV", "row"], ["toggle", "wear here"], ["confirm", "save"], ["back", "cancel"]];

/** The foot's prompt for a tab (null: the NAME tab). */
export function creatorPrompt(curCat) {
  if (!curCat?.key) return CREATOR_NAME_PROMPT;
  return curCat.multi ? CREATOR_PLACE_PROMPT : CREATOR_PROMPT;
}

/**
 * On touch the foot holds BACK and SAVE (js/touch.js), so the hints sit in
 * the lanes beside them: left of BACK, the ◀ / ▶ edge zones step tabs;
 * right of SAVE, a tap picks a tab or a row.
 */
export const CREATOR_TOUCH_HINTS = [[["edgeTabs", "switch tab"]], [["tap", "a tab or row"]]];

/** CSS px down each side of a touch screen where a tap steps tabs and the ◀ / ▶ arrows sit (js/touch.js). */
export const CREATOR_EDGE_ZONE = 64;

/**
 * The touch overlay's controls in CSS px: BACK and SAVE side by side at the
 * foot, above the safe area, and the lane each side of them that a hint may
 * use, clear of the edge zones. Shared by js/touch.js (drawing and taps) and
 * the hint layout.
 * @param {{ top?: number, right?: number, bottom?: number, left?: number }} [safeArea]
 */
export function creatorTouchControls(w, h, safeArea = {}) {
  const btnH = 52;
  const btnW = Math.min(140, Math.max(110, w * 0.18));
  const gap = 16;
  const btnY = h - btnH - 16 - (safeArea.bottom || 0);
  const back = { x: w / 2 - gap / 2 - btnW, y: btnY, w: btnW, h: btnH };
  const save = { x: w / 2 + gap / 2, y: btnY, w: btnW, h: btnH };
  const pad = 8;
  const leftEdge = Math.max(CREATOR_EDGE_ZONE, safeArea.left || 0) + pad;
  const rightEdge = w - Math.max(CREATOR_EDGE_ZONE, safeArea.right || 0) - pad;
  const lanes = [
    { x: leftEdge, w: Math.max(0, back.x - pad - leftEdge) },
    { x: save.x + save.w + pad, w: Math.max(0, rightEdge - (save.x + save.w + pad)) },
  ];
  return { back, save, lanes, midY: btnY + btnH / 2 };
}

/**
 * Where each touch hint goes: centred in its lane on the buttons' middle,
 * at the largest legend size that fits, or left out when none does (a
 * phone upright has no lane beside the buttons). `ctx` measures the text.
 * @returns {{ items: Array, x: number, y: number, w: number, h: number, size: number }[]}
 */
export function creatorTouchHints(ctx, controls, input) {
  const out = [];
  CREATOR_TOUCH_HINTS.forEach((items, i) => {
    const lane = controls.lanes[i];
    for (const size of [11, 10, 9]) {
      const w = drawPrompt(ctx, 0, 0, items, { input, device: "touch", look: "legacy", size, measure: true });
      if (!w || w > lane.w) continue;
      const h = Math.round(size * 1.8);
      out.push({ items, x: Math.round(lane.x + (lane.w - w) / 2), y: Math.round(controls.midY - h / 2), w, h, size });
      break;
    }
  });
  return out;
}

/** Draw the touch hints (creatorTouchHints) in the overlay's dim ink. */
export function drawCreatorTouchHints(ctx, controls, input) {
  for (const hint of creatorTouchHints(ctx, controls, input)) {
    drawPrompt(ctx, hint.x, hint.y + hint.h / 2, hint.items, { input, device: "touch", look: "legacy", size: hint.size, color: "rgba(255,255,255,0.45)" });
  }
}

/** Words of `text` in lines of at most `max` characters (the list's monospace font). */
function wrapChars(text, max) {
  const lines = [];
  for (const word of text.split(" ")) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + 1 + word.length <= max) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

const STAT_SLOTS = new Set(GEAR_SLOTS.map(([key]) => key));

/**
 * The info panel's perk lines for a gear pick, one stat a line (bonusText:
 * "Looks only" for a piece with none); [] for a tab that is not gear or an
 * accessory slot's "None".
 * @param {{ key: string, slot?: string }} cat the creator tab
 * @param {{ id: string, bonuses?: object }} item the pick
 * @returns {string[]}
 */
export function gearPerkLines(cat, item) {
  if (cat.slot ? item.id === "none" : !STAT_SLOTS.has(cat.key)) return [];
  return bonusText(item.bonuses).split(" · ");
}

/** The info panel's text styles: font, size (px) and line step. */
export const INFO_TEXT = Object.freeze({
  desc: Object.freeze({ font: "11px monospace", size: 11, line: 16 }),
  perk: Object.freeze({ font: "bold 10px monospace", size: 10, line: 13 }),
  note: Object.freeze({ font: "9px monospace", size: 9, line: 12 }),
});

/**
 * Where the info panel's description, perk lines and note go: the
 * description wrapped to the panel from under the title, the perk lines
 * (each wrapped too) from where the description ends, the note under them.
 * Each line is `{ text, x, y, rect }`, y the baseline and rect its box. On a
 * panel too short for that (a phone on its side, a long description), the
 * lines close up to fit.
 * @param {object} L getCreatorLayout's layout
 * @param {number} infoX the panel's left edge
 * @param {{ desc?: string, perk?: string[], note?: string[] }} text
 * @param {(text: string, font: string) => number} measure width of `text` in `font`
 * @returns {{ desc: object[], perk: object[], note: object[], bottom: number }}
 */
export function infoTextLayout(L, infoX, text, measure) {
  const roomy = layInfoText(L, infoX, text, measure, false);
  return roomy.bottom <= L.contentY + L.panelH ? roomy : layInfoText(L, infoX, text, measure, true);
}

function layInfoText(L, infoX, { desc = "", perk = [], note = [] }, measure, tight) {
  const x = infoX + 12;
  const maxW = L.infoW - 24;
  let y = L.contentY + 50;
  let started = false;
  const out = { desc: [], perk: [], note: [], bottom: y };
  const put = (list, text, style) => {
    if (started) y += tight ? style.size + 2 : style.line;
    started = true;
    list.push({ text, x, y, rect: { x, y: y - style.size * 0.8, w: measure(text, style.font), h: style.size } });
  };
  const wrap = (text, style) => {
    const lines = [];
    for (const word of text.split(" ")) {
      const last = lines.length - 1;
      if (last >= 0 && measure(`${lines[last]} ${word}`, style.font) <= maxW) lines[last] += ` ${word}`;
      else lines.push(word);
    }
    return lines;
  };
  for (const line of desc ? wrap(desc, INFO_TEXT.desc) : []) put(out.desc, line, INFO_TEXT.desc);
  // A gap under the description before the perk.
  if (out.desc.length) y += tight ? 3 : 6;
  for (const stat of perk) for (const line of wrap(stat, INFO_TEXT.perk)) put(out.perk, line, INFO_TEXT.perk);
  for (const n of note) for (const line of wrap(n, INFO_TEXT.note)) put(out.note, line, INFO_TEXT.note);
  out.bottom = y + 3;
  return out;
}

/** Line height and character width of the foot's note, bold 10px monospace. */
const NOTE_LINE = 13;
const NOTE_CHAR = 6.1;

/** The smallest paint swatch on touch, in canvas px: a fingertip, as the hair colours. */
export const PAINT_SWATCH_MIN_TOUCH = HAIR_SWATCH_MIN_TOUCH;

/**
 * What a foot note says for each reason a pick is not drawn: the heading
 * before the helmet's name, the line under it, and the heading that names
 * no helmet, for a short screen.
 */
const FOOT_NOTES = {
  hidden: ["Hidden under the", "Shows with an open helmet", "HIDDEN UNDER THIS HELMET"],
  room: ["No room under the", "Shows with another helmet", "NO ROOM UNDER THIS HELMET"],
  covered: ["Covered by the", "Shows with another helmet", "COVERED BY THIS HELMET"],
};

/**
 * The foot of the list panel on the eyes, face and expression tabs, bottom
 * up: the paint swatches when the item worn takes a colour of its own (War
 * Paint), and above them a note when the helmet worn hides the slot or the
 * mouth ("Hidden under the …"), leaves the slot no room ("No room under the
 * …") or covers the mouth ("Covered by the …"), the way the visor tab notes
 * a helmet with no visor. Null when there is neither. Shared by the
 * renderer and the click handler, like hairColorSwatches.
 * `head` lines are the note's heading and `sub` the line under it (both
 * empty without a note), baselines from `noteY`, one NOTE_LINE apart.
 * `tint` is the colour row: the slot, the item's label, the label's
 * baseline and one box per PAINT_SWATCHES entry. The canvas offers the
 * swatches only; a colour of the player's own is mixed in the showroom.
 * @returns {{ top: number, h: number, head: string[], sub: string[], noteY: number,
 *   tint: { slot: string, label: string, labelY: number, rects: { x: number, y: number, w: number, h: number }[] } | null } | null}
 */
export function faceSlotFoot(L, curCat, ch) {
  const slot = curCat.slot;
  const mouth = curCat.key === "expression";
  if (!mouth && !FACE_SLOTS.includes(slot)) return null;
  const helmet = pieceOf(ch, "helmet");
  const block = mouth ? mouthBlock(helmet.id) : faceSlotBlock(helmet.id, slot);
  const tintable = mouth ? null : accessoryItem(slot, ch.accessories?.[slot])?.tint;
  if (!block && !tintable) return null;
  const pad = L.touch ? 6 : 10;
  const max = Math.max(8, Math.floor((L.listW - 20) / NOTE_CHAR));
  const words = block && FOOT_NOTES[block];
  let head = block ? wrapChars(`${words[0]} ${helmet.name}`.toUpperCase(), max) : [];
  let sub = block ? wrapChars(words[1], max) : [];
  let tintH = 0;
  let row = null;
  if (tintable) {
    // Swatches as the hair colours lay theirs out: out of the touch edge
    // zones, fingertip-sized on touch, one row of seven with a mouse.
    const gap = L.touch ? 3 : 4;
    const labelH = 20;
    const left = Math.max(L.contentX + pad, L.inset || 0);
    const right = Math.min(L.contentX + L.listW - pad, L.width - (L.inset || 0));
    const avail = right - left;
    const n = PAINT_SWATCHES.length;
    const cols = L.touch ? Math.max(1, Math.min(n, Math.floor((avail + gap) / ((L.tip ?? PAINT_SWATCH_MIN_TOUCH) + gap)))) : n;
    const size = Math.min(L.touch ? Infinity : 24, Math.floor((avail - (cols - 1) * gap) / cols));
    const rows = Math.ceil(n / cols);
    tintH = labelH + rows * size + (rows - 1) * gap + pad;
    row = { left, gap, cols, size, labelH, label: tintable.label };
  }
  // Two rows of picks stay above the foot: on a short screen the note gives
  // up its second line, then names no helmet.
  const room = L.panelH - 16 - 2 * L.itemH - pad - tintH;
  const noteOf = () => (block ? (head.length + sub.length) * NOTE_LINE + pad : 0);
  if (noteOf() > room) sub = [];
  if (noteOf() > room) head = [words[2]];
  const noteH = noteOf();
  const h = pad + noteH + tintH;
  const top = L.contentY + L.panelH - h;
  let tint = null;
  if (row) {
    const rowTop = top + pad + noteH;
    tint = {
      slot,
      label: row.label,
      labelY: rowTop + row.labelH - 6,
      rects: PAINT_SWATCHES.map((_, i) => ({
        x: row.left + (i % row.cols) * (row.size + row.gap),
        y: rowTop + row.labelH + Math.floor(i / row.cols) * (row.size + row.gap),
        w: row.size,
        h: row.size,
      })),
    };
  }
  return { top, h, head, sub, noteY: top + pad + NOTE_LINE - 3, tint };
}

/**
 * How many option rows a tab's list shows: the HAIR tab gives the foot of
 * the panel to its colours, the eyes and face tabs to their note and paint
 * (ch: the character, for the helmet and item worn).
 */
export function listRows(L, curCat, ch) {
  const foot = curCat.key === "hair" ? hairColorSwatches(L).h : faceSlotFoot(L, curCat, ch)?.h || 0;
  if (!foot) return Math.min(curCat.data.length, L.maxBySpace);
  const free = Math.floor((L.panelH - 16 - foot) / L.itemH);
  return Math.min(curCat.data.length, Math.max(2, free));
}

/** Height of a theme caption row in the list, canvas px. */
export const LIST_CAPTION_H = 18;

const THEME_NAMES = Object.fromEntries(WARDROBE_THEMES.map((t) => [t.id, t.name]));

/**
 * The rows the list panel shows: option rows, and on the helmet and
 * shoulder tabs a caption row ahead of each theme's run (the showroom's
 * groupBy captions), scrolled so the selected option is in view. A run
 * scrolled into from above keeps its caption at the top. Shared by the
 * renderer and the click handler (src/systems/input-click-dispatch.js).
 * @returns {{ type: "caption"|"item", y: number, h: number, i?: number, text?: string }[]}
 */
export function listWindow(L, curCat, ch, selIdx) {
  const items = curCat.data;
  const height = listRows(L, curCat, ch) * L.itemH;
  const themed = items.some((e) => e.theme) && new Set(items.map((e) => e.theme)).size > 1;
  // Every row in table order, captions included.
  const all = [];
  items.forEach((item, i) => {
    if (themed && (i === 0 || items[i - 1].theme !== item.theme)) all.push({ type: "caption", h: LIST_CAPTION_H, text: THEME_NAMES[item.theme].toUpperCase(), theme: item.theme });
    all.push({ type: "item", h: L.itemH, i });
  });
  // The run's caption, when the window starts inside it.
  const stickyFor = (k) => (themed && all[k].type === "item" ? all.findLast((r, j) => j < k && r.type === "caption") : null);
  const span = (from, to) => all.slice(from, to + 1).reduce((t, r) => t + r.h, 0) + (stickyFor(from)?.h || 0);
  const sel = Math.max(0, all.findIndex((r) => r.type === "item" && r.i === selIdx));
  // The first row: from the top, or as far down as keeps the pick on the bottom row.
  let start = 0;
  while (start < sel && span(start, sel) > height) start++;
  const rows = [];
  let y = L.contentY + 8;
  const sticky = stickyFor(start);
  if (sticky) {
    rows.push({ ...sticky, y });
    y += sticky.h;
  }
  for (let k = start; k < all.length; k++) {
    if (y + all[k].h > L.contentY + 8 + height) break;
    rows.push({ ...all[k], y });
    y += all[k].h;
  }
  // A caption with none of its run under it says nothing.
  if (rows.at(-1)?.type === "caption") rows.pop();
  return rows;
}

// ── Shared SVG art, rasterised onto the canvas ──
//
// Badges and accessories only exist as SVG, so the Legacy creator draws them
// the way the Modern portrait does: compose the markup once per look, hand it
// to the raster cache, blit the bitmap. getLayerImage returns null until the
// decode lands; the creator redraws every frame, so the art simply appears a
// frame later rather than blocking.

const BADGE_BOX = [-54, -54, 108, 108];

const badgeSig = (b) =>
  `${b.finish}|${b.layers.map((l) => `${l.frame}:${l.symbol}:${l.enamel}:${l.metal}`).join(";")}`;

/** Raster id + markup for a character's composed badge. */
function badgeLayer(ch, detail = "high") {
  const t = resolveTreatment(ch);
  return {
    id: `legacy-badge:${detail}:${badgeSig(ch.badge)}:${t.finish}:${t.metal}`,
    markup: renderBadge(ch.badge, { treatment: t, detail }),
  };
}

// How the preview stands for the field being edited — the same rules the
// showroom uses (js/components/agent-showroom.js): the rifle only exists in the
// armed pose, and the face is only drawn under a closed helmet when asked for.
const ARMED_KEYS = new Set(["loadout", "weaponSkin"]);
const FACE_KEYS = new Set(["skinTone", "hair", "hairColor", "expression", "eye"]);
// Tabs whose pieces are small on the whole figure (the FACE, HAIR, EYES and
// EXPRESSION tabs, and the eyewear and face gear): the preview moves in to
// the bust while one is open, as the showroom's stage does (CLOSE_UP there),
// and stands back for every other tab.
const CLOSE_UP_KEYS = new Set(["skinTone", "hair", "eye", "expression", "acc.eyes", "acc.face"]);
const IDLE_STAGE = { pose: "idle", peek: false, view: "full" };

/** The preview's camera on a tab: "bust" on a close-up tab, else the whole figure. */
export function previewView(key) {
  return CLOSE_UP_KEYS.has(key) ? "bust" : "full";
}

function stageFor(key, ch) {
  const helmet = pieceOf(ch, "helmet").id;
  return {
    pose: ARMED_KEYS.has(key) ? "hero" : "idle",
    // The LED mask is open, so an expression shows in its pixels, unpeeked.
    peek: FACE_KEYS.has(key) && !FACE_HELMETS.has(helmet),
    view: previewView(key),
  };
}

/** Defs + markup for the full customised agent, in AGENT_VIEW.full space. */
function agentMarkup(ch, { pose, peek } = IDLE_STAGE) {
  const p = buildAgentParts(ch, { pose, peek });
  const k = Math.round(p.width * 100) / 100;
  const tf = k === 1 ? "" : ` transform="scale(${k} 1)"`;
  return {
    defs: p.defs,
    markup: `${p.shadow}<g${tf}>${p.back}${p.cape}${p.body}</g>${p.nape}<g${tf}>${p.neck}${p.glow}</g>${p.head}${p.headGlow}`,
  };
}

/** Device pixels per canvas unit, so bitmaps are decoded at the size they draw. */
function pixelRatio(ctx) {
  const m = ctx.getTransform ? ctx.getTransform() : null;
  return m ? Math.hypot(m.a, m.b) || 1 : 1;
}

// The preview is the rig's own figure (the showroom's), decoded to a bitmap
// by the raster cache. A new look takes a few frames to decode; until it
// lands the last decoded figure stays on screen, so a change of look never
// blanks the preview and no hand-drawn stand-in is needed. Only the first
// figure of a session has nothing before it.
let _figure = null; // the look asked for: { key, defs, markup, asked, decodeMs }
let _shown = null; // the last look that decoded, and the scale it decoded at
const _failed = new Set(); // looks whose figure would not decode, each logged once

/**
 * The preview's figure: the look asked for, the one on screen (keys start
 * with the camera, "full" or "bust"), and how long the last one took to
 * decode (ms).
 */
export function previewFigure() {
  return { wanted: _figure?.key ?? null, shown: _shown?.key ?? null, decodeMs: _shown?.decodeMs ?? null };
}

/**
 * Draw the customised agent centred on (cx, cy), posed and framed for the
 * field being edited (stage.view, an AGENT_VIEW crop): the look asked for
 * once it has decoded, the last decoded look until then. `heightFor(box)`
 * is how tall a crop draws, so a figure kept on screen keeps its own size.
 */
function drawAgentFigure(ctx, ch, cx, cy, heightFor, stage = IDLE_STAGE) {
  const view = stage.view || "full";
  const key = `${view}:${stage.pose}:${stage.peek ? 1 : 0}:${lookKey(ch)}`;
  if (!_figure || _figure.key !== key) _figure = { key, box: AGENT_VIEW[view], ...agentMarkup(ch, stage), asked: performance.now() };
  const scale = (heightFor(_figure.box) / _figure.box[3]) * pixelRatio(ctx);
  let img = getLayerImage(`legacy-agent:${key}`, _figure.box, _figure.defs, _figure.markup, scale);
  let shown = _figure;
  if (!img && layerFailed(`legacy-agent:${key}`, scale)) {
    // A figure that will never decode: say so once, stop waiting on it and
    // keep the last good one up.
    if (!_failed.has(key)) {
      _failed.add(key);
      console.warn(`character creator: the preview figure failed to decode (${key})`);
    }
    _figure = null;
  }
  if (img) {
    if (_shown?.key !== key) _shown = { ..._figure, scale, decodeMs: performance.now() - _figure.asked };
  } else if (_shown) {
    shown = _shown;
    img = getLayerImage(`legacy-agent:${_shown.key}`, _shown.box, _shown.defs, _shown.markup, _shown.scale);
  }
  if (!img) return;
  const h = heightFor(shown.box);
  const w = (shown.box[2] / shown.box[3]) * h;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

// Option tiles preview the character as it would look with that option. Both
// the markup and the id are built once per look, not once per frame.
const _tiles = new Map();
let _tileSig = "";

const BADGE_TILE_KEYS = new Set([
  "badge.symbol",
  "badge.frame",
  "badge.enamel",
  "badge.metal",
  "badge.finish",
]);

/** Tile layer for option `idx` of `curCat`, or null for categories without art. */
function optionTile(curCat, idx, ch, sig) {
  if (sig !== _tileSig) {
    _tiles.clear();
    _tileSig = sig;
  }
  const cacheKey = `${curCat.key}:${idx}`;
  if (_tiles.has(cacheKey)) return _tiles.get(cacheKey);
  let tile = null;
  const variant = { ...ch, ...withIndex(ch, curCat.key, idx) };
  if (BADGE_TILE_KEYS.has(curCat.key)) {
    const layer = badgeLayer(variant, "low");
    tile = { id: layer.id, box: BADGE_BOX, defs: "", markup: layer.markup };
  } else if (curCat.key === "expression") {
    // The face, brows to chin, bare unless the helmet lights the mouth (the LED mask).
    const stage = { pose: "idle", peek: helmetMouth(pieceOf(ch, "helmet").id) !== "led" };
    tile = { id: `legacy-mouth:${stage.peek ? 1 : 0}:${lookKey(variant)}`, box: MOUTH_VIEW, ...agentMarkup(variant, stage) };
  } else if (curCat.slot) {
    // Eyes and face tiles show the bare head, so the item reads whatever the helmet.
    const stage = FACE_SLOTS.includes(curCat.slot) ? { pose: "idle", peek: true } : IDLE_STAGE;
    tile = { id: `legacy-gear:${curCat.slot}:${stage.peek ? 1 : 0}:${lookKey(variant)}`, box: GEAR_VIEW[curCat.slot], ...agentMarkup(variant, stage) };
  }
  _tiles.set(cacheKey, tile);
  return tile;
}

/** Draw an option tile into a square at (x, y). No-op until it has decoded. */
function drawOptionTile(ctx, curCat, idx, ch, sig, x, y, size) {
  const tile = optionTile(curCat, idx, ch, sig);
  if (!tile) return;
  const img = getLayerImage(tile.id, tile.box, tile.defs, tile.markup, (size / tile.box[2]) * pixelRatio(ctx));
  if (img) ctx.drawImage(img, x, y, size, size);
}

// ── Main character creator screen ──

export function renderCharacterCreator(
  ctx,
  w,
  h,
  creatorCategory,
  character,
  isTouchDevice,
  unlockCtx = null,
  placementSel = 0,
  input = null,
  safeArea = null,
) {
  const now = performance.now();
  const cat = creatorCategory;
  const char = character;
  const palette = pieceOf(char, "color");
  const loadout = pieceOf(char, "loadout");
  const helmet = pieceOf(char, "helmet");
  const categories = CREATOR_CATEGORIES;

  // Full-screen dark backdrop
  ctx.fillStyle = "#000a14";
  ctx.fillRect(0, 0, w, h);

  // Subtle grid background
  ctx.strokeStyle = "rgba(0, 255, 200, 0.03)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += 40) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // An upright phone, by its CSS width (the canvas may be in device px).
  const isMobile = isTouchDevice && w / cssScale(w) < 700;
  const L = getCreatorLayout(w, h, isMobile, !!isTouchDevice, safeArea);

  // ── Ambient floating particles ──
  const particleCount = isMobile ? 12 : 24;
  ctx.save();
  for (let pi = 0; pi < particleCount; pi++) {
    const seed = pi * 137.508; // golden angle spread
    const px = (seed * 7.3 + now * 0.008 * (0.3 + (pi % 3) * 0.2)) % w;
    const py = (seed * 13.7 + now * 0.006 * (0.2 + (pi % 4) * 0.15)) % h;
    const pSize = 1 + (pi % 3);
    const pAlpha = 0.06 + 0.04 * Math.sin(now * 0.002 + pi);
    ctx.globalAlpha = pAlpha;
    ctx.fillStyle = pi % 2 === 0 ? palette.accent : palette.primary;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Title
  const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
  ctx.save();
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 16 * titlePulse;
  ctx.fillStyle = palette.accent;
  ctx.font = `bold ${isMobile ? 20 : 28}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("AGENT CUSTOMIZATION", w / 2, L.titleY);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Decorative line under title
  ctx.strokeStyle = `${palette.primary}55`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 120, L.titleY + 10);
  ctx.lineTo(w / 2 + 120, L.titleY + 10);
  ctx.stroke();

  // ─── Category tabs ───
  const tabFont = `${isMobile ? 9 : 11}px monospace`;
  for (let i = 0; i < categories.length; i++) {
    const t = tabRect(L, i);
    const selected = i === cat;

    ctx.fillStyle = selected
      ? `${palette.primary}44`
      : "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(t.x, t.y, t.w, t.h, 4);
    ctx.fill();

    if (selected) {
      ctx.save();
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(t.x, t.y, t.w, t.h, 4);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = selected ? palette.accent : "rgba(255,255,255,0.35)";
    ctx.font = `${selected ? "bold " : ""}${tabFont}`;
    ctx.textAlign = "center";
    // Full name when it fits the tab, short label otherwise — twenty-odd tabs
    // leave no room for "SHOULDER" on a narrow screen.
    const full = categories[i].name;
    const label = !isMobile && ctx.measureText(full).width <= t.w - 8 ? full : categories[i].shortLabel;
    ctx.fillText(label, t.x + t.w / 2, t.y + t.h / 2 + 4);
  }

  // ─── NAME tab — special rendering ───
  if (cat === 0) {
    const nameBoxW = isMobile ? Math.min(320, w - 40) : 320;
    const nameBoxH = isMobile ? 44 : 50;
    const nameBoxX = w / 2 - nameBoxW / 2;
    const nameBoxY = L.contentY + (isMobile ? 20 : 40);

    ctx.fillStyle = palette.accent;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AGENT CALLSIGN", w / 2, nameBoxY - 12);

    ctx.fillStyle = "rgba(0, 5, 15, 0.8)";
    ctx.beginPath();
    ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 6);
    ctx.fill();

    const blink = Math.sin(now * 0.005) > 0;
    ctx.strokeStyle = blink ? palette.accent : `${palette.accent}88`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 6);
    ctx.stroke();

    const displayName = char.name || "";
    const cursor = blink ? "\u258C" : "";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(displayName + cursor, w / 2, nameBoxY + 33);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px monospace";
    ctx.fillText(
      "Type your name (max 16 chars) \u00B7 Backspace to delete",
      w / 2,
      nameBoxY + nameBoxH + 20,
    );

    // Character preview below name input. Centred in the space that is
    // actually left and scaled to fill it — a fixed 1.5 left the lower third
    // of the screen empty while the figure stayed small.
    const prevCX = w / 2;
    const prevTop = nameBoxY + nameBoxH + 36;
    const prevBottom = h - (isMobile ? 80 : 84);
    const prevCY = isMobile
      ? nameBoxY + nameBoxH + Math.min(100, (h - nameBoxY - nameBoxH - 80) / 2)
      : (prevTop + prevBottom) / 2 - 10;
    const prevScale = isMobile
      ? 1.0
      : Math.max(1.2, Math.min(2.4, (prevBottom - prevTop - 70) / 150));
    drawAgentFigure(ctx, char, prevCX, prevCY, () => prevScale * 150);

    // Styled nameplate (name step)
    const npText = char.name || "Agent";
    ctx.font = "bold 14px monospace";
    const npY = prevCY + (isMobile ? 70 : Math.round(80 * prevScale));
    const npW = ctx.measureText(npText).width + 24;
    const npH = 22;
    const npX = prevCX - npW / 2;
    const npYTop = npY - npH + 4;
    ctx.fillStyle = "rgba(0, 5, 15, 0.8)";
    ctx.beginPath();
    ctx.roundRect(npX, npYTop, npW, npH, 3);
    ctx.fill();
    ctx.strokeStyle = palette.accent + "66";
    ctx.lineWidth = 1;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(npX, npYTop, npW, npH, 3);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "center";
    ctx.fillText(npText, prevCX, npY);

    drawCreatorFooter(ctx, w, h, null, isTouchDevice, input);
    return;
  }

  // ─── Item list (left panel) ───
  const curCat = categories[cat];
  const items = curCat.data;
  // PLACE toggles a set, so its "selection" is a cursor over the rows; every
  // other tab reads the character's current index for that field.
  const multi = !!curCat.multi;
  const worn = char.badge?.placements || [];
  const selIdx = multi
    ? Math.min(Math.max(placementSel | 0, 0), items.length - 1)
    : getIndex(char, curCat.key);
  const lookSig = lookKey(char);
  const hasTile = BADGE_TILE_KEYS.has(curCat.key) || !!curCat.slot || curCat.key === "expression";
  const listX = L.contentX;
  const listH = L.panelH;

  ctx.fillStyle = "rgba(0, 5, 15, 0.7)";
  ctx.beginPath();
  ctx.roundRect(listX, L.contentY, L.listW, listH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 255, 200, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(listX, L.contentY, L.listW, listH, 8);
  ctx.stroke();

  for (const row of listWindow(L, curCat, char, selIdx)) {
    if (row.type === "caption") {
      // A theme's run starts: its name, as the showroom captions its groups.
      ctx.fillStyle = "rgba(170, 200, 220, 0.55)";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(row.text, listX + 12, row.y + 12);
      ctx.fillStyle = "rgba(170, 200, 220, 0.12)";
      ctx.fillRect(listX + 16 + ctx.measureText(row.text).width, row.y + 8, Math.max(0, L.listW - 32 - ctx.measureText(row.text).width), 1);
      continue;
    }
    const i = row.i;
    const item = items[i];
    const iy = row.y;
    const isSelected = i === selIdx;

    if (isSelected) {
      const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = `${palette.primary}${Math.round(15 * sPulse)
        .toString(16)
        .padStart(2, "0")}`;
      ctx.beginPath();
      ctx.roundRect(listX + 4, iy, L.listW - 8, L.itemH - 4, 4);
      ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.fillRect(listX + 4, iy + 6, 3, L.itemH - 16);
    }

    // Color swatches for visual categories (a cut in the hair colour picked)
    const swatch = curCat.key === "hair" ? hairOf({ ...char, hair: item.id }).color : item.primary || item.color;
    const hasSwatch = curCat.key === "color" || curCat.key === "skinTone" || curCat.key === "hair" || curCat.key === "eye";
    if (hasSwatch && swatch) {
      ctx.fillStyle = swatch;
      ctx.beginPath();
      ctx.roundRect(listX + 14, iy + 8, 18, 18, 3);
      ctx.fill();
      if (item.accent || item.shadow) {
        ctx.fillStyle = item.accent || item.shadow;
        ctx.beginPath();
        ctx.roundRect(listX + 18, iy + 12, 10, 10, 2);
        ctx.fill();
      }
    }

    // Worn / not worn box for the placement toggles.
    if (multi) {
      const on = worn.includes(item.id);
      ctx.strokeStyle = on ? palette.accent : "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(listX + 14, iy + 9, 16, 16, 3);
      ctx.stroke();
      if (on) {
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(listX + 18, iy + 17);
        ctx.lineTo(listX + 21, iy + 21);
        ctx.lineTo(listX + 27, iy + 13);
        ctx.stroke();
      }
    } else if (hasTile) {
      // Badge and gear options preview themselves; everything else is text.
      drawOptionTile(ctx, curCat, i, char, lookSig, listX + 12, iy + 4, L.itemH - 10);
    }

    const labelX = hasSwatch || hasTile || multi ? listX + 40 : listX + 16;
    ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.45)";
    ctx.font = `${isSelected ? "bold " : ""}12px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(item.name, labelX, iy + 22);

    // Lock icon for anything still locked (loadouts, tiered gear)
    if (unlockCtx && !unlockState(curCat.key, item.id, unlockCtx).unlocked) {
      ctx.fillStyle = "rgba(255,100,100,0.6)";
      ctx.font = "10px monospace";
      ctx.fillText("\uD83D\uDD12", listX + L.listW - 28, iy + 22);
    }
  }

  // ─── Hair colour row, under the cuts ───
  if (curCat.key === "hair") {
    const row = hairColorSwatches(L);
    const picked = pieceOf(char, "hairColor");
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`COLOR \u00B7 ${picked.name.toUpperCase()}`, listX + 10, row.labelY);
    drawHairColorHint(ctx, listX + L.listW - 10, row.labelY - 4, input);
    HAIR_COLORS.forEach((hc, i) => {
      const r = row.rects[i];
      ctx.fillStyle = hairOf({ ...char, hairColor: hc.id }).color;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 3);
      ctx.fill();
      if (hc.id === picked.id) {
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 4);
        ctx.stroke();
      }
    });
  }

  // ─── Eyes / face: the helmet worn hides the slot; the paint colours ───
  const foot = faceSlotFoot(L, curCat, char);
  if (foot) {
    ctx.textAlign = "left";
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "rgba(255, 200, 90, 0.8)";
    foot.head.forEach((line, i) => ctx.fillText(line, listX + 10, foot.noteY + i * NOTE_LINE));
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(180,200,220,0.55)";
    foot.sub.forEach((line, i) => ctx.fillText(line, listX + 10, foot.noteY + (foot.head.length + i) * NOTE_LINE));
    if (foot.tint) {
      const hex = tintFor(char, foot.tint.slot);
      const picked = PAINT_SWATCHES.find((p) => p.hex === hex);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`${foot.tint.label} \u00B7 ${picked ? picked.name : "Custom"}`.toUpperCase(), listX + 10, foot.tint.labelY);
      // The same keys step the paint as the hair colours: Q / E, LB / RB.
      drawHairColorHint(ctx, listX + L.listW - 10, foot.tint.labelY - 4, input);
      PAINT_SWATCHES.forEach((p, i) => {
        const r = foot.tint.rects[i];
        ctx.fillStyle = p.hex;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 3);
        ctx.fill();
        ctx.stroke();
        if (p.hex === hex) {
          ctx.strokeStyle = palette.accent;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 4);
          ctx.stroke();
        }
      });
    }
  }

  // ─── Character preview (center panel) ───
  const prevX = L.contentX + L.listW + L.contentGap;
  const prevCX = prevX + L.previewW / 2;
  const prevH = listH;

  ctx.fillStyle = "rgba(0, 5, 15, 0.6)";
  ctx.beginPath();
  ctx.roundRect(prevX, L.contentY, L.previewW, prevH, 8);
  ctx.fill();
  ctx.strokeStyle = `${palette.primary}33`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(prevX, L.contentY, L.previewW, prevH, 8);
  ctx.stroke();

  // Scale the figure to the panel rather than a fixed 1.3. The preview is the
  // thing being customised, so it should own the space the panel now has.
  // The base figure is roughly 120x150 units; leave a margin for the nameplate.
  const prevScale = Math.max(
    1.0,
    Math.min((L.previewW - 48) / 120, (prevH - 96) / 150),
  );
  const prevCY = L.contentY + prevH / 2 - 10;
  // The whole figure as before; a close-up crop fills the panel above the nameplate.
  const heightFor = (box) => (box === AGENT_VIEW.full ? prevScale * 150 : Math.min(prevH - 76, ((L.previewW - 24) * box[3]) / box[2]));
  drawAgentFigure(ctx, char, prevCX, prevCY, heightFor, stageFor(curCat.key, char));

  // ── Scan-line overlay ──
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = palette.accent;
  for (let sl = 0; sl < prevH; sl += 3) {
    ctx.fillRect(prevX, L.contentY + sl, L.previewW, 1);
  }
  // Scrolling highlight bar
  const scanY = L.contentY + ((now * 0.03) % prevH);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = palette.accent;
  ctx.fillRect(prevX, scanY, L.previewW, 4);
  ctx.restore();

  // ─── Info panel (right) — hidden on mobile ───
  const infoX = prevX + L.previewW + L.contentGap;
  const selectedItem = items[selIdx];
  // How far down the info panel's text runs, so the locked list below stays clear of it.
  let infoBottom = L.contentY;

  if (!isMobile) {
    ctx.fillStyle = "rgba(0, 5, 15, 0.6)";
    ctx.beginPath();
    ctx.roundRect(infoX, L.contentY, L.infoW, prevH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 255, 200, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(infoX, L.contentY, L.infoW, prevH, 8);
    ctx.stroke();

    // Info title
    ctx.fillStyle = palette.accent;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(selectedItem.name, infoX + 12, L.contentY + 28);

    // Armor tier pips (Sprint H 8.2: starter → mid → elite visual)
    if (curCat.key === "armor" && selectedItem.tier) {
      const pipX = infoX + 12;
      const pipY = L.contentY + 38;
      const tierColors = ["#6a8cff", "#ffcc44", "#ff4488"];
      const tierLabels = ["STARTER", "MID", "ELITE"];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle =
          i < selectedItem.tier
            ? tierColors[selectedItem.tier - 1]
            : "rgba(80,90,110,0.4)";
        ctx.beginPath();
        ctx.arc(pipX + 4 + i * 12, pipY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = tierColors[selectedItem.tier - 1];
      ctx.font = "bold 9px monospace";
      ctx.fillText(tierLabels[selectedItem.tier - 1], pipX + 44, pipY + 3);
      ctx.font = "bold 13px monospace";
    }

    // Description, then the gear perk one stat a line under it. A pick the
    // figure does not draw (gearPickCounts: a visor on a helmet with none,
    // shoulders the frame hides, gear the helmet has no place or room for)
    // counts for nothing, so its perk is dimmed and says so; a helmet with no
    // visor names itself in the perk's place.
    const noVisor = curCat.key === "visor" && !takesVisor(char.helmet);
    const perkLines = gearPerkLines(curCat, selectedItem);
    const counts = !perkLines.length || !selectedItem.bonuses || gearPickCounts(char, curCat.key);
    const info = infoTextLayout(
      L,
      infoX,
      {
        desc: selectedItem.desc || "",
        perk: noVisor ? [`${helmet.name.toUpperCase()}: NO VISOR`] : perkLines.map((l) => l.toUpperCase()),
        note: noVisor ? ["Pick and perk don't apply"] : counts ? [] : ["Not drawn here: perk doesn't apply"],
      },
      (text, font) => {
        ctx.font = font;
        return ctx.measureText(text).width;
      },
    );
    ctx.fillStyle = "rgba(200, 220, 240, 0.6)";
    ctx.font = INFO_TEXT.desc.font;
    for (const l of info.desc) ctx.fillText(l.text, l.x, l.y);
    ctx.fillStyle = noVisor ? "rgba(255, 200, 90, 0.8)" : selectedItem.bonuses && counts ? palette.accent : "rgba(180,200,220,0.45)";
    ctx.font = INFO_TEXT.perk.font;
    for (const l of info.perk) ctx.fillText(l.text, l.x, l.y);
    ctx.fillStyle = "rgba(180,200,220,0.55)";
    ctx.font = INFO_TEXT.note.font;
    for (const l of info.note) ctx.fillText(l.text, l.x, l.y);
    infoBottom = info.bottom;
    if (multi) {
      ctx.fillStyle = "rgba(200, 220, 240, 0.6)";
      ctx.font = "11px monospace";
      ctx.fillText(worn.includes(selectedItem.id) ? "Worn here" : "Not worn here", infoX + 12, L.contentY + 52);
      ctx.fillStyle = "rgba(180,200,220,0.45)";
      ctx.fillText("SPACE / click toggles", infoX + 12, L.contentY + 72);
    }

    if (curCat.key === "backstory" && selectedItem.perk) {
      ctx.fillStyle = "rgba(0,255,200,0.18)";
      ctx.beginPath();
      ctx.roundRect(infoX + 12, L.contentY + 116, L.infoW - 24, 34, 6);
      ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.font = "bold 10px monospace";
      ctx.fillText("ORIGIN PERK", infoX + 20, L.contentY + 130);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "11px monospace";
      ctx.fillText(selectedItem.perk, infoX + 20, L.contentY + 145);
    }

    if (curCat.key === "voice") {
      const waveY = L.contentY + 120;
      ctx.strokeStyle = palette.accent + "88";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < L.infoW - 28; i++) {
        const x = infoX + 14 + i;
        const y = waveY + Math.sin(i * 0.18 + now * 0.012) * (6 + selectedItem.pitch * 3);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "10px monospace";
      ctx.fillText("VOICE PRINT", infoX + 12, waveY + 24);
    }

    // Loadout bonuses — visual stat bars (LOADOUT category only)
    if (curCat.key === "loadout" && loadout.bonuses) {
      let by = L.contentY + 90;
      const b = loadout.bonuses;
      const barW = L.infoW - 24;
      const barH = 10;

      const drawStatBar = (label, value, max, color) => {
        ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
        ctx.font = "10px monospace";
        ctx.fillText(label, infoX + 12, by);
        by += 14;
        // Bar track
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.roundRect(infoX + 12, by, barW, barH, 3);
        ctx.fill();
        // Bar fill
        const fillPct = Math.min(1, Math.max(0, value / max));
        const fillW = fillPct * barW;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 + 0.15 * Math.sin(now * 0.004);
        ctx.beginPath();
        ctx.roundRect(infoX + 12, by, fillW, barH, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Value label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.fillText(`${value}`, infoX + 14 + fillW + 4, by + 8);
        by += barH + 10;
      };

      if (b.fireRateMultiplier != null) {
        drawStatBar(
          "FIRE RATE",
          b.fireRateMultiplier * 100,
          120,
          palette.accent,
        );
      }
      if (b.maxHealth != null) {
        drawStatBar("MAX HEALTH", b.maxHealth, 150, "#44cc88");
      }
      if (b.moveSpeed != null) {
        const absSpeed = 5 + b.moveSpeed; // base 5
        drawStatBar("MOVE SPEED", absSpeed, 7, "#ffaa44");
      }
      if (b.maxStamina != null) {
        drawStatBar("MAX STAMINA", b.maxStamina, 150, "#4488ff");
      }
      if (unlockCtx && !unlockState("loadout", loadout.id, unlockCtx).unlocked) {
        ctx.fillStyle = "rgba(255, 100, 100, 0.7)";
        ctx.font = "bold 12px monospace";
        ctx.fillText("LOCKED", infoX + 12, by + 10);
      }
    }

    // Color swatches in info panel
    if (curCat.key === "color") {
      let sy = L.contentY + 80;
      ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
      ctx.font = "10px monospace";
      ctx.fillText("PRIMARY", infoX + 12, sy);
      ctx.fillStyle = palette.primary;
      ctx.fillRect(infoX + 12, sy + 4, 40, 16);
      sy += 30;
      ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
      ctx.font = "10px monospace";
      ctx.fillText("ACCENT", infoX + 12, sy);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(infoX + 12, sy + 4, 40, 16);
      sy += 30;
      ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
      ctx.font = "10px monospace";
      ctx.fillText("DARK", infoX + 12, sy);
      ctx.fillStyle = palette.dark;
      ctx.fillRect(infoX + 12, sy + 4, 40, 16);
    }
  }

  // Locked options in this category, with how to earn them
  if (!isMobile && unlockCtx && curCat.key) {
    const infoX = L.contentX + L.listW + L.contentGap + L.previewW + L.contentGap;
    const locked = items
      .map((it) => ({ it, st: unlockState(curCat.key, it.id, unlockCtx) }))
      .filter((e) => !e.st.unlocked);
    // A category can have dozens of locked options (badge symbols); list only
    // as many as the panel holds and count the rest, or the block runs off the
    // top of the screen and over the tabs. It stands on the panel's foot and
    // stops short of the info text above (a long description and its perk).
    const top = Math.max(L.contentY + 156, infoBottom + 8);
    const room = Math.max(0, Math.floor((L.contentY + listH - 14 - top) / 30));
    const shownLocks = locked.slice(0, room);
    const moreLocks = locked.length - shownLocks.length;
    let ly = L.contentY + listH - 14 - (shownLocks.length + (moreLocks ? 1 : 0) - 1) * 30;
    ctx.textAlign = "left";
    if (moreLocks) {
      ctx.fillStyle = "rgba(180,200,220,0.55)";
      ctx.font = "9px monospace";
      ctx.fillText(`+${moreLocks} more locked`, infoX + 12, ly);
      ly += 30;
    }
    for (const { it, st } of shownLocks) {
      ctx.fillStyle = "rgba(255,100,100,0.7)";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`\uD83D\uDD12 ${it.name}`, infoX + 12, ly - 12);
      ctx.fillStyle = "rgba(180,200,220,0.55)";
      ctx.font = "9px monospace";
      let hint = st.hint;
      while (hint.length > 4 && ctx.measureText(hint).width > L.infoW - 24) hint = hint.slice(0, -2);
      ctx.fillText(hint === st.hint ? hint : `${hint}\u2026`, infoX + 12, ly);
      ly += 30;
    }
  }

  // Styled nameplate (main view)
  const npText = char.name || "Agent";
  ctx.font = "bold 12px monospace";
  const npY = L.contentY + prevH - 12;
  const npW = ctx.measureText(npText).width + 20;
  const npH = 20;
  const npX = prevCX - npW / 2;
  const npYTop = npY - npH + 4;
  ctx.fillStyle = "rgba(0, 5, 15, 0.8)";
  ctx.beginPath();
  ctx.roundRect(npX, npYTop, npW, npH, 3);
  ctx.fill();
  ctx.strokeStyle = palette.accent + "66";
  ctx.lineWidth = 1;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(npX, npYTop, npW, npH, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.accent;
  ctx.textAlign = "center";
  ctx.fillText(npText, prevCX, npY);

  drawCreatorFooter(ctx, w, h, curCat, isTouchDevice, input);
}

/**
 * The foot's keys or pad buttons, in the glyphs of the device in use. Not
 * on a touch screen: BACK and SAVE stand there, with their own hints
 * beside them (drawCreatorTouchHints, drawn by js/touch.js).
 */
function drawCreatorFooter(ctx, w, h, curCat, isTouchDevice, input) {
  if (isTouchDevice) return;
  drawPrompt(ctx, w / 2, h - 20, creatorPrompt(curCat), { input, look: "legacy", align: "center", size: 10, color: "rgba(180,200,220,0.6)" });
}
