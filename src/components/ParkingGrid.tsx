'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Car, Camera, QrCode, Check } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import QRCode from 'react-qr-code'

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

interface Estacionamento {
  id: string
  nome: string
  totalVagas: number
  valorHora: number
  toleranciaMinutos: number
}

interface ParkingGridProps {
  vagas: Vaga[]
  estacionamento: Estacionamento | null
  onVagaUpdate: () => void
}

export function ParkingGrid({ vagas, estacionamento, onVagaUpdate }: ParkingGridProps) {
  const { token, empresa, usuario } = useAuthStore()
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null)
  const [modalType, setModalType] = useState<'entrada' | 'saida' | 'comprovante' | 'qrcode' | null>(null)
  const [placa, setPlaca] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [comprovante, setComprovante] = useState<Record<string, unknown> | null>(null)
  const [codigoQrLido, setCodigoQrLido] = useState('')

  const handleVagaClick = (vaga: Vaga) => {
    setSelectedVaga(vaga)
    if (vaga.status === 'DISPONIVEL') {
      setModalType('entrada')
      setPlaca('')
      setClienteNome('')
    } else if (vaga.status === 'OCUPADA' && vaga.movimentacaoAtiva) {
      setModalType('saida')
    }
  }

  const handleEntrada = async () => {
    if (!selectedVaga || !placa || !estacionamento) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/movimentacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-empresa-id': empresa?.id || '',
          'x-usuario-id': usuario?.id || ''
        },
        body: JSON.stringify({
          acao: 'entrada',
          estacionamentoId: estacionamento.id,
          vagaId: selectedVaga.id,
          placa,
          clienteNome: clienteNome || 'Avulso',
          tipoCliente: 'AVULSO',
        })
      })

      const data = await response.json()
      if (data.success && data.comprovante) {
        setComprovante(data.comprovante)
        setModalType('comprovante')
        onVagaUpdate()
      } else {
        alert(data.error || 'Erro ao registrar entrada')
      }
    } catch (error) {
      console.error('Erro ao registrar entrada:', error)
      alert('Erro ao registrar entrada')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaida = async () => {
    if (!selectedVaga?.movimentacaoAtiva) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/movimentacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-empresa-id': empresa?.id || '',
          'x-usuario-id': usuario?.id || ''
        },
        body: JSON.stringify({ 
          acao: 'saida',
          movimentacaoId: selectedVaga.movimentacaoAtiva.id,
          formaPagamento: 'DINHEIRO' 
        })
      })

      const data = await response.json()
      if (data.success) {
        setComprovante({
          ...data.comprovante,
          tipo: 'saida'
        })
        setModalType('comprovante')
        onVagaUpdate()
      } else {
        alert(data.error || 'Erro ao registrar saída')
      }
    } catch (error) {
      console.error('Erro ao registrar saída:', error)
      alert('Erro ao registrar saída')
    } finally {
      setIsLoading(false)
    }
  }

  const buscarPorQrCode = async () => {
    if (!codigoQrLido) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/movimentacoes/qrcode?qrcode=${codigoQrLido}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-empresa-id': empresa?.id || ''
        }
      })
      const data = await response.json()
      if (response.ok) {
        setSelectedVaga(data.vaga)
        setModalType('saida')
      } else {
        alert(data.error || 'QRCode não encontrado')
      }
    } catch {
      console.error('Erro ao buscar QRCode')
    } finally {
      setIsLoading(false)
    }
  }

  const closeModal = () => {
    setSelectedVaga(null)
    setModalType(null)
    setComprovante(null)
    setCodigoQrLido('')
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const calcularTempo = (entrada: string, saida?: string) => {
    const inicio = new Date(entrada).getTime()
    const fim = saida ? new Date(saida).getTime() : Date.now()
    const minutos = Math.ceil((fim - inicio) / (1000 * 60))
    return `${Math.floor(minutos / 60)}h ${minutos % 60}min`
  }

  return (
    <>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {vagas.map((vaga) => (
          <button
            key={vaga.id}
            onClick={() => handleVagaClick(vaga)}
            className={`
              relative aspect-square rounded-lg flex flex-col items-center justify-center
              transition-all duration-200 transform hover:scale-105
              ${vaga.status === 'DISPONIVEL' 
                ? 'bg-emerald-500/20 border-2 border-emerald-500 hover:bg-emerald-500/30' 
                : 'bg-red-500/20 border-2 border-red-500 hover:bg-red-500/30'
              }
            `}
          >
            <Car className={`w-6 h-6 mb-1 ${vaga.status === 'DISPONIVEL' ? 'text-emerald-500' : 'text-red-500'}`} />
            <span className="text-xs font-bold text-white">{vaga.numero}</span>
            {vaga.movimentacaoAtiva && (
              <span className="text-[10px] text-slate-400 mt-1 truncate w-full text-center px-1">
                {vaga.movimentacaoAtiva.placa}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Button variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
          onClick={() => setModalType('qrcode')}>
          <QrCode className="w-4 h-4 mr-2" />
          Ler QRCode para Saída
        </Button>
      </div>

      {/* Modal Entrada */}
      <Dialog open={modalType === 'entrada'} onOpenChange={closeModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-emerald-500" />
              Registrar Entrada - Vaga {selectedVaga?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Placa do Veículo</Label>
              <div className="flex gap-2">
                <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="ABC1234" className="bg-slate-900/50 border-slate-600 text-white uppercase text-lg tracking-wider" maxLength={7} />
                <Button variant="outline" className="border-slate-600" onClick={() => alert('Câmera')}>
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Nome do Cliente</Label>
              <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Nome (opcional)" className="bg-slate-900/50 border-slate-600 text-white" />
            </div>
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
              onClick={handleEntrada} disabled={!placa || isLoading}>
              {isLoading ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Saída */}
      <Dialog open={modalType === 'saida'} onOpenChange={closeModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-red-500" />
              Registrar Saída - Vaga {selectedVaga?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Placa:</span>
                <span className="font-bold text-white">{selectedVaga?.movimentacaoAtiva?.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="text-white">{selectedVaga?.movimentacaoAtiva?.clienteNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entrada:</span>
                <span className="text-white">{selectedVaga?.movimentacaoAtiva?.dataEntrada ? formatarData(selectedVaga.movimentacaoAtiva.dataEntrada) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tempo:</span>
                <span className="text-white font-bold">
                  {selectedVaga?.movimentacaoAtiva?.dataEntrada ? calcularTempo(selectedVaga.movimentacaoAtiva.dataEntrada) : '-'}
                </span>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-red-500 to-rose-600"
              onClick={handleSaida} disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Registrar Saída'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Comprovante */}
      <Dialog open={modalType === 'comprovante'} onOpenChange={closeModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {comprovante?.tipo === 'entrada' ? 'Comprovante de Entrada' : 'Comprovante de Saída'}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-white rounded-lg p-4 text-black">
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg">{comprovante?.empresa?.nome || empresa?.nome}</h3>
              <p className="text-sm text-gray-600">{comprovante?.estacionamento?.nome || estacionamento?.nome}</p>
            </div>
            <div className="border-t border-b border-gray-200 py-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vaga:</span>
                <span className="font-bold">{comprovante?.vaga?.numero || selectedVaga?.numero}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Placa:</span>
                <span className="font-bold">{comprovante?.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span>{comprovante?.clienteNome || 'AVULSO'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entrada:</span>
                <span>{comprovante?.entradaFormatada || (comprovante?.dataEntrada ? formatarData(comprovante.dataEntrada as string) : '-')}</span>
              </div>
              {comprovante?.tipo === 'saida' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saída:</span>
                    <span>{comprovante?.saidaFormatada || (comprovante?.dataSaida ? formatarData(comprovante.dataSaida as string) : '-')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Permanência:</span>
                    <span className="font-medium">{comprovante?.tempoPermanencia || '-'}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                    <span>Valor:</span>
                    <span className="text-emerald-600">R$ {(comprovante?.valorTotal as number)?.toFixed(2) || '0,00'}</span>
                  </div>
                </>
              )}
            </div>
            {comprovante?.tipo === 'entrada' && (
              <div className="flex justify-center py-4">
                {comprovante?.qrcodeImage ? (
                  <img src={comprovante.qrcodeImage as string} alt="QR Code" className="w-32 h-32" />
                ) : comprovante?.qrcode ? (
                  <QRCode value={comprovante.qrcode as string} size={120} level="M" />
                ) : null}
              </div>
            )}
            {comprovante?.tipo === 'entrada' && (
              <p className="text-center text-xs text-gray-500 mt-2">
                Apresente este comprovante na saída
              </p>
            )}
          </div>
          <Button className="w-full bg-emerald-500" onClick={closeModal}>
            <Check className="w-4 h-4 mr-2" /> Fechar
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal QRCode */}
      <Dialog open={modalType === 'qrcode'} onOpenChange={closeModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-500" />
              Informe o Código QR
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={codigoQrLido} onChange={(e) => setCodigoQrLido(e.target.value)}
              placeholder="Cole o código aqui..." className="bg-slate-900/50 border-slate-600 text-white font-mono" />
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
              onClick={buscarPorQrCode} disabled={!codigoQrLido || isLoading}>
              {isLoading ? 'Buscando...' : 'Buscar e Registrar Saída'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
