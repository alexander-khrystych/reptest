import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { pairScore } from '@/lib/pairScore'
import { CharSelect } from './CharSelect'
import { GridLegend } from './GridLegend'

interface Props {
  /** The table these pairs belong to (pairs are scoped per table). */
  tableId: string
  /** The current table's character positions — the pool offered in the two selectors. */
  characters: number[]
}

/**
 * Data-analysis pairs for one table: character pairs scored `+P : -N`. Clicking anywhere on a
 * complete pair (except the two selectors and the delete button) toggles whether its relation is
 * hatched onto the grid; only one pair per table can be active. On screen this sits above the
 * table; the PDF renders the same pairs below the table instead. New tables start with no pairs.
 */
export function PairsPanel({ tableId, characters }: Props) {
  const { t } = useTranslation()
  const names = useAppStore((s) => s.names)
  const constructs = useAppStore((s) => s.constructs)
  const pairs = useAppStore((s) => s.pairsByTable[tableId]) ?? []
  const activeId = useAppStore((s) => s.activePairByTable[tableId]) ?? null
  const addPair = useAppStore((s) => s.addPair)
  const removePair = useAppStore((s) => s.removePair)
  const setPairChar = useAppStore((s) => s.setPairChar)
  const toggleActivePair = useAppStore((s) => s.toggleActivePair)

  // Keep the selectors and the delete button from triggering the whole-row toggle.
  const stop = (e: MouseEvent) => e.stopPropagation()

  return (
    <div className="rg-noprint mb-3">
      <div className="flex flex-col gap-1.5">
        {pairs.map((pair) => {
          const score =
            pair.a !== null && pair.b !== null ? pairScore(constructs, pair.a, pair.b) : null
          const isActive = activeId === pair.id
          return (
            <div
              key={pair.id}
              onClick={score ? () => toggleActivePair(tableId, pair.id) : undefined}
              className={[
                'flex items-center gap-2 rounded-[9px] border bg-card px-2 py-1.5',
                score ? 'cursor-pointer' : '',
                isActive ? 'border-primary' : 'border-line',
              ].join(' ')}
            >
              <span className="contents" onClick={stop}>
                <CharSelect
                  names={names}
                  options={characters}
                  value={pair.a}
                  disabled={pair.b !== null ? [pair.b] : []}
                  onChange={(v) => setPairChar(tableId, pair.id, 'a', v)}
                  placeholder={t('pairs.charA')}
                />
              </span>
              <span className="text-[12px] text-ink-3">×</span>
              <span className="contents" onClick={stop}>
                <CharSelect
                  names={names}
                  options={characters}
                  value={pair.b}
                  disabled={pair.a !== null ? [pair.a] : []}
                  onChange={(v) => setPairChar(tableId, pair.id, 'b', v)}
                  placeholder={t('pairs.charB')}
                />
              </span>

              <div className="ml-1 min-w-[70px] font-mono text-[13px]">
                {score ? (
                  <>
                    <span className="font-semibold text-primary">+{score.pos}</span>
                    <span className="text-ink-3"> : </span>
                    <span className="font-semibold text-neg">-{score.neg}</span>
                  </>
                ) : (
                  <span className="text-ink-3">—</span>
                )}
              </div>

              {score && (
                <span
                  title={t('pairs.shownOnGrid')}
                  className={[
                    'select-none rounded px-2 py-1 font-mono text-[9px] uppercase tracking-wide',
                    isActive ? 'bg-primary text-white' : 'border border-line text-ink-2',
                  ].join(' ')}
                >
                  {t('pairs.onGrid')}
                </span>
              )}

              <span className="flex-1" />
              <button
                type="button"
                onClick={(e) => {
                  stop(e)
                  removePair(tableId, pair.id)
                }}
                aria-label={t('pairs.remove')}
                className="grid h-6 w-6 flex-none place-items-center rounded text-ink-3 hover:bg-line-2 hover:text-triad"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {/* "Add pair" (styled like Export) on the left, the grid legend pinned to the right. The
          legend keeps this line even once the 5-pair cap hides the button. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {pairs.length < 5 && (
          <button
            type="button"
            onClick={() => addPair(tableId)}
            className="inline-flex items-center gap-1.5 rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2"
          >
            <span className="text-base leading-none">+</span> {t('pairs.add')}
          </button>
        )}
        <GridLegend className="ml-auto" />
      </div>
    </div>
  )
}
