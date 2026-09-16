export function requestPointerLockSafe(element) {
  if (!element || typeof element.requestPointerLock !== "function") return;
  try {
    const result = element.requestPointerLock();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // Pointer lock requires a valid focused document and a user gesture.
  }
}

export function exitPointerLockSafe(doc = document) {
  if (!doc.pointerLockElement || typeof doc.exitPointerLock !== "function") return;
  try {
    const result = doc.exitPointerLock();
    if (result && typeof result.catch === "function") result.catch(() => {});
  } catch {
    // Already unlocked or disallowed by the current document context.
  }
}
