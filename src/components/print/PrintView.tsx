import { useMemo } from 'react'
import { eachMonthOfInterval, format, isWeekend } from 'date-fns'
import { WEEKDAY_LABELS, buildWeekSegments, monthWeeks } from '../../lib/calendarGrid'
import { fmtMonthYear, fmtNumeric, plural } from '../../lib/format'
import { holidayMap } from '../../lib/holidays'
import { contrastText } from '../../lib/palette'
import { fromISODate, renovationEnd, stepEndISO, toISODate } from '../../lib/scheduling'
import { STATUS_LABELS } from '../../lib/status'
import { useStore } from '../../state/store'
import { roomAccent } from '../calendar/constants'
import type { Step } from '../../types'

const CELL_W = 42
const BAR_HEIGHT = 13
const BAR_GAP = 2
const DAY_NUMBER_HEIGHT = 15

const professionalColors = (professionals: { id: string; color: string }[]) => {
  const byId = new Map(professionals.map((professional) => [professional.id, professional.color]))
  return (step: Step) =>
    (step.professionalId ? byId.get(step.professionalId) : undefined) ?? '#94a3b8'
}

/**
 * Dedicated print output: a summary page (project header + full task table)
 * followed by one A4 landscape page per room with its monthly grids.
 */
export function PrintView() {
  const renovation = useStore((state) => state.renovation)

  const hiddenRoomIds = useMemo(
    () => new Set(renovation.rooms.filter((room) => room.hidden).map((room) => room.id)),
    [renovation.rooms],
  )
  const hiddenProfessionalIds = useMemo(
    () =>
      new Set(
        renovation.professionals
          .filter((professional) => professional.hidden)
          .map((professional) => professional.id),
      ),
    [renovation.professionals],
  )
  const hiddenProfessionals = useMemo(
    () => renovation.professionals.filter((professional) => professional.hidden),
    [renovation.professionals],
  )
  const isVisibleStep = (step: Step) =>
    !(step.roomId && hiddenRoomIds.has(step.roomId)) &&
    !(step.professionalId && hiddenProfessionalIds.has(step.professionalId))
  const visibleRooms = useMemo(
    () => renovation.rooms.filter((room) => !room.hidden),
    [renovation.rooms],
  )
  const roomsById = useMemo(
    () => new Map(renovation.rooms.map((room) => [room.id, room])),
    [renovation.rooms],
  )
  const professionalsById = useMemo(
    () => new Map(renovation.professionals.map((professional) => [professional.id, professional])),
    [renovation.professionals],
  )
  const colorForStep = useMemo(
    () => professionalColors(renovation.professionals),
    [renovation.professionals],
  )

  const holidays = useMemo(
    () => holidayMap(renovation.startDate, toISODate(renovationEnd(renovation))),
    [renovation],
  )
  const todayISO = toISODate(new Date())
  const rangeStartISO = renovation.startDate
  const rangeEndISO = toISODate(renovationEnd(renovation))

  const months = useMemo(
    () =>
      eachMonthOfInterval({
        start: fromISODate(rangeStartISO),
        end: fromISODate(rangeEndISO),
      }),
    [rangeStartISO, rangeEndISO],
  )

  // Summary table: visible steps only, with one row per linked general task.
  const tableSteps = useMemo(() => {
    const seenGroups = new Set<string>()
    return renovation.steps
      .filter(isVisibleStep)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title))
      .filter((step) => {
        if (!step.groupId) return true
        if (seenGroups.has(step.groupId)) return false
        seenGroups.add(step.groupId)
        return true
      })
  }, [renovation.steps, hiddenRoomIds, hiddenProfessionalIds])

  const groupSizes = useMemo(() => {
    const sizes = new Map<string, number>()
    for (const step of renovation.steps) {
      if (step.groupId) sizes.set(step.groupId, (sizes.get(step.groupId) ?? 0) + 1)
    }
    return sizes
  }, [renovation.steps])

  const roomLabel = (step: Step) => {
    if (step.groupId) return `Todos os cômodos (${groupSizes.get(step.groupId) ?? 1})`
    const room = step.roomId ? roomsById.get(step.roomId) : undefined
    return room ? room.name : '—'
  }

  return (
    <div className="print-root min-h-screen bg-white text-slate-900">
      {/* Página 1: resumo do projeto */}
      <section className="print-page p-6">
        <h1 className="text-2xl font-bold">{renovation.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {fmtNumeric(renovation.startDate)} → {fmtNumeric(rangeEndISO)} ·{' '}
          {plural(renovation.durationDays, 'dia', 'dias')} ·{' '}
          {plural(renovation.steps.length, 'etapa', 'etapas')} ·{' '}
          {plural(renovation.rooms.length, 'cômodo', 'cômodos')} ·{' '}
          {plural(renovation.professionals.length, 'profissional', 'profissionais')}
        </p>
        {hiddenProfessionals.length > 0 ? (
          <p className="mt-1 text-xs text-slate-400">
            Equipes ocultas (não aparecem nesta impressão):{' '}
            {hiddenProfessionals.map((professional) => professional.name).join(', ')}.
          </p>
        ) : null}

        {tableSteps.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">Nenhuma etapa cadastrada.</p>
        ) : (
          <table className="print-table mt-6 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-300 px-2 py-1.5 font-semibold">Etapa</th>
                <th className="border border-slate-300 px-2 py-1.5 font-semibold">Cômodo</th>
                <th className="border border-slate-300 px-2 py-1.5 font-semibold">Profissional</th>
                <th className="border border-slate-300 px-2 py-1.5 font-semibold">Início</th>
                <th className="border border-slate-300 px-2 py-1.5 font-semibold">Fim</th>
                <th className="border border-slate-300 px-2 py-1.5 font-semibold">Dias</th>
                <th className="border border-slate-300 px-2 py-1.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableSteps.map((step) => {
                const professional = step.professionalId
                  ? professionalsById.get(step.professionalId)
                  : undefined
                return (
                  <tr key={step.id}>
                    <td className="border border-slate-300 px-2 py-1 font-medium">{step.title}</td>
                    <td className="border border-slate-300 px-2 py-1">{roomLabel(step)}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      {professional ? professional.name : '—'}
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      {fmtNumeric(step.startDate)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      {fmtNumeric(stepEndISO(step))}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right">
                      {step.durationDays}
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      {STATUS_LABELS[step.status]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Uma página por cômodo */}
      {visibleRooms.map((room) => {
        const roomIndex = renovation.rooms.indexOf(room)
        const steps = renovation.steps.filter(
          (step) => step.roomId === room.id && isVisibleStep(step),
        )
        return (
          <section key={room.id} className="print-page p-6">
            <div className="flex items-center gap-3">
              <span
                className="size-3.5 shrink-0 rounded-full"
                style={{ background: roomAccent(roomIndex) }}
              />
              <h2 className="text-xl font-bold">{room.name}</h2>
              <span className="text-sm text-slate-500">
                {plural(steps.length, 'etapa', 'etapas')}
              </span>
            </div>

            {steps.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">Nenhuma etapa neste cômodo.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {months.map((month) => (
                  <PrintMonth
                    key={format(month, 'yyyy-MM')}
                    month={month}
                    steps={steps}
                    holidays={holidays}
                    todayISO={todayISO}
                    rangeStartISO={rangeStartISO}
                    rangeEndISO={rangeEndISO}
                    colorForStep={colorForStep}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

interface PrintMonthProps {
  month: Date
  steps: Step[]
  holidays: Map<string, string>
  todayISO: string
  rangeStartISO: string
  rangeEndISO: string
  colorForStep: (step: Step) => string
}

function PrintMonth({
  month,
  steps,
  holidays,
  todayISO,
  rangeStartISO,
  rangeEndISO,
  colorForStep,
}: PrintMonthProps) {
  return (
    <div
      className="print-month overflow-hidden rounded-md border border-slate-300"
      style={{ width: 7 * CELL_W + 2 }}
    >
      <div className="border-b border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold capitalize">
        {fmtMonthYear(month)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(7, ${CELL_W}px)` }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-b border-slate-200 py-0.5 text-center text-[7px] font-medium tracking-wide text-slate-400 uppercase"
          >
            {label}
          </div>
        ))}
      </div>
      {monthWeeks(month).map((week) => (
        <PrintWeek
          key={toISODate(week[0])}
          week={week}
          month={month}
          steps={steps}
          holidays={holidays}
          todayISO={todayISO}
          rangeStartISO={rangeStartISO}
          rangeEndISO={rangeEndISO}
          colorForStep={colorForStep}
        />
      ))}
    </div>
  )
}

interface PrintWeekProps extends PrintMonthProps {
  week: Date[]
}

function PrintWeek({
  week,
  month,
  steps,
  holidays,
  todayISO,
  rangeStartISO,
  rangeEndISO,
  colorForStep,
}: PrintWeekProps) {
  const segments = useMemo(() => buildWeekSegments(steps, week), [steps, week])
  const subrows = segments.length > 0 ? segments[0].subrows : 0
  const height = Math.max(24, DAY_NUMBER_HEIGHT + 3 + subrows * (BAR_HEIGHT + BAR_GAP))

  return (
    <div className="relative border-t border-slate-200" style={{ height }}>
      <div className="grid h-full" style={{ gridTemplateColumns: `repeat(7, ${CELL_W}px)` }}>
        {week.map((date) => {
          const iso = toISODate(date)
          const holiday = holidays.get(iso)
          const inMonth = date.getMonth() === month.getMonth()
          const inRange = iso >= rangeStartISO && iso <= rangeEndISO
          const isToday = iso === todayISO
          const isStart = iso === rangeStartISO
          const isEnd = iso === rangeEndISO
          return (
            <div
              key={iso}
              className={[
                'relative border-l border-slate-100 px-1 pt-0.5 first:border-l-0',
                isStart
                  ? 'bg-emerald-500/10'
                  : isEnd
                    ? 'bg-indigo-500/10'
                    : holiday
                      ? 'bg-rose-500/10'
                      : isWeekend(date)
                        ? 'bg-slate-100'
                        : '',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-flex size-3.5 items-center justify-center text-[8px] leading-none',
                  isToday
                    ? 'rounded-full bg-rose-500 font-semibold text-white'
                    : isStart
                      ? 'rounded-full bg-emerald-500 font-semibold text-white'
                      : isEnd
                        ? 'rounded-full bg-indigo-500 font-semibold text-white'
                        : holiday
                          ? 'font-medium text-rose-600'
                          : inMonth
                            ? inRange
                              ? 'font-medium text-slate-700'
                              : 'font-medium text-slate-400'
                            : 'text-slate-300',
                ].join(' ')}
              >
                {format(date, 'd')}
              </span>
              {holiday && inMonth ? (
                <div className="mt-px truncate text-[6px] leading-tight font-medium text-rose-600/90">
                  {holiday}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      {segments.map((segment) => {
        const color = colorForStep(segment.step)
        return (
          <div
            key={`${segment.step.id}-${segment.startIdx}`}
            className={[
              'absolute overflow-hidden px-1 text-[7px] leading-[13px] font-medium whitespace-nowrap',
              segment.continuesLeft ? 'rounded-l-none' : 'rounded-l-sm',
              segment.continuesRight ? 'rounded-r-none' : 'rounded-r-sm',
            ].join(' ')}
            style={{
              left: segment.startIdx * CELL_W + 1,
              width: (segment.endIdx - segment.startIdx + 1) * CELL_W - 2,
              top: DAY_NUMBER_HEIGHT + 3 + segment.sub * (BAR_HEIGHT + BAR_GAP),
              height: BAR_HEIGHT,
              background: color,
              color: contrastText(color),
            }}
          >
            {segment.step.title}
          </div>
        )
      })}
    </div>
  )
}
