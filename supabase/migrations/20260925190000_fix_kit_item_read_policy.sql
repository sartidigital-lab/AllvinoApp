-- Public catalog visitors use the anon role. Authenticated administrators retain
-- their explicit management policy, avoiding overlapping permissive SELECT rules.
drop policy if exists "Public can read kit compositions" on public.product_kit_items;
create policy "Anonymous visitors can read kit compositions"
  on public.product_kit_items for select to anon using (true);

notify pgrst, 'reload schema';
