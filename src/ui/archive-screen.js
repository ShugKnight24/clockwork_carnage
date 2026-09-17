/**
 * Archive screen — reads the two collections the ArchiveSystem tracks.
 *
 * Two tabs share one screen because they are the same kind of thing from the
 * player's side: records you earn by playing. Left column lists entries, right
 * pane shows the selected one. Locked entries stay listed but redacted, so the
 * player can see how much is left without being told what it is.
 */
import { BESTIARY } from "../data/bestiary.js";
import { MEMORY_FRAGMENTS } from "../data/memory-fragments.js";
import { drawScanlines } from "./scanlines.js";
import { isModernArt } from "../rendering/art-style.js";
import {
  UI,
  uiFont,
  drawBackdrop,
  drawPanel,
  drawTitle,
  drawCaption,
  drawSectionHeader,
} from "./modern-ui-kit.js";

export const ARCHIVE_TABS = ["BESTIARY", "MEMORIES"];

const THREAT_COLORS = {
  Low: "#66dd88",
  Moderate: "#ffcc44",
  High: "#ff8844",
  Extreme: "#ff4422",
  Apex: "#ff2266",
};

/**
 * Shared geometry for render and click hit-testing, so the two cannot drift.
 */
export function archiveLayout(w, h) {
  const headerH = 96;
  const footerH = 40;
  const tabW = 150;
  const tabH = 30;
  const tabY = 58;
  const tabX0 = w / 2 - (ARCHIVE_TABS.length * tabW + 10) / 2;

  const listW = Math.min(300, w * 0.28);
  const gap = 20;
  const detailW = Math.min(560, w - listW - gap - 80);
  const contentX = w / 2 - (listW + gap + detailW) / 2;
  const contentY = headerH;
  const contentH = h - headerH - footerH;
  const rowH = 30;
  const visibleRows = Math.max(1, Math.floor((contentH - 16) / rowH));

  return {
    headerH, footerH, tabW, tabH, tabY, tabX0,
    listX: contentX, listW, detailX: contentX + listW + gap, detailW,
    contentY, contentH, rowH, visibleRows,
  };
}

/** Entries for a tab, in a shape both the list and detail pane can consume. */
export function archiveEntries(tab, archive) {
  if (tab === 0) {
    return Object.keys(BESTIARY).map((key) => ({
      key,
      label: BESTIARY[key].name,
      unlocked: archive.isEnemyKnown(key),
    }));
  }
  return MEMORY_FRAGMENTS.map((f) => ({
    key: f.id,
    label: f.title,
    sub: f.member,
    unlocked: archive.isFragmentCollected(f.id),
  }));
}

function wrapText(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {{ tab:number, selection:number, scroll:number, archive:object }} state
 */
export function renderArchiveScreen(ctx, w, h, state) {
  if (isModernArt()) {
    renderArchiveScreenModern(ctx, w, h, state);
    return;
  }
  const { tab, selection, archive } = state;
  const L = archiveLayout(w, h);
  const entries = archiveEntries(tab, archive);

  ctx.fillStyle = "rgba(0,0,0,0.94)";
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = "#00ffcc";
  ctx.font = "bold 26px monospace";
  ctx.textAlign = "center";
  ctx.fillText("ARCHIVE", w / 2, 38);

  // Tabs
  for (let i = 0; i < ARCHIVE_TABS.length; i++) {
    const tx = L.tabX0 + i * (L.tabW + 10);
    const active = i === tab;
    ctx.fillStyle = active ? "rgba(0,255,204,0.14)" : "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(tx, L.tabY, L.tabW, L.tabH, 6);
    ctx.fill();
    ctx.strokeStyle = active ? "#00ffcc" : "rgba(255,255,255,0.14)";
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(tx, L.tabY, L.tabW, L.tabH, 6);
    ctx.stroke();

    const prog =
      i === 0 ? archive.bestiaryProgress() : archive.fragmentProgress();
    ctx.fillStyle = active ? "#00ffcc" : "rgba(200,220,235,0.55)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `${ARCHIVE_TABS[i]}  ${prog.found}/${prog.total}`,
      tx + L.tabW / 2,
      L.tabY + 20,
    );
  }

  // ── Entry list ──
  const scroll = state.scroll || 0;
  ctx.fillStyle = "rgba(6,12,20,0.75)";
  ctx.beginPath();
  ctx.roundRect(L.listX, L.contentY, L.listW, L.contentH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,255,204,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(L.listX, L.contentY, L.listW, L.contentH, 8);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(L.listX, L.contentY, L.listW, L.contentH);
  ctx.clip();

  for (let vi = 0; vi < L.visibleRows; vi++) {
    const idx = vi + scroll;
    if (idx >= entries.length) break;
    const e = entries[idx];
    const ry = L.contentY + 8 + vi * L.rowH;
    const selected = idx === selection;

    if (selected) {
      ctx.fillStyle = "rgba(0,255,204,0.10)";
      ctx.beginPath();
      ctx.roundRect(L.listX + 4, ry, L.listW - 8, L.rowH - 4, 4);
      ctx.fill();
      ctx.fillStyle = "#00ffcc";
      ctx.fillRect(L.listX + 4, ry, 3, L.rowH - 4);
    }

    ctx.textAlign = "left";
    ctx.font = selected ? "bold 13px monospace" : "13px monospace";
    if (e.unlocked) {
      ctx.fillStyle = selected ? "#ffffff" : "rgba(210,225,240,0.8)";
      ctx.fillText(e.label, L.listX + 16, ry + 19);
    } else {
      // Redacted: the player sees the slot exists, not what fills it.
      ctx.fillStyle = "rgba(140,155,175,0.4)";
      ctx.fillText("█".repeat(Math.min(14, e.label.length)), L.listX + 16, ry + 19);
    }
  }
  ctx.restore();

  // Scroll affordance
  if (entries.length > L.visibleRows) {
    ctx.textAlign = "center";
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(0,255,204,0.45)";
    if (scroll > 0) ctx.fillText("▲", L.listX + L.listW / 2, L.contentY - 4);
    if (scroll + L.visibleRows < entries.length) {
      ctx.fillText("▼", L.listX + L.listW / 2, L.contentY + L.contentH + 13);
    }
  }

  // ── Detail pane ──
  ctx.fillStyle = "rgba(6,12,20,0.75)";
  ctx.beginPath();
  ctx.roundRect(L.detailX, L.contentY, L.detailW, L.contentH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,255,204,0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(L.detailX, L.contentY, L.detailW, L.contentH, 8);
  ctx.stroke();

  const sel = entries[selection];
  const dx = L.detailX + 22;
  const maxW = L.detailW - 44;
  let dy = L.contentY + 34;

  if (!sel) {
    ctx.restore?.();
  } else if (!sel.unlocked) {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(150,165,185,0.6)";
    ctx.font = "bold 15px monospace";
    ctx.fillText("RECORD SEALED", dx, dy);
    dy += 26;
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(140,155,175,0.5)";
    const hint =
      tab === 0
        ? "Defeat this enemy to unlock its dossier."
        : "Recover this fragment in the field to read it.";
    for (const line of wrapText(ctx, hint, maxW)) {
      ctx.fillText(line, dx, dy);
      dy += 18;
    }
  } else if (tab === 0) {
    const b = BESTIARY[sel.key];
    ctx.textAlign = "left";
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 18px monospace";
    ctx.fillText(b.name, dx, dy);
    dy += 24;

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = THREAT_COLORS[b.threat] || "#ffcc44";
    ctx.fillText(`THREAT: ${String(b.threat).toUpperCase()}`, dx, dy);
    dy += 22;

    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(210,225,240,0.8)";
    for (const line of wrapText(ctx, b.description, maxW)) {
      ctx.fillText(line, dx, dy);
      dy += 17;
    }
    dy += 14;

    ctx.fillStyle = "#ffcc44";
    ctx.font = "bold 11px monospace";
    ctx.fillText("TACTICAL NOTE", dx, dy);
    dy += 17;
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(255,220,160,0.85)";
    for (const line of wrapText(ctx, b.tacticalNote, maxW)) {
      ctx.fillText(line, dx, dy);
      dy += 17;
    }
    dy += 14;

    ctx.fillStyle = "rgba(0,204,255,0.75)";
    ctx.font = "italic 12px monospace";
    for (const line of wrapText(ctx, `ARIA: ${b.ariaQuote}`, maxW)) {
      ctx.fillText(line, dx, dy);
      dy += 17;
    }
  } else {
    const f = MEMORY_FRAGMENTS.find((m) => m.id === sel.key);
    ctx.textAlign = "left";
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 18px monospace";
    ctx.fillText(f.title, dx, dy);
    dy += 22;

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "rgba(200,160,255,0.85)";
    ctx.fillText(`${f.member.toUpperCase()}  ·  ACT ${f.act}`, dx, dy);
    dy += 24;

    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(210,225,240,0.85)";
    for (const line of wrapText(ctx, f.text, maxW)) {
      ctx.fillText(line, dx, dy);
      dy += 17;
    }
    dy += 16;

    ctx.fillStyle = "rgba(0,204,255,0.75)";
    ctx.font = "italic 12px monospace";
    for (const line of wrapText(ctx, `ARIA: ${f.ariaReaction}`, maxW)) {
      ctx.fillText(line, dx, dy);
      dy += 17;
    }
  }

  // Footer
  ctx.textAlign = "center";
  ctx.font = "11px monospace";
  ctx.fillStyle = "rgba(110,130,150,0.55)";
  ctx.fillText(
    "W/S select  ·  A/D tab  ·  ESC back",
    w / 2,
    h - 16,
  );

  drawScanlines(ctx, w, h);
  ctx.textAlign = "left";
}

// ─── Modern art style ───────────────────────────────────────────────────────
// Same archiveLayout geometry (click hit-testing reads it); dossier styling.

function paragraph(ctx, text, x, y, maxW, lineH) {
  for (const line of wrapText(ctx, text, maxW)) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

function renderArchiveScreenModern(ctx, w, h, state) {
  const { tab, selection, archive } = state;
  const L = archiveLayout(w, h);
  const entries = archiveEntries(tab, archive);

  drawBackdrop(ctx, w, h, "steel", 1);
  drawTitle(ctx, "ARCHIVE", w / 2, 40, 28, UI.cyan);

  for (let i = 0; i < ARCHIVE_TABS.length; i++) {
    const tx = L.tabX0 + i * (L.tabW + 10);
    const active = i === tab;
    drawPanel(ctx, tx, L.tabY, L.tabW, L.tabH, {
      variant: active ? "raised" : "menu",
      accent: active ? UI.cyan : null,
      bar: active,
      chamfer: 8,
    });
    const prog = i === 0 ? archive.bestiaryProgress() : archive.fragmentProgress();
    ctx.font = uiFont(12, active ? 800 : 600);
    ctx.textAlign = "center";
    ctx.letterSpacing = "1.5px";
    ctx.fillStyle = active ? "#ffffff" : UI.textDim;
    ctx.fillText(`${ARCHIVE_TABS[i]}  ${prog.found}/${prog.total}`, tx + L.tabW / 2, L.tabY + 20);
    ctx.letterSpacing = "0px";
  }

  // ── Entry list ──
  const scroll = state.scroll || 0;
  drawPanel(ctx, L.listX, L.contentY, L.listW, L.contentH, { variant: "menu", accent: UI.cyan, chamfer: 14 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(L.listX, L.contentY + 2, L.listW, L.contentH - 4);
  ctx.clip();
  for (let vi = 0; vi < L.visibleRows; vi++) {
    const idx = vi + scroll;
    if (idx >= entries.length) break;
    const e = entries[idx];
    const ry = L.contentY + 8 + vi * L.rowH;
    const selected = idx === selection;
    if (selected) {
      drawPanel(ctx, L.listX + 6, ry, L.listW - 12, L.rowH - 4, { variant: "raised", accent: UI.cyan, bar: true, chamfer: 7 });
    }
    ctx.textAlign = "left";
    ctx.font = uiFont(13, selected ? 700 : 600);
    if (e.unlocked) {
      ctx.fillStyle = selected ? "#ffffff" : "#c3d1de";
      ctx.fillText(e.label, L.listX + 18, ry + 18);
    } else {
      // Redaction bar, like a blacked-out line in a dossier.
      const bw = Math.min(L.listW - 60, 12 + e.label.length * 6);
      ctx.fillStyle = UI.ink;
      ctx.fillRect(L.listX + 18, ry + 8, bw, 11);
      ctx.fillStyle = "rgba(111,138,163,0.22)";
      ctx.fillRect(L.listX + 18, ry + 8, bw, 1);
    }
  }
  ctx.restore();

  if (entries.length > L.visibleRows) {
    ctx.textAlign = "center";
    ctx.font = uiFont(10, 700);
    ctx.fillStyle = UI.cyan;
    if (scroll > 0) ctx.fillText("▲", L.listX + L.listW / 2, L.contentY - 4);
    if (scroll + L.visibleRows < entries.length) {
      ctx.fillText("▼", L.listX + L.listW / 2, L.contentY + L.contentH + 13);
    }
  }

  // ── Detail pane ──
  drawPanel(ctx, L.detailX, L.contentY, L.detailW, L.contentH, { variant: "menu", accent: UI.cyan, chamfer: 18 });
  const sel = entries[selection];
  const dx = L.detailX + 24;
  const maxW = L.detailW - 48;
  let dy = L.contentY + 26;

  if (sel && !sel.unlocked) {
    drawCaption(ctx, dx, dy - 4, "Record sealed", { size: 12, scheme: "steel" });
    dy += 38;
    ctx.textAlign = "left";
    ctx.font = uiFont(13, 500);
    ctx.fillStyle = UI.textDim;
    paragraph(ctx, tab === 0
      ? "Defeat this enemy to unlock its dossier."
      : "Recover this fragment in the field to read it.", dx, dy, maxW, 19);
  } else if (sel && tab === 0) {
    const b = BESTIARY[sel.key];
    drawCaption(ctx, dx, dy - 6, b.name, { size: 16 });
    dy += 38;
    const threat = THREAT_COLORS[b.threat] || UI.amber;
    ctx.fillStyle = threat;
    ctx.fillRect(dx, dy - 10, 4, 12);
    ctx.textAlign = "left";
    ctx.font = uiFont(12, 800);
    ctx.letterSpacing = "1.5px";
    ctx.fillText(`THREAT: ${String(b.threat).toUpperCase()}`, dx + 10, dy);
    ctx.letterSpacing = "0px";
    dy += 24;
    ctx.font = uiFont(14, 500);
    ctx.fillStyle = "#d3dee8";
    dy = paragraph(ctx, b.description, dx, dy, maxW, 20) + 12;
    drawSectionHeader(ctx, dx, dy - 12, maxW, "Tactical note", UI.amber, 11);
    dy += 14;
    ctx.font = uiFont(14, 500);
    ctx.fillStyle = "#ffe0ae";
    dy = paragraph(ctx, b.tacticalNote, dx, dy, maxW, 20) + 12;
    drawSectionHeader(ctx, dx, dy - 12, maxW, "ARIA", UI.cyan, 11);
    dy += 14;
    ctx.font = uiFont(14, 500);
    ctx.fillStyle = "#8feeff";
    paragraph(ctx, `“${b.ariaQuote}”`, dx, dy, maxW, 20);
  } else if (sel) {
    const f = MEMORY_FRAGMENTS.find((m) => m.id === sel.key);
    drawCaption(ctx, dx, dy - 6, f.title, { size: 16 });
    dy += 38;
    ctx.textAlign = "left";
    ctx.font = uiFont(12, 800);
    ctx.letterSpacing = "1.5px";
    ctx.fillStyle = "#c9a8ff";
    ctx.fillText(`${f.member.toUpperCase()}  ·  ACT ${f.act}`, dx, dy);
    ctx.letterSpacing = "0px";
    dy += 24;
    ctx.font = uiFont(14, 500);
    ctx.fillStyle = "#d3dee8";
    dy = paragraph(ctx, f.text, dx, dy, maxW, 20) + 12;
    drawSectionHeader(ctx, dx, dy - 12, maxW, "ARIA", UI.cyan, 11);
    dy += 14;
    ctx.font = uiFont(14, 500);
    ctx.fillStyle = "#8feeff";
    paragraph(ctx, `“${f.ariaReaction}”`, dx, dy, maxW, 20);
  }

  ctx.textAlign = "center";
  ctx.font = uiFont(11, 600);
  ctx.letterSpacing = "1px";
  ctx.fillStyle = UI.textFaint;
  ctx.fillText("W/S SELECT  ·  A/D TAB  ·  ESC BACK", w / 2, h - 16);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
}
