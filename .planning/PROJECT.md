# Allvino App (Reestruturação)

## What This Is

O Allvino App é um aplicativo web (PWA) de e-commerce de vinhos premium focado em uma experiência mobile-first e responsiva. A reestruturação visa transformar o projeto estático atual em uma Single Page Application (SPA) robusta utilizando Next.js e Supabase, garantindo navegação sem atritos, transações seguras, suporte offline e gerenciamento centralizado de produtos e autenticação.

## Core Value

Proporcionar uma experiência de compra de vinhos fluida, rápida e elegante, que se comporte como um aplicativo nativo no celular, com máxima estabilidade e segurança.

## Requirements

### Validated

- ✓ Interface base com landing page, destaques e navegação inferior (Mobile-first).
- ✓ Estrutura de catálogo de vinhos.
- ✓ Telas de fluxo do usuário (Conta, Login, Checkout).
- ✓ Painel administrativo (Admin).
- ✓ Design System base construído com utilitários Tailwind.

### Active

- [ ] Migrar arquitetura de HTML estático/MPA para Next.js (App Router/SPA).
- [ ] Configurar build pipeline do Tailwind CSS (remoção do CDN).
- [ ] Integrar Supabase (PostgreSQL para dados de catálogo e pedidos, Auth para contas de clientes/admin).
- [ ] Implementar suporte offline-first (IndexedDB) para navegação no catálogo sem internet.
- [ ] Automatizar CI/CD via GitHub e Vercel.

### Out of Scope

- [ ] Desenvolvimento de aplicativos mobile nativos (Swift/Kotlin) — O foco é em PWA, proporcionando alcance web e instalabilidade com menor custo de manutenção.
- [ ] Utilização do Firebase — Decisão tomada de seguir com Supabase devido ao histórico do projeto e modelo relacional.

## Context

O projeto atual é um MVP construído apenas com arquivos HTML, Tailwind via CDN e imagens estáticas. O cliente busca o próximo nível do projeto: conectar um backend real (Supabase, já configurado pelo cliente em outro escopo), remover débitos técnicos (como código duplicado de header/footer e lentidão do CDN do Tailwind) e hospedar tudo na Vercel com CI/CD. O desenvolvedor atuará com postura Senior, tomando as rédeas da arquitetura, usabilidade e segurança. O acesso a credenciais se dará via variáveis de ambiente.

## Constraints

- **Tech stack**: Next.js, Tailwind CSS (via build), Supabase — Decisão arquitetural aprovada para performance e integração rápida.
- **Hospedagem**: Vercel — Foco em CI/CD contínuo acoplado ao GitHub.
- **Segurança**: Chaves e secrets nunca devem ser hardcoded nos arquivos; o Supabase CLI/Vercel CLI podem ser usados via terminal local.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js SPA | Resolve recarregamentos lentos, melhora SEO do catálogo e encapsula componentes repetidos. | — Pending |
| Supabase | Fornece Auth pronto e PostgreSQL para queries complexas de pedidos, combinando com o know-how existente. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-17 after initialization*
