import { useState } from 'react'
import { CloudAlert, CloudCheck, CloudOff, LogOut, RefreshCw } from 'lucide-react'
import { cx } from '../lib/cx'
import { firebaseEnabled } from '../lib/firebase'
import { signInWithGoogle, signOutOfSync } from '../lib/sync'
import { useStore } from '../state/store'
import type { SyncStatus } from '../state/store'
import { IconButton } from './ui/controls'

const STATUS_TEXT: Record<SyncStatus, string> = {
  unavailable: 'Cloud sync is not configured',
  'signed-out': 'Signed out',
  connecting: 'Connecting…',
  syncing: 'Syncing…',
  synced: 'All changes synced',
  error: 'Sync error — retrying automatically',
}

function StatusIcon({ status }: { status: SyncStatus }) {
  if (status === 'synced') return <CloudCheck size={12} className="text-emerald-500" />
  if (status === 'error') return <CloudAlert size={12} className="text-rose-500" />
  if (status === 'connecting' || status === 'syncing') {
    return <RefreshCw size={12} className="animate-spin text-amber-500" />
  }
  return <CloudOff size={12} className="text-slate-400" />
}

export function SyncControl() {
  const syncUser = useStore((state) => state.syncUser)
  const syncStatus = useStore((state) => state.syncStatus)
  const notify = useStore((state) => state.notify)
  const [menuOpen, setMenuOpen] = useState(false)

  if (!firebaseEnabled) return null

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      const code = (error as { code?: string }).code ?? ''
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        notify('error', 'Could not sign in. Check the Firebase configuration.')
      }
    }
  }

  if (!syncUser) {
    const connecting = syncStatus === 'connecting'
    return (
      <IconButton
        label={connecting ? 'Connecting to sync…' : 'Sign in to sync across devices'}
        disabled={connecting}
        onClick={() => void handleSignIn()}
      >
        {connecting ? <RefreshCw size={16} className="animate-spin" /> : <CloudOff size={16} />}
      </IconButton>
    )
  }

  const statusDot =
    syncStatus === 'synced'
      ? 'bg-emerald-500'
      : syncStatus === 'error'
        ? 'bg-rose-500'
        : 'bg-amber-500 animate-pulse'

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Sync settings"
        title="Sync settings"
        onClick={() => setMenuOpen((open) => !open)}
        className="relative inline-flex size-8 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        {syncUser.photoURL ? (
          <img
            src={syncUser.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="size-7 rounded-full"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {(syncUser.displayName || syncUser.email || '?').charAt(0).toUpperCase()}
          </span>
        )}
        <span
          className={cx(
            'absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-white dark:ring-slate-900',
            statusDot,
          )}
        />
      </button>

      {menuOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-full right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="px-2.5 py-2">
              <p className="truncate text-xs font-medium">
                {syncUser.displayName || syncUser.email}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {syncUser.email}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <StatusIcon status={syncStatus} />
                {STATUS_TEXT[syncStatus]}
              </p>
            </div>
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                void signOutOfSync()
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
