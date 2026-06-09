'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOrgStore } from '@/stores/organization'
import api from '@/lib/api'
import type { Organization } from '@/types/organization'

function applyTheme(org: Organization) {
  const root = document.documentElement

  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
        : max === g ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  root.style.setProperty('--primary-hex', org.primary_color)
  root.style.setProperty('--primary', hexToHsl(org.primary_color))
  root.style.setProperty('--secondary-hex', org.secondary_color)
  root.style.setProperty('--accent-hex', org.accent_color)

  if (org.default_theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export function OrgThemeProvider({ children }: { children: React.ReactNode }) {
  const setOrg = useOrgStore((s) => s.setOrg)

  const { data } = useQuery<Organization>({
    queryKey: ['org-public'],
    queryFn: async () => (await api.get('/api/organization/public')).data,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (data) {
      setOrg(data)
      applyTheme(data)
    }
  }, [data, setOrg])

  return <>{children}</>
}
