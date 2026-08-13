import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { buildSaveFile, createResumeLink } from '@/lib/resume'
import { CopyLinkBox } from './CopyLinkBox'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'

/** Download the self-contained save-file archive (works with no server). */
function downloadSaveFile() {
  const { filename, text } = buildSaveFile()
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Save & Resume dialog — a short link (stored server-side) plus a downloadable archive. The link is
 *  generated when the dialog opens (re-opening after more progress makes a fresh one). */
function SaveDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    createResumeLink()
      .then((l) => alive && setLink(l))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

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
          <h2 className="text-lg font-semibold">{t('save.title')}</h2>
          <p className="mt-1 text-sm text-ink-2">{t('save.info')}</p>
        </div>

        <div className="flex flex-col gap-1.5 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{t('save.linkLabel')}</p>
          {link ? (
            <CopyLinkBox link={link} />
          ) : error ? (
            <div className="rounded-[9px] border border-line bg-canvas px-3 py-2.5 text-sm text-ink-2">
              {t('save.error')}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[9px] border border-line bg-canvas px-3 py-2.5 text-sm text-ink-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-primary" />
              {t('save.generating')}
            </div>
          )}
          <p className="text-xs text-ink-3">{t('save.hint')}</p>

          <button
            type="button"
            onClick={downloadSaveFile}
            className="mt-3 w-full rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3"
          >
            {t('save.download')}
          </button>
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

/** Header "Save" button, between the Share button and the language selector. Matches the other
 *  header buttons; fixed label width so it stays the same size across EN/UA/RU. */
export function SaveButton() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center justify-center rounded-lg border border-line bg-card px-3 text-sm text-ink hover:border-ink-3"
      >
        <span className="w-[76px] truncate text-center">{t('save.button')}</span>
      </button>
      {open && <SaveDialog onClose={() => setOpen(false)} />}
    </>
  )
}
