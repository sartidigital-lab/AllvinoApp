drop policy if exists "Acesso Total Arquivos" on storage.objects;

drop policy if exists "wine_images_admin_write" on storage.objects;
drop policy if exists "wine_images_admin_delete" on storage.objects;
drop policy if exists "wine_images_admin_update" on storage.objects;

create policy "wine_images_admin_write"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'wine-images' and public.is_admin());

create policy "wine_images_admin_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'wine-images' and public.is_admin())
  with check (bucket_id = 'wine-images' and public.is_admin());

create policy "wine_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'wine-images' and public.is_admin());
