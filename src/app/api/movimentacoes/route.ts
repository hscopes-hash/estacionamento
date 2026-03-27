import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'
import { calculateParkingFee } from '@/lib/parking'
import QRCode from 'qrcode'

// GET - Listar movimentações
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação via JWT
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const estacionamentoId = searchParams.get('estacionamentoId')
    const status = searchParams.get('status')
    const placa = searchParams.get('placa')
    const qrcode = searchParams.get('qrcode')

    // Buscar por QR Code
    if (qrcode) {
      const movimentacao = await db.movimentacao.findFirst({
        where: { qrcode, status: 'ABERTO' },
        include: {
          vaga: true,
          cliente: true,
          estacionamento: true,
          usuarioEntrada: { select: { id: true, nome: true } },
        }
      })

      if (!movimentacao) {
        return NextResponse.json({ error: 'QR Code não encontrado ou já utilizado' }, { status: 404 })
      }

      // Calcular valor atual
      const calculo = calculateParkingFee(
        movimentacao.dataEntrada,
        new Date(),
        movimentacao.estacionamento.valorHora,
        movimentacao.estacionamento.valorFracao,
        movimentacao.estacionamento.toleranciaMinutos
      )

      return NextResponse.json({ movimentacao, calculo })
    }

    const where: Record<string, unknown> = {}
    
    if (estacionamentoId) {
      where.estacionamentoId = estacionamentoId
    }
    
    if (status) {
      where.status = status
    }

    if (placa) {
      where.placa = { contains: placa.toUpperCase() }
    }

    const movimentacoes = await db.movimentacao.findMany({
      where,
      include: {
        vaga: true,
        cliente: true,
        veiculo: true,
        usuarioEntrada: { select: { id: true, nome: true } },
        usuarioSaida: { select: { id: true, nome: true } },
        estacionamento: { select: { id: true, nome: true, valorHora: true, valorFracao: true, toleranciaMinutos: true } }
      },
      orderBy: { dataEntrada: 'desc' },
      take: 100,
    })

    return NextResponse.json({ movimentacoes })
  } catch (error) {
    console.error('Erro ao listar movimentações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Registrar entrada ou saída
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação via JWT
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const data = await request.json()

    // Registrar entrada
    if (data.acao === 'entrada') {
      // Verificar se a vaga está disponível
      const vaga = await db.vaga.findUnique({ where: { id: data.vagaId } })
      if (!vaga || vaga.status !== 'DISPONIVEL') {
        return NextResponse.json({ error: 'Vaga não disponível' }, { status: 400 })
      }

      // Gerar QRCode
      const qrcode = randomBytes(16).toString('hex')

      // Criar movimentação
      const movimentacao = await db.movimentacao.create({
        data: {
          estacionamentoId: data.estacionamentoId,
          vagaId: data.vagaId,
          clienteId: data.clienteId || null,
          usuarioEntradaId: payload.id,
          placa: data.placa.toUpperCase(),
          clienteNome: data.clienteNome || 'Avulso',
          tipoCliente: data.tipoCliente || 'AVULSO',
          dataEntrada: new Date(),
          status: 'ABERTO',
          qrcode,
          fotoEntrada: data.fotoEntrada || null,
        },
        include: {
          vaga: true,
          cliente: true,
          estacionamento: {
            include: { empresa: true }
          },
        }
      })

      // Atualizar status da vaga
      await db.vaga.update({
        where: { id: data.vagaId },
        data: { status: 'OCUPADA' }
      })

      // Gerar QR Code como imagem base64 para o comprovante
      const qrCodeDataUrl = await QRCode.toDataURL(qrcode, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })

      // Formatar data/hora
      const formatDateTime = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(date))
      }

      // Retornar comprovante completo de entrada
      return NextResponse.json({ 
        success: true,
        comprovante: {
          tipo: 'entrada',
          empresa: {
            nome: movimentacao.estacionamento.empresa.nome,
            cnpj: movimentacao.estacionamento.empresa.cnpj,
          },
          estacionamento: {
            nome: movimentacao.estacionamento.nome,
            endereco: movimentacao.estacionamento.endereco,
          },
          vaga: { numero: movimentacao.vaga.numero },
          placa: movimentacao.placa,
          clienteNome: movimentacao.clienteNome,
          dataEntrada: movimentacao.dataEntrada,
          entradaFormatada: formatDateTime(movimentacao.dataEntrada),
          qrcode: movimentacao.qrcode,
          qrcodeImage: qrCodeDataUrl,
        },
        movimentacao
      })
    }

    // Registrar saída
    if (data.acao === 'saida') {
      const movimentacao = await db.movimentacao.findUnique({
        where: { id: data.movimentacaoId },
        include: { 
          estacionamento: { include: { empresa: true } }, 
          vaga: true,
          cliente: true
        }
      })

      if (!movimentacao || movimentacao.status !== 'ABERTO') {
        return NextResponse.json({ error: 'Movimentação não encontrada ou já finalizada' }, { status: 400 })
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
        where: { id: data.movimentacaoId },
        data: {
          dataSaida: now,
          usuarioSaidaId: payload.id,
          tempoPermanencia: tempoMinutos,
          valorTotal: valor,
          formaPagamento: data.formaPagamento,
          status: 'FECHADO',
        }
      })

      // Liberar a vga
      await db.vaga.update({
        where: { id: movimentacao.vagaId },
        data: { status: 'DISPONIVEL' }
      })

      // Formatar data/hora
      const formatDateTime = (date: Date) => {
        return new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(date))
      }

      // Formatar tempo de permanência
      const formatarTempo = (minutos: number) => {
        const horas = Math.floor(minutos / 60)
        const mins = minutos % 60
        return `${horas}h ${mins}min`
      }

      // Retornar comprovante completo de saída
      return NextResponse.json({ 
        success: true,
        comprovante: {
          tipo: 'saida',
          empresa: {
            nome: movimentacao.estacionamento.empresa.nome,
            cnpj: movimentacao.estacionamento.empresa.cnpj,
          },
          estacionamento: {
            nome: movimentacao.estacionamento.nome,
            endereco: movimentacao.estacionamento.endereco,
          },
          vaga: { numero: movimentacao.vaga.numero },
          placa: movimentacao.placa,
          clienteNome: movimentacao.clienteNome || movimentacao.cliente?.nome || 'Avulso',
          dataEntrada: movimentacao.dataEntrada,
          entradaFormatada: formatDateTime(movimentacao.dataEntrada),
          dataSaida: now,
          saidaFormatada: formatDateTime(now),
          tempoPermanencia: formatarTempo(tempoMinutos),
          valorTotal: valor,
          formaPagamento: data.formaPagamento,
          qrcode: movimentacao.qrcode,
        },
        movimentacao: updated
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao processar movimentação:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno' 
    }, { status: 500 })
  }
}
