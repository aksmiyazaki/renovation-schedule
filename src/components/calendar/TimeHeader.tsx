import { useMemo } from 'react'
import { format, isWeekend } from 'date-fns'
import { Users } from 'lucide-react'
import { cx } from '../../lib/cx'
import { fmtMonthShort, fmtMonthYear, fmtWeekdayNarrow, fmtWeekdayShort } from '../../lib/format'
import { toISODate } from '../../lib/scheduling'

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
  holidays: Map<string, string>
  rowHeaderWidth: number
}

export function TimeHeader({ days, dayWidth, todayIndex, holidays, rowHeaderWidth }: TimeHeaderProps) {
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
          style={{ width: rowHeaderWidth }}
        >
          <Users size={13} /> Equipe
        </div>
        <div className="relative" style={{ width: days.length * dayWidth }}>
          <div className="relative border-b border-[var(--cal-line)]" style={{ height: 22 }}>
            {months.map((month) => (
              <div
                key={month.key}
                className="absolute flex h-full items-center overflow-hidden border-l border-[var(--cal-line-strong)] px-1.5 text-[11px] font-semibold text-slate-500 capitalize dark:text-slate-400"
                style={{ left: month.startIndex * dayWidth, width: month.count * dayWidth }}
              >
                {month.count * dayWidth >= 64
                  ? fmtMonthYear(month.date)
                  : fmtMonthShort(month.date)}
              </div>
            ))}
          </div>
          <div className="flex" style={{ height: 40 }}>
            {days.map((date, index) => {
              const holiday = holidays.get(toISODate(date))
              const isStart = index === 0
              const isEnd = index === days.length - 1
              const title = [
                holiday,
                isStart ? 'Início da reforma' : null,
                isEnd ? 'Término da reforma' : null,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <div
                  key={index}
                  title={title || undefined}
                  className={cx(
                    'relative flex flex-col items-center justify-center border-l border-[var(--cal-line)]',
                    isStart
                      ? 'bg-emerald-500/[0.08]'
                      : isEnd
                        ? 'bg-indigo-500/[0.08]'
                        : holiday
                          ? 'bg-[var(--cal-holiday)]'
                          : isWeekend(date) && 'bg-[var(--cal-weekend)]',
                  )}
                  style={{ width: dayWidth }}
                >
                  {dayWidth >= 26 ? (
                    <span className="text-[9px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                      {dayWidth >= 40 ? fmtWeekdayShort(date) : fmtWeekdayNarrow(date)}
                    </span>
                  ) : null}
                  <span
                    className={cx(
                      'text-[11px] leading-tight',
                      index === todayIndex
                        ? 'flex size-5 items-center justify-center rounded-full bg-rose-500 font-semibold text-white'
                        : isStart
                          ? 'flex size-5 items-center justify-center rounded-full bg-emerald-500 font-semibold text-white'
                          : isEnd
                            ? 'flex size-5 items-center justify-center rounded-full bg-indigo-500 font-semibold text-white'
                            : holiday
                              ? 'font-medium text-rose-600 dark:text-rose-400'
                              : 'font-medium text-slate-600 dark:text-slate-300',
                    )}
                  >
                    {format(date, 'd')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
