-- Maidaan Phase 2 Database Migration
-- PostgreSQL schema for Persisted Matches

-- 1. Create public.matches table
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null check (sport in ('cricket', 'badminton', 'padel', 'football')),
  title text not null,
  format text,
  date date not null,
  start_time time not null,
  venue_name text not null,
  area text not null,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  total_capacity integer not null check (total_capacity >= 2 and total_capacity <= 30),
  open_slots integer not null check (open_slots >= 0 and open_slots <= total_capacity),
  contribution_per_player numeric null check (contribution_per_player is null or contribution_per_player >= 0),
  notes text null,
  status text not null default 'OPEN' check (status in ('OPEN', 'FULL', 'UPCOMING')),
  schematic_x integer null check (schematic_x is null or (schematic_x >= 0 and schematic_x <= 100)),
  schematic_y integer null check (schematic_y is null or (schematic_y >= 0 and schematic_y <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for efficient lookup
create index if not exists idx_matches_captain_id on public.matches(captain_id);
create index if not exists idx_matches_sport on public.matches(sport);
create index if not exists idx_matches_date on public.matches(date);

-- 3. Enable Row Level Security (RLS)
alter table public.matches enable row level security;

-- 4. Scoped Read Policy for authenticated users
create policy "Authenticated users can view matches"
  on public.matches
  for select
  to authenticated
  using (true);

-- Note: Mutations (Create/Update) are managed strictly via the trusted Express backend
-- using the Supabase Service Role client with RBAC and ownership verification.
