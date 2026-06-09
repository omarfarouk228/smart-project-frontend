'use client'

import { use, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import type { Task } from '@/types/task'
import type { BoardResponse } from '@/types/project'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildCalendarGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  // Monday = 0 offset
  const startOffset = (first.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - startOffset)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }
  return days
}

export default function CalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: board } = useQuery<BoardResponse>({
    queryKey: ['board', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/board`)).data,
  })

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    board?.tasks.forEach((t) => {
      if (!t.due_date) return
      const key = t.due_date.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [board?.tasks])

  const days = useMemo(() => buildCalendarGrid(year, month), [year, month])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const todayStr = toISO(today)

  const openTask = (task: Task) => {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <h2 className="text-[14px] font-semibold w-40 text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }}
          className="text-[12px] text-muted-foreground hover:text-foreground border border-border/60 px-3 py-1 rounded-md transition-colors"
        >
          Aujourd'hui
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border/40 shrink-0">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 grid-rows-6 flex-1 overflow-hidden">
          {days.map((day) => {
            const key = toISO(day)
            const tasks = tasksByDate[key] ?? []
            const isCurrentMonth = day.getMonth() === month
            const isToday = key === todayStr
            const isFuture = day > today

            return (
              <div
                key={key}
                className={cn(
                  'border-b border-r border-border/30 p-1.5 overflow-hidden flex flex-col',
                  !isCurrentMonth && 'bg-muted/20',
                  isToday && 'bg-primary/[0.04]'
                )}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-[12px] font-medium inline-flex h-6 w-6 items-center justify-center rounded-full',
                      isToday
                        ? 'bg-primary text-white font-semibold'
                        : isCurrentMonth
                          ? 'text-foreground/80'
                          : 'text-muted-foreground/40'
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-0.5 flex-1 overflow-hidden">
                  {tasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => openTask(task)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate font-medium transition-opacity hover:opacity-80"
                      style={{
                        background: PRIORITY_COLORS[task.priority] + '22',
                        color: PRIORITY_COLORS[task.priority],
                        borderLeft: `2px solid ${PRIORITY_COLORS[task.priority]}`,
                      }}
                    >
                      {task.title}
                    </button>
                  ))}
                  {tasks.length > 3 && (
                    <p className="text-[10px] text-muted-foreground/50 px-1">
                      +{tasks.length - 3} autre{tasks.length - 3 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskDialog
        task={selectedTask}
        projectId={projectId}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedTask(null) }}
      />
    </div>
  )
}
