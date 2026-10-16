import { addDays, startOfWeek } from 'date-fns'
import type { Renovation } from '../types'
import { toISODate } from './scheduling'

/** Plano em branco usado pelo “Apagar tudo”: segunda-feira desta semana, 56 dias, vazio. */
export function createEmptyRenovation(): Renovation {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return {
    name: 'Minha reforma',
    startDate: toISODate(monday),
    durationDays: 56,
    rooms: [],
    professionals: [],
    steps: [],
  }
}

/**
 * Plano de demonstração mostrado na primeira visita, começando na segunda-feira
 * desta semana.
 */
export function createDemoRenovation(): Renovation {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const day = (offset: number) => toISODate(addDays(monday, offset))

  return {
    name: 'Reforma da Cozinha e do Banheiro',
    startDate: day(0),
    durationDays: 56,
    rooms: [
      { id: 'room-kitchen', name: 'Cozinha', hidden: false },
      { id: 'room-bathroom', name: 'Banheiro', hidden: false },
      { id: 'room-hallway', name: 'Corredor', hidden: false },
    ],
    professionals: [
      { id: 'pro-marco', name: 'Marco', trade: 'Demolição e drywall', color: '#f97316' },
      { id: 'pro-anna', name: 'Anna', trade: 'Hidráulica', color: '#3b82f6' },
      { id: 'pro-luc', name: 'Luc', trade: 'Eletricista', color: '#f59e0b' },
      { id: 'pro-sophie', name: 'Sophie', trade: 'Azulejos e revestimentos', color: '#14b8a6' },
      { id: 'pro-nina', name: 'Nina', trade: 'Marcenaria', color: '#8b5cf6' },
      { id: 'pro-paul', name: 'Paul', trade: 'Pintura e acabamento', color: '#ec4899' },
    ],
    steps: [
      {
        id: 'step-1',
        title: 'Demolir a cozinha',
        professionalId: 'pro-marco',
        roomId: 'room-kitchen',
        startDate: day(0),
        durationDays: 3,
        status: 'done',
        notes: 'Remover os armários antigos, a bancada e o piso.',
      },
      {
        id: 'step-2',
        title: 'Retirar o revestimento do banheiro',
        professionalId: 'pro-marco',
        roomId: 'room-bathroom',
        startDate: day(3),
        durationDays: 3,
        status: 'in_progress',
        notes: 'Remover os azulejos antigos e a banheira.',
      },
      {
        id: 'step-3',
        title: 'Hidráulica da cozinha',
        professionalId: 'pro-anna',
        roomId: 'room-kitchen',
        startDate: day(6),
        durationDays: 5,
        status: 'todo',
        notes: 'Nova pia, ponto para a lava-louças e mudança do radiador.',
      },
      {
        id: 'step-4',
        title: 'Instalação elétrica',
        professionalId: 'pro-luc',
        roomId: 'room-kitchen',
        startDate: day(6),
        durationDays: 4,
        status: 'todo',
        notes: 'Novas tomadas para a ilha e o cooktop por indução.',
      },
      {
        id: 'step-5',
        title: 'Hidráulica do banheiro',
        professionalId: 'pro-anna',
        roomId: 'room-bathroom',
        startDate: day(11),
        durationDays: 3,
        status: 'todo',
      },
      {
        id: 'step-6',
        title: 'Azulejos do banheiro',
        professionalId: 'pro-sophie',
        roomId: 'room-bathroom',
        startDate: day(14),
        durationDays: 5,
        status: 'todo',
        notes: 'Porcelanato grandão, 60 × 60 cm, cinza-claro.',
      },
      {
        id: 'step-7',
        title: 'Azulejos da cozinha',
        professionalId: 'pro-sophie',
        roomId: 'room-kitchen',
        startDate: day(19),
        durationDays: 6,
        status: 'todo',
      },
      {
        id: 'step-8',
        title: 'Instalação dos armários',
        professionalId: 'pro-nina',
        roomId: 'room-kitchen',
        startDate: day(25),
        durationDays: 4,
        status: 'todo',
      },
      {
        id: 'step-9',
        title: 'Pintura da cozinha',
        professionalId: 'pro-paul',
        roomId: 'room-kitchen',
        startDate: day(29),
        durationDays: 5,
        status: 'todo',
      },
      {
        id: 'step-10',
        title: 'Pintura do corredor',
        professionalId: 'pro-paul',
        roomId: 'room-hallway',
        startDate: day(34),
        durationDays: 4,
        status: 'todo',
      },
      {
        id: 'step-11',
        title: 'Retoques finais e vistoria',
        professionalId: 'pro-paul',
        roomId: 'room-hallway',
        startDate: day(38),
        durationDays: 2,
        status: 'todo',
      },
    ],
  }
}
