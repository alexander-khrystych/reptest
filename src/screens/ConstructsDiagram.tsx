import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { constructScore } from '@/lib/pairScore'
import './resultGrid.css'

const MIN = -6
const MAX = 22
const RANGE = MAX - MIN // 28

// SVG viewBox layout (units). The whole diagram scales to fit its box / an A4-landscape page.
const VB_W = 1200
const AXIS_X = 44 // y-axis x (kept tight so the chart sits close to the selector)
const CHART_TOP = 12 // y at +22
const UNIT = 20 // px per scale unit
const CHART_BOTTOM = CHART_TOP + RANGE * UNIT // y at -6
const Y0 = CHART_TOP + MAX * UNIT // y at 0 — the x-axis
const CHART_RIGHT = 1140 // right margin left for the last tilted label
const BAR_W = 26
const LABEL_TOP = CHART_BOTTOM + 12
const LABEL_FS = 14
const LH = 17 // label line height (two lines: elicited over contrast)
const PAD = 4
const VB_H = 864 // room below for the 45°-tilted two-line labels

// Pale column fills (spec), each with a 1px black frame; the score numbers sit above/below.
const POS_FILL = 'rgba(39,174,96,0.16)'
const NEG_FILL = 'rgba(231,76,60,0.16)'
const FRAME = '#000000'

const yOf = (v: number) => CHART_TOP + (MAX - v) * UNIT
const ticks = Array.from({ length: RANGE + 1 }, (_, i) => MIN + i) // -6 … 22

/**
 * Constructs diagram — a diverging bar chart of the selected construct's relation to every OTHER
 * construct (`constructScore`, the row-to-row transpose of the character pair score). Each column
 * shows `+P` (shared) as a pale-green bar above the x-axis and `-N` (opposed) as a pale-red bar
 * below, over a −6…+22 scale; the score numbers sit on top of / beneath each bar. The selected
 * construct is omitted (no self-column). The left panel lists all constructs (both poles, tinted
 * like the main table); click either pole to pick that construct. Sized for one A4-landscape page.
 */
export function ConstructsDiagram({
  selected,
  onSelect,
}: {
  selected: number
  onSelect: (k: number) => void
}) {
  const constructs = useAppStore((s) => s.constructs)

  // Every construct except the selected one, with its relation score to the selection.
  const cols = useMemo(
    () =>
      constructs
        .map((c, k) => ({ c, k }))
        .filter(({ k }) => k !== selected)
        .map(({ c, k }) => ({ c, k, score: constructScore(constructs, selected, k) })),
    [constructs, selected],
  )

  // Widest pole per column (canvas-measured) → the two-tone label background width.
  const widths = useMemo(() => {
    const ctx = document.createElement('canvas').getContext('2d')
    if (ctx) ctx.font = `${LABEL_FS}px Arial`
    const m = (s: string) => (ctx ? ctx.measureText(s || '—').width : 40)
    return cols.map(({ c }) => Math.max(m(c.emergent), m(c.contrast)))
  }, [cols])

  const slot = cols.length ? (CHART_RIGHT - AXIS_X) / cols.length : 0
  const sel = constructs[selected]

  return (
    <div className="cd-wrap">
      {/* left — construct selector: click either pole to diagram that construct's relations */}
      <div className="cd-selector rg-noprint">
        {constructs.map((c, k) => (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            className={`cd-srow${k === selected ? ' cd-srow-on' : ''}`}
          >
            <span className="cd-spole cd-pole-e">{c.emergent || '—'}</span>
            <span className="cd-spole cd-pole-c">{c.contrast || '—'}</span>
          </button>
        ))}
      </div>

      {/* the diagram */}
      <div className="cd-chart">
        <div className="cd-caption">
          <span className="cd-spole cd-pole-e">{sel?.emergent || '—'}</span>
          <span className="cd-spole cd-pole-c">{sel?.contrast || '—'}</span>
        </div>
        <svg className="cd-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMin meet">
          {/* horizontal gridlines from every 5th scale point (0 is the x-axis, drawn below) */}
          {ticks
            .filter((v) => v % 5 === 0 && v !== 0)
            .map((v) => (
              <line key={`g${v}`} className="cd-grid" x1={AXIS_X} y1={yOf(v)} x2={CHART_RIGHT} y2={yOf(v)} />
            ))}
          {/* x-axis (0) + y-axis */}
          <line className="cd-axis" x1={AXIS_X} y1={Y0} x2={CHART_RIGHT} y2={Y0} />
          <line className="cd-axis" x1={AXIS_X} y1={yOf(MAX)} x2={AXIS_X} y2={yOf(MIN)} />
          {/* scale ticks (every 1, longer + numbered every 5) */}
          {ticks.map((v) => {
            const long = v % 5 === 0
            return (
              <g key={`t${v}`}>
                <line
                  className="cd-tick"
                  x1={AXIS_X - (long ? 8 : 4)}
                  y1={yOf(v)}
                  x2={AXIS_X}
                  y2={yOf(v)}
                />
                {long && (
                  <text
                    className="cd-num"
                    x={AXIS_X - 10}
                    y={yOf(v)}
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {v}
                  </text>
                )}
              </g>
            )
          })}
          {/* one column per other construct: pale-green +P above, pale-red −N below, with the
              score numbers on top / beneath, and a rotated two-line label (elicited over contrast) */}
          {cols.map(({ c, k, score }, i) => {
            const { pos, neg } = score
            const cx = AXIS_X + slot * i + slot / 2
            const barX = cx - BAR_W / 2
            const w = widths[i] + 2 * PAD
            return (
              <g key={k}>
                {pos > 0 && (
                  <rect
                    x={barX}
                    y={yOf(pos)}
                    width={BAR_W}
                    height={pos * UNIT}
                    fill={POS_FILL}
                    stroke={FRAME}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {pos > 0 && (
                  <text className="cd-score" x={cx} y={yOf(pos) - 4} textAnchor="middle">
                    +{pos}
                  </text>
                )}
                {neg > 0 && (
                  <rect
                    x={barX}
                    y={Y0}
                    width={BAR_W}
                    height={neg * UNIT}
                    fill={NEG_FILL}
                    stroke={FRAME}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {neg > 0 && (
                  <text
                    className="cd-score"
                    x={cx}
                    y={yOf(-neg) + 4}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                  >
                    -{neg}
                  </text>
                )}
                {/* label — tilted 45°, two lines (elicited pole over contrast pole) */}
                <g transform={`translate(${cx} ${LABEL_TOP}) rotate(45)`}>
                  <rect className="cd-pole-e cd-lblbg" x={0} y={0} width={w} height={LH} />
                  <text className="cd-lbl" x={PAD} y={LH / 2} dominantBaseline="middle">
                    {c.emergent || '—'}
                  </text>
                  <rect className="cd-pole-c cd-lblbg" x={0} y={LH} width={w} height={LH} />
                  <text className="cd-lbl" x={PAD} y={LH + LH / 2} dominantBaseline="middle">
                    {c.contrast || '—'}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
