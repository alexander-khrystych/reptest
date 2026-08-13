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

// One-time migration: language/theme used to live in the (role-scoped) session store. If the shared
// prefs key isn't written yet, inherit from the old testee store so nobody's choice resets.
function initialPrefs(): { language: Locale; theme: Theme } {
  const fallback = { language: DEFAULT_LOCALE, theme: 'light' as Theme }
  try {
    if (typeof localStorage === 'undefined') return fallback
    if (localStorage.getItem('repgrid:prefs')) return fallback
    const old = JSON.parse(localStorage.getItem('repgrid') || '{}')?.state
    if (old && (old.language || old.theme)) {
      return { language: old.language ?? DEFAULT_LOCALE, theme: old.theme ?? 'light' }
    }
  } catch {
    // ignore malformed storage
  }
  return fallback
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
