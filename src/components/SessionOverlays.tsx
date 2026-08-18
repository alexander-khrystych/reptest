import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@/session/useSessionStore'
import { observerLink } from '@/session/config'
import {
  approveObserver,
  closeSharePopup,
  disableShare,
  enableShare,
  rejectObserver,
} from '@/session/session'
import { CopyLinkBox } from './CopyLinkBox'
import { Toasts } from './Toasts'
import { dialogFooter, useDialogKeys } from './dialogKit'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'
const primaryBtn = 'rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2'

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={[
        'relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-line',
      ].join(' ')}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

/** The Sharing menu: on/off toggle, the short observer link (click anywhere to copy), and the
 *  live observer count. Turning on is always Silent → Listening; off is always → Silent. */
function SharePopup() {
  const { t } = useTranslation()
  const shareEnabled = useSessionStore((s) => s.shareEnabled)
  const roomId = useSessionStore((s) => s.roomId)
  const observers = useSessionStore((s) => s.observers)
  const link = shareEnabled && roomId ? observerLink(roomId) : ''
  useDialogKeys(closeSharePopup, closeSharePopup)

  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={closeSharePopup}
    >
      <div
        className="animate-fade w-full max-w-[460px] rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6">
          <h2 className="text-lg font-semibold">{t('sharing.title')}</h2>
          <p className="mt-1 text-sm text-ink-2">{t('sharing.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <label className="flex cursor-pointer items-center gap-3">
            <Switch
              on={shareEnabled}
              onChange={() => (shareEnabled ? disableShare() : enableShare())}
              label={t('sharing.enable')}
            />
            <span className="text-sm font-medium text-ink">{t('sharing.enable')}</span>
          </label>

          {shareEnabled && link && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-3">
                {t('sharing.linkLabel')}
              </p>
              <CopyLinkBox link={link} />
              <p className="mt-1.5 text-xs text-ink-3">{t('sharing.linkHint')}</p>
            </div>
          )}

          {shareEnabled && (
            <p className="text-sm text-ink-2">
              {observers > 0
                ? t('sharing.observers', { count: observers })
                : t('sharing.waitingForObserver')}
            </p>
          )}
        </div>

        <div className={dialogFooter}>
          <button type="button" onClick={closeSharePopup} className={neutralBtn}>
            {t('sharing.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Raised when an unapproved observer is waiting. ESC / outside-click / Deny all reject (→ stay
 *  Listening; the observer is told and returns to start); Enter / Allow → Broadcasting. */
function ApprovalPopup() {
  const { t } = useTranslation()
  useDialogKeys(rejectObserver, approveObserver)
  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={rejectObserver}
    >
      <div
        className="animate-fade flex w-full max-w-sm flex-col rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pb-5 pt-6">
          <h2 className="mb-1 text-base font-semibold">{t('sharing.approveTitle')}</h2>
          <p className="text-sm text-ink-2">{t('sharing.approveBody')}</p>
        </div>
        <div className={dialogFooter}>
          <button type="button" onClick={rejectObserver} className={neutralBtn}>
            {t('sharing.approveNo')}
          </button>
          <button type="button" onClick={approveObserver} className={primaryBtn}>
            {t('sharing.approveYes')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Testee notification when a waiting observer withdraws its join request. */
function CanceledNotice() {
  const { t } = useTranslation()
  const patch = useSessionStore((s) => s.patch)
  const close = () => patch({ canceledNotice: false })
  useDialogKeys(close, close)
  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div
        className="animate-fade flex w-full max-w-sm flex-col rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pb-5 pt-6">
          <p className="text-sm text-ink-2">{t('sharing.canceledNotice')}</p>
        </div>
        <div className={dialogFooter}>
          <button type="button" onClick={close} className={primaryBtn}>
            {t('sharing.ok')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Testee-side sharing overlays, mounted once by the app; each portals to <body>. */
export function SessionOverlays() {
  const popupOpen = useSessionStore((s) => s.popupOpen)
  const pendingApproval = useSessionStore((s) => s.pendingApproval)
  const canceledNotice = useSessionStore((s) => s.canceledNotice)
  return (
    <>
      {popupOpen && <SharePopup />}
      {pendingApproval && <ApprovalPopup />}
      {canceledNotice && <CanceledNotice />}
      <Toasts />
    </>
  )
}
