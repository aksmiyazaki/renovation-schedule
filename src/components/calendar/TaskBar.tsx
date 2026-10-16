import { useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { addDays, differenceInCalendarDays } from 'date-fns'
import { Check } from 'lucide-react'
import { cx } from '../../lib/cx'
import { durationLabel, fmtDay } from '../../lib/format'
import { contrastText } from '../../lib/palette'
import { fromISODate, toISODate } from '../../lib/scheduling'
import type { Step } from '../../types'
import { BAR_HEIGHT } from './constants'

type DragKind = 'move' | 'resize'

interface TaskBarProps {
  step: Step
  color: string
  top: number
  dayWidth: number
  start: Date
  hovered: boolean
  hasConflict: boolean
  outside: boolean
  onHover: (step: Step, event: ReactMouseEvent<HTMLDivElement>) => void
  onHoverEnd: () => void
  onOpen: (step: Step) => void
  onMove: (stepId: string, startISO: string) => void
  onResize: (stepId: string, durationDays: number) => void
}

export function TaskBar({
  step,
  color,
  top,
  dayWidth,
  start,
  hovered,
  hasConflict,
  outside,
  onHover,
  onHoverEnd,
  onOpen,
  onMove,
  onResize,
}: TaskBarProps) {
  const [drag, setDrag] = useState<{ kind: DragKind; deltaDays: number } | null>(null)
  const startXRef = useRef(0)
  const movedRef = useRef(false)

  const dayIndex = differenceInCalendarDays(fromISODate(step.startDate), start)
  const baseLeft = dayIndex * dayWidth + 2
  const baseWidth = Math.max(dayWidth - 4, step.durationDays * dayWidth - 4)

  const previewDelta = drag?.deltaDays ?? 0
  const left = baseLeft + (drag?.kind === 'move' ? previewDelta * dayWidth : 0)
  const width =
    drag?.kind === 'resize'
      ? Math.max(dayWidth - 4, (step.durationDays + previewDelta) * dayWidth - 4)
      : baseWidth

  const begin = (kind: DragKind) => (event: ReactPointerEvent<HTMLDivElement>) => {
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

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(step)
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowLeft' ? -1 : 1
      if (event.shiftKey) {
        onResize(step.id, Math.max(1, step.durationDays + delta))
      } else {
        onMove(step.id, toISODate(addDays(fromISODate(step.startDate), delta)))
      }
    }
  }

  const previewStartISO = toISODate(
    addDays(fromISODate(step.startDate), drag?.kind === 'move' ? previewDelta : 0),
  )
  const previewDuration =
    drag?.kind === 'resize' ? Math.max(1, step.durationDays + previewDelta) : step.durationDays
  const previewEndISO = toISODate(addDays(fromISODate(previewStartISO), previewDuration - 1))

  return (
    <>
      {drag && movedRef.current ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 rounded-lg border-2 border-dashed border-[var(--cal-ghost)]"
          style={{ left: baseLeft, width: baseWidth, top, height: BAR_HEIGHT }}
        />
      ) : null}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${step.title}, ${fmtDay(step.startDate)} for ${durationLabel(step.durationDays)}`}
        onPointerDown={begin('move')}
        onPointerMove={handlePointerMove}
        onPointerUp={commit}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={handleKeyDown}
        onClick={(event) => {
          event.stopPropagation()
          if (!movedRef.current) onOpen(step)
        }}
        onMouseEnter={(event) => onHover(step, event)}
        onMouseMove={(event) => onHover(step, event)}
        onMouseLeave={onHoverEnd}
        className={cx(
          'group absolute z-10 flex touch-none items-center gap-1 rounded-lg px-2 text-[11px] font-medium shadow-sm outline-none select-none',
          drag
            ? 'z-20 cursor-grabbing transition-none'
            : 'cursor-grab transition-[left,width,box-shadow] duration-200 ease-out',
          hovered && !drag ? 'z-20 shadow-md brightness-105' : '',
          step.status === 'done' ? 'opacity-60' : '',
          outside
            ? 'outline-2 -outline-offset-2 outline-rose-400'
            : hasConflict
              ? 'outline-2 -outline-offset-2 outline-amber-400'
              : '',
        )}
        style={{ left, width, top, height: BAR_HEIGHT, background: color, color: contrastText(color) }}
      >
        {step.status === 'in_progress' ? (
          <span aria-hidden className="bar-stripes pointer-events-none absolute inset-0 rounded-lg" />
        ) : null}
        <span className="pointer-events-none relative flex min-w-0 items-center gap-1">
          {step.status === 'done' ? <Check size={12} className="shrink-0" /> : null}
          {width > 56 ? <span className="truncate">{step.title}</span> : null}
        </span>
        {drag ? (
          <span className="cal-badge pointer-events-none absolute -top-7 left-0 z-30 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
            {drag.kind === 'move'
              ? fmtDay(previewStartISO)
              : `${durationLabel(previewDuration)} · ends ${fmtDay(previewEndISO)}`}
          </span>
        ) : null}
        <span
          aria-hidden
          onPointerDown={begin('resize')}
          className="absolute top-0 right-0 flex h-full w-2.5 cursor-ew-resize items-center justify-center rounded-r-lg opacity-0 transition-opacity group-hover:opacity-100"
        >
          <span className="h-3 w-0.5 rounded-full bg-white/70" />
        </span>
      </div>
    </>
  )
}
