import type { ZoomLevel } from '../../types'

export const ROW_HEADER_WIDTH = 192
export const BAR_HEIGHT = 30
export const BAR_GAP = 6
export const LANE_PADDING = 6
export const UNASSIGNED_LANE_ID = '__unassigned'

export const ZOOM_ORDER: ZoomLevel[] = ['compact', 'normal', 'wide']

export const DAY_WIDTHS: Record<ZoomLevel, number> = {
  compact: 22,
  normal: 32,
  wide: 46,
}
