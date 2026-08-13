/** Supported UI locales. Internal codes are en / uk / ru (note Ukrainian is `uk`). */
export const LOCALES = ['en', 'uk', 'ru'] as const
export type Locale = (typeof LOCALES)[number]

/** Ukrainian is the default per spec. */
export const DEFAULT_LOCALE: Locale = 'uk'

/** Display labels shown in the language dropdown — UA (not `uk`), EN, RU. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  uk: 'UA',
  ru: 'RU',
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}
