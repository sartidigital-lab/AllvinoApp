# Exclusão de contas

Clientes solicitam a exclusão da conta pela área **Conta > Excluir conta**, que os direciona ao atendimento para confirmação de identidade.

Após essa confirmação, um administrador ativo pode excluir uma conta vinculada a um pedido no painel **Clientes**. A ação é permanente e remove o acesso em `auth.users` e os dados associados: perfil, pedidos e itens, transações de pagamento, dados de provedor de pagamento, métodos salvos, favoritos, assinaturas push, CRM e conversas.

Contas administrativas e a própria conta do administrador que opera o painel não podem ser removidas pela função. Pedidos sem `user_id` representam checkout sem conta e não mostram a ação de exclusão.
