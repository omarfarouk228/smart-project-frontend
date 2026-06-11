'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Mail, Palette, Upload } from 'lucide-react'
import api from '@/lib/api'
import type { Organization } from '@/types/organization'
import { useOrgStore } from '@/stores/organization'
import { applyTheme } from '@/components/providers/OrgThemeProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'

const COLOR_PRESETS = [
  { label: 'Indigo', primary: '#4f46e5', secondary: '#7c3aed', accent: '#06b6d4' },
  { label: 'Émeraude', primary: '#059669', secondary: '#0891b2', accent: '#d97706' },
  { label: 'Rose', primary: '#e11d48', secondary: '#db2777', accent: '#7c3aed' },
  { label: 'Ardoise', primary: '#475569', secondary: '#334155', accent: '#3b82f6' },
]

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-foreground/70">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-md border border-border/70 p-0.5 bg-transparent"
          />
        </div>
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="h-8 text-[13px] font-mono border-border/70 w-28"
        />
      </div>
    </div>
  )
}

export default function OrganizationPage() {
  const qc = useQueryClient()
  const setOrg = useOrgStore((s) => s.setOrg)
  const orgStore = useOrgStore((s) => s.org)

  const { data: org, isLoading } = useQuery<Organization>({
    queryKey: ['organization'],
    queryFn: async () => (await api.get('/api/organization')).data,
    placeholderData: orgStore ?? undefined,
    refetchOnMount: 'always',
  })

  const [name, setName] = useState(orgStore?.name ?? '')
  const [appName, setAppName] = useState(orgStore?.app_name ?? '')
  const [primaryColor, setPrimaryColor] = useState(orgStore?.primary_color ?? '#4f46e5')
  const [secondaryColor, setSecondaryColor] = useState(orgStore?.secondary_color ?? '#7c3aed')
  const [accentColor, setAccentColor] = useState(orgStore?.accent_color ?? '#06b6d4')
  const [theme, setTheme] = useState(orgStore?.default_theme ?? 'light')

  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')
  const [smtpSsl, setSmtpSsl] = useState(true)

  // Sync form when the authenticated query returns full data (includes SMTP)
  useEffect(() => {
    if (org) {
      setName(org.name)
      setAppName(org.app_name)
      setPrimaryColor(org.primary_color)
      setSecondaryColor(org.secondary_color)
      setAccentColor(org.accent_color)
      setTheme(org.default_theme)
      setSmtpHost(org.smtp_host ?? '')
      setSmtpPort(org.smtp_port ?? 587)
      setSmtpUser(org.smtp_user ?? '')
      setSmtpFrom(org.smtp_from ?? '')
      setSmtpSsl(org.smtp_ssl ?? true)
    }
  }, [org])

  const updateBranding = useMutation({
    mutationFn: () =>
      api.patch('/api/organization', {
        name,
        app_name: appName,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        default_theme: theme,
      }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      qc.invalidateQueries({ queryKey: ['org-public'] })
      setOrg(data)
      toast.success('Paramètres enregistrés')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  const updateSmtp = useMutation({
    mutationFn: () =>
      api.put('/api/organization/smtp', {
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_password: smtpPassword,
        smtp_from: smtpFrom,
        smtp_ssl: smtpSsl,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      toast.success('Configuration SMTP enregistrée')
    },
    onError: () => toast.error('Erreur lors de la sauvegarde SMTP'),
  })

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post('/api/organization/logo', form)
      setOrg(data)
      qc.invalidateQueries({ queryKey: ['organization'] })
      qc.invalidateQueries({ queryKey: ['org-public'] })
      toast.success('Logo mis à jour')
    } catch {
      toast.error('Erreur lors du téléversement')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-semibold tracking-tight">Organisation</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">Paramètres généraux et apparence de l&apos;espace de travail</p>
          </div>
        </div>
        <div className="flex-1 p-6 lg:p-8 space-y-4">
          <div className="h-8 w-48 rounded-lg bg-muted/50 animate-pulse" />
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div className="h-4 w-24 rounded bg-muted/50 animate-pulse" />
            <div className="space-y-3">
              <div className="h-8 rounded-lg bg-muted/50 animate-pulse" />
              <div className="h-8 rounded-lg bg-muted/50 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-tight">Organisation</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Paramètres généraux et apparence de l&apos;espace de travail</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <Tabs defaultValue="branding">
        <TabsList className="h-8 text-[13px] bg-muted/50 border border-border/50 p-0.5">
          <TabsTrigger value="branding" className="h-7 text-[12px] gap-1.5 px-3">
            <Palette className="h-3.5 w-3.5" />
            Apparence
          </TabsTrigger>
          <TabsTrigger value="smtp" className="h-7 text-[12px] gap-1.5 px-3">
            <Mail className="h-3.5 w-3.5" />
            SMTP
          </TabsTrigger>
        </TabsList>

        {/* Branding tab */}
        <TabsContent value="branding" className="mt-4 space-y-4">
          {/* Identity */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">Identité</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/70">Nom de l&apos;entreprise</Label>
                <Input
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="h-8 text-[13px] border-border/70"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/70">Nom de l&apos;application</Label>
                <Input
                  value={appName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAppName(e.target.value)}
                  placeholder="ProjectEyes"
                  className="h-8 text-[13px] border-border/70"
                />
              </div>
              {/* Logo */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/70">Logo</Label>
                <div className="flex items-center gap-3">
                  {org?.logo_path ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/storage/${org.logo_path}`}
                      alt="Logo"
                      className="h-9 w-auto rounded-lg border border-border/60 object-contain bg-muted/30 px-2"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 bg-background text-[12px] font-medium text-muted-foreground hover:border-border hover:text-foreground transition-colors">
                      <Upload className="h-3 w-3" />
                      Choisir un fichier
                    </div>
                    <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">Couleurs & thème</p>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">Palettes prédéfinies</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.primary)
                      setSecondaryColor(preset.secondary)
                      setAccentColor(preset.accent)
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/60 hover:border-border text-[12px] font-medium text-foreground/80 transition-colors bg-background"
                  >
                    <div className="flex items-center gap-0.5">
                      <div className="h-3 w-3 rounded-full" style={{ background: preset.primary }} />
                      <div className="h-3 w-3 rounded-full" style={{ background: preset.secondary }} />
                      <div className="h-3 w-3 rounded-full" style={{ background: preset.accent }} />
                    </div>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <ColorField label="Couleur primaire" value={primaryColor} onChange={setPrimaryColor} />
              <ColorField label="Secondaire" value={secondaryColor} onChange={setSecondaryColor} />
              <ColorField label="Accent" value={accentColor} onChange={setAccentColor} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Thème par défaut</Label>
              <div className="flex items-center gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTheme(t)
                      if (org) applyTheme({ ...org, default_theme: t })
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all ${
                      theme === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:border-border bg-background'
                    }`}
                  >
                    {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Système'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => updateBranding.mutate()}
              disabled={updateBranding.isPending}
              className="text-[13px] h-8 px-5"
            >
              {updateBranding.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </TabsContent>

        {/* SMTP tab */}
        <TabsContent value="smtp" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-[12px] font-semibold text-foreground/60 uppercase tracking-wider">Configuration SMTP</p>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground -mt-2">
              Utilisé pour les emails d&apos;invitation et de réinitialisation de mot de passe.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Serveur SMTP</Label>
                  <Input
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpHost(e.target.value)}
                    className="h-8 text-[13px] border-border/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Port</Label>
                  <Input
                    type="number"
                    value={smtpPort}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpPort(Number(e.target.value))}
                    className="h-8 text-[13px] border-border/70"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Utilisateur</Label>
                  <Input
                    type="email"
                    placeholder="user@gmail.com"
                    value={smtpUser}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpUser(e.target.value)}
                    className="h-8 text-[13px] border-border/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Mot de passe</Label>
                  <Input
                    type="password"
                    value={smtpPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpPassword(e.target.value)}
                    className="h-8 text-[13px] border-border/70"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/70">Email expéditeur</Label>
                <Input
                  type="email"
                  placeholder="noreply@acme.com"
                  value={smtpFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpFrom(e.target.value)}
                  className="h-8 text-[13px] border-border/70"
                />
              </div>
              <div
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 cursor-pointer"
                onClick={() => setSmtpSsl(!smtpSsl)}
              >
                <Switch checked={smtpSsl} onCheckedChange={setSmtpSsl} onClick={(e) => e.stopPropagation()} />
                <div>
                  <p className="text-[13px] font-medium">SSL / TLS</p>
                  <p className="text-[11px] text-muted-foreground">Connexion chiffrée (recommandé)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => updateSmtp.mutate()}
              disabled={updateSmtp.isPending}
              className="text-[13px] h-8 px-5"
            >
              {updateSmtp.isPending ? 'Enregistrement…' : 'Enregistrer la configuration'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
