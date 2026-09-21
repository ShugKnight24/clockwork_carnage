/**
 * Art style switch.
 *
 * NAMING: players see Legacy / Comic / Modern. In code the ids and helpers
 * keep their original names: ART_MODERN (1) is the Comic style and
 * ART_REALISTIC (2) is the style players call Modern. `isModernArt()` means
 * "uses the vector asset set" (Comic or Modern); `isRealisticArt()` means
 * the Modern realistic lighting profile.
 *
 *   Legacy    — the original procedural canvas art.
 *   Modern    — vector SVG art across cutscenes, title, viewmodel, sprites, HUD.
 *   Realistic — Modern's assets under a physically based lighting profile:
 *               filmic tonemapping, inverse-square lights, contact shadows, and
 *               no comic ink lines.
 *
 * Only the active style is ever drawn. Every renderer branches on the current
 * value per frame, so switching costs nothing and nothing renders twice in the
 * background. Realistic reuses Modern's sprites and HUD, which is why
 * `isModernArt()` is true for it: the 60-odd asset branches keep working, and
 * only the lighting code asks `isRealisticArt()`.
 *
 * Lives outside Game so the title-screen web components can read it before the
 * game boots. The value is persisted inside the normal settings blob
 * (`cc_settings.artStyle`) and mirrored on <html data-art-style="…"> so CSS can
 * restyle DOM menus without JS. Realistic shares Modern's DOM chrome, so it
 * mirrors as "modern" there and adds data-art-profile="realistic".
 */

export const ART_LEGACY = 0;
export const ART_MODERN = 1;
export const ART_REALISTIC = 2;
export const ART_STYLES = [ART_LEGACY, ART_MODERN, ART_REALISTIC];

const listeners = new Set();

const normalise = (s) => (s === ART_LEGACY || s === ART_REALISTIC ? s : ART_MODERN);

function readSaved() {
  try {
    return normalise(JSON.parse(localStorage.getItem("cc_settings") || "{}").artStyle);
  } catch (_) {
    return ART_MODERN;
  }
}

let current = readSaved();

function mirrorToDom() {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.dataset.artStyle = current === ART_LEGACY ? "legacy" : "modern";
  el.dataset.artProfile = ["legacy", "modern", "realistic"][current];
}
mirrorToDom();

export const getArtStyle = () => current;
/** True for every style that uses the Modern asset set (Modern and Realistic). */
export const isModernArt = () => current !== ART_LEGACY;
/** True only for the physically based lighting profile. */
export const isRealisticArt = () => current === ART_REALISTIC;

/** Switch style, notify subscribers. Persisting is the caller's job (settings save). */
export function setArtStyle(style) {
  const next = normalise(style);
  if (next === current) return;
  const prev = current;
  current = next;
  mirrorToDom();
  for (const fn of listeners) fn(current, prev);
}

/** Subscribe to style changes. Returns an unsubscribe function. */
export function onArtStyleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
