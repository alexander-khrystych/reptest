/**
 * Wire protocol for live session sharing — shared by the client (`@/session/*`) and the relay
 * Worker (`party/server.ts`). Types + plain constants only, so it's safe to import from both the
 * DOM app and the Cloudflare Worker without dragging either environment's globals across.
 *
 * Roles and the read-only guarantee:
 * - A connection declares its role in the `?role=` query param when it opens.
 * - The room relays board snapshots to **approved observers only**, and silently ignores any
 *   message an observer sends — read-only is enforced on the server, never trusted from the client.
 */

export type Role = 'testee' | 'observer'

/** The board the observer renders — the only thing that crosses the wire. Highlights never do. */
export interface WireConstruct {
  oddPos: number | null
  emergent: string
  contrast: string
  selected: number[]
}
export interface BoardSnapshot {
  names: string[]
  constructs: WireConstruct[]
}

/** client → room. The room honours snapshot/approve/reject only from the testee; from an observer
 *  the sole accepted message is `cancel` (withdraw a pending join request). A deliberate "leave"
 *  needs no message — the observer just closes its socket, which the room treats as a normal drop. */
export type ClientMsg =
  | { t: 'snapshot'; board: BoardSnapshot }
  | { t: 'approve' }
  | { t: 'reject' }
  | { t: 'cancel' }

/** room → clients. */
export type ServerMsg =
  // → testee: presence + approval, so it can derive listening vs broadcasting and show the popup.
  | { t: 'state'; observers: number; approved: boolean }
  // → testee: a waiting observer canceled its join request (close the approval dialog + notify).
  | { t: 'canceled' }
  // → observer: the approval lifecycle.
  | { t: 'waiting' }
  | { t: 'admitted' }
  | { t: 'rejected' }
  | { t: 'ended' }
  // → observer: the live board.
  | { t: 'snapshot'; board: BoardSnapshot }

export const ROLE_PARAM = 'role'
