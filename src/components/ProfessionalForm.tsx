import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { cx } from '../lib/cx'
import { PALETTE } from '../lib/palette'
import { useStore } from '../state/store'
import type { Professional } from '../types'
import { ConfirmDialog, Modal } from './ui/Modal'
import { Button, Field, Input } from './ui/controls'

interface ProfessionalFormProps {
  open: boolean
  professional: Professional | null
  onClose: () => void
}

export function ProfessionalForm({ open, professional, onClose }: ProfessionalFormProps) {
  const renovation = useStore((state) => state.renovation)
  const addProfessional = useStore((state) => state.addProfessional)
  const updateProfessional = useStore((state) => state.updateProfessional)
  const removeProfessional = useStore((state) => state.removeProfessional)
  const notify = useStore((state) => state.notify)

  const [form, setForm] = useState({ name: '', trade: '', color: PALETTE[0] })
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    if (professional) {
      setForm({
        name: professional.name,
        trade: professional.trade,
        color: professional.color,
      })
      return
    }
    const count = useStore.getState().renovation.professionals.length
    setForm({ name: '', trade: '', color: PALETTE[count % PALETTE.length] })
  }, [open, professional])

  const stepCount = professional
    ? renovation.steps.filter((step) => step.professionalId === professional.id).length
    : 0
  const canSubmit = form.name.trim().length > 0

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    const payload = {
      name: form.name.trim(),
      trade: form.trade.trim(),
      color: form.color,
    }
    if (professional) {
      updateProfessional(professional.id, payload)
    } else {
      addProfessional(payload)
      notify('success', 'Profissional adicionado.')
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={professional ? 'Editar profissional' : 'Novo profissional'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome" htmlFor="pro-name">
          <Input
            id="pro-name"
            autoFocus
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="ex.: Ana"
          />
        </Field>

        <Field label="Profissão" htmlFor="pro-trade">
          <Input
            id="pro-trade"
            value={form.trade}
            onChange={(event) => setForm({ ...form, trade: event.target.value })}
            placeholder="ex.: Encanador"
          />
        </Field>

        <Field label="Cor">
          <div className="grid grid-cols-6 gap-2">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Usar a cor ${color}`}
                onClick={() => setForm({ ...form, color })}
                style={{ background: color }}
                className={cx(
                  'size-8 rounded-full transition-transform hover:scale-110',
                  form.color === color
                    ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                    : '',
                )}
              />
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between pt-1">
          {professional ? (
            <Button variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {professional ? 'Salvar alterações' : 'Adicionar profissional'}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir profissional?"
        message={
          professional
            ? `${professional.name} será removido. ${
                stepCount === 1
                  ? 'Sua etapa ficará sem responsável.'
                  : `Suas ${stepCount} etapas ficarão sem responsável.`
              }`
            : ''
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (professional) {
            removeProfessional(professional.id)
            notify('info', 'Profissional excluído.')
          }
          onClose()
        }}
      />
    </Modal>
  )
}
