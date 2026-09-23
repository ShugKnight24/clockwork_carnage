/**
 * WebGL2 renderer for the voxel Forge: one VAO per chunk built from the greedy
 * mesher, a texture-array atlas, billboard sprites, and a per-art-style post
 * pass (legacy passthrough, comic ink, modern filmic).
 *
 * It owns its own canvas so the 2D game renderer can composite it; nothing here
 * touches the game's canvas or state. Everything that can fail — context
 * creation, shader compilation, framebuffer completeness — fails loudly through
 * `create()` returning null, so callers can keep the raycaster.
 *
 * World axes: x/y horizontal, z up. Yaw is measured from +x toward +y, pitch is
 * positive looking up.
 */
import { World, chunkKeyCoords } from "../../world/world.js";
import { BLOCKS } from "../../world/blocks.js";
import { meshChunk, STRIDE } from "./mesher.js";
import { buildAtlas, ATLAS_SIZE } from "./atlas.js";
import { CHUNK_VERT, CHUNK_FRAG, SPRITE_VERT, SPRITE_FRAG, POST_VERT, POST_FRAG } from "./shaders.js";
import { SpriteCache } from "./sprite-cache.js";
import { resolveEnvPalette, FOG_DENSITY } from "../env/palettes.js";
import { buildWallSet } from "../env/wall-art.js";
import { buildDeckSet } from "../env/deck-art.js";
import { generateWallTextures } from "../textures.js";

const MESH_BUDGET = 4;          // chunks re-meshed per frame
const STYLE_ID = { legacy: 0, comic: 1, modern: 2 };
const MAX_LIGHTS = 16;          // must match the array size in CHUNK_FRAG
const MAX_LAYERS = 32;          // must match u_emissiveByLayer/u_layerAlpha in CHUNK_FRAG
const CS = World.CS;            // chunk size in blocks
const CHUNK_RADIUS = (CS * Math.sqrt(3)) / 2;
const NEAR = 0.05, FAR = 256;

/**
 * Chunk cull radius, in blocks. Deliberately NOT `quality.drawDistance`: that
 * knob counts raycaster *tiles* (8–20) and would cut the voxel horizon to a few
 * dozen blocks — an empty sky on the low tiers. It is set past half the world
 * diagonal so every chunk of the 128×128×64 world is eligible and the frustum,
 * not an arbitrary ring, decides what is drawn. The fog ramp still fades the
 * distance; this only bounds the cull.
 */
export const VOXEL_DRAW_DISTANCE = 160;

/**
 * Is a chunk near enough to draw? Sphere-vs-sphere against the chunk's
 * bounding sphere, so a chunk whose centre is just past the radius but whose
 * corner is inside still counts.
 * @param {number[]} origin chunk's minimum corner in blocks
 */
export function chunkInDistance(origin, camX, camY, camZ, maxDist = VOXEL_DRAW_DISTANCE) {
  const cx = origin[0] + CS / 2, cy = origin[1] + CS / 2, cz = origin[2] + CS / 2;
  return Math.hypot(cx - camX, cy - camY, cz - camZ) <= maxDist + CS;
}

/** Glass art is painted opaque (it is a window in a wall), so the renderer owns its opacity. */
const GLASS_ALPHA = 0.42;

/** Ambient light per style: legacy is flat, modern sits dark so the tonemap has headroom. */
const AMBIENT = {
  legacy: [1, 1, 1],
  comic: [0.95, 0.95, 0.98],
  modern: [0.62, 0.66, 0.72],
};

/** Legacy has no palette fog ramp — it uses the flat per-act air colour the raycaster uses. */
const LEGACY_FOG = {
  1: [12 / 255, 22 / 255, 38 / 255],
  2: [24 / 255, 14 / 255, 12 / 255],
  3: [26 / 255, 8 / 255, 16 / 255],
};

// ── GL helpers ──────────────────────────────────────────────────────────────

function compileStage(gl, type, src, what) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`${what} shader failed to compile:\n${log}`);
  }
  return sh;
}

function compile(gl, vs, fs) {
  const v = compileStage(gl, gl.VERTEX_SHADER, vs, "vertex");
  const f = compileStage(gl, gl.FRAGMENT_SHADER, fs, "fragment");
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v); gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(`program failed to link:\n${log}`);
  }
  return p;
}

// ── Matrix helpers (column-major, the layout uniformMatrix4fv wants) ────────

function perspective(out, fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function lookAt(out, eye, yaw, pitch) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const fx = Math.cos(yaw) * cp, fy = Math.sin(yaw) * cp, fz = sp;
  // right = forward × worldUp(+z); it degenerates only when looking straight up
  // or down, which the caller's pitch clamp rules out.
  let sx = fy, sy = -fx, sz = 0;
  const sl = Math.hypot(sx, sy, sz) || 1;
  sx /= sl; sy /= sl; sz /= sl;
  // up = right × forward
  const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
  out[0] = sx; out[1] = ux; out[2] = -fx; out[3] = 0;
  out[4] = sy; out[5] = uy; out[6] = -fy; out[7] = 0;
  out[8] = sz; out[9] = uz; out[10] = -fz; out[11] = 0;
  out[12] = -(sx * eye[0] + sy * eye[1] + sz * eye[2]);
  out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
  out[14] = fx * eye[0] + fy * eye[1] + fz * eye[2];
  out[15] = 1;
  return out;
}

function mul4(out, a, b) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b0 + a[4 + r] * b1 + a[8 + r] * b2 + a[12 + r] * b3;
    }
  }
  return out;
}

/** Vertically flipped copy: canvas y grows down, world z grows up. */
function flipped(src) {
  const c = document.createElement("canvas");
  c.width = src.width; c.height = src.height;
  const g = c.getContext("2d");
  g.translate(0, src.height);
  g.scale(1, -1);
  g.drawImage(src, 0, 0);
  return c;
}

// ── Renderer ────────────────────────────────────────────────────────────────

export class VoxelRenderer {
  /** @returns {VoxelRenderer|null} null when WebGL2 is unavailable or setup fails */
  static create(width, height) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: true, stencil: false,
      preserveDrawingBuffer: true, powerPreference: "high-performance",
    });
    if (!gl) return null;
    try { return new VoxelRenderer(gl, canvas); } catch (e) { console.warn("[VoxelRenderer]", e); return null; }
  }

  constructor(gl, canvas) {
    this.gl = gl; this.canvas = canvas;
    this.width = canvas.width; this.height = canvas.height;
    this.lost = false; this.destroyed = false; this._restoreWarned = false;
    this._pendingSize = null;  // a resize that arrived while the context was lost
    this.chunks = new Map();   // world chunk key -> { origin, opaque, alpha, dist }
    this._alphaOrder = [];     // scratch for the back-to-front see-through pass
    this._cc = [0, 0, 0];      // scratch for decoding chunk keys
    this.world = null;
    this.atlasKey = ""; this.style = "comic"; this.layerOf = null; this.emissiveByLayer = null;
    this.atlasTex = null;
    this.stats = { chunksDrawn: 0, meshedThisFrame: 0, ms: 0 };
    this.proj = new Float32Array(16);
    this.view = new Float32Array(16);
    this.viewProj = new Float32Array(16);
    this.planes = new Float32Array(24);
    this.lightData = new Float32Array(MAX_LIGHTS * 4);
    this.lightColors = new Float32Array(MAX_LIGHTS * 3);
    this.fog = { near: [0.05, 0.08, 0.12], far: [0.02, 0.04, 0.08], density: FOG_DENSITY * 0.35, max: 0.85 };
    // Kept on `this` so destroy() can take them off the canvas again: a restore
    // event on a destroyed renderer would otherwise rebuild everything it freed.
    this._onContextLost = (e) => { e.preventDefault(); this.lost = true; };
    this._onContextRestored = () => {
      if (this.destroyed) return;
      this.chunks.clear();
      this.atlasKey = "";
      // A resize that arrived while the context was gone was dropped, not
      // applied: take it now so the rebuilt framebuffer matches the canvas.
      if (this._pendingSize) {
        [this.width, this.height] = this._pendingSize;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this._pendingSize = null;
      }
      try {
        this._initGL();
      } catch (err) {
        // Stay lost rather than claim a context we could not finish building.
        if (!this._restoreWarned) { this._restoreWarned = true; console.warn("[VoxelRenderer] context restore failed", err); }
        return;
      }
      this.lost = false;
      if (this.world) this.world.markAllDirty();
    };
    canvas.addEventListener("webglcontextlost", this._onContextLost);
    canvas.addEventListener("webglcontextrestored", this._onContextRestored);
    this._initGL();
  }

  _initGL() {
    const gl = this.gl;
    this.chunkProg = compile(gl, CHUNK_VERT, CHUNK_FRAG);
    this.spriteProg = compile(gl, SPRITE_VERT, SPRITE_FRAG);
    this.postProg = compile(gl, POST_VERT, POST_FRAG);
    this.u = {
      chunk: this._uniforms(this.chunkProg, ["u_viewProj", "u_origin", "u_atlas", "u_cam", "u_fogNear", "u_fogFar", "u_fogDensity", "u_fogMax", "u_ambient", "u_numLights", "u_lights", "u_lightColors", "u_emissiveByLayer", "u_layerAlpha", "u_alphaPass"]),
      sprite: this._uniforms(this.spriteProg, ["u_viewProj", "u_pos", "u_right", "u_up", "u_size", "u_uvFlip", "u_tex", "u_alpha", "u_tint", "u_fog", "u_fogColor", "u_depth"]),
      post: this._uniforms(this.postProg, ["u_color", "u_depth", "u_texel", "u_style", "u_inkWidth"]),
    };
    this.sprites = new SpriteCache(gl);
    this.anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");
    this.floatColorExt = gl.getExtension("EXT_color_buffer_float");
    this._createQuads();
    this._createFBO(this.width, this.height);
  }

  _uniforms(prog, names) {
    const gl = this.gl, out = {};
    for (const n of names) out[n] = gl.getUniformLocation(prog, n);
    return out;
  }

  _createQuads() {
    const gl = this.gl;
    // Full-screen quad in clip space for the post pass.
    this.quadVao = gl.createVertexArray();
    this.quadVbo = gl.createBuffer();
    gl.bindVertexArray(this.quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // Sprite quad: x in -0.5..0.5 (across), y in 0..1 (feet to head).
    this.spriteVao = gl.createVertexArray();
    this.spriteVbo = gl.createBuffer();
    gl.bindVertexArray(this.spriteVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, 0, 0.5, 0, -0.5, 1, 0.5, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  _createFBO(w, h) {
    const gl = this.gl;
    this._freeFBO();
    this.colorTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);

    // Linear depth for the ink pass. R16F needs EXT_color_buffer_float to be
    // renderable; RGBA8 is the fallback and costs the ink pass some precision.
    this.depthIsFloat = !!this.floatColorExt;
    this.linearDepthTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.linearDepthTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, this.depthIsFloat ? gl.R16F : gl.RGBA8, w, h);
    for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);

    this.depthRb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTex, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, this.linearDepthTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRb);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`scene framebuffer incomplete (0x${status.toString(16)}, ${w}x${h}, depth ${this.depthIsFloat ? "R16F" : "RGBA8"})`);
    }
  }

  _freeFBO() {
    const gl = this.gl;
    if (this.fbo) { gl.deleteFramebuffer(this.fbo); this.fbo = null; }
    if (this.colorTex) { gl.deleteTexture(this.colorTex); this.colorTex = null; }
    if (this.linearDepthTex) { gl.deleteTexture(this.linearDepthTex); this.linearDepthTex = null; }
    if (this.depthRb) { gl.deleteRenderbuffer(this.depthRb); this.depthRb = null; }
  }

  resize(w, h) {
    if (this.destroyed) return;
    if (!(w > 0 && h > 0)) return;
    // No GL to resize while the context is gone, and the window does not stop
    // changing size meanwhile: remember the last one for the restore handler.
    if (this.lost) { this._pendingSize = w === this.width && h === this.height ? null : [w, h]; return; }
    if (w === this.width && h === this.height) return;
    this.width = w; this.height = h;
    this.canvas.width = w; this.canvas.height = h;
    this._createFBO(w, h);
  }

  setWorld(world) {
    this.world = world;
    for (const c of this.chunks.values()) this._freeChunk(c);
    this.chunks.clear();
    if (world) world.markAllDirty();
  }

  /** Rebuild the atlas when style or act changes. */
  setStyle(style, act) {
    if (this.destroyed || this.lost) return;
    const key = `${style}|${act}`;
    if (key === this.atlasKey) return;
    const pal = resolveEnvPalette(act, null);
    const art = style === "legacy"
      ? { legacyWalls: generateWallTextures() }
      : { walls: buildWallSet(act, pal, 0, style === "modern"), deck: buildDeckSet(act, false, pal, 0) };
    const atlas = buildAtlas(style, art);
    if (atlas.count > MAX_LAYERS) throw new Error(`atlas has ${atlas.count} layers, the chunk shader holds ${MAX_LAYERS}`);
    this._uploadAtlas(atlas.canvases, style === "legacy");
    this.layerOf = atlas.layerOf;
    this.emissiveByLayer = new Float32Array(MAX_LAYERS * 3);
    this.layerAlpha = new Float32Array(MAX_LAYERS).fill(1);
    for (const b of BLOCKS) {
      if (!b.faces) continue;
      for (const f of [0, 1, 2]) {
        const layer = atlas.layerOf(b.id, f);
        if (b.emissive) this.emissiveByLayer.set(b.emissive, layer * 3);
        if (b.kind === "glass") this.layerAlpha[layer] = GLASS_ALPHA;
      }
    }
    const legacyFog = LEGACY_FOG[act] || LEGACY_FOG[1];
    this.fog = style === "legacy"
      ? { near: legacyFog, far: legacyFog, density: FOG_DENSITY * 0.35, max: 0.85 }
      : {
        near: (pal.fogNear || [7, 15, 25]).map((v) => v / 255),
        far: (pal.fogFar || [26, 50, 66]).map((v) => v / 255),
        density: FOG_DENSITY * 0.35,
        max: 0.85,
      };
    this.atlasKey = key; this.style = style;
    // Layer ids moved, so every cached mesh is stale.
    for (const c of this.chunks.values()) this._freeChunk(c);
    this.chunks.clear();
    if (this.world) this.world.markAllDirty();
  }

  _uploadAtlas(canvases, nearest) {
    const gl = this.gl;
    if (this.atlasTex) gl.deleteTexture(this.atlasTex);
    this.atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.atlasTex);
    const levels = Math.log2(ATLAS_SIZE) + 1;
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA8, ATLAS_SIZE, ATLAS_SIZE, canvases.length);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    for (let i = 0; i < canvases.length; i++) {
      // Flip on upload: the mesher's v runs up the wall, canvas y runs down it.
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, ATLAS_SIZE, ATLAS_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, flipped(canvases[i]));
    }
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST_MIPMAP_LINEAR : gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    if (this.anisoExt) gl.texParameterf(gl.TEXTURE_2D_ARRAY, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  }

  // ── Chunk meshes ─────────────────────────────────────────────────────────

  /** Squared chunk-grid distance; decodes into a scratch array so the sort comparator allocates nothing. */
  _chunkDist(key, camChunk) {
    const c = chunkKeyCoords(key, this._cc);
    const dx = c[0] - camChunk[0], dy = c[1] - camChunk[1], dz = c[2] - camChunk[2];
    return dx * dx + dy * dy + dz * dz;
  }

  _meshDirty(camChunk) {
    const dirty = this.world.takeDirty();
    if (!dirty.length) return 0;
    // Nearest first; the rest stay dirty for the next frame.
    if (dirty.length > MESH_BUDGET) dirty.sort((a, b) => this._chunkDist(a, camChunk) - this._chunkDist(b, camChunk));
    const n = Math.min(dirty.length, MESH_BUDGET);
    for (let i = n; i < dirty.length; i++) this.world.dirty.add(dirty[i]);
    for (let i = 0; i < n; i++) this._buildChunk(dirty[i]);
    return n;
  }

  _buildChunk(key) {
    const [cx, cy, cz] = this.world.chunkCoords(key);
    const m = meshChunk(this.world, cx, cy, cz, this.layerOf);
    let c = this.chunks.get(key);
    if (!c) { c = { origin: new Float32Array([cx * CS, cy * CS, cz * CS]), opaque: null, alpha: null, dist: 0 }; this.chunks.set(key, c); }
    this._upload(c, "opaque", m.opaque);
    this._upload(c, "alpha", m.alpha);
    if (!c.opaque && !c.alpha) { this.chunks.delete(key); }
  }

  _upload(c, name, mesh) {
    const gl = this.gl;
    let s = c[name];
    if (!mesh.count) {
      if (s) { gl.deleteVertexArray(s.vao); gl.deleteBuffer(s.vbo); gl.deleteBuffer(s.ibo); c[name] = null; }
      return;
    }
    if (!s) {
      s = { vao: gl.createVertexArray(), vbo: gl.createBuffer(), ibo: gl.createBuffer(), count: 0, indexType: gl.UNSIGNED_SHORT };
      c[name] = s;
      gl.bindVertexArray(s.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, s.vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.ibo);
      // x,y,z | n | u,v | layer | ao — all unsigned bytes, read as plain floats.
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.UNSIGNED_BYTE, false, STRIDE, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.UNSIGNED_BYTE, false, STRIDE, 3);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.UNSIGNED_BYTE, false, STRIDE, 4);
      gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.UNSIGNED_BYTE, false, STRIDE, 6);
      gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, false, STRIDE, 7);
    } else {
      gl.bindVertexArray(s.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, s.vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.ibo);
    }
    gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    s.count = mesh.count;
    s.indexType = mesh.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.bindVertexArray(null);
  }

  _freeChunk(c) {
    const gl = this.gl;
    for (const name of ["opaque", "alpha"]) {
      const s = c[name];
      if (!s) continue;
      gl.deleteVertexArray(s.vao); gl.deleteBuffer(s.vbo); gl.deleteBuffer(s.ibo);
      c[name] = null;
    }
  }

  // ── Frame ────────────────────────────────────────────────────────────────

  /**
   * @param {{x,y,z,yaw,pitch,fovDeg}} cam eye position and look
   * @param {import("../../world/world.js").World} world
   * @param {Array<{x,y,z,w,h,image,key,alpha?,tint?,flipX?}>} sprites feet-anchored billboards
   * @param {Array<{x,y,z,color,radius,intensity}>} lights
   * @param {{style,act?,fx?,segments?}} opts `fx` are additive
   *   billboards (particles) and `segments` world-space streaks (tracers),
   *   both drawn with the sprite program after the solid billboards
   * @returns {boolean} false when the GL context is lost
   */
  render(cam, world, sprites, lights, opts) {
    if (this.lost || this.destroyed) return false;
    const t0 = performance.now();
    const gl = this.gl;
    if (world !== this.world) this.setWorld(world);
    this.setStyle(opts.style, opts.act || 1);
    const camChunk = [Math.floor(cam.x) >> 4, Math.floor(cam.y) >> 4, Math.floor(cam.z) >> 4];
    this.stats.meshedThisFrame = this._meshDirty(camChunk);

    const aspect = this.width / this.height;
    const fovY = 2 * Math.atan(Math.tan(((cam.fovDeg || 70) * Math.PI) / 180 / 2) / aspect);
    perspective(this.proj, fovY, aspect, NEAR, FAR);
    lookAt(this.view, [cam.x, cam.y, cam.z], cam.yaw, cam.pitch);
    mul4(this.viewProj, this.proj, this.view);
    this._extractPlanes(this.viewProj);

    const styleId = STYLE_ID[this.style] ?? 1;
    const maxDist = VOXEL_DRAW_DISTANCE;

    // ── Scene pass ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    // The sky is the far fog colour; its normal id sits outside the 0..5 face
    // range so comic ink outlines the horizon.
    gl.clearBufferfv(gl.COLOR, 0, [this.fog.far[0], this.fog.far[1], this.fog.far[2], 1]);
    gl.clearBufferfv(gl.COLOR, 1, [1, 0, 0, 1]);   // depth is stored as dist/FAR
    gl.clearBufferfi(gl.DEPTH_STENCIL, 0, 1, 0);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW);
    gl.disable(gl.BLEND);

    gl.useProgram(this.chunkProg);
    const u = this.u.chunk;
    gl.uniformMatrix4fv(u.u_viewProj, false, this.viewProj);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.atlasTex);
    gl.uniform1i(u.u_atlas, 0);
    gl.uniform3f(u.u_cam, cam.x, cam.y, cam.z);
    gl.uniform3fv(u.u_fogNear, this.fog.near);
    gl.uniform3fv(u.u_fogFar, this.fog.far);
    gl.uniform1f(u.u_fogDensity, this.fog.density);
    gl.uniform1f(u.u_fogMax, this.fog.max);
    gl.uniform3fv(u.u_ambient, AMBIENT[this.style] || AMBIENT.comic);
    gl.uniform3fv(u.u_emissiveByLayer, this.emissiveByLayer);
    gl.uniform1fv(u.u_layerAlpha, this.layerAlpha);
    gl.uniform1f(u.u_alphaPass, 0);
    this._setLights(lights);

    this.stats.chunksDrawn = 0;
    for (const c of this.chunks.values()) {
      if (!c.opaque || !this._visible(c.origin, cam, maxDist)) continue;
      gl.uniform3fv(u.u_origin, c.origin);
      gl.bindVertexArray(c.opaque.vao);
      gl.drawElements(gl.TRIANGLES, c.opaque.count, c.opaque.indexType, 0);
      this.stats.chunksDrawn++;
    }

    this._drawSprites(sprites, cam);
    // Sparks and smoke are light, not surfaces: they add to what is behind
    // them and leave the scene's depth alone, so the ink pass keeps outlining
    // the world rather than drawing a box around every mote.
    this._drawSprites(opts.fx, cam, true);
    this._drawSegments(opts.segments, cam);

    // Glass and other see-through faces last, over everything solid. They keep
    // the linear depth of what is behind them, so the ink pass outlines that
    // rather than the pane.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.enable(gl.CULL_FACE);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);
    gl.useProgram(this.chunkProg);
    gl.uniform1f(u.u_alphaPass, 1);
    // Back to front: they do not write depth, so a near pane drawn first would
    // be overwritten by a far one, and opaque faces in this bucket (doors) would
    // not cover the glass behind them.
    for (const c of this._sortedAlphaChunks(cam, maxDist)) {
      gl.uniform3fv(u.u_origin, c.origin);
      gl.bindVertexArray(c.alpha.vao);
      gl.drawElements(gl.TRIANGLES, c.alpha.count, c.alpha.indexType, 0);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);

    // ── Post pass to the canvas ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(this.postProg);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.colorTex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.linearDepthTex);
    gl.uniform1i(this.u.post.u_color, 0);
    gl.uniform1i(this.u.post.u_depth, 1);
    gl.uniform2f(this.u.post.u_texel, 1 / this.width, 1 / this.height);
    gl.uniform1i(this.u.post.u_style, styleId);
    gl.uniform1f(this.u.post.u_inkWidth, Math.max(1, this.height / 720));
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    // Leave no scene target sampled: both are colour attachments again next frame.
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);

    this.sprites.evict();
    this.stats.ms = performance.now() - t0;
    return true;
  }

  _setLights(lights) {
    const u = this.u.chunk;
    const list = lights || [];
    const n = Math.min(list.length, MAX_LIGHTS);
    for (let i = 0; i < n; i++) {
      const l = list[i];
      this.lightData[i * 4] = l.x; this.lightData[i * 4 + 1] = l.y;
      this.lightData[i * 4 + 2] = l.z ?? 0; this.lightData[i * 4 + 3] = Math.max(0.001, l.radius || 0);
      const k = (l.intensity ?? 1) / 255;
      const c = l.color || [255, 255, 255];
      this.lightColors[i * 3] = c[0] * k; this.lightColors[i * 3 + 1] = c[1] * k; this.lightColors[i * 3 + 2] = c[2] * k;
    }
    this.gl.uniform1i(u.u_numLights, n);
    this.gl.uniform4fv(u.u_lights, this.lightData);
    this.gl.uniform3fv(u.u_lightColors, this.lightColors);
  }

  /** Gribb/Hartmann planes from the column-major viewProj, normalised. */
  _extractPlanes(m) {
    const p = this.planes;
    for (let i = 0; i < 6; i++) {
      const sign = i % 2 === 0 ? 1 : -1;   // 0/2/4 = +row, 1/3/5 = -row
      const row = i >> 1;                   // 0 = x (left/right), 1 = y, 2 = z (near/far)
      const a = m[3] + sign * m[row];
      const b = m[7] + sign * m[4 + row];
      const c = m[11] + sign * m[8 + row];
      const d = m[15] + sign * m[12 + row];
      const len = Math.hypot(a, b, c) || 1;
      p[i * 4] = a / len; p[i * 4 + 1] = b / len; p[i * 4 + 2] = c / len; p[i * 4 + 3] = d / len;
    }
  }

  _visible(origin, cam, maxDist) {
    if (!chunkInDistance(origin, cam.x, cam.y, cam.z, maxDist)) return false;
    const cx = origin[0] + CS / 2, cy = origin[1] + CS / 2, cz = origin[2] + CS / 2;
    const p = this.planes;
    for (let i = 0; i < 6; i++) {
      if (p[i * 4] * cx + p[i * 4 + 1] * cy + p[i * 4 + 2] * cz + p[i * 4 + 3] < -CHUNK_RADIUS) return false;
    }
    return true;
  }

  /** Visible see-through chunks, farthest first. Reuses one array and one field per chunk. */
  _sortedAlphaChunks(cam, maxDist) {
    const out = this._alphaOrder;
    out.length = 0;
    for (const c of this.chunks.values()) {
      if (!c.alpha || !this._visible(c.origin, cam, maxDist)) continue;
      const dx = c.origin[0] + CS / 2 - cam.x, dy = c.origin[1] + CS / 2 - cam.y, dz = c.origin[2] + CS / 2 - cam.z;
      c.dist = dx * dx + dy * dy + dz * dz;
      out.push(c);
    }
    out.sort((a, b) => b.dist - a.dist);
    return out;
  }

  /** @param {boolean} [additive] draw as light: no depth write, no ink outline */
  _drawSprites(list, cam, additive = false) {
    if (!list || !list.length) return;
    const gl = this.gl;
    const order = [];
    for (const s of list) {
      const dx = s.x - cam.x, dy = s.y - cam.y, dz = s.z - cam.z;
      order.push({ s, d: dx * dx + dy * dy + dz * dz });
    }
    order.sort((a, b) => b.d - a.d);   // back to front
    // Horizontal camera right, so the billboard faces the eye and stays upright.
    const rx = Math.sin(cam.yaw), ry = -Math.cos(cam.yaw);

    gl.useProgram(this.spriteProg);
    const u = this.u.sprite;
    gl.uniformMatrix4fv(u.u_viewProj, false, this.viewProj);
    gl.uniform3f(u.u_right, rx, ry, 0);
    gl.uniform3f(u.u_up, 0, 0, 1);   // billboards stand upright in the world
    gl.uniform1i(u.u_tex, 0);
    gl.uniform3fv(u.u_fogColor, this.fog.near);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(this.spriteVao);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    // Straight alpha for the colour, but attachment 1 (linear depth) must be
    // replaced outright, and it writes alpha 1 — so both get the right result.
    gl.blendFunc(gl.SRC_ALPHA, additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(!additive);
    if (additive) gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);

    for (const { s, d } of order) {
      const entry = this.sprites.get(s.key, s.image);
      if (!entry) continue;
      const dist = Math.sqrt(d);
      const fog = Math.min(this.fog.max, this.fog.max * (1 - Math.exp(-dist * this.fog.density)));
      gl.bindTexture(gl.TEXTURE_2D, entry.tex);
      gl.uniform3f(u.u_pos, s.x, s.y, s.z);
      gl.uniform2f(u.u_size, s.w, s.h);
      gl.uniform2f(u.u_uvFlip, s.flipX ? 1 : 0, 0);
      gl.uniform1f(u.u_alpha, s.alpha ?? 1);
      const t = s.tint || [1, 1, 1];
      gl.uniform3f(u.u_tint, t[0], t[1], t[2]);
      gl.uniform1f(u.u_fog, fog);
      gl.uniform1f(u.u_depth, dist);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    if (additive) {
      gl.depthMask(true);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    }
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.bindVertexArray(null);
  }

  /**
   * World-space streaks — bullet tracers — as thin quads turned to face the
   * eye. The sprite program draws them: `u_right` runs along the segment and
   * `u_up` across it, so the ribbon is widest where the camera can see it and
   * the same texture, tint and fog apply as to any billboard.
   *
   * @param {Array<{x1,y1,z1,x2,y2,z2,image,key,width?,alpha?,tint?}>} list
   */
  _drawSegments(list, cam) {
    if (!list || !list.length) return;
    const gl = this.gl;
    gl.useProgram(this.spriteProg);
    const u = this.u.sprite;
    gl.uniformMatrix4fv(u.u_viewProj, false, this.viewProj);
    gl.uniform1i(u.u_tex, 0);
    gl.uniform2f(u.u_uvFlip, 0, 0);
    gl.uniform3fv(u.u_fogColor, this.fog.near);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(this.spriteVao);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    // Additive: a tracer is light, and two crossing streaks brighten rather
    // than punch a hole in each other.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);

    for (const s of list) {
      const entry = this.sprites.get(s.key, s.image);
      if (!entry) continue;
      let ax = s.x2 - s.x1, ay = s.y2 - s.y1, az = s.z2 - s.z1;
      const len = Math.hypot(ax, ay, az);
      if (len < 1e-4) continue;
      ax /= len; ay /= len; az /= len;
      const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2, mz = (s.z1 + s.z2) / 2;
      const ex = mx - cam.x, ey = my - cam.y, ez = mz - cam.z;
      // Across the segment and across the line of sight: the widest face the
      // eye can be shown. A shot fired straight down the view axis has no such
      // face, and `len` guards the degenerate cross product.
      let ux = ay * ez - az * ey, uy = az * ex - ax * ez, uz = ax * ey - ay * ex;
      const ul = Math.hypot(ux, uy, uz);
      if (ul < 1e-4) continue;
      ux /= ul; uy /= ul; uz /= ul;
      const width = s.width || 0.05;
      const dist = Math.hypot(ex, ey, ez);
      const fog = Math.min(this.fog.max, this.fog.max * (1 - Math.exp(-dist * this.fog.density)));
      gl.bindTexture(gl.TEXTURE_2D, entry.tex);
      // a_corner.y runs 0..1, so the ribbon grows off one edge: start half a
      // width back and it straddles the shot line.
      gl.uniform3f(u.u_pos, mx - ux * width / 2, my - uy * width / 2, mz - uz * width / 2);
      gl.uniform3f(u.u_right, ax, ay, az);
      gl.uniform3f(u.u_up, ux, uy, uz);
      gl.uniform2f(u.u_size, len, width);
      gl.uniform1f(u.u_alpha, s.alpha ?? 1);
      const t = s.tint || [1, 1, 1];
      gl.uniform3f(u.u_tint, t[0], t[1], t[2]);
      gl.uniform1f(u.u_fog, fog);
      gl.uniform1f(u.u_depth, dist);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindVertexArray(null);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this._onContextRestored);
    const gl = this.gl;
    for (const c of this.chunks.values()) this._freeChunk(c);
    this.chunks.clear();
    this._alphaOrder.length = 0;
    this._freeFBO();
    if (this.atlasTex) { gl.deleteTexture(this.atlasTex); this.atlasTex = null; }
    if (this.sprites) this.sprites.destroy();
    for (const vao of [this.quadVao, this.spriteVao]) if (vao) gl.deleteVertexArray(vao);
    for (const vbo of [this.quadVbo, this.spriteVbo]) if (vbo) gl.deleteBuffer(vbo);
    for (const p of [this.chunkProg, this.spriteProg, this.postProg]) if (p) gl.deleteProgram(p);
    this.quadVao = this.spriteVao = this.quadVbo = this.spriteVbo = null;
    this.chunkProg = this.spriteProg = this.postProg = null;
    this.world = null;
  }
}
