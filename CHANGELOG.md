# Changelog - Parking Control

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [v1.2.0.5] - 2025-01-20

### Corrigido
- Versão agora aparece corretamente na tela de login (logo abaixo do título "Parking Control")
- Importação da constante VERSION centralizada em `/lib/version.ts`

---

## [v1.2.0.4] - 2025-01-20

### Adicionado
- Versão do sistema exibida na tela de login

### Melhorado
- Logs de debug detalhados na API de login/demo para identificar erros em produção
- Melhor tratamento de erros no frontend ao iniciar demonstração

---

## [v1.2.0.0] - 2025-01-20

### Alterado
- Banco de dados padrão alterado para **PostgreSQL**
- Script de build atualizado para sincronizar banco automaticamente (`prisma db push`)
- Removida tela complexa de configuração de banco de dados

### Configuração
- Na **Vercel**: configure apenas a variável `DATABASE_URL` com sua string PostgreSQL
- O build cria as tabelas automaticamente

---

## [v1.1.0.1] - 2025-01-20

### Corrigido
- Geração de comprovante agora ocorre na **entrada** do veículo (antes estava na saída)
- Comprovante de entrada exibe QR Code para apresentação na saída
- Comprovante de saída exibe tempo de permanência e valor total
- Fluxo de saída corrigido para usar API correta (POST com `acao: 'saida'`)

---

## [v1.1.0.0] - 2025-01-20

### Adicionado
- Sistema completo de controle de estacionamento (Micro SAAS)
- Autenticação com período de teste de 15 dias (Demo)
- CRUD de Empresas (multi-tenant)
- CRUD de Usuários com níveis de acesso (ADMIN, GERENTE, OPERADOR)
- CRUD de Clientes (AVULSO, MENSALISTA, CONVENIO)
- CRUD de Estacionamentos (FIXO, EVENTO)
- Sistema de vagas com grid visual (verde=disponível, vermelho=ocupado)
- Registro de entrada de veículos com busca de cliente
- Geração de comprovante com QRCode
- Sistema de saída com leitura de QRCode
- Cálculo automático de tempo e valor
- Interface responsiva (Mobile-first)
- Sidebar com navegação
- Dashboard com estatísticas em tempo real
- Persistência do último estacionamento utilizado

### Configurações Técnicas
- Next.js 16 com App Router
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (New York style)
- Prisma ORM com SQLite (desenvolvimento)
- Zustand para gerenciamento de estado
- QRCode para comprovantes

---

## [v1.0.0.0] - 2025-01-20

### Adicionado
- Configuração inicial do projeto Next.js 16 com TypeScript
- Configuração do Tailwind CSS 4 para estilização
- Integração com shadcn/ui para componentes de interface
- Configuração do Prisma ORM com SQLite
- Estrutura base do projeto
- Sistema de versionamento semântico (MAJOR.MINOR.PATCH.BUILD)
- Arquivo de versionamento em src/lib/version.ts
- README.md com documentação inicial

---

## Como atualizar este changelog

Ao fazer alterações no projeto, siga o formato:

```
## [vX.X.X.X] - AAAA-MM-DD

### Adicionado
- Nova funcionalidade X

### Alterado
- Mudança na funcionalidade Y

### Corrigido
- Bug fix Z

### Removido
- Funcionalidade obsoleta W
```

---

## Legenda de Versionamento

- **MAJOR**: Mudanças incompatíveis com versões anteriores
- **MINOR**: Novas funcionalidades mantendo compatibilidade
- **PATCH**: Correções de bugs mantendo compatibilidade
- **BUILD**: Mudanças internas (refatorações, documentação, etc.)
