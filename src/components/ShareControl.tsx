import { useState } from 'react'
import { Check, Copy, Link2, RefreshCw, Share2, Trash2 } from 'lucide-react'
import { copyText } from '../lib/copy'
import { firebaseEnabled } from '../lib/firebase'
import { buildShareUrl } from '../lib/shareUrl'
import { createShareLink, stopSharing } from '../lib/sync'
import { useStore } from '../state/store'
import { ConfirmDialog, Modal } from './ui/Modal'
import { Button, IconButton } from './ui/controls'

export function ShareControl() {
  const shareId = useStore((state) => state.shareId)
  const shareMode = useStore((state) => state.shareMode)
  const syncUser = useStore((state) => state.syncUser)
  const notify = useStore((state) => state.notify)

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const [confirmStop, setConfirmStop] = useState(false)

  if (!firebaseEnabled || shareMode) return null

  const shareUrl = shareId ? buildShareUrl(shareId, window.location) : ''

  const handleOpen = () => {
    if (!syncUser) {
      notify(
        'info',
        'Entre na sua conta pelo ícone de nuvem primeiro — os links de compartilhamento ficam no seu projeto Firebase.',
      )
      return
    }
    setOpen(true)
  }

  const handleCreate = async () => {
    setBusy(true)
    try {
      const url = await createShareLink()
      const copied = await copyText(url)
      notify(
        'success',
        copied
          ? 'Link de compartilhamento criado e copiado para a área de transferência.'
          : 'Link de compartilhamento criado.',
      )
    } catch (error) {
      notify(
        'error',
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível criar o link. Verifique as regras do Firestore.',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    const copied = await copyText(shareUrl)
    if (copied) {
      setJustCopied(true)
      window.setTimeout(() => setJustCopied(false), 1600)
      notify('success', 'Link copiado.')
    } else {
      notify('error', 'Não foi possível copiar — selecione o link manualmente.')
    }
  }

  return (
    <>
      <IconButton label="Compartilhar esta reforma" onClick={handleOpen}>
        <Share2 size={16} />
      </IconButton>

      <Modal open={open} onClose={() => setOpen(false)} title="Compartilhar esta reforma">
        {shareId ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Qualquer pessoa com este link pode ver <span className="font-medium">e editar</span>{' '}
              o plano, sem precisar de conta. As mudanças sincronizam ao vivo entre todos.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.target.select()}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200"
              />
              <Button onClick={() => void handleCopy()}>
                {justCopied ? <Check size={14} /> : <Copy size={14} />}
                {justCopied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button
                variant="danger-ghost"
                size="sm"
                onClick={() => setConfirmStop(true)}
              >
                <Trash2 size={14} /> Parar de compartilhar
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Crie um link que qualquer pessoa pode abrir para ver e editar esta reforma — útil
              para um sócio, empreiteiro ou arquiteto. Ninguém precisa de conta, e toda mudança
              fica sincronizada.
            </p>
            <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <Link2 size={14} className="mt-0.5 shrink-0" />
              Lembre-se: quem tiver o link pode alterar o plano. Você pode revogá-lo a qualquer
              momento com “Parar de compartilhar”.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" disabled={busy} onClick={() => void handleCreate()}>
                {busy ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}
                {busy ? 'Criando…' : 'Criar link'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmStop}
        title="Parar de compartilhar?"
        message="O link para de funcionar imediatamente para todos. Seu plano continua intacto — você pode criar um novo link depois."
        confirmLabel="Parar de compartilhar"
        onCancel={() => setConfirmStop(false)}
        onConfirm={() => {
          void stopSharing()
          setOpen(false)
          notify('info', 'Compartilhamento encerrado. O link não funciona mais.')
        }}
      />
    </>
  )
}
