/**
 * The 22 predefined triads, in fixed presentation order.
 *
 * Each value is a CARD POSITION, 1-based: card 1 = role "Me", card 2 = "Mother", …,
 * card 22 = "Highly moral person" (see ROLES). Triads are fixed relative to card
 * positions, not to the testee's answers.
 *
 * Triad k (1-based) fills result-grid row k+1 — triad 1 → row 2, … triad 22 → row 23 —
 * and pairs with the class label at the same row (see CLASSES).
 *
 * Note: cards 10, 11, 12 (status figure / doctor / neighbour) never appear in any triad —
 * they still receive ✓/blank via the "who else fits" selection, but never anchor a triad.
 */
export type Triad = readonly [number, number, number]

export const TRIADS: readonly Triad[] = [
  [20, 21, 22], // 1
  [17, 18, 19], // 2
  [13, 14, 16], // 3
  [6, 7, 8], //    4
  [2, 3, 4], //    5
  [5, 17, 21], //  6
  [2, 9, 17], //   7
  [3, 19, 20], //  8
  [4, 13, 18], //  9
  [5, 13, 18], //  10
  [5, 14, 22], //  11
  [4, 9, 15], //   12
  [6, 15, 21], //  13
  [2, 6, 7], //    14
  [3, 6, 7], //    15
  [8, 9, 16], //   16
  [1, 4, 5], //    17
  [19, 20, 22], // 18
  [2, 3, 15], //   19
  [1, 14, 16], //  20
  [7, 13, 14], //  21
  [1, 6, 8], //    22
] as const

export const TRIAD_COUNT = TRIADS.length
