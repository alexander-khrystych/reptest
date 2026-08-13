import PartySocket from 'partysocket'
import { nanoid } from 'nanoid'
import { useAppStore } from '@/store/useAppStore'
import { useSessionStore, shareMode, type ShareMode } from './useSessionStore'
import { IS_OBSERVER, OBSERVER_ROOM, PARTY, PARTYKIT_HOST } from './config'
import type { BoardSnapshot, ClientMsg, ServerMsg } from './protocol'

/**
 * The session-sharing controller: one module-level singleton that owns the WebSocket and the
 * client-side timers, translates room messages into `useSessionStore` state, and pushes board
 * snapshots from `useAppStore`. It is the single place the sharing state machine lives.
 *
 * Timer ownership (kept off the server to stay $0): both the "nobody joined" and the "testee
 * idle" timeouts are 10 minutes and run here in the browser. The only server-side timer is the
 * 30-second grace after the broadcaster disappears (it must survive the testee being gone).
 */

const LISTEN_TIMEOUT_MS = 10 * 60_000 // Listening → Silent if no observer connects
const IDLE_TIMEOUT_MS = 10 * 60_000 // Broadcasting → Silent after testee inactivity

let socket: PartySocket | null = null
let listenTimer: ReturnType<typeof setTimeout> | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null
let lastMode: ShareMode = 'silent'
let boardSubscribed = false

const sess = () => useSessionStore.getState()
const app = () => useAppStore.getState()
const currentBoard = (): BoardSnapshot => ({ names: app().names, constructs: app().constructs })
const sendToRoom = (msg: ClientMsg) => socket?.send(JSON.stringify(msg))

// ---- timers -----------------------------------------------------------------------------
const ensureListenTimer = () => {
  if (listenTimer) return
  listenTimer = setTimeout(() => {
    if (shareMode(sess()) === 'listening') disableShare()
  }, LISTEN_TIMEOUT_MS)
}
const cancelListenTimer = () => {
  if (listenTimer) clearTimeout(listenTimer)
  listenTimer = null
}
const resetIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => disableShare(), IDLE_TIMEOUT_MS)
}
const cancelIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = null
}

// ---- testee -----------------------------------------------------------------------------
function connectTestee(roomId: string) {
  disconnectSocket()
  socket = new PartySocket({ host: PARTYKIT_HOST, party: PARTY, room: roomId, query: { role: 'testee' } })
  socket.addEventListener('open', () => sendToRoom({ t: 'snapshot', board: currentBoard() }))
  socket.addEventListener('message', (e: MessageEvent) => onTesteeMessage(String(e.data)))
}

function onTesteeMessage(data: string) {
  let msg: ServerMsg
  try {
    msg = JSON.parse(data)
  } catch {
    return
  }
  if (msg.t === 'canceled') {
    // A waiting observer withdrew its join request → close the approval popup + show the notice.
    sess().patch({ pendingApproval: false, canceledNotice: true })
    return
  }
  if (msg.t !== 'state') return

  sess().patch({
    observers: msg.observers,
    approved: msg.approved,
    // An observer is waiting and we haven't approved → raise the approval popup.
    pendingApproval: msg.observers > 0 && !msg.approved,
  })

  const mode = shareMode(sess())
  const entering = (m: ShareMode) => mode === m && lastMode !== m
  lastMode = mode

  if (mode === 'broadcasting') {
    cancelListenTimer()
    if (entering('broadcasting')) {
      sendToRoom({ t: 'snapshot', board: currentBoard() }) // hand the observer fresh data at once
      resetIdleTimer()
    }
  } else if (mode === 'listening') {
    cancelIdleTimer()
    ensureListenTimer()
  }
}

// Push board changes to the room, blur-gated for text inputs via `boardRev` (see the store).
function subscribeBoard() {
  if (boardSubscribed) return
  boardSubscribed = true
  let lastRev = app().boardRev
  useAppStore.subscribe((s) => {
    if (s.boardRev === lastRev) return
    lastRev = s.boardRev
    if (!sess().shareEnabled) return
    sendToRoom({ t: 'snapshot', board: { names: s.names, constructs: s.constructs } })
    if (shareMode(sess()) === 'broadcasting') resetIdleTimer() // activity defers the idle timeout
  })
}

// ---- observer ---------------------------------------------------------------------------
function connectObserver(roomId: string) {
  disconnectSocket()
  sess().patch({ observerStatus: 'connecting' })
  socket = new PartySocket({ host: PARTYKIT_HOST, party: PARTY, room: roomId, query: { role: 'observer' } })
  socket.addEventListener('message', (e: MessageEvent) => onObserverMessage(String(e.data)))
}

function onObserverMessage(data: string) {
  let msg: ServerMsg
  try {
    msg = JSON.parse(data)
  } catch {
    return
  }
  switch (msg.t) {
    case 'waiting':
      sess().patch({ observerStatus: 'waiting' })
      break
    case 'admitted':
      sess().patch({ observerStatus: 'admitted' })
      break
    case 'snapshot':
      app().applySnapshot(msg.board)
      break
    case 'rejected':
      disconnectSocket() // manual close ⇒ partysocket won't reconnect
      sess().patch({ observerStatus: 'rejected' })
      break
    case 'ended':
      disconnectSocket()
      sess().patch({ observerStatus: 'ended' })
      break
  }
}

// ---- shared -----------------------------------------------------------------------------
function disconnectSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
}

// ---- public actions ---------------------------------------------------------------------
/** Silent → Listening: the testee turns sharing on. Mints a room id on first use, then reuses it
 *  (so re-enabling inside the 30s grace lands back in the same room and auto-resumes). */
export function enableShare() {
  const roomId = sess().roomId ?? nanoid(10)
  sess().patch({ roomId, shareEnabled: true, observers: 0, approved: false, pendingApproval: false })
  lastMode = 'listening'
  connectTestee(roomId)
  ensureListenTimer()
}

/** Listening/Broadcasting → Silent. Keeps the room id so a re-enable can resume. */
export function disableShare() {
  cancelListenTimer()
  cancelIdleTimer()
  lastMode = 'silent'
  sess().patch({ shareEnabled: false, observers: 0, approved: false, pendingApproval: false })
  disconnectSocket() // the room starts its 30s grace on our close
}

export function approveObserver() {
  sendToRoom({ t: 'approve' })
  sess().patch({ pendingApproval: false })
}

export function rejectObserver() {
  sendToRoom({ t: 'reject' })
  sess().patch({ pendingApproval: false })
}

/** Observer action: deliberately leave the broadcast. A plain disconnect — the room sees the
 *  socket close like any other observer drop and flips the testee Broadcasting → Listening (not
 *  Silent); the room stays open for another observer. Then return to the start page. */
export function leaveRoom() {
  disconnectSocket() // manual close ⇒ no reconnect; the room drops the testee to Listening
  setTimeout(() => {
    window.location.href = '/'
  }, 80)
}

/** Observer action while still waiting for approval: withdraw the join request, then leave (same
 *  redirect as Leave broadcast). The room notifies the testee that the request was canceled. */
export function cancelRequest() {
  sendToRoom({ t: 'cancel' })
  disconnectSocket()
  setTimeout(() => {
    window.location.href = '/'
  }, 80)
}

export const openSharePopup = () => sess().patch({ popupOpen: true })
export const closeSharePopup = () => sess().patch({ popupOpen: false })

/** Called once at startup (main.tsx). Boots the observer connection, or resumes a testee's
 *  previously-shared session after a reload. */
export function initSession() {
  if (IS_OBSERVER) {
    connectObserver(OBSERVER_ROOM as string)
    return
  }
  subscribeBoard()
  const { shareEnabled, roomId } = sess()
  if (shareEnabled && roomId) {
    lastMode = 'listening'
    connectTestee(roomId)
    ensureListenTimer()
  }
}
