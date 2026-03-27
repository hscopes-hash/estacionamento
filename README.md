# Parking Control

Sistema Micro SAAS de controle de estacionamento - WebApp responsivo que funciona em Android, iOS e PC.

## 🚀 Funcionalidades

### Autenticação
- Login com email e senha
- **Demo gratuito de 15 dias** com acesso ADMIN completo
- Níveis de acesso: ADMIN, GERENTE, OPERADOR

### Gestão
- **Empresas**: Multi-tenant com controle de planos
- **Usuários**: CRUD completo com níveis de acesso
- **Clientes**: Avulsos, mensalistas e convênio
- **Estacionamentos**: Múltiplos por empresa, tipo FIXO ou EVENTO

### Operacional
- **Mapa de Vagas**: Visual em tempo real (verde = livre, vermelho = ocupado)
- **Entrada de Veículos**: Com OCR de placas via câmera
- **Saída de Veículos**: Com cálculo automático de valor
- **Comprovantes**: Com QR Code para saída rápida

## 📱 Responsivo

Funciona perfeitamente em:
- 📱 Android (navegador)
- 📱 iOS (navegador)
- 💻 PC (navegador)

## 📦 Instalação

```bash
# Instalar dependências
bun install

# Gerar Prisma Client
bun run db:generate

# Enviar schema para o banco
bun run db:push

# Iniciar servidor de desenvolvimento
bun run dev
```

## 🔐 Acesso Demo

Na tela de login, clique em **"Iniciar Demonstração"** para criar uma conta demo com:
- **15 dias de acesso gratuito**
- **Nível ADMIN** (acesso completo)
- **Email**: admin@demo.com
- **Senha**: admin123

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `bun run dev` | Inicia o servidor de desenvolvimento |
| `bun run build` | Gera build de produção |
| `bun run lint` | Verifica qualidade do código |
| `bun run db:push` | Envia schema para o banco |
| `bun run db:generate` | Gera Prisma Client |

## 🗄️ Banco de Dados

- **Desenvolvimento**: SQLite (configurado)
- **Produção**: PostgreSQL (compatível)

Para usar PostgreSQL em produção, altere a variável de ambiente:
```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/parking_control"
```

## 📝 Versionamento

Este projeto utiliza versionamento semântico no formato `MAJOR.MINOR.PATCH.BUILD`.

Versão atual: **v1.1.0.0**

Consulte [CHANGELOG.md](./CHANGELOG.md) para histórico de alterações.

## 🏗️ Arquitetura

```
src/
├── app/
│   ├── api/           # API Routes (backend)
│   │   ├── auth/      # Autenticação
│   │   ├── clientes/  # CRUD Clientes
│   │   ├── estacionamentos/ # CRUD Estacionamentos
│   │   ├── movimentacoes/   # Entrada/Saída
│   │   ├── vagas/     # Status de vagas
│   │   ├── ocr/       # OCR de placas
│   │   └── comprovante/ # QR Code
│   └── page.tsx       # Página principal (SPA)
├── components/
│   ├── ui/            # shadcn/ui components
│   └── parking/       # Componentes do sistema
└── lib/
    ├── auth.ts        # Autenticação
    ├── parking.ts     # Lógica de estacionamento
    ├── store.ts       # Zustand store
    └── db.ts          # Prisma client
```

## 📄 Licença

Este projeto está sob a licença MIT.

---

Desenvolvido com ❤️ usando Z.ai Code
