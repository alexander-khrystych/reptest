import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { GRID_SIZE } from '@/data'
import { IS_OBSERVER } from '@/session/config'
import type { BoardSnapshot } from '@/session/protocol'

export type Phase =
  | 'start'
  | 'names'
  | 'elicitation'
  | 'result'
  // The optional 3rd flow (distill the 22×22 into a focused 10×10), launched from the result screen.
  | 'g10chars'
  | 'g10group'
  | 'g10elicit'
  // The 4th flow — rank the 10 characters against the 10×10's constructs (+ a fixed 11th good/bad),
  // launched separately once the 10×10 grid exists; produces the Spearman matrices.
  | 'g10rank'
// language + theme moved to the global (non-role-scoped) usePrefsStore.

/**
 * One elicited construct (one grid row). `oddPos` is the 0-based card position of the
 * "different" triad card; the other two triad cards are the alike pair (auto-matched).
 * `selected` are the 0-based positions among the other 19 that also share the emergent pole.
 */
export interface Construct {
  oddPos: number | null
  emergent: string
  contrast: string
  selected: number[]
}

/**
 * 10×10 flow types. A `G10Group` is one kept row (→ one 10×10 construct); `sources` are 0-based
 * indices into the 22 `constructs`. A single-source group mirrors its source's poles; a merged
 * (multi-source) group carries the testee's new `emergent`/`contrast`. A `G10Iter` is one of the
 * 10 elicitation iterations that build the grid — `triad`/`oddPos`/`selected` are indices 0–9 into
 * `chars`, `construct` is an index 0–9 into `groups`. `Grid10` is the finished 10×10 grid shown in
 * Tables; `Grid10Draft` is the in-progress creation flow (kept separate so cancelling a rebuild
 * never drops a finished one).
 */
export interface G10Group {
  id: string
  sources: number[]
  emergent: string
  contrast: string
}
export interface G10Iter {
  triad: number[]
  construct: number | null
  oddPos: number | null
  selected: number[]
}
export interface Grid10 {
  chars: number[]
  groups: G10Group[]
  elicit: G10Iter[]
}
export interface Grid10Draft {
  step: 'chars' | 'group' | 'elicit'
  chars: number[]
  groups: G10Group[]
  /** The "existing constructs" pool, kept as an explicit ordered list so a construct moved back
   *  lands at the bottom (not re-sorted by index). */
  pool: number[]
  thrown: number[]
  elicit: G10Iter[]
  iter: number
}

/**
 * The separate "constructs ranking" flow (launched once the 10×10 grid exists). It reuses the
 * grid's `chars` + `groups` (no re-pick, no re-filter) and ranks the characters against each of the
 * `groups.length + 1` constructs — the 10 elicited ones plus a fixed 11th "good/bad". Each
 * `orders[k]` is a permutation of the character-slot indices 0–9 (indices into the grid's `chars`)
 * in ranked order — `orders[k][0]` is the character most like construct k's elicited pole. The
 * Spearman matrices (see `lib/spearman`) derive entirely from these rankings. `Ranking` is the
 * finished result; `RankDraft` is the in-progress flow.
 */
export type Ranking = number[][]
export interface RankDraft {
  orders: number[][]
  iter: number
}

/**
 * A saved custom comparison table (part 1 of results analysis). Customization is *which*
 * characters are shown: `characters` holds their 0-based name positions, in display order.
 * The class column and both poles are always present, so only the character columns vary.
 * The complete default table is synthesised (all positions) and never stored here.
 */
export interface SavedTable {
  id: string
  name: string
  characters: number[]
}

/**
 * A character-pair comparison (data analysis): two characters compared by how their construct
 * relations agree. `a`/`b` are 0-based character positions, null while still being chosen.
 * Up to 5 pairs; only the first (top) pair drives the on-grid highlight.
 */
export interface CharPair {
  id: string
  a: number | null
  b: number | null
}

/**
 * Pairs are scoped per table, keyed by table id. The synthesised "complete table" isn't in
 * savedTables, so it needs a stable id to key its pairs by.
 */
export const DEFAULT_TABLE_ID = '__default__'

/**
 * The single source of truth for the app (the spec's architectural spine).
 *
 * Names have two layers: `names` (committed, drives the counter) vs `drafts` (per-card
 * unsubmitted text). `constructs` holds the 22 elicited rows; `triadIndex` is the cursor.
 */
interface AppState {
  phase: Phase
  names: string[]
  drafts: string[]
  nameIndex: number
  constructs: Construct[]
  triadIndex: number
  savedTables: SavedTable[]
  // Pairs are scoped per table (keyed by table id, incl. DEFAULT_TABLE_ID); each table also
  // has at most one active pair — the one highlighted on the grid.
  pairsByTable: Record<string, CharPair[]>
  activePairByTable: Record<string, string | null>
  /** Monotonic counter bumped on every board change that should be broadcast (see @/session).
   *  Not persisted — a fresh reload re-baselines it. */
  boardRev: number
  /** The result grid was reached via the demo shortcut (Back-to-start instead of Start over). */
  demo: boolean
  /** The finished 10×10 grid (null until the creation flow completes); its table shows in Tables. */
  grid10: Grid10 | null
  /** The in-progress 10×10 creation-flow draft (null when not building one). */
  g10draft: Grid10Draft | null
  /** The finished constructs ranking (null until the ranking flow completes); drives the matrices. */
  ranking: Ranking | null
  /** The in-progress ranking-flow draft (null when not ranking). */
  rankDraft: RankDraft | null

  setPhase: (phase: Phase) => void
  setName: (index: number, value: string) => void
  saveDraft: (index: number, value: string) => void
  setNameIndex: (index: number) => void
  // elicitation — mutate the construct at the current triadIndex
  setOdd: (oddPos: number) => void
  setEmergent: (text: string) => void
  setContrast: (text: string) => void
  toggleSelected: (pos: number) => void
  setTriadIndex: (index: number) => void
  /** Enter elicitation, landing on the resume point (see linear-cycle rules). */
  enterElicitation: () => void
  startTest: () => void
  reset: () => void
  // 10×10 grid creation flow (chars → group → elicit) — see the Grid10* types above
  startGrid10: () => void
  cancelGrid10: () => void
  /** Step back one flow step (group → chars). */
  g10Back: () => void
  toggleG10Char: (pos: number) => void
  submitG10Chars: () => void
  /** Move construct `constructIdx` to a group (`target` = group id), a fresh row ('new'), or 'throw'. */
  moveG10: (constructIdx: number, target: string) => void
  setG10Pole: (groupId: string, field: 'emergent' | 'contrast', value: string) => void
  submitG10Groups: () => void
  // Step 3 (grid build) — elicitation, one iteration per construct.
  setG10Iter: (i: number) => void
  toggleG10Triad: (charIdx: number) => void
  setG10Construct: (constructIdx: number) => void
  setG10Odd: (charIdx: number) => void
  toggleG10Match: (charIdx: number) => void
  submitG10Iter: () => void
  // Constructs ranking flow (separate; requires a built grid10) — one ranking per construct.
  /** Enter/resume the ranking flow. No-op until the 10×10 grid exists. */
  startRanking: () => void
  cancelRanking: () => void
  /** Replace the current construct's ranking (the character-slot order, top = rank 1). */
  setRankOrder: (order: number[]) => void
  /** Advance to the next construct, or (on the last) finalise the ranking and return to result. */
  rankNext: () => void
  /** Go back a construct, or (on the first) exit to result, keeping the draft to resume. */
  rankBack: () => void
  // custom comparison tables — the complete default table is synthesised, not stored
  addTable: (name: string, characters: number[]) => string
  renameTable: (id: string, name: string) => void
  deleteTable: (id: string) => void
  // character-pair comparisons (data analysis) — scoped per table
  addPair: (tableId: string) => void
  removePair: (tableId: string, id: string) => void
  setPairChar: (tableId: string, id: string, slot: 'a' | 'b', value: number | null) => void
  /** Toggle a pair as the (single) active one for its table; clicking the active one clears it. */
  toggleActivePair: (tableId: string, id: string) => void
  clearTablePairs: (tableId: string) => void

  // live sharing (see @/session)
  /** Bump the broadcast revision after committing a board change that should sync — clicks commit
   *  at once; text inputs (names, poles) commit on blur only when their value actually changed. */
  bumpBoard: () => void
  /** Observer only: replace the board (names + constructs) with a snapshot from the room. */
  applySnapshot: (board: BoardSnapshot) => void
}

const emptyRow = (): string[] => Array.from({ length: GRID_SIZE }, () => '')
const emptyConstruct = (): Construct => ({ oddPos: null, emergent: '', contrast: '', selected: [] })
const emptyConstructs = (): Construct[] => Array.from({ length: GRID_SIZE }, emptyConstruct)
const emptyPair = (): CharPair => ({ id: nanoid(), a: null, b: null })
const emptyG10Iter = (): G10Iter => ({ triad: [], construct: null, oddPos: null, selected: [] })
const freshG10Draft = (): Grid10Draft => ({
  step: 'chars',
  chars: [0], // "me" (position 0) starts selected and can't be removed
  groups: [],
  pool: [],
  thrown: [],
  elicit: [],
  iter: 0,
})
/** Identity ranking [0,1,…,n-1] — the default order shown before the testee drags anything. */
const identityOrder = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

const freshTest = () => ({
  nameIndex: 0,
  names: emptyRow(),
  drafts: emptyRow(),
  constructs: emptyConstructs(),
  triadIndex: 0,
  // True only for the demo-result shortcut, which shows a Back button instead of Start over.
  demo: false,
  // Custom tables + per-table comparison pairs derive from this grid, so a new test clears both.
  savedTables: [] as SavedTable[],
  pairsByTable: {} as Record<string, CharPair[]>,
  activePairByTable: {} as Record<string, string | null>,
  // The 10×10 grid + the constructs ranking (and any in-progress build of either) are tied to this test.
  grid10: null as Grid10 | null,
  g10draft: null as Grid10Draft | null,
  ranking: null as Ranking | null,
  rankDraft: null as RankDraft | null,
})

export const useAppStore = create<AppState>()(
  persist(
    (set) => {
      // Patch the construct at the current triadIndex.
      const patchConstruct = (patch: Partial<Construct>) =>
        set((s) => {
          const constructs = s.constructs.slice()
          constructs[s.triadIndex] = { ...constructs[s.triadIndex], ...patch }
          return { constructs }
        })

      return {
        phase: 'start',
        boardRev: 0,
        ...freshTest(),

        setPhase: (phase) => set({ phase }),
        setName: (index, value) =>
          set((s) => {
            const names = s.names.slice()
            names[index] = value
            const drafts = s.drafts.slice()
            drafts[index] = '' // committing clears the pending draft
            // A name commits (Enter/Next/Finish) already meaning "focus off + changed" — broadcast.
            return { names, drafts, boardRev: s.boardRev + 1 }
          }),
        saveDraft: (index, value) =>
          set((s) => {
            const v = value.trim()
            const drafts = s.drafts.slice()
            drafts[index] = v && v !== (s.names[index] ?? '').trim() ? value : ''
            return { drafts }
          }),
        setNameIndex: (nameIndex) => set({ nameIndex }),

        // A click — commits (and broadcasts) at once, unlike the pole text inputs below.
        setOdd: (oddPos) =>
          set((s) => {
            const constructs = s.constructs.slice()
            constructs[s.triadIndex] = { ...constructs[s.triadIndex], oddPos }
            return { constructs, boardRev: s.boardRev + 1 }
          }),
        // Pole text: mutate live for the testee's own screen, but DON'T bump here — the
        // elicitation inputs call bumpBoard() on blur, only when the value actually changed.
        setEmergent: (emergent) => patchConstruct({ emergent }),
        setContrast: (contrast) => patchConstruct({ contrast }),
        toggleSelected: (pos) =>
          set((s) => {
            const constructs = s.constructs.slice()
            const cur = constructs[s.triadIndex]
            const selected = cur.selected.includes(pos)
              ? cur.selected.filter((p) => p !== pos)
              : [...cur.selected, pos]
            constructs[s.triadIndex] = { ...cur, selected }
            return { constructs, boardRev: s.boardRev + 1 } // a tap — broadcast at once
          }),
        setTriadIndex: (triadIndex) => set({ triadIndex }),
        enterElicitation: () =>
          set((s) => {
            const touched = (c: Construct) =>
              c.oddPos !== null ||
              c.emergent.trim() !== '' ||
              c.contrast.trim() !== '' ||
              c.selected.length > 0
            let last = -1
            s.constructs.forEach((c, i) => {
              if (touched(c)) last = i
            })
            let triadIndex = 0
            if (last !== -1) {
              const next = last + 1
              const nextUntouched = next > GRID_SIZE - 1 || !touched(s.constructs[next])
              // A last-touched construct with no selections is ambiguous (0 matches can be
              // "done" or "mid-selection"), so land back on it rather than skipping ahead.
              triadIndex =
                nextUntouched && s.constructs[last].selected.length === 0
                  ? last
                  : Math.min(next, GRID_SIZE - 1)
            }
            return { phase: 'elicitation', triadIndex }
          }),

        startTest: () => set({ phase: 'names', ...freshTest() }),
        reset: () => set({ phase: 'start', ...freshTest() }),

        // ---- 10×10 grid creation flow ------------------------------------------------------
        startGrid10: () =>
          set((s) => {
            const d = s.g10draft ?? freshG10Draft()
            const phase = d.step === 'group' ? 'g10group' : d.step === 'elicit' ? 'g10elicit' : 'g10chars'
            return { g10draft: d, phase }
          }),
        cancelGrid10: () => set({ g10draft: null, phase: 'result' }),
        g10Back: () =>
          set((s) => {
            const d = s.g10draft
            if (!d) return s
            if (d.step === 'group') return { g10draft: { ...d, step: 'chars' }, phase: 'g10chars' }
            if (d.step === 'elicit') return { g10draft: { ...d, step: 'group' }, phase: 'g10group' }
            return s
          }),
        toggleG10Char: (pos) =>
          set((s) => {
            const d = s.g10draft
            if (!d || pos === 0) return s // "me" is locked selected
            const has = d.chars.includes(pos)
            if (!has && d.chars.length >= 10) return s // cap at 10
            const chars = has ? d.chars.filter((p) => p !== pos) : [...d.chars, pos]
            return { g10draft: { ...d, chars } }
          }),
        submitG10Chars: () =>
          set((s) => {
            const d = s.g10draft
            if (!d || d.chars.length !== 10) return s
            // Step 2 starts with all 22 constructs in the middle "existing" pool (no keep rows,
            // nothing thrown yet).
            return {
              g10draft: { ...d, step: 'group', groups: [], thrown: [], pool: identityOrder(GRID_SIZE) },
              phase: 'g10group',
            }
          }),
        moveG10: (idx, target) =>
          set((s) => {
            const d = s.g10draft
            if (!d) return s
            // "Keep" is capped at 10 new constructs — creating an 11th row is a no-op (the card
            // returns to origin). Merging into an existing row doesn't add a row, so it's allowed.
            if (target === 'new' && d.groups.length >= 10) return s
            let groups = d.groups.map((g) => ({ ...g, sources: g.sources.filter((x) => x !== idx) }))
            let thrown = d.thrown.filter((x) => x !== idx)
            let pool = d.pool.filter((x) => x !== idx)
            // A moved construct lands at the bottom of its destination column (append).
            if (target === 'throw') thrown = [...thrown, idx]
            else if (target === 'middle') pool = [...pool, idx]
            else if (target === 'new')
              groups = [...groups, { id: nanoid(), sources: [idx], emergent: '', contrast: '' }]
            else groups = groups.map((g) => (g.id === target ? { ...g, sources: [...g.sources, idx] } : g))
            groups = groups.filter((g) => g.sources.length > 0)
            // Single-source rows mirror their source's poles; a merged row keeps the testee's new
            // poles, but is blanked while they still look like a copied original (i.e. just merged).
            groups = groups.map((g) => {
              if (g.sources.length === 1) {
                const c = s.constructs[g.sources[0]]
                return { ...g, emergent: c.emergent, contrast: c.contrast }
              }
              const looksOriginal = g.sources.some(
                (si) =>
                  s.constructs[si].emergent === g.emergent && s.constructs[si].contrast === g.contrast,
              )
              return looksOriginal ? { ...g, emergent: '', contrast: '' } : g
            })
            return { g10draft: { ...d, groups, thrown, pool } }
          }),
        setG10Pole: (groupId, field, value) =>
          set((s) =>
            s.g10draft
              ? {
                  g10draft: {
                    ...s.g10draft,
                    groups: s.g10draft.groups.map((g) => (g.id === groupId ? { ...g, [field]: value } : g)),
                  },
                }
              : s,
          ),
        submitG10Groups: () =>
          set((s) => {
            const d = s.g10draft
            if (!d || d.groups.length !== 10) return s
            const ready = d.groups.every(
              (g) => g.sources.length === 1 || (g.emergent.trim() !== '' && g.contrast.trim() !== ''),
            )
            if (!ready) return s
            // Keep any elicitation already done (group → elicit → group → elicit shouldn't wipe it);
            // else start with one blank iteration per kept construct.
            const elicit = d.elicit.length === 10 ? d.elicit : Array.from({ length: 10 }, emptyG10Iter)
            return { g10draft: { ...d, step: 'elicit', elicit, iter: 0 }, phase: 'g10elicit' }
          }),
        setG10Iter: (i) =>
          set((s) =>
            s.g10draft ? { g10draft: { ...s.g10draft, iter: Math.max(0, Math.min(9, i)) } } : s,
          ),
        toggleG10Triad: (ci) =>
          set((s) => {
            const d = s.g10draft
            if (!d) return s
            const it = d.elicit[d.iter]
            let triad: number[]
            if (it.triad.includes(ci)) triad = it.triad.filter((x) => x !== ci)
            else if (it.triad.length < 3) triad = [...it.triad, ci]
            else return s // a triad holds exactly 3
            const oddPos = it.oddPos !== null && triad.includes(it.oddPos) ? it.oddPos : null
            const selected = it.selected.filter((x) => !triad.includes(x))
            const elicit = d.elicit.slice()
            elicit[d.iter] = { ...it, triad, oddPos, selected }
            return { g10draft: { ...d, elicit } }
          }),
        setG10Construct: (ci) =>
          set((s) => {
            const d = s.g10draft
            if (!d) return s
            if (d.elicit.some((it, i) => i !== d.iter && it.construct === ci)) return s // used once
            const elicit = d.elicit.slice()
            const cur = d.elicit[d.iter].construct
            elicit[d.iter] = { ...d.elicit[d.iter], construct: cur === ci ? null : ci }
            return { g10draft: { ...d, elicit } }
          }),
        setG10Odd: (ci) =>
          set((s) => {
            const d = s.g10draft
            if (!d || !d.elicit[d.iter].triad.includes(ci)) return s
            const elicit = d.elicit.slice()
            const cur = d.elicit[d.iter].oddPos
            elicit[d.iter] = { ...d.elicit[d.iter], oddPos: cur === ci ? null : ci }
            return { g10draft: { ...d, elicit } }
          }),
        toggleG10Match: (ci) =>
          set((s) => {
            const d = s.g10draft
            if (!d || d.elicit[d.iter].triad.includes(ci)) return s // matches come from the other 7
            const it = d.elicit[d.iter]
            const selected = it.selected.includes(ci)
              ? it.selected.filter((x) => x !== ci)
              : [...it.selected, ci]
            const elicit = d.elicit.slice()
            elicit[d.iter] = { ...it, selected }
            return { g10draft: { ...d, elicit } }
          }),
        submitG10Iter: () =>
          set((s) => {
            const d = s.g10draft
            if (!d) return s
            if (d.iter < 9) return { g10draft: { ...d, iter: d.iter + 1 } }
            // last iteration → finalise the 10×10 grid, return to result, and broadcast (boardRev++).
            // A rebuilt grid invalidates any prior ranking (its constructs may have changed), so drop it.
            const grid10: Grid10 = { chars: d.chars, groups: d.groups, elicit: d.elicit }
            return {
              grid10,
              g10draft: null,
              ranking: null,
              rankDraft: null,
              phase: 'result',
              boardRev: s.boardRev + 1,
            }
          }),

        // ---- constructs ranking flow (separate; needs a built grid10) ----------------------
        startRanking: () =>
          set((s) => {
            if (!s.grid10) return s // locked until the 10×10 grid exists
            const numC = s.grid10.groups.length + 1 // the 10 constructs + the fixed 11th (good/bad)
            const d = s.rankDraft ?? {
              orders: Array.from({ length: numC }, () => identityOrder(s.grid10!.chars.length)),
              iter: 0,
            }
            return { rankDraft: d, phase: 'g10rank' }
          }),
        cancelRanking: () => set({ rankDraft: null, phase: 'result' }),
        setRankOrder: (order) =>
          set((s) => {
            const d = s.rankDraft
            if (!d) return s
            const orders = d.orders.slice()
            orders[d.iter] = order
            return { rankDraft: { ...d, orders } }
          }),
        rankNext: () =>
          set((s) => {
            const d = s.rankDraft
            if (!d) return s
            if (d.iter < d.orders.length - 1) return { rankDraft: { ...d, iter: d.iter + 1 } }
            // last construct → finalise the ranking, return to result, and broadcast it (boardRev++).
            return { ranking: d.orders, rankDraft: null, phase: 'result', boardRev: s.boardRev + 1 }
          }),
        rankBack: () =>
          set((s) => {
            const d = s.rankDraft
            if (!d) return s
            if (d.iter > 0) return { rankDraft: { ...d, iter: d.iter - 1 } }
            return { phase: 'result' } // exit to result but keep the draft, so it resumes here
          }),

        addTable: (name, characters) => {
          const id = nanoid()
          set((s) => ({ savedTables: [...s.savedTables, { id, name, characters }] }))
          return id
        },
        renameTable: (id, name) =>
          set((s) => ({ savedTables: s.savedTables.map((t) => (t.id === id ? { ...t, name } : t)) })),
        deleteTable: (id) =>
          set((s) => {
            const pairsByTable = { ...s.pairsByTable }
            const activePairByTable = { ...s.activePairByTable }
            delete pairsByTable[id]
            delete activePairByTable[id]
            return {
              savedTables: s.savedTables.filter((t) => t.id !== id),
              pairsByTable,
              activePairByTable,
            }
          }),

        addPair: (tableId) =>
          set((s) => {
            const list = s.pairsByTable[tableId] ?? []
            if (list.length >= 5) return s
            return { pairsByTable: { ...s.pairsByTable, [tableId]: [...list, emptyPair()] } }
          }),
        removePair: (tableId, id) =>
          set((s) => {
            const list = (s.pairsByTable[tableId] ?? []).filter((p) => p.id !== id)
            const wasActive = s.activePairByTable[tableId] === id
            return {
              pairsByTable: { ...s.pairsByTable, [tableId]: list },
              ...(wasActive
                ? { activePairByTable: { ...s.activePairByTable, [tableId]: null } }
                : null),
            }
          }),
        setPairChar: (tableId, id, slot, value) =>
          set((s) => ({
            pairsByTable: {
              ...s.pairsByTable,
              [tableId]: (s.pairsByTable[tableId] ?? []).map((p) =>
                p.id === id ? { ...p, [slot]: value } : p,
              ),
            },
          })),
        toggleActivePair: (tableId, id) =>
          set((s) => ({
            activePairByTable: {
              ...s.activePairByTable,
              [tableId]: s.activePairByTable[tableId] === id ? null : id,
            },
          })),
        clearTablePairs: (tableId) =>
          set((s) => {
            const pairsByTable = { ...s.pairsByTable }
            const activePairByTable = { ...s.activePairByTable }
            delete pairsByTable[tableId]
            delete activePairByTable[tableId]
            return { pairsByTable, activePairByTable }
          }),

        bumpBoard: () => set((s) => ({ boardRev: s.boardRev + 1 })),
        // Observer only: the room is the source of truth for the board; the observer's own
        // analysis (savedTables / pairs / highlights) is untouched and stays local.
        applySnapshot: (board) =>
          set({
            names: board.names,
            constructs: board.constructs,
            grid10: board.grid10 ?? null,
            ranking: board.ranking ?? null,
          }),
      }
    },
    {
      // Observer tabs use a separate key so a live view can never overwrite a real test in the
      // same browser; their board comes live from the room, so only prefs are persisted.
      name: IS_OBSERVER ? 'repgrid:observer' : 'repgrid',
      version: 9,
      // Persist the whole session so a refresh never loses progress (localStorage autosave).
      partialize: (s) =>
        IS_OBSERVER
          ? {
              // The observer's board comes live from the room, so it's never persisted — but the
              // observer's OWN analysis (custom tables + per-table pairs) must survive a refresh.
              // (language + theme live in the global usePrefsStore, shared across modes.)
              savedTables: s.savedTables,
              pairsByTable: s.pairsByTable,
              activePairByTable: s.activePairByTable,
            }
          : {
              phase: s.phase,
              names: s.names,
              drafts: s.drafts,
              nameIndex: s.nameIndex,
              constructs: s.constructs,
              triadIndex: s.triadIndex,
              demo: s.demo,
              savedTables: s.savedTables,
              pairsByTable: s.pairsByTable,
              activePairByTable: s.activePairByTable,
              grid10: s.grid10,
              g10draft: s.g10draft,
              ranking: s.ranking,
              rankDraft: s.rankDraft,
            },
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>
        if (version < 2) {
          // The names model changed (committed vs drafts, contiguous completion); the old
          // shape could hold gaps. Reset the test (language/theme now live in usePrefsStore).
          return { phase: 'start', ...freshTest() } as unknown as AppState
        }
        // v2 → v3 added custom tables; v3 → v4 a global pairs list; v4 → v5 made pairs per-table;
        // v5 → v6 added the 10×10 flow; v6 → v7 reworked step 3 (elicitation → ranking); v7 → v8
        // split them back apart (grid build vs. a separate ranking flow); v8 → v9 gave the grouping
        // draft an explicit `pool`. Any pre-v9 10×10 / ranking state is dropped. Older sessions get
        // sensible defaults.
        const staleG10 = version < 9
        // Dropping the in-progress drafts also means we can't sit on a 10×10 flow phase — and a
        // renamed phase may no longer map to a screen. Bounce any flow phase back to result.
        const phase =
          staleG10 && typeof p.phase === 'string' && p.phase.startsWith('g10') ? 'result' : p.phase
        return {
          ...p,
          phase,
          savedTables: p.savedTables ?? [],
          pairsByTable: p.pairsByTable ?? {},
          activePairByTable: p.activePairByTable ?? {},
          grid10: staleG10 ? null : (p.grid10 ?? null),
          g10draft: staleG10 ? null : (p.g10draft ?? null),
          ranking: staleG10 ? null : (p.ranking ?? null),
          rankDraft: staleG10 ? null : (p.rankDraft ?? null),
        } as unknown as AppState
      },
    },
  ),
)
