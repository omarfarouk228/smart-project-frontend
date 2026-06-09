export interface Permission {
  id: string
  codename: string
  name: string
  description: string | null
  category: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  color: string
  is_system: boolean
  created_at: string
  permissions: Permission[]
}

export interface RoleBasic {
  id: string
  name: string
  color: string
}

export interface RoleListResponse {
  items: Role[]
  total: number
}
