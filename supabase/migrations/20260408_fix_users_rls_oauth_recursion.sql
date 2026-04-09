-- ============================================================
-- Fix RLS recursion for users/products/organizations (OAuth-safe)
-- Date: 2026-04-08
-- ============================================================

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.organization_id
  from public.users u
  where u.id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.role::text
  from public.users u
  where u.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_user_org_id() from public;
revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_org_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

drop policy if exists "Users can view users in their organization" on public.users;
drop policy if exists "Admins can manage users in their organization" on public.users;

create policy "Users can view users in their organization"
on public.users
for select
to authenticated
using (organization_id = public.current_user_org_id());

create policy "Admins can manage users in their organization"
on public.users
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = 'admin'
);

drop policy if exists "Users can view their own organization" on public.organizations;

create policy "Users can view their own organization"
on public.organizations
for select
to authenticated
using (id = public.current_user_org_id());

drop policy if exists "Users can view products in their organization" on public.products;
drop policy if exists "Admins can manage products in their organization" on public.products;

create policy "Users can view products in their organization"
on public.products
for select
to authenticated
using (organization_id = public.current_user_org_id());

create policy "Admins can manage products in their organization"
on public.products
for all
to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = any (array['admin', 'supervisor'])
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = any (array['admin', 'supervisor'])
);
