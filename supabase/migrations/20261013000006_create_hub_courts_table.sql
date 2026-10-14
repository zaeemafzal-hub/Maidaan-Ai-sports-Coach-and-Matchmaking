-- Maidaan Phase 5A Database Migration
-- PostgreSQL schema for Hub Courts Facility Management

-- 1. Create public.hub_courts table
create table if not exists public.hub_courts (
  id uuid primary key default gen_random_uuid(),
  hub_owner_id uuid not null references public.hub_owner_profiles(user_id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('cricket', 'badminton', 'padel', 'football')),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'LIMITED', 'UNAVAILABLE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Court Name Validation Rule: Required, non-empty trimmed, max 80 characters
  constraint chk_hub_courts_name check (
    length(trim(name)) > 0 and length(name) <= 80
  ),

  -- Unique Court Name per Hub Owner profile
  constraint uq_hub_courts_owner_name unique (hub_owner_id, name)
);

-- 2. Indexes for Query Optimization
create index if not exists idx_hub_courts_hub_owner_id on public.hub_courts(hub_owner_id);
create index if not exists idx_hub_courts_sport on public.hub_courts(sport);
create index if not exists idx_hub_courts_status on public.hub_courts(status);

-- 3. Enable Row Level Security (RLS)
alter table public.hub_courts enable row level security;

-- 4. Scoped Read Policy for authenticated users
create policy "Authenticated users can view hub courts"
  on public.hub_courts
  for select
  to authenticated
  using (true);

-- Note: All mutations (Create/Update/Delete) are executed server-side through
-- the trusted Express backend using the Supabase Service Role client with explicit
-- ownership and RBAC verification. No booking, payment, or schedule domain is created.
