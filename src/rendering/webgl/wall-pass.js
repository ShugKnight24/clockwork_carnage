/**
 * Modern wall columns on the GPU.
 *
 * The raycaster still casts every column in JS (sprites need its depth and
 * cover records), but instead of drawing each wall segment as four or five
 * Canvas2D calls — ~7,000 a frame, each a few µs of the browser's GPU
 * process, which on Chrome's D3D11 backend was the floor on Modern's frame
 * time — it records one instance per segment here, and one instanced draw
 * paints them all over the floor already in the GL canvas.
 *
 * An instance is a 1-px-wide column: rows y0..y1, a texel column of one wall
 * mip, and the overlays the Canvas2D path drew over it, in its order:
 * face shade and fog (source-over), then light and door spill (additive).
 * That chain is linear in the colour underneath, so the shader emits the
 * finished colour plus how much of the background survives, and premultiplied
 * blending (ONE, ONE_MINUS_SRC_ALPHA) composites it in one step — see-through
 * wall art included.
 */

const VERT = `#version 300 es
in vec2 a_corner;
in vec4 a_rect;   // x, y0, y1, layer
in vec4 a_tex;    // u, v0, v1, lod (lod < 0: no texture, face colour only)
in vec4 a_face;
in vec4 a_fog;
in vec4 a_light;
in vec4 a_accent;
in vec4 a_hit;    // world hit x, y and face normal x, y (per-pixel lights)
uniform vec2 u_size;
out vec3 v_uvl;
flat out float v_lod;
flat out vec4 v_face;
flat out vec4 v_fog;
flat out vec3 v_add;
flat out vec4 v_hit;
void main() {
  float x = a_rect.x + a_corner.x;
  float y = mix(a_rect.y, a_rect.z, a_corner.y);
  gl_Position = vec4(x / u_size.x * 2.0 - 1.0, 1.0 - y / u_size.y * 2.0, 0.0, 1.0);
  v_uvl = vec3(a_tex.x, mix(a_tex.y, a_tex.z, a_corner.y), a_rect.w);
  v_lod = a_tex.w;
  v_face = a_face;
  v_fog = a_fog;
  v_add = a_light.rgb * a_light.a + a_accent.rgb * a_accent.a;
  v_hit = a_hit;
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray u_walls;
in vec3 v_uvl;
flat in float v_lod;
flat in vec4 v_face;
flat in vec4 v_fog;
flat in vec3 v_add;
flat in vec4 v_hit;
uniform int u_numLights;
uniform vec4 u_lights[16];      // x, y, radius, intensity
uniform vec3 u_lightColors[16]; // 0-1
uniform float u_lightGain;      // > 0: Realistic per-pixel wall lighting
out vec4 outColor;

// Lights hang at eye height; the texture's v runs ceiling (0) to deck (1).
const float LIGHT_Z = 0.5;

uniform bool u_hasNormals;
uniform sampler2DArray u_normals; // R, G: relief normal x, y; B: gloss
uniform vec3 u_cam;               // camera position, eye height in z
uniform float u_specGain;

// Realistic lights multiply the wall's own colour, as they do on the deck,
// fall off in 3D from the light to this pixel, and only reach surfaces turned
// toward them. With the bake's relief normals a light rakes across the
// panels — seams, bevels and rivet heads catch it — and polished metal
// glints. The per-column Canvas2D light was one flat additive colour for the
// whole column, lit whichever way the wall faced.
vec3 wallLight(vec3 albedo) {
  vec3 p = vec3(v_hit.xy, 1.0 - v_uvl.y);
  vec3 n0 = vec3(v_hit.zw, 0.0);
  vec3 n = n0;
  float gloss = 0.0;
  if (u_hasNormals) {
    vec3 m = textureLod(u_normals, v_uvl, v_lod).rgb;
    vec2 nxy = m.rg * 2.0 - 1.0;
    float nz = sqrt(max(0.0, 1.0 - dot(nxy, nxy)));
    // Texture u runs along the face normal turned +90 degrees; texture y runs
    // down the wall.
    vec3 tangent = vec3(-n0.y, n0.x, 0.0);
    n = normalize(tangent * nxy.x - vec3(0.0, 0.0, nxy.y) + n0 * nz);
    gloss = m.b;
  }
  vec3 view = normalize(u_cam - p);
  vec3 diffuse = vec3(0.0);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec4 L = u_lights[i];
    vec3 dl = vec3(L.xy, LIGHT_Z) - p;
    float d2 = dot(dl, dl);
    float r2 = L.z * L.z;
    if (d2 >= r2) continue;
    float q = d2 / r2;
    float win = 1.0 - q * q;
    float k = win * win * L.w / (1.0 + 6.0 * q);
    vec3 l = dl * inversesqrt(max(d2, 1e-4));
    // Light from behind the wall's plane never reaches it, relief or not.
    if (dot(n0, l) <= 0.0) continue;
    vec3 c = u_lightColors[i] * k;
    diffuse += c * max(0.0, dot(n, l));
    if (gloss > 0.0) spec += c * pow(max(0.0, dot(n, normalize(l + view))), 32.0) * gloss;
  }
  return albedo * diffuse * u_lightGain + spec * u_specGain;
}

void main() {
  vec4 t = v_lod < 0.0 ? vec4(0.0) : textureLod(u_walls, v_uvl, v_lod);
  if (u_lightGain > 0.0 && v_lod >= 0.0) t.rgb = min(t.rgb + wallLight(t.rgb), 1.0);
  float keepFace = 1.0 - v_face.a;
  float keepFog = 1.0 - v_fog.a;
  vec3 c = (t.rgb * t.a * keepFace + v_face.rgb * v_face.a) * keepFog + v_fog.rgb * v_fog.a + v_add;
  // Background left showing: through the art, then through each overlay.
  float bg = (1.0 - t.a) * keepFace * keepFog;
  outColor = vec4(c, 1.0 - bg);
}`;

// Per instance: 8 floats (rect, tex), 4 × RGBA8 (face, fog, light, accent),
// then 4 floats (world hit point and face normal).
const STRIDE = 64;
const LEVELS = 6; // 512 .. 16, as buildMips makes them
const SIZE = 512;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[GL] Wall shader:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

// "rgba(r,g,b,a)" / "rgb(r,g,b)" → [r, g, b, a*255], cached: the LUTs hand the
// same few hundred strings out every frame.
const _rgba = new Map();
export function rgbaBytes(css) {
  let v = _rgba.get(css);
  if (v) return v;
  const m = /rgba?\(([^)]+)\)/.exec(css);
  const p = m ? m[1].split(",").map(Number) : [0, 0, 0, 0];
  v = [p[0] | 0, p[1] | 0, p[2] | 0, Math.round((p.length > 3 ? p[3] : 1) * 255)];
  _rgba.set(css, v);
  return v;
}

const NONE = [0, 0, 0, 0];

export class WallPass {
  constructor(gl) {
    this.gl = gl;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    this.ok = false;
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[GL] Wall program:", gl.getProgramInfoLog(prog));
      return;
    }
    this.prog = prog;
    this.uSize = gl.getUniformLocation(prog, "u_size");
    this.uWalls = gl.getUniformLocation(prog, "u_walls");
    this.uNumLights = gl.getUniformLocation(prog, "u_numLights");
    this.uLights = gl.getUniformLocation(prog, "u_lights");
    this.uLightColors = gl.getUniformLocation(prog, "u_lightColors");
    this.uLightGain = gl.getUniformLocation(prog, "u_lightGain");
    this.uHasNormals = gl.getUniformLocation(prog, "u_hasNormals");
    this.uNormals = gl.getUniformLocation(prog, "u_normals");
    this.uCam = gl.getUniformLocation(prog, "u_cam");
    this.uSpecGain = gl.getUniformLocation(prog, "u_specGain");
    this.cam = [0, 0];
    this.specGain = 0;
    this.normalTex = null;
    this.useNormals = true;
    this._lightBuf = new Float32Array(64);
    this._lightColorBuf = new Float32Array(48);
    this.lightGain = 0;
    this.numLights = 0;

    this.cap = 0;
    this.n = 0;
    this._grow(4096);
    this.buf = gl.createBuffer();

    const vao = (this.vao = gl.createVertexArray());
    gl.bindVertexArray(vao);
    const corners = (this.corners = gl.createBuffer());
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = (n) => gl.getAttribLocation(prog, n);
    gl.enableVertexAttribArray(loc("a_corner"));
    gl.vertexAttribPointer(loc("a_corner"), 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const inst = (name, size, type, norm, offset) => {
      const l = loc(name);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, type, norm, STRIDE, offset);
      gl.vertexAttribDivisor(l, 1);
    };
    inst("a_rect", 4, gl.FLOAT, false, 0);
    inst("a_tex", 4, gl.FLOAT, false, 16);
    inst("a_face", 4, gl.UNSIGNED_BYTE, true, 32);
    inst("a_fog", 4, gl.UNSIGNED_BYTE, true, 36);
    inst("a_light", 4, gl.UNSIGNED_BYTE, true, 40);
    inst("a_accent", 4, gl.UNSIGNED_BYTE, true, 44);
    inst("a_hit", 4, gl.FLOAT, false, 48);
    gl.bindVertexArray(null);

    this.tex = null;
    this.env = null;
    this.ok = true;
  }

  _grow(min) {
    let cap = this.cap || 4096;
    while (cap < min) cap *= 2;
    const data = new ArrayBuffer(cap * STRIDE);
    if (this.data) new Uint8Array(data).set(new Uint8Array(this.data, 0, this.n * STRIDE));
    this.data = data;
    this.f32 = new Float32Array(data);
    this.u8 = new Uint8Array(data);
    this.cap = cap;
  }

  /**
   * Upload an env's wall mip chains (generateModernEnv().walls) as one texture
   * array, once per env. False when they are not the expected 512px chains,
   * and the caller draws walls on the Canvas2D path.
   */
  useEnv(env) {
    if (!this.ok) return false;
    if (this.env === env) return !!this.tex;
    this.env = env;
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    if (this.normalTex) gl.deleteTexture(this.normalTex);
    this.tex = null;
    this.normalTex = null;
    const ids = Object.keys(env.walls).map(Number);
    const layers = Math.max(...ids);
    for (const id of ids) {
      const mips = env.walls[id];
      if (mips.length < LEVELS || mips[0].width !== SIZE || mips[0].height !== SIZE) return false;
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, LEVELS, gl.RGBA8, SIZE, SIZE, layers);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    for (const id of ids) {
      const mips = env.walls[id];
      for (let l = 0; l < LEVELS; l++) {
        const s = SIZE >> l;
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, l, 0, 0, id - 1, s, s, 1, gl.RGBA, gl.UNSIGNED_BYTE, mips[l]);
      }
    }
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAX_LEVEL, LEVELS - 1);
    this.tex = tex;
    this.normalTex = ids.every((id) => env.walls[id].normals?.length >= LEVELS)
      ? this._uploadArray(ids, (id) => env.walls[id].normals, layers)
      : null;
    return true;
  }

  /** A texture array of each wall type's mip chain from `chainOf(id)`. */
  _uploadArray(ids, chainOf, layers) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, LEVELS, gl.RGBA8, SIZE, SIZE, layers);
    for (const id of ids) {
      const mips = chainOf(id);
      for (let l = 0; l < LEVELS; l++) {
        const s = SIZE >> l;
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, l, 0, 0, id - 1, s, s, 1, gl.RGBA, gl.UNSIGNED_BYTE, mips[l]);
      }
    }
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAX_LEVEL, LEVELS - 1);
    return tex;
  }

  /**
   * Start a frame. `lights` ({x, y, color 0-255, radius, intensity}) are lit
   * per pixel when `gain` > 0 (Realistic); 0 keeps the per-column colours.
   */
  begin(lights = null, gain = 0, camX = 0, camY = 0, specGain = 0) {
    this.n = 0;
    this.lightGain = gain;
    this.specGain = specGain;
    this.cam[0] = camX;
    this.cam[1] = camY;
    const n = gain > 0 && lights ? Math.min(lights.length, 16) : 0;
    const lb = this._lightBuf;
    const cb = this._lightColorBuf;
    for (let i = 0; i < n; i++) {
      const l = lights[i];
      const c = l.color || [255, 200, 150];
      lb[i * 4] = l.x;
      lb[i * 4 + 1] = l.y;
      lb[i * 4 + 2] = l.radius ?? 3;
      lb[i * 4 + 3] = l.intensity ?? 1;
      cb[i * 3] = c[0] / 255;
      cb[i * 3 + 1] = c[1] / 255;
      cb[i * 3 + 2] = c[2] / 255;
    }
    this.numLights = n;
  }

  /**
   * One wall segment: screen column x, rows y0..y1, showing wall `layer`
   * (wall type) at texture u, v0..v1 (0-1) and mip `lod` (fractional blends
   * the two nearest levels; < 0 draws no texture). face/fog are
   * [r, g, b, a255] source-over overlays; light/accent additive.
   */
  wall(x, y0, y1, layer, lod, u, v0, v1, face, fog, light, accent, hitX = 0, hitY = 0, nX = 0, nY = 0) {
    this._put(x, y0, y1, layer - 1, u, v0, v1, lod, face, fog, light, accent);
    const i = (this.n - 1) * 16 + 12;
    this.f32[i] = hitX;
    this.f32[i + 1] = hitY;
    this.f32[i + 2] = nX;
    this.f32[i + 3] = nY;
  }

  /** An opaque flat-colour segment (a short wall's top face). */
  flat(x, y0, y1, rgb) {
    this._put(x, y0, y1, 0, 0, 0, 0, -1, rgb, NONE, NONE, NONE);
  }

  _put(x, y0, y1, layer, u, v0, v1, lod, face, fog, light, accent) {
    if (this.n >= this.cap) this._grow(this.n + 1);
    const f = this.f32;
    const b = this.u8;
    const i = this.n * 16;
    f[i] = x;
    f[i + 1] = y0;
    f[i + 2] = y1;
    f[i + 3] = layer;
    f[i + 4] = u;
    f[i + 5] = v0;
    f[i + 6] = v1;
    f[i + 7] = lod;
    const o = this.n * STRIDE + 32;
    b[o] = face[0]; b[o + 1] = face[1]; b[o + 2] = face[2]; b[o + 3] = face[3];
    b[o + 4] = fog[0]; b[o + 5] = fog[1]; b[o + 6] = fog[2]; b[o + 7] = fog[3];
    b[o + 8] = light[0]; b[o + 9] = light[1]; b[o + 10] = light[2]; b[o + 11] = light[3];
    b[o + 12] = accent[0]; b[o + 13] = accent[1]; b[o + 14] = accent[2]; b[o + 15] = accent[3];
    f[i + 12] = f[i + 13] = f[i + 14] = f[i + 15] = 0;
    this.n++;
  }

  /** Draw the recorded segments into the current viewport (w × h). */
  draw(w, h) {
    const gl = this.gl;
    if (!this.n) return;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog);
    gl.uniform2f(this.uSize, w, h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.tex);
    gl.uniform1i(this.uWalls, 0);
    gl.uniform1f(this.uLightGain, this.lightGain);
    gl.uniform1f(this.uSpecGain, this.specGain);
    gl.uniform3f(this.uCam, this.cam[0], this.cam[1], 0.5);
    const normals = this.lightGain > 0 && this.useNormals && this.normalTex;
    gl.uniform1i(this.uHasNormals, normals ? 1 : 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, normals ? this.normalTex : this.tex);
    gl.uniform1i(this.uNormals, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.uNumLights, this.numLights);
    if (this.numLights) {
      gl.uniform4fv(this.uLights, this._lightBuf);
      gl.uniform3fv(this.uLightColors, this._lightColorBuf);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, this.u8.subarray(0, this.n * STRIDE), gl.STREAM_DRAW);
    gl.bindVertexArray(this.vao);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  destroy() {
    const gl = this.gl;
    if (this.tex) gl.deleteTexture(this.tex);
    if (this.normalTex) gl.deleteTexture(this.normalTex);
    if (this.buf) gl.deleteBuffer(this.buf);
    if (this.corners) gl.deleteBuffer(this.corners);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.prog) gl.deleteProgram(this.prog);
  }
}
