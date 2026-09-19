import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { useAppStore, DEFAULT_TABLE_ID } from '@/store/useAppStore'
import { useResultUi } from '@/store/useResultUi'
import { IS_OBSERVER } from '@/session/config'
import { TableBuilderDialog } from '@/components/TableBuilderDialog'
import { ExportDialog } from '@/components/ExportDialog'
import { PairsPanel } from '@/components/PairsPanel'
import { GridLegend } from '@/components/GridLegend'
import { dialogFooter, useDialogKeys } from '@/components/dialogKit'
import { pairScore } from '@/lib/pairScore'
import { GridTable } from './GridTable'
import { RelationshipsTable } from './RelationshipsTable'
import { ConstructsDiagram } from './ConstructsDiagram'
import { ConstructsRelTable } from './ConstructsRelTable'
import { Grid10Table } from './Grid10Table'
import { Grid10MatrixTable } from './Grid10MatrixTable'
import './resultGrid.css'

const neutralBtn = 'rounded-[9px] border border-line px-4 py-2 text-sm text-ink hover:border-ink-3'

/** Synthetic ids for the pinned analysis views, beside the DEFAULT_TABLE_ID grid. */
const RELATIONSHIPS_TABLE_ID = '__relationships__'
const DIAGRAM_TABLE_ID = '__diagram__'
const CREL_TABLE_ID = '__crel__'
const GRID10_TABLE_ID = '__grid10__'
const RHO_TABLE_ID = '__rho__'
const RHO2_TABLE_ID = '__rho2__'

interface ViewTable {
  id: string
  name: string
  characters: number[]
  pinned?: boolean
  /** 'grid' (main + custom), 'relationships', 'diagram', 'crel' (constructs relations table), the
   *  concentrated 10×10 grid ('grid10'), or the Spearman matrices 'rho' (ρ) / 'rho2' (ρ² × 100). */
  kind?: 'grid' | 'relationships' | 'diagram' | 'crel' | 'grid10' | 'rho' | 'rho2'
}

type Builder = { mode: 'new' } | { mode: 'rename'; id: string; name: string }

/**
 * Result — the analysis workspace (Flow B step 7 onward). Part 1 of results analysis is the
 * custom-table library: the completed grid is the read-only "complete table", pinned at the
 * top of a left overlay drawer; the user builds custom tables that compare a chosen subset of
 * characters (same rows, same poles, fewer columns). Only one table shows at a time — the
 * drawer floats over it so the grid never loses width. Export bundles any chosen tables into
 * one PDF, one table per page.
 *
 * The drawer, dialogs and scrims are portalled to <body>: the per-phase `.animate-fade`
 * wrapper animates `transform`, which makes it the containing block for `position: fixed`,
 * so overlays left in place would anchor to the padded stage instead of the viewport.
 */
export function ResultScreen() {
  const { t } = useTranslation()
  const names = useAppStore((s) => s.names)
  const constructs = useAppStore((s) => s.constructs)
  const savedTables = useAppStore((s) => s.savedTables)
  const pairsByTable = useAppStore((s) => s.pairsByTable)
  const activePairByTable = useAppStore((s) => s.activePairByTable)
  const addTable = useAppStore((s) => s.addTable)
  const renameTable = useAppStore((s) => s.renameTable)
  const deleteTable = useAppStore((s) => s.deleteTable)
  const grid10 = useAppStore((s) => s.grid10)
  const ranking = useAppStore((s) => s.ranking)
  const startGrid10 = useAppStore((s) => s.startGrid10)
  const startRanking = useAppStore((s) => s.startRanking)

  // The complete table is synthesised (all characters) and always pinned first.
  const allChars = useMemo(() => names.map((_, i) => i), [names])
  const tables: ViewTable[] = [
    { id: DEFAULT_TABLE_ID, name: t('tables.defaultName'), characters: allChars, pinned: true },
    {
      id: RELATIONSHIPS_TABLE_ID,
      name: t('tables.relationshipsName'),
      characters: allChars,
      pinned: true,
      kind: 'relationships',
    },
    {
      id: DIAGRAM_TABLE_ID,
      name: t('tables.diagramName'),
      characters: allChars,
      pinned: true,
      kind: 'diagram',
    },
    {
      id: CREL_TABLE_ID,
      name: t('tables.relconstructsName'),
      characters: [],
      pinned: true,
      kind: 'crel',
    },
    // The concentrated 10×10 grid appears once its creation flow is done.
    ...(grid10
      ? [
          {
            id: GRID10_TABLE_ID,
            name: t('tables.grid10Name'),
            characters: grid10.chars,
            pinned: true,
            kind: 'grid10' as const,
          },
        ]
      : []),
    // The Spearman matrices appear once the separate ranking flow is done.
    ...(ranking
      ? [
          {
            id: RHO_TABLE_ID,
            name: t('tables.rhoName'),
            characters: grid10?.chars ?? [],
            pinned: true,
            kind: 'rho' as const,
          },
          {
            id: RHO2_TABLE_ID,
            name: t('tables.rho2Name'),
            characters: grid10?.chars ?? [],
            pinned: true,
            kind: 'rho2' as const,
          },
        ]
      : []),
    ...savedTables,
  ]

  // After the ranking flow the first matrix is the default view; after building the grid, the grid
  // itself; otherwise the main table.
  const [currentId, setCurrentId] = useState(
    ranking ? RHO_TABLE_ID : grid10 ? GRID10_TABLE_ID : DEFAULT_TABLE_ID,
  )
  const current = tables.find((tb) => tb.id === currentId) ?? tables[0]

  // The Tables button + current table name live in the pinned header now (NavBar); publish the
  // current table there, and drive the drawer through the shared UI store.
  const drawerOpen = useResultUi((s) => s.drawerOpen)
  const closeDrawer = useResultUi((s) => s.closeDrawer)
  const setHeaderCurrent = useResultUi((s) => s.setCurrent)
  useEffect(() => {
    setHeaderCurrent(current.name, !!current.pinned)
  }, [current.name, current.pinned, setHeaderCurrent])
  useEffect(() => () => closeDrawer(), [closeDrawer]) // close the drawer when leaving the result view

  // Toggle for the matrices' 11th (good/bad) construct — shown by default.
  const [show11, setShow11] = useState(true)

  const [builder, setBuilder] = useState<Builder | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ViewTable | null>(null)
  // When set, the print-only stack renders these tables and the browser print dialog opens.
  const [exportIds, setExportIds] = useState<string[] | null>(null)
  // The construct whose relations the diagram shows (shared by the on-screen + printed diagram).
  const [diagramK, setDiagramK] = useState(0)

  // Pairs are per table; each table's single active pair (if complete) is the one hatched onto
  // its grid — the current table on screen, and each exported table in the PDF.
  const highlightFor = (tableId: string) => {
    const activeId = activePairByTable[tableId]
    if (!activeId) return null
    const pair = (pairsByTable[tableId] ?? []).find((p) => p.id === activeId)
    if (!pair || pair.a === null || pair.b === null) return null
    return { a: pair.a, b: pair.b, rows: pairScore(constructs, pair.a, pair.b).rows }
  }
  const scoredPairsFor = (tableId: string) =>
    (pairsByTable[tableId] ?? [])
      .filter((p) => p.a !== null && p.b !== null)
      .map((p) => ({ p, score: pairScore(constructs, p.a as number, p.b as number) }))

  // ESC closes the top overlay (the drawer and the builder/export/delete dialogs each register
  // themselves, so ESC peels them off one at a time). The builder + export dialogs handle their
  // own keys; here we cover the drawer and the delete-confirm.
  useDialogKeys(() => closeDrawer(), undefined, drawerOpen)

  // Print the export stack once it has rendered, then restore. A unique title keeps saved
  // PDFs from silently overwriting each other.
  useEffect(() => {
    if (!exportIds) return
    const prev = document.title
    document.title = `Repertory Grid ${nanoid(6)}`
    let done = false
    const restore = () => {
      if (done) return
      done = true
      document.title = prev
      setExportIds(null)
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    const printId = window.setTimeout(() => window.print(), 80)
    const restoreId = window.setTimeout(restore, 1500) // fallback if afterprint never fires
    return () => {
      window.clearTimeout(printId)
      window.clearTimeout(restoreId)
      window.removeEventListener('afterprint', restore)
    }
  }, [exportIds])

  const selectTable = (id: string) => {
    setCurrentId(id)
    closeDrawer()
  }
  const saveBuilder = (name: string, characters: number[]) => {
    if (builder?.mode === 'rename') {
      renameTable(builder.id, name)
    } else {
      const id = addTable(name || t('tables.untitled', { n: savedTables.length + 1 }), characters)
      setCurrentId(id)
      closeDrawer()
    }
    setBuilder(null)
  }
  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteTable(deleteTarget.id)
    if (currentId === deleteTarget.id) setCurrentId(DEFAULT_TABLE_ID)
    setDeleteTarget(null)
  }
  useDialogKeys(() => setDeleteTarget(null), confirmDelete, !!deleteTarget)

  const overlays = (
    <>
      {/* left overlay drawer — the table library */}
      <div
        className={`rg-noprint fixed inset-0 z-40 bg-black/40 transition-opacity ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => closeDrawer()}
      />
      <aside
        className={`rg-noprint fixed bottom-0 left-0 top-[var(--header-h)] z-40 flex w-[300px] max-w-[85vw] flex-col border-r border-t border-line bg-card shadow-xl transition-transform ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={t('tables.menu')}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="text-[15px] font-semibold">{t('tables.menu')}</h2>
          <button
            type="button"
            aria-label={t('tables.cancel')}
            onClick={() => closeDrawer()}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-line-2 hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setBuilder({ mode: 'new' })}
            className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-2"
          >
            <span className="text-base leading-none">+</span> {t('tables.newTable')}
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4">
          {tables.map((tb) => {
            const active = tb.id === currentId
            return (
              <div
                key={tb.id}
                className={`rounded-[10px] border ${active ? 'border-primary bg-primary-tint' : 'border-line bg-card'}`}
              >
                <button
                  type="button"
                  onClick={() => selectTable(tb.id)}
                  className="flex w-full flex-col px-3 py-2.5 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate text-[13.5px] font-semibold text-ink">
                      {tb.name}
                    </span>
                  </span>
                  <span className="mt-1 text-[11.5px] text-ink-3">
                    {tb.pinned
                      ? tb.characters.length > 0
                        ? t('tables.allChars', { n: tb.characters.length })
                        : ''
                      : t('tables.charCount', { n: tb.characters.length })}
                  </span>
                  {!tb.pinned && (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {tb.characters.slice(0, 7).map((ci) => (
                        <span
                          key={ci}
                          className="rounded border border-line-2 bg-canvas px-1 py-0.5 font-mono text-[10px] text-ink-2"
                        >
                          {names[ci] || '—'}
                        </span>
                      ))}
                      {tb.characters.length > 7 && (
                        <span className="rounded border border-line-2 bg-canvas px-1 py-0.5 font-mono text-[10px] text-ink-2">
                          +{tb.characters.length - 7}
                        </span>
                      )}
                    </span>
                  )}
                </button>
                {!tb.pinned && (
                  <div className="flex gap-2 border-t border-line-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setBuilder({ mode: 'rename', id: tb.id, name: tb.name })}
                      className="rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-3 hover:border-ink-3 hover:text-ink"
                    >
                      {t('tables.rename')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tb)}
                      className="rounded-md border border-line px-2.5 py-1 text-[11.5px] text-ink-3 hover:border-triad hover:text-triad"
                    >
                      {t('tables.delete')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* dialogs */}
      {builder && (
        <TableBuilderDialog
          mode={builder.mode}
          initialName={builder.mode === 'rename' ? builder.name : ''}
          names={names}
          onSave={saveBuilder}
          onClose={() => setBuilder(null)}
        />
      )}
      {exportOpen && (
        <ExportDialog
          tables={tables}
          onConfirm={(ids) => {
            setExportOpen(false)
            setExportIds(ids)
          }}
          onClose={() => setExportOpen(false)}
        />
      )}
      {deleteTarget && (
        <div
          className="rg-noprint fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="animate-fade relative flex w-full max-w-sm flex-col rounded-2xl border border-line bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pb-5 pt-6">
              <h2 className="mb-1 text-base font-semibold">{t('tables.deleteTitle')}</h2>
              <p className="text-sm text-ink-2">{t('tables.deleteBody', { name: deleteTarget.name })}</p>
            </div>
            <div className={dialogFooter}>
              <button type="button" onClick={() => setDeleteTarget(null)} className={neutralBtn}>
                {t('tables.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-[9px] bg-triad px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {t('tables.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div>
      {/* toolbar — the Tables button + table name now live in the pinned header (NavBar) */}
      <div className="rg-noprint mb-4 flex flex-wrap items-center gap-3">
        {/* 11th-construct (good/bad) show/hide — left-most, only on the matrix views. On = the
            Resume dialog's drop-zone drag-over highlight; off = the neutral Create-button style. */}
        {(current.kind === 'rho' || current.kind === 'rho2') && (
          <button
            type="button"
            onClick={() => setShow11((v) => !v)}
            aria-pressed={show11}
            className={
              show11
                ? 'rounded-[9px] border-2 border-primary bg-primary-tint px-4 py-2 text-sm text-ink'
                : neutralBtn
            }
          >
            {t('g10.eleventh')}
          </button>
        )}
        <span className="flex-1" />
        {/* Constructs ranking — a separate flow, greyed and locked until the 10×10 grid exists,
            sitting just left of Create. Testee-only (edits test data). */}
        {!IS_OBSERVER && (
          <button
            type="button"
            onClick={startRanking}
            disabled={!grid10}
            title={!grid10 ? t('g10.rankingLocked') : undefined}
            className={`${neutralBtn} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line`}
          >
            {t('g10.ranking')}
          </button>
        )}
        {/* the 10×10 creation flow edits test data → testee-only (hidden on the read-only screen) */}
        {!IS_OBSERVER && (
          <button type="button" onClick={startGrid10} className={neutralBtn}>
            {t('g10.create')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="rounded-[9px] bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-2"
        >
          {t('result.export')}
        </button>
      </div>

      {/* pair comparison — above the table on screen (in the PDF it moves below, see below).
          Only the grid tables have a pairs panel; the matrices + diagram do not. */}
      {(!current.kind || current.kind === 'grid') && (
        <PairsPanel tableId={currentId} characters={current.characters} />
      )}

      {/* the current view */}
      <div className="rg-noprint">
        {current.kind === 'relationships' ? (
          <RelationshipsTable characters={current.characters} />
        ) : current.kind === 'diagram' ? (
          <ConstructsDiagram selected={diagramK} onSelect={setDiagramK} />
        ) : current.kind === 'crel' ? (
          <ConstructsRelTable />
        ) : current.kind === 'grid10' ? (
          <Grid10Table grid10={grid10} />
        ) : current.kind === 'rho' || current.kind === 'rho2' ? (
          // Key by variant so switching ρ ↔ ρ²×100 remounts (drops the previous table's crosshair).
          <Grid10MatrixTable
            key={current.kind}
            grid10={grid10}
            ranking={ranking}
            variant={current.kind}
            show11={show11}
          />
        ) : (
          <GridTable characters={current.characters} highlight={highlightFor(currentId)} />
        )}
      </div>

      {createPortal(overlays, document.body)}

      {/* print-only: the export stack — one table per page, each with its own active-pair
          highlight and its own pairs list below it */}
      {exportIds && (
        <div className="rg-print-stack">
          {exportIds
            .map((id) => tables.find((tb) => tb.id === id))
            .filter((tb): tb is ViewTable => Boolean(tb))
            .map((tb) => {
              if (tb.kind === 'diagram') {
                return (
                  <section key={tb.id} className="rg-print-page">
                    <h2 className="rg-print-name">{tb.name}</h2>
                    <ConstructsDiagram selected={diagramK} onSelect={() => {}} />
                  </section>
                )
              }
              if (tb.kind === 'relationships') {
                return (
                  <section key={tb.id} className="rg-print-page">
                    <h2 className="rg-print-name">{tb.name}</h2>
                    <RelationshipsTable characters={tb.characters} />
                  </section>
                )
              }
              if (tb.kind === 'crel') {
                return (
                  <section key={tb.id} className="rg-print-page">
                    <h2 className="rg-print-name">{tb.name}</h2>
                    <ConstructsRelTable interactive={false} />
                  </section>
                )
              }
              if (tb.kind === 'grid10') {
                return (
                  <section key={tb.id} className="rg-print-page">
                    <h2 className="rg-print-name">{tb.name}</h2>
                    <Grid10Table grid10={grid10} interactive={false} />
                  </section>
                )
              }
              if (tb.kind === 'rho' || tb.kind === 'rho2') {
                return (
                  <section key={tb.id} className="rg-print-page">
                    <h2 className="rg-print-name">{tb.name}</h2>
                    <Grid10MatrixTable
                      grid10={grid10}
                      ranking={ranking}
                      variant={tb.kind}
                      show11={show11}
                      interactive={false}
                    />
                  </section>
                )
              }
              const tPairs = scoredPairsFor(tb.id)
              return (
                <section key={tb.id} className="rg-print-page">
                  <h2 className="rg-print-name">{tb.name}</h2>
                  <GridLegend className="mb-2" />
                  <GridTable
                    characters={tb.characters}
                    interactive={false}
                    highlight={highlightFor(tb.id)}
                  />
                  {tPairs.length > 0 && (
                    <div className="rg-print-pairs">
                      <h3>{t('pairs.pdfHeading')}</h3>
                      {tPairs.map(({ p, score }) => (
                        <div key={p.id} className="rg-print-pair">
                          {names[p.a as number] || '—'} × {names[p.b as number] || '—'}
                          {'  '}
                          <span className="pos">+{score.pos}</span>
                          <span> : </span>
                          <span className="neg">-{score.neg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
        </div>
      )}
    </div>
  )
}
