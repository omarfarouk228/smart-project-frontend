'use client'

import { use, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ChevronDown } from 'lucide-react'
import api from '@/lib/api'
import type { Task } from '@/types/task'
import type { BoardResponse, Column } from '@/types/project'
import { TaskDialog } from '@/components/kanban/TaskDialog'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f97316',
  urgent: '#ef4444',
}

const TASK_NAME_W = 220 // px — fixed left column width
const MONTH_COL_W = 140 // px — width per month in "months" zoom
const WEEK_COL_W = 80  // px — width per week in "weeks" zoom
const ROW_H = 36       // px — row height

// ─── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function prevMonday(d: Date): Date {
  const r = startOfDay(d)
  const dow = (r.getDay() + 6) % 7 // Mon=0
  r.setDate(r.getDate() - dow)
  return r
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function formatWeek(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ─── Column generation ────────────────────────────────────────────────────────

interface TimeCol {
  label: string
  start: Date
  days: number
}

function buildMonthCols(rangeStart: Date, rangeEnd: Date): TimeCol[] {
  const cols: TimeCol[] = []
  let d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  while (d <= rangeEnd) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    cols.push({
      label: formatMonth(d),
      start: new Date(d),
      days: diffDays(d, next),
    })
    d = next
  }
  return cols
}

function buildWeekCols(rangeStart: Date, rangeEnd: Date): TimeCol[] {
  const cols: TimeCol[] = []
  let d = prevMonday(rangeStart)
  while (d <= rangeEnd) {
    const next = addDays(d, 7)
    cols.push({ label: formatWeek(d), start: new Date(d), days: 7 })
    d = next
  }
  return cols
}

// ─── Bar computation ──────────────────────────────────────────────────────────

function getTaskBar(
  task: Task,
  rangeStart: Date,
  totalDays: number,
  totalWidth: number
): { left: number; width: number } | null {
  const rawStart = task.start_date
    ? startOfDay(new Date(task.start_date))
    : startOfDay(new Date(task.created_at))
  const rawEnd = task.due_date
    ? startOfDay(new Date(task.due_date))
    : null

  if (!rawEnd) return null // skip tasks with no due_date

  const startOff = Math.max(0, diffDays(rangeStart, rawStart))
  const endOff = Math.max(startOff + 1, diffDays(rangeStart, rawEnd) + 1)

  const pxPerDay = totalWidth / totalDays
  return {
    left: startOff * pxPerDay,
    width: Math.max(8, (endOff - startOff) * pxPerDay),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [zoom, setZoom] = useState<'months' | 'weeks'>('months')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: board } = useQuery<BoardResponse>({
    queryKey: ['board', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/board`)).data,
  })

  const tasksWithDates = useMemo(
    () => (board?.tasks ?? []).filter((t) => !!t.due_date),
    [board?.tasks]
  )

  const today = useMemo(() => startOfDay(new Date()), [])

  // Date range — pad 2 weeks on each side
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      return {
        rangeStart: addDays(today, -14),
        rangeEnd: addDays(today, 90),
      }
    }
    const starts = tasksWithDates.map((t) =>
      startOfDay(new Date(t.start_date ?? t.created_at))
    )
    const ends = tasksWithDates.map((t) => startOfDay(new Date(t.due_date!)))
    const min = starts.reduce((a, b) => (a < b ? a : b))
    const max = ends.reduce((a, b) => (a > b ? a : b))
    return {
      rangeStart: addDays(min, -14),
      rangeEnd: addDays(max, 14),
    }
  }, [tasksWithDates, today])

  const totalDays = diffDays(rangeStart, rangeEnd)
  const colW = zoom === 'months' ? MONTH_COL_W : WEEK_COL_W
  const timeCols = useMemo(
    () => (zoom === 'months' ? buildMonthCols(rangeStart, rangeEnd) : buildWeekCols(rangeStart, rangeEnd)),
    [zoom, rangeStart, rangeEnd]
  )

  // Total timeline width in px
  const timelineW = useMemo(
    () => timeCols.reduce((acc, c) => acc + (c.days / 7) * (zoom === 'weeks' ? WEEK_COL_W : (c.days / 30) * MONTH_COL_W), 0),
    [timeCols, zoom]
  )

  // Actually, simpler: compute totalWidth based on totalDays
  const pxPerDay = zoom === 'months' ? MONTH_COL_W / 30 : WEEK_COL_W / 7
  const totalWidth = totalDays * pxPerDay

  // Today marker position
  const todayX = Math.max(0, diffDays(rangeStart, today)) * pxPerDay

  // Group tasks by column
  const columns = board?.columns ?? []
  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {}
    columns.forEach((c) => { map[c.id] = [] })
    tasksWithDates.forEach((t) => {
      if (t.column_id && map[t.column_id]) map[t.column_id].push(t)
    })
    return map
  }, [columns, tasksWithDates])

  const openTask = (task: Task) => {
    setSelectedTask(task)
    setDialogOpen(true)
  }

  const toggleCollapse = (colId: string) =>
    setCollapsed((prev) => ({ ...prev, [colId]: !prev[colId] }))

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (tasksWithDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <p className="text-[14px]">Aucune tâche avec une date d'échéance.</p>
        <p className="text-[12px] text-muted-foreground/60">
          Ajoutez des échéances sur vos tâches pour les voir ici.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border/50 shrink-0">
        <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
          <button
            onClick={() => setZoom('months')}
            className={cn(
              'px-3 py-1 text-[12px] font-medium transition-colors',
              zoom === 'months' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Mois
          </button>
          <button
            onClick={() => setZoom('weeks')}
            className={cn(
              'px-3 py-1 text-[12px] font-medium transition-colors border-l border-border/60',
              zoom === 'weeks' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Semaines
          </button>
        </div>

        {/* Priority legend */}
        <div className="flex items-center gap-3 ml-2">
          {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
            <div key={p} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm" style={{ background: c }} />
              <span className="text-[11px] text-muted-foreground capitalize">{p === 'low' ? 'Faible' : p === 'medium' ? 'Moyenne' : p === 'high' ? 'Haute' : 'Urgente'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="flex" style={{ minWidth: TASK_NAME_W + totalWidth }}>

          {/* ── Left: task names (sticky) ──────────────────────────── */}
          <div
            className="shrink-0 sticky left-0 z-20 bg-background border-r border-border/50"
            style={{ width: TASK_NAME_W }}
          >
            {/* Header */}
            <div
              className="flex items-center px-3 border-b border-border/40 text-[11px] font-semibold text-muted-foreground"
              style={{ height: ROW_H }}
            >
              Tâche
            </div>

            {/* Rows */}
            {columns.map((col) => {
              const colTasks = tasksByColumn[col.id] ?? []
              const isCollapsed = collapsed[col.id]
              return (
                <div key={col.id}>
                  {/* Column group header */}
                  <div
                    className="flex items-center gap-1.5 px-3 border-b border-border/30 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{ height: ROW_H }}
                    onClick={() => toggleCollapse(col.id)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: col.color }}
                    />
                    <span className="text-[12px] font-medium truncate">{col.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task rows */}
                  {!isCollapsed &&
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center px-3 gap-2 border-b border-border/20 hover:bg-muted/20 cursor-pointer transition-colors"
                        style={{ height: ROW_H }}
                        onClick={() => openTask(task)}
                      >
                        <div
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ background: PRIORITY_COLORS[task.priority] }}
                        />
                        <span className="text-[12px] truncate">{task.title}</span>
                      </div>
                    ))}
                </div>
              )
            })}
          </div>

          {/* ── Right: timeline ────────────────────────────────────── */}
          <div className="flex-1 relative" style={{ minWidth: totalWidth }}>
            {/* Time header */}
            <div
              className="flex border-b border-border/40 sticky top-0 z-10 bg-background"
              style={{ height: ROW_H }}
            >
              {timeCols.map((col, i) => {
                const w = col.days * pxPerDay
                return (
                  <div
                    key={i}
                    className="shrink-0 flex items-center justify-center border-r border-border/20 text-[11px] text-muted-foreground font-medium"
                    style={{ width: w }}
                  >
                    {col.label}
                  </div>
                )
              })}
            </div>

            {/* Today vertical marker */}
            {todayX >= 0 && todayX <= totalWidth && (
              <div
                className="absolute top-0 bottom-0 w-px bg-primary/60 z-10 pointer-events-none"
                style={{ left: todayX }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1 py-0.5 rounded-b-sm leading-none">
                  Auj
                </div>
              </div>
            )}

            {/* Column group rows */}
            {columns.map((col) => {
              const colTasks = tasksByColumn[col.id] ?? []
              const isCollapsed = collapsed[col.id]
              return (
                <div key={col.id}>
                  {/* Group header row (empty, just height) */}
                  <div
                    className="border-b border-border/30 bg-muted/30"
                    style={{ height: ROW_H }}
                  />

                  {/* Task bar rows */}
                  {!isCollapsed &&
                    colTasks.map((task) => {
                      const bar = getTaskBar(task, rangeStart, totalDays, totalWidth)
                      return (
                        <div
                          key={task.id}
                          className="relative border-b border-border/20"
                          style={{ height: ROW_H }}
                        >
                          {bar && (
                            <button
                              onClick={() => openTask(task)}
                              className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md flex items-center px-2 text-[11px] font-medium text-white truncate transition-opacity hover:opacity-80"
                              style={{
                                left: bar.left,
                                width: bar.width,
                                background: PRIORITY_COLORS[task.priority],
                                minWidth: 8,
                              }}
                              title={task.title}
                            >
                              {bar.width > 40 && task.title}
                            </button>
                          )}
                        </div>
                      )
                    })}
                </div>
              )
            })}

            {/* Background grid lines */}
            <div className="absolute inset-0 top-[36px] pointer-events-none flex" style={{ zIndex: -1 }}>
              {timeCols.map((col, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r border-border/15"
                  style={{ width: col.days * pxPerDay }}
                />
              ))}
            </div>
          </div>
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
