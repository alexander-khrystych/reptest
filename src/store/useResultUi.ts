import { create } from 'zustand'

/**
 * Ephemeral (non-persisted) UI state shared between the pinned header (NavBar) and the result
 * workspace (ResultScreen). The Tables button + current table name live in the header now, but the
 * drawer and the table list still live in ResultScreen — so the two coordinate through this store:
 * ResultScreen publishes the current table's name/pinned + owns opening state; NavBar renders the
 * button and reads the name.
 */
interface ResultUiState {
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  /** The on-screen table's display name + whether it's a pinned (read-only) analysis view. */
  currentName: string
  currentPinned: boolean
  setCurrent: (currentName: string, currentPinned: boolean) => void
}

export const useResultUi = create<ResultUiState>((set) => ({
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  currentName: '',
  currentPinned: false,
  setCurrent: (currentName, currentPinned) => set({ currentName, currentPinned }),
}))
