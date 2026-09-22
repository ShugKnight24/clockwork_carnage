/**
 * "Unlocked" celebration: a small caption-plate toast when progression earns a
 * loadout class, gear tier, badge part, finish, accessory or armour variant
 * (rules in src/systems/unlocks.js).
 *
 * AchievementSystem fires `cc:progress` on window when stats change (at most
 * once a second during play); this module re-evaluates unlocks then, announces
 * anything not yet in the `seen` store, and records it. DOM overlay in its own
 * shadow root, styled from the shared design tokens, so it works over either
 * art style without touching the HUD canvas.
 */

import { tokensCss } from "./design-tokens.js";
import {
  announcements,
  ensureUnlockStore,
  gameUnlockContext,
  newlyEarned,
  saveUnlockStore,
} from "../systems/unlocks.js";

const STYLE = `
${tokensCss(":host")}
:host { position: fixed; left: 50%; top: 14px; z-index: 60; pointer-events: none; transform: translateX(-50%); font-family: var(--cc-font); }
.toast { display: flex; align-items: stretch; filter: drop-shadow(3px 3px 0 var(--cc-ink)); opacity: 0; transform: translateY(-14px);
  transition: opacity var(--cc-dur-base) var(--cc-ease), transform var(--cc-dur-slow) var(--cc-ease); }
.toast.on { opacity: 1; transform: none; }
.tag { display: flex; align-items: center; padding: 0 10px; font: 800 var(--cc-type-section)/1 var(--cc-font); letter-spacing: 3px; text-transform: uppercase;
  color: var(--cc-caption-cream-text); background: var(--cc-caption-cream); border: var(--cc-ink-outline) solid var(--cc-ink); }
.plate { position: relative; display: grid; gap: 3px; padding: 7px 16px 7px 14px; min-width: 200px; background: var(--cc-panel-menu);
  border: var(--cc-ink-outline) solid var(--cc-ink); border-left: 0; box-shadow: inset 0 1px 0 rgba(185, 210, 232, 0.34), inset 4px 0 0 var(--cc-amber);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cc-chamfer)), calc(100% - var(--cc-chamfer)) 100%, 0 100%); }
.kind { font: 700 var(--cc-type-micro)/1 var(--cc-font); letter-spacing: 2px; text-transform: uppercase; color: var(--cc-amber); }
.name { font: 800 var(--cc-type-row)/1.1 var(--cc-font); letter-spacing: var(--cc-track-row); text-transform: uppercase; color: #fff; }
.where { font: 600 var(--cc-type-micro)/1 var(--cc-font); letter-spacing: 1px; color: var(--cc-text-dim); text-transform: uppercase; }
@media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
`;

class UnlockToast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <div class="toast" role="status" aria-live="polite">
        <span class="tag">Unlocked</span>
        <span class="plate"><span class="kind"></span><span class="name"></span><span class="where">Equip in Customize Agent</span></span>
      </div>`;
    this.queue = [];
    this.busy = false;
  }

  /** @param {{ kind: string, name: string }} msg */
  show(msg) {
    this.queue.push(msg);
    if (!this.busy) this.next();
  }

  next() {
    const msg = this.queue.shift();
    const t = this.shadowRoot.querySelector(".toast");
    if (!msg) {
      this.busy = false;
      return;
    }
    this.busy = true;
    const { kind, name } = msg;
    this.shadowRoot.querySelector(".kind").textContent = kind;
    this.shadowRoot.querySelector(".name").textContent = name;
    requestAnimationFrame(() => t.classList.add("on"));
    setTimeout(() => {
      t.classList.remove("on");
      setTimeout(() => this.next(), 320);
    }, 3200);
  }
}

if (typeof customElements !== "undefined" && !customElements.get("unlock-toast")) {
  customElements.define("unlock-toast", UnlockToast);
}

let listening = false;
let toastEl = null;

/** The shared toast element, created on first use. */
function toast() {
  if (!toastEl) {
    toastEl = document.createElement("unlock-toast");
    document.body.appendChild(toastEl);
  }
  return toastEl;
}

/**
 * Announce a battlefield gear drop. Same plate as an unlock, different lead —
 * the player picked this up rather than earning it through progression.
 * @param {string} kind e.g. "Armor"
 * @param {string} name e.g. "Juggernaut"
 */
export function showGearToast(kind, name) {
  toast().show({ kind: kind || "Gear", name: name || "Salvage" });
}

/** Start listening for progression. Call once after the Game has loaded its saves. */
export function initUnlockToasts(game) {
  // A second call would stack listeners and announce every unlock twice.
  if (listening) return;
  listening = true;
  const store = ensureUnlockStore(game.character, game.achievementStats, game.unlockedAchievements);
  let el = null;
  window.addEventListener("cc:progress", () => {
    const fresh = newlyEarned(gameUnlockContext(game, { fresh: true }), store.seen);
    if (!fresh.length) return;
    for (const id of fresh) store.seen[id] = true;
    // `store` already holds both halves. Re-reading `owned` through
    // ensureUnlockStore() rebuilt it from an empty character on any storage
    // read failure, which wiped grandfathered gear.
    saveUnlockStore(store);
    el = toast();
    try {
      game.audio?.menuConfirm?.();
    } catch (_) {}
    for (const msg of announcements(fresh)) el.show(msg);
  });
}
