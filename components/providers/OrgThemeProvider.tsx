'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOrgStore } from '@/stores/organization'
import api from '@/lib/api'
import type { Organization } from '@/types/organization'

export function applyTheme(org: Organization) {
  const root = document.documentElement

  // --primary drives bg-primary, text-primary, border-primary across the whole UI.
  // --ring and --sidebar-primary follow the primary color for focus rings and the sidebar.
  // --secondary and --accent are semantic UI tokens (light grays) — we do NOT override
  // them with brand colors or secondary buttons / hover states would break.
  root.style.setProperty('--primary', org.primary_color)
  root.style.setProperty('--ring', org.primary_color)
  root.style.setProperty('--sidebar-primary', org.primary_color)
  root.style.setProperty('--sidebar-ring', org.primary_color)
  root.style.setProperty('--chart-1', org.primary_color)

  const wantsDark =
    org.default_theme === 'dark' ||
    (org.default_theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (wantsDark) root.classList.add('dark')
  else root.classList.remove('dark')
}

export function OrgThemeProvider({ children }: { children: React.ReactNode }) {
  const setOrg = useOrgStore((s) => s.setOrg)
  const org = useOrgStore((s) => s.org)

  const { data } = useQuery<Organization>({
    queryKey: ['org-public'],
    queryFn: async () => (await api.get('/api/organization/public')).data,
    refetchOnWindowFocus: true,
  })

  // When fresh data arrives from the API, sync to store AND apply theme immediately
  useEffect(() => {
    if (data) {
      setOrg(data)
      applyTheme(data)
    }
  }, [data, setOrg])

  // Re-apply theme when org changes in the store (e.g. after admin saves branding)
  useEffect(() => {
    if (org) applyTheme(org)
  }, [org])

  // For 'system' theme: re-apply when OS preference changes
  useEffect(() => {
    if (!org || org.default_theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(org)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [org])

  return <>{children}</>
}
