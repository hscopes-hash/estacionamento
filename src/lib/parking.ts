import { db } from './db'
import { randomBytes } from 'crypto'

// Gerar hash único para QR Code
export function generateQRCodeHash(): string {
  return randomBytes(16).toString('hex')
}

// Calcular valor do estacionamento
export function calculateParkingFee(
  entryTime: Date,
  exitTime: Date,
  valorHora: number,
  valorFracao: number,
  toleranciaMinutos: number
): { tempoMinutos: number; valor: number } {
  const diffMs = exitTime.getTime() - entryTime.getTime()
  let tempoMinutos = Math.ceil(diffMs / (1000 * 60))

  // Descontar tolerância
  if (tempoMinutos <= toleranciaMinutos) {
    return { tempoMinutos, valor: 0 }
  }

  tempoMinutos -= toleranciaMinutos

  // Calcular valor
  let valor = 0
  if (valorFracao > 0) {
    // Cobrar por fração (ex: 15 min)
    const fracoes = Math.ceil(tempoMinutos / 15)
    valor = fracoes * valorFracao
  } else if (valorHora > 0) {
    // Cobrar por hora
    const horas = Math.ceil(tempoMinutos / 60)
    valor = horas * valorHora
  }

  return { tempoMinutos, valor }
}

// Obter status das vagas de um estacionamento
export async function getParkingLotStatus(estacionamentoId: string) {
  const vagas = await db.vaga.findMany({
    where: { estacionamentoId },
    orderBy: [{ setor: 'asc' }, { numero: 'asc' }],
    include: {
      movimentacoes: {
        where: { status: 'ABERTO' },
        take: 1,
        orderBy: { dataEntrada: 'desc' }
      }
    }
  })

  return vagas.map(vaga => ({
    ...vaga,
    ocupada: vaga.status === 'OCUPADA',
    movimentacaoAtual: vaga.movimentacoes[0] || null
  }))
}

// Criar estacionamento com vagas
export async function createParkingLotWithSpaces(
  empresaId: string,
  nome: string,
  totalVagas: number,
  tipo: 'FIXO' | 'EVENTO' = 'FIXO',
  valorHora: number = 10,
  valorFracao: number = 0,
  toleranciaMinutos: number = 15
) {
  const estacionamento = await db.estacionamento.create({
    data: {
      empresaId,
      nome,
      totalVagas,
      tipo,
      valorHora,
      valorFracao,
      toleranciaMinutos,
      ativo: true,
    }
  })

  // Criar vagas
  const vagasData = []
  for (let i = 1; i <= totalVagas; i++) {
    vagasData.push({
      estacionamentoId: estacionamento.id,
      numero: String(i).padStart(3, '0'),
      status: 'DISPONIVEL',
      tipo: 'COMUM'
    })
  }

  await db.vaga.createMany({ data: vagasData })

  return estacionamento
}

// Registrar entrada de veículo
export async function registerEntry(
  estacionamentoId: string,
  vagaId: string,
  usuarioId: string,
  placa: string,
  clienteId?: string,
  clienteNome?: string,
  tipoCliente: string = 'AVULSO',
  fotoEntrada?: string
) {
  // Verificar se a vaga está disponível
  const vaga = await db.vaga.findUnique({ where: { id: vagaId } })
  if (!vaga || vaga.status !== 'DISPONIVEL') {
    throw new Error('Vaga não disponível')
  }

  const qrcode = generateQRCodeHash()

  const movimentacao = await db.movimentacao.create({
    data: {
      estacionamentoId,
      vagaId,
      usuarioEntradaId: usuarioId,
      clienteId,
      clienteNome,
      placa: placa.toUpperCase(),
      tipoCliente,
      fotoEntrada,
      qrcode,
      status: 'ABERTO',
    }
  })

  // Atualizar status da vaga
  await db.vaga.update({
    where: { id: vagaId },
    data: { status: 'OCUPADA' }
  })

  return movimentacao
}

// Registrar saída de veículo
export async function registerExit(
  movimentacaoId: string,
  usuarioId: string,
  formaPagamento?: string
) {
  const movimentacao = await db.movimentacao.findUnique({
    where: { id: movimentacaoId },
    include: { estacionamento: true, vaga: true }
  })

  if (!movimentacao || movimentacao.status !== 'ABERTO') {
    throw new Error('Movimentação não encontrada ou já finalizada')
  }

  const now = new Date()
  const { tempoMinutos, valor } = calculateParkingFee(
    movimentacao.dataEntrada,
    now,
    movimentacao.estacionamento.valorHora,
    movimentacao.estacionamento.valorFracao,
    movimentacao.estacionamento.toleranciaMinutos
  )

  const updated = await db.movimentacao.update({
    where: { id: movimentacaoId },
    data: {
      dataSaida: now,
      usuarioSaidaId: usuarioId,
      tempoPermanencia: tempoMinutos,
      valorTotal: valor,
      formaPagamento,
      status: 'FECHADO',
    }
  })

  // Liberar a vaga
  await db.vaga.update({
    where: { id: movimentacao.vagaId },
    data: { status: 'DISPONIVEL' }
  })

  return updated
}

// Buscar movimentação por QR Code
export async function findByQRCode(qrcode: string) {
  return db.movimentacao.findFirst({
    where: { qrcode, status: 'ABERTO' },
    include: { 
      estacionamento: true, 
      vaga: true, 
      cliente: true 
    }
  })
}
