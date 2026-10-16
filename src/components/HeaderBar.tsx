import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays, Download, Hammer, Moon, PanelLeft, Printer, Sun, Upload } from 'lucide-react'
import { renovationEnd } from '../lib/scheduling'
import { exportRenovationFile, importRenovationFile } from '../lib/storage'
import { useStore } from '../state/store'
import type { Renovation } from '../types'
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
  const notify = useStore((state) => state.notify)

  const [pendingImport, setPendingImport] = useState<Renovation | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const weeks = Math.max(1, Math.round(renovation.durationDays / 7))

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPendingImport(await importRenovationFile(file))
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return (
    <header className="no-print flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label="Toggle sidebar" onClick={toggleSidebar}>
          <PanelLeft size={16} />
        </IconButton>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
          <Hammer size={15} />
        </div>
        <input
          aria-label="Project name"
          value={renovation.name}
          onChange={(event) => setProjectName(event.target.value)}
          style={{ width: `${Math.min(36, Math.max(12, renovation.name.length + 1))}ch` }}
          className="max-w-[38vw] rounded-md bg-transparent px-1.5 py-1 text-base font-semibold outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:ring-2 focus:ring-indigo-500/30 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <label className="flex items-center gap-1.5">
          <span className="font-medium">Start</span>
          <input
            type="date"
            value={renovation.startDate}
            title="All steps shift along with the project start date"
            onChange={(event) => setStartDate(event.target.value)}
            className={dateInputClass}
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="font-medium">Duration</span>
          <input
            type="number"
            min={1}
            max={104}
            value={weeks}
            onChange={(event) => {
              const next = parseInt(event.target.value, 10)
              if (Number.isFinite(next) && next >= 1) setDurationDays(next * 7)
            }}
            className={`w-16 text-center ${dateInputClass}`}
          />
          <span>weeks</span>
        </label>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <CalendarDays size={13} />
          ends {format(renovationEnd(renovation), 'EEE d MMM yyyy')}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <IconButton label="Export plan as JSON" onClick={() => exportRenovationFile(renovation)}>
          <Download size={16} />
        </IconButton>
        <IconButton label="Import plan from JSON" onClick={() => fileInputRef.current?.click()}>
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
        <IconButton label="Print schedule" onClick={() => setPrinting(true)}>
          <Printer size={16} />
        </IconButton>
        <IconButton
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Import plan?"
        message={
          pendingImport
            ? `Replace the current plan with “${pendingImport.name}” (${pendingImport.steps.length} steps, ${pendingImport.professionals.length} professionals)?`
            : ''
        }
        confirmLabel="Import"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) {
            replaceRenovation(pendingImport)
            notify('success', 'Plan imported.')
          }
        }}
      />
    </header>
  )
}
