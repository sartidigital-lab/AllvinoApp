# Phase 1: Architecture & Base - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 1-architecture-and-base
**Areas discussed:** Estrutura do Next.js, Setup do Supabase, Estratégia do PWA, Validação de Variáveis de Ambiente

---

## Estrutura do Next.js (App Router)

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Utilizar a pasta `src/app` | ✓ |
| 2 | Utilizar a pasta `app` na raiz | |

**User's choice:** 1 utilizar pasta src/app
**Notes:** 

---

## Setup do Supabase

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Utilizar `@supabase/ssr` | ✓ |
| 2 | Utilizar `@supabase/supabase-js` no client | |

**User's choice:** 2 vamos usar @supabase/ssr
**Notes:** 

---

## Estratégia do PWA

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Usar biblioteca `next-pwa` | ✓ |
| 2 | Service Worker customizado | |

**User's choice:** 3 usaremos nest-pwa
**Notes:** 

---

## Validação de Variáveis de Ambiente

| Option | Description | Selected |
|--------|-------------|----------|
| 1 | Validação rígida com Zod | ✓ |
| 2 | Sem validação rígida | |

**User's choice:** 4 Sim, pode adicionar a validação rigida
**Notes:** 

---

## the agent's Discretion

Configurações específicas do linter (ESLint/Prettier), estrutura interna de componentes e hooks que não interfiram nas decisões acima.

## Deferred Ideas

Nenhuma ideia diferida capturada nesta fase.
