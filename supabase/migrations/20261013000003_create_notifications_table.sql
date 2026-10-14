-- Maidaan Phase 3D Database Migration
-- PostgreSQL schema for Notifications

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

-- Indexes for efficient lookup & sorting
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- Enable Row Level Security (RLS)
alter table public.notifications enable row level security;

-- Scoped Read Policy for authenticated users to inspect their own notifications
create policy "Users can view own notifications"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Note: Notifications creation and read state updates are managed strictly via the trusted Express backend
-- using the Supabase Service Role client with RBAC and ownership verification.
