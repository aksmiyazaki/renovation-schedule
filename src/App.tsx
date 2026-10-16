import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { HeaderBar } from './components/HeaderBar'
import { Notice } from './components/Notice'
import { PrintView } from './components/print/PrintView'
import { ShareBanner } from './components/ShareBanner'
import { Sidebar } from './components/Sidebar'
import { TimelineCalendar } from './components/calendar/TimelineCalendar'
import { useCloudSync, useShareSession } from './lib/sync'
import { useStore } from './state/store'

export default function App() {
  const theme = useStore((state) => state.theme)
  const printing = useStore((state) => state.printing)
  const setPrinting = useStore((state) => state.setPrinting)

  useCloudSync()
  useShareSession()

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
      {printing ? (
        <PrintView />
      ) : (
        <div className="app-shell flex h-dvh flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          <HeaderBar />
          <ShareBanner />
          <div className="app-main relative flex min-h-0 flex-1">
            <Sidebar />
            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
              <TimelineCalendar />
            </main>
          </div>
          <Notice />
        </div>
      )}
    </MotionConfig>
  )
}
