/**
 * Spearman rank correlation across the 10×10 flow's rankings.
 *
 * `orders[k]` is construct k's ranking: the character-slot indices (0-based) in ranked order, so
 * `orders[k][0]` is the character ranked #1 for that construct and `orders[k][n-1]` the last. Each
 * ranking is a full permutation of the same n slots.
 *
 * The coefficient uses the project's fixed formula (note: no leading factor of 6):
 *
 *     ρ = 1 − Σd² / (n³ − n)
 *
 * where, for each rank position i, d is the difference between the character slot ranked i-th under
 * construct a and the slot ranked i-th under construct b — i.e. `orders[a][i] − orders[b][i]`. This
 * matches the reference script exactly (`data[c].indexOf(i+1)` there is `orders[c][i]` here). The
 * diagonal (a === b) is therefore always 1.
 */
export function rhoMatrix(orders: number[][]): number[][] {
  const n = orders[0]?.length ?? 0
  const denom = n ** 3 - n || 1
  return orders.map((oa) =>
    orders.map((ob) => {
      let sumD2 = 0
      for (let i = 0; i < n; i++) sumD2 += (oa[i] - ob[i]) ** 2
      return 1 - sumD2 / denom
    }),
  )
}

/** ρ formatted to 4 decimals (e.g. "0.8061"), for the ρ matrix. */
export const fmtRho = (rho: number): string => rho.toFixed(4)

/** ρ² × 100 formatted to 3 decimals (e.g. "65.061"), for the second matrix. */
export const fmtRho2 = (rho: number): string => (rho * rho * 100).toFixed(3)
