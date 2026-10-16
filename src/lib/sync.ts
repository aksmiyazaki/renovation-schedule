import { useEffect } from 'react'
import { firebaseEnabled } from './firebase'

/**
 * Lazy facade around the Firebase sync engine (cloudSync.ts): the Firebase SDK
 * is code-split and only downloaded when sync is actually configured.
 */

async function cloudSyncModule() {
  return import('./cloudSync')
}

export function useCloudSync(): void {
  useEffect(() => {
    if (!firebaseEnabled) return
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

export async function signInWithGoogle(): Promise<void> {
  const module = await cloudSyncModule()
  await module.signInWithGoogle()
}

export async function signOutOfSync(): Promise<void> {
  const module = await cloudSyncModule()
  await module.signOutOfSync()
}
