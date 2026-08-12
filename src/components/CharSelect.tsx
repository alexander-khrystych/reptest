import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** Character labels, indexed by 0-based position. */
  names: string[]
  /** Positions offered in this dropdown (the current table's characters). */
  options: number[]
  value: number | null
  /** Positions not selectable here (e.g. the character picked in the paired selector). */
  disabled?: number[]
  onChange: (value: number) => void
  placeholder: string
}

/**
 * A searchable character dropdown. Opening it focuses the search field immediately so the user
 * can type straight away; typing filters the list, Enter picks the first match, Esc / an
 * outside click closes it. Characters listed in `disabled` (the other slot's pick) can't be
 * chosen.
 */
export function CharSelect({ names, options, value, disabled = [], onChange, placeholder }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the search field the moment the dropdown opens (req: type right away).
  useEffect(() => {
    if (!open) return
    setQ('')
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const needle = q.trim().toLowerCase()
  const filtered = options
    .map((i) => ({ name: names[i] || '—', i }))
    .filter(({ name }) => name.toLowerCase().includes(needle))
  const firstEnabled = filtered.find(({ i }) => !disabled.includes(i))

  const pick = (i: number) => {
    if (disabled.includes(i)) return
    onChange(i)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[132px] max-w-[180px] items-center justify-between gap-2 rounded-[8px] border border-line bg-card px-2.5 py-1.5 text-left text-[13px] hover:border-ink-3"
      >
        <span className={`truncate ${value === null ? 'text-ink-3' : 'text-ink'}`}>
          {value === null ? placeholder : names[value] || '—'}
        </span>
        <span className="text-[10px] leading-none text-ink-3">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-[224px] rounded-[10px] border border-line bg-card p-2 shadow-xl">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && firstEnabled) pick(firstEnabled.i)
              else if (e.key === 'Escape') setOpen(false)
            }}
            placeholder={t('pairs.search')}
            className="mb-2 w-full rounded-[7px] border border-line bg-canvas px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-primary focus:shadow-[0_0_0_2px_var(--primary-tint)]"
          />
          <div className="max-h-[232px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12px] text-ink-3">{t('pairs.noMatch')}</p>
            ) : (
              filtered.map(({ name, i }) => {
                const isDisabled = disabled.includes(i)
                const isSel = value === i
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => pick(i)}
                    className={[
                      'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px]',
                      isDisabled
                        ? 'cursor-not-allowed text-ink-3 opacity-45'
                        : isSel
                          ? 'bg-primary-tint text-primary'
                          : 'text-ink hover:bg-line-2',
                    ].join(' ')}
                  >
                    <span className="font-mono text-[10px] text-ink-3">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{name}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
