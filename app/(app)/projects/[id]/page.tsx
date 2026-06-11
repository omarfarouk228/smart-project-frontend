'use client'

import { useState, useMemo } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import api from '@/lib/api'
import type { BoardResponse, Column } from '@/types/project'
import type { Task } from '@/types/task'
import { TaskCard } from '@/components/kanban/TaskCard'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { useProjectSocket } from '@/hooks/useProjectSocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function DroppableColumn({ column, tasks, onAddTask, onTaskClick }: {
  column: Column
  tasks: Task[]
  onAddTask: () => void
  onTaskClick: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position)

  return (
    <div className="flex flex-col w-[270px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <div className="h-2 w-2 rounded-full shrink-0" style={{ background: column.color }} />
        <p className="text-[12px] font-semibold text-foreground uppercase tracking-wider flex-1 truncate">
          {column.name}
        </p>
        <span className="text-[11px] text-muted-foreground tabular-nums">{tasks.length}</span>
        <button
          onClick={onAddTask}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards drop area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] rounded-xl transition-colors p-1.5 space-y-1.5',
          isOver ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-muted/30'
        )}
      >
        <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-[11px] text-muted-foreground/40">Aucune tâche</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const qc = useQueryClient()

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [overId, setOverId] = useState<string | null>(null)

  useProjectSocket(projectId)

  const { data: board, isLoading } = useQuery<BoardResponse>({
    queryKey: ['board', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/board`)).data,
  })

  const moveTask = useMutation({
    mutationFn: ({ taskId, columnId, position }: { taskId: string; columnId: string; position: number }) =>
      api.post(`/api/projects/${projectId}/tasks/${taskId}/move`, { column_id: columnId, position }),
    onError: (e: any) => {
      toast.error(e?.response?.data?.detail || 'Erreur lors du déplacement')
      qc.invalidateQueries({ queryKey: ['board', projectId] })
    },
  })

  const createTask = useMutation({
    mutationFn: ({ title, columnId }: { title: string; columnId: string }) =>
      api.post(`/api/projects/${projectId}/tasks`, {
        title,
        column_id: columnId,
        priority: 'medium',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      setAddingToColumn(null)
      setNewTaskTitle('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur lors de la création'),
  })

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    if (!board) return {}
    return board.tasks.reduce<Record<string, Task[]>>((acc, task) => {
      const colId = task.column_id ?? '__unassigned'
      acc[colId] = [...(acc[colId] ?? []), task]
      return acc
    }, {})
  }, [board])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const computeNewPosition = (tasks: Task[], overTaskId: string | null, columnId: string): number => {
    const colTasks = (tasksByColumn[columnId] ?? []).sort((a, b) => a.position - b.position)
    if (!overTaskId || colTasks.length === 0) {
      const max = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.position)) : 0
      return max + 1
    }
    const overIdx = colTasks.findIndex((t) => t.id === overTaskId)
    if (overIdx === -1) return (colTasks[colTasks.length - 1]?.position ?? 0) + 1
    const before = colTasks[overIdx - 1]?.position ?? (colTasks[overIdx].position - 2)
    return (before + colTasks[overIdx].position) / 2
  }

  function onDragStart(event: DragStartEvent) {
    const task = board?.tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  function onDragOver(event: DragOverEvent) {
    setOverId(event.over?.id as string | null)
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    setOverId(null)

    if (!over || !board) return

    const draggedTask = board.tasks.find((t) => t.id === active.id)
    if (!draggedTask) return

    // Determine target column: over could be a column or a task
    let targetColumnId = over.id as string
    const overTask = board.tasks.find((t) => t.id === over.id)
    if (overTask) targetColumnId = overTask.column_id ?? draggedTask.column_id!

    // Verify target column exists
    const columnExists = board.columns.find((c) => c.id === targetColumnId)
    if (!columnExists) return

    const newPosition = computeNewPosition(
      tasksByColumn[targetColumnId] ?? [],
      overTask?.id ?? null,
      targetColumnId
    )

    // Optimistic update
    qc.setQueryData<BoardResponse>(['board', projectId], (prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === draggedTask.id ? { ...t, column_id: targetColumnId, position: newPosition } : t
        ),
      }
    })

    moveTask.mutate({ taskId: draggedTask.id, columnId: targetColumnId, position: newPosition })
  }

  const handleAddTask = (columnId: string) => {
    setAddingToColumn(columnId)
    setNewTaskTitle('')
  }

  const handleCreateTask = () => {
    if (!newTaskTitle.trim() || !addingToColumn) return
    createTask.mutate({ title: newTaskTitle.trim(), columnId: addingToColumn })
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  if (isLoading) {
    return <div className="p-8 text-[13px] text-muted-foreground">Chargement du tableau…</div>
  }

  if (!board) return null

  return (
    <div className="flex flex-col h-full">
      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            {board.columns.map((column) => (
              <div key={column.id} className="flex flex-col gap-0">
                <DroppableColumn
                  column={column}
                  tasks={tasksByColumn[column.id] ?? []}
                  onAddTask={() => handleAddTask(column.id)}
                  onTaskClick={handleTaskClick}
                />
                {/* Inline add task */}
                {addingToColumn === column.id && (
                  <div className="mt-1.5 px-1.5">
                    <div className="rounded-lg border border-border/60 bg-card p-2 space-y-2">
                      <Input
                        autoFocus
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Titre de la tâche…"
                        className="h-7 text-[13px] border-border/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateTask()
                          if (e.key === 'Escape') setAddingToColumn(null)
                        }}
                      />
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-6 text-[12px] px-2"
                          onClick={handleCreateTask}
                          disabled={createTask.isPending || !newTaskTitle.trim()}
                        >
                          Ajouter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[12px] px-2"
                          onClick={() => setAddingToColumn(null)}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard task={activeTask} onClick={() => {}} overlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail dialog */}
      <TaskDialog
        task={selectedTask}
        projectId={projectId}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setSelectedTask(null)
        }}
      />
    </div>
  )
}
