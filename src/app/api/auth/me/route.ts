import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const usuario = await db.usuario.findUnique({
      where: { id: payload.id },
      include: { empresa: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        nivel: usuario.nivel,
        empresaId: usuario.empresaId,
        empresa: {
          id: usuario.empresa.id,
          nome: usuario.empresa.nome,
          plano: usuario.empresa.plano,
          dataFimTrial: usuario.empresa.dataFimTrial,
        }
      }
    })
  } catch (error) {
    console.error('Erro ao verificar token:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
