# Phase 1: Architecture & Base - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Configuração do Next.js, Tailwind com build nativo, PWA e pipeline de CI/CD (transição da antiga estrutura HTML+CDN para SPA).

</domain>

<decisions>
## Implementation Decisions

### Estrutura do Next.js (App Router)
- **D-01:** Utilizar a estrutura com a pasta `src/app`.

### Setup do Supabase
- **D-02:** Utilizar a biblioteca `@supabase/ssr` recomendada pela Vercel.

### Estratégia do PWA
- **D-03:** Utilizar o plugin `next-pwa` para gerar o Service Worker automaticamente.

### Validação de Variáveis de Ambiente
- **D-04:** Implementar validação rígida das variáveis de ambiente usando Zod no momento do build.

### the agent's Discretion
Configurações específicas do linter (ESLint/Prettier), estrutura interna de componentes e hooks que não interfiram nas decisões acima.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Páginas HTML estáticas atuais (`index.html`, `catalogo.html`, etc): Servirão como referência base de design para a transição para React Components.
- `manifest.json` e `sw.js` existentes: Servirão de base para os metadados do PWA no Next.js.

### Established Patterns
- Tailwind classes inline: O código antigo utiliza Tailwind via CDN. A refatoração manterá o padrão utilitário mas dentro do fluxo de build (`globals.css` + `tailwind.config.ts`).

### Integration Points
- Vercel CI/CD: A estrutura precisará estar perfeitamente alinhada com as expectativas de deploy da Vercel (variáveis de ambiente no dashboard, comandos de build padrão do Next.js).

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 1-architecture-and-base*
*Context gathered: 2026-05-17*
