import { useRef, useState } from 'react'
import { CalendarDays, Download, Hammer, Moon, PanelLeft, Printer, Sun, Trash2, Upload } from 'lucide-react'
import { fmtNumeric, fmtWeekdayDate, plural } from '../lib/format'
import { renovationEnd, renovationEndISO } from '../lib/scheduling'
import { exportRenovationFile, importRenovationFile } from '../lib/storage'
import { useStore } from '../state/store'
import type { Renovation } from '../types'
import { ShareControl } from './ShareControl'
import { SyncControl } from './SyncControl'
import { ConfirmDialog } from './ui/Modal'
import { IconButton } from './ui/controls'

const dateInputClass =
  'rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'

export function HeaderBar() {
  const renovation = useStore((state) => state.renovation)
  const theme = useStore((state) => state.theme)
  const setProjectName = useStore((state) => state.setProjectName)
  const setStartDate = useStore((state) => state.setStartDate)
  const setDurationDays = useStore((state) => state.setDurationDays)
  const toggleTheme = useStore((state) => state.toggleTheme)
  const toggleSidebar = useStore((state) => state.toggleSidebar)
  const setPrinting = useStore((state) => state.setPrinting)
  const replaceRenovation = useStore((state) => state.replaceRenovation)
  const clearAll = useStore((state) => state.clearAll)
  const notify = useStore((state) => state.notify)

  const [pendingImport, setPendingImport] = useState<Renovation | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stepCount = renovation.steps.length
  const professionalCount = renovation.professionals.length
  const summary = [
    stepCount > 0 ? plural(stepCount, 'etapa', 'etapas') : null,
    professionalCount > 0
      ? plural(professionalCount, 'profissional', 'profissionais')
      : null,
  ]
    .filter(Boolean)
    .join(' e ')

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPendingImport(await importRenovationFile(file))
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Falha ao importar.')
    }
  }

  return (
    <header className="no-print flex flex-col gap-y-2 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
      <div className="flex min-w-0 items-center gap-2 sm:flex-1">
        <IconButton label="Alternar painel lateral" onClick={toggleSidebar}>
          <PanelLeft size={16} />
        </IconButton>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <Hammer size={15} />
        </div>
        <input
          aria-label="Nome da reforma"
          value={renovation.name}
          onChange={(event) => setProjectName(event.target.value)}
          style={{ width: `${Math.min(36, Math.max(12, renovation.name.length + 1))}ch` }}
          className="max-w-[38vw] rounded-md bg-transparent px-1.5 py-1 text-base font-semibold outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:ring-2 focus:ring-indigo-500/30 dark:hover:bg-slate-800 dark:focus:bg-slate-800 sm:max-w-none"
        />
      </div>

      <div className="order-3 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:order-none sm:w-auto sm:flex-1 sm:justify-start sm:gap-x-4 sm:border-t-0 sm:pt-0">
        <label className="flex items-center gap-1.5">
          <span className="hidden font-medium sm:inline">Início</span>
          <input
            type="date"
            value={renovation.startDate}
            title="Início da reforma — todas as etapas se deslocam junto"
            onChange={(event) => setStartDate(event.target.value)}
            className={dateInputClass}
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="hidden font-medium sm:inline">Duração</span>
          <input
            type="number"
            min={1}
            max={728}
            value={renovation.durationDays}
            title="Duração em dias"
            onChange={(event) => {
              const next = parseInt(event.target.value, 10)
              if (Number.isFinite(next) && next >= 1) setDurationDays(next)
            }}
            className={`w-12 text-center sm:w-16 ${dateInputClass}`}
          />
          <span>{renovation.durationDays === 1 ? 'dia' : 'dias'}</span>
        </label>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <CalendarDays size={13} />
          <span className="sm:hidden">fim {fmtNumeric(renovationEndISO(renovation))}</span>
          <span className="hidden sm:inline">termina em {fmtWeekdayDate(renovationEnd(renovation))}</span>
        </span>
      </div>

      <div className="order-2 ml-auto flex items-center gap-1 sm:order-none">
        <IconButton label="Exportar plano em JSON" onClick={() => exportRenovationFile(renovation)}>
          <Download size={16} />
        </IconButton>
        <IconButton label="Importar plano de um JSON" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <IconButton label="Imprimir cronograma" onClick={() => setPrinting(true)}>
          <Printer size={16} />
        </IconButton>
        <SyncControl />
        <ShareControl />
        <IconButton
          label={theme === 'dark' ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
        <IconButton
          label="Apagar tudo"
          tone="danger"
          disabled={stepCount === 0 && professionalCount === 0}
          onClick={() => setConfirmClear(true)}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Importar plano?"
        message={
          pendingImport
            ? `Substituir o plano atual por “${pendingImport.name}” (${plural(pendingImport.steps.length, 'etapa', 'etapas')}, ${plural(pendingImport.professionals.length, 'profissional', 'profissionais')})?`
            : ''
        }
        confirmLabel="Importar"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) {
            replaceRenovation(pendingImport)
            notify('success', 'Plano importado.')
          }
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Apagar tudo?"
        message={`Isso exclui ${summary} e redefine o projeto para um plano em branco de 56 dias. Exporte um backup antes se quiser mantê-lo — a exclusão não pode ser desfeita.`}
        confirmLabel="Apagar tudo"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearAll()
          notify('info', 'Plano apagado.')
        }}
      />
    </header>
  )
}
