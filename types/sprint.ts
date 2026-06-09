import type { Task } from './task'

export type SprintStatus = 'planning' | 'active' | 'completed'

export interface Sprint {
  id: string
  project_id: string
  name: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: SprintStatus
  task_count: number
  created_at: string
}

export interface BacklogResponse {
  tasks: Task[]
  sprints: Sprint[]
}

export interface SprintBoardResponse {
  sprint: Sprint
  columns: { id: string; name: string; color: string; position: number; is_done_column: boolean }[]
  tasks: Task[]
}
