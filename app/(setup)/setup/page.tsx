'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Check, Zap } from 'lucide-react'
import api from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const schema = z.object({
  org_name: z.string().min(2, 'Minimum 2 caractères'),
  app_name: z.string().min(1),
  admin_email: z.string().email('Email invalide'),
  admin_first_name: z.string().min(1, 'Requis'),
  admin_last_name: z.string().min(1, 'Requis'),
  admin_password: z.string().min(8, 'Minimum 8 caractères'),
  primary_color: z.string(),
  secondary_color: z.string(),
  accent_color: z.string(),
  default_theme: z.enum(['light', 'dark', 'system']),
  smtp_host: z.string().optional(),
  smtp_port: z.coerce.number().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_from: z.string().optional(),
  smtp_ssl: z.boolean(),
})
type FormData = z.infer<typeof schema>

const STEPS = [
  { id: 0, label: 'Organisation', description: 'Informations de base' },
  { id: 1, label: 'Administrateur', description: 'Compte super admin' },
  { id: 2, label: 'Apparence', description: 'Couleurs et thème' },
  { id: 3, label: 'SMTP', description: 'Configuration email' },
]

const PRESETS = [
  { name: 'Indigo', primary: '#4f46e5', secondary: '#7c3aed', accent: '#06b6d4' },
  { name: 'Emerald', primary: '#059669', secondary: '#0891b2', accent: '#d97706' },
  { name: 'Rose', primary: '#e11d48', secondary: '#db2777', accent: '#7c3aed' },
  { name: 'Slate', primary: '#334155', secondary: '#475569', accent: '#3b82f6' },
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      app_name: 'SmartTask',
      primary_color: '#4f46e5',
      secondary_color: '#7c3aed',
      accent_color: '#06b6d4',
      default_theme: 'light' as const,
      smtp_port: 587,
      smtp_ssl: true,
    },
  })

  const primaryColor = watch('primary_color')

  const onSubmit = async (values: any) => {
    setLoading(true)
    try {
      const payload: any = {
        organization: {
          name: values.org_name,
          app_name: values.app_name,
          primary_color: values.primary_color,
          secondary_color: values.secondary_color,
          accent_color: values.accent_color,
          default_theme: values.default_theme,
        },
        admin: {
          email: values.admin_email,
          first_name: values.admin_first_name,
          last_name: values.admin_last_name,
          password: values.admin_password,
        },
      }
      if (values.smtp_host) {
        payload.smtp = {
          smtp_host: values.smtp_host,
          smtp_port: values.smtp_port || 587,
          smtp_user: values.smtp_user,
          smtp_password: values.smtp_password,
          smtp_from: values.smtp_from,
          smtp_ssl: values.smtp_ssl,
        }
      }
      await api.post('/api/setup', payload)
      toast.success('SmartTask est prêt !')
      router.replace('/login')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur lors de la configuration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — steps */}
      <div
        className="hidden lg:flex w-[260px] shrink-0 flex-col py-12 px-6"
        style={{ background: 'oklch(0.108 0.012 264)' }}
      >
        <div className="flex items-center gap-2 mb-10">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: 'oklch(0.541 0.232 264.05)' }}
          >
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-semibold text-[14px] tracking-tight">SmartTask</span>
        </div>

        <div className="space-y-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-start gap-3 py-2">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all shrink-0',
                    i < step
                      ? 'bg-emerald-500 text-white'
                      : i === step
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/30'
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('w-px flex-1 min-h-[20px] mt-1', i < step ? 'bg-emerald-500/30' : 'bg-white/10')} />
                )}
              </div>
              <div className="pt-0.5">
                <p className={cn('text-[13px] font-medium', i <= step ? 'text-white/85' : 'text-white/30')}>
                  {s.label}
                </p>
                <p className={cn('text-[11px] mt-0.5', i <= step ? 'text-white/35' : 'text-white/20')}>
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[460px]">
          {/* Mobile step indicator */}
          <div className="lg:hidden flex items-center gap-1.5 mb-6">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all',
                  i <= step ? 'bg-primary' : 'bg-border'
                )}
              />
            ))}
          </div>

          <div className="mb-8">
            <p className="text-[11px] font-medium text-primary uppercase tracking-wider mb-1">
              Étape {step + 1} sur {STEPS.length}
            </p>
            <h1 className="text-[22px] font-semibold tracking-tight">{STEPS[step].label}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{STEPS[step].description}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {step === 0 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground/70">Nom de l&apos;entreprise *</Label>
                    <Input
                      placeholder="Acme Corp"
                      className="h-9 text-[13px] bg-card border-border/70"
                      {...register('org_name')}
                    />
                    {errors.org_name && <p className="text-[11px] text-destructive">{(errors.org_name as any).message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground/70">Nom de l&apos;application</Label>
                    <Input
                      placeholder="SmartTask"
                      className="h-9 text-[13px] bg-card border-border/70"
                      {...register('app_name')}
                    />
                    <p className="text-[11px] text-muted-foreground/60">Nom affiché dans la sidebar et les emails</p>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground/70">Prénom *</Label>
                      <Input className="h-9 text-[13px] bg-card border-border/70" {...register('admin_first_name')} />
                      {errors.admin_first_name && <p className="text-[11px] text-destructive">{(errors.admin_first_name as any).message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground/70">Nom *</Label>
                      <Input className="h-9 text-[13px] bg-card border-border/70" {...register('admin_last_name')} />
                      {errors.admin_last_name && <p className="text-[11px] text-destructive">{(errors.admin_last_name as any).message}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground/70">Email *</Label>
                    <Input type="email" className="h-9 text-[13px] bg-card border-border/70" {...register('admin_email')} />
                    {errors.admin_email && <p className="text-[11px] text-destructive">{(errors.admin_email as any).message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground/70">Mot de passe *</Label>
                    <Input type="password" placeholder="Minimum 8 caractères" className="h-9 text-[13px] bg-card border-border/70" {...register('admin_password')} />
                    {errors.admin_password && <p className="text-[11px] text-destructive">{(errors.admin_password as any).message}</p>}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[12px] font-medium text-foreground/70">Palette de couleurs</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setValue('primary_color' as any, preset.primary)
                            setValue('secondary_color' as any, preset.secondary)
                            setValue('accent_color' as any, preset.accent)
                          }}
                          className={cn(
                            'flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all',
                            primaryColor === preset.primary
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-border/60 hover:border-border bg-card'
                          )}
                        >
                          <div className="flex gap-1">
                            {[preset.primary, preset.secondary, preset.accent].map((c) => (
                              <div key={c} className="h-3.5 w-3.5 rounded-full" style={{ background: c }} />
                            ))}
                          </div>
                          <span className="text-[12px] font-medium">{preset.name}</span>
                          {primaryColor === preset.primary && (
                            <Check className="h-3 w-3 text-primary ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    {[
                      { label: 'Primaire', field: 'primary_color' },
                      { label: 'Secondaire', field: 'secondary_color' },
                      { label: 'Accent', field: 'accent_color' },
                    ].map(({ label, field }) => (
                      <div key={field} className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-foreground/60">{label}</Label>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-7 w-7 rounded shrink-0 border border-border/50 overflow-hidden"
                          >
                            <input
                              type="color"
                              {...register(field as any)}
                              className="h-8 w-8 -translate-x-0.5 -translate-y-0.5 cursor-pointer"
                            />
                          </div>
                          <Input {...register(field as any)} className="h-7 text-[11px] font-mono bg-card border-border/70" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-medium text-foreground/70">Thème par défaut</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'light', label: '☀️ Clair' },
                        { value: 'dark', label: '🌙 Sombre' },
                        { value: 'system', label: '⚙️ Système' },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setValue('default_theme' as any, value)}
                          className={cn(
                            'py-2 rounded-lg border text-[12px] font-medium transition-all',
                            watch('default_theme') === value
                              ? 'border-primary/50 bg-primary/5 text-primary'
                              : 'border-border/60 bg-card text-muted-foreground hover:border-border'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 mb-4">
                    <p className="text-[12px] text-muted-foreground">
                      La configuration SMTP est optionnelle. Vous pouvez la compléter plus tard dans les paramètres de l&apos;organisation.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-[12px] font-medium text-foreground/70">Serveur SMTP</Label>
                      <Input placeholder="smtp.gmail.com" className="h-9 text-[13px] bg-card border-border/70" {...register('smtp_host')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground/70">Port</Label>
                      <Input type="number" placeholder="587" className="h-9 text-[13px] bg-card border-border/70" {...register('smtp_port')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-medium text-foreground/70">Utilisateur</Label>
                      <Input type="email" className="h-9 text-[13px] bg-card border-border/70" {...register('smtp_user')} />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-[12px] font-medium text-foreground/70">Mot de passe</Label>
                      <Input type="password" className="h-9 text-[13px] bg-card border-border/70" {...register('smtp_password')} />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-[12px] font-medium text-foreground/70">Email expéditeur</Label>
                      <Input type="email" placeholder="noreply@acme.com" className="h-9 text-[13px] bg-card border-border/70" {...register('smtp_from')} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
              <Button
                type="button"
                variant="ghost"
                className="text-[13px] text-muted-foreground"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
              >
                Précédent
              </Button>

              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  className="text-[13px] font-medium px-6"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continuer
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="text-[13px] font-medium px-6"
                >
                  {loading ? 'Configuration…' : 'Terminer la configuration'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
