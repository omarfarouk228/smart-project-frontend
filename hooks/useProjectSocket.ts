import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Task } from '@/types/task'

type WsEvent =
  | { type: 'task:created'; task: Task }
  | { type: 'task:updated'; task: Task }
  | { type: 'task:moved'; task_id: string; column_id: string; position: number }
  | { type: 'task:deleted'; task_id: string }

export function useProjectSocket(projectId: string) {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('st_access_token')
    if (!token || !projectId) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    const wsUrl = apiUrl.replace(/^http/, 'ws') + `/api/ws/${projectId}?token=${token}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (evt) => {
      try {
        const event: WsEvent = JSON.parse(evt.data)
        qc.setQueryData<{ columns: any[]; tasks: Task[] }>(['board', projectId], (prev) => {
          if (!prev) return prev

          switch (event.type) {
            case 'task:created':
              return { ...prev, tasks: [...prev.tasks, event.task] }

            case 'task:updated':
              return {
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === event.task.id ? event.task : t)),
              }

            case 'task:moved':
              return {
                ...prev,
                tasks: prev.tasks.map((t) =>
                  t.id === event.task_id
                    ? { ...t, column_id: event.column_id, position: event.position }
                    : t
                ),
              }

            case 'task:deleted':
              return {
                ...prev,
                tasks: prev.tasks.filter((t) => t.id !== event.task_id),
              }

            default:
              return prev
          }
        })
      } catch {}
    }

    ws.onerror = () => {}

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [projectId, qc])
}
