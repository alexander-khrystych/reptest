import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { LOCALES, LOCALE_LABELS, isLocale } from '@/i18n/config'
import { GRID_SIZE } from '@/data'

/** Top nav: brand on the left; stage progress + language + theme on the right. */
export function NavBar() {
  const { t } = useTranslation()
  const phase = useAppStore((s) => s.phase)
  const names = useAppStore((s) => s.names)
  const triadIndex = useAppStore((s) => s.triadIndex)
  const language = useAppStore((s) => s.language)
  const theme = useAppStore((s) => s.theme)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  // Stage progress: committed names, or the current construct number.
  const progress =
    phase === 'names'
      ? { label: t('names.progress'), n: names.filter((x) => x.trim() !== '').length }
      : phase === 'elicitation'
        ? { label: t('elicit.progress'), n: triadIndex + 1 }
        : null

  return (
    <nav className="rg-noprint mb-7 flex items-center gap-3 border-b border-line-2 py-4">
      <span className="text-[15px] font-semibold">{t('appName')}</span>
      <span className="flex-1" />

      {progress && (
        <span className="hidden items-center gap-2 font-mono text-xs text-ink-2 sm:flex">
          {progress.label} <b className="font-medium text-ink">{progress.n}</b> / {GRID_SIZE}
          <span className="ml-1 inline-block h-1 w-[110px] overflow-hidden rounded bg-line align-middle">
            <span
              className="block h-full bg-primary"
              style={{ width: `${(progress.n / GRID_SIZE) * 100}%` }}
            />
          </span>
        </span>
      )}

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
    </nav>
  )
}
