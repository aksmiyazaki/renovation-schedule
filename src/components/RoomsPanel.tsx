import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp, DoorOpen, Eye, EyeOff, Plus } from 'lucide-react'
import { cx } from '../lib/cx'
import { plural } from '../lib/format'
import { roomAccent } from './calendar/constants'
import { useStore } from '../state/store'
import type { Room } from '../types'
import { RoomForm } from './RoomForm'
import { Button, IconButton } from './ui/controls'

export function RoomsPanel() {
  const renovation = useStore((state) => state.renovation)
  const moveRoom = useStore((state) => state.moveRoom)
  const toggleRoomHidden = useStore((state) => state.toggleRoomHidden)
  const [editing, setEditing] = useState<Room | 'new' | null>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button variant="primary" className="w-full" onClick={() => setEditing('new')}>
          <Plus size={15} /> Adicionar cômodo
        </Button>
      </div>
      <ul className="thin-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        <AnimatePresence initial={false}>
          {renovation.rooms.map((room, index) => {
            const count = renovation.steps.filter((step) => step.roomId === room.id).length
            return (
              <motion.li
                key={room.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  className={cx(
                    'flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1 pr-0.5 dark:border-slate-800 dark:bg-slate-900',
                    room.hidden && 'opacity-60',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setEditing(room)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5"
                  >
                    <DoorOpen size={14} className="shrink-0" style={{ color: roomAccent(index) }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{room.name}</span>
                    {room.hidden ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Oculto
                      </span>
                    ) : null}
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {plural(count, 'etapa', 'etapas')}
                    </span>
                  </button>
                  <IconButton
                    label="Mover para cima"
                    disabled={index === 0}
                    onClick={() => moveRoom(room.id, -1)}
                  >
                    <ChevronUp size={14} />
                  </IconButton>
                  <IconButton
                    label="Mover para baixo"
                    disabled={index === renovation.rooms.length - 1}
                    onClick={() => moveRoom(room.id, 1)}
                  >
                    <ChevronDown size={14} />
                  </IconButton>
                  <IconButton
                    label={room.hidden ? 'Mostrar cômodo' : 'Ocultar cômodo'}
                    onClick={() => toggleRoomHidden(room.id)}
                  >
                    {room.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </IconButton>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      {renovation.rooms.length === 0 ? (
        <p className="px-4 pb-4 text-center text-xs text-slate-400">
          Nenhum cômodo ainda. Adicione os cômodos desta reforma — cada um ganha sua própria faixa
          no cronograma.
        </p>
      ) : null}
      <RoomForm
        open={editing !== null}
        room={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
