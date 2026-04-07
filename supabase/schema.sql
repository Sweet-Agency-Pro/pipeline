-- ============================================
-- Pipeline Agence Sweet - Database Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  avatar_url text,
  role text default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- CLIENTS (prospects / clients)
-- ============================================
create type client_status as enum (
  'prospect',
  'contacte',
  'qualifie',
  'proposition',
  'negociation',
  'gagne',
  'perdu'
);

create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  company text,
  status client_status default 'prospect',
  source text,
  github_url text,
  estimated_amount numeric(12,2) default 0,
  notes text,
  last_contacted_at timestamptz,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.clients enable row level security;

create policy "Clients are viewable by authenticated users"
  on public.clients for select
  to authenticated
  using (true);

create policy "Authenticated users can insert clients"
  on public.clients for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update clients"
  on public.clients for update
  to authenticated
  using (true);

create policy "Authenticated users can delete clients"
  on public.clients for delete
  to authenticated
  using (true);

-- ============================================
-- PROJECTS (clients gagnes -> projets)
-- ============================================
create type project_status as enum (
  'en_cours',
  'termine',
  'en_pause',
  'annule'
);

create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  status project_status default 'en_cours',
  budget numeric(12,2) default 0,
  deadline date,
  description text,
  github_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Projects are viewable by authenticated users"
  on public.projects for select
  to authenticated
  using (true);

create policy "Authenticated users can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update projects"
  on public.projects for update
  to authenticated
  using (true);

create policy "Authenticated users can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- ============================================
-- ACTIVITY LOG
-- ============================================
create table public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.activity_log enable row level security;

create policy "Activity log viewable by authenticated users"
  on public.activity_log for select
  to authenticated
  using (true);

create policy "Authenticated users can insert activity"
  on public.activity_log for insert
  to authenticated
  with check (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on public.clients
  for each row execute procedure public.update_updated_at();

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- ============================================
-- INDEXES
-- ============================================
create index idx_clients_status on public.clients(status);
create index idx_clients_assigned_to on public.clients(assigned_to);
create index idx_projects_client_id on public.projects(client_id);
create index idx_projects_status on public.projects(status);
create index idx_activity_log_entity on public.activity_log(entity_type, entity_id);
create index idx_activity_log_created_at on public.activity_log(created_at desc);
