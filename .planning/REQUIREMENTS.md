# Requirements: Allvino App

**Defined:** 2026-05-17
**Core Value:** Proporcionar uma experiência de compra de vinhos fluida, rápida e elegante, que se comporte como um aplicativo nativo no celular, com máxima estabilidade e segurança.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Architecture & Base

- [ ] **ARCH-01**: Inicializar projeto Next.js (App Router)
- [ ] **ARCH-02**: Configurar Tailwind CSS de forma nativa (build), removendo CDN
- [ ] **ARCH-03**: Configurar suporte PWA (manifest, service worker básico)
- [ ] **ARCH-04**: Configurar CI/CD via GitHub Actions e Vercel deploy automático

### Authentication (Supabase)

- [ ] **AUTH-01**: Integrar Supabase Auth no Next.js
- [ ] **AUTH-02**: Usuário consegue criar conta com email e senha
- [ ] **AUTH-03**: Usuário consegue fazer login e logout
- [ ] **AUTH-04**: Sessão do usuário persiste na navegação e reload
- [ ] **AUTH-05**: Rotas protegidas implementadas (ex: `/conta`, `/admin`)

### Catalog & Offline

- [ ] **CATL-01**: Integração com banco de dados Supabase (PostgreSQL) para listar vinhos
- [ ] **CATL-02**: Usuário consegue visualizar catálogo de vinhos
- [ ] **CATL-03**: Usuário consegue ver detalhes de um vinho específico
- [ ] **CATL-04**: Implementar estratégia offline-first (IndexedDB/Service Worker) para cache do catálogo

### Shopping Flow

- [ ] **SHOP-01**: Usuário consegue adicionar vinho ao carrinho
- [ ] **SHOP-02**: Usuário consegue visualizar o carrinho de compras
- [ ] **SHOP-03**: Usuário consegue iniciar o processo de checkout (integração do layout `checkout.html`)
- [ ] **SHOP-04**: Usuário consegue visualizar seu histórico de pedidos (layout `conta.html`)

### Admin Dashboard

- [ ] **ADMN-01**: Admin logado pode visualizar o dashboard (layout `admin.html`)
- [ ] **ADMN-02**: Admin pode adicionar, editar ou remover vinhos do catálogo

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Payments & Logistics

- **PAY-01**: Integração com gateway de pagamento real (Stripe/Mercado Pago)
- **LOG-01**: Cálculo de frete dinâmico via API dos Correios/Transportadora

## Out of Scope

| Feature | Reason |
|---------|--------|
| App Nativo (Swift/Kotlin) | Custo de manutenção alto; PWA resolve a necessidade de "App mobile" |
| Firebase | Decisão tomada de seguir com Supabase (PostgreSQL) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1 | Pending |
| ARCH-02 | Phase 1 | Pending |
| ARCH-03 | Phase 1 | Pending |
| ARCH-04 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| CATL-01 | Phase 3 | Pending |
| CATL-02 | Phase 3 | Pending |
| CATL-03 | Phase 3 | Pending |
| CATL-04 | Phase 3 | Pending |
| SHOP-01 | Phase 4 | Pending |
| SHOP-02 | Phase 4 | Pending |
| SHOP-03 | Phase 4 | Pending |
| SHOP-04 | Phase 4 | Pending |
| ADMN-01 | Phase 5 | Pending |
| ADMN-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-17*
*Last updated: 2026-05-17 after initial definition*
