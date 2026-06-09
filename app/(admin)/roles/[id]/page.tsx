'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Lock, Check } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import type { Role, Permission } from '@/types/role'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type PermByCategory = Record<string, Permission[]>

const ROLE_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48', '#6d28d9']

const CATEGORY_LABELS: Record<string, string> = {
  organization: 'Organisation',
  users: 'Utilisateurs',
  roles: 'Rôles',
  projects: 'Projets',
  reports: 'Rapports',
}

export default function RoleEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: role, isLoading } = useQuery<Role>({
    queryKey: ['role', id],
    queryFn: async () => (await api.get(`/api/roles/${id}`)).data,
  })

  const { data: allPerms } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get('/api/roles/permissions')).data,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(ROLE_COLORS[0])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (role) {
      setName(role.name)
      setDescription(role.description ?? '')
      setColor(role.color)
      setSelectedIds(new Set(role.permissions.map((p) => p.id)))
    }
  }, [role])

  const byCategory = (allPerms ?? []).reduce<PermByCategory>((acc, p) => {
    acc[p.category] = [...(acc[p.category] ?? []), p]
    return acc
  }, {})

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/api/roles/${id}`, {
        name,
        description: description || null,
        color,
        permission_ids: [...selectedIds],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      qc.invalidateQueries({ queryKey: ['role', id] })
      toast.success('Rôle mis à jour')
      router.push('/admin/roles')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Erreur'),
  })

  const togglePerm = (permId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  const toggleAll = (catPerms: Permission[]) => {
    const allSelected = catPerms.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      catPerms.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)))
      return next
    })
  }

  if (isLoading) {
    return <div className="p-8 text-[13px] text-muted-foreground">Chargement…</div>
  }

  return (
    <div className="p-8 max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/roles" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight truncate">{role?.name}</h1>
            {role?.is_system && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                <Lock className="h-2.5 w-2.5" /> Système
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {selectedIds.size} permission{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Info section */}
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <p className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">Informations</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70">Nom du rôle</Label>
            <Input
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              disabled={role?.is_system}
              className="h-8 text-[13px] border-border/70"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70">Description</Label>
            <Input
              value={description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              placeholder="Optionnelle"
              className="h-8 text-[13px] border-border/70"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-foreground/70">Couleur</Label>
            <div className="flex items-center gap-2">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                >
                  {color === c && <Check className="h-3 w-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions section */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/50">
          <p className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">Permissions</p>
        </div>
        <div className="divide-y divide-border/40">
          {Object.entries(byCategory).map(([cat, perms]) => {
            const allSelected = perms.every((p) => selectedIds.has(p.id))
            const someSelected = perms.some((p) => selectedIds.has(p.id))
            return (
              <div key={cat} className="px-5 py-4 space-y-3">
                {/* Category header */}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleAll(perms)}
                    className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors',
                      allSelected
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {allSelected ? 'Tout retirer' : someSelected ? 'Tout sélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
                {/* Permissions */}
                <div className="space-y-1">
                  {perms.map((perm) => {
                    const active = selectedIds.has(perm.id)
                    return (
                      <div
                        key={perm.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors cursor-pointer',
                          active ? 'bg-primary/5' : 'hover:bg-muted/50'
                        )}
                        onClick={() => togglePerm(perm.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground leading-none">{perm.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{perm.codename}</p>
                        </div>
                        <Switch
                          checked={active}
                          onCheckedChange={() => togglePerm(perm.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {Object.keys(byCategory).length === 0 && (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
              Aucune permission disponible
            </p>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <Link href="/admin/roles" className={cn(buttonVariants({ variant: 'ghost' }), 'text-[13px] h-8')}>
          Annuler
        </Link>
        <Button
          onClick={() => update.mutate()}
          disabled={update.isPending}
          className="text-[13px] h-8 px-5"
        >
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}
