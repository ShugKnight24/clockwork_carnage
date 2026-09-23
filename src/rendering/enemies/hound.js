/**
 * The Hound (suit C-0016), Legacy style: the same empty C-series suit on all
 * fours as the vector sprite (src/rendering/svg-art/sprites/creatures.js
 * `hound`), drawn procedurally in the sprite's own units (x across the
 * column, the floor at +86, one unit = halfH / 100): digitigrade suit legs,
 * the arms as forelegs splayed into talons, a hunched back with a ridge of
 * heat-sink quills, and a helmet open on nothing but an ember.
 *
 * Its tells read here too: coiled low with the ridge flat before a lunge,
 * stretched out on the sprint, the ridge standing and white-hot before a
 * quill volley.
 */
const SOLE = 86;

function pose(enemy, time) {
  if (enemy.painTimer > 0) return { lean: -0.2, crouch: 0, quill: 0.2, fore: 0.1, hind: -0.1, reach: 0 };
  if (enemy._quillState === "bristle") return { lean: -0.06, crouch: 6, quill: 1, fore: 0.3, hind: -0.2, reach: 0, hot: 1 };
  if (enemy._chargeState === "windup") return { lean: 0.12, crouch: 16, quill: -0.4, fore: -0.25, hind: 0.3, reach: 0, hot: 0.5 };
  if (enemy._chargeState === "sprint") return { lean: -0.14, crouch: -12, quill: -0.5, fore: 0.9, hind: -0.7, reach: 1 };
  const g = Math.sin(time * 0.012 + enemy.x * 3);
  const moving = enemy._moveSpeed > 0;
  return { lean: moving ? g * 0.05 : 0, crouch: moving ? Math.abs(g) * -4 : 0, quill: 0, fore: moving ? g * 0.5 : 0, hind: moving ? -g * 0.45 : 0, reach: 0 };
}

export function renderHound(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, enemy, hitFlash) {
  const u = (halfH / 100) * 1.1;
  const b = pose(enemy, time);
  const plate = hitFlash ? "#ffffff" : baseColor || "#e8c9a0";
  const dark = darkColor || "#3a2a1e";
  const ink = "#140c06";
  const bob = b.crouch;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(screenX, centerY);
  ctx.scale(u, u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // A soft light that keeps the shimmer's alpha (draw-utils' drawGlow resets it).
  const drawGlow = (_c, x, y, r, color, strength) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = alpha * strength;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawGlow(ctx, 0, SOLE, 70, "rgba(0,0,0,0.45)", 0.6);

  const limb = (pts, w, color) => {
    ctx.strokeStyle = ink;
    ctx.lineWidth = w + 3;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
  };
  const hindLeg = (hx, hy, swing, color) => {
    const foot = [hx + Math.sin(swing) * 34, SOLE - 3];
    const knee = [hx + 16, (hy + foot[1]) / 2 - 6];
    const ankle = [foot[0] - 12, foot[1] - 16];
    limb([[hx, hy], knee, ankle, foot], 14, color);
  };
  const foreLeg = (sx, sy, swing, color) => {
    const hand = [sx + 8 + Math.sin(swing) * 38 + b.reach * 20, SOLE - 4 - b.reach * 22];
    const elbow = [(sx + hand[0]) / 2 - 12 + b.reach * 10, (sy + hand[1]) / 2 + 2];
    limb([[sx, sy], elbow, hand], 15, color);
    ctx.strokeStyle = hitFlash ? "#fff" : "#d8c4a4";
    ctx.lineWidth = 3;
    for (const [dx, dy] of [[16, -2], [20, 2], [14, 5]]) {
      ctx.beginPath();
      ctx.moveTo(hand[0], hand[1] - 2);
      ctx.lineTo(hand[0] + dx, hand[1] + dy - b.reach * 6);
      ctx.stroke();
    }
  };

  // Far legs, darker, behind the body.
  hindLeg(-44, -2 + bob, -b.hind * 0.7, dark);
  foreLeg(36, -14 + bob, -b.fore * 0.7, dark);

  ctx.save();
  ctx.translate(-4, -10 + bob);
  ctx.rotate(b.lean);
  ctx.translate(4, 10 - bob);

  // Quills: heat-sink fins along the ridge, laid back, or standing.
  const roots = [[-48, -24], [-34, -34], [-19, -41], [-4, -45], [11, -44], [25, -38]];
  roots.forEach(([qx, qy], i) => {
    const a = (-2.25 + b.quill * 0.72) + (i - 2.5) * 0.05; // radians from +x
    const len = 22 + (i === 2 || i === 3 ? 8 : 3);
    const rx = qx, ry = qy + bob;
    const tx = rx + Math.cos(a) * len, ty = ry + Math.sin(a) * len;
    ctx.fillStyle = hitFlash ? "#fff" : "#8a7a66";
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx + Math.cos(a + Math.PI / 2) * 3.5, ry + Math.sin(a + Math.PI / 2) * 3.5);
    ctx.lineTo(tx, ty);
    ctx.lineTo(rx - Math.cos(a + Math.PI / 2) * 3.5, ry - Math.sin(a + Math.PI / 2) * 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (b.hot) drawGlow(ctx, tx, ty, 6 + 6 * b.hot, "rgba(255,200,120,0.9)", 0.9);
    else {
      ctx.fillStyle = "#ffb45a";
      ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
    }
  });

  // The suit's hunched back and chest.
  ctx.fillStyle = plate;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-64, 4 + bob);
  ctx.quadraticCurveTo(-66, -26 + bob, -40, -34 + bob);
  ctx.quadraticCurveTo(-4, -56 + bob, 34, -40 + bob);
  ctx.quadraticCurveTo(54, -32 + bob, 54, -12 + bob);
  ctx.lineTo(50, 10 + bob);
  ctx.quadraticCurveTo(10, 20 + bob, -40, 16 + bob);
  ctx.quadraticCurveTo(-60, 14 + bob, -64, 4 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Undersuit, torn open over nothing.
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-58, 8 + bob);
  ctx.quadraticCurveTo(-8, 26 + bob, 50, 4 + bob);
  ctx.quadraticCurveTo(10, 20 + bob, -40, 16 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#050302";
  ctx.beginPath();
  ctx.ellipse(1, 6 + bob, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  drawGlow(ctx, 2, 6 + bob, 8, "rgba(255,120,40,0.7)", 0.8);
  // Pauldron.
  ctx.fillStyle = hitFlash ? "#fff" : "#f2dcb8";
  ctx.beginPath();
  ctx.moveTo(18, -30 + bob);
  ctx.lineTo(48, -34 + bob);
  ctx.lineTo(56, -10 + bob);
  ctx.lineTo(26, -2 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // The helmet: open on nothing but an ember.
  const hx = 66, hy = -14 + bob;
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.ellipse(hx + 2, hy, 21, 17, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#050302";
  ctx.beginPath();
  ctx.moveTo(hx + 4, hy - 10);
  ctx.lineTo(hx + 22, hy - 6);
  ctx.lineTo(hx + 22, hy + 6);
  ctx.lineTo(hx + 6, hy + 6);
  ctx.closePath();
  ctx.fill();
  const hot = b.hot || enemy._chargeState === "sprint" ? 1 : 0;
  drawGlow(ctx, hx + 14, hy - 1, 5 + hot * 4, "rgba(255,176,32,0.95)", 1);
  ctx.strokeStyle = "#ffd890";
  ctx.lineWidth = 1.2;
  const hand = time * 0.004;
  ctx.beginPath();
  ctx.moveTo(hx + 14, hy - 1);
  ctx.lineTo(hx + 14 + Math.cos(hand) * 4, hy - 1 + Math.sin(hand) * 4);
  ctx.stroke();
  ctx.restore();

  // Near legs, in front.
  hindLeg(-44, -2 + bob, b.hind, plate);
  foreLeg(36, -14 + bob, b.fore, plate);

  ctx.restore();
}
