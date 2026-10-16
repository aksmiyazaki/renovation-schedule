import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Removes the trailing dots from Portuguese abbreviations: “out. 2026” → “out 2026”. */
const clean = (value: string): string => value.replace(/\./g, '')

export const fmtDay = (iso: string): string =>
  clean(format(parseISO(iso), 'EEE, d MMM', { locale: ptBR }))

export const fmtDayLong = (iso: string): string =>
  format(parseISO(iso), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })

export const fmtWeekdayDateISO = (iso: string): string =>
  clean(format(parseISO(iso), 'EEE, d MMM yyyy', { locale: ptBR }))

export const fmtDate = (date: Date): string => clean(format(date, 'd MMM yyyy', { locale: ptBR }))

export const fmtNumeric = (iso: string): string => format(parseISO(iso), 'dd/MM/yyyy')

export const fmtWeekdayDate = (date: Date): string =>
  clean(format(date, 'EEE, d MMM yyyy', { locale: ptBR }))

export const fmtMonthYear = (date: Date): string => format(date, 'MMMM yyyy', { locale: ptBR })

export const fmtMonthShort = (date: Date): string => clean(format(date, 'MMM', { locale: ptBR }))

export const fmtWeekdayShort = (date: Date): string => format(date, 'EEEEEE', { locale: ptBR })

export const fmtWeekdayNarrow = (date: Date): string => format(date, 'EEEEE', { locale: ptBR })

export const durationLabel = (days: number): string => (days === 1 ? '1 dia' : `${days} dias`)

export const plural = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${count === 1 ? singular : pluralForm}`

export function fmtRange(startISO: string, endISO: string): string {
  if (startISO === endISO) return fmtDayLong(startISO)
  return `${fmtDay(startISO)} → ${fmtWeekdayDateISO(endISO)}`
}
