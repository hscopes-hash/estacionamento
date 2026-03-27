import { NextResponse } from 'next/server'
import { createDemoCompany } from '@/lib/auth'

export async function POST() {
  try {
    const empresa = await createDemoCompany()
    
    return NextResponse.json({
      success: true,
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        plano: empresa.plano,
        dataFimTrial: empresa.dataFimTrial,
      },
      credentials: {
        email: 'admin@demo.com',
        password: 'admin123'
      }
    })
  } catch (error) {
    console.error('Erro ao criar demo:', error)
    return NextResponse.json(
      { error: 'Erro ao criar empresa demo' },
      { status: 500 }
    )
  }
}
