/**
 * Pure decision logic for reconciling the local plan with the cloud copy.
 * Kept dependency-free so it can be unit tested without Firebase.
 */

export interface SyncDecisionInput {
  /** Does the cloud document exist? */
  exists: boolean
  /** Did this snapshot come from the local cache instead of the server? */
  fromCache: boolean
  /** Does the cloud document have a locally pending write? */
  hasPendingWrites: boolean
  /** Timestamp stored in the cloud document (0 when unknown). */
  remoteUpdatedAt: number
  /** Timestamp of the cloud revision this app last saw or wrote. */
  syncUpdatedAt: number
  /** Timestamp of the last local edit. */
  localUpdatedAt: number
}

export type SyncDecision =
  /** Push the local plan to the cloud. */
  | 'push'
  /** Apply the cloud plan locally. */
  | 'apply'
  /** Already in sync — nothing to do. */
  | 'synced'
  /** Not enough information yet (cache-only snapshot) — wait for the server. */
  | 'wait'

export function decideSyncAction(input: SyncDecisionInput): SyncDecision {
  const { exists, fromCache, hasPendingWrites, remoteUpdatedAt, syncUpdatedAt, localUpdatedAt } = input

  // No cloud document yet: seed it from local — but only once the server confirms
  // it is really empty (a cache miss while offline must not overwrite anything).
  if (!exists) return fromCache ? 'wait' : 'push'

  if (remoteUpdatedAt === syncUpdatedAt) {
    // Same revision we last synced: push only if there are unsynced local edits.
    if (localUpdatedAt > syncUpdatedAt) return fromCache ? 'wait' : 'push'
    return hasPendingWrites ? 'wait' : 'synced'
  }

  if (remoteUpdatedAt > syncUpdatedAt) {
    // The cloud is ahead. For a single user the newest edit wins by wall clock;
    // local wins only when it is strictly newer than the cloud copy.
    if (localUpdatedAt > remoteUpdatedAt) return fromCache ? 'wait' : 'push'
    return 'apply'
  }

  // The cloud is behind the revision we know about: our copy is newer.
  return fromCache ? 'wait' : 'push'
}
