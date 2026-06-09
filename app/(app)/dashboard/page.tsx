'use client'

import { useAuthStore } from '@/stores/auth'
import { FolderKanban, CheckSquare, Zap, TrendingUp } from 'lucide-react'

const METRICS = [
  { label: 'Projets actifs', value: '0', icon: FolderKanban, color: 'text-violet-500', bg: 'bg-violet-500/8' },
  { label: 'Tâches en cours', value: '0', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-500/8' },
  { label: 'Sprints actifs', value: '0', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/8' },
  { label: 'Vélocité moy.', value: '—', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
]

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Bonjour, {user?.first_name} 👋
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Voici un aperçu de votre activité
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {METRICS.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
          >
            <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-[24px] font-semibold tracking-tight text-foreground leading-none">
                {value}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-border/60 border-dashed bg-card/50 p-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-[15px] font-medium text-foreground">Aucun projet pour le moment</p>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-xs mx-auto">
          Créez votre premier projet pour commencer à gérer vos tâches et sprints.
        </p>
      </div>
    </div>
  )
}
