export type StepStatus = 'todo' | 'in_progress' | 'done'

export type ZoomLevel = 'compact' | 'normal' | 'wide'

export interface Professional {
  id: string
  name: string
  trade: string
  color: string
}

export interface Step {
  id: string
  title: string
  professionalId: string | null
  /** Inclusive start day, as yyyy-MM-dd. */
  startDate: string
  /** Inclusive duration in days (>= 1). */
  durationDays: number
  status: StepStatus
  notes?: string
}

export interface Renovation {
  name: string
  /** Inclusive start day of the whole project, as yyyy-MM-dd. */
  startDate: string
  /** Length of the renovation window in days. */
  durationDays: number
  professionals: Professional[]
  steps: Step[]
}
