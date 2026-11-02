/**
 * Handing the playtest log to the player: Copy / Download session (pause
 * menu, game-over screen) and the F8 bug report (a screenshot plus a state
 * snapshot). Both run from the player's own key press or tap, so the
 * clipboard and the download are allowed, iOS Safari included.
 */
import { BUILD } from "../build-info.js";
import { WEAPONS } from "../data/weapons.js";
import { activeDevice } from "../ui/input-glyphs.js";
import { exportSession, logEvent, recentEvents } from "./playtest-log.js";

const stamp = (d = new Date()) => d.toISOString().slice(0, 19).replace(/[:T]/g, "-");

/** `clockwork-carnage-session-0.9.0-2026-11-01-14-02-33.json` */
export function sessionFileName(kind = "session", ext = "json", d = new Date()) {
  return `clockwork-carnage-${kind}-${BUILD.version}-${stamp(d)}.${ext}`;
}

/** Text to the clipboard: the async API where there is one, a selected textarea where not. */
export function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true, () => legacyCopy(text));
  } catch (_) {}
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

/**
 * A file to the player's device: a Blob behind a link with a download
 * attribute (iOS Safari 13+ asks where to save it). Where links cannot
 * download, the file opens in a new tab to save or share from there.
 */
export function saveFile(name, blob) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    if ("download" in a) {
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (!window.open(url, "_blank")) {
      location.href = url;
    }
    // iOS reads the blob after the click returns: let it go later.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch (_) {
    return false;
  }
}

/** A short line over everything ("Copied", "Saved"), gone again in a moment. */
export function flash(text) {
  if (typeof document === "undefined") return;
  let el = document.getElementById("cc-playtest-flash");
  if (!el) {
    el = document.createElement("div");
    el.id = "cc-playtest-flash";
    el.setAttribute("role", "status");
    el.style.cssText =
      "position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top));transform:translateX(-50%);z-index:10000;" +
      "padding:8px 14px;border-radius:8px;background:rgba(0,0,0,0.85);color:#22e6c0;border:1px solid rgba(34,230,192,0.4);" +
      "font:600 14px/1.2 system-ui,sans-serif;pointer-events:none;transition:opacity .25s;";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = "1";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => (el.style.opacity = "0"), 1600);
}

/** Pause menu / game over: the session on the clipboard and in a file. */
export function shareSession(game) {
  const json = JSON.stringify(exportSession(game), null, 2);
  const copied = copyText(json);
  const saved = saveFile(sessionFileName(), new Blob([json], { type: "application/json" }));
  game?.audio?.menuConfirm?.();
  return copied.then((ok) => {
    const text = ok && saved ? "Copied · Saved" : ok ? "Copied" : saved ? "Saved" : "Couldn't export the session";
    flash(text);
    return { copied: ok, saved };
  });
}

/** The game canvas with the HUD over it, as the reel's poster frame is made (js/main.js). */
export function captureScreenshot(game) {
  const { canvas, hudCanvas } = game ?? {};
  if (!canvas) return null;
  // A WebGL canvas keeps its drawing buffer only until it is composited:
  // draw a frame and read it back in the same task.
  try {
    game.render?.();
  } catch (_) {}
  const out = document.createElement("canvas");
  out.width = hudCanvas?.width || canvas.width;
  out.height = hudCanvas?.height || canvas.height;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  if (hudCanvas) ctx.drawImage(hudCanvas, 0, 0, out.width, out.height);
  return out;
}

/** What the game was doing when the player pressed F8. */
export function bugSnapshot(game) {
  const p = game?.player ?? {};
  const c = game?.campaign;
  const weaponId = p.weapons?.[p.currentWeapon];
  return {
    format: "clockwork-carnage-bug/1",
    at: new Date().toISOString(),
    build: { ...BUILD },
    state: game?.state ?? null,
    mode: game?.mode ?? null,
    level:
      game?.mode === "campaign" && c
        ? { act: c.act, level: (c.level ?? 0) + 1, name: game.map?.name ?? "" }
        : game?.mode === "tutorial"
          ? { prologueStep: game.tutorial?.def?.id ?? null }
          : null,
    player: {
      x: +(p.x ?? 0).toFixed(2),
      y: +(p.y ?? 0).toFixed(2),
      z: +(p.z ?? 0).toFixed(2),
      angle: +(p.angle ?? 0).toFixed(3),
      health: p.health ?? null,
      maxHealth: p.maxHealth ?? null,
      alive: p.alive ?? null,
      weapon: weaponId != null ? { id: weaponId, name: WEAPONS[weaponId]?.name ?? null } : null,
    },
    input: activeDevice(game),
    settings: game?.settings ? { ...game.settings } : null,
    fps: game?.quality ? Math.round(game.quality.averageFPS ?? 0) : null,
    viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}` : null,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    recentEvents: recentEvents(20),
  };
}

/** F8 (or the touch pause menu's Report bug): a PNG and a JSON snapshot, saved. */
export function reportBug(game) {
  const snap = bugSnapshot(game);
  logEvent(game, "bug_report", { state: snap.state });
  const d = new Date();
  let shot = null;
  try {
    shot = captureScreenshot(game);
  } catch (_) {}
  const savedJson = saveFile(sessionFileName("bug", "json", d), new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" }));
  if (shot) {
    // toBlob is async: the PNG lands just after the snapshot.
    shot.toBlob((blob) => {
      const ok = blob && saveFile(sessionFileName("bug", "png", d), blob);
      flash(ok && savedJson ? "Bug report saved" : savedJson ? "Bug report saved (no screenshot)" : "Couldn't save the bug report");
    }, "image/png");
  } else {
    flash(savedJson ? "Bug report saved (no screenshot)" : "Couldn't save the bug report");
  }
  return snap;
}
