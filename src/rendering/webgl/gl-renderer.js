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

import { WallPass } from "./wall-pass.js";
import { isModernArt, isRealisticArt } from "../art-style.js";
import { CEILING_Z } from "../../systems/physics.js";

// The ceiling plane's height in wall units, as a GLSL literal.
const CEIL = CEILING_Z.toFixed(4);

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
uniform float u_eyeZ;          // eye height in wall units (0.5 standing)
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

  // The floor is eyeZ below the eye and the ceiling CEILING_Z - eyeZ above it, so a
  // crouch brings the floor in and pushes the ceiling away.
  float rowDist = (isFloor ? u_eyeZ : ${CEIL} - u_eyeZ) * 2.0 * projH / p;

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

// Modern art style: mipmapped 512px deck/ceiling art sampled with world
// coordinates (REPEAT wrap, so derivatives stay continuous across cells),
// contact AO + emissive wall spill from a per-cell map texture, act fog with
// atmospheric perspective, correctly coloured/radius point lights and a glossy
// light streak on the deck. All samples happen before any branch so the
// implicit derivatives stay valid.
const FLOOR_FRAG_MODERN = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_resolution;
uniform vec2 u_camPos;
uniform vec2 u_dir;
uniform vec2 u_plane;
uniform float u_yShift;
uniform float u_eyeZ;          // eye height in wall units (0.5 standing)
uniform sampler2D u_floorTex;
uniform sampler2D u_ceilTex;
uniform sampler2D u_envMap;    // RGBA8 per cell: R wall bits, G glow bits, B glow index, A deck
uniform ivec2 u_mapSize;
uniform vec3 u_fogNear;
uniform vec3 u_fogFar;
uniform float u_fogMax;
uniform float u_fogDensity;
uniform int u_numLights;
uniform vec4 u_lights[16];     // x, y, radius, intensity
uniform vec3 u_lightColors[16];
uniform vec3 u_glowColors[8];
uniform bool u_realistic;      // physically based lighting profile

out vec4 fragColor;

const float AO_R = 0.3;
const float AO_FLOOR = 0.36;
const float GLOW_R = 0.85;

float aoSide(float d) {
  float t = clamp(d / AO_R, 0.0, 1.0);
  return AO_FLOOR + (1.0 - AO_FLOOR) * t * t * (3.0 - 2.0 * t);
}
float glowSide(float d) {
  float t = 1.0 - clamp(d / GLOW_R, 0.0, 1.0);
  return t * t;
}

// A room's own deck (map.decks, the envMap's A byte: the floor's kind in the
// low four bits, the ceiling's in the high four, which a 0 leaves the floor's):
// drawn here instead of the act's art. 1: polished marble laid on the
// diagonal under a skylight's glazing grid; 2: oak boards under a coffered
// plaster ceiling. The station's rooms (src/data/levels/rooms/):
// floors 3 carpet tile, 4 vinyl tile, 5 sealed concrete, 6 rubber sport
// floor, 7 ceramic tile; ceilings 3 suspended acoustic tile, 4 open plant
// (beams, a duct, the pendant strips), 5 painted concrete, 6 the range's
// felt baffles. Every room ceiling has its lamps on the same checkerboard of
// cells (deckLamp), so the station's fixtures keep one spacing room to room
// and the floor's pools (deckPool) always sit under them. fw is the
// pixel's footprint in cells: lines widen and fine detail fades with it.

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
// 1 on a line w either side of the nearest multiple of period, antialiased.
float gridLine(float v, float period, float w, float fw) {
  float e = abs(fract(v / period + 0.5) - 0.5) * period;
  return 1.0 - smoothstep(w - fw, w + fw, e);
}
// 1 inside the box |q| < h (cells), antialiased.
float boxAA(vec2 q, vec2 h, float fw) {
  vec2 d = abs(q) - h;
  return 1.0 - smoothstep(-fw, fw, max(d.x, d.y));
}
// Whether a room ceiling has a lamp over cell c: every other cell.
bool deckLamp(vec2 c) {
  return mod(c.x + c.y, 2.0) < 0.5;
}
// The light a room ceiling's lamps pool on the floor at wp: soft, under each
// lit cell's fixture, falling off over about a cell. On the checkerboard,
// cos(pi x) cos(pi y) of the offset from a cell's middle is 1 under every lamp
// and -1 between them, so one product stands in for summing the lamps.
vec3 deckPool(vec2 wp, int ck) {
  vec2 u = (wp - 0.5) * 3.14159265;
  float k = 0.5 + 0.5 * cos(u.x) * cos(u.y);
  vec3 tint = ck == 4 || ck == 6 ? vec3(0.92, 0.96, 1.0) : vec3(1.0, 0.95, 0.86);
  return tint * (k * k);
}

vec3 deckFloor(vec2 wp, int kind, float fw) {
  float detail = 1.0 - smoothstep(0.004, 0.03, fw);
  if (kind == 3) {
    // Carpet tile, the pile turned a quarter on alternate tiles.
    vec2 t = floor(wp * 2.0);
    float alt = mod(t.x + t.y, 2.0);
    float pile = 0.5 + 0.5 * sin((alt > 0.5 ? wp.x : wp.y) * 160.0);
    vec3 c = vec3(0.19, 0.22, 0.29) * (0.93 + 0.09 * alt) + (pile - 0.5) * 0.03 * detail;
    c += (hash2(floor(wp * 90.0)) - 0.5) * 0.05 * detail;
    return mix(c, c * 0.72, gridLine(wp.x, 0.5, 0.004, fw) + gridLine(wp.y, 0.5, 0.004, fw));
  }
  if (kind == 4) {
    // Vinyl tile, each a shade off its neighbours, polished.
    vec2 t = floor(wp * 4.0);
    float tone = hash2(t);
    vec3 c = mix(vec3(0.40, 0.40, 0.38), vec3(0.46, 0.45, 0.42), tone);
    c += (hash2(floor(wp * 70.0)) - 0.5) * 0.04 * detail;
    float seam = max(gridLine(wp.x, 0.25, 0.003, fw), gridLine(wp.y, 0.25, 0.003, fw));
    return mix(c, vec3(0.22, 0.22, 0.21), seam * 0.7);
  }
  if (kind == 5) {
    // Sealed concrete, mottled, its saw cuts on the cell lines.
    float mott = 0.5 + 0.25 * sin(wp.x * 1.7 + sin(wp.y * 1.3) * 1.6) * sin(wp.y * 2.1 + 0.7) + 0.25 * sin(wp.x * 6.1 + wp.y * 4.3);
    vec3 c = mix(vec3(0.24, 0.25, 0.26), vec3(0.31, 0.32, 0.32), mott);
    c += (hash2(floor(wp * 60.0)) - 0.5) * 0.035 * detail;
    float cut = max(gridLine(wp.x, 2.0, 0.006, fw), gridLine(wp.y, 2.0, 0.006, fw));
    return mix(c, vec3(0.16, 0.16, 0.17), cut * 0.8);
  }
  if (kind == 6) {
    // Rubber sport floor, flecked, laid in rolls along x.
    vec3 c = vec3(0.13, 0.14, 0.16);
    float fleck = step(0.86, hash2(floor(wp * 80.0)));
    // The flecks average out to a lift far off, rather than glittering.
    c += mix(vec3(0.012), vec3(0.08, 0.085, 0.09) * fleck, detail * detail);
    return mix(c, vec3(0.06), gridLine(wp.y, 1.0, 0.004, fw) * 0.8);
  }
  if (kind == 7) {
    // Ceramic tile with grey grout, the wet room's.
    vec2 t = floor(wp * 8.0);
    vec3 c = mix(vec3(0.38, 0.41, 0.43), vec3(0.43, 0.46, 0.48), hash2(t));
    float grout = max(gridLine(wp.x, 0.125, 0.004, fw), gridLine(wp.y, 0.125, 0.004, fw));
    // Far off, the grout reads as the tile's average, not a moire.
    return mix(c, vec3(0.24, 0.26, 0.27), grout * mix(0.35, 0.8, detail));
  }
  if (kind == 1) {
    vec2 q = vec2(wp.x + wp.y, wp.x - wp.y) * 0.7071;
    vec2 fq = fract(q);
    float chk = mod(floor(q.x) + floor(q.y), 2.0);
    float vein = 0.035 * sin(wp.x * 5.3 + sin(wp.y * 2.7) * 2.5) * sin(wp.y * 3.9);
    vec3 c = mix(vec3(0.70, 0.66, 0.58), vec3(0.28, 0.33, 0.31), chk) + vein;
    float e = min(min(fq.x, 1.0 - fq.x), min(fq.y, 1.0 - fq.y));
    return mix(c, vec3(0.62, 0.50, 0.30), (1.0 - smoothstep(0.0, 0.025, e)) * 0.8);
  }
  float row = floor(wp.y * 5.0);
  float off = fract(row * 0.37);
  float plank = floor(wp.x * 1.25 + off);
  float tone = fract(sin(row * 12.9898 + plank * 78.233) * 43758.5453);
  vec3 c = mix(vec3(0.36, 0.22, 0.12), vec3(0.52, 0.34, 0.19), tone) + 0.025 * sin(wp.x * 55.0 + row * 3.0);
  float seam = max(1.0 - smoothstep(0.0, 0.06, fract(wp.y * 5.0)), 1.0 - smoothstep(0.0, 0.015, fract(wp.x * 1.25 + off)));
  return mix(c, vec3(0.10, 0.06, 0.04), seam * 0.6);
}
vec3 deckCeil(vec2 wp, int kind, float fw) {
  vec2 f = fract(wp);
  bool lamp = deckLamp(floor(wp));
  // Lamp faces: bright enough that Realistic keeps them unlit (see main).
  const vec3 LAMP = vec3(1.0, 0.97, 0.90);
  const vec3 COOL = vec3(0.92, 0.97, 1.0);
  if (kind == 3) {
    // Suspended acoustic tile on a quarter-cell grid, a square LED panel
    // filling the middle four tiles of each lit cell.
    vec3 c = vec3(0.44, 0.44, 0.42) + (hash2(floor(wp * 4.0)) - 0.5) * 0.025;
    c += (hash2(floor(wp * 64.0)) - 0.5) * 0.04 * (1.0 - smoothstep(0.004, 0.03, fw));
    float bar = max(gridLine(wp.x, 0.25, 0.006, fw), gridLine(wp.y, 0.25, 0.006, fw));
    c = mix(c, vec3(0.50, 0.50, 0.49), bar);
    if (lamp) {
      vec2 q = f - 0.5;
      c = mix(c, vec3(0.30, 0.30, 0.30), boxAA(q, vec2(0.25), fw));
      c = mix(c, LAMP, boxAA(q, vec2(0.225), fw));
    }
    return c;
  }
  if (kind == 4) {
    // Open plant: a dark ribbed deck, a beam on every cell line along x, a
    // duct down every other row, the pendant strips hung under them.
    vec3 c = vec3(0.15, 0.16, 0.18) * (0.85 + 0.3 * gridLine(wp.x, 0.125, 0.02, fw));
    float beam = gridLine(wp.y, 1.0, 0.045, fw);
    c = mix(c, vec3(0.30, 0.31, 0.33), beam);
    c = mix(c, vec3(0.08), gridLine(wp.y, 1.0, 0.008, fw) * beam);
    float dy = (fract(wp.y * 0.5) - 0.25) * 2.0; // distance from the duct's axis (cells)
    float duct = 1.0 - smoothstep(0.13 - fw, 0.13 + fw, abs(dy));
    vec3 galv = vec3(0.25, 0.26, 0.28) * (1.0 - 0.45 * pow(abs(dy) / 0.13, 2.0));
    galv *= 1.0 - 0.3 * gridLine(wp.x, 1.0, 0.01, fw);
    c = mix(c, galv, duct);
    if (lamp && duct < 0.5) {
      vec2 q = f - vec2(0.5, 0.62);
      c = mix(c, vec3(0.09), boxAA(q, vec2(0.36, 0.05), fw));
      c = mix(c, COOL, boxAA(q, vec2(0.34, 0.03), fw));
    }
    return c;
  }
  if (kind == 5) {
    // Painted concrete, a joint on every other cell line, a sealed round
    // bulkhead lamp in its cage over each lit cell.
    vec3 c = vec3(0.42, 0.43, 0.43) + 0.02 * sin(wp.x * 2.3 + sin(wp.y * 1.7) * 2.0);
    c = mix(c, vec3(0.26), max(gridLine(wp.x, 2.0, 0.006, fw), gridLine(wp.y, 2.0, 0.006, fw)) * 0.7);
    if (lamp) {
      float r = length(f - 0.5);
      c = mix(c, vec3(0.22), 1.0 - smoothstep(0.15 - fw, 0.15 + fw, r));
      c = mix(c, LAMP, 1.0 - smoothstep(0.12 - fw, 0.12 + fw, r));
      float cage = max(gridLine(f.x - 0.5, 1.0, 0.008, fw), gridLine(f.y - 0.5, 1.0, 0.008, fw));
      c = mix(c, vec3(0.2), cage * (1.0 - smoothstep(0.13, 0.15, r)));
    }
    return c;
  }
  if (kind == 6) {
    // The range: a black deck behind felt baffles hung across the lanes
    // every half cell, the flood strips running downrange between them.
    vec3 c = vec3(0.07, 0.075, 0.08);
    float bx = abs(fract(wp.x * 2.0) - 0.5) / 2.0; // from a baffle's middle (cells)
    float baffle = 1.0 - smoothstep(0.05 - fw, 0.05 + fw, bx);
    c = mix(c, vec3(0.17, 0.175, 0.19) * (1.0 - 3.0 * bx), baffle);
    if (lamp) {
      vec2 q = f - vec2(0.5, 0.5);
      c = mix(c, COOL, boxAA(q, vec2(0.16, 0.025), fw) * (1.0 - baffle));
    }
    return c;
  }
  if (kind == 1) {
    vec2 f = fract(wp);
    float bar = 1.0 - smoothstep(0.012, 0.03, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
    vec2 g4 = fract(wp * 0.25);
    float beam = 1.0 - smoothstep(0.012, 0.022, min(min(g4.x, 1.0 - g4.x), min(g4.y, 1.0 - g4.y)));
    // Morning sky through the panes, a cloud or two drifting in it.
    float cloud = smoothstep(0.55, 0.95, sin(wp.x * 0.41 + 1.3) * sin(wp.y * 0.29 + 0.4) * 0.5 + 0.5);
    vec3 sky = mix(vec3(0.50, 0.64, 0.82), vec3(0.70, 0.76, 0.84), cloud);
    return mix(sky, vec3(0.42, 0.33, 0.20), max(bar * 0.85, beam * 0.7));
  }
  float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  vec3 c = vec3(0.50, 0.47, 0.41) * (0.75 + 0.25 * smoothstep(0.02, 0.16, e));
  float disc = 1.0 - smoothstep(0.08, 0.11, length(f - 0.5));
  return mix(c, vec3(1.0, 0.94, 0.80), lamp ? disc : 0.0);
}

void main() {
  float w = u_resolution.x;
  float h = u_resolution.y;
  float halfH = floor(h * 0.5) + u_yShift;
  float projH = floor(h * 0.5);
  float screenY = h - 1.0 - gl_FragCoord.y;
  bool isFloor = screenY > halfH;
  float p = max(abs(screenY - halfH), 0.5);
  // Floor eyeZ below the eye, ceiling CEILING_Z - eyeZ above it (see FLOOR_FRAG).
  float rowDist = (isFloor ? u_eyeZ : ${CEIL} - u_eyeZ) * 2.0 * projH / p;

  float cameraX = (2.0 * gl_FragCoord.x / w) - 1.0;
  vec2 ray = u_dir + u_plane * cameraX;
  vec2 wp = u_camPos + rowDist * ray;

  vec3 floorC = texture(u_floorTex, wp).rgb;
  vec3 ceilC = texture(u_ceilTex, wp).rgb;
  vec3 color = isFloor ? floorC : ceilC;
  // The pixel's footprint in cells, for the room decks' antialiasing: taken
  // here, before any branch, like the texture samples.
  vec2 fwv = fwidth(wp);
  float fw = max(fwv.x, fwv.y);

  float ao = 1.0;
  vec3 glow = vec3(0.0);
  int deck = 0;
  ivec2 cell = ivec2(floor(wp));
  if (cell.x >= 0 && cell.y >= 0 && cell.x < u_mapSize.x && cell.y < u_mapSize.y) {
    vec4 m = texelFetch(u_envMap, cell, 0);
    deck = int(m.a * 255.0 + 0.5);
    int mask = int(m.r * 255.0 + 0.5);
    int gbits = int(m.g * 255.0 + 0.5);
    int gi = int(m.b * 255.0 + 0.5);
    vec2 f = wp - vec2(cell);
    if (mask != 0) {
      if ((mask & 1) != 0) ao = min(ao, aoSide(f.x));
      if ((mask & 2) != 0) ao = min(ao, aoSide(1.0 - f.x));
      if ((mask & 4) != 0) ao = min(ao, aoSide(f.y));
      if ((mask & 8) != 0) ao = min(ao, aoSide(1.0 - f.y));
      if ((mask & 16) != 0) ao = min(ao, aoSide(length(f)));
      if ((mask & 32) != 0) ao = min(ao, aoSide(length(vec2(1.0 - f.x, f.y))));
      if ((mask & 64) != 0) ao = min(ao, aoSide(length(vec2(f.x, 1.0 - f.y))));
      if ((mask & 128) != 0) ao = min(ao, aoSide(length(1.0 - f)));
    }
    if (gbits != 0) {
      float g = 0.0;
      if ((gbits & 1) != 0) g = max(g, glowSide(f.x));
      if ((gbits & 2) != 0) g = max(g, glowSide(1.0 - f.x));
      if ((gbits & 4) != 0) g = max(g, glowSide(f.y));
      if ((gbits & 8) != 0) g = max(g, glowSide(1.0 - f.y));
      glow = u_glowColors[gi] * g;
    }
  }
  int fk = deck & 15;
  int ck = deck >> 4;
  if (ck == 0) ck = fk;
  int kind = isFloor ? fk : ck;
  if (kind > 0) color = isFloor ? deckFloor(wp, kind, fw) : deckCeil(wp, kind, fw);
  // A room ceiling's lamps (kind 2 on) pool on the floor under them, in place
  // of the act ceiling's (the floor art's baked pool, Realistic's bounce).
  vec3 pool = isFloor && ck >= 2 ? deckPool(wp, ck) : vec3(0.0);
  if (u_realistic) {
    // Lights multiply the surface colour instead of adding over it, so a
    // light pool reads as illuminated concrete rather than a coloured decal.
    // Low ambient leaves the rest of the deck to fall into shadow.
    vec3 albedo = color;
    float occl = pow(ao, 1.7);
    float lum = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
    vec3 lit = albedo * (isFloor ? 0.78 : 0.62) * occl + glow * (isFloor ? 0.8 : 0.3);
    if (!isFloor) {
      // Ceiling lamp panels are light sources, not surfaces: keep them at full
      // brightness (and a little over, for bloom) instead of shading them.
      lit += albedo * smoothstep(0.5, 0.85, lum) * 0.9;
    } else {
      // Lamp bounce: the ceiling shares the floor's world coordinates, so a
      // heavily blurred ceiling sample at this point is the lamp directly
      // overhead. Its emissive part pools soft light onto the deck under it.
      // Five wide taps at a coarse mip spread the lamp into a soft pool
      // rather than mirroring its hard rectangle onto the deck.
      vec3 over = texture(u_ceilTex, wp, 3.5).rgb * 0.4
        + texture(u_ceilTex, wp + vec2(0.3, 0.0), 3.5).rgb * 0.15
        + texture(u_ceilTex, wp - vec2(0.3, 0.0), 3.5).rgb * 0.15
        + texture(u_ceilTex, wp + vec2(0.0, 0.3), 3.5).rgb * 0.15
        + texture(u_ceilTex, wp - vec2(0.0, 0.3), 3.5).rgb * 0.15;
      float emit = smoothstep(0.18, 0.6, dot(over, vec3(0.2126, 0.7152, 0.0722)));
      if (ck < 2) lit += albedo * over * emit * 1.0 * occl;
      else lit += albedo * pool * 0.35 * occl;
      // Under a skylight the deck has the day on it, not a lamp's pool.
      if (ck == 1) lit += albedo * vec3(0.16, 0.17, 0.18) * occl;
    }
    // Floor roughness from the texture itself: bright plating is polished,
    // dark grime is matte, which breaks the specular up across the deck.
    float gloss = mix(6.0, 48.0, smoothstep(0.08, 0.45, lum));
    // Schlick Fresnel against a camera eyeZ above the deck: grazing rows far
    // away reflect far more than the floor at the player's feet.
    float cosV = u_eyeZ / sqrt(rowDist * rowDist + u_eyeZ * u_eyeZ);
    float fres = 0.04 + 0.96 * pow(1.0 - cosV, 5.0);
    vec2 toCamR = normalize(u_camPos - wp);
    for (int i = 0; i < 16; i++) {
      if (i >= u_numLights) break;
      vec4 L = u_lights[i];
      vec2 dl = L.xy - wp;
      float d = length(dl);
      float reach = L.z * (isFloor ? 2.2 : 1.4);
      if (d >= reach) continue;
      // Inverse-square with a smooth window so every light still ends at its
      // authored radius instead of lighting the whole level faintly.
      float x = d / reach;
      float win = clamp(1.0 - x * x * x * x, 0.0, 1.0);
      float att = win * win / (1.0 + 6.0 * (d * d) / (L.z * L.z));
      vec3 lc = u_lightColors[i] * L.w;
      lit += albedo * lc * att * (isFloor ? 1.6 : 1.1) * occl;
      if (isFloor && d > 0.001) {
        float s = max(0.0, dot(dl / d, -toCamR));
        lit += lc * pow(s, gloss) * att * fres * 2.2;
      }
    }
    // Exponential-squared fog: clear up close, thick in the distance.
    float fd = rowDist * u_fogDensity;
    float fogR = u_fogMax * (1.0 - exp(-fd * fd * 0.6));
    lit = mix(lit, mix(u_fogNear, u_fogFar, fogR) * 0.8, fogR);
    fragColor = vec4(clamp(lit, 0.0, 1.0), 1.0);
    return;
  }

  color = color * ao + glow * (isFloor ? 1.0 : 0.45);
  // A room's own floor has no pool baked in, as the act's art has.
  if (fk > 0) color += pool * 0.12 * ao;

  vec2 toCam = normalize(u_camPos - wp);
  for (int i = 0; i < 16; i++) {
    if (i >= u_numLights) break;
    vec4 L = u_lights[i];
    vec2 dl = L.xy - wp;
    float d = length(dl);
    float reach = isFloor ? L.z * 1.8 : L.z;
    if (d < reach) {
      vec3 lc = u_lightColors[i] * L.w;
      float a = max(0.0, 1.0 - d / L.z);
      color += lc * a * a * (isFloor ? 0.55 : 0.4);
      if (isFloor && d > 0.001) {
        // Wet-steel sheen: the light smeared toward the viewer.
        float s = max(0.0, dot(dl / d, -toCam));
        float fall = 1.0 - d / reach;
        color += lc * pow(s, 10.0) * fall * fall * 0.35;
      }
    }
  }

  float fog = u_fogMax * (1.0 - exp(-rowDist * u_fogDensity));
  color = mix(color, mix(u_fogNear, u_fogFar, fog), fog);
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
uniform bool u_modern;         // Modern art style grade + vignette
uniform bool u_realistic;      // filmic tonemap + photographic grade
uniform bool u_flipScene;      // scene uploaded top-row-first from a 2D canvas

out vec4 fragColor;

// Simple pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 fc = gl_FragCoord.xy / u_resolution;
  // Canvas rows arrive top-down; flip here rather than with UNPACK_FLIP_Y on
  // upload, which keeps the upload on the GPU fast path. Everything below is
  // symmetric in y (vignette, grain, bloom taps), so only sampling flips.
  vec2 uv = u_flipScene ? vec2(fc.x, 1.0 - fc.y) : fc;

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
    color += bloom * (u_realistic ? 0.24 : 0.15);
  }

  // Film grain
  if (u_enableGrain) {
    float grain = rand(uv + fract(u_time * 0.001)) * 0.06 - 0.03;
    color += grain;
  }

  if (u_realistic) {
    // Filmic: decode to linear, expose, ACES (Narkowicz fit), re-encode. The
    // shoulder rolls highlights off like film instead of clipping them flat.
    vec3 lin = pow(max(color, 0.0), vec3(2.2)) * 1.65;
    lin = clamp((lin * (2.51 * lin + 0.03)) / (lin * (2.43 * lin + 0.59) + 0.14), 0.0, 1.0);
    color = pow(lin, vec3(1.0 / 2.2));
    // Pull saturation down; the stylised palettes read as paint otherwise.
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(lum), color, 0.8);
    // Split tone: cool shadows, warm highlights, the act colour only a hint.
    color += mix(vec3(-0.012, 0.0, 0.018), vec3(0.028, 0.014, -0.018), smoothstep(0.15, 0.75, lum));
    color += u_gradeColor * 0.04 * (1.0 - smoothstep(0.0, 0.25, lum));
    // Lens falloff rather than an ink frame.
    vec2 q = uv - 0.5;
    q.x *= u_resolution.x / u_resolution.y;
    color *= mix(1.0, 0.6, smoothstep(0.06, 0.5, dot(q, q)));
  } else if (u_modern) {
    // Modern grade: ink-dark vignette matching the HUD frame, act colour
    // lifted into the shadows only, and a gentle S-curve for inked contrast.
    vec2 q = uv - 0.5;
    q.x *= u_resolution.x / u_resolution.y;
    float vig = smoothstep(0.42, 1.0, length(q));
    color = mix(color, vec3(0.016, 0.024, 0.043), vig * 0.4);
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color += u_gradeColor * 0.12 * (1.0 - smoothstep(0.0, 0.3, lum));
    vec3 c = clamp(color, 0.0, 1.0);
    color = mix(c, c * c * (3.0 - 2.0 * c), 0.12);
  } else {
    // Color grading (per-act tint)
    color = mix(color, u_gradeColor, 0.03);
  }

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
      eyeZ: gl.getUniformLocation(fp, 'u_eyeZ'),
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
      modern: gl.getUniformLocation(pp, 'u_modern'),
      realistic: gl.getUniformLocation(pp, 'u_realistic'),
      flipScene: gl.getUniformLocation(pp, 'u_flipScene'),
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

  /**
   * Resize the render area. The WebGL canvas itself only grows: setting its
   * width or height reallocates the drawing buffer synchronously (21-82 ms
   * measured on Chrome's D3D11 backend), and adaptive quality changes the
   * render size every few seconds on a struggling machine — each step was a
   * hitch, which the governor then read as a reason to step down again.
   * Smaller sizes render into the buffer's bottom-left corner, the origin of
   * gl_FragCoord, so the shaders see the same coordinates; blitTo() copies
   * that corner out.
   */
  resize(w, h) {
    this.width = w;
    this.height = h;
    if (w > this.canvas.width || h > this.canvas.height) {
      this.canvas.width = Math.max(w, this.canvas.width);
      this.canvas.height = Math.max(h, this.canvas.height);
    }

    // Recreate FBO
    const gl = this.gl;
    gl.deleteFramebuffer(this.sceneFBO.fbo);
    gl.deleteTexture(this.sceneFBO.texture);
    this.sceneFBO = this._createFramebuffer(w, h);
  }

  /** The Modern wall pass, created on first use; null if it cannot compile. */
  wallPass() {
    if (this._wallPass === undefined) {
      const wp = new WallPass(this.gl);
      this._wallPass = wp.ok ? wp : null;
    }
    return this._wallPass;
  }

  /** Draw the last frame rendered here onto a 2D context at its origin. */
  blitTo(ctx) {
    const { width: w, height: h } = this;
    ctx.drawImage(this.canvas, 0, this.canvas.height - h, w, h, 0, 0, w, h);
  }

  /**
   * Render floor and ceiling to the WebGL canvas.
   * Call this, then draw the result onto the main Canvas2D via drawImage.
   */
  renderFloorCeiling(camX, camY, dirX, dirY, planeX, planeY, yShift, fogColor, fogMax, lights, eyeZ = 0.5) {
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
    gl.uniform1f(this.u_floor.eyeZ, eyeZ);
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
   * Compile the Modern floor program ahead of time (main.js, idle on the
   * title). Compiling it in a level's first frame blocked ~200 ms waiting on
   * the GPU process for the compile status.
   */
  precompile() {
    this._ensureModernFloor();
  }

  /**
   * Compile the Modern floor program on first use so Legacy boots exactly as
   * before. Returns false if it can't compile (caller uses the Canvas2D path).
   */
  _ensureModernFloor() {
    if (this._modernFloor !== undefined) return !!this._modernFloor;
    const gl = this.gl;
    const prog = createProgram(gl, FLOOR_VERT, FLOOR_FRAG_MODERN);
    this._modernFloor = prog;
    if (!prog) return false;
    const u = (n) => gl.getUniformLocation(prog, n);
    this.u_modern = {
      resolution: u('u_resolution'), camPos: u('u_camPos'), dir: u('u_dir'), plane: u('u_plane'),
      yShift: u('u_yShift'), eyeZ: u('u_eyeZ'), floorTex: u('u_floorTex'), ceilTex: u('u_ceilTex'), envMap: u('u_envMap'),
      mapSize: u('u_mapSize'), fogNear: u('u_fogNear'), fogFar: u('u_fogFar'), fogMax: u('u_fogMax'),
      fogDensity: u('u_fogDensity'), numLights: u('u_numLights'), lights: u('u_lights'),
      lightColors: u('u_lightColors'), glowColors: u('u_glowColors'), realistic: u('u_realistic'),
    };
    this._lightBuf = new Float32Array(64);
    this._lightColorBuf = new Float32Array(48);
    this._aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    // Both programs share the quad VAO; a_pos must resolve to the same slot.
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    if (posLoc !== gl.getAttribLocation(this.floorProgram, 'a_pos')) {
      gl.bindVertexArray(this.quadVAO);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
    }
    return true;
  }

  /** Upload the Modern 512px deck/ceiling canvases as trilinear+anisotropic mipmapped textures. */
  uploadModernDeck(floorCanvas, ceilCanvas) {
    if (!this._ensureModernFloor()) return;
    const gl = this.gl;
    const make = (src) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      if (this._aniso) {
        const max = gl.getParameter(this._aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1;
        gl.texParameterf(gl.TEXTURE_2D, this._aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
      }
      return tex;
    };
    if (this.modernFloorTex) gl.deleteTexture(this.modernFloorTex);
    if (this.modernCeilTex) gl.deleteTexture(this.modernCeilTex);
    this.modernFloorTex = make(floorCanvas);
    this.modernCeilTex = make(ceilCanvas);
  }

  /** Upload the per-cell AO/glow bytes (see src/rendering/env/env-map.js). */
  uploadEnvMap(rgba, w, h) {
    if (!this._ensureModernFloor()) return;
    const gl = this.gl;
    if (!this.envMapTex) {
      this.envMapTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.envMapTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.envMapTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    this._envMapW = w;
    this._envMapH = h;
  }

  /**
   * Modern floor/ceiling pass. `env` is the act bundle from
   * generateModernEnv(); lights are game.lights ({x, y, color 0-255, radius,
   * intensity}). Returns false when the Modern program/textures aren't ready.
   */
  renderFloorCeilingModern(camX, camY, dirX, dirY, planeX, planeY, yShift, env, lights, eyeZ = 0.5) {
    if (!this._ensureModernFloor() || !this.modernFloorTex || !this.envMapTex) return false;
    const gl = this.gl;
    const u = this.u_modern;
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this._modernFloor);
    gl.bindVertexArray(this.quadVAO);
    gl.uniform2f(u.resolution, this.width, this.height);
    gl.uniform2f(u.camPos, camX, camY);
    gl.uniform2f(u.dir, dirX, dirY);
    gl.uniform2f(u.plane, planeX, planeY);
    gl.uniform1f(u.yShift, yShift);
    gl.uniform1f(u.eyeZ, eyeZ);
    gl.uniform3fv(u.fogNear, env.fogNearGL);
    gl.uniform3fv(u.fogFar, env.fogFarGL);
    gl.uniform1f(u.fogMax, env.fogMax);
    gl.uniform1f(u.fogDensity, env.fogDensity);
    gl.uniform3fv(u.glowColors, env.glowGL);
    gl.uniform2i(u.mapSize, this._envMapW, this._envMapH);
    gl.uniform1i(u.realistic, isRealisticArt() ? 1 : 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.modernFloorTex);
    gl.uniform1i(u.floorTex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.modernCeilTex);
    gl.uniform1i(u.ceilTex, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.envMapTex);
    gl.uniform1i(u.envMap, 2);
    gl.activeTexture(gl.TEXTURE0);

    const n = Math.min(lights ? lights.length : 0, 16);
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
    gl.uniform1i(u.numLights, n);
    gl.uniform4fv(u.lights, lb);
    gl.uniform3fv(u.lightColors, cb);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    return true;
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
    gl.uniform1i(this.u_postfx.modern, isModernArt() ? 1 : 0);
    gl.uniform1i(this.u_postfx.realistic, isRealisticArt() ? 1 : 0);
    gl.uniform1i(this.u_postfx.flipScene, 0);

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

    // Upload the Canvas2D frame as the scene texture. This runs every frame
    // and was the single largest cost in the game (~6 ms at 1440x900 @2x):
    // a flipped, un-premultiplied, colour-converted upload makes the browser
    // read the canvas back to the CPU. Keep every unpack option on the GPU
    // fast path — no flip (the shader flips instead, u_flipScene), alpha left
    // premultiplied as the canvas stores it, no colour-space conversion — and
    // write into the texture already allocated at this size.
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    if (srcCanvas.width === w && srcCanvas.height === h) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    }
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);

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
    gl.uniform1i(this.u_postfx.modern, isModernArt() ? 1 : 0);
    gl.uniform1i(this.u_postfx.realistic, isRealisticArt() ? 1 : 0);
    gl.uniform1i(this.u_postfx.flipScene, 1);

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
    if (this._modernFloor) gl.deleteProgram(this._modernFloor);
    if (this.modernFloorTex) gl.deleteTexture(this.modernFloorTex);
    if (this.modernCeilTex) gl.deleteTexture(this.modernCeilTex);
    if (this.envMapTex) gl.deleteTexture(this.envMapTex);
    this._wallPass?.destroy();
    gl.deleteFramebuffer(this.sceneFBO.fbo);
    gl.deleteTexture(this.sceneFBO.texture);
  }
}
