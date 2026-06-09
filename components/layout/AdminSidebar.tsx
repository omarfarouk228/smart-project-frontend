'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, FolderKanban, Users, Shield, Building2,
  LogOut, ChevronDown, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/organization'
import api from '@/lib/api'
import { toast } from 'sonner'
import { NotificationBell } from '@/components/layout/NotificationBell'

type NavDef = { href: string; label: string; icon: React.ElementType; soon?: boolean }
const MAIN_NAV: NavDef[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projets', icon: FolderKanban },
]

const ADMIN_NAV = [
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/roles', label: 'Rôles', icon: Shield },
  { href: '/admin/organization', label: 'Organisation', icon: Building2 },
]

function NavItem({
  href, label, icon: Icon, active, soon,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; soon?: boolean
}) {
  if (soon) {
    return (
      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-white/30 cursor-default select-none">
        <Icon className="h-[15px] w-[15px] shrink-0" />
        <span className="text-[13px] font-medium leading-none">{label}</span>
        <span className="ml-auto text-[10px] font-medium bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">bientôt</span>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 group',
        active
          ? 'bg-white/10 text-white'
          : 'text-white/55 hover:bg-white/6 hover:text-white/85'
      )}
    >
      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0 transition-colors',
          active ? 'text-white' : 'text-white/50 group-hover:text-white/75'
        )}
      />
      <span className="text-[13px] font-medium leading-none">{label}</span>
    </Link>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const org = useOrgStore((s) => s.org)

  const handleLogout = async () => {
    const refresh = localStorage.getItem('st_refresh_token')
    if (refresh) {
      try { await api.post('/api/auth/logout', { refresh_token: refresh }) } catch {}
    }
    clearAuth()
    router.replace('/login')
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '?'

  return (
    <aside
      className="flex h-screen w-[220px] shrink-0 flex-col select-none"
      style={{ background: 'oklch(0.108 0.012 264)' }}
    >
      {/* Logo */}
      <div className="flex h-11 items-center gap-2 px-3 border-b border-white/[0.06]">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
          style={{ background: 'oklch(0.541 0.232 264.05)' }}
        >
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[13px] font-semibold text-white/90 tracking-tight">
          {org?.app_name ?? 'SmartTask'}
        </span>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
        {MAIN_NAV.map(({ href, label, icon, soon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={pathname === href || pathname.startsWith(href + '/')}
            soon={soon}
          />
        ))}

        <div className="my-3 border-t border-white/[0.06]" />

        <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Administration
        </p>
        {ADMIN_NAV.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={pathname.startsWith(href)}
          />
        ))}
      </div>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 transition-all duration-150 hover:bg-white/6 group"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[10px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="truncate text-[12px] font-medium text-white/75 leading-none">
              {user?.full_name}
            </p>
            <p className="truncate text-[11px] text-white/35 mt-0.5 leading-none">
              {user?.email}
            </p>
          </div>
          <LogOut className="h-3.5 w-3.5 text-white/30 group-hover:text-white/55 shrink-0 transition-colors" />
        </button>
      </div>
    </aside>
  )
}
