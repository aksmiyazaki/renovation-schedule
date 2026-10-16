import { addDays, differenceInCalendarDays, eachDayOfInterval, eachWeekOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'
import { fromISODate, stepEndISO, toISODate } from './scheduling'
import type { Step } from '../types'

export const WEEKDAY_LABELS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

export interface WeekSegment {
  step: Step
  startIdx: number
  endIdx: number
  continuesLeft: boolean
  continuesRight: boolean
  sub: number
  subrows: number
}

/** All weeks (Monday-first) needed to render one month. */
export function monthWeeks(month: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  return eachWeekOfInterval({ start: gridStart, end: gridEnd }, { weekStartsOn: 1 }).map(
    (weekStart) => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
  )
}

/** Intersects the steps with one week and stacks them into sub-rows. */
export function buildWeekSegments(steps: Step[], week: Date[]): WeekSegment[] {
  const weekStartISO = toISODate(week[0])
  const weekEndISO = toISODate(week[6])

  const items = steps
    .filter((step) => step.startDate <= weekEndISO && stepEndISO(step) >= weekStartISO)
    .map((step) => {
      const endISO = stepEndISO(step)
      const clippedStart = step.startDate < weekStartISO ? weekStartISO : step.startDate
      const clippedEnd = endISO > weekEndISO ? weekEndISO : endISO
      return {
        step,
        startIdx: differenceInCalendarDays(fromISODate(clippedStart), week[0]),
        endIdx: differenceInCalendarDays(fromISODate(clippedEnd), week[0]),
        continuesLeft: step.startDate < weekStartISO,
        continuesRight: endISO > weekEndISO,
      }
    })
    .sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx)

  const sublaneEnds: number[] = []
  const placed = items.map((item) => {
    let sub = sublaneEnds.findIndex((end) => end < item.startIdx)
    if (sub === -1) {
      sublaneEnds.push(item.endIdx)
      sub = sublaneEnds.length - 1
    } else {
      sublaneEnds[sub] = item.endIdx
    }
    return { ...item, sub }
  })
  const subrows = Math.max(1, sublaneEnds.length)
  return placed.map((placement) => ({ ...placement, subrows }))
}
