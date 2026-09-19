import { TRIADS, GRID_SIZE } from '@/data'
import type { Construct } from '@/store/useAppStore'

/** Per-construct verdict for a pair: 'pos' (+1) or 'neg' (-1); rows scoring 0 are absent. */
export type PairVerdict = 'pos' | 'neg'

export interface PairScore {
  pos: number
  neg: number
  /** construct row index (0-based) → verdict, used to hatch the two characters' cells. */
  rows: Record<number, PairVerdict>
}

/**
 * Does character `pos` sit on the elicited (emergent) pole of construct `c`? Mirrors the ✓
 * rule in the grid: the two alike triad cards, plus everyone marked as also sharing the pole.
 */
const onEmergentPole = (c: Construct, triad: number[], pos: number) =>
  (c.oddPos !== null && triad.includes(pos) && pos !== c.oddPos) || c.selected.includes(pos)

/**
 * Relation score between two characters across all constructs (data analysis).
 *
 * - +1 when both share the elicited pole (both ✓).
 * - -1 when they land on opposite poles AND at least one of them anchored the construct's
 *   triad — a disagreement grounded in the elicitation. Two non-triad characters disagreeing
 *   score 0.
 *
 * Order-independent (a pair is unordered).
 */
export function pairScore(constructs: Construct[], a: number, b: number): PairScore {
  let pos = 0
  let neg = 0
  const rows: Record<number, PairVerdict> = {}
  constructs.forEach((c, k) => {
    const triad = TRIADS[k].map((p) => p - 1)
    const aOn = onEmergentPole(c, triad, a)
    const bOn = onEmergentPole(c, triad, b)
    if (aOn && bOn) {
      pos += 1
      rows[k] = 'pos'
    } else if (aOn !== bOn && (triad.includes(a) || triad.includes(b))) {
      neg += 1
      rows[k] = 'neg'
    }
  })
  return { pos, neg, rows }
}

/**
 * Relation score between two constructs (rows) — the transpose of `pairScore`: rather than
 * comparing two characters across all constructs, compare two constructs across all characters.
 * - +1 when a character sits on the elicited pole of BOTH constructs.
 * - -1 when a character is on opposite poles of the two AND anchored either construct's triad.
 * So `pos ∈ [0, 22]` (every character) and `neg ∈ [0, 6]` (the union of the two triads). Symmetric.
 */
export function constructScore(constructs: Construct[], k1: number, k2: number): { pos: number; neg: number } {
  const t1 = TRIADS[k1].map((p) => p - 1)
  const t2 = TRIADS[k2].map((p) => p - 1)
  const c1 = constructs[k1]
  const c2 = constructs[k2]
  let pos = 0
  let neg = 0
  for (let ch = 0; ch < GRID_SIZE; ch++) {
    const on1 = onEmergentPole(c1, t1, ch)
    const on2 = onEmergentPole(c2, t2, ch)
    if (on1 && on2) pos += 1
    else if (on1 !== on2 && (t1.includes(ch) || t2.includes(ch))) neg += 1
  }
  return { pos, neg }
}
