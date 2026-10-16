import { describe, expect, it } from 'vitest'
import { migratePersistedState } from './persistMigration'

const oldPlan = {
  name: 'Old kitchen plan',
  startDate: '2026-10-19',
  durationDays: 28,
  professionals: [
    { id: 'pro-1', name: 'Marco', trade: 'Tiler', color: '#f97316', capacity: 3 }, // capacity was removed
  ],
  steps: [
    {
      id: 'step-1',
      title: 'Gut the kitchen',
      professionalId: 'pro-1',
      startDate: '2026-10-19',
      durationDays: 3,
      status: 'todo',
      // no roomId (pre-update)
    },
  ],
  // no rooms (pre-update)
}

describe('migratePersistedState', () => {
  it('adds missing rooms and roomIds, drops removed fields, without touching ids', () => {
    const migrated = migratePersistedState({
      renovation: oldPlan,
      theme: 'dark',
      syncUpdatedAt: 123,
    })

    const renovation = migrated.renovation as typeof oldPlan & {
      rooms: unknown[]
      professionals: Array<Record<string, unknown>>
      steps: Array<{ roomId: string | null }>
    }

    expect(renovation.rooms).toEqual([])
    expect('capacity' in renovation.professionals[0]).toBe(false)
    expect(renovation.steps[0].roomId).toBeNull()
    expect(renovation.steps[0].id).toBe('step-1')
    expect(renovation.professionals[0].id).toBe('pro-1')
    expect(migrated.theme).toBe('dark')
    expect(migrated.syncUpdatedAt).toBe(123)
  })

  it('keeps plans that cannot be repaired instead of wiping them', () => {
    const broken = { name: 'Broken', startDate: 'not-a-date', durationDays: 10 }
    const migrated = migratePersistedState({ renovation: broken, theme: 'light' })
    expect(migrated.renovation).toEqual(broken)
  })

  it('passes through states without a renovation untouched', () => {
    const state = { theme: 'dark' }
    expect(migratePersistedState(state)).toEqual(state)
  })

  it('accepts garbage input', () => {
    expect(migratePersistedState(null)).toEqual({})
    expect(migratePersistedState('nonsense')).toEqual({})
  })
})
