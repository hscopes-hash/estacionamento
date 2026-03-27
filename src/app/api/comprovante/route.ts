import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// Gerar comprovante com QR Code
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

    const { movimentacaoId } = await request.json()

    const movimentacao = await db.movimentacao.findUnique({
      where: { id: movimentacaoId },
      include: {
        vaga: true,
        cliente: true,
        estacionamento: {
          include: { empresa: true }
        }
      }
    })

    if (!movimentacao) {
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 })
    }

    // Gerar QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(movimentacao.qrcode || '', {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })

    // Formatar data e hora
    const formatDateTime = (date: Date) => {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(date))
    }

    const comprovante = {
      empresa: {
        nome: movimentacao.estacionamento.empresa.nome,
        cnpj: movimentacao.estacionamento.empresa.cnpj,
      },
      estacionamento: {
        nome: movimentacao.estacionamento.nome,
        endereco: movimentacao.estacionamento.endereco,
      },
      vaga: movimentacao.vaga.numero,
      placa: movimentacao.placa,
      cliente: movimentacao.clienteNome || movimentacao.cliente?.nome || 'Avulso',
      entrada: formatDateTime(movimentacao.dataEntrada),
      qrcode: movimentacao.qrcode,
      qrcodeImage: qrCodeDataUrl,
    }

    return NextResponse.json({ comprovante })
  } catch (error) {
    console.error('Erro ao gerar comprovante:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
