-- Initial schema for the school transport app on Supabase

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  password text not null,
  role text not null default 'driver',
  cpf text,
  email text,
  rg text,
  cnh_category text,
  transport_identification text,
  contact text,
  schedules text,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nome text,
  rm text,
  address text not null,
  endereco text,
  latitude double precision,
  longitude double precision,
  parent_contact text,
  contato_responsavel text,
  responsible_name text,
  responsavel text,
  transport_identification text,
  transporte text,
  unit text,
  unidade text,
  route_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  license_plate text not null unique,
  model text not null,
  capacity integer not null default 0,
  status text not null default 'garage',
  driver_id uuid references public.users(id) on delete set null,
  driver_name text,
  identification text,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  driver_id uuid references public.users(id) on delete cascade,
  stops jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_students_route_id on public.students(route_id);
create index if not exists idx_vehicles_driver_id on public.vehicles(driver_id);
create index if not exists idx_routes_vehicle_id on public.routes(vehicle_id);
create index if not exists idx_routes_driver_id on public.routes(driver_id);

alter table public.students
  add constraint fk_students_route
  foreign key (route_id) references public.routes(id) on delete set null;
