-- ============================================================
-- Suppliers + Purchases module for financial reporting
-- Date: 2026-04-09
-- ============================================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  notes text,
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  concept text not null,
  category text not null default 'insumos',
  amount numeric not null check (amount >= 0),
  payment_method text not null default 'transfer',
  purchase_date date not null default current_date,
  invoice_folio text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_org on public.suppliers(organization_id);
create index if not exists idx_purchases_org_date on public.purchases(organization_id, purchase_date desc);
create index if not exists idx_purchases_supplier on public.purchases(supplier_id);

alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "Users can view suppliers in their organization" on public.suppliers;
create policy "Users can view suppliers in their organization"
on public.suppliers
for select
to authenticated
using (organization_id = public.current_user_org_id());

drop policy if exists "Admins can manage suppliers in their organization" on public.suppliers;
create policy "Admins can manage suppliers in their organization"
on public.suppliers
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

drop policy if exists "Users can view purchases in their organization" on public.purchases;
create policy "Users can view purchases in their organization"
on public.purchases
for select
to authenticated
using (organization_id = public.current_user_org_id());

drop policy if exists "Admins can manage purchases in their organization" on public.purchases;
create policy "Admins can manage purchases in their organization"
on public.purchases
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
