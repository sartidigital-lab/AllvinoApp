# Roadmap: Allvino App

## Overview

O projeto migrará a aplicação estática (Multi-Page) de E-commerce de Vinhos "Allvino" para uma Single Page Application moderna e performática com Next.js, configurada para ser offline-first (PWA), usando Supabase para autenticação e banco de dados, e Vercel para deploy contínuo via GitHub Actions.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Architecture & Base** - Configuração do Next.js, Tailwind build, PWA e CI/CD.
- [x] **Phase 2: Authentication** - Integração do Supabase Auth e rotas protegidas.
- [x] **Phase 3: Catalog & Offline** - Integração de banco de dados para produtos e estratégia offline-first.
- [x] **Phase 4: Shopping Flow** - Fluxo de carrinho e finalização de pedido integrado.
- [ ] **Phase 5: Admin Dashboard** - Refatoração do painel de administração e CRUD de vinhos.

## Phase Details

### Phase 1: Architecture & Base
**Goal**: Estabelecer a fundação do novo PWA com Next.js, Tailwind e pipeline de CI/CD, transicionando da stack antiga de CDN.
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. App Next.js rodando localmente sem erros e sem CDN do Tailwind.
  2. Deploy automatizado rodando na Vercel a cada commit no GitHub.
  3. App registrando Service Worker e Manifest do PWA corretamente.
**Plans**: TBD

Plans:
- [x] 01-01: Configurar Next.js e Tailwind nativo
- [x] 01-02: Configurar PWA
- [x] 01-03: Setup CI/CD no GitHub/Vercel

### Phase 2: Authentication
**Goal**: Integrar o Supabase Auth para gerenciar sessões globais de usuários e proteger rotas críticas.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Usuário consegue se registrar e logar com persistência de sessão.
  2. Redirecionamento correto de usuários não logados que tentam acessar `/conta` ou `/admin`.
**Plans**: TBD

Plans:
- [x] 02-01: Integração Supabase Auth e Componentes de Login/Signup
- [x] 02-02: Middleware e Proteção de Rotas

### Phase 3: Catalog & Offline
**Goal**: Transformar a estrutura estática do catálogo em páginas dinâmicas consultando o banco PostgreSQL do Supabase, com suporte offline.
**Depends on**: Phase 2
**Requirements**: CATL-01, CATL-02, CATL-03, CATL-04
**Success Criteria** (what must be TRUE):
  1. Catálogo e detalhes de vinho carregam dinamicamente via backend.
  2. Ao simular offline network, o usuário ainda consegue ver o catálogo previamente carregado.
**Plans**: TBD

Plans:
- [x] 03-01: Integração Banco de Dados Supabase (Catálogo/Vinhos)
- [x] 03-02: Páginas Dinâmicas de Catálogo e Detalhe de Vinho
- [x] 03-03: Implementação da Estratégia Offline (IndexedDB)

### Phase 4: Shopping Flow
**Goal**: Habilitar a jornada de compra e verificação do histórico pelo usuário.
**Depends on**: Phase 3
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04
**Success Criteria** (what must be TRUE):
  1. Usuário adiciona itens ao carrinho que é persistido no estado local/sessão.
  2. Usuário chega até a tela de checkout dinâmico.
  3. Usuário vê as compras associadas ao seu ID no seu perfil (`/conta`).
**Plans**: TBD

Plans:
- [x] 04-01: Componentes e Estado do Carrinho
- [x] 04-02: Fluxo de Checkout e Histórico de Compras

### Phase 5: Admin Dashboard (Finalizado)
- **Objetivo**: Proteger rota administrativa e criar dashboard de gestão.
- **Entregáveis**:
  - Implementação de `src/app/admin/layout.tsx` com verificação Supabase Auth (redirecionamento se não logado).
  - Componentização da Sidebar (`Sidebar.tsx`) baseada no design do `admin.html`.
  - Página `/admin` com BI Analytics (Faturamento, Garrafas, Pedidos).
  - Tabela de gerenciamento de Catálogo em `/admin/catalogo` (CRUD e Supabase Storage).
  - Estruturação base para Promoções e Equipe.s**: ADMN-01, ADMN-02
**Success Criteria** (what must be TRUE):
  1. Usuário Admin visualiza a listagem real do DB em `/admin`.
  2. Ações CRUD operam diretamente no Supabase a partir do painel.
**Plans**: TBD

Plans:
- [ ] 05-01: Layout do Admin e Tabelas Dinâmicas
- [ ] 05-02: Funcionalidades CRUD de Vinhos

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Architecture & Base | 3/3 | Complete | 2026-05-17 |
| 2. Authentication | 2/2 | Complete | 2026-05-17 |
| 3. Catalog & Offline | 3/3 | Complete | 2026-05-17 |
| 4. Shopping Flow | 2/2 | Complete | 2026-05-17 |
| 5. Admin Dashboard | 0/2 | Not started | - |
