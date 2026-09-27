/**
 * The logotype for each art profile, as the title screen wears it
 * (js/main.js syncTitleLogo): Legacy's neon, Comic's ink, Modern's steel.
 * NAMING: the "modern" profile is the style players call Comic and
 * "realistic" the one they call Modern, hence the crossed folder names.
 */
const PROFILE_BRAND = { legacy: "legacy", modern: "comic", realistic: "modern" };

/** The assets/brand folder for an art profile. */
export const brandFolder = (profile) => PROFILE_BRAND[profile] ?? "comic";

const logos = new Map();

function load(folder) {
  let img = logos.get(folder);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = `assets/brand/${folder}/logotype.svg`;
    logos.set(folder, img);
  }
  return img;
}

/** The logotype for an art profile (loaded once; null until decoded). */
export function logoFor(profile) {
  if (typeof Image === "undefined") return null;
  const img = load(brandFolder(profile));
  return img.complete && img.naturalWidth ? img : null;
}

/**
 * Start every profile's logotype loading and resolve once `profile`'s has
 * decoded (or failed), so a shot can open on its logo and a style flip
 * finds the next one ready.
 */
export function warmLogos(profile) {
  if (typeof Image === "undefined") return Promise.resolve();
  for (const folder of Object.values(PROFILE_BRAND)) load(folder);
  const img = load(brandFolder(profile));
  if (img.complete) return Promise.resolve();
  return img.decode().catch(() => {});
}
