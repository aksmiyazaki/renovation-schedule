import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { plural } from '../lib/format'
import { useStore } from '../state/store'
import type { Professional } from '../types'
import { ProfessionalForm } from './ProfessionalForm'
import { Button } from './ui/controls'

export function ProfessionalsPanel() {
  const renovation = useStore((state) => state.renovation)
  const [editing, setEditing] = useState<Professional | 'new' | null>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button variant="primary" className="w-full" onClick={() => setEditing('new')}>
          <Plus size={15} /> Adicionar profissional
        </Button>
      </div>
      <ul className="thin-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        <AnimatePresence initial={false}>
          {renovation.professionals.map((professional) => {
            const count = renovation.steps.filter(
              (step) => step.professionalId === professional.id,
            ).length
            return (
              <motion.li
                key={professional.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  type="button"
                  onClick={() => setEditing(professional)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: professional.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {professional.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {plural(count, 'etapa', 'etapas')}
                    </span>
                  </div>
                  {professional.trade ? (
                    <div className="mt-1 truncate pl-5 text-xs text-slate-500 dark:text-slate-400">
                      {professional.trade}
                    </div>
                  ) : null}
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      {renovation.professionals.length === 0 ? (
        <p className="px-4 pb-4 text-center text-xs text-slate-400">
          Nenhum profissional ainda. Adicione as pessoas que vão trabalhar nesta reforma.
        </p>
      ) : null}
      <ProfessionalForm
        open={editing !== null}
        professional={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
