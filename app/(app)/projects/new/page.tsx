'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, FolderKanban, Users, CheckSquare, Zap } from 'lucide-react'
import api from '@/lib/api'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  key: z.string().min(2).max(10).regex(/^[A-Za-z]+$/, 'Lettres uniquement'),
  color: z.string(),
})
type FormData = z.infer<typeof schema>

const PROJECT_COLORS = [
  '#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48', '#0f172a', '#db2777',
]

const DEFAULT_COLUMNS = [
  { name: 'À faire', color: '#94a3b8' },
  { name: 'En cours', color: '#3b82f6' },
  { name: 'Révision', color: '#f97316' },
  { name: 'Terminé', color: '#10b981' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { color: PROJECT_COLORS[0] },
  })

  const selectedColor = watch('color')
  const nameValue = watch('name')
  const keyValue = watch('key')
  const descValue = watch('description')

  const autoKey = (name: string) =>
    name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 5) || ''

  const create = useMutation({
    mutationFn: (data: FormData) => api.post('/api/projects', data),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet créé')
      router.push(`/projects/${data.id}`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Erreur'),
  })

  return (
    <div className="flex h-full">
      {/* Left — form */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-xl space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight">Nouveau projet</h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Les colonnes par défaut seront créées automatiquement
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/70">Nom du projet *</Label>
                <Input
                  {...register('name')}
                  placeholder="ex : Refonte site web"
                  className="h-9 text-[13px] border-border/70"
                  onChange={e => {
                    register('name').onChange(e)
                    setValue('key', autoKey(e.target.value))
                  }}
                />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-foreground/70">Description</Label>
                <textarea
                  {...register('description')}
                  placeholder="Décrivez l'objectif du projet (optionnel)"
                  rows={3}
                  className="w-full h-auto resize-none rounded-lg border border-border/70 bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Clé du projet *</Label>
                  <Input
                    {...register('key')}
                    placeholder="PROJ"
                    className="h-9 text-[13px] font-mono border-border/70"
                    onChange={e => setValue('key', e.target.value.toUpperCase())}
                  />
                  <p className="text-[11px] text-muted-foreground/60">2–10 lettres, préfixe des tâches</p>
                  {errors.key && <p className="text-[11px] text-destructive">{errors.key.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-medium text-foreground/70">Couleur</Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PROJECT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setValue('color', c)}
                        className="h-7 w-7 rounded-full transition-transform hover:scale-110 shrink-0"
                        style={{
                          background: c,
                          outline: selectedColor === c ? `2px solid ${c}` : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Default columns preview */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground/70">Colonnes créées automatiquement</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Vous pourrez les modifier dans les paramètres du projet</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_COLUMNS.map(col => (
                  <div key={col.name} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: col.color }} />
                    <span className="text-[12px] font-medium text-foreground/80">{col.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'text-[13px] h-8')}>
                Annuler
              </Link>
              <Button type="submit" disabled={create.isPending} className="text-[13px] h-8 px-5">
                {create.isPending ? 'Création…' : 'Créer le projet'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right — live preview */}
      <div className="hidden lg:flex w-80 xl:w-96 shrink-0 border-l border-border/50 flex-col bg-muted/20">
        <div className="p-5 border-b border-border/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Aperçu</p>
        </div>
        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {/* Project card preview */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="h-1.5" style={{ background: selectedColor }} />
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div
                  className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                  style={{ background: selectedColor }}
                >
                  {keyValue || autoKey(nameValue || 'P') || 'P'}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground">
                    {nameValue || <span className="text-muted-foreground/40 italic">Nom du projet</span>}
                  </p>
                  {descValue ? (
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{descValue}</p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground/30 mt-0.5 italic">Description…</p>
                  )}
                </div>
              </div>

              <div className="flex gap-1 flex-wrap">
                {DEFAULT_COLUMNS.map(col => (
                  <div key={col.name} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: `${col.color}18`, color: col.color }}>
                    {col.name}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 1 membre</span>
                <span className="flex items-center gap-1 ml-auto"><CheckSquare className="h-3 w-3" /> 0 tâche</span>
              </div>
            </div>
          </div>

          {/* Info blocks */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 rounded-lg bg-background border border-border/50 px-3 py-2.5">
              <FolderKanban className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground/80">Kanban & Liste</p>
                <p className="text-[11px] text-muted-foreground">Plusieurs vues disponibles</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-background border border-border/50 px-3 py-2.5">
              <Zap className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground/80">Sprints & Backlog</p>
                <p className="text-[11px] text-muted-foreground">Gestion agile intégrée</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-background border border-border/50 px-3 py-2.5">
              <Users className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-foreground/80">Collaboration</p>
                <p className="text-[11px] text-muted-foreground">Invitez votre équipe depuis les paramètres</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
