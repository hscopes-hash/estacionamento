import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// Atualizar status da vaga
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const data = await request.json()

    const vaga = await db.vaga.update({
      where: { id },
      data: {
        status: data.status,
        tipo: data.tipo,
      }
    })

    return NextResponse.json({ vaga })
  } catch (error) {
    console.error('Erro ao atualizar vaga:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
