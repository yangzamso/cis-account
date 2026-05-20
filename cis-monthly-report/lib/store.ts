import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChurchStore {
  churchId: number | null
  year: number
  month: number | null   // null = 전체
  setChurchId: (id: number) => void
  setYear: (y: number) => void
  setMonth: (m: number | null) => void
}

const now = new Date()

export const useChurchStore = create<ChurchStore>()(
  persist(
    (set) => ({
      churchId: null,
      year: now.getFullYear(),
      month: null,
      setChurchId: (id) => set({ churchId: id }),
      setYear: (y) => set({ year: y }),
      setMonth: (m) => set({ month: m }),
    }),
    { name: 'cis-church-store' }
  )
)
