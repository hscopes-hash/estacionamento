import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  generateToken, 
  createDemoCompany, 
  authenticateUser,
  hashPassword
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha, iniciarDemo } = body

    console.log('[LOGIN] Request received:', { email, iniciarDemo })

    // Se for para iniciar demo
    if (iniciarDemo) {
      try {
        console.log('[LOGIN] Creating demo company...')
        
        // Criar ou obter empresa demo
        const empresa = await createDemoCompany()
        console.log('[LOGIN] Empresa criada/encontrada:', empresa.id)
        
        // Buscar usuário demo criado
        const usuarioDemo = await db.usuario.findFirst({
          where: { 
            email: 'admin@demo.com',
            empresaId: empresa.id 
          }
        })

        if (!usuarioDemo) {
          console.error('[LOGIN] Usuário demo não encontrado')
          return NextResponse.json(
            { error: 'Erro ao criar usuário demo' },
            { status: 500 }
          )
        }

        console.log('[LOGIN] Usuário demo encontrado:', usuarioDemo.id)

        // Gerar token JWT
        const token = generateToken({
          id: usuarioDemo.id,
          email: usuarioDemo.email,
          nome: usuarioDemo.nome,
          nivel: usuarioDemo.nivel,
          empresaId: usuarioDemo.empresaId,
        })

        // Criar estacionamento demo se não existir
        let estacionamento = await db.estacionamento.findFirst({
          where: { empresaId: empresa.id }
        })

        if (!estacionamento) {
          console.log('[LOGIN] Criando estacionamento demo...')
          estacionamento = await db.estacionamento.create({
            data: {
              empresaId: empresa.id,
              nome: 'Estacionamento Central',
              descricao: 'Estacionamento de demonstração',
              endereco: 'Rua Principal, 123',
              cidade: 'São Paulo',
              estado: 'SP',
              totalVagas: 20,
              tipo: 'FIXO',
              valorHora: 10.0,
              valorFracao: 2.5,
              toleranciaMinutos: 15,
            }
          })

          // Criar vagas
          console.log('[LOGIN] Criando vagas...')
          const vagas = []
          for (let i = 1; i <= 20; i++) {
            vagas.push({
              estacionamentoId: estacionamento.id,
              numero: `A${i.toString().padStart(2, '0')}`,
              setor: 'A',
              tipo: 'COMUM',
              status: 'DISPONIVEL',
            })
          }
          await db.vaga.createMany({ data: vagas })

          // Criar alguns clientes demo
          console.log('[LOGIN] Criando clientes demo...')
          await db.cliente.createMany({
            data: [
              {
                empresaId: empresa.id,
                nome: 'João Silva',
                telefone: '(11) 99999-1111',
                tipo: 'AVULSO',
              },
              {
                empresaId: empresa.id,
                nome: 'Maria Santos',
                telefone: '(11) 99999-2222',
                tipo: 'MENSALISTA',
              },
            ]
          })
        }

        console.log('[LOGIN] Demo criado com sucesso!')

        return NextResponse.json({
          usuario: {
            id: usuarioDemo.id,
            empresaId: usuarioDemo.empresaId,
            nome: usuarioDemo.nome,
            email: usuarioDemo.email,
            nivel: usuarioDemo.nivel,
          },
          empresa: {
            id: empresa.id,
            nome: empresa.nome,
            plano: empresa.plano,
            dataFimTrial: empresa.dataFimTrial,
          },
          token,
          isDemo: true,
        })
      } catch (demoError) {
        console.error('[LOGIN] Erro ao criar demo:', demoError)
        return NextResponse.json(
          { error: `Erro ao criar demonstração: ${demoError instanceof Error ? demoError.message : 'Erro desconhecido'}` },
          { status: 500 }
        )
      }
    }

    // Login normal
    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await authenticateUser(email, senha)

    if (!result || !result.usuario) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    if (result.trialExpired) {
      return NextResponse.json(
        { error: 'Período de teste expirado' },
        { status: 401 }
      )
    }

    // Gerar token JWT
    const token = generateToken({
      id: result.usuario.id,
      email: result.usuario.email,
      nome: result.usuario.nome,
      nivel: result.usuario.nivel,
      empresaId: result.usuario.empresaId,
    })

    return NextResponse.json({
      usuario: {
        id: result.usuario.id,
        empresaId: result.usuario.empresaId,
        nome: result.usuario.nome,
        email: result.usuario.email,
        nivel: result.usuario.nivel,
      },
      empresa: {
        id: result.usuario.empresa.id,
        nome: result.usuario.empresa.nome,
        plano: result.usuario.empresa.plano,
        dataFimTrial: result.usuario.empresa.dataFimTrial,
      },
      token,
      isDemo: false,
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
