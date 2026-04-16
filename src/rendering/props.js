// Environmental prop renderers — procedural Canvas2D billboards
// Signature: (ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog)
// Ground convention: floor plane = cy + sh * 0.45. Anchor bottom edge there.

// ── Lookup table ────────────────────────────────────────────────
const PROP_RENDERERS = {
  locker: renderLocker,
  bench: renderBench,
  target: renderTarget,
  ammo_crate: renderAmmoCrate,
  weight_rack: renderWeightRack,
  dumbbell: renderDumbbell,
  punching_bag: renderPunchingBag,
  desk: renderDesk,
  filing_cabinet: renderFilingCabinet,
  monitor_bank: renderMonitorBank,
  table: renderTable,
  chair: renderChair,
  vending_machine: renderVendingMachine,
  weapon_rack: renderWeaponRack,
  potted_plant: renderPottedPlant,
  barrier: renderBarrier,
};

export function drawProp(ctx, entity, screenX, centerY, sprWidth, sprHeight, dist, time, fog) {
  if (fog <= 0) return;
  const fn = PROP_RENDERERS[entity.propType];
  if (fn) fn(ctx, screenX, centerY, sprWidth, sprHeight, dist, time, fog);
}

// ── Individual renderers ────────────────────────────────────────

function renderLocker(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 0.7, h = s * 1.6;
  const y = cy + sh * 0.45 - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#556677";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Highlight left edge
  ctx.fillStyle = "#6a7a8a";
  ctx.fillRect(sx - w / 2, y - h / 2, w * 0.2, h);

  // Door seam
  ctx.strokeStyle = "#334455";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.7;
  ctx.beginPath();
  ctx.moveTo(sx, y - h / 2 + 2);
  ctx.lineTo(sx, y + h / 2 - 2);
  ctx.stroke();

  // Vent slits at top
  ctx.globalAlpha = fog * 0.5;
  ctx.fillStyle = "#223344";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(sx - w * 0.3, y - h / 2 + 3 + i * 3, w * 0.6, 1);
  }

  // Handle (small circle)
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#99aabb";
  ctx.beginPath();
  ctx.arc(sx + w * 0.15, y, Math.max(1, s * 0.06), 0, Math.PI * 2);
  ctx.fill();

  // Top shelf line
  ctx.strokeStyle = "#445566";
  ctx.globalAlpha = fog * 0.4;
  ctx.beginPath();
  ctx.moveTo(sx - w / 2 + 1, y - h * 0.15);
  ctx.lineTo(sx + w / 2 - 1, y - h * 0.15);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function renderBench(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 1.4, h = s * 0.3;
  const y = cy + sh * 0.45 - h * 2.5;

  // Seat
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#8B6914";
  ctx.fillRect(sx - w / 2, y, w, h);

  // Highlight
  ctx.fillStyle = "#a07a1a";
  ctx.fillRect(sx - w / 2, y, w, h * 0.3);

  // Legs
  ctx.fillStyle = "#555555";
  ctx.globalAlpha = fog * 0.7;
  const legW = Math.max(1, s * 0.08);
  ctx.fillRect(sx - w * 0.4, y + h, legW, h * 1.5);
  ctx.fillRect(sx + w * 0.4 - legW, y + h, legW, h * 1.5);

  ctx.globalAlpha = 1;
}

function renderTarget(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(8, sw * 0.4);
  const bob = Math.sin(t * 0.002) * s * 0.05;
  const y = cy + sh * 0.45 - s * 1.3 + bob;

  // Post
  ctx.globalAlpha = fog * 0.7;
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - s * 0.05, y + s * 0.5, s * 0.1, s * 0.8);

  // Target board
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#ddddcc";
  ctx.beginPath();
  ctx.arc(sx, y, s * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Rings
  const rings = [
    { r: 0.4, c: "#cc3333" },
    { r: 0.28, c: "#ffffff" },
    { r: 0.18, c: "#cc3333" },
    { r: 0.08, c: "#ffcc00" },
  ];
  for (const ring of rings) {
    ctx.fillStyle = ring.c;
    ctx.beginPath();
    ctx.arc(sx, y, s * ring.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function renderAmmoCrate(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 1.0, h = s * 0.7;
  const y = cy + sh * 0.45 - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#556B2F";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Top face
  ctx.fillStyle = "#667F3F";
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y - h / 2);
  ctx.lineTo(sx - w / 2 + w * 0.12, y - h / 2 - h * 0.2);
  ctx.lineTo(sx + w / 2 + w * 0.12, y - h / 2 - h * 0.2);
  ctx.lineTo(sx + w / 2, y - h / 2);
  ctx.closePath();
  ctx.fill();

  // Metal clasp
  ctx.strokeStyle = "#8B8B00";
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.globalAlpha = fog * 0.8;
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.3, y - h / 2);
  ctx.lineTo(sx - w * 0.3, y + h / 2);
  ctx.moveTo(sx + w * 0.3, y - h / 2);
  ctx.lineTo(sx + w * 0.3, y + h / 2);
  ctx.stroke();

  // Stencil text hint
  if (s > 10) {
    ctx.globalAlpha = fog * 0.5;
    ctx.fillStyle = "#8B8B00";
    ctx.font = `bold ${Math.max(5, s * 0.18)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("AMMO", sx, y + s * 0.08);
    ctx.textAlign = "left";
  }

  ctx.globalAlpha = 1;
}

function renderWeightRack(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 0.8, h = s * 1.4;
  const y = cy + sh * 0.45 - h / 2;

  // Frame uprights
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - w / 2, y - h / 2, s * 0.08, h);
  ctx.fillRect(sx + w / 2 - s * 0.08, y - h / 2, s * 0.08, h);

  // Cross bars (3 shelves)
  ctx.fillStyle = "#555555";
  for (let i = 0; i < 3; i++) {
    const barY = y - h * 0.3 + i * h * 0.3;
    ctx.fillRect(sx - w / 2, barY, w, s * 0.04);
  }

  // Weight plates on shelves
  ctx.fillStyle = "#222222";
  for (let i = 0; i < 3; i++) {
    const barY = y - h * 0.3 + i * h * 0.3;
    const plateW = w * (0.5 - i * 0.1);
    ctx.fillRect(sx - plateW / 2, barY - s * 0.12, plateW, s * 0.12);
  }

  ctx.globalAlpha = 1;
}

function renderDumbbell(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.3);
  const y = cy + sh * 0.45 - s * 0.18;

  // Handle bar
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#777777";
  ctx.fillRect(sx - s * 0.4, y - s * 0.06, s * 0.8, s * 0.12);

  // Weight discs
  ctx.fillStyle = "#333333";
  ctx.fillRect(sx - s * 0.55, y - s * 0.18, s * 0.18, s * 0.36);
  ctx.fillRect(sx + s * 0.37, y - s * 0.18, s * 0.18, s * 0.36);

  // Highlight on discs
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - s * 0.55, y - s * 0.18, s * 0.05, s * 0.36);
  ctx.fillRect(sx + s * 0.37, y - s * 0.18, s * 0.05, s * 0.36);

  ctx.globalAlpha = 1;
}

function renderPunchingBag(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(8, sw * 0.4);
  const sway = Math.sin(t * 0.0015) * s * 0.06;
  const y = cy - s * 0.1;

  // Chain
  ctx.globalAlpha = fog * 0.5;
  ctx.strokeStyle = "#888888";
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(sx, y - s * 0.9);
  ctx.lineTo(sx + sway, y - s * 0.5);
  ctx.stroke();

  // Bag body (cylindrical)
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#8B2500";
  const bx = sx + sway;
  ctx.beginPath();
  ctx.ellipse(bx, y, s * 0.28, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight strip
  ctx.fillStyle = "#a03010";
  ctx.beginPath();
  ctx.ellipse(bx - s * 0.08, y, s * 0.08, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stitching line
  ctx.strokeStyle = "#661800";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.4;
  ctx.beginPath();
  ctx.moveTo(bx, y - s * 0.5);
  ctx.lineTo(bx, y + s * 0.5);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function renderDesk(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 1.3, h = s * 0.35;
  const y = cy + sh * 0.45 - h * 3.2;

  // Desktop surface
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#6B4226";
  ctx.fillRect(sx - w / 2, y, w, h);

  // Top highlight
  ctx.fillStyle = "#7d5030";
  ctx.fillRect(sx - w / 2, y, w, h * 0.25);

  // Front panel
  ctx.fillStyle = "#5a3520";
  ctx.fillRect(sx - w / 2, y + h, w, h * 2.2);

  // Drawer lines
  ctx.strokeStyle = "#4a2a18";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.6;
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.4, y + h * 1.8);
  ctx.lineTo(sx + w * 0.4, y + h * 1.8);
  ctx.stroke();

  // Drawer handle
  ctx.fillStyle = "#998877";
  ctx.globalAlpha = fog * 0.7;
  ctx.fillRect(sx - s * 0.06, y + h * 1.4, s * 0.12, s * 0.04);

  ctx.globalAlpha = 1;
}

function renderFilingCabinet(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 0.65, h = s * 1.3;
  const y = cy + sh * 0.45 - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#707070";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Highlight
  ctx.fillStyle = "#808080";
  ctx.fillRect(sx - w / 2, y - h / 2, w * 0.15, h);

  // Drawer divisions (3 drawers)
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1;
  ctx.globalAlpha = fog * 0.7;
  for (let i = 1; i < 3; i++) {
    const dy = y - h / 2 + (h / 3) * i;
    ctx.beginPath();
    ctx.moveTo(sx - w / 2 + 1, dy);
    ctx.lineTo(sx + w / 2 - 1, dy);
    ctx.stroke();
  }

  // Drawer handles
  ctx.fillStyle = "#999999";
  ctx.globalAlpha = fog * 0.8;
  for (let i = 0; i < 3; i++) {
    const dy = y - h / 2 + (h / 3) * i + h / 6;
    ctx.fillRect(sx - s * 0.06, dy - 1, s * 0.12, 2);
  }

  // Label slot on top drawer
  ctx.fillStyle = "#aaaaaa";
  ctx.globalAlpha = fog * 0.4;
  ctx.fillRect(sx - w * 0.2, y - h / 2 + h / 6 - s * 0.06, w * 0.4, s * 0.05);

  ctx.globalAlpha = 1;
}

function renderMonitorBank(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(8, sw * 0.4);
  const mw = s * 0.45, mh = s * 0.35;
  const y = cy + sh * 0.45 - mh / 2 - s * 0.16;

  // Two monitors side by side
  for (let i = -1; i <= 1; i += 2) {
    const mx = sx + i * mw * 0.55;

    // Monitor casing
    ctx.globalAlpha = fog * 0.85;
    ctx.fillStyle = "#333333";
    ctx.fillRect(mx - mw / 2, y - mh / 2, mw, mh);

    // Screen
    const flicker = 0.7 + Math.sin(t * 0.008 + i) * 0.15;
    ctx.globalAlpha = fog * flicker;
    ctx.fillStyle = "#003322";
    ctx.fillRect(mx - mw / 2 + 2, y - mh / 2 + 2, mw - 4, mh - 4);

    // Scan line
    ctx.globalAlpha = fog * 0.15;
    ctx.fillStyle = "#00ff88";
    const scanY = ((t * 0.03 + i * 20) % (mh - 4));
    ctx.fillRect(mx - mw / 2 + 2, y - mh / 2 + 2 + scanY, mw - 4, 1);

    // Text lines (fake data)
    ctx.globalAlpha = fog * 0.4;
    ctx.fillStyle = "#00cc66";
    for (let ln = 0; ln < 3; ln++) {
      const lw = mw * (0.3 + Math.sin(ln * 2.3 + i) * 0.15);
      ctx.fillRect(mx - mw / 2 + 4, y - mh / 2 + 5 + ln * 4, lw, 1.5);
    }
  }

  // Stand
  ctx.globalAlpha = fog * 0.7;
  ctx.fillStyle = "#444444";
  ctx.fillRect(sx - s * 0.04, y + mh / 2, s * 0.08, s * 0.15);
  ctx.fillRect(sx - s * 0.15, y + mh / 2 + s * 0.12, s * 0.3, s * 0.04);

  ctx.globalAlpha = 1;
}

function renderTable(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 1.1, h = s * 0.2;
  const y = cy + sh * 0.45 - h - s * 0.5;

  // Tabletop
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#887766";
  ctx.fillRect(sx - w / 2, y, w, h);

  // Top face shading
  ctx.fillStyle = "#998877";
  ctx.fillRect(sx - w / 2, y, w, h * 0.3);

  // Legs
  ctx.fillStyle = "#666655";
  ctx.globalAlpha = fog * 0.7;
  const legW = Math.max(1, s * 0.06);
  ctx.fillRect(sx - w * 0.42, y + h, legW, s * 0.5);
  ctx.fillRect(sx + w * 0.42 - legW, y + h, legW, s * 0.5);

  ctx.globalAlpha = 1;
}

function renderChair(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.3);
  const y = cy + sh * 0.45 - s * 0.55;

  // Seat
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#444455";
  ctx.fillRect(sx - s * 0.35, y, s * 0.7, s * 0.2);

  // Back rest
  ctx.fillStyle = "#3a3a4a";
  ctx.fillRect(sx - s * 0.3, y - s * 0.5, s * 0.6, s * 0.5);

  // Highlight on back
  ctx.fillStyle = "#4a4a5a";
  ctx.fillRect(sx - s * 0.3, y - s * 0.5, s * 0.12, s * 0.5);

  // Legs
  ctx.fillStyle = "#555555";
  ctx.globalAlpha = fog * 0.6;
  const legW = Math.max(1, s * 0.05);
  ctx.fillRect(sx - s * 0.3, y + s * 0.2, legW, s * 0.35);
  ctx.fillRect(sx + s * 0.3 - legW, y + s * 0.2, legW, s * 0.35);

  ctx.globalAlpha = 1;
}

function renderVendingMachine(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(8, sw * 0.4);
  const w = s * 0.8, h = s * 1.5;
  const y = cy + sh * 0.45 - h / 2;

  // Body
  ctx.globalAlpha = fog * 0.9;
  ctx.fillStyle = "#2244aa";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Highlight strip
  ctx.fillStyle = "#3355bb";
  ctx.fillRect(sx - w / 2, y - h / 2, w * 0.12, h);

  // Display window
  ctx.globalAlpha = fog * 0.7;
  ctx.fillStyle = "#aaddff";
  ctx.fillRect(sx - w * 0.35, y - h * 0.35, w * 0.7, h * 0.35);

  // Product rows (dark lines)
  ctx.fillStyle = "#1133aa";
  for (let i = 1; i < 3; i++) {
    ctx.fillRect(sx - w * 0.35, y - h * 0.35 + i * h * 0.12, w * 0.7, 1);
  }

  // Product dots
  ctx.globalAlpha = fog * 0.6;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const colors = ["#ff4444", "#44ff44", "#ffaa00"];
      ctx.fillStyle = colors[(r + c) % 3];
      ctx.beginPath();
      ctx.arc(
        sx - w * 0.2 + c * w * 0.2,
        y - h * 0.28 + r * h * 0.12,
        Math.max(1, s * 0.04),
        0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  // Dispenser slot
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#111133";
  ctx.fillRect(sx - w * 0.25, y + h * 0.1, w * 0.5, h * 0.12);

  // Blinking indicator light
  const blink = Math.sin(t * 0.005) > 0 ? 0.9 : 0.3;
  ctx.globalAlpha = fog * blink;
  ctx.fillStyle = "#00ff44";
  ctx.beginPath();
  ctx.arc(sx + w * 0.3, y - h * 0.42, Math.max(1, s * 0.04), 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function renderWeaponRack(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.35);
  const w = s * 0.9, h = s * 1.2;
  const y = cy - h * 0.1;

  // Back plate
  ctx.globalAlpha = fog * 0.8;
  ctx.fillStyle = "#555566";
  ctx.fillRect(sx - w / 2, y - h / 2, w, h);

  // Bracket pegs
  ctx.fillStyle = "#777788";
  ctx.globalAlpha = fog * 0.85;
  for (let i = 0; i < 3; i++) {
    const py = y - h * 0.3 + i * h * 0.3;
    ctx.fillRect(sx - w * 0.35, py - 1, w * 0.2, 3);
    ctx.fillRect(sx + w * 0.15, py - 1, w * 0.2, 3);
  }

  // Weapon silhouettes on pegs
  ctx.fillStyle = "#222233";
  ctx.globalAlpha = fog * 0.7;
  for (let i = 0; i < 3; i++) {
    const py = y - h * 0.3 + i * h * 0.3;
    const gunW = w * (0.7 - i * 0.1);
    ctx.fillRect(sx - gunW / 2, py - 2, gunW, 3);
    // Grip
    ctx.fillRect(sx + gunW * 0.1, py, s * 0.06, s * 0.1);
  }

  ctx.globalAlpha = 1;
}

function renderPottedPlant(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(6, sw * 0.3);
  const y = cy + sh * 0.45 - s * 0.4;

  // Pot
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.moveTo(sx - s * 0.3, y);
  ctx.lineTo(sx - s * 0.22, y + s * 0.4);
  ctx.lineTo(sx + s * 0.22, y + s * 0.4);
  ctx.lineTo(sx + s * 0.3, y);
  ctx.closePath();
  ctx.fill();

  // Pot rim
  ctx.fillStyle = "#9a5520";
  ctx.fillRect(sx - s * 0.33, y - s * 0.04, s * 0.66, s * 0.08);

  // Soil
  ctx.fillStyle = "#3a2510";
  ctx.fillRect(sx - s * 0.28, y - s * 0.02, s * 0.56, s * 0.06);

  // Leaves (fan of green arcs)
  ctx.globalAlpha = fog * 0.8;
  const sway = Math.sin(t * 0.001) * 0.05;
  for (let i = -2; i <= 2; i++) {
    const angle = -Math.PI / 2 + i * 0.35 + sway;
    const lx = Math.cos(angle) * s * 0.5;
    const ly = Math.sin(angle) * s * 0.5;

    ctx.strokeStyle = i % 2 === 0 ? "#228833" : "#33aa44";
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, y - s * 0.05);
    ctx.quadraticCurveTo(
      sx + lx * 0.6, y + ly * 0.6 - s * 0.2,
      sx + lx, y + ly - s * 0.1
    );
    ctx.stroke();
  }

  // Small leaf tips
  ctx.fillStyle = "#33aa44";
  ctx.globalAlpha = fog * 0.6;
  for (let i = -2; i <= 2; i++) {
    const angle = -Math.PI / 2 + i * 0.35 + sway;
    const lx = Math.cos(angle) * s * 0.5;
    const ly = Math.sin(angle) * s * 0.5;
    ctx.beginPath();
    ctx.arc(sx + lx, y + ly - s * 0.1, Math.max(1, s * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineCap = "butt";
  ctx.globalAlpha = 1;
}

function renderBarrier(ctx, sx, cy, sw, sh, dist, t, fog) {
  const s = Math.max(8, sw * 0.4);
  const w = s * 1.2, h = s * 0.8;
  const y = cy + sh * 0.45 - h / 2;

  // Concrete jersey barrier body
  ctx.globalAlpha = fog * 0.85;
  ctx.fillStyle = "#888888";
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y + h / 2);
  ctx.lineTo(sx - w * 0.35, y - h / 2);
  ctx.lineTo(sx + w * 0.35, y - h / 2);
  ctx.lineTo(sx + w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // Top face
  ctx.fillStyle = "#999999";
  ctx.fillRect(sx - w * 0.35, y - h / 2 - h * 0.08, w * 0.7, h * 0.08);

  // Highlight edge
  ctx.fillStyle = "#aaaaaa";
  ctx.globalAlpha = fog * 0.5;
  ctx.beginPath();
  ctx.moveTo(sx - w / 2, y + h / 2);
  ctx.lineTo(sx - w * 0.35, y - h / 2);
  ctx.lineTo(sx - w * 0.35, y - h / 2 - h * 0.08);
  ctx.lineTo(sx - w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // Hazard stripe
  ctx.globalAlpha = fog * 0.6;
  const stripeW = w * 0.7 / 4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#ffcc00" : "#222222";
    ctx.fillRect(sx - w * 0.35 + i * stripeW, y - h * 0.1, stripeW, h * 0.15);
  }

  ctx.globalAlpha = 1;
}
