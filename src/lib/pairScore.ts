import { TRIADS } from '@/data'
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
