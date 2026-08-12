import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { ROLES, GRID_SIZE } from '@/data'

/**
 * Flow A — name setup. The testee is prompted, one role at a time, for a name.
 *
 * - The input is a draft. It COMMITS (fills the card + advances the counter) only on
 *   Next / Finish / Enter. Navigating away (Back / tapping another card) stashes the draft
 *   without committing — the counter doesn't move, and the card shows the draft greyed.
 * - Only committed cards and the single next-unfilled "frontier" card are tappable, so the
 *   testee can't skip ahead and leave gaps.
 * - Submitting an edit to a card farther back returns to the frontier.
 */
export function NamesScreen() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.language)
  const names = useAppStore((s) => s.names)
  const drafts = useAppStore((s) => s.drafts)
  const nameIndex = useAppStore((s) => s.nameIndex)
  const setName = useAppStore((s) => s.setName)
  const saveDraft = useAppStore((s) => s.saveDraft)
  const setNameIndex = useAppStore((s) => s.setNameIndex)
  const enterElicitation = useAppStore((s) => s.enterElicitation)

  const roles = ROLES[language]
  const inputRef = useRef<HTMLInputElement>(null)

  const initDraft = () => {
    const st = useAppStore.getState()
    return st.drafts[nameIndex] || st.names[nameIndex] || ''
  }
  const [draft, setDraft] = useState(initDraft)
  const shownIndex = useRef(nameIndex)
  if (shownIndex.current !== nameIndex) {
    shownIndex.current = nameIndex
    setDraft(initDraft())
  }
  useEffect(() => {
    inputRef.current?.focus()
  }, [nameIndex])

  // Committed names are a contiguous prefix; the first empty slot is the frontier.
  const firstEmpty = names.findIndex((n) => !n.trim())
  const completed = firstEmpty === -1 ? GRID_SIZE : firstEmpty
  const allComplete = completed === GRID_SIZE
  const canSubmit = draft.trim() !== ''
  const isLast = nameIndex === GRID_SIZE - 1
  const clamp = (i: number) => Math.min(GRID_SIZE - 1, Math.max(0, i))
  // Editable: any committed card, plus the next-unfilled frontier card.
  const canEdit = (i: number) => i <= completed

  // Navigation stashes the draft, never commits it.
  const jump = (i: number) => {
    saveDraft(nameIndex, draft)
    setNameIndex(clamp(i))
  }
  // The only place a card fills and the counter advances.
  const commit = () => {
    if (draft.trim()) setName(nameIndex, draft.trim())
  }
  // Commit, then jump to the next unfilled card (returns here after editing a card back).
  const submitNext = () => {
    commit()
    const empty = useAppStore.getState().names.findIndex((n) => !n.trim())
    setNameIndex(empty === -1 ? GRID_SIZE - 1 : empty)
  }

  return (
    <div className="mx-auto max-w-[960px]">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-3">
        {String(nameIndex + 1).padStart(2, '0')} / {GRID_SIZE}
      </p>
      <p className="mb-[18px] text-[22px] font-semibold leading-tight">{roles[nameIndex]}</p>

      <div className="flex max-w-[460px] items-center gap-2.5">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          autoCapitalize="on"
          // A name always starts with a capital letter.
          onChange={(e) => {
            const v = e.target.value
            setDraft(v ? v.charAt(0).toUpperCase() + v.slice(1) : v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) {
              if (isLast) commit()
              else submitNext()
            }
          }}
          placeholder={t('names.placeholder')}
          aria-label={roles[nameIndex]}
          className="flex-1 rounded-[9px] border border-line bg-card px-3.5 py-3 text-[17px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-tint)]"
        />
      </div>

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={() => jump(nameIndex - 1)}
          disabled={nameIndex === 0}
          className="rounded-[9px] border border-line bg-transparent px-5 py-2.5 text-sm text-ink hover:border-ink-3 disabled:opacity-40 disabled:hover:border-line"
        >
          ← {t('common.back')}
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={commit}
            disabled={!canSubmit}
            className="rounded-[9px] border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
          >
            {t('names.finish')}
          </button>
        ) : (
          <button
            type="button"
            onClick={submitNext}
            disabled={!canSubmit}
            className="rounded-[9px] border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
          >
            {t('common.next')} →
          </button>
        )}
      </div>

      {allComplete && (
        <div className="animate-fade mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-primary bg-primary-tint p-4">
          <p className="text-[15px] font-medium text-ink">{t('names.complete')}</p>
          <button
            type="button"
            onClick={enterElicitation}
            className="rounded-[9px] bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2"
          >
            {t('names.continue')} →
          </button>
        </div>
      )}

      <p className="mx-0.5 mb-3 mt-[34px] font-mono text-[11px] tracking-wide text-ink-3">{t('names.hint')}</p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-[9px]">
        {roles.map((role, i) => {
          const committed = names[i].trim() !== ''
          const showsDraft = !committed && drafts[i].trim() !== ''
          const active = i === nameIndex
          const clickable = canEdit(i)
          const text = committed ? names[i] : showsDraft ? drafts[i] : ''
          const showIndex = committed || showsDraft || active
          return (
            <button
              key={i}
              type="button"
              disabled={!clickable}
              onClick={() => jump(i)}
              title={clickable ? role : undefined}
              className={[
                'relative flex min-h-[66px] flex-col rounded-[10px] border px-3 py-2 text-left transition',
                active
                  ? 'border-primary bg-card shadow-[0_0_0_3px_var(--primary-tint)]'
                  : committed
                    ? `border-line bg-card ${clickable ? 'hover:border-ink-3' : ''}`
                    : `border-dashed border-line bg-transparent ${clickable ? 'hover:border-ink-3' : 'cursor-default'}`,
              ].join(' ')}
            >
              <span
                className={`font-mono text-[9.5px] leading-none ${active ? 'text-primary' : 'text-ink-3'} ${showIndex ? '' : 'invisible'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mt-1 flex flex-1 items-center">
                <span
                  className={`line-clamp-2 w-full text-[14px] leading-tight ${committed ? 'text-ink' : 'text-ink-2'}`}
                >
                  {text}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
