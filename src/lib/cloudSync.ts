/**
 * The actual Firebase sync engine for the owner's app. Loaded lazily (see
 * sync.ts) so the SDK stays out of the main bundle.
 *
 * It manages up to two sync channels:
 *  - "personal": your private document at `plans/{uid}`
 *  - "share":    the public document at `shares/{shareId}` that a share link points to
 *
 * Local edits are pushed to every attached channel; remote changes flow back
 * in and are propagated to the other channel, so a contractor editing through
 * a share link shows up in your own plan (and on your other devices).
 */
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { deleteDoc, doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore'
import type { DocumentReference } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from './firebase'
import { buildShareUrl } from './shareUrl'
import { sanitizeRenovation } from './storage'
import { decideSyncAction } from './syncDecision'
import { useStore } from '../state/store'
import type { Renovation } from '../types'

const PUSH_DEBOUNCE_MS = 800

interface CloudPlan {
  data?: unknown
  updatedAt?: unknown
  ownerId?: unknown
  ownerName?: unknown
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
 * Creates the public share document for the current plan and returns its link.
 * Requires being signed in (the security rules only let you create shares you own).
 */
export async function createShareLink(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Entre com sua conta primeiro para criar um link de compartilhamento.')

  const id = crypto.randomUUID()
  const state = useStore.getState()
  const updatedAt = Date.now()
  await setDoc(doc(db, 'shares', id), {
    ownerId: user.uid,
    ownerName: user.displayName ?? '',
    data: toFirestorePayload(state.renovation),
    updatedAt,
  })
  useStore.getState().setShareUpdatedAt(updatedAt)
  useStore.getState().setShareId(id)
  return buildShareUrl(id, window.location)
}

/** Revokes the share link by deleting the shared document. */
export async function stopSharing(): Promise<void> {
  const id = useStore.getState().shareId
  if (!id) return
  if (auth.currentUser) {
    try {
      await deleteDoc(doc(db, 'shares', id))
    } catch {
      /* the link is cleared locally either way */
    }
  }
  useStore.getState().setShareId(null)
  useStore.getState().setShareUpdatedAt(0)
}

type ChannelKind = 'personal' | 'share'

interface Channel {
  kind: ChannelKind
  ref: DocumentReference
  /** Merge instead of overwrite — the share document carries owner fields. */
  merge: boolean
  getRevision: () => number
  setRevision: (updatedAt: number) => void
}

export function attachCloudSync(): () => void {
  let timer: number | null = null
  let applyingChannel: ChannelKind | null = null

  const channels = new Map<ChannelKind, Channel>()
  const ready = new Map<ChannelKind, boolean>()
  const listeners = new Map<ChannelKind, () => void>()

  const clearTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
  }

  const pushChannel = async (channel: Channel, trigger: 'change' | 'reconcile') => {
    const state = useStore.getState()
    const updatedAt = Date.now()
    channel.setRevision(updatedAt)
    state.setSyncStatus('syncing')
    try {
      const payload = { data: toFirestorePayload(state.renovation), updatedAt }
      if (channel.merge) {
        await setDoc(channel.ref, payload, { merge: true })
      } else {
        await setDoc(channel.ref, payload)
      }
      useStore.getState().setSyncStatus('synced')
    } catch {
      useStore.getState().setSyncStatus('error')
      if (trigger === 'reconcile' && channel.kind === 'personal') {
        useStore.getState().notify('error', 'Falha na sincronização com a nuvem. Verifique as regras do Firestore.')
      }
    }
  }

  /** Push to every attached, server-confirmed channel except the given one. */
  const schedulePush = (except: ChannelKind | null) => {
    clearTimer()
    timer = window.setTimeout(() => {
      timer = null
      for (const channel of channels.values()) {
        if (channel.kind === except) continue
        if (!ready.get(channel.kind)) continue
        void pushChannel(channel, 'change')
      }
    }, PUSH_DEBOUNCE_MS)
  }

  const detachChannel = (kind: ChannelKind) => {
    listeners.get(kind)?.()
    listeners.delete(kind)
    channels.delete(kind)
    ready.delete(kind)
    if (channels.size === 0) clearTimer()
  }

  const attachChannel = (channel: Channel) => {
    detachChannel(channel.kind)
    channels.set(channel.kind, channel)

    const unsubscribe = onSnapshot(
      channel.ref,
      (snapshot) => {
        if (!snapshot.metadata.fromCache) ready.set(channel.kind, true)

        const payload = snapshot.data() as CloudPlan | undefined
        const remoteUpdatedAt = Number(payload?.updatedAt) || 0
        const state = useStore.getState()

        const decision = decideSyncAction({
          exists: snapshot.exists(),
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          remoteUpdatedAt,
          syncUpdatedAt: channel.getRevision(),
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
          void pushChannel(channel, 'reconcile')
          return
        }

        // decision === 'apply'
        try {
          const renovation = sanitizeRenovation(payload?.data)
          applyingChannel = channel.kind
          try {
            if (channel.kind === 'share') {
              useStore.getState().applyRemoteShare(renovation, remoteUpdatedAt)
            } else {
              useStore.getState().applyRemoteRenovation(renovation, remoteUpdatedAt)
            }
          } finally {
            applyingChannel = null
          }
          useStore.getState().setSyncStatus('synced')
          // Propagate the change to the other channel (e.g. a contractor's
          // edit must land in your personal plan, and vice versa).
          schedulePush(channel.kind)
        } catch {
          useStore.getState().setSyncStatus('error')
        }
      },
      () => {
        useStore.getState().setSyncStatus('error')
      },
    )

    listeners.set(channel.kind, unsubscribe)
  }

  const personalChannel = (uid: string): Channel => ({
    kind: 'personal',
    ref: doc(db, 'plans', uid),
    merge: false,
    getRevision: () => useStore.getState().syncUpdatedAt,
    setRevision: (updatedAt) => useStore.getState().setSyncUpdatedAt(updatedAt),
  })

  const shareChannel = (shareId: string): Channel => ({
    kind: 'share',
    ref: doc(db, 'shares', shareId),
    merge: true,
    getRevision: () => useStore.getState().shareUpdatedAt,
    setRevision: (updatedAt) => useStore.getState().setShareUpdatedAt(updatedAt),
  })

  const syncShareChannel = (shareId: string | null) => {
    if (shareId) {
      if (!channels.has('share')) attachChannel(shareChannel(shareId))
    } else {
      detachChannel('share')
    }
  }

  // Attach the share channel for an already-known share link.
  syncShareChannel(useStore.getState().shareId)

  const authUnsubscribe = onAuthStateChanged(auth, (user) => {
    detachChannel('personal')
    clearTimer()

    if (!user) {
      useStore.getState().setSyncUser(null)
      useStore.getState().setSyncStatus('signed-out')
      return
    }

    useStore.getState().setSyncUser({
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL,
    })
    useStore.getState().setSyncStatus('connecting')
    attachChannel(personalChannel(user.uid))
  })

  // React to local state changes: fresh edits push to every channel, and a
  // change of the share link attaches or detaches the share channel.
  const storeUnsubscribe = useStore.subscribe((state, previous) => {
    if (state.shareId !== previous.shareId) {
      syncShareChannel(state.shareId)
    }
    if (state.renovation === previous.renovation) return
    if (applyingChannel) return
    if (channels.size === 0) return

    // Mark the plan dirty so a crash before the debounced push is recovered
    // by reconciliation on the next load.
    state.setLocalUpdatedAt(Date.now())
    state.setSyncStatus('syncing')
    schedulePush(null)
  })

  return () => {
    authUnsubscribe()
    for (const kind of [...channels.keys()]) detachChannel(kind)
    storeUnsubscribe()
    clearTimer()
  }
}
