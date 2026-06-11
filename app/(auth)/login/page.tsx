'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Zap, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/organization'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const org = useOrgStore((s) => s.org)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    api.get('/api/setup/status').then(({ data }) => {
      if (!data.completed) router.replace('/setup')
    }).catch(() => {})
  }, [router])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormData) => {
    setLoading(true)
    try {
      const { data: tokens } = await api.post('/api/auth/login', values)
      const { data: user } = await api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      setAuth(user, tokens.access_token, tokens.refresh_token)
      router.replace(tokens.must_change_password ? '/change-password' : '/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  const appName = org?.app_name ?? 'ProjectEyes'

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div
        className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between p-10"
        style={{ background: 'oklch(0.108 0.012 264)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary"
          >
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">{appName}</span>
        </div>

        <div className="space-y-4">
          <p className="text-[28px] font-semibold text-white leading-snug tracking-tight text-balance">
            Gérez vos projets avec clarté et vélocité.
          </p>
          <p className="text-white/40 text-[14px] leading-relaxed">
            Kanban, sprints, suivi de temps et rapports — tout ce dont votre équipe a besoin pour livrer vite.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {['Kanban', 'Scrum', 'Rapports', 'Équipes'].map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium text-white/30 bg-white/[0.06] px-2.5 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-[340px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary"
            >
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">{appName}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Bon retour
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Connectez-vous à votre espace de travail
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">
                Adresse email
              </Label>
              <Input
                type="email"
                placeholder="vous@entreprise.com"
                autoComplete="email"
                className="h-9 text-[13px] bg-card border-border/70 placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[11px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-9 text-[13px] bg-card border-border/70 placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/50 pr-9"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-[13px] font-medium gap-2 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Connexion…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Se connecter <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground/60 text-center">
            Accès restreint aux membres de {org?.name ?? "l'organisation"}.
          </p>
        </div>
      </div>
    </div>
  )
}
