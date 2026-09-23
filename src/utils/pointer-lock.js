export function requestPointerLockSafe(element) {
  if (!element || typeof element.requestPointerLock !== "function") return;
  try {
    const result = element.requestPointerLock();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // Pointer lock requires a valid focused document and a user gesture.
  }
}

// The default is read before the try block below, so a missing `document` —
// a unit test, a worker — must be handled here rather than caught there.
export function exitPointerLockSafe(doc = typeof document === "undefined" ? null : document) {
  if (!doc || !doc.pointerLockElement || typeof doc.exitPointerLock !== "function") return;
  try {
    const result = doc.exitPointerLock();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // Already unlocked or disallowed by the current document context.
  }
}
