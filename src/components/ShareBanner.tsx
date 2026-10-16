import { ArrowLeft, CloudAlert, CloudCheck, RefreshCw, Share2, TriangleAlert } from 'lucide-react'
import { setShareModeActive } from '../lib/shareRuntime'
import { useStore } from '../state/store'

/**
 * Mostrado enquanto o app está editando uma reforma compartilhada (aberta por
 * um link `?share=`). Oferece salvar o resultado ou sair.
 */
export function ShareBanner() {
  const shareMode = useStore((state) => state.shareMode)
  const syncStatus = useStore((state) => state.syncStatus)

  if (!shareMode) return null

  const leave = (saveCopy: boolean) => {
    if (saveCopy) {
      setShareModeActive(false)
      // Mantém o conteúdo compartilhado como o plano do usuário e deixa que
      // ele sincronize com a nuvem pessoal no próximo carregamento.
      useStore.setState({
        shareMode: null,
        shareId: null,
        shareUpdatedAt: 0,
        syncUpdatedAt: 0,
        localUpdatedAt: Date.now(),
      })
    }
    window.location.replace(window.location.pathname)
  }

  if (shareMode.missing) {
    return (
      <div className="no-print flex flex-wrap items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <TriangleAlert size={14} className="shrink-0" />
        Este link compartilhado não está mais disponível — o proprietário parou de compartilhar.
        <button
          type="button"
          onClick={() => leave(false)}
          className="ml-auto flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
        >
          <ArrowLeft size={13} /> Abrir meu plano
        </button>
      </div>
    )
  }

  const status = (() => {
    if (syncStatus === 'synced') {
      return (
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <CloudCheck size={13} /> Todas as alterações salvas
        </span>
      )
    }
    if (syncStatus === 'error') {
      return (
        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
          <CloudAlert size={13} /> Problema de conexão — tentando novamente
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
        <RefreshCw size={13} className="animate-spin" /> Salvando alterações…
      </span>
    )
  })()

  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-xs text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
      <span className="flex items-center gap-1.5 font-medium">
        <Share2 size={14} className="shrink-0" />
        Você está editando uma reforma compartilhada
        {shareMode.ownerName ? ` (compartilhada por ${shareMode.ownerName})` : ''}.
      </span>
      <span className="text-indigo-700/80 dark:text-indigo-300/80">
        As alterações ficam visíveis para todos com o link.
      </span>
      <span className="ml-auto flex items-center gap-3">
        {status}
        <button
          type="button"
          onClick={() => leave(true)}
          className="rounded-md bg-indigo-600 px-2.5 py-1 font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Salvar uma cópia no meu plano
        </button>
        <button
          type="button"
          onClick={() => leave(false)}
          className="flex items-center gap-1 font-medium underline underline-offset-2 hover:no-underline"
        >
          <ArrowLeft size={13} /> Sair
        </button>
      </span>
    </div>
  )
}
