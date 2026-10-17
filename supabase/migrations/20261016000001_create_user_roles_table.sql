-- Maidaan Multi-Role Account Architecture Migration
-- Normalizes roles into public.user_roles table supporting multiple capabilities per account.

-- 1. Create public.user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER', 'ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  constraint user_roles_user_role_unique unique (user_id, role)
);

-- 2. Create indexes for high-performance role lookups
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_user_roles_status on public.user_roles(status);

-- 3. Enable Row Level Security (RLS)
alter table public.user_roles enable row level security;

-- 4. RLS Policies
create policy "Users can view own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 5. Backfill existing users safely and idempotently:
-- All non-admin profiles receive PLAYER capability by default
insert into public.user_roles (user_id, role, status)
select id, 'PLAYER', 'ACTIVE'
from public.profiles
where role in ('PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER')
on conflict (user_id, role) do nothing;

-- Backfill TEAM_CAPTAIN capabilities
insert into public.user_roles (user_id, role, status)
select id, 'TEAM_CAPTAIN', 'ACTIVE'
from public.profiles
where role = 'TEAM_CAPTAIN'
on conflict (user_id, role) do nothing;

-- Backfill HUB_OWNER capabilities
insert into public.user_roles (user_id, role, status)
select id, 'HUB_OWNER', 'ACTIVE'
from public.profiles
where role = 'HUB_OWNER'
on conflict (user_id, role) do nothing;

-- Backfill ADMIN accounts
insert into public.user_roles (user_id, role, status)
select id, 'ADMIN', 'ACTIVE'
from public.profiles
where role = 'ADMIN'
on conflict (user_id, role) do nothing;
