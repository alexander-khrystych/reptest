import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore, type ObserverStatus } from '@/session/useSessionStore'
import { cancelRequest, leaveRoom } from '@/session/session'
import { NavControls } from '@/components/NavControls'
import { dialogFooter, useDialogKeys } from '@/components/dialogKit'
import { ResultScreen } from './ResultScreen'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'
const primaryBtn = 'rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2'
const dangerBtn = 'rounded-[9px] bg-triad px-4 py-2 text-sm font-medium text-white hover:opacity-90'
// Shared style for the observer's "Leave broadcast" / "Cancel request" buttons: like the header
// buttons idle, Start-over red on hover, fixed label width so all languages match.
const observerActionBtn =
  'flex h-9 items-center justify-center rounded-lg border border-line bg-card px-3 text-sm text-ink transition hover:border-triad hover:bg-triad/10 hover:text-triad'
const actionLabel = 'w-[164px] truncate text-center'

/** A cancel/confirm dialog styled like the "Start over" 2nd confirmation (red proceed button). */
function ConfirmDialog({
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useDialogKeys(onCancel, onConfirm)
  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="animate-fade relative flex w-full max-w-sm flex-col rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={cancelLabel}
          onClick={onCancel}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-line-2 hover:text-ink"
        >
          ✕
        </button>
        <div className="px-6 pb-5 pt-6">
          <p className="mt-1 pr-6 text-sm text-ink-2">{body}</p>
        </div>
        <div className={dialogFooter}>
          <button type="button" onClick={onCancel} className={neutralBtn}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={dangerBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ObserverNav({ live, onLeave }: { live: boolean; onLeave: () => void }) {
  const { t } = useTranslation()
  return (
    <nav className="rg-noprint mb-7 flex items-center gap-3 border-b border-line-2 py-4">
      <span className="text-[15px] font-semibold">{t('flow.grid')}</span>
      {live && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neg px-2 py-0.5 text-xs font-medium text-neg">
          <span className="h-2 w-2 rounded-full bg-neg" /> {t('sharing.live')}
        </span>
      )}
      <span className="flex-1" />
      {live && (
        <button type="button" onClick={onLeave} className={observerActionBtn}>
          <span className={actionLabel}>{t('sharing.leave')}</span>
        </button>
      )}
      <NavControls />
    </nav>
  )
}

function Waiting({ status, onCancel }: { status: ObserverStatus; onCancel: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      <h2 className="text-lg font-semibold">
        {status === 'connecting' ? t('sharing.connecting') : t('sharing.waitingTitle')}
      </h2>
      {status === 'waiting' && (
        <>
          <p className="max-w-sm text-sm text-ink-2">{t('sharing.waitingBody')}</p>
          <button type="button" onClick={onCancel} className={`mt-3 ${observerActionBtn}`}>
            <span className={actionLabel}>{t('sharing.cancelRequest')}</span>
          </button>
        </>
      )}
    </div>
  )
}

/** Rejected / ended notice. OK / ESC / Enter / outside click all return to the start page. */
function Notice({ status }: { status: 'rejected' | 'ended' }) {
  const { t } = useTranslation()
  const home = () => {
    window.location.href = '/'
  }
  useDialogKeys(home, home)
  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={home}
    >
      <div
        className="animate-fade flex w-full max-w-sm flex-col rounded-2xl border border-line bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pb-5 pt-6">
          <h2 className="mb-1 text-base font-semibold">
            {status === 'rejected' ? t('sharing.rejectedTitle') : t('sharing.endedTitle')}
          </h2>
          <p className="text-sm text-ink-2">
            {status === 'rejected' ? t('sharing.rejectedBody') : t('sharing.endedBody')}
          </p>
        </div>
        <div className={dialogFooter}>
          <button type="button" onClick={home} className={primaryBtn}>
            {t('sharing.ok')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * The observer's entire app, mounted when the URL is a `/w/<roomId>` link. Read-only: once
 * admitted it shows the live table via the shared ResultScreen. Leaving or canceling a pending
 * request each go through a confirmation dialog.
 */
export function ObserverScreen() {
  const { t } = useTranslation()
  const status = useSessionStore((s) => s.observerStatus)
  const live = status === 'admitted'
  // Keep the (now frozen) grid visible behind the "sharing ended" notice.
  const showGrid = status === 'admitted' || status === 'ended'
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1600px] px-4 pb-16">
        <ObserverNav live={live} onLeave={() => setLeaveConfirm(true)} />
        {showGrid ? (
          <div className="animate-fade">
            <ResultScreen />
          </div>
        ) : (
          (status === 'connecting' || status === 'waiting') && (
            <Waiting status={status} onCancel={() => setCancelConfirm(true)} />
          )
        )}
      </div>

      {(status === 'rejected' || status === 'ended') && <Notice status={status} />}

      {leaveConfirm && (
        <ConfirmDialog
          body={t('sharing.leaveConfirmBody')}
          confirmLabel={t('sharing.leaveConfirmYes')}
          cancelLabel={t('sharing.cancel')}
          onConfirm={leaveRoom}
          onCancel={() => setLeaveConfirm(false)}
        />
      )}
      {cancelConfirm && (
        <ConfirmDialog
          body={t('sharing.cancelConfirmBody')}
          confirmLabel={t('sharing.cancelConfirmYes')}
          cancelLabel={t('sharing.cancelConfirmNo')}
          onConfirm={cancelRequest}
          onCancel={() => setCancelConfirm(false)}
        />
      )}
    </div>
  )
}
