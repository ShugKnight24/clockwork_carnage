/**
 * gl-renderer.js — WebGL2 hybrid renderer for Clockwork Carnage.
 *
 * Handles GPU-accelerated floor/ceiling rendering and post-processing.
 * Walls, sprites, and procedural art continue using Canvas2D.
 *
 * Architecture:
 *   1. WebGL renders floor/ceiling via fullscreen quad + fragment shader
 *   2. Result is composited onto the main Canvas2D via drawImage
 *   3. Canvas2D handles walls, sprites, HUD, and procedural enemy art
 *   4. Post-FX can optionally run as WebGL shader passes
 *
 * Fallback: If WebGL2 is unavailable, returns null and the game
 * uses the Canvas2D software renderer (Uint32Array path).
 */

// ── Shader sources (inlined for zero-fetch boot) ──────────────────

const FLOOR_VERT = `#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FLOOR_FRAG = `#version 300 es
precision highp float;

uniform vec2 u_resolution;     // canvas width, height
uniform vec2 u_camPos;         // camera world position
uniform vec2 u_dir;            // camera direction
uniform vec2 u_plane;          // camera plane (FOV)
uniform float u_yShift;        // pitch offset
uniform sampler2D u_floorTex;  // 256x256 floor texture
uniform sampler2D u_ceilTex;   // 256x256 ceiling texture
uniform vec3 u_fogColor;       // act-tinted fog RGB (0-1)
uniform float u_fogMax;        // max fog opacity
uniform int u_numLights;       // number of dynamic lights
uniform vec4 u_lights[16];     // xyz=position, w=intensity (max 16)
uniform vec3 u_lightColors[16];

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy;
  float w = u_resolution.x;
  float h = u_resolution.y;
  float halfH = floor(h * 0.5) + u_yShift;
  float projH = floor(h * 0.5);

  float y = uv.y;
  // Flip Y — WebGL origin is bottom-left, canvas is top-left
  float screenY = h - 1.0 - y;

  bool isFloor = screenY > halfH;
  bool isCeiling = screenY < halfH;

  if (!isFloor && !isCeiling) {
    // Horizon line
    fragColor = vec4(u_fogColor, 1.0);
    return;
  }

  float p;
  if (isFloor) {
    p = screenY - halfH;
  } else {
    p = halfH - screenY;
  }

  if (p <= 0.0) {
    fragColor = vec4(u_fogColor, 1.0);
    return;
  }

  float rowDist = projH / p;

  // Ray direction for this pixel's column
  float cameraX = (2.0 * uv.x / w) - 1.0;
  float rayDirX = u_dir.x + u_plane.x * cameraX;
  float rayDirY = u_dir.y + u_plane.y * cameraX;

  // World-space floor position
  float floorX = u_camPos.x + rowDist * rayDirX;
  float floorY = u_camPos.y + rowDist * rayDirY;

  // Texture coordinates (256x256, wrapping)
  vec2 texCoord = fract(vec2(floorX, floorY));

  // Sample texture
  vec3 texColor;
  if (isFloor) {
    texColor = texture(u_floorTex, texCoord).rgb;
  } else {
    texColor = texture(u_ceilTex, texCoord).rgb;
  }

  // Distance fog
  float fog = min(u_fogMax, rowDist / 12.0);
  vec3 color = mix(texColor, u_fogColor, fog);

  // Dynamic point lights — additive
  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec3 lightPos = u_lights[i].xyz;
    float intensity = u_lights[i].w;
    float dist = distance(vec2(floorX, floorY), lightPos.xy);
    float radius = intensity * 3.0;
    if (dist < radius) {
      float atten = 1.0 - (dist / radius);
      atten *= atten; // quadratic falloff
      color += u_lightColors[i] * atten * intensity * 0.3;
    }
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

const POSTFX_VERT = FLOOR_VERT; // same fullscreen quad

const POSTFX_FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_scene;     // the rendered scene
uniform vec2 u_resolution;
uniform float u_time;
uniform bool u_enableBloom;
uniform bool u_enableCA;
uniform bool u_enableGrain;
uniform vec3 u_gradeColor;     // per-act color grade tint

out vec4 fragColor;

// Simple pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  vec3 color;

  // Chromatic aberration
  if (u_enableCA) {
    float caAmount = 0.002;
    float r = texture(u_scene, uv + vec2(caAmount, 0.0)).r;
    float g = texture(u_scene, uv).g;
    float b = texture(u_scene, uv - vec2(caAmount, 0.0)).b;
    color = vec3(r, g, b);
  } else {
    color = texture(u_scene, uv).rgb;
  }

  // Bloom (simplified — sample blurred neighbors)
  if (u_enableBloom) {
    vec3 bloom = vec3(0.0);
    float texelW = 1.0 / u_resolution.x;
    float texelH = 1.0 / u_resolution.y;
    for (int i = -2; i <= 2; i++) {
      for (int j = -2; j <= 2; j++) {
        vec2 offset = vec2(float(i) * texelW * 4.0, float(j) * texelH * 4.0);
        vec3 s = texture(u_scene, uv + offset).rgb;
        float brightness = dot(s, vec3(0.2126, 0.7152, 0.0722));
        if (brightness > 0.7) bloom += s;
      }
    }
    bloom /= 25.0;
    color += bloom * 0.15;
  }

  // Film grain
  if (u_enableGrain) {
    float grain = rand(uv + fract(u_time * 0.001)) * 0.06 - 0.03;
    color += grain;
  }

  // Color grading (per-act tint)
  color = mix(color, u_gradeColor, 0.03);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

// ── Helper functions ──────────────────────────────────────────────

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[GL] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[GL] Program link error:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function createTexture(gl, width, height, data) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
}

// ── GLRenderer class ──────────────────────────────────────────────

export class GLRenderer {
  /**
   * Try to create a WebGL2 renderer. Returns null if WebGL2 is unavailable.
   * @param {number} width  - Canvas width
   * @param {number} height - Canvas height
   */
  static create(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true, // needed for drawImage compositing
    });
    if (!gl) return null;

    try {
      const renderer = new GLRenderer(canvas, gl, width, height);
      return renderer;
    } catch (e) {
      console.warn('[GL] Failed to initialize WebGL renderer:', e);
      return null;
    }
  }

  constructor(canvas, gl, width, height) {
    this.canvas = canvas;
    this.gl = gl;
    this.width = width;
    this.height = height;

    // Compile shader programs
    this.floorProgram = createProgram(gl, FLOOR_VERT, FLOOR_FRAG);
    this.postfxProgram = createProgram(gl, POSTFX_VERT, POSTFX_FRAG);
    if (!this.floorProgram || !this.postfxProgram) {
      throw new Error('Shader compilation failed');
    }

    // Cache uniform locations
    this._cacheUniforms();

    // Fullscreen quad VAO
    this.quadVAO = this._createQuadVAO();

    // Texture slots
    this.floorTex = null;
    this.ceilTex = null;
    this._texPixelsCache = null;

    // Framebuffer for post-FX input
    this.sceneFBO = this._createFramebuffer(width, height);
  }

  _cacheUniforms() {
    const gl = this.gl;
    // Floor program uniforms
    const fp = this.floorProgram;
    this.u_floor = {
      resolution: gl.getUniformLocation(fp, 'u_resolution'),
      camPos: gl.getUniformLocation(fp, 'u_camPos'),
      dir: gl.getUniformLocation(fp, 'u_dir'),
      plane: gl.getUniformLocation(fp, 'u_plane'),
      yShift: gl.getUniformLocation(fp, 'u_yShift'),
      floorTex: gl.getUniformLocation(fp, 'u_floorTex'),
      ceilTex: gl.getUniformLocation(fp, 'u_ceilTex'),
      fogColor: gl.getUniformLocation(fp, 'u_fogColor'),
      fogMax: gl.getUniformLocation(fp, 'u_fogMax'),
      numLights: gl.getUniformLocation(fp, 'u_numLights'),
      lights: [],
      lightColors: [],
    };
    for (let i = 0; i < 16; i++) {
      this.u_floor.lights.push(gl.getUniformLocation(fp, `u_lights[${i}]`));
      this.u_floor.lightColors.push(gl.getUniformLocation(fp, `u_lightColors[${i}]`));
    }

    // PostFX program uniforms
    const pp = this.postfxProgram;
    this.u_postfx = {
      scene: gl.getUniformLocation(pp, 'u_scene'),
      resolution: gl.getUniformLocation(pp, 'u_resolution'),
      time: gl.getUniformLocation(pp, 'u_time'),
      enableBloom: gl.getUniformLocation(pp, 'u_enableBloom'),
      enableCA: gl.getUniformLocation(pp, 'u_enableCA'),
      enableGrain: gl.getUniformLocation(pp, 'u_enableGrain'),
      gradeColor: gl.getUniformLocation(pp, 'u_gradeColor'),
    };
  }

  _createQuadVAO() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Fullscreen triangle strip
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, 1, 1,
    ]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.floorProgram, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }

  _createFramebuffer(w, h) {
    const gl = this.gl;
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, texture: tex };
  }

  /**
   * Upload floor/ceiling texture pixel data as WebGL textures.
   * @param {Uint8ClampedArray} floorPixels - 256*256*4 RGBA
   * @param {Uint8ClampedArray} ceilPixels  - 256*256*4 RGBA
   */
  uploadFloorCeilTextures(floorPixels, ceilPixels) {
    const gl = this.gl;
    if (this.floorTex) gl.deleteTexture(this.floorTex);
    if (this.ceilTex) gl.deleteTexture(this.ceilTex);
    this.floorTex = createTexture(gl, 256, 256, floorPixels);
    this.ceilTex = createTexture(gl, 256, 256, ceilPixels);
  }

  /** Resize the WebGL canvas + framebuffers. */
  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;

    // Recreate FBO
    const gl = this.gl;
    gl.deleteFramebuffer(this.sceneFBO.fbo);
    gl.deleteTexture(this.sceneFBO.texture);
    this.sceneFBO = this._createFramebuffer(w, h);
  }

  /**
   * Render floor and ceiling to the WebGL canvas.
   * Call this, then draw the result onto the main Canvas2D via drawImage.
   */
  renderFloorCeiling(camX, camY, dirX, dirY, planeX, planeY, yShift, fogColor, fogMax, lights) {
    const gl = this.gl;
    const w = this.width;
    const h = this.height;

    gl.viewport(0, 0, w, h);
    gl.useProgram(this.floorProgram);
    gl.bindVertexArray(this.quadVAO);

    // Uniforms
    gl.uniform2f(this.u_floor.resolution, w, h);
    gl.uniform2f(this.u_floor.camPos, camX, camY);
    gl.uniform2f(this.u_floor.dir, dirX, dirY);
    gl.uniform2f(this.u_floor.plane, planeX, planeY);
    gl.uniform1f(this.u_floor.yShift, yShift);
    gl.uniform3f(this.u_floor.fogColor, fogColor[0], fogColor[1], fogColor[2]);
    gl.uniform1f(this.u_floor.fogMax, fogMax);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.floorTex);
    gl.uniform1i(this.u_floor.floorTex, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.ceilTex);
    gl.uniform1i(this.u_floor.ceilTex, 1);

    // Dynamic lights
    const numLights = Math.min(lights ? lights.length : 0, 16);
    gl.uniform1i(this.u_floor.numLights, numLights);
    for (let i = 0; i < numLights; i++) {
      const l = lights[i];
      gl.uniform4f(this.u_floor.lights[i], l.x, l.y, l.z ?? 0, l.intensity ?? 1);
      gl.uniform3f(this.u_floor.lightColors[i],
        (l.r ?? 255) / 255,
        (l.g ?? 200) / 255,
        (l.b ?? 150) / 255
      );
    }

    // Draw fullscreen quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  /**
   * Run post-FX shader on the current canvas content.
   * Reads from sceneFBO texture, writes to screen.
   */
  renderPostFX(time, enableBloom, enableCA, enableGrain, gradeColor) {
    const gl = this.gl;
    const w = this.width;
    const h = this.height;

    // Copy current canvas to FBO texture for reading
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFBO.fbo);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, w, h, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, w, h);
    gl.useProgram(this.postfxProgram);
    gl.bindVertexArray(this.quadVAO);

    // Bind scene texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.texture);
    gl.uniform1i(this.u_postfx.scene, 0);

    gl.uniform2f(this.u_postfx.resolution, w, h);
    gl.uniform1f(this.u_postfx.time, time);
    gl.uniform1i(this.u_postfx.enableBloom, enableBloom ? 1 : 0);
    gl.uniform1i(this.u_postfx.enableCA, enableCA ? 1 : 0);
    gl.uniform1i(this.u_postfx.enableGrain, enableGrain ? 1 : 0);
    gl.uniform3f(this.u_postfx.gradeColor, gradeColor[0], gradeColor[1], gradeColor[2]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  /**
   * Run post-FX shader on an external Canvas2D source.
   * Uploads the canvas content as a texture, runs the shader, and writes
   * the result to this GL canvas (which can then be drawn back via drawImage).
   * @param {HTMLCanvasElement} srcCanvas - the Canvas2D with the rendered scene
   * @param {number} time
   * @param {boolean} enableBloom
   * @param {boolean} enableCA
   * @param {boolean} enableGrain
   * @param {number[]} gradeColor - [r, g, b] in 0-1 range
   */
  renderPostFXFromCanvas(srcCanvas, time, enableBloom, enableCA, enableGrain, gradeColor) {
    const gl = this.gl;
    const w = this.width;
    const h = this.height;

    // Upload the Canvas2D content as the scene texture
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);

    // Render post-FX to the GL canvas (default framebuffer)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.postfxProgram);
    gl.bindVertexArray(this.quadVAO);

    // Bind scene texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.texture);
    gl.uniform1i(this.u_postfx.scene, 0);

    gl.uniform2f(this.u_postfx.resolution, w, h);
    gl.uniform1f(this.u_postfx.time, time);
    gl.uniform1i(this.u_postfx.enableBloom, enableBloom ? 1 : 0);
    gl.uniform1i(this.u_postfx.enableCA, enableCA ? 1 : 0);
    gl.uniform1i(this.u_postfx.enableGrain, enableGrain ? 1 : 0);
    gl.uniform3f(this.u_postfx.gradeColor, gradeColor[0], gradeColor[1], gradeColor[2]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  /** Clean up GL resources. */
  destroy() {
    const gl = this.gl;
    gl.deleteProgram(this.floorProgram);
    gl.deleteProgram(this.postfxProgram);
    if (this.floorTex) gl.deleteTexture(this.floorTex);
    if (this.ceilTex) gl.deleteTexture(this.ceilTex);
    gl.deleteFramebuffer(this.sceneFBO.fbo);
    gl.deleteTexture(this.sceneFBO.texture);
  }
}
