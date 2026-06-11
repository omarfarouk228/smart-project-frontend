'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

function GlobalShortcuts() {
  const router = useRouter()
  const [showShortcuts, setShowShortcuts] = useState(false)

  const shortcuts = [
    {
      key: '?',
      handler: () => setShowShortcuts(true),
    },
    {
      key: '/',
      handler: () => {
        const el = document.querySelector<HTMLInputElement>('input[placeholder*="iltr"], input[placeholder*="echerch"]')
        el?.focus()
      },
    },
    {
      key: 'g',
      handler: () => {
        // g sequences handled via two-key detection below
      },
    },
  ]

  // Two-key navigation: G then D/P/T
  useEffect(() => {
    let gPressed = false
    let timer: ReturnType<typeof setTimeout>

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
        gPressed = true
        clearTimeout(timer)
        timer = setTimeout(() => { gPressed = false }, 1500)
        return
      }

      if (gPressed) {
        gPressed = false
        clearTimeout(timer)
        if (e.key.toLowerCase() === 'd') { e.preventDefault(); router.push('/dashboard') }
        if (e.key.toLowerCase() === 'p') { e.preventDefault(); router.push('/projects') }
        if (e.key.toLowerCase() === 't') { e.preventDefault(); router.push('/my-tasks') }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown); clearTimeout(timer) }
  }, [router])

  useKeyboardShortcuts([
    {
      key: '?',
      handler: () => setShowShortcuts(true),
    },
    {
      key: '/',
      handler: () => {
        const el = document.querySelector<HTMLInputElement>(
          'input[placeholder*="iltr"], input[placeholder*="echerch"], input[placeholder*="earch"]'
        )
        el?.focus()
      },
    },
  ])

  return (
    <KeyboardShortcutsModal
      open={showShortcuts}
      onClose={() => setShowShortcuts(false)}
    />
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, user, _hydrated } = useAuthStore()

  useEffect(() => {
    if (!_hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.must_change_password) {
      router.replace('/change-password')
    }
  }, [_hydrated, isAuthenticated, user, router])

  if (!_hydrated || !isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      <GlobalShortcuts />
    </div>
  )
}
