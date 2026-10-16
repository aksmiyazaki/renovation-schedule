/**
 * Share mode: this app was opened through a `?share=` link and is editing
 * someone else's shared renovation. Loaded lazily, only when the URL asks
 * for it. Anyone with the link can edit; changes sync live between everyone.
 *
 * The user's own plan is protected: persistence is paused (see shareRuntime)
 * and the personal cloud sync is not attached while this session runs.
 */
import { getAuth } from 'firebase/auth'
import { doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from './firebase'
import { setShareModeActive } from './shareRuntime'
import { sanitizeRenovation } from './storage'
import { decideSyncAction } from './syncDecision'
import { useStore } from '../state/store'
import type { Renovation } from '../types'

const PUSH_DEBOUNCE_MS = 800

interface SharedPlan {
  data?: unknown
  updatedAt?: unknown
  ownerId?: unknown
  ownerName?: unknown
}

const app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>)
const auth = getAuth(app)
const db = getFirestore(app)

/** Firestore rejects `undefined` values, so strip them via a JSON round-trip. */
function toFirestorePayload(renovation: Renovation): Renovation {
  return JSON.parse(JSON.stringify(renovation)) as Renovation
}

export function attachShareSession(shareId: string): () => void {
  setShareModeActive(true)

  const initialState = useStore.getState()
  initialState.setShareMode({ id: shareId, ownerName: null, missing: false })
  // The shared document is the source of truth on entry.
  initialState.setShareUpdatedAt(0)
  initialState.setLocalUpdatedAt(0)
  initialState.setSyncStatus('connecting')

  let timer: number | null = null
  let applying = false
  let serverReady = false
  let ownerRedirected = false

  const ref = doc(db, 'shares', shareId)

  const push = async () => {
    const updatedAt = Date.now()
    const state = useStore.getState()
    state.setShareUpdatedAt(updatedAt)
    state.setSyncStatus('syncing')
    try {
      await setDoc(
        ref,
        { data: toFirestorePayload(state.renovation), updatedAt },
        { merge: true },
      )
      useStore.getState().setSyncStatus('synced')
    } catch {
      useStore.getState().setSyncStatus('error')
    }
  }

  const unsubscribeDoc = onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.metadata.fromCache) serverReady = true

      if (!snapshot.exists()) {
        if (!snapshot.metadata.fromCache) {
          useStore.getState().setShareMode({ id: shareId, ownerName: null, missing: true })
        }
        return
      }

      const payload = snapshot.data() as SharedPlan | undefined
      const ownerName =
        typeof payload?.ownerName === 'string' && payload.ownerName ? payload.ownerName : null
      useStore.getState().setShareMode({ id: shareId, ownerName, missing: false })

      // The owner opening their own link is sent back to their own plan,
      // which is the source of truth for them.
      const user = auth.currentUser
      if (!ownerRedirected && user && payload?.ownerId === user.uid) {
        ownerRedirected = true
        useStore.getState().notify('info', 'Este link aponta para o seu próprio plano — abrindo-o.')
        window.location.replace(window.location.pathname)
        return
      }

      const remoteUpdatedAt = Number(payload?.updatedAt) || 0
      const state = useStore.getState()
      const decision = decideSyncAction({
        exists: true,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        remoteUpdatedAt,
        syncUpdatedAt: state.shareUpdatedAt,
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
        void push()
        return
      }

      // decision === 'apply'
      try {
        const renovation = sanitizeRenovation(payload?.data)
        applying = true
        try {
          useStore.getState().applyRemoteShare(renovation, remoteUpdatedAt)
        } finally {
          applying = false
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

  const unsubscribeStore = useStore.subscribe((state, previous) => {
    if (state.renovation === previous.renovation) return
    if (applying) return
    if (state.shareMode?.missing) return

    state.setLocalUpdatedAt(Date.now())
    if (!serverReady) return
    state.setSyncStatus('syncing')

    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      timer = null
      void push()
    }, PUSH_DEBOUNCE_MS)
  })

  return () => {
    unsubscribeDoc()
    unsubscribeStore()
    if (timer !== null) window.clearTimeout(timer)
  }
}
