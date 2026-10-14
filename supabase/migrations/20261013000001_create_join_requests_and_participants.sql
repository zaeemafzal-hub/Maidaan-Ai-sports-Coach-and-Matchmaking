-- Maidaan Phase 3A Database Migration
-- PostgreSQL schema for Join Requests and Match Participants

-- 1. Create public.join_requests table
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
  message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_join_requests_match_player unique (match_id, player_id)
);

-- 2. Create public.match_participants table
create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint uq_match_participants_match_player unique (match_id, player_id)
);

-- 3. Indexes for join_requests and match_participants
create index if not exists idx_join_requests_match_id on public.join_requests(match_id);
create index if not exists idx_join_requests_player_id on public.join_requests(player_id);
create index if not exists idx_join_requests_status on public.join_requests(status);
create index if not exists idx_match_participants_match_id on public.match_participants(match_id);
create index if not exists idx_match_participants_player_id on public.match_participants(player_id);

-- 4. Enable Row Level Security (RLS)
alter table public.join_requests enable row level security;
alter table public.match_participants enable row level security;

-- 5. Scoped Read Policies for authenticated users
create policy "Authenticated users can view join requests"
  on public.join_requests
  for select
  to authenticated
  using (true);

create policy "Authenticated users can view match participants"
  on public.match_participants
  for select
  to authenticated
  using (true);

-- Note: Mutations (create request, accept/reject request, insert participant, decrement open_slots)
-- are managed strictly via the trusted Express backend using the Supabase Service Role client.
