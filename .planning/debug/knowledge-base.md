# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## checkout-order-creation-fails — Checkout falhava para PIX e cartão com erro genérico
- **Date:** 2026-09-08
- **Error patterns:** Não foi possível criar o pedido, PostgreSQL 42501, PIX, cartão, create_order_with_stock_reservation, SECURITY INVOKER, authenticated
- **Root cause:** O wrapper público do checkout permaneceu SECURITY INVOKER depois que a implementação privada teve EXECUTE revogado de `authenticated`; sessões JWT não conseguiam atravessar a chamada para `app_private`.
- **Fix:** O wrapper público foi alterado para SECURITY DEFINER com `search_path = ''`, EXECUTE exclusivo para `authenticated` e sem expor diretamente a função privada; o teste remoto passou a reproduzir o papel JWT.
- **Files changed:** supabase/migrations/20260908213000_fix_checkout_wrapper_privileges.sql, scripts/checkout-rpc-check.mjs, scripts/security-check.mjs
---
