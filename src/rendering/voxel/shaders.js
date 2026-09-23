/**
 * GLSL ES 3.00 shader sources for the voxel Forge WebGL2 renderer (Task 7):
 * chunk mesh (opaque + AO + point lights + fog + emissive-by-layer), billboard
 * sprites, and the per-art-style post pass (legacy passthrough, comic ink
 * outline via depth/normal-id Sobel, modern ACES + vignette).
 *
 * `#version 300 es` must be the very first characters of each string (no
 * leading newline) or WebGL2 rejects the shader, so every template literal
 * below opens directly on that line.
 *
 * Every position the GPU sees is relative to the whole block the eye is in:
 * the renderer subtracts it from chunk origins, lights and sprites in doubles
 * before narrowing them to float32, and `u_eye` is the eye's fraction of a
 * block. World coordinates run to a million blocks, where a float32 step is a
 * sixteenth of a block; anchored ones stay small, so nothing shimmers or
 * cracks far from spawn. Fog and lighting only ever use distances, which the
 * shift leaves alone.
 */
import { WATER_SURFACE } from "../../world/blocks.js";

/**
 * The water ripple layers' scales, in cycles per block. `RIPPLE_PERIOD` blocks
 * is a whole number of cycles of both, so the renderer can hand the water pass
 * the camera position modulo it (`u_wrap`) and the ripples keep their place in
 * the world at any distance from spawn.
 */
export const RIPPLE_SCALES = [0.21, 0.29];
export const RIPPLE_PERIOD = 100;
/** Blocks over which the edge of the drawn disc fades to full fog. */
export const FOG_FADE = 16;

export const CHUNK_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;      // local block coords (uint8 → float)
layout(location=1) in float a_normal;  // 0..5
layout(location=2) in vec2 a_uv;       // block units
layout(location=3) in float a_layer;
layout(location=4) in float a_ao;      // 0..3
uniform mat4 u_viewProj;
uniform vec3 u_origin;                 // chunk origin relative to the eye's block, in blocks
// A vessel model is a chunk mesh drawn turned and scaled about its keel:
// u_model rotates and scales it about u_pivot (model cells), and u_uvScale
// keeps its texture as dense as the world's. Chunks draw with the identity.
uniform mat3 u_model; uniform vec3 u_pivot; uniform float u_uvScale;
out vec2 v_uv; out float v_layer; out float v_ao; out float v_normal; out vec3 v_rel;
void main() {
  vec3 p = u_model * (a_pos - u_pivot) + u_origin;
  int n = int(a_normal + 0.5);
  // The mesher runs its u along +z on the ±y faces (its axis basis picks u×v =
  // +axis), so swap there to keep the texture's v the vertical one. The atlas
  // itself is uploaded flipped, so v then grows up the wall as the art expects.
  vec2 uv = (n == 2 || n == 3) ? a_uv.yx : a_uv;
  v_rel = p; v_uv = uv * u_uvScale; v_layer = a_layer; v_ao = a_ao / 3.0; v_normal = a_normal;
  gl_Position = u_viewProj * vec4(p, 1.0);
}`;

export const CHUNK_FRAG = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec2 v_uv; in float v_layer; in float v_ao; in float v_normal; in vec3 v_rel;
uniform sampler2DArray u_atlas;
uniform vec3 u_eye;                    // the eye, relative to its own block (0..1 on each axis)
uniform vec3 u_fogNear; uniform vec3 u_fogFar; uniform float u_fogDensity; uniform float u_fogMax;
uniform float u_fogEnd;                // horizontal distance of full fog: the edge of the drawn disc
uniform vec3 u_ambient;
uniform int u_numLights; uniform vec4 u_lights[16]; uniform vec3 u_lightColors[16]; // lights eye-relative too
uniform vec3 u_emissiveByLayer[32];
uniform float u_layerAlpha[32];        // per-layer opacity; 1.0 for everything but glass
uniform float u_alphaPass;             // 1.0 while the see-through faces are drawn
layout(location=0) out vec4 o_color;   // rgb colour, a = normal id / 8 (for the ink pass)
layout(location=1) out vec4 o_depth;   // linear depth / DEPTH_RANGE in r (for the ink pass)
const float DEPTH_RANGE = 256.0;       // matches the far plane; keeps the RGBA8 fallback in 0..1
const float FOG_FADE = ${FOG_FADE.toFixed(1)};
const float FACE_SHADE[6] = float[6](0.82, 0.72, 0.9, 0.66, 1.0, 0.5);
void main() {
  vec4 t = texture(u_atlas, vec3(v_uv, v_layer));
  int layer = int(v_layer + 0.5);
  // Opaque faces are a cutout; see-through faces carry their layer's opacity.
  float alpha = u_alphaPass > 0.5 ? t.a * u_layerAlpha[layer] : 1.0;
  if (t.a < 0.5 || alpha < 0.02) discard;
  int n = int(v_normal + 0.5);
  float ao = mix(0.45, 1.0, v_ao);
  vec3 lit = u_ambient * FACE_SHADE[n] * ao;
  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec3 d = u_lights[i].xyz - v_rel; float dist = length(d); float r = u_lights[i].w;
    if (dist >= r) continue;
    float x = dist / r; float win = 1.0 - x * x; win *= win;
    lit += u_lightColors[i] * win / (1.0 + 4.0 * dist * dist / (r * r)) * ao;
  }
  vec3 emis = u_emissiveByLayer[layer];
  vec3 col = t.rgb * lit + emis * t.rgb * 1.6;
  vec3 toEye = v_rel - u_eye;
  float dcam = length(toEye);
  float fog = u_fogMax * (1.0 - exp(-dcam * u_fogDensity));
  vec3 fogC = mix(u_fogNear, u_fogFar, clamp(fog / max(u_fogMax, 1e-3), 0.0, 1.0));
  col = mix(col, fogC, fog);
  // The last FOG_FADE blocks before the edge of the loaded world fade all the
  // way to the sky, so columns arrive out of haze instead of popping in.
  col = mix(col, u_fogFar, smoothstep(u_fogEnd - FOG_FADE, u_fogEnd, length(toEye.xy)));
  // Opaque pass: alpha carries the face id so the ink pass can find silhouettes.
  // Alpha pass: it is the blend weight, and COLOR_ATTACHMENT1 is masked off so
  // the linear depth stays that of whatever sits behind the glass.
  o_color = vec4(col, u_alphaPass > 0.5 ? alpha : float(n) / 8.0);
  o_depth = vec4(dcam / DEPTH_RANGE, 0.0, 0.0, 1.0);
}`;

/**
 * Water, drawn by the renderer in three modes over the same small meshes:
 * 1 writes depth and the surface distance (so only the nearest surface of a
 * pool is coloured, once), 2 blends the colour, 3 stamps water's own face id
 * into the colour alpha so the ink pass outlines the shore and not the bed
 * seen through it. Same program in every mode, so the depths match exactly.
 *
 * The mesher flags open-surface corners in the AO byte; they drop to
 * WATER_SURFACE, the height physics and the underwater test also read.
 */
export const WATER_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
layout(location=1) in float a_normal;
layout(location=2) in vec2 a_uv;
layout(location=3) in float a_layer;
layout(location=4) in float a_ao;      // 1 on an open-surface corner
uniform mat4 u_viewProj;
uniform vec3 u_origin;                 // relative to the eye's block, as for chunks
out vec3 v_rel; out float v_layer; out float v_normal;
const float SURFACE_DROP = ${(1 - WATER_SURFACE).toFixed(4)};
void main() {
  vec3 p = a_pos + u_origin;
  if (a_ao > 0.5) p.z -= SURFACE_DROP;
  v_rel = p; v_layer = a_layer; v_normal = a_normal;
  gl_Position = u_viewProj * vec4(p, 1.0);
}`;

export const WATER_FRAG = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec3 v_rel; in float v_layer; in float v_normal;
uniform sampler2DArray u_atlas;
uniform sampler2D u_sceneDepth;        // linear depth of what lies behind the water
uniform vec3 u_eye;                    // as in CHUNK_FRAG
uniform vec3 u_wrap;                   // the eye's block, x and y modulo RIPPLE_PERIOD: world phase for the ripples
uniform vec3 u_fogNear; uniform vec3 u_fogFar; uniform float u_fogDensity; uniform float u_fogMax;
uniform float u_fogEnd;
uniform vec3 u_ambient;
uniform float u_time;
uniform int u_mode;                    // 1 depth, 2 colour, 3 face id
layout(location=0) out vec4 o_color;
layout(location=1) out vec4 o_depth;
const float DEPTH_RANGE = 256.0;       // same encoding as CHUNK_FRAG
const float FOG_FADE = ${FOG_FADE.toFixed(1)};
const float WATER_ID = 0.75;           // face ids 0..5 are n / 8; the sky is 1
const vec3 SHALLOW = vec3(0.30, 0.76, 0.80);
const vec3 DEEP = vec3(0.04, 0.20, 0.38);
const vec3 CREST = vec3(0.86, 0.97, 1.0);
const vec3 SKY = vec3(0.52, 0.72, 0.84); // what a grazing surface mirrors, blended with the fog
const vec3 N6[6] = vec3[6](vec3(1,0,0), vec3(-1,0,0), vec3(0,1,0), vec3(0,-1,0), vec3(0,0,1), vec3(0,0,-1));
// The ripple layer is painted with its field in red: 40 + 170 f.
float ripple(vec2 q) { return clamp((texture(u_atlas, vec3(q, v_layer)).r - 0.157) / 0.667, 0.0, 1.0); }
void main() {
  vec3 toEye = v_rel - u_eye;
  float dcam = length(toEye);
  if (u_mode == 1) { o_color = vec4(0.0); o_depth = vec4(dcam / DEPTH_RANGE, 0.0, 0.0, 1.0); return; }
  if (u_mode == 3) { o_color = vec4(0.0, 0.0, 0.0, WATER_ID); o_depth = vec4(0.0); return; }
  int n = int(v_normal + 0.5);
  // Top and bottom faces ripple in plan; sides run the same field up the wall.
  vec3 wp = v_rel + u_wrap;
  vec2 q = n >= 4 ? wp.xy : vec2(wp.x + wp.y, wp.z);
  float r1 = ripple(q * ${RIPPLE_SCALES[0]} + vec2(0.031, 0.019) * u_time);
  float r2 = ripple(q.yx * ${RIPPLE_SCALES[1]} + vec2(-0.023, 0.036) * u_time);
  float rip = 0.5 * (r1 + r2);
  // Where the two layers crest together: a thin hard-edged line, drawn like
  // the wave marks in a comic panel rather than a soft specular.
  float sum = r1 + r2;
  float crest = step(1.34, sum) * (1.0 - step(1.47, sum));
  vec3 col; float alpha;
  if (gl_FrontFacing) {
    vec3 view = normalize(-toEye);
    float facing = abs(dot(view, N6[n]));
    float behind = texelFetch(u_sceneDepth, ivec2(gl_FragCoord.xy), 0).r * DEPTH_RANGE;
    float thick = max(0.0, behind - dcam);
    float deep = 1.0 - exp(-thick * 0.5);
    // Broad light and dark swells over the depth tint.
    col = mix(SHALLOW, DEEP, deep) * (0.76 + 0.52 * rip);
    alpha = mix(0.45, 0.92, deep) + (rip - 0.5) * 0.14;
    // Grazing angles mirror the sky: lighter, and nearly opaque.
    float fres = pow(1.0 - facing, 3.0);
    col = mix(col, mix(u_fogFar, SKY, 0.6), fres * 0.6);
    alpha = mix(alpha, 0.96, fres);
    // Foam where the surface meets a bank: the water in front of it thins out.
    float foam = n == 4 ? 1.0 - smoothstep(0.03, 0.28, thick) : 0.0;
    col = mix(col, CREST, max(crest * 0.7, foam * 0.85));
    alpha = max(alpha, max(crest * 0.75, foam * 0.9));
    col *= mix(vec3(1.0), u_ambient, 0.6) * (n == 4 ? 1.0 : 0.82);
  } else {
    // The underside of the surface, seen from below: a bright wavering ceiling.
    col = mix(vec3(0.16, 0.50, 0.58), vec3(0.62, 0.90, 0.95), rip);
    col = mix(col, CREST, crest * 0.6);
    alpha = 0.62;
  }
  float fog = u_fogMax * (1.0 - exp(-dcam * u_fogDensity));
  vec3 fogC = mix(u_fogNear, u_fogFar, clamp(fog / max(u_fogMax, 1e-3), 0.0, 1.0));
  col = mix(col, fogC, fog);
  o_color = vec4(mix(col, u_fogFar, smoothstep(u_fogEnd - FOG_FADE, u_fogEnd, length(toEye.xy))), alpha);
  o_depth = vec4(0.0);
}`;

export const SPRITE_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_corner;   // -0.5..0.5, 0..1
uniform mat4 u_viewProj; uniform vec3 u_pos; uniform vec3 u_right; uniform vec3 u_up; uniform vec2 u_size; uniform vec2 u_uvFlip;
out vec2 v_uv;
// u_right/u_up span the quad: a billboard stands on world up, a tracer lies
// along the shot with its width turned to face the eye.
void main() {
  vec3 p = u_pos + u_right * (a_corner.x * u_size.x) + u_up * (a_corner.y * u_size.y);
  v_uv = vec2(a_corner.x + 0.5, 1.0 - a_corner.y);
  if (u_uvFlip.x > 0.5) v_uv.x = 1.0 - v_uv.x;
  gl_Position = u_viewProj * vec4(p, 1.0);
}`;

export const SPRITE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; uniform sampler2D u_tex; uniform float u_alpha; uniform vec3 u_tint; uniform float u_fog; uniform vec3 u_fogColor; uniform float u_depth;
layout(location=0) out vec4 o_color; layout(location=1) out vec4 o_depth;
const float DEPTH_RANGE = 256.0;       // same encoding as CHUNK_FRAG
void main() {
  vec4 t = texture(u_tex, v_uv); if (t.a < 0.08) discard;
  o_color = vec4(mix(t.rgb * u_tint, u_fogColor, u_fog), t.a * u_alpha);
  o_depth = vec4(u_depth / DEPTH_RANGE, 0.0, 0.0, 1.0);
}`;

export const POST_VERT = `#version 300 es
precision highp float; layout(location=0) in vec2 a_pos; out vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

export const POST_FRAG = `#version 300 es
precision highp float; in vec2 v_uv;
uniform sampler2D u_color; uniform sampler2D u_depth; uniform vec2 u_texel; uniform int u_style; uniform float u_inkWidth;
uniform float u_underwater; uniform float u_time;
uniform float u_fogEnd;                // the ink fades out with the terrain at the edge of the drawn disc
out vec4 o;
const float DEPTH_RANGE = 256.0;       // the scene pass stores distance / DEPTH_RANGE
const float FOG_FADE = ${FOG_FADE.toFixed(1)};
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  // Under water the whole frame wavers a little, as if seen through moving water.
  vec2 uv = v_uv;
  if (u_underwater > 0.5) uv += vec2(sin(v_uv.y * 37.0 + u_time * 2.1), cos(v_uv.x * 29.0 + u_time * 1.7)) * 0.0022;
  vec4 c = texture(u_color, uv);
  vec3 col = c.rgb;
  if (u_style == 1) {
    // Ink where depth or face id changes: Sobel over the depth buffer and the normal id in alpha.
    float d0 = texture(u_depth, uv).r * DEPTH_RANGE;
    float e = 0.0, dmin = d0;
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
      vec2 o2 = vec2(float(i), float(j)) * u_texel * u_inkWidth;
      float d = texture(u_depth, uv + o2).r * DEPTH_RANGE; float n = texture(u_color, uv + o2).a;
      e += step(0.06 * d0 + 0.05, abs(d - d0)) + step(0.01, abs(n - c.a));
      dmin = min(dmin, d);
    }
    // A silhouette is as far away as its nearest side: past the fog edge the
    // hills are sky-coloured, and an outline would draw them back in.
    float ink = clamp(e / 4.0, 0.0, 1.0) * 0.85 * (1.0 - smoothstep(u_fogEnd - FOG_FADE, u_fogEnd, dmin));
    col = mix(col, vec3(0.04, 0.05, 0.07), ink);
  } else if (u_style == 2) {
    vec3 lin = pow(col, vec3(2.2)) * 1.65;
    vec3 t = aces(lin);
    float l = dot(t, vec3(0.2126, 0.7152, 0.0722));
    t = mix(vec3(l), t, 0.8);
    t += (vec3(0.02, 0.0, -0.02) * (1.0 - l) + vec3(0.02, 0.015, 0.0) * l);
    float r = length(v_uv - 0.5); t *= 1.0 - smoothstep(0.55, 0.95, r) * 0.35;
    col = pow(t, vec3(1.0 / 2.2));
  }
  if (u_underwater > 0.5) {
    col = mix(col, col * vec3(0.55, 0.86, 0.96) + vec3(0.0, 0.035, 0.06), 0.65);
    float r = length(v_uv - 0.5); col *= 1.0 - smoothstep(0.35, 0.85, r) * 0.45;
  }
  o = vec4(col, 1.0);
}`;
