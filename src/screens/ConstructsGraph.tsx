import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Grid10 } from '@/store/useAppStore'
import { rhoMatrix, fmtRho2 } from '@/lib/spearman'
import './resultGrid.css'

// The viewBox is the square plot (left/bottom scales) PLUS a right-hand column that holds the name
// bubbles + the X-axis title, so everything lives in one coordinate system and scales together.
const ML = 96 // left scale
const MT = 42 // room for the Y-axis title atop the axis
const MB = 120 // room for the (staggered) X-axis value marks below the axis
const PLOT = 480
const PL = ML
const PT = MT
const PR = ML + PLOT // 576
const PB = MT + PLOT // 522
const BUB_X = PR + 18 // left edge of the right-hand bubble column + the X-axis title
const BUB_H = 22 // uniform bubble height (one line) → used for vertical packing
const BUB_GAP = 5
const VBW = BUB_X + 240 // room for a bubble; longer pairs overflow right (rare)
const VBH = MT + PLOT + MB

type Pole = { em: string; co: string }

/**
 * Construct relations graph — a Spearman scatter built from the ρ²×100 column sums (`∑`): biggest ∑
 * → axis X, 2nd → axis Y; every other construct is a dot at (ρ²×100 with X, ρ²×100 with Y). Positive
 * quarter only; both axes run from a floor computed from BOTH show11 states (so the scale is stable
 * when the 11th toggles) up to 100, drawn as ruler ticks (major every 5 + numbers, minor every 1).
 *
 * Hover or click a dot to show its detail: dotted guides to both axes, its two values marked on the
 * scales (the X value staggers so numbers never overlap), and a name bubble. Bubbles live in a
 * right-hand column (packed near their dot's height, never overlapping each other or any dot) joined
 * to their dot by a dotted leader. Clicking freezes/unfreezes a dot. `toggleSignal` flips ALL dots'
 * detail (off if any shown, else on); `onDetailChange` reports how many are frozen; a `show11` change
 * clears the selection.
 */
export function ConstructsGraph({
  grid10,
  ranking,
  show11 = true,
  toggleSignal = 0,
  onDetailChange,
  interactive = true,
}: {
  grid10: Grid10 | null
  ranking: number[][] | null
  show11?: boolean
  toggleSignal?: number
  onDetailChange?: (count: number) => void
  interactive?: boolean
}) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState<number | null>(null)
  const [frozen, setFrozen] = useState<Set<number>>(new Set())

  // Clear the selection when the axes change (11th toggle).
  useEffect(() => {
    setFrozen(new Set())
    setHovered(null)
  }, [show11])

  const data = useMemo(() => {
    if (!grid10 || !ranking) return null
    const allPoles: Pole[] = [
      ...grid10.groups.map((g) => ({ em: g.emergent, co: g.contrast })),
      { em: t('g10.goodPole'), co: t('g10.badPole') },
    ]
    const polesOff = allPoles.slice(0, -1)
    const m = rhoMatrix(ranking)
    const r2 = (i: number, j: number) => Number(fmtRho2(m[i][j])) // the ρ²×100 table value
    const pick = (poles: Pole[]) => {
      const n = poles.length
      const sums = poles.map((_, j) => {
        let s = 0
        for (let i = 0; i < n; i++) if (i !== j) s += r2(i, j)
        return s
      })
      const order = poles.map((_, k) => k).sort((a, b) => sums[b] - sums[a])
      const X = order[0]
      const Y = order[1]
      const dots = poles.map((_, k) => k).filter((k) => k !== X && k !== Y)
      const axisVals: number[] = []
      for (let k = 0; k < n; k++) {
        if (k !== X) axisVals.push(r2(k, X))
        if (k !== Y) axisVals.push(r2(k, Y))
      }
      return { X, Y, dots, axisVals }
    }
    const resOn = pick(allPoles)
    const resOff = pick(polesOff)
    // Floor from the lowest plotted value across BOTH toggle states → consistent scale either way.
    const minVal = Math.floor(Math.min(...resOn.axisVals, ...resOff.axisVals) - 5)
    const cur = show11 ? resOn : resOff
    const poles = show11 ? allPoles : polesOff
    return { poles, r2, X: cur.X, Y: cur.Y, dots: cur.dots, minVal }
  }, [grid10, ranking, show11, t])

  // Toggle ALL dots' detail (Toggle-detailed-view button): off if any are shown, else on.
  const dotsForRef = data?.dots ?? []
  const dotsRef = useRef(dotsForRef)
  dotsRef.current = dotsForRef
  useEffect(() => {
    if (toggleSignal > 0) setFrozen((prev) => (prev.size > 0 ? new Set() : new Set(dotsRef.current)))
  }, [toggleSignal])

  // Report how many dots are in detailed (frozen) view, so the toolbar button can reflect it.
  const onDetailRef = useRef(onDetailChange)
  onDetailRef.current = onDetailChange
  useEffect(() => {
    onDetailRef.current?.(frozen.size)
  }, [frozen])

  if (!data) {
    return (
      <div className="rg-scroll grid min-h-[220px] place-items-center p-8 text-center">
        <p className="max-w-sm text-sm text-ink-2">{t('g10.rankEmptyNote')}</p>
      </div>
    )
  }

  const { poles, r2, X, Y, dots, minVal } = data
  const px = (v: number) => PL + ((v - minVal) / (100 - minVal)) * PLOT
  const py = (v: number) => PT + ((100 - v) / (100 - minVal)) * PLOT
  const xOf = (a: number) => r2(a, X)
  const yOf = (a: number) => r2(a, Y)
  const fmt1 = (v: number) => v.toFixed(1)

  const majorVals: number[] = []
  for (let g = Math.ceil(minVal / 5) * 5; g <= 100; g += 5) majorVals.push(g)
  const minorVals: number[] = []
  for (let g = Math.ceil(minVal); g <= 100; g++) if (g % 5 !== 0) minorVals.push(g)

  const shown = dots.filter((a) => frozen.has(a) || a === hovered)

  // Stagger the X-axis value labels onto levels so their numbers never overlap horizontally.
  const levelLastRight: number[] = []
  const levelOf = new Map<number, number>()
  ;[...shown]
    .sort((a, b) => px(xOf(a)) - px(xOf(b)))
    .forEach((a) => {
      const cx = px(xOf(a))
      let lvl = 0
      while (levelLastRight[lvl] !== undefined && cx - levelLastRight[lvl] < 34) lvl++
      levelOf.set(a, lvl)
      levelLastRight[lvl] = cx
    })

  // Bubbles: a right-hand column, each near its dot's height but greedily pushed down so none
  // overlaps the one above (uniform height). Clamped to stay clear of the X-axis title at the bottom.
  const bubbleCy = new Map<number, number>()
  let prevBottom = -Infinity
  ;[...shown]
    .sort((a, b) => py(yOf(a)) - py(yOf(b)))
    .forEach((a) => {
      const desired = Math.min(Math.max(py(yOf(a)), PT + BUB_H / 2), PB - 26)
      const cy = Math.max(desired, prevBottom + BUB_GAP + BUB_H / 2)
      bubbleCy.set(a, cy)
      prevBottom = cy + BUB_H / 2
    })
  const bubW = (p: Pole) => ((p.em || '—').length + (p.co || '—').length + 3) * 7.4 + 16

  const toggleDot = (a: number) =>
    setFrozen((prev) => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a)
      else next.add(a)
      return next
    })

  const poleTspans = (p: Pole) => (
    <>
      <tspan className="cg-em">{p.em || '—'}</tspan>
      <tspan className="cg-sep"> / </tspan>
      <tspan className="cg-co">{p.co || '—'}</tspan>
    </>
  )

  return (
    <div className="cg-wrap">
      <svg className="cg-svg" viewBox={`0 0 ${VBW} ${VBH}`}>
        {/* axes */}
        <line className="cd-axis" x1={PL} y1={PB} x2={PR} y2={PB} />
        <line className="cd-axis" x1={PL} y1={PT} x2={PL} y2={PB} />

        {/* ruler ticks — minor every 1, major every 5 (+ numbers) */}
        {minorVals.map((g) => (
          <g key={`mn${g}`}>
            <line className="cg-tick-mn" x1={px(g)} y1={PB} x2={px(g)} y2={PB + 3} />
            <line className="cg-tick-mn" x1={PL} y1={py(g)} x2={PL - 3} y2={py(g)} />
          </g>
        ))}
        {majorVals.map((g) => (
          <g key={`mj${g}`}>
            <line className="cg-tick" x1={px(g)} y1={PB} x2={px(g)} y2={PB + 6} />
            <line className="cg-tick" x1={PL} y1={py(g)} x2={PL - 6} y2={py(g)} />
            <text className="cd-num" x={px(g)} y={PB + 16} textAnchor="middle">
              {g}
            </text>
            <text className="cd-num" x={PL - 10} y={py(g)} textAnchor="end" dominantBaseline="middle">
              {g}
            </text>
          </g>
        ))}

        {/* axis titles — continuations of the axes (Y atop, X to the right); no X/Y tags */}
        <text className="cg-atitle" x={PL} y={PT - 12} textAnchor="start">
          {poleTspans(poles[Y])}
        </text>
        <text className="cg-atitle" x={PR + 12} y={PB} textAnchor="start" dominantBaseline="middle">
          {poleTspans(poles[X])}
        </text>

        {/* detail for shown dots: guides, value marks, leader line + bubble */}
        {shown.map((a) => {
          const cx = px(xOf(a))
          const cy = py(yOf(a))
          const lvl = levelOf.get(a) ?? 0
          const by = bubbleCy.get(a) ?? cy
          const w = bubW(poles[a])
          return (
            <g key={`s${a}`}>
              <line className="cg-drop" x1={cx} y1={cy} x2={cx} y2={PB} />
              <line className="cg-drop" x1={cx} y1={cy} x2={PL} y2={cy} />
              <line className="cg-vtick" x1={cx} y1={PB} x2={cx} y2={PB + 5} />
              <line className="cg-vtick" x1={PL} y1={cy} x2={PL - 5} y2={cy} />
              <text className="cg-vnum" x={cx} y={PB + 28 + lvl * 13} textAnchor="middle">
                {fmt1(xOf(a))}
              </text>
              <text className="cg-vnum" x={PL - 28} y={cy} textAnchor="end" dominantBaseline="middle">
                {fmt1(yOf(a))}
              </text>
              {/* leader: dot → bubble left edge */}
              <line className="cg-leader" x1={cx} y1={cy} x2={BUB_X} y2={by} />
              <g className="cg-bub">
                <rect x={BUB_X} y={by - BUB_H / 2} width={w} height={BUB_H} rx={5} />
                <text x={BUB_X + 8} y={by} dominantBaseline="middle">
                  {poleTspans(poles[a])}
                </text>
              </g>
            </g>
          )
        })}

        {/* dots (outline by default, filled when shown) + hit areas */}
        {dots.map((a) => {
          const cx = px(xOf(a))
          const cy = py(yOf(a))
          const on = frozen.has(a) || a === hovered
          return (
            <g key={`d${a}`}>
              <circle className={`cg-dot${on ? ' on' : ''}`} cx={cx} cy={cy} r={5} />
              {interactive && (
                <circle
                  className="cg-hit"
                  cx={cx}
                  cy={cy}
                  r={11}
                  onMouseEnter={() => setHovered(a)}
                  onMouseLeave={() => setHovered((h) => (h === a ? null : h))}
                  onClick={() => toggleDot(a)}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
