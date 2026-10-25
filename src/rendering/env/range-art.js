/**
 * The firing range's own walls, painted like the locker room's
 * (src/rendering/env/locker-art.js): 512×512, Canvas2D, a material in
 * Realistic. What a range has that a corridor does not: a steel bullet trap
 * pocked where the rounds land, numbered lanes with a HOT lamp over each,
 * booth partitions with spent brass on the counter and a target controller
 * at the firing line, the range rules, the ear defenders on their pegs, the
 * distance markers down the side wall and the target store in the corner.
 *
 * Lettering goes through locker-art's mirrored `letter` (the raycaster lays a
 * texture across a face mirrored).
 */

import { STATION_WALLS } from "../../data/walls.js";
import { letter } from "./locker-art.js";
import { T, lin, plate, rivet, ink, lightStrip, led, vents, relief, grey, sink, raise, hazard } from "./paint.js";

const GUNMETAL = ["#353a41", "#24282e", "#121417"];
const CONCRETE = ["#6b6f74", "#5a5e63", "#45484c"];

/** Painted block wall: two-tone concrete, a yellow kick line, seeded scuffs. */
function blockWall(ctx, r, top = 0, bottom = T) {
  ctx.fillStyle = lin(ctx, 0, top, 0, bottom, [[0, CONCRETE[2]], [0.55, CONCRETE[1]], [1, CONCRETE[0]]]);
  ctx.fillRect(0, top, T, bottom - top);
  // Block courses.
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = top + 40; y < bottom; y += 64) ctx.fillRect(0, y, T, 2);
  for (let row = 0, y = top; y < bottom; row++, y += 64) {
    for (let x = row % 2 ? 64 : 0; x < T; x += 128) ctx.fillRect(x, y, 2, 64);
  }
  relief((g) => {
    g.fillStyle = grey(8);
    for (let y = top + 40; y < bottom; y += 64) g.fillRect(0, y, T, 2);
  }, "difference");
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`;
    ctx.fillRect(r() * T, top + r() * (bottom - top), 3 + r() * 40, 1 + r() * 3);
  }
}

/** The kick plate along the floor every range wall shares. */
function kick(ctx, p) {
  ctx.fillStyle = "#e8c23a";
  ctx.fillRect(0, 456, T, 10);
  plate(ctx, 0, 466, T, T - 466, p, { tones: ["#20242c", "#15181e", "#0b0d11"], bevel: 3, ink: 2, spec: false });
}

// ── Backstop ─────────────────────────────────────────────────────

/**
 * The bullet trap: overlapping steel louvres angled down into a rubber berm,
 * pocked and lead-smeared where the lanes put their rounds, the target
 * carrier rail along the top. A lane cell carries its number and HOT lamp.
 */
function paintBackstop(ctx, p, r, lane = null) {
  ctx.fillStyle = "#121418";
  ctx.fillRect(0, 0, T, T);
  // Soffit and the carrier rail the target trolleys run on.
  ctx.fillStyle = lin(ctx, 0, 0, 0, 74, [[0, "#2a2e34"], [1, "#1a1d22"]]);
  ctx.fillRect(0, 0, T, 74);
  plate(ctx, 0, 60, T, 16, p, { tones: ["#8a929c", "#5c646e", "#2c3238"], bevel: 3, ink: 2 });
  for (let x = 20; x < T; x += 96) rivet(ctx, x, 68, 3, p);
  if (lane != null) {
    // Lane number on a black plate, and the lane's HOT lamp beside it.
    plate(ctx, T / 2 - 58, 6, 116, 50, p, { tones: ["#1a1c20", "#111316", "#08090b"], bevel: 4, ink: 3 });
    letter(ctx, `LANE ${lane}`, T / 2, 32, 30, "#f2f2ee");
    lightStrip(ctx, 84, 22, 40, 18, "#ff3a2a", { blur: 22, core: "rgba(255,220,210,0.9)" });
    letter(ctx, "HOT", 104, 31, 11, "#2a0806", 900);
  }
  // Louvres: each a steel slat angled down, the one below tucked under it.
  const SLATS = 8;
  const y0 = 84;
  const h = 46;
  for (let i = 0; i < SLATS; i++) {
    const y = y0 + i * h;
    plate(ctx, 0, y, T, h + 4, p, { tones: [GUNMETAL[0], GUNMETAL[1], GUNMETAL[2]], bevel: 4, ink: 2 });
    // The lip catches the light; the throat under it is in shadow.
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(0, y + 3, T, 3);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, y + h - 6, T, 8);
    sink(0, y + h - 6, T, 8, 34);
  }
  // Plate seams every half-cell, rust weeping from the bolts.
  for (const x of [0, T / 2]) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, y0, 4, SLATS * h);
    sink(x, y0, 4, SLATS * h, 30);
    for (let i = 0; i < SLATS; i++) {
      rivet(ctx, x + 14, y0 + i * h + 12, 3, p);
      ctx.fillStyle = `rgba(120,60,24,${0.12 + r() * 0.18})`;
      ctx.fillRect(x + 12, y0 + i * h + 16, 3, 10 + r() * 26);
    }
  }
  // Strike zone: lead splashes round dark pocks, densest at chest height on the lane.
  const strikes = lane != null ? 170 : 80;
  for (let i = 0; i < strikes; i++) {
    const cx = lane != null ? T / 2 + (r() + r() + r() - 1.5) * 200 : r() * T;
    const cy = 220 + (r() + r() - 1) * 110;
    const rr = 2.5 + r() * 5;
    ctx.fillStyle = `rgba(170,176,184,${0.35 + r() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr * 2.4, rr * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(4,5,6,0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, rr * 0.8, 0, Math.PI * 2);
    ctx.fill();
    sink(cx - rr, cy - rr * 0.7, rr * 2, rr * 1.4, 26);
    if (lane != null && i === strikes - 24) {
      // The lane's number, stencilled big on the trap where the shooter sees
      // it, repainted over the old damage; the last rounds land on it.
      // On a raised plate of its own: Realistic's bake repaints a flat face.
      plate(ctx, T / 2 - 70, 130, 140, 164, p, { tones: ["#16181c", "#0e1013", "#07080a"], bevel: 4, ink: 3 });
      letter(ctx, String(lane), T / 2, 216, 150, "rgba(6,6,8,0.85)");
      letter(ctx, String(lane), T / 2, 212, 140, "#f4f0e4");
    }
  }
  // Rubber berm the trap feeds into.
  ctx.fillStyle = lin(ctx, 0, 440, 0, 480, [[0, "#1e1a18"], [1, "#0d0b0a"]]);
  ctx.beginPath();
  ctx.moveTo(0, 452);
  for (let x = 0; x <= T; x += 32) ctx.lineTo(x, 438 + Math.sin(x * 0.05 + r()) * 4);
  ctx.lineTo(T, 480);
  ctx.lineTo(0, 480);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(${60 + r() * 40},${50 + r() * 30},${40 + r() * 20},0.5)`;
    ctx.fillRect(r() * T, 444 + r() * 34, 2, 2);
  }
  raise(0, 440, T, 40, 10);
  hazard(ctx, 0, 480, T, 32, "#e8c23a");
}

// ── Booths ───────────────────────────────────────────────────────

/**
 * A booth partition seen side on: an aluminium frame, a felt acoustic panel,
 * the counter at hip height with spent brass on it, a ballistic glass top.
 * At the firing line it carries the lane's target controller.
 */
function paintBooth(ctx, p, r, ctrl = null) {
  // Ballistic glass above the panel, the range's dark behind it.
  ctx.fillStyle = lin(ctx, 0, 0, 0, 96, [[0, "#1a2028"], [1, "#222a34"]]);
  ctx.fillRect(0, 0, T, 96);
  ctx.fillStyle = "rgba(170,210,240,0.10)";
  ctx.beginPath();
  ctx.moveTo(60, 8);
  ctx.lineTo(140, 8);
  ctx.lineTo(70, 92);
  ctx.lineTo(10, 92);
  ctx.closePath();
  ctx.fill();
  // Frame: posts and rails.
  const post = { tones: ["#c8ced6", "#8d949e", "#4a5058"], bevel: 3, ink: 2 };
  plate(ctx, 0, 0, 16, 470, p, post);
  plate(ctx, T - 16, 0, 16, 470, p, post);
  plate(ctx, 0, 90, T, 12, p, post);
  // Felt panel: blue-grey with a fine weave.
  ctx.fillStyle = lin(ctx, 0, 102, 0, 300, [[0, "#4a5868"], [1, "#3a4654"]]);
  ctx.fillRect(16, 102, T - 32, 198);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(16 + r() * (T - 32), 102 + r() * 198, 2, 1);
  }
  ink(ctx, 16, 102, T - 32, 2, 18);
  // Counter: laminate with a bull-nosed front edge, brass on it.
  plate(ctx, 0, 300, T, 26, p, { tones: ["#9aa0a6", "#6e747a", "#3a3e44"], bevel: 4, ink: 2 });
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(0, 304, T, 2);
  for (let i = 0; i < 14; i++) {
    const x = 40 + r() * (T - 80);
    ctx.fillStyle = "#c9a24a";
    ctx.fillRect(x, 294, 9, 5);
    ctx.fillStyle = "#f2d68a";
    ctx.fillRect(x, 294, 9, 1.5);
  }
  // Lower panel and the kick plate.
  ctx.fillStyle = lin(ctx, 0, 326, 0, 456, [[0, "#2c3440"], [1, "#222830"]]);
  ctx.fillRect(16, 326, T - 32, 130);
  vents(ctx, 60, 360, T - 120, 60, 5, p);
  kick(ctx, p);
  if (ctrl != null) {
    // Target controller on its arm: LCD, run/return arrows, the red stop.
    plate(ctx, T / 2 - 90, 140, 180, 120, p, { tones: ["#3a3e44", "#2a2d32", "#16181b"], bevel: 5, ink: 3 });
    ctx.fillStyle = "#0e1a10";
    ctx.fillRect(T / 2 - 72, 154, 144, 44);
    letter(ctx, `LANE ${ctrl}`, T / 2, 168, 15, "#7cff9a", 700);
    letter(ctx, "TGT  10 M", T / 2, 188, 13, "#7cff9a", 700);
    for (const [dx, c] of [[-50, "#b8c0c8"], [-10, "#b8c0c8"]]) {
      plate(ctx, T / 2 + dx, 214, 32, 28, p, { tones: [c, "#8a9098", "#50565e"], bevel: 3, ink: 2 });
    }
    letter(ctx, "◀", T / 2 - 34, 228, 14, "#1a1c20");
    letter(ctx, "▶", T / 2 + 6, 228, 14, "#1a1c20");
    ctx.fillStyle = "#c22a1e";
    ctx.beginPath();
    ctx.arc(T / 2 + 56, 228, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(T / 2 + 52, 223, 5, 0, Math.PI * 2);
    ctx.fill();
    led(ctx, T / 2 - 78, 248, 4, "#3aff6a");
    // Coiled cable down to the counter.
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = 260; y < 300; y += 2) ctx.lineTo(T / 2 + 70 + Math.sin(y * 0.8) * 6, y);
    ctx.stroke();
  }
}

// ── The back wall: rules, PPE ────────────────────────────────────

/** RANGE RULES, and the HOT/COLD lightbox over the door. */
function paintRules(ctx, p, r) {
  blockWall(ctx, r, 0, 456);
  plate(ctx, 56, 40, T - 112, 44, p, { tones: ["#2a0c0a", "#1a0706", "#0a0303"], bevel: 4, ink: 3 });
  lightStrip(ctx, 72, 50, 150, 24, "#ff3a2a", { blur: 20 });
  letter(ctx, "RANGE HOT", 147, 62, 17, "#2a0806");
  lightStrip(ctx, T - 222, 50, 150, 24, "#1f6a3a", { blur: 4, alpha: 0.35 });
  letter(ctx, "RANGE COLD", T - 147, 62, 17, "#0e2a18");
  plate(ctx, 70, 110, T - 140, 300, p, { tones: ["#f2f0ea", "#e2e0d8", "#c8c6be"], bevel: 4, ink: 3 });
  ctx.fillStyle = "#c22a1e";
  ctx.fillRect(74, 114, T - 148, 46);
  letter(ctx, "RANGE RULES", T / 2, 138, 26, "#fff");
  const rules = [
    "1  TREAT EVERY WEAPON AS LOADED",
    "2  MUZZLE DOWNRANGE. ALWAYS.",
    "3  FINGER OFF THE TRIGGER",
    "4  EYES AND EARS ON THE LINE",
    "5  CEASE FIRE MEANS CEASE FIRE",
  ];
  rules.forEach((t, i) => letter(ctx, t, T / 2, 192 + i * 40, 16, "#1c1e22", 800));
  letter(ctx, "— RANGE MASTER SGT. OKAFOR", T / 2, 390, 12, "#5a5c60", 700);
  kick(ctx, p);
}

/** Ear defenders and glasses on their pegs, the sign-in sheet on its clip. */
function paintPPE(ctx, p, r) {
  blockWall(ctx, r, 0, 456);
  plate(ctx, 40, 70, T - 80, 300, p, { tones: ["#a08060", "#806448", "#5a4430"], bevel: 4, ink: 3 });
  for (let y = 86; y < 360; y += 18) for (let x = 56; x < T - 56; x += 18) {
    ctx.fillStyle = "rgba(20,12,6,0.55)";
    ctx.fillRect(x, y, 3, 3);
  }
  letter(ctx, "EYES & EARS — TAKE ONE", T / 2, 96, 15, "#fff4dc");
  const cups = ["#e8c23a", "#1c1e22", "#e8c23a", "#c22a1e"];
  cups.forEach((c, i) => {
    const x = 96 + i * 108;
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(x - 2, 128, 4, 18);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, 170, 30, Math.PI, 0);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x + s * 30, 186, 15, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(x + s * 30, 192, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  // Safety glasses on the lower pegs.
  [150, 270].forEach((x) => {
    ctx.fillStyle = "rgba(255,200,80,0.55)";
    ctx.fillRect(x - 34, 262, 30, 16);
    ctx.fillRect(x + 4, 262, 30, 16);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x - 36, 258, 72, 4);
  });
  // Sign-in clipboard.
  plate(ctx, T - 170, 228, 104, 136, p, { tones: ["#7a5a38", "#5c4228", "#3a2a18"], bevel: 3, ink: 2 });
  ctx.fillStyle = "#f4f2ea";
  ctx.fillRect(T - 160, 248, 84, 108);
  plate(ctx, T - 138, 220, 40, 16, p, { tones: ["#c8ced6", "#8d949e", "#4a5058"], bevel: 2, ink: 2 });
  letter(ctx, "SIGN IN", T - 118, 262, 11, "#1c1e22");
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = "rgba(30,40,90,0.55)";
    ctx.fillRect(T - 154, 278 + i * 12, 30 + r() * 40, 2);
  }
  kick(ctx, p);
}

// ── Side wall, the corner ────────────────────────────────────────

/** Baffles with a distance marker stencilled on them. */
function paintDistance(ctx, p, r, paintBaffles, label) {
  paintBaffles(ctx, p, r);
  plate(ctx, T / 2 - 84, 260, 168, 84, p, { tones: ["#f2f0ea", "#d8d6ce", "#b0aea6"], bevel: 4, ink: 3 });
  letter(ctx, label, T / 2, 302, 46, "#1c1e22");
  // The floor line that marks the same distance.
  ctx.fillStyle = "#f2f0ea";
  ctx.fillRect(T / 2 - 4, 440, 8, 16);
}

/** Target store: steel shelving, cardboard silhouettes, paper rolls, a staple gun. */
function paintTargetStore(ctx, p, r) {
  blockWall(ctx, r, 0, 456);
  const post = { tones: ["#7a8494", "#525c6a", "#2a3038"], bevel: 3, ink: 2 };
  plate(ctx, 24, 40, 18, 416, p, post);
  plate(ctx, T - 42, 40, 18, 416, p, post);
  [150, 290, 430].forEach((y) => plate(ctx, 24, y, T - 48, 14, p, post));
  // Silhouettes stood on the top shelf, leaning.
  for (let i = 0; i < 4; i++) {
    const x = 70 + i * 96;
    ctx.save();
    ctx.translate(x, 150);
    ctx.rotate((i - 1.5) * 0.04);
    ctx.fillStyle = "#c8a878";
    ctx.fillRect(-36, -104, 72, 104);
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(0, -78, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.quadraticCurveTo(-28, -58, 0, -62);
    ctx.quadraticCurveTo(28, -58, 26, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f2f0ea";
    ctx.lineWidth = 2;
    for (const k of [10, 20]) {
      ctx.beginPath();
      ctx.ellipse(0, -36, k, k * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Paper rolls on the middle shelf.
  for (let i = 0; i < 6; i++) {
    const x = 70 + i * 66;
    ctx.fillStyle = lin(ctx, x, 0, x + 50, 0, [[0, "#d8d4c8"], [0.5, "#f4f2ea"], [1, "#b8b4a8"]]);
    ctx.fillRect(x, 236, 50, 54);
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    ctx.ellipse(x + 25, 236, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Boxes on the bottom shelf.
  for (let i = 0; i < 3; i++) {
    const x = 60 + i * 140;
    plate(ctx, x, 350, 120, 80, p, { tones: ["#a8865a", "#8a6a42", "#5e462a"], bevel: 3, ink: 2 });
    letter(ctx, i === 1 ? "PASTERS" : "TARGETS", x + 60, 380, 14, "#2a1a0a");
  }
  kick(ctx, p);
}

export { STATION_WALLS };

/**
 * Painters for wall-art.js's PAINTERS, by id. `paintBaffles` is the range's
 * existing baffle wall (locker-art's paintRange), which the distance markers
 * go on, passed in so the two files do not import each other.
 */
export function rangePainters(paintBaffles) {
  return {
    [STATION_WALLS.RANGE_BACKSTOP]: (ctx, p, r) => paintBackstop(ctx, p, r),
    [STATION_WALLS.RANGE_LANE_1]: (ctx, p, r) => paintBackstop(ctx, p, r, 1),
    [STATION_WALLS.RANGE_LANE_2]: (ctx, p, r) => paintBackstop(ctx, p, r, 2),
    [STATION_WALLS.RANGE_LANE_3]: (ctx, p, r) => paintBackstop(ctx, p, r, 3),
    [STATION_WALLS.RANGE_BOOTH]: (ctx, p, r) => paintBooth(ctx, p, r),
    [STATION_WALLS.RANGE_BOOTH_CTRL_1]: (ctx, p, r) => paintBooth(ctx, p, r, 1),
    [STATION_WALLS.RANGE_BOOTH_CTRL_2]: (ctx, p, r) => paintBooth(ctx, p, r, 2),
    [STATION_WALLS.RANGE_RULES]: paintRules,
    [STATION_WALLS.RANGE_PPE]: paintPPE,
    [STATION_WALLS.RANGE_DIST_5]: (ctx, p, r) => paintDistance(ctx, p, r, paintBaffles, "5 M"),
    [STATION_WALLS.RANGE_DIST_10]: (ctx, p, r) => paintDistance(ctx, p, r, paintBaffles, "10 M"),
    [STATION_WALLS.RANGE_TARGETS]: paintTargetStore,
  };
}
