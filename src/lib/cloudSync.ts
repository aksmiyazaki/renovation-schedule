/**
 * The actual Firebase sync engine. Loaded lazily (see sync.ts) so the SDK
 * stays out of the main bundle and is only fetched when sync is configured.
 */
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from './firebase'
import { sanitizeRenovation } from './storage'
import { decideSyncAction } from './syncDecision'
import { useStore } from '../state/store'
import type { Renovation } from '../types'

const PUSH_DEBOUNCE_MS = 800

interface CloudPlan {
  data?: unknown
  updatedAt?: unknown
}

const app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>)
const auth = getAuth(app)
const db = getFirestore(app)

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export async function signOutOfSync(): Promise<void> {
  await signOut(auth)
}

/** Firestore rejects `undefined` values, so strip them via a JSON round-trip. */
function toFirestorePayload(renovation: Renovation): Renovation {
  return JSON.parse(JSON.stringify(renovation)) as Renovation
}

/**
 * Keeps the zustand store and the `plans/{uid}` Firestore document in sync.
 * Returns a function that detaches every listener.
 */
export function attachCloudSync(): () => void {
  let timer: number | null = null
  let applyingRemote = false
  let currentUid: string | null = null
  // Until the server has answered once, we don't push blindly — reconciliation
  // decides what to do when the first authoritative snapshot arrives.
  let serverReady = false

  const clearTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
  }

  const push = async (uid: string, trigger: 'change' | 'reconcile') => {
    const state = useStore.getState()
    const updatedAt = Date.now()
    state.setSyncUpdatedAt(updatedAt)
    state.setSyncStatus('syncing')
    try {
      await setDoc(doc(db, 'plans', uid), {
        data: toFirestorePayload(state.renovation),
        updatedAt,
      })
      useStore.getState().setSyncStatus('synced')
    } catch {
      useStore.getState().setSyncStatus('error')
      if (trigger === 'reconcile') {
        useStore.getState().notify('error', 'Cloud sync failed. Check the Firestore rules.')
      }
    }
  }

  let docUnsubscribe: Unsubscribe | null = null

  const subscribeToPlan = (uid: string) => {
    docUnsubscribe = onSnapshot(
      doc(db, 'plans', uid),
      (snapshot) => {
        if (!snapshot.metadata.fromCache) serverReady = true

        const payload = snapshot.data() as CloudPlan | undefined
        const remoteUpdatedAt = Number(payload?.updatedAt) || 0
        const state = useStore.getState()

        const decision = decideSyncAction({
          exists: snapshot.exists(),
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          remoteUpdatedAt,
          syncUpdatedAt: state.syncUpdatedAt,
          localUpdatedAt: state.localUpdatedAt,
        })

        if (decision === 'wait') {
          state.setSyncStatus('syncing')
          return
        }
        if (decision === 'synced') {
          state.setSyncStatus('synced')
          return
        }
        if (decision === 'push') {
          void push(uid, 'reconcile')
          return
        }

        // decision === 'apply'
        try {
          const renovation = sanitizeRenovation(payload?.data)
          applyingRemote = true
          try {
            useStore.getState().applyRemoteRenovation(renovation, remoteUpdatedAt)
          } finally {
            applyingRemote = false
          }
          useStore.getState().setSyncStatus('synced')
        } catch {
          useStore.getState().setSyncStatus('error')
        }
      },
      () => {
        useStore.getState().setSyncStatus('error')
      },
    )
  }

  const authUnsubscribe = onAuthStateChanged(auth, (user) => {
    docUnsubscribe?.()
    docUnsubscribe = null
    clearTimer()
    serverReady = false

    if (!user) {
      currentUid = null
      useStore.getState().setSyncUser(null)
      useStore.getState().setSyncStatus('signed-out')
      return
    }

    currentUid = user.uid
    useStore.getState().setSyncUser({
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL,
    })
    useStore.getState().setSyncStatus('connecting')
    subscribeToPlan(user.uid)
  })

  // Push local edits to the cloud, debounced.
  const storeUnsubscribe = useStore.subscribe((state, previous) => {
    if (state.renovation === previous.renovation) return
    if (applyingRemote) return
    if (!currentUid) return

    // Mark the plan dirty so reconciliation can pick it up if we crash
    // before the debounced push fires.
    state.setLocalUpdatedAt(Date.now())
    if (!serverReady) return
    state.setSyncStatus('syncing')

    const uid = currentUid
    clearTimer()
    timer = window.setTimeout(() => {
      timer = null
      void push(uid, 'change')
    }, PUSH_DEBOUNCE_MS)
  })

  return () => {
    authUnsubscribe()
    docUnsubscribe?.()
    storeUnsubscribe()
    clearTimer()
  }
}
