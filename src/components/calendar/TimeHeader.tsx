import { useMemo } from 'react'
import { format, isWeekend } from 'date-fns'
import { Users } from 'lucide-react'
import { cx } from '../../lib/cx'
import { ROW_HEADER_WIDTH } from './constants'

interface MonthGroup {
  key: string
  startIndex: number
  count: number
  date: Date
}

interface TimeHeaderProps {
  days: Date[]
  dayWidth: number
  todayIndex: number | null
}

export function TimeHeader({ days, dayWidth, todayIndex }: TimeHeaderProps) {
  const months = useMemo<MonthGroup[]>(() => {
    const groups: MonthGroup[] = []
    days.forEach((date, index) => {
      const key = format(date, 'yyyy-MM')
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.count += 1
      } else {
        groups.push({ key, startIndex: index, count: 1, date })
      }
    })
    return groups
  }, [days])

  return (
    <div className="cal-sticky sticky top-0 z-30 border-b border-[var(--cal-line)] bg-[var(--cal-header-bg)] backdrop-blur-sm">
      <div className="flex">
        <div
          className="cal-sticky sticky left-0 z-40 flex items-center gap-1.5 border-r border-[var(--cal-line)] bg-[var(--cal-header-bg)] px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
          style={{ width: ROW_HEADER_WIDTH }}
        >
          <Users size={13} /> Team
        </div>
        <div className="relative" style={{ width: days.length * dayWidth }}>
          <div className="relative border-b border-[var(--cal-line)]" style={{ height: 22 }}>
            {months.map((month) => (
              <div
                key={month.key}
                className="absolute flex h-full items-center overflow-hidden border-l border-[var(--cal-line-strong)] px-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                style={{ left: month.startIndex * dayWidth, width: month.count * dayWidth }}
              >
                {month.count * dayWidth >= 64
                  ? format(month.date, 'MMMM yyyy')
                  : format(month.date, 'MMM')}
              </div>
            ))}
          </div>
          <div className="flex" style={{ height: 40 }}>
            {days.map((date, index) => (
              <div
                key={index}
                className={cx(
                  'relative flex flex-col items-center justify-center border-l border-[var(--cal-line)]',
                  isWeekend(date) && 'bg-[var(--cal-weekend)]',
                )}
                style={{ width: dayWidth }}
              >
                {dayWidth >= 26 ? (
                  <span className="text-[9px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                    {format(date, dayWidth >= 40 ? 'EEE' : 'EEEEE')}
                  </span>
                ) : null}
                <span
                  className={cx(
                    'text-[11px] leading-tight',
                    index === todayIndex
                      ? 'flex size-5 items-center justify-center rounded-full bg-rose-500 font-semibold text-white'
                      : 'font-medium text-slate-600 dark:text-slate-300',
                  )}
                >
                  {format(date, 'd')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
