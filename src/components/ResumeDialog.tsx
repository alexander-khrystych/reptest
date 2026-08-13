import { useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { consumeResumeCode, importSaveData } from '@/lib/resume'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'
const primaryBtn =
  'rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary'

/**
 * Resume from a saved test — either a short resume link (its code is fetched from KV) or a
 * self-contained save file. On success the store rehydrates and the app re-renders to that point.
 */
export function ResumeDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [linkText, setLinkText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fromLink = async () => {
    const code =
      linkText.match(/\/r\/([A-Za-z0-9_-]+)/)?.[1] ?? linkText.trim().match(/^[A-Za-z0-9_-]+$/)?.[0]
    if (!code) {
      setError(true)
      return
    }
    setBusy(true)
    setError(false)
    const ok = await consumeResumeCode(code)
    setBusy(false)
    if (ok) onClose()
    else setError(true)
  }

  const fromFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(false)
    const text = await file.text()
    if (importSaveData(text)) onClose()
    else setError(true)
  }

  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="animate-fade w-full max-w-[460px] rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2 className="text-lg font-semibold">{t('resumeDlg.title')}</h2>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{t('resumeDlg.linkLabel')}</p>
          <div className="flex gap-2">
            <input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder={t('resumeDlg.linkPlaceholder')}
              className="min-w-0 flex-1 rounded-[9px] border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={fromLink}
              disabled={busy || !linkText.trim()}
              className={primaryBtn}
            >
              {t('resumeDlg.go')}
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-ink-3">
            <span className="h-px flex-1 bg-line-2" /> {t('resumeDlg.or')}{' '}
            <span className="h-px flex-1 bg-line-2" />
          </div>

          <input
            type="file"
            ref={fileRef}
            accept="application/json,.json"
            className="hidden"
            onChange={fromFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3"
          >
            {t('resumeDlg.chooseFile')}
          </button>

          {error && <p className="text-sm text-triad">{t('resumeDlg.error')}</p>}
        </div>

        <div className="flex justify-end border-t border-line-2 px-6 py-4">
          <button type="button" onClick={onClose} className={neutralBtn}>
            {t('save.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
