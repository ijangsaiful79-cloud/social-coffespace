-- =============================================
-- STORAGE BUCKETS
-- =============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-logos',
  'shop-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

-- =============================================
-- AVATARS BUCKET POLICIES
-- =============================================

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_own_upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_own_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_own_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- SHOP-LOGOS BUCKET POLICIES
-- =============================================

create policy "shop_logos_public_read" on storage.objects
  for select using (bucket_id = 'shop-logos');

create policy "shop_logos_service_role_write" on storage.objects
  for insert with check (
    bucket_id = 'shop-logos'
    and auth.role() = 'service_role'
  );

create policy "shop_logos_service_role_update" on storage.objects
  for update using (
    bucket_id = 'shop-logos'
    and auth.role() = 'service_role'
  );
