import { describe, expect, it } from 'vitest'
import { decideSyncAction } from './syncDecision'
import type { SyncDecisionInput } from './syncDecision'

function input(patch: Partial<SyncDecisionInput>): SyncDecisionInput {
  return {
    exists: true,
    fromCache: false,
    hasPendingWrites: false,
    remoteUpdatedAt: 0,
    syncUpdatedAt: 0,
    localUpdatedAt: 0,
    ...patch,
  }
}

describe('decideSyncAction', () => {
  it('seeds the cloud from local when no document exists and the server answered', () => {
    expect(decideSyncAction(input({ exists: false }))).toBe('push')
  })

  it('waits for the server when the empty answer came from the cache', () => {
    expect(decideSyncAction(input({ exists: false, fromCache: true }))).toBe('wait')
  })

  it('reports synced when the revision and the local copy are clean', () => {
    expect(decideSyncAction(input({ remoteUpdatedAt: 100, syncUpdatedAt: 100 }))).toBe('synced')
  })

  it('waits while the same revision still has pending writes', () => {
    expect(
      decideSyncAction(input({ remoteUpdatedAt: 100, syncUpdatedAt: 100, hasPendingWrites: true })),
    ).toBe('wait')
  })

  it('pushes when the same revision has newer local edits', () => {
    expect(
      decideSyncAction(input({ remoteUpdatedAt: 100, syncUpdatedAt: 100, localUpdatedAt: 150 })),
    ).toBe('push')
  })

  it('waits for the server before pushing dirty local edits based on a cache snapshot', () => {
    expect(
      decideSyncAction(
        input({ remoteUpdatedAt: 100, syncUpdatedAt: 100, localUpdatedAt: 150, fromCache: true }),
      ),
    ).toBe('wait')
  })

  it('applies the cloud plan when the cloud is newer than the last synced revision', () => {
    expect(
      decideSyncAction(input({ remoteUpdatedAt: 200, syncUpdatedAt: 100, localUpdatedAt: 0 })),
    ).toBe('apply')
  })

  it('pushes local when the local edits are newer than an ahead-of-sync cloud copy', () => {
    expect(
      decideSyncAction(input({ remoteUpdatedAt: 200, syncUpdatedAt: 100, localUpdatedAt: 300 })),
    ).toBe('push')
  })

  it('waits before resolving cloud-ahead conflicts from a cache snapshot', () => {
    expect(
      decideSyncAction(
        input({ remoteUpdatedAt: 200, syncUpdatedAt: 100, localUpdatedAt: 300, fromCache: true }),
      ),
    ).toBe('wait')
  })

  it('pushes when the cloud copy is behind the last synced revision', () => {
    expect(
      decideSyncAction(input({ remoteUpdatedAt: 50, syncUpdatedAt: 100, localUpdatedAt: 0 })),
    ).toBe('push')
  })

  it('waits before pushing against a stale cache view', () => {
    expect(
      decideSyncAction(input({ remoteUpdatedAt: 50, syncUpdatedAt: 100, fromCache: true })),
    ).toBe('wait')
  })

  it('applies the cloud plan on first sign-in when the local device has never synced', () => {
    expect(
      decideSyncAction(input({ remoteUpdatedAt: 500, syncUpdatedAt: 0, localUpdatedAt: 0 })),
    ).toBe('apply')
  })
})
