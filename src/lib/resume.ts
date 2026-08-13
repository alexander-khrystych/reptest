import { z } from 'zod'
import { useAppStore } from '@/store/useAppStore'
import { PARTYKIT_HOST } from '@/session/config'

/**
 * Progress save & resume. Two artifacts:
 *  - a **short link** `/(origin)/r/<code>` — the test state lives in the relay Worker's KV (no TTL,
 *    on your own Cloudflare account), so the code stays ~10 chars;
 *  - a **self-contained save file** (plain JSON) — a future-proof archive that restores with no
 *    server at all.
 * Only *test data* is stored — never language/theme (usePrefsStore) or session sharing
 * (useSessionStore) — so a resumed session always starts silent and keeps the opener's own prefs.
 * Every decode is Zod-validated before rehydrating the store.
 */

const construct = z.object({
  oddPos: z.number().int().nullable(),
  emergent: z.string(),
  contrast: z.string(),
  selected: z.array(z.number().int()),
})
const savedTable = z.object({
  id: z.string(),
  name: z.string(),
  characters: z.array(z.number().int()),
})
const charPair = z.object({
  id: z.string(),
  a: z.number().int().nullable(),
  b: z.number().int().nullable(),
})

/** The test-data subset of the store (matches the testee's persisted shape, minus prefs). */
const resumeSchema = z.object({
  phase: z.enum(['start', 'names', 'elicitation', 'result']),
  names: z.array(z.string()),
  drafts: z.array(z.string()),
  nameIndex: z.number().int(),
  constructs: z.array(construct),
  triadIndex: z.number().int(),
  savedTables: z.array(savedTable),
  pairsByTable: z.record(z.string(), z.array(charPair)),
  activePairByTable: z.record(z.string(), z.string().nullable()),
})
export type ResumeState = z.infer<typeof resumeSchema>

function snapshot(): ResumeState {
  const s = useAppStore.getState()
  return {
    phase: s.phase,
    names: s.names,
    drafts: s.drafts,
    nameIndex: s.nameIndex,
    constructs: s.constructs,
    triadIndex: s.triadIndex,
    savedTables: s.savedTables,
    pairsByTable: s.pairsByTable,
    activePairByTable: s.activePairByTable,
  }
}

/** Rehydrate only the test-data fields; prefs + session in the store stay as they are. */
function rehydrate(state: ResumeState) {
  useAppStore.setState(state)
}

const workerBase = () => {
  const local = /^(localhost|127\.|0\.0\.0\.0)/.test(PARTYKIT_HOST)
  return `${local ? 'http' : 'https'}://${PARTYKIT_HOST}`
}

// ---- short KV link ----------------------------------------------------------------------------
// Reuse the last code when the state hasn't changed, so re-opening the dialog doesn't burn a KV write.
let lastJson: string | null = null
let lastLink: string | null = null

/** Store the current state and return a short resume link `/(origin)/r/<code>`. Throws if the relay
 *  can't be reached (the dialog then falls back to offering the save file). */
export async function createResumeLink(): Promise<string> {
  const json = JSON.stringify(snapshot())
  if (json === lastJson && lastLink) return lastLink
  const res = await fetch(`${workerBase()}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  })
  if (!res.ok) throw new Error(`resume store failed (${res.status})`)
  const { code } = (await res.json()) as { code: string }
  lastLink = `${location.origin}/r/${code}`
  lastJson = json
  return lastLink
}

/** Fetch a code's state from KV, validate, and rehydrate. Returns true when a session was restored. */
export async function consumeResumeCode(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${workerBase()}/resume/${encodeURIComponent(code)}`)
    if (!res.ok) return false
    const parsed = resumeSchema.safeParse(await res.json())
    if (!parsed.success) return false
    rehydrate(parsed.data)
    return true
  } catch {
    return false
  }
}

// ---- self-contained save file (archive) -------------------------------------------------------
/** Build a downloadable, server-free archive of the current test state (plain JSON, versioned). */
export function buildSaveFile(): { filename: string; text: string } {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  return {
    filename: `repgrid-save-${stamp}.json`,
    text: JSON.stringify({ v: 1, state: snapshot() }, null, 2),
  }
}

/** Restore from a save file's text. Accepts the `{ v, state }` wrapper or a bare state object. */
export function importSaveData(text: string): boolean {
  try {
    const obj: unknown = JSON.parse(text)
    const candidate =
      obj && typeof obj === 'object' && 'state' in obj ? (obj as { state: unknown }).state : obj
    const parsed = resumeSchema.safeParse(candidate)
    if (!parsed.success) return false
    rehydrate(parsed.data)
    return true
  } catch {
    return false
  }
}
