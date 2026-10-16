import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { useStore } from '../state/store'
import type { Room } from '../types'
import { ConfirmDialog, Modal } from './ui/Modal'
import { Button, Field, Input } from './ui/controls'

interface RoomFormProps {
  open: boolean
  room: Room | null
  onClose: () => void
}

export function RoomForm({ open, room, onClose }: RoomFormProps) {
  const renovation = useStore((state) => state.renovation)
  const addRoom = useStore((state) => state.addRoom)
  const updateRoom = useStore((state) => state.updateRoom)
  const removeRoom = useStore((state) => state.removeRoom)
  const notify = useStore((state) => state.notify)

  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    setName(room ? room.name : '')
  }, [open, room])

  const stepCount = room
    ? renovation.steps.filter((step) => step.roomId === room.id).length
    : 0
  const canSubmit = name.trim().length > 0

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    const payload = { name: name.trim() }
    if (room) {
      updateRoom(room.id, payload)
    } else {
      addRoom(payload)
      notify('success', 'Cômodo adicionado.')
    }
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={room ? 'Editar cômodo' : 'Novo cômodo'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome do cômodo" htmlFor="room-name">
          <Input
            id="room-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex.: Cozinha, Banheiro, Sala…"
          />
        </Field>

        <div className="flex items-center justify-between pt-1">
          {room ? (
            <Button variant="danger-ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {room ? 'Salvar alterações' : 'Adicionar cômodo'}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir cômodo?"
        message={
          room
            ? `${room.name} será removido. ${
                stepCount === 1
                  ? 'Sua etapa ficará “sem cômodo”.'
                  : `Suas ${stepCount} etapas ficarão “sem cômodo”.`
              }`
            : ''
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (room) {
            removeRoom(room.id)
            notify('info', 'Cômodo excluído.')
          }
          onClose()
        }}
      />
    </Modal>
  )
}
