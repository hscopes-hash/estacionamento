/**
 * Utilitário para impressão em impressoras térmicas via Bluetooth
 * Compatível com padrão ESC/POS
 */

// Caracteres de controle ESC/POS
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

// Comandos ESC/POS comuns
export const ESC_POS = {
  // Inicializar impressora
  INIT: [ESC, 0x40],
  
  // Alinhamento
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  
  // Formatação de texto
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x01],
  DOUBLE_HEIGHT_WIDTH_ON: [GS, 0x21, 0x11],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  
  // Tamanho da fonte
  FONT_SMALL: [ESC, 0x21, 0x01],
  FONT_NORMAL: [ESC, 0x21, 0x00],
  
  // Espaçamento
  LINE_SPACING_24: [ESC, 0x33, 24],
  LINE_SPACING_30: [ESC, 0x33, 30],
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  
  // Corte de papel
  CUT_PAPER: [GS, 0x56, 0x00],
  CUT_PAPER_PARTIAL: [GS, 0x56, 0x01],
  
  // Avanço de papel
  FEED_3_LINES: [ESC, 0x64, 3],
  FEED_5_LINES: [ESC, 0x64, 5],
  
  // beep
  BEEP: [ESC, 0x42, 3, 2],
}

// Codificação para caracteres especiais portugueses/brasileiros
function encodeText(text: string): Uint8Array {
  // Substituir caracteres especiais
  const normalized = text
    .replace(/á/g, 'a').replace(/Á/g, 'A')
    .replace(/à/g, 'a').replace(/À/g, 'A')
    .replace(/ã/g, 'a').replace(/Ã/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/é/g, 'e').replace(/É/g, 'E')
    .replace(/ê/g, 'e').replace(/Ê/g, 'E')
    .replace(/í/g, 'i').replace(/Í/g, 'I')
    .replace(/ó/g, 'o').replace(/Ó/g, 'O')
    .replace(/õ/g, 'o').replace(/Õ/g, 'O')
    .replace(/ô/g, 'o').replace(/Ô/g, 'O')
    .replace(/ú/g, 'u').replace(/Ú/g, 'U')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/°/g, 'o').replace(/º/g, 'o')
    .replace(/ª/g, 'a')
  
  return new TextEncoder().encode(normalized)
}

// Construtor de comandos de impressão
export class ThermalPrinterBuilder {
  private data: number[] = []

  constructor() {
    // Inicializar impressora
    this.data.push(...ESC_POS.INIT)
  }

  // Adicionar comandos raw
  addCommand(command: number[]): this {
    this.data.push(...command)
    return this
  }

  // Adicionar texto
  addText(text: string): this {
    const encoded = encodeText(text)
    this.data.push(...Array.from(encoded))
    return this
  }

  // Adicionar linha
  addLine(text: string = ''): this {
    if (text) {
      this.addText(text)
    }
    this.data.push(LF)
    return this
  }

  // Adicionar linha em branco
  addBlankLine(): this {
    this.data.push(LF)
    return this
  }

  // Adicionar linha separadora
  addSeparator(char: string = '-'): this {
    const line = char.repeat(32)
    return this.addLine(line)
  }

  // Adicionar linha dupla separadora
  addDoubleSeparator(char: string = '='): this {
    const line = char.repeat(32)
    return this.addLine(line)
  }

  // Centralizar texto
  alignCenter(): this {
    this.data.push(...ESC_POS.ALIGN_CENTER)
    return this
  }

  // Alinhar à esquerda
  alignLeft(): this {
    this.data.push(...ESC_POS.ALIGN_LEFT)
    return this
  }

  // Alinhar à direita
  alignRight(): this {
    this.data.push(...ESC_POS.ALIGN_RIGHT)
    return this
  }

  // Texto em negrito
  bold(on: boolean = true): this {
    this.data.push(...(on ? ESC_POS.BOLD_ON : ESC_POS.BOLD_OFF))
    return this
  }

  // Texto com tamanho duplo
  doubleSize(on: boolean = true): this {
    this.data.push(...(on ? ESC_POS.DOUBLE_HEIGHT_WIDTH_ON : ESC_POS.NORMAL_SIZE))
    return this
  }

  // Altura dupla
  doubleHeight(on: boolean = true): this {
    this.data.push(...(on ? ESC_POS.DOUBLE_HEIGHT_ON : ESC_POS.NORMAL_SIZE))
    return this
  }

  // Largura dupla
  doubleWidth(on: boolean = true): this {
    this.data.push(...(on ? ESC_POS.DOUBLE_WIDTH_ON : ESC_POS.NORMAL_SIZE))
    return this
  }

  // Alimentar papel
  feed(lines: number = 3): this {
    this.data.push(ESC, 0x64, lines)
    return this
  }

  // Cortar papel
  cut(partial: boolean = false): this {
    this.feed(3)
    this.data.push(...(partial ? ESC_POS.CUT_PAPER_PARTIAL : ESC_POS.CUT_PAPER))
    return this
  }

  // Beep
  beep(): this {
    this.data.push(...ESC_POS.BEEP)
    return this
  }

  // Construir dados finais
  build(): Uint8Array {
    return new Uint8Array(this.data)
  }

  // Converter para base64
  toBase64(): string {
    const data = this.build()
    let binary = ''
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i])
    }
    return btoa(binary)
  }
}

// Interface do comprovante
export interface ReceiptData {
  empresa: {
    nome: string
    cnpj?: string
    endereco?: string
  }
  estacionamento: {
    nome: string
  }
  vaga: string
  placa: string
  cliente?: string
  entrada: string
  saida?: string
  tempo?: number
  valor?: number
  formaPagamento?: string
  qrcode?: string
}

// Gerar comprovante de entrada
export function generateEntryReceipt(data: ReceiptData): Uint8Array {
  const builder = new ThermalPrinterBuilder()
  
  builder
    .alignCenter()
    .bold().doubleHeight().addLine(data.empresa.nome)
    .bold(false).doubleHeight(false)
  
  if (data.empresa.cnpj) {
    builder.addLine(`CNPJ: ${data.empresa.cnpj}`)
  }
  
  if (data.empresa.endereco) {
    builder.addLine(data.empresa.endereco)
  }
  
  builder
    .addSeparator()
    .addLine('COMPROVANTE DE ENTRADA')
    .addSeparator()
    .alignLeft()
    .addLine(`Estacionamento: ${data.estacionamento.nome}`)
    .addLine(`Vaga: ${data.vaga}`)
    .addLine(`Placa: ${data.placa}`)
    .addLine(`Cliente: ${data.cliente || 'Avulso'}`)
    .addLine(`Entrada: ${data.entrada}`)
    .addSeparator()
    .alignCenter()
    .bold().addLine('Guarde este comprovante!')
    .bold(false)
    .addLine('Apresente-o no momento da saida')
    .addBlankLine()
    .cut()
  
  return builder.build()
}

// Gerar comprovante de saída
export function generateExitReceipt(data: ReceiptData): Uint8Array {
  const builder = new ThermalPrinterBuilder()
  
  builder
    .alignCenter()
    .bold().doubleHeight().addLine(data.empresa.nome)
    .bold(false).doubleHeight(false)
  
  if (data.empresa.cnpj) {
    builder.addLine(`CNPJ: ${data.empresa.cnpj}`)
  }
  
  if (data.empresa.endereco) {
    builder.addLine(data.empresa.endereco)
  }
  
  builder
    .addSeparator()
    .addLine('COMPROVANTE DE SAIDA')
    .addSeparator()
    .alignLeft()
    .addLine(`Estacionamento: ${data.estacionamento.nome}`)
    .addLine(`Vaga: ${data.vaga}`)
    .addLine(`Placa: ${data.placa}`)
    .addLine(`Cliente: ${data.cliente || 'Avulso'}`)
    .addLine(`Entrada: ${data.entrada}`)
    .addLine(`Saida: ${data.saida || new Date().toLocaleString('pt-BR')}`)
    .addLine(`Tempo: ${data.tempo || 0} minutos`)
    .addSeparator()
    .alignRight()
    .bold().doubleWidth().addLine(`R$ ${(data.valor || 0).toFixed(2)}`)
    .bold(false).doubleWidth(false)
    .addSeparator()
    .alignLeft()
    .addLine(`Pagamento: ${data.formaPagamento || '-'}`)
    .addSeparator()
    .alignCenter()
    .addLine('Obrigado pela preferencia!')
    .addBlankLine()
    .cut()
  
  return builder.build()
}

// Enviar dados para impressora Bluetooth
export async function printToBluetooth(
  device: BluetoothDevice,
  data: Uint8Array
): Promise<boolean> {
  try {
    if (!device.gatt) {
      throw new Error('GATT não disponível')
    }

    const server = await device.gatt.connect()
    
    // Tentar encontrar o serviço de impressão
    // Serviço comum para impressoras térmicas
    const serviceUuid = '000018f0-0000-1000-8000-00805f9b34fb'
    const characteristicUuid = '00002af1-0000-1000-8000-00805f9b34fb'
    
    try {
      const service = await server.getPrimaryService(serviceUuid)
      const characteristic = await service.getCharacteristic(characteristicUuid)
      
      // Enviar dados em chunks (muitas impressoras têm limite de tamanho)
      const chunkSize = 100
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        await characteristic.writeValue(chunk)
        // Pequena pausa entre chunks
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      return true
    } catch {
      // Tentar serviço alternativo (Serial Port Profile)
      const sppServiceUuid = '49535343-fe7d-4ae5-8fa9-9fafd205e455'
      const sppCharacteristicUuid = '49535343-8841-43f4-a8d4-ecbe34729bb3'
      
      const service = await server.getPrimaryService(sppServiceUuid)
      const characteristic = await service.getCharacteristic(sppCharacteristicUuid)
      
      const chunkSize = 100
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize)
        await characteristic.writeValue(chunk)
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      return true
    }
  } catch (error) {
    console.error('Erro ao imprimir via Bluetooth:', error)
    return false
  }
}
