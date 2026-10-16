export type StepStatus = 'todo' | 'in_progress' | 'done'

export type ZoomLevel = 'compact' | 'normal' | 'wide'

/** How the calendar lanes are grouped. */
export type CalendarGroup = 'rooms' | 'team'

/** Which calendar view is shown. */
export type CalendarView = 'timeline' | 'months'

export interface Room {
  id: string
  name: string
  /** Hidden rooms (and their steps) are not shown on the calendar. */
  hidden: boolean
}

export interface Professional {
  id: string
  name: string
  trade: string
  color: string
  /** Hidden professionals (and their steps) are not shown on the calendar. */
  hidden: boolean
}

export interface Step {
  id: string
  title: string
  professionalId: string | null
  /** The room this step happens in. */
  roomId: string | null
  /** Links copies of a "general" step that applies to every room. */
  groupId?: string
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
  rooms: Room[]
  professionals: Professional[]
  steps: Step[]
}
