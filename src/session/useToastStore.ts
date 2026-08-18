import { create } from 'zustand'
import { nanoid } from 'nanoid'

/** A transient notification bubble. `key` is an i18n key resolved at render time. */
export interface Toast {
  id: string
  key: string
}

interface ToastState {
  toasts: Toast[]
  /** Queue a bubble (by i18n key). Duplicates are allowed — each event is its own bubble. */
  push: (key: string) => void
  dismiss: (id: string) => void
}

/**
 * Transient top-of-screen notification bubbles, kept out of the persisted session store (nothing
 * here should survive a reload). The controller pushes by i18n key; the `Toasts` overlay renders,
 * auto-dismisses (10s, paused on hover), and lets the user close each with an ✕.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (key) => set((s) => ({ toasts: [...s.toasts, { id: nanoid(6), key }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
