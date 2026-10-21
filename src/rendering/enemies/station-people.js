/**
 * Legacy sprites for the station's people (js/npc.js): patrol officers in
 * duty blues, the same officers in heavy kit, and Supervisor Simon. Drawn
 * front-on, or from behind when they face away from the camera (`away`), in
 * the sprite box the enemies use; a walking officer swings arms and legs,
 * and a held `gesture` (salute, point) raises the right arm.
 *
 * Heights are fractions of halfH from the screen centre line: the head tops
 * out near -0.8 and the boots meet the floor near +0.85.
 */

const SKIN = ["#e3b892", "#c48a5e", "#8a5a3c", "#f0caa6", "#a8714a", "#6e4630"];
const HAIR = ["#1d1712", "#3a2618", "#120e0c", "#5a3b22", "#26201c"];

const LOOKS = {
  officer: {
    coat: "#33558c",
    coatDark: "#203a66",
    legs: "#18243d",
    trim: "#d9b44a",
    hat: "cap",
  },
  officerKit: {
    coat: "#4f5a6e",
    coatDark: "#323a48",
    legs: "#262c37",
    trim: "#8fd8ff",
    hat: "helmet",
  },
  supervisor: {
    coat: "#41475a",
    coatDark: "#2b2f3c",
    legs: "#23262f",
    trim: "#c03a3a",
    hat: null,
    skin: "#d8a982",
    hair: "#9a9a9a",
  },
};

/** A stable pick per person, so one officer keeps one face across frames. */
function pick(list, id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}

function limb(ctx, x0, y0, x1, y1, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function renderStationPerson(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, npc, hitFlash, away = false) {
  const look = LOOKS[npc.enemyType] ?? LOOKS.officer;
  const H = halfH;
  const x = screenX;
  const y = (f) => centerY + H * f;
  const skin = look.skin ?? pick(SKIN, npc.id || "");
  const hair = look.hair ?? pick(HAIR, `${npc.id}h`);
  const kit = look.hat === "helmet";
  const walking = npc.walking;
  const swing = walking ? Math.sin(time * 0.009 * (npc.speed || 1.5)) : 0;
  const bob = walking ? Math.abs(swing) * H * 0.015 : 0;
  const sh = (kit ? 0.24 : 0.2) * H; // half the shoulders
  const hip = 0.15 * H;
  const leg = 0.1 * H;
  const arm = (kit ? 0.085 : 0.07) * H;

  ctx.save();
  ctx.translate(0, -bob);

  // Contact shadow on the floor.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y(0.86) + bob, sh * 1.2, H * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs, then boots.
  const stride = swing * H * 0.08;
  for (const side of [-1, 1]) {
    const lx = x + side * hip * 0.5;
    const fx = lx + side * stride;
    limb(ctx, lx, y(0.14), fx, y(0.8), leg, look.legs);
    if (kit) {
      ctx.fillStyle = look.coatDark;
      ctx.beginPath();
      ctx.roundRect(fx - leg * 0.6 + (lx - fx) * 0.45, y(0.44), leg * 1.2, H * 0.09, leg * 0.3);
      ctx.fill();
    }
    ctx.fillStyle = "#121216";
    ctx.beginPath();
    ctx.roundRect(fx - leg * 0.62, y(0.78), leg * 1.24, H * 0.07, [leg * 0.4, leg * 0.4, leg * 0.15, leg * 0.15]);
    ctx.fill();
  }
  // Supervisor's trouser crease, officers' stripe down the leg.
  if (!kit) {
    ctx.strokeStyle = npc.enemyType === "supervisor" ? "rgba(255,255,255,0.08)" : "rgba(120,160,230,0.35)";
    ctx.lineWidth = Math.max(1, H * 0.012);
    for (const side of [-1, 1]) {
      const lx = x + side * hip * 0.5;
      ctx.beginPath();
      ctx.moveTo(lx + side * leg * 0.3, y(0.18));
      ctx.lineTo(lx + side * (leg * 0.3 + stride), y(0.76));
      ctx.stroke();
    }
  }

  // Arms behind the torso swing opposite the legs.
  const gesture = walking ? null : npc.gesture;
  const armY = y(-0.36);
  const handL = { x: x - sh - arm * 0.2 - swing * H * 0.03, y: y(0.16) };
  let handR = { x: x + sh + arm * 0.2 + swing * H * 0.03, y: y(0.16) };
  let elbowR = null;
  if (gesture === "salute" && !away) {
    elbowR = { x: x + sh + H * 0.12, y: y(-0.4) };
    handR = { x: x + H * 0.06, y: y(-0.66) };
  } else if (gesture === "point") {
    handR = { x: x + sh + H * 0.42, y: y(-0.4) };
  }
  if (kit) {
    // Rifle carried at the low ready, across the body.
    handL.x = x - sh * 0.2;
    handL.y = y(0.02);
    if (!gesture) handR = { x: x + sh * 0.55, y: y(-0.1) };
  }
  limb(ctx, x - sh, armY, handL.x, handL.y, arm, look.coatDark);
  if (elbowR) {
    limb(ctx, x + sh, armY, elbowR.x, elbowR.y, arm, look.coatDark);
    limb(ctx, elbowR.x, elbowR.y, handR.x, handR.y, arm, look.coatDark);
  } else {
    limb(ctx, x + sh, armY, handR.x, handR.y, arm, look.coatDark);
  }

  // Torso: shoulders wider than the waist.
  ctx.fillStyle = look.coat;
  ctx.beginPath();
  ctx.moveTo(x - sh, y(-0.44));
  ctx.quadraticCurveTo(x, y(-0.48), x + sh, y(-0.44));
  ctx.quadraticCurveTo(x + sh * 1.08, y(-0.34), x + sh * 0.95, y(-0.2));
  ctx.lineTo(x + hip * 1.05, y(0.17));
  ctx.lineTo(x - hip * 1.05, y(0.17));
  ctx.lineTo(x - sh * 0.95, y(-0.2));
  ctx.quadraticCurveTo(x - sh * 1.08, y(-0.34), x - sh, y(-0.44));
  ctx.closePath();
  ctx.fill();
  // Light from the right, shade on the left, as the enemies are lit.
  const shade = ctx.createLinearGradient(x - sh, 0, x + sh, 0);
  shade.addColorStop(0, "rgba(0,0,0,0.3)");
  shade.addColorStop(0.55, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(255,255,255,0.12)");
  ctx.fillStyle = shade;
  ctx.fill();

  if (kit) {
    // Plate carrier, shoulder pads and the rifle.
    ctx.fillStyle = look.coatDark;
    ctx.beginPath();
    ctx.roundRect(x - sh * 0.72, y(-0.38), sh * 1.44, H * 0.42, H * 0.03);
    ctx.fill();
    if (!away) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let p = 0; p < 3; p++) ctx.fillRect(x - sh * 0.6 + p * sh * 0.42, y(-0.12), sh * 0.32, H * 0.1);
      ctx.fillStyle = look.trim;
      ctx.fillRect(x - sh * 0.35, y(-0.3), sh * 0.7, H * 0.025);
    }
    ctx.fillStyle = look.coat;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * sh * 0.95, y(-0.42), sh * 0.32, H * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!away) {
      ctx.save();
      ctx.translate(x, y(-0.04));
      ctx.rotate(-0.5);
      ctx.fillStyle = "#1b1d22";
      ctx.fillRect(-sh * 0.9, -H * 0.025, sh * 1.9, H * 0.05);
      ctx.fillRect(-sh * 0.2, H * 0.02, sh * 0.16, H * 0.07);
      ctx.fillStyle = "#2c3038";
      ctx.fillRect(sh * 0.9, -H * 0.015, sh * 0.5, H * 0.03);
      ctx.restore();
    }
  } else if (npc.enemyType === "supervisor") {
    if (!away) {
      // Shirt, tie and lapels in the open jacket.
      ctx.fillStyle = "#e8e6df";
      ctx.beginPath();
      ctx.moveTo(x - sh * 0.32, y(-0.45));
      ctx.lineTo(x + sh * 0.32, y(-0.45));
      ctx.lineTo(x, y(-0.08));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = look.trim;
      ctx.beginPath();
      ctx.moveTo(x - H * 0.022, y(-0.43));
      ctx.lineTo(x + H * 0.022, y(-0.43));
      ctx.lineTo(x + H * 0.03, y(-0.16));
      ctx.lineTo(x, y(-0.1));
      ctx.lineTo(x - H * 0.03, y(-0.16));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = look.coatDark;
      ctx.lineWidth = Math.max(1, H * 0.018);
      ctx.beginPath();
      ctx.moveTo(x - sh * 0.4, y(-0.45));
      ctx.lineTo(x - H * 0.02, y(-0.06));
      ctx.moveTo(x + sh * 0.4, y(-0.45));
      ctx.lineTo(x + H * 0.02, y(-0.06));
      ctx.stroke();
      ctx.fillStyle = "#c9c9c9";
      for (const by of [0.0, 0.08]) {
        ctx.beginPath();
        ctx.arc(x + H * 0.03, y(by), H * 0.01, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = look.coatDark;
      ctx.lineWidth = Math.max(1, H * 0.012);
      ctx.beginPath();
      ctx.moveTo(x, y(-0.42));
      ctx.lineTo(x, y(0.17));
      ctx.stroke();
    }
  } else {
    // Duty uniform: shoulder epaulettes, badge, pockets, belt and radio.
    ctx.fillStyle = look.coatDark;
    for (const side of [-1, 1]) ctx.fillRect(x + side * sh * 0.95 - (side > 0 ? sh * 0.4 : 0), y(-0.455), sh * 0.4, H * 0.025);
    if (!away) {
      ctx.fillStyle = look.coatDark;
      ctx.beginPath();
      ctx.moveTo(x - sh * 0.22, y(-0.45));
      ctx.lineTo(x, y(-0.36));
      ctx.lineTo(x + sh * 0.22, y(-0.45));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#16233d";
      ctx.fillRect(x - H * 0.012, y(-0.4), H * 0.024, H * 0.24);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x - sh * 0.7, y(-0.3), sh * 0.45, H * 0.09);
      ctx.fillRect(x + sh * 0.25, y(-0.3), sh * 0.45, H * 0.09);
      ctx.fillStyle = look.trim;
      ctx.beginPath();
      ctx.moveTo(x - sh * 0.55, y(-0.34));
      ctx.lineTo(x - sh * 0.38, y(-0.36));
      ctx.lineTo(x - sh * 0.36, y(-0.29));
      ctx.lineTo(x - sh * 0.465, y(-0.25));
      ctx.lineTo(x - sh * 0.57, y(-0.29));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0d0f14";
      ctx.fillRect(x + sh * 0.35, y(-0.4), H * 0.035, H * 0.06);
    }
  }

  // Belt.
  ctx.fillStyle = kit ? "#1d2026" : "#101114";
  ctx.fillRect(x - hip * 1.08, y(0.1), hip * 2.16, H * 0.05);
  if (!kit && !away) {
    ctx.fillStyle = npc.enemyType === "supervisor" ? "#9a9a9a" : look.trim;
    ctx.fillRect(x - H * 0.02, y(0.105), H * 0.04, H * 0.04);
    if (npc.enemyType !== "supervisor") {
      ctx.fillStyle = "#16171b";
      ctx.fillRect(x + hip * 0.55, y(0.1), H * 0.05, H * 0.08);
    }
  }

  // Hands.
  ctx.fillStyle = kit ? "#1d2026" : skin;
  for (const hnd of [handL, handR]) {
    ctx.beginPath();
    ctx.arc(hnd.x, hnd.y, arm * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  // Neck and head.
  const hx = x;
  const hy = y(-0.6);
  const hr = H * 0.1;
  ctx.fillStyle = skin;
  ctx.fillRect(hx - hr * 0.42, y(-0.52), hr * 0.84, H * 0.08);
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr * 0.86, hr, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kit) {
    // Helmet with a lit visor band.
    ctx.fillStyle = look.coat;
    ctx.beginPath();
    ctx.ellipse(hx, hy - hr * 0.12, hr * 1.04, hr * 1.02, 0, Math.PI, 0);
    ctx.lineTo(hx + hr * 1.04, hy + hr * 0.2);
    ctx.lineTo(hx - hr * 1.04, hy + hr * 0.2);
    ctx.closePath();
    ctx.fill();
    if (away) {
      // From behind: the shell's back and its neck guard hide the head.
      ctx.beginPath();
      ctx.ellipse(hx, hy + hr * 0.1, hr * 1.0, hr * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = look.coatDark;
      ctx.fillRect(hx - hr * 0.7, hy + hr * 0.55, hr * 1.4, hr * 0.4);
    } else {
      ctx.fillStyle = "#10141a";
      ctx.fillRect(hx - hr * 0.86, hy - hr * 0.08, hr * 1.72, hr * 0.38);
      ctx.fillStyle = look.trim;
      ctx.globalAlpha *= 0.75 + Math.sin(time * 0.004) * 0.15;
      ctx.fillRect(hx - hr * 0.7, hy + hr * 0.02, hr * 1.4, hr * 0.12);
      ctx.globalAlpha = alpha;
    }
  } else {
    // Hair: a cap of it on top, all of it from behind.
    ctx.fillStyle = hair;
    ctx.beginPath();
    if (away) ctx.ellipse(hx, hy - hr * 0.05, hr * 0.9, hr * 0.98, 0, 0, Math.PI * 2);
    else ctx.ellipse(hx, hy - hr * 0.45, hr * 0.88, hr * 0.6, 0, Math.PI, 0);
    ctx.fill();
    if (!away) {
      // Ears, eyes, brows, mouth.
      ctx.fillStyle = skin;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(hx + side * hr * 0.86, hy + hr * 0.05, hr * 0.14, hr * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#1a1410";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hx + side * hr * 0.34, hy + hr * 0.02, Math.max(0.8, hr * 0.09), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(hx + side * hr * 0.34 - hr * 0.16, hy - hr * 0.22, hr * 0.32, Math.max(1, hr * 0.07));
      }
      ctx.fillStyle = "rgba(90,40,30,0.7)";
      ctx.fillRect(hx - hr * 0.22, hy + hr * 0.5, hr * 0.44, Math.max(1, hr * 0.07));
      if (npc.enemyType === "supervisor") {
        // A grey moustache.
        ctx.fillStyle = look.hair;
        ctx.fillRect(hx - hr * 0.3, hy + hr * 0.36, hr * 0.6, Math.max(1, hr * 0.12));
      }
    }
    if (look.hat === "cap") {
      // Peaked patrol cap with a badge.
      ctx.fillStyle = "#16233d";
      ctx.beginPath();
      ctx.roundRect(hx - hr * 1.02, hy - hr * 1.12, hr * 2.04, hr * 0.62, [hr * 0.5, hr * 0.5, hr * 0.06, hr * 0.06]);
      ctx.fill();
      ctx.fillStyle = "#0b0f19";
      ctx.fillRect(hx - hr * 1.0, hy - hr * 0.56, hr * 2.0, hr * 0.12);
      if (!away) {
        ctx.beginPath();
        ctx.ellipse(hx, hy - hr * 0.46, hr * 0.95, hr * 0.16, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = look.trim;
        ctx.beginPath();
        ctx.arc(hx, hy - hr * 0.8, hr * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
