import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { addDays, differenceInCalendarDays, eachDayOfInterval, isWeekend } from 'date-fns'
import { AnimatePresence } from 'motion/react'
import { CalendarDays, TriangleAlert, ZoomIn, ZoomOut } from 'lucide-react'
import { cx } from '../../lib/cx'
import { fmtDay, plural } from '../../lib/format'
import { holidayMap } from '../../lib/holidays'
import { UNASSIGNED_COLOR } from '../../lib/palette'
import {
  collectGeneralSteps,
  dedupeGroups,
  fromISODate,
  isStepOutsideWindow,
  layoutLane,
  overflowDays,
  renovationEndISO,
  requiredDurationDays,
  toISODate,
} from '../../lib/scheduling'
import { useStore } from '../../state/store'
import type { CalendarGroup, Renovation, Step } from '../../types'
import { StepForm } from '../StepForm'
import { Button, IconButton } from '../ui/controls'
import {
  BAR_GAP,
  BAR_HEIGHT,
  DAY_WIDTHS,
  GENERAL_LANE_COLOR,
  GENERAL_LANE_ID,
  LANE_PADDING,
  ROW_HEADER_WIDTH,
  roomAccent,
  UNASSIGNED_LANE_ID,
  ZOOM_ORDER,
} from './constants'
import type { Lane } from './constants'
import { MonthsCalendar } from './MonthView'
import { TaskBar } from './TaskBar'
import { TaskTooltip } from './TaskTooltip'
import { TimeHeader } from './TimeHeader'

function buildLanes(renovation: Renovation, group: CalendarGroup): Lane[] {
  const hiddenRoomIds = new Set(
    renovation.rooms.filter((room) => room.hidden).map((room) => room.id),
  )
  const hiddenProfessionalIds = new Set(
    renovation.professionals
      .filter((professional) => professional.hidden)
      .map((professional) => professional.id),
  )
  const isVisibleStep = (step: Step) =>
    !(step.roomId && hiddenRoomIds.has(step.roomId)) &&
    !(step.professionalId && hiddenProfessionalIds.has(step.professionalId))

  if (group === 'rooms') {
    const generalSteps = collectGeneralSteps(
      renovation.steps.filter(isVisibleStep),
      hiddenRoomIds,
    )
    const generalLane: Lane = {
      id: GENERAL_LANE_ID,
      name: 'Reforma geral',
      subtitle: plural(generalSteps.length, 'etapa', 'etapas'),
      dotColor: GENERAL_LANE_COLOR,
      steps: generalSteps,
      general: true,
    }
    const roomLanes: Lane[] = renovation.rooms
      .map((room, index) => ({ room, index }))
      .filter(({ room }) => !room.hidden)
      .map(({ room, index }) => {
        const steps = renovation.steps.filter(
          (step) => step.roomId === room.id && isVisibleStep(step),
        )
        return {
          id: room.id,
          name: room.name,
          subtitle: plural(steps.length, 'etapa', 'etapas'),
          dotColor: roomAccent(index),
          steps,
        }
      })
    return [generalLane, ...roomLanes]
  }

  const professionalLanes: Lane[] = renovation.professionals
    .filter((professional) => !professional.hidden)
    .map((professional) => ({
      id: professional.id,
      name: professional.name,
      subtitle: professional.trade,
      dotColor: professional.color,
      // Tarefas do cronograma geral aparecem uma vez por profissional,
      // não uma por cômodo.
      steps: dedupeGroups(
        renovation.steps.filter(
          (step) => step.professionalId === professional.id && isVisibleStep(step),
        ),
      ),
    }))
  const unassigned = dedupeGroups(
    renovation.steps.filter((step) => !step.professionalId && isVisibleStep(step)),
  )
  return [
    ...professionalLanes,
    {
      id: UNASSIGNED_LANE_ID,
      name: 'Sem responsável',
      subtitle: '',
      dotColor: UNASSIGNED_COLOR,
      steps: unassigned,
    },
  ]
}

function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; title: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cx(
            'px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function GridBackground({
  days,
  dayWidth,
  holidayDates,
}: {
  days: Date[]
  dayWidth: number
  holidayDates: Set<string>
}) {
  const weekends = useMemo(
    () => days.map((date, index) => (isWeekend(date) ? index : -1)).filter((index) => index >= 0),
    [days],
  )
  const holidays = useMemo(
    () =>
      days
        .map((date, index) => (holidayDates.has(toISODate(date)) ? index : -1))
        .filter((index) => index >= 0),
    [days, holidayDates],
  )
  const monthStarts = useMemo(
    () =>
      days
        .map((date, index) => (index > 0 && date.getDate() === 1 ? index : -1))
        .filter((index) => index >= 0),
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
      {holidays.map((index) => (
        <div
          key={`holiday-${index}`}
          className="absolute inset-y-0 bg-[var(--cal-holiday)]"
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
  group: CalendarGroup
  zebra: boolean
  start: Date
  totalDays: number
  dayWidth: number
  contentWidth: number
  outsideIds: Set<string>
  hoveredStepId: string | null
  colorForStep: (step: Step) => string
  onHoverStep: (step: Step, event: ReactMouseEvent<HTMLDivElement>) => void
  onHoverEnd: () => void
  onOpenStep: (step: Step) => void
  onCreateStep: (
    startISO: string,
    defaults: { professionalId: string | null; roomId: string | null; allRooms?: boolean },
  ) => void
  onMove: (stepId: string, startISO: string) => void
  onResize: (stepId: string, durationDays: number) => void
}

function ResourceRow({
  lane,
  group,
  zebra,
  start,
  totalDays,
  dayWidth,
  contentWidth,
  outsideIds,
  hoveredStepId,
  colorForStep,
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
    const index = Math.min(
      totalDays - 1,
      Math.max(0, Math.floor((event.clientX - rect.left) / dayWidth)),
    )
    if (lane.id === GENERAL_LANE_ID) {
      onCreateStep(toISODate(addDays(start, index)), {
        professionalId: null,
        roomId: null,
        allRooms: true,
      })
      return
    }
    const isUnassignedLane = lane.id === UNASSIGNED_LANE_ID
    onCreateStep(toISODate(addDays(start, index)), {
      professionalId: group === 'team' && !isUnassignedLane ? lane.id : null,
      roomId: group === 'rooms' && !isUnassignedLane ? lane.id : null,
    })
  }

  return (
    <div className="relative flex border-t border-[var(--cal-line)]" style={{ height }}>
      <div
        className="cal-sticky sticky left-0 z-20 flex items-center gap-2 border-r border-[var(--cal-line)] bg-white py-1 pr-3 pl-2.5 dark:bg-slate-900"
        style={{ width: ROW_HEADER_WIDTH, borderLeft: `4px solid ${lane.dotColor}` }}
      >
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: lane.dotColor }} />
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{lane.name}</div>
          {lane.subtitle ? (
            <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
              {lane.subtitle}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={cx(
          'relative transition-colors hover:bg-slate-500/[0.03]',
          zebra && 'bg-slate-500/[0.025] dark:bg-white/[0.02]',
        )}
        style={{ width: contentWidth }}
        onClick={handleEmptyClick}
      >
        {placements.map(({ step, sublane }) => (
          <TaskBar
            key={step.id}
            step={step}
            color={colorForStep(step)}
            top={LANE_PADDING + sublane * (BAR_HEIGHT + BAR_GAP)}
            dayWidth={dayWidth}
            start={start}
            hovered={hoveredStepId === step.id}
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
  const calendarGroup = useStore((state) => state.calendarGroup)
  const setCalendarGroup = useStore((state) => state.setCalendarGroup)
  const calendarView = useStore((state) => state.calendarView)
  const setCalendarView = useStore((state) => state.setCalendarView)
  const printing = useStore((state) => state.printing)
  const setDurationDays = useStore((state) => state.setDurationDays)
  const updateStep = useStore((state) => state.updateStep)
  const updateStepGroup = useStore((state) => state.updateStepGroup)
  const notify = useStore((state) => state.notify)

  const [hover, setHover] = useState<{ stepId: string; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<{
    step: Step | null
    defaults?: {
      startDate?: string
      professionalId?: string | null
      roomId?: string | null
      allRooms?: boolean
    }
  } | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
  const monthsRef = useRef<HTMLDivElement>(null)

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
  const lanes = useMemo(() => buildLanes(renovation, calendarGroup), [renovation, calendarGroup])
  const outsideIds = useMemo(
    () =>
      new Set(
        renovation.steps
          .filter((step) => isStepOutsideWindow(step, renovation))
          .map((step) => step.id),
      ),
    [renovation],
  )
  const holidays = useMemo(
    () => holidayMap(renovation.startDate, renovationEndISO(renovation)),
    [renovation],
  )
  const holidayDates = useMemo(() => new Set(holidays.keys()), [holidays])
  const todayIndex = useMemo(() => {
    const index = differenceInCalendarDays(new Date(), start)
    return index >= 0 && index < totalDays ? index : null
  }, [start, totalDays])

  const overflow = overflowDays(renovation.steps, renovation)

  const professionalColor = useMemo(
    () =>
      new Map(renovation.professionals.map((professional) => [professional.id, professional.color])),
    [renovation.professionals],
  )
  const colorForStep = (step: Step) =>
    (step.professionalId ? professionalColor.get(step.professionalId) : undefined) ??
    UNASSIGNED_COLOR

  // Bring "today" into view on first load (timeline view only).
  useEffect(() => {
    const container = timelineRef.current
    if (!container) return
    const index = differenceInCalendarDays(
      new Date(),
      fromISODate(useStore.getState().renovation.startDate),
    )
    container.scrollLeft =
      index >= 0
        ? Math.max(0, index * DAY_WIDTHS[useStore.getState().zoom] - container.clientWidth / 3)
        : 0
  }, [])

  const scrollToToday = () => {
    if (calendarView === 'months') {
      const todayISO = toISODate(new Date())
      const monthKey = todayISO.slice(0, 7)
      monthsRef.current
        ?.querySelector(`[data-month="${monthKey}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    const container = timelineRef.current
    if (!container || todayIndex === null) return
    container.scrollTo({
      left: Math.max(0, todayIndex * dayWidth - container.clientWidth / 3),
      behavior: 'smooth',
    })
  }

  const extendToFit = () => {
    const required = requiredDurationDays(renovation.steps, renovation.startDate)
    setDurationDays(required)
    notify('info', 'Prazo da reforma estendido.')
  }
  const moveStep = (stepId: string, startISO: string) => {
    const step = renovation.steps.find((candidate) => candidate.id === stepId)
    if (!step || step.startDate === startISO) return
    if (step.groupId) {
      updateStepGroup(step.groupId, { startDate: startISO })
      notify('info', `“${step.title}” movida para ${fmtDay(startISO)} (todos os cômodos).`)
    } else {
      updateStep(stepId, { startDate: startISO })
      notify('info', `“${step.title}” movida para ${fmtDay(startISO)}.`)
    }
  }

  const resizeStep = (stepId: string, durationDays: number) => {
    const step = renovation.steps.find((candidate) => candidate.id === stepId)
    if (!step || step.durationDays === durationDays) return
    const label = durationDays === 1 ? '1 dia' : `${durationDays} dias`
    if (step.groupId) {
      updateStepGroup(step.groupId, { durationDays })
      notify('info', `“${step.title}” agora dura ${label} em todos os cômodos.`)
    } else {
      updateStep(stepId, { durationDays })
      notify('info', `“${step.title}” agora dura ${label}.`)
    }
  }

  const hoveredStep = hover
    ? renovation.steps.find((step) => step.id === hover.stepId) ?? null
    : null
  const hoveredProfessional = hoveredStep
    ? renovation.professionals.find(
        (professional) => professional.id === hoveredStep.professionalId,
      ) ?? null
    : null
  const hoveredRoom = hoveredStep
    ? renovation.rooms.find((room) => room.id === hoveredStep.roomId) ?? null
    : null
  const hoveredAllRoomsCount = hoveredStep?.groupId
    ? renovation.steps.filter((step) => step.groupId === hoveredStep.groupId).length
    : null

  const zoomIndex = ZOOM_ORDER.indexOf(zoom)
  const hiddenRoomCount = renovation.rooms.filter((room) => room.hidden).length
  const hiddenProfessionalCount = renovation.professionals.filter(
    (professional) => professional.hidden,
  ).length

  return (
    <section className="flex min-h-0 flex-1 flex-col px-2 pb-2 sm:px-4 sm:pb-4">
      {overflow > 0 && !printing ? (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlert size={14} className="shrink-0" />
          <span>
            As etapas ultrapassam o prazo da reforma em {overflow} {overflow === 1 ? 'dia' : 'dias'}.
          </span>
          <Button size="sm" variant="secondary" className="ml-auto" onClick={extendToFit}>
            Estender prazo da reforma
          </Button>
        </div>
      ) : null}

      {!printing ? (
        <div className="no-print flex flex-wrap items-center gap-2 pt-3 pb-3">
          <SegmentedToggle
            options={[
              { value: 'months', label: 'Calendário', title: 'Visão de calendário (meses)' },
              { value: 'timeline', label: 'Linha do tempo', title: 'Visão de linha do tempo' },
            ]}
            value={calendarView}
            onChange={setCalendarView}
          />
          <SegmentedToggle
            options={[
              { value: 'rooms', label: 'Cômodos', title: 'Uma faixa por cômodo' },
              { value: 'team', label: 'Equipe', title: 'Uma faixa por profissional' },
            ]}
            value={calendarGroup}
            onChange={setCalendarGroup}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {plural(renovation.steps.length, 'etapa', 'etapas')} ·{' '}
            {plural(renovation.rooms.length, 'cômodo', 'cômodos')}
            {hiddenRoomCount > 0
              ? ` (${hiddenRoomCount} ${hiddenRoomCount === 1 ? 'oculto' : 'ocultos'})`
              : ''}{' '}
            · {plural(renovation.professionals.length, 'profissional', 'profissionais')}
            {hiddenProfessionalCount > 0
              ? ` (${hiddenProfessionalCount} ${hiddenProfessionalCount === 1 ? 'oculto' : 'ocultos'})`
              : ''}{' '}
            · {plural(renovation.durationDays, 'dia', 'dias')}
          </p>
          <div className="ml-auto flex items-center gap-1">
            {calendarView === 'timeline' ? (
              <>
                <IconButton
                  label="Diminuir zoom"
                  disabled={zoomIndex === 0}
                  onClick={() => setZoom(ZOOM_ORDER[zoomIndex - 1])}
                >
                  <ZoomOut size={15} />
                </IconButton>
                <IconButton
                  label="Aumentar zoom"
                  disabled={zoomIndex === ZOOM_ORDER.length - 1}
                  onClick={() => setZoom(ZOOM_ORDER[zoomIndex + 1])}
                >
                  <ZoomIn size={15} />
                </IconButton>
              </>
            ) : null}
            <Button size="sm" className="ml-1" disabled={todayIndex === null} onClick={scrollToToday}>
              <CalendarDays size={13} /> Hoje
            </Button>
          </div>
        </div>
      ) : null}

      <div className="calendar-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {calendarView === 'months' ? (
          <MonthsCalendar
            lanes={lanes}
            group={calendarGroup}
            rangeStartISO={renovation.startDate}
            rangeEndISO={renovationEndISO(renovation)}
            holidays={holidays}
            colorForStep={colorForStep}
            outsideIds={outsideIds}
            hoveredStepId={hover?.stepId ?? null}
            scrollRef={monthsRef}
            onHoverStep={(step, event) =>
              setHover({ stepId: step.id, x: event.clientX, y: event.clientY })
            }
            onHoverEnd={() => setHover(null)}
            onOpenStep={(step) => {
              setHover(null)
              setEditing({ step })
            }}
            onCreateStep={(startISO, defaults) => {
              setHover(null)
              setEditing({ step: null, defaults: { startDate: startISO, ...defaults } })
            }}
            onMove={moveStep}
            onResize={resizeStep}
          />
        ) : (
          <div
            ref={timelineRef}
            className="calendar-scroll thin-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain"
          >
            <div className="relative" style={{ width: ROW_HEADER_WIDTH + contentWidth }}>
              <TimeHeader
                days={days}
                dayWidth={dayWidth}
                todayIndex={todayIndex}
                holidays={holidays}
              />
              <div className="relative">
                <GridBackground days={days} dayWidth={dayWidth} holidayDates={holidayDates} />
                {lanes.map((lane, index) => (
                  <ResourceRow
                    key={lane.id}
                    lane={lane}
                    group={calendarGroup}
                    zebra={index % 2 === 1}
                    start={start}
                    totalDays={totalDays}
                    dayWidth={dayWidth}
                    contentWidth={contentWidth}
                    outsideIds={outsideIds}
                    hoveredStepId={hover?.stepId ?? null}
                    colorForStep={colorForStep}
                    onHoverStep={(step, event) =>
                      setHover({ stepId: step.id, x: event.clientX, y: event.clientY })
                    }
                    onHoverEnd={() => setHover(null)}
                    onOpenStep={(step) => {
                      setHover(null)
                      setEditing({ step })
                    }}
                    onCreateStep={(startISO, defaults) => {
                      setHover(null)
                      setEditing({ step: null, defaults: { startDate: startISO, ...defaults } })
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
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 z-[14]"
                  style={{ left: dayWidth / 2 - 1 }}
                >
                  <div className="h-full w-[2px] bg-emerald-500/50" />
                </div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 z-[14]"
                  style={{ left: (totalDays - 1) * dayWidth + dayWidth / 2 - 1 }}
                >
                  <div className="h-full w-[2px] bg-indigo-500/50" />
                </div>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {hoveredStep && !printing ? (
            <TaskTooltip
              key={hoveredStep.id}
              step={hoveredStep}
              professional={hoveredProfessional}
              room={hoveredRoom}
              allRoomsCount={hoveredAllRoomsCount}
              anchor={{ x: hover?.x ?? 0, y: hover?.y ?? 0 }}
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
