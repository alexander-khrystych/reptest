import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { initI18n } from '@/i18n'
import { useAppStore } from '@/store/useAppStore'
import { validateGridData } from '@/data'

// Fail loudly in dev if the fixed roles/classes/triads ever drift out of shape.
if (import.meta.env.DEV) {
  try {
    validateGridData()
  } catch (error) {
    console.error('[grid-data] validation failed:', error)
  }
  // Dev-only handle for debugging / scripted testing (e.g. window.store.getState()).
  ;(window as unknown as Record<string, unknown>).store = useAppStore
}

// The store (with its persisted language/theme) is the source of truth; mirror it onto <html>.
const { language, theme } = useAppStore.getState()
initI18n(language)

const root = document.documentElement
const applyPrefs = (lang: string, mode: string) => {
  root.setAttribute('data-theme', mode)
  root.lang = lang
}
applyPrefs(language, theme)
useAppStore.subscribe((s) => applyPrefs(s.language, s.theme))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
