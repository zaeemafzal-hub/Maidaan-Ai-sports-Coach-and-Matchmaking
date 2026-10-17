begin;
create extension if not exists btree_gist;

alter table public.profiles
  add column if not exists account_status text not null default 'ACTIVE' check (account_status in ('ACTIVE','SUSPENDED')),
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz;

alter table public.hub_owner_profiles
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180),
  add column if not exists description text not null default '',
  add column if not exists photo_urls text[] not null default '{}';

alter table public.hub_courts
  add column if not exists area_name text not null default '',
  add column if not exists play_format text not null default '',
  add column if not exists surface text not null default '',
  add column if not exists is_indoor boolean not null default false,
  add column if not exists player_capacity integer check (player_capacity between 1 and 50),
  add column if not exists photo_urls text[] not null default '{}';

create table if not exists public.hub_slots (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.hub_courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price numeric(10,2) not null check (price >= 0 and price <= 1000000),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','UNAVAILABLE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours'),
  constraint hub_slots_no_overlap exclude using gist (
    court_id with =, tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'AVAILABLE')
);
create index if not exists hub_slots_court_start_idx on public.hub_slots(court_id, starts_at);
alter table public.hub_slots enable row level security;
drop policy if exists "Active owners read their venue slots" on public.hub_slots;
create policy "Active owners read their venue slots" on public.hub_slots for select to authenticated using (
  exists (select 1 from public.profiles where id = auth.uid() and account_status = 'ACTIVE')
  and exists (
    select 1 from public.hub_courts c
    where c.id = hub_slots.court_id and c.hub_owner_id = auth.uid()
  )
);
-- Mutations go through the authenticated backend; clients cannot bypass validation.

create table if not exists public.account_moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  target_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('SUSPENDED','REINSTATED','GRANT_ADMIN','REVOKE_ADMIN')),
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.account_moderation_log enable row level security;

create or replace function public.guard_account_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if (new.account_status is distinct from old.account_status
      or new.suspension_reason is distinct from old.suspension_reason
      or new.suspended_at is distinct from old.suspended_at)
    and coalesce(auth.role(), '') <> 'service_role'
    and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Account moderation requires the trusted backend';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_account_status on public.profiles;
create trigger protect_account_status before update on public.profiles
for each row execute function public.guard_account_status();

create or replace function public.moderate_account(p_actor uuid, p_target uuid, p_action text, p_reason text)
returns jsonb language plpgsql set search_path = public as $$
declare target public.profiles;
begin
  if not exists (select 1 from public.user_roles r join public.profiles p on p.id = r.user_id
    where r.user_id = p_actor and r.role = 'ADMIN' and r.status = 'ACTIVE' and p.account_status = 'ACTIVE') then
    raise exception 'Super-user access required' using errcode = '42501';
  end if;
  if p_action not in ('SUSPENDED','REINSTATED') or length(trim(p_reason)) < 5 or length(p_reason) > 500 then
    raise exception 'Valid action and reason required' using errcode = '22023';
  end if;
  select * into target from public.profiles where id = p_target for update;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if p_actor = p_target or exists (select 1 from public.user_roles where user_id = p_target and role = 'ADMIN' and status = 'ACTIVE') then
    raise exception 'Super-user accounts cannot be moderated here' using errcode = '42501';
  end if;
  if target.account_status = (case when p_action = 'SUSPENDED' then 'SUSPENDED' else 'ACTIVE' end) then
    raise exception 'Account already has this status' using errcode = '23505';
  end if;
  update public.profiles set
    account_status = case when p_action = 'SUSPENDED' then 'SUSPENDED' else 'ACTIVE' end,
    suspension_reason = case when p_action = 'SUSPENDED' then trim(p_reason) else null end,
    suspended_at = case when p_action = 'SUSPENDED' then now() else null end,
    updated_at = now()
  where id = p_target returning * into target;
  insert into public.account_moderation_log(actor_id,target_id,action,reason)
    values(p_actor,p_target,p_action,trim(p_reason));
  return to_jsonb(target);
end;
$$;
revoke all on function public.moderate_account(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.moderate_account(uuid,uuid,text,text) to service_role;

create or replace function public.manage_superuser(p_actor uuid, p_target uuid, p_grant boolean)
returns void language plpgsql set search_path = public as $$
begin
  -- Serialize changes so concurrent removals cannot revoke the last super-user.
  perform pg_advisory_xact_lock(8172026);
  if not exists (select 1 from public.user_roles r join public.profiles p on p.id = r.user_id
    where r.user_id = p_actor and r.role = 'ADMIN' and r.status = 'ACTIVE' and p.account_status = 'ACTIVE') then
    raise exception 'Super-user access required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_target and account_status = 'ACTIVE') then
    raise exception 'An active existing account is required' using errcode = '22023';
  end if;
  if not p_grant then
    if p_actor = p_target then raise exception 'You cannot remove your own super-user access' using errcode = '42501'; end if;
    if (select count(*) from public.user_roles r join public.profiles p on p.id = r.user_id
      where r.role = 'ADMIN' and r.status = 'ACTIVE' and p.account_status = 'ACTIVE') <= 1 then
      raise exception 'The last super-user cannot be removed' using errcode = '23505';
    end if;
  end if;
  insert into public.user_roles(user_id,role,status) values(p_target,'ADMIN',case when p_grant then 'ACTIVE' else 'REVOKED' end)
    on conflict(user_id,role) do update set status = excluded.status;
  insert into public.account_moderation_log(actor_id,target_id,action,reason)
    values(p_actor,p_target,case when p_grant then 'GRANT_ADMIN' else 'REVOKE_ADMIN' end,'Super-user access changed');
end;
$$;
revoke all on function public.manage_superuser(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.manage_superuser(uuid,uuid,boolean) to service_role;

-- Uploaded photos are public venue assets; only the trusted backend writes them.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('hub-photos','hub-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
notify pgrst, 'reload schema';
commit;
