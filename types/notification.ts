export type NotificationType = 'mention' | 'assigned'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  task_id: string | null
  is_read: boolean
  created_at: string
}

export interface UnreadCountResponse {
  count: number
}
