import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, Plus } from 'lucide-react'
import { cx } from '../lib/cx'
import { plural } from '../lib/format'
import { useStore } from '../state/store'
import type { Professional } from '../types'
import { ProfessionalForm } from './ProfessionalForm'
import { Button, IconButton } from './ui/controls'

export function ProfessionalsPanel() {
  const renovation = useStore((state) => state.renovation)
  const toggleProfessionalHidden = useStore((state) => state.toggleProfessionalHidden)
  const setAllProfessionalsHidden = useStore((state) => state.setAllProfessionalsHidden)
  const notify = useStore((state) => state.notify)
  const [editing, setEditing] = useState<Professional | 'new' | null>(null)

  const allHidden =
    renovation.professionals.length > 0 &&
    renovation.professionals.every((professional) => professional.hidden)
  const noneHidden = renovation.professionals.every((professional) => !professional.hidden)

  const hideAll = (hidden: boolean) => {
    setAllProfessionalsHidden(hidden)
    notify(
      'info',
      hidden ? 'Todas as equipes foram ocultadas.' : 'Todas as equipes foram exibidas.',
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button variant="primary" className="w-full" onClick={() => setEditing('new')}>
          <Plus size={15} /> Adicionar profissional
        </Button>
        <div className="mt-1.5 flex gap-1.5">
          <Button
            size="sm"
            className="flex-1"
            disabled={allHidden || renovation.professionals.length === 0}
            onClick={() => hideAll(true)}
          >
            <EyeOff size={13} /> Ocultar todos
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={noneHidden || renovation.professionals.length === 0}
            onClick={() => hideAll(false)}
          >
            <Eye size={13} /> Exibir todos
          </Button>
        </div>
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
                <div
                  className={cx(
                    'flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 pr-0.5 dark:border-slate-800 dark:bg-slate-900',
                    professional.hidden && 'opacity-60',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setEditing(professional)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: professional.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {professional.name}
                    </span>
                    {professional.hidden ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Oculto
                      </span>
                    ) : null}
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {plural(count, 'etapa', 'etapas')}
                    </span>
                  </button>
                  <IconButton
                    label={professional.hidden ? 'Mostrar equipe' : 'Ocultar equipe'}
                    onClick={() => toggleProfessionalHidden(professional.id)}
                  >
                    {professional.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </IconButton>
                </div>
                {professional.trade ? (
                  <div className="mt-0.5 truncate pl-6 text-xs text-slate-500 dark:text-slate-400">
                    {professional.trade}
                  </div>
                ) : null}
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
