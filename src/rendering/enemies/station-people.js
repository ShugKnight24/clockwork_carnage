/**
 * Legacy sprites for the station's people (js/npc.js): patrol officers in
 * duty blues, the same officers in heavy kit, Supervisor Simon, and the
 * office floor's staff and clerks. Drawn front-on, or from behind when they
 * face away from the camera (`away`), in the sprite box the enemies use.
 * A walker's legs and arms swing with its step cycle (`stride`, advanced by
 * the ground covered), the body rising over each step and leaning into
 * turns; standing, the weight shifts now and then. A held `gesture` (salute,
 * point; for civilians also cower, frozen, slumped) eases the arm in and out.
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
  // The Supervisor in his own plate after 06:47: the squads' kit, gold
  // trim and rank boards, the visor up so his face shows.
  supervisorKit: {
    coat: "#4f5a6e",
    coatDark: "#323a48",
    legs: "#262c37",
    trim: "#e0b84a",
    hat: "helmet",
    visorUp: true,
    rank: true,
    skin: "#d8a982",
    hair: "#9a9a9a",
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
  // The civilians, two looks each (npc.look): no cap, lighter clothes, a lanyard.
  staff: [
    { coat: "#e8ecf0", coatDark: "#b4bcc6", shirt: "#3a8f88", legs: "#4a4f58", trim: "#2f7fd0", hat: null, civ: "labcoat", skin: "#e3b892", hair: "#2a1d16", style: "short", goggles: true },
    { coat: "#5a7276", coatDark: "#3e5256", shirt: "#5a7276", legs: "#4e6569", trim: "#d0802f", hat: null, civ: "coveralls", skin: "#8a5a3c", hair: "#151010", style: "bun" },
  ],
  clerk: [
    { coat: "#94505a", coatDark: "#6a343c", shirt: "#c4d6ea", legs: "#3e3b44", trim: "#c23a5a", hat: null, civ: "cardigan", skin: "#f0caa6", hair: "#6a4428", style: "long" },
    { coat: "#9e7a50", coatDark: "#74583a", shirt: "#f0f0ec", legs: "#34313a", trim: "#3aa07a", hat: null, civ: "blazer", skin: "#6e4630", hair: "#17120f", style: "curly", glasses: true },
  ],
};

/** Seconds a gesture's arm takes to come up, or go down. */
const GESTURE_EASE = 0.16;

function hashOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A stable pick per person, so one officer keeps one face across frames. */
function pick(list, id) {
  return list[hashOf(id) % list.length];
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

/** How far into a held gesture the arm is, 0 (at rest) to 1, easing both ways. */
function gestureAmount(npc) {
  if (!npc.gesture) return 0;
  const left = Number.isFinite(npc._gestureLeft) ? npc._gestureLeft : Infinity;
  const t = Math.min(1, (npc.gestureT ?? 1) / GESTURE_EASE, left / GESTURE_EASE);
  return t * t * (3 - 2 * t);
}

export function renderStationPerson(ctx, screenX, centerY, halfW, halfH, bodyTop, bodyBottom, bodyWidth, baseColor, darkColor, alpha, time, npc, hitFlash, away = false) {
  const looks = LOOKS[npc.enemyType] ?? LOOKS.officer;
  const look = Array.isArray(looks) ? looks[Number.isInteger(npc.look) ? Math.abs(npc.look) % looks.length : Math.abs(hashOf(npc.id || "")) % looks.length] : looks;
  const H = halfH;
  const x = screenX;
  const y = (f) => centerY + H * f;
  const skin = look.skin ?? pick(SKIN, npc.id || "");
  const hair = look.hair ?? pick(HAIR, `${npc.id}h`);
  const kit = look.hat === "helmet";
  const civ = look.civ ?? null;
  const walking = npc.walking || npc.settling;
  // The step cycle: one swing of each leg per `stride` 0..1, scaled by how
  // fast they are going, so starting and stopping ease the swing in and out.
  const pace = walking ? Math.min(1, (npc.moveSpeed ?? npc.speed ?? 1.5) / 1.2) : 0;
  const cyc = (npc.stride ?? 0) * Math.PI * 2;
  const swing = Math.sin(cyc) * pace;
  const bob = walking ? (1 - Math.cos(cyc * 2)) * 0.5 * H * 0.018 * pace : 0;
  // A gesture blends in; the civilians' whole-body poses take over.
  const held = walking ? null : npc.gesture;
  const gk = gestureAmount(npc);
  const body = held === "cower" || held === "frozen" || held === "slumped" ? held : null;
  const sh = (kit ? 0.24 : 0.2) * H; // half the shoulders
  const hip = 0.15 * H;
  const leg = 0.1 * H;
  const arm = (kit ? 0.085 : 0.07) * H;
  // Cowering and sitting drop the upper body toward the floor.
  const drop = (body === "cower" ? 0.2 : body === "slumped" ? 0.5 : 0) * H * gk;

  ctx.save();
  // Lean into a turn, sway over the planted foot, or (standing) shift weight
  // now and then; all about the feet. Someone frozen in time does none of it.
  let rot = (npc.lean ?? 0) * (away ? 1 : -1) + Math.sin(cyc) * 0.012 * pace;
  let shift = Math.sin(cyc) * H * 0.012 * pace;
  if (!walking && body !== "frozen") {
    const w = Math.sin(time * 0.00042 + (hashOf(npc.id || "") % 97));
    const k = Math.sign(w) * Math.min(1, Math.abs(w) * 3);
    rot += k * 0.01;
    shift += k * H * 0.008;
  }
  if (body === "frozen") rot += 0.1 * gk;
  if (body === "slumped") rot += 0.08 * gk;
  ctx.translate(x + shift, y(0.86));
  ctx.rotate(rot);
  ctx.translate(-x, -y(0.86));
  ctx.translate(0, -bob);

  // Contact shadow on the floor.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y(0.86) + bob, sh * 1.2, H * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs, then boots.
  const stride = (body === "frozen" ? 0.9 : swing) * H * 0.08;
  for (const side of [-1, 1]) {
    const lx = x + side * hip * 0.5;
    let fx = lx + side * stride;
    let footY = y(0.8);
    if (body === "slumped" || body === "cower") {
      // Knees out, feet apart: sat on the floor, or down on the haunches.
      fx = lx + side * H * (body === "slumped" ? 0.2 : 0.09) * gk;
      footY = y(body === "slumped" ? 0.84 : 0.8);
      const kx = lx + side * H * 0.14 * gk;
      const ky = (y(0.14) + drop + footY) / 2 - H * 0.08 * gk;
      limb(ctx, lx, y(0.14) + drop, kx, ky, leg, look.legs);
      limb(ctx, kx, ky, fx, footY, leg, look.legs);
    } else {
      // Frozen mid-stride: the back foot's heel off the floor.
      if (body === "frozen" && side < 0) footY -= H * 0.06 * gk;
      limb(ctx, lx, y(0.14), fx, footY, leg, look.legs);
    }
    if (kit) {
      ctx.fillStyle = look.coatDark;
      ctx.beginPath();
      ctx.roundRect(fx - leg * 0.6 + (lx - fx) * 0.45, y(0.44), leg * 1.2, H * 0.09, leg * 0.3);
      ctx.fill();
    }
    ctx.fillStyle = civ ? "#2a2018" : "#121216";
    ctx.beginPath();
    ctx.roundRect(fx - leg * 0.62, footY - H * 0.02, leg * 1.24, H * 0.07, [leg * 0.4, leg * 0.4, leg * 0.15, leg * 0.15]);
    ctx.fill();
  }
  // The upper body sits lower when crouched or sat down.
  ctx.translate(0, drop);
  // Supervisor's trouser crease, officers' stripe down the leg.
  if (!kit && !civ && !body) {
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

  // Arms behind the torso swing opposite the legs: the one going forward
  // comes up and in a little, the one going back hangs out.
  const gesture = held;
  const armY = y(-0.36);
  const handL = { x: x - sh - arm * 0.2 - swing * H * 0.03, y: y(0.16) - Math.max(0, swing) * H * 0.04 };
  let handR = { x: x + sh + arm * 0.2 + swing * H * 0.03, y: y(0.16) - Math.max(0, -swing) * H * 0.04 };
  let elbowR = null;
  let elbowL = null;
  const mixP = (a, b) => ({ x: a.x + (b.x - a.x) * gk, y: a.y + (b.y - a.y) * gk });
  if (gesture === "salute" && civ) {
    // A raised hand, for a civilian.
    elbowR = mixP({ x: x + sh + arm * 0.2, y: y(-0.1) }, { x: x + sh + H * 0.16, y: y(-0.5) });
    handR = mixP(handR, { x: x + sh + H * 0.2, y: y(-0.8) });
  } else if (gesture === "salute" && !away) {
    elbowR = mixP({ x: x + sh + arm * 0.2, y: y(-0.1) }, { x: x + sh + H * 0.12, y: y(-0.4) });
    handR = mixP(handR, { x: x + H * 0.06, y: y(-0.66) });
  } else if (gesture === "point") {
    handR = mixP(handR, { x: x + sh + H * 0.42, y: y(-0.4) });
  } else if (body === "cower") {
    // Forearms up over the head.
    elbowL = mixP({ x: x - sh, y: y(-0.1) }, { x: x - sh - H * 0.08, y: y(-0.62) });
    elbowR = mixP({ x: x + sh, y: y(-0.1) }, { x: x + sh + H * 0.08, y: y(-0.62) });
    Object.assign(handL, mixP(handL, { x: x + H * 0.04, y: y(-0.76) }));
    handR = mixP(handR, { x: x - H * 0.04, y: y(-0.74) });
  } else if (body === "frozen") {
    // One hand reaching ahead, caught.
    elbowR = mixP({ x: x + sh, y: y(-0.1) }, { x: x + sh + H * 0.16, y: y(-0.3) });
    handR = mixP(handR, { x: x + sh + H * 0.32, y: y(-0.36) });
    Object.assign(handL, mixP(handL, { x: x - sh - H * 0.06, y: y(0.0) }));
  } else if (body === "slumped") {
    // Hands fallen to the floor beside them.
    Object.assign(handL, mixP(handL, { x: x - sh - H * 0.1, y: y(0.3) }));
    handR = mixP(handR, { x: x + sh + H * 0.08, y: y(0.32) });
  }
  if (kit) {
    // Rifle carried at the low ready, across the body.
    handL.x = x - sh * 0.2;
    handL.y = y(0.02);
    if (!gesture) handR = { x: x + sh * 0.55, y: y(-0.1) };
  }
  const drawArms = () => {
    if (elbowL) {
      limb(ctx, x - sh, armY, elbowL.x, elbowL.y, arm, look.coatDark);
      limb(ctx, elbowL.x, elbowL.y, handL.x, handL.y, arm, look.coatDark);
    } else {
      limb(ctx, x - sh, armY, handL.x, handL.y, arm, look.coatDark);
    }
    if (elbowR) {
      limb(ctx, x + sh, armY, elbowR.x, elbowR.y, arm, look.coatDark);
      limb(ctx, elbowR.x, elbowR.y, handR.x, handR.y, arm, look.coatDark);
    } else {
      limb(ctx, x + sh, armY, handR.x, handR.y, arm, look.coatDark);
    }
  };
  // Cowering, the arms come over the head, so they are drawn after it.
  if (body !== "cower") drawArms();

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
    if (look.rank) {
      // His rank boards on the pauldrons.
      ctx.fillStyle = look.trim;
      for (const side of [-1, 1]) for (const k of [0, 1]) ctx.fillRect(x + side * sh * 0.95 - sh * 0.14, y(-0.45) + k * H * 0.025, sh * 0.28, H * 0.014);
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
  } else if (civ) {
    const cov = civ === "coveralls";
    if (civ === "labcoat") {
      // The coat's skirt, to the knee, over the trousers.
      ctx.fillStyle = look.coat;
      ctx.beginPath();
      ctx.moveTo(x - hip * 1.1, y(0.1));
      ctx.lineTo(x + hip * 1.1, y(0.1));
      ctx.lineTo(x + hip * 1.35, y(0.46));
      ctx.lineTo(x - hip * 1.35, y(0.46));
      ctx.closePath();
      ctx.fill();
    }
    if (!away) {
      if (cov) {
        // Zip, hi-vis band across the chest.
        ctx.fillStyle = "#1a2628";
        ctx.fillRect(x - H * 0.006, y(-0.44), H * 0.012, H * 0.55);
        ctx.fillStyle = "#d8d27a";
        ctx.fillRect(x - sh * 0.95, y(-0.24), sh * 1.9, H * 0.035);
      } else {
        // The shirt down the open front, and the lapels' edges.
        ctx.fillStyle = look.shirt;
        ctx.beginPath();
        ctx.moveTo(x - sh * 0.34, y(-0.45));
        ctx.lineTo(x + sh * 0.34, y(-0.45));
        ctx.lineTo(x + sh * 0.16, y(civ === "labcoat" ? 0.46 : 0.15));
        ctx.lineTo(x - sh * 0.16, y(civ === "labcoat" ? 0.46 : 0.15));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = look.coatDark;
        ctx.lineWidth = Math.max(1, H * 0.014);
        ctx.beginPath();
        ctx.moveTo(x - sh * 0.38, y(-0.45));
        ctx.lineTo(x - sh * 0.16, y(-0.15));
        ctx.moveTo(x + sh * 0.38, y(-0.45));
        ctx.lineTo(x + sh * 0.16, y(-0.15));
        ctx.stroke();
        if (civ === "labcoat") {
          // Pens in the breast pocket.
          ctx.fillStyle = "#2f6fd0";
          ctx.fillRect(x - sh * 0.75, y(-0.34), H * 0.012, H * 0.06);
          ctx.fillStyle = "#c23a3a";
          ctx.fillRect(x - sh * 0.66, y(-0.33), H * 0.012, H * 0.05);
        }
      }
      // The ID card on its lanyard.
      ctx.strokeStyle = look.trim;
      ctx.lineWidth = Math.max(1, H * 0.012);
      ctx.beginPath();
      ctx.moveTo(x - sh * 0.3, y(-0.46));
      ctx.lineTo(x - H * 0.015, y(-0.24));
      ctx.lineTo(x + sh * 0.3, y(-0.46));
      ctx.stroke();
      ctx.fillStyle = "#eef1f4";
      ctx.fillRect(x - H * 0.035, y(-0.24), H * 0.07, H * 0.09);
      ctx.fillStyle = look.trim;
      ctx.fillRect(x - H * 0.035, y(-0.24), H * 0.07, H * 0.022);
    } else {
      ctx.strokeStyle = look.trim;
      ctx.lineWidth = Math.max(1, H * 0.012);
      ctx.beginPath();
      ctx.moveTo(x - sh * 0.3, y(-0.47));
      ctx.quadraticCurveTo(x, y(-0.42), x + sh * 0.3, y(-0.47));
      ctx.stroke();
      if (cov) {
        ctx.fillStyle = "#d8d27a";
        ctx.fillRect(x - sh * 0.95, y(-0.24), sh * 1.9, H * 0.035);
      } else {
        ctx.strokeStyle = look.coatDark;
        ctx.beginPath();
        ctx.moveTo(x, y(-0.42));
        ctx.lineTo(x, y(civ === "labcoat" ? 0.46 : 0.17));
        ctx.stroke();
      }
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

  // Belt (a tool belt on coveralls; none shows under a lab coat).
  ctx.fillStyle = kit ? "#1d2026" : civ === "coveralls" ? "#3a2a1a" : "#101114";
  if (civ !== "labcoat") ctx.fillRect(x - hip * 1.08, y(0.1), hip * 2.16, H * 0.05);
  if (!kit && !civ && !away) {
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

  // Neck and head (bowed when cowering, fallen to a shoulder when slumped).
  const hx = x + (body === "slumped" ? H * 0.04 * gk : 0);
  const hy = y(-0.6) + (body === "cower" || body === "slumped" ? H * 0.05 * gk : 0);
  const hr = H * 0.1;
  if (civ && look.style === "long") {
    // Hair to the shoulders, behind the head.
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.roundRect(hx - hr * 1.02, hy - hr * 0.4, hr * 2.04, hr * 2.1, hr * 0.5);
    ctx.fill();
  }
  if (civ && look.style === "bun") {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(hx + (away ? 0 : hr * 0.4), hy - hr * 1.05, hr * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
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
    } else if (look.visorUp) {
      // Visor pushed up on the brow: his eyes, and the grey moustache.
      ctx.fillStyle = skin;
      ctx.fillRect(hx - hr * 0.7, hy - hr * 0.1, hr * 1.4, hr * 0.9);
      ctx.fillStyle = "#1a1410";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hx + side * hr * 0.34, hy + hr * 0.12, Math.max(0.8, hr * 0.09), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = look.hair;
      ctx.fillRect(hx - hr * 0.3, hy + hr * 0.44, hr * 0.6, Math.max(1, hr * 0.12));
      ctx.fillStyle = "#10141a";
      ctx.fillRect(hx - hr * 0.86, hy - hr * 0.42, hr * 1.72, hr * 0.26);
      ctx.fillStyle = look.trim;
      ctx.globalAlpha *= 0.75 + Math.sin(time * 0.004) * 0.15;
      ctx.fillRect(hx - hr * 0.7, hy - hr * 0.36, hr * 1.4, hr * 0.08);
      ctx.globalAlpha = alpha;
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
    else if (civ) ctx.ellipse(hx, hy - hr * 0.25, hr * 0.95, hr * 0.85, 0, Math.PI, 0);
    else ctx.ellipse(hx, hy - hr * 0.45, hr * 0.88, hr * 0.6, 0, Math.PI, 0);
    ctx.fill();
    if (civ && look.style === "curly") {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(hx - hr * 0.72 + i * hr * 0.36, hy - hr * (0.82 - Math.abs(i - 2) * 0.12), hr * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
      if (look.glasses) {
        ctx.strokeStyle = "#141418";
        ctx.lineWidth = Math.max(1, hr * 0.08);
        for (const side of [-1, 1]) ctx.strokeRect(hx + side * hr * 0.34 - hr * 0.22, hy - hr * 0.14, hr * 0.44, hr * 0.32);
      }
    }
    if (look.goggles) {
      // Safety goggles pushed up on the forehead.
      ctx.fillStyle = "#1d2a33";
      ctx.fillRect(hx - hr * 0.95, hy - hr * 0.62, hr * 1.9, hr * 0.2);
      if (!away) {
        ctx.fillStyle = "#8fc8e8";
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(hx + side * hr * 0.4, hy - hr * 0.55, hr * 0.3, hr * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
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
  if (body === "cower") {
    drawArms();
    ctx.fillStyle = skin;
    for (const hnd of [handL, handR]) {
      ctx.beginPath();
      ctx.arc(hnd.x, hnd.y, arm * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
