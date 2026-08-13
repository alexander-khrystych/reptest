import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialogKeys } from './dialogKit'

interface ExportTable {
  id: string
  name: string
  characters: number[]
  pinned?: boolean
}

interface Props {
  tables: ExportTable[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'

/**
 * Pick which tables go into the exported PDF. Multiple tables become one document (one per
 * page). Everything is selected by default; the user prunes. The default table is included
 * like any other — it just can't be unpinned from the top of the list elsewhere.
 */
export function ExportDialog({ tables, onConfirm, onClose }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>(tables.map((tb) => tb.id))
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  useDialogKeys(onClose, () => selected.length > 0 && onConfirm(selected))

  return (
    <div
      className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="animate-fade relative flex max-h-[88vh] w-full max-w-[520px] flex-col rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2 className="text-lg font-semibold">{t('tables.exportTitle')}</h2>
          <p className="mt-1 text-sm text-ink-2">{t('tables.exportSub')}</p>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto px-6 py-4">
          {tables.map((tb) => {
            const on = selected.includes(tb.id)
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => toggle(tb.id)}
                className={[
                  'flex items-center gap-3 rounded-[9px] border px-3.5 py-3 text-left transition',
                  on ? 'border-primary bg-primary-tint' : 'border-line bg-card hover:border-ink-3',
                ].join(' ')}
              >
                <span
                  className={`grid h-[19px] w-[19px] flex-none place-items-center rounded-[5px] border text-[11px] font-bold text-white ${
                    on ? 'border-primary bg-primary' : 'border-ink-3'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="truncate text-sm font-medium text-ink">{tb.name}</span>
                <span className="text-[12.5px] text-ink-3">
                  · {t('tables.charCount', { n: tb.characters.length })}
                </span>
                {tb.pinned && (
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-primary">
                    {t('tables.default')}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2.5 border-t border-line-2 px-6 py-4">
          <span className="flex-1 text-[12.5px] text-ink-3">
            {t('tables.exportSelected', { n: selected.length, total: tables.length })}
          </span>
          <button type="button" onClick={onClose} className={neutralBtn}>
            {t('tables.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
          >
            {t('tables.generate')}
          </button>
        </div>
      </div>
    </div>
  )
}
