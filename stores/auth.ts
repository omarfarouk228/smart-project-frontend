import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/user'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  _hydrated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  clearAuth: () => void
  hasPermission: (codename: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      _hydrated: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('st_access_token', accessToken)
        localStorage.setItem('st_refresh_token', refreshToken)
        set({ user, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      clearAuth: () => {
        localStorage.removeItem('st_access_token')
        localStorage.removeItem('st_refresh_token')
        set({ user: null, isAuthenticated: false })
      },

      hasPermission: (codename) => {
        const { user } = get()
        if (!user) return false
        if (user.is_superadmin) return true
        return user.permissions.includes(codename)
      },
    }),
    {
      name: 'projecteyes-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true
      },
    }
  )
)
