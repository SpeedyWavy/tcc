create table if not exists public.driver_announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(trim(message)) > 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_driver_announcements_active_created_at
  on public.driver_announcements(active, created_at desc);

alter table public.driver_announcements enable row level security;
grant select, insert, update on public.driver_announcements to authenticated;

drop policy if exists "driver_announcements_select_app_users" on public.driver_announcements;
create policy "driver_announcements_select_app_users"
on public.driver_announcements
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'driver')
);

drop policy if exists "driver_announcements_insert_admin" on public.driver_announcements;
create policy "driver_announcements_insert_admin"
on public.driver_announcements
for insert
to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  and created_by = auth.uid()
);

drop policy if exists "driver_announcements_update_admin" on public.driver_announcements;
create policy "driver_announcements_update_admin"
on public.driver_announcements
for update
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');
