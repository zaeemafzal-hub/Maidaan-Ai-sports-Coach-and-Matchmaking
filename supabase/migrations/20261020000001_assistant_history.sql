-- Private, durable AI Coach and Maidaan Concierge conversation history.
begin;

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assistant text not null check (assistant in ('coach', 'concierge')),
  topic text not null,
  created_at timestamptz not null default now(),
  unique (user_id, assistant, topic),
  unique (id, user_id),
  check ((assistant = 'coach' and topic in ('cricket','football','badminton','padel'))
    or (assistant = 'concierge' and topic = 'main'))
);

create table if not exists public.assistant_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null,
  user_id uuid not null,
  client_message_id text not null check (length(client_message_id) between 1 and 120),
  role text not null check (role in ('user','assistant')),
  message text not null check (length(message) between 1 and 30000),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id) references public.assistant_conversations(id,user_id) on delete cascade,
  unique (conversation_id,client_message_id,role)
);
create index if not exists assistant_messages_history_idx
  on public.assistant_messages(conversation_id,id desc);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
drop policy if exists "Read own assistant conversations" on public.assistant_conversations;
create policy "Read own assistant conversations" on public.assistant_conversations
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Read own assistant messages" on public.assistant_messages;
create policy "Read own assistant messages" on public.assistant_messages
  for select to authenticated using (user_id = auth.uid());

-- Only the authenticated backend writes AI replies and structured action cards.
revoke all on public.assistant_conversations, public.assistant_messages from anon, authenticated;
grant select on public.assistant_conversations, public.assistant_messages to authenticated;
grant all on public.assistant_conversations, public.assistant_messages to service_role;
grant usage, select on sequence public.assistant_messages_id_seq to service_role;
notify pgrst, 'reload schema';
commit;
