import { useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { ROLES, CLASSES, TRIADS } from '@/data'
import type { PairVerdict } from '@/lib/pairScore'
import './resultGrid.css'

/** Column-letter for a character column: B, C, … (0-based display index → letter). */
const colLetter = (i: number) => String.fromCharCode(66 + i)

const POLE_CAP = 140 // max X/Y column width; longer values wrap to a second line
const POLE_MIN = 64
const POLE_PAD = 22
const VALENCE_W = 26 // the narrow (vertical-text) valences column

// Pale group colours shared by the class column (A2:A23) and the valences column.
const GROUP_BG = {
  violet: 'rgba(142,68,173,0.15)',
  orange: 'rgba(230,126,34,0.17)',
  blue: 'rgba(41,128,185,0.15)',
  yellow: 'rgba(241,196,15,0.24)',
  pink: 'rgba(232,67,147,0.14)',
}
const classGroupBg = (k: number): string => {
  if (k <= 5) return GROUP_BG.violet // A2:A7 (family — first class recoloured red → violet)
  if (k <= 8) return GROUP_BG.orange // A8:A10
  if (k <= 14) return GROUP_BG.blue // A11:A16
  if (k <= 18) return GROUP_BG.yellow // A17:A20
  return GROUP_BG.pink // A21:A23
}

/**
 * Valence groups — a higher grouping of the class rows, shown merged (rowspan) in the vertical
 * valences column. `start` is the 0-based construct index of the group's first row; `span` the
 * number of rows. Labels are vertically centred in the merged cell.
 */
const VALENCES = [
  { start: 0, span: 6, key: 'valFamily', color: GROUP_BG.violet }, // A2:A7
  { start: 6, span: 3, key: 'valCloseOnes', color: GROUP_BG.orange }, // A8:A10
  { start: 9, span: 6, key: 'valValences', color: GROUP_BG.blue }, // A11:A16
  { start: 15, span: 4, key: 'valAuthorities', color: GROUP_BG.yellow }, // A17:A20
  { start: 19, span: 3, key: 'valValues', color: GROUP_BG.pink }, // A21:A23
] as const

interface GridTableProps {
  /** 0-based name positions to render as character columns, in display order. */
  characters: number[]
  /** Click a body cell to highlight its row + column (screen only). Off for print copies. */
  interactive?: boolean
  /** Active pair-comparison highlight: hatch the two characters' cells green (+1) / red (-1). */
  highlight?: { a: number; b: number; rows: Record<number, PairVerdict> } | null
}

/**
 * The repertory grid itself, rendering an arbitrary subset of the character columns.
 *
 * The row structure is invariant — the valences column, class column (A) and both poles (X =
 * elicited, Y = contrast) are always present; only which characters (B, C, …) appear varies.
 * `characters` = [0..21] reproduces the complete default table; a shorter list is a custom
 * comparison. Each row derives from its construct: a ✓ on the emergent-tint fill where a card
 * is in the alike pair or was selected, a pale-blue frame (on top) on the three triad cards.
 */
export function GridTable({ characters, interactive = true, highlight = null }: GridTableProps) {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.language)
  const names = useAppStore((s) => s.names)
  const constructs = useAppStore((s) => s.constructs)

  const roles = ROLES[language]
  const classes = CLASSES[language]

  // Size the X/Y pole columns to their longest value (capped), so freed width isn't wasted.
  const [poleW, setPoleW] = useState<[number, number]>([120, 120])
  useLayoutEffect(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    ctx.font = '13px Arial' // matches td.pole
    const widthOf = (texts: string[]) => {
      const max = Math.max(0, ...texts.map((x) => ctx.measureText(x).width))
      return Math.min(POLE_CAP, Math.max(POLE_MIN, Math.ceil(max) + POLE_PAD))
    }
    setPoleW([
      widthOf([t('result.emergentCol'), ...constructs.map((c) => c.emergent)]),
      widthOf([t('result.contrastCol'), ...constructs.map((c) => c.contrast)]),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constructs, language])

  // Crosshair highlight: sel = [construct row, display column], or null.
  const [sel, setSel] = useState<[number, number] | null>(null)
  const toggleCell = (r: number, c: number) =>
    setSel((prev) => (prev && prev[0] === r && prev[1] === c ? null : [r, c]))
  const hlRow = (r: number) => (interactive && sel && sel[0] === r ? ' rg-hl' : '')
  const hlCol = (c: number) => (interactive && sel && sel[1] === c ? ' rg-hl' : '')
  const hlCell = (r: number, c: number) =>
    interactive && sel && (sel[0] === r || sel[1] === c) ? ' rg-hl' : ''

  const minWidth = 22 + VALENCE_W + 180 + 34 * characters.length + poleW[0] + poleW[1]

  return (
    <div className="rg-scroll">
      {/* Fill the container width; X/Y (no fixed width) absorb the extra beyond the fixed
          columns, but never shrink below the natural width (poleW floor → scrolls). */}
      <table className="rg-grid" style={{ width: '100%', minWidth }}>
        <colgroup>
          <col style={{ width: 22 }} />
          <col style={{ width: VALENCE_W }} />
          <col style={{ width: 180 }} />
          {characters.map((_, i) => (
            <col key={i} style={{ width: 34 }} />
          ))}
          <col />
          <col />
        </colgroup>

        <thead>
          {/* column-letter gutter (the valences column carries no letter) */}
          <tr>
            <th className="gc cnr" />
            <th className="gc" />
            <th className="gc">A</th>
            {characters.map((_, i) => (
              <th key={i} className="gc">
                {colLetter(i)}
              </th>
            ))}
            <th className="gc">X</th>
            <th className="gc">Y</th>
          </tr>

          {/* row 1 — names (vertical, colour-grouped) + pole column titles */}
          <tr>
            <td className="rnum">1</td>
            <td className="valhead">
              <span className="valt">{t('result.valencesCol')}</span>
            </td>
            <td className="diag">
              <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                <line x1="0" y1="0" x2="100" y2="100" />
              </svg>
              <span className="lbl tr">{t('result.names')}</span>
              <span className="lbl bl">{t('result.classes')}</span>
            </td>
            {characters.map((pos, i) => (
              <td key={i} className={`lab namerow b-bottom${hlCol(i)}`}>
                <span className="t">{names[pos] || '—'}</span>
              </td>
            ))}
            <td className="pole em b-bottom b-left rg-title">{t('result.emergentCol')}</td>
            <td className="pole co b-bottom rg-title">{t('result.contrastCol')}</td>
          </tr>
        </thead>

        <tbody>
          {constructs.map((c, k) => {
            const triad = TRIADS[k].map((p) => p - 1)
            const odd = c.oddPos
            const val = VALENCES.find((g) => g.start === k) // render the merged cell at group start
            return (
              <tr key={k} className={k % 2 === 1 ? 'zebra' : undefined}>
                <td className="rnum">{k + 2}</td>
                {val && (
                  <td
                    rowSpan={val.span}
                    className="val val-middle"
                    style={{ backgroundColor: val.color }}
                  >
                    <span className="valt">{t(`result.${val.key}`)}</span>
                  </td>
                )}
                <td className={`cls b-right${hlRow(k)}`} style={{ backgroundColor: classGroupBg(k) }}>
                  {classes[k]}
                </td>
                {characters.map((pos, i) => {
                  const inTriad = triad.includes(pos)
                  const matched = (odd !== null && inTriad && pos !== odd) || c.selected.includes(pos)
                  const cls = ['cell', matched ? 'match' : '', hlCell(k, i).trim()]
                    .filter(Boolean)
                    .join(' ')
                  const diag =
                    highlight && (pos === highlight.a || pos === highlight.b)
                      ? highlight.rows[k]
                      : undefined
                  return (
                    <td
                      key={i}
                      className={cls}
                      onClick={interactive ? () => toggleCell(k, i) : undefined}
                    >
                      {diag && <span className={`rg-diag rg-diag-${diag}`} aria-hidden="true" />}
                      {inTriad && <span className="rg-frame" aria-hidden="true" />}
                    </td>
                  )
                })}
                <td className={`pole em b-left${hlRow(k)}`}>{c.emergent}</td>
                <td className={`pole co${hlRow(k)}`}>{c.contrast}</td>
              </tr>
            )
          })}

          {/* row 24 — roles (vertical, colour-grouped); the valences column is empty here */}
          <tr>
            <td className="rnum">24</td>
            <td className="val" />
            <td className="diag">
              <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                <line x1="0" y1="100" x2="100" y2="0" />
              </svg>
              <span className="lbl tl">{t('result.classes')}</span>
              <span className="lbl br">{t('result.roles')}</span>
            </td>
            {characters.map((pos, i) => (
              <td key={i} className={`lab rolerow b-top${hlCol(i)}`}>
                <span className="t">{roles[pos]}</span>
              </td>
            ))}
            <td className="pole b-left" />
            <td className="pole" />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
