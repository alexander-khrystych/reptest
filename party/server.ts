import {
  Server,
  routePartykitRequest,
  type Connection,
  type ConnectionContext,
  type WSMessage,
} from 'partyserver'
import { ROLE_PARAM, type BoardSnapshot, type ClientMsg, type Role, type ServerMsg } from '../src/session/protocol'

// `Env` (with the `Session` Durable Object binding) is declared globally in
// ../worker-configuration.d.ts, generated from wrangler.jsonc by `wrangler types`.

/** How long the room waits for a vanished broadcaster before ending the session for observers.
 *  Covers both a manual "sharing off" (misclick-forgiving) and a network drop — the room can't
 *  tell them apart, and doesn't need to (Q2: 30s silent grace). */
const GRACE_MS = 30_000

/**
 * One room = one shared session, keyed by roomId. Server-authoritative:
 *  - a connection's role comes from its `?role=` query and is fixed for its lifetime;
 *  - only the testee's messages are honoured — observer messages are dropped (read-only);
 *  - board snapshots are relayed to observers only once the testee has approved (room-level);
 *  - when the broadcaster disappears, a single 30s alarm decides between resume and "ended".
 *
 * All durable state lives in storage (`approved`, `snapshot`) and in the connection set
 * (presence, via role tags), so hibernation can evict the instance between events without loss.
 */
export class Session extends Server<Env> {
  static options = { hibernate: true }

  // ---- role + presence -------------------------------------------------------------------
  private roleOf(request: Request): Role {
    return new URL(request.url).searchParams.get(ROLE_PARAM) === 'testee' ? 'testee' : 'observer'
  }
  // Tag each connection with its role so getConnections(role) can filter it after hibernation.
  getConnectionTags(_conn: Connection, ctx: ConnectionContext): string[] {
    return [this.roleOf(ctx.request)]
  }
  private countExcept(role: Role, exclude?: Set<string>): number {
    let n = 0
    for (const c of this.getConnections(role)) if (!exclude?.has(c.id)) n++
    return n
  }

  // ---- durable flags ---------------------------------------------------------------------
  private async isApproved(): Promise<boolean> {
    return (await this.ctx.storage.get<boolean>('approved')) ?? false
  }
  private async getSnapshot(): Promise<BoardSnapshot | null> {
    return (await this.ctx.storage.get<BoardSnapshot>('snapshot')) ?? null
  }

  // ---- send helpers ----------------------------------------------------------------------
  private send(conn: Connection, msg: ServerMsg) {
    conn.send(JSON.stringify(msg))
  }
  private toObservers(msg: ServerMsg) {
    const s = JSON.stringify(msg)
    for (const ob of this.getConnections('observer')) ob.send(s)
  }
  /** Tell the testee(s) the current presence + approval, so the client can derive its mode
   *  (silent/listening/broadcasting) and decide whether to raise the approval popup. */
  private async pushStateToTestees(exclude?: Set<string>) {
    const msg = JSON.stringify({
      t: 'state',
      observers: this.countExcept('observer', exclude),
      approved: await this.isApproved(),
    } satisfies ServerMsg)
    for (const tc of this.getConnections('testee')) tc.send(msg)
  }

  // ---- lifecycle -------------------------------------------------------------------------
  async onConnect(conn: Connection, ctx: ConnectionContext) {
    if (this.roleOf(ctx.request) === 'testee') {
      // Broadcaster (re)joined: cancel any pending "ended" grace, then report presence so the
      // testee resumes broadcasting if an approved observer is already waiting.
      await this.ctx.storage.deleteAlarm()
      await this.pushStateToTestees()
      return
    }
    // Observer joined. If the room is already approved (reconnection, or another observer was
    // let in), admit straight to the table with the last board; otherwise wait for approval.
    if (await this.isApproved()) {
      this.send(conn, { t: 'admitted' })
      const snap = await this.getSnapshot()
      if (snap) this.send(conn, { t: 'snapshot', board: snap })
    } else {
      this.send(conn, { t: 'waiting' })
    }
    await this.pushStateToTestees()
  }

  async onMessage(conn: Connection, message: WSMessage) {
    // Read-only enforcement: anything an observer sends is silently ignored.
    if (!conn.tags.includes('testee')) return
    let msg: ClientMsg
    try {
      msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    } catch {
      return
    }
    switch (msg.t) {
      case 'snapshot': {
        await this.ctx.storage.put('snapshot', msg.board)
        if (await this.isApproved()) this.toObservers({ t: 'snapshot', board: msg.board })
        break
      }
      case 'approve': {
        await this.ctx.storage.put('approved', true)
        const snap = await this.getSnapshot()
        for (const ob of this.getConnections('observer')) {
          this.send(ob, { t: 'admitted' })
          if (snap) this.send(ob, { t: 'snapshot', board: snap })
        }
        await this.pushStateToTestees()
        break
      }
      case 'reject': {
        // Notify + drop the waiting observer(s); their client also closes (no reconnect) and
        // returns to the start page. Exclude them from the presence we report so the testee's
        // popup closes at once, instead of flickering back until their socket finishes closing.
        // The link stays valid — reopening it makes a fresh connection and raises the popup again.
        const rejected = new Set<string>()
        for (const ob of this.getConnections('observer')) {
          this.send(ob, { t: 'rejected' })
          rejected.add(ob.id)
          try {
            ob.close(1000, 'rejected')
          } catch {
            // already gone
          }
        }
        await this.pushStateToTestees(rejected)
        break
      }
    }
  }

  async onClose(conn: Connection) {
    const self = new Set([conn.id])
    if (conn.tags.includes('testee')) {
      // If the last broadcaster just left while observers are still here, start the grace timer.
      const anotherTestee = this.countExcept('testee', self) > 0
      const observersHere = this.countExcept('observer', self) > 0
      if (!anotherTestee && observersHere) {
        await this.ctx.storage.setAlarm(Date.now() + GRACE_MS)
      }
    } else {
      // An observer left → testee drops broadcasting→listening when the count reaches 0.
      await this.pushStateToTestees(self)
    }
  }

  async onAlarm() {
    if (this.countExcept('testee') > 0) return // broadcaster came back inside the grace window
    // Broadcaster never returned: end the session for observers and reset the room.
    this.toObservers({ t: 'ended' })
    await this.ctx.storage.delete('approved')
    await this.ctx.storage.delete('snapshot')
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env, { cors: true })) ??
      new Response('Not found', { status: 404 })
    )
  },
}
