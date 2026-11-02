// analytics.js — Consent-first Google Analytics wrapper for Clockwork Carnage.
// Loads gtag.js only after explicit user opt-in. Exposes a simple
// trackEvent(name, params) API, and makes the session ID only on opt-in.
// The playtest log's level events (src/systems/playtest-log.js) come through
// here too, so they reach Google Analytics only with consent.

import { BUILD } from "../src/build-info.js";
import { onPlaytestEvent } from "../src/systems/playtest-log.js";

const GA_ID = "G-M2ETG779YT";
const CONSENT_KEY = "cc_analytics_consent";
const SESSION_KEY = "cc_session_id";

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

// Nothing is written before the player says yes: the ID is made on accept.
let sessionId = null;

function ensureSessionId() {
  sessionId = sessionId || storageGet(SESSION_KEY);
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2, 11);
    storageSet(SESSION_KEY, sessionId);
  }
  return sessionId;
}

let initialized = false;

// Track which modes the player visits this page-session.
const modesPlayed = new Set();

function loadGtag() {
  if (window.gtag) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    dataLayer.push(arguments);
  };
  gtag("js", new Date());
  // GA4 never stores IP addresses, so there is no anonymize_ip to set.
  gtag("config", GA_ID);
}

/**
 * Opt in or out after the card: Settings › Gameplay › Share Play Data.
 * Opting out stops every event, sets Google's own opt-out flag for the page
 * and forgets the session ID.
 */
function setAnalyticsConsent(on) {
  storageSet(CONSENT_KEY, on ? "accepted" : "declined");
  window[`ga-disable-${GA_ID}`] = !on;
  if (on) {
    ensureSessionId();
    loadGtag();
  } else {
    sessionId = null;
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }
  document.getElementById("cc-analytics-modal")?.remove();
}

// ── Consent banner ─────────────────────────────────────────────
function createConsentModal() {
  if (document.getElementById("cc-analytics-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "cc-analytics-modal";
  overlay.setAttribute("role", "region");
  overlay.setAttribute("aria-label", "Analytics consent");
  Object.assign(overlay.style, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    width: "min(400px, calc(100% - 32px))",
    background: "rgba(0,0,0,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(0,255,200,0.25)",
    borderRadius: "10px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    zIndex: "9999",
  });

  const box = document.createElement("div");
  Object.assign(box.style, {
    color: "#fff",
    padding: "14px",
    width: "100%",
    fontFamily: "inherit",
  });
  box.innerHTML =
    "<p style='margin:0 0 6px;font-size:13px;line-height:1.35'>Help improve Clockwork Carnage? Anonymous play patterns only.</p>" +
    "<p style='margin:0 0 10px;font-size:11px;line-height:1.4;opacity:0.8'>Allow sends Google Analytics which modes and levels you play, clear, fail or quit, and the game's build: no name or account. " +
    "No thanks sends nothing. Change it any time in Settings › Gameplay › Share Play Data. " +
    "The playtest log stays on this device unless you copy or save it and send it to us.</p>" +
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button id="cc-analytics-decline" style="padding:7px 12px;cursor:pointer">No thanks</button>' +
    '<button id="cc-analytics-accept" style="padding:7px 12px;cursor:pointer">Allow</button></div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document
    .getElementById("cc-analytics-accept")
    .addEventListener("click", () => {
      storageSet(CONSENT_KEY, "accepted");
      ensureSessionId();
      loadGtag();
      overlay.remove();
    });
  document
    .getElementById("cc-analytics-decline")
    .addEventListener("click", () => {
      storageSet(CONSENT_KEY, "declined");
      overlay.remove();
    });
}

// ── Public API ─────────────────────────────────────────────────
function initAnalytics() {
  if (initialized) return;
  initialized = true;
  window.addEventListener("cc:analytics-consent", (e) => setAnalyticsConsent(!!e.detail));
  const consent = storageGet(CONSENT_KEY);
  if (consent === "accepted") {
    ensureSessionId();
    loadGtag();
  } else if (consent === null) {
    window.addEventListener("cc:first-interaction", createConsentModal, {
      once: true,
    });
  }
  // Fire session_end on unload
  window.addEventListener("beforeunload", () => {
    trackEvent("session_end", {
      total_seconds: Math.floor(performance.now() / 1000),
      modes_played: Array.from(modesPlayed),
    });
  });
}

function trackEvent(name, params = {}) {
  if (storageGet(CONSENT_KEY) !== "accepted") return;
  if (params.mode) modesPlayed.add(params.mode);
  if (window.gtag) {
    window.gtag(
      "event",
      name,
      Object.assign({ session_id: ensureSessionId() }, params),
    );
  }
}

// The playtest log's level events, as GA4 events (act, level and build only).
const LEVEL_EVENTS = new Set(["level_start", "level_complete", "level_death", "level_retry", "level_quit"]);
const buildTag = () => `${BUILD.version}${BUILD.sha !== "dev" ? `+${BUILD.sha}` : "-dev"}`;

function trackLevelEvent(event) {
  if (!LEVEL_EVENTS.has(event.type) || event.mode !== "campaign") return;
  const params = { mode: "campaign", act: event.act, level: event.level, build: buildTag() };
  if (event.type === "level_complete" && event.grade) params.grade = event.grade;
  if (event.type === "level_death" && event.killer) params.killer = event.killer;
  trackEvent(event.type, params);
}

onPlaytestEvent(trackLevelEvent);

export { initAnalytics, trackEvent, trackLevelEvent, setAnalyticsConsent };
