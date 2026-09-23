/**
 * CRT scanline overlay — module-level cached patterns.
 */
let _scanlinePattern = null;
let _scanlinePatternDense = null;

function makeScanlinePattern(ctx, alpha, step) {
  const tile = document.createElement("canvas");
  tile.width = 1;
  tile.height = step;
  const tc = tile.getContext("2d");
  tc.fillStyle = `rgba(0,0,0,${alpha})`;
  tc.fillRect(0, 0, 1, 1);
  return ctx.createPattern(tile, "repeat");
}

export function drawScanlines(ctx, w, h, dense) {
  if (dense) {
    if (!_scanlinePatternDense) {
      _scanlinePatternDense = makeScanlinePattern(ctx, 0.04, 3);
    }
    ctx.fillStyle = _scanlinePatternDense;
  } else {
    if (!_scanlinePattern) {
      _scanlinePattern = makeScanlinePattern(ctx, 0.03, 4);
    }
    ctx.fillStyle = _scanlinePattern;
  }
  ctx.fillRect(0, 0, w, h);
}
