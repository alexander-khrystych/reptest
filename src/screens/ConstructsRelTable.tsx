import { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { constructScore } from '@/lib/pairScore'
import './resultGrid.css'

const HEAD_W = 160 // left construct-header column
// Each score column. The widest cell text is the worst-case score "+22 / -6" (≈38px at 11px/600);
// with the cell's 2px padding, 46px leaves a comfortable margin with no clipping and no font change.
const COL_W = 46

// +P heat-map level (1–4) → a CSS class (shared with the character-relationships table), so the
// fill follows the theme. pos ∈ [0, 22] here, same range as the character pair score.
const heatLevel = (pos: number) => (pos <= 5 ? 1 : pos <= 10 ? 2 : pos <= 15 ? 3 : 4)

/**
 * The constructs-relations matrix: every construct crossed with every other, using the same data as
 * the constructs diagram (`constructScore` — how two constructs agree across all 22 characters:
 * `+P` shared, `-N` opposed). Both headers (top row + left column) are the 22 constructs, each broken
 * into two lines (elicited pole over contrast pole) and styled like the ρ / ρ²×100 matrix headers
 * (vertical on top, horizontal on the left). The grid cells reuse the character-relationships
 * heat-map (`+P / -N` over a `+P` fill), the greyed self-diagonal, and the shared click-crosshair.
 */
export function ConstructsRelTable({ interactive = true }: { interactive?: boolean }) {
  const constructs = useAppStore((s) => s.constructs)

  // Symmetric N×N score matrix; the diagonal (a construct with itself) is null → greyed.
  const scores = useMemo(
    () =>
      constructs.map((_, i) =>
        constructs.map((_, j) => (i === j ? null : constructScore(constructs, i, j))),
      ),
    [constructs],
  )

  const [sel, setSel] = useState<[number, number] | null>(null)
  const toggle = (i: number, j: number) =>
    setSel((p) => (p && p[0] === i && p[1] === j ? null : [i, j]))
  const hlCell = (i: number, j: number) =>
    interactive && sel && (sel[0] === i || sel[1] === j) ? ' rg-hl' : ''
  const hlRow = (i: number) => (interactive && sel && sel[0] === i ? ' rg-hl' : '')
  const hlCol = (j: number) => (interactive && sel && sel[1] === j ? ' rg-hl' : '')

  const width = HEAD_W + COL_W * constructs.length

  return (
    <div className="rg-scroll">
      <table className="rg-grid rg-mtx rg-crel" style={{ width }}>
        <colgroup>
          <col style={{ width: HEAD_W }} />
          {constructs.map((_, i) => (
            <col key={i} style={{ width: COL_W }} />
          ))}
        </colgroup>

        <thead>
          {/* top header — each construct, two vertical lines (elicited over contrast) */}
          <tr>
            <td className="mtx-corner b-bottom b-right" />
            {constructs.map((c, j) => (
              <td key={j} className={`crel-top b-bottom${hlCol(j)}`}>
                <span className="crel-vwrap">
                  <span className="crel-vline text-emergent">{c.emergent || '—'}</span>
                  <span className="crel-vline text-contrast">{c.contrast || '—'}</span>
                </span>
              </td>
            ))}
          </tr>
        </thead>

        <tbody>
          {constructs.map((cI, i) => (
            <tr key={i}>
              {/* left header — the construct, elicited pole over contrast pole */}
              <td className={`crel-left b-right${hlRow(i)}`}>
                <span className="block text-emergent">{cI.emergent || '—'}</span>
                <span className="block text-contrast">{cI.contrast || '—'}</span>
              </td>
              {constructs.map((_, j) => {
                const s = scores[i][j]
                if (!s)
                  return (
                    <td
                      key={j}
                      className={`rel-self${hlCell(i, j)}`}
                      onClick={interactive ? () => toggle(i, j) : undefined}
                    />
                  )
                return (
                  <td
                    key={j}
                    className={`rel-cell rel-h${heatLevel(s.pos)}${hlCell(i, j)}`}
                    onClick={interactive ? () => toggle(i, j) : undefined}
                  >
                    <span className={s.pos <= 15 ? 'rel-pos-lo' : 'rel-pos-hi'}>+{s.pos}</span>
                    <span className="rel-sep"> / </span>
                    <span className="rel-neg">-{s.neg}</span>
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
