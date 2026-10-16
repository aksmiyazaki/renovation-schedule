import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Renovation, Step } from '../types'

/** Convert a Date to a yyyy-MM-dd string (local time). */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Parse a yyyy-MM-dd string into a local Date. */
export function fromISODate(iso: string): Date {
  return parseISO(iso)
}

export function renovationEnd(renovation: Renovation): Date {
  return addDays(fromISODate(renovation.startDate), Math.max(0, renovation.durationDays - 1))
}

export function renovationEndISO(renovation: Renovation): string {
  return toISODate(renovationEnd(renovation))
}

export function stepEnd(step: Step): Date {
  return addDays(fromISODate(step.startDate), Math.max(0, step.durationDays - 1))
}

export function stepEndISO(step: Step): string {
  return toISODate(stepEnd(step))
}

export function isStepOutsideWindow(step: Step, renovation: Renovation): boolean {
  return step.startDate < renovation.startDate || stepEndISO(step) > renovationEndISO(renovation)
}

/** First free day after the latest scheduled step (or the renovation start when empty). */
export function suggestNextStart(steps: Step[], renovationStart: string): string {
  if (steps.length === 0) return renovationStart
  const latestEnd = steps.reduce((max, step) => {
    const end = stepEndISO(step)
    return end > max ? end : max
  }, '')
  if (!latestEnd) return renovationStart
  return toISODate(addDays(fromISODate(latestEnd), 1))
}

/** Number of days (counted from the renovation start) needed to fit every step. */
export function requiredDurationDays(steps: Step[], renovationStart: string): number {
  if (steps.length === 0) return 0
  const start = fromISODate(renovationStart)
  const latestEnd = steps.reduce((max, step) => {
    const end = stepEnd(step)
    return end > max ? end : max
  }, start)
  return differenceInCalendarDays(latestEnd, start) + 1
}

/** How many days the steps spill past the current renovation window. */
export function overflowDays(steps: Step[], renovation: Renovation): number {
  return Math.max(0, requiredDurationDays(steps, renovation.startDate) - renovation.durationDays)
}

export interface LanePlacement {
  step: Step
  /** Row inside the lane (0-based) so overlapping steps stack instead of hiding each other. */
  sublane: number
  sublanes: number
}

/** Greedy sublane assignment so parallel steps of one professional are all visible. */
export function layoutLane(steps: Step[]): LanePlacement[] {
  const sorted = [...steps].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title),
  )
  const sublaneEnds: string[] = []
  const placed = sorted.map((step) => {
    let sublane = sublaneEnds.findIndex((end) => end < step.startDate)
    if (sublane === -1) {
      sublaneEnds.push(stepEndISO(step))
      sublane = sublaneEnds.length - 1
    } else {
      sublaneEnds[sublane] = stepEndISO(step)
    }
    return { step, sublane }
  })
  const sublanes = Math.max(1, sublaneEnds.length)
  return placed.map((placement) => ({ ...placement, sublanes }))
}
