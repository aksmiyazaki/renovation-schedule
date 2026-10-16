import { PALETTE } from '../../lib/palette'
import type { Step, ZoomLevel } from '../../types'

export const ROW_HEADER_WIDTH = 192
export const BAR_HEIGHT = 30
export const BAR_GAP = 6
export const LANE_PADDING = 6
export const UNASSIGNED_LANE_ID = '__unassigned'
export const GENERAL_LANE_ID = '__general'
export const GENERAL_LANE_COLOR = '#4f46e5'

/** Deterministic accent color per room, used for structural highlights only. */
export const roomAccent = (index: number): string => PALETTE[index % PALETTE.length]

/** One calendar lane: a room or a professional, depending on the grouping. */
export interface Lane {
  id: string
  name: string
  subtitle: string
  dotColor: string
  steps: Step[]
  /** The "Reforma geral" lane (tasks that apply to every room). */
  general?: boolean
}

export const ZOOM_ORDER: ZoomLevel[] = ['compact', 'normal', 'wide']

export const DAY_WIDTHS: Record<ZoomLevel, number> = {
  compact: 22,
  normal: 32,
  wide: 46,
}
