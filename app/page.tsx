'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Organization } from '@/types/organization'

export default function RootPage() {
  const router = useRouter()

  const { data, isLoading } = useQuery<Organization>({
    queryKey: ['org-public'],
    queryFn: async () => (await api.get('/api/organization/public')).data,
  })

  useEffect(() => {
    if (isLoading || !data) return
    if (!data.setup_completed) {
      router.replace('/setup')
    } else {
      const token = localStorage.getItem('st_access_token')
      router.replace(token ? '/dashboard' : '/login')
    }
  }, [data, isLoading, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
