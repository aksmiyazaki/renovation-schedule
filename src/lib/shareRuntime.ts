/**
 * Tiny module holding runtime flags about the sharing mode.
 * Kept dependency-free so both the store (persistence guard) and the
 * Firebase session module can use it without import cycles.
 */

let shareModeActive = false

export function setShareModeActive(active: boolean): void {
  shareModeActive = active
}

export function isShareModeActive(): boolean {
  return shareModeActive
}
