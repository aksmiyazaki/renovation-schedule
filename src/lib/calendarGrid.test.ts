import { describe, expect, it } from 'vitest'
import { buildWeekSegments, monthWeeks } from './calendarGrid'
import type { Step } from '../types'

function makeStep(patch: Partial<Step> & { id: string }): Step {
  return {
    title: `Etapa ${patch.id}`,
    professionalId: null,
    roomId: 'room-1',
    startDate: '2026-10-19',
    durationDays: 3,
    status: 'todo',
    ...patch,
  }
}

const week = Array.from({ length: 7 }, (_, index) => new Date(2026, 9, 19 + index)) // seg 19 → dom 25 out

describe('monthWeeks', () => {
  it('returns Monday-first weeks covering the whole month', () => {
    const weeks = monthWeeks(new Date(2026, 9, 1)) // outubro 2026
    expect(weeks).toHaveLength(5)
    expect(weeks[0][0].getDate()).toBe(28) // segunda 28 de setembro
    expect(weeks[0][0].getMonth()).toBe(8)
    expect(weeks[4][6].getDate()).toBe(1) // domingo 1º de novembro
  })
})

describe('buildWeekSegments', () => {
  it('places a step fully inside the week', () => {
    const step = makeStep({ id: 'a', startDate: '2026-10-20', durationDays: 3 }) // ter→qui
    const [segment] = buildWeekSegments([step], week)
    expect(segment.startIdx).toBe(1)
    expect(segment.endIdx).toBe(3)
    expect(segment.continuesLeft).toBe(false)
    expect(segment.continuesRight).toBe(false)
    expect(segment.sub).toBe(0)
    expect(segment.subrows).toBe(1)
  })

  it('clips segments that start before or end after the week', () => {
    const before = makeStep({ id: 'a', startDate: '2026-10-10', durationDays: 12 }) // 10 → 21
    const after = makeStep({ id: 'b', startDate: '2026-10-23', durationDays: 10 }) // 23 → 1 nov
    const segments = buildWeekSegments([before, after], week)
    const a = segments.find((segment) => segment.step.id === 'a')!
    const b = segments.find((segment) => segment.step.id === 'b')!
    expect(a.startIdx).toBe(0)
    expect(a.continuesLeft).toBe(true)
    expect(a.endIdx).toBe(2)
    expect(b.endIdx).toBe(6)
    expect(b.continuesRight).toBe(true)
  })

  it('stacks overlapping steps into separate sub-rows', () => {
    const a = makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 4 })
    const b = makeStep({ id: 'b', startDate: '2026-10-21', durationDays: 3 })
    const c = makeStep({ id: 'c', startDate: '2026-10-24', durationDays: 2 })
    const segments = buildWeekSegments([a, b, c], week)
    const byId = new Map(segments.map((segment) => [segment.step.id, segment]))
    expect(byId.get('a')?.sub).toBe(0)
    expect(byId.get('b')?.sub).toBe(1)
    expect(byId.get('c')?.sub).toBe(0)
    expect(byId.get('a')?.subrows).toBe(2)
  })

  it('ignores steps outside the week entirely', () => {
    const outside = makeStep({ id: 'a', startDate: '2026-11-10', durationDays: 2 })
    expect(buildWeekSegments([outside], week)).toHaveLength(0)
  })
})
