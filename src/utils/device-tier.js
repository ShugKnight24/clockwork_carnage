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
  // Native 4K (3840x2160 = 8.3 MP). A desktop GPU holds 60 fps there in
  // Comic and Modern; the adaptive render scale trims anything that can't.
  high: 8.4e6,
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
    // of mobile is thermally limited, so budget low. Safari (every iOS
    // browser) masks the chip as plain "Apple GPU" and reports no
    // deviceMemory, and any iPhone that runs a current Safari copes at mid.
    if (/apple (gpu|a1[2-9]|m\d)|adreno \(tm\) (6[4-9]\d|7\d\d|8\d\d)|mali-g(6[1-9]0|7\d)|immortalis|xclipse/.test(r)) return "mid";
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
    // No WebGL, or a masked "WebKit WebGL", is unknown rather than software:
    // leave it to the CPU signals instead of forcing the low tier.
    renderer = (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl ? gl.getParameter(gl.RENDERER) : "") || "";
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
 * Render size for a window of cssW x cssH at device pixel ratio `dpr` that
 * fits the tier's pixel budget, keeping aspect. Never renders past the
 * window's device pixels. It used to stop at the CSS size, so a 1440p screen
 * at 150% scaling drew 1251 px wide and the browser stretched it 1.5x,
 * blocky under image-rendering: pixelated, however much GPU was spare.
 */
export function budgetedRenderSize(cssW, cssH, tier, dpr = 1) {
  const budget = PIXEL_BUDGET[tier] ?? PIXEL_BUDGET.mid;
  const s = Math.max(1, dpr || 1);
  const devW = cssW * s;
  const devH = cssH * s;
  const px = devW * devH;
  const k = px > budget ? Math.sqrt(budget / px) : 1;
  return { w: Math.max(1, Math.round(devW * k)), h: Math.max(1, Math.round(devH * k)) };
}
