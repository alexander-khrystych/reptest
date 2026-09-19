import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePrefsStore } from '@/store/usePrefsStore'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '@/store/useAppStore'
import { ROLES } from '@/data'

function Grip() {
  return (
    <svg className="h-3.5 w-3.5 flex-none text-ink-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="5.5" cy="4" r="1.3" />
      <circle cx="10.5" cy="4" r="1.3" />
      <circle cx="5.5" cy="8" r="1.3" />
      <circle cx="10.5" cy="8" r="1.3" />
      <circle cx="5.5" cy="12" r="1.3" />
      <circle cx="10.5" cy="12" r="1.3" />
    </svg>
  )
}

/** One draggable character row. `rank` is its 1-based position (top = 1 = most elicited pole). A
 *  selected card (clicked) can also be moved with the up/down arrow keys. */
function SortableChar({
  slot,
  rank,
  name,
  role,
  selected,
  onSelect,
}: {
  slot: number
  rank: number
  name: string
  role: string
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(slot),
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-rankcard
      title={role}
      onClick={onSelect}
      className={`flex touch-none select-none items-center gap-2.5 rounded-[10px] border px-3 py-2 text-left transition ${
        isDragging
          ? 'z-10 cursor-grabbing border-primary bg-card opacity-90 shadow-lg'
          : selected
            ? 'cursor-grab border-primary bg-primary-tint'
            : 'cursor-grab border-line bg-card hover:border-ink-3'
      }`}
    >
      <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-line-2 font-mono text-[11px] font-semibold text-ink-2">
        {rank}
      </span>
      <Grip />
      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{name}</span>
      {selected && <span className="flex-none font-mono text-[11px] text-primary">↑↓</span>}
    </div>
  )
}

/**
 * The separate constructs-ranking flow (launched once the 10×10 grid exists). Reusing the grid's
 * chosen characters + constructs, the testee ranks the characters against each construct, one per
 * iteration (the 10 elicited constructs, then a fixed 11th "good / bad"). The construct pair is
 * shown but not editable; order the characters by drag, or by clicking a card to select it and then
 * nudging it with the up/down arrow keys. The rankings feed the Spearman matrices.
 */
export function Grid10RankScreen() {
  const { t } = useTranslation()
  const language = usePrefsStore((s) => s.language)
  const names = useAppStore((s) => s.names)
  const grid10 = useAppStore((s) => s.grid10)
  const draft = useAppStore((s) => s.rankDraft)
  const setOrder = useAppStore((s) => s.setRankOrder)
  const next = useAppStore((s) => s.rankNext)
  const back = useAppStore((s) => s.rankBack)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // The currently selected character slot (keyboard-movable). Cleared when the construct changes.
  const [selected, setSelected] = useState<number | null>(null)
  const iter = draft?.iter ?? 0
  useEffect(() => setSelected(null), [iter])

  // Keep the arrow-key + click-outside handlers stable while reading the latest order/selection.
  const order = draft && grid10 ? (draft.orders[iter] ?? grid10.chars.map((_, i) => i)) : []
  const orderRef = useRef(order)
  orderRef.current = order
  const selRef = useRef(selected)
  selRef.current = selected
  const setOrderRef = useRef(setOrder)
  setOrderRef.current = setOrder

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const sel = selRef.current
      if (sel == null || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      if (e.repeat) return // one position per keystroke; ignore auto-repeat
      e.preventDefault()
      const o = orderRef.current
      const i = o.indexOf(sel)
      if (i === -1) return
      const to = e.key === 'ArrowUp' ? i - 1 : i + 1
      if (to < 0 || to >= o.length) return
      setOrderRef.current(arrayMove(o, i, to))
    }
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-rankcard]')) setSelected(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  if (!draft || !grid10) return null
  const { chars, groups } = grid10
  const roles = ROLES[language]
  const total = draft.orders.length
  const isLast = iter === total - 1

  // The construct pair for this iteration: one of the 10 elicited groups, or the fixed 11th.
  const pole =
    iter < groups.length
      ? { em: groups[iter].emergent, co: groups[iter].contrast }
      : { em: t('g10.goodPole'), co: t('g10.badPole') }

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = e.active.id
    const overId = e.over?.id
    if (overId == null || activeId === overId) return
    const from = order.findIndex((s) => String(s) === activeId)
    const to = order.findIndex((s) => String(s) === overId)
    if (from === -1 || to === -1) return
    setOrder(arrayMove(order, from, to))
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-3">
        {t('flow.ranking')} · {iter + 1} / {total}
      </p>
      <p className="mb-1.5 text-[22px] font-semibold leading-tight">{t('g10.rankTitle')}</p>
      <p className="mb-4 text-sm text-ink-2">{t('g10.rankHint')}</p>

      {/* the construct pair (non-interactable) — the ranking axis */}
      <div className="mb-2 flex items-center justify-between gap-2 rounded-[10px] border border-line bg-canvas px-3.5 py-2">
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-emergent">
          ▲ {pole.em || '—'}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[14px] font-semibold text-contrast">
          {pole.co || '—'} ▼
        </span>
      </div>

      {/* the sortable ranking list — drag, or select + arrow keys */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setSelected(Number(e.active.id))}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order.map(String)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {order.map((slot, i) => (
              <SortableChar
                key={slot}
                slot={slot}
                rank={i + 1}
                name={names[chars[slot]] || '—'}
                role={roles[chars[slot]]}
                selected={selected === slot}
                onSelect={() => setSelected(slot)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Nav */}
      <div className="mt-6 flex justify-between gap-3">
        <button
          type="button"
          onClick={back}
          className="rounded-[9px] border border-line bg-transparent px-5 py-2.5 text-sm text-ink hover:border-ink-3"
        >
          ← {t('common.back')}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded-[9px] border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-2"
        >
          {isLast ? t('elicit.finish') : `${t('common.next')} →`}
        </button>
      </div>
    </div>
  )
}
