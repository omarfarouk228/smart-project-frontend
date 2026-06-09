'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { ChevronRight, ChevronDown, Plus, Play, Check, Package, GripVertical } from 'lucide-react'
import api from '@/lib/api'
import type { BacklogResponse, Sprint } from '@/types/sprint'
import type { Task, Priority } from '@/types/task'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#94a3b8', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444',
}
const STATUS_CONFIG: Record<Sprint['status'], { label: string; color: string; bg: string }> = {
  planning:  { label: 'Planification', color: '#94a3b8', bg: '#94a3b818' },
  active:    { label: 'Actif',          color: '#10b981', bg: '#10b98118' },
  completed: { label: 'Terminé',        color: '#6366f1', bg: '#6366f118' },
}

function DraggableTaskRow({ task, onSelect }: { task: Task; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg group transition-colors',
        isDragging ? 'opacity-40' : 'hover:bg-muted/40'
      )}
    >
      <div {...listeners} {...attributes} className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
      <span
        onClick={onSelect}
        className="text-[13px] font-medium text-foreground flex-1 truncate cursor-pointer hover:text-primary transition-colors"
      >
        {task.title}
      </span>
      {task.assignee && (
        <span className="text-[11px] text-muted-foreground shrink-0">{task.assignee.first_name}</span>
      )}
      {task.due_date && (
        <span className="text-[11px] text-muted-foreground/60 shrink-0">
          {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </div>
  )
}

function DroppableSprint({ sprint, tasks, projectId, onSelectTask }: {
  sprint: Sprint; tasks: Task[]; projectId: string; onSelectTask: (t: Task) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const { setNodeRef, isOver } = useDroppable({ id: sprint.id })
  const qc = useQueryClient()
  const cfg = STATUS_CONFIG[sprint.status]

  const startSprint = useMutation({
    mutationFn: () => api.post(`/api/projects/${projectId}/sprints/${sprint.id}/start`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backlog', projectId] }); toast.success('Sprint démarré') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })
  const completeSprint = useMutation({
    mutationFn: () => api.post(`/api/projects/${projectId}/sprints/${sprint.id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['backlog', projectId] }); toast.success('Sprint terminé') },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden transition-colors', isOver ? 'border-primary/50 bg-primary/5' : 'border-border/60')}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold">{sprint.name}</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>
          {sprint.goal && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sprint.goal}</p>}
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{tasks.length} tâche{tasks.length !== 1 ? 's' : ''}</span>
        <div className="flex gap-1.5 ml-2" onClick={(e) => e.stopPropagation()}>
          {sprint.status === 'planning' && (
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1" onClick={() => startSprint.mutate()} disabled={startSprint.isPending}>
              <Play className="h-2.5 w-2.5" /> Démarrer
            </Button>
          )}
          {sprint.status === 'active' && (
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1" onClick={() => completeSprint.mutate()} disabled={completeSprint.isPending}>
              <Check className="h-2.5 w-2.5" /> Terminer
            </Button>
          )}
        </div>
      </div>
      {expanded && (
        <div ref={setNodeRef} className="border-t border-border/40 px-2 py-1.5 min-h-[48px] space-y-0.5">
          {tasks.map((t) => <DraggableTaskRow key={t.id} task={t} onSelect={() => onSelectTask(t)} />)}
          {tasks.length === 0 && (
            <p className={cn('text-center text-[12px] py-3', isOver ? 'text-primary/60' : 'text-muted-foreground/40')}>
              {isOver ? 'Déposer ici pour ajouter au sprint' : 'Glissez des tâches ici'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function BacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const qc = useQueryClient()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [createSprintOpen, setCreateSprintOpen] = useState(false)
  const [sprintName, setSprintName] = useState('')
  const [sprintGoal, setSprintGoal] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const { data, isLoading } = useQuery<BacklogResponse>({
    queryKey: ['backlog', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/backlog`)).data,
  })

  const addToSprint = useMutation({
    mutationFn: ({ sprintId, taskId }: { sprintId: string; taskId: string }) =>
      api.post(`/api/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog', projectId] }),
    onError: () => toast.error('Erreur lors de l\'assignation'),
  })

  const createSprint = useMutation({
    mutationFn: () => api.post(`/api/projects/${projectId}/sprints`, { name: sprintName, goal: sprintGoal || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog', projectId] })
      toast.success('Sprint créé')
      setCreateSprintOpen(false)
      setSprintName('')
      setSprintGoal('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function onDragStart(event: DragStartEvent) {
    const task = [...(data?.tasks ?? [])].find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !data) return
    const task = data.tasks.find((t) => t.id === active.id)
    if (!task) return
    const sprint = data.sprints.find((s) => s.id === over.id)
    if (!sprint) return
    addToSprint.mutate({ sprintId: sprint.id, taskId: task.id })
  }

  const sprints = data?.sprints ?? []
  const backlogTasks = data?.tasks ?? []

  return (
    <div className="overflow-auto h-full">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="p-6 space-y-3 max-w-3xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight">Backlog & Sprints</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {backlogTasks.length} tâche{backlogTasks.length !== 1 ? 's' : ''} non assignée{backlogTasks.length !== 1 ? 's' : ''} · {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => setCreateSprintOpen(true)} className="text-[13px] h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Nouveau sprint
            </Button>
          </div>

          {isLoading && <p className="text-[13px] text-muted-foreground py-8 text-center">Chargement…</p>}

          {/* Sprints (droppable) */}
          {sprints.map((sprint) => (
            <DroppableSprint
              key={sprint.id}
              sprint={sprint}
              tasks={[]}
              projectId={projectId}
              onSelectTask={setSelectedTask}
            />
          ))}

          {/* Backlog */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[13px] font-semibold flex-1">Backlog</p>
              <span className="text-[11px] text-muted-foreground">{backlogTasks.length} tâche{backlogTasks.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-2 py-1.5 space-y-0.5">
              {backlogTasks.map((t) => (
                <DraggableTaskRow key={t.id} task={t} onSelect={() => setSelectedTask(t)} />
              ))}
              {backlogTasks.length === 0 && (
                <p className="text-center text-[12px] text-muted-foreground/50 py-6">Toutes les tâches sont dans un sprint</p>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="px-3 py-2 rounded-lg border border-primary/40 bg-card shadow-xl text-[13px] font-medium text-foreground opacity-90">
              {activeTask.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create sprint dialog */}
      <Dialog open={createSprintOpen} onOpenChange={setCreateSprintOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-[16px]">Nouveau sprint</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Nom *</Label>
              <Input value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="Sprint 1" className="h-8 text-[13px] border-border/70" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-foreground/70">Objectif</Label>
              <Input value={sprintGoal} onChange={(e) => setSprintGoal(e.target.value)} placeholder="Optionnel" className="h-8 text-[13px] border-border/70" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" className="h-8 text-[13px]" onClick={() => setCreateSprintOpen(false)}>Annuler</Button>
              <Button className="h-8 text-[13px]" disabled={!sprintName.trim() || createSprint.isPending} onClick={() => createSprint.mutate()}>
                {createSprint.isPending ? 'Création…' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDialog task={selectedTask} projectId={projectId} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  )
}
