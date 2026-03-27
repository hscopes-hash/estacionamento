import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// Buscar último registro de movimento por placa
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação via JWT
    let authHeader = request.headers.get('authorization')
    if (!authHeader) {
      authHeader = request.headers.get('Authorization')
    }
    
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

    const { searchParams } = new URL(request.url)
    const placa = searchParams.get('placa')

    if (!placa || placa.length < 7) {
      return NextResponse.json({ found: false })
    }

    const placaUpper = placa.toUpperCase()

    // Buscar o último movimento com essa placa na empresa
    const ultimoMovimento = await db.movimentacao.findFirst({
      where: {
        placa: placaUpper,
        estacionamento: {
          empresaId
        }
      },
      orderBy: {
        dataEntrada: 'desc'
      }
    })

    // Buscar cliente que possui essa placa
    const veiculoComCliente = await db.veiculo.findFirst({
      where: {
        placa: placaUpper,
        ativo: true
      },
      include: {
        cliente: {
          where: {
            empresaId,
            ativo: true
          }
        }
      }
    })

    // Contar histórico de visitas
    const totalVisitas = await db.movimentacao.count({
      where: {
        placa: placaUpper,
        estacionamento: { empresaId }
      }
    })

    // Montar resposta
    const resultado: {
      found: boolean
      cliente?: {
        id: string
        nome: string
        telefone: string | null
        tipo: string
      }
      veiculo?: {
        id: string
        placa: string
        marca: string | null
        modelo: string | null
        cor: string | null
      }
      tipoCliente?: string
      clienteNome?: string | null
      historico?: {
        totalVisitas: number
        ultimaVisita: Date | null
      }
    } = { found: false }

    if (veiculoComCliente && veiculoComCliente.cliente) {
      resultado.found = true
      resultado.cliente = {
        id: veiculoComCliente.cliente.id,
        nome: veiculoComCliente.cliente.nome,
        telefone: veiculoComCliente.cliente.telefone,
        tipo: veiculoComCliente.cliente.tipo
      }
      resultado.veiculo = {
        id: veiculoComCliente.id,
        placa: veiculoComCliente.placa,
        marca: veiculoComCliente.marca,
        modelo: veiculoComCliente.modelo,
        cor: veiculoComCliente.cor
      }
      resultado.tipoCliente = veiculoComCliente.cliente.tipo
      resultado.historico = {
        totalVisitas,
        ultimaVisita: ultimoMovimento?.dataEntrada || null
      }
    } else if (ultimoMovimento) {
      // Tem histórico mas não tem cliente/veículo cadastrado
      resultado.found = true
      resultado.tipoCliente = ultimoMovimento.tipoCliente
      resultado.clienteNome = ultimoMovimento.clienteNome
      resultado.historico = {
        totalVisitas,
        ultimaVisita: ultimoMovimento.dataEntrada
      }
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro ao buscar placa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
