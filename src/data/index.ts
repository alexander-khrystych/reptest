import { z } from 'zod'
import { LOCALES } from '@/i18n/config'
import { ROLES } from './roles'
import { CLASSES } from './classes'
import { TRIADS } from './triads'

export * from './triads'
export * from './roles'
export * from './classes'

/** The grid is 22 names × 22 constructs. */
export const GRID_SIZE = 22

const localizedList = z.array(z.string().min(1)).length(GRID_SIZE)

const triadSchema = z
  .tuple([z.number(), z.number(), z.number()])
  .refine(([a, b, c]) => new Set([a, b, c]).size === 3, 'triad cards must be distinct')
  .refine((t) => t.every((n) => n >= 1 && n <= GRID_SIZE), `card positions must be 1..${GRID_SIZE}`)

/**
 * Assert the fixed domain data is internally consistent: 22 roles and 22 classes in
 * every locale, and 22 triads of three distinct in-range cards. Call once at startup.
 */
export function validateGridData(): void {
  for (const locale of LOCALES) {
    localizedList.parse(ROLES[locale])
    localizedList.parse(CLASSES[locale])
  }
  z.array(triadSchema).length(GRID_SIZE).parse(TRIADS)
}
