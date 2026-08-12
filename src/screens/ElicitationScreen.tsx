import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { TRIADS, GRID_SIZE } from '@/data'

/**
 * Flow B — triadic elicitation. Order: name the poles (step 1) → tap the odd one out of the
 * triad (step 2) → mark who else shares the emergent pole (step 3). Each step unlocks the
 * next; Next cycles linearly. The testee sees only the cards, never the grid.
 */
export function ElicitationScreen() {
  const { t } = useTranslation()
  const names = useAppStore((s) => s.names)
  const constructs = useAppStore((s) => s.constructs)
  const triadIndex = useAppStore((s) => s.triadIndex)
  const setOdd = useAppStore((s) => s.setOdd)
  const setEmergent = useAppStore((s) => s.setEmergent)
  const setContrast = useAppStore((s) => s.setContrast)
  const toggleSelected = useAppStore((s) => s.toggleSelected)
  const setTriadIndex = useAppStore((s) => s.setTriadIndex)
  const setPhase = useAppStore((s) => s.setPhase)
  const bumpBoard = useAppStore((s) => s.bumpBoard)

  // Pole fields update the store live (for the testee's own grid) but only broadcast on blur,
  // and only when the value actually changed — hence remember the value at focus time.
  const focusVal = useRef('')
  const rememberFocus = (e: { target: HTMLInputElement }) => {
    focusVal.current = e.target.value
  }
  const broadcastIfChanged = (e: { target: HTMLInputElement }) => {
    if (e.target.value !== focusVal.current) bumpBoard()
  }

  const cur = constructs[triadIndex]
  const triad = TRIADS[triadIndex].map((p) => p - 1) // 1-based card positions → 0-based
  const nameOf = (pos: number) => names[pos] || '—'
  const oddChosen = cur.oddPos !== null
  const polesFilled = cur.emergent.trim() !== '' && cur.contrast.trim() !== ''
  const others = Array.from({ length: GRID_SIZE }, (_, i) => i).filter((i) => !triad.includes(i))
  const isLast = triadIndex === GRID_SIZE - 1
  const canAdvance = polesFilled && oddChosen

  const onNext = () => {
    if (isLast) setPhase('result')
    else setTriadIndex(triadIndex + 1) // linear cycle
  }

  return (
    <div className="mx-auto max-w-[860px]">
      {/* Step 1 — name the two poles */}
      <div className="mb-4 flex items-center gap-3 font-mono text-[12.5px]">
        <span className="text-emergent">{t('elicit.emergentPole')}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-emergent to-contrast" />
        <span className="text-contrast">{t('elicit.contrastPole')}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-l-[3px] border-emergent pl-3.5">
          <input
            type="text"
            value={cur.emergent}
            onChange={(e) => setEmergent(e.target.value)}
            onFocus={rememberFocus}
            onBlur={broadcastIfChanged}
            placeholder={t('elicit.emergentPlaceholder')}
            className="w-full rounded-[9px] border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-emergent focus:shadow-[0_0_0_3px_var(--emergent-tint)]"
          />
        </div>
        <div className="border-l-[3px] border-contrast pl-3.5">
          <input
            type="text"
            value={cur.contrast}
            onChange={(e) => setContrast(e.target.value)}
            onFocus={rememberFocus}
            onBlur={broadcastIfChanged}
            placeholder={t('elicit.contrastPlaceholder')}
            className="w-full rounded-[9px] border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-contrast focus:shadow-[0_0_0_3px_var(--contrast-tint)]"
          />
        </div>
      </div>

      {/* Step 2 — tap the odd one out (locked until both poles are filled; names stay readable) */}
      <div className="mt-6">
        <p className={`mb-3 text-sm text-ink-2 ${polesFilled ? '' : 'opacity-50'}`}>{t('elicit.pickOdd')}</p>
        <div className="grid grid-cols-3 gap-3">
          {triad.map((pos) => {
            const odd = cur.oddPos === pos
            const isAlike = oddChosen && !odd
            return (
              <button
                key={pos}
                type="button"
                onClick={() => setOdd(pos)}
                disabled={!polesFilled}
                className={[
                  'relative flex min-h-[74px] flex-col justify-between rounded-xl border px-4 py-3 text-left transition',
                  !polesFilled
                    ? 'border-line bg-canvas'
                    : odd
                      ? 'border-contrast bg-contrast-tint'
                      : isAlike
                        ? 'border-emergent bg-emergent-tint'
                        : 'border-line bg-card hover:border-ink-3',
                ].join(' ')}
              >
                <span className="absolute right-3 top-2 font-mono text-[9.5px] leading-none text-ink-3">
                  {String(pos + 1).padStart(2, '0')}
                </span>
                <span className="line-clamp-2 pr-5 text-[18px] font-medium text-ink">{nameOf(pos)}</span>
                <span
                  className={`mt-2 font-mono text-[10px] ${odd ? 'text-contrast' : isAlike ? 'text-emergent' : 'text-ink-3'}`}
                >
                  {odd ? `▽ ${t('elicit.different')}` : isAlike ? `▲ ${t('elicit.alike')}` : '·'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 3 — who else shares the emergent pole (needs poles filled AND the odd one chosen;
          clearing a pole re-locks it and fades any picks) */}
      <div className={`mt-5 ${canAdvance ? '' : 'pointer-events-none opacity-40'}`}>
        <p className="mb-2.5 text-[14px] text-ink">
          {cur.emergent.trim() ? t('elicit.whoElse', { trait: cur.emergent.trim() }) : t('elicit.whoElseGeneric')}
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2">
          {others.map((pos) => {
            const sel = cur.selected.includes(pos)
            return (
              <button
                key={pos}
                type="button"
                onClick={() => toggleSelected(pos)}
                disabled={!canAdvance}
                className={[
                  'relative flex min-h-[48px] flex-col justify-center rounded-[10px] border px-3 py-2 pr-8 text-left transition',
                  sel ? 'border-emergent bg-emergent-tint' : 'border-line bg-card hover:border-ink-3',
                ].join(' ')}
              >
                <span className={`font-mono text-[9px] leading-none text-ink-3 ${sel ? '' : 'invisible'}`}>
                  {String(pos + 1).padStart(2, '0')}
                </span>
                <span className="mt-0.5 line-clamp-1 text-[13.5px] leading-tight text-ink">{nameOf(pos)}</span>
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

      {/* Nav — Back / Next */}
      <div className="mt-7 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setTriadIndex(Math.max(0, triadIndex - 1))}
          disabled={triadIndex === 0}
          className="rounded-[9px] border border-line bg-transparent px-5 py-2.5 text-sm text-ink hover:border-ink-3 disabled:opacity-40 disabled:hover:border-line"
        >
          ← {t('common.back')}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          className="rounded-[9px] border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
        >
          {isLast ? t('elicit.finish') : `${t('common.next')} →`}
        </button>
      </div>
    </div>
  )
}
