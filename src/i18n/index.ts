import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LOCALE, LOCALES } from './config'
import type { Locale } from './config'
import { en } from './locales/en'
import { uk } from './locales/uk'
import { ru } from './locales/ru'

export const resources = {
  en: { translation: en },
  uk: { translation: uk },
  ru: { translation: ru },
} as const

/** Initialise i18next once, with the given starting language. */
export function initI18n(lng: Locale = DEFAULT_LOCALE) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: [...LOCALES],
      interpolation: { escapeValue: false },
    })
  }
  return i18n
}

export default i18n
