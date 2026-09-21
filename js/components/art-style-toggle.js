import {
  ART_LEGACY,
  ART_REALISTIC,
  ART_STYLES,
  getArtStyle,
  onArtStyleChange,
  setArtStyle,
} from "../../src/rendering/art-style.js";

const template = document.createElement("template");
template.innerHTML = `
<style>
  :host {
    position: absolute;
    right: max(16px, env(safe-area-inset-right, 16px));
    bottom: max(14px, env(safe-area-inset-bottom, 14px));
    z-index: 3;
    display: block;
    font-family: "Courier New", monospace;
    cursor: default;
  }
  .wrap {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .label {
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 3px;
    color: rgba(136, 153, 170, 0.6);
  }
  .seg {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 2px;
    border: 1px solid rgba(0, 255, 204, 0.22);
    border-radius: 3px;
    background: rgba(2, 2, 16, 0.6);
    box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.6);
  }
  .thumb {
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: 2px;
    width: calc(33.333% - 1.333px);
    border-radius: 2px;
    background: linear-gradient(180deg, rgba(0, 255, 204, 0.2), rgba(0, 255, 204, 0.08));
    box-shadow:
      inset 0 0 0 1px rgba(0, 255, 204, 0.45),
      0 0 12px rgba(0, 255, 204, 0.18);
    transition: transform 0.28s cubic-bezier(0.3, 0.7, 0.2, 1);
    pointer-events: none;
  }
  :host([data-style="modern"]) .thumb {
    transform: translateX(100%);
  }
  :host([data-style="realistic"]) .thumb {
    transform: translateX(200%);
  }
  button {
    position: relative;
    z-index: 1;
    min-width: 74px;
    padding: 6px 12px;
    border: 0;
    border-radius: 2px;
    background: transparent;
    font: inherit;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 2px;
    color: rgba(170, 221, 255, 0.45);
    cursor: pointer;
    transition: color 0.2s, text-shadow 0.2s;
  }
  button:hover {
    color: rgba(170, 221, 255, 0.85);
  }
  button[aria-pressed="true"] {
    color: #00ffcc;
    text-shadow: 0 0 8px rgba(0, 255, 204, 0.6);
    cursor: default;
  }
  button:focus-visible {
    outline: 1px solid #00ffcc;
    outline-offset: 2px;
  }
  @media (hover: none) and (pointer: coarse) {
    button {
      min-height: 34px;
    }
  }
  /* Phone landscape: the bottom edge holds the prompt and features, the top
     corners are free beside the centred title. */
  @media (max-height: 420px) and (hover: none) and (pointer: coarse) {
    :host {
      top: max(6px, env(safe-area-inset-top, 6px));
      right: max(10px, env(safe-area-inset-right, 10px));
      bottom: auto;
    }
    .label {
      display: none;
    }
    button {
      min-width: 64px;
      min-height: 30px;
      padding: 4px 8px;
    }
  }
  /* Narrow portrait: the title column scrolls, so sit in the flow under it. */
  @media (max-width: 520px) and (min-height: 421px) {
    :host {
      position: static;
      margin-top: 14px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .thumb {
      transition: none;
    }
  }
</style>
<div class="wrap" role="group" aria-label="Art style">
  <span class="label" aria-hidden="true">ART</span>
  <div class="seg">
    <span class="thumb"></span>
    <button type="button" data-value="0" aria-pressed="false">LEGACY</button>
    <button type="button" data-value="1" aria-pressed="false">COMIC</button>
    <button type="button" data-value="2" aria-pressed="false">MODERN</button>
  </div>
</div>
`;

/**
 * Title-screen Legacy / Comic / Modern art switch (ids 0 / 1 / 2). Drives the shared art-style module;
 * Game persists the choice through its onArtStyleChange subscription.
 */
export class ArtStyleToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.buttons = [...this.shadowRoot.querySelectorAll("button")];

    this.shadowRoot.addEventListener("click", (e) => {
      const btn = e.target.closest?.("button");
      if (btn) this.select(Number(btn.dataset.value));
    });
    // Clicks and keys on the toggle must not reach #titleScreen / the document,
    // where they would start the game.
    this.addEventListener("click", (e) => e.stopPropagation());
    this.addEventListener("keydown", (e) => this.onKey(e));
  }

  connectedCallback() {
    this.sync(getArtStyle());
    this._unsubscribe ??= onArtStyleChange((style) => this.sync(style));
  }

  disconnectedCallback() {
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  select(style) {
    setArtStyle(style);
  }

  onKey(e) {
    const keys = ["Enter", "Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(e.code)) return;
    e.stopPropagation();
    if (e.code === "Enter" || e.code === "Space") return; // native button click
    e.preventDefault();
    const dir = e.code === "ArrowLeft" || e.code === "ArrowUp" ? -1 : 1;
    const next = Math.max(ART_LEGACY, Math.min(ART_REALISTIC, getArtStyle() + dir));
    this.select(next);
    this.buttons[next].focus();
  }

  sync(style) {
    this.dataset.style = ["legacy", "modern", "realistic"][ART_STYLES.indexOf(style)] ?? "modern";
    this.buttons.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(Number(btn.dataset.value) === style));
    });
  }
}

customElements.define("art-style-toggle", ArtStyleToggle);
