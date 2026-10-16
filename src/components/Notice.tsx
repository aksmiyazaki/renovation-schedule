import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useStore } from '../state/store'

export function Notice() {
  const notice = useStore((state) => state.notice)
  const clearNotice = useStore((state) => state.clearNotice)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(clearNotice, 3600)
    return () => window.clearTimeout(timer)
  }, [notice, clearNotice])

  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          key={notice.id}
          role="status"
          initial={{ opacity: 0, y: 14, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 10, x: '-50%' }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="no-print fixed bottom-5 left-1/2 z-[70] flex max-w-[min(28rem,calc(100vw-2rem))] items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 pr-2 pl-3.5 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {notice.tone === 'success' ? (
            <CircleCheck size={16} className="shrink-0 text-emerald-500" />
          ) : notice.tone === 'error' ? (
            <CircleAlert size={16} className="shrink-0 text-rose-500" />
          ) : (
            <Info size={16} className="shrink-0 text-indigo-500" />
          )}
          <span className="min-w-0">{notice.message}</span>
          <button
            type="button"
            onClick={clearNotice}
            aria-label="Fechar"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
