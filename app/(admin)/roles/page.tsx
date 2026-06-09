'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Lock, Shield } from 'lucide-react'
import api from '@/lib/api'
import type { RoleListResponse } from '@/types/role'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  color: z.string(),
})
type FormData = z.infer<typeof schema>

const ROLE_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48', '#6d28d9']

export default function RolesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(ROLE_COLORS[0])

  const { data, isLoading } = useQuery<RoleListResponse>({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/api/roles')).data,
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: ROLE_COLORS[0] },
  })

  const create = useMutation({
    mutationFn: (d: { name: string; description?: string; color: string }) => api.post('/api/roles', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Rôle créé')
      setOpen(false)
      reset()
      setSelectedColor(ROLE_COLORS[0])
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Erreur'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Rôle supprimé')
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Impossible de supprimer ce rôle'),
  })

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    setValue('color', color)
  }

  return (
    <div className="p-8 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Rôles & permissions</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {data?.total ?? '—'} rôle{(data?.total ?? 0) > 1 ? 's' : ''} configuré{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="text-[13px] h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nouveau rôle
        </Button>
      </div>

      {/* Roles list */}
      <div className="space-y-2">
        {isLoading && <p className="text-[13px] text-muted-foreground py-8 text-center">Chargement…</p>}
        {!isLoading && data?.items.length === 0 && (
          <div className="rounded-xl border border-border/60 border-dashed bg-card/50 py-12 text-center">
            <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">Aucun rôle créé</p>
          </div>
        )}
        {data?.items.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3.5 group hover:border-border transition-colors"
          >
            {/* Color dot */}
            <div
              className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
              style={{ background: `${role.color}18` }}
            >
              <Shield className="h-4 w-4" style={{ color: role.color }} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-foreground">{role.name}</p>
                {role.is_system && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    <Lock className="h-2.5 w-2.5" /> Système
                  </span>
                )}
              </div>
              {role.description && (
                <p className="text-[12px] text-muted-foreground mt-0.5">{role.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {role.permissions.slice(0, 6).map((p) => (
                  <span
                    key={p.id}
                    className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md"
                  >
                    {p.name}
                  </span>
                ))}
                {role.permissions.length > 6 && (
                  <span className="text-[10px] text-muted-foreground/60">
                    +{role.permissions.length - 6} autres
                  </span>
                )}
                {role.permissions.length === 0 && (
                  <span className="text-[10px] text-muted-foreground/40 italic">Aucune permission</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Link
                href={`/admin/roles/${role.id}`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Link>
              {!role.is_system && (
                <button
                  onClick={() => remove.mutate(role.id)}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Nouveau rôle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d: FormData) => create.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Nom du rôle *</Label>
              <Input
                placeholder="Chef de projet"
                className="h-8 text-[13px] border-border/70"
                {...register('name')}
              />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Description</Label>
              <Input
                placeholder="Optionnelle"
                className="h-8 text-[13px] border-border/70"
                {...register('description')}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] font-medium text-foreground/70">Couleur</Label>
              <div className="flex items-center gap-2">
                {ROLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorSelect(c)}
                    className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: selectedColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="ghost" type="button" className="text-[13px] h-8" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={create.isPending} className="text-[13px] h-8">
                {create.isPending ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
