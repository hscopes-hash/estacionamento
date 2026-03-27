'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'
import { Car, User, Lock, Sparkles } from 'lucide-react'
import { VERSION } from '@/lib/version'

interface LoginScreenProps {
  onLoginSuccess: () => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth, setDemo } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao fazer login')
        return
      }

      setAuth(data.usuario, data.empresa, data.token)
      onLoginSuccess()
    } catch {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemo = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iniciarDemo: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `Erro ${response.status}: ${response.statusText}`)
        return
      }

      setAuth(data.usuario, data.empresa, data.token)
      if (data.isDemo) {
        setDemo(data.empresa.dataFimTrial)
      }
      onLoginSuccess()
    } catch (err) {
      console.error('Erro ao iniciar demo:', err)
      setError(err instanceof Error ? err.message : 'Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/30">
            <Car className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Parking Control</h1>
          <p className="text-emerald-400 text-sm font-medium mb-2">{VERSION}</p>
          <p className="text-slate-400">Sistema de Gestão de Estacionamento</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-slate-400">
              Entre com suas credenciais ou inicie uma demonstração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-slate-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/50 text-slate-400">ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              onClick={handleDemo}
              disabled={isLoading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Iniciar Demonstração (15 dias grátis)
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-4">
          © 2025 Parking Control
        </p>
      </div>
    </div>
  )
}
