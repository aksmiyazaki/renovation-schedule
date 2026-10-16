import { describe, expect, it } from 'vitest'
import { brazilianHolidays, easterSunday, holidayMap } from './holidays'
import { toISODate } from './scheduling'

function holidayDate(year: number, name: string): string | undefined {
  return brazilianHolidays(year).find((holiday) => holiday.name === name)?.date
}

describe('easterSunday', () => {
  it('matches known Easter dates', () => {
    expect(toISODate(easterSunday(2024))).toBe('2024-03-31')
    expect(toISODate(easterSunday(2025))).toBe('2025-04-20')
    expect(toISODate(easterSunday(2026))).toBe('2026-04-05')
    expect(toISODate(easterSunday(2027))).toBe('2027-03-28')
  })
})

describe('brazilianHolidays', () => {
  it('computes the movable holidays from Easter (2026)', () => {
    expect(holidayDate(2026, 'Carnaval')).toBe('2026-02-16')
    expect(brazilianHolidays(2026).filter((h) => h.name === 'Carnaval')).toHaveLength(2)
    expect(holidayDate(2026, 'Sexta-feira Santa')).toBe('2026-04-03')
    expect(holidayDate(2026, 'Corpus Christi')).toBe('2026-06-04')
  })

  it('computes the movable holidays for other years', () => {
    expect(holidayDate(2025, 'Carnaval')).toBe('2025-03-03')
    expect(holidayDate(2025, 'Corpus Christi')).toBe('2025-06-19')
    expect(holidayDate(2024, 'Carnaval')).toBe('2024-02-12')
    expect(holidayDate(2024, 'Sexta-feira Santa')).toBe('2024-03-29')
  })

  it('includes the fixed national holidays (2026)', () => {
    const dates = new Set(brazilianHolidays(2026).map((holiday) => holiday.date))
    expect(dates.has('2026-01-01')).toBe(true)
    expect(dates.has('2026-04-21')).toBe(true)
    expect(dates.has('2026-05-01')).toBe(true)
    expect(dates.has('2026-09-07')).toBe(true)
    expect(dates.has('2026-10-12')).toBe(true)
    expect(dates.has('2026-11-02')).toBe(true)
    expect(dates.has('2026-11-15')).toBe(true)
    expect(dates.has('2026-11-20')).toBe(true)
    expect(dates.has('2026-12-25')).toBe(true)
  })

  it('names every holiday', () => {
    for (const holiday of brazilianHolidays(2026)) {
      expect(holiday.name.length).toBeGreaterThan(0)
    }
  })
})

describe('holidayMap', () => {
  it('only includes holidays inside the range', () => {
    const map = holidayMap('2026-10-01', '2026-12-06')
    expect(map.get('2026-10-12')).toBe('Nossa Senhora Aparecida')
    expect(map.get('2026-11-02')).toBe('Finados')
    expect(map.get('2026-11-20')).toBe('Consciência Negra')
    expect(map.get('2026-12-25')).toBeUndefined() // fora do intervalo
    expect(map.get('2026-09-07')).toBeUndefined() // fora do intervalo
  })

  it('covers ranges spanning multiple years', () => {
    const map = holidayMap('2026-12-20', '2027-01-05')
    expect(map.get('2026-12-25')).toBe('Natal')
    expect(map.get('2027-01-01')).toBe('Confraternização Universal')
    expect(map.get('2026-01-01')).toBeUndefined()
  })
})
