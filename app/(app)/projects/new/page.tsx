'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
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
  '#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48', '#0f172a',
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

  const autoKey = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 5) || ''

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
    <div className="p-8 max-w-lg space-y-6">
      {/* Header */}
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

      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-5">
        {/* Preview card */}
        <div
          className="rounded-xl border border-border/60 bg-card overflow-hidden"
          style={{ borderTopColor: selectedColor, borderTopWidth: 3 }}
        >
          <div className="p-4 flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-[12px] font-bold text-white"
              style={{ background: selectedColor }}
            >
              {autoKey(nameValue || 'P')}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">
                {nameValue || 'Nom du projet'}
              </p>
              <div className="flex gap-1 mt-1">
                {['À faire', 'En cours', 'Terminé'].map((col, i) => (
                  <span
                    key={col}
                    className="text-[9px] font-medium px-1 py-0.5 rounded-sm"
                    style={{
                      background: ['#94a3b818', '#3b82f618', '#10b98118'][i],
                      color: ['#94a3b8', '#3b82f6', '#10b981'][i],
                    }}
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70">Nom du projet *</Label>
            <Input
              {...register('name')}
              placeholder="Refonte site web"
              className="h-8 text-[13px] border-border/70"
              onChange={(e) => {
                register('name').onChange(e)
                const suggested = autoKey(e.target.value)
                setValue('key', suggested)
              }}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70">Description</Label>
            <Input
              {...register('description')}
              placeholder="Optionnelle"
              className="h-8 text-[13px] border-border/70"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70">Clé du projet *</Label>
            <Input
              {...register('key')}
              placeholder="PROJ"
              className="h-8 text-[13px] font-mono border-border/70 w-32"
              onChange={(e) => setValue('key', e.target.value.toUpperCase())}
            />
            <p className="text-[11px] text-muted-foreground">2–10 lettres, utilisée comme préfixe</p>
            {errors.key && <p className="text-[11px] text-destructive">{errors.key.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-foreground/70">Couleur</Label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110"
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
  )
}
