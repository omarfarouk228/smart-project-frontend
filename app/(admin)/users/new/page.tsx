'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Check, Mail } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import type { RoleListResponse } from '@/types/role'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Email invalide'),
  first_name: z.string().min(1, 'Requis'),
  last_name: z.string().min(1, 'Requis'),
  role_ids: z.array(z.string()).default([]),
})
type FormData = z.infer<typeof schema>

export default function NewUserPage() {
  const router = useRouter()

  const { data: rolesData } = useQuery<RoleListResponse>({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/api/roles')).data,
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { role_ids: [] },
  })

  const selectedRoles = watch('role_ids')

  const mutation = useMutation({
    mutationFn: (data: { email: string; first_name: string; last_name: string; role_ids: string[] }) =>
      api.post('/api/users', data),
    onSuccess: () => {
      toast.success('Invitation envoyée par email')
      router.push('/admin/users')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Erreur lors de la création')
    },
  })

  const toggleRole = (id: string) => {
    const current = selectedRoles
    setValue('role_ids' as any, current.includes(id) ? current.filter((r) => r !== id) : [...current, id])
  }

  return (
    <div className="p-8 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/users" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Inviter un membre</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Un email avec les identifiants sera envoyé automatiquement
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="space-y-6">
        {/* Info card */}
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
          <p className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">Informations</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Prénom *</Label>
              <Input className="h-8 text-[13px] bg-background border-border/70" {...register('first_name')} />
              {errors.first_name && <p className="text-[11px] text-destructive">{errors.first_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Nom *</Label>
              <Input className="h-8 text-[13px] bg-background border-border/70" {...register('last_name')} />
              {errors.last_name && <p className="text-[11px] text-destructive">{errors.last_name.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70">Adresse email *</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                type="email"
                placeholder="membre@entreprise.com"
                className="h-8 text-[13px] bg-background border-border/70 pl-8"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        {/* Roles card */}
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
          <p className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">Rôles</p>
          <div className="flex flex-wrap gap-2">
            {rolesData?.items.map((role) => {
              const selected = selectedRoles.includes(role.id)
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all duration-150',
                    selected
                      ? 'border-transparent text-white'
                      : 'border-border/60 text-muted-foreground hover:border-border bg-background'
                  )}
                  style={selected ? { background: role.color, borderColor: role.color } : {}}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {role.name}
                </button>
              )
            })}
          </div>
          {rolesData?.items.length === 0 && (
            <p className="text-[12px] text-muted-foreground">Aucun rôle disponible. Créez-en un d&apos;abord.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/users" className={cn(buttonVariants({ variant: 'ghost' }), 'text-[13px] h-8')}>
            Annuler
          </Link>
          <Button type="submit" disabled={mutation.isPending} className="text-[13px] h-8 px-5">
            {mutation.isPending ? 'Envoi…' : 'Envoyer l\'invitation'}
          </Button>
        </div>
      </form>
    </div>
  )
}
