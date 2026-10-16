import { useMemo } from 'react'
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { addDays, eachMonthOfInterval, format, isWeekend } from 'date-fns'
import { Check, DoorOpen, Home } from 'lucide-react'
import { WEEKDAY_LABELS, buildWeekSegments, monthWeeks } from '../../lib/calendarGrid'
import { cx } from '../../lib/cx'
import { durationLabel, fmtDay, fmtMonthYear, plural } from '../../lib/format'
import { contrastText } from '../../lib/palette'
import { fromISODate, toISODate } from '../../lib/scheduling'
import type { CalendarGroup, Step } from '../../types'
import { GENERAL_LANE_ID, UNASSIGNED_LANE_ID } from './constants'
import type { Lane } from './constants'
import { useBarDrag } from './useBarDrag'

const CELL_W = 46
const SEGMENT_HEIGHT = 22
const SEGMENT_GAP = 3
const DAY_NUMBER_HEIGHT = 20

interface SegmentProps {
  step: Step
  color: string
  left: number
  width: number
  top: number
  rowWidth: number
  hovered: boolean
  outside: boolean
  continuesLeft: boolean
  continuesRight: boolean
  onHover: (step: Step, event: ReactMouseEvent<HTMLDivElement>) => void
  onHoverEnd: () => void
  onOpen: (step: Step) => void
  onMove: (stepId: string, startISO: string) => void
  onResize: (stepId: string, durationDays: number) => void
}

function MonthSegmentBar({
  step,
  color,
  left,
  width,
  top,
  rowWidth,
  hovered,
  outside,
  continuesLeft,
  continuesRight,
  onHover,
  onHoverEnd,
  onOpen,
  onMove,
  onResize,
}: SegmentProps) {
  const { drag, movedRef, begin, handlePointerMove, commit, cancel, handleKeyDown } = useBarDrag({
    step,
    dayWidth: CELL_W,
    canResize: !continuesRight,
    onMove,
    onResize,
    onOpen,
    onHoverEnd,
  })

  const delta = drag?.deltaDays ?? 0
  const leftNow =
    drag?.kind === 'move'
      ? Math.max(0, Math.min(left + delta * CELL_W, rowWidth - width))
      : left
  const widthNow =
    drag?.kind === 'resize'
      ? Math.max(CELL_W, Math.min(width + delta * CELL_W, rowWidth - left))
      : width

  const previewStartISO = toISODate(
    addDays(fromISODate(step.startDate), drag?.kind === 'move' ? delta : 0),
  )
  const previewDuration =
    drag?.kind === 'resize' ? Math.max(1, step.durationDays + delta) : step.durationDays
  const previewEndISO = toISODate(addDays(fromISODate(previewStartISO), previewDuration - 1))

  return (
    <>
      {drag && movedRef.current ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-md border-2 border-dashed border-[var(--cal-ghost)]"
          style={{ left, width, top, height: SEGMENT_HEIGHT }}
        />
      ) : null}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${step.title}, ${fmtDay(step.startDate)} por ${durationLabel(step.durationDays)}`}
        onPointerDown={begin('move')}
        onPointerMove={handlePointerMove}
        onPointerUp={commit}
        onPointerCancel={cancel}
        onKeyDown={handleKeyDown}
        onClick={(event) => {
          event.stopPropagation()
          if (!movedRef.current) onOpen(step)
        }}
        onMouseEnter={(event) => onHover(step, event)}
        onMouseMove={(event) => onHover(step, event)}
        onMouseLeave={onHoverEnd}
        className={cx(
          'group absolute z-10 flex touch-none items-center gap-1 px-1.5 text-[10px] font-medium shadow-sm outline-none select-none',
          continuesLeft ? 'rounded-l-none' : 'rounded-l-md',
          continuesRight ? 'rounded-r-none' : 'rounded-r-md',
          drag
            ? 'z-20 cursor-grabbing transition-none'
            : 'cursor-grab transition-[left,width,box-shadow] duration-200 ease-out',
          hovered && !drag ? 'z-20 shadow-md brightness-105' : '',
          step.status === 'done' ? 'opacity-60' : '',
          outside ? 'outline-2 -outline-offset-2 outline-rose-400' : '',
        )}
        style={{
          left: leftNow,
          width: widthNow,
          top,
          height: SEGMENT_HEIGHT,
          background: color,
          color: contrastText(color),
        }}
      >
        {step.status === 'in_progress' ? (
          <span
            aria-hidden
            className={cx(
              'bar-stripes pointer-events-none absolute inset-0',
              continuesLeft ? 'rounded-l-none' : 'rounded-l-md',
              continuesRight ? 'rounded-r-none' : 'rounded-r-md',
            )}
          />
        ) : null}
        <span className="pointer-events-none relative flex min-w-0 items-center gap-1">
          {step.status === 'done' ? <Check size={11} className="shrink-0" /> : null}
          {widthNow > 64 ? <span className="truncate">{step.title}</span> : null}
        </span>
        {drag ? (
          <span className="cal-badge pointer-events-none absolute -top-7 left-0 z-30 rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
            {drag.kind === 'move'
              ? fmtDay(previewStartISO)
              : `${durationLabel(previewDuration)} · termina ${fmtDay(previewEndISO)}`}
          </span>
        ) : null}
        {!continuesRight ? (
          <span
            aria-hidden
            onPointerDown={begin('resize')}
            className="bar-resize-handle absolute top-0 right-0 flex h-full w-2 cursor-ew-resize items-center justify-center rounded-r-md opacity-0 transition-opacity group-hover:opacity-100"
          >
            <span className="h-2.5 w-0.5 rounded-full bg-white/70" />
          </span>
        ) : null}
      </div>
    </>
  )
}

interface WeekRowProps {
  week: Date[]
  month: Date
  laneId: string
  group: CalendarGroup
  steps: Step[]
  holidays: Map<string, string>
  todayISO: string
  rangeStartISO: string
  rangeEndISO: string
  colorForStep: (step: Step) => string
  outsideIds: Set<string>
  hoveredStepId: string | null
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

function WeekRow({
  week,
  month,
  laneId,
  group,
  steps,
  holidays,
  todayISO,
  rangeStartISO,
  rangeEndISO,
  colorForStep,
  outsideIds,
  hoveredStepId,
  onHoverStep,
  onHoverEnd,
  onOpenStep,
  onCreateStep,
  onMove,
  onResize,
}: WeekRowProps) {
  const segments = useMemo(() => buildWeekSegments(steps, week), [steps, week])
  const subrows = segments.length > 0 ? segments[0].subrows : 0
  const height = Math.max(32, DAY_NUMBER_HEIGHT + 6 + subrows * (SEGMENT_HEIGHT + SEGMENT_GAP))
  const rowWidth = 7 * CELL_W

  const handleCellClick = (iso: string) => {
    if (laneId === GENERAL_LANE_ID) {
      onCreateStep(iso, { professionalId: null, roomId: null, allRooms: true })
      return
    }
    const isUnassignedLane = laneId === UNASSIGNED_LANE_ID
    onCreateStep(iso, {
      professionalId: group === 'team' && !isUnassignedLane ? laneId : null,
      roomId: group === 'rooms' && !isUnassignedLane ? laneId : null,
    })
  }

  return (
    <div className="relative border-t border-[var(--cal-line)]" style={{ height }}>
      <div className="grid h-full" style={{ gridTemplateColumns: `repeat(7, ${CELL_W}px)` }}>
        {week.map((date) => {
          const iso = toISODate(date)
          const holiday = holidays.get(iso)
          const inMonth = date.getMonth() === month.getMonth()
          const inRange = iso >= rangeStartISO && iso <= rangeEndISO
          const isToday = iso === todayISO
          const isStart = iso === rangeStartISO
          const isEnd = iso === rangeEndISO
          const title = [
            holiday,
            isStart ? 'Início da reforma' : null,
            isEnd ? 'Término da reforma' : null,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <div
              key={iso}
              title={title || undefined}
              onClick={inMonth ? () => handleCellClick(iso) : undefined}
              className={cx(
                'relative border-l border-[var(--cal-line)] px-1 pt-1 first:border-l-0',
                isStart
                  ? 'bg-emerald-500/[0.08]'
                  : isEnd
                    ? 'bg-indigo-500/[0.08]'
                    : holiday
                      ? 'bg-[var(--cal-holiday)]'
                      : isWeekend(date)
                        ? 'bg-[var(--cal-weekend)]'
                        : '',
                inMonth ? 'cursor-pointer' : '',
              )}
            >
              <span
                className={cx(
                  'inline-flex items-center justify-center text-[10px] leading-none',
                  isToday
                    ? 'size-4 rounded-full bg-rose-500 font-semibold text-white'
                    : isStart
                      ? 'size-4 rounded-full bg-emerald-500 font-semibold text-white'
                      : isEnd
                        ? 'size-4 rounded-full bg-indigo-500 font-semibold text-white'
                        : holiday
                          ? 'font-medium text-rose-600 dark:text-rose-400'
                          : inMonth
                            ? cx('font-medium text-slate-600 dark:text-slate-300', !inRange && 'opacity-50')
                            : 'text-slate-300 dark:text-slate-600',
                )}
              >
                {format(date, 'd')}
              </span>
              {holiday && inMonth ? (
                <div className="mt-0.5 truncate text-[8px] leading-tight font-medium text-rose-600/90 dark:text-rose-400/90">
                  {holiday}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      {segments.map((segment) => (
        <MonthSegmentBar
          key={`${segment.step.id}-${segment.startIdx}`}
          step={segment.step}
          color={colorForStep(segment.step)}
          left={segment.startIdx * CELL_W + 2}
          width={(segment.endIdx - segment.startIdx + 1) * CELL_W - 4}
          top={DAY_NUMBER_HEIGHT + 6 + segment.sub * (SEGMENT_HEIGHT + SEGMENT_GAP)}
          rowWidth={rowWidth}
          hovered={hoveredStepId === segment.step.id}
          outside={outsideIds.has(segment.step.id)}
          continuesLeft={segment.continuesLeft}
          continuesRight={segment.continuesRight}
          onHover={onHoverStep}
          onHoverEnd={onHoverEnd}
          onOpen={onOpenStep}
          onMove={onMove}
          onResize={onResize}
        />
      ))}
    </div>
  )
}

interface MonthsCalendarProps {
  lanes: Lane[]
  group: CalendarGroup
  rangeStartISO: string
  rangeEndISO: string
  holidays: Map<string, string>
  colorForStep: (step: Step) => string
  outsideIds: Set<string>
  hoveredStepId: string | null
  scrollRef: RefObject<HTMLDivElement | null>
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

/** One month grid per lane: 7 columns and one row per week. */
export function MonthsCalendar({
  lanes,
  group,
  rangeStartISO,
  rangeEndISO,
  holidays,
  colorForStep,
  outsideIds,
  hoveredStepId,
  scrollRef,
  onHoverStep,
  onHoverEnd,
  onOpenStep,
  onCreateStep,
  onMove,
  onResize,
}: MonthsCalendarProps) {
  const todayISO = toISODate(new Date())
  const months = useMemo(
    () =>
      eachMonthOfInterval({
        start: fromISODate(rangeStartISO),
        end: fromISODate(rangeEndISO),
      }),
    [rangeStartISO, rangeEndISO],
  )

  return (
    <div
      ref={scrollRef}
      className="calendar-scroll thin-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain"
    >
      <div className="space-y-4 p-3 sm:space-y-6 sm:p-4">
        {lanes.map((lane) => (
          <section
            key={lane.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            style={{ borderLeft: `5px solid ${lane.dotColor}` }}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cal-line)] bg-slate-50/80 px-3 py-2 dark:bg-slate-800/40">
              {group === 'rooms' ? (
                lane.general ? (
                  <Home size={15} className="shrink-0" style={{ color: lane.dotColor }} />
                ) : (
                  <DoorOpen size={15} className="shrink-0" style={{ color: lane.dotColor }} />
                )
              ) : (
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: lane.dotColor }}
                />
              )}
              <h3 className="text-sm font-semibold">{lane.name}</h3>
              {group === 'team' && lane.subtitle ? (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lane.subtitle}
                </span>
              ) : null}
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {plural(lane.steps.length, 'etapa', 'etapas')}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 overflow-x-auto bg-slate-50/60 p-2 sm:p-3 dark:bg-slate-950/30">
              {months.map((month) => (
                <div
                  key={`${lane.id}-${format(month, 'yyyy-MM')}`}
                  data-month={format(month, 'yyyy-MM')}
                  className="w-fit overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="border-b border-[var(--cal-line)] px-3 py-1.5 text-xs font-semibold capitalize">
                    {fmtMonthYear(month)}
                  </div>
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(7, ${CELL_W}px)` }}
                  >
                    {WEEKDAY_LABELS.map((label) => (
                      <div
                        key={label}
                        className="border-l border-[var(--cal-line)] py-1 text-center text-[9px] font-medium tracking-wide text-slate-400 uppercase first:border-l-0 dark:text-slate-500"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  {monthWeeks(month).map((week) => (
                    <WeekRow
                      key={toISODate(week[0])}
                      week={week}
                      month={month}
                      laneId={lane.id}
                      group={group}
                      steps={lane.steps}
                      holidays={holidays}
                      todayISO={todayISO}
                      rangeStartISO={rangeStartISO}
                      rangeEndISO={rangeEndISO}
                      colorForStep={colorForStep}
                      outsideIds={outsideIds}
                      hoveredStepId={hoveredStepId}
                      onHoverStep={onHoverStep}
                      onHoverEnd={onHoverEnd}
                      onOpenStep={onOpenStep}
                      onCreateStep={onCreateStep}
                      onMove={onMove}
                      onResize={onResize}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
