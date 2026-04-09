-- ============================================================
-- In-app notifications table + RLS
-- Date: 2026-04-09
-- Fix: remove PGRST205 (public.notifications missing)
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info' check (type in ('order', 'inventory', 'alert', 'info')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  read boolean not null default false,
  data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_unread
  on public.notifications(user_id)
  where read = false;

alter table public.notifications enable row level security;

-- Owner can read own notifications
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
);

-- Any authenticated user can create notifications only for users in same org
-- (sender org is resolved from current_user_org_id helper)
drop policy if exists "Users can create notifications in own organization" on public.notifications;
create policy "Users can create notifications in own organization"
on public.notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users target
    where target.id = notifications.user_id
      and target.organization_id = public.current_user_org_id()
      and target.active = true
  )
);

-- Users can update read state only for their own notifications
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);

-- Realtime support for notification center (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
