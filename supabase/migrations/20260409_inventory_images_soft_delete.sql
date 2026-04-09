-- Inventory media + soft delete hardening

-- 1) Add soft delete and image metadata columns
alter table if exists public.products
  add column if not exists image_path text,
  add column if not exists deleted_at timestamptz;

alter table if exists public.users
  add column if not exists deleted_at timestamptz;

alter table if exists public.devices
  add column if not exists deleted_at timestamptz;

-- 2) Ensure private bucket exists for product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'product-images',
  'product-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
where not exists (
  select 1 from storage.buckets where id = 'product-images'
);

update storage.buckets
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'product-images';

-- 3) Policies with least privilege by org path: <org_id>/<file>
drop policy if exists "product_images_read_authenticated_same_org" on storage.objects;
create policy "product_images_read_authenticated_same_org"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and split_part(name, '/', 1) = public.current_user_org_id()::text
);

drop policy if exists "product_images_insert_admin_same_org" on storage.objects;
create policy "product_images_insert_admin_same_org"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.current_user_role() = 'admin'
  and split_part(name, '/', 1) = public.current_user_org_id()::text
);

drop policy if exists "product_images_update_admin_same_org" on storage.objects;
create policy "product_images_update_admin_same_org"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.current_user_role() = 'admin'
  and split_part(name, '/', 1) = public.current_user_org_id()::text
)
with check (
  bucket_id = 'product-images'
  and public.current_user_role() = 'admin'
  and split_part(name, '/', 1) = public.current_user_org_id()::text
);

drop policy if exists "product_images_delete_admin_same_org" on storage.objects;
create policy "product_images_delete_admin_same_org"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.current_user_role() = 'admin'
  and split_part(name, '/', 1) = public.current_user_org_id()::text
);
