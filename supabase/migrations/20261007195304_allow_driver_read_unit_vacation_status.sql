drop policy if exists "unit_vacations_select_admin_or_assigned_driver" on public.unit_vacations;

create policy "unit_vacations_select_admin_or_assigned_driver"
on public.unit_vacations
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'driver')
);
