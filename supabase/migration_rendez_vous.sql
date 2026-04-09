-- ============================================
-- Migration: Add rendez_vous table
-- Run this in Supabase SQL Editor
-- ============================================

-- RDV status enum
create type rdv_status as enum (
  'planifie',
  'confirme',
  'annule',
  'termine'
);

-- Rendez-vous table
create table public.rendez_vous (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  assigned_to uuid references public.profiles(id) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  description text,
  status rdv_status default 'planifie',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.rendez_vous enable row level security;

create policy "RDV are viewable by authenticated users"
  on public.rendez_vous for select
  to authenticated
  using (true);

create policy "Authenticated users can insert RDV"
  on public.rendez_vous for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update RDV"
  on public.rendez_vous for update
  to authenticated
  using (true);

create policy "Authenticated users can delete RDV"
  on public.rendez_vous for delete
  to authenticated
  using (true);

-- Auto-update updated_at
create trigger rendez_vous_updated_at
  before update on public.rendez_vous
  for each row execute procedure public.update_updated_at();

-- Indexes
create index idx_rdv_assigned_to on public.rendez_vous(assigned_to);
create index idx_rdv_start_time on public.rendez_vous(start_time);
create index idx_rdv_client_id on public.rendez_vous(client_id);
