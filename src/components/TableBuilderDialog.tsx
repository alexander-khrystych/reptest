import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  mode: 'new' | 'rename'
  initialName?: string
  /** The 22 entered names — the character pool the new table is a subset of. */
  names: string[]
  /** characters is empty in rename mode (the picker is hidden). */
  onSave: (name: string, characters: number[]) => void
  onClose: () => void
}

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'

/**
 * Build or rename a custom table. In "new" mode the picker reuses the elicitation card grid:
 * a construct is a subset of characters, so the same selectable-card idiom fits. A table needs
 * at least two characters; the class column and both poles come for free at render time.
 */
export function TableBuilderDialog({ mode, initialName = '', names, onSave, onClose }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [picked, setPicked] = useState<number[]>([])
  const isRename = mode === 'rename'

  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
  const canSave = isRename ? name.trim() !== '' : picked.length >= 2
  const save = () => {
    if (canSave) onSave(name.trim(), picked.slice().sort((a, b) => a - b))
  }

  return (
    <div
      className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="animate-fade relative flex max-h-[88vh] w-full max-w-[760px] flex-col rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2 className="text-lg font-semibold">
            {isRename ? t('tables.renameTitle') : t('tables.newTitle')}
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            {isRename ? t('tables.renameSub') : t('tables.newSub')}
          </p>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <label
            htmlFor="tbl-name"
            className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-ink-3"
          >
            {t('tables.nameLabel')}
          </label>
          <input
            id="tbl-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
            }}
            placeholder={t('tables.namePlaceholder')}
            className="w-full rounded-[9px] border border-line bg-card px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-tint)]"
          />

          {!isRename && (
            <div className="mt-5">
              <label className="mb-2.5 block font-mono text-[11px] uppercase tracking-wide text-ink-3">
                {t('tables.charsLabel')}
              </label>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2">
                {names.map((nm, i) => {
                  const sel = picked.includes(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggle(i)}
                      className={[
                        'relative flex min-h-[56px] flex-col justify-center rounded-[10px] border px-3 py-2 pr-8 text-left transition',
                        sel ? 'border-primary bg-primary-tint' : 'border-line bg-card hover:border-ink-3',
                      ].join(' ')}
                    >
                      <span
                        className={`font-mono text-[9.5px] leading-none ${sel ? 'text-primary' : 'text-ink-3'}`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[13.5px] leading-tight text-ink">
                        {nm || '—'}
                      </span>
                      {sel && (
                        <span className="absolute right-2.5 top-1/2 grid h-[18px] w-[18px] -translate-y-1/2 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-t border-line-2 px-6 py-4">
          {isRename ? (
            <span className="flex-1" />
          ) : (
            <span
              className={`flex-1 text-[12.5px] ${picked.length < 2 ? 'text-triad' : 'text-ink-3'}`}
            >
              {picked.length < 2
                ? t('tables.needTwo', { n: picked.length })
                : t('tables.selected', { n: picked.length })}
            </span>
          )}
          <button type="button" onClick={onClose} className={neutralBtn}>
            {t('tables.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
          >
            {t('tables.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
