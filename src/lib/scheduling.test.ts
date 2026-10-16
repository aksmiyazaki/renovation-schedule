import { describe, expect, it } from 'vitest'
import type { Renovation, Step } from '../types'
import {
  isStepOutsideWindow,
  layoutLane,
  overflowDays,
  renovationEndISO,
  requiredDurationDays,
  stepEndISO,
  suggestNextStart,
  toISODate,
} from './scheduling'

const renovation: Renovation = {
  name: 'Test renovation',
  startDate: '2026-10-19',
  durationDays: 28,
  rooms: [],
  professionals: [],
  steps: [],
}

function makeStep(patch: Partial<Step> & { id: string }): Step {
  return {
    title: `Step ${patch.id}`,
    professionalId: 'pro-1',
    roomId: null,
    startDate: '2026-10-19',
    durationDays: 3,
    status: 'todo',
    ...patch,
  }
}

describe('date helpers', () => {
  it('formats a date as an ISO day', () => {
    expect(toISODate(new Date(2026, 9, 19))).toBe('2026-10-19')
  })

  it('computes an inclusive step end', () => {
    const step = makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 3 })
    expect(stepEndISO(step)).toBe('2026-10-21')
  })

  it('treats a one-day step as ending on its start day', () => {
    const step = makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 1 })
    expect(stepEndISO(step)).toBe('2026-10-19')
  })

  it('computes the inclusive renovation end', () => {
    expect(renovationEndISO(renovation)).toBe('2026-11-15')
  })
})

describe('isStepOutsideWindow', () => {
  it('is false for steps inside the window', () => {
    const step = makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 7 })
    expect(isStepOutsideWindow(step, renovation)).toBe(false)
  })

  it('is true when a step finishes after the window end', () => {
    const step = makeStep({ id: 'a', startDate: '2026-11-10', durationDays: 7 }) // ends 16 Nov > 15 Nov
    expect(isStepOutsideWindow(step, renovation)).toBe(true)
  })

  it('is true when a step starts before the window start', () => {
    const step = makeStep({ id: 'a', startDate: '2026-10-18', durationDays: 1 })
    expect(isStepOutsideWindow(step, renovation)).toBe(true)
  })
})

describe('suggestNextStart', () => {
  it('returns the renovation start when there are no steps', () => {
    expect(suggestNextStart([], '2026-10-19')).toBe('2026-10-19')
  })

  it('returns the day after the latest step end', () => {
    const steps = [
      makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 3 }), // ends 21
      makeStep({ id: 'b', startDate: '2026-10-20', durationDays: 5 }), // ends 24
    ]
    expect(suggestNextStart(steps, '2026-10-19')).toBe('2026-10-25')
  })
})

describe('requiredDurationDays and overflowDays', () => {
  it('is 0 for an empty plan', () => {
    expect(requiredDurationDays([], renovation.startDate)).toBe(0)
    expect(overflowDays([], renovation)).toBe(0)
  })

  it('counts inclusive days from the renovation start to the latest end', () => {
    const steps = [makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 3 })] // ends 21 → 3 days
    expect(requiredDurationDays(steps, renovation.startDate)).toBe(3)
  })

  it('measures how far steps spill past the window', () => {
    const steps = [makeStep({ id: 'a', startDate: '2026-11-10', durationDays: 7 })] // ends 16 Nov → 29 days needed
    expect(requiredDurationDays(steps, renovation.startDate)).toBe(29)
    expect(overflowDays(steps, renovation)).toBe(1)
  })
})

describe('layoutLane', () => {
  it('stacks overlapping steps into separate sublanes', () => {
    const a = makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 5 })
    const b = makeStep({ id: 'b', startDate: '2026-10-21', durationDays: 5 })
    const c = makeStep({ id: 'c', startDate: '2026-10-26', durationDays: 2 })
    const placements = layoutLane([a, b, c])
    expect(placements.map((placement) => placement.sublane)).toEqual([0, 1, 0])
    expect(placements[0].sublanes).toBe(2)
  })

  it('reports a single sublane when nothing overlaps', () => {
    const a = makeStep({ id: 'a', startDate: '2026-10-19', durationDays: 2 })
    const b = makeStep({ id: 'b', startDate: '2026-10-22', durationDays: 2 })
    const placements = layoutLane([a, b])
    expect(placements.map((placement) => placement.sublane)).toEqual([0, 0])
    expect(placements[0].sublanes).toBe(1)
  })

  it('sorts placements by start date', () => {
    const a = makeStep({ id: 'a', startDate: '2026-10-25', durationDays: 1 })
    const b = makeStep({ id: 'b', startDate: '2026-10-19', durationDays: 1 })
    const placements = layoutLane([a, b])
    expect(placements.map((placement) => placement.step.id)).toEqual(['b', 'a'])
  })
})
