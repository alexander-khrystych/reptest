import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { dialogFooter, useDialogKeys } from './dialogKit'
import { SaveDialog } from './SaveButton'

type Step = 'idle' | 'warn' | 'confirm'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'
// Neutral by default, red on hover — the same treatment as the bottom "Start over" trigger.
const dangerHoverBtn =
  'rounded-[9px] border border-line bg-transparent px-4 py-2 text-sm text-ink transition hover:border-triad hover:bg-triad/10 hover:text-triad'

/**
 * "Start over" — deliberately parked at the very bottom, far from the main controls, to
 * avoid accidental clicks. Wiping is guarded by two steps: a warning (which also offers a Backup
 * shortcut to save progress first), then an irreversible-action confirmation whose destructive
 * button sits on the LEFT with Cancel on the right, so a double-click carried over from the first
 * popup's (right-hand) button can't trigger it.
 */
export function ResetControl() {
  const { t } = useTranslation()
  const reset = useAppStore((s) => s.reset)
  const [step, setStep] = useState<Step>('idle')
  const [backupOpen, setBackupOpen] = useState(false)

  const close = () => setStep('idle')
  const confirmReset = () => {
    reset()
    close()
  }
  // ESC/outside → cancel; Enter → advance (warn) or confirm (confirm). While the Backup dialog is
  // open it owns the top of the dialog-key stack, so these are suspended until it closes.
  useDialogKeys(close, step === 'warn' ? () => setStep('confirm') : confirmReset, step !== 'idle')

  return (
    <>
      <div className="rg-noprint mt-40 flex justify-center pb-6">
        <button
          type="button"
          onClick={() => setStep('warn')}
          className="rounded-[9px] border border-line bg-transparent px-5 py-2.5 text-sm text-ink transition hover:border-triad hover:bg-triad/10 hover:text-triad"
        >
          {t('reset.button')}
        </button>
      </div>

      {step !== 'idle' && (
        <div
          className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <div
            className="animate-fade relative flex w-full max-w-lg flex-col rounded-2xl border border-line bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={t('reset.close')}
              onClick={close}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-line-2 hover:text-ink"
            >
              ✕
            </button>

            <div className="px-6 pb-5 pt-6">
              {/* whitespace-pre-line keeps the blank line between the two sentences of the warning */}
              <p className="mt-1 whitespace-pre-line pr-6 text-sm text-ink-2">
                {step === 'warn' ? t('reset.warnBody') : t('reset.confirmBody')}
              </p>
            </div>

            {step === 'warn' ? (
              <div className={dialogFooter}>
                <button type="button" onClick={close} className={neutralBtn}>
                  {t('reset.cancel')}
                </button>
                <button type="button" onClick={() => setBackupOpen(true)} className={neutralBtn}>
                  {t('reset.backup')}
                </button>
                <button type="button" onClick={() => setStep('confirm')} className={dangerHoverBtn}>
                  {t('reset.continue')}
                </button>
              </div>
            ) : (
              // Destructive action on the LEFT, Cancel on the RIGHT, pushed to opposite edges.
              <div className="flex items-center justify-between gap-2.5 border-t border-line-2 px-6 py-4">
                <button
                  type="button"
                  onClick={confirmReset}
                  className="rounded-[9px] bg-triad px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  {t('reset.confirm')}
                </button>
                <button type="button" onClick={close} className={neutralBtn}>
                  {t('reset.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backup = the same Save & Resume dialog as the header button, layered over the warning. */}
      {backupOpen && <SaveDialog onClose={() => setBackupOpen(false)} />}
    </>
  )
}
