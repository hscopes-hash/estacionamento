'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Car, LogOut, Plus, Users, Building2, Settings, QrCode, Camera, 
  Clock, User, CreditCard, Search, ChevronRight, X, Check, AlertCircle,
  Menu, Maximize, Minimize
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { ProcessingOverlay, ProcessingStep } from '@/components/ProcessingOverlay'
import { VERSION } from '@/lib/version'
import { usePrinter, saveCredentials, loadCredentials, clearCredentials } from '@/hooks/usePrinter'

// ============================================
// TYPES
// ============================================
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

interface Vaga {
  id: string
  numero: string
  status: string
  tipo: string
  ocupada: boolean
  movimentacaoAtual: {
    id: string
    placa: string
    clienteNome: string | null
    dataEntrada: string
  } | null
}

interface Estacionamento {
  id: string
  nome: string
  totalVagas: number
  tipo: string
  valorHora: number
  valorFracao: number
  toleranciaMinutos: number
  ativo: boolean
  _count?: { vagas: number; movimentacoes: number }
}

interface Cliente {
  id: string
  nome: string
  cpfCnpj: string | null
  telefone: string | null
  tipo: string
  _count?: { veiculos: number; movimentacoes: number }
}

interface Movimentacao {
  id: string
  placa: string
  clienteNome: string | null
  dataEntrada: string
  dataSaida: string | null
  status: string
  valorTotal: number | null
  vaga: { numero: string }
  cliente?: { nome: string } | null
}

// ============================================
// API HELPER
// ============================================
const API_BASE = '/api'

async function apiCall(endpoint: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisicao')
  }
  
  return data
}

// ============================================
// ESTILOS BASE
// ============================================
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#1e293b',
    padding: '12px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  header: {
    backgroundColor: '#059669',
    color: 'white',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    opacity: 0.8,
    margin: 0,
  },
  button: {
    primary: {
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 16px',
      fontSize: '14px',
      cursor: 'pointer',
      width: '100%',
    },
    secondary: {
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '10px 16px',
      fontSize: '14px',
      cursor: 'pointer',
      width: '100%',
    },
    danger: {
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      padding: '10px 16px',
      fontSize: '14px',
      cursor: 'pointer',
      width: '100%',
    },
    icon: {
      backgroundColor: 'white',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      padding: '8px',
      cursor: 'pointer',
    },
  },
  input: {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    boxSizing: 'border-box',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '4px',
    display: 'block',
    color: '#374151',
  },
  row: {
    display: 'flex',
    gap: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
  },
  statsBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'center',
    flex: 1,
  },
  statsNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#059669',
    margin: 0,
  },
  statsLabel: {
    fontSize: '11px',
    color: '#6b7280',
    margin: 0,
  },
}

// ============================================
// COMPONENTS
// ============================================

// Modal Simples
function SimpleModal({ isOpen, onClose, title, children }: { 
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode 
}) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{
          padding: '12px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
        <div style={{ padding: '12px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Login Screen
function LoginScreen({ onLogin }: { onLogin: (user: User, token: string, empresa?: { id: string; nome: string; plano: string; dataFimTrial: string | null }) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDemo, setShowDemo] = useState(true)
  const [connectingPrinter, setConnectingPrinter] = useState<string | null>(null)

  const { 
    printers, selectedPrinter, setSelectedPrinter, isScanning, 
    connectionStatus, error: printerError, scanPrinters, 
    connectPrinter, reconnectPrinter, forgetPrinter 
  } = usePrinter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha: password }),
      })
      onLogin(data.usuario, data.token, data.empresa)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ iniciarDemo: true }),
      })
      onLogin(data.usuario, data.token, data.empresa)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectPrinter = async (printer: typeof printers[0]) => {
    setConnectingPrinter(printer.id)
    try {
      await connectPrinter(printer)
    } finally {
      setConnectingPrinter(null)
    }
  }

  const handleReconnect = async () => {
    if (!selectedPrinter) return
    setConnectingPrinter(selectedPrinter.id)
    try {
      await reconnectPrinter()
    } finally {
      setConnectingPrinter(null)
    }
  }

  return (
    <div style={{ ...styles.container, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...styles.card, width: '100%', maxWidth: '320px' }}>
        <div style={{ textAlign: 'center', padding: '16px 12px 8px' }}>
          <div style={{
            width: '48px', height: '48px', backgroundColor: '#10b981', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px'
          }}>
            <Car style={{ width: '24px', height: '24px', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Parking Control</h1>
          <p style={{ color: '#10b981', fontSize: '12px', margin: '4px 0 0' }}>{VERSION}</p>
        </div>

        <div style={{ padding: '0 12px 16px' }}>
          {/* Impressoras Pareadas */}
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '8px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Impressoras Pareadas</span>
              {connectionStatus === 'connected' && <span style={{ color: '#16a34a' }}>Conectado</span>}
              {connectionStatus === 'connecting' && <span style={{ color: '#d97706' }}>Conectando...</span>}
            </div>

            {/* Lista de impressoras pareadas */}
            {printers.length > 0 ? (
              <div style={{ marginBottom: '8px' }}>
                {printers.map(printer => (
                  <div 
                    key={printer.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      backgroundColor: selectedPrinter?.id === printer.id ? '#e0f2fe' : 'white',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      border: selectedPrinter?.id === printer.id ? '1px solid #0ea5e9' : '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: '500', margin: 0, truncate: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {printer.name}
                      </p>
                      <p style={{ fontSize: '10px', color: printer.connected ? '#16a34a' : '#6b7280', margin: 0 }}>
                        {printer.connected ? 'Conectado' : 'Pareado'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {selectedPrinter?.id === printer.id && !printer.connected && (
                        <button
                          onClick={handleReconnect}
                          disabled={connectingPrinter === printer.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '10px',
                            backgroundColor: '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {connectingPrinter === printer.id ? '...' : 'Conectar'}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPrinter(printer)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          backgroundColor: selectedPrinter?.id === printer.id ? '#0ea5e9' : '#6b7280',
                          color: 'white',
                          border: 'none',
                            borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Selecionar
                      </button>
                      <button
                        onClick={() => forgetPrinter(printer.id)}
                        style={{
                          padding: '4px 6px',
                          fontSize: '10px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px', textAlign: 'center' }}>
                Nenhuma impressora pareada
              </p>
            )}

            {/* Botao para buscar nova impressora */}
            <button
              onClick={scanPrinters}
              disabled={isScanning}
              style={{
                width: '100%',
                height: '32px',
                fontSize: '12px',
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isScanning ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {isScanning ? 'Buscando...' : '+ Buscar Impressora'}
            </button>

            {printerError && <p style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px', margin: '4px 0 0' }}>{printerError}</p>}
          </div>

          {showDemo ? (
            <div>
              <div style={{ backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '6px', padding: '12px', textAlign: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', color: '#065f46', margin: '0 0 8px' }}>Teste gratis 15 dias!</p>
                <button onClick={handleDemoLogin} disabled={loading} style={{ ...styles.button.primary, height: '40px' }}>
                  {loading ? 'Criando...' : 'Iniciar Demo'}
                </button>
              </div>
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>-- ou --</span>
              </div>
              <button onClick={() => setShowDemo(false)} style={{ ...styles.button.secondary, height: '36px' }}>
                Ja tenho conta
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '8px' }}>
                <label style={styles.label}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={styles.label}>Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: '11px', margin: '4px 0' }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ ...styles.button.primary, height: '40px', marginBottom: '8px' }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <button type="button" onClick={() => setShowDemo(true)} style={{ backgroundColor: 'transparent', border: 'none', color: '#6b7280', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                Voltar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// Vaga Card
function VagaCard({ vaga, onSelect }: { vaga: Vaga; onSelect: (vaga: Vaga) => void }) {
  const isOcupada = vaga.status === 'OCUPADA'
  const isManutencao = vaga.status === 'MANUTENCAO'
  
  const bgColor = isOcupada ? '#ef4444' : isManutencao ? '#eab308' : '#10b981'

  return (
    <button
      onClick={() => onSelect(vaga)}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        borderRadius: '6px',
        fontWeight: 'bold',
        fontSize: '16px',
        backgroundColor: bgColor,
        color: 'white',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {vaga.numero}
      {isOcupada && vaga.movimentacaoAtual && (
        <span style={{ position: 'absolute', bottom: '2px', left: '2px', right: '2px', fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {vaga.movimentacaoAtual.placa}
        </span>
      )}
    </button>
  )
}

// Exit Form
function ExitForm({ movimentacao, token, onSuccess, onCancel }: { 
  movimentacao: { id: string; placa: string; clienteNome: string | null; dataEntrada: string }
  token: string
  onSuccess: () => void
  onCancel: () => void 
}) {
  const [formaPagamento, setFormaPagamento] = useState('')
  const [loading, setLoading] = useState(false)
  const [comprovante, setComprovante] = useState<any>(null)

  const handleExit = async () => {
    setLoading(true)
    try {
      await apiCall('/movimentacoes', {
        method: 'POST',
        body: JSON.stringify({ acao: 'saida', movimentacaoId: movimentacao.id, formaPagamento }),
      }, token)
      
      const compData = await apiCall('/comprovante', {
        method: 'POST',
        body: JSON.stringify({ movimentacaoId: movimentacao.id }),
      }, token)
      
      setComprovante(compData.comprovante)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  if (comprovante) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ backgroundColor: '#d1fae5', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
          <Check style={{ width: '32px', height: '32px', color: '#059669' }} />
          <p style={{ fontWeight: 'bold', color: '#059669', margin: '8px 0 0' }}>Saida Registrada!</p>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '12px', marginBottom: '12px', textAlign: 'left' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px' }}>{comprovante.empresa.nome}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px' }}>CNPJ: {comprovante.empresa.cnpj}</p>
          <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
          <p style={{ fontSize: '13px', margin: '0 0 4px' }}><strong>Vaga:</strong> {comprovante.vaga}</p>
          <p style={{ fontSize: '13px', margin: '0 0 4px' }}><strong>Placa:</strong> {comprovante.placa}</p>
          <p style={{ fontSize: '13px', margin: '0 0 4px' }}><strong>Cliente:</strong> {comprovante.cliente}</p>
          <p style={{ fontSize: '13px', margin: '0' }}><strong>Entrada:</strong> {comprovante.entrada}</p>
        </div>
        {comprovante.qrcodeImage && (
          <img src={comprovante.qrcodeImage} alt="QR Code" style={{ width: '120px', height: '120px', margin: '0 auto 12px', display: 'block' }} />
        )}
        <button onClick={onSuccess} style={styles.button.primary}>Fechar</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
        <p style={{ margin: '0 0 4px' }}><strong>Placa:</strong> {movimentacao.placa}</p>
        <p style={{ margin: '0 0 4px' }}><strong>Cliente:</strong> {movimentacao.clienteNome || 'Avulso'}</p>
        <p style={{ margin: '0' }}><strong>Entrada:</strong> {new Date(movimentacao.dataEntrada).toLocaleString('pt-BR')}</p>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={styles.label}>Forma de Pagamento</label>
        <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} style={styles.select}>
          <option value="">Selecionar...</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="CARTAO_CREDITO">Cartao Credito</option>
          <option value="CARTAO_DEBITO">Cartao Debito</option>
          <option value="PIX">PIX</option>
          <option value="CONVENIO">Convenio</option>
        </select>
      </div>

      <div style={styles.row}>
        <button onClick={onCancel} style={{ ...styles.button.secondary, flex: 1 }}>Cancelar</button>
        <button onClick={handleExit} disabled={loading} style={{ ...styles.button.danger, flex: 1 }}>
          {loading ? 'Processando...' : 'Registrar Saida'}
        </button>
      </div>
    </div>
  )
}

// Entry Modal
function EntryModal({ isOpen, onClose, vaga, estacionamentoId, clientes, onSuccess, token }: { 
  isOpen: boolean
  onClose: () => void
  vaga: Vaga | null
  estacionamentoId: string
  clientes: Cliente[]
  onSuccess: () => void
  token: string 
}) {
  const [placa, setPlaca] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [tipoCliente, setTipoCliente] = useState('AVULSO')
  const [loading, setLoading] = useState(false)
  const [novoCliente, setNovoCliente] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [dadosEncontrados, setDadosEncontrados] = useState<any>(null)
  const [buscandoPlaca, setBuscandoPlaca] = useState(false)
  const [showProcessing, setShowProcessing] = useState(false)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])

  useEffect(() => {
    if (isOpen) {
      setPlaca('')
      setClienteId('')
      setClienteNome('')
      setTipoCliente('AVULSO')
      setNovoCliente(false)
      setNovoClienteNome('')
      setNovoClienteTelefone('')
      setDadosEncontrados(null)
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [isOpen])

  const buscarDadosPlaca = useCallback(async (placaBusca: string) => {
    if (placaBusca.length !== 7) {
      setDadosEncontrados(null)
      return
    }
    setBuscandoPlaca(true)
    try {
      const result = await apiCall(`/placa/buscar?placa=${placaBusca.toUpperCase()}`, {}, token)
      setDadosEncontrados(result)
      if (result.found && result.cliente) {
        setClienteId(result.cliente.id)
        setClienteNome(result.cliente.nome)
        setTipoCliente(result.cliente.tipo)
        setNovoCliente(false)
      }
    } catch (err) {
      console.error('Erro ao buscar placa:', err)
    } finally {
      setBuscandoPlaca(false)
    }
  }, [token])

  useEffect(() => {
    const placaLimpa = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (placaLimpa.length === 7) {
      const timer = setTimeout(() => buscarDadosPlaca(placaLimpa), 500)
      return () => clearTimeout(timer)
    } else {
      setDadosEncontrados(null)
    }
  }, [placa, buscarDadosPlaca])

  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setShowCamera(true)
    } catch (err) {
      setCameraError('Nao foi possivel acessar a camera.')
    }
  }

  const closeCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop())
    setShowCamera(false)
    setTorchOn(false)
  }

  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const capabilities = track.getCapabilities()
      if ('torch' in capabilities) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] as any })
        setTorchOn(!torchOn)
      }
    } catch (err) {
      console.error('Erro ao controlar flash:', err)
    }
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = Math.max(video.videoWidth, 1280)
    canvas.height = Math.max(video.videoHeight, 720)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.filter = 'contrast(1.2) brightness(1.1)'
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.filter = 'none'
    const imageData = canvas.toDataURL('image/jpeg', 0.95)
    closeCamera()

    setShowProcessing(true)
    setProcessingSteps([{ label: 'Reconhecendo placa...', status: 'processing' }])

    try {
      const result = await apiCall('/ocr', { method: 'POST', body: JSON.stringify({ image: imageData }) }, token)
      if (result.placa) {
        setPlaca(result.placa)
        setProcessingSteps([{ label: 'Reconhecendo placa...', status: 'done' }])
        setTimeout(() => setShowProcessing(false), 500)
      } else {
        setProcessingSteps([{ label: 'Placa nao identificada', status: 'error' }])
        setTimeout(() => { setShowProcessing(false); alert('Placa nao identificada. Digite manualmente.') }, 500)
      }
    } catch (err) {
      setProcessingSteps([{ label: 'Erro no reconhecimento', status: 'error' }])
      setTimeout(() => setShowProcessing(false), 500)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vaga) return
    setLoading(true)
    try {
      let clienteIdFinal = clienteId
      let clienteNomeFinal = clienteNome

      if (novoCliente && novoClienteNome) {
        const clienteData = await apiCall('/clientes', {
          method: 'POST',
          body: JSON.stringify({ nome: novoClienteNome, telefone: novoClienteTelefone, tipo: 'AVULSO' }),
        }, token)
        clienteIdFinal = clienteData.cliente.id
        clienteNomeFinal = novoClienteNome
      }

      await apiCall('/movimentacoes', {
        method: 'POST',
        body: JSON.stringify({
          acao: 'entrada', estacionamentoId, vagaId: vaga.id,
          placa: placa.toUpperCase(), clienteId: clienteIdFinal || undefined,
          clienteNome: clienteNomeFinal || undefined, tipoCliente
        }),
      }, token)

      onSuccess()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  if (!vaga) return null
  const isOcupada = vaga.status === 'OCUPADA'

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title={`Vaga ${vaga.numero} - ${isOcupada ? 'Saida' : 'Entrada'}`}>
      {isOcupada && vaga.movimentacaoAtual ? (
        <ExitForm movimentacao={vaga.movimentacaoAtual} token={token} onSuccess={() => { onSuccess(); onClose() }} onCancel={onClose} />
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Placa</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1234" maxLength={7} required style={{ ...styles.input, flex: 1, textTransform: 'uppercase' }} />
              <button type="button" onClick={startCamera} style={{ ...styles.button.icon, width: '40px', height: '40px' }}>
                <Camera style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
          </div>

          {showCamera && (
            <div style={{ marginBottom: '12px' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '200px', backgroundColor: 'black', borderRadius: '6px' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                <button type="button" onClick={toggleTorch} style={{ ...styles.button.secondary, flex: 1 }}>
                  {torchOn ? 'Flash ON' : 'Flash'}
                </button>
                <button type="button" onClick={capturePhoto} style={{ ...styles.button.primary, flex: 1 }}>Capturar</button>
                <button type="button" onClick={closeCamera} style={{ ...styles.button.secondary, flex: 1 }}>Cancelar</button>
              </div>
            </div>
          )}

          {cameraError && <p style={{ color: '#dc2626', fontSize: '11px', marginBottom: '8px' }}>{cameraError}</p>}

          {dadosEncontrados?.found && dadosEncontrados.cliente && (
            <div style={{ backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '6px', padding: '8px', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: '#065f46', margin: '0' }}>
                <strong>Cliente:</strong> {dadosEncontrados.cliente.nome} ({dadosEncontrados.cliente.tipo})
              </p>
            </div>
          )}

          {buscandoPlaca && <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Buscando dados...</p>}

          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Tipo</label>
            <select value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value)} style={styles.select}>
              <option value="AVULSO">Avulso</option>
              <option value="MENSALISTA">Mensalista</option>
              <option value="CONVENIO">Convenio</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Cliente</label>
            {novoCliente ? (
              <div>
                <input value={novoClienteNome} onChange={(e) => setNovoClienteNome(e.target.value)} placeholder="Nome" required style={{ ...styles.input, marginBottom: '4px' }} />
                <input value={novoClienteTelefone} onChange={(e) => setNovoClienteTelefone(e.target.value)} placeholder="Telefone (opcional)" style={{ ...styles.input, marginBottom: '4px' }} />
                <button type="button" onClick={() => setNovoCliente(false)} style={{ ...styles.button.secondary, fontSize: '12px', padding: '6px 12px' }}>
                  Selecionar existente
                </button>
              </div>
            ) : (
              <div>
                <select value={clienteId} onChange={(e) => { setClienteId(e.target.value); const c = clientes.find(c => c.id === e.target.value); setClienteNome(c?.nome || '') }} style={{ ...styles.select, marginBottom: '4px' }}>
                  <option value="">Selecionar...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button type="button" onClick={() => setNovoCliente(true)} style={{ ...styles.button.secondary, fontSize: '12px', padding: '6px 12px' }}>
                  Cadastro Rapido
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={onClose} style={{ ...styles.button.secondary, flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={loading || !placa} style={{ ...styles.button.primary, flex: 1 }}>
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      )}
      {showProcessing && <ProcessingOverlay steps={processingSteps} />}
    </SimpleModal>
  )
}

// QR Scanner Modal
function QRScannerModal({ isOpen, onClose, token, onSuccess }: { isOpen: boolean; onClose: () => void; token: string; onSuccess: () => void }) {
  const [qrcode, setQrcode] = useState('')
  const [loading, setLoading] = useState(false)
  const [movimentacao, setMovimentacao] = useState<any>(null)
  const [calculo, setCalculo] = useState<{ tempoMinutos: number; valor: number } | null>(null)

  const handleSearch = async () => {
    if (!qrcode.trim()) return
    setLoading(true)
    try {
      const data = await apiCall(`/movimentacoes?qrcode=${qrcode}`, {}, token)
      if (data.movimentacao) {
        setMovimentacao(data.movimentacao)
        setCalculo(data.calculo)
      }
    } catch {
      alert('QR Code nao encontrado')
    } finally {
      setLoading(false)
    }
  }

  const handleExit = async (formaPagamento: string) => {
    if (!movimentacao) return
    setLoading(true)
    try {
      await apiCall('/movimentacoes', {
        method: 'POST',
        body: JSON.stringify({ acao: 'saida', movimentacaoId: movimentacao.id, formaPagamento }),
      }, token)
      onSuccess()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Leitura de QR Code">
      {!movimentacao ? (
        <div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            <input value={qrcode} onChange={(e) => setQrcode(e.target.value)} placeholder="Digite o codigo" style={{ ...styles.input, flex: 1 }} />
            <button onClick={handleSearch} disabled={loading} style={{ ...styles.button.primary, width: 'auto', padding: '0 16px' }}>
              <Search style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <p style={{ margin: '0 0 4px' }}><strong>Placa:</strong> {movimentacao.placa}</p>
            <p style={{ margin: '0 0 4px' }}><strong>Cliente:</strong> {movimentacao.clienteNome || 'Avulso'}</p>
            <p style={{ margin: '0 0 4px' }}><strong>Entrada:</strong> {new Date(movimentacao.dataEntrada).toLocaleString('pt-BR')}</p>
            <p style={{ margin: '0 0 4px' }}><strong>Tempo:</strong> {calculo?.tempoMinutos || 0} min</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669', margin: '8px 0 0' }}>R$ {((calculo?.valor || 0)).toFixed(2)}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => handleExit('DINHEIRO')} style={styles.button.primary}>Dinheiro</button>
            <button onClick={() => handleExit('PIX')} style={styles.button.primary}>PIX</button>
            <button onClick={() => handleExit('CARTAO_CREDITO')} style={styles.button.secondary}>Credito</button>
            <button onClick={() => handleExit('CARTAO_DEBITO')} style={styles.button.secondary}>Debito</button>
          </div>
          <button onClick={() => setMovimentacao(null)} style={styles.button.secondary}>Buscar outro</button>
        </div>
      )}
    </SimpleModal>
  )
}

// Clientes Tab
function ClientesTab({ token }: { token: string }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipo, setTipo] = useState('AVULSO')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      const data = await apiCall('/clientes', {}, token)
      setClientes(data.clientes || [])
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiCall('/clientes', {
        method: 'POST',
        body: JSON.stringify({ nome, telefone, tipo }),
      }, token)
      setShowForm(false)
      setNome('')
      setTelefone('')
      setTipo('AVULSO')
      loadClientes()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>Carregando...</p>

  return (
    <div>
      {clientes.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>Nenhum cliente cadastrado</p>
      ) : (
        clientes.map(cliente => (
          <div key={cliente.id} style={{ ...styles.card, padding: '12px', marginBottom: '8px' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 4px' }}>{cliente.nome}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ ...styles.badge, backgroundColor: cliente.tipo === 'MENSALISTA' ? '#dbeafe' : cliente.tipo === 'CONVENIO' ? '#fef3c7' : '#f3f4f6', color: cliente.tipo === 'MENSALISTA' ? '#1d4ed8' : cliente.tipo === 'CONVENIO' ? '#d97706' : '#374151' }}>
                {cliente.tipo}
              </span>
              {cliente.telefone && <span style={{ fontSize: '12px', color: '#6b7280' }}>{cliente.telefone}</span>}
            </div>
          </div>
        ))
      )}

      {showForm ? (
        <div style={{ ...styles.card, padding: '12px', marginTop: '12px' }}>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '8px' }}>
              <label style={styles.label}>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required style={styles.input} />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={styles.label}>Telefone</label>
              <input value={telefone} onChange={(e) => setTelefone(e.target.value)} style={styles.input} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={styles.label}>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={styles.select}>
                <option value="AVULSO">Avulso</option>
                <option value="MENSALISTA">Mensalista</option>
                <option value="CONVENIO">Convenio</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowForm(false)} style={styles.button.secondary}>Cancelar</button>
              <button type="submit" disabled={saving} style={styles.button.primary}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{ ...styles.button.primary, marginTop: '12px' }}>
          <Plus style={{ width: '16px', height: '16px', display: 'inline', marginRight: '8px' }} />
          Novo Cliente
        </button>
      )}
    </div>
  )
}

// Estacionamentos Tab
function EstacionamentosTab({ token, onSelect }: { token: string; onSelect: (id: string) => void }) {
  const [estacionamentos, setEstacionamentos] = useState<Estacionamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEstacionamentos()
  }, [])

  const loadEstacionamentos = async () => {
    try {
      const data = await apiCall('/estacionamentos', {}, token)
      setEstacionamentos(data.estacionamentos || [])
      if (data.estacionamentos?.length > 0) {
        onSelect(data.estacionamentos[0].id)
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>Carregando...</p>

  return (
    <div>
      {estacionamentos.map(est => (
        <div key={est.id} onClick={() => onSelect(est.id)} style={{ ...styles.card, padding: '12px', marginBottom: '8px', cursor: 'pointer' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 4px' }}>{est.nome}</p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>{est._count?.vagas || 0} vagas - R$ {est.valorHora.toFixed(2)}/hora</p>
        </div>
      ))}
    </div>
  )
}

// Dashboard
// Funcoes de tela cheia
function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  )
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (isFullscreen()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
    } else {
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        await elem.requestFullscreen()
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen()
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen()
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen()
      }
    }
  } catch (err) {
    console.log('Fullscreen nao suportado')
  }
}

function Dashboard({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'vagas' | 'clientes' | 'estac' | 'menu'>('vagas')
  const [estacionamentoId, setEstacionamentoId] = useState<string>('')
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedVaga, setSelectedVaga] = useState<Vaga | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  // Monitorar estado do fullscreen
  useEffect(() => {
    const checkFullscreen = () => setFullscreen(isFullscreen())
    document.addEventListener('fullscreenchange', checkFullscreen)
    document.addEventListener('webkitfullscreenchange', checkFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen)
      document.removeEventListener('webkitfullscreenchange', checkFullscreen)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (estacionamentoId) loadVagas()
  }, [estacionamentoId])

  const loadInitialData = async () => {
    try {
      const [estData, clientesData] = await Promise.all([
        apiCall('/estacionamentos', {}, token),
        apiCall('/clientes', {}, token)
      ])
      
      if (estData.estacionamentos?.length > 0) {
        setEstacionamentoId(estData.estacionamentos[0].id)
      }
      setClientes(clientesData.clientes || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVagas = async () => {
    try {
      const data = await apiCall(`/vagas?estacionamentoId=${estacionamentoId}`, {}, token)
      setVagas(data.vagas || [])
    } catch (err) {
      console.error('Erro ao carregar vagas:', err)
    }
  }

  const stats = {
    livres: vagas.filter(v => v.status === 'LIVRE').length,
    ocupadas: vagas.filter(v => v.status === 'OCUPADA').length,
    total: vagas.length,
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ textAlign: 'center', color: 'white' }}>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={{ ...styles.card, marginBottom: '12px' }}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Parking Control</h1>
            <p style={styles.subtitle}>{user.nome} - {user.nivel}</p>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
              {fullscreen ? <Minimize style={{ width: '20px', height: '20px' }} /> : <Maximize style={{ width: '20px', height: '20px' }} />}
            </button>
            <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
              <LogOut style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px' }}>
          <div style={{ ...styles.statsBox, backgroundColor: '#d1fae5' }}>
            <p style={{ ...styles.statsNumber, color: '#059669' }}>{stats.livres}</p>
            <p style={styles.statsLabel}>Livres</p>
          </div>
          <div style={{ ...styles.statsBox, backgroundColor: '#fee2e2' }}>
            <p style={{ ...styles.statsNumber, color: '#dc2626' }}>{stats.ocupadas}</p>
            <p style={styles.statsLabel}>Ocupadas</p>
          </div>
          <div style={styles.statsBox}>
            <p style={styles.statsNumber}>{stats.total}</p>
            <p style={styles.statsLabel}>Total</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 12px 12px' }}>
          <button onClick={() => setShowQRScanner(true)} style={{ ...styles.button.secondary, flex: 1 }}>
            <QrCode style={{ width: '16px', height: '16px', display: 'inline', marginRight: '4px' }} />
            QR Code
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', backgroundColor: 'white', borderRadius: '6px', marginBottom: '12px', overflow: 'hidden' }}>
        {[{ key: 'vagas', label: 'Vagas', icon: Car }, { key: 'clientes', label: 'Clientes', icon: Users }, { key: 'estac', label: 'Estac.', icon: Building2 }, { key: 'menu', label: 'Menu', icon: Settings }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
            flex: 1, padding: '12px 8px', border: 'none', backgroundColor: activeTab === tab.key ? '#059669' : 'white',
            color: activeTab === tab.key ? 'white' : '#374151', cursor: 'pointer', fontSize: '11px',
          }}>
            <tab.icon style={{ width: '20px', height: '20px', display: 'block', margin: '0 auto 4px' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ minHeight: '300px' }}>
        {activeTab === 'vagas' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {vagas.map(vaga => (
                <VagaCard key={vaga.id} vaga={vaga} onSelect={setSelectedVaga} />
              ))}
            </div>
          </div>
        )}
        {activeTab === 'clientes' && <ClientesTab token={token} />}
        {activeTab === 'estac' && <EstacionamentosTab token={token} onSelect={setEstacionamentoId} />}
        {activeTab === 'menu' && (
          <div style={styles.card}>
            <div style={{ padding: '12px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px' }}>{user.empresa?.nome}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>Versao: {VERSION}</p>
              <button onClick={onLogout} style={styles.button.danger}>Sair</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <EntryModal isOpen={!!selectedVaga} onClose={() => setSelectedVaga(null)} vaga={selectedVaga} estacionamentoId={estacionamentoId} clientes={clientes} onSuccess={loadVagas} token={token} />
      <QRScannerModal isOpen={showQRScanner} onClose={() => setShowQRScanner(false)} token={token} onSuccess={loadVagas} />
    </div>
  )
}

// Main App
export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [empresa, setEmpresa] = useState<{ id: string; nome: string; plano: string; dataFimTrial: string | null } | undefined>()

  const handleLogin = (loggedUser: User, token: string, empresa?: { id: string; nome: string; plano: string; dataFimTrial: string | null }) => {
    setUser(loggedUser)
    setToken(token)
    setEmpresa(empresa)
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    setEmpresa(undefined)
  }

  if (!user || !token) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <Dashboard user={user} token={token} onLogout={handleLogout} />
  )
}
