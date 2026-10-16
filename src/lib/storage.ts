import type { Professional, Renovation, Room, Step, StepStatus } from '../types'
import { PALETTE } from './palette'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const STATUSES: StepStatus[] = ['todo', 'in_progress', 'done']

const uid = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reforma'
  )
}

export function exportRenovationFile(renovation: Renovation): void {
  const payload = {
    app: 'renovation-schedule',
    version: 1,
    exportedAt: new Date().toISOString(),
    renovation,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${slugify(renovation.name)}-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function importRenovationFile(file: File): Promise<Renovation> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Este arquivo não é um JSON válido.')
  }
  return sanitizeRenovation(parsed)
}

/** Accepts either an exported payload or a bare renovation object, and repairs what it can. */
export function sanitizeRenovation(input: unknown): Renovation {
  const wrapper = input as { renovation?: unknown } | null
  const data = (
    wrapper && typeof wrapper === 'object' && 'renovation' in wrapper ? wrapper.renovation : input
  ) as Record<string, unknown> | null
  if (!data || typeof data !== 'object') {
    throw new Error('O arquivo não contém um plano de reforma.')
  }

  const startDate = asString(data.startDate)
  if (!ISO_DATE.test(startDate)) {
    throw new Error('O plano não tem uma data de início válida.')
  }

  const durationRaw = Number(data.durationDays)
  const durationDays = Number.isFinite(durationRaw) && durationRaw >= 1 ? Math.round(durationRaw) : 28

  const rooms: Room[] = (Array.isArray(data.rooms) ? data.rooms : [])
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => ({
      id: asString(entry.id) || uid(),
      name: asString(entry.name) || `Cômodo ${index + 1}`,
      hidden: entry.hidden === true,
    }))

  // De-duplicate room ids so step references stay unambiguous.
  const roomIds = new Set<string>()
  for (const room of rooms) {
    if (roomIds.has(room.id)) room.id = uid()
    roomIds.add(room.id)
  }

  const professionals: Professional[] = (Array.isArray(data.professionals) ? data.professionals : [])
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => ({
      id: asString(entry.id) || uid(),
      name: asString(entry.name) || `Profissional ${index + 1}`,
      trade: asString(entry.trade),
      color: HEX_COLOR.test(asString(entry.color)) ? asString(entry.color) : PALETTE[index % PALETTE.length],
    }))

  // De-duplicate professional ids so step references stay unambiguous.
  const professionalIds = new Set<string>()
  for (const professional of professionals) {
    if (professionalIds.has(professional.id)) professional.id = uid()
    professionalIds.add(professional.id)
  }

  const steps: Step[] = (Array.isArray(data.steps) ? data.steps : [])
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => {
      const start = asString(entry.startDate)
      const duration = Math.round(Number(entry.durationDays))
      const status = STATUSES.includes(entry.status as StepStatus) ? (entry.status as StepStatus) : 'todo'
      const professionalId = asString(entry.professionalId)
      const roomId = asString(entry.roomId)
      const groupId = asString(entry.groupId)
      const notes = asString(entry.notes)
      return {
        id: asString(entry.id) || uid(),
        title: asString(entry.title) || `Etapa ${index + 1}`,
        professionalId: professionalIds.has(professionalId) ? professionalId : null,
        roomId: roomIds.has(roomId) ? roomId : null,
        ...(groupId ? { groupId } : {}),
        startDate: ISO_DATE.test(start) ? start : startDate,
        durationDays: Number.isFinite(duration) && duration >= 1 ? duration : 1,
        status,
        ...(notes ? { notes } : {}),
      }
    })

  const stepIds = new Set<string>()
  for (const step of steps) {
    if (stepIds.has(step.id)) step.id = uid()
    stepIds.add(step.id)
  }

  return {
    name: asString(data.name) || 'Reforma importada',
    startDate,
    durationDays,
    rooms,
    professionals,
    steps,
  }
}
