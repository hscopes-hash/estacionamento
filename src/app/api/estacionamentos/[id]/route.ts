import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Buscar estacionamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const estacionamento = await db.estacionamento.findUnique({
      where: { id },
      include: {
        vagas: {
          orderBy: { numero: 'asc' }
        }
      }
    })

    if (!estacionamento) {
      return NextResponse.json({ error: 'Estacionamento não encontrado' }, { status: 404 })
    }

    return NextResponse.json(estacionamento)
  } catch (error) {
    console.error('Erro ao buscar estacionamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar estacionamento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const estacionamento = await db.estacionamento.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
        tipo: data.tipo,
        valorHora: parseFloat(data.valorHora) || 0,
        valorFracao: parseFloat(data.valorFracao) || 0,
        valorPernoite: parseFloat(data.valorPernoite) || 0,
        toleranciaMinutos: parseInt(data.toleranciaMinutos) || 15,
        horaAbertura: data.horaAbertura,
        horaFechamento: data.horaFechamento,
        ativo: data.ativo,
      }
    })

    return NextResponse.json(estacionamento)
  } catch (error) {
    console.error('Erro ao atualizar estacionamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Excluir estacionamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.estacionamento.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir estacionamento:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
