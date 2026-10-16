import { useState } from 'react'
import type { ReactNode } from 'react'
import { ListChecks, Users } from 'lucide-react'
import { cx } from '../lib/cx'
import { useStore } from '../state/store'
import { ProfessionalsPanel } from './ProfessionalsPanel'
import { StepsPanel } from './StepsPanel'

export function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen)
  const [tab, setTab] = useState<'steps' | 'professionals'>('steps')

  return (
    <aside
      className={cx(
        'no-print flex flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width,opacity] duration-200 dark:border-slate-800 dark:bg-slate-900',
        sidebarOpen ? 'w-[300px] opacity-100' : 'w-0 opacity-0',
      )}
    >
      <div className="flex w-[300px] shrink-0 gap-1 border-b border-slate-100 p-2 dark:border-slate-800">
        <TabButton
          active={tab === 'steps'}
          onClick={() => setTab('steps')}
          icon={<ListChecks size={14} />}
          label="Steps"
        />
        <TabButton
          active={tab === 'professionals'}
          onClick={() => setTab('professionals')}
          icon={<Users size={14} />}
          label="Professionals"
        />
      </div>
      <div className="flex min-h-0 w-[300px] flex-1 flex-col">
        {tab === 'steps' ? <StepsPanel /> : <ProfessionalsPanel />}
      </div>
    </aside>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
          : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
