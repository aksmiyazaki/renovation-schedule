import { format, parseISO } from 'date-fns'

export const fmtDay = (iso: string): string => format(parseISO(iso), 'EEE d MMM')

export const fmtDayLong = (iso: string): string => format(parseISO(iso), 'EEEE d MMMM yyyy')

export const durationLabel = (days: number): string => (days === 1 ? '1 day' : `${days} days`)

export function fmtRange(startISO: string, endISO: string): string {
  if (startISO === endISO) return fmtDayLong(startISO)
  return `${format(parseISO(startISO), 'EEE d MMM')} → ${format(parseISO(endISO), 'EEE d MMM yyyy')}`
}
