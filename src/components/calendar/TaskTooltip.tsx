import { useLayoutEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, TriangleAlert } from 'lucide-react'
import { cx } from '../../lib/cx'
import { durationLabel, fmtDay } from '../../lib/format'
import { UNASSIGNED_COLOR } from '../../lib/palette'
import { stepEndISO } from '../../lib/scheduling'
import { STATUS_LABELS, STATUS_PILL } from '../../lib/status'
import type { Professional, Step } from '../../types'

interface TaskTooltipProps {
  step: Step
  professional: Professional | null
  anchor: { x: number; y: number }
  hasConflict: boolean
  outside: boolean
}

export function TaskTooltip({ step, professional, anchor, hasConflict, outside }: TaskTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    let left = anchor.x + 16
    let top = anchor.y + 18
    if (left + rect.width > window.innerWidth - 8) left = anchor.x - rect.width - 16
    if (top + rect.height > window.innerHeight - 8) top = anchor.y - rect.height - 18
    element.style.left = `${Math.max(8, left)}px`
    element.style.top = `${Math.max(8, top)}px`
  }, [anchor.x, anchor.y, step.id, hasConflict, outside])

  return (
    <motion.div
      ref={ref}
      data-testid="task-tooltip"
      initial={{ opacity: 0, scale: 0.97, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{ position: 'fixed', left: anchor.x + 16, top: anchor.y + 18, transformOrigin: 'top left' }}
      className="pointer-events-none z-50 w-72 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: professional?.color ?? UNASSIGNED_COLOR }}
          />
          <p className="min-w-0 text-sm leading-snug font-semibold">{step.title}</p>
        </div>
        <span
          className={cx(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
            STATUS_PILL[step.status],
          )}
        >
          {STATUS_LABELS[step.status]}
        </span>
      </div>

      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
        {professional
          ? `${professional.name}${professional.trade ? ` · ${professional.trade}` : ''}`
          : 'Unassigned'}
      </p>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <CalendarDays size={12} className="shrink-0" />
        {fmtDay(step.startDate)} → {fmtDay(stepEndISO(step))} · {durationLabel(step.durationDays)}
      </p>

      {outside ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-500">
          <TriangleAlert size={12} className="shrink-0" /> Outside the renovation window
        </p>
      ) : null}

      {hasConflict ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-500">
          <TriangleAlert size={12} className="shrink-0" /> Overlaps another{' '}
          {professional?.name ?? 'unassigned'} step
        </p>
      ) : null}

      {step.notes ? (
        <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {step.notes}
        </p>
      ) : null}
    </motion.div>
  )
}
