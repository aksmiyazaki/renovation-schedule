import { useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { addDays } from 'date-fns'
import { fromISODate, toISODate } from '../../lib/scheduling'
import type { Step } from '../../types'

export interface BarDragState {
  kind: 'move' | 'resize'
  deltaDays: number
}

interface UseBarDragOptions {
  step: Step
  /** Width of one day in pixels (day column or calendar cell). */
  dayWidth: number
  canResize?: boolean
  onMove: (stepId: string, startISO: string) => void
  onResize: (stepId: string, durationDays: number) => void
  onOpen: (step: Step) => void
  onHoverEnd: () => void
}

/**
 * Shared pointer/keyboard drag behaviour for task bars: moving a step by whole
 * days and resizing it from its end edge.
 */
export function useBarDrag({
  step,
  dayWidth,
  canResize = true,
  onMove,
  onResize,
  onOpen,
  onHoverEnd,
}: UseBarDragOptions) {
  const [drag, setDrag] = useState<BarDragState | null>(null)
  const startXRef = useRef(0)
  const movedRef = useRef(false)

  const begin = (kind: BarDragState['kind']) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (kind === 'resize' && !canResize) return
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* pointer capture is best-effort */
    }
    startXRef.current = event.clientX
    movedRef.current = false
    setDrag({ kind, deltaDays: 0 })
    onHoverEnd()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const delta = Math.round((event.clientX - startXRef.current) / dayWidth)
    if (delta !== drag.deltaDays) {
      if (delta !== 0) movedRef.current = true
      setDrag({ kind: drag.kind, deltaDays: delta })
    }
  }

  const commit = () => {
    if (!drag) return
    const { kind, deltaDays } = drag
    setDrag(null)
    if (!movedRef.current || deltaDays === 0) return
    if (kind === 'move') {
      onMove(step.id, toISODate(addDays(fromISODate(step.startDate), deltaDays)))
    } else {
      onResize(step.id, Math.max(1, step.durationDays + deltaDays))
    }
  }

  const cancel = () => setDrag(null)

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(step)
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowLeft' ? -1 : 1
      if (event.shiftKey && canResize) {
        onResize(step.id, Math.max(1, step.durationDays + delta))
      } else if (!event.shiftKey) {
        onMove(step.id, toISODate(addDays(fromISODate(step.startDate), delta)))
      }
    }
  }

  return { drag, movedRef, begin, handlePointerMove, commit, cancel, handleKeyDown }
}
