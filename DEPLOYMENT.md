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
- `NEXT_PUBLIC_PIX_KEY`: chave PIX pública usada para gerar o copia e cola e o QR Code.
- `NEXT_PUBLIC_PIX_MERCHANT_NAME`: nome exibido no payload PIX (até 25 caracteres).
- `NEXT_PUBLIC_PIX_MERCHANT_CITY`: cidade exibida no payload PIX (até 15 caracteres).
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`: opcionais; ativam rate limit distribuído entre instâncias Vercel.

## Fluxo automatizado

Em `push` para `main` ou `master`, o workflow:

1. instala dependências com Node.js 24;
2. roda `npm run typecheck`;
3. roda `npm run build`;
4. aplica as migrations em `supabase/migrations`;
5. a integração Git da Vercel cria o deploy de produção a partir da branch configurada no projeto.

Pull requests rodam apenas validação e build.

## Supabase

As tabelas versionadas estão em `supabase/migrations`. O catálogo canônico é `public.produtos`; as tabelas legadas (`wines`, `categorias`, `equipe`, `pedidos`, `perfis` e `promocoes`) não fazem parte do fluxo do App Router e permanecem protegidas contra acesso pelo Data API.

Para aplicar localmente ou manualmente pela CLI:

```bash
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase db push
```

As tabelas públicas têm RLS habilitado. O catálogo (`produtos`) tem leitura pública apenas para itens publicados, e pedidos só podem ser criados/lidos pelo usuário autenticado dono do pedido.

### Auth do cliente

- O checkout abre o cadastro para usuários novos antes do envio do pedido.
- O cadastro exige nome, WhatsApp, e-mail e senha; usuários existentes podem alternar para login.
- O link “Esqueci minha senha” envia o e-mail de recuperação para `/auth/callback?next=/recuperar-senha`.
- A página `/recuperar-senha` exige uma sessão de recuperação válida antes de aceitar a nova senha.
- Habilite `Leaked password protection` em `Authentication > Attack Protection` no projeto Supabase.

## Acesso admin

O painel `/admin` exige que o usuário autenticado tenha `app_metadata.role = "admin"` no Supabase Auth.

Para conceder acesso:

1. Abra Supabase Dashboard.
2. Vá em `Authentication > Users`.
3. Abra o usuário desejado.
4. Edite o `Raw app meta data`.
5. Defina:

```json
{
  "role": "admin"
}
```

Não use `user_metadata` para permissão administrativa, porque o usuário pode editar esses dados em alguns fluxos. Não exponha `service_role` no frontend.

## Fluxo de pagamento

- PIX: o pedido é criado como pendente com 10% de desconto adicional calculado no banco. O checkout abre o WhatsApp com os detalhes completos e exibe o payload copia e cola, a chave e o QR Code a partir de `NEXT_PUBLIC_PIX_KEY`.
- Cartão de crédito: o cliente escolhe até 6 parcelas sem juros, respeitando parcela mínima de R$ 100,00. O pedido é aberto no WhatsApp da loja com itens, endereço, prazo, frete, descontos e total; o atendimento envia o link seguro de pagamento.
- Como o fluxo usa `wa.me`, o cliente ainda precisa confirmar o envio da mensagem no WhatsApp. Se a abertura automática for bloqueada, a confirmação do pedido mantém um botão para repetir a ação.
- O contrato de gateway Pagar.me/Stone versionado anteriormente permanece desativado até existir uma integração de webhook e credenciais aprovadas. Ele não é chamado pelo checkout atual.

Na Vercel, configure em Preview e Production:

- `NEXT_PUBLIC_PIX_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
