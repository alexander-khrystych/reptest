import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { useResultUi } from '@/store/useResultUi'
import { GRID_SIZE } from '@/data'
import { NavControls } from './NavControls'
import { ShareButton } from './ShareButton'
import { SaveButton } from './SaveButton'

/**
 * Top nav (testee) — pinned to the top of the page at a fixed compact height (`--header-h`). On the
 * left: in the table view, the Tables button + current table name (the drawer itself still lives in
 * ResultScreen, coordinated via useResultUi); in the flow screens, the flow title. On the right:
 * Share, Save, language + theme. Its z-index sits above the table drawer, which starts below it.
 */
export function NavBar() {
  const { t } = useTranslation()
  const phase = useAppStore((s) => s.phase)
  const names = useAppStore((s) => s.names)
  const triadIndex = useAppStore((s) => s.triadIndex)
  const demo = useAppStore((s) => s.demo)
  const reset = useAppStore((s) => s.reset)

  const isResult = phase === 'result'
  const drawerOpen = useResultUi((s) => s.drawerOpen)
  const openDrawer = useResultUi((s) => s.openDrawer)
  const closeDrawer = useResultUi((s) => s.closeDrawer)
  const currentName = useResultUi((s) => s.currentName)

  // Title reflects the current flow (falls back to the app name on the start screen). Not used in
  // the result view, where the Tables button + table name take the top-left instead.
  const title =
    phase === 'names'
      ? t('flow.characters')
      : phase === 'elicitation'
        ? t('flow.constructs')
        : phase === 'g10chars' || phase === 'g10group' || phase === 'g10rank'
          ? t('flow.ranking')
          : t('appName')

  // Progress count: committed names, or the current construct number. None on start/result.
  const progress =
    phase === 'names'
      ? names.filter((x) => x.trim() !== '').length
      : phase === 'elicitation'
        ? triadIndex + 1
        : null

  return (
    <nav className="rg-noprint sticky top-0 z-50 h-[var(--header-h)] border-b border-line-2 bg-canvas">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-4">
        {isResult ? (
          // Table view: Tables button (opens the drawer) + current table name, replacing the title.
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => (drawerOpen ? closeDrawer() : openDrawer())}
              className="inline-flex h-9 flex-none items-center gap-2 rounded-[9px] border border-line px-3 text-sm text-ink hover:border-ink-3"
            >
              <span className="text-base leading-none">☰</span> {t('tables.menu')}
            </button>
            <span className="max-w-[36vw] truncate text-[15px] font-semibold">{currentName}</span>
            {demo && <span className="flex-none text-[10px] font-medium text-triad">(demo)</span>}
          </div>
        ) : (
          // Flow screens: stack a small red "(demo)" beneath the flow title (kept short so the nav
          // height never grows).
          <span className="flex flex-col justify-center leading-none">
            <span className="text-[15px] font-semibold">{title}</span>
            {demo && (
              <span className="mt-0.5 text-[10px] font-medium leading-none text-triad">(demo)</span>
            )}
          </span>
        )}

        {/* On the demo grid, Back (→ start) replaces Start over. */}
        {demo && (
          <button
            type="button"
            onClick={reset}
            className="flex h-9 flex-none items-center gap-1 rounded-lg border border-line bg-transparent px-3 text-sm text-ink hover:border-ink-3"
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
      </div>
    </nav>
  )
}
