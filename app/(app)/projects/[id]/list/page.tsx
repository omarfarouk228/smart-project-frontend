'use client'

import { use, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, AlertCircle, Printer, X, ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import type { Task, Priority, Label } from '@/types/task'
import type { BoardResponse, Column, ProjectMember } from '@/types/project'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

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

type FilterState = {
  search: string
  priority: Priority | ''
  assigneeId: string
  labelId: string
}

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [filters, setFilters] = useState<FilterState>({ search: '', priority: '', assigneeId: '', labelId: '' })
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const { data: board, isLoading } = useQuery<BoardResponse>({
    queryKey: ['board', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/board`)).data,
  })

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/members`)).data,
  })

  const { data: labels = [] } = useQuery<Label[]>({
    queryKey: ['labels', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/labels`)).data,
  })

  const columnMap = Object.fromEntries((board?.columns ?? []).map((c) => [c.id, c]))

  const tasks = (board?.tasks ?? []).filter((t) => {
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.assigneeId && t.assignee?.id !== filters.assigneeId) return false
    if (filters.labelId && !t.labels.some((l) => l.id === filters.labelId)) return false
    return true
  }).sort((a, b) => {
    const ca = columnMap[a.column_id ?? '']?.position ?? 99
    const cb = columnMap[b.column_id ?? '']?.position ?? 99
    return ca !== cb ? ca - cb : a.position - b.position
  })

  const hasFilters = filters.priority || filters.assigneeId || filters.labelId

  const clearFilters = () => setFilters({ search: '', priority: '', assigneeId: '', labelId: '' })

  const handlePrint = () => window.print()

  // N shortcut: open new task dialog for first column
  useKeyboardShortcuts([
    {
      key: 'n',
      handler: () => {
        // trigger new task — implementation via board creates task at top; for list we just
        // show a placeholder toast since full inline creation is on the board
        toast.info('Utilisez le tableau Kanban pour créer une tâche (N)')
      },
    },
  ])

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-area { display: block !important; }
          .no-print { display: none !important; }
        }
        @media screen { .print-area { display: contents; } }
      `}</style>

      <div className="flex flex-col h-full print-area">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50 flex-wrap no-print">
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Filtrer les tâches…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="h-7 pl-8 text-[12px] bg-muted/30 border-border/50"
            />
          </div>

          {/* Priority filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as Priority | '' }))}
            className="h-7 rounded-md border border-border/50 bg-background px-2 text-[12px] text-muted-foreground"
          >
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Assignee filter */}
          <select
            value={filters.assigneeId}
            onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
            className="h-7 rounded-md border border-border/50 bg-background px-2 text-[12px] text-muted-foreground"
          >
            <option value="">Tous les membres</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>{m.user.full_name}</option>
            ))}
          </select>

          {/* Label filter */}
          {labels.length > 0 && (
            <select
              value={filters.labelId}
              onChange={(e) => setFilters((f) => ({ ...f, labelId: e.target.value }))}
              className="h-7 rounded-md border border-border/50 bg-background px-2 text-[12px] text-muted-foreground"
            >
              <option value="">Tous les labels</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 h-7 px-2 rounded-md text-[11px] text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="h-3 w-3" />
              Effacer
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <p className="text-[12px] text-muted-foreground">
              {tasks.length} tâche{tasks.length > 1 ? 's' : ''}
            </p>
            <button
              onClick={handlePrint}
              title="Exporter en PDF"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-border/50 text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-border/50">
                <th className="px-6 py-2 text-left text-[11px] font-medium text-muted-foreground w-1/2">Titre</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Colonne</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Priorité</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Labels</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Assigné à</th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Échéance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[13px] text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[13px] text-muted-foreground">
                    Aucune tâche ne correspond aux filtres
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
                      <div className="flex flex-wrap gap-1">
                        {task.labels.map((l) => (
                          <span
                            key={l.id}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: `${l.color}22`, color: l.color }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
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
    </>
  )
}
