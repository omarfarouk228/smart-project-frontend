'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

const ADMIN_PERMISSIONS = ['users.view', 'roles.view', 'organization.view']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, user, _hydrated, hasPermission } = useAuthStore()

  useEffect(() => {
    if (!_hydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (user?.must_change_password) {
      router.replace('/change-password')
      return
    }
    if (user && !user.is_superadmin && !ADMIN_PERMISSIONS.some((p) => hasPermission(p))) {
      router.replace('/dashboard')
    }
  }, [_hydrated, isAuthenticated, user, router, hasPermission])

  if (!_hydrated || !isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
