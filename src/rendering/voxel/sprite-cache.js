/**
 * Canvas/Image → GL texture, keyed by the caller's id; re-uploads when the
 * source's size changed (raster.js evicts bitmaps by setting width=0).
 */
export class SpriteCache {
  constructor(gl) { this.gl = gl; this.map = new Map(); }

  /**
   * @param {string} key caller-owned identity for the bitmap
   * @param {HTMLCanvasElement|HTMLImageElement} image
   * @returns {{ tex: WebGLTexture, w: number, h: number }|null} null while the source is empty
   */
  get(key, image) {
    const gl = this.gl;
    if (!image) return null;
    const w = image.width, h = image.height;
    if (!w || !h) return null;
    let e = this.map.get(key);
    if (!e || e.w !== w || e.h !== h || e.src !== image) {
      if (!e) { e = { tex: gl.createTexture(), w: 0, h: 0, src: null, t: 0 }; this.map.set(key, e); }
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      e.w = w; e.h = h; e.src = image;
    }
    e.t = performance.now();
    return e;
  }

  evict(maxAgeMs = 15000) {
    const now = performance.now();
    for (const [k, e] of this.map) if (now - e.t > maxAgeMs) { this.gl.deleteTexture(e.tex); this.map.delete(k); }
  }

  destroy() { for (const e of this.map.values()) this.gl.deleteTexture(e.tex); this.map.clear(); }
}
