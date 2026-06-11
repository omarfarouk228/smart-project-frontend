'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, MoreHorizontal, RotateCcw, Power, UserCheck } from 'lucide-react'
import api from '@/lib/api'
import type { UserListResponse } from '@/types/user'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'from-violet-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[11px]'
  return (
    <div className={`${sz} shrink-0 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-semibold text-white`}>
      {initials}
    </div>
  )
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<UserListResponse>({
    queryKey: ['users', page, search],
    queryFn: async () =>
      (await api.get('/api/users', { params: { page, page_size: 20, search: search || undefined } })).data,
  })

  const resetPwd = useMutation({
    mutationFn: (id: string) => api.post(`/api/users/${id}/reset-password`),
    onSuccess: () => toast.success('Mot de passe réinitialisé et envoyé par email'),
    onError: () => toast.error('Erreur lors de la réinitialisation'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/api/users/${id}`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Statut mis à jour')
    },
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-tight">Membres</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {data?.total ?? '—'} membre{(data?.total ?? 0) > 1 ? 's' : ''} dans l&apos;organisation
          </p>
        </div>
        <Link href="/admin/users/new" className={cn(buttonVariants(), 'text-[13px] h-8 gap-1.5 shrink-0')}>
          <Plus className="h-3.5 w-3.5" />
          Inviter un membre
        </Link>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border/40">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Rechercher un membre…"
            className="h-8 pl-8 text-[12px] bg-muted/30 border-border/50 placeholder:text-muted-foreground/40"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground tracking-wide">Membre</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground tracking-wide">Rôles</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground tracking-wide">Statut</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground tracking-wide">Rejoint le</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <UserCheck className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-[13px] text-muted-foreground">Aucun membre trouvé</p>
                  </div>
                </td>
              </tr>
            )}
            {data?.items.map((user) => (
              <tr
                key={user.id}
                className="group hover:bg-muted/30 transition-colors duration-100"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.full_name} />
                    <div>
                      <p className="text-[13px] font-medium text-foreground leading-none">
                        {user.full_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{user.email}</p>
                    </div>
                    {user.must_change_password && (
                      <span className="text-[10px] font-medium bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">
                        mdp temporaire
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.is_superadmin && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
                        Super Admin
                      </span>
                    )}
                    {user.roles.slice(0, 2).map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: `${r.color}18`, color: r.color }}
                      >
                        {r.name}
                      </span>
                    ))}
                    {user.roles.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{user.roles.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={cn('h-1.5 w-1.5 rounded-full', user.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                    <span className="text-[12px] text-muted-foreground">
                      {user.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[12px] text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/0 group-hover:text-muted-foreground hover:bg-muted transition-all">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 text-[13px]">
                      <DropdownMenuItem
                        onClick={() => resetPwd.mutate(user.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Réinitialiser le mot de passe
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => toggleActive.mutate({ id: user.id, is_active: !user.is_active })}
                        className={cn('gap-2 cursor-pointer', user.is_active && 'text-destructive')}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {user.is_active ? 'Désactiver' : 'Réactiver'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            Précédent
          </Button>
          <span className="text-[12px] text-muted-foreground px-2">
            {page} / {Math.ceil(data.total / 20)}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / 20)}>
            Suivant
          </Button>
        </div>
      )}
      </div>
    </div>
  )
}
