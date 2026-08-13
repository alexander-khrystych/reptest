import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { initI18n } from '@/i18n'
import { useAppStore } from '@/store/useAppStore'
import { usePrefsStore } from '@/store/usePrefsStore'
import { validateGridData } from '@/data'
import { initSession } from '@/session/session'
import { RESUME_CODE } from '@/session/config'
import { consumeResumeCode } from '@/lib/resume'

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

// Prefs (global, shared across testee/observer) are the source of truth; mirror onto <html>.
const { language, theme } = usePrefsStore.getState()
initI18n(language)

const root = document.documentElement
const applyPrefs = (lang: string, mode: string) => {
  root.setAttribute('data-theme', mode)
  root.lang = lang
}
applyPrefs(language, theme)
usePrefsStore.subscribe((s) => applyPrefs(s.language, s.theme))

const finishBoot = () => {
  // Boot session sharing: connect as observer for a /w/<room> link, or silently resume a testee's
  // previously-shared room after a reload.
  initSession()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// A `/r/<code>` resume link fetches the state from the relay's KV, validates it, and rehydrates the
// store before the first render (the index.html loader shows meanwhile); then the code is cleaned
// out of the address bar. A resumed session always starts silent (session state isn't restored).
if (RESUME_CODE) {
  consumeResumeCode(RESUME_CODE).finally(() => {
    history.replaceState(null, '', '/')
    finishBoot()
  })
} else {
  finishBoot()
}
