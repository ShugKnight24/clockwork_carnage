/**
 * Wall painters for the civic wing (src/data/levels/rooms/civic.js places
 * them). Keyed by wall id.
 *
 * The station's public front, built to look like the city's: cream marble
 * in ashlar courses over a granite plinth, bronze rails, gilded lettering.
 * The great hall's walls are painted as three storeys, a colonnade and two
 * balconies trailing ivy up to the skylight, with engaged columns between;
 * the seal, the banners, the cornerstone and the directory. The south side
 * is a curtain wall onto the city in the morning, three views so a run of
 * glass doesn't repeat, and the public doors onto the street. The gardens'
 * kerbs and the fountain's basin are low walls, so their art sits in the
 * bottom of the face (and their tops, the face's average, read green and
 * blue). Records in oak, the stacks filed by the minute; the Bureau's desk.
 *
 * As everywhere in the station: anything with lettering or a picture is on
 * a raised plate (Realistic's bake repaints a flat face), and the view out
 * is marked as giving light, so the morning stays bright in every style.
 *
 * The curtain wall's painted view is only its stand-in: GLASS cuts its
 * panes out once the city behind them is ready, and src/rendering/env/
 * city-view.js draws the city there by depth (rooms/civic-city.js).
 */
import { CIVIC_WALLS as W } from "../../../data/levels/rooms/civic.js";
import { T, lin, rad, plate, rivet, led, sink, raise, relief, grey, lightStrip } from "../paint.js";
import { say } from "./corridor.js";
import { onScreen, text, lit, bust } from "./east-kit.js";

const MARBLE = ["#ece6d8", "#ddd5c4", "#c4baa4"];
const GRANITE = ["#5a5654", "#3e3a38", "#24201e"];
const BRONZE = ["#c49a5a", "#8e6a36", "#4e3818"];
const GOLD = "#e0bc62";
const NAVY = ["#2a4472", "#1c3058", "#101c38"];
const OAK = ["#8a5e38", "#6a4426", "#3e2614"];
const STEEL = ["#b4bcc6", "#868e98", "#4a5058"];
const DARK = ["#2a2e34", "#1c1f24", "#0e1013"];
const LEAF = ["#4f8a3e", "#3a6e2e", "#24481c"];

const PLINTH = 470;

/** Cream marble in ashlar courses, a few grey veins, the granite plinth. */
function marble(ctx, p, r, top = 0, bottom = PLINTH) {
  ctx.fillStyle = lin(ctx, 0, top, 0, bottom, [[0, MARBLE[0]], [0.6, MARBLE[1]], [1, MARBLE[2]]]);
  ctx.fillRect(0, top, T, bottom - top);
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(110,100,90,${0.08 + r() * 0.12})`;
    ctx.lineWidth = 1 + r() * 1.5;
    ctx.beginPath();
    const y = top + r() * (bottom - top);
    ctx.moveTo(r() * T, y);
    ctx.bezierCurveTo(r() * T, y + 40 * r(), r() * T, y - 40 * r(), r() * T, y + 60 * (r() - 0.5));
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(90,80,70,0.22)";
  for (let y = top + 96, row = 0; y < bottom; y += 96, row++) {
    ctx.fillRect(0, y, T, 2);
    sink(0, y, T, 2, 10);
  }
  for (let y = top, row = 0; y < bottom; y += 96, row++) {
    for (let x = row % 2 ? 128 : 0; x < T; x += 256) {
      ctx.fillRect(x, y, 2, Math.min(96, bottom - y));
      sink(x, y, 2, Math.min(96, bottom - y), 10);
    }
  }
  if (bottom >= PLINTH) plate(ctx, 0, PLINTH, T, T - PLINTH, p, { tones: GRANITE, bevel: 3, ink: 2, spec: false });
}

/** A bronze rail with glass under it, `y` its top, `h` the glass's depth. */
function balustrade(ctx, p, y, h) {
  plate(ctx, 0, y + 10, T, h, p, { tones: ["#c8dcea", "#a8c0d4", "#7890a8"], bevel: 1, ink: 0, spec: false });
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(60, y + 14, 40, h - 8);
  ctx.fillRect(320, y + 14, 24, h - 8);
  for (const x of [0, T / 2 - 6, T - 12]) plate(ctx, x, y + 6, 12, h + 6, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  plate(ctx, 0, y, T, 12, p, { tones: BRONZE, bevel: 3, ink: 1.5 });
}

/** Ivy trailing over a balcony's edge, from `y` down. */
function ivy(ctx, r, y, len) {
  for (let i = 0; i < 9; i++) {
    const x = 20 + r() * (T - 40);
    const n = 3 + ((r() * len) / 14) | 0;
    for (let k = 0; k < n; k++) {
      const lx = x + Math.sin(k * 0.9 + i) * 6;
      const ly = y + k * 12;
      ctx.fillStyle = LEAF[(k + i) % 3];
      ctx.beginPath();
      ctx.ellipse(lx, ly, 7, 5, (k % 2 ? 0.6 : -0.6), 0, Math.PI * 2);
      ctx.fill();
      relief((g) => {
        g.fillStyle = grey(14);
        g.beginPath();
        g.ellipse(lx, ly, 6, 4, 0, 0, Math.PI * 2);
        g.fill();
      });
    }
  }
}

/** The floor behind a balcony: shadowed, office windows lit along it. */
function storey(ctx, p, r, y, h) {
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, "#8a8274"], [1, "#5e584e"]]);
  ctx.fillRect(0, y, T, h);
  sink(0, y, T, h, 18);
  for (const x of [40, 200, 360]) {
    ctx.fillStyle = r() < 0.75 ? "#ffe8bc" : "#6a7484";
    ctx.fillRect(x, y + 14, 110, h - 40);
    lit(x, y + 14, 110, h - 40, 0.45, 6);
    ctx.fillStyle = "rgba(40,30,20,0.5)";
    ctx.fillRect(x + 53, y + 14, 4, h - 40);
    // Somebody already at a desk up there.
    if (r() < 0.4) bust(ctx, x + 30 + r() * 50, y + h - 26, 12, "rgba(30,26,22,0.75)");
  }
}

/** The skylight's glow along the top of the hall's walls. */
function skylight(ctx, p) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 44, [[0, "#ffffff"], [1, "#e8e0cc"]]);
  ctx.fillRect(0, 0, T, 44);
  lit(0, 0, T, 30, 0.6, 12);
  plate(ctx, 0, 34, T, 12, p, { tones: MARBLE, bevel: 2, ink: 1.5 });
}

/** The two balcony tiers and the colonnade's top, shared by the hall's walls. */
function tiers(ctx, p, r) {
  marble(ctx, p, r);
  skylight(ctx, p);
  storey(ctx, p, r, 46, 110);
  balustrade(ctx, p, 112, 34);
  plate(ctx, 0, 156, T, 18, p, { tones: MARBLE, bevel: 4, ink: 2 });
  ivy(ctx, r, 178, 50);
  storey(ctx, p, r, 174, 110);
  balustrade(ctx, p, 242, 34);
  plate(ctx, 0, 284, T, 18, p, { tones: MARBLE, bevel: 4, ink: 2 });
  ivy(ctx, r, 306, 40);
}

/** The great hall: colonnade below, balconies above, an oak door between pilasters. */
function paintBalcony(ctx, p, r) {
  tiers(ctx, p, r);
  for (const x of [0, T - 40]) plate(ctx, x, 302, 40, PLINTH - 302, p, { tones: MARBLE, bevel: 4, ink: 2 });
  plate(ctx, 176, 330, 160, PLINTH - 330, p, { tones: OAK, bevel: 5, ink: 2.5 });
  plate(ctx, 190, 344, 60, 112, p, { tones: OAK, bevel: 3, ink: 1.5, recess: true });
  plate(ctx, 262, 344, 60, 112, p, { tones: OAK, bevel: 3, ink: 1.5, recess: true });
  rivet(ctx, 248, 408, 5, p);
  rivet(ctx, 264, 408, 5, p);
  plate(ctx, 196, 314, 120, 12, p, { tones: BRONZE, bevel: 2, ink: 1 });
}

/** An engaged column, fluted, its capital under the first balcony. */
function paintColumn(ctx, p, r) {
  tiers(ctx, p, r);
  const x = 150, w = T - 300;
  plate(ctx, x - 24, 304, w + 48, 30, p, { tones: MARBLE, bevel: 4, ink: 2 });
  plate(ctx, x, 334, w, PLINTH - 354, p, { tones: ["#f4f0e6", "#e2dccc", "#c8bea8"], bevel: 3, ink: 2 });
  for (let fx = x + 16; fx < x + w - 10; fx += 26) {
    ctx.fillStyle = "rgba(120,108,90,0.28)";
    ctx.fillRect(fx, 340, 8, PLINTH - 366);
    sink(fx, 340, 8, PLINTH - 366, 14);
  }
  plate(ctx, x - 16, PLINTH - 22, w + 32, 22, p, { tones: MARBLE, bevel: 3, ink: 2 });
}

/** The seal: a clock and a key on navy, ringed in bronze and gold. */
function paintSeal(ctx, p, r) {
  tiers(ctx, p, r);
  for (const x of [0, T - 40]) plate(ctx, x, 302, 40, PLINTH - 302, p, { tones: MARBLE, bevel: 4, ink: 2 });
  const cx = T / 2, cy = 390, R = 78;
  plate(ctx, cx - R - 14, cy - R - 14, (R + 14) * 2, (R + 14) * 2, p, { tones: MARBLE, bevel: 4, ink: 1.5 });
  ctx.fillStyle = lin(ctx, 0, cy - R, 0, cy + R, [[0, BRONZE[0]], [1, BRONZE[2]]]);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, cy - R, 0, cy + R, [[0, NAVY[0]], [1, NAVY[2]]]);
  ctx.beginPath();
  ctx.arc(cx, cy, R - 12, 0, Math.PI * 2);
  ctx.fill();
  relief((g) => {
    g.fillStyle = grey(30);
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
  });
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 30, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(a) * (R - 20), cy - Math.cos(a) * (R - 20), 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // The key across the clock, and the hands at the hour.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 34, cy + 24);
  ctx.lineTo(cx + 30, cy - 30);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx - 38, cy + 28, 9, 0, Math.PI * 2);
  ctx.moveTo(cx + 22, cy - 22);
  ctx.lineTo(cx + 30, cy - 14);
  ctx.moveTo(cx + 26, cy - 26);
  ctx.lineTo(cx + 34, cy - 18);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - 34);
  ctx.stroke();
  ctx.lineCap = "butt";
  say(ctx, "CHRONOS", cx, 318, 16, GOLD, 900);
}

/** A banner on a bronze rod: navy, gold border, the seal small at its head. */
function paintBanner(ctx, p, r) {
  tiers(ctx, p, r);
  for (const x of [0, T - 40]) plate(ctx, x, 302, 40, PLINTH - 302, p, { tones: MARBLE, bevel: 4, ink: 2 });
  plate(ctx, 130, 52, T - 260, 12, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  const x = 150, w = T - 300, y = 64, h = 340;
  plate(ctx, x, y, w, h, p, { tones: NAVY, bevel: 3, ink: 2, spec: false });
  ctx.fillStyle = NAVY[1];
  ctx.beginPath();
  ctx.moveTo(x, y + h - 2);
  ctx.lineTo(x + w, y + h - 2);
  ctx.lineTo(x + w, y + h + 50);
  ctx.lineTo(x + w / 2, y + h + 18);
  ctx.lineTo(x, y + h + 50);
  ctx.closePath();
  ctx.fill();
  relief((g) => {
    g.fillStyle = grey(10);
    g.fill();
  });
  ctx.fillStyle = GOLD;
  for (const bx of [x + 10, x + w - 16]) ctx.fillRect(bx, y + 10, 6, h - 10);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(T / 2, y + 74, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(T / 2, y + 74);
  ctx.lineTo(T / 2, y + 48);
  ctx.moveTo(T / 2, y + 74);
  ctx.lineTo(T / 2 + 18, y + 74);
  ctx.stroke();
  say(ctx, "CHRONOS", T / 2, y + 150, 26, "#f2f0e8", 900, w - 40);
  say(ctx, "POLICE", T / 2, y + 184, 22, "#f2f0e8", 900, w - 40);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x + 40, y + 212, w - 80, 4);
  say(ctx, "TO SERVE", T / 2, y + 248, 16, GOLD, 900, w - 40);
  say(ctx, "THE HOUR", T / 2, y + 274, 16, GOLD, 900, w - 40);
}

/** The cornerstone's plaque, in bronze. */
function paintPlaque(ctx, p, r) {
  marble(ctx, p, r);
  plate(ctx, 70, 120, T - 140, 250, p, { tones: BRONZE, bevel: 6, ink: 3 });
  plate(ctx, 86, 136, T - 172, 218, p, { tones: ["#b48a4a", "#8a6634", "#5a4020"], bevel: 2, ink: 1, recess: true });
  say(ctx, "CHRONOS POLICE", T / 2, 166, 24, "#2a1a08", 900, T - 200);
  say(ctx, "THIS HALL IS OPEN", T / 2, 210, 16, "#2a1a08", 800);
  say(ctx, "TO EVERY CITIZEN", T / 2, 234, 16, "#2a1a08", 800);
  say(ctx, "AT EVERY HOUR", T / 2, 258, 16, "#2a1a08", 800);
  ctx.fillStyle = "#3a2410";
  ctx.fillRect(140, 280, T - 280, 2);
  say(ctx, "BUILT BY THE CITY", T / 2, 302, 13, "#3a2410", 800);
  say(ctx, "KEPT BY THE HOUR", T / 2, 324, 13, "#3a2410", 800);
  for (const [x, y] of [[90, 140], [T - 90, 140], [90, 350], [T - 90, 350]]) rivet(ctx, x, y, 6, p);
}

/** The directory: the wing and the way back, in gilt on black. */
function paintDirectory(ctx, p, r) {
  marble(ctx, p, r);
  plate(ctx, 60, 80, T - 120, 320, p, { tones: DARK, bevel: 5, ink: 3 });
  plate(ctx, 60, 64, T - 120, 30, p, { tones: BRONZE, bevel: 3, ink: 2 });
  say(ctx, "DIRECTORY", T / 2, 79, 18, "#1a1008", 900);
  const rows = [
    ["GREAT HALL", "PUBLIC ENTRANCE"],
    ["HALL OF RECORDS", "WEST"],
    ["THE BUREAU", "REGIONAL DESK, EAST"],
    ["THE STATION", "NORTH PASSAGE"],
    ["LOST PROPERTY", "THURSDAYS"],
  ];
  rows.forEach(([a, b], i) => {
    const y = 124 + i * 56;
    say(ctx, a, T / 2, y, 20, GOLD, 900, T - 160);
    say(ctx, b, T / 2, y + 22, 12, "#c8c0b0", 800, T - 160);
  });
}

/**
 * The city through the glass, in the morning: sky warming to the horizon,
 * the far towers in haze, the near ones with their lights still on.
 * `kind` picks the view: 0 the towers and the clock spire, 1 an airship
 * coming in over the river, 2 street level, the river road and a tram.
 */
function city(ctx, r, x, y, w, h, kind) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const horizon = y + h * (kind === 2 ? 0.5 : 0.72);
  ctx.fillStyle = lin(ctx, 0, y, 0, horizon, [[0, "#6e9cd0"], [0.6, "#b8cce0"], [1, "#f4d8b0"]]);
  ctx.fillRect(x, y, w, horizon - y);
  if (kind === 0) {
    ctx.fillStyle = rad(ctx, x + w * 0.7, horizon - 30, 0, 160, [[0, "rgba(255,240,200,0.9)"], [1, "rgba(255,220,160,0)"]]);
    ctx.fillRect(x, y, w, h);
  }
  // Clouds, low and thin.
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `rgba(255,250,244,${0.25 + r() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x + r() * w, y + 30 + r() * (horizon - y) * 0.5, 50 + r() * 70, 8 + r() * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Far towers in haze, then the near ones.
  for (let i = 0; i < 9; i++) {
    const bw = 24 + r() * 34, bh = 50 + r() * 140, bx = x + r() * w;
    ctx.fillStyle = `rgba(${130 + r() * 20},${148 + r() * 20},${178 + r() * 16},0.75)`;
    ctx.fillRect(bx, horizon - bh, bw, bh);
  }
  if (kind === 0) {
    // The clock spire over the old town.
    const sx = x + w * 0.32;
    ctx.fillStyle = "#5a6478";
    ctx.fillRect(sx - 16, horizon - 250, 32, 250);
    ctx.beginPath();
    ctx.moveTo(sx - 20, horizon - 250);
    ctx.lineTo(sx, horizon - 320);
    ctx.lineTo(sx + 20, horizon - 250);
    ctx.fill();
    ctx.fillStyle = "#f4ecd8";
    ctx.beginPath();
    ctx.arc(sx, horizon - 222, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const bw = 40 + r() * 50, bh = 80 + r() * (kind === 2 ? 120 : 200), bx = x - 20 + r() * w;
    const tone = 60 + r() * 30;
    ctx.fillStyle = `rgb(${tone},${tone + 12},${tone + 34})`;
    ctx.fillRect(bx, horizon - bh, bw, bh);
    ctx.fillStyle = "rgba(255,226,170,0.45)";
    ctx.fillRect(bx + bw - 6, horizon - bh, 6, bh);
    for (let wy = horizon - bh + 8; wy < horizon - 6; wy += 14) {
      for (let wx = bx + 5; wx < bx + bw - 10; wx += 10) {
        ctx.fillStyle = r() < 0.3 ? "rgba(255,220,150,0.85)" : "rgba(30,40,60,0.5)";
        ctx.fillRect(wx, wy, 5, 7);
      }
    }
  }
  if (kind === 1) {
    // An airship on its way in to the towers' masts.
    const ax = x + w * 0.58, ay = y + (horizon - y) * 0.3;
    ctx.fillStyle = "#c8ccd4";
    ctx.beginPath();
    ctx.ellipse(ax, ay, 70, 20, -0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(80,90,110,0.6)";
    ctx.beginPath();
    ctx.ellipse(ax, ay + 8, 66, 10, -0.04, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#3a4250";
    ctx.fillRect(ax - 16, ay + 18, 32, 9);
    ctx.fillStyle = "#ff5a3a";
    ctx.fillRect(ax + 64, ay - 2, 5, 5);
  }
  // The ground: the river and its embankment, or the street.
  if (kind === 2) {
    ctx.fillStyle = "#4e5660";
    ctx.fillRect(x, horizon, w, h);
    ctx.fillStyle = "#6e7680";
    ctx.fillRect(x, horizon, w, 16);
    ctx.fillStyle = "#e8e2c8";
    for (let lx = x; lx < x + w; lx += 60) ctx.fillRect(lx, horizon + 70, 30, 4);
    // The tram along the river road, and the trees on the embankment.
    ctx.fillStyle = "#c8402e";
    ctx.fillRect(x + w * 0.2, horizon + 22, 170, 40);
    ctx.fillStyle = "#ffe8b8";
    for (let tx = x + w * 0.2 + 10; tx < x + w * 0.2 + 160; tx += 26) ctx.fillRect(tx, horizon + 28, 18, 14);
    ctx.fillStyle = "#2a2e34";
    ctx.fillRect(x + w * 0.2, horizon + 60, 170, 4);
    for (let i = 0; i < 4; i++) {
      const tx = x + 30 + i * (w / 4) + r() * 20;
      ctx.fillStyle = "#3a5a32";
      ctx.beginPath();
      ctx.arc(tx, horizon - 18, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a1c";
      ctx.fillRect(tx - 3, horizon - 4, 6, 16);
    }
    ctx.fillStyle = "#2a2e34";
    for (let lx = x + 90; lx < x + w; lx += 180) {
      ctx.fillRect(lx, horizon - 60, 4, 80);
      ctx.fillRect(lx - 10, horizon - 60, 24, 5);
    }
  } else {
    ctx.fillStyle = lin(ctx, 0, horizon, 0, y + h, [[0, "#8aa4bc"], [1, "#3e5266"]]);
    ctx.fillRect(x, horizon, w, h);
    ctx.fillStyle = "rgba(255,236,200,0.5)";
    for (let i = 0; i < 10; i++) ctx.fillRect(x + r() * w, horizon + 8 + r() * (y + h - horizon - 20), 20 + r() * 50, 2);
    ctx.fillStyle = "#4a4640";
    ctx.fillRect(x, horizon - 4, w, 6);
  }
  ctx.restore();
  lit(x, y, w, h, 0.5, 10);
}

/** The curtain wall: floor-to-ceiling glass, bronze mullions shared with the next pane. */
function paintWindow(kind) {
  return (ctx, p, r) => {
    marble(ctx, p, r, 0, 30);
    city(ctx, r, 0, 30, T, PLINTH - 30, kind);
    // Reflections of the hall on the glass.
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (const [a, b] of [[80, 150], [330, 360]]) {
      ctx.beginPath();
      ctx.moveTo(a, 30);
      ctx.lineTo(b, 30);
      ctx.lineTo(b - 120, PLINTH);
      ctx.lineTo(a - 120, PLINTH);
      ctx.closePath();
      ctx.fill();
    }
    for (const x of [0, T - 10]) plate(ctx, x, 30, 10, PLINTH - 30, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
    plate(ctx, 0, 150, T, 10, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
    plate(ctx, 0, 22, T, 14, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
    // The bosses where the transom meets the mullions, and the sill's drip.
    for (const x of [5, T - 5]) rivet(ctx, x, 155, 5, p);
    plate(ctx, 0, PLINTH - 6, T, 8, p, { tones: BRONZE, bevel: 2, ink: 1 });
    plate(ctx, 0, PLINTH, T, T - PLINTH, p, { tones: GRANITE, bevel: 3, ink: 2, spec: false });
  };
}

/**
 * What stays on a pane once the city shows through it (city-view.js): a
 * breath of tint, the hall's light caught in long streaks (placed by
 * `kind`, so a run of panes doesn't repeat), the skylight's sheen along the
 * head, dust toward the sill, the mullions' shadow at the edges.
 */
function glassSheen(kind) {
  const streaks = [[[70, 60], [330, 26], [400, 14]], [[150, 40], [230, 16], [440, 50]], [[30, 18], [260, 70], [380, 22]]][kind];
  return (ctx) => {
    ctx.fillStyle = "rgba(176,198,220,0.07)";
    ctx.fillRect(0, 0, T, T);
    for (const [x, w] of streaks) {
      ctx.fillStyle = lin(ctx, x, 0, x + w, 0, [[0, "rgba(255,252,244,0)"], [0.5, "rgba(255,252,244,0.11)"], [1, "rgba(255,252,244,0)"]]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(x + w - 150, T);
      ctx.lineTo(x - 150, T);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = lin(ctx, 0, 36, 0, 110, [[0, "rgba(255,250,236,0.16)"], [1, "rgba(255,250,236,0)"]]);
    ctx.fillRect(0, 36, T, 74);
    ctx.fillStyle = lin(ctx, 0, 390, 0, PLINTH - 6, [[0, "rgba(210,200,186,0)"], [1, "rgba(210,200,186,0.14)"]]);
    ctx.fillRect(0, 390, T, PLINTH - 396);
    ctx.fillStyle = lin(ctx, 10, 0, 26, 0, [[0, "rgba(30,22,12,0.28)"], [1, "rgba(30,22,12,0)"]]);
    ctx.fillRect(10, 0, 16, T);
    ctx.fillStyle = lin(ctx, T - 10, 0, T - 26, 0, [[0, "rgba(30,22,12,0.28)"], [1, "rgba(30,22,12,0)"]]);
    ctx.fillRect(T - 26, 0, 16, T);
  };
}

/** The curtain wall's panes (x, y, w, h on the 512px face), for city-view.js. */
const PANES = [[10, 36, T - 20, 114], [10, 160, T - 20, PLINTH - 166]];
export const GLASS = {
  [W.WINDOW_A]: { panes: PANES, paint: glassSheen(0) },
  [W.WINDOW_B]: { panes: PANES, paint: glassSheen(1) },
  [W.WINDOW_C]: { panes: PANES, paint: glassSheen(2) },
};

/** Someone standing on the steps outside, seen through the glass: `s` tall to the shoulder. */
function figure(ctx, x, feet, s, coat) {
  ctx.fillStyle = "#1e1c1a";
  ctx.fillRect(x - s * 0.16, feet - s * 0.9, s * 0.13, s * 0.9);
  ctx.fillRect(x + s * 0.03, feet - s * 0.9, s * 0.13, s * 0.9);
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.28, feet - s * 1.9, s * 0.56, s * 1.1, s * 0.12);
  ctx.fill();
  ctx.fillStyle = "#c89a78";
  ctx.beginPath();
  ctx.arc(x, feet - s * 2.12, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

/** The public doors: bronze and glass, the steps and the morning's queue beyond. */
function paintEntrance(ctx, p, r) {
  marble(ctx, p, r, 0, 120);
  plate(ctx, 20, 30, T - 40, 70, p, { tones: DARK, bevel: 3, ink: 2 });
  say(ctx, "PUBLIC ENTRANCE", T / 2, 56, 22, GOLD, 900, T - 80);
  say(ctx, "OPEN 08:00", T / 2, 82, 13, "#c8c0b0", 800);
  const y = 110, h = PLINTH - 110;
  city(ctx, r, 0, y, T, h * 0.55, 2);
  // The steps down to the pavement, people already on them.
  ctx.fillStyle = "#b8b0a0";
  ctx.fillRect(0, y + h * 0.55, T, h * 0.45);
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = k % 2 ? "#a49c8c" : "#c4bcac";
    ctx.fillRect(0, y + h * 0.55 + k * 30, T, 14);
  }
  for (let i = 0; i < 4; i++) figure(ctx, 60 + i * 120 + r() * 30, y + h * 0.55 + 40 + (i % 2) * 30, 34 + r() * 8, `rgb(${40 + r() * 50},${40 + r() * 30},${50 + r() * 40})`);
  lit(0, y + h * 0.55, T, h * 0.45, 0.35, 8);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(60, y, 30, h);
  // The leaves' frames and push bars.
  for (const x of [0, T / 2 - 8, T - 16]) plate(ctx, x, y, 16, h, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  plate(ctx, 0, y - 8, T, 14, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  for (const x of [40, T / 2 + 30]) plate(ctx, x, 300, T / 2 - 80, 12, p, { tones: BRONZE, bevel: 2, ink: 1 });
  plate(ctx, 0, PLINTH, T, T - PLINTH, p, { tones: GRANITE, bevel: 3, ink: 2, spec: false });
}

/** A garden bed: planting over most of the face (its top reads green), the granite kerb. */
function paintPlanter(ctx, p, r) {
  ctx.fillStyle = "#2e4a24";
  ctx.fillRect(0, 0, T, 440);
  for (let i = 0; i < 220; i++) {
    const x = r() * T, y = r() * 440;
    ctx.fillStyle = LEAF[i % 3];
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + r() * 10, 6 + r() * 6, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  relief((g) => {
    for (let i = 0; i < 60; i++) {
      g.fillStyle = grey(10 + r() * 14);
      g.beginPath();
      g.arc(r() * T, 400 + r() * 40, 8 + r() * 10, 0, Math.PI * 2);
      g.fill();
    }
  });
  // Flowers along the front, where you see them over the kerb.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = ["#e84a5a", "#f4d040", "#f4f0f4", "#b860d0"][i % 4];
    ctx.beginPath();
    ctx.arc(r() * T, 405 + r() * 34, 3 + r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  plate(ctx, 0, 440, T, T - 440, p, { tones: ["#9a948c", "#7a746c", "#4e4a44"], bevel: 4, ink: 2 });
}

/** The fountain's basin: water over most of the face (its top reads blue), the rim, the bowl. */
function paintFountain(ctx, p, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 330, [[0, "#3a7aa8"], [1, "#2a5a80"]]);
  ctx.fillRect(0, 0, T, 330);
  ctx.fillStyle = "rgba(220,240,255,0.5)";
  for (let i = 0; i < 40; i++) ctx.fillRect(r() * T, r() * 320, 20 + r() * 40, 2);
  lit(0, 0, T, 330, 0.25, 8);
  plate(ctx, 0, 318, T, 30, p, { tones: ["#f0ece2", "#d8d0c0", "#a89e8a"], bevel: 5, ink: 2 });
  ctx.fillStyle = lin(ctx, 0, 348, 0, T, [[0, MARBLE[1]], [1, MARBLE[2]]]);
  ctx.fillRect(0, 348, T, T - 348);
  plate(ctx, 0, 410, T, 14, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  for (const x of [T / 4, (T * 3) / 4]) plate(ctx, x - 40, 360, 80, 36, p, { tones: MARBLE, bevel: 4, ink: 1.5 });
  plate(ctx, 0, PLINTH + 10, T, T - PLINTH - 10, p, { tones: GRANITE, bevel: 3, ink: 2, spec: false });
}

/** The security desk's front: a stone counter, SECURITY in gilt on navy. */
function paintCheckDesk(ctx, p, r) {
  ctx.fillStyle = "#4a4e56";
  ctx.fillRect(0, 0, T, 310);
  plate(ctx, 0, 306, T, 26, p, { tones: ["#e8e2d4", "#ccc4b2", "#9a907c"], bevel: 4, ink: 2 });
  plate(ctx, 0, 332, T, T - 332, p, { tones: NAVY, bevel: 4, ink: 2, spec: false });
  say(ctx, "SECURITY", T / 2, 384, 34, GOLD, 900, T - 80);
  say(ctx, "ALL VISITORS ARE SCREENED", T / 2, 424, 13, "#c8d0e0", 800, T - 80);
  lightStrip(ctx, 20, 460, T - 40, 5, "#9fd8ff", { blur: 10, alpha: 0.6 });
}

/** The security line's gates: steel posts, glass leaves, a green arrow lit. */
function paintCheckGate(ctx, p, r) {
  ctx.fillStyle = "#7a828c";
  ctx.fillRect(0, 0, T, 310);
  plate(ctx, 30, 330, T - 60, 160, p, { tones: ["#c8dcea", "#a8c0d4", "#7890a8"], bevel: 1, ink: 0, spec: false });
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(80, 336, 30, 148);
  for (const x of [0, T - 34]) plate(ctx, x, 306, 34, T - 306, p, { tones: STEEL, bevel: 3, ink: 2 });
  plate(ctx, 0, 306, T, 18, p, { tones: STEEL, bevel: 3, ink: 2 });
  led(ctx, 17, 346, 6, "#5aff8a");
  led(ctx, T - 17, 346, 6, "#5aff8a");
}

/** Records: oak panelling over the card catalogue's drawers. */
function paintRecords(ctx, p, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, PLINTH, [[0, OAK[2]], [1, OAK[1]]]);
  ctx.fillRect(0, 0, T, PLINTH);
  for (const x of [24, T / 2 + 12]) plate(ctx, x, 30, T / 2 - 36, 230, p, { tones: OAK, bevel: 5, ink: 2, recess: true });
  plate(ctx, 0, 272, T, 12, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 16 + col * 97, y = 296 + row * 34;
      plate(ctx, x, y, 90, 30, p, { tones: ["#a87a4a", "#8a5e38", "#5a3a20"], bevel: 2, ink: 1.2 });
      ctx.fillStyle = "#f2ecd8";
      ctx.fillRect(x + 30, y + 6, 30, 9);
      rivet(ctx, x + 45, y + 22, 3, p);
    }
  }
  plate(ctx, 0, PLINTH, T, T - PLINTH, p, { tones: OAK, bevel: 3, ink: 2, spec: false });
}

/** The stacks: steel shelving, archive boxes filed by the minute. */
function paintStacks(ctx, p, r) {
  ctx.fillStyle = "#2a2622";
  ctx.fillRect(0, 0, T, T);
  sink(0, 0, T, T, 30);
  const shelves = [20, 108, 196, 284, 372, 460];
  for (let s = 0; s < shelves.length - 1; s++) {
    let x = 16;
    while (x < T - 40) {
      const w = 40 + r() * 34;
      const h = 60 + r() * 18;
      const y = shelves[s + 1] - h;
      const tone = r() < 0.7 ? ["#c8a878", "#a88a5e", "#7a6040"] : ["#8a929c", "#6a727c", "#4a5058"];
      plate(ctx, x, y, w - 4, h, p, { tones: tone, bevel: 2, ink: 1.2 });
      plate(ctx, x + 6, y + 10, w - 16, 18, p, { tones: ["#f4f0e4", "#e8e2d2", "#c8c0aa"], bevel: 1, ink: 0.8, spec: false });
      const hh = 6 + ((r() * 3) | 0), mm = (r() * 60) | 0;
      say(ctx, `0${hh}:${String(mm).padStart(2, "0")}`, x + (w - 4) / 2, y + 19, 11, "#2a2014", 900, w - 18);
      x += w;
    }
  }
  for (const y of shelves) plate(ctx, 0, y, T, 10, p, { tones: STEEL, bevel: 2, ink: 1.5 });
  for (const x of [0, T - 14]) plate(ctx, x, 0, 14, T, p, { tones: STEEL, bevel: 2, ink: 1.5 });
}

/** The Bureau's desk: blue-grey panels over an oak dado, a sconce. */
function bureauWall(ctx, p, r) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, 300, [[0, "#5a6478"], [1, "#6e788c"]]);
  ctx.fillRect(0, 0, T, 300);
  for (const x of [20, T / 2 + 10]) plate(ctx, x, 24, T / 2 - 30, 250, p, { tones: ["#7a849a", "#6a748a", "#4e566a"], bevel: 4, ink: 1.5, recess: true });
  plate(ctx, 0, 290, T, 14, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  ctx.fillStyle = lin(ctx, 0, 304, 0, PLINTH, [[0, OAK[1]], [1, OAK[2]]]);
  ctx.fillRect(0, 304, T, PLINTH - 304);
  for (const x of [20, T / 2 + 10]) plate(ctx, x, 320, T / 2 - 30, 130, p, { tones: OAK, bevel: 4, ink: 1.5, recess: true });
  plate(ctx, 0, PLINTH, T, T - PLINTH, p, { tones: DARK, bevel: 3, ink: 2, spec: false });
}

function paintBureau(ctx, p, r) {
  bureauWall(ctx, p, r);
  plate(ctx, T / 2 - 20, 120, 40, 50, p, { tones: BRONZE, bevel: 2, ink: 1.5 });
  ctx.fillStyle = "#fff0cc";
  ctx.fillRect(T / 2 - 12, 96, 24, 26);
  lit(T / 2 - 12, 96, 24, 26, 0.8, 10);
}

/** The Bureau's board: its mark and motto, and the morning's certification. */
function paintBureauBoard(ctx, p, r) {
  bureauWall(ctx, p, r);
  plate(ctx, 30, 34, T - 60, 400, p, { tones: DARK, bevel: 4, ink: 2 });
  // The Bureau's mark: an hourglass in a ring.
  const cx = T / 2, cy = 86;
  ctx.strokeStyle = "#d8dce4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.moveTo(cx - 14, cy - 18);
  ctx.lineTo(cx + 14, cy - 18);
  ctx.lineTo(cx - 14, cy + 18);
  ctx.lineTo(cx + 14, cy + 18);
  ctx.closePath();
  ctx.stroke();
  say(ctx, "THE BUREAU · REGIONAL DESK", T / 2, 136, 18, "#e8ecf2", 900, T - 100);
  say(ctx, "TIME REVEALS ALL", T / 2, 160, 12, GOLD, 800);
  plate(ctx, 50, 180, T - 100, 236, p, { tones: ["#f2f4f2", "#e6e8e6", "#c8ccca"], bevel: 2, ink: 1.5, spec: false });
  onScreen(ctx, () => {
    text(ctx, "CERTIFICATION — D-SERIES PLATE", T / 2, 202, 16, "#1a2a5a", 900, "center", T - 130);
    text(ctx, "BADGE 11235 · SIGN-OFF BY 12:00", T / 2, 224, 12, "#5a2a1a", 800, "center", T - 130);
    ["WEAPONS", "MOBILITY", "COMBAT", "TELEMETRY"].forEach((t, i) => {
      const y = 258 + i * 34;
      ctx.strokeStyle = "#1a2a5a";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(80, y - 10, 20, 20);
      text(ctx, t, 116, y, 16, "#1a2a5a", 900, "left");
      text(ctx, "AWAITING R&D", T - 76, y, 11, "#5a6a8a", 800, "right");
    });
    text(ctx, "INSPECTOR ON SITE FROM 09:00", T / 2, 398, 12, "#a8281e", 900, "center", T - 130);
  });
}

export const PAINTERS = {
  [W.STONE]: (ctx, p, r) => marble(ctx, p, r),
  [W.BALCONY]: paintBalcony,
  [W.COLUMN]: paintColumn,
  [W.SEAL]: paintSeal,
  [W.BANNER]: paintBanner,
  [W.PLAQUE]: paintPlaque,
  [W.DIRECTORY]: paintDirectory,
  [W.WINDOW_A]: paintWindow(0),
  [W.WINDOW_B]: paintWindow(1),
  [W.WINDOW_C]: paintWindow(2),
  [W.ENTRANCE]: paintEntrance,
  [W.PLANTER]: paintPlanter,
  [W.FOUNTAIN]: paintFountain,
  [W.CHECK_DESK]: paintCheckDesk,
  [W.CHECK_GATE]: paintCheckGate,
  [W.RECORDS]: paintRecords,
  [W.STACKS]: paintStacks,
  [W.BUREAU]: paintBureau,
  [W.BUREAU_BOARD]: paintBureauBoard,
};
