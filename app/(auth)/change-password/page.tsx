'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const schema = z
  .object({
    current_password: z.string().min(1, 'Requis'),
    new_password: z.string().min(8, 'Minimum 8 caractères'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm_password'],
  })
type FormData = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormData) => {
    setLoading(true)
    try {
      await api.post('/api/auth/change-password', {
        current_password: values.current_password,
        new_password: values.new_password,
      })
      const { data: user } = await api.get('/api/auth/me')
      setUser(user)
      toast.success('Mot de passe mis à jour')
      router.replace('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur lors du changement de mot de passe')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-[340px] space-y-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight">Sécurisez votre compte</h1>
            <p className="text-[12px] text-muted-foreground">Choisissez votre propre mot de passe</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Mot de passe temporaire</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="h-9 text-[13px] bg-background border-border/70"
                {...register('current_password')}
              />
              {errors.current_password && (
                <p className="text-[11px] text-destructive">{errors.current_password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Nouveau mot de passe</Label>
              <Input
                type="password"
                placeholder="Minimum 8 caractères"
                className="h-9 text-[13px] bg-background border-border/70"
                {...register('new_password')}
              />
              {errors.new_password && (
                <p className="text-[11px] text-destructive">{errors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Confirmer</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="h-9 text-[13px] bg-background border-border/70"
                {...register('confirm_password')}
              />
              {errors.confirm_password && (
                <p className="text-[11px] text-destructive">{errors.confirm_password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-9 text-[13px] font-medium">
              {loading ? 'Enregistrement…' : 'Définir le mot de passe'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
