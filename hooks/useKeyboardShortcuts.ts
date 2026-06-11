import { useEffect } from 'react'

export interface ShortcutHandler {
  key: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  /** Skip when an input/textarea/select is focused */
  skipInputs?: boolean
  handler: (e: KeyboardEvent) => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      for (const s of shortcuts) {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase()
        const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : true
        const ctrlMatch = s.ctrl ? e.ctrlKey : true
        const shiftMatch = s.shift ? e.shiftKey : true

        if (!keyMatch || !metaMatch || !ctrlMatch || !shiftMatch) continue

        if (s.skipInputs !== false) {
          const tag = (e.target as HTMLElement)?.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') continue
          if ((e.target as HTMLElement)?.isContentEditable) continue
        }

        e.preventDefault()
        s.handler(e)
        break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcuts])
}
