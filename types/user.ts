import type { RoleBasic } from './role'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar_path: string | null
  is_active: boolean
  is_superadmin: boolean
  must_change_password: boolean
  last_login: string | null
  created_at: string
  roles: RoleBasic[]
}

export interface UserListResponse {
  items: User[]
  total: number
  page: number
  page_size: number
}
