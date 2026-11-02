# Phase 02: Authentication — Context

## Domain

Integração do Supabase Auth para gerenciar sessões globais de usuários e proteger rotas críticas. A autenticação utilizará o pacote `@supabase/ssr` e será gerenciada via Server-Side Rendering (Cookies) no contexto do Next.js App Router.

## Canonical Refs

*No external documents or ADRs provided. The decisions below serve as the primary implementation spec.*

## Decisions

- **Métodos de Autenticação:** Acesso via E-mail/Senha tradicional e Login Social (OAuth via Google).
- **UX do Login:** Utilização de um Modal (ou Bottom Sheet no mobile) acessível de qualquer tela, em vez de páginas de `/login` ou `/cadastro` dedicadas. Isso preserva a experiência do catálogo de vinhos.
- **Proteção de Rotas:** Se um usuário tentar acessar diretamente uma rota protegida (como `/conta` ou `/admin`) sem uma sessão válida, o sistema fará um redirecionamento (Middleware) para a Home (`/`) com um estado (ex: query parameter) que force o Modal de login a abrir automaticamente.

## Prior Decisions Applied

- **Project Setup:** Escolha de Next.js SPA (App Router) com Supabase e Tailwind build — *Estabelecido na Phase 1*.
- **CI/CD & PWA:** Implementado PWA com `next-pwa` — *Estabelecido na Phase 1*.
- `@supabase/ssr` será usado para lidar com Auth via Cookies no server, dispensando Auth state exclusivo no client.

## Code Context

- O projeto base está estruturado em `src/app`.
- Variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`) já estão estritamente validadas via Zod (`src/env.mjs`).

## Deferred Ideas

*(Nenhuma ideia fora de escopo capturada).*
