---
status: resolved
trigger: "O usuário não consegue processar o pedido via PIX nem cartão; a interface mostra 'Não foi possível criar o pedido.'"
created: 2026-09-08
updated: 2026-09-08T21:48:00-03:00
---

# Symptoms

- Expected behavior: criar o pedido, abrir o WhatsApp e exibir o PIX ou solicitar o link do cartão.
- Actual behavior: PIX e cartão falham antes da etapa específica de pagamento.
- Error message: `Não foi possível criar o pedido.`
- Timeline: observado em produção após o deploy do novo fluxo de pagamentos.
- Reproduction: carrinho com três itens, retirada na loja, escolher PIX ou cartão e finalizar.

# Current Focus

- hypothesis: a função pública `public.create_order_with_stock_reservation` executa como `authenticated` (SECURITY INVOKER), mas sua única operação chama a função `app_private.create_order_with_stock_reservation`, cujo EXECUTE foi revogado de `authenticated`; essa fronteira produz o erro PostgreSQL 42501 antes de qualquer pedido ser criado.
- test: segunda execução independente do teste remoto sob `authenticated` e confirmação de que o schema remoto está atualizado.
- expecting: criação e limpeza do pedido temporário sem erro 42501, mantendo os valores calculados pelo servidor.
- next_action: sessão concluída; consultar a entrada na base de conhecimento se o erro 42501 reaparecer no checkout.
- reasoning_checkpoint:
    hypothesis: "O wrapper público SECURITY INVOKER causa 42501 porque authenticated não pode executar a função privada chamada por ele."
    confirming_evidence:
      - "Os dois POST /api/pedidos em produção registraram PostgreSQL 42501."
      - "O wrapper público não declara SECURITY DEFINER e chama app_private.create_order_with_stock_reservation."
      - "A migration 20260816173923 revoga EXECUTE da função privada para authenticated, anon e public."
      - "O teste CLI anterior passou como postgres, portanto não exercitou os privilégios de uma sessão JWT."
    falsification_test: "Se a chamada PostgREST com JWT autenticado continuar retornando 42501 depois do wrapper SECURITY DEFINER, ou se o erro ocorrer apenas na leitura aninhada após um pedido existir, a hipótese estará errada."
    fix_rationale: "Elevar somente o wrapper público permite atravessar a fronteira privada sem conceder acesso direto ao schema/função interna; o RPC interno continua vinculando o pedido a auth.uid() e validando produtos, preços, estoque e entrega."
    blind_spots: "Ainda é necessário comprovar no remoto que o owner do wrapper possui acesso à função privada, que anon permanece bloqueado e que a leitura aninhada de order_items funciona após a criação."
- tdd_checkpoint:

# Evidence

- timestamp: 2026-09-08T00:00:00-03:00
  checked: sessão persistente e regras de depuração
  found: PIX e cartão falham antes da lógica específica de pagamento; não há skills locais em `.codex/skills` ou `.agents/skills`.
  implication: a investigação deve priorizar o caminho comum de criação do pedido e diferenças entre código, schema remoto e produção.

- timestamp: 2026-09-08T21:18:00-03:00
  checked: logs de runtime da Vercel para `POST /api/pedidos`
  found: as tentativas de PIX e cartão falharam com código PostgreSQL `42501`.
  implication: a falha é de privilégio no RPC comum e ocorre antes de QR Code, PIX, WhatsApp e parcelamento.

- timestamp: 2026-09-08T21:19:00-03:00
  checked: cadeia de migrations e definições das duas funções `create_order_with_stock_reservation`
  found: o wrapper `public` é SECURITY INVOKER e executável por `authenticated`; a implementação `app_private` é SECURITY DEFINER, mas seu EXECUTE foi revogado de `authenticated` na migration de promoções.
  implication: o wrapper herda o papel JWT e não consegue chamar a implementação privada, correspondendo exatamente ao 42501 observado.

- timestamp: 2026-09-08T21:20:00-03:00
  checked: teste remoto existente `scripts/checkout-rpc-check.mjs`
  found: o script executa SQL direto com `set_config` por conexão administrativa e passou como postgres, sem reproduzir as permissões PostgREST do papel `authenticated`.
  implication: o teste anterior era insuficiente para detectar esta regressão de privilégios; a verificação deve usar JWT autenticado.

- timestamp: 2026-09-08T21:31:00-03:00
  checked: teste remoto endurecido antes de aplicar a migration corretiva
  found: o teste falhou de forma determinística com `Checkout RPC privilege verification failed: wrapper_security_definer=false`.
  implication: a regressão foi reproduzida no schema remoto e o novo teste diferencia o estado vulnerável do estado corrigido.

- timestamp: 2026-09-08T21:35:00-03:00
  checked: aplicação da migration no projeto Supabase vinculado
  found: `20260908213000_fix_checkout_wrapper_privileges.sql` foi aplicada com sucesso e foi a única migration enviada.
  implication: a correção de privilégios está ativa no banco consumido pela produção, sem exigir novo deploy da aplicação.

- timestamp: 2026-09-08T21:37:00-03:00
  checked: teste remoto pós-correção sob `role authenticated`
  found: o RPC criou o pedido temporário `1cd0bba6-07ca-4078-b790-474d496baeaa`, calculou subtotal 69,90, desconto 13,98 e total 55,92, reservou estoque e passou todas as asserções de privilégios; a limpeza posterior restaurou o estoque e removeu o pedido.
  implication: o erro 42501 foi removido para usuários autenticados, enquanto anon e acesso direto à função privada continuam bloqueados.

- timestamp: 2026-09-08T21:40:00-03:00
  checked: regressão local completa
  found: 54 testes, verificação de segurança, TypeScript, smoke com 35 feature guards e regras de domínio passaram; `git diff --check` encontrou apenas avisos de conversão LF/CRLF.
  implication: a correção é mínima e não introduziu regressões detectáveis nas funcionalidades adjacentes.

- timestamp: 2026-09-08T21:48:00-03:00
  checked: verificação remota independente após a correção
  found: o `db push` confirmou o remoto atualizado e uma segunda execução sob `authenticated` criou o pedido `35740f4a-2345-451b-aea2-1a2ca41d2523`, com subtotal 69,90, desconto 13,98 e total 55,92; o processo saiu com código 0 após remover o pedido e restaurar o estoque.
  implication: a correção é repetível no ambiente remoto e a sessão pode ser encerrada.

# Eliminated

- hypothesis: o trigger de 10% do PIX impede a inserção do pedido.
  evidence: o cartão também falha e os logs apontam 42501 no acesso ao RPC antes da execução da implementação privada; o trigger não explica a fronteira de permissão quebrada.
  timestamp: 2026-09-08T21:20:00-03:00

- hypothesis: a nova consulta aninhada de `order_items` falha após a criação.
  evidence: o código 42501 está associado à chamada do RPC comum; a cadeia de privilégios contém uma violação direta e o pedido não chega à consulta de resumo.
  timestamp: 2026-09-08T21:20:00-03:00

# Resolution

- root_cause: o wrapper público do checkout permaneceu SECURITY INVOKER depois que a implementação privada teve EXECUTE revogado de `authenticated`; sessões JWT não conseguiam atravessar essa chamada e recebiam PostgreSQL 42501.
- fix: migration aplicada para tornar somente o wrapper público SECURITY DEFINER com `search_path = ''`, mantendo EXECUTE do wrapper apenas para `authenticated` e sem reabrir acesso à implementação `app_private`; o teste remoto agora executa sob o papel `authenticated` e valida a matriz de privilégios.
- verification: reproduzido antes da migration (`wrapper_security_definer=false`); duas execuções remotas independentes passaram sob `authenticated`, ambas com pedido temporário criado e removido e estoque restaurado; remoto confirmado atualizado, anon bloqueado, 54 testes e demais gates locais aprovados.
- files_changed:
  - supabase/migrations/20260908213000_fix_checkout_wrapper_privileges.sql
  - scripts/checkout-rpc-check.mjs
  - scripts/security-check.mjs
