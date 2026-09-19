/**
 * The seven character groups, keyed by the character's fixed position (0 = Me, 1–4 = family, …).
 * Each carries a pale tint and an i18n label. Shared by the main grid (its "groups" row + name
 * tints) and the character-relationships matrix (which repeats the same headers on both axes).
 * Keying on the character index (not the display column) means a custom subset keeps every
 * character's own group colour, while the complete set reproduces the B / C:F / G:J / … ranges.
 */
export const GROUPS = [
  { max: 0, key: 'groupMe', color: 'rgba(231,76,60,0.16)' }, // B — me (red)
  { max: 4, key: 'groupFamily', color: 'rgba(142,68,173,0.15)' }, // C:F — family (violet)
  { max: 8, key: 'groupClose', color: 'rgba(230,126,34,0.17)' }, // G:J — close ones (orange)
  { max: 11, key: 'groupSituational', color: 'rgba(41,128,185,0.15)' }, // K:M — situational (blue)
  { max: 15, key: 'groupRelations', color: 'rgba(241,196,15,0.24)' }, // N:Q — relationships (yellow)
  { max: 18, key: 'groupAuthority', color: 'rgba(232,67,147,0.14)' }, // R:T — authority (pink)
  { max: 21, key: 'groupValues', color: 'rgba(39,174,96,0.16)' }, // U:W — values (green)
] as const

export const groupOf = (pos: number) => GROUPS.find((g) => pos <= g.max) ?? GROUPS[GROUPS.length - 1]
