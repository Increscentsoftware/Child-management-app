import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SocialWorker } from '@/types'
import { supabase } from '@/lib/supabase'

interface AppState {
  user: SocialWorker | null
  isOnline: boolean
  pendingSync: number
  setUser: (user: SocialWorker | null) => void
  setIsOnline: (v: boolean) => void
  setPendingSync: (n: number) => void
  logout: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isOnline: navigator.onLine,
      pendingSync: 0,
      setUser: (user) => set({ user }),
      setIsOnline: (isOnline) => set({ isOnline }),
      setPendingSync: (pendingSync) => set({ pendingSync }),
      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null })
      }
    }),
    { name: 'shishu-app-store' }
  )
)
