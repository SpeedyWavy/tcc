-- Ensure routes table supports status updates used by the admin flow
alter table public.routes
  add column if not exists status text not null default 'Aguardando Saída';
