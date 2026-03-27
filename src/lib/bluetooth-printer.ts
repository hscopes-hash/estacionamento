/**
 * Bluetooth Printer Service for Stone SmartPOS P2
 * Suporta impressoras térmicas Bluetooth como:
 * - Impressoras Bluetooth genéricas (SPP)
 * - Impressoras ESC/POS compatíveis
 */

export interface PrinterDevice {
  id: string
  name: string
  type: 'bluetooth' | 'usb'
  connected: boolean
}

// Comandos ESC/POS padrão para impressoras térmicas
const ESC = '\x1B'
const GS = '\x1D'
const LF = '\x0A'

// Comandos de formatação
export const PRINTER_COMMANDS = {
  INIT: `${ESC}@`,                           // Inicializar impressora
  CENTER: `${ESC}a\x01`,                     // Centralizar
  LEFT: `${ESC}a\x00`,                       // Alinhar esquerda
  RIGHT: `${ESC}a\x02`,                      // Alinhar direita
  BOLD_ON: `${ESC}E\x01`,                    // Negrito on
  BOLD_OFF: `${ESC}E\x00`,                   // Negrito off
  DOUBLE_HEIGHT: `${GS}!\x10`,               // Altura dupla
  DOUBLE_WIDTH: `${GS}!\x20`,                // Largura dupla
  DOUBLE_SIZE: `${GS}!\x30`,                 // Tamanho duplo
  NORMAL_SIZE: `${GS}!\x00`,                 // Tamanho normal
  UNDERLINE_ON: `${ESC}-\x01`,               // Sublinhado on
  UNDERLINE_OFF: `${ESC}-\x00`,              // Sublinhado off
  CUT: `${GS}V\x00`,                         // Cortar papel
  FEED: (lines: number) => `${ESC}d${String.fromCharCode(lines)}`, // Alimentar linhas
  BARCODE: (data: string) => `${GS}k\x04${String.fromCharCode(data.length)}${data}`, // Código de barras
  QR_CODE: (data: string) => { // QR Code
    const len = data.length
    const pL = String.fromCharCode(len & 0xFF)
    const pH = String.fromCharCode((len >> 8) & 0xFF)
    return `${GS}(k\x04\x00\x31\x41\x32\x00${GS}(k${pL}${pH}\x31\x50\x30${data}${GS}(k\x03\x00\x31\x43\x06${GS}(k\x03\x00\x31\x45\x30`
  },
}

// Armazenamento local para impressora salva
const PRINTER_STORAGE_KEY = 'parking_control_printer'
const CREDENTIALS_STORAGE_KEY = 'parking_control_credentials'

/**
 * Salva os dados da impressora selecionada
 */
export function savePrinter(printer: PrinterDevice | null) {
  if (printer) {
    localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printer))
  } else {
    localStorage.removeItem(PRINTER_STORAGE_KEY)
  }
}

/**
 * Recupera a impressora salva
 */
export function getSavedPrinter(): PrinterDevice | null {
  try {
    const saved = localStorage.getItem(PRINTER_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/**
 * Salva as credenciais do usuário
 */
export function saveCredentials(email: string, password: string, printerId?: string) {
  const credentials = { email, password, printerId }
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
}

/**
 * Recupera as credenciais salvas
 */
export function getSavedCredentials(): { email: string; password: string; printerId?: string } | null {
  try {
    const saved = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/**
 * Remove as credenciais salvas
 */
export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_STORAGE_KEY)
}

/**
 * Verifica se o navegador suporta Bluetooth
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/**
 * Escaneia dispositivos Bluetooth disponíveis
 * Usa a Web Bluetooth API
 */
export async function scanBluetoothPrinters(): Promise<PrinterDevice[]> {
  if (!isBluetoothSupported()) {
    throw new Error('Bluetooth não suportado neste navegador')
  }

  try {
    // Solicitar dispositivo Bluetooth
    // Filtro para impressoras comuns (Serial Port Profile)
    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Serviço comum de impressora
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serial Port Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Outro serviço comum
      ]
    })

    if (device) {
      return [{
        id: device.id,
        name: device.name || 'Impressora Bluetooth',
        type: 'bluetooth',
        connected: device.gatt?.connected || false
      }]
    }

    return []
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      // Usuário cancelou a seleção
      return []
    }
    throw error
  }
}

/**
 * Conecta a uma impressora Bluetooth
 */
export async function connectPrinter(printer: PrinterDevice): Promise<boolean> {
  try {
    // Para Web Bluetooth, a conexão é feita através do GATT
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ name: printer.name }],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ]
    })

    if (device && device.gatt) {
      await device.gatt.connect()
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Classe para gerenciar impressão
 */
export class ThermalPrinter {
  private device: any = null
  private characteristic: any = null
  private connected: boolean = false

  async connect(printerId?: string): Promise<boolean> {
    try {
      if (!isBluetoothSupported()) {
        console.warn('Bluetooth não suportado')
        return false
      }

      this.device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ]
      })

      if (!this.device) return false

      this.device.addEventListener('gattserverdisconnected', () => {
        this.connected = false
      })

      const server = await this.device.gatt.connect()
      
      // Tentar encontrar a característica de escrita
      const services = await server.getPrimaryServices()
      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char
            this.connected = true
            return true
          }
        }
      }

      return false
    } catch (error) {
      console.error('Erro ao conectar impressora:', error)
      return false
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  async print(data: string): Promise<boolean> {
    if (!this.characteristic || !this.connected) {
      return false
    }

    try {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(data)

      // Enviar em blocos de 100 bytes
      const chunkSize = 100
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize)
        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk)
        } else {
          await this.characteristic.writeValue(chunk)
        }
        // Pequena pausa entre blocos
        await new Promise(r => setTimeout(r, 50))
      }

      return true
    } catch (error) {
      console.error('Erro ao imprimir:', error)
      return false
    }
  }

  disconnect() {
    if (this.device && this.device.gatt) {
      this.device.gatt.disconnect()
    }
    this.connected = false
    this.characteristic = null
  }
}

/**
 * Gera o conteúdo do comprovante para impressão
 */
export function generateReceiptContent(data: {
  empresa: { nome: string; cnpj?: string }
  estacionamento: { nome: string; endereco?: string }
  vaga: string
  placa: string
  cliente?: string
  entrada: string
  saida?: string
  valor?: number
  qrcode?: string
}): string {
  const line = '='.repeat(32)
  const halfLine = '-'.repeat(32)

  let content = ''
  
  // Inicializar
  content += PRINTER_COMMANDS.INIT
  
  // Cabeçalho centralizado
  content += PRINTER_COMMANDS.CENTER
  content += PRINTER_COMMANDS.BOLD_ON
  content += PRINTER_COMMANDS.DOUBLE_HEIGHT
  content += `${data.empresa.nome}\n`
  content += PRINTER_COMMANDS.NORMAL_SIZE
  content += PRINTER_COMMANDS.BOLD_OFF
  
  if (data.empresa.cnpj) {
    content += `CNPJ: ${data.empresa.cnpj}\n`
  }
  
  content += `${halfLine}\n`
  content += `${data.estacionamento.nome}\n`
  if (data.estacionamento.endereco) {
    content += `${data.estacionamento.endereco}\n`
  }
  
  content += `${line}\n`
  
  // Dados do ticket
  content += PRINTER_COMMANDS.LEFT
  content += PRINTER_COMMANDS.BOLD_ON
  content += 'COMPROVANTE DE ESTACIONAMENTO\n'
  content += PRINTER_COMMANDS.BOLD_OFF
  
  content += `${halfLine}\n`
  content += `Vaga: ${data.vaga}\n`
  content += `Placa: ${data.placa}\n`
  content += `Cliente: ${data.cliente || 'Avulso'}\n`
  content += `${halfLine}\n`
  content += `Entrada: ${data.entrada}\n`
  
  if (data.saida) {
    content += `Saida: ${data.saida}\n`
  }
  
  if (data.valor !== undefined) {
    content += `${halfLine}\n`
    content += PRINTER_COMMANDS.BOLD_ON
    content += PRINTER_COMMANDS.DOUBLE_WIDTH
    content += `VALOR: R$ ${data.valor.toFixed(2)}\n`
    content += PRINTER_COMMANDS.NORMAL_SIZE
    content += PRINTER_COMMANDS.BOLD_OFF
  }
  
  content += `${line}\n`
  
  // QR Code placeholder (se disponível)
  if (data.qrcode) {
    content += PRINTER_COMMANDS.CENTER
    content += 'QR Code do Ticket:\n'
    content += data.qrcode + '\n'
  }
  
  // Rodapé
  content += PRINTER_COMMANDS.CENTER
  content += `${halfLine}\n`
  content += 'Obrigado pela preferencia!\n'
  content += `Impresso em: ${new Date().toLocaleString('pt-BR')}\n`
  
  // Cortar papel
  content += PRINTER_COMMANDS.FEED(3)
  content += PRINTER_COMMANDS.CUT

  return content
}

/**
 * Gera conteúdo de ticket de entrada simplificado
 */
export function generateEntryTicket(data: {
  empresa: { nome: string }
  estacionamento: { nome: string }
  vaga: string
  placa: string
  entrada: string
  qrcode: string
}): string {
  const line = '='.repeat(32)
  const halfLine = '-'.repeat(32)

  let content = ''
  
  content += PRINTER_COMMANDS.INIT
  content += PRINTER_COMMANDS.CENTER
  content += PRINTER_COMMANDS.BOLD_ON
  content += PRINTER_COMMANDS.DOUBLE_HEIGHT
  content += `${data.empresa.nome}\n`
  content += PRINTER_COMMANDS.NORMAL_SIZE
  content += PRINTER_COMMANDS.BOLD_OFF
  
  content += `${halfLine}\n`
  content += 'TICKET DE ENTRADA\n'
  content += `${halfLine}\n`
  
  content += PRINTER_COMMANDS.LEFT
  content += `Vaga: ${data.vaga}\n`
  content += `Placa: ${data.placa}\n`
  content += `Entrada: ${data.entrada}\n`
  
  content += `${line}\n`
  content += PRINTER_COMMANDS.CENTER
  content += PRINTER_COMMANDS.BOLD_ON
  content += 'CODIGO DE ACESSO:\n'
  content += PRINTER_COMMANDS.DOUBLE_SIZE
  content += `${data.qrcode}\n`
  content += PRINTER_COMMANDS.NORMAL_SIZE
  content += PRINTER_COMMANDS.BOLD_OFF
  
  content += `${halfLine}\n`
  content += 'Apresente este codigo na saida\n'
  
  content += PRINTER_COMMANDS.FEED(3)
  content += PRINTER_COMMANDS.CUT

  return content
}

// Instância global da impressora
let printerInstance: ThermalPrinter | null = null

export function getPrinterInstance(): ThermalPrinter {
  if (!printerInstance) {
    printerInstance = new ThermalPrinter()
  }
  return printerInstance
}
