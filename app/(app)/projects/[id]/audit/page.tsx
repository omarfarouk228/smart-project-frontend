'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import api from '@/lib/api'
import type { AuditLogEntry } from '@/types/project'

const ACTION_LABELS: Record<string, string> = {
  task_created:      'Tâche créée',
  task_updated:      'Tâche modifiée',
  task_deleted:      'Tâche supprimée',
  task_moved:        'Tâche déplacée',
  sprint_created:    'Sprint créé',
  sprint_started:    'Sprint démarré',
  sprint_completed:  'Sprint terminé',
  sprint_deleted:    'Sprint supprimé',
  member_added:      'Membre ajouté',
  member_removed:    'Membre retiré',
  project_updated:   'Projet modifié',
  column_created:    'Colonne créée',
  column_deleted:    'Colonne supprimée',
  comment_added:     'Commentaire ajouté',
}

const ACTION_COLOR: Record<string, string> = {
  task_created:     '#10b981',
  task_deleted:     '#ef4444',
  task_moved:       '#6366f1',
  sprint_started:   '#f97316',
  sprint_completed: '#3b82f6',
  member_added:     '#10b981',
  member_removed:   '#ef4444',
  project_updated:  '#8b5cf6',
  column_created:   '#10b981',
  column_deleted:   '#ef4444',
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `Il y a ${days}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

const GRADIENTS = [
  'from-violet-500 to-indigo-500', 'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
]

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)

  const { data: logs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['audit-log', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/audit-log`)).data,
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-[13px] font-semibold">Journal d'activité</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">{logs.length} entrée{logs.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading && (
          <p className="text-[13px] text-muted-foreground">Chargement…</p>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">Aucune activité enregistrée</p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border/40" />

            <div className="space-y-0">
              {logs.map((log) => {
                const actionLabel = ACTION_LABELS[log.action] ?? log.action
                const dotColor = ACTION_COLOR[log.action] ?? '#94a3b8'
                const name = log.user?.full_name ?? 'Système'
                const grad = log.user
                  ? GRADIENTS[log.user.full_name.charCodeAt(0) % GRADIENTS.length]
                  : 'from-slate-400 to-slate-500'

                return (
                  <div key={log.id} className="relative flex gap-4 pb-5">
                    {/* dot */}
                    <div className="relative z-10 shrink-0 mt-0.5">
                      <div
                        className="h-[8px] w-[8px] rounded-full ring-2 ring-background mt-[5px] ml-[11px]"
                        style={{ background: dotColor }}
                      />
                    </div>

                    {/* content */}
                    <div className="flex-1 min-w-0 pt-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[7px] font-bold text-white shrink-0 mt-0.5`}>
                          {initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] leading-snug">
                            <span className="font-semibold text-foreground">{name}</span>
                            {' '}
                            <span className="text-muted-foreground">{actionLabel.toLowerCase()}</span>
                            {log.entity_name && (
                              <span className="font-medium text-foreground"> « {log.entity_name} »</span>
                            )}
                          </p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.entries(log.details).map(([k, v]) => (
                                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">{formatRelative(log.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
