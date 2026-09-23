/**
 * Message director: who gets the screen for transient messages, and when.
 *
 * The campaign's messages used to place themselves: an unlock toast, a
 * Chronos teach card, ARIA's plate, the boss intro and an achievement could
 * all be up at once, stacked at the top of the screen. The director owns that
 * real estate in lanes (rectangles in src/ui/message-lanes.js):
 *   headline  top centre, one at a time: teach card > boss intro > level title
 *   comms     ARIA and the squad (their own queue in aria-comms.js); placed
 *             around the headline, held while a plate is up, or folded into
 *             a teach card as its narration
 *   chip      right side, one at a time: achievement > unlock > gear, held
 *             back through intense moments
 *
 * Pure: no DOM, no canvas. The game posts, updates it once per HUD frame
 * with the real time, and each producer asks before it draws. Its clock
 * stops while the game is paused and a long frame is clamped, so a message
 * never ages away behind the pause menu.
 */

/**
 * Per kind: lane, priority (higher first), duration (s; none = up until the
 * producer says done), ttl (longest wait in the queue before it is dropped),
 * sticky + minHold (up until done; after minHold a waiting `preempts` item
 * may take its turn and it comes back after), maxDefer (a chip held back by
 * intense moments shows anyway after this long), top (drawn where ARIA's
 * top plate goes, so it waits for one that is up to finish).
 */
export const MESSAGE_KINDS = {
  teach: { lane: "headline", priority: 100, sticky: true, minHold: 6, top: true },
  bossIntro: { lane: "headline", priority: 90, duration: 3.5, ttl: 8, preempts: true },
  // Reserved: nothing draws a level title in play yet.
  levelTitle: { lane: "headline", priority: 80, duration: 3, ttl: 6, preempts: true, top: true },
  achievement: { lane: "chip", priority: 50, duration: 3.5, maxDefer: 25 },
  unlock: { lane: "chip", priority: 40, duration: 3.2, maxDefer: 25 },
  gear: { lane: "chip", priority: 30, duration: 3.2, ttl: 12 },
};

/** Most items a lane will queue; past it the lowest priority, oldest goes. */
export const LANE_CAPS = { headline: 4, chip: 16 };

/** A chip backlog this long plays each chip faster (a first session earns a burst of unlocks). */
const CHIP_BACKLOG = 3;
const CHIP_HURRY = 0.6;
const CHIP_MIN = 1.8;

/** A frame longer than this (a stall, a backgrounded tab) counts as this. */
const MAX_STEP = 0.25;

/** Index of the item to show next: highest priority, then the oldest. */
export function pickNext(queue) {
  let best = -1;
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    const b = queue[best];
    const pq = q.priority ?? commsRule(q).priority;
    const pb = b ? (b.priority ?? commsRule(b).priority) : -Infinity;
    if (pq > pb || (pq === pb && (q.queuedAt ?? q.postedAt ?? 0) < (b.queuedAt ?? b.postedAt ?? 0))) best = i;
  }
  return best;
}

/**
 * ARIA and squad lines: projected beats first, then her prominent lines,
 * then squad chatter, then idle chatter. The ttl is how long a line may wait
 * behind others before it is no longer worth saying.
 */
export function commsRule(msg) {
  if (msg.projected) return { priority: 70, ttl: 30 };
  if (msg.speaker && msg.speaker !== "ARIA") return { priority: 40, ttl: 12 };
  if (msg.prominent) return { priority: 50, ttl: 20 };
  return { priority: 20, ttl: 6 };
}

/**
 * Drop comms lines that waited past their ttl (`queuedAt` on the comms
 * clock). Mutates `queue`; returns what was dropped.
 */
export function pruneQueue(queue, now) {
  const dropped = [];
  for (let i = queue.length - 1; i >= 0; i--) {
    const m = queue[i];
    if (now - (m.queuedAt ?? now) > commsRule(m).ttl) dropped.push(...queue.splice(i, 1));
  }
  return dropped;
}

/**
 * ARIA lines a teach card takes over as its narration: the "new pattern in
 * the shard" line that fires as every card comes up, and for Foresight,
 * whose lesson is shifting, her first-shift lines.
 */
export function teachFolds(power) {
  const folds = ["powerUnlocked"];
  if (power === "foresight") folds.push("chronoShiftActivated", "chronoShiftLoud");
  return folds;
}

/** Whether a comms line is about the lesson on this headline. */
export function foldsInto(msg, headline) {
  if (headline?.kind !== "teach") return false;
  if (msg.speaker && msg.speaker !== "ARIA") return false;
  return (headline.data?.fold ?? []).includes(msg.category);
}

/**
 * Where a comms line goes, given the headline on screen: its usual place,
 * held until a boss intro or level title clears, folded into a teach card,
 * or the low slot above the vitals beside a teach card.
 * @returns {"top" | "hold" | "fold" | "low"}
 */
export function commsPlacement(msg, headline) {
  if (!headline) return "top";
  if (headline.kind === "bossIntro" || headline.kind === "levelTitle") return "hold";
  if (foldsInto(msg, headline)) return "fold";
  return "low";
}

/**
 * Heavy combat, for holding chips back: hurt in the last 2.5 s, slow-mo, or
 * three hostiles engaged close by.
 */
export function combatIntense({ sinceHurt = Infinity, engaged = 0, slowMo = false } = {}) {
  return sinceHurt < 2.5 || slowMo || engaged >= 3;
}

export class MessageDirector {
  constructor() {
    this.clock = 0;
    this._last = null;
    this.intense = false;
    this.queues = { headline: [], chip: [] };
    this.active = { headline: null, chip: null };
    /** key -> live item, or "done" / "expired" once it has gone. */
    this._status = new Map();
    /** Lane rectangles for this frame (message-lanes.js), set by the game. */
    this.lanes = null;
    /** performance.now() of the last update from a HUD frame. */
    this.drivenAt = -Infinity;
    /** A comms plate is up in the top comms slot (set by the game each frame). */
    this.commsTop = false;
  }

  /**
   * Ask for a lane. Posting a key that is queued or showing returns it
   * unchanged. `over` can override the kind's timings (e.g. `{ duration }`).
   */
  post(key, kind, data = null, over = null) {
    const live = this._status.get(key);
    if (live && typeof live === "object") return live;
    const k = MESSAGE_KINDS[kind];
    if (!k) throw new Error(`unknown message kind: ${kind}`);
    const item = { key, kind, ...k, ...over, data, postedAt: this.clock, shownAt: null, status: "queued" };
    const q = this.queues[item.lane];
    if (q.length >= (LANE_CAPS[item.lane] ?? Infinity)) this._drop(q);
    q.push(item);
    this._status.set(key, item);
    return item;
  }

  /** Drop the lowest-priority, oldest item of a full queue. */
  _drop(q) {
    let worst = 0;
    for (let i = 1; i < q.length; i++) {
      if (q[i].priority < q[worst].priority || (q[i].priority === q[worst].priority && q[i].postedAt < q[worst].postedAt)) worst = i;
    }
    this._finish(q.splice(worst, 1)[0], "expired");
  }

  _finish(item, how) {
    item.status = how;
    this._status.set(item.key, how);
    if (this.active[item.lane] === item) this.active[item.lane] = null;
  }

  _show(item) {
    if (item.lane === "chip" && this.queues.chip.length >= CHIP_BACKLOG && item.duration != null) {
      item.duration = Math.max(CHIP_MIN, item.duration * CHIP_HURRY);
    }
    item.status = "showing";
    item.shownAt = this.clock;
    this.active[item.lane] = item;
  }

  /** The producer is finished with it (shown or not). */
  done(key) {
    const item = this._status.get(key);
    if (!item || typeof item !== "object") return;
    const q = this.queues[item.lane];
    const i = q.indexOf(item);
    if (i >= 0) q.splice(i, 1);
    this._finish(item, "done");
  }

  /** @returns {"queued" | "showing" | "done" | "expired" | null} */
  status(key) {
    const s = this._status.get(key);
    return s == null ? null : typeof s === "object" ? s.status : s;
  }

  showing(key) {
    return this.status(key) === "showing";
  }

  /** Seconds since it came on screen, or -1 when it is not showing. */
  age(key) {
    const s = this._status.get(key);
    return s && typeof s === "object" && s.status === "showing" ? this.clock - s.shownAt : -1;
  }

  current(lane) {
    return this.active[lane];
  }

  pending(lane) {
    return this.queues[lane];
  }

  /** Where a comms line goes right now (see commsPlacement). */
  commsPlacement(msg) {
    // A headline about to show counts: a line that starts now would be
    // under it (or over the boss intro) a frame later.
    const q = this.queues.headline;
    return commsPlacement(msg, this.active.headline ?? q[pickNext(q)] ?? null);
  }

  /** Forget a lane (a new level: the last one's plates are stale). */
  resetLane(lane) {
    for (const item of [...this.queues[lane], this.active[lane]]) {
      if (item) this._status.delete(item.key);
    }
    this.queues[lane] = [];
    this.active[lane] = null;
  }

  reset() {
    for (const lane of Object.keys(this.queues)) this.resetLane(lane);
    this._status.clear();
  }

  /**
   * Advance to `now` (seconds, real time) and hand out the lanes.
   * @param {number} now
   * @param {{ paused?: boolean, intense?: boolean }} [opts]
   */
  update(now, { paused = false, intense = false } = {}) {
    const dt = this._last == null ? 0 : Math.max(0, Math.min(MAX_STEP, now - this._last));
    this._last = now;
    if (paused) return;
    this.clock += dt;
    this.intense = intense;
    this._step("headline");
    this._step("chip");
  }

  _step(lane) {
    const q = this.queues[lane];
    const a = this.active[lane];
    const t = this.clock;
    if (a && a.duration != null && t - a.shownAt >= a.duration) this._finish(a, "done");
    for (let i = q.length - 1; i >= 0; i--) {
      if (q[i].ttl != null && t - q[i].postedAt > q[i].ttl) this._finish(q.splice(i, 1)[0], "expired");
    }
    const i = pickNext(q);
    if (i < 0) return;
    const next = q[i];
    const cur = this.active[lane];
    if (cur) {
      // A sticky headline that has been read may step aside for a timed one.
      if (!(cur.sticky && next.preempts && t - cur.shownAt >= cur.minHold)) return;
      cur.status = "queued";
      cur.shownAt = null;
      q.push(cur);
    } else if (lane === "chip" && this._holdChips(next)) {
      return;
    } else if (next.top && this.commsTop) {
      // ARIA is mid-line where the card goes; her next line goes low.
      return;
    }
    q.splice(q.indexOf(next), 1);
    this._show(next);
  }

  /**
   * Chips wait out a boss intro or level title (always), a teach card's
   * first read and heavy combat (up to the chip's maxDefer). On a phone the
   * chip lane is where the headline is, so there they wait for any headline.
   */
  _holdChips(next) {
    const head = this.active.headline;
    if (head && (!head.sticky || this.lanes?.chipsShareHeadline)) return true;
    const busy = this.intense || (head && this.clock - head.shownAt < head.minHold);
    if (!busy) return false;
    return !(next.maxDefer != null && this.clock - next.postedAt >= next.maxDefer);
  }
}
