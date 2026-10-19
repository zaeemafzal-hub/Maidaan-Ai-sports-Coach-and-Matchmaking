-- =============================================================================
-- MAIDAAN COMPLETE CONSOLIDATED SUPABASE SCHEMA (Phases 1 through 6)
--
-- Safe, idempotent, and hardened PostgreSQL migration script.
-- Target: Supabase Dashboard SQL Editor
-- (https://supabase.com/dashboard/project/usqojzkpvlkxwvbwwzov/sql)
--
-- Includes:
-- 1. All 14 Core Domain Tables
-- 2. Foreign Key References with Cascade / Set Null rules
-- 3. Check & Unique Constraints
-- 4. B-Tree & Partial Unique Indexes
-- 5. Row Level Security (RLS) enabled on all tables (Strict Default Deny)
-- 6. Scoped Read Policies with Drop-If-Exists Idempotency
-- 7. Automated updated_at trigger helper & table triggers
-- 8. Hardened Stored Procedures / RPCs:
--    - SECURITY DEFINER
--    - SET search_path = public, pg_temp
--    - Fully qualified table references
--    - Revoked EXECUTE from PUBLIC, anon, authenticated
--    - Granted EXECUTE strictly to service_role
-- =============================================================================

-- =============================================================================
-- 0. GLOBAL HELPER: AUTOMATIC updated_at TIMESTAMP MANAGEMENT
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =============================================================================
-- 1. PROFILES & ROLE SUB-PROFILES (Phase 1)
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER', 'ADMIN')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_sports text[] not null,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  primary_location text not null,
  matches_played integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.captain_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  team_name text not null,
  sports text[] not null,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'advanced')),
  primary_location text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.player_profiles enable row level security;
alter table public.captain_profiles enable row level security;
alter table public.hub_owner_profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can view own player profile" on public.player_profiles;
create policy "Users can view own player profile"
  on public.player_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view own captain profile" on public.captain_profiles;
create policy "Users can view own captain profile"
  on public.captain_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view own hub profile" on public.hub_owner_profiles;
create policy "Users can view own hub profile"
  on public.hub_owner_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_player_profiles_updated_at on public.player_profiles;
create trigger set_player_profiles_updated_at
  before update on public.player_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_captain_profiles_updated_at on public.captain_profiles;
create trigger set_captain_profiles_updated_at
  before update on public.captain_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_hub_owner_profiles_updated_at on public.hub_owner_profiles;
create trigger set_hub_owner_profiles_updated_at
  before update on public.hub_owner_profiles
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 2. MATCH FIXTURES (Phase 2)
-- =============================================================================

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

create index if not exists idx_matches_captain_id on public.matches(captain_id);
create index if not exists idx_matches_sport on public.matches(sport);
create index if not exists idx_matches_date on public.matches(date);

alter table public.matches enable row level security;

-- Authenticated discovery: players browse all open fixtures across map/list views
drop policy if exists "Authenticated users can view matches" on public.matches;
create policy "Authenticated users can view matches"
  on public.matches
  for select
  to authenticated
  using (true);

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 3. JOIN REQUESTS & MATCH PARTICIPANTS (Phase 3A)
-- =============================================================================

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

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint uq_match_participants_match_player unique (match_id, player_id)
);

create index if not exists idx_join_requests_match_id on public.join_requests(match_id);
create index if not exists idx_join_requests_player_id on public.join_requests(player_id);
create index if not exists idx_join_requests_status on public.join_requests(status);
create index if not exists idx_match_participants_match_id on public.match_participants(match_id);
create index if not exists idx_match_participants_player_id on public.match_participants(player_id);

alter table public.join_requests enable row level security;
alter table public.match_participants enable row level security;

-- HARDENED JOIN REQUEST POLICY:
-- Accessible strictly by the applicant player OR the captain who owns the related match fixture
drop policy if exists "Authenticated users can view join requests" on public.join_requests;
drop policy if exists "Players and captains can view join requests" on public.join_requests;
create policy "Players and captains can view join requests"
  on public.join_requests
  for select
  to authenticated
  using (
    player_id = auth.uid()
    or exists (
      select 1 from public.matches
      where matches.id = public.join_requests.match_id
        and matches.captain_id = auth.uid()
    )
  );

-- HARDENED MATCH PARTICIPANTS POLICY:
-- Accessible strictly by the confirmed participant, the match captain, or a fellow confirmed squad participant
drop policy if exists "Authenticated users can view match participants" on public.match_participants;
drop policy if exists "Participants and captains can view match participants" on public.match_participants;
create policy "Participants and captains can view match participants"
  on public.match_participants
  for select
  to authenticated
  using (
    player_id = auth.uid()
    or exists (
      select 1 from public.matches
      where matches.id = public.match_participants.match_id
        and matches.captain_id = auth.uid()
    )
    or exists (
      select 1 from public.match_participants p2
      where p2.match_id = public.match_participants.match_id
        and p2.player_id = auth.uid()
    )
  );

drop trigger if exists set_join_requests_updated_at on public.join_requests;
create trigger set_join_requests_updated_at
  before update on public.join_requests
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 4. ACCEPT JOIN REQUEST RPC (Phase 3B) - HARDENED
-- =============================================================================

create or replace function public.accept_join_request(
  p_request_id uuid,
  p_captain_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request record;
  v_match record;
  v_participant_id uuid;
  v_new_slots integer;
  v_new_status text;
  v_now timestamptz := now();
begin
  select * into v_request
  from public.join_requests
  where id = p_request_id
  for update;

  if not found then
    return json_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'Join request not found.');
  end if;

  if v_request.status <> 'PENDING' then
    return json_build_object('success', false, 'code', 'INVALID_STATUS', 'error', 'Only PENDING requests can be accepted.');
  end if;

  select * into v_match
  from public.matches
  where id = v_request.match_id
  for update;

  if not found then
    return json_build_object('success', false, 'code', 'MATCH_NOT_FOUND', 'error', 'Associated match not found.');
  end if;

  if v_match.captain_id <> p_captain_id then
    return json_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only the match captain can accept requests.');
  end if;

  if v_match.open_slots <= 0 then
    return json_build_object('success', false, 'code', 'MATCH_FULL', 'error', 'Match is already full.');
  end if;

  if exists (
    select 1 from public.match_participants
    where match_id = v_request.match_id and player_id = v_request.player_id
  ) then
    return json_build_object('success', false, 'code', 'ALREADY_PARTICIPANT', 'error', 'Player is already a confirmed participant.');
  end if;

  insert into public.match_participants (id, match_id, player_id, joined_at)
  values (gen_random_uuid(), v_request.match_id, v_request.player_id, v_now)
  returning id into v_participant_id;

  update public.join_requests
  set status = 'ACCEPTED', updated_at = v_now
  where id = p_request_id;

  v_new_slots := v_match.open_slots - 1;
  v_new_status := case when v_new_slots = 0 then 'FULL' else v_match.status end;

  update public.matches
  set open_slots = v_new_slots,
      status = v_new_status,
      updated_at = v_now
  where id = v_request.match_id;

  return json_build_object(
    'success', true,
    'requestId', p_request_id,
    'matchId', v_request.match_id,
    'playerId', v_request.player_id,
    'status', 'ACCEPTED',
    'openSlots', v_new_slots,
    'matchStatus', v_new_status,
    'participantId', v_participant_id,
    'updatedAt', v_now
  );
end;
$$;

-- Exact RPC Privileges: Service Role Only
revoke execute on function public.accept_join_request(uuid, uuid) from public;
revoke execute on function public.accept_join_request(uuid, uuid) from anon;
revoke execute on function public.accept_join_request(uuid, uuid) from authenticated;
grant execute on function public.accept_join_request(uuid, uuid) to service_role;


-- =============================================================================
-- 5. NOTIFICATIONS (Phase 3D)
-- =============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('JOIN_REQUEST_RECEIVED', 'JOIN_REQUEST_ACCEPTED', 'JOIN_REQUEST_REJECTED')),
  title text not null,
  message text not null,
  match_id uuid null references public.matches(id) on delete cascade,
  join_request_id uuid null references public.join_requests(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);


-- =============================================================================
-- 6. CHAT ROOMS, MEMBERS, MESSAGES (Phase 4A)
-- =============================================================================

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('DIRECT', 'GROUP')),
  match_id uuid null references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_chat_rooms_type_match check (
    (type = 'GROUP' and match_id is not null) or
    (type = 'DIRECT' and match_id is null)
  )
);

create unique index if not exists uq_chat_rooms_match_group
  on public.chat_rooms(match_id)
  where type = 'GROUP';

create table if not exists public.chat_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint uq_chat_room_members_room_user unique (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint chk_chat_messages_body check (
    length(trim(body)) > 0 and length(body) <= 500
  )
);

create index if not exists idx_chat_room_members_room_id on public.chat_room_members(room_id);
create index if not exists idx_chat_room_members_user_id on public.chat_room_members(user_id);
create index if not exists idx_chat_messages_room_id on public.chat_messages(room_id);
create index if not exists idx_chat_messages_sender_id on public.chat_messages(sender_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Members can view their chat rooms" on public.chat_rooms;
create policy "Members can view their chat rooms"
  on public.chat_rooms
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members
      where room_id = public.chat_rooms.id
        and user_id = auth.uid()
    )
  );

drop policy if exists "Members can view room members" on public.chat_room_members;
create policy "Members can view room members"
  on public.chat_room_members
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members m2
      where m2.room_id = public.chat_room_members.room_id
        and m2.user_id = auth.uid()
    )
  );

drop policy if exists "Members can view room messages" on public.chat_messages;
create policy "Members can view room messages"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_room_members
      where room_id = public.chat_messages.room_id
        and user_id = auth.uid()
    )
  );

drop trigger if exists set_chat_rooms_updated_at on public.chat_rooms;
create trigger set_chat_rooms_updated_at
  before update on public.chat_rooms
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 7. FIND OR CREATE DIRECT CHAT RPC (Phase 4B) - HARDENED
-- =============================================================================

create or replace function public.find_or_create_direct_chat(
  p_user_a uuid,
  p_user_b uuid
)
returns table (
  room_id uuid,
  created boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_u1 uuid;
  v_u2 uuid;
begin
  if p_user_a = p_user_b then
    raise exception 'Cannot create direct chat room with oneself';
  end if;

  if p_user_a < p_user_b then
    v_u1 := p_user_a;
    v_u2 := p_user_b;
  else
    v_u1 := p_user_b;
    v_u2 := p_user_a;
  end if;

  perform pg_advisory_xact_lock(
    ('x' || substr(md5(v_u1::text || ':' || v_u2::text), 1, 8))::bit(32)::int
  );

  select m1.room_id into v_room_id
  from public.chat_room_members m1
  join public.chat_room_members m2 on m1.room_id = m2.room_id
  join public.chat_rooms r on r.id = m1.room_id
  where r.type = 'DIRECT'
    and m1.user_id = v_u1
    and m2.user_id = v_u2
  limit 1;

  if v_room_id is not null then
    return query select v_room_id, false;
    return;
  end if;

  insert into public.chat_rooms (type, match_id)
  values ('DIRECT', null)
  returning id into v_room_id;

  insert into public.chat_room_members (room_id, user_id)
  values (v_room_id, v_u1), (v_room_id, v_u2);

  return query select v_room_id, true;
end;
$$;

-- Exact RPC Privileges: Service Role Only
revoke execute on function public.find_or_create_direct_chat(uuid, uuid) from public;
revoke execute on function public.find_or_create_direct_chat(uuid, uuid) from anon;
revoke execute on function public.find_or_create_direct_chat(uuid, uuid) from authenticated;
grant execute on function public.find_or_create_direct_chat(uuid, uuid) to service_role;


-- =============================================================================
-- 8. HUB COURTS (Phase 5A)
-- =============================================================================

create table if not exists public.hub_courts (
  id uuid primary key default gen_random_uuid(),
  hub_owner_id uuid not null references public.hub_owner_profiles(user_id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('cricket', 'badminton', 'padel', 'football')),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'LIMITED', 'UNAVAILABLE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_hub_courts_name check (
    length(trim(name)) > 0 and length(name) <= 80
  ),
  constraint uq_hub_courts_owner_name unique (hub_owner_id, name)
);

create index if not exists idx_hub_courts_hub_owner_id on public.hub_courts(hub_owner_id);
create index if not exists idx_hub_courts_sport on public.hub_courts(sport);
create index if not exists idx_hub_courts_status on public.hub_courts(status);

alter table public.hub_courts enable row level security;

-- Authenticated discovery: players view court facilities and sports offered by hubs
drop policy if exists "Authenticated users can view hub courts" on public.hub_courts;
create policy "Authenticated users can view hub courts"
  on public.hub_courts
  for select
  to authenticated
  using (true);

drop trigger if exists set_hub_courts_updated_at on public.hub_courts;
create trigger set_hub_courts_updated_at
  before update on public.hub_courts
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 9. ADMIN HUB VERIFICATION & REPORTS (Phase 6A)
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
  constraint chk_hub_verification_requests_admin_note check (
    admin_note is null or length(admin_note) <= 300
  )
);

create unique index if not exists uq_hub_verification_requests_pending
  on public.hub_verification_requests(hub_owner_id)
  where status = 'PENDING';

create index if not exists idx_hub_verification_requests_hub_owner_id
  on public.hub_verification_requests(hub_owner_id);
create index if not exists idx_hub_verification_requests_status
  on public.hub_verification_requests(status);
create index if not exists idx_hub_verification_requests_submitted_at
  on public.hub_verification_requests(submitted_at desc);

alter table public.hub_verification_requests enable row level security;

drop policy if exists "Hub owners can view their own verification requests" on public.hub_verification_requests;
create policy "Hub owners can view their own verification requests"
  on public.hub_verification_requests
  for select
  to authenticated
  using (auth.uid() = hub_owner_id);

drop trigger if exists set_hub_verification_requests_updated_at on public.hub_verification_requests;
create trigger set_hub_verification_requests_updated_at
  before update on public.hub_verification_requests
  for each row execute function public.set_updated_at();

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
  constraint chk_reports_description check (
    length(trim(description)) > 0 and length(description) <= 1000
  ),
  constraint chk_reports_admin_note check (
    admin_note is null or length(admin_note) <= 300
  ),
  constraint chk_reports_target check (
    reported_user_id is not null or match_id is not null
  )
);

create index if not exists idx_reports_reporter_id on public.reports(reporter_id);
create index if not exists idx_reports_reported_user_id on public.reports(reported_user_id);
create index if not exists idx_reports_match_id on public.reports(match_id);
create index if not exists idx_reports_status on public.reports(status);
create index if not exists idx_reports_category on public.reports(category);
create index if not exists idx_reports_created_at on public.reports(created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Reporters can view their own reports" on public.reports;
create policy "Reporters can view their own reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 10. REVIEW HUB VERIFICATION RPC (Phase 6B) - HARDENED
-- =============================================================================

create or replace function public.review_hub_verification(
  p_request_id uuid,
  p_admin_id uuid,
  p_action text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request record;
  v_new_status text;
  v_now timestamptz := now();
begin
  if p_action = 'APPROVE' then
    v_new_status := 'APPROVED';
  elsif p_action = 'REJECT' then
    v_new_status := 'REJECTED';
  else
    raise exception 'Invalid verification review action: %', p_action;
  end if;

  if p_admin_note is not null and length(p_admin_note) > 300 then
    raise exception 'Admin note exceeds 300 characters';
  end if;

  select * into v_request
  from public.hub_verification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Verification request not found';
  end if;

  if v_request.status != 'PENDING' then
    raise exception 'Cannot review verification request with status: %', v_request.status;
  end if;

  update public.hub_verification_requests
  set
    status = v_new_status,
    admin_note = p_admin_note,
    reviewed_by = p_admin_id,
    reviewed_at = v_now,
    updated_at = v_now
  where id = p_request_id;

  if v_new_status = 'APPROVED' then
    update public.hub_owner_profiles
    set
      is_verified = true,
      updated_at = v_now
    where user_id = v_request.hub_owner_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'requestId', p_request_id,
    'status', v_new_status,
    'reviewedAt', v_now
  );
end;
$$;

-- Exact RPC Privileges: Service Role Only
revoke execute on function public.review_hub_verification(uuid, uuid, text, text) from public;
revoke execute on function public.review_hub_verification(uuid, uuid, text, text) from anon;
revoke execute on function public.review_hub_verification(uuid, uuid, text, text) from authenticated;
grant execute on function public.review_hub_verification(uuid, uuid, text, text) to service_role;


-- =============================================================================
-- 10. MULTI-ROLE CAPABILITIES (Phase A)
-- =============================================================================

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER', 'ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  constraint user_roles_user_role_unique unique (user_id, role)
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_user_roles_status on public.user_roles(status);

alter table public.user_roles enable row level security;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Backfill existing profiles
insert into public.user_roles (user_id, role, status)
select id, 'PLAYER', 'ACTIVE'
from public.profiles
where role in ('PLAYER', 'TEAM_CAPTAIN', 'HUB_OWNER')
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role, status)
select id, 'TEAM_CAPTAIN', 'ACTIVE'
from public.profiles
where role = 'TEAM_CAPTAIN'
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role, status)
select id, 'HUB_OWNER', 'ACTIVE'
from public.profiles
where role = 'HUB_OWNER'
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role, status)
select id, 'ADMIN', 'ACTIVE'
from public.profiles
where role = 'ADMIN'
on conflict (user_id, role) do nothing;

-- =============================================================================
-- 11. TEAMS & TEAM MEMBERS (Phase B)
-- =============================================================================

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

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'PLAYER' check (member_role in ('CAPTAIN', 'VICE_CAPTAIN', 'PLAYER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'LEFT', 'REMOVED')),
  joined_at timestamptz not null default timezone('utc'::text, now()),
  constraint uq_team_members_team_user unique (team_id, user_id)
);

create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_team_members_status on public.team_members(status);

alter table public.matches
  add column if not exists team_id uuid null references public.teams(id) on delete set null;

create index if not exists idx_matches_team_id on public.matches(team_id);

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

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




-- F0 incremental reconciliation (also required for a fresh consolidated install)
-- F0: additive reconciliation. Apply after all previous incremental migrations.
-- No record is deleted. Duplicate captains stop the transaction for manual review.
begin;
do $$ begin
  if exists(select 1 from public.teams group by captain_id having count(*) > 1) then
    raise exception 'Duplicate captain teams exist. Review them before applying F0; no rows were changed.';
  end if;
end $$;
create unique index if not exists teams_one_primary_per_captain on public.teams(captain_id);
alter table public.team_members drop constraint if exists team_members_member_role_check;
alter table public.team_members drop constraint if exists team_members_status_check;
update public.team_members set status='LEFT' where status='INACTIVE';
alter table public.team_members add constraint team_members_member_role_check check(member_role in ('CAPTAIN','VICE_CAPTAIN','PLAYER'));
alter table public.team_members add constraint team_members_status_check check(status in ('ACTIVE','INVITED','LEFT','REMOVED'));

alter table public.chat_messages add column if not exists client_message_id text;
alter table public.chat_messages drop constraint if exists chat_messages_client_message_id_check;
alter table public.chat_messages add constraint chat_messages_client_message_id_check check(client_message_id is null or client_message_id ~ '^[A-Za-z0-9:_-]{1,128}$');
create unique index if not exists chat_messages_sender_retry_key on public.chat_messages(room_id,sender_id,client_message_id);

-- Both operations lock the match row before counting/writing participants or recruitment.
create or replace function public.update_match_recruitment(p_match_id uuid,p_captain_id uuid,p_open_slots integer)
returns public.matches language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.matches; n integer;
begin
  if not exists(select 1 from public.user_roles where user_id=p_captain_id and role='TEAM_CAPTAIN' and status='ACTIVE') then raise exception 'Captain capability required.'; end if;
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'Match not found.'; end if;
  if m.captain_id<>p_captain_id then raise exception 'Only the match captain can update recruitment.'; end if;
  select count(*) into n from public.match_participants where match_id=p_match_id;
  if p_open_slots is null or p_open_slots<0 or p_open_slots>m.total_capacity-n then raise exception 'openSlots exceeds remaining capacity.'; end if;
  update public.matches set open_slots=p_open_slots,status=case when p_open_slots=0 then 'FULL' else 'OPEN' end,updated_at=now() where id=p_match_id returning * into m;
  return m;
end $$;

create or replace function public.accept_join_request(p_request_id uuid,p_captain_id uuid)
returns json language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.join_requests; m public.matches; n integer; slots integer; state text; stamp timestamptz:=now();
begin
  if not exists(select 1 from public.user_roles where user_id=p_captain_id and role='TEAM_CAPTAIN' and status='ACTIVE') then
    return json_build_object('success',false,'code','FORBIDDEN','error','Captain capability required.');
  end if;
  select * into r from public.join_requests where id=p_request_id for update;
  if not found then return json_build_object('success',false,'code','NOT_FOUND','error','Join request not found.'); end if;
  select * into m from public.matches where id=r.match_id for update;
  if not found then return json_build_object('success',false,'code','NOT_FOUND','error','Match not found.'); end if;
  if m.captain_id<>p_captain_id then return json_build_object('success',false,'code','FORBIDDEN','error','Only the match captain can accept requests.'); end if;
  if r.status<>'PENDING' then return json_build_object('success',false,'code','INVALID_STATUS','error','Only pending requests can be accepted.'); end if;
  select count(*) into n from public.match_participants where match_id=m.id;
  if m.open_slots<=0 or n>=m.total_capacity then return json_build_object('success',false,'code','MATCH_FULL','error','Match is full.'); end if;
  if exists(select 1 from public.match_participants where match_id=m.id and player_id=r.player_id) then return json_build_object('success',false,'code','ALREADY_PARTICIPANT','error','Already participating.'); end if;
  insert into public.match_participants(match_id,player_id,joined_at) values(m.id,r.player_id,stamp);
  slots:=least(m.open_slots-1,m.total_capacity-n-1); state:=case when slots=0 then 'FULL' else 'OPEN' end;
  update public.matches set open_slots=slots,status=state,updated_at=stamp where id=m.id;
  update public.join_requests set status='ACCEPTED',updated_at=stamp where id=r.id;
  insert into public.notifications(user_id,type,title,message,match_id,join_request_id)
    values(r.player_id,'JOIN_REQUEST_ACCEPTED','SPOT CONFIRMED','Your slot for '||m.title||' has been confirmed. You are in the lineup!',m.id,r.id);
  return json_build_object('success',true,'requestId',r.id,'matchId',m.id,'playerId',r.player_id,'openSlots',slots,'matchStatus',state,'updatedAt',stamp);
end $$;

create or replace function public.reject_join_request(p_request_id uuid,p_captain_id uuid)
returns json language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.join_requests; m public.matches; stamp timestamptz:=now();
begin
  if not exists(select 1 from public.user_roles where user_id=p_captain_id and role='TEAM_CAPTAIN' and status='ACTIVE') then return json_build_object('success',false,'code','FORBIDDEN','error','Captain capability required.'); end if;
  select * into r from public.join_requests where id=p_request_id for update;
  if not found then return json_build_object('success',false,'code','NOT_FOUND','error','Join request not found.'); end if;
  select * into m from public.matches where id=r.match_id;
  if m.captain_id<>p_captain_id then return json_build_object('success',false,'code','FORBIDDEN','error','Only the match captain can reject requests.'); end if;
  if r.status<>'PENDING' then return json_build_object('success',false,'code','INVALID_STATUS','error','Only pending requests can be rejected.'); end if;
  update public.join_requests set status='REJECTED',updated_at=stamp where id=r.id;
  insert into public.notifications(user_id,type,title,message,match_id,join_request_id)
    values(r.player_id,'JOIN_REQUEST_REJECTED','REQUEST UPDATE','Your request for '||m.title||' was not accepted.',m.id,r.id);
  return json_build_object('success',true,'requestId',r.id,'matchId',m.id,'playerId',r.player_id,'updatedAt',stamp);
end $$;

-- Read-only membership helpers bind identity to auth.uid(), never a caller-supplied actor.
create or replace function public.is_chat_member(p_room_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.chat_room_members where room_id=p_room_id and user_id=auth.uid());
$$;
create or replace function public.is_match_member(p_match_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.match_participants where match_id=p_match_id and player_id=auth.uid())
    or exists(select 1 from public.matches where id=p_match_id and captain_id=auth.uid());
$$;

-- Replace the permissive incremental policies and recursive consolidated policies.
drop policy if exists "Members can view room members" on public.chat_room_members;
create policy "Members can view room members" on public.chat_room_members for select to authenticated using(public.is_chat_member(room_id));
drop policy if exists "Members can view their chat rooms" on public.chat_rooms;
create policy "Members can view their chat rooms" on public.chat_rooms for select to authenticated using(public.is_chat_member(id));
drop policy if exists "Members can view room messages" on public.chat_messages;
create policy "Members can view room messages" on public.chat_messages for select to authenticated using(public.is_chat_member(room_id));
drop policy if exists "Authenticated users can view match participants" on public.match_participants;
drop policy if exists "Participants and captains can view match participants" on public.match_participants;
create policy "Participants and captains can view match participants" on public.match_participants for select to authenticated using(public.is_match_member(match_id));
drop policy if exists "Authenticated users can view join requests" on public.join_requests;
drop policy if exists "Players and captains can view join requests" on public.join_requests;
create policy "Players and captains can view join requests" on public.join_requests for select to authenticated using(player_id=auth.uid() or exists(select 1 from public.matches where id=match_id and captain_id=auth.uid()));

-- Mutations go through the authenticated Express API, including the team roster.
drop policy if exists "Captains can insert own teams" on public.teams;
drop policy if exists "Captains can update own teams" on public.teams;
drop policy if exists "Captains can delete own teams" on public.teams;
drop policy if exists "Captains can manage team members" on public.team_members;

-- Reconcile EVERY app-owned definer from the incremental path, not extension functions.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname in
      ('accept_join_request','reject_join_request','update_match_recruitment','find_or_create_direct_chat','review_hub_verification',
       'moderate_account','manage_superuser','start_venue_booking','settle_venue_booking','cancel_venue_booking','record_venue_refund',
       'record_venue_balance','is_chat_member','is_match_member')
  loop
    execute format('alter function %s set search_path=public,pg_temp',f.signature);
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
    if f.proname in ('is_chat_member','is_match_member') then execute format('grant execute on function %s to authenticated',f.signature); end if;
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
