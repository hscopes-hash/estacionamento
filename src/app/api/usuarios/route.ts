import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

// Listar usuários
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.nivel !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const usuarios = await db.usuario.findMany({
      where: { empresaId: payload.empresaId },
      select: {
        id: true,
        nome: true,
        email: true,
        nivel: true,
        ativo: true,
        ultimoAcesso: true,
        createdAt: true,
      },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json({ usuarios })
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Criar usuário
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.nivel !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const data = await request.json()

    // Verificar se email já existe
    const existe = await db.usuario.findUnique({
      where: { email: data.email }
    })

    if (existe) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(data.senha)

    const usuario = await db.usuario.create({
      data: {
        empresaId: payload.empresaId,
        nome: data.nome,
        email: data.email,
        senha: hashedPassword,
        nivel: data.nivel || 'OPERADOR',
        telefone: data.telefone,
      }
    })

    return NextResponse.json({ 
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel,
      }
    })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
