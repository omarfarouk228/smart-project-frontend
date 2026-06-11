import type { Task } from './task'

export interface Column {
  id: string
  name: string
  color: string
  position: number
  is_done_column: boolean
}

export interface Project {
  id: string
  name: string
  description: string | null
  key: string
  color: string
  owner_id: string
  member_count: number
  created_at: string
  columns: Column[]
  my_role?: 'owner' | 'member' | 'viewer' | null
}

export interface ProjectListResponse {
  items: Project[]
  total: number
}

export interface ProjectMember {
  id: string
  user: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    avatar_path: string | null
  }
  role: 'owner' | 'member' | 'viewer'
  joined_at: string
}

export interface BoardResponse {
  columns: Column[]
  tasks: Task[]
}

export interface ColumnStat {
  column_id: string
  column_name: string
  color: string
  task_count: number
  is_done_column: boolean
}

export interface PriorityStat {
  priority: string
  count: number
}

export interface MemberWorkload {
  user_id: string
  full_name: string
  avatar_path: string | null
  task_count: number
  done_count: number
}

export interface SprintStat {
  sprint_id: string
  sprint_name: string
  status: string
  total_tasks: number
  done_tasks: number
}

export interface ProjectAnalytics {
  total_tasks: number
  overdue_tasks: number
  done_tasks: number
  by_column: ColumnStat[]
  by_priority: PriorityStat[]
  member_workload: MemberWorkload[]
  sprint_stats: SprintStat[]
}

export interface AuditLogEntry {
  id: string
  project_id: string
  user: { id: string; first_name: string; last_name: string; full_name: string } | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  details: Record<string, unknown> | null
  created_at: string
}
