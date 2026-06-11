create or replace function public.mark_manual_payment_paid(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem confirmar pagamentos.';
  end if;

  update public.orders
    set payment_status = 'paid',
        paid_at = coalesce(paid_at, now()),
        payment_error = null,
        status = case
          when status = 'pending' then 'confirmed'
          else status
        end
    where id = p_order_id
      and payment_provider = 'manual'
      and payment_status in ('pending', 'authorized');

  if not found then
    raise exception 'Pedido nao encontrado ou pagamento nao pode ser confirmado manualmente.';
  end if;
end;
$$;

grant execute on function public.mark_manual_payment_paid(uuid) to authenticated;

notify pgrst, 'reload schema';
