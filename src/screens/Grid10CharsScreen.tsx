import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { usePrefsStore } from '@/store/usePrefsStore'
import { ROLES } from '@/data'

/**
 * 10×10 flow, step 1 — pick the 10 characters for the concentrated grid. "Me" (position 0) is
 * locked-selected; the rest toggle up to a cap of 10. Submit (Next) only at exactly 10.
 */
export function Grid10CharsScreen() {
  const { t } = useTranslation()
  const language = usePrefsStore((s) => s.language)
  const names = useAppStore((s) => s.names)
  const draft = useAppStore((s) => s.g10draft)
  const toggle = useAppStore((s) => s.toggleG10Char)
  const submit = useAppStore((s) => s.submitG10Chars)
  const cancel = useAppStore((s) => s.cancelGrid10)

  const roles = ROLES[language]
  const chosen = draft?.chars ?? []
  const count = chosen.length

  return (
    <div className="mx-auto max-w-[960px]">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-3">{t('g10.step1')}</p>
      <p className="mb-1.5 text-[22px] font-semibold leading-tight">{t('g10.charsTitle')}</p>
      <p className="mb-5 text-sm text-ink-2">{t('g10.charsHint')}</p>

      <div className="mb-5 flex items-center gap-2.5">
        <span className="font-mono text-sm text-ink-2">
          <b className="text-ink">{count}</b> / 10
        </span>
        <span className="inline-block h-1 w-[140px] overflow-hidden rounded bg-line">
          <span className="block h-full bg-primary" style={{ width: `${(count / 10) * 100}%` }} />
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-[9px]">
        {names.map((name, i) => {
          const sel = chosen.includes(i)
          const locked = i === 0
          const atCap = count >= 10 && !sel
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={locked || atCap}
              title={roles[i]}
              className={[
                'relative flex min-h-[66px] flex-col justify-center rounded-[10px] border px-3 py-2 pr-8 text-left transition',
                sel ? 'border-primary bg-primary-tint' : 'border-line bg-card hover:border-ink-3',
                atCap ? 'opacity-40' : '',
              ].join(' ')}
            >
              <span className="line-clamp-2 text-[14px] font-medium leading-tight text-ink">
                {name || '—'}
              </span>
              <span className="mt-0.5 line-clamp-1 text-[11px] text-ink-3">{roles[i]}</span>
              {sel && (
                <span className="absolute right-2.5 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {locked ? '★' : '✓'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-7 flex justify-between gap-3">
        <button
          type="button"
          onClick={cancel}
          className="rounded-[9px] border border-line bg-transparent px-5 py-2.5 text-sm text-ink hover:border-ink-3"
        >
          ← {t('common.back')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={count !== 10}
          className="rounded-[9px] border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
        >
          {t('common.next')} →
        </button>
      </div>
    </div>
  )
}
