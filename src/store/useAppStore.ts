import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import i18n from '@/i18n'
import { DEFAULT_LOCALE } from '@/i18n/config'
import type { Locale } from '@/i18n/config'
import { GRID_SIZE } from '@/data'

export type Phase = 'start' | 'names' | 'elicitation' | 'result'
export type Theme = 'light' | 'dark'

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
  language: Locale
  theme: Theme
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

  setLanguage: (locale: Locale) => void
  toggleTheme: () => void
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
}

const emptyRow = (): string[] => Array.from({ length: GRID_SIZE }, () => '')
const emptyConstruct = (): Construct => ({ oddPos: null, emergent: '', contrast: '', selected: [] })
const emptyConstructs = (): Construct[] => Array.from({ length: GRID_SIZE }, emptyConstruct)
const emptyPair = (): CharPair => ({ id: nanoid(), a: null, b: null })

const freshTest = () => ({
  nameIndex: 0,
  names: emptyRow(),
  drafts: emptyRow(),
  constructs: emptyConstructs(),
  triadIndex: 0,
  // Custom tables + per-table comparison pairs derive from this grid, so a new test clears both.
  savedTables: [] as SavedTable[],
  pairsByTable: {} as Record<string, CharPair[]>,
  activePairByTable: {} as Record<string, string | null>,
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
        language: DEFAULT_LOCALE,
        theme: 'light',
        phase: 'start',
        ...freshTest(),

        setLanguage: (language) => {
          void i18n.changeLanguage(language)
          set({ language })
        },
        toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
        setPhase: (phase) => set({ phase }),
        setName: (index, value) =>
          set((s) => {
            const names = s.names.slice()
            names[index] = value
            const drafts = s.drafts.slice()
            drafts[index] = '' // committing clears the pending draft
            return { names, drafts }
          }),
        saveDraft: (index, value) =>
          set((s) => {
            const v = value.trim()
            const drafts = s.drafts.slice()
            drafts[index] = v && v !== (s.names[index] ?? '').trim() ? value : ''
            return { drafts }
          }),
        setNameIndex: (nameIndex) => set({ nameIndex }),

        setOdd: (oddPos) => patchConstruct({ oddPos }),
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
            return { constructs }
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
      }
    },
    {
      name: 'repgrid',
      version: 5,
      // Persist the whole session so a refresh never loses progress (localStorage autosave).
      partialize: (s) => ({
        language: s.language,
        theme: s.theme,
        phase: s.phase,
        names: s.names,
        drafts: s.drafts,
        nameIndex: s.nameIndex,
        constructs: s.constructs,
        triadIndex: s.triadIndex,
        savedTables: s.savedTables,
        pairsByTable: s.pairsByTable,
        activePairByTable: s.activePairByTable,
      }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>
        if (version < 2) {
          // The names model changed (committed vs drafts, contiguous completion); the old
          // shape could hold gaps. Reset the test but keep UI preferences.
          return {
            language: p.language ?? DEFAULT_LOCALE,
            theme: p.theme ?? 'light',
            phase: 'start',
            ...freshTest(),
          } as unknown as AppState
        }
        // v2 → v3 added custom tables; v3 → v4 a global pairs list; v4 → v5 made pairs per-table.
        // Older sessions get sensible defaults (no custom tables, no pairs).
        return {
          ...p,
          savedTables: p.savedTables ?? [],
          pairsByTable: p.pairsByTable ?? {},
          activePairByTable: p.activePairByTable ?? {},
        } as unknown as AppState
      },
    },
  ),
)
