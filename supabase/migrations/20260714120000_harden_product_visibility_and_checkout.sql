drop policy if exists "Public can read products" on public.produtos;
drop policy if exists "Public can read published products" on public.produtos;
create policy "Public can read published products"
  on public.produtos for select to anon, authenticated
  using (publicado = true or public.is_admin());

drop policy if exists "Public can read wines" on public.wines;
drop policy if exists "Public can read published wines" on public.wines;
drop policy if exists "Authenticated can read all wines" on public.wines;
create policy "Public can read published wines"
  on public.wines for select to anon, authenticated
  using (publicado = true or public.is_admin());

create or replace function public.reject_unpublished_order_item()
returns trigger language plpgsql security invoker
set search_path = public, pg_temp
as $$
begin
  if new.product_id is not null and not exists (
    select 1 from public.produtos
    where id = new.product_id and publicado = true
  ) then
    raise exception 'Produto indisponivel para compra.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_published_order_item on public.order_items;
create trigger enforce_published_order_item
  before insert or update on public.order_items
  for each row execute function public.reject_unpublished_order_item();

revoke all on function public.reject_unpublished_order_item() from public;
notify pgrst, 'reload schema';
