-- =============================================================================
-- Migration: 20261016000002_create_teams_and_team_members_tables.sql
-- Description: Phase B — Real Team Management, Team Members, and Match Relationship
-- =============================================================================

-- 1. Create teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('cricket', 'badminton', 'padel', 'football')),
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  area text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_teams_captain_id on public.teams(captain_id);
create index if not exists idx_teams_sport on public.teams(sport);

-- 2. Create team_members table
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'PLAYER' check (member_role in ('CAPTAIN', 'PLAYER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'LEFT', 'REMOVED')),
  joined_at timestamptz not null default timezone('utc'::text, now()),
  constraint uq_team_members_team_user unique (team_id, user_id)
);

create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_status on public.team_members(status);

-- 3. Add team_id to matches (nullable for backwards compatibility)
alter table public.matches
  add column if not exists team_id uuid null references public.teams(id) on delete set null;

create index if not exists idx_matches_team_id on public.matches(team_id);

-- 4. Set updated_at trigger for teams
drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

-- 5. Row Level Security (RLS)
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- Teams policies
drop policy if exists "Authenticated users can view teams" on public.teams;
create policy "Authenticated users can view teams"
  on public.teams
  for select
  to authenticated
  using (true);

drop policy if exists "Captains can insert own teams" on public.teams;
create policy "Captains can insert own teams"
  on public.teams
  for insert
  to authenticated
  with check (captain_id = auth.uid());

drop policy if exists "Captains can update own teams" on public.teams;
create policy "Captains can update own teams"
  on public.teams
  for update
  to authenticated
  using (captain_id = auth.uid())
  with check (captain_id = auth.uid());

drop policy if exists "Captains can delete own teams" on public.teams;
create policy "Captains can delete own teams"
  on public.teams
  for delete
  to authenticated
  using (captain_id = auth.uid());

-- Team Members policies
drop policy if exists "Authenticated users can view team members" on public.team_members;
create policy "Authenticated users can view team members"
  on public.team_members
  for select
  to authenticated
  using (true);

drop policy if exists "Captains can manage team members" on public.team_members;
create policy "Captains can manage team members"
  on public.team_members
  for all
  to authenticated
  using (
    exists (
      select 1 from public.teams
      where teams.id = public.team_members.team_id
        and teams.captain_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams
      where teams.id = public.team_members.team_id
        and teams.captain_id = auth.uid()
    )
  );

-- 6. Safe Idempotent Backfill from Existing captain_profiles
do $$
declare
  cap record;
  new_team_id uuid;
  primary_sport text;
begin
  for cap in
    select cp.user_id, cp.team_name, cp.sports, cp.skill_level, cp.primary_location
    from public.captain_profiles cp
    where not exists (
      select 1 from public.teams t where t.captain_id = cp.user_id
    )
  loop
    -- Extract first sport or default to football
    if cap.sports is not null and array_length(cap.sports, 1) > 0 then
      primary_sport := cap.sports[1];
    else
      primary_sport := 'football';
    end if;

    -- Validate allowed sport values
    if primary_sport not in ('cricket', 'badminton', 'padel', 'football') then
      primary_sport := 'football';
    end if;

    new_team_id := gen_random_uuid();

    -- Create team
    insert into public.teams (id, captain_id, name, sport, skill_level, area)
    values (
      new_team_id,
      cap.user_id,
      coalesce(nullif(trim(cap.team_name), ''), 'Team ' || left(cap.user_id::text, 6)),
      primary_sport,
      coalesce(cap.skill_level, 'intermediate'),
      coalesce(nullif(trim(cap.primary_location), ''), 'Lahore')
    );

    -- Add Captain as primary ACTIVE member
    insert into public.team_members (team_id, user_id, member_role, status)
    values (new_team_id, cap.user_id, 'CAPTAIN', 'ACTIVE')
    on conflict (team_id, user_id) do nothing;

    -- Link existing matches to this team
    update public.matches
    set team_id = new_team_id
    where captain_id = cap.user_id
      and team_id is null;
  end loop;
end;
$$;
