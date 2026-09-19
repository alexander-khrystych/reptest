import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Grid10 } from '@/store/useAppStore'
import { rhoMatrix, fmtRho, fmtRho2 } from '@/lib/spearman'
import './resultGrid.css'

/**
 * An 11×11 Spearman-correlation matrix over the constructs-ranking flow's constructs (the 10
 * elicited ones plus the fixed 11th "good / bad"). Both the left header column and the top header
 * (vertical, reading bottom-to-top) are the construct pairs. Cell [i][j] is the coefficient between
 * construct i and construct j; the self-diagonal is greyed. `variant` picks the value: `rho` shows ρ
 * to 4 decimals, `rho2` shows ρ² × 100 to 3 decimals. `show11` toggles the 11th (good/bad) construct
 * — off drops its row + column, leaving a 10×10. Clicking a cell lights its whole row + column (the
 * shared crosshair every result table carries). Reuses `resultGrid.css`.
 */
export function Grid10MatrixTable({
  grid10,
  ranking,
  variant,
  show11 = true,
  interactive = true,
}: {
  grid10: Grid10 | null
  ranking: number[][] | null
  variant: 'rho' | 'rho2'
  show11?: boolean
  interactive?: boolean
}) {
  const { t } = useTranslation()

  const [sel, setSel] = useState<[number, number] | null>(null)
  const toggleCell = (r: number, c: number) =>
    setSel((prev) => (prev && prev[0] === r && prev[1] === c ? null : [r, c]))
  const hlRow = (r: number) => (interactive && sel && sel[0] === r ? ' rg-hl' : '')
  const hlCol = (c: number) => (interactive && sel && sel[1] === c ? ' rg-hl' : '')
  const hlCell = (r: number, c: number) =>
    interactive && sel && (sel[0] === r || sel[1] === c) ? ' rg-hl' : ''

  // Not ranked yet → an empty placeholder (e.g. an observer, or the testee before ranking).
  if (!grid10 || !ranking) {
    return (
      <div className="rg-scroll grid min-h-[220px] place-items-center p-8 text-center">
        <p className="max-w-sm text-sm text-ink-2">{t('g10.rankEmptyNote')}</p>
      </div>
    )
  }

  // The construct pairs: the 10 elicited groups + the fixed 11th (good / bad). The 11th is dropped
  // when the toggle is off (it's the last ranking, so slicing keeps the matrix consistent).
  const allPoles = [
    ...grid10.groups.map((g) => ({ em: g.emergent, co: g.contrast })),
    { em: t('g10.goodPole'), co: t('g10.badPole') },
  ]
  const poles = show11 ? allPoles : allPoles.slice(0, -1)
  const m = rhoMatrix(ranking)
  const fmt = variant === 'rho' ? fmtRho : fmtRho2

  // The left header column reads a pole pair (wraps when long); data columns fit the widest value
  // (ρ² × 100 → up to "100.000").
  const headW = 180
  const colW = variant === 'rho' ? 54 : 60
  const minWidth = headW + colW * poles.length

  return (
    <div className="rg-scroll">
      <table className="rg-grid rg-mtx" style={{ width: '100%', minWidth }}>
        <colgroup>
          <col style={{ width: headW }} />
          {poles.map((_, i) => (
            <col key={i} style={{ width: colW }} />
          ))}
        </colgroup>

        <thead>
          {/* top header — each construct pair, vertical, reading bottom-to-top */}
          <tr>
            <td className="mtx-corner b-bottom b-right" />
            {poles.map((p, j) => (
              <td key={j} className={`mtx-top b-bottom${hlCol(j)}`}>
                <span className="mtx-vlabel">
                  <span className="text-emergent">{p.em || '—'}</span>
                  <span className="mtx-sep"> · </span>
                  <span className="text-contrast">{p.co || '—'}</span>
                </span>
              </td>
            ))}
          </tr>
        </thead>

        <tbody>
          {poles.map((prow, i) => (
            <tr key={i}>
              {/* left header — the construct pair for this row */}
              <td className={`mtx-rhead b-right${hlRow(i)}`}>
                <span className="text-emergent">{prow.em || '—'}</span>
                <span className="mtx-sep"> · </span>
                <span className="text-contrast">{prow.co || '—'}</span>
              </td>
              {poles.map((_, j) => {
                const diag = i === j
                const cls = ['mtx-cell', diag ? 'mtx-diag' : '', hlCell(i, j).trim()]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <td
                    key={j}
                    className={cls}
                    onClick={interactive && !diag ? () => toggleCell(i, j) : undefined}
                  >
                    {diag ? '' : fmt(m[i][j])}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
