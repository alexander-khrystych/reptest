import { useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { usePrefsStore } from '@/store/usePrefsStore'
import { ROLES } from '@/data'
import type { Grid10 } from '@/store/useAppStore'
import { groupOf } from './gridGroups'
import './resultGrid.css'

const colLetter = (i: number) => String.fromCharCode(66 + i)
const COL_W = 68 // character-column width (doubled from the original 34, per spec)
const POLE_CAP = 220
const POLE_MIN = 96
const POLE_PAD = 22

/**
 * The concentrated 10×10 grid (built by the creation flow). Same shape as the main grid but with the
 * class column dropped: a groups row atop the character-names row (both group-tinted), the poles on
 * the right (from the merged constructs), the roles row at the bottom (bound to the chosen chars),
 * and each row's ✓ / triad frame derived from the flow's elicitation. Reuses `resultGrid.css` +
 * `groupOf`, plus the shared click-crosshair every result table carries.
 *
 * Columns are ordered by character group (same-group characters adjacent, groups in the standard
 * order) — the fixed positions 0–21 are already group-ordered, so sorting the chosen slots by their
 * character position groups them exactly like the main table. `order` maps display column → char
 * slot (index into `chars`); the elicit data (triad / oddPos / selected) is in slot coordinates.
 */
export function Grid10Table({
  grid10,
  interactive = true,
}: {
  grid10: Grid10 | null
  interactive?: boolean
}) {
  const { t } = useTranslation()
  const language = usePrefsStore((s) => s.language)
  const names = useAppStore((s) => s.names)
  const roles = ROLES[language]

  const { chars, groups, elicit } = grid10 ?? { chars: [], groups: [], elicit: [] }

  const [poleW, setPoleW] = useState<[number, number]>([120, 120])
  useLayoutEffect(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    ctx.font = '13px Arial'
    const widthOf = (texts: string[]) => {
      const max = Math.max(0, ...texts.map((x) => ctx.measureText(x).width))
      return Math.min(POLE_CAP, Math.max(POLE_MIN, Math.ceil(max) + POLE_PAD))
    }
    setPoleW([
      widthOf([t('result.emergentCol'), ...groups.map((g) => g.emergent)]),
      widthOf([t('result.contrastCol'), ...groups.map((g) => g.contrast)]),
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid10, language])

  const [sel, setSel] = useState<[number, number] | null>(null)
  const toggleCell = (r: number, c: number) =>
    setSel((prev) => (prev && prev[0] === r && prev[1] === c ? null : [r, c]))
  const hlRow = (r: number) => (interactive && sel && sel[0] === r ? ' rg-hl' : '')
  const hlCol = (c: number) => (interactive && sel && sel[1] === c ? ' rg-hl' : '')
  const hlCell = (r: number, c: number) =>
    interactive && sel && (sel[0] === r || sel[1] === c) ? ' rg-hl' : ''

  // Not built yet → an empty placeholder (e.g. an observer, or the testee before building it).
  if (!grid10) {
    return (
      <div className="rg-scroll grid min-h-[220px] place-items-center p-8 text-center">
        <p className="max-w-sm text-sm text-ink-2">{t('g10.gridEmptyNote')}</p>
      </div>
    )
  }

  // Display columns grouped by character group (sort slots by their character position).
  const order = chars.map((_, i) => i).sort((a, b) => chars[a] - chars[b])

  // Merge consecutive same-group character columns into the "groups" row bands.
  const groupRuns: { key: string; color: string; span: number }[] = []
  order.forEach((slot) => {
    const g = groupOf(chars[slot])
    const last = groupRuns[groupRuns.length - 1]
    if (last && last.key === g.key) last.span++
    else groupRuns.push({ key: g.key, color: g.color, span: 1 })
  })

  const rolesRow = groups.length + 1
  const minWidth = 22 + COL_W * order.length + poleW[0] + poleW[1]

  return (
    <div className="rg-scroll">
      <table className="rg-grid" style={{ width: '100%', minWidth }}>
        <colgroup>
          <col style={{ width: 22 }} />
          {order.map((_, i) => (
            <col key={i} style={{ width: COL_W }} />
          ))}
          <col />
          <col />
        </colgroup>

        <thead>
          {/* column-letter gutter */}
          <tr>
            <th className="gc cnr" />
            {order.map((_, i) => (
              <th key={i} className="gc">
                {colLetter(i)}
              </th>
            ))}
            <th className="gc b-left">X</th>
            <th className="gc">Y</th>
          </tr>

          {/* groups row — bands over the character columns; the pole titles merge up into it */}
          <tr>
            <td className="rnum" />
            {groupRuns.map((run, i) => (
              <td
                key={i}
                colSpan={run.span}
                className="grp b-bottom"
                style={{ backgroundColor: run.color }}
              >
                {t(`result.${run.key}`)}
              </td>
            ))}
            <td rowSpan={2} className="pole em b-bottom b-left rg-title">
              {t('result.emergentCol')}
            </td>
            <td rowSpan={2} className="pole co b-bottom rg-title">
              {t('result.contrastCol')}
            </td>
          </tr>

          {/* row 0 — character names (colour-grouped) */}
          <tr>
            <td className="rnum">0</td>
            {order.map((slot, i) => (
              <td
                key={i}
                className={`lab namerow b-bottom${hlCol(i)}`}
                style={{ backgroundColor: groupOf(chars[slot]).color }}
              >
                <span className="t">{names[chars[slot]] || '—'}</span>
              </td>
            ))}
          </tr>
        </thead>

        <tbody>
          {groups.map((g, k) => {
            const e = elicit.find((it) => it.construct === k)
            return (
              <tr key={g.id} className={k % 2 === 1 ? 'zebra' : undefined}>
                <td className="rnum">{k + 1}</td>
                {order.map((slot, i) => {
                  const inTriad = !!e && e.triad.includes(slot)
                  const matched =
                    !!e &&
                    ((e.oddPos !== null && inTriad && slot !== e.oddPos) || e.selected.includes(slot))
                  const cls = ['cell', matched ? 'match' : '', hlCell(k, i).trim()]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <td key={i} className={cls} onClick={interactive ? () => toggleCell(k, i) : undefined}>
                      {inTriad && <span className="rg-frame" aria-hidden="true" />}
                    </td>
                  )
                })}
                <td className={`pole em b-left${hlRow(k)}`}>{g.emergent}</td>
                <td className={`pole co${hlRow(k)}`}>{g.contrast}</td>
              </tr>
            )
          })}

          {/* roles row — bound to the chosen characters */}
          <tr>
            <td className="rnum">{rolesRow}</td>
            {order.map((slot, i) => (
              <td key={i} className={`lab rolerow b-top${hlCol(i)}`}>
                <span className="t">{roles[chars[slot]]}</span>
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
