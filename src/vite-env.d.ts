/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Host (no protocol) of the session-sharing relay Worker, e.g. `reptest-relay.you.workers.dev`.
   *  Set in Cloudflare Pages for production; falls back to the local wrangler dev port. */
  readonly VITE_PARTYKIT_HOST?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
