'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Zap, CalendarDays, CheckCircle, Clock, Play } from 'lucide-react'
import api from '@/lib/api'
import type { Sprint } from '@/types/sprint'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<Sprint['status'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  planning:  { label: 'Planification', icon: Clock,        color: '#94a3b8', bg: '#94a3b818' },
  active:    { label: 'Actif',          icon: Play,         color: '#10b981', bg: '#10b98118' },
  completed: { label: 'Terminé',        icon: CheckCircle,  color: '#6366f1', bg: '#6366f118' },
}

export default function SprintsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)

  const { data: sprints, isLoading } = useQuery<Sprint[]>({
    queryKey: ['sprints', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/sprints`)).data,
  })

  return (
    <div className="overflow-auto h-full">
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">Sprints</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {sprints?.length ?? 0} sprint{(sprints?.length ?? 0) > 1 ? 's' : ''} — créez-en depuis le Backlog
          </p>
        </div>

        {isLoading && <p className="text-[13px] text-muted-foreground py-8 text-center">Chargement…</p>}

        {!isLoading && sprints?.length === 0 && (
          <div className="rounded-xl border border-border/60 border-dashed bg-card/50 py-12 text-center">
            <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">Aucun sprint</p>
            <p className="text-[12px] text-muted-foreground/60 mt-1">
              Créez un sprint depuis la vue Backlog
            </p>
          </div>
        )}

        <div className="space-y-2">
          {sprints?.map((sprint) => {
            const cfg = STATUS_CONFIG[sprint.status]
            const Icon = cfg.icon
            return (
              <Link
                key={sprint.id}
                href={`/projects/${projectId}/sprints/${sprint.id}`}
                className="block rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all p-4 group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ background: cfg.bg }}
                  >
                    <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                        {sprint.name}
                      </p>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {sprint.goal && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{sprint.goal}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {sprint.task_count} tâche{sprint.task_count > 1 ? 's' : ''}
                      </span>
                      {(sprint.start_date || sprint.end_date) && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {sprint.start_date && new Date(sprint.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {sprint.start_date && sprint.end_date && ' → '}
                          {sprint.end_date && new Date(sprint.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
