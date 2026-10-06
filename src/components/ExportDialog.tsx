import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialogKeys } from './dialogKit'

interface ExportTable {
  id: string
  name: string
  characters: number[]
  pinned?: boolean
  kind?: 'grid' | 'relationships' | 'diagram' | 'crel' | 'rho' | 'rho2' | 'graph'
}

interface Props {
  tables: ExportTable[]
  /** The table currently open — the only one selected by default. */
  currentId?: string
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'

/**
 * Pick which tables go into the exported PDF. Multiple tables become one document (one per page).
 * Only the currently-open table is selected by default; a Select/Deselect-all checkbox at the top
 * (with an indeterminate "–" state when only some are picked) toggles the whole list.
 */
export function ExportDialog({ tables, currentId, onConfirm, onClose }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>(() =>
    currentId && tables.some((tb) => tb.id === currentId)
      ? [currentId]
      : tables.slice(0, 1).map((tb) => tb.id),
  )
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const allOn = tables.length > 0 && selected.length === tables.length
  const partial = selected.length > 0 && selected.length < tables.length
  // None or some selected → select all; all selected → clear.
  const toggleAll = () => setSelected(allOn ? [] : tables.map((tb) => tb.id))

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

        {/* Select/Deselect all — a plain checkbox + label, not a table row. */}
        <div className="px-6 pt-4">
          <button
            type="button"
            onClick={toggleAll}
            role="checkbox"
            aria-checked={allOn ? 'true' : partial ? 'mixed' : 'false'}
            className="flex w-full items-center gap-3 rounded-[9px] px-1.5 py-2 text-left hover:bg-line-2/50"
          >
            <span
              className={`grid h-[19px] w-[19px] flex-none place-items-center rounded-[5px] border text-[11px] font-bold leading-none ${
                allOn
                  ? 'border-primary bg-primary text-white'
                  : partial
                    ? 'border-primary bg-card text-primary'
                    : 'border-ink-3 bg-card text-white'
              }`}
            >
              {allOn ? '✓' : partial ? '−' : ''}
            </span>
            <span className="text-sm font-medium text-ink">{t('tables.selectAll')}</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto border-t border-line-2 px-6 py-4">
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
                {(!tb.kind || tb.kind === 'grid') && (
                  <span className="text-[12.5px] text-ink-3">
                    · {t('tables.charCount', { n: tb.characters.length })}
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
