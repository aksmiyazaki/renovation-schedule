import { sanitizeRenovation } from './storage'

export type PersistedWithRenovation = { renovation?: unknown } & Record<string, unknown>

/**
 * Repairs persisted `localStorage` state written by older versions of the app
 * (missing `rooms`, step `roomId`, or removed fields such as a professional's
 * `capacity`). Reuses the same sanitizer as the JSON import so there is a
 * single repair path.
 */
export function migratePersistedState(persistedState: unknown): PersistedWithRenovation {
  const state = (
    typeof persistedState === 'object' && persistedState !== null ? persistedState : {}
  ) as PersistedWithRenovation

  if (!state.renovation) return state

  try {
    return { ...state, renovation: sanitizeRenovation(state.renovation) }
  } catch {
    // If the persisted plan cannot be repaired, keep it as-is and let the
    // app render it defensively rather than wiping the user's plan.
    return state
  }
}
