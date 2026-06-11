'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Lock, Check, Shield } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import type { Role, Permission } from '@/types/role'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const CATEGORY_ABBR: Record<string, string> = {
  organization: 'ORG',
  users: 'USR',
  roles: 'RLS',
  projects: 'PRJ',
  reports: 'RPT',
}

function PermToggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
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
    if (role?.is_system) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) next.delete(permId)
      else next.add(permId)
      return next
    })
  }

  const toggleCategory = (catPerms: Permission[]) => {
    if (role?.is_system) return
    const allSelected = catPerms.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      catPerms.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)))
      return next
    })
  }

  const totalPerms = allPerms?.length ?? 0

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/admin/roles" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8 shrink-0')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div
          className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Shield className="h-4 w-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-semibold tracking-tight truncate">{role?.name}</h1>
            {role?.is_system && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                <Lock className="h-2.5 w-2.5" /> Système
              </span>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">
            {selectedIds.size} / {totalPerms} permission{totalPerms > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/admin/roles" className={cn(buttonVariants({ variant: 'ghost' }), 'text-[13px] h-8')}>
            Annuler
          </Link>
          <Button
            onClick={() => update.mutate()}
            disabled={update.isPending || role?.is_system}
            className="text-[13px] h-8 px-5"
          >
            {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left — role info */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informations</p>

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
                    disabled={role?.is_system}
                    placeholder="Optionnelle"
                    className="h-8 text-[13px] border-border/70"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[12px] font-medium text-foreground/70">Couleur</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ROLE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={role?.is_system}
                        onClick={() => setColor(c)}
                        className="h-6 w-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: c,
                          outline: color === c ? `2px solid ${c}` : 'none',
                          outlineOffset: '2px',
                        }}
                      >
                        {color === c && <Check className="h-3 w-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats card */}
              <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Résumé</p>
                <div className="space-y-2">
                  {Object.entries(byCategory).map(([cat, perms]) => {
                    const selected = perms.filter(p => selectedIds.has(p.id)).length
                    const pct = perms.length > 0 ? (selected / perms.length) * 100 : 0
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-foreground/70 flex items-center gap-1.5">
                            <span className="text-[9px] font-bold font-mono tracking-wider text-muted-foreground/50 bg-muted px-1 py-0.5 rounded">
                              {CATEGORY_ABBR[cat] ?? cat.slice(0,3).toUpperCase()}
                            </span>
                            {CATEGORY_LABELS[cat] ?? cat}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {selected}/{perms.length}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {role?.is_system && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-2.5">
                  <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-700 dark:text-amber-400">
                    Ce rôle système ne peut pas être modifié.
                  </p>
                </div>
              )}
            </div>

            {/* Right — permissions */}
            <div className="lg:col-span-2 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Permissions
              </p>

              {Object.entries(byCategory).map(([cat, perms]) => {
                const allSelected = perms.every((p) => selectedIds.has(p.id))
                const someSelected = !allSelected && perms.some((p) => selectedIds.has(p.id))
                const selectedCount = perms.filter(p => selectedIds.has(p.id)).length

                return (
                  <div key={cat} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    {/* Category header */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-border/40 bg-muted/20">
                      <span className="text-[9px] font-bold font-mono tracking-wider text-muted-foreground/60 bg-muted/80 border border-border/50 px-1.5 py-0.5 rounded shrink-0">
                        {CATEGORY_ABBR[cat] ?? cat.slice(0,3).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-foreground">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </span>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {selectedCount}/{perms.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={role?.is_system}
                        onClick={() => toggleCategory(perms)}
                        className={cn(
                          'text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                          allSelected
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : someSelected
                            ? 'bg-muted text-foreground/70 hover:bg-muted/80'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {allSelected ? '✓ Tout retirer' : 'Tout sélectionner'}
                      </button>
                    </div>

                    {/* Permission rows */}
                    <div className="divide-y divide-border/30">
                      {perms.map((perm) => {
                        const active = selectedIds.has(perm.id)
                        return (
                          <div
                            key={perm.id}
                            className={cn(
                              'flex items-center gap-4 px-5 py-3 transition-colors',
                              !role?.is_system && 'cursor-pointer hover:bg-muted/40',
                              active && 'bg-primary/5'
                            )}
                            onClick={() => togglePerm(perm.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-[13px] font-medium leading-none transition-colors',
                                active ? 'text-foreground' : 'text-foreground/70'
                              )}>
                                {perm.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground/60 font-mono mt-1">
                                {perm.codename}
                              </p>
                              {perm.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{perm.description}</p>
                              )}
                            </div>
                            <PermToggle
                              checked={active}
                              onChange={() => togglePerm(perm.id)}
                              disabled={role?.is_system}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {Object.keys(byCategory).length === 0 && (
                <div className="rounded-xl border border-border/60 bg-card py-12 text-center">
                  <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[13px] text-muted-foreground">Aucune permission disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
