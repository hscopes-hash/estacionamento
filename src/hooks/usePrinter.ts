import { useState, useEffect, useCallback } from 'react'

export interface PrinterDevice {
  id: string
  name: string
  type: 'bluetooth' | 'usb'
  connected: boolean
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

const PRINTER_STORAGE_KEY = 'parking_control_printer'
const CREDENTIALS_STORAGE_KEY = 'parking_control_credentials'

/**
 * Hook para gerenciar impressoras Bluetooth
 */
export function usePrinter() {
  const [printers, setPrinters] = useState<PrinterDevice[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)

  // Verificar suporte ao Bluetooth
  const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator

  // Carregar impressora salva
  useEffect(() => {
    const saved = localStorage.getItem(PRINTER_STORAGE_KEY)
    if (saved) {
      try {
        const printer = JSON.parse(saved) as PrinterDevice
        setSelectedPrinter(printer)
        setPrinters([printer])
      } catch (e) {
        console.error('Erro ao carregar impressora salva:', e)
      }
    }
  }, [])

  /**
   * Escanear impressoras Bluetooth disponíveis
   */
  const scanPrinters = useCallback(async () => {
    if (!isBluetoothSupported) {
      setError('Bluetooth não é suportado neste navegador/dispositivo')
      return
    }

    setIsScanning(true)
    setError(null)

    try {
      // Usar Web Bluetooth API
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Serviço comum de impressora
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serial Port Service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Outro serviço comum
          '00001101-0000-1000-8000-00805f9b34fb', // SPP - Serial Port Profile
        ]
      })

      if (device) {
        const newPrinter: PrinterDevice = {
          id: device.id,
          name: device.name || 'Impressora Bluetooth',
          type: 'bluetooth',
          connected: false
        }
        
        setPrinters(prev => {
          // Evitar duplicados
          const exists = prev.find(p => p.id === newPrinter.id)
          if (exists) {
            return prev.map(p => p.id === newPrinter.id ? { ...p, name: newPrinter.name } : p)
          }
          return [...prev, newPrinter]
        })
        
        // Selecionar automaticamente a impressora encontrada
        setSelectedPrinter(newPrinter)
        
        return newPrinter
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // Usuário cancelou a seleção - não mostrar erro
        console.log('Seleção de impressora cancelada pelo usuário')
      } else if (err.name === 'SecurityError') {
        setError('Permissão de Bluetooth negada. Verifique as configurações do navegador.')
      } else {
        setError('Erro ao buscar impressoras: ' + (err.message || 'Erro desconhecido'))
        console.error('Erro ao escanear impressoras:', err)
      }
    } finally {
      setIsScanning(false)
    }
  }, [isBluetoothSupported])

  /**
   * Conectar a uma impressora
   */
  const connectPrinter = useCallback(async (printer: PrinterDevice): Promise<boolean> => {
    if (!isBluetoothSupported) {
      setError('Bluetooth não suportado')
      return false
    }

    setConnectionStatus('connecting')
    setError(null)

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ name: printer.name }],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '00001101-0000-1000-8000-00805f9b34fb',
        ]
      })

      if (device && device.gatt) {
        await device.gatt.connect()
        
        const updatedPrinter = { ...printer, connected: true }
        setSelectedPrinter(updatedPrinter)
        setConnectionStatus('connected')
        
        // Atualizar lista
        setPrinters(prev => 
          prev.map(p => p.id === printer.id ? updatedPrinter : p)
        )
        
        // Salvar preferência
        localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(updatedPrinter))
        
        return true
      }
      
      setConnectionStatus('disconnected')
      return false
    } catch (err: any) {
      setConnectionStatus('error')
      if (err.name !== 'NotFoundError') {
        setError('Erro ao conectar: ' + (err.message || 'Erro desconhecido'))
      }
      return false
    }
  }, [isBluetoothSupported])

  /**
   * Desconectar impressora
   */
  const disconnectPrinter = useCallback(() => {
    setSelectedPrinter(prev => prev ? { ...prev, connected: false } : null)
    setConnectionStatus('disconnected')
  }, [])

  /**
   * Salvar impressora selecionada
   */
  const savePrinter = useCallback((printer: PrinterDevice | null) => {
    if (printer) {
      localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer))
    } else {
      localStorage.removeItem(PRINTER_STORAGE_KEY)
    }
  }, [])

  return {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    isScanning,
    connectionStatus,
    error,
    isBluetoothSupported,
    scanPrinters,
    connectPrinter,
    disconnectPrinter,
    savePrinter,
  }
}

/**
 * Salvar credenciais do usuário
 */
export function saveCredentials(email: string, password: string, printerName?: string) {
  const credentials = { email, password, printerName }
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}

/**
 * Carregar credenciais salvas
 */
export function loadCredentials(): { email: string; password: string; printerName?: string } | null {
  try {
    const saved = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/**
 * Limpar credenciais salvas
 */
export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_STORAGE_KEY)
}

/**
 * Verificar se Bluetooth é suportado
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}
