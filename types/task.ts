export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface UserBasic {
  id: string
  first_name: string
  last_name: string
  full_name: string
  avatar_path: string | null
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface SubTask {
  id: string
  title: string
  is_done: boolean
  position: number
  created_at: string
}

export interface Comment {
  id: string
  task_id: string
  user: UserBasic
  content: string
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  user: UserBasic
  minutes: number
  description: string | null
  logged_at: string
}

export interface Attachment {
  id: string
  task_id: string
  uploader: UserBasic
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  column_id: string | null
  title: string
  description: string | null
  assignee: UserBasic | null
  reporter: UserBasic
  priority: Priority
  position: number
  start_date: string | null
  due_date: string | null
  estimated_minutes: number | null
  logged_minutes: number
  labels: Label[]
  subtask_count: number
  subtask_done_count: number
  comment_count: number
  attachment_count: number
  created_at: string
  updated_at: string
}

export interface TaskDetail extends Task {
  subtasks: SubTask[]
  comments: Comment[]
  time_entries: TimeEntry[]
  attachments: Attachment[]
}
