import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import type { Locale } from '@/i18n/config'

export type Theme = 'light' | 'dark'

interface PrefsState {
  language: Locale
  theme: Theme
  setLanguage: (locale: Locale) => void
  toggleTheme: () => void
}

/**
 * Client preferences — language + theme — persisted GLOBALLY under one key, deliberately NOT
 * role-scoped like the session store. This way a user's language/theme follow them across testee
 * and observer modes in the same browser (opening a `/w/…` link keeps their choices). Session data
 * (board + analysis) stays in useAppStore under its role-scoped key.
 */

// First-visit locale detection — the client-side stand-in for the Accept-Language header. The
// browser's ordered `navigator.languages` is the same preference data that header carries.
// Rule: Ukrainian → uk, Russian → ru, anything else → en.
function detectLocale(): Locale {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const l of langs) {
      const code = (l || '').toLowerCase()
      if (code.startsWith('uk')) return 'uk'
      if (code.startsWith('ru')) return 'ru'
      if (code.startsWith('en')) return 'en'
    }
  } catch {
    // navigator unavailable (e.g. SSR) — fall through
  }
  return 'en'
}

// Initial prefs. Precedence: a saved choice (persist rehydrates over this) → migrate from the old
// pre-split store so nobody's choice resets → detect from the browser locale on first visit.
function initialPrefs(): { language: Locale; theme: Theme } {
  try {
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('repgrid:prefs')) return { language: DEFAULT_LOCALE, theme: 'light' }
      const old = JSON.parse(localStorage.getItem('repgrid') || '{}')?.state
      if (old && (old.language || old.theme)) {
        return { language: old.language ?? DEFAULT_LOCALE, theme: old.theme ?? 'light' }
      }
    }
  } catch {
    // ignore malformed storage
  }
  return { language: detectLocale(), theme: 'light' }
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      ...initialPrefs(),
      setLanguage: (language) => {
        void i18n.changeLanguage(language)
        set({ language })
      },
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'repgrid:prefs', version: 1 },
  ),
)
