import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { GRID_SIZE } from '@/data'
import { NavControls } from './NavControls'
import { ShareButton } from './ShareButton'
import { SaveButton } from './SaveButton'

/** Top nav (testee): flow title + progress on the left; Share, language + theme on the right. */
export function NavBar() {
  const { t } = useTranslation()
  const phase = useAppStore((s) => s.phase)
  const names = useAppStore((s) => s.names)
  const triadIndex = useAppStore((s) => s.triadIndex)
  const demo = useAppStore((s) => s.demo)
  const reset = useAppStore((s) => s.reset)

  // Title reflects the current flow (falls back to the app name on the start screen).
  const title =
    phase === 'names'
      ? t('flow.characters')
      : phase === 'elicitation'
        ? t('flow.constructs')
        : phase === 'result'
          ? t('flow.grid')
          : t('appName')

  // Progress count: committed names, or the current construct number. None on start/result.
  const progress =
    phase === 'names'
      ? names.filter((x) => x.trim() !== '').length
      : phase === 'elicitation'
        ? triadIndex + 1
        : null

  return (
    <nav className="rg-noprint mb-7 flex items-center gap-3 border-b border-line-2 py-4">
      {/* Title stacks a small red "(demo)" beneath it — kept shorter than the h-9 controls so the
          nav height never grows. On the demo grid, Back (→ start) sits right of the title. */}
      <span className="flex flex-col justify-center leading-none">
        <span className="text-[15px] font-semibold">{title}</span>
        {demo && <span className="mt-0.5 text-[10px] font-medium leading-none text-triad">(demo)</span>}
      </span>
      {demo && (
        <button
          type="button"
          onClick={reset}
          className="flex h-9 items-center gap-1 rounded-lg border border-line bg-transparent px-3 text-sm text-ink hover:border-ink-3"
        >
          ← {t('common.back')}
        </button>
      )}

      {progress !== null && (
        <span className="hidden items-center gap-2 font-mono text-xs text-ink-2 sm:flex">
          <b className="font-medium text-ink">{progress}</b> / {GRID_SIZE}
          <span className="ml-1 inline-block h-1 w-[110px] overflow-hidden rounded bg-line align-middle">
            <span
              className="block h-full bg-primary"
              style={{ width: `${(progress / GRID_SIZE) * 100}%` }}
            />
          </span>
        </span>
      )}

      <span className="flex-1" />
      {/* Sharing + Save make no sense for the demo grid (throwaway sample data). */}
      {phase !== 'start' && !demo && <ShareButton />}
      {phase !== 'start' && !demo && <SaveButton />}
      <NavControls />
    </nav>
  )
}
