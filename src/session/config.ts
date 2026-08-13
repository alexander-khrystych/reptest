import type { Role } from './protocol'

/**
 * Boot-time role detection. The observer opens a short link `/<OBSERVER_PREFIX>/<roomId>`; every
 * other URL is the testee's own app. This is read once, synchronously, at module load — the whole
 * tab is one role for its lifetime, which lets the store pick a role-scoped persistence key.
 */
export const OBSERVER_PREFIX = 'w'

const path = typeof window !== 'undefined' ? window.location.pathname : '/'
const match = path.match(new RegExp(`^/${OBSERVER_PREFIX}/([A-Za-z0-9_-]+)/?$`))

/** The room id from a `/w/<roomId>` observer link, or null when this is the testee app. */
export const OBSERVER_ROOM: string | null = match ? match[1] : null
export const IS_OBSERVER = OBSERVER_ROOM !== null
export const ROLE: Role = IS_OBSERVER ? 'observer' : 'testee'

/** The code from a `/r/<code>` resume link, or null. Testee-only (never combined with observer). */
const resumeMatch = path.match(/^\/r\/([A-Za-z0-9_-]+)\/?$/)
export const RESUME_CODE: string | null = !IS_OBSERVER && resumeMatch ? resumeMatch[1] : null

/** Host (no protocol) of the relay Worker. `VITE_PARTYKIT_HOST` in prod; wrangler dev locally. */
export const PARTYKIT_HOST: string = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:8787'

/** Party name — must match the Durable Object binding (`Session`, lowercased) in wrangler.jsonc. */
export const PARTY = 'session'

/** The observer share link for a room, e.g. https://reptest.pages.dev/w/AbC123. */
export function observerLink(roomId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/${OBSERVER_PREFIX}/${roomId}`
}
