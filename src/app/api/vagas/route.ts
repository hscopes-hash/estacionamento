import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// Listar vagas de um estacionamento
export async function GET(request: NextRequest) {
  try {
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

    if (!estacionamentoId) {
      return NextResponse.json({ error: 'ID do estacionamento é obrigatório' }, { status: 400 })
    }

    const vagas = await db.vaga.findMany({
      where: { estacionamentoId },
      include: {
        movimentacoes: {
          where: { status: { in: ['ABERTO', 'PAGO'] } },
          take: 1,
          orderBy: { dataEntrada: 'desc' },
          include: { cliente: true }
        }
      },
      orderBy: { numero: 'asc' }
    })

    const vagasComStatus = vagas.map(vaga => ({
      ...vaga,
      ocupada: vaga.status === 'OCUPADA',
      movimentacaoAtual: vaga.movimentacoes[0] ? {
        id: vaga.movimentacoes[0].id,
        placa: vaga.movimentacoes[0].placa,
        clienteNome: vaga.movimentacoes[0].clienteNome,
        dataEntrada: vaga.movimentacoes[0].dataEntrada,
        status: vaga.movimentacoes[0].status,
        formaPagamento: vaga.movimentacoes[0].formaPagamento,
        valorPago: vaga.movimentacoes[0].valorPago,
      } : null
    }))

    return NextResponse.json({ vagas: vagasComStatus })
  } catch (error) {
    console.error('Erro ao listar vagas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
