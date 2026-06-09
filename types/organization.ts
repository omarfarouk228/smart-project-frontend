export interface Organization {
  id: string
  name: string
  app_name: string
  logo_path: string | null
  favicon_path: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  default_theme: string
  setup_completed: boolean
}
