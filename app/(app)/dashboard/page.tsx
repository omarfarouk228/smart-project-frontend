'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/auth'
import { useQuery } from '@tanstack/react-query'
import {
  FolderKanban, CheckSquare, Zap, ListTodo,
  AlertCircle, CheckCircle2, CalendarDays, ArrowRight,
  TrendingUp, Clock, Plus,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface RecentProject { id: string; name: string; key: string; color: string; member_count: number; task_count: number }
interface UpcomingTask { id: string; title: string; priority: string; due_date: string; project_name: string; project_color: string }
interface DashboardStats {
  projects_count: number
  tasks_in_progress: number
  active_sprints: number
  my_tasks_count: number
  overdue_tasks: number
  completed_this_week: number
  recent_projects: RecentProject[]
  upcoming_tasks: UpcomingTask[]
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#94a3b8', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444',
}
const PRIORITY_LABEL: Record<string, string> = {
  low: 'Faible', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente',
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/api/projects/dashboard')).data,
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const METRICS = [
    {
      label: 'Projets',
      value: stats?.projects_count ?? 0,
      icon: FolderKanban,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      href: '/projects',
      sub: 'actifs',
    },
    {
      label: 'En cours',
      value: stats?.tasks_in_progress ?? 0,
      icon: CheckSquare,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      href: '/my-tasks',
      sub: 'tâches',
    },
    {
      label: 'Sprints',
      value: stats?.active_sprints ?? 0,
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      href: null,
      sub: 'actifs',
    },
    {
      label: 'Mes tâches',
      value: stats?.my_tasks_count ?? 0,
      icon: ListTodo,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      href: '/my-tasks',
      sub: 'assignées',
    },
    {
      label: 'En retard',
      value: stats?.overdue_tasks ?? 0,
      icon: AlertCircle,
      color: (stats?.overdue_tasks ?? 0) > 0 ? 'text-red-500' : 'text-muted-foreground',
      bg: (stats?.overdue_tasks ?? 0) > 0 ? 'bg-red-500/10' : 'bg-muted/50',
      href: '/my-tasks',
      sub: 'tâches',
    },
    {
      label: 'Cette semaine',
      value: stats?.completed_this_week ?? 0,
      icon: CheckCircle2,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10',
      href: null,
      sub: 'complétées',
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            {greeting}, {user?.first_name} 👋
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link href="/projects/new" className={cn(buttonVariants(), 'text-[13px] h-8 gap-1.5')}>
          <Plus className="h-3.5 w-3.5" /> Nouveau projet
        </Link>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {METRICS.map(({ label, value, icon: Icon, color, bg, href, sub }) => {
          const card = (
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 h-full hover:border-border transition-colors">
              <div className={cn('inline-flex items-center justify-center h-8 w-8 rounded-lg', bg)}>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <div>
                <p className="text-[26px] font-bold tracking-tight text-foreground leading-none">
                  {isLoading ? <span className="text-muted-foreground/30">—</span> : value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{label} <span className="text-muted-foreground/50">{sub}</span></p>
              </div>
            </div>
          )
          return href ? (
            <Link key={label} href={href} className="block">{card}</Link>
          ) : (
            <div key={label}>{card}</div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent projects */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground/80">Projets récents</h2>
            <Link href="/projects" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Voir tous <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          )}

          {!isLoading && (stats?.recent_projects.length ?? 0) === 0 && (
            <div className="rounded-xl border border-border/60 border-dashed bg-card/50 py-10 text-center">
              <FolderKanban className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Aucun projet</p>
              <Link href="/projects/new" className={cn(buttonVariants({ size: 'sm' }), 'text-[12px] h-7 mt-3 gap-1')}>
                <Plus className="h-3 w-3" /> Créer
              </Link>
            </div>
          )}

          <div className="space-y-2">
            {stats?.recent_projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 hover:border-border hover:shadow-sm transition-all group"
              >
                <div
                  className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: p.color }}
                >
                  {p.key}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {p.task_count} tâche{p.task_count !== 1 ? 's' : ''} · {p.member_count} membre{p.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming tasks */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-foreground/80">Échéances proches</h2>
            <Link href="/my-tasks" className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Voir toutes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          )}

          {!isLoading && (stats?.upcoming_tasks.length ?? 0) === 0 && (
            <div className="rounded-xl border border-border/60 border-dashed bg-card/50 py-10 text-center">
              <CalendarDays className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">Aucune échéance cette semaine</p>
            </div>
          )}

          <div className="space-y-2">
            {stats?.upcoming_tasks.map((t) => {
              const due = new Date(t.due_date)
              const isToday = due.toDateString() === new Date().toDateString()
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-border/60 bg-card px-4 py-3 space-y-1.5"
                >
                  <p className="text-[13px] font-medium text-foreground line-clamp-1">{t.title}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ background: `${PRIORITY_COLOR[t.priority]}22`, color: PRIORITY_COLOR[t.priority] }}
                    >
                      {PRIORITY_LABEL[t.priority]}
                    </span>
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: t.project_color }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: t.project_color }} />
                      {t.project_name}
                    </div>
                    <span className={cn('ml-auto flex items-center gap-1 text-[11px]', isToday ? 'text-orange-500 font-medium' : 'text-muted-foreground')}>
                      <Clock className="h-3 w-3" />
                      {isToday ? "Aujourd'hui" : formatDistanceToNow(due, { locale: fr, addSuffix: true })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Productivity summary */}
          {!isLoading && (stats?.completed_this_week ?? 0) > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                <span className="font-semibold">{stats?.completed_this_week}</span> tâche{(stats?.completed_this_week ?? 0) > 1 ? 's' : ''} complétée{(stats?.completed_this_week ?? 0) > 1 ? 's' : ''} cette semaine
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
