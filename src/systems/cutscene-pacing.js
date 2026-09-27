/**
 * Cutscene auto-play pacing. Pure timing, no DOM: js/cutscene.js asks these
 * when the player has AUTO on (settings.cutsceneAutoAdvance).
 *
 *   lines frame   hold after the typewriter finishes, by word count
 *   no-text frame a flat hold
 *   flipbook page the page's own hold, stretched for a caption
 *
 * An explicit, longer duration in the script always wins.
 */

export const AUTO_PACING = {
  base: 1800, // ms before the first word
  perWord: 300,
  min: 3000,
  max: 9000,
  noText: 4000, // frames with nothing to read
  pageBase: 2500, // flipbook page with a caption
  pagePerWord: 280,
  pageHold: 1400, // flipbook default when a page names no hold
};

/** Words in a string (or strings), for reading time. */
export function countWords(text) {
  if (Array.isArray(text)) return text.reduce((n, t) => n + countWords(t), 0);
  if (!text) return 0;
  return String(text).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Hold after the text is fully shown: clamp(1800 + 300/word, 3000, 9000); 4000 with no text. */
export function autoHoldMs(words) {
  if (!words) return AUTO_PACING.noText;
  const p = AUTO_PACING;
  return Math.min(p.max, Math.max(p.min, p.base + p.perWord * words));
}

/**
 * When an auto-playing frame advances, in ms since the frame started.
 *   textDoneAt  when its text is fully shown (typewriter / last panel in)
 *   words       words to read
 *   duration    the script's explicit frame duration, if any
 *   autoFrom    when AUTO was switched on, if that was mid-frame
 */
export function autoAdvanceAt({ textDoneAt = 0, words = 0, duration = 0, autoFrom = 0 }) {
  const from = Math.max(textDoneAt, autoFrom);
  return Math.max(from + autoHoldMs(words), duration || 0);
}

/**
 * How long a flipbook page holds under auto-play: its own hold, or for a
 * captioned page max(hold, min(2500 + 280/word, 9000)).
 */
export function pageHoldMs(page) {
  const p = AUTO_PACING;
  const hold = page?.hold ?? p.pageHold;
  const words = countWords(page?.panel?.caption);
  if (!words) return hold;
  return Math.max(hold, Math.min(p.max, p.pageBase + p.pagePerWord * words));
}
