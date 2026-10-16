import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Circle, CircleCheck, CircleDot, Plus, TriangleAlert } from 'lucide-react'
import { durationLabel, fmtRange } from '../lib/format'
import { UNASSIGNED_COLOR } from '../lib/palette'
import { findConflictingStepIds, isStepOutsideWindow, stepEndISO } from '../lib/scheduling'
import { useStore } from '../state/store'
import type { Step } from '../types'
import { StepForm } from './StepForm'
import { Button } from './ui/controls'

function statusIcon(step: Step) {
  if (step.status === 'done') return <CircleCheck size={14} className="shrink-0 text-emerald-500" />
  if (step.status === 'in_progress') return <CircleDot size={14} className="shrink-0 text-amber-500" />
  return <Circle size={14} className="shrink-0 text-slate-300 dark:text-slate-600" />
}

export function StepsPanel() {
  const renovation = useStore((state) => state.renovation)
  const [editing, setEditing] = useState<Step | 'new' | null>(null)

  const conflicts = useMemo(() => findConflictingStepIds(renovation.steps), [renovation.steps])
  const sorted = useMemo(
    () =>
      [...renovation.steps].sort(
        (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title),
      ),
    [renovation.steps],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button variant="primary" className="w-full" onClick={() => setEditing('new')}>
          <Plus size={15} /> Add step
        </Button>
      </div>
      <ul className="thin-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        <AnimatePresence initial={false}>
          {sorted.map((step) => {
            const owner = renovation.professionals.find(
              (professional) => professional.id === step.professionalId,
            )
            const outside = isStepOutsideWindow(step, renovation)
            const hasConflict = conflicts.has(step.id)
            return (
              <motion.li
                key={step.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  type="button"
                  onClick={() => setEditing(step)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: owner?.color ?? UNASSIGNED_COLOR }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{step.title}</span>
                    {outside ? (
                      <TriangleAlert
                        size={13}
                        aria-label="Outside the renovation window"
                        className="shrink-0 text-rose-500"
                      />
                    ) : null}
                    {hasConflict ? (
                      <TriangleAlert
                        size={13}
                        aria-label="Overlaps another step of the same professional"
                        className="shrink-0 text-amber-500"
                      />
                    ) : null}
                    {statusIcon(step)}
                  </div>
                  <div className="mt-1 truncate pl-4 text-xs text-slate-500 dark:text-slate-400">
                    {owner ? `${owner.name} · ` : 'Unassigned · '}
                    {fmtRange(step.startDate, stepEndISO(step))} · {durationLabel(step.durationDays)}
                  </div>
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      {renovation.steps.length === 0 ? (
        <p className="px-4 pb-4 text-center text-xs text-slate-400">
          No steps yet. Add the first step of your renovation.
        </p>
      ) : null}
      <StepForm
        open={editing !== null}
        step={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
