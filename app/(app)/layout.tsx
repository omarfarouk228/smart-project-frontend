'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.must_change_password) {
      router.replace('/change-password')
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
