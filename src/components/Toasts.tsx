import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useToastStore, type Toast } from '@/session/useToastStore'

const TOAST_MS = 10_000 // auto-dismiss after 10s; the countdown pauses while hovered

function Bubble({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const { t } = useTranslation()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const arm = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(onClose, TOAST_MS)
  }
  const hold = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => {
    arm()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      onMouseEnter={hold}
      onMouseLeave={arm}
      className="animate-fade pointer-events-auto flex max-w-[90vw] items-center gap-3 rounded-full border border-line bg-card px-4 py-2 text-sm text-ink shadow-lg"
    >
      <span>{t(toast.key)}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('sharing.close')}
        className="grid h-5 w-5 flex-none place-items-center rounded-full text-ink-3 hover:bg-line-2 hover:text-ink"
      >
        ✕
      </button>
    </div>
  )
}

/**
 * Notification bubbles, stacked at the top-centre of the screen and portalled above everything.
 * The wrapper is click-through (`pointer-events-none`) so only the bubbles themselves catch the
 * mouse; each bubble self-dismisses after 10s (paused on hover) or via its ✕.
 */
export function Toasts() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  if (toasts.length === 0) return null
  return createPortal(
    <div className="rg-noprint pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <Bubble key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
      ))}
    </div>,
    document.body,
  )
}
