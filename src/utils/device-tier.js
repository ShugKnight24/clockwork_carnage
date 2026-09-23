/**
 * Device tier and render pixel budget.
 *
 * The game canvas renders at the window's CSS size, so the same game costs 6x
 * more on a 4K monitor (8.3 MP) than on a 1440x900 laptop (1.3 MP), and a
 * phone's GPU is a fraction of a desktop's. Rather than one resolution for
 * everyone, each device gets a pixel budget from a coarse tier, and the
 * adaptive governor (src/utils/perf.js) trims from there if frames still slip.
 *
 * Pure except for `detectDeviceTier`, which reads navigator/WebGL once.
 */

/** Render pixels per frame (before the governor's own render scale). */
export const PIXEL_BUDGET = Object.freeze({
  low: 0.55e6, // ~ 990x555
  mid: 1.0e6, // ~ 1333x750
  high: 1.8e6, // ~ 1790x1005 — a 1440x900 laptop renders native
});

/**
 * Classify from plain signals, so it can be unit-tested without a browser.
 * @param {{renderer?: string, cores?: number, memoryGB?: number, touch?: boolean}} s
 * @returns {"low"|"mid"|"high"}
 */
export function classifyDevice({ renderer = "", cores = 0, memoryGB = 0, touch = false } = {}) {
  const r = renderer.toLowerCase();
  // Software rasterisers: everything runs on the CPU.
  if (/swiftshader|llvmpipe|softpipe|microsoft basic render|software/.test(r)) return "low";
  const weakCpu = (cores && cores <= 4) || (memoryGB && memoryGB <= 4);
  if (touch) {
    // Recent Apple phones/tablets and flagship Adreno/Mali hold up; the rest
    // of mobile is thermally limited, so budget low.
    if (/apple (a1[5-9]|m\d)|adreno \(tm\) (7[3-9]\d|8\d\d)|mali-g7[1-9]|immortalis/.test(r)) return "mid";
    return weakCpu ? "low" : "mid";
  }
  if (/apple m\d|nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc a\d/.test(r)) return "high";
  if (/intel.*(uhd|hd graphics)|mali|adreno|powervr/.test(r)) return weakCpu ? "low" : "mid";
  if (/iris|radeon/.test(r)) return "mid";
  return weakCpu ? "low" : "mid";
}

let _tier = null;

/** Read the device's signals once and classify. */
export function detectDeviceTier() {
  if (_tier) return _tier;
  let renderer = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl ? gl.getParameter(gl.RENDERER) : "software";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch (_) {
    renderer = "";
  }
  const nav = typeof navigator !== "undefined" ? navigator : {};
  const touch =
    (nav.maxTouchPoints > 0) &&
    typeof matchMedia === "function" &&
    matchMedia("(pointer: coarse)").matches;
  _tier = classifyDevice({
    renderer,
    cores: nav.hardwareConcurrency || 0,
    memoryGB: nav.deviceMemory || 0,
    touch,
  });
  return _tier;
}

/**
 * Render size for a window of cssW x cssH that fits the tier's pixel budget,
 * keeping aspect. Never upscales past the CSS size.
 */
export function budgetedRenderSize(cssW, cssH, tier) {
  const budget = PIXEL_BUDGET[tier] ?? PIXEL_BUDGET.mid;
  const px = cssW * cssH;
  const k = px > budget ? Math.sqrt(budget / px) : 1;
  return { w: Math.max(1, Math.round(cssW * k)), h: Math.max(1, Math.round(cssH * k)) };
}
