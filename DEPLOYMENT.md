# Deploy Allvino

Este projeto usa GitHub Actions para validar o app, aplicar migrations no Supabase e publicar na Vercel.

## Secrets do GitHub

Configure estes secrets em `Settings > Secrets and variables > Actions`:

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública anon/publishable do Supabase.
- `SUPABASE_ACCESS_TOKEN`: token pessoal para a Supabase CLI.
- `SUPABASE_DB_PASSWORD`: senha do banco do projeto Supabase.
- `SUPABASE_PROJECT_REF`: referência do projeto Supabase, como `abcdefghijklmnopqrst`.
- `VERCEL_TOKEN`: token da conta Vercel.
- `VERCEL_ORG_ID`: ID da organização/equipe Vercel.
- `VERCEL_PROJECT_ID`: ID do projeto Vercel.

## Fluxo automatizado

Em `push` para `main` ou `master`, o workflow:

1. instala dependências com Node.js 24;
2. roda `npm run typecheck`;
3. roda `npm run build`;
4. aplica as migrations em `supabase/migrations`;
5. executa build/deploy de produção na Vercel.

Pull requests rodam apenas validação e build.

## Supabase

As tabelas versionadas estão em `supabase/migrations`.

Para aplicar localmente ou manualmente pela CLI:

```bash
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase db push
```

As tabelas públicas têm RLS habilitado. O catálogo (`wines`) tem leitura pública, e pedidos só podem ser criados/lidos pelo usuário autenticado dono do pedido.

Edição administrativa de catálogo ainda precisa de uma política de admin ou rota server-side com chave privada. Não exponha `service_role` no frontend.
