import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useAppStore } from '@/store/useAppStore'
import type { Construct, G10Group } from '@/store/useAppStore'
import { HintBubble } from '@/components/HintBubble'

function Grip() {
  return (
    <svg className="mt-0.5 h-3.5 w-3.5 flex-none text-ink-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="4" r="1.3" />
      <circle cx="10.5" cy="4" r="1.3" />
      <circle cx="5.5" cy="8" r="1.3" />
      <circle cx="10.5" cy="8" r="1.3" />
      <circle cx="5.5" cy="12" r="1.3" />
      <circle cx="10.5" cy="12" r="1.3" />
    </svg>
  )
}

/** A subtle, construct-bound move button: `◄` moves the card to the column on its left, `►` to the
 *  right. Sits outside the draggable body so a click never starts a drag. Both directions render the
 *  same `►` glyph (the left one mirrored) so they're always identical in size. */
function ArrowBtn({ dir, onClick, red }: { dir: 'left' | 'right'; onClick: () => void; red?: boolean }) {
  return (
    <button
      type="button"
      aria-label={dir === 'left' ? 'move left' : 'move right'}
      onClick={onClick}
      className={`flex w-5 flex-none items-center justify-center self-stretch rounded text-[10px] transition ${
        red ? 'bg-triad-tint text-triad' : 'text-ink-3 hover:bg-line-2 hover:text-ink'
      }`}
    >
      <span className={dir === 'left' ? 'inline-block -scale-x-100' : 'inline-block'}>►</span>
    </button>
  )
}

/** The floating drag preview — matches the draggable chip body. */
function ChipView({ c }: { c: Construct }) {
  return (
    <div className="flex w-full cursor-grabbing items-start gap-1.5 rounded-lg border border-primary bg-card px-2.5 py-1.5 text-[12.5px] shadow-lg">
      <Grip />
      <span className="min-w-0 flex-1">
        <span className="text-emergent">{c.emergent || '—'}</span>
        <span className="text-ink-3"> | </span>
        <span className="text-contrast">{c.contrast || '—'}</span>
      </span>
    </div>
  )
}

/** A construct chip: a draggable body flanked by optional move buttons. The body carries the drag
 *  listeners; the arrow buttons are siblings so clicking them never starts a drag. `rightBubble`
 *  renders a hint above the `►` button (used for the "Keep is full" message). */
function Chip({
  idx,
  c,
  onLeft,
  onRight,
  rightRed,
  rightBubble,
}: {
  idx: number
  c: Construct
  onLeft?: () => void
  onRight?: () => void
  rightRed?: boolean
  rightBubble?: ReactNode
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `c${idx}`, data: { idx } })
  return (
    <div className="flex w-full items-stretch gap-0.5">
      {onLeft && <ArrowBtn dir="left" onClick={onLeft} />}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`flex min-w-0 flex-1 cursor-grab touch-none select-none items-start gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-[12.5px] shadow-sm transition active:cursor-grabbing ${
          isDragging ? 'border-primary opacity-40' : 'border-line hover:border-ink-3 hover:shadow'
        }`}
      >
        <Grip />
        <span className="min-w-0 flex-1">
          <span className="text-emergent">{c.emergent || '—'}</span>
          <span className="text-ink-3"> | </span>
          <span className="text-contrast">{c.contrast || '—'}</span>
        </span>
      </div>
      {onRight && (
        <div className="relative flex">
          <ArrowBtn dir="right" onClick={onRight} red={rightRed} />
          {rightBubble}
        </div>
      )}
    </div>
  )
}

/** A drop target that highlights green normally, or red when it can't accept the drop (the Keep
 *  column is full). */
function DropZone({
  id,
  red,
  className,
  children,
}: {
  id: string
  red?: boolean
  className: string
  children?: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const over = isOver ? (red ? 'border-triad bg-triad-tint' : 'border-primary bg-primary-tint') : ''
  return (
    <div ref={setNodeRef} className={`${className} ${over}`}>
      {children}
    </div>
  )
}

/** One "Keep" row (→ one 10×10 construct), in the right column. Each source chip gets a `◄` to move
 *  it back to the middle "existing" pool. A merged row (≥2 chips) gets the new-pole inputs. */
function GroupRow({ group, constructs }: { group: G10Group; constructs: Construct[] }) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: group.id })
  const setPole = useAppStore((s) => s.setG10Pole)
  const move = useAppStore((s) => s.moveG10)
  const merged = group.sources.length > 1
  const poleMissing = merged && (group.emergent.trim() === '' || group.contrast.trim() === '')
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-2.5 transition ${
        isOver ? 'border-primary bg-primary-tint' : poleMissing ? 'border-triad/50 bg-canvas' : 'border-line bg-canvas'
      }`}
    >
      <div className="flex flex-col gap-1.5">
        {group.sources.map((idx) => (
          <Chip key={idx} idx={idx} c={constructs[idx]} onLeft={() => move(idx, 'middle')} />
        ))}
      </div>
      {merged && (
        <div className="mt-2 flex flex-col gap-1.5">
          <input
            value={group.emergent}
            onChange={(e) => setPole(group.id, 'emergent', e.target.value)}
            placeholder={t('g10.newEmergent')}
            className="rounded-[9px] border-l-[3px] border-emergent bg-card px-3 py-2 text-sm text-ink outline-none focus:shadow-[0_0_0_3px_var(--emergent-tint)]"
          />
          <input
            value={group.contrast}
            onChange={(e) => setPole(group.id, 'contrast', e.target.value)}
            placeholder={t('g10.newContrast')}
            className="rounded-[9px] border-l-[3px] border-contrast bg-card px-3 py-2 text-sm text-ink outline-none focus:shadow-[0_0_0_3px_var(--contrast-tint)]"
          />
        </div>
      )}
    </div>
  )
}

const colTitle = 'mb-2.5 font-mono text-[11px] uppercase tracking-wide'
const newRowZone =
  'rounded-xl border-2 border-dashed border-line p-4 text-center text-[13px] text-ink-3 transition'

/**
 * 10×10 grid creation, step 2 — shrink the 22 constructs to 10. Three columns, left→right: Throw
 * away · Existing constructs (the pool) · Keep (the rows that become the 10×10 constructs, capped at
 * 10). Move a construct by dragging (onto a Keep row to merge, onto a "new row" area, or into a pool)
 * or with its ◄ / ► buttons (to the adjacent column, landing at the bottom). Submit at exactly 10
 * Keep rows with every merged row's poles filled.
 */
export function Grid10GroupScreen() {
  const { t } = useTranslation()
  const constructs = useAppStore((s) => s.constructs)
  const draft = useAppStore((s) => s.g10draft)
  const move = useAppStore((s) => s.moveG10)
  const submit = useAppStore((s) => s.submitG10Groups)
  const back = useAppStore((s) => s.g10Back)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  // The "Keep is full" feedback for the middle column's ► button: a hint bubble, plus a red button
  // highlight that lasts exactly as long as the bubble is shown (both keyed on `bubbleId`).
  const [bubbleId, setBubbleId] = useState<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  if (!draft) return null
  const { groups, thrown, pool } = draft
  const keepCount = groups.length
  const keepFull = keepCount >= 10
  const polesOk = groups.every(
    (g) => g.sources.length === 1 || (g.emergent.trim() !== '' && g.contrast.trim() !== ''),
  )
  const canSubmit = keepCount === 10 && polesOk

  const onDragEnd = (e: DragEndEvent) => {
    setActiveIdx(null)
    const idx = e.active.data.current?.idx as number | undefined
    const over = e.over?.id
    if (idx == null || over == null) return
    // Both "new row" areas (top + bottom) map to the same "start a new Keep row" action.
    const target = over === 'new-top' || over === 'new-bottom' ? 'new' : String(over)
    move(idx, target) // the store no-ops when Keep is full and target is a new row
  }

  // ► on an "existing" construct: to Keep as a new row — unless Keep is full, then show the hint
  // bubble (and its red button highlight, which clears when the bubble does).
  const existingRight = (idx: number) => {
    if (keepFull) {
      setBubbleId(idx)
      return
    }
    move(idx, 'new')
  }

  return (
    <div className="mx-auto max-w-[1360px]">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-3">{t('g10.step2')}</p>
      <p className="mb-1.5 text-[22px] font-semibold leading-tight">{t('g10.groupTitle')}</p>
      <p className="mb-5 text-sm text-ink-2">{t('g10.groupHint')}</p>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(e: DragStartEvent) => setActiveIdx((e.active.data.current?.idx as number) ?? null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveIdx(null)}
      >
        <div className="flex items-start gap-4">
          {/* LEFT — Throw away (chips move right → the pool) */}
          <DropZone id="throw" className="w-[270px] flex-none rounded-xl border border-line bg-card p-2.5">
            <p className={`${colTitle} text-triad`}>{t('g10.throwAway')}</p>
            <div className="flex flex-col gap-1.5">
              {thrown.map((idx) => (
                <Chip key={idx} idx={idx} c={constructs[idx]} onRight={() => move(idx, 'middle')} />
              ))}
            </div>
          </DropZone>

          {/* MIDDLE — Existing constructs (the pool). ◄ → throw away, ► → Keep. Wide enough to fit a
              long pole pair on one line beside the buttons; longer pairs wrap. */}
          <DropZone id="middle" className="w-[440px] flex-none rounded-xl border border-line bg-card p-2.5">
            <p className={`${colTitle} text-ink-3`}>{t('g10.existing')}</p>
            <div className="flex flex-col gap-1.5">
              {pool.map((idx) => (
                <Chip
                  key={idx}
                  idx={idx}
                  c={constructs[idx]}
                  onLeft={() => move(idx, 'throw')}
                  onRight={() => existingRight(idx)}
                  rightRed={bubbleId === idx}
                  rightBubble={
                    bubbleId === idx ? (
                      <HintBubble message={t('g10.keepFull')} onClose={() => setBubbleId(null)} />
                    ) : null
                  }
                />
              ))}
            </div>
          </DropZone>

          {/* RIGHT — Keep (the 10×10 constructs), capped at 10. A "new row" area top and bottom. */}
          <div className="min-w-0 flex-1">
            <p className={`${colTitle} ${keepFull ? 'text-primary' : 'text-ink-3'}`}>
              {t('g10.keepCount', { n: keepCount })}
            </p>
            <DropZone id="new-top" red={keepFull} className={`mb-2 ${newRowZone}`}>
              {keepFull ? t('g10.listFull') : t('g10.newRow')}
            </DropZone>
            <div className="flex flex-col gap-2">
              {groups.map((g) => (
                <GroupRow key={g.id} group={g} constructs={constructs} />
              ))}
            </div>
            <DropZone id="new-bottom" red={keepFull} className={`mt-2 ${newRowZone}`}>
              {keepFull ? t('g10.listFull') : t('g10.newRow')}
            </DropZone>
          </div>
        </div>

        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeIdx != null ? <ChipView c={constructs[activeIdx]} /> : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      <div className="mt-7 flex justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="rounded-[9px] border border-line bg-transparent px-5 py-2.5 text-sm text-ink hover:border-ink-3"
        >
          ← {t('common.back')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-[9px] border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-40 disabled:hover:bg-primary"
        >
          {t('common.next')} →
        </button>
      </div>
    </div>
  )
}
