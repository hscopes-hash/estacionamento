'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Usuario {
  id: string
  empresaId: string
  nome: string
  email: string
  nivel: 'ADMIN' | 'GERENTE' | 'OPERADOR'
  telefone?: string
  foto?: string
}

export interface Empresa {
  id: string
  nome: string
  cnpj: string
  email: string
  telefone?: string
  endereco?: string
  cidade?: string
  estado?: string
  plano: string
  dataFimTrial?: string
}

export interface Estacionamento {
  id: string
  empresaId: string
  nome: string
  descricao?: string
  endereco?: string
  totalVagas: number
  tipo: 'FIXO' | 'EVENTO'
  valorHora: number
  valorFracao: number
  toleranciaMinutos: number
}

interface AuthState {
  usuario: Usuario | null
  empresa: Empresa | null
  estacionamentoAtual: Estacionamento | null
  token: string | null
  isDemo: boolean
  demoExpiraEm: string | null
  
  setAuth: (usuario: Usuario, empresa: Empresa, token: string) => void
  setEstacionamentoAtual: (estacionamento: Estacionamento | null) => void
  setDemo: (expiraEm: string) => void
  logout: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  isGerente: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      empresa: null,
      estacionamentoAtual: null,
      token: null,
      isDemo: false,
      demoExpiraEm: null,

      setAuth: (usuario, empresa, token) => {
        set({ 
          usuario, 
          empresa, 
          token, 
          isDemo: false,
          demoExpiraEm: null 
        })
      },

      setEstacionamentoAtual: (estacionamento) => {
        set({ estacionamentoAtual: estacionamento })
      },

      setDemo: (expiraEm) => {
        set({ isDemo: true, demoExpiraEm: expiraEm })
      },

      logout: () => {
        set({ 
          usuario: null, 
          empresa: null, 
          estacionamentoAtual: null,
          token: null, 
          isDemo: false,
          demoExpiraEm: null 
        })
      },

      isAuthenticated: () => {
        const state = get()
        return !!state.usuario && !!state.token
      },

      isAdmin: () => {
        const state = get()
        return state.usuario?.nivel === 'ADMIN'
      },

      isGerente: () => {
        const state = get()
        return state.usuario?.nivel === 'GERENTE' || state.usuario?.nivel === 'ADMIN'
      },
    }),
    {
      name: 'parking-auth-storage',
    }
  )
)
