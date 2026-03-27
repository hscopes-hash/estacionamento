import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação via JWT
    const authHeader = request.headers.get('authorization')
    console.log('[clientes GET] authHeader:', authHeader ? 'presente' : 'ausente')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[clientes GET] Erro: header não começa com Bearer')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    console.log('[clientes GET] payload:', payload ? 'válido' : 'inválido')

    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const empresaId = payload.empresaId
    console.log('[clientes GET] empresaId:', empresaId)
    
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada no token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: Record<string, unknown> = { empresaId, ativo: true }
    
    if (search) {
      where.OR = [
        { nome: { contains: search } },
        { cpfCnpj: { contains: search } },
        { telefone: { contains: search } },
      ]
    }

    const clientes = await db.cliente.findMany({
      where,
      include: {
        veiculos: { where: { ativo: true } }
      },
      orderBy: { nome: 'asc' },
      take: 50,
    })

    return NextResponse.json({ clientes })
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar cliente
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

    const empresaId = payload.empresaId
    
    if (!empresaId) {
      return NextResponse.json({ error: 'Empresa não encontrada no token' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const cliente = await db.cliente.create({
      data: {
        empresaId,
        nome: data.nome,
        cpfCnpj: data.cpfCnpj,
        email: data.email,
        telefone: data.telefone,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
        tipo: data.tipo || 'AVULSO',
        observacoes: data.observacoes,
      },
      include: { veiculos: true }
    })

    // Criar veículo se informado
    if (data.placa) {
      await db.veiculo.create({
        data: {
          clienteId: cliente.id,
          placa: data.placa.toUpperCase(),
          marca: data.marca,
          modelo: data.modelo,
          cor: data.cor,
        }
      })
    }

    return NextResponse.json({ cliente })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
