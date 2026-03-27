'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Building2, Users, MapPin, Settings, X, Plus, Pencil, Trash2, Search, Save } from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CrudModalProps {
  open: boolean
  type: string
  onClose: () => void
}

interface Item {
  id: string
  [key: string]: unknown
}

export function CrudModal({ open, type, onClose }: CrudModalProps) {
  const { token, empresa, usuario } = useAuthStore()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [busca, setBusca] = useState('')

  const endpointMap: Record<string, string> = {
    empresas: '/api/empresas',
    usuarios: '/api/usuarios',
    clientes: '/api/clientes',
    estacionamentos: '/api/estacionamentos',
  }

  const titleMap: Record<string, string> = {
    empresas: 'Empresas', usuarios: 'Usuários',
    clientes: 'Clientes', estacionamentos: 'Estacionamentos', configuracoes: 'Configurações',
  }

  const iconMap: Record<string, React.ReactNode> = {
    empresas: <Building2 className="w-5 h-5 text-emerald-500" />,
    usuarios: <Users className="w-5 h-5 text-emerald-500" />,
    clientes: <Users className="w-5 h-5 text-emerald-500" />,
    estacionamentos: <MapPin className="w-5 h-5 text-emerald-500" />,
    configuracoes: <Settings className="w-5 h-5 text-emerald-500" />,
  }

  useEffect(() => {
    if (open && type && type !== 'configuracoes') loadItems()
  }, [open, type])

  const loadItems = async () => {
    setLoading(true)
    try {
      const url = type === 'clientes' ? `${endpointMap[type]}?busca=${busca}` : endpointMap[type]
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-empresa-id': empresa?.id || '' }
      })
      const data = await response.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const isEditing = editingItem?.id
      const url = isEditing ? `${endpointMap[type]}/${editingItem.id}` : endpointMap[type]
      await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-empresa-id': empresa?.id || '' },
        body: JSON.stringify(formData)
      })
      setEditingItem(null)
      setFormData({})
      loadItems()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir?')) return
    try {
      await fetch(`${endpointMap[type]}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'x-empresa-id': empresa?.id || '' }
      })
      loadItems()
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  if (type === 'configuracoes') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2">{iconMap[type]}{titleMap[type]}</DialogTitle></DialogHeader>
        <div className="py-6 space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h3 className="font-medium mb-3">Informações da Conta</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-400">Empresa:</span> {empresa?.nome}</p>
              <p><span className="text-slate-400">Plano:</span> {empresa?.plano}</p>
              <p><span className="text-slate-400">Usuário:</span> {usuario?.nome}</p>
              <p><span className="text-slate-400">Nível:</span> {usuario?.nivel}</p>
            </div>
          </div>
          <div className="text-center text-slate-400 text-sm">
            <p>Sistema Parking Control v1.2.0.6</p>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    )
  }

  const fieldsMap: Record<string, { key: string; label: string; type?: string }[]> = {
    usuarios: [
      { key: 'nome', label: 'Nome' }, { key: 'email', label: 'Email', type: 'email' },
      { key: 'senha', label: 'Senha', type: 'password' }, { key: 'nivel', label: 'Nível' },
    ],
    clientes: [
      { key: 'nome', label: 'Nome' }, { key: 'telefone', label: 'Telefone' },
      { key: 'tipo', label: 'Tipo' }, { key: 'placa', label: 'Placa' },
    ],
    estacionamentos: [
      { key: 'nome', label: 'Nome' }, { key: 'totalVagas', label: 'Total de Vagas' },
      { key: 'tipo', label: 'Tipo' }, { key: 'valorHora', label: 'Valor/Hora' },
    ],
    empresas: [
      { key: 'nome', label: 'Nome' }, { key: 'cnpj', label: 'CNPJ' },
      { key: 'email', label: 'Email', type: 'email' }, { key: 'telefone', label: 'Telefone' },
    ],
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2">{iconMap[type]}{titleMap[type]}</DialogTitle></DialogHeader>
        
        {editingItem !== null && (
          <Card className="bg-slate-900/50 border-slate-600 mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {fieldsMap[type]?.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label className="text-slate-300">{field.label}</Label>
                    <Input type={field.type || 'text'} value={formData[field.key] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className="bg-slate-900/50 border-slate-600 text-white" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { setEditingItem(null); setFormData({}) }} className="border-slate-600">
                  <X className="w-4 h-4 mr-2" />Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600">
                  <Save className="w-4 h-4 mr-2" />Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {editingItem === null && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..."
                className="bg-slate-900/50 border-slate-600 text-white w-64" />
              <Button variant="outline" onClick={loadItems} className="border-slate-600"><Search className="w-4 h-4" /></Button>
            </div>
            <Button onClick={() => { setEditingItem({}); setFormData({}) }} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />Novo
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-600 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900/50">
                <TableRow className="border-slate-600 hover:bg-slate-900/50">
                  {type === 'usuarios' && (
                    <>
                      <TableHead className="text-slate-300">Nome</TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Nível</TableHead>
                      <TableHead className="text-slate-300 w-24">Ações</TableHead>
                    </>
                  )}
                  {type === 'clientes' && (
                    <>
                      <TableHead className="text-slate-300">Nome</TableHead>
                      <TableHead className="text-slate-300">Telefone</TableHead>
                      <TableHead className="text-slate-300">Tipo</TableHead>
                      <TableHead className="text-slate-300 w-24">Ações</TableHead>
                    </>
                  )}
                  {type === 'estacionamentos' && (
                    <>
                      <TableHead className="text-slate-300">Nome</TableHead>
                      <TableHead className="text-slate-300">Vagas</TableHead>
                      <TableHead className="text-slate-300">Tipo</TableHead>
                      <TableHead className="text-slate-300 w-24">Ações</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-slate-600 hover:bg-slate-700/50">
                    {type === 'usuarios' && (
                      <>
                        <TableCell className="text-white">{item.nome}</TableCell>
                        <TableCell className="text-slate-400">{item.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.nivel === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                            item.nivel === 'GERENTE' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                          }`}>{item.nivel as string}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setFormData(item as Record<string, string>) }} className="text-slate-400 hover:text-white"><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                    {type === 'clientes' && (
                      <>
                        <TableCell className="text-white">{item.nome}</TableCell>
                        <TableCell className="text-slate-400">{item.telefone || '-'}</TableCell>
                        <TableCell><span className="px-2 py-1 rounded text-xs bg-slate-500/20 text-slate-400">{item.tipo as string}</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setFormData(item as Record<string, string>) }} className="text-slate-400 hover:text-white"><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                    {type === 'estacionamentos' && (
                      <>
                        <TableCell className="text-white">{item.nome}</TableCell>
                        <TableCell className="text-slate-400">{item.vagasDisponiveis ?? item.totalVagas}/{item.totalVagas as number}</TableCell>
                        <TableCell><span className="px-2 py-1 rounded text-xs bg-slate-500/20 text-slate-400">{item.tipo as string}</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingItem(item); setFormData(item as Record<string, string>) }} className="text-slate-400 hover:text-white"><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">Nenhum registro encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
