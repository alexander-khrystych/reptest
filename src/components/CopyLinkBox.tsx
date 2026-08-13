import { useState } from 'react'
import { useTranslation } from 'react-i18next'

function ClipboardIcon() {
  return (
    <svg
      className="h-4 w-4 flex-none text-ink-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

/**
 * A read-only link in a box: click anywhere to copy, briefly showing "Copied!". Shared by the
 * Session-sharing and Save dialogs so both link areas look and behave identically.
 */
export function CopyLinkBox({ link }: { link: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Clipboard may be blocked (insecure context / permissions) — the link stays visible to copy by hand.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center gap-2 rounded-[9px] border border-line bg-canvas px-3 py-2.5 text-left hover:border-ink-3"
    >
      <span className="flex-1 truncate font-mono text-[13px] text-ink">{link}</span>
      {copied ? (
        <span className="flex-none text-xs font-semibold text-primary">{t('sharing.copied')}</span>
      ) : (
        <ClipboardIcon />
      )}
    </button>
  )
}
