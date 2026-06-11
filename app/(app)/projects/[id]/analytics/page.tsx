'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import type { ProjectAnalytics } from '@/types/project'
import { cn } from '@/lib/utils'

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Faible',  color: '#94a3b8' },
  medium: { label: 'Moyenne', color: '#3b82f6' },
  high:   { label: 'Haute',   color: '#f97316' },
  urgent: { label: 'Urgente', color: '#ef4444' },
}

const ACTION_LABELS: Record<string, string> = {
  sprint_started:   'Sprint démarré',
  sprint_completed: 'Sprint terminé',
  sprint_created:   'Sprint créé',
}

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-start gap-3">
      <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0`} style={{ background: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-[24px] font-semibold leading-none tracking-tight">{value}</p>
        <p className="text-[12px] text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function HBarChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return <p className="text-[12px] text-muted-foreground">Aucune donnée</p>
  return (
    <div className="space-y-2.5">
      {data.map(({ label, value, color }) => {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-foreground/80">{label}</span>
              <span className="text-[11px] text-muted-foreground">{value} ({pct}%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SprintProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-foreground">{done}/{total} tâches terminées</span>
        <span className="text-[11px] font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : '#6366f1' }}
        />
      </div>
    </div>
  )
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planning:  { label: 'Planification', cls: 'bg-muted text-muted-foreground' },
  active:    { label: 'Actif',         cls: 'bg-emerald-500/15 text-emerald-600' },
  completed: { label: 'Terminé',       cls: 'bg-blue-500/15 text-blue-600' },
}

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)

  const { data, isLoading } = useQuery<ProjectAnalytics>({
    queryKey: ['analytics', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/analytics`)).data,
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
        Chargement…
      </div>
    )
  }

  const columnData = data.by_column.map((c) => ({
    label: c.column_name,
    value: c.task_count,
    color: c.color,
  }))

  const priorityData = data.by_priority.map((p) => ({
    label: PRIORITY_CONFIG[p.priority]?.label ?? p.priority,
    value: p.count,
    color: PRIORITY_CONFIG[p.priority]?.color ?? '#94a3b8',
  }))

  const donePct = data.total_tasks > 0 ? Math.round((data.done_tasks / data.total_tasks) * 100) : 0

  return (
    <div className="flex flex-col h-full">
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Tâches totales"   value={data.total_tasks}  icon={TrendingUp}    color="#6366f1" />
        <StatCard label="Terminées"        value={data.done_tasks}   icon={CheckCircle2}  color="#10b981" sub={`${donePct}% du total`} />
        <StatCard label="En retard"        value={data.overdue_tasks} icon={AlertCircle}  color="#ef4444" />
        <StatCard label="En cours"         value={data.total_tasks - data.done_tasks} icon={Clock} color="#f97316" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By column */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-[13px] font-semibold mb-4">Tâches par colonne</h3>
          <HBarChart data={columnData} total={data.total_tasks} />
        </div>

        {/* By priority */}
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-[13px] font-semibold mb-4">Tâches par priorité</h3>
          <HBarChart data={priorityData} total={data.total_tasks} />
        </div>
      </div>

      {/* Member workload */}
      {data.member_workload.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-[13px] font-semibold mb-4">Charge de travail par membre</h3>
          <div className="space-y-3">
            {data.member_workload.map((m) => {
              const donePct = m.task_count > 0 ? Math.round((m.done_count / m.task_count) * 100) : 0
              const initials = m.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              const gradients = ['from-violet-500 to-indigo-500','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-rose-500 to-pink-500']
              const grad = gradients[m.full_name.charCodeAt(0) % gradients.length]
              return (
                <div key={m.user_id} className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium truncate">{m.full_name}</span>
                      <span className="text-[11px] text-muted-foreground ml-2 shrink-0">
                        {m.task_count} tâche{m.task_count !== 1 ? 's' : ''} · {donePct}% terminé
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${donePct}%`, background: '#10b981' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sprint stats */}
      {data.sprint_stats.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h3 className="text-[13px] font-semibold mb-4">Sprints</h3>
          <div className="space-y-4">
            {data.sprint_stats.map((s) => {
              const badge = STATUS_BADGE[s.status] ?? { label: s.status, cls: 'bg-muted text-muted-foreground' }
              return (
                <div key={s.sprint_id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-medium">{s.sprint_name}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                  <SprintProgressBar done={s.done_tasks} total={s.total_tasks} />
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
