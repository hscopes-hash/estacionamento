import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { createParkingLotWithSpaces } from '@/lib/parking'

// Listar estacionamentos
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

    const estacionamentos = await db.estacionamento.findMany({
      where: { empresaId: payload.empresaId },
      include: {
        _count: {
          select: { vagas: true, movimentacoes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ estacionamentos })
  } catch (error) {
    console.error('Erro ao listar estacionamentos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Criar estacionamento
export async function POST(request: NextRequest) {
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

    const data = await request.json()
    const { nome, totalVagas, tipo, valorHora, valorFracao, toleranciaMinutos, endereco, cidade } = data

    if (!nome || !totalVagas) {
      return NextResponse.json({ error: 'Nome e total de vagas são obrigatórios' }, { status: 400 })
    }

    const estacionamento = await createParkingLotWithSpaces(
      payload.empresaId,
      nome,
      parseInt(totalVagas),
      tipo || 'FIXO',
      parseFloat(valorHora) || 10,
      parseFloat(valorFracao) || 0,
      parseInt(toleranciaMinutos) || 15
    )

    // Atualizar com dados adicionais
    if (endereco || cidade) {
      await db.estacionamento.update({
        where: { id: estacionamento.id },
        data: { endereco, cidade }
      })
    }

    return NextResponse.json({ estacionamento })
  } catch (error) {
    console.error('Erro ao criar estacionamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
