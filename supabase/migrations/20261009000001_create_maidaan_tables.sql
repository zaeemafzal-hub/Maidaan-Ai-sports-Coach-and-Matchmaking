-- Maidaan Phase 1 Database Migration
-- PostgreSQL schema for Supabase Auth integration and Role Profiles

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER', 'ADMIN')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create player_profiles table
create table if not exists public.player_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_sports text[] not null,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  primary_location text not null,
  matches_played integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create captain_profiles table
create table if not exists public.captain_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  team_name text not null,
  sports text[] not null,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  primary_location text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Create hub_owner_profiles table
create table if not exists public.hub_owner_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  hub_name text not null,
  contact_number text,
  sports text[] not null default '{}',
  location text not null,
  court_count integer not null check (court_count >= 0),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.player_profiles enable row level security;
alter table public.captain_profiles enable row level security;
alter table public.hub_owner_profiles enable row level security;

-- 6. Read Policies for authenticated users to inspect their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can view own player profile"
  on public.player_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can view own captain profile"
  on public.captain_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can view own hub profile"
  on public.hub_owner_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Note: Protected business writes are handled via the trusted Express backend
-- using the Supabase Service Role client with explicit RBAC and ownership verification.
