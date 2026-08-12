import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { LOCALES, LOCALE_LABELS, isLocale } from '@/i18n/config'

/**
 * The top-right control cluster — language selector + dark-mode toggle. Shared by the testee's
 * NavBar and the observer's nav so the two can't drift (language + theme are always per-client).
 */
export function NavControls() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.language)
  const theme = useAppStore((s) => s.theme)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  return (
    <>
      <select
        aria-label={t('nav.language')}
        className="cursor-pointer rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink"
        value={language}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLanguage(e.target.value)
        }}
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>

      <button
        type="button"
        aria-label={t('nav.theme')}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line bg-card text-[15px] text-ink hover:border-ink-3"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>
    </>
  )
}
