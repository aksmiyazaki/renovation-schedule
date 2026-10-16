import { useEffect } from 'react'
import { firebaseEnabled } from './firebase'
import { shareIdFromSearch } from './shareUrl'

/**
 * Lazy facade around the Firebase modules (cloudSync.ts / shareSession.ts):
 * the Firebase SDK is code-split and only downloaded when it is actually used.
 */

async function cloudSyncModule() {
  return import('./cloudSync')
}

/** Personal cloud sync (owner mode). Does nothing while editing a share link. */
export function useCloudSync(): void {
  useEffect(() => {
    if (!firebaseEnabled) return
    if (shareIdFromSearch(window.location.search)) return
    let disposed = false
    let detach: (() => void) | null = null

    void cloudSyncModule().then((module) => {
      if (disposed) return
      detach = module.attachCloudSync()
    })

    return () => {
      disposed = true
      detach?.()
    }
  }, [])
}

/** Share mode: someone opened a `?share=` link. */
export function useShareSession(): void {
  useEffect(() => {
    if (!firebaseEnabled) return
    const shareId = shareIdFromSearch(window.location.search)
    if (!shareId) return
    let disposed = false
    let detach: (() => void) | null = null

    void import('./shareSession').then((module) => {
      if (disposed) return
      detach = module.attachShareSession(shareId)
    })

    return () => {
      disposed = true
      detach?.()
    }
  }, [])
}

export async function signInWithGoogle(): Promise<void> {
  const module = await cloudSyncModule()
  await module.signInWithGoogle()
}

export async function signOutOfSync(): Promise<void> {
  const module = await cloudSyncModule()
  await module.signOutOfSync()
}

export async function createShareLink(): Promise<string> {
  const module = await cloudSyncModule()
  return module.createShareLink()
}

export async function stopSharing(): Promise<void> {
  const module = await cloudSyncModule()
  await module.stopSharing()
}
