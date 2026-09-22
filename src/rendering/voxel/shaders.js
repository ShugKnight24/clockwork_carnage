/**
 * GLSL ES 3.00 shader sources for the voxel Forge WebGL2 renderer (Task 7):
 * chunk mesh (opaque + AO + point lights + fog + emissive-by-layer), billboard
 * sprites, and the per-art-style post pass (legacy passthrough, comic ink
 * outline via depth/normal-id Sobel, modern ACES + vignette).
 *
 * `#version 300 es` must be the very first characters of each string (no
 * leading newline) or WebGL2 rejects the shader, so every template literal
 * below opens directly on that line.
 */
export const CHUNK_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;      // local block coords (uint8 → float)
layout(location=1) in float a_normal;  // 0..5
layout(location=2) in vec2 a_uv;       // block units
layout(location=3) in float a_layer;
layout(location=4) in float a_ao;      // 0..3
uniform mat4 u_viewProj;
uniform vec3 u_origin;                 // chunk origin in world blocks
out vec2 v_uv; out float v_layer; out float v_ao; out float v_normal; out vec3 v_world;
void main() {
  vec3 p = a_pos + u_origin;
  int n = int(a_normal + 0.5);
  // The mesher runs its u along +z on the ±y faces (its axis basis picks u×v =
  // +axis), so swap there to keep the texture's v the vertical one. The atlas
  // itself is uploaded flipped, so v then grows up the wall as the art expects.
  vec2 uv = (n == 2 || n == 3) ? a_uv.yx : a_uv;
  v_world = p; v_uv = uv; v_layer = a_layer; v_ao = a_ao / 3.0; v_normal = a_normal;
  gl_Position = u_viewProj * vec4(p, 1.0);
}`;

export const CHUNK_FRAG = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec2 v_uv; in float v_layer; in float v_ao; in float v_normal; in vec3 v_world;
uniform sampler2DArray u_atlas;
uniform vec3 u_cam;
uniform vec3 u_fogNear; uniform vec3 u_fogFar; uniform float u_fogDensity; uniform float u_fogMax;
uniform vec3 u_ambient;
uniform int u_numLights; uniform vec4 u_lights[16]; uniform vec3 u_lightColors[16];
uniform vec3 u_emissiveByLayer[32];
uniform float u_layerAlpha[32];        // per-layer opacity; 1.0 for everything but glass
uniform float u_alphaPass;             // 1.0 while the see-through faces are drawn
layout(location=0) out vec4 o_color;   // rgb colour, a = normal id / 8 (for the ink pass)
layout(location=1) out vec4 o_depth;   // linear depth / DEPTH_RANGE in r (for the ink pass)
const float DEPTH_RANGE = 256.0;       // matches the far plane; keeps the RGBA8 fallback in 0..1
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
    vec3 d = u_lights[i].xyz - v_world; float dist = length(d); float r = u_lights[i].w;
    if (dist >= r) continue;
    float x = dist / r; float win = 1.0 - x * x; win *= win;
    lit += u_lightColors[i] * win / (1.0 + 4.0 * dist * dist / (r * r)) * ao;
  }
  vec3 emis = u_emissiveByLayer[layer];
  vec3 col = t.rgb * lit + emis * t.rgb * 1.6;
  float dcam = distance(v_world, u_cam);
  float fog = u_fogMax * (1.0 - exp(-dcam * u_fogDensity));
  vec3 fogC = mix(u_fogNear, u_fogFar, clamp(fog / max(u_fogMax, 1e-3), 0.0, 1.0));
  col = mix(col, fogC, fog);
  // Opaque pass: alpha carries the face id so the ink pass can find silhouettes.
  // Alpha pass: it is the blend weight, and COLOR_ATTACHMENT1 is masked off so
  // the linear depth stays that of whatever sits behind the glass.
  o_color = vec4(col, u_alphaPass > 0.5 ? alpha : float(n) / 8.0);
  o_depth = vec4(dcam / DEPTH_RANGE, 0.0, 0.0, 1.0);
}`;

export const SPRITE_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_corner;   // -0.5..0.5, 0..1
uniform mat4 u_viewProj; uniform vec3 u_pos; uniform vec3 u_right; uniform vec2 u_size; uniform vec2 u_uvFlip;
out vec2 v_uv;
void main() {
  vec3 p = u_pos + u_right * (a_corner.x * u_size.x) + vec3(0.0, 0.0, a_corner.y * u_size.y);
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
out vec4 o;
const float DEPTH_RANGE = 256.0;       // the scene pass stores distance / DEPTH_RANGE
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec4 c = texture(u_color, v_uv);
  vec3 col = c.rgb;
  if (u_style == 1) {
    // Ink where depth or face id changes: Sobel over the depth buffer and the normal id in alpha.
    float d0 = texture(u_depth, v_uv).r * DEPTH_RANGE;
    float e = 0.0;
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
      vec2 o2 = vec2(float(i), float(j)) * u_texel * u_inkWidth;
      float d = texture(u_depth, v_uv + o2).r * DEPTH_RANGE; float n = texture(u_color, v_uv + o2).a;
      e += step(0.06 * d0 + 0.05, abs(d - d0)) + step(0.01, abs(n - c.a));
    }
    float ink = clamp(e / 4.0, 0.0, 1.0) * 0.85;
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
  o = vec4(col, 1.0);
}`;
