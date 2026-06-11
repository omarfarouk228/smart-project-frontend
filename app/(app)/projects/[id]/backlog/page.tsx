'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  ChevronRight, ChevronDown, Plus, Play, Check, Package, GripVertical, X,
  CalendarDays, Target,
} from 'lucide-react'
import api from '@/lib/api'
import type { BacklogResponse, SprintWithTasks, SprintStatus } from '@/types/sprint'
import type { Task, Priority } from '@/types/task'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#94a3b8', medium: '#3b82f6', high: '#f97316', urgent: '#ef4444',
}
const STATUS_CONFIG: Record<SprintStatus, { label: string; color: string; bg: string }> = {
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
        'flex items-center gap-2.5 px-4 py-2.5 group transition-colors',
        isDragging ? 'opacity-40' : 'hover:bg-muted/40'
      )}
    >
      <div {...listeners} {...attributes} className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
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
  sprint: SprintWithTasks; tasks: Task[]; projectId: string; onSelectTask: (t: Task) => void
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

  const doneCount = tasks.filter(t => {
    // rough heuristic — we don't have column info here
    return false
  }).length

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden transition-colors', isOver ? 'border-primary/50 bg-primary/5' : 'border-border/60')}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold">{sprint.name}</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
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
        <div ref={setNodeRef} className="border-t border-border/40 min-h-[48px] divide-y divide-border/30">
          {tasks.map((t) => <DraggableTaskRow key={t.id} task={t} onSelect={() => onSelectTask(t)} />)}
          {tasks.length === 0 && (
            <p className={cn('text-center text-[12px] py-5', isOver ? 'text-primary/60' : 'text-muted-foreground/40')}>
              {isOver ? 'Déposer ici pour ajouter au sprint' : 'Glissez des tâches ici'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Create Sprint Drawer ─────────────────────────────────────────────────────

interface CreateSprintDrawerProps {
  open: boolean
  onClose: () => void
  projectId: string
}

function CreateSprintDrawer({ open, onClose, projectId }: CreateSprintDrawerProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!open) { setName(''); setGoal(''); setStartDate(''); setEndDate('') }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const create = useMutation({
    mutationFn: () => api.post(`/api/projects/${projectId}/sprints`, {
      name,
      goal: goal || null,
      start_date: startDate || null,
      end_date: endDate || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog', projectId] })
      toast.success('Sprint créé')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-screen w-[480px] max-w-[95vw] bg-background shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 shrink-0">
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight">Nouveau sprint</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Définissez les informations du sprint</p>
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            className="h-7 text-[12px] px-4 shrink-0"
          >
            {create.isPending ? 'Création…' : 'Créer'}
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70">Nom du sprint *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 1"
              className="h-9 text-[13px] border-border/70"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) create.mutate() }}
            />
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70 flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              Objectif
            </Label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex : Livrer les fonctionnalités d'authentification…"
              rows={3}
              className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Dates */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-foreground/70 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              Dates (optionnel)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground/60">Début</p>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-[12px] border-border/70"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground/60">Fin</p>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-[12px] border-border/70"
                />
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
            <p className="text-[12px] font-medium text-foreground/70">À propos des sprints</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Les sprints permettent d&apos;organiser les tâches du backlog en itérations. Glissez des tâches du backlog vers ce sprint pour les lui assigner.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BacklogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const qc = useQueryClient()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [createSprintOpen, setCreateSprintOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const { data, isLoading } = useQuery<BacklogResponse>({
    queryKey: ['backlog', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/backlog`)).data,
  })

  const addToSprint = useMutation({
    mutationFn: ({ sprintId, taskId }: { sprintId: string; taskId: string }) =>
      api.post(`/api/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog', projectId] }),
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Erreur lors de l'assignation"),
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3 bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold tracking-tight">Backlog &amp; Sprints</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {backlogTasks.length} tâche{backlogTasks.length !== 1 ? 's' : ''} non assignée{backlogTasks.length !== 1 ? 's' : ''} · {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateSprintOpen(true)} className="text-[13px] h-8 gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Nouveau sprint
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="space-y-3">
            {isLoading && (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
              </div>
            )}

            {/* Sprints */}
            {sprints.map((sprint) => (
              <DroppableSprint
                key={sprint.id}
                sprint={sprint}
                tasks={sprint.tasks}
                projectId={projectId}
                onSelectTask={setSelectedTask}
              />
            ))}

            {/* Backlog */}
            <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-[13px] font-semibold flex-1">Backlog</p>
                <span className="text-[11px] text-muted-foreground">{backlogTasks.length} tâche{backlogTasks.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-border/30">
                {backlogTasks.map((t) => (
                  <DraggableTaskRow key={t.id} task={t} onSelect={() => setSelectedTask(t)} />
                ))}
                {backlogTasks.length === 0 && (
                  <p className="text-center text-[12px] text-muted-foreground/50 py-8">
                    Toutes les tâches sont dans un sprint
                  </p>
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
      </div>

      <CreateSprintDrawer
        open={createSprintOpen}
        onClose={() => setCreateSprintOpen(false)}
        projectId={projectId}
      />

      <TaskDialog
        task={selectedTask}
        projectId={projectId}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  )
}
