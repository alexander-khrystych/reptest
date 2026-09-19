import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { pairScore } from '@/lib/pairScore'
import { groupOf } from './gridGroups'
import './resultGrid.css'

const ROW_H = 24 // score-cell height; the left group bands span (rows × ROW_H)
const GROUP_W = 32 // left "groups" column
const NAME_W = 104 // left "characters" column — fits ~13 chars, longer names wrap to a 2nd line
const CELL_W = 46 // each score column

// +P heat-map level (1–4) → a CSS class, so the fill follows the theme (light yellows / dark
// ambers). Score text colours are classes too, keeping them legible on either fill. 15+ = 16 up.
const heatLevel = (pos: number) => (pos <= 5 ? 1 : pos <= 10 ? 2 : pos <= 15 ? 3 : 4)

interface Run {
  key: string
  color: string
  span: number
  start: number
}

/**
 * The character-relationships matrix: every character crossed with every other. Built from the
 * main table — roles row, poles and the class column are dropped, and the "groups" + "characters"
 * header rows are repeated (transposed) down the left so both axes are the characters, colours and
 * all. The self-diagonal is greyed; each off-diagonal cell shows the pair's `+P / -N` score (same
 * pairScore as the main-table character pairs), with a +P heat-map fill. Clicking any cell lights
 * its row + column (the shared crosshair every result table carries).
 */
export function RelationshipsTable({ characters }: { characters: number[] }) {
  const { t } = useTranslation()
  const names = useAppStore((s) => s.names)
  const constructs = useAppStore((s) => s.constructs)

  // Consecutive same-group characters (display order) → merged group bands, on the top row and the
  // left column alike. `start` is the run's first display index (where the left band cell renders).
  const runs = useMemo<Run[]>(() => {
    const out: Run[] = []
    characters.forEach((pos, i) => {
      const g = groupOf(pos)
      const last = out[out.length - 1]
      if (last && last.key === g.key) last.span++
      else out.push({ key: g.key, color: g.color, span: 1, start: i })
    })
    return out
  }, [characters])
  const runAtRow = useMemo(() => new Map(runs.map((r) => [r.start, r])), [runs])

  // Symmetric N×N score matrix; the diagonal (a character with itself) is null → greyed.
  const scores = useMemo(
    () => characters.map((a) => characters.map((b) => (a === b ? null : pairScore(constructs, a, b)))),
    [characters, constructs],
  )

  // Click-to-highlight crosshair: sel = [row, col]; lights the row's + column's cells and labels.
  const [sel, setSel] = useState<[number, number] | null>(null)
  const toggle = (i: number, j: number) =>
    setSel((p) => (p && p[0] === i && p[1] === j ? null : [i, j]))
  const hlCell = (i: number, j: number) => (sel && (sel[0] === i || sel[1] === j) ? ' rg-hl' : '')
  const hlRow = (i: number) => (sel && sel[0] === i ? ' rg-hl' : '')
  const hlCol = (j: number) => (sel && sel[1] === j ? ' rg-hl' : '')

  const width = GROUP_W + NAME_W + CELL_W * characters.length

  return (
    <div className="rg-scroll">
      <table className="rg-grid rg-rel" style={{ width }}>
        <colgroup>
          <col style={{ width: GROUP_W }} />
          <col style={{ width: NAME_W }} />
          {characters.map((_, i) => (
            <col key={i} style={{ width: CELL_W }} />
          ))}
        </colgroup>

        <thead>
          {/* groups row — the top-left-most corner is an empty grey cell; bands sit to its right */}
          <tr>
            <td colSpan={2} className="rel-corner b-bottom b-right" />
            {runs.map((r, i) => (
              <td
                key={i}
                colSpan={r.span}
                className="grp b-bottom"
                style={{ backgroundColor: r.color }}
              >
                {t(`result.${r.key}`)}
              </td>
            ))}
          </tr>
          {/* characters row — the two left column headers: "groups" (rotated, narrow col) +
              "characters", both on white; then the vertical character-name headers */}
          <tr>
            <td className="rel-chead b-bottom b-right">
              <span className="rel-cvtext">{t('result.groups')}</span>
            </td>
            <td className="rel-chead b-bottom b-right">{t('result.names')}</td>
            {characters.map((pos, j) => (
              <td
                key={j}
                className={`lab namerow b-bottom${hlCol(j)}`}
                style={{ backgroundColor: groupOf(pos).color }}
              >
                <span className="t">{names[pos] || '—'}</span>
              </td>
            ))}
          </tr>
        </thead>

        <tbody>
          {characters.map((posI, i) => {
            const run = runAtRow.get(i)
            return (
              <tr key={i}>
                {run && (
                  <td
                    rowSpan={run.span}
                    className="rel-vgroup b-right"
                    style={{ backgroundColor: run.color }}
                  >
                    <span className="rel-vtext" style={{ maxHeight: run.span * ROW_H - 4 }}>
                      {t(`result.${run.key}`)}
                    </span>
                  </td>
                )}
                <td
                  className={`rel-rowname b-right${hlRow(i)}`}
                  style={{ backgroundColor: groupOf(posI).color }}
                >
                  {names[posI] || '—'}
                </td>
                {characters.map((_, j) => {
                  const s = scores[i][j]
                  if (!s) return <td key={j} className={`rel-self${hlCell(i, j)}`} onClick={() => toggle(i, j)} />
                  return (
                    <td
                      key={j}
                      className={`rel-cell rel-h${heatLevel(s.pos)}${hlCell(i, j)}`}
                      onClick={() => toggle(i, j)}
                    >
                      <span className={s.pos <= 15 ? 'rel-pos-lo' : 'rel-pos-hi'}>+{s.pos}</span>
                      <span className="rel-sep"> / </span>
                      <span className="rel-neg">-{s.neg}</span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
