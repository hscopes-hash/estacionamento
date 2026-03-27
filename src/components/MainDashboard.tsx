'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Car, LogOut, Settings, Users, Building2, MapPin, 
  Menu, X, Clock, TrendingUp, AlertCircle
} from 'lucide-react'
import { ParkingGrid } from '@/components/ParkingGrid'
import { CrudModal } from '@/components/CrudModal'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'

interface Estacionamento {
  id: string
  nome: string
  totalVagas: number
  tipo: string
  valorHora: number
  vagasOcupadas?: number
  vagasDisponiveis?: number
}

interface Vaga {
  id: string
  numero: string
  status: string
  setor?: string
  tipo?: string
  movimentacaoAtiva?: {
    id: string
    placa: string
    clienteNome: string
    dataEntrada: string
  } | null
}

export function MainDashboard() {
  const { usuario, empresa, token, logout, estacionamentoAtual, setEstacionamentoAtual, isDemo, demoExpiraEm } = useAuthStore()
  const [estacionamentos, setEstacionamentos] = useState<Estacionamento[]>([])
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [crudModal, setCrudModal] = useState<{ open: boolean; type: string }>({ 
    open: false, 
    type: '' 
  })

  useEffect(() => {
    const fetchEstacionamentos = async () => {
      try {
        const response = await fetch('/api/estacionamentos', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-id': empresa?.id || ''
          }
        })
        const data = await response.json()
        setEstacionamentos(data)

        if (data.length > 0) {
          const ultimoId = localStorage.getItem('ultimo-estacionamento-id')
          const ultimo = data.find((e: Estacionamento) => e.id === ultimoId) || data[0]
          setEstacionamentoAtual(ultimo)
        }
      } catch (error) {
        console.error('Erro ao carregar estacionamentos:', error)
      }
    }

    if (empresa?.id) {
      fetchEstacionamentos()
    }
  }, [empresa?.id, token, setEstacionamentoAtual])

  useEffect(() => {
    const fetchVagas = async () => {
      if (!estacionamentoAtual?.id) return

      setLoading(true)
      try {
        const response = await fetch(`/api/vagas?estacionamentoId=${estacionamentoAtual.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-empresa-id': empresa?.id || ''
          }
        })
        const data = await response.json()
        setVagas(data)
      } catch (error) {
        console.error('Erro ao carregar vagas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVagas()
    const interval = setInterval(fetchVagas, 30000)
    return () => clearInterval(interval)
  }, [estacionamentoAtual?.id, token, empresa?.id])

  useEffect(() => {
    if (estacionamentoAtual?.id) {
      localStorage.setItem('ultimo-estacionamento-id', estacionamentoAtual.id)
    }
  }, [estacionamentoAtual?.id])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
    logout()
  }

  const vagasOcupadas = vagas.filter(v => v.status === 'OCUPADA').length
  const vagasDisponiveis = vagas.filter(v => v.status === 'DISPONIVEL').length

  const diasRestantesDemo = demoExpiraEm 
    ? Math.ceil((new Date(demoExpiraEm).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-400"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">Parking Control</h1>
                <p className="text-xs text-slate-400">{empresa?.nome}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select
              value={estacionamentoAtual?.id || ''}
              onValueChange={(value) => {
                const est = estacionamentos.find(e => e.id === value)
                if (est) setEstacionamentoAtual(est)
              }}
            >
              <SelectTrigger className="w-[200px] bg-slate-900/50 border-slate-600 text-white">
                <MapPin className="w-4 h-4 mr-2 text-emerald-500" />
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {estacionamentos.map((est) => (
                  <SelectItem key={est.id} value={est.id} className="text-white hover:bg-slate-700">
                    {est.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{usuario?.nome}</p>
                <p className="text-xs text-slate-400">{usuario?.nivel}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-16 lg:pt-0
        `}>
          <nav className="p-4 space-y-2">
            {usuario?.nivel === 'ADMIN' && (
              <>
                <button
                  onClick={() => { setCrudModal({ open: true, type: 'empresas' }); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <Building2 className="w-5 h-5" />
                  Empresas
                </button>
                <button
                  onClick={() => { setCrudModal({ open: true, type: 'usuarios' }); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <Users className="w-5 h-5" />
                  Usuários
                </button>
              </>
            )}
            {(usuario?.nivel === 'ADMIN' || usuario?.nivel === 'GERENTE') && (
              <>
                <button
                  onClick={() => { setCrudModal({ open: true, type: 'clientes' }); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <Users className="w-5 h-5" />
                  Clientes
                </button>
                <button
                  onClick={() => { setCrudModal({ open: true, type: 'estacionamentos' }); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  Estacionamentos
                </button>
              </>
            )}
            <button
              onClick={() => { setCrudModal({ open: true, type: 'configuracoes' }); setSidebarOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
              Configurações
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-4 lg:p-6">
          {isDemo && (
            <div className="mb-4 p-4 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div className="flex-1">
                <p className="text-amber-200 font-medium">Modo Demonstração</p>
                <p className="text-amber-300/80 text-sm">
                  Restam {diasRestantesDemo} dias do seu período de teste.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Car className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{vagasDisponiveis}</p>
                    <p className="text-xs text-slate-400">Vagas Disponíveis</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Car className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{vagasOcupadas}</p>
                    <p className="text-xs text-slate-400">Vagas Ocupadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{estacionamentoAtual?.totalVagas || 0}</p>
                    <p className="text-xs text-slate-400">Total de Vagas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      R$ {estacionamentoAtual?.valorHora?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-slate-400">Valor/Hora</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  {estacionamentoAtual?.nome || 'Selecione um Estacionamento'}
                </span>
                <div className="flex items-center gap-4 text-sm font-normal">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500"></span>
                    <span className="text-slate-400">Disponível</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500"></span>
                    <span className="text-slate-400">Ocupado</span>
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <ParkingGrid 
                  vagas={vagas} 
                  estacionamento={estacionamentoAtual}
                  onVagaUpdate={() => {
                    if (estacionamentoAtual?.id) {
                      fetch(`/api/vagas?estacionamentoId=${estacionamentoAtual.id}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'x-empresa-id': empresa?.id || ''
                        }
                      })
                        .then(res => res.json())
                        .then(data => setVagas(data))
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      <CrudModal
        open={crudModal.open}
        type={crudModal.type}
        onClose={() => setCrudModal({ open: false, type: '' })}
      />
    </div>
  )
}
