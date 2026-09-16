// analytics.js — Consent-first Google Analytics wrapper for Clockwork Carnage.
// Loads gtag.js only after explicit user opt-in. Exposes a simple
// trackEvent(name, params) API and handles session ID generation.

const GA_ID = "G-M2ETG779YT";
const CONSENT_KEY = "cc_analytics_consent";
const SESSION_KEY = "cc_session_id";

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}

let sessionId = storageGet(SESSION_KEY);
if (!sessionId) {
  sessionId = Math.random().toString(36).slice(2, 11);
  storageSet(SESSION_KEY, sessionId);
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
  gtag("config", GA_ID, { anonymize_ip: true });
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
    "<p style='margin:0 0 10px;font-size:13px;line-height:1.35'>Help improve Clockwork Carnage? Anonymous play patterns only.</p>" +
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button id="cc-analytics-decline" style="padding:7px 12px;cursor:pointer">No thanks</button>' +
    '<button id="cc-analytics-accept" style="padding:7px 12px;cursor:pointer">Allow</button></div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document
    .getElementById("cc-analytics-accept")
    .addEventListener("click", () => {
      storageSet(CONSENT_KEY, "accepted");
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
  const consent = storageGet(CONSENT_KEY);
  if (consent === "accepted") {
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
      Object.assign({ session_id: sessionId }, params),
    );
  }
}

export { initAnalytics, trackEvent };
