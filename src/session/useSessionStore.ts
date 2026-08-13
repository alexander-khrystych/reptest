import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { IS_OBSERVER } from './config'

export type ShareMode = 'silent' | 'listening' | 'broadcasting'
export type ObserverStatus = 'connecting' | 'waiting' | 'admitted' | 'rejected' | 'ended'

/**
 * Session-sharing state, kept separate from the test data in `useAppStore`. The controller
 * (`session.ts`) is the only writer of the runtime fields; components read state + `shareMode`
 * and call controller actions. The four spec distinctions are kept explicit rather than
 * collapsed into one enum:
 *   - `shareEnabled` — the testee's permission to share (silent ⇢ not silent)
 *   - `observers`    — observer connections present (server-reported)
 *   - `approved`     — room-level approval granted (server-reported)
 *   - the broadcast state is *derived* from these by `shareMode`.
 * Only `roomId` + `shareEnabled` persist, so a testee reload silently rejoins the same room.
 */
export interface SessionState {
  roomId: string | null
  shareEnabled: boolean
  observers: number
  approved: boolean
  /** An observer is waiting and the testee hasn't approved yet → show the approval popup. */
  pendingApproval: boolean
  /** The Sharing popup (the menu opened from the Share button) is open. */
  popupOpen: boolean
  /** Observer-side connection lifecycle (unused by the testee). */
  observerStatus: ObserverStatus
  /** Transient testee notification (an i18n key), auto-cleared by the overlay; null when none. */
  toast: string | null

  patch: (p: Partial<SessionState>) => void
}

/** Silent unless sharing is on; broadcasting once an approved observer is actually present. */
export function shareMode(s: Pick<SessionState, 'shareEnabled' | 'approved' | 'observers'>): ShareMode {
  if (!s.shareEnabled) return 'silent'
  return s.approved && s.observers > 0 ? 'broadcasting' : 'listening'
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      roomId: null,
      shareEnabled: false,
      observers: 0,
      approved: false,
      pendingApproval: false,
      popupOpen: false,
      observerStatus: 'connecting',
      toast: null,
      patch: (p) => set(p),
    }),
    {
      name: IS_OBSERVER ? 'repgrid:session:observer' : 'repgrid:session',
      version: 1,
      // Observers persist nothing (their room comes from the URL); the testee keeps just enough
      // to silently rejoin the same room after a reload.
      partialize: (s) =>
        IS_OBSERVER ? {} : { roomId: s.roomId, shareEnabled: s.shareEnabled },
    },
  ),
)
