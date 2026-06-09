'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, AlertCircle, CheckSquare, MessageSquare } from 'lucide-react'
import type { Task, Priority } from '@/types/task'
import { cn } from '@/lib/utils'

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  low: { color: 'bg-slate-400', label: 'Faible' },
  medium: { color: 'bg-blue-400', label: 'Moyenne' },
  high: { color: 'bg-orange-400', label: 'Haute' },
  urgent: { color: 'bg-red-500', label: 'Urgente' },
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'from-violet-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  const sz = size === 'xs' ? 'h-5 w-5 text-[8px]' : 'h-6 w-6 text-[9px]'
  return (
    <div
      className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {initials}
    </div>
  )
}

function isOverdue(date: string) {
  return new Date(date) < new Date()
}

interface TaskCardProps {
  task: Task
  onClick: () => void
  overlay?: boolean
}

export function TaskCard({ task, onClick, overlay = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = PRIORITY_CONFIG[task.priority]
  const overdue = task.due_date && isOverdue(task.due_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-lg border bg-card px-3 py-2.5 cursor-pointer select-none transition-shadow',
        isDragging || overlay
          ? 'opacity-50 shadow-xl ring-1 ring-primary/30'
          : 'border-border/60 hover:border-border hover:shadow-sm'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {/* Priority bar */}
      <div className={`absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full ${priority.color} ml-[-1px]`} />

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${label.color}22`, color: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] font-medium text-foreground leading-snug pr-1">{task.title}</p>

      {/* Subtask progress bar */}
      {task.subtask_count > 0 && (
        <div className="mt-2 space-y-0.5">
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full"
              style={{ width: `${Math.round((task.subtask_done_count / task.subtask_count) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2">
        {task.due_date && (
          <span
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium',
              overdue ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {overdue && <AlertCircle className="h-3 w-3" />}
            <CalendarDays className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {task.subtask_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <CheckSquare className="h-3 w-3" />
              {task.subtask_done_count}/{task.subtask_count}
            </span>
          )}
          {task.comment_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task.comment_count}
            </span>
          )}
          {task.assignee && <Avatar name={task.assignee.full_name} size="xs" />}
        </div>
      </div>
    </div>
  )
}
