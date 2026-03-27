import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  nome: string
  nivel: string
  empresaId: string
  empresa?: {
    id: string
    nome: string
    plano: string
    dataFimTrial: string | null
  }
}

interface AuthState {
  user: User | null
  token: string | null
  selectedParkingLot: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  setSelectedParkingLot: (id: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      selectedParkingLot: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, selectedParkingLot: null }),
      setSelectedParkingLot: (id) => set({ selectedParkingLot: id }),
    }),
    {
      name: 'parking-auth',
    }
  )
)
