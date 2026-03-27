import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Buscar cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cliente = await db.cliente.findUnique({
      where: { id },
      include: {
        veiculos: { where: { ativo: true } }
      }
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const cliente = await db.cliente.update({
      where: { id },
      data: {
        nome: data.nome,
        cpfCnpj: data.cpfCnpj,
        email: data.email,
        telefone: data.telefone,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
        tipo: data.tipo,
        observacoes: data.observacoes,
        ativo: data.ativo,
      },
      include: { veiculos: true }
    })

    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Excluir cliente (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cliente = await db.cliente.update({
      where: { id },
      data: { ativo: false }
    })

    return NextResponse.json({ success: true, cliente })
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
