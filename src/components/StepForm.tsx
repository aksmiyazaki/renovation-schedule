import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { addDays } from 'date-fns'
import { Home, Trash2, TriangleAlert } from 'lucide-react'
import { cx } from '../lib/cx'
import { durationLabel, fmtDay, plural } from '../lib/format'
import {
  fromISODate,
  renovationEndISO,
  requiredDurationDays,
  suggestNextStart,
  toISODate,
} from '../lib/scheduling'
import { STATUS_LABELS } from '../lib/status'
import { useStore } from '../state/store'
import type { Step, StepStatus } from '../types'
import { ConfirmDialog, Modal } from './ui/Modal'
import { Button, Field, Input, Select, Textarea } from './ui/controls'

const STATUSES: StepStatus[] = ['todo', 'in_progress', 'done']

interface FormState {
  title: string
  professionalId: string | null
  roomId: string | null
  startDate: string
  durationDays: number
  status: StepStatus
  notes: string
}

interface StepFormProps {
  open: boolean
  step: Step | null
  defaults?: {
    startDate?: string
    professionalId?: string | null
    roomId?: string | null
    allRooms?: boolean
  }
  onClose: () => void
}

export function StepForm({ open, step, defaults, onClose }: StepFormProps) {
  const renovation = useStore((state) => state.renovation)
  const addStep = useStore((state) => state.addStep)
  const addStepCopies = useStore((state) => state.addStepCopies)
  const updateStep = useStore((state) => state.updateStep)
  const updateStepGroup = useStore((state) => state.updateStepGroup)
  const removeStep = useStore((state) => state.removeStep)
  const removeStepGroup = useStore((state) => state.removeStepGroup)
  const setDurationDays = useStore((state) => state.setDurationDays)
  const notify = useStore((state) => state.notify)

  const allRoomsMode = !step && defaults?.allRooms === true
  const groupedMode = Boolean(step?.groupId)
  const groupSize = step?.groupId
    ? renovation.steps.filter((candidate) => candidate.groupId === step.groupId).length
    : 0

  const [form, setForm] = useState<FormState>({
    title: '',
    professionalId: null,
    roomId: null,
    startDate: renovation.startDate,
    durationDays: 3,
    status: 'todo',
    notes: '',
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    if (step) {
      setForm({
        title: step.title,
        professionalId: step.professionalId,
        roomId: step.roomId,
        startDate: step.startDate,
        durationDays: step.durationDays,
        status: step.status,
        notes: step.notes ?? '',
      })
      return
    }
    const current = useStore.getState().renovation
    setForm({
      title: '',
      professionalId: defaults?.professionalId ?? null,
      roomId: defaults?.allRooms ? null : defaults?.roomId ?? current.rooms[0]?.id ?? null,
      startDate: defaults?.startDate ?? suggestNextStart(current.steps, current.startDate),
      durationDays: 3,
      status: 'todo',
      notes: '',
    })
  }, [open, step, defaults])

  const endISO = toISODate(
    addDays(fromISODate(form.startDate), Math.max(0, form.durationDays - 1)),
  )
  const outside =
    form.startDate < renovation.startDate || endISO > renovationEndISO(renovation)
  const canSubmit =
    form.title.trim().length > 0 &&
    form.durationDays >= 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.startDate) &&
    (allRoomsMode || groupedMode || renovation.rooms.length === 0 || form.roomId !== null)

  const extendToFit = () => {
    const candidate: Step = {
      id: '__draft',
      title: form.title || 'Rascunho',
      professionalId: form.professionalId,
      roomId: form.roomId,
      startDate: form.startDate,
      durationDays: form.durationDays,
      status: form.status,
    }
    const steps = [...renovation.steps.filter((existing) => existing.id !== step?.id), candidate]
    const required = requiredDurationDays(steps, renovation.startDate)
    setDurationDays(required)
    notify('info', 'Prazo da reforma estendido.')
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    const base = {
      title: form.title.trim(),
      professionalId: form.professionalId,
      startDate: form.startDate,
      durationDays: form.durationDays,
      status: form.status,
      notes: form.notes.trim() || undefined,
    }
    if (allRoomsMode) {
      addStepCopies(
        base,
        renovation.rooms.map((room) => room.id),
      )
      notify(
        'success',
        renovation.rooms.length === 0
          ? 'Etapa adicionada ao cronograma geral.'
          : `Etapa adicionada em ${plural(renovation.rooms.length, 'cômodo', 'cômodos')}.`,
      )
    } else if (step?.groupId) {
      updateStepGroup(step.groupId, { ...base, roomId: form.roomId })
      notify('info', 'Etapa atualizada em todos os cômodos.')
    } else if (step) {
      updateStep(step.id, { ...base, roomId: form.roomId })
    } else {
      addStep({ ...base, roomId: form.roomId })
      notify('success', 'Etapa adicionada.')
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={step ? 'Editar etapa' : 'Nova etapa'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Título" htmlFor="step-title">
          <Input
            id="step-title"
            autoFocus
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="ex.: Azulejar o piso da cozinha"
          />
        </Field>

        {allRoomsMode || groupedMode ? (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-50/70 px-3 py-2 text-xs leading-relaxed text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Home size={13} className="mt-0.5 shrink-0" />
            <span>
              {groupedMode
                ? `Esta etapa está vinculada a todos os cômodos${
                    renovation.rooms.length > 0
                      ? ` (${renovation.rooms.map((room) => room.name).join(', ')})`
                      : ''
                  } — as alterações valem para todos.`
                : renovation.rooms.length > 0
                  ? `Esta etapa será criada em todos os cômodos: ${renovation.rooms
                      .map((room) => room.name)
                      .join(', ')}.`
                  : 'Nenhum cômodo cadastrado — a etapa ficará apenas no cronograma geral.'}
            </span>
          </div>
        ) : null}

        <div className={cx('grid gap-3', !allRoomsMode && !groupedMode && 'grid-cols-2')}>
          {!allRoomsMode && !groupedMode ? (
            <Field label="Cômodo" htmlFor="step-room">
              <Select
                id="step-room"
                value={form.roomId ?? ''}
                onChange={(event) => setForm({ ...form, roomId: event.target.value || null })}
              >
                {renovation.rooms.length === 0 ? (
                  <option value="">Nenhum cômodo cadastrado</option>
                ) : null}
                {renovation.rooms.length > 0 && form.roomId === null ? (
                  <option value="" disabled>
                    Selecione um cômodo
                  </option>
                ) : null}
                {renovation.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                    {room.hidden ? ' (oculto)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="Profissional" htmlFor="step-professional">
            <Select
              id="step-professional"
              value={form.professionalId ?? ''}
              onChange={(event) => setForm({ ...form, professionalId: event.target.value || null })}
            >
              <option value="">Sem responsável</option>
              {renovation.professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                  {professional.trade ? ` — ${professional.trade}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de início" htmlFor="step-start">
            <Input
              id="step-start"
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
          </Field>
          <Field label="Duração (dias)" htmlFor="step-duration">
            <Input
              id="step-duration"
              type="number"
              min={1}
              value={form.durationDays}
              onChange={(event) => {
                const next = parseInt(event.target.value, 10)
                setForm({ ...form, durationDays: Number.isFinite(next) ? next : 1 })
              }}
            />
            <div className="mt-1.5 flex gap-1">
              {[1, 3, 7, 14].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setForm({ ...form, durationDays: days })}
                  className={cx(
                    'rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                    form.durationDays === days
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                  )}
                >
                  {days}d
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <p>
            Termina em{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">{fmtDay(endISO)}</span>{' '}
            · {durationLabel(Math.max(1, form.durationDays))}
          </p>
          {outside ? (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-rose-600 dark:text-rose-400">
              <TriangleAlert size={12} className="shrink-0" />
              Fora do prazo da reforma (termina em {fmtDay(renovationEndISO(renovation))})
              <button
                type="button"
                onClick={extendToFit}
                className="font-medium underline underline-offset-2 hover:no-underline"
              >
                Estender prazo
              </button>
            </p>
          ) : null}
        </div>

        <Field label="Status">
          <div className="flex gap-1">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setForm({ ...form, status })}
                className={cx(
                  'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors',
                  form.status === status
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400/60 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800',
                )}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Notas" htmlFor="step-notes">
          <Textarea
            id="step-notes"
            rows={2}
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Detalhes opcionais…"
          />
        </Field>

        <div className="flex items-center justify-between pt-1">
          {step ? (
            <Button variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {step ? 'Salvar alterações' : 'Adicionar etapa'}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir etapa?"
        message={
          step?.groupId
            ? `“${step.title}” será removida dos ${groupSize} cômodos em que foi criada.`
            : `“${step?.title ?? ''}” será removida do cronograma.`
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (step) {
            if (step.groupId) {
              removeStepGroup(step.groupId)
              notify('info', 'Etapa removida de todos os cômodos.')
            } else {
              removeStep(step.id)
              notify('info', 'Etapa excluída.')
            }
          }
          onClose()
        }}
      />
    </Modal>
  )
}
