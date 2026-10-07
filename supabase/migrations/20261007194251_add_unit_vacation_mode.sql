-- Mantém esta migration executável mesmo em bancos onde a migration de
-- vinculação dos usuários autenticados ainda não foi aplicada.
alter table public.users
  add column if not exists auth_user_id uuid;

create unique index if not exists idx_users_auth_user_id_unique
  on public.users(auth_user_id);

alter table public.routes
  add column if not exists status_before_vacation text;

create table if not exists public.unit_vacations (
  unit text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.unit_vacations enable row level security;

grant select, insert, update, delete on public.unit_vacations to authenticated;

drop policy if exists "unit_vacations_select_admin_or_assigned_driver" on public.unit_vacations;
create policy "unit_vacations_select_admin_or_assigned_driver"
on public.unit_vacations
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'driver')
);

drop policy if exists "unit_vacations_insert_admin" on public.unit_vacations;
create policy "unit_vacations_insert_admin"
on public.unit_vacations
for insert
to authenticated
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "unit_vacations_update_admin" on public.unit_vacations;
create policy "unit_vacations_update_admin"
on public.unit_vacations
for update
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');

drop policy if exists "unit_vacations_delete_admin" on public.unit_vacations;
create policy "unit_vacations_delete_admin"
on public.unit_vacations
for delete
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');
