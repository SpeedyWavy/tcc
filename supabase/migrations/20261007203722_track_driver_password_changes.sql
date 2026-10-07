alter table public.users
  add column if not exists previous_password_hash text,
  add column if not exists password_changed_at timestamptz;
