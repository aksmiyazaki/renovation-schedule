import { addDays, startOfWeek } from 'date-fns'
import type { Renovation } from '../types'
import { toISODate } from './scheduling'

/** Demo plan shown on the very first visit, starting on this week's Monday. */
export function createDemoRenovation(): Renovation {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const day = (offset: number) => toISODate(addDays(monday, offset))

  return {
    name: 'Kitchen Renovation',
    startDate: day(0),
    durationDays: 56,
    professionals: [
      { id: 'pro-marco', name: 'Marco', trade: 'Demolition & drywall', color: '#f97316' },
      { id: 'pro-anna', name: 'Anna', trade: 'Plumbing', color: '#3b82f6' },
      { id: 'pro-luc', name: 'Luc', trade: 'Electrician', color: '#f59e0b' },
      { id: 'pro-sophie', name: 'Sophie', trade: 'Tiling', color: '#14b8a6' },
      { id: 'pro-nina', name: 'Nina', trade: 'Carpentry', color: '#8b5cf6' },
      { id: 'pro-paul', name: 'Paul', trade: 'Painting & finishing', color: '#ec4899' },
    ],
    steps: [
      {
        id: 'step-1',
        title: 'Gut the kitchen',
        professionalId: 'pro-marco',
        startDate: day(0),
        durationDays: 3,
        status: 'done',
        notes: 'Remove the old cabinets, countertop and flooring.',
      },
      {
        id: 'step-2',
        title: 'Plumbing rough-in',
        professionalId: 'pro-anna',
        startDate: day(3),
        durationDays: 5,
        status: 'in_progress',
        notes: 'New sink, dishwasher connection and radiator move.',
      },
      {
        id: 'step-3',
        title: 'Electrical wiring',
        professionalId: 'pro-luc',
        startDate: day(8),
        durationDays: 4,
        status: 'todo',
        notes: 'New outlets for the island and the induction hob.',
      },
      {
        id: 'step-4',
        title: 'Drywall & plastering',
        professionalId: 'pro-marco',
        startDate: day(12),
        durationDays: 3,
        status: 'todo',
      },
      {
        id: 'step-5',
        title: 'Floor & wall tiling',
        professionalId: 'pro-sophie',
        startDate: day(15),
        durationDays: 6,
        status: 'todo',
        notes: 'Large-format tiles, 60 × 60 cm, light grey.',
      },
      {
        id: 'step-6',
        title: 'Cabinet installation',
        professionalId: 'pro-nina',
        startDate: day(21),
        durationDays: 4,
        status: 'todo',
      },
      {
        id: 'step-7',
        title: 'Painting & finishing',
        professionalId: 'pro-paul',
        startDate: day(25),
        durationDays: 5,
        status: 'todo',
      },
      {
        id: 'step-8',
        title: 'Final touches & inspection',
        professionalId: 'pro-paul',
        startDate: day(30),
        durationDays: 2,
        status: 'todo',
      },
    ],
  }
}
