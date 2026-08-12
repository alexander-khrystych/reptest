import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { GRID_SIZE } from '@/data'
import { NavControls } from './NavControls'
import { ShareButton } from './ShareButton'

/** Top nav (testee): brand on the left; stage progress, Share, language + theme on the right. */
export function NavBar() {
  const { t } = useTranslation()
  const phase = useAppStore((s) => s.phase)
  const names = useAppStore((s) => s.names)
  const triadIndex = useAppStore((s) => s.triadIndex)

  // Stage progress: committed names, or the current construct number.
  const progress =
    phase === 'names'
      ? { label: t('names.progress'), n: names.filter((x) => x.trim() !== '').length }
      : phase === 'elicitation'
        ? { label: t('elicit.progress'), n: triadIndex + 1 }
        : null

  return (
    <nav className="rg-noprint mb-7 flex items-center gap-3 border-b border-line-2 py-4">
      <span className="text-[15px] font-semibold">{t('appName')}</span>
      <span className="flex-1" />

      {progress && (
        <span className="hidden items-center gap-2 font-mono text-xs text-ink-2 sm:flex">
          {progress.label} <b className="font-medium text-ink">{progress.n}</b> / {GRID_SIZE}
          <span className="ml-1 inline-block h-1 w-[110px] overflow-hidden rounded bg-line align-middle">
            <span
              className="block h-full bg-primary"
              style={{ width: `${(progress.n / GRID_SIZE) * 100}%` }}
            />
          </span>
        </span>
      )}

      {/* Sharing lives once the test has started (nothing to share on the start screen). */}
      {phase !== 'start' && <ShareButton />}
      <NavControls />
    </nav>
  )
}
