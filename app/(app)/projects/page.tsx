'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Plus, FolderKanban, Users, Calendar } from 'lucide-react'
import api from '@/lib/api'
import type { ProjectListResponse } from '@/types/project'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PROJECT_COLORS = [
  'from-violet-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
]

function colorGradient(color: string): string {
  return PROJECT_COLORS[parseInt(color.replace('#', ''), 16) % PROJECT_COLORS.length]
}

export default function ProjectsPage() {
  const { data, isLoading } = useQuery<ProjectListResponse>({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data,
  })

  return (
    <div className="p-8 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Projets</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {data?.total ?? '—'} projet{(data?.total ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/projects/new" className={cn(buttonVariants(), 'text-[13px] h-8 gap-1.5')}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau projet
        </Link>
      </div>

      {/* Grid */}
      {isLoading && (
        <p className="text-[13px] text-muted-foreground py-12 text-center">Chargement…</p>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="rounded-xl border border-border/60 border-dashed bg-card/50 py-16 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[15px] font-medium text-foreground">Aucun projet</p>
          <p className="text-[13px] text-muted-foreground mt-1 mb-5">
            Créez votre premier projet pour commencer
          </p>
          <Link href="/projects/new" className={cn(buttonVariants(), 'text-[13px] h-8 gap-1.5')}>
            <Plus className="h-3.5 w-3.5" />
            Créer un projet
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.items.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group block rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all duration-150 overflow-hidden"
          >
            {/* Color bar */}
            <div
              className="h-1"
              style={{ background: project.color }}
            />
            <div className="p-4 space-y-3">
              {/* Key badge + name */}
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: project.color }}
                >
                  {project.key}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Columns */}
              <div className="flex gap-1.5">
                {project.columns.map((col) => (
                  <div
                    key={col.id}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                    style={{ background: `${col.color}18`, color: col.color }}
                  >
                    {col.name}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {project.member_count} membre{project.member_count > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
