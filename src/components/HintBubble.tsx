import { useEffect, useRef } from 'react'

/**
 * A small anchored hint bubble. The default dismiss behaviour for every bubble in the app lives
 * here: it closes after 10s, on a click of its ✕, or on any click outside itself. Positioning is
 * left to the caller — render it inside a `position: relative` wrapper (typically it points down at
 * the control it explains). `onClose` should clear whatever state renders the bubble.
 */
export function HintBubble({
  message,
  onClose,
  className = '',
}: {
  message: string
  onClose: () => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const close = () => onCloseRef.current()
    const timer = window.setTimeout(close, 10_000)
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    // Attach on the next tick so the click that opened the bubble doesn't immediately close it.
    const armId = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(armId)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  return (
    <div
      ref={ref}
      role="tooltip"
      className={`absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 text-left text-xs leading-snug text-ink shadow-lg ${className}`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded text-[11px] text-ink-3 hover:text-ink"
      >
        ✕
      </button>
      <span className="block pr-4">{message}</span>
      {/* little arrow pointing down at the anchored control */}
      <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-[var(--card)]" />
    </div>
  )
}
