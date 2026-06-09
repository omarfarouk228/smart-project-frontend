'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, CalendarDays, AlertCircle } from 'lucide-react'
import api from '@/lib/api'
import type { Task, Priority } from '@/types/task'
import type { BoardResponse, Column } from '@/types/project'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Faible',   color: '#94a3b8', bg: '#94a3b818' },
  medium: { label: 'Moyenne',  color: '#3b82f6', bg: '#3b82f618' },
  high:   { label: 'Haute',    color: '#f97316', bg: '#f9731618' },
  urgent: { label: 'Urgente',  color: '#ef4444', bg: '#ef444418' },
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['from-violet-500 to-indigo-500','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-rose-500 to-pink-500']
  return (
    <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}>
      {initials}
    </div>
  )
}

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [search, setSearch] = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const { data: board, isLoading } = useQuery<BoardResponse>({
    queryKey: ['board', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/board`)).data,
  })

  const columnMap = Object.fromEntries((board?.columns ?? []).map((c) => [c.id, c]))

  const tasks = (board?.tasks ?? []).filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    // sort by column position then task position
    const ca = columnMap[a.column_id ?? '']?.position ?? 99
    const cb = columnMap[b.column_id ?? '']?.position ?? 99
    return ca !== cb ? ca - cb : a.position - b.position
  })

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50">
        <div className="relative w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Filtrer les tâches…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-8 text-[12px] bg-muted/30 border-border/50"
          />
        </div>
        <p className="text-[12px] text-muted-foreground ml-auto">
          {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b border-border/50">
              <th className="px-6 py-2 text-left text-[11px] font-medium text-muted-foreground w-1/2">Titre</th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Colonne</th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Priorité</th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Assigné à</th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Échéance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[13px] text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {tasks.map((task) => {
              const col = task.column_id ? columnMap[task.column_id] : null
              const p = PRIORITY_CONFIG[task.priority]
              const overdue = task.due_date && new Date(task.due_date) < new Date()
              return (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="group hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-2.5">
                    <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    {task.subtask_count > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {task.subtask_done_count}/{task.subtask_count} sous-tâche{task.subtask_count > 1 ? 's' : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {col && (
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{ background: `${col.color}18`, color: col.color }}
                      >
                        {col.name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{ background: p.bg, color: p.color }}
                    >
                      {p.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={task.assignee.full_name} />
                        <span className="text-[12px] text-muted-foreground">{task.assignee.first_name}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {task.due_date ? (
                      <span className={cn('flex items-center gap-1 text-[11px]', overdue ? 'text-red-500' : 'text-muted-foreground')}>
                        {overdue && <AlertCircle className="h-3 w-3" />}
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

      <TaskDialog
        task={selectedTask}
        projectId={projectId}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  )
}
