import { useTranslation } from 'react-i18next'
import { useSessionStore, shareMode, type ShareMode } from '@/session/useSessionStore'
import { openSharePopup } from '@/session/session'

// Indicator dot per mode: grey / yellow / red.
const DOT: Record<ShareMode, string> = {
  silent: 'bg-ink-3',
  listening: 'bg-[#e0a82e]',
  broadcasting: 'bg-neg',
}
const LABEL_KEY: Record<ShareMode, string> = {
  silent: 'sharing.modeSilent',
  listening: 'sharing.modeListening',
  broadcasting: 'sharing.modeBroadcasting',
}

/**
 * The Share button, left of the language selector. Styled like the theme button (round-indicator
 * + label), with a fixed label width so it never resizes across the 9 mode×language labels, and a
 * green frame (border-primary, as the active character-pair row) while listening or broadcasting.
 * Clicking it opens the Sharing popup (see SessionOverlays).
 */
export function ShareButton() {
  const { t } = useTranslation()
  const mode = useSessionStore((s) => shareMode(s))
  const framed = mode !== 'silent'

  return (
    <button
      type="button"
      aria-label={t('sharing.ariaButton')}
      onClick={openSharePopup}
      className={[
        'flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-ink',
        framed ? 'border-primary' : 'border-line hover:border-ink-3',
      ].join(' ')}
    >
      <span className={`h-2.5 w-2.5 flex-none rounded-full ${DOT[mode]}`} aria-hidden />
      {/* Fixed width ≥ the widest of all 9 mode×language labels (ru "…Транслируется" ≈ 245px),
          with headroom; shrink-0 so a tight nav can't compress and clip it. Left-aligned, so the
          button never resizes when the mode or language changes. */}
      <span className="w-[264px] shrink-0 truncate text-left">{t(LABEL_KEY[mode])}</span>
    </button>
  )
}
