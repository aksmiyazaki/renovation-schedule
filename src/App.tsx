import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { MotionConfig } from 'motion/react'
import { HeaderBar } from './components/HeaderBar'
import { Notice } from './components/Notice'
import { Sidebar } from './components/Sidebar'
import { TimelineCalendar } from './components/calendar/TimelineCalendar'
import { useCloudSync } from './lib/sync'
import { renovationEnd } from './lib/scheduling'
import { useStore } from './state/store'

export default function App() {
  const renovation = useStore((state) => state.renovation)
  const theme = useStore((state) => state.theme)
  const printing = useStore((state) => state.printing)
  const setPrinting = useStore((state) => state.setPrinting)

  useCloudSync()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (!printing) return
    const timer = window.setTimeout(() => window.print(), 150)
    const handleAfterPrint = () => setPrinting(false)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [printing, setPrinting])

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell flex h-dvh flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <HeaderBar />
        <div className="app-main flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="hidden px-4 pt-4 print:block">
              <h1 className="text-xl font-semibold">{renovation.name}</h1>
              <p className="text-sm text-slate-500">
                {format(parseISO(renovation.startDate), 'd MMM yyyy')} →{' '}
                {format(renovationEnd(renovation), 'd MMM yyyy')} · {renovation.steps.length} steps ·{' '}
                {renovation.professionals.length} professionals
              </p>
            </div>
            <TimelineCalendar />
          </main>
        </div>
        <Notice />
      </div>
    </MotionConfig>
  )
}
