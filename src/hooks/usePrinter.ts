import { useState, useEffect, useCallback, useRef } from 'react'

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

// ============================================
// ESC/POS Commands para impressoras térmicas
// ============================================
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

// Comandos ESC/POS
const CMD = {
  INIT: [ESC, 0x40],                    // Inicializar impressora
  ALIGN_LEFT: [ESC, 0x61, 0x00],        // Alinhar esquerda
  ALIGN_CENTER: [ESC, 0x61, 0x01],      // Alinhar centro
  ALIGN_RIGHT: [ESC, 0x61, 0x02],       // Alinhar direita
  BOLD_ON: [ESC, 0x45, 0x01],           // Negrito on
  BOLD_OFF: [ESC, 0x45, 0x00],          // Negrito off
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x10],   // Altura dupla on
  DOUBLE_HEIGHT_OFF: [GS, 0x21, 0x00],  // Altura dupla off
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x01],    // Largura dupla on
  DOUBLE_WIDTH_OFF: [GS, 0x21, 0x00],   // Largura dupla off
  CUT: [GS, 0x56, 0x00],                // Cortar papel
  FEED: (lines: number) => [ESC, 0x64, lines], // Alimentar linhas
  LINE_FEED: [LF],
}

/**
 * Converter string para bytes
 */
function stringToBytes(str: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    // Converter caracteres acentuados para aproximação ASCII
    if (charCode > 127) {
      // Caracteres especiais portugueses
      const specialChars: Record<number, number> = {
        224: 97, 225: 97, 226: 97, 227: 97, // à á â ã -> a
        232: 101, 233: 101, 234: 101,       // è é ê -> e
        236: 105, 237: 105,                 // ì í -> i
        242: 111, 243: 111, 244: 111, 245: 111, // ò ó ô õ -> o
        249: 117, 250: 117,                 // ù ú -> u
        231: 99, 199: 67,                   // ç Ç -> c C
        227: 97, 245: 111,                  // ã õ
        193: 65, 201: 69, 205: 73, 211: 79, 218: 85, // A E I O U acentuados
      }
      bytes.push(specialChars[charCode] || charCode)
    } else {
      bytes.push(charCode)
    }
  }
  return bytes
}

/**
 * Hook para gerenciar impressoras Bluetooth
 */
export function usePrinter() {
  const [printers, setPrinters] = useState<PrinterDevice[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const deviceRef = useRef<any>(null)
  const characteristicRef = useRef<any>(null)

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
   * Encontrar característica de escrita no dispositivo
   */
  const findWriteCharacteristic = async (server: any): Promise<any> => {
    const services = await server.getPrimaryServices()
    
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          // Procurar característica com propriedade write
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return char
          }
        }
      } catch (e) {
        console.log('Erro ao obter características do serviço:', e)
      }
    }
    
    return null
  }

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
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ]
      })

      if (device && device.gatt) {
        const server = await device.gatt.connect()
        
        // Encontrar característica de escrita
        const characteristic = await findWriteCharacteristic(server)
        
        if (characteristic) {
          deviceRef.current = device
          characteristicRef.current = characteristic
          
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
        } else {
          setError('Não foi possível encontrar característica de escrita')
          setConnectionStatus('error')
          return false
        }
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
          const server = await device.gatt.connect()
          const characteristic = await findWriteCharacteristic(server)
          
          if (characteristic) {
            deviceRef.current = device
            characteristicRef.current = characteristic
            
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
   * Enviar dados para a impressora
   */
  const sendData = useCallback(async (data: number[]): Promise<boolean> => {
    if (!characteristicRef.current) {
      setError('Impressora não conectada')
      return false
    }

    try {
      const dataArray = new Uint8Array(data)
      
      // Verificar se suporta writeWithoutResponse (mais rápido)
      if (characteristicRef.current.properties.writeWithoutResponse) {
        await characteristicRef.current.writeValueWithoutResponse(dataArray)
      } else {
        await characteristicRef.current.writeValue(dataArray)
      }
      
      return true
    } catch (err: any) {
      console.error('Erro ao enviar dados:', err)
      setError('Erro ao imprimir: ' + (err.message || 'Erro desconhecido'))
      return false
    }
  }, [])

  /**
   * Imprimir texto
   */
  const printText = useCallback(async (text: string): Promise<boolean> => {
    const data = stringToBytes(text)
    return sendData([...CMD.INIT, ...data])
  }, [sendData])

  /**
   * Imprimir linha
   */
  const printLine = useCallback(async (text: string = ''): Promise<boolean> => {
    const data = [...stringToBytes(text), ...CMD.LINE_FEED]
    return sendData(data)
  }, [sendData])

  /**
   * Imprimir comprovante de estacionamento
   */
  const printReceipt = useCallback(async (receipt: {
    empresa: { nome: string; cnpj: string }
    vaga: string
    placa: string
    cliente: string
    entrada: string
    saida?: string
    valor?: number
    qrcodeImage?: string
  }): Promise<boolean> => {
    if (!characteristicRef.current) {
      // Tentar reconectar primeiro
      const reconnected = await reconnectPrinter()
      if (!reconnected) {
        setError('Impressora não conectada. Selecione e conecte uma impressora.')
        return false
      }
    }

    try {
      // Construir dados do comprovante
      const data: number[] = [
        ...CMD.INIT,
        ...CMD.ALIGN_CENTER,
        ...CMD.BOLD_ON,
        ...CMD.DOUBLE_HEIGHT_ON,
        ...stringToBytes(receipt.empresa.nome),
        ...CMD.LINE_FEED,
        ...CMD.DOUBLE_HEIGHT_OFF,
        ...CMD.BOLD_OFF,
        ...stringToBytes('CNPJ: ' + receipt.cnpj),
        ...CMD.LINE_FEED,
        ...CMD.LINE_FEED,
        ...CMD.ALIGN_LEFT,
        ...CMD.BOLD_ON,
        ...stringToBytes('COMPROVANTE DE ESTACIONAMENTO'),
        ...CMD.BOLD_OFF,
        ...CMD.LINE_FEED,
        ...CMD.LINE_FEED,
        ...stringToBytes('================================'),
        ...CMD.LINE_FEED,
        ...stringToBytes('Vaga: '),
        ...CMD.BOLD_ON,
        ...stringToBytes(receipt.vaga),
        ...CMD.BOLD_OFF,
        ...CMD.LINE_FEED,
        ...stringToBytes('Placa: '),
        ...CMD.BOLD_ON,
        ...stringToBytes(receipt.placa),
        ...CMD.BOLD_OFF,
        ...CMD.LINE_FEED,
        ...stringToBytes('Cliente: ' + receipt.cliente),
        ...CMD.LINE_FEED,
        ...stringToBytes('Entrada: ' + receipt.entrada),
        ...CMD.LINE_FEED,
      ]

      if (receipt.saida) {
        data.push(...stringToBytes('Saida: ' + receipt.saida), ...CMD.LINE_FEED)
      }

      data.push(...stringToBytes('================================'), ...CMD.LINE_FEED)

      if (receipt.valor !== undefined) {
        data.push(
          ...CMD.ALIGN_RIGHT,
          ...CMD.BOLD_ON,
          ...CMD.DOUBLE_HEIGHT_ON,
          ...stringToBytes('TOTAL: R$ ' + receipt.valor.toFixed(2)),
          ...CMD.DOUBLE_HEIGHT_OFF,
          ...CMD.BOLD_OFF,
          ...CMD.LINE_FEED,
          ...CMD.LINE_FEED,
          ...CMD.ALIGN_LEFT,
        )
      }

      // Finalizar
      data.push(
        ...CMD.LINE_FEED,
        ...CMD.LINE_FEED,
        ...CMD.ALIGN_CENTER,
        ...stringToBytes('Obrigado pela preferencia!'),
        ...CMD.LINE_FEED,
        ...CMD.LINE_FEED,
        ...CMD.LINE_FEED,
      )

      // Enviar dados em chunks de 100 bytes (limite de algumas impressoras)
      const chunkSize = 100
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        await sendData(chunk)
      }

      return true
    } catch (err: any) {
      console.error('Erro ao imprimir comprovante:', err)
      setError('Erro ao imprimir: ' + (err.message || 'Erro desconhecido'))
      return false
    }
  }, [sendData, reconnectPrinter])

  /**
   * Desconectar impressora
   */
  const disconnectPrinter = useCallback(() => {
    if (deviceRef.current && deviceRef.current.gatt?.connected) {
      deviceRef.current.gatt.disconnect()
    }
    deviceRef.current = null
    characteristicRef.current = null
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
    printText,
    printLine,
    printReceipt,
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
