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
