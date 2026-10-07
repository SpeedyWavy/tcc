create table if not exists public.password_support_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.users(id) on delete set null,
  driver_email text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_password_support_requests_pending
  on public.password_support_requests(created_at asc)
  where status = 'pending';

create unique index if not exists idx_password_support_requests_one_pending_per_driver
  on public.password_support_requests(driver_id)
  where status = 'pending' and driver_id is not null;

alter table public.password_support_requests enable row level security;
revoke all on public.password_support_requests from anon, authenticated;
grant select, insert, update on public.password_support_requests to service_role;
