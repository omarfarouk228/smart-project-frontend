import { create } from 'zustand'
import type { Organization } from '@/types/organization'

interface OrgState {
  org: Organization | null
  setOrg: (org: Organization) => void
}

export const useOrgStore = create<OrgState>((set) => ({
  org: null,
  setOrg: (org) => set({ org }),
}))
