/**
 * The view out through the civic wing's curtain wall, drawn by depth.
 *
 * A glass face's panes are cut out of its art (GLASS in rooms/civic.js says
 * where, and paints what stays on the glass), and behind them each column
 * draws the city (rooms/civic-city.js) as the raycaster draws walls: every
 * layer is a plane at its own distance beyond the glass, so its column comes
 * from where the ray meets that plane, and its rows from the horizon and the
 * eye. The near embankment slides past as you walk, the far bank less, the
 * old city hardly at all, and the sky only turns with the view. Nothing is
 * tied to the wall's height: a taller wall just shows more sky.
 *
 * Each column draws back to front, and only what the layer in front of it
 * leaves showing (every layer knows, column by column, how high it is solid
 * from its foot): about four segments behind a pane, the same instanced
 * segments the GPU wall pass draws walls with, or 1-px drawImage columns on
 * the Canvas2D paths. The layers go into an env's wall set under ids of
 * their own (CITY_IDS), so they upload with the walls.
 *
 * The city is painted once, a layer at a time, when a map with the glass
 * first draws (prepareCityView); until it is, the panes keep their painted
 * view.
 */
import { buildMips, makeCanvas } from "./paint.js";
import { GLASS } from "./rooms/civic.js";
import { TS, SKY, LAYERS, SPRITES, paintSky, paintLayer, paintSprites } from "./rooms/civic-city.js";

/** Wall ids whose faces are glass onto the city (1 = yes), by id. */
export const CITY_GLASS = new Uint8Array(1024);
const GLASS_IDS = Object.keys(GLASS).map(Number);
for (const id of GLASS_IDS) CITY_GLASS[id] = 1;

/** The ids the city's tiles take in an env's wall set (clear of every wall id). */
const BASE_ID = 900;

// Tiles in paint order: the sky, the layers, the sprites. Each cell is
// { id, chain } once painted; `solid` per layer is the z its column is
// solid up to (NaN where it shows through to the foot).
const sky = { cells: [] };
const layers = LAYERS.map((L) => ({ ...L, cells: [], solid: null }));
const sprites = { tile: null };
let next = 0;
const STEPS = 1 + layers.length + 1;
let lastStep = -1e9;

const NONE = [0, 0, 0, 0];

/** A flat relief chain, so Realistic keeps its relief normals with the city in the set. */
let flatNormals = null;
function flat() {
  if (flatNormals) return flatNormals;
  const c = makeCanvas(TS);
  const g = c.getContext("2d");
  g.fillStyle = "rgb(128,128,0)";
  g.fillRect(0, 0, TS, TS);
  return (flatNormals = buildMips(c));
}

/** Cut a band into TS tiles, each a mip chain under its own id. */
function cut(band, firstId) {
  const out = [];
  for (let i = 0; i < band.width / TS; i++) {
    const c = makeCanvas(TS);
    c.getContext("2d").drawImage(band, i * TS, 0, TS, TS, 0, 0, TS, TS);
    const chain = buildMips(c);
    chain.normals = flat();
    out.push({ id: firstId + i, chain });
  }
  return out;
}

/** Per texel column of a band: the z up to which it is solid from the foot. */
function solidity(band, L) {
  const w = band.width;
  const d = band.getContext("2d").getImageData(0, 0, w, TS).data;
  const z = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let y = TS - 1;
    while (y >= 0 && d[(y * w + x) * 4 + 3] > 250) y--;
    z[x] = y === TS - 1 ? NaN : L.zHi - ((y + 1) / TS) * (L.zHi - L.zLo);
  }
  return z;
}

/** Paint the next piece of the city. True once it is all painted. */
function step() {
  if (next >= STEPS) return true;
  let id = BASE_ID;
  if (next === 0) {
    const band = paintSky();
    sky.cells = cut(band, id);
    band.width = band.height = 0;
  } else if (next <= layers.length) {
    id += SKY.tiles;
    for (let i = 0; i < next - 1; i++) id += layers[i].tiles;
    const L = layers[next - 1];
    const band = paintLayer(L);
    L.solid = solidity(band, L);
    L.cells = cut(band, id);
    band.width = band.height = 0;
  } else {
    sprites.tile = cut(paintSprites(), BASE_ID + 99)[0];
  }
  next++;
  return next >= STEPS;
}

/**
 * A piece at most every 100 ms (each is 5-30 ms on a slow machine), so no
 * frame pays for more than one.
 */
function stepThrottled() {
  if (next >= STEPS) return true;
  const now = performance.now();
  if (now - lastStep < 100) return false;
  lastStep = now;
  return step();
}

/** Cut the panes out of one face of glass (any size) and paint what stays on them. */
function glaze(canvas, id) {
  const g = canvas.getContext("2d");
  const s = canvas.width / TS;
  const { panes, paint } = GLASS[id];
  g.save();
  g.scale(s, s);
  // Opaque on purpose: the context keeps whatever fill its bake left (the
  // contact shadow's is clear mid-face), and a clear one cuts nothing.
  g.fillStyle = "#000";
  g.globalCompositeOperation = "destination-out";
  for (const [x, y, w, h] of panes) g.fillRect(x, y, w, h);
  g.globalCompositeOperation = "source-over";
  g.beginPath();
  for (const [x, y, w, h] of panes) g.rect(x, y, w, h);
  g.clip();
  paint(g);
  g.restore();
}

function glazeChain(chain, id) {
  if (chain.glazed) return;
  glaze(chain[0], id);
  const mips = buildMips(chain[0]);
  for (let i = 1; i < mips.length && i < chain.length; i++) chain[i] = mips[i];
  chain.glazed = true;
}

/**
 * Bring the city into Modern env `env` for a map whose own walls (`ids`)
 * include the glass: paint a piece a call, and once it is all painted and
 * the env has the glass, glaze it and add the city's tiles. True when the
 * wall set changed (the GPU pass re-uploads it).
 */
export function prepareCityView(env, ids) {
  if (env.cityView) return false;
  if (ids._city === undefined) ids._city = ids.some((id) => CITY_GLASS[id] === 1);
  if (!ids._city || !stepThrottled()) return false;
  if (!GLASS_IDS.every((id) => env.walls[id])) return false;
  for (const id of GLASS_IDS) glazeChain(env.walls[id], id);
  for (const t of [...sky.cells, ...layers.flatMap((L) => L.cells), sprites.tile]) env.walls[t.id] = t.chain;
  env.cityView = true;
  return true;
}

/**
 * Legacy's face of glass (its 256px texture): glazed once the city is
 * painted, which this paints toward. True when the view should be drawn
 * behind it.
 */
export function glazeLegacyGlass(tex, id) {
  if (tex.cityGlazed) return true;
  if (!stepThrottled()) return false;
  glaze(tex, id);
  tex.cityGlazed = true;
  return true;
}

// One column's segments, nearest first: tile, u, rows, v range, texel rows per screen row.
const MAX_OPS = 12;
const opTile = new Array(MAX_OPS);
const opU = new Float32Array(MAX_OPS);
const opA = new Float32Array(MAX_OPS);
const opB = new Float32Array(MAX_OPS);
const opV0 = new Float32Array(MAX_OPS);
const opV1 = new Float32Array(MAX_OPS);
const opRows = new Float32Array(MAX_OPS);

// Layers and sprites by distance, nearest first.
const ORDER = [...layers, ...SPRITES.map((S) => ({ ...S, sprite: true }))].sort((a, b) => a.D - b.D);

/**
 * Draw the city behind one column of glass, rows y0..y1, before the glass
 * itself. `out` is the GPU wall pass (WallPass) or the 2D context. The rest
 * is the column's ray as the raycaster has it: the face's side and step,
 * the ray, the camera, the perpendicular distance to the glass, the
 * horizon row, the screen height and the eye's height (wall units).
 */
export function drawCityView(out, x, y0, y1, side, stepX, stepY, rdx, rdy, camX, camY, dist, horizon, h, eye) {
  if (next < STEPS) return;
  const now = performance.now() / 1000;
  const inv = side === 0 ? 1 / Math.abs(rdx) : 1 / Math.abs(rdy);
  // Along the glass, increasing to the right on screen.
  const sgn = side === 0 ? stepX : -stepY;
  let occ = y1;
  let n = 0;
  for (let i = 0; i < ORDER.length && occ > y0; i++) {
    const L = ORDER[i];
    const t = dist + L.D * inv;
    const u = sgn * (side === 0 ? camY + t * rdy : camX + t * rdx);
    let tile, tu, f, v0 = 0, v1 = 1;
    if (L.sprite) {
      let local = (u - L.phase - now * L.speed) % L.period;
      if (local < 0) local += L.period;
      if (local >= L.len) continue;
      tile = sprites.tile;
      tu = L.speed < 0 ? 1 - local / L.len : local / L.len;
      v0 = L.band / 4;
      v1 = v0 + 0.25;
    } else {
      f = (u / L.period) % 1;
      if (f < 0) f += 1;
      const k = f * L.tiles;
      tile = L.cells[k | 0];
      tu = k - (k | 0);
    }
    const lh = h / t;
    const top = horizon - (L.zHi - eye) * lh;
    const bot = horizon - (L.zLo - eye) * lh;
    const a = Math.round(top > y0 ? top : y0);
    const b = Math.round(bot < occ ? bot : occ);
    if (b > a && n < MAX_OPS) {
      opTile[n] = tile;
      opU[n] = tu;
      opA[n] = a;
      opB[n] = b;
      opV0[n] = v0 + ((a - top) / (bot - top)) * (v1 - v0);
      opV1[n] = v0 + ((b - top) / (bot - top)) * (v1 - v0);
      opRows[n] = (TS * (v1 - v0)) / (bot - top);
      n++;
    }
    if (!L.sprite) {
      const zs = L.solid[(f * L.solid.length) | 0];
      if (zs === zs) {
        const ys = horizon - (zs - eye) * lh;
        if (ys < occ) occ = ys;
      }
    }
  }
  if (occ > y0) {
    // The sky, by bearing; past its painted span, its edge rows stretched.
    let f = (Math.atan2(rdy, rdx) / Math.PI) % 1;
    if (f < 0) f += 1;
    const k = f * SKY.tiles;
    const tile = sky.cells[k | 0];
    const tu = k - (k | 0);
    const top = horizon - SKY.sHi * h;
    const bot = horizon - SKY.sLo * h;
    const rows = TS / (bot - top);
    const span = (a, b, v0, v1) => {
      a = Math.round(a);
      b = Math.round(b);
      if (b <= a || n >= MAX_OPS) return;
      opTile[n] = tile;
      opU[n] = tu;
      opA[n] = a;
      opB[n] = b;
      opV0[n] = v0;
      opV1[n] = v1;
      opRows[n] = rows;
      n++;
    };
    if (occ > bot) span(bot, occ, 1 - 0.5 / TS, 1);
    const a = top > y0 ? top : y0;
    const b = bot < occ ? bot : occ;
    if (b > a) span(a, b, (a - top) / (bot - top), (b - top) / (bot - top));
    if (y0 < top) span(y0, Math.min(top, occ), 0, 0.5 / TS);
  }
  const gl = typeof out.wall === "function";
  for (let i = n - 1; i >= 0; i--) {
    const rows = opRows[i];
    const lod = rows > 1 ? Math.min(5, Math.log2(rows)) : 0;
    const tile = opTile[i];
    if (gl) {
      out.wall(x, opA[i], opB[i], tile.id, lod, opU[i], opV0[i], opV1[i], NONE, NONE, NONE, NONE);
    } else {
      const c = tile.chain[Math.min(5, Math.round(lod))];
      const S = c.width;
      const sy = opV0[i] * S;
      const sh = Math.max(0.5, (opV1[i] - opV0[i]) * S);
      out.drawImage(c, Math.min(S - 1, (opU[i] * S) | 0), Math.min(sy, S - sh), 1, sh, x, opA[i], 1, opB[i] - opA[i]);
    }
  }
}
