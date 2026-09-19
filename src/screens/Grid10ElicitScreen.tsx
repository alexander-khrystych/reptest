import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'

/**
 * 10×10 grid creation, step 3 — elicitation over the 10 characters, 10 iterations (one per
 * construct). Each iteration, in order: pick 3 characters for the triad → pick which of the 10
 * constructs it is (each usable once) → tap the odd one out → mark which of the other 7 share the
 * elicited pole → submit. All indices are 0–9 into the flow's `chars` / `groups`.
 */
export function Grid10ElicitScreen() {
  const { t } = useTranslation()
  const names = useAppStore((s) => s.names)
  const draft = useAppStore((s) => s.g10draft)
  const toggleTriad = useAppStore((s) => s.toggleG10Triad)
  const setConstruct = useAppStore((s) => s.setG10Construct)
  const setOdd = useAppStore((s) => s.setG10Odd)
  const toggleMatch = useAppStore((s) => s.toggleG10Match)
  const setIter = useAppStore((s) => s.setG10Iter)
  const submit = useAppStore((s) => s.submitG10Iter)
  const back = useAppStore((s) => s.g10Back)

  if (!draft) return null
  const { chars, groups, elicit, iter } = draft
  const it = elicit[iter]
  const nameOf = (i: number) => names[chars[i]] || '—'

  const triadFull = it.triad.length === 3
  const hasConstruct = it.construct !== null
  const hasOdd = it.oddPos !== null
  const canSubmit = triadFull && hasConstruct && hasOdd
  const isLast = iter === 9
  const used = new Set(elicit.filter((e, i) => i !== iter && e.construct !== null).map((e) => e.construct))
  const others = Array.from({ length: 10 }, (_, i) => i).filter((i) => !it.triad.includes(i))
  const trait = it.construct !== null ? groups[it.construct].emergent.trim() : ''

  const cardBase = 'relative flex min-h-[52px] items-center rounded-[10px] border px-3 py-2 text-left text-[13.5px] leading-tight transition'

  return (
    <div className="mx-auto max-w-[900px]">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-3">
        {t('g10.step3')} · {iter + 1} / 10
      </p>
      <p className="mb-5 text-[22px] font-semibold leading-tight">{t('g10.elicitTitle')}</p>

      {/* A — pick 3 characters for the triad */}
      <p className="mb-2 text-sm text-ink-2">
        {t('g10.pickTriad')} <b className="text-ink">({it.triad.length}/3)</b>
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
        {chars.map((_, i) => {
          const inTriad = it.triad.includes(i)
          const atCap = it.triad.length >= 3 && !inTriad
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleTriad(i)}
              disabled={atCap}
              className={`${cardBase} ${inTriad ? 'border-primary bg-primary-tint' : 'border-line bg-card hover:border-ink-3'} ${atCap ? 'opacity-40' : ''}`}
            >
              {nameOf(i)}
            </button>
          )
        })}
      </div>

      {/* B — pick the construct (each usable once) */}
      <div className={`mt-6 ${triadFull ? '' : 'pointer-events-none opacity-40'}`}>
        <p className="mb-2 text-sm text-ink-2">{t('g10.pickConstruct')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {groups.map((g, c) => {
            const isUsed = used.has(c)
            const sel = it.construct === c
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setConstruct(c)}
                disabled={isUsed}
                className={`${cardBase} gap-1.5 ${sel ? 'border-primary bg-primary-tint' : 'border-line bg-card hover:border-ink-3'} ${isUsed ? 'opacity-30' : ''}`}
              >
                <span className="truncate text-emergent">{g.emergent || '—'}</span>
                <span className="flex-none text-ink-3">|</span>
                <span className="truncate text-contrast">{g.contrast || '—'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* C — tap the odd one out */}
      <div className={`mt-6 ${hasConstruct ? '' : 'pointer-events-none opacity-40'}`}>
        <p className="mb-2 text-sm text-ink-2">{t('elicit.pickOdd')}</p>
        <div className="grid grid-cols-3 gap-3">
          {it.triad.map((i) => {
            const odd = it.oddPos === i
            const alike = hasOdd && !odd
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOdd(i)}
                className={`relative flex min-h-[64px] flex-col justify-between rounded-xl border px-4 py-3 text-left transition ${
                  odd ? 'border-contrast bg-contrast-tint' : alike ? 'border-emergent bg-emergent-tint' : 'border-line bg-card hover:border-ink-3'
                }`}
              >
                <span className="line-clamp-2 text-[16px] font-medium text-ink">{nameOf(i)}</span>
                <span className={`mt-1.5 font-mono text-[10px] ${odd ? 'text-contrast' : alike ? 'text-emergent' : 'text-ink-3'}`}>
                  {odd ? `▽ ${t('elicit.different')}` : alike ? `▲ ${t('elicit.alike')}` : '·'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* D — who else shares the elicited pole (the other 7) */}
      <div className={`mt-6 ${hasOdd ? '' : 'pointer-events-none opacity-40'}`}>
        <p className="mb-2 text-sm text-ink">
          {trait ? t('elicit.whoElse', { trait }) : t('elicit.whoElseGeneric')}
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
          {others.map((i) => {
            const sel = it.selected.includes(i)
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleMatch(i)}
                className={`${cardBase} pr-8 ${sel ? 'border-emergent bg-emergent-tint' : 'border-line bg-card hover:border-ink-3'}`}
              >
                {nameOf(i)}
                {sel && (
                  <span className="absolute right-2.5 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full bg-emergent text-[11px] font-bold text-white">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Nav */}
      <div className="mt-7 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => (iter === 0 ? back() : setIter(iter - 1))}
          className="rounded-[9px] border border-line bg-transparent px-5 py-2.5 text-sm text-ink hover:border-ink-3"
        >
          ← {t('common.back')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-[9px] border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
        >
          {isLast ? t('elicit.finish') : `${t('common.next')} →`}
        </button>
      </div>
    </div>
  )
}
