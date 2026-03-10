// analytics.js — Consent-first Google Analytics wrapper for Clockwork Carnage.
// Loads gtag.js only after explicit user opt-in. Exposes a simple
// trackEvent(name, params) API and handles session ID generation.

const GA_ID = "G-M2ETG779YT";
const CONSENT_KEY = "cc_analytics_consent";
const SESSION_KEY = "cc_session_id";

let sessionId = localStorage.getItem(SESSION_KEY);
if (!sessionId) {
  sessionId = Math.random().toString(36).substr(2, 9);
  localStorage.setItem(SESSION_KEY, sessionId);
}

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

// ── Consent modal ──────────────────────────────────────────────
function createConsentModal() {
  if (document.getElementById("cc-analytics-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "cc-analytics-modal";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999",
  });

  const box = document.createElement("div");
  Object.assign(box.style, {
    background: "#111",
    color: "#fff",
    padding: "24px",
    maxWidth: "400px",
    borderRadius: "8px",
    textAlign: "center",
    fontFamily: "inherit",
  });
  box.innerHTML =
    "<p style='margin:0 0 16px'>Help us improve Clockwork Carnage?<br>We track anonymous play patterns only.</p>" +
    '<button id="cc-analytics-accept" style="margin:0 8px;padding:8px 16px;cursor:pointer">Accept</button>' +
    '<button id="cc-analytics-decline" style="margin:0 8px;padding:8px 16px;cursor:pointer">Decline</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document
    .getElementById("cc-analytics-accept")
    .addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "accepted");
      loadGtag();
      overlay.remove();
    });
  document
    .getElementById("cc-analytics-decline")
    .addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "declined");
      overlay.remove();
    });
}

// ── Public API ─────────────────────────────────────────────────
function initAnalytics() {
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === "accepted") {
    loadGtag();
  } else if (consent === null) {
    createConsentModal();
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
  if (localStorage.getItem(CONSENT_KEY) !== "accepted") return;
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
