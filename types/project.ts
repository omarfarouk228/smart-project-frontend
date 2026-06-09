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
  role: 'owner' | 'member'
  joined_at: string
}

export interface BoardResponse {
  columns: Column[]
  tasks: Task[]
}
