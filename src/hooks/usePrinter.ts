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
const PAIRED_PRINTERS_KEY = 'parking_control_paired_printers'

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

  // Carregar impressoras pareadas salvas e tentar obter dispositivos do sistema
  useEffect(() => {
    const loadPrinters = async () => {
      const loadedPrinters: PrinterDevice[] = []
      
      // 1. Carregar impressoras pareadas salvas no localStorage
      const pairedSaved = localStorage.getItem(PAIRED_PRINTERS_KEY)
      if (pairedSaved) {
        try {
          const paired = JSON.parse(pairedSaved) as PrinterDevice[]
          loadedPrinters.push(...paired)
        } catch (e) {
          console.error('Erro ao carregar impressoras pareadas:', e)
        }
      }
      
      // 2. Carregar impressora selecionada anteriormente
      const saved = localStorage.getItem(PRINTER_STORAGE_KEY)
      if (saved) {
        try {
          const printer = JSON.parse(saved) as PrinterDevice
          setSelectedPrinter(printer)
          
          // Adicionar à lista se não estiver
          if (!loadedPrinters.find(p => p.id === printer.id)) {
            loadedPrinters.unshift(printer)
          }
        } catch (e) {
          console.error('Erro ao carregar impressora salva:', e)
        }
      }
      
      // 3. Tentar obter dispositivos já pareados via API (Chrome Android)
      if (isBluetoothSupported && (navigator as any).bluetooth?.getDevices) {
        try {
          const devices = await (navigator as any).bluetooth.getDevices()
          for (const device of devices) {
            const existing = loadedPrinters.find(p => p.id === device.id)
            if (!existing) {
              loadedPrinters.push({
                id: device.id,
                name: device.name || 'Impressora Pareada',
                type: 'bluetooth',
                connected: false
              })
            }
          }
        } catch (e) {
          console.log('getDevices() não disponível ou sem permissão:', e)
        }
      }
      
      setPrinters(loadedPrinters)
    }
    
    loadPrinters()
  }, [isBluetoothSupported])

  /**
   * Salvar lista de impressoras pareadas
   */
  const savePairedPrinters = useCallback((printerList: PrinterDevice[]) => {
    localStorage.setItem(PAIRED_PRINTERS_KEY, JSON.stringify(printerList))
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
          let updated: PrinterDevice[]
          if (exists) {
            updated = prev.map(p => p.id === newPrinter.id ? { ...p, name: newPrinter.name } : p)
          } else {
            updated = [...prev, newPrinter]
          }
          // Salvar lista atualizada
          savePairedPrinters(updated)
          return updated
        })
        
        // Selecionar automaticamente a impressora encontrada
        setSelectedPrinter(newPrinter)
        
        // Salvar como impressora selecionada
        localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(newPrinter))
        
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
  }, [isBluetoothSupported, savePairedPrinters])

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
        setPrinters(prev => {
          const updated = prev.map(p => p.id === printer.id ? updatedPrinter : p)
          savePairedPrinters(updated)
          return updated
        })
        
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
  }, [isBluetoothSupported, savePairedPrinters])

  /**
   * Tentar reconectar à impressora selecionada automaticamente
   */
  const reconnectPrinter = useCallback(async (): Promise<boolean> => {
    if (!selectedPrinter || !isBluetoothSupported) {
      return false
    }

    setConnectionStatus('connecting')
    setError(null)

    try {
      // Tentar obter o dispositivo pelo ID
      if ((navigator as any).bluetooth?.getDevices) {
        const devices = await (navigator as any).bluetooth.getDevices()
        const device = devices.find((d: any) => d.id === selectedPrinter.id)
        
        if (device && device.gatt) {
          await device.gatt.connect()
          
          const updatedPrinter = { ...selectedPrinter, connected: true }
          setSelectedPrinter(updatedPrinter)
          setConnectionStatus('connected')
          
          setPrinters(prev => {
            const updated = prev.map(p => p.id === selectedPrinter.id ? updatedPrinter : p)
            savePairedPrinters(updated)
            return updated
          })
          
          localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(updatedPrinter))
          
          return true
        }
      }
      
      setConnectionStatus('disconnected')
      return false
    } catch (err: any) {
      setConnectionStatus('error')
      console.log('Não foi possível reconectar automaticamente:', err)
      return false
    }
  }, [selectedPrinter, isBluetoothSupported, savePairedPrinters])

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

  /**
   * Remover impressora da lista de pareados
   */
  const forgetPrinter = useCallback((printerId: string) => {
    setPrinters(prev => {
      const updated = prev.filter(p => p.id !== printerId)
      savePairedPrinters(updated)
      return updated
    })
    
    if (selectedPrinter?.id === printerId) {
      setSelectedPrinter(null)
      localStorage.removeItem(PRINTER_STORAGE_KEY)
    }
  }, [selectedPrinter, savePairedPrinters])

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
    reconnectPrinter,
    disconnectPrinter,
    savePrinter,
    forgetPrinter,
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
