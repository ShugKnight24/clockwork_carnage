/**
 * Art style switch: Legacy (original procedural canvas art) or Modern (vector
 * SVG art across cutscenes, title screen, viewmodel, sprites and HUD).
 *
 * Lives outside Game so the title-screen web components can read it before the
 * game boots. The value is persisted inside the normal settings blob
 * (`cc_settings.artStyle`) and mirrored on <html data-art-style="…"> so CSS can
 * restyle DOM menus without JS.
 */

export const ART_LEGACY = 0;
export const ART_MODERN = 1;

const listeners = new Set();

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem("cc_settings") || "{}");
    return saved.artStyle === ART_LEGACY ? ART_LEGACY : ART_MODERN;
  } catch (_) {
    return ART_MODERN;
  }
}

let current = readSaved();

function mirrorToDom() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.artStyle = current === ART_MODERN ? "modern" : "legacy";
}
mirrorToDom();

export const getArtStyle = () => current;
export const isModernArt = () => current === ART_MODERN;

/** Switch style, notify subscribers. Persisting is the caller's job (settings save). */
export function setArtStyle(style) {
  const next = style === ART_LEGACY ? ART_LEGACY : ART_MODERN;
  if (next === current) return;
  current = next;
  mirrorToDom();
  for (const fn of listeners) fn(current);
}

/** Subscribe to style changes. Returns an unsubscribe function. */
export function onArtStyleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
