'use client'

import { useState, useMemo } from 'react'
import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import type { SprintBoardResponse } from '@/types/sprint'
import type { Column } from '@/types/project'
import type { Task } from '@/types/task'
import { TaskCard } from '@/components/kanban/TaskCard'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function DroppableColumn({ column, tasks, onAddTask, onTaskClick }: {
  column: Column; tasks: Task[]; onAddTask: () => void; onTaskClick: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const sorted = [...tasks].sort((a, b) => a.position - b.position)
  return (
    <div className="flex flex-col w-[270px] shrink-0">
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <div className="h-2 w-2 rounded-full shrink-0" style={{ background: column.color }} />
        <p className="text-[12px] font-semibold text-foreground uppercase tracking-wider flex-1 truncate">{column.name}</p>
        <span className="text-[11px] text-muted-foreground tabular-nums">{tasks.length}</span>
        <button onClick={onAddTask} className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn('flex-1 min-h-[120px] rounded-xl transition-colors p-1.5 space-y-1.5', isOver ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-muted/30')}
      >
        <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((task) => <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />)}
        </SortableContext>
        {tasks.length === 0 && <div className="py-4 text-center"><p className="text-[11px] text-muted-foreground/40">Aucune tâche</p></div>}
      </div>
    </div>
  )
}

export default function SprintBoardPage({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id: projectId, sid: sprintId } = use(params)
  const qc = useQueryClient()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const { data: board, isLoading } = useQuery<SprintBoardResponse>({
    queryKey: ['sprint-board', projectId, sprintId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/sprints/${sprintId}/board`)).data,
  })

  const moveTask = useMutation({
    mutationFn: ({ taskId, columnId, position }: { taskId: string; columnId: string; position: number }) =>
      api.post(`/api/projects/${projectId}/tasks/${taskId}/move`, { column_id: columnId, position }),
    onError: (e: any) => { toast.error(e?.response?.data?.detail || 'Erreur lors du déplacement'); qc.invalidateQueries({ queryKey: ['sprint-board', projectId, sprintId] }) },
  })

  const createTask = useMutation({
    mutationFn: ({ title, columnId }: { title: string; columnId: string }) =>
      api.post(`/api/projects/${projectId}/tasks`, { title, column_id: columnId, priority: 'medium' }),
    onSuccess: async ({ data: task }) => {
      await api.post(`/api/projects/${projectId}/sprints/${sprintId}/tasks/${task.id}`)
      qc.invalidateQueries({ queryKey: ['sprint-board', projectId, sprintId] })
      setAddingToColumn(null)
      setNewTaskTitle('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const tasksByColumn = useMemo(() => {
    if (!board) return {}
    return board.tasks.reduce<Record<string, Task[]>>((acc, task) => {
      const colId = task.column_id ?? '__unassigned'
      acc[colId] = [...(acc[colId] ?? []), task]
      return acc
    }, {})
  }, [board])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function computeNewPosition(columnId: string, overTaskId: string | null): number {
    const colTasks = (tasksByColumn[columnId] ?? []).sort((a, b) => a.position - b.position)
    if (!overTaskId || colTasks.length === 0) return (colTasks[colTasks.length - 1]?.position ?? 0) + 1
    const overIdx = colTasks.findIndex((t) => t.id === overTaskId)
    if (overIdx === -1) return (colTasks[colTasks.length - 1]?.position ?? 0) + 1
    const before = colTasks[overIdx - 1]?.position ?? (colTasks[overIdx].position - 2)
    return (before + colTasks[overIdx].position) / 2
  }

  function onDragStart(event: DragStartEvent) {
    const task = board?.tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over || !board) return
    const draggedTask = board.tasks.find((t) => t.id === active.id)
    if (!draggedTask) return
    let targetColumnId = over.id as string
    const overTask = board.tasks.find((t) => t.id === over.id)
    if (overTask) targetColumnId = overTask.column_id ?? draggedTask.column_id!
    if (!board.columns.find((c) => c.id === targetColumnId)) return
    const newPosition = computeNewPosition(targetColumnId, overTask?.id ?? null)
    qc.setQueryData<SprintBoardResponse>(['sprint-board', projectId, sprintId], (prev) => {
      if (!prev) return prev
      return { ...prev, tasks: prev.tasks.map((t) => t.id === draggedTask.id ? { ...t, column_id: targetColumnId, position: newPosition } : t) }
    })
    moveTask.mutate({ taskId: draggedTask.id, columnId: targetColumnId, position: newPosition })
  }

  if (isLoading) return <div className="p-6 text-[13px] text-muted-foreground">Chargement…</div>
  if (!board) return null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-2 border-b border-border/40 bg-muted/20 shrink-0">
        <Link href={`/projects/${projectId}/sprints`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-6 w-6')}>
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        <p className="text-[13px] font-semibold">{board.sprint.name}</p>
        {board.sprint.goal && <p className="text-[12px] text-muted-foreground">— {board.sprint.goal}</p>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 items-start">
            {board.columns.map((column) => (
              <div key={column.id}>
                <DroppableColumn
                  column={column as Column}
                  tasks={tasksByColumn[column.id] ?? []}
                  onAddTask={() => { setAddingToColumn(column.id); setNewTaskTitle('') }}
                  onTaskClick={setSelectedTask}
                />
                {addingToColumn === column.id && (
                  <div className="mt-1.5 px-1.5">
                    <div className="rounded-lg border border-border/60 bg-card p-2 space-y-2">
                      <Input autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Titre…" className="h-7 text-[13px] border-border/50"
                        onKeyDown={(e) => { if (e.key === 'Enter' && newTaskTitle.trim()) createTask.mutate({ title: newTaskTitle.trim(), columnId: column.id }); if (e.key === 'Escape') setAddingToColumn(null) }} />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 text-[12px] px-2" onClick={() => newTaskTitle.trim() && createTask.mutate({ title: newTaskTitle.trim(), columnId: column.id })} disabled={!newTaskTitle.trim() || createTask.isPending}>Ajouter</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[12px] px-2" onClick={() => setAddingToColumn(null)}>Annuler</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DragOverlay>{activeTask && <TaskCard task={activeTask} onClick={() => {}} overlay />}</DragOverlay>
        </DndContext>
      </div>

      <TaskDialog task={selectedTask} projectId={projectId} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  )
}
