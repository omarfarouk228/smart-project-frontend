'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, AtSign, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import type { Notification } from '@/types/notification'

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

const TYPE_ICON = {
  mention: AtSign,
  assigned: UserCheck,
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['notifications-count'],
    queryFn: async () => (await api.get('/api/notifications/unread-count')).data,
    refetchInterval: 30000,
  })

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/api/notifications')).data,
    enabled: open,
  })

  const unreadCount = countData?.count ?? 0

  const markRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`)
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['notifications-count'] })
  }

  const markAllRead = async () => {
    await api.post('/api/notifications/read-all')
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['notifications-count'] })
  }

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-7 w-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/75 hover:bg-white/6 transition-all"
      >
        <Bell className="h-[15px] w-[15px]" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 h-[14px] min-w-[14px] flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 w-80 rounded-xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden"
          style={{ background: 'oklch(0.13 0.012 264)' }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[12px] font-semibold text-white/80">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-white/35 hover:text-white/65 transition-colors"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {(!notifications || notifications.length === 0) && (
              <p className="px-4 py-8 text-center text-[12px] text-white/25">
                Aucune notification
              </p>
            )}
            {notifications?.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]',
                    !n.is_read && 'bg-primary/[0.06]'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 h-6 w-6 flex items-center justify-center rounded-full shrink-0',
                      n.type === 'mention' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-[12px] leading-snug',
                        n.is_read ? 'text-white/50' : 'text-white/85 font-medium'
                      )}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[11px] text-white/35 mt-0.5 truncate">{n.body}</p>
                    )}
                    <p className="text-[10px] text-white/25 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
