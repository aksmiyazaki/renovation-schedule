import { addDays } from 'date-fns'
import { toISODate } from './scheduling'

export interface Holiday {
  date: string
  name: string
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Feriados nacionais brasileiros de um ano (fixos + móveis). */
export function brazilianHolidays(year: number): Holiday[] {
  const easter = easterSunday(year)
  const movable = (offset: number, name: string): Holiday => ({
    date: toISODate(addDays(easter, offset)),
    name,
  })
  return [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    movable(-48, 'Carnaval'),
    movable(-47, 'Carnaval'),
    movable(-2, 'Sexta-feira Santa'),
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho' },
    movable(60, 'Corpus Christi'),
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Consciência Negra' },
    { date: `${year}-12-25`, name: 'Natal' },
  ]
}

/** Mapa yyyy-MM-dd → nome do feriado, cobrindo todos os anos do intervalo. */
export function holidayMap(startISO: string, endISO: string): Map<string, string> {
  const map = new Map<string, string>()
  const startYear = Number(startISO.slice(0, 4))
  const endYear = Number(endISO.slice(0, 4))
  for (let year = startYear; year <= endYear; year += 1) {
    for (const holiday of brazilianHolidays(year)) {
      if (holiday.date >= startISO && holiday.date <= endISO) {
        map.set(holiday.date, holiday.name)
      }
    }
  }
  return map
}
