-- Restrict direct table access using Supabase auth_user_id bindings.

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  )
$$;

alter table public.users
  add column if not exists auth_user_id uuid;

create unique index if not exists idx_users_auth_user_id_unique on public.users(auth_user_id);

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.vehicles enable row level security;
alter table public.routes enable row level security;

drop policy if exists "users_select_role" on public.users;
create policy "users_select_role"
on public.users
for select
to authenticated
using (
  current_app_role() = 'admin'
  or auth_user_id = auth.uid()
);

drop policy if exists "users_insert_admin" on public.users;
create policy "users_insert_admin"
on public.users
for insert
to authenticated
with check (
  current_app_role() = 'admin'
);

drop policy if exists "users_update_admin" on public.users;
create policy "users_update_admin"
on public.users
for update
to authenticated
using (
  current_app_role() = 'admin'
)
with check (
  current_app_role() = 'admin'
);

drop policy if exists "users_delete_admin" on public.users;
create policy "users_delete_admin"
on public.users
for delete
to authenticated
using (
  current_app_role() = 'admin'
);

drop policy if exists "students_select_admin_or_assigned_driver" on public.students;
create policy "students_select_admin_or_assigned_driver"
on public.students
for select
to authenticated
using (
  current_app_role() = 'admin'
  or exists (
    select 1
    from public.routes r
    left join public.vehicles v on v.id = r.vehicle_id
    left join public.users u on u.id = coalesce(r.driver_id, v.driver_id)
    where r.id = public.students.route_id
      and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "students_write_admin" on public.students;
create policy "students_write_admin"
on public.students
for insert
to authenticated
with check (
  current_app_role() = 'admin'
);

drop policy if exists "students_update_admin" on public.students;
create policy "students_update_admin"
on public.students
for update
to authenticated
using (
  current_app_role() = 'admin'
)
with check (
  current_app_role() = 'admin'
);

drop policy if exists "students_delete_admin" on public.students;
create policy "students_delete_admin"
on public.students
for delete
to authenticated
using (
  current_app_role() = 'admin'
);

drop policy if exists "vehicles_select_admin_or_assigned_driver" on public.vehicles;
create policy "vehicles_select_admin_or_assigned_driver"
on public.vehicles
for select
to authenticated
using (
  current_app_role() = 'admin'
  or exists (
    select 1
    from public.users u
    where u.id = public.vehicles.driver_id
      and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "vehicles_write_admin" on public.vehicles;
create policy "vehicles_write_admin"
on public.vehicles
for insert
to authenticated
with check (
  current_app_role() = 'admin'
);

drop policy if exists "vehicles_update_admin" on public.vehicles;
create policy "vehicles_update_admin"
on public.vehicles
for update
to authenticated
using (
  current_app_role() = 'admin'
)
with check (
  current_app_role() = 'admin'
);

drop policy if exists "vehicles_delete_admin" on public.vehicles;
create policy "vehicles_delete_admin"
on public.vehicles
for delete
to authenticated
using (
  current_app_role() = 'admin'
);

drop policy if exists "routes_select_admin_or_assigned_driver" on public.routes;
create policy "routes_select_admin_or_assigned_driver"
on public.routes
for select
to authenticated
using (
  current_app_role() = 'admin'
  or exists (
    select 1
    from public.users u
    where u.id = public.routes.driver_id
      and u.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.vehicles v
    join public.users u on u.id = v.driver_id
    where v.id = public.routes.vehicle_id
      and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "routes_insert_admin" on public.routes;
create policy "routes_insert_admin"
on public.routes
for insert
to authenticated
with check (
  current_app_role() = 'admin'
);

drop policy if exists "routes_update_admin_or_assigned_driver" on public.routes;
create policy "routes_update_admin_or_assigned_driver"
on public.routes
for update
to authenticated
using (
  current_app_role() = 'admin'
  or exists (
    select 1
    from public.users u
    where u.id = public.routes.driver_id
      and u.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.vehicles v
    join public.users u on u.id = v.driver_id
    where v.id = public.routes.vehicle_id
      and u.auth_user_id = auth.uid()
  )
)
with check (
  current_app_role() = 'admin'
  or exists (
    select 1
    from public.users u
    where u.id = public.routes.driver_id
      and u.auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.vehicles v
    join public.users u on u.id = v.driver_id
    where v.id = public.routes.vehicle_id
      and u.auth_user_id = auth.uid()
  )
);

drop policy if exists "routes_delete_admin" on public.routes;
create policy "routes_delete_admin"
on public.routes
for delete
to authenticated
using (
  current_app_role() = 'admin'
);
