import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSessionStore, type ObserverStatus } from '@/session/useSessionStore'
import { leaveRoom } from '@/session/session'
import { NavControls } from '@/components/NavControls'
import { ResultScreen } from './ResultScreen'

const primaryBtn = 'rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2'

/** Observer control to leave the broadcast (in the header, left of the language selector). Idle it
 *  matches the language/theme buttons; hover matches the "Start over" button. Fixed label width so
 *  it's the same size across EN/UA/RU. */
function LeaveBroadcastButton() {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={leaveRoom}
      className="flex h-9 items-center justify-center rounded-lg border border-line bg-card px-3 text-sm text-ink transition hover:border-triad hover:bg-triad/10 hover:text-triad"
    >
      <span className="w-[164px] truncate text-center">{t('sharing.leave')}</span>
    </button>
  )
}

function ObserverNav({ live }: { live: boolean }) {
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
      {live && <LeaveBroadcastButton />}
      <NavControls />
    </nav>
  )
}

function Waiting({ status }: { status: ObserverStatus }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      <h2 className="text-lg font-semibold">
        {status === 'connecting' ? t('sharing.connecting') : t('sharing.waitingTitle')}
      </h2>
      {status === 'waiting' && <p className="max-w-sm text-sm text-ink-2">{t('sharing.waitingBody')}</p>}
    </div>
  )
}

/** Rejected / ended notice. Either the OK button or an outside click returns to the start page. */
function Notice({ status }: { status: 'rejected' | 'ended' }) {
  const { t } = useTranslation()
  const home = () => {
    window.location.href = '/'
  }
  return createPortal(
    <div
      className="rg-noprint fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={home}
    >
      <div
        className="animate-fade w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold">
          {status === 'rejected' ? t('sharing.rejectedTitle') : t('sharing.endedTitle')}
        </h2>
        <p className="mb-5 text-sm text-ink-2">
          {status === 'rejected' ? t('sharing.rejectedBody') : t('sharing.endedBody')}
        </p>
        <div className="flex justify-end">
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
 * admitted it shows the live table via the shared ResultScreen (driven by snapshots in the store),
 * with the observer's own local tables / pairs / highlights. On "ended" the last grid stays frozen
 * behind the notice; the testee's own highlights are never received.
 */
export function ObserverScreen() {
  const status = useSessionStore((s) => s.observerStatus)
  const live = status === 'admitted'
  // Keep the (now frozen) grid visible behind the "sharing ended" notice.
  const showGrid = status === 'admitted' || status === 'ended'

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1600px] px-4 pb-16">
        <ObserverNav live={live} />
        {showGrid ? (
          <div className="animate-fade">
            <ResultScreen />
          </div>
        ) : (
          (status === 'connecting' || status === 'waiting') && <Waiting status={status} />
        )}
      </div>
      {(status === 'rejected' || status === 'ended') && <Notice status={status} />}
    </div>
  )
}
