import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'parking-control-secret-key-2024'

export interface UserPayload {
  id: string
  email: string
  nome: string
  nivel: string
  empresaId: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload
  } catch {
    return null
  }
}

export async function createUser(email: string, password: string, nome: string, empresaId: string, nivel: string = 'OPERADOR') {
  const hashedPassword = await hashPassword(password)
  return db.usuario.create({
    data: {
      email,
      senha: hashedPassword,
      nome,
      empresaId,
      nivel,
      ativo: true,
    }
  })
}

export async function authenticateUser(email: string, password: string) {
  const usuario = await db.usuario.findUnique({
    where: { email },
    include: { empresa: true }
  })

  if (!usuario || !usuario.ativo) {
    return null
  }

  const validPassword = await comparePassword(password, usuario.senha)
  if (!validPassword) {
    return null
  }

  // Atualizar último acesso
  await db.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcesso: new Date() }
  })

  // Verificar se a empresa está ativa e dentro do prazo
  const empresa = usuario.empresa
  const isTrialValid = empresa.plano === 'TRIAL' && 
    empresa.dataFimTrial && 
    new Date() < new Date(empresa.dataFimTrial)
  
  const isPaidPlan = empresa.plano !== 'TRIAL' && empresa.ativo

  if (!empresa.ativo) {
    return null
  }

  if (empresa.plano === 'TRIAL' && !isTrialValid) {
    return { usuario, trialExpired: true }
  }

  return { usuario, trialExpired: false }
}

export async function createDemoCompany() {
  // Verificar se já existe uma empresa demo
  const existingDemo = await db.empresa.findFirst({
    where: { cnpj: '00000000000000' }
  })

  if (existingDemo) {
    return existingDemo
  }

  // Criar empresa demo com 15 dias de trial
  const now = new Date()
  const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

  const empresa = await db.empresa.create({
    data: {
      nome: 'Estacionamento Demo',
      cnpj: '00000000000000',
      email: 'demo@parking.com',
      telefone: '(00) 00000-0000',
      plano: 'TRIAL',
      dataInicioTrial: now,
      dataFimTrial: trialEnd,
      ativo: true,
    }
  })

  // Criar usuário admin
  await createUser('admin@demo.com', 'admin123', 'Administrador', empresa.id, 'ADMIN')

  return empresa
}

export function getTrialDaysRemaining(empresa: { dataFimTrial: Date | null }): number {
  if (!empresa.dataFimTrial) return 0
  const now = new Date()
  const end = new Date(empresa.dataFimTrial)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
