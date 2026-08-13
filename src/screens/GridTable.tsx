import { useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { usePrefsStore } from '@/store/usePrefsStore'
import { ROLES, CLASSES, TRIADS } from '@/data'
import type { PairVerdict } from '@/lib/pairScore'
import './resultGrid.css'

/** Column-letter for a character column: B, C, … (0-based display index → letter). */
const colLetter = (i: number) => String.fromCharCode(66 + i)

const POLE_CAP = 140 // max X/Y column width; longer values wrap to a second line
const POLE_MIN = 64
const POLE_PAD = 22

/**
 * The seven character groups, keyed by the character's fixed position (0 = Me, 1–4 = family, …).
 * Each carries a pale tint — shown on the merged "groups" row and echoed on the names row below it
 * — plus an i18n label. Keying on the character index (not the display column) means a custom
 * subset keeps every character's own group colour, while the complete table reproduces the
 * B / C:F / G:J / K:M / N:Q / R:T / U:W letter ranges from the spec exactly.
 */
const GROUPS = [
  { max: 0, key: 'groupMe', color: 'rgba(231,76,60,0.16)' }, // B — me (red)
  { max: 4, key: 'groupFamily', color: 'rgba(142,68,173,0.15)' }, // C:F — family (violet)
  { max: 8, key: 'groupClose', color: 'rgba(230,126,34,0.17)' }, // G:J — close ones (orange)
  { max: 11, key: 'groupSituational', color: 'rgba(41,128,185,0.15)' }, // K:M — situational (blue)
  { max: 15, key: 'groupRelations', color: 'rgba(241,196,15,0.24)' }, // N:Q — relationships (yellow)
  { max: 18, key: 'groupAuthority', color: 'rgba(232,67,147,0.14)' }, // R:T — authority (pink)
  { max: 21, key: 'groupValues', color: 'rgba(39,174,96,0.16)' }, // U:W — values (green)
] as const
const groupOf = (pos: number) => GROUPS.find((g) => pos <= g.max) ?? GROUPS[GROUPS.length - 1]

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
 * The row structure is invariant — the group row, the class column (A) and both poles (X =
 * elicited, Y = contrast) are always present; only which characters (B, C, …) appear varies.
 * `characters` = [0..21] reproduces the complete default table; a shorter list is a custom
 * comparison. Each body row derives from its construct: a ✓ on the emergent-tint fill where a
 * card is in the alike pair or was selected, a pale-blue frame (on top) on the three triad cards.
 *
 * Row numbering (left gutter): the character/names row is 0, the 22 construct rows are 1–22, and
 * the roles row is 23; the merged groups row above the names carries no number.
 */
export function GridTable({ characters, interactive = true, highlight = null }: GridTableProps) {
  const { t } = useTranslation()
  const language = usePrefsStore((s) => s.language)
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

  // Merge consecutive same-group character columns into the colSpans of the "groups" row.
  const groupRuns: { key: string; color: string; span: number }[] = []
  characters.forEach((pos) => {
    const g = groupOf(pos)
    const last = groupRuns[groupRuns.length - 1]
    if (last && last.key === g.key) last.span++
    else groupRuns.push({ key: g.key, color: g.color, span: 1 })
  })

  const minWidth = 22 + 180 + 34 * characters.length + poleW[0] + poleW[1]

  return (
    <div className="rg-scroll">
      {/* Fill the container width; X/Y (no fixed width) absorb the extra beyond the fixed
          columns, but never shrink below the natural width (poleW floor → scrolls). */}
      <table className="rg-grid" style={{ width: '100%', minWidth }}>
        <colgroup>
          <col style={{ width: 22 }} />
          <col style={{ width: 180 }} />
          {characters.map((_, i) => (
            <col key={i} style={{ width: 34 }} />
          ))}
          <col />
          <col />
        </colgroup>

        <thead>
          {/* column-letter gutter */}
          <tr>
            <th className="gc cnr" />
            <th className="gc">A</th>
            {characters.map((_, i) => (
              <th key={i} className="gc">
                {colLetter(i)}
              </th>
            ))}
            <th className="gc">X</th>
            <th className="gc">Y</th>
          </tr>

          {/* groups row — merged, colour-grouped labels above the character names */}
          <tr>
            <td className="rnum" />
            <td className="grphead">{t('result.groups')}</td>
            {groupRuns.map((run, i) => (
              <td key={i} colSpan={run.span} className="grp" style={{ backgroundColor: run.color }}>
                {t(`result.${run.key}`)}
              </td>
            ))}
            <td className="pole" />
            <td className="pole" />
          </tr>

          {/* row 0 — names (vertical, colour-grouped) + pole column titles */}
          <tr>
            <td className="rnum">0</td>
            <td className="diag">
              <svg preserveAspectRatio="none" viewBox="0 0 100 100">
                <line x1="0" y1="0" x2="100" y2="100" />
              </svg>
              <span className="lbl tr">{t('result.names')}</span>
              <span className="lbl bl">{t('result.classes')}</span>
            </td>
            {characters.map((pos, i) => (
              <td
                key={i}
                className={`lab namerow b-bottom${hlCol(i)}`}
                style={{ backgroundColor: groupOf(pos).color }}
              >
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
            return (
              <tr key={k} className={k % 2 === 1 ? 'zebra' : undefined}>
                <td className="rnum">{k + 1}</td>
                <td className={`cls b-right${hlRow(k)}`}>{classes[k]}</td>
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

          {/* row 23 — roles (vertical) */}
          <tr>
            <td className="rnum">23</td>
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
