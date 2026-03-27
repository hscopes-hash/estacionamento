import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

// GET - Obter informações do banco de dados atual
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload || payload.nivel !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado. Apenas ADMIN pode acessar.' }, { status: 403 })
    }

    // Detectar tipo de banco pela URL
    const databaseUrl = process.env.DATABASE_URL || ''
    const isSQLite = databaseUrl.includes('file:') || databaseUrl.includes('.db')
    
    // Contar registros nas tabelas principais
    const [empresas, usuarios, clientes, estacionamentos, movimentacoes] = await Promise.all([
      db.empresa.count(),
      db.usuario.count(),
      db.cliente.count(),
      db.estacionamento.count(),
      db.movimentacao.count(),
    ])

    // Tamanho do banco (apenas para SQLite)
    let tamanhoBanco = null
    if (isSQLite) {
      try {
        const fs = await import('fs')
        const path = await import('path')
        const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
        const stats = fs.statSync(dbPath)
        tamanhoBanco = (stats.size / 1024 / 1024).toFixed(2) + ' MB'
      } catch {
        tamanhoBanco = 'N/A'
      }
    }

    return NextResponse.json({
      tipo: isSQLite ? 'SQLite' : 'PostgreSQL',
      databaseUrlMascarada: mascararUrl(databaseUrl),
      tamanhoBanco,
      estatisticas: {
        empresas,
        usuarios,
        clientes,
        estacionamentos,
        movimentacoes,
      },
      schema: {
        provider: isSQLite ? 'sqlite' : 'postgresql',
        versaoPrisma: '5.x',
      }
    })
  } catch (error) {
    console.error('Erro ao obter info do banco:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Gerar string de conexão
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
    const { tipo, host, porta, nome, usuario, senha, ssl } = data

    if (tipo === 'postgresql') {
      // Validar campos obrigatórios
      if (!host || !nome || !usuario) {
        return NextResponse.json({ error: 'Host, nome do banco e usuário são obrigatórios' }, { status: 400 })
      }

      // Gerar string de conexão
      const portaFinal = porta || '5432'
      const sslParam = ssl ? '?sslmode=require&schema=public' : '?schema=public'
      const databaseUrl = `postgresql://${usuario}:${encodeURIComponent(senha)}@${host}:${portaFinal}/${nome}${sslParam}`

      // Retornar string gerada para o usuário copiar
      return NextResponse.json({
        success: true,
        databaseUrl,
        instrucoes: [
          '1. Copie a string de conexão gerada',
          '2. Adicione ao arquivo .env do servidor: DATABASE_URL="..."',
          '3. Altere o provider no prisma/schema.prisma para "postgresql"',
          '4. Execute: bunx prisma migrate deploy',
          '5. Reinicie o servidor para aplicar as mudanças',
        ],
        envExample: `DATABASE_URL="${databaseUrl}"`,
        schemaExample: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`,
        providers: {
          supabase: {
            nome: 'Supabase',
            dica: 'Encontre em: Project Settings > Database > Connection string',
            exemplo: 'postgresql://postgres.[ref]:[senha]@aws-0-[region].pooler.supabase.com:6543/postgres',
          },
          neon: {
            nome: 'Neon',
            dica: 'Encontre em: Connection Details > Connection string',
            exemplo: 'postgresql://[usuario]:[senha]@ep-[id].[region].aws.neon.tech/[db]?sslmode=require',
          },
          railway: {
            nome: 'Railway',
            dica: 'Encontre em: PostgreSQL > Variables > DATABASE_URL',
            exemplo: 'postgresql://postgres:[senha]@[host].railway.app:5432/railway',
          },
          render: {
            nome: 'Render',
            dica: 'Encontre em: Dashboard > Database > Internal Database URL',
            exemplo: 'postgresql://[user]:[senha]@[host].render.com:5432/[db]',
          },
        }
      })
    }

    return NextResponse.json({
      success: true,
      databaseUrl: 'file:./dev.db',
      instrucoes: [
        '1. SQLite já está configurado para desenvolvimento',
        '2. O banco é armazenado em prisma/dev.db',
        '3. Ideal para testes e desenvolvimento local',
        '4. Para produção, recomendamos PostgreSQL',
      ],
    })
  } catch (error) {
    console.error('Erro ao gerar conexão:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function mascararUrl(url: string): string {
  if (!url) return 'Não configurado'
  
  // Mascarar senha na URL
  return url.replace(/:([^:@]+)@/, ':****@')
}
