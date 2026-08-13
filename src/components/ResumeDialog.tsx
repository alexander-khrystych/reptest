import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { consumeResumeCode, importSaveData } from '@/lib/resume'
import { dialogFooter, useDialogKeys } from './dialogKit'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'
const primaryBtn =
  'rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary'

function FileIcon() {
  return (
    <svg
      className="h-8 w-8 text-ink-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

/**
 * Resume from a saved test — a pasted resume link (code fetched from KV) or a save file (dropped or
 * chosen). A dropped file is only read, not loaded; the test loads only when Resume is clicked.
 */
export function ResumeDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [linkText, setLinkText] = useState('')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canResume = !!fileContent || linkText.trim() !== ''

  const takeFile = async (file: File) => {
    setError(false)
    setFileContent(await file.text())
    setFileName(file.name)
  }
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void takeFile(f)
  }
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void takeFile(f)
  }

  const resume = async () => {
    if (busy || !canResume) return
    setError(false)
    // A save file wins if one was dropped/selected; otherwise resolve the pasted link's code.
    if (fileContent) {
      if (importSaveData(fileContent)) onClose()
      else setError(true)
      return
    }
    const code =
      linkText.match(/\/r\/([A-Za-z0-9_-]+)/)?.[1] ?? linkText.trim().match(/^[A-Za-z0-9_-]+$/)?.[0]
    if (!code) {
      setError(true)
      return
    }
    setBusy(true)
    const ok = await consumeResumeCode(code)
    setBusy(false)
    if (ok) onClose()
    else setError(true)
  }
  useDialogKeys(onClose, resume)

  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="animate-fade flex w-full max-w-[460px] flex-col rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2 className="text-lg font-semibold">{t('resumeDlg.title')}</h2>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-3">
              {t('resumeDlg.linkLabel')}
            </p>
            <input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder={t('resumeDlg.linkPlaceholder')}
              className="w-full rounded-[9px] border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
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
            onChange={onPick}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={[
              'flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[10px] border-2 px-4 py-5 text-center transition-colors',
              dragOver
                ? 'border-primary bg-primary-tint'
                : fileName
                  ? 'border-line bg-canvas'
                  : 'border-transparent bg-canvas',
            ].join(' ')}
          >
            {fileName ? (
              <>
                <FileIcon />
                <span className="break-all text-sm text-ink">{fileName}</span>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-2">{t('resumeDlg.dropText')}</p>
                <button type="button" onClick={() => fileRef.current?.click()} className={neutralBtn}>
                  {t('resumeDlg.selectFile')}
                </button>
              </>
            )}
          </div>

          {error && <p className="text-sm text-triad">{t('resumeDlg.error')}</p>}
        </div>

        <div className={dialogFooter}>
          <button type="button" onClick={onClose} className={neutralBtn}>
            {t('save.close')}
          </button>
          <button type="button" onClick={resume} disabled={busy || !canResume} className={primaryBtn}>
            {t('resumeDlg.go')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
