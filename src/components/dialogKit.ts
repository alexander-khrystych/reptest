import { useEffect, useId } from 'react'

/** Shared dialog chrome. */
// Footer that holds a dialog's bottom buttons — always separated from the body by a hairline.
export const dialogFooter = 'flex items-center justify-end gap-2.5 border-t border-line-2 px-6 py-4'

// A live stack of open dialog ids, so keyboard events only reach the topmost one.
const stack: string[] = []

/**
 * App-wide dialog keys: while this dialog is the top of the stack, ESC runs `onClose` (same as
 * clicking outside / Close) and — when given — Enter runs `onSubmit` (the dialog's positive action).
 * Enter is ignored inside a textarea / contenteditable so multiline entry still works.
 */
export function useDialogKeys(onClose: () => void, onSubmit?: () => void, active = true) {
  const id = useId()

  useEffect(() => {
    if (!active) return
    stack.push(id)
    return () => {
      const i = stack.lastIndexOf(id)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [id, active])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return // only the topmost dialog reacts
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && onSubmit) {
        const el = e.target as HTMLElement | null
        if (el && (el.tagName === 'TEXTAREA' || el.isContentEditable)) return
        e.preventDefault()
        onSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, active, onClose, onSubmit])
}
