'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, CalendarDays, AlertCircle, ListTodo } from 'lucide-react'
import api from '@/lib/api'
import type { Task, Priority } from '@/types/task'
import type { BoardResponse } from '@/types/project'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Faible',   color: '#94a3b8', bg: '#94a3b818' },
  medium: { label: 'Moyenne',  color: '#3b82f6', bg: '#3b82f618' },
  high:   { label: 'Haute',    color: '#f97316', bg: '#f9731618' },
  urgent: { label: 'Urgente',  color: '#ef4444', bg: '#ef444418' },
}

const STATUS_ORDER = ['urgent', 'high', 'medium', 'low'] as Priority[]

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['from-violet-500 to-indigo-500', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500']
  return (
    <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
      {initials}
    </div>
  )
}

export default function MyTasksPage() {
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['my-tasks'],
    queryFn: async () => (await api.get('/api/tasks')).data,
  })

  const filtered = tasks.filter((t) => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const overdue = filtered.filter((t) => t.due_date && new Date(t.due_date) < new Date())
  const upcoming = filtered.filter((t) => t.due_date && new Date(t.due_date) >= new Date())
  const noDue = filtered.filter((t) => !t.due_date)

  const groups = [
    { label: 'En retard', tasks: overdue, accent: 'text-red-500' },
    { label: 'À venir', tasks: upcoming, accent: 'text-foreground' },
    { label: 'Sans échéance', tasks: noDue, accent: 'text-muted-foreground' },
  ].filter((g) => g.tasks.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold">Mes tâches</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''} assignée{tasks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/40">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-8 text-[12px] bg-muted/30 border-border/50"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', ...STATUS_ORDER] as const).map((p) => {
            const cfg = p !== 'all' ? PRIORITY_CONFIG[p] : null
            return (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={cn(
                  'text-[11px] font-medium px-2.5 py-1 rounded-md transition-all',
                  filterPriority === p
                    ? 'text-white'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
                style={filterPriority === p && cfg ? { background: cfg.color } : filterPriority === p ? { background: 'hsl(var(--foreground)/0.1)' } : {}}
              >
                {p === 'all' ? 'Tout' : cfg!.label}
              </button>
            )
          })}
        </div>
        <p className="ml-auto text-[12px] text-muted-foreground">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-auto">
        {isLoading && <p className="text-[13px] text-muted-foreground text-center py-12">Chargement…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <ListTodo className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-[13px]">Aucune tâche</p>
          </div>
        )}

        {groups.map(({ label, tasks: groupTasks, accent }) => (
          <div key={label}>
            <div className="flex items-center gap-2 px-6 py-2 bg-muted/20 border-b border-border/30 sticky top-0">
              <p className={cn('text-[11px] font-semibold uppercase tracking-wider', accent)}>
                {label}
              </p>
              <span className="text-[11px] text-muted-foreground/50">({groupTasks.length})</span>
            </div>
            <table className="w-full">
              <tbody className="divide-y divide-border/30">
                {groupTasks.map((task) => {
                  const p = PRIORITY_CONFIG[task.priority]
                  const overdue = task.due_date && new Date(task.due_date) < new Date()
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="group hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: p.color }} />
                          <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                            {task.title}
                          </p>
                          {task.labels.map((l) => (
                            <span key={l.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${l.color}22`, color: l.color }}>
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 w-32">
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: p.bg, color: p.color }}>
                          {p.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        {task.due_date ? (
                          <span className={cn('flex items-center gap-1 text-[11px]', overdue ? 'text-red-500' : 'text-muted-foreground')}>
                            {overdue && <AlertCircle className="h-3 w-3" />}
                            <CalendarDays className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          projectId={selectedTask.project_id}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
