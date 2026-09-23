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
 *
 * With the game's message director attached, the toast is a view of its chip
 * lane: announcements queue there, wait out boss intros, fresh teach cards
 * and heavy combat, and show one at a time as a side chip under the minimap.
 * Outside play (the customize screen) it keeps its top-centre place.
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
/* A side chip in the director's lane: smaller, right-aligned, in from the right. */
:host([chip]) { left: auto; transform: none; }
:host([chip]) .toast { justify-content: flex-end; transform: translateX(18px); }
:host([chip]) .toast.on { transform: none; }
:host([chip]) .tag { padding: 0 7px; font-size: var(--cc-type-micro); letter-spacing: 2px; }
:host([chip]) .plate { min-width: 0; padding: 5px 10px 5px 10px; gap: 2px; }
:host([chip]) .name { font-size: var(--cc-type-body); }
/* A phone's lane is one line tall: kind and name side by side. */
:host([chip="line"]) .plate { display: flex; align-items: baseline; gap: 6px; padding: 4px 8px; white-space: nowrap; overflow: hidden; }
:host([chip="line"]) .name { font-size: var(--cc-type-label); overflow: hidden; text-overflow: ellipsis; }
:host([chip="line"]) .where { display: none; }
@media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
`;

/** Seconds before its end a chip starts to fade, so the next one follows a gap. */
const CHIP_FADE = 0.3;

let seq = 0;

class UnlockToast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <div class="toast" role="status" aria-live="polite">
        <span class="tag">Unlocked</span>
        <span class="plate"><span class="kind"></span><span class="name"></span><span class="where">Equip in Customize Agent</span></span>
      </div>`;
    this._queue = [];
    this.busy = false;
    /** The game's MessageDirector, when there is a game (initUnlockToasts). */
    this.director = null;
    this._shown = null;
    this._pump = 0;
    /** Called as each directed chip comes on screen (its sound). */
    this.onShow = null;
  }

  /** Announcements still waiting (in the director's chip lane when there is one). */
  get queue() {
    return this.director ? this.director.pending("chip").filter(isMine) : this._queue;
  }

  /** @param {{ kind: string, name: string, gear?: boolean }} msg */
  show(msg) {
    if (this.director) {
      this.director.post(`unlock:${++seq}`, msg.gear ? "gear" : "unlock", msg);
      this._startPump();
      return;
    }
    this._queue.push(msg);
    if (!this.busy) this.next();
  }

  _fill({ kind, name }) {
    this.shadowRoot.querySelector(".kind").textContent = kind;
    this.shadowRoot.querySelector(".name").textContent = name;
  }

  next() {
    const msg = this._queue.shift();
    const t = this.shadowRoot.querySelector(".toast");
    if (!msg) {
      this.busy = false;
      return;
    }
    this.busy = true;
    this._fill(msg);
    requestAnimationFrame(() => t.classList.add("on"));
    setTimeout(() => {
      t.classList.remove("on");
      setTimeout(() => this.next(), 320);
    }, 3200);
  }

  /**
   * Follow the director while it has something of ours. In play the HUD
   * frame runs the director; in menus nothing does, so this ticks it.
   */
  _startPump() {
    if (this._pump) return;
    const tick = () => {
      const d = this.director;
      const now = performance.now();
      const driven = now - d.drivenAt < 300;
      if (!driven) d.update(now / 1000);
      this._sync(driven ? d.lanes : null);
      const busy = this._shown || d.pending("chip").some(isMine);
      this._pump = busy ? setTimeout(tick, 60) : 0;
    };
    this._pump = setTimeout(tick, 0);
  }

  _sync(lanes) {
    const d = this.director;
    const cur = d.current("chip");
    const mine = cur && isMine(cur) ? cur : null;
    const t = this.shadowRoot.querySelector(".toast");
    if (mine !== this._shown) {
      this._shown = mine;
      t.classList.remove("on");
      if (mine) {
        this._fill(mine.data);
        this._place(lanes?.chips, lanes?.chipsShareHeadline);
        this.onShow?.();
        requestAnimationFrame(() => t.classList.add("on"));
      }
    } else if (mine && d.age(mine.key) > mine.duration - CHIP_FADE) {
      t.classList.remove("on");
    }
  }

  /** Into the chip lane (CSS px, same space as the HUD layer), or back to top centre. */
  _place(lane, line) {
    if (!lane) {
      this.removeAttribute("chip");
      this.style.removeProperty("right");
      this.style.removeProperty("top");
      this.style.removeProperty("max-width");
      return;
    }
    this.setAttribute("chip", line ? "line" : "");
    this.style.right = `${Math.max(0, window.innerWidth - (lane.x + lane.w))}px`;
    this.style.top = `${lane.y}px`;
    this.style.maxWidth = `${lane.w}px`;
  }
}

function isMine(item) {
  return item.kind === "unlock" || item.kind === "gear";
}

if (typeof customElements !== "undefined" && !customElements.get("unlock-toast")) {
  customElements.define("unlock-toast", UnlockToast);
}

let listening = false;
let toastEl = null;
let director = null;

/** The shared toast element, created on first use. */
function toast() {
  if (!toastEl) {
    toastEl = document.createElement("unlock-toast");
    document.body.appendChild(toastEl);
  }
  toastEl.director = director;
  return toastEl;
}

/**
 * Announce a battlefield gear drop. Same plate as an unlock, different lead —
 * the player picked this up rather than earning it through progression.
 * @param {string} kind e.g. "Armor"
 * @param {string} name e.g. "Juggernaut"
 */
export function showGearToast(kind, name) {
  toast().show({ kind: kind || "Gear", name: name || "Salvage", gear: true });
}

/** Start listening for progression. Call once after the Game has loaded its saves. */
export function initUnlockToasts(game) {
  // A second call would stack listeners and announce every unlock twice.
  if (listening) return;
  listening = true;
  director = game.messages ?? null;
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
    const chime = () => {
      try {
        game.audio?.menuConfirm?.();
      } catch (_) {}
    };
    // Directed chips chime as each one shows, not when it is queued.
    if (director) el.onShow = chime;
    else chime();
    for (const msg of announcements(fresh)) el.show(msg);
  });
}
