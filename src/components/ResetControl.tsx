import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/useAppStore'
import { dialogFooter, useDialogKeys } from './dialogKit'

type Step = 'idle' | 'warn' | 'confirm'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'

/**
 * "Start over" — deliberately parked at the very bottom, far from the main controls, to
 * avoid accidental clicks. Wiping is guarded by two steps: a warning, then an
 * irreversible-action confirmation. Every button except the final one is neutral.
 */
export function ResetControl() {
  const { t } = useTranslation()
  const reset = useAppStore((s) => s.reset)
  const [step, setStep] = useState<Step>('idle')

  const close = () => setStep('idle')
  const confirmReset = () => {
    reset()
    close()
  }
  // ESC/outside → cancel; Enter → advance (warn) or confirm (confirm).
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
            className="animate-fade relative flex w-full max-w-sm flex-col rounded-2xl border border-line bg-card shadow-xl"
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
              <p className="mt-1 pr-6 text-sm text-ink-2">
                {step === 'warn' ? t('reset.warnBody') : t('reset.confirmBody')}
              </p>
            </div>

            <div className={dialogFooter}>
              <button type="button" onClick={close} className={neutralBtn}>
                {t('reset.cancel')}
              </button>
              {step === 'warn' ? (
                <button type="button" onClick={() => setStep('confirm')} className={neutralBtn}>
                  {t('reset.continue')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={confirmReset}
                  className="rounded-[9px] bg-triad px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  {t('reset.confirm')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
