// ═══════════════════════════════════════════════════════════════════
// CLOCKWORK CARNAGE — Network Protocol (Shared)
// Message types and serialization for client/server communication
// ═══════════════════════════════════════════════════════════════════

export const MSG = {
  // Client → Server
  JOIN: 0x01,
  LEAVE: 0x02,
  INPUT: 0x03, // player input state (keys, mouse)
  SHOOT: 0x04,
  CHAT: 0x05,

  // Server → Client
  WELCOME: 0x10, // server assigns player id + lobby state
  PLAYER_JOIN: 0x11,
  PLAYER_LEAVE: 0x12,
  STATE: 0x13, // authoritative game state snapshot
  HIT: 0x14, // damage event
  KILL: 0x15,
  ROUND_START: 0x16,
  ROUND_END: 0x17,
  CHAT_RELAY: 0x18,

  // Shared
  PING: 0xf0,
  PONG: 0xf1,
};

/**
 * Encode a message as JSON string.
 * Future: replace with binary (ArrayBuffer) for bandwidth.
 */
export function encode(type, payload = {}) {
  return JSON.stringify({ t: type, d: payload, ts: Date.now() });
}

/**
 * Decode a message string back to { type, data, timestamp }.
 */
export function decode(raw) {
  const msg = JSON.parse(raw);
  return { type: msg.t, data: msg.d, timestamp: msg.ts };
}

/**
 * Pack player input into a compact object.
 * Server-authoritative: client sends intent, server resolves movement.
 */
export function packInput(keys, angle, shooting) {
  return {
    f: keys.forward ? 1 : 0,
    b: keys.backward ? 1 : 0,
    l: keys.left ? 1 : 0,
    r: keys.right ? 1 : 0,
    a: Math.round(angle * 1000) / 1000,
    s: shooting ? 1 : 0,
  };
}

/**
 * Unpack input on server side.
 */
export function unpackInput(packed) {
  const rawAngle = Number(packed.a);
  return {
    forward: !!packed.f,
    backward: !!packed.b,
    left: !!packed.l,
    right: !!packed.r,
    angle: Number.isFinite(rawAngle) ? rawAngle : 0,
    shooting: !!packed.s,
  };
}
