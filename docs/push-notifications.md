# Notificações push

O fluxo de boas-vindas pede permissão ao navegador somente após um clique. A assinatura é salva no Supabase quando o usuário entra na conta. Em **Conta → Notificações**, ele pode ativar ou desativar o dispositivo. O administrador envia campanhas em **Admin → Notificações**; nenhum envio é automático.

## Configuração antes do deploy

1. Gere um único par de chaves VAPID com `npx web-push generate-vapid-keys --json`. Guarde a chave privada em um gerenciador de segredos; não a inclua no Git nem em variáveis `NEXT_PUBLIC_`.
2. Configure `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` no projeto Vercel vinculado, em cada ambiente que usará push. Use o mesmo par em todos os ambientes que compartilham o domínio e o banco de assinaturas. A rotação das chaves exige que os dispositivos assinem novamente.
3. Aplique a migração `20260919073559_add_push_subscriptions.sql` no projeto Supabase correto. Ela cria `public.push_subscriptions` com RLS, sem acesso anônimo. No projeto Allvino conectado, ela já foi aplicada em 19/09/2026.
4. Após publicar o Preview, confirme HTTPS, service worker `/sw.js`, `/api/push/config` com `available: true`, cadastro de um dispositivo autenticado e use **Enviar teste para minha conta** na tela administrativa. Esse modo consulta apenas uma assinatura da conta administradora e nunca a lista completa. Campanhas gerais são bloqueadas no Preview também no servidor.

Em 19/09/2026, o par VAPID foi configurado no projeto Vercel `allvino-app` para **Production** e **Preview** (chave privada como Secret), e o CLI local foi autorizado. O ambiente **Development** e `.env.local` não receberam essas chaves. A ativação em runtime depende de um novo deploy, pois variáveis de ambiente da Vercel não alteram deployments já publicados.

O servidor valida a origem das gravações, restringe destinos de push conhecidos, limita taxa de inscrição e envio, exige `is_admin()` para campanhas e elimina assinaturas expiradas (HTTP 404/410). A tela administrativa limita o envio a 500 dispositivos por campanha. Para listas maiores, implemente uma fila de processamento antes de ampliar o limite. No iPhone, push web requer que o site seja adicionado à Tela de Início.
