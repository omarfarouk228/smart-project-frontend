'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, User, Lock, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const profileSchema = z.object({
  first_name: z.string().min(1, 'Requis'),
  last_name: z.string().min(1, 'Requis'),
})
type ProfileData = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Requis'),
  new_password: z.string().min(8, 'Minimum 8 caractères'),
  confirm_password: z.string().min(1, 'Requis'),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})
type PasswordData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
    },
  })

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

  const onProfileSubmit = async (values: ProfileData) => {
    setProfileLoading(true)
    try {
      const { data: updated } = await api.patch('/api/auth/me', values)
      setUser(updated)
      toast.success('Profil mis à jour')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    } finally {
      setProfileLoading(false)
    }
  }

  const onPasswordSubmit = async (values: PasswordData) => {
    setPasswordLoading(true)
    try {
      await api.post('/api/auth/change-password', {
        current_password: values.current_password,
        new_password: values.new_password,
      })
      toast.success('Mot de passe modifié')
      passwordForm.reset()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur')
    } finally {
      setPasswordLoading(false)
    }
  }

  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : '?'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-tight">Paramètres</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Gérez votre compte et vos préférences</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Left — profile */}
          <div className="space-y-5">
            {/* Avatar + roles */}
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[18px] font-bold text-white">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate">{user?.full_name}</p>
                  <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {user?.roles.map((r) => (
                      <span
                        key={r.id}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: `${r.color}20`, color: r.color }}
                      >
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile form */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-[13px] font-semibold text-foreground/80">Informations personnelles</p>
              </div>

              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground/70">Prénom</Label>
                    <Input
                      className="h-9 text-[13px] bg-background border-border/70"
                      {...profileForm.register('first_name')}
                    />
                    {profileForm.formState.errors.first_name && (
                      <p className="text-[11px] text-destructive">{profileForm.formState.errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground/70">Nom</Label>
                    <Input
                      className="h-9 text-[13px] bg-background border-border/70"
                      {...profileForm.register('last_name')}
                    />
                    {profileForm.formState.errors.last_name && (
                      <p className="text-[11px] text-destructive">{profileForm.formState.errors.last_name.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Email</Label>
                  <Input
                    value={user?.email ?? ''}
                    disabled
                    className="h-9 text-[13px] bg-muted/50 border-border/40 text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground/60">L&apos;email ne peut pas être modifié ici</p>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={profileLoading} className="text-[13px] h-8">
                    {profileLoading ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right — password */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <p className="text-[13px] font-semibold text-foreground/80">Changer le mot de passe</p>
              </div>

              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="h-9 text-[13px] bg-background border-border/70 pr-9"
                      {...passwordForm.register('current_password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.current_password && (
                    <p className="text-[11px] text-destructive">{passwordForm.formState.errors.current_password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Minimum 8 caractères"
                      className="h-9 text-[13px] bg-background border-border/70 pr-9"
                      {...passwordForm.register('new_password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.new_password && (
                    <p className="text-[11px] text-destructive">{passwordForm.formState.errors.new_password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Confirmer le nouveau mot de passe</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="h-9 text-[13px] bg-background border-border/70"
                    {...passwordForm.register('confirm_password')}
                  />
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="text-[11px] text-destructive">{passwordForm.formState.errors.confirm_password.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={passwordLoading} className="text-[13px] h-8">
                    {passwordLoading ? 'Modification…' : 'Modifier le mot de passe'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Security info */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <p className="text-[13px] font-semibold text-foreground/80">Sécurité</p>
              </div>
              <div className="space-y-2 text-[12px] text-muted-foreground">
                <p>Utilisez un mot de passe unique d&apos;au moins 8 caractères.</p>
                <p>Ne partagez jamais vos identifiants avec d&apos;autres personnes.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
