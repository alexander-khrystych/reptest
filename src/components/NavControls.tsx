import { useTranslation } from 'react-i18next'
import { usePrefsStore } from '@/store/usePrefsStore'
import { LOCALES, LOCALE_LABELS, isLocale } from '@/i18n/config'

function SunIcon() {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 1.5v3M12 19.5v3M3.4 3.4l2.1 2.1M18.5 18.5l2.1 2.1M1.5 12h3M19.5 12h3M3.4 20.6l2.1-2.1M18.5 5.5l2.1-2.1" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      className="h-[17px] w-[17px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

/**
 * The top-right control cluster — language selector + dark-mode toggle. Shared by the testee's
 * NavBar and the observer's nav. Both controls are h-9 to line up with the Share / Leave buttons;
 * the select uses a custom chevron (appearance-none) for exact arrow placement.
 */
export function NavControls() {
  const { t } = useTranslation()
  const language = usePrefsStore((s) => s.language)
  const theme = usePrefsStore((s) => s.theme)
  const setLanguage = usePrefsStore((s) => s.setLanguage)
  const toggleTheme = usePrefsStore((s) => s.toggleTheme)

  return (
    // z-[100] keeps language + theme above any open dialog scrim, so they stay interactive and
    // clicking them never closes a dialog (even a stacked one).
    <div className="relative z-[100] flex items-center gap-3">
      <div className="relative">
        <select
          aria-label={t('nav.language')}
          className="h-9 cursor-pointer appearance-none rounded-lg border border-line bg-card pl-3 pr-8 text-sm text-ink hover:border-ink-3"
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
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      <button
        type="button"
        aria-label={t('nav.theme')}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line bg-card text-ink hover:border-ink-3"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  )
}
