-- Maidaan Phase 4A Database Migration
-- PostgreSQL schema for Chat Rooms, Membership Authorization, and Messages

-- 1. Create public.chat_rooms table
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('DIRECT', 'GROUP')),
  match_id uuid null references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Room Type Consistency Rule:
  -- GROUP rooms must strictly reference a match fixture.
  -- DIRECT rooms must have match_id as null.
  constraint chk_chat_rooms_type_match check (
    (type = 'GROUP' and match_id is not null) or
    (type = 'DIRECT' and match_id is null)
  )
);

-- Partial Unique Index: A match fixture can have at most one GROUP chat room
create unique index if not exists uq_chat_rooms_match_group
  on public.chat_rooms(match_id)
  where type = 'GROUP';

-- 2. Create public.chat_room_members table
create table if not exists public.chat_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- Unique membership: user can only belong to a given room once
  constraint uq_chat_room_members_room_user unique (room_id, user_id)
);

-- 3. Create public.chat_messages table
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  -- Message Validation Rule:
  -- Trimmed, non-empty, and maximum 500 characters
  constraint chk_chat_messages_body check (
    length(trim(body)) > 0 and length(body) <= 500
  )
);

-- 4. Indexes for Chat Query Optimization
create index if not exists idx_chat_room_members_room_id on public.chat_room_members(room_id);
create index if not exists idx_chat_room_members_user_id on public.chat_room_members(user_id);
create index if not exists idx_chat_messages_room_id on public.chat_messages(room_id);
create index if not exists idx_chat_messages_sender_id on public.chat_messages(sender_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);

-- 5. Enable Row Level Security (RLS)
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;

-- 6. Scoped RLS Read Policies for authenticated users
-- Users can only inspect chat rooms they are members of
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

-- Users can inspect membership of chat rooms they belong to
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

-- Users can read messages from rooms where they are authorized members
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

-- Note: All mutations (direct room creation, lazy group room creation, participant sync,
-- and message posting) are executed server-side through the trusted Express backend
-- using the Supabase Service Role client with explicit server-verified auth contexts.
