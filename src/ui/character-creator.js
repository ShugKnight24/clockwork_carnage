import {
  CHARACTER_COLORS,
  SKIN_TONES,
  HAIR_STYLES,
  EYE_COLORS,
  ARMOR_STYLES,
  HELMET_STYLES,
  VISOR_STYLES,
  SHOULDER_STYLES,
  BADGES,
  WEAPON_SKINS,
  LOADOUT_CLASSES,
  BACKSTORIES,
  VOICE_PROFILES,
} from "../../js/data.js";
import { unlockState } from "../systems/unlocks.js";

// ── Shared category definitions (used by render + click handler) ──

export const CREATOR_CATEGORIES = [
  { name: "NAME", shortLabel: "NAME", data: null, key: null },
  {
    name: "COLOR",
    shortLabel: "CLR",
    data: CHARACTER_COLORS,
    key: "colorIndex",
  },
  { name: "FACE", shortLabel: "FACE", data: SKIN_TONES, key: "skinToneIndex" },
  { name: "HAIR", shortLabel: "HAIR", data: HAIR_STYLES, key: "hairIndex" },
  { name: "EYES", shortLabel: "EYES", data: EYE_COLORS, key: "eyeIndex" },
  { name: "ARMOR", shortLabel: "ARMR", data: ARMOR_STYLES, key: "armorIndex" },
  { name: "HELMET", shortLabel: "HELM", data: HELMET_STYLES, key: "helmetIndex" },
  { name: "VISOR", shortLabel: "VSR", data: VISOR_STYLES, key: "visorIndex" },
  { name: "SHOULDER", shortLabel: "SHLD", data: SHOULDER_STYLES, key: "shoulderIndex" },
  { name: "BADGE", shortLabel: "BDGE", data: BADGES, key: "badgeIndex" },
  {
    name: "SKIN",
    shortLabel: "SKIN",
    data: WEAPON_SKINS,
    key: "weaponSkinIndex",
  },
  {
    name: "LOADOUT",
    shortLabel: "LOAD",
    data: LOADOUT_CLASSES,
    key: "loadoutIndex",
  },
  { name: "ORIGIN", shortLabel: "ORGN", data: BACKSTORIES, key: "backstoryIndex" },
  { name: "VOICE", shortLabel: "VOX", data: VOICE_PROFILES, key: "voiceIndex" },
];

// ── Layout calculator (shared between render + click detection) ──

export function getCreatorLayout(w, h, isMobile) {
  const titleY = isMobile ? 34 : 44;
  const tabGap = isMobile ? 4 : 8;
  const n = CREATOR_CATEGORIES.length;
  const tabW = Math.max(
    isMobile ? 28 : 42,
    Math.min(isMobile ? 46 : 86, Math.floor((w - 50 - (n - 1) * tabGap) / n)),
  );
  const tabH = 28;
  const totalTabW = n * tabW + (n - 1) * tabGap;
  const tabX0 = (w - totalTabW) / 2;
  const tabY = titleY + 22;

  const contentY = tabY + tabH + (isMobile ? 12 : 20);
  const listW = isMobile ? Math.min(w * 0.45, 180) : 230;
  const previewW = isMobile ? Math.min(w * 0.4, 140) : 300;
  const infoW = isMobile ? 0 : 240;
  const contentGap = isMobile ? 8 : 20;
  const totalContentW =
    listW + previewW + (isMobile ? 0 : infoW + contentGap) + contentGap;
  const contentX = (w - totalContentW) / 2;
  const itemH = isMobile ? 32 : 36;
  // Desktop used to leave availH unbounded, so each panel sized itself to its
  // item count. A 5-entry category produced a ~200px block pinned to the top
  // with most of the screen empty, and the panel height jumped between tabs.
  const availH = h - contentY - (isMobile ? 80 : 70);
  const panelH = Math.max(itemH * 3 + 16, availH);
  const maxBySpace = Math.max(3, Math.floor((panelH - 16) / itemH));

  return {
    titleY,
    tabGap,
    tabW,
    tabH,
    totalTabW,
    tabX0,
    tabY,
    contentY,
    listW,
    previewW,
    infoW,
    contentGap,
    totalContentW,
    contentX,
    itemH,
    availH,
    panelH,
    maxBySpace,
  };
}

// ── Character preview (fully parameterized — no game state) ──

export function renderCharacterPreview(
  ctx,
  cx,
  cy,
  palette,
  armor,
  badge,
  skin,
  now,
  loadout,
  scale,
  helmet,
  visor,
  shoulder,
  skinTone,
  hairStyle,
  eyeColor,
) {
  const s = scale || 1;
  const helmetStyle = helmet || HELMET_STYLES[0];
  const visorStyle = visor || VISOR_STYLES[0];
  const shoulderStyle = shoulder || SHOULDER_STYLES[0];
  const faceTone = skinTone || SKIN_TONES[0];
  const hair = hairStyle || HAIR_STYLES[0];
  const eyes = eyeColor || EYE_COLORS[0];
  const rotAngle = now * 0.001;
  const breathe = Math.sin(now * 0.002) * 2;
  const stance = Math.sin(now * 0.0012) * 2.5;

  ctx.save();
  ctx.translate(cx, cy + breathe);
  ctx.scale(s, s);

  // ── Armor body ──
  const armorW = 52;
  const armorH = 70;

  // ── Holographic platform ──
  const platY = armorH / 2 + 20;
  // Outer glow ring
  ctx.save();
  ctx.globalAlpha = 0.15 + 0.08 * Math.sin(now * 0.002);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, platY, 44, 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Inner rotating grid disc
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.ellipse(0, platY, 38, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Grid lines on disc
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 0.5;
  for (let gi = -3; gi <= 3; gi++) {
    const gOff = gi * 10;
    const gW = Math.sqrt(Math.max(0, 38 * 38 - gOff * gOff));
    ctx.beginPath();
    ctx.moveTo(gOff, platY - (gW * 10) / 38);
    ctx.lineTo(gOff, platY + (gW * 10) / 38);
    ctx.stroke();
  }
  ctx.restore();
  // Rotating tick marks on edge
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  for (let ti = 0; ti < 8; ti++) {
    const ta = rotAngle + (ti * Math.PI) / 4;
    const tx1 = Math.cos(ta) * 36;
    const ty1 = platY + Math.sin(ta) * 9.5;
    const tx2 = Math.cos(ta) * 42;
    const ty2 = platY + Math.sin(ta) * 11;
    ctx.beginPath();
    ctx.moveTo(tx1, ty1);
    ctx.lineTo(tx2, ty2);
    ctx.stroke();
  }
  ctx.restore();

  // Shadow underneath
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, platY, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = palette.dark;
  ctx.fillRect(-14, armorH / 2 - 5, 10, 25);
  ctx.fillRect(4, armorH / 2 - 5, 10, 25);
  // Boots
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.roundRect(-16, armorH / 2 + 16, 14, 8, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(2, armorH / 2 + 16, 14, 8, 2);
  ctx.fill();
  // Boot sole accent
  ctx.fillStyle = palette.accent + "44";
  ctx.fillRect(-15, armorH / 2 + 22, 12, 2);
  ctx.fillRect(3, armorH / 2 + 22, 12, 2);

  // Knee pads
  ctx.fillStyle = palette.primary + "88";
  ctx.beginPath();
  ctx.ellipse(-9, armorH / 2 + 2, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(9, armorH / 2 + 2, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main torso
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.roundRect(-armorW / 2, -armorH / 2, armorW, armorH, 6);
  ctx.fill();

  // Armor style details
  if (armor.id === "recon") {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-armorW / 2, -armorH / 2, armorW, armorH, 6);
    ctx.clip();
    ctx.strokeStyle = palette.accent + "44";
    ctx.lineWidth = 1;
    for (let i = -3; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-armorW / 2 + i * 12, -armorH / 2);
      ctx.lineTo(-armorW / 2 + i * 12 + armorH, armorH / 2);
      ctx.stroke();
    }
    ctx.restore();
  } else if (armor.id === "heavy") {
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-armorW / 2 - 6, -armorH / 2 - 2, armorW + 12, 14);
    ctx.fillRect(-armorW / 2 - 4, -armorH / 2 + 10, 12, 8);
    ctx.fillRect(armorW / 2 - 8, -armorH / 2 + 10, 12, 8);
  } else if (armor.id === "stealth") {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(-armorW / 2 + 3, -armorH / 2 + 3, armorW - 6, armorH - 6);
    ctx.strokeStyle = palette.accent + "33";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -armorH / 2);
    ctx.lineTo(0, armorH / 2);
    ctx.stroke();
  } else if (armor.id === "tech") {
    ctx.fillStyle = palette.dark;
    ctx.fillRect(-armorW / 2 + 4, 8, 14, 10);
    ctx.fillRect(armorW / 2 - 18, 8, 14, 10);
    ctx.fillStyle = palette.accent + "66";
    ctx.fillRect(-armorW / 2 + 6, 10, 4, 6);
    ctx.fillRect(armorW / 2 - 10, 10, 4, 6);
  }

  // Center accent stripe
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(now * 0.004);
  ctx.fillRect(-2, -armorH / 2 + 8, 4, armorH - 16);
  ctx.globalAlpha = 1;

  // Belt
  ctx.fillStyle = palette.dark;
  ctx.fillRect(-armorW / 2 + 2, armorH / 2 - 10, armorW - 4, 6);
  ctx.fillStyle = palette.accent + "88";
  ctx.beginPath();
  ctx.arc(0, armorH / 2 - 7, 4, 0, Math.PI * 2);
  ctx.fill();

  // Chest emblem glow
  ctx.save();
  ctx.globalAlpha = 0.15 + 0.1 * Math.sin(now * 0.005);
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(0, -10, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Collar / neck
  ctx.fillStyle = palette.dark;
  ctx.fillRect(-10, -armorH / 2 - 6, 20, 8);

  // Helmet (shape varies by helmetStyle)
  const helmY = -armorH / 2 - 28;
  ctx.fillStyle = palette.primary;
  if (helmetStyle.id === "wide") {
    ctx.beginPath();
    ctx.ellipse(0, helmY, 22, 17, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (helmetStyle.id === "angular") {
    ctx.beginPath();
    ctx.moveTo(-18, helmY + 10);
    ctx.lineTo(-14, helmY - 14);
    ctx.lineTo(14, helmY - 14);
    ctx.lineTo(18, helmY + 10);
    ctx.lineTo(10, helmY + 16);
    ctx.lineTo(-10, helmY + 16);
    ctx.closePath();
    ctx.fill();
  } else if (helmetStyle.id === "mohawk") {
    ctx.beginPath();
    ctx.arc(0, helmY, 18, 0, Math.PI * 2);
    ctx.fill();
    // Crest ridge
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.moveTo(-2, helmY - 18);
    ctx.lineTo(2, helmY - 22);
    ctx.lineTo(2, helmY + 2);
    ctx.lineTo(-2, helmY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = palette.accent + "aa";
    ctx.fillRect(-1, helmY - 20, 2, 20);
  } else if (helmetStyle.id === "crested") {
    ctx.beginPath();
    ctx.arc(0, helmY, 18, 0, Math.PI * 2);
    ctx.fill();
    // Forward fin
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(0, helmY - 18);
    ctx.lineTo(20, helmY - 4);
    ctx.lineTo(16, helmY + 2);
    ctx.lineTo(0, helmY - 4);
    ctx.closePath();
    ctx.fill();
  } else {
    // standard dome
    ctx.beginPath();
    ctx.arc(0, helmY, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  // Visor (shape varies by visorStyle)
  // Face/hair are visible through open/slit visors; full-face visor covers them.
  if (visorStyle.id !== "fullface") {
    ctx.fillStyle = faceTone.color;
    ctx.beginPath();
    ctx.ellipse(0, helmY + 3, 12, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = faceTone.shadow;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(0, helmY + 8, 10, 5, 0, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (hair.id !== "none") {
      ctx.fillStyle = hair.color;
      if (hair.id === "coil") {
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(i * 5, helmY - 8 + (i % 2) * 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (hair.id === "braid") {
        ctx.beginPath();
        ctx.ellipse(-8, helmY - 5, 7, 4, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-14, helmY + 8, 3, 12, -0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, helmY - 8, hair.id === "buzz" ? 10 : 13, hair.id === "white" ? 5 : 7, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = eyes.color;
    ctx.shadowColor = eyes.color;
    ctx.shadowBlur = 5;
    ctx.fillRect(-6, helmY + 1, 3, 2);
    ctx.fillRect(3, helmY + 1, 3, 2);
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = palette.accent;
  if (visorStyle.id === "slit") {
    ctx.globalAlpha = 0.75 + 0.2 * Math.sin(now * 0.003);
    ctx.fillRect(-12, helmY - 1, 24, 3);
    ctx.globalAlpha = 1;
  } else if (visorStyle.id === "fullface") {
    ctx.globalAlpha = 0.7 + 0.15 * Math.sin(now * 0.003);
    ctx.beginPath();
    ctx.ellipse(0, helmY, 15, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Reflective sheen
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(-6, helmY - 5, 4, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (visorStyle.id === "split") {
    ctx.globalAlpha = 0.7 + 0.2 * Math.sin(now * 0.003);
    ctx.beginPath();
    ctx.ellipse(-7, helmY + 2, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7, helmY + 2, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (visorStyle.id === "glow") {
    const glowPulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 8 + 4 * glowPulse;
    ctx.globalAlpha = 0.85 + 0.15 * glowPulse;
    ctx.fillRect(-13, helmY, 26, 4);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  } else {
    // standard wide visor
    ctx.globalAlpha = 0.6 + 0.2 * Math.sin(now * 0.003);
    ctx.beginPath();
    ctx.ellipse(0, helmY + 2, 14, 7, 0, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Visor glint
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(-5, helmY - 1, 4, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Arms
  ctx.fillStyle = palette.primary;
  ctx.fillRect(-armorW / 2 - 10, -armorH / 2 + 8, 10, 40);
  ctx.fillRect(armorW / 2, -armorH / 2 + 8, 10, 40);
  // Hands
  ctx.fillStyle = faceTone.color;
  ctx.fillRect(-armorW / 2 - 8, -armorH / 2 + 46, 8, 8);
  ctx.fillRect(armorW / 2 + 2, -armorH / 2 + 46, 8, 8);

  // Shoulder pads / guards (varies by shoulderStyle)
  const shY = -armorH / 2 + 4;
  const shLX = -armorW / 2 - 5;
  const shRX = armorW / 2 + 5;
  if (shoulderStyle.id === "pads") {
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.ellipse(shLX, shY, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(shRX, shY, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.accent + "66";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(shLX, shY, 10, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(shRX, shY, 10, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shoulderStyle.id === "spikes") {
    ctx.fillStyle = palette.dark;
    // Left spikes
    ctx.beginPath();
    ctx.moveTo(shLX - 10, shY + 4);
    ctx.lineTo(shLX - 12, shY - 8);
    ctx.lineTo(shLX - 4, shY - 2);
    ctx.lineTo(shLX - 6, shY - 10);
    ctx.lineTo(shLX + 2, shY - 4);
    ctx.lineTo(shLX + 4, shY + 4);
    ctx.closePath();
    ctx.fill();
    // Right spikes (mirror)
    ctx.beginPath();
    ctx.moveTo(shRX + 10, shY + 4);
    ctx.lineTo(shRX + 12, shY - 8);
    ctx.lineTo(shRX + 4, shY - 2);
    ctx.lineTo(shRX + 6, shY - 10);
    ctx.lineTo(shRX - 2, shY - 4);
    ctx.lineTo(shRX - 4, shY + 4);
    ctx.closePath();
    ctx.fill();
  } else if (shoulderStyle.id === "pauldrons") {
    ctx.fillStyle = palette.dark;
    // Trapezoidal plates
    ctx.beginPath();
    ctx.moveTo(shLX - 12, shY - 8);
    ctx.lineTo(shLX + 4, shY - 6);
    ctx.lineTo(shLX + 6, shY + 10);
    ctx.lineTo(shLX - 10, shY + 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(shRX + 12, shY - 8);
    ctx.lineTo(shRX - 4, shY - 6);
    ctx.lineTo(shRX - 6, shY + 10);
    ctx.lineTo(shRX + 10, shY + 10);
    ctx.closePath();
    ctx.fill();
    // Accent trim
    ctx.fillStyle = palette.accent + "aa";
    ctx.fillRect(shLX - 10, shY - 6, 14, 2);
    ctx.fillRect(shRX - 4, shY - 6, 14, 2);
  } else if (shoulderStyle.id === "armored") {
    ctx.fillStyle = palette.primary;
    ctx.fillRect(shLX - 11, shY - 6, 14, 14);
    ctx.fillRect(shRX - 3, shY - 6, 14, 14);
    ctx.fillStyle = palette.dark;
    ctx.fillRect(shLX - 11, shY - 6, 14, 3);
    ctx.fillRect(shRX - 3, shY - 6, 14, 3);
    ctx.fillStyle = palette.accent + "88";
    ctx.fillRect(shLX - 9, shY - 2, 2, 8);
    ctx.fillRect(shRX + 7, shY - 2, 2, 8);
  }
  // "none" draws nothing.

  // ── Badge ──
  if (badge.icon) {
    const bx = -8;
    const by = -armorH / 2 + 16;
    const br = 12;
    const icons = {
      shield: "\u25C6",
      skull: "\u2620",
      clock: "\u23F0",
      star: "\u2605",
      bolt: "\u26A1",
      eye: "\u25C9",
      rift: "\u00D7",
    };
    const badgePulse = 0.6 + 0.4 * Math.sin(now * 0.004);

    // Drop shadow for depth
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.arc(bx + 1, by - 3, br + 2, 0, Math.PI * 2);
    ctx.fill();

    // Radial gradient base
    const grad = ctx.createRadialGradient(bx - 3, by - 7, 1, bx, by - 4, br);
    grad.addColorStop(0, palette.dark);
    grad.addColorStop(0.7, `${palette.dark}cc`);
    grad.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by - 4, br, 0, Math.PI * 2);
    ctx.fill();

    // Accent ring with pulse
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = badgePulse;
    ctx.beginPath();
    ctx.arc(bx, by - 4, br, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = palette.accent + "33";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(bx, by - 4, br - 3, 0, Math.PI * 2);
    ctx.stroke();

    // Specular highlight
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(bx - 3, by - 8, 4, 2.5, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.accent;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText(icons[badge.icon] || "\u2726", bx, by + 2);
    ctx.textAlign = "left";
  }

  // ── Weapon (right hand) ──
  const wpnX = armorW / 2 + 6;
  const wpnY = -armorH / 2 + 30 + stance * 0.25;
  const skinColors = {
    default: "#556677",
    carbon: "#222222",
    chrome: "#aabbcc",
    ember: "#aa4400",
    frost: "#4488bb",
    toxic: "#339933",
  };
  ctx.fillStyle = skinColors[skin.id] || "#556677";
  ctx.fillRect(wpnX, wpnY, 6, 30);
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now * 0.006);
  ctx.fillRect(wpnX + 1, wpnY - 4, 4, 6);
  ctx.globalAlpha = 1;

  // ── Class-specific visual traits ──
  if (loadout) {
    if (loadout.id === "gunslinger") {
      ctx.fillStyle = "#664422";
      ctx.fillRect(-armorW / 2 - 4, 4, 6, 14);
      ctx.fillRect(armorW / 2 - 2, 4, 6, 14);
      ctx.strokeStyle = palette.accent + "44";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const ly = -armorH / 2 + 20 + i * 18;
        ctx.beginPath();
        ctx.moveTo(armorW / 2 + 18, ly);
        ctx.lineTo(armorW / 2 + 28 + i * 4, ly);
        ctx.stroke();
      }
    } else if (loadout.id === "enforcer") {
      ctx.fillStyle = palette.dark;
      ctx.fillRect(-armorW / 2 - 14, -armorH / 2 + 4, 14, 12);
      ctx.fillRect(armorW / 2, -armorH / 2 + 4, 14, 12);
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(
        -armorW / 2 - 2,
        -armorH / 2 - 2,
        armorW + 4,
        armorH + 4,
        8,
      );
      ctx.stroke();
    } else if (loadout.id === "phantom") {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = palette.accent;
      const ghostOff = 8 + Math.sin(now * 0.003) * 3;
      ctx.beginPath();
      ctx.roundRect(-armorW / 2 + ghostOff, -armorH / 2, armorW, armorH, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) {
        const px = armorW / 2 + 14 + i * 8;
        const py = Math.sin(now * 0.004 + i) * 10;
        ctx.fillStyle = palette.accent;
        ctx.globalAlpha = 0.3 - i * 0.06;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── Rotating energy ring ──
  ctx.strokeStyle = palette.accent + "22";
  ctx.lineWidth = 1;
  for (let r = 0; r < 2; r++) {
    ctx.beginPath();
    ctx.arc(0, 0, 60 + r * 12, rotAngle + r, rotAngle + r + Math.PI * 1.2);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Main character creator screen ──

export function renderCharacterCreator(
  ctx,
  w,
  h,
  creatorCategory,
  character,
  isTouchDevice,
  unlockCtx = null,
) {
  const now = performance.now();
  const cat = creatorCategory;
  const char = character;
  const palette = CHARACTER_COLORS[char.colorIndex];
  const skinTone = SKIN_TONES[char.skinToneIndex || 0];
  const hairStyle = HAIR_STYLES[char.hairIndex || 0];
  const eyeColor = EYE_COLORS[char.eyeIndex || 0];
  const armor = ARMOR_STYLES[char.armorIndex];
  const badge = BADGES[char.badgeIndex];
  const skin = WEAPON_SKINS[char.weaponSkinIndex];
  const loadout = LOADOUT_CLASSES[char.loadoutIndex];
  const origin = BACKSTORIES[char.backstoryIndex || 0];
  const voice = VOICE_PROFILES[char.voiceIndex || 0];
  const helmet = HELMET_STYLES[char.helmetIndex || 0];
  const visor = VISOR_STYLES[char.visorIndex || 0];
  const shoulder = SHOULDER_STYLES[char.shoulderIndex || 0];
  const categories = CREATOR_CATEGORIES;

  // Full-screen dark backdrop
  ctx.fillStyle = "#000a14";
  ctx.fillRect(0, 0, w, h);

  // Subtle grid background
  ctx.strokeStyle = "rgba(0, 255, 200, 0.03)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 40) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy < h; gy += 40) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  const isMobile = isTouchDevice && w < 700;
  const L = getCreatorLayout(w, h, isMobile);

  // ── Ambient floating particles ──
  const particleCount = isMobile ? 12 : 24;
  ctx.save();
  for (let pi = 0; pi < particleCount; pi++) {
    const seed = pi * 137.508; // golden angle spread
    const px = (seed * 7.3 + now * 0.008 * (0.3 + (pi % 3) * 0.2)) % w;
    const py = (seed * 13.7 + now * 0.006 * (0.2 + (pi % 4) * 0.15)) % h;
    const pSize = 1 + (pi % 3);
    const pAlpha = 0.06 + 0.04 * Math.sin(now * 0.002 + pi);
    ctx.globalAlpha = pAlpha;
    ctx.fillStyle = pi % 2 === 0 ? palette.accent : palette.primary;
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Title
  const titlePulse = 0.85 + 0.15 * Math.sin(now * 0.003);
  ctx.save();
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 16 * titlePulse;
  ctx.fillStyle = palette.accent;
  ctx.font = `bold ${isMobile ? 20 : 28}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("AGENT CUSTOMIZATION", w / 2, L.titleY);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Decorative line under title
  ctx.strokeStyle = `${palette.primary}55`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 120, L.titleY + 10);
  ctx.lineTo(w / 2 + 120, L.titleY + 10);
  ctx.stroke();

  // ─── Category tabs ───
  const tabLabels = isMobile
    ? categories.map((c) => c.shortLabel)
    : categories.map((c) => c.name);

  for (let i = 0; i < categories.length; i++) {
    const tx = L.tabX0 + i * (L.tabW + L.tabGap);
    const selected = i === cat;

    ctx.fillStyle = selected
      ? `${palette.primary}44`
      : "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(tx, L.tabY, L.tabW, L.tabH, 4);
    ctx.fill();

    if (selected) {
      ctx.save();
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tx, L.tabY, L.tabW, L.tabH, 4);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = selected ? palette.accent : "rgba(255,255,255,0.35)";
    ctx.font = `${selected ? "bold " : ""}${isMobile ? 9 : 11}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(tabLabels[i], tx + L.tabW / 2, L.tabY + 18);
  }

  // ─── NAME tab — special rendering ───
  if (cat === 0) {
    const nameBoxW = isMobile ? Math.min(320, w - 40) : 320;
    const nameBoxH = isMobile ? 44 : 50;
    const nameBoxX = w / 2 - nameBoxW / 2;
    const nameBoxY = L.contentY + (isMobile ? 20 : 40);

    ctx.fillStyle = palette.accent;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AGENT CALLSIGN", w / 2, nameBoxY - 12);

    ctx.fillStyle = "rgba(0, 5, 15, 0.8)";
    ctx.beginPath();
    ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 6);
    ctx.fill();

    const blink = Math.sin(now * 0.005) > 0;
    ctx.strokeStyle = blink ? palette.accent : `${palette.accent}88`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH, 6);
    ctx.stroke();

    const displayName = char.name || "";
    const cursor = blink ? "\u258C" : "";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(displayName + cursor, w / 2, nameBoxY + 33);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px monospace";
    ctx.fillText(
      "Type your name (max 16 chars) \u00B7 Backspace to delete",
      w / 2,
      nameBoxY + nameBoxH + 20,
    );

    // Character preview below name input. Centred in the space that is
    // actually left and scaled to fill it — a fixed 1.5 left the lower third
    // of the screen empty while the figure stayed small.
    const prevCX = w / 2;
    const prevTop = nameBoxY + nameBoxH + 36;
    const prevBottom = h - (isMobile ? 80 : 84);
    const prevCY = isMobile
      ? nameBoxY + nameBoxH + Math.min(100, (h - nameBoxY - nameBoxH - 80) / 2)
      : (prevTop + prevBottom) / 2 - 10;
    const prevScale = isMobile
      ? 1.0
      : Math.max(1.2, Math.min(2.4, (prevBottom - prevTop - 70) / 150));
    renderCharacterPreview(
      ctx,
      prevCX,
      prevCY,
      palette,
      armor,
      badge,
      skin,
      now,
      loadout,
      prevScale,
      helmet,
      visor,
      shoulder,
      skinTone,
      hairStyle,
      eyeColor,
    );

    // Styled nameplate (name step)
    const npText = char.name || "Agent";
    ctx.font = "bold 14px monospace";
    const npY = prevCY + (isMobile ? 70 : Math.round(80 * prevScale));
    const npW = ctx.measureText(npText).width + 24;
    const npH = 22;
    const npX = prevCX - npW / 2;
    const npYTop = npY - npH + 4;
    ctx.fillStyle = "rgba(0, 5, 15, 0.8)";
    ctx.beginPath();
    ctx.roundRect(npX, npYTop, npW, npH, 3);
    ctx.fill();
    ctx.strokeStyle = palette.accent + "66";
    ctx.lineWidth = 1;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(npX, npYTop, npW, npH, 3);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = "center";
    ctx.fillText(npText, prevCX, npY);

    if (!isMobile) {
      ctx.fillStyle = "rgba(180,200,220,0.45)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "Click or TAB/\u2190/\u2192 = category  \u00B7  ENTER = save  \u00B7  ESC = cancel",
        w / 2,
        h - 20,
      );
      ctx.textAlign = "left";
    }
    return;
  }

  // ─── Item list (left panel) ───
  const curCat = categories[cat];
  const items = curCat.data;
  const selIdx = char[curCat.key];
  const listX = L.contentX;
  const maxVisible = Math.min(items.length, L.maxBySpace);
  const listH = L.panelH;

  ctx.fillStyle = "rgba(0, 5, 15, 0.7)";
  ctx.beginPath();
  ctx.roundRect(listX, L.contentY, L.listW, listH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 255, 200, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(listX, L.contentY, L.listW, listH, 8);
  ctx.stroke();

  let scrollOff = 0;
  if (selIdx >= maxVisible) scrollOff = selIdx - maxVisible + 1;

  for (let vi = 0; vi < maxVisible; vi++) {
    const i = vi + scrollOff;
    if (i >= items.length) break;
    const item = items[i];
    const iy = L.contentY + 8 + vi * L.itemH;
    const isSelected = i === selIdx;

    if (isSelected) {
      const sPulse = 0.6 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = `${palette.primary}${Math.round(15 * sPulse)
        .toString(16)
        .padStart(2, "0")}`;
      ctx.beginPath();
      ctx.roundRect(listX + 4, iy, L.listW - 8, L.itemH - 4, 4);
      ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.fillRect(listX + 4, iy + 6, 3, L.itemH - 16);
    }

    // Color swatches for visual categories
    const swatch = item.primary || item.color;
    if ((curCat.key === "colorIndex" || curCat.key === "skinToneIndex" || curCat.key === "hairIndex" || curCat.key === "eyeIndex") && swatch) {
      ctx.fillStyle = swatch;
      ctx.beginPath();
      ctx.roundRect(listX + 14, iy + 8, 18, 18, 3);
      ctx.fill();
      if (item.accent || item.shadow) {
        ctx.fillStyle = item.accent || item.shadow;
        ctx.beginPath();
        ctx.roundRect(listX + 18, iy + 12, 10, 10, 2);
        ctx.fill();
      }
    }

    const hasSwatch = curCat.key === "colorIndex" || curCat.key === "skinToneIndex" || curCat.key === "hairIndex" || curCat.key === "eyeIndex";
    const labelX = hasSwatch ? listX + 40 : listX + 16;
    ctx.fillStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.45)";
    ctx.font = `${isSelected ? "bold " : ""}12px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(item.name, labelX, iy + 22);

    // Lock icon for anything still locked (loadouts, tiered gear)
    if (unlockCtx && !unlockState(curCat.key, i, unlockCtx).unlocked) {
      ctx.fillStyle = "rgba(255,100,100,0.6)";
      ctx.font = "10px monospace";
      ctx.fillText("\uD83D\uDD12", listX + L.listW - 28, iy + 22);
    }
  }

  // ─── Character preview (center panel) ───
  const prevX = L.contentX + L.listW + L.contentGap;
  const prevCX = prevX + L.previewW / 2;
  const prevH = listH;

  ctx.fillStyle = "rgba(0, 5, 15, 0.6)";
  ctx.beginPath();
  ctx.roundRect(prevX, L.contentY, L.previewW, prevH, 8);
  ctx.fill();
  ctx.strokeStyle = `${palette.primary}33`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(prevX, L.contentY, L.previewW, prevH, 8);
  ctx.stroke();

  // Scale the figure to the panel rather than a fixed 1.3. The preview is the
  // thing being customised, so it should own the space the panel now has.
  // The base figure is roughly 120x150 units; leave a margin for the nameplate.
  const prevScale = Math.max(
    1.0,
    Math.min((L.previewW - 48) / 120, (prevH - 96) / 150),
  );
  renderCharacterPreview(
    ctx,
    prevCX,
    L.contentY + prevH / 2 - 10,
    palette,
    armor,
    badge,
    skin,
    now,
    loadout,
    prevScale,
    helmet,
    visor,
    shoulder,
    skinTone,
    hairStyle,
    eyeColor,
  );

  // ── Scan-line overlay ──
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = palette.accent;
  for (let sl = 0; sl < prevH; sl += 3) {
    ctx.fillRect(prevX, L.contentY + sl, L.previewW, 1);
  }
  // Scrolling highlight bar
  const scanY = L.contentY + ((now * 0.03) % prevH);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = palette.accent;
  ctx.fillRect(prevX, scanY, L.previewW, 4);
  ctx.restore();

  // ─── Info panel (right) — hidden on mobile ───
  const infoX = prevX + L.previewW + L.contentGap;
  const selectedItem = items[selIdx];

  if (!isMobile) {
    ctx.fillStyle = "rgba(0, 5, 15, 0.6)";
    ctx.beginPath();
    ctx.roundRect(infoX, L.contentY, L.infoW, prevH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 255, 200, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(infoX, L.contentY, L.infoW, prevH, 8);
    ctx.stroke();

    // Info title
    ctx.fillStyle = palette.accent;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(selectedItem.name, infoX + 12, L.contentY + 28);

    // Armor tier pips (Sprint H 8.2: starter → mid → elite visual)
    if (curCat.key === "armorIndex" && selectedItem.tier) {
      const pipX = infoX + 12;
      const pipY = L.contentY + 38;
      const tierColors = ["#6a8cff", "#ffcc44", "#ff4488"];
      const tierLabels = ["STARTER", "MID", "ELITE"];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle =
          i < selectedItem.tier
            ? tierColors[selectedItem.tier - 1]
            : "rgba(80,90,110,0.4)";
        ctx.beginPath();
        ctx.arc(pipX + 4 + i * 12, pipY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = tierColors[selectedItem.tier - 1];
      ctx.font = "bold 9px monospace";
      ctx.fillText(tierLabels[selectedItem.tier - 1], pipX + 44, pipY + 3);
      ctx.font = "bold 13px monospace";
    }

    // Description
    if (selectedItem.desc) {
      ctx.fillStyle = "rgba(200, 220, 240, 0.6)";
      ctx.font = "11px monospace";
      const words = selectedItem.desc.split(" ");
      let line = "";
      let lineY = L.contentY + 50;
      for (const word of words) {
        const test = line + (line ? " " : "") + word;
        if (ctx.measureText(test).width > L.infoW - 24) {
          ctx.fillText(line, infoX + 12, lineY);
          line = word;
          lineY += 16;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, infoX + 12, lineY);
    }

    if (curCat.key === "backstoryIndex" && selectedItem.perk) {
      ctx.fillStyle = "rgba(0,255,200,0.18)";
      ctx.beginPath();
      ctx.roundRect(infoX + 12, L.contentY + 116, L.infoW - 24, 34, 6);
      ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.font = "bold 10px monospace";
      ctx.fillText("ORIGIN PERK", infoX + 20, L.contentY + 130);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "11px monospace";
      ctx.fillText(selectedItem.perk, infoX + 20, L.contentY + 145);
    }

    if (curCat.key === "voiceIndex") {
      const waveY = L.contentY + 120;
      ctx.strokeStyle = palette.accent + "88";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < L.infoW - 28; i++) {
        const x = infoX + 14 + i;
        const y = waveY + Math.sin(i * 0.18 + now * 0.012) * (6 + selectedItem.pitch * 3);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "10px monospace";
      ctx.fillText("VOICE PRINT", infoX + 12, waveY + 24);
    }

    // Loadout bonuses — visual stat bars (LOADOUT category only)
    if (curCat.key === "loadoutIndex" && loadout.bonuses) {
      let by = L.contentY + 90;
      const b = loadout.bonuses;
      const barW = L.infoW - 24;
      const barH = 10;

      const drawStatBar = (label, value, max, color) => {
        ctx.fillStyle = "rgba(170, 200, 220, 0.5)";
        ctx.font = "10px monospace";
        ctx.fillText(label, infoX + 12, by);
        by += 14;
        // Bar track
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.roundRect(infoX + 12, by, barW, barH, 3);
        ctx.fill();
        // Bar fill
        const fillPct = Math.min(1, Math.max(0, value / max));
        const fillW = fillPct * barW;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7 + 0.15 * Math.sin(now * 0.004);
        ctx.beginPath();
        ctx.roundRect(infoX + 12, by, fillW, barH, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Value label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.fillText(`${value}`, infoX + 14 + fillW + 4, by + 8);
        by += barH + 10;
      };

      if (b.fireRateMultiplier != null) {
        drawStatBar(
          "FIRE RATE",
          b.fireRateMultiplier * 100,
          120,
          palette.accent,
        );
      }
      if (b.maxHealth != null) {
        drawStatBar("MAX HEALTH", b.maxHealth, 150, "#44cc88");
      }
      if (b.moveSpeed != null) {
        const absSpeed = 5 + b.moveSpeed; // base 5
        drawStatBar("MOVE SPEED", absSpeed, 7, "#ffaa44");
      }
      if (b.maxStamina != null) {
        drawStatBar("MAX STAMINA", b.maxStamina, 150, "#4488ff");
      }
      if (unlockCtx && !unlockState("loadoutIndex", char.loadoutIndex, unlockCtx).unlocked) {
        ctx.fillStyle = "rgba(255, 100, 100, 0.7)";
        ctx.font = "bold 12px monospace";
        ctx.fillText("LOCKED", infoX + 12, by + 10);
      }
    }

    // Color swatches in info panel
    if (curCat.key === "colorIndex") {
      let sy = L.contentY + 80;
      ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
      ctx.font = "10px monospace";
      ctx.fillText("PRIMARY", infoX + 12, sy);
      ctx.fillStyle = palette.primary;
      ctx.fillRect(infoX + 12, sy + 4, 40, 16);
      sy += 30;
      ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
      ctx.font = "10px monospace";
      ctx.fillText("ACCENT", infoX + 12, sy);
      ctx.fillStyle = palette.accent;
      ctx.fillRect(infoX + 12, sy + 4, 40, 16);
      sy += 30;
      ctx.fillStyle = "rgba(170, 200, 220, 0.4)";
      ctx.font = "10px monospace";
      ctx.fillText("DARK", infoX + 12, sy);
      ctx.fillStyle = palette.dark;
      ctx.fillRect(infoX + 12, sy + 4, 40, 16);
    }
  }

  // Locked options in this category, with how to earn them
  if (!isMobile && unlockCtx && curCat.key) {
    const infoX = L.contentX + L.listW + L.contentGap + L.previewW + L.contentGap;
    const locked = items
      .map((it, i) => ({ it, st: unlockState(curCat.key, i, unlockCtx) }))
      .filter((e) => !e.st.unlocked);
    let ly = L.contentY + listH - 14 - (locked.length - 1) * 30;
    ctx.textAlign = "left";
    for (const { it, st } of locked) {
      ctx.fillStyle = "rgba(255,100,100,0.7)";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`\uD83D\uDD12 ${it.name}`, infoX + 12, ly - 12);
      ctx.fillStyle = "rgba(180,200,220,0.55)";
      ctx.font = "9px monospace";
      let hint = st.hint;
      while (hint.length > 4 && ctx.measureText(hint).width > L.infoW - 24) hint = hint.slice(0, -2);
      ctx.fillText(hint === st.hint ? hint : `${hint}\u2026`, infoX + 12, ly);
      ly += 30;
    }
  }

  // Styled nameplate (main view)
  const npText = char.name || "Agent";
  ctx.font = "bold 12px monospace";
  const npY = L.contentY + prevH - 12;
  const npW = ctx.measureText(npText).width + 20;
  const npH = 20;
  const npX = prevCX - npW / 2;
  const npYTop = npY - npH + 4;
  ctx.fillStyle = "rgba(0, 5, 15, 0.8)";
  ctx.beginPath();
  ctx.roundRect(npX, npYTop, npW, npH, 3);
  ctx.fill();
  ctx.strokeStyle = palette.accent + "66";
  ctx.lineWidth = 1;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(npX, npYTop, npW, npH, 3);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.accent;
  ctx.textAlign = "center";
  ctx.fillText(npText, prevCX, npY);

  // ─── Footer controls ───
  if (!isMobile) {
    ctx.fillStyle = "rgba(180,200,220,0.45)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      "Click or TAB/A/D = category  \u00B7  Click or W/S = select  \u00B7  ENTER = save  \u00B7  ESC = cancel",
      w / 2,
      h - 20,
    );
    ctx.textAlign = "left";
  }
}
