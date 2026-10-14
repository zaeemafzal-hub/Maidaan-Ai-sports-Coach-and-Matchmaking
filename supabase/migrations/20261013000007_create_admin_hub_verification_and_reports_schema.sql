-- Maidaan Phase 6A Database Migration
-- PostgreSQL schema for Admin Hub Verification Requests and Community Report Reviews

-- =============================================================================
-- TABLE 1: HUB VERIFICATION REQUESTS
-- =============================================================================

create table if not exists public.hub_verification_requests (
  id uuid primary key default gen_random_uuid(),
  hub_owner_id uuid not null references public.hub_owner_profiles(user_id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  admin_note text null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Admin Note Limit: Optional, maximum 300 characters
  constraint chk_hub_verification_requests_admin_note check (
    admin_note is null or length(admin_note) <= 300
  )
);

-- One Active Request Rule:
-- A Hub Owner can have at most one active PENDING verification request at any given time.
-- Historical APPROVED / REJECTED records are retained without conflict.
create unique index if not exists uq_hub_verification_requests_pending
  on public.hub_verification_requests(hub_owner_id)
  where status = 'PENDING';

-- Query Optimization Indexes for Hub Verification Requests
create index if not exists idx_hub_verification_requests_hub_owner_id
  on public.hub_verification_requests(hub_owner_id);

create index if not exists idx_hub_verification_requests_status
  on public.hub_verification_requests(status);

create index if not exists idx_hub_verification_requests_submitted_at
  on public.hub_verification_requests(submitted_at desc);

-- Enable Row Level Security (RLS)
alter table public.hub_verification_requests enable row level security;

-- Scoped Read Policy: Hub owners can view their own verification requests
create policy "Hub owners can view their own verification requests"
  on public.hub_verification_requests
  for select
  to authenticated
  using (auth.uid() = hub_owner_id);

-- Note: Admin reads and state transitions (PENDING -> APPROVED / REJECTED)
-- are server-mediated via the Express backend service role with role = 'ADMIN' RBAC.
-- No duplicate is_verified column exists here; hub_owner_profiles.is_verified is the source of truth.


-- =============================================================================
-- TABLE 2: COMMUNITY REPORTS
-- =============================================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid null references public.profiles(id) on delete set null,
  match_id uuid null references public.matches(id) on delete set null,
  category text not null check (category in ('CONDUCT', 'HARASSMENT', 'UNSAFE_BEHAVIOR', 'SPAM', 'OTHER')),
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'DISMISSED', 'FOLLOW_UP')),
  admin_note text null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null,

  -- Report Description Rule: Trimmed length > 0 and maximum 1000 characters
  constraint chk_reports_description check (
    length(trim(description)) > 0 and length(description) <= 1000
  ),

  -- Admin Note Limit: Optional, maximum 300 characters
  constraint chk_reports_admin_note check (
    admin_note is null or length(admin_note) <= 300
  ),

  -- Report Context / Subject Rule: Must specify at least one target (reported user or match)
  constraint chk_reports_target check (
    reported_user_id is not null or match_id is not null
  )
);

-- Query Optimization Indexes for Reports
create index if not exists idx_reports_reporter_id
  on public.reports(reporter_id);

create index if not exists idx_reports_reported_user_id
  on public.reports(reported_user_id);

create index if not exists idx_reports_match_id
  on public.reports(match_id);

create index if not exists idx_reports_status
  on public.reports(status);

create index if not exists idx_reports_category
  on public.reports(category);

create index if not exists idx_reports_created_at
  on public.reports(created_at desc);

-- Enable Row Level Security (RLS)
alter table public.reports enable row level security;

-- Scoped Read Policy: Reporters can view their own filed reports
create policy "Reporters can view their own reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- Note: Admin investigations and resolution transitions (OPEN -> RESOLVED / DISMISSED / FOLLOW_UP)
-- are server-mediated via the Express backend service role with role = 'ADMIN' RBAC.
-- No punitive tables (bans, suspensions, blacklists) are created.
