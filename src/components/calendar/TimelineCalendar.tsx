import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { addDays, differenceInCalendarDays, eachDayOfInterval, isWeekend } from 'date-fns'
import { AnimatePresence } from 'motion/react'
import { CalendarDays, TriangleAlert, ZoomIn, ZoomOut } from 'lucide-react'
import { fmtDay } from '../../lib/format'
import { UNASSIGNED_COLOR } from '../../lib/palette'
import {
  findConflictingStepIds,
  fromISODate,
  isStepOutsideWindow,
  layoutLane,
  overflowDays,
  requiredDurationDays,
  toISODate,
} from '../../lib/scheduling'
import { useStore } from '../../state/store'
import type { Renovation, Step } from '../../types'
import { StepForm } from '../StepForm'
import { Button, IconButton } from '../ui/controls'
import {
  BAR_GAP,
  BAR_HEIGHT,
  DAY_WIDTHS,
  LANE_PADDING,
  ROW_HEADER_WIDTH,
  UNASSIGNED_LANE_ID,
  ZOOM_ORDER,
} from './constants'
import { TaskBar } from './TaskBar'
import { TaskTooltip } from './TaskTooltip'
import { TimeHeader } from './TimeHeader'

interface Lane {
  id: string
  name: string
  trade: string
  color: string
  steps: Step[]
}

function buildLanes(renovation: Renovation): Lane[] {
  const professionalLanes = renovation.professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    trade: professional.trade,
    color: professional.color,
    steps: renovation.steps.filter((step) => step.professionalId === professional.id),
  }))
  const unassigned = renovation.steps.filter((step) => !step.professionalId)
  return [
    ...professionalLanes,
    {
      id: UNASSIGNED_LANE_ID,
      name: 'Unassigned',
      trade: '',
      color: UNASSIGNED_COLOR,
      steps: unassigned,
    },
  ]
}

function GridBackground({ days, dayWidth }: { days: Date[]; dayWidth: number }) {
  const weekends = useMemo(
    () => days.map((date, index) => (isWeekend(date) ? index : -1)).filter((index) => index >= 0),
    [days],
  )
  const monthStarts = useMemo(
    () => days.map((date, index) => (index > 0 && date.getDate() === 1 ? index : -1)).filter((index) => index >= 0),
    [days],
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {weekends.map((index) => (
        <div
          key={`weekend-${index}`}
          className="absolute inset-y-0 bg-[var(--cal-weekend)]"
          style={{ left: index * dayWidth, width: dayWidth }}
        />
      ))}
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: days.length * dayWidth,
          backgroundImage: `repeating-linear-gradient(to right, var(--cal-line) 0 1px, transparent 1px ${dayWidth}px)`,
        }}
      />
      {monthStarts.map((index) => (
        <div
          key={`month-${index}`}
          className="absolute inset-y-0 w-px bg-[var(--cal-line-strong)]"
          style={{ left: index * dayWidth }}
        />
      ))}
    </div>
  )
}

interface ResourceRowProps {
  lane: Lane
  start: Date
  totalDays: number
  dayWidth: number
  contentWidth: number
  conflicts: Set<string>
  outsideIds: Set<string>
  hoveredStepId: string | null
  onHoverStep: (step: Step, event: ReactMouseEvent<HTMLDivElement>) => void
  onHoverEnd: () => void
  onOpenStep: (step: Step) => void
  onCreateStep: (startISO: string, professionalId: string | null) => void
  onMove: (stepId: string, startISO: string) => void
  onResize: (stepId: string, durationDays: number) => void
}

function ResourceRow({
  lane,
  start,
  totalDays,
  dayWidth,
  contentWidth,
  conflicts,
  outsideIds,
  hoveredStepId,
  onHoverStep,
  onHoverEnd,
  onOpenStep,
  onCreateStep,
  onMove,
  onResize,
}: ResourceRowProps) {
  const placements = useMemo(() => layoutLane(lane.steps), [lane.steps])
  const sublanes = placements[0]?.sublanes ?? 1
  const height = sublanes * (BAR_HEIGHT + BAR_GAP) - BAR_GAP + LANE_PADDING * 2

  const handleEmptyClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const index = Math.min(totalDays - 1, Math.max(0, Math.floor((event.clientX - rect.left) / dayWidth)))
    onCreateStep(toISODate(addDays(start, index)), lane.id === UNASSIGNED_LANE_ID ? null : lane.id)
  }

  return (
    <div className="relative flex border-t border-[var(--cal-line)]" style={{ height }}>
      <div
        className="cal-sticky sticky left-0 z-20 flex items-center gap-2 border-r border-[var(--cal-line)] bg-white px-3 dark:bg-slate-900"
        style={{ width: ROW_HEADER_WIDTH }}
      >
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: lane.color }} />
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{lane.name}</div>
          {lane.trade ? (
            <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">{lane.trade}</div>
          ) : null}
        </div>
      </div>
      <div
        className="relative transition-colors hover:bg-slate-500/[0.03]"
        style={{ width: contentWidth }}
        onClick={handleEmptyClick}
      >
        {placements.map(({ step, sublane }) => (
          <TaskBar
            key={step.id}
            step={step}
            color={lane.color}
            top={LANE_PADDING + sublane * (BAR_HEIGHT + BAR_GAP)}
            dayWidth={dayWidth}
            start={start}
            hovered={hoveredStepId === step.id}
            hasConflict={conflicts.has(step.id)}
            outside={outsideIds.has(step.id)}
            onHover={onHoverStep}
            onHoverEnd={onHoverEnd}
            onOpen={onOpenStep}
            onMove={onMove}
            onResize={onResize}
          />
        ))}
      </div>
    </div>
  )
}

export function TimelineCalendar() {
  const renovation = useStore((state) => state.renovation)
  const zoom = useStore((state) => state.zoom)
  const setZoom = useStore((state) => state.setZoom)
  const printing = useStore((state) => state.printing)
  const setDurationDays = useStore((state) => state.setDurationDays)
  const updateStep = useStore((state) => state.updateStep)
  const notify = useStore((state) => state.notify)

  const [hover, setHover] = useState<{ stepId: string; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<{
    step: Step | null
    defaults?: { startDate?: string; professionalId?: string | null }
  } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  const start = useMemo(() => fromISODate(renovation.startDate), [renovation.startDate])
  const totalDays = renovation.durationDays
  const days = useMemo(
    () => eachDayOfInterval({ start, end: addDays(start, totalDays - 1) }),
    [start, totalDays],
  )
  const dayWidth = useMemo(() => {
    if (!printing) return DAY_WIDTHS[zoom]
    return Math.max(10, Math.min(DAY_WIDTHS[zoom], Math.floor(1050 / Math.max(1, totalDays))))
  }, [printing, zoom, totalDays])

  const contentWidth = totalDays * dayWidth
  const lanes = useMemo(() => buildLanes(renovation), [renovation])
  const conflicts = useMemo(() => findConflictingStepIds(renovation.steps), [renovation.steps])
  const outsideIds = useMemo(
    () =>
      new Set(
        renovation.steps
          .filter((step) => isStepOutsideWindow(step, renovation))
          .map((step) => step.id),
      ),
    [renovation],
  )
  const todayIndex = useMemo(() => {
    const index = differenceInCalendarDays(new Date(), start)
    return index >= 0 && index < totalDays ? index : null
  }, [start, totalDays])

  const overflow = overflowDays(renovation.steps, renovation)
  const weeks = Math.max(1, Math.round(renovation.durationDays / 7))

  // Bring "today" into view on first load.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const index = differenceInCalendarDays(new Date(), fromISODate(useStore.getState().renovation.startDate))
    container.scrollLeft =
      index >= 0 ? Math.max(0, index * DAY_WIDTHS[useStore.getState().zoom] - container.clientWidth / 3) : 0
  }, [])

  const scrollToToday = () => {
    const container = scrollRef.current
    if (!container || todayIndex === null) return
    container.scrollTo({
      left: Math.max(0, todayIndex * dayWidth - container.clientWidth / 3),
      behavior: 'smooth',
    })
  }

  const extendToFit = () => {
    const required = requiredDurationDays(renovation.steps, renovation.startDate)
    setDurationDays(Math.ceil(required / 7) * 7)
    notify('info', 'Renovation window extended.')
  }

  const moveStep = (stepId: string, startISO: string) => {
    const step = renovation.steps.find((candidate) => candidate.id === stepId)
    if (!step || step.startDate === startISO) return
    updateStep(stepId, { startDate: startISO })
    notify('info', `“${step.title}” moved to ${fmtDay(startISO)}.`)
  }

  const resizeStep = (stepId: string, durationDays: number) => {
    const step = renovation.steps.find((candidate) => candidate.id === stepId)
    if (!step || step.durationDays === durationDays) return
    updateStep(stepId, { durationDays })
    notify('info', `“${step.title}” now lasts ${durationDays === 1 ? '1 day' : `${durationDays} days`}.`)
  }

  const hoveredStep = hover
    ? renovation.steps.find((step) => step.id === hover.stepId) ?? null
    : null
  const hoveredProfessional = hoveredStep
    ? renovation.professionals.find((professional) => professional.id === hoveredStep.professionalId) ??
      null
    : null

  const zoomIndex = ZOOM_ORDER.indexOf(zoom)

  return (
    <section className="flex min-h-0 flex-1 flex-col px-4 pb-4">
      {overflow > 0 && !printing ? (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlert size={14} className="shrink-0" />
          <span>
            Steps run {overflow} {overflow === 1 ? 'day' : 'days'} past the renovation window.
          </span>
          <Button size="sm" variant="secondary" className="ml-auto" onClick={extendToFit}>
            Extend renovation to fit
          </Button>
        </div>
      ) : null}

      {!printing ? (
        <div className="no-print flex flex-wrap items-center gap-2 pt-3 pb-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {renovation.steps.length} steps · {renovation.professionals.length} professionals ·{' '}
            {renovation.durationDays % 7 === 0 ? `${weeks} weeks` : `${renovation.durationDays} days`}
          </p>
          <div className="ml-auto flex items-center gap-1">
            <IconButton
              label="Zoom out"
              disabled={zoomIndex === 0}
              onClick={() => setZoom(ZOOM_ORDER[zoomIndex - 1])}
            >
              <ZoomOut size={15} />
            </IconButton>
            <IconButton
              label="Zoom in"
              disabled={zoomIndex === ZOOM_ORDER.length - 1}
              onClick={() => setZoom(ZOOM_ORDER[zoomIndex + 1])}
            >
              <ZoomIn size={15} />
            </IconButton>
            <Button size="sm" className="ml-1" disabled={todayIndex === null} onClick={scrollToToday}>
              <CalendarDays size={13} /> Today
            </Button>
          </div>
        </div>
      ) : null}

      <div className="calendar-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div ref={scrollRef} className="calendar-scroll thin-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain">
          <div className="relative" style={{ width: ROW_HEADER_WIDTH + contentWidth }}>
            <TimeHeader days={days} dayWidth={dayWidth} todayIndex={todayIndex} />
            <div className="relative">
              <GridBackground days={days} dayWidth={dayWidth} />
              {lanes.map((lane) => (
                <ResourceRow
                  key={lane.id}
                  lane={lane}
                  start={start}
                  totalDays={totalDays}
                  dayWidth={dayWidth}
                  contentWidth={contentWidth}
                  conflicts={conflicts}
                  outsideIds={outsideIds}
                  hoveredStepId={hover?.stepId ?? null}
                  onHoverStep={(step, event) => setHover({ stepId: step.id, x: event.clientX, y: event.clientY })}
                  onHoverEnd={() => setHover(null)}
                  onOpenStep={(step) => {
                    setHover(null)
                    setEditing({ step })
                  }}
                  onCreateStep={(startISO, professionalId) => {
                    setHover(null)
                    setEditing({ step: null, defaults: { startDate: startISO, professionalId } })
                  }}
                  onMove={moveStep}
                  onResize={resizeStep}
                />
              ))}
              {todayIndex !== null ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 z-[15]"
                  style={{ left: todayIndex * dayWidth + dayWidth / 2 - 1 }}
                >
                  <div className="h-full w-[2px] bg-rose-500/60" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {hoveredStep && !printing ? (
            <TaskTooltip
              key={hoveredStep.id}
              step={hoveredStep}
              professional={hoveredProfessional}
              anchor={{ x: hover?.x ?? 0, y: hover?.y ?? 0 }}
              hasConflict={conflicts.has(hoveredStep.id)}
              outside={outsideIds.has(hoveredStep.id)}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <StepForm
        open={editing !== null}
        step={editing?.step ?? null}
        defaults={editing?.defaults}
        onClose={() => setEditing(null)}
      />
    </section>
  )
}
